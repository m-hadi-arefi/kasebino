# Growth Loop — Loyalty

## Loop

```
Join store (QR/URL/POS phone)
    → Earn points on POS sale or paid pickup order
        → See points/rewards in customer PWA
            → Return (North Star)
                → Redeem rewards at POS or on next pickup
                    → Higher LTV for store-owned member
```

## Instruments

| Step | Event / Metric |
| --- | --- |
| Join | `MembershipCreated` |
| Earn | `PointsEarned` |
| View | `LoyaltyWalletViewed` (product analytics) |
| Redeem | `PointsRedeemed` / coupon redeem |
| Return | `CustomerReturned`, North Star |

## Design rules

- Wallet is **per store membership** (not global cross-store balance in MVP)  
- POS and pickup orders both earn per merchant point rules  
- Customer PWA must show balance without merchant staff  
- **Expiry (ADR-091):** default 12 months from last earn; merchant-configurable  

## Related ARDs

ARD-009, ARD-031, ARD-035, ARD-023
