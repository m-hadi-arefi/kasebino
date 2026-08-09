/**
 * MerchantOS Quantity / UOM foundation (ADR-126).
 *
 * Vendor-neutral retail units — not ERPNext's UOM model.
 * Stock/sale OLTP columns remain integer for piece products;
 * scaled amounts prepare weight-based products (kg/g).
 */

export const MERCHANTOS_UNIT_CODES = [
  "piece",
  "kg",
  "g",
  "box",
] as const;

export type MerchantOsUnitCode = (typeof MERCHANTOS_UNIT_CODES)[number];

export type UnitOfMeasure = {
  readonly code: MerchantOsUnitCode;
  /** Decimal places for amounts in this unit (piece=0, kg=3, g=0). */
  readonly scale: number;
  readonly labelFa: string;
};

export const UNITS: Record<MerchantOsUnitCode, UnitOfMeasure> = {
  piece: { code: "piece", scale: 0, labelFa: "عدد" },
  kg: { code: "kg", scale: 3, labelFa: "کیلوگرم" },
  g: { code: "g", scale: 0, labelFa: "گرم" },
  box: { code: "box", scale: 0, labelFa: "جعبه" },
};

/**
 * Scaled integer quantity: amount = numericValue * 10^scale.
 * Example: 1.750 kg → { unit: "kg", amountScaled: 1750, scale: 3 }
 */
export type Quantity = {
  readonly unit: MerchantOsUnitCode;
  readonly amountScaled: bigint;
  readonly scale: number;
};

export type PackHint = {
  readonly packUnit: MerchantOsUnitCode;
  readonly baseUnit: MerchantOsUnitCode;
  /** How many base units in one pack (e.g. 12 pieces per box). */
  readonly baseUnitsPerPack: number;
};

export function isMerchantOsUnitCode(value: string): value is MerchantOsUnitCode {
  return (MERCHANTOS_UNIT_CODES as readonly string[]).includes(value);
}

export function requireUnit(code: string): UnitOfMeasure {
  if (!isMerchantOsUnitCode(code)) {
    throw new Error(`Unknown MerchantOS unit code: ${code}`);
  }
  return UNITS[code];
}

/** Build quantity from a decimal-like number (JS number; prefer string for money-class precision). */
export function quantityFromNumber(
  unit: MerchantOsUnitCode,
  value: number,
  scale: number = UNITS[unit].scale,
): Quantity {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Quantity value must be a non-negative finite number");
  }
  if (!Number.isInteger(scale) || scale < 0 || scale > 6) {
    throw new Error("Quantity scale must be an integer 0..6");
  }
  const factor = 10 ** scale;
  const amountScaled = BigInt(Math.round(value * factor));
  return { unit, amountScaled, scale };
}

export function quantityFromScaled(
  unit: MerchantOsUnitCode,
  amountScaled: bigint,
  scale: number = UNITS[unit].scale,
): Quantity {
  if (amountScaled < 0n) {
    throw new Error("Quantity amountScaled must be >= 0");
  }
  if (!Number.isInteger(scale) || scale < 0 || scale > 6) {
    throw new Error("Quantity scale must be an integer 0..6");
  }
  return { unit, amountScaled, scale };
}

/** Integer piece helper — current POS/stock path. */
export function pieces(count: number): Quantity {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Piece quantity must be a non-negative integer");
  }
  return { unit: "piece", amountScaled: BigInt(count), scale: 0 };
}

export function toNumber(q: Quantity): number {
  const factor = 10 ** q.scale;
  return Number(q.amountScaled) / factor;
}

/** Convert between g and kg. Other conversions require PackHint or same unit. */
export function convertQuantity(
  q: Quantity,
  targetUnit: MerchantOsUnitCode,
  pack?: PackHint,
): Quantity {
  if (q.unit === targetUnit) {
    return quantityFromScaled(targetUnit, q.amountScaled, UNITS[targetUnit].scale);
  }

  if (q.unit === "kg" && targetUnit === "g") {
    // kg scale 3 → grams as integer (1.750 kg = 1750 g)
    const grams = q.scale === 3 ? q.amountScaled : BigInt(Math.round(toNumber(q) * 1000));
    return quantityFromScaled("g", grams, 0);
  }

  if (q.unit === "g" && targetUnit === "kg") {
    return quantityFromScaled("kg", q.amountScaled, 3);
  }

  if (pack) {
    if (
      q.unit === pack.packUnit &&
      targetUnit === pack.baseUnit &&
      Number.isInteger(pack.baseUnitsPerPack) &&
      pack.baseUnitsPerPack > 0
    ) {
      return quantityFromScaled(
        pack.baseUnit,
        q.amountScaled * BigInt(pack.baseUnitsPerPack),
        UNITS[pack.baseUnit].scale,
      );
    }
    if (
      q.unit === pack.baseUnit &&
      targetUnit === pack.packUnit &&
      Number.isInteger(pack.baseUnitsPerPack) &&
      pack.baseUnitsPerPack > 0
    ) {
      if (q.amountScaled % BigInt(pack.baseUnitsPerPack) !== 0n) {
        throw new Error("Quantity does not convert evenly into pack units");
      }
      return quantityFromScaled(
        pack.packUnit,
        q.amountScaled / BigInt(pack.baseUnitsPerPack),
        UNITS[pack.packUnit].scale,
      );
    }
  }

  throw new Error(`Unsupported unit conversion: ${q.unit} → ${targetUnit}`);
}

/** Piece path integer for legacy stock/sale columns. */
export function assertPieceIntegerQuantity(q: Quantity): number {
  if (q.unit !== "piece" || q.scale !== 0) {
    throw new Error("Legacy stock path requires piece quantity with scale 0");
  }
  const n = Number(q.amountScaled);
  if (!Number.isSafeInteger(n)) {
    throw new Error("Piece quantity exceeds safe integer range");
  }
  return n;
}
