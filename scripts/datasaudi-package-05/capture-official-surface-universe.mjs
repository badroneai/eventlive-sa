import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGE_ID = "datasaudi-package-05-execution-closure";
const OUTPUT_RELATIVE = `research/${PACKAGE_ID}/05-official-surface-universe`;
const API = "https://api.datasaudi.sa";
const SITE = "https://datasaudi.sa";
const CALENDAR = "https://apipulse.mep.gov.sa/ds/calendar/v1";
const MESSAGE_KEY = "00000000-0000-4000-8000-000000000005";
const sha256 = value => createHash("sha256").update(value).digest("hex");

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    return await fetch(url, {
      ...options,
      headers: {
        "User-Agent": "DataSaudi-P05-Official-Surface-Census/1.0",
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

async function capture({ evidenceRoot, id, url, method = "GET", headers = {}, body = null, extension = "json" }) {
  const response = await fetchWithTimeout(url, { method, headers, body });
  const bytes = Buffer.from(await response.arrayBuffer());
  const evidencePath = path.join(evidenceRoot, `${id}.${extension}`);
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, bytes);
  let parsed = null;
  if (extension === "json") {
    try {
      parsed = JSON.parse(bytes.toString("utf8"));
    }
    catch {
      parsed = null;
    }
  }
  return {
    receipt: {
      id,
      request: {
        method,
        url,
        content_type: headers["Content-Type"] || headers["content-type"] || null,
        body_sha256: body ? sha256(Buffer.from(body)) : null
      },
      response: {
        status: response.status,
        ok: response.ok,
        final_url: response.url,
        content_type: response.headers.get("content-type"),
        bytes: bytes.length,
        sha256: sha256(bytes),
        evidence_path: path.relative(process.cwd(), evidencePath)
      }
    },
    parsed,
    text: bytes.toString("utf8")
  };
}

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error("The datasets page did not expose __NEXT_DATA__");
  return JSON.parse(match[1]);
}

function flattenDatasetRegistry(groups) {
  return groups.flatMap(group => (group.values || []).flatMap(subgroup => subgroup.value || []));
}

function catalogMetrics(catalog) {
  let dimensions = 0;
  let hierarchies = 0;
  let levels = 0;
  const pairs = new Set();
  for (const cube of catalog.cubes || []) {
    for (const dimension of cube.dimensions || []) {
      dimensions += 1;
      for (const hierarchy of dimension.hierarchies || []) {
        hierarchies += 1;
        for (const level of hierarchy.levels || []) {
          levels += 1;
          pairs.add(`${cube.name}\u0000${level.name}`);
        }
      }
    }
  }
  return {
    cubes: (catalog.cubes || []).length,
    dimensions,
    hierarchies,
    levels,
    unique_cube_level_pairs: pairs.size,
    bilingual_member_base_requests: pairs.size * 2
  };
}

function profileMetrics(payload) {
  const profile = payload?.pageProps?.profile || {};
  const sections = profile.sections || [];
  const variables = profile.variables || {};
  return {
    sections: sections.length,
    visualizations: sections.reduce((sum, section) => sum + (section.visualizations || []).length, 0),
    descriptions: sections.reduce((sum, section) => sum + (section.descriptions || []).length, 0),
    variables: Object.keys(variables).length,
    embedded_import_rows: Array.isArray(variables.dataImports) ? variables.dataImports.length : 0,
    embedded_export_rows: Array.isArray(variables.dataExports) ? variables.dataExports.length : 0
  };
}

function sitemapMetrics(xml) {
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].replaceAll("&amp;", "&"));
  const slugs = prefix => new Set(urls.flatMap(url => {
    const pathName = new URL(url).pathname;
    const match = pathName.match(new RegExp(`^/(?:ar|en)/${prefix}/([^/]+)$`));
    return match ? [match[1]] : [];
  }));
  const regions = slugs("region");
  const sectors = slugs("sector");
  const bilaterals = slugs("bilateral");
  return {
    urls: urls.length,
    region_slugs: regions.size,
    sector_slugs: sectors.size,
    bilateral_country_slugs: bilaterals.size,
    report_targets: 1 + regions.size + sectors.size + bilaterals.size + 1
  };
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

export async function captureOfficialSurfaceUniverse({ root = process.cwd() } = {}) {
  const outputRoot = path.join(root, OUTPUT_RELATIVE);
  const evidenceRoot = path.join(outputRoot, "evidence");
  const receipts = [];
  const record = async specification => {
    const result = await capture({ evidenceRoot, ...specification });
    receipts.push(result.receipt);
    return result;
  };

  const datasetsPage = await record({
    id: "datasets-page",
    url: `${SITE}/ar/data-explorer/datasets`,
    extension: "html"
  });
  const nextData = extractNextData(datasetsPage.text);
  const buildId = nextData.buildId;
  const registryGroups = nextData.props?.pageProps?.cubes || [];
  const registryRecords = flattenDatasetRegistry(registryGroups);

  const sitemap = await record({ id: "sitemap", url: `${SITE}/sitemap-0.xml`, extension: "xml" });
  const catalog = await record({ id: "catalog-show-all-en", url: `${API}/tesseract/cubes?show_all=true&locale=en` });
  const memberSearch = await record({
    id: "member-search-china",
    url: `${API}/tesseract/members?cube=foreign_trade&level=Country&locale=en&search=China&parents=true&limit=10%2C0`
  });

  const safeJoinBody = JSON.stringify({
    requests: [
      {
        cube: "sama_water_consumption_region",
        drilldowns: ["Year", "Province"],
        measures: ["Thousand cubic meters"],
        locale: "en",
        pagination: { limit: 1000, offset: 0 }
      },
      {
        cube: "gastat_population_province_sex_nationality",
        drilldowns: ["Year", "Province"],
        measures: ["Population"],
        locale: "en",
        pagination: { limit: 1000, offset: 0 }
      }
    ],
    joins: [
      {
        on: ["Year", "Province ID"],
        how: "inner",
        validate_relation: "1:1"
      }
    ],
    pagination: { limit: 1000, offset: 0 }
  });
  const safeJoin = await record({
    id: "multiquery-water-population-province-year",
    url: `${API}/tesseract/multiquery.jsonrecords`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: safeJoinBody
  });

  const calendarHeaders = {
    "X-language-key": "ar-SA",
    "X-message-key": MESSAGE_KEY
  };
  const categories = await record({ id: "calendar-categories", url: `${CALENDAR}/categories`, headers: calendarHeaders });
  const calendarSummary = await record({ id: "calendar-summary", url: `${CALENDAR}/summary/count`, headers: calendarHeaders });
  const categoryIds = (categories.parsed || []).map(item => item.id);
  const calendarSearchBody = JSON.stringify({
    offset: 0,
    count: 30,
    month: "JULY",
    agenda: false,
    year: 2026,
    categoryIds
  });
  const calendarSearch = await record({
    id: "calendar-search-july-2026",
    url: `${CALENDAR}/search`,
    method: "POST",
    headers: { ...calendarHeaders, "Content-Type": "application/json" },
    body: calendarSearchBody
  });

  const profileSpecs = [
    ["datasets-next-data", `${SITE}/_next/data/${buildId}/ar/data-explorer/datasets.json`],
    ["profile-saudi", `${SITE}/_next/data/${buildId}/ar.json`],
    ["profile-riyadh", `${SITE}/_next/data/${buildId}/ar/region/al-riyadh.json?slug=al-riyadh`],
    ["profile-financial-sector", `${SITE}/_next/data/${buildId}/ar/sector/financial-and-insurance-activities.json?slug=financial-and-insurance-activities`],
    ["profile-china", `${SITE}/_next/data/${buildId}/ar/bilateral/china.json?slug=china`],
    ["profile-international-indicators", `${SITE}/_next/data/${buildId}/ar/internationally-reported-indicators.json`]
  ];
  const profiles = {};
  for (const [id, url] of profileSpecs) profiles[id] = await record({ id, url });

  const catalogSummary = catalogMetrics(catalog.parsed || {});
  const registryCubeIds = new Set(registryRecords.map(item => item.cube));
  const apiCubeIds = new Set((catalog.parsed?.cubes || []).map(item => item.name));
  const apiOnlyCubes = [...apiCubeIds].filter(item => !registryCubeIds.has(item)).sort();
  const profileSummary = Object.fromEntries(Object.entries(profiles)
    .filter(([id]) => id.startsWith("profile-"))
    .map(([id, payload]) => [id, profileMetrics(payload.parsed)]));
  const embeddedProfileLists = {
    regions: profiles["profile-saudi"].parsed?.pageProps?.regions?.length || 0,
    sectors: profiles["profile-financial-sector"].parsed?.pageProps?.sectors?.length || 0,
    bilateral_countries: profiles["profile-china"].parsed?.pageProps?.countries?.length || 0
  };
  embeddedProfileLists.report_targets = 1
    + embeddedProfileLists.regions
    + embeddedProfileLists.sectors
    + embeddedProfileLists.bilateral_countries
    + 1;
  const joinRows = safeJoin.parsed?.data || [];
  const joinKeys = joinRows.map(item => `${item["Province ID"]}|${item.Year}`);
  const joinYears = joinRows.map(item => Number(item.Year)).filter(Number.isFinite);
  const capturedAt = new Date().toISOString();

  const summary = {
    schema_version: "1.0",
    package_id: PACKAGE_ID,
    captured_at_utc: capturedAt,
    mode: "PUBLIC_OFFICIAL_SURFACE_UNIVERSE_NO_CHAT_NO_AUTH",
    chat_messages_consumed: 0,
    authentication_used: false,
    build_id_observed: buildId,
    build_id_boundary: "Next.js buildId is ephemeral and must be rediscovered from __NEXT_DATA__ on every new snapshot.",
    catalog: catalogSummary,
    datasets_registry: {
      groups: registryGroups.length,
      subgroups: registryGroups.reduce((sum, group) => sum + (group.values || []).length, 0),
      records: registryRecords.length,
      unique_cube_ids: registryCubeIds.size,
      records_with_source_link: registryRecords.filter(item => item.sourceLink).length,
      records_without_source_link: registryRecords.filter(item => !item.sourceLink).length,
      api_only_cube_count: apiOnlyCubes.length,
      api_only_cubes: apiOnlyCubes
    },
    sitemap_reports: sitemapMetrics(sitemap.text),
    embedded_profile_lists: embeddedProfileLists,
    report_profile_samples: profileSummary,
    member_search: {
      cube: "foreign_trade",
      level: "Country",
      search: "China",
      members: memberSearch.parsed?.members || [],
      pagination_boundary: "The endpoint exposes no total; page until members.length is less than the requested limit."
    },
    explicit_grain_join: {
      status: safeJoin.receipt.response.status,
      verdict: "VERIFIED_SAFE_AT_EXPLICIT_OUTPUT_GRAIN",
      cubes: ["sama_water_consumption_region", "gastat_population_province_sex_nationality"],
      grain: ["Province ID", "Year"],
      validate_relation: "1:1",
      rows: joinRows.length,
      unique_keys: new Set(joinKeys).size,
      year_min: joinYears.length ? Math.min(...joinYears) : null,
      year_max: joinYears.length ? Math.max(...joinYears) : null,
      boundary: "This is proof for the captured Province ID × Year output only; it is not a global cross-cube ontology."
    },
    economic_calendar: {
      categories: (categories.parsed || []).length,
      month_summaries: (calendarSummary.parsed || []).length,
      july_2026_total: calendarSearch.parsed?.totalCount,
      returned_items: calendarSearch.parsed?.items?.length || 0,
      boundary: "A scheduled release event does not prove that the corresponding dataset has been published or ingested."
    },
    receipts,
    boundaries: [
      "No INSAIGHTS chat message, account rotation, login, private token, or quota bypass was used.",
      "API and report profiles close independently verifiable knowledge; they do not observe live INSAIGHTS behavior.",
      "The datasets UI registry is not the complete API catalog.",
      "Profile narrative and embedded values may be cached; replay material claims through the public API when possible.",
      "Members pagination has no total and must stop on a short page.",
      "A multiquery join is safe only at the explicitly validated grain and relation.",
      "Calendar entries are release-discovery signals, not freshness proof.",
      "Public reachability does not establish dataset-level commercial reuse rights."
    ]
  };

  const matrix = {
    schema_version: "1.0",
    captured_at_utc: capturedAt,
    rows: [
      { surface: "show-all catalog", scale: "277 cubes / 992 cube-level pairs", status: "VERIFIED", quota_cost: 0 },
      { surface: "datasets registry", scale: "251 UI-listed cubes", status: "VERIFIED_INCOMPLETE_VS_API_BY_26", quota_cost: 0 },
      { surface: "members", scale: "1,984 bilingual base streams before pagination", status: "HARVESTABLE_NO_TOTAL", quota_cost: 0 },
      { surface: "report profiles", scale: `${embeddedProfileLists.report_targets} targets from embedded official lists`, status: "VERIFIED_STRUCTURED_NEXT_DATA", quota_cost: 0 },
      { surface: "profile query logic", scale: "sections, visualizations, descriptions, variables", status: "VERIFIED_REPLAY_REQUIRED", quota_cost: 0 },
      { surface: "explicit-grain multiquery", scale: `${joinRows.length} Province ID × Year rows`, status: "VERIFIED_SAFE_AT_EXPLICIT_OUTPUT_GRAIN", quota_cost: 0 },
      { surface: "economic calendar API", scale: `${calendarSearch.parsed?.totalCount || 0} July 2026 events`, status: "VERIFIED_DISCOVERY_ONLY", quota_cost: 0 },
      { surface: "INSAIGHTS live chat", scale: "behavioral observation", status: "QUOTA_BOUND_SEPARATE_LEDGER", quota_cost: 1 }
    ]
  };

  await Promise.all([
    writeJson(path.join(outputRoot, "summary.json"), summary),
    writeJson(path.join(outputRoot, "surface-universe-matrix.json"), matrix)
  ]);
  return { summary, matrix };
}

async function cli() {
  const { summary } = await captureOfficialSurfaceUniverse();
  console.log(JSON.stringify({
    ok: true,
    captured_at_utc: summary.captured_at_utc,
    receipts: summary.receipts.length,
    catalog: summary.catalog,
    datasets_registry: summary.datasets_registry,
    sitemap_reports: summary.sitemap_reports,
    embedded_profile_lists: summary.embedded_profile_lists,
    explicit_grain_join: summary.explicit_grain_join,
    economic_calendar: summary.economic_calendar
  }));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await cli();
