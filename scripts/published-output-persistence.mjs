// "Did the events this cycle published survive into dist/events.json?"
//
// Absence from the built output has three different meanings, and until
// 2026-09-04 all three were the same alarm:
//
//   collapsed  — the build folded this record onto an existing primary
//                (same id, same title+city+time+source, or same source URL
//                identity). The event IS published, under that primary.
//                Measured on one ordinary build: 23 of 26 dropped records.
//   refused    — the build declined to publish it at all
//                (not-public-launch-record). auto-publish said publish and the
//                build said no; that contradiction is real and must alarm.
//   vanished   — absent, and the build recorded no reason. A genuine loss.
//
// Treating "collapsed" as a loss blocked publishing on three consecutive runs,
// and the failure message could not name a single record. Kept in its own module
// so the classification can be tested without a build, a network call, or a
// 40-minute pipeline.
const COLLAPSE_REASONS = new Set(['duplicate-id', 'duplicate-semantic', 'duplicate-source-identity']);

export function normalizePublishedId(value) {
  return String(value || '').normalize('NFC');
}

export function classifyPublishedOutput({ publishedIds = [], distIds = new Set(), buildExclusions = new Map() } = {}) {
  const present = [];
  const collapsed = [];
  const missing = [];

  for (const rawId of publishedIds) {
    const id = normalizePublishedId(rawId);
    if (distIds.has(id)) {
      present.push(id);
      continue;
    }
    const exclusion = buildExclusions.get(id);
    if (exclusion && COLLAPSE_REASONS.has(exclusion.reason)) {
      collapsed.push({ id, reason: exclusion.reason, collapsed_onto: exclusion.collapsed_onto || '' });
      continue;
    }
    // The reason is carried in the string so the gate's message names it without
    // the gate having to know this module's vocabulary.
    missing.push(exclusion ? `${id} (${exclusion.reason})` : `${id} (absent, build recorded no exclusion)`);
  }

  return { present, collapsed, missing, lost: missing.length > 0 };
}

export { COLLAPSE_REASONS };
