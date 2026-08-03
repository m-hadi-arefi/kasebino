# Iranian Feature Checklist

**Mandatory** for every feature, ADR implementation, and ARD delivery that touches user-facing or merchant-facing behavior.

**Rule source:** [`docs/rules/iranian-first-development.md`](../rules/iranian-first-development.md)

Mark every applicable item. Items marked N/A must include a one-line reason.

---

## Language

- [ ] Primary UI copy is Persian (`fa-IR`)
- [ ] Error messages are Persian (plain language for merchants/customers)
- [ ] Empty / loading / success states are Persian
- [ ] Notifications (SMS / push / in-app) are Persian
- [ ] Receipts / printable / shareable text is Persian where user-facing
- [ ] No unexplained English technical jargon in merchant UX

## Layout (RTL)

- [ ] Root `dir="rtl"` and `lang="fa"` on the relevant app shell
- [ ] Layout uses logical CSS properties (not physical left/right as the spine)
- [ ] Spacing/padding looks correct in RTL
- [ ] Directional icons (back, chevrons, progress) mirror correctly
- [ ] Tables, lists, and forms align naturally for Persian reading order
- [ ] Modals/sheets/drawers respect RTL

## Mobile (Iranian device reality)

- [ ] Optimized for Android / mobile-first viewports
- [ ] Touch targets ≥ 44px for primary actions
- [ ] Works under constrained bandwidth (sensible image/fonts payload)
- [ ] Numeric entry (price, phone, OTP) is easy on mobile keyboards
- [ ] Store / staff PWA usable one-handed where intended

## Business formats (Iran)

- [ ] Currency shown with clear **تومان** (or explicit ریال policy from ADR)
- [ ] Thousands separators match locale expectations for Persian numerics
- [ ] User-facing dates are **Jalali** with `Asia/Tehran` context
- [ ] Iranian mobile numbers accepted/normalized (`09…` / `+98`)
- [ ] Addresses / geo / maps usable for Iranian locations when in scope
- [ ] Postal / city fields do not assume Western-only formats

## User experience (Iranian retail)

- [ ] Simple enough for traditional merchants (low cognitive load)
- [ ] Uses everyday retail language, not SaaS jargon
- [ ] Matches Iranian workflows (SMS OTP, pickup, QR sticker, POS phone capture)
- [ ] Does not assume delivery/marketplace as the default journey
- [ ] POS path remains fast under pressure (if POS touched)

## Search & content (when applicable)

- [ ] Persian product/customer text stores and displays without corruption
- [ ] Search/filter handles Persian text meaningfully (or N/A documented)
- [ ] Storefront SEO metadata is Persian when storefront touched

## Analytics & reporting (when applicable)

- [ ] Dashboard labels Persian
- [ ] Date ranges selectable/displayed in Jalali for users
- [ ] Charts/tooltips readable in RTL layout

## Auth & communications (when applicable)

- [ ] SMS OTP template Persian
- [ ] Phone validation messages Persian
- [ ] Session/expiry messaging Persian

## Definition of Done gate

- [ ] All applicable items above checked
- [ ] Linked from implementation plan `docs/execution/plans/ADR-XXX.md` (or ARD plan)
- [ ] Agent confirms Iranian First checks 1–6 from AGENT.md

**If any applicable item fails → do not mark ADR/ARD completed.**
