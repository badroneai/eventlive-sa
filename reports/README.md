# Reports Layout

- `reports/validation-report.md`
  - Latest validation result for the last executed source.
- `reports/build-report.md`
  - Latest build result for the last executed source.
- `reports/source-collection-report.*`
  - Latest source collector run, attempted sources, extracted candidate counts, and raw snapshot paths.
- `reports/source-auto-publish-report.*`
  - Latest automated trusted-source publication run, including published catalog events and blocked candidates.
- `reports/source-review-report.*`
  - Latest candidate review action, before/after gate state, reviewer metadata, and warnings.
- `reports/source-promotion-report.*`
  - Latest controlled promotion run from approved source candidates into the discovery catalog.
- `reports/source-ops-report.*`
  - Unified source operations board covering collection coverage, source health, candidate funnel, focus queue, and next executive action.
- `reports/diffs/`
  - Candidate vs baseline or latest-approved change reports.
  - `latest-diff.*` always points to the newest diff output.
- `reports/releases/`
  - Latest approved manifest, archive index, release notes, and current release bundle summary.
  - Share kit files, delivery manifests, handoff notes, release-specific HTML snapshots, and archive browser outputs.
  - `reports/releases/packages/<release-id>/` holds the final immutable release package folder.
- `reports/alerts-status.*`, `reports/environment-matrix-status.*`, `reports/incidents-index.json`
  - Internal ops/supporting reports kept outside the client-facing page.

## Naming convention
- `current-*`
  - Latest active artifact for the current approved release.
- `latest-*`
  - Latest generated pointer/report for the most recent workflow run.
- `release-<timestamp>*`
  - Immutable release-specific artifacts.
