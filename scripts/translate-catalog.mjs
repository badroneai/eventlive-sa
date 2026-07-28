import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { loadContentTranslations, pruneGlossaryViolations, pruneMixedTranslations } from './content-translation-cache.mjs';

// Autonomous translation step (plan T7.1): translate pending catalog content
// with offline open-source models, merge through the validated merge path,
// and rebuild the site when new translations landed. Never fails the sync —
// on any problem the pending backlog simply stays visible for the next run.

const root = process.cwd();
const workDir = path.join(root, 'workspaces', '_auto-translate');
const pythonBin = process.env.EVENTLIVE_TRANSLATE_PYTHON || 'python3';

function run(command, args, options = {}) {
  return spawnSync(command, args, { stdio: 'inherit', encoding: 'utf8', ...options });
}

const glossaryPruned = pruneGlossaryViolations();
if (glossaryPruned) console.log(`TRANSLATE_CATALOG pruned ${glossaryPruned} glossary-violating machine entries for re-translation`);
const mixedPruned = pruneMixedTranslations();
if (mixedPruned + glossaryPruned) {
  console.log(`TRANSLATE_CATALOG pruned ${mixedPruned} mixed-language cache entries for re-translation`);
  const rebuildForPending = run('npm', ['run', '-s', 'build']);
  if (rebuildForPending.status !== 0) console.log('TRANSLATE_CATALOG pending-refresh build failed — continuing with existing report');
}
const before = Object.keys(loadContentTranslations().entries || {}).length;

fs.rmSync(workDir, { recursive: true, force: true });
const translation = run(pythonBin, ['scripts/auto_translate_pending.py']);
if (translation.status !== 0) {
  console.log('TRANSLATE_CATALOG soft-skip: python translation step unavailable');
  process.exit(0);
}

const outFile = path.join(workDir, 'chunk-01.out.json');
if (!fs.existsSync(outFile)) {
  console.log('TRANSLATE_CATALOG done: nothing translated this run');
  process.exit(0);
}

run(process.execPath, ['scripts/merge-content-translations.mjs', workDir, '--method', 'argos-mt']);
const after = Object.keys(loadContentTranslations().entries || {}).length;
const merged = after - before;
console.log(`TRANSLATE_CATALOG merged=${merged} cache_total=${after}`);

if (merged > 0) {
  console.log('TRANSLATE_CATALOG rebuilding site with fresh translations');
  const rebuild = run('npm', ['run', '-s', 'build']);
  if (rebuild.status !== 0) {
    console.log('TRANSLATE_CATALOG rebuild failed — keeping previous build output');
  }
}
fs.rmSync(workDir, { recursive: true, force: true });
process.exit(0);
