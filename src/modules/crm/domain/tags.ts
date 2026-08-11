/**
 * Merchant CRM Tag Domain Entities.
 */

export type CrmTag = {
  readonly id: string;
  readonly merchantId: string;
  name: string;
  color: string;
  isArchived: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
};

export type CustomerTagRelation = {
  readonly id: string;
  readonly merchantId: string;
  readonly customerId: string;
  readonly tagId: string;
  readonly createdAt: Date;
};

export function createCrmTagAggregate(input: {
  id: string;
  merchantId: string;
  name: string;
  color?: string;
  now?: Date;
}): CrmTag {
  const at = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    name: input.name.trim(),
    color: input.color?.trim() ?? "blue",
    isArchived: false,
    createdAt: at,
    updatedAt: at,
  };
}
