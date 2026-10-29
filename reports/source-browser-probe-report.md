# EventLive Browser Source Probe

Generated at: 2026-10-29T08:37:21.086Z

## Summary

- Sources probed this run: 3
- Fresh results available: 4
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 34 | visit-saudi-calendar-pdf | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 54 | sdaia-calendar-events | ok | 200 | browser-network-api | 1 | 20 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 59 | asharqia-chamber-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |

## Endpoint Candidates

- sdaia-calendar-events: GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1793263053475 (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| sdaia-calendar-events | - | AI Scholarship Program -> https://sdaia.gov.sa/en/Sectors/academy/Pages/ScholarshipProgram.aspx<br>Cooperative Training Program -> https://sdaia.gov.sa/en/Sectors/BuildingCapacity/Pages/CooperativeTraining.aspx<br>Free Software and Services -> https://sdaia.gov.sa/en/Services/Pages/FreeServicesAndPrograms.aspx<br>Calendar and Events -> https://sdaia.gov.sa/en/MediaCenter/Events/Pages/default.aspx | GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1… (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications): {"Message":{"Title":"/en/mediacenter/events/pages/default.aspx","PageId":"/en/mediacenter/events/pages/default.aspx","Y… |
