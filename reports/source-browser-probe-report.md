# EventLive Browser Source Probe

Generated at: 2026-07-11T09:12:58.639Z

## Summary

- Sources probed: 14
- Browser network API: 2
- Hydration payload: 0
- Rendered HTML candidates: 4
- Blocked/protected: 1
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 12 | eye-of-riyadh-events | ok | 200 | rendered-html-candidates | 0 | 20 | 7 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 20 | code-mcit-programs | ok | 200 | rendered-html-candidates | 0 | 10 | 4 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 25 | sdaia-academy-programs | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 28 | misk-hub-events | ok | 200 | browser-network-api | 3 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 29 | jcci-events-center | ok | 200 | browser-network-api | 5 | 20 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 30 | saudi-pro-league-fixtures | ok | 200 | rendered-html-candidates | 0 | 0 | 8 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 32 | saudi-space-agency-events | ok | 405 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 54 | sdaia-calendar-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 55 | makkah-chamber-events | ok | 200 | rendered-html-candidates | 0 | 20 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 60 | qassim-chamber-events | ok | 200 | blocked-or-protected | 0 | 19 | 3 | لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي. |

## Endpoint Candidates

- misk-hub-events: POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid)
- misk-hub-events: POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty)
- misk-hub-events: POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/7048ef54efb04cd0b9bad1731f370f47/items/?frontend_timestamp=1783746352&frontend_sign=2119ef060af0e6d793ffe72f9a70b8504e0fb8c0 (200, json-object:recommId,recomms,numberNextRecommsCalls)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-spa-web%405.0.28%2Finit (200, json-like-invalid)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-dropdown-support-web%402.0.9%2Findex (200, json-like-invalid)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-tabs-support-web%402.0.11%2Findex (200, json-like-invalid)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-collapse-support-web%402.0.12%2Findex (200, json-like-invalid)
- jcci-events-center: GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-alert-support-web%402.0.9%2Findex (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| eye-of-riyadh-events | 25 Muharram 1448 - 11 July 2026 Sign In/Sign Up Advertise with us Sign-up for newsletter HOME NEWS EVENTS BUSIN<br>hatsApp X LinkedIn Facebook Email Share 25 - 27 Jan, 2027 Real Estate Future Forum Four Seasons Hotel , Riyadh / Forum The Real Est<br>must evolve, embracing... More Details 25 - 26 Oct, 2026 Global Proptech Summit 2026 Mandarin Oriental Al Faisaliah , Riyadh / Sum | EVENTS -> https://www.eyeofriyadh.com/events/<br>عربي -> https://www.eyeofriyadh.com/ar/events/<br>Award -> https://www.eyeofriyadh.com/events/?fcat=15<br>Ceremony -> https://www.eyeofriyadh.com/events/?fcat=21 | - |
| code-mcit-programs | ompanies Read More Saudi Game Champions 2 October 2025 - April 2026 Incubator Closed Join us on a journey that begins with your playab<br>capital firms. Read More Tech Champions 5 May 2025 Accelerator Closed The 5th edition of the program consists of two startup incub<br>ment. Read More PropTech Experts Series 21 – 24 Sep 2025 Digital Series Closed The Technology Experts Meeting Series provides an op | Skip to main content -> https://code.mcit.gov.sa/en/our-programs#main-content<br>En -> https://code.mcit.gov.sa/en/our-programs<br>عربي -> https://code.mcit.gov.sa/ar/our-programs<br>Programs -> https://code.mcit.gov.sa/en/our-programs | - |
| misk-hub-events | Insights العربية Sign in Skills Online 01 Jul 2026 Cybersecurity in the Workplace Within the Misk Career Essentials Program, we pr<br>closing on 1st July 2026 Skills Offline 08 May 2026 How to Choose Your Career Path and Keep Up with Labor Market Changes The Misk C<br>d Cybersecurity in the Workplace Arabic 01 Jul 2026 7:00 pm : 8:00 pm More Details Hybrid Test Form Karachi English,Arabic 21 Jan - | Programs -> https://hub.misk.org.sa/en/programs/<br>Events -> https://hub.misk.org.sa/en/events/<br>العربية -> https://hub.misk.org.sa/ar/events/<br>Programs -> https://hub.misk.org.sa/en/programs/ | POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid): {"nextSkippedValue":8,"stringObjectValues":"<div class=\"article-outer v3\"><div class=\" time-label\"><span>Online</sp…<br>POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty): empty |
| jcci-events-center | - | Programs and Initiatives -> https://www.jcci.org.sa/en/programs-landing-page<br>Community Development Center Programs at a Glance -> https://www.jcci.org.sa/en/community-development-landing-page<br>Small and Medium Enterprises Support Center Programs at a Glance -> https://www.jcci.org.sa/en/%D8%A8%D8%B1%D8%A7%D9%85%D8%AC-%D8%AF%D8%B9%D9%85-%D8%A7%D9%84%D9%85%D9%86%D8%B4%D8%A2%D8%AA…<br>Center Program Targets -> https://www.jcci.org.sa/en/%D9%85%D8%B3%D8%AA%D9%87%D8%AF%D9%81%D8%A7%D8%AA-%D8%A7%D9%84%D9%85%D8%B1%D9%83%D8%B2 | GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-spa-web%405.0.28%2Finit (200, json-like-invalid): {"pathMap":{"frontend-js-web@5.0.53\/liferay\/util\/toggle_radio":"\/o\/js\/resolved-module\/frontend-js-web@5.0.53\/li…<br>GET https://www.jcci.org.sa/o/js_resolve_modules?modules=frontend-js-dropdown-support-web%402.0.9%2Findex (200, json-like-invalid): {"pathMap":{"frontend-js-web@5.0.53\/liferay\/util\/toggle_radio":"\/o\/js\/resolved-module\/frontend-js-web@5.0.53\/li… |
| saudi-pro-league-fixtures | :3.0,"millis":1.7563971E12,"label":"Thu 28 Aug 2025, 17:05 BST","gmtOffset":1.0},"provisionalKickoff":{"completeness":3.0,"millis":<br>1.7563971E12,"label":"Thu 28 Aug 2025, 17:05 BST","gmtOffset":1.0},"teams":[{"team":{"name":"Damac","club":{"name":"D<br>":3.0,"millis":1.756404E12,"label":"Thu 28 Aug 2025, 19:00 BST","gmtOffset":1.0},"provisionalKickoff":{"completeness":3.0,"millis": | - | - |
| makkah-chamber-events | - | مناسبات غرفة مكة -> https://makkahcci.org.sa/event<br>الفعاليات القادمة -> https://makkahcci.org.sa/event?date=all&country=all&type=all<br>هذا الشهر 1 -> https://makkahcci.org.sa/event?date=month&country=all&type=all<br>الفعاليات الماضية -> https://makkahcci.org.sa/event?date=old&country=all&type=all | - |
| qassim-chamber-events | الموارد البشرية الفعالية انتهت الاثنين, يوليو 6 2026, 16:30 1448-01-21 عمليات إدارة الموارد البشرية عرض التفاصيل أساسيات إدار<br>لمنشآت والشركات الفعالية انتهت الاثنين, يونيو 22 2026, 16:30 1448-01-07 أساسيات إدارة التأمين في المنشآت والشركات عرض التفاصي<br>وفق مؤشرات KPI الفعالية انتهت الاثنين, يونيو 8 2026, 16:30 1447-12-22 إدارة الأداء المؤسسي وتقييم الموظفين وفق مؤشرات KPI عر | إستعراض الفعاليات -> https://tc.qcc.org.sa/events<br>عمليات إدارة الموارد البشرية -> https://tc.qcc.org.sa/events/204<br>عرض التفاصيل -> https://tc.qcc.org.sa/events/204<br>أساسيات إدارة التأمين في المنشآت والشركات -> https://tc.qcc.org.sa/events/203 | - |
