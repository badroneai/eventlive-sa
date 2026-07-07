# EventLive Browser Source Probe

Generated at: 2026-07-07T20:42:18.461Z

## Summary

- Sources probed: 8
- Browser network API: 3
- Hydration payload: 0
- Rendered HTML candidates: 2
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 7 | experience-alula-events | ok | 200 | browser-network-api | 2 | 20 | 1 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 20 | code-mcit-programs | ok | 200 | rendered-html-candidates | 0 | 10 | 4 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 23 | ithra-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 25 | sdaia-academy-programs | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 28 | misk-hub-events | ok | 200 | browser-network-api | 3 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 29 | jcci-events-center | ok | 200 | browser-network-api | 5 | 20 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 30 | saudi-pro-league-fixtures | ok | 200 | rendered-html-candidates | 0 | 0 | 8 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |

## Endpoint Candidates

- experience-alula-events: GET https://www.experiencealula.com/bin/commerce/productPriceSync.initiateProductSync.json?experiencePath=/content/rcudxp/ea/en/data/all-experiences-detail (200, json-like-invalid)
- experience-alula-events: GET https://www.experiencealula.com/bin/commerce/productsAvailabilityStatus.initiateProductStatusSync.json?experiencePath=/content/rcudxp/ea/en/data/all-experiences-detail (200, json-object:id,url)
- misk-hub-events: POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty)
- misk-hub-events: POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid)
- misk-hub-events: POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/4caa5cf7f01647a9b764e37ba0b38724/items/?frontend_timestamp=1783457110&frontend_sign=177543336e73f3b7e051a3fd38388dff59a46d8c (200, json-object:recommId,recomms,numberNextRecommsCalls)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-spa-web%405.0.28%2Finit (200, json-like-invalid)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-tabs-support-web%402.0.11%2Findex (200, json-like-invalid)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-collapse-support-web%402.0.12%2Findex (200, json-like-invalid)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-alert-support-web%402.0.9%2Findex (200, json-like-invalid)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-dropdown-support-web%402.0.9%2Findex (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| experience-alula-events | ts AlFursan Endurance AlUla AlUla 7 and 8 February 2026 • 15 Hours World-class endurance racing returns to AlUla. From SAR 60 per perso | Englishen -> https://www.experiencealula.com/en/whats-on/events<br>العربيةar -> https://www.experiencealula.com/ar/whats-on/events<br>AlUla Calendar -> https://www.experiencealula.com/en/whats-on<br>AlUla Skies Festival 2026 -> https://www.experiencealula.com/en/whats-on/festivals/alula-skies-festival | GET https://www.experiencealula.com/bin/commerce/productPriceSync.initiateProductSync.json?experiencePath=/conten… (200, json-like-invalid): {"id":{"9bf8b85c-d478-ee11-a8fd-005056b0cec7":{"basePrice":"","fromPrice":"","mobilePrice":"","multiFlow":false,"pageUR…<br>GET https://www.experiencealula.com/bin/commerce/productsAvailabilityStatus.initiateProductStatusSync.json?experi… (200, json-object:id,url): {"id":{"1c3b7397-6a4b-f011-a908-005056b00240":{"isSoldOut":"false","isExpired":"false","almostFull":"false","sellingFas… |
| code-mcit-programs | ompanies Read More Saudi Game Champions 2 October 2025 - April 2026 Incubator Open Join us on a journey that begins with your playable<br>capital firms. Read More Tech Champions 5 May 2025 Accelerator Closed The 5th edition of the program consists of two startup incub<br>ment. Read More PropTech Experts Series 21 – 24 Sep 2025 Digital Series Closed The Technology Experts Meeting Series provides an op | Skip to main content -> https://code.mcit.gov.sa/en/our-programs#main-content<br>En -> https://code.mcit.gov.sa/en/our-programs<br>عربي -> https://code.mcit.gov.sa/ar/our-programs<br>Programs -> https://code.mcit.gov.sa/en/our-programs | - |
| misk-hub-events | Insights العربية Sign in Skills Offline 08 May 2026 How to Choose Your Career Path and Keep Up with Labor Market Changes The Misk C<br>d Cybersecurity in the Workplace Arabic 01 Jul 2026 7:00 pm : 8:00 pm More Details Hybrid Test Form Karachi English,Arabic 21 Jan -<br>31 Dec 2026 10:11 : 10:11 More Details Online This event has Passed Enhancing Efficiency an | Programs -> https://hub.misk.org.sa/en/programs/<br>Events -> https://hub.misk.org.sa/en/events/<br>العربية -> https://hub.misk.org.sa/ar/events/<br>Programs -> https://hub.misk.org.sa/en/programs/ | POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty): empty<br>POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid): {"nextSkippedValue":8,"stringObjectValues":"<div class=\"article-outer v3\"><div class=\" time-label\"><span>Online</sp… |
| jcci-events-center | - | Programs and Initiatives -> https://www.jcci.org.sa/en/programs-landing-page<br>Community Development Center Programs at a Glance -> https://www.jcci.org.sa/en/community-development-landing-page<br>Small and Medium Enterprises Support Center Programs at a Glance -> https://www.jcci.org.sa/en/%D8%A8%D8%B1%D8%A7%D9%85%D8%AC-%D8%AF%D8%B9%D9%85-%D8%A7%D9%84%D9%85%D9%86%D8%B4%D8%A2%D8%AA…<br>Center Program Targets -> https://www.jcci.org.sa/en/%D9%85%D8%B3%D8%AA%D9%87%D8%AF%D9%81%D8%A7%D8%AA-%D8%A7%D9%84%D9%85%D8%B1%D9%83%D8%B2 | GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-spa-web%405.0.28%2Finit (200, json-like-invalid): {"pathMap":{"frontend-js-web@5.0.53\/liferay\/util\/toggle_radio":"\/o\/js\/resolved-module\/frontend-js-web@5.0.53\/li…<br>GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-tabs-support-web%402.0.11%2Findex (200, json-like-invalid): {"pathMap":{"frontend-js-web@5.0.53\/liferay\/util\/toggle_radio":"\/o\/js\/resolved-module\/frontend-js-web@5.0.53\/li… |
| saudi-pro-league-fixtures | :3.0,"millis":1.7563971E12,"label":"Thu 28 Aug 2025, 17:05 BST","gmtOffset":1.0},"provisionalKickoff":{"completeness":3.0,"millis":<br>1.7563971E12,"label":"Thu 28 Aug 2025, 17:05 BST","gmtOffset":1.0},"teams":[{"team":{"name":"Damac","club":{"name":"D<br>":3.0,"millis":1.756404E12,"label":"Thu 28 Aug 2025, 19:00 BST","gmtOffset":1.0},"provisionalKickoff":{"completeness":3.0,"millis": | - | - |
