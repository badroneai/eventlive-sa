# EventLive Browser Source Probe

Generated at: 2026-10-04T08:44:11.871Z

## Summary

- Sources probed this run: 3
- Fresh results available: 3
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 2
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 8 | mdlbeast-events | ok | 200 | browser-network-api | 7 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 17 | future-skills-catalog | ok | 200 | rendered-html-candidates | 0 | 20 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |

## Endpoint Candidates

- mdlbeast-events: GET https://mdlbeast.com/_next/data/m0RVCB6Xmjfj78jX68_TJ/en/events/calendar.json (200, json-like-invalid)
- mdlbeast-events: GET https://mc.yango.com/watch/3/1?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&page-ref&charset=utf-8&browser-info=pv%3A1%3Avf%3A37xk0fgslry1wqf7aktfs70g0rmlch%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2660%3Acn%3A2%3Adp%3A0%3Als%3A1504282654565%3Ahid%3A361739810%3Az%3A0%3Ai%3A20261004084414%3Aet%3A1791103454%3Ac%3A1%3Arn%3A66719695%3Arqn%3A1%3Au%3A1791103454910481117%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A316%3Ast%3A1791103454&t=clc%280-0-0%29rqnt%281%29ti%281%29&redirnss=1 (200, json-object:settings,userData)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&currencyCode=SAR&ts=1791103453596&eventSource=amzn.js&uuid=80ab631b-0beb-488c-912a-c48778032ec0 (200, json-object:)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&currencyCode=SAR&ts=1791103453596&eventSource=amzn.js&uuid=d0775243-076f-438d-b49d-a8b5e3804e87 (200, json-object:)
- mdlbeast-events: POST https://sdk-03.moengage.com/v2/device/add?os=web&os_platform=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F126.0.0.0%20Safari%2F537.36&is_incognito=false&app_id=3WOD3GUG7RZZTC54VS32NHA9&os_ver=macOS%2010_15_7&sdk_ver=2.80.00&model=Google%20Chrome&app_ver=1.0&device_ts=1791103454870&device_tz_offset=0&unique_id=68bfaf2e-c255-477f-b6ea-efbabe346378&device_tz=0&device_unique_id=7badfaaa-32a4-418e-adbf-77a2f58ca6af&subscription_type=vapid&vapid_public=BIMX6knQZH09MR1LpNsQphAFim64pGleF3612U1Kw5umn36SvUZS3hQ8zhjFYKzpsTMxTUhR7KLbZBoPjfPe7Z8&environment=sdk-03.moengage.com&url=https%3A%2F%2Fmdlbeast.com%2Fevents (200, json-object:status,message)
- mdlbeast-events: POST https://api2.amplitude.com/2/httpapi (200, json-object:code,server_upload_time,payload_size_bytes,events_ingested)
- mdlbeast-events: GET https://mc.yango.com/watch/100422118?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&charset=utf-8&uah=chu%0A%22HeadlessChrome%22%3Bv%3D%22149%22%2C%22Chromium%22%3Bv%3D%22149%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224%22%0Acha%0Ax86%0Achb%0A64%0Achf%0A149.0.7827.55%0Achl%0A%22HeadlessChrome%22%3Bv%3D%22149.0.7827.55%22%2C%22Chromium%22%3Bv%3D%22149.0.7827.55%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224.0.0.0%22%0Achm%0A%3F0%0Achp%0AmacOS%0Achv%0A10_15_7&browser-info=pv%3A1%3Avf%3A37xk0fgslry1wqf7aktfs70g0rmlch%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2660%3Acn%3A1%3Adp%3A0%3Als%3A415587123181%3Ahid%3A361739810%3Az%3A0%3Ai%3A20261004084414%3Aet%3A1791103454%3Ac%3A1%3Arn%3A257055714%3Arqn%3A1%3Au%3A1791103454910481117%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A316%3Arqnl%3A1%3Ast%3A1791103456%3At%3AMDLBEAST%20Events%20Calendar%20-%20Discover%20Now%20%7C%20MDLBEAST&t=clt(834)clc(0-0-0)rqnt(1)ti(1) (200, json-object:settings,userData)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| mdlbeast-events | OCT UNSTABLE In Riyadh PAST EVENTS FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh THU 05 FEB 2026 - FRI 06 FEB<br>2026 BALAD BEAST 2026 In Jeddah THU 11 DEC 2025 - SAT 13 DEC 2025 SOUNDSTORM 25 In Riyadh THU 04 DEC 2025 - SAT 06 DEC 2025 XP<br>MUSIC FUTURES 2025 In Riyadh THU 25 SEP 2025 - FRI 26 SEP 2025 AZIMUTH 2025 In Alula THU 25 SEP 2025 - FRI 26 SEP 2025 BALAD | EXPLORE FULL CALENDAR -> https://mdlbeast.com/events/calendar<br>THU 08 OCT BEAST HOUSE In Riyadh -> https://mdlbeast.com/events/beast-house<br>FRI 23 OCT - SAT 24 OCT UNSTABLE In Riyadh -> https://mdlbeast.com/events/unstable<br>FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh -> https://mdlbeast.com/events/mdlbeast-radio-mixtape | GET https://mdlbeast.com/_next/data/m0RVCB6Xmjfj78jX68_TJ/en/events/calendar.json (200, json-like-invalid): {"pageProps":{"events":[{"title":"Beast House","slug":"beast-house","id":"LrwF27BJQwSahu3U7WDIkQ","startDatetime":"2026…<br>GET https://mc.yango.com/watch/3/1?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&page-ref&charset=utf-8&br… (200, json-object:settings,userData): {"settings":{"sbp": {"a":"S+orXYnDaU1WefAt64W7SgKjacX3CfnUQ6bzrG5hMNin8eduuvzTyonBjBW22ysD", "b":"RR/wcodVvV0Xjv4ggZh3G… |
| future-skills-catalog | - | تجاوز إلى المحتوى الرئيسي -> https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>English -> https://futureskills.mcit.gov.sa/en/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>الفعاليات -> https://www.mcit.gov.sa/ar/events<br>البرنامج المتخصص في العمل الحر -> http://futureskills.mcit.gov.sa/ar/node/20481 | - |
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
