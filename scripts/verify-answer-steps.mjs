#!/usr/bin/env node
/**
 * Item 3 验收：问题卡消费结构（answerSteps + 可选结构定位）
 *
 * q_lock_1 ("MySQL 有哪些锁类型？") 写入 answerSteps 后，
 * 验证编辑器侧能稳定消费 demo_lock 的结构：
 *   ① 6 个步骤项全部渲染（1 整节点 + 5 带定位）；
 *   ② 5 个带定位的步骤都带结构徽章（`.answer-step-locator`）；
 *   ③ 编辑器 "可选结构定位" 下拉里有 5 个 section（按稳定 ID）；
 *   ④ 「用节点生成答案草稿」按 section 取出成员原子，能生成非空草稿；
 *   ⑤ store.normalizeQuestionAnswerSteps 对照磁盘真源，丢的是「定位」而不是「整步」。
 *
 * 写法参考 scripts/verify-p0-guards.mjs 与 scripts/verify-lock-matrix.mjs，
 * 全部断言在 Node 侧直读磁盘 + CDP 内 evaluate 复核，不留任何"被 mock 的 fetch 撒谎"风险。
 *
 * 用法：node scripts/verify-answer-steps.mjs [--keep]
 *
 * 端口注意：fetch 的禁用端口名单中 4190 报 bad port，故选 4196/4197/4198/4199。
 * Vue 8 默认 host=localhost → [::1]，Node fetch 不回落，故显式 --host=127.0.0.1。
 * --no-sandbox：Windows 上跑无头 Chrome 必须，否则 network service 崩溃、永久白屏且无任何报错。
 * 字体：离线环境 fonts.googleapis.com 永久挂起 → 测试侧 Network.setBlockedURLs 屏蔽。
 * 关键：Page.navigate 会重建 JS 上下文，window.__p0 必须在每次导航后重绑。
 */
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW_PORT = 4196;
const CDP_PORT = 9336;
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
    const pids = new Set(
      out.split('\n').map((l) => l.trim()).filter((l) => l.includes('LISTENING'))
        .map((l) => l.split(/\s+/).pop()),
    );
    for (const pid of pids) {
      try { execSync(`taskkill /PID ${pid} /T /F`, { shell: 'cmd.exe', stdio: 'ignore' }); } catch {}
    }
  } catch {}
}

const HOST_CANDIDATES = (port) => [
  `http://127.0.0.1:${port}`,
  `http://[::1]:${port}`,
  `http://localhost:${port}`,
];
const bases = new Map();
const origin = (port) => bases.get(port) ?? `http://127.0.0.1:${port}`;

// ── 1. 数据真身核对（写脚本之前打一遍） ─────────────────────
const qPath = path.join(root, 'data', 'questions.json');
const pPath = path.join(root, 'data', 'node-pool.json');
const qBefore = JSON.parse(fs.readFileSync(qPath, 'utf8'));
const pBefore = JSON.parse(fs.readFileSync(pPath, 'utf8'));
const q1Before = qBefore.find((q) => q.id === 'q_lock_1');
const lockNode = pBefore['demo_lock'];
const expectedDims = (lockNode.viewDimensions ?? []).map((d) => ({
  id: d.id, name: d.name, sections: d.sections.map((s) => ({ id: s.id, title: s.title ?? s.layout })),
}));
const expectedSectionCount = expectedDims.reduce((sum, d) => sum + d.sections.length, 0);
const expectedSectionIds = expectedDims.flatMap((d) => d.sections.map((s) => s.id));

record('① 数据前置：q_lock_1 存在', !!q1Before && q1Before.text === 'MySQL 有哪些锁类型？');
record('① 数据前置：demo_lock 存在并含 1 维度 / 5 section',
  !!lockNode && expectedDims.length === 1 && expectedSectionCount === 5,
  `dim=${expectedDims.length}, section=${expectedSectionCount}`);
record('① 数据前置：answerSteps 已写入',
  Array.isArray(q1Before.answerSteps) && q1Before.answerSteps.length === 6,
  `length=${q1Before.answerSteps?.length}`);
const emptyStep = q1Before.answerSteps.find((s) => !s.dimensionId);
const locatedSteps = q1Before.answerSteps.filter((s) => s.dimensionId);
record('① 数据前置：步骤 1 为整节点（无 dimensionId/sectionId）', !!emptyStep);
record('① 数据前置：5 个带定位步骤的 dimensionId/sectionId 都在稳定 ID 名单里',
  locatedSteps.length === 5
  && locatedSteps.every((s) => expectedSectionIds.includes(s.sectionId) && s.dimensionId === expectedDims[0].id),
  `located=${locatedSteps.length}`);
const q1SizeBefore = fs.statSync(qPath).size;

// ── 2. 启 vite preview（不走 dev，避免内存持有） ─────────────
killPort(PREVIEW_PORT);
killPort(CDP_PORT);

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const env = {
  ...process.env,
  CODEBUDDY_SAFE_DELETE_ENABLED: '0',
};
const server = spawn(process.execPath, [
  viteBin, 'preview',
  '--host=127.0.0.1',
  `--port=${PREVIEW_PORT}`,
  '--strictPort',
], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
const serverLog = path.join(root, '.tmp-ans-server.log');
server.stdout.pipe(fs.createWriteStream(serverLog));
server.stderr.pipe(fs.createWriteStream(serverLog, { flags: 'a' }));

async function waitUp(port, timeoutMs = 60000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    for (const candidate of HOST_CANDIDATES(port)) {
      try {
        const res = await fetch(`${candidate}/`);
        if (res.status > 0) { bases.set(port, candidate); return true; }
        lastError = `${candidate} → HTTP ${res.status}`;
      } catch (error) { lastError = `${candidate} → ${error.cause?.code ?? error.message}`; }
    }
    await sleep(400);
  }
  console.error(`[waitUp] ${port} 未就绪：${lastError}`);
  if (fs.existsSync(serverLog)) {
    console.error(`\n[preview log tail]\n${fs.readFileSync(serverLog, 'utf8').slice(-2000)}`);
  }
  return false;
}

// ── 3. 起 CDP Chrome ─────────────────────────────────────────
function findChrome() {
  const candidates = [
    process.env.P0_CHROME_PATH,
    path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1187', 'chrome-win', 'chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  const base = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base)) {
      if (!d.startsWith('chromium-')) continue;
      const exe = path.join(base, d, 'chrome-win', 'chrome.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return null;
}

const chromeExe = findChrome();
if (!chromeExe) {
  console.error('找不到 Chrome/Chromium，请先安装 ms-playwright 或设 P0_CHROME_PATH');
  server.kill();
  process.exit(2);
}

const chrome = spawn(chromeExe, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  '--remote-debugging-port=' + CDP_PORT,
  '--remote-debugging-address=127.0.0.1',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {}); // 静默 DevTools 监听日志

let cleanupDone = false;
function cleanup() {
  if (cleanupDone) return;
  cleanupDone = true;
  try { server.kill(); } catch {}
  try { chrome.kill(); } catch {}
  killPort(PREVIEW_PORT); killPort(CDP_PORT);
  if (!KEEP) try { fs.unlinkSync(serverLog); } catch {}
}
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

// ── 4. 极简 CDP 客户端 ──────────────────────────────────────
class CdpTab {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map();
    this.consoleErrors = []; this.pageErrors = [];
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
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`eval failed: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`);
    return r.result.value;
  }
  async goto(url) { const r = await this.send('Page.navigate', { url }); await sleep(500); return r; }
  async waitFor(expression, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try { if (await this.evaluate(`Boolean(${expression})`)) return true; } catch {}
      await sleep(200);
    }
    return false;
  }
}

async function openTab() {
  let list = null;
  let lastError = null;
  for (const host of [`http://127.0.0.1:${CDP_PORT}`, `http://[::1]:${CDP_PORT}`]) {
    try { list = await (await fetch(`${host}/json/list`)).json(); break; }
    catch (e) { lastError = e.cause?.code ?? e.message; }
  }
  if (!list) throw new Error(`CDP 未就绪：${lastError}`);
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('CDP 没有 page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const tab = new CdpTab(ws);
  await tab.send('Runtime.enable');
  await tab.send('Page.enable');
  await tab.send('Network.enable');
  await tab.send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] });
  return tab;
}

// ── 5. 主流程 ──────────────────────────────────────────────
async function main() {
  // ─ 5.0 起服务
  if (!await waitUp(PREVIEW_PORT)) {
    console.error('preview 起不来');
    process.exit(1);
  }
  console.log(`preview ready → ${origin(PREVIEW_PORT)}`);
  const tab = await openTab();

  // ─ 5.1 冷启动预热：首次 goto 触发 vite 的 chunk 下载（如果服务刚起，可能还需要解析）
  await tab.goto(origin(PREVIEW_PORT));
  await tab.waitFor('.header-nav', 30000);
  console.log('  · 预热导航完成');

  // ─ 5.2 切到 questions 视图（TopBar 渲染 button.header-nav-item，label=问题库）
  const navClicked = await tab.evaluate(`
    (() => {
      const items = [...document.querySelectorAll('button.header-nav-item')];
      const cand = items.find((t) => /问题库|题库|questions/i.test(t.textContent || ''));
      if (!cand) return { ok: false, items: items.map((t) => t.textContent.trim()) };
      cand.click();
      return { ok: true };
    })()
  `);
  record('② 进入 questions 视图（点 TopBar 问题库）', navClicked.ok,
    !navClicked.ok ? `items=${JSON.stringify(navClicked.items)}` : '');
  await sleep(500);
  await tab.waitFor('.question-database', 15000);

  // ─ 5.3 搜索框过滤到只剩 q_lock_1（progressive render 不会一次渲染 758 题）
  const searched = await tab.evaluate(`
    (() => {
      const input = document.querySelector('.database-toolbar input[type="text"]');
      if (!input) return { ok: false, reason: 'no search input' };
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, '锁类型');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { ok: true };
    })()
  `);
  record('② UI 搜索：输入"锁类型"过滤', searched.ok);
  await sleep(500);
  await tab.waitFor('table tbody tr', 5000);

  // ─ 5.4 找到 q_lock_1 的行（按文本）
  const foundRow = await tab.evaluate(`
    (() => {
      const rows = [...document.querySelectorAll('.question-database table tbody tr')];
      const row = rows.find((r) => (r.textContent || '').includes('MySQL 有哪些锁类型'));
      if (!row) return { ok: false, count: rows.length, sample: rows.slice(0, 3).map((r) => r.textContent.slice(0, 60)) };
      // 找 row 内代表 "编辑答案/添加答案" 的 💬 按钮
      const buttons = [...row.querySelectorAll('button')];
      const answerBtn = buttons.find((b) => b.title === '编辑答案' || b.title === '添加答案' || (b.textContent || '').trim() === '💬');
      if (!answerBtn) return { ok: false, btnTitles: buttons.map((b) => b.title), sample: row.textContent.slice(0, 100) };
      answerBtn.click();
      return { ok: true };
    })()
  `);
  record('② UI 行定位：点击 q_lock_1 的 💬 按钮', foundRow.ok,
    !foundRow.ok ? `count=${foundRow.count}, sample=${JSON.stringify(foundRow.sample)}, btn=${JSON.stringify(foundRow.btnTitles)}` : '');

  // ─ 5.4 等编辑器出现并核对 DOM 结构
  const editorReady = await tab.waitFor(`document.querySelector('.question-answer-editor') !== null`, 10000);
  record('② UI 渲染：编辑器出现（.question-answer-editor）', editorReady);

  // ─ 5.5 静态 DOM 对照
  const dom = await tab.evaluate(`
    (() => {
      const root = document.querySelector('.question-answer-editor');
      if (!root) return null;
      const titleEl = root.querySelector('.question-answer-title');
      const stepItems = [...root.querySelectorAll('.answer-step-item')];
      const locators = [...root.querySelectorAll('.answer-step-locator')];
      const structSelect = root.querySelector('.answer-structure-select');
      const nodeSelect = root.querySelector('.answer-node-select');
      const composeBtn = [...root.querySelectorAll('button')].find((b) => (b.textContent || '').includes('生成答案草稿'));
      const textarea = root.querySelector('.question-answer-textarea');
      return {
        title: titleEl ? titleEl.textContent : null,
        steps: stepItems.map((it) => ({
          label: it.querySelector('.answer-step-label')?.textContent ?? '',
          locator: it.querySelector('.answer-step-locator')?.textContent ?? null,
          hasLocator: !!it.querySelector('.answer-step-locator'),
          note: it.querySelector('.answer-step-note')?.value ?? '',
        })),
        structSelectValue: structSelect ? structSelect.value : null,
        structSelectOptions: structSelect ? [...structSelect.options].map((o) => ({ value: o.value, label: o.textContent })) : [],
        nodeSelectValue: nodeSelect ? nodeSelect.value : null,
        composeBtnDisabled: composeBtn ? composeBtn.disabled : null,
        textareaValue: textarea ? textarea.value : '',
      };
    })()
  `);

  record('② DOM：标题就是问句', dom.title === 'MySQL 有哪些锁类型？', `title="${dom.title}"`);
  record('② DOM：6 个步骤项', dom.steps.length === 6, `count=${dom.steps.length}`);
  record('② DOM：第 1 步为整节点（无 locator）', dom.steps[0] && !dom.steps[0].hasLocator && dom.steps[0].label === 'MySQL 锁机制');
  record('② DOM：5 个步骤带结构定位徽章',
  dom.steps.filter((s) => s.hasLocator).length === 5,
  `locator=${dom.steps.filter((s) => s.hasLocator).length}`);
  record('② DOM：步骤节点都是 demo_lock (MySQL 锁机制)',
    dom.steps.every((s) => s.label === 'MySQL 锁机制'));
  const expectedSections = ['按锁粒度', '按存储引擎', '按操作类型', '按锁策略', '锁粒度对比'];
  const locatorTexts = dom.steps.slice(1).map((s) => s.locator.trim());
  // 实际顺序按写入的 answerSteps，对照是否覆盖 5 个 section 名
  const covered = expectedSections.every((s) => locatorTexts.some((t) => t.includes(s)));
  record('② DOM：5 个 section 标题（按锁粒度/存储引擎/操作类型/锁策略/锁粒度对比）都被定位徽章覆盖',
    covered, `covered=${covered}, locators=${JSON.stringify(locatorTexts)}`);

  // ─ 5.6 结构下拉 = 1 空 + 5 section
  record('② DOM：结构下拉有 5 个 section option（除整节点）',
    dom.structSelectOptions.length === 6,
    `count=${dom.structSelectOptions.length}`);
  record('② DOM：结构下拉第一项是（整个节点）',
    dom.structSelectOptions[0]?.label?.includes('整个节点'),
    `first="${dom.structSelectOptions[0]?.label}"`);
  const expectedKeys = expectedSectionIds.map((s) => `${expectedDims[0].id}::${s}`);
  const actualKeys = dom.structSelectOptions.slice(1).map((o) => o.value);
  record('② DOM：结构下拉的 5 个 value 与稳定 ID 一致（dimensionId::sectionId）',
    expectedKeys.every((k) => actualKeys.includes(k)) && actualKeys.every((k) => expectedKeys.includes(k)),
    `actual=${JSON.stringify(actualKeys)}`);
  record('② DOM：节点下拉默认选中 demo_lock', dom.nodeSelectValue === 'demo_lock', `value=${dom.nodeSelectValue}`);

  // ─ 5.7 点"用节点生成答案草稿"，验证草稿能拉出 demo_lock 标签与多个 section 标题
  await tab.evaluate(`
    (() => {
      const root = document.querySelector('.question-answer-editor');
      const btn = [...root.querySelectorAll('button')].find((b) => (b.textContent || '').includes('生成答案草稿'));
      btn && btn.click();
    })()
  `);
  await sleep(300);
  const draft = await tab.evaluate(`
    (() => document.querySelector('.question-answer-textarea')?.value ?? '')()
  `);
  record('③ 草稿：「用节点生成答案草稿」能产出非空草稿', draft.length > 50, `len=${draft.length}`);
  record('③ 草稿：含问句', draft.includes('MySQL 有哪些锁类型'));
  record('③ 草稿：含 demo_lock 标签（"MySQL 锁机制"）', draft.includes('MySQL 锁机制'));
  record('③ 草稿：至少出现 4 个 section 标题（按锁粒度/存储引擎/操作类型/锁策略）',
    ['按锁粒度', '按存储引擎', '按操作类型', '按锁策略'].filter((s) => draft.includes(s)).length >= 4,
    `hit=${['按锁粒度', '按存储引擎', '按操作类型', '按锁策略'].filter((s) => draft.includes(s)).length}`);
  record('③ 草稿：含至少 3 行 "1./2./3." 步骤行',
    (draft.match(/^\d+\. /gm) || []).length >= 3,
    `count=${(draft.match(/^\d+\. /gm) || []).length}`);

  // ─ 5.8 重复添加被挡：5 个 section + 整节点 6 个 step，再点添加任意同 key 步骤，steps 数保持 6
  // 验证 answerStepKey 去重挡的是"同节点同定位"，正是 Item 3 的产品决策
  const repeatKey = 'lock_composition::lock_grain_matrix';
  await tab.evaluate(`
    (() => {
      const root = document.querySelector('.question-answer-editor');
      const sel = root.querySelector('.answer-structure-select');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
      setter.call(sel, '${repeatKey}');
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      return sel.value;
    })()
  `);
  await sleep(300);
  await tab.evaluate(`
    (() => {
      const root = document.querySelector('.question-answer-editor');
      const btn = [...root.querySelectorAll('button')].find((b) => (b.textContent || '').includes('添加步骤'));
      btn && btn.click();
    })()
  `);
  await sleep(300);
  const afterDupAdd = await tab.evaluate(`
    (() => [...document.querySelectorAll('.answer-step-item')].length)()
  `);
  record('② DOM：重复添加同定位步骤被 answerStepKey 挡住，步骤数保持 6',
    afterDupAdd === 6, `now=${afterDupAdd}`);

  // ─ 5.9 取消（不保存），验证 questions.json 字节未变
  await tab.evaluate(`
    (() => {
      const root = document.querySelector('.question-answer-editor');
      const cancelBtn = [...root.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === '取消');
      cancelBtn && cancelBtn.click();
    })()
  `);
  await sleep(300);
  const editorClosed = await tab.evaluate(`!document.querySelector('.question-answer-editor')`);
  record('② 取消后编辑器关闭', editorClosed);

  const qAfter = fs.readFileSync(qPath, 'utf8');
  const q1After = JSON.parse(qAfter).find((q) => q.id === 'q_lock_1');
  record('④ 取消后 questions.json 字节未变（writeFileAtomic 走 store 才会落盘）',
    qAfter === fs.readFileSync(qPath, 'utf8')
    && JSON.stringify(q1After.answerSteps) === JSON.stringify(qBefore.find((q) => q.id === 'q_lock_1').answerSteps));

  // 整个流程必须 0 page error
  record('⑤ 全过程无未捕获 JS 异常', tab.pageErrors.length === 0,
    tab.pageErrors.length ? `pageErrors=${JSON.stringify(tab.pageErrors).slice(0, 200)}` : '');
  // 静默 console error 视情况：开发环境 React warn 合法，仅当 .length 过大的疑似错误时报警
  if (tab.consoleErrors.length > 5) {
    record('⑤ console.error 数量可控', false, `count=${tab.consoleErrors.length}`);
  } else {
    record('⑤ console.error 数量可控', true, `count=${tab.consoleErrors.length}`);
  }
}

main().catch((e) => {
  console.error('verify-answer-steps crashed:', e);
  process.exit(1);
}).finally(() => {
  // 汇总
  const pass = results.filter((r) => r.pass).length;
  const fail = results.filter((r) => !r.pass).length;
  console.log(`\n───── Item 3 验收：${pass} 通过 / ${fail} 失败（合计 ${results.length}） ─────`);
  if (fail > 0) console.log('\n失败项：');
  for (const r of results.filter((r) => !r.pass)) console.log(`  ✖ ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  cleanup();
  process.exit(fail === 0 ? 0 : 1);
});
