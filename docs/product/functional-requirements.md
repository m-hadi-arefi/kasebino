# Functional Requirements

Traceable IDs from PRD §8. Priority: `P0` = MVP blocker, `P1` = stretch / early Phase 2.

## AUTH — Authentication

| ID | Requirement | Priority | Primary ARD |
| --- | --- | --- | --- |
| AUTH-01 | Login/registration phone number only | P0 | ARD-002 |
| AUTH-02 | OTP verification mandatory for session | P0 | ARD-002 |
| AUTH-03 | Dev mode returns OTP in API; no SMS | P0 | ARD-002 |
| AUTH-04 | Production never returns OTP; SMS delivers | P0 | ARD-002 |
| AUTH-05 | Stateless JWT sessions | P0 | ARD-002 |
| AUTH-06 | Successful auth can create merchant on first registration | P0 | ARD-002, ARD-003 |

## POS

| ID | Requirement | Priority | Primary ARD |
| --- | --- | --- | --- |
| POS-01 | Standard barcode checkout < 5s | P0 | ARD-007 |
| POS-02 | Barcode resolve ≤ 1s | P0 | ARD-007, ARD-005 |
| POS-03 | Fuzzy search ≤ 100ms p95 cached/local | P0 | ARD-007, ARD-005 |
| POS-04 | Camera barcode on mobile browsers | P0 | ARD-007, ARD-017 |
| POS-05 | Checkout requires customer phone | P0 | ARD-007 |
| POS-06 | Capture creates/updates CRM customer | P0 | ARD-007, ARD-008 |
| POS-07 | Completed sale generates receipt | P0 | ARD-007 |
| POS-08 | Offline sale queue + background sync | P1 | ARD-017 |

## CRM

| ID | Requirement | Priority | Primary ARD |
| --- | --- | --- | --- |
| CRM-01 | Profile: identity, contact, engagement stats | P0 | ARD-008 |
| CRM-02 | Purchase history per customer | P0 | ARD-008 |
| CRM-03 | Segments: new, returning, lapsed | P0 | ARD-008 |
| CRM-04 | Customer stats on dashboard | P0 | ARD-008, ARD-013 |

## Loyalty — LYL

| ID | Requirement | Priority | Primary ARD |
| --- | --- | --- | --- |
| LYL-01 | Configurable point rules | P0 | ARD-009 |
| LYL-02 | Emit PointsEarned/Redeemed/Expired | P0 | ARD-009 |
| LYL-03 | Rewards/coupons create + redeem at POS | P0 | ARD-009, ARD-007 |
| LYL-04 | Wallet visible to merchant and customer | P0 | ARD-009 |

## Storefront — SF

| ID | Requirement | Priority | Primary ARD |
| --- | --- | --- | --- |
| SF-01 | Public product catalog | P0 | ARD-010 |
| SF-02 | Product detail pages | P0 | ARD-010 |
| SF-03 | Online ordering (**pickup-only**) | P0 | ARD-010, ARD-011 |
| SF-04 | Merchant info page | P0 | ARD-010 |

## Analytics — AN

| ID | Requirement | Priority | Primary ARD |
| --- | --- | --- | --- |
| AN-01 | Merchant overview dashboard | P0 | ARD-013, ARD-016 |
| AN-02 | Revenue dashboard | P0 | ARD-016 |
| AN-03 | Customer dashboard | P0 | ARD-016 |
| AN-04 | Retention dashboard (North Star) | P0 | ARD-016 |

## Admin — ADM

| ID | Requirement | Priority | Primary ARD |
| --- | --- | --- | --- |
| ADM-01 | Merchant list/view/activate/suspend | P1 | ARD-018 |
| ADM-02 | Fraud/abuse monitoring hooks | P1 | ARD-018 |
| ADM-03 | Real-time admin via EMQX | P1 | ARD-018, ARD-015 |

## Store-first addendum (see store-first-evolution.md)

| ID | Requirement | Priority | Primary ARD |
| --- | --- | --- | --- |
| SF-10..13 | Store URL, branding, QR, store PWA | P0 | ARD-010, 029, 033 |
| CUST-01..03 | Customer OTP + portal views | P0 | ARD-030, 035 |
| MEM-01..02 | Store membership first-class | P0 | ARD-031 |
| LOC-01..02 | Geo + map/nav | P0 | ARD-004, 032 |
| ORD-10..12 | Pickup-only + lifecycle | P0 | ARD-011, 034 |
