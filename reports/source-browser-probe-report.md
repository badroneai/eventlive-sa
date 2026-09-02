# EventLive Browser Source Probe

Generated at: 2026-09-02T11:29:28.525Z

## Summary

- Sources probed this run: 0
- Fresh results available: 3
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 2
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 28 | misk-hub-events | ok | 200 | browser-network-api | 3 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 81 | jouf-university-programs | ok | 200 | rendered-html-candidates | 0 | 20 | 8 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |

## Endpoint Candidates

- misk-hub-events: POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid)
- misk-hub-events: POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty)
- misk-hub-events: POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/19edb9bf4d034db4b11727d2cee48f0f/items/?frontend_timestamp=1788324285&frontend_sign=cd81a4c3b3ee1368c2348e0d234863f5f4d522a3 (200, json-object:recommId,recomms,numberNextRecommsCalls)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| misk-hub-events | Insights العربية Sign in Skills Online 25 Aug 2026 Navigating the Cyber Map: How to Choose Your Specialization & Build a Corporate<br>osing on 25th August 2026 Skills Online 26 Aug 2026 How to Choose Your Career Path and Keep Up with Labor Market Changes Through Mi<br>eep Up with Labor Market Changes Arabic 26 Aug 2026 7:00 pm : 8:00 pm More Details Hybrid This event has Passed Navigating the Cybe | Programs -> https://hub.misk.org.sa/en/programs/<br>Events -> https://hub.misk.org.sa/en/events/<br>العربية -> https://hub.misk.org.sa/ar/events/<br>Programs -> https://hub.misk.org.sa/en/programs/ | POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid): {"nextSkippedValue":8,"stringObjectValues":"<div class=\"article-outer v3\"><div class=\" time-label\"><span>Online</sp…<br>POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty): empty |
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
| jouf-university-programs | خبار والإعلانات أخبار إعلانات الصورة 18 أبريل, 2024 شاركت الجامعة في معرض جنيف الدولي للاختراعات في نسخته 49 والذي انطلقت أعم<br>من خلال جناحها ال اقرأ المزيد الصورة 18 أبريل, 2024 ضمن مبادرة هيئة تنمية البحث والتطوير والابتكار؛ لدعم المختبرات البحثية با<br>والتطوير والابتكار اقرأ المزيد الصورة 1 سبتمبر, 2026 استقبل سعادة رئيس جامعة الجوف الأستاذ الدكتور محمد بن عبدالله الشايع، عمي | دليل البرامج -> https://ju.edu.sa/ar/programs<br>التقويم الأكاديمي -> https://ju.edu.sa/ar/academic-calendar<br>الفعاليات -> https://ju.edu.sa/ar/events-calendar<br>دليل البرامج -> https://ju.edu.sa/ar/programs | - |
