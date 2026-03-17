import fs from 'node:fs';
import path from 'node:path';
import {
  ensureDir,
  exists,
  readJson,
  rel,
  root,
  writeJson
} from '../../../scripts/program-lifecycle-utils.mjs';
import {
  createEmptyDraftDocument,
  VALIDATION_STATUS,
  WORKSPACE_STATUS
} from '../types/workspace-types.mjs';

export const workspacePaths = {
  root: path.join(root, 'workspaces')
};

const WORKSPACE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

export function ensureWorkspaceRoot() {
  ensureDir(workspacePaths.root);
}

export function slugifyWorkspaceSegment(value, fallback = 'workspace') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

export function buildWorkspaceId(programTitle, organizerName) {
  const titleSegment = slugifyWorkspaceSegment(programTitle, 'program');
  const organizerSegment = slugifyWorkspaceSegment(organizerName, 'organizer');
  return `${titleSegment}--${organizerSegment}`;
}

export function getWorkspaceDir(workspaceId) {
  return path.join(workspacePaths.root, normalizeWorkspaceId(workspaceId));
}

export function getWorkspaceManifestPath(workspaceId) {
  return path.join(getWorkspaceDir(workspaceId), 'workspace.json');
}

export function getWorkspaceDraftDir(workspaceId) {
  return path.join(getWorkspaceDir(workspaceId), 'draft');
}

export function getWorkspaceDraftPath(workspaceId) {
  return path.join(getWorkspaceDraftDir(workspaceId), 'current-program.json');
}

export function getWorkspaceApprovedDir(workspaceId) {
  return path.join(getWorkspaceDir(workspaceId), 'approved');
}

export function getWorkspaceApprovedDraftPath(workspaceId) {
  return path.join(getWorkspaceApprovedDir(workspaceId), 'approved-program.json');
}

export function getWorkspaceAttachmentsDir(workspaceId) {
  return path.join(getWorkspaceDir(workspaceId), 'attachments');
}

export function getWorkspaceIntakeDir(workspaceId) {
  return path.join(getWorkspaceDir(workspaceId), 'intake');
}

export function getWorkspaceIntakeRawPath(workspaceId) {
  return path.join(getWorkspaceIntakeDir(workspaceId), 'raw-intake.csv');
}

export function getWorkspaceIntakeMetaPath(workspaceId) {
  return path.join(getWorkspaceIntakeDir(workspaceId), 'source.json');
}

export function getWorkspaceIntakeReviewJsonPath(workspaceId) {
  return path.join(getWorkspaceIntakeDir(workspaceId), 'latest-review.json');
}

export function getWorkspaceIntakeReviewMdPath(workspaceId) {
  return path.join(getWorkspaceIntakeDir(workspaceId), 'latest-review.md');
}

export function workspaceExists(workspaceId) {
  return exists(getWorkspaceManifestPath(workspaceId));
}

export function normalizeWorkspaceId(workspaceId) {
  const normalized = String(workspaceId || '').trim().toLowerCase();
  if (!normalized || !WORKSPACE_ID_RE.test(normalized)) {
    throw new Error('Workspace ID must use lowercase letters, numbers, hyphens, and optional double-hyphen segments only');
  }
  return normalized;
}

export function createWorkspaceRecord({
  workspaceId,
  programTitle,
  organizerName
}) {
  const now = new Date().toISOString();
  return {
    workspace_id: normalizeWorkspaceId(workspaceId),
    slug: normalizeWorkspaceId(workspaceId),
    status: WORKSPACE_STATUS.WORKING_DRAFT,
    program_title: programTitle || '',
    organizer_name: organizerName || '',
    created_at: now,
    updated_at: now,
    draft_file: rel(getWorkspaceDraftPath(workspaceId)),
    current_release_id: null,
    archived_release_ids: [],
    last_validation_status: VALIDATION_STATUS.UNKNOWN,
    last_validation_at: null,
    last_validation_report: null,
    last_preview_at: null,
    last_preview_source: null,
    approved_draft_file: null,
    approved_at: null,
    approval_note: null,
    last_diff_at: null,
    last_diff_json: null,
    last_diff_md: null,
    last_diff_html: null,
    last_release_note: null,
    latest_delivery_manifest: null,
    latest_handoff_notes: null,
    latest_release_bundle: null,
    latest_share_kit: null,
    last_normalized_at: null,
    last_intake_source: null,
    intake_source_file: null,
    intake_attachment_file: null,
    intake_attachment_filename: null,
    intake_attachment_mime_type: null,
    intake_source_kind: null,
    intake_original_filename: null,
    intake_review_file: null,
    intake_review_md_file: null,
    last_intake_review_at: null,
    last_intake_quality_score: null,
    last_intake_can_normalize: null,
    preview_ready: false
  };
}

export function initializeWorkspaceStorage({
  workspaceId,
  programTitle,
  organizerName,
  draftDocument
}) {
  ensureWorkspaceRoot();
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  const workspaceDir = getWorkspaceDir(safeWorkspaceId);
  const draftDir = getWorkspaceDraftDir(safeWorkspaceId);
  const approvedDir = getWorkspaceApprovedDir(safeWorkspaceId);
  const intakeDir = getWorkspaceIntakeDir(safeWorkspaceId);
  const attachmentsDir = getWorkspaceAttachmentsDir(safeWorkspaceId);
  ensureDir(workspaceDir);
  ensureDir(draftDir);
  ensureDir(approvedDir);
  ensureDir(intakeDir);
  ensureDir(attachmentsDir);

  const manifest = createWorkspaceRecord({
    workspaceId: safeWorkspaceId,
    programTitle,
    organizerName
  });

  const baseDraft = draftDocument || createEmptyDraftDocument();
  if (baseDraft.program) {
    baseDraft.program.program_title = baseDraft.program.program_title || programTitle || '';
    baseDraft.program.organizer_name = baseDraft.program.organizer_name || organizerName || '';
  }

  writeJson(getWorkspaceManifestPath(safeWorkspaceId), manifest);
  writeJson(getWorkspaceDraftPath(safeWorkspaceId), baseDraft);

  return manifest;
}

export function readWorkspaceManifest(workspaceId) {
  return readJson(getWorkspaceManifestPath(workspaceId));
}

export function writeWorkspaceManifest(workspaceId, manifest) {
  writeJson(getWorkspaceManifestPath(workspaceId), manifest);
  return manifest;
}

export function readWorkspaceDraft(workspaceId) {
  return readJson(getWorkspaceDraftPath(workspaceId));
}

export function writeWorkspaceDraft(workspaceId, draftDocument) {
  writeJson(getWorkspaceDraftPath(workspaceId), draftDocument);
  return draftDocument;
}

export function readWorkspaceApprovedDraft(workspaceId) {
  return readJson(getWorkspaceApprovedDraftPath(workspaceId));
}

export function writeWorkspaceApprovedDraft(workspaceId, draftDocument) {
  ensureDir(getWorkspaceApprovedDir(workspaceId));
  writeJson(getWorkspaceApprovedDraftPath(workspaceId), draftDocument);
  return draftDocument;
}

export function readWorkspaceIntakeSource(workspaceId) {
  const sourcePath = getWorkspaceIntakeRawPath(workspaceId);
  const metaPath = getWorkspaceIntakeMetaPath(workspaceId);

  return {
    csv_text: exists(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : '',
    meta: exists(metaPath) ? readJson(metaPath) : null
  };
}

export function writeWorkspaceIntakeSource(workspaceId, {
  csvText,
  sourceLabel = '',
  sourceKind = 'manual',
  originalFilename = ''
} = {}) {
  ensureDir(getWorkspaceIntakeDir(workspaceId));
  fs.writeFileSync(getWorkspaceIntakeRawPath(workspaceId), String(csvText || ''), 'utf8');
  const meta = {
    source_label: sourceLabel || '',
    source_kind: sourceKind || 'manual',
    original_filename: originalFilename || '',
    saved_at: new Date().toISOString()
  };
  writeJson(getWorkspaceIntakeMetaPath(workspaceId), meta);
  return {
    csv_text: String(csvText || ''),
    meta
  };
}

export function readWorkspaceIntakeReview(workspaceId) {
  const reviewPath = getWorkspaceIntakeReviewJsonPath(workspaceId);
  if (!exists(reviewPath)) return null;
  return readJson(reviewPath);
}

export function writeWorkspaceIntakeReview(workspaceId, review) {
  ensureDir(getWorkspaceIntakeDir(workspaceId));
  writeJson(getWorkspaceIntakeReviewJsonPath(workspaceId), review);
  return review;
}

export function listWorkspaceRecords() {
  ensureWorkspaceRoot();
  return fs.readdirSync(workspacePaths.root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((workspaceId) => {
      try {
        normalizeWorkspaceId(workspaceId);
        return workspaceExists(workspaceId);
      } catch {
        return false;
      }
    })
    .map((workspaceId) => readWorkspaceManifest(workspaceId))
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}
