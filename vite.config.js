import { defineConfig } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';

const TREE_FILE = path.resolve(process.cwd(), 'data/universe-tree.json');

function isTreeNode(value) {
  if (!value || typeof value !== 'object') return false;

  const children = value.children;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.count === 'number' &&
    typeof value.icon === 'string' &&
    (children === undefined || (Array.isArray(children) && children.every(isTreeNode)))
  );
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

function universeTreeFileApi() {
  const attach = server => {
    server.middlewares.use('/api/universe-tree', async (req, res, next) => {
      const method = req.method?.toUpperCase();

      try {
        if (method === 'GET') {
          try {
            const file = await fs.readFile(TREE_FILE, 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(file);
          } catch (error) {
            if (error && error.code === 'ENOENT') {
              sendJson(res, 404, { error: 'Universe tree file has not been created yet.' });
              return;
            }

            throw error;
          }
          return;
        }

        if (method === 'PUT') {
          const tree = await readJsonBody(req);
          if (!isTreeNode(tree)) {
            sendJson(res, 400, { error: 'Invalid universe tree payload.' });
            return;
          }

          await fs.mkdir(path.dirname(TREE_FILE), { recursive: true });
          await fs.writeFile(TREE_FILE, `${JSON.stringify(tree, null, 2)}\n`, 'utf8');
          sendJson(res, 200, { ok: true, file: path.relative(process.cwd(), TREE_FILE) });
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
    name: 'universe-tree-file-api',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

export default defineConfig({
  plugins: [universeTreeFileApi()],
});
