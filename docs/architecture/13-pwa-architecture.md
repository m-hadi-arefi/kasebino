# 13 — PWA Architecture

## Two PWA products

| PWA | Audience | Goals | Primary ARD |
| --- | --- | --- | --- |
| Merchant staff PWA | Owners/employees | POS speed, offline sale queue, camera scan | ARD-017 |
| Store customer PWA | Members/shoppers | Installable branded store app, portal, pickup | ARD-029 |

Never share manifests, `start_url`, or auth cookies between these audiences without explicit isolation.

## Staff PWA (ARD-017)

- Installable merchant app (NFR-06)
- Offline product search + sale queue + background sync (NFR-07 / POS-08 — P1)
- Fast POS on mobile browsers including camera barcode (POS-04)

### Components

| Piece | Role |
| --- | --- |
| Web App Manifest | MerchantOS staff branding |
| Service Worker | precache POS shell; catalog snapshots |
| IndexedDB | offline product index + queued sales |
| Background Sync | flush queue when online |
| Camera barcode | BarcodeDetector / fallback |

## Store PWA (ARD-029)

See `storefront-pwa-architecture.md`.

- Per-store manifest (name, icons, theme)
- `start_url` → that store’s storefront
- Customer JWT (ARD-030)
- Growth loop: install → reopen → order/visit

## Online-first MVP

P0 path is online for POS and for customer orders. Offline staff queue must not block M1.

## Security

- httpOnly cookies preferred; isolate staff vs customer cookie names/paths
- Do not store JWT in IndexedDB plaintext long-term if avoidable
