import path from 'node:path';
import { exists, root } from '../../../scripts/program-lifecycle-utils.mjs';
import {
  getWorkspaceApprovedDraftPath,
  getWorkspaceDraftPath,
  normalizeWorkspaceId,
  readWorkspaceDraft,
  readWorkspaceManifest,
  workspaceExists
} from '../storage/workspace-storage.mjs';

const REQUIRED_PROGRAM_FIELDS = [
  'program_title',
  'organizer_name',
  'venue',
  'city',
  'event_start',
  'event_end',
  'updated_at'
];

function buildCheck(key, ok, label, detail = null) {
  return { key, ok, label, detail };
}

export function getWorkspaceReleaseReadiness(workspaceId) {
  const safeWorkspaceId = normalizeWorkspaceId(workspaceId);
  if (!workspaceExists(safeWorkspaceId)) {
    throw new Error(`Workspace not found: ${safeWorkspaceId}`);
  }

  const workspace = readWorkspaceManifest(safeWorkspaceId);
  const draft = readWorkspaceDraft(safeWorkspaceId);
  const draftSessions = Array.isArray(draft.sessions) ? draft.sessions : [];
  const draftProgram = draft.program || {};
  const approvedDraftPath = getWorkspaceApprovedDraftPath(safeWorkspaceId);
  const approvedDraftExists = exists(approvedDraftPath);
  const publishedReleaseExists = Boolean(workspace.current_release_id);
  const missingProgramFields = REQUIRED_PROGRAM_FIELDS.filter((field) => !String(draftProgram[field] || '').trim());
  const approvalOutdated = Boolean(workspace.approved_at && workspace.status === 'working_draft');

  const checks = [
    buildCheck('draft_has_sessions', draftSessions.length > 0, 'Draft contains at least one session', `${draftSessions.length} session(s)`),
    buildCheck('program_required_fields', missingProgramFields.length === 0, 'Required program fields are complete', missingProgramFields.length ? `Missing: ${missingProgramFields.join(', ')}` : 'All required fields present'),
    buildCheck('validation_passed', workspace.last_validation_status === 'passed', 'Validation passed', workspace.last_validation_at || null),
    buildCheck('preview_ready', workspace.preview_ready === true, 'Preview generated', workspace.last_preview_at || null),
    buildCheck('diff_available', Boolean(workspace.last_diff_html || workspace.last_diff_json), 'Diff available for review', workspace.last_diff_at || null),
    buildCheck('approved_snapshot', approvedDraftExists, 'Approved snapshot exists', approvedDraftExists ? path.relative(root, approvedDraftPath).replace(/\\/g, '/') : 'Approve draft to create snapshot'),
    buildCheck('approval_current', !approvalOutdated, 'Approval is current', approvalOutdated ? 'Draft changed after last approval' : (workspace.approved_at || 'No approval drift detected')),
    buildCheck('published_release', publishedReleaseExists, 'Published release exists', workspace.current_release_id || 'No current release linked')
  ];

  const canApprove = checks.find((item) => item.key === 'draft_has_sessions')?.ok
    && checks.find((item) => item.key === 'program_required_fields')?.ok
    && checks.find((item) => item.key === 'validation_passed')?.ok
    && checks.find((item) => item.key === 'preview_ready')?.ok;

  const canPublish = canApprove
    && approvedDraftExists
    && !approvalOutdated;

  const canArchive = publishedReleaseExists;

  return {
    workspace,
    readiness: {
      candidate: {
        draft_file: path.relative(root, getWorkspaceDraftPath(safeWorkspaceId)).replace(/\\/g, '/'),
        program_title: draftProgram.program_title || '',
        organizer_name: draftProgram.organizer_name || '',
        event_start: draftProgram.event_start || '',
        event_end: draftProgram.event_end || '',
        updated_at: draftProgram.updated_at || '',
        sessions_count: draftSessions.length
      },
      current_release: {
        release_id: workspace.current_release_id || null,
        approved_at: workspace.approved_at || null,
        approval_note: workspace.approval_note || null,
        approved_draft_file: workspace.approved_draft_file || null,
        latest_delivery_manifest: workspace.latest_delivery_manifest || null,
        latest_handoff_notes: workspace.latest_handoff_notes || null,
        latest_release_bundle: workspace.latest_release_bundle || null,
        latest_share_kit: workspace.latest_share_kit || null
      },
      checks,
      can_approve: Boolean(canApprove),
      can_publish: Boolean(canPublish),
      can_archive: Boolean(canArchive),
      missing_program_fields: missingProgramFields,
      approval_outdated: approvalOutdated
    }
  };
}
