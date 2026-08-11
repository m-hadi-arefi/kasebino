/**
 * Kasbino Customer Aggregate Root & Domain Entity.
 *
 * Owned by Kasbino. Multi-tenant isolated via merchantId.
 */

export type CustomerType = "retail" | "wholesale";

export type CustomerStatus =
  | "active"
  | "inactive"
  | "vip"
  | "blocked"
  | "archived";

export type PreferredContactMethod = "phone" | "sms" | "email" | "whatsapp";

export type Customer = {
  readonly id: string;
  readonly merchantId: string;
  storeId: string | null;
  phoneNational: string;
  phoneE164: string;
  email: string | null;
  displayName: string;
  birthday: Date | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  customerType: CustomerType;
  status: CustomerStatus;
  preferredContactMethod: PreferredContactMethod;
  notes: string | null;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateCustomerInput = {
  id: string;
  merchantId: string;
  storeId?: string | null;
  phoneNational: string;
  phoneE164: string;
  displayName: string;
  email?: string | null;
  birthday?: Date | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  customerType?: CustomerType;
  status?: CustomerStatus;
  preferredContactMethod?: PreferredContactMethod;
  notes?: string | null;
  now?: Date;
};

export function createCustomerAggregate(input: CreateCustomerInput): Customer {
  const at = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    storeId: input.storeId ?? null,
    phoneNational: input.phoneNational,
    phoneE164: input.phoneE164,
    email: input.email ? input.email.trim().toLowerCase() : null,
    displayName: input.displayName.trim(),
    birthday: input.birthday ?? null,
    address: input.address?.trim() ?? null,
    city: input.city?.trim() ?? null,
    postalCode: input.postalCode?.trim() ?? null,
    customerType: input.customerType ?? "retail",
    status: input.status ?? "active",
    preferredContactMethod: input.preferredContactMethod ?? "phone",
    notes: input.notes?.trim() ?? null,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
  };
}

export function updateCustomerStatus(
  customer: Customer,
  newStatus: CustomerStatus,
  at: Date = new Date(),
): void {
  customer.status = newStatus;
  customer.updatedAt = at;
  if (newStatus === "archived") {
    customer.deletedAt = at;
  } else {
    customer.deletedAt = null;
  }
}
