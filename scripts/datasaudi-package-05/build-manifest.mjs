import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validatePackage } from "./validate-package.mjs";

const PACKAGE_ID = "datasaudi-package-05-execution-closure";
const PACKAGE_RELATIVE = `research/${PACKAGE_ID}`;
const MANIFEST_NAME = "PACKAGE_MANIFEST.json";
const sha256 = value => createHash("sha256").update(value).digest("hex");

async function walk(directory) {
  const files = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && entry.name !== MANIFEST_NAME) files.push(full);
  }
  return files;
}

export async function buildPackageManifest({ root = process.cwd(), write = true } = {}) {
  const packageRoot = path.join(root, PACKAGE_RELATIVE);
  const validation = await validatePackage({ root });
  if (validation.verdict !== "PASS") throw new Error(`Refusing manifest build: ${validation.failures.map(item => item.id).join(", ")}`);

  const artifacts = [];
  for (const file of await walk(packageRoot)) {
    const [bytes, metadata] = await Promise.all([readFile(file), stat(file)]);
    const relative = path.relative(root, file);
    artifacts.push({
      path: relative,
      section: path.relative(packageRoot, file).split(path.sep)[0],
      sha256: sha256(bytes),
      size_bytes: metadata.size
    });
  }
  artifacts.sort((a, b) => a.path.localeCompare(b.path));

  const [summary, surfaces, officialSurfaces] = await Promise.all([
    JSON.parse(await readFile(path.join(packageRoot, "SUMMARY.json"), "utf8")),
    JSON.parse(await readFile(path.join(packageRoot, "01-surface-alternatives/summary.json"), "utf8")),
    JSON.parse(await readFile(path.join(packageRoot, "05-official-surface-universe/summary.json"), "utf8"))
  ]);
  const treeSha256 = sha256(artifacts.map(item => `${item.sha256}  ${item.path}`).join("\n"));
  const sections = Object.fromEntries([...new Set(artifacts.map(item => item.section))].sort().map(section => {
    const selected = artifacts.filter(item => item.section === section);
    return [section, { artifacts: selected.length, size_bytes: selected.reduce((sum, item) => sum + item.size_bytes, 0) }];
  }));

  const manifest = {
    schema_version: "1.0",
    package_id: PACKAGE_ID,
    build_mode: "DETERMINISTIC_CONTENT_ADDRESSED",
    generated_at_utc: surfaces.captured_at_utc,
    generated_at_source: "01-surface-alternatives/summary.json#captured_at_utc",
    status: summary.status,
    validation: {
      verdict: validation.verdict,
      checks_total: validation.checks_total,
      checks_passed: validation.checks_passed,
      fingerprint_sha256: sha256(JSON.stringify({ metrics: validation.metrics, checks: validation.checks.map(item => ({ id: item.id, pass: item.pass })) }))
    },
    truth_accounting: {
      semantic_cores: summary.coverage.primary_semantic_questions,
      localized_answers: summary.coverage.canonical_localized_answers,
      reference_execution_cells: summary.coverage.execution_answers,
      reference_execution_denominator: summary.coverage.execution_denominator,
      live_main_universe_cells: summary.coverage.live_insaights_main_universe_observed_cells,
      live_main_universe_percent: summary.coverage.live_insaights_main_universe_percent,
      historical_live_messages_all_scopes: summary.coverage.historical_live_messages_all_scopes,
      api_cube_dossiers: summary.coverage.public_api_cube_dossiers,
      initial_surface_probes_without_chat: surfaces.observations.length,
      expanded_surface_receipts_without_chat: officialSurfaces.receipts.length,
      official_surface_receipts_total: surfaces.observations.length + officialSurfaces.receipts.length,
      official_report_targets: officialSurfaces.embedded_profile_lists.report_targets,
      explicit_grain_join_rows: officialSurfaces.explicit_grain_join.rows
    },
    artifact_count: artifacts.length,
    size_bytes: artifacts.reduce((sum, item) => sum + item.size_bytes, 0),
    tree_sha256: treeSha256,
    sections,
    artifacts
  };

  if (write) await writeFile(path.join(packageRoot, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function cli() {
  const checkOnly = process.argv.includes("--check");
  const manifest = await buildPackageManifest({ write: !checkOnly });
  console.log(JSON.stringify({ ok: true, wrote_manifest: !checkOnly, artifacts: manifest.artifact_count, size_bytes: manifest.size_bytes, tree_sha256: manifest.tree_sha256, validation: manifest.validation, truth: manifest.truth_accounting }));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await cli();
