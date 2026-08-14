/**
 * ADR-094 / ADR-077 — DTO mappers (camelCase wire; public storefront ACL).
 */

import { assertPublicDtoMinimized } from "../../api-protection/index.js";
import { formatTomanDisplay, moneyFromMinor } from "../../shared/domain/money.js";
import { buildPublicStoreMapDto } from "../../store-location/index.js";
import type { Product } from "../../modules/catalog/domain/product.js";
import type { Category } from "../../modules/catalog/domain/category.js";
import type { Merchant } from "../../modules/merchant/domain/merchant.js";
import type { Store } from "../../modules/store/domain/store.js";
import type { StockItem } from "../../modules/inventory/domain/stock-item.js";
import type { StockMovement } from "../../modules/inventory/domain/stock-movement.js";
import type { StoreMembership } from "../../modules/crm/domain/store-membership.js";
import type { MembershipEngagementStats } from "../../modules/crm/domain/segments.js";
import type { Sale } from "../../modules/pos/domain/sale.js";
import type { Order } from "../../modules/ordering/domain/order.js";
import type { PaymentIntent } from "../../modules/payments/domain/payment-intent.js";
import type { Notification } from "../../modules/notifications/domain/notification.js";
import type { PointRule } from "../../modules/loyalty/domain/point-rule.js";
import type { Wallet } from "../../modules/loyalty/domain/wallet.js";

export const STOCK_MOVEMENT_REASONS_FA: Record<string, string> = {
  sale: "فروش حضوری",
  return: "مرجوعی کالا",
  adjustment: "اصلاح دستی موجودی",
  transfer: "انتقال انبار",
  receipt: "ورودی انبار",
  damage: "ضایعات / خرابی",
  purchase: "خرید از تامین‌کننده",
  pickup_paid: "تحویل سفارش آنلاین",
  pickup_restore: "بازگشت سفارش لغو شده",
};

export function stockMovementDto(movement: StockMovement) {
  return {
    id: movement.id,
    merchantId: movement.merchantId,
    storeId: movement.storeId,
    productId: movement.productId,
    stockItemId: movement.stockItemId,
    quantityDelta: movement.quantityDelta,
    unitCode: movement.unitCode,
    reason: movement.reason,
    reasonDisplayFa: STOCK_MOVEMENT_REASONS_FA[movement.reason] ?? movement.reason,
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    source: movement.source,
    note: movement.note,
    occurredAt: movement.occurredAt.toISOString(),
    createdAt: movement.createdAt.toISOString(),
  };
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function productDto(product: Product) {
  return {
    id: product.id,
    merchantId: product.merchantId,
    name: product.name,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId,
    priceAmountMinor: product.price.amountMinor.toString(),
    priceDisplayToman: formatTomanDisplay(product.price),
    costAmountMinor: product.cost ? product.cost.amountMinor.toString() : null,
    costDisplayToman: product.cost ? formatTomanDisplay(product.cost) : null,
    imageObjectKey: product.imageObjectKey ?? null,
    imageUpdatedAt: iso(product.imageUpdatedAt),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

/** Public storefront product — no cost/staff/soft-delete fields. */
export function publicProductDto(
  product: Product,
  stock?: { quantity: number } | null,
) {
  const availableQuantity = stock?.quantity ?? 0;
  const dto = {
    id: product.id,
    name: product.name,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode,
    categoryId: product.categoryId,
    priceAmountMinor: product.price.amountMinor.toString(),
    priceDisplayToman: formatTomanDisplay(product.price),
    imageObjectKey: product.imageObjectKey ?? null,
    imageUpdatedAt: iso(product.imageUpdatedAt),
    availableQuantity,
    inStock: availableQuantity > 0,
  };
  assertPublicDtoMinimized(dto);
  return dto;
}

export function categoryDto(category: Category) {
  return {
    id: category.id,
    merchantId: category.merchantId,
    name: category.name,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

export function merchantDto(merchant: Merchant) {
  return {
    id: merchant.id,
    tradeName: merchant.tradeName,
    slug: merchant.slug,
    status: merchant.status,
    ownerUserId: merchant.ownerUserId,
    contactPhoneNational: merchant.contactPhoneNational,
    settings: merchant.settings,
    createdAt: merchant.createdAt.toISOString(),
    updatedAt: merchant.updatedAt.toISOString(),
    activatedAt: iso(merchant.activatedAt),
  };
}

export function storeDto(store: Store) {
  return {
    id: store.id,
    merchantId: store.merchantId,
    slug: store.slug,
    status: store.status,
    branding: store.branding,
    hours: store.hours,
    address: {
      line1: store.address.line1,
      line2: store.address.line2,
      city: store.address.city,
      province: store.address.province,
      postalCode: store.address.postalCode,
      displayAddress: store.address.displayAddress,
      latitude: store.address.latitude,
      longitude: store.address.longitude,
    },
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}

export function publicStoreDto(store: Store) {
  const map = buildPublicStoreMapDto({
    storeSlug: store.slug,
    latitude: store.address.latitude,
    longitude: store.address.longitude,
    displayAddress: store.address.displayAddress,
  });
  const dto = {
    id: store.id,
    slug: store.slug,
    status: store.status,
    branding: {
      displayName: store.branding.displayName,
      logoObjectKey: store.branding.logoObjectKey,
      primaryColor: store.branding.primaryColor,
      /** Public proxy path when logo uploaded to MinIO (ADR-111). */
      logoUrl: store.branding.logoObjectKey
        ? `/api/v1/storefront/${encodeURIComponent(store.slug)}/logo`
        : null,
    },
    hours: store.hours,
    address: {
      displayAddress: store.address.displayAddress,
      city: store.address.city,
      province: store.address.province,
      latitude: store.address.latitude,
      longitude: store.address.longitude,
    },
    map: {
      available: map.available,
      staticImagePath: map.staticImagePath,
      fallbackReason: map.fallbackReason,
      latitude: map.latitude,
      longitude: map.longitude,
      navigate: map.navigate,
      navigateItems: map.navigateItems,
    },
    fulfillment: { mode: "pickup" as const },
  };
  assertPublicDtoMinimized(dto);
  return dto;
}

export function stockItemDto(item: StockItem) {
  return {
    id: item.id,
    merchantId: item.merchantId,
    storeId: item.storeId,
    productId: item.productId,
    quantity: item.quantity,
    version: item.version,
    reorderLevel: item.reorderLevel,
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function membershipDto(m: StoreMembership) {
  return {
    id: m.id,
    merchantId: m.merchantId,
    storeId: m.storeId,
    customerId: m.customerId,
    phoneNational: m.phoneNational,
    source: m.source,
    status: m.status,
    consent: m.consent,
    joinedAt: m.joinedAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export function membershipEngagementDto(stats: MembershipEngagementStats) {
  return {
    purchaseCount: stats.purchaseCount,
    totalSpendMinor: stats.totalSpendMinor.toString(),
    totalSpendDisplayToman: formatTomanDisplay(
      moneyFromMinor(stats.totalSpendMinor),
    ),
    firstPurchaseAt: iso(stats.firstPurchaseAt),
    lastPurchaseAt: iso(stats.lastPurchaseAt),
    segment: stats.segment,
  };
}

export function membershipListItemDto(input: {
  membership: StoreMembership;
  engagement: MembershipEngagementStats;
}) {
  return {
    membership: membershipDto(input.membership),
    engagement: membershipEngagementDto(input.engagement),
  };
}

export function saleDto(sale: Sale) {
  return {
    id: sale.id,
    /** POS-07 receipt reference — sale id; binary → MinIO (ADR-111). */
    receiptRef: sale.id,
    receiptObjectKey: sale.receiptObjectKey,
    receiptReady: Boolean(sale.receiptObjectKey),
    receiptUrl: sale.receiptObjectKey
      ? `/api/v1/sales/${sale.id}/receipt`
      : null,
    merchantId: sale.merchantId,
    storeId: sale.storeId,
    membershipId: sale.membershipId,
    customerId: sale.customerId,
    phoneNational: sale.phoneNational,
    tenderType: sale.tenderType,
    totalAmountMinor: sale.totalAmountMinor.toString(),
    totalDisplayToman: formatTomanDisplay(
      moneyFromMinor(sale.totalAmountMinor),
    ),
    idempotencyKey: sale.idempotencyKey,
    lines: sale.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor.toString(),
      lineDisplayToman: formatTomanDisplay(
        moneyFromMinor(line.unitPriceMinor * BigInt(line.quantity)),
      ),
    })),
    completedAt: iso(sale.completedAt),
    createdAt: sale.createdAt.toISOString(),
  };
}

export function orderDto(order: Order) {
  return {
    id: order.id,
    merchantId: order.merchantId,
    storeId: order.storeId,
    membershipId: order.membershipId,
    customerId: order.customerId,
    status: order.status,
    fulfillmentMode: order.fulfillmentMode,
    totalAmountMinor: order.totalAmountMinor.toString(),
    totalDisplayToman: formatTomanDisplay(
      moneyFromMinor(order.totalAmountMinor),
    ),
    idempotencyKey: order.idempotencyKey,
    lines: order.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor.toString(),
      lineDisplayToman: formatTomanDisplay(
        moneyFromMinor(line.unitPriceMinor * BigInt(line.quantity)),
      ),
    })),
    pendingPaymentAt: order.pendingPaymentAt.toISOString(),
    paidAt: iso(order.paidAt),
    preparingAt: iso(order.preparingAt),
    readyForPickupAt: iso(order.readyForPickupAt),
    pickedUpAt: iso(order.pickedUpAt),
    completedAt: iso(order.completedAt),
    cancelledAt: iso(order.cancelledAt),
    refundedAt: iso(order.refundedAt),
    cancelReason: order.cancelReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function paymentDto(payment: PaymentIntent) {
  return {
    id: payment.id,
    merchantId: payment.merchantId,
    storeId: payment.storeId,
    orderId: payment.orderId,
    status: payment.status,
    amountMinor: payment.amountMinor.toString(),
    amountDisplayToman: formatTomanDisplay(
      moneyFromMinor(payment.amountMinor),
    ),
    feeChargedMinor: payment.feeChargedMinor.toString(),
    providerId: payment.providerId,
    providerRef: payment.providerRef,
    idempotencyKey: payment.idempotencyKey,
    failureCode: payment.failureCode,
    paidAt: iso(payment.paidAt),
    refundedAt: iso(payment.refundedAt),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export function notificationDto(n: Notification) {
  return {
    id: n.id,
    merchantId: n.merchantId,
    storeId: n.storeId,
    userId: n.userId,
    audience: n.audience,
    channel: n.channel,
    type: n.type,
    titleFa: n.titleFa,
    bodyFa: n.bodyFa,
    readAt: iso(n.readAt),
    createdAt: n.createdAt.toISOString(),
  };
}

export function pointRuleDto(rule: PointRule) {
  return {
    id: rule.id,
    merchantId: rule.merchantId,
    storeId: rule.storeId,
    amountMinorPerPoint: rule.amountMinorPerPoint.toString(),
    pointsPerUnit: rule.pointsPerUnit,
    expiryMonthsAfterLastEarn: rule.expiryMonthsAfterLastEarn,
    updatedAt: rule.updatedAt.toISOString(),
  };
}

export function walletDto(wallet: Wallet) {
  return {
    id: wallet.id,
    merchantId: wallet.merchantId,
    storeId: wallet.storeId,
    membershipId: wallet.storeMembershipId,
    customerId: wallet.customerId,
    balance: wallet.balance,
    lastEarnAt: iso(wallet.lastEarnAt),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}
