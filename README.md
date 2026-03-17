# EventLive (Event Program Publishing Pipeline)

Arabic/Saudi event-program publishing pipeline for conferences, forums, and workshops.
It turns normalized schedule data into a mobile-friendly interactive program page with a validation gate and static deployment workflow.

## Quick start

```bash
npm install
npm run validate
npm run build
```

## Lifecycle commands

```bash
npm run normalize
npm run validate
npm run preview
npm run diff
npm run publish
npm run archive
```

## Data contract
- Schema: `data/schema.json`
- Demo conference-program input: `data/demo_program.json`
- Operational intake templates:
  - `data/intake/event-program-template.csv`
  - `data/intake/normalized-program.template.json`
  - `data/intake/baseline-program.example.csv`
  - `data/intake/updated-program.example.csv`
  - `data/intake/current-program.example.json`
  - `data/intake/current-program.updated.example.json`
- Validation report: `reports/validation-report.md`
- Release manifests: `reports/releases/latest-approved.json`, `reports/releases/archive-index.json`, `reports/releases/current-release-bundle.json`
- Diff reports: `reports/diffs/*.md`, `reports/diffs/*.json`
- Share kit: `reports/releases/<release-id>.share-kit.{json,md}` and `reports/releases/<release-id>.qr-placeholder.txt`

## Manual workflow
`intake -> normalize -> validate -> preview -> diff -> approve -> publish -> archive -> handoff`

1. `intake`
   Collect the organizer schedule in any working format and copy the approved template fields into `data/intake/event-program-template.csv`.
2. `normalize`
   Convert the approved intake CSV into `data/intake/current-program.json` with `npm run normalize`.
3. `validate`
   Run `EVENTLIVE_SOURCE_FILE=data/intake/current-program.json npm run validate`.
4. `preview`
   Run `npm run preview` and review `dist/index.html`.
5. `diff`
   Run `npm run diff` to compare the candidate against the latest approved or a chosen baseline.
6. `approve`
   Review the diff report, complete the preview approval checklist, then confirm organizer approval.
7. `publish`
   Run `npm run publish` against the approved normalized file to create the latest approved release package.
8. `archive`
   Archive superseded approved releases with `npm run archive`.
9. `handoff`
   Complete the internal handoff checklist and share the final URL plus evidence bundle.

## Output zones
- `dist/`
  - Latest visitor-facing delivery package: `index.html`, `print.html`, `share.html`, `current-release-bundle.json`, `current-delivery-manifest.*`, `share-kit.*`, `handoff-notes.md`, `archive-browser.html`
  - `dist/delivery-package/` is the current ready-to-hand-off package folder.
- `reports/diffs/`
  - Diff evidence. `latest-diff.*` always points to the newest comparison.
- `reports/releases/`
  - Approved release manifests, release notes, share kits, release-specific HTML snapshots, and archive browser outputs.
  - `reports/releases/packages/<release-id>/` is the immutable release-specific delivery package folder.
- `data/published/`
  - Latest approved publishable program only.
- `data/archive/releases/`
  - Archived approved source documents by release ID.

## CI/CD
- Workflow: `.github/workflows/deploy.yml`
- Trigger: push to `master` or `main`, or manual workflow dispatch
- Deploy target: GitHub Pages
- Public base URL is resolved from `EVENTLIVE_PUBLIC_BASE_URL` during `npm run publish` and deploy verification.
- Current live site metadata is written to `dist/current-live-site.json` and copied into `dist/delivery-package/`.

## Scope
- Target use case: publish session programs for conferences, forums, and workshops in Arabic/Saudi contexts.
- Current model: service-led publishing pipeline, not a public event marketplace.
- Internal ops pages remain separate from the visitor-facing program page.

## Data separation
- `data/demo_program.json` is for local demo and smoke verification only.
- `data/intake/` holds intake templates and working normalized files.
- `data/published/` holds the latest approved publishable program.
- `data/archive/releases/` holds archived approved versions by release ID.
- Operational runs should use `data/intake/current-program.json` or set `EVENTLIVE_SOURCE_FILE` explicitly instead of relying on demo data.

## Lifecycle references
- Data lifecycle: `DATA-LIFECYCLE.md`
- Concierge operations: `CONCIERGE-WORKFLOW.md`
- Event-day update policy: `EVENT-DAY-UPDATE-POLICY.md`
- Approval guidance: `APPROVAL-DECISION-GUIDE.md`
- Script map: `scripts/README.md`
- Report map: `reports/README.md`

## Product-facing output
- The generated page uses lightweight program branding from the normalized document.
- Share-ready release artifacts are generated during `npm run publish`.
- `npm run publish` also generates the final delivery manifest, handoff notes, and delivery package folders.
- `npm run publish` resolves live `program / print / share` URLs when `EVENTLIVE_PUBLIC_BASE_URL` is set.
- Archived approved versions can be browsed through `reports/releases/archive-browser.html`.
