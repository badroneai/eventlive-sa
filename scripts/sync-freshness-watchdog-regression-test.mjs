// Fixture-only: no GitHub calls, source collection, or live workflow dispatches.
// Sep 29's deployed-but-red Source Sync exposed the old whole-run-success clock.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import * as implementation from './sync-freshness-watchdog.mjs';

const root = process.cwd();
const watchdog = fs.readFileSync(path.join(root, '.github/workflows/sync-freshness-watchdog.yml'), 'utf8');
const sync = fs.readFileSync(path.join(root, '.github/workflows/source-sync.yml'), 'utf8');
const helper = fs.readFileSync(path.join(root, 'scripts/sync-freshness-watchdog.mjs'), 'utf8');
const NOW = Date.parse('2026-09-30T12:00:00Z');
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();

function assertWorkflow(text) {
  const crons = [...text.matchAll(/cron:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.ok(crons.length >= 2, 'freshness needs multiple daily opportunities to check');
  const syncCrons = [...sync.matchAll(/cron:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  assert.equal(syncCrons.length, 1, 'review freshness policy if daily sync cadence changes');
  for (const cron of crons) assert.ok(Math.abs(Number(cron.split(' ')[1]) - Number(syncCrons[0].split(' ')[1])) >= 6);
  assert.match(text, /permissions:[\s\S]*?actions:\s*write/, 'catch-up dispatch needs actions: write');
  assert.match(text, /contents:\s*read/, 'checked-out helper must be readable');
  const concurrency = text.match(/^concurrency:\n((?:^[ \t]+[^\n]*\n)+)/m)?.[1] || '';
  assert.match(concurrency, /group:\s*\S+/, 'scheduled/manual checks must share a concurrency lock');
  assert.doesNotMatch(concurrency, /github\.(?:ref|run_id)/, 'the lock must cover all watchdog invocations');
  assert.match(concurrency, /cancel-in-progress:\s*false/, 'do not cancel a check that may already have dispatched');
  assert.match(text, /uses:\s*actions\/checkout@\S+/, 'the watchdog needs its tested helper');
  assert.match(text, /uses:\s*actions\/github-script@\S+/, 'execute the tested helper with the GitHub API client');
  assert.match(text, /github\.event\.repository\.default_branch/, 'production branch comes from repository metadata, not a manual watchdog ref');
  assert.match(text, /await\s+checkSyncFreshness\s*\(/, 'the workflow must await the actual decision/dispatch code');
  assert.match(text, /sync-freshness-watchdog\.mjs/, 'workflow must load the tested helper');
  assert.doesNotMatch(text, /continue-on-error:\s*true/, 'do not turn stale alarms green');
  const catchup = Number(text.match(/catchupHours:\s*(\d+)/)?.[1]);
  const alarm = Number(text.match(/alarmHours:\s*(\d+)/)?.[1]);
  assert.ok(catchup > 24 && alarm > catchup && alarm < 48, 'catch-up must precede the sub-48h outage alarm');
}
assertWorkflow(watchdog);
// Wording/action-version edits leave these invariants unchanged.
assertWorkflow(watchdog.replaceAll('@v5', '@v99').replaceAll('@v8', '@v99').replace('Check how long since the catalog was last published', 'Observe recent refreshes'));
for (const broken of [
  watchdog.replace('actions: write', 'actions: read'),
  watchdog.replace(/^concurrency:\n(?:^  .*\n)+/m, ''),
  watchdog.replace('cancel-in-progress: false', 'cancel-in-progress: true'),
  watchdog.replace('alarmHours: 40', 'alarmHours: 26'),
  watchdog.replace('await checkSyncFreshness(', 'checkSyncFreshness('),
  watchdog.replace('github.event.repository.default_branch', 'github.ref_name')
]) assert.throws(() => assertWorkflow(broken), assert.AssertionError, 'broken workflow invariant must make the gate red');

// GitHub exposes step names rather than YAML ids in the Jobs API. Keep that
// interface tied to the real refresh and deploy steps, not to unrelated text.
const steps = sync.split(/^\s*- name:\s*/m).slice(1);
assert.ok(steps.some((step) => step.startsWith(`${implementation.REFRESH_STEP}\n`) && /run:\s*npm run sources:sync/.test(step)));
assert.ok(steps.some((step) => step.startsWith(`${implementation.PUBLICATION_STEP}\n`) && /id:\s*deployment\s/.test(step) && /uses:\s*actions\/deploy-pages@/.test(step)));
assert.match(sync, /jobs:\n\s+sync-build-deploy:/);

function run(id, publishAge, overrides = {}) {
  return {
    id, head_branch: 'main', event: 'schedule', status: 'completed', conclusion: 'success',
    created_at: ago(publishAge + 1), run_started_at: ago(publishAge + 1),
    updated_at: ago(Math.max(0, publishAge - 0.1)), html_url: `https://github.com/fixture/eventlive/actions/runs/${id}`,
    ...overrides
  };
}
function job(age, { deploy = 'success', refresh = 'success', ...overrides } = {}) {
  return {
    name: 'sync-build-deploy',
    steps: [
      { name: 'Collect trusted sources and publish catalog', status: 'completed', conclusion: refresh, completed_at: ago(age + 0.5) },
      { name: 'Publish quality gates battery', status: 'completed', conclusion: 'failure', completed_at: ago(age + 0.1) },
      { name: 'Deploy to GitHub Pages', status: 'completed', conclusion: deploy, completed_at: ago(age) }
    ],
    ...overrides
  };
}
function snapshot(runs, jobs) { return { runs, jobs }; }
const old = run(1, 30);
const stale = snapshot([old], { 1: [job(30)] });

async function execute(impl, rounds, { listError, jobsError, dispatchError, branch = 'main', config = {} } = {}) {
  const calls = { history: [], jobs: [], dispatches: [], info: [], warnings: [], failures: [] };
  let round = -1;
  const actions = {
    listWorkflowRuns: Symbol('runs'), listJobsForWorkflowRun: Symbol('jobs'),
    createWorkflowDispatch: async (args) => {
      if (dispatchError) throw new Error(dispatchError);
      calls.dispatches.push(args);
    }
  };
  const github = {
    rest: { actions },
    paginate: async (method, args) => {
      assert.equal(args.owner, 'fixture');
      assert.equal(args.repo, 'eventlive');
      assert.equal(args.per_page, 100);
      if (method === actions.listWorkflowRuns) {
        assert.equal(args.workflow_id, 'source-sync.yml');
        assert.equal(args.status, undefined, 'failed and pending runs must be visible');
        assert.equal(args.branch, undefined, 'filter locally, avoiding the API filtered-search result cap');
        calls.history.push(args);
        if (listError) throw new Error(listError);
        round = Math.min(round + 1, rounds.length - 1);
        return rounds[round].runs;
      }
      assert.equal(method, actions.listJobsForWorkflowRun);
      assert.equal(args.filter, 'all', 'earlier successful deployment attempts must remain visible');
      calls.jobs.push(args);
      if (jobsError) throw new Error(jobsError);
      return rounds[round].jobs[args.run_id] ?? [];
    }
  };
  const core = {
    info: (message) => calls.info.push(message), warning: (message) => calls.warnings.push(message),
    setFailed: (message) => calls.failures.push(message)
  };
  const before = JSON.stringify(rounds);
  const result = await impl.checkSyncFreshness({ github, core, context: { repo: { owner: 'fixture', repo: 'eventlive' } }, branch, now: () => NOW, ...config });
  assert.equal(JSON.stringify(rounds), before, 'watchdog must never rewrite Source Sync quality/security verdict evidence');
  return { result, calls };
}

async function verifyCriticalInvariants(impl) {
  const publishedRed = run(36543904350, 5, { conclusion: 'failure' });
  const fresh = await execute(impl, [snapshot([publishedRed, old], { [publishedRed.id]: [job(5)], 1: [job(30)] })]);
  assert.equal(fresh.result.state, 'fresh', 'successful collection+deploy with downstream quality red is fresh');
  assert.equal(fresh.calls.dispatches.length, 0, 'quality/security failure must not buy another collection');
  assert.ok(fresh.calls.warnings.some((message) => message.includes('conclusion=failure')), 'retain visibility of the red run');

  for (const deploy of ['failure', 'skipped', 'cancelled', 'timed_out']) {
    const failed = run(2, 1, { conclusion: 'failure' });
    const checked = await execute(impl, [snapshot([failed, old], { 2: [job(1, { deploy })], 1: [job(30)] })]);
    assert.equal(checked.result.state, 'catchup', `${deploy} deploy must not reset publication freshness`);
    assert.equal(checked.calls.dispatches.length, 1);
    assert.deepEqual(checked.calls.dispatches[0], { owner: 'fixture', repo: 'eventlive', workflow_id: 'source-sync.yml', ref: 'main' });
    assert.equal(checked.calls.history.length, 2, 'stale evidence needs a final race check');
  }
  for (const refresh of ['failure', 'skipped', 'cancelled']) {
    const delivered = run(3, 1);
    const checked = await execute(impl, [snapshot([delivered, old], { 3: [job(1, { refresh })], 1: [job(30)] })]);
    assert.equal(checked.result.state, 'catchup', 'delivery without successful collection is not content freshness');
    assert.ok(checked.calls.warnings.some((message) => message.includes('DELIVERY_WITHOUT_REFRESH')));
  }
  const updatedRecently = run(4, 45, { updated_at: ago(1), conclusion: 'failure' });
  const rerun = await execute(impl, [snapshot([updatedRecently], { 4: [job(45), job(1, { deploy: 'skipped', refresh: 'failure' })] })]);
  assert.equal(rerun.result.alarm, true, 'a failed rerun must not reset an old successful deploy via updated_at');
  assert.equal(rerun.result.ageHours, 45);
  assert.equal(rerun.calls.failures.length, 1);

  for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
    const active = run(5, 1, { status, conclusion: null });
    const checked = await execute(impl, [snapshot([active, old], { 1: [job(30)] })]);
    assert.equal(checked.result.state, 'waiting', `${status} run must prevent duplicate dispatch`);
    assert.equal(checked.calls.dispatches.length, 0);
  }
  const active = run(5, 1, { status: 'queued', conclusion: null });
  const raced = await execute(impl, [stale, snapshot([active, old], { 1: [job(30)] })]);
  assert.equal(raced.result.state, 'waiting', 'a sync arriving during evidence reading must prevent duplicate catch-up');
  assert.equal(raced.calls.dispatches.length, 0);
  const veryOld = run(6, 45);
  const waitingAlarm = await execute(impl, [snapshot([active, veryOld], { 6: [job(45)] })]);
  assert.equal(waitingAlarm.result.alarm, true);
  assert.equal(waitingAlarm.calls.failures.length, 1, 'an active run must not hide an already-stale alarm');
  const otherBranch = run(7, 1, { head_branch: 'experiment' });
  const branchScoped = await execute(impl, [snapshot([otherBranch, old], { 7: [job(1)], 1: [job(30)] })]);
  assert.equal(branchScoped.result.state, 'catchup', 'non-production deploys cannot reset the production clock');
}
await verifyCriticalInvariants(implementation);

// Execute the actual github-script body too. The temporary import wrapper only
// freezes time; API/dispatch remain the same in-memory fixtures as above. This
// catches wiring regressions between YAML and the tested implementation.
const scriptBody = watchdog.match(/^\s+script:\s*\|\s*\n((?:^ {12}.*(?:\n|$))+)/m)?.[1];
assert.ok(scriptBody, 'watchdog must expose its executable github-script body');
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-watchdog-workflow-'));
try {
  fs.mkdirSync(path.join(workspace, 'scripts'));
  const wrapperPath = path.join(workspace, 'scripts/sync-freshness-watchdog.mjs');
  fs.writeFileSync(wrapperPath, `import { checkSyncFreshness as realCheck } from ${JSON.stringify(pathToFileURL(path.join(root, 'scripts/sync-freshness-watchdog.mjs')).href)};\nexport let lastResult;\nexport async function checkSyncFreshness(options) { lastResult = await realCheck({ ...options, now: () => ${NOW} }); return lastResult; }\n`);
  const wrapper = await import(pathToFileURL(wrapperPath).href);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const workflowScript = new AsyncFunction('github', 'context', 'core', 'process', scriptBody);
  await verifyCriticalInvariants({
    checkSyncFreshness: async ({ github, context, core, branch }) => {
      await workflowScript(github, context, core, { env: { GITHUB_WORKSPACE: workspace, SYNC_BRANCH: branch } });
      return wrapper.lastResult;
    }
  });
} finally {
  fs.rmSync(workspace, { recursive: true, force: true });
}

// Boundary checks: catch-up at 26h, red at 40h, neither threshold rounded down.
for (const [age, state, alarm] of [[25.999, 'fresh', false], [26, 'catchup', false], [39.999, 'catchup', false], [40, 'catchup', true]]) {
  const checked = await execute(implementation, [snapshot([run(8, age)], { 8: [job(age)] })]);
  assert.equal(checked.result.state, state);
  assert.equal(checked.result.alarm, alarm);
}
const manual = run(9, 1, { event: 'workflow_dispatch', conclusion: 'failure' });
const cooldown = await execute(implementation, [snapshot([manual, old], { 9: [job(1, { deploy: 'skipped' })], 1: [job(30)] })]);
assert.equal(cooldown.result.state, 'cooldown');
assert.equal(cooldown.calls.dispatches.length, 0);
const oldManual = { ...manual, run_started_at: ago(6), created_at: ago(6) };
assert.equal((await execute(implementation, [snapshot([oldManual, old], { 9: [], 1: [job(30)] })])).result.state, 'catchup');

const nowPublished = run(10, 0.1, { conclusion: 'failure' });
assert.equal((await execute(implementation, [stale, snapshot([nowPublished, old], { 10: [job(0.1)], 1: [job(30)] })])).result.state, 'fresh');
// An old-created run rerun today must be considered, even outside the first
// page of runs. The API adapter intentionally receives all paginated history.
const oldCreated = run(11, 1, { created_at: ago(1000), conclusion: 'cancelled' });
const olderRerun = await execute(implementation, [snapshot([...Array.from({ length: 105 }, (_, i) => run(100 + i, 50 + i)), oldCreated], { 11: [job(1)] })]);
assert.equal(olderRerun.result.state, 'fresh');
assert.equal(olderRerun.calls.jobs.length, 1, 'skip job lookups whose update-time upper bound predates a confirmed publish');
// Collection in one attempt cannot qualify a different attempt's cached deploy.
const splitAttempts = [job(1, { deploy: 'skipped' }), job(0.5, { refresh: 'failure' })];
assert.equal((await execute(implementation, [snapshot([run(12, 0.5), old], { 12: splitAttempts, 1: [job(30)] })])).result.state, 'catchup');

for (const options of [{ listError: 'API unavailable' }, { jobsError: '403' }]) {
  const unknown = await execute(implementation, [stale], options);
  assert.equal(unknown.result.state, 'unknown');
  assert.equal(unknown.calls.dispatches.length, 0);
  assert.equal(unknown.calls.failures.length, 0, 'cannot-evaluate must not claim evaluated-and-stale');
  assert.ok(unknown.calls.warnings.some((message) => message.includes('UNKNOWN')));
}
for (const badTime of [null, 'not-a-date', ago(-1)]) {
  const bad = job(1);
  bad.steps.at(-1).completed_at = badTime;
  const unknown = await execute(implementation, [snapshot([run(13, 1), old], { 13: [bad], 1: [job(30)] })]);
  assert.equal(unknown.result.state, 'unknown');
  assert.equal(unknown.calls.dispatches.length, 0);
}
const noEvidence = await execute(implementation, [snapshot([run(14, 50, { conclusion: 'failure' })], { 14: [job(50, { deploy: 'skipped' })] })]);
assert.equal(noEvidence.result.state, 'unknown');
assert.equal(noEvidence.calls.dispatches.length, 0);
const tooMuchHistory = await execute(implementation, [snapshot(Array.from({ length: 101 }, (_, i) => run(200 + i, 50 + i)), {})]);
assert.equal(tooMuchHistory.result.state, 'unknown');
assert.ok(tooMuchHistory.calls.warnings.some((message) => message.includes('bound')));
const denied = await execute(implementation, [stale], { dispatchError: 'permission denied' });
assert.equal(denied.result.state, 'dispatch-failed');
assert.equal(denied.calls.failures.length, 1);
assert.ok(!denied.calls.info.some((message) => message.includes('CATCHUP requested')), 'never claim a failed dispatch was sent');

// Negative-check the executed implementation, without touching shared files.
// Each deliberate invariant break must make the exact behavioral gate fail.
const mutations = [
  ['ignore deploy outcome', "step.conclusion !== 'success'", 'false'],
  ['use run update time', "timestamp(step.completed_at, 'successful deployment completion timestamp', now)", "timestamp(run.updated_at, 'successful deployment completion timestamp', now)"],
  ['trust failed collection', "if (refresh?.status !== 'completed' || refresh.conclusion !== 'success') continue;", 'if (false) continue;'],
  ['forget queued syncs', "run.status !== 'completed'", "run.status === 'in_progress'"],
  ['suppress stale alarm while waiting', 'if (decision.alarm) {', 'if (decision.alarm && decision.dispatch) {'],
  ['omit final race check', 'if (decision.dispatch) {', 'if (false) {'],
  ['include non-production runs', 'run.head_branch === branch &&', ''],
  ['return to whole-run success', ".filter((run) => run.head_branch", ".filter((run) => run.conclusion === 'success').filter((run) => run.head_branch"]
];
for (const [name, from, to] of mutations) {
  assert.ok(helper.includes(from), `negative fixture ${name} must really mutate the implementation`);
  const mutated = await import(`data:text/javascript;base64,${Buffer.from(helper.replace(from, to)).toString('base64')}`);
  await assert.rejects(() => verifyCriticalInvariants(mutated), assert.AssertionError, `gate must reject: ${name}`);
}
console.log(`SYNC_FRESHNESS_WATCHDOG_OK deterministic_cases=40+ negative_mutations=${mutations.length} workflow_negative_cases=6 no_network=true`);
