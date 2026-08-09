# UI Strategy — MerchantOS vs ERPNext Desk

## Principle

**MerchantOS UI remains the customer and merchant retail interface.**  
**ERPNext Desk remains the internal accounting / procurement interface.**

MerchantOS must not be replaced by ERPNext UI.

## Ownership by surface

### MerchantOS UI (build & own)

| Surface | Audience | Why MOS |
| --- | --- | --- |
| POS (online + offline PWA) | Cashiers | Speed, Persian RTL, barcode, membership, loyalty |
| Storefront + customer PWA | Shoppers | Store-first branding, pickup, OTP portal |
| Merchant dashboard | Owners / managers | Retention analytics, catalog ops, orders board |
| Admin console | Kasbino operators | SaaS tenancy, support |
| Simple business reports | Merchants | Sales today, top SKUs, returning customers — **not** statutory books |
| Notifications center | Staff | Iranian SMS + in-app |

### ERPNext UI (use as-is; do not re-skin into MOS)

| Surface | Audience | Why ERP |
| --- | --- | --- |
| Chart of Accounts / Journal | Accountants | Financial configuration |
| Ledger views / Trial Balance | Accountants | Audit trail |
| Tax templates & financial statements | Finance | Statutory / management accounting |
| Purchase Order / Receipt / PI | Buyers / accountants | Mature procurement UX |
| Payment reconciliation tools | Finance | AR/AP allocation |
| Period closing / fiscal tools | Finance | Period integrity |

### Hybrid (careful)

| Idea | Guidance |
| --- | --- |
| Deep-link “Open in ERPNext” for accountants | Allowed later; server-issued URL; SSO optional |
| Embed ERP Desk iframe in merchant app | **Discouraged** — auth, RTL, tenancy, and UX mismatch |
| Rebuild full P&L inside MOS | **Forbidden** as SoT; optional read-only widgets via ACL later |

## Why MerchantOS UI must not be replaced by ERPNext UI

1. **Product identity:** MerchantOS is a retention OS, not an ERP skin.
2. **Iranian First UX:** Persian, RTL, Jalali, تومان, Iranian mobile flows are governed in MOS design system (ADR-021) — Desk is not our control surface.
3. **Offline POS:** ERP Desk cannot run the offline queue architecture (ADR-024).
4. **Multi-tenant storefront:** Per-store PWA/QR cannot map cleanly onto ERP Website.
5. **Critical path independence:** Retail must work when ERP is down or unconfigured.
6. **Audience split:** Cashiers and shoppers ≠ accountants. Forcing one UI harms both.

## Implementation rules for future agents

1. Do not add ERPNext Desk navigation to staff POS chrome.
2. Do not route customers through ERP Portal.
3. Any ERP-facing settings in MOS are limited to connection status / mapping health (future), not CoA editing.
4. uiuxpromax briefs remain required for MOS UI only; ERP Desk UX is upstream.

## Related

- ADR-134 UI Strategy
- [erpnext-website-cms.md](./erpnext-website-cms.md)
- [erpnext-security.md](./erpnext-security.md)
