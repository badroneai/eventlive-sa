import { exists, readJson, root } from '../../../scripts/program-lifecycle-utils.mjs';
import { getWorkspaceReleaseHistory } from './get-workspace-release-history.mjs';
import { getWorkspaceReleaseReadiness } from './get-workspace-release-readiness.mjs';

function countCategorizedChanges(modifiedSessions = []) {
  const impact = {
    timing_changes: 0,
    room_changes: 0,
    speaker_changes: 0,
    track_changes: 0
  };

  for (const session of modifiedSessions) {
    for (const change of session.changes || []) {
      if (change.field === 'start_at' || change.field === 'end_at') impact.timing_changes += 1;
      if (change.field === 'room') impact.room_changes += 1;
      if (change.field === 'speaker' || change.field === 'moderator') impact.speaker_changes += 1;
      if (change.field === 'track') impact.track_changes += 1;
    }
  }

  return impact;
}

function buildRecommendation(readiness, diffSummary, currentRelease) {
  if (!readiness?.checks?.find((item) => item.key === 'draft_has_sessions')?.ok) {
    return {
      key: 'candidate_incomplete',
      label: 'Complete draft data before review',
      detail: 'The candidate draft is still missing core program or session data.'
    };
  }

  if (!readiness?.checks?.find((item) => item.key === 'validation_passed')?.ok) {
    return {
      key: 'run_validation',
      label: 'Run validation before approval',
      detail: 'Validation must pass before this draft can move forward.'
    };
  }

  if (!readiness?.checks?.find((item) => item.key === 'preview_ready')?.ok) {
    return {
      key: 'generate_preview',
      label: 'Generate preview before approval',
      detail: 'Preview artifacts are required before approval and publish.'
    };
  }

  if (!readiness?.checks?.find((item) => item.key === 'diff_available')?.ok) {
    return {
      key: 'run_diff',
      label: 'Run diff before release decision',
      detail: 'Review the current candidate against the baseline before approving it.'
    };
  }

  if (readiness.can_publish) {
    return {
      key: 'ready_to_publish',
      label: currentRelease ? 'Ready to replace current release' : 'Ready to publish first release',
      detail: currentRelease
        ? 'Publishing now will replace the current live release with the candidate draft.'
        : 'The candidate draft can be published as the first live release.'
    };
  }

  if (readiness.can_approve) {
    return {
      key: 'ready_to_approve',
      label: 'Ready for approval',
      detail: 'The candidate draft passed readiness checks and can now be approved.'
    };
  }

  if ((diffSummary?.metadata_changes || 0) + (diffSummary?.added_sessions || 0) + (diffSummary?.removed_sessions || 0) + (diffSummary?.modified_sessions || 0) > 0) {
    return {
      key: 'review_candidate_changes',
      label: 'Review candidate changes carefully',
      detail: 'The candidate differs from the current baseline and should be reviewed before approval.'
    };
  }

  return {
    key: 'waiting_for_release_ops',
    label: 'Release decision pending',
    detail: 'Complete the remaining release steps from the workspace.'
  };
}

export function getWorkspaceReleaseDecision(workspaceId) {
  const readinessResult = getWorkspaceReleaseReadiness(workspaceId);
  const historyResult = getWorkspaceReleaseHistory(workspaceId);
  const workspace = readinessResult.workspace;
  const readiness = readinessResult.readiness;
  const history = historyResult.history;
  const diffReport = workspace.last_diff_json && exists(`${root}/${workspace.last_diff_json}`)
    ? readJson(`${root}/${workspace.last_diff_json}`)
    : null;
  const diffSummary = diffReport?.summary || {
    metadata_changes: 0,
    added_sessions: 0,
    removed_sessions: 0,
    modified_sessions: 0
  };
  const categorizedImpact = countCategorizedChanges(diffReport?.modified_sessions || []);
  const currentRelease = history.current_release || null;
  const recommendation = buildRecommendation(readiness, diffSummary, currentRelease);

  return {
    workspace,
    decision: {
      candidate: readiness.candidate,
      current_release: currentRelease
        ? {
            release_id: currentRelease.release_id || null,
            program_title: currentRelease.program_title || null,
            organizer_name: currentRelease.organizer_name || null,
            published_at: currentRelease.published_at || null,
            sessions_count: currentRelease.sessions_count ?? null
          }
        : readiness.current_release,
      readiness,
      diff: {
        available: Boolean(diffReport),
        summary: diffSummary,
        categorized_impact: categorizedImpact,
        metadata_changes: diffReport?.metadata_changes || [],
        added_sessions: diffReport?.added_sessions || [],
        removed_sessions: diffReport?.removed_sessions || [],
        modified_sessions: diffReport?.modified_sessions || [],
        report_file: workspace.last_diff_html || workspace.last_diff_md || workspace.last_diff_json || null
      },
      replacement: {
        will_replace_current: Boolean(currentRelease?.release_id),
        current_release_id: currentRelease?.release_id || null
      },
      recommendation
    }
  };
}
