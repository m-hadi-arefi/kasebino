/**
 * ErpNextAccountingProvider — live Frappe REST adapter (ADR-140).
 */

import type {
  AccountingProvider,
  AccountingSyncResult,
  RecordInventoryAdjustmentInput,
  RecordPaymentInput,
  RecordSaleInput,
  SyncCustomerInput,
  SyncProductInput,
} from "../../../application/ports/accounting-provider.js";
import {
  createErpNextClient,
  createErpNextFetch,
  mosEventMarker,
  type ErpNextClient,
  type ErpNextClientConfig,
} from "./erpnext-client.js";
import {
  loadErpNextProviderConfig,
  type ErpNextProviderConfig,
} from "./erpnext-config.js";
import {
  customerDocName,
  projectCustomerDoc,
  projectItemDoc,
  projectPaymentEntryDoc,
  projectSalesInvoiceDoc,
  projectStockEntryDoc,
} from "./projectors.js";

export type ErpNextAccountingProviderDeps = {
  config: ErpNextProviderConfig;
  client: ErpNextClient;
  /** Optional lookup of prior MOS↔ERP ids (entityType+entityId → externalId). */
  resolveExternalId?: (input: {
    entityType: string;
    entityId: string;
  }) => Promise<string | null>;
  /** Optional multi-tenant resolver & connection manager. */
  tenantResolver?: import("./tenant-resolver.js").ErpNextTenantResolver;
  connectionManager?: import("./connection-manager.js").ErpNextConnectionManager;
};

async function findByEventMarker(
  client: ErpNextClient,
  doctype: string,
  field: string,
  eventId: string,
): Promise<string | null> {
  const marker = mosEventMarker(eventId);
  const rows = await client.getList(doctype, {
    fields: ["name", field],
    filters: [[field, "like", `%${marker}%`]],
    limit: 1,
  });
  const name = rows[0]?.name;
  return typeof name === "string" ? name : null;
}

function ok(externalId: string, alreadyApplied: boolean): AccountingSyncResult {
  return { ok: true, externalId, alreadyApplied };
}

export class ErpNextAccountingProvider implements AccountingProvider {
  readonly providerId = "erpnext";
  private readonly config: ErpNextProviderConfig;
  private readonly client: ErpNextClient;
  private readonly resolveExternalId?: ErpNextAccountingProviderDeps["resolveExternalId"] | undefined;
  private readonly tenantResolver?: import("./tenant-resolver.js").ErpNextTenantResolver | undefined;
  private readonly connectionManager?: import("./connection-manager.js").ErpNextConnectionManager | undefined;

  constructor(deps: ErpNextAccountingProviderDeps) {
    this.config = deps.config;
    this.client = deps.client;
    this.resolveExternalId = deps.resolveExternalId;
    this.tenantResolver = deps.tenantResolver;
    this.connectionManager = deps.connectionManager;
  }

  private async resolveClientAndConfig(merchantId?: string, storeId?: string) {
    if (merchantId && this.tenantResolver && this.connectionManager) {
      try {
        const inputObj = storeId ? { merchantId, storeId } : { merchantId };
        const tenant = await this.tenantResolver.resolveTenantContext(inputObj);
        const client = this.connectionManager.getClientForTenant(tenant);
        const tenantConfig: ErpNextProviderConfig = {
          ...this.config,
          baseUrl: tenant.erpnextSiteUrl,
          company: tenant.erpnextCompany,
          warehouse: tenant.storeWarehouse || tenant.defaultWarehouse,
          apiKey: tenant.apiKey || this.config.apiKey,
          apiSecret: tenant.apiSecret || this.config.apiSecret,
        };
        return { client, config: tenantConfig };
      } catch {
        // Fall back to default client & config
      }
    }
    return { client: this.client, config: this.config };
  }

  async syncProduct(input: SyncProductInput): Promise<AccountingSyncResult> {
    const itemCode = input.sku || input.entityId;
    const disabled = Boolean(input.disabled);
    const existingMapped = await this.resolveExternalId?.({
      entityType: "product",
      entityId: input.entityId,
    });
    if (existingMapped) {
      await this.client.updateDoc("Item", existingMapped, {
        item_name: input.name,
        disabled: disabled ? 1 : 0,
        ...(input.barcode
          ? { barcodes: [{ barcode: input.barcode, barcode_type: "" }] }
          : {}),
      });
      return ok(existingMapped, true);
    }

    const existing = await this.client.getDoc("Item", itemCode);
    if (existing) {
      await this.client.updateDoc("Item", itemCode, {
        item_name: input.name,
        disabled: disabled ? 1 : 0,
      });
      return ok(itemCode, true);
    }

    const created = await this.client.createDoc(
      "Item",
      projectItemDoc(input, this.config, { disabled }),
    );
    const name = String(created.name ?? itemCode);
    if (this.config.priceList && input.priceAmountMinor) {
      try {
        await this.client.createDoc("Item Price", {
          item_code: name,
          price_list: this.config.priceList,
          price_list_rate: Number(input.priceAmountMinor),
          currency: this.config.currency,
        });
      } catch {
        // Price list may not exist yet in fresh sites — item sync still succeeds.
      }
    }
    return ok(name, false);
  }

  async syncCustomer(input: SyncCustomerInput): Promise<AccountingSyncResult> {
    const label = customerDocName(input.entityId);
    const existingMapped = await this.resolveExternalId?.({
      entityType: "customer",
      entityId: input.entityId,
    });
    if (existingMapped) {
      await this.client.updateDoc("Customer", existingMapped, {
        mobile_no: input.phoneNational ?? undefined,
      });
      return ok(existingMapped, true);
    }

    const byLabel = await this.client.getList("Customer", {
      fields: ["name", "customer_name"],
      filters: [["customer_name", "=", input.displayName?.trim() || label]],
      limit: 1,
    });
    if (byLabel[0]?.name) {
      const name = String(byLabel[0].name);
      await this.client.updateDoc("Customer", name, {
        mobile_no: input.phoneNational ?? undefined,
      });
      return ok(name, true);
    }

    const created = await this.client.createDoc(
      "Customer",
      projectCustomerDoc(input, this.config),
    );
    return ok(String(created.name ?? label), false);
  }

  async recordSale(input: RecordSaleInput): Promise<AccountingSyncResult> {
    if (input.lines.length === 0) {
      return {
        ok: false,
        externalId: null,
        alreadyApplied: false,
        message: "sale_lines_required",
      };
    }

    const mapped = await this.resolveExternalId?.({
      entityType: input.channel === "online" ? "order" : "sale",
      entityId: input.saleId,
    });
    if (mapped) {
      return ok(mapped, true);
    }

    const byMarker = await findByEventMarker(
      this.client,
      "Sales Invoice",
      "remarks",
      input.eventId,
    );
    if (byMarker) {
      return ok(byMarker, true);
    }

    const byPo = await this.client.getList("Sales Invoice", {
      fields: ["name"],
      filters: [["po_no", "=", input.saleId]],
      limit: 1,
    });
    if (byPo[0]?.name) {
      return ok(String(byPo[0].name), true);
    }

    const customerName = this.config.defaultCustomer;
    const itemCodes = new Map<string, string>();
    for (const line of input.lines) {
      const mappedItem = await this.resolveExternalId?.({
        entityType: "product",
        entityId: line.productId,
      });
      itemCodes.set(line.productId, mappedItem ?? line.productId);
    }

    // Ensure cash/default customer exists.
    const cash = await this.client.getDoc("Customer", customerName);
    if (!cash) {
      await this.client.createDoc("Customer", {
        customer_name: customerName,
        customer_type: "Individual",
        customer_group: this.config.customerGroup,
        territory: this.config.territory,
      });
    }

    const draft = await this.client.createDoc(
      "Sales Invoice",
      projectSalesInvoiceDoc(input, this.config, {
        customerName,
        itemCodesByProductId: itemCodes,
      }),
    );
    const draftName = String(draft.name);
    const submitted = await this.client.submitDoc("Sales Invoice", draftName);
    return ok(String(submitted.name ?? draftName), false);
  }

  async recordPayment(input: RecordPaymentInput): Promise<AccountingSyncResult> {
    const mapped = await this.resolveExternalId?.({
      entityType: "payment",
      entityId: input.paymentId,
    });
    if (mapped) {
      return ok(mapped, true);
    }

    const byMarker = await findByEventMarker(
      this.client,
      "Payment Entry",
      "remarks",
      input.eventId,
    );
    if (byMarker) {
      return ok(byMarker, true);
    }

    const invoiceName =
      (await this.resolveExternalId?.({
        entityType: "order",
        entityId: input.orderId,
      })) ?? null;

    const draft = await this.client.createDoc(
      "Payment Entry",
      projectPaymentEntryDoc(input, this.config, {
        customerName: this.config.defaultCustomer,
        invoiceName,
      }),
    );
    const name = String(draft.name);
    const submitted = await this.client.submitDoc("Payment Entry", name);
    return ok(String(submitted.name ?? name), false);
  }

  async recordInventoryAdjustment(
    input: RecordInventoryAdjustmentInput,
  ): Promise<AccountingSyncResult> {
    if (input.quantityDelta === 0) {
      return {
        ok: true,
        externalId: null,
        alreadyApplied: true,
        message: "zero_delta",
      };
    }

    const mapped = await this.resolveExternalId?.({
      entityType: "stock_adjustment",
      entityId: input.entityId,
    });
    if (mapped) {
      return ok(mapped, true);
    }

    const byMarker = await findByEventMarker(
      this.client,
      "Stock Entry",
      "remarks",
      input.eventId,
    );
    if (byMarker) {
      return ok(byMarker, true);
    }

    const itemCode =
      (await this.resolveExternalId?.({
        entityType: "product",
        entityId: input.productId,
      })) ?? input.productId;

    const draft = await this.client.createDoc(
      "Stock Entry",
      projectStockEntryDoc(input, this.config, itemCode),
    );
    const name = String(draft.name);
    const submitted = await this.client.submitDoc("Stock Entry", name);
    return ok(String(submitted.name ?? name), false);
  }

  async recordPurchase(): Promise<AccountingSyncResult> {
    return {
      ok: false,
      externalId: null,
      alreadyApplied: false,
      message: "purchase_erp_first_unsupported_in_mos",
    };
  }

  async recordReturn(): Promise<AccountingSyncResult> {
    return {
      ok: false,
      externalId: null,
      alreadyApplied: false,
      message: "return_unsupported",
    };
  }
}

export function createErpNextAccountingProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  overrides?: {
    fetchImpl?: typeof fetch;
    resolveExternalId?: ErpNextAccountingProviderDeps["resolveExternalId"];
    tenantResolver?: import("./tenant-resolver.js").ErpNextTenantResolver;
    connectionManager?: import("./connection-manager.js").ErpNextConnectionManager;
  },
): ErpNextAccountingProvider {
  const config = loadErpNextProviderConfig(env);
  const clientConfig: ErpNextClientConfig = {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    timeoutMs: config.timeoutMs,
    ...(overrides?.fetchImpl ? { fetchImpl: overrides.fetchImpl } : {}),
  };
  const client = createErpNextClient(createErpNextFetch(clientConfig));
  return new ErpNextAccountingProvider({
    config,
    client,
    ...(overrides?.resolveExternalId
      ? { resolveExternalId: overrides.resolveExternalId }
      : {}),
    ...(overrides?.tenantResolver
      ? { tenantResolver: overrides.tenantResolver }
      : {}),
    ...(overrides?.connectionManager
      ? { connectionManager: overrides.connectionManager }
      : {}),
  });
}
