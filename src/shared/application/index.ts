/**
 * Shared application composition slot (ADR-029).
 *
 * Module use cases live under `src/modules/<context>/application`.
 * Cross-cutting orchestration helpers and composition-root types may land here.
 * Presentation never imports infrastructure adapters from this package.
 */

export const SHARED_APPLICATION_SLOT = {
  path: "src/shared/application",
  role: "composition_helpers",
  presentationImports: "application_ports_only",
} as const;
