# EventLive SEO Competitor Strategy - Saudi Events Platforms

Generated at: 2026-07-09

## Executive Decision

EventLive should not try to beat the first-page Saudi event platforms by copying their content. It should beat their weak points:

- richer event schema than most public pages reviewed,
- canonical event detail pages for every public record,
- Arabic intent pages for what users actually search,
- visible source trust and update freshness,
- AI-readable public files that distinguish confirmed events from discovery-only signals.

The strongest competitor pattern is not one technology. It is search intent coverage:

- today,
- tomorrow,
- weekend,
- this month,
- Riyadh,
- Jeddah,
- tickets and registration,
- exhibitions and conferences,
- sports and matches,
- free events.

## Competitor SEO Findings

| Platform | Useful pattern | Weakness EventLive can exploit | EventLive action |
| --- | --- | --- | --- |
| SCEGA ePortal | Official exhibitions/conferences language and calendar UI | no meta description, no canonical, no JSON-LD on reviewed page | create stronger exhibitions/conferences landing page with schema |
| NEC | institutional authority and national-event language | no canonical or JSON-LD on reviewed home page | use trust language and partnership positioning, not scrape |
| Visit Saudi Calendar | strong title/description/canonical around "Saudi Calendar" | no Event JSON-LD detected on reviewed rendered page | keep as source, compete through richer event detail pages |
| webook Explore | direct filters for today/tomorrow/region/category/price | marketplace and protected surface; shallow description | copy intent structure, not event content |
| Enjoy Saudi | official entertainment authority signal | protected by access layer in terminal/browser probe | treat as authority evidence/partnership lane |
| GEA Events | authority-of-record for entertainment | protected by access layer in terminal/browser probe | use as confirmation source, not crawler target |
| Evento | strong commercial title and visible filters for today/tomorrow/week/month | no canonical or JSON-LD detected; app/API surface is commercial | create pages for ticketed/registration intent and keep Evento discovery-only |
| Ministry of Commerce | government trust, upcoming/month/year event framing | thin meta, no JSON-LD detected, low yield | use "upcoming/month/year" framing on EventLive pages |

## Implemented EventLive SEO Moves

Added public search-intent landing pages generated from the live catalog:

- `saudi-events-tomorrow.html`
- `saudi-events-weekend.html`
- `saudi-events-this-month.html`
- `saudi-ticketed-events.html`
- `saudi-conferences-exhibitions.html`
- `saudi-sports-matches.html`
- `free-saudi-events.html`

Strengthened every generated public page head:

- canonical URL,
- `hreflang="ar-SA"` and `x-default`,
- rich-result-friendly robots directives,
- OpenGraph updated time,
- RSS, JSON Feed, and ICS alternates,
- WebSite SearchAction JSON-LD.

Protected the work with regression tests:

- `test:seo-content`
- `test:seo-structured-data`
- `test:ai-search-readiness`

## Operating Rule

Use competitors as an SEO map, not as a data source.

EventLive publishes from official, verified, or trusted evidence. Marketplaces and protected platforms can influence:

- landing page taxonomy,
- duplicate detection,
- ticket-link corroboration,
- partnership priorities,
- search-intent coverage.

They do not become automatic publish sources unless the source policy changes through a documented agreement or a confirmed official feed.

## External Guidance Used

- Google Search Central: Event structured data guidance.
- Google Search Central: General structured data guidelines.
- Google Search Central: Optimizing for generative AI features on Google Search.

