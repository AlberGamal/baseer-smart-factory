# Baseer Model Workers

Each worker is an independent Docker container that produces model outputs and posts validated JSON to the Baseer API. Workers do not connect to PostgreSQL directly; the API owns persistence, alerting, and business rules. Every request must include the `X-Ingest-Key` header populated from `BASEER_INGEST_KEY`.

| Worker | Directory | API contract | Current status |
|---|---|---|---|
| Fabric defects | `defect/` | `POST /ingest/defect` | Synthetic scaffold; no weights or evaluation included |
| Attendance | `attendance/` | `POST /ingest/attendance` | Synthetic in/out scaffold; camera and recognition are TODO |
| PPE safety | `safety/` | `POST /ingest/safety` | Synthetic compliance scaffold; no detector included |
| Fire/smoke | `fire/` | `POST /ingest/fire` | Synthetic rare-event scaffold; no detector included |

## Integrating a real model

Place model weights outside Git under `weights/<model>/` and enable a narrowly scoped Docker volume. Replace the worker's `detect()` implementation with real inference, add only the required libraries to `models/requirements.txt`, preserve the validated API payload contract, and rebuild the worker with `docker compose up -d --build <model>_model`. Add a model-specific dataset, reproducible train/validation split, metrics, and error analysis before making production claims.

## Worker-specific notes

**Attendance** stores raw recognition events. A separate folding process must derive `attendance_records` used for late, overtime, and absence calculations. **Safety** applies the persistent three-strike-per-tool rule and automatic deduction in the API transaction, so the worker should send detections only. **Defect** should eventually connect its image watcher/inference pipeline to `post('/ingest/defect', ...)` and provide a real overlay path when available.
