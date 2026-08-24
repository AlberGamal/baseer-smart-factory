"""
Base bootstrap for the REAL platform.

Unlike the dummy seeder, this inserts ONLY foundational entities — settings,
enrolled employees and their login users — and NO fake events. All defect /
attendance / safety / fire data then arrives from the live model workers via
the /ingest/* endpoints.

Run once after first boot:  python -m bootstrap.seed_base
"""

import asyncio
import os
from datetime import date, timedelta

from Database.async_db_service import AsyncDatabaseService
from api.auth import hash_password

EMPLOYEES = [
    ("أحمد عبد الله", "النسيج"), ("محمود السيد", "الغزل"),
    ("مصطفى كامل", "الصباغة"), ("يوسف إبراهيم", "التعبئة"),
    ("كريم حسن", "الجودة"), ("عمر خالد", "الصيانة"),
    ("محمد عماد", "النسيج"), ("إسلام فؤاد", "الغزل"),
]


def required_setting(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value or value.startswith("CHANGE_ME"):
        raise RuntimeError(f"{name} must be set before bootstrap")
    return value


async def main():
    manager_username = os.getenv("BOOTSTRAP_MANAGER_USERNAME", "manager").strip()
    manager_password = required_setting("BOOTSTRAP_MANAGER_PASSWORD")
    employee_password = required_setting("BOOTSTRAP_EMPLOYEE_PASSWORD")
    db = AsyncDatabaseService()
    await db.connect()
    try:
        async with db.pool.acquire() as conn:
            await conn.execute("""
                UPDATE settings SET work_start='09:00', work_end='17:00',
                       normal_rate=50, overtime_rate=80, grace_minutes=15 WHERE id=1;
            """)
            # Manager
            await conn.execute(
                """INSERT INTO users (username, password_hash, role) VALUES ($1,$2,'manager')
                   ON CONFLICT (username) DO NOTHING""",
                manager_username, hash_password(manager_password))
            # Employees + their logins
            for i, (name, dept) in enumerate(EMPLOYEES, start=1):
                code = f"EMP-{i:03d}"
                emp_id = await conn.fetchval(
                    """INSERT INTO employees (employee_code, full_name, department,
                           telegram_chat_id, hire_date)
                       VALUES ($1,$2,$3,NULL,$4)
                       ON CONFLICT (employee_code) DO UPDATE SET full_name=EXCLUDED.full_name
                       RETURNING id""",
                    code, name, dept, date.today() - timedelta(days=200))
                await conn.execute(
                    """INSERT INTO users (username, password_hash, role, employee_id)
                       VALUES ($1,$2,'employee',$3) ON CONFLICT (username) DO NOTHING""",
                    code, hash_password(employee_password), emp_id)
    finally:
        await db.close()
    print("[bootstrap] base entities ready; credentials were supplied via environment")


if __name__ == "__main__":
    asyncio.run(main())
