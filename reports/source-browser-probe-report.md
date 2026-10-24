# EventLive Browser Source Probe

Generated at: 2026-10-24T07:35:14.295Z

## Summary

- Sources probed this run: 3
- Fresh results available: 8
- Browser network API: 2
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 28 | misk-hub-events | ok | 200 | browser-network-api | 3 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 502 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 76 | umm-al-qura-events | ok | 200 | browser-network-api | 1 | 15 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- misk-hub-events: POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty)
- misk-hub-events: POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid)
- misk-hub-events: POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/e9501e1437c04f33a59ed4ebc7978ddd/items/?frontend_timestamp=1792827324&frontend_sign=6a48a64e5dde9d6e5f5e6f8f6db6a9e9f84e84b0 (200, json-object:recommId,recomms,numberNextRecommsCalls)
- umm-al-qura-events: POST https://uqu.edu.sa/livewire/update (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| misk-hub-events | Insights العربية Sign in Skills Online 21 Oct 2026 From the Classroom to the Workplace: The Skills That Make the Difference Delive<br>That Make the Difference English,Arabic 21 Oct 2026 7:00 pm : 8:00 pm More Details In-Person This event has Passed Nonprofit Govern<br>ance to Institutional Excellence Arabic 19 - 20 Oct 2026 4:00 pm : 8:00 pm More Details Hybrid This event has Passed Finance Fundam | Programs -> https://hub.misk.org.sa/en/programs/<br>Events -> https://hub.misk.org.sa/en/events/<br>العربية -> https://hub.misk.org.sa/ar/events/<br>Programs -> https://hub.misk.org.sa/en/programs/ | POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty): empty<br>POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid): {"nextSkippedValue":8,"stringObjectValues":"<div class=\"article-outer v3\"><div class=\" time-label\"><span>Hybrid</sp… |
| umm-al-qura-events | فهم الصوت الداخلي وإدارة الحوار الذاتي) 2026-10-24 06:16:12 دورة تدريبية بعنوان إدارة المخاطر المالية 2026-10-22 12:10:40 برنامج «<br>عنان / مسرّعات القيادة»، 2026-10-21 13:17:23 بحثك يستحق العالمية من البحث إلى النشر الدولي: فرص، حوافز، وأثر يتجاوز<br>الورقة العلمية 2026-10-20 07:19:14 آلية تسجيل متطلبات الجامعة (الاختيارية والاجبارية) 2026-10-19 13:26:10 | English -> https://uqu.edu.sa/en/App/Events<br>English -> https://uqu.edu.sa/en/App/Events<br>معسكر المهارات النفسية (فك الشفرة: فهم الصوت الداخلي وإدارة الحوار ال… -> https://uqu.edu.sa/App/Events/41241<br>دورة تدريبية بعنوان إدارة المخاطر المالية -> https://uqu.edu.sa/App/Events/41240 | POST https://uqu.edu.sa/livewire/update (200, json-like-invalid): {"components":[{"snapshot":"{\"data\":{\"isFilamentNotificationsComponent\":true,\"notifications\":[[],{\"class\":\"Fil… |
