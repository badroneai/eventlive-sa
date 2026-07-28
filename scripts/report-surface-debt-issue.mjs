import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Autonomous alerting for recurring English-surface debt.
//
// The sweep gate (test:en-surface-sweep) hard-fails only on template
// regressions. Data-driven debt — the same Arabic venue/label recurring on
// many English pages — must not break the sync (owner rule), but it must not
// depend on anyone remembering to check a dashboard either. This step turns
// that debt into exactly one open GitHub issue, updates it while the debt
// exists, and closes it when the debt drains. Zero humans in the loop; the
// issue IS the notification.
//
// Never fails the workflow: alerting problems degrade to a log line.

const ISSUE_TITLE = 'i18n: recurring Arabic surface debt on English pages (autonomous report)';
const root = process.cwd();

function gh(args, input) {
  return execFileSync('gh', args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

try {
  const reportPath = path.join(root, 'reports', 'i18n-en-surface.json');
  if (!fs.existsSync(reportPath)) {
    console.log('SURFACE_DEBT_ALERT skipped: no sweep report found');
    process.exit(0);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const debt = report.recurring_surface_debt || [];

  const openIssues = JSON.parse(gh(['issue', 'list', '--state', 'open', '--search', `in:title "${ISSUE_TITLE}"`, '--json', 'number,title']));
  const existing = openIssues.find((issue) => issue.title === ISSUE_TITLE);

  if (!debt.length) {
    if (existing) {
      gh(['issue', 'close', String(existing.number), '--comment', `Autonomous sweep ${report.generated_at}: recurring surface debt drained to zero (pages scanned: ${report.pages_scanned}). Closing.`]);
      console.log(`SURFACE_DEBT_ALERT closed issue #${existing.number} — debt drained`);
    } else {
      console.log('SURFACE_DEBT_ALERT clean: no recurring debt, no open issue');
    }
    process.exit(0);
  }

  const body = [
    `Autonomous sweep report — generated ${report.generated_at} by \`test:en-surface-sweep\` inside the source sync.`,
    '',
    `The lines below are Arabic strings recurring on ${report.pages_scanned} scanned English pages (threshold: 15+ pages each). They are data-driven (venues, organizer labels), so they never block the sync — they need curated pairs in \`locales/en-SA-static.json\` or \`data/mt_glossary.json\`.`,
    '',
    '| Pages | String | Example page |',
    '|---|---|---|',
    ...debt.map((item) => `| ${item.pages} | ${item.text.replaceAll('|', '\\|')} | ${item.example} |`),
    '',
    `Content-prose lines still draining through the MT backlog (informational): ${report.content_prose_lines}.`,
    '',
    '_This issue is maintained autonomously: it updates on every sync while debt exists and closes itself when the sweep reports zero._'
  ].join('\n');

  if (existing) {
    gh(['issue', 'edit', String(existing.number), '--body', body]);
    console.log(`SURFACE_DEBT_ALERT updated issue #${existing.number} (${debt.length} recurring strings)`);
  } else {
    const url = gh(['issue', 'create', '--title', ISSUE_TITLE, '--body', body]);
    console.log(`SURFACE_DEBT_ALERT opened ${url} (${debt.length} recurring strings)`);
  }
} catch (error) {
  console.log(`SURFACE_DEBT_ALERT degraded: ${String(error.message || error).slice(0, 300)}`);
}
process.exit(0);
