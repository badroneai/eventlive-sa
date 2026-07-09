# Platinumlist Deep Recon - EventLive

Generated at: 2026-07-09

## Executive Decision

Platinumlist is valuable for EventLive as a discovery and competitive-intelligence source, not as a direct auto-publish source. The platform exposes many Saudi event and experience URLs, rich card images, city pages, and category/date routes, but it is a ticketing marketplace and direct HTTP access is protected by Queue-it/Cloudflare for Saudi pages and calendar endpoints.

EventLive operating rule:

- Use Platinumlist leads to find missing events, enrich image/search clues, and detect category/city gaps.
- Do not auto-publish Platinumlist marketplace events without secondary official verification from organizer, venue, government entity, or trusted official source.
- Treat recurring attractions/experiences differently from dated live events.

## What Was Explored

| Surface | Finding | EventLive use |
|---|---|---|
| Riyadh today page | Rendered Arabic event cards, date/category links, event-ticket links, prices, CDN images | High-value lead discovery |
| Jeddah weekend page | Rendered Arabic event cards and more weekend/activity leads | High-value lead discovery |
| render-line-calendar endpoint | Visible in browser network, but direct curl redirects to Queue-it | Browser-probe only; no bypass |
| Global sitemap | Saudi city subdomain network and category/date taxonomy | SEO and source coverage map |
| Stored browser snapshots | 4 Platinumlist snapshots parsed into structured leads | Repeatable discovery report |

## Current Extraction Yield

Source artifact: `reports/platinumlist-snapshot-leads.md`

| Metric | Count |
|---|---:|
| Browser snapshots scanned | 4 |
| Rich card leads | 27 |
| Link-only discovery leads | 48 |
| Total unique event URLs | 75 |
| Rich leads with high-resolution image URL | 27 |

By city:

| City | Rich card leads | Link-only leads | High-resolution image leads |
|---|---:|---:|---:|
| Jeddah | 17 | 26 | 17 |
| Riyadh | 10 | 22 | 10 |

## Detail Page Radar Yield

Source artifact: `reports/platinumlist-detail-radar.md`

| Metric | Count |
|---|---:|
| Detail pages probed | 19 |
| Protected/blocked detail pages | 0 |
| Detail pages with live timing lines | 8 |
| Detail pages with high-resolution image | 19 |
| Event schema blocks found | 0 |

Radar kinds:

| Radar kind | Count | Meaning |
|---|---:|---|
| live-timing-event-radar | 8 | Highest-value leads for EventLive live attendee mode after secondary verification |
| dated-event-radar | 3 | Event/date leads that need exact time enrichment |
| ongoing-experience-radar | 8 | Attractions, beach clubs, fan zones, tours, and recurring experiences; keep separate from live event counters |

Taxonomy radar:

| Facet | Count | EventLive action |
|---|---:|---|
| sports-fanzone-match | 6 | Candidate sports/fan-zone category refinement |
| entertainment-shows-nightlife | 7 | Candidate entertainment/nightlife refinement |
| business-conference-workshop | 2 | Candidate business/workshop refinement |
| attraction-tour-experience | 8 | Future experiences lane; not a normal event counter today |

The taxonomy is now stored as a development radar in `data/platinumlist_taxonomy_radar.json`.

## Platform Route Radar Yield

Source artifact: `reports/platinumlist-platform-radar.md`

This pass explored platform surfaces that are not just event cards or detail pages: time-intent routes, category routes, smaller city routes, season pages, organizer routes, and sitemap routing.

| Metric | Count |
|---|---:|
| Platform routes probed | 24 |
| Protected/blocked routes | 0 |
| Unique event links observed | 113 |
| City/host network observed | 24 |
| Routes with organizer CTA signals | 22 |

Most valuable route patterns:

| Pattern | EventLive implication |
|---|---|
| city + today | Build and protect high-quality city live pages |
| city + weekend | Strong SEO and user-planning page type |
| city + month | Useful for broader discovery and indexing |
| city + today + category | High-intent pages such as Riyadh today comedy, sport, gaming |
| city + all events | Broad crawlable inventory page |
| organizer CTAs across event routes | Organizer acquisition should be a visible product lane, not hidden admin copy |

Additional finding:

- `/ar/event/add` redirects toward login, which indicates the marketplace uses organizer self-service as a data/revenue acquisition loop.
- Smaller city surfaces such as Khobar, Dammam, AlUla, and Aseer exist and produced discovery links, so EventLive city coverage should not be Riyadh/Jeddah-only.
- The platform did not expose reliable Event JSON-LD in the detail sample; EventLive should lean into trustworthy structured data as a competitive advantage.

## Example High-Value Leads

These are discovery leads only until verified elsewhere:

| City | Lead | Signal |
|---|---|---|
| Riyadh | PFL MENA 10 | Dated sports/event lead with image |
| Riyadh | The Backyard - World Cup Screening | Dated fan-zone lead with image |
| Riyadh | Melotech presents Mojie | Dated music/nightlife lead with image |
| Riyadh | Whats On Saudi Arabia Awards 2026 registration | Business/awards lead |
| Jeddah | Saudi Arabia vs Qatar FIBA qualifier | Sports lead |
| Jeddah | Acting workshop in Jeddah | Training/workshop lead |
| Jeddah | Stand-up comedy night | Dated entertainment lead |
| Jeddah | Village Resort beach/lLadies day | Extended experience lead |

## Saudi Coverage Map Found In Platinumlist Sitemap

Priority city/event subdomains discovered:

Abha, Al Ahsa, Al Bahah, Al Jawf, Al Jubail, Al Kharj, Al Namas, Al Qatif, Al Qunfudhah, Al Ula, Al-Haridhah, Alhada, Arar, Aseer Season, Bisha, Buraydah, Dammam, Dhahran, Durrat Al Arus, Esports World Cup, Hafer Albatin, Hail, Jeddah, Jizan, Khamis Mushayt, Khobar, Madina, Makkah, Najran, Riyadh, Tabuk, Taif, Yanbu.

EventLive use:

- Add these to the source coverage radar, not necessarily all as active collectors immediately.
- Use them as city gap checks after every official-source import.
- Start with Riyadh, Jeddah, Khobar/Dammam/Dhahran, AlUla, Aseer, Makkah/Madina, then expand.

## Taxonomy Patterns To Reflect In EventLive

Platinumlist ranks because it has strong public landing pages for intent clusters:

- city + today
- city + this weekend
- city + this month
- all events
- concerts
- shows/theater
- business events
- sports
- comedy
- nightlife
- gaming/esports
- exhibitions
- attractions/experiences
- fan zones / World Cup

EventLive action:

- Keep our live-first pages as the core difference.
- Build/strengthen pages such as `/riyadh-events-today.html`, `/jeddah-events.html`, `/this-week.html`, `/weekend.html`, and category/city feeds.
- Do not copy marketplace positioning; EventLive should say: official/verified schedule, live countdown, what is happening now, and source transparency.

## Technical Boundary

Direct fetch example for a calendar render endpoint redirected into:

`https://queue.platinumlist.net/?c=platinumlist&e=protectsaudi...`

This means:

- No raw curl collector should be promoted for Platinumlist calendar endpoints.
- Playwright browser probe can capture rendered evidence when the public page is accessible.
- Any data from these pages remains `candidate-only`.
- Partnership/API is the durable path for direct recurring marketplace ingestion.

## Added Project Capability

New command:

```bash
npm run sources:platinumlist:leads
```

New detail radar command:

```bash
npm run sources:platinumlist:details
```

New regression gate:

```bash
npm run test:platinumlist-leads
npm run test:platinumlist-detail-radar
```

Outputs:

- `reports/platinumlist-snapshot-leads.json`
- `reports/platinumlist-snapshot-leads.md`
- `reports/platinumlist-detail-radar.json`
- `reports/platinumlist-detail-radar.md`
- `reports/platinumlist-platform-radar.json`
- `reports/platinumlist-platform-radar.md`
- `data/platinumlist_taxonomy_radar.json`

The parser extracts:

- event URL
- title
- city
- date text
- price text
- labels/urgency
- all CDN image URLs
- best high-resolution image URL
- policy flag: `candidate-only`
- guard flag: `publishable_without_secondary_verification: false`

The detail radar extracts:

- page title
- city
- date lines
- live timing lines such as doors open and show starts
- venue/location hints
- price hints
- CDN image candidates
- best high-resolution image URL
- radar kind
- taxonomy radar facets

## Next Operating Move

1. Run browser probe for Platinumlist city routes when needed.
2. Run `npm run sources:platinumlist:leads`.
3. Feed the resulting URLs into a secondary verification queue.
4. Promote only events verified from official organizer/venue/source pages.
5. Use link-only leads to prioritize missing categories and city coverage.
6. Keep Platinumlist in EventLive as a competitive radar and partnership candidate.
