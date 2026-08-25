#!/usr/bin/env bash
set -euo pipefail

: "${BASEER_API_URL:=http://localhost:8000}"
: "${BASEER_INGEST_KEY:?Set BASEER_INGEST_KEY to the value configured for the API}"

curl --fail-with-body -sS -X POST "$BASEER_API_URL/ingest/defect" \
  -H 'Content-Type: application/json' \
  -H "X-Ingest-Key: $BASEER_INGEST_KEY" \
  -d '{"image_path":"demo/synthetic-fabric-frame-001.png","label":"Defect","score":0.91,"belt_action":"stop"}'

curl --fail-with-body -sS -X POST "$BASEER_API_URL/ingest/attendance" \
  -H 'Content-Type: application/json' \
  -H "X-Ingest-Key: $BASEER_INGEST_KEY" \
  -d '{"employee_code":"EMP-001","event_type":"in","camera":"demo-camera"}'

curl --fail-with-body -sS -X POST "$BASEER_API_URL/ingest/safety" \
  -H 'Content-Type: application/json' \
  -H "X-Ingest-Key: $BASEER_INGEST_KEY" \
  -d '{"employee_code":"EMP-001","items":{"helmet":true,"gloves":false,"safety-vest":true},"camera":"demo-camera"}'

curl --fail-with-body -sS -X POST "$BASEER_API_URL/ingest/fire" \
  -H 'Content-Type: application/json' \
  -H "X-Ingest-Key: $BASEER_INGEST_KEY" \
  -d '{"alert_type":"smoke","confidence":0.91,"location":"demo-line"}'

printf '\nSynthetic demo events submitted. These payloads are not real model detections.\n'
