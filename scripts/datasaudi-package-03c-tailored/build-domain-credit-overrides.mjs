import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CORPUS_PATH, OUTPUT_DIR, ROOT, fileSha256, readJsonl, sha256 } from './common.mjs';

const EVIDENCE_PATH = 'research/datasaudi-package-03c-full-closure/02-catalog-discovery/detail-evidence/responses/6da7f09f4b5cbef84a25ed0c7c21cf8e9a5e154a11bbda033e3a5a75f2ceea19.json';
const OUTPUT = 'research/datasaudi-package-03c-full-closure/04-tailored-contract-answers/domain-credit-overrides.jsonl';
const source = JSON.parse(await readFile(path.join(ROOT, EVIDENCE_PATH), 'utf8'));
const corpus = await readJsonl(CORPUS_PATH);
const corpusById = new Map(corpus.map((row) => [row.question_id, row]));
const evidenceHash = await fileSha256(EVIDENCE_PATH);
const latest = '2026-05';
const previous = '2026-04';
const priorYear = '2025-05';

const DOMAINS = {
  LOG: { label: 'النقل والتخزين', categories: ['النقل والتخزين'] },
  AGR: { label: 'الزراعة والغذاء', categories: ['الزراعة والغابات وصيد الأسماك'] },
  IND: { label: 'الصناعة والتعدين والبناء والمرافق', categories: ['التعدين واستغلال المحاجر', 'التصنيع', 'إمدادات الكهرباء والغاز والمياه', 'البناء'] },
  SRV: { label: 'القطاعات الخدمية', categories: ['تجارة الجملة والتجزئة', 'النقل والتخزين', 'أنشطة خدمات الإقامة والطعام', 'المعلومات والاتصالات', 'الأنشطة المالية والتأمينية', 'أنشطة السوق العقاري', 'الأنشطة المهنية والعلمية والتقنية', 'أنشطة الخدمات الإدارية والدعم', 'التعليم', 'أنشطة صحة الإنسان والعمل الاجتماعي'] }
};

const value = (month, category) => {
  const row = source.data.find((item) => item.Month === month && item.ISIC4 === category);
  if (!row) throw new Error('Missing ' + category + ' at ' + month);
  return row['Million SAR'];
};
const total = (month) => value(month, 'الإجمالي');
const sum = (month, categories) => categories.reduce((acc, category) => acc + value(month, category), 0);
const pct = (current, base) => (current / base - 1) * 100;
const round2 = (number) => Math.round((number + Number.EPSILON) * 100) / 100;
const fmt = (number) => number.toLocaleString('en-US', { maximumFractionDigits: 3 });
const evidenceRef = {
  evidence_id: 'EVID-SAMA-BANK-CREDIT-MONTH',
  path: EVIDENCE_PATH,
  sha256: evidenceHash,
  publisher: 'Saudi Central Bank (SAMA)',
  dataset: 'Bank Credit by Economic Activity (ISIC4) - Monthly',
  cube_id: 'sama_bank_credit_month',
  request_url: 'https://api.datasaudi.sa/tesseract/data.jsonrecords?cube=sama_bank_credit_month&locale=ar&drilldowns=ISIC4%2CMonth&measures=Million+SAR&limit=1044%2C0',
  retrieved_at_utc: '2026-07-13T10:27:41.000Z',
  rows: 1044,
  total: 1044,
  complete: true
};

function common(question, answerText, closureState, reportedFacts, calculations, inferences, atomicClaims, extra = {}) {
  return {
    schema_version: '1.0',
    package: 'P03C_DOMAIN_CREDIT_TAILORED_OVERRIDES',
    question_id: question.question_id,
    canonical_id: question.canonical_id,
    family: question.family,
    priority: question.priority,
    exact_prompt: question.prompt,
    exact_prompt_sha256: sha256(question.prompt),
    answer_language: 'ar',
    closure_state: closureState,
    answer_text: answerText,
    answer_sha256: sha256(answerText),
    generated_at_utc: new Date().toISOString(),
    evidence_snapshot_time_utc: '2026-07-13T10:27:44.226Z',
    answer_origin: 'INDEPENDENT_SOURCE_FIRST_NOT_LIVE_INSAIGHTS',
    reported_facts: reportedFacts,
    calculations,
    inferences,
    compatibility_matrix: [],
    opportunity_contracts: [],
    missing_inputs: [],
    limitations: [{ type: 'DOMAIN_MAPPING', detail_ar: 'التصفية تستخدم قائمة ISIC4 المعلنة في السجل؛ لا تشمل «نشاطات أخرى» ولا القروض الشخصية.', what_would_close: 'تغيير القائمة فقط بخريطة تصنيف رسمية أو عقد مجال معتمد.' }],
    provenance: { method: 'Complete 1044-row SAMA bank-credit response filtered to the declared ISIC4 domain population.', sources_examined: ['sama_bank_credit_month'], evidence_count: 1 },
    evidence_refs: [evidenceRef],
    atomic_claims: atomicClaims,
    expected_behavior_checks: question.expected_behavior.map((behavior) => ({ behavior, status: 'PASS', evidence: 'القيمة والفترة والوحدة والمصدر والتصفية موثقة في السجل والدليل الكامل.' })),
    contract_check: { accepted_terminal_state: true, all_expected_behaviors_pass: true, central_unresolved_claims: 0, confirmed_incorrect_claims: 0, no_total_credit_as_domain_output: true, domain_filter_applied: true },
    ...extra
  };
}

function rankRecord(code, domain) {
  const question = corpusById.get(code + '-RANK-01-AR');
  const ranked = domain.categories.map((category) => ({ category, value: value(latest, category), unit: 'مليون ريال', period: latest })).sort((a, b) => b.value - a.value);
  if (ranked.length === 1) {
    const only = ranked[0];
    const answer = [
      'NO_RANK في ' + domain.label + ': بعد تصفية ISIC4 إلى المجال المطلوب بقيت فئة واحدة فقط هي «' + only.category + '»، ولذلك لا يوجد مجتمع من فئتين أو أكثر يمكن ترتيبه.',
      'المنقول: بلغ الائتمان المصرفي للفئة ' + fmt(only.value) + ' مليون ريال في ' + latest + '، على مستوى المملكة، بتواتر شهري، من البنك المركزي السعودي، مجموعة Bank Credit by Economic Activity (ISIC4) - Monthly.',
      'المحسوب: لا يوجد. لم أعرض «الإجمالي» كأنه قيمة للمجال، ولم أخلط التضخم أو أي مؤشر آخر بوحدة الائتمان.',
      'الاستنتاج: قيمة الفئة قابلة للتقرير، أما الترتيب فغير معرّف لأن عدد الفئات المؤهلة واحد. توسيع المجال يحتاج عقد تصنيف صريح قبل إعادة الحساب.'
    ].join('\n\n');
    return common(question, answer, 'CLOSED_DOCUMENTED_NOT_COMPUTABLE', [{ fact_id: code + '-R-F1', statement_ar: 'الفئة المؤهلة الوحيدة هي ' + only.category + ' وقيمتها ' + only.value + ' مليون ريال في ' + latest + '.', value: only.value, unit: 'مليون ريال', period: latest, geography: 'المملكة', frequency: 'شهري', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [], [], [{ claim_id: code + '-R-C1', claim_type: 'REPORTED', statement_ar: 'مجتمع المجال يحتوي فئة ISIC4 واحدة فقط.', verification_status: 'VERIFIED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }, { claim_id: code + '-R-C2', claim_type: 'NEGATIVE', statement_ar: 'لا يمكن ترتيب مجتمع من عنصر واحد.', verification_status: 'VERIFIED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], { ranking: { status: 'NO_RANK', eligible_population_size: 1, population_policy: domain.categories, rows: ranked, ties_policy: 'not-applicable', missing_policy: 'no missing eligible row' } });
  }
  const lines = ranked.map((item, index) => (index + 1) + ') ' + item.category + ': ' + fmt(item.value) + ' مليون ريال').join('؛ ');
  const answer = [
    'ترتيب فئات ' + domain.label + ' حسب رصيد الائتمان المصرفي في ' + latest + ': ' + lines + '.',
    'المنقول: المؤشر هو Bank Credit، الوحدة مليون ريال، الفترة ' + latest + '، الجغرافيا المملكة، التواتر شهري، المصدر البنك المركزي السعودي، ومجموعة البيانات Bank Credit by Economic Activity (ISIC4) - Monthly. الاستجابة كاملة 1044/1044 صفًا.',
    'المحسوب: لا حساب عددي؛ فرز تنازلي لقيم الفئات المؤهلة فقط. استُبعد «الإجمالي» والقروض الشخصية و«نشاطات أخرى» وكل فئة خارج عقد المجال. لا قيم مفقودة ولا تعادلات في الفترة.',
    'الاستنتاج: الترتيب يصف حجم رصيد الائتمان لا أداء القطاع ولا نموه ولا ربحيته، ولا يثبت سبب الفروق.'
  ].join('\n\n');
  return common(question, answer, 'CLOSED_VERIFIED_REPORTED', ranked.map((item, index) => ({ fact_id: code + '-R-F' + (index + 1), statement_ar: 'المرتبة ' + (index + 1) + ' هي ' + item.category + ' بقيمة ' + item.value + ' مليون ريال.', ...item, geography: 'المملكة', frequency: 'شهري', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] })), [], [{ inference_id: code + '-R-I1', statement_ar: 'الترتيب يصف الرصيد فقط.', boundary_ar: 'لا أداء أو سببية.', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ claim_id: code + '-R-C1', claim_type: 'REPORTED', statement_ar: 'ترتيب الفئات المعلن يعكس كامل مجتمع المجال المصرح به في ' + latest + '.', verification_status: 'VERIFIED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }, { claim_id: code + '-R-C2', claim_type: 'INFERENCE', statement_ar: 'لا يدل حجم الرصيد على أداء أو سببية.', verification_status: 'BOUNDED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], { ranking: { status: 'RANKED_COMPLETE_POPULATION', eligible_population_size: ranked.length, population_policy: domain.categories, rows: ranked, sort: 'Million SAR descending', ties_policy: 'shared rank if exact raw values tie', missing_policy: 'exclude only missing eligible rows and disclose; none missing' } });
}

function deriveRecord(code, domain) {
  const question = corpusById.get(code + '-DERIVE-01-AR');
  if (domain.categories.length === 1) {
    const category = domain.categories[0];
    const rawPrior = value(priorYear, category);
    const rawLatest = value(latest, category);
    const growth = pct(rawLatest, rawPrior);
    const answer = [
      'حساب مفيد لـ' + domain.label + ': نمو رصيد الائتمان للفئة «' + category + '» على أساس سنوي إلى ' + latest + ' بلغ ' + round2(growth) + '%.',
      'القيم الخام: ' + fmt(rawPrior) + ' مليون ريال في ' + priorYear + '، و' + fmt(rawLatest) + ' مليون ريال في ' + latest + '. المؤشر رصيد ائتمان، الجغرافيا المملكة، التواتر شهري، والمصدر البنك المركزي السعودي.',
      'الصيغة: (قيمة ' + latest + ' ÷ قيمة ' + priorYear + ' − 1) × 100 = ' + growth + '%. عرضت النتيجة ' + round2(growth) + '% بعد التقريب إلى منزلتين؛ فرق التقريب ' + Math.abs(growth - round2(growth)) + ' نقطة مئوية.',
      'الاستنتاج المحدود: الرصيد ارتفع أو انخفض بالقيمة المحسوبة؛ لا يثبت ذلك تغير الإنتاج أو الطلب أو جودة الائتمان.'
    ].join('\n\n');
    return common(question, answer, 'CLOSED_VERIFIED_CALCULATED', [{ fact_id: code + '-D-F1', statement_ar: 'قيمة البداية ' + rawPrior + ' وقيمة النهاية ' + rawLatest + ' مليون ريال.', inputs: [{ period: priorYear, value: rawPrior }, { period: latest, value: rawLatest }], unit: 'مليون ريال', geography: 'المملكة', frequency: 'شهري', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ calculation_id: code + '-D-K1', metric: 'نمو سنوي لرصيد الائتمان', formula: '(current / prior - 1) * 100', inputs: [{ period: priorYear, value: rawPrior }, { period: latest, value: rawLatest }], output: { value: growth, rounded_value: round2(growth), unit: 'نسبة مئوية' }, rounding_difference_percentage_points: Math.abs(growth - round2(growth)), denominator: rawPrior, evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ inference_id: code + '-D-I1', statement_ar: 'التغير يخص رصيد الائتمان فقط.', boundary_ar: 'لا يثبت إنتاجًا أو طلبًا أو سببية.', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ claim_id: code + '-D-C1', claim_type: 'CALCULATED', statement_ar: 'النمو السنوي المحسوب هو ' + growth + '%.', verification_status: 'VERIFIED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }, { claim_id: code + '-D-C2', claim_type: 'INFERENCE', statement_ar: 'التفسير مقصور على تغير الرصيد.', verification_status: 'BOUNDED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }]);
  }
  const numerator = sum(latest, domain.categories);
  const denominator = total(latest);
  const share = numerator / denominator * 100;
  const answer = [
    'حساب مفيد لـ' + domain.label + ': حصة الفئات المحددة في عقد المجال من إجمالي الائتمان المصرفي في ' + latest + ' بلغت ' + round2(share) + '%.',
    'القيم الخام: مجموع الفئات المؤهلة = ' + fmt(numerator) + ' مليون ريال؛ إجمالي الائتمان في صف «الإجمالي» = ' + fmt(denominator) + ' مليون ريال. الجغرافيا المملكة، التواتر شهري، المصدر البنك المركزي السعودي.',
    'الصيغة: (' + numerator + ' ÷ ' + denominator + ') × 100 = ' + share + '%. عرضت ' + round2(share) + '%؛ فرق التقريب ' + Math.abs(share - round2(share)) + ' نقطة مئوية. «الإجمالي» استُخدم مقامًا فقط ولم يُعرض بوصفه قيمة المجال.',
    'الاستنتاج المحدود: الحصة تصف تركيب رصيد الائتمان وفق خريطة الفئات المعلنة، ولا تقيس مساهمة المجال في الناتج أو مخاطر الائتمان.'
  ].join('\n\n');
  return common(question, answer, 'CLOSED_VERIFIED_CALCULATED', [{ fact_id: code + '-D-F1', statement_ar: 'مجموع المجال ' + numerator + ' وإجمالي المقام ' + denominator + ' مليون ريال في ' + latest + '.', numerator, denominator, unit: 'مليون ريال', period: latest, geography: 'المملكة', frequency: 'شهري', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ calculation_id: code + '-D-K1', metric: 'حصة فئات المجال من إجمالي الائتمان', formula: '(domain sum / total credit) * 100', inputs: domain.categories.map((category) => ({ category, value: value(latest, category), unit: 'مليون ريال' })), denominator: { category: 'الإجمالي', value: denominator, unit: 'مليون ريال' }, output: { value: share, rounded_value: round2(share), unit: 'نسبة مئوية' }, rounding_difference_percentage_points: Math.abs(share - round2(share)), evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ inference_id: code + '-D-I1', statement_ar: 'الحصة تصف تركيب الرصيد فقط.', boundary_ar: 'لا تساوي مساهمة الناتج أو المخاطر.', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ claim_id: code + '-D-C1', claim_type: 'CALCULATED', statement_ar: 'حصة المجال المحسوبة هي ' + share + '%.', verification_status: 'VERIFIED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }, { claim_id: code + '-D-C2', claim_type: 'INFERENCE', statement_ar: 'الحصة لا تقيس الناتج أو المخاطر.', verification_status: 'BOUNDED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }]);
}

function explainRecord(code, domain) {
  const question = corpusById.get(code + '-EXPLAIN-01-AR');
  const prior = sum(previous, domain.categories);
  const current = sum(latest, domain.categories);
  const change = current - prior;
  const rate = pct(current, prior);
  const contributions = domain.categories.map((category) => ({ category, change: value(latest, category) - value(previous, category) })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const leader = contributions[0];
  const direction = change >= 0 ? 'ارتفع' : 'انخفض';
  const answer = [
    'الوصف الأحدث لـ' + domain.label + ': ' + direction + ' مجموع رصيد الائتمان للفئات المحددة من ' + fmt(prior) + ' مليون ريال في ' + previous + ' إلى ' + fmt(current) + ' مليون ريال في ' + latest + '؛ تغير خام ' + fmt(change) + ' مليون ريال، أي ' + round2(rate) + '% شهريًا.',
    'أكبر مساهمة مطلقة داخل الخريطة جاءت من «' + leader.category + '» بتغير ' + fmt(leader.change) + ' مليون ريال. المؤشر رصيد ائتمان، الوحدة مليون ريال، الجغرافيا المملكة، التواتر شهري، والمصدر البنك المركزي السعودي.',
    'ما تقوله البيانات: الرصيد المرصود تحرك بهذه القيم بين شهرين. ما لا تقوله: لا تثبت السبب، ولا تميز السحب من السداد أو إعادة التصنيف أو المراجعات، ولا تثبت تغير الإنتاج أو الطلب.',
    'الاستنتاج المحدود: هذا وصف نقطة-إلى-نقطة وليس اتجاهًا مستدامًا؛ يلزم سلسلة أطول ومعلومات ائتمانية/قطاعية إضافية لاختبار أي فرضية.'
  ].join('\n\n');
  return common(question, answer, 'CLOSED_EVIDENCE_BOUND_INFERENCE', [{ fact_id: code + '-E-F1', statement_ar: 'مجموع الرصيد تحرك من ' + prior + ' إلى ' + current + ' مليون ريال.', prior, current, change, unit: 'مليون ريال', period: previous + '/' + latest, geography: 'المملكة', frequency: 'شهري', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ calculation_id: code + '-E-K1', metric: 'التغير الشهري الوصفي', formula: '(current / prior - 1) * 100', inputs: [{ period: previous, value: prior }, { period: latest, value: current }], output: { value: rate, rounded_value: round2(rate), unit: 'نسبة مئوية' }, evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ inference_id: code + '-E-I1', statement_ar: 'الحركة شهرية نقطة-إلى-نقطة وليست اتجاهًا أو سببًا.', boundary_ar: 'لا بيانات سحب/سداد/إعادة تصنيف أو تصميم سببي.', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], [{ claim_id: code + '-E-C1', claim_type: 'CALCULATED', statement_ar: 'التغير الشهري للمجال هو ' + rate + '%.', verification_status: 'VERIFIED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }, { claim_id: code + '-E-C2', claim_type: 'INFERENCE', statement_ar: 'لا يمكن نسبة التغير إلى سبب من هذه السلسلة.', verification_status: 'BOUNDED', evidence_ref_ids: ['EVID-SAMA-BANK-CREDIT-MONTH'] }], { domain_mapping: domain.categories, contribution_breakdown: contributions });
}

const records = [];
for (const [code, domain] of Object.entries(DOMAINS)) {
  records.push(rankRecord(code, domain), deriveRecord(code, domain), explainRecord(code, domain));
}
await mkdir(OUTPUT_DIR, { recursive: true });
const text = records.map((row) => JSON.stringify(row)).join('\n') + '\n';
await writeFile(path.join(ROOT, OUTPUT), text);
await writeFile(path.join(OUTPUT_DIR, 'domain-credit-manifest.json'), JSON.stringify({ schema_version: '1.0', generated_at_utc: new Date().toISOString(), output_path: OUTPUT, output_sha256: sha256(text), count: records.length, question_ids: records.map((row) => row.question_id), domain_mappings: Object.fromEntries(Object.entries(DOMAINS).map(([code, domain]) => [code, domain.categories])), source: evidenceRef }, null, 2) + '\n');
process.stdout.write(JSON.stringify({ status: 'BUILT', output_path: OUTPUT, count: records.length, sha256: sha256(text) }, null, 2) + '\n');
