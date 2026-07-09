# EventLive Source Run State

Generated at: 2026-07-09T04:23:11.379Z

## Operating Rule

Raw collection is not publication. Every source run preserves evidence, separates discovery from production, and only official/venue active-collector lanes can reach auto-publish after candidate-level guards.

## Totals

- Sources: 66
- Attempted this run: 34
- Productive: 14
- Zero-yield: 9
- Collector errors: 8
- Probe blocked: 12
- Auto-publish eligible source lanes: 12

## Stalled / Blocked Focus

| Source | Status | Zero streak | Boundary | Next action |
|---|---|---:|---|---|
| moc-cultural-calendar | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| mos-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| monshaat-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| sdaia-academy-programs | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| moc-cultural-subportals | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| sdaia-calendar-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| qassim-chamber-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: HTTP 403 |
| jazan-chamber-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| riyadh-season | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: bot-protection |
| saudi-digital-academy | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| enjoy-saudi-events | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| qiddiya-events | probe-blocked | 0 | evidence_monitor_only | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| historic-jeddah-albalad | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| ricec-events | probe-blocked | 0 | dedupe_anchor_only | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| jeddah-season | probe-blocked | 0 | evidence_monitor_only | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| saudi-contractors-authority-events | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| saudi-winter-calendar-spa | probe-blocked | 0 | evidence_monitor_only | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| riyadh-city-events | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| gea-entertainment-events | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| baha-amanah-events | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: bot-protection |

## Full Source State

| Priority | Source | Ring | Status | Extracted | Auto-publish lane | Next action |
|---:|---|---|---|---:|---|---|
| 1 | nec-saudi-events | partnership | partnership | 0 | no | Partnership/API lane; do not scrape protected or app-only data. |
| 2 | visit-saudi-calendar | active-collector | productive | 10 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 3 | moc-cultural-calendar | active-collector | collector-error | 0 | yes | Fix collector error: fetch failed |
| 4 | mos-events | active-collector | collector-error | 0 | yes | Fix collector error: fetch failed |
| 5 | webook-explore | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 6 | hala-yalla | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 7 | experience-alula-events | active-collector | zero-yield | 0 | yes | Zero-yield for 40 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 8 | mdlbeast-events | active-collector | productive | 5 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 9 | monshaat-events | active-collector | collector-error | 0 | yes | Fix collector error: fetch failed |
| 10 | invest-saudi-events | active-collector | productive | 3 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 11 | rfecc-whats-on | active-collector | productive | 6 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 12 | eye-of-riyadh-events | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 13 | ten-times-saudi | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 14 | eventbrite-saudi | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 15 | platinumlist-jeddah | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 16 | tuwaiq-academy-bootcamps | active-collector | productive | 12 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 17 | future-skills-catalog | active-collector | productive | 4 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 18 | riyadh-season | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: bot-protection |
| 19 | visit-saudi-seasons | active-collector | productive | 4 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 20 | code-mcit-programs | active-collector | zero-yield | 0 | yes | Zero-yield for 40 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 21 | misk-hub-programs | active-collector | productive | 5 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 22 | dhahran-expo-calendar | active-collector | productive | 15 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 23 | ithra-events | active-collector | zero-yield | 0 | yes | Zero-yield for 40 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 24 | saudi-digital-academy | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| 25 | sdaia-academy-programs | active-collector | collector-error | 0 | no | Fix collector error: fetch failed |
| 26 | saudi-events-app | partnership | partnership | 0 | no | Partnership/API lane; do not scrape protected or app-only data. |
| 27 | enjoy-saudi-events | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 28 | misk-hub-events | active-collector | zero-yield | 0 | no | Zero-yield for 40 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 29 | jcci-events-center | active-collector | zero-yield | 0 | no | Zero-yield for 40 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 30 | saudi-pro-league-fixtures | active-collector | zero-yield | 0 | no | Zero-yield for 40 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 31 | neom-newsroom-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 32 | saudi-space-agency-events | active-collector | zero-yield | 0 | no | Zero-yield for 25 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 33 | cst-events-news | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 34 | visit-saudi-calendar-pdf | extractor-backlog | not-attempted | 0 | no | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 35 | qiddiya-events | evidence-monitor | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 36 | sela-sea-expo | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 37 | moc-cultural-subportals | active-collector | collector-error | 0 | no | Fix collector error: fetch failed |
| 38 | historic-jeddah-albalad | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 39 | discover-aseer-events | active-collector | productive | 1 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 40 | diriyah-season | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 41 | ricec-events | venue-dedupe | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| 42 | aseer-season-asda | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 43 | jeddah-season | evidence-monitor | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| 44 | saudi-water-authority-events | active-collector | productive | 8 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 45 | saudi-university-events | evidence-monitor | productive | 6 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 46 | expofp-eventseye-saudi | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 47 | meetup-facebook-saudi-events | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 48 | sfda-events | active-collector | productive | 7 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 49 | saudi-contractors-authority-events | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| 50 | saudi-winter-calendar-spa | evidence-monitor | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 51 | riyadh-city-events | extractor-backlog | probe-blocked | 40 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed |
| 52 | monshaat-academy-programs | partnership | partnership | 0 | no | Partnership/API lane; do not scrape protected or app-only data. |
| 53 | gea-entertainment-events | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 54 | sdaia-calendar-events | active-collector | collector-error | 0 | no | Fix collector error: fetch failed |
| 55 | makkah-chamber-events | active-collector | zero-yield | 0 | no | Zero-yield for 34 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 59 | asharqia-chamber-events | active-collector | productive | 2 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 60 | qassim-chamber-events | active-collector | collector-error | 0 | no | Fix collector error: HTTP 403 |
| 61 | abha-chamber-events | active-collector | zero-yield | 0 | no | Zero-yield for 34 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 62 | baha-amanah-events | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: bot-protection |
| 63 | baha-chamber-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 64 | jouf-chamber-events | extractor-backlog | not-attempted | 0 | no | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 65 | northern-borders-chamber-events | extractor-backlog | not-attempted | 0 | no | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 66 | tabuk-chamber-events | extractor-backlog | not-attempted | 0 | no | Latest deep probe recommends probe-hidden-api-or-html-table; build only if future date-complete rows are visible. |
| 67 | jazan-chamber-events | active-collector | collector-error | 0 | no | Fix collector error: fetch failed |
| 68 | hail-chamber-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 69 | najran-chamber-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |

