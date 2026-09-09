/**
 * 数据中间件烟雾测试：在临时目录上启动 vite preview，验证 GET/PUT/409/403 全链路。
 * 不碰 data/ 真实文件——通过 KNOWLEDGE_OS_DATA_DIR 指向 .tmp 目录。
 *
 * 运行：node scripts/smoke-data-api.mjs
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, '.tmp-smoke-data');
const port = 4187;

function sh(cmd) {
  return execSync(cmd, { cwd: root, shell: process.platform === 'win32' ? 'cmd.exe' : 'sh' }).toString().trim();
}

// 上次异常退出可能残留占用端口的进程：跑之前先清场
function freePort() {
  if (process.platform !== 'win32') return;
  try {
    const lines = sh(`netstat -ano | findstr ":${port} "`).split('\n').map((l) => l.trim()).filter((l) => l.includes('LISTENING'));
    const pids = new Set(lines.map((l) => l.split(/\s+/).pop()));
    for (const pid of pids) {
      try { sh(`taskkill /PID ${pid} /T /F`); console.log(`已清理残留进程 ${pid}`); } catch {}
    }
  } catch {}
}
freePort();

async function request(method, file, body) {
  const res = await fetch(`http://localhost:${port}/api/data?file=${file}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const failures = [];
function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? '✔' : '✖'} ${name}: ${actual}${ok ? '' : ` (期望 ${expected})`}`);
  if (!ok) failures.push(name);
}

// 1. 准备临时数据目录（含合法种子数据）
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'tree-data.json'), JSON.stringify({ id: 'root', name: 'smoke' }));
fs.writeFileSync(path.join(dataDir, 'questions.json'), JSON.stringify([]));

// 2. 启动 dev 服务器（独立进程，环境变量指向临时目录）
// 用 dev 而非 preview：两者挂同一套 dataFileApi 中间件（configureServer / configurePreviewServer），
// 而 preview 启动需全量 externalize-deps 预打包（本机实测 3.5 分钟），dev 有缓存秒起。
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const server = spawn(
  process.execPath,
  [viteBin, 'dev', `--port=${port}`, '--strictPort'],
  { cwd: root, env: { ...process.env, KNOWLEDGE_OS_DATA_DIR: dataDir }, stdio: ['ignore', 'ignore', 'inherit'], detached: false },
);

try {
  // 等服务器就绪（dev 冷启动含依赖扫描，一般 < 30s）
  let up = false;
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.status > 0) { up = true; break; }
    } catch {}
  }
  if (!up) throw new Error('dev server 未在 120s 内就绪');

  // 3. 全链路验证
  const got = await request('GET', 'tree-data.json');
  check('GET 存在文件', got.status, 200);
  check('GET 返回内容', got.json?.id, 'root');

  // 白名单外文件名：无论存在与否一律 403（resolveDataFile 不认就拒绝）
  const notAllowed = await request('GET', 'missing.json');
  check('GET 白名单外文件名被 403 拒绝', notAllowed.status, 403);

  // 白名单内但磁盘上没有的文件：404
  const notFound = await request('GET', 'node-pool.json');
  check('GET 白名单内未创建文件返回 404', notFound.status, 404);

  const forbidden = await request('PUT', '../package.json', {});
  check('路径穿越被 403 拒绝', forbidden.status, 403);

  // 非法载荷校验须在 mtime 冲突检测之前发生——用尚未被 GET 过的 evolution-events.json
  const badPayload = await request('PUT', 'evolution-events.json', { not: 'an-array' });
  check('PUT 非法载荷（evolution-events 须数组）被 400 拒绝', badPayload.status, 400);

  const put = await request('PUT', 'questions.json', [{ id: 'q1', text: 'smoke' }]);
  check('PUT 合法载荷', put.status, 200);
  check('PUT 落盘生效', JSON.parse(fs.readFileSync(path.join(dataDir, 'questions.json'), 'utf8')).length, 1);

  // 外部修改文件后 PUT 旧内存态应被 409 拒绝（mtime 冲突检测）
  const now = Date.now() / 1000 + 10;
  fs.utimesSync(path.join(dataDir, 'questions.json'), now, now);
  const conflict = await request('PUT', 'questions.json', [{ id: 'q2' }]);
  check('外部修改后 PUT 被 409 拒绝', conflict.status, 409);
} finally {
  server.kill();
  // Windows 下 vite preview 派生子进程，按端口找 PID 清场
  try {
    const pid = execSync(
      `netstat -ano | findstr ":${port}" | findstr "LISTENING"`,
      { shell: 'cmd.exe' },
    ).toString().trim().split(/\s+/).pop();
    if (pid) execSync(`taskkill /PID ${pid} /T /F`, { shell: 'cmd.exe' });
  } catch {}
}

fs.rmSync(dataDir, { recursive: true, force: true });
console.log(failures.length === 0 ? '\n烟雾测试全部通过' : `\n失败 ${failures.length} 项: ${failures.join(', ')}`);
process.exit(failures.length === 0 ? 0 : 1);
