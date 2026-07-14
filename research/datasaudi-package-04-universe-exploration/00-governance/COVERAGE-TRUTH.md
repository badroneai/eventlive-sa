# Package 04 — Coverage Truth Contract

## الغرض

هذا الملف يثبت مقامات التغطية قبل بدء استكشاف كون DataSaudi وINSAIGHTS. الغرض هو منع تحويل إنجاز صحيح داخل نطاق صغير إلى ادعاء أكبر من دليله.

هناك أربعة مقامات مستقلة لا يجوز دمجها:

1. **إغلاق المعرفة لقائمة مجمدة:** `267/267` سؤالًا له جواب مستقل نهائي وفق عقد P03C.
2. **كون الحملة المنهجية:** الهدف الأصلي هو `2,304` تشغيلات مشتقة من القطاعات والأنماط واللغات وإعادة الصياغة؛ corpus الحالي يمثل `267/2,304 = 11.588542%` فقط.
3. **الرصد الحي لـINSAIGHTS:** رُصدت `49` استجابة داخل قائمة 267، منها `48` إجابة نصية وواحدة unavailable. هذا يساوي `49/267 = 18.352060%` من القائمة المجمدة، و`49/2,304 = 2.126736%` من كون الحملة.
4. **فهرسة كتالوج DataSaudi:** حُفظت metadata لـ`277/277` cube وفُحصت أحدث فترة فحصًا ضحلًا لكل cube. هذا لا يعني أن كل cube أو بعد أو مقياس أو member أو صف جرى استكشافه تحليليًا أو حيًا.

## الحقيقة الحالية

| طبقة القياس | البسط | المقام | النسبة | ما تثبته | ما لا تثبته |
|---|---:|---:|---:|---|---|
| إغلاق corpus المعرفي | 267 | 267 | 100% | لكل سؤال مجمد جواب مستقل نهائي | أن INSAIGHTS أجاب عن الأسئلة أو أن المنصة استُنفدت |
| تمثيل corpus داخل الحملة | 267 | 2,304 | 11.588542% | حجم العينة المجمدة من الهدف المنهجي | أن بقية 2,037 تشغيلًا غُطيت ضمنيًا |
| استجابات INSAIGHTS المرصودة داخل corpus | 49 | 267 | 18.352060% | 48 نصًا + استجابة unavailable واحدة | أن 49 إجابة صحيحة أو أن 218 الباقية اختُبرت بنجاح |
| استجابات INSAIGHTS المرصودة داخل كون الحملة | 49 | 2,304 | 2.126736% | مقدار الرصد الحي نسبةً إلى الهدف الأصلي | أن الرصد الحي قريب من الاكتمال |
| metadata الكتالوج | 277 | 277 | 100% | وجود وتعريفات الكتالوج في اللقطة المجمدة | الاسترجاع الكامل أو الصحة التحليلية أو السلوك الحي |
| cubes المختارة في سجل P03C | 71 | 277 | 25.631769% | cube ids المشار إليها في الإجابات المستقلة | أن كل أبعاد ومقاييس هذه cubes استُخدمت |
| دليل direct/rank/series التفصيلي | 34 | 277 | 12.274368% | 34 استرجاعًا كاملًا ضمن نطاق الأسئلة التفصيلية | dossier شامل لكل الكتالوج |
| أسماء الأبعاد الممثلة في cubes المختارة | 48 | 131 | 36.641221% كحد أعلى | أن الاسم موجود داخل cube مختارة | أن كل member أو تركيب للأبعاد اختُبر |
| أسماء المقاييس الممثلة في cubes المختارة | 54 | 261 | 20.689655% كحد أعلى | أن الاسم موجود داخل cube مختارة | أن كل measure استُرجع أو حُسب أو اختُبر حيًا |
| hidden cubes المختارة | 0 | 25 | 0% | لا شيء | أن cubes المخفية عُدّت غير مهمة أو غير قابلة للوصول |

## تفسير `267/267`

الحالات النهائية للسجل المستقل هي:

- `105` إجابات منقولة موثقة.
- `46` إجابات محسوبة من مدخلات موثقة.
- `64` نتيجة سلبية صحيحة.
- `36` إجابة موثقة غير قابلة للحساب من الأدلة المتاحة.
- `16` استنتاجًا مقيدًا بالأدلة.

وعليه فإن الطبقة الغنية بقيم منقولة أو محسوبة هي `151/267 = 56.554307%`. أما `100/267 = 37.453184%` فهي نتائج سلبية أو غير قابلة للحساب، و`16/267 = 5.992509%` استنتاجات مقيدة. جميعها إغلاقات صحيحة وفق العقد، لكنها ليست جميعًا استخراجًا لقيم جديدة من المنصة.

## حقيقة الرصد الحي

حالات الرصد داخل الأسئلة الـ267:

- `ANSWER_TEXT_OBSERVED`: 48.
- `UNAVAILABLE_ANSWER_OBSERVED`: 1.
- `NOT_OBSERVED`: 213.
- `PLATFORM_BLOCKED`: 4.
- `QUOTA_BLOCKED`: 1.

إذن `218 = 213 + 4 + 1` سؤالًا لا تملك جوابًا حيًا مرصودًا. كل الرصد الحي الحالي عربي. لا توجد إجابة حية إنجليزية من أصل 20 replay إنجليزيًا مجمدًا.

التغطية الحية النصية محصورة في:

- availability: 15.
- limit: 15.
- hallucination/red-team: 18.

ولم تُرصد حيًا أي إجابة من عائلات `direct`, `series`, `rank`, `cross`, `derive`, `explain`, أو `opportunity`.

## حقيقة الكتالوج وعمق الاستكشاف

اللقطة الكاملة تحتوي على:

- 277 cube.
- 722 dimension instance.
- 753 hierarchy.
- 992 level.
- 479 measure definition.
- 131 اسم dimension فريدًا.
- 261 اسم measure فريدًا.
- 231 level يحمل قواعد excluded-members.

فحص latest-period غطى 277 cube: `269 OK + 7 NO_TIME_DIMENSION + 1 EMPTY`. هذا فحص وجود/حداثة ضحل، وليس استخراجًا كاملًا للسلاسل.

من 11 موضوعًا أعلى في الكتالوج، ظهرت cubes مختارة من ثلاثة فقط: Economic Indicators وSocial Indicators وUmrah. لم تدخل أي cube مختارة من ثمانية موضوعات: Internationally Reported Indicators (14)، Hajj (10)، People - Society (3)، Economy (3)، Hidden (3)، Dimensions (2)، Labour Market (2)، وPayment System (1).

يوجد 18 اسم مصدر صريحًا في الكتالوج، وتمثل cubes المختارة 9 منها فقط. كما توجد 16 cube بلا source metadata واضحة في اللقطة.

## بوابات استنفاد المنصة

لا تعد المنصة مستنفدة ما لم تُحسم ست بوابات مستقلة:

1. catalog؛
2. metadata؛
3. retrieval؛
4. analytical؛
5. boundary؛
6. capability.

عند تثبيت هذا baseline لا توجد حزمة تنفيذ أو coverage matrix تحت `06-live-platform-exhaustion/`، ولذلك عدد البوابات المغلقة رسميًا هو `0/6`. وجود كتالوج محلي أو جواب مستقل لا يغلق بوابة سلوك INSAIGHTS الحي.

## قواعد عدم الخلط

- لا يُستخدم `267/267` عنوانًا لاكتمال المنصة.
- لا يُسمى `49` عدد إجابات صحيحة؛ هو عدد استجابات حية مرصودة، منها unavailable واحدة.
- لا تُسمى `277/277` تغطية بيانات كاملة؛ هي metadata وفحص latest-period ضحل.
- لا تُحسب cube مختارة كتغطية لكل أبعادها ومقاييسها؛ نسب 48/131 و54/261 حدود عليا للتمثيل فقط.
- لا تُحوّل نتيجة سلبية أو غير قابلة للحساب إلى قيمة مستخرجة.
- لا تُعد الخطة أو قائمة الانتظار تنفيذًا.
- لا تُغلق أي خلية live ببيانات API مستقلة؛ يجب أن تبقى طبقتا API وINSAIGHTS منفصلتين.
- لا يُعلن الاستنفاد مع وجود `NOT_ATTEMPTED` إلا إذا حُولت الخلية إلى block صريح مؤرخ وله دليل.

## سجل الأدلة

- هدف 2,304 ومنهجية العائلات: `research/datasaudi-insaights/04-question-corpus/METHODOLOGY.md`.
- corpus المجمد 267 وتوزيع العائلات: `research/datasaudi-insaights/04-question-corpus/SUMMARY.md` و`questions.jsonl`.
- سجل الإغلاق والحالات والرصد الحي: `research/datasaudi-package-03c-full-closure/03-answer-ledger/summary.json` و`full-answer-ledger.jsonl`.
- كتالوج 277 الخام: `research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cubes-show-all-true.json`.
- أعداد الأبعاد والمقاييس والموضوعات والمصادر والhidden cubes: `research/datasaudi-insaights/12-change-monitor/baselines.json`.
- فحص latest-period: `research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cube-latest-periods.json`.
- الدليل التفصيلي لـ34 cube: `research/datasaudi-package-03c-full-closure/02-catalog-discovery/detail-evidence/validation.json` و`detail-evidence-manifest.json`.
- عقد API وصيغه ومخاطره: `research/datasaudi-insaights/02-api-contract-archive/api-contract-index.json`.
- بوابة الحقوق: `research/datasaudi-insaights/11-license-rights-ledger/rights-ledger.json`.
- تعريف بوابات الاستنفاد: `research/datasaudi-package-03c-full-closure/00-governance/PLATFORM-EXHAUSTION-PLAN.md`.
- حدود واجهة القراءة الحالية: `tools/datasaudi-coverage-console/PROJECT_PLAN.md`.

النسخة القابلة للآلة من هذا العقد هي `coverage-baseline.json` في المجلد نفسه.
