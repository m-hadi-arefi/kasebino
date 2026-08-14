"use client";

import React, { useState } from "react";

export default function SuppliersPage() {
  const [suppliers] = useState([
    {
      id: "sup-1",
      name: "شرکت بازرگانی پارس",
      contactName: "علی محمدی",
      phone: "۰۹۱۲۱۱۱۲۲۳۳",
      balance: "15,000,000 تومان (بدهکاریم)",
      status: "فعال",
    },
    {
      id: "sup-2",
      name: "پخش خزر",
      contactName: "رضا رضایی",
      phone: "۰۹۱۲۴۴۴۵Direct",
      balance: "0 تومان",
      status: "فعال",
    },
  ]);

  return (
    <div className="p-6 dir-rtl text-right font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            لیست تأمین‌کنندگان و بدهی‌ها (AP)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            مدیریت مشخصات تأمین‌کنندگان، کد اقتصادی، گردش حساب و بدهی‌های تجاری
          </p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
          + افزودن تأمین‌کننده
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold">
            <tr>
              <th className="p-4">نام تامین‌کننده</th>
              <th className="p-4">شخص رابط</th>
              <th className="p-4">تلفن تماس</th>
              <th className="p-4">مانده حساب (AP)</th>
              <th className="p-4">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-4 font-bold text-slate-900 dark:text-white">{s.name}</td>
                <td className="p-4">{s.contactName}</td>
                <td className="p-4 font-mono">{s.phone}</td>
                <td className="p-4 font-semibold text-amber-600 dark:text-amber-400">
                  {s.balance}
                </td>
                <td className="p-4">
                  <span className="inline-block px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium">
                    {s.status}
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
