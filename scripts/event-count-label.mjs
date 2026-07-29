// EventLive — shared Arabic count-agreement label for any "N events" UI text.
//
// Arabic requires grammatical number agreement, not just digit substitution:
// 1 = فعالية واحدة (singular-with-"واحدة"), 2 = فعاليتان (dual),
// 3-10 = "N فعاليات" (plural), 11+ = "N فعالية" (singular noun after a
// large cardinal — standard Arabic numeral-noun agreement).
//
// scripts/home-board-live.mjs's liveCountLabel (WO-1) implements this exact
// rule for the homepage live-board badge. This module exists so any OTHER
// count-bearing Arabic string (e.g. the WO-2 calendar-day strip) routes
// through the same rule via import instead of re-deriving the if/else chain
// inline. Do not inline this logic a third time — extend/import from here.
export function eventCountLabel(count = 0) {
  if (count === 1) return 'فعالية واحدة';
  if (count === 2) return 'فعاليتان';
  if (count >= 3 && count <= 10) return `${count} فعاليات`;
  return `${count} فعالية`;
}
