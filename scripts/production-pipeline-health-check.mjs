import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Production-pipeline health visibility (Invariant A, governance fix
// 2026-08-02, see GATES-GOVERNANCE.md).
//
// Root cause this closes: deploy.yml ("EventLive MVP Pipeline") is the
// official gated publish path, but nothing in the workflow that actually
// keeps the live site updating (source-sync.yml, every ~6 hours) ever
// looked at whether that official pipeline was green. Result: deploy.yml
// failed on every run for 5 days (2026-07-28T14:48 onward) while
// source-sync.yml kept publishing through its own, narrower gate list —
// and nothing anywhere surfaced that the official gated pipeline was red.
//
// This step makes that condition loud without making it blocking: it reads
// the latest completed run of deploy.yml on main via `gh run list` and, if
// that run failed, emits a `::error::` annotation plus a clearly-marked
// $GITHUB_STEP_SUMMARY section. It never fails the job itself — visibility,
// not gating, is this script's job (Invariant C: never freeze the content
// pipeline over this signal; npm run ci:publish-quality-gates run
// loud-but-non-blocking in the same workflow is what actually gates
// quality). Degrades to a log line if `gh`/network/auth is unavailable so a
// GitHub API hiccup can never destabilize the sync.

const root = process.cwd();
const OFFICIAL_WORKFLOW = 'deploy.yml';
const BRANCH = 'main';
const REPORT_PATH = path.join(root, 'reports', 'production-pipeline-health.json');

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function appendSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`, 'utf8');
}

try {
  const args = [
    'run', 'list',
    '--workflow', OFFICIAL_WORKFLOW,
    '--branch', BRANCH,
    '--status', 'completed',
    '--limit', '1',
    '--json', 'conclusion,url,createdAt,headSha,displayTitle'
  ];
  if (process.env.GITHUB_REPOSITORY) {
    args.push('--repo', process.env.GITHUB_REPOSITORY);
  }
  const raw = gh(args);
  const runs = JSON.parse(raw);
  const latest = runs[0];

  if (!latest) {
    writeReport({
      evaluated_at: new Date().toISOString(),
      status: 'UNKNOWN',
      reason: `no completed ${OFFICIAL_WORKFLOW} run found on ${BRANCH}`,
      workflow: OFFICIAL_WORKFLOW,
      branch: BRANCH
    });
    console.log(`PRODUCTION_PIPELINE_HEALTH_UNKNOWN no completed ${OFFICIAL_WORKFLOW} run found on ${BRANCH}`);
    process.exit(0);
  }

  const isRed = latest.conclusion !== 'success';
  writeReport({
    evaluated_at: new Date().toISOString(),
    status: isRed ? 'RED' : 'OK',
    workflow: OFFICIAL_WORKFLOW,
    branch: BRANCH,
    conclusion: latest.conclusion,
    run_url: latest.url,
    head_sha: latest.headSha,
    created_at: latest.createdAt
  });

  if (isRed) {
    console.log(`::error::PRODUCTION_PIPELINE_RED the official gated pipeline (${OFFICIAL_WORKFLOW}) on ${BRANCH} last concluded '${latest.conclusion}' at ${latest.createdAt} (${latest.url}). This sync run still published — loud-but-non-blocking by design, see GATES-GOVERNANCE.md — but the gated pipeline needs attention.`);
    appendSummary([
      '## ⚠️ PRODUCTION PIPELINE RED',
      `- Official gated pipeline (\`${OFFICIAL_WORKFLOW}\`) on \`${BRANCH}\` last concluded: **${latest.conclusion}**`,
      `- Run: ${latest.url}`,
      `- Commit: ${latest.headSha}`,
      '- This publish went through anyway (loud-but-non-blocking by design — see GATES-GOVERNANCE.md).',
      ''
    ]);
  } else {
    console.log(`PRODUCTION_PIPELINE_HEALTH_OK ${OFFICIAL_WORKFLOW}@${BRANCH} conclusion=${latest.conclusion} run=${latest.url}`);
    appendSummary([
      '## Production Pipeline Health',
      `- Official gated pipeline (\`${OFFICIAL_WORKFLOW}\`) on \`${BRANCH}\`: **${latest.conclusion}**`,
      `- Run: ${latest.url}`,
      ''
    ]);
  }
} catch (error) {
  console.log(`PRODUCTION_PIPELINE_HEALTH_DEGRADED ${String(error.message || error).slice(0, 300)}`);
}
process.exit(0);
