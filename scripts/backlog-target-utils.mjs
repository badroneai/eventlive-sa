const refreshableMethods = new Set([
  'official-page-meta',
  'approved-source-row',
  'eventlive-internal-seed'
]);

export function selectBacklogTargets(events = [], options = {}) {
  const nowMs = Number(options.nowMs || Date.now());
  const limit = Math.max(1, Number(options.limit || 100));
  const refreshIntervalMs = Math.max(60_000, Number(options.refreshIntervalMs || 7 * 24 * 60 * 60 * 1000));

  return events
    .filter((event) => event.approval_status === 'published')
    .map((event) => {
      const missing = !event.program_outline;
      const collectedMs = Date.parse(event.program_outline?.collected_at || '');
      const refreshable = refreshableMethods.has(event.program_outline?.source_method);
      const stale = refreshable && (!Number.isFinite(collectedMs) || nowMs - collectedMs >= refreshIntervalMs);
      return { event, missing, stale, collectedMs: Number.isFinite(collectedMs) ? collectedMs : 0 };
    })
    .filter((row) => row.missing || row.stale)
    .sort((a, b) => Number(b.missing) - Number(a.missing)
      || a.collectedMs - b.collectedMs
      || String(a.event.id || '').localeCompare(String(b.event.id || '')))
    .slice(0, limit)
    .map((row) => row.event);
}
