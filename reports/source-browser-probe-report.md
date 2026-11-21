# EventLive Browser Source Probe

Generated at: 2026-11-21T10:05:45.442Z

## Summary

- Sources probed this run: 8
- Fresh results available: 8
- Browser network API: 3
- Hydration payload: 0
- Rendered HTML candidates: 1
- Blocked/protected: 1
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 8 | mdlbeast-events | ok | 200 | browser-network-api | 1 | 20 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 10 | invest-saudi-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 17 | future-skills-catalog | ok | 200 | rendered-html-candidates | 0 | 20 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 21 | misk-hub-programs | ok | 403 | blocked-or-protected | 0 | 0 | 0 | لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي. |
| 32 | saudi-space-agency-events | ok | 405 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 54 | sdaia-calendar-events | ok | 200 | browser-network-api | 2 | 18 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |
| 67 | jazan-chamber-events | ok | 200 | browser-network-api | 1 | 0 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- mdlbeast-events: GET https://mdlbeast.com/_next/data/ycKB_Sc9NSk1FbXfdDlDW/en/events/calendar.json (200, json-like-invalid)
- sdaia-calendar-events: GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1795255591814 (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications)
- sdaia-calendar-events: GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=%2Fen%2Fmediacenter%2Fevents%2Fpages%2Fdefault.aspx&_=1795255591813 (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications)
- jazan-chamber-events: GET https://jazancci.org.sa/api/events/calendar/7/2026 (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| mdlbeast-events | NOV UNSTABLE In Riyadh PAST EVENTS FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh THU 05 FEB 2026 - FRI 06 FEB<br>2026 BALAD BEAST 2026 In Jeddah THU 11 DEC 2025 - SAT 13 DEC 2025 SOUNDSTORM 25 In Riyadh THU 04 DEC 2025 - SAT 06 DEC 2025 XP<br>MUSIC FUTURES 2025 In Riyadh THU 25 SEP 2025 - FRI 26 SEP 2025 AZIMUTH 2025 In Alula THU 25 SEP 2025 - FRI 26 SEP 2025 BALAD | EXPLORE FULL CALENDAR -> https://mdlbeast.com/events/calendar<br>THU 26 NOV BEAST HOUSE In Riyadh -> https://mdlbeast.com/events/beast-house<br>FRI 27 NOV - SAT 28 NOV UNSTABLE In Riyadh -> https://mdlbeast.com/events/unstable<br>FRI 04 SEP 2026 - SAT 05 SEP 2026 MDLBEAST RADIO MIXTAPE In Riyadh -> https://mdlbeast.com/events/mdlbeast-radio-mixtape | GET https://mdlbeast.com/_next/data/ycKB_Sc9NSk1FbXfdDlDW/en/events/calendar.json (200, json-like-invalid): {"pageProps":{"events":[{"title":"Beast House","slug":"beast-house","id":"LrwF27BJQwSahu3U7WDIkQ","startDatetime":"2026… |
| future-skills-catalog | - | تجاوز إلى المحتوى الرئيسي -> https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>English -> https://futureskills.mcit.gov.sa/en/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>الفعاليات -> https://www.mcit.gov.sa/ar/events<br>البرنامج المتخصص في العمل الحر -> http://futureskills.mcit.gov.sa/ar/node/20481 | - |
| sdaia-calendar-events | - | AI Scholarship Program -> https://sdaia.gov.sa/en/Sectors/academy/Pages/ScholarshipProgram.aspx<br>Cooperative Training Program -> https://sdaia.gov.sa/en/Sectors/BuildingCapacity/Pages/CooperativeTraining.aspx<br>Free Software and Services -> https://sdaia.gov.sa/en/Services/Pages/FreeServicesAndPrograms.aspx<br>Calendar and Events -> https://sdaia.gov.sa/en/MediaCenter/Events/Pages/default.aspx | GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1… (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications): {"Message":{"Title":"/en/mediacenter/events/pages/default.aspx","PageId":"/en/mediacenter/events/pages/default.aspx","Y…<br>GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=%2Fen%2Fmediacenter%2Fevents%2Fpages%2Fdefaul… (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications): {"Message":{"Title":"/en/mediacenter/events/pages/default.aspx","PageId":"/en/mediacenter/events/pages/default.aspx","Y… |
| jazan-chamber-events | nshat-alsghyrh-walmtwsth-","createdAt":"2026-07-09T09:13:48.740Z","updatedAt":"2026-07-09T09:13:48.740Z","title":{"ar":"متطلبات نظ<br>مال.</p><h2>موعد الورشة:</h2><p><strong>21 يونيو 2025م</strong><br/><strong>10:30 صباحاً</strong><br/><strong>عن بُعد</strong></p><h2<br>amber</p></li></ul><p></p>"},"startAt":"2026-07-21T07:30:00.000Z","endAt":"2026-07-21T08:45:00.000Z","location":null,"url":"https: | - | GET https://jazancci.org.sa/api/events/calendar/7/2026 (200, json-like-invalid): [{"id":17,"slug":"mttlbat-nzam-idarh-almrafq-iso-41001-llmnshat-alsghyrh-walmtwsth-","createdAt":"2026-07-09T09:13:48.7… |
