# EventLive Validation Report
- Source: data/sample_clean.json
- Total rows: 8
- Total errors: 13
- Total warnings: 0

## Errors
- row 3: missing required field 'id'
- row 3: field 'id' must have minLength 1
- row 3: field 'price_sar' must be >= 0
- row 3: field 'updated_at' invalid format 'date-time'
- row 3: end_at is earlier than start_at
- row 3: available_seats cannot exceed capacity
- row 4: missing required field 'end_at'
- row 5: field 'status' value 'running' is outside enum
- row 6: field 'category' value 'health' is outside enum
- row 7: field 'capacity' must be >= 0
- row 7: field 'available_seats' must be >= 0
- row 7: available_seats cannot exceed capacity
- row 8: unexpected field 'unexpected'