/**
 * AuthUser (merchant staff) — identity aggregate root stub for ADR-031.
 * Persistence schema lands with ARD-002 Drizzle migration.
 */

export type AuthUser = {
  readonly id: string;
  readonly phoneE164: string;
  readonly phoneNational: string;
  readonly tokenVersion: number;
  readonly createdAt: Date;
  updatedAt: Date;
};

export function createAuthUser(input: {
  id: string;
  phoneE164: string;
  phoneNational: string;
  now?: Date;
}): AuthUser {
  const now = input.now ?? new Date();
  return {
    id: input.id,
    phoneE164: input.phoneE164,
    phoneNational: input.phoneNational,
    tokenVersion: 0,
    createdAt: now,
    updatedAt: now,
  };
}
