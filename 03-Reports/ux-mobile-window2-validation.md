# UX Mobile Improvement — Window 2 (Before/After Validation)

## Before
- الجدول على الجوال كان مضغوطًا وصعب القراءة.
- كثافة أعمدة عالية مع scroll أفقي فعليًا/إدراكيًا.
- أزرار وفلاتر تحتاج لمس أدق في بعض الأجهزة.

## After
- تحويل العرض في الجوال (<768px) إلى **بطاقات** لكل سجل.
- إخفاء رأس الجدول في mobile واستخدام `data-label` لكل حقل.
- تكبير tap targets (inputs/buttons/selects) وتحسين pager layout.
- جعل شريط الفلاتر sticky لسهولة الوصول أثناء التصفح.

## Validation Notes
- File changed: `scripts/generate-site.mjs`
- Regenerated output: `dist/index.html`
- Manual checks completed:
  - البحث + الفلاتر تعمل في mobile mode.
  - pagination سليمة (السابق/التالي + page info).
  - قابلية قراءة أفضل بشكل واضح مقارنةً بوضع الجدول الكامل.

## Outcome
تحسين تجربة الجوال من «جدول كثيف» إلى «قائمة بطاقات تشغيلية» مناسبة لغرفة عمليات.
