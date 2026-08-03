# Incident Workflow

1. Detect via health/metrics/error monitor
2. Triage severity (POS down = Sev1)
3. Mitigate (rollback/scale/feature flag)
4. Preserve correlationIds/logs
5. Postmortem → ADR or new ARD if systemic
