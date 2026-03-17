# Approval Decision Guide

- Approve if the diff report shows only expected organizer-approved changes.
- Reject if there are unexplained metadata changes in:
  - `program_title`
  - `organizer_name`
  - `venue`
  - `city`
  - `event_start`
  - `event_end`
- Reject if any session disappears without explicit organizer confirmation.
- Reject if time, room, speaker, or track changes appear without approval context.
- Approve only after:
  - `npm run validate`
  - `npm run preview`
  - `npm run diff`
  - preview checklist completion
