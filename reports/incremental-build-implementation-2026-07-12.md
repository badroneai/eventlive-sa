# EventLive Incremental Build Implementation

## Decision

EventLive now uses a guarded incremental static build for the six-hour source
sync. Rebuilding every event detail page in both languages was unnecessary when
most catalog records had not changed.

## Operating model

- `npm run build` validates the prior build state and selects full or
  incremental generation.
- Incremental generation renders changed or missing Arabic event artifacts,
  removes deleted event artifacts, reuses unchanged event pages and covers, and
  localizes only changed or missing English routes.
- Event reuse is guarded by a public-page fingerprint covering attendance,
  location, registration, trust, imagery, sessions, program outline, and live
  updates. Internal collection timestamps do not invalidate an unchanged page.
- Aggregate discovery pages, feeds, manifests, search indexes, sitemap, and
  runtime status outputs are refreshed every run.
- A complete build runs on a cold cache, after a template/fingerprint change,
  when cached output is incomplete or inconsistent, when source history cannot
  be trusted, or when the last complete build is at least 24 hours old.
- The final sitemap and bilingual event-page counts are checked after every
  build. A failed incremental contract automatically retries once as a full
  build.
- GitHub Actions caches the reusable static output so a fresh scheduled runner
  can perform a real incremental build.

## Measured result

| Measurement | Full build | Incremental build |
|---|---:|---:|
| Duration | 190.4 seconds | 47.1 seconds |
| Public events | 1,173 | 1,173 |
| Localized routes | 1,280 | 1,280 |
| Arabic event detail pages reused | 0 | 1,173 |
| English routes reused | 0 | 1,173 |
| Output contract | PASS | PASS |

The measured reduction was 143.3 seconds, or about 75.3%, with no event or
localized route removed from the public output.

## Verification

- `npm run test:incremental-build`
- `npm run test:source-sync-workflow`
- `npm run test:source-sync-pipeline`
- `npm run test:i18n-site`
- `npm run test:sitemap`
- `npm run test:event-detail`
- `npm run test:seo-freshness`
- `npm run test:public-assets`
- Full and incremental output-contract checks

All checks passed during the implementation benchmark.
