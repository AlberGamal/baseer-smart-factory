"""Pydantic schemas for the Baseer API (request bodies + response models)."""

from datetime import date, datetime, time
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ── Auth ───────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=60)
    password: str = Field(min_length=1, max_length=256)


class LoginResponse(BaseModel):
    token: str
    role: str
    username: str
    employee_id: Optional[int] = None
    full_name: Optional[str] = None


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    department: Optional[str] = Field(default=None, max_length=80)
    telegram_chat_id: Optional[str] = Field(default=None, max_length=40)


class RegisterResponse(BaseModel):
    employee_id: int
    employee_code: str
    password: str
    full_name: str


# ── Defects (fabric inspection) ────────────────────────────────────────
class InspectionResult(BaseModel):
    id: int
    image_path: str = Field(min_length=1)
    label: Optional[Literal["Normal", "Defect"]] = None
    score: Optional[float] = Field(default=None, ge=0, le=1)
    overlay_path: Optional[str] = None
    belt_action: Optional[Literal["pass", "stop"]] = None
    created_at: datetime


class PaginatedResults(BaseModel):
    items: List[InspectionResult]
    total: int
    page: int
    limit: int
    total_pages: int


class DefectStats(BaseModel):
    total_inspected: int
    total_defects: int
    total_normal: int
    defect_rate_percent: float
    avg_anomaly_score: float


# ── Employees & payroll ────────────────────────────────────────────────
class Employee(BaseModel):
    id: int
    employee_code: str
    full_name: str
    department: Optional[str] = None
    photo_path: Optional[str] = None
    hire_date: Optional[date] = None
    is_active: bool = True


class SalaryAdjustment(BaseModel):
    id: int
    kind: Literal["deduction", "bonus"]
    amount: float
    reason: Optional[str] = None
    month: str
    created_by: Optional[str] = None
    created_at: datetime


class AdjustmentRequest(BaseModel):
    kind: Literal["deduction", "bonus"]
    amount: float = Field(gt=0, le=1_000_000)
    reason: Optional[str] = Field(default=None, max_length=500)
    month: Optional[str] = Field(default=None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$")


class SalaryBreakdown(BaseModel):
    month: str
    normal_hours: float
    overtime_hours: float
    normal_rate: float
    overtime_rate: float
    base_pay: float
    overtime_pay: float
    deductions: float
    bonuses: float
    net_salary: float


class EmployeeCard(BaseModel):
    employee: Employee
    present_days: int
    absent_days: int
    late_days: int
    overtime_hours: float
    warnings_count: int
    safety_compliance_percent: float
    salary: SalaryBreakdown
    adjustments: List[SalaryAdjustment]


# ── Settings ───────────────────────────────────────────────────────────
class Settings(BaseModel):
    work_start: time
    work_end: time
    normal_rate: float = Field(ge=0, le=1_000_000)
    overtime_rate: float = Field(ge=0, le=1_000_000)
    grace_minutes: int = Field(ge=0, le=1_440)


# ── Generic dict-based responses (overview, summaries, health) ─────────
class GenericResponse(BaseModel):
    data: Dict[str, Any]
