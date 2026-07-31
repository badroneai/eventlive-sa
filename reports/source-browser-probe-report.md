# EventLive Browser Source Probe

Generated at: 2026-07-31T09:16:31.355Z

## Summary

- Sources probed this run: 0
- Fresh results available: 1
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 59 | asharqia-chamber-events | ok | 200 | browser-network-api | 3 | 20 | 1 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- asharqia-chamber-events: GET https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/_api/Microsoft.SharePoint.Portal.SuiteNavData.GetSuiteNavData?v=2&Locale=ar-SA (200, json-object:d)
- asharqia-chamber-events: GET https://api-cdn.mypurecloud.ie/webdeployments/v1/deployments/bf04c4ac-89eb-4d7b-9061-14343d788e27/config.json (200, json-object:id,version,headlessMode,languages,defaultLanguage,apiEndpoint,messenger,position)
- asharqia-chamber-events: GET https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/_api/SP.Web.GetContextWebThemeData?lcid=1025 (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| asharqia-chamber-events | 4 06:30 PM - 06:30 PM التفاصيل ملتقى الممارسات الوقفية2024م 24/11/2024 - 24/11/2024 09:00 AM - 09:00 AM التفاصيل "منتدى المر | تسجيل الدخول -> https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/_layouts/15/Authenticate.aspx?Source=%2Fsites%2FArabic%2FE…<br>المناسبات -> https://www.chamber.org.sa/sites/Arabic/Events/Pages/Home.aspx<br>ارشيف المناسبات -> https://www.chamber.org.sa/sites/Arabic/Events/EventArchive/Pages/Home.aspx<br>المناسبات -> https://www.chamber.org.sa/sites/Arabic/Events/Pages/Home.aspx | GET https://www.chamber.org.sa/sites/Arabic/Events/ChamberEvents/_api/Microsoft.SharePoint.Portal.SuiteNavData.Ge… (200, json-object:d): {"d":{"GetSuiteNavData":"{\"CssUrl\":\"\\/_layouts\\/15\\/1025\\/styles\\/SuiteNav.css?rev=xIL7dTuBXVfEY6%2FjttQ%2BNA%3…<br>GET https://api-cdn.mypurecloud.ie/webdeployments/v1/deployments/bf04c4ac-89eb-4d7b-9061-14343d788e27/config.json (200, json-object:id,version,headlessMode,languages,defaultLanguage,apiEndpoint,messenger,position): {"id":"35941ef8-d3b4-4cac-b011-f0e5bf3d7569","version":"4","headlessMode":{"enabled":false},"languages":["ar"],"default… |
