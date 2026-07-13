const join = (lines) => lines.join('\n\n');
const eid = (key) => 'EVID-' + key.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
const refs = (...keys) => keys.map(eid);

const row = (dataset, publisher, cube, indicator, definition, unit, period, frequency, geography, classification, status, issues, ...evidenceKeys) => ({
  dataset,
  publisher,
  cube_id: cube,
  indicator,
  definition,
  unit,
  period,
  frequency,
  geography,
  vintage: 'لقطة الاسترجاع المجمدة في 2026-07-13',
  classification,
  compatibility_status: status,
  issues,
  evidence_ref_ids: refs(...evidenceKeys)
});

const missing = (input, why_missing_or_incompatible, what_would_close) => ({ input, why_missing_or_incompatible, what_would_close });
const fact = (fact_id, statement_ar, evidenceKeys, extra = {}) => ({ fact_id, statement_ar, ...extra, evidence_ref_ids: refs(...evidenceKeys) });
const inference = (inference_id, statement_ar, boundary_ar, evidenceKeys) => ({ inference_id, statement_ar, boundary_ar, evidence_ref_ids: refs(...evidenceKeys) });
const claim = (claim_id, claim_type, statement_ar, verification_status, evidenceKeys) => ({
  claim_id,
  claim_type,
  statement_ar,
  verification_status,
  centrality: 'MATERIAL',
  evidence_ref_ids: refs(...evidenceKeys)
});

const crossChecks = [
  { behavior: 'compatibility_matrix', status: 'PASS', evidence: 'توجد مصفوفة صريحة للتعريف والوحدة والفترة والتواتر والجغرافيا والتصنيف لكل مجموعة مستخدمة.' },
  { behavior: 'no_unsupported_causality', status: 'PASS', evidence: 'لا تتضمن الإجابة أي صياغة سببية؛ العلاقة، إن ذكرت، وصفية فقط.' },
  { behavior: 'cite_all_datasets', status: 'PASS', evidence: 'كل مجموعة مذكورة مرتبطة بمسار دليل موجود وSHA-256 يتحقق آليًا.' }
];

export const CROSS_DEFINITIONS = {
  'X-01-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail:gastat_gdp', 'detail:gastat_employment_population_ratio', 'detail:sama_bank_credit_month', 'detail:business_demography_enterprises'],
    answer_text: join([
      'النتيجة: لا يمكن استخراج قائمة صحيحة للأنشطة التي نما فيها الناتج والعمالة والائتمان والمنشآت معًا من الأدلة المسترجعة، ولذلك لا أقدم ترتيبًا أو أسماء أنشطة.',
      'المنقول: الناتج متاح حسب قسم النشاط الاقتصادي وبوتيرة ربع سنوية حتى 2025-Q4؛ الائتمان متاح شهريًا حسب ISIC4 حتى 2026-05؛ المنشآت النشطة متاحة سنويًا حسب القطاعات الاقتصادية لعامي 2023 و2024؛ أما نسبة العمالة إلى السكان فمقسمة جغرافيًا حسب المنطقة وليست حسب النشاط. الوحدات أيضًا مختلفة: ناتج نقدي، ائتمان بمليون ريال، عدد منشآت، ونسبة مئوية.',
      'المحسوب: لا شيء. لا يوجد تقاطع رباعي مشروع لأن محور النشاط مفقود في سلسلة العمالة، ولا توجد خريطة تصنيف موثقة توحد Economic Activity Section وISIC4 وEconomic Sectors، كما أن «آخر سنة مكتملة» لا تعني الفترة نفسها تلقائيًا لكل سلسلة.',
      'ما يغلق السؤال: سلسلة عمالة بعدد المشتغلين حسب ISIC4 والسنة، خريطة تصنيف بإصداراتها بين السلاسل الأربع، واستخراج سنوي كامل للفترة المشتركة مع قاعدة واضحة لتجميع الأشهر والأرباع. عندها يحسب النمو السنوي لكل مؤشر ثم يؤخذ تقاطع الأنشطة ذات النمو الموجب فقط، دون تفسير سببي.'
    ]),
    reported_facts: [
      fact('X01-F1', 'سلسلة الناتج المسترجعة ربع سنوية حسب قسم النشاط الاقتصادي وتمتد حتى 2025-Q4.', ['detail:gastat_gdp'], { period: '2010-Q1/2025-Q4', frequency: 'ربع سنوي', geography: 'المملكة', unit: 'مليون ريال' }),
      fact('X01-F2', 'سلسلة الائتمان المصرفي المسترجعة شهرية حسب ISIC4 وتمتد حتى 2026-05.', ['detail:sama_bank_credit_month'], { period: '2021-08/2026-05', frequency: 'شهري', geography: 'المملكة', unit: 'مليون ريال' }),
      fact('X01-F3', 'سلسلة المنشآت المسترجعة سنوية حسب القطاعات الاقتصادية ولا تغطي سوى 2023 و2024.', ['detail:business_demography_enterprises'], { period: '2023/2024', frequency: 'سنوي', geography: 'المملكة', unit: 'منشأة' }),
      fact('X01-F4', 'مؤشر العمالة المسترجع هو نسبة العمالة إلى السكان حسب المنطقة، لا عدد المشتغلين حسب النشاط.', ['detail:gastat_employment_population_ratio'], { period: '2023-Q1/2026-Q1', frequency: 'ربع سنوي', geography: 'منطقة إدارية', unit: 'نسبة مئوية' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('الناتج المحلي الحقيقي حسب النشاط الاقتصادي', 'الهيئة العامة للإحصاء', 'gastat_gdp', 'GDP', 'ناتج حقيقي حسب قسم النشاط', 'مليون ريال', '2010-Q1/2025-Q4', 'ربع سنوي', 'المملكة', 'Economic Activity Section', 'PARTIAL', ['يحتاج تحويلًا سنويًا وخريطة تصنيف'], 'detail:gastat_gdp'),
      row('نسبة العمالة إلى السكان', 'الهيئة العامة للإحصاء', 'gastat_employment_population_ratio', 'Ratio', 'نسبة المشتغلين إلى السكان', 'نسبة مئوية', '2023-Q1/2026-Q1', 'ربع سنوي', 'منطقة إدارية', 'لا يوجد نشاط', 'INCOMPATIBLE', ['محور النشاط المطلوب غير موجود'], 'detail:gastat_employment_population_ratio'),
      row('الائتمان المصرفي حسب النشاط', 'البنك المركزي السعودي', 'sama_bank_credit_month', 'Million SAR', 'رصيد ائتمان حسب ISIC4', 'مليون ريال', '2021-08/2026-05', 'شهري', 'المملكة', 'ISIC4', 'PARTIAL', ['التجميع السنوي وخريطة التصنيف غير موثقين'], 'detail:sama_bank_credit_month'),
      row('إحصاءات ديموغرافيا الأعمال', 'الهيئة العامة للإحصاء', 'business_demography_enterprises', 'Total Active Enterprises', 'عدد المنشآت النشطة حسب القطاع', 'منشأة', '2023/2024', 'سنوي', 'المملكة', 'Economic Sectors', 'PARTIAL', ['فترة قصيرة وخريطة التصنيف غير موثقة'], 'detail:business_demography_enterprises')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('العمالة حسب النشاط', 'المتاح المسترجع جغرافي لا قطاعي.', 'عدد المشتغلين السنوي حسب ISIC4 للفترة المشتركة.'),
      missing('خريطة التصنيف', 'لا يوجد crosswalk بإصدار وتغطية بين التصنيفات الثلاثة.', 'خريطة رسمية موثقة مع قواعد one-to-many.'),
      missing('فترة سنوية مشتركة مكتملة', 'التواتر والنهايات الزمنية مختلفة.', 'سياسة تجميع سنوية وسنة مشتركة مكتملة لكل السلاسل.')
    ],
    limitations: [{ type: 'NOT_COMPARABLE', detail_ar: 'غياب محور النشاط في العمالة وخريطة التصنيف يمنع التقاطع الرباعي.', what_would_close: 'إحضار المدخلات الثلاثة المسماة أعلاه.' }],
    atomic_claims: [
      claim('X01-C1', 'REPORTED', 'العمالة المسترجعة غير مقسمة حسب النشاط الاقتصادي.', 'VERIFIED', ['detail:gastat_employment_population_ratio']),
      claim('X01-C2', 'NEGATIVE', 'لا يمكن حساب تقاطع نمو الأنشطة الأربع من مجموعة الأدلة الحالية دون استبدال صامت.', 'VERIFIED', ['catalog', 'detail:gastat_gdp', 'detail:gastat_employment_population_ratio', 'detail:sama_bank_credit_month', 'detail:business_demography_enterprises'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-02-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail:gastat_gdp', 'detail:sama_bank_credit_month'],
    answer_text: join([
      'النتيجة: لا توجد قائمة أنشطة قابلة للدفاع عنها تجمع «نمو الائتمان» مع «انخفاض الإنتاج أو الناتج» في الأدلة الحالية؛ الامتناع هنا نتيجة توافق لا نقص صياغة.',
      'المنقول: الائتمان المصرفي شهري ومصنف وفق ISIC4 بوحدة مليون ريال حتى 2026-05، بينما الناتج الحقيقي ربع سنوي حسب Economic Activity Section حتى 2025-Q4. كلاهما وطني، لكن التصنيف والتواتر ومفهوم الرصيد مقابل التدفق غير متطابقة.',
      'المحسوب: لا شيء. حساب نمو رصيد الائتمان السنوي ومقارنته بنمو تدفق الناتج ممكن فقط بعد تثبيت نهاية الفترة، وطريقة التجميع، وخريطة رسمية بين التصنيفين. أي مطابقة بالأسماء الآن قد تجمع فروعًا مختلفة وتنتج نشاطًا زائفًا.',
      'ما يغلق السؤال: crosswalk رسمي ISIC4↔GDP activity، تعريف هل الائتمان رصيد نهاية سنة أم متوسط سنوي، اختيار ناتج حقيقي لا اسمي، وسنتان كاملتان مشتركتان. بعدها يحسب كل نمو على حدة وتعرض الحالات ذات ائتمان موجب وناتج سالب بوصفها تزامنًا لا سببًا.'
    ]),
    reported_facts: [
      fact('X02-F1', 'الائتمان المصرفي المسترجع شهري حسب ISIC4 ووحدته مليون ريال.', ['detail:sama_bank_credit_month'], { frequency: 'شهري', unit: 'مليون ريال', geography: 'المملكة' }),
      fact('X02-F2', 'الناتج المسترجع ربع سنوي حسب قسم النشاط ووحدته نقدية.', ['detail:gastat_gdp'], { frequency: 'ربع سنوي', unit: 'مليون ريال', geography: 'المملكة' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('الائتمان المصرفي حسب النشاط ISIC4', 'البنك المركزي السعودي', 'sama_bank_credit_month', 'Million SAR', 'رصيد ائتماني قطاعي', 'مليون ريال', '2021-08/2026-05', 'شهري', 'المملكة', 'ISIC4', 'INCOMPATIBLE', ['رصيد مقابل تدفق', 'التصنيف غير موحد', 'يلزم تعريف نهاية السنة'], 'detail:sama_bank_credit_month'),
      row('الناتج المحلي الحقيقي حسب النشاط', 'الهيئة العامة للإحصاء', 'gastat_gdp', 'GDP', 'تدفق ناتج حقيقي', 'مليون ريال', '2010-Q1/2025-Q4', 'ربع سنوي', 'المملكة', 'Economic Activity Section', 'INCOMPATIBLE', ['التصنيف غير موحد', 'يلزم تجميع سنوي'], 'detail:gastat_gdp')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('crosswalk بين التصنيفين', 'المطابقة النصية ليست دليلاً على التكافؤ.', 'خريطة رسمية بإصدار وسلامة التجميع.'),
      missing('عقد قياس الائتمان', 'غير محدد هل النمو لنقطة نهاية أم متوسط.', 'تعريف ثابت وإعادة حساب لسنتين كاملتين.'),
      missing('فترة مقارنة مشتركة', 'أحدث شهر وأحدث ربع لا يمثلان سنة مكتملة واحدة.', 'إغلاق سنة واحدة على الأقل في المصدرين.')
    ],
    limitations: [{ type: 'CLASSIFICATION_AND_STOCK_FLOW', detail_ar: 'التصنيف غير موحد والائتمان رصيد بينما الناتج تدفق.', what_would_close: 'crosswalk وعقد تجميع وفترة مشتركة.' }],
    atomic_claims: [
      claim('X02-C1', 'REPORTED', 'سلسلتا الائتمان والناتج تختلفان في التواتر والتصنيف وطبيعة القياس.', 'VERIFIED', ['detail:sama_bank_credit_month', 'detail:gastat_gdp']),
      claim('X02-C2', 'NEGATIVE', 'لا يمكن تسمية أنشطة صحيحة من الأدلة الحالية دون خريطة تصنيف وعقد زمني.', 'VERIFIED', ['catalog', 'detail:sama_bank_credit_month', 'detail:gastat_gdp'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-03-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail:gastat_population_growth', 'detail:gastat_housing_tenure'],
    answer_text: join([
      'النتيجة: لا يمكن تحديد المناطق التي نما فيها السكان أسرع من الوحدات السكنية على أساس سنة-لسنة من اللقطتين المسترجعتين.',
      'المنقول: نمو السكان متاح سنويًا حسب المنطقة حتى 2022. الوحدات السكنية المأهولة بأسر سعودية متاحة حسب المنطقة وفئة الحيازة، لكن السنوات المسترجعة متقطعة: 2017 و2018 و2019 و2022 و2024. لذلك لا توجد قيمة 2021 اللازمة لحساب نمو وحدات 2022 سنة-لسنة، كما أن نطاق الوحدات لا يساوي كل المخزون السكني.',
      'المحسوب: لا شيء؛ مقارنة معدل نمو سكان 2022 بتغير الوحدات بين 2019 و2022 ستخلط معدلًا سنويًا بفاصل ثلاثي السنوات، واستخدام 2024 سيخلط فترتين مختلفتين. كذلك جمع فئات الحيازة يحتاج اختبار منع التداخل.',
      'ما يغلق السؤال: عدد إجمالي الوحدات السكنية غير المتداخل لكل منطقة في 2021 و2022، أو سلسلة سنوية متصلة للفترة نفسها، مع تعريف سكاني مطابق جغرافيًا. بعدها يحسب (قيمة 2022/قيمة 2021−1)×100 للمؤشرين ويقارن داخل المنطقة.'
    ]),
    reported_facts: [
      fact('X03-F1', 'نمو السكان حسب المنطقة ينتهي عند 2022 في الدليل الكامل المسترجع.', ['detail:gastat_population_growth'], { period: '2011/2022', frequency: 'سنوي', geography: 'منطقة إدارية', unit: 'نسبة مئوية' }),
      fact('X03-F2', 'بيانات الوحدات حسب الحيازة تغطي سنوات متقطعة ولا تحتوي 2021.', ['detail:gastat_housing_tenure'], { period: '2017, 2018, 2019, 2022, 2024', frequency: 'سنوي متقطع', geography: 'منطقة إدارية', unit: 'وحدة سكنية' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('النمو السكاني حسب المنطقة', 'الهيئة العامة للإحصاء', 'gastat_population_growth', 'Growth', 'معدل نمو السكان', 'نسبة مئوية', '2011/2022', 'سنوي', 'منطقة إدارية', 'Geography Province', 'PARTIAL', ['متاح حتى 2022'], 'detail:gastat_population_growth'),
      row('الوحدات السكنية حسب الحيازة والمنطقة', 'الهيئة العامة للإحصاء', 'gastat_housing_tenure', 'Housing Units', 'وحدات مأهولة بأسر سعودية حسب الحيازة', 'وحدة', '2017,2018,2019,2022,2024', 'سنوي متقطع', 'منطقة إدارية', 'Geography Province + Tenure Type', 'INCOMPATIBLE', ['2021 مفقودة', 'النطاق ليس كل المخزون', 'فئات الحيازة تحتاج منع تداخل'], 'detail:gastat_housing_tenure')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('وحدات 2021 حسب المنطقة', 'لا تظهر في الاستجابة الكاملة.', 'صف رسمي كامل لعام 2021 على التعريف نفسه.'),
      missing('إجمالي مخزون سكني غير متداخل', 'المجموعة مقيدة بوحدات مأهولة بأسر سعودية وفئات حيازة.', 'مقياس إجمالي موثق أو قاعدة تجميع تمنع الازدواج.'),
      missing('سنة مشتركة مكتملة', 'آخر سنتين متتاليتين غير متاحتين في الوحدات.', 'سنتان متتاليتان في كلا المؤشرين.')
    ],
    limitations: [{ type: 'TEMPORAL_AND_SCOPE_GAP', detail_ar: 'لا توجد سنتان متتاليتان متطابقتان ولا يطابق نطاق الوحدات كل العرض السكني.', what_would_close: 'استخراج 2021/2022 على تعريف إجمالي واحد.' }],
    atomic_claims: [
      claim('X03-C1', 'REPORTED', 'سلسلة الوحدات المسترجعة لا تحتوي سنة 2021.', 'VERIFIED', ['detail:gastat_housing_tenure']),
      claim('X03-C2', 'NEGATIVE', 'المقارنة السنوية المطلوبة غير قابلة للحساب دون ملء 2021 أو تغيير السؤال.', 'VERIFIED', ['detail:gastat_population_growth', 'detail:gastat_housing_tenure'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-04-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail:sama_health_facilities_resources', 'detail:gastat_detailed_population'],
    answer_text: join([
      'النتيجة: لا يمكن إصدار قائمة مناطق دون الوسيط لنصيب الفرد من الأسرة أو الأطباء من مساري الدليل الحاليين.',
      'المنقول: الأسرة والأطباء متاحان كأعداد سنوية حسب المنطقة حتى 2023، ويمكن اختيار عام 2022. لكن دليل السكان المسترجع لعام 2022 مفصل حسب المحافظات ولا يحمل مفتاح المنطقة الأم في الصفوف، فلا يمكن جمعه إلى المناطق الـ13 بصورة قابلة لإعادة الإنتاج من الاستجابة نفسها.',
      'المحسوب: لا شيء. قسمة موارد على سكان محافظة أو استخدام سكان المملكة بدل المنطقة سيغير المقام. كما أن السؤال يترك مقياس «نصيب الفرد» مفتوحًا؛ المعيار المعتاد يجب تثبيته مثل موارد لكل 10,000 نسمة، ثم يحسب وسيط المناطق غير الموزون وتحدد سياسة التعادل.',
      'ما يغلق السؤال: جدول سكان 2022 حسب المنطقة بمفاتيح تطابق Province ID، اختيار Beds أو Physicians بوضوح، تثبيت المقام لكل 10,000، ثم حساب 13 نسبة والوسيط وسياسة القيم المفقودة والتعادل.'
    ]),
    reported_facts: [
      fact('X04-F1', 'موارد الأسرة والأطباء متاحة حسب 13 منطقة ولعام 2022 ضمن الاستجابة المسترجعة.', ['detail:sama_health_facilities_resources'], { period: '2022', frequency: 'سنوي', geography: 'منطقة إدارية', unit: 'مورد' }),
      fact('X04-F2', 'دليل السكان المفصل المسترجع لعام 2022 يحتوي محافظات بلا مفتاح منطقة أم في الصفوف.', ['detail:gastat_detailed_population'], { period: '2022', frequency: 'سنوي', geography: 'محافظة', unit: 'شخص' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('موارد المرافق الصحية', 'البنك المركزي السعودي/مصدر صحي رسمي', 'sama_health_facilities_resources', 'Resources', 'عدد الأسرة أو الأطباء حسب فئة المورد', 'عدد', '2011/2023', 'سنوي', 'منطقة إدارية', 'Province + Resource Category', 'PARTIAL', ['يحتاج مقام سكان مطابق لعام 2022'], 'detail:sama_health_facilities_resources'),
      row('السكان التفصيليون', 'الهيئة العامة للإحصاء', 'gastat_detailed_population', 'Population', 'عدد السكان حسب المحافظة', 'شخص', '2022', 'سنوي', 'محافظة', 'Governatorate', 'INCOMPATIBLE', ['مفتاح المنطقة الأم غير موجود في الصفوف المسترجعة'], 'detail:gastat_detailed_population')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('سكان 2022 حسب المنطقة', 'الاستجابة الحالية على مستوى المحافظة بلا مفتاح منطقة أم.', 'استخراج Province ID/Province/Year/Population كامل.'),
      missing('تعريف المقام', '«نصيب الفرد» لا يحدد معامل التحجيم.', 'تثبيت لكل 10,000 نسمة أو قيمة أخرى قبل الحساب.'),
      missing('سياسة الوسيط', 'التعادل والقيم المفقودة غير معرفين.', 'وسيط غير موزون لـ13 منطقة مع سياسة ties/missing.')
    ],
    limitations: [{ type: 'GEOGRAPHY_DENOMINATOR_GAP', detail_ar: 'البسط إقليمي والمقام المسترجع على مستوى المحافظة.', what_would_close: 'مقام إقليمي موثق لنفس السنة.' }],
    atomic_claims: [
      claim('X04-C1', 'REPORTED', 'صفوف السكان المسترجعة لا تحمل معرف المنطقة الأم.', 'VERIFIED', ['detail:gastat_detailed_population']),
      claim('X04-C2', 'NEGATIVE', 'لا يمكن حساب نسب إقليمية أو وسيطها دون مقام إقليمي مطابق.', 'VERIFIED', ['detail:sama_health_facilities_resources', 'detail:gastat_detailed_population'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-05-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['catalog', 'oracle', 'detail:gastat_inflation', 'detail:sama_pos_sectors'],
    answer_text: join([
      'النتيجة: في مايو 2026، بلغ تضخم «الأغذية والمشروبات» 0.73% على أساس سنوي. وفي الشهر نفسه ارتفعت قيمة مبيعات نقاط البيع لقطاع «أنشطة الإقامة والخدمات الغذائية» 13.64% مقارنة بمايو 2025، وارتفع عدد العمليات 11.41%.',
      'المنقول: مؤشر أسعار الأغذية والمشروبات انتقل من 101.8681 في 2025-05 إلى 102.6077 في 2026-05، والمصدر يعرض معدل تضخم 0.72598%. مبيعات نقاط البيع انتقلت من 18,273,560.2496 إلى 20,765,360.4009 ألف ريال، والعمليات من 511,785.353 إلى 570,183.567 ألف عملية. كلا المسارين شهري ووطني في اللقطة.',
      'المحسوب: نمو المبيعات = (20,765,360.4009 ÷ 18,273,560.2496 − 1) × 100 = 13.6361% ≈ 13.64%. نمو العمليات = (570,183.567 ÷ 511,785.353 − 1) × 100 = 11.4107% ≈ 11.41%. تغير مؤشر الغذاء بالطريقة نفسها = 0.7260%، متسق مع المعدل المنقول.',
      'الاستنتاج المحدود: القيمة الاسمية وعدد عمليات نقاط البيع في قطاع الإقامة والخدمات الغذائية نما أسرع عدديًا من تضخم سلة الأغذية والمشروبات في هذه المقارنة الشهرية. لكن السلتين غير متطابقتين: نقاط البيع تشمل الإقامة والخدمات الغذائية، والتضخم يقيس أسعار سلة غذاء ومشروبات؛ لذلك لا تعني الفجوة نمو كمية الطعام ولا تثبت علاقة سببية.'
    ]),
    reported_facts: [
      fact('X05-F1', 'معدل تضخم الأغذية والمشروبات في 2026-05 هو 0.7259818335%.', ['detail:gastat_inflation'], { value: 0.7259818335093593, unit: 'نسبة مئوية', period: '2026-05', geography: 'المملكة', frequency: 'شهري', dataset: 'CPI Inflation Rate by Main Section', publisher: 'الهيئة العامة للإحصاء' }),
      fact('X05-F2', 'مبيعات نقاط البيع للإقامة والخدمات الغذائية بلغت 20,765,360.40089 ألف ريال في 2026-05 مقابل 18,273,560.24961 ألف ريال في 2025-05.', ['detail:sama_pos_sectors'], { unit: 'ألف ريال', period: '2025-05/2026-05', geography: 'المملكة', frequency: 'شهري', dataset: 'Point of Sale Transactions by Economic Sector', publisher: 'البنك المركزي السعودي' }),
      fact('X05-F3', 'عمليات القطاع بلغت 570,183.567 ألف عملية في 2026-05 مقابل 511,785.353 ألف عملية في 2025-05.', ['detail:sama_pos_sectors'], { unit: 'ألف عملية', period: '2025-05/2026-05', geography: 'المملكة', frequency: 'شهري' })
    ],
    calculations: [
      { calculation_id: 'X05-K1', metric: 'نمو قيمة مبيعات نقاط البيع على أساس سنوي', formula: '(current / prior - 1) * 100', inputs: [{ period: '2025-05', value: 18273560.24960999, unit: 'ألف ريال' }, { period: '2026-05', value: 20765360.400890004, unit: 'ألف ريال' }], output: { value: 13.636095633488821, rounded_value: 13.64, unit: 'نسبة مئوية' }, rounding_rule: 'تقريب العرض إلى منزلتين عشريتين بعد الحساب بالقيم الخام', compatibility_proof: 'المؤشر والقطاع والجغرافيا والشهر متماثلة؛ المقارنة سنوية الشهر نفسه.', evidence_ref_ids: refs('detail:sama_pos_sectors') },
      { calculation_id: 'X05-K2', metric: 'نمو عدد عمليات نقاط البيع على أساس سنوي', formula: '(current / prior - 1) * 100', inputs: [{ period: '2025-05', value: 511785.35299999994, unit: 'ألف عملية' }, { period: '2026-05', value: 570183.567, unit: 'ألف عملية' }], output: { value: 11.410684900941304, rounded_value: 11.41, unit: 'نسبة مئوية' }, rounding_rule: 'تقريب العرض إلى منزلتين عشريتين', compatibility_proof: 'المؤشر والقطاع والجغرافيا والشهر متماثلة.', evidence_ref_ids: refs('detail:sama_pos_sectors') },
      { calculation_id: 'X05-K3', metric: 'تغير مؤشر أسعار الأغذية والمشروبات على أساس سنوي', formula: '(current / prior - 1) * 100', inputs: [{ period: '2025-05', value: 101.8681256091796, unit: 'نقطة مؤشر' }, { period: '2026-05', value: 102.60766969523874, unit: 'نقطة مؤشر' }], output: { value: 0.7259818335093593, rounded_value: 0.73, unit: 'نسبة مئوية' }, rounding_rule: 'تقريب العرض إلى منزلتين عشريتين', compatibility_proof: 'الباب والشهر والجغرافيا متماثلة، والنتيجة متسقة مع حقل Inflation rate.', evidence_ref_ids: refs('detail:gastat_inflation') }
    ],
    inferences: [
      inference('X05-I1', 'نمو قيمة المبيعات والعمليات أكبر عدديًا من تضخم الغذاء في مايو 2026.', 'مقارنة وصفية فقط؛ لا تقيس الحجم الحقيقي ولا تنسب السببية لأن نطاق القطاع والسلة مختلف.', ['detail:gastat_inflation', 'detail:sama_pos_sectors'])
    ],
    compatibility_matrix: [
      row('تضخم مؤشر أسعار المستهلك حسب الباب', 'الهيئة العامة للإحصاء', 'gastat_inflation', 'Inflation rate', 'تغير أسعار سلة الأغذية والمشروبات', 'نسبة مئوية', '2025-05/2026-05', 'شهري', 'المملكة', 'Main Division: الأغذية والمشروبات', 'PARTIAL', ['ليس مبيعات ولا كمية'], 'detail:gastat_inflation'),
      row('معاملات نقاط البيع حسب القطاع', 'البنك المركزي السعودي', 'sama_pos_sectors', 'Sales; Number of Transactions', 'قيمة وعدد عمليات الإقامة والخدمات الغذائية', 'ألف ريال؛ ألف عملية', '2025-05/2026-05', 'شهري', 'المملكة', 'Economic Sectors: أنشطة الإقامة والخدمات الغذائية', 'PARTIAL', ['القطاع أوسع من الأغذية والمشروبات', 'القيمة اسمية'], 'detail:sama_pos_sectors')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('مطابقة سلة غذائية خالصة في نقاط البيع', 'قطاع نقاط البيع يجمع الإقامة والخدمات الغذائية.', 'قطاع/تاجر غذائي مطابق لسلة التضخم أو جسر تصنيفي موثق.'),
      missing('مقياس كمية حقيقي', 'المبيعات اسمية وعدد العمليات لا يساوي الكمية.', 'كميات أو قيمة حقيقية منكمشة بأسعار مناسبة.')
    ],
    limitations: [{ type: 'SEMANTIC_SCOPE', detail_ar: 'المقارنة صحيحة عدديًا لكنها بين سلة أسعار وقطاع مدفوعات أوسع.', what_would_close: 'بيانات نقاط بيع غذائية مطابقة ومقياس كمية.' }],
    atomic_claims: [
      claim('X05-C1', 'REPORTED', 'تضخم الأغذية والمشروبات في 2026-05 هو 0.7259818335%.', 'VERIFIED', ['detail:gastat_inflation']),
      claim('X05-C2', 'CALCULATED', 'نمو قيمة مبيعات نقاط البيع للقطاع بين 2025-05 و2026-05 هو 13.6360956335%.', 'VERIFIED', ['detail:sama_pos_sectors']),
      claim('X05-C3', 'CALCULATED', 'نمو عدد العمليات للفترة نفسها هو 11.4106849009%.', 'VERIFIED', ['detail:sama_pos_sectors']),
      claim('X05-C4', 'INFERENCE', 'الفروق وصفية ولا تثبت نمو كمية الطعام أو السببية.', 'BOUNDED', ['detail:gastat_inflation', 'detail:sama_pos_sectors'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-06-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail:tourism_occupancy_rate_monthly', 'detail:gastat_gdp'],
    answer_text: join([
      'النتيجة: لا توجد مقارنة واحدة صحيحة بين «نمو السياحة» و«نمو الإقامة والطعام والنقل» لأن الطرف الأول غير معرف، والمساران المتاحان لا يقيسان الشيء نفسه.',
      'المنقول: معدل الإشغال السياحي شهري حسب المنطقة ونوع الإقامة وينتهي في 2024-12. الناتج الحقيقي ربع سنوي حسب أقسام النشاط، ويتضمن أقسامًا اقتصادية للإقامة والخدمات الغذائية والنقل والتخزين، ويمتد إلى 2025-Q4.',
      'المحسوب: لا شيء. الإشغال نسبة استخدام لطاقة عرض غير موجودة في الدليل، بينما الناتج قيمة مضافة؛ زيادة الإشغال لا تساوي نمو عدد السياح أو الإنفاق أو الناتج. كما لا توجد في السؤال نافذة سنوية أو تعريف لداخلي/وافد أو رحلات/سياح/ليالٍ.',
      'ما يغلق السؤال: اختيار مقياس سياحي واحد (سياح، ليالٍ، إنفاق أو إشغال مع الطاقة المتاحة)، اختيار ناتج حقيقي للقطاعين، توحيد 2023→2024 مثلًا، وتثبيت الجغرافيا الوطنية. بعدها تعرض معدلات النمو جنبًا إلى جنب كتزامن فقط.'
    ]),
    reported_facts: [
      fact('X06-F1', 'دليل الإشغال السياحي شهري وإقليمي وينتهي في 2024-12.', ['detail:tourism_occupancy_rate_monthly'], { frequency: 'شهري', geography: 'منطقة إدارية', unit: 'معدل', period: '2021-01/2024-12' }),
      fact('X06-F2', 'دليل الناتج ربع سنوي ووطني حسب النشاط ويمتد حتى 2025-Q4.', ['detail:gastat_gdp'], { frequency: 'ربع سنوي', geography: 'المملكة', unit: 'مليون ريال', period: '2010-Q1/2025-Q4' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('معدل الإشغال السياحي', 'وزارة السياحة', 'tourism_occupancy_rate_monthly', 'Occupancy Rate', 'نسبة الوحدات/الغرف المشغولة حسب نوع الإقامة', 'معدل', '2021-01/2024-12', 'شهري', 'منطقة إدارية', 'Accommodation Type', 'INCOMPATIBLE', ['ليس عدد سياح أو إنفاقًا', 'الطاقة المتاحة غير مسترجعة'], 'detail:tourism_occupancy_rate_monthly'),
      row('الناتج الحقيقي حسب النشاط', 'الهيئة العامة للإحصاء', 'gastat_gdp', 'GDP', 'قيمة مضافة حقيقية حسب قسم النشاط', 'مليون ريال', '2010-Q1/2025-Q4', 'ربع سنوي', 'المملكة', 'Economic Activity Section', 'INCOMPATIBLE', ['مفهوم مختلف', 'جغرافيا وتواتر مختلفان'], 'detail:gastat_gdp')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('تعريف نمو السياحة', 'قد يعني السياح أو الليالي أو الإنفاق أو الإشغال.', 'اختيار مؤشر واحد ووحدته ونطاقه.'),
      missing('طاقة الإقامة المتاحة', 'الإشغال بلا مقام عرض لا يقيس الحجم.', 'عدد الغرف/الوحدات المتاحة لنفس الفترة والمنطقة.'),
      missing('فترة وجغرافيا موحدة', 'شهري إقليمي مقابل ربع سنوي وطني.', 'تجميع سنوي موثق إلى المملكة لفترة 2023/2024.')
    ],
    limitations: [{ type: 'CONCEPT_AND_DENOMINATOR_GAP', detail_ar: 'الإشغال والناتج مفهومان مختلفان ولا يوجد مقام طاقة أو تعريف للسياحة.', what_would_close: 'تعريف المؤشر والمقام والفترة.' }],
    atomic_claims: [
      claim('X06-C1', 'REPORTED', 'الإشغال المسترجع شهري إقليمي والناتج ربع سنوي وطني.', 'VERIFIED', ['detail:tourism_occupancy_rate_monthly', 'detail:gastat_gdp']),
      claim('X06-C2', 'NEGATIVE', 'المقارنة المطلوبة غير محددة حسابيًا دون تعريف «نمو السياحة».', 'VERIFIED', ['catalog', 'detail:tourism_occupancy_rate_monthly', 'detail:gastat_gdp'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-07-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail:gastat_contribution_of_digital_economy_to_gdp', 'detail:gastat_employment_population_ratio'],
    answer_text: join([
      'النتيجة: يمكن وصف مساهمة الاقتصاد الرقمي، لكن لا يمكن مقارنتها بعمالة المعلومات والاتصالات من الدليل الحالي لأن مقياس العمالة القطاعي غير موجود.',
      'المنقول: مساهمة الاقتصاد الرقمي في الناتج متاحة سنويًا للأعوام 2022–2024 كنسبة مئوية. دليل العمالة المسترجع هو نسبة العمالة إلى السكان حسب المنطقة والجنس والجنسية وربع السنة، وليس عدد أو نسبة العاملين في قطاع المعلومات والاتصالات.',
      'المحسوب: لا شيء. تسمية نسبة العمالة العامة «عمالة معلومات واتصالات» ستكون استبدالًا غير مشروع، كما أن حصة الناتج لا تقارن مباشرة بعدد العاملين من دون تعريف إنتاجية أو حصة توظيف.',
      'ما يغلق السؤال: عدد المشتغلين في ISIC J أو حصة القطاع من إجمالي العمالة للأعوام 2022–2024، وتعريف هل المقارنة بين الحصتين أم معدلي نموهما. عندها تعرض مساهمة الناتج وحصة العمالة أو الإنتاجية مع وحدات وصيغ منفصلة.'
    ]),
    reported_facts: [
      fact('X07-F1', 'حصة الاقتصاد الرقمي من الناتج متاحة سنويًا من 2022 إلى 2024.', ['detail:gastat_contribution_of_digital_economy_to_gdp'], { period: '2022/2024', frequency: 'سنوي', geography: 'المملكة', unit: 'نسبة مئوية' }),
      fact('X07-F2', 'مؤشر العمالة المتاح ليس مقسمًا حسب قطاع المعلومات والاتصالات.', ['detail:gastat_employment_population_ratio'], { period: '2023-Q1/2026-Q1', frequency: 'ربع سنوي', geography: 'منطقة', unit: 'نسبة مئوية' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('حصة الاقتصاد الرقمي من الناتج', 'الهيئة العامة للإحصاء', 'gastat_contribution_of_digital_economy_to_gdp', 'Percentage', 'مساهمة الاقتصاد الرقمي في الناتج', 'نسبة مئوية', '2022/2024', 'سنوي', 'المملكة', 'Economic Sectors', 'PARTIAL', ['متاح للحصة الاقتصادية فقط'], 'detail:gastat_contribution_of_digital_economy_to_gdp'),
      row('نسبة العمالة إلى السكان', 'الهيئة العامة للإحصاء', 'gastat_employment_population_ratio', 'Ratio', 'نسبة العمالة العامة إلى السكان', 'نسبة مئوية', '2023-Q1/2026-Q1', 'ربع سنوي', 'منطقة إدارية', 'لا يوجد قطاع نشاط', 'INCOMPATIBLE', ['لا يعزل قطاع المعلومات والاتصالات'], 'detail:gastat_employment_population_ratio')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('عمالة قطاع المعلومات والاتصالات', 'غير موجودة في الاستجابة المستخدمة.', 'عدد المشتغلين أو حصتهم في ISIC J سنويًا 2022–2024.'),
      missing('تعريف المقارنة', 'حصة ناتج مقابل عدد/حصة عمالة غير محدد.', 'اختيار حصة مقابل حصة أو معدل نمو مقابل معدل نمو.')
    ],
    limitations: [{ type: 'SECTOR_MEASURE_GAP', detail_ar: 'مقياس العمالة القطاعي المطلوب غير موجود.', what_would_close: 'سلسلة عمالة ISIC J وتعريف المقارنة.' }],
    atomic_claims: [
      claim('X07-C1', 'REPORTED', 'حصة الاقتصاد الرقمي تغطي 2022–2024.', 'VERIFIED', ['detail:gastat_contribution_of_digital_economy_to_gdp']),
      claim('X07-C2', 'NEGATIVE', 'لا يمكن مقارنة الحصة بعمالة معلومات واتصالات غير مسترجعة.', 'VERIFIED', ['detail:gastat_contribution_of_digital_economy_to_gdp', 'detail:gastat_employment_population_ratio'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-08-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail:gastat_population_growth', 'detail:sama_electricity_consumption_subregion', 'detail:sama_water_consumption_region'],
    answer_text: join([
      'النتيجة: لا يمكن إجراء مقارنة ثلاثية حسب المناطق بين النمو السكاني واستهلاك الكهرباء والمياه من الأدلة الحالية، رغم وجود سنة مشتركة هي 2022.',
      'المنقول: النمو السكاني والمياه متاحان سنويًا حسب المنطقة الإدارية حتى 2022. الكهرباء متاحة سنويًا حتى 2022 لكنها مصنفة حسب أربع مناطق تشغيلية فرعية (مثل الوسطى) وفئة الاستهلاك، لا حسب المناطق الإدارية الـ13. وحدة الكهرباء معنونة Megawatts رغم أن الحقل يسمى استهلاكًا، بينما المياه ألف متر مكعب.',
      'المحسوب: لا شيء. توزيع استهلاك منطقة كهربائية تشغيلية على مناطق إدارية يتطلب جدول تغطية وأوزانًا غير موجودة، كما يجب التحقق هل مقياس الكهرباء طاقة فعلًا أم قدرة لأن MW ليست MWh. جمع فئات الاستهلاك يحتاج أيضًا اختبار عدم التداخل.',
      'ما يغلق السؤال: كهرباء 2021 و2022 حسب Province ID بوحدة طاقة موثقة (MWh أو GWh)، ماء وسكان للفترتين نفسيهما، وسياسة جمع فئات الاستهلاك. بعدها تحسب معدلات النمو الثلاثة داخل كل منطقة دون تحويلها إلى ادعاء سببي.'
    ]),
    reported_facts: [
      fact('X08-F1', 'النمو السكاني والمياه يستخدمان مستوى المنطقة الإدارية ويصلان إلى 2022.', ['detail:gastat_population_growth', 'detail:sama_water_consumption_region'], { period: 'حتى 2022', frequency: 'سنوي', geography: 'منطقة إدارية' }),
      fact('X08-F2', 'الكهرباء مصنفة حسب Subregion وفئة الاستهلاك، ووحدتها المعروضة Megawatts.', ['detail:sama_electricity_consumption_subregion'], { period: '2005/2022', frequency: 'سنوي', geography: 'منطقة تشغيلية فرعية', unit: 'Megawatts' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('النمو السكاني حسب المنطقة', 'الهيئة العامة للإحصاء', 'gastat_population_growth', 'Growth', 'معدل نمو السكان', 'نسبة مئوية', '2011/2022', 'سنوي', 'منطقة إدارية', 'Province', 'PARTIAL', ['لا توجد قيمة سكان خام في هذا المسار'], 'detail:gastat_population_growth'),
      row('استهلاك الكهرباء حسب المنطقة الفرعية', 'البنك المركزي السعودي', 'sama_electricity_consumption_subregion', 'Megawatts', 'استهلاك حسب فئة ومنطقة تشغيلية', 'MW كما هو معنْون', '2005/2022', 'سنوي', 'Subregion', 'INCOMPATIBLE', ['جغرافيا تشغيلية لا إدارية', 'MW/MWh غير محسوم', 'فئات استهلاك'], 'detail:sama_electricity_consumption_subregion'),
      row('استهلاك المياه حسب المنطقة', 'البنك المركزي السعودي', 'sama_water_consumption_region', 'Thousand cubic meters', 'حجم استهلاك المياه', 'ألف متر مكعب', '2008/2022', 'سنوي', 'منطقة إدارية', 'Province', 'PARTIAL', ['يحتاج 2021/2022 لحساب النمو'], 'detail:sama_water_consumption_region')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('خريطة Subregion→Province', 'لا توجد تغطية أو أوزان في الدليل.', 'جدول رسمي لتخصيص الكهرباء للمناطق الإدارية.'),
      missing('وحدة طاقة كهربائية مؤكدة', 'MW قدرة بينما السؤال عن استهلاك.', 'توثيق MWh/GWh أو تفسير رسمي للمقياس.'),
      missing('فئتا سنة متتاليتان قابلة للجمع', 'يلزم منع ازدواج فئات الاستهلاك.', 'صفوف إجمالي رسمية أو قاعدة جمع موثقة لعامي 2021/2022.')
    ],
    limitations: [{ type: 'GEOGRAPHY_AND_UNIT_GAP', detail_ar: 'الكهرباء لا تطابق جغرافيا المنطقة ووحدتها ملتبسة بين القدرة والطاقة.', what_would_close: 'خريطة جغرافية ووحدة طاقة موثقة.' }],
    atomic_claims: [
      claim('X08-C1', 'REPORTED', 'الكهرباء متاحة حسب Subregion لا Province ووحدتها المعروضة Megawatts.', 'VERIFIED', ['detail:sama_electricity_consumption_subregion']),
      claim('X08-C2', 'NEGATIVE', 'لا يمكن بناء مقارنة إقليمية ثلاثية دون تحويل جغرافي ووحدة طاقة صحيحين.', 'VERIFIED', ['detail:gastat_population_growth', 'detail:sama_electricity_consumption_subregion', 'detail:sama_water_consumption_region'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-09-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail:gastat_gdp', 'detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:building_permits'],
    answer_text: join([
      'النتيجة: الأدلة تثبت وجود مؤشرات شهرية مرشحة—نقاط البيع، التضخم، وتراخيص البناء—لكنها لا تثبت أن أيًا منها «يسبق» تغير الناتج الربع سنوي. لذلك لا أرتب مؤشرات قائدة.',
      'المنقول: نقاط البيع والتضخم شهريان حتى 2026-05، وتراخيص البناء حتى 2026-04؛ الناتج الحقيقي ربع سنوي حتى 2025-Q4. وجود تواتر أعلى وزمن أطول لا يساوي علاقة سبْق تنبؤية.',
      'المحسوب: لا شيء. يلزم تعريف الناتج المستهدف (كلي أم قطاعي، حقيقي أم اسمي)، نافذة تدريب واختبار، طريقة تحويل الأشهر إلى أرباع، عدد الإبطاءات، معالجة الموسمية والمراجعات، ومقياس أداء خارج العينة. مقارنة الارتباطات داخل العينة وحدها لا تكفي.',
      'ما يغلق السؤال: vintage ثابت لكل سلسلة، تصميم lead/lag مسجل مسبقًا، اختبار خارج العينة بعد خط أساس بسيط، وتصحيح تعدد الاختبارات. عندها يوصف المؤشر بأنه «يحسن التنبؤ في الاختبار المحدد» لا بأنه سبب لتغير الناتج.'
    ]),
    reported_facts: [
      fact('X09-F1', 'توجد سلاسل شهرية كاملة لنقاط البيع والتضخم وتراخيص البناء في الأدلة.', ['detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:building_permits'], { frequency: 'شهري', geography: 'المملكة' }),
      fact('X09-F2', 'الناتج الحقيقي المسترجع ربع سنوي حتى 2025-Q4.', ['detail:gastat_gdp'], { frequency: 'ربع سنوي', period: '2010-Q1/2025-Q4', geography: 'المملكة', unit: 'مليون ريال' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('معاملات نقاط البيع حسب القطاع', 'البنك المركزي السعودي', 'sama_pos_sectors', 'Sales; Number of Transactions', 'نشاط دفع اسمي حسب القطاع', 'ألف ريال؛ ألف عملية', '2016-01/2026-05', 'شهري', 'المملكة', 'Economic Sectors', 'CANDIDATE_ONLY', ['يلزم تجميع واختبار زمني خارج العينة'], 'detail:sama_pos_sectors'),
      row('تضخم المستهلك حسب الباب', 'الهيئة العامة للإحصاء', 'gastat_inflation', 'Inflation rate', 'تغير أسعار المستهلك', 'نسبة مئوية', '2013-01/2026-05', 'شهري', 'المملكة', 'Main Division', 'CANDIDATE_ONLY', ['يلزم موسمية ومراجعات واختبار'], 'detail:gastat_inflation'),
      row('تراخيص البناء', 'الهيئة العامة للإحصاء', 'building_permits', 'Number of Building Permits', 'عدد التراخيص', 'ترخيص', '2023-01/2026-04', 'شهري', 'المملكة', 'لا قطاع تفصيلي في الاستجابة', 'CANDIDATE_ONLY', ['نافذة قصيرة'], 'detail:building_permits'),
      row('الناتج الحقيقي حسب النشاط', 'الهيئة العامة للإحصاء', 'gastat_gdp', 'GDP', 'الناتج المستهدف', 'مليون ريال', '2010-Q1/2025-Q4', 'ربع سنوي', 'المملكة', 'Economic Activity Section', 'TARGET_UNDEFINED', ['يجب تحديد الكلي/القطاعي والمعالجة الموسمية'], 'detail:gastat_gdp')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('تعريف المتغير المستهدف', 'الناتج الكلي/القطاعي والحقيقي/الاسمي غير محدد.', 'تثبيت سلسلة هدف واحدة.'),
      missing('تصميم زمني مسجل', 'لا توجد نافذة أو إبطاءات أو baseline.', 'بروتوكول lead/lag وتدريب/اختبار خارج العينة.'),
      missing('vintages والمراجعات', 'اللقطة الحالية لا تعيد ما كان معلومًا وقت التنبؤ.', 'لقطات تاريخية as-of-date لكل إصدار.')
    ],
    limitations: [{ type: 'PREDICTIVE_VALIDATION_GAP', detail_ar: 'وجود مؤشرات شهرية لا يثبت السبق التنبؤي.', what_would_close: 'اختبار زمني خارج العينة مع vintages.' }],
    atomic_claims: [
      claim('X09-C1', 'REPORTED', 'السلاسل المرشحة شهرية والناتج ربع سنوي.', 'VERIFIED', ['detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:building_permits', 'detail:gastat_gdp']),
      claim('X09-C2', 'NEGATIVE', 'لا يثبت الدليل الحالي أي مؤشر قائد دون اختبار زمني خارج العينة.', 'VERIFIED', ['catalog', 'detail:gastat_gdp', 'detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:building_permits'])
    ],
    expected_behavior_checks: crossChecks
  },

  'X-10-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'oracle', 'detail_manifest', 'product_decision_jobs', 'product_prefilter'],
    answer_text: join([
      'النتيجة: لا يمكن تصنيف مجموعات البيانات إلى «قيمة قرار عالية وآخر فترة منخفضة» تصنيفًا مكتملًا من اللقطة الحالية.',
      'المنقول: الفهرس المجمد يحتوي 277 مكعبًا ويصف المصدر والأبعاد والمقاييس والتواتر، لكنه لا يحتوي في صف واحد آخر فترة فعلية لكل مكعب. دليل التفاصيل الكامل يغطي 34 مكعبًا فقط. كما أن «قيمة القرار» لم تُقَس عبر مشترين؛ الموجود ثلاثة عقود قرار داخلية واختبارات منتج بلا مقابلات أو دفع.',
      'المحسوب: لا شيء. ترتيب 277 مجموعة باستخدام آخر فترة لـ34 فقط سيخلط «غير مفحوص» مع «قديم»، وإسناد قيمة قرار من رأي الفريق سيحول فرضية إلى حقيقة.',
      'ما يغلق السؤال: مسح آلي كامل لآخر فترة ووتيرة التحديث والمراجعات لكل 277 مكعبًا، ثم score مسجل مسبقًا لقيمة القرار يعتمد قرارًا ومشتريًا وتكلفة تأخير ودليل استخدام. عندها يمكن إخراج ربع أعلى قيمة قرار المتقاطع مع ربع أدنى حداثة، مع نشر القيم لا الصفات.'
    ]),
    reported_facts: [
      fact('X10-F1', 'الفهرس الكامل المجمد يضم 277 مكعبًا.', ['catalog'], { value: 277, unit: 'مكعب بيانات', period: 'لقطة 2026-07-13', geography: 'السعودية' }),
      fact('X10-F2', 'دليل التفاصيل الحالي يغطي 34 مكعبًا، لا جميع 277.', ['detail_manifest'], { value: 34, unit: 'مكعب بيانات', period: 'لقطة 2026-07-13' }),
      fact('X10-F3', 'اختيار المنتجات الحالي داخلي ولا يمثل دليل سوق أو قيمة قرار مقاسة لدى مشترين.', ['product_prefilter', 'product_decision_jobs'], { period: 'Package 03', geography: 'داخلي' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [
      row('فهرس DataSaudi الكامل', 'منصة بيانات السعودية/الناشرون الأصليون', '277 cubes', 'metadata', 'وصف المصدر والأبعاد والمقاييس والتواتر', 'بيانات وصفية', 'لقطة 2026-07-13', 'مختلط', 'مختلط', '277 schemas', 'PARTIAL', ['لا يحتوي آخر فترة فعلية موحدة', 'لا يحتوي قيمة قرار'], 'catalog'),
      row('دليل التفاصيل P03C', 'عدة ناشرين رسميين', '34 candidate cubes', 'observations', 'صفوف كاملة لمكعبات مرشحة محددة', 'مختلط', 'بحسب المكعب', 'مختلط', 'مختلط', '34 schemas', 'INCOMPLETE_POPULATION', ['34 من 277 فقط'], 'detail_manifest'),
      row('عقود وظائف القرار', 'بحث داخلي', 'ليس مكعبًا', 'decision jobs', 'ثلاثة عقود قرار داخلية', 'عقد نوعي', 'Package 03', 'غير دوري', 'داخلي', '3 products', 'NOT_MARKET_VALUE', ['لا مقابلات أو دفع'], 'product_decision_jobs', 'product_prefilter')
    ],
    opportunity_contracts: [],
    missing_inputs: [
      missing('آخر فترة لكل 277 مكعبًا', 'التفاصيل المسترجعة تغطي 34 فقط.', 'فحص كامل للصف الأخير مع اكتمال الصفحات.'),
      missing('درجة قيمة قرار', 'لا يوجد مقياس مشترٍ أو تكلفة تأخير.', 'عقد scoring مسجل مع دليل استخدام/مقابلات.'),
      missing('سياسة تعريف الانخفاض', '«منخفضة» بلا threshold أو quantile.', 'تعريف مثل الربع الأدنى للحداثة بالأيام.')
    ],
    limitations: [{ type: 'POPULATION_AND_VALUE_SCORE_GAP', detail_ar: 'التغطية الجزئية لا تسمح بترتيب كامل، وقيمة القرار غير مقاسة.', what_would_close: 'مسح 277/277 ونظام scoring مسجل.' }],
    atomic_claims: [
      claim('X10-C1', 'REPORTED', 'الفهرس يضم 277 مكعبًا ودليل التفاصيل يغطي 34.', 'VERIFIED', ['catalog', 'detail_manifest']),
      claim('X10-C2', 'NEGATIVE', 'لا يمكن ترتيب القيمة والحداثة لجميع المجموعات دون آخر فترة كاملة ودليل قيمة قرار.', 'VERIFIED', ['catalog', 'detail_manifest', 'product_decision_jobs', 'product_prefilter'])
    ],
    expected_behavior_checks: crossChecks
  }
};
