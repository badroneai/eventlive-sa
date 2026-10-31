# EventLive Browser Source Probe

Generated at: 2026-10-31T08:30:22.903Z

## Summary

- Sources probed this run: 3
- Fresh results available: 8
- Browser network API: 1
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
| 34 | visit-saudi-calendar-pdf | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |

## Endpoint Candidates

- misk-hub-events: POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid)
- misk-hub-events: POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty)
- misk-hub-events: POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/8eab257569804f0885598c40c46c2c92/items/?frontend_timestamp=1793435561&frontend_sign=24aad3d15aa289c9de1aea106b7314f3e42dd60f (200, json-object:recommId,recomms,numberNextRecommsCalls)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| misk-hub-events | Insights العربية Sign in Skills Offline 28 Oct 2026 stc x Misk Workshops Series A workshop represented by a cybersecurity specialis<br>ing on 28th October 2026 Skills Offline 19 - 20 Oct 2026 Nonprofit Governance: From Compliance to Institutional Excellence This wor<br>ssed stc x Misk Workshops Series Arabic 28 Oct 2026 2:00 pm : 3:00 pm More Details Hybrid This event has Passed From the Classroom | Programs -> https://hub.misk.org.sa/en/programs/<br>Events -> https://hub.misk.org.sa/en/events/<br>العربية -> https://hub.misk.org.sa/ar/events/<br>Programs -> https://hub.misk.org.sa/en/programs/ | POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid): {"nextSkippedValue":8,"stringObjectValues":"<div class=\"article-outer v3\"><div class=\" time-label\"><span>Hybrid</sp…<br>POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty): empty |
