/**
 * Customer Interaction & Staff Follow-Up Domain Entities.
 */

export type InteractionType =
  | "call"
  | "message"
  | "visit"
  | "follow_up"
  | "note"
  | "other";

export type CustomerInteraction = {
  readonly id: string;
  readonly merchantId: string;
  readonly customerId: string;
  storeId: string | null;
  staffId: string;
  staffName: string;
  type: InteractionType;
  description: string;
  interactionDate: Date;
  followUpDate: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type FollowUpStatus = "OPEN" | "DONE" | "CANCELLED";

export type CustomerFollowUp = {
  readonly id: string;
  readonly merchantId: string;
  readonly customerId: string;
  storeId: string | null;
  assigneeId: string;
  assigneeName: string;
  description: string;
  dueDate: Date;
  status: FollowUpStatus;
  readonly createdAt: Date;
  updatedAt: Date;
};

export function createCustomerInteractionAggregate(input: {
  id: string;
  merchantId: string;
  customerId: string;
  storeId?: string | null;
  staffId: string;
  staffName: string;
  type: InteractionType;
  description: string;
  interactionDate?: Date;
  followUpDate?: Date | null;
  now?: Date;
}): CustomerInteraction {
  const at = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    customerId: input.customerId,
    storeId: input.storeId ?? null,
    staffId: input.staffId,
    staffName: input.staffName.trim(),
    type: input.type,
    description: input.description.trim(),
    interactionDate: input.interactionDate ?? at,
    followUpDate: input.followUpDate ?? null,
    createdAt: at,
    updatedAt: at,
  };
}

export function createCustomerFollowUpAggregate(input: {
  id: string;
  merchantId: string;
  customerId: string;
  storeId?: string | null;
  assigneeId: string;
  assigneeName: string;
  description: string;
  dueDate: Date;
  status?: FollowUpStatus;
  now?: Date;
}): CustomerFollowUp {
  const at = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    customerId: input.customerId,
    storeId: input.storeId ?? null,
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName.trim(),
    description: input.description.trim(),
    dueDate: input.dueDate,
    status: input.status ?? "OPEN",
    createdAt: at,
    updatedAt: at,
  };
}
