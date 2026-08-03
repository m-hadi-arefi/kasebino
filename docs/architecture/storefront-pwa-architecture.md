# Storefront & Store PWA Architecture

## Principle

Every **store** has exactly one dedicated customer-facing digital surface: **URL + QR + branding + installable PWA**.

This is distinct from the **merchant staff app / POS PWA** (ARD-017).

## URL strategy

**MVP (ADR-091):** path-based only.

- Canonical: `https://{app-host}/s/{storeSlug}`
- Optional future: `{storeSlug}.stores.{domain}` (not MVP)

Slug unique globally. QR encodes the canonical URL (+ `?src=qr`).

## Branding

Persist per store:

- Display name, logo object key (MinIO), primary/accent colors (constrained tokens), optional cover image  
- Manifest name/short_name/icons/theme_color derived from branding  

## PWA

| Concern | Rule |
| --- | --- |
| Manifest | Per-store dynamic or pregenerated |
| Service worker | Shared shell with store-scoped start_url / cache partitions |
| Install | Promoted on storefront; tracked for growth loop |
| Auth | Customer JWT (CUST auth), not merchant staff JWT |

## Surfaces

1. Public catalog / PDP / store info + map  
2. Pickup checkout  
3. Customer portal (profile, loyalty, history, rewards, receipts)  
4. Install / offline shell  

## Related

ARD-010, ARD-029, ARD-033, ARD-035; growth-loops-store-pwa.md
