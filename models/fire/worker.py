"""
Fire / smoke detection worker.

Watches factory-zone cameras and raises a critical alert the moment fire or
smoke is detected. The platform persists it to fire_alerts and the unified
alerts table (forwarded to Telegram by the bridge).

╔═══════════════════════════════════════════════════════════════════════╗
║  TODO (teammate): load the fire/smoke model and replace `detect()`.     ║
╚═══════════════════════════════════════════════════════════════════════╝
"""

import os
import time
import random

from models.common import post

LOCATIONS = ["خط الصباغة", "مخزن الأقمشة", "غرفة المولدات", "خط التعبئة"]


def detect(frame) -> dict | None:
    """Return a detection dict or None. Replace with the real model."""
    # TODO: run fire/smoke classifier on the frame.
    if random.random() < 0.05:  # rare event
        return {
            "alert_type": random.choice(["fire", "smoke"]),
            "confidence": round(random.uniform(0.7, 0.98), 2),
            "location": random.choice(LOCATIONS),
        }
    return None


def main():
    print("[fire] monitoring zones … (placeholder loop)")
    while True:
        hit = detect(frame=None)
        if hit:
            post("/ingest/fire", hit)
            print(f"[fire] 🔥 {hit['alert_type']} @ {hit['location']}")
        time.sleep(5)


if __name__ == "__main__":
    main()
