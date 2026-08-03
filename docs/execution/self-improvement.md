# Self-Improvement Protocol

The autonomous agent MUST continuously improve the documentation and execution system **without breaking existing rules or expanding product scope silently**.

## Continuous duties

While implementing ARDs (and at the end of each ARD cycle), the agent should:

1. **Improve docs** — fix ambiguities discovered during implementation  
2. **Detect gaps** — missing events, cache keys, API errors, threat models  
3. **Propose new ARDs** — draft using `docs/templates/ard-template.md` into `docs/ards/` as `todo` only after noting proposal in progress-log  
4. **Propose refactors** — record in `docs/execution/refactor-backlog.md`; do not execute large refactors inside unrelated ARDs  
5. **Improve architecture** — via ADR when changing seams  
6. **Improve testing** — add missing critical cases when touching a module  
7. **Improve observability** — ensure new paths emit logs/traces/metrics hooks  

## Constraints

- Do not violate `docs/rules/*`  
- Do not change PRD goals without human approval  
- Do not mark speculative work as required acceptance for an in-flight ARD  
- Prefer additive clarification over rewrites  
- Keep STATUS board accurate  

## Cadence

| When | Action |
| --- | --- |
| Each ARD Step 11 | Micro-improvements to docs touched |
| Each completed milestone (M0–M6) | Gap review vs PRD requirements matrix |
| When blocked | Capture decision need in `docs/decisions/` draft |

## Gap review checklist

- [ ] All PRD P0 IDs mapped to completed/in-progress ARDs  
- [ ] Event catalog covers emitted events  
- [ ] Cache strategy covers hot paths  
- [ ] Security threats have controls  
- [ ] NFRs have validation evidence  
- [ ] UI surfaces referenced uiuxpromax  

## Output artifacts

- `docs/execution/progress-log.md`  
- `docs/execution/refactor-backlog.md`  
- `docs/execution/gap-reviews/YYYY-MM-DD.md` (create when performing a formal review)  
- Proposed ARDs / ADRs as needed  
