# EventLive Browser Source Probe

Generated at: 2026-08-07T07:47:21.041Z

## Summary

- Sources probed this run: 1
- Fresh results available: 4
- Browser network API: 0
- Hydration payload: 0
- Rendered HTML candidates: 2
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 9 | monshaat-events | error | 0 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 32 | saudi-space-agency-events | ok | 405 | empty-or-shell | 0 | 0 | 0 | اعتبرها shell وابحث عن API أو مسار بديل قبل أي collector. |
| 51 | riyadh-city-events | ok | 200 | rendered-html-candidates | 0 | 3 | 0 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |
| 60 | qassim-chamber-events | ok | 200 | rendered-html-candidates | 0 | 19 | 3 | اكتب extractor مرن من DOM بعد الرندر أو حسن selector الحالي. |

## Endpoint Candidates

- No endpoint candidates captured.

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| riyadh-city-events | - | https://riyadh.sa/en/events/all -> https://riyadh.sa/en/events/all<br>All Events -> https://riyadh.sa/en/events/all<br>events.title -> https://riyadh.sa/en/events | - |
| qassim-chamber-events | الإدارة الرشيقة الفعالية انتهت الاثنين, يوليو 20 2026, 16:00 1448-02-06 أساسيات القيادة الرشيقة عرض التفاصيل عمليات إدارة الم<br>وارد البشرية الفعالية انتهت الاثنين, يوليو 6 2026, 16:30 1448-01-21 عمليات إدارة الموارد البشرية عرض التفاصيل أساسيات إدار<br>لمنشآت والشركات الفعالية انتهت الاثنين, يونيو 22 2026, 16:30 1448-01-07 أساسيات إدارة التأمين في المنشآت والشركات عرض التفاصي | إستعراض الفعاليات -> https://tc.qcc.org.sa/events<br>أساسيات الإدارة الرشيقة -> https://tc.qcc.org.sa/events/205<br>عرض التفاصيل -> https://tc.qcc.org.sa/events/205<br>عمليات إدارة الموارد البشرية -> https://tc.qcc.org.sa/events/204 | - |
