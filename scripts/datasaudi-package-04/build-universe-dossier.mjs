import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PACKAGE_ROOT = path.join(ROOT, "research/datasaudi-package-04-universe-exploration");
const OUTPUT_ROOT = path.join(PACKAGE_ROOT, "05-universe-dossier");
const EVIDENCE_ROOT = path.join(OUTPUT_ROOT, "evidence");
const API_ROOT = "https://api.datasaudi.sa/tesseract";
const USER_AGENT = "eventlive-datasaudi-universe-research/1.0";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function asBoolean(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function splitRequired(value) {
  if (!value) return [];
  return String(value).split(/[,;|]/).map(item => item.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function percent(numerator, denominator) {
  return denominator ? Number((100 * numerator / denominator).toFixed(2)) : 0;
}

function encodeQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") query.set(key, String(value));
  }
  return query.toString();
}

async function fetchEvidence(url, family, id) {
  const response = await fetch(url, { headers: { accept: "application/json", "user-agent": USER_AGENT } });
  const body = Buffer.from(await response.arrayBuffer());
  const hash = sha256(body);
  const safeId = String(id).replaceAll(/[^a-zA-Z0-9_.-]/g, "_");
  const directory = path.join(EVIDENCE_ROOT, family);
  await mkdir(directory, { recursive: true });
  const responsePath = path.join(directory, `${safeId}-${hash}.json`);
  await writeFile(responsePath, body);
  let json = null;
  try { json = JSON.parse(body.toString("utf8")); } catch {}
  return {
    ok: response.ok,
    status: response.status,
    url,
    captured_at_utc: nowIso(),
    bytes: body.length,
    sha256: hash,
    response_path: path.relative(ROOT, responsePath),
    json
  };
}

async function mapPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function timeRank(name) {
  const value = String(name).toLowerCase();
  if (value.includes("day") || value.includes("date")) return 4;
  if (value.includes("month")) return 3;
  if (value.includes("quarter")) return 2;
  if (value.includes("year")) return 1;
  return 0;
}

function frequencyFor(levelName) {
  const value = String(levelName || "").toLowerCase();
  if (value.includes("day") || value.includes("date")) return "daily";
  if (value.includes("month")) return "monthly";
  if (value.includes("quarter")) return "quarterly";
  if (value.includes("year")) return "annual";
  return levelName ? "other" : "none";
}

await mkdir(OUTPUT_ROOT, { recursive: true });
await rm(EVIDENCE_ROOT, { recursive: true, force: true });
await mkdir(EVIDENCE_ROOT, { recursive: true });

const capturedAt = nowIso();
const [catalogEnEvidence, catalogArEvidence] = await Promise.all([
  fetchEvidence(`${API_ROOT}/cubes?show_all=true&locale=en`, "catalog", "catalog-en"),
  fetchEvidence(`${API_ROOT}/cubes?show_all=true&locale=ar`, "catalog", "catalog-ar")
]);
if (!catalogEnEvidence.ok || !catalogArEvidence.ok) throw new Error("Catalog retrieval failed");

const cubesEn = catalogEnEvidence.json.cubes;
const cubesAr = catalogArEvidence.json.cubes;
const arByName = new Map(cubesAr.map(cube => [cube.name, cube]));
const primaryCatalog = JSON.parse(await readFile(path.join(PACKAGE_ROOT, "01-surface-recon/current-catalog.json"), "utf8"));
const primaryTopicByCube = new Map();
for (const topic of primaryCatalog.primary_topics) {
  for (const cube of topic.cubes) primaryTopicByCube.set(cube, topic.topic_ar);
}
const auxiliary = new Set((primaryCatalog.auxiliary_or_non_primary_cubes || []).map(item => item.name));

const priorCorpusPath = path.join(ROOT, "research/datasaudi-insaights/04-question-corpus/questions.jsonl");
const priorCorpus = (await readFile(priorCorpusPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
const priorCandidateCubes = new Set(priorCorpus.flatMap(question => question.candidate_cubes || []));
const p03cMapPath = path.join(ROOT, "research/datasaudi-package-03c-full-closure/p0-plan/question-source-contract-map.jsonl");
const p03cMap = (await readFile(p03cMapPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
const p03cLedgerPath = path.join(ROOT, "research/datasaudi-package-03c-full-closure/03-answer-ledger/full-answer-ledger.jsonl");
const p03cLedger = (await readFile(p03cLedgerPath, "utf8")).split("\n").filter(Boolean).map(line => JSON.parse(line));
const p03cSelectedCubes = new Set([
  ...p03cMap.flatMap(item => item.selected_cube_ids || []),
  ...p03cLedger.flatMap(item => (item.provenance || []).map(source => source.cube).filter(Boolean))
]);
const p04Prompts = (await readFile(path.join(PACKAGE_ROOT, "02-live-campaign/prompts.jsonl"), "utf8"))
  .split("\n").filter(Boolean).map(line => JSON.parse(line));
const cubeNames = new Set(cubesEn.map(cube => cube.name));
const p04TargetedCubes = new Set();
for (const question of p04Prompts) {
  for (const cube of cubeNames) {
    if (question.prompt.includes(cube)) p04TargetedCubes.add(cube);
  }
}

const dossiers = cubesEn.map(cube => {
  const cubeAr = arByName.get(cube.name) || {};
  const dimensions = cube.dimensions || [];
  const levels = dimensions.flatMap(dimension => (dimension.hierarchies || []).flatMap(hierarchy =>
    (hierarchy.levels || []).map(level => ({
      dimension_name: dimension.name,
      dimension_caption_en: dimension.caption || dimension.name,
      dimension_type: dimension.type || "standard",
      hierarchy_name: hierarchy.name,
      hierarchy_caption_en: hierarchy.caption || hierarchy.name,
      level_name: level.name,
      level_caption_en: level.caption || level.name,
      annotations: level.annotations || {}
    }))));
  const timeLevels = levels.filter(level => level.dimension_type === "time").sort((left, right) => timeRank(right.level_name) - timeRank(left.level_name));
  const finestTime = timeLevels[0] || null;
  const annotations = cube.annotations || {};
  return {
    schema_version: "1.0",
    cube_id: cube.name,
    primary_catalog: primaryTopicByCube.has(cube.name),
    auxiliary_catalog: auxiliary.has(cube.name) || !primaryTopicByCube.has(cube.name),
    topic_ar: primaryTopicByCube.get(cube.name) || annotations.topic_ar || null,
    topic_en: annotations.topic_en || null,
    subtopic_ar: annotations.subtopic_ar || null,
    subtopic_en: annotations.subtopic_en || null,
    table_ar: annotations.table_ar || cubeAr.caption || null,
    table_en: annotations.table_en || cube.caption || null,
    source_name: annotations.source_name || null,
    source_name_ar: annotations.source_name_ar || null,
    source_link: annotations.source_link || null,
    source_direct: Boolean(annotations.source_link),
    hide_in_ui: asBoolean(annotations.hide_in_ui),
    required_dimensions: splitRequired(annotations.required_dimensions),
    dimensions_count: dimensions.length,
    hierarchies_count: dimensions.reduce((sum, dimension) => sum + (dimension.hierarchies || []).length, 0),
    levels_count: levels.length,
    measures_count: (cube.measures || []).length,
    time: {
      has_time_dimension: timeLevels.length > 0,
      finest_level: finestTime?.level_name || null,
      finest_frequency: frequencyFor(finestTime?.level_name),
      levels: timeLevels.map(level => level.level_name)
    },
    semantic_flags: {
      prior_267_candidate_covered: priorCandidateCubes.has(cube.name),
      p03c_selected_cube: p03cSelectedCubes.has(cube.name),
      p04_vertical_probe_target: p04TargetedCubes.has(cube.name)
    },
    rights: {
      exact_dataset_license_declared_in_catalog: false,
      commercial_reuse_status: "UNRESOLVED"
    }
  };
});

const dossierByCube = new Map(dossiers.map(item => [item.cube_id, item]));
const timeTargets = dossiers.filter(item => item.time.has_time_dimension);
const timeResults = await mapPool(timeTargets, 4, async dossier => {
  const url = `${API_ROOT}/members?${encodeQuery({ cube: dossier.cube_id, level: dossier.time.finest_level, locale: "en" })}`;
  try {
    const evidence = await fetchEvidence(url, "time-members", dossier.cube_id);
    const members = evidence.json?.members || [];
    return {
      cube_id: dossier.cube_id,
      status: evidence.ok ? "OK" : "HTTP_ERROR",
      level: dossier.time.finest_level,
      frequency: dossier.time.finest_frequency,
      members_count: members.length,
      earliest: members[0] || null,
      latest: members.at(-1) || null,
      evidence: { request_url: url, response_path: evidence.response_path, response_sha256: evidence.sha256, http_status: evidence.status }
    };
  } catch (error) {
    return { cube_id: dossier.cube_id, status: "TRANSPORT_ERROR", error: error.message, level: dossier.time.finest_level, frequency: dossier.time.finest_frequency, members_count: 0, earliest: null, latest: null, evidence: { request_url: url } };
  }
});
for (const result of timeResults) dossierByCube.get(result.cube_id).time.member_probe = result;
for (const dossier of dossiers.filter(item => !item.time.has_time_dimension)) {
  dossier.time.member_probe = { cube_id: dossier.cube_id, status: "NO_TIME_DIMENSION", level: null, frequency: "none", members_count: 0, earliest: null, latest: null, evidence: null };
}

const dataResults = await mapPool(dossiers, 4, async dossier => {
  const cube = cubesEn.find(item => item.name === dossier.cube_id);
  const dimensionContracts = (cube.dimensions || []).map(dimension => ({
    name: dimension.name,
    type: dimension.type || "standard",
    hierarchies: (dimension.hierarchies || []).map(hierarchy => ({
      name: hierarchy.name,
      levels: (hierarchy.levels || []).map(level => level.name)
    }))
  }));
  const allLevels = dimensionContracts.flatMap(dimension => dimension.hierarchies.flatMap(hierarchy => hierarchy.levels));
  const resolveRequired = required => {
    for (const dimension of dimensionContracts) {
      if (dimension.name === required) {
        const sameNameHierarchy = dimension.hierarchies.find(hierarchy => hierarchy.name === required);
        if (sameNameHierarchy) return sameNameHierarchy.levels.at(-1);
        const levels = dimension.hierarchies.flatMap(hierarchy => hierarchy.levels);
        return dimension.type === "time"
          ? [...levels].sort((left, right) => timeRank(right) - timeRank(left))[0]
          : levels.at(-1);
      }
      for (const hierarchy of dimension.hierarchies) {
        if (hierarchy.name === required) return hierarchy.levels.at(-1);
        if (hierarchy.levels.includes(required)) return required;
        const compoundLevel = hierarchy.levels.find(level => required === `${hierarchy.name} ${level}`);
        if (compoundLevel) return compoundLevel;
      }
    }
    return required;
  };
  const requiredDrilldowns = dossier.required_dimensions.map(resolveRequired).filter(Boolean);
  const selectedHasTime = requiredDrilldowns.some(level => dimensionContracts.some(dimension => dimension.type === "time" && dimension.hierarchies.some(hierarchy => hierarchy.levels.includes(level))));
  const drilldowns = unique([
    ...requiredDrilldowns,
    selectedHasTime ? null : dossier.time.finest_level || allLevels[0]
  ].filter(Boolean));
  const measure = cube.measures?.[0]?.name || null;
  if (!measure) return { cube_id: dossier.cube_id, status: "NO_MEASURE", page_total: null, rows_returned: 0, evidence: null };
  const url = `${API_ROOT}/data.jsonrecords?${encodeQuery({ cube: dossier.cube_id, locale: "en", drilldowns: drilldowns.join(","), measures: measure, limit: "1,0" })}`;
  try {
    const evidence = await fetchEvidence(url, "data-samples", dossier.cube_id);
    const rows = evidence.json?.data || [];
    return {
      cube_id: dossier.cube_id,
      status: evidence.ok ? (rows.length ? "DATA_RETURNED" : "EMPTY") : "HTTP_ERROR",
      drilldowns,
      measure,
      page_total: evidence.json?.page?.total ?? null,
      rows_returned: rows.length,
      sample_row: rows[0] || null,
      evidence: { request_url: url, response_path: evidence.response_path, response_sha256: evidence.sha256, http_status: evidence.status }
    };
  } catch (error) {
    return { cube_id: dossier.cube_id, status: "TRANSPORT_ERROR", drilldowns, measure, page_total: null, rows_returned: 0, sample_row: null, error: error.message, evidence: { request_url: url } };
  }
});
for (const result of dataResults) dossierByCube.get(result.cube_id).data_probe = result;

const dimensions = [];
const levels = [];
const measures = [];
for (const cube of cubesEn) {
  const cubeAr = arByName.get(cube.name) || {};
  const arDimensions = new Map((cubeAr.dimensions || []).map(item => [item.name, item]));
  for (const dimension of cube.dimensions || []) {
    const dimensionAr = arDimensions.get(dimension.name) || {};
    dimensions.push({
      schema_version: "1.0",
      cube_id: cube.name,
      dimension_name: dimension.name,
      caption_en: dimension.caption || dimension.name,
      caption_ar: dimensionAr.caption || null,
      type: dimension.type || "standard",
      annotations: dimension.annotations || {},
      hierarchies_count: (dimension.hierarchies || []).length
    });
    const arHierarchies = new Map((dimensionAr.hierarchies || []).map(item => [item.name, item]));
    for (const hierarchy of dimension.hierarchies || []) {
      const hierarchyAr = arHierarchies.get(hierarchy.name) || {};
      const arLevels = new Map((hierarchyAr.levels || []).map(item => [item.name, item]));
      for (const level of hierarchy.levels || []) {
        levels.push({
          schema_version: "1.0",
          cube_id: cube.name,
          dimension_name: dimension.name,
          dimension_type: dimension.type || "standard",
          hierarchy_name: hierarchy.name,
          hierarchy_caption_en: hierarchy.caption || hierarchy.name,
          hierarchy_caption_ar: hierarchyAr.caption || null,
          level_name: level.name,
          level_caption_en: level.caption || level.name,
          level_caption_ar: arLevels.get(level.name)?.caption || null,
          annotations: level.annotations || {},
          excludes_members: Boolean(level.annotations?.vb_exclude_members)
        });
      }
    }
  }
  const arMeasures = new Map((cubeAr.measures || []).map(item => [item.name, item]));
  for (const measure of cube.measures || []) {
    measures.push({
      schema_version: "1.0",
      cube_id: cube.name,
      measure_name: measure.name,
      caption_en: measure.caption || measure.name,
      caption_ar: arMeasures.get(measure.name)?.caption || null,
      aggregator: measure.aggregator || null,
      unit: measure.annotations?.units_of_measurement || null,
      annotations: measure.annotations || {},
      aggregation_safety: ["sum", "average", "min", "max", "count"].includes(String(measure.aggregator || "").toLowerCase()) ? "DECLARED_AGGREGATOR" : "REVIEW_REQUIRED"
    });
  }
}

const compatibility = [];
for (let leftIndex = 0; leftIndex < dossiers.length; leftIndex += 1) {
  const left = dossiers[leftIndex];
  const leftLevels = new Set(levels.filter(item => item.cube_id === left.cube_id).map(item => item.level_name));
  for (let rightIndex = leftIndex + 1; rightIndex < dossiers.length; rightIndex += 1) {
    const right = dossiers[rightIndex];
    const sharedLevels = unique(levels.filter(item => item.cube_id === right.cube_id && leftLevels.has(item.level_name)).map(item => item.level_name));
    if (sharedLevels.length < 2) continue;
    const sharedTime = left.time.finest_frequency !== "none" && left.time.finest_frequency === right.time.finest_frequency;
    compatibility.push({
      schema_version: "1.0",
      left_cube: left.cube_id,
      right_cube: right.cube_id,
      shared_level_names: sharedLevels,
      shared_level_count: sharedLevels.length,
      same_finest_frequency: sharedTime,
      verdict: "CANDIDATE_ONLY_REQUIRES_MEMBER_KEY_AND_GRAIN_REVIEW",
      safe_join_proven: false
    });
  }
}

const writeJsonl = async (filePath, rows) => writeFile(filePath, rows.map(row => JSON.stringify(row)).join("\n") + "\n");
await Promise.all([
  writeJsonl(path.join(OUTPUT_ROOT, "cube-dossiers.jsonl"), dossiers),
  writeJsonl(path.join(OUTPUT_ROOT, "dimensions.jsonl"), dimensions),
  writeJsonl(path.join(OUTPUT_ROOT, "levels.jsonl"), levels),
  writeJsonl(path.join(OUTPUT_ROOT, "measures.jsonl"), measures),
  writeJsonl(path.join(OUTPUT_ROOT, "compatibility-candidates.jsonl"), compatibility)
]);

const dataStatusCounts = Object.fromEntries(Object.entries(Object.groupBy(dataResults, item => item.status)).map(([key, values]) => [key, values.length]));
const summary = {
  schema_version: "1.0",
  generated_at_utc: nowIso(),
  catalog_captured_at_utc: capturedAt,
  mode: "PUBLIC_API_UNIVERSE_CENSUS",
  counts: {
    cubes: dossiers.length,
    primary_cubes: dossiers.filter(item => item.primary_catalog).length,
    auxiliary_cubes: dossiers.filter(item => item.auxiliary_catalog).length,
    hidden_in_ui_cubes: dossiers.filter(item => item.hide_in_ui).length,
    dimensions: dimensions.length,
    hierarchies: dossiers.reduce((sum, item) => sum + item.hierarchies_count, 0),
    levels: levels.length,
    measures: measures.length,
    excluded_member_levels: levels.filter(item => item.excludes_members).length,
    time_member_probes: timeResults.length,
    time_member_probe_ok: timeResults.filter(item => item.status === "OK").length,
    data_probes: dataResults.length,
    data_statuses: dataStatusCounts,
    compatibility_candidates: compatibility.length
  },
  semantic_coverage: {
    prior_candidate_cubes: priorCandidateCubes.size,
    prior_candidate_cube_percent: percent(priorCandidateCubes.size, dossiers.length),
    p03c_selected_cubes: p03cSelectedCubes.size,
    p03c_selected_cube_percent: percent(p03cSelectedCubes.size, dossiers.length),
    p04_targeted_cubes: p04TargetedCubes.size,
    p04_targeted_cube_percent: percent(p04TargetedCubes.size, dossiers.length),
    api_dossiers: dossiers.length,
    api_dossier_percent: percent(dossiers.length, dossiers.length)
  },
  catalog_evidence: {
    en: { url: catalogEnEvidence.url, response_path: catalogEnEvidence.response_path, sha256: catalogEnEvidence.sha256, bytes: catalogEnEvidence.bytes },
    ar: { url: catalogArEvidence.url, response_path: catalogArEvidence.response_path, sha256: catalogArEvidence.sha256, bytes: catalogArEvidence.bytes }
  },
  boundaries: [
    "API dossier coverage is not live INSAIGHTS answer coverage.",
    "Compatibility candidates are schema-level leads, not proven joins.",
    "Public access does not establish an exact dataset license or commercial reuse right.",
    "A returned sample row does not prove freshness beyond the recorded latest time member."
  ]
};
await writeFile(path.join(OUTPUT_ROOT, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
