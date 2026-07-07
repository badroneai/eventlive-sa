# EventLive Source Research Batch 001

Processed at: 2026-07-03

## Intake Result

This batch was reviewed as a source-supply update for Saudi events, seasons, venues, and training programs.

## Added To Registry

| Source | Registry id | Policy | Immediate extractor |
|---|---|---|---|
| Dhahran Expo | `dhahran-expo-calendar` | venue discovery, duplicate review | no |
| Ithra | `ithra-events` | official venue, human review | no |
| Saudi Digital Academy | `saudi-digital-academy` | official training, extraction needed | no |
| SDAIA Academy | `sdaia-academy-programs` | official government training, extraction needed | no |

## Already Covered

- NEC / Saudi Events
- Visit Saudi Calendar
- Ministry of Culture
- Riyadh Season
- webook
- Experience AlUla
- MDLBEAST
- my.gov.sa partnership lane
- Ministry of Sport
- Monsha'at
- Tuwaiq Academy
- CODE MCIT
- Hala Yalla
- Misk Hub
- Future Skills MCIT
- Eye of Riyadh
- 10times
- Invest Saudi
- Riyadh Front Exhibition & Conference Center
- Eventbrite Saudi Arabia

## Deferred

- University event sources: keep as a future batch because each university needs its own URL, trust policy, and extraction shape.
- CODE detail extraction: listing is supported, but current public pages mostly expose stale or non-date-complete records; keep conservative.
- Saudi Digital Academy: DNS resolution failed from the current collector environment, so no automated extractor was enabled.

## Operating Decision

Do not enable auto-publication for a new source until it exposes a date-complete event or program window with an official URL. Application deadlines, news articles, and generic yearly labels are not enough for EventLive publication.
