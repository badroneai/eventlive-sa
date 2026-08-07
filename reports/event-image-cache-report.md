# EventLive Event Image Cache Report

- generated_at: 2026-08-07T14:10:24.327Z
- events_file: dist/events.json
- manifest: data/event_image_cache_manifest.json
- image_dir: dist/assets/event-images
- targets: 500
- cached_total: 792
- fetched: 0
- reused: 496
- rejected_removed: 0
- missing_removed: 0
- failed: 4
- skipped_recent_failures: 1
- remembered_failures: 7
- requires_rebuild: true
- rebuild_reasons: new-failures:3
- concurrency: 8

## Failed

- https://ssa.gov.sa/media/3j2f0xpa/sdc2028.webp?width=1400&height=788&rnd=134303158965830000 — fetch-failed — AggregateError — retry after 2026-08-07T14:59:16.188Z
- https://cdn.rfecc.sa/wp-content/uploads/mec/qr_898ea2449274454e42895b52b18c6f68.png — access-denied — HTTP 403 — retry after 2026-08-08T14:10:24.327Z
- https://s7g10.scene7.com/is/image/rcu/fei2:landscape-16x9?$Responsive$&fit=stretch&fmt=webp&wid=1920 — access-denied — HTTP 403 — retry after 2026-08-08T14:10:24.327Z
- https://api.riyadh.sa/sites/default/files/styles/medium/public/2026-07/er%20%2859%29.jpg?itok=a33APdGm — source-returned-html — not-image text/html; charset=utf-8 — retry after 2026-08-08T14:10:24.327Z
