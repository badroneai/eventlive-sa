import { getWorkspaceDeliveryCenter } from './get-workspace-delivery-center.mjs';
import { getWorkspaceReleaseDecision } from './get-workspace-release-decision.mjs';
import { getWorkspaceReleaseHistory } from './get-workspace-release-history.mjs';
import { getWorkspaceReleaseReadiness } from './get-workspace-release-readiness.mjs';

function buildStage(key, tab, complete, detail) {
  return { key, tab, complete, detail };
}

function findNextAction(stages) {
  const nextStage = stages.find((stage) => !stage.complete);
  if (!nextStage) {
    return {
      key: 'workflow_complete',
      tab: 'handoff',
      label_key: 'workflowComplete',
      detail: 'The workspace has reached a publishable and handoff-ready state.'
    };
  }

  const actionMap = {
    intake: { label_key: 'workflowAction_next_intake' },
    draft: { label_key: 'workflowAction_next_draft' },
    validation: { label_key: 'workflowAction_next_validation' },
    preview: { label_key: 'workflowAction_next_preview' },
    diff: { label_key: 'workflowAction_next_diff' },
    release: { label_key: 'workflowAction_next_release' },
    delivery: { label_key: 'workflowAction_next_delivery' },
    archive: { label_key: 'workflowAction_next_archive' }
  };

  return {
    key: `next_${nextStage.key}`,
    tab: nextStage.tab,
    label_key: actionMap[nextStage.key]?.label_key || `workflowStage_${nextStage.key}`,
    detail: nextStage.detail
  };
}

export function getWorkspaceOperatorWorkflow(workspaceId) {
  const readinessResult = getWorkspaceReleaseReadiness(workspaceId);
  const decisionResult = getWorkspaceReleaseDecision(workspaceId);
  const deliveryResult = getWorkspaceDeliveryCenter(workspaceId);
  const historyResult = getWorkspaceReleaseHistory(workspaceId);

  const workspace = readinessResult.workspace;
  const readiness = readinessResult.readiness;
  const decision = decisionResult.decision;
  const delivery = deliveryResult.delivery;
  const history = historyResult.history;

  const stages = [
    buildStage(
      'intake',
      'intake',
      Boolean(workspace.last_normalized_at),
      workspace.last_normalized_at ? `Normalized at ${workspace.last_normalized_at}` : 'Review intake CSV and normalize it into the workspace draft.'
    ),
    buildStage(
      'draft',
      'editor',
      readiness.checks.find((item) => item.key === 'draft_has_sessions')?.ok
        && readiness.checks.find((item) => item.key === 'program_required_fields')?.ok,
      readiness.checks.find((item) => item.key === 'program_required_fields')?.detail || 'Complete program metadata and sessions.'
    ),
    buildStage(
      'validation',
      'validation',
      readiness.checks.find((item) => item.key === 'validation_passed')?.ok,
      workspace.last_validation_at || 'Run validation and resolve all blocking issues.'
    ),
    buildStage(
      'preview',
      'preview',
      readiness.checks.find((item) => item.key === 'preview_ready')?.ok,
      workspace.last_preview_at || 'Generate preview artifacts for review.'
    ),
    buildStage(
      'diff',
      'diff',
      readiness.checks.find((item) => item.key === 'diff_available')?.ok,
      decision.recommendation?.detail || workspace.last_diff_at || 'Run diff and review candidate changes before approval.'
    ),
    buildStage(
      'release',
      'release',
      Boolean(workspace.current_release_id),
      workspace.current_release_id
        ? `Current release ${workspace.current_release_id}`
        : (readiness.can_publish ? 'Candidate is ready to publish.' : 'Approval and publish steps are still pending.')
    ),
    buildStage(
      'delivery',
      'handoff',
      Boolean(workspace.current_release_id && delivery.current),
      workspace.current_release_id && delivery.current?.release_id
        ? `Delivery package available for ${delivery.current.release_id}`
        : 'Review delivery package and handoff assets after publish.'
    ),
    buildStage(
      'archive',
      'history',
      Boolean((workspace.archived_release_ids || []).length > 0),
      (workspace.archived_release_ids || []).length
        ? `${workspace.archived_release_ids.length} archived release(s)`
        : (workspace.current_release_id ? 'Archive after the event when the live release should be frozen.' : 'Archive becomes available after publish.')
    )
  ];

  const nextAction = findNextAction(stages);
  const currentStage = stages.find((stage) => !stage.complete)?.key || 'complete';

  return {
    workspace,
    workflow: {
      current_stage: currentStage,
      overall_status: nextAction.key === 'workflow_complete' ? 'complete' : 'in_progress',
      stages,
      next_action: nextAction
    }
  };
}
