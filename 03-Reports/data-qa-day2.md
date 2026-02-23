# EventLive Day 2 — Data QA Report
- Generated at: 2026-02-23T00:49:33.308Z
- Input file: `data/qa_samples_day2.json`
- Validator exit code: 1
- Total classified errors: 11

## Error Breakdown
- Missing required fields: 3
- Enum violations: 2
- Format violations: 1
- Range violations: 3
- Unexpected fields: 1
- Time chronology issues: 1

## Operational Risk Notes
- High: missing required fields can break rendering contracts.
- Medium: enum/format errors can misclassify sessions.
- Medium: range errors impact seat/capacity trustworthiness.

## Raw Validator Output (excerpt)
```
# EventLive Validation Report
- Source: data/sample_clean.json
- Total rows: 8
- Total errors: 11
## Errors
- row 3: missing required field 'id'
- row 3: field 'id' must have minLength 1
- row 3: field 'price_sar' must be >= 0
- row 3: field 'updated_at' invalid format 'date-time'
- row 3: end_at is earlier than start_at
- row 4: missing required field 'end_at'
- row 5: field 'status' value 'running' is outside enum
- row 6: field 'category' value 'health' is outside enum
- row 7: field 'capacity' must be >= 0
- row 7: field 'available_seats' must be >= 0
- row 8: unexpected field 'unexpected'
```