# EventLive Release Readiness Report

- Local review date: 2026-07-07 (Asia/Riyadh)
- Latest build timestamp: 2026-07-07T19:38:07.442Z
- Decision: GO for release candidate after owner-approved commit/push.
- Public domain preserved: eventme.live
- Brand: EventLive

## Current Product Metrics

| Metric | Count |
|---|---:|
| Published events | 416 |
| Upcoming/active | 136 |
| Ended events | 280 |
| Live-ready schedules | 51 |
| Events inside 72-hour now window | 7 |
| Cities | 19 |
| Categories | 12 |
| Local event images/covers | 416 |
| Event detail pages | 416 |
| Sitemap URLs | 497 |
| Visual-sweep screenshots | 82 |

## Source Operations

| Metric | Count |
|---|---:|
| Registered sources | 66 |
| Sources attempted in latest run-state | 34 |
| Collection coverage | 52% |
| Healthy sources | 20 |
| Zero-yield sources | 14 |
| Source candidates | 185 |
| Candidates linked to catalog | 140 |
| Ready for catalog promotion | 0 |
| Duplicate-review queue | 0 |

The public source-ops report now uses the widest available collection basis: current collection report after a full run, or `data/source_run_state.json` when a partial local/CI run would otherwise collapse coverage numbers.

## Gates Run

| Gate | Result |
|---|---|
| `npm run launch:preflight` | PASS |
| `npm run validate` | PASS, errors=0, warnings=0 |
| `npm run validate:gate` | PASS, errors=0, warnings=0 |
| `npm run launch:product-gates` | PASS |
| `npm run launch:source-gates` | PASS |
| `npm run launch:site-gates` | PASS |
| `npm run test:site-visual-sweep` | PASS, pages=41, screenshots=82 |
| Site launch sweep | PASS, pages=38, failed=0 |

## Fixed In This Closeout

- Homepage 72-hour section now replaces stale cards reliably and is protected by a DOM-level regression test.
- Local preview no longer keeps old Service Worker/cache state on localhost or 127.0.0.1.
- Root `index.html` redirects to the generated `dist/index.html` so local preview does not show the old product page.
- Source sync workflow now persists `data/source_run_state.json`, image cache manifest, and source operation reports.
- Validation reports from regression fixtures no longer overwrite the canonical launch validation report.
- Source ops report now prefers run-state memory over partial collection reports and is protected by `test:source-ops`.
- Duplicate-review candidates no longer create noisy validation warnings when the duplicate has already been classified.
- The last duplicate-review source candidate was resolved as discovery evidence linked to its official catalog event, leaving the actionable source queue at 0.
- Full `npm run sources:sync` was run as a production-like automation rehearsal: 187 candidates discovered, 185 written, 276 ended events written, 3 new events auto-published, 137 candidates linked to existing catalog events, and `SOURCE_HEALTH_OK`.
- `sources:yield` now defaults to a bounded diagnostic profile so one slow external source cannot stall the scheduled sync.
- `sources:sync` now refreshes run-state before source-ops reporting and regenerates source-ops at the end of the run, so public health reflects the latest run.
- The one validation warning from the full sync was resolved by correcting the Future Skills candidate link from the stale CompTIA catalog record to the matching current record.
- The auto-publisher is now idempotent on rerun: final rehearsal published 0 new events, linked 140 existing catalog records, and left 45 non-publishable candidates blocked behind the correct gates.
- Catalog duplicates created by earlier source/date matching gaps were removed: 4 duplicate groups, 12 duplicate event rows removed, with candidate links preserved.
- The auto-publisher now prevents three production risks: source/date duplicate publishing, overwriting precise live-session times with generic event windows, and replacing enriched official source media with a secondary linked-source image.

## Remaining Before Production Push

There is no red gate in the current release candidate. The only required release action is owner-approved staging, commit, and push. No commit or push was performed because the project rule requires explicit permission.

Recommended release action after approval:

```bash
git status --short
npm run launch:preflight
git add .
git commit -m "release: prepare EventLive public launch candidate"
git push origin main
```

After push, monitor GitHub Actions, then verify `https://eventme.live/`, `https://eventme.live/sitemap.xml`, `https://eventme.live/today-events.html`, and `https://eventme.live/source-health.html`.
