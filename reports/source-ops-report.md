# EventLive Source Ops Report

- generated_at: 2026-08-12T14:06:27.871Z
- registry: data/source_registry.json
- candidates: data/source_candidates.json
- catalog: data/events_catalog.json
- run_state: data/source_run_state.json
- collection_basis: source_collection_report_adaptive
- collection_freshness: fresh

## Executive Summary

- Sources in registry: 88
- Runnable collector lanes: 48
- Sources due now: 26
- Sources attempted in latest collection: 26
- Sources deferred by cadence: 22
- Due-source coverage: 100%
- Scheduled runnable coverage: 100%
- Whole-registry attempted this run: 30%
- Healthy sources: 21
- Zero-yield sources: 4
- High-priority unattempted sources: 3
- Candidates: 603
- Actionable candidates: 8
- Ready for review: 8
- Ready for catalog promotion: 0
- Linked to catalog from candidates: 570
- Stale unpublished candidates: 0
- Duplicate risk: 6
- Recommendation: ابدأ بمراجعة التكرارات المحتملة قبل اعتماد أي مرشح جديد.

## Candidate Funnel

- review_status.approved-for-catalog: 570
- review_status.ready-for-review: 8
- review_status.evidence-captured: 17
- review_status.new: 8
- publication_gate.catalog-review: 570
- publication_gate.duplicate-review: 8
- publication_gate.source-evidence: 25
- discovery_quality.strong-lead: 19
- discovery_quality.weak-lead: 1
- discovery_quality.watch-lead: 5

## Focus Queue

| Candidate | Source | Status | Next action |
|---|---|---|---|
| Mahabah | Discover Aseer Events | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| Esports World Cup | Eye of Riyadh Events | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| Saudi Wood Expo 2026 | Eye of Riyadh Events | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| Saudi Industrial Series | Eye of Riyadh Events | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| IN ACT - ACT X | Visit Saudi Calendar | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| Cityscape Global 2026 | Invest Saudi Events | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| sammrah | Discover Aseer Events | ready-for-review/duplicate-review | دليل تجميعي؛ ابن مطابقة مصدر رسمي قبل أي نشر آلي. |
| Sound of Abha Fest (SAF) | Discover Aseer Events | ready-for-review/duplicate-review | دليل تجميعي؛ ابن مطابقة مصدر رسمي قبل أي نشر آلي. |

## Discovery Leads

| Candidate | Source | City | Quality | Score | Signals | Official match |
|---|---|---|---|---:|---|---|
| 25TH WPC Energy Congress | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | WPC Energy Congress (Riyadh City Events, 115) |
| معرض Big 5 Construct Saudi 2026 | Saudicon Events | Riyadh | - | 0 | - | Big 5 Construct Saudi (dmg events Official, 107) |
| Real Estate Excellence Award 2026 (REA 2026) | Eye of Riyadh Events | Riyadh | watch-lead | 45 | directory-source, saudi-location-signal | Real Estate Future Forum (Eye of Riyadh Official, 80) |
| قمة البيانات الذكية والذكاء الاصطناعي | Saudicon Events | Riyadh | - | 0 | - | معسكر علم البيانات والذكاء الاصطناعي (Tuwaiq Academy Bootcamps and Programs, 75) |
| بطولة كأس العالم للرياضات الإلكترونية | Saudicon Events | Saudi Arabia | - | 0 | - | منطقة مشجعي كأس العالم 2026 (Visit Saudi Summer Calendar PDF, 65) |
| Oxford Future of Real Estate Programme | Eye of Riyadh Events | Saudi Arabia | weak-lead | 25 | directory-source, saudi-location-signal, program-not-public-event, city-not-specific | Real Estate Future Forum (Eye of Riyadh Official, 60) |
| Family Office Investment Meeting | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Family Office Investment Summit | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Sucession Planning Program | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Jeddah Fintech Week 2026 | Eventbrite Saudi Arabia | Jeddah | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |

## Source Health

| Priority | Source | Status | Extracted | Candidates | Next action |
|---:|---|---|---:|---:|---|
| 1 | National Events Center / Saudi Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 2 | Visit Saudi Calendar | healthy | 28 | 16 | استمر بالمراجعة والتكرار قبل النشر. |
| 3 | Ministry of Culture Cultural Calendar | deferred | 0 | 0 | مؤجل حتى 2026-08-12T19:44:07.323Z وفق الجدولة التكيفية. |
| 4 | Ministry of Sport Events | deferred | 0 | 0 | مؤجل حتى 2026-08-12T19:44:07.323Z وفق الجدولة التكيفية. |
| 5 | webook Explore | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 6 | Hala Yalla | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 7 | Experience AlUla Events | healthy | 9 | 9 | استمر بالمراجعة والتكرار قبل النشر. |
| 8 | MDLBEAST Events | healthy | 4 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 9 | Monsha'at All Events | deferred | 0 | 2 | مؤجل حتى 2026-08-12T19:44:07.323Z وفق الجدولة التكيفية. |
| 10 | Invest Saudi Events | healthy | 3 | 3 | استمر بالمراجعة والتكرار قبل النشر. |
| 11 | RFECC What's On | healthy | 6 | 6 | استمر بالمراجعة والتكرار قبل النشر. |
| 12 | Eye of Riyadh Events | deferred | 0 | 6 | مؤجل حتى 2026-08-12T19:44:07.323Z وفق الجدولة التكيفية. |
| 13 | 10times Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 14 | Eventbrite Saudi Arabia | deferred | 0 | 8 | مؤجل حتى 2026-08-12T19:44:07.323Z وفق الجدولة التكيفية. |
| 15 | Platinumlist Jeddah Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 16 | Tuwaiq Academy Bootcamps and Programs | healthy | 12 | 37 | استمر بالمراجعة والتكرار قبل النشر. |
| 17 | Future Skills MCIT Catalogue | healthy | 5 | 5 | استمر بالمراجعة والتكرار قبل النشر. |
| 18 | Riyadh Season Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 19 | Visit Saudi Seasons | healthy | 17 | 18 | استمر بالمراجعة والتكرار قبل النشر. |
| 20 | CODE MCIT Programs | deferred | 0 | 0 | مؤجل حتى 2026-08-18T02:32:28.692Z وفق الجدولة التكيفية. |
| 21 | Misk Hub Programs | healthy | 5 | 12 | استمر بالمراجعة والتكرار قبل النشر. |
| 22 | Dhahran Expo Calendar | healthy | 16 | 17 | استمر بالمراجعة والتكرار قبل النشر. |
| 23 | Ithra Events | healthy | 77 | 77 | استمر بالمراجعة والتكرار قبل النشر. |
| 24 | Saudi Digital Academy | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 25 | SDAIA Academy Programs | deferred | 0 | 0 | مؤجل حتى 2026-08-13T02:38:54.502Z وفق الجدولة التكيفية. |
| 26 | Saudi Events App | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 27 | Enjoy Saudi Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 28 | Misk Hub Events | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 29 | Jeddah Chamber Exhibitions and Events Center | deferred | 0 | 0 | مؤجل حتى 2026-08-18T02:32:28.692Z وفق الجدولة التكيفية. |
| 30 | Saudi Pro League Fixtures | collection-error | 0 | 0 | fetch failed |
| 31 | NEOM Newsroom Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 32 | Saudi Space Agency Events | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 33 | CST Events and News | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 34 | Visit Saudi Summer Calendar PDF | deferred | 0 | 65 | مؤجل حتى 2026-08-16T19:20:58.392Z وفق الجدولة التكيفية. |
| 35 | Qiddiya Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 36 | Sela and Saudi Entertainment Expo | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 37 | Ministry of Culture Commission Calendars | deferred | 0 | 12 | مؤجل حتى 2026-08-12T19:44:07.323Z وفق الجدولة التكيفية. |
| 38 | Visit AlBalad / Historic Jeddah | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 39 | Discover Aseer Events | healthy | 37 | 40 | استمر بالمراجعة والتكرار قبل النشر. |
| 40 | Diriyah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 41 | Riyadh International Convention and Exhibition Center | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 42 | Aseer Season / Asir Development Authority | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 43 | Jeddah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 44 | Saudi Water Authority Events | healthy | 8 | 8 | استمر بالمراجعة والتكرار قبل النشر. |
| 45 | Saudi Universities and Technical Colleges | deferred | 0 | 4 | مؤجل حتى 2026-09-09T13:49:51.211Z وفق الجدولة التكيفية. |
| 46 | ExpoFP and Eventseye Saudi Trade Shows | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 47 | Meetup and Facebook Events Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 48 | Saudi Food and Drug Authority Events | healthy | 8 | 8 | استمر بالمراجعة والتكرار قبل النشر. |
| 49 | Saudi Contractors Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 50 | Saudi Winter Events Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 51 | Riyadh City Events | zero-yield | 0 | 74 | No future date-complete candidates found by the conservative extractor. |
| 52 | Monsha'at Academy Programs | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 53 | General Entertainment Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 54 | SDAIA Calendar and Events | healthy | 2 | 2 | استمر بالمراجعة والتكرار قبل النشر. |
| 55 | Makkah Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-08-18T02:32:28.692Z وفق الجدولة التكيفية. |
| 56 | SCEGA ePortal Events | healthy | 4 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 57 | Ministry of Commerce Upcoming Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 58 | Evento | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 59 | Asharqia Chamber Events | deferred | 0 | 3 | مؤجل حتى 2026-08-13T02:49:20.210Z وفق الجدولة التكيفية. |
| 60 | Qassim Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-08-13T07:56:56.504Z وفق الجدولة التكيفية. |
| 61 | Abha Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-08-18T02:32:28.692Z وفق الجدولة التكيفية. |
| 62 | Baha Municipality Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 63 | Baha Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 64 | Jouf Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 65 | Northern Borders Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-08-14T07:42:31.077Z وفق الجدولة التكيفية. |
| 66 | Tabuk Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 67 | Jazan Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 68 | Hail Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 69 | Najran Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 70 | Platinumlist Riyadh Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 71 | Najran Municipality Summer Events | deferred | 0 | 0 | مؤجل حتى 2026-08-13T19:41:22.235Z وفق الجدولة التكيفية. |
| 72 | Platinumlist Saudi City Network | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 73 | GOV.SA National Platform Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 74 | Middle East Banking AI & Analytics Summit Official | not-collected | 0 | 1 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 75 | Middle East Enterprise AI & Analytics Summit Official | not-collected | 0 | 1 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 76 | Umm Al-Qura University Events Center | healthy | 7 | 51 | استمر بالمراجعة والتكرار قبل النشر. |
| 77 | LEAP Official Event and Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 78 | FII 10th Edition Official Program | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 79 | Cityscape Global Official Program | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 80 | Qassim University Events | deferred | 0 | 1 | مؤجل حتى 2026-08-18T02:32:28.692Z وفق الجدولة التكيفية. |
| 81 | Jouf University Summer Programs | deferred | 0 | 1 | مؤجل حتى 2026-08-18T02:32:28.692Z وفق الجدولة التكيفية. |
| 82 | Money20/20 Middle East Official Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 83 | Madinah Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 84 | Madinah International Architecture Festival | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 85 | Hayy Jameel What's On | healthy | 68 | 74 | استمر بالمراجعة والتكرار قبل النشر. |
| 86 | Informa Connect Saudi Event Portfolio | deferred | 0 | 6 | مؤجل حتى 2026-08-18T02:32:28.692Z وفق الجدولة التكيفية. |
| 87 | King Abdulaziz University Events | deferred | 0 | 2 | مؤجل حتى 2026-08-13T02:49:20.210Z وفق الجدولة التكيفية. |
| 88 | Saudicon Events | deferred | 0 | 14 | مؤجل حتى 2026-08-12T19:44:07.323Z وفق الجدولة التكيفية. |
