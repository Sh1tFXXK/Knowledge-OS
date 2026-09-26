/**
 * 浏览器 spot check：起 preview 后，真实渲染验证 supplement tab 在右栏可见。
 * 用 Node 内置 WebSocket 直连 Chromium CDP，不依赖 playwright。
 *
 * 用法：node scripts/shell-fusion/spot-check.mjs <previewUrl>
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4193/'
const CDP_PORT = 9333
const CHROME = `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe`

const { spawn } = await import('node:child_process')
const { mkdtempSync, rmSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')

const profile = mkdtempSync(join(tmpdir(), 'ko-spot-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targetWs() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch { /* 还没起来 */ }
    await sleep(500)
  }
  throw new Error('Chromium CDP 未就绪')
}

const ws = new WebSocket(await targetWs())
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let nextId = 1
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
  }
}
function send(method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description ?? ''))
  return r.result.value
}

const failures = []
const check = (ok, label, extra = '') => {
  console.log(`  ${ok ? '✔' : '✗'} ${label}${extra ? ' — ' + extra : ''}`)
  if (!ok) failures.push(label)
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  // 离线环境：屏蔽 google fonts（否则 readyState 永远停在 interactive）
  await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] })

  console.log(`导航 → ${BASE}`)
  await send('Page.navigate', { url: BASE })

  // 等应用就绪：树容器出现且节点行 > 0
  let ready = false
  for (let i = 0; i < 90; i += 1) {
    await sleep(1000)
    try {
      const n = await evaluate(`document.querySelectorAll('.tree-node-row').length`)
      if (n > 0) { ready = true; console.log(`  应用就绪（${(i + 1)}s，树行 ${n}）`); break }
    } catch { /* 上下文还没建好 */ }
  }
  check(ready, '应用启动并渲染出节点树')
  if (!ready) throw new Error('应用未就绪')

  const banner = await evaluate(`
    (() => {
      const t = document.body.innerText || '';
      const bad = ['数据加载失败','加载失败','数据校验','fatal','Error'].filter(k => t.includes(k));
      return { bad, snippet: t.slice(0, 400) };
    })()
  `)
  check(banner.bad.length === 0, '无数据加载失败横幅', banner.bad.join(',') || 'clean')

  // 反复展开所有折叠文件夹，直到目标行可见（有界）
  const TARGET = process.env.SPOT_TARGET ?? '缓冲池 / buffer pool'
  const TAB_LABEL = process.env.SPOT_TAB ?? 'InnoDB 语境中的缓冲池'
  let visible = false
  for (let round = 0; round < 14 && !visible; round += 1) {
    const clicked = await evaluate(`
      (() => {
        const icons = [...document.querySelectorAll('.tree-node-icon[aria-expanded="false"]')];
        for (const el of icons) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return icons.length;
      })()
    `)
    await sleep(400)
    visible = await evaluate(`
      [...document.querySelectorAll('.tree-node-row')].some(r => (r.querySelector('.tree-node-label')?.textContent||'').trim() === ${JSON.stringify(TARGET)})
    `)
    if (visible) console.log(`  展开 ${round + 1} 轮后找到「${TARGET}」（本轮点开 ${clicked} 个）`)
    else if (clicked === 0) break
  }
  // 树是虚拟化的：深层节点即便全展开也不会进 DOM，退回搜索框过滤定位。
  if (!visible) {
    await evaluate(`
      (() => {
        const input = document.querySelector('#tree-search-input');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(TARGET)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()
    `)
    await sleep(1200)
    visible = await evaluate(`
      [...document.querySelectorAll('.tree-node-row')].some(r => (r.querySelector('.tree-node-label')?.textContent||'').trim() === ${JSON.stringify(TARGET)})
    `)
    if (visible) console.log(`  展开不可达（虚拟化），改用搜索框定位到「${TARGET}」`)
  }
  check(visible, `树中出现目标节点「${TARGET}」`)

  if (visible) {
    await evaluate(`
      (() => {
        const row = [...document.querySelectorAll('.tree-node-row')].find(r => (r.querySelector('.tree-node-label')?.textContent||'').trim() === ${JSON.stringify(TARGET)});
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
      })()
    `)
    await sleep(1500)
    const panel = await evaluate(`
      (() => {
        const t = document.body.innerText || '';
        return { hasTab: t.includes(${JSON.stringify(TAB_LABEL)}), snippet: t.slice(0, 1500) };
      })()
    `)
    check(panel.hasTab, `右栏出现 supplement 页签「${TAB_LABEL}」`)
    if (!panel.hasTab) console.log('    右栏文本片段：', panel.snippet.replace(/\s+/g, ' ').slice(0, 400))

    // 可选：断言右栏出现某个关系对象（验证拆分后两卡之间有边可跳）
    const RELATION = process.env.SPOT_RELATION
    if (RELATION) {
      const rel = await evaluate(`
        (() => {
          const t = document.body.innerText || '';
          return { has: t.includes(${JSON.stringify(RELATION)}), snippet: t.slice(0, 1500) };
        })()
      `)
      check(rel.has, `右栏出现关系对象「${RELATION}」`)
      if (!rel.has) console.log('    右栏文本片段：', rel.snippet.replace(/\s+/g, ' ').slice(0, 400))
    }
  }

  // F1 改名检查：搜 Reactor 应出现「Reactor 模式」且不再有「Reactor概述」
  await evaluate(`
    (() => {
      const input = document.querySelector('#tree-search-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Reactor');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `)
  await sleep(1200)
  const reactor = await evaluate(`
    (() => {
      const names = [...document.querySelectorAll('.tree-node-label')].map(e => e.textContent.trim());
      return { names };
    })()
  `)
  check(reactor.names.includes('Reactor 模式'), 'F1 改名生效：树中出现「Reactor 模式」', reactor.names.join(' | ').slice(0, 200))
  check(!reactor.names.includes('Reactor概述'), '旧名「Reactor概述」已消失')
} finally {
  ws.close()
  chrome.kill('SIGKILL')
  await sleep(500)
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* 忽略 */ }
}

console.log(failures.length === 0 ? '\nspot check 全部通过 ✅' : `\nspot check 失败 ${failures.length} 项 ❌`)
process.exit(failures.length === 0 ? 0 : 1)
