/**
 * CustomerIdentity aggregate — ADR-032 / ARD-030.
 * Separate from merchant AuthUser (ADR-031). Persistence → ARD-030 Drizzle.
 */

export type CustomerIdentity = {
  readonly id: string;
  readonly phoneE164: string;
  readonly phoneNational: string;
  /** Fixed audience role — never staff. */
  readonly role: "customer";
  readonly tokenVersion: number;
  readonly createdAt: Date;
  updatedAt: Date;
};

export function createCustomerIdentity(input: {
  id: string;
  phoneE164: string;
  phoneNational: string;
  now?: Date;
}): CustomerIdentity {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    phoneE164: input.phoneE164,
    phoneNational: input.phoneNational,
    role: "customer",
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}
