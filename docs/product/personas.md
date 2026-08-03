# User Personas

**Market:** Iranian local retail (Phase 1 Kerman). Personas expect Persian UI, RTL layouts, SMS OTP, and familiar shop-floor language — not English SaaS jargon.

## 5.1 Merchant (primary)

**Who:** Iranian retail shop owner — mobile shops, fashion, cosmetics, shoes, accessories.

**Goals**

- Sell faster at the counter
- Keep customers coming back
- Increase repeat purchases without hiring a marketer

**Pain points**

- Peak-hour checkout pressure
- Unknown return rate
- Manual / memory-based discounts
- No owned customer list

**Success looks like**

- Checkout under 5 seconds
- 80%+ sales with phone captured
- Visible returning-customer trend

## 5.2 Store employee

**Who:** Staff operating POS during shifts.

**Goals**

- Fast checkout
- Easy product lookup
- Capture phone without friction

**Constraints**

- Low patience for multi-step UI
- Often mobile/tablet at counter
- Needs clear recovery when barcode misses

## 5.3 End customer

**Who:** Shopper buying in-store or via **store PWA / storefront**.

**Goals**

- Quick purchase (POS or pickup)
- Install store PWA; join as member
- Earn / redeem loyalty rewards
- View points, history, rewards, receipts
- Navigate to physical store for pickup

**Privacy note**

Phone is identity key; membership is store-scoped. Consent (ADR-091): POS shows a short Persian notice (continue = consent); customer PWA requires an explicit checkbox before OTP. Soft-delete + audit remain mandatory.

## 5.4 Platform admin

**Who:** MerchantOS operations staff.

**Goals**

- Merchant management (list, activate, suspend)
- Platform growth tooling
- Fraud prevention & monitoring

**Priority:** Mostly P1 for MVP; hooks must exist in architecture from day one.
