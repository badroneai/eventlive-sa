# EventLive Source Research Batch 007

Processed at: 2026-07-09

## Intake Result

This batch reviewed `https://my.gov.sa/ar/events` as the first Harvest Hub source-intake target for EventLive.

Detailed platform recon: `reports/mygov-platform-recon-2026-07-09.md`

## Added To Registry

| Source | Registry id | Policy | Immediate extractor |
|---|---|---|---|
| GOV.SA National Platform Events | `my-gov-sa-events` | partnership required, source evidence | no |

## Probe Evidence

- Direct HTTP probe returned `403` with `cf-mitigated: challenge`.
- Browser probe reached `https://my.gov.sa/ar/events` but stopped at Cloudflare `Just a moment...`.
- Public search indexes expose the main listing and event detail routes such as `/ar/events/11004`, `/ar/events/13503`, `/ar/events/11905`, `/ar/events/12284`, `/ar/events/1681253`, `/ar/events/17022`, `/ar/events/360800`, and `/ar/events/2708079`.
- Indexed detail content shows useful event fields: title, category, organizer, email/phone when available, location, event date range, description, image, share links, and registration entry point.
- Wayback CDX exposed archived GOV.SA event detail pages. `npm run sources:mygov:wayback` now extracts structured embedded payload fields and produced 10 archived event records, 10 date-complete records, and 10 structured payloads in the latest sample run.
- Search-indexed GOV.SA service pages reveal an NEC National Calendar lane: `National Calendar Dashboard` and `Add Event to the National Calendar`, both pointing toward authenticated NEC e-services rather than public scraping.
- Second-pass NEC recon found the public Angular e-services app at `https://login.nec.gov.sa/app/agreements`, a backend base string `https://eservices-service.nec.gov.sa/`, and a static catalog with three National Calendar services: Add Event, View National Calendar Events, and National Calendar Dashboard. The `View National Calendar Events` description explicitly mentions filtering and exporting event data.

## Capability Fit For EventLive

- Official corroboration layer for government and ministry events already found through Visit Saudi, NEC, Ministry of Culture, Monsha'at, chambers, or city calendars.
- Discovery lane for government participation events and consultation-style events that may not appear in tourism or ticketing calendars.
- Candidate enrichment source for organizer ownership, contact fields, public-sector category, and official registration/service links.
- Partnership lane candidate because the protected listing page should not be treated as a scraping target.
- Parser lab via Wayback archived pages.
- Strategic API/feed target through NEC National Calendar, especially the `View National Calendar Events` export flow, DGA API Inventory, or open-data request channels.

## Operating Decision

Do not enable direct automated extraction from `my.gov.sa/ar/events` now.

Treat GOV.SA as:

- `partnership_required` for full listing/feed access, preferably via NEC National Calendar.
- `source-evidence` for manually reviewed indexed detail pages.
- `archive-evidence` for Wayback parser/radar outputs.
- A useful official-source corroboration layer, not an auto-publish feed.

Next safe step: request NEC access to `View National Calendar Events` or an equivalent API/export with event ID, Arabic/English title, organizer, classification, dates, region/city/site, status, official URL, registration URL, image URL, and last-updated timestamp, then run a small sample gate before any catalog promotion.
