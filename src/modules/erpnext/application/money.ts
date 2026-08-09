/**
 * Shared تومان display for finance ACL (Iranian First).
 */

export function formatTomanFromMinor(amountMinor: string | number | bigint): string {
  let n: number;
  if (typeof amountMinor === "bigint") {
    n = Number(amountMinor);
  } else if (typeof amountMinor === "number") {
    n = amountMinor;
  } else {
    n = Number(amountMinor);
  }
  if (!Number.isFinite(n)) n = 0;
  // MOS stores IRR minor as integer rials; display تومان (÷10) common IR retail.
  const toman = Math.round(n / 10);
  return new Intl.NumberFormat("fa-IR").format(toman) + " تومان";
}

export function moneyOf(amountMinor: string) {
  return {
    amountMinor: String(amountMinor),
    currency: "IRR" as const,
    displayToman: formatTomanFromMinor(amountMinor),
  };
}
