# EventLive Browser Source Probe

Generated at: 2026-10-25T07:53:27.011Z

## Summary

- Sources probed this run: 8
- Fresh results available: 13
- Browser network API: 2
- Hydration payload: 0
- Rendered HTML candidates: 2
- Blocked/protected: 1
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 8 | mdlbeast-events | ok | 200 | browser-network-api | 6 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 12 | eye-of-riyadh-events | ok | 200 | rendered-html-candidates | 0 | 20 | 8 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 14 | eventbrite-saudi | ok | 405 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 16 | tuwaiq-academy-bootcamps | ok | 200 | browser-structured-html | 0 | 0 | 8 | اكتب extractor من JSON-LD أو structured scripts مع fallback للبطاقات. |
| 17 | future-skills-catalog | ok | 200 | rendered-html-candidates | 0 | 20 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 28 | misk-hub-events | ok | 200 | browser-network-api | 3 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 502 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 60 | qassim-chamber-events | ok | 403 | blocked-or-protected | 0 | 0 | 0 | لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي. |

## Endpoint Candidates

- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&currencyCode=SAR&ts=1792914832075&eventSource=amzn.js&uuid=22be06df-385e-459b-919b-59bab3c268a9 (200, json-object:)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&currencyCode=SAR&ts=1792914832075&eventSource=amzn.js&uuid=88fb103f-cb34-42db-a3a9-9b0e2d5a7fd2 (200, json-object:)
- mdlbeast-events: GET https://mc.yango.com/watch/3/1?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&page-ref&charset=utf-8&browser-info=pv%3A1%3Avf%3Ase3ls2oxoa218om1h1z2d77j83r81%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2672%3Acn%3A2%3Adp%3A0%3Als%3A389287632949%3Ahid%3A111783567%3Az%3A0%3Ai%3A20261025075352%3Aet%3A1792914833%3Aetms%3A1792914832698%3Ac%3A1%3Arn%3A974560130%3Arqn%3A1%3Au%3A1792914833295217715%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A296%3Ast%3A1792914833&t=clc%280-0-0%29rqnt%281%29ti%281%29&redirnss=1 (200, json-object:settings,userData)
- mdlbeast-events: POST https://sdk-03.moengage.com/v2/device/add?os=web&os_platform=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F126.0.0.0%20Safari%2F537.36&is_incognito=false&app_id=3WOD3GUG7RZZTC54VS32NHA9&os_ver=macOS%2010_15_7&sdk_ver=2.81.01&model=Google%20Chrome&app_ver=1.0&device_ts=1792914833070&device_tz_offset=0&unique_id=0797a7b7-fcb3-4e67-8bfe-329019b52e95&device_tz=0&device_unique_id=57a49321-c98b-4883-849c-29e3772035f7&subscription_type=vapid&vapid_public=BIMX6knQZH09MR1LpNsQphAFim64pGleF3612U1Kw5umn36SvUZS3hQ8zhjFYKzpsTMxTUhR7KLbZBoPjfPe7Z8&environment=sdk-03.moengage.com&url=https%3A%2F%2Fmdlbeast.com%2Fevents (200, json-object:status,message)
- mdlbeast-events: POST https://api2.amplitude.com/2/httpapi (200, json-object:code,server_upload_time,payload_size_bytes,events_ingested)
- mdlbeast-events: GET https://mc.yango.com/watch/100422118?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&charset=utf-8&uah=chu%0A%22HeadlessChrome%22%3Bv%3D%22149%22%2C%22Chromium%22%3Bv%3D%22149%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224%22%0Acha%0Ax86%0Achb%0A64%0Achf%0A149.0.7827.55%0Achl%0A%22HeadlessChrome%22%3Bv%3D%22149.0.7827.55%22%2C%22Chromium%22%3Bv%3D%22149.0.7827.55%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224.0.0.0%22%0Achm%0A%3F0%0Achp%0AmacOS%0Achv%0A10_15_7&browser-info=pv%3A1%3Avf%3Ase3ls2oxoa218om1h1z2d77j83r81%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2672%3Acn%3A1%3Adp%3A0%3Als%3A492219001888%3Ahid%3A111783567%3Az%3A0%3Ai%3A20261025075352%3Aet%3A1792914833%3Aetms%3A1792914832697%3Ac%3A1%3Arn%3A18957705%3Arqn%3A1%3Au%3A1792914833295217715%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A296%3Arqnl%3A1%3Ast%3A1792914834%3At%3AMDLBEAST%20Events%20Calendar%20-%20Discover%20Now%20%7C%20MDLBEAST&t=clt(861)clc(0-0-0)rqnt(1)ti(1) (200, json-object:settings,userData)
- misk-hub-events: POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid)
- misk-hub-events: POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/bb751ac82ef24755b836843cbca20d33/items/?frontend_timestamp=1792914875&frontend_sign=d3d1077de589d9875dc612ba793cdd3d34edbab2 (200, json-object:recommId,recomms,numberNextRecommsCalls)
- misk-hub-events: POST https://mpc-prod-24-s6uit34pua-uw.a.run.app/events?cee=no (200, empty)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| mdlbeast-events | e, discover, and dance. PAST EVENTS THU 08 OCT 2026 BEAST HOUSE In Riyadh THU 08 OCT 2026 - FRI 09 OCT 2026 UNSTABLE In Riyadh FRI<br>04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh THU 05 FEB 2026 - FRI 06 FEB 2026 BALAD BEAST<br>2026 In Jeddah THU 11 DEC 2025 - SAT 13 DEC 2025 SOUNDSTORM 25 In Riyadh THU 04 DEC 2025 - SAT 06 DEC 2025 XP MUSIC FUTURES 2025 | THU 08 OCT 2026 BEAST HOUSE In Riyadh -> https://mdlbeast.com/events/beast-house<br>THU 08 OCT 2026 - FRI 09 OCT 2026 UNSTABLE In Riyadh -> https://mdlbeast.com/events/unstable<br>FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh -> https://mdlbeast.com/events/mdlbeast-radio-mixtape<br>THU 05 FEB 2026 - FRI 06 FEB 2026 BALAD BEAST 2026 In Jeddah -> https://mdlbeast.com/events/balad-beast-2026 | GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&curr… (200, json-object:): {}<br>GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&curr… (200, json-object:): {} |
| eye-of-riyadh-events | 13 Jumada I 1448 - 25 October 2026 Sign In/Sign Up Advertise with us Sign-up for newsletter HOME NEWS EVENTS BUSIN<br>hatsApp X LinkedIn Facebook Email Share 25 - 27 Jan, 2027 Real Estate Future Forum Four Seasons Hotel , Riyadh / Forum The Real Est<br>must evolve, embracing... More Details 4 - 5 Apr, 2027 Global Proptech Summit 2027 Mandarin Oriental Al Faisaliah , Riyadh / Sum | EVENTS -> https://www.eyeofriyadh.com/events/<br>عربي -> https://www.eyeofriyadh.com/ar/events/<br>Award -> https://www.eyeofriyadh.com/events/?fcat=15<br>Ceremony -> https://www.eyeofriyadh.com/events/?fcat=21 | - |
| tuwaiq-academy-bootcamps | ر الأنظمة الذاتية للدرونز","startDate":"2026-11-01T18:00:00+03:00","endDate":"2026-12-03T21:00:00+03:00","autoCloseRegistration":f<br>nStartDate":null,"registrationEndDate":"2026-10-18T12:00:00+03:00","requireProfileCompletion":true,"isMergePublish":true,"isPaid":<br>سحابة وتعلم الآلة على AWS","startDate":"2026-11-08T18:00:00+03:00","endDate":"2026-12-17T22:00:00+03:00","autoCloseRegistration":f | - | - |
| future-skills-catalog | - | تجاوز إلى المحتوى الرئيسي -> https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>English -> https://futureskills.mcit.gov.sa/en/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>الفعاليات -> https://www.mcit.gov.sa/ar/events<br>البرنامج المتخصص في العمل الحر -> http://futureskills.mcit.gov.sa/ar/node/20481 | - |
| misk-hub-events | Insights العربية Sign in Skills Offline 19 - 20 Oct 2026 Nonprofit Governance: From Compliance to Institutional Excellence This wor<br>sing on 14th October 2026 Skills Online 21 Oct 2026 From the Classroom to the Workplace: The Skills That Make the Difference Delive<br>That Make the Difference English,Arabic 21 Oct 2026 7:00 pm : 8:00 pm More Details In-Person This event has Passed Nonprofit Govern | Programs -> https://hub.misk.org.sa/en/programs/<br>Events -> https://hub.misk.org.sa/en/events/<br>العربية -> https://hub.misk.org.sa/ar/events/<br>Programs -> https://hub.misk.org.sa/en/programs/ | POST https://hub.misk.org.sa/api/events/RenderLazyLoadAllEventsOfSeries (200, json-like-invalid): {"nextSkippedValue":8,"stringObjectValues":"<div class=\"article-outer v3\"><div class=\" time-label\"><span>Hybrid</sp…<br>POST https://client-rapi-us-west.recombee.com/misk-hub-prod/recomms/users/bb751ac82ef24755b836843cbca20d33/items/?… (200, json-object:recommId,recomms,numberNextRecommsCalls): {"recommId": "b23c5a727134b320014a0a6db21dada0", "recomms": [], "numberNextRecommsCalls": 0} |
