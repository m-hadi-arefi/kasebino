# Validation Workflow

Ordered gates (all mandatory):

1. Unit / domain tests
2. Integration tests (DB/Redis/EMQX as needed)
3. Lint (0 warnings)
4. Typecheck
5. Architecture conformance checklist
6. Security checklist (when applicable)
7. Lighthouse (when UI primary/landing in scope)
8. Manual smoke for POS if ARD-007+

Failure anywhere blocks ARD completion.
