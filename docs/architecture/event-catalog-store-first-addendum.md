# Event Catalog Addendum — Store-First / Pickup / Membership

Canonical envelopes unchanged (`04-event-driven-architecture.md`).

## New / updated domain events

| Event | Publisher | Notes |
| --- | --- | --- |
| MembershipCreated | Membership join (POS/OTP/pickup) | payload: storeId, customerId, source |
| MembershipUpdated | Membership service | status changes |
| StoreQrGenerated | QR system | storeId, url |
| StoreBrandingUpdated | Store update | changedFields |
| StorePwaInstalled | Store PWA / analytics | storeId, anonymousId/customerId |
| StorePwaInstallPromptShown | Store PWA | storeId |
| CustomerLoggedIn / CustomerLoggedOut | Customer identity | distinct from merchant login |
| OrderPreparing | Pickup flow | replaces delivery-centric progress |
| OrderReadyForPickup | Pickup flow | notify customer |
| OrderPickedUp | Pickup flow | |
| OrderCompleted | Pickup flow | terminal success |
| OrderRefunded | Payments/ordering | |
| LoyaltyWalletViewed | Customer dashboard | product analytics |
| ReceiptViewed | Customer dashboard | product analytics |
| NavigateToStoreClicked | Storefront/maps | product analytics |

## Deprecated for MVP

| Event | Status |
| --- | --- |
| OrderDelivered | **Out of MVP** — delivery non-goal. Do not implement subscribers expecting delivery. |

Keep historical mention in older sections for clarity but mark superseded by pickup events.

## Cache invalidation notes

- Membership* → member lists, customer stats, wallet keys  
- Store geo/branding/QR → storefront cache (600s class)  
- Pickup status* → order detail/list caches + merchant board  

## Related

`pickup-order-architecture.md`, `customer-membership-architecture.md`, full catalog in this file’s main body.
