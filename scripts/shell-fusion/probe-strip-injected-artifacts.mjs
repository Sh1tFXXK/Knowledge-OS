/**
 * STRIP-INJECTED-ARTIFACTS（清理批）· 无头浏览器实测（验收探针，按惯例保留入库）
 *
 * 用法：node scripts/shell-fusion/probe-strip-injected-artifacts.mjs http://127.0.0.1:4192/
 *      （可选环境变量 CDP_PORT）
 *
 * 断言面（每条 = 一个可观察验收点）：
 *   ① 渲染 id 集合 === tree-data.json id 集合（零增零减）——证明清理后数据仍可完整加载
 *   ② 目标 T1（MySQL 聚簇索引）读态卡片：不含「官方锚点」、不含「来源：原始行」
 *   ③ 目标 T1 读态卡片：开头不再出现「标题 + 空格 + 标题」的重复（去重生效）
 *   ④ 目标 T2（MySQL InnoDB）同 ②③
 *   ⑤ 负对照 N1（MySQL 二级索引，含**合法**「已有补充：来源」散文）⇒ 该散文仍在卡片里
 *   ⑥ 正对照（tab 面**未被误伤**）：页内 /api/data 里 T1 的 tabs 仍含「官方锚点」尾注
 *   ⑦ 全库 API 断言：正文面残留尾注 = 0 · tab 面残留 = 301（声明排除项，只报数）
 *   ⑧ 刷新后复测 ②③（持久化）
 *
 * ⚠️ 点行必须点 [data-tree-node-id] 元素本身（内层 role=button 是折叠图标且 stopPropagation）
 * ⚠️ CDP 必须连 page target（连 /json/version 时 Runtime.evaluate 无 result）
 *
 * 【UI 契约（沿用既有实测结论，勿再凭想象断言）】
 *  1. 右栏「读态」只渲染 rootContent + tag 条，**没有 tab 条** ⇒ 只断言正文面，不断言「出现 N 个 tab」。
 *  2. ✳️ 交互坑：**重复点已选中的树行 = 取消选中 → 卡片「无内容」** ⇒ 点目标前先点一个中性节点（且中性 ≠ 目标）。
 *  3. 断言读右栏文本必须读 `.explanation-card`，**不可用 document.body.innerText.slice(0,N)**（全树数万字）。
 *  4. 断言「标题重复」用**相邻重复**判据（`title + ' ' + title` 是否出现在卡片文本前 200 字），
 *     不要用全文标题计数 —— tag 条里也可能含 label，会造成假阳性。
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4192/'
const CDP_PORT = Number(process.env.CDP_PORT ?? 9341)
const CHROME = (process.env.LOCALAPPDATA ?? 'C:/Users/Administrator/AppData/Local') +
  '/ms-playwright/chromium-1187/chrome-win/chrome.exe'

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// 目标（entity id / tree id / 卡片标题）
const T1 = { entity: 'demo_clustered_index', tree: 'mysql_functional_ref_demo_clustered_index', title: 'MySQL 聚簇索引 / clustered index' }
const T2 = { entity: 'demo_innodb', tree: 'demo_tree_innodb', title: 'MySQL InnoDB' }
const N1 = { entity: 'demo_secondary_index', tree: 'tree_mvcc_secondary_index_existing', title: 'MySQL 二级索引 / secondary index' }
const N1_KEEP = '已有补充：来源' // 合法散文，清理后必须仍在

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
async function evaluate(expr, awaitPromise = true) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise })
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result?.value
}

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-strip-prof-'))
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
  const walk = (n) => { expectIds.push(n.id); (n.children ?? []).forEach(walk) }
  walk(apiTree)

  const expandAll = async () => {
    for (let k = 0; k < 40; k++) {
      const n = await evaluate(`(()=>{const els=[...document.querySelectorAll('.tree-node-icon[aria-expanded="false"]')];els.forEach(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));return els.length})()`)
      await sleep(n > 0 ? 350 : 0)
      if (n === 0) break
    }
  }
  const rowState = () => evaluate(`(()=>{const rows=[...document.querySelectorAll('[data-tree-node-id]')];
    return {n:rows.length, ids:rows.map(r=>r.getAttribute('data-tree-node-id'))}})()`)

  // 点选前先点一个中性节点（必须 ≠ 目标），规避「重复点已选中行 = 取消选中」
  const selectRow = async (treeId) => {
    const neutral = await evaluate(`(()=>{const rows=[...document.querySelectorAll('[data-tree-node-id]')];
      const t=${JSON.stringify(treeId)};
      const c=rows.find(r=>r.getAttribute('data-tree-node-id')!==t);
      return c?c.getAttribute('data-tree-node-id'):null})()`)
    if (neutral) {
      await evaluate(`(()=>{const n=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(neutral)});if(n)n.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`)
      await sleep(900)
    }
    const ok = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});if(!row)return false;row.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`)
    let snap = null
    for (let i = 0; i < 25; i++) {
      await sleep(300)
      snap = await evaluate(`(()=>{
        const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});
        const card=document.querySelector('.explanation-card');
        return {active:!!(row&&row.classList.contains('active')), cardText:card?card.innerText:''};
      })()`)
      if (snap.active && !snap.cardText.includes('无内容')) break
    }
    return { clicked: ok, neutralUsed: neutral, ...snap }
  }

  console.log('════ 清理批 strip-injected-artifacts · 无头浏览器实测 ════')
  console.log('目标：' + BASE + '   期望树节点：' + expectIds.length)

  for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
  await expandAll()
  const st = await rowState()

  // ① 渲染 id 集合 === 期望
  {
    const domSet = new Set(st.ids), expSet = new Set(expectIds)
    const missing = [...expSet].filter((x) => !domSet.has(x)), extra = [...domSet].filter((x) => !expSet.has(x))
    a(st.n === expectIds.length && missing.length === 0 && extra.length === 0,
      `① 渲染 id 集合 === tree-data id 集合（${st.n} 项零增零减）`,
      `dom=${st.n} exp=${expectIds.length} missing=${missing.slice(0, 3)} extra=${extra.slice(0, 3)}`)
  }

  // ②③ 目标 T1
  const assertTarget = async (T, tag) => {
    const s = await selectRow(T.tree)
    if (!s.clicked) { a(false, `${tag} 目标树行存在（${T.tree}）`, '行未找到'); return }
    a(true, `${tag} 目标树行存在且可选中（${T.tree}）`)
    const txt = s.cardText || ''
    a(!txt.includes('官方锚点') && !txt.includes('来源：原始行'),
      `${tag} 读态卡片不含「官方锚点」/「来源：原始行」`,
      JSON.stringify(txt.slice(0, 160)))
    const head = txt.slice(0, 200)
    a(!head.includes(T.title + ' ' + T.title),
      `${tag} 读态卡片开头无「标题+标题」重复`,
      JSON.stringify(head.slice(0, 120)))
    a(!txt.includes('无内容'), `${tag} 卡片有内容（未落到『无内容』）`)
    return txt
  }
  await assertTarget(T1, '②③')
  await assertTarget(T2, '④')

  // ⑤ 负对照
  {
    const s = await selectRow(N1.tree)
    const txt = s.cardText || ''
    a(s.clicked && txt.includes(N1_KEEP),
      `⑤ 负对照 N1 的合法散文「${N1_KEEP}」仍在卡片里`,
      JSON.stringify(txt.slice(0, 160)))
  }

  // ⑥⑦ 走 /api/data 的数据级断言（正对照 + 全库残留）
  {
    const api = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json())`)
    const FOOTER = /来源：原始行：\d+；官方锚点：https?:\/\/\S+/g
    const ents = Object.values(api)
    let rcResidual = 0, tabResidual = 0
    for (const e of ents) {
      const c = e.card || {}
      rcResidual += (String(c.rootContent || '').match(FOOTER) || []).length
      for (const t of c.tabs || []) tabResidual += (String(t.content || '').match(FOOTER) || []).length
    }
    const t1 = api[T1.entity]
    const t1TabText = (t1.card.tabs || []).map((t) => t.content || '').join('\n')
    a(t1TabText.includes('官方锚点'),
      `⑥ 正对照：T1 的 tabs 仍含尾注（tab 面本批声明不动，未被误伤）`,
      `tab 命中 ${(t1TabText.match(/官方锚点/g) || []).length}`)
    a(rcResidual === 0, `⑦ 全库正文面残留尾注 = 0`, `实际 ${rcResidual}`)
    a(tabResidual === 301, `⑦ 全库 tab 面残留 = 301（声明排除项）`, `实际 ${tabResidual}`)
  }

  // ⑧ 刷新后复测
  {
    await send('Page.navigate', { url: BASE })
    await sleep(4000)
    for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
    await expandAll()
    const s = await selectRow(T1.tree)
    const txt = s.cardText || ''
    a(!txt.includes('官方锚点') && !txt.includes('来源：原始行') && !txt.slice(0, 200).includes(T1.title + ' ' + T1.title),
      '⑧ 刷新后复测：T1 卡片仍无尾注、无标题重复',
      JSON.stringify(txt.slice(0, 160)))
  }

  const pass = R.filter((r) => r.ok).length
  console.log(`\n结果：${pass}/${R.length} ${pass === R.length ? 'ALL PASS' : '存在失败'}`)
  fs.writeFileSync('outputs/strip-injected-artifacts/probe-result.json', JSON.stringify({ at: new Date().toISOString(), base: BASE, pass, total: R.length, results: R }, null, 2))
  return pass === R.length ? 0 : 1
}

let code = 1
try {
  code = await main()
} catch (e) {
  console.error('探针异常：', e.message)
} finally {
  try { ws?.close() } catch { /* noop */ }
  try { chrome?.kill() } catch { /* noop */ }
}
process.exit(code)
