# Growth Loop — QR Acquisition

## Loop

```
Merchant prints store QR (counter / window / receipt)
    → Customer scans → Storefront / install prompt / OTP join
        → MembershipCreated
            → First purchase (POS or pickup)
                → Loyalty loop engages
```

## Instruments

| Step | Event / Metric |
| --- | --- |
| QR generated/printed | `StoreQrGenerated` |
| Scan land | `StorefrontVisited` with `utm=qr` / `source=qr` |
| Install | `StorePwaInstalled` |
| Join | `MembershipCreated` source=`qr` |
| Conversion | First `SaleCompleted` or pickup `Order` paid |

## Design rules

- QR encodes stable store deep link (URL)  
- Landing must be mobile-first, ≤ friction OTP  
- Analytics must attribute `source=qr`  

## Related ARDs

ARD-033, ARD-010, ARD-029, ARD-030, ARD-031
