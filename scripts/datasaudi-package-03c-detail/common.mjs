import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const ROOT = process.cwd();
export const CATALOG_PATH = path.join(
  ROOT,
  "research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cubes-show-all-true.json",
);
export const CORPUS_PATH = path.join(
  ROOT,
  "research/datasaudi-insaights/04-question-corpus/questions.jsonl",
);
export const ORACLE_PATH = path.join(
  ROOT,
  "research/datasaudi-package-03/02-source-oracle-and-evidence-vault/oracle-evidence.jsonl",
);
export const OUTPUT_DIR = path.join(
  ROOT,
  "research/datasaudi-package-03c-full-closure/02-catalog-discovery/detail-evidence",
);
export const MANIFEST_PATH = path.join(OUTPUT_DIR, "detail-evidence-manifest.json");
export const VALIDATION_PATH = path.join(OUTPUT_DIR, "validation.json");
export const TARGET_FAMILIES = Object.freeze(["direct", "rank", "series"]);

const TIME_SCALE_SCORE = Object.freeze({
  year: 10,
  quarter: 20,
  month: 30,
  week: 40,
  day: 50,
  hour: 60,
  minute: 70,
  second: 80,
});

const GEO_RE = /(?:geograph|province|govern|city|country|region|subregion|municip|nation|continent)/i;
const CATEGORY_RE = /(?:activity|sector|category|class|classification|status|type|sex|gender|nationality|age|division|section|usage|isic|hs\d|accommodation)/i;
const AGGREGATE_RE = /(?:grand total|\btotal\b|\bnation\b|\bcontinent\b|\bacc\b)/i;

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function readJsonl(filePath) {
  const raw = await readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/u)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

export function relativeToRoot(filePath) {
  return path.relative(ROOT, filePath);
}

export function allLevels(cube) {
  return (cube.dimensions || []).flatMap((dimension) =>
    (dimension.hierarchies || []).flatMap((hierarchy) =>
      (hierarchy.levels || []).map((level) => ({
        dimension: dimension.name,
        dimension_type: dimension.type || "standard",
        hierarchy: hierarchy.name,
        name: level.name,
        caption: level.caption || null,
        depth: Number(level.depth || 0),
        time_scale: level.time_scale || null,
      })),
    ),
  );
}

export function selectFinestTimeLevel(cube) {
  const candidates = allLevels(cube).filter(
    (level) => level.dimension_type === "time" || level.time_scale,
  );
  candidates.sort((left, right) => {
    const scoreDelta =
      (TIME_SCALE_SCORE[right.time_scale] || 0) -
      (TIME_SCALE_SCORE[left.time_scale] || 0);
    if (scoreDelta) return scoreDelta;
    if (right.depth !== left.depth) return right.depth - left.depth;
    return left.name.localeCompare(right.name, "en");
  });
  return candidates[0] || null;
}

function normalizedTokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, " ")
      .split(/\s+/u)
      .filter((token) => token.length >= 3),
  );
}

function semanticOverlap(level, cube) {
  const tableTokens = normalizedTokens(
    `${cube.annotations?.table_en || ""} ${cube.name || ""}`,
  );
  const levelTokens = normalizedTokens(
    `${level.dimension} ${level.hierarchy} ${level.name} ${level.caption || ""}`,
  );
  let overlap = 0;
  for (const token of levelTokens) {
    if (tableTokens.has(token)) overlap += 1;
  }
  return overlap;
}

export function hierarchyScore(level, cube) {
  const text = `${level.dimension} ${level.hierarchy} ${level.name} ${level.caption || ""}`;
  const isGeo = level.dimension_type === "geo" || GEO_RE.test(text);
  let score = isGeo ? 1_000 : 100;
  if (!isGeo && CATEGORY_RE.test(text)) score += 160;
  if (/(?:govern|city|country|province|subregion|municip)/i.test(text)) score += 140;
  score += semanticOverlap(level, cube) * 35;
  score += level.depth * 12;
  if (AGGREGATE_RE.test(`${level.name} ${level.hierarchy}`)) score -= 220;
  return score;
}

export function selectBestDetailLevel(cube) {
  const candidates = allLevels(cube).filter(
    (level) => level.dimension_type !== "time" && !level.time_scale,
  );
  candidates.sort((left, right) => {
    const scoreDelta = hierarchyScore(right, cube) - hierarchyScore(left, cube);
    if (scoreDelta) return scoreDelta;
    if (right.depth !== left.depth) return right.depth - left.depth;
    return left.name.localeCompare(right.name, "en");
  });
  return candidates[0] || null;
}

export function selectMeasures(cube) {
  return (cube.measures || [])
    .filter((measure) => typeof measure.name === "string" && measure.name.trim())
    .slice(0, 3)
    .map((measure) => ({
      name: measure.name,
      caption: measure.caption || null,
      unit: measure.annotations?.units_of_measurement || null,
    }));
}

export function deriveScope(corpus) {
  const familySet = new Set(TARGET_FAMILIES);
  const questions = corpus.filter((question) => familySet.has(question.family));
  const candidateBackedQuestions = questions.filter(
    (question) => (question.candidate_cubes || []).length > 0,
  );
  const contractOnlyQuestions = questions.filter(
    (question) => (question.candidate_cubes || []).length === 0,
  );
  const cubes = [...new Set(questions.flatMap((question) => question.candidate_cubes || []))].sort();
  const questionsByCube = new Map(
    cubes.map((cube) => [
      cube,
      questions
        .filter((question) => (question.candidate_cubes || []).includes(cube))
        .map((question) => question.question_id)
        .sort(),
    ]),
  );
  return { questions, candidateBackedQuestions, contractOnlyQuestions, cubes, questionsByCube };
}

export function parseRequestContract(requestUrl) {
  const url = new URL(requestUrl);
  const csv = (name) =>
    (url.searchParams.get(name) || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  const [limitValue, offsetValue] = (url.searchParams.get("limit") || "").split(",");
  return {
    cube: url.searchParams.get("cube"),
    drilldowns: csv("drilldowns"),
    measures: csv("measures"),
    locale: url.searchParams.get("locale") || null,
    limit: Number(limitValue || 0),
    offset: Number(offsetValue || 0),
  };
}
