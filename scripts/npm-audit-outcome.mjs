// The verdict half of scripts/npm-audit-production.mjs, kept separate so it can
// be exercised without shelling out to the registry.
//
// `npm audit` exits non-zero for two unrelated reasons: it found vulnerabilities
// at or above its threshold, or it could not complete (registry error, network,
// malformed tree). The wrapper treated both as the same failure and printed the
// same sentence for both. On 2026-09-04 CI produced the result that shows why
// that is wrong:
//
//   NPM_AUDIT_PRODUCTION_FAIL critical=0 high=0 moderate=0 low=0
//   ::error:: production dependencies carry 0 vulnerable package(s)
//
// A gate reporting zero findings of every severity while failing, and telling a
// human that zero packages are vulnerable, is not a finding — it is the gate
// saying it could not run, in the words of a finding. AGENTS.md already names
// this class: cannot-evaluate is not evaluated-and-bad.
//
// The verdict itself does not soften. A security audit that cannot run is a gap
// and still fails the run; it just says so in its own words, so the next person
// reads "could not evaluate" instead of hunting for a vulnerability that the
// same line says does not exist.
export function decideAuditOutcome({ exitCode = 0, report = null } = {}) {
  const totals = report?.metadata?.vulnerabilities || {};
  const counted = ['critical', 'high', 'moderate', 'low'].map((level) => `${level}=${totals[level] ?? 0}`).join(' ');
  const vulnerable = Object.values(report?.vulnerabilities || {}).filter((item) => item.severity && item.severity !== 'info');

  if (exitCode === 0 && vulnerable.length === 0) return { status: 'ok', counted, vulnerable };
  if (vulnerable.length > 0) return { status: 'vulnerable', counted, vulnerable };
  return { status: 'not-evaluated', counted, vulnerable };
}
