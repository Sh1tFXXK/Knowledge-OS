/**
 * UI 实测：core-library-methods 第 4 步（删除「常用类库整理」）。
 * 断言：目标行消失（负）· 树 3214 行 · 4 个类行仍在 · 全局再无「常用类库整理」· 刷新后复测。
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://127.0.0.1:4193/'
const CDP = Number(process.argv[3] ?? 9361)
const CHROME = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1187/chrome-win/chrome.exe'

const GONE = 'tree_vault_javajava_1b1w4s'
const KEEP = [
  'tree_java_common_libraries',
  'tree_java_lang_string',
  'tree_java_util_scanner',
  'tree_java_nio_file_files',
  'tree_java_lang_enum',
]

const profile = path.join(os.tmpdir(), `ko-probe-del-${Date.now()}`)
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
  `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--window-size=1680,1050', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pass = []
const fail = []
const check = (n, ok, d) => { (ok ? pass : fail).push(n); console.log(`${ok ? '✅' : '❌'} ${n}${d !== undefined ? '  → ' + JSON.stringify(d) : ''}`) }

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
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }) })
  let seq = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })) })
  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails))
    return r.result?.result?.value
  }
  const waitFor = async (expr, ms, label = expr) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { try { if (await evaluate(expr)) return true } catch {} ; await sleep(400) }
    console.log(`   ⏱ 超时: ${label}`)
    return false
  }

  await send('Page.enable'); await send('Runtime.enable')

  async function round(R) {
    const ok = await waitFor(`document.querySelectorAll('[data-tree-node-id]').length > 3000`, 90000, `${R}树渲染`)
    check(`${R}树已渲染（>3000 行）`, ok)
    const rows = await evaluate(`document.querySelectorAll('[data-tree-node-id]').length`)
    console.log(`   ${R}树行数 = ${rows}`)

    const gone = await evaluate(`!!document.querySelector('[data-tree-node-id=${JSON.stringify(GONE)}]')`)
    check(`${R}负断言：目标行「常用类库整理」已消失`, gone === false)
    check(`${R}树行数 = 3214（原 3215 −1）`, rows === 3214, rows)

    for (const id of KEEP) {
      const exists = await evaluate(`!!document.querySelector('[data-tree-node-id=${JSON.stringify(id)}]')`)
      check(`${R}保留：${id} 仍在`, exists)
    }

    const text = await evaluate(`document.body.textContent.includes('常用类库整理')`)
    check(`${R}负断言：全页文本再无「常用类库整理」`, text === false)

    const cnt = await evaluate(`(() => {
      const el = document.querySelector('[data-tree-node-id="tree_java_common_libraries"]');
      if (!el) return null;
      const host = el.closest('li') ?? el.parentElement;
      return host ? host.querySelectorAll('[data-tree-node-id]').length : -1;
    })()`)
    console.log(`   ${R}「常用类库」宿主内渲染行数 = ${cnt}（22 为预期：自身 + 21? 仅记录，不作判据）`)
  }

  await send('Page.navigate', { url: BASE })
  await round('')
  console.log('\n===== 刷新复测 =====')
  await send('Page.navigate', { url: BASE })
  await round('[R2] ')

  console.log(`\n结果：通过 ${pass.length} / 失败 ${fail.length}`)
  if (fail.length) console.log('失败项:', JSON.stringify(fail, null, 1))
  ws.close()
}

try { await main() } catch (e) { console.error('探针异常:', e.message) }
finally { try { chrome.kill() } catch {}; await sleep(400); try { fs.rmSync(profile, { recursive: true, force: true }) } catch {} }
