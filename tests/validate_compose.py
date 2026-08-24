from pathlib import Path

import yaml


compose = yaml.safe_load(Path("Docker/docker-compose.yml").read_text())
services = compose.get("services", {})
required = {
    "postgres", "api", "bootstrap", "dashboard",
    "defect_model", "attendance_model", "safety_model", "fire_model",
}
missing = required.difference(services)
if missing:
    raise SystemExit(f"missing services: {sorted(missing)}")
for worker in ("defect_model", "attendance_model", "safety_model", "fire_model"):
    environment = services[worker].get("environment", [])
    if not any("BASEER_INGEST_KEY" in entry for entry in environment):
        raise SystemExit(f"{worker} does not receive BASEER_INGEST_KEY")
print(f"compose_services={len(services)}")
print("compose_validation=PASS")
