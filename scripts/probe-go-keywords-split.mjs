/**
 * Go 域「关键字」拆分 · 无头浏览器实测（验收脚本，入库）
 *
 * 用法：node scripts/probe-go-keywords-split.mjs http://127.0.0.1:4192/
 *
 * 断言面（每条 = 一个可观察验收点）：
 *   【A · API 基线】树 3265 / 池 3909 / 边 4199；Go 子树 63（38 + 25）
 *   【A2】父节点 children = 25，names 顺序 === 关键字清单
 *   【B · 新增件】25 个新池实体存在且 card 无 rootContent 键；25 条 treebind 边精确
 *   【C · DOM】① 渲染 id 集合 === tree-data.json id 集合（3265，零增零减）——最强断言
 *             ② 父节点「关键字」下渲染 25 个子条目（祖先链定位 + id 集合 + label 集合 + 全页无重复）
 *   【D · 交互】④ 点选关键字子节点（含与域根节点同名的 `go`）→ 右栏为空壳，且不含父卡正文
 *             ⑤ 点选父节点 → 右栏含引言句 + 全部 25 个关键字
 *             ⑤a 名单渲染为 1 个 <ul> 的 25 个 <li>（判据打 DOM 结构，不打 innerText 找 `- `）
 *   【E】刷新后复测 ①②③
 *
 * ⚠️ 点行必须点 [data-tree-node-id] 本身（内层折叠图标 stopPropagation）
 * ⚠️ 重复点已选中行 = 取消选中 ⇒ 点选前先点中性节点复位
 * ⚠️ 读右栏必须读 .explanation-card，禁用 body.innerText.slice()
 *
 * ⛔ 量具铁律（本批风险高于上一批）：25 个关键字**全是英文裸词**（break/case/for/if/map/
 *    interface/go/select/type/... ），全库跨域同名节点极多（Java/JS/Python 的 for/if/return、
 *    以及 Go 域根节点本体就叫 `go`）。**严禁**全页按 .tree-node-label 文本匹配定位目标行。
 *    本脚本一律：① 由 API 树内「关键字父节点的 children」建 name→treeId 映射；
 *    ② 每次点选后**回读 DOM label** 复核；③ 保留「零跨域泄漏」负断言。
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4192/'
const CDP_PORT = Number(process.env.CDP_PORT ?? 9353)
const CHROME = (process.env.LOCALAPPDATA ?? 'C:/Users/Administrator/AppData/Local') +
  '/ms-playwright/chromium-1187/chrome-win/chrome.exe'

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const GO_ROOT = 'tree_1786618025853_3qn55e'
const PARENT_TREE = 'tree_1787723651777_57iok2'
const PARENT_K = 'k_1787723651360_r3tqg7'
const KEYWORDS = 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'.split(' ')
const treeIdOf = (kw) => `tree_go_keyword_${kw}`
const poolIdOf = (kw) => `k_go_keyword_${kw}`
const edgeIdOf = (kw) => `treebind:${PARENT_TREE}:${treeIdOf(kw)}`
const INTRO = 'Go 包含以下 25 个关键词'

const R = []
const a = (ok, desc, detail = '') => { R.push({ ok, desc, detail }); console.log('  ' + (ok ? '✅' : '⛔') + ' ' + desc + (ok || !detail ? '' : ' ← ' + detail)) }
const info = (desc) => console.log('  ℹ️ ' + desc)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let chrome, ws, msgId = 0
const pending = new Map()
function send(method, params = {}) {
  const id = ++msgId
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((res, rej) => { pending.set(id, { res, rej }); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('CDP timeout: ' + method)) } }, 60000) })
}
async function evaluate(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300))
  return r.result?.value
}
const J = (v) => JSON.stringify(v)

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-gokw-prof-'))
  chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' })
  let target = null
  for (let i = 0; i < 60 && !target; i++) { await sleep(400); try { target = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find((t) => t.type === 'page') } catch {} }
  if (!target) throw new Error('未找到 page target')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result) } }
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] })
  await send('Page.navigate', { url: BASE }); await sleep(4000)

  /* ── API 侧取证 ─────────────────────────────────────── */
  const apiTree = await evaluate(`fetch('/api/data?file=tree-data.json').then(r=>r.json())`)
  const expectIds = []
  ;(function walk(n) { expectIds.push(n.id); (n.children ?? []).forEach(walk) })(apiTree)
  const findNode = (n, id) => { if (!n) return null; if (n.id === id) return n; for (const c of n.children ?? []) { const r = findNode(c, id); if (r) return r } return null }
  const goRoot = findNode(apiTree, GO_ROOT)
  const goIds = []
  ;(function x(y) { goIds.push(y.id); (y.children ?? []).forEach(x) })(goRoot)
  const goIdSet = new Set(goIds)
  const goNames = []
  ;(function x(y) { goNames.push(y.name); (y.children ?? []).forEach(x) })(goRoot)
  const NEUTRAL_ID = expectIds.find((id) => !goIdSet.has(id))

  const apiParent = findNode(apiTree, PARENT_TREE)
  const apiKids = apiParent?.children ?? []
  const nameToId = new Map(apiKids.map((c) => [c.name, c.id]))
  // ⚠️ 量具对象必须收窄到「本批实际用于定位的 25 键局部映射」。
  //    上一批的「Go 子树全表 name 唯一」判据在本批**必然为假且与任务无关**：
  //    用户裁决关键字用**裸词**，故 `go` 与 Go 域根节点本体同名（interface/select 同理）。
  //    这不是数据缺陷，是裁决结果；如实登记为已知事实，量具改用 treeId 定位。
  const kidNames = apiKids.map((c) => c.name)
  const kidDup = [...new Set(kidNames)].filter((k) => kidNames.filter((n) => n === k).length > 1)
  const goNameDupIds = goIds.filter((id, i) => goNames[i] === 'go')

  console.log('════ Go 域「关键字」拆分 · 无头实测 ════')
  console.log('目标：' + BASE + '   期望树节点：' + expectIds.length)

  console.log('\n【A · API 基线】')
  a(expectIds.length === 3265, '/api/data 树节点 = 3265', String(expectIds.length))
  const poolCnt = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json()).then(p=>Object.keys(p).length)`)
  const edgeCnt = await evaluate(`fetch('/api/data?file=knowledge-edges.json').then(r=>r.json()).then(e=>e.length)`)
  a(poolCnt === 3909, '池 = 3909', String(poolCnt))
  a(edgeCnt === 4199, '边 = 4199', String(edgeCnt))
  a(goIds.length === 63, 'Go 子树 = 63（38 + 25 关键字）', String(goIds.length))
  a(kidDup.length === 0, '量具：本批定位所用的 25 键 name→treeId 局部映射无重名（无歧义）', kidDup.join(','))
  a(goNameDupIds.includes(GO_ROOT) && goNameDupIds.includes(treeIdOf('go')) && goNameDupIds.length === 2,
    '量具·已知事实：Go 子树内 «go» 恰 2 个（域根节点本体 + 关键字节点）——用户裁决裸词的预期结果，非缺陷；定位一律用 treeId',
    goNameDupIds.join(','))

  console.log('\n【A2 · 父节点「关键字」的 children】')
  a(!!apiParent && apiParent.nodeRef === PARENT_K, `父树条目存在且 nodeRef = ${PARENT_K}`)
  a(apiKids.length === 25, `父节点 children = 25`, String(apiKids.length))
  a(JSON.stringify(apiKids.map((c) => c.name)) === JSON.stringify(KEYWORDS), '25 个子条目 name 顺序 === 关键字清单')
  a(KEYWORDS.every((kw, i) => apiKids[i]?.id === treeIdOf(kw) && apiKids[i]?.nodeRef === poolIdOf(kw)), '25 个子条目 id/nodeRef 命名与清单一一对应')

  console.log('\n【B · 新增件（池 + 边）】')
  const apiPool = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json())`)
  const apiEdges = await evaluate(`fetch('/api/data?file=knowledge-edges.json').then(r=>r.json())`)
  const poolBad = KEYWORDS.filter((kw) => {
    const e = apiPool[poolIdOf(kw)]
    return !e || e.label !== kw || JSON.stringify(e.card.tabs) !== '[]' || 'rootContent' in e.card || e.card.nodeId !== poolIdOf(kw)
  })
  a(poolBad.length === 0, '25 个新池实体存在 · label 正确 · tabs 空 · ⛔ card 无 rootContent 键（空壳）', poolBad.join(','))
  const edgeBad = KEYWORDS.filter((kw) => {
    const e = apiEdges.find((x) => x.id === edgeIdOf(kw))
    return !e || e.source !== PARENT_K || e.target !== poolIdOf(kw) || e.type !== 'belongs-to' || e.label !== 'contains' || e.relationKind !== 'structure'
  })
  a(edgeBad.length === 0, '25 条 treebind 边齐备（source=父卡池 / target=子节点池 / stays structure）', edgeBad.join(','))

  /* ── DOM 侧 ─────────────────────────────────────────── */
  const expandAll = async () => { for (let k = 0; k < 60; k++) { const n = await evaluate(`(()=>{const els=[...document.querySelectorAll('.tree-node-icon[aria-expanded="false"]')];els.forEach(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));return els.length})()`); await sleep(n > 0 ? 350 : 0); if (n === 0) break } }
  const rowState = () => evaluate(`(()=>{const rows=[...document.querySelectorAll('[data-tree-node-id]')];return {n:rows.length, ids:rows.map(r=>r.getAttribute('data-tree-node-id'))}})()`)
  const selectRow = async (treeId, neutral) => {
    const pre = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${J(treeId)});return row?row.classList.contains('active'):null})()`)
    if (pre === null) return { clicked: false, active: false, cardText: null, label: null }
    if (pre && neutral) {
      await evaluate(`(()=>{const n=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${J(neutral)});if(n)n.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`)
      await sleep(700)
    }
    const ok = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${J(treeId)});if(!row)return false;row.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`)
    let active = false
    for (let i = 0; i < 20; i++) {
      await sleep(250)
      active = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${J(treeId)});return !!(row&&row.classList.contains('active'))})()`)
      if (active) break
    }
    await sleep(600)
    const snap = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${J(treeId)});const card=document.querySelector('.explanation-card');const l=row&&row.querySelector('.tree-node-label');return {cardText:card?card.innerText:'', label:l?l.textContent.trim():null}})()`)
    return { clicked: ok, active, ...snap }
  }

  // ① 渲染 id 集合 === tree-data.json id 集合（最强断言）
  console.log('\n【C · DOM 渲染】')
  for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
  await expandAll()
  let st = await rowState()
  const expSet = new Set(expectIds)
  let domSet = new Set(st.ids)
  a(expectIds.filter((id) => !domSet.has(id)).length === 0 && st.ids.filter((id) => !expSet.has(id)).length === 0,
    `① 渲染 id 集合 === tree-data.json（${expectIds.length} 项，零增零减）`,
    `missing=${expectIds.filter((id) => !domSet.has(id)).length} extra=${st.ids.filter((id) => !expSet.has(id)).length} dom=${st.ids.length}`)
  a(KEYWORDS.every((kw) => domSet.has(treeIdOf(kw))), '② 25 个关键字 treeId 全部出现在 DOM', KEYWORDS.filter((kw) => !domSet.has(treeIdOf(kw))).join(','))

  // ③ 父节点下渲染 25 个子条目（祖先链定位，非文本匹配）
  const parentKids = await evaluate(`(()=>{
    const p=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${J(PARENT_TREE)});
    if(!p) return {found:false};
    const holder=p.closest('.tree-node')||p.parentElement;
    const wrap=holder.querySelector(':scope > .tree-node-children');
    if(!wrap) return {found:true,hasWrap:false};
    const kids=[...wrap.querySelectorAll('[data-tree-node-id]')];
    return {found:true,hasWrap:true,n:kids.length,
      ids:kids.map(k=>k.getAttribute('data-tree-node-id')),
      labels:kids.map(k=>{const l=k.querySelector('.tree-node-label');return l?l.textContent.trim():null}),
      pageTotal:[...document.querySelectorAll('[data-tree-node-id]')].filter(r=>${J(KEYWORDS.map(treeIdOf))}.includes(r.getAttribute('data-tree-node-id'))).length};
  })()`)
  a(parentKids.found && parentKids.hasWrap, '③ 父行「关键字」定位成功且存在 .tree-node-children 容器', JSON.stringify(parentKids).slice(0, 200))
  a(parentKids.n === 25, '③a 父节点直接子树内渲染 25 个子条目', String(parentKids.n))
  a(parentKids.ids && JSON.stringify([...parentKids.ids].sort()) === JSON.stringify([...KEYWORDS.map(treeIdOf)].sort()),
    '③b 子条目 id 集合 === 25 个关键字 treeId（精确，零跨域混入）', JSON.stringify(parentKids.ids).slice(0, 200))
  a(parentKids.labels && JSON.stringify([...parentKids.labels].sort()) === JSON.stringify([...KEYWORDS].sort()),
    '③c 子条目 DOM label 集合 === 25 个关键字（裸词，无「（关键字）」后缀）', JSON.stringify(parentKids.labels).slice(0, 200))
  a(parentKids.pageTotal === 25, '③d 全页 25 个关键字 treeId 仅渲染一次（无重复挂载）', String(parentKids.pageTotal))

  // ④ 点选关键字子节点 → 空壳读态（防串卡）
  console.log('\n【D · 交互 · 子节点空壳 / 父卡正文】')
  const SAMPLE = ['break', 'go', 'var']   // 含与 Go 域根节点同名的 `go`，最易量具误伤
  let leak = 0
  for (const kw of SAMPLE) {
    const tid = nameToId.get(kw) ?? treeIdOf(kw)
    if (!goIdSet.has(tid)) leak++
    const s = await selectRow(tid, NEUTRAL_ID)
    const ok = s.active && s.label === kw && !!s.cardText && !s.cardText.includes(INTRO)
    a(ok, `④ 「${kw}」(${tid}) 点选：DOM label 复核一致 + 右栏为空壳（不含父卡正文）`,
      `label=${s.label} cardText=${J((s.cardText ?? '').slice(0, 50))}`)
  }
  a(leak === 0, '④x 量具负断言：3 个被点 treeId 全部落在 Go 子树内（零跨域泄漏）', String(leak))

  // ⑤ 点选父节点 → 右栏含引言句 + 25 个关键字
  const ps = await selectRow(PARENT_TREE, NEUTRAL_ID)
  const missingKw = KEYWORDS.filter((kw) => !(ps.cardText ?? '').includes(kw))
  a(ps.active && ps.label === '关键字' && (ps.cardText ?? '').includes(INTRO) && missingKw.length === 0,
    `⑤ 点选父节点「关键字」→ 右栏含引言句 + 全部 25 个关键字（读态未退化为容器）`,
    `label=${ps.label} missing=[${missingKw.join(',')}] text=${J((ps.cardText ?? '').slice(0, 120))}`)
  // ⑤a 名单的渲染产物是**结构化列表**（Markdown 源文 `- kw` → `<ul><li>kw</li>`），
  //     故判据必须打 DOM 结构；打 innerText 找 `- ` 前缀会把「源文形态」误当「渲染结果」。
  const listInfo = await evaluate(`(()=>{const c=document.querySelector('.explanation-card');if(!c)return {ul:0,li:[]};return {ul:c.querySelectorAll('ul').length,li:[...c.querySelectorAll('ul > li')].map(x=>x.textContent.trim())};})()`)
  a(listInfo.ul === 1 && JSON.stringify(listInfo.li) === JSON.stringify(KEYWORDS),
    '⑤a 右栏把 25 项名单渲染为 1 个 <ul> 的 25 个 <li>，顺序一致',
    `ul=${listInfo.ul} li=${listInfo.li.length} ${JSON.stringify(listInfo.li).slice(0, 160)}`)

  /* ── 刷新复测 ───────────────────────────────────────── */
  console.log('\n【E · 刷新后复测】')
  await send('Page.navigate', { url: BASE }); await sleep(4000)
  for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
  await expandAll()
  st = await rowState()
  domSet = new Set(st.ids)
  a(expectIds.filter((id) => !domSet.has(id)).length === 0 && st.ids.filter((id) => !expSet.has(id)).length === 0,
    '⑥a 刷新后：渲染 id 集合仍 === 3265（零增零减）',
    `missing=${expectIds.filter((id) => !domSet.has(id)).length} extra=${st.ids.filter((id) => !expSet.has(id)).length}`)
  const pk2 = await evaluate(`(()=>{
    const p=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${J(PARENT_TREE)});
    if(!p) return {n:-1};
    const holder=p.closest('.tree-node')||p.parentElement;
    const wrap=holder.querySelector(':scope > .tree-node-children');
    if(!wrap) return {n:-2};
    return {n:[...wrap.querySelectorAll('[data-tree-node-id]')].length};
  })()`)
  a(pk2.n === 25, '⑥b 刷新后：父节点下仍渲染 25 个子条目', String(pk2.n))

  const pass = R.filter((r) => r.ok).length
  console.log(`\n════ 结果 ${pass}/${R.length} ════`)
  if (pass !== R.length) console.log(R.filter((r) => !r.ok).map((r) => ' ⛔ ' + r.desc + ' ← ' + r.detail).join('\n'))
  chrome.kill()
  process.exit(pass === R.length ? 0 : 1)
}
main().catch((e) => { console.error(e); try { chrome?.kill() } catch {} process.exit(1) })
