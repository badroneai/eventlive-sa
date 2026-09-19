// Re-derive every catalog row's category from the taxonomy it is supposed to follow.
//
// 2026-09-19: Visit Saudi labels the same rows "/ Friends" as often as "/ Families", and only the
// Families spellings were listed as aliases. Thirty-eight rows therefore matched nothing and took
// the community-occasions fallback — 12 comedy shows, 9 concerts, 3 sports and 3 entertainment
// rows filed next to national days and honouring ceremonies, where nobody browsing comedy would
// ever find them. The aliases are added now; this brings the rows already published into line
// with them instead of waiting for a sync that may not touch a given row for weeks.
//
// It only ever moves a row to the category its OWN raw_category resolves to. A row whose
// raw_category still matches no alias is left exactly as it is and reported, never guessed.
//
// Usage: node scripts/heal-category-from-taxonomy.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { categoryDefinition, categoryDefinitionByKey } from './category-taxonomy.mjs';

const root = process.cwd();
const catalogPath = path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE || 'data/events_catalog.json');
const dryRun = process.argv.includes('--dry-run');
const envelope = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const healedAt = new Date().toISOString();

let changed = 0;
const unmapped = [];
for (const event of envelope.events || []) {
  const definition = categoryDefinition(event.raw_category, event);
  if (!definition) { unmapped.push(`${event.id} [${event.raw_category}]`); continue; }
  if (definition.key === event.category) continue;
  console.log(`HEAL_CATEGORY ${event.id} ${event.category} -> ${definition.key} (raw_category=${event.raw_category})`);
  // The Arabic label is printed into the row's own copy — highlights, program_outline features
  // and faqs — so moving the key alone leaves a card that says one category and a page that says
  // another. Replace the OLD label only where it actually appears; never rewrite anything else.
  const previous = categoryDefinitionByKey(event.category);
  const fromLabel = previous?.label_ar;
  const toLabel = definition.label_ar;
  if (fromLabel && toLabel && fromLabel !== toLabel) {
    const swap = (value) => (typeof value === 'string' ? value.split(fromLabel).join(toLabel) : value);
    if (Array.isArray(event.highlights)) event.highlights = event.highlights.map(swap);
    event.description = swap(event.description);
    event.rich_summary = swap(event.rich_summary);
    event.summary = swap(event.summary);
    if (event.program_outline && typeof event.program_outline === 'object') {
      const outline = event.program_outline;
      if (Array.isArray(outline.features)) outline.features = outline.features.map(swap);
      outline.official_description = swap(outline.official_description);
      if (outline.faqs && typeof outline.faqs === 'object' && 'category' in outline.faqs) {
        outline.faqs.category = outline.faqs.category === fromLabel ? toLabel : swap(outline.faqs.category);
      }
    }
  }
  event.category = definition.key;
  event.updated_at = healedAt;
  changed++;
}
for (const row of unmapped) console.log(`HEAL_CATEGORY_UNMAPPED ${row}`);
if (!dryRun && changed) fs.writeFileSync(catalogPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
console.log(`HEAL_CATEGORY_DONE changed=${changed} unmapped=${unmapped.length} dry_run=${dryRun}`);
