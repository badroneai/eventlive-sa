import fs from 'node:fs';
import path from 'node:path';

// Show the current content-translation backlog (written by the site build).
// Steady state should be a handful of rows right after a sync; a growing
// number means a translation backfill is due:
//   1. npm run build            (refreshes reports/content-translation-pending.json)
//   2. split pending into chunk-*.json files and translate to chunk-*.out.json
//   3. node scripts/merge-content-translations.mjs <dir>
//   4. npm run build            (pages pick up the new translations)

const reportPath = path.join(process.cwd(), 'reports', 'content-translation-pending.json');
if (!fs.existsSync(reportPath)) {
  console.log('No pending report found — run npm run build first.');
  process.exit(0);
}
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const pending = report.pending || [];
const byDirection = {};
for (const row of pending) {
  const key = `${row.source_lang}->${row.target_lang}`;
  byDirection[key] = (byDirection[key] || 0) + 1;
}
console.log(`CONTENT_TRANSLATIONS_PENDING total=${pending.length} generated_at=${report.generated_at}`);
for (const [direction, count] of Object.entries(byDirection)) console.log(`- ${direction}: ${count}`);
for (const row of pending.slice(0, 10)) console.log(`  · [${row.source_lang}->${row.target_lang}] ${row.source.slice(0, 80)}`);
if (pending.length > 10) console.log(`  … and ${pending.length - 10} more`);
