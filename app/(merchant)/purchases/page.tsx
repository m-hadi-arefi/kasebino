"use client";

import React, { useState } from "react";

export default function PurchasesPage() {
  const [purchases] = useState([
    {
      id: "pur-101",
      purchaseNumber: "PUR-2026-001",
      supplierName: "شرکت بازرگانی پارس",
      purchaseDate: "۱۴۰۴/۱۱/۲۳",
      totalMinor: "150,000,000 تومان",
      status: "تأیید شده",
      paymentStatus: "پرداخت شده",
    },
    {
      id: "pur-102",
      purchaseNumber: "PUR-2026-002",
      supplierName: "پخش خزر",
      purchaseDate: "۱۴۰۴/۱۱/۲۴",
      totalMinor: "85,000,000 تومان",
      status: "پیش‌نویس",
      paymentStatus: "پرداخت نشده",
    },
  ]);

  return (
    <div className="p-6 dir-rtl text-right font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            مدیریت خریدها و فاکتورهای تامین‌کننده
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ثبت فاکتور خرید، ورود کالا به انبار و تخصیص لایه‌های قیمت خرید (FIFO/LIFO)
          </p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
          + ثبت خرید جدید
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold">
            <tr>
              <th className="p-4">شماره فاکتور</th>
              <th className="p-4">تأمین‌کننده</th>
              <th className="p-4">تاریخ خرید</th>
              <th className="p-4">مبلغ کل</th>
              <th className="p-4">وضعیت</th>
              <th className="p-4">وضعیت پرداخت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-4 font-mono font-medium">{p.purchaseNumber}</td>
                <td className="p-4 font-medium text-slate-900 dark:text-white">
                  {p.supplierName}
                </td>
                <td className="p-4">{p.purchaseDate}</td>
                <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">
                  {p.totalMinor}
                </td>
                <td className="p-4">
                  <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium">
                    {p.status}
                  </span>
                </td>
                <td className="p-4">
                  <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {p.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
