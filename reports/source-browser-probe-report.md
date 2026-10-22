# EventLive Browser Source Probe

Generated at: 2026-10-22T07:59:38.727Z

## Summary

- Sources probed this run: 8
- Fresh results available: 8
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 1
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 16 | tuwaiq-academy-bootcamps | ok | 200 | browser-structured-html | 0 | 0 | 8 | اكتب extractor من JSON-LD أو structured scripts مع fallback للبطاقات. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 59 | asharqia-chamber-events | ok | 404 | browser-network-api | 1 | 7 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 60 | qassim-chamber-events | ok | 403 | blocked-or-protected | 0 | 0 | 0 | لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي. |

## Endpoint Candidates

- asharqia-chamber-events: GET https://api-cdn.mypurecloud.ie/webdeployments/v1/deployments/bf04c4ac-89eb-4d7b-9061-14343d788e27/config.json (200, json-object:id,version,headlessMode,languages,defaultLanguage,apiEndpoint,messenger,position)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| tuwaiq-academy-bootcamps | ر الأنظمة الذاتية للدرونز","startDate":"2026-11-01T18:00:00+03:00","endDate":"2026-12-03T21:00:00+03:00","autoCloseRegistration":f<br>nStartDate":null,"registrationEndDate":"2026-10-18T12:00:00+03:00","requireProfileCompletion":true,"isMergePublish":true,"isPaid":<br>سحابة وتعلم الآلة على AWS","startDate":"2026-11-08T18:00:00+03:00","endDate":"2026-12-17T22:00:00+03:00","autoCloseRegistration":f | - | - |
| asharqia-chamber-events | - | المناسبات -> https://www.chamber.org.sa/events/<br>الوفود -> https://www.chamber.org.sa/events/delegations/<br>الفعاليات -> https://www.chamber.org.sa/events/chamber-events/ | GET https://api-cdn.mypurecloud.ie/webdeployments/v1/deployments/bf04c4ac-89eb-4d7b-9061-14343d788e27/config.json (200, json-object:id,version,headlessMode,languages,defaultLanguage,apiEndpoint,messenger,position): {"id":"35941ef8-d3b4-4cac-b011-f0e5bf3d7569","version":"4","headlessMode":{"enabled":false},"languages":["ar"],"default… |
