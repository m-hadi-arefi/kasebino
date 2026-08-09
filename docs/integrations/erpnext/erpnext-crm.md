# ERPNext CRM

> Contrast with MerchantOS CRM. Read carefully before mapping customers.

## Purpose (ERPNext)

Pre-sales pipeline: Leads → Opportunities → Quotations → Customer, plus campaigns and activity timelines.

## Main concepts

| Concept | Role |
| --- | --- |
| **Lead** | Unqualified prospect |
| **Opportunity** | Qualified potential deal |
| **Prospect** | Intermediate org construct in some flows |
| **Customer** | Commercial / accounting party |
| **Contact / Address** | People and locations |
| **Campaign / Email Campaign** | Outreach grouping |
| **Appointment / Activities** | Follow-ups |

## Critical product note (upstream)

On current develop docs, **ERPNext CRM is scheduled for removal in version 17**; Frappe recommends **Frappe CRM** for new CRM implementations. Transactional Customer / Selling records remain in ERPNext.

Therefore MerchantOS must **never** depend on ERPNext CRM module internals for retention product value.

## MerchantOS CRM (owned here)

MerchantOS owns the retail CRM experience:

- StoreMembership (store-scoped customer relationship)
- Phone identity (Iranian mobile)
- Visit / purchase history from POS & pickup orders
- Loyalty points wallet
- Segmentation for retention
- Customer PWA portal

### CRM truth vs financial truth

| Truth | System | Fields |
| --- | --- | --- |
| Who the customer is for engagement | MerchantOS | phone, membership, segments, loyalty |
| Who the party is for AR/credit | ERPNext Customer | receivable account, credit limit, outstanding |

Sync: **M → E** create/update ERP Customer projection keyed by mapping. Outstanding balances **E → M** (future read ACL only).

Do not:

- Build pipeline UI on ERPNext Lead/Opportunity for MOS MVP
- Mirror loyalty points into ERPNext Loyalty Program by default (MOS owns loyalty)
- Treat ERP Customer as membership SoT

## Related docs

- ADR-131 Customer Mapping
- [domain-boundary-analysis.md](./domain-boundary-analysis.md)
