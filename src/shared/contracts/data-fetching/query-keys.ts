/**
 * Scoped query keys (ADR-026).
 * Always tenant/store aware; never put tokens in keys.
 */

export type QueryScope = {
  merchantId: string;
  storeId?: string;
};

const TOKENISH =
  /^(bearer\s+)?[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/i;

export function assertNoTokenInQueryKey(parts: readonly unknown[]): void {
  for (const part of parts) {
    if (typeof part !== "string") {
      continue;
    }
    if (TOKENISH.test(part) || part.toLowerCase().startsWith("eyj")) {
      throw new Error(
        "Do not put tokens in query keys (ADR-026 Security / docs/tech/tanstack-query.md).",
      );
    }
  }
}

/**
 * Canonical key shape: ["mos", merchantId, storeId?, entity, ...rest]
 */
export function buildScopedQueryKey(
  scope: QueryScope,
  entity: string,
  ...rest: readonly unknown[]
): readonly unknown[] {
  const parts: unknown[] = ["mos", scope.merchantId];
  if (scope.storeId !== undefined) {
    parts.push(scope.storeId);
  }
  parts.push(entity, ...rest);
  assertNoTokenInQueryKey(parts);
  return parts;
}
