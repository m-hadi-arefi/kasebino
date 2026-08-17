import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADR_FOLDERS,
  ARCHITECTURE_SOURCE_OF_TRUTH,
  ARD_ROLE,
  CODING_RULES,
  COMPLETION_REQUIREMENTS,
  GOVERNANCE,
  IRANIAN_FIRST_GATE,
  PROPOSED_ADR_POLICY,
  RUNTIME_COMPLETENESS,
  SCHEDULING,
  STATUS_TRUTH,
  assertIranianFirstGateForUx,
  assertMayWriteFeatureCode,
  assertRuntimeCompleteAllowed,
  isProductionHardDependAllowed,
  isProductRuntimeComplete,
} from "./index.js";

describe("ADR-085 ADR/ARD governance", () => {
  it("treats /adrs as architecture SoT and ARDs as implementation packages", () => {
    expect(ARCHITECTURE_SOURCE_OF_TRUTH).toBe("/adrs");
    expect(ARD_ROLE).toBe("implementation_package");
    expect(SCHEDULING.skill).toBe("ard-to-code");
    expect(GOVERNANCE.scheduling.orderSource).toContain("adr-roadmap");
  });

  it("forbids feature code without a covering Accepted ADR", () => {
    expect(CODING_RULES.noCodeWithoutCoveringAdr).toBe(true);
    expect(CODING_RULES.sqlOrmExclusive).toBe("drizzle");
    expect(CODING_RULES.mongoNeverOltpSot).toBe(true);
    expect(CODING_RULES.noDeliveryInMvp).toBe(true);
    expect(() =>
      assertMayWriteFeatureCode({ coveringAdrAccepted: true }),
    ).not.toThrow();
    expect(() =>
      assertMayWriteFeatureCode({ coveringAdrAccepted: false }),
    ).toThrow(/covering Accepted ADR/i);
  });

  it("allows only ports/mocks for Proposed ADRs", () => {
    expect(PROPOSED_ADR_POLICY.allowed).toBe("ports_and_mocks_only");
    expect(PROPOSED_ADR_POLICY.forbidProductionHardDepend).toBe(true);
    expect(isProductionHardDependAllowed("proposed")).toBe(false);
    expect(isProductionHardDependAllowed("accepted")).toBe(true);
  });

  it("requires Iranian First checklist for user-facing completion", () => {
    expect(IRANIAN_FIRST_GATE.mandatoryForUserFacingCompletion).toBe(true);
    expect(IRANIAN_FIRST_GATE.checks).toEqual(
      expect.arrayContaining(["persian_text", "rtl", "jalali", "toman"]),
    );
    expect(COMPLETION_REQUIREMENTS).toContain(
      "iranian_first_checklist_for_in_scope_ux",
    );
    expect(() =>
      assertIranianFirstGateForUx({ uxInScope: true, checklistPassed: true }),
    ).not.toThrow();
    expect(() =>
      assertIranianFirstGateForUx({ uxInScope: true, checklistPassed: false }),
    ).toThrow(/Iranian First/i);
    expect(() =>
      assertIranianFirstGateForUx({ uxInScope: false, checklistPassed: false }),
    ).not.toThrow();
  });

  it("requires roadmap, status boards, skill, and Iranian First docs on disk", () => {
    const root = process.cwd();
    for (const rel of [
      SCHEDULING.orderSource,
      SCHEDULING.dependencyMap,
      SCHEDULING.statusBoard,
      SCHEDULING.ardStatusBoard,
      IRANIAN_FIRST_GATE.rulePath,
      IRANIAN_FIRST_GATE.checklistPath,
      ".cursor/skills/ard-to-code/SKILL.md",
      "AGENT.md",
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }
  });
});

describe("ADR-120 STATUS truth realignment", () => {
  it("encodes two-axis runtime completeness and folder layout", () => {
    expect(RUNTIME_COMPLETENESS).toEqual(["contract", "partial", "complete"]);
    expect(STATUS_TRUTH.adrCompleteDoesNotEqualArdCompleted).toBe(true);
    expect(STATUS_TRUTH.adrCompleteDoesNotEqualProductionReady).toBe(true);
    expect(STATUS_TRUTH.productRuntimeWorkQueue).toBe("adrs/tasks");
    expect(STATUS_TRUTH.runtimeCompleteRequires).toEqual([
      "api",
      "migration",
      "tests",
    ]);
    expect(GOVERNANCE.folders.done).toBe("adrs/done");
    expect(SCHEDULING.workQueue).toBe(ADR_FOLDERS.tasks);
    expect(SCHEDULING.auditReport).toBe("AUDIT_REPORT.md");
  });

  it("forbids product-runtime complete without api+migration+tests evidence", () => {
    expect(
      isProductRuntimeComplete({
        hasApi: true,
        hasMigration: true,
        hasTests: true,
      }),
    ).toBe(true);
    expect(
      isProductRuntimeComplete({
        hasApi: false,
        hasMigration: true,
        hasTests: true,
      }),
    ).toBe(false);

    expect(() =>
      assertRuntimeCompleteAllowed({
        runtimeCompleteness: "contract",
        hasApi: false,
        hasMigration: false,
        hasTests: true,
      }),
    ).not.toThrow();

    expect(() =>
      assertRuntimeCompleteAllowed({
        runtimeCompleteness: "complete",
        hasApi: true,
        hasMigration: true,
        hasTests: true,
      }),
    ).not.toThrow();

    expect(() =>
      assertRuntimeCompleteAllowed({
        runtimeCompleteness: "complete",
        hasApi: false,
        hasMigration: true,
        hasTests: true,
      }),
    ).toThrow(/missing api/i);
  });

  it("resolves ADR folder paths and audit index on disk", () => {
    const root = process.cwd();
    for (const rel of [
      ADR_FOLDERS.done,
      ADR_FOLDERS.future,
      ADR_FOLDERS.tasks,
      ADR_FOLDERS.statusBoard,
      ADR_FOLDERS.reorganizationIndex,
      ADR_FOLDERS.auditReport,
      "adrs/README.md",
      "README.md",
    ]) {
      expect(existsSync(join(root, rel))).toBe(true);
    }
  });

  it("keeps AGENT.md and README honest about folders and audit", () => {
    const root = process.cwd();
    const agent = readFileSync(join(root, "AGENT.md"), "utf8");
    const readme = readFileSync(join(root, "README.md"), "utf8");
    expect(agent).toMatch(/adrs\/tasks/);
    expect(agent).toMatch(/adrs\/done/);
    expect(agent).toMatch(/product-runtime|runtime complete|contract landed/i);
    expect(readme).toMatch(/AUDIT_REPORT\.md/);
    expect(readme).toMatch(/adrs\/tasks/);
  });
});
