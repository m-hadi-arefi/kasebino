# TypeScript Rules

1. `strict` true always.
2. Ban `any`; justify `unknown` narrowing.
3. Prefer discriminated unions for status machines.
4. Domain layer must not import Next.js / Drizzle / React.
5. Export explicit types for API DTOs inferred from Zod when practical.
6. No non-null assertions unless proven safe and localized.
