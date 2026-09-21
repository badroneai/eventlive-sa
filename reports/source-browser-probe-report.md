# EventLive Browser Source Probe

Generated at: 2026-09-21T08:16:12.423Z

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
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 17 | future-skills-catalog | ok | 200 | rendered-html-candidates | 0 | 20 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 32 | saudi-space-agency-events | ok | 405 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 54 | sdaia-calendar-events | ok | 200 | browser-network-api | 1 | 15 | 0 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- sdaia-calendar-events: GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1789978609386 (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| future-skills-catalog | - | تجاوز إلى المحتوى الرئيسي -> https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>English -> https://futureskills.mcit.gov.sa/en/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>الفعاليات -> https://www.mcit.gov.sa/ar/events<br>البرنامج المتخصص في العمل الحر -> http://futureskills.mcit.gov.sa/ar/node/20481 | - |
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
| sdaia-calendar-events | - | AI Scholarship Program -> https://sdaia.gov.sa/en/Sectors/academy/Pages/ScholarshipProgram.aspx<br>Cooperative Training Program -> https://sdaia.gov.sa/en/Sectors/BuildingCapacity/Pages/CooperativeTraining.aspx<br>Free Software and Services -> https://sdaia.gov.sa/en/Services/Pages/FreeServicesAndPrograms.aspx<br>Calendar and Events -> https://sdaia.gov.sa/en/MediaCenter/Events/Pages/default.aspx | GET https://sdaia.gov.sa/sdaiaapi/api/feedback/getbypageurl?pageURL=/en/mediacenter/events/pages/default.aspx&_=1… (200, json-object:Message,Status,ErrorCode,ErrorMessage,Notifications): {"Message":{"Title":"/en/mediacenter/events/pages/default.aspx","PageId":"/en/mediacenter/events/pages/default.aspx","Y… |
