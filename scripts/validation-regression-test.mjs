import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const regressionDir = path.join(process.cwd(), 'workspaces', '_validation-regression');
fs.mkdirSync(regressionDir, { recursive: true });

const runCurrentValidation = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_VALIDATION_REPORT_FILE: 'workspaces/_validation-regression/current-validation-report.md'
  }
});

const currentValidationOut = `${runCurrentValidation.stdout || ''}\n${runCurrentValidation.stderr || ''}`;
if (runCurrentValidation.status !== 0) {
  console.error('TEST_FAIL current validator did not pass');
  console.error(currentValidationOut);
  process.exit(1);
}

if (!/Total warnings:\s+0/i.test(currentValidationOut)) {
  console.error('TEST_FAIL current validator must be clean before launch');
  console.error(currentValidationOut);
  process.exit(1);
}

const runInvalidProgram = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_FILE: 'data/qa_validation_cases.json',
    EVENTLIVE_EVENTS_CATALOG_FILE: 'data/events_catalog.json',
    EVENTLIVE_VALIDATION_REPORT_FILE: 'workspaces/_validation-regression/invalid-program-report.md'
  }
});

const invalidProgramOut = `${runInvalidProgram.stdout || ''}\n${runInvalidProgram.stderr || ''}`;
const invalidProgramChecks = [
  /duplicate id/i,
  /end_at is earlier than start_at/i,
  /start_at is earlier than program\.event_start/i,
  /session_title has leading\/trailing whitespace/i
];

const missingProgramChecks = invalidProgramChecks.filter((re) => !re.test(invalidProgramOut));

if (runInvalidProgram.status === 0) {
  console.error('TEST_FAIL validator unexpectedly passed invalid fixture');
  process.exit(1);
}

if (missingProgramChecks.length > 0) {
  console.error('TEST_FAIL missing expected checks in output');
  missingProgramChecks.forEach((re) => console.error(`- ${re}`));
  process.exit(1);
}

const runInvalidCatalog = spawnSync(process.execPath, ['scripts/validate-data.mjs'], {
  encoding: 'utf8',
  env: {
    ...process.env,
    EVENTLIVE_SOURCE_FILE: 'data/demo_program.json',
    EVENTLIVE_EVENTS_CATALOG_FILE: 'data/qa_events_catalog_invalid.json',
    EVENTLIVE_VALIDATION_REPORT_FILE: 'workspaces/_validation-regression/invalid-catalog-report.md'
  }
});

const invalidCatalogOut = `${runInvalidCatalog.stdout || ''}\n${runInvalidCatalog.stderr || ''}`;
const invalidCatalogChecks = [
  /catalog event 1: field 'sessions_count' must be >= 0/i,
  /catalog event 1: ends_at is earlier than starts_at/i,
  /catalog event 1: live_schedule_ready=false must not include url/i,
  /catalog event 2: duplicate id 'bad-catalog-event'/i,
  /catalog event 2: live_schedule_ready=true requires url/i
];
const missingCatalogChecks = invalidCatalogChecks.filter((re) => !re.test(invalidCatalogOut));

if (runInvalidCatalog.status === 0) {
  console.error('TEST_FAIL validator unexpectedly passed invalid catalog fixture');
  process.exit(1);
}

if (missingCatalogChecks.length > 0) {
  console.error('TEST_FAIL missing expected catalog checks in output');
  missingCatalogChecks.forEach((re) => console.error(`- ${re}`));
  process.exit(1);
}

console.log('TEST_OK validation regression checks passed');
