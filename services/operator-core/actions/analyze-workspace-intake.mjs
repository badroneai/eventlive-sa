import fs from 'node:fs';
import {
  normalizeIntakeRows,
  parseCsv,
  paths,
  rel
} from '../../../scripts/program-lifecycle-utils.mjs';
import {
  getWorkspaceIntakeRawPath,
  getWorkspaceIntakeReviewJsonPath,
  getWorkspaceIntakeReviewMdPath,
  normalizeWorkspaceId,
  readWorkspaceManifest,
  writeWorkspaceIntakeReview,
  writeWorkspaceIntakeSource,
  writeWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';

const PROGRAM_REQUIRED_COLUMNS = [
  'program_title',
  'organizer_name',
  'venue',
  'city',
  'event_start',
  'event_end',
  'program_updated_at'
];

const SESSION_REQUIRED_COLUMNS = [
  'id',
  'session_title',
  'session_type',
  'start_at',
  'end_at',
  'room',
  'status',
  'language',
  'session_updated_at'
];

const HEADER_ALIASES = {
  program_title: ['program title', 'event title', 'title', 'program_name', 'event_name'],
  organizer_name: ['organizer', 'organiser', 'organizer title', 'organizer_name_en', 'entity_name'],
  venue: ['location', 'site', 'venue_name'],
  city: ['city_name'],
  event_start: ['program_start', 'event_start_at', 'start_date', 'event start'],
  event_end: ['program_end', 'event_end_at', 'end_date', 'event end'],
  program_updated_at: ['updated_at', 'program_updated', 'last_updated'],
  id: ['session_id'],
  source: ['data_source'],
  day_label: ['day', 'day_name'],
  session_title: ['title_session', 'session name', 'session'],
  session_type: ['type', 'session category'],
  track: ['stream'],
  speaker: ['speaker_name', 'presenter'],
  moderator: ['facilitator'],
  start_at: ['session_start', 'start time', 'starts_at'],
  end_at: ['session_end', 'end time', 'ends_at'],
  room: ['hall', 'venue_room'],
  status: ['session_status'],
  language: ['lang'],
  audience: ['target_audience'],
  tags: ['labels', 'keywords'],
  session_updated_at: ['updated_session_at', 'session_updated']
};

const EXPECTED_COLUMNS = [
  ...PROGRAM_REQUIRED_COLUMNS,
  'logo_text',
  'organizer_display_name',
  'primary_label',
  'support_contact',
  'footer_note',
  'source',
  'day_label',
  ...SESSION_REQUIRED_COLUMNS.filter((field) => field !== 'id'),
  'track',
  'moderator',
  'audience',
  'tags'
];

function readExpectedColumns() {
  const headerLine = fs.readFileSync(paths.intakeTemplate, 'utf8').split(/\r?\n/, 1)[0] || '';
  return headerLine.split(',').map((value) => value.trim()).filter(Boolean);
}

function normalizeHeaderToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function detectHeaderMappings(headers) {
  const mappings = [];
  const unknownHeaders = [];
  const matchedCanonical = new Set();

  for (const header of headers) {
    const normalized = normalizeHeaderToken(header);
    let canonical = EXPECTED_COLUMNS.find((column) => normalizeHeaderToken(column) === normalized) || null;

    if (!canonical) {
      canonical = Object.entries(HEADER_ALIASES).find(([, aliases]) => aliases.some((alias) => normalizeHeaderToken(alias) === normalized))?.[0] || null;
    }

    if (canonical) {
      matchedCanonical.add(canonical);
      mappings.push({
        source_header: header,
        canonical_header: canonical,
        matched_by: normalizeHeaderToken(canonical) === normalized ? 'exact' : 'alias'
      });
    } else {
      unknownHeaders.push(header);
      mappings.push({
        source_header: header,
        canonical_header: null,
        matched_by: 'unknown'
      });
    }
  }

  return {
    mappings,
    matched_canonical_headers: Array.from(matchedCanonical),
    unknown_headers: unknownHeaders
  };
}

function remapRows(headers, rows, headerMappings) {
  const canonicalBySource = new Map(headerMappings.mappings.map((item) => [item.source_header, item.canonical_header]));
  return rows.map((row) => {
    const mapped = {};
    headers.forEach((header) => {
      const canonical = canonicalBySource.get(header);
      if (!canonical) return;
      mapped[canonical] = row[header] ?? '';
    });
    return mapped;
  });
}

function collectRowIssues(row, rowNumber) {
  const issues = [];

  for (const field of PROGRAM_REQUIRED_COLUMNS) {
    if (!String(row[field] || '').trim()) {
      issues.push({
        kind: 'missing_program_field',
        row_number: rowNumber,
        field,
        message: `Row ${rowNumber}: missing program field '${field}'`
      });
    }
  }

  for (const field of SESSION_REQUIRED_COLUMNS) {
    if (!String(row[field] || '').trim()) {
      issues.push({
        kind: 'missing_session_field',
        row_number: rowNumber,
        field,
        message: `Row ${rowNumber}: missing session field '${field}'`
      });
    }
  }

  return issues;
}

function collectProgramInconsistencies(rows) {
  if (!rows.length) return [];

  const first = rows[0];
  const fields = PROGRAM_REQUIRED_COLUMNS;
  const issues = [];

  rows.slice(1).forEach((row, index) => {
    fields.forEach((field) => {
      if (String(row[field] || '') !== String(first[field] || '')) {
        issues.push({
          kind: 'program_field_inconsistency',
          row_number: index + 2,
          field,
          message: `Row ${index + 2}: program field '${field}' differs from row 1`
        });
      }
    });
  });

  return issues;
}

function buildSuggestedFixes(headerMappings, missingRequiredColumns, issues) {
  const fixes = [];
  const aliasMatches = headerMappings.mappings.filter((item) => item.matched_by === 'alias');
  if (aliasMatches.length) {
    fixes.push(`Apply detected aliases for: ${aliasMatches.map((item) => `${item.source_header} -> ${item.canonical_header}`).join(', ')}`);
  }
  if (missingRequiredColumns.length) {
    fixes.push(`Add missing required columns: ${missingRequiredColumns.join(', ')}`);
  }
  const missingFields = issues.filter((issue) => issue.kind === 'missing_program_field' || issue.kind === 'missing_session_field');
  if (missingFields.length) {
    fixes.push('Complete missing required values before normalize.');
  }
  if (!fixes.length) {
    fixes.push('No blocking fixes suggested. Intake is ready for normalize.');
  }
  return fixes;
}

function buildQualityScore({ missingRequiredColumns, unknownColumns, issues }) {
  let score = 100;
  score -= missingRequiredColumns.length * 12;
  score -= unknownColumns.length * 4;
  score -= issues.length * 3;
  return Math.max(0, score);
}

function buildRequestBackItems({ missingRequiredColumns, issues }) {
  const items = [];

  for (const field of missingRequiredColumns) {
    items.push({
      type: 'missing_required_column',
      severity: 'high',
      label: field,
      message: `Request column '${field}' from the organizer source file.`
    });
  }

  for (const issue of issues) {
    if (issue.kind === 'missing_program_field') {
      items.push({
        type: 'missing_program_value',
        severity: 'high',
        label: issue.field,
        message: `Request the missing program value '${issue.field}' from the organizer.`
      });
      continue;
    }

    if (issue.kind === 'missing_session_field') {
      items.push({
        type: 'missing_session_value',
        severity: 'high',
        label: `row_${issue.row_number}_${issue.field}`,
        message: `Request the missing session value '${issue.field}' for row ${issue.row_number}.`
      });
      continue;
    }

    if (issue.kind === 'program_field_inconsistency') {
      items.push({
        type: 'program_inconsistency',
        severity: 'medium',
        label: `row_${issue.row_number}_${issue.field}`,
        message: `Confirm which '${issue.field}' value is correct because row ${issue.row_number} differs from row 1.`
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const item of items) {
    const key = `${item.type}:${item.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export function analyzeWorkspaceIntake(workspaceId, csvText, options = {}) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  if (!String(csvText || '').trim()) {
    throw new Error('CSV intake content is required');
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const sourceLabel = options.sourceLabel || workspace.last_intake_source || 'operator-console';
  const sourceKind = options.sourceKind || workspace.intake_source_kind || 'manual';
  const originalFilename = options.originalFilename || workspace.intake_original_filename || '';

  const rawRows = parseCsv(csvText);
  if (!rawRows.length) {
    throw new Error('No intake rows found in CSV input');
  }

  const headers = Object.keys(rawRows[0] || {});
  const expectedColumns = readExpectedColumns();
  const headerMappings = detectHeaderMappings(headers);
  const normalizedRows = remapRows(headers, rawRows, headerMappings);
  const missingRequiredColumns = [...PROGRAM_REQUIRED_COLUMNS, ...SESSION_REQUIRED_COLUMNS]
    .filter((field) => !headerMappings.matched_canonical_headers.includes(field));
  const unknownColumns = headerMappings.unknown_headers.filter((field) => !expectedColumns.includes(field));
  const rowIssues = normalizedRows.flatMap((row, index) => collectRowIssues(row, index + 1));
  const inconsistencyIssues = collectProgramInconsistencies(normalizedRows);
  const issues = [...rowIssues, ...inconsistencyIssues];
  const suggestedFixes = buildSuggestedFixes(headerMappings, missingRequiredColumns, issues);
  const qualityScore = buildQualityScore({ missingRequiredColumns, unknownColumns, issues });
  const requestBackItems = buildRequestBackItems({ missingRequiredColumns, issues });

  let normalizedPreview = null;
  if (missingRequiredColumns.length === 0 && issues.length === 0) {
    try {
      normalizedPreview = normalizeIntakeRows(normalizedRows);
    } catch {
      normalizedPreview = null;
    }
  }

  const review = {
    template_file: rel(paths.intakeTemplate),
    rows_count: normalizedRows.length,
    headers,
    export_headers: expectedColumns,
    rows: normalizedRows,
    original_rows: rawRows,
    expected_columns: expectedColumns,
    missing_required_columns: missingRequiredColumns,
    unknown_columns: unknownColumns,
    issues,
    can_normalize: missingRequiredColumns.length === 0 && issues.length === 0,
    quality_score: qualityScore,
    quality_band: qualityScore >= 90 ? 'high' : qualityScore >= 70 ? 'medium' : 'low',
    suggested_fixes: suggestedFixes,
    request_back_items: requestBackItems,
    mapping: {
      program_fields: PROGRAM_REQUIRED_COLUMNS,
      session_fields: SESSION_REQUIRED_COLUMNS,
      detected_headers: headerMappings.mappings
    },
    normalized_preview: normalizedPreview
      ? {
          program_title: normalizedPreview.program.program_title,
          organizer_name: normalizedPreview.program.organizer_name,
          venue: normalizedPreview.program.venue,
          city: normalizedPreview.program.city,
          event_start: normalizedPreview.program.event_start,
          event_end: normalizedPreview.program.event_end,
          sessions_count: normalizedPreview.sessions.length
        }
      : null,
    sample_rows: normalizedRows.slice(0, 5).map((row, index) => ({
      row_number: index + 1,
      values: row
    })),
    source_label: sourceLabel,
    source_kind: sourceKind,
    original_filename: originalFilename,
    reviewed_at: new Date().toISOString(),
    raw_source_file: rel(getWorkspaceIntakeRawPath(safeWorkspaceId)),
    review_json_file: rel(getWorkspaceIntakeReviewJsonPath(safeWorkspaceId)),
    review_md_file: rel(getWorkspaceIntakeReviewMdPath(safeWorkspaceId))
  };

  writeWorkspaceIntakeSource(safeWorkspaceId, {
    csvText,
    sourceLabel,
    sourceKind,
    originalFilename
  });
  writeWorkspaceIntakeReview(safeWorkspaceId, review);
  fs.writeFileSync(getWorkspaceIntakeReviewMdPath(safeWorkspaceId), [
    '# Intake Review',
    `- Workspace: ${safeWorkspaceId}`,
    `- Source label: ${sourceLabel || 'n/a'}`,
    `- Source kind: ${sourceKind || 'n/a'}`,
    `- Original filename: ${originalFilename || 'n/a'}`,
    `- Reviewed at: ${review.reviewed_at}`,
    `- Rows: ${review.rows_count}`,
    `- Quality score: ${review.quality_score}`,
    `- Quality band: ${review.quality_band}`,
    `- Can normalize: ${review.can_normalize}`,
    `- Missing required columns: ${(review.missing_required_columns || []).join(', ') || 'none'}`,
    `- Unknown columns: ${(review.unknown_columns || []).join(', ') || 'none'}`,
    `- Request-back items: ${(review.request_back_items || []).length}`,
    '',
    '## Suggested Fixes',
    ...(review.suggested_fixes || []).map((item) => `- ${item}`),
    '',
    '## Request Back To Organizer',
    ...((review.request_back_items || []).length ? review.request_back_items.map((item) => `- [${item.severity}] ${item.message}`) : ['- none']),
    '',
    '## Issues',
    ...((review.issues || []).length ? review.issues.map((item) => `- ${item.message || item}`) : ['- none'])
  ].join('\n') + '\n', 'utf8');

  workspace.intake_source_file = rel(getWorkspaceIntakeRawPath(safeWorkspaceId));
  workspace.last_intake_source = sourceLabel;
  workspace.intake_source_kind = sourceKind;
  workspace.intake_original_filename = originalFilename;
  workspace.intake_review_file = rel(getWorkspaceIntakeReviewJsonPath(safeWorkspaceId));
  workspace.intake_review_md_file = rel(getWorkspaceIntakeReviewMdPath(safeWorkspaceId));
  workspace.last_intake_review_at = review.reviewed_at;
  workspace.last_intake_quality_score = review.quality_score;
  workspace.last_intake_can_normalize = review.can_normalize;
  workspace.updated_at = review.reviewed_at;
  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    workspace_id: safeWorkspaceId,
    workspace,
    review
  };
}
