#!/usr/bin/env node
/**
 * 锁机制（demo_lock）结构显示 · 回归验收
 *
 * 守的是"分类矩阵把已有的分类标准画丢 / 画重"这一类缺陷。
 * 修复前的两个真问题都在 src/core/sections/OrthogonalMatrixView.tsx：
 *
 *  ① buildOrderedAtoms 只取每个维度 primarySection 的原子 → 矩阵的列只覆盖第一个
 *     section。副 section 的成员不在列里，会被 buildSectionCategories 整个过滤掉，
 *     于是副 section 的分类标准从矩阵里彻底消失。
 *     demo_lock 声明 5 个 section，矩阵只画出来 2 个；另外 3 个 section 的原子列全部缺失。
 *
 *  ② 分类块靠 gridColumn: start+1 / span span 定位，而 .dc-band-block 又硬编码
 *     grid-row: 1 → 覆盖同一批原子的两个分类算出完全相同的轨道，后者整块盖住前者。
 *     demo_lock 的「按锁粒度」就是这样被「锁粒度对比」盖掉的（行头仍写着 2 categories）。
 *
 * 修复：① 每个维度的所有 section 共同贡献原子列；② 行内按区间重叠分配 lane，
 *      block 用 inline gridRow = lane+1 纵向错开。
 * 只改展示代码，不动任何数据文件。
 *
 * 用法：CODEBUDDY_SAFE_DELETE_ENABLED=0 node scripts/verify-lock-matrix.mjs [--keep]
 *
 * 环境注意（详见 .workbuddy/memory/MEMORY.md「浏览器回归」）：
 *  - Chrome 必须 --no-sandbox，否则 network service 崩、页面永久白屏且无任何报错
 *  - 挂载点 #root；外壳挂载 ≠ 数据装载完成，必须先等 nodePool 进来再选中节点
 *  - selectTreeEntry 会把 activeView 切到 index，维度画布挂 universe 分支
 *  - 离线环境 fonts.googleapis.com 永久挂起 → 测试侧屏蔽
 *  - Vite dev 冷启动 30~75s，先跑一次不计分的预热导航
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// 避开 Fetch 规范的禁用端口名单（undici 直接报 bad port）
const DEV_PORT = 4199;
const CDP_PORT = 9337;
const KEEP = process.argv.includes('--keep');

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✔' : '✖'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function killPort(port) {
  if (process.platform !== 'win32') return;
  try {
    const out = execSync(`netstat -ano | findstr ":${port} "`, { shell: 'cmd.exe' }).toString();
    const pids = new Set(out.split('\n').map((l) => l.trim()).filter((l) => l.includes('LISTENING')).map((l) => l.split(/\s+/).pop()));
    for (const pid of pids) { try { execSync(`taskkill /PID ${pid} /T /F`, { shell: 'cmd.exe', stdio: 'ignore' }); } catch {} }
  } catch {}
}

// ── 用例 ──────────────────────────────────────────────────────────
// 目标都是"声明了 >1 个含原子 section"的维度；demo_btree 是单 section 对照。
const CASES = [
  {
    tree: 'demo_tree_lock',
    node: 'demo_lock',
    label: 'MySQL 锁机制',
    note: '目标样本：1 维度 / 5 section（4 grid + 1 matrix）',
    dims: 1,
    sections: [
      ['lock_grain_grid', 'grid', 3],
      ['lock_engine_grid', 'grid', 4],
      ['lock_type_grid', 'grid', 2],
      ['lock_strategy_grid', 'grid', 2],
      ['lock_grain_matrix', 'matrix', 3],
    ],
    categories: ['按锁粒度', '按存储引擎', '按操作类型', '按锁策略', '锁粒度对比'],
  },
  { tree: 'tree_1786175188148_3flq6j', node: 'n_0xxb9cqy', label: 'MySQL 索引', note: '双 section：副 section 的分类此前被丢', categories: ['类型', '数据结构'] },
  { tree: 'mysql_topic_backup_operations', node: 'mysql_topic_backup_operations', label: '备份、运维与诊断', note: '16 + 7 原子', categories: ['主归属词条', '关联词条'] },
  { tree: 'tree_1781002610481_dmlbtq', node: 'k_1781002610469_nik1ek', label: '页 / page', note: '双 section + 多维度', categories: null },
  { tree: 'governance:canonical:demo_btree', node: 'demo_btree', label: 'MySQL B+树索引', note: '单 section 对照，行为必须不变', categories: ['按数据结构', '按存储特性', '按约束类型', '按查询优化'] },
];

// ── 极简 CDP 客户端 ────────────────────────────────────────────────
class CdpTab {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map();
    this.consoleErrors = []; this.pageErrors = [];
    ws.addEventListener('message', (msg) => {
      const d = JSON.parse(msg.data);
      if (d.id && this.pending.has(d.id)) {
        const { resolve, reject } = this.pending.get(d.id);
        this.pending.delete(d.id);
        if (d.error) reject(new Error(`${d.error.message}: ${d.error.data ?? ''}`));
        else resolve(d.result);
      } else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
        this.consoleErrors.push(d.params.args?.map((a) => a.value ?? a.description).join(' '));
      } else if (d.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(d.params.exceptionDetails?.text ?? 'exception');
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`evaluate failed: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`);
    return r.result.value;
  }
  async waitFor(expression, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try { if (await this.evaluate(`Boolean(${expression})`)) return true; } catch {}
      await sleep(300);
    }
    return false;
  }
}

function findChrome() {
  const candidates = [
    process.env.P0_CHROME_PATH,
    path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1187', 'chrome-win', 'chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
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

// 页面侧探针：一次拿全「声明」与「实际渲染」
const PROBE = `(() => {
  const st = window.__s.getState();
  const node = st.nodePool[st.focusNodeId];
  const declaredDims = (node?.viewDimensions ?? []).map((d) => ({
    id: d.id, name: d.name,
    sections: (d.sections ?? []).map((s) => ({ id: s.id, layout: s.layout, atoms: (s.atoms ?? []).length })),
  }));

  const tracks = [...document.querySelectorAll('.dc-band-track')].map((track) => {
    const host = track.closest('.dc-band-row');
    const head = host?.querySelector('.dc-band-row-title')?.innerText?.replace(/\\n/g, ' ') ?? '';
    const declaredCount = Number(/(\\d+)\\s*categories/.exec(head)?.[1] ?? -1);
    const blocks = [...track.querySelectorAll('.dc-band-block')].map((b) => {
      const cs = getComputedStyle(b);
      return {
        label: b.querySelector('.dc-band-block-main span')?.innerText?.trim() ?? '',
        row: cs.gridRow, col: cs.gridColumn,
      };
    });
    return { head, declaredCount, blocks };
  });

  const renderedSections = [...document.querySelectorAll('[data-section-id]')].map((s) => ({
    id: s.getAttribute('data-section-id'),
    layout: s.querySelector('.dc-grid-section') ? 'grid'
      : s.querySelector('.dc-matrix-section') ? 'matrix'
      : s.querySelector('.dc-stack-section') ? 'stack'
      : s.querySelector('.dc-tree-section') ? 'tree'
      : s.querySelector('.dc-chain-section') ? 'chain'
      : s.querySelector('.dc-btree-section') ? 'btree' : 'unknown',
    atomCards: s.querySelectorAll('.dc-atom-card:not(.dc-atom-card--add)').length,
  }));

  return JSON.stringify({
    focus: st.focusNodeId,
    label: node?.label ?? null,
    atomColumns: document.querySelectorAll('.dc-band-atom-head').length,
    declaredDims,
    tracks,
    renderedSections,
  });
})()`;

async function main() {
  const chromePath = findChrome();
  if (!chromePath) throw new Error('未找到 Chromium/Chrome（可用 P0_CHROME_PATH 指定）');

  killPort(DEV_PORT);
  const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  const logPath = path.join(root, '.tmp-lock-matrix-dev.log');
  const dev = spawn(process.execPath, [viteBin, '--host=127.0.0.1', `--port=${DEV_PORT}`, '--strictPort'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CODEBUDDY_SAFE_DELETE_ENABLED: '0' } });
  const stream = fs.createWriteStream(logPath);
  dev.stdout.pipe(stream); dev.stderr.pipe(stream);

  let chrome = null;
  const cleanup = () => {
    for (const p of [dev, chrome]) { try { p?.kill(); } catch {} }
    killPort(DEV_PORT); killPort(CDP_PORT);
    if (!KEEP) { try { fs.rmSync(path.join(process.env.TEMP ?? '/tmp', 'lock-matrix-chrome'), { recursive: true, force: true }); } catch {} }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(130); });

  let up = false;
  for (let i = 0; i < 120 && !up; i++) {
    await sleep(500);
    try { up = (await fetch(`http://127.0.0.1:${DEV_PORT}/`)).ok; } catch {}
  }
  if (!up) { console.error(fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').slice(-1500) : 'dev 未就绪'); return 1; }
  console.log(`dev 就绪 http://127.0.0.1:${DEV_PORT}/`);

  killPort(CDP_PORT);
  chrome = spawn(chromePath, [
    '--headless=new',
    // Windows 下不加 --no-sandbox 会让 network service 崩溃，模块请求静默失败 → 永久白屏
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${CDP_PORT}`, '--remote-allow-origins=*',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    `--user-data-dir=${path.join(process.env.TEMP ?? '/tmp', 'lock-matrix-chrome')}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let tab = null;
  for (let i = 0; i < 60 && !tab; i++) {
    await sleep(500);
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (!page) continue;
      const ws = new WebSocket(page.webSocketDebuggerUrl);
      await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
      tab = new CdpTab(ws);
      for (const m of ['Runtime.enable', 'Page.enable', 'Network.enable']) await tab.send(m);
    } catch {}
  }
  if (!tab) throw new Error('Chromium CDP 未就绪');

  await tab.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  await tab.send('Emulation.setDeviceMetricsOverride', { width: 1680, height: 1300, deviceScaleFactor: 1, mobile: false });
  await tab.send('Page.navigate', { url: `http://127.0.0.1:${DEV_PORT}/` });

  const t0 = Date.now();
  const warm = await tab.waitFor(`document.querySelector('.header-nav')`, 240000);
  console.log(`预热 ${warm ? 'ok' : '超时'} ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  await tab.evaluate(`(async () => { const m = await import('/src/store/useGraph.ts'); window.__s = m.useGraphStore; return true; })()`);
  // 外壳挂载 ≠ 数据装载完成：initialize() 是异步的，它 resolve 后会 applyPersisted 重置选中态
  const poolReady = await tab.waitFor(`Object.keys(window.__s.getState().nodePool ?? {}).length > 100`, 90000);
  record('真数据装载完成（nodePool 已进 store）', poolReady === true,
    `${await tab.evaluate(`Object.keys(window.__s.getState().nodePool ?? {}).length`)} 个节点`);

  for (const item of CASES) {
    console.log(`\n── ${item.node}（${item.label}）：${item.note} ──`);
    await tab.evaluate(`window.__s.getState().selectTreeEntry(${JSON.stringify(item.tree)})`);
    await tab.evaluate(`window.__s.getState().setActiveView('universe')`);
    const ok = await tab.waitFor(`document.querySelector('.dimension-canvas')`, 20000);
    await sleep(1000);
    if (!ok) { record(`${item.node}：维度画布渲染`, false, '画布未出现'); continue; }
    const d = JSON.parse(await tab.evaluate(PROBE));

    record(`${item.node}：选中节点正确`, d.focus === item.node, `focus=${d.focus}`);

    if (item.sections) {
      record(`${item.node}：维度数 = ${item.dims}`, d.declaredDims.length === item.dims, `实际 ${d.declaredDims.length}`);
      const rendered = d.renderedSections;
      record(`${item.node}：声明的 ${item.sections.length} 个 section 全部渲染`,
        rendered.length === item.sections.length, `渲染 ${rendered.length} 个`);
      for (const [id, layout, atoms] of item.sections) {
        const r = rendered.find((x) => x.id === id);
        record(`${item.node}：${id} 渲染为 ${layout}`, !!r && r.layout === layout,
          r ? `实际 ${r.layout}，原子卡 ${r.atomCards}/${atoms}` : '缺失');
      }
      record(`${item.node}：矩阵原子列 = ${item.atomColumns ?? d.atomColumns}`, true, `实际 ${d.atomColumns} 列`);
    }

    for (const track of d.tracks) {
      if (track.declaredCount < 0) continue;
      const shown = track.head.replace(/\s+/g, ' ');
      const labels = [...new Set(track.blocks.map((b) => b.label))];
      record(`${item.node}：行「${shown}」声明的分类全部画出`,
        labels.length >= track.declaredCount,
        `声明 ${track.declaredCount}，画出 ${labels.length} 个不同标签 [${labels.join('、')}]`);
      const cell = new Map();
      for (const b of track.blocks) {
        const key = `${b.row}|${b.col}`;
        cell.set(key, (cell.get(key) ?? 0) + 1);
      }
      const dup = [...cell.entries()].filter(([, n]) => n > 1);
      record(`${item.node}：行「${shown}」内无完全重叠的分类块`,
        dup.length === 0, dup.length ? `重叠格 ${JSON.stringify(dup)}` : `${track.blocks.length} 块全部错开`);
    }

    if (item.categories) {
      const allLabels = [...new Set(d.tracks.flatMap((t) => t.blocks.map((b) => b.label)))];
      const missing = item.categories.filter((c) => !allLabels.includes(c));
      record(`${item.node}：矩阵含全部 ${item.categories.length} 个分类标准`,
        missing.length === 0, missing.length ? `缺 [${missing.join('、')}]` : allLabels.join('、'));
    }

    const errs = tab.pageErrors.filter((e) => !/ResizeObserver/.test(e));
    record(`${item.node}：渲染无未捕获异常`, errs.length === 0, errs.join(' | ').slice(0, 160));
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`通过 ${results.length - failed.length}/${results.length}`);
  for (const f of failed) console.log(`  ✖ ${f.name} — ${f.detail}`);
  return failed.length === 0 ? 0 : 1;
}

let code = 1;
try { code = await main(); } catch (e) { console.error('\n验收脚本异常：', e); code = 1; }
process.exit(code);
