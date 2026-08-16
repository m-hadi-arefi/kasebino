import { randomUUID } from "node:crypto";
import { normalizeIranianMobile } from "../../../shared/domain/iranian-phone.js";
import type { ExternalEntityMappingRepository } from "../../accounting/domain/external-entity-mapping.js";
import type { AccountingProvider } from "../../accounting/application/ports/accounting-provider.js";
import type { FinanceReader } from "../../erpnext/application/ports.js";
import type { SaleRepository } from "../../pos/domain/repositories.js";
import type {
  CrmTag,
  CrmTagRepository,
  Customer,
  CustomerFollowUp,
  CustomerFollowUpRepository,
  CustomerInteraction,
  CustomerInteractionRepository,
  CustomerNote,
  CustomerNoteRepository,
  CustomerRepository,
  CustomerStatus,
  CustomerType,
  FollowUpStatus,
  InteractionType,
  MembershipEngagementStats,
  PreferredContactMethod,
  TimelineEvent,
} from "../domain/index.js";
import {
  computeEngagementStats,
  createCrmTagAggregate,
  createCustomerAggregate,
  createCustomerFollowUpAggregate,
  createCustomerInteractionAggregate,
  createCustomerNoteAggregate,
  mergeTimelineEvents,
  updateCustomerStatus,
} from "../domain/index.js";
import { CrmDomainError } from "./errors.js";

export type CustomerUseCaseDeps = {
  customers: CustomerRepository;
  tags: CrmTagRepository;
  notes: CustomerNoteRepository;
  interactions: CustomerInteractionRepository;
  followUps: CustomerFollowUpRepository;
  sales: SaleRepository;
  financeReader: FinanceReader;
  accountingProvider?: AccountingProvider;
  mappings?: ExternalEntityMappingRepository;
  now?: () => Date;
  idFactory?: () => string;
};

export type CreateCustomerInput = {
  merchantId: string;
  storeId?: string | null;
  phone: string;
  displayName: string;
  email?: string | null;
  birthday?: Date | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  customerType?: CustomerType;
  preferredContactMethod?: PreferredContactMethod;
  notes?: string | null;
};

export type UpdateCustomerInput = {
  merchantId: string;
  customerId: string;
  displayName?: string;
  email?: string | null;
  birthday?: Date | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  customerType?: CustomerType;
  status?: CustomerStatus;
  preferredContactMethod?: PreferredContactMethod;
  notes?: string | null;
};

export type Customer360Result = {
  customer: Customer;
  tags: CrmTag[];
  notes: CustomerNote[];
  interactions: CustomerInteraction[];
  followUps: CustomerFollowUp[];
  engagement: MembershipEngagementStats;
  financials: {
    source: "erpnext" | "fake" | "unavailable";
    outstanding: { amountMinor: string; displayToman: string; currency: "IRR" };
    creditStatusFa: string;
    invoices: Array<{
      externalId: string;
      status: string;
      grandTotal: { amountMinor: string; displayToman: string; currency: "IRR" };
      outstanding: { amountMinor: string; displayToman: string; currency: "IRR" };
      postingDate: string | null;
    }>;
    payments: Array<{
      externalId: string;
      amount: { amountMinor: string; displayToman: string; currency: "IRR" };
      postingDate: string | null;
    }>;
  };
  erpnextMapping: { externalId: string | null; synced: boolean };
};

export function createCustomerUseCases(deps: CustomerUseCaseDeps) {
  const now = deps.now ?? (() => new Date());
  const idFactory = deps.idFactory ?? (() => randomUUID());

  function requireTenant(merchantId: string): string {
    const m = merchantId.trim();
    if (!m) throw new CrmDomainError("INVALID_MERCHANT");
    return m;
  }

  function requirePhone(raw: string) {
    const res = normalizeIranianMobile(raw);
    if (!res.ok) throw new CrmDomainError("INVALID_PHONE");
    return res.phone;
  }

  async function syncToErpNext(customer: Customer): Promise<string | null> {
    if (!deps.accountingProvider) return null;
    try {
      const res = await deps.accountingProvider.syncCustomer({
        merchantId: customer.merchantId,
        storeId: customer.storeId,
        entityType: "customer",
        entityId: customer.id,
        eventId: idFactory(),
        phoneNational: customer.phoneNational,
        displayName: customer.displayName,
      });
      return res.externalId ?? null;
    } catch {
      return null;
    }
  }

  async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const merchantId = requireTenant(input.merchantId);
    const phone = requirePhone(input.phone);

    const existing = await deps.customers.findByPhone(
      merchantId,
      phone.national,
    );
    if (existing) {
      throw new CrmDomainError("DUPLICATE_CUSTOMER");
    }

    const customer = createCustomerAggregate({
      id: idFactory(),
      merchantId,
      storeId: input.storeId ?? null,
      phoneNational: phone.national,
      phoneE164: phone.e164,
      displayName: input.displayName,
      email: input.email ?? null,
      birthday: input.birthday ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      postalCode: input.postalCode ?? null,
      ...(input.customerType !== undefined ? { customerType: input.customerType } : {}),
      ...(input.preferredContactMethod !== undefined ? { preferredContactMethod: input.preferredContactMethod } : {}),
      notes: input.notes ?? null,
      now: now(),
    });

    await deps.customers.save(customer);

    // Idempotent ERPNext Customer Provisioning
    await syncToErpNext(customer);

    return customer;
  }

  async function updateCustomer(input: UpdateCustomerInput): Promise<Customer> {
    const merchantId = requireTenant(input.merchantId);
    const customer = await deps.customers.findById(input.customerId, merchantId);
    if (!customer) throw new CrmDomainError("CUSTOMER_NOT_FOUND");

    const at = now();
    if (input.displayName) customer.displayName = input.displayName.trim();
    if (input.email !== undefined)
      customer.email = input.email ? input.email.trim().toLowerCase() : null;
    if (input.birthday !== undefined) customer.birthday = input.birthday;
    if (input.address !== undefined) customer.address = input.address;
    if (input.city !== undefined) customer.city = input.city;
    if (input.postalCode !== undefined) customer.postalCode = input.postalCode;
    if (input.customerType) customer.customerType = input.customerType;
    if (input.preferredContactMethod)
      customer.preferredContactMethod = input.preferredContactMethod;
    if (input.notes !== undefined) customer.notes = input.notes;

    if (input.status) {
      updateCustomerStatus(customer, input.status, at);
    } else {
      customer.updatedAt = at;
    }

    await deps.customers.update(customer);

    // Sync updated identity fields
    await syncToErpNext(customer);

    return customer;
  }

  async function archiveCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<Customer> {
    const m = requireTenant(merchantId);
    const customer = await deps.customers.findById(customerId, m);
    if (!customer) throw new CrmDomainError("CUSTOMER_NOT_FOUND");

    updateCustomerStatus(customer, "archived", now());
    await deps.customers.update(customer);
    return customer;
  }

  async function restoreCustomer(
    customerId: string,
    merchantId: string,
  ): Promise<Customer> {
    const m = requireTenant(merchantId);
    const customer = await deps.customers.findById(customerId, m);
    if (!customer) throw new CrmDomainError("CUSTOMER_NOT_FOUND");

    updateCustomerStatus(customer, "active", now());
    await deps.customers.update(customer);
    return customer;
  }

  async function getCustomer360(
    customerId: string,
    merchantId: string,
  ): Promise<Customer360Result> {
    const m = requireTenant(merchantId);
    const customer = await deps.customers.findById(customerId, m);
    if (!customer) throw new CrmDomainError("CUSTOMER_NOT_FOUND");

    const [tagsList, notesList, interactionsList, followUpsList, salesList, financials] =
      await Promise.all([
        deps.tags.getTagsForCustomer(customer.id),
        deps.notes.listByCustomer(customer.id, m),
        deps.interactions.listByCustomer(customer.id, m),
        deps.followUps.listByCustomer(customer.id, m),
        deps.sales.listCompletedByStoreId(customer.storeId ?? ""),
        deps.financeReader.getCustomerFinancialOverview({
          merchantId: m,
          customerId: customer.id,
        }),
      ]);

    const completedSales = salesList
      .filter((s) => s.completedAt !== null)
      .map((s) => ({
        completedAt: s.completedAt!,
        totalAmountMinor: s.totalAmountMinor,
      }));

    const outstandingMinor = BigInt(financials.outstanding.amountMinor || "0");

    const engagement = computeEngagementStats({
      completedSales,
      outstandingBalanceMinor: outstandingMinor,
      now: now(),
    });

    let externalId: string | null = null;
    let synced = false;

    if (deps.mappings) {
      const mapping = await deps.mappings.findByInternal({
        merchantId: m,
        provider: "erpnext",
        entityType: "customer",
        entityId: customer.id,
      });

      if (mapping) {
        externalId = mapping.externalId;
        synced = true;
      }
    }

    return {
      customer,
      tags: tagsList,
      notes: notesList,
      interactions: interactionsList,
      followUps: followUpsList,
      engagement,
      financials,
      erpnextMapping: { externalId, synced },
    };
  }

  async function listCustomers(filter: {
    merchantId: string;
    storeId?: string;
    search?: string;
    status?: CustomerStatus;
    customerType?: CustomerType;
    tagId?: string;
    limit?: number;
    offset?: number;
  }) {
    const m = requireTenant(filter.merchantId);
    return deps.customers.list({ ...filter, merchantId: m });
  }

  // Notes Use Cases
  async function addNote(input: {
    merchantId: string;
    customerId: string;
    authorId: string;
    authorName: string;
    content: string;
    isPrivate?: boolean;
  }): Promise<CustomerNote> {
    const m = requireTenant(input.merchantId);
    const note = createCustomerNoteAggregate({
      id: idFactory(),
      merchantId: m,
      customerId: input.customerId,
      authorId: input.authorId,
      authorName: input.authorName,
      content: input.content,
      ...(input.isPrivate !== undefined ? { isPrivate: input.isPrivate } : {}),
      now: now(),
    });
    await deps.notes.save(note);
    return note;
  }

  async function deleteNote(
    noteId: string,
    merchantId: string,
  ): Promise<void> {
    const m = requireTenant(merchantId);
    await deps.notes.delete(noteId, m);
  }

  // Tags Use Cases
  async function createTag(input: {
    merchantId: string;
    name: string;
    color?: string;
  }): Promise<CrmTag> {
    const m = requireTenant(input.merchantId);
    const tag = createCrmTagAggregate({
      id: idFactory(),
      merchantId: m,
      name: input.name,
      ...(input.color !== undefined ? { color: input.color } : {}),
      now: now(),
    });
    await deps.tags.save(tag);
    return tag;
  }

  async function assignTag(input: {
    merchantId: string;
    customerId: string;
    tagId: string;
  }): Promise<void> {
    const m = requireTenant(input.merchantId);
    await deps.tags.assignTag({
      id: idFactory(),
      merchantId: m,
      customerId: input.customerId,
      tagId: input.tagId,
      createdAt: now(),
    });
  }

  async function removeTag(input: {
    merchantId: string;
    customerId: string;
    tagId: string;
  }): Promise<void> {
    requireTenant(input.merchantId);
    await deps.tags.removeTag(input.customerId, input.tagId);
  }

  async function listTags(merchantId: string): Promise<CrmTag[]> {
    const m = requireTenant(merchantId);
    return deps.tags.listByMerchant(m);
  }

  // Interactions & Follow-Ups Use Cases
  async function logInteraction(input: {
    merchantId: string;
    customerId: string;
    storeId?: string | null;
    staffId: string;
    staffName: string;
    type: InteractionType;
    description: string;
    interactionDate?: Date;
    followUpDate?: Date | null;
  }): Promise<CustomerInteraction> {
    const m = requireTenant(input.merchantId);
    const interaction = createCustomerInteractionAggregate({
      id: idFactory(),
      merchantId: m,
      customerId: input.customerId,
      storeId: input.storeId ?? null,
      staffId: input.staffId,
      staffName: input.staffName,
      type: input.type,
      description: input.description,
      ...(input.interactionDate !== undefined ? { interactionDate: input.interactionDate } : {}),
      followUpDate: input.followUpDate ?? null,
      now: now(),
    });
    await deps.interactions.save(interaction);
    return interaction;
  }

  async function createFollowUp(input: {
    merchantId: string;
    customerId: string;
    storeId?: string | null;
    assigneeId: string;
    assigneeName: string;
    description: string;
    dueDate: Date;
  }): Promise<CustomerFollowUp> {
    const m = requireTenant(input.merchantId);
    const followUp = createCustomerFollowUpAggregate({
      id: idFactory(),
      merchantId: m,
      customerId: input.customerId,
      storeId: input.storeId ?? null,
      assigneeId: input.assigneeId,
      assigneeName: input.assigneeName,
      description: input.description,
      dueDate: input.dueDate,
      now: now(),
    });
    await deps.followUps.save(followUp);
    return followUp;
  }

  async function updateFollowUpStatus(input: {
    merchantId: string;
    followUpId: string;
    status: FollowUpStatus;
  }): Promise<void> {
    const m = requireTenant(input.merchantId);
    await deps.followUps.updateStatus(input.followUpId, m, input.status);
  }

  async function getCustomerTimeline(
    customerId: string,
    merchantId: string,
  ): Promise<TimelineEvent[]> {
    const m = requireTenant(merchantId);
    const customer = await deps.customers.findById(customerId, m);
    if (!customer) throw new CrmDomainError("CUSTOMER_NOT_FOUND");

    const [notesList, interactionsList, followUpsList, financials] =
      await Promise.all([
        deps.notes.listByCustomer(customerId, m),
        deps.interactions.listByCustomer(customerId, m),
        deps.followUps.listByCustomer(customerId, m),
        deps.financeReader.getCustomerFinancialOverview({
          merchantId: m,
          customerId,
        }),
      ]);

    const crmEvents: TimelineEvent[] = [
      {
        id: `created-${customer.id}`,
        category: "CRM",
        type: "CustomerCreated",
        titleFa: "ثبت مشتری در کاسبینو",
        descriptionFa: `نام: ${customer.displayName}`,
        occurredAt: customer.createdAt,
      },
      ...notesList.map(
        (n): TimelineEvent => ({
          id: n.id,
          category: "CRM",
          type: "NoteAdded",
          titleFa: "یادداشت جدید ثبت شد",
          descriptionFa: n.content,
          occurredAt: n.createdAt,
          actorName: n.authorName,
        }),
      ),
      ...interactionsList.map(
        (i): TimelineEvent => ({
          id: i.id,
          category: "CRM",
          type: "InteractionLogged",
          titleFa: `تعامل ثبت شد: ${i.type}`,
          descriptionFa: i.description,
          occurredAt: i.interactionDate,
          actorName: i.staffName,
        }),
      ),
      ...followUpsList.map(
        (f): TimelineEvent => ({
          id: f.id,
          category: "CRM",
          type:
            f.status === "DONE" ? "FollowUpCompleted" : "FollowUpCreated",
          titleFa:
            f.status === "DONE"
              ? "پیگیری انجام شد"
              : "پیگیری جدید تعریف شد",
          descriptionFa: f.description,
          occurredAt: f.createdAt,
          actorName: f.assigneeName,
        }),
      ),
    ];

    const financialEvents: TimelineEvent[] = [
      ...financials.invoices.map(
        (inv): TimelineEvent => ({
          id: `inv-${inv.externalId}`,
          category: "FINANCIAL",
          type: "InvoiceCreated",
          titleFa: `فاکتور فروش ERPNext`,
          descriptionFa: `مبلغ کل: ${inv.grandTotal.displayToman}`,
          occurredAt: inv.postingDate ? new Date(inv.postingDate) : new Date(),
          documentRef: inv.externalId,
        }),
      ),
      ...financials.payments.map(
        (pay): TimelineEvent => ({
          id: `pay-${pay.externalId}`,
          category: "FINANCIAL",
          type: "PaymentReceived",
          titleFa: `دریافت وجه ERPNext`,
          descriptionFa: `مبلغ پرداختی: ${pay.amount.displayToman}`,
          occurredAt: pay.postingDate ? new Date(pay.postingDate) : new Date(),
          documentRef: pay.externalId,
        }),
      ),
    ];

    return mergeTimelineEvents(crmEvents, financialEvents);
  }

  async function getCrmDashboardMetrics(merchantId: string) {
    const m = requireTenant(merchantId);
    const { items: allCustomers, total } = await deps.customers.list({
      merchantId: m,
      limit: 1000,
    });
    const activeCount = allCustomers.filter((c) => c.status === "active").length;
    const inactiveCount = allCustomers.filter((c) => c.status === "inactive").length;
    const vipCount = allCustomers.filter((c) => c.status === "vip").length;

    const followUps = await deps.followUps.listByMerchant(m, "OPEN");
    const financeSummary = await deps.financeReader.getDashboardSummary({
      merchantId: m,
    });

    return {
      crmMetrics: {
        totalCustomers: total,
        activeCustomers: activeCount,
        inactiveCustomers: inactiveCount,
        vipCustomers: vipCount,
        pendingFollowUpsCount: followUps.length,
      },
      financialMetrics: financeSummary,
    };
  }

  return {
    createCustomer,
    updateCustomer,
    archiveCustomer,
    restoreCustomer,
    getCustomer360,
    listCustomers,
    addNote,
    deleteNote,
    createTag,
    listTags,
    assignTag,
    removeTag,
    logInteraction,
    createFollowUp,
    updateFollowUpStatus,
    getCustomerTimeline,
    getCrmDashboardMetrics,
  };
}

export type CustomerUseCases = ReturnType<typeof createCustomerUseCases>;
