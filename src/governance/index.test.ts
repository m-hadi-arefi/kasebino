import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ARCHITECTURE_SOURCE_OF_TRUTH,
  ARD_ROLE,
  CODING_RULES,
  COMPLETION_REQUIREMENTS,
  GOVERNANCE,
  IRANIAN_FIRST_GATE,
  PROPOSED_ADR_POLICY,
  SCHEDULING,
  assertIranianFirstGateForUx,
  assertMayWriteFeatureCode,
  isProductionHardDependAllowed,
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
