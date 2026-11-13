# EventLive Source Ops Report

- generated_at: 2026-11-13T10:00:07.649Z
- registry: data/source_registry.json
- candidates: data/source_candidates.json
- catalog: data/events_catalog.json
- run_state: data/source_run_state.json
- collection_basis: source_collection_report_adaptive
- collection_freshness: fresh

## Executive Summary

- Sources in registry: 88
- Runnable collector lanes: 48
- Sources due now: 34
- Sources attempted in latest collection: 34
- Sources deferred by cadence: 14
- Due-source coverage: 100%
- Scheduled runnable coverage: 100%
- Whole-registry attempted this run: 39%
- Healthy sources: 15
- Zero-yield sources: 18
- High-priority unattempted sources: 3
- Candidates: 346
- Actionable candidates: 5
- Ready for review: 5
- Ready for catalog promotion: 0
- Linked to catalog from candidates: 333
- Stale unpublished candidates: 0
- Duplicate risk: 2
- Recommendation: ابدأ بمراجعة التكرارات المحتملة قبل اعتماد أي مرشح جديد.

## Candidate Funnel

- review_status.approved-for-catalog: 333
- review_status.ready-for-review: 5
- review_status.new: 1
- review_status.evidence-captured: 7
- publication_gate.catalog-review: 333
- publication_gate.duplicate-review: 3
- publication_gate.source-evidence: 8
- publication_gate.secondary-verified: 2
- discovery_quality.watch-lead: 2
- discovery_quality.strong-lead: 1

## Focus Queue

| Candidate | Source | Status | Next action |
|---|---|---|---|
| Cityscape Global 2026 | Invest Saudi Events | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| King Abdulaziz Falconry Festival | Visit Saudi Seasons | ready-for-review/duplicate-review | راجع التكرار مع الكتالوج قبل أي اعتماد. |
| واقف! Momos | Visit Saudi Summer Calendar PDF | ready-for-review/duplicate-review | دليل تجميعي؛ ابن مطابقة مصدر رسمي قبل أي نشر آلي. |
| Application deadline: Misk Startup School MasterClasses | Misk Hub Programs | ready-for-review/secondary-verified | اتخذ قرار اعتماد أو رفض. |
| Application deadline: Misk NPO Essentials Masterclasses | Misk Hub Programs | ready-for-review/secondary-verified | اتخذ قرار اعتماد أو رفض. |

## Discovery Leads

| Candidate | Source | City | Quality | Score | Signals | Official match |
|---|---|---|---|---:|---|---|
| Real Estate Excellence Award 2026 (REA 2026) | Eye of Riyadh Events | Riyadh | watch-lead | 45 | directory-source, saudi-location-signal | Real Estate Future Forum (Eye of Riyadh Official, 80) |
| AERO Middle East x Sand & Fun 2027 | Saudicon Events | Saudi Arabia | - | 0 | - | General Aviation Airshow — AERO Middle East x Sand & Fun (Riyadh City Events, 63) |
| 2027年中东通用航空展暨沙漠欢乐节（AERO Middle East x Sand & Fun 2027） | Saudicon Events | Saudi Arabia | - | 0 | - | General Aviation Airshow — AERO Middle East x Sand & Fun (Riyadh City Events, 63) |
| Family Offices & VCs Investment Summit Riyadh: Invite Only | Eventbrite Saudi Arabia | Riyadh | watch-lead | 60 | saudi-location-signal, specific-venue, event-topic-fit, non-saudi-eventbrite-domain | - |
| Agrofood Jeddah 2026 | Saudicon Events | Jeddah | - | 0 | - | - |
| معرض جدة الدولي للزراعة والمنتجات الغذائية 2026 | Saudicon Events | Jeddah | - | 0 | - | - |
| Agrofood Jeddah 2026（吉达国际农业与食品展） | Saudicon Events | Jeddah | - | 0 | - | - |
| معرض الطيران العام 2027 | Saudicon Events | Saudi Arabia | - | 0 | - | - |

## Source Health

| Priority | Source | Status | Extracted | Candidates | Next action |
|---:|---|---|---:|---:|---|
| 1 | National Events Center / Saudi Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 2 | Visit Saudi Calendar | healthy | 21 | 11 | استمر بالمراجعة والتكرار قبل النشر. |
| 3 | Ministry of Culture Cultural Calendar | deferred | 0 | 0 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 4 | Ministry of Sport Events | deferred | 0 | 0 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 5 | webook Explore | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 6 | Hala Yalla | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 7 | Experience AlUla Events | healthy | 10 | 15 | استمر بالمراجعة والتكرار قبل النشر. |
| 8 | MDLBEAST Events | healthy | 2 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 9 | Monsha'at All Events | deferred | 0 | 2 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 10 | Invest Saudi Events | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 11 | RFECC What's On | healthy | 2 | 2 | استمر بالمراجعة والتكرار قبل النشر. |
| 12 | Eye of Riyadh Events | deferred | 0 | 1 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 13 | 10times Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 14 | Eventbrite Saudi Arabia | deferred | 0 | 1 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 15 | Platinumlist Jeddah Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 16 | Tuwaiq Academy Bootcamps and Programs | deferred | 0 | 10 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 17 | Future Skills MCIT Catalogue | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 18 | Riyadh Season Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 19 | Visit Saudi Seasons | healthy | 14 | 14 | استمر بالمراجعة والتكرار قبل النشر. |
| 20 | CODE MCIT Programs | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 21 | Misk Hub Programs | healthy | 5 | 16 | استمر بالمراجعة والتكرار قبل النشر. |
| 22 | Dhahran Expo Calendar | healthy | 5 | 8 | استمر بالمراجعة والتكرار قبل النشر. |
| 23 | Ithra Events | healthy | 77 | 101 | استمر بالمراجعة والتكرار قبل النشر. |
| 24 | Saudi Digital Academy | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 25 | SDAIA Academy Programs | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 26 | Saudi Events App | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 27 | Enjoy Saudi Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 28 | Misk Hub Events | deferred | 0 | 0 | مؤجل حتى 2026-11-15T10:11:13.613Z وفق الجدولة التكيفية. |
| 29 | Jeddah Chamber Exhibitions and Events Center | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 30 | Saudi Pro League Fixtures | deferred | 0 | 0 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 31 | NEOM Newsroom Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 32 | Saudi Space Agency Events | healthy | 1 | 2 | استمر بالمراجعة والتكرار قبل النشر. |
| 33 | CST Events and News | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 34 | Visit Saudi Summer Calendar PDF | deferred | 0 | 33 | مؤجل حتى 2026-11-14T09:10:00.727Z وفق الجدولة التكيفية. |
| 35 | Qiddiya Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 36 | Sela and Saudi Entertainment Expo | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 37 | Ministry of Culture Commission Calendars | deferred | 0 | 7 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 38 | Visit AlBalad / Historic Jeddah | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 39 | Discover Aseer Events | zero-yield | 0 | 1 | Recovered via live-browser-recovery official evidence. Primary page failed: HTTP 404. No future date-complete candidates found by the conservative extractor. |
| 40 | Diriyah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 41 | Riyadh International Convention and Exhibition Center | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 42 | Aseer Season / Asir Development Authority | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 43 | Jeddah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 44 | Saudi Water Authority Events | zero-yield | 0 | 5 | No future date-complete candidates found by the conservative extractor. |
| 45 | Saudi Universities and Technical Colleges | deferred | 0 | 2 | مؤجل حتى 2026-11-15T07:17:51.157Z وفق الجدولة التكيفية. |
| 46 | ExpoFP and Eventseye Saudi Trade Shows | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 47 | Meetup and Facebook Events Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 48 | Saudi Food and Drug Authority Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 49 | Saudi Contractors Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 50 | Saudi Winter Events Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 51 | Riyadh City Events | zero-yield | 0 | 23 | No future date-complete candidates found by the conservative extractor. |
| 52 | Monsha'at Academy Programs | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 53 | General Entertainment Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 54 | SDAIA Calendar and Events | collection-error | 0 | 1 | request-rejected; browser recovery encountered an access-protection page |
| 55 | Makkah Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 56 | SCEGA ePortal Events | deferred | 0 | 0 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 57 | Ministry of Commerce Upcoming Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 58 | Evento | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 59 | Asharqia Chamber Events | zero-yield | 0 | 2 | Recovered via browser-probe official evidence. No future date-complete candidates found by the conservative extractor. |
| 60 | Qassim Chamber Events | deferred | 0 | 0 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
| 61 | Abha Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 62 | Baha Municipality Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 63 | Baha Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 64 | Jouf Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 65 | Northern Borders Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 66 | Tabuk Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 67 | Jazan Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 68 | Hail Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 69 | Najran Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 70 | Platinumlist Riyadh Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 71 | Najran Municipality Summer Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 72 | Platinumlist Saudi City Network | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 73 | GOV.SA National Platform Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 74 | Middle East Banking AI & Analytics Summit Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 75 | Middle East Enterprise AI & Analytics Summit Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 76 | Umm Al-Qura University Events Center | healthy | 3 | 56 | استمر بالمراجعة والتكرار قبل النشر. |
| 77 | LEAP Official Event and Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 78 | FII 10th Edition Official Program | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 79 | Cityscape Global Official Program | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 80 | Qassim University Events | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 81 | Jouf University Summer Programs | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 82 | Money20/20 Middle East Official Agendas | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 83 | Madinah Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 84 | Madinah International Architecture Festival | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 85 | Hayy Jameel What's On | healthy | 8 | 12 | استمر بالمراجعة والتكرار قبل النشر. |
| 86 | Informa Connect Saudi Event Portfolio | healthy | 5 | 5 | استمر بالمراجعة والتكرار قبل النشر. |
| 87 | King Abdulaziz University Events | zero-yield | 0 | 2 | No future date-complete candidates found by the conservative extractor. |
| 88 | Saudicon Events | deferred | 0 | 6 | مؤجل حتى 2026-11-13T10:11:13.613Z وفق الجدولة التكيفية. |
