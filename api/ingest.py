"""Authenticated ingestion contracts used by the model worker containers.

Workers send detections to this module; they never connect directly to PostgreSQL.
The shared ``BASEER_INGEST_KEY`` is required on every request so the ingestion
surface is not an unauthenticated write API. Current workers remain scaffolds and
must be replaced with real inference before production use.
"""

import hmac
import json
import os
from datetime import datetime
from typing import Dict, Literal, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field


def verify_ingest_key(x_ingest_key: Optional[str] = Header(default=None)) -> None:
    configured = os.getenv("BASEER_INGEST_KEY", "").strip()
    if not configured:
        raise HTTPException(503, "Ingestion is not configured")
    if not x_ingest_key or not hmac.compare_digest(x_ingest_key, configured):
        raise HTTPException(401, "Invalid ingestion key")


router = APIRouter(
    prefix="/ingest", tags=["ingest"], dependencies=[Depends(verify_ingest_key)]
)

_holder: Dict = {"db": None}


def bind(db_service) -> None:
    _holder["db"] = db_service


def pool():
    if _holder["db"] is None or _holder["db"].pool is None:
        raise HTTPException(503, "Database not ready")
    return _holder["db"].pool


# ── Defect ─────────────────────────────────────────────────────────────
class DefectIn(BaseModel):
    image_path: str = Field(min_length=1, max_length=1_000)
    label: Literal["Normal", "Defect"]
    score: float = Field(ge=0, le=1)
    overlay_path: Optional[str] = Field(default=None, max_length=1_000)
    belt_action: Literal["pass", "stop"] = "pass"


@router.post("/defect")
async def ingest_defect(body: DefectIn):
    service = _holder["db"]
    new_id = await service.save_defect_result(
        body.image_path, body.label, body.score, body.overlay_path, body.belt_action
    )
    if body.label == "Defect":
        await service.create_alert(
            "defect", "🧵 عيب في القماش",
            f"تم رصد قطعة معيبة بدرجة ثقة {body.score:.2f}",
            severity="warning", ref_id=new_id if new_id > 0 else None)
    return {"ok": True, "id": new_id}


# ── Attendance ─────────────────────────────────────────────────────────
class AttendanceIn(BaseModel):
    employee_code: str = Field(min_length=1, max_length=20)
    event_type: Literal["in", "out"]
    detected_at: Optional[datetime] = None
    camera: Optional[str] = Field(default=None, max_length=60)


@router.post("/attendance")
async def ingest_attendance(body: AttendanceIn):
    database = pool()
    emp_id = await database.fetchval(
        "SELECT id FROM employees WHERE employee_code=$1", body.employee_code
    )
    if not emp_id:
        raise HTTPException(404, "Unknown employee_code")
    ts = body.detected_at or datetime.utcnow()
    await database.execute(
        """INSERT INTO attendance_events (employee_id, event_type, detected_at, camera)
           VALUES ($1,$2,$3,$4)""", emp_id, body.event_type, ts, body.camera)
    # Folding raw events into daily records is intentionally a separate worker.
    return {"ok": True, "employee_id": emp_id}


# ── Safety / PPE ───────────────────────────────────────────────────────
class SafetyIn(BaseModel):
    employee_code: str = Field(min_length=1, max_length=20)
    items: Dict[str, bool] = Field(min_length=1, max_length=20)
    image_path: Optional[str] = Field(default=None, max_length=1_000)
    camera: Optional[str] = Field(default=None, max_length=60)


@router.post("/safety")
async def ingest_safety(body: SafetyIn):
    database = pool()
    service = _holder["db"]
    emp_id = await database.fetchval(
        "SELECT id FROM employees WHERE employee_code=$1", body.employee_code
    )
    if not emp_id:
        raise HTTPException(404, "Unknown employee_code")
    missing = [tool for tool, worn in body.items.items() if not worn]
    compliant = not missing

    # Keep the safety log, strike counters, reset, and deductions atomic.
    alerts = []
    async with database.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """INSERT INTO safety_logs
                   (employee_id, image_path, items, missing, compliant, camera)
                   VALUES ($1,$2,$3::jsonb,$4,$5,$6)""",
                emp_id, body.image_path, json.dumps(body.items), missing, compliant, body.camera
            )
            for tool in missing:
                row = await conn.fetchrow(
                    """INSERT INTO ppe_strikes (employee_id, tool, strikes, total_violations)
                       VALUES ($1,$2,1,1)
                       ON CONFLICT (employee_id, tool) DO UPDATE
                           SET strikes = ppe_strikes.strikes + 1,
                               total_violations = ppe_strikes.total_violations + 1,
                               updated_at = NOW()
                       RETURNING strikes""", emp_id, tool
                )
                strikes = row["strikes"]
                if strikes >= 3:
                    await conn.execute(
                        """INSERT INTO salary_adjustments
                           (employee_id, month, kind, amount, reason, created_by)
                           VALUES ($1, to_char(NOW(),'YYYY-MM'), 'deduction', 100,
                                   'خصم تلقائي: تكرار مخالفة السلامة ٣ مرات', 'system')""", emp_id
                    )
                    await conn.execute(
                        "UPDATE ppe_strikes SET strikes=0 WHERE employee_id=$1 AND tool=$2",
                        emp_id, tool
                    )
                    alerts.append(("critical", f"تكرار عدم ارتداء {tool} ٣ مرات — تم تطبيق خصم"))
                else:
                    alerts.append(("warning", f"موظف بدون {tool} (إنذار {strikes}/3)"))

    for severity, body_text in alerts:
        await service.create_alert(
            "safety", "🚨 خصم سلامة" if severity == "critical" else "⚠️ مخالفة سلامة",
            body_text, severity=severity, employee_id=emp_id
        )
    return {"ok": True, "compliant": compliant, "missing": missing}


# ── Fire / smoke ───────────────────────────────────────────────────────
class FireIn(BaseModel):
    alert_type: Literal["fire", "smoke"]
    confidence: float = Field(ge=0, le=1)
    location: Optional[str] = Field(default=None, max_length=80)
    image_path: Optional[str] = Field(default=None, max_length=1_000)


@router.post("/fire")
async def ingest_fire(body: FireIn):
    new_id = await pool().fetchval(
        """INSERT INTO fire_alerts (alert_type, confidence, location, image_path)
           VALUES ($1,$2,$3,$4) RETURNING id""",
        body.alert_type, body.confidence, body.location, body.image_path
    )
    await _holder["db"].create_alert(
        "fire", f"🔥 إنذار {'حريق' if body.alert_type == 'fire' else 'دخان'}",
        f"رصد في {body.location or 'موقع غير محدد'} بثقة {body.confidence:.0%}",
        severity="critical", ref_id=new_id
    )
    return {"ok": True, "id": new_id}

