/**
 * Go 域拆分/删除/融合 · 无头浏览器实测（验收脚本，入库）
 *
 * 用法：node scripts/probe-go-domain-split-fusion.mjs http://127.0.0.1:4192/
 *
 * 断言面（每条 = 一个可观察验收点）：
 *   ① 渲染 id 集合 === tree-data.json id 集合（3240，零增零减）——最强断言
 *   ② 负断言：DONOR「使用参数化类型的泛型代码」treeId 不在 DOM
 *   ③ Go 子树渲染 38 卡（39 − DONOR）
 *   ④ 迁段生效（点选目标卡 → 右栏卡片文本含迁入段首句）：
 *      数组 ← 「对于每种类型T」 · 切片 ← 「动态数组可以作为」 · 指针 ← 「指针对所有类型都是可用的」
 *      Map ← 「类型 map[K]V」 · 基本数据类型 ← 「Go语言包含以下基本类型」
 *   ⑤ 迁段生效（跨卡）：工具 ← gofmt · 历史 ← 「初始版本的Go缺乏」 · 应用程序 ← 「你好，世界」
 *   ⑥ 负断言：并发卡不再含「你好，世界」/「gofmt」/「遗漏」
 *   ⑦ 引注已清：并发右栏不含「: 280–281」、语法不含「[b]」
 *   ⑧ 空壳卡（结构体/运算符）点选 → 卡片「无内容」属预期（信息项，不计失败）
 *   ⑨ /api/data 三计数 = 3240 / 3884 / 4174；池无 DONOR
 *   ⑩ 刷新后复测 ①③⑤
 *
 * ⚠️ 点行必须点 [data-tree-node-id] 本身（内层折叠图标 stopPropagation）
 * ⚠️ 重复点已选中行 = 取消选中 ⇒ 点选前先点中性节点
 * ⚠️ 读右栏必须读 .explanation-card，不可用 body.innerText.slice()
 *
 * ⛔ 量具铁律：目标节点一律由「API 树内 Go 子树的 name→treeId 映射」定位。
 *    禁止全页按 .tree-node-label 文本匹配 —— 全库存在跨域同名节点
 *    （Go「数组」↔ Java「数组」、Go「Map」↔ java.util.Map），
 *    按文本匹配会静默点到别的域，把「量具缺陷」伪装成「数据缺陷」。
 *    本脚本首版即踩此坑（23/25，两条失败实为点中 Java 节点），故保留 ④x 跨域泄漏负断言。
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4192/'
const CDP_PORT = Number(process.env.CDP_PORT ?? 9351)
const CHROME = (process.env.LOCALAPPDATA ?? 'C:/Users/Administrator/AppData/Local') +
  '/ms-playwright/chromium-1187/chrome-win/chrome.exe'

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const GO_ROOT = 'tree_1786618025853_3qn55e'
const DONOR_TREE = 'tree_1787731983672_nllsdb'

const R = []
const a = (ok, desc, detail = '') => { R.push({ ok, desc, detail }); console.log('  ' + (ok ? '✅' : '⛔') + ' ' + desc + (ok || !detail ? '' : ' ← ' + detail)) }
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

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-gosf-prof-'))
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

  const apiTree = await evaluate(`fetch('/api/data?file=tree-data.json').then(r=>r.json())`)
  const expectIds = []
  ;(function walk(n) { expectIds.push(n.id); (n.children ?? []).forEach(walk) })(apiTree)
  let goIds = [], goRefs = []
  ;(function find(n) { if (n.id === GO_ROOT) return (function x(y) { goIds.push(y.id); goRefs.push(y.nodeRef); (y.children || []).forEach(x) })(n); (n.children ?? []).forEach(find) })(apiTree)
  // ⚠️ 量具铁律：目标节点一律用「API 树内 Go 子树的 name→treeId 映射」定位，
  //    禁止全页按 .tree-node-label 文本匹配 —— 全库存在跨域同名节点（Go「数组」↔ Java「数组」、
  //    Go「Map」↔ java.util.Map），文本匹配会静默点错域，把量具缺陷伪装成数据缺陷。
  const goNodes = []
  ;(function x(y) { goNodes.push({ id: y.id, name: y.name }); (y.children ?? []).forEach(x) })((function f(n) {
    if (n.id === GO_ROOT) return n
    for (const c of n.children ?? []) { const r = f(c); if (r) return r }
    return null
  })(apiTree))
  const goNameToId = new Map(goNodes.map((n) => [n.name, n.id]))
  const dupNames = [...goNameToId.keys()].filter((k) => goNodes.filter((n) => n.name === k).length > 1)
  const goIdSet = new Set(goIds)
  // 中性节点：取全局树中第一个非 Go 域节点（保证存在且不在 Go 子树上，避免与其他域同名节点混淆）
  const NEUTRAL_ID = expectIds.find((id) => !goIdSet.has(id))

  const expandAll = async () => { for (let k = 0; k < 40; k++) { const n = await evaluate(`(()=>{const els=[...document.querySelectorAll('.tree-node-icon[aria-expanded="false"]')];els.forEach(e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));return els.length})()`); await sleep(n > 0 ? 350 : 0); if (n === 0) break } }
  const rowState = () => evaluate(`(()=>{const rows=[...document.querySelectorAll('[data-tree-node-id]')];return {n:rows.length, ids:rows.map(r=>r.getAttribute('data-tree-node-id'))}})()`)
  const selectRow = async (treeId, neutral) => {
    // 已选中态下重复点击 = 取消选中（卡片变成「无内容」）⇒ 先点中性节点复位
    const pre = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});return row?row.classList.contains('active'):null})()`)
    if (pre === null) return { clicked: false, active: false, cardText: '' }
    if (pre && neutral) {
      await evaluate(`(()=>{const n=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(neutral)});if(n)n.dispatchEvent(new MouseEvent('click',{bubbles:true}))})()`)
      await sleep(800)
    }
    const ok = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});if(!row)return false;row.dispatchEvent(new MouseEvent('click',{bubbles:true}));return true})()`)
    let snap = null
    for (let i = 0; i < 25; i++) {
      await sleep(300)
      snap = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(treeId)});const card=document.querySelector('.explanation-card');return {active:!!(row&&row.classList.contains('active')), cardText:card?card.innerText:''}})()`)
      if (snap.active && snap.cardText.length > 0) break
    }
    return { clicked: ok, ...snap }
  }

  console.log('════ Go 域拆分/删除/融合 · 无头实测 ════')
  console.log('目标：' + BASE + '   期望树节点：' + expectIds.length)
  a(expectIds.length === 3240, '/api/data 树节点 = 3240', String(expectIds.length))
  a(goIds.length === 38, `Go 子树 = 38（39 − DONOR）`, String(goIds.length))
  a(!goIds.includes(DONOR_TREE), 'DONOR treeId 不在 API 树')
  a(dupNames.length === 0, '量具：Go 子树内 name 无重名（name→treeId 映射无歧义）', dupNames.join(','))
  a(goNodes.length === goIdSet.size, '量具：Go 子树节点表与 id 集合一致', `${goNodes.length} vs ${goIdSet.size}`)

  for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
  await expandAll()
  let st = await rowState()
  const domSet = new Set(st.ids), expSet = new Set(expectIds)
  a(expectIds.filter((id) => !domSet.has(id)).length === 0 && st.ids.filter((id) => !expSet.has(id)).length === 0,
    `① 渲染 id 集合 === tree-data.json（${expectIds.length} 项，零增零减）`,
    `missing=${expectIds.filter((id) => !domSet.has(id)).length} extra=${st.ids.filter((id) => !expSet.has(id)).length}`)
  a(!domSet.has(DONOR_TREE), '② 负断言：DONOR「使用参数化类型的泛型代码」不在 DOM')
  a(goIds.filter((id) => domSet.has(id)).length === 38, '③ Go 子树 38 卡全部渲染')

  // ④⑤ 迁段生效：由 Go 子树 name→treeId 映射定位（不按 DOM 文本匹配）并点选，读右栏
  const byLabel = (label) => goNameToId.get(label) ?? null
  const CASES = [
    ['数组', '对于每种类型T'], ['切片', '动态数组可以作为'], ['指针', '指针对所有类型都是可用的'],
    ['Map', 'map[K]V'], ['基本数据类型', 'Go语言包含以下基本类型'],
    ['工具', 'gofmt'], ['历史', '初始版本的Go缺乏'], ['应用程序', '你好，世界'],
    ['复合数据类型', 'Go提供了两种替代类继承的特性'],
  ]
  let domainLeak = 0
  for (const [label, needle] of CASES) {
    const tid = byLabel(label)
    if (!tid) { a(false, `④ 找不到 Go 子树节点「${label}」`); continue }
    if (!goIdSet.has(tid)) domainLeak++
    const s = await selectRow(tid, NEUTRAL_ID)
    const shown = await evaluate(`(()=>{const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')===${JSON.stringify(tid)});const l=row&&row.querySelector('.tree-node-label');return l?l.textContent.trim():null})()`)
    a(s.active && s.cardText.includes(needle) && shown === label,
      `④ 「${label}」(${tid}) 右栏含迁入内容 «${needle}»`,
      `label=${shown} ` + s.cardText.slice(0, 60).replace(/\n/g, ' '))
  }
  a(domainLeak === 0, '④x 量具负断言：9 个目标 treeId 全部落在 Go 子树内（零跨域泄漏）', String(domainLeak))
  // ⑥ 负断言：并发卡不再含迁出内容
  const concTid = byLabel('并发')
  const conc = await selectRow(concTid, NEUTRAL_ID)
  for (const bad of ['你好，世界', 'gofmt', '遗漏', ': 280–281'])
    a(!conc.cardText.includes(bad), `⑥ 负断言：并发卡已不含 «${bad}»`)
  // ⑦ 引注已清
  a(!conc.cardText.includes(': 151–152') && !conc.cardText.includes('[e]'), '⑦ 并发卡引注已清')
  // ⑧ 空壳卡（信息项）
  for (const label of ['结构体', '运算符']) {
    const tid = byLabel(label)
    const s = tid ? await selectRow(tid, NEUTRAL_ID) : null
    console.log(`  ℹ️ 空壳卡「${label}」(${tid ?? '找不到'}) 点选后右栏 = ${s ? JSON.stringify(s.cardText.slice(0, 20)) : '找不到行'}（预期：无内容）`)
  }
  // ⑨ API 计数
  const poolCnt = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json()).then(p=>Object.keys(p).length)`)
  const edgeCnt = await evaluate(`fetch('/api/data?file=knowledge-edges.json').then(r=>r.json()).then(e=>e.length)`)
  const hasDonor = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json()).then(p=>${JSON.stringify('k_1787731983101_tjcyzw')} in p)`)
  a(poolCnt === 3884, '⑨ 池 = 3884', String(poolCnt))
  a(edgeCnt === 4174, '⑨b 边 = 4174', String(edgeCnt))
  a(hasDonor === false, '⑨c 池中已无 DONOR 节点')
  // ⑩ 刷新后复测
  await send('Page.navigate', { url: BASE }); await sleep(4000)
  for (let i = 0; i < 40; i++) { const s = await rowState(); if (s.n > 0) break; await sleep(500) }
  await expandAll()
  st = await rowState()
  const dom2 = new Set(st.ids)
  a(expectIds.filter((id) => !dom2.has(id)).length === 0 && st.ids.filter((id) => !expSet.has(id)).length === 0, '⑩a 刷新后：渲染 id 集合仍 === 期望')
  a(!dom2.has(DONOR_TREE), '⑩b 刷新后：DONOR 仍不在 DOM')

  const pass = R.filter((r) => r.ok).length
  console.log(`\n════ 结果 ${pass}/${R.length} ════`)
  if (pass !== R.length) console.log(R.filter((r) => !r.ok).map((r) => ' ⛔ ' + r.desc + ' ← ' + r.detail).join('\n'))
  chrome.kill()
  process.exit(pass === R.length ? 0 : 1)
}
main().catch((e) => { console.error(e); try { chrome?.kill() } catch {} process.exit(1) })
