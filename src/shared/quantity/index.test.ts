import { describe, expect, it } from "vitest";

import {
  assertPieceIntegerQuantity,
  convertQuantity,
  pieces,
  quantityFromNumber,
  toNumber,
  UNITS,
} from "./index.js";

describe("ADR-126 Quantity / UOM", () => {
  it("represents integer pieces for legacy POS path", () => {
    const q = pieces(3);
    expect(q.unit).toBe("piece");
    expect(assertPieceIntegerQuantity(q)).toBe(3);
    expect(UNITS.piece.labelFa).toBe("عدد");
  });

  it("supports fractional kg with scale 3", () => {
    const q = quantityFromNumber("kg", 1.75);
    expect(q.amountScaled).toBe(1750n);
    expect(q.scale).toBe(3);
    expect(toNumber(q)).toBeCloseTo(1.75);
  });

  it("converts kg ↔ g", () => {
    const kg = quantityFromNumber("kg", 1.75);
    const g = convertQuantity(kg, "g");
    expect(g.unit).toBe("g");
    expect(g.amountScaled).toBe(1750n);
    expect(toNumber(convertQuantity(g, "kg"))).toBeCloseTo(1.75);
  });

  it("converts box ↔ piece with pack hint", () => {
    const box = pieces(2);
    const asBox = { ...box, unit: "box" as const };
    const pack = {
      packUnit: "box" as const,
      baseUnit: "piece" as const,
      baseUnitsPerPack: 12,
    };
    const total = convertQuantity(asBox, "piece", pack);
    expect(assertPieceIntegerQuantity(total)).toBe(24);
  });

  it("rejects negative quantities", () => {
    expect(() => quantityFromNumber("kg", -1)).toThrow(/non-negative/);
  });
});
