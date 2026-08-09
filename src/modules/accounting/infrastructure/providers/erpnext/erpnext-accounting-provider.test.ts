/**
 * ErpNextAccountingProvider tests — mocked HTTP only (ADR-140).
 */

import { describe, expect, it, vi } from "vitest";
import {
  ErpNextAccountingProvider,
  createErpNextClient,
  loadErpNextProviderConfig,
  mosEventMarker,
  projectItemDoc,
  projectSalesInvoiceDoc,
} from "./index.js";
import type { ErpNextFetch } from "./erpnext-client.js";

const baseConfig = {
  baseUrl: "http://erp.local",
  apiKey: "key",
  apiSecret: "secret",
  company: "MerchantOS Demo",
  warehouse: "Stores - MD",
  costCenter: null,
  priceList: null,
  defaultCustomer: "Cash Customer",
  currency: "IRR",
  timeoutMs: 5000,
  itemGroup: "Products",
  customerGroup: "All Customer Groups",
  territory: "All Territories",
  incomeAccount: null,
  cashAccount: null,
};

function mockFetch(handlers: Record<string, ErpNextFetch>): ErpNextFetch {
  return async (req) => {
    const key = `${req.method} ${req.path}`;
    for (const [pattern, fn] of Object.entries(handlers)) {
      if (key.startsWith(pattern) || key === pattern || req.path.includes(pattern)) {
        return fn(req);
      }
    }
    return { status: 404, json: { exc: `unhandled ${key}` } };
  };
}

describe("ERPNext projectors", () => {
  it("maps piece unit to Nos and marks mos_event", () => {
    const item = projectItemDoc(
      {
        eventId: "e1",
        merchantId: "m1",
        entityType: "product",
        entityId: "p1",
        sku: "SKU-1",
        barcode: "626",
        name: "شیر",
        unitCode: "piece",
        priceAmountMinor: "10000",
      },
      baseConfig,
    );
    expect(item.stock_uom).toBe("Nos");
    expect(item.item_name).toBe("شیر");

    const invoice = projectSalesInvoiceDoc(
      {
        eventId: "e2",
        merchantId: "m1",
        storeId: "s1",
        entityType: "sale",
        entityId: "sale-1",
        saleId: "sale-1",
        idempotencyKey: "idem-1",
        channel: "pos",
        tenderType: "cash",
        totalAmountMinor: "10000",
        currency: "IRR",
        occurredAt: "2026-08-09T10:00:00.000Z",
        lines: [
          {
            productId: "p1",
            quantity: 1,
            unitCode: "piece",
            unitPriceMinor: "10000",
            lineTotalMinor: "10000",
          },
        ],
      },
      baseConfig,
      {
        customerName: "Cash Customer",
        itemCodesByProductId: new Map([["p1", "SKU-1"]]),
      },
    );
    expect(invoice.update_stock).toBe(1);
    expect(String(invoice.remarks)).toContain(mosEventMarker("e2"));
    expect(invoice.is_pos).toBe(1);
  });
});

describe("ErpNextAccountingProvider", () => {
  it("rejects empty sale lines", async () => {
    const client = createErpNextClient(async () => ({ status: 200, json: { data: [] } }));
    const provider = new ErpNextAccountingProvider({ config: baseConfig, client });
    const result = await provider.recordSale({
      eventId: "e",
      merchantId: "m",
      storeId: "s",
      entityType: "sale",
      entityId: "sale",
      saleId: "sale",
      idempotencyKey: "k",
      channel: "pos",
      totalAmountMinor: "0",
      currency: "IRR",
      occurredAt: new Date().toISOString(),
      lines: [],
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("sale_lines_required");
  });

  it("creates and submits Sales Invoice idempotently by po_no", async () => {
    const create = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-SINV-001", docstatus: 0 } },
    }));
    const submit = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-SINV-001", docstatus: 1 } },
    }));
    const listEmpty = vi.fn(async () => ({
      status: 200,
      json: { data: [] },
    }));
    const getCashMissing = vi.fn(async () => ({
      status: 404,
      json: {},
    }));
    const createCash = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "Cash Customer" } },
    }));
    const getInvoice = vi.fn(async () => ({
      status: 200,
      json: { data: { name: "ACC-SINV-001", docstatus: 0 } },
    }));

    let phase: "first" | "second" = "first";
    const fetchImpl: ErpNextFetch = async (req) => {
      const path = decodeURIComponent(req.path);
      if (req.method === "GET" && path.includes("/Sales Invoice") && !path.includes("ACC-")) {
        if (phase === "second") {
          return { status: 200, json: { data: [{ name: "ACC-SINV-001" }] } };
        }
        return listEmpty();
      }
      if (req.method === "GET" && path.endsWith("/Customer/Cash Customer")) {
        return getCashMissing();
      }
      if (req.method === "POST" && path.endsWith("/Customer")) {
        return createCash();
      }
      if (req.method === "POST" && path.endsWith("/Sales Invoice")) {
        return create();
      }
      if (req.method === "GET" && path.includes("/Sales Invoice/ACC-SINV-001")) {
        return getInvoice();
      }
      if (req.method === "POST" && path.includes("frappe.client.submit")) {
        return submit();
      }
      if (req.method === "GET" && path.includes("/Sales Invoice")) {
        return listEmpty();
      }
      return { status: 404, json: { path: req.path } };
    };

    const provider = new ErpNextAccountingProvider({
      config: baseConfig,
      client: createErpNextClient(fetchImpl),
    });

    const saleInput = {
      eventId: "evt-sale-1",
      merchantId: "m1",
      storeId: "s1",
      entityType: "sale" as const,
      entityId: "sale-1",
      saleId: "sale-1",
      idempotencyKey: "idem-sale-1",
      channel: "pos" as const,
      tenderType: "cash",
      totalAmountMinor: "25000",
      currency: "IRR" as const,
      occurredAt: "2026-08-09T12:00:00.000Z",
      lines: [
        {
          productId: "p1",
          quantity: 1,
          unitCode: "piece",
          unitPriceMinor: "25000",
          lineTotalMinor: "25000",
        },
      ],
    };

    const first = await provider.recordSale(saleInput);
    expect(first.ok).toBe(true);
    expect(first.alreadyApplied).toBe(false);
    expect(first.externalId).toBe("ACC-SINV-001");
    expect(create).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledOnce();

    phase = "second";
    const second = await provider.recordSale(saleInput);
    expect(second.alreadyApplied).toBe(true);
    expect(second.externalId).toBe("ACC-SINV-001");
  });

  it("loadErpNextProviderConfig fails closed on missing secrets", () => {
    expect(() =>
      loadErpNextProviderConfig({
        MOS_ERPNEXT_URL: "http://localhost:8080",
      } as NodeJS.ProcessEnv),
    ).toThrow(/MOS_ERPNEXT_API_KEY/);
  });

  it("never exports DocType helpers from application ports path", async () => {
    const ports = await import("../../../application/ports/accounting-provider.js");
    expect("projectItemDoc" in ports).toBe(false);
  });
});

// silence unused in case tree-shaking
void mockFetch;
