/**
 * UI 实测探针：批次 core-library-string
 * 断言 index 视图「java.lang.String」方框的成员区是否列出了新增的方法 tab。
 * 用完即删。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://127.0.0.1:4193/'
const CDP = Number(process.argv[3] ?? 9333)
const CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1187/chrome-win/chrome.exe'
const TREE_ID = 'tree_java_lang_string'

const profile = path.join(os.tmpdir(), `ko-probe-${Date.now()}`)
const chrome = spawn(
  CHROME,
  [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion',
    `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
    '--window-size=1680,1050',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pass = []
const fail = []
const check = (name, ok, detail) => {
  ;(ok ? pass : fail).push(name)
  console.log(`${ok ? '✅' : '❌'} ${name}${detail !== undefined ? '  → ' + JSON.stringify(detail) : ''}`)
}

async function main() {
  let page = null
  for (let i = 0; i < 80; i++) {
    try {
      const list = await fetch(`http://127.0.0.1:${CDP}/json/list`).then((r) => r.json())
      page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
      if (page) break
    } catch {}
    await sleep(300)
  }
  if (!page) throw new Error('未找到 CDP page target')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true })
    ws.addEventListener('error', rej, { once: true })
  })

  let seq = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  })
  const send = (method, params = {}) =>
    new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })) })

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error('page error: ' + JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails))
    return r.result?.result?.value
  }
  const waitFor = async (expr, ms = 60000, label = expr) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) {
      try { if (await evaluate(expr)) return true } catch {}
      await sleep(400)
    }
    console.log(`   ⏱ 等待超时: ${label}`)
    return false
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: BASE })

  const treeOk = await waitFor(`document.querySelectorAll('[data-tree-node-id]').length > 3000`, 90000, '树全量渲染（3215 行）')
  check('树已渲染（>3000 行）', treeOk, await evaluate(`document.querySelectorAll('[data-tree-node-id]').length`))

  // 目标行
  const rowInfo = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('[data-tree-node-id]')];
    const hit = rows.find(r => r.getAttribute('data-tree-node-id') === ${JSON.stringify(TREE_ID)});
    return { exists: !!hit, text: hit ? hit.textContent.trim().slice(0,40) : null };
  })()`)
  check('找到 String 树行', rowInfo.exists, rowInfo.text)

  // 点击选中
  const clicked = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('[data-tree-node-id]')];
    const hit = rows.find(r => r.getAttribute('data-tree-node-id') === ${JSON.stringify(TREE_ID)});
    if (!hit) return 'NOT_FOUND';
    hit.scrollIntoView({ block: 'center' });
    hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return 'OK';
  })()`)
  check('点击选中 String 行', clicked === 'OK', clicked)

  // 选中确认：右栏解释卡应切到 java.lang.String
  const activeOk = await waitFor(
    `(document.querySelector('.explanation-card')?.textContent ?? '').includes('java.lang.String')`,
    20000, '右栏解释卡切到 String',
  )
  check('选中生效（右栏切到 String 解释卡）', activeOk)

  // 等索引图渲染（selectTreeEntry 会把 activeView 切成 index）
  const shown = await waitFor(`document.querySelectorAll('.explanation-index-class-node').length > 0`, 60000, '索引图 class-node')
  check('索引图出现 class-node', shown, await evaluate(`document.querySelectorAll('.explanation-index-class-node').length`))
  await sleep(3000)

  const dump = await evaluate(`(() => {
    const nodes = [...document.querySelectorAll('.explanation-index-class-node')];
    const titles = nodes.map(n => (n.querySelector('strong')?.textContent ?? '').trim());
    return { count: nodes.length, titles: titles.slice(0, 12) };
  })()`)
  console.log('   class-node 数:', dump.count, '标题:', JSON.stringify(dump.titles))

  const target = await evaluate(`(() => {
    const nodes = [...document.querySelectorAll('.explanation-index-class-node')];
    const hit = nodes.find(n => n.textContent.includes('java.lang.String')) ?? nodes[0];
    if (!hit) return { error: 'no node' };
    const members = hit.querySelector('.explanation-index-class-members');
    const rows = members ? [...members.querySelectorAll('.explanation-index-class-member')] : [];
    const more = members ? members.querySelector('.explanation-index-class-member-more') : null;
    const head = members ? members.querySelector('header') : null;
    return {
      title: (hit.querySelector('strong')?.textContent ?? '').trim(),
      hasMembers: !!members,
      memberHeader: head ? head.textContent.replace(/\\s+/g,' ').trim() : null,
      visibleMembers: rows.length,
      labels: rows.map(r => (r.textContent ?? '').replace(/\\s+/g, ' ').trim()),
      moreText: more ? more.textContent.replace(/\\s+/g,' ').trim() : null,
    };
  })()`)
  console.log('   目标方框:', JSON.stringify(target, null, 1))

  check('String 方框有成员区', !!target.hasMembers)
  check('可见成员行 = 12（MAX_VISIBLE_MEMBERS）', target.visibleMembers === 12, target.visibleMembers)
  check('成员首行含 length()', (target.labels ?? []).some((l) => l.includes('length()')), target.labels?.slice(0, 4))
  check('成员含 charAt()', (target.labels ?? []).some((l) => l.includes('charAt()')))
  check('出现「还有 N 项」', /还有\s*\d+\s*项/.test(target.moreText ?? ''), target.moreText)

  // 点一个成员行 → 右栏解释卡应切到该 tab
  const beforeCard = await evaluate(`(() => { const el = document.querySelector('.right-section.explanation-panel'); return el ? el.textContent.slice(0,80) : null; })()`)
  const clickMember = await evaluate(`(() => {
    const nodes = [...document.querySelectorAll('.explanation-index-class-node')];
    const hit = nodes.find(n => n.textContent.includes('java.lang.String')) ?? nodes[0];
    if (!hit) return 'NO_NODE';
    const rows = [...hit.querySelectorAll('.explanation-index-class-member')];
    const row = rows.find(r => r.textContent.includes('length()'));
    if (!row) return 'NO_ROW';
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return 'OK';
  })()`)
  check('可点击 length() 成员行', clickMember === 'OK', clickMember)
  await sleep(1600)
  const afterCard = await evaluate(`(() => { const el = document.querySelector('.right-section.explanation-panel'); return el ? el.textContent.replace(/\\s+/g,' ').slice(0, 160) : null; })()`)
  console.log('   右栏(点击前):', JSON.stringify(beforeCard))
  console.log('   右栏(点击后):', JSON.stringify(afterCard))
  check('右栏切到该 tab（含 length 签名）', /int length\(\)/.test(afterCard ?? ''), afterCard?.slice(0, 120))

  // 数据层复核：/api/data
  const api = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json()).then(j=>{
    const n = j['k_java_lang_string'];
    return { root: (n.card.rootContent||'').slice(0,40), tabs: n.card.tabs.length,
             ids: n.card.tabs.map(t=>t.id).slice(0,6) };
  })`)
  check('服务端读到的 tabs = 36', api?.tabs === 36, api)

  console.log(`\n结果：通过 ${pass.length} / 失败 ${fail.length}`)
  if (fail.length) console.log('失败项:', JSON.stringify(fail))

  ws.close()
}

try {
  await main()
} catch (e) {
  console.error('探针异常:', e.message)
} finally {
  try { chrome.kill() } catch {}
  await sleep(400)
  try { fs.rmSync(profile, { recursive: true, force: true }) } catch {}
}
