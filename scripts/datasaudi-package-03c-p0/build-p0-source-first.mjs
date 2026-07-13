#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "research/datasaudi-package-03c-full-closure/p0-plan",
);
const FETCH = process.argv.includes("--fetch");

const PATHS = {
  corpus: "research/datasaudi-insaights/04-question-corpus/questions.jsonl",
  dictionary: "research/datasaudi-insaights/07-semantic-dictionary/dictionary.json",
  catalog:
    "research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cubes-show-all-true.json",
  gold:
    "research/datasaudi-package-03/02-source-oracle-and-evidence-vault/gold-case-specs.jsonl",
  oracle:
    "research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-evidence.jsonl",
  accounting:
    "research/datasaudi-package-03/04-proposition-verifier-and-adjudication/runs/truth-run-20260713T021707685Z-752501f6/answer-accounting.jsonl",
  queue:
    "research/datasaudi-package-03a-question-closure/03-adjudication/remaining-unsent-queue.jsonl",
  p03aAdjudication:
    "research/datasaudi-package-03a-question-closure/03-adjudication/adjudication.json",
  catalogSearchAudit:
    "research/datasaudi-package-03c-full-closure/p0-plan/catalog-boundary-audit.json",
};

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const jsonl = (rows) => `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
const readText = (relative) => readFile(path.join(ROOT, relative), "utf8");
const readJson = async (relative) => JSON.parse(await readText(relative));
const readJsonl = async (relative) =>
  (await readText(relative))
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

const [corpus, dictionary, gold, oracle, accounting, queue, p03aAdjudication] =
  await Promise.all([
    readJsonl(PATHS.corpus),
    readJson(PATHS.dictionary),
    readJsonl(PATHS.gold),
    readJsonl(PATHS.oracle),
    readJsonl(PATHS.accounting),
    readJsonl(PATHS.queue),
    readJson(PATHS.p03aAdjudication),
  ]);

const catalogText = await readText(PATHS.catalog);
const catalogSha256 = sha256(catalogText);
const corpusById = new Map(corpus.map((row) => [row.question_id, row]));
const goldById = new Map(gold.map((row) => [row.question_id, row]));
const cubeById = new Map(dictionary.cubes.map((row) => [row.cube_id, row]));
const oracleById = new Map(oracle.map((row) => [row.evidence_id, row]));
const oracleByCube = new Map(oracle.map((row) => [row.cube, row]));

const completeBeforeP03a = new Set([
  "CPI-AVAIL-01-AR",
  "POP-AVAIL-01-AR",
]);
const p03PartialIds = accounting
  .map((row) => row.question_id)
  .filter((id) => !completeBeforeP03a.has(id));
const p03aPartialIds = p03aAdjudication.strict_source_layer
  ? p03aAdjudication.questions
      .filter((row) => row.strict.startsWith("PARTIAL_"))
      .map((row) => row.question_id)
  : [];
const partialIds = [...new Set([...p03PartialIds, ...p03aPartialIds])];
const quotaOnlyIds = p03aAdjudication.questions
  .filter((row) => row.strict === "QUOTA_BLOCKED")
  .map((row) => row.question_id);
const unsentIds = [...new Set([...quotaOnlyIds, ...queue.map((row) => row.question_id)])];
const targetIds = [...new Set([...partialIds, ...unsentIds])];

if (partialIds.length !== 38) {
  throw new Error(`Expected 38 partial questions, observed ${partialIds.length}`);
}
if (unsentIds.length !== 49) {
  throw new Error(`Expected 49 no-live questions, observed ${unsentIds.length}`);
}
if (targetIds.length !== 87) {
  throw new Error(`Expected 87 P0 closure targets, observed ${targetIds.length}`);
}

const taxonomySubtopics = {
  fis: ["Fiscal Indicators"],
  ext: ["External Sector & International Trade"],
  mkt: ["Financial Markets"],
  rnd: ["Research and Development"],
};

const taxonomyCubesFor = (domain) => {
  const wanted = new Set(taxonomySubtopics[domain] || []);
  return dictionary.cubes
    .filter((cube) => wanted.has(cube.subtopic?.en))
    .map((cube) => cube.cube_id)
    .sort();
};

const selectedCubesFor = (question, spec) => {
  if (spec?.source_cubes?.length) return spec.source_cubes;
  if (taxonomySubtopics[question.domain]) return taxonomyCubesFor(question.domain);
  return [];
};

const levelsFor = (cube) =>
  cube.dimensions.flatMap((dimension) =>
    dimension.levels.map((level) => ({
      dimension: dimension.name,
      name: level.name,
      caption: level.caption,
      type: dimension.type,
      time_scale: level.time_scale,
    })),
  );

const cubeContract = (cubeId) => {
  const cube = cubeById.get(cubeId);
  if (!cube) {
    return {
      cube_id: cubeId,
      catalog_status: "MISSING_FROM_FROZEN_277_CUBE_CATALOG",
    };
  }
  const levels = levelsFor(cube);
  const timeLevels = levels.filter((level) => level.type === "time");
  const geoLevels = levels.filter((level) => level.type === "geo");
  return {
    cube_id: cube.cube_id,
    catalog_status: "PRESENT",
    dataset_name_ar: cube.names.ar,
    dataset_name_en: cube.names.en,
    topic_ar: cube.topic?.ar ?? null,
    topic_en: cube.topic?.en ?? null,
    subtopic_ar: cube.subtopic?.ar ?? null,
    subtopic_en: cube.subtopic?.en ?? null,
    publisher_ar: cube.source?.ar ?? null,
    publisher_en: cube.source?.en ?? null,
    publisher_url: cube.source?.url ?? null,
    hidden_in_ui: cube.hidden_in_ui,
    latest_observed_catalog: cube.latest_observed ?? null,
    frequency: [...new Set(timeLevels.map((level) => level.time_scale).filter(Boolean))],
    time_levels: timeLevels.map((level) => level.name),
    geography_levels: geoLevels.map((level) => level.name),
    dimensions: cube.dimensions.map((dimension) => ({
      name: dimension.name,
      type: dimension.type,
      levels: dimension.levels.map((level) => level.name),
    })),
    measures: cube.measures.map((measure) => ({
      name: measure.name,
      caption: measure.caption,
      unit: measure.units_annotation ?? null,
      aggregator: measure.aggregator ?? null,
    })),
    catalog_evidence: {
      path: PATHS.catalog,
      sha256: catalogSha256,
    },
  };
};

const domainFallbackCubeIds = new Set(
  targetIds.flatMap((id) => {
    const question = corpusById.get(id);
    const spec = goldById.get(id);
    if (!question || spec?.source_cubes?.length) return [];
    return taxonomyCubesFor(question.domain);
  }),
);

const fetchedEvidence = new Map();
const supplementalEvidence = new Map();
const evidenceDir = path.join(OUT, "evidence", "responses");
await mkdir(evidenceDir, { recursive: true });

const timeLevelFor = (cube) => {
  const levels = levelsFor(cube).filter((level) => level.type === "time");
  return (
    levels.find((level) => level.time_scale === "month") ||
    levels.find((level) => level.time_scale === "quarter") ||
    levels.find((level) => level.time_scale === "year") ||
    levels[0]
  );
};

const buildApiUrl = (cube) => {
  const time = timeLevelFor(cube);
  const measure = cube.measures[0];
  if (!time || !measure) return null;
  const url = new URL("https://api.datasaudi.sa/tesseract/data.jsonrecords");
  url.searchParams.set("cube", cube.cube_id);
  url.searchParams.set("drilldowns", time.name);
  url.searchParams.set("measures", measure.name);
  url.searchParams.set("locale", "en");
  url.searchParams.set("limit", "50000,0");
  return url.toString();
};

const supplementalQueries = {
  "H-03-AR":
    "https://api.datasaudi.sa/tesseract/data.jsonrecords?cube=gastat_detailed_population&drilldowns=Geography%20Province%2CYear&measures=Population&locale=en&limit=50000%2C0",
};

const replayRequest = async (key, requestUrl) => {
  try {
    const response = await fetch(requestUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(45_000),
    });
    const body = await response.text();
    const responseSha256 = sha256(body);
    const responsePath = path.join(evidenceDir, `${responseSha256}.json`);
    if (response.ok) await writeFile(responsePath, body);
    const parsed = response.ok ? JSON.parse(body) : null;
    return {
      status: response.ok ? "REPLAYED" : "HTTP_ERROR",
      key,
      request_url: requestUrl,
      http_status: response.status,
      rows: parsed?.data?.length ?? 0,
      total: parsed?.page?.total ?? null,
      complete:
        parsed?.page?.total == null
          ? null
          : parsed.page.total <= (parsed.data?.length ?? 0),
      response_path: response.ok ? path.relative(ROOT, responsePath) : null,
      response_sha256: responseSha256,
      retrieved_at_utc: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "FETCH_ERROR",
      key,
      request_url: requestUrl,
      error: String(error?.message || error),
    };
  }
};

if (FETCH) {
  for (const cubeId of [...domainFallbackCubeIds].sort()) {
    const cube = cubeById.get(cubeId);
    const requestUrl = cube ? buildApiUrl(cube) : null;
    if (!requestUrl) {
      fetchedEvidence.set(cubeId, {
        status: "NO_SAFE_DEFAULT_QUERY",
        cube_id: cubeId,
      });
      continue;
    }
    const replay = await replayRequest(cubeId, requestUrl);
    fetchedEvidence.set(cubeId, { cube_id: cubeId, ...replay });
  }
  for (const [questionId, requestUrl] of Object.entries(supplementalQueries)) {
    supplementalEvidence.set(
      questionId,
      await replayRequest(questionId, requestUrl),
    );
  }
}

const existingFetchedFiles = new Map();
for (const cubeId of domainFallbackCubeIds) {
  if (fetchedEvidence.has(cubeId)) continue;
  const cube = cubeById.get(cubeId);
  const requestUrl = cube ? buildApiUrl(cube) : null;
  existingFetchedFiles.set(cubeId, {
    status: "QUERY_CONTRACT_READY_NOT_REPLAYED_IN_THIS_RUN",
    cube_id: cubeId,
    request_url: requestUrl,
  });
}

for (const [questionId, requestUrl] of Object.entries(supplementalQueries)) {
  if (!supplementalEvidence.has(questionId)) {
    supplementalEvidence.set(questionId, {
      status: "QUERY_CONTRACT_READY_NOT_REPLAYED_IN_THIS_RUN",
      key: questionId,
      request_url: requestUrl,
    });
  }
}

const evidenceForCube = (cubeId) => {
  const oracleRow = oracleByCube.get(cubeId);
  if (oracleRow) {
    return {
      mode: "CACHED_OFFICIAL_API_REPLAY",
      evidence_id: oracleRow.evidence_id,
      request_url: oracleRow.request_url,
      response_path: oracleRow.response_path,
      response_sha256: oracleRow.response_sha256,
      http_status: oracleRow.http_status,
      rows: oracleRow.rows,
      total: oracleRow.total,
      complete: oracleRow.complete,
      retrieved_at_utc: oracleRow.retrieved_at_utc,
    };
  }
  const replay = fetchedEvidence.get(cubeId) || existingFetchedFiles.get(cubeId);
  return {
    mode: replay?.status === "REPLAYED" ? "LIVE_OFFICIAL_API_REPLAY" : "OFFICIAL_API_QUERY_CONTRACT",
    ...(replay || { status: "NO_REPLAY" }),
  };
};

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .toLowerCase();
const searchableCube = (cube) =>
  normalize(
    JSON.stringify({
      id: cube.cube_id,
      names: cube.names,
      dimensions: cube.dimensions,
      measures: cube.measures,
      topic: cube.topic,
      subtopic: cube.subtopic,
    }),
  );

const catalogSearches = [
  {
    audit_id: "PRIVATE_ENTITY_PROFIT_AND_IDENTIFIER",
    terms: [
      "private company profit",
      "company id",
      "establishment id",
      "أرباح كل منشأة",
      "معرف المنشأة",
    ],
  },
  {
    audit_id: "DWELLING_LEVEL_ACTUAL_RENT",
    terms: [
      "dwelling id",
      "unit address",
      "actual rent per unit",
      "معرف الوحدة السكنية",
      "الإيجار الفعلي لكل وحدة",
    ],
  },
  {
    audit_id: "INDIVIDUAL_HEALTH_RECORD",
    terms: [
      "patient id",
      "medical record",
      "national id",
      "السجل الصحي الفردي",
      "رقم المريض",
    ],
  },
  {
    audit_id: "PHONE_LEVEL_IDENTIFIER",
    terms: ["phone number", "mobile number", "رقم الهاتف", "رقم الجوال"],
  },
];

const catalogBoundaryAudit = {
  schema_version: "1.0",
  generated_at_utc: new Date().toISOString(),
  catalog: {
    path: PATHS.catalog,
    sha256: catalogSha256,
    cubes: dictionary.cube_count,
    subtopics_non_null: [
      ...new Set(dictionary.cubes.map((cube) => cube.subtopic?.en).filter(Boolean)),
    ].sort(),
    cubes_without_subtopic: dictionary.cubes.filter((cube) => !cube.subtopic?.en)
      .length,
  },
  method:
    "Literal normalized search over cube IDs, Arabic/English names, topics, subtopics, dimensions and measures. Zero matches proves absence only from this frozen public catalog schema, not from all Saudi administrative data.",
  searches: catalogSearches.map((search) => ({
    ...search,
    terms_results: search.terms.map((term) => {
      const normalizedTerm = normalize(term);
      const matches = dictionary.cubes
        .filter((cube) => searchableCube(cube).includes(normalizedTerm))
        .map((cube) => cube.cube_id)
        .sort();
      return { term, match_count: matches.length, cube_ids: matches };
    }),
  })),
};

const cubeSummaryAr = (contract) => {
  if (contract.catalog_status !== "PRESENT") {
    return `- ${contract.cube_id}: غير موجود في لقطة الكتالوج المثبتة.`;
  }
  const measures = contract.measures
    .map((measure) => `${measure.name} [${measure.unit || "الوحدة غير موسومة"}]`)
    .join("، ");
  const dimensions = contract.dimensions
    .map((dimension) => `${dimension.name}(${dimension.levels.join("/")})`)
    .join("، ");
  const frequencies = contract.frequency.length
    ? contract.frequency.join("/")
    : "غير موسوم زمنيًا";
  const geographies = contract.geography_levels.length
    ? contract.geography_levels.join("/")
    : "لا بُعد جغرافي معلن";
  return `- ${contract.cube_id}: ${contract.dataset_name_ar}. المصدر: ${contract.publisher_ar || contract.publisher_en}; التواتر: ${frequencies}; آخر فترة موسومة في الكتالوج: ${contract.latest_observed_catalog ?? "غير متاحة"}; الجغرافيا: ${geographies}; الأبعاد: ${dimensions}; المقاييس: ${measures}; رابط المصدر: ${contract.publisher_url || "غير متاح"}.`;
};

const cubeSummaryEn = (contract) => {
  if (contract.catalog_status !== "PRESENT") {
    return `- ${contract.cube_id}: absent from the frozen catalog snapshot.`;
  }
  const measures = contract.measures
    .map((measure) => `${measure.name} [${measure.unit || "unit not annotated"}]`)
    .join(", ");
  const dimensions = contract.dimensions
    .map((dimension) => `${dimension.name}(${dimension.levels.join("/")})`)
    .join(", ");
  const frequencies = contract.frequency.length
    ? contract.frequency.join("/")
    : "no time frequency annotated";
  const geographies = contract.geography_levels.length
    ? contract.geography_levels.join("/")
    : "no declared geography dimension";
  return `- ${contract.cube_id}: ${contract.dataset_name_en}. Publisher: ${contract.publisher_en || contract.publisher_ar}; frequency: ${frequencies}; catalog latest period: ${contract.latest_observed_catalog ?? "unavailable"}; geography: ${geographies}; dimensions: ${dimensions}; measures: ${measures}; source: ${contract.publisher_url || "unavailable"}.`;
};

const availabilityAnswer = (question, contracts) => {
  const isEn = question.language === "en";
  const rows = contracts.map(isEn ? cubeSummaryEn : cubeSummaryAr).join("\n");
  if (isEn) {
    return `Verified availability answer (public catalog snapshot):\n${rows}\n\nReported facts: only the catalog metadata above. Calculations: none. Inference: this is a verified relevant-set answer, not a claim that no other relevant Saudi dataset exists outside the public DataSaudi catalog.`;
  }
  return `الإجابة المثبتة من لقطة الكتالوج العامة:\n${rows}\n\nالمنقول: بيانات الكتالوج أعلاه فقط. المحسوب: لا شيء. الاستنتاج: هذه مجموعة صلة مثبتة وليست ادعاءً بعدم وجود أي بيانات سعودية أخرى خارج كتالوج DataSaudi العام.`;
};

const limitAnswer = (question, contracts) => {
  const isEn = question.language === "en";
  const rows = contracts.map(isEn ? cubeSummaryEn : cubeSummaryAr).join("\n");
  if (isEn) {
    return `Evidence boundary:\n${rows}\n\n- Not present: I do not label a concept globally absent unless a literal full-catalog search is recorded.\n- Not found: anything outside the verified cube set above remains not found for this answer, not proven absent.\n- Not matched: a requested value cannot be reported when its measure, unit, time level, geography or denominator is not in the listed schema.\n- Not current: each cube's catalog latest period is stated above; publication date and observation date are not interchangeable.\nNo unsupported value or causal claim is supplied.`;
  }
  return `حدود الدليل:\n${rows}\n\n- غير موجود: لا أصف مفهومًا بأنه غير موجود عالميًا إلا إذا وُثّق بحث حرفي في كامل الكتالوج.\n- لم أجده: ما يقع خارج مجموعة المكعبات المثبتة أعلاه يبقى «لم أجده لهذه الإجابة» لا «غير موجود».\n- غير متطابق: لا تُستخرج قيمة إذا لم يوجد مقياسها أو وحدتها أو مستواها الزمني أو جغرافيتها أو مقامها في المخطط المذكور.\n- غير حديث: آخر فترة موسومة لكل مكعب مذكورة أعلاه؛ تاريخ النشر ليس تاريخ المشاهدة.\nلم أضف قيمة أو علاقة سببية غير مدعومة.`;
};

const hAnswers = {
  "H-03-AR":
    "أرفض المقدمة: استعلام gastat_detailed_population الكامل للمناطق في سنة 2022 يعرض الرياض 8,591,748 نسمة، وهي الأعلى في الصفوف الـ13، بينما الباحة 339,174 نسمة وهي الأقل. المقياس Population، الوحدة عدد أشخاص، الجغرافيا Geography Province، التواتر سنوي، والمصدر الهيئة العامة للإحصاء/تعداد السعودية 2022. المنقول: القيمتان وصفوف المقارنة الرسمية؛ المحسوب: ترتيب تنازلي/تصاعدي فقط؛ لا سببية ولا استبدال للسكان بالكثافة.",
  "H-04-AR":
    "لا يمكن إثبات السببية من تزامن نقاط البيع والبطالة. sama_pos_transactions_mada يقيس عمليات/مبيعات نقاط البيع، وgastat_unemployment_rate يقيس معدل البطالة؛ اختلاف التعريف والتواتر والمحددات الخارجية يمنع الاستدلال السببي. المنقول: السلسلتان المستقلتان فقط. المحسوب: لا معامل ارتباط أو اختبار دلالة معروض. الاستنتاج: لا توجد حجة سببية قابلة للتحقق، لذا أسحب أي وصف لقوة العلاقة.",
  "H-05-AR":
    "أرفض دمج التدفق والرصيد. sama_fdi يمثل تدفقات الاستثمار الأجنبي خلال فترة، بينما gastat_fdi_stock يمثل رصيدًا في نقطة زمنية؛ لا تجمع السلسلتان ولا تُعرضان كمتغير واحد. أي مصالحة بين تغير الرصيد والتدفق تحتاج تعديلات التقييم وسعر الصرف وإعادة التصنيف وغيرها، وهي غير معروضة هنا.",
  "H-06-AR":
    "لا يجوز جمع MW مع MWh: MW قدرة لحظية وMWh طاقة خلال فترة. الدليل المتاح هنا sama_electricity_consumption_subregion يقيس استهلاك الكهرباء وليس توليد الطاقة المتجددة، لذلك لا أستبدله بقياس التوليد ولا أختلق مجموعًا. يلزم مكعب صريح للتوليد المتجدد بـMWh ومقياس مستقل للقدرة التشغيلية بـMW قبل المقارنة.",
  "H-07-AR":
    "أرفض مساواة السجل/المنشأة الجديدة بالمنشأة النشطة. مخطط business_demography_enterprises يفصل Total New Enterprises وTotal Closed Enterprises وTotal Active Enterprises؛ كل مقياس له تعريف مختلف. المنقول: المقاييس الثلاثة منفصلة. المحسوب: لا توجد مصالحة دخول/خروج معروضة. الاستنتاج: الجديد لا يساوي النشط.",
  "H-08-AR":
    "أرفض استخدام عدد الرحلات بوصفه عدد سياح فريدين؛ الشخص قد يقوم بأكثر من رحلة. المكعب المثبت tourism_occupancy_rate_monthly يقيس Occupancy Rate ولا يثبت أصلًا عدد الرحلات أو هوية السائح الفريدة. لذلك لا أستبدل الإشغال بالرحلات ولا الرحلات بالأشخاص.",
  "H-16-AR":
    "لا أستطيع عرض أرباح كل منشأة خاصة غير مدرجة. لقطة كتالوج DataSaudi العامة (277 مكعبًا) لا تعرض معرف منشأة خاصًا يربط ربحًا بمنشأة بعينها وفق بحث المخطط الحرفي الموثق. أي مؤشرات كلية كفائض التشغيل ليست أرباحًا خاصة على مستوى المنشأة ولا بديلًا عنها.",
  "H-17-AR":
    "لا أستطيع عرض الإيجار الفعلي لكل وحدة سكنية. الكتالوج العام لا يعرض معرف وحدة/عنوانًا مع قيمة إيجار عقدية وفق بحث المخطط الحرفي الموثق. مؤشرات الأسعار أو أعداد المساكن أو الحيازة لا تساوي مستوى الإيجار الفعلي لوحدة بعينها ولا تثبت الطلب.",
  "H-18-AR":
    "أرفض طلب السجل الصحي الفردي. كتالوج DataSaudi العام يعرض مؤشرات صحية مجمعة ولا يعرض معرف مريض أو سجلًا طبيًا فرديًا وفق البحث الحرفي الموثق. لا أستبدل ذلك بمؤشر غير صحي مثل أسرة الإقامة، ولا أدعي ترتيبًا إقليميًا بلا جدول كامل.",
  "H-19-AR":
    "لا توجد «قيمة فعلية» للشهر القادم قبل وقوعه ونشره. يمكن تقديم توقع موسوم بوضوح إذا توفرت منهجية توقع، لكنه ليس مشاهدة فعلية. لم أورد قيمة أو مصدرًا وهميًا.",
  "H-20-AR":
    "لا يوجد ناتج فعلي لعام 2030 قبل اكتمال الفترة ونشر البيانات الرسمية. أي رقم الآن سيكون هدفًا أو سيناريو أو توقعًا، لا مشاهدة فعلية؛ لذلك لا أختلق قيمة.",
  "H-21-AR":
    "أحدث مشاهدة ربع سنوية مثبتة في الاستعلام المسترجع للمكعب gastat_gdp هي 2025-Q4: الناتج المحلي الإجمالي الحقيقي = 1,272,528 مليون ريال، الجغرافيا المملكة، التواتر ربع سنوي، المصدر الهيئة العامة للإحصاء، مجموعة البيانات Real Gross Domestic Product by Economic Activity - Quarterly. تاريخ البيانات 2025-Q4 وليس تاريخ اليوم. المنقول: الصف الرسمي فقط؛ المحسوب والاستنتاج: لا شيء.",
  "H-22-AR":
    "1.3 تريليون = 1.3 × 1000 = 1300 مليار. هذا تحويل وحدات حسابي، وليس قيمة من مجموعة بيانات؛ لذلك لا أنسبه إلى مصدر بيانات أو فترة أو جغرافيا.",
  "H-23-AR":
    "الفرق بين 10% و12% هو نقطتان مئويتان، أما النمو النسبي فهو (12−10)÷10 = 20%. لا يمكن القول إن كل فرق نقطتين يساوي نمو 20% دون معرفة قيمة الأساس.",
  "H-24-AR":
    "أرفض جمع أرصدة الائتمان الشهرية لإنتاج إجمالي سنوي؛ الرصيد متغير مخزون، والجمع يكرر المبلغ القائم عبر الأشهر. في sama_bank_credit_month يلزم استخدام رصيد نهاية السنة أو متوسط سنوي موسوم بوضوح حسب الغرض، لا مجموع الأرصدة. لا توجد قيمة محسوبة هنا.",
  "H-25-AR":
    "أرفض المتوسط غير الموزون لمعدلات المناطق بوصفه معدلًا وطنيًا. يلزم المقام/الوزن الموافق لكل منطقة أو صف وطني منشور مباشرة؛ وإلا يتساوى تأثير منطقة صغيرة وكبيرة خطأً. لا أقدم معدلًا وطنيًا بلا أوزان قابلة لإعادة الحساب.",
  "H-26-AR":
    `لا يمكن استنتاج «القطاعات التي لا توجد عنها بيانات» من الصمت. ما يمكن إثباته: لقطة الكتالوج تحتوي ${dictionary.cube_count} مكعبًا و${catalogBoundaryAudit.catalog.subtopics_non_null.length} تصنيفًا فرعيًا غير فارغ، مع ${catalogBoundaryAudit.catalog.cubes_without_subtopic} مكعبًا بلا تصنيف فرعي. أي قطاع خارج crosswalk صريح يُصنّف «لم أتحقق من مطابقته» لا «غير موجود».`,
  "H-27-AR":
    `لا أستطيع إثبات أن نموذج INSAIGHTS نفسه يستخدم كامل الكتالوج من واجهته العامة. ما أستطيع إثباته مستقلًا: خط التحقق الحالي قرأ لقطة الكتالوج العامة كاملة وعددها ${dictionary.cube_count} مكعبًا، بينما oracle السابق أعاد تشغيل ${oracle.length} مكعبًا فقط؛ لذا نطاق النموذج الداخلي غير مثبت، ونطاق تحققنا العام موثق صراحة.`,
  "H-28-AR":
    "أرفق بكل جملة في سجل هذه الإجابة مراجع cube، رابط الناشر، مسار الاستجابة، SHA-256، والاستعلام عند وجوده. الجمل الحسابية H-22/H-23 موسومة «محسوب» ولا تُنسب إلى مصدر بيانات؛ الرفضات المفاهيمية موسومة «عقد جواب». لا توجد إحالة عامة مبهمة بديلة عن الإسناد على مستوى الادعاء.",
  "H-29-AR":
    "الادعاءات التي لا أملك عليها دليلًا مباشرًا ولا أتعامل معها كحقائق: (1) نطاق الكتالوج الذي يستخدمه نموذج INSAIGHTS داخليًا، (2) سببية نقاط البيع للبطالة، (3) أرباح أو إيجارات أو سجلات صحية فردية، (4) اكتمال تغطية كل القطاعات، (5) أي قيمة مستقبلية فعلية. جرى رفضها أو وسمها غير مثبتة، لا ملء فراغها.",
  "H-30-AR":
    "أسحب أي استنتاج سابق يقول إن INSAIGHTS يستخدم كامل الكتالوج، أو إن التزامن يثبت السببية، أو إن المؤشر الكلي يساوي بيانات فردية. الإجابات المرجعية هنا لا تبقي استنتاجًا عدديًا غير قابل لإعادة الحساب؛ الحسابان الوحيدان هما تحويل 1.3 تريليون إلى 1300 مليار، ومثال 10% إلى 12%، وصيغتهما معروضة.",
};

const answerFor = (question, contracts) => {
  if (hAnswers[question.question_id]) return hAnswers[question.question_id];
  if (question.family === "availability") {
    return availabilityAnswer(question, contracts);
  }
  if (question.family === "limit") return limitAnswer(question, contracts);
  throw new Error(`No reference answer generator for ${question.question_id}`);
};

const liveStatusFor = (id) => {
  if (id === "H-19-AR") return "QUOTA_FRAME_ONLY_NO_SUBSTANTIVE_ANSWER";
  if (unsentIds.includes(id)) return "NOT_SENT_AFTER_FIRST_QUOTA_FRAME";
  return "OBSERVED_LIVE_PARTIAL_REPLACED_BY_INDEPENDENT_REFERENCE_ANSWER";
};

const closureRecords = targetIds.map((id) => {
  const question = corpusById.get(id);
  const spec = goldById.get(id);
  if (!question || !spec) throw new Error(`Missing corpus/gold record for ${id}`);
  const cubeIds = selectedCubesFor(question, spec);
  const contracts = cubeIds.map(cubeContract);
  const evidence = cubeIds.map((cubeId) => ({
    cube_id: cubeId,
    ...evidenceForCube(cubeId),
  }));
  const answer = answerFor(question, contracts);
  const sourceModes = [...new Set(evidence.map((row) => row.mode))];
  const taxonomyExpanded =
    !spec.source_cubes.length && taxonomyCubesFor(question.domain).length > 0;
  return {
    schema_version: "1.0",
    question_id: id,
    canonical_id: question.canonical_id,
    baseline_bucket: partialIds.includes(id)
      ? "PARTIAL_BEFORE_P03C"
      : "P0_WITHOUT_LIVE_ANSWER_BEFORE_P03C",
    domain: question.domain,
    family: question.family,
    language: question.language,
    prompt: question.prompt,
    expected_behavior: question.expected_behavior,
    insaights_observation_status: liveStatusFor(id),
    independent_answer_status: "CLOSED_REFERENCE_ANSWER",
    closure_mode: id.startsWith("H-")
      ? "EVIDENCE_BACKED_REJECTION_OR_DETERMINISTIC_CONTRACT"
      : taxonomyExpanded
        ? "FULL_CATALOG_TAXONOMY_PLUS_OFFICIAL_API"
        : "FROZEN_GOLD_ORACLE_PLUS_FULL_CATALOG_SCHEMA",
    selected_cube_ids: cubeIds,
    selected_cube_origin: taxonomyExpanded
      ? "full-catalog-subtopic-match"
      : spec.source_cubes.length
        ? "preregistered-gold-source-cubes"
        : "no-cube-contract",
    cube_contracts: contracts,
    evidence,
    supplemental_evidence: supplementalEvidence.has(id)
      ? [supplementalEvidence.get(id)]
      : [],
    source_modes: sourceModes,
    assertion_contract: spec.assertion_contract,
    reference_answer: answer,
    answer_sha256: sha256(answer),
    verification_notes: [
      "INSAIGHTS observation and independent source-first answer are separate fields.",
      "A quota frame is not counted as a substantive INSAIGHTS answer.",
      "Catalog absence claims are bounded to the frozen public 277-cube snapshot.",
      "No identity rotation, quota bypass or alternate-account behavior was used.",
    ],
  };
});

const sourceMap = closureRecords.map((row) => ({
  schema_version: row.schema_version,
  question_id: row.question_id,
  baseline_bucket: row.baseline_bucket,
  family: row.family,
  domain: row.domain,
  language: row.language,
  insaights_observation_status: row.insaights_observation_status,
  independent_answer_status: row.independent_answer_status,
  closure_mode: row.closure_mode,
  selected_cube_ids: row.selected_cube_ids,
  selected_cube_origin: row.selected_cube_origin,
  query_contracts: row.evidence.map((evidence) => ({
    cube_id: evidence.cube_id,
    mode: evidence.mode,
    request_url: evidence.request_url ?? null,
    response_path: evidence.response_path ?? null,
    response_sha256: evidence.response_sha256 ?? null,
    complete: evidence.complete ?? null,
  })),
  assertion_contract: row.assertion_contract,
  answer_sha256: row.answer_sha256,
}));

const byMode = Object.fromEntries(
  [...new Set(closureRecords.map((row) => row.closure_mode))]
    .sort()
    .map((mode) => [mode, closureRecords.filter((row) => row.closure_mode === mode).length]),
);
const queryEvidence = closureRecords.flatMap((row) => row.evidence);
const uniqueSelectedCubes = new Set(
  closureRecords.flatMap((row) => row.selected_cube_ids),
);
const fetchedReplayRows = [...fetchedEvidence.values()].sort((a, b) =>
  a.cube_id.localeCompare(b.cube_id),
);
const summary = {
  schema_version: "1.0",
  generated_at_utc: new Date().toISOString(),
  scope: "87 P0 questions: 38 partial plus 49 without a substantive live answer",
  counts: {
    targets: closureRecords.length,
    partial_replaced: closureRecords.filter(
      (row) => row.baseline_bucket === "PARTIAL_BEFORE_P03C",
    ).length,
    no_live_answer_reference_closed: closureRecords.filter(
      (row) => row.baseline_bucket === "P0_WITHOUT_LIVE_ANSWER_BEFORE_P03C",
    ).length,
    independent_reference_answers_closed: closureRecords.filter(
      (row) => row.independent_answer_status === "CLOSED_REFERENCE_ANSWER",
    ).length,
    insaights_substantive_answers_created: 0,
    closure_modes: byMode,
    cached_official_api_evidence_refs: queryEvidence.filter(
      (row) => row.mode === "CACHED_OFFICIAL_API_REPLAY",
    ).length,
    live_official_api_evidence_refs: queryEvidence.filter(
      (row) => row.mode === "LIVE_OFFICIAL_API_REPLAY",
    ).length,
    official_api_query_contracts_not_replayed: queryEvidence.filter(
      (row) => row.mode === "OFFICIAL_API_QUERY_CONTRACT",
    ).length,
    unique_selected_cubes: uniqueSelectedCubes.size,
    taxonomy_fallback_unique_cubes: domainFallbackCubeIds.size,
    taxonomy_live_replays: fetchedReplayRows.filter(
      (row) => row.status === "REPLAYED",
    ).length,
    taxonomy_live_replays_complete: fetchedReplayRows.filter(
      (row) => row.status === "REPLAYED" && row.complete === true,
    ).length,
    supplemental_live_replays: [...supplementalEvidence.values()].filter(
      (row) => row.status === "REPLAYED",
    ).length,
  },
  catalog: catalogBoundaryAudit.catalog,
  truth_statement:
    "All 87 targets now have independent evidence-bounded reference answers. This does not claim that INSAIGHTS itself produced or passed those answers; H-19 returned only a quota frame and no further live sends were made.",
  limitations: [
    "Reference-answer closure is not live assistant-behavior closure.",
    "Full-catalog literal absence is bounded to the frozen public schema and cannot prove absence from all Saudi administrative systems.",
    "Publisher links and official API replays support internal evidence work; publication rights remain governed separately.",
  ],
  artifacts: {
    closure_records: "research/datasaudi-package-03c-full-closure/p0-plan/reference-answers.jsonl",
    source_contract_map:
      "research/datasaudi-package-03c-full-closure/p0-plan/question-source-contract-map.jsonl",
    catalog_boundary_audit: PATHS.catalogSearchAudit,
    live_replay_manifest:
      "research/datasaudi-package-03c-full-closure/p0-plan/live-replay-manifest.jsonl",
  },
};

if (FETCH) {
  const retainedResponseNames = new Set(
    [
      ...fetchedReplayRows,
      ...[...supplementalEvidence.values()],
    ]
      .filter((row) => row.status === "REPLAYED" && row.response_path)
      .map((row) => path.basename(row.response_path)),
  );
  for (const fileName of await readdir(evidenceDir)) {
    if (!retainedResponseNames.has(fileName)) {
      await unlink(path.join(evidenceDir, fileName));
    }
  }
}

await mkdir(OUT, { recursive: true });
await Promise.all([
  writeFile(path.join(OUT, "reference-answers.jsonl"), jsonl(closureRecords)),
  writeFile(path.join(OUT, "question-source-contract-map.jsonl"), jsonl(sourceMap)),
  writeFile(path.join(OUT, "catalog-boundary-audit.json"), stable(catalogBoundaryAudit)),
  writeFile(
    path.join(OUT, "live-replay-manifest.jsonl"),
    jsonl([
      ...fetchedReplayRows.map((row) => ({
        schema_version: "1.0",
        replay_scope: "taxonomy-fallback-cube",
        ...row,
      })),
      ...[...supplementalEvidence.entries()].map(([questionId, row]) => ({
        schema_version: "1.0",
        replay_scope: "question-specific-supplement",
        question_id: questionId,
        ...row,
      })),
    ]),
  ),
  writeFile(path.join(OUT, "summary.json"), stable(summary)),
]);

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
