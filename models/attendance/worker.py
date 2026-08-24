"""
Attendance worker (محمد عماد — face recognition).

Recognizes employees entering/leaving at the gate camera and reports check-in/
check-out events to the platform. The platform stores raw events; this worker
(or a nightly job) folds them into attendance_records (late/overtime/absent).

╔═══════════════════════════════════════════════════════════════════════╗
║  TODO (teammate): plug the face-recognition model + gate camera here.   ║
╚═══════════════════════════════════════════════════════════════════════╝
"""

import os
import time
import random

from models.common import post

CAMERA = os.getenv("GATE_CAMERA", "CAM-GATE-01")


def recognize_face(frame) -> str | None:
    """Return the recognized employee_code or None. Replace with real model."""
    # TODO: embeddings + nearest-neighbor match against enrolled employees.
    return random.choice(["EMP-001", "EMP-002", "EMP-003", None])


def main():
    print(f"[attendance] reading {CAMERA} … (placeholder loop)")
    while True:
        code = recognize_face(frame=None)
        if code:
            event = random.choice(["in", "out"])
            post("/ingest/attendance", {
                "employee_code": code, "event_type": event, "camera": CAMERA,
            })
            print(f"[attendance] {code} {event}")
        time.sleep(6)


if __name__ == "__main__":
    main()
