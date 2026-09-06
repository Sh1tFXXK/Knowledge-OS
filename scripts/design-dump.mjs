#!/usr/bin/env node
/** Dump 视图中央画布的 DOM 结构（类名+文本），辅助设计分析。 */
const CDP_HTTP = 'http://[::1]:9222';

async function main() {
  const list = await (await fetch(`${CDP_HTTP}/json`)).json();
  const existing = list.find((t) => t.type === 'page' && t.url.includes('5188'))
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

  const dump = await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.querySelector('.dimension-canvas');
      if (!canvas) return 'no canvas';
      const lines = [];
      const walk = (el, depth) => {
        if (depth > 6) return;
        const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '';
        const text = el.children.length === 0 ? ' "' + (el.textContent || '').trim().slice(0, 30) + '"' : '';
        const rect = el.getBoundingClientRect();
        lines.push('  '.repeat(depth) + el.tagName.toLowerCase() + cls + ' [' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ']' + text);
        [...el.children].forEach((c) => walk(c, depth + 1));
      };
      walk(canvas, 0);
      const strip = document.querySelector('.subsystem-strip');
      let stripInfo = '';
      if (strip) {
        const r = strip.getBoundingClientRect();
        stripInfo = 'strip rect: ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' top=' + Math.round(r.top);
      }
      return lines.join('\\n') + '\\n' + stripInfo;
    })()`,
    returnByValue: true,
  });
  console.log(dump.result.value);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
