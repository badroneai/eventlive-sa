const HOUR_MS = 60 * 60 * 1000;

function validTimestamp(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

function cadenceIntervalHours(source = {}, state = {}) {
  const status = String(state.status || 'not-attempted');
  const cadence = String(state.cadence || '');
  const ring = String(state.ring || '');
  const zeroYieldStreak = Number(state.zero_yield_streak || 0);
  const errorStreak = Number(state.error_streak || 0);

  if (status === 'productive') {
    if (ring === 'discovery-only' || source.intake_policy === 'candidate-only') return 24;
    if (cadence === 'weekly-dedupe-check') return 168;
    if (cadence === 'monthly-evidence-check') return 24 * 30;
    return 0;
  }
  if (status === 'collector-error' || status === 'probe-blocked') {
    return errorStreak >= 2 ? 24 : 6;
  }
  if (status === 'zero-yield') {
    if (zeroYieldStreak >= 48) return 168;
    if (zeroYieldStreak >= 12) return 72;
    if (zeroYieldStreak >= 3) return 24;
    return 6;
  }
  if (ring === 'discovery-only') return 24;
  return 0;
}

function sourceCadenceDecision(source = {}, state = {}, referenceDate = new Date(), options = {}) {
  const forceAll = options.forceAll === true;
  const referenceTime = referenceDate instanceof Date ? referenceDate.getTime() : new Date(referenceDate).getTime();
  const lastAttemptedAt = validTimestamp(state.last_attempted_at);
  if (forceAll) {
    return { due: true, interval_hours: 0, reason: 'forced', next_due_at: null };
  }
  if (!lastAttemptedAt) {
    return { due: true, interval_hours: 0, reason: 'never-attempted', next_due_at: null };
  }

  const intervalHours = cadenceIntervalHours(source, state);
  if (intervalHours === 0) {
    return { due: true, interval_hours: 0, reason: 'productive-six-hour-lane', next_due_at: null };
  }
  const nextDueTime = lastAttemptedAt + intervalHours * HOUR_MS;
  const due = referenceTime >= nextDueTime;
  const status = String(state.status || 'not-attempted');
  const reason = status === 'collector-error' || status === 'probe-blocked'
    ? 'error-cooldown'
    : status === 'zero-yield'
      ? 'zero-yield-cooldown'
      : state.ring === 'discovery-only' || source.intake_policy === 'candidate-only'
        ? 'discovery-daily'
        : 'declared-cadence';
  return {
    due,
    interval_hours: intervalHours,
    reason,
    next_due_at: new Date(nextDueTime).toISOString()
  };
}

function selectSourcesByCadence(sources = [], stateRows = [], referenceDate = new Date(), options = {}) {
  const stateById = new Map(stateRows.map((row) => [row.id, row]));
  const due = [];
  const deferred = [];
  for (const source of sources) {
    const decision = sourceCadenceDecision(source, stateById.get(source.id) || {}, referenceDate, options);
    const row = { source, state: stateById.get(source.id) || {}, decision };
    if (decision.due) due.push(row);
    else deferred.push(row);
  }
  return { due, deferred };
}

export { cadenceIntervalHours, selectSourcesByCadence, sourceCadenceDecision };
