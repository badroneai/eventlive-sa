# EventLive Source Ops Report

- generated_at: 2026-10-31T08:50:33.860Z
- registry: data/source_registry.json
- candidates: data/source_candidates.json
- catalog: data/events_catalog.json
- run_state: data/source_run_state.json
- collection_basis: source_collection_report_adaptive
- collection_freshness: fresh

## Executive Summary

- Sources in registry: 88
- Runnable collector lanes: 48
- Sources due now: 16
- Sources attempted in latest collection: 16
- Sources deferred by cadence: 32
- Due-source coverage: 100%
- Scheduled runnable coverage: 100%
- Whole-registry attempted this run: 18%
- Healthy sources: 12
- Zero-yield sources: 3
- High-priority unattempted sources: 3
- Candidates: 367
- Actionable candidates: 4
- Ready for review: 4
- Ready for catalog promotion: 0
- Linked to catalog from candidates: 339
- Stale unpublished candidates: 0
- Duplicate risk: 2
- Recommendation: ابدأ بمراجعة التكرارات المحتملة قبل اعتماد أي مرشح جديد.

## Candidate Funnel

- review_status.approved-for-catalog: 339
- review_status.evidence-captured: 23
- review_status.ready-for-review: 4
- review_status.new: 1
- publication_gate.catalog-review: 339
- publication_gate.source-evidence: 24
- publication_gate.duplicate-review: 2
- publication_gate.secondary-verified: 2
- discovery_quality.watch-lead: 2
- discovery_quality.strong-lead: 1

## Focus Queue

| Candidate | Source | Status | Next action |
|---|---|---|---|
| Cityscape Global 2026 | Invest Saudi Events | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| King Abdulaziz Falconry Festival | Visit Saudi Seasons | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| Application deadline: Misk Startup School MasterClasses | Misk Hub Programs | ready-for-review/secondary-verified | اتخذ قرار اعتماد أو رفض. |
| Application deadline: Misk NPO Essentials Masterclasses | Misk Hub Programs | ready-for-review/secondary-verified | اتخذ قرار اعتماد أو رفض. |

## Discovery Leads

| Candidate | Source | City | Quality | Score | Signals | Official match |
|---|---|---|---|---:|---|---|
| Real Estate Excellence Award 2026 (REA 2026) | Eye of Riyadh Events | Riyadh | watch-lead | 45 | directory-source, saudi-location-signal | Real Estate Future Forum (Eye of Riyadh Official, 80) |
| Family Offices & VCs Investment Summit Riyadh: Invite Only | Eventbrite Saudi Arabia | Riyadh | watch-lead | 60 | saudi-location-signal, specific-venue, event-topic-fit, non-saudi-eventbrite-domain | - |
| Accounting & Business Expo Saudi Arabia 2026 | Saudicon Events | Riyadh | - | 0 | - | - |
| معرض المحاسبة والأعمال السعودية 2026 | Saudicon Events | Riyadh | - | 0 | - | - |
| 2026年沙特阿拉伯会计与商业博览会（Accounting & Business Expo Saudi Arabia 2026） | Saudicon Events | Riyadh | - | 0 | - | - |
| Arab Cochlear Implant Conference 2026 | Saudicon Events | Jeddah | - | 0 | - | - |
| 2026年阿拉伯人工耳蜗植入医学大会 | Saudicon Events | Jeddah | - | 0 | - | - |
| المؤتمر العربي الطبي لزراعة القوقعة 2026 | Saudicon Events | Jeddah | - | 0 | - | - |
| Asia Oceania Congress of Nuclear Medicine and Biology (AOCNMB) 2026 | Saudicon Events | Jeddah | - | 0 | - | - |
| مؤتمر آسيا وأوقيانوسيا للطب النووي والبيولوجيا 2026 | Saudicon Events | Jeddah | - | 0 | - | - |

## Source Health

| Priority | Source | Status | Extracted | Candidates | Next action |
|---:|---|---|---:|---:|---|
| 1 | National Events Center / Saudi Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 2 | Visit Saudi Calendar | healthy | 21 | 12 | استمر بالمراجعة والتكرار قبل النشر. |
| 3 | Ministry of Culture Cultural Calendar | deferred | 0 | 0 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 4 | Ministry of Sport Events | deferred | 0 | 0 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 5 | webook Explore | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 6 | Hala Yalla | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 7 | Experience AlUla Events | healthy | 11 | 16 | استمر بالمراجعة والتكرار قبل النشر. |
| 8 | MDLBEAST Events | deferred | 0 | 2 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 9 | Monsha'at All Events | collection-error | 0 | 3 | fetch failed [UND_ERR_CONNECT_TIMEOUT]; fetch failed [UND_ERR_CONNECT_TIMEOUT] |
| 10 | Invest Saudi Events | healthy | 2 | 2 | استمر بالمراجعة والتكرار قبل النشر. |
| 11 | RFECC What's On | healthy | 2 | 2 | استمر بالمراجعة والتكرار قبل النشر. |
| 12 | Eye of Riyadh Events | deferred | 0 | 1 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 13 | 10times Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 14 | Eventbrite Saudi Arabia | deferred | 0 | 1 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 15 | Platinumlist Jeddah Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 16 | Tuwaiq Academy Bootcamps and Programs | deferred | 0 | 14 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 17 | Future Skills MCIT Catalogue | deferred | 0 | 0 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 18 | Riyadh Season Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 19 | Visit Saudi Seasons | healthy | 14 | 14 | استمر بالمراجعة والتكرار قبل النشر. |
| 20 | CODE MCIT Programs | deferred | 0 | 0 | مؤجل حتى 2026-11-06T09:08:30.368Z وفق الجدولة التكيفية. |
| 21 | Misk Hub Programs | healthy | 5 | 15 | استمر بالمراجعة والتكرار قبل النشر. |
| 22 | Dhahran Expo Calendar | healthy | 5 | 8 | استمر بالمراجعة والتكرار قبل النشر. |
| 23 | Ithra Events | healthy | 52 | 71 | استمر بالمراجعة والتكرار قبل النشر. |
| 24 | Saudi Digital Academy | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 25 | SDAIA Academy Programs | deferred | 0 | 0 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 26 | Saudi Events App | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 27 | Enjoy Saudi Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 28 | Misk Hub Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 29 | Jeddah Chamber Exhibitions and Events Center | deferred | 0 | 0 | مؤجل حتى 2026-11-06T09:08:30.368Z وفق الجدولة التكيفية. |
| 30 | Saudi Pro League Fixtures | deferred | 0 | 0 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 31 | NEOM Newsroom Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 32 | Saudi Space Agency Events | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 33 | CST Events and News | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 34 | Visit Saudi Summer Calendar PDF | zero-yield | 0 | 34 | Recovered via direct-pdf official evidence. No future date-complete candidates found by the conservative extractor. |
| 35 | Qiddiya Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 36 | Sela and Saudi Entertainment Expo | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 37 | Ministry of Culture Commission Calendars | deferred | 0 | 8 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 38 | Visit AlBalad / Historic Jeddah | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 39 | Discover Aseer Events | deferred | 0 | 1 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 40 | Diriyah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 41 | Riyadh International Convention and Exhibition Center | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 42 | Aseer Season / Asir Development Authority | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 43 | Jeddah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 44 | Saudi Water Authority Events | deferred | 0 | 6 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 45 | Saudi Universities and Technical Colleges | deferred | 0 | 7 | مؤجل حتى 2026-11-15T07:17:51.157Z وفق الجدولة التكيفية. |
| 46 | ExpoFP and Eventseye Saudi Trade Shows | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 47 | Meetup and Facebook Events Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 48 | Saudi Food and Drug Authority Events | deferred | 0 | 0 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 49 | Saudi Contractors Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 50 | Saudi Winter Events Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 51 | Riyadh City Events | zero-yield | 0 | 33 | No future date-complete candidates found by the conservative extractor. |
| 52 | Monsha'at Academy Programs | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 53 | General Entertainment Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 54 | SDAIA Calendar and Events | deferred | 0 | 0 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 55 | Makkah Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-06T09:08:30.368Z وفق الجدولة التكيفية. |
| 56 | SCEGA ePortal Events | deferred | 0 | 0 | مؤجل حتى 2026-11-02T09:08:30.368Z وفق الجدولة التكيفية. |
| 57 | Ministry of Commerce Upcoming Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 58 | Evento | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 59 | Asharqia Chamber Events | deferred | 0 | 3 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 60 | Qassim Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
| 61 | Abha Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-06T09:08:30.368Z وفق الجدولة التكيفية. |
| 62 | Baha Municipality Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 63 | Baha Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 64 | Jouf Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 65 | Northern Borders Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 66 | Tabuk Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-06T09:08:30.368Z وفق الجدولة التكيفية. |
| 67 | Jazan Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 68 | Hail Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 69 | Najran Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 70 | Platinumlist Riyadh Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 71 | Najran Municipality Summer Events | deferred | 0 | 0 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 72 | Platinumlist Saudi City Network | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 73 | GOV.SA National Platform Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 74 | Middle East Banking AI & Analytics Summit Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 75 | Middle East Enterprise AI & Analytics Summit Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 76 | Umm Al-Qura University Events Center | healthy | 9 | 64 | استمر بالمراجعة والتكرار قبل النشر. |
| 77 | LEAP Official Event and Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 78 | FII 10th Edition Official Program | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 79 | Cityscape Global Official Program | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 80 | Qassim University Events | deferred | 0 | 1 | مؤجل حتى 2026-11-06T09:08:30.368Z وفق الجدولة التكيفية. |
| 81 | Jouf University Summer Programs | deferred | 0 | 0 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 82 | Money20/20 Middle East Official Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 83 | Madinah Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 84 | Madinah International Architecture Festival | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 85 | Hayy Jameel What's On | healthy | 10 | 16 | استمر بالمراجعة والتكرار قبل النشر. |
| 86 | Informa Connect Saudi Event Portfolio | deferred | 0 | 6 | مؤجل حتى 2026-11-06T09:08:30.368Z وفق الجدولة التكيفية. |
| 87 | King Abdulaziz University Events | deferred | 0 | 2 | مؤجل حتى 2026-11-01T08:37:41.193Z وفق الجدولة التكيفية. |
| 88 | Saudicon Events | deferred | 0 | 22 | مؤجل حتى 2026-10-31T09:08:30.368Z وفق الجدولة التكيفية. |
