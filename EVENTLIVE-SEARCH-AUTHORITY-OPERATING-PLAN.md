# EventLive Search Authority Operating Plan

## Purpose

Turn technical crawl readiness into durable search and AI authority without fabricating event details, publishing discovery-only records, or using artificial link schemes.

## Operating roles

1. **Technical SEO operator**: keeps verification, sitemap, canonical, hreflang, Event schema, IndexNow, robots, and crawl status healthy.
2. **Event data editor**: improves active pages in priority order: official image, useful description, verifiable place, then live schedule.
3. **Original-data publisher**: republishes `saudi-events-insights.html` and `saudi-events-insights.json` from the public catalog on every build.
4. **Authority partnerships lead**: uses `owner-search-growth.html` to prioritize official feeds, corrections, editorial citations, and organizer relationships. No automated outreach or link exchange.
5. **Search measurement owner**: reviews Search Console and Plausible weekly and records decisions from queries, indexed pages, click-through rate, landing pages, and visitor actions.

## Six-hour cycle

The existing source workflow runs collection, trust gates, publication, validation, and `npm run build`. That build now also:

- refreshes the Saudi events pulse;
- recalculates active-page completeness;
- rebuilds the enrichment priority queue;
- rebuilds source authority opportunities;
- regenerates Arabic and English routes, structured data, sitemap, and AI discovery files.

No owner action is required for those calculations. Human review remains required only for external outreach, partnerships, or facts that cannot be confirmed from source evidence.

## Weekly decision loop

- Confirm Search Console ownership and sitemap success.
- Compare weekly Search Console performance against `data/search_visibility_baseline.json`; use impressions, clicks, CTR, average position, queries, and landing pages as the primary ranking evidence.
- Compare indexed event pages with submitted event pages.
- Review queries with impressions but weak click-through rate and improve title/description only where the page satisfies that intent.
- Work the highest-priority active records in `owner-search-growth.html`.
- Contact the highest-value official domains for feeds, corrections, organizer attribution, or editorial citation.
- Review city and category gaps in the public pulse and source coverage board.

## Ranking baseline

- The first controlled Google baseline is documented in `reports/search-visibility-baseline-2026-07-12.md` and `data/search_visibility_baseline.json`.
- Search Console is checked weekly using a consistent 28-day comparison window after data processing starts.
- A non-personalized Saudi Google sample is repeated monthly with the same query registry and page limits.
- Manual rank samples never override Search Console evidence and stop when Google presents a CAPTCHA.

## Guardrails

- Page count is inventory, not authority by itself.
- Do not invent schedules, venues, images, availability, or registration links.
- Do not publish discovery-only candidates as verified events.
- Do not buy, exchange, or mass-generate followed links.
- Preserve the official source and EventLive canonical URL on every event page.
- Optimize for an attendance decision first; search visibility follows useful, reliable pages.

## Success measures

- Search Console property verified and sitemap accepted.
- Increasing indexed event and city pages without crawl or schema errors.
- Increasing non-branded impressions and clicks for Saudi city/date/category intent.
- Higher source-image, useful-description, verifiable-place, and live-schedule coverage among active events.
- More official feeds, correction channels, organizer claims, and genuine editorial citations.
