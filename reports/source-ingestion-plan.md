# EventLive Source Ingestion Plan

Generated at: 2026-07-12T12:58:48.478Z

## Executive Model

EventLive should not treat all registered sources equally. The operating model is six rings: active collectors, extractor backlog, venue/dedupe checks, evidence monitors, partnership lanes, and discovery-only lanes.

## Totals

- Sources: 86
- Active collectors: 35
- Extractor backlog: 15
- Evidence monitors: 14
- Partnership/API lanes: 5
- Discovery-only lanes: 11
- Sources with latest deep-probe evidence: 21

## Run Cadence

| Cadence | Sources | Purpose |
|---|---:|---|
| monthly-partnership-check | 5 | Relationship/API path, not scraping. |
| daily | 35 | Collect candidates and let trust gates decide publication. |
| weekly-discovery | 6 | Lead discovery only, never direct publication. |
| daily-extractor-probe | 2 | High-priority official source that needs an extractor. |
| twice-weekly-extractor-probe | 13 | Official or strategic source to test before extractor build. |
| weekly-evidence-check | 3 | Evidence-only source waiting for complete event pages. |
| weekly-dedupe-check | 6 | Venue or directory source requiring duplicate control. |
| monthly-evidence-check | 11 | Evidence-only source waiting for complete event pages. |
| monthly-discovery | 5 | Lead discovery only, never direct publication. |

## Next Extractor Build Queue

| Rank | Source | Ring | Cadence | Probe | Why |
|---:|---|---|---|---|---|
| 1 | visit-saudi-calendar-pdf | venue-dedupe | weekly-dedupe-check | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 2 | jouf-chamber-events | extractor-backlog | twice-weekly-extractor-probe | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 3 | northern-borders-chamber-events | extractor-backlog | twice-weekly-extractor-probe | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 4 | riyadh-city-events | extractor-backlog | twice-weekly-extractor-probe | blocked-or-protected:fetch failed unable to verify the first certificate; if the root CA is installed locally, try running Node.js with --use-system-ca TypeError: fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed unable to verify the first certificate; if the root CA is installed locally, try running Node.js with --use-system-ca TypeError: fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 5 | money2020-middle-east-agendas | extractor-backlog | twice-weekly-extractor-probe | build-jsonld-event-extractor | Latest deep probe recommends build-jsonld-event-extractor; build only if future date-complete rows are visible. |
| 6 | tabuk-chamber-events | extractor-backlog | twice-weekly-extractor-probe | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 7 | riyadh-season | extractor-backlog | daily-extractor-probe | blocked-or-protected:bot-protection | Do not scrape now; latest probe is blocked-or-protected:bot-protection. Keep as partnership, browser/API investigation, or evidence lane. |
| 8 | saudi-digital-academy | extractor-backlog | daily-extractor-probe | blocked-or-protected:fetch failed getaddrinfo ENOTFOUND sda.edu.sa TypeError: fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed getaddrinfo ENOTFOUND sda.edu.sa TypeError: fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 9 | enjoy-saudi-events | extractor-backlog | twice-weekly-extractor-probe | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 10 | saudi-contractors-authority-events | extractor-backlog | twice-weekly-extractor-probe | - | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 11 | baha-amanah-events | extractor-backlog | twice-weekly-extractor-probe | - | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 12 | middle-east-banking-ai-summit | extractor-backlog | twice-weekly-extractor-probe | - | Probe HTML/API shape, then decide whether an extractor is worth adding. |

## Active 6-Hour Ring

| Source | Last status | Extracted | Probe | Next action |
|---|---|---:|---|---|
| visit-saudi-calendar | ok | 14 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| moc-cultural-calendar | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| mos-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| experience-alula-events | ok | 9 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| mdlbeast-events | ok | 5 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| monshaat-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| invest-saudi-events | ok | 3 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| rfecc-whats-on | ok | 6 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| tuwaiq-academy-bootcamps | ok | 12 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| future-skills-catalog | ok | 7 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| visit-saudi-seasons | ok | 4 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| code-mcit-programs | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| misk-hub-programs | ok | 5 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| dhahran-expo-calendar | ok | 15 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| ithra-events | ok | 128 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| sdaia-academy-programs | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| misk-hub-events | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| jcci-events-center | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| saudi-pro-league-fixtures | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| saudi-space-agency-events | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| moc-cultural-subportals | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| discover-aseer-events | ok | 1 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| saudi-water-authority-events | ok | 8 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| sfda-events | ok | 7 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| sdaia-calendar-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| makkah-chamber-events | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| scega-exhibitions-conferences | ok | 4 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| asharqia-chamber-events | ok | 2 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| qassim-chamber-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| abha-chamber-events | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| jazan-chamber-events | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| umm-al-qura-events | ok | 4 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| madinah-chamber-events | - | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| madinah-architecture-festival | ok | 1 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| hayy-jameel-events | ok | 11 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |

## Full Source Plan

| Priority | Source | Ring | Cadence | Score | Probe | Next action |
|---:|---|---|---|---:|---|---|
| 1 | nec-saudi-events | partnership | monthly-partnership-check | 73 | - | Open a relationship/API path; keep out of automated scraping until a feed or permission path exists. |
| 2 | visit-saudi-calendar | active-collector | daily | 140 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 3 | moc-cultural-calendar | active-collector | daily | 184 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 4 | mos-events | active-collector | daily | 138 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 5 | webook-explore | discovery-only | weekly-discovery | 53 | - | Use only to discover leads; require official confirmation before promotion. |
| 6 | hala-yalla | discovery-only | weekly-discovery | 52 | - | Use only to discover leads; require official confirmation before promotion. |
| 7 | experience-alula-events | active-collector | daily | 135 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 8 | mdlbeast-events | active-collector | daily | 122 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 9 | monshaat-events | active-collector | daily | 133 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 10 | invest-saudi-events | active-collector | daily | 132 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 11 | rfecc-whats-on | active-collector | daily | 119 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 12 | eye-of-riyadh-events | discovery-only | weekly-discovery | 46 | - | Use only to discover leads; require official confirmation before promotion. |
| 13 | ten-times-saudi | discovery-only | weekly-discovery | 45 | - | Use only to discover leads; require official confirmation before promotion. |
| 14 | eventbrite-saudi | discovery-only | weekly-discovery | 44 | - | Use only to discover leads; require official confirmation before promotion. |
| 15 | platinumlist-jeddah | discovery-only | weekly-discovery | 43 | - | Use only to discover leads; require official confirmation before promotion. |
| 16 | tuwaiq-academy-bootcamps | active-collector | daily | 126 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 17 | future-skills-catalog | active-collector | daily | 125 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 18 | riyadh-season | extractor-backlog | daily-extractor-probe | 79 | blocked-or-protected:bot-protection | Do not scrape now; latest probe is blocked-or-protected:bot-protection. Keep as partnership, browser/API investigation, or evidence lane. |
| 19 | visit-saudi-seasons | active-collector | daily | 123 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 20 | code-mcit-programs | active-collector | daily | 122 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 21 | misk-hub-programs | active-collector | daily | 121 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 22 | dhahran-expo-calendar | active-collector | daily | 108 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 23 | ithra-events | active-collector | daily | 119 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 24 | saudi-digital-academy | extractor-backlog | daily-extractor-probe | 73 | blocked-or-protected:fetch failed getaddrinfo ENOTFOUND sda.edu.sa TypeError: fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed getaddrinfo ENOTFOUND sda.edu.sa TypeError: fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 25 | sdaia-academy-programs | active-collector | daily | 117 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 26 | saudi-events-app | partnership | monthly-partnership-check | 48 | - | Open a relationship/API path; keep out of automated scraping until a feed or permission path exists. |
| 27 | enjoy-saudi-events | extractor-backlog | twice-weekly-extractor-probe | 70 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 28 | misk-hub-events | active-collector | daily | 159 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 29 | jcci-events-center | active-collector | daily | 146 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 30 | saudi-pro-league-fixtures | active-collector | daily | 112 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 31 | neom-newsroom-events | evidence-monitor | weekly-evidence-check | 85 | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 32 | saudi-space-agency-events | active-collector | daily | 98 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 33 | cst-events-news | evidence-monitor | weekly-evidence-check | 71 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 34 | visit-saudi-calendar-pdf | venue-dedupe | weekly-dedupe-check | 102 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 35 | qiddiya-events | evidence-monitor | weekly-evidence-check | 17 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 36 | sela-sea-expo | evidence-monitor | monthly-evidence-check | 55 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 37 | moc-cultural-subportals | active-collector | daily | 150 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 38 | historic-jeddah-albalad | extractor-backlog | twice-weekly-extractor-probe | 47 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 39 | discover-aseer-events | active-collector | daily | 91 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 40 | diriyah-season | evidence-monitor | monthly-evidence-check | 59 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 41 | ricec-events | venue-dedupe | weekly-dedupe-check | 31 | blocked-or-protected:fetch failed getaddrinfo EAI_AGAIN www.ricec.com TypeError: fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed getaddrinfo EAI_AGAIN www.ricec.com TypeError: fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 42 | aseer-season-asda | evidence-monitor | monthly-evidence-check | 59 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 43 | jeddah-season | evidence-monitor | monthly-evidence-check | 9 | blocked-or-protected:fetch failed getaddrinfo ENOTFOUND jeddahseason.sa TypeError: fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed getaddrinfo ENOTFOUND jeddahseason.sa TypeError: fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 44 | saudi-water-authority-events | active-collector | daily | 98 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 45 | saudi-university-events | evidence-monitor | monthly-evidence-check | 54 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 46 | expofp-eventseye-saudi | discovery-only | monthly-discovery | 12 | - | Use only to discover leads; require official confirmation before promotion. |
| 47 | meetup-facebook-saudi-events | discovery-only | monthly-discovery | 11 | - | Use only to discover leads; require official confirmation before promotion. |
| 48 | sfda-events | active-collector | daily | 82 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 49 | saudi-contractors-authority-events | extractor-backlog | twice-weekly-extractor-probe | 66 | - | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 50 | saudi-winter-calendar-spa | evidence-monitor | monthly-evidence-check | 32 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |
| 51 | riyadh-city-events | extractor-backlog | twice-weekly-extractor-probe | 91 | blocked-or-protected:fetch failed unable to verify the first certificate; if the root CA is installed locally, try running Node.js with --use-system-ca TypeError: fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed unable to verify the first certificate; if the root CA is installed locally, try running Node.js with --use-system-ca TypeError: fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 52 | monshaat-academy-programs | partnership | monthly-partnership-check | 22 | - | Open a relationship/API path; keep out of automated scraping until a feed or permission path exists. |
| 53 | gea-entertainment-events | evidence-monitor | monthly-evidence-check | 86 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |
| 54 | sdaia-calendar-events | active-collector | daily | 133 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 55 | makkah-chamber-events | active-collector | daily | 75 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 56 | scega-exhibitions-conferences | active-collector | daily | 86 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 57 | ministry-commerce-events | evidence-monitor | monthly-evidence-check | 25 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |
| 58 | evento-sa-events | discovery-only | monthly-discovery | 0 | - | Use only to discover leads; require official confirmation before promotion. |
| 59 | asharqia-chamber-events | active-collector | daily | 71 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 60 | qassim-chamber-events | active-collector | daily | 70 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 61 | abha-chamber-events | active-collector | daily | 69 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 62 | baha-amanah-events | extractor-backlog | twice-weekly-extractor-probe | 65 | - | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 63 | baha-chamber-events | evidence-monitor | monthly-evidence-check | 19 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |
| 64 | jouf-chamber-events | extractor-backlog | twice-weekly-extractor-probe | 99 | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 65 | northern-borders-chamber-events | extractor-backlog | twice-weekly-extractor-probe | 98 | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 66 | tabuk-chamber-events | extractor-backlog | twice-weekly-extractor-probe | 81 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 67 | jazan-chamber-events | active-collector | daily | 75 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 68 | hail-chamber-events | evidence-monitor | monthly-evidence-check | 14 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |
| 69 | najran-chamber-events | evidence-monitor | monthly-evidence-check | 13 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |
| 70 | platinumlist-riyadh | discovery-only | monthly-discovery | -12 | - | Use only to discover leads; require official confirmation before promotion. |
| 71 | najran-municipality-summer-events | venue-dedupe | weekly-dedupe-check | 43 | - | Use as a discovery anchor, then reconcile against organizer, ticketing, and catalog duplicates. |
| 72 | platinumlist-saudi-city-network | discovery-only | monthly-discovery | -14 | - | Use only to discover leads; require official confirmation before promotion. |
| 73 | my-gov-sa-events | partnership | monthly-partnership-check | 1 | - | Open a relationship/API path; keep out of automated scraping until a feed or permission path exists. |
| 74 | middle-east-banking-ai-summit | extractor-backlog | twice-weekly-extractor-probe | 53 | - | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 75 | middle-east-enterprise-ai-summit | extractor-backlog | twice-weekly-extractor-probe | 22 | blocked-or-protected:bot-protection | Do not scrape now; latest probe is blocked-or-protected:bot-protection. Keep as partnership, browser/API investigation, or evidence lane. |
| 76 | umm-al-qura-events | active-collector | daily | 66 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 77 | leap-official-agendas | extractor-backlog | twice-weekly-extractor-probe | 20 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 78 | fii10-official-program | extractor-backlog | twice-weekly-extractor-probe | 37 | - | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 79 | cityscape-global-official-program | partnership | monthly-partnership-check | -5 | - | Open a relationship/API path; keep out of automated scraping until a feed or permission path exists. |
| 80 | qassim-university-events | venue-dedupe | weekly-dedupe-check | 35 | - | Use as a discovery anchor, then reconcile against organizer, ticketing, and catalog duplicates. |
| 81 | jouf-university-programs | venue-dedupe | weekly-dedupe-check | 35 | - | Use as a discovery anchor, then reconcile against organizer, ticketing, and catalog duplicates. |
| 82 | money2020-middle-east-agendas | extractor-backlog | twice-weekly-extractor-probe | 88 | build-jsonld-event-extractor | Latest deep probe recommends build-jsonld-event-extractor; build only if future date-complete rows are visible. |
| 83 | madinah-chamber-events | active-collector | daily | 63 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 84 | madinah-architecture-festival | active-collector | daily | 63 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 85 | hayy-jameel-events | active-collector | daily | 63 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 86 | informa-connect-saudi-events | venue-dedupe | weekly-dedupe-check | 35 | - | Use as a discovery anchor, then reconcile against organizer, ticketing, and catalog duplicates. |

