import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.join(root, "research/datasaudi-package-03c-full-closure/02-catalog-discovery");
const responseRoot = path.join(outputRoot, "evidence/responses");
const catalogPath = path.join(root, "research/datasaudi-insaights/03-raw-evidence-snapshots/snapshots/run-20260713T004840Z/cubes-show-all-true.json");
const endpoint = "https://api.datasaudi.sa/tesseract/data.jsonrecords";
const sha256 = value => createHash("sha256").update(value).digest("hex");

const specs = [
  {
    domain: "fis",
    cube: "mof_government_revenues_expenditures",
    drilldowns: ["Year", "Type"],
    measures: ["Value"],
  },
  {
    domain: "ext",
    cube: "sama_fdi",
    drilldowns: ["Quarter", "Flow"],
    measures: ["Million SAR"],
  },
  {
    domain: "mkt",
    cube: "tadawul_indicators",
    drilldowns: ["Month", "Indicator"],
    measures: ["Value", "Growth"],
  },
  {
    domain: "rnd",
    cube: "research_development_by_sector",
    drilldowns: ["Year", "Research Sector"],
    measures: [
      "Funding",
      "Percentage distribution of Funding",
      "Expenditure",
      "Percentage distribution of Expenditure",
      "Total Number of Employees",
      "Percentage distribution of Employees",
      "Total Number of Researchers",
      "Percentage distribution of Researchers",
    ],
  },
];

const catalogBytes = await readFile(catalogPath);
const catalog = JSON.parse(catalogBytes);
if (!Array.isArray(catalog.cubes) || catalog.cubes.length !== 277) {
  throw new Error(`Expected complete 277-cube catalog snapshot, got ${catalog.cubes?.length ?? "missing"}`);
}

await mkdir(responseRoot, { recursive: true });

async function fetchSpec(spec) {
  const cubeMetadata = catalog.cubes.find(item => item.name === spec.cube);
  if (!cubeMetadata) throw new Error(`Cube absent from catalog: ${spec.cube}`);
  const url = new URL(endpoint);
  url.searchParams.set("cube", spec.cube);
  url.searchParams.set("drilldowns", spec.drilldowns.join(","));
  url.searchParams.set("measures", spec.measures.join(","));
  url.searchParams.set("locale", "en");
  url.searchParams.set("limit", "50000,0");

  const response = await fetch(url, { headers: { accept: "application/json" } });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`${spec.cube}: HTTP ${response.status}`);
  const payload = JSON.parse(bytes.toString("utf8"));
  const rows = Array.isArray(payload.data) ? payload.data.length : 0;
  const total = Number(payload.page?.total ?? rows);
  if (rows !== total || Number(payload.page?.offset ?? 0) !== 0) {
    throw new Error(`${spec.cube}: incomplete response ${rows}/${total}`);
  }
  const responseSha = sha256(bytes);
  const responseRelative = `research/datasaudi-package-03c-full-closure/02-catalog-discovery/evidence/responses/${responseSha}.json`;
  await writeFile(path.join(root, responseRelative), bytes);
  return {
    schema_version: "1.0",
    domain: spec.domain,
    cube: spec.cube,
    catalog_present: true,
    catalog_sha256: sha256(catalogBytes),
    table_ar: cubeMetadata.annotations?.table_ar?.trim() ?? null,
    source_name_ar: cubeMetadata.annotations?.source_name_ar ?? null,
    source_name: cubeMetadata.annotations?.source_name ?? null,
    source_link: cubeMetadata.annotations?.source_link ?? null,
    request_url: url.toString(),
    drilldowns: spec.drilldowns,
    measures: spec.measures,
    http_status: response.status,
    rows,
    total,
    complete: true,
    columns: payload.columns ?? [],
    response_path: responseRelative,
    response_sha256: responseSha,
    response_size_bytes: bytes.length,
  };
}

const evidence = (await Promise.all(specs.map(fetchSpec))).sort((a, b) => a.domain.localeCompare(b.domain));
const manifest = {
  schema_version: "1.0",
  generated_at_utc: new Date().toISOString(),
  catalog_path: path.relative(root, catalogPath),
  catalog_sha256: sha256(catalogBytes),
  catalog_cube_count: catalog.cubes.length,
  query_count: evidence.length,
  complete_query_count: evidence.filter(item => item.complete).length,
  total_rows: evidence.reduce((sum, item) => sum + item.rows, 0),
  evidence,
};

await writeFile(path.join(outputRoot, "catalog-expansion-evidence.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, queries: manifest.query_count, rows: manifest.total_rows, cubes: evidence.map(item => item.cube) }));
