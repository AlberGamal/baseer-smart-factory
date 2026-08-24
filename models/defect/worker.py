"""
Defect-detection worker (عمر — STPM/ONNX).

This is the integration seam. The team's existing event-driven STPM pipeline
(watchdog → EventBus → BatchProcessor → ONNX → AsyncDatabaseHandler) drops in
here almost unchanged; instead of writing to the DB directly, publish each
result to the platform via `post('/ingest/defect', ...)`.

╔═══════════════════════════════════════════════════════════════════════╗
║  TODO (teammate): load best_model.onnx and replace `detect()` below.   ║
╚═══════════════════════════════════════════════════════════════════════╝
"""

import os
import time
import random

from models.common import post

IMAGES_DIR = os.getenv("IMAGES_DIR", "/app/images")
MODEL_PATH = os.getenv("MODEL_PATH", "/app/model/best_model.onnx")


def load_model():
    # TODO: import onnxruntime; return ort.InferenceSession(MODEL_PATH)
    print(f"[defect] (placeholder) would load model at {MODEL_PATH}")
    return None


def detect(image_path: str) -> dict:
    """Run STPM inference on one fabric image. Replace with the real model."""
    # TODO: preprocess → session.run → anomaly score + heatmap overlay
    score = random.uniform(0, 1)
    is_defect = score > 0.7
    return {
        "image_path": image_path,
        "label": "Defect" if is_defect else "Normal",
        "score": round(score, 4),
        "defect_type": random.choice(["hole", "stain", "thread"]) if is_defect else None,
        "overlay_path": None,
        "belt_action": "stop" if is_defect else "pass",
    }


def main():
    load_model()
    print(f"[defect] watching {IMAGES_DIR} … (placeholder loop)")
    while True:
        # TODO: replace with watchdog on IMAGES_DIR for real-time ingestion.
        sample = f"images/piece_{int(time.time())}.jpg"
        result = detect(sample)
        post("/ingest/defect", result)
        print(f"[defect] sent {result['label']} ({result['score']})")
        time.sleep(5)


if __name__ == "__main__":
    main()
