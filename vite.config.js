import { defineConfig } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'data');

function isDataPayload(filename, body) {
  if (!body || typeof body !== 'object') return false;
  // Basic validation: must be an object or array depending on the file
  if (filename === 'knowledge-edges.json' || filename === 'questions.json' || filename === 'subsystems.json') {
    return Array.isArray(body);
  }
  return true; // Simplified for other files
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
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
  const attach = server => {
    server.middlewares.use('/api/data', async (req, res, next) => {
      const method = req.method?.toUpperCase();
      const url = new URL(req.url, `http://${req.headers.host}`);
      const filename = url.searchParams.get('file');

      if (!filename) {
        sendJson(res, 400, { error: 'Missing file parameter.' });
        return;
      }

      const filePath = path.join(DATA_DIR, filename);
      if (!filePath.startsWith(DATA_DIR)) {
        sendJson(res, 403, { error: 'Access denied.' });
        return;
      }

      try {
        if (method === 'GET') {
          try {
            const file = await fs.readFile(filePath, 'utf8');
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
          const body = await readJsonBody(req);
          if (!isDataPayload(filename, body)) {
            sendJson(res, 400, { error: `Invalid payload for ${filename}.` });
            return;
          }

          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
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
        next(error);
      }
    });
  };

  return {
    name: 'data-file-api',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  plugins: [dataFileApi()],
  server: {
    watch: {
      ignored: ['**/data/**'],
    },
  },
});

