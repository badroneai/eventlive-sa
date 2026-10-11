# EventLive Browser Source Probe

Generated at: 2026-10-11T09:14:10.601Z

## Summary

- Sources probed this run: 4
- Fresh results available: 9
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
| 8 | mdlbeast-events | ok | 200 | browser-network-api | 7 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 17 | future-skills-catalog | ok | 200 | rendered-html-candidates | 0 | 20 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 56 | scega-exhibitions-conferences | ok | 400 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |

## Endpoint Candidates

- mdlbeast-events: GET https://mdlbeast.com/_next/data/bdew-8506HqAxj9uCFggJ/en/events/calendar.json (200, json-like-invalid)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&currencyCode=SAR&ts=1791710051947&eventSource=amzn.js&uuid=2a2aa1f5-68e3-4b18-8e04-cf60627c9046 (200, json-object:)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&currencyCode=SAR&ts=1791710051947&eventSource=amzn.js&uuid=3bf71ff6-5e30-4928-919c-9bcab8c82f51 (200, json-object:)
- mdlbeast-events: GET https://mc.yango.com/watch/3/1?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&page-ref&charset=utf-8&browser-info=pv%3A1%3Avf%3A35kef4arqp485yiojzg8cw0ppzbwk1%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2661%3Acn%3A2%3Adp%3A0%3Als%3A1040115393795%3Ahid%3A208803880%3Az%3A0%3Ai%3A20261011091412%3Aet%3A1791710053%3Ac%3A1%3Arn%3A380665557%3Arqn%3A1%3Au%3A1791710053770449238%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A316%3Ast%3A1791710053&t=clc%280-0-0%29rqnt%281%29ti%281%29&redirnss=1 (200, json-object:settings,userData)
- mdlbeast-events: POST https://sdk-03.moengage.com/v2/device/add?os=web&os_platform=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F126.0.0.0%20Safari%2F537.36&is_incognito=false&app_id=3WOD3GUG7RZZTC54VS32NHA9&os_ver=macOS%2010_15_7&sdk_ver=2.81.01&model=Google%20Chrome&app_ver=1.0&device_ts=1791710052633&device_tz_offset=0&unique_id=81e2f8d4-46fe-46b0-8069-0bd77e97c9b7&device_tz=0&device_unique_id=742bc0d5-965e-4092-8cb4-8d25b52f76d8&subscription_type=vapid&vapid_public=BIMX6knQZH09MR1LpNsQphAFim64pGleF3612U1Kw5umn36SvUZS3hQ8zhjFYKzpsTMxTUhR7KLbZBoPjfPe7Z8&environment=sdk-03.moengage.com&url=https%3A%2F%2Fmdlbeast.com%2Fevents (200, json-object:status,message)
- mdlbeast-events: POST https://api2.amplitude.com/2/httpapi (200, json-object:code,server_upload_time,payload_size_bytes,events_ingested)
- mdlbeast-events: GET https://mc.yango.com/watch/100422118?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&charset=utf-8&uah=chu%0A%22HeadlessChrome%22%3Bv%3D%22149%22%2C%22Chromium%22%3Bv%3D%22149%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224%22%0Acha%0Ax86%0Achb%0A64%0Achf%0A149.0.7827.55%0Achl%0A%22HeadlessChrome%22%3Bv%3D%22149.0.7827.55%22%2C%22Chromium%22%3Bv%3D%22149.0.7827.55%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224.0.0.0%22%0Achm%0A%3F0%0Achp%0AmacOS%0Achv%0A10_15_7&browser-info=pv%3A1%3Avf%3A35kef4arqp485yiojzg8cw0ppzbwk1%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2661%3Acn%3A1%3Adp%3A0%3Als%3A886372566483%3Ahid%3A208803880%3Az%3A0%3Ai%3A20261011091412%3Aet%3A1791710053%3Ac%3A1%3Arn%3A922594901%3Arqn%3A1%3Au%3A1791710053770449238%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A316%3Arqnl%3A1%3Ast%3A1791710054%3At%3AMDLBEAST%20Events%20Calendar%20-%20Discover%20Now%20%7C%20MDLBEAST&t=clt(983)clc(0-0-0)rqnt(1)ti(1) (200, json-object:settings,userData)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| mdlbeast-events | T BEAST HOUSE In Riyadh PAST EVENTS FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh THU 05 FEB 2026 - FRI 06 FEB<br>2026 BALAD BEAST 2026 In Jeddah THU 11 DEC 2025 - SAT 13 DEC 2025 SOUNDSTORM 25 In Riyadh THU 04 DEC 2025 - SAT 06 DEC 2025 XP<br>MUSIC FUTURES 2025 In Riyadh THU 25 SEP 2025 - FRI 26 SEP 2025 AZIMUTH 2025 In Alula THU 25 SEP 2025 - FRI 26 SEP 2025 BALAD | EXPLORE FULL CALENDAR -> https://mdlbeast.com/events/calendar<br>FRI 16 OCT - SAT 17 OCT UNSTABLE In Riyadh -> https://mdlbeast.com/events/unstable<br>FRI 30 OCT BEAST HOUSE In Riyadh -> https://mdlbeast.com/events/beast-house<br>FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh -> https://mdlbeast.com/events/mdlbeast-radio-mixtape | GET https://mdlbeast.com/_next/data/bdew-8506HqAxj9uCFggJ/en/events/calendar.json (200, json-like-invalid): {"pageProps":{"events":[{"title":"Beast House","slug":"beast-house","id":"LrwF27BJQwSahu3U7WDIkQ","startDatetime":"2026…<br>GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&curr… (200, json-object:): {} |
| future-skills-catalog | - | تجاوز إلى المحتوى الرئيسي -> https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>English -> https://futureskills.mcit.gov.sa/en/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>الفعاليات -> https://www.mcit.gov.sa/ar/events<br>البرنامج المتخصص في العمل الحر -> http://futureskills.mcit.gov.sa/ar/node/20481 | - |
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
