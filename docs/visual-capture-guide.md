# BASEER visual capture guide

The repository includes an authentic screenshot of the implemented login page at [`docs/assets/login-screen.png`](assets/login-screen.png). It was captured from the Vite frontend after the page settled and contains no demo credentials.

Additional authenticated dashboard screenshots should be captured only after the full Docker/PostgreSQL stack is running. The recommended set is the overview dashboard, defect analytics, safety/PPE page, fire-alert page, and unified alerts page. Use the synthetic demo helper from the root of the repository:

```bash
export BASEER_API_URL=http://localhost:8000
export BASEER_INGEST_KEY='your-configured-ingestion-key'
./scripts/demo_synthetic_events.sh
```

Screenshots should be labeled **Synthetic / Demo Data** when they display those events. They should show the real application pages, not presentation mockups or generated concept art. Do not present a branding banner, architecture diagram, or slide-deck mockup as evidence of trained model inference.

A short 30–60 second screen recording can show the following sequence: open the login page, authenticate with the environment-configured manager account, submit synthetic events through the helper, open the relevant alert page, and refresh the dashboard. The recording should state that the worker events are synthetic scaffolds.
