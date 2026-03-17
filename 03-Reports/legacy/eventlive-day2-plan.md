# EventLive — Day 2 Plan (MVP Hardening)

## Goal
تحويل النسخة الحالية إلى تشغيل موثوق قبل الإطلاق الرسمي (Reliability + Clarity + Acceptance).

## Focus Areas
1. Data quality testing on additional samples.
2. Improve interactive UI for session state clarity (Now / Next / Ended).
3. Final launch acceptance checklist.

## First 3 Execution Tasks (High Priority)
1) **Data QA Expansion (2.5h)**
- إضافة 10-20 عينة جديدة متنوعة (OCR noise, missing values, time conflicts).
- تشغيل validator وإخراج تقرير أخطاء مصنّف حسب النوع.
- المخرج: `reports/data-qa-day2.md` + تحديث قواعد التنظيف.

2) **Session State UX Upgrade (2h)**
- إضافة منطق تصنيف كل جلسة: `now`, `next`, `ended` بناءً على الوقت الحالي.
- تحسين ألوان/شارات الحالة + فرز تلقائي للأولوية.
- المخرج: `dist/index.html` محسّن + تقرير UI قصير.

3) **Pre-Launch Acceptance Checklist (1.5h)**
- إعداد checklist نهائي: Data validity, build pass, deploy pass, link health, mobile view.
- توثيق Go/No-Go criteria للإطلاق.
- المخرج: `03-Reports/launch-acceptance-checklist.md`.

## Estimated Day-2 Total
- حوالي **6 ساعات** تنفيذ صافي.
