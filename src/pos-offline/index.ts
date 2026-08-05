/**
 * ADR-024 — Offline-First Staff POS Strategy.
 *
 * Online-first P0; offline sale queue P1; stock shortage = reject-and-review
 * (ADR-091 / ADR-049); idempotent sync keys; SaleCompleted on successful sync.
 * Staff PWA only — never share queue/SW with store customer PWA (ADR-023).
 *
 * ARD-017 delivery package remainder (SW / IDB model / sync API).
 */

import { randomUUID } from "node:crypto";

import {
  OFFLINE_STOCK_SYNC,
  assertOfflineRejectAndReview,
} from "../inventory-sync/index.js";
import { OFFLINE_CONFLICT_POLICY } from "../mvp-policies/index.js";
import { POS_SALES_DECISION } from "../pos-sales/index.js";
import { assertUiuxGate } from "../uiuxpromax-gate/index.js";
import {
  POS_OFFLINE_COPY_FA,
  POS_OFFLINE_IDB,
  POS_OFFLINE_INSTALL_UX,
  POS_OFFLINE_SERVICE_WORKER,
  requireSyncKey,
} from "./client.js";

export {
  POS_OFFLINE_COPY_FA,
  POS_OFFLINE_IDB,
  POS_OFFLINE_INSTALL_UX,
  POS_OFFLINE_SERVICE_WORKER,
  bannerForConnectivity,
  requireSyncKey,
} from "./client.js";

/** Binding Decision (ADR-024). */
export const POS_OFFLINE_DECISION = {
  adr: "ADR-024",
  onlinePathPriority: OFFLINE_CONFLICT_POLICY.onlinePathPriority,
  offlineQueuePriority: OFFLINE_CONFLICT_POLICY.offlineQueuePriority,
  stockShortageConflict: OFFLINE_CONFLICT_POLICY.stockShortageConflict,
  idempotentSyncKeys: OFFLINE_CONFLICT_POLICY.idempotentSyncKeys,
  silentOverwriteForbidden: true,
  silentDoubleChargeForbidden: true,
  saleCompletedOnSync: true,
  primaryCompletionEvent: "SaleCompleted" as const,
  completeSaleModule: POS_SALES_DECISION.module,
  staffPwaOnly: true,
  storeCustomerPwaForbidden: true,
  storeCustomerPwaAdr: "ADR-023",
  /** Matches ADR-022 staff audience — avoid circular import with staff-pwa. */
  staffAudience: "staff" as const,
  inventoryOfflinePolicy: OFFLINE_STOCK_SYNC.stockShortageConflict,
  rationale: "safe_degradation_no_silent_conflict",
  implementationPackage: "src/pos-offline",
} as const;

/** Sync HTTP contract (ARD-017 / ADR-105). */
export const POS_OFFLINE_SYNC_API = {
  method: "POST" as const,
  path: "/api/v1/sales/sync",
  /** Live POS CompleteSale path used by browser/SW flush. */
  completeSalePath: "/api/v1/pos/sales",
  batch: true,
  idempotencyHeader: POS_SALES_DECISION.idempotencyHeader,
  /** Each item uses its draft syncKey as Idempotency-Key. */
  syncKeyEqualsIdempotencyKey: true,
  eachItemIsCompleteSaleTx: true,
  successEvent: "SaleCompleted" as const,
} as const;

/** Analytics / ops metric names (warehouse emit deferred). */
export const POS_OFFLINE_METRICS = {
  syncFailure: "pos_offline_sync_failure",
  syncSuccess: "pos_offline_sync_success",
  stockRejectedForReview: "pos_offline_stock_rejected_for_review",
  queueDepth: "pos_offline_queue_depth",
  warehouseEmitDeferred: true,
} as const;

export const POS_OFFLINE_DRAFT_STATUSES = [
  "queued",
  "syncing",
  "synced",
  "rejected_for_review",
  "failed",
] as const;

export type PosOfflineDraftStatus = (typeof POS_OFFLINE_DRAFT_STATUSES)[number];

export const POS_OFFLINE_REJECT_REASONS = [
  "stock_shortage",
  "sync_error",
] as const;

export type PosOfflineRejectReason =
  (typeof POS_OFFLINE_REJECT_REASONS)[number];

export type PosOfflineSaleLineDraft = {
  readonly productId: string;
  readonly productName: string;
  readonly quantity: number;
  /** IRR minor units (rial). */
  readonly unitPriceMinor: bigint;
};

export type PosOfflineSaleDraft = {
  readonly id: string;
  readonly merchantId: string;
  readonly storeId: string;
  readonly phoneNational: string;
  readonly tenderType: "cash" | "card_terminal" | "mixed";
  readonly lines: readonly PosOfflineSaleLineDraft[];
  readonly totalAmountMinor: bigint;
  /** Idempotent sync key (= Idempotency-Key on CompleteSale). */
  readonly syncKey: string;
  readonly queuedAt: Date;
  status: PosOfflineDraftStatus;
  rejectReason: PosOfflineRejectReason | null;
  saleId: string | null;
  syncedAt: Date | null;
};

export type EnqueueOfflineSaleInput = {
  merchantId: string;
  storeId: string;
  phoneNational: string;
  tenderType: "cash" | "card_terminal" | "mixed";
  lines: readonly PosOfflineSaleLineDraft[];
  totalAmountMinor: bigint;
  /** Required — prevents silent double charge on retry/sync. */
  syncKey: string;
  id?: string;
  queuedAt?: Date;
};

/** Port: durable client queue (IDB in browser; in-memory in tests). */
export type OfflineSaleQueueStore = {
  enqueue(draft: PosOfflineSaleDraft): Promise<void>;
  findBySyncKey(
    merchantId: string,
    syncKey: string,
  ): Promise<PosOfflineSaleDraft | null>;
  listByStatus(
    status: PosOfflineDraftStatus,
  ): Promise<readonly PosOfflineSaleDraft[]>;
  update(draft: PosOfflineSaleDraft): Promise<void>;
  depth(): Promise<number>;
};

export type OfflineStockPort = {
  hasSufficientStock(input: {
    merchantId: string;
    storeId: string;
    lines: readonly PosOfflineSaleLineDraft[];
  }): Promise<boolean>;
};

export type OfflineCompleteSalePort = {
  complete(input: {
    merchantId: string;
    storeId: string;
    phoneNational: string;
    tenderType: "cash" | "card_terminal" | "mixed";
    lines: readonly PosOfflineSaleLineDraft[];
    totalAmountMinor: bigint;
    idempotencyKey: string;
  }): Promise<{ saleId: string; alreadyApplied: boolean }>;
};

export type SyncFlushResult = {
  synced: number;
  rejectedForReview: number;
  failed: number;
  events: readonly {
    eventType: "SaleCompleted";
    saleId: string;
    syncKey: string;
  }[];
};

/**
 * uiuxpromax gate evidence for ADR-024 / ADR-105 offline banners.
 * Brief: docs/execution/plans/ADR-105.md
 */
export const POS_OFFLINE_UIUX_GATE = {
  briefPath: "docs/execution/plans/ADR-105.md",
  gatePassed: true,
  skillPresent: true,
  docsPresent: true,
  uiInScope: true,
  brief: {
    persian: true,
    rtl: true,
    faIrPersona: true,
    mobile390: true,
    iranianRetailContext: true,
    screenListDocumented: true,
    statesDocumented: true,
    a11yNotes: true,
  },
} as const;

export function assertPosOfflineUiuxGate(): void {
  assertUiuxGate({
    gatePassed: POS_OFFLINE_UIUX_GATE.gatePassed,
    skillPresent: POS_OFFLINE_UIUX_GATE.skillPresent,
    docsPresent: POS_OFFLINE_UIUX_GATE.docsPresent,
    uiInScope: POS_OFFLINE_UIUX_GATE.uiInScope,
    brief: { ...POS_OFFLINE_UIUX_GATE.brief },
  });
}

export function assertOnlineFirstP0(priority: string): void {
  if (priority !== "P0") {
    throw new Error(
      `Online POS path must be P0 (ADR-024); got "${priority}".`,
    );
  }
}

export function assertOfflineQueueP1(priority: string): void {
  if (priority !== "P1") {
    throw new Error(
      `Offline sale queue must be P1 (ADR-024); got "${priority}".`,
    );
  }
}

export function assertIdempotentSyncKeysRequired(required: boolean): void {
  if (!required) {
    throw new Error("Idempotent sync keys are required (ADR-024).");
  }
}

export function assertStaffOfflineAudience(audience: string): void {
  if (audience === "store-customer") {
    throw new Error(
      "Staff offline queue must not share store-customer audience (ADR-024 / ADR-023).",
    );
  }
  if (audience !== "staff") {
    throw new Error(
      `Staff offline queue audience must be "staff" (ADR-024); got "${audience}".`,
    );
  }
}

export function createInMemoryOfflineSaleQueueStore(): OfflineSaleQueueStore {
  const byId = new Map<string, PosOfflineSaleDraft>();

  return {
    async enqueue(draft) {
      const existing = [...byId.values()].find(
        (d) =>
          d.merchantId === draft.merchantId && d.syncKey === draft.syncKey,
      );
      if (existing) {
        return;
      }
      byId.set(draft.id, { ...draft, lines: [...draft.lines] });
    },
    async findBySyncKey(merchantId, syncKey) {
      for (const draft of byId.values()) {
        if (draft.merchantId === merchantId && draft.syncKey === syncKey) {
          return { ...draft, lines: [...draft.lines] };
        }
      }
      return null;
    },
    async listByStatus(status) {
      return [...byId.values()]
        .filter((d) => d.status === status)
        .map((d) => ({ ...d, lines: [...d.lines] }));
    },
    async update(draft) {
      byId.set(draft.id, { ...draft, lines: [...draft.lines] });
    },
    async depth() {
      let n = 0;
      for (const d of byId.values()) {
        if (d.status === "queued" || d.status === "syncing") n += 1;
      }
      return n;
    },
  };
}

export type OfflineSaleQueue = {
  store: OfflineSaleQueueStore;
  enqueue(input: EnqueueOfflineSaleInput): Promise<PosOfflineSaleDraft>;
  flush(deps: {
    stock: OfflineStockPort;
    completeSale: OfflineCompleteSalePort;
    now?: () => Date;
  }): Promise<SyncFlushResult>;
  listRejectedForReview(): Promise<readonly PosOfflineSaleDraft[]>;
  depth(): Promise<number>;
};

/**
 * In-memory offline sale queue helper (IDB port model for tests / Node).
 * Stock shortage → reject_and_review; never silent overwrite.
 */
export function createInMemoryOfflineSaleQueue(
  store: OfflineSaleQueueStore = createInMemoryOfflineSaleQueueStore(),
): OfflineSaleQueue {
  assertOfflineRejectAndReview(POS_OFFLINE_DECISION.stockShortageConflict);
  assertOnlineFirstP0(POS_OFFLINE_DECISION.onlinePathPriority);
  assertOfflineQueueP1(POS_OFFLINE_DECISION.offlineQueuePriority);
  assertIdempotentSyncKeysRequired(POS_OFFLINE_DECISION.idempotentSyncKeys);

  async function enqueue(
    input: EnqueueOfflineSaleInput,
  ): Promise<PosOfflineSaleDraft> {
    const syncKey = requireSyncKey(input.syncKey);
    const existing = await store.findBySyncKey(input.merchantId, syncKey);
    if (existing) {
      return existing;
    }
    if (input.lines.length === 0) {
      throw new Error(
        "Offline sale draft requires at least one line (ADR-024).",
      );
    }
    const draft: PosOfflineSaleDraft = {
      id: input.id ?? randomUUID(),
      merchantId: input.merchantId,
      storeId: input.storeId,
      phoneNational: input.phoneNational,
      tenderType: input.tenderType,
      lines: input.lines.map((line) => ({ ...line })),
      totalAmountMinor: input.totalAmountMinor,
      syncKey,
      queuedAt: input.queuedAt ?? new Date(),
      status: "queued",
      rejectReason: null,
      saleId: null,
      syncedAt: null,
    };
    await store.enqueue(draft);
    return draft;
  }

  async function flush(deps: {
    stock: OfflineStockPort;
    completeSale: OfflineCompleteSalePort;
    now?: () => Date;
  }): Promise<SyncFlushResult> {
    const now = deps.now ?? (() => new Date());
    const pending = await store.listByStatus("queued");
    let synced = 0;
    let rejectedForReview = 0;
    let failed = 0;
    const events: {
      eventType: "SaleCompleted";
      saleId: string;
      syncKey: string;
    }[] = [];

    for (const draft of pending) {
      const syncing: PosOfflineSaleDraft = {
        ...draft,
        lines: [...draft.lines],
        status: "syncing",
        rejectReason: null,
        saleId: draft.saleId,
        syncedAt: draft.syncedAt,
      };
      await store.update(syncing);

      try {
        const ok = await deps.stock.hasSufficientStock({
          merchantId: draft.merchantId,
          storeId: draft.storeId,
          lines: draft.lines,
        });
        if (!ok) {
          assertOfflineRejectAndReview("reject_and_review");
          await store.update({
            ...syncing,
            status: "rejected_for_review",
            rejectReason: "stock_shortage",
          });
          rejectedForReview += 1;
          continue;
        }

        const result = await deps.completeSale.complete({
          merchantId: draft.merchantId,
          storeId: draft.storeId,
          phoneNational: draft.phoneNational,
          tenderType: draft.tenderType,
          lines: draft.lines,
          totalAmountMinor: draft.totalAmountMinor,
          idempotencyKey: draft.syncKey,
        });

        await store.update({
          ...syncing,
          status: "synced",
          saleId: result.saleId,
          syncedAt: now(),
          rejectReason: null,
        });
        synced += 1;
        events.push({
          eventType: "SaleCompleted",
          saleId: result.saleId,
          syncKey: draft.syncKey,
        });
      } catch {
        await store.update({
          ...syncing,
          status: "failed",
          rejectReason: "sync_error",
        });
        failed += 1;
      }
    }

    return { synced, rejectedForReview, failed, events };
  }

  return {
    store,
    enqueue,
    flush,
    listRejectedForReview: () => store.listByStatus("rejected_for_review"),
    depth: () => store.depth(),
  };
}

export const POS_OFFLINE_APP_PATHS = {
  offlineStatus: "app/(merchant)/pos/offline-status.tsx",
  posPage: "app/(merchant)/pos/page.tsx",
  serviceWorker: "public/sw-staff.js",
} as const;

export const POS_OFFLINE = {
  decision: POS_OFFLINE_DECISION,
  syncApi: POS_OFFLINE_SYNC_API,
  serviceWorker: POS_OFFLINE_SERVICE_WORKER,
  idb: POS_OFFLINE_IDB,
  metrics: POS_OFFLINE_METRICS,
  copyFa: POS_OFFLINE_COPY_FA,
  installUx: POS_OFFLINE_INSTALL_UX,
  uiuxGate: POS_OFFLINE_UIUX_GATE,
  appPaths: POS_OFFLINE_APP_PATHS,
} as const;
