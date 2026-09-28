# EventLive Browser Source Probe

Generated at: 2026-09-28T09:00:45.944Z

## Summary

- Sources probed this run: 8
- Fresh results available: 14
- Browser network API: 3
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
| 28 | misk-hub-events | ok | 200 | browser-network-api | 3 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 44 | saudi-water-authority-events | ok | 200 | browser-network-api | 9 | 14 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 54 | sdaia-calendar-events | ok | 200 | browser-network-api | 1 | 15 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 59 | asharqia-chamber-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |

## Endpoint Candidates

- misk-hub-events: POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid)
- misk-hub-events: POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty)
- misk-hub-events: POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/4cfa7b0f6d16497a992b76362ae306a7/items/?frontend_timestamp=1790586145&frontend_sign=dcda0bc425e8bbd80966bac8ddb177c94115d9c0 (200, json-object:recommId,recomms,numberNextRecommsCalls)
- saudi-water-authority-events: GET https://e-services-api.swa.gov.sa/api/EvaluationPage/evaluation-counts?fullUrl=https://www.swa.gov.sa/en/events (200, json-object:totalEvaluations,yesCount,latestPageUpdate)
- saudi-water-authority-events: POST https://e-services-api.swa.gov.sa/api/PageVisitsCount?url=https%3A%2F%2Fwww.swa.gov.sa%2Fen%2Fevents&pageTitle=Events%20Calendar%20%7C%20SWA (200, empty)
- saudi-water-authority-events: GET https://e-services-api.swa.gov.sa/api/event/published (200, json-like-invalid)
- saudi-water-authority-events: GET https://e-services-api.swa.gov.sa/api/PageVisitsCount?url=https%3A%2F%2Fwww.swa.gov.sa%2Fen%2Fevents (200, json-object:id,url,pageTitle,totalCount,todayCount,lastUpdated)
- saudi-water-authority-events: GET https://cdn77.api.userway.org/api/img-dscr/v2/0UYGxnoXJv/3624675/Mzv57s4G8iSPKW7I/alts.json?dto=%7B%22sorted%22%3A%5B%7B%22src%22%3A%22https%3A%2F%2Fwww.swa.gov.sa%2Fassets%2Fimages%2Flogos%2Fswa-logo-dark.svg%22%2C%22alt%22%3A%22SWA%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fwww.swa.gov.sa%2Fassets%2Fsvg%2FGov_Logo.svg%22%2C%22alt%22%3A%22Gov_Logo%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fwww.swa.gov.sa%2Fassets%2Fsvg%2Fhttps.svg%22%2C%22alt%22%3A%22https%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fwww.swa.gov.sa%2Fassets%2Fsvg%2Fksa-flag.svg%22%2C%22alt%22%3A%22flag%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fwww.swa.gov.sa%2Fassets%2Fsvg%2Flink-04.svg%22%2C%22alt%22%3A%22link%22%2C%22dir%22%3A%22RO%22%7D%5D%2C%22tier%22%3A%22PAID_QUOTA_TIER%22%2C%22pageUrl%22%3A%22https%3A%2F%2Fwww.swa.gov.sa%2Fen%2Fevents%22%7D (200, json-object:payload,payloadType)
- saudi-water-authority-events: POST https://api.userway.org/api/br-links/v0/pdf-links (200, json-object:statuses)
- saudi-water-authority-events: GET https://cdn77.api.userway.org/api/img-dscr/v2/0UYGxnoXJv/3624675/Mzv57s4G8iSPKW7I/alts.json?dto=%7B%22sorted%22%3A%5B%7B%22src%22%3A%22https%3A%2F%2Fswa-cdn.swa.gov.sa%2FEvents%2F36decb99545d4da5bfb6b09fb000691b_2026_05_25_10_48_20_766.jpg%22%2C%22alt%22%3A%22Saudi%20National%20Day%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fswa-cdn.swa.gov.sa%2FEvents%2F8ca9c4254c334d8d90c85b0c4f5f275c_2026_05_25_08_13_47_482.jpg%22%2C%22alt%22%3A%22Foundation%20Day%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fswa-cdn.swa.gov.sa%2FEvents%2F9535a79c349840bf8c92eeefcc04f2e5_2026_05_20_06_33_03_235.png%22%2C%22alt%22%3A%22Saudi%20Water%20Week%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fswa-cdn.swa.gov.sa%2FEvents%2Fa8b384622a1d4281b64b6fd75c82bd5e_2026_05_25_07_44_38_769.jpg%22%2C%22alt%22%3A%22World%20Conference%20on%20Desalination%20and%20Water%20Reuse%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fswa-cdn.swa.gov.sa%2FEvents%2Fb4fed1f10c414a39a5c49cd9fda6a63d_2026_05_20_07_35_20_655.png%22%2C%22alt%22%3A%22Global%20Infrastructure%20Expo%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fswa-cdn.swa.gov.sa%2FEvents%2Ff168ba04d30d4fec96ca03600421bd99_2026_05_25_08_24_48_478.png%22%2C%22alt%22%3A%22Saudi%20Flag%20Day%22%2C%22dir%22%3A%22RO%22%7D%2C%7B%22src%22%3A%22https%3A%2F%2Fwww.swa.gov.sa%2Fassets%2Fimages%2Fevents-calendar%2FTrailing%2520icon.svg%22%2C%22alt%22%3A%22%22%2C%22dir%22%3A%22RO%22%7D%5D%2C%22tier%22%3A%22PAID_QUOTA_TIER%22%2C%22pageUrl%22%3A%22https%3A%2F%2Fwww.swa.gov.sa%2Fen%2Fevents%22%7D (200, json-object:payload,payloadType)
- saudi-water-authority-events: GET https://api.userway.org/api/a11y-data/v0/page/https%3A%2F%2Fwww.swa.gov.sa%2Fen%2Fevents/DESKTOP/WIDGET_ON/status (200, json-object:payload,payloadType)
- sdaia-calendar-events: GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1790586185438 (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| eye-of-riyadh-events | 15 Rabi' II 1448 - 28 September 2026 Sign In/Sign Up Advertise with us Sign-up for newsletter HOME NEWS EVENTS BUSIN<br>hatsApp X LinkedIn Facebook Email Share 25 - 27 Jan, 2027 Real Estate Future Forum Four Seasons Hotel , Riyadh / Forum The Real Est<br>must evolve, embracing... More Details 25 - 26 Oct, 2026 Global Proptech Summit 2026 Mandarin Oriental Al Faisaliah , Riyadh / Sum | EVENTS -> https://www.eyeofriyadh.com/events/<br>عربي -> https://www.eyeofriyadh.com/ar/events/<br>Award -> https://www.eyeofriyadh.com/events/?fcat=15<br>Ceremony -> https://www.eyeofriyadh.com/events/?fcat=21 | - |
| tuwaiq-academy-bootcamps | يات فن تصميم الشخصيات 3D ","startDate":"2026-10-04T16:00:00+03:00","endDate":"2026-12-24T20:00:00+03:00","autoCloseRegistration":f<br>nStartDate":null,"registrationEndDate":"2026-09-20T12:00:00+03:00","requireProfileCompletion":true,"isMergePublish":false,"isPaid"<br>لبيرتون - المسار التأسيسي","startDate":"2026-10-11T09:00:00+03:00","endDate":"2027-07-20T21:00:00+03:00","autoCloseRegistration":f | - | - |
| misk-hub-events | Insights العربية Sign in Skills Offline 14 Sep 2026 Finance Fundamentals An interactive workshop designed to simplify the fundament<br>ng on 14th September 2026 Skills Online 25 Aug 2026 Navigating the Cyber Map: How to Choose Your Specialization & Build a Corporate<br>sed Finance Fundamentals English,Arabic 14 Sep 2026 4:00 pm : 7:00 pm More Details Online This event has Passed How to Choose Your | Programs -> https://hub.misk.org.sa/en/programs/<br>Events -> https://hub.misk.org.sa/en/events/<br>العربية -> https://hub.misk.org.sa/ar/events/<br>Programs -> https://hub.misk.org.sa/en/programs/ | POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid): {"nextSkippedValue":8,"stringObjectValues":"<div class=\"article-outer v3\"><div class=\" time-label\"><span>Hybrid</sp…<br>POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty): empty |
| saudi-water-authority-events | nt Global Prize for Innovation in Water 2026-12-14 - 2026-12-14 Global Awards Ceremony Jeddah – The Ritz-Carlton Upcoming Show Det<br>al Water Sustainability Conference 2026 2026-12-14 - 2026-12-16 Global Conference Jeddah-The Ritz-Carlton Upcoming Show Details Ex<br>ships Company Forum and Awards Ceremony 2026-12-01 - 2026-12-01 Local party Fairmont - Riyadh Upcoming Show Details Export to Cale | Events Calendar -> https://www.swa.gov.sa/en/events<br>العربية -> https://www.swa.gov.sa/ar/events<br>Share on Twitter/X - opens in a new tab -> https://twitter.com/intent/tweet?url=https%3A%2F%2Fwww.swa.gov.sa%2Fen%2Fevents<br>Share on Facebook - opens in a new tab -> https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwww.swa.gov.sa%2Fen%2Fevents | GET https://e-services-api.swa.gov.sa/api/EvaluationPage/evaluation-counts?fullUrl=https://www.swa.gov.sa/en/even… (200, json-object:totalEvaluations,yesCount,latestPageUpdate): {"totalEvaluations":0,"yesCount":0,"latestPageUpdate":null}<br>POST https://e-services-api.swa.gov.sa/api/PageVisitsCount?url=https%3A%2F%2Fwww.swa.gov.sa%2Fen%2Fevents&pageTitl… (200, empty): empty |
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
| sdaia-calendar-events | - | AI Scholarship Program -> https://sdaia.gov.sa/en/Sectors/academy/Pages/ScholarshipProgram.aspx<br>Cooperative Training Program -> https://sdaia.gov.sa/en/Sectors/BuildingCapacity/Pages/CooperativeTraining.aspx<br>Free Software and Services -> https://sdaia.gov.sa/en/Services/Pages/FreeServicesAndPrograms.aspx<br>Calendar and Events -> https://sdaia.gov.sa/en/MediaCenter/Events/Pages/default.aspx | GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1… (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications): {"Message":{"Title":"/en/mediacenter/events/pages/default.aspx","PageId":"/en/mediacenter/events/pages/default.aspx","Y… |
