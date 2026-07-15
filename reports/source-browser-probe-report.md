# EventLive Browser Source Probe

Generated at: 2026-07-15T14:17:02.905Z

## Summary

- Sources probed this run: 0
- Fresh results available: 2
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 1
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 25 | sdaia-academy-programs | ok | 200 | browser-network-api | 5 | 19 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |

## Endpoint Candidates

- sdaia-academy-programs: GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/sectors/academy/bootcamps/pages/default.aspx&_=1784086378570 (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications)
- sdaia-academy-programs: POST https://prod17-live-chat.sprinklr.com/api/livechat/handshake/appHandshake (200, json-like-invalid)
- sdaia-academy-programs: POST https://prod17-live-chat.sprinklr.com/api/livechat/handshake/application/6858005e3884612a4b9d8765_app_17005144 (200, json-like-invalid)
- sdaia-academy-programs: POST https://prod17-live-chat.sprinklr.com/api/livechat/prompt/browse/event (200, empty)
- sdaia-academy-programs: POST https://prod17-live-chat.sprinklr.com/api/livechat/event/fetch-notifications?cursor=A_6a56ff730000000000000000 (200, json-object:results,hasMore,totalCount,beforeCursor,afterCursor,details)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| sdaia-academy-programs | - | AI Scholarship Program -> https://sdaia.gov.sa/en/Sectors/academy/Pages/ScholarshipProgram.aspx<br>Cooperative Training Program -> https://sdaia.gov.sa/en/Sectors/BuildingCapacity/Pages/CooperativeTraining.aspx<br>Free Software and Services -> https://sdaia.gov.sa/en/Services/Pages/FreeServicesAndPrograms.aspx<br>Calendar and Events -> https://sdaia.gov.sa/en/MediaCenter/Events/Pages/default.aspx | GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/sectors/academy/bootcamps/pages/default.a… (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications): {"Message":{"Title":"/en/sectors/academy/bootcamps/pages/default.aspx","PageId":"/en/sectors/academy/bootcamps/pages/de…<br>POST https://prod17-live-chat.sprinklr.com/api/livechat/handshake/appHandshake (200, json-like-invalid): {"chatSessionToken":"eyJhbGciOiJSUzI1NiJ9.eyJ2aXNpdFNlc3Npb25JZCI6IjZhNTZmZjczMWM2MDMwODg1ZjRiNWM3NyIsInN1YiI6IkFjY2Vzc… |
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
