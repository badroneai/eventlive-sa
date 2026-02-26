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

## 5) Go/No-Go
- **GO** إذا تحققت جميع البنود أعلاه.
- **NO-GO** عند أي فشل في gate أو regression tests أو QA الإنتاجي.
