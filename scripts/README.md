# Scripts Layout

- `program-lifecycle-utils.mjs`
  - Shared path helpers, release artifact naming, and lifecycle utilities.
- `validate-data.mjs`
  - Validate a program document.
- `generate-site.mjs`
  - Build the client-facing static page.
- `normalize-program.mjs`
  - Convert intake CSV into `data/intake/current-program.json`.
- `preview-program.mjs`
  - Validate + build the current intake candidate.
- `diff-programs.mjs`
  - Compare candidate vs baseline/latest approved and generate diff reports.
- `publish-program.mjs`
  - Mark a validated candidate as the current approved publishable release.
- `archive-program.mjs`
  - Snapshot the current approved release into the archive.

## Lifecycle order
`normalize -> validate -> preview -> diff -> publish -> archive`
