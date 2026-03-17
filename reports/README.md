# Reports Layout

- `reports/validation-report.md`
  - Latest validation result for the last executed source.
- `reports/build-report.md`
  - Latest build result for the last executed source.
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
