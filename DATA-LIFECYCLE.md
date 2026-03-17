# EventLive Data Lifecycle

## Data Zones
- `data/demo_program.json`
  - Local smoke/demo dataset only.
- `data/intake/`
  - Working intake assets and normalization templates.
  - `current-program.json` is the active working candidate used for validate/preview/publish.
  - `baseline-program.example.csv` and `updated-program.example.csv` show intake-stage examples.
- `data/published/`
  - The currently approved publishable source document plus release pointer.
- `data/archive/releases/`
  - Archived approved releases kept by release ID.
- `dist/`
  - Latest delivery package for handoff and static deployment.
  - `dist/delivery-package/` is the current live delivery package folder.
- `reports/diffs/`
  - Change reports comparing baseline/latest approved against candidate updates.
- `reports/releases/`
  - Approved release manifests, release notes, share kits, release snapshots, and archive browser outputs.
  - `reports/releases/packages/<release-id>/` is the immutable release-specific delivery package folder.

## Naming Convention
- Release ID format:
  - `release-YYYYMMDDTHHMMSSZ`
- Example:
  - `release-20260310T063000Z`

## Lifecycle
`intake -> normalize -> validate -> preview -> diff -> approve -> publish -> archive -> handoff`

## Command Intent
- `npm run validate`
  - Validate whichever source is selected by `EVENTLIVE_SOURCE_FILE`, or demo by default.
- `npm run build`
  - Build whichever source is selected by `EVENTLIVE_SOURCE_FILE`, or demo by default.
- `npm run normalize`
  - Convert intake CSV into `data/intake/current-program.json`.
- `npm run preview`
  - Validate + build `data/intake/current-program.json` by default.
- `npm run diff`
  - Compare the candidate against latest approved or a chosen baseline and emit diff reports.
- `npm run publish`
  - Validate + build + mark the source as the current approved publishable release.
- `npm run archive`
  - Snapshot the current approved release into `data/archive/releases/<release-id>/`.

## Current vs Archive
- Latest approved release pointer:
  - `reports/releases/latest-approved.json`
- Current release bundle summary:
  - `reports/releases/current-release-bundle.json`
- Latest delivery package:
  - `dist/index.html`
  - `dist/print.html`
  - `dist/share.html`
  - `dist/current-release-bundle.json`
  - `dist/current-delivery-manifest.json`
  - `dist/current-delivery-manifest.md`
  - `dist/handoff-notes.md`
  - `dist/share-kit.json`
  - `dist/archive-browser.html`
  - `dist/delivery-package/`
- Share kit:
  - `reports/releases/<release-id>.share-kit.json`
  - `reports/releases/<release-id>.share-kit.md`
  - `reports/releases/<release-id>.qr-placeholder.txt`
- Delivery manifest:
  - `reports/releases/<release-id>.delivery-manifest.json`
  - `reports/releases/<release-id>.delivery-manifest.md`
- Handoff notes:
  - `reports/releases/<release-id>.handoff-notes.md`
- Release HTML snapshots:
  - `reports/releases/<release-id>.program.html`
  - `reports/releases/<release-id>.print.html`
  - `reports/releases/<release-id>.share.html`
- Release package folders:
  - `reports/releases/packages/<release-id>/`
- Archive index:
  - `reports/releases/archive-index.json`
