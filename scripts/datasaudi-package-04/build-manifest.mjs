import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validatePackage } from "./validate-package.mjs";

const PACKAGE_RELATIVE = "research/datasaudi-package-04-universe-exploration";
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
  if (validation.verdict !== "PASS") {
    throw new Error(`Refusing to build a release manifest: ${validation.failures.map(item => item.id).join(", ")}`);
  }

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

  const capabilitySummary = JSON.parse(await readFile(path.join(packageRoot, "06-capability-surfaces/summary.json"), "utf8"));
  const adjudicationSummary = JSON.parse(await readFile(path.join(packageRoot, "04-adjudication/summary.json"), "utf8"));
  const treeSha256 = sha256(artifacts.map(item => `${item.sha256}  ${item.path}`).join("\n"));
  const sections = Object.fromEntries([...new Set(artifacts.map(item => item.section))].sort().map(section => {
    const selected = artifacts.filter(item => item.section === section);
    return [section, {
      artifacts: selected.length,
      size_bytes: selected.reduce((sum, item) => sum + item.size_bytes, 0)
    }];
  }));
  const validationFingerprint = sha256(JSON.stringify({
    verdict: validation.verdict,
    metrics: validation.metrics,
    checks: validation.checks.map(item => ({ id: item.id, pass: item.pass }))
  }));

  const manifest = {
    schema_version: "1.0",
    package_id: "datasaudi-package-04-universe-exploration",
    build_mode: "DETERMINISTIC_CONTENT_ADDRESSED",
    generated_at_utc: capabilitySummary.captured_at_utc,
    generated_at_source: "06-capability-surfaces/summary.json#captured_at_utc (source capture time; no manifest wall clock)",
    validation: {
      verdict: validation.verdict,
      checks_total: validation.checks_total,
      checks_passed: validation.checks_passed,
      fingerprint_sha256: validationFingerprint
    },
    truth_accounting: {
      prompts: validation.metrics.prompts,
      current_window: {
        exact_live_prompts: validation.metrics.exact_live_prompts,
        manual_messages: validation.metrics.manual_window_messages,
        same_user_fingerprint_sha256: validation.metrics.same_user_fingerprint_sha256
      },
      server_session_messages: {
        user: validation.metrics.server_user_messages,
        assistant: validation.metrics.server_assistant_messages
      },
      api_universe: {
        dossiers: validation.metrics.api_dossiers,
        time_probes: validation.metrics.api_time_probes,
        hidden_cubes: validation.metrics.hidden_cubes,
        compatibility_candidates: validation.metrics.compatibility_candidates,
        proven_safe_joins: validation.metrics.proven_safe_joins
      },
      adjudication: {
        records: validation.metrics.adjudication_records,
        exact_observations_scored: validation.metrics.adjudicated_exact_observations,
        exact_prompts_blocked: validation.metrics.blocked_exact_prompts,
        manual_substitutes: validation.metrics.manual_substitutes,
        verdict_counts: validation.metrics.adjudication_verdict_counts,
        package_status: adjudicationSummary.status
      },
      denominators: validation.metrics.denominators
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
  console.log(JSON.stringify({
    ok: true,
    wrote_manifest: !checkOnly,
    artifacts: manifest.artifact_count,
    size_bytes: manifest.size_bytes,
    tree_sha256: manifest.tree_sha256,
    validation: manifest.validation,
    sections: manifest.sections
  }));
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await cli();
