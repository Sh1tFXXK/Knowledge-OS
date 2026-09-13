/**
 * final-87-batch2（R 3 + D2 30 + C 37）浏览器只读实测。
 * 用 Node 内置 WebSocket 直连 Chromium CDP，不依赖 playwright。
 *
 * 设计要点（沿用 batch1 的血泪教训）：
 *   1. 否定断言必须配正向对照 —— UniverseTree.tsx:537 `filterNode(treeData) || treeData`
 *      在搜索无命中时**回落到整棵树**，且树是虚拟化的，"看不到" ≠ "不存在"。
 *   2. 断言以**可见性正断言**为主（打开节点 → 右栏出现预期页签），否定断言只作补充。
 *   3. 右栏页签文本取自 supplement（树条目级），所以测的是「数据 → 渲染」这条完整链路。
 *
 * 用法：node scripts/shell-fusion/spot-check-batch2.mjs [previewUrl]
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:4193/'
const CDP_PORT = 9335
const CHROME = `${process.env.LOCALAPPDATA}\\ms-playwright\\chromium-1187\\chrome-win\\chrome.exe`

const { spawn } = await import('node:child_process')
const { mkdtempSync, rmSync } = await import('node:fs')
const { tmpdir } = await import('node:os')
const { join } = await import('node:path')

const profile = mkdtempSync(join(tmpdir(), 'ko-spot2-'))
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

async function searchTree(kw) {
  await evaluate(`
    (() => {
      const input = document.querySelector('#tree-search-input');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, ${JSON.stringify(kw)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()
  `)
  await sleep(1000)
  return evaluate(`[...document.querySelectorAll('.tree-node-row')].map(r => (r.querySelector('.tree-node-label')?.textContent||'').trim())`)
}

/** 搜索 + 展开全部折叠分支后再取行名（见文件头说明 1）。 */
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
    await sleep(300)
    if (clicked === 0) break
  }
  return evaluate(`[...document.querySelectorAll('.tree-node-row')].map(r => (r.querySelector('.tree-node-label')?.textContent||'').trim())`)
}

/** 搜索 → 找到精确名 → 点击 → 返回右栏文本。 */
async function openNode(kw, exact) {
  const names = await searchTree(kw)
  if (!names.includes(exact)) return { found: false, names, text: '' }
  await evaluate(`
    (() => {
      const row = [...document.querySelectorAll('.tree-node-row')].find(r => (r.querySelector('.tree-node-label')?.textContent||'').trim() === ${JSON.stringify(exact)});
      if (!row) return false;
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    })()
  `)
  await sleep(1500)
  return { found: true, names, text: await evaluate(`document.body.innerText || ''`) }
}

/**
 * 同名多处挂载时按标记择优打开。
 * 必要性：同一个池节点可以在树里挂多处（本批相关：`k_java_type_ff6db88dc6746818`
 * 同时挂在 java.util.concurrent 与「线程池」下，基线即如此），而 supplement 是**树条目级**的，
 * 只落在其中一处。直接取第一个同名行会开错那一处，得到「页签不存在」的假阴性。
 * 本函数逐个候选点击，返回第一个右栏文本含 marker 的结果。
 */
async function openNodeWhere(kw, exact, marker) {
  const names = await searchTree(kw)
  const hits = names.filter((n) => n === exact).length
  for (let i = 0; i < hits; i += 1) {
    await evaluate(`
      (() => {
        const rows = [...document.querySelectorAll('.tree-node-row')].filter(r => (r.querySelector('.tree-node-label')?.textContent||'').trim() === ${JSON.stringify(exact)});
        const row = rows[${i}];
        if (!row) return false;
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
      })()
    `)
    await sleep(1500)
    const text = await evaluate(`document.body.innerText || ''`)
    if (text.includes(marker)) return { found: true, tab: `第 ${i + 1}/${hits} 处挂载点`, text }
  }
  return { found: false, tab: `扫描 ${hits} 处挂载点均未命中`, text: '' }
}

/** 切到顶栏「机制」视图（MechanismLensPanel，读 focusNodeId ?? selectedNodeId 的 spec 投影）。 */
async function switchToMechanismLens() {
  const clicked = await evaluate(`
    (() => {
      const btns = [...document.querySelectorAll('.header-nav .header-nav-item')];
      const b = btns.find(x => (x.querySelector('.nav-label')?.textContent||'').trim() === '机制');
      if (!b) return false;
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    })()
  `)
  await sleep(2600)
  return { clicked, text: await evaluate(`document.body.innerText || ''`) }
}

const absent = (names, nt) => !names.some((n) => n.includes(nt))

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
    ['数据加载失败','加载失败','数据校验失败'].filter(k => (document.body.innerText || '').includes(k))
  `)
  check(banner.length === 0, '无数据加载失败横幅', banner.join(',') || 'clean')

  // ── 正向对照：先证明「搜索+展开」能真的捞出确定存在的节点 ────────────────
  console.log('\n【对照】搜索+展开管道自证（否则后面的否定断言全是空转）')
  for (const ctrl of ['Bean 生命周期', 'ThreadPoolExecutor', '流量激增应对方法']) {
    const names = await searchExpand(ctrl)
    check(names.includes(ctrl), `正向对照：搜索+展开能找到「${ctrl}」`, names.slice(0, 6).join(' | ').slice(0, 130))
  }

  // ── C 组 · 详解壳正文融合进正身 ────────────────────────────────────────
  console.log('\n【C 组】详解壳正文融合 → 正身右栏出现壳页签')
  const FUSE = [
    { kw: 'ArrayList', exact: 'ArrayList', tab: 'ArrayList 详解' },
    { kw: 'HashMap', exact: 'HashMap', tab: 'HashMap 详解' },
    { kw: 'HashSet', exact: 'HashSet', tab: 'HashSet 详解' },
    { kw: 'LinkedList', exact: 'LinkedList', tab: 'LinkedList 详解' },
    { kw: '线程池', exact: '线程池', tab: '线程池详解' },
    { kw: 'FutureTask', exact: 'FutureTask', tab: 'FutureTask详解' },
    { kw: 'ScheduledThreadPoolExecutor', exact: 'ScheduledThreadPoolExecutor', tab: 'ScheduledThreadPoolExecutor详解' },
    { kw: 'ThreadPoolExecutor', exact: 'ThreadPoolExecutor', tab: 'ThreadPoolExecutor详解', multiMount: true },
    { kw: 'Kafka', exact: 'Kafka', tab: 'Kafka 定位总览' },
    { kw: 'Spring Cloud', exact: 'Spring Cloud', tab: 'Spring Cloud 定位总览' },
  ]
  for (const f of FUSE) {
    // ThreadPoolExecutor 的池节点在树里有两处挂载（java.util.concurrent 与「线程池」），
    // 融合正文只落在「线程池」那处 → 用 openNodeWhere 择优，不用 openNode。
    const r = f.multiMount
      ? await openNodeWhere(f.kw, f.exact, f.tab)
      : await openNode(f.kw, f.exact)
    check(r.found, `右栏打开正身「${f.exact}」`, r.tab ?? '')
    if (r.found) check(r.text.includes(f.tab), `「${f.exact}」右栏含融合页签「${f.tab}」`)
  }

  // ── C 组 · 详解/总览壳已从树中消失 ─────────────────────────────────────
  console.log('\n【C 组】详解/总览壳已卸树（搜索+展开后判定）')
  for (const shell of ['ArrayList 详解', 'HashMap 详解', '线程池详解', 'ThreadPoolExecutor详解', 'Kafka 定位总览', 'Spring Cloud 定位总览', 'FutureTask详解']) {
    const names = await searchExpand(shell)
    check(absent(names, shell), `树中已无「${shell}」`, names.slice(0, 5).join(' | ').slice(0, 140))
  }

  // ── C 组 · 章节壳去序号 ────────────────────────────────────────────────
  console.log('\n【C 组】数据库章节壳去序号')
  for (const [exact, old] of [['数据库系统', '一、数据库系统'], ['存储系统', '十、存储系统'], ['数据库安全', '十六、数据库安全'], ['数据库文件与实现', '二十、数据库文件与实现']]) {
    const r = await openNode(exact, exact)
    check(r.found, `去序号后的章节壳「${exact}」可定位并打开`)
    const names = await searchExpand(old)
    check(absent(names, old), `旧序号名「${old}」已从树中消失`, names.slice(0, 5).join(' | ').slice(0, 140))
  }

  // ── C 组 · 章节壳正文并入 ──────────────────────────────────────────────
  console.log('\n【C 组】壳正文并入章节壳')
  const dbSec = await openNode('数据库安全', '数据库安全')
  if (dbSec.found) check(dbSec.text.includes('数据库安全'), '「数据库安全」章节右栏已渲染')
  const dbDesign = await openNode('数据库设计', '数据库设计')
  if (dbDesign.found) check(dbDesign.text.length > 0, '「数据库设计」章节右栏已渲染')

  // ── C 组 · 大壳 / 基础壳实名 ───────────────────────────────────────────
  console.log('\n【C 组】大壳·基础壳实名')
  const RENAMES = [
    ['Java 语法要素', '基础'],
    ['软件开发', '软件开发（实践总览）'],
    ['监控驱动动态扩容', '进阶思路：监控驱动动态扩容'],
    ['跨系统标准与约定', '跨系统标准与约定（总览）'],
    ['Java 数据结构', 'Java 数据结构基础'],
    ['JVM 核心概念', 'JVM 基础'],
    ['Java 集合框架', 'Java 集合框架总览'],
    ['Java 多线程编程', 'Java 多线程编程入门'],
    ['MyBatis', 'MyBatis 定位总览'],
    ['CachedThreadPool', 'CachedThreadPool详解'],
    ['FixedThreadPool', 'FixedThreadPool详解'],
    ['SingleThreadExecutor', 'SingleThreadExecutor详解'],
  ]
  for (const [neo, old] of RENAMES) {
    const r = await openNode(neo, neo)
    check(r.found, `新名「${neo}」可定位并打开`)
    const names = await searchExpand(old)
    // ⚠️ 旧名「基础」是**退化名**：它是「基础列 / base column」「MySQL 基础知识」等名字的子串，
    // 用 includes() 判消失必然假阳性（实测）。退化旧名只能用**精确名**判消失。
    const gone = old.length <= 2
      ? names.filter((n) => n === old).length === 0
      : !names.some((n) => n.includes(old))
    check(gone, `旧名「${old}」已从树中消失${old.length <= 2 ? '（精确名判据）' : ''}`, names.slice(0, 5).join(' | ').slice(0, 130))
  }

  // ── D2 组 · 并列清单正文并入宿主（宿主右栏出现全部子页签）───────────────
  console.log('\n【D2 组】并列清单正文并入宿主')
  const D2_HOSTS = [
    { exact: '流量激增应对方法', tabs: ['1. 预估流量', '2. 全链路压测', '3. 定位并解决链路瓶颈', '4. 加机器扩容', '5. 降级', '6. 常态高可用：限流 + 监控报警'] },
    { exact: 'QPS 提升 10 倍的系统设计', tabs: ['① 硬件扩展 + 微服务拆分', '② 高性能 RPC', '③ 消息队列削峰解耦', '④ 三级缓存架构', '⑤ 读写分离 + 分库分表', '⑥ 高可用五板斧'] },
    { exact: '慢查询优化思路（十条）', tabs: ['1. 优先优化高并发执行的 SQL', '4. 从 EXPLAIN 执行计划入手', '10. 合理设计并利用索引'] },
  ]
  for (const h of D2_HOSTS) {
    const r = await openNode(h.exact, h.exact)
    check(r.found, `右栏打开宿主「${h.exact}」`)
    if (!r.found) continue
    for (const t of h.tabs) check(r.text.includes(t), `「${h.exact}」右栏含并入页签「${t}」`)
  }
  console.log('\n【D2 组】并列步骤壳已卸树')
  for (const shell of ['1. 预估流量', '③ 消息队列削峰解耦', '10. 合理设计并利用索引']) {
    const names = await searchExpand(shell)
    check(absent(names, shell), `树中已无步骤壳「${shell}」`, names.slice(0, 5).join(' | ').slice(0, 130))
  }

  // ── D2-c · 经验并入 + D2-d · 子树提级 ─────────────────────────────────
  console.log('\n【D2 组】D2-c 经验并入宿主')
  const poolUse = await openNode('线程池的使用', '线程池的使用')
  check(poolUse.found, '右栏打开「线程池的使用」')
  if (poolUse.found) check(poolUse.text.includes('合理地配置线程池'), '「线程池的使用」右栏含并入页签「合理地配置线程池」')
  const jcp = await openNode('Java并发编程实践', 'Java并发编程实践')
  check(jcp.found, '右栏打开「Java并发编程实践」')
  if (jcp.found) check(jcp.text.includes('线上问题定位'), '「Java并发编程实践」右栏含并入页签「线上问题定位」')

  console.log('\n【D2 组】D2-d 子树提级后壳退休')
  const dw = await openNode('数据仓库', '数据仓库')
  check(dw.found, '「数据仓库」在树中可定位')
  const cw = await searchExpand('创建数据仓库')
  check(absent(cw, '创建数据仓库'), '树中已无「创建数据仓库」', cw.slice(0, 5).join(' | ').slice(0, 130))

  // ── D2-a · Bean 生命周期机制 spec ──────────────────────────────────────
  console.log('\n【D2 组】D2-a Bean 生命周期机制 spec（新建第 15 个）')
  const bean = await openNode('Bean 生命周期', 'Bean 生命周期')
  check(bean.found, '「Bean 生命周期」在树中可定位')
  if (bean.found) {
    for (const t of ['创建前准备阶段', '创建实例阶段', '依赖注入阶段', '容器缓存阶段', '销毁实例阶段']) {
      check(bean.text.includes(t), `Bean 宿主右栏含状态页签「${t}」`)
    }
  }
  // 机制视图端到端：机制契约编辑器只在**编辑态**渲染（ExplanationCard.tsx:319 `isEditing && kind===Mechanism`），
  // 只读浏览时页面上没有「机制视图」字样。真正可读的是顶栏「机制」→ MechanismLensPanel，
  // 它按 `focusNodeId ?? selectedNodeId` 的 mechanismSpec 做投影。所以这里必须切视图实测，不能查关键词。
  const MECHS = [
    { kw: 'Bean 生命周期', exact: 'Bean 生命周期', label: 'Bean 生命周期（本批新建 spec）',
      states: ['创建前准备阶段', '创建实例阶段', '依赖注入阶段', '容器缓存阶段', '销毁实例阶段'],
      transitions: ['依赖注入完成，Bean 入单例缓存', '应用上下文关闭，销毁 Bean'] },
    // 下面两个是 batch1 的 D1：状态同样已卸树，属于同一根因的历史回归，修复后必须一并恢复。
    { kw: 'AOP 执行流程', exact: 'AOP 执行流程', label: 'AOP 执行流程（batch1 D1）',
      states: ['① 代理对象已创建', '② 调用已被拦截', '③ 拦截器链执行中', '④ 织入代码已执行', '⑤ 目标方法已调用（返回）'],
      transitions: ['proceed() 执行拦截器链', '反射调用目标方法'] },
    { kw: '传统 IO 执行流程', exact: '传统 IO 执行流程', label: '传统 IO 执行流程（batch1 D1）',
      states: ['① read 发起（用户态→内核态）', '③ CPU：内核缓冲区 → 用户缓冲区（返回）', '⑥ DMA：socket 缓冲区 → 网卡（返回）'],
      transitions: ['内核发起 DMA 读', 'DMA 拷贝到网卡，write 返回'] },
    { kw: '线程池状态机', exact: '线程池状态机（五状态）', label: '线程池状态机（既有 spec 对照，状态本就在树里）',
      states: [], transitions: ['shutdown()：不收新任务，处理完队列任务'] },
  ]
  const backToUniverse = () => evaluate(`
    (() => {
      const b = [...document.querySelectorAll('.header-nav .header-nav-item')].find(x => (x.querySelector('.nav-label')?.textContent||'').trim() === '视图');
      if (!b) return false;
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return true;
    })()
  `)
  for (const m of MECHS) {
    await backToUniverse()
    await sleep(1400)
    const picked = await openNode(m.kw, m.exact)
    const lens = await switchToMechanismLens()
    console.log(`\n  · ${m.label}`)
    check(picked.found && lens.clicked, `可选中「${m.exact}」并切到机制视图`)
    const empty = lens.text.includes('当前知识不构成机制')
    check(!empty, `「${m.label}」机制视图未判定为「不构成机制」`,
      empty ? '★ 投影返回 null' : `面板文本 ${lens.text.length} 字`)
    for (const t of m.states) check(lens.text.includes(t), `机制视图含状态「${t}」`)
    for (const t of m.transitions) check(lens.text.includes(t), `机制视图含转移「${t}」`)
  }
  console.log('\n【D2 组】去序号后的状态节点已卸树（节点留池供 spec 渲染）')
  for (const st of ['1. 创建前准备阶段', '3. 依赖注入阶段', '5. 销毁实例阶段']) {
    const names = await searchExpand(st)
    check(absent(names, st), `树中已无状态节点「${st}」`, names.slice(0, 5).join(' | ').slice(0, 130))
  }

  // ── 全树规模与无横幅复查 ───────────────────────────────────────────────
  console.log('\n【整体】收尾复查')
  await searchTree('')
  await sleep(800)
  const finalBanner = await evaluate(`
    ['数据加载失败','加载失败','数据校验失败'].filter(k => (document.body.innerText || '').includes(k))
  `)
  check(finalBanner.length === 0, '全流程无数据加载失败横幅', finalBanner.join(',') || 'clean')
} finally {
  ws.close()
  chrome.kill('SIGKILL')
  await sleep(500)
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* 忽略 */ }
}

console.log(failures.length === 0 ? '\nspot check 全部通过 ✅' : `\nspot check 失败 ${failures.length} 项 ❌`)
for (const f of failures) console.log('  · ' + f)
process.exit(failures.length === 0 ? 0 : 1)
