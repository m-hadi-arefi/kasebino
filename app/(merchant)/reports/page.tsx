"use client";

import React, { useState } from "react";

export default function ReportsPage() {
  const [metrics] = useState({
    totalRevenue: "150,000,000 تومان",
    totalCogs: "90,000,000 تومان",
    grossProfit: "60,000,000 تومان",
    expenses: "15,000,000 تومان",
    netProfit: "45,000,000 تومان",
    stockValue: "480,000,000 تومان",
    customerDebt: "16,000,000 تومان",
    supplierDebt: "35,000,000 تومان",
  });

  return (
    <div className="p-6 dir-rtl text-right font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          گزارش‌های عملیاتی، سود و ارزش موجودی
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          مشاهده سود ناخالص، سود خالص، ارزش روز موجودی انبار بر اساس لایه‌های FIFO و سررسید بدهی‌ها
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium">فروش کل (درآمد)</div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
            {metrics.totalRevenue}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium">بهای تمام‌شده (COGS)</div>
          <div className="text-xl font-extrabold text-slate-700 dark:text-slate-300 mt-2">
            {metrics.totalCogs}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium">سود ناخالص</div>
          <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {metrics.grossProfit}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="text-xs text-slate-500 font-medium">سود خالص عملیاتی</div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-2">
            {metrics.netProfit}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            ارزش و سن موجودی انبار
          </h2>
          <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              ارزش کل موجودی کالا (بر اساس قیمت خرید لایه‌ها)
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.stockValue}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            خلاصه بدهکاران و طلبکاران
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                طلب از مشتریان (بدهکاران)
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {metrics.customerDebt}
              </span>
            </div>
            <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                بدهی به تأمین‌کنندگان (طلبکاران)
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {metrics.supplierDebt}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
