// Single source of truth for pages that stay PUBLIC and reachable but are not
// search content: no sitemap.xml entry, no `index,follow`, while keeping their
// English surface alive.
//
// This is a third category, distinct from the two the repo already had:
//   - OWNER_ONLY_PAGES  — must not reach visitors at all (unlinked, delocalized)
//   - public pages      — submitted for indexing
// A venue display screen is neither. It is a tool an organizer opens on a
// monitor in the hall; visitors and organizers must keep reaching it, so
// deleting or hiding it is wrong, but it ships 104 visible words and zero links
// to a crawler because its whole body is fetched at runtime from events.json —
// which robots.txt disallows. Advertising it in the sitemap as indexable content
// is a claim the page cannot honour.
//
// Kept in a shared module, not inlined, because three places must agree:
//   1. writeSitemap (generate-site.mjs)          — must not submit it
//   2. patchScreenPage / the page's own <head>   — must declare noindex
//   3. publicPathsFromSitemap (generate-localized-site.mjs) — must still build
//      dist/en/<page>, otherwise the localiser's own cleanup deletes the English
//      copy and a published URL dies (AGENTS.md law 10).
export const NOINDEX_PUBLIC_PAGES = new Set([
  'screen.html'
]);
