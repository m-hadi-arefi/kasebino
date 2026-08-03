# Iranian First Development Rules

**Status:** Binding global engineering law  
**Applies to:** Every ADR, ARD, feature, API, UI, notification, report, and agent workflow  
**Checklist:** [`docs/checklists/iranian-feature-checklist.md`](../checklists/iranian-feature-checklist.md)

---

## Primacy statement

**MerchantOS is an Iranian-native retail operating system.**

The product is built primarily for Iranian merchants and Iranian customers (Phase 1: Kerman and similar Iranian local retail). Persian language, RTL layout, Jalali calendar, تومان formatting, Iranian phone/address conventions, and Iranian retail workflows are **mandatory defaults**, not optional localization add-ons.

English may exist for:

- Internal engineering docs / ADRs / code identifiers
- Optional bilingual admin tooling later (only via explicit ADR)

Customer-facing and merchant-facing **runtime UX defaults to Persian + RTL**.

---

## Non-negotiable principles

1. **Persian first** — User-visible copy, errors, empty states, SMS, push, emails, receipts, and dashboards ship in Persian (`fa-IR`).
2. **RTL first** — Layouts are designed and implemented RTL-first using logical CSS (`margin-inline`, `padding-inline`, `inset-inline`, `text-align: start`, etc.). LTR is the exception path, not the default.
3. **Jalali first** — User-facing dates/times use Jalali (Solar Hijri) with Iran timezone (`Asia/Tehran`) unless an ADR explicitly requires Gregorian for system/interop.
4. **تومان / ریال explicit** — Money displays must be unambiguous for Iranian users (default display unit: **تومان** unless product ADR states otherwise). Never show ambiguous “currency symbols only” without Iranian context.
5. **Iranian identity formats** — Mobile numbers (`09xxxxxxxxx` / E.164 `+98`), addresses, postal codes, and map/navigation patterns match Iranian conventions.
6. **Iranian merchant cognition** — POS and merchant UI prioritize speed, large targets, familiar retail language, and minimal technical jargon for traditional shopkeepers.
7. **Iranian mobile reality** — Optimize for Android-class devices, variable bandwidth, SMS OTP reliability, and touch-first interaction.
8. **No feature complete without Iranian checklist** — Passing `docs/checklists/iranian-feature-checklist.md` is part of Definition of Done.

---

## Mandatory pre-implementation checks

Before implementing **any** feature, the agent/developer MUST answer:

| # | Check | Fail means |
| --- | --- | --- |
| 1 | Does this need Persian text? | Missing `fa` strings / hard-coded EN UX |
| 2 | Does this support RTL? | Physical left/right CSS, mirrored icons wrong |
| 3 | Does this support Jalali dates? | Gregorian-only user display |
| 4 | Does this support تومان formatting? | Wrong unit/separators/locale |
| 5 | Does this match Iranian user behavior? | Western assumptions, delivery-first, etc. |
| 6 | Does this work on Iranian mobile devices? | Desktop-only, heavy assets, tiny taps |

If any answer is “no / unknown” for a user-facing change, **stop and fix the plan** before coding.

---

## Layer requirements

### Product & domain

- Domain language in code may be English; **user messaging always Persian**.
- Workflows reflect Iranian retail: cash-heavy POS, SMS-first auth, pickup at store, QR window stickers, membership via phone.
- Avoid assumptions about Western cards-as-primary, Google-login-only, or courier delivery as default.

### Frontend (Next.js / PWA / dashboards)

- `dir="rtl"` and `lang="fa"` on merchant/customer app shells by default.
- Persian typography (web font stack suitable for Persian; never depend on Inter/Roboto/Arial alone for UI).
- shadcn/ui and Tailwind configured with RTL-first logical properties.
- Icons that imply direction (chevrons, arrows, back) must mirror correctly in RTL.
- Forms: Persian labels, Persian validation messages, numeric inputs usable on mobile keyboards.
- Storefront SEO: Persian titles/descriptions; RTL HTML semantics.

### Backend / API

- API may use English keys; **human-readable messages** returned to clients must be Persian (or message codes resolved client-side to Persian — prefer one consistent strategy, documented in ADR-030).
- Phone normalization for Iran; reject invalid Iranian mobiles with Persian errors.
- Time storage: UTC in DB; display conversion to `Asia/Tehran` + Jalali in presentation layer.
- Money: integer minor units in DB; formatting rules for تومان in presentation.

### Database (PostgreSQL + Drizzle)

- Store Persian text as UTF-8 (`text` / `varchar`) without mojibake.
- Plan search for Persian (normalization, `pg_trgm`, careful collation; no ASCII-only search assumptions).
- Indexes must remain correct for Persian product names/SKU notes.
- Avoid case-folding tricks that break Persian.

### Cache / Redis

- Cache keys language-agnostic (IDs); cached display payloads must preserve Persian Unicode.

### Analytics / Mongo / dashboards

- OLTP SoT remains PostgreSQL; analytics displays for merchants/admins use Persian labels + Jalali ranges.
- Event names may be English enum/codes; dashboard copy is Persian.
- Funnel/report axes use Iran timezone and Jalali buckets when shown to users.

### Auth / SMS / notifications

- OTP SMS templates in Persian.
- Iranian mobile number UX (leading 0 display, +98 storage/normalization).
- Notification content Persian; avoid Latin-only SMS when Persian is required for comprehension.

### Realtime / events

- Internal event schemas English; user-visible toast/realtime copy Persian RTL.

### Testing

- Include RTL visual/regression where UI ships.
- Snapshot/assert Persian strings for critical flows (login, POS errors, pickup status).
- Format tests for تومان and Jalali.

### Infrastructure / ops

- Logs/metrics may be English for operators.
- Any merchant-facing status page or runbook excerpt for merchants must be Persian if exposed.

---

## Forbidden patterns

- English-only merchant or customer UI in MVP.
- Hard-coded LTR layouts (`margin-left`/`float:left` as layout spine).
- Gregorian-only date pickers for merchants/customers.
- `$` / USD-first currency UX.
- Assuming Latin-only names/addresses.
- Shipping/delivery-first UX (also forbidden by pickup ADR) framed as “normal ecommerce.”
- Desktop-only designs for POS or store PWA.
- Technical English jargon in merchant microcopy (“webhook failed”, “JWT expired”) without Persian plain language.

---

## Completion gate

A feature/ADR/ARD implementation is **incomplete** unless:

- [ ] Persian copy present for all user-visible strings in scope  
- [ ] RTL layout verified on mobile width  
- [ ] Jalali dates where dates are shown  
- [ ] تومان formatting where money is shown  
- [ ] Iranian phone/address rules where identity/location shown  
- [ ] `docs/checklists/iranian-feature-checklist.md` passed for the change  

---

## Related documents

- `AGENT.md` — Iranian First UX permanent rule  
- `docs/checklists/iranian-feature-checklist.md`  
- `docs/rules/ui-rules.md`  
- `docs/uiux/design-rules.md`  
- ADR Iranian User Experience Requirements sections  
- ARD Localization / RTL / Persian UX sections  

---

## Change control

Changes to this rule require an ADR (or superseding ADR) plus updates to AGENT.md and ard-to-code skill gates.
