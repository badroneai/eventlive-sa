import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CATALOG_PATH,
  CORPUS_PATH,
  MANIFEST_PATH,
  ORACLE_PATH,
  OUTPUT_DIR,
  ROOT,
  TARGET_FAMILIES,
  deriveScope,
  parseRequestContract,
  readJsonl,
  relativeToRoot,
  selectBestDetailLevel,
  selectFinestTimeLevel,
  selectMeasures,
  sha256,
} from "./common.mjs";

const PAGE_SIZE = 50_000;
const ENDPOINT = "https://api.datasaudi.sa/tesseract/data.jsonrecords";
const responsesDir = path.join(OUTPUT_DIR, "responses");
const pagesDir = path.join(OUTPUT_DIR, "pages");

await Promise.all([
  mkdir(responsesDir, { recursive: true }),
  mkdir(pagesDir, { recursive: true }),
]);

const [catalogBytes, corpusBytes, oracleBytes] = await Promise.all([
  readFile(CATALOG_PATH),
  readFile(CORPUS_PATH),
  readFile(ORACLE_PATH),
]);
const catalog = JSON.parse(catalogBytes.toString("utf8"));
const corpus = await readJsonl(CORPUS_PATH);
const oracleRows = await readJsonl(ORACLE_PATH);
const cubeByName = new Map((catalog.cubes || []).map((cube) => [cube.name, cube]));
const oracleByCube = new Map(oracleRows.map((row) => [row.cube, row]));
const scope = deriveScope(corpus);

if ((catalog.cubes || []).length !== 277) {
  throw new Error(`Catalog boundary changed: expected 277 cubes, saw ${(catalog.cubes || []).length}`);
}
if (scope.cubes.length !== 34) {
  throw new Error(`Candidate cube boundary changed: expected 34, saw ${scope.cubes.length}`);
}

async function writeContentAddressed(directory, bytes, extension = ".json") {
  const digest = sha256(bytes);
  const target = path.join(directory, `${digest}${extension}`);
  try {
    const current = await readFile(target);
    if (sha256(current) !== digest) throw new Error(`Hash collision at ${target}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await writeFile(target, bytes, { flag: "wx" });
  }
  return { digest, target };
}

function requestUrl(cube, drilldowns, measures, offset = 0) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("cube", cube);
  url.searchParams.set("drilldowns", drilldowns.join(","));
  url.searchParams.set("measures", measures.join(","));
  url.searchParams.set("locale", "en");
  url.searchParams.set("limit", `${PAGE_SIZE},${offset}`);
  return url.toString();
}

function priorCandidates(cubeName) {
  const oracle = oracleByCube.get(cubeName);
  if (!oracle) return [];
  const candidates = [...(oracle.prior_replays || [])];
  if (oracle.complete && oracle.request_url && oracle.response_path) {
    candidates.push({
      source_url: null,
      request_url: oracle.request_url,
      response_path: oracle.response_path,
      response_sha256: oracle.response_sha256,
      complete: oracle.complete,
      retrieved_at_utc: oracle.retrieved_at_utc || null,
      evidence_id: oracle.evidence_id || null,
    });
  }
  return candidates;
}

async function inspectPrior(candidate, desiredDrilldowns, desiredMeasures) {
  if (!candidate?.complete || !candidate.request_url || !candidate.response_path) return null;
  const contract = parseRequestContract(candidate.request_url);
  const drilldownCoverage = desiredDrilldowns.every((name) => contract.drilldowns.includes(name));
  const measureCoverage = desiredMeasures.every((name) => contract.measures.includes(name));
  if (!drilldownCoverage || !measureCoverage || contract.measures.length > 3) return null;
  const sourcePath = path.join(ROOT, candidate.response_path);
  let bytes;
  try {
    bytes = await readFile(sourcePath);
  } catch {
    return null;
  }
  if (candidate.response_sha256 && sha256(bytes) !== candidate.response_sha256) return null;
  let payload;
  try {
    payload = JSON.parse(bytes.toString("utf8"));
  } catch {
    return null;
  }
  const rows = Array.isArray(payload.data) ? payload.data.length : -1;
  const total = Number(payload.page?.total);
  const offset = Number(payload.page?.offset || 0);
  if (!Number.isFinite(total) || offset !== 0 || rows !== total) return null;
  const exactDrilldowns =
    contract.drilldowns.length === desiredDrilldowns.length &&
    desiredDrilldowns.every((name) => contract.drilldowns.includes(name));
  const exactMeasures =
    contract.measures.length === desiredMeasures.length &&
    desiredMeasures.every((name) => contract.measures.includes(name));
  return {
    candidate,
    contract,
    bytes,
    payload,
    rows,
    total,
    sourcePath,
    score: (exactDrilldowns ? 100 : 0) + (exactMeasures ? 50 : 0) - contract.drilldowns.length,
  };
}

async function findReusable(cubeName, desiredDrilldowns, desiredMeasures) {
  const inspected = (
    await Promise.all(
      priorCandidates(cubeName).map((candidate) =>
        inspectPrior(candidate, desiredDrilldowns, desiredMeasures),
      ),
    )
  ).filter(Boolean);
  inspected.sort((left, right) => right.score - left.score);
  return inspected[0] || null;
}

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "eventlive-datasaudi-package03c-detail-evidence/1.0",
    },
    signal: AbortSignal.timeout(90_000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  let payload;
  try {
    payload = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${url}: response is not JSON`);
  }
  if (!Array.isArray(payload.data)) throw new Error(`${url}: data is not an array`);
  return { response, bytes, payload };
}

async function fetchComplete(cubeName, drilldowns, measures) {
  const pages = [];
  const allRows = [];
  let firstPayload = null;
  let expectedTotal = null;
  let offset = 0;
  while (expectedTotal === null || offset < expectedTotal) {
    const url = requestUrl(cubeName, drilldowns, measures, offset);
    const { response, bytes, payload } = await fetchPage(url);
    const rows = payload.data.length;
    const total = Number(payload.page?.total);
    const observedOffset = Number(payload.page?.offset || 0);
    if (!Number.isFinite(total)) throw new Error(`${cubeName}: page total is missing`);
    if (observedOffset !== offset) {
      throw new Error(`${cubeName}: requested offset ${offset}, received ${observedOffset}`);
    }
    if (expectedTotal !== null && total !== expectedTotal) {
      throw new Error(`${cubeName}: total changed during pagination (${expectedTotal} -> ${total})`);
    }
    if (rows === 0 && offset < total) throw new Error(`${cubeName}: empty page before total`);
    expectedTotal = total;
    firstPayload ||= payload;
    allRows.push(...payload.data);
    const stored = await writeContentAddressed(pagesDir, bytes);
    pages.push({
      request_url: url,
      http_status: response.status,
      offset,
      requested_limit: PAGE_SIZE,
      rows,
      total,
      response_path: relativeToRoot(stored.target),
      response_sha256: stored.digest,
      response_size_bytes: bytes.length,
    });
    offset += rows;
  }
  if (allRows.length !== expectedTotal) {
    throw new Error(`${cubeName}: incomplete pagination ${allRows.length}/${expectedTotal}`);
  }
  const merged = pages.length === 1
    ? await readFile(path.join(ROOT, pages[0].response_path))
    : Buffer.from(
        JSON.stringify({
          ...firstPayload,
          data: allRows,
          page: { limit: allRows.length, offset: 0, total: expectedTotal },
        }),
      );
  return {
    bytes: merged,
    payload: JSON.parse(merged.toString("utf8")),
    pages,
    rows: allRows.length,
    total: expectedTotal,
    retrieved_at_utc: new Date().toISOString(),
  };
}

const entries = [];
for (const cubeName of scope.cubes) {
  const cube = cubeByName.get(cubeName);
  if (!cube) throw new Error(`Candidate cube missing from catalog: ${cubeName}`);
  const timeLevel = selectFinestTimeLevel(cube);
  const detailLevel = selectBestDetailLevel(cube);
  const measures = selectMeasures(cube);
  if (!timeLevel) throw new Error(`${cubeName}: no time level`);
  if (!measures.length) throw new Error(`${cubeName}: no measures`);
  const drilldownNames = [timeLevel.name, detailLevel?.name].filter(Boolean);
  const measureNames = measures.map((measure) => measure.name);
  const reusable = await findReusable(cubeName, drilldownNames, measureNames);
  let evidence;
  let evidenceMode;
  let reusedFrom = null;
  if (reusable) {
    evidence = {
      bytes: reusable.bytes,
      payload: reusable.payload,
      rows: reusable.rows,
      total: reusable.total,
      retrieved_at_utc:
        reusable.candidate.retrieved_at_utc ||
        (await stat(reusable.sourcePath)).mtime.toISOString(),
      pages: [
        {
          request_url: reusable.candidate.request_url,
          http_status: 200,
          offset: 0,
          requested_limit: reusable.contract.limit || reusable.total,
          rows: reusable.rows,
          total: reusable.total,
          response_path: null,
          response_sha256: sha256(reusable.bytes),
          response_size_bytes: reusable.bytes.length,
        },
      ],
    };
    evidenceMode = "reused-complete-prior-replay";
    reusedFrom = {
      response_path: relativeToRoot(reusable.sourcePath),
      response_sha256: sha256(reusable.bytes),
      request_url: reusable.candidate.request_url,
      evidence_id: reusable.candidate.evidence_id || null,
    };
  } else {
    evidence = await fetchComplete(cubeName, drilldownNames, measureNames);
    evidenceMode = "public-api-live-replay";
  }
  const stored = await writeContentAddressed(responsesDir, evidence.bytes);
  if (evidence.pages.length === 1 && !evidence.pages[0].response_path) {
    evidence.pages[0].response_path = relativeToRoot(stored.target);
  }
  const requestContracts = evidence.pages.map((page) => parseRequestContract(page.request_url));
  entries.push({
    schema_version: "1.0",
    evidence_id: `DETAIL-${sha256(`${cubeName}|${drilldownNames.join(",")}|${measureNames.join(",")}`).slice(0, 24)}`,
    cube: cubeName,
    catalog_table_en: cube.annotations?.table_en || null,
    catalog_table_ar: cube.annotations?.table_ar || null,
    source_name: cube.annotations?.source_name || null,
    source_name_ar: cube.annotations?.source_name_ar || null,
    source_link: cube.annotations?.source_link || null,
    covered_families: TARGET_FAMILIES,
    covered_question_ids: scope.questionsByCube.get(cubeName),
    finest_time_level: timeLevel,
    selected_detail_level: detailLevel,
    selected_measures: measures,
    requested_drilldowns: drilldownNames,
    requested_measures: measureNames,
    evidence_mode: evidenceMode,
    reused_from: reusedFrom,
    request_url: evidence.pages[0].request_url,
    actual_request_drilldowns: requestContracts[0].drilldowns,
    actual_request_measures: requestContracts[0].measures,
    rows: evidence.rows,
    total: evidence.total,
    complete: evidence.rows === evidence.total,
    columns: evidence.payload.columns || [],
    pages: evidence.pages,
    response_path: relativeToRoot(stored.target),
    response_sha256: stored.digest,
    response_size_bytes: evidence.bytes.length,
    retrieved_at_utc: evidence.retrieved_at_utc,
  });
  process.stdout.write(`${cubeName}: ${evidenceMode} ${evidence.rows}/${evidence.total}\n`);
}

const coveredQuestionIds = [...new Set(entries.flatMap((entry) => entry.covered_question_ids))].sort();
const evidenceModes = Object.fromEntries(
  [...new Set(entries.map((entry) => entry.evidence_mode))].map((mode) => [
    mode,
    entries.filter((entry) => entry.evidence_mode === mode).length,
  ]),
);
const manifest = {
  schema_version: "1.0",
  purpose:
    "Full-detail public DataSaudi evidence for every candidate cube used by the direct, rank, and series question families.",
  generated_at_utc: new Date().toISOString(),
  source_files: {
    catalog: {
      path: relativeToRoot(CATALOG_PATH),
      sha256: sha256(catalogBytes),
      cubes: catalog.cubes.length,
    },
    corpus: {
      path: relativeToRoot(CORPUS_PATH),
      sha256: sha256(corpusBytes),
      questions: corpus.length,
    },
    oracle: {
      path: relativeToRoot(ORACLE_PATH),
      sha256: sha256(oracleBytes),
      rows: oracleRows.length,
    },
  },
  scope: {
    families: TARGET_FAMILIES,
    questions: scope.questions.length,
    candidate_backed_questions: scope.candidateBackedQuestions.length,
    contract_only_questions: scope.contractOnlyQuestions.length,
    contract_only_question_ids: scope.contractOnlyQuestions
      .map((question) => question.question_id)
      .sort(),
    covered_questions: coveredQuestionIds.length,
    candidate_cubes: scope.cubes.length,
    cube_names: scope.cubes,
  },
  counts: {
    entries: entries.length,
    complete: entries.filter((entry) => entry.complete).length,
    evidence_modes: evidenceModes,
    total_rows: entries.reduce((sum, entry) => sum + entry.rows, 0),
    pages: entries.reduce((sum, entry) => sum + entry.pages.length, 0),
  },
  integrity: {
    entries_sha256: sha256(JSON.stringify(entries)),
    response_set_sha256: sha256(
      entries.map((entry) => `${entry.cube}\t${entry.response_sha256}`).join("\n"),
    ),
  },
  complete: entries.length === 34 && entries.every((entry) => entry.complete),
  entries,
};

await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
const referencedPaths = new Set(
  entries.flatMap((entry) => [
    entry.response_path,
    ...entry.pages.map((page) => page.response_path),
  ]),
);
let prunedOrphans = 0;
for (const directory of [responsesDir, pagesDir]) {
  for (const name of await readdir(directory)) {
    const filePath = path.join(directory, name);
    if (referencedPaths.has(relativeToRoot(filePath))) continue;
    await unlink(filePath);
    prunedOrphans += 1;
  }
}
console.log(
  JSON.stringify({
    manifest: relativeToRoot(MANIFEST_PATH),
    entries: entries.length,
    questions: coveredQuestionIds.length,
    contract_only_questions: scope.contractOnlyQuestions.length,
    complete: manifest.complete,
    evidence_modes: evidenceModes,
    rows: manifest.counts.total_rows,
    pruned_orphans: prunedOrphans,
  }),
);
