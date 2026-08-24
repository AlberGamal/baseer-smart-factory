"""
Safety / PPE worker (المستخدم — YOLO PPE detection).

Detects which safety items each employee is wearing and reports per-detection
to the platform. The platform tracks the 3-strikes-per-tool rule and applies an
automatic salary deduction (mirrors the existing Telegram notifier logic).

PPE classes (must match the YOLO model exactly):
  helmet, gloves, glasses, earmuffs, face-mask-medical, shoes,
  safety-suit, safety-vest

╔═══════════════════════════════════════════════════════════════════════╗
║  TODO (teammate): load the YOLO PPE weights and replace `detect()`.     ║
╚═══════════════════════════════════════════════════════════════════════╝
"""

import os
import time
import random

from models.common import post

PPE_TOOLS = ["helmet", "gloves", "glasses", "earmuffs",
             "face-mask-medical", "shoes", "safety-suit", "safety-vest"]
CAMERA = os.getenv("SAFETY_CAMERA", "CAM-LINE-A")


def detect(frame) -> tuple[str, dict]:
    """Return (employee_code, {tool: worn_bool}). Replace with real YOLO model."""
    # TODO: YOLO inference → map detected PPE classes to worn=True.
    code = random.choice(["EMP-001", "EMP-004", "EMP-007"])
    items = {tool: random.random() > 0.15 for tool in PPE_TOOLS}
    return code, items


def main():
    print(f"[safety] reading {CAMERA} … (placeholder loop)")
    while True:
        code, items = detect(frame=None)
        res = post("/ingest/safety", {
            "employee_code": code, "items": items, "camera": CAMERA,
        })
        print(f"[safety] {code} missing={res.get('missing')}")
        time.sleep(7)


if __name__ == "__main__":
    main()
