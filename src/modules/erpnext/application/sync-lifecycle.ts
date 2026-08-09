/**
 * Sync lifecycle helpers for accounting outbox → erpnext_sync_records (ADR-141).
 */

import { normalizeErpNextErrorFa } from "./error-messages-fa.js";
import type {
  ErpNextSyncRecord,
  ErpNextSyncRecordRepository,
} from "../domain/sync-record.js";

const ERPNEXT_TYPE_BY_ENTITY: Record<string, string> = {
  sale: "Sales Invoice",
  order: "Sales Invoice",
  payment: "Payment Entry",
  product: "Item",
  customer: "Customer",
  stock_adjustment: "Stock Entry",
};

export async function markSyncPending(input: {
  repo: ErpNextSyncRecordRepository;
  merchantId: string;
  storeId: string | null;
  entityType: string;
  entityId: string;
  eventId: string;
  idFactory: () => string;
  now: () => Date;
}): Promise<void> {
  const at = input.now();
  const prior = await input.repo.findByInternal({
    merchantId: input.merchantId,
    entityType: input.entityType,
    entityId: input.entityId,
  });
  const record: ErpNextSyncRecord = {
    id: prior?.id ?? input.idFactory(),
    merchantId: input.merchantId,
    storeId: input.storeId,
    entityType: input.entityType,
    entityId: input.entityId,
    eventId: input.eventId,
    erpnextType: ERPNEXT_TYPE_BY_ENTITY[input.entityType] ?? null,
    erpnextId: prior?.erpnextId ?? null,
    status: "pending",
    lastSyncAt: prior?.lastSyncAt ?? null,
    errorMessageFa: null,
    attemptCount: (prior?.attemptCount ?? 0) + 1,
    createdAt: prior?.createdAt ?? at,
    updatedAt: at,
  };
  await input.repo.upsert(record);
}

export async function markSyncSynced(input: {
  repo: ErpNextSyncRecordRepository;
  merchantId: string;
  storeId: string | null;
  entityType: string;
  entityId: string;
  eventId: string;
  erpnextId: string | null;
  idFactory: () => string;
  now: () => Date;
}): Promise<void> {
  const at = input.now();
  const prior = await input.repo.findByInternal({
    merchantId: input.merchantId,
    entityType: input.entityType,
    entityId: input.entityId,
  });
  await input.repo.upsert({
    id: prior?.id ?? input.idFactory(),
    merchantId: input.merchantId,
    storeId: input.storeId,
    entityType: input.entityType,
    entityId: input.entityId,
    eventId: input.eventId,
    erpnextType: ERPNEXT_TYPE_BY_ENTITY[input.entityType] ?? null,
    erpnextId: input.erpnextId,
    status: "synced",
    lastSyncAt: at,
    errorMessageFa: null,
    attemptCount: prior?.attemptCount ?? 1,
    createdAt: prior?.createdAt ?? at,
    updatedAt: at,
  });
}

export async function markSyncFailed(input: {
  repo: ErpNextSyncRecordRepository;
  merchantId: string;
  storeId: string | null;
  entityType: string;
  entityId: string;
  eventId: string;
  error: unknown;
  idFactory: () => string;
  now: () => Date;
}): Promise<void> {
  const at = input.now();
  const prior = await input.repo.findByInternal({
    merchantId: input.merchantId,
    entityType: input.entityType,
    entityId: input.entityId,
  });
  await input.repo.upsert({
    id: prior?.id ?? input.idFactory(),
    merchantId: input.merchantId,
    storeId: input.storeId,
    entityType: input.entityType,
    entityId: input.entityId,
    eventId: input.eventId,
    erpnextType: ERPNEXT_TYPE_BY_ENTITY[input.entityType] ?? null,
    erpnextId: prior?.erpnextId ?? null,
    status: "failed",
    lastSyncAt: prior?.lastSyncAt ?? null,
    errorMessageFa: normalizeErpNextErrorFa(input.error),
    attemptCount: prior?.attemptCount ?? 1,
    createdAt: prior?.createdAt ?? at,
    updatedAt: at,
  });
}
