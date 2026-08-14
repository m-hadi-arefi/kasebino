"use client";

import React, { useState } from "react";

export default function TreasuryPage() {
  const [registers] = useState([
    {
      id: "reg-1",
      name: "صندوق اصلی فروشگاه",
      openingBalance: "1,000,000 تومان",
      currentBalance: "4,400,000 تومان",
      status: "باز",
    },
  ]);

  const [bankAccounts] = useState([
    {
      id: "bank-1",
      bankName: "بانک ملت",
      accountNumber: "8899001122",
      cardNumber: "۶۱۰۴-۳۳۷۸-۹۰۱۲-۳۴۵۶",
      balance: "25,000,000 تومان",
    },
  ]);

  return (
    <div className="p-6 dir-rtl text-right font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            خزانه‌داری، صندوق‌ها و حساب‌های بانکی
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            مدیریت صندوق‌های فروش، بستن صندوق روزانه، حساب‌های بانکی و انتقال وجه
          </p>
        </div>
        <div className="flex space-x-3 space-x-reverse">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
            انتقال وجه بین حساب‌ها
          </button>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
            بستن صندوق و مغایرت‌گیری
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Registers Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            صندوق‌های فروش
          </h2>
          <div className="space-y-4">
            {registers.map((r) => (
              <div
                key={r.id}
                className="p-4 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{r.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    موجودی اول دوره: {r.openingBalance}
                  </p>
                </div>
                <div className="text-left">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    {r.currentBalance}
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 font-medium">
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bank Accounts Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            حساب‌های بانکی
          </h2>
          <div className="space-y-4">
            {bankAccounts.map((b) => (
              <div
                key={b.id}
                className="p-4 border border-slate-100 dark:border-slate-800 rounded-lg flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30"
              >
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{b.bankName}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{b.cardNumber}</p>
                </div>
                <div className="text-left">
                  <div className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                    {b.balance}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
