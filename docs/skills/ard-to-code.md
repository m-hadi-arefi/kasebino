# ard-to-code Skill Specification (ADR-Driven)

Executable: [`.cursor/skills/ard-to-code/SKILL.md`](../../.cursor/skills/ard-to-code/SKILL.md)

## Purpose

Build the entire MerchantOS platform by executing **ADR-001 → final ADR** in roadmap order until all ADRs are implemented and validated.

## Source of truth

| Artifact | Role |
| --- | --- |
| `/adrs` | Architecture decisions (truth) |
| `docs/architecture/adr-roadmap.md` | Execution order |
| `docs/architecture/adr-dependency-map.md` | Prerequisites |
| `docs/ards` | Delivery packages / feature slices |
| `AGENT.md` | Operating law |
| `docs/rules/iranian-first-development.md` | Binding Iranian First UX law |
| `docs/checklists/iranian-feature-checklist.md` | Per-feature completion gate |

## Workflow (summary)

1. Read adr-roadmap.md  
2. Find first incomplete ADR  
3. Read Iranian First rules + ADR/ARD localization sections  
4. Read ADR + dependency ADRs  
5. Read related ARDs + architecture  
6. Telemetry + persistence + uiuxpromax + **Iranian First** gates  
7. Write implementation plan (include localization)  
8. Implement only that ADR  
9. Test / lint / typecheck / quality gates + Iranian checklist  
10. Verify completion criteria (RTL + Persian + mobile + Iranian UX)  
11. Mark ADR completed  
12. Continue to next ADR  

Continue until **all ADRs completed**.

## Forbidden

Coding without ADR + Iranian First reading; contradicting Accepted ADRs; delivery features; non-Drizzle SQL ORMs; Mongo as OLTP SoT; English-only/LTR-only merchant or customer MVP UX; completing without Iranian checklist when UX in scope.
