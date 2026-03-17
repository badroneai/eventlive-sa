# Event-Day Update Policy

- Use the concierge workflow for any same-day schedule change.
- Update `program.updated_at` for every approved revision.
- Update each affected session `updated_at` field.
- Re-run:
  - validation
  - preview
  - publish
- Archive the superseded approved release when the new approved release is published.
- Keep only one latest approved release in `reports/releases/latest-approved.json`.
- Use release notes to summarize what changed between approved versions.
