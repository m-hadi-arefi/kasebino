# Component Library

## Foundations (shared)

Button, Input, Textarea, Select, Checkbox, Radio, Switch, Dialog, Sheet, Drawer, Tabs, Table, Badge, Toast, DropdownMenu, Popover, Skeleton, Separator, Card (interaction only), Form field.

Source: shadcn/ui under `src/components/ui` (ADR-018 / ADR-019; legacy `src/shared/ui` superseded).

## Domain compositions (modules)

| Component | Module | Notes |
| --- | --- | --- |
| PhoneKeypad | pos / identity | Large digits; paste support |
| BarcodeScanButton | pos | Camera + hardware wedge input |
| ProductSearchBox | pos / catalog | Fuzzy results ≤100ms feel |
| CartPanel | pos | Qty steppers; total sticky |
| CustomerCapture | pos / crm | Required phone |
| ReceiptView | pos | Print/share |
| CustomerProfileHeader | crm | Segment chip |
| WalletBadge | loyalty | Points balance |
| CouponApply | loyalty / pos | |
| StorefrontProductCard | storefront | Interactive container OK |
| OrderStatusTimeline | ordering | |
| MetricStat | analytics | Not on marketing hero |
| MerchantStatusBadge | admin | |

## Rules

- Compositions live with owning module
- No cross-module deep imports of internal primitives — export via module public ui index
- Every component documents props + a11y notes in Storybook-optional; minimum MDX/README not required MVP if ARD checklist covers
