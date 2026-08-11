/**
 * Customer Note Domain Entity.
 */

export type CustomerNote = {
  readonly id: string;
  readonly merchantId: string;
  readonly customerId: string;
  readonly authorId: string;
  readonly authorName: string;
  content: string;
  isPrivate: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateCustomerNoteInput = {
  id: string;
  merchantId: string;
  customerId: string;
  authorId: string;
  authorName: string;
  content: string;
  isPrivate?: boolean;
  now?: Date;
};

export function createCustomerNoteAggregate(
  input: CreateCustomerNoteInput,
): CustomerNote {
  const at = input.now ?? new Date();
  return {
    id: input.id,
    merchantId: input.merchantId,
    customerId: input.customerId,
    authorId: input.authorId,
    authorName: input.authorName.trim(),
    content: input.content.trim(),
    isPrivate: input.isPrivate ?? false,
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
  };
}
