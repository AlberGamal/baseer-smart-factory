"""
Salary computation for the Baseer platform.

net = Σ(normal_hours × normal_rate + overtime_hours × overtime_rate)
      − deductions + bonuses

All inputs come straight from `attendance_records` and `salary_adjustments`;
nothing is pre-stored, so edits to attendance or rates recompute instantly.
"""

from typing import Dict
import asyncpg


async def compute_salary(pool: asyncpg.Pool, employee_id: int, month: str) -> Dict:
    """Return a full salary breakdown dict for one employee for 'YYYY-MM'."""
    settings = await pool.fetchrow(
        "SELECT normal_rate, overtime_rate FROM settings WHERE id = 1"
    )
    normal_rate = float(settings["normal_rate"])
    overtime_rate = float(settings["overtime_rate"])

    hours = await pool.fetchrow(
        """
        SELECT COALESCE(SUM(worked_hours), 0)   AS normal_hours,
               COALESCE(SUM(overtime_hours), 0) AS overtime_hours
        FROM attendance_records
        WHERE employee_id = $1
          AND to_char(work_date, 'YYYY-MM') = $2
        """,
        employee_id, month,
    )
    normal_hours = float(hours["normal_hours"])
    overtime_hours = float(hours["overtime_hours"])

    adj = await pool.fetchrow(
        """
        SELECT
            COALESCE(SUM(amount) FILTER (WHERE kind = 'deduction'), 0) AS deductions,
            COALESCE(SUM(amount) FILTER (WHERE kind = 'bonus'), 0)     AS bonuses
        FROM salary_adjustments
        WHERE employee_id = $1 AND month = $2
        """,
        employee_id, month,
    )
    deductions = float(adj["deductions"])
    bonuses = float(adj["bonuses"])

    base_pay = round(normal_hours * normal_rate, 2)
    overtime_pay = round(overtime_hours * overtime_rate, 2)
    net = round(base_pay + overtime_pay - deductions + bonuses, 2)

    return {
        "month": month,
        "normal_hours": round(normal_hours, 2),
        "overtime_hours": round(overtime_hours, 2),
        "normal_rate": normal_rate,
        "overtime_rate": overtime_rate,
        "base_pay": base_pay,
        "overtime_pay": overtime_pay,
        "deductions": deductions,
        "bonuses": bonuses,
        "net_salary": net,
    }
