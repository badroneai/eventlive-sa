import { exists, paths, rel, resolveSourceFile, runNodeScript } from './program-lifecycle-utils.mjs';

const fallbackPath = paths.intakeExample;
const sourcePath = process.env.EVENTLIVE_SOURCE_FILE
  ? resolveSourceFile(paths.intakeCurrent)
  : exists(paths.intakeCurrent)
    ? paths.intakeCurrent
    : fallbackPath;
const sourceFile = rel(sourcePath);

runNodeScript('scripts/validate-data.mjs', { EVENTLIVE_SOURCE_FILE: sourceFile });
runNodeScript('scripts/generate-site.mjs', { EVENTLIVE_SOURCE_FILE: sourceFile });

console.log(`PREVIEW_OK source=${sourceFile} output=dist/index.html`);
