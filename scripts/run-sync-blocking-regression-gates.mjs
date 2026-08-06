// Runs the EXACT shell block of source-sync.yml's blocking "Regression checks"
// step, extracted verbatim from the workflow YAML at execution time.
//
// Why extraction instead of a shared list: the third orphan-gate incident
// (2026-08-06, ~22h publishing outage) was caused by a blocking gate that no
// PR check could reach — it lived only in source-sync.yml, so a correct PR
// merged green and froze production. Duplicating the ~50-command list into
// pr-verify.yml would recreate the same class as drift between the copies.
// Executing the publish path's own block means parity by construction: a gate
// added to (or removed from) the sync-blocking list is exercised by pr-verify
// automatically, with the same advisory `|| echo` semantics it has in sync.
//
// Failure policy: if this script cannot find or trust the extracted block, it
// exits 1 LOUDLY. A silent skip here would be the exact lying-gauge class this
// repo bans (see AGENTS.md law 4 and GATES-GOVERNANCE.md).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WORKFLOW = path.join(process.cwd(), '.github', 'workflows', 'source-sync.yml');
const STEP_NAME = 'Regression checks';
// Sanity floor: the block held 40+ npm commands when this was written. If the
// extractor ever sees fewer than this, the YAML shape changed under it and a
// human must look — running a silently truncated list would fake coverage.
const MIN_NPM_COMMANDS = 20;

const content = fs.readFileSync(WORKFLOW, 'utf8');
const lines = content.split('\n');

const stepIdx = lines.findIndex((line) => line.trim() === `- name: ${STEP_NAME}`);
if (stepIdx === -1) {
  console.error(`run-sync-blocking-regression-gates: step '- name: ${STEP_NAME}' not found in ${WORKFLOW}`);
  process.exit(1);
}

let runIdx = -1;
for (let i = stepIdx + 1; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith('- name:')) break; // next step reached without a run block
  if (trimmed === 'run: |') {
    runIdx = i;
    break;
  }
}
if (runIdx === -1) {
  console.error(`run-sync-blocking-regression-gates: no 'run: |' block found under step '${STEP_NAME}'`);
  process.exit(1);
}

const runKeyIndent = lines[runIdx].search(/\S/);
const blockLines = [];
for (let i = runIdx + 1; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim() === '') {
    blockLines.push('');
    continue;
  }
  const indent = line.search(/\S/);
  if (indent <= runKeyIndent) break; // dedented out of the run block
  blockLines.push(line);
}
while (blockLines.length > 0 && blockLines[blockLines.length - 1] === '') blockLines.pop();

const blockIndent = Math.min(
  ...blockLines.filter((line) => line.trim() !== '').map((line) => line.search(/\S/))
);
const script = blockLines.map((line) => (line.trim() === '' ? '' : line.slice(blockIndent))).join('\n');

const npmCommandCount = script.split('\n').filter((line) => line.trim().startsWith('npm run ')).length;
if (npmCommandCount < MIN_NPM_COMMANDS) {
  console.error(
    `run-sync-blocking-regression-gates: extracted only ${npmCommandCount} 'npm run' commands ` +
      `(floor: ${MIN_NPM_COMMANDS}). The '${STEP_NAME}' block shape in ${WORKFLOW} changed — refusing to ` +
      'fake coverage with a truncated list. Inspect the workflow and update this extractor.'
  );
  process.exit(1);
}

console.log(
  `run-sync-blocking-regression-gates: executing the '${STEP_NAME}' block from source-sync.yml verbatim ` +
    `(${npmCommandCount} npm commands)`
);

const tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'sync-regression-')), 'block.sh');
fs.writeFileSync(tmpFile, script);
// bash -e mirrors GitHub Actions' default shell semantics for run blocks:
// first failing command fails the step, advisory `|| echo` lines stay advisory.
const result = spawnSync('bash', ['-e', tmpFile], { stdio: 'inherit' });
process.exit(result.status ?? 1);
