#!/usr/bin/env node
/**
 * P0 验收：运行态污染与白屏防护（第一项修复的回归测试）
 *
 * 覆盖四条验收标准：
 *  ① 错误信封（`{ error: "..." }`）不进入 store —— 即使它以 HTTP 200 返回；
 *  ② 空 tabs / 缺失 content 不导致白屏；
 *  ③ 加载失败不触发破坏性保存（临时数据文件字节不变）；
 *  ④ dev 与 preview 两条接线分别通过。
 *
 * 全程使用临时数据目录（KNOWLEDGE_OS_DATA_DIR），不触碰 data/ 真源。
 *
 * 用法：node --experimental-transform-types scripts/verify-p0-guards.mjs [--keep]
 *   --keep  跑完保留临时目录与服务，便于手工排查
 *   P0_CHROME_PATH  自定义 Chromium/Chrome 可执行文件路径
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectNodePool, isErrorEnvelope } from '../src/knowledge/dataValidation.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, '.tmp-p0-acceptance-data');
// 端口注意：Fetch 规范有一份"禁用端口"名单（undici 会直接报 `bad port`），4190 正在名单内。
// 选端口时避开名单，否则会出现"服务已监听但 fetch 永远连不上"的假象。
const DEV_PORT = 4192;
const PREVIEW_PORT = 4193;
const CDP_PORT = 9333;
const KEEP = process.argv.includes('--keep');

// Vite 8 默认 host=`localhost`，实际绑定 IPv4 还是 IPv6 取决于本机解析顺序；
// Node 的 fetch 不会像 curl 那样自动回落，所以这里把三种写法都试一遍并记住能用的那个。
const HOST_CANDIDATES = (port) => [
  `http://127.0.0.1:${port}`,
  `http://[::1]:${port}`,
  `http://localhost:${port}`,
];
const bases = new Map();
const origin = (port) => bases.get(port) ?? `http://127.0.0.1:${port}`;

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function killPort(port) {
  if (process.platform !== 'win32') return;
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, { shell: 'cmd.exe' }).toString();
    const pids = new Set(
      out.split('\n').map((l) => l.trim()).filter((l) => l.includes('LISTENING'))
        .map((l) => l.split(/\s+/).pop()),
    );
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /T /F`, { shell: 'cmd.exe', stdio: 'ignore' }); } catch {}
    }
  } catch {}
}

// ── 1. 临时数据目录 ──────────────────────────────────────────────

const NODE_POOL_FIXTURE = {
  p0_ok: {
    id: 'p0_ok', label: '验收正常节点', tags: ['验收'],
    card: { nodeId: 'p0_ok', title: '验收正常节点', tabs: [{ id: 'def', label: '定义', content: '正常正文，含关键词 验收标记ALPHA' }] },
  },
  p0_emptytabs: {
    id: 'p0_emptytabs', label: '验收空Tabs节点', tags: ['验收'],
    card: { nodeId: 'p0_emptytabs', title: '验收空Tabs节点', tabs: [] },
  },
  // 复刻磁盘上真实存在的那条坏数据：第 2 个 tab 只有 id/label，没有 content
  p0_nocontent: {
    id: 'p0_nocontent', label: '验收缺字段节点', tags: ['验收'],
    card: {
      nodeId: 'p0_nocontent', title: '验收缺字段节点',
      tabs: [{ id: 'def', label: '定义', content: '正常第一个 tab' }, { id: 'def', label: '定义' }],
    },
  },
};

const ENVELOPE = { error: 'Missing file parameter.' };

function writeFixtures(pool) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'tree-data.json'),
    JSON.stringify({ id: 'p0root', name: 'P0 验收根', count: 0, nodeRef: 'p0_ok', children: [] }, null, 2));
  fs.writeFileSync(path.join(dataDir, 'node-pool.json'), JSON.stringify(pool, null, 2));
  fs.writeFileSync(path.join(dataDir, 'knowledge-edges.json'), '[]');
  fs.writeFileSync(path.join(dataDir, 'questions.json'), '[]');
  fs.writeFileSync(path.join(dataDir, 'evolution-events.json'), '[]');
}

fs.rmSync(dataDir, { recursive: true, force: true });
writeFixtures(NODE_POOL_FIXTURE);
console.log(`临时数据目录：${dataDir}`);

// ── 2. 起两条接线（dev + preview），均指向临时目录 ────────────────

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const env = {
  ...process.env,
  KNOWLEDGE_OS_DATA_DIR: dataDir,
  CODEBUDDY_SAFE_DELETE_ENABLED: '0',
};
const servers = [];

function startServer(mode, port) {
  killPort(port);
  const proc = spawn(process.execPath, [
    viteBin, mode,
    // 显式绑 IPv4：默认 host=localhost 时本机会解析成 [::1]，而 Node fetch 与 curl
    // 在双栈上的回落行为不一致，容易得出"服务已就绪但连不上"的假象。
    '--host=127.0.0.1',
    `--port=${port}`,
    '--strictPort',
  ], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logPath = path.join(root, `.tmp-p0-server-${mode}.log`);
  const stream = fs.createWriteStream(logPath);
  proc.stdout.pipe(stream);
  proc.stderr.pipe(stream);
  proc.on('error', (error) => console.error(`[${mode}] spawn 失败：`, error.message));
  proc.on('exit', (code, signal) => console.error(`[${mode}] 进程退出 code=${code} signal=${signal}`));
  servers.push({ proc, port, mode, logPath });
  return proc;
}

async function waitUp(port, timeoutMs = 120000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    for (const candidate of HOST_CANDIDATES(port)) {
      try {
        const res = await fetch(`${candidate}/`);
        if (res.status > 0) {
          bases.set(port, candidate);
          return true;
        }
        lastError = `${candidate} → HTTP ${res.status}`;
      } catch (error) {
        lastError = `${candidate} → ${error.cause?.code ?? error.message}`;
      }
    }
    await sleep(500);
  }
  console.error(`[waitUp] ${port} 未就绪，最后一次错误：${lastError}`);
  const server = servers.find((s) => s.port === port);
  if (server && fs.existsSync(server.logPath)) {
    console.error(`\n[${server.mode}:${port}] 启动日志：\n${fs.readFileSync(server.logPath, 'utf8').slice(-2000)}`);
  }
  return false;
}

startServer('dev', DEV_PORT);
startServer('preview', PREVIEW_PORT);

let chrome = null;
let cleanupDone = false;
function cleanup() {
  if (cleanupDone) return;
  cleanupDone = true;
  for (const { proc } of servers) { try { proc.kill(); } catch {} }
  if (chrome) { try { chrome.kill(); } catch {} }
  for (const port of [DEV_PORT, PREVIEW_PORT, CDP_PORT]) killPort(port);
  if (!KEEP) {
    for (const target of [dataDir, path.join(os.tmpdir(), 'p0-guards-chrome-profile')]) {
      try { fs.rmSync(target, { recursive: true, force: true }); } catch { /* 清理失败不影响结论 */ }
    }
  }
}
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

// ── 3. 极简 CDP 客户端（复用 scripts/temporal-regression.mjs 的范式） ──

class CdpTab {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];
    ws.addEventListener('message', (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(`${data.error.message}: ${data.error.data ?? ''}`));
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        this.consoleErrors.push(data.params.args?.map((a) => a.value ?? a.description).join(' '));
      } else if (data.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(data.params.exceptionDetails?.text ?? 'exception');
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      throw new Error(`evaluate failed: ${result.exceptionDetails.text} ${result.exceptionDetails.exception?.description ?? ''}`);
    }
    return result.result.value;
  }

  async goto(url) {
    const result = await this.send('Page.navigate', { url });
    this.lastNavigate = result;
    await sleep(600);
    return result;
  }

  /** 轮询等待某个表达式为真，避免用固定 sleep 猜加载时间。 */
  async waitFor(expression, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (await this.evaluate(`Boolean(${expression})`)) return true;
      } catch {}
      await sleep(250);
    }
    return false;
  }
}

function findChrome() {
  const candidates = [
    process.env.P0_CHROME_PATH,
    path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1187', 'chrome-win', 'chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  const base = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (fs.existsSync(base)) {
    for (const dir of fs.readdirSync(base)) {
      if (!dir.startsWith('chromium-')) continue;
      const exe = path.join(base, dir, 'chrome-win', 'chrome.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return null;
}

async function openTab() {
  let list = null;
  let lastError = null;
  for (const host of [`http://127.0.0.1:${CDP_PORT}`, `http://[::1]:${CDP_PORT}`]) {
    try {
      list = await (await fetch(`${host}/json/list`)).json();
      break;
    } catch (error) {
      lastError = error.cause?.code ?? error.message;
    }
  }
  if (!list) throw new Error(`CDP 未就绪：${lastError}`);
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('CDP 里没有 page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const tab = new CdpTab(ws);
  await tab.send('Runtime.enable');
  await tab.send('Page.enable');
  return tab;
}

/** 在页面上执行一次真实的搜索输入（受控组件需走原生 setter + input 事件）。 */
const SEARCH_FN = `(query) => {
  const input = document.querySelector('.database-toolbar input[type="text"]');
  if (!input) return { ok: false, reason: 'no search input' };
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, query);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return { ok: true };
}`;

const SNAP_DB = `(() => {
  const db = document.querySelector('.node-database');
  const banner = document.querySelector('.error-boundary');
  const countText = [...document.querySelectorAll('.database-toolbar span')]
    .map((n) => n.textContent.trim()).find((t) => t.includes('个节点')) ?? null;
  return JSON.stringify({
    hasDatabase: !!db,
    rowCount: document.querySelectorAll('.database-table tbody tr').length,
    countText,
    boundaryShown: !!banner,
    boundaryText: banner ? banner.textContent.slice(0, 120) : null,
    bodyText: (document.body.innerText || '').slice(0, 200),
  });
})()`;

async function main() {
  // 诊断：确认本进程的 fetch 到底能不能连回环（连不上时把完整 cause 打出来）
  if (process.env.P0_DIAG) {
    await sleep(4000);
    const diag = [];
    for (const candidate of HOST_CANDIDATES(DEV_PORT)) {
      try {
        const res = await fetch(`${candidate}/`);
        diag.push(`${candidate} → HTTP ${res.status}`);
      } catch (error) {
        const cause = error.cause;
        diag.push(`${candidate} → ${error.message} | cause=${cause ? `${cause.name}/${cause.code ?? '-'}/${cause.message}` : 'none'}`);
      }
    }
    console.error(`[diag] ${diag.join('\n[diag] ')}`);
  }

  if (!(await waitUp(DEV_PORT))) throw new Error('dev server 未就绪');
  if (!(await waitUp(PREVIEW_PORT))) throw new Error('preview server 未就绪');

  // ── 标准 ④：两条接线的 HTTP 行为一致 ──
  console.log('\n④ 接线检查');
  for (const [label, port] of [['dev', DEV_PORT], ['preview', PREVIEW_PORT]]) {
    const ok = await fetch(`${origin(port)}/api/data?file=node-pool.json`);
    const okBody = await ok.json();
    record(`${label}: GET 节点池 200 且形状合法`, ok.status === 200 && inspectNodePool(okBody).fatal === null, `HTTP ${ok.status}`);

    const noFile = await fetch(`${origin(port)}/api/data`);
    const noFileBody = await noFile.json();
    record(`${label}: 缺 file 参数 → 400 错误信封`, noFile.status === 400 && isErrorEnvelope(noFileBody), `HTTP ${noFile.status} ${JSON.stringify(noFileBody)}`);

    const missing = await fetch(`${origin(port)}/api/data?file=evolution-events.json`);
    record(`${label}: 已存在的数组切片 200`, missing.status === 200, `HTTP ${missing.status}`);

    const outside = await fetch(`${origin(port)}/api/data?file=package.json`);
    record(`${label}: 白名单外文件名 403`, outside.status === 403, `HTTP ${outside.status}`);
  }

  // ── 启动自带 Chromium ──
  const chromePath = findChrome();
  if (!chromePath) throw new Error('未找到 Chromium/Chrome 可执行文件（可用 P0_CHROME_PATH 指定）');
  console.log(`\n浏览器：${chromePath}`);
  killPort(CDP_PORT);
  chrome = spawn(chromePath, [
    '--headless=new',
    // Windows 下不加 --no-sandbox 会让 network service 崩溃（Sandbox cannot access executable），
    // 导致模块请求静默失败 → 页面永远白屏。
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${CDP_PORT}`,
    '--remote-allow-origins=*',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--user-data-dir=' + path.join(os.tmpdir(), 'p0-guards-chrome-profile'),
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });

  let tab = null;
  for (let i = 0; i < 60; i += 1) {
    await sleep(500);
    try {
      tab = await openTab();
      break;
    } catch {}
  }
  if (!tab) throw new Error('Chromium CDP 未就绪');
  await tab.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1180, deviceScaleFactor: 1, mobile: false });

  // 应用在 src/styles/main.css 里 @import 了 fonts.googleapis.com；本机测试环境访问不了外网，
  // 该请求会一直挂着不返回，把 document.readyState 永久钉在 interactive。字体是纯装饰，
  // 与本次验收的四条标准无关，这里在测试侧屏蔽掉，避免把"网络不可达"误判成"应用白屏"。
  await tab.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });

  // ── 预热：Vite dev 冷启动要为 ~100 个模块做按需编译，首次导航可能要 60s 以上 ──
  // 先跑一次不计分的预热导航把编译开销付掉，后面的断言才有稳定的时限。
  {
    const t0 = Date.now();
    await tab.goto(`${origin(DEV_PORT)}/`);
    const warmed = await tab.waitFor(`document.querySelector('.header-nav')`, 240000);
    console.log(`  [预热] Vite dev 首次编译 ${warmed ? '完成' : '（本次未在时限内完成，下面断言会再等一次）'}，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  // store 句柄提前拿到：后面 ①③ 段与"旧表达式自证"都要用，且不能依赖挂载成功。
  const bindStore = () => tab.evaluate(`(async () => {
    try {
      const m = await import('/src/store/useGraph.ts');
      window.__p0 = m.useGraphStore;
      return JSON.stringify({
        ok: typeof m.useGraphStore === 'function',
        hasGetState: typeof m.useGraphStore?.getState === 'function',
        exports: Object.keys(m).slice(0, 12),
      });
    } catch (e) { return JSON.stringify({ ok: false, error: e.message }); }
  })()`).then(JSON.parse);

  // ── 标准 ②：空 tabs / 缺 content 不白屏 ──
  console.log('\n② 渲染容错（搜索一定要经过 tab.content 这条读路径）');
  await tab.goto(`${origin(DEV_PORT)}/`);
  // 挂载点是 index.html 的 #root（ReactDOM.createRoot(document.getElementById('root'))），
  // 顶部导航 .header-nav 是外壳真正渲染出来的标志。
  const shellUp = await tab.waitFor(`document.querySelector('.header-nav')`, 60000);
  if (!shellUp) {
    const errs = [...tab.pageErrors, ...tab.consoleErrors];
    console.error(`  [诊断] 导航结果：${JSON.stringify(tab.lastNavigate)}`);
    console.error(`  [诊断] location：${await tab.evaluate('location.href', )} readyState=${await tab.evaluate('document.readyState')} title=${await tab.evaluate('document.title')}`);
    console.error(`  [诊断] 应用外壳未挂载；页面异常：\n    ${errs.join('\n    ').slice(0, 1000) || '（无）'}`);
    console.error(`  [诊断] body 前 200 字：${String(await tab.evaluate('document.body.innerText.slice(0,200)')).slice(0, 200)}`);
    const shot = await tab.send('Page.captureScreenshot', { format: 'png' });
    const shotPath = path.join(root, 'outputs', '_p0-diag-blank.png');
    fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
    console.error(`  [诊断] 截图：${shotPath}`);
  }
  record('应用外壳渲染', shellUp === true);
  record('数据加载完成（节点池已进 store）', await tab.waitFor(
    `document.querySelectorAll('.header-nav-item').length > 0`, 20000));

  // 每次 Page.navigate 都会新建 JS 上下文，window.__p0 必须在导航之后再绑。
  const store = await bindStore();
  record('可访问 store（dev 模块）', store.ok === true && store.hasGetState === true,
    JSON.stringify(store).slice(0, 200));

  await tab.evaluate(`(() => {
    const view = document.querySelector('.header-nav-item[title="Node Database"]');
    if (view) view.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  })()`);
  const dbOpen = await tab.waitFor(`document.querySelector('.node-database')`, 15000);
  if (!dbOpen) {
    const errs = [...tab.pageErrors, ...tab.consoleErrors];
    console.error(`  [诊断] 节点库未打开；页面异常：\n    ${errs.join('\n    ').slice(0, 1000) || '（无）'}`);
  }
  let snap = JSON.parse(await tab.evaluate(SNAP_DB));
  record('节点库打开且列出 3 个节点', snap.hasDatabase && snap.countText === '共 3 个节点',
    `${snap.countText ?? 'n/a'}${snap.boundaryShown ? ' | 边界已显示：' + snap.boundaryText : ''}`);

  await tab.evaluate(`(${SEARCH_FN})('验收标记ALPHA')`);
  await sleep(800);
  snap = JSON.parse(await tab.evaluate(SNAP_DB));
  record('搜索命中正常节点：页面存活且未触发错误边界',
    snap.hasDatabase && snap.boundaryShown === false && snap.countText === '共 1 个节点', snap.countText ?? 'n/a');

  // 这一条是白屏事故的原样复现路径：命中"缺 content 的 tab 所在节点"
  await tab.evaluate(`(${SEARCH_FN})('定义')`);
  await sleep(800);
  snap = JSON.parse(await tab.evaluate(SNAP_DB));
  record('搜索经过缺 content 的 tab：未白屏、未触发边界',
    snap.hasDatabase && snap.boundaryShown === false, `命中 ${snap.rowCount} 行`);

  await tab.evaluate(`(${SEARCH_FN})('')`);
  await sleep(800);
  snap = JSON.parse(await tab.evaluate(SNAP_DB));
  record('清空搜索后恢复 3 个节点', snap.countText === '共 3 个节点', snap.countText ?? 'n/a');

  const renderErrors = tab.pageErrors.filter((e) => !/ResizeObserver/.test(e));
  record('渲染过程无未捕获异常', renderErrors.length === 0, renderErrors.join(' | ').slice(0, 200));

  // 证明这组用例确实有牙齿：同一份数据喂给修复前的表达式必然抛错
  const oldExpressionThrows = await tab.evaluate(`(async () => {
    const m = await import('/src/store/useGraph.ts');
    const pool = m.useGraphStore.getState().nodePool;
    try {
      Object.values(pool).filter((n) =>
        n.label.toLowerCase().includes('x') ||
        n.card?.title?.toLowerCase().includes('x') ||
        n.card?.tabs?.some((tab) => tab.content.toLowerCase().includes('x')));
      return null;
    } catch (e) { return e.message; }
  })()`);
  record('修复前的旧表达式在同一份数据上确实抛错（用例有效性自证）',
    typeof oldExpressionThrows === 'string' && oldExpressionThrows.length > 0,
    oldExpressionThrows ?? '未抛错——说明该用例无法复现原缺陷');

  // ── 标准 ①③：错误信封不进 store / 失败加载不回写文件 ──
  console.log('\n①③ 加载拦截与写保护');
  record('store 暴露 reloadFromFiles（写保护返修后新增的重装载入口）',
    (await tab.evaluate('typeof window.__p0?.getState().reloadFromFiles')) === 'function',
    String(await tab.evaluate('typeof window.__p0?.getState().reloadFromFiles')));

  const envelopeAttempt = await tab.evaluate(`(async () => {
    const s = window.__p0;
    const before = JSON.stringify(Object.keys(s.getState().nodePool));
    // 关键场景：错误信封以 HTTP 200 返回（比真实 400 更严苛）
    const realFetch = window.fetch;
    window.__realFetch = realFetch;
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/api/data') && url.includes('node-pool.json') && (init?.method ?? 'GET') === 'GET') {
        return Promise.resolve(new Response(JSON.stringify({ error: 'Missing file parameter.' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return realFetch(input, init);
    };
    await s.getState().reloadFromFiles();
    const report = s.getState().dataLoadReport;
    const after = s.getState().nodePool;
    const poolKeys = Object.keys(after);
    const mergedEnvelope = poolKeys.includes('error') || poolKeys.some((k) => typeof after[k] !== 'object');
    return JSON.stringify({
      before,
      failures: report.failures.map((f) => ({ key: f.key, file: f.file, reason: f.reason })),
      poolKeys,
      mergedEnvelope,
      warnings: report.warnings,
    });
  })()`).then(JSON.parse);

  record('HTTP 200 的错误信封被判为加载失败',
    envelopeAttempt.failures.length === 1 && envelopeAttempt.failures[0].key === 'nodePool',
    envelopeAttempt.failures.map((f) => `${f.file}: ${f.reason}`).join(' | ').slice(0, 200));
  record('错误信封未进入节点池（池内无 error 条目）',
    envelopeAttempt.mergedEnvelope === false && !envelopeAttempt.poolKeys.includes('error'),
    `池键：${JSON.stringify(envelopeAttempt.poolKeys)}`);

  // 关键：这里必须读磁盘真身。此时 window.fetch 已经被上一条用例换成了"永远返回错误信封"的
  // 假 fetch，若再走浏览器 fetch 去比对，两次读到的都是同一个假信封，"字节不变"就成了恒真空断言。
  const poolPath = path.join(dataDir, 'node-pool.json');
  const beforeRaw = fs.readFileSync(poolPath, 'utf8');
  await tab.evaluate(`(async () => {
    // 触发节点池变更 → 走 debounce → flushPersist；被禁写的切片必须被拦住
    window.__p0.getState().addKnowledgeNode('P0 破坏性保存探针');
    await new Promise((r) => setTimeout(r, 1500));
    return true;
  })()`);
  await sleep(1500);
  const afterRaw = fs.readFileSync(poolPath, 'utf8');

  record('加载失败的切片禁止回写：磁盘文件字节完全不变',
    beforeRaw === afterRaw,
    `${Buffer.byteLength(beforeRaw)} → ${Buffer.byteLength(afterRaw)} 字节；内容头 ${afterRaw.slice(0, 60)}`);

  // 反向验证：写保护只针对失败切片，不能把保存整体关死
  const recovery = await tab.evaluate(`(async () => {
    const s = window.__p0;
    window.fetch = window.__realFetch; // 先解开 200 信封的模拟
    await s.getState().reloadFromFiles();
    const failedAfterReload = s.getState().dataLoadReport.failures.length;
    s.getState().addKnowledgeNode('P0 正常写回探针');
    await new Promise((r) => setTimeout(r, 1500));
    const text = await (await window.fetch('/api/data?file=node-pool.json')).text();
    const pool = JSON.parse(text);
    return JSON.stringify({
      failedAfterReload,
      written: Object.values(pool).some((n) => n.label === 'P0 正常写回探针'),
      keys: Object.keys(pool).length,
    });
  })()`).then(JSON.parse);

  // 内存里有不算数，磁盘上真的多出探针节点，才算写回链路整体是通的
  try {
    const diskPool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
    recovery.onDisk = Object.values(diskPool).some((n) => n.label === 'P0 正常写回探针');
    recovery.diskKeys = Object.keys(diskPool).length;
  } catch { recovery.onDisk = false; }

  record('解除拦截后正常写入生效（写保护不是全局关死）',
    recovery.failedAfterReload === 0 && recovery.written === true && recovery.onDisk === true,
    `重新装载后失败数=${recovery.failedAfterReload}，内存节点数=${recovery.keys}，磁盘已落盘=${recovery.onDisk}`);

  // ── 标准 ② 在 preview 上复跑一遍（同一份 dist 产物） ──
  console.log('\n④ preview 接线上的渲染复跑');
  await tab.goto(`${origin(PREVIEW_PORT)}/`);
  await tab.evaluate(`(() => {
    const view = document.querySelector('.header-nav-item[title="Node Database"]');
    if (view) view.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return true;
  })()`);
  await sleep(1500);
  await tab.evaluate(`(${SEARCH_FN})('定义')`);
  await sleep(900);
  const previewSnap = JSON.parse(await tab.evaluate(SNAP_DB));
  record('preview：搜索经过缺 content 的 tab 仍未白屏',
    previewSnap.hasDatabase === true && previewSnap.boundaryShown === false,
    `命中 ${previewSnap.rowCount} 行，计数 ${previewSnap.countText}`);

  // ── 输出 ──
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`通过 ${results.length - failed.length}/${results.length}`);
  if (failed.length > 0) {
    console.log('失败项：');
    for (const f of failed) console.log(`  ✖ ${f.name} — ${f.detail}`);
  }
  return failed.length === 0 ? 0 : 1;
}

let exitCode = 1;
try {
  exitCode = await main();
} catch (error) {
  console.error('\n验收脚本异常：', error);
  exitCode = 1;
} finally {
  cleanup();
}
process.exit(exitCode);
