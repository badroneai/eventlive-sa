# EventLive Source Ingestion Plan

Generated at: 2026-07-09T10:12:32.100Z

## Executive Model

EventLive should not treat all registered sources equally. The operating model is six rings: active collectors, extractor backlog, venue/dedupe checks, evidence monitors, partnership lanes, and discovery-only lanes.

## Totals

- Sources: 66
- Active collectors: 30
- Extractor backlog: 12
- Evidence monitors: 12
- Partnership/API lanes: 3
- Discovery-only lanes: 8
- Sources with latest deep-probe evidence: 22

## Run Cadence

| Cadence | Sources | Purpose |
|---|---:|---|
| monthly-partnership-check | 3 | Relationship/API path, not scraping. |
| daily | 30 | Collect candidates and let trust gates decide publication. |
| weekly-discovery | 6 | Lead discovery only, never direct publication. |
| daily-extractor-probe | 2 | High-priority official source that needs an extractor. |
| twice-weekly-extractor-probe | 10 | Official or strategic source to test before extractor build. |
| weekly-evidence-check | 3 | Evidence-only source waiting for complete event pages. |
| monthly-evidence-check | 9 | Evidence-only source waiting for complete event pages. |
| weekly-dedupe-check | 1 | Venue or directory source requiring duplicate control. |
| monthly-discovery | 2 | Lead discovery only, never direct publication. |

## Next Extractor Build Queue

| Rank | Source | Ring | Cadence | Probe | Why |
|---:|---|---|---|---|---|
| 1 | visit-saudi-calendar-pdf | extractor-backlog | twice-weekly-extractor-probe | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 2 | jouf-chamber-events | extractor-backlog | twice-weekly-extractor-probe | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 3 | northern-borders-chamber-events | extractor-backlog | twice-weekly-extractor-probe | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 4 | riyadh-city-events | extractor-backlog | twice-weekly-extractor-probe | blocked-or-protected:fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 5 | gea-entertainment-events | extractor-backlog | twice-weekly-extractor-probe | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 6 | tabuk-chamber-events | extractor-backlog | twice-weekly-extractor-probe | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 7 | riyadh-season | extractor-backlog | daily-extractor-probe | blocked-or-protected:bot-protection | Do not scrape now; latest probe is blocked-or-protected:bot-protection. Keep as partnership, browser/API investigation, or evidence lane. |
| 8 | saudi-digital-academy | extractor-backlog | daily-extractor-probe | blocked-or-protected:fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 9 | enjoy-saudi-events | extractor-backlog | twice-weekly-extractor-probe | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 10 | historic-jeddah-albalad | extractor-backlog | twice-weekly-extractor-probe | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 11 | baha-amanah-events | extractor-backlog | twice-weekly-extractor-probe | blocked-or-protected:bot-protection | Do not scrape now; latest probe is blocked-or-protected:bot-protection. Keep as partnership, browser/API investigation, or evidence lane. |
| 12 | saudi-contractors-authority-events | extractor-backlog | twice-weekly-extractor-probe | blocked-or-protected:fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |

## Active 6-Hour Ring

| Source | Last status | Extracted | Probe | Next action |
|---|---|---:|---|---|
| visit-saudi-calendar | ok | 10 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| moc-cultural-calendar | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| mos-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| experience-alula-events | ok | 0 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| mdlbeast-events | ok | 5 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| monshaat-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| invest-saudi-events | ok | 3 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| rfecc-whats-on | ok | 6 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| tuwaiq-academy-bootcamps | ok | 12 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| future-skills-catalog | ok | 4 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| visit-saudi-seasons | ok | 4 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| code-mcit-programs | ok | 0 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| misk-hub-programs | ok | 5 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| dhahran-expo-calendar | ok | 15 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| ithra-events | ok | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| sdaia-academy-programs | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| misk-hub-events | ok | 0 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| jcci-events-center | ok | 0 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| saudi-pro-league-fixtures | ok | 0 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| saudi-space-agency-events | ok | 0 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| moc-cultural-subportals | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| discover-aseer-events | ok | 1 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| saudi-water-authority-events | ok | 8 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| sfda-events | ok | 7 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| sdaia-calendar-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| makkah-chamber-events | ok | 0 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| asharqia-chamber-events | ok | 2 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| qassim-chamber-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| abha-chamber-events | ok | 0 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| jazan-chamber-events | error | 0 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |

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
| 20 | code-mcit-programs | active-collector | daily | 122 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 21 | misk-hub-programs | active-collector | daily | 121 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 22 | dhahran-expo-calendar | active-collector | daily | 108 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 23 | ithra-events | active-collector | daily | 119 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 24 | saudi-digital-academy | extractor-backlog | daily-extractor-probe | 73 | blocked-or-protected:fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 25 | sdaia-academy-programs | active-collector | daily | 117 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 26 | saudi-events-app | partnership | monthly-partnership-check | 48 | - | Open a relationship/API path; keep out of automated scraping until a feed or permission path exists. |
| 27 | enjoy-saudi-events | extractor-backlog | twice-weekly-extractor-probe | 70 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 28 | misk-hub-events | active-collector | daily | 159 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 29 | jcci-events-center | active-collector | daily | 146 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 30 | saudi-pro-league-fixtures | active-collector | daily | 112 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 31 | neom-newsroom-events | evidence-monitor | weekly-evidence-check | 85 | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 32 | saudi-space-agency-events | active-collector | daily | 98 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 33 | cst-events-news | evidence-monitor | weekly-evidence-check | 71 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 34 | visit-saudi-calendar-pdf | extractor-backlog | twice-weekly-extractor-probe | 112 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 35 | qiddiya-events | evidence-monitor | weekly-evidence-check | 17 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 36 | sela-sea-expo | evidence-monitor | monthly-evidence-check | 55 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 37 | moc-cultural-subportals | active-collector | daily | 150 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 38 | historic-jeddah-albalad | extractor-backlog | twice-weekly-extractor-probe | 47 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 39 | discover-aseer-events | active-collector | daily | 91 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 40 | diriyah-season | evidence-monitor | monthly-evidence-check | 59 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 41 | ricec-events | venue-dedupe | weekly-dedupe-check | 31 | blocked-or-protected:fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 42 | aseer-season-asda | evidence-monitor | monthly-evidence-check | 59 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 43 | jeddah-season | evidence-monitor | monthly-evidence-check | 9 | blocked-or-protected:fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 44 | saudi-water-authority-events | active-collector | daily | 98 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 45 | saudi-university-events | evidence-monitor | monthly-evidence-check | 54 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 46 | expofp-eventseye-saudi | discovery-only | monthly-discovery | 12 | - | Use only to discover leads; require official confirmation before promotion. |
| 47 | meetup-facebook-saudi-events | discovery-only | monthly-discovery | 11 | - | Use only to discover leads; require official confirmation before promotion. |
| 48 | sfda-events | active-collector | daily | 82 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 49 | saudi-contractors-authority-events | extractor-backlog | twice-weekly-extractor-probe | 36 | blocked-or-protected:fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 50 | saudi-winter-calendar-spa | evidence-monitor | monthly-evidence-check | 2 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 51 | riyadh-city-events | extractor-backlog | twice-weekly-extractor-probe | 91 | blocked-or-protected:fetch failed | Do not scrape now; latest probe is blocked-or-protected:fetch failed. Keep as partnership, browser/API investigation, or evidence lane. |
| 52 | monshaat-academy-programs | partnership | monthly-partnership-check | 22 | - | Open a relationship/API path; keep out of automated scraping until a feed or permission path exists. |
| 53 | gea-entertainment-events | extractor-backlog | twice-weekly-extractor-probe | 89 | blocked-or-protected:http-403 | Do not scrape now; latest probe is blocked-or-protected:http-403. Keep as partnership, browser/API investigation, or evidence lane. |
| 54 | sdaia-calendar-events | active-collector | daily | 133 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 55 | makkah-chamber-events | active-collector | daily | 75 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 59 | asharqia-chamber-events | active-collector | daily | 71 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 60 | qassim-chamber-events | active-collector | daily | 70 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 61 | abha-chamber-events | active-collector | daily | 69 | - | Run in the 6-hour sync ring; keep dedupe and image enrichment active. |
| 62 | baha-amanah-events | extractor-backlog | twice-weekly-extractor-probe | 40 | blocked-or-protected:bot-protection | Do not scrape now; latest probe is blocked-or-protected:bot-protection. Keep as partnership, browser/API investigation, or evidence lane. |
| 63 | baha-chamber-events | evidence-monitor | monthly-evidence-check | 19 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |
| 64 | jouf-chamber-events | extractor-backlog | twice-weekly-extractor-probe | 99 | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 65 | northern-borders-chamber-events | extractor-backlog | twice-weekly-extractor-probe | 98 | build-html-detail-extractor | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 66 | tabuk-chamber-events | extractor-backlog | twice-weekly-extractor-probe | 81 | probe-hidden-api-or-html-table | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 67 | jazan-chamber-events | active-collector | daily | 75 | - | Run in the 6-hour sync ring; improve zero-yield extractors before widening. |
| 68 | hail-chamber-events | evidence-monitor | monthly-evidence-check | 14 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |
| 69 | najran-chamber-events | evidence-monitor | monthly-evidence-check | 13 | - | Monitor for live event/detail pages; do not create public rows from summary or coming-soon pages. |

