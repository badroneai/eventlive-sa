const join = (lines) => lines.join('\n\n');
const eid = (key) => 'EVID-' + key.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase();
const refs = (...keys) => keys.map(eid);
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
const limitation = (type, detail_ar, what_would_close) => ({ type, detail_ar, what_would_close });

const rights = (status, detail, evidenceKeys = ['rights_summary', 'rights_matrix']) => ({
  status,
  detail_ar: detail,
  evidence_ref_ids: refs(...evidenceKeys)
});

const payment = (status = 'NOT_TESTED') => ({
  status,
  interpretation_ar: status === 'NOT_TESTED' ? 'لا توجد مقابلة مشتري أو قبول سعر أو مسار ميزانية أو دفعة؛ أي سعر أو مشترٍ أدناه فرضية اختبار.' : 'الحالة كما هي موضحة، ولا تمثل دفعًا ما لم يذكر ذلك صراحة.',
  evidence_ref_ids: refs('market_evidence', 'pricing_readiness')
});

const dataset = (cube_id, name_ar, publisher, use_ar, evidenceKey) => ({
  cube_id,
  name_ar,
  publisher,
  use_ar,
  evidence_ref_ids: refs(evidenceKey)
});

const contract = (contract_id, opportunity_name_ar, buyer_role_ar, decision_ar, datasets, data_gap_ar, cadence, distribution, rights_gate, payment_hypothesis_status = payment()) => ({
  contract_id,
  opportunity_name_ar,
  buyer: { role_ar: buyer_role_ar, evidence_status: 'HYPOTHESIZED_NOT_VALIDATED' },
  decision_ar,
  datasets,
  data_gap_ar,
  cadence,
  distribution,
  rights_gate,
  payment_hypothesis_status
});

const oppChecks = [
  { behavior: 'name_buyer', status: 'PASS', evidence: 'كل عقد يسمي دور المشتري ويميز أنه فرضية غير متحققة.' },
  { behavior: 'name_decision', status: 'PASS', evidence: 'كل عقد يربط المنتج بقرار تشغيلي محدد.' },
  { behavior: 'cite_dataset', status: 'PASS', evidence: 'كل عقد يسمي مجموعات فعلية ويربطها بأدلة ذات SHA-256.' },
  { behavior: 'state_data_gap', status: 'PASS', evidence: 'كل عقد يسمي المدخل المفقود أو حد الاستعمال صراحة.' },
  { behavior: 'rights_gate', status: 'PASS', evidence: 'كل عقد يحمل بوابة حقوق على مستوى نمط الإخراج ولا يستنتج الحق من الإتاحة العامة.' }
];

export const OPPORTUNITY_DEFINITIONS = {
  'OPP-01-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['catalog', 'product_decision_jobs', 'trust_summary', 'regional_summary', 'radar_summary', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness', 'detail:sama_pos_sectors'],
    answer_text: join([
      'الجواب التنفيذي: توجد ثلاثة قرارات دورية يمكن دعمها دون الادعاء أن السوق أثبت الدفع لها. أسبوعيًا: هل يُوجَّه إصدار رسمي جديد إلى مراجعة بشرية، وأي مكعبات مرشحة ترتبط به؟ شهريًا: هل تُعتمد حزمة مؤشرات للاستخدام الداخلي أم تُحجب بسبب مشكلة مصدر أو حداثة أو مخطط؟ شهريًا أو ربع سنويًا: هل توجد أدلة متوافقة تكفي لقائمة مناطق قصيرة، أم يجب إصدار NO_RANK؟',
      'الدليل التشغيلي: رادار الإصدارات أعاد تشغيل 12 إصدارًا محفوظًا؛ 8 رُبطت بمرشحين يحتاجون مراجعة و4 بقيت غير مطابقة، ولم يدّعِ أي ربط متحقق. تدقيق الثقة نفذ 3 حالات وأنتج قرار حوكمة في 3/3 دون إخفاء عيب P0. الموجز الإقليمي رفض الترتيب بأمان في 3/3 لأن الجغرافيا والفترة والمقام لم تتوافق.',
      'الحد السوقي: أدوار المشترين أدناه فرضيات—فريق اقتصاد/تنظيم، مدير بيانات، وفريق استراتيجية مواقع—وليست مقابلات. لا توجد دفعات أو قبول سعر. كما أن كل إخراج خارجي مشتق من DataSaudi أو SAMA أو السياحة محجوب حتى ترخيص دقيق؛ المسموح المؤكد الآن هو التشغيل الداخلي المحكوم.',
      'الخلاصة: القرارات الأسبوعية/الشهرية قابلة للبناء كعمليات داخلية، لكن تحويلها إلى اشتراك مدفوع ليس نتيجة هذه البيانات بعد؛ يلزم اختبار قرار حقيقي وميزانية وحقوق الإخراج.'
    ]),
    reported_facts: [
      fact('OPP01-F1', 'رادار الإصدارات أعاد تشغيل 12/12 إصدارًا: 8 مرشحة للمراجعة و4 غير مطابقة.', ['radar_summary'], { value: 12, unit: 'إصدار محفوظ', cadence: 'أسبوعي/عند الإصدار' }),
      fact('OPP01-F2', 'تدقيق الثقة أنتج إجراء حوكمة داخليًا في 3/3 حالات.', ['trust_summary'], { value: 3, unit: 'حالات', cadence: 'شهري/عند الحزمة' }),
      fact('OPP01-F3', 'الموجز الإقليمي لم يرتب أيًا من 3 حالات وأصدر 3 رفضات آمنة.', ['regional_summary'], { value: 3, unit: 'حالات', cadence: 'شهري أو ربع سنوي' })
    ],
    calculations: [],
    inferences: [
      inference('OPP01-I1', 'الإصدارات والثقة والفرز الإقليمي يمكن صياغتها كقرارات دورية لا كتقارير وصفية فقط.', 'قابلية التشغيل مثبتة داخليًا؛ الاحتياج والدفع الخارجيان غير مختبرين.', ['product_decision_jobs', 'trust_summary', 'regional_summary', 'radar_summary'])
    ],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP01-C-RADAR', 'توجيه الإصدارات الرسمية', 'قائد أبحاث اقتصادية أو امتثال', 'هل يدخل الإصدار قائمة المراجعة وأي ربط مرشح يحتاج تحققًا؟', [dataset('catalog+calendar', 'تقويمات الإصدارات وفهرس 277 مكعبًا', 'ناشرون رسميون/DataSaudi', 'تعريف الإصدار ومسارات الربط المرشحة', 'catalog')], 'لا يوجد قياس كشف حي أو تحقق مستقل لكل ربط، ولا SLA للتقويم.', 'أسبوعي أو عند الإصدار', ['تنبيه بريد/Slack داخلي', 'واجهة مراجعة', 'API داخلي'], rights('BLOCKED_EXTERNAL_PENDING_EXACT_LICENSE', 'التشغيل الداخلي مسموح؛ أي إعادة نشر أو API خارجي يتطلب حقوق كل مصدر.')),
      contract('OPP01-C-TRUST', 'مراقبة ثقة الحزم', 'مدير البيانات أو BI', 'اعتماد الحزمة أو حجبها أو إحالتها للتصحيح.', [dataset('277-cube-monitor', 'بيانات المخطط والحدات والحداثة لـ277 مكعبًا', 'DataSaudi والناشرون', 'فحوص المصدر والمخطط والاتساق', 'catalog')], 'لا توجد حدود قبول خاصة بعميل ولا بياناته الداخلية للمصالحة.', 'شهري وعند تغير المخطط', ['لوحة داخلية', 'تذكرة حوكمة', 'Webhook داخلي'], rights('INTERNAL_ONLY_UNTIL_LICENSE_AND_CUSTOMER_AUTHORITY', 'حزمة العميل تتطلب تفويض بياناته، والمصادر الخارجية تتطلب ترخيص الإخراج.')),
      contract('OPP01-C-REGION', 'فرز مناطق لقرار واحد', 'مدير استراتيجية مواقع أو توسع', 'هل تسمح الأدلة بقائمة 3–5 مناطق أم يجب NO_RANK؟', [dataset('sama_pos_sectors', 'معاملات نقاط البيع حسب القطاع', 'البنك المركزي السعودي', 'إشارة نشاط إن كانت الجغرافيا ملائمة', 'detail:sama_pos_sectors')], 'يلزم مبيعات خاصة ومنافسون وإيجارات ومقام وجغرافيا متوافقة؛ الالتقاط الحالي فشل 3/3.', 'شهري أو ربع سنوي', ['موجز قرار خاص', 'جلسة قرار'], rights('BLOCKED_EXTERNAL_PENDING_EXACT_SOURCE_OUTPUT_MATRIX', 'لا تسليم خارجي مشتق قبل ترخيص كل مجموعة ونمط الإخراج.'))
    ],
    missing_inputs: [],
    limitations: [limitation('NO_MARKET_VALIDATION', 'لا توجد مقابلات أو قبول سعر أو دفع.', 'اختبار قرار مسمى مع صاحب ميزانية وشرط شراء.'), limitation('RIGHTS', 'الحقوق الخارجية غير مصفاة.', 'ترخيص dataset-level ومراجعة قانونية لنمط التسليم.')],
    atomic_claims: [
      claim('OPP01-AC1', 'REPORTED', 'نفذت المنتجات الداخلية 12 replay و3 تدقيقات و3 رفضات ترتيب آمنة كما هو موثق.', 'VERIFIED', ['radar_summary', 'trust_summary', 'regional_summary']),
      claim('OPP01-AC2', 'INFERENCE', 'هذه العمليات تصلح لقرارات أسبوعية أو شهرية داخلية.', 'BOUNDED', ['product_decision_jobs', 'radar_summary', 'trust_summary', 'regional_summary']),
      claim('OPP01-AC3', 'REPORTED', 'لا يوجد دليل دفع أو مقابلات خارجية.', 'VERIFIED', ['market_evidence', 'pricing_readiness'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-02-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['product_decision_jobs', 'pricing_readiness', 'unit_economics', 'market_evidence', 'rights_summary', 'rights_matrix', 'trust_summary', 'regional_summary', 'radar_summary'],
    answer_text: join([
      'النتيجة الصادقة: لا نعرف بعد من سيدفع مقابل تقليل زمن القرار؛ لم تُجرَ مقابلة مشتري واحدة، ولم يُرسل عرض سعر، ولم يظهر مسار ميزانية أو دفعة. لذلك لا يجوز تحويل ثلاثة أدوار مرشحة إلى «مشترين».',
      'فرضيات الاختبار المحددة: مدير البيانات قد يدفع لتقليل زمن اعتماد/حجب حزمة عبر Data Trust Audit؛ قائد استراتيجية المواقع قد يدفع لتقليل زمن فرز منطقة عبر One-Decision Regional Brief؛ وفريق الاقتصاد أو الامتثال قد يدفع لتقليل زمن رصد إصدار عبر Saudi Release Radar. لكل منها بطاقة سعر مسجلة لكنها غير مرسلة: 12–25 ألف ريال للتدقيق، 7.5–20 ألفًا للموجز، و1.5–4.5 آلاف شهريًا للرادار، وجميعها قبل الضريبة وفرضيات لا أسعار سوق.',
      'ما يمكن حسمه داخليًا: تدقيق الثقة اجتاز بوابة الحقيقة الداخلية، الموجز الإقليمي قُتل في الالتقاط الحالي للترتيب، والرادار على HOLD_OR_KILL حتى قياس الجهد البشري. لكن هذه حالات تشغيل لا دليل دفع.',
      'ما يغلق السؤال: ثلاث مقابلات قرار مؤهلة على الأقل لكل دور، توثيق تكلفة التأخير والبديل الحالي وصاحب الميزانية، ثم عرض مشروط بالشراء يمر ببوابة الحقوق. وحده قبول تجريبي بميزانية/دفعة يحدد من يدفع.'
    ]),
    reported_facts: [
      fact('OPP02-F1', 'Package 03 لم يسجل مقابلات أو قبول سعر أو مسار ميزانية أو دفعات.', ['market_evidence', 'pricing_readiness'], { value: 0, unit: 'أحداث سوقية' }),
      fact('OPP02-F2', 'بطاقات الأسعار الثلاث مصممة وغير مرسلة.', ['pricing_readiness'], { status: 'designed_not_run', currency: 'SAR' }),
      fact('OPP02-F3', 'تدقيق الثقة وحده نجا من بوابة الحقيقة الداخلية؛ هذا لا يثبت طلبًا خارجيًا.', ['trust_summary'], { status: 'SURVIVES_INTERNAL_TRUTH_GATE' })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP02-HYP-AUDIT', 'تدقيق ثقة محدود', 'مدير بيانات أو BI', 'اعتماد حزمة أو حجبها قبل توقيع داخلي.', [dataset('277-cube-monitor', 'حزمة مصدر ومخطط وحداثة ومصالحة', 'الناشرون/بيانات العميل', 'تدقيق قابل للتتبع', 'trust_summary')], 'تكلفة الخطأ والوقت الحالي وحدود قبول المشتري غير مقاسة.', 'عند الحزمة ثم مراقبة شهرية', ['بيع مؤسسي مباشر', 'تقرير خاص'], rights('BLOCKED_UNTIL_CUSTOMER_AUTHORITY_AND_SOURCE_LICENSE', 'يلزم تفويض بيانات العميل وترخيص المصادر.'), payment()),
      contract('OPP02-HYP-REGION', 'موجز قرار منطقة واحدة', 'قائد توسع أو استراتيجية مواقع', 'اختيار 3–5 مناطق للدراسة أو إصدار NO_RANK.', [dataset('regional-inputs', 'السكان ونقاط البيع والصحة والسياحة', 'GASTAT/SAMA/وزارة السياحة', 'إشارات فرز عند التوافق', 'regional_summary')], 'الالتقاط الحالي غير قابل للترتيب، ولا توجد بيانات خاصة للتكلفة والطلب.', 'عند قرار موقع', ['بيع مباشر', 'ورشة قرار'], rights('BLOCKED_PENDING_EXACT_SOURCE_OUTPUT_MATRIX', 'حقوق كل مصدر ونمط الإخراج غير مصفاة.'), payment()),
      contract('OPP02-HYP-RADAR', 'رادار إصدار لفريق', 'قائد اقتصاد أو امتثال', 'تحديد ما يجب مراجعته فور صدوره.', [dataset('release-corpus', '12 إصدارًا رسميًا محفوظًا ومسارات مكعبات', 'ناشرون رسميون/DataSaudi', 'توجيه مراجعة', 'radar_summary')], 'الكشف الحي والجهد البشري الفعلي غير مقاسين.', 'شهري مع تنبيه عند الإصدار', ['تنبيهات فريق', 'لوحة مراجعة'], rights('BLOCKED_PENDING_WATCHED_SOURCE_RIGHTS', 'يلزم ترخيص المصادر المراقبة.'), payment())
    ],
    missing_inputs: [{ input: 'دليل الاستعداد للدفع', why_missing_or_incompatible: 'جميع العدادات السوقية صفر.', what_would_close: 'قبول عرض مشروط أو دفعة مع صاحب ميزانية.' }],
    limitations: [limitation('PAYMENT_EVIDENCE_ABSENT', 'لا يمكن الإجابة عن «من يدفع» من فرضيات الأدوار.', 'اختبارات سعر مصرح بها ونتائج ميزانية/دفع.'), limitation('RIGHTS_PRECONDITION', 'لا يجوز اختبار تسليم مدفوع قبل الحقوق.', 'إذن إخراج دقيق ومراجعة قانونية.')],
    atomic_claims: [
      claim('OPP02-AC1', 'REPORTED', 'عدد المقابلات وقبولات السعر والدفعات المسجلة يساوي صفرًا.', 'VERIFIED', ['market_evidence', 'pricing_readiness']),
      claim('OPP02-AC2', 'NEGATIVE', 'هوية المشتري الدافع غير قابلة للتحديد من الأدلة الحالية.', 'VERIFIED', ['market_evidence', 'pricing_readiness']),
      claim('OPP02-AC3', 'REPORTED', 'الأسعار المذكورة بطاقات بحث غير مرسلة.', 'VERIFIED', ['pricing_readiness'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-03-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['catalog', 'detail_manifest', 'regional_summary', 'product_decision_jobs', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness', 'detail:gastat_population_growth', 'detail:sama_pos_sectors', 'detail:sama_health_facilities_resources', 'detail:tourism_occupancy_rate_monthly'],
    answer_text: join([
      'أصعب ربط موثق ليس العثور على رقم واحد، بل توحيد أربع طبقات رسمية: السكان حسب المنطقة، نقاط البيع حسب مدينة/قطاع، الموارد الصحية حسب المنطقة، والسياحة حسب المنطقة ونوع الإقامة. الصعوبة تظهر في اختلاف مستوى الجغرافيا، الفترة، المقام، الوحدة والتصنيف؛ اختبار الموجز الإقليمي رفض الترتيب في 3/3 حالات بدل اختلاق تحويلات.',
      'ربط ثانٍ صعب هو تحويل إصدار رسمي إلى مكعب بيانات صحيح: من 12 إصدارًا محفوظًا كان 8 فقط «مرشحة للربط وتحتاج مراجعة» و4 غير مطابقة، ولم يصل أي منها إلى ربط متحقق. هذا يوضح أن التشابه الاسمي لا يكفي.',
      'الفرصة الناتجة هي طبقة توافق ومصدرية، لا لوحة أرقام: تبيّن للمستخدم ما الذي يمكن جمعه، وما الذي يجب رفضه، وأين يلزم crosswalk أو مقام. المشتري المفترض مدير بيانات/استراتيجية، وقراره اعتماد الربط أو منعه. لكن «يصعب على غير المتخصص» استنتاج تصميمي؛ لم تُجرَ دراسة مستخدمين تثبته.',
      'بوابة الحقوق: الاستخدام الداخلي ممكن، أما نشر الصفوف أو API مشتق فمحجوب حتى ترخيص كل مجموعة. دليل الدفع غير موجود.'
    ]),
    reported_facts: [
      fact('OPP03-F1', 'الموجز الإقليمي أصدر 3 NO_RANK من 3 بسبب عدم توافق الجغرافيا والفترة والمقام.', ['regional_summary'], { value: 3, unit: 'رفض آمن' }),
      fact('OPP03-F2', 'دليل التفاصيل يجمع 34 مكعبًا كاملًا متعدد المصادر والأبعاد.', ['detail_manifest'], { value: 34, unit: 'مكعب' })
    ],
    calculations: [],
    inferences: [inference('OPP03-I1', 'أعلى قيمة ربط مرشحة هي طبقة توافق تربط السكان والمدفوعات والصحة والسياحة وتمنع التصنيفات الخاطئة.', 'هذا استنتاج من إخفاقات التوافق الداخلية، لا قياس صعوبة لدى مستخدمين.', ['regional_summary', 'detail_manifest'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP03-COMPAT-LAYER', 'طبقة توافق البيانات الرسمية', 'مدير البيانات أو محلل استراتيجية', 'اعتماد ربط متعدد المصادر أو إصدار NO_JOIN مع السبب.', [
        dataset('gastat_population_growth', 'النمو السكاني حسب المنطقة', 'GASTAT', 'مقام/سياق سكاني', 'detail:gastat_population_growth'),
        dataset('sama_pos_sectors', 'نقاط البيع حسب القطاع', 'SAMA', 'إشارة نشاط', 'detail:sama_pos_sectors'),
        dataset('sama_health_facilities_resources', 'موارد المرافق الصحية', 'SAMA/مصدر صحي رسمي', 'عرض صحي', 'detail:sama_health_facilities_resources'),
        dataset('tourism_occupancy_rate_monthly', 'الإشغال السياحي الشهري', 'وزارة السياحة', 'استخدام طاقة الإقامة', 'detail:tourism_occupancy_rate_monthly')
      ], 'crosswalk جغرافي/تصنيفي ومقامات وفترات مشتركة غير مكتملة.', 'عند تحديث مصدر وشهريًا', ['واجهة تدقيق داخلية', 'API توافق داخلي'], rights('BLOCKED_EXTERNAL_PENDING_ALL_SOURCE_LICENSES', 'أضيق قرار حقوق يحكم الإخراج متعدد المصادر.'))
    ],
    missing_inputs: [],
    limitations: [limitation('USER_DIFFICULTY_NOT_MEASURED', 'لا يوجد اختبار مستخدم يثبت أن الربط صعب على غير المتخصص.', 'اختبار مهام مع مستخدمين وقياس زمن/أخطاء.' )],
    atomic_claims: [
      claim('OPP03-AC1', 'REPORTED', 'جميع حالات الموجز الإقليمي الثلاث رفضت الترتيب لعدم التوافق.', 'VERIFIED', ['regional_summary']),
      claim('OPP03-AC2', 'INFERENCE', 'طبقة توافق ومصدرية هي منتج مرشح لمعالجة هذه الفجوة.', 'BOUNDED', ['regional_summary', 'detail_manifest']),
      claim('OPP03-AC3', 'REPORTED', 'لا يوجد دليل دفع أو اختبار صعوبة مستخدم.', 'VERIFIED', ['market_evidence', 'pricing_readiness'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-04-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['regional_summary', 'product_decision_jobs', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness', 'detail:gastat_population_growth', 'detail:sama_pos_sectors', 'detail:tourism_occupancy_rate_monthly'],
    answer_text: join([
      'النتيجة: لا يمكن تسمية منطقة أو نشاط ذي «فجوة عرض وطلب» من الأدلة الرسمية الملتقطة. المتاح يعطي إشارات سياق، لكنه لا يقيس العرض والطلب على التعريف نفسه.',
      'الدليل: محاولة الموجز الإقليمي نفذت ثلاث حالات ولم ترتب أي حالة؛ السبب الموثق هو عدم توافق الجغرافيا والفترة والمقام. السكان إقليميون، نقاط البيع قطاعية/مدينية، والإشغال السياحي نسبة بلا طاقة عرض كاملة في نفس العقد. لا توجد إيجارات، مخزون منافسين، طاقة قابلة للبيع، مبيعات العميل أو catchment.',
      'المشتري المفترض فريق توسع، والقرار قائمة مناطق للفحص الميداني. لكن إخراج اسم منطقة الآن سيحوّل مؤشرات كلية إلى مطالبة طلب محلي وربحية غير مدعومة.',
      'ما يغلق السؤال: تعريف سوق واحد (منتج+جغرافيا+فترة)، مقياس عرض مباشر، مقياس طلب مباشر، أسعار/سعة، وبيانات خاصة أو ميدانية قابلة للتدقيق. ثم يحسب gap بوحدة مشتركة وتختبر الحساسية؛ قبل ذلك الحالة NO_RANK.'
    ]),
    reported_facts: [fact('OPP04-F1', 'صفر من ثلاث حالات إقليمية كانت قابلة للترتيب في الالتقاط الحالي.', ['regional_summary'], { value: 0, denominator: 3, unit: 'حالة قابلة للترتيب' })],
    calculations: [],
    inferences: [],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP04-GAP-SCREEN', 'فحص فجوة عرض وطلب إقليمية', 'قائد توسع أو استثمار تشغيلي', 'اختيار مناطق للفحص الميداني أو إصدار NO_RANK.', [
        dataset('gastat_population_growth', 'النمو السكاني حسب المنطقة', 'GASTAT', 'سياق السكان لا الطلب المباشر', 'detail:gastat_population_growth'),
        dataset('sama_pos_sectors', 'نقاط البيع حسب القطاع', 'SAMA', 'إنفاق اسمي لا طلب غير مخدوم', 'detail:sama_pos_sectors'),
        dataset('tourism_occupancy_rate_monthly', 'الإشغال السياحي', 'وزارة السياحة', 'استخدام لا طاقة العرض الكاملة', 'detail:tourism_occupancy_rate_monthly')
      ], 'العرض الفعلي والطلب القابل للشراء والأسعار والمنافسون والإيجارات وبيانات العميل مفقودة.', 'شهري أو عند قرار موقع', ['موجز خاص', 'ورشة قرار'], rights('BLOCKED_EXTERNAL_PENDING_EXACT_LICENSE', 'المصادر متعددة والحقوق الخارجية غير مصفاة.'))
    ],
    missing_inputs: [{ input: 'عرض وطلب مباشران', why_missing_or_incompatible: 'المؤشرات الحالية proxies غير متوافقة.', what_would_close: 'سعة/مخزون وأسعار وطلبات/مبيعات على سوق وجغرافيا وفترة واحدة.' }],
    limitations: [limitation('NO_DIRECT_SUPPLY_DEMAND', 'لا توجد وحدتان مباشرتان متوافقتان للعرض والطلب.', 'بيانات تشغيلية خاصة أو ميدانية مع تعريف سوق.')],
    atomic_claims: [
      claim('OPP04-AC1', 'REPORTED', 'الالتقاط الإقليمي الحالي لم يدعم أي ترتيب.', 'VERIFIED', ['regional_summary']),
      claim('OPP04-AC2', 'NEGATIVE', 'لا يمكن تسمية فجوة عرض وطلب قابلة للقياس من المؤشرات الحالية.', 'VERIFIED', ['regional_summary', 'detail:gastat_population_growth', 'detail:sama_pos_sectors', 'detail:tourism_occupancy_rate_monthly'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-05-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['radar_summary', 'trust_summary', 'unit_economics', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness', 'detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:building_permits'],
    answer_text: join([
      'المؤشرات الأقرب إلى «تنبيه» لا «تقرير» ثلاثة أنواع: (1) ظهور إصدار رسمي جديد أو بقاء ربطه غير مطابق؛ (2) تغير مخطط/مصدر/حداثة حزمة بما يوجب الحجب أو المراجعة؛ (3) عبور سلسلة شهرية حدًا يحدده المشتري، مثل نقاط البيع أو التضخم أو تراخيص البناء.',
      'المثبت داخليًا: رادار الإصدارات وجّه 12 replay دون تحويل المرشح إلى ربط متحقق، وتدقيق الثقة أصدر إجراء حوكمة في 3/3. أما تنبيهات الحدود العددية فليست جاهزة: لا يوجد مشتري عرّف threshold/action، وفرصة Sector Threshold Watchlist تفشل افتراضات الهامش الحالية.',
      'قاعدة المنتج: التنبيه يجب أن يحمل «ما تغير؟ لماذا يهم؟ ما القرار خلال كم ساعة؟ وما درجة الثقة؟» وأن يصمت إذا لم توجد قيمة جديدة. مجرد إرسال كل صف جديد ضوضاء لا منتج.',
      'الحقوق والدفع: التنبيهات الداخلية ممكنة؛ تنبيه مدفوع أو API خارجي محجوب حتى الترخيص. لا يوجد دليل اشتراك أو دفع.'
    ]),
    reported_facts: [
      fact('OPP05-F1', 'رادار الإصدارات شغّل 12 حالة محفوظة دون ادعاء ربط متحقق.', ['radar_summary'], { value: 12, unit: 'إصدار' }),
      fact('OPP05-F2', 'تدقيق الثقة أصدر قرار حوكمة في 3/3 حالات.', ['trust_summary'], { value: 3, unit: 'حالات' }),
      fact('OPP05-F3', 'Sector Threshold Watchlist يفشل هامش 40% في جميع سيناريوهات التخطيط.', ['unit_economics'], { status: 'FAIL_HYPOTHESIS_ALL_SCENARIOS' })
    ],
    calculations: [],
    inferences: [inference('OPP05-I1', 'الإصدار، وكسر جودة البيانات، وعبور حد مشتري هي أحداث مناسبة للتنبيه.', 'الأولان مثبتان كتشغيل داخلي؛ الثالث يحتاج threshold/action ودليل دفع.', ['radar_summary', 'trust_summary', 'unit_economics'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP05-ALERT-RELEASE', 'تنبيه إصدار رسمي', 'فريق اقتصاد أو امتثال', 'فتح مراجعة لإصدار جديد أو unmatched.', [dataset('release-corpus', 'تقويمات وإصدارات رسمية', 'ناشرون رسميون', 'حدث إصدار ومسار مرشح', 'radar_summary')], 'الكشف الحي وrecall وSLA غير مقاسة.', 'عند الإصدار', ['تنبيه فريق', 'Webhook داخلي'], rights('BLOCKED_EXTERNAL_PENDING_WATCHED_SOURCE_RIGHTS', 'يلزم حق مراقبة/إعادة إخراج كل مصدر.')),
      contract('OPP05-ALERT-TRUST', 'تنبيه كسر الثقة', 'مدير بيانات', 'حجب حزمة أو فتح تصحيح عند تغير المصدر/المخطط.', [dataset('quality-pack', 'مصدر ومخطط وحداثة ومصالحة', 'عدة ناشرين/العميل', 'كشف تغير وعيب', 'trust_summary')], 'حدود العميل وبياناته الداخلية غير موجودة.', 'عند التغير وشهريًا', ['تذكرة حوكمة', 'لوحة داخلية'], rights('INTERNAL_OR_CUSTOMER_AUTHORIZED_ONLY', 'يلزم تفويض العميل وترخيص المصادر.')),
      contract('OPP05-ALERT-THRESHOLD', 'تنبيه حد قطاعي', 'مالك قرار قطاعي غير مثبت', 'تنفيذ إجراء محدد عند تجاوز حد مسمى.', [dataset('sama_pos_sectors', 'نقاط البيع القطاعية الشهرية', 'SAMA', 'إشارة شهرية', 'detail:sama_pos_sectors'), dataset('gastat_inflation', 'التضخم الشهري', 'GASTAT', 'سياق سعري', 'detail:gastat_inflation'), dataset('building_permits', 'تراخيص البناء الشهرية', 'GASTAT', 'إشارة نشاط', 'detail:building_permits')], 'لا threshold/action/buyer؛ الاقتصاديات التخطيطية تفشل.', 'شهري', ['تنبيه خاص', 'API داخلي'], rights('BLOCKED_EXTERNAL_PENDING_EXACT_LICENSE', 'الحقوق الخارجية غير مصفاة.'))
    ],
    missing_inputs: [],
    limitations: [limitation('THRESHOLD_NOT_DEFINED', 'لا يوجد حد أو فعل يحدده مشتري.', 'مقابلة قرار وتحديد threshold/action وقياس false alerts.')],
    atomic_claims: [
      claim('OPP05-AC1', 'REPORTED', 'الرادار والتدقيق أثبتا توجيه حدث داخلي لا دفعًا.', 'VERIFIED', ['radar_summary', 'trust_summary', 'market_evidence']),
      claim('OPP05-AC2', 'INFERENCE', 'تنبيهات الإصدارات والثقة أقرب للمنتج من تقرير دوري شامل.', 'BOUNDED', ['radar_summary', 'trust_summary']),
      claim('OPP05-AC3', 'REPORTED', 'تنبيه الحدود غير مؤهل اقتصاديًا أو سوقيًا بعد.', 'VERIFIED', ['unit_economics', 'market_evidence'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-06-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['product_prefilter', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness', 'detail:gastat_population_growth', 'detail:sama_health_facilities_resources', 'detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:tourism_occupancy_rate_monthly'],
    answer_text: join([
      'صفحات البحث المحلية القابلة للتوليد تقنيًا هي: «سكان ونمو منطقة X»، «الأسرة والأطباء في منطقة X»، «مبيعات وعمليات قطاع Y هذا الشهر»، «تضخم الغذاء مقابل نشاط نقاط البيع»، و«إشغال الإقامة في منطقة X حسب النوع». كل صفحة يجب أن تعرض الفترة والوحدة والمصدر وحداثة البيانات وحدود المقارنة، لا نصًا إنشائيًا.',
      'لكن القرار الإنتاجي الحالي ليس الإطلاق: فرصة الصفحات الآلية مستبعدة في Package 03 بسبب حقوق النشر، خطر المحتوى الرقيق، وضمانات التحديث غير المحسومة. لذلك هذه قوالب داخلية/نماذج بحث، وليست توصية بنشر آلاف الصفحات.',
      'المشتري المفترض مالك نمو محتوى أو دليل محلي، والقرار هل ينشر صفحة/يحدثها/يحجبها. فجوة المنتج هي نية البحث الفعلية، تفرّد المحتوى، طبقة محلية خاصة، وسجل تصحيح. التوزيع الطبيعي بحث عضوي، لكن لم يُقَس طلب البحث أو التحويل أو الدفع.',
      'بوابة الحقوق: أي صفحة عامة مستخرجة من DataSaudi/SAMA/السياحة محجوبة حاليًا؛ GASTAT مشروط بمراجعة المصدر المباشر والترخيص الدقيق. لا raw export.'
    ]),
    reported_facts: [fact('OPP06-F1', 'Package 03 صنف فرصة الصفحات الآلية EXCLUDE_RIGHTS_AND_THIN_CONTENT.', ['product_prefilter'], { disposition: 'EXCLUDE_RIGHTS_AND_THIN_CONTENT' })],
    calculations: [],
    inferences: [inference('OPP06-I1', 'الصفحات الإقليمية/القطاعية المذكورة قابلة للتوليد من مخططات البيانات الحالية.', 'القابلية تقنية فقط؛ لا تثبت جودة SEO أو الحقوق أو قيمة المستخدم.', ['detail:gastat_population_growth', 'detail:sama_health_facilities_resources', 'detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:tourism_occupancy_rate_monthly'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP06-LOCAL-PAGES', 'صفحات سؤال محلي آلية', 'مالك نمو محتوى أو دليل محلي', 'نشر/تحديث/حجب صفحة تجيب عن مؤشر محدد لمنطقة أو قطاع.', [
        dataset('gastat_population_growth', 'النمو السكاني حسب المنطقة', 'GASTAT', 'صفحة سكان المنطقة', 'detail:gastat_population_growth'),
        dataset('sama_health_facilities_resources', 'موارد الصحة حسب المنطقة', 'SAMA/مصدر صحي', 'صفحة موارد صحية', 'detail:sama_health_facilities_resources'),
        dataset('sama_pos_sectors', 'نقاط البيع حسب القطاع', 'SAMA', 'صفحة نشاط قطاع', 'detail:sama_pos_sectors'),
        dataset('gastat_inflation', 'التضخم الشهري', 'GASTAT', 'صفحة تغير أسعار', 'detail:gastat_inflation'),
        dataset('tourism_occupancy_rate_monthly', 'الإشغال السياحي', 'وزارة السياحة', 'صفحة إشغال منطقة', 'detail:tourism_occupancy_rate_monthly')
      ], 'نية البحث والحجم والتحويل والتفرّد المحلي وSLA التحديث غير مقاسة.', 'شهري/سنوي حسب المجموعة', ['البحث العضوي', 'روابط داخلية', 'خريطة موقع'], rights('BLOCKED_PUBLICATION', 'الصفحات العامة محجوبة حتى ترخيص dataset-level وسياسة نسب/تصحيح/إزالة.'))
    ],
    missing_inputs: [],
    limitations: [limitation('SEO_AND_RIGHTS_UNPROVEN', 'القوالب تقنية لكن النشر العام غير مؤهل.', 'بحث كلمات واختبار جودة وحقوق دقيقة لكل مصدر.')],
    atomic_claims: [
      claim('OPP06-AC1', 'REPORTED', 'الصفحات الآلية مستبعدة حاليًا بسبب الحقوق والمحتوى الرقيق.', 'VERIFIED', ['product_prefilter']),
      claim('OPP06-AC2', 'INFERENCE', 'يمكن توليد قوالب صفحات محددة من المجموعات المسماة.', 'BOUNDED', ['detail:gastat_population_growth', 'detail:sama_health_facilities_resources', 'detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:tourism_occupancy_rate_monthly']),
      claim('OPP06-AC3', 'REPORTED', 'لا توجد بيانات تحويل أو دفع.', 'VERIFIED', ['market_evidence', 'pricing_readiness'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-07-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['regional_summary', 'product_decision_jobs', 'product_prefilter', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness', 'detail:sama_pos_sectors', 'detail:tourism_occupancy_rate_monthly', 'detail:sama_health_facilities_resources'],
    answer_text: join([
      'المنتجات التي تفشل دون بيانات خاصة إضافية هي كل منتج يعد بقرار محلي تشغيلي لا مجرد سياق كلي. أولها اختيار الموقع: يحتاج مبيعات الوحدة/الفرع، الإيجار، المنافسين، catchment، الحركة والطاقة الاستيعابية. ثانيها فجوة العرض والطلب في الصحة أو السياحة: يحتاج سعة قابلة للبيع، قوائم انتظار/حجوزات، أسعار ومخزون منافسين. ثالثها توقع الربحية: يحتاج تكلفة، هامش، تحويل واحتفاظ، ولا يمكن استنتاجها من السكان أو نقاط البيع الكلية.',
      'الدليل الأقوى هو الموجز الإقليمي: 0/3 حالات قابلة للترتيب و3 رفضات آمنة، مع kill criterion تحقق بسبب عدم توافق الجغرافيا والفترة والمقام. نسختا الصحة والسياحة مصنفتان VARIANT_ONLY من الموجز، لا منتجات مستقلة مثبتة.',
      'المشتري المفترض قائد توسع/عمليات، وقراره موقع أو سعة أو ميزانية. البيانات الرسمية تصلح prior وسياقًا؛ البيانات الخاصة تغلق القرار. من دونها يجب أن يكون المنتج «فحص جاهزية البيانات/NO_RANK» لا توصية موقع.',
      'حقوق البيانات الخاصة تتطلب تفويض العميل وعقد استخدام واحتفاظ، وحقوق المصادر الرسمية منفصلة. لا دليل دفع.'
    ]),
    reported_facts: [
      fact('OPP07-F1', 'الموجز الإقليمي رتب 0 من 3 حالات وأصدر 3 رفضات آمنة.', ['regional_summary'], { ranked: 0, cases: 3 }),
      fact('OPP07-F2', 'نسختا الصحة والسياحة مصنفتان VARIANT_ONLY.', ['product_prefilter'], { disposition: 'VARIANT_ONLY' })
    ],
    calculations: [],
    inferences: [inference('OPP07-I1', 'قرارات الموقع والسعة والربحية تحتاج بيانات خاصة تشغيلية فوق البيانات الرسمية.', 'الاستنتاج يحدد شرط المنتج؛ لا يثبت أن مشتريًا سيدفع.', ['regional_summary', 'product_decision_jobs'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP07-PRIVATE-SITE', 'قرار موقع/سعة مدعوم بسياق رسمي وخاص', 'قائد توسع أو عمليات', 'اختيار موقع أو زيادة/خفض سعة أو إصدار NO_RANK.', [dataset('sama_pos_sectors', 'نقاط البيع القطاعية', 'SAMA', 'سياق إنفاق كلي', 'detail:sama_pos_sectors'), dataset('tourism_occupancy_rate_monthly', 'الإشغال السياحي', 'وزارة السياحة', 'سياق استخدام', 'detail:tourism_occupancy_rate_monthly'), dataset('sama_health_facilities_resources', 'الموارد الصحية', 'مصدر صحي رسمي', 'سياق عرض', 'detail:sama_health_facilities_resources')], 'مبيعات العميل، الأسعار، الإيجارات، المنافسون، السعة/المخزون، catchment والتكاليف مفقودة.', 'شهري وعند قرار الاستثمار', ['موجز خاص', 'تطبيق داخلي'], rights('CUSTOMER_AUTHORITY_PLUS_SOURCE_LICENSE_REQUIRED', 'تفويض بيانات العميل لا يغطي المصادر الرسمية والعكس صحيح.'))
    ],
    missing_inputs: [],
    limitations: [limitation('PRIVATE_DATA_REQUIRED', 'المؤشرات الرسمية لا تقيس اقتصاديات الوحدة أو الطلب غير المخدوم.', 'ربط بيانات تشغيلية خاصة موثقة بالمصادر الرسمية.')],
    atomic_claims: [
      claim('OPP07-AC1', 'REPORTED', 'التقاط الموجز الحالي فشل معيار الترتيب 0/3.', 'VERIFIED', ['regional_summary']),
      claim('OPP07-AC2', 'INFERENCE', 'توصية موقع أو ربحية دون مدخلات خاصة ستكون تجاوزًا.', 'BOUNDED', ['regional_summary', 'product_decision_jobs']),
      claim('OPP07-AC3', 'REPORTED', 'دليل الدفع غير موجود.', 'VERIFIED', ['market_evidence', 'pricing_readiness'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-08-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['catalog', 'detail_manifest', 'trust_summary', 'radar_summary', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness'],
    answer_text: join([
      'الأصل المشتق الأكثر قابلية للتحديث والمشروعية التشغيلية داخليًا هو «سجل ثقة ومصدرية» لا نسخة من البيانات الخام: لكل مكعب يسجل الناشر، رابط المصدر، المخطط، المقاييس والوحدات، آخر استرجاع، hash، نتائج الاختبارات، تغيرات المخطط، وحالة الحقوق. أصل ثانٍ أضيق هو سجل release→candidate-cube مع بقاء الربط مرشحًا حتى المراجعة.',
      'لماذا هذان الأصلان؟ الفهرس يضم 277 مكعبًا، ودليل التفاصيل الكامل يغطي 34 مكعبًا و43,260 صفًا؛ تدقيق الثقة نجا من بوابة الحقيقة الداخلية، والرادار حافظ على 8 روابط مرشحة و4 unmatched دون ادعاء تحقق. القيمة المشتقة هنا هي lineage والاختبار والقرار، لا إعادة توزيع الصفوف.',
      'المشتري المفترض مدير بيانات أو فريق أبحاث، والقرار اعتماد مصدر/إصدار أو حظره. التحديث عند تغير المصدر/الإصدار وشهريًا للفحص. التوزيع لوحة داخلية وAPI metadata داخلي.',
      'بوابة الحقوق حاسمة: حتى metadata مشتقة قد تخضع لشروط المصدر؛ النشر أو البيع محجوب حتى ترخيص dataset-level. لا دفع مثبت.'
    ]),
    reported_facts: [
      fact('OPP08-F1', 'الفهرس الكامل يضم 277 مكعبًا ودليل التفاصيل 34 مكعبًا و43,260 صفًا.', ['catalog', 'detail_manifest'], { catalog_cubes: 277, detailed_cubes: 34, detailed_rows: 43260 }),
      fact('OPP08-F2', 'تدقيق الثقة نجا من بوابة الحقيقة الداخلية.', ['trust_summary'], { disposition: 'SURVIVES_INTERNAL_TRUTH_GATE' })
    ],
    calculations: [],
    inferences: [inference('OPP08-I1', 'سجل lineage/freshness/tests أصل مشتق أكثر دفاعية من إعادة نشر الصفوف الخام.', 'الدفاعية والطلب التجاري غير مختبرين؛ المقصود تقليل مخاطر المصدر داخليًا.', ['catalog', 'detail_manifest', 'trust_summary'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP08-TRUST-ASSET', 'سجل ثقة ومصدرية قابل للتحديث', 'مدير بيانات أو فريق أبحاث', 'اعتماد مصدر/إصدار أو حظره مع سبب قابل للتدقيق.', [dataset('catalog-277', 'مخططات ومصادر 277 مكعبًا', 'DataSaudi/ناشرون رسميون', 'طبقة المصدر والمخطط', 'catalog'), dataset('detail-34', 'دليل صفوف كامل لـ34 مكعبًا', 'ناشرون متعددون', 'اختبارات اكتمال ومصالحة', 'detail_manifest')], 'لا توجد مراقبة كاملة لآخر فترة لكل 277 ولا thresholds عميل.', 'عند الإصدار/تغير المخطط وشهريًا', ['لوحة داخلية', 'API metadata داخلي', 'تذكرة حوكمة'], rights('INTERNAL_ALLOWED_EXTERNAL_BLOCKED', 'النشر/البيع يتطلب ترخيص metadata والإخراج لكل مصدر.'))
    ],
    missing_inputs: [],
    limitations: [limitation('COMMERCIAL_RIGHTS_UNCLEARED', 'المشروعية التشغيلية الداخلية لا تساوي حق البيع.', 'ترخيص دقيق ومراجعة قانونية لنمط الإخراج.')],
    atomic_claims: [
      claim('OPP08-AC1', 'REPORTED', 'تغطية الأصل الحالية 277 مخططًا و34 دليل تفاصيل.', 'VERIFIED', ['catalog', 'detail_manifest']),
      claim('OPP08-AC2', 'INFERENCE', 'سجل الثقة والمصدرية أصل مشتق قابل للتحديث داخليًا.', 'BOUNDED', ['catalog', 'detail_manifest', 'trust_summary']),
      claim('OPP08-AC3', 'REPORTED', 'النشر التجاري غير مصرح به حاليًا.', 'VERIFIED', ['rights_summary', 'rights_matrix'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-09-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['catalog', 'detail_manifest', 'trust_summary', 'radar_summary', 'product_decision_jobs', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness'],
    answer_text: join([
      'إذا أغلقت INSAIGHTS غدًا، يبقى «Data Trust Audit» هو المنتج المرشح الأكثر استقلالًا: مدخله مصادر ومخططات واستجابات API رسمية محفوظة، ومخرجه قرار اعتماد/حجب مع hashes وحدود، وليس نص INSAIGHTS. لقد نفذ 3 حالات وأصدر قرار حوكمة في 3/3 ونجا من بوابة الحقيقة الداخلية.',
      'يبقى أيضًا رادار الإصدارات كمكوّن مصدر-أول، لكنه أضعف اقتصاديًا الآن: 12 replay نجحت تشغيليًا، بينما الهامش التخطيطي يفشل كل السيناريوهات وحالة المنتج HOLD_OR_KILL حتى قياس الجهد البشري.',
      'ما لا يبقى قابلًا لإعادة البناء هو سلوك INSAIGHTS نفسه أو صياغاته أو recall الحي؛ لا يجوز الادعاء بأن API البيانات يعيد تجربة المساعد.',
      'المشتري المفترض مدير بيانات، والقرار اعتماد حزمة. التوزيع تقرير/لوحة داخلية، والحقوق الخارجية والدفع ما زالا محجوبين وغير مختبرين.'
    ]),
    reported_facts: [
      fact('OPP09-F1', 'Data Trust Audit نفذ 3/3 حالات حوكمة ونجا من بوابة الحقيقة الداخلية.', ['trust_summary'], { cases: 3, disposition: 'SURVIVES_INTERNAL_TRUTH_GATE' }),
      fact('OPP09-F2', 'رادار الإصدارات مستقل عن نص INSAIGHTS لكنه في HOLD_OR_KILL داخليًا.', ['radar_summary'], { disposition: 'HOLD_OR_KILL_PENDING_REAL_HUMAN_EFFORT_MEASUREMENT' })
    ],
    calculations: [],
    inferences: [inference('OPP09-I1', 'Data Trust Audit هو المرشح الأكثر بقاءً بعد إغلاق INSAIGHTS.', 'المعيار هنا استقلال المدخل وبوابة الحقيقة الداخلية؛ لا يشمل طلب السوق أو الحقوق.', ['catalog', 'detail_manifest', 'trust_summary'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP09-SOURCE-FIRST-AUDIT', 'تدقيق ثقة مصدر-أول', 'مدير بيانات أو BI', 'اعتماد حزمة مؤشرات أو حجبها مع أسباب قابلة للتدقيق.', [dataset('catalog-277', 'الفهرس والمخططات الرسمية', 'DataSaudi/ناشرون', 'اكتشاف المصدر والمخطط', 'catalog'), dataset('detail-34', 'استجابات API الرسمية المحفوظة', 'ناشرون متعددون', 'فحص القيم والاكتمال', 'detail_manifest')], 'thresholds العميل ومصالحة بياناته وتغطية 277/277 بالتفاصيل غير مكتملة.', 'عند الحزمة وشهريًا', ['تقرير خاص', 'لوحة داخلية', 'تذكرة حوكمة'], rights('INTERNAL_ONLY_PENDING_LICENSE', 'الاستقلال التقني لا يمنح حق البيع أو إعادة النشر.'))
    ],
    missing_inputs: [],
    limitations: [limitation('MARKET_AND_RIGHTS_OPEN', 'البقاء التقني لا يثبت منتجًا تجاريًا.', 'اختبار مشتري وميزانية وحقوق إخراج.')],
    atomic_claims: [
      claim('OPP09-AC1', 'REPORTED', 'تدقيق الثقة يعمل على أدلة مصدرية محفوظة ونجا داخليًا.', 'VERIFIED', ['trust_summary', 'catalog', 'detail_manifest']),
      claim('OPP09-AC2', 'INFERENCE', 'هو المرشح الأكثر استقلالًا عن INSAIGHTS ضمن الخيارات المختبرة.', 'BOUNDED', ['trust_summary', 'radar_summary']),
      claim('OPP09-AC3', 'REPORTED', 'لا حقوق تجارية أو دفع مثبت.', 'VERIFIED', ['rights_summary', 'market_evidence'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-10-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['catalog', 'oracle', 'detail_manifest', 'radar_summary', 'trust_summary', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness'],
    answer_text: join([
      'يمكن إعادة بناء طبقة البيانات الأساسية دون INSAIGHTS: فهرس 277 مكعبًا، مخططات الأبعاد والمقاييس والوحدات، استجابات API العامة، وسلاسل التفاصيل التي جُمعت لـ34 مكعبًا. ويمكن بناء طبقة تحقق تحفظ الطلب والاستجابة وSHA-256 والاكتمال، ثم طبقة إصدار ترصد التقويمات الرسمية وتوجهها لمراجعة.',
      'يمكن أيضًا إعادة بناء وظائف محددة: إجابة رقم مباشر من صف رسمي، سلسلة/ترتيب عند اكتمال السكان والمقام، مصفوفة توافق، وتدقيق ثقة. لا يمكن إعادة بناء استجابة INSAIGHTS التاريخية أو ترتيب مصادره أو سلوكه عند الغموض من البيانات الرسمية وحدها.',
      'المنتج المقترح هو Source-First Evidence API داخلي، مشتريه المفترض فريق بيانات/أبحاث، وقراره هل يعتمد قيمة أو يرفضها. التحديث حسب وتيرة المصدر مع replay واختبار.',
      'الحد القانوني: القدرة التقنية على إعادة البناء لا تعني حق إعادة التوزيع؛ raw export الخارجي محجوب لكل المصادر المرشحة حاليًا.'
    ]),
    reported_facts: [
      fact('OPP10-F1', 'الفهرس الرسمي المحفوظ يحتوي 277 مكعبًا.', ['catalog'], { value: 277, unit: 'مكعب' }),
      fact('OPP10-F2', 'دليل التفاصيل المكتمل يحتوي 34 مكعبًا و43,260 صفًا.', ['detail_manifest'], { cubes: 34, rows: 43260 }),
      fact('OPP10-F3', 'إعادة التوزيع الخام الخارجية غير مصرح بها.', ['rights_summary', 'rights_matrix'], { raw_redistribution_authorized: false })
    ],
    calculations: [],
    inferences: [inference('OPP10-I1', 'طبقة evidence API داخلية قابلة للبناء من المصادر الرسمية والأدلة المحفوظة.', 'لا تعيد سلوك INSAIGHTS ولا تمنح حقوقًا خارجية.', ['catalog', 'oracle', 'detail_manifest', 'trust_summary'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP10-EVIDENCE-API', 'واجهة دليل مصدر-أول داخلية', 'فريق بيانات أو أبحاث', 'قبول قيمة/سلسلة أو رفضها بسبب دليل/توافق غير كافٍ.', [dataset('catalog-277', 'فهرس DataSaudi الكامل', 'DataSaudi/الناشرون', 'اكتشاف المخطط والمصدر', 'catalog'), dataset('oracle-65', 'دليل oracle للمكعبات المرشحة', 'DataSaudi/الناشرون', 'طلب/استجابة قابلة للإعادة', 'oracle'), dataset('detail-34', 'تفاصيل كاملة لـ34 مكعبًا', 'ناشرون متعددون', 'قيم وترتيب وسلاسل', 'detail_manifest')], 'التفاصيل لا تغطي كل 277 ولا توجد مراقبة vintages كاملة.', 'حسب المصدر مع اختبار يومي/شهري', ['API داخلي', 'مكتبة أدلة', 'لوحة مراجعة'], rights('INTERNAL_ONLY_RAW_EXPORT_BLOCKED', 'raw export أو API خارجي مدفوع محجوب حتى ترخيص المصدر.'))
    ],
    missing_inputs: [],
    limitations: [limitation('NOT_INSAIGHTS_REPLICA', 'المصدر الرسمي يعيد البيانات لا سلوك المساعد.', 'لا يغلق إلا بتسجيل حي لسلوك INSAIGHTS؛ ليس مطلوبًا لمنتج مصدر-أول.')],
    atomic_claims: [
      claim('OPP10-AC1', 'REPORTED', '277 مخططًا و34 دليل تفاصيل متاحة محليًا.', 'VERIFIED', ['catalog', 'detail_manifest']),
      claim('OPP10-AC2', 'INFERENCE', 'يمكن بناء Evidence API داخلي من هذه الأصول.', 'BOUNDED', ['catalog', 'oracle', 'detail_manifest', 'trust_summary']),
      claim('OPP10-AC3', 'REPORTED', 'raw redistribution الخارجية غير مصرح بها.', 'VERIFIED', ['rights_summary', 'rights_matrix'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-11-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['trust_summary', 'regional_summary', 'radar_summary', 'unit_economics', 'pricing_readiness', 'market_evidence', 'rights_summary', 'rights_matrix'],
    answer_text: join([
      'الفرصة ذات أوضح قرار مالي داخلي هي Data Trust Audit: القرار «هل أعتمد حزمة تدخل تقريرًا/استثمارًا، أم أحجبها وأتحمل تكلفة التصحيح؟». الوحدة المالية القابلة للقياس هي تكلفة خطأ البيانات وتأخير التوقيع وساعات المصالحة، لا بيع رقم رسمي.',
      'الدليل الداخلي: 3/3 حالات أصدرت إجراء حوكمة ولم تُخف عيب P0. التخطيط الاقتصادي يفترض تدقيقًا بين 12 و25 ألف ريال؛ سيناريو 18 ألفًا يعطي ربحًا إجماليًا افتراضيًا 4,700 ريال، لكنه PASS_HYPOTHESIS_ONLY لأن التكلفة والسعر غير ملاحظين.',
      'الموجز الإقليمي يرتبط بقرار موقع مالي لكنه فشل 0/3 للترتيب؛ والرادار قد يقلل تأخير المراجعة لكنه يفشل بوابة هامش 50% في كل سيناريو تخطيطي. لذلك لا أساويها بالتدقيق.',
      'المشتري المفترض مدير بيانات/مالية، والتوزيع بيع مؤسسي مباشر. لا دليل دفع، والحقوق شرط سابق.'
    ]),
    reported_facts: [
      fact('OPP11-F1', 'تدقيق الثقة أصدر إجراء حوكمة في 3/3 دون إخفاء عيب P0.', ['trust_summary'], { cases: 3 }),
      fact('OPP11-F2', 'سيناريو 18 ألف ريال للتدقيق يحقق 4,700 ريال ربحًا إجماليًا افتراضيًا فقط.', ['unit_economics'], { revenue: 18000, gross_profit: 4700, status: 'PASS_HYPOTHESIS_ONLY' }),
      fact('OPP11-F3', 'لا قبول سعر أو دفع مسجل.', ['pricing_readiness', 'market_evidence'], { payments: 0 })
    ],
    calculations: [],
    inferences: [inference('OPP11-I1', 'Data Trust Audit هو أوضح ارتباط بقرار مالي ضمن المرشحين المختبرين.', 'الوضوح مستند إلى عقد القرار وبوابة الحقيقة؛ لا يثبت الاستعداد للدفع.', ['trust_summary', 'regional_summary', 'radar_summary', 'unit_economics'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP11-FIN-AUDIT', 'تدقيق ثقة قبل اعتماد مالي', 'مدير بيانات أو مراقب مالي', 'اعتماد حزمة/حجبها وتحديد تكلفة التصحيح قبل توقيع قرار.', [dataset('quality-evidence-pack', 'حزمة المصدر والمخطط والحداثة والمصالحة', 'مصادر رسمية/بيانات العميل', 'خفض خطر قرار مبني على بيانات معيبة', 'trust_summary')], 'تكلفة الخطأ وساعات التصحيح وصاحب الميزانية غير مقاسة.', 'لكل حزمة ثم متابعة شهرية', ['بيع مؤسسي مباشر', 'تقرير خاص'], rights('CUSTOMER_AUTHORITY_AND_SOURCE_LICENSE_REQUIRED', 'يلزم تفويض بيانات العميل وحقوق المصادر.'))
    ],
    missing_inputs: [],
    limitations: [limitation('FINANCIAL_VALUE_UNOBSERVED', 'الربح والأسعار سيناريوهات لا نتائج.', 'عرض مدفوع/مشروط وقياس تكلفة الخطأ والتأخير.')],
    atomic_claims: [
      claim('OPP11-AC1', 'REPORTED', 'تدقيق الثقة نجا داخليًا في 3 حالات.', 'VERIFIED', ['trust_summary']),
      claim('OPP11-AC2', 'INFERENCE', 'التدقيق أوضح المرشحين لاتخاذ قرار مالي.', 'BOUNDED', ['trust_summary', 'regional_summary', 'radar_summary']),
      claim('OPP11-AC3', 'REPORTED', '4,700 ريال ربح افتراضي وليس ملاحظًا.', 'VERIFIED', ['unit_economics', 'pricing_readiness'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-12-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['radar_summary', 'trust_summary', 'product_prefilter', 'rights_summary', 'rights_matrix', 'market_evidence', 'pricing_readiness', 'detail:gastat_population_growth', 'detail:sama_pos_sectors'],
    answer_text: join([
      'التوزيع الطبيعي يختلف حسب الوظيفة: رادار الإصدارات يوزع عبر تنبيه push وبريد/Slack لأن القيمة حدث زمني؛ تدقيق الثقة يوزع عبر بيع مؤسسي مباشر وتذكرة/لوحة لأن القرار خاص وحساس؛ الصفحات المحلية توزع عبر البحث لأن السؤال جغرافي متكرر؛ وطبقة الأدلة قد توزع عبر API داخلي لأن المستهلك نظام آخر.',
      'لكن الجاهزية ليست متساوية. الرادار يملك replay تشغيليًا لكنه لا يملك اقتصاديات ناجحة أو recall حي. التدقيق نجا داخليًا لكنه بلا مشتري. الصفحات المحلية مستبعدة حاليًا للحقوق والمحتوى الرقيق. وAPI الخارجي الخام محجوب حقوقيًا.',
      'لذلك الترتيب التنفيذي للتجربة—لا ترتيب سوق—هو: بيع مباشر لتدقيق خاص، ثم تنبيه داخلي للرادار، ثم API داخلي للـmetadata. البحث العام وAPI الخارجي ينتظران الحقوق ودليل الجودة/الطلب.',
      'لا توجد بيانات acquisition أو conversion أو دفع؛ وصف «طبيعي» هنا ملاءمة قناة لشكل الحدث فقط.'
    ]),
    reported_facts: [
      fact('OPP12-F1', 'الصفحات الآلية مستبعدة بسبب الحقوق والمحتوى الرقيق.', ['product_prefilter'], { disposition: 'EXCLUDE_RIGHTS_AND_THIN_CONTENT' }),
      fact('OPP12-F2', 'الرادار نفذ 12 replay والتدقيق 3 حالات حوكمة.', ['radar_summary', 'trust_summary'], { radar_replays: 12, audit_cases: 3 })
    ],
    calculations: [],
    inferences: [inference('OPP12-I1', 'التنبيه ملائم للإصدار، البيع المباشر للتدقيق، البحث للصفحات، وAPI للـmetadata.', 'ملاءمة بنيوية لا دليل CAC أو تحويل أو اشتراك.', ['radar_summary', 'trust_summary', 'product_prefilter'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP12-DIRECT-AUDIT', 'تدقيق ثقة خاص', 'مدير بيانات', 'اعتماد أو حجب حزمة.', [dataset('quality-pack', 'حزمة ثقة ومصدرية', 'مصادر/عميل', 'قرار حوكمة', 'trust_summary')], 'لا lead list أو conversion أو budget evidence.', 'عند الحزمة', ['بيع مؤسسي مباشر', 'جلسة قرار'], rights('PRIVATE_CUSTOMER_AUTHORIZED_ONLY', 'تفويض العميل وترخيص المصدر مطلوبان.')),
      contract('OPP12-PUSH-RADAR', 'تنبيه إصدار', 'فريق أبحاث/امتثال', 'فتح مراجعة فور إصدار.', [dataset('release-corpus', 'إصدارات رسمية محفوظة', 'ناشرون رسميون', 'حدث زمني', 'radar_summary')], 'لا recall حي أو اقتصاديات جهد بشري.', 'عند الإصدار', ['بريد/Slack', 'Webhook داخلي'], rights('INTERNAL_PENDING_WATCHED_SOURCE_RIGHTS', 'التوزيع الخارجي محجوب.')),
      contract('OPP12-SEARCH-PAGES', 'صفحات محلية', 'مالك نمو محتوى', 'نشر صفحة لسؤال محلي.', [dataset('gastat_population_growth', 'النمو السكاني', 'GASTAT', 'سؤال محلي', 'detail:gastat_population_growth'), dataset('sama_pos_sectors', 'نقاط البيع القطاعية', 'SAMA', 'سؤال قطاعي', 'detail:sama_pos_sectors')], 'حقوق ومحتوى فريد وطلب بحث غير مثبت.', 'شهري/سنوي', ['بحث عضوي'], rights('BLOCKED_PUBLICATION', 'النشر العام محجوب حاليًا.'))
    ],
    missing_inputs: [],
    limitations: [limitation('CHANNEL_PERFORMANCE_UNMEASURED', 'لا CAC أو CTR أو conversion أو retention.', 'تجربة قناة مصرح بها بمقياس مسبق.')],
    atomic_claims: [
      claim('OPP12-AC1', 'REPORTED', 'الصفحات وAPI الخارجي محجوبان في الحالة الحالية.', 'VERIFIED', ['product_prefilter', 'rights_matrix']),
      claim('OPP12-AC2', 'INFERENCE', 'التوزيع المقترح يطابق شكل الوظيفة لكل منتج.', 'BOUNDED', ['radar_summary', 'trust_summary', 'product_prefilter']),
      claim('OPP12-AC3', 'REPORTED', 'أداء القنوات والدفع غير مقاسين.', 'VERIFIED', ['market_evidence', 'pricing_readiness'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-13-AR': {
    closure_state: 'CLOSED_EVIDENCE_BOUND_INFERENCE',
    evidence_keys: ['rights_summary', 'rights_matrix', 'product_prefilter', 'market_evidence', 'pricing_readiness', 'catalog'],
    answer_text: join([
      'يجب إسقاط أو تجميد أي فرصة تعتمد الآن على: إعادة توزيع صفوف DataSaudi الخام، API خارجي مدفوع من هذه الصفوف، صفحات عامة مشتقة من DataSaudi/SAMA/وزارة السياحة، أو بيع semantic layer متعدد المصادر قبل ترخيص كل dataset ونمط إخراج. الإتاحة العامة ووجود API لا يمنحان هذا الحق.',
      'القرار الموثق: صفر من المصادر المرشحة يملك clearance دقيقًا على مستوى dataset؛ DataSaudi/SAMA/وزارة السياحة محجوبة خارجيًا، وGASTAT مشروط بمراجعة المصدر المباشر والترخيص الدقيق. commercial_publication_authorized=false وraw_redistribution_authorized=false.',
      'بالتالي تُسقط حاليًا فرصة الصفحات الآلية وsemantic API الخارجي؛ وهو متسق مع EXCLUDE_RIGHTS وEXCLUDE_RIGHTS_AND_THIN_CONTENT في prefilter. يمكن الاحتفاظ بنسخة داخلية محكومة لاستخدام البحث والتحقق فقط.',
      'المشتري والقرار والتوزيع لا يغيران البوابة: حتى لو وُجد دفع، لا نشر قبل الإذن والتناسب والنسب والتصحيح والإزالة.'
    ]),
    reported_facts: [
      fact('OPP13-F1', 'لا يوجد ترخيص تجاري دقيق لأي من المصادر المرشحة الخمسة.', ['rights_summary'], { exact_dataset_level_cleared: 0 }),
      fact('OPP13-F2', 'النشر التجاري وإعادة التوزيع الخام غير مصرح بهما.', ['rights_summary'], { commercial_publication_authorized: false, raw_redistribution_authorized: false }),
      fact('OPP13-F3', 'الصفحات الآلية وsemantic redistribution مستبعدتان حقوقيًا في prefilter.', ['product_prefilter'], { dispositions: ['EXCLUDE_RIGHTS', 'EXCLUDE_RIGHTS_AND_THIN_CONTENT'] })
    ],
    calculations: [],
    inferences: [inference('OPP13-I1', 'يجب إسقاط/تجميد المنتجات الخارجية الخام والعامة حتى clearance.', 'قرار احتواء تشغيلي لا رأي قانوني.', ['rights_summary', 'rights_matrix', 'product_prefilter'])],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP13-DROP-RAW-PUBLIC', 'API خام أو صفحات عامة متعددة المصادر', 'مطور/ناشر أو مشترٍ بيانات افتراضي', 'نشر أو بيع صفوف/صفحات/API.', [dataset('catalog-277', 'بيانات ومخططات DataSaudi متعددة الناشرين', 'DataSaudi/GASTAT/SAMA/وزارة السياحة', 'مادة الإخراج المقترح', 'catalog')], 'الترخيص الدقيق، الجمهور، الدفع، الاحتفاظ، النسب والتصحيح غير مصفاة.', 'حسب المصدر', ['API خارجي', 'صفحات عامة', 'تصدير خام'], rights('DROP_OR_HOLD', 'صفر dataset-level clearance؛ جميع أوضاع الإخراج الخارجية المقصودة محجوبة أو مشروطة غير مكتملة.'))
    ],
    missing_inputs: [],
    limitations: [limitation('OPERATIONAL_RIGHTS_NOT_LEGAL_OPINION', 'القرار احتواء مبني على البحث الحالي.', 'إذن مكتوب دقيق ومراجعة قانونية مؤهلة.')],
    atomic_claims: [
      claim('OPP13-AC1', 'REPORTED', 'عدد المصادر ذات clearance دقيق يساوي صفرًا.', 'VERIFIED', ['rights_summary']),
      claim('OPP13-AC2', 'REPORTED', 'النشر التجاري وraw redistribution غير مصرح بهما.', 'VERIFIED', ['rights_summary', 'rights_matrix']),
      claim('OPP13-AC3', 'INFERENCE', 'الفرص الخارجية المعتمدة عليهما يجب إسقاطها أو تجميدها.', 'BOUNDED', ['rights_summary', 'rights_matrix', 'product_prefilter'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-14-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['catalog', 'detail_manifest', 'pricing_readiness', 'market_evidence', 'rights_summary', 'rights_matrix', 'detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:building_permits', 'detail:tourism_occupancy_rate_monthly'],
    answer_text: join([
      'النتيجة: لا يمكن تسمية dataset «يبرر اشتراكًا» من تكرار التحديث وحده. لدينا مرشحون شهريون فعليون—نقاط البيع والتضخم وتراخيص البناء والإشغال السياحي—لكن لا يوجد SLA ملاحظ، ولا اختبار تأخر/مراجعات مستمر، ولا قرار مشتري يعاد كل شهر، ولا قبول اشتراك.',
      'المنقول: نقاط البيع والتضخم يصلان إلى 2026-05، تراخيص البناء إلى 2026-04، والإشغال السياحي إلى 2024-12 في اللقطة. هذه حداثة متفاوتة وليست وعد تحديث. بطاقات الأسعار كلها designed_not_run، وعدد المدفوعات صفر.',
      'المحسوب: لا توجد درجة اشتراك. يلزم قياس أربعة أشياء لمدة كافية: انتظام الإصدار، lag من التاريخ المرجعي، معدل المراجعة/الكسر، ونسبة الإصدارات التي تحرك قرارًا مسمى. ثم يختبر عرض شهري بحقوق مصفاة.',
      'ما يغلق السؤال: 6–12 دورة إصدار مراقبة، threshold لزمن الوصول والاكتمال، buyer/action متكرر، وقبول سعر أو دفعة. قبل ذلك يمكن وصف «مرشح شهري» فقط، لا «مبرر اشتراك».'
    ]),
    reported_facts: [
      fact('OPP14-F1', 'نقاط البيع والتضخم يصلان إلى 2026-05 وتراخيص البناء إلى 2026-04.', ['detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:building_permits'], { cadence: 'شهري' }),
      fact('OPP14-F2', 'الإشغال السياحي المسترجع ينتهي في 2024-12.', ['detail:tourism_occupancy_rate_monthly'], { latest_period: '2024-12' }),
      fact('OPP14-F3', 'كل بطاقات الأسعار غير مرسلة ولا توجد دفعات.', ['pricing_readiness', 'market_evidence'], { payments: 0 })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP14-MONTHLY-WATCH', 'مراقبة مؤشرات شهرية', 'مالك قرار شهري غير مثبت', 'تنفيذ إجراء عند إصدار/تغير مؤشر محدد.', [
        dataset('sama_pos_sectors', 'نقاط البيع القطاعية', 'SAMA', 'إشارة شهرية', 'detail:sama_pos_sectors'),
        dataset('gastat_inflation', 'التضخم حسب الباب', 'GASTAT', 'إشارة سعرية شهرية', 'detail:gastat_inflation'),
        dataset('building_permits', 'تراخيص البناء', 'GASTAT', 'إشارة نشاط شهرية', 'detail:building_permits'),
        dataset('tourism_occupancy_rate_monthly', 'الإشغال السياحي', 'وزارة السياحة', 'إشارة سياحية شهرية', 'detail:tourism_occupancy_rate_monthly')
      ], 'SLA الفعلي، lag، revisions، buyer/action والاحتفاظ والدفع غير مقاسة.', 'شهري كمرشح، لا SLA مثبت', ['تنبيه خاص', 'لوحة اشتراك'], rights('BLOCKED_PAID_EXTERNAL_PENDING_LICENSE', 'الاشتراك المدفوع الخارجي غير مسموح قبل ترخيص كل dataset.'))
    ],
    missing_inputs: [{ input: 'مبرر الاشتراك', why_missing_or_incompatible: 'التواتر وحده لا يثبت استخدامًا متكررًا أو دفعًا.', what_would_close: 'دورات مراقبة + قرار متكرر + قبول سعر/دفعة.' }],
    limitations: [limitation('CADENCE_NOT_SUBSCRIPTION_VALUE', 'الحداثة الحالية snapshot وليست SLA أو دليل احتفاظ.', 'مراقبة دورات فعلية وتجربة اشتراك.')],
    atomic_claims: [
      claim('OPP14-AC1', 'REPORTED', 'توجد أربع مجموعات شهرية مرشحة بآخر فترات متفاوتة.', 'VERIFIED', ['detail:sama_pos_sectors', 'detail:gastat_inflation', 'detail:building_permits', 'detail:tourism_occupancy_rate_monthly']),
      claim('OPP14-AC2', 'NEGATIVE', 'لا يمكن استنتاج تبرير اشتراك من التواتر بلا استخدام ودفع وSLA.', 'VERIFIED', ['pricing_readiness', 'market_evidence', 'rights_summary'])
    ],
    expected_behavior_checks: oppChecks
  },

  'OPP-15-AR': {
    closure_state: 'CLOSED_DOCUMENTED_NOT_COMPUTABLE',
    evidence_keys: ['product_prefilter', 'trust_summary', 'regional_summary', 'radar_summary', 'unit_economics', 'pricing_readiness', 'market_evidence', 'rights_summary', 'rights_matrix'],
    answer_text: join([
      'NO_RANK: لا يمكن ترتيب «أعلى عشر فرص» على الألم والدفاعية والدفع والحداثة والتوزيع والحقوق. المحفظة المختبرة لا تحتوي عشر فرص مكتملة القياس؛ ثلاثة مرشحين فقط دخلوا bake-off، ولا توجد مقابلة مشتري أو قبول سعر أو دفعة، وصفر مصادر ذات clearance تجاري دقيق. أي مجموع رقمي الآن سيمنح أوزانًا رأيًا ثم يسميه دليلًا.',
      'ما يمكن ترتيبه بالدليل ليس السوق بل حالة البوابة الداخلية: (أ) Data Trust Audit = SURVIVES_INTERNAL_TRUTH_GATE بعد 3/3 قرارات حوكمة، مع اقتصاديات افتراضية فقط؛ (ب) Saudi Release Radar = HOLD_OR_KILL_PENDING_REAL_HUMAN_EFFORT_MEASUREMENT بعد 12 replay وهامش تخطيطي يفشل كل السيناريوهات؛ (ج) One-Decision Regional Brief = KILL_CURRENT_CAPTURE_FOR_RANKING بعد 0/3 حالات قابلة للترتيب. هذه أوضاع قرار وليست مراكز 1–3 في سوق.',
      'الفرص الأخرى في prefilter إما EXCLUDE، EXCLUDE_RIGHTS، EXCLUDE_RIGHTS_AND_THIN_CONTENT أو VARIANT_ONLY؛ لا توجد لها مقاييس موحدة للألم أو الدفع أو التوزيع. لذلك لا أملأ سبعة صفوف لتلبية رقم عشرة.',
      'ما يغلق الترتيب: تعريف 10 فرص مستقلة على الأقل، rubric وأوزان قبل النتائج، evidence لكل بُعد، مقابلات قرار، اختبار سعر، قياس قناة، حداثة/SLA، وclearance حقوق. بعدها فقط يحسب الترتيب مع حساسية الأوزان؛ حتى ذلك الحين NO_RANK هو الإغلاق الكامل.'
    ]),
    reported_facts: [
      fact('OPP15-F1', 'ثلاث فرص فقط دخلت bake-off الداخلي.', ['product_prefilter'], { value: 3, unit: 'فرص' }),
      fact('OPP15-F2', 'تدقيق الثقة نجا داخليًا، الرادار HOLD_OR_KILL، والموجز الإقليمي KILL_CURRENT_CAPTURE_FOR_RANKING.', ['trust_summary', 'radar_summary', 'regional_summary']),
      fact('OPP15-F3', 'لا مقابلات أو قبول سعر أو دفع، وصفر clearance دقيق على مستوى dataset.', ['market_evidence', 'pricing_readiness', 'rights_summary'], { interviews: 0, payments: 0, cleared_datasets: 0 })
    ],
    calculations: [],
    inferences: [],
    compatibility_matrix: [],
    opportunity_contracts: [
      contract('OPP15-CAND-AUDIT', 'Data Trust Audit', 'مدير بيانات مفترض', 'اعتماد/حجب حزمة.', [dataset('audit-pack', 'حزمة ثقة ومصدرية', 'مصادر/عميل', 'قرار حوكمة', 'trust_summary')], 'لا ألم مشتري أو دفع أو clearance خارجي.', 'عند الحزمة/شهري', ['بيع مباشر'], rights('BLOCKED_EXTERNAL', 'يلزم تفويض العميل وحقوق المصادر.')),
      contract('OPP15-CAND-RADAR', 'Saudi Release Radar', 'فريق اقتصاد/امتثال مفترض', 'توجيه إصدار للمراجعة.', [dataset('release-corpus', '12 إصدارًا رسميًا محفوظًا', 'ناشرون رسميون', 'توجيه replay', 'radar_summary')], 'لا recall حي أو جهد بشري ملاحظ؛ الهامش التخطيطي يفشل.', 'عند الإصدار', ['تنبيه فريق'], rights('BLOCKED_EXTERNAL', 'يلزم حقوق المصادر المراقبة.')),
      contract('OPP15-CAND-REGION', 'One-Decision Regional Brief', 'قائد توسع مفترض', 'قائمة مناطق أو NO_RANK.', [dataset('regional-pack', 'سكان ونقاط بيع وصحة وسياحة', 'عدة ناشرين', 'سياق قرار', 'regional_summary')], 'الالتقاط الحالي 0/3 قابل للترتيب ويفتقد بيانات خاصة.', 'عند القرار', ['بيع مباشر/موجز'], rights('BLOCKED_EXTERNAL', 'يلزم مصفوفة حقوق كل مصدر.'))
    ],
    ranking: {
      status: 'NO_RANK',
      requested_count: 10,
      eligible_comparable_count: 0,
      reasons_ar: [
        'ثلاث فرص فقط اختبرت داخليًا، لا عشر.',
        'لا دليل ألم أو دفع أو أداء توزيع من مشترين.',
        'لا clearance تجاري دقيق لأي dataset.',
        'لا rubric أو أوزان مسجلة مسبقًا للأبعاد الستة.'
      ],
      evidence_bounded_dispositions: [
        { opportunity: 'Data Trust Audit', disposition: 'SURVIVES_INTERNAL_TRUTH_GATE_NOT_MARKET_RANK' },
        { opportunity: 'Saudi Release Radar', disposition: 'HOLD_OR_KILL_PENDING_REAL_HUMAN_EFFORT' },
        { opportunity: 'One-Decision Regional Brief', disposition: 'KILL_CURRENT_CAPTURE_FOR_RANKING' }
      ]
    },
    missing_inputs: [
      { input: 'عشر فرص قابلة للمقارنة', why_missing_or_incompatible: 'المختبر داخليًا ثلاث فقط.', what_would_close: 'تعريف واختبار 10 فرص مستقلة.' },
      { input: 'مقاييس الألم والدفع والتوزيع', why_missing_or_incompatible: 'الأحداث السوقية صفر.', what_would_close: 'مقابلات/تجارب سعر/قياس قناة موحدة.' },
      { input: 'أوزان وحقوق', why_missing_or_incompatible: 'لا rubric مسبق وصفر clearance دقيق.', what_would_close: 'rubric مسجل وحقوق dataset-level.' }
    ],
    limitations: [limitation('NO_COMPARABLE_TOP_TEN', 'لا يوجد عدد أو دليل موحد يسمح بترتيب عشرة.', 'استكمال المدخلات الثلاثة ثم تحليل حساسية الأوزان.')],
    atomic_claims: [
      claim('OPP15-AC1', 'REPORTED', 'عدد المرشحين المختبرين داخليًا ثلاثة لا عشرة.', 'VERIFIED', ['product_prefilter']),
      claim('OPP15-AC2', 'REPORTED', 'المقابلات والدفعات والـdataset clearances الدقيقة تساوي صفرًا.', 'VERIFIED', ['market_evidence', 'pricing_readiness', 'rights_summary']),
      claim('OPP15-AC3', 'NEGATIVE', 'لا يمكن إنتاج ترتيب أعلى عشرة دون اختلاق أوزان وبيانات.', 'VERIFIED', ['product_prefilter', 'market_evidence', 'pricing_readiness', 'rights_summary'])
    ],
    expected_behavior_checks: oppChecks
  }
};
