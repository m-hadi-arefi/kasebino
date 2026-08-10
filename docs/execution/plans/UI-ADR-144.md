# UIUXProMax Brief: Staff Management (ADR-144)

## Context
**Target Users:** Merchant Owners (مغازه‌داران، صاحبان کسب‌وکار)
**Language/Direction:** Persian (`fa-IR`), RTL (`dir=rtl`)
**Mobile-First:** Yes, primary device is Android mobile phone (~390px width).

## Screens

### 1. Staff List (`app/(merchant)/staff/page.tsx`)
- **Title:** مدیریت کارمندان
- **Empty State:** هنوز کارمندی اضافه نکرده‌اید. (No staff added yet) with a prominent CTA to invite.
- **Layout (Mobile):** Stacked cards for each staff member.
- **Layout (Desktop):** Data table.
- **Data Displayed:** 
  - شماره موبایل (Phone number / AuthUser ID)
  - نقش (Role: مدیر فروشگاه, صندوقدار)
  - دسترسی شعب (Store access - comma separated list of store IDs or names)
  - وضعیت (Status: فعال, غیرفعال)
- **Actions:** 
  - `+ دعوت کارمند جدید` (Primary button)
  - `غیرفعال‌سازی` (Deactivate button for each active row)
  - `ویرایش دسترسی` (Edit access)

### 2. Invite Staff Dialog (`invite-staff-dialog.tsx`)
- **Type:** Modal / Dialog (from shadcn/ui)
- **Title:** دعوت کارمند جدید
- **Fields:**
  - `phone`: شماره موبایل (input type tel, dir=ltr for numbers but right aligned placeholder)
  - `role`: نقش (Select: مدیر فروشگاه (store_manager), صندوقدار (store_employee))
  - `storeIds`: شعب مجاز (Multi-select or checkboxes)
- **Validation:** 
  - Persian error messages (شماره موبایل نامعتبر است, انتخاب نقش الزامی است)
- **Actions:**
  - `ارسال دعوت‌نامه` (Submit)
  - `انصراف` (Cancel)

## Design Rules (ui-ux-pro-max)
- Use standard shadcn components (Button, Input, Select, Dialog, Table, Form).
- Follow brand colors and spacing.
- Forms use `react-hook-form` and `zod` for validation.
- All numbers displayed should preferably be Persian numerals, but inputs for phone number should handle standard digits.
