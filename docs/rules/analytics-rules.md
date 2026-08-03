# Analytics Rules

1. Every feature ARD must declare **analytics events** it emits (or explicitly N/A).
2. Distinguish OLTP merchant analytics (ARD-016) from product/platform analytics (MongoDB ARDs).
3. Funnel-critical storefront/POS UX events are 100% sampled.
4. Do not put secrets (OTP, JWT, payment raw) in analytics properties.
5. Prefer stable `featureKey` strings.
6. Dashboard money metrics that claim “truth” must reconcile to PostgreSQL projections.
7. Instrument activation funnel end-to-end across ARDs 002–007.
8. Schema changes bump `schemaVersion` and update docs.
9. Read `analytics-architecture.md` before planning implementation.
10. Management metrics for admins live under ARD-025 patterns, not merchant overview alone.
11. Merchant/admin-facing analytics UI uses Persian labels and Jalali/`Asia/Tehran` ranges (`iranian-first-development.md`).
