# NextAuth

## Purpose

Auth.js integration with JWT strategy for OTP login.

## Why chosen

Standard Next session integration; JWT matches AUTH-05.

## Best practices

- Credentials/OTP custom provider
- JWT callbacks add merchantId/roles
- Secure cookies prod

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- Contract: `src/nextauth-jwt`
- Config stub: `src/modules/identity/infrastructure/auth`

## Anti-patterns

- Database sessions (forbidden for MVP)
- Email provider

## Performance recommendations

- Short access token TTL

## Security recommendations

- Rotate secrets
- Never return OTP in prod

## Example architecture usage

Phone OTP → JWT session cookie via `createMerchantAuthConfig` (Auth.js v5 / `next-auth@5`).

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
