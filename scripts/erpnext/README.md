# Local ERPNext (Financial Brain) — ADR-140

MerchantOS **retail UI stays in MerchantOS**. This stack is only the accounting/purchasing engine for accountants and the integration adapter.

## Start

```bash
docker compose -f docker-compose.erpnext.yml up -d
docker compose -f docker-compose.erpnext.yml logs -f create-site
```

First boot takes several minutes (image pull + site install).

Desk: [http://localhost:8080](http://localhost:8080)  
Login: `Administrator` / `admin`

Complete the ERPNext **Setup Wizard** once (Company currency **IRR**).

## Bootstrap API credentials

```bash
npm run erpnext:bootstrap
```

Paste printed `MOS_ERPNEXT_*` lines into `.env`, then:

```bash
npm run worker:outbox
```

## Architecture reminder

```
POS / Storefront / CRM  →  MerchantOS Core  →  Outbox  →  ErpNextAccountingProvider  →  ERPNext
```

Never open Desk as the cashier UI. Never put API secrets in the browser.
