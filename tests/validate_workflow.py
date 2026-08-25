from pathlib import Path

import yaml


workflow = yaml.safe_load(Path(".github/workflows/ci.yml").read_text())
jobs = workflow.get("jobs", {})
required_jobs = {"backend", "frontend"}
missing = required_jobs.difference(jobs)
if missing:
    raise SystemExit(f"missing workflow jobs: {sorted(missing)}")

backend_steps = {step.get("name") for step in jobs["backend"].get("steps", [])}
frontend_steps = {step.get("name") for step in jobs["frontend"].get("steps", [])}
required_backend = {
    "Install Python dependencies",
    "Run tests",
    "Compile Python modules",
    "Import FastAPI application and enumerate routes",
    "Validate Compose structure",
}
required_frontend = {"Install frontend dependencies", "Build frontend"}
if not required_backend.issubset(backend_steps):
    raise SystemExit(f"missing backend steps: {sorted(required_backend - backend_steps)}")
if not required_frontend.issubset(frontend_steps):
    raise SystemExit(f"missing frontend steps: {sorted(required_frontend - frontend_steps)}")
print(f"workflow_jobs={len(jobs)}")
print("workflow_validation=PASS")
