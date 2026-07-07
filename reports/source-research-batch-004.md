# Source Research Batch 004

Processed at: 2026-07-03

Input: `/Users/baderalsalman/.codex/attachments/01299af5-2470-483f-98e5-b591ede9d623/pasted-text.txt`

## Executive Outcome

This batch reconfirmed most of the existing top EventLive source strategy and added nine missing source lanes. The source registry increased from 40 to 49 sources.

No public catalog events were created from this batch. The input described sources, not date-complete event records.

## Added Sources

| id | source | policy | gate | reason |
|---|---|---|---|---|
| `ricec-events` | Riyadh International Convention and Exhibition Center | monitor-public | duplicate-review | Adds the other major Riyadh exhibition venue beyond RFECC. |
| `aseer-season-asda` | Aseer Season / Asir Development Authority | monitor-public | source-evidence | Official authority evidence for Aseer season programming; complements Discover Aseer. |
| `jeddah-season` | Jeddah Season | monitor-public | source-evidence | Major season lane for Jeddah, but inactive or archived pages must not publish. |
| `saudi-water-authority-events` | Saudi Water Authority Events | official-feed-preferred | extraction | Official sector-government events for water and sustainability. |
| `saudi-university-events` | Saudi Universities and Technical Colleges | monitor-public | source-evidence | Academic event discovery lane; must later split into institution-specific sources. |
| `expofp-eventseye-saudi` | ExpoFP and Eventseye Saudi Trade Shows | candidate-only | duplicate-review | Additional trade-show discovery, never final proof. |
| `meetup-facebook-saudi-events` | Meetup and Facebook Events Saudi Arabia | candidate-only | source-evidence | Grassroots discovery lane; requires secondary verification. |
| `sfda-events` | Saudi Food and Drug Authority Events | monitor-public | extraction | Official healthcare, food, pharma, and regulatory event source. |
| `saudi-contractors-authority-events` | Saudi Contractors Authority Events | monitor-public | extraction | Official construction and infrastructure sector event source. |

## Confirmed Already Covered

The batch repeated or reinforced sources already present in the registry: NEC/Saudi Events, Visit Saudi, Ministry of Culture, Riyadh Season, webook, Experience AlUla, MDLBEAST, Saudi Pro League, Invest Saudi, Diriyah Season, Tuwaiq, SDAIA Academy, CODE, Misk Hub, Future Skills, RFECC, Eye of Riyadh, Eventbrite, and Hala Yalla.

## Operating Decisions

- Do not duplicate existing strategic sources when a batch gives a different landing URL only.
- Venue calendars such as RICEC are valuable but require duplicate review against organizer and ticketing sources.
- Regional season pages can be registered early, but inactive or archived pages stay evidence-only.
- Government sector authorities can move toward extraction when they expose complete event fields.
- University events are not one source. EventLive should split this lane into verified institution sources before automation.
- Community platforms are discovery-only and must not auto-publish without secondary evidence.
- Trade-show directories help detect missed events but cannot be source of record.

## Next Extractor Priorities From This Batch

1. RICEC event listing/detail discovery.
2. Saudi Water Authority event extractor with news-vs-event filtering.
3. SFDA event/workshop discovery.
4. Saudi Contractors Authority event/workshop discovery.
5. Institution-specific university source split, starting with KAUST, KFUPM, KSU, and PNU only after each page pattern is verified.
