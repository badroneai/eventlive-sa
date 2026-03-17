import { listWorkspaceRecords } from '../storage/workspace-storage.mjs';

export function listWorkspaces() {
  return {
    workspaces: listWorkspaceRecords()
  };
}
