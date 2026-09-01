# EventLive Browser Source Probe

Generated at: 2026-09-01T21:19:48.581Z

## Summary

- Sources probed this run: 2
- Fresh results available: 2
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 1
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 59 | asharqia-chamber-events | ok | 200 | browser-network-api | 3 | 20 | 1 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 60 | qassim-chamber-events | ok | 200 | rendered-html-candidates | 0 | 19 | 3 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |

## Endpoint Candidates

- asharqia-chamber-events: GET https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/_api/Microsoft.SharePoint.Portal.SuiteNavData.GetSuiteNavData?v=2&Locale=ar-SA (200, json-object:d)
- asharqia-chamber-events: GET https://api-cdn.mypurecloud.ie/webdeployments/v1/deployments/bf04c4ac-89eb-4d7b-9061-14343d788e27/config.json (200, json-object:id,version,headlessMode,languages,defaultLanguage,apiEndpoint,messenger,position)
- asharqia-chamber-events: GET https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/_api/SP.Web.GetContextWebThemeData?lcid=1025 (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| asharqia-chamber-events | 4 06:30 PM - 06:30 PM التفاصيل ملتقى الممارسات الوقفية2024م 24/11/2024 - 24/11/2024 09:00 AM - 09:00 AM التفاصيل "منتدى المر | تسجيل الدخول -> https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/_layouts/15/Authenticate.aspx?Source=%2Fsites%2FArabic%2FE…<br>المناسبات -> https://www.chamber.org.sa/sites/Arabic/Events/Pages/Home.aspx<br>ارشيف المناسبات -> https://www.chamber.org.sa/sites/Arabic/Events/EventArchive/Pages/Home.aspx<br>المناسبات -> https://www.chamber.org.sa/sites/Arabic/Events/Pages/Home.aspx | GET https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/_api/Microsoft.SharePoint.Portal.SuiteNavData.Ge… (200, json-object:d): {"d":{"GetSuiteNavData":"{\"CssUrl\":\"\\/_layouts\\/15\\/1025\\/styles\\/SuiteNav.css?rev=xIL7dTuBXVfEY6%2FjttQ%2BNA%3…<br>GET https://api-cdn.mypurecloud.ie/webdeployments/v1/deployments/bf04c4ac-89eb-4d7b-9061-14343d788e27/config.json (200, json-object:id,version,headlessMode,languages,defaultLanguage,apiEndpoint,messenger,position): {"id":"35941ef8-d3b4-4cac-b011-f0e5bf3d7569","version":"4","headlessMode":{"enabled":false},"languages":["ar"],"default… |
| qassim-chamber-events | قي على الفعالية 5 أيام من الآن الاثنين, سبتمبر 7 2026, 16:30 1448-03-25 الحوكمة والمخاطر والامتثال عرض التفاصيل تحليل الأعمال<br>الإدارية الفعالية انتهت الاثنين, أغسطس 31 2026, 16:30 1448-03-18 تحليل الأعمال الإدارية عرض التفاصيل أساسيات الإدارة ا<br>لرشيقة الفعالية انتهت الاثنين, يوليو 20 2026, 16:00 1448-02-06 أساسيات القيادة الرشيقة عرض التفاصيل ‹ 1 2 3 4 5 6 7 | إستعراض الفعاليات -> https://tc.qcc.org.sa/events<br>الحوكمة والمخاطر والامتثال -> https://tc.qcc.org.sa/events/207<br>عرض التفاصيل -> https://tc.qcc.org.sa/events/207<br>تحليل الأعمال الإدارية -> https://tc.qcc.org.sa/events/206 | - |
