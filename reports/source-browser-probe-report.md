# EventLive Browser Source Probe

Generated at: 2026-10-14T07:44:32.977Z

## Summary

- Sources probed this run: 3
- Fresh results available: 8
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
| 8 | mdlbeast-events | ok | 200 | browser-network-api | 6 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 59 | asharqia-chamber-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 60 | qassim-chamber-events | ok | 200 | rendered-html-candidates | 0 | 19 | 3 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |

## Endpoint Candidates

- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&currencyCode=SAR&ts=1791963874967&eventSource=amzn.js&uuid=461e0dc7-7401-4d99-a7f8-72295183fef9 (200, json-object:)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&currencyCode=SAR&ts=1791963874967&eventSource=amzn.js&uuid=443d89c1-88ea-4170-871e-46b43eeb970d (200, json-object:)
- mdlbeast-events: POST https://api2.amplitude.com/2/httpapi (200, json-object:code,server_upload_time,payload_size_bytes,events_ingested)
- mdlbeast-events: GET https://mc.yango.com/watch/3/1?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&page-ref&charset=utf-8&browser-info=pv%3A1%3Avf%3A35kef4arqp485yiojzg8cw0ppzbwk1%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2661%3Acn%3A2%3Adp%3A0%3Als%3A1094944072641%3Ahid%3A267594936%3Az%3A0%3Ai%3A20261014074436%3Aet%3A1791963877%3Ac%3A1%3Arn%3A221513230%3Arqn%3A1%3Au%3A1791963877517708735%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A400%3Ast%3A1791963877&t=clc%280-0-0%29rqnt%281%29ti%281%29&redirnss=1 (200, json-object:settings,userData)
- mdlbeast-events: POST https://sdk-03.moengage.com/v2/device/add?os=web&os_platform=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F126.0.0.0%20Safari%2F537.36&is_incognito=false&app_id=3WOD3GUG7RZZTC54VS32NHA9&os_ver=macOS%2010_15_7&sdk_ver=2.81.01&model=Google%20Chrome&app_ver=1.0&device_ts=1791963877421&device_tz_offset=0&unique_id=442a5abf-aab4-40b9-81f9-39ac603ce99e&device_tz=0&device_unique_id=76967951-9476-4c61-a8e7-0e2c0108458b&subscription_type=vapid&vapid_public=BIMX6knQZH09MR1LpNsQphAFim64pGleF3612U1Kw5umn36SvUZS3hQ8zhjFYKzpsTMxTUhR7KLbZBoPjfPe7Z8&environment=sdk-03.moengage.com&url=https%3A%2F%2Fmdlbeast.com%2Fevents (200, json-object:status,message)
- mdlbeast-events: GET https://mc.yango.com/watch/100422118?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&charset=utf-8&uah=chu%0A%22HeadlessChrome%22%3Bv%3D%22149%22%2C%22Chromium%22%3Bv%3D%22149%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224%22%0Acha%0Ax86%0Achb%0A64%0Achf%0A149.0.7827.55%0Achl%0A%22HeadlessChrome%22%3Bv%3D%22149.0.7827.55%22%2C%22Chromium%22%3Bv%3D%22149.0.7827.55%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224.0.0.0%22%0Achm%0A%3F0%0Achp%0AmacOS%0Achv%0A10_15_7&browser-info=pv%3A1%3Avf%3A35kef4arqp485yiojzg8cw0ppzbwk1%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2661%3Acn%3A1%3Adp%3A0%3Als%3A632665845718%3Ahid%3A267594936%3Az%3A0%3Ai%3A20261014074436%3Aet%3A1791963877%3Ac%3A1%3Arn%3A926904644%3Arqn%3A1%3Au%3A1791963877517708735%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A400%3Arqnl%3A1%3Ast%3A1791963878%3At%3AMDLBEAST%20Events%20Calendar%20-%20Discover%20Now%20%7C%20MDLBEAST&t=clt(1616)clc(0-0-0)rqnt(1)ti(1) (200, json-object:settings,userData)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| mdlbeast-events | e, discover, and dance. PAST EVENTS THU 08 OCT 2026 BEAST HOUSE In Riyadh THU 08 OCT 2026 - FRI 09 OCT 2026 UNSTABLE In Riyadh FRI<br>04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh THU 05 FEB 2026 - FRI 06 FEB 2026 BALAD BEAST<br>2026 In Jeddah THU 11 DEC 2025 - SAT 13 DEC 2025 SOUNDSTORM 25 In Riyadh THU 04 DEC 2025 - SAT 06 DEC 2025 XP MUSIC FUTURES 2025 | THU 08 OCT 2026 BEAST HOUSE In Riyadh -> https://mdlbeast.com/events/beast-house<br>THU 08 OCT 2026 - FRI 09 OCT 2026 UNSTABLE In Riyadh -> https://mdlbeast.com/events/unstable<br>FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh -> https://mdlbeast.com/events/mdlbeast-radio-mixtape<br>THU 05 FEB 2026 - FRI 06 FEB 2026 BALAD BEAST 2026 In Jeddah -> https://mdlbeast.com/events/balad-beast-2026 | GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&curr… (200, json-object:): {}<br>GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&curr… (200, json-object:): {} |
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
| qassim-chamber-events | قي على الفعالية 5 أيام من الآن الاثنين, أكتوبر 19 2026, 16:30 1448-05-08 الذكاء الاصطناعي في التسويق وصناعة المحتوى عرض التفاص<br>ت ريادة الأعمال الفعالية انتهت الاثنين, أكتوبر 12 2026, 22:04 1448-05-01 دورة مقدمة وأساسيات ريادة الأعمال عرض التفاصيل المهار<br>أساسية للمبيعات الفعالية انتهت الاثنين, أكتوبر 12 2026, 16:30 1448-05-01 دورة المهارات الأساسية للمبيعات عرض التفاصيل ‹ 1 2 3 | إستعراض الفعاليات -> https://tc.qcc.org.sa/events<br>الذكاء الاصطناعي في التسويق وصناعة المحتوى -> https://tc.qcc.org.sa/events/216<br>عرض التفاصيل -> https://tc.qcc.org.sa/events/216<br>مقدمة وأساسيات ريادة الأعمال -> https://tc.qcc.org.sa/events/214 | - |
