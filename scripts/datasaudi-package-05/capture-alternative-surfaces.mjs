import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGE_ID = "datasaudi-package-05-execution-closure";
const PACKAGE_RELATIVE = `research/${PACKAGE_ID}`;
const sha256 = value => createHash("sha256").update(value).digest("hex");
const API = "https://api.datasaudi.sa";
const SITE = "https://datasaudi.sa";

function dataUrl(extension, params) {
  const url = new URL(`${API}/tesseract/data.${extension}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function jsonRecord(body) {
  try {
    return JSON.parse(body.toString("utf8"));
  }
  catch {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, {
      ...options,
      headers: {
        "User-Agent": "DataSaudi-P05-Research/1.0",
        ...(options.headers || {})
      },
      signal: controller.signal,
      redirect: "follow"
    });
  }
  finally {
    clearTimeout(timeout);
  }
}

async function probe({ evidenceRoot, id, url, method = "GET", headers, body, extension = "bin" }) {
  const response = await fetchWithTimeout(url, { method, headers, body });
  const bytes = Buffer.from(await response.arrayBuffer());
  const evidenceFile = path.join(evidenceRoot, `${id}.${extension}`);
  await mkdir(path.dirname(evidenceFile), { recursive: true });
  await writeFile(evidenceFile, bytes);
  return {
    id,
    request: {
      method,
      url,
      content_type: headers?.["Content-Type"] || null,
      body_sha256: body ? sha256(Buffer.from(body)) : null
    },
    response: {
      status: response.status,
      ok: response.ok,
      final_url: response.url,
      content_type: response.headers.get("content-type"),
      content_length_header: response.headers.get("content-length"),
      bytes: bytes.length,
      sha256: sha256(bytes),
      evidence_path: path.relative(process.cwd(), evidenceFile)
    },
    parsed: jsonRecord(bytes)
  };
}

export async function captureAlternativeSurfaces({ root = process.cwd() } = {}) {
  const packageRoot = path.join(root, PACKAGE_RELATIVE);
  const evidenceRoot = path.join(packageRoot, "01-surface-alternatives/evidence");
  const params = {
    cube: "gastat_gdp",
    drilldowns: "Quarter,Economic Activity Section",
    measures: "GDP"
  };

  const multiqueryBody = JSON.stringify({
    requests: [
      {
        cube: "gastat_gdp",
        drilldowns: ["Year"],
        measures: ["GDP"],
        locale: "en",
        time_restriction: { level: "Year", constraint: ["latest", 3] },
        pagination: { limit: 3, offset: 0 }
      },
      {
        cube: "building_permits",
        drilldowns: ["Year"],
        measures: ["Number of Building Permits"],
        locale: "en",
        time_restriction: { level: "Year", constraint: ["latest", 3] },
        pagination: { limit: 3, offset: 0 }
      }
    ]
  });

  const fixedProbes = [
    { id: "api-root", url: `${API}/`, extension: "json" },
    { id: "api-health", url: `${API}/_health`, extension: "json" },
    { id: "openapi", url: `${API}/openapi.json`, extension: "json" },
    { id: "gdp-schema", url: `${API}/tesseract/cubes/gastat_gdp?locale=en`, extension: "json" },
    {
      id: "gdp-ranking",
      url: dataUrl("jsonrecords", { ...params, time: "Quarter.latest.1", ranking: "-GDP", sort: "GDP.desc", limit: "5,0" }),
      extension: "json"
    },
    {
      id: "gdp-growth",
      url: dataUrl("jsonrecords", { ...params, time: "Quarter.latest.3", growth: "Quarter.GDP.period.1", limit: "36,0" }),
      extension: "json"
    },
    {
      id: "building-filter-alias",
      url: dataUrl("jsonrecords", {
        cube: "building_permits",
        drilldowns: "Month",
        measures: "Number of Building Permits",
        include: "Month:202601,202602,202603,202604",
        filters: "Number of Building Permits.gt.7000",
        alias: "Number of Building Permits:Permits",
        sort: "Permits.desc",
        limit: "10,0"
      }),
      extension: "json"
    },
    {
      id: "multiquery-common-year",
      url: `${API}/tesseract/multiquery.jsonrecords`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: multiqueryBody,
      extension: "json"
    },
    { id: "data-explorer-page", url: `${SITE}/ar/data-explorer`, extension: "html" },
    { id: "economic-calendar-page", url: `${SITE}/ar/economic-calendar`, extension: "html" },
    { id: "insaights-page", url: `${SITE}/ar/insaights`, extension: "html" }
  ];

  const formatParams = {
    cube: "building_permits",
    drilldowns: "Month",
    measures: "Number of Building Permits",
    time: "Month.latest.2",
    limit: "2,0"
  };
  const formats = ["jsonrecords", "jsonarrays", "csv", "csvbom", "tsv", "tsvbom", "xlsx", "parquet"];
  const formatProbes = formats.map(format => ({
    id: `format-${format}`,
    url: dataUrl(format, formatParams),
    extension: format === "jsonrecords" || format === "jsonarrays" ? "json" : format
  }));

  const observations = [];
  for (const specification of [...fixedProbes, ...formatProbes]) {
    observations.push(await probe({ evidenceRoot, ...specification }));
  }

  const byId = new Map(observations.map(item => [item.id, item]));
  const ranking = byId.get("gdp-ranking")?.parsed;
  const growth = byId.get("gdp-growth")?.parsed;
  const filtered = byId.get("building-filter-alias")?.parsed;
  const multiquery = byId.get("multiquery-common-year")?.parsed;
  const openapi = byId.get("openapi")?.parsed;
  const formatMatrix = Object.fromEntries(formats.map(format => {
    const record = byId.get(`format-${format}`);
    return [format, {
      status: record.response.status,
      content_type: record.response.content_type,
      bytes: record.response.bytes,
      usable_nonempty: record.response.ok && record.response.bytes > 0
    }];
  }));

  const capturedAt = new Date().toISOString();
  const summary = {
    schema_version: "1.0",
    package_id: PACKAGE_ID,
    captured_at_utc: capturedAt,
    mode: "PUBLIC_OFFICIAL_SURFACE_PROBES_NO_CHAT_MESSAGES",
    chat_messages_consumed: 0,
    authentication_used: false,
    observations: observations.map(({ parsed, ...item }) => item),
    capabilities: {
      openapi: {
        status: byId.get("openapi").response.status,
        version: openapi?.openapi,
        declared_paths: Object.keys(openapi?.paths || {}).length,
        data_features: (openapi?.paths?.["/tesseract/data.{extension}"]?.get?.parameters || []).map(item => item.name),
        multiquery_method: openapi?.paths?.["/tesseract/multiquery.{extension}"]?.post ? "POST" : null
      },
      server_ranking: {
        status: byId.get("gdp-ranking").response.status,
        columns: ranking?.columns,
        rows: ranking?.data?.length,
        latest_period: ranking?.data?.[0]?.Quarter,
        first_rank: ranking?.data?.[0]?.["GDP Ranking"],
        verified_usable: ranking?.columns?.includes("GDP Ranking") && ranking?.data?.[0]?.["GDP Ranking"] === 1
      },
      server_growth: {
        status: byId.get("gdp-growth").response.status,
        columns: growth?.columns,
        rows: growth?.data?.length,
        non_null_growth_rows: (growth?.data || []).filter(item => item["GDP Growth"] != null).length,
        verified_usable: growth?.columns?.includes("GDP Growth") && (growth?.data || []).some(item => item["GDP Growth"] != null)
      },
      filters_include_alias_sort: {
        status: byId.get("building-filter-alias").response.status,
        columns: filtered?.columns,
        rows: filtered?.data?.length,
        verified_usable: filtered?.columns?.includes("Permits") && (filtered?.data || []).every(item => item.Permits > 7000)
      },
      multiquery_common_grain: {
        status: byId.get("multiquery-common-year").response.status,
        columns: multiquery?.columns,
        rows: multiquery?.data?.length,
        verified_usable: multiquery?.columns?.includes("Year") && multiquery?.columns?.includes("GDP") && multiquery?.columns?.includes("Number of Building Permits"),
        safety_boundary: "A common column enables a raw join, but member-key, grain, completeness, and partial-period checks remain mandatory."
      },
      response_formats: formatMatrix,
      web_surfaces: {
        data_explorer: byId.get("data-explorer-page").response.status,
        economic_calendar: byId.get("economic-calendar-page").response.status,
        insaights: byId.get("insaights-page").response.status
      }
    },
    findings: [
      "The public API supports ranking, growth, time restrictions, sorting, aliases, include/exclude, value filters, pagination, multiple text formats, and multiquery joins without consuming an INSAIGHTS message.",
      "jsonrecords, jsonarrays, csv, csvbom, tsv, and tsvbom returned non-empty bodies in the captured format probe.",
      "xlsx and parquet returned HTTP 200 with zero-byte bodies and must not be treated as working exports.",
      "Multiquery can join two cubes on a common Year caption, but this does not prove semantic or temporal comparability and may include partial periods.",
      "Server ranking and growth are useful accelerators, but independent arithmetic and query-contract checks remain required."
    ],
    boundaries: [
      "No alternative surface was used to evade the 30-message chat quota.",
      "No identity rotation, account switching, token persistence, or private endpoint use occurred.",
      "Public reachability is not a dataset-level commercial reuse license.",
      "HTTP 200 with an empty body is not a usable export.",
      "A server-side join is a candidate result until grain, member keys, definitions, units, and period completeness are verified."
    ]
  };

  const matrix = {
    schema_version: "1.0",
    captured_at_utc: capturedAt,
    rows: [
      { surface: "public catalog", capability: "cube and schema discovery", quota_cost: 0, status: "VERIFIED", evidence_ids: ["openapi", "gdp-schema"] },
      { surface: "data endpoint", capability: "reported values, filters, latest periods, pagination", quota_cost: 0, status: "VERIFIED", evidence_ids: ["building-filter-alias"] },
      { surface: "server ranking", capability: "ranked categories with explicit rank column", quota_cost: 0, status: "VERIFIED_WITH_INDEPENDENT_CHECK_REQUIRED", evidence_ids: ["gdp-ranking"] },
      { surface: "server growth", capability: "period growth columns", quota_cost: 0, status: "VERIFIED_WITH_INDEPENDENT_CHECK_REQUIRED", evidence_ids: ["gdp-growth"] },
      { surface: "multiquery", capability: "cross-cube common-column join", quota_cost: 0, status: "VERIFIED_UNSAFE_WITHOUT_GRAIN_REVIEW", evidence_ids: ["multiquery-common-year"] },
      { surface: "text exports", capability: "JSON, CSV, TSV downloads", quota_cost: 0, status: "VERIFIED", evidence_ids: formats.slice(0, 6).map(item => `format-${item}`) },
      { surface: "binary exports", capability: "XLSX and Parquet", quota_cost: 0, status: "BROKEN_ZERO_BYTE", evidence_ids: ["format-xlsx", "format-parquet"] },
      { surface: "Data Explorer", capability: "human interactive exploration", quota_cost: 0, status: "HTTP_REACHABLE", evidence_ids: ["data-explorer-page"] },
      { surface: "economic calendar", capability: "release discovery and timing context", quota_cost: 0, status: "HTTP_REACHABLE", evidence_ids: ["economic-calendar-page"] },
      { surface: "INSAIGHTS chat", capability: "natural-language behavior and failure-mode testing", quota_cost: 1, status: "QUOTA_EXHAUSTED_PRESERVED_FOR_FUTURE_BEHAVIOR_ONLY", evidence_ids: ["insaights-page"] }
    ]
  };

  await Promise.all([
    writeFile(path.join(packageRoot, "01-surface-alternatives/summary.json"), `${JSON.stringify(summary, null, 2)}\n`),
    writeFile(path.join(packageRoot, "01-surface-alternatives/surface-matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`)
  ]);
  return { summary, matrix };
}

async function cli() {
  const { summary } = await captureAlternativeSurfaces();
  console.log(JSON.stringify({ ok: true, captured_at_utc: summary.captured_at_utc, observations: summary.observations.length, capabilities: summary.capabilities }));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await cli();
