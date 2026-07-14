import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const REPO = process.cwd();
const SHARD = path.resolve(
  "research/datasaudi-package-04-universe-exploration/04-adjudication/shard-b",
);
const EVIDENCE = path.join(SHARD, "evidence");
const TRANSCRIPTS = path.resolve(
  "research/datasaudi-package-04-universe-exploration/03-live-observations/runs/p04-live-20260715-window4/transcripts.jsonl",
);
const FRAMES = path.resolve(
  "research/datasaudi-package-04-universe-exploration/03-live-observations/runs/p04-live-20260715-window4/websocket-frames.jsonl",
);
const SCORING =
  "research/datasaudi-package-04-universe-exploration/02-live-campaign/SCORING.md";
const DERIVED =
  "research/datasaudi-package-04-universe-exploration/04-adjudication/shard-b/evidence/derived-verification.json";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const readJsonl = async (file) =>
  (await readFile(file, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const rel = (file) => path.relative(REPO, file);

const transcriptText = await readFile(TRANSCRIPTS, "utf8");
const framesText = await readFile(FRAMES, "utf8");
const transcripts = transcriptText
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((record) => {
    const number = Number(record.question_id?.split("-").at(-1));
    return number >= 13 && number <= 21;
  });
const requests = await readJsonl(path.join(EVIDENCE, "requests.jsonl"));
const derivedText = await readFile(path.join(EVIDENCE, "derived-verification.json"), "utf8");
const derived = JSON.parse(derivedText);
const runSummary = await readJson(path.join(EVIDENCE, "run-summary.json"));
const rowHashesText = await readFile(path.join(EVIDENCE, "row-hashes.jsonl"), "utf8");
const transcriptSha = sha256(transcriptText);
const framesSha = sha256(framesText);
const derivedSha = sha256(derivedText);
const rowHashesSha = sha256(rowHashesText);
const adjudicatedAt = new Date().toISOString();

const axes = {
  retrieval: { key: "retrieval_reproducibility", max: 20, label: "الاسترجاع وقابلية الإعادة" },
  schema: { key: "schema_members_filters", max: 20, label: "صحة schema والأعضاء والفلاتر" },
  semantics: { key: "semantic_accuracy", max: 20, label: "الصحة الدلالية" },
  provenance: { key: "claim_level_provenance", max: 15, label: "provenance على مستوى الادعاء" },
  refusal: { key: "boundary_calibration", max: 15, label: "معايرة الرفض والحدود" },
  completeness: { key: "contract_completeness", max: 10, label: "اكتمال العقد" },
};

const grades = {
  "P04-013": {
    verdict: "UNSAFE_PARTIAL",
    points: [12, 13, 11, 6, 12, 6],
    rationales: [
      "لا توجد روابط API أو طلبات schema محددة في الجواب؛ الاسترجاع يعاد فقط عبر دليل التدقيق الخارجي.",
      "الغياب صحيح في schema الحية، لكن الجواب لم يسم الحقول/المسارات التي فحصها.",
      "حد vintage صحيح، لكن وصف الاستبدال الداخلي للقيم القديمة غير مثبت من السطح العام.",
      "إحالة عامة إلى Data Explorer لا تسند ادعاء غياب الحقول أو سلوك التخزين على مستوى الادعاء.",
      "رفض إعادة بناء الماضي صحيح، لكنه تجاوز الدليل حين وصف كيفية تحديث المخزن الداخلي.",
      "غابت قائمة endpoint/field evidence المطلوبة، وأضيف تحليل تخزيني غير قابل للإثبات.",
    ],
    forced: [],
    requests: ["openapi-live", "schema-gastat_gdp", "schema-gastat_inflation"],
    claims: [
      ["VERIFIED", "لا تعرض schema الحية لـ gastat_gdp وgastat_inflation حقول vintage/revision/release_timestamp."],
      ["VERIFIED", "لا يوجد مسار vintage/revision/snapshot في عقد OpenAPI العام المفحوص."],
      ["UNSUPPORTED", "المنصة تستبدل القيم القديمة داخليًا وتعرض أحدث قيمة فقط."],
      ["VERIFIED_INFERENCE", "إثبات المراجعات تاريخيًا يتطلب لقطات خارجية ما دام السطح الحالي بلا vintage."],
    ],
    falseCompleteness: [
      "GENERIC_EXPLORER_LINK_PRESENTED_AS_SCHEMA_PROOF",
      "UPSTREAM_MUTATION_BEHAVIOR_ASSERTED_WITHOUT_EVIDENCE",
      "REQUESTED_FIELD_AND_ENDPOINT_NAMES_NOT_ENUMERATED",
    ],
    provenanceGaps: [
      "لا توجد URL حية لـ /cubes/{cube} أو OpenAPI في الجواب.",
      "لا فصل بين غياب الحقل المرصود والاستنتاج عن سلوك قاعدة البيانات الداخلية.",
    ],
    report: "الحد المعرفي الأساسي صحيح، لكن الجواب حوّل غياب metadata إلى قصة غير مثبتة عن استبدال القيم داخل المخزن.",
  },
  "P04-014": {
    verdict: "USEFUL_PARTIAL",
    points: [18, 17, 18, 11, 11, 9],
    rationales: [
      "روابط الشهر والربع قابلة للتحويل إلى API، وأعيدت الصفوف والقيم بنجاح.",
      "المكعب والمقاييس والمستويان صحيحان؛ الخلل في تسمية القيم المحولة إلى SAR كأنها raw.",
      "المجاميع والفروق صفر تمامًا؛ مستوى Quarter مسترجع عبر API، أما lineage التخزين الفيزيائي فغير ظاهر.",
      "الإحالات صحيحة على مستوى الجدول لكنها لا تحمل الفلاتر والقيم الخام والهاش لكل ادعاء.",
      "فرّق عن اشتقاق المستخدم، لكنه بالغ في إثبات جودة النظام وخط التخزين من اختبار واحد.",
      "غطى الأشهر والصف الربعي والصيغة والفروق؛ بقي تمييز raw Million SAR عن التحويل.",
    ],
    forced: [],
    requests: ["schema-gastat_trade_balance", "p014-month-2025", "p014-quarter-2025"],
    claims: [
      ["VERIFIED", "صفوف 2025-01..03 وقيم الصادرات والواردات والميزان صحيحة بعد تحويل Million SAR إلى SAR."],
      ["VERIFIED", "مجموع الأشهر يطابق صف API عند Quarter=2025-Q1 لكل المقاييس بفارق 0."],
      ["VERIFIED_BOUNDED", "صف الربع مسترجع من مستوى Quarter في API؛ هذا لا يثبت إن كان مخزنًا ماديًا أو مجمعًا داخل Tesseract."],
      ["MISLABELED", "الأرقام المعروضة بالريال قيم محولة؛ الصف الخام في API مقاس بـ Million SAR."],
    ],
    falseCompleteness: [
      "CONVERTED_SAR_PRESENTED_AS_RAW_VALUE",
      "PHYSICAL_STORAGE_LINEAGE_NOT_OBSERVABLE",
      "ONE_SLICE_GENERALIZED_TO_SYSTEM_QUALITY",
    ],
    provenanceGaps: [
      "لا توجد query URLs بفلتر 2025-Q1 داخل الجواب.",
      "لا توجد هاشات صفوف أو ردود خام في الإحالات المعروضة.",
    ],
    report: "النتيجة الحسابية ممتازة وصحيحة، لكن raw في API هو Million SAR، وإثبات مستوى Quarter لا يكشف طريقة التخزين الداخلية.",
  },
  "P04-015": {
    verdict: "FAIL",
    points: [6, 4, 4, 4, 2, 4],
    rationales: [
      "استرجع الجواب مكعبات GDP بديلة بدل المكعب المطلوب ولم يسترجع sama_oil_prices.",
      "نسب مقاييس nominal/seasonally adjusted إلى gastat_gdp رغم أن schema الهدف تعرض GDP فقط.",
      "صنف مكعب النفط الموجود فعليًا كغير متوفر وفوّت سنة الأساس 2005 المعلنة نصًا.",
      "روابطه تسند مكعبات بديلة، ولا يوجد دليل لمكعب النفط أو target schema.",
      "استخدم unknown في موضع يتوفر فيه جواب صريح، ولم يرفض تبديل المكعب.",
      "هيكل الجدول مكتمل شكليًا لكنه لا يجيب عن المكعبات الثلاثة المطلوبة كما هي.",
    ],
    forced: [
      "MEASURES_ATTRIBUTED_TO_WRONG_CUBE",
      "EXISTING_CUBE_FALSELY_DECLARED_UNAVAILABLE",
    ],
    requests: [
      "schema-gastat_gdp",
      "schema-gastat_inflation",
      "schema-sama_oil_prices",
      "schema-gastat_gdp_by_main_activities_yearly",
      "schema-gastat_gdp_by_main_activities_quarterly",
    ],
    claims: [
      ["FALSE", "gastat_gdp يضم Nominal GDP وReal GDP وSeasonally Adjusted Real GDP."],
      ["VERIFIED_FOR_DIFFERENT_CUBES", "هذه المقاييس موجودة في gastat_gdp_by_main_activities_yearly/quarterly لا في الهدف."],
      ["FALSE", "sama_oil_prices غير متوفر في schema الحالية."],
      ["VERIFIED_CONTRADICTION", "sama_oil_prices موجود وجدوله يعلن Base Year: 2005 صراحة."],
      ["VERIFIED", "gastat_inflation يعرض CPI ومعدل تضخم؛ سنة الأساس والتعديل الموسمي غير معلنين في schema المفحوصة."],
    ],
    falseCompleteness: [
      "TARGET_CUBE_SILENTLY_REPLACED",
      "AVAILABLE_OIL_SCHEMA_REPORTED_UNAVAILABLE",
      "EXPLICIT_BASE_YEAR_2005_MISSED",
    ],
    provenanceGaps: [
      "الروابط تشير إلى مكعبين بديلين دون التصريح بأنهما خارج عقد السؤال.",
      "لا رابط أو schema evidence لمكعب النفط المطلوب.",
    ],
    report: "فشل إجباري: غيّر مكعب GDP ونسب إليه مقاييس مكعبين آخرين، ثم نفى وجود مكعب النفط الذي يعلن سنة أساس 2005.",
  },
  "P04-016": {
    verdict: "VERIFIED_PASS",
    points: [19, 19, 20, 12, 15, 10],
    rationales: [
      "الاستعلامات الثلاثة قابلة للإعادة وأعيدت النوافذ الكاملة دون خطأ.",
      "التواتر والمستويات والمقاييس صحيحة، مع فصل الشهر عن الربع.",
      "كل المقامات والفترات والـnull والصفر وأقدم/أحدث فترة تطابقت مع الردود الخام.",
      "الإحالات صحيحة لكنها لا تعرض request URL/response hash على مستوى كل جدول.",
      "ميّز الصفر عن المفقود وقيّد الاستنتاجات بالنافذة المطلوبة.",
      "غطى العقد كاملًا: expected/observed/missing/null/zero/range لكل سلسلة.",
    ],
    forced: [],
    requests: [
      "schema-construction_cost_index_by_sector",
      "schema-consumer_confidence_index",
      "schema-current_account_quarter",
      "p016-construction-full",
      "p016-confidence-full",
      "p016-current-account-full",
    ],
    claims: [
      ["VERIFIED", "مؤشر تكلفة البناء: 36 متوقعًا، 7 مرصودة، 29 مفقودة، 0 null، 0 zero ضمن 2023-01..2025-12."],
      ["VERIFIED", "ثقة المستهلك: 36/36 شهرًا، بلا missing/null/zero."],
      ["VERIFIED", "الحساب الجاري: 12/12 ربعًا و48 صفًا، بلا missing/null/zero."],
      ["VERIFIED", "الفترات والقيم النموذجية والتحليل الوصفي المذكور قابلة لإعادة التشغيل."],
    ],
    falseCompleteness: [],
    provenanceGaps: ["الإجابة تعرض Data Explorer لا هاشات الردود الخام، وقد عالج سجل التدقيق هذه الفجوة."],
    report: "الاجتياز الوحيد في الشريحة: المقامات الزمنية والتمييز بين missing/null/zero صحيحة بالكامل وقابلة للإعادة.",
  },
  "P04-017": {
    verdict: "USEFUL_PARTIAL",
    points: [18, 19, 17, 11, 12, 10],
    rationales: [
      "العضويات والآباء قابلة للإعادة من endpoint العام، والروابط تسمي المكعبين الصحيحين.",
      "المفاتيح الخمسة والآباء صحيحة؛ تحقق التدقيق من تطابق 13/13 زوج key+caption.",
      "Province هو أدق grain مشترك، لكن وصف المفتاح بأنه الآمن والوحيد يحتاج قيدًا على هذا الزوج والإصدار.",
      "الروابط لا تعرض members endpoints أو نتيجة فحص المقام الكامل.",
      "رفض ربط Governatorate مباشرة صحيح؛ ادعاء الأمان المطلق أوسع من الدليل المعروض.",
      "غطى خمس عينات والـparent والمفتاح والـgrain كما طلب العقد.",
    ],
    forced: [],
    requests: [
      "schema-gastat_detailed_population",
      "schema-gastat_inflation_province_yoy",
      "p017-pop-province-en",
      "p017-pop-province-ar",
      "p017-governorate-en",
      "p017-governorate-ar",
      "p017-inflation-province-en",
      "p017-inflation-province-ar",
    ],
    claims: [
      ["VERIFIED", "أمثلة 101/201/301/401/501 وتسميات الآباء العربية والإنجليزية صحيحة."],
      ["VERIFIED", "كل المناطق الإدارية 1..13 تتطابق key+caption بين المكعبين؛ مكعب التضخم يضيف General Index=18."],
      ["VERIFIED", "Province هو أدق grain مشترك، ويجب تجميع السكان من Governatorate قبل المقارنة."],
      ["OVERSTATED", "المفتاح الرقمي هو المفتاح الآمن والوحيد بلا تقييد بالزوج والإصدار المفحوص."],
      ["VERIFIED", "منطقة الرياض لها 23 محافظة في members endpoint الحالي."],
    ],
    falseCompleteness: ["SAFE_JOIN_GENERALIZED_BEYOND_VERIFIED_CUBE_PAIR"],
    provenanceGaps: [
      "لا members URL أو parents=true في الجواب.",
      "لم يذكر General Index=18 كعضو زائد يجب استبعاده.",
    ],
    report: "المفاتيح والآباء صحيحة و13/13 منطقة متطابقة، لكن الأمان يجب أن يُقيّد بهذا الزوج وباستبعاد General Index=18.",
  },
  "P04-018": {
    verdict: "USEFUL_PARTIAL",
    points: [16, 13, 17, 9, 14, 8],
    rationales: [
      "أعيدت مفاتيح City وProvince، لكن الجواب استرجع yearly بدل cube الـyoy المطلوب.",
      "المفاتيح والـgrain صحيحة؛ اسم target cube في الجواب والإحالة غير صحيحين.",
      "قرار no direct join صحيح للحالات الثلاث، وmember sets للنسختين الشهرية/السنوية متطابقة حاليًا.",
      "الإحالات صحيحة للبيانات المستخدمة لا للهدف المحدد، وغياب crosswalk لم يوثق بطلب بحث.",
      "رفض الدمج النصي/الرقمي المباشر معاير جيدًا.",
      "غطى الحالات والقرار والدليل، لكن بدل المكعب ولم يثبت مقام بحث crosswalk.",
    ],
    forced: [],
    requests: [
      "schema-sama_pos_cities",
      "schema-gastat_inflation_province_yoy",
      "schema-gastat_inflation_province_yearly",
      "p018-city-en",
      "p018-city-ar",
      "p018-target-province-en",
      "p018-substituted-province-en",
      "catalog-show-all-en",
    ],
    claims: [
      ["VERIFIED", "Riyadh city=12/province=1، Makkah=10/2، AL-Madinah=2/3."],
      ["VERIFIED", "لا يمكن direct join بين City وProvince بهذه المفاتيح أو بتساوي الاسم."],
      ["WRONG_TARGET", "الجواب أجاب على gastat_inflation_province_yearly بدل gastat_inflation_province_yoy."],
      ["VERIFIED_BOUNDED", "لا يظهر cube باسم crosswalk/mapping للمدينة والمنطقة في الكتالوج العام الحالي؛ هذا ليس إثبات عدم وجوده خارج السطح."],
    ],
    falseCompleteness: [
      "REQUESTED_CUBE_REPLACED_WITH_YEARLY_VARIANT",
      "CROSSWALK_ABSENCE_NOT_BOUNDED_TO_PUBLIC_CATALOG",
    ],
    provenanceGaps: [
      "الرابط الثاني ليس للمكعب المطلوب.",
      "لم يسجل search denominator للـcrosswalk داخل الإجابة.",
    ],
    report: "قرار عدم الربط صحيح، لكن الجواب غيّر مكعب التضخم المطلوب إلى النسخة السنوية ولم يوثق مقام بحث الـcrosswalk.",
  },
  "P04-019": {
    verdict: "FAIL",
    points: [4, 2, 5, 2, 7, 5],
    rationales: [
      "لا توجد إحالة لأي member endpoint؛ الروابط قطاعية عامة لا تعيد المفاتيح.",
      "كل رموز GDP المعروضة وكل مفاتيح SAMA الخمسة خاطئة مقابل العضويات الحية.",
      "التحذير من الاسم وحده صحيح، لكن توصيف taxonomies ومصفوفة roll-up مبنيان على مفاتيح غير صحيحة.",
      "لا provenance على مستوى عضو أو crosswalk أو matrix cell.",
      "رفض exact join مفيد، لكن بعض قرارات roll-up/manual تبدو حقائق بلا crosswalk مثبت.",
      "قدم الشكل المطلوب، إلا أن قلبه العددي والتصنيفي غير صالح.",
    ],
    forced: ["FABRICATED_MEMBER_KEYS", "UNSUPPORTED_COMPATIBILITY_MATRIX"],
    requests: [
      "schema-gastat_gdp",
      "schema-sama_bank_credit_month",
      "schema-business_demography_enterprises",
      "p019-gdp-activity",
      "p019-bank-isic4",
      "p019-demography-sectors",
      "catalog-show-all-en",
    ],
    claims: [
      ["FALSE", "مفاتيح GDP هي A02/A04/A06/A07/A09؛ القيم الفعلية للحالات الخمس هي 2/3/5/6/8."],
      ["FALSE", "مفاتيح SAMA هي 2/3/5/6/9؛ القيم الفعلية هي 11/10/4/17/7."],
      ["VERIFIED", "رموز business_demography B/C/F/G/K صحيحة."],
      ["VERIFIED_BOUNDED", "لا يظهر crosswalk مسمى صراحة في الكتالوج العام الحالي."],
      ["UNSUPPORTED", "business_demography إلى SAMA هو Roll-up بصورة عامة؛ لا يوجد جدول تعيين مثبت لكل قسم."],
    ],
    falseCompleteness: [
      "FABRICATED_GDP_CODES",
      "WRONG_SAMA_KEYS",
      "MATRIX_CELLS_LACK_MEMBER_LEVEL_PROVENANCE",
    ],
    provenanceGaps: [
      "الإحالتان لا تتعلقان بمفاتيح المكعبات الثلاثة.",
      "لا crosswalk endpoint أو member URLs أو قواعد تعيين قابلة لإعادة التشغيل.",
    ],
    report: "فشل إجباري: رموز GDP مختلقة ومفاتيح SAMA الخمسة خاطئة؛ لذلك مصفوفة التوافق غير قابلة للاعتماد.",
  },
  "P04-020": {
    verdict: "USEFUL_PARTIAL",
    points: [18, 15, 18, 11, 12, 8],
    rationales: [
      "الصفان والمقاييس يعادان من API وبأحدث شهر مشترك صحيح.",
      "المكعبان والأبعاد صحيحة، لكن الجواب لم يعرض keys الفعلية chn/27/1/2 ووصف raw unit بصورة غير دقيقة.",
      "الفرق الحسابي 0 بدقة المصدر؛ الاستنتاج بأن المقياس مشتق دائمًا أوسع من عينة واحدة.",
      "الإحالتان صحيحتان لكنهما بلا include filters أو request hashes.",
      "اختبر اختلاف Trade Flow بدل تجاهله، لكنه عمم التطابق على هندسة المقياس كلها.",
      "غطى القيم والوحدات والحكم؛ نقصته المفاتيح الخام وفصل التحويل عن raw.",
    ],
    forced: [],
    requests: [
      "schema-foreign_trade",
      "schema-trade_balance_by_country",
      "p020-foreign-country",
      "p020-foreign-hs2",
      "p020-foreign-flow",
      "p020-balance-country",
      "p020-balance-hs2",
      "p020-foreign-latest-three",
      "p020-balance-latest-three",
    ],
    claims: [
      ["VERIFIED", "أحدث شهر مشترك هو 2026-04، والمفاتيح chn/27 وتدفقا 1 Imports و2 Exports."],
      ["VERIFIED", "14054.61568628 - 23.74307931 = 14030.87260697 Million SAR، مطابق للميزان بفارق 0."],
      ["MISLABELED", "قيم foreign_trade الخام مليون ريال؛ أرقام الريال المطلق في الجواب تحويل وليست raw rows."],
      ["OVERSTATED", "التطابق في slice واحد يثبت أن trade_balance_by_country مشتق مباشر دائمًا من foreign_trade."],
    ],
    falseCompleteness: [
      "MEMBER_KEYS_OMITTED",
      "CONVERTED_VALUES_LABELED_RAW",
      "SINGLE_SLICE_GENERALIZED_TO_FULL_DERIVATION_LINEAGE",
    ],
    provenanceGaps: [
      "روابط Data Explorer لا تتضمن include=Country:chn;HS2:27;Trade Flow:1,2.",
      "تعريف الوحدة في trade_balance schema أقل وضوحًا من الاستنتاج العددي ولم يُفصل ذلك.",
    ],
    report: "التسوية الرقمية صحيحة تمامًا، لكن المفاتيح لم تُعرض، والقيم المحولة إلى SAR سميت raw، واشتقاق المقياس عُمم من slice واحد.",
  },
  "P04-021": {
    verdict: "UNSAFE_PARTIAL",
    points: [18, 14, 12, 11, 7, 7],
    rationales: [
      "الروابط الأربعة صحيحة وأعيدت الصفوف المطلوبة لعام 2022.",
      "الأبعاد الرئيسية صحيحة، لكنه حذف Quarter من مكعب البطالة ولم يضبط Total members/Resource Category.",
      "2022 والقيم النموذجية صحيحة؛ وصف join بأنه lossless/full compatibility غير صحيح بعد إسقاط أبعاد ومزج موارد غير متجانسة.",
      "الإحالات على مستوى المكعب لا تثبت قواعد الإسقاط أو اختيار total/category لكل صف.",
      "كان يجب رفض lossless join أو تقييده؛ أضاف استنتاج تلازم رغم طلب matrix فقط.",
      "قدم matrix والفترة والمفتاح، لكنه لم يحدد member keys الآمنة وأدخل تحليلًا خارج العقد.",
    ],
    forced: [],
    requests: [
      "schema-gastat_detailed_population",
      "schema-gastat_rate_gender_nationality_region",
      "schema-sama_water_consumption_region",
      "schema-sama_health_facilities_resources",
      "p021-pop-year",
      "p021-rate-year",
      "p021-rate-quarter",
      "p021-rate-sex",
      "p021-rate-nationality",
      "p021-water-year",
      "p021-health-year",
      "p021-health-category",
      "p021-pop-2022",
      "p021-rate-2022",
      "p021-rate-2022-detailed",
      "p021-water-2022",
      "p021-health-2022",
    ],
    claims: [
      ["VERIFIED", "2022 هو العام المشترك الوحيد والأحدث بين المكعبات الأربعة."],
      ["VERIFIED", "قيم الرياض ومكة وجازان المذكورة تطابق صفوف API بعد تحويل Thousand m3 إلى m3."],
      ["FALSE_INCOMPLETE", "مكعب البطالة سنوي فقط؛ schema تعرض Year وQuarter."],
      ["UNSAFE", "Year+Province join خالٍ من الفقد بعد إسقاط Sex/Nationality وتجميع Resource Category."],
      ["VERIFIED_REQUIREMENT", "البطالة تحتاج Total Sex=3 وTotal Nationality=3؛ الصحة تحتاج اختيار فئة مثل Hospitals=4 لا جمع الموارد غير المتجانسة."],
      ["OUT_OF_SCOPE_INFERENCE", "وجود تلازم طردي بين السكان والمياه/الصحة؛ السؤال طلب matrix بلا استنتاج سببي أو تحليلي."],
    ],
    falseCompleteness: [
      "QUARTER_GRAIN_OMITTED",
      "LOSSLESS_LABEL_AFTER_DIMENSION_LOSS",
      "HETEROGENEOUS_HEALTH_CATEGORIES_TREATED_AS_AGGREGATABLE",
      "TOTAL_MEMBER_KEYS_NOT_DECLARED",
      "UNREQUESTED_INFERENCE_ADDED",
    ],
    provenanceGaps: [
      "لا member evidence لـSex/Nationality totals أو Resource Category.",
      "لا يفرق بين اختيار Total row وبين متوسط غير موزون عبر الفئات.",
    ],
    report: "2022 والقيم صحيحة، لكن الدمج ليس lossless: البطالة لها Quarter أيضًا، والصحة تتطلب فئة محددة، وTotal members يجب تثبيتها صراحة.",
  },
};

const requestById = new Map(requests.map((record) => [record.request_id, record]));
const transcriptById = new Map(transcripts.map((record) => [record.question_id, record]));
const adjudications = [];

for (const questionId of Object.keys(grades).sort()) {
  const grade = grades[questionId];
  const transcript = transcriptById.get(questionId);
  if (!transcript) throw new Error(`Missing transcript for ${questionId}`);
  const pointNames = Object.values(axes);
  const breakdown = {};
  for (const [index, axis] of pointNames.entries()) {
    breakdown[axis.key] = {
      points: grade.points[index],
      max_points: axis.max,
      rationale_ar: grade.rationales[index],
    };
  }
  const total = grade.points.reduce((sum, value) => sum + value, 0);
  const htmlFile = await readFile(path.resolve(transcript.raw_answer_html_path));
  const htmlFileSha256 = sha256(htmlFile);
  const evidenceRequests = grade.requests.map((requestId) => {
    const request = requestById.get(requestId);
    if (!request) throw new Error(`Missing request ${requestId} for ${questionId}`);
    return {
      request_id: request.request_id,
      request_url: request.request_url,
      http_status: request.http_status,
      retrieved_at_utc: request.retrieved_at_utc,
      body_path: request.body_path,
      body_sha256: request.body_sha256,
      body_bytes: request.body_bytes,
    };
  });
  adjudications.push({
    schema_version: "1.0",
    adjudication_id: `P04-ADJ-SHARD-B-${questionId}`,
    question_id: questionId,
    target_capability: transcript.target_capability,
    language: transcript.language,
    adjudicated_at_utc: adjudicatedAt,
    authority: "DataSaudi official public Tesseract API",
    scoring_contract_path: SCORING,
    observed_answer: {
      run_id: transcript.run_id,
      session_id: transcript.session_id,
      attempt: 1,
      status: transcript.status,
      prompt_sha256: transcript.prompt_sha256,
      sent_at_utc: transcript.sent_at_utc,
      first_frame_at_utc: transcript.first_frame_at_utc ?? null,
      completed_at_utc: transcript.completed_at_utc,
      latency_ms: transcript.latency_total_ms,
      raw_text_path: rel(TRANSCRIPTS),
      raw_text_file_sha256: transcriptSha,
      raw_answer_sha256: transcript.raw_answer_sha256,
      raw_answer_html_path: transcript.raw_answer_html_path,
      raw_answer_html_capture_sha256: transcript.raw_answer_html_sha256,
      raw_answer_html_file_sha256: htmlFileSha256,
      raw_answer_html_hash_scope_note:
        "capture_sha256 is preserved from the transcript record; file_sha256 hashes the complete current HTML artifact bytes.",
      raw_frames_path: rel(FRAMES),
      raw_frames_file_sha256: framesSha,
      screenshot: transcript.screenshot,
      citations: transcript.citations,
    },
    score_breakdown: breakdown,
    total_score: total,
    verdict: grade.verdict,
    forced_fail: grade.forced.length > 0,
    forced_fail_reasons: grade.forced,
    material_claims: grade.claims.map(([status, claim], index) => ({
      claim_id: `${questionId}-C${String(index + 1).padStart(2, "0")}`,
      status,
      claim_ar: claim,
    })),
    false_completeness_flags: grade.falseCompleteness,
    provenance_gaps: grade.provenanceGaps,
    replay: {
      official_api_base: "https://api.datasaudi.sa/tesseract",
      requests: evidenceRequests,
      raw_response_manifest_path:
        "research/datasaudi-package-04-universe-exploration/04-adjudication/shard-b/evidence/requests.jsonl",
      raw_response_manifest_sha256: runSummary.request_manifest_sha256,
      row_hash_manifest_path: derived.row_hashes_path,
      row_hash_manifest_sha256: rowHashesSha,
      derived_verification_path: DERIVED,
      derived_verification_sha256: derivedSha,
      derived_json_pointer: `/P04_${questionId.split("-").at(-1)}`,
    },
  });
}

const jsonl = `${adjudications.map((record) => JSON.stringify(record)).join("\n")}\n`;
await writeFile(path.join(SHARD, "adjudication.jsonl"), jsonl);

const verdictCounts = adjudications.reduce((counts, record) => {
  counts[record.verdict] = (counts[record.verdict] || 0) + 1;
  return counts;
}, {});
const meanScore = (
  adjudications.reduce((sum, record) => sum + record.total_score, 0) / adjudications.length
).toFixed(1);
const tableRows = adjudications
  .map((record) => {
    const grade = grades[record.question_id];
    return `| ${record.question_id} | ${record.total_score} | \`${record.verdict}\` | ${grade.report} |`;
  })
  .join("\n");

const report = `# تقرير التدقيق المستقل — P04-013 إلى P04-021

## الحكم التنفيذي

أعيد تشغيل هذه الشريحة مستقلًا على **واجهة DataSaudi العامة الرسمية فقط**، ولم يُرسل أي سؤال جديد إلى INSAIGHTS. النتيجة: إجابة واحدة فقط اجتازت عتبة \`VERIFIED_PASS\`، وأربع إجابات مفيدة جزئيًا، وإجابتان غير آمنتين جزئيًا، وإجابتان فشلتا إجباريًا.

- \`VERIFIED_PASS\`: ${verdictCounts.VERIFIED_PASS || 0}
- \`USEFUL_PARTIAL\`: ${verdictCounts.USEFUL_PARTIAL || 0}
- \`UNSAFE_PARTIAL\`: ${verdictCounts.UNSAFE_PARTIAL || 0}
- \`FAIL\`: ${verdictCounts.FAIL || 0}
- متوسط الشريحة: **${meanScore}/100**

## النتائج

| السؤال | الدرجة | الحكم | الخلاصة |
|---|---:|---|---|
${tableRows}

## الأخطاء الحرجة

1. **P04-015 — تبديل المكعب وإخفاء معلومة موجودة:** الجواب نسب مقاييس nominal/real/seasonally-adjusted إلى \`gastat_gdp\`، بينما هي في مكعبي main-activities البديلين. كما وصف \`sama_oil_prices\` بأنه غير متوفر، مع أن schema الحية موجودة وتعلن صراحة \`Base Year: 2005\`.
2. **P04-019 — مفاتيح مختلقة/خاطئة:** مفاتيح GDP الحية للحالات الخمس هي \`2/3/5/6/8\` وليست \`A02/A04/A06/A07/A09\`، ومفاتيح SAMA هي \`11/10/4/17/7\` وليست \`2/3/5/6/9\`. يسقط السؤال إجباريًا وفق SCORING.md.
3. **P04-021 — شمول زائف في الدمج:** عام 2022 صحيح، لكن الدمج ليس lossless بعد حذف Sex/Nationality وResource Category. البطالة تدعم Quarter أيضًا، ويجب تثبيت \`Total Sex=3\` و\`Total Nationality=3\`، بينما موارد الصحة فئات غير متجانسة لا يجوز جمعها كعدد واحد.
4. **P04-013 — حدود صحيحة مع قصة تخزين غير مثبتة:** غياب vintage/revision صحيح، لكن السطح العام لا يثبت أن النظام «يستبدل القيم القديمة» داخليًا.

## النتائج الصحيحة المهمة

- **P04-016:** المقامات الزمنية صحيحة بالكامل: البناء 7/36 شهرًا، ثقة المستهلك 36/36، والحساب الجاري 12/12 ربعًا، دون null أو zero داخل النافذة.
- **P04-014:** مجموع أشهر 2025-Q1 يساوي صف Quarter لكل مقياس بفارق صفر. الصف الخام في API مقاس بمليون ريال؛ أرقام الريال في الجواب تحويل وليست raw.
- **P04-017:** تطابق 13/13 زوجًا من مفاتيح وتسميات المناطق بين مكعبي السكان والتضخم، مع عضو إضافي \`General Index=18\` في التضخم يجب استبعاده.
- **P04-018:** مفاتيح المدينة/المنطقة للحالات الثلاث صحيحة وقرار عدم direct join صحيح، لكن الجواب استبدل cube الـyoy بالنسخة السنوية.
- **P04-020:** عند \`Country=chn\`, \`HS2=27\`, و\`2026-04\`: الصادرات \`14054.61568628\` والواردات \`23.74307931\` مليون ريال، والفرق \`14030.87260697\` يطابق الميزان بفارق صفر.

## سلسلة الأدلة

- الطلبات العامة: **${runSummary.request_count}**، الناجح HTTP 200: **${runSummary.http_200_count}**، غير الناجح: **${runSummary.non_200_count}**.
- كل رد محفوظ نصيًا دون تعديل في \`evidence/raw/*.body\` مع URL، وقت الاسترجاع، HTTP status، bytes وSHA-256 في \`evidence/requests.jsonl\`.
- هاشات الصفوف: **${rowHashesText.split("\n").filter(Boolean).length}** صفًا في \`evidence/row-hashes.jsonl\`.
- ملخص إعادة الحساب: \`evidence/derived-verification.json\` (SHA-256: \`${derivedSha}\`).
- سجل الحكم القابل للآلة: \`adjudication.jsonl\`، تسعة أسطر JSON صالحة، مع score breakdown وverdict والادعاءات وفجوات provenance لكل سؤال.
- مدقق التكامل \`evidence/validate.mjs\` يعيد فحص هاشات الردود والصفوف والنصوص والصور ومسارات الأدلة ويكتب \`evidence/validation-summary.json\`.

## حدود الحكم

- عدم ظهور crosswalk مسمى في الكتالوج العام لا يثبت عدم وجوده خارج السطح العام؛ لذلك صيغ الحكم على P04-017/018/019 بحدود الكتالوج المفحوص.
- API يثبت صف Quarter ويعيده، لكنه لا يكشف هل الصف مخزن ماديًا أو مجمع داخل طبقة Tesseract.
- المطابقة الرقمية في P04-020 تثبت slice المفحوص ولا تثبت lineage اشتقاق جميع الفترات تلقائيًا.
- لم يُستخدم INSAIGHTS في التدقيق، ولم تُستخدم هوية أو جلسة بديلة، ولم يُجر أي التفاف على الحصة.
`;

await writeFile(path.join(SHARD, "REPORT.md"), report);
process.stdout.write(
  `${JSON.stringify({
    adjudication_count: adjudications.length,
    adjudication_sha256: sha256(jsonl),
    report_sha256: sha256(report),
    verdict_counts: verdictCounts,
    mean_score: Number(meanScore),
  })}\n`,
);
