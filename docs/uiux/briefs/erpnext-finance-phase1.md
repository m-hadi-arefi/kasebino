# UIUX Brief — ERPNext Finance (Phases 1–4) · ADR-141 / ADR-021

**lang:** fa · **dir:** rtl · **persona:** صاحب مغازه / مدیر فروشگاه (نه صندوقدار)  
**mobile:** 390px Android first  
**context:** مغازه خرده‌فروشی ایرانی — گزارش مالی از دفتر مالی، بدون ترک کاسبینو

## Screens

1. `/finance` — خلاصه مالی + وضعیت همگام‌سازی
2. `/finance/sync` — فهرست همگام‌سازی فاکتور/پرداخت
3. Customer profile section «نمای مالی» (جدا از وفاداری/CRM)

## Copy samples (fa)

- عنوان: «مالی»
- توضیح: «خلاصه درآمد و وضعیت اسناد مالی از دفتر مالی · مبلغ به تومان · تاریخ شمسی»
- وضعیت‌ها: «همگام»، «در انتظار»، «ناموفق»
- خالی: «هنوز سند مالی همگام نشده است»
- خطا: «دفتر مالی موقتاً در دسترس نیست. صندوق همچنان کار می‌کند.»
- مشتری: «مانده بدهی»، «فاکتورها»، «پرداخت‌ها» (نه امتیاز وفاداری)

## States

| State | UI |
| --- | --- |
| loading | LoadingState فارسی |
| empty | EmptyState + راهنمای همگام‌سازی فروش |
| error | ErrorState با messageFa |
| unavailable | بنر غیرمسدودکننده: همگام‌سازی بعدی خودکار |

## Components

PageHeader, StatCard, TomanDisplay, JalaliDateText, StatusChip, SectionHeader, Card rows, Error/Empty/Loading.

## A11y

- RTL logical spacing
- `aria-live` برای وضعیت همگام‌سازی
- کنتراست AA؛ دکمه‌ها `min-h-11`

## Gate

uiuxpromax-integration + docs/uiux/* consulted. External binary optional.
