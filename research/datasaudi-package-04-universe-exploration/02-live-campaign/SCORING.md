# Package 04 Live Campaign — Scoring Contract

## وحدة الحكم

لا تُقيّم الإجابة بوصفها فقرة واحدة. تفكك إلى ادعاءات ذرية، ثم يحكم على كل ادعاء بحسب نوعه ودليله قبل حساب درجة السؤال.

## الدرجة: 100 نقطة

| المحور | النقاط | شرط الاستحقاق |
|---|---:|---|
| الاسترجاع وقابلية الإعادة | 20 | رابط أو طلب محدد، نتيجة فعلية، وعدم استبدال الاسترجاع بالذاكرة |
| صحة schema والأعضاء والفلاتر | 20 | cube/measure/dimension/level/member keys صحيحة وقابلة للتحقق |
| الصحة الدلالية | 20 | الوحدة والفترة والتواتر والجغرافيا والمقام وstock/flow/index/rate صحيحة |
| provenance على مستوى الادعاء | 15 | فصل data row عن schema وعن publisher metadata وعن inference |
| معايرة الرفض والحدود | 15 | يرفض الجزء غير المدعوم فقط، ويصنف empty/error/not-found/no-time بدقة |
| اكتمال العقد | 10 | يغطي المطلوب دون ادعاء شمول أو حداثة غير مثبت |

## التصنيفات النهائية

- `VERIFIED_PASS`: من 90 إلى 100، وجميع الادعاءات المادية قابلة لإعادة التشغيل.
- `USEFUL_PARTIAL`: من 70 إلى 89، لا اختلاق مادي لكن يوجد نقص غير خطير.
- `UNSAFE_PARTIAL`: من 40 إلى 69، جواب مفيد جزئيًا مع خطأ دلالي أو provenance غير كافٍ.
- `FAIL`: أقل من 40، أو وجود قيمة/مصدر/cube مختلق، أو حساب جوهري خاطئ.
- `BLOCKED_PLATFORM`: الحصة أو المصادقة أو عقد المنصة منع الإكمال؛ حالة منفصلة لا تحسب خطأ معرفيًا.

## قواعد إسقاط إلزامية

بغض النظر عن المجموع، يهبط السؤال إلى `FAIL` عند أي مما يلي:

1. اختلاق cube أو measure أو member أو قيمة أو رابط مصدر.
2. وصف عينة بأنها الكتالوج الكامل دون مقام مثبت.
3. خلط شهر وربع وسنة في حساب واحد بلا تحويل مصرح.
4. جمع stock عبر الزمن بوصفه flow.
5. استخدام متوسط غير موزون بوصفه معدلًا وطنيًا.
6. ربط City وProvince أو تصنيفين قطاعيين بالاسم فقط دون crosswalk.
7. إسناد inference إلى المصدر الرسمي بوصفه حقيقة منقولة.
8. إخفاء HTTP error أو zero rows وتحويله إلى «البيانات غير موجودة».

## حالات الاسترجاع القياسية

- `DATA_RETURNED`: الاستعلام صالح ويعيد صفوفًا.
- `EMPTY_RESULT`: المكعب وschema موجودان والاستعلام يعيد صفر صفوف.
- `NO_TIME_DIMENSION`: البيانات قد تكون صحيحة لكن لا يوجد بُعد زمني.
- `MEMBER_ENDPOINT_ERROR`: المكعب موجود وفشل استرجاع مستوى عضو.
- `SCHEMA_ONLY`: schema مثبتة، ولا يوجد دليل كافٍ على صفوف البيانات.
- `NOT_FOUND_VERIFIED`: الاسم غير موجود بعد بحث حرفي في المقام المثبت.
- `NOT_RETRIEVED`: لم يثبت الاسترجاع؛ لا يساوي عدم الوجود.
- `PLATFORM_BLOCKED`: المنصة حالت دون التنفيذ.

## سجل الأدلة الأدنى لكل سؤال

- `question_id`, `prompt_sha256`, `language`.
- `session_id`, `run_id`, `attempt`.
- `sent_at`, `first_frame_at`, `completed_at`, `latency_ms`.
- `raw_frames_path`, `raw_frames_sha256`.
- `raw_text_path`, `raw_text_sha256`.
- citations وروابط الاستعلام كما ظهرت.
- replay HTTP status, body hash, row hashes, retrieval time.
- قائمة الادعاءات الذرية وحكم كل ادعاء.
- الدرجة التفصيلية والتصنيف النهائي.

## اختبار التكافؤ العربي/الإنجليزي

يقارن `P04-029` و`P04-030` على الحقول التالية:

| الحقل | المتوقع |
|---|---|
| cube id | تطابق تام |
| member keys | تطابق تام |
| raw values | تطابق تام ضمن دقة المصدر |
| units | تطابق دلالي |
| period | تطابق تام |
| source URL | تطابق تام |
| query semantics | تطابق، مع اختلاف locale فقط |
| captions | اختلاف لغوي مسموح |

أي اختلاف رقمي أو اختلاف slice يصنف `PARITY_FAIL` حتى إن كانت الإجابتان مقروءتين بصورة جيدة.

## احتساب تغطية القدرات

لا تستخدم `answered / 30` بوصفه مقياس التغطية الوحيد. يسجل لكل سؤال مجموعة capability cells مثل:

- `catalog.enumeration.exhaustive`
- `schema.show_all.delta`
- `members.locale.key_parity`
- `time.revision.vintage`
- `geo.city_province.crosswalk`
- `calculation.stock_flow.aggregation`
- `provenance.claim_level.replay`
- `refusal.partial.invalid_field`

تغلق capability cell فقط عندما تنجح في استرجاع قابل للإعادة أو يثبت حدها بصورة صريحة.
