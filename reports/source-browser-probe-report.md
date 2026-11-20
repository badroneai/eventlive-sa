# EventLive Browser Source Probe

Generated at: 2026-11-20T10:08:06.106Z

## Summary

- Sources probed this run: 4
- Fresh results available: 6
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 1
- Blocked/protected: 1
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 17 | future-skills-catalog | ok | 200 | rendered-html-candidates | 0 | 20 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 21 | misk-hub-programs | ok | 403 | blocked-or-protected | 0 | 0 | 0 | لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي. |
| 51 | riyadh-city-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 56 | scega-exhibitions-conferences | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 59 | asharqia-chamber-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 67 | jazan-chamber-events | ok | 200 | browser-network-api | 1 | 0 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- jazan-chamber-events: GET https://jazancci.org.sa/api/events/calendar/7/2026 (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| future-skills-catalog | - | تجاوز إلى المحتوى الرئيسي -> https://futureskills.mcit.gov.sa/ar/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>English -> https://futureskills.mcit.gov.sa/en/catalogue/all?label=&field_main_tracks_target_id_verf=565&field_sub_tracks_target_i…<br>الفعاليات -> https://www.mcit.gov.sa/ar/events<br>البرنامج المتخصص في العمل الحر -> http://futureskills.mcit.gov.sa/ar/node/20481 | - |
| jazan-chamber-events | nshat-alsghyrh-walmtwsth-","createdAt":"2026-07-09T09:13:48.740Z","updatedAt":"2026-07-09T09:13:48.740Z","title":{"ar":"متطلبات نظ<br>مال.</p><h2>موعد الورشة:</h2><p><strong>21 يونيو 2025م</strong><br/><strong>10:30 صباحاً</strong><br/><strong>عن بُعد</strong></p><h2<br>amber</p></li></ul><p></p>"},"startAt":"2026-07-21T07:30:00.000Z","endAt":"2026-07-21T08:45:00.000Z","location":null,"url":"https: | - | GET https://jazancci.org.sa/api/events/calendar/7/2026 (200, json-like-invalid): [{"id":17,"slug":"mttlbat-nzam-idarh-almrafq-iso-41001-llmnshat-alsghyrh-walmtwsth-","createdAt":"2026-07-09T09:13:48.7… |
