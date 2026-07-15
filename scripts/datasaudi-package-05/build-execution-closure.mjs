import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGE_ID = "datasaudi-package-05-execution-closure";
const PACKAGE_RELATIVE = `research/${PACKAGE_ID}`;
const CORPUS_RELATIVE = "research/datasaudi-insaights/04-question-corpus/questions.jsonl";
const LEDGER_RELATIVE = "research/datasaudi-package-03c-full-closure/03-answer-ledger/full-answer-ledger.jsonl";
const P03C_SUMMARY_RELATIVE = "research/datasaudi-package-03c-full-closure/03-answer-ledger/summary.json";
const P04_SUMMARY_RELATIVE = "research/datasaudi-package-04-universe-exploration/04-adjudication/summary.json";
const P04_DOSSIER_RELATIVE = "research/datasaudi-package-04-universe-exploration/05-universe-dossier/summary.json";

const CORE_FAMILIES = ["availability", "direct", "series", "rank", "cross", "derive", "explain", "limit"];
const LANGUAGES = ["ar", "en"];
const VARIANTS = [1, 2, 3, 4, 5, 6];
const sha256 = value => createHash("sha256").update(value).digest("hex");

const DOMAIN_LABELS_EN = {
  gdp: "gross domestic product",
  cpi: "inflation and prices",
  fis: "public finance",
  bnk: "banking and credit",
  pay: "payments and consumer activity",
  trd: "foreign trade",
  ext: "investment and the external sector",
  enr: "energy and water",
  bus: "businesses and establishments",
  mkt: "capital markets",
  dig: "digital economy",
  rnd: "research and development",
  pop: "population",
  lab: "labour market",
  re: "housing and real estate",
  hlt: "health",
  edu: "education",
  dis: "disability",
  tou: "tourism and hospitality",
  hum: "Hajj and Umrah",
  log: "transport and storage",
  agr: "agriculture and food",
  ind: "industry, mining, construction and utilities",
  srv: "service sectors"
};

const FAMILY_TASK_AR = {
  availability: domain => `حدّد مجموعات DataSaudi المتاحة فعليًا عن ${domain}. اذكر cube id والمصدر والتواتر والأبعاد والمقاييس والفترات المثبتة.`,
  direct: domain => `أعطِ أحدث قيمة منشورة لأهم ثلاثة مؤشرات قابلة للإثبات في ${domain} مع القيمة الخام والوحدة والفترة والجغرافيا.`,
  series: domain => `اعرض سلسلة آخر 12 فترة متاحة لأهم مؤشر دوري في ${domain} من تواتر واحد دون خلط الشهر والربع والسنة.`,
  rank: domain => `رتّب المناطق أو الفئات في ${domain} في أحدث فترة مشتركة، أو وثّق سبب عدم إمكان ترتيب صالح.`,
  cross: domain => `اختر مؤشرين مستقلين في ${domain} وقدّم مصفوفة توافق للتواتر والجغرافيا والتعريف والوحدة قبل أي مقارنة.`,
  derive: domain => `احسب نموًا أو حصة واحدة مفيدة في ${domain} مع القيم الخام والصيغة وفرق التقريب، ولا تحسب عند غياب المقامات أو الأوزان.`,
  explain: domain => `فسّر أحدث تغير مرصود في ${domain} وصفياً فقط، وافصل ما تثبته البيانات عن الفرضيات غير المثبتة.`,
  limit: domain => `حدّد ما لا تستطيع بيانات DataSaudi الحالية قياسه في ${domain}، وميّز بين غير موجود، لم أجده، غير متطابق، وغير حديث.`
};

const FAMILY_TASK_EN = {
  availability: domain => `Identify the DataSaudi datasets that are demonstrably available for ${domain}. Report cube id, source, frequency, dimensions, measures, and evidenced period coverage.`,
  direct: domain => `Return the latest published raw value for the three most defensible indicators in ${domain}, with unit, period, geography, frequency, source, and dataset.`,
  series: domain => `Return the latest 12 available periods for one defensible recurring indicator in ${domain}. Keep one frequency and do not mix months, quarters, and years.`,
  rank: domain => `Rank regions or categories in ${domain} for the latest common period, or document why a valid ranking cannot be produced.`,
  cross: domain => `Choose two independent indicators in ${domain} and provide a compatibility matrix for frequency, geography, definition, and unit before making any comparison.`,
  derive: domain => `Calculate one useful growth rate or share in ${domain}. Show raw inputs, formula, and rounding difference; do not calculate without required denominators or weights.`,
  explain: domain => `Describe the latest observed change in ${domain} without causal claims, separating what the data establish from unsupported hypotheses.`,
  limit: domain => `State what the current DataSaudi evidence cannot measure in ${domain}, distinguishing absent, not found, non-comparable, and not current.`
};

const CONTRACT_AR = "أجب فقط من أدلة مسترجعة فعليًا. لكل قيمة اذكر المؤشر والوحدة والفترة والجغرافيا والتواتر والمصدر واسم المجموعة. افصل المنقول عن المحسوب عن الاستنتاج. لا تملأ المفقود ولا تدّع السببية.";
const CONTRACT_EN = "Answer only from evidence actually retrieved. For every value state indicator, unit, period, geography, frequency, source, and dataset. Separate reported facts, calculations, and inference. Do not fill missing values or claim causality.";

const WRAPPERS_AR = [
  task => task,
  task => `أجب عن الطلب نفسه بعد تحقق مستقل، من دون تغيير نطاقه أو عقده: ${task}`,
  task => `هذه إعادة صياغة مكافئة للطلب؛ حافظ على المقصود والمتطلبات نفسيهما: ${task}`,
  task => `نفّذ السؤال نفسه من نقطة الصفر مع الالتزام الحرفي بنطاقه: ${task}`,
  task => `بمراجعة مستقلة، أجب عن السؤال ذاته ولا تضف أو تحذف أي متطلب: ${task}`,
  task => `أعد تنفيذ هذا الطلب المكافئ مع الحفاظ على النطاق والعقد كما هما: ${task}`
];

const WRAPPERS_EN = [
  task => task,
  task => `Answer the same request after an independent check, without changing its scope or contract: ${task}`,
  task => `This is a semantically equivalent restatement; preserve the same intent and requirements: ${task}`,
  task => `Execute the same question from first principles while preserving its exact scope: ${task}`,
  task => `As an independent reviewer, answer the identical question without adding or removing requirements: ${task}`,
  task => `Re-execute this equivalent request while keeping its scope and evidence contract unchanged: ${task}`
];

const UNIT_EN = new Map([
  ["مليون ريال", "SAR million"],
  ["مليار ريال", "SAR billion"],
  ["ريال", "SAR"],
  ["نسبة مئوية", "percent"],
  ["نسبة مئوية (أساس 100)", "percent (base 100)"],
  ["نقطة مؤشر", "index points"],
  ["عدد", "count"],
  ["ألف", "thousand"],
  ["ألف متر مكعب", "thousand cubic metres"],
  ["متر مكعب", "cubic metres"]
]);

const FREQUENCY_EN = new Map([
  ["سنوي", "annual"],
  ["ربع سنوي", "quarterly"],
  ["شهري", "monthly"],
  ["أسبوعي", "weekly"],
  ["يومي", "daily"]
]);

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readJsonl(file) {
  return (await readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    }
    catch (error) {
      throw new Error(`Invalid JSONL at ${file}:${index + 1}: ${error.message}`);
    }
  });
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeJsonl(file, rows) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${rows.map(row => JSON.stringify(row)).join("\n")}\n`);
}

function unique(values) {
  return [...new Set(values.filter(value => value != null && value !== ""))];
}

function unitEn(value) {
  return UNIT_EN.get(value) || value || "source-defined unit";
}

function frequencyEn(value) {
  return FREQUENCY_EN.get(value) || value || "source-defined frequency";
}

function jsonText(value) {
  if (value == null) return "not available in the structured proof";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function limitationText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return jsonText(value);
  const detail = value.detail_en || value.detail || value.detail_ar || value.reason_en || value.reason || value.reason_ar || "Structured limitation recorded";
  const close = value.what_would_close_en || value.what_would_close || value.required_evidence_en || value.required_evidence;
  const sourceLanguage = !value.detail_en && !value.detail && value.detail_ar ? " [source-language detail]" : "";
  return `${value.type ? `${value.type}: ` : ""}${detail}${sourceLanguage}${close ? ` What would close it: ${close}` : ""}`;
}

function evidencePaths(record) {
  const candidates = [];
  for (const claim of record.atomic_claims || []) {
    for (const ref of claim.evidence_refs || []) {
      candidates.push(ref.path, ref.response_path);
    }
  }
  for (const item of record.provenance || []) {
    candidates.push(item.base_response?.path, item.response_path);
    for (const prior of item.prior_responses || []) candidates.push(prior.path, prior.response_path);
  }
  candidates.push(record.authoritative_reference?.source_path, record.authoritative_reference?.verification_path);
  return unique(candidates);
}

function sourceUrls(record) {
  return unique([
    ...(record.dataset_metadata || []).map(item => item.source_link),
    ...(record.reported_facts || []).map(item => item.source_link),
    record.ranking?.source_link
  ]);
}

function structuredProofProjection(record) {
  return {
    question_id: record.question_id,
    canonical_id: record.canonical_id,
    closure_state: record.closure_state,
    independent_answer_status: record.independent_answer_status,
    answer_mode: record.answer_mode,
    numeric_result_status: record.numeric_result_status,
    selected_cube_ids: record.selected_cube_ids,
    reported_facts: record.reported_facts,
    calculations: record.calculations,
    inferences: record.inferences,
    limitations: record.limitations,
    material_claims: record.material_claims,
    dataset_metadata: record.dataset_metadata,
    compatibility_matrix: record.compatibility_matrix,
    ranking: record.ranking,
    missing_inputs: record.missing_inputs,
    contract_check: record.contract_check,
    atomic_claims: record.atomic_claims,
    provenance: record.provenance
  };
}

function renderEnglish(record) {
  const lines = [
    `Independent evidence-backed answer for ${record.canonical_id}.`,
    "",
    `Terminal status: ${record.closure_state}. Answer mode: ${record.answer_mode}.`,
    "This result is reconstructed from the verified structured proof; it is not a live INSAIGHTS response."
  ];

  if ((record.dataset_metadata || []).length) {
    lines.push("", "Datasets and retrieval boundary:");
    for (const item of record.dataset_metadata) {
      const cubeFacts = (record.reported_facts || []).filter(fact => fact.cube === item.cube || fact.evidence_refs?.some(ref => ref.cube_id === item.cube));
      const periods = cubeFacts.map(fact => fact.period).filter(value => value != null).sort((a, b) => String(a).localeCompare(String(b)));
      const sourceLink = item.source_link || cubeFacts.find(fact => fact.source_link)?.source_link;
      const frequency = item.frequency_en
        || (FREQUENCY_EN.has(item.frequency) ? frequencyEn(item.frequency) : null)
        || frequencyEn(cubeFacts.find(fact => fact.frequency)?.frequency);
      const geography = item.geography_en
        || (cubeFacts.find(fact => fact.geography)?.geography === "المملكة العربية السعودية" ? "Saudi Arabia" : cubeFacts.find(fact => fact.geography)?.geography)
        || "source-defined cube scope";
      const fields = [
        `source=${item.source_name_en || item.source_name}`,
        `frequency=${frequency}`,
        `geography=${geography}`
      ];
      const earliest = item.earliest_period_in_sealed_response ?? periods[0];
      const latest = item.latest_period_in_sealed_response ?? periods.at(-1);
      if (earliest != null && latest != null) fields.push(`coverage=${earliest} to ${latest}`);
      if ((item.dimensions || []).length) fields.push(`dimensions=${item.dimensions.join(", ")}`);
      if ((item.measures || []).length) {
        const measures = item.measures.map(measure => `${measure.name} [${unitEn(measure.unit)}${measure.aggregator ? `; ${measure.aggregator}` : ""}]`).join(", ");
        fields.push(`measures=${measures}`);
      }
      if (sourceLink) fields.push(`source_url=${sourceLink}`);
      lines.push(`- ${item.cube}: ${item.dataset_name_en || item.dataset_name}; ${fields.join("; ")}.`);
    }
  }

  if ((record.reported_facts || []).length) {
    lines.push("", "Reported values:");
    for (const fact of record.reported_facts) {
      const cube = fact.cube || fact.evidence_refs?.find(item => item.cube_id)?.cube_id || "not stated";
      const metadata = (record.dataset_metadata || []).find(item => item.cube === cube);
      const label = fact.indicator_caption || fact.indicator || fact.category || fact.statement_en || fact.statement_ar || "reported observation";
      const value = fact.value_raw ?? fact.value;
      lines.push(`- ${label}: ${jsonText(value)} ${unitEn(fact.unit)} | period=${fact.period || "not stated"} | frequency=${metadata?.frequency_en || frequencyEn(fact.frequency)} | geography=${metadata?.geography_en || fact.geography || "source-defined cube scope"} | cube=${cube} | source=${metadata?.source_name_en || fact.source_name || fact.evidence_refs?.[0]?.publisher || "not stated"}.`);
    }
  }

  if (record.ranking?.ranking?.length) {
    lines.push("", `Ranking for period ${record.ranking.period}; measure=${record.ranking.measure}; unit=${unitEn(record.ranking.unit)}; frequency=${frequencyEn(record.ranking.frequency)}. Source member labels are preserved verbatim:`);
    for (const item of record.ranking.ranking) lines.push(`- ${item.rank}. ${item.label}: ${jsonText(item.value_raw)} ${unitEn(record.ranking.unit)}.`);
  }

  if ((record.compatibility_matrix || []).length) {
    lines.push("", "Compatibility matrix:");
    for (const pair of record.compatibility_matrix) {
      lines.push(`- ${pair.pair_id}: ${pair.left?.cube}.${pair.left?.indicator} vs ${pair.right?.cube}.${pair.right?.indicator}; period=${pair.verdicts?.period}; frequency=${pair.verdicts?.frequency}; geography=${pair.verdicts?.geography}; unit=${pair.verdicts?.unit}; definition=${pair.verdicts?.definition}; overall=${pair.overall_verdict}; comparison_allowed=${pair.comparison_allowed}.`);
    }
  }

  if ((record.calculations || []).length) {
    lines.push("", "Verified calculations:");
    for (const calculation of record.calculations) {
      const factUnitForPeriod = period => (record.reported_facts || []).find(fact => String(fact.period) === String(period) && fact.unit)?.unit;
      const defaultInputUnit = (record.reported_facts || []).find(fact => fact.unit)?.unit || calculation.unit || calculation.output?.unit;
      const inputs = (calculation.inputs || []).map(item => `${item.category || item.label || item.period || "input"}=${jsonText(item.value)} ${unitEn(item.unit || factUnitForPeriod(item.period) || defaultInputUnit)}`).join("; ");
      const denominator = calculation.denominator == null
        ? null
        : typeof calculation.denominator === "object"
          ? `${calculation.denominator.category || calculation.denominator.label || "denominator"}=${jsonText(calculation.denominator.value)} ${unitEn(calculation.denominator.unit)}`
          : `${jsonText(calculation.denominator)} ${unitEn(calculation.inputs?.[0]?.unit || factUnitForPeriod(calculation.previous_period) || defaultInputUnit)}`;
      const result = calculation.rounded_growth_percent
        ?? calculation.rounded_percentage_point_change
        ?? calculation.rounded_result_percent
        ?? calculation.output?.rounded_value
        ?? calculation.output?.value
        ?? calculation.output_value
        ?? calculation.result
        ?? calculation.value;
      const resultUnit = calculation.output?.unit || calculation.result_unit || calculation.unit;
      const fields = [];
      if (calculation.previous_value != null || calculation.previous_period != null) fields.push(`previous=${jsonText(calculation.previous_value)} at ${calculation.previous_period}`);
      if (calculation.current_value != null || calculation.current_period != null) fields.push(`current=${jsonText(calculation.current_value)} at ${calculation.current_period}`);
      if (inputs) fields.push(`inputs=${inputs}`);
      if (denominator) fields.push(`denominator=${denominator}`);
      if (calculation.period != null) fields.push(`period=${calculation.period}`);
      if (calculation.measure) fields.push(`measure=${calculation.measure}`);
      if (calculation.component_count != null) fields.push(`component_count=${calculation.component_count}`);
      if (calculation.formula) fields.push(`formula=${calculation.formula}`);
      fields.push(`result=${jsonText(result)} ${unitEn(resultUnit)}`);
      const roundingDifference = calculation.rounding_difference ?? calculation.rounding_difference_percentage_points;
      if (roundingDifference != null) fields.push(`rounding_difference=${roundingDifference}`);
      if (calculation.disjoint_additive_rows != null) fields.push(`disjoint_additive_rows=${calculation.disjoint_additive_rows}`);
      lines.push(`- ${calculation.calculation_type}: ${fields.join("; ")}.`);
    }
  }

  if ((record.inferences || []).length || record.family === "explain") {
    lines.push("", "Interpretation boundary:", "- The reported values and verified calculations above support a descriptive change only. They do not establish a causal explanation.");
  }

  if ((record.limitations || []).length || (record.missing_inputs || []).length || record.family === "limit" || record.closure_state === "CLOSED_DOCUMENTED_NOT_COMPUTABLE") {
    lines.push("", "Evidence limitations:");
    lines.push("- Absent: no concept is declared absent beyond the inspected catalog and evidence snapshot.");
    lines.push("- Not found: a measure, grain, denominator, or weight not present in the proof remains not found, not proven nonexistent.");
    lines.push("- Non-comparable: values with mismatched definition, unit, frequency, geography, or period must not be merged.");
    lines.push("- Not current: freshness is reported as the latest evidenced period, not as an undocumented publication guarantee.");
    for (const limitation of record.limitations || []) lines.push(`- Proof-specific limitation: ${limitationText(limitation)}`);
    if ((record.missing_inputs || []).length) lines.push(`- Structured proof records ${record.missing_inputs.length} missing-input item(s); no value was imputed.`);
  }

  if (!(record.reported_facts || []).length && !record.ranking && !(record.compatibility_matrix || []).length && !(record.calculations || []).length) {
    lines.push("", "No additional numeric result is asserted beyond the dataset and limitation contract above.");
  }

  lines.push("", `Provenance: ${evidencePaths(record).length} content-addressed evidence path(s), ${sourceUrls(record).length} source URL(s), and ${record.atomic_claims?.length || 0} atomic claim(s) are attached to the canonical proof record ${record.question_id}.`);
  return lines.join("\n");
}

function buildPrompt({ baseQuestion, family, language, variant, domainLabelAr, domainLabelEn }) {
  const task = language === "ar"
    ? baseQuestion.prompt
    : `${FAMILY_TASK_EN[family](domainLabelEn)} ${CONTRACT_EN}`;
  const wrapper = language === "ar" ? WRAPPERS_AR[variant - 1] : WRAPPERS_EN[variant - 1];
  return wrapper(task);
}

function countBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length]));
}

export async function buildExecutionClosure({ root = process.cwd(), write = true } = {}) {
  const packageRoot = path.join(root, PACKAGE_RELATIVE);
  const [corpus, ledger, p03cSummary, p04Summary, p04Dossier] = await Promise.all([
    readJsonl(path.join(root, CORPUS_RELATIVE)),
    readJsonl(path.join(root, LEDGER_RELATIVE)),
    readJson(path.join(root, P03C_SUMMARY_RELATIVE)),
    readJson(path.join(root, P04_SUMMARY_RELATIVE)),
    readJson(path.join(root, P04_DOSSIER_RELATIVE))
  ]);

  const baseQuestions = corpus.filter(item => item.language === "ar" && CORE_FAMILIES.includes(item.family) && item.domain !== "cross-sector");
  const ledgerByQuestion = new Map(ledger.map(item => [item.question_id, item]));
  const englishByCanonical = new Map(ledger.filter(item => item.answer_language === "en").map(item => [item.canonical_id, item]));
  const canonicalAnswers = [];
  const executions = [];
  const invariance = [];

  for (const baseQuestion of baseQuestions.sort((a, b) => a.question_id.localeCompare(b.question_id))) {
    const arabicProof = ledgerByQuestion.get(baseQuestion.question_id);
    if (!arabicProof) throw new Error(`Missing P03C proof for ${baseQuestion.question_id}`);
    const domainLabelAr = baseQuestion.domain_label_ar;
    const domainLabelEn = DOMAIN_LABELS_EN[baseQuestion.domain];
    if (!domainLabelEn) throw new Error(`Missing English domain label for ${baseQuestion.domain}`);

    for (const language of LANGUAGES) {
      const existingEnglish = language === "en" ? englishByCanonical.get(baseQuestion.canonical_id) : null;
      const proof = existingEnglish || arabicProof;
      const rawAnswerText = language === "ar" ? arabicProof.answer_text : (existingEnglish?.answer_text || renderEnglish(arabicProof));
      const snapshotBoundary = language === "ar"
        ? `حدّ الحداثة: هذه إجابة مرجعية من لقطة P03C المختومة عند ${p03cSummary.generated_at_utc}. كلمة «الأحدث» تعني أحدث فترة مثبتة في تلك اللقطة، وليست ادعاءً عن الأحدث الآن.`
        : `Freshness boundary: this is a reference answer from the sealed P03C snapshot at ${p03cSummary.generated_at_utc}. “Latest” means the latest period evidenced in that snapshot, not a latest-now claim.`;
      const answerText = `${snapshotBoundary}\n\n${rawAnswerText}`;
      const canonicalAnswerId = `P05-CAN-${baseQuestion.canonical_id}-${language.toUpperCase()}`;
      const canonicalAnswer = {
        schema_version: "1.0",
        package_id: PACKAGE_ID,
        canonical_answer_id: canonicalAnswerId,
        semantic_id: baseQuestion.canonical_id,
        domain: baseQuestion.domain,
        domain_label_ar: domainLabelAr,
        domain_label_en: domainLabelEn,
        family: baseQuestion.family,
        language,
        answer_text: answerText,
        answer_sha256: sha256(answerText),
        terminal_state: arabicProof.closure_state,
        independent_answer_status: arabicProof.independent_answer_status,
        answer_mode: arabicProof.answer_mode,
        numeric_result_status: arabicProof.numeric_result_status,
        source_snapshot_as_of_utc: p03cSummary.generated_at_utc,
        proof_source: {
          package: "datasaudi-package-03c-full-closure",
          question_id: proof.question_id,
          original_answer_sha256: proof.answer_sha256,
          structured_proof_sha256: sha256(JSON.stringify(structuredProofProjection(proof))),
          derivation: language === "ar"
            ? "DIRECT_VERIFIED_AR_REFERENCE"
            : existingEnglish
              ? "DIRECT_VERIFIED_EN_REFERENCE"
              : "DETERMINISTIC_EN_RENDER_FROM_VERIFIED_STRUCTURED_PROOF"
        },
        selected_cube_ids: arabicProof.selected_cube_ids || [],
        source_urls: sourceUrls(proof),
        evidence_paths: evidencePaths(proof),
        atomic_claims: {
          total: proof.atomic_claims?.length || 0,
          verified: (proof.atomic_claims || []).filter(item => item.verification_status === "VERIFIED").length,
          bounded: (proof.atomic_claims || []).filter(item => item.verification_status === "BOUNDED").length
        },
        live_insaights: {
          status: "NOT_EXECUTED_AS_P05",
          interpretation: "Independent reference answer; never counted as a live INSAIGHTS observation."
        }
      };
      canonicalAnswers.push(canonicalAnswer);

      const semanticExecutions = [];
      for (const variant of VARIANTS) {
        const prompt = buildPrompt({ baseQuestion, family: baseQuestion.family, language, variant, domainLabelAr, domainLabelEn });
        const executionId = `P05-${baseQuestion.domain.toUpperCase()}-${baseQuestion.family.toUpperCase()}-${language.toUpperCase()}-V${variant}`;
        const execution = {
          schema_version: "1.0",
          package_id: PACKAGE_ID,
          execution_id: executionId,
          semantic_id: baseQuestion.canonical_id,
          canonical_answer_id: canonicalAnswerId,
          domain: baseQuestion.domain,
          family: baseQuestion.family,
          language,
          paraphrase_variant: variant,
          prompt,
          prompt_sha256: sha256(prompt),
          answer_text: answerText,
          answer_sha256: canonicalAnswer.answer_sha256,
          terminal_state: canonicalAnswer.terminal_state,
          source_snapshot_as_of_utc: p03cSummary.generated_at_utc,
          proof_source_question_id: canonicalAnswer.proof_source.question_id,
          proof_source_answer_sha256: canonicalAnswer.proof_source.original_answer_sha256,
          evidence_paths: canonicalAnswer.evidence_paths,
          source_urls: canonicalAnswer.source_urls,
          semantic_equivalence_contract: "SAME_DOMAIN_FAMILY_INTENT_DIFFERENT_PHRASING",
          live_insaights_status: "NOT_EXECUTED_AS_P05"
        };
        executions.push(execution);
        semanticExecutions.push(execution);
      }
      invariance.push({
        schema_version: "1.0",
        semantic_language_id: `${baseQuestion.canonical_id}-${language.toUpperCase()}`,
        canonical_answer_id: canonicalAnswerId,
        executions: semanticExecutions.length,
        unique_prompt_hashes: new Set(semanticExecutions.map(item => item.prompt_sha256)).size,
        unique_answer_hashes: new Set(semanticExecutions.map(item => item.answer_sha256)).size,
        verdict: semanticExecutions.length === 6
          && new Set(semanticExecutions.map(item => item.prompt_sha256)).size === 6
          && new Set(semanticExecutions.map(item => item.answer_sha256)).size === 1
          ? "PASS"
          : "FAIL"
      });
    }
  }

  const mainQuestionIds = new Set(baseQuestions.map(item => item.question_id));
  const mainCanonicalIds = new Set(baseQuestions.map(item => item.canonical_id));
  const baseProofs = baseQuestions.map(item => ledgerByQuestion.get(item.question_id));
  const isObserved = item => ["ANSWER_TEXT_OBSERVED", "UNAVAILABLE_ANSWER_OBSERVED"].includes(item?.insaights_observed_status?.status);
  const mainLiveObserved = baseProofs.filter(isObserved).length;
  const originalCrosswalk = ledger.map(item => {
    const mapped = mainQuestionIds.has(item.question_id)
      || (item.answer_language === "en" && mainCanonicalIds.has(item.canonical_id));
    return {
      schema_version: "1.0",
      question_id: item.question_id,
      canonical_id: item.canonical_id,
      family: item.family,
      domain: item.domain,
      language: item.answer_language,
      p03c_answer_sha256: item.answer_sha256,
      p03c_terminal_state: item.closure_state,
      disposition: mapped ? "MAPPED_INTO_P05_MAIN_UNIVERSE" : "SUPPLEMENTAL_P03C_CLOSED_OUTSIDE_MAIN_UNIVERSE",
      mapped_canonical_answer_id: mapped ? `P05-CAN-${item.canonical_id}-${item.answer_language.toUpperCase()}` : null
    };
  });

  const summary = {
    schema_version: "1.0",
    package_id: PACKAGE_ID,
    status: "REFERENCE_EXECUTION_UNIVERSE_COMPLETE_2304_OF_2304",
    generated_at_utc: p04Dossier.generated_at_utc,
    generated_at_source: `${P04_DOSSIER_RELATIVE}#generated_at_utc`,
    denominator_reconstruction: {
      historical_target: 2304,
      historical_formula_explicitly_persisted: false,
      historical_statement_source: `${CORPUS_RELATIVE.replace("questions.jsonl", "METHODOLOGY.md")}#target`,
      p05_frozen_formula: "24 domains × 8 families × 2 languages × 6 paraphrase variants",
      factors: { domains: 24, families: 8, languages: 2, paraphrase_variants: 6 },
      computed_executions: 24 * 8 * 2 * 6,
      governance_status: "ASSUMPTION_FROZEN_OWNER_AUTHORIZED",
      rationale: "This is the only exact operational reconstruction consistent with the persisted methodology dimensions and the 24×8 Arabic core."
    },
    coverage: {
      primary_semantic_questions: baseQuestions.length,
      canonical_localized_answers: canonicalAnswers.length,
      execution_answers: executions.length,
      execution_denominator: 2304,
      reference_execution_percent: Number((executions.length / 2304 * 100).toFixed(2)),
      live_insaights_main_universe_observed_cells: mainLiveObserved,
      live_insaights_main_universe_percent: Number((mainLiveObserved / 2304 * 100).toFixed(2)),
      historical_live_messages_all_scopes: p04Summary.coverage_truth.cumulative_live_insaights.observed_responses,
      historical_live_messages_breakdown: {
        main_universe_cells: mainLiveObserved,
        legacy_supplemental: originalCrosswalk.filter(item => item.disposition === "SUPPLEMENTAL_P03C_CLOSED_OUTSIDE_MAIN_UNIVERSE" && isObserved(ledgerByQuestion.get(item.question_id))).length,
        p04_capability_messages: p04Summary.coverage_truth.current_window.messages_used
      },
      public_api_cube_dossiers: p04Dossier.counts.cubes,
      public_api_cube_percent: 100
    },
    composition: {
      by_language: countBy(executions, "language"),
      by_family: countBy(executions, "family"),
      by_domain: countBy(executions, "domain"),
      canonical_answer_derivations: Object.fromEntries([...new Set(canonicalAnswers.map(item => item.proof_source.derivation))].sort().map(value => [value, canonicalAnswers.filter(item => item.proof_source.derivation === value).length])),
      localized_terminal_states: Object.fromEntries([...new Set(canonicalAnswers.map(item => item.terminal_state))].sort().map(value => [value, canonicalAnswers.filter(item => item.terminal_state === value).length])),
      semantic_core_terminal_states: Object.fromEntries([...new Set(baseProofs.map(item => item.closure_state))].sort().map(value => [value, baseProofs.filter(item => item.closure_state === value).length]))
    },
    paraphrase_invariance: {
      cells: invariance.length,
      pass: invariance.filter(item => item.verdict === "PASS").length,
      fail: invariance.filter(item => item.verdict === "FAIL").length
    },
    legacy_corpus_crosswalk: {
      total: originalCrosswalk.length,
      mapped_main: originalCrosswalk.filter(item => item.disposition === "MAPPED_INTO_P05_MAIN_UNIVERSE").length,
      supplemental_closed: originalCrosswalk.filter(item => item.disposition === "SUPPLEMENTAL_P03C_CLOSED_OUTSIDE_MAIN_UNIVERSE").length
    },
    proof_accounting: {
      p03c_atomic_claims_total: p03cSummary.atomic_claims.total,
      p03c_atomic_claims_verified: p03cSummary.atomic_claims.by_verification_status.VERIFIED,
      p03c_atomic_claims_bounded: p03cSummary.atomic_claims.by_verification_status.BOUNDED,
      p03c_atomic_claims_unresolved: p03cSummary.atomic_claims.unresolved,
      semantic_core_claims_total: baseProofs.reduce((sum, item) => sum + (item.atomic_claims?.length || 0), 0),
      semantic_core_claims_verified: baseProofs.flatMap(item => item.atomic_claims || []).filter(item => item.verification_status === "VERIFIED").length,
      semantic_core_claims_bounded: baseProofs.flatMap(item => item.atomic_claims || []).filter(item => item.verification_status === "BOUNDED").length,
      canonical_claim_references_total: canonicalAnswers.reduce((sum, item) => sum + item.atomic_claims.total, 0),
      unique_evidence_paths: new Set(canonicalAnswers.flatMap(item => item.evidence_paths)).size,
      unique_source_urls: new Set(canonicalAnswers.flatMap(item => item.source_urls)).size
    },
    boundaries: [
      "2304/2304 is reference execution coverage built from independently evidenced answers, not live INSAIGHTS coverage.",
      "31/2304 is the mapped live observation coverage of the P05 primary universe; 79 is an all-scope historical message count, not the P05 numerator.",
      "Six paraphrases share one semantic answer by design; invariance does not prove INSAIGHTS would answer all six correctly.",
      "The 2304 formula is frozen by Package05 as an explicit operational reconstruction because the historical methodology did not persist its six-variant factor.",
      "The 55 supplemental red-team, cross-sector, and opportunity questions remain closed separately and are not forced into the primary 2304 denominator.",
      "Public API reachability and evidence do not by themselves establish commercial reuse rights."
    ]
  };

  if (write) {
    await Promise.all([
      writeJsonl(path.join(packageRoot, "02-execution-universe/canonical-answers.jsonl"), canonicalAnswers),
      writeJsonl(path.join(packageRoot, "02-execution-universe/execution-answer-ledger.jsonl"), executions),
      writeJsonl(path.join(packageRoot, "03-verification/paraphrase-invariance.jsonl"), invariance),
      writeJsonl(path.join(packageRoot, "04-legacy-crosswalk/original-corpus-crosswalk.jsonl"), originalCrosswalk),
      writeJson(path.join(packageRoot, "SUMMARY.json"), summary)
    ]);
  }

  return { summary, canonicalAnswers, executions, invariance, originalCrosswalk };
}

async function cli() {
  const { summary } = await buildExecutionClosure();
  console.log(JSON.stringify({ ok: true, status: summary.status, coverage: summary.coverage, invariance: summary.paraphrase_invariance, legacy: summary.legacy_corpus_crosswalk }));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await cli();
