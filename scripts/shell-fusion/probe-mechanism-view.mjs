/**
 * 机制视图渲染探针（只读）。
 *
 * 用途：当机制视图显示「当前知识不构成机制」（`mechanism-lens--empty`）时，用本探针对比
 * 新 spec 与既有 spec（线程池状态机 / AOP 执行流程）在 MechanismLensPanel 里的渲染形态，
 * 快速区分两种原因：
 *   ① 数据侧 —— spec 字段不全 / 校验不通过（看 `validateMechanismSpec` 的 errors）；
 *   ② 投影侧 —— 候选集取不到参与节点（如机制状态按「卸树留池」退出树后，树作用域落空）。
 * 输出每例的 innerText、svg <text>、canvas 数与相关 class，足以定位卡在哪一层。
 *
 * 用法：node scripts/shell-fusion/probe-mechanism-view.mjs [previewUrl]
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4193/'
const CDP_PORT = 9336
const CHROME = `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe`

const { spawn } = await import('node:child_process')
const { mkdtempSync, rmSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')

const profile = mkdtempSync(join(tmpdir(), 'ko-mech-'))
const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let wsUrl
for (let i = 0; i < 60 && !wsUrl; i += 1) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
    wsUrl = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl
  } catch { /* 等 */ }
  if (!wsUrl) await sleep(500)
}
const ws = new WebSocket(wsUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let nextId = 1
const pending = new Map()
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result) } }
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })) })
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
  return r.result.value
}

async function pick(kw, exact) {
  await evaluate(`
    (() => { const i = document.querySelector('#tree-search-input');
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      s.call(i, ${JSON.stringify(kw)}); i.dispatchEvent(new Event('input',{bubbles:true})); return true })()`)
  await sleep(1000)
  const ok = await evaluate(`
    (() => { const row = [...document.querySelectorAll('.tree-node-row')].find(r => (r.querySelector('.tree-node-label')?.textContent||'').trim() === ${JSON.stringify(exact)});
      if (!row) return false; row.dispatchEvent(new MouseEvent('click',{bubbles:true})); return true })()`)
  await sleep(1200)
  return ok
}

async function lens() {
  await evaluate(`
    (() => { const b = [...document.querySelectorAll('.header-nav .header-nav-item')].find(x => (x.querySelector('.nav-label')?.textContent||'').trim() === '机制');
      if (!b) return false; b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return true })()`)
  await sleep(3000)
  return evaluate(`
    (() => {
      const txt = document.body.innerText || '';
      const svgTexts = [...document.querySelectorAll('svg text')].map(t => (t.textContent||'').trim()).filter(Boolean);
      const canvas = document.querySelectorAll('canvas').length;
      const classes = [...new Set([...document.querySelectorAll('main *')].map(e => e.className).filter(c => typeof c === 'string' && /panel|lens|diagram|timeline|stage|frame/i.test(c)))].slice(0, 20);
      return { len: txt.length, head: txt.slice(0, 600), svgTexts: svgTexts.slice(0, 40), canvas, classes };
    })()`)
}

try {
  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', { url: BASE })
  for (let i = 0; i < 60; i += 1) { await sleep(1000); const n = await evaluate(`document.querySelectorAll('.tree-node-row').length`); if (n > 0) break }

  // 先回「视图」以便选树节点
  const cases = [
    { kw: 'Bean 生命周期', exact: 'Bean 生命周期', label: '新 spec（本批新建）' },
    { kw: '线程池状态机', exact: '线程池状态机（五状态）', label: '既有 spec tpl_flow' },
    { kw: 'AOP 执行流程', exact: 'AOP 执行流程', label: '既有 spec aop_flow' },
  ]
  for (const c of cases) {
    await evaluate(`(() => { const b=[...document.querySelectorAll('.header-nav .header-nav-item')].find(x=>(x.querySelector('.nav-label')?.textContent||'').trim()==='视图'); if(b) b.dispatchEvent(new MouseEvent('click',{bubbles:true})); return true })()`)
    await sleep(1500)
    const picked = await pick(c.kw, c.exact)
    const r = await lens()
    console.log(`\n═══ ${c.label} | 选中=${picked} ═══`)
    console.log('innerText 长度=' + r.len + ' | canvas=' + r.canvas)
    console.log('svg <text> (' + r.svgTexts.length + ' 个): ' + r.svgTexts.join(' ¶ '))
    console.log('--- innerText 前 500 ---')
    console.log(r.head.replace(/\n{2,}/g, '\n'))
    console.log('--- 相关 class ---')
    console.log(r.classes.join(' , '))
  }
} finally {
  ws.close(); chrome.kill('SIGKILL'); await sleep(400)
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* 忽略 */ }
}
