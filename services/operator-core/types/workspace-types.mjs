/**
 * @typedef {"working_draft" | "validated_draft" | "approved_current" | "archived"} WorkspaceStatus
 */

/**
 * @typedef {{
 *   workspace_id: string,
 *   slug: string,
 *   status: WorkspaceStatus,
 *   program_title: string,
 *   organizer_name: string,
 *   created_at: string,
 *   updated_at: string,
 *   draft_file: string,
 *   current_release_id: string | null,
 *   archived_release_ids: string[],
 *   last_validation_status: "unknown" | "passed" | "failed",
 *   last_validation_at?: string | null,
 *   last_validation_report?: string | null,
 *   last_preview_at?: string | null,
 *   last_preview_source?: string | null,
 *   approved_draft_file?: string | null,
 *   approved_at?: string | null,
 *   approval_note?: string | null,
 *   last_diff_at?: string | null,
 *   last_diff_json?: string | null,
 *   last_diff_md?: string | null,
 *   last_diff_html?: string | null,
 *   last_release_note?: string | null,
 *   latest_delivery_manifest?: string | null,
 *   latest_handoff_notes?: string | null,
 *   latest_release_bundle?: string | null,
 *   latest_share_kit?: string | null,
 *   last_normalized_at?: string | null,
 *   last_intake_source?: string | null,
 *   intake_source_file?: string | null,
 *   intake_attachment_file?: string | null,
 *   intake_attachment_filename?: string | null,
 *   intake_attachment_mime_type?: string | null,
 *   intake_source_kind?: string | null,
 *   intake_original_filename?: string | null,
 *   intake_review_file?: string | null,
 *   intake_review_md_file?: string | null,
 *   last_intake_review_at?: string | null,
 *   last_intake_quality_score?: number | null,
 *   last_intake_can_normalize?: boolean | null,
  *   preview_ready: boolean
 * }} WorkspaceRecord
 */

export const WORKSPACE_STATUS = {
  WORKING_DRAFT: 'working_draft',
  VALIDATED_DRAFT: 'validated_draft',
  APPROVED_CURRENT: 'approved_current',
  ARCHIVED: 'archived'
};

export const VALIDATION_STATUS = {
  UNKNOWN: 'unknown',
  PASSED: 'passed',
  FAILED: 'failed'
};

export function createEmptyDraftDocument() {
  return {
    program: {
      program_title: '',
      organizer_name: '',
      organizer_display_name: '',
      logo_text: '',
      primary_label: '',
      support_contact: '',
      footer_note: '',
      venue: '',
      city: '',
      event_start: '',
      event_end: '',
      updated_at: ''
    },
    sessions: []
  };
}

export function createEmptySessionDraft() {
  return {
    id: '',
    source: 'operator-console',
    day_label: '',
    session_title: '',
    session_type: 'talk',
    track: '',
    speaker: '',
    moderator: '',
    start_at: '',
    end_at: '',
    room: '',
    status: 'scheduled',
    language: 'ar',
    audience: '',
    tags: [],
    updated_at: ''
  };
}
