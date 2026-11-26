# EventLive Browser Source Probe

Generated at: 2026-11-26T11:00:21.720Z

## Summary

- Sources probed this run: 3
- Fresh results available: 8
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 1
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 3 | moc-cultural-calendar | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 4 | mos-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 21 | misk-hub-programs | ok | 403 | blocked-or-protected | 0 | 0 | 0 | لا تلتف على الحماية؛ صنف المصدر partnership/API أو ابحث عن مسار رسمي. |
| 30 | saudi-pro-league-fixtures | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 37 | moc-cultural-subportals | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-text-review | 0 | 0 | 0 | راجع الصفحة يدويًا وحدد هل هي مصدر أدلة أم صفحة تعريفية فقط. |
| 67 | jazan-chamber-events | ok | 200 | browser-network-api | 1 | 0 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- jazan-chamber-events: GET https://jazancci.org.sa/api/events/calendar/7/2026 (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| jazan-chamber-events | nshat-alsghyrh-walmtwsth-","createdAt":"2026-07-09T09:13:48.740Z","updatedAt":"2026-07-09T09:13:48.740Z","title":{"ar":"متطلبات نظ<br>مال.</p><h2>موعد الورشة:</h2><p><strong>21 يونيو 2025م</strong><br/><strong>10:30 صباحاً</strong><br/><strong>عن بُعد</strong></p><h2<br>amber</p></li></ul><p></p>"},"startAt":"2026-07-21T07:30:00.000Z","endAt":"2026-07-21T08:45:00.000Z","location":null,"url":"https: | - | GET https://jazancci.org.sa/api/events/calendar/7/2026 (200, json-like-invalid): [{"id":17,"slug":"mttlbat-nzam-idarh-almrafq-iso-41001-llmnshat-alsghyrh-walmtwsth-","createdAt":"2026-07-09T09:13:48.7… |
