# Next.js Rules

1. App Router only.
2. Server Components default; mark client explicitly.
3. Data mutations through use cases, not ad-hoc SQL in pages.
4. Use `middleware` for coarse auth routing only; fine authZ in application layer.
5. Special care for POS routes: minimize RSC waterfalls; prefer TanStack Query client islands (ADR-026).
6. Environment variables validated at boot with Zod.
7. No ad-hoc `fetch` in `useEffect` — use RSC or TanStack Query (`src/data-fetching`).
