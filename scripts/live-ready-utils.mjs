export function isLiveScheduleReady(event = {}) {
  const sessions = Array.isArray(event.sessions) ? event.sessions : [];
  const completeSessions = sessions.filter((session) => session.title && session.starts_at && session.ends_at);
  const confidence = event.source_confidence || event.confidence || '';
  const official = ['approved-source', 'organizer-confirmed', 'official', 'partner'].includes(confidence);
  return official && (completeSessions.length >= 3 || hasOfficialSingleSession(completeSessions));
}

export function liveReadySessionCount(event = {}) {
  return Array.isArray(event.sessions)
    ? event.sessions.filter((session) => session.title && session.starts_at && session.ends_at).length
    : 0;
}

function hasOfficialSingleSession(sessions = []) {
  if (sessions.length !== 1) return false;
  const [session] = sessions;
  const type = String(session.session_type || '').toLowerCase();
  if (!type.startsWith('official-')) return false;
  if (session.inferred === true || session.source === 'event-start-end') return false;
  const start = new Date(session.starts_at).getTime();
  const end = new Date(session.ends_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
  const durationHours = (end - start) / 36e5;
  return durationHours <= 8;
}
