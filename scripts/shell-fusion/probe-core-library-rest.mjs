/**
 * UI 实测探针：批次 core-library-rest（Scanner / Files / enum）
 *
 * 断言分两支（依据：indexGraphLayout.ts:342 layoutMosaicTree /
 * UnifiedIndexGraph.tsx:1627 `!graphNode.containerHost && members.length>0`）：
 *   - 叶子实体（无物理包含子节点）⇒ containerHost=false ⇒ 渲染成员区（= 自己的 tabs）
 *   - 容器宿主（树上有子条目）    ⇒ containerHost=true  ⇒ 方框退化为容器框，不渲染成员区
 *
 * 因此对 Scanner 断言「成员区列出方法」，对 Files/enum 断言「容器宿主 ⇒ 成员区按设计不渲染」
 * + 负断言「右栏确实没有 tab 入口」。两轮（首访 / 刷新后）都跑。用完即删。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://127.0.0.1:4193/'
const CDP = Number(process.argv[3] ?? 9347)
const CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1187/chrome-win/chrome.exe'

const TARGETS = [
  {
    tag: 'Scanner',
    treeId: 'tree_java_util_scanner',
    ref: 'k_java_util_scanner',
    name: 'java.util.Scanner',
    expectTabs: 26,
    expectContainerHost: false,
    expectMembers: 25,      // 26 tabs − 被跳过的 def
    expectVisible: 12,      // MAX_VISIBLE_MEMBERS
    expectMore: 13,
    probeMethod: 'nextInt()',
    probeSig: /int nextInt\(\)/,
  },
  {
    tag: 'Files',
    treeId: 'tree_java_nio_file_files',
    ref: 'k_java_nio_file_files',
    name: 'java.nio.file.Files',
    expectTabs: 31,
    expectContainerHost: true,   // 树子：最佳实践 / 常见用法
    expectChildren: ['最佳实践', '常见用法'],
    probeMethod: 'readAllBytes()',
  },
  {
    tag: 'enum',
    treeId: 'tree_java_lang_enum',
    ref: 'k_java_lang_enum',
    name: 'java.lang.Enum',
    expectTabs: 9,
    expectContainerHost: true,   // 树子：用法
    expectChildren: ['用法'],
    probeMethod: 'getDeclaringClass()',
  },
]

const profile = path.join(os.tmpdir(), `ko-probe-rest-${Date.now()}`)
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
const log = (s) => console.log('   ' + s)

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

  async function runTarget(t, round) {
    const R = round === 1 ? '' : '[R2] '
    log(`\n----- ${R}${t.tag} · ${t.treeId} -----`)

    const rowInfo = await evaluate(`(() => {
      const rows = [...document.querySelectorAll('[data-tree-node-id]')];
      const hit = rows.find(r => r.getAttribute('data-tree-node-id') === ${JSON.stringify(t.treeId)});
      return { exists: !!hit, text: hit ? hit.textContent.trim().slice(0,40) : null };
    })()`)
    check(`${R}${t.tag}: 找到树行`, rowInfo.exists, rowInfo.text)
    if (!rowInfo.exists) return

    const clicked = await evaluate(`(() => {
      const rows = [...document.querySelectorAll('[data-tree-node-id]')];
      const hit = rows.find(r => r.getAttribute('data-tree-node-id') === ${JSON.stringify(t.treeId)});
      if (!hit) return 'NOT_FOUND';
      hit.scrollIntoView({ block: 'center' });
      hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return 'OK';
    })()`)
    check(`${R}${t.tag}: 点击选中`, clicked === 'OK', clicked)

    const activeOk = await waitFor(
      `(document.querySelector('.right-section.explanation-panel')?.textContent ?? '').includes(${JSON.stringify(t.name)})`,
      20000, `${t.tag} 右栏切到该实体`,
    )
    check(`${R}${t.tag}: 选中生效（右栏含 ${t.name}）`, activeOk)

    const shown = await waitFor(`document.querySelectorAll('.explanation-index-class-node').length > 0`, 60000, `${t.tag} 索引图 class-node`)
    check(`${R}${t.tag}: 索引图出现 class-node`, shown)
    await sleep(2500)

    const info = await evaluate(`(() => {
      const all = [...document.querySelectorAll('.explanation-index-class-node')];
      const hit = all.find(n => n.textContent.includes(${JSON.stringify(t.name)})) ?? all[0];
      if (!hit) return { error: 'no class-node' };
      const members = hit.querySelector('.explanation-index-class-members');
      const rows = members ? [...members.querySelectorAll('.explanation-index-class-member')] : [];
      const more = members ? members.querySelector('.explanation-index-class-member-more') : null;
      return {
        title: (hit.querySelector('strong')?.textContent ?? '').trim(),
        isContainerHost: hit.classList.contains('is-matrix-host'),
        isOwner: hit.classList.contains('is-owner'),
        classNameCount: all.length,
        childTitles: all.filter(n => n.classList.contains('is-contained-child'))
                        .map(n => (n.querySelector('strong')?.textContent ?? '').trim()),
        hasMembers: !!members,
        visibleMembers: rows.length,
        labels: rows.map(r => (r.textContent ?? '').replace(/\\s+/g, ' ').trim()),
        moreText: more ? more.textContent.replace(/\\s+/g,' ').trim() : null,
      };
    })()`)
    log(`${t.tag} 方框: title=${JSON.stringify(info.title)} containerHost=${info.isContainerHost} class-node数=${info.classNameCount} 可见成员=${info.visibleMembers} more=${JSON.stringify(info.moreText)}`)
    log(`${t.tag} 子方框: ${JSON.stringify(info.childTitles)}`)
    if ((info.labels ?? []).length) log(`${t.tag} 成员首 4 行: ${JSON.stringify(info.labels.slice(0, 4))}`)

    check(`${R}${t.tag}: class-node 存在`, info.title === t.name, info.title)

    if (!t.expectContainerHost) {
      // ── 叶子实体：应列出成员 ──
      check(`${R}${t.tag}: containerHost=false`, info.isContainerHost === false)
      check(`${R}${t.tag}: 方框有成员区`, !!info.hasMembers)
      check(`${R}${t.tag}: 可见成员行 = ${t.expectVisible}`, info.visibleMembers === t.expectVisible, info.visibleMembers)
      check(`${R}${t.tag}: 成员含新增方法 ${t.probeMethod}`, (info.labels ?? []).some((l) => l.includes(t.probeMethod)), info.labels?.slice(0, 3))
      check(`${R}${t.tag}: 出现「还有 ${t.expectMore} 项」`, new RegExp(`还有\\s*${t.expectMore}\\s*项`).test(info.moreText ?? ''), info.moreText)

      const clickMember = await evaluate(`(() => {
        const all = [...document.querySelectorAll('.explanation-index-class-node')];
        const hit = all.find(n => n.textContent.includes(${JSON.stringify(t.name)})) ?? all[0];
        const rows = [...hit.querySelectorAll('.explanation-index-class-member')];
        const row = rows.find(r => r.textContent.includes(${JSON.stringify(t.probeMethod)}));
        if (!row) return 'NO_ROW';
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return 'OK';
      })()`)
      check(`${R}${t.tag}: 可点击成员行 ${t.probeMethod}`, clickMember === 'OK', clickMember)
      await sleep(1600)
      const afterCard = await evaluate(`(() => { const el = document.querySelector('.right-section.explanation-panel'); return el ? el.textContent.replace(/\\s+/g,' ').slice(0, 200) : null; })()`)
      check(`${R}${t.tag}: 右栏切到该 tab（含签名）`, t.probeSig.test(afterCard ?? ''), (afterCard ?? '').slice(0, 130))
    } else {
      // ── 容器宿主：成员区按设计不渲染；子方框取而代之 ──
      check(`${R}${t.tag}: containerHost=true（方框是容器框）`, info.isContainerHost === true)
      check(`${R}${t.tag}: 成员区按设计不渲染`, info.hasMembers === false)
      const expect = t.expectChildren ?? []
      check(`${R}${t.tag}: 子方框 = ${JSON.stringify(expect)}`,
        expect.every((c) => (info.childTitles ?? []).includes(c)), info.childTitles)

      // 负断言：没有 tab 导航入口（无成员行 / 无同名按钮）。
      // 注意：面板「正文文字」可能仍含方法名（enum 的 rootContent 是 OCR 方法表，本身就写着
      // `Class<E> getDeclaringClass()`）——那是文本不是入口，故以「成员行 + 精确同名按钮」为判据。
      const tabEntry = await evaluate(`(() => {
        const panel = document.querySelector('.right-section.explanation-panel');
        const memberRows = document.querySelectorAll('.explanation-index-class-member').length;
        const btnExact = panel
          ? [...panel.querySelectorAll('button')]
              .map(b => (b.textContent||'').replace(/\\s+/g,' ').trim())
              .filter(t => t === ${JSON.stringify(t.probeMethod)})
          : [];
        const textMentions = panel ? panel.textContent.includes(${JSON.stringify(t.probeMethod.replace('()', ''))}) : null;
        return { memberRows, btnExact, textMentions };
      })()`)
      check(`${R}${t.tag}: 负断言 · 无 ${t.probeMethod} 导航入口（0 成员行 / 0 同名按钮）`,
        tabEntry.memberRows === 0 && (tabEntry.btnExact ?? []).length === 0, tabEntry)
      log(`${t.tag} 正文是否提及 ${t.probeMethod.replace('()', '')}: ${tabEntry.textMentions}（仅文本，不构成入口）`)
    }
  }

  await send('Page.navigate', { url: BASE })
  const treeOk = await waitFor(`document.querySelectorAll('[data-tree-node-id]').length > 3000`, 90000, '树全量渲染')
  check('树已渲染（>3000 行）', treeOk, await evaluate(`document.querySelectorAll('[data-tree-node-id]').length`))

  for (const t of TARGETS) await runTarget(t, 1)

  console.log('\n----- 数据层复核 /api/data -----')
  const api = await evaluate(`fetch('/api/data?file=node-pool.json').then(r=>r.json()).then(j=>{
    const out = {};
    for (const id of ${JSON.stringify(TARGETS.map((t) => t.ref))}) {
      const n = j[id];
      out[id] = n ? { tabs: n.card.tabs.length, rootLen: (n.card.rootContent||'').length,
                      lastIds: n.card.tabs.map(t=>t.id).slice(-4) } : null;
    }
    return out;
  })`)
  for (const t of TARGETS) {
    const a = api?.[t.ref]
    check(`API: ${t.tag} tabs = ${t.expectTabs}`, a?.tabs === t.expectTabs, a)
  }
  check('API: Scanner rootContent = 63 字（本批新增）', api?.['k_java_util_scanner']?.rootLen === 63)
  check('API: Files rootContent = 63 字（本批新增）', api?.['k_java_nio_file_files']?.rootLen === 63)
  check('API: enum rootContent 仍为 871 字（未被覆盖）', api?.['k_java_lang_enum']?.rootLen === 871, api?.['k_java_lang_enum']?.rootLen)

  console.log('\n===== 刷新页面复测 =====')
  await send('Page.navigate', { url: BASE })
  const treeOk2 = await waitFor(`document.querySelectorAll('[data-tree-node-id]').length > 3000`, 90000, 'R2 树全量渲染')
  check('[R2] 树重新渲染（>3000 行）', treeOk2, await evaluate(`document.querySelectorAll('[data-tree-node-id]').length`))
  for (const t of TARGETS) await runTarget(t, 2)

  console.log(`\n结果：通过 ${pass.length} / 失败 ${fail.length}`)
  if (fail.length) console.log('失败项:', JSON.stringify(fail, null, 1))

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
