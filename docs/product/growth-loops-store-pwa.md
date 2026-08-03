# Growth Loop — Store PWA

## Loop

```
Visit storefront (URL/QR)
    → Add to Home Screen / install store PWA
        → Home-screen reopen (high intent)
            → Browse + pickup order OR visit store for POS
                → Membership + loyalty deepen
```

## Instruments

| Step | Event / Metric |
| --- | --- |
| Installable offered | `StorePwaInstallPromptShown` |
| Installed | `StorePwaInstalled` |
| Launch from home | `AppOpened` source=`store-pwa` |
| Order / visit | Order funnel or POS capture |

## Design rules

- **Per-store** manifest (name, icons, theme, start_url)  
- Distinct from merchant staff POS PWA (ARD-017 staff app)  
- Offline: catalog browse stretch; auth/order need network for MVP  

## Related ARDs

ARD-029, ARD-010, ARD-027, ARD-035
