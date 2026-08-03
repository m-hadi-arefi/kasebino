# Analytics Workflow

1. Feature ARD selected by ard-to-code  
2. **Telemetry gate:** list analytics, audit, tracking events + dashboard metrics  
3. If new platform capability needed, ensure ARD-021+ dependency ready  
4. Instrument ports (AnalyticsIngest / Audit) without blocking OLTP  
5. Verify warehouse mirror / dashboards / retention as applicable  
6. Log evidence in progress-log  

See `docs/architecture/analytics-architecture.md`.
