# React Hook Form

## Purpose

Performant forms for product/customer/loyalty/POS config (ADR-027).

## Why chosen

Minimal re-renders; Zod resolver; fits interactive merchant POS and storefront forms.

## Best practices

- Use `createZodFormResolver` / `zodResolver` from `src/forms-validation`
- Explicit `defaultValues`
- Accessible Persian error messages (inline, RTL-aware)
- Prefer `onSubmit` / `onBlur` validation modes for POS speed

## Project conventions

- Strategy: `src/forms-validation` (ADR-027)
- Module UI forms: `src/modules/*/ui/forms`
- Shared Zod schemas — do not duplicate English ad-hoc checks
- Align with `AGENT.md` and `docs/rules/*`

## Folder conventions

- `src/forms-validation/resolver.ts` — light RHF + Zod bridge
- `module ui forms` for surface-specific wiring

## Anti-patterns

- Controlling every keystroke via React state without RHF
- Client-only validation without API Zod
- English validation copy for merchant/customer UX

## Performance recommendations

- Mode onSubmit/onBlur appropriately (POS prefers fewer re-renders)

## Security recommendations

- Never trust client-only validation — mirror schemas at Route Handler / use-case edge

## Example architecture usage

Create product form; OTP verify form; POS phone capture — all via shared Zod + RHF resolver.

## Related rules

`docs/rules/ui-rules.md`, `docs/tech/zod.md`
