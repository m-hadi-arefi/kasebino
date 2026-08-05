/**
 * Guard: production repository bag must never hold InMemory* adapters (ADR-093).
 */

const IN_MEMORY_NAME = /^InMemory/;

export function assertProductionRepositoriesForbidInMemory(
  repos: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(repos)) {
    if (value == null || typeof value !== "object") continue;
    const name = (value as { constructor?: { name?: string } }).constructor
      ?.name;
    if (name && IN_MEMORY_NAME.test(name)) {
      throw new Error(
        `Production repositories must not use ${name} (key=${key}) — ADR-093`,
      );
    }
  }
}
