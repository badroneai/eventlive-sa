# Source Research Batch 003

Processed at: 2026-07-03

Input: `/Users/baderalsalman/.codex/attachments/4aa7a973-1c6a-402f-ae38-3d31bffa1f08/pasted-text.txt`

## Executive Outcome

This batch expanded the EventLive source registry from 27 to 40 sources. No public catalog events were created from this research batch, because the input is a source catalog rather than date-complete event records.

The operating decision is registry-first: EventLive should know these sources, monitor them, and build extractors only where a source exposes complete public event fields.

## Added Sources

| id | source | policy | gate | reason |
|---|---|---|---|---|
| `misk-hub-events` | Misk Hub Events | official-feed-preferred | extraction | Separate Misk event lane for tours, skills, career, and youth events. |
| `jcci-events-center` | Jeddah Chamber Exhibitions and Events Center | monitor-public | duplicate-review | Strong Jeddah venue/chamber source for exhibitions, forums, and roadshows. |
| `saudi-pro-league-fixtures` | Saudi Pro League Fixtures | official-feed-preferred | extraction | Official football fixture lane; needs fixture route or data partnership. |
| `neom-newsroom-events` | NEOM Newsroom Events | monitor-public | source-evidence | Useful official signal, but global appearances must not auto-publish as local events. |
| `saudi-space-agency-events` | Saudi Space Agency Events | monitor-public | extraction | Official space/science lane; detail pages can provide evidence while root access is unstable. |
| `cst-events-news` | CST Events and News | monitor-public | source-evidence | Sector signal for telecom, space, and tech; news-only pages stay evidence-only. |
| `visit-saudi-calendar-pdf` | Visit Saudi Calendar PDF | official-feed-preferred | extraction | Official PDF reference layer; requires reconciliation to canonical web/event pages. |
| `qiddiya-events` | Qiddiya Events | monitor-public | source-evidence | Strategic future destination source; wait for real public event pages. |
| `sela-sea-expo` | Sela and Saudi Entertainment Expo | monitor-public | source-evidence | Entertainment-industry and venue source; needs stable per-event pages. |
| `moc-cultural-subportals` | Ministry of Culture Commission Calendars | official-feed-preferred | extraction | Commission-level cultural calendars for music, heritage, architecture, and design. |
| `historic-jeddah-albalad` | Visit AlBalad / Historic Jeddah | monitor-public | extraction | Official Jeddah heritage lane for AlBalad public events. |
| `discover-aseer-events` | Discover Aseer Events | monitor-public | source-evidence | Southern Saudi destination lane; current endpoint needs stability check. |
| `diriyah-season` | Diriyah Season | monitor-public | source-evidence | High-value season source, but coming-soon pages must never create event rows. |

## Confirmed Already Covered

The batch also confirmed several priorities already present in the registry: National Events Center, Saudi Events App, Ministry of Culture main calendar, Riyadh Season, Visit Saudi Calendar, Experience AlUla, MDLBEAST, RFECC, Dhahran Expo, Misk Hub Programs, Hala Yalla, webook, Eventbrite, Eye of Riyadh, 10times, Monsha'at, SDAIA Academy, Tuwaiq Academy, CODE, Saudi Digital Academy, and Future Skills.

## Rules Captured

- Misk and training sources often publish registration deadlines. These must remain separate from `event_end`.
- PDFs are discovery/reference material until reconciled against a web page or official organizer URL.
- Newsroom sources can create evidence, not catalog rows, unless the page is a public event page with complete fields.
- Coming-soon pages and future venue announcements should never create source candidates.
- Global appearances from Saudi entities should not become Saudi public events unless the event is Saudi-hosted or clearly user-attendable in the kingdom.
- Ticketing marketplaces remain useful as deeplinks, but the source of record should be the official organizer or venue.

## Next Extractor Priorities

1. Misk Hub Events detail-page extractor, reusing the existing Misk deadline-vs-program-date guard.
2. JCCI listing/detail extractor with duplicate review against Visit Saudi, MoC, and ticketing sources.
3. MoC commission subportal extractor discovery for music and heritage calendars.
4. Saudi Pro League fixture endpoint discovery or partnership feed planning.
5. Visit Saudi PDF parser as a discovery layer only, with canonical URL reconciliation before candidates.
