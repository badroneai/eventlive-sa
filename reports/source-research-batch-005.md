# Source Research Batch 005

Processed at: 2026-07-03

Inputs:

- `/Users/baderalsalman/.codex/attachments/d0d3b1c5-156f-4b38-b30e-d52be5775906/pasted-text.txt`
- `/Users/baderalsalman/.codex/attachments/fa241116-ef1e-403b-a100-c11ed915f1d5/pasted-text.txt`

## Executive Outcome

This batch mostly reconfirmed sources already represented in the registry and added three focused lanes. The source registry increased from 49 to 52 sources.

No public catalog events were created from this batch. The input is a source research package, not a list of date-complete events ready for publication.

## Added Sources

| id | source | policy | gate | reason |
|---|---|---|---|---|
| `saudi-winter-calendar-spa` | Saudi Winter Events Calendar | monitor-public | source-evidence | Official SPA/STA campaign context for Saudi winter seasons, but not a direct event feed. |
| `riyadh-city-events` | Riyadh City Events | official-feed-preferred | extraction | Official city-level Riyadh event lane that complements national and season calendars. |
| `monshaat-academy-programs` | Monsha'at Academy Programs | partnership-needed | extraction | SME training lane separate from Monsha'at general event listings. |

## Confirmed Already Covered

The batch reconfirmed these registry sources: Visit Saudi Calendar, Riyadh Season, Ministry of Culture, Ministry of Sport, Experience AlUla, MDLBEAST, Hala Yalla, webook, Tuwaiq Academy, CODE, Future Skills, Misk Hub, SDAIA Academy, Saudi Digital Academy, Eventbrite, Eye of Riyadh, Saudi universities, RFECC, 10times, and Platinumlist.

## Not Added

| source | reason |
|---|---|
| Wafy | Mentioned only as part of an aggregator bundle and with a `coming-soon` URL; no stable event listing was supplied. Keep outside the registry until it exposes a usable events page. |
| King Saud University as a separate source | Already covered under `saudi-university-events`; split into institution-level sources only after verifying each university calendar pattern. |
| Alternate landing URLs for existing sources | Not added to avoid duplicates. Keep canonical registry URLs stable unless an extractor requires a better URL. |

## Operating Decisions

- SPA or campaign announcements can support evidence but should not generate event candidates unless a canonical event URL exists.
- Riyadh city-level listings are useful because they capture community and cultural programs that may not appear in national calendars.
- Monsha'at Academy is distinct from Monsha'at events because it is training/program oriented and may require login or partnership access.
- Aggregators and marketplaces remain discovery layers; official or organizer pages remain the source of record.

## Next Extractor Priorities From This Batch

1. Riyadh.sa listing/detail discovery with duplicate matching against Visit Saudi and Riyadh Season.
2. Monsha'at Academy access review to determine whether public program pages expose complete schedules.
3. Saudi Winter Calendar PDF/news reconciliation pipeline that links campaign rows to canonical event pages.
