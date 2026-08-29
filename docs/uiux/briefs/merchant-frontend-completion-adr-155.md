# UIUX Brief — Merchant Frontend Completion + Dashboard · ADR-155 / ADR-021

**lang:** fa · **dir:** rtl · **persona:** صاحب مغازه / مدیر فروشگاه ایرانی  
**mobile:** 390px Android first  
**context:** سیستم عامل فروشگاهی کاسبینو — نبض کسب‌وکار، موجودی، ساعات کار، تصویر کالا

## Screens

1. `/dashboard` — «وضعیت کسب‌وکار الان» (فروش، روند درآمد، مشتریان، سفارش پیکاپ، کم‌موجودی)
2. `/inventory` — موجودی + کشوی «تاریخچه حرکت»
3. `/products/[id]` / new — بارگذاری / حذف تصویر کالا
4. `/stores/[id]/hours` — ساعات کاری شنبه تا جمعه
5. Mock routes gate — «این بخش هنوز در دسترس نیست»

## Copy samples (fa)

- داشبورد: «وضعیت کسب‌وکار» · «درآمد روزانه (تومان)» · «هنوز فروشی ثبت نشده»
- حرکت موجودی: «تاریخچه موجودی» · «فروش حضوری» · «اصلاح دستی موجودی»
- تصویر: «تصویر کالا» · «بارگذاری تصویر» · «حذف تصویر» · «PNG، JPEG، WebP یا GIF»
- ساعات: «ساعات کاری» · «بسته» · «ذخیره ساعات»
- در دسترس نیست: «این قابلیت هنوز به دفتر عملیاتی وصل نشده است. صندوق، موجودی و مشتریان همچنان کار می‌کنند.»

## States

| State | UI |
| --- | --- |
| loading | LoadingState فارسی |
| empty | EmptyState + CTA به مسیر بعدی |
| error | ErrorState با messageFa |
| permission | مخفی‌سازی اکشن‌ها / توضیح عدم دسترسی |
| fake finance | بنر + عدم نمایش صفر به‌عنوان حقیقت دفتری |

## Components

PageHeader, SectionHeader, StatCard, Empty/Error/LoadingState, Sheet, Alert, FormSection, TomanDisplay patterns, JalaliDateText / format helpers.

## Chart

Compact horizontal/bar trend from `revenue.days[]` — اطلاعات کسب‌وکار، نه تزئین. محور افقی روز شمسی کوتاه.

## A11y

- RTL logical spacing; `min-h-11` controls
- `aria-live` برای موفقیت/خطا و منبع مالی
- Icons for back/trend keep semantic direction

## Gate

uiuxpromax-integration + `docs/uiux/*` consulted. External binary optional.
