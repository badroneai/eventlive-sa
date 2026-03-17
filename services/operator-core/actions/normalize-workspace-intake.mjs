import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeIntakeRows,
  normalizeCsvText,
  paths,
  rel,
  root
} from '../../../scripts/program-lifecycle-utils.mjs';
import {
  normalizeWorkspaceId,
  readWorkspaceIntakeReview,
  readWorkspaceIntakeSource,
  readWorkspaceManifest,
  workspaceExists,
  writeWorkspaceIntakeSource,
  writeWorkspaceManifest
} from '../storage/workspace-storage.mjs';
import { saveDraft } from './save-draft.mjs';

const INTAKE_PRESETS = {
  template: paths.intakeTemplate,
  baseline: path.join(root, 'data', 'intake', 'baseline-program.example.csv'),
  updated: path.join(root, 'data', 'intake', 'updated-program.example.csv')
};

export function getIntakePresets() {
  return {
    presets: Object.entries(INTAKE_PRESETS).map(([key, filePath]) => ({
      key,
      file: rel(filePath),
      content: fs.readFileSync(filePath, 'utf8')
    }))
  };
}

export function normalizeWorkspaceIntake(workspaceId, csvText, sourceLabelOrOptions = '') {
  const options = typeof sourceLabelOrOptions === 'object' && sourceLabelOrOptions !== null
    ? sourceLabelOrOptions
    : { sourceLabel: sourceLabelOrOptions };
  const reviewedRows = Array.isArray(options.reviewedRows) ? options.reviewedRows : null;
  const actualSourceLabel = options.sourceLabel || '';
  const sourceKind = options.sourceKind || '';
  const originalFilename = options.originalFilename || '';
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const storedIntake = readWorkspaceIntakeSource(safeWorkspaceId);
  const storedReview = readWorkspaceIntakeReview(safeWorkspaceId);
  const effectiveCsvText = String(csvText || '').trim() ? csvText : storedIntake.csv_text;
  const effectiveReviewedRows = reviewedRows || (Array.isArray(storedReview?.rows) ? storedReview.rows : null);

  if (!effectiveReviewedRows && !String(effectiveCsvText || '').trim()) {
    throw new Error('CSV intake content is required');
  }

  const draftDocument = effectiveReviewedRows ? normalizeIntakeRows(effectiveReviewedRows) : normalizeCsvText(effectiveCsvText);
  const saved = saveDraft(safeWorkspaceId, draftDocument);
  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const now = new Date().toISOString();

  writeWorkspaceIntakeSource(safeWorkspaceId, {
    csvText: effectiveCsvText,
    sourceLabel: actualSourceLabel || workspace.last_intake_source || storedIntake.meta?.source_label || '',
    sourceKind: sourceKind || workspace.intake_source_kind || storedIntake.meta?.source_kind || 'manual',
    originalFilename: originalFilename || workspace.intake_original_filename || storedIntake.meta?.original_filename || ''
  });

  workspace.last_normalized_at = now;
  workspace.last_intake_source = actualSourceLabel || workspace.last_intake_source || storedIntake.meta?.source_label || 'operator-console';
  workspace.intake_source_kind = sourceKind || workspace.intake_source_kind || storedIntake.meta?.source_kind || 'manual';
  workspace.intake_original_filename = originalFilename || workspace.intake_original_filename || storedIntake.meta?.original_filename || '';
  workspace.updated_at = now;
  writeWorkspaceManifest(safeWorkspaceId, workspace);

  return {
    workspace,
    draft: saved.draft,
    normalize: {
      rows_count: Array.isArray(saved.draft.sessions) ? saved.draft.sessions.length : 0,
      source_label: workspace.last_intake_source,
      source_kind: workspace.intake_source_kind,
      original_filename: workspace.intake_original_filename || null,
      normalized_at: workspace.last_normalized_at
    }
  };
}
