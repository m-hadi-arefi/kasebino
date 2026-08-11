import { createErpNextAccountingProviderFromEnv } from "../src/modules/accounting/infrastructure/providers/erpnext/erpnext-accounting-provider.js";

async function testSync() {
  const provider = createErpNextAccountingProviderFromEnv(process.env);

  const timestamp = Date.now();
  const testProduct = {
    merchantId: "00000000-0000-0000-0000-000000000001",
    entityType: "product",
    entityId: "prod-" + timestamp,
    eventId: "evt-prod-" + timestamp,
    sku: "SKU-TEST-" + timestamp,
    barcode: String(timestamp),
    name: "محصول تست کاسبینو " + timestamp,
    unitCode: "piece",
    priceAmountMinor: "1500000", // 150,000 Toman = 1,500,000 Rial
  };

  console.log("1. Syncing Product to ERPNext:", testProduct.sku);
  const result = await provider.syncProduct(testProduct);
  console.log("   -> ERPNext Item Result:", JSON.stringify(result, null, 2));

  const testSale = {
    merchantId: "00000000-0000-0000-0000-000000000001",
    storeId: "00000000-0000-0000-0000-000000000002",
    entityType: "sale",
    entityId: "sale-" + timestamp,
    saleId: "sale-" + timestamp,
    eventId: "evt-sale-" + timestamp,
    idempotencyKey: "idem-" + timestamp,
    channel: "pos" as const,
    tenderType: "cash",
    totalAmountMinor: "1500000",
    currency: "IRR" as const,
    lines: [
      {
        productId: testProduct.sku, // itemCode in ERPNext
        quantity: 1,
        unitCode: "piece",
        unitPriceMinor: "1500000",
        lineTotalMinor: "1500000",
      },
    ],
    occurredAt: new Date().toISOString(),
  };

  console.log("2. Recording Sale (Sales Invoice) to ERPNext:", testSale.saleId);
  const saleResult = await provider.recordSale(testSale);
  console.log("   -> ERPNext Sales Invoice Result:", JSON.stringify(saleResult, null, 2));
}

testSync().catch(console.error);
