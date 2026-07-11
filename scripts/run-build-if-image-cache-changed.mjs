import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ensureDir, exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const imageReportPath = path.join(root, process.env.EVENTLIVE_IMAGE_CACHE_REPORT_JSON_FILE || 'reports/event-image-cache-report.json');
const reportJsonPath = path.join(root, 'reports', 'source-final-build-report.json');
const reportMdPath = path.join(root, 'reports', 'source-final-build-report.md');

function requiresFinalBuild(report = {}) {
  if (typeof report.requires_rebuild === 'boolean') return report.requires_rebuild;
  return Number(report.totals?.fetched || 0) > 0
    || (report.rejected_removed || []).length > 0
    || (report.failed || []).some((item) => item.skipped !== true);
}

function main() {
  if (!exists(imageReportPath)) throw new Error(`Image cache report not found: ${rel(imageReportPath)}`);
  const imageReport = readJson(imageReportPath);
  const rebuild = requiresFinalBuild(imageReport);
  const started = Date.now();
  let exitCode = 0;
  if (rebuild) {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(npm, ['run', 'build'], { cwd: root, env: process.env, stdio: 'inherit' });
    exitCode = result.status ?? 1;
  }
  const report = {
    schema: 'eventlive.source-final-build.v1',
    generated_at: new Date().toISOString(),
    image_cache_report: rel(imageReportPath),
    decision: rebuild ? 'rebuilt' : 'skipped-no-image-change',
    duration_ms: Date.now() - started,
    exit_code: exitCode,
    cache_totals: imageReport.totals || {},
    reasons: imageReport.rebuild_reasons || []
  };
  ensureDir(path.dirname(reportJsonPath));
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, [
    '# EventLive Conditional Final Build', '',
    `- generated_at: ${report.generated_at}`,
    `- decision: ${report.decision}`,
    `- duration_ms: ${report.duration_ms}`,
    `- exit_code: ${report.exit_code}`,
    `- reasons: ${report.reasons.join(', ') || 'none'}`, ''
  ].join('\n'), 'utf8');
  console.log(`# EventLive Conditional Final Build`);
  console.log(`- Decision: ${report.decision}`);
  console.log(`- Duration: ${report.duration_ms}ms`);
  if (exitCode !== 0) process.exit(exitCode);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    console.error(`SOURCE_FINAL_BUILD_FAILED ${error.message}`);
    process.exit(1);
  }
}

export { requiresFinalBuild };
