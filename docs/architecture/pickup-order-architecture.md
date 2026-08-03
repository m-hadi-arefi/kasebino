# Pickup Order Architecture

## MVP fulfillment

**In-store pickup only.** No delivery addresses, couriers, riders, or shipping methods in UX or domain for MVP.

## Status state machine

```
pending_payment
    → paid → preparing → ready_for_pickup → picked_up → completed
    → cancelled

paid | preparing | ready_for_pickup
    → cancelled | refunded (policy-gated)
```

| Status | Actor | Notes |
| --- | --- | --- |
| pending_payment | System/customer | After checkout create |
| paid | Payments | Webhook/confirm |
| preparing | Store staff | Ack to prepare |
| ready_for_pickup | Store staff | Notify customer (realtime/push later) |
| picked_up | Store staff / confirm | Customer collected |
| completed | System/staff | Terminal success |
| cancelled | Customer/staff | Rules by status |
| refunded | Staff/admin | After payment |

## Checkout redesign

- Fulfillment selector: **Pickup only** (fixed)  
- Show store address + map + estimated ready guidance  
- No shipping address fields  
- Prefer customer logged-in membership  

## Time policies (ADR-091 defaults)

| Rule | Default |
| --- | --- |
| Unpaid timeout | `pending_payment` → auto-`cancelled` after **30 minutes** |
| Ready hold | `ready_for_pickup` held **24 hours**, then staff cancel + **manual** refund decision |
| No-show | No automatic refund; explicit staff/admin refund action |

## Inventory

Reserve/decrement policy: prefer decrement on `paid` or `preparing` (document in ARD-034); avoid double-sell.

## Events

`OrderCreated`, `OrderPaid`, `OrderPreparing`, `OrderReadyForPickup`, `OrderPickedUp`, `OrderCompleted`, `OrderCanceled`, `OrderRefunded`

(Supersede older `OrderDelivered` for MVP — delivery events out of scope.)

## Related

ARD-011, ARD-034, ARD-012, ARD-015
