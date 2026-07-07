import fs from 'node:fs';
import path from 'node:path';
import { exists, readJson, rel, root, writeJson } from './program-lifecycle-utils.mjs';

const candidatesPath = process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE
  ? path.join(root, process.env.EVENTLIVE_SOURCE_CANDIDATES_FILE)
  : path.join(root, 'data', 'source_candidates.json');
const catalogPath = process.env.EVENTLIVE_EVENTS_CATALOG_FILE
  ? path.join(root, process.env.EVENTLIVE_EVENTS_CATALOG_FILE)
  : path.join(root, 'data', 'events_catalog.json');
const reportJsonPath = path.join(root, 'reports', 'source-review-report.json');
const reportMdPath = path.join(root, 'reports', 'source-review-report.md');
const reviewedAt = new Date().toISOString();
const candidateId = String(process.env.EVENTLIVE_REVIEW_ID || '').trim();
const action = String(process.env.EVENTLIVE_REVIEW_ACTION || '').trim();
const reviewer = String(process.env.EVENTLIVE_REVIEWER || 'EventLive Operations').trim();
const note = String(process.env.EVENTLIVE_REVIEW_NOTES || '').trim();
const dryRun = ['1', 'true', 'yes'].includes(String(process.env.EVENTLIVE_REVIEW_DRY_RUN || '').toLowerCase());

const statusValues = new Set([
  'new',
  'evidence-captured',
  'extraction-needed',
  'ready-for-review',
  'approved-for-catalog',
  'rejected'
]);
const gateValues = new Set([
  'source-evidence',
  'duplicate-review',
  'extraction',
  'human-review',
  'catalog-review',
  'blocked'
]);
const confidenceValues = new Set([
  'official',
  'partner',
  'public-listing',
  'social-signal',
  'unverified'
]);

const actionDefaults = {
  'needs-evidence': {
    review_status: 'new',
    publication_gate: 'source-evidence'
  },
  'evidence-captured': {
    review_status: 'evidence-captured',
    publication_gate: 'human-review'
  },
  'needs-extraction': {
    review_status: 'extraction-needed',
    publication_gate: 'extraction'
  },
  'ready-for-review': {
    review_status: 'ready-for-review',
    publication_gate: 'human-review'
  },
  'approve-catalog': {
    review_status: 'approved-for-catalog',
    publication_gate: 'catalog-review'
  },
  reject: {
    review_status: 'rejected',
    publication_gate: 'blocked'
  },
  block: {
    review_status: 'rejected',
    publication_gate: 'blocked'
  }
};

function candidateMatchKey(row) {
  return [row.title, row.city, String(row.starts_at || row.event_start || '').slice(0, 10)]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
}

function fieldOverride(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function parseOptionalInteger(name) {
  const value = fieldOverride(name);
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function appendNote(existing = '', added = '') {
  const parts = [String(existing || '').trim(), added.trim()].filter(Boolean);
  return parts.join('\n');
}

function requestedPatch() {
  if (!actionDefaults[action]) {
    throw new Error(`Unsupported EVENTLIVE_REVIEW_ACTION '${action}'. Use ${Object.keys(actionDefaults).join(', ')}.`);
  }
  const patch = { ...actionDefaults[action] };
  const status = fieldOverride('EVENTLIVE_REVIEW_STATUS');
  const gate = fieldOverride('EVENTLIVE_REVIEW_GATE');
  const confidence = fieldOverride('EVENTLIVE_REVIEW_CONFIDENCE');
  const evidenceUrl = fieldOverride('EVENTLIVE_REVIEW_EVIDENCE_URL');
  const matchedCatalogEventId = fieldOverride('EVENTLIVE_REVIEW_MATCHED_EVENT_ID');
  const sessionsCount = parseOptionalInteger('EVENTLIVE_REVIEW_SESSIONS');

  if (status) patch.review_status = status;
  if (gate) patch.publication_gate = gate;
  if (confidence) patch.confidence = confidence;
  if (evidenceUrl) patch.evidence_url = evidenceUrl;
  if (matchedCatalogEventId) patch.matched_catalog_event_id = matchedCatalogEventId;
  if (sessionsCount !== null) patch.extracted_sessions_count = sessionsCount;

  if (!statusValues.has(patch.review_status)) throw new Error(`Invalid review_status '${patch.review_status}'`);
  if (!gateValues.has(patch.publication_gate)) throw new Error(`Invalid publication_gate '${patch.publication_gate}'`);
  if (patch.confidence && !confidenceValues.has(patch.confidence)) throw new Error(`Invalid confidence '${patch.confidence}'`);
  if (patch.review_status === 'approved-for-catalog' && patch.publication_gate !== 'catalog-review') {
    throw new Error("approved-for-catalog requires publication_gate='catalog-review'");
  }
  if (patch.publication_gate === 'source-evidence' && patch.review_status === 'approved-for-catalog') {
    throw new Error('source-evidence gate cannot be approved-for-catalog');
  }

  return patch;
}

function approvalErrors(candidate) {
  const errors = [];
  if (!candidate.evidence_url && !candidate.raw_snapshot_path) {
    errors.push('approval requires evidence_url or raw_snapshot_path');
  }
  if (candidate.confidence === 'unverified') {
    errors.push("approval cannot use confidence='unverified'");
  }
  for (const field of ['title', 'city', 'starts_at', 'ends_at', 'source_url', 'source_label', 'source_owner']) {
    if (!candidate[field]) errors.push(`approval requires ${field}`);
  }
  return errors;
}

function writeReport(report) {
  writeJson(reportJsonPath, report);
  const lines = [
    '# EventLive Source Review Report',
    '',
    `- reviewed_at: ${report.reviewed_at}`,
    `- dry_run: ${report.dry_run}`,
    `- candidate_id: ${report.candidate_id}`,
    `- action: ${report.action}`,
    `- reviewer: ${report.reviewer}`,
    `- status: ${report.status}`,
    `- warnings: ${report.warnings.length}`,
    '',
    '## Before',
    '',
    `- review_status: ${report.before?.review_status || '-'}`,
    `- publication_gate: ${report.before?.publication_gate || '-'}`,
    `- confidence: ${report.before?.confidence || '-'}`,
    '',
    '## After',
    '',
    `- review_status: ${report.after?.review_status || '-'}`,
    `- publication_gate: ${report.after?.publication_gate || '-'}`,
    `- confidence: ${report.after?.confidence || '-'}`,
    `- reviewed_by: ${report.after?.reviewed_by || '-'}`,
    '',
    '## Warnings',
    '',
    ...(report.warnings.length ? report.warnings.map((warning) => `- ${warning}`) : ['- none'])
  ];
  fs.writeFileSync(reportMdPath, `${lines.join('\n')}\n`, 'utf8');
}

function main() {
  if (!candidateId) throw new Error('EVENTLIVE_REVIEW_ID is required');
  if (!action) throw new Error('EVENTLIVE_REVIEW_ACTION is required');
  if (!exists(candidatesPath)) throw new Error(`Source candidates file not found: ${rel(candidatesPath)}`);

  const patch = requestedPatch();
  const envelope = readJson(candidatesPath);
  const candidates = Array.isArray(envelope.candidates) ? envelope.candidates : [];
  const index = candidates.findIndex((candidate) => candidate.id === candidateId);
  if (index === -1) throw new Error(`Candidate not found: ${candidateId}`);

  const catalogEvents = exists(catalogPath) ? (readJson(catalogPath).events || []) : [];
  const catalogByMatch = new Map(catalogEvents.map((event) => [candidateMatchKey(event), event]));
  const before = candidates[index];
  const after = {
    ...before,
    ...patch,
    reviewed_at: reviewedAt,
    reviewed_by: reviewer,
    reviewer_notes: appendNote(before.reviewer_notes, note)
  };
  const warnings = [];

  const matched = catalogByMatch.get(candidateMatchKey(after));
  if (matched && matched.id !== after.matched_catalog_event_id) {
    after.matched_catalog_event_id = matched.id;
    warnings.push(`Possible duplicate catalog event: ${matched.id}`);
  }

  if (after.review_status === 'approved-for-catalog') {
    const errors = approvalErrors(after);
    if (errors.length) {
      throw new Error(errors.join('; '));
    }
  }

  const updated = candidates.map((candidate, candidateIndex) => (
    candidateIndex === index ? after : candidate
  ));
  const report = {
    reviewed_at: reviewedAt,
    dry_run: dryRun,
    candidate_id: candidateId,
    action,
    reviewer,
    status: dryRun ? 'dry-run' : 'written',
    source_candidates: rel(candidatesPath),
    before,
    after,
    warnings
  };

  if (!dryRun) {
    writeJson(candidatesPath, {
      ...envelope,
      candidates: updated
    });
  }
  writeReport(report);

  console.log('# EventLive Source Review');
  console.log(`- Candidate: ${candidateId}`);
  console.log(`- Action: ${action}`);
  console.log(`- Status: ${report.status}`);
  console.log(`- Warnings: ${warnings.length}`);
  console.log(`- Report: ${rel(reportMdPath)}`);
}

main();
