import { PUBLISH_QUALITY_GATES } from './publish-quality-gates-list.mjs';

// Resolves whether an npm script is actually reachable from a workflow's
// text, looking through one level of shared-battery indirection
// (governance fix 2026-08-02, see GATES-GOVERNANCE.md #5).
//
// Any gate that answers "does this workflow run script X in CI" by
// grepping workflow YAML for the literal `npm run X` string must go
// through this instead of grepping directly. A shared battery script
// (like `npm run ci:publish-quality-gates`) makes every check it contains
// invisible to a direct grep even though it genuinely still runs — that is
// exactly the bug this closes: scripts/security-review-audit.mjs used to
// grep deploy.yml/source-sync.yml directly for
// `audit:dependencies`/`audit:secret-env`/`audit:web-quality` and went red
// the moment those moved into the shared battery, even though they still
// ran in CI exactly as before (verified: `npm run audit:security-review`
// was SECURITY_REVIEW_OK before that refactor, SECURITY_REVIEW_FAIL
// findings=3 after, with no change to what actually runs in CI).
//
// This module only teaches callers to see through the indirection — it
// does not, and must not, change what "reachable" means: a script is only
// reachable if it is invoked directly OR through a battery that is itself
// invoked. A workflow that invokes neither still correctly resolves as not
// running that script.
//
// KNOWN_BATTERIES maps a battery's own npm script name to the list of npm
// scripts it expands to when invoked. Extend this map (not each calling
// gate) when a new shared battery is introduced.
const KNOWN_BATTERIES = {
  'ci:publish-quality-gates': PUBLISH_QUALITY_GATES
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function invokesScript(workflowText, scriptName) {
  const pattern = new RegExp(`npm run ${escapeRegExp(scriptName)}(?:\\s|"|'|$|\\n)`);
  return pattern.test(workflowText);
}

// Returns true if `scriptName` runs when this workflow text executes,
// either because the workflow invokes it directly or because it invokes a
// known battery that contains it.
export function workflowRunsScript(workflowText, scriptName) {
  if (invokesScript(workflowText, scriptName)) return true;
  for (const [batteryName, batteryGates] of Object.entries(KNOWN_BATTERIES)) {
    if (batteryName === scriptName) continue;
    if (invokesScript(workflowText, batteryName) && batteryGates.includes(scriptName)) {
      return true;
    }
  }
  return false;
}

// Returns the full set of npm scripts reachable from this workflow text —
// every script invoked directly, plus every script in any known battery
// the workflow invokes. Useful for callers that want to enumerate rather
// than check membership one script at a time.
export function resolveReachableGates(workflowText, candidateScripts) {
  return candidateScripts.filter((scriptName) => workflowRunsScript(workflowText, scriptName));
}

export { KNOWN_BATTERIES };
