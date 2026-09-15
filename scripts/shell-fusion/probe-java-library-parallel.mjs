/**
 * JAVA-LIBRARY-PARALLEL（C 批）· 无头浏览器实测（一次性探针，用后即删）
 *
 * 用法：node scripts/shell-fusion/probe-java-library-parallel.mjs http://127.0.0.1:4192/
 *
 * 断言面（每条 = 一个可观察验收点）：
 *   ① 渲染 id 集合 === tree-data.json id 集合（3205 项零增零减）——最强断言
 *   ② 旧 5 个 treeId 不在 DOM
 *   ③ 容器树名 = 类库；全树再无「常用类库」行
 *   ④ java.util.Base64 在 DOM，且祖先链 = … > java > 类库 > java.util.Base64
 *   ⑤ 点开 Base64 → 右栏卡片显示 rootContent + tag 条（读态契约）
 *   ⑤′ 索引图成员 = tabs 去掉 def；点成员 → 右栏出现该 tab 正文
 *   ⑥ 点开容器「类库」→ rootContent 含总述首段 + 25 条索引条目
 *   ⑦ /api/data 三计数 = 3205 / 3852 / 4157
 *   ⑧ 刷新后复测 ①②③④
 *
 * ⚠️ 点行必须点 [data-tree-node-id] 元素本身（内层 role=button 是折叠图标且 stopPropagation）
 * ⚠️ CDP 必须连 page target（连 /json/version 时 Runtime.evaluate 无 result）
 *
 * 【UI 契约（实测得出，勿再凭想象断言）】
 *  1. 右栏「读态」只渲染 rootContent + tag 条，**没有 tab 条**；tab 正文只有两种可达路径：
 *     ① 点索引图 class node 里的成员（.explanation-index-class-member）
 *     ② 进编辑态（.explanation-edit-toggle）。
 *     故不能断言「右栏出现 N 个 tab」——那不是本应用的 UI 形态。
 *  2. 索引图 class node 的成员**按设计排除 id==='def'（或 label==='定义'）的 tab**
 *     （indexGraphLayout.ts:511 collectIndexMembers）——def 是「类自身定义」，不是成员。
 *     故 Base64 的 3 个 tab 只渲染 2 个成员：内嵌类 / 常用方法。这是约定，不是缺内容。
 *  3. ✳️ 既有交互坑：**重复点已选中的树行 = 取消选中 → 卡片显示「无内容」**。
 *     已在未受本批影响的既有实体（JIT 编译器 tree_jvm_jit）上对照复现，非本批回归。
 *     故本探针凡「点选目标行」前，先点一个中性节点，保证是「新选中」。
 *  4. 断言读右栏文本必须读 .right-panel/.explanation-card，**不可用
 *     document.body.innerText.slice(0,N)**——3205 节点的展开树本身就有 3.7 万字，
 *     右栏起始偏移约 37647，切片永远读不到右栏。
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4192/'
const CDP_PORT = Number(process.env.CDP_PORT ?? 9336)
const CHROME = (process.env.LOCALAPPDATA ?? 'C:/Users/Administrator/AppData/Local') +
  '/ms-playwright/chromium-1187/chrome-win/chrome.exe'

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ko-lib-prof-'))
  chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`, '--window-size=1600,1000', 'about:blank',
  ], { stdio: 'ignore' })

  // 等 CDP，取 page target
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

  // 展开全部折叠节点
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

  console.log('════ C 批 · 无头浏览器实测 ════')
  console.log('目标：' + BASE + '   期望树节点：' + expectIds.length)

  // 等待树渲染
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

  // ② 旧 5 treeId 不在 DOM
  {
    const old = ['tree_1784343188605_zvliz7', 'tree_1787744961246_qrx71j', 'tree_1787852489274_38y4mx', 'tree_1787852534087_ihkz40', 'tree_1787852619447_kifsd4']
    const hit = old.filter((id) => st.ids.includes(id))
    a(hit.length === 0, '② 旧 5 个 treeId 均不在 DOM', hit.join(','))
  }

  // ③ 容器改名；全树再无「常用类库」行
  {
    const hasLib = st.labels.includes('类库')
    const oldName = st.labels.filter((l) => l === '常用类库')
    a(hasLib, '③a 树中存在「类库」行', '')
    a(oldName.length === 0, '③b 全树再无名为「常用类库」的行', oldName.length + ' 处')
  }

  // ④ Base64 节点 + 祖先链
  {
    const r = await evaluate(`(()=>{
      const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')==='tree_java_util_base64');
      if(!row) return {found:false};
      const chain=[];
      let cur=row;
      while(cur){
        if(cur.classList&&cur.classList.contains('tree-node')){
          const rr=cur.querySelector(':scope > .tree-node-row');
          if(rr) chain.unshift((rr.querySelector('.tree-node-label')||{}).textContent?.trim()||'');
        }
        cur=cur.parentElement;
      }
      return {found:true, chain};
    })()`)
    const expectChain = ['知识宇宙', '计算机科学', '软件符号与工具', '编程语言', 'java', '类库', 'java.util.Base64']
    a(r.found, '④a java.util.Base64 在 DOM', '')
    a(r.found && JSON.stringify(r.chain) === JSON.stringify(expectChain), '④b 祖先链 = ' + expectChain.join(' > '), r.found ? r.chain.join(' > ') : 'n/a')
  }

  // ⑤ 点开 Base64 → 右栏卡片（读态：rootContent + tag 条）
  //    先点中性节点，规避「重复点已选中行 = 取消选中 → 无内容」的既有交互（见头注 3）
  {
    await evaluate(`(()=>{
      const n=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')==='tree_java_common_libraries');
      if(n) n.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    })()`)
    await sleep(900)
    const sel = await evaluate(`(()=>{
      const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')==='tree_java_util_base64');
      if(!row) return {ok:false};
      row.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      return {ok:true};
    })()`)
    await sleep(1800)
    const p = await evaluate(`(()=>{
      const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')==='tree_java_util_base64');
      const card=document.querySelector('.explanation-card');
      const cardText=card?card.innerText:'';
      const tags=[...document.querySelectorAll('.explanation-card .concept-supertag')].map(e=>e.textContent.trim());
      return {active:!!(row&&row.classList.contains('active')), cardText, tags};
    })()`)
    a(sel.ok && p.active, '⑤a 点选后 Base64 树行为选中态（.tree-node-row.active）', JSON.stringify({ clicked: sel.ok, active: p.active }))
    a(p.cardText.includes('在Java 8中，Base64编码已经成为Java类库的标准。'),
      '⑤b 右栏卡片显示 Base64 的 rootContent（读态）',
      JSON.stringify(p.cardText.replace(/\s+/g, ' ').slice(0, 120)))
    const wantTags = ['java.util.Base64', 'java', 'jdk', '常用类库']
    a(wantTags.every((t) => p.tags.includes(t)), '⑤c 右栏 tag 条 = ' + wantTags.join(' / '), JSON.stringify(p.tags))
  }

  // ⑤′ 索引图 class node：成员 = tabs 去掉 def（设计规则），点成员 → 该 tab 正文可达
  {
    const m = await evaluate(`(()=>{
      const node=document.querySelector('.explanation-index-class-node');
      if(!node) return {found:false};
      return {found:true,
        members:[...node.querySelectorAll('.explanation-index-class-member-copy')].map(e=>e.textContent.trim())};
    })()`)
    a(m.found && JSON.stringify(m.members) === JSON.stringify(['内嵌类', '常用方法']),
      '⑤′a 索引图成员 = [内嵌类, 常用方法]（id=def 按设计排除，不渲染为成员）',
      JSON.stringify(m))

    const clickMember = async (label) => {
      const r = await evaluate(`(()=>{
        const el=[...document.querySelectorAll('.explanation-index-class-member')].find(x=>{
          const c=x.querySelector('.explanation-index-class-member-copy');
          return c && c.textContent.trim()===${JSON.stringify(label)};
        });
        if(!el) return 'MEMBER_NOT_FOUND';
        el.dispatchEvent(new MouseEvent('click',{bubbles:true}));
        return 'ok';
      })()`)
      await sleep(1600)
      const t = await evaluate(`(()=>{const c=document.querySelector('.explanation-card');return c?c.innerText:''})()`)
      return { r, t }
    }

    const nest = await clickMember('内嵌类')
    a(nest.r === 'ok' && nest.t.includes('Base64.Decoder') && nest.t.includes('Base64.Encoder'),
      '⑤′b 点成员「内嵌类」→ 右栏出现内嵌类表（Base64.Decoder / Base64.Encoder）',
      JSON.stringify({ r: nest.r, len: nest.t.length }))

    const meth = await clickMember('常用方法')
    a(meth.r === 'ok' && meth.t.includes('getUrlEncoder') && meth.t.includes('getDecoder'),
      '⑤′c 点成员「常用方法」→ 右栏出现方法表（getUrlEncoder / getDecoder）',
      JSON.stringify({ r: meth.r, len: meth.t.length }))
  }

  // ⑥ 点开容器「类库」→ rootContent 含总述 + 25 条索引
  {
    await evaluate(`(()=>{
      const row=[...document.querySelectorAll('[data-tree-node-id]')].find(r=>r.getAttribute('data-tree-node-id')==='tree_java_common_libraries');
      row.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    })()`)
    await sleep(1500)
    const p = await evaluate(`(()=>{
      const t=document.body.innerText;
      return {hasOverview:t.includes('Java类库是支持Java应用开发的标准库'),
        hasIdxHeader:t.includes('以下类目在库中尚无独立条目'),
        jdkCount:(t.match(/java\\.time\\./g)||[]).length,
        hasJUnit:t.includes('JUnit 5'),hasGradle:t.includes('Gradle'),
        hasRuntime:t.includes('java.lang.Runtime')};
    })()`)
    a(p.hasOverview, '⑥a 容器 rootContent 显示总述首段', '')
    a(p.hasIdxHeader, '⑥b 容器 rootContent 显示索引段表头', '')
    a(p.hasRuntime && p.hasJUnit && p.hasGradle, '⑥c 索引段内容可见（Runtime / JUnit 5 / Gradle）', JSON.stringify(p))
  }

  // ⑦ /api/data 三计数
  {
    const c = await evaluate(`(async()=>{
      const t=await (await fetch('/api/data?file=tree-data.json')).json();
      const p=await (await fetch('/api/data?file=node-pool.json')).json();
      const e=await (await fetch('/api/data?file=knowledge-edges.json')).json();
      let n=0; const w=x=>{n++;(x.children||[]).forEach(w)}; w(t);
      const ea=Array.isArray(e)?e:e.edges;
      return {tree:n,pool:Object.keys(p).length,edges:ea.length,b64:!!p['k_java_util_base64'],old:!!p['k_1787852488347_zqzfjo']};
    })()`)
    a(c.tree === 3205 && c.pool === 3852 && c.edges === 4157, `⑦ /api/data 计数 = 3205 / 3852 / 4157`, JSON.stringify(c))
    a(c.b64 && !c.old, '⑦b 新实体在池、旧 Base64 实体已删', JSON.stringify(c))
  }

  // ⑧ 刷新后复测关键项
  {
    await send('Page.navigate', { url: BASE })
    await sleep(4000)
    await expandAll()
    const s2 = await rowState()
    const domSet = new Set(s2.ids), expSet = new Set(expectIds)
    const ok1 = s2.n === expectIds.length && [...expSet].every((x) => domSet.has(x)) && [...domSet].every((x) => expSet.has(x))
    a(ok1, `⑧a 刷新后：渲染 id 集合仍 === ${expectIds.length} 项`, `dom=${s2.n}`)
    a(s2.labels.includes('类库') && !s2.labels.includes('常用类库'), '⑧b 刷新后：容器名仍为「类库」且无「常用类库」')
    a(s2.ids.includes('tree_java_util_base64'), '⑧c 刷新后：java.util.Base64 仍在 DOM')
    const old = ['tree_1784343188605_zvliz7', 'tree_1787744961246_qrx71j', 'tree_1787852489274_38y4mx', 'tree_1787852534087_ihkz40', 'tree_1787852619447_kifsd4']
    a(old.every((id) => !s2.ids.includes(id)), '⑧d 刷新后：旧 5 个 treeId 仍不在 DOM')
  }

  // console 错误
  console.log('\n' + '─'.repeat(50))
  const pass = R.filter((x) => x.ok).length
  console.log(`${pass}/${R.length} ${pass === R.length ? '— ✅ ALL PASS' : '— ⛔ 有失败项'}`)

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
