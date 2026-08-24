"""Shared HTTP client for model workers.

Workers stay decoupled from the database and authenticate every ingestion request
with the same secret configured in ``BASEER_INGEST_KEY``.
"""

import json
import os
import time
import urllib.request

API_URL = os.getenv("BASEER_API_URL", "http://api:8000")
INGEST_KEY = os.getenv("BASEER_INGEST_KEY", "")


def post(endpoint: str, payload: dict, retries: int = 5) -> dict:
    url = f"{API_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if INGEST_KEY:
        headers["X-Ingest-Key"] = INGEST_KEY
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as resp:
                return json.loads(resp.read().decode())
        except Exception as exc:
            print(f"[worker] POST {endpoint} failed ({attempt}/{retries}): {exc}")
            time.sleep(2 * attempt)
    return {}
