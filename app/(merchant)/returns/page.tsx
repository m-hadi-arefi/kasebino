"use client";

import React, { useState } from "react";

export default function ReturnsPage() {
  const [returns] = useState([
    {
      id: "ret-1",
      returnNumber: "RET-2026-001",
      type: "مشتری (برگشت از فروش)",
      originalRef: "فروش POS-881",
      amount: "250,000 تومان",
      date: "۱۴۰۴/۱۱/۲۴",
      status: "تکمیل شده",
    },
  ]);

  return (
    <div className="p-6 dir-rtl text-right font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            مرجوعی‌ها و بازگشت کالا
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ثبت مرجوعی مشتری یا تأمین‌کننده، بازگشت موجودی به لایه قیمت خرید اولیه و برگشت سند مالی
          </p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
          + ثبت مرجوعی جدید
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold">
            <tr>
              <th className="p-4">شماره مرجوعی</th>
              <th className="p-4">نوع</th>
              <th className="p-4">فاکتور مرجع</th>
              <th className="p-4">مبلغ برگشتی</th>
              <th className="p-4">تاریخ ثبت</th>
              <th className="p-4">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
            {returns.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-4 font-mono font-medium">{r.returnNumber}</td>
                <td className="p-4 font-medium text-slate-900 dark:text-white">{r.type}</td>
                <td className="p-4">{r.originalRef}</td>
                <td className="p-4 font-semibold text-rose-600 dark:text-rose-400">
                  {r.amount}
                </td>
                <td className="p-4">{r.date}</td>
                <td className="p-4">
                  <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium">
                    {r.status}
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
