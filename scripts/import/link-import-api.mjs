import { importWebLink } from './web-link-importer.mjs';
import { documentKindForFile, importDocument } from './document-importer.mjs';
import { aiOrganizerCapabilities } from './ai-organizer.mjs';

const MAX_REQUEST_BYTES = 32 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

class HttpError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sendJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(new Error('请求内容过大'));
        request.destroy();
        return;
      }
      chunks.push(buffer);
    });
    request.on('error', reject);
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('请求格式无效'));
      }
    });
  });
}

function readBinaryBody(request) {
  const declaredLength = Number(request.headers['content-length'] ?? 0);
  if (declaredLength > MAX_DOCUMENT_BYTES) {
    throw new HttpError('文档不能超过 20 MB', 413);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let exceeded = false;
    request.on('data', (chunk) => {
      if (exceeded) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_DOCUMENT_BYTES) {
        exceeded = true;
        chunks.length = 0;
        reject(new HttpError('文档不能超过 20 MB', 413));
        return;
      }
      chunks.push(buffer);
    });
    request.on('error', reject);
    request.on('end', () => {
      if (!exceeded) resolve(Buffer.concat(chunks));
    });
  });
}

function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('请求格式无效');
  }
  if (typeof body.url !== 'string' || !body.url.trim()) {
    throw new Error('请输入要导入的网页链接');
  }
  if (typeof body.parentTreeNodeId !== 'string' || !body.parentTreeNodeId.trim()) {
    throw new Error('请选择要挂载的项目目录');
  }
  if (body.translate !== undefined && typeof body.translate !== 'boolean') {
    throw new Error('翻译选项无效');
  }
  if (body.useAi !== undefined && typeof body.useAi !== 'boolean') {
    throw new Error('AI 整理选项无效');
  }
  return {
    url: body.url.trim(),
    parentTreeNodeId: body.parentTreeNodeId,
    translate: body.translate !== false,
    useAi: body.useAi === true,
  };
}

export function validateDocumentRequest(request) {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const fileName = requestUrl.searchParams.get('fileName')?.trim() ?? '';
  const parentTreeNodeId = requestUrl.searchParams.get('parentTreeNodeId')?.trim() ?? '';
  const useAiValue = requestUrl.searchParams.get('useAi');
  documentKindForFile(fileName);
  if (!parentTreeNodeId) throw new HttpError('请选择要挂载的项目目录');
  if (useAiValue !== null && useAiValue !== 'true' && useAiValue !== 'false') {
    throw new HttpError('AI 整理选项无效');
  }
  return {
    fileName,
    parentTreeNodeId,
    useAi: useAiValue === 'true',
  };
}

export function linkImportApi(projectRoot, runtimeEnv = process.env) {
  let importQueue = Promise.resolve();

  function enqueueImport(action) {
    const next = importQueue
      .catch(() => undefined)
      .then(action);
    importQueue = next;
    return next;
  }

  const attach = (server) => {
    server.middlewares.use('/api/import-link', async (request, response) => {
      const method = request.method?.toUpperCase();
      if (method === 'OPTIONS') {
        response.statusCode = 204;
        response.setHeader('Allow', 'GET, POST, OPTIONS');
        response.end();
        return;
      }
      if (method === 'GET') {
        sendJson(response, 200, { ai: aiOrganizerCapabilities(runtimeEnv) });
        return;
      }
      if (method !== 'POST') {
        sendJson(response, 405, { error: 'Method not allowed.' });
        return;
      }

      try {
        const body = validateRequest(await readJsonBody(request));
        sendJson(response, 200, await enqueueImport(() => importWebLink({
          ...body,
          projectRoot,
          aiEnv: runtimeEnv,
        })));
      } catch (error) {
        console.error('[link-import-api] Import failed', error);
        sendJson(response, 400, { error: error instanceof Error ? error.message : '链接导入失败' });
      }
    });

    server.middlewares.use('/api/import-document', async (request, response) => {
      const method = request.method?.toUpperCase();
      if (method === 'OPTIONS') {
        response.statusCode = 204;
        response.setHeader('Allow', 'GET, POST, OPTIONS');
        response.end();
        return;
      }
      if (method === 'GET') {
        sendJson(response, 200, {
          ai: aiOrganizerCapabilities(runtimeEnv),
          maxBytes: MAX_DOCUMENT_BYTES,
          extensions: ['.pdf', '.md', '.markdown'],
        });
        return;
      }
      if (method !== 'POST') {
        sendJson(response, 405, { error: 'Method not allowed.' });
        return;
      }

      try {
        const metadata = validateDocumentRequest(request);
        const buffer = await readBinaryBody(request);
        sendJson(response, 200, await enqueueImport(() => importDocument({
          ...metadata,
          buffer,
          projectRoot,
          aiEnv: runtimeEnv,
        })));
      } catch (error) {
        console.error('[document-import-api] Import failed', error);
        const statusCode = error instanceof HttpError ? error.statusCode : 400;
        sendJson(response, statusCode, {
          error: error instanceof Error ? error.message : '文档导入失败',
        });
      }
    });
  };

  return {
    name: 'link-import-api',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
