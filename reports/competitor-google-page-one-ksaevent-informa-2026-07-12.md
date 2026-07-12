# EventLive Competitive Search and Acquisition Review

- Date: 2026-07-12
- Query observed by owner: `فعاليات السعودية`
- Competitors reviewed: Informa Connect Saudi Event Show and KSAEvent
- Decision boundary: competitor pages are market evidence, not republishing sources

## Executive decision

Informa's new page-one appearance is most plausibly a freshness and authority event: its Saudi Event Show site was materially refreshed on 2026-07-09, Google recrawled several pages during the following days, and the page sits inside a very large, internally connected Informa domain with current external demand. This is a strong evidence-based explanation, not a claim that one tag caused the ranking. Google can vary results by time, location, device, and user context.

KSAEvent's durable advantage is different. It has spent years building an Arabic Saudi-events entity graph: more than ten thousand event URLs plus city, place, organizer, and event-type pages, internal linking, an app presence, institutional citations, and frequent editorial updates. Its raw count is not a quality benchmark because its scope also includes international days, salaries, school dates, private programmes, and other records that EventLive should not classify as public attendance events.

EventLive should not scrape KSAEvent or copy its text. The correct competitive move is to resolve useful market signals back to first-party organizers, official news, venues, chambers, and portfolio sitemaps, then publish richer live utility with explicit provenance.

## Why Informa appeared now

### Direct evidence

| Signal | Observation | Search implication |
|---|---|---|
| Recent material update | Both Arabic and English Saudi Event Show sitemaps have `lastmod` 2026-07-09T08:01:37Z | A meaningful update can trigger recrawl and freshness reassessment |
| Exact intent match | Arabic H1 says it is the leading Saudi exhibition for the events industry | Strong lexical and topical match for Saudi event searches |
| Complete event entity | Event JSON-LD includes name, 2026-09-09 to 2026-09-10, Riyadh, attendance mode, daily hours, organizer, image, and URL | Gives Google a clear, date-complete event entity |
| Large host authority | Informa exposes 1,732 event-site sitemaps, 22,336 interest URLs, and 30 brand URLs | Strong internal discovery and established domain-level signals |
| Topical cluster | The Arabic site has 49 indexed routes and the English site has 140, including agenda, speakers, sponsors, awards, and registration pages | The ranking page is supported by a real event cluster, not an isolated landing page |
| Current demand | Active LinkedIn posts, 7,000+ followers, partners, exhibitors, speakers, and third-party event listings | Current branded searches and citations reinforce relevance |

### What did not cause it alone

- Event schema does not guarantee ranking or a rich result.
- `changefreq=daily` is only a hint and is not a ranking switch.
- The page is not technically perfect: the Arabic page still has an English meta description, many images lack useful alt text, and the HTML response is roughly 1 MB.
- The page may move again because broad result positions are volatile.

### Measurement rule

Track the query in Search Console by page, country, device, impressions, clicks, CTR, and average position. A manual daily search is useful as a spot check but is not a stable rank-measurement system.

## What KSAEvent has today

The following counts were observed from its public sitemaps during this review:

| Public entity | KSAEvent | EventLive current gap |
|---|---:|---|
| Event URLs | 10,404 | EventLive has a smaller, stricter verified catalog |
| City pages | 113 | EventLive has 34 public city pages |
| Place/location pages | 1,062 | EventLive does not yet publish venue detail pages |
| Organizer pages | 112 | EventLive does not yet publish organizer detail pages |
| Event-type pages | 29 | EventLive has 12 category pages |
| Historical depth | Since 2022 | EventLive has ended events but less accumulated authority/history |

### Product and search advantages

- Every event has a leaf URL with dates, countdown, logistics, map, category, related events, sharing, and often an official link.
- City, location, organizer, type, and related-event links create a dense crawl graph.
- Frequent new or modified pages keep the site visibly active.
- Android/app listings strengthen the brand entity outside the website.
- External institutional citations exist; Qassim Chamber publications have linked to its event pages.
- User login, saved interactions, comments, reminders, and app routes create repeat-use signals.

### Where EventLive is already stronger

- Explicit source provenance and trust tiers.
- Bilingual Arabic and English architecture.
- Live attendance utility, session schedules, countdowns, maps, and calendar files.
- Strict separation between public events, application deadlines, programmes, and discovery-only leads.
- Official-source automation rather than competitor republication.
- Smaller pages and faster first response than both reviewed competitors in the same simple network sample.

## How KSAEvent likely acquires events

This is an inference from repeated title-to-source resolution, its terms, and its public submission flow:

1. Editors monitor official announcements, organizer pages, government news, venues, and social signals.
2. A user-submission flow supplies additional leads after login.
3. Editors turn source facts into a longer templated event article.
4. The event is connected to city, place, organizer, and type entities.

Examples resolved to first-party or official origin:

| KSAEvent title signal | First-party origin found | Missing EventLive capability exposed |
|---|---|---|
| Summer SAMoCA JAX 2026 | Saudi Press Agency announcement N2620646 | No broad current SPA event-announcement lane |
| Contractor Prequalification Camp | Muqawil official training detail | Registry points to obsolete `sca.gov.sa` rather than productive Muqawil training pages |
| Buraidah Summer Festival 2026 | Saudi Press Agency announcement N2611519 | Local festival news monitoring is too narrow |
| Children's Book Exhibition 2026 | Ithra first-party programme/form | Some official programme surfaces are not yet connected to the main calendar collector |

## What prevents EventLive from matching acquisition breadth

The blocker is not extraction technology. It is source topology:

1. Some registry endpoints target the institution homepage rather than the productive event system.
2. The system is strongest on calendars but weaker on official news announcements that contain event facts.
3. Organizer portfolio sitemaps were not treated as first-class discovery feeds.
4. Public organizer and venue entity pages are missing, so every new event adds less internal authority than it could.
5. EventLive has not yet built a systematic partner-citation loop asking organizers and venues to link back to their verified EventLive record.
6. KSAEvent can inflate breadth by accepting record types that EventLive correctly blocks.

## Rights and trust boundary

KSAEvent's published terms prohibit copying, redistribution, and automated analysis/reverse engineering. It must remain a manual competitor and gap benchmark. EventLive may independently discover the same public event and publish independently sourced facts from the official origin, with its own summary and source link.

## Implemented in this review

`informa-connect-saudi-events` is now a first-party collector in the recurring source system.

It:

- reads Informa's public site-sitemap index;
- limits discovery to Saudi, Riyadh, and Jeddah portfolio roots;
- fetches at most five event sites concurrently;
- requires first-party Event JSON-LD with explicit start and end dates;
- requires structured Saudi location evidence;
- preserves exact daily hours, organizer, registration route, and 1920-pixel source imagery when present;
- deduplicates Arabic and English editions, preferring the richer record;
- rejects ended events in the normal future-only pipeline;
- rejects cancelled, date-incomplete, non-Saudi, visa, invitation, and form pages;
- enters the same duplicate and trust gates as every other official source.

The live portfolio probe found six date-complete future Saudi events; HRSE KSA already exists in EventLive, leaving at least five official additions available from this one connector:

1. Education Investment Saudi, 2026-12-08 to 2026-12-09.
2. Saudi AI Week, 2026-11-08 to 2026-11-12.
3. Saudi Event Show, 2026-09-09 to 2026-09-10.
4. Saudi Intermobility Expo, 2026-11-30 to 2026-12-02.
5. SuperReturn Saudi Arabia, 2027-01-25 to 2027-01-26.

## Next acquisition order

### P0: immediate breadth

1. Replace the dead Saudi Contractors Authority endpoint with a Muqawil training/detail collector.
2. Add a compliant SPA public-news signal lane that parses public news/article pages and never calls the robots-disallowed `/api` route.
3. Expand official portfolio discovery to other large organizers only when a Saudi location and complete event entity are confirmed.

### P1: compounding search authority

1. Generate public organizer detail pages from canonical organizer entities.
2. Generate public venue detail pages only for venues with enough verified events and unique useful content.
3. Add breadcrumbs and Organization/Place structured data to those pages.
4. Connect every event bidirectionally to city, organizer, venue, category, and related events.

### P2: external authority

1. Offer organizers a verified EventLive event URL and embeddable live schedule.
2. Ask chambers, venues, speakers, sponsors, and organizers to cite that canonical URL.
3. Publish original Saudi event-market insights from EventLive's verified data, not mass-produced event summaries.

## Primary references

- Informa Saudi Event Show: https://informaconnect.com/saudi-event-show/ar/
- Informa site sitemap index: https://informaconnect.com/sitemap-sites.xml
- KSAEvent: https://ksaevent.com/
- KSAEvent terms: https://ksaevent.com/terms-and-conditions/
- Google ranking systems: https://developers.google.com/search/docs/appearance/ranking-systems-guide
- Google helpful content guidance: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Event structured data: https://developers.google.com/search/docs/appearance/structured-data/event
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Official Muqawil training surface: https://muqawil.org/ar/training/info
- Saudi Press Agency: https://www.spa.gov.sa/
