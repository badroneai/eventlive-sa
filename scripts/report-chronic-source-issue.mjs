import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Autonomous alerting for chronically dead collectors.
//
// A source that fails to collect is not, by itself, news: 30 collections are
// attempted per run against third-party sites, several of them government
// portals, and any of them can be briefly unreachable. A source that has failed
// every run for days IS news — it means part of the national coverage this
// platform claims has quietly stopped arriving.
//
// Neither belongs in a red pipeline. These are other people's websites; failing
// the sync over them would freeze publishing for a defect no commit can fix
// (Invariant C, GATES-GOVERNANCE.md). But "not blocking" must never decay into
// "not noticed": on 2026-08-05 four sources — including the Ministry of
// Culture's national cultural calendar — had been dead for seventeen
// consecutive runs, and nothing said so anywhere a human would look.
//
// So this follows the same idiom as report-surface-debt-issue.mjs: exactly one
// open GitHub issue, updated while the rot exists, closed by itself when the
// sources recover. The issue IS the notification.
//
// Never fails the workflow: alerting problems degrade to a log line.

const ISSUE_TITLE = 'sources: collectors dead for 3+ consecutive runs (autonomous report)';
const root = process.cwd();

function gh(args, input) {
  return execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

try {
  const reportPath = path.join(root, 'reports', 'source-harvest-os-status.json');
  if (!fs.existsSync(reportPath)) {
    console.log('CHRONIC_SOURCE_ALERT skipped: no harvest status report found');
    process.exit(0);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const chronic = (report.collector_error_sources || []).filter((source) => source.kind === 'chronic');

  const openIssues = JSON.parse(gh(['issue', 'list', '--state', 'open', '--search', `in:title "${ISSUE_TITLE}"`, '--json', 'number,title']));
  const existing = openIssues.find((issue) => issue.title === ISSUE_TITLE);

  if (!chronic.length) {
    if (existing) {
      gh(['issue', 'close', String(existing.number), '--comment', `Harvest OS ${report.generated_at}: no collector has failed 3+ consecutive runs (attempted this run: ${report.totals?.collection_attempted ?? '?'}). Closing.`]);
      console.log(`CHRONIC_SOURCE_ALERT closed issue #${existing.number} — collectors recovered`);
    } else {
      console.log('CHRONIC_SOURCE_ALERT clean: no chronic collector failures, no open issue');
    }
    process.exit(0);
  }

  const body = [
    `Autonomous harvest report — generated ${report.generated_at} by \`owner:command-center\` inside the source sync.`,
    '',
    `The collectors below have failed **every run for at least 3 runs in a row**. That is rot, not bad luck: whatever these sources contribute to national coverage has stopped arriving, and no commit in this repo will bring it back on its own.`,
    '',
    '| Source | Failed runs in a row | Reason |',
    '|---|---:|---|',
    ...chronic.map((source) => `| \`${source.id}\` | ${source.error_streak} | ${String(source.note || '').replaceAll('|', '\\|').replaceAll('\n', ' ').slice(0, 180)} |`),
    '',
    `Isolated (transient) collector errors this run: ${report.totals?.transient_collector_errors ?? 0} — those are tolerated on purpose and are not listed here.`,
    '',
    'Before treating any of these as a bug in this repo, check whether the URL answers from a normal client outside CI. If it does, the failure is environmental (runner IP or WAF blocking) and the honest options are an official feed, a partnership, or retiring the source — not an extractor patch.',
    '',
    '_This issue is maintained autonomously: it updates on every sync while any collector stays chronically dead, and closes itself when they all recover._'
  ].join('\n');

  if (existing) {
    gh(['issue', 'edit', String(existing.number), '--body', body]);
    console.log(`CHRONIC_SOURCE_ALERT updated issue #${existing.number} (${chronic.length} chronic collectors)`);
  } else {
    const url = gh(['issue', 'create', '--title', ISSUE_TITLE, '--body', body]);
    console.log(`CHRONIC_SOURCE_ALERT opened ${url} (${chronic.length} chronic collectors)`);
  }
} catch (error) {
  console.log(`CHRONIC_SOURCE_ALERT degraded: ${String(error.message || error).slice(0, 300)}`);
}
process.exit(0);
