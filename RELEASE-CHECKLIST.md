# EventLive Release Checklist

## 1) Pre-Release Gates

- [ ] `npm install` or `npm ci`
- [ ] `npm run launch:preflight`
- [ ] Confirm `npm run validate` reports `Total errors: 0` and `Total warnings: 0`
- [ ] Confirm `reports/release-readiness-report.md` is current
- [ ] Confirm `reports/release-readiness-metrics.json` matches the latest build

## 2) Product Quality

- [ ] Homepage 72-hour section shows only active/near-term events
- [ ] `today-events.json` has `window_hours: 72`
- [ ] `events.html`, event detail pages, city pages, category pages, and audience pages pass launch gates
- [ ] All public event images are local cached images or generated EventLive covers
- [ ] Arabic brand text is `EventLive`; production domain remains `eventme.live`

## 3) Source Operations

- [ ] `npm run sources:ops`
- [ ] `reports/source-ops-report.md` uses `collection_basis: source_run_state`
- [ ] Source duplicate risk is `0`
- [ ] Actionable source queue is `0` before release, unless explicitly documented
- [ ] `data/source_run_state.json` and `data/event_image_cache_manifest.json` are included in release state
- [ ] `source-sync.yml` persists catalog, candidates, run-state, image manifest, and source reports

## 4) Search, Trust, And AI Readiness

- [ ] `dist/sitemap.xml` exists and includes generated event/city/category pages
- [ ] `dist/robots.txt`, `dist/llms.txt`, and `dist/ai-policy.txt` exist
- [ ] `methodology.html`, `trust.html`, `readiness.html`, `sources.html`, and `source-health.html` pass launch sweep
- [ ] Guides pages are present and indexed in sitemap

## 5) Visual Validation

- [ ] `npm run test:site-visual-sweep`
- [ ] Visual sweep is PASS for 41 pages and 82 screenshots
- [ ] Manually inspect:
  - [ ] `/index.html`
  - [ ] `/today-events.html`
  - [ ] `/events.html`
  - [ ] `/organizers.html`
  - [ ] `/source-health.html`

## 6) Deployment

- [ ] Review `git status --short`
- [ ] Review changed files for unrelated or accidental edits
- [ ] Stage only the intended release files
- [ ] Commit after owner approval
- [ ] Push to `main`
- [ ] Monitor GitHub Actions until Pages deploy succeeds

## 7) Post-Deploy Verification

- [ ] Verify `https://eventme.live/`
- [ ] Verify `https://eventme.live/today-events.html`
- [ ] Verify `https://eventme.live/events.html`
- [ ] Verify `https://eventme.live/source-health.html`
- [ ] Verify `https://eventme.live/sitemap.xml`
- [ ] Run uptime check after deployment

## 8) Go / No-Go

- **GO** when `launch:preflight` passes, validation is 0/0, source duplicate/actionable queues are 0, and visual sweep is PASS.
- **NO-GO** when any gate is red, public source health is misleading, homepage temporal data is stale, or production domain/brand checks fail.
