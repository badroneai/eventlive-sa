// One-time heal (2026-09-19): extend ends_at of already-published rows to their latest official
// session, so the catalog is consistent before the auto-publish reconcile pass takes over on the
// next sync. Idempotent. Usage: node scripts/heal-session-windows.mjs [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { reconcileCatalogSessionWindows } from './event-session-window.mjs';

const root = process.cwd();
const catalogPath = path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE || 'data/events_catalog.json');
const dryRun = process.argv.includes('--dry-run');
const envelope = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const changes = reconcileCatalogSessionWindows(envelope.events || []);
const healedAt = new Date().toISOString();
for (const change of changes) {
  const row = envelope.events.find((event) => event.id === change.event_id);
  if (row) row.updated_at = healedAt;
  console.log(`HEAL_SESSION_WINDOW ${change.event_id} ${change.previous_ends_at} -> ${change.ends_at}`);
}
if (!dryRun && changes.length) fs.writeFileSync(catalogPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
console.log(`HEAL_SESSION_WINDOW_DONE changed=${changes.length} dry_run=${dryRun}`);
