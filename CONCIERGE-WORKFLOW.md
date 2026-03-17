# EventLive Concierge Workflow

## Scope
This workflow is for manual delivery of conference, forum, and workshop programs without any dashboard or upload UI.

## Lifecycle
`intake -> normalize -> validate -> preview -> diff -> approve -> publish -> archive -> handoff`

## 1) Intake
- Receive the organizer's schedule in PDF, Excel, Word, email, or message format.
- Rewrite the accepted information into `data/intake/event-program-template.csv`.
- Keep one row per session.
- Program metadata must be captured first:
  - `program_title`
  - `organizer_name`
  - `venue`
  - `city`
  - `event_start`
  - `event_end`
  - `updated_at`
- Required session fields must be present before moving forward:
  - `id`
  - `source`
  - `day_label`
  - `session_title`
  - `session_type`
  - `track`
  - `speaker`
  - `room`
  - `start_at`
  - `end_at`
  - `status`
  - `updated_at`

## 2) Normalize
- Copy `data/intake/normalized-program.template.json` into `data/intake/current-program.json`.
- Convert the intake sheet into a normalized document with:
  - `program`
  - `sessions`
- Keep naming and enum values aligned with `data/schema.json`.
- Use ISO date-time with timezone, for example:
  - `2026-04-14T09:00:00+03:00`
- Command:
  - `npm run normalize`
- Example intake sources:
  - `data/intake/baseline-program.example.csv`
  - `data/intake/updated-program.example.csv`

## 3) Validate
- Run:
  - `EVENTLIVE_SOURCE_FILE=data/intake/current-program.json npm run validate`
- Check `reports/validation-report.md`.
- Do not proceed if validation fails.

## 4) Preview
- Run:
  - `npm run preview`
- Open `dist/index.html` and review:
  - program title
  - organizer name
  - venue and city
  - event start/end range
  - session titles
  - speakers
  - tracks
  - rooms
  - time ordering
  - now/next/ended logic

## 5) Diff
- Run:
  - `npm run diff`
- Review:
  - metadata changes
  - added sessions
  - removed sessions
  - modified sessions
  - time, room, speaker, and track changes
- Output:
  - `reports/diffs/*.md`
  - `reports/diffs/*.json`

## 6) Approve
- Complete `PREVIEW-APPROVAL-CHECKLIST.md`.
- Review `APPROVAL-DECISION-GUIDE.md`.
- Get organizer approval on:
  - program metadata
  - final session ordering
  - speaker spellings
  - room assignments
  - latest `updated_at`

## 7) Publish
- After organizer approval, publish the same normalized JSON file through the existing deployment path.
- Do not edit content after approval without updating `updated_at` and re-running validation/build.
- Command:
  - `npm run publish`
- Default source:
  - `data/intake/current-program.json`

## 8) Archive
- Archive the superseded approved release or close-out release snapshot with:
  - `npm run archive`
- Archive target format:
  - `data/archive/releases/<release-id>/program.json`
  - `data/archive/releases/<release-id>/release-notes.md`
- Track latest vs archived releases through:
  - `reports/releases/latest-approved.json`
  - `reports/releases/archive-index.json`

## 9) Handoff
- Complete `HANDOFF-CHECKLIST.md`.
- Hand off:
  - published URL
  - source normalized JSON path
  - validation report
  - build report
  - latest approved timestamp

## Separation Rules
- `data/demo_program.json` is for local demo and smoke checks only.
- `data/intake/` is for operational preparation.
- `data/published/` stores the current approved publishable program.
- `data/archive/releases/` stores archived approved versions.
- Internal ops pages remain outside the client-facing program flow.
