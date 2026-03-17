import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, exists, paths, readJson, rel, resolveSourceFile, root, writeJson } from './program-lifecycle-utils.mjs';

const basePath = process.env.EVENTLIVE_BASE_FILE
  ? path.join(root, process.env.EVENTLIVE_BASE_FILE)
  : (exists(paths.publishedCurrent) ? paths.publishedCurrent : paths.intakeExample);
const candidatePath = resolveSourceFile(paths.intakeCurrent);

if (!exists(basePath)) {
  throw new Error(`Missing base diff file: ${path.relative(root, basePath)}`);
}
if (!exists(candidatePath)) {
  throw new Error(`Missing candidate diff file: ${path.relative(root, candidatePath)}`);
}

const baseDoc = readJson(basePath);
const candidateDoc = readJson(candidatePath);
const generatedAt = new Date().toISOString();
const baseLabel = rel(basePath).replace(/[/.]/g, '_');
const candidateLabel = rel(candidatePath).replace(/[/.]/g, '_');
const diffId = `${baseLabel}--vs--${candidateLabel}`;

const metadataFields = ['program_title', 'organizer_name', 'venue', 'city', 'event_start', 'event_end', 'updated_at'];
const sessionFields = ['session_title', 'session_type', 'track', 'speaker', 'moderator', 'start_at', 'end_at', 'room', 'status', 'language', 'audience'];

const metadataChanges = metadataFields
  .filter((field) => baseDoc.program?.[field] !== candidateDoc.program?.[field])
  .map((field) => ({
    field,
    before: baseDoc.program?.[field] ?? null,
    after: candidateDoc.program?.[field] ?? null
  }));

const baseSessions = new Map((baseDoc.sessions || []).map((session) => [session.id, session]));
const candidateSessions = new Map((candidateDoc.sessions || []).map((session) => [session.id, session]));

const addedSessions = [];
const removedSessions = [];
const modifiedSessions = [];

for (const [id, session] of candidateSessions.entries()) {
  if (!baseSessions.has(id)) {
    addedSessions.push({ id, session_title: session.session_title, start_at: session.start_at, room: session.room });
    continue;
  }

  const before = baseSessions.get(id);
  const fieldChanges = sessionFields
    .filter((field) => before[field] !== session[field])
    .map((field) => ({ field, before: before[field] ?? null, after: session[field] ?? null }));

  const tagBefore = JSON.stringify(before.tags || []);
  const tagAfter = JSON.stringify(session.tags || []);
  if (tagBefore !== tagAfter) {
    fieldChanges.push({ field: 'tags', before: before.tags || [], after: session.tags || [] });
  }

  if (fieldChanges.length) {
    modifiedSessions.push({
      id,
      session_title_before: before.session_title,
      session_title_after: session.session_title,
      changes: fieldChanges
    });
  }
}

for (const [id, session] of baseSessions.entries()) {
  if (!candidateSessions.has(id)) {
    removedSessions.push({ id, session_title: session.session_title, start_at: session.start_at, room: session.room });
  }
}

const report = {
  generated_at: generatedAt,
  base_file: rel(basePath),
  candidate_file: rel(candidatePath),
  metadata_changes: metadataChanges,
  added_sessions: addedSessions,
  removed_sessions: removedSessions,
  modified_sessions: modifiedSessions,
  summary: {
    metadata_changes: metadataChanges.length,
    added_sessions: addedSessions.length,
    removed_sessions: removedSessions.length,
    modified_sessions: modifiedSessions.length
  }
};

ensureDir(paths.diffReportsDir);
const jsonPath = path.join(paths.diffReportsDir, `${diffId}.json`);
const mdPath = path.join(paths.diffReportsDir, `${diffId}.md`);
writeJson(jsonPath, report);
writeJson(paths.latestDiffJson, report);

const md = [
  `# Program Diff Report: ${diffId}`,
  `- Generated at: ${generatedAt}`,
  `- Base: ${report.base_file}`,
  `- Candidate: ${report.candidate_file}`,
  '',
  '## Summary',
  `- Metadata changes: ${metadataChanges.length}`,
  `- Added sessions: ${addedSessions.length}`,
  `- Removed sessions: ${removedSessions.length}`,
  `- Modified sessions: ${modifiedSessions.length}`,
  '',
  '## Metadata Changes',
  ...(metadataChanges.length
    ? metadataChanges.map((change) => `- ${change.field}: '${change.before ?? ''}' -> '${change.after ?? ''}'`)
    : ['- None']),
  '',
  '## Added Sessions',
  ...(addedSessions.length
    ? addedSessions.map((session) => `- ${session.id}: ${session.session_title} | ${session.start_at} | ${session.room}`)
    : ['- None']),
  '',
  '## Removed Sessions',
  ...(removedSessions.length
    ? removedSessions.map((session) => `- ${session.id}: ${session.session_title} | ${session.start_at} | ${session.room}`)
    : ['- None']),
  '',
  '## Modified Sessions',
  ...(modifiedSessions.length
    ? modifiedSessions.flatMap((session) => [
        `- ${session.id}: ${session.session_title_before} -> ${session.session_title_after}`,
        ...session.changes.map((change) => `  - ${change.field}: '${Array.isArray(change.before) ? change.before.join('|') : change.before ?? ''}' -> '${Array.isArray(change.after) ? change.after.join('|') : change.after ?? ''}'`)
      ])
    : ['- None']),
  '',
  '## Approval Hint',
  '- Approve when changes match the organizer-approved update scope and no unintended deletions or timing/room regressions are present.',
  '- Reject or return for correction when unexpected metadata changes or unexplained session removals appear.'
].join('\n');

fs.writeFileSync(mdPath, `${md}\n`, 'utf8');
fs.writeFileSync(paths.latestDiffMd, `${md}\n`, 'utf8');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function renderRows(rows, columns, emptyMessage) {
  if (!rows.length) {
    return `<div class="empty">${escapeHtml(emptyMessage)}</div>`;
  }

  const headers = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = rows.map((row) => (
    `<tr>${columns.map((column) => `<td>${escapeHtml(renderValue(row[column.key]))}</td>`).join('')}</tr>`
  )).join('');

  return `<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
}

const modifiedSessionsHtml = modifiedSessions.length
  ? modifiedSessions.map((session) => `
      <section class="session-block">
        <h3>${escapeHtml(session.id)} | ${escapeHtml(session.session_title_after || session.session_title_before)}</h3>
        <p class="subtle">Before: ${escapeHtml(session.session_title_before)} | After: ${escapeHtml(session.session_title_after)}</p>
        ${renderRows(session.changes, [
          { key: 'field', label: 'Field' },
          { key: 'before', label: 'Before' },
          { key: 'after', label: 'After' }
        ], 'No field-level changes')}
      </section>
    `).join('\n')
  : '<div class="empty">No modified sessions</div>';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Program Diff Report | ${escapeHtml(diffId)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #0b1020; color: #e8eefc; }
    .wrap { max-width: 1200px; margin: 0 auto; }
    .hero, .section, .card { background: #101a36; border: 1px solid #24335d; border-radius: 16px; }
    .hero { padding: 20px; margin-bottom: 18px; }
    .eyebrow { color: #8dd3ff; font-size: 13px; margin-bottom: 8px; }
    h1, h2, h3 { margin-top: 0; }
    .meta { color: #b9c8ea; line-height: 1.7; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 18px 0; }
    .card { padding: 16px; }
    .card .label { color: #9bb0d9; font-size: 13px; margin-bottom: 6px; }
    .card .value { font-size: 28px; font-weight: 700; }
    .section { padding: 18px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #24335d; padding: 10px; text-align: left; vertical-align: top; }
    th { background: #18264a; }
    .empty { padding: 12px; color: #b9c8ea; background: #0f1730; border-radius: 10px; }
    .session-block { padding: 14px; margin-top: 14px; background: #0f1730; border: 1px solid #24335d; border-radius: 12px; }
    .subtle { color: #9bb0d9; }
    a { color: #8dd3ff; }
    code { color: #d7e4ff; }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="eyebrow">EventLive | Program Diff Report</div>
      <h1>${escapeHtml(diffId)}</h1>
      <div class="meta">
        <div><strong>Generated at:</strong> ${escapeHtml(generatedAt)}</div>
        <div><strong>Base:</strong> <code>${escapeHtml(report.base_file)}</code></div>
        <div><strong>Candidate:</strong> <code>${escapeHtml(report.candidate_file)}</code></div>
        <div><strong>Reports:</strong> <code>${escapeHtml(rel(mdPath))}</code> and <code>${escapeHtml(rel(jsonPath))}</code></div>
      </div>
    </section>

    <section class="section">
      <h2>Summary</h2>
      <div class="grid">
        <div class="card"><div class="label">Metadata changes</div><div class="value">${metadataChanges.length}</div></div>
        <div class="card"><div class="label">Added sessions</div><div class="value">${addedSessions.length}</div></div>
        <div class="card"><div class="label">Removed sessions</div><div class="value">${removedSessions.length}</div></div>
        <div class="card"><div class="label">Modified sessions</div><div class="value">${modifiedSessions.length}</div></div>
      </div>
    </section>

    <section class="section">
      <h2>Metadata Changes</h2>
      ${renderRows(metadataChanges, [
        { key: 'field', label: 'Field' },
        { key: 'before', label: 'Before' },
        { key: 'after', label: 'After' }
      ], 'No metadata changes')}
    </section>

    <section class="section">
      <h2>Added Sessions</h2>
      ${renderRows(addedSessions, [
        { key: 'id', label: 'ID' },
        { key: 'session_title', label: 'Title' },
        { key: 'start_at', label: 'Start' },
        { key: 'room', label: 'Room' }
      ], 'No added sessions')}
    </section>

    <section class="section">
      <h2>Removed Sessions</h2>
      ${renderRows(removedSessions, [
        { key: 'id', label: 'ID' },
        { key: 'session_title', label: 'Title' },
        { key: 'start_at', label: 'Start' },
        { key: 'room', label: 'Room' }
      ], 'No removed sessions')}
    </section>

    <section class="section">
      <h2>Modified Sessions</h2>
      ${modifiedSessionsHtml}
    </section>

    <section class="section">
      <h2>Approval Hint</h2>
      <p class="subtle">Approve when changes match the organizer-approved update scope and no unintended deletions or timing or room regressions are present.</p>
      <p class="subtle">Reject or return for correction when unexpected metadata changes or unexplained session removals appear.</p>
    </section>
  </div>
</body>
</html>`;

const distDir = path.join(root, 'dist');
const distDiffsDir = path.join(distDir, 'diffs');
ensureDir(distDiffsDir);

const reportHtmlPath = path.join(paths.diffReportsDir, `${diffId}.html`);
const previewHtmlPath = path.join(distDiffsDir, `${diffId}.html`);
const latestPreviewPath = path.join(distDir, 'diff.html');

fs.writeFileSync(reportHtmlPath, `${html}\n`, 'utf8');
fs.writeFileSync(previewHtmlPath, `${html}\n`, 'utf8');
fs.writeFileSync(latestPreviewPath, `${html}\n`, 'utf8');
fs.writeFileSync(paths.latestDiffHtml, `${html}\n`, 'utf8');

console.log(
  `DIFF_OK json=${path.relative(root, jsonPath).replace(/\\/g, '/')} md=${path.relative(root, mdPath).replace(/\\/g, '/')} html=${path.relative(root, latestPreviewPath).replace(/\\/g, '/')}`
);
