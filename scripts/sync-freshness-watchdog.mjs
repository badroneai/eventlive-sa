// A Source Sync run can publish successfully and deliberately finish red for
// quality/security debt. Only the successful Pages step's completed_at is a
// publication clock. The workflow verdict is a separate, unchanged signal.
export const SOURCE_SYNC_WORKFLOW = 'source-sync.yml';
export const SOURCE_SYNC_JOB = 'sync-build-deploy';
export const REFRESH_STEP = 'Collect trusted sources and publish catalog';
export const PUBLICATION_STEP = 'Deploy to GitHub Pages';
const HOUR = 60 * 60 * 1000;
const MAX_JOB_LOOKUPS = 100;

function timestamp(value, label, now) {
  const time = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(time) || time > now) throw new Error(`invalid ${label}: ${value}`);
  return time;
}

export function decideFreshness({ publication, activeRuns, recentDispatches }, {
  now, catchupHours = 26, alarmHours = 40
}) {
  if (!publication) return { state: 'unknown', dispatch: false, alarm: false };
  const ageHours = (now - publication.time) / HOUR;
  const alarm = ageHours >= alarmHours;
  if (ageHours < catchupHours) return { state: 'fresh', ageHours, dispatch: false, alarm };
  if (activeRuns.length) return { state: 'waiting', ageHours, dispatch: false, alarm };
  if (recentDispatches.length) return { state: 'cooldown', ageHours, dispatch: false, alarm };
  return { state: 'catchup', ageHours, dispatch: true, alarm };
}

export async function readFreshnessSnapshot({ github, owner, repo, branch, now, cooldownHours = 6 }) {
  // Do not filter on success, or cap the run list at five/one hundred. An old
  // run can be rerun today; creation order is not publication order. Unfiltered
  // pagination also avoids GitHub's 1,000-result limit for filtered searches.
  const history = await github.paginate(github.rest.actions.listWorkflowRuns, {
    owner, repo, workflow_id: SOURCE_SYNC_WORKFLOW, per_page: 100
  });
  if (!Array.isArray(history)) throw new Error('workflow run history is unavailable');
  const runs = history
    .filter((run) => run.head_branch === branch && ['schedule', 'workflow_dispatch'].includes(run.event))
    .map((run) => ({
      ...run,
      updatedTime: timestamp(run.updated_at, 'run update timestamp', now),
      startedTime: timestamp(run.run_started_at || run.created_at, 'run start timestamp', now)
    }))
    .sort((a, b) => b.updatedTime - a.updatedTime);
  const activeRuns = runs.filter((run) => run.status !== 'completed');
  const recentDispatches = runs.filter((run) => run.event === 'workflow_dispatch' && now - run.startedTime < cooldownHours * HOUR);

  let publication = null;
  let delivery = null;
  let inspected = 0;
  for (const run of runs) {
    // updated_at is ONLY an upper bound for avoiding irrelevant job lookups;
    // it never supplies the freshness timestamp. A later failed rerun cannot
    // refresh the clock, nor erase a successful deploy from an earlier attempt.
    if (publication && run.updatedTime < publication.time) break;
    if (++inspected > MAX_JOB_LOOKUPS) throw new Error('publication evidence search exceeded its safe job-lookup bound');
    const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
      owner, repo, run_id: run.id, filter: 'all', per_page: 100
    });
    if (!Array.isArray(jobs)) throw new Error(`job history unavailable for run ${run.id}`);
    for (const job of jobs.filter((job) => job.name === SOURCE_SYNC_JOB)) {
      if (!Array.isArray(job.steps)) throw new Error(`step evidence unavailable for run ${run.id}`);
      const refresh = job.steps.find((step) => step.name === REFRESH_STEP);
      for (const step of job.steps) {
        if (step.name !== PUBLICATION_STEP || step.status !== 'completed' || step.conclusion !== 'success') continue;
        const time = timestamp(step.completed_at, 'successful deployment completion timestamp', now);
        const evidence = { time, completedAt: step.completed_at, runId: run.id, runConclusion: run.conclusion, runUrl: run.html_url };
        if (!delivery || time > delivery.time) delivery = evidence;
        // A cached-artifact deploy after failed/skipped collection proves
        // delivery, not refreshed content. Evidence must be in the SAME attempt.
        if (refresh?.status !== 'completed' || refresh.conclusion !== 'success') continue;
        const refreshTime = timestamp(refresh.completed_at, 'successful refresh completion timestamp', now);
        if (refreshTime > time) throw new Error(`refresh completed after deployment in run ${run.id}`);
        if (!publication || time > publication.time) {
          publication = evidence;
        }
      }
    }
  }
  return { publication, delivery, activeRuns, recentDispatches };
}

export async function checkSyncFreshness({
  github, context, core, branch, now = () => Date.now(),
  catchupHours = 26, alarmHours = 40, cooldownHours = 6
}) {
  if (!branch || !(catchupHours > 24 && alarmHours > catchupHours && cooldownHours > 0)) {
    core.setFailed('SYNC_FRESHNESS_CONFIG_INVALID branch and coherent thresholds are required');
    return { state: 'invalid', dispatch: false, alarm: false };
  }
  const options = { github, ...context.repo, branch, cooldownHours };
  let snapshot;
  let decision;
  try {
    let checkedAt = now();
    snapshot = await readFreshnessSnapshot({ ...options, now: checkedAt });
    decision = decideFreshness(snapshot, { now: checkedAt, catchupHours, alarmHours });
    if (decision.dispatch) {
      // A daily sync may have started or published while its job evidence was
      // being read. Recheck immediately before dispatching, under the workflow's
      // concurrency lock, and debounce recent manual/catch-up attempts as well.
      checkedAt = now();
      snapshot = await readFreshnessSnapshot({ ...options, now: checkedAt });
      decision = decideFreshness(snapshot, { now: checkedAt, catchupHours, alarmHours });
    }
  } catch (error) {
    // Cannot-evaluate is neither fresh nor stale. Never start paid collection
    // because an API read failed or deployment evidence is malformed.
    core.warning(`SYNC_FRESHNESS_UNKNOWN ${error.message}`);
    return { state: 'unknown', dispatch: false, alarm: false };
  }

  if (snapshot.delivery && snapshot.delivery.time !== snapshot.publication?.time) {
    core.warning(`SYNC_FRESHNESS_DELIVERY_WITHOUT_REFRESH Pages delivery at ${snapshot.delivery.completedAt} has no successful collection in the same attempt; it does not reset the freshness clock`);
  }
  if (!snapshot.publication) {
    core.warning('SYNC_FRESHNESS_UNKNOWN no successful refresh-and-publish found in available Source Sync job history; no catch-up dispatched');
    return decision;
  }
  const publication = snapshot.publication;
  core.info(`SYNC_FRESHNESS refresh_publication_at=${publication.completedAt} age_minutes=${Math.floor(decision.ageHours * 60)} source_run=${publication.runId} source_run_conclusion=${publication.runConclusion ?? 'pending'} branch=${branch}`);
  if (publication.runConclusion && publication.runConclusion !== 'success') {
    core.warning(`SYNC_FRESHNESS_PUBLISHED_WITH_RED_RUN publication succeeded; Source Sync conclusion=${publication.runConclusion} remains unchanged (${publication.runUrl})`);
  }

  if (decision.dispatch) {
    try {
      await github.rest.actions.createWorkflowDispatch({
        ...context.repo, workflow_id: SOURCE_SYNC_WORKFLOW, ref: branch
      });
      core.info('SYNC_FRESHNESS_CATCHUP requested one Source Sync catch-up after the publication freshness threshold');
    } catch (error) {
      core.setFailed(`SYNC_FRESHNESS_CATCHUP_FAILED could not dispatch Source Sync: ${error.message}`);
      return { ...decision, state: 'dispatch-failed', dispatch: false };
    }
  } else if (decision.state === 'waiting') {
    core.info('SYNC_FRESHNESS_WAITING a Source Sync run is active; no duplicate catch-up dispatched');
  } else if (decision.state === 'cooldown') {
    core.info(`SYNC_FRESHNESS_COOLDOWN a manual/catch-up Source Sync attempt started within ${cooldownHours}h; no duplicate dispatched`);
  } else {
    core.info('SYNC_FRESHNESS_OK a successful refresh-and-publish is within the freshness threshold');
  }
  if (decision.alarm) {
    // This remains red even when a run is active or dispatch is suppressed.
    core.setFailed(`SYNC_FRESHNESS_STALE last confirmed Pages publication was ${decision.ageHours.toFixed(1)}h ago (alarm threshold ${alarmHours}h); catchup=${decision.state}`);
  }
  return decision;
}
