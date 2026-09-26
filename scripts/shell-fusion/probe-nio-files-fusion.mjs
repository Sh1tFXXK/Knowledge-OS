/**
 * NIO-FILES-FUSION（D 批）· 无头浏览器实测（一次性探针，按既有惯例保留入库）
 *
 * 用法：node scripts/shell-fusion/probe-nio-files-fusion.mjs http://127.0.0.1:4192/
 *
 * 断言面（每条 = 一个可观察验收点）：
 *   ① 渲染 id 集合 === tree-data.json id 集合（3203 项零增零减）——最强断言
 *   ② 负断言：DONOR（tree_nio_files_util）/ GUIDE（tree_1787916227408_nkaljw）两个 treeId 均不在 DOM
 *   ③ 全树再无名为「Files工具类」「常见用法」的行
 *   ④ SURVIVOR「java.nio.file.Files」在 DOM，祖先链 = … > java > 类库 > java.nio.file.Files
 *   ⑤ SURVIVOR 与 BEST 的父子关系仍在（BEST「最佳实践」不动）
 *   ⑥ 点选 SURVIVOR → 树行选中 + 右栏 rootContent（原首段 + DONOR 首句两段都在）+ tag 条 7 个
 *   ⑦ 负对照（量具自证）：叶子实体 java.lang.String 的索引图成员 = 12 可见 + 折叠 23
 *      ⇒ 证明「成员列表」机制在跑；SURVIVOR 无成员列表是**容器态**（is-container-header）的既有规则
 *   ⑧ /api/data 三计数 = 3203 / 3850 / 4155；DONOR/GUIDE 不在池；SURVIVOR tabs = 53 且含新 tab
 *   ⑨ 刷新后复测 ①②③④
 *
 * ⚠️ 点行必须点 [data-tree-node-id] 元素本身（内层 role=button 是折叠图标且 stopPropagation）
 * ⚠️ CDP 必须连 page target（连 /json/version 时 Runtime.evaluate 无 result）
 *
 * 【UI 契约（实测得出，勿再凭想象断言）】
 *  1. 右栏「读态」只渲染 rootContent + tag 条，**没有 tab 条**；tab 正文只有两种可达路径：
 *     ① 点索引图 class node 里的成员；② 进编辑态。故不断言「右栏出现 N 个 tab」。
 *  2. 索引图 class node 的成员**按设计排除 id==='def'**；且**容器宿主（is-container-header）
 *     根本不渲染成员列表**（UnifiedIndexGraph 仅在 !containerHost 时渲染 .explanation-index-class-members）。
 *     SURVIVOR 有子节点（最佳实践）⇒ 是容器宿主 ⇒ 44 个方法 tab 不以成员形式出现。这是既有形态。
 *  3. ✳️ 既有交互坑：**重复点已选中的树行 = 取消选中 → 卡片显示「无内容」**。
 *     故本探针凡「点选目标行」前，先点一个中性节点，保证是「新选中」。
 *  4. 断言读右栏文本必须读 .explanation-card，**不可用 document.body.innerText.slice(0,N)**
 *     ——3203 节点的展开树本身就有数万字，右栏起始偏移远大于任何切片长度。
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4192/'
const CDP_PORT = Number(process.env.CDP_PORT ?? 9337)
const CHROME = (process.env.LOCALAPPDATA ?? 'C:/Users/Administrator/AppData/Local') +
  '/ms-playwright/chromium-1187/chrome-win/chrome.exe'

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SURVIVOR_TREE = 'tree_java_nio_file_files'
const BEST_TREE = 'tree_1787916125075_qsrbco'
const DEAD_TREE = ['tree_nio_files_util', 'tree_1787916227408_nkaljw'] // DONOR, GUIDE
const LEAF_TREE = 'tree_java_lang_string' // 负对照（既有叶子实体，本批未碰）

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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-nio-prof-'))
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

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] })
  await send('Page.navigate', { url: BASE })
  await sleep(4000)

  // 期望数据（直接从 /api/data 取，自校准）
  const apiTree = await evaluate(`fetch('/api/data?file=tree-data.json').then(r=>r.json()).then(t=>t)`)
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
    return {n:rows.length, ids:rows.map(r=>r.getAttribute('data-tree-node-id')),
      labels:rows.map(r=>{const l=r.querySelector('.tree-node-label');return l?l.textContent.trim():''})}})()`)
  const chainOf = (treeId) => evaluate(`(()=>{
    const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});
    if(!row) return {found:false};
    const chain=[]; let cur=row;
    while(cur){ if(cur.classList&&cur.classList.contains('tree-node')){ const rr=cur.querySelector(':scope > .tree-node-row'); if(rr) chain.unshift((rr.querySelector('.tree-node-label')||{}).textContent?.trim()||''); } cur=cur.parentElement; }
    return {found:true, chain};
  })()`)
  // 点选前先点一个**中性节点（必须 ≠ 目标）**，规避「重复点已选中行 = 取消选中」
  // ⚠️ 首版把中性节点写成目标自身 ⇒ 第二次点击 = 取消选中 ⇒ 卡片「无内容」（量具缺陷，非数据问题）
  const selectRow = async (treeId, neutral) => {
    await evaluate(`(()=>{const n=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(neutral)});if(n)n.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`)
    await sleep(900)
    const ok = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});if(!row)return false;row.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`)
    // 等「选中态 + 卡片有内容」两个条件同时成立（规避选中后的瞬时空态）
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
    return { clicked: ok, ...snap }
  }

  console.log('════ D 批 · 无头浏览器实测 ════')
  console.log('目标：' + BASE + '   期望树节点：' + expectIds.length)

  for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
  await expandAll()
  let st = await rowState()

  // ① 渲染 id 集合 === 期望 id 集合
  {
    const domSet = new Set(st.ids), expSet = new Set(expectIds)
    const missing = [...expSet].filter((x) => !domSet.has(x)), extra = [...domSet].filter((x) => !expSet.has(x))
    a(st.n === expectIds.length && missing.length === 0 && extra.length === 0,
      `① 渲染 id 集合 === tree-data id 集合（${st.n} 项零增零减）`,
      `dom=${st.n} exp=${expectIds.length} missing=${missing.slice(0, 3)} extra=${extra.slice(0, 3)}`)
  }

  // ② DONOR / GUIDE treeId 不在 DOM
  {
    const hit = DEAD_TREE.filter((id) => st.ids.includes(id))
    a(hit.length === 0, '② 负断言：DONOR / GUIDE 的 treeId 均不在 DOM', hit.join(','))
  }

  // ③ 全树再无「Files工具类」「常见用法」行
  {
    const dead = ['Files工具类', '常见用法']
    const hit = dead.filter((l) => st.labels.includes(l))
    a(hit.length === 0, '③ 全树再无名为「Files工具类」「常见用法」的行', hit.join(','))
  }

  // ④ SURVIVOR 在 DOM + 祖先链
  {
    const r = await chainOf(SURVIVOR_TREE)
    const expectChain = ['知识宇宙', '计算机科学', '软件符号与工具', '编程语言', 'java', '类库', 'java.nio.file.Files']
    a(r.found, '④a java.nio.file.Files 在 DOM', '')
    a(r.found && JSON.stringify(r.chain) === JSON.stringify(expectChain), '④b 祖先链 = ' + expectChain.join(' > '), r.found ? r.chain.join(' > ') : 'n/a')
  }

  // ⑤ BEST 不动：仍在 DOM，且仍挂在 SURVIVOR 之下
  {
    const b = await chainOf(BEST_TREE)
    a(b.found && b.chain[b.chain.length - 1] === '最佳实践', '⑤a BEST「最佳实践」仍在 DOM（本批不动）', JSON.stringify(b))
    a(b.found && b.chain[b.chain.length - 2] === 'java.nio.file.Files', '⑤b BEST 仍是 SURVIVOR 的子节点', b.found ? b.chain.join(' > ') : 'n/a')
  }

  // ⑥ 点选 SURVIVOR → 右栏 rootContent + tag 条
  {
    const p = await selectRow(SURVIVOR_TREE, BEST_TREE)
    const tags = await evaluate(`[...document.querySelectorAll('.explanation-card .concept-supertag')].map(e=>e.textContent.trim())`)
    a(p.clicked && p.active, '⑥a 点选后 SURVIVOR 树行为选中态（.tree-node-row.active）', JSON.stringify({ clicked: p.clicked, active: p.active }))
    a(p.cardText.includes('java.nio.file 包下的静态文件工具类'), '⑥b 右栏 rootContent 保留原首段（本批未改写）', JSON.stringify(p.cardText.replace(/\s+/g, ' ').slice(0, 140)))
    a(p.cardText.includes('是 NIO.2 提供的文件操作工具类'), '⑥c 右栏 rootContent 含 DONOR 首句（融合已生效）', JSON.stringify(p.cardText.replace(/\s+/g, ' ').slice(0, 140)))
    const wantTags = ['java.nio.file.Files', 'java', 'jdk', '常用类库', 'java.nio.file', 'NIO', '文件操作']
    a(wantTags.every((t) => tags.includes(t)) && tags.length === wantTags.length,
      '⑥d 右栏 tag 条 = 原 4 + 并入 3（共 7）', JSON.stringify(tags))
  }

  // ⑦ 负对照：叶子实体 java.lang.String 的成员列表机制仍在（12 可见 + 折叠 23）
  {
    await selectRow(LEAF_TREE, SURVIVOR_TREE)
    const m = await evaluate(`(()=>{
      const node=document.querySelector('.explanation-index-class-node');
      if(!node) return {found:false};
      const vis=[...node.querySelectorAll('.explanation-index-class-member-copy')].map(e=>e.textContent.trim());
      const more=node.querySelector('.explanation-index-class-member-more');
      return {found:true, isContainer:node.classList.contains('is-container-header'), visible:vis.length, more:more?more.textContent.trim():''};
    })()`)
    a(m.found && !m.isContainer && m.visible === 12,
      '⑦a 负对照：叶子实体 java.lang.String 索引图渲染 12 个可见成员（MAX_VISIBLE_MEMBERS）', JSON.stringify(m))
    a(m.found && (m.more || '').includes('23'),
      '⑦b 负对照：折叠提示含 23（36 tab − def 1 − 可见 12 = 23）', JSON.stringify(m.more))
    await selectRow(SURVIVOR_TREE, LEAF_TREE)
    const s = await evaluate(`(()=>{const n=document.querySelector('.explanation-index-class-node');return n?{isContainer:n.classList.contains('is-container-header'),hasMembers:!!n.querySelector('.explanation-index-class-members')}:{found:false}})()`)
    a(s.isContainer === true && s.hasMembers === false,
      '⑦c SURVIVOR 为容器宿主 ⇒ 按设计不渲染成员列表（既有规则，非内容缺失）', JSON.stringify(s))
  }

  // ⑧ /api/data 三计数 + 池内容
  {
    const c = await evaluate(`(async()=>{
      const t=await (await fetch('/api/data?file=tree-data.json')).json();
      const p=await (await fetch('/api/data?file=node-pool.json')).json();
      const e=await (await fetch('/api/data?file=knowledge-edges.json')).json();
      let n=0; const w=x=>{n++;(x.children||[]).forEach(w)}; w(t);
      const ea=Array.isArray(e)?e:e.edges;
      const s=p['k_java_nio_file_files'];
      return {tree:n, pool:Object.keys(p).length, edges:ea.length,
        donor:!!p['k_nio_files_util'], guide:!!p['k_1787916226907_9aq9u6'], best:!!p['k_1787916124192_mow0sq'],
        survivorTabs:s?s.card.tabs.length:0,
        newTabs:s?['options','watch-service','notExists','readString','walkFileTree'].filter(x=>s.card.tabs.some(t=>t.id===x)):[]};
    })()`)
    a(c.tree === 3203 && c.pool === 3850 && c.edges === 4155, '⑧a /api/data 计数 = 3203 / 3850 / 4155', JSON.stringify(c))
    a(!c.donor && !c.guide && c.best, '⑧b DONOR / GUIDE 已从池移除，BEST 保留', JSON.stringify({ donor: c.donor, guide: c.guide, best: c.best }))
    a(c.survivorTabs === 53, '⑧c SURVIVOR tabs = 53', String(c.survivorTabs))
    a(c.newTabs.length === 5, '⑧d 新增 tab 就位（options / watch-service / notExists / readString / walkFileTree）', JSON.stringify(c.newTabs))
  }

  // ⑨ 刷新后复测关键项
  {
    await send('Page.navigate', { url: BASE })
    await sleep(4000)
    await expandAll()
    const s2 = await rowState()
    const domSet = new Set(s2.ids), expSet = new Set(expectIds)
    const ok1 = s2.n === expectIds.length && [...expSet].every((x) => domSet.has(x)) && [...domSet].every((x) => expSet.has(x))
    a(ok1, `⑨a 刷新后：渲染 id 集合仍 === ${expectIds.length} 项`, `dom=${s2.n}`)
    a(s2.ids.includes(SURVIVOR_TREE), '⑨b 刷新后：java.nio.file.Files 仍在 DOM')
    a(DEAD_TREE.every((id) => !s2.ids.includes(id)), '⑨c 刷新后：DONOR / GUIDE 的 treeId 仍不在 DOM')
    a(!['Files工具类', '常见用法'].some((l) => s2.labels.includes(l)), '⑨d 刷新后：全树仍无「Files工具类」「常见用法」行')
  }

  console.log('\n' + '─'.repeat(50))
  const pass = R.filter((x) => x.ok).length
  console.log(`${pass}/${R.length} ${pass === R.length ? '— ✅ ALL PASS' : '— ⛔ 有失败项'}`)

  try { await send('Browser.close') } catch { /* noop */ }
  try { ws.close() } catch { /* noop */ }
  try { chrome.kill() } catch { /* noop */ }
  await sleep(500)
  try { fs.rmSync(profile, { recursive: true, force: true }) } catch { /* noop */ }
  process.exit(pass === R.length ? 0 : 1)
}

main().catch(async (e) => {
  console.error('探针异常：' + e.message)
  try { ws?.close() } catch { /* noop */ }
  try { chrome?.kill() } catch { /* noop */ }
  process.exit(2)
})
