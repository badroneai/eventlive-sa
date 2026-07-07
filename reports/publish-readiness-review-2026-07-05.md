# EventLive Publish Readiness Review

Date: 2026-07-05
Domain: eventme.live

## Decision

EventLive is materially closer to a real public launch candidate after this cycle. The public surface now has a consistent platform shell across the key user pages, SEO/AI helper pages, organizer guidance, richer event imagery, and a green source-health gate.

Recommended launch posture: preview-ready and staging-ready. Production can proceed after owner review of the final generated `dist/` output and deployment settings.

## Current Product Metrics

| Metric | Value |
|---|---:|
| Public events in built site | 218 |
| Source catalog records | 80 |
| Ended events treated as normal ended events | 137 |
| Source candidates | 113 |
| Events with source images | 57 |
| Live-ready schedules | 36 |
| Sessions represented | 191 |
| Cities represented | 16 |
| Categories represented | 54 |
| Sitemap URLs | 357 |

Cities currently represented: Abha, AlUla, Aseer, Buraydah, Dammam, Dhahran, Diriyah, Jeddah, Jubail, Makkah, Nationwide, Online, Qatif, Riyadh, Saudi Arabia, Thuwal.

## Design Generalization

Final Playwright audit:

- Pages checked: 14.
- Viewports checked: 28 desktop/mobile combinations.
- Result: PASS.
- Console errors: 0.
- Broken images: 0.
- Horizontal overflow: 0.
- Shared platform header present: 28/28.
- Old topbar removed from audited pages: 28/28.
- Screenshots: `output/playwright/publish-audit-final/`.

Covered pages: home, events, today, today-events, this-week, city Riyadh, category conference, audience tech, event detail, organizers, guides, trust, sources, source-health.

Additional chamber-source visual audit after this cycle:

- Pages checked: events browse, Makkah city, Buraydah city, Abha city, source-health.
- Viewports checked: desktop and mobile.
- Result: PASS.
- Console errors: 0.
- Broken images: 0.
- Horizontal overflow: 0.
- Screenshots: `output/playwright/chamber-cycle-audit-final/`.

Additional CODE source visual audit after this cycle:

- Pages checked: home, events browse, CODE event detail, Online city, Riyadh city, Jeddah city.
- Viewports checked: desktop and mobile.
- Result: PASS.
- Console errors: 0.
- Broken images: 0.
- Horizontal overflow: 0.
- Screenshots: `output/playwright/code-cycle-audit/`.

## SEO And AI Readiness

Added generated explanatory pages:

- `guides.html`
- `guide-live-events-saudi.html`
- `guide-event-sources-methodology.html`
- `guide-organizers-live-schedule.html`
- `guide-saudi-events-data.html`

Added machine-readable helper files:

- `llms.txt`
- `ai-policy.txt`

Sitemap now includes the new guide pages. Structured data is generated for guide/article pages and organizer FAQ/service context.

## Source Engine State

Latest source cycle:

| Metric | Value |
|---|---:|
| Registered sources | 58 |
| Active collectors | 25 |
| Sources attempted | 29 |
| Productive sources | 18 |
| Collection coverage | 50% |
| Collector errors | 0 |
| Candidates discovered this run | 120 |
| Candidates written | 125 |
| Ended events written | 140 |
| Auto-publish linked existing | 80 |
| Auto-publish new | 0 |
| Auto-publish blocked | 45 |

Important governance change: Eventbrite and Eye of Riyadh are discovery-only. They do not count as active collectors and do not publish directly. Eventbrite connection failure now records as skipped discovery-only, not as a release-blocking collector error.

Operational hardening added this cycle: source collection HTTP calls now use a shared timeout (`EVENTLIVE_SOURCE_FETCH_TIMEOUT_MS`, default 20 seconds) so one slow official source cannot stall the scheduled collection lane.

## Image Enrichment

Implemented higher-quality image selection:

- Reads `srcset` and `data-srcset`.
- Supports higher-quality source image hosts such as Scene7 and DatoCMS assets.
- Picks highest-scoring candidate instead of first image.
- Visit Saudi `bannerImages` are now mapped to high-resolution Scene7 URLs.

Current image coverage is 58/221 public events. This improved again after adding chamber-source imagery, CODE detail-page imagery, and applying `referrerpolicy="no-referrer"` to external event images to prevent hotlink/referrer breakage.

Latest launch-audit hardening: generated cards, discovery cards, and event detail pages now include image failure fallbacks so an external CDN failure does not leave a broken visual in the visitor experience.

Latest image reliability cycle: added an EventLive-local image cache lane.

| Metric | Value |
|---|---:|
| Event images in public build | 58 |
| Images served locally from `/assets/event-images/` | 46 |
| External fallback images remaining | 12 |
| Image cache manifest entries | 43 |
| Image cache targets | 49 |
| Image cache failed fetches | 6 |

The new commands are `npm run images:cache` and `npm run images:refresh`. The build now reads `data/event_image_cache_manifest.json` and uses local image paths when available while preserving `original_image_url` / `image_source_url` for source evidence. Regression coverage: `npm run test:image-cache`. Latest Playwright audit on `events.html`: 58 visible images, 46 local images, 0 completed broken images, no horizontal overflow. Screenshot: `output/playwright/launch-audit/events-local-images.png`.

## Validation

Passed:

- `npm run validate`
- `npm run test:source-extractors`
- `npm run test:source-plan`
- `npm run test:source-collection-delta`
- `npm run test:source-run-state`
- `npm run test:source-auto-publish`
- `npm run test:source-health-gate`
- `npm run sources:health-gate`
- `npm run test:feeds`
- `npm run test:event-kind`
- `npm run test:audience`
- `npm run test:search`
- `npm run test:city`
- `npm run test:live-ready`
- `npm run test:date-parse`
- `npm run test:dedupe`
- `npm run test:csv`
- `npm run test:validation`

Final post-cycle check:

- `npm run validate`
- `npm run sources:health-gate`
- `npm run build`
- Playwright launch audit on `/`, `/events.html`, `/today.html`, `/organizers.html`, `/guides.html`, and `/event.html`
- No completed broken images and no horizontal overflow found in the audited desktop pages.
- Organizer mobile contrast issue found and fixed; verified in `output/playwright/launch-audit/organizers-mobile-fixed.png`.

CODE post-cycle regression check:

- `npm run test:source-extractors`
- `npm run test:source-plan`
- `npm run test:source-collection-delta`
- `npm run test:source-run-state`
- `npm run test:source-auto-publish`
- `npm run test:source-health-gate`
- `npm run test:event-kind`
- `npm run test:audience`
- `npm run test:search`
- `npm run test:city`
- `npm run test:live-ready`
- `npm run test:date-parse`
- `npm run test:dedupe`
- `npm run test:validation`

## Chamber Coverage Added This Cycle

Confirmed official chamber source lanes added to the registry:

- Makkah Chamber Events: `https://makkahcci.org.sa/events`
- Qassim Chamber Events: `https://qcc.org.sa/events-list`
- Abha Chamber Events: `https://abhacci.org.sa/Events`

Existing chamber source lanes:

- Jeddah Chamber Exhibitions and Events Center
- Asharqia Chamber Events

These new lanes are registered as extraction tasks, not direct publishers, until source-specific extractors prove date, venue, and detail fidelity.

Implemented extractors in this cycle:

| Source | Future candidates | Ended events | Images captured |
|---|---:|---:|---:|
| Makkah Chamber Events | 0 | 10 | 10 |
| Qassim Chamber Events | 1 | 2 | 3 |
| Abha Chamber Events | 0 | 5 | 5 |

The chamber extractors are now in the active collector ring. They remain under duplicate-review governance rather than blind direct publishing.

## CODE Source Detail Enrichment Added This Cycle

CODE MCIT Programs was previously a zero-future-yield source because the listing can expose only a year-level date, and the host may occasionally return an `Unauthorized Access` HTML page after repeated requests. The extractor now opens official program detail pages, preserves detail snapshots, extracts complete program timelines, captures source images and registration links where available, and falls back to the latest valid listing/browser snapshot when the current listing response contains no program cards.

| Source | Future candidates | Ended events | Images captured | Cities |
|---|---:|---:|---:|---|
| CODE MCIT Programs | 0 | 8 | 8 | Online, Riyadh, Jeddah |

The new CODE records are treated as normal ended events in the public site, not as a separate archive surface. They remain under official source governance and human-review publication gate for future candidates.

## Ministry of Culture Source Evidence Added This Cycle

The Ministry of Culture Cultural Calendar now uses the official `OtherEvents/CulturalCalendar` API rather than relying on the empty initial HTML shell. The API currently returns long-running cultural initiatives more than short, moment-based visitor events, so EventLive captures them as source evidence rather than auto-publishing them as live event moments.

| Source | Candidates retained | Publication gate | Images captured | Notes |
|---|---:|---|---:|---|
| Ministry of Culture Cultural Calendar | 12 | source-evidence | 12 | Long-running cultural initiatives kept for evidence and future enrichment, not direct visitor publishing. |

This preserves the source value without weakening the core promise: EventLive publishes confirmed event moments and live-ready schedules, while long-running initiatives remain available to the pipeline as evidence.

## Latest Launch Metrics

| Metric | Value |
|---|---:|
| Public events after build | 221 |
| Future/current events | 81 |
| Ended events presented like normal past events | 140 |
| Events with images | 58 |
| Live schedule ready events | 36 |
| Cities | 16 |
| City pages | 16 |
| Category pages | 54 |
| Audience pages | 12 |
| Sitemap entries | 364 |

## SEO And AI-Readable Event Markup

Reviewed the current Google Search Central Event structured-data guidance and Schema.org Event vocabulary. EventLive already generates one leaf page per event; this cycle strengthened event detail JSON-LD with stable `@id`, `mainEntityOfPage`, Saudi `PostalAddress` where available, `inLanguage`, explicit attendance mode, and a crawlable EventLive-hosted fallback image. This matches the launch rule that structured data must describe visible page content and every event page must remain unique and source-backed.

Additional content/SEO cycle: the guide center now has visible breadcrumbs and `BreadcrumbList` JSON-LD, plus four new intent-focused guides:

- `guide-riyadh-events-live.html`
- `guide-online-tech-courses-saudi.html`
- `guide-summer-events-saudi.html`
- `guide-ended-events-value.html`

These pages are linked from `guides.html`, included in `sitemap.xml`, and protected by `npm run test:seo-content`.

References used:

- Google Search Central Event structured data: https://developers.google.com/search/docs/appearance/structured-data/event
- Google general structured data guidelines: https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- Schema.org Event: https://schema.org/Event
- Google Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article
- Google Breadcrumb structured data: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- Schema.org BreadcrumbList: https://schema.org/BreadcrumbList

## Events Catalog Performance Shell

The full events discovery page no longer duplicates the event catalog inside `events.html`. The page shell now loads `events.json` asynchronously, keeps a friendly Arabic fallback if the feed cannot load, and is guarded by `npm run test:events-shell`.

Because this page now depends on an external feed, `events.json` is also protected inside the PWA service-worker precache by the same regression test.

| Check | Result |
|---|---:|
| `dist/events.html` before shell split | 1,092,435 bytes |
| `dist/events.html` after shell split | 61,751 bytes |
| `dist/events.json` payload | 899,787 bytes |
| Rendered event cards in browser | 221 |
| Images rendered in browser | 58 |
| Local cached images rendered | 46 |
| Broken browser images | 0 |
| Horizontal overflow | No |

Playwright evidence: `output/playwright/events-shell-after-async-feed.png`.

## Arabic Category Label Normalization

The public discovery interface no longer exposes raw category taxonomy labels such as `Accelerator`, `AI entrepreneurship`, `chamber event`, `Sports / Families`, or `technology bootcamp` as visible category chips, filters, or category-page titles. These are now displayed in Arabic while preserving the existing slugs and source data keys for stable URLs.

Protection added: `npm run test:category-labels`.

## Organizer Launch Page Upgrade

The organizer page is now a launch-grade intake and trust page rather than a basic contact surface. It explains when EventLive is appropriate, what the organizer receives, the trusted-source publication boundary, the data contract required before live activation, and operational transparency links.

| Check | Result |
|---|---:|
| Organizer email CTA | Present |
| Data-contract rows | 5 |
| Operational trust links | 4 |
| JSON-LD blocks | 2 |
| Horizontal overflow | No |

Protection added: `npm run test:organizers`.

Playwright evidence: `output/playwright/organizers-launch-page.png`.

## City And Category Discovery Upgrade

City, category, audience, and temporal discovery pages now use a richer discovery shell instead of a flat event list. Each page includes live discovery signals, source and image counts, a focused current/next event panel, calendar subscription CTA, related city/category links, and `CollectionPage` plus `ItemList` JSON-LD.

| Browser Check | Riyadh City | Technology Training |
|---|---:|---:|
| Event cards rendered | 89 | 11 |
| Signal metrics | 6 | 6 |
| JSON-LD blocks | 2 | 2 |
| Horizontal overflow | No | No |
| Raw English category label visible | N/A | No |

Protection added: `npm run test:facet-pages`.

Playwright evidence:

- `output/playwright/facet-riyadh-page.png`
- `output/playwright/facet-technology-training-page.png`

## Event Detail Readiness Upgrade

Event detail pages now include an attendance-readiness panel near the hero. It summarizes whether the event has clear timing, location, directions, calendar, trusted source, image, registration/ticket link, and live schedule readiness. Ended events are treated as retained EventLive records rather than being pushed toward live activation after their date has passed.

| Browser Check | Result |
|---|---:|
| Attendance readiness panel | Present |
| Readiness signals | 8 |
| Sample readiness score | 88% |
| Broken images | 0 |
| Horizontal overflow | No |
| Ended event asks for live activation | No |

Protection added: `npm run test:event-detail`.

Playwright evidence: `output/playwright/event-detail-readiness-page.png`.

## Complete Visual Coverage

Every public event now has an image surface. Source images remain preferred and cached when available; events without source imagery receive a local EventLive-generated SVG cover under `dist/assets/event-covers/`. Generated covers are explicitly marked with `generated_image: true` so they do not masquerade as source photography.

| Image Check | Result |
|---|---:|
| Events in public feed | 221 |
| Events with image URL | 221 |
| Cached source images | 46 |
| External source-image fallbacks | 12 |
| EventLive generated covers | 163 |
| Events still without image | 0 |
| Broken browser images in catalog | 0 |

Protection extended: `npm run test:image-cache`.

Playwright evidence:

- `output/playwright/events-generated-covers.png`
- `output/playwright/events-generated-covers-viewport.png`

## Source Coverage Gap Intelligence

Added a public operational coverage page and machine-readable feed for deciding where the next source-acquisition cycle should focus. This is separate from source health: source health says whether collectors are working, while coverage gaps say which cities, categories, and blocked sources are limiting EventLive's market usefulness.

| Coverage Signal | Result |
|---|---:|
| Public events analyzed | 221 |
| Upcoming/ongoing events | 81 |
| Ended events retained in normal catalog shape | 140 |
| Weak cities detected | 17 |
| Weak categories detected | 53 |
| Source risks detected | 16 |
| Priority queue items | 20 |
| JSON-LD blocks | 1 |
| Horizontal overflow | No |

The first queue items are Jubail, Qatif, business reception, sports championships, and introductory tours. Source-risk actions are now Arabic and explicitly avoid scraping blocked/protected sources; those routes stay as partnership, browser/API investigation, or evidence lanes.

Protection added: `npm run test:source-coverage-gaps`.

Playwright evidence: `output/playwright/source-coverage-gaps-page.png`.

## Launch Sweep Gate

Added a launch sweep gate that checks the main public pages after build for Arabic RTL markup, `eventme.live` canonicals, useful descriptions, OpenGraph `EventLive` identity, PWA manifest links, sitemap inclusion, and leaked legacy/local paths. The build now also removes stale public artifacts from the old delivery/diff/archive surfaces before writing the new launch build.

| Launch Sweep Check | Result |
|---|---:|
| Pages checked | 19 |
| Pages failed | 0 |
| Forbidden stale artifacts | 0 |
| Missing required files | 0 |
| Sitemap missing pages | 0 |

Protection added: `npm run test:site-launch-sweep`.

Report output:

- `reports/site-launch-sweep.json`
- `reports/site-launch-sweep.md`

## Visual Sweep Gate

Added a browser-based visual sweep that serves the generated `dist/` build locally, opens the most important launch pages on desktop and mobile, scrolls each page to trigger lazy images, then checks for horizontal overflow, broken visible images, legacy brand/domain leakage, local path leakage, canonical metadata, descriptions, manifest links, and required page text.

| Visual Sweep Check | Result |
|---|---:|
| Pages checked | 17 |
| Viewports | 2 |
| Browser checks | 34 |
| Failed checks | 0 |
| Screenshots captured | 34 |
| Catalog images loaded in `events.html` | 221 |
| Riyadh city images loaded | 89 |
| Technology training images loaded | 11 |

Protection added: `npm run test:site-visual-sweep`.

Report output:

- `reports/site-visual-sweep.json`
- `reports/site-visual-sweep.md`
- `output/playwright/visual-sweep/*.png`

## Structured Data Upgrade

The core catalog and operational trust pages now expose explicit machine-readable context for search engines and AI agents. The catalog canonical was corrected from the homepage to `https://eventme.live/events.html`, and the main data surfaces now publish `WebPage`, `Dataset`, and where useful `ItemList` JSON-LD tied to their public JSON feeds.

| Page | JSON-LD Blocks | Dataset Feed |
|---|---:|---|
| `events.html` | 3 | `events.json` |
| `activation.html` | 3 | `activation.json` |
| `trust.html` | 3 | `trust.json` |
| `readiness.html` | 3 | `readiness.json` |
| `sources.html` | 3 | `sources.json` |
| `source-health.html` | 3 | `source-health.json` |
| `source-coverage-gaps.html` | 1 | `source-coverage-gaps.json` |

Protection added: `npm run test:seo-structured-data`.

Verification also passed through `npm run test:site-launch-sweep`, `npm run test:site-visual-sweep`, `npm run sources:health-gate`, and `npm run validate`.

## Saudi Region Coverage

Added a national coverage surface that turns the goal of serving all Saudi cities into measurable acquisition work. The new page and feed group the catalog across the 13 regions of Saudi Arabia, show represented and missing target cities, compute a coverage score, and produce an acquisition priority queue for the next source cycle.

| Region Coverage Signal | Result |
|---|---:|
| Regions tracked | 13 |
| Active regions | 5 |
| Weak regions | 8 |
| Uncovered regions | 7 |
| Public events analyzed | 221 |
| Upcoming/ongoing events | 81 |
| Ended events retained | 140 |
| JSON-LD blocks on `regions.html` | 3 |
| Visual sweep failures | 0 |

The first region priorities are Al Baha, Al Jawf, Northern Borders, Tabuk, Jazan, and Hail. The recommended action is to start with official local sources: chamber of commerce, municipality/amanah, tourism or destination calendar, and major university/cultural-center calendars.

Protection added: `npm run test:regions-coverage`.

Report outputs:

- `dist/regions.html`
- `dist/regions.json`
- `output/playwright/visual-sweep/regions-desktop.png`
- `output/playwright/visual-sweep/regions-mobile.png`

## Regional Source Seeds

Converted weak-region coverage gaps into registered official acquisition seeds. The source registry now includes municipality and chamber routes for Al Baha, Al Jawf, Northern Borders, Tabuk, Jazan, Hail, and Najran so the next extractor cycles can start from official local channels instead of broad discovery sources.

| Seed Signal | Result |
|---|---:|
| Source registry total | 66 |
| New official regional seeds | 8 |
| Seeded weak regions | 7 |
| Active collectors | 25 |
| Productive collectors | 18 |
| Source health coverage | 44% |
| Collector errors | 0 |
| Source candidates | 125 |

| Region | Registered sources | Current public events | Next action |
|---|---:|---:|---|
| Al Baha | 2 | 0 | Conservative HTML/API probe, then publish rows with complete dates only |
| Al Jawf | 1 | 0 | Conservative HTML/API probe, then publish rows with complete dates only |
| Northern Borders | 2 | 0 | Conservative HTML/API probe, then publish rows with complete dates only |
| Tabuk | 2 | 0 | Conservative HTML/API probe, then publish rows with complete dates only |
| Jazan | 2 | 11 | Active monthly API extractor now captures ended date-complete rows; continue watching for upcoming rows |
| Hail | 3 | 0 | Conservative HTML/API probe, then publish rows with complete dates only |
| Najran | 1 | 0 | Conservative HTML/API probe, then publish rows with complete dates only |

Protection added: `npm run test:regional-source-seeds`.

Verification passed through `npm run sources:plan`, `npm run build`, `npm run test:regional-source-seeds`, `npm run test:regions-coverage`, `npm run test:site-launch-sweep`, `npm run test:seo-structured-data`, `npm run test:site-visual-sweep`, `npm run sources:health-gate`, and `npm run validate`.

## Browser Probe Upgrade

Improved the browser-level source probe so regional source analysis produces actionable samples, not just classifications. The Markdown report now includes representative date snippets, event-like links, and endpoint previews per source, which shortens the path from "source discovered" to "extractor implementation" while keeping policy boundaries visible.

| Probe Signal | Result |
|---|---:|
| Regional sources probed | 7 |
| Browser network API | 1 |
| Rendered HTML candidates | 4 |
| Structured HTML candidate | 1 |
| Blocked/protected | 0 |
| Actionable sample section | Added |

The first endpoint candidate captured from the new regional seeds is Jazan Chamber's monthly calendar API. Baha Municipality, Northern Borders Chamber, Tabuk Chamber, and Najran Chamber expose rendered date snippets that should be handled through conservative rendered-DOM or structured-HTML extraction before any public catalog write.

Protection updated: `npm run test:source-browser-probe`.

Report output:

- `reports/source-browser-probe-report.md`
- `reports/source-browser-probe-report.json`
- `data/raw/browser-probes/*.html`
- `data/raw/browser-probes/*.png`

## Jazan API Collector

Promoted Jazan Chamber from a passive evidence seed into a conservative official API collector. The browser probe identified the monthly chamber endpoint, and the source extractor now sweeps the official calendar API, converts UTC timestamps to Riyadh time including millisecond ISO values, keeps original detail links, and carries source images into the public catalog for ended events.

| Jazan Collector Signal | Result |
|---|---:|
| Full source run attempted | 30 |
| Candidates discovered in full run | 120 |
| Ended events written | 217 |
| Catalog events after build | 298 |
| Jazan ended rows retained | 11 |
| Jazan rows with source images | 9 |
| City discovery pages | 18 |
| Sitemap entries | 447 |
| Source health coverage | 45% |
| Collector errors | 0 |

The collector found no future date-complete Jazan rows in the current API sweep, but it now adds ended Jazan Chamber events normally to the platform rather than treating them as a separate archive. A merge safeguard was added so if timestamp parsing improves later, older rows for the same source URL and title are replaced instead of duplicated.

Protection updated: `npm run test:source-extractors`, `npm run test:source-collection-delta`, and `npm run test:regional-source-seeds`.

Verification passed through `npm run sources:collect`, `npm run sources:plan`, `npm run build`, `npm run validate`, `npm run sources:health-gate`, `npm run test:site-launch-sweep`, `npm run test:seo-structured-data`, `npm run test:regions-coverage`, and `npm run test:site-visual-sweep`.

## Ended Productivity Health

Updated source health scoring so official collectors that produce ended events count as productive, matching the product rule that ended events are normal public events, not a separate archive. Jazan now appears as a productive source even though the current sweep found no future rows, because it contributed 11 date-complete ended rows.

| Health Signal | Result |
|---|---:|
| Productive sources | 27 |
| Open idle sources | 2 |
| Jazan active candidates | 0 |
| Jazan ended rows extracted | 11 |
| Jazan total extracted | 11 |
| Collector errors | 0 |

Protection updated: `npm run test:regional-source-seeds`.

## Invest Saudi API Collector

Promoted Invest Saudi from the extractor backlog into an active official API collector after the browser probe exposed the public WordPress JSON events endpoint. The collector now reads date-complete investment and business events, preserves official card imagery, labels non-Saudi venues as `Global`, and avoids weak `/coming-soon` links by falling back to the canonical Invest Saudi calendar when no useful registration URL exists.

| Invest Saudi Signal | Result |
|---|---:|
| Active collectors | 28 |
| Full source run attempted | 31 |
| Candidates discovered in full run | 123 |
| Candidates written | 128 |
| Invest Saudi upcoming candidates | 3 |
| Invest Saudi ended rows | 5 |
| Catalog events after build | 303 |
| Ended events merged into catalog | 222 |
| Event images | 303 |
| Sitemap entries | 454 |
| Source health coverage | 47% |
| Productive sources | 28 |
| Collector errors | 0 |

New upcoming rows include Future Investment Initiative (Riyadh), Cityscape Global (Riyadh), and Web Summit Lisbon (Global). Ended rows include INNOPROM Saudi Arabia 2026, PIF Private Sector Forum 2026, Real Estate Future Forum, Viva Technology, and World Economic Forum 2026 with Invest Saudi source imagery retained.

Protection updated: `npm run test:source-extractors` and `npm run test:source-plan`.

Verification passed through `npm run sources:collect`, `npm run sources:plan`, `npm run build`, `npm run validate`, `npm run sources:health-gate`, `npm run test:site-launch-sweep`, `npm run test:seo-structured-data`, and `npm run test:site-visual-sweep`.

## Saudi Space Agency API Collector

Promoted Saudi Space Agency from the extractor backlog into the active 6-hour collection ring after browser-network analysis exposed the official APIGW SearchEvents endpoint. The collector now posts to the agency JSON API, converts UTC event timestamps into Riyadh time, resolves detail URLs and card images to absolute high-resolution URLs, and separates Saudi-hosted events from international official participations by city and publication gate.

| Saudi Space Agency Signal | Result |
|---|---:|
| Active collectors | 29 |
| Full source run attempted | 32 |
| Candidates discovered in full run | 123 |
| Candidates written | 128 |
| Saudi Space Agency upcoming candidates | 0 |
| Saudi Space Agency ended rows | 14 |
| Saudi Space Agency rows with source images | 14 |
| Catalog events after build | 337 |
| Ended events merged into catalog | 256 |
| Live schedule ready events | 36 |
| Event images | 337 |
| Sitemap entries | 490 |
| Source health coverage | 48% |
| Productive sources | 29 |
| Collector errors | 0 |

The current official feed contains no future date-complete events as of this run, but it adds a valuable 2022+ space/science history lane, including Space Debris Conference 2026, Abaad Competition Closing Ceremony, LEAP25, Saudi Space Exhibitions, World Defense Show 2022, and international Saudi Space Agency participations. Saudi-hosted rows enter the normal human-review gate; international participation rows remain `source-evidence` so they enrich the platform without polluting local event discovery.

Protection updated: `npm run test:source-extractors`, `npm run test:source-plan`, and the source registry schema now supports official `POST` JSON collectors.

Verification passed through `npm run sources:collect`, `npm run sources:plan`, `npm run build`, `npm run validate`, `npm run sources:health-gate`, `npm run test:source-extractors`, `npm run test:source-plan`, `npm run test:site-launch-sweep`, `npm run test:seo-structured-data`, and `npm run test:site-visual-sweep`.

## Remaining High-Value Work

1. Continue chamber coverage beyond Jeddah, Asharqia, Makkah, Qassim, and Abha Chamber, then build extractors source by source.
2. Raise image coverage further by adding detail-page image enrichment for official sources that currently return text-only rows.
3. Build additional official extractors from the next extractor queue: SFDA, Riyadh City, GEA, Riyadh Season, Saudi Digital Academy.
4. Improve mobile rendering of very dense operational tables into stacked cards where appropriate.
5. Add more city-specific content and source routes for underrepresented Saudi regions.
