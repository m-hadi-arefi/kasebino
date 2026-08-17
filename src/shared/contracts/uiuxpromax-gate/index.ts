/**
 * ADR-021 — uiuxpromax Mandatory for UI (executable gate).
 *
 * Every UI task must pass this gate before producing pages/components.
 * Briefs require Persian + RTL. Missing skill/docs = STOP (not Done).
 */

/** Binding Decision — UI without this gate fails Definition of Done. */
export const UIUXPROMAX_MANDATE = {
  adr: "ADR-021",
  mandatoryBeforeUi: true,
  nonCompliance: "not_done" as const,
  stopIfSkillMissing: true,
  applyTo: [
    "pages",
    "layouts",
    "components",
    "visual_refactors",
    "landing",
    "pos",
    "crm",
    "loyalty",
    "storefront",
    "admin",
    "pwa_shells",
  ] as const,
} as const;

/**
 * Repo skill + docs that must exist on disk.
 * External uiuxpromax CLI may be absent; MerchantOS integration skill is required.
 */
export const UIUXPROMAX_SKILL_PATHS = {
  cursorSkill: ".cursor/skills/uiuxpromax-integration/SKILL.md",
  docsSkill: "docs/skills/uiuxpromax-integration.md",
} as const;

/** Mandatory `docs/uiux/*` inputs before any UI plan/code. */
export const UIUX_DOC_PATHS = [
  "docs/uiux/uiux-system.md",
  "docs/uiux/design-system.md",
  "docs/uiux/design-rules.md",
  "docs/uiux/component-library.md",
  "docs/uiux/accessibility.md",
  "docs/uiux/mobile-first.md",
  "docs/uiux/pwa-experience.md",
] as const;

export type UiuxDocPath = (typeof UIUX_DOC_PATHS)[number];

/** ard-to-code Step 4 protocol (order matters). */
export const UIUXPROMAX_PROTOCOL = [
  "detect_ui_surfaces",
  "load_uiuxpromax_integration_skill",
  "read_docs_uiux_constraints",
  "produce_ui_plan_from_uiuxpromax",
  "require_persian_rtl_brief",
  "implement_ui_only_after_plan",
  "stop_if_skill_or_docs_missing",
] as const;

/**
 * Iranian First brief requirements (ADR-021 UX section).
 * Every UI brief must declare these before coding.
 */
export const UIUX_BRIEF_REQUIREMENTS = {
  persianCopySamples: true,
  faIrPersona: true,
  rtlComposition: true,
  langFa: true,
  dirRtl: true,
  /** ~390px Android widths for merchant/customer journeys. */
  mobileWidthPx: 390,
  iranianRetailContext: true,
  iranianRetailTerms: ["مغازه", "صندوقدار", "مشتری"] as const,
  requireLoadingEmptyErrorStates: true,
  a11yNotesRequired: true,
} as const;

/** When external uiuxpromax binary is unavailable. */
export const UIUXPROMAX_BINARY_FALLBACK = {
  binaryOptional: true,
  evidenceViaDocsAndSkill: true,
  forbidImproviseParallelDesignSystem: true,
} as const;

export type UiuxBriefEvidence = {
  /** Persian / fa-IR copy and persona declared. */
  persian: boolean;
  /** RTL composition declared (`dir=rtl`). */
  rtl: boolean;
  /** fa-IR persona / lang=fa declared. */
  faIrPersona?: boolean;
  /** Mobile ~390px Android mockup width noted. */
  mobile390?: boolean;
  /** Iranian retail context (مغازه / صندوقدار / مشتری) present. */
  iranianRetailContext?: boolean;
  /** Screen list / N/A documented. */
  screenListDocumented?: boolean;
  /** loading/empty/error states planned. */
  statesDocumented?: boolean;
  /** A11y notes present. */
  a11yNotes?: boolean;
};

export type UiuxGateEvidence = {
  /** True only after uiuxpromax protocol ran for this UI task. */
  gatePassed: boolean;
  /** Skill file readable (or pre-asserted present). */
  skillPresent: boolean;
  /** Required docs/uiux inputs readable (or pre-asserted present). */
  docsPresent: boolean;
  brief: UiuxBriefEvidence;
  /** UI surfaces in scope for this task. */
  uiInScope: boolean;
};

/**
 * Assert the ADR-021 gate before UI implementation.
 * For non-UI work (`uiInScope: false`), returns without throwing.
 */
export function assertUiuxGate(evidence: UiuxGateEvidence): void {
  if (!evidence.uiInScope) {
    return;
  }
  if (!evidence.skillPresent) {
    throw new Error(
      "uiuxpromax skill missing — STOP (ADR-021). Install/restore `.cursor/skills/uiuxpromax-integration` before UI.",
    );
  }
  if (!evidence.docsPresent) {
    throw new Error(
      "docs/uiux inputs missing — STOP (ADR-021). Restore `docs/uiux/*` before UI.",
    );
  }
  if (!evidence.brief.persian || !evidence.brief.rtl) {
    throw new Error(
      "uiuxpromax brief must require Persian copy samples and RTL composition (ADR-021 Iranian First).",
    );
  }
  if (evidence.brief.faIrPersona === false) {
    throw new Error(
      "uiuxpromax brief must include fa-IR persona (ADR-021).",
    );
  }
  if (evidence.brief.mobile390 === false) {
    throw new Error(
      "uiuxpromax brief must note ~390px Android mobile widths (ADR-021).",
    );
  }
  if (evidence.brief.iranianRetailContext === false) {
    throw new Error(
      "uiuxpromax brief must describe Iranian retail context (مغازه، صندوقدار، مشتری) (ADR-021).",
    );
  }
  if (!evidence.gatePassed) {
    throw new Error(
      "UI without uiuxpromax gate is not Done (ADR-021). Invoke uiuxpromax before code.",
    );
  }
}

/** Assert a single brief field set meets Persian + RTL minimums. */
export function assertUiuxBrief(brief: UiuxBriefEvidence): void {
  assertUiuxGate({
    gatePassed: true,
    skillPresent: true,
    docsPresent: true,
    uiInScope: true,
    brief,
  });
}

/** Relative paths that must exist for the gate to be operable. */
export function requiredUiuxpromaxFilesystemPaths(): readonly string[] {
  return [
    UIUXPROMAX_SKILL_PATHS.cursorSkill,
    UIUXPROMAX_SKILL_PATHS.docsSkill,
    ...UIUX_DOC_PATHS,
  ];
}

export const UIUXPROMAX_GATE = {
  mandate: UIUXPROMAX_MANDATE,
  skillPaths: UIUXPROMAX_SKILL_PATHS,
  uiuxDocs: UIUX_DOC_PATHS,
  protocol: UIUXPROMAX_PROTOCOL,
  briefRequirements: UIUX_BRIEF_REQUIREMENTS,
  binaryFallback: UIUXPROMAX_BINARY_FALLBACK,
} as const;
