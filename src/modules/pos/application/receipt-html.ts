/**
 * Persian RTL HTML receipt snapshot generator (ADR-111).
 * HTML preferred over PDF for MVP latency; stored in MinIO receipts bucket.
 */

import { formatPosJalaliDateTime, formatPosToman } from "../ui/format.js";
import type { Sale } from "../domain/sale.js";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TENDER_FA: Record<string, string> = {
  cash: "نقد",
  card_terminal: "کارتخوان",
  mixed: "ترکیبی",
};

export type ReceiptHtmlInput = {
  sale: Sale;
  storeDisplayName?: string | null;
};

/**
 * Build UTF-8 HTML receipt bytes (Persian + RTL + تومان + Jalali).
 */
export function renderSaleReceiptHtml(input: ReceiptHtmlInput): {
  body: Uint8Array;
  contentType: "text/html";
  filenameFa: string;
} {
  const { sale } = input;
  const storeName = input.storeDisplayName?.trim() || "فروشگاه";
  const when = formatPosJalaliDateTime(sale.completedAt ?? sale.createdAt);
  const tender = TENDER_FA[sale.tenderType] ?? sale.tenderType;
  const linesHtml = sale.lines
    .map((line) => {
      const unit = formatPosToman(line.unitPriceMinor);
      const total = formatPosToman(line.lineTotalMinor);
      return `<tr>
  <td>${escapeHtml(line.productName)}</td>
  <td dir="ltr">${line.quantity}</td>
  <td dir="ltr">${escapeHtml(unit)}</td>
  <td dir="ltr">${escapeHtml(total)}</td>
</tr>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>رسید فروش — ${escapeHtml(storeName)}</title>
  <style>
    body { font-family: Tahoma, "Segoe UI", sans-serif; margin: 1.5rem; color: #111; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    .meta { color: #444; font-size: 0.9rem; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { border-bottom: 1px solid #ddd; padding: 0.5rem; text-align: start; }
    th { font-size: 0.85rem; color: #555; }
    .total { font-weight: 700; font-size: 1.05rem; margin-top: 1rem; }
    .ref { font-family: ui-monospace, monospace; direction: ltr; unicode-bidi: isolate; }
  </style>
</head>
<body>
  <h1>رسید فروش — ${escapeHtml(storeName)}</h1>
  <div class="meta">
    <div>تاریخ: ${escapeHtml(when)}</div>
    <div>شماره رسید: <span class="ref">${escapeHtml(sale.id)}</span></div>
    <div>پرداخت: ${escapeHtml(tender)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>کالا</th>
        <th>تعداد</th>
        <th>فی</th>
        <th>جمع</th>
      </tr>
    </thead>
    <tbody>
${linesHtml}
    </tbody>
  </table>
  <p class="total">جمع کل: <span dir="ltr">${escapeHtml(formatPosToman(sale.totalAmountMinor))}</span></p>
  <p class="meta">واحد نمایش: تومان</p>
</body>
</html>
`;

  const body = new TextEncoder().encode(html);
  return {
    body,
    contentType: "text/html",
    filenameFa: `رسید-${sale.id.slice(0, 8)}.html`,
  };
}
