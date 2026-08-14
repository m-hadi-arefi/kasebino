"use client";

import React, { useState } from "react";

export default function ExpensesPage() {
  const [expenses] = useState([
    {
      id: "exp-1",
      categoryName: "اجاره",
      amount: "15,000,000 تومان",
      paymentMethod: "بانک",
      date: "۱۴۰۴/۱۱/۰۱",
      description: "اجاره ماهانه فروشگاه",
    },
    {
      id: "exp-2",
      categoryName: "قبوض",
      amount: "1,200,000 تومان",
      paymentMethod: "صندوق اصلی",
      date: "۱۴۰۴/۱۱/۱۰",
      description: "قبض برق و اینترنت",
    },
  ]);

  return (
    <div className="p-6 dir-rtl text-right font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            ثبت و مدیریت هزینه‌های فروشگاه
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            ثبت هزینه‌های عمومی، اجاره، قبوض و حقوق بر اساس دسته‌بندی و حساب پرداخت
          </p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
          + ثبت هزینه جدید
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-semibold">
            <tr>
              <th className="p-4">دسته‌بندی</th>
              <th className="p-4">مبلغ</th>
              <th className="p-4">منبع پرداخت</th>
              <th className="p-4">تاریخ ثبت</th>
              <th className="p-4">توضیحات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                <td className="p-4 font-bold text-slate-900 dark:text-white">
                  {e.categoryName}
                </td>
                <td className="p-4 font-semibold text-rose-600 dark:text-rose-400">
                  {e.amount}
                </td>
                <td className="p-4">{e.paymentMethod}</td>
                <td className="p-4">{e.date}</td>
                <td className="p-4 text-slate-500">{e.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
