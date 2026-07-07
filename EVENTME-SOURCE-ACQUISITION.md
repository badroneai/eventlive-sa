# EventLive Source Acquisition

Researched at: 2026-07-03

This document defines where EventLive should discover Saudi event supply before creating public catalog records. The machine-readable registry lives in `data/source_registry.json`; discovered event leads should go to `data/source_candidates.json` first.

## Operating Rule

Discovery can become publication automatically when source trust and validation gates are strong enough.

1. official and partner candidates can auto-publish when source evidence, dates, and required fields are complete
2. duplicate matches are blocked automatically
3. aggregator and weak-confidence candidates remain in the queue until a stronger source confirms them
4. validation and build must pass before public output is deployed
5. manual review remains an exception path, not the default operating model

## Priority Lanes

### Lane 1: Official National Sources

- National Events Center / Saudi Events: preferred long-term source of truth; pursue partnership or feed access.
- Saudi Events App: official NEC app destination for seasons, major events, and ticketing links; needs stable feed/API discovery before automation.
- Visit Saudi Calendar: broad visitor-facing Saudi calendar for tourism, seasons, and major public events.
- Ministry of Culture Cultural Calendar: official cultural supply and commission-led events.
- Ministry of Sport Events: official sports supply and hosted sport events.
- Enjoy Saudi Events: official General Entertainment Authority entertainment calendar; prioritize extractor validation after stale-event filtering is solved.
- General Entertainment Authority Events: parent authority source for entertainment verification; dedupe aggressively against Enjoy, Riyadh Season, Jeddah Season, Visit Saudi, and webook.
- Visit Saudi Calendar PDF: official STA reference layer for seasons and destination schedules; parse only for discovery, then reconcile against canonical event pages.
- Saudi Winter Events Calendar: official SPA/STA campaign evidence for winter seasons; use as context only until every item is reconciled to a canonical event page.
- Riyadh City Events: official city-level Riyadh events from riyadh.sa; build only after dynamic listing and duplicate handling are verified.

### Lane 2: High-Volume Marketplaces

- webook Explore: ticketed entertainment, sports, concerts, shows, and major seasons.
- Hala Yalla: experiences, tours, sports, exhibitions, conferences, and organizer ticketing.
- Platinumlist Jeddah: Jeddah-focused ticketed activities and entertainment.

### Lane 3: Destination And Organizer Calendars

- Experience AlUla Events: AlUla destination events, festivals, concerts, races, exhibitions, and seasonal programs.
- MDLBEAST Events: music festivals and branded events such as Soundstorm, XP Music Futures, Balad Beast, and Azimuth.
- Monsha'at All Events: entrepreneurship, SME support, Biban, themed weeks, forums, competitions, and online events.
- Invest Saudi Events: investment, sector, and trade events.
- Tuwaiq Academy Bootcamps and Programs: official technology bootcamps, professional programs, and emerging-technology training.
- CODE MCIT Programs: official digital entrepreneurship programs, incubators, accelerators, competitions, and technology bootcamps.
- Riyadh Season Official: official season destinations, shows, concerts, attractions, and entertainment experiences.
- Visit Saudi Seasons: Saudi season pages and visitor-facing season evidence that complements the Visit Saudi Calendar.
- Saudi Pro League Fixtures: official football fixture source; prioritize a fixture extractor or SPL/SAFF data partnership before public match rows.
- NEOM Newsroom Events: official NEOM event evidence; auto-publish only Saudi-hosted or public NEOM-hosted events, with global appearances kept evidence-only.
- Aseer Season / Asir Development Authority: official authority evidence for Aseer season programming; complements Discover Aseer and stays evidence-first until the live calendar shape is confirmed.
- Jeddah Season: major season lane for Jeddah entertainment, waterfront, and cultural experiences; ignore inactive or archived pages.
- Qiddiya Events: strategic future entertainment/sports source; evidence-only until live public event pages or a calendar endpoint exists.
- Sela and Saudi Entertainment Expo: entertainment-industry and venue source; monitor as evidence and partnership target until per-event schedules are stable.
- Diriyah Season: prepare ingestion for the next live season, but never publish coming-soon pages as live events.
- Visit AlBalad / Historic Jeddah: official Jeddah heritage lane for AlBalad public events.
- Discover Aseer Events: southern Saudi destination lane; monitor for stable current calendar structure.

### Lane 4: Venue And Industry Discovery

- RFECC What's On: Riyadh Front venue calendar and exhibition highlights.
- RICEC Events: Riyadh International Convention and Exhibition Center calendar for exhibitions, trade shows, and venue-hosted conferences.
- Jeddah Chamber Exhibitions and Events Center: Jeddah exhibitions, forums, chamber activities, and roadshows.
- Dhahran Expo Calendar: Eastern Province venue calendar for exhibitions, conferences, and trade shows.
- Ithra Events: official cultural venue supply for Dhahran and Eastern Province culture, creativity, and learning programs.
- Eye of Riyadh Events: broad Saudi/regional business, conferences, exhibitions, forums, summits, and training.
- 10times Saudi Arabia: broad international event directory for Saudi trade shows and conferences.
- ExpoFP and Eventseye Saudi Trade Shows: additional aggregator discovery for trade shows; verify every row against official venue or organizer evidence.
- Eventbrite Saudi Arabia: community, meetup, workshop, and long-tail events.
- Saudi Space Agency Events: official space/science event lane; root access may be blocked, so detail pages must carry evidence.
- CST Events and News: technology, communications, and space-sector signals; news-only items remain source evidence until event fields are complete.
- Saudi Water Authority Events: sector-government source for water, sustainability, awards, and workshops.
- SFDA Events: healthcare, food, pharma, and regulatory event discovery from an official authority.
- Saudi Contractors Authority Events: construction and infrastructure sector events, including forum and workshop signals.

### Lane 5: Online And Technology Training

- Future Skills MCIT Catalogue: official digital-skills catalogue, live interactive courses, and online technology training.
- Tuwaiq Academy: also feeds this lane when programs are online or technology-focused.
- Misk Hub Programs: youth skills, career readiness, leadership, entrepreneurship, and online professional-development programs.
- Misk Hub Events: separate event lane for Misk tours, skills sessions, career events, and youth experiences; registration closing dates must not become event end dates.
- Saudi Digital Academy: digital training programs and technology bootcamps; registered now, with extractor pending after stable access is verified.
- SDAIA Academy Programs: official AI, data, and emerging-technology bootcamps; registered now, with extractor pending current-card validation.
- SDAIA Calendar and Events: authority-level SDAIA conferences, AI/data events, workshops, and EventID-backed detail pages; separate from academy bootcamps.
- CODE MCIT Programs: digital entrepreneurship, gaming, incubator, accelerator, and innovation programs; current extractor only publishes date-complete future ranges.
- Ministry of Culture Commission Calendars: music, heritage, architecture, design, and commission-level cultural calendars that extend the main MoC calendar.
- Saudi Universities and Technical Colleges: discovery lane for academic conferences, public lectures, research workshops, and technical-college programs; split into institution-specific sources before automation.
- Monsha'at Academy Programs: separate SME training lane from Monsha'at public events; likely needs partnership or login-aware access for complete schedules.
- Meetup and Facebook Events Saudi Arabia: grassroots discovery only; community events require secondary verification before publication.

## Intake Policy

- Official sources can create higher-confidence candidates, but still need duplicate review.
- Marketplaces are discovery and ticket-link sources; verify against organizer or official event pages before publishing.
- Aggregators are never final proof on their own.
- Community platforms start at `source-evidence` gate.
- Venue calendars need organizer confirmation before EventLive marks a schedule as live-ready.

## Periodic Ingestion Model

EventLive uses source rings instead of treating all registered sources equally:

- `active-collector`: sources with working conservative extractors. Run once daily (03:17 UTC / 06:17 Riyadh) through `npm run sources:sync`.
- `extractor-backlog`: official or strategic sources that need a source-specific extractor before automated publication.
- `venue-dedupe`: venue calendars and venue-like sources that are useful discovery anchors but require organizer and duplicate reconciliation.
- `evidence-monitor`: sources that provide campaign, newsroom, coming-soon, or contextual evidence but should not create event rows directly.
- `partnership`: sources where an API, feed, or permission path is required before automation.
- `discovery-only`: marketplaces, aggregators, and community platforms used only for leads or ticket links.

Generate the current plan with:

```bash
npm run sources:plan
```

The plan writes:

- `reports/source-ingestion-plan.md`
- `reports/source-ingestion-plan.json`

`sources:sync` now refreshes this plan before collection, auto-publication, validation, build, and source operations reporting.

## Next Implementation Slice

Build a source collector that reads `data/source_registry.json`, fetches one source at a time, and writes normalized event leads into `data/source_candidates.json` with:

- source URL
- evidence URL or raw snapshot path
- title, city, venue, date range
- confidence
- duplicate match hint
- publication gate

Current periodic command:

```bash
npm run sources:sync
```

`sources:sync` runs collection, trusted auto-publish, validation, build, and source operations reporting.

Collector-only command:

```bash
npm run sources:collect
```

The current collector supports conservative extraction from the currently readable HTML sources:

- Visit Saudi Calendar
- Monsha'at All Events
- Eye of Riyadh Events
- MDLBEAST Events, when date-complete cards are available in the public HTML
- Eventbrite Saudi Arabia as candidate-only community discovery
- Tuwaiq Academy Bootcamps and Programs through the official public initiatives endpoint
- Future Skills MCIT Catalogue through date-complete course cards
- CODE MCIT Programs when open programs expose date-complete ranges
- Misk Hub Programs by following detail pages for `Program Start/End Date`; application deadlines remain source-evidence only when program dates are unavailable

It writes raw evidence snapshots to `data/raw/source-snapshots/` and a run report to `reports/source-collection-report.md`.

Riyadh Season and Visit Saudi Seasons are now registered as official strategic sources. The current collector keeps them as monitored sources until a stable date-complete page, feed, or API is available, so the platform does not publish incomplete seasonal records.

Misk Hub listing cards expose application closing dates, but the collector follows each detail page and only treats `Program Start/End Date` as a publishable schedule. EventLive should not treat an application deadline as the event schedule when detail-page dates are missing.

Source-research batch 1 added Dhahran Expo, Ithra, Saudi Digital Academy, and SDAIA Academy to the registry. They are intentionally not enabled in the collector until their current public HTML/API structure is confirmed to expose date-complete records without relying on stale news or application deadlines.

Source-research batch 2 mostly confirmed already-covered priorities and added two official strategic channels: Saudi Events App and Enjoy Saudi Events. Both are registered as high-value official sources, but they should not auto-publish until EventLive confirms a stable source endpoint and filters out stale event detail pages.

Source-research batch 3 added thirteen strategic official or partner lanes: Misk Hub Events, JCCI, SPL fixtures, NEOM, Saudi Space Agency, CST, Visit Saudi PDF, Qiddiya, Sela/SEA Expo, MoC commission calendars, Historic Jeddah/AlBalad, Discover Aseer, and Diriyah Season. These sources are intentionally registry-first; extractor work should start only when the source exposes complete event fields or a reliable detail-page pattern. Newsrooms, coming-soon pages, global appearances, PDFs, and future venue announcements stay evidence-only until reconciled against a canonical event page.

Source-research batch 4 mostly reconfirmed existing top priorities and added nine missing lanes: RICEC, Aseer Season/ASDA, Jeddah Season, Saudi Water Authority, Saudi university events, ExpoFP/Eventseye, Meetup/Facebook community discovery, SFDA, and Saudi Contractors Authority. The operating split is clear: official sector authorities can move toward extraction when event fields are complete; venue and trade-show aggregators require duplicate/official confirmation; university and community lanes remain discovery-only until they are broken into verified institution or organizer sources.

Source-research batch 5 reconfirmed the primary national, season, training, and marketplace priorities and added three focused lanes: Saudi Winter Events Calendar, Riyadh City Events, and Monsha'at Academy Programs. Wafy was mentioned only as part of an aggregator bundle with a coming-soon URL, so it remains documented as not operationally added until a stable events page exists.

Source-research batch 6 reconfirmed 22 high-priority sources and added two operationally distinct official lanes: General Entertainment Authority Events and SDAIA Calendar and Events. It also refined canonical paths for Monsha'at Events (`/en/events-list`), RFECC (`/whats-on/`), Riyadh Season (`/en/explore`), Hala Yalla (`/sa-en/ticketing`), and Riyadh City Events (`/en/events/all`). Future Skills `/en/calendar` is documented as a next extractor target, while the current catalogue URL remains in place because it already powers the existing collector.

## Auto Publish Gate

Trusted candidates are published without manual approval by:

```bash
npm run sources:auto-publish
```

Auto-publish allows:

- `confidence`: `official`
- `confidence`: `partner`, unless `EVENTLIVE_AUTO_PUBLISH_PARTNER=0`

Auto-publish blocks:

- ended candidates
- missing evidence
- missing required public fields
- duplicates already in `data/events_catalog.json`
- `source-evidence` and `extraction` publication gates
- `public-listing`, `social-signal`, and `unverified` candidates
- `rejected` or `blocked` candidates

The report writes `reports/source-auto-publish-report.md`.

Auto-published catalog records keep `source_url` and `evidence_url` so public event pages, trust feeds, and source feeds can show the official source without treating it as a live EventLive schedule URL.

## Exception Review Gate

Manual review is still available as an exception path for sources that are not strong enough for automatic publishing:

```bash
EVENTLIVE_REVIEW_ID=candidate-id EVENTLIVE_REVIEW_ACTION=ready-for-review npm run sources:review
```

Supported actions:

- `needs-evidence`
- `evidence-captured`
- `needs-extraction`
- `ready-for-review`
- `approve-catalog`
- `reject`
- `block`

Useful optional fields:

```bash
EVENTLIVE_REVIEW_ID=candidate-id \
EVENTLIVE_REVIEW_ACTION=approve-catalog \
EVENTLIVE_REVIEWER="EventLive Operations" \
EVENTLIVE_REVIEW_NOTES="Source checked and fields approved." \
npm run sources:review
```

Use `EVENTLIVE_REVIEW_DRY_RUN=1` to write only `reports/source-review-report.md` without changing the queue.

## Manual Promotion Gate

Manual promotion is kept for exceptional cases. After review, mark a candidate with:

- `review_status`: `approved-for-catalog`
- `publication_gate`: `catalog-review`

Then promote one reviewed candidate:

```bash
EVENTLIVE_PROMOTE_IDS=candidate-id npm run sources:promote
```

Or promote every approved candidate:

```bash
EVENTLIVE_PROMOTE_ALL=1 npm run sources:promote
```

The promotion command writes catalog records to `data/events_catalog.json`, updates `matched_catalog_event_id` on promoted candidates, and records `reports/source-promotion-report.md`. Use `EVENTLIVE_PROMOTE_DRY_RUN=1` to inspect the report without changing data.

## Operations Report

After collection, review, or promotion, generate the unified source operations board:

```bash
npm run sources:ops
```

The report writes:

- `reports/source-ops-report.md`
- `reports/source-ops-report.json`
- `reports/source-ops-report.html`

Use it to decide the next executive action: add an extractor, improve a zero-yield source, review duplicates, promote approved candidates, or pause publication until evidence improves.
