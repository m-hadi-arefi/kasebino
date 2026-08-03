import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  UIUXPROMAX_BINARY_FALLBACK,
  UIUXPROMAX_GATE,
  UIUXPROMAX_MANDATE,
  UIUXPROMAX_PROTOCOL,
  UIUXPROMAX_SKILL_PATHS,
  UIUX_BRIEF_REQUIREMENTS,
  UIUX_DOC_PATHS,
  assertUiuxBrief,
  assertUiuxGate,
  requiredUiuxpromaxFilesystemPaths,
} from "./index.js";

describe("ADR-021 uiuxpromax mandatory gate", () => {
  it("makes uiuxpromax mandatory before UI and not-Done on skip", () => {
    expect(UIUXPROMAX_MANDATE.mandatoryBeforeUi).toBe(true);
    expect(UIUXPROMAX_MANDATE.nonCompliance).toBe("not_done");
    expect(UIUXPROMAX_MANDATE.stopIfSkillMissing).toBe(true);
    expect(UIUXPROMAX_MANDATE.applyTo).toEqual(
      expect.arrayContaining(["pages", "components", "pos", "storefront"]),
    );
    expect(UIUXPROMAX_GATE.mandate.adr).toBe("ADR-021");
  });

  it("requires Persian + RTL + Iranian retail brief fields", () => {
    expect(UIUX_BRIEF_REQUIREMENTS.persianCopySamples).toBe(true);
    expect(UIUX_BRIEF_REQUIREMENTS.rtlComposition).toBe(true);
    expect(UIUX_BRIEF_REQUIREMENTS.faIrPersona).toBe(true);
    expect(UIUX_BRIEF_REQUIREMENTS.dirRtl).toBe(true);
    expect(UIUX_BRIEF_REQUIREMENTS.langFa).toBe(true);
    expect(UIUX_BRIEF_REQUIREMENTS.mobileWidthPx).toBe(390);
    expect(UIUX_BRIEF_REQUIREMENTS.iranianRetailTerms).toEqual(
      expect.arrayContaining(["مغازه", "صندوقدار", "مشتری"]),
    );
  });

  it("encodes protocol ending in implement-only-after-plan / stop-if-missing", () => {
    expect(UIUXPROMAX_PROTOCOL).toContain("load_uiuxpromax_integration_skill");
    expect(UIUXPROMAX_PROTOCOL).toContain("read_docs_uiux_constraints");
    expect(UIUXPROMAX_PROTOCOL).toContain("require_persian_rtl_brief");
    expect(UIUXPROMAX_PROTOCOL).toContain("implement_ui_only_after_plan");
    expect(UIUXPROMAX_PROTOCOL).toContain("stop_if_skill_or_docs_missing");
    expect(UIUXPROMAX_BINARY_FALLBACK.evidenceViaDocsAndSkill).toBe(true);
    expect(UIUXPROMAX_BINARY_FALLBACK.forbidImproviseParallelDesignSystem).toBe(
      true,
    );
  });

  it("requires skill and docs/uiux files on disk", () => {
    const root = process.cwd();
    expect(UIUXPROMAX_SKILL_PATHS.cursorSkill).toBe(
      ".cursor/skills/uiuxpromax-integration/SKILL.md",
    );
    expect(UIUXPROMAX_SKILL_PATHS.docsSkill).toBe(
      "docs/skills/uiuxpromax-integration.md",
    );
    expect(UIUX_DOC_PATHS.length).toBeGreaterThanOrEqual(6);
    for (const rel of requiredUiuxpromaxFilesystemPaths()) {
      expect(existsSync(join(root, rel)), `missing ${rel}`).toBe(true);
    }
  });

  it("assertUiuxGate allows non-UI work without evidence", () => {
    expect(() =>
      assertUiuxGate({
        gatePassed: false,
        skillPresent: false,
        docsPresent: false,
        uiInScope: false,
        brief: { persian: false, rtl: false },
      }),
    ).not.toThrow();
  });

  it("assertUiuxGate passes with complete Persian+RTL evidence", () => {
    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: true,
        docsPresent: true,
        uiInScope: true,
        brief: {
          persian: true,
          rtl: true,
          faIrPersona: true,
          mobile390: true,
          iranianRetailContext: true,
          screenListDocumented: true,
          statesDocumented: true,
          a11yNotes: true,
        },
      }),
    ).not.toThrow();
    expect(() =>
      assertUiuxBrief({ persian: true, rtl: true, faIrPersona: true }),
    ).not.toThrow();
  });

  it("assertUiuxGate throws when skill, docs, brief, or gate missing", () => {
    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: false,
        docsPresent: true,
        uiInScope: true,
        brief: { persian: true, rtl: true },
      }),
    ).toThrow(/skill missing/i);

    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: true,
        docsPresent: false,
        uiInScope: true,
        brief: { persian: true, rtl: true },
      }),
    ).toThrow(/docs\/uiux/i);

    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: true,
        docsPresent: true,
        uiInScope: true,
        brief: { persian: false, rtl: true },
      }),
    ).toThrow(/Persian/i);

    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: true,
        docsPresent: true,
        uiInScope: true,
        brief: { persian: true, rtl: false },
      }),
    ).toThrow(/RTL/i);

    expect(() =>
      assertUiuxGate({
        gatePassed: false,
        skillPresent: true,
        docsPresent: true,
        uiInScope: true,
        brief: { persian: true, rtl: true },
      }),
    ).toThrow(/not Done/i);

    expect(() =>
      assertUiuxGate({
        gatePassed: true,
        skillPresent: true,
        docsPresent: true,
        uiInScope: true,
        brief: { persian: true, rtl: true, faIrPersona: false },
      }),
    ).toThrow(/fa-IR/i);
  });
});
