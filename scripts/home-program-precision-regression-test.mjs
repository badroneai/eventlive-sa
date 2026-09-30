import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { getEventRuntime } from './event-kind-utils.mjs';

// Execute the production membership expression at the first/last Riyadh-day
// boundaries. Catalog changes must not determine whether these invariants run.
const source = fs.readFileSync('scripts/generate-site.mjs', 'utf8');
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
const fn = ast.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === 'patchHomePage');
const declaration = fn.body.body.flatMap((node) => node.declarations || []).find((node) => node.id.name === 'ongoingPrograms');
assert.ok(declaration, 'homepage program membership must be available for boundary checks');
const expression = source.slice(declaration.init.start, declaration.init.end);
const select = (code, events, at) => vm.runInNewContext(code, { upcoming: events, now: Date.parse(at), getEventRuntime });
const program = { id: 'program', event_kind: 'program', starts_at: '2026-10-01T09:00:00+03:00', ends_at: '2026-10-31T18:00:00+03:00' };
let checks = 0;
function verify(code) {
  for (const time_precision of ['unknown', 'date-only-defaulted', 'exact-start-estimated-end', undefined]) {
    const event = { ...program, time_precision };
    for (const at of ['2026-10-01T00:00:00+03:00', '2026-10-01T08:59:59+03:00', '2026-10-31T18:00:01+03:00', '2026-10-31T23:59:59+03:00']) {
      assert.equal(select(code, [event], at).length, 1, `unsourced ${time_precision} remains visible at ${at}`); checks++;
    }
    for (const at of ['2026-09-30T23:59:59+03:00', '2026-11-01T00:00:00+03:00']) {
      assert.equal(select(code, [event], at).length, 0, 'outside actual Riyadh days is excluded'); checks++;
    }
  }
  for (const time_precision of ['exact', 'official-session-times']) {
    const event = { ...program, time_precision };
    for (const at of ['2026-10-01T08:59:59+03:00', '2026-10-31T18:00:01+03:00']) {
      assert.equal(select(code, [event], at).length, 0, 'sourced boundaries retain their exact hours'); checks++;
    }
    assert.equal(select(code, [event], '2026-10-31T18:00:00+03:00').length, 1); checks++;
  }
  assert.equal(select(code, [{ ...program, event_kind: 'moment' }], '2026-10-15T12:00:00+03:00').length, 0);
  assert.equal(select(code, Array.from({length: 8}, (_, i) => ({ ...program, id: String(i) })), '2026-10-15T12:00:00+03:00').length, 5);
}
verify(expression);
assert.throws(() => verify("upcoming.filter(event => event.event_kind === 'program' && Date.parse(event.starts_at) <= now && Date.parse(event.ends_at) >= now).slice(0, 5)"), /unsourced/, 'old timestamp membership must fail');
assert.throws(() => verify("upcoming.filter(event => event.event_kind === 'program').slice(0, 5)"), /outside actual Riyadh days/, 'always-open mutation must fail');
console.log(`home-program-precision-regression-test: ${checks} boundary checks and 2 negative controls passed`);
