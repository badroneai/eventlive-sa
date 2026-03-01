# RELEASE-CHECKLIST.md

## 1) Pre-Release
- [ ] `npm install`
- [ ] `npm run validate`
- [ ] `npm run validate:gate`
- [ ] `npm run test:validation`
- [ ] `npm run build`
- [ ] `npm run qa:prod`
- [ ] مراجعة `reports/validation-report.md`
- [ ] مراجعة `reports/build-report.md`

## 2) Security & Quality
- [ ] لا توجد أخطاء Validation (`Total errors: 0`)
- [ ] تحذيرات الجودة ضمن الحد المسموح (`EVENTLIVE_MAX_WARNINGS`)
- [ ] لا توجد بيانات حساسة داخل `dist/index.html`
- [ ] فحص الحقول النصية لتفادي whitespace/duplicates
- [ ] تفعيل تحقق schema لحكم الإطلاق (`RELEASE_VERDICT_VALIDATE_SCHEMA=1`) داخل CI (workflow: `deploy.yml`)

## 3) UX Mobile Validation
- [ ] التأكد من عرض mobile cards تحت 768px
- [ ] التأكد من إمكانية استخدام الفلاتر بسهولة (tap targets)
- [ ] التأكد من عمل pagination على الهاتف
- [ ] توثيق before/after في تقرير منفصل

## 4) Deployment
- [ ] مراجعة تغييرات Git وملفات الوثائق
- [ ] دمج/دفع إلى branch الإطلاق
- [ ] مراقبة GitHub Actions حتى نجاح النشر
- [ ] التحقق من صفحة الإنتاج بعد النشر

## 5) Schema Regression Override Governance (`SCHEMA_REGRESSION_OVERRIDE`)
- [ ] لا يُستخدم override إلا في حالة طارئة موثقة (production blocker) على `master`/protected branch.
- [ ] المصرّح لهم: Release Manager أو Incident Commander فقط.
- [ ] يجب توثيق السبب قبل التفعيل في تذكرة/incident وربطها في وصف التشغيل.
- [ ] عند التفعيل يجب ضبط متغير CI: `SCHEMA_REGRESSION_OVERRIDE_INCIDENT=INC-###` (صيغة إلزامية).
- [ ] عند التفعيل، أنشئ/حدّث ملف incident داخل `04-Incidents/` مع:
  - سبب التجاوز
  - نطاق المخاطرة
  - خطة الاسترجاع أو الإصلاح
  - وقت إزالة الـ override
- [ ] بعد النشر: إزالة `SCHEMA_REGRESSION_OVERRIDE` فورًا (إرجاعه إلى `0`/فارغ) خلال نفس نافذة التغيير.
- [ ] تنفيذ Post-Release Follow-up خلال 24 ساعة: إصلاح السبب الجذري + إعادة تشغيل suite بدون override.

## 6) Go/No-Go
- **GO** إذا تحققت جميع البنود أعلاه.
- **NO-GO** عند أي فشل في gate أو regression tests أو QA الإنتاجي.
