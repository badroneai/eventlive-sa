# EventLive Source Ops Report

- generated_at: 2026-07-11T11:18:38.111Z
- registry: data/source_registry.json
- candidates: data/source_candidates.json
- catalog: data/events_catalog.json
- run_state: data/source_run_state.json
- collection_basis: source_collection_report_adaptive
- collection_freshness: fresh

## Executive Summary

- Sources in registry: 85
- Runnable collector lanes: 45
- Sources due now: 19
- Sources attempted in latest collection: 19
- Sources deferred by cadence: 26
- Due-source coverage: 100%
- Scheduled runnable coverage: 100%
- Whole-registry attempted this run: 22%
- Healthy sources: 18
- Zero-yield sources: 0
- High-priority unattempted sources: 3
- Candidates: 452
- Actionable candidates: 0
- Ready for review: 0
- Ready for catalog promotion: 0
- Linked to catalog from candidates: 434
- Stale unpublished candidates: 0
- Duplicate risk: 0
- Recommendation: استخدم أقوى مرشحي الاكتشاف لبناء مطابقة آلية مع مصادر رسمية؛ لا تنشر مصدر اكتشاف منفرداً.

## Candidate Funnel

- review_status.approved-for-catalog: 434
- review_status.evidence-captured: 4
- review_status.new: 14
- publication_gate.catalog-review: 434
- publication_gate.duplicate-review: 1
- publication_gate.source-evidence: 17
- discovery_quality.strong-lead: 26
- discovery_quality.weak-lead: 1
- discovery_quality.watch-lead: 4

## Focus Queue

| Candidate | Source | Status | Next action |
|---|---|---|---|

## Discovery Leads

| Candidate | Source | City | Quality | Score | Signals | Official match |
|---|---|---|---|---:|---|---|
| 25TH WPC Energy Congress | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | WPC Energy Congress (Riyadh City Events, 115) |
| Saudi Pet & Vet Expo 5th Edition 2026 | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | Pet & Vet Expo (Riyadh City Events, 100) |
| Cat Show 3rd season in Saudi Pet & Vet Expo | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | Pet & Vet Expo (Riyadh City Events, 83) |
| Real Estate Excellence Award 2026 (REA 2026) | Eye of Riyadh Events | Riyadh | watch-lead | 45 | directory-source, saudi-location-signal | Real Estate Future Forum (Eye of Riyadh Official, 80) |
| Riyadh 2026 Venture Capital World Summit | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | World Stadiums and Arenas Summit (Riyadh City Events, 65) |
| Oxford Future of Real Estate Programme | Eye of Riyadh Events | Saudi Arabia | weak-lead | 25 | directory-source, saudi-location-signal, program-not-public-event, city-not-specific | Real Estate Future Forum (Eye of Riyadh Official, 60) |
| Riyadh Social and Language Exchange (Make New Friends) ✨ | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Riyadh Tech Mixer and Social (Tech / AI / Data / IT) ✨ | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Family Office Investment Meeting | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Family Office Investment Summit | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |

## Source Health

| Priority | Source | Status | Extracted | Candidates | Next action |
|---:|---|---|---:|---:|---|
| 1 | National Events Center / Saudi Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 2 | Visit Saudi Calendar | healthy | 11 | 12 | استمر بالمراجعة والتكرار قبل النشر. |
| 3 | Ministry of Culture Cultural Calendar | deferred | 0 | 0 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 4 | Ministry of Sport Events | deferred | 0 | 0 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 5 | webook Explore | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 6 | Hala Yalla | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 7 | Experience AlUla Events | healthy | 9 | 9 | استمر بالمراجعة والتكرار قبل النشر. |
| 8 | MDLBEAST Events | healthy | 3 | 3 | استمر بالمراجعة والتكرار قبل النشر. |
| 9 | Monsha'at All Events | deferred | 0 | 3 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 10 | Invest Saudi Events | healthy | 3 | 3 | استمر بالمراجعة والتكرار قبل النشر. |
| 11 | RFECC What's On | healthy | 6 | 6 | استمر بالمراجعة والتكرار قبل النشر. |
| 12 | Eye of Riyadh Events | deferred | 0 | 6 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 13 | 10times Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 14 | Eventbrite Saudi Arabia | deferred | 0 | 14 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 15 | Platinumlist Jeddah Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 16 | Tuwaiq Academy Bootcamps and Programs | healthy | 12 | 20 | استمر بالمراجعة والتكرار قبل النشر. |
| 17 | Future Skills MCIT Catalogue | healthy | 4 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 18 | Riyadh Season Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 19 | Visit Saudi Seasons | healthy | 4 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 20 | CODE MCIT Programs | deferred | 0 | 0 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 21 | Misk Hub Programs | healthy | 5 | 8 | استمر بالمراجعة والتكرار قبل النشر. |
| 22 | Dhahran Expo Calendar | healthy | 15 | 15 | استمر بالمراجعة والتكرار قبل النشر. |
| 23 | Ithra Events | healthy | 129 | 129 | استمر بالمراجعة والتكرار قبل النشر. |
| 24 | Saudi Digital Academy | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 25 | SDAIA Academy Programs | deferred | 0 | 0 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 26 | Saudi Events App | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 27 | Enjoy Saudi Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 28 | Misk Hub Events | deferred | 0 | 0 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 29 | Jeddah Chamber Exhibitions and Events Center | deferred | 0 | 0 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 30 | Saudi Pro League Fixtures | deferred | 0 | 0 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 31 | NEOM Newsroom Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 32 | Saudi Space Agency Events | deferred | 0 | 0 | مؤجل حتى 2026-07-14T09:22:14.505Z وفق الجدولة التكيفية. |
| 33 | CST Events and News | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 34 | Visit Saudi Summer Calendar PDF | deferred | 0 | 49 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 35 | Qiddiya Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 36 | Sela and Saudi Entertainment Expo | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 37 | Ministry of Culture Commission Calendars | deferred | 0 | 12 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 38 | Visit AlBalad / Historic Jeddah | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 39 | Discover Aseer Events | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 40 | Diriyah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 41 | Riyadh International Convention and Exhibition Center | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 42 | Aseer Season / Asir Development Authority | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 43 | Jeddah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 44 | Saudi Water Authority Events | healthy | 8 | 8 | استمر بالمراجعة والتكرار قبل النشر. |
| 45 | Saudi Universities and Technical Colleges | deferred | 0 | 6 | مؤجل حتى 2026-08-10T09:22:14.505Z وفق الجدولة التكيفية. |
| 46 | ExpoFP and Eventseye Saudi Trade Shows | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 47 | Meetup and Facebook Events Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 48 | Saudi Food and Drug Authority Events | healthy | 7 | 7 | استمر بالمراجعة والتكرار قبل النشر. |
| 49 | Saudi Contractors Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 50 | Saudi Winter Events Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 51 | Riyadh City Events | deferred | 0 | 94 | مؤجل حتى 2026-07-11T15:22:14.505Z وفق الجدولة التكيفية. |
| 52 | Monsha'at Academy Programs | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 53 | General Entertainment Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 54 | SDAIA Calendar and Events | deferred | 0 | 2 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 55 | Makkah Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 56 | SCEGA ePortal Events | healthy | 4 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 57 | Ministry of Commerce Upcoming Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 58 | Evento | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 59 | Asharqia Chamber Events | collection-error | 0 | 2 | fetch failed; page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/Pages/AllChamberEvents.aspx", waiting until "domcontentloaded"
 |
| 60 | Qassim Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-07-12T09:22:14.505Z وفق الجدولة التكيفية. |
| 61 | Abha Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 62 | Baha Municipality Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 63 | Baha Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 64 | Jouf Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 65 | Northern Borders Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-07-14T09:22:14.505Z وفق الجدولة التكيفية. |
| 66 | Tabuk Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-07-14T09:22:14.505Z وفق الجدولة التكيفية. |
| 67 | Jazan Chamber Events | deferred | 0 | 1 | مؤجل حتى 2026-07-11T15:22:14.505Z وفق الجدولة التكيفية. |
| 68 | Hail Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 69 | Najran Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 70 | Platinumlist Riyadh Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 71 | Najran Municipality Summer Events | deferred | 0 | 1 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 72 | Platinumlist Saudi City Network | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 73 | GOV.SA National Platform Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 74 | Middle East Banking AI & Analytics Summit Official | not-collected | 0 | 1 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 75 | Middle East Enterprise AI & Analytics Summit Official | not-collected | 0 | 1 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 76 | Umm Al-Qura University Events Center | healthy | 4 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 77 | LEAP Official Event and Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 78 | FII 10th Edition Official Program | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 79 | Cityscape Global Official Program | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 80 | Qassim University Events | deferred | 0 | 1 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 81 | Jouf University Summer Programs | deferred | 0 | 1 | مؤجل حتى 2026-07-18T09:22:14.505Z وفق الجدولة التكيفية. |
| 82 | Money20/20 Middle East Official Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 83 | Madinah Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-07-14T09:22:14.505Z وفق الجدولة التكيفية. |
| 84 | Madinah International Architecture Festival | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 85 | Hayy Jameel What's On | healthy | 11 | 11 | استمر بالمراجعة والتكرار قبل النشر. |
