/**
 * E + D1 批次（final-87-batch1）浏览器只读实测。
 * 用 Node 内置 WebSocket 直连 Chromium CDP，不依赖 playwright。
 *
 * 用法：node scripts/shell-fusion/spot-check-batch1.mjs [previewUrl]
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4193/'
const CDP_PORT = 9334
const CHROME = `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe`

const { spawn } = await import('node:child_process')
const { mkdtempSync, rmSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')

const profile = mkdtempSync(join(tmpdir(), 'ko-spot1-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function targetWs() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      const page = list.find((t) => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch { /* 还没起来 */ }
    await sleep(500)
  }
  throw new Error('Chromium CDP 未就绪')
}

const ws = new WebSocket(await targetWs())
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let nextId = 1
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
  }
}
function send(method, params = {}) {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description ?? ''))
  return r.result.value
}

const failures = []
const check = (ok, label, extra = '') => {
  console.log(`  ${ok ? '✔' : '✗'} ${label}${extra ? ' — ' + extra : ''}`)
  if (!ok) failures.push(label)
}

// 用搜索框过滤树，返回当前可见的树节点名列表
async function searchTree(kw) {
  await evaluate(`
    (() => {
      const input = document.querySelector('#tree-search-input');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(kw)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `)
  await sleep(1100)
  return evaluate(`[...document.querySelectorAll('.tree-node-row')].map(r => (r.querySelector('.tree-node-label')?.textContent||'').trim())`)
}

/**
 * 搜索 + 展开全部折叠分支后再取行名。
 * 必要性：UniverseTree.tsx:537 `filterNode(treeData) || treeData` —— 搜索**无命中时回落到整棵树**，
 * 且树是虚拟化的。不展开就无法区分「节点不存在」与「节点存在但没进 DOM」。
 */
async function searchExpand(kw) {
  await searchTree(kw)
  for (let round = 0; round < 8; round += 1) {
    const clicked = await evaluate(`
      (() => {
        const icons = [...document.querySelectorAll('.tree-node-icon[aria-expanded="false"]')];
        for (const el of icons) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return icons.length;
      })()
    `)
    await sleep(350)
    if (clicked === 0) break
  }
  return evaluate(`[...document.querySelectorAll('.tree-node-row')].map(r => (r.querySelector('.tree-node-label')?.textContent||'').trim())`)
}

// 搜索 → 找到精确名 → 点击 → 返回右栏文本
async function openNode(kw, exact) {
  const names = await searchTree(kw)
  if (!names.includes(exact)) return { found: false, names, text: '' }
  await evaluate(`
    (() => {
      const row = [...document.querySelectorAll('.tree-node-row')].find(r => (r.querySelector('.tree-node-label')?.textContent||'').trim() === ${JSON.stringify(exact)});
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    })()
  `)
  await sleep(1600)
  const text = await evaluate(`document.body.innerText || ''`)
  return { found: true, names, text }
}

const absent = (names, kw) => !names.some((n) => n.includes(kw))

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*fonts.googleapis.com*', '*fonts.gstatic.com*'] })

  console.log(`导航 → ${BASE}`)
  await send('Page.navigate', { url: BASE })

  let ready = false
  for (let i = 0; i < 90; i += 1) {
    await sleep(1000)
    try {
      const n = await evaluate(`document.querySelectorAll('.tree-node-row').length`)
      if (n > 0) { ready = true; console.log(`  应用就绪（${i + 1}s，树行 ${n}）`); break }
    } catch { /* 上下文还没建好 */ }
  }
  check(ready, '应用启动并渲染出节点树')
  if (!ready) throw new Error('应用未就绪')

  const banner = await evaluate(`
    (() => {
      const t = document.body.innerText || '';
      return ['数据加载失败','加载失败','数据校验失败'].filter(k => t.includes(k));
    })()
  `)
  check(banner.length === 0, '无数据加载失败横幅', banner.join(',') || 'clean')

  // ── E 组：正文并入宿主 + 壳卸树 ───────────────────────────────────────
  console.log('\n【E 组】正文并入宿主 · 壳卸树')
  const E_CASES = [
    { kw: 'final', exact: 'final', tabs: ['JSR-133 为何增强 final 语义'] },
    { kw: 'RabbitMQ', exact: 'RabbitMQ', tabs: ['MQ 为什么存在'] },
    { kw: 'MySQL 分库分表', exact: 'MySQL 分库分表', tabs: ['什么时候需要分库分表'] },
  ]
  for (const c of E_CASES) {
    const r = await openNode(c.kw, c.exact)
    check(r.found, `右栏打开「${c.exact}」`)
    if (!r.found) continue
    for (const t of c.tabs) check(r.text.includes(t), `「${c.exact}」右栏含并入页签「${t}」`)
  }

  // ── 否定断言的正向对照 ────────────────────────────────────────────────
  // 先证明「搜索 + 展开」这条管道能真的把节点找出来，否则后面的"已消失"全是空转。
  console.log('\n【对照】搜索+展开管道自证')
  const ctrl = await searchExpand('AOP 执行流程')
  check(ctrl.includes('AOP 执行流程'), '正向对照：搜索+展开能找到确定存在的节点', ctrl.slice(0, 8).join(' | ').slice(0, 140))
  const ctrl2 = await searchExpand('MySQL 分库分表')
  check(ctrl2.includes('MySQL 分库分表'), '正向对照 2：搜索+展开能找到「MySQL 分库分表」')

  // 壳名必须从树里消失
  console.log('\n【E 组】退休壳已从树中消失（搜索+展开后判定）')
  for (const [kw, shell] of [
    ['JSR-133', 'JSR-133为什么要增强final的语义'],
    ['MQ 为什么存在', 'MQ 为什么存在'],
    ['什么时候需要分库分表', '什么时候需要分库分表'],
    ['为什么命中索引比不命中快', '为什么命中索引比不命中快'],
    ['如何判断对象可以被回收', '如何判断对象可以被回收'],
    ['数据库是什么类型的东西', '数据库是什么类型的东西？'],
  ]) {
    const names = await searchExpand(kw)
    check(absent(names, shell), `树中已无「${shell}」`, names.slice(0, 6).join(' | ').slice(0, 160))
  }

  // ── E 组：提级孩子 + 改名 ────────────────────────────────────────────
  console.log('\n【E 组】孩子提级与就地改名')
  const idx = await openNode('MySQL 索引', 'MySQL 索引')
  check(idx.found, '「MySQL 索引」在树中可定位')
  const perf = await searchExpand('系统性能瓶颈定位')
  check(perf.includes('系统性能瓶颈定位'), 'E#3 改名生效：「系统性能瓶颈定位」在树中', perf.slice(0, 8).join(' | ').slice(0, 160))
  const oldPerf = await searchExpand('如何发现瓶颈')
  check(absent(oldPerf, '如何发现瓶颈'), 'E#3 旧名「如何发现瓶颈」已消失')

  // ── D1 组：机制宿主承载状态正文 + 机制视图 ────────────────────────────
  console.log('\n【D1 组】机制宿主承载状态正文 · 机制视图可见')
  const aop = await openNode('AOP 执行流程', 'AOP 执行流程')
  check(aop.found, '「AOP 执行流程」在树中可定位（原名「执行阶段」）')
  if (aop.found) {
    for (const t of ['① 代理对象已创建', '② 调用已被拦截', '③ 拦截器链执行中', '④ 织入代码已执行', '⑤ 目标方法已调用（返回）']) {
      check(aop.text.includes(t), `AOP 宿主右栏含状态页签「${t}」`)
    }
    const hasMech = await evaluate(`
      (() => {
        const t = document.body.innerText || '';
        return ['机制视图','执行流程','状态'].filter(k => t.includes(k));
      })()
    `)
    check(hasMech.length > 0, 'AOP 宿主右栏出现机制视图相关区块', hasMech.join(','))
  }
  const aopOld = await searchExpand('执行阶段')
  check(absent(aopOld, '执行阶段'), 'D1#12 旧名「执行阶段」（纯名）已从树中消失')

  const tio = await openNode('传统 IO 执行流程', '传统 IO 执行流程')
  check(tio.found, '「传统 IO 执行流程」在树中可定位')
  if (tio.found) {
    for (const t of ['① read 发起（用户态→内核态）', '② DMA：磁盘 → 内核缓冲区', '③ CPU：内核缓冲区 → 用户缓冲区（返回）', '④ write 发起（用户态→内核态）', '⑤ CPU：用户缓冲区 → socket 缓冲区', '⑥ DMA：socket 缓冲区 → 网卡（返回）']) {
      check(tio.text.includes(t), `TIO 宿主右栏含状态页签「${t}」`)
    }
  }

  // 机制状态必须已从树中卸下（节点仍在池，供 spec 渲染）
  console.log('\n【D1 组】机制状态已卸树（搜索+展开后判定）')
  for (const st of ['① 代理对象已创建', '③ 拦截器链执行中', '⑥ DMA：socket 缓冲区 → 网卡（返回）']) {
    const names = await searchExpand(st)
    check(absent(names, st), `树中已无状态节点「${st}」`, names.slice(0, 6).join(' | ').slice(0, 140))
  }

  // D1#13 改名
  const caller = await searchExpand('getBean 请求调用方')
  check(caller.includes('getBean 请求调用方'), 'D1#13 改名生效：「getBean 请求调用方」在树中', caller.slice(0, 8).join(' | ').slice(0, 160))

  // ── 改名后无同名冲突 ────────────────────────────────────────────────
  console.log('\n【整体】本批改名未产生新增同名')
  for (const kw of ['AOP 执行流程', '传统 IO 执行流程', '系统性能瓶颈定位', 'getBean 请求调用方']) {
    const names = await searchExpand(kw)
    const hits = names.filter((n) => n === kw).length
    check(hits <= 1, `「${kw}」树中同名数 ≤ 1`, `实测 ${hits}`)
  }
} finally {
  ws.close()
  chrome.kill('SIGKILL')
  await sleep(500)
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* 忽略 */ }
}

console.log(failures.length === 0 ? '\nspot check 全部通过 ✅' : `\nspot check 失败 ${failures.length} 项 ❌`)
for (const f of failures) console.log('  · ' + f)
process.exit(failures.length === 0 ? 0 : 1)
