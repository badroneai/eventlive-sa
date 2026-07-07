# Source Research Batch 006

Processed at: 2026-07-03

Input: `/Users/baderalsalman/.codex/attachments/9f3892dc-b023-4cb9-89d9-c6f1009c47f9/pasted-text.txt`

## Executive Outcome

This batch confirmed the current source strategy and added two operationally distinct official lanes. The source registry increased from 52 to 54 sources.

No public catalog events were created from this batch. The input is source research and operating guidance, not date-complete event rows.

## Added Sources

| id | source | policy | gate | reason |
|---|---|---|---|---|
| `gea-entertainment-events` | General Entertainment Authority Events | official-feed-preferred | extraction | Parent authority source for entertainment verification beyond Enjoy Saudi. |
| `sdaia-calendar-events` | SDAIA Calendar and Events | official-feed-preferred | extraction | Authority-level SDAIA event lane with stable EventID detail pages, separate from academy bootcamps. |

## Updated Existing Sources

| id | update |
|---|---|
| `monshaat-events` | Canonical listing route changed to `/en/events-list`; evidence requirement now calls out explicit start/end datetime cards. |
| `rfecc-whats-on` | Canonical route changed to `/whats-on/` for month-by-month venue calendar discovery. |
| `future-skills-catalog` | Kept existing catalogue URL because it powers the current collector; documented `/en/calendar` as the next extractor target. |
| `riyadh-season` | Public URL refined to `/en/explore`; notes now preserve the app-level/full-schedule caveat. |
| `hala-yalla` | URL refined to `/sa-en/ticketing`; notes clarify its role as a B2B partnership channel. |
| `riyadh-city-events` | Public URL refined to `/en/events/all`. |

## Confirmed Already Covered

The batch reconfirmed: NEC, Visit Saudi Calendar, Ministry of Culture, Riyadh Season, Diriyah Season, Jeddah Season, Experience AlUla, MDLBEAST, Tuwaiq, Future Skills, CODE, Monsha'at, RFECC, Riyadh City, Misk Hub, webook, Hala Yalla, Eye of Riyadh, 10times, Eventbrite, and Invest Saudi as an existing radar/registered source.

## Radar / Not Added

| item | decision |
|---|---|
| Invest Saudi direct verification | Already registered as `invest-saudi-events`; batch flags direct verification as a future task rather than a new source. |
| Ministry of Sport / SPL structured sports data | Already represented by Ministry of Sport and SPL fixture lanes; deeper sports feed/API work remains a task. |
| Jeddah Superdome and JAX District | Not added yet because the batch explicitly says they require separate research per venue. |
| Community-only sources | Kept out of this batch; Eventbrite remains the low-trust discovery layer. |

## Operating Decisions

- Keep IDs stable for sources that already have collectors or reports.
- Do not replace the Future Skills catalogue URL until the `/en/calendar` path is tested against the existing extractor.
- Treat GEA as authority-of-record for entertainment verification, not as a replacement for Enjoy, Riyadh Season, or Visit Saudi.
- Treat SDAIA Calendar and SDAIA Academy as separate lanes because public events and academy bootcamps have different extraction shapes.
- For training sources, keep registration deadlines separate from event/program start and end dates.

## Next Implementation Tasks

1. Test Future Skills `/en/calendar` against the current extractor before switching the registry URL.
2. Build a GEA extractor only after confirming event-card completeness and duplicate behavior.
3. Build an SDAIA EventID detail-page extractor.
4. Add a simple duplicate key before broad ingestion: `normalized_title + start_date + city`.
5. Research JAX District and Jeddah Superdome as separate venue sources before adding them to the registry.
