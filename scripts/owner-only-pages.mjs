// Single source of truth for pages that must never reach the public surface:
// no links from public dist/**.html pages, no sitemap.xml entry, no
// localization into dist/en/**, no PWA manifest shortcut, and (via
// isOwnerOnlyPage in generate-site.mjs) noindex + no client-side analytics.
//
// Add a page here once and every owner-only surface picks it up
// automatically. Do not hand-roll a second list anywhere else.
//
// WO-4 scope history: source-coverage-gaps.html, regions.html,
// readiness.html and activation.html were initially left out of this list
// because scripts/regions-coverage-regression-test.mjs,
// scripts/readiness-trust-regression-test.mjs (which tagged
// `{ base: 'readiness', ownerOnly: false }`), scripts/source-coverage-gaps-
// regression-test.mjs and scripts/site-launch-sweep.mjs's launchPages list
// all asserted those four pages were public. PM ruling on PR #30 review
// (2026-07-28) overruled that prior test-encoded decision: all four are
// operational dashboards (their own titles/descriptions self-identify as
// such — "لوحة تشغيلية" / "لوحة EventLive التشغيلية"), the owner's original
// complaint was specifically about these pages reaching visitors, and owner
// directive supersedes stale test assertions. The four conflicting test
// files above were updated in the same PR to assert the new (owner-only)
// policy instead. source-health.html ("fetch health") was already
// uncontested owner-only before this change.
export const OWNER_ONLY_PAGES = new Set([
  'sources.html',
  'methodology.html',
  'trust.html',
  'candidates.html',
  'resolver.html',
  'source-health.html',
  'source-coverage-gaps.html',
  'regions.html',
  'readiness.html',
  'activation.html',
  'live-ops.html',
  'owner-status.html',
  'owner-search-growth.html',
  'attendance.html'
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches a whole <a ...>...</a> element whose href points at any owner-only
// page, regardless of relative-path depth (./, ../, ../../, a bare filename,
// or a root-absolute /page.html), and regardless of any query string or
// fragment appended to it.
export function ownerOnlyLinkRegex() {
  const names = [...OWNER_ONLY_PAGES].map(escapeRegExp).join('|');
  return new RegExp(
    `<a\\b[^>]*href=(["'])(?:(?:\\.\\.\\/)+|\\.\\/|\\/)?(?:${names})(?:[?#][^"']*)?\\1[^>]*>[\\s\\S]*?<\\/a>`,
    'g'
  );
}
