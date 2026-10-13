# EventLive Browser Source Probe

Generated at: 2026-10-13T09:44:33.215Z

## Summary

- Sources probed this run: 8
- Fresh results available: 10
- Browser network API: 2
- Hydration payload: 0
- Rendered HTML candidates: 1
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 8 | mdlbeast-events | ok | 200 | browser-network-api | 6 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 9 | monshaat-events | ok | 200 | browser-network-api | 2 | 18 | 1 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 12 | eye-of-riyadh-events | ok | 200 | rendered-html-candidates | 0 | 20 | 8 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 14 | eventbrite-saudi | ok | 405 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 16 | tuwaiq-academy-bootcamps | ok | 200 | browser-structured-html | 0 | 0 | 8 | اكتب extractor من JSON-LD أو structured scripts مع fallback للبطاقات. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 59 | asharqia-chamber-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |

## Endpoint Candidates

- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&currencyCode=SAR&ts=1791884990833&eventSource=amzn.js&uuid=f19968ee-6f77-4bb4-8d9e-83cfec63948f (200, json-object:)
- mdlbeast-events: GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&currencyCode=SAR&ts=1791884990833&eventSource=amzn.js&uuid=7d08d95f-834b-421c-8d2a-ef86f2acfb74 (200, json-object:)
- mdlbeast-events: POST https://sdk-03.moengage.com/v2/device/add?os=web&os_platform=Mozilla%2F5.0%20(Macintosh%3B%20Intel%20Mac%20OS%20X%2010_15_7)%20AppleWebKit%2F537.36%20(KHTML%2C%20like%20Gecko)%20Chrome%2F126.0.0.0%20Safari%2F537.36&is_incognito=false&app_id=3WOD3GUG7RZZTC54VS32NHA9&os_ver=macOS%2010_15_7&sdk_ver=2.81.01&model=Google%20Chrome&app_ver=1.0&device_ts=1791884991431&device_tz_offset=0&unique_id=4ed5f039-18a5-4cbf-b91f-4807d2b43560&device_tz=0&device_unique_id=108f16fe-ab95-4602-8d56-18e1e5cf8dac&subscription_type=vapid&vapid_public=BIMX6knQZH09MR1LpNsQphAFim64pGleF3612U1Kw5umn36SvUZS3hQ8zhjFYKzpsTMxTUhR7KLbZBoPjfPe7Z8&environment=sdk-03.moengage.com&url=https%3A%2F%2Fmdlbeast.com%2Fevents (200, json-object:status,message)
- mdlbeast-events: GET https://mc.yango.com/watch/3/1?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&page-ref&charset=utf-8&browser-info=pv%3A1%3Avf%3A35kef4arqp485yiojzg8cw0ppzbwk1%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2661%3Acn%3A2%3Adp%3A0%3Als%3A189861021716%3Ahid%3A352420166%3Az%3A0%3Ai%3A20261013094951%3Aet%3A1791884992%3Ac%3A1%3Arn%3A301242647%3Arqn%3A1%3Au%3A1791884992647338598%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A464%3Ast%3A1791884992&t=clc%280-0-0%29rqnt%281%29ti%281%29&redirnss=1 (200, json-object:settings,userData)
- mdlbeast-events: POST https://api2.amplitude.com/2/httpapi (200, json-object:code,server_upload_time,payload_size_bytes,events_ingested)
- mdlbeast-events: GET https://mc.yango.com/watch/100422118?wmode=7&page-url=https%3A%2F%2Fmdlbeast.com%2Fevents&charset=utf-8&uah=chu%0A%22HeadlessChrome%22%3Bv%3D%22149%22%2C%22Chromium%22%3Bv%3D%22149%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224%22%0Acha%0Ax86%0Achb%0A64%0Achf%0A149.0.7827.55%0Achl%0A%22HeadlessChrome%22%3Bv%3D%22149.0.7827.55%22%2C%22Chromium%22%3Bv%3D%22149.0.7827.55%22%2C%22Not)A%3BBrand%22%3Bv%3D%2224.0.0.0%22%0Achm%0A%3F0%0Achp%0AmacOS%0Achv%0A10_15_7&browser-info=pv%3A1%3Avf%3A35kef4arqp485yiojzg8cw0ppzbwk1%3Afu%3A0%3Aen%3Autf-8%3Ala%3Aen-US%3Av%3A2661%3Acn%3A1%3Adp%3A0%3Als%3A1003774187534%3Ahid%3A352420166%3Az%3A0%3Ai%3A20261013094951%3Aet%3A1791884992%3Ac%3A1%3Arn%3A161687471%3Arqn%3A1%3Au%3A1791884992647338598%3Aw%3A1280x720%3As%3A1280x720x24%3Ask%3A1%3Afp%3A464%3Arqnl%3A1%3Ast%3A1791884993%3At%3AMDLBEAST%20Events%20Calendar%20-%20Discover%20Now%20%7C%20MDLBEAST&t=clt(977)clc(0-0-0)rqnt(1)ti(1) (200, json-object:settings,userData)
- monshaat-events: GET https://www.monshaat.gov.sa/internal/content/events/list/202610 (301, empty)
- monshaat-events: GET https://www.monshaat.gov.sa/ar/internal/content/events/list/202610 (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| mdlbeast-events | e, discover, and dance. PAST EVENTS THU 08 OCT 2026 BEAST HOUSE In Riyadh THU 08 OCT 2026 - FRI 09 OCT 2026 UNSTABLE In Riyadh FRI<br>04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh THU 05 FEB 2026 - FRI 06 FEB 2026 BALAD BEAST<br>2026 In Jeddah THU 11 DEC 2025 - SAT 13 DEC 2025 SOUNDSTORM 25 In Riyadh THU 04 DEC 2025 - SAT 06 DEC 2025 XP MUSIC FUTURES 2025 | THU 08 OCT 2026 BEAST HOUSE In Riyadh -> https://mdlbeast.com/events/beast-house<br>THU 08 OCT 2026 - FRI 09 OCT 2026 UNSTABLE In Riyadh -> https://mdlbeast.com/events/unstable<br>FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh -> https://mdlbeast.com/events/mdlbeast-radio-mixtape<br>THU 05 FEB 2026 - FRI 06 FEB 2026 BALAD BEAST 2026 In Jeddah -> https://mdlbeast.com/events/balad-beast-2026 | GET https://ara.paa-reporting-advertising.amazon/aat?pid=ee49cad3-31b1-422d-ae49-b96ef7139d3f&event=PageView&curr… (200, json-object:): {}<br>GET https://ara.paa-reporting-advertising.amazon/aat?pid=03be6e9f-5eab-4882-89fd-5120fc72e9bc&event=PageView&curr… (200, json-object:): {} |
| monshaat-events | om 45 participants. latest changed date 20 February 2023 Comments 1 Add comment نشكر لكم وضوح المعلومات والاجراءت 21 February 2023 Pagin | Skip to main content -> https://www.monshaat.gov.sa/en/events-list#main-content<br>News and Events -> https://www.monshaat.gov.sa/eparticipation/almrkz-alalamy<br>Support Programs and Services Guide -> https://www.monshaat.gov.sa/en/catalyst-listing<br>عربي -> https://www.monshaat.gov.sa/ar/events-list | GET https://www.monshaat.gov.sa/internal/content/events/list/202610 (301, empty): empty<br>GET https://www.monshaat.gov.sa/ar/internal/content/events/list/202610 (200, json-like-invalid): [{"title":"\u0644\u0642\u0627\u0621\u0627\u062a \u0634\u0647\u0631 \u0623\u0643\u062a\u0648\u0628\u0631 (\u0627\u0644\u… |
| eye-of-riyadh-events | 1 Jumada I 1448 - 13 October 2026 Sign In/Sign Up Advertise with us Sign-up for newsletter HOME NEWS EVENTS BUSIN<br>hatsApp X LinkedIn Facebook Email Share 25 - 27 Jan, 2027 Real Estate Future Forum Four Seasons Hotel , Riyadh / Forum The Real Est<br>zes Saudi Arabia’s most... More Details 25 - 26 Oct, 2026 Global Proptech Summit 2026 Mandarin Oriental Al Faisaliah , Riyadh / Sum | EVENTS -> https://www.eyeofriyadh.com/events/<br>عربي -> https://www.eyeofriyadh.com/ar/events/<br>Award -> https://www.eyeofriyadh.com/events/?fcat=15<br>Ceremony -> https://www.eyeofriyadh.com/events/?fcat=21 | - |
| tuwaiq-academy-bootcamps | وير حلول الذكاء الاصطناعي","startDate":"2026-10-25T10:00:00+03:00","endDate":"2027-01-14T15:00:00+03:00","autoCloseRegistration":f<br>nStartDate":null,"registrationEndDate":"2026-10-04T12:00:00+03:00","requireProfileCompletion":true,"isMergePublish":true,"isPaid":<br>يات فن تصميم الشخصيات 3D ","startDate":"2026-11-01T16:00:00+03:00","endDate":"2027-01-21T20:00:00+03:00","autoCloseRegistration":f | - | - |
