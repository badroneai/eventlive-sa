# EventLive Source Research Batch 002

Processed at: 2026-07-03

## Intake Result

This batch largely reinforced the existing EventLive source strategy: official national calendars first, official organizers and venues next, marketplaces as candidate/evidence channels, and aggregators/community sources as non-auto-publish discovery.

## Added To Registry

| Source | Registry id | Policy | Immediate extractor |
|---|---|---|---|
| Saudi Events App | `saudi-events-app` | partnership/API needed | no |
| Enjoy Saudi Events | `enjoy-saudi-events` | official calendar, human review before extractor launch | no |

## Confirmed Already Covered

- Visit Saudi Calendar
- National Events Center / Saudi Events
- Riyadh Season
- Ministry of Culture Cultural Calendar
- webook
- Experience AlUla
- MDLBEAST
- Hala Yalla
- Riyadh Front Exhibition & Conference Center
- Tuwaiq Academy
- Monsha'at
- SDAIA Academy
- Future Skills MCIT
- Eye of Riyadh
- 10times

## Operating Decision

Saudi Events App is strategically important because it is the official NEC app destination for nationwide event discovery, but ingestion should wait for a stable official feed/API or app-backed endpoint.

Enjoy Saudi is an official General Entertainment Authority event site. It has public event pages, but extractor launch should include stale-event filtering and detail-page verification so old events are not republished.

## No Change

- Aggregators remain `source_evidence_only` or candidate-only.
- Hala Yalla and webook remain high-value ticketing/verification channels, not primary auto-publish sources.
- Existing official sources remain the highest-quality auto-publish path when they expose date-complete records.
