# EventLive Browser Source Probe

Generated at: 2026-07-16T03:36:12.611Z

## Summary

- Sources probed this run: 1
- Fresh results available: 1
- Browser network API: 1
- Hydration payload: 0
- Rendered HTML candidates: 0
- Blocked/protected: 0
- Policy skipped: 0

## Sources

| Priority | Source | Status | HTTP | Classification | Endpoints | Event links | Date snippets | Next action |
|---:|---|---|---:|---|---:|---:|---:|---|
| 19 | visit-saudi-seasons | ok | 200 | browser-network-api | 1 | 0 | 8 | ثبت endpoint مرشحًا كجامع مباشر، ثم اكتب extractor من JSON مع اختبار انحدار. |

## Endpoint Candidates

- visit-saudi-seasons: GET https://www.visitsaudi.com/bin/api/v3/events?locale=en (200, json-like-invalid)

## Actionable Samples

| Source | Date snippets | Event-like links | Endpoint previews |
|---|---|---|---|
| visit-saudi-seasons | .635549","lng":"46.671958","startDate":"2025-11-05T00:00:00.000+00:00","endDate":"2026-07-19T00:00:00.000+00:00","seasonId":"riyad<br>/zones/the-groves-rs25","lastModified":"2026-03-10T09:26:55.854+00:00","createdDate":"2024-11-05T09:53:22.991+00:00","timings":[{"<br>","lng":"46.6722134822565","startDate":"2026-01-01T00:00:00.000+00:00","endDate":"2026-12-31T00:00:00.000+00:00","cityId":"riyadh" | - | GET https://www.visitsaudi.com/bin/api/v3/events?locale=en (200, json-like-invalid): {"code":200,"message":"success","response":{"data":[{"type":"EVENT","title":"The Groves","subtitle":"A World That Evolv… |
