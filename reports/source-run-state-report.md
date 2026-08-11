# EventLive Source Run State

Generated at: 2026-08-11T07:55:43.533Z

## Operating Rule

Raw collection is not publication. Every source run preserves evidence, separates discovery from production, and only official/venue active-collector lanes can reach auto-publish after candidate-level guards.

## Totals

- Sources: 88
- Attempted this run: 22
- Deferred by adaptive cadence: 26
- Productive: 20
- Zero-yield: 2
- Collector errors: 0
- Persistent collector errors: 7
- Probe blocked: 0
- Auto-publish eligible source lanes: 12

## Stalled / Blocked Focus

| Source | Status | Zero streak | Boundary | Next action |
|---|---|---:|---|---|
| moc-cultural-calendar | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed; fetch failed |
| mos-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.mos.gov.sa/en/media/events", waiting until "domcontentloaded"
 |
| monshaat-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed; fetch failed |
| saudi-pro-league-fixtures | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| saudi-space-agency-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed |
| moc-cultural-subportals | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed; fetch failed |
| asharqia-chamber-events | collector-error | 0 | raw_harvest_to_candidate_queue | Fix collector error: fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/Pages/AllChamberEvents.aspx", waiting until "domcontentloaded"
 |
| riyadh-season | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: bot-protection |
| saudi-digital-academy | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: fetch failed getaddrinfo ENOTFOUND sda.edu.sa TypeError: fetch failed |
| enjoy-saudi-events | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| qiddiya-events | probe-blocked | 0 | evidence_monitor_only | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| historic-jeddah-albalad | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| ricec-events | probe-blocked | 0 | dedupe_anchor_only | Do not bypass protection; keep as blocked/partnership candidate: fetch failed getaddrinfo EAI_AGAIN www.ricec.com TypeError: fetch failed |
| jeddah-season | probe-blocked | 0 | evidence_monitor_only | Do not bypass protection; keep as blocked/partnership candidate: fetch failed getaddrinfo ENOTFOUND jeddahseason.sa TypeError: fetch failed |
| riyadh-city-events | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: fetch failed unable to verify the first certificate; if the root CA is installed locally, try running Node.js with --use-system-ca TypeError: fetch failed |
| middle-east-enterprise-ai-summit | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: bot-protection |
| leap-official-agendas | probe-blocked | 0 | probe_before_collector | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| code-mcit-programs | zero-yield | 75 | raw_harvest_to_candidate_queue | Zero-yield for 75 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| jcci-events-center | zero-yield | 75 | raw_harvest_to_candidate_queue | Zero-yield for 75 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| makkah-chamber-events | zero-yield | 69 | raw_harvest_to_candidate_queue | Zero-yield for 69 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |

## Full Source State

| Priority | Source | Ring | Status | Extracted | Auto-publish lane | Next action |
|---:|---|---|---|---:|---|---|
| 1 | nec-saudi-events | partnership | partnership | 0 | no | Partnership/API lane; do not scrape protected or app-only data. |
| 2 | visit-saudi-calendar | active-collector | productive | 28 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 3 | moc-cultural-calendar | active-collector | collector-error | 0 | yes | Fix collector error: fetch failed; fetch failed |
| 4 | mos-events | active-collector | collector-error | 0 | yes | Fix collector error: fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.mos.gov.sa/en/media/events", waiting until "domcontentloaded"
 |
| 5 | webook-explore | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 6 | hala-yalla | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 7 | experience-alula-events | active-collector | productive | 9 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 8 | mdlbeast-events | active-collector | productive | 4 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 9 | monshaat-events | active-collector | collector-error | 0 | yes | Fix collector error: fetch failed; fetch failed |
| 10 | invest-saudi-events | active-collector | productive | 3 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 11 | rfecc-whats-on | active-collector | productive | 6 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 12 | eye-of-riyadh-events | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 13 | ten-times-saudi | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 14 | eventbrite-saudi | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 15 | platinumlist-jeddah | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 16 | tuwaiq-academy-bootcamps | active-collector | productive | 12 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 17 | future-skills-catalog | active-collector | productive | 5 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 18 | riyadh-season | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: bot-protection |
| 19 | visit-saudi-seasons | active-collector | productive | 17 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 20 | code-mcit-programs | active-collector | zero-yield | 0 | yes | Zero-yield for 75 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 21 | misk-hub-programs | active-collector | productive | 5 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 22 | dhahran-expo-calendar | active-collector | productive | 16 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 23 | ithra-events | active-collector | productive | 79 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 24 | saudi-digital-academy | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed getaddrinfo ENOTFOUND sda.edu.sa TypeError: fetch failed |
| 25 | sdaia-academy-programs | active-collector | zero-yield | 0 | no | Zero-yield for 15 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 26 | saudi-events-app | partnership | partnership | 0 | no | Partnership/API lane; do not scrape protected or app-only data. |
| 27 | enjoy-saudi-events | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 28 | misk-hub-events | active-collector | productive | 1 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 29 | jcci-events-center | active-collector | zero-yield | 0 | no | Zero-yield for 75 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 30 | saudi-pro-league-fixtures | active-collector | collector-error | 0 | no | Fix collector error: fetch failed |
| 31 | neom-newsroom-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 32 | saudi-space-agency-events | active-collector | collector-error | 0 | no | Fix collector error: fetch failed |
| 33 | cst-events-news | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 34 | visit-saudi-calendar-pdf | venue-dedupe | productive | 55 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 35 | qiddiya-events | evidence-monitor | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 36 | sela-sea-expo | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 37 | moc-cultural-subportals | active-collector | collector-error | 0 | no | Fix collector error: fetch failed; fetch failed |
| 38 | historic-jeddah-albalad | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 39 | discover-aseer-events | active-collector | productive | 37 | yes | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 40 | diriyah-season | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 41 | ricec-events | venue-dedupe | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed getaddrinfo EAI_AGAIN www.ricec.com TypeError: fetch failed |
| 42 | aseer-season-asda | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 43 | jeddah-season | evidence-monitor | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed getaddrinfo ENOTFOUND jeddahseason.sa TypeError: fetch failed |
| 44 | saudi-water-authority-events | active-collector | productive | 8 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 45 | saudi-university-events | evidence-monitor | productive | 4 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 46 | expofp-eventseye-saudi | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 47 | meetup-facebook-saudi-events | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 48 | sfda-events | active-collector | productive | 7 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 49 | saudi-contractors-authority-events | extractor-backlog | not-attempted | 0 | no | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 50 | saudi-winter-calendar-spa | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 51 | riyadh-city-events | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: fetch failed unable to verify the first certificate; if the root CA is installed locally, try running Node.js with --use-system-ca TypeError: fetch failed |
| 52 | monshaat-academy-programs | partnership | partnership | 0 | no | Partnership/API lane; do not scrape protected or app-only data. |
| 53 | gea-entertainment-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 54 | sdaia-calendar-events | active-collector | productive | 2 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 55 | makkah-chamber-events | active-collector | zero-yield | 0 | no | Zero-yield for 69 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 56 | scega-exhibitions-conferences | active-collector | productive | 4 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 57 | ministry-commerce-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 58 | evento-sa-events | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 59 | asharqia-chamber-events | active-collector | collector-error | 0 | no | Fix collector error: fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/Pages/AllChamberEvents.aspx", waiting until "domcontentloaded"
 |
| 60 | qassim-chamber-events | active-collector | zero-yield | 0 | no | Zero-yield for 7 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 61 | abha-chamber-events | active-collector | zero-yield | 0 | no | Zero-yield for 69 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 62 | baha-amanah-events | extractor-backlog | not-attempted | 0 | no | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 63 | baha-chamber-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 64 | jouf-chamber-events | extractor-backlog | not-attempted | 0 | no | Latest deep probe recommends build-html-detail-extractor; build only if future date-complete rows are visible. |
| 65 | northern-borders-chamber-events | extractor-backlog | zero-yield | 0 | no | Zero-yield for 14 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 66 | tabuk-chamber-events | extractor-backlog | zero-yield | 0 | no | Zero-yield for 33 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 67 | jazan-chamber-events | active-collector | zero-yield | 0 | no | Zero-yield for 15 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 68 | hail-chamber-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 69 | najran-chamber-events | evidence-monitor | evidence-monitor | 0 | no | Monitor for official event detail evidence before candidate promotion. |
| 70 | platinumlist-riyadh | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 71 | najran-municipality-summer-events | venue-dedupe | zero-yield | 0 | no | Zero-yield for 13 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 72 | platinumlist-saudi-city-network | discovery-only | discovery-only | 0 | no | Use only as discovery evidence; never publish directly. |
| 73 | my-gov-sa-events | partnership | partnership | 0 | no | Partnership/API lane; do not scrape protected or app-only data. |
| 74 | middle-east-banking-ai-summit | extractor-backlog | not-attempted | 0 | no | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 75 | middle-east-enterprise-ai-summit | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: bot-protection |
| 76 | umm-al-qura-events | active-collector | productive | 6 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 77 | leap-official-agendas | extractor-backlog | probe-blocked | 0 | no | Do not bypass protection; keep as blocked/partnership candidate: http-403 |
| 78 | fii10-official-program | extractor-backlog | not-attempted | 0 | no | Probe HTML/API shape, then decide whether an extractor is worth adding. |
| 79 | cityscape-global-official-program | partnership | partnership | 0 | no | Partnership/API lane; do not scrape protected or app-only data. |
| 80 | qassim-university-events | venue-dedupe | productive | 1 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 81 | jouf-university-programs | venue-dedupe | productive | 1 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 82 | money2020-middle-east-agendas | extractor-backlog | not-attempted | 0 | no | Latest deep probe recommends build-jsonld-event-extractor; build only if future date-complete rows are visible. |
| 83 | madinah-chamber-events | active-collector | zero-yield | 0 | no | Zero-yield for 21 runs; inspect dropped samples or reclassify cadence if the source is seasonal/archive-only. |
| 84 | madinah-architecture-festival | active-collector | productive | 1 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 85 | hayy-jameel-events | active-collector | productive | 67 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 86 | informa-connect-saudi-events | venue-dedupe | productive | 6 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |
| 87 | kau-events | venue-dedupe | zero-yield | 0 | no | no rows detected by extractor |
| 88 | saudicon-events | discovery-only | productive | 14 | no | Continue periodic collection; dedupe and auto-publish only through the candidate gate. |

