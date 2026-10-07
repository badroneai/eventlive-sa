# EventLive Browser Source Probe

Generated at: 2026-10-07T09:02:15.128Z

## Summary

- Sources probed this run: 6
- Fresh results available: 11
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 2
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 12 | eye-of-riyadh-events | ok | 200 | rendered-html-candidates | 0 | 20 | 8 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 14 | eventbrite-saudi | ok | 405 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 16 | tuwaiq-academy-bootcamps | ok | 200 | browser-structured-html | 0 | 0 | 8 | اكتب extractor من JSON-LD أو structured scripts مع fallback للبطاقات. |
| 17 | future-skills-catalog | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 59 | asharqia-chamber-events | ok | 404 | browser-network-api | 1 | 7 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- asharqia-chamber-events: GET https://api-cdn.mypurecloud.ie/webdeployments/v1/deployments/bf04c4ac-89eb-4d7b-9061-14343d788e27/config.json (200, json-object:id,version,headlessMode,languages,defaultLanguage,apiEndpoint,messenger,position)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| eye-of-riyadh-events | 24 Rabi' II 1448 - 7 October 2026 Sign In/Sign Up Advertise with us Sign-up for newsletter HOME NEWS EVENTS BUSIN<br>hatsApp X LinkedIn Facebook Email Share 25 - 27 Jan, 2027 Real Estate Future Forum Four Seasons Hotel , Riyadh / Forum The Real Est<br>must evolve, embracing... More Details 25 - 26 Oct, 2026 Global Proptech Summit 2026 Mandarin Oriental Al Faisaliah , Riyadh / Sum | EVENTS -> https://www.eyeofriyadh.com/events/<br>عربي -> https://www.eyeofriyadh.com/ar/events/<br>Award -> https://www.eyeofriyadh.com/events/?fcat=15<br>Ceremony -> https://www.eyeofriyadh.com/events/?fcat=21 | - |
| tuwaiq-academy-bootcamps | لبيرتون - المسار التأسيسي","startDate":"2026-10-11T09:00:00+03:00","endDate":"2027-07-20T21:00:00+03:00","autoCloseRegistration":f<br>nStartDate":null,"registrationEndDate":"2026-10-04T12:00:00+03:00","requireProfileCompletion":true,"isMergePublish":false,"isPaid"<br>سحابة وتعلم الآلة على AWS","startDate":"2026-10-11T18:00:00+03:00","endDate":"2026-11-19T22:00:00+03:00","autoCloseRegistration":f | - | - |
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
| asharqia-chamber-events | - | المناسبات -> https://www.chamber.org.sa/events/<br>الوفود -> https://www.chamber.org.sa/events/delegations/<br>الفعاليات -> https://www.chamber.org.sa/events/chamber-events/ | GET https://api-cdn.mypurecloud.ie/webdeployments/v1/deployments/bf04c4ac-89eb-4d7b-9061-14343d788e27/config.json (200, json-object:id,version,headlessMode,languages,defaultLanguage,apiEndpoint,messenger,position): {"id":"35941ef8-d3b4-4cac-b011-f0e5bf3d7569","version":"4","headlessMode":{"enabled":false},"languages":["ar"],"default… |
