# Program Diff Report: data_intake_current-program_example_json--vs--data_intake_current-program_updated_example_json
- Generated at: 2026-03-09T00:40:50.173Z
- Base: data/intake/current-program.example.json
- Candidate: data/intake/current-program.updated.example.json

## Summary
- Metadata changes: 2
- Added sessions: 1
- Removed sessions: 0
- Modified sessions: 2

## Metadata Changes
- event_end: '2026-05-11T15:30:00+03:00' -> '2026-05-11T16:00:00+03:00'
- updated_at: '2026-03-09T12:00:00+03:00' -> '2026-03-10T09:30:00+03:00'

## Added Sessions
- CXP-2026-005: الجلسة الختامية: أولويات 2027 | 2026-05-11T15:15:00+03:00 | قاعة النخبة

## Removed Sessions
- None

## Modified Sessions
- CXP-2026-003: ورشة: قياس رضا المستفيد عبر نقاط الرحلة -> ورشة: قياس رضا المستفيد عبر نقاط الرحلة
  - room: 'قاعة الورش 2' -> 'قاعة الورش 3'
  - tags: 'ورشة|قياس' -> 'ورشة|قياس|تحديث'
- CXP-2026-004: جلسة تواصل وشراكات -> جلسة تواصل وشراكات
  - end_at: '2026-05-11T15:30:00+03:00' -> '2026-05-11T15:15:00+03:00'

## Approval Hint
- Approve when changes match the organizer-approved update scope and no unintended deletions or timing/room regressions are present.
- Reject or return for correction when unexpected metadata changes or unexplained session removals appear.
