# EventLive Browser Source Probe

Generated at: 2026-11-14T09:13:20.712Z

## Summary

- Sources probed this run: 3
- Fresh results available: 5
- Browser network API: 2
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 54 | sdaia-calendar-events | ok | 200 | browser-network-api | 2 | 20 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 67 | jazan-chamber-events | ok | 200 | browser-network-api | 1 | 0 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- sdaia-calendar-events: GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1794647603334 (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications)
- sdaia-calendar-events: GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=%2Fen%2Fmediacenter%2Fevents%2Fpages%2Fdefault.aspx&_=1794647603333 (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications)
- jazan-chamber-events: GET https://jazancci.org.sa/api/events/calendar/7/2026 (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| sdaia-calendar-events | - | AI Scholarship Program -> https://sdaia.gov.sa/en/Sectors/academy/Pages/ScholarshipProgram.aspx<br>Cooperative Training Program -> https://sdaia.gov.sa/en/Sectors/BuildingCapacity/Pages/CooperativeTraining.aspx<br>Free Software and Services -> https://sdaia.gov.sa/en/Services/Pages/FreeServicesAndPrograms.aspx<br>Calendar and Events -> https://sdaia.gov.sa/en/MediaCenter/Events/Pages/default.aspx | GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1… (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications): {"Message":{"Title":"/en/mediacenter/events/pages/default.aspx","PageId":"/en/mediacenter/events/pages/default.aspx","Y…<br>GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=%2Fen%2Fmediacenter%2Fevents%2Fpages%2Fdefaul… (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications): {"Message":{"Title":"/en/mediacenter/events/pages/default.aspx","PageId":"/en/mediacenter/events/pages/default.aspx","Y… |
| jazan-chamber-events | nshat-alsghyrh-walmtwsth-","createdAt":"2026-07-09T09:13:48.740Z","updatedAt":"2026-07-09T09:13:48.740Z","title":{"ar":"متطلبات نظ<br>مال.</p><h2>موعد الورشة:</h2><p><strong>21 يونيو 2025م</strong><br/><strong>10:30 صباحاً</strong><br/><strong>عن بُعد</strong></p><h2<br>amber</p></li></ul><p></p>"},"startAt":"2026-07-21T07:30:00.000Z","endAt":"2026-07-21T08:45:00.000Z","location":null,"url":"https: | - | GET https://jazancci.org.sa/api/events/calendar/7/2026 (200, json-like-invalid): [{"id":17,"slug":"mttlbat-nzam-idarh-almrafq-iso-41001-llmnshat-alsghyrh-walmtwsth-","createdAt":"2026-07-09T09:13:48.7… |
