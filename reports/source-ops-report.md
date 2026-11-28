# EventLive Source Ops Report

- generated_at: 2026-11-28T10:52:29.096Z
- registry: data/source_registry.json
- candidates: data/source_candidates.json
- catalog: data/events_catalog.json
- run_state: data/source_run_state.json
- collection_basis: source_collection_report_adaptive
- collection_freshness: fresh

## Executive Summary

- Sources in registry: 88
- Runnable collector lanes: 48
- Sources due now: 11
- Sources attempted in latest collection: 11
- Sources deferred by cadence: 37
- Due-source coverage: 100%
- Scheduled runnable coverage: 100%
- Whole-registry attempted this run: 13%
- Healthy sources: 10
- Zero-yield sources: 1
- High-priority unattempted sources: 3
- Candidates: 335
- Actionable candidates: 2
- Ready for review: 2
- Ready for catalog promotion: 0
- Linked to catalog from candidates: 314
- Stale unpublished candidates: 0
- Duplicate risk: 1
- Recommendation: ابدأ بمراجعة التكرارات المحتملة قبل اعتماد أي مرشح جديد.

## Candidate Funnel

- review_status.approved-for-catalog: 314
- review_status.ready-for-review: 2
- review_status.new: 12
- review_status.evidence-captured: 7
- publication_gate.catalog-review: 314
- publication_gate.duplicate-review: 1
- publication_gate.human-review: 1
- publication_gate.source-evidence: 19
- discovery_quality.strong-lead: 7
- discovery_quality.watch-lead: 7

## Focus Queue

| Candidate | Source | Status | Next action |
|---|---|---|---|
| King Abdulaziz Falconry Festival | Visit Saudi Seasons | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| Registration Open | Saudi Universities and Technical Colleges | ready-for-review/human-review | اتخذ قرار اعتماد أو رفض. |

## Discovery Leads

| Candidate | Source | City | Quality | Score | Signals | Official match |
|---|---|---|---|---:|---|---|
| 12th Middle East Banking AI & Analytics Summit 2027 | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | 12th Middle East Banking AI & Analytics Summit 2026 (Middle East Banking AI & Analytics Summit Official, 101) |
| Real Estate Excellence Award 2026 (REA 2026) | Eye of Riyadh Events | Riyadh | watch-lead | 45 | directory-source, saudi-location-signal | Real Estate Future Forum (Eye of Riyadh Official, 80) |
| World GRC Summit | Eventbrite Saudi Arabia | Riyadh | watch-lead | 50 | saudi-location-signal, event-topic-fit | World Stadiums and Arenas Summit (Riyadh City Events, 65) |
| AERO Middle East x Sand & Fun 2027 | Saudicon Events | Saudi Arabia | - | 0 | - | General Aviation Airshow — AERO Middle East x Sand & Fun (Riyadh City Events, 63) |
| 2027年中东通用航空展暨沙漠欢乐节（AERO Middle East x Sand & Fun 2027） | Saudicon Events | Saudi Arabia | - | 0 | - | General Aviation Airshow — AERO Middle East x Sand & Fun (Riyadh City Events, 63) |
| Livestock Future Expo & Confrence 2027 | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | Saudi Makes Future AI Expo (Riyadh City Events, 55) |
| EDUGATE Riyadh 2nd Edition – International Universities & Career Path Fair | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Founders Pitch Night | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| 2nd Annual BICSI Saudi Arabia Conference and Exhibition | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| التعليم العالي في ماليزيا | Eventbrite Saudi Arabia | Khobar | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |

## Source Health

| Priority | Source | Status | Extracted | Candidates | Next action |
|---:|---|---|---:|---:|---|
| 1 | National Events Center / Saudi Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 2 | Visit Saudi Calendar | healthy | 18 | 10 | استمر بالمراجعة والتكرار قبل النشر. |
| 3 | Ministry of Culture Cultural Calendar | deferred | 0 | 0 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 4 | Ministry of Sport Events | deferred | 0 | 0 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 5 | webook Explore | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 6 | Hala Yalla | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 7 | Experience AlUla Events | healthy | 5 | 10 | استمر بالمراجعة والتكرار قبل النشر. |
| 8 | MDLBEAST Events | healthy | 2 | 3 | استمر بالمراجعة والتكرار قبل النشر. |
| 9 | Monsha'at All Events | deferred | 0 | 2 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 10 | Invest Saudi Events | deferred | 0 | 0 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 11 | RFECC What's On | healthy | 2 | 2 | استمر بالمراجعة والتكرار قبل النشر. |
| 12 | Eye of Riyadh Events | deferred | 0 | 1 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 13 | 10times Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 14 | Eventbrite Saudi Arabia | deferred | 0 | 12 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 15 | Platinumlist Jeddah Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 16 | Tuwaiq Academy Bootcamps and Programs | deferred | 0 | 8 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 17 | Future Skills MCIT Catalogue | deferred | 0 | 0 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 18 | Riyadh Season Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 19 | Visit Saudi Seasons | healthy | 12 | 12 | استمر بالمراجعة والتكرار قبل النشر. |
| 20 | CODE MCIT Programs | deferred | 0 | 0 | مؤجل حتى 2026-12-04T11:11:28.701Z وفق الجدولة التكيفية. |
| 21 | Misk Hub Programs | deferred | 0 | 14 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 22 | Dhahran Expo Calendar | healthy | 5 | 7 | استمر بالمراجعة والتكرار قبل النشر. |
| 23 | Ithra Events | healthy | 64 | 82 | استمر بالمراجعة والتكرار قبل النشر. |
| 24 | Saudi Digital Academy | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 25 | SDAIA Academy Programs | deferred | 0 | 0 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 26 | Saudi Events App | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 27 | Enjoy Saudi Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 28 | Misk Hub Events | deferred | 0 | 0 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 29 | Jeddah Chamber Exhibitions and Events Center | deferred | 0 | 0 | مؤجل حتى 2026-12-04T11:11:28.701Z وفق الجدولة التكيفية. |
| 30 | Saudi Pro League Fixtures | deferred | 0 | 0 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 31 | NEOM Newsroom Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 32 | Saudi Space Agency Events | deferred | 0 | 2 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 33 | CST Events and News | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 34 | Visit Saudi Summer Calendar PDF | deferred | 0 | 63 | مؤجل حتى 2026-12-02T20:51:27.505Z وفق الجدولة التكيفية. |
| 35 | Qiddiya Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 36 | Sela and Saudi Entertainment Expo | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 37 | Ministry of Culture Commission Calendars | deferred | 0 | 6 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 38 | Visit AlBalad / Historic Jeddah | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 39 | Discover Aseer Events | deferred | 0 | 1 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 40 | Diriyah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 41 | Riyadh International Convention and Exhibition Center | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 42 | Aseer Season / Asir Development Authority | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 43 | Jeddah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 44 | Saudi Water Authority Events | deferred | 0 | 5 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 45 | Saudi Universities and Technical Colleges | deferred | 0 | 3 | مؤجل حتى 2026-12-15T09:47:53.470Z وفق الجدولة التكيفية. |
| 46 | ExpoFP and Eventseye Saudi Trade Shows | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 47 | Meetup and Facebook Events Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 48 | Saudi Food and Drug Authority Events | deferred | 0 | 0 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 49 | Saudi Contractors Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 50 | Saudi Winter Events Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 51 | Riyadh City Events | zero-yield | 0 | 18 | No future date-complete candidates found by the conservative extractor. |
| 52 | Monsha'at Academy Programs | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 53 | General Entertainment Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 54 | SDAIA Calendar and Events | deferred | 0 | 1 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 55 | Makkah Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-12-04T11:11:28.701Z وفق الجدولة التكيفية. |
| 56 | SCEGA ePortal Events | deferred | 0 | 0 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 57 | Ministry of Commerce Upcoming Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 58 | Evento | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 59 | Asharqia Chamber Events | deferred | 0 | 1 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 60 | Qassim Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 61 | Abha Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-12-04T11:11:28.701Z وفق الجدولة التكيفية. |
| 62 | Baha Municipality Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 63 | Baha Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 64 | Jouf Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 65 | Northern Borders Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 66 | Tabuk Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-12-04T11:11:28.701Z وفق الجدولة التكيفية. |
| 67 | Jazan Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
| 68 | Hail Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 69 | Najran Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 70 | Platinumlist Riyadh Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 71 | Najran Municipality Summer Events | deferred | 0 | 0 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 72 | Platinumlist Saudi City Network | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 73 | GOV.SA National Platform Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 74 | Middle East Banking AI & Analytics Summit Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 75 | Middle East Enterprise AI & Analytics Summit Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 76 | Umm Al-Qura University Events Center | healthy | 3 | 47 | استمر بالمراجعة والتكرار قبل النشر. |
| 77 | LEAP Official Event and Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 78 | FII 10th Edition Official Program | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 79 | Cityscape Global Official Program | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 80 | Qassim University Events | deferred | 0 | 1 | مؤجل حتى 2026-12-04T11:11:28.701Z وفق الجدولة التكيفية. |
| 81 | Jouf University Summer Programs | deferred | 0 | 0 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 82 | Money20/20 Middle East Official Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 83 | Madinah Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-12-04T11:11:28.701Z وفق الجدولة التكيفية. |
| 84 | Madinah International Architecture Festival | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 85 | Hayy Jameel What's On | healthy | 7 | 10 | استمر بالمراجعة والتكرار قبل النشر. |
| 86 | Informa Connect Saudi Event Portfolio | deferred | 0 | 5 | مؤجل حتى 2026-12-04T11:11:28.701Z وفق الجدولة التكيفية. |
| 87 | King Abdulaziz University Events | deferred | 0 | 1 | مؤجل حتى 2026-11-30T11:11:28.701Z وفق الجدولة التكيفية. |
| 88 | Saudicon Events | deferred | 0 | 6 | مؤجل حتى 2026-11-28T11:11:28.701Z وفق الجدولة التكيفية. |
