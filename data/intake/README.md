# EventLive Intake Contract

Use this folder for manual concierge operations.

## Approved files
- `event-program-template.csv`
  - Intake sheet used to collect program metadata plus one row per session.
- `baseline-program.example.csv`
  - Baseline intake example before organizer changes.
- `updated-program.example.csv`
  - Updated intake example after organizer changes.
- `normalized-program.template.json`
  - Canonical normalized JSON shape expected by validation and build scripts.
- `current-program.example.json`
  - Full operational example of a ready-to-validate program document.
- `current-program.updated.example.json`
  - Example of a later approved update for the same program.

## Working convention
1. Copy `event-program-template.csv` and fill one row per session.
2. Keep program-level metadata consistent across all rows.
3. Normalize the approved rows into `current-program.json`.
4. Use `current-program.example.json` and `current-program.updated.example.json` as reference versions.
5. Normalize intake CSV into `current-program.json` with:
   - `npm run normalize`
6. Run validation with:
   - `EVENTLIVE_SOURCE_FILE=data/intake/current-program.json npm run validate`
7. Build preview with:
   - `npm run preview`
8. Compare with the approved baseline using:
   - `npm run diff`
9. Publish with:
   - `npm run publish`
10. Archive superseded approved release with:
   - `npm run archive`

## Naming notes
- `*.template.*`
  - Input contract and normalization shape.
- `*.example.*`
  - Committed reference examples only.
- `current-program.json`
  - Active working candidate for the team. This file is operational, not a demo artifact.
