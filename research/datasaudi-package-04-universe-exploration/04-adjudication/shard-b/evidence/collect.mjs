import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(
  "research/datasaudi-package-04-universe-exploration/04-adjudication/shard-b/evidence",
);
const RAW = path.join(ROOT, "raw");
const API = "https://api.datasaudi.sa/tesseract";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const query = (pathname, params = {}) => {
  const url = new URL(pathname, `${API}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url.toString();
};

const schema = (cube) => ({
  id: `schema-${cube}`,
  question_ids: ["P04-013", "P04-015", "P04-016", "P04-017", "P04-018", "P04-019", "P04-020", "P04-021"],
  purpose: `Live public cube schema for ${cube}`,
  url: query(`cubes/${cube}`, { locale: "en" }),
});

const members = (id, questionIds, cube, level, locale = "en", parents = true) => ({
  id,
  question_ids: questionIds,
  purpose: `Live public members for ${cube}/${level} (${locale})`,
  url: query("members.jsonrecords", {
    cube,
    level,
    locale,
    parents: parents ? "true" : "false",
    limit: 5000,
  }),
});

const data = (id, questionIds, cube, drilldowns, measures, extra = {}) => ({
  id,
  question_ids: questionIds,
  purpose: `Live public data replay for ${cube}: ${drilldowns} / ${measures}`,
  url: query("data.jsonrecords", {
    cube,
    drilldowns,
    measures,
    locale: "en",
    limit: 50000,
    ...extra,
  }),
});

const cubes = [
  "gastat_gdp",
  "gastat_inflation",
  "gastat_trade_balance",
  "construction_cost_index_by_sector",
  "consumer_confidence_index",
  "current_account_quarter",
  "gastat_detailed_population",
  "gastat_inflation_province_yoy",
  "sama_pos_cities",
  "sama_bank_credit_month",
  "business_demography_enterprises",
  "foreign_trade",
  "trade_balance_by_country",
  "gastat_rate_gender_nationality_region",
  "sama_water_consumption_region",
  "sama_health_facilities_resources",
  "sama_oil_prices",
  // Cubes substituted by the observed answer in P04-015/P04-018.
  "gastat_gdp_by_main_activities_yearly",
  "gastat_gdp_by_main_activities_quarterly",
  "gastat_inflation_category_yearly",
  "gastat_inflation_province_yearly",
];

const requests = [
  {
    id: "openapi-live",
    question_ids: ["P04-013"],
    purpose: "Live public OpenAPI contract for endpoint and parameter inventory",
    url: "https://api.datasaudi.sa/openapi.json",
  },
  {
    id: "catalog-show-all-en",
    question_ids: ["P04-013", "P04-018", "P04-019"],
    purpose: "Full public cube catalog used for exact crosswalk/mapping-name search",
    url: query("cubes", { show_all: "true", locale: "en" }),
  },
  ...cubes.map(schema),

  members("p017-pop-province-en", ["P04-017"], "gastat_detailed_population", "Geography Province", "en"),
  members("p017-pop-province-ar", ["P04-017"], "gastat_detailed_population", "Geography Province", "ar"),
  members("p017-governorate-en", ["P04-017"], "gastat_detailed_population", "Governatorate", "en"),
  members("p017-governorate-ar", ["P04-017"], "gastat_detailed_population", "Governatorate", "ar"),
  members("p017-inflation-province-en", ["P04-017"], "gastat_inflation_province_yoy", "Province", "en"),
  members("p017-inflation-province-ar", ["P04-017"], "gastat_inflation_province_yoy", "Province", "ar"),

  members("p018-city-en", ["P04-018"], "sama_pos_cities", "City", "en"),
  members("p018-city-ar", ["P04-018"], "sama_pos_cities", "City", "ar"),
  members("p018-target-province-en", ["P04-018"], "gastat_inflation_province_yoy", "Province", "en"),
  members("p018-substituted-province-en", ["P04-018"], "gastat_inflation_province_yearly", "Province", "en"),

  members("p019-gdp-activity", ["P04-019"], "gastat_gdp", "Economic Activity Section", "en"),
  members("p019-bank-isic4", ["P04-019"], "sama_bank_credit_month", "ISIC4", "en"),
  members("p019-demography-sectors", ["P04-019"], "business_demography_enterprises", "Economic Sectors", "en"),

  members("p020-foreign-country", ["P04-020"], "foreign_trade", "Country", "en"),
  members("p020-foreign-hs2", ["P04-020"], "foreign_trade", "HS2", "en"),
  members("p020-foreign-flow", ["P04-020"], "foreign_trade", "Trade Flow", "en"),
  members("p020-balance-country", ["P04-020"], "trade_balance_by_country", "Country", "en"),
  members("p020-balance-hs2", ["P04-020"], "trade_balance_by_country", "HS2", "en"),

  members("p021-pop-year", ["P04-021"], "gastat_detailed_population", "Year", "en"),
  members("p021-rate-year", ["P04-021"], "gastat_rate_gender_nationality_region", "Year", "en"),
  members("p021-rate-quarter", ["P04-021"], "gastat_rate_gender_nationality_region", "Quarter", "en"),
  members("p021-rate-sex", ["P04-021"], "gastat_rate_gender_nationality_region", "Sex", "en"),
  members("p021-rate-nationality", ["P04-021"], "gastat_rate_gender_nationality_region", "Nationality", "en"),
  members("p021-water-year", ["P04-021"], "sama_water_consumption_region", "Year", "en"),
  members("p021-health-year", ["P04-021"], "sama_health_facilities_resources", "Year", "en"),
  members("p021-health-category", ["P04-021"], "sama_health_facilities_resources", "Resource Category", "en"),

  data(
    "p014-month-2025",
    ["P04-014"],
    "gastat_trade_balance",
    "Month",
    "Exports,Imports,Trade Balance",
    { include: "Year:2025" },
  ),
  data(
    "p014-quarter-2025",
    ["P04-014"],
    "gastat_trade_balance",
    "Quarter",
    "Exports,Imports,Trade Balance",
    { include: "Year:2025" },
  ),
  data(
    "p016-construction-full",
    ["P04-016"],
    "construction_cost_index_by_sector",
    "Sector,Month",
    "Construction Cost Index,Construction Cost Index YoY Growth",
  ),
  data(
    "p016-confidence-full",
    ["P04-016"],
    "consumer_confidence_index",
    "Month",
    "Index of Consumer Confidence,Index of Current Economic Conditions",
  ),
  data(
    "p016-current-account-full",
    ["P04-016"],
    "current_account_quarter",
    "Current Account Category,Quarter",
    "Million SAR",
  ),
  data(
    "p020-foreign-latest-three",
    ["P04-020"],
    "foreign_trade",
    "Month,Country,HS2,Trade Flow",
    "Million SAR,Weight TONS",
    { include: "Country:chn;HS2:27;Trade Flow:1,2", time: "Month.latest.3" },
  ),
  data(
    "p020-balance-latest-three",
    ["P04-020"],
    "trade_balance_by_country",
    "Month,Country,HS2",
    "Trade Balance",
    { include: "Country:chn;HS2:27", time: "Month.latest.3" },
  ),
  data(
    "p021-pop-2022",
    ["P04-021"],
    "gastat_detailed_population",
    "Year,Geography Province",
    "Population",
    { include: "Year:2022" },
  ),
  data(
    "p021-rate-2022",
    ["P04-021"],
    "gastat_rate_gender_nationality_region",
    "Year,Province",
    "Unemployment Rate",
    { include: "Year:2022" },
  ),
  data(
    "p021-rate-2022-detailed",
    ["P04-021"],
    "gastat_rate_gender_nationality_region",
    "Year,Province,Sex,Nationality",
    "Unemployment Rate",
    { include: "Year:2022;Province:1,10" },
  ),
  data(
    "p021-water-2022",
    ["P04-021"],
    "sama_water_consumption_region",
    "Year,Province",
    "Thousand cubic meters",
    { include: "Year:2022" },
  ),
  data(
    "p021-health-2022",
    ["P04-021"],
    "sama_health_facilities_resources",
    "Year,Province,Resource Category",
    "Resources",
    { include: "Year:2022" },
  ),
];

await rm(RAW, { recursive: true, force: true });
await mkdir(RAW, { recursive: true });

const manifest = [];
for (const request of requests) {
  const startedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let status = null;
  let finalUrl = request.url;
  let contentType = null;
  let body = "";
  let error = null;
  try {
    const response = await fetch(request.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    status = response.status;
    finalUrl = response.url;
    contentType = response.headers.get("content-type");
    body = await response.text();
  } catch (caught) {
    error = caught instanceof Error ? `${caught.name}: ${caught.message}` : String(caught);
  } finally {
    clearTimeout(timeout);
  }

  const completedAt = new Date().toISOString();
  const bodyPath = path.join(RAW, `${request.id}.body`);
  const metaPath = path.join(RAW, `${request.id}.meta.json`);
  const record = {
    schema_version: "1.0",
    request_id: request.id,
    question_ids: request.question_ids,
    purpose: request.purpose,
    request_url: request.url,
    final_url: finalUrl,
    method: "GET",
    http_status: status,
    content_type: contentType,
    retrieved_at_utc: completedAt,
    started_at_utc: startedAt,
    body_path: path.relative(process.cwd(), bodyPath),
    body_sha256: sha256(body),
    body_bytes: Buffer.byteLength(body),
    error,
  };
  await writeFile(bodyPath, body);
  await writeFile(metaPath, `${JSON.stringify(record, null, 2)}\n`);
  manifest.push(record);
  process.stdout.write(`${request.id}\t${status ?? "ERR"}\t${record.body_sha256}\n`);
  await sleep(75);
}

await writeFile(
  path.join(ROOT, "requests.jsonl"),
  `${manifest.map((record) => JSON.stringify(record)).join("\n")}\n`,
);
await writeFile(
  path.join(ROOT, "run-summary.json"),
  `${JSON.stringify(
    {
      schema_version: "1.0",
      completed_at_utc: new Date().toISOString(),
      request_count: manifest.length,
      http_200_count: manifest.filter((record) => record.http_status === 200).length,
      non_200_count: manifest.filter((record) => record.http_status !== 200).length,
      request_manifest_path: path.relative(process.cwd(), path.join(ROOT, "requests.jsonl")),
      request_manifest_sha256: sha256(
        `${manifest.map((record) => JSON.stringify(record)).join("\n")}\n`,
      ),
    },
    null,
    2,
  )}\n`,
);
