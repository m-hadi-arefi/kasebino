# User Journeys (Updated)

**Assumption:** All merchant and customer journey UIs are **Persian + RTL**. Dates Jalali; money تومان; identity via Iranian mobile SMS OTP.

## J1 — Merchant first activation

1. Merchant registers via phone OTP  
2. Creates store with **mandatory location** (address, lat, lng)  
3. Configures branding + sees storefront URL + QR  
4. Adds products  
5. Completes first POS sale with customer phone → membership  
6. Activation complete  

## J2 — Peak-hour POS checkout

Unchanged speed goals; phone capture creates/links **store membership**; receipt available to customer PWA.

## J3 — Returning customer loyalty (in-store)

Customer member; points visible to staff and in customer PWA; redeem at POS.

## J4 — Customer storefront pickup order

1. Open store URL or scan QR  
2. Optionally install store PWA  
3. Customer OTP login  
4. Browse catalog → checkout as **In-Store Pickup**  
5. Pay → `Paid` → store prepares → `ReadyForPickup`  
6. Customer navigates to store via map → picks up → `PickedUp`/`Completed`  
7. Points/history/receipt in customer dashboard  

**No delivery option in MVP.**

## J5 — Customer membership home

1. Open store PWA  
2. View profile, points, rewards, purchase history, receipts  
3. Reorder pickup or navigate to store  

## J6 — Retention analytics (merchant)

Unchanged North Star focus; add membership + QR/PWA acquisition funnels when analytics ARDs land.

## J7 — Platform admin

Unchanged; plus ability to inspect storefront/PWA health if exposed.
