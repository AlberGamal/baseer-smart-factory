"""
Async PostgreSQL service for the «بصير» (Baseer) factory-management platform.

Manages the connection lifecycle (asyncpg pool with retry/backoff) and owns the
full database schema for every module: fabric defect inspection, attendance,
safety (PPE), fire/smoke alerts, employees, payroll, the unified alert center
(shared with the Telegram notifier) and the audit log.

Style mirrors the original STPM inference pipeline: a single `connect()` that
also runs `_create_tables()`, `[Component]`-prefixed logging, and async CRUD.
"""

import os
import time
import asyncio
from typing import List, Dict, Optional, Set

import asyncpg


# Schema versioned in one place so the API and the seeder stay in sync.
SCHEMA_STATEMENTS = [
    # ── Settings (single row) ──────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS settings (
        id            SERIAL PRIMARY KEY,
        work_start    TIME        NOT NULL DEFAULT '09:00',
        work_end      TIME        NOT NULL DEFAULT '17:00',
        normal_rate   NUMERIC(10,2) NOT NULL DEFAULT 50.0,   -- EGP per normal hour
        overtime_rate NUMERIC(10,2) NOT NULL DEFAULT 80.0,   -- EGP per overtime hour
        grace_minutes INTEGER     NOT NULL DEFAULT 15,
        updated_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # ── Employees ──────────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS employees (
        id               SERIAL PRIMARY KEY,
        employee_code    VARCHAR(20) NOT NULL UNIQUE,
        full_name        VARCHAR(120) NOT NULL,
        department       VARCHAR(80),
        photo_path       TEXT,
        telegram_chat_id VARCHAR(40),
        hire_date        DATE        DEFAULT CURRENT_DATE,
        is_active        BOOLEAN     DEFAULT TRUE,
        created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # ── Users (auth) ───────────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      VARCHAR(60) NOT NULL UNIQUE,
        password_hash TEXT        NOT NULL,
        role          VARCHAR(20) NOT NULL DEFAULT 'employee',  -- 'manager' | 'employee'
        employee_id   INTEGER     REFERENCES employees(id) ON DELETE CASCADE,
        created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # ── Fabric defect inspection (kept from the original STPM pipeline) ─
    """
    CREATE TABLE IF NOT EXISTS inspection_results (
        id            SERIAL PRIMARY KEY,
        image_path    TEXT        NOT NULL UNIQUE,
        label         VARCHAR(50),                 -- 'Normal' | 'Defect' (binary, no type)
        score         DOUBLE PRECISION,
        overlay_path  TEXT,
        belt_action   VARCHAR(20) DEFAULT 'pass',  -- 'pass' | 'stop'
        created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # ── Attendance: per-day records ────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS attendance_records (
        id              SERIAL PRIMARY KEY,
        employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        work_date       DATE    NOT NULL,
        check_in        TIMESTAMP,
        check_out       TIMESTAMP,
        worked_hours    NUMERIC(6,2) DEFAULT 0,
        overtime_hours  NUMERIC(6,2) DEFAULT 0,
        status          VARCHAR(20) DEFAULT 'present', -- present|late|absent|early_leave|overtime
        notes           TEXT,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (employee_id, work_date)
    );
    """,

    # ── Attendance: raw camera events ──────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS attendance_events (
        id           SERIAL PRIMARY KEY,
        employee_id  INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        event_type   VARCHAR(10) NOT NULL,   -- 'in' | 'out'
        detected_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
        camera       VARCHAR(60)
    );
    """,

    # ── Safety / PPE detection logs ────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS safety_logs (
        id           SERIAL PRIMARY KEY,
        employee_id  INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        captured_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        image_path   TEXT,
        items        JSONB,        -- {"helmet": true, "gloves": false, ...}
        missing      TEXT[],       -- ['gloves', 'safety-vest']
        compliant    BOOLEAN DEFAULT TRUE,
        camera       VARCHAR(60)
    );
    """,

    # ── PPE strike counters (persistent — shared with the notifier) ────
    """
    CREATE TABLE IF NOT EXISTS ppe_strikes (
        id           SERIAL PRIMARY KEY,
        employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        tool         VARCHAR(40) NOT NULL,   -- 'helmet' | 'gloves' | ...
        strikes      INTEGER NOT NULL DEFAULT 0,
        total_violations INTEGER NOT NULL DEFAULT 0,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (employee_id, tool)
    );
    """,

    # ── Fire / smoke alerts ────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS fire_alerts (
        id          SERIAL PRIMARY KEY,
        alert_type  VARCHAR(10) NOT NULL,   -- 'fire' | 'smoke'
        confidence  DOUBLE PRECISION,
        location    VARCHAR(80),
        image_path  TEXT,
        status      VARCHAR(20) DEFAULT 'active', -- active|acknowledged|resolved
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # ── Salary adjustments (manual + automatic PPE deductions) ─────────
    """
    CREATE TABLE IF NOT EXISTS salary_adjustments (
        id          SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        month       VARCHAR(7) NOT NULL,    -- 'YYYY-MM'
        kind        VARCHAR(20) NOT NULL,   -- 'deduction' | 'bonus'
        amount      NUMERIC(10,2) NOT NULL,
        reason      TEXT,
        created_by  VARCHAR(60),
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # ── Warnings (إنذارات) ─────────────────────────────────────────────
    """
    CREATE TABLE IF NOT EXISTS warnings (
        id          SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        reason      TEXT,
        severity    VARCHAR(20) DEFAULT 'low', -- low|medium|high
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # ── Unified alert center (shared with the Telegram notifier) ───────
    """
    CREATE TABLE IF NOT EXISTS alerts (
        id                SERIAL PRIMARY KEY,
        source            VARCHAR(20) NOT NULL,   -- fire|defect|attendance|safety|system
        severity          VARCHAR(20) DEFAULT 'info', -- info|warning|critical
        title             VARCHAR(160) NOT NULL,
        body              TEXT,
        employee_id       INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        ref_id            INTEGER,
        status            VARCHAR(20) DEFAULT 'new', -- new|sent|ack|resolved
        sent_to_telegram  BOOLEAN DEFAULT FALSE,
        telegram_message_id VARCHAR(40),
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,

    # ── Audit log (who changed which salary, when) ─────────────────────
    """
    CREATE TABLE IF NOT EXISTS audit_log (
        id            SERIAL PRIMARY KEY,
        actor         VARCHAR(60),
        action        VARCHAR(60),
        entity        VARCHAR(60),
        entity_id     INTEGER,
        before        JSONB,
        after         JSONB,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
]

INDEX_STATEMENTS = [
    "CREATE INDEX IF NOT EXISTS idx_inspection_label   ON inspection_results (label);",
    "CREATE INDEX IF NOT EXISTS idx_inspection_created ON inspection_results (created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_att_rec_date       ON attendance_records (work_date DESC);",
    "CREATE INDEX IF NOT EXISTS idx_att_rec_emp        ON attendance_records (employee_id);",
    "CREATE INDEX IF NOT EXISTS idx_safety_emp         ON safety_logs (employee_id);",
    "CREATE INDEX IF NOT EXISTS idx_safety_captured    ON safety_logs (captured_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_fire_status        ON fire_alerts (status);",
    "CREATE INDEX IF NOT EXISTS idx_alerts_status      ON alerts (status);",
    "CREATE INDEX IF NOT EXISTS idx_alerts_created     ON alerts (created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_adj_emp_month      ON salary_adjustments (employee_id, month);",
]


class AsyncDatabaseService:
    """CPU-optimized async database service for the Baseer platform."""

    def __init__(self, max_pool_size: int = 20, min_pool_size: int = 2):
        self.pool: Optional[asyncpg.Pool] = None
        self.max_pool_size = max_pool_size
        self.min_pool_size = min_pool_size
        self.query_count = 0
        self.total_query_time = 0.0

    async def connect(self, retries: int = 10, delay: float = 2.0) -> None:
        """Establish the async pool to PostgreSQL with retry/backoff, then create tables."""
        for attempt in range(1, retries + 1):
            try:
                self.pool = await asyncpg.create_pool(
                    host=os.getenv("POSTGRES_HOST", "localhost"),
                    port=int(os.getenv("POSTGRES_PORT", "5432")),
                    user=os.getenv("POSTGRES_USER", "postgres"),
                    password=os.getenv("POSTGRES_PASSWORD", "postgres"),
                    database=os.getenv("POSTGRES_DB", "baseer"),
                    min_size=self.min_pool_size,
                    max_size=self.max_pool_size,
                    command_timeout=60,
                    server_settings={"application_name": "baseer", "timezone": "UTC"},
                )
                await self._create_tables()
                print(f"[AsyncDatabaseService] Connected to PostgreSQL "
                      f"(pool {self.min_pool_size}-{self.max_pool_size})")
                return
            except Exception as e:
                if attempt < retries:
                    print(f"[AsyncDatabaseService] Connection attempt {attempt}/{retries} "
                          f"failed: {e} — retrying in {delay}s …")
                    await asyncio.sleep(delay)
                    delay = min(delay * 1.5, 10)
                else:
                    raise

    async def _create_tables(self) -> None:
        """Create every table + index if they do not already exist."""
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                for stmt in SCHEMA_STATEMENTS:
                    await conn.execute(stmt)
                for stmt in INDEX_STATEMENTS:
                    await conn.execute(stmt)
                # Guarantee exactly one settings row.
                await conn.execute(
                    "INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;"
                )
        print("[AsyncDatabaseService] Tables and indexes ready")

    # ── Helpers reused by handlers / ingestion ─────────────────────────
    async def get_processed_paths(self) -> Set[str]:
        """Return all defect image paths already stored (dedup on restart)."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("SELECT image_path FROM inspection_results")
        return {row["image_path"] for row in rows}

    async def save_defect_result(self, image_path: str, label: str, score: float,
                                 overlay_path: str = None,
                                 belt_action: str = "pass") -> int:
        """Insert one fabric inspection result and return its ID (-1 on conflict)."""
        start = time.perf_counter()
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO inspection_results
                    (image_path, label, score, overlay_path, belt_action)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (image_path) DO NOTHING
                RETURNING id
                """,
                image_path, label, score, overlay_path, belt_action,
            )
        self._record_query(time.perf_counter() - start)
        return row["id"] if row else -1

    async def create_alert(self, source: str, title: str, body: str = "",
                           severity: str = "info", employee_id: int = None,
                           ref_id: int = None) -> int:
        """Write a row into the unified alert center (the notifier reads these)."""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO alerts (source, severity, title, body, employee_id, ref_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
                """,
                source, severity, title, body, employee_id, ref_id,
            )
        return row["id"]

    def _record_query(self, query_time: float) -> None:
        self.query_count += 1
        self.total_query_time += query_time

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()
            print("[AsyncDatabaseService] Connection pool closed")
