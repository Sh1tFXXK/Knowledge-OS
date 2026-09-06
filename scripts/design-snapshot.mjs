#!/usr/bin/env node
/** 抓取 Universe 视图当前截图（CDP）。 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const BASE = 'http://[::1]:5188/';
const SHOT_DIR = join(process.cwd(), 'gui-test-screenshots');
mkdirSync(SHOT_DIR, { recursive: true });
const CDP_HTTP = 'http://[::1]:9222';

async function main() {
  const list = await (await fetch(`${CDP_HTTP}/json`)).json();
  const existing = list.find((t) => t.type === 'page' && t.url === 'about:blank')
    ?? list.find((t) => t.type === 'page');
  const ws = new WebSocket(existing.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      data.error ? reject(new Error(data.error.message)) : resolve(data.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  // 桌面尺寸视口,避免布局被挤压
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1536,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: BASE });

  // 等挂载
  for (let i = 0; i < 50; i += 1) {
    const r = await send('Runtime.evaluate', { expression: `Boolean(document.querySelector('.header-nav-item'))`, returnByValue: true });
    if (r.result.value) break;
    await new Promise((r2) => setTimeout(r2, 300));
  }
  await new Promise((r) => setTimeout(r, 1200));

  // 空视图态
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOT_DIR, 'design_before_empty.png'), Buffer.from(shot.data, 'base64'));

  // 选中 Spring 节点看真实视图内容：搜索过滤后逐级展开祖先链
  await send('Runtime.evaluate', {
    expression: `(() => {
      const input = document.getElementById('tree-search-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Spring');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`,
    returnByValue: true,
  });
  await new Promise((r) => setTimeout(r, 700));

  // 依次点开 计算机科学 → 软件符号与工具 → 软件框架 的 folder 图标,再点 Spring
  for (const name of ['计算机科学', '软件符号与工具', '软件框架']) {
    for (let i = 0; i < 10; i += 1) {
      const r = await send('Runtime.evaluate', {
        expression: `(() => {
          const rows = [...document.querySelectorAll('[data-tree-node-id]')];
          const row = rows.find((n) => n.querySelector('.tree-node-label')?.textContent?.trim() === ${JSON.stringify(name)});
          if (!row) return 'wait';
          const icon = row.querySelector('.tree-node-icon');
          if (!icon) return 'wait';
          icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return 'expanded';
        })()`,
        returnByValue: true,
      });
      if (r.result.value === 'expanded') break;
      await new Promise((r2) => setTimeout(r2, 300));
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  // 等 Spring 行出现再点
  let springClicked = 'not found';
  for (let i = 0; i < 10; i += 1) {
    const r = await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('[data-tree-node-id="tree_java_fw_spring"]');
        if (!el) return 'wait';
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return 'clicked';
      })()`,
      returnByValue: true,
    });
    if (r.result.value === 'clicked') { springClicked = 'clicked'; break; }
    await new Promise((r2) => setTimeout(r2, 300));
  }
  console.log('spring click:', springClicked);
  await new Promise((r) => setTimeout(r, 1200));

  // selectTreeEntry 会切到 index 视图,这里切回「视图」(universe) 看主镜头
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = [...document.querySelectorAll('.header-nav-item')].find((b) => b.textContent.includes('视图'));
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    })()`,
    returnByValue: true,
  });
  await new Promise((r) => setTimeout(r, 1800));
  const state = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      node: document.querySelector('.dc-node-name')?.textContent ?? null,
      crumb: document.getElementById('header-breadcrumb')?.textContent ?? null,
    })`,
    returnByValue: true,
  });
  console.log('spring state:', state.result.value);
  const springShot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOT_DIR, 'design_before_spring.png'), Buffer.from(springShot.data, 'base64'));

  // 第二个样本:计算机科学(内容丰富的大节点)
  for (const name of ['计算机科学']) {
    await send('Runtime.evaluate', {
      expression: `(() => {
        const rows = [...document.querySelectorAll('[data-tree-node-id]')];
        const row = rows.find((n) => n.querySelector('.tree-node-label')?.textContent?.trim() === ${JSON.stringify(name)});
        if (!row) return 'not found: ${name}';
        row.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        return 'clicked';
      })()`,
      returnByValue: true,
    });
    await new Promise((r) => setTimeout(r, 500));
  }
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = [...document.querySelectorAll('.header-nav-item')].find((b) => b.textContent.includes('视图'));
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    })()`,
    returnByValue: true,
  });
  await new Promise((r) => setTimeout(r, 2200));
  let shot2 = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(SHOT_DIR, 'design_before_cs.png'), Buffer.from(shot2.data, 'base64'));
  console.log('cs shot saved');

  const info = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      hasKernel: !!document.querySelector('.kernel-shell'),
      hasCanvas: !!document.querySelector('.dimension-canvas'),
      hasStrip: !!document.querySelector('.subsystem-strip'),
      canvasSections: [...document.querySelectorAll('.dc-chip')].map(c => c.textContent.trim()).slice(0, 8),
    })`,
    returnByValue: true,
  });
  console.log('view state:', info.result.value);
  console.log('shots saved');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
