# Zod

## Purpose

Runtime validation for inputs/env and shared form schemas (ADR-027).

## Why chosen

Security boundary at API edge; aligns TypeScript types; shares with React Hook Form via `zodResolver`.

## Best practices

- All API inputs validated with Zod (never trust client alone)
- Share schemas with RHF via `@hookform/resolvers/zod`
- Explicit Persian `{ error: … }` on product schemas (plain language)
- Keep schemas composable; avoid `z.any()` on critical inputs

## Project conventions

- Strategy root: `src/forms-validation` (ADR-027)
- Module DTOs: `src/modules/*/application/dto`
- Env boot remains zod-free `parseEnv` in `src/env-secrets` until optional migrate
- Align with `AGENT.md` and `docs/rules/*`

## Folder conventions

- `src/forms-validation/` — shared phone, money, error catalog, resolver helper
- `src/modules/*/application/dto` — bounded-context input schemas
- `src/modules/*/ui/forms` — RHF form wiring (when UI lands)

## Anti-patterns

- Validation only in UI
- Loose `z.any()` on critical fields
- English-only validation UX messages
- Formik / yup-only stacks

## Performance recommendations

- Keep schemas composable
- Prefer `onSubmit` / `onBlur` RHF modes for POS speed

## Security recommendations

- Reject invalid Iranian mobiles / money at both UI and API
- Never treat client Zod success as authorization

## Example architecture usage

`iranianMobileSchema` + `positiveTomanSchema` for POS phone/price; `createZodFormResolver` on client; same schema `.safeParse` in Route Handlers.

## Related rules

`docs/rules/ui-rules.md`, `docs/rules/iranian-first-development.md`, `docs/tech/react-hook-form.md`
