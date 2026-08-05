import { importWebLink } from './web-link-importer.mjs';
import { documentKindForFile, importDocument } from './document-importer.mjs';
import { aiOrganizerCapabilities } from './ai-organizer.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { importJavaSource } from './java-source-importer.mjs';

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
  const translateValue = requestUrl.searchParams.get('translate');
  const useAiValue = requestUrl.searchParams.get('useAi');
  documentKindForFile(fileName);
  if (!parentTreeNodeId) throw new HttpError('请选择要挂载的项目目录');
  if (translateValue !== null && translateValue !== 'true' && translateValue !== 'false') {
    throw new HttpError('翻译选项无效');
  }
  if (useAiValue !== null && useAiValue !== 'true' && useAiValue !== 'false') {
    throw new HttpError('AI 整理选项无效');
  }
  return {
    fileName,
    parentTreeNodeId,
    translate: translateValue !== 'false',
    useAi: useAiValue === 'true',
  };
}

export function validateJavaSourceRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError('Java 源码导入请求格式无效');
  }
  if (typeof body.source !== 'string' || !body.source.trim()) {
    throw new HttpError('请输入 Java 源码路径');
  }
  const source = body.source.trim();
  if (source.length > 2_048) {
    throw new HttpError('Java 源码路径过长');
  }
  if (typeof body.parentTreeNodeId !== 'string' || !body.parentTreeNodeId.trim()) {
    throw new HttpError('请选择要挂载的项目目录');
  }
  if (body.translate !== undefined && typeof body.translate !== 'boolean') {
    throw new HttpError('翻译选项无效');
  }
  return {
    source,
    parentTreeNodeId: body.parentTreeNodeId.trim(),
    translate: body.translate !== false,
  };
}

function installedJdkHomes() {
  const jdksDirectory = path.join(os.homedir(), '.jdks');
  try {
    return fs.readdirSync(jdksDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(jdksDirectory, entry.name))
      .filter((directory) => fs.existsSync(path.join(
        directory,
        'bin',
        process.platform === 'win32' ? 'java.exe' : 'java',
      )))
      .map((directory) => {
        const release = fs.readFileSync(path.join(directory, 'release'), 'utf8');
        const version = release.match(/^JAVA_VERSION="(\d+)/m)?.[1] ?? '0';
        return { directory, featureVersion: Number.parseInt(version, 10) || 0 };
      })
      .filter((entry) => entry.featureVersion >= 17)
      .sort((left, right) => right.featureVersion - left.featureVersion
        || right.directory.localeCompare(left.directory, undefined, { numeric: true }))
      .map((entry) => entry.directory);
  } catch {
    return [];
  }
}

function discoverJavaHome(runtimeEnv) {
  const configured = String(runtimeEnv.KNOWLEDGE_OS_JAVA_HOME ?? '').trim();
  if (configured) return configured;
  const installed = installedJdkHomes();
  if (installed.length > 0) return installed[0];
  return String(runtimeEnv.JAVA_HOME ?? '').trim();
}

function discoverJavaSource(runtimeEnv, javaHome) {
  const configured = String(
    runtimeEnv.KNOWLEDGE_OS_JAVA_SOURCE
    ?? runtimeEnv.KNOWLEDGE_OS_JDK_SOURCE
    ?? '',
  ).trim();
  if (configured) return configured;
  if (!javaHome || !fs.existsSync(path.join(javaHome, 'lib', 'src.zip'))) return '';
  return `${javaHome}!${path.sep}java.base${path.sep}java${path.sep}util`;
}

function javaSourceCapabilities(runtimeEnv) {
  const javaHome = discoverJavaHome(runtimeEnv);
  return {
    available: Boolean(javaHome),
    defaultSource: discoverJavaSource(runtimeEnv, javaHome),
    supportedSources: ['.java', 'directory', '.zip', '.jar', 'JDK src.zip'],
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
          extensions: ['.pdf', '.md', '.markdown', '.txt', '.html', '.htm', '.docx'],
          javaSource: javaSourceCapabilities(runtimeEnv),
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

    server.middlewares.use('/api/import-java-source', async (request, response) => {
      const method = request.method?.toUpperCase();
      if (method === 'OPTIONS') {
        response.statusCode = 204;
        response.setHeader('Allow', 'GET, POST, OPTIONS');
        response.end();
        return;
      }
      if (method === 'GET') {
        sendJson(response, 200, javaSourceCapabilities(runtimeEnv));
        return;
      }
      if (method !== 'POST') {
        sendJson(response, 405, { error: 'Method not allowed.' });
        return;
      }

      try {
        const body = validateJavaSourceRequest(await readJsonBody(request));
        const summary = await enqueueImport(() => importJavaSource({
          ...body,
          projectRoot,
          javaHome: discoverJavaHome(runtimeEnv),
          dryRun: false,
          translationEngine: 'google',
          translationConcurrency: 6,
        }));
        sendJson(response, 200, summary);
      } catch (error) {
        console.error('[java-source-import-api] Import failed', error);
        const statusCode = error instanceof HttpError ? error.statusCode : 400;
        sendJson(response, statusCode, {
          error: error instanceof Error ? error.message : 'Java 源码导入失败',
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
