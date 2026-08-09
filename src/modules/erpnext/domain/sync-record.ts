/**
 * ERPNext sync record (ADR-141) — lifecycle for outbound projections.
 */

export const ERPNEXT_SYNC_STATUSES = [
  "pending",
  "synced",
  "failed",
] as const;

export type ErpNextSyncStatus = (typeof ERPNEXT_SYNC_STATUSES)[number];

export type ErpNextSyncRecord = {
  id: string;
  merchantId: string;
  storeId: string | null;
  entityType: string;
  entityId: string;
  eventId: string | null;
  erpnextType: string | null;
  erpnextId: string | null;
  status: ErpNextSyncStatus;
  lastSyncAt: Date | null;
  errorMessageFa: string | null;
  attemptCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ErpNextSyncRecordRepository = {
  upsert(record: ErpNextSyncRecord): Promise<void>;
  findByInternal(input: {
    merchantId: string;
    entityType: string;
    entityId: string;
  }): Promise<ErpNextSyncRecord | null>;
  listByMerchant(input: {
    merchantId: string;
    status?: ErpNextSyncStatus;
    limit?: number;
  }): Promise<ErpNextSyncRecord[]>;
};
