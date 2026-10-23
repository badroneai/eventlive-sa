# EventLive Browser Source Probe

Generated at: 2026-10-23T07:38:39.058Z

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
| 32 | saudi-space-agency-events | ok | 405 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 502 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |

## Endpoint Candidates

- misk-hub-events: POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid)
- misk-hub-events: POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/410af56ad58547bd9847d27a039cbd54/items/?frontend_timestamp=1792741129&frontend_sign=63eadc39a2804b8af964c550e83477c741bfa0e6 (200, json-object:recommId,recomms,numberNextRecommsCalls)
- misk-hub-events: POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| misk-hub-events | Insights العربية Sign in Skills Offline 19 - 20 Oct 2026 Nonprofit Governance: From Compliance to Institutional Excellence This wor<br>sing on 14th October 2026 Skills Online 21 Oct 2026 From the Classroom to the Workplace: The Skills That Make the Difference Delive<br>That Make the Difference English,Arabic 21 Oct 2026 7:00 pm : 8:00 pm More Details In-Person This event has Passed Nonprofit Govern | Programs -> https://hub.misk.org.sa/en/programs/<br>Events -> https://hub.misk.org.sa/en/events/<br>العربية -> https://hub.misk.org.sa/ar/events/<br>Programs -> https://hub.misk.org.sa/en/programs/ | POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid): {"nextSkippedValue":8,"stringObjectValues":"<div class=\"article-outer v3\"><div class=\" time-label\"><span>Hybrid</sp…<br>POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/410af56ad58547bd9847d27a039cbd54/items/?… (200, json-object:recommId,recomms,numberNextRecommsCalls): {"recommId": "57da0ddbe726b85661b22484765b3095", "recomms": [], "numberNextRecommsCalls": 0} |
