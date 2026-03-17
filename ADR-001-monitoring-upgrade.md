# ADR-001: Monitoring Upgrade for EventLive Pipeline

- **Status:** Accepted
- **Date:** 2026-02-24

## Context
EventLive يعتمد على خط أنابيب بسيط لكنه حساس لجودة البيانات. كانت المراقبة تركز على pass/fail فقط، بدون رؤية كافية للتحذيرات والانحدارات التدريجية.

## Decision
اعتماد ترقية مراقبة على مستويين:
1. **Hard Gate** للأخطاء الحرجة (errors/error-rate).
2. **Soft Guardrail** للتحذيرات (warnings threshold) مع إمكانية ضبطها عبر متغيرات بيئة.

مع توسيع التحقق داخل validator ليشمل:
- duplicate IDs
- تناسق السعة مع المقاعد المتاحة
- اكتشاف whitespace anomalies في العناوين
- تقرير تحذيرات منفصل

## Consequences
### Positive
- كشف مبكر لانحدار الجودة قبل الإنتاج.
- رؤية تشغيلية أوضح عبر metrics في `validation-report.md`.
- سهولة الضبط حسب البيئة عبر ENV.

### Negative
- حساسية أعلى قد توقف الإطلاقات أكثر في البداية.
- الحاجة لإدارة baseline للتحذيرات بمرور الوقت.

## Alternatives Considered
1. الاكتفاء بفحص schema الحالي (مرفوض: لا يغطي تناسق domain logic).
2. اعتماد مكتبة خارجية شاملة فورًا (مؤجل: زيادة تعقيد غير ضرورية للمرحلة الحالية).

## Follow-up
- إضافة dashboard خفيف لاحقًا من `reports/*.md`.
- تقييم إدخال Ajv تدريجيًا مع test harness أوسع.
