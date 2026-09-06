#!/usr/bin/env node
/**
 * TemporalIndexWorkspace 浏览器回归(Chrome CDP,只读断言 + 点击交互 + 截图)。
 * 前置:Knowledge-OS 的 vite dev server 监听 [::1]:5188(无 token 鉴权),
 *       Chrome --remote-debugging-port=9222。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const BASE = 'http://[::1]:5188/';
const SHOT_DIR = join(process.cwd(), 'gui-test-screenshots');
mkdirSync(SHOT_DIR, { recursive: true });

const CDP_HTTP = 'http://[::1]:9222';

class CdpTab {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.events = [];
    this.consoleErrors = [];
    this.pageErrors = [];
    ws.addEventListener('message', (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(`${data.error.message}: ${data.error.data}`));
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        this.consoleErrors.push(data.params.args?.map((a) => a.value ?? a.description).join(' '));
      } else if (data.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(data.params.exceptionDetails?.text ?? 'exception');
      } else {
        this.events.push(data);
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
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(`evaluate failed: ${result.exceptionDetails.text} ${result.exceptionDetails.exception?.description ?? ''}`);
    }
    return result.result.value;
  }

  async screenshot(name) {
    const shot = await this.send('Page.captureScreenshot', { format: 'png' });
    const path = join(SHOT_DIR, `${name}.png`);
    writeFileSync(path, Buffer.from(shot.data, 'base64'));
    console.log(`  [shot] ${path}`);
    return path;
  }

  async clickByText(selector, text) {
    return this.evaluate(`(() => {
      const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const target = nodes.find((n) => (n.textContent || '').includes(${JSON.stringify(text)}));
      if (!target) return { ok: false, found: nodes.length, texts: nodes.slice(0, 12).map(n => n.textContent.trim().slice(0, 40)) };
      target.click();
      return { ok: true, clicked: target.textContent.trim().slice(0, 40) };
    })()`);
  }
}

async function newTab() {
  const list = await (await fetch(`${CDP_HTTP}/json`)).json();
  const existing = list.find((t) => t.type === 'page' && t.url === 'about:blank')
    ?? list.find((t) => t.type === 'page');
  if (!existing) throw new Error('no CDP page target available');
  const ws = new WebSocket(existing.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const tab = new CdpTab(ws);
  await tab.send('Runtime.enable');
  await tab.send('Page.enable');
  return tab;
}

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitFor(tab, expression, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await tab.evaluate(`Boolean(${expression})`)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/** 一次性抓取工作台 DOM 快照,避免多次 evaluate 之间状态漂移。 */
const SNAP_WORKSPACE = `(() => {
  const shell = document.querySelector('.explanation-index-shell');
  const rail = document.querySelector('.explanation-index-timeline-stages');
  const leafText = (sel) => [...document.querySelectorAll(sel)]
    .filter((n) => n.childNodes.length === 1 && n.textContent)
    .map((n) => n.textContent.trim())
    .filter((t) => t && t.length < 40);
  const shellLabels = leafText('.explanation-index-shell *');
  return JSON.stringify({
    hasShell: !!shell,
    hasEmpty: !!document.querySelector('.explanation-index-empty'),
    ownerLabel: shell?.querySelector('.explanation-index-header strong')?.textContent?.trim() ?? null,
    railTabs: rail ? [...rail.querySelectorAll('[role="tab"]')].map((b) => b.textContent.trim()) : [],
    hasReleaseNote: shellLabels.some((l) => l.includes('新特性') || l.includes('Web 开发增强')),
  });
})()`;

/** 点击时间轨上的某个阶段,等渲染稳定后返回该状态下的画布/抽屉文本与标志位。 */
async function selectEvent(tab, title) {
  const RAIL_TAB = '.explanation-index-timeline-stages [role="tab"]';
  const before = await tab.evaluate(`JSON.stringify({
    empty: !!document.querySelector('.explanation-index-empty'),
    shell: !!document.querySelector('.explanation-index-shell'),
    selected: [...document.querySelectorAll('.explanation-index-timeline-stages [role="tab"]')]
      .filter((b) => b.getAttribute('aria-selected') === 'true').map((b) => b.textContent.trim()),
  })`);
  await tab.clickByText(RAIL_TAB, title);
  // 等到该 tab 变为选中,再留一帧给 UnifiedIndexGraph 布局
  const selected = await waitFor(tab, `
    [...document.querySelectorAll('.explanation-index-timeline-stages [role="tab"]')]
      .some((b) => b.getAttribute('aria-selected') === 'true'
        && b.textContent.trim().includes(${JSON.stringify(title)}))
  `, 5000);
  await new Promise((r) => setTimeout(r, 600));

  const result = await tab.evaluate(`(() => {
    const canvasText = document.querySelector('.explanation-index-stage')?.textContent ?? '';
    const drawerText = document.querySelector('.event-drawer')?.textContent ?? '';
    const has = (t, s) => t.includes(s);
    return JSON.stringify({
      drawerText: drawerText.trim(),
      canvasHasIntroduced: has(canvasText, 'JSR310') || has(canvasText, 'Bean Validation'),
      canvasHasStable: has(canvasText, 'Spring'),
      canvasHasJsr: has(canvasText, 'JSR310'),
      canvasHasWebflux: has(canvasText, 'WebFlux'),
      canvasHasReleaseNote: has(canvasText, '新特性'),
      hasEditButton: document.querySelectorAll('.explanation-index-header-edit').length > 0,
      empty: !!document.querySelector('.explanation-index-empty'),
      shell: !!document.querySelector('.explanation-index-shell'),
    });
  })()`).then(JSON.parse);

  result.before = JSON.parse(before);
  result.tabSelected = selected;
  console.log(`  [info] selectEvent(${title}): before=${before} selected=${selected} after=${JSON.stringify({
    empty: result.empty, shell: result.shell, drawerLen: result.drawerText.length,
    canvasHasStable: result.canvasHasStable
  })}`);
  return result;
}

async function main() {
  console.log('== TemporalIndexWorkspace 浏览器回归 ==');
  const tab = await newTab();
  await tab.send('Page.navigate', { url: BASE });

  // 等待应用挂载(顶栏出现 + activeView 切换事件就绪)
  const mounted = await waitFor(tab, `document.querySelector('.header-nav-item')`, 15000);
  if (!mounted) {
    await tab.screenshot('t0_mount_failed');
    const diag = await tab.evaluate(`JSON.stringify({
      url: location.href,
      rootHtml: (document.getElementById('root')?.innerHTML ?? 'NO ROOT').slice(0, 600),
      bodyText: document.body.innerText.slice(0, 400)
    })`).catch((e) => `evaluate failed: ${e.message}`);
    console.error('应用未挂载,诊断:', diag);
    console.error('页面异常:', tab.pageErrors.slice(0, 5));
    console.error('控制台错误:', tab.consoleErrors.slice(0, 8));
    process.exit(3);
  }
  // 给 store.initialize() 留点时间加载数据
  await new Promise((r) => setTimeout(r, 800));

  // 兜底:从 main.tsx 入口把 store 绑到 window
  await tab.evaluate(`(async () => {
    try {
      const m = await import('/src/store/useGraph.ts');
      window.__store = m.useGraphStore;
    } catch (e) { window.__storeError = e.message; }
  })()`).catch(() => {});

  // 清掉上轮运行持久化的事件偏好,保证从稳定态开始
  await tab.evaluate(`localStorage.removeItem('knowledge-os:temporal-preferences')`);

  // T1: 应用加载,无页面错误
  record('T1 应用加载且无页面异常', tab.pageErrors.length === 0,
    tab.pageErrors.slice(0, 3).join(' | ') || 'ok');
  await tab.screenshot('t1_initial_load');

  // T2: 顶栏无「知识点时间线」入口,有「时态索引」
  const navButtons = await tab.evaluate(`[...document.querySelectorAll('.header-nav-item .nav-label')].map(n => n.textContent.trim())`);
  record('T2 顶栏视图清单', navButtons.includes('时态索引') && !navButtons.includes('知识点时间线'),
    JSON.stringify(navButtons));

  // T3: 进入时态索引视图,选中 Spring 节点
  // 先点击顶栏「时态索引」
  await tab.clickByText('.header-nav-item', '时态索引');
  await new Promise((r) => setTimeout(r, 400));

  // 用树搜索框过滤 Spring(展开祖先链)
  await tab.evaluate(`(() => {
    const input = document.getElementById('tree-search-input');
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Spring');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  // 等搜索去抖 + 重渲染
  const treeFound = await waitFor(tab, `document.querySelector('[data-tree-node-id="tree_java_fw_spring"]')`, 5000);
  if (!treeFound) {
    const treeDump = await tab.evaluate(`JSON.stringify({
      root: document.querySelector('#tree-container')?.children.length ?? 0,
      treeNodes: [...document.querySelectorAll('[data-tree-node-id]')].map(n => n.getAttribute('data-tree-node-id'))
    })`);
    console.error('Spring tree node not rendered. Tree state:', treeDump);
  }
  // 调试:点击前后对比 store
  const beforeClick = await tab.evaluate(`(() => {
    const s = window.__store?.getState?.();
    return JSON.stringify({ selectedNodeId: s?.selectedNodeId, selectedTreeNodeId: s?.selectedTreeNodeId });
  })()`);
  console.log(`  [diag] before click: ${beforeClick}`);

  const clickSpring = await tab.evaluate(`(() => {
    const el = document.querySelector('[data-tree-node-id="tree_java_fw_spring"]');
    if (!el) return { ok: false, reason: 'tree node not found' };
    // React 事件委托需要触发完整 MouseEvent
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    el.dispatchEvent(evt);
    return { ok: true, clicked: el.outerHTML.slice(0, 120) };
  })()`);
  console.log(`  [info] 点击 Spring tree: ${JSON.stringify(clickSpring)}`);

  await new Promise((r) => setTimeout(r, 400));
  const afterClick = await tab.evaluate(`(() => {
    const s = window.__store?.getState?.();
    return JSON.stringify({ selectedNodeId: s?.selectedNodeId, selectedTreeNodeId: s?.selectedTreeNodeId });
  })()`);
  console.log(`  [diag] after click: ${afterClick}`);

  // 等待时态索引工作台真正挂载(lazy 组件 + 数据落地),并轮询到稳定
  const workspaceReady = await waitFor(tab, `
    document.querySelector('.explanation-index-shell')
    && !document.querySelector('.explanation-index-empty')
    && document.querySelectorAll('.explanation-index-timeline-stages [role="tab"]').length >= 3
  `, 10000);

  // 一次快照,后续断言全部基于这份快照,避免状态漂移
  const stableState = await tab.evaluate(SNAP_WORKSPACE).then(JSON.parse);

  // 失败时打印 store 状态辅助诊断
  if (!workspaceReady || stableState.hasEmpty || !stableState.hasShell) {
    const storeDiag = await tab.evaluate(`(() => {
      try {
        const s = window.__store?.getState?.();
        if (!s) return 'no store on window';
        return JSON.stringify({
          activeView: s.activeView,
          selectedNodeId: s.selectedNodeId,
          selectedTreeNodeId: s.selectedTreeNodeId,
          activeEventId: s.activeEventId,
          evolutionEvents: s.evolutionEvents?.length,
        });
      } catch (e) { return 'err ' + e.message; }
    })()`);
    console.error(`  [diag] ready=${workspaceReady} store=${storeDiag}`);
    console.error(`  [diag] snapshot=${JSON.stringify(stableState)}`);
  }
  await tab.screenshot('t3_workspace_stable');

  record('T3 时态索引工作台渲染(Spring 宿主)',
    workspaceReady && stableState.hasShell && !stableState.hasEmpty
      && stableState.ownerLabel === 'Spring',
    `shell=${stableState.hasShell} empty=${stableState.hasEmpty} owner=${stableState.ownerLabel}`);

  // T4: 稳定状态——版本说明节点不在画布
  record('T4 稳定态无版本说明节点', stableState.hasReleaseNote === false,
    `命中版本说明标签: ${stableState.hasReleaseNote}`);

  // T5: 时间轨显示 Spring 4/5 事件
  const hasSpring4 = stableState.railTabs.some((t) => t.includes('Spring 4'));
  const hasSpring5 = stableState.railTabs.some((t) => t.includes('Spring 5'));
  record('T5 时间轨含 Spring 4/5', hasSpring4 && hasSpring5, JSON.stringify(stableState.railTabs));

  // T6: 点击 Spring 4 → 进入事件投影,抽屉列出新增知识 + 画布揭示
  if (hasSpring4) {
    const ev4 = await selectEvent(tab, 'Spring 4');
    record('T6 选择 Spring 4 后抽屉展示事件', ev4.drawerText.length > 0,
      ev4.drawerText.slice(0, 60));
    record('T6b Spring 4 事件态:新增知识出现且骨架保留',
      ev4.canvasHasIntroduced && ev4.canvasHasStable,
      `introduced=${ev4.canvasHasIntroduced} stable=${ev4.canvasHasStable}`);
    await tab.screenshot('t6_spring4_event');

    // T7: 切到 Spring 5 → WebFlux 出现(累计揭示)
    const ev5 = await selectEvent(tab, 'Spring 5');
    record('T7 Spring 5 累计显示 Spring 4 新知识 + WebFlux',
      ev5.canvasHasWebflux && ev5.canvasHasJsr,
      `WebFlux=${ev5.canvasHasWebflux} JSR310(保留)=${ev5.canvasHasJsr}`);
    await tab.screenshot('t7_spring5_event');

    // T8: 版本说明节点在事件态被隐藏
    record('T8 版本说明节点在索引中隐藏', !ev5.canvasHasReleaseNote);

    // T9: 返回稳定态 → 编辑入口恢复
    const back = await selectEvent(tab, '稳定知识');
    record('T9 返回稳定态恢复编辑入口', back.hasEditButton);
    await tab.screenshot('t9_stable_restored');
  }

  // T10: 控制台无错误
  record('T10 控制台无错误', tab.consoleErrors.length === 0,
    tab.consoleErrors.slice(0, 5).join(' | ') || 'ok');

  console.log('\n== 汇总 ==');
  const pass = results.filter(r => r.pass).length;
  console.log(`${pass}/${results.length} 通过`);
  if (tab.pageErrors.length > 0) console.log('页面异常:', tab.pageErrors.slice(0, 5));
  process.exit(pass === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('回归脚本失败:', err);
  process.exit(2);
});
