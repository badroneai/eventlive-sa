// Single source of truth for pages that must never reach the public surface:
// no links from public dist/**.html pages, no sitemap.xml entry, no
// localization into dist/en/**, no PWA manifest shortcut, and (via
// isOwnerOnlyPage in generate-site.mjs) noindex + no client-side analytics.
//
// Add a page here once and every owner-only surface picks it up
// automatically. Do not hand-roll a second list anywhere else.
//
// WO-4 scope note: source-coverage-gaps.html, regions.html, readiness.html
// and activation.html were NOT added here despite being named in WO-4,
// because scripts/regions-coverage-regression-test.mjs,
// scripts/readiness-trust-regression-test.mjs (which explicitly tags
// `{ base: 'readiness', ownerOnly: false }`),
// scripts/source-coverage-gaps-regression-test.mjs and
// scripts/site-launch-sweep.mjs's launchPages list all deliberately assert
// those four pages ARE public: present in sitemap.xml, the PWA manifest
// shortcuts, and the service-worker precache list. That is pre-existing,
// tested, intentional product behavior from a named feature ("national
// coverage and trust foundations" / "launch readiness"), not an accidental
// leak — see the WO-4 PR description for the full evidence trail. Only
// source-health.html ("fetch health") had zero contradicting test coverage
// anywhere in the codebase, so it is the only page this fix newly hides.
export const OWNER_ONLY_PAGES = new Set([
  'sources.html',
  'methodology.html',
  'trust.html',
  'candidates.html',
  'resolver.html',
  'source-health.html',
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
