/**
 * ADR-085 — ADR/ARD governance completion rules (executable contract).
 * ADR-120 — STATUS board truth: contract landed ≠ product-runtime complete.
 * Narrative: AGENT.md + docs/architecture/adr-roadmap.md + AUDIT_REPORT.md
 */

export const ARCHITECTURE_SOURCE_OF_TRUTH = "/adrs" as const;

export const ARD_ROLE = "implementation_package" as const;

/** ADR-120 — physical ADR folders (source layout after audit reorg). */
export const ADR_FOLDERS = {
  done: "adrs/done",
  future: "adrs/future",
  tasks: "adrs/tasks",
  statusBoard: "adrs/STATUS.md",
  reorganizationIndex: "adrs/REORGANIZATION_INDEX.md",
  auditReport: "AUDIT_REPORT.md",
} as const;

/**
 * ADR-120 — Runtime Completeness axis (orthogonal to Decision Accepted).
 * - contract: domain/contracts/tests landed (`done/`); may lack HTTP/migrations/UI
 * - partial: some product wiring exists but acceptance incomplete
 * - complete: API + migration + tests evidence for the ADR’s product surface
 */
export const RUNTIME_COMPLETENESS = [
  "contract",
  "partial",
  "complete",
] as const;

export type RuntimeCompleteness = (typeof RUNTIME_COMPLETENESS)[number];

export const STATUS_TRUTH = {
  adrCompleteMeans: "architecture_contract_domain_tests",
  ardBoardIsDeliverySoT: true,
  adrCompleteDoesNotEqualArdCompleted: true,
  adrCompleteDoesNotEqualProductionReady: true,
  productRuntimeWorkQueue: ADR_FOLDERS.tasks,
  runtimeCompleteRequires: ["api", "migration", "tests"] as const,
} as const;

export const SCHEDULING = {
  skill: "ard-to-code",
  orderSource: "docs/architecture/adr-roadmap.md",
  dependencyMap: "docs/architecture/adr-dependency-map.md",
  statusBoard: "adrs/STATUS.md",
  ardStatusBoard: "docs/ards/STATUS.md",
  workQueue: ADR_FOLDERS.tasks,
  auditReport: ADR_FOLDERS.auditReport,
  rule: "ard-to-code implements unfinished ADRs in adrs/tasks/; never invent architecture outside Accepted ADRs; never mark product-runtime complete without api+migration+tests evidence.",
} as const;

export const DECISION_STATUSES = [
  "proposed",
  "accepted",
  "deprecated",
  "superseded",
] as const;

export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const IMPLEMENTATION_STATUSES = [
  "todo",
  "in_progress",
  "blocked",
  "completed",
] as const;

export type ImplementationStatus = (typeof IMPLEMENTATION_STATUSES)[number];

/** Production hard-depend forbidden while Decision is Proposed. */
export const PROPOSED_ADR_POLICY = {
  allowed: "ports_and_mocks_only",
  forbidProductionHardDepend: true,
  examples: ["ADR-083", "ADR-084"] as const,
} as const;

export const CODING_RULES = {
  noCodeWithoutCoveringAdr: true,
  noArchitectureChangeWithoutAdrUpdate: true,
  neverCompleteIfAcceptanceFails: true,
  neverStartSecondAdrWhileOneInProgress: true,
  sqlOrmExclusive: "drizzle",
  mongoNeverOltpSot: true,
  noDeliveryInMvp: true,
} as const;

/**
 * Iranian First is a mandatory completion gate for in-scope UX (ADR-085).
 * Governance docs themselves may be English.
 */
export const IRANIAN_FIRST_GATE = {
  mandatoryForUserFacingCompletion: true,
  rulePath: "docs/rules/iranian-first-development.md",
  checklistPath: "docs/checklists/iranian-feature-checklist.md",
  checks: [
    "persian_text",
    "rtl",
    "jalali",
    "toman",
    "iranian_user_behavior",
    "iranian_mobile",
  ] as const,
} as const;

export const COMPLETION_REQUIREMENTS = [
  "decision_reflected_in_code_and_docs",
  "tests_and_validation_green",
  "iranian_first_checklist_for_in_scope_ux",
  "status_board_marked_completed",
  "related_ards_synced",
] as const;

export function assertMayWriteFeatureCode(opts: {
  coveringAdrAccepted: boolean;
}): void {
  if (!opts.coveringAdrAccepted) {
    throw new Error(
      "No feature/architecture code without a covering Accepted ADR (ADR-085).",
    );
  }
}

export function assertProposedOnlyPortsMocks(decisionStatus: DecisionStatus): void {
  if (decisionStatus === "proposed") {
    // Allowed path — ports/mocks only; callers must not production-hard-depend.
    return;
  }
}

export function isProductionHardDependAllowed(
  decisionStatus: DecisionStatus,
): boolean {
  return decisionStatus === "accepted";
}

export function assertIranianFirstGateForUx(opts: {
  uxInScope: boolean;
  checklistPassed: boolean;
}): void {
  if (opts.uxInScope && !opts.checklistPassed) {
    throw new Error(
      "Cannot complete ADR with user-facing UX until Iranian First checklist passes (ADR-085).",
    );
  }
}

/**
 * ADR-120 — refuse product-runtime `complete` without API + migration + tests evidence.
 * Architecture-contract completion (`contract`) does not require these.
 */
export function assertRuntimeCompleteAllowed(evidence: {
  runtimeCompleteness: RuntimeCompleteness;
  hasApi: boolean;
  hasMigration: boolean;
  hasTests: boolean;
}): void {
  if (evidence.runtimeCompleteness !== "complete") {
    return;
  }
  const missing: string[] = [];
  if (!evidence.hasApi) missing.push("api");
  if (!evidence.hasMigration) missing.push("migration");
  if (!evidence.hasTests) missing.push("tests");
  if (missing.length > 0) {
    throw new Error(
      `Cannot mark ADR product-runtime complete without evidence: missing ${missing.join(", ")} (ADR-120).`,
    );
  }
}

export function isProductRuntimeComplete(evidence: {
  hasApi: boolean;
  hasMigration: boolean;
  hasTests: boolean;
}): boolean {
  return evidence.hasApi && evidence.hasMigration && evidence.hasTests;
}

export const GOVERNANCE = {
  architectureSoT: ARCHITECTURE_SOURCE_OF_TRUTH,
  ardRole: ARD_ROLE,
  folders: ADR_FOLDERS,
  statusTruth: STATUS_TRUTH,
  runtimeCompleteness: RUNTIME_COMPLETENESS,
  scheduling: SCHEDULING,
  decisionStatuses: DECISION_STATUSES,
  implementationStatuses: IMPLEMENTATION_STATUSES,
  proposedPolicy: PROPOSED_ADR_POLICY,
  codingRules: CODING_RULES,
  iranianFirstGate: IRANIAN_FIRST_GATE,
  completionRequirements: COMPLETION_REQUIREMENTS,
} as const;
