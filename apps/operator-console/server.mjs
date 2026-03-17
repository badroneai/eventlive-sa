import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approveDraft,
  analyzeWorkspaceIntake,
  archiveWorkspace,
  buildPreview,
  createWorkspace,
  diffDraft,
  getWorkspaceDeliveryCenter,
  getWorkspaceIntakeMetaPath,
  getWorkspaceIntakeRawPath,
  getWorkspaceIntakeReviewJsonPath,
  getWorkspaceIntakeReviewMdPath,
  importWorkspaceIntakeFile,
  getWorkspaceReleaseDecision,
  getWorkspaceOperatorWorkflow,
  getWorkspaceReleaseReadiness,
  getIntakePresets,
  getWorkspaceReleaseHistory,
  listWorkspaces,
  loadDraft,
  normalizeWorkspaceIntake,
  openWorkspace,
  publishWorkspace,
  saveDraft,
  validateDraft
} from '../../services/operator-core/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const workspaceRoot = path.join(process.cwd(), 'workspaces');
const distRoot = path.join(process.cwd(), 'dist');
const reportsRoot = path.join(process.cwd(), 'reports');
const port = Number(process.env.OPERATOR_CONSOLE_PORT || 4173);
const host = process.env.OPERATOR_CONSOLE_HOST || '127.0.0.1';
const MAX_BODY_BYTES = 15 * 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function isAllowedArtifactPath(filePath) {
  return [distRoot, reportsRoot, workspaceRoot].some((allowedRoot) => {
    const relativePath = path.relative(allowedRoot, filePath);
    return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  });
}

async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not found' });
}

function methodNotAllowed(res) {
  sendJson(res, 405, { error: 'Method not allowed' });
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/intake/presets') {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }
    sendJson(res, 200, getIntakePresets());
    return;
  }

  if (pathname === '/api/workspaces') {
    if (req.method === 'GET') {
      sendJson(res, 200, listWorkspaces());
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      sendJson(res, 201, createWorkspace({
        workspaceId: body.workspaceId || undefined,
        programTitle: body.programTitle || '',
        organizerName: body.organizerName || ''
      }));
      return;
    }

    methodNotAllowed(res);
    return;
  }

  const workspaceMatch = pathname.match(/^\/api\/workspaces\/([^/]+)$/);
  if (workspaceMatch) {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }
    sendJson(res, 200, openWorkspace(decodeURIComponent(workspaceMatch[1])));
    return;
  }

  const draftMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/draft$/);
  if (draftMatch) {
    const workspaceId = decodeURIComponent(draftMatch[1]);

    if (req.method === 'GET') {
      sendJson(res, 200, loadDraft(workspaceId));
      return;
    }

    if (req.method === 'PUT') {
      const body = await readJsonBody(req);
      sendJson(res, 200, saveDraft(workspaceId, body.draft));
      return;
    }

    methodNotAllowed(res);
    return;
  }

  const validateMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/validate$/);
  if (validateMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, validateDraft(decodeURIComponent(validateMatch[1])));
    return;
  }

  const previewMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/preview$/);
  if (previewMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, buildPreview(decodeURIComponent(previewMatch[1])));
    return;
  }

  const normalizeMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/normalize$/);
  if (normalizeMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    const body = await readJsonBody(req);
    sendJson(res, 200, normalizeWorkspaceIntake(
      decodeURIComponent(normalizeMatch[1]),
      body.csvText || '',
      {
        sourceLabel: body.sourceLabel || '',
        reviewedRows: Array.isArray(body.reviewedRows) ? body.reviewedRows : null,
        sourceKind: body.sourceKind || '',
        originalFilename: body.originalFilename || ''
      }
    ));
    return;
  }

  const analyzeMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/intake-review$/);
  if (analyzeMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    const body = await readJsonBody(req);
    sendJson(res, 200, analyzeWorkspaceIntake(
      decodeURIComponent(analyzeMatch[1]),
      body.csvText || '',
      {
        sourceLabel: body.sourceLabel || '',
        sourceKind: body.sourceKind || '',
        originalFilename: body.originalFilename || ''
      }
    ));
    return;
  }

  const intakeSourceMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/intake-source$/);
  if (intakeSourceMatch) {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }

    const workspaceId = decodeURIComponent(intakeSourceMatch[1]);
    const opened = openWorkspace(workspaceId);
    sendJson(res, 200, {
      workspace_id: workspaceId,
      intake: opened.intake,
      intake_review: opened.intake_review,
      files: {
        raw_csv: getWorkspaceIntakeRawPath(workspaceId),
        source_meta: getWorkspaceIntakeMetaPath(workspaceId),
        review_json: getWorkspaceIntakeReviewJsonPath(workspaceId),
        review_md: getWorkspaceIntakeReviewMdPath(workspaceId)
      }
    });
    return;
  }

  const importFileMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/import-file$/);
  if (importFileMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    const body = await readJsonBody(req);
    sendJson(res, 200, importWorkspaceIntakeFile(
      decodeURIComponent(importFileMatch[1]),
      {
        filename: body.filename || '',
        mimeType: body.mimeType || '',
        contentBase64: body.contentBase64 || ''
      }
    ));
    return;
  }

  const diffMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/diff$/);
  if (diffMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, diffDraft(decodeURIComponent(diffMatch[1])));
    return;
  }

  const approveMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/approve$/);
  if (approveMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    const body = await readJsonBody(req);
    sendJson(res, 200, approveDraft(decodeURIComponent(approveMatch[1]), body.approvalNote || ''));
    return;
  }

  const publishMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/publish$/);
  if (publishMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    const body = await readJsonBody(req);
    sendJson(res, 200, publishWorkspace(decodeURIComponent(publishMatch[1]), body.releaseNote || ''));
    return;
  }

  const archiveMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/archive$/);
  if (archiveMatch) {
    if (req.method !== 'POST') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, archiveWorkspace(decodeURIComponent(archiveMatch[1])));
    return;
  }

  const historyMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/releases$/);
  if (historyMatch) {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, getWorkspaceReleaseHistory(decodeURIComponent(historyMatch[1])));
    return;
  }

  const readinessMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/readiness$/);
  if (readinessMatch) {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, getWorkspaceReleaseReadiness(decodeURIComponent(readinessMatch[1])));
    return;
  }

  const decisionMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/decision$/);
  if (decisionMatch) {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, getWorkspaceReleaseDecision(decodeURIComponent(decisionMatch[1])));
    return;
  }

  const deliveryMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/delivery$/);
  if (deliveryMatch) {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, getWorkspaceDeliveryCenter(decodeURIComponent(deliveryMatch[1])));
    return;
  }

  const workflowMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/workflow$/);
  if (workflowMatch) {
    if (req.method !== 'GET') {
      methodNotAllowed(res);
      return;
    }

    sendJson(res, 200, getWorkspaceOperatorWorkflow(decodeURIComponent(workflowMatch[1])));
    return;
  }

  notFound(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }

    if (pathname.startsWith('/artifacts/')) {
      const relativeArtifactPath = pathname.replace(/^\/artifacts\//, '');
      const artifactPath = path.normalize(path.join(process.cwd(), relativeArtifactPath));
      if (isAllowedArtifactPath(artifactPath) && fs.existsSync(artifactPath) && fs.statSync(artifactPath).isFile()) {
        sendFile(res, artifactPath);
        return;
      }
      notFound(res);
      return;
    }

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const safeRelativePath = requestedPath.replace(/^\/+/, '');
    const filePath = path.join(publicDir, safeRelativePath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }

    sendFile(res, path.join(publicDir, 'index.html'));
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Unknown server error'
    });
  }
});

server.listen(port, host, () => {
  console.log(`OPERATOR_CONSOLE_OK http://${host}:${port}`);
});
