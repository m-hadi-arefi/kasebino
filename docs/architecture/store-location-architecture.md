# Store Location Architecture

## Mandatory fields

| Field | Rule |
| --- | --- |
| addressLine1 / city / … | Required structured address |
| displayAddress | Human string |
| latitude | Required, WGS84 |
| longitude | Required, WGS84 |
| geo validation | Lat ∈ [-90,90], lng ∈ [-180,180] |

Store cannot complete activation for public storefront without geo.

## Presentation

- Storefront shows a **static map image** (provider adapter; cached) with pin at store lat/lng  
- **Navigate** opens external maps deep link (`geo:` / Google / Neshan / Apple Maps URL as available)  
- Interactive map embed is **not** required in MVP (ADR-091)

## Privacy

Merchant-provided public location; not customer tracking.

## Related

ARD-004, ARD-032, SF-04, LOC-*
