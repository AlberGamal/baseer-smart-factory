"""
Baseer API — a fully async FastAPI backend for the «بصير» factory-management
platform. Serves every dashboard module (defects, attendance, safety, fire,
employees/payroll, the unified alert center and system health) from a single
PostgreSQL database via an asyncpg connection pool.

Run (from project root):  uvicorn api.main:app --host 0.0.0.0 --port 8000
"""

import io
import os
from contextlib import asynccontextmanager
from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, Query, HTTPException, Depends, Header
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from Database.async_db_service import AsyncDatabaseService
from api import auth as auth_utils
from api import ingest
from api.models import (
    LoginRequest, LoginResponse, RegisterRequest, RegisterResponse,
    InspectionResult, PaginatedResults, DefectStats, AdjustmentRequest, Settings,
)
from api.salary import compute_salary

db = AsyncDatabaseService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    ingest.bind(db)          # wire model-ingestion endpoints to the live DB
    yield
    await db.close()


app = FastAPI(title="Baseer API — منصة بصير", version="1.0.0", lifespan=lifespan)

_cors_origins = [
    origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:8080").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(ingest.router)


def pool():
    if db.pool is None:
        raise HTTPException(503, "Database not ready")
    return db.pool


# ── Auth dependency ────────────────────────────────────────────────────
async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    payload = auth_utils.decode_token(authorization.split(" ", 1)[1])
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    return payload


async def require_manager(user=Depends(current_user)):
    if user.get("role") != "manager":
        raise HTTPException(403, "Manager access required")
    return user


def current_month() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def parse_query_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(422, "day must use YYYY-MM-DD format") from exc


# ── Root / health ──────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "Baseer API is running — منصة بصير. Visit /docs."}


@app.get("/health")
async def health():
    try:
        await pool().execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception:
        # Do not expose database hostnames, credentials, or driver details.
        return {"status": "unhealthy", "database": "unavailable"}


# ── Auth ───────────────────────────────────────────────────────────────
@app.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    row = await pool().fetchrow(
        """
        SELECT u.id, u.username, u.password_hash, u.role, u.employee_id, e.full_name
        FROM users u LEFT JOIN employees e ON e.id = u.employee_id
        WHERE u.username = $1
        """,
        body.username,
    )
    if not row or not auth_utils.verify_password(body.password, row["password_hash"]):
        raise HTTPException(401, "اسم المستخدم أو كلمة المرور غير صحيحة")
    token = auth_utils.create_token(row["id"], row["role"], row["employee_id"])
    return LoginResponse(
        token=token, role=row["role"], username=row["username"],
        employee_id=row["employee_id"], full_name=row["full_name"],
    )


@app.post("/auth/register", response_model=RegisterResponse)
async def register(body: RegisterRequest):
    """Provision an employee account when self-registration is explicitly enabled.

    This endpoint does not capture or store face embeddings. That model integration
    remains a documented future extension of the attendance worker.
    """
    if os.getenv("ALLOW_SELF_REGISTRATION", "false").lower() != "true":
        raise HTTPException(404, "Self-registration is disabled")
    import secrets
    p = pool()
    async with p.acquire() as conn:
        async with conn.transaction():
            # Serialize code allocation so concurrent registrations cannot collide.
            await conn.execute("LOCK TABLE employees IN SHARE ROW EXCLUSIVE MODE")
            next_num = await conn.fetchval(
                "SELECT COALESCE(MAX(SUBSTRING(employee_code FROM 5)::int), 0) + 1 "
                "FROM employees WHERE employee_code LIKE 'EMP-%'")
            code = f"EMP-{next_num:03d}"
            emp_id = await conn.fetchval(
                """INSERT INTO employees (employee_code, full_name, department, telegram_chat_id)
                   VALUES ($1,$2,$3,$4) RETURNING id""",
                code, body.full_name, body.department, body.telegram_chat_id)
            password = secrets.token_urlsafe(6)
            await conn.execute(
                """INSERT INTO users (username, password_hash, role, employee_id)
                   VALUES ($1,$2,'employee',$3)""",
                code, auth_utils.hash_password(password), emp_id)
    return RegisterResponse(employee_id=emp_id, employee_code=code,
                            password=password, full_name=body.full_name)


@app.get("/auth/me")
async def me(user=Depends(current_user)):
    return user


# ── Overview (manager home) ────────────────────────────────────────────
@app.get("/overview/summary")
async def overview_summary(user=Depends(require_manager)):
    today = date.today()
    p = pool()
    total_inspected = await p.fetchval("SELECT COUNT(*) FROM inspection_results")
    total_defects = await p.fetchval("SELECT COUNT(*) FROM inspection_results WHERE label='Defect'")
    total_normal = total_inspected - total_defects

    present = await p.fetchval(
        "SELECT COUNT(*) FROM attendance_records WHERE work_date=$1 AND status<>'absent'", today)
    absent = await p.fetchval(
        "SELECT COUNT(*) FROM attendance_records WHERE work_date=$1 AND status='absent'", today)
    employees = await p.fetchval("SELECT COUNT(*) FROM employees WHERE is_active")

    safety_total = await p.fetchval("SELECT COUNT(*) FROM safety_logs")
    safety_ok = await p.fetchval("SELECT COUNT(*) FROM safety_logs WHERE compliant")
    compliance = round(safety_ok / safety_total * 100, 1) if safety_total else 100.0

    active_fires = await p.fetchval("SELECT COUNT(*) FROM fire_alerts WHERE status='active'")
    new_alerts = await p.fetchval("SELECT COUNT(*) FROM alerts WHERE status IN ('new','sent')")

    # 7-day defect trend for the home chart
    trend = await p.fetch(
        """
        SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day,
               COUNT(*) FILTER (WHERE label='Defect') AS defects,
               COUNT(*) FILTER (WHERE label='Normal') AS normal
        FROM inspection_results
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day
        """
    )
    return {
        "fabric": {
            "total_inspected": total_inspected,
            "total_defects": total_defects,
            "total_normal": total_normal,
            "defect_rate": round(total_defects / total_inspected * 100, 1) if total_inspected else 0,
        },
        "attendance": {"present": present, "absent": absent, "employees": employees},
        "safety": {"compliance_percent": compliance, "logs": safety_total},
        "fire": {"active_alerts": active_fires},
        "alerts": {"open": new_alerts},
        "defect_trend": [dict(r) for r in trend],
    }


# ── Defects (fabric inspection) ────────────────────────────────────────
@app.get("/defects/stats", response_model=DefectStats)
async def defects_stats(user=Depends(require_manager)):
    p = pool()
    total = await p.fetchval("SELECT COUNT(*) FROM inspection_results")
    if not total:
        return DefectStats(total_inspected=0, total_defects=0, total_normal=0,
                           defect_rate_percent=0, avg_anomaly_score=0)
    defects = await p.fetchval("SELECT COUNT(*) FROM inspection_results WHERE label='Defect'")
    normal = await p.fetchval("SELECT COUNT(*) FROM inspection_results WHERE label='Normal'")
    avg = await p.fetchval("SELECT AVG(score) FROM inspection_results")
    return DefectStats(
        total_inspected=total, total_defects=defects, total_normal=normal,
        defect_rate_percent=round(defects / total * 100, 2),
        avg_anomaly_score=round(avg, 4) if avg else 0,
    )


@app.get("/defects/results", response_model=PaginatedResults)
async def defects_results(
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100),
    label: Optional[str] = Query(None), user=Depends(require_manager),
):
    offset = (page - 1) * limit
    where = "WHERE label = $1" if label else ""
    params = [label] if label else []
    total = await pool().fetchval(f"SELECT COUNT(*) FROM inspection_results {where}", *params)
    rows = await pool().fetch(
        f"""SELECT id, image_path, label, score, overlay_path, belt_action, created_at
            FROM inspection_results {where}
            ORDER BY created_at DESC LIMIT ${len(params)+1} OFFSET ${len(params)+2}""",
        *params, limit, offset,
    )
    items = [InspectionResult(**dict(r)) for r in rows]
    total_pages = (total + limit - 1) // limit if total else 1
    return PaginatedResults(items=items, total=total, page=page, limit=limit, total_pages=total_pages)


@app.get("/defects/quality")
async def defects_quality(user=Depends(require_manager)):
    """Quality analytics from binary detection only (defect vs normal): a 14-day
    trend plus an hour-of-day distribution of defects."""
    p = pool()
    trend = await p.fetch(
        """SELECT to_char(created_at::date,'YYYY-MM-DD') AS day,
                  COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE label='Defect') AS defects
           FROM inspection_results
           WHERE created_at >= NOW() - INTERVAL '14 days'
           GROUP BY day ORDER BY day"""
    )
    by_hour = await p.fetch(
        """SELECT to_char(created_at,'HH24') AS hour, COUNT(*) AS defects
           FROM inspection_results WHERE label='Defect'
           GROUP BY hour ORDER BY hour"""
    )
    return {"trend": [dict(r) for r in trend], "by_hour": [dict(r) for r in by_hour]}


@app.get("/defects/results/{result_id}/overlay")
async def defect_overlay(result_id: int, t: Optional[str] = Query(None)):
    # Image tag can't send an auth header, so the token may arrive as ?t=...
    if not t or not auth_utils.decode_token(t):
        raise HTTPException(401, "Invalid token")
    row = await pool().fetchrow(
        "SELECT overlay_path FROM inspection_results WHERE id=$1", result_id)
    if not row or not row["overlay_path"]:
        raise HTTPException(404, "Overlay not available")
    results_dir = os.getenv("RESULTS_DIR", "/app/results")
    full = os.path.join(results_dir, os.path.basename(row["overlay_path"]))
    if not os.path.isfile(full):
        raise HTTPException(404, "Overlay file not found (dummy data has no image file)")
    return FileResponse(full, media_type="image/png")


# ── Attendance ─────────────────────────────────────────────────────────
@app.get("/attendance/summary")
async def attendance_summary(
    day: Optional[str] = Query(None), user=Depends(require_manager)
):
    target = parse_query_date(day) if day else date.today()
    p = pool()
    rows = await p.fetch(
        """SELECT status, COUNT(*) AS count FROM attendance_records
           WHERE work_date=$1 GROUP BY status""", target)
    by_status = {r["status"]: r["count"] for r in rows}
    ot = await p.fetchval(
        "SELECT COALESCE(SUM(overtime_hours),0) FROM attendance_records WHERE work_date=$1", target)
    return {"date": target, "by_status": by_status, "total_overtime_hours": float(ot)}


@app.get("/attendance/records")
async def attendance_records(
    day: Optional[str] = Query(None), status: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
    user=Depends(require_manager),
):
    target = parse_query_date(day) if day else date.today()
    offset = (page - 1) * limit
    conds, params = ["ar.work_date = $1"], [target]
    if status:
        params.append(status)
        conds.append(f"ar.status = ${len(params)}")
    where = "WHERE " + " AND ".join(conds)
    total = await pool().fetchval(
        f"SELECT COUNT(*) FROM attendance_records ar {where}", *params)
    rows = await pool().fetch(
        f"""SELECT ar.id, ar.employee_id, e.full_name, e.employee_code, e.department,
                   ar.check_in, ar.check_out, ar.worked_hours, ar.overtime_hours,
                   ar.status, ar.notes
            FROM attendance_records ar JOIN employees e ON e.id = ar.employee_id
            {where} ORDER BY e.full_name
            LIMIT ${len(params)+1} OFFSET ${len(params)+2}""",
        *params, limit, offset,
    )
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "limit": limit}


@app.get("/attendance/trend")
async def attendance_trend(user=Depends(require_manager)):
    rows = await pool().fetch(
        """SELECT to_char(work_date,'YYYY-MM-DD') AS day,
                  COUNT(*) FILTER (WHERE status<>'absent') AS present,
                  COUNT(*) FILTER (WHERE status='absent')  AS absent,
                  COUNT(*) FILTER (WHERE status='late')    AS late,
                  COALESCE(SUM(overtime_hours),0)          AS overtime
           FROM attendance_records
           WHERE work_date >= CURRENT_DATE - INTERVAL '14 days'
           GROUP BY day ORDER BY day"""
    )
    return {"trend": [dict(r) for r in rows]}


# ── Safety / PPE ───────────────────────────────────────────────────────
@app.get("/safety/summary")
async def safety_summary(user=Depends(require_manager)):
    p = pool()
    total = await p.fetchval("SELECT COUNT(*) FROM safety_logs")
    ok = await p.fetchval("SELECT COUNT(*) FROM safety_logs WHERE compliant")
    by_missing = await p.fetch(
        """SELECT tool, COUNT(*) AS count FROM (
               SELECT unnest(missing) AS tool FROM safety_logs
           ) t GROUP BY tool ORDER BY count DESC""")
    strikes = await p.fetch(
        """SELECT e.full_name, ps.tool, ps.strikes, ps.total_violations
           FROM ppe_strikes ps JOIN employees e ON e.id = ps.employee_id
           WHERE ps.strikes > 0 ORDER BY ps.strikes DESC LIMIT 20""")
    return {
        "total_logs": total,
        "compliant": ok,
        "compliance_percent": round(ok / total * 100, 1) if total else 100.0,
        "by_missing_tool": [dict(r) for r in by_missing],
        "active_strikes": [dict(r) for r in strikes],
    }


@app.get("/safety/logs")
async def safety_logs(
    employee_id: Optional[int] = Query(None), compliant: Optional[bool] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
    user=Depends(require_manager),
):
    offset = (page - 1) * limit
    conds, params = [], []
    if employee_id is not None:
        params.append(employee_id); conds.append(f"s.employee_id = ${len(params)}")
    if compliant is not None:
        params.append(compliant); conds.append(f"s.compliant = ${len(params)}")
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    total = await pool().fetchval(f"SELECT COUNT(*) FROM safety_logs s {where}", *params)
    rows = await pool().fetch(
        f"""SELECT s.id, s.employee_id, e.full_name, s.captured_at, s.items,
                   s.missing, s.compliant, s.camera
            FROM safety_logs s JOIN employees e ON e.id = s.employee_id
            {where} ORDER BY s.captured_at DESC
            LIMIT ${len(params)+1} OFFSET ${len(params)+2}""",
        *params, limit, offset,
    )
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "limit": limit}


# ── Fire / smoke ───────────────────────────────────────────────────────
@app.get("/fire/alerts")
async def fire_alerts(
    status: Optional[str] = Query(None), page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200), user=Depends(require_manager),
):
    offset = (page - 1) * limit
    where = "WHERE status = $1" if status else ""
    params = [status] if status else []
    total = await pool().fetchval(f"SELECT COUNT(*) FROM fire_alerts {where}", *params)
    rows = await pool().fetch(
        f"""SELECT id, alert_type, confidence, location, image_path, status, created_at
            FROM fire_alerts {where} ORDER BY created_at DESC
            LIMIT ${len(params)+1} OFFSET ${len(params)+2}""",
        *params, limit, offset,
    )
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "limit": limit}


@app.post("/fire/alerts/{alert_id}/acknowledge")
async def fire_ack(alert_id: int, user=Depends(require_manager)):
    await pool().execute(
        "UPDATE fire_alerts SET status='acknowledged' WHERE id=$1", alert_id)
    return {"ok": True}


# ── Employees & payroll ────────────────────────────────────────────────
@app.get("/employees")
async def list_employees(user=Depends(require_manager)):
    rows = await pool().fetch(
        """SELECT id, employee_code, full_name, department, photo_path, hire_date, is_active
           FROM employees ORDER BY full_name""")
    return {"items": [dict(r) for r in rows]}


@app.get("/employees/{emp_id}")
async def employee_card(emp_id: int, month: Optional[str] = Query(None),
                        user=Depends(current_user)):
    if user.get("role") != "manager" and user.get("eid") != emp_id:
        raise HTTPException(403, "Employees may only view their own records")
    p = pool()
    emp = await p.fetchrow(
        """SELECT id, employee_code, full_name, department, photo_path, hire_date, is_active
           FROM employees WHERE id=$1""", emp_id)
    if not emp:
        raise HTTPException(404, "الموظف غير موجود")
    month = month or current_month()

    counts = await p.fetchrow(
        """SELECT
              COUNT(*) FILTER (WHERE status<>'absent') AS present,
              COUNT(*) FILTER (WHERE status='absent')  AS absent,
              COUNT(*) FILTER (WHERE status='late')    AS late,
              COALESCE(SUM(overtime_hours),0)          AS overtime
           FROM attendance_records
           WHERE employee_id=$1 AND to_char(work_date,'YYYY-MM')=$2""", emp_id, month)
    warnings = await p.fetchval("SELECT COUNT(*) FROM warnings WHERE employee_id=$1", emp_id)
    s_total = await p.fetchval("SELECT COUNT(*) FROM safety_logs WHERE employee_id=$1", emp_id)
    s_ok = await p.fetchval("SELECT COUNT(*) FROM safety_logs WHERE employee_id=$1 AND compliant", emp_id)
    adjustments = await p.fetch(
        """SELECT id, kind, amount, reason, month, created_by, created_at
           FROM salary_adjustments WHERE employee_id=$1 AND month=$2
           ORDER BY created_at DESC""", emp_id, month)
    salary = await compute_salary(p, emp_id, month)
    return {
        "employee": dict(emp),
        "present_days": counts["present"],
        "absent_days": counts["absent"],
        "late_days": counts["late"],
        "overtime_hours": float(counts["overtime"]),
        "warnings_count": warnings,
        "safety_compliance_percent": round(s_ok / s_total * 100, 1) if s_total else 100.0,
        "salary": salary,
        "adjustments": [dict(r) for r in adjustments],
    }


@app.get("/employees/{emp_id}/salary")
async def employee_salary(emp_id: int, month: Optional[str] = Query(None),
                          user=Depends(current_user)):
    if user.get("role") != "manager" and user.get("eid") != emp_id:
        raise HTTPException(403, "Employees may only view their own records")
    return await compute_salary(pool(), emp_id, month or current_month())


@app.post("/employees/{emp_id}/adjustments")
async def add_adjustment(emp_id: int, body: AdjustmentRequest,
                         user=Depends(require_manager)):
    month = body.month or current_month()
    employee_exists = await pool().fetchval("SELECT 1 FROM employees WHERE id=$1", emp_id)
    if not employee_exists:
        raise HTTPException(404, "Employee not found")
    new_id = await pool().fetchval(
        """INSERT INTO salary_adjustments (employee_id, month, kind, amount, reason, created_by)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id""",
        emp_id, month, body.kind, body.amount, body.reason, user.get("uid"))
    await pool().execute(
        """INSERT INTO audit_log (actor, action, entity, entity_id, after)
           VALUES ($1,'create','salary_adjustment',$2,$3::jsonb)""",
        f"user:{user.get('uid')}", new_id,
        f'{{"kind":"{body.kind}","amount":{body.amount},"month":"{month}"}}')
    return {"ok": True, "id": new_id}


# ── Settings ───────────────────────────────────────────────────────────
@app.get("/settings", response_model=Settings)
async def get_settings(user=Depends(require_manager)):
    row = await pool().fetchrow(
        "SELECT work_start, work_end, normal_rate, overtime_rate, grace_minutes FROM settings WHERE id=1")
    return Settings(**dict(row))


@app.put("/settings", response_model=Settings)
async def update_settings(s: Settings, user=Depends(require_manager)):
    await pool().execute(
        """UPDATE settings SET work_start=$1, work_end=$2, normal_rate=$3,
                  overtime_rate=$4, grace_minutes=$5, updated_at=NOW() WHERE id=1""",
        s.work_start, s.work_end, s.normal_rate, s.overtime_rate, s.grace_minutes)
    return s


# ── Unified alert center (shared with Telegram notifier) ───────────────
@app.get("/alerts")
async def list_alerts(
    status: Optional[str] = Query(None), source: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
    user=Depends(require_manager),
):
    offset = (page - 1) * limit
    conds, params = [], []
    if status:
        params.append(status); conds.append(f"status = ${len(params)}")
    if source:
        params.append(source); conds.append(f"source = ${len(params)}")
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    total = await pool().fetchval(f"SELECT COUNT(*) FROM alerts {where}", *params)
    rows = await pool().fetch(
        f"""SELECT id, source, severity, title, body, employee_id, ref_id, status,
                   sent_to_telegram, created_at
            FROM alerts {where} ORDER BY created_at DESC
            LIMIT ${len(params)+1} OFFSET ${len(params)+2}""",
        *params, limit, offset,
    )
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "limit": limit}


@app.post("/alerts/{alert_id}/ack")
async def ack_alert(alert_id: int, user=Depends(require_manager)):
    await pool().execute("UPDATE alerts SET status='ack' WHERE id=$1", alert_id)
    return {"ok": True}


# ── System health (model / camera status) ─────────────────────────────
@app.get("/system/health")
async def system_health(user=Depends(require_manager)):
    p = pool()

    async def last_seen(query):
        v = await p.fetchval(query)
        return v.isoformat() if v else None

    modules = {
        "defect":     await last_seen("SELECT MAX(created_at) FROM inspection_results"),
        "attendance": await last_seen("SELECT MAX(detected_at) FROM attendance_events"),
        "safety":     await last_seen("SELECT MAX(captured_at) FROM safety_logs"),
        "fire":       await last_seen("SELECT MAX(created_at) FROM fire_alerts"),
    }
    status = {}
    for name, ts in modules.items():
        online = False
        if ts:
            delta = (datetime.utcnow() - datetime.fromisoformat(ts)).total_seconds()
            online = delta < 86400  # within 24h => online (dummy threshold)
        status[name] = {"last_seen": ts, "online": online}
    return {"modules": status, "database": "connected"}


# ── Employee self-service ──────────────────────────────────────────────
@app.get("/me/dashboard")
async def my_dashboard(user=Depends(current_user)):
    emp_id = user.get("eid")
    if not emp_id:
        raise HTTPException(403, "هذا الحساب ليس مرتبطاً بموظف")
    return await employee_card(emp_id, None, user)


# ── Reports (Excel export) ─────────────────────────────────────────────
@app.get("/reports/payroll")
async def report_payroll(month: Optional[str] = Query(None), user=Depends(require_manager)):
    from openpyxl import Workbook
    month = month or current_month()
    employees = await pool().fetch("SELECT id, employee_code, full_name, department FROM employees ORDER BY full_name")
    wb = Workbook(); ws = wb.active; ws.title = "Payroll"
    ws.append(["الكود", "الاسم", "القسم", "ساعات عادية", "ساعات إضافية",
               "أساسي", "إضافي", "خصومات", "مكافآت", "الصافي"])
    for e in employees:
        s = await compute_salary(pool(), e["id"], month)
        ws.append([e["employee_code"], e["full_name"], e["department"],
                   s["normal_hours"], s["overtime_hours"], s["base_pay"],
                   s["overtime_pay"], s["deductions"], s["bonuses"], s["net_salary"]])
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=payroll_{month}.xlsx"})


@app.get("/reports/attendance")
async def report_attendance(month: Optional[str] = Query(None), user=Depends(require_manager)):
    from openpyxl import Workbook
    month = month or current_month()
    rows = await pool().fetch(
        """SELECT e.employee_code, e.full_name,
                  COUNT(*) FILTER (WHERE ar.status<>'absent') AS present,
                  COUNT(*) FILTER (WHERE ar.status='absent')  AS absent,
                  COUNT(*) FILTER (WHERE ar.status='late')    AS late,
                  COALESCE(SUM(ar.worked_hours),0)   AS worked,
                  COALESCE(SUM(ar.overtime_hours),0) AS overtime
           FROM employees e LEFT JOIN attendance_records ar
                ON ar.employee_id=e.id AND to_char(ar.work_date,'YYYY-MM')=$1
           GROUP BY e.id, e.employee_code, e.full_name ORDER BY e.full_name""", month)
    wb = Workbook(); ws = wb.active; ws.title = "Attendance"
    ws.append(["الكود", "الاسم", "حضور", "غياب", "تأخير", "ساعات عمل", "ساعات إضافية"])
    for r in rows:
        ws.append([r["employee_code"], r["full_name"], r["present"], r["absent"],
                   r["late"], float(r["worked"]), float(r["overtime"])])
    buf = io.BytesIO(); wb.save(buf); buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=attendance_{month}.xlsx"})
