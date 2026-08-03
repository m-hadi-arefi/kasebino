# QR Acquisition Architecture

## Purpose

Physical QR codes convert foot traffic into owned digital memberships.

## Artifact

- QR payload = canonical storefront URL with `src=qr` (and optional campaign id)  
- PNG/SVG printable via merchant dashboard  
- Regenerating QR should keep stable URL (QR image may version for branding)  

## Flow

Scan → storefront land → OTP join / browse → membership → purchase (POS or pickup)

## Analytics

Attribute: `StorefrontVisited`, `MembershipCreated`, install events with `source=qr`.

## Security

- No secrets in QR  
- Rate-limit join OTP  
- Store must be active  

## Related

ARD-033; growth-loops-qr.md
