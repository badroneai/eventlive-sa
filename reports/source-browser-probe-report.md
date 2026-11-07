# EventLive Browser Source Probe

Generated at: 2026-11-07T09:09:43.178Z

## Summary

- Sources probed this run: 2
- Fresh results available: 5
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 8 | mdlbeast-events | ok | 200 | browser-network-api | 6 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 34 | visit-saudi-calendar-pdf | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 59 | asharqia-chamber-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |

## Endpoint Candidates

- mdlbeast-events: GET https://mdlbeast.com/_next/data/ycKB_Sc9NSk1FbXfdDlDW/en/events/calendar.json (200, json-like-invalid)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&currencyCode=SAR&ts=1794042584719&eventSource=amzn.js&uuid=3257132e-a38d-4a57-a4da-256ea813eb0a (200, json-object:)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&currencyCode=SAR&ts=1794042584719&eventSource=amzn.js&uuid=c0791b1f-12e4-4804-947f-c1b0551cb390 (200, json-object:)
- mdlbeast-events: GET https://mc.yango.com/watch/3/1?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&page-ref&charset=utf-8&browser-info=pv%3A1%3Avf%3Ase3ls2oxoa218om1h1z2d77j83r81%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2683%3Acn%3A2%3Adp%3A0%3Als%3A826735110733%3Ahid%3A300545844%3Az%3A0%3Ai%3A20261107090945%3Aet%3A1794042586%3Aetms%3A1794042585610%3Ac%3A1%3Arn%3A806545512%3Arqn%3A1%3Au%3A179404258635417308%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A376%3Ast%3A1794042586&t=clc%280-0-0%29rqnt%281%29ti%281%29&redirnss=1 (200, json-object:settings,userData)
- mdlbeast-events: POST https://sdk-03.moengage.com/v2/device/add?os=web&os_platform=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F126.0.0.0%20Safari%2F537.36&is_incognito=false&app_id=3WOD3GUG7RZZTC54VS32NHA9&os_ver=macOS%2010_15_7&sdk_ver=2.81.01&model=Google%20Chrome&app_ver=1.0&device_ts=1794042586194&device_tz_offset=0&unique_id=3658f826-82f0-434e-9bfe-ba71428fe220&device_tz=0&device_unique_id=49091f2a-7b9c-462f-b9e1-d2f7929ae804&subscription_type=vapid&vapid_public=BIMX6knQZH09MR1LpNsQphAFim64pGleF3612U1Kw5umn36SvUZS3hQ8zhjFYKzpsTMxTUhR7KLbZBoPjfPe7Z8&environment=sdk-03.moengage.com&url=https%3A%2F%2Fmdlbeast.com%2Fevents (200, json-object:status,message)
- mdlbeast-events: GET https://mc.yango.com/watch/100422118?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&charset=utf-8&uah=chu%0A%22HeadlessChrome%22%3Bv%3D%22149%22%2C%22Chromium%22%3Bv%3D%22149%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224%22%0Acha%0Ax86%0Achb%0A64%0Achf%0A149.0.7827.55%0Achl%0A%22HeadlessChrome%22%3Bv%3D%22149.0.7827.55%22%2C%22Chromium%22%3Bv%3D%22149.0.7827.55%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224.0.0.0%22%0Achm%0A%3F0%0Achp%0AmacOS%0Achv%0A10_15_7&browser-info=pv%3A1%3Avf%3Ase3ls2oxoa218om1h1z2d77j83r81%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2683%3Acn%3A1%3Adp%3A0%3Als%3A1180027547203%3Ahid%3A300545844%3Az%3A0%3Ai%3A20261107090945%3Aet%3A1794042586%3Aetms%3A1794042585608%3Ac%3A1%3Arn%3A671555334%3Arqn%3A1%3Au%3A179404258635417308%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A376%3Arqnl%3A1%3Ast%3A1794042587%3At%3AMDLBEAST%20Events%20Calendar%20-%20Discover%20Now%20%7C%20MDLBEAST&t=clt(919)clc(0-0-0)rqnt(1)ti(1) (200, json-object:settings,userData)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| mdlbeast-events | V BEAST HOUSE In Riyadh PAST EVENTS FRI 06 NOV 2026 - SAT 07 NOV 2026 UNSTABLE In Riyadh FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST<br>RADIO MIXTAPE In Riyadh THU 05 FEB 2026 - FRI 06 FEB 2026 BALAD BEAST 2026 In Jeddah THU 11 DEC 2025 - SAT 13 DEC 2025<br>SOUNDSTORM 25 In Riyadh THU 04 DEC 2025 - SAT 06 DEC 2025 XP MUSIC FUTURES 2025 In Riyadh THU 25 SEP 2025 - FRI 26 SEP | EXPLORE FULL CALENDAR -> https://mdlbeast.com/events/calendar<br>FRI 06 NOV BEAST HOUSE In Riyadh -> https://mdlbeast.com/events/beast-house<br>FRI 06 NOV 2026 - SAT 07 NOV 2026 UNSTABLE In Riyadh -> https://mdlbeast.com/events/unstable<br>FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh -> https://mdlbeast.com/events/mdlbeast-radio-mixtape | GET https://mdlbeast.com/_next/data/ycKB_Sc9NSk1FbXfdDlDW/en/events/calendar.json (200, json-like-invalid): {"pageProps":{"events":[{"title":"Beast House","slug":"beast-house","id":"LrwF27BJQwSahu3U7WDIkQ","startDatetime":"2026…<br>GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&curr… (200, json-object:): {} |
