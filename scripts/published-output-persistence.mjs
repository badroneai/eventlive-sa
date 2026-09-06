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

  // Losing ONE record is a defect. Freezing the whole site over it is a worse
  // one. Measured on the 2026-09-03..06 outage: a single record that did not
  // reach dist/events.json blocked 1,118 events and 3,296 pages from publishing
  // for 69 hours, across six runs, because the gate that found it is blocking.
  //
  // The repository already made this call once, for the publish-quality battery:
  // "freezing publishing over a quality regression is a worse failure than
  // shipping a known one loudly" (Invariant C, source-sync.yml). The same
  // reasoning applies here, with one exception kept blocking:
  //
  //   total   NOTHING this cycle published survived. That is not one bad record,
  //           it is a broken output path, and publishing on top of it would ship
  //           a catalog that lost everything new. Still blocks.
  //   partial some survived, some did not. A real defect, reported loudly and
  //           named — and the other 1,118 events still reach their readers.
  //
  // A threshold of "all or nothing" rather than a tuned number, so there is no
  // magic constant to argue with later.
  const severity = missing.length === 0
    ? 'none'
    : present.length === 0
      ? 'total'
      : 'partial';

  return { present, collapsed, missing, lost: missing.length > 0, severity, blocking: severity === 'total' };
}

export { COLLAPSE_REASONS };
