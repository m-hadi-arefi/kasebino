# PWA Experience

## Two installable experiences

1. **Staff PWA** — POS/offline (ARD-017)  
2. **Store PWA** — per-store branded customer app (ARD-029)  

## Installability (store PWA)

- Manifest name = store display name  
- Icons from store branding  
- Standalone display; theme from store tokens  
- start_url = store storefront  

## Offline UX

- Staff: Online / Offline banner; queued sales  
- Store customer: online-first for auth/orders; catalog cache optional  

## Updates

- Prompt on new SW version; don't break mid-checkout — defer reload until idle  
