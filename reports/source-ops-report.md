# EventLive Source Ops Report

- generated_at: 2026-07-08T20:06:07.850Z
- registry: data/source_registry.json
- candidates: data/source_candidates.json
- catalog: data/events_catalog.json
- run_state: data/source_run_state.json
- collection_basis: source_collection_report
- collection_freshness: fresh

## Executive Summary

- Sources in registry: 66
- Sources attempted in latest collection: 34
- Collection coverage: 52%
- Healthy sources: 16
- Zero-yield sources: 9
- High-priority unattempted sources: 3
- Candidates: 187
- Actionable candidates: 0
- Ready for review: 0
- Ready for catalog promotion: 0
- Linked to catalog from candidates: 158
- Stale unpublished candidates: 0
- Duplicate risk: 0
- Recommendation: استخدم أقوى مرشحي الاكتشاف لبناء مطابقة آلية مع مصادر رسمية؛ لا تنشر مصدر اكتشاف منفرداً.

## Candidate Funnel

- review_status.approved-for-catalog: 158
- review_status.evidence-captured: 13
- review_status.new: 16
- publication_gate.catalog-review: 158
- publication_gate.duplicate-review: 13
- publication_gate.source-evidence: 16
- discovery_quality.strong-lead: 27
- discovery_quality.weak-lead: 1
- discovery_quality.watch-lead: 3

## Focus Queue

| Candidate | Source | Status | Next action |
|---|---|---|---|

## Discovery Leads

| Candidate | Source | City | Quality | Score | Signals | Official match |
|---|---|---|---|---:|---|---|
| Global Proptech Summit 2026 | Eye of Riyadh Events | Riyadh | strong-lead | 70 | directory-source, saudi-location-signal, large-event-topic | Global AI Summit (SDAIA Calendar and Events, 82) |
| Dubai Property Expo in Al Khobar | Eventbrite Saudi Arabia | Khobar | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Smart Data & AI Summit | Eye of Riyadh Events | Riyadh | strong-lead | 70 | directory-source, saudi-location-signal, large-event-topic | - |
| HRSE KSA | Eye of Riyadh Events | Riyadh | strong-lead | 70 | directory-source, saudi-location-signal, large-event-topic | - |
| Big 5 Construct Saudi | Eye of Riyadh Events | Riyadh | strong-lead | 70 | directory-source, saudi-location-signal, large-event-topic | - |
| HVAC R Saudi Arabia | Eye of Riyadh Events | Riyadh | strong-lead | 70 | directory-source, saudi-location-signal, large-event-topic | - |
| Saudi FM & Clean | Eye of Riyadh Events | Riyadh | strong-lead | 70 | directory-source, saudi-location-signal, large-event-topic | - |
| Family Office Investment Meeting | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Family Office Investment Summit | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |
| Sucession Planning Program | Eventbrite Saudi Arabia | Riyadh | strong-lead | 70 | saudi-location-signal, specific-venue, event-topic-fit | - |

## Source Health

| Priority | Source | Status | Extracted | Candidates | Next action |
|---:|---|---|---:|---:|---|
| 1 | National Events Center / Saudi Events | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 2 | Visit Saudi Calendar | healthy | 10 | 11 | استمر بالمراجعة والتكرار قبل النشر. |
| 3 | Ministry of Culture Cultural Calendar | collection-error | 0 | 0 | fetch failed |
| 4 | Ministry of Sport Events | collection-error | 0 | 0 | fetch failed |
| 5 | webook Explore | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 6 | Hala Yalla | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 7 | Experience AlUla Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 8 | MDLBEAST Events | healthy | 5 | 5 | استمر بالمراجعة والتكرار قبل النشر. |
| 9 | Monsha'at All Events | collection-error | 0 | 3 | fetch failed |
| 10 | Invest Saudi Events | healthy | 3 | 3 | استمر بالمراجعة والتكرار قبل النشر. |
| 11 | RFECC What's On | healthy | 6 | 6 | استمر بالمراجعة والتكرار قبل النشر. |
| 12 | Eye of Riyadh Events | collection-error | 0 | 15 | Discovery-only source unavailable in this run: HTTP 403 |
| 13 | 10times Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 14 | Eventbrite Saudi Arabia | healthy | 16 | 16 | استمر بالمراجعة والتكرار قبل النشر. |
| 15 | Platinumlist Jeddah Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 16 | Tuwaiq Academy Bootcamps and Programs | healthy | 12 | 19 | استمر بالمراجعة والتكرار قبل النشر. |
| 17 | Future Skills MCIT Catalogue | healthy | 4 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 18 | Riyadh Season Official | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 19 | Visit Saudi Seasons | healthy | 4 | 4 | استمر بالمراجعة والتكرار قبل النشر. |
| 20 | CODE MCIT Programs | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 21 | Misk Hub Programs | healthy | 5 | 7 | استمر بالمراجعة والتكرار قبل النشر. |
| 22 | Dhahran Expo Calendar | healthy | 15 | 15 | استمر بالمراجعة والتكرار قبل النشر. |
| 23 | Ithra Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 24 | Saudi Digital Academy | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 25 | SDAIA Academy Programs | collection-error | 0 | 0 | fetch failed |
| 26 | Saudi Events App | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 27 | Enjoy Saudi Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 28 | Misk Hub Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 29 | Jeddah Chamber Exhibitions and Events Center | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 30 | Saudi Pro League Fixtures | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 31 | NEOM Newsroom Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 32 | Saudi Space Agency Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 33 | CST Events and News | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 34 | Visit Saudi Calendar PDF | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 35 | Qiddiya Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 36 | Sela and Saudi Entertainment Expo | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 37 | Ministry of Culture Commission Calendars | collection-error | 0 | 12 | fetch failed |
| 38 | Visit AlBalad / Historic Jeddah | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 39 | Discover Aseer Events | healthy | 1 | 1 | استمر بالمراجعة والتكرار قبل النشر. |
| 40 | Diriyah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 41 | Riyadh International Convention and Exhibition Center | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 42 | Aseer Season / Asir Development Authority | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 43 | Jeddah Season | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 44 | Saudi Water Authority Events | healthy | 8 | 8 | استمر بالمراجعة والتكرار قبل النشر. |
| 45 | Saudi Universities and Technical Colleges | healthy | 6 | 6 | استمر بالمراجعة والتكرار قبل النشر. |
| 46 | ExpoFP and Eventseye Saudi Trade Shows | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 47 | Meetup and Facebook Events Saudi Arabia | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 48 | Saudi Food and Drug Authority Events | healthy | 7 | 7 | استمر بالمراجعة والتكرار قبل النشر. |
| 49 | Saudi Contractors Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 50 | Saudi Winter Events Calendar | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 51 | Riyadh City Events | healthy | 40 | 41 | استمر بالمراجعة والتكرار قبل النشر. |
| 52 | Monsha'at Academy Programs | not-collected | 0 | 0 | افتح مسار شراكة أو تغذية رسمية قبل الأتمتة. |
| 53 | General Entertainment Authority Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 54 | SDAIA Calendar and Events | collection-error | 0 | 2 | fetch failed |
| 55 | Makkah Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 59 | Asharqia Chamber Events | healthy | 2 | 2 | استمر بالمراجعة والتكرار قبل النشر. |
| 60 | Qassim Chamber Events | collection-error | 0 | 0 | HTTP 403 |
| 61 | Abha Chamber Events | zero-yield | 0 | 0 | No future date-complete candidates found by the conservative extractor. |
| 62 | Baha Municipality Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 63 | Baha Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 64 | Jouf Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 65 | Northern Borders Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 66 | Tabuk Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 67 | Jazan Chamber Events | collection-error | 0 | 0 | fetch failed |
| 68 | Hail Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
| 69 | Najran Chamber Events | not-collected | 0 | 0 | أضف جامعاً محافظاً أو تحقق من قابلية القراءة العامة. |
