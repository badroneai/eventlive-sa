// EventLive self-heal: rewrites public event summaries that carry internal publish-policy
// prose (see scripts/internal-prose-utils.mjs) instead of visitor-appropriate copy.
//
// Root cause: scripts/collect-source-candidates.mjs's extractMocCalendarPayload wrote its
// own internal reviewer/publish-policy rationale straight into the visitor-facing
// `summary` field for long-duration Ministry-of-Culture calendar records (e.g. «... تحفظ
// كدليل مصدر ولا تنشر تلقائياً كفعالية لحظية.»). That collector is fixed to stop writing
// the pattern going forward; this script heals rows that were already published to
// data/events_catalog.json before the fix landed.
//
// Archival doctrine note (deliberate departure from the usual "never touch ended events"
// rule): this heal DOES rewrite ended/archived rows too. The leak is a public-page display
// bug (chrome-like hygiene - the wrong sentence is visible on a live archived event page
// right now), not a rewrite of historical event data (title/dates/venue/category are all
// untouched). Leaving the leaked internal sentence live on archived pages because "the
// event already ended" would prioritize a literal reading of the archival doctrine over
// its actual purpose. See PR body for the explicit ruling.
//
// Runs every sync cycle (wired into npm run sources:sync immediately after
// images:heal-visit-saudi-identity, the WO-5 heal it borrows its idiom from) - no human
// step required.
import fs from 'node:fs';
import path from 'node:path';
import { INTERNAL_PROSE_PATTERNS, findInternalProsePattern } from './internal-prose-utils.mjs';
import { categoryDefinitionByKey } from './category-taxonomy.mjs';

const root = process.cwd();
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = process.env.EVENTLIVE_INTERNAL_PROSE_HEAL_REPORT_JSON_FILE
  ? path.join(root, process.env.EVENTLIVE_INTERNAL_PROSE_HEAL_REPORT_JSON_FILE)
  : path.join(root, 'reports', 'internal-prose-heal-report.json');
const reportMdPath = process.env.EVENTLIVE_INTERNAL_PROSE_HEAL_REPORT_MD_FILE
  ? path.join(root, process.env.EVENTLIVE_INTERNAL_PROSE_HEAL_REPORT_MD_FILE)
  : path.join(root, 'reports', 'internal-prose-heal-report.md');
const dryRun = ['1', 'true', 'yes'].includes(String(process.env.EVENTLIVE_HEAL_INTERNAL_PROSE_DRY_RUN || '').toLowerCase());
const generatedAt = new Date().toISOString();

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rel(filePath) {
  return path.relative(root, filePath);
}

// Same factual shape the fixed collector now writes for these MOC calendar records
// (scripts/collect-source-candidates.mjs's extractMocCalendarPayload): a plain "official
// program from the Ministry of Culture calendar" sentence plus the event's own category as
// the only factual detail, no publish-policy reasoning. Existing catalog rows don't retain
// the original source categoryName string, so this heal draws the category detail from the
// event's own already-assigned `category` slug via the shared taxonomy (category-taxonomy.mjs)
// rather than inventing new data.
function visitorSummaryFor(event) {
  const label = categoryDefinitionByKey(event.category)?.label_ar || '';
  return label
    ? `برنامج رسمي مستمر من تقويم وزارة الثقافة. التصنيف: ${label}.`
    : 'برنامج رسمي مستمر من تقويم وزارة الثقافة.';
}

function main() {
  const catalog = readJson(catalogPath, { events: [] });
  const events = Array.isArray(catalog.events) ? catalog.events : [];

  const healed = [];
  for (const event of events) {
    const matchedPattern = findInternalProsePattern(event.summary || '');
    if (!matchedPattern) continue;
    const before = event.summary;
    const after = visitorSummaryFor(event);
    healed.push({
      id: event.id,
      title: event.title,
      matched_pattern: matchedPattern,
      before,
      after
    });
    if (!dryRun) {
      event.summary = after;
      event.updated_at = generatedAt;
    }
  }

  if (healed.length && !dryRun) {
    writeJson(catalogPath, catalog);
  }

  const report = {
    generated_at: generatedAt,
    dry_run: dryRun,
    catalog: rel(catalogPath),
    patterns: INTERNAL_PROSE_PATTERNS.map((pattern) => pattern.id),
    totals: {
      events_scanned: events.length,
      healed: healed.length
    },
    healed
  };
  writeJson(reportJsonPath, report);
  fs.writeFileSync(reportMdPath, [
    '# EventLive Internal Prose Heal',
    '',
    `- generated_at: ${generatedAt}`,
    `- dry_run: ${dryRun}`,
    `- events_scanned: ${report.totals.events_scanned}`,
    `- healed: ${report.totals.healed}`,
    '',
    '## Healed rows',
    '',
    ...(healed.length
      ? healed.map((item) => `- ${item.id} (${item.title}) - matched \`${item.matched_pattern}\` - "${item.before}" -> "${item.after}"`)
      : ['- none'])
  ].join('\n') + '\n', 'utf8');

  console.log('# EventLive Internal Prose Heal');
  console.log(`- Mode: ${dryRun ? 'dry-run (no writes)' : 'write'}`);
  console.log(`- Events scanned: ${report.totals.events_scanned}`);
  console.log(`- Healed: ${report.totals.healed}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
