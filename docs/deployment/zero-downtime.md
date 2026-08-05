# Zero-Downtime Strategy

1. Expand app instances with new version behind LB
2. Run migrations backward-compatible first
3. Switch traffic
4. Shrink old instances
5. Breaking migrations only with expand/contract pattern

Stateless JWT avoids sticky sessions.

**Binding contract:** `src/scalability-stateless/` (ADR-071 / NFR-02). Full zero-downtime deploy ADR → ADR-070.
