# TailwindCSS

## Purpose

Utility-first styling aligned to MerchantOS design tokens (ADR-020).

## Why chosen

Speed + consistency with shadcn; mobile-first; CSS-variable theme for Iranian retail UI.

## Stack (ADR-020)

- **Tailwind CSS v4** via `@tailwindcss/postcss` + `postcss.config.mjs`
- Theme / tokens: `app/globals.css` (`:root` CSS variables + `@theme inline`)
- Compatibility stub: `tailwind.config.ts` (shadcn `components.json`)
- Class merge: `src/lib/utils.ts` (`cn` = `clsx` + `tailwind-merge`)
- Contract: `src/tailwind-design-system/`

## Best practices

- Use design tokens / CSS variables from `docs/uiux/design-system.md`
- Mobile-first breakpoints
- Prefer logical utilities (`ms`/`me`/`ps`/`pe`/`text-start`) for RTL
- Avoid arbitrary values unless a token is missing
- Do not use purple-default AI palettes; primary is deep teal retail utility

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Persian font: Vazirmatn via `next/font` on root layout (`lang=fa` `dir=rtl`)
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `app/globals.css` tokens
- Components use `cn()` helper from `@/lib/utils`

## Anti-patterns

- Inline one-off colors fighting brand tokens
- Huge custom CSS files duplicating utilities
- Physical left/right as layout spine (use logical properties)

## Performance recommendations

- Content detection via `@source` in globals + automatic scan
- Prefer fewer wrappers; `next/font` subsetting for Vazirmatn

## Security recommendations

- Ensure contrast meets WCAG AA (token pairs)

## Example architecture usage

All UI ADRs style exclusively via tokens + Tailwind after ADR-020.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
