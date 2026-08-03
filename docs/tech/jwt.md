# JWT

## Purpose

Stateless auth claims transport.

## Why chosen

AUTH-05; horizontal scale without session sticky.

## Best practices

- Include sub, merchantId, roles, tokenVersion
- Short TTL
- Secure signing alg (RS256 or strong HS256 with secret mgmt)

## Project conventions

- Align with `AGENT.md` and `docs/rules/*`
- Prefer module-owned adapters over global singletons when feasible
- Document new conventions in an ADR if diverging

## Folder conventions

- `identity module`

## Anti-patterns

- Oversized claims
- Sensitive PII in JWT

## Performance recommendations

- Validate exp/nbf
- Rotation support

## Security recommendations

- HTTPS only cookies

## Example architecture usage

Issued after OTP verify; consumed by middleware.

## Related rules

See matching files under `docs/rules/` and architecture docs in `docs/architecture/`.
