import path from 'node:path';
import { ensureDir, normalizeCsvText, paths, root, writeJson } from './program-lifecycle-utils.mjs';
import fs from 'node:fs';

const sourcePath = process.env.EVENTLIVE_INTAKE_FILE
  ? path.join(root, process.env.EVENTLIVE_INTAKE_FILE)
  : path.join(root, 'data', 'intake', 'baseline-program.example.csv');
const outputPath = process.env.EVENTLIVE_NORMALIZED_OUTPUT
  ? path.join(root, process.env.EVENTLIVE_NORMALIZED_OUTPUT)
  : paths.intakeCurrent;

const document = normalizeCsvText(fs.readFileSync(sourcePath, 'utf8'));

ensureDir(path.dirname(outputPath));
writeJson(outputPath, document);

console.log(`NORMALIZE_OK source=${path.relative(root, sourcePath).replace(/\\/g, '/')} output=${path.relative(root, outputPath).replace(/\\/g, '/')}`);
