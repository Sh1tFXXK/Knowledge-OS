/**
 * DELETE-GO · 无头浏览器实测（验收脚本，入库）
 *
 * 用法：node scripts/probe-delete-go.mjs http://127.0.0.1:4192/
 *
 * 断言面（每条 = 一个可观察验收点）：
 *   ① 渲染 id 集合 === tree-data.json id 集合（3202，零增零减）——最强断言
 *   ② 负断言：39 个 Go treeId 全不在 DOM
 *   ③ 全树再无 label === 'go' 的行，也无以 'go ' 起头的 CLI 行（go build / go test …）
 *   ④ 父节点「编程语言」仍在，祖先链 = 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言
 *   ⑤ 点选「编程语言」→ 树行选中 + 右栏卡片有内容（非「无内容」）
 *   ⑥ 负对照：叶子 java.lang.String 仍能点选并渲染卡片（删除未破坏整体）
 *   ⑦ /api/data 三计数 = 树 3202 / 池 3846 / 边 4136
 *   ⑧ /api/data 池不含 39 个 Go 池 id；边不含任何 Go 端点
 *   ⑨ 刷新后复测 ①②③
 *
 * ⚠️ 点行必须点 [data-tree-node-id] 元素本身（内层 role=button 是折叠图标且 stopPropagation）
 * ⚠️ CDP 必须连 page target（连 /json/version 时 Runtime.evaluate 无 result）
 * ⚠️ 重复点已选中的行 = 取消选中 ⇒ 卡片「无内容」；故点选前先点中性节点
 * ⚠️ 读右栏必须读 .explanation-card，不可用 body.innerText.slice()
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4192/'
const CDP_PORT = Number(process.env.CDP_PORT ?? 9341)
const CHROME = (process.env.LOCALAPPDATA ?? 'C:/Users/Administrator/AppData/Local') +
  '/ms-playwright/chromium-1187/chrome-win/chrome.exe'

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'data')

const PARENT_TREE = 'tree_acm2012_software_notations_tools_programming_languages' // 编程语言
const LEAF_TREE = 'tree_java_lang_string' // 负对照（既有叶子，本批未碰）
const GO_TREE_ROOT = 'tree_1786618025853_3qn55e'

const R = []
const a = (ok, desc, detail = '') => { R.push({ ok, desc, detail }); console.log('  ' + (ok ? '✅' : '⛔') + ' ' + desc + (ok || !detail ? '' : ' ← ' + detail)) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let chrome, ws, msgId = 0
const pending = new Map()
function send(method, params = {}) {
  const id = ++msgId
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((res, rej) => {
    pending.set(id, { res, rej })
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('CDP timeout: ' + method)) } }, 60000)
  })
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result?.value
}

// 从备份重建 Go id 集合（不依赖 apply 脚本）
const bakDir = fs.readdirSync(path.join(DATA, 'backups'))
  .filter((d) => d.startsWith('delete-golang-domain-')).sort().pop()
const bakPath = path.join(DATA, 'backups', bakDir, 'tree-data.json')
const treeBak = JSON.parse(fs.readFileSync(bakPath, 'utf8'))
let goRoot = null
;(function f(n) { if (goRoot) return; if (n.id === GO_TREE_ROOT) { goRoot = n; return } ;(n.children || []).forEach(f) })(treeBak)
const GO_TREES = [], GO_POOLS = []
;(function w(n) { GO_TREES.push(n.id); if (n.nodeRef) GO_POOLS.push(n.nodeRef); (n.children || []).forEach(w) })(goRoot)

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-delgo-prof-'))
  chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`, '--window-size=1600,1000', 'about:blank',
  ], { stdio: 'ignore' })

  let target = null
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(400)
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      target = list.find((t) => t.type === 'page')
    } catch { /* retry */ }
  }
  if (!target) throw new Error('未找到 page target')

  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result) }
  }

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] })
  await send('Page.navigate', { url: BASE })
  await sleep(4000)

  const apiTree = await evaluate(`fetch('/api/data?file=tree-data.json').then(r=>r.json())`)
  const expectIds = []
  ;(function walk(n) { expectIds.push(n.id); (n.children ?? []).forEach(walk) })(apiTree)

  const expandAll = async () => {
    for (let k = 0; k < 40; k++) {
      const n = await evaluate(`(()=>{const els=[...document.querySelectorAll('.tree-node-icon[aria-expanded="false"]')];els.forEach(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));return els.length})()`)
      await sleep(n > 0 ? 350 : 0)
      if (n === 0) break
    }
  }
  const rowState = () => evaluate(`(()=>{const rows=[...document.querySelectorAll('[data-tree-node-id]')];
    return {n:rows.length, ids:rows.map(r=>r.getAttribute('data-tree-node-id')),
      labels:rows.map(r=>{const l=r.querySelector('.tree-node-label');return l?l.textContent.trim():''})}})()`)
  const chainOf = (treeId) => evaluate(`(()=>{
    const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});
    if(!row) return {found:false};
    const chain=[]; let cur=row;
    while(cur){ if(cur.classList&&cur.classList.contains('tree-node')){ const rr=cur.querySelector(':scope > .tree-node-row'); if(rr) chain.unshift((rr.querySelector('.tree-node-label')||{}).textContent?.trim()||''); } cur=cur.parentElement; }
    return {found:true, chain};
  })()`)
  const selectRow = async (treeId, neutral) => {
    await evaluate(`(()=>{const n=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(neutral)});if(n)n.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`)
    await sleep(900)
    const ok = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});if(!row)return false;row.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`)
    let snap = null
    for (let i = 0; i < 25; i++) {
      await sleep(300)
      snap = await evaluate(`(()=>{
        const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});
        const card=document.querySelector('.explanation-card');
        return {active:!!(row&&row.classList.contains('active')), cardText:card?card.innerText.slice(0,400):''};
      })()`)
      if (snap.active && !snap.cardText.includes('无内容')) break
    }
    return { clicked: ok, ...snap }
  }

  console.log('════ DELETE-GO · 无头浏览器实测 ════')
  console.log('目标：' + BASE + '   期望树节点：' + expectIds.length)
  a(expectIds.length === 3202, `①a /api/data 树节点 = 3202`, String(expectIds.length))

  for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
  await expandAll()
  let st = await rowState()

  // ① 渲染 id 集合 === 期望 id 集合
  const domSet = new Set(st.ids), expSet = new Set(expectIds)
  const missing = expectIds.filter((id) => !domSet.has(id))
  const extra = st.ids.filter((id) => !expSet.has(id))
  a(missing.length === 0 && extra.length === 0,
    `① 渲染 id 集合 === tree-data.json（${expectIds.length} 项，零增零减）`,
    `missing=${missing.length} extra=${extra.length}`)

  // ② 39 个 Go treeId 全不在 DOM
  const goStill = GO_TREES.filter((id) => domSet.has(id))
  a(goStill.length === 0, `② 39 个 Go treeId 全部不在 DOM`, JSON.stringify(goStill.slice(0, 5)))

  // ③ 无 'go' 行 / 无 'go xxx' CLI 行
  const goRows = st.labels.filter((l) => l === 'go' || /^go [a-z]/.test(l))
  a(goRows.length === 0, `③ 无 label='go' 或 'go xxx' 的树行`, JSON.stringify(goRows.slice(0, 8)))

  // ④ 父节点仍在 + 祖先链
  const ch = await chainOf(PARENT_TREE)
  a(ch.found, `④ 父节点「编程语言」仍在 DOM`)
  a(ch.found && ch.chain.join(' > ').endsWith('计算机科学 > 软件符号与工具 > 编程语言'),
    `④b 祖先链 = 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言`, JSON.stringify(ch.chain))

  // ④c 编程语言的子节点里不含 go
  const childLabels = await evaluate(`(()=>{
    const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(PARENT_TREE)});
    if(!row) return [];
    const host=row.closest('.tree-node'); if(!host) return [];
    const box=host.querySelector(':scope > .tree-node-children'); if(!box) return [];
    return [...box.querySelectorAll(':scope > .tree-node > .tree-node-row .tree-node-label')].map(l=>l.textContent.trim());
  })()`)
  a(!childLabels.includes('go'), `④c 「编程语言」直接子节点已无 go`, JSON.stringify(childLabels))

  // ⑤ 点选父节点 → 卡片有内容
  const sel = await selectRow(PARENT_TREE, LEAF_TREE)
  a(sel.clicked && sel.active, `⑤ 点选「编程语言」→ 行选中`)
  a(sel.cardText.length > 0 && !sel.cardText.includes('无内容'), `⑤b 右栏卡片有内容（非「无内容」）`, sel.cardText.slice(0, 80))

  // ⑥ 负对照：叶子 java.lang.String
  const leaf = await selectRow(LEAF_TREE, PARENT_TREE)
  a(leaf.clicked && leaf.active && leaf.cardText.length > 0 && !leaf.cardText.includes('无内容'),
    `⑥ 负对照：java.lang.String 可点选且卡片有内容`, leaf.cardText.slice(0, 80))

  // ⑦ /api/data 三计数
  const poolApi = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json()).then(p=>Object.keys(p).length)`)
  const edgeApi = await evaluate(`fetch('/api/data?file=knowledge-edges.json').then(r=>r.json()).then(e=>e.length)`)
  a(poolApi === 3846, `⑦ 池 = 3846`, String(poolApi))
  a(edgeApi === 4136, `⑦b 边 = 4136`, String(edgeApi))

  // ⑧ 池 / 边 Go 残留
  const poolHas = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json()).then(p=>${JSON.stringify(GO_POOLS)}.filter(id=>id in p))`)
  a(poolHas.length === 0, `⑧ 池内 39 个 Go 节点（含解释卡）全部消失`, JSON.stringify(poolHas.slice(0, 5)))
  const edgeHas = await evaluate(`fetch('/api/data?file=knowledge-edges.json').then(r=>r.json()).then(e=>{const s=new Set(${JSON.stringify(GO_POOLS)});return e.filter(x=>s.has(x.source)||s.has(x.target)).length})`)
  a(edgeHas === 0, `⑧b 无任何边指向已删 Go 节点`, String(edgeHas))

  // ⑨ 刷新后复测 ①②③
  await send('Page.navigate', { url: BASE })
  await sleep(4000)
  for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
  await expandAll()
  st = await rowState()
  const domSet2 = new Set(st.ids)
  a(expectIds.filter((id) => !domSet2.has(id)).length === 0 && st.ids.filter((id) => !expSet.has(id)).length === 0,
    `⑨a 刷新后：渲染 id 集合仍 === 期望`)
  a(GO_TREES.filter((id) => domSet2.has(id)).length === 0, `⑨b 刷新后：Go treeId 仍全部不在 DOM`)
  a(st.labels.filter((l) => l === 'go' || /^go [a-z]/.test(l)).length === 0, `⑨c 刷新后：仍无 go 行`)

  const pass = R.filter((r) => r.ok).length
  console.log(`\n════ 结果 ${pass}/${R.length} ════`)
  if (pass !== R.length) console.log(R.filter((r) => !r.ok).map((r) => ' ⛔ ' + r.desc + ' ← ' + r.detail).join('\n'))
  chrome.kill()
  process.exit(pass === R.length ? 0 : 1)
}

main().catch((e) => { console.error(e); try { chrome?.kill() } catch {} process.exit(1) })
