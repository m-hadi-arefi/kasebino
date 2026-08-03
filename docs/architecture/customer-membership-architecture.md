# Customer Membership Architecture

## First-class concept

**StoreMembership** links a customer identity to a store (under a merchant). The store owns the relationship for CRM, loyalty, and history visibility.

```
CustomerIdentity (phone)
       │
       └── StoreMembership (storeId, merchantId, status, joinedAt, source)
                 ├── LoyaltyWallet (scoped)
                 ├── Orders / Sales history (scoped)
                 └── Rewards eligibility
```

## Identity vs membership

| Concept | Description |
| --- | --- |
| CustomerIdentity | Phone-authenticated person (CUST OTP) |
| StoreMembership | Belonging to a specific store’s customer base |
| Merchant staff AuthUser | Separate actor type (merchant OTP) |

A person may be a member of multiple stores (multiple memberships). MVP wallets remain **per membership/store**, not pooled globally.

## Creation paths

1. **POS capture** — phone at sale → upsert identity + membership (Persian notice; continue = consent — ADR-091)  
2. **QR / storefront join** — OTP with **explicit consent checkbox** → membership `source=qr|storefront`  
3. **Pickup checkout** — OTP required before or during paid order → membership  

Record consent surface/version on membership or identity for audit.

## Invariants

- Unique `(store_id, phone)` or `(store_id, customer_id)`  
- Soft-delete membership hides from default lists  
- Cross-store data never leaks in customer portal (active store context)  

## Events

`MembershipCreated`, `MembershipActivated`, `MembershipSuspended` (optional), plus existing Customer* where applicable.

## Related

Domain model; ARD-031, ARD-008, ARD-030
