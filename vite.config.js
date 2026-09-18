import { defineConfig, loadEnv } from 'vite';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { linkImportApi } from './scripts/import/link-import-api.mjs';
import { resolveReadOnlyDeployment } from './scripts/deploy/read-only-flag.mjs';

const DATA_DIR = path.resolve(
  process.env.KNOWLEDGE_OS_DATA_DIR
    ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
    : path.resolve(process.cwd(), 'data'),
);
const DATA_FILES = Object.freeze({
  treeData: 'tree-data.json',
  nodePool: 'node-pool.json',
  knowledgeEdges: 'knowledge-edges.json',
  questions: 'questions.json',
  evolutionEvents: 'evolution-events.json',
  versionChains: 'version-chains.json',
});
const DATA_FILE_NAMES = new Set(Object.values(DATA_FILES));
const RETRYABLE_FS_ERROR_CODES = new Set(['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN']);
const writeQueues = new Map();

function isRecordPayload(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const DATA_PAYLOAD_VALIDATORS = new Map([
  [DATA_FILES.treeData, isRecordPayload],
  [DATA_FILES.nodePool, isRecordPayload],
  [DATA_FILES.knowledgeEdges, Array.isArray],
  [DATA_FILES.questions, Array.isArray],
  [DATA_FILES.evolutionEvents, Array.isArray],
  [DATA_FILES.versionChains, Array.isArray],
]);

function isDataPayload(filename, body) {
  const validate = DATA_PAYLOAD_VALIDATORS.get(filename);
  return validate ? validate(body) : false;
}

function resolveDataFile(filename) {
  if (!DATA_FILE_NAMES.has(filename)) return null;
  const filePath = path.resolve(DATA_DIR, filename);
  const relativePath = path.relative(DATA_DIR, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }
  return filePath;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableFsError(error) {
  return error && RETRYABLE_FS_ERROR_CODES.has(error.code);
}

async function withFsRetry(action) {
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      if (!isRetryableFsError(error) || attempt === maxAttempts - 1) {
        throw error;
      }
      await delay(25 * (attempt + 1));
    }
  }
}

function createTempPath(filePath) {
  const tempName = [
    `.${path.basename(filePath)}`,
    process.pid,
    Date.now(),
    Math.random().toString(36).slice(2),
    'tmp',
  ].join('.');
  return path.join(path.dirname(filePath), tempName);
}

async function writeJsonFile(filePath, body) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = createTempPath(filePath);
  const serialized = `${JSON.stringify(body, null, 2)}\n`;

  try {
    await withFsRetry(() => fs.writeFile(tempPath, serialized, 'utf8'));
    await withFsRetry(() => fs.rename(tempPath, filePath));
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

function enqueueFileWrite(filePath, body) {
  const previousWrite = writeQueues.get(filePath) ?? Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => undefined)
    .then(() => writeJsonFile(filePath, body));

  writeQueues.set(filePath, nextWrite);
  void nextWrite
    .finally(() => {
      if (writeQueues.get(filePath) === nextWrite) {
        writeQueues.delete(filePath);
      }
    })
    .catch(() => {});

  return nextWrite;
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('error', reject);
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : null);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function dataFileApi() {
  // 追踪每个数据文件最后一次被 GET 服务的 mtime。
  // PUT 时对比：如果 mtime 已变（被外部脚本/编辑器修改），拒绝覆盖并返回 409，
  // 防止前端旧内存态静默覆盖外部改动。用户刷新浏览器即可加载最新文件。
  const servedMtimes = new Map();
  // 自己写盘记录的 mtime：fs.watch 看到相同 mtime 时不推送，避免「自己写的盘当成外部修改」
  const selfWrittenMtimes = new Map();
  // SSE 客户端：外部修改 data/*.json 时实时推给浏览器，UI 自动装载，不必刷新/重启
  const sseClients = new Set();

  const broadcast = payload => {
    const frame = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(frame);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  const startDataWatcher = () => {
    let watcher = null;
    try {
      watcher = fsSync.watch(DATA_DIR, { persistent: false }, (_eventType, rawName) => {
        const filename = typeof rawName === 'string' ? rawName : null;
        if (!filename || !DATA_FILE_NAMES.has(filename)) return;
        // 编辑器一次保存常触发多次事件：防抖后核对 mtime 再推送
        setTimeout(() => {
          const filePath = resolveDataFile(filename);
          if (!filePath) return;
          fs.stat(filePath).then(stat => {
            const selfWritten = selfWrittenMtimes.get(filename);
            if (selfWritten !== undefined && Math.abs(stat.mtimeMs - selfWritten) < 5) {
              // 自己写的盘不算外部修改。注意不删除记录：Windows 上一次 rename 会连发
              // 多个 watch 事件，删了会让后续事件被误判为外部修改（实测出现过）。
              // 记录只在下一次 PUT 时被新 mtime 覆盖，不会误伤真正的外部修改。
              return;
            }
            broadcast({ type: 'changed', file: filename, mtimeMs: stat.mtimeMs });
          }).catch(() => {}); // 文件刚好被删：忽略
        }, 80);
      });
      watcher.on('error', error => {
        console.warn('[data-file-api] fs.watch error:', error.message);
        try { watcher.close(); } catch {}
        watcher = null;
      });
    } catch (error) {
      // 数据目录不存在等场景：只降级为「无推送」，不影响读写 API
      console.warn('[data-file-api] fs.watch unavailable:', error.message);
    }
    return watcher;
  };

  const attach = server => {
    // 注意：必须先于 /api/data 注册——connect 是前缀匹配，/api/data-events 也以 /api/data 开头
    server.middlewares.use('/api/data-events', (req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write('retry: 2000\n\n');
      sseClients.add(res);
      const heartbeat = setInterval(() => {
        try {
          res.write(':hb\n\n');
        } catch {
          /* 断开时由 close 清理 */
        }
      }, 20000);
      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
      });
    });

    startDataWatcher();

    server.middlewares.use('/api/data', async (req, res, next) => {
      const method = req.method?.toUpperCase();
      const url = new URL(req.url, `http://${req.headers.host}`);
      const filename = url.searchParams.get('file');

      if (!filename) {
        sendJson(res, 400, { error: 'Missing file parameter.' });
        return;
      }

      const filePath = resolveDataFile(filename);
      if (!filePath) {
        sendJson(res, 403, { error: 'Access denied.' });
        return;
      }

      try {
        if (method === 'GET') {
          try {
            const file = await fs.readFile(filePath, 'utf8');
            const stat = await fs.stat(filePath);
            servedMtimes.set(filename, stat.mtimeMs);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(file);
          } catch (error) {
            if (error && error.code === 'ENOENT') {
              sendJson(res, 404, { error: `File ${filename} not found.` });
              return;
            }
            throw error;
          }
          return;
        }

        if (method === 'PUT') {
          // 冲突检测：文件被外部修改后，拒绝旧内存态的覆盖
          try {
            const stat = await fs.stat(filePath);
            const servedMtime = servedMtimes.get(filename);
            if (servedMtime !== undefined && stat.mtimeMs > servedMtime + 1) {
              sendJson(res, 409, {
                error: `File ${filename} was modified externally (mtime ${stat.mtimeMs} > served ${servedMtime}). Refresh the browser to load the latest data, then retry.`,
                code: 'EXTERNAL_MODIFICATION',
              });
              return;
            }
          } catch {
            // 文件不存在（首次创建），允许写入
          }

          const body = await readJsonBody(req);
          if (!isDataPayload(filename, body)) {
            sendJson(res, 400, { error: `Invalid payload for ${filename}.` });
            return;
          }

          await enqueueFileWrite(filePath, body);
          // 写入后更新追踪的 mtime（同时登记为自写盘，供 fs.watch 抑制误报）
          try {
            const stat = await fs.stat(filePath);
            servedMtimes.set(filename, stat.mtimeMs);
            selfWrittenMtimes.set(filename, stat.mtimeMs);
          } catch {}
          sendJson(res, 200, { ok: true, file: filename });
          return;
        }

        if (method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Allow', 'GET, PUT, OPTIONS');
          res.end();
          return;
        }

        sendJson(res, 405, { error: 'Method not allowed.' });
      } catch (error) {
        console.error('[data-file-api] Request failed', error);
        sendJson(res, 500, { error: 'Data file API request failed.' });
      }
    });
  };

  return {
    name: 'data-file-api',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig(({ mode, command }) => {
  const importEnv = {
    ...process.env,
    ...loadEnv(mode, process.cwd(), 'KNOWLEDGE_OS_'),
  };
  // 只读部署标记：判定规则见 scripts/deploy/read-only-flag.mjs，
  // 消费点见 src/knowledge/deploymentMode.ts。构建期注入字面量，不做运行时探测。
  const readOnlyDeployment = resolveReadOnlyDeployment(importEnv);
  if (command === 'build') {
    console.log(`[config] 只读部署标记 __KNOWLEDGE_OS_READ_ONLY__ = ${readOnlyDeployment}`);
  }
  return {
    define: {
      __KNOWLEDGE_OS_READ_ONLY__: JSON.stringify(readOnlyDeployment),
    },
    plugins: [dataFileApi(), linkImportApi(process.cwd(), importEnv)],
    server: {
      watch: {
        ignored: ['**/data/**'],
      },
    },
    optimizeDeps: {
      // mermaid 为动态 import，预先打包避免首次渲染图表时触发依赖发现导致整页刷新
      include: ['mermaid'],
    },
    build: {
      rollupOptions: {
        output: {
          // rolldown 要求函数形式：把 React 运行时拆成稳定命名的供应商块
          manualChunks(id) {
            const normalized = id.replace(/\\/g, '/');
            if (
              normalized.includes('/node_modules/react-dom/')
              || normalized.includes('/node_modules/react/')
              || normalized.includes('/node_modules/scheduler/')
              || normalized.includes('/node_modules/zustand/')
            ) {
              return 'vendor-react';
            }
            return undefined;
          },
        },
      },
    },
  };
});

