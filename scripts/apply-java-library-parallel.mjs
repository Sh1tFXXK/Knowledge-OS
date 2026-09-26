/**
 * JAVA-LIBRARY-PARALLEL（C 批）· apply（默认 dry-run，--apply 才写）
 *
 * 批次语义 = 设计B：删「类库」平行树整棵 · 「常用类库」改名「类库」· Base64 收成类节点迁入
 *            · 容器 rootContent = 压缩总述 + 缺失名索引段
 *
 * 裁决依据（用户 2026-09-16）：
 *   D1 Ⅱ 改（搬+转+归位）· D2 1b（Base64 收成 tabs）· 设计B（D4 答案）
 *   Δ边按实算 −4（新 Base64 需父边）· 索引段收「树池皆无」的全部名字（零信息损失）
 *
 * 写 3 个数据文件：data/tree-data.json · data/node-pool.json · data/knowledge-edges.json
 *
 * 用法：
 *   node scripts/apply-java-library-parallel.mjs            # dry-run（只读 + 预览）
 *   node scripts/apply-java-library-parallel.mjs --apply    # 落盘
 */
import fs from 'node:fs'
import path from 'node:path'

// ── 范围常量 ─────────────────────────────────────────────────────────────
export const JAVA_TREE_ID = 'tree_1782746457614_osttpr'      // java
export const CONTAINER_TREE_ID = 'tree_java_common_libraries' // 常用类库（→ 类库）
export const CONTAINER_REF = 'k_java_common_libraries'

export const OLD_ROOT = 'tree_1784343188605_zvliz7'        // 类库
export const OLD_ROUTINE = 'tree_1787744961246_qrx71j'     // 类库 > 常用
export const OLD_B64 = 'tree_1787852489274_38y4mx'         // 类库 > Base64
export const OLD_B64_NEST = 'tree_1787852534087_ihkz40'    // 类库 > Base64 > 内嵌类
export const OLD_B64_METH = 'tree_1787852619447_kifsd4'    // 类库 > Base64 > 方法

export const OLD_TREE_IDS = [OLD_ROOT, OLD_ROUTINE, OLD_B64, OLD_B64_NEST, OLD_B64_METH]
export const OLD_REFS = ['k_1784343188560_x1gylq', 'k_1787744960960_nuqg5v', 'k_1787852488347_zqzfjo', 'k_1787852533507_uv8rwh', 'k_1787852618831_l95bj1']

export const NEW_TREE_ID = 'tree_java_util_base64'
export const NEW_REF = 'k_java_util_base64'
export const NEW_EDGE_ID = 'treebind:' + CONTAINER_TREE_ID + ':' + NEW_TREE_ID
export const OLD_EDGE_IDS = [
  'treebind:' + JAVA_TREE_ID + ':' + OLD_ROOT,
  'treebind:' + OLD_ROOT + ':' + OLD_ROUTINE,
  'treebind:' + OLD_ROOT + ':' + OLD_B64,
  'treebind:' + OLD_B64 + ':' + OLD_B64_NEST,
  'treebind:' + OLD_B64 + ':' + OLD_B64_METH,
]

export const CONTAINER_NEW_NAME = '类库'
export const CONTAINER_NEW_LABEL = '类库'
export const CONTAINER_NEW_TITLE = 'Java 类库'
export const CONTAINER_NEW_TAGS = ['类库', 'java', 'jdk', '常用类库', 'Java 常用类库']

export const EXPECTED_DELTA = { tree: -4, pool: -4, edges: -4 }  // 净变化
export const SOURCE_LENGTHS = { routine: 2801, b64root: 277, b64nest: 311, b64meth: 821, overview: 100 }

// ── 纯函数：计划（dry-run 与 apply 共用同一份）───────────────────────────
const rd = (p) => JSON.parse(fs.readFileSync(path.join(process.cwd(), p), 'utf8'))
const rdText = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

function walkAll(root) {
  const out = []
  const rec = (node, ancestors) => {
    out.push({ node, ancestors, path: [...ancestors, node].map((x) => x.name).join(' > ') })
    for (const c of node.children ?? []) rec(c, [...ancestors, node])
  }
  rec(root, [])
  return out
}

/** 「树/池是否已有该名字」判据（四支，全部机械可复现）
 *   ① FQCN 全等
 *   ② 简单名全等
 *   ③ 词边界命中（名字以 `<simple>` 开头且紧跟分隔符，如 `Character 类` / `File 类`）
 *      ④ java 子树内的节点名含 `<simple>` 作为独立词
 *    ④ 是为修 ③ 的**跨域误命中**而加：`Socket 文件 / Socket file` 在 MySQL 域（Unix socket 文件），
 *      却把 `java.net.Socket` 判成「已有」。见 JAVA_DOMAIN 参数与负对照。
 */
function makePresence(nodes, pool, javaDomainNames = []) {
  const known = new Set()
  for (const x of nodes) known.add(String(x.node.name))
  for (const e of Object.values(pool)) {
    known.add(String(e.label ?? ''))
    if (e.card?.title) known.add(String(e.card.title))
  }
  const arr = [...known]
  const javaArr = [...javaDomainNames]
  const wordRe = (simple) => new RegExp('(^|[\\s（(【/])' + simple.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([\\s）)】/]|$)')
  return (fqcn) => {
    const simple = String(fqcn).split('.').pop()
    if (known.has(fqcn)) return `FQCN 全等: ${fqcn}`
    if (known.has(simple)) return `简单名全等: ${simple}`
    // ④ 先于 ③：同域证据强于跨域同名（负对照见 crossDomain）
    const hitJava = javaArr.find((x) => wordRe(simple).test(x))
    if (hitJava) return `java 域内命中: ${hitJava}`
    const esc = simple.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const head = new RegExp('^' + esc + '([\\s（(【]|$)')
    const hitHead = arr.find((x) => head.test(x))
    return hitHead ? `词边界命中(跨域?): ${hitHead}` : null
  }
}

/** 从「类库 > 常用」清单里抽出「树池皆无」的名字（零信息损失口径）*/
export function extractMissingIndex(nodes, pool, routineText, javaDomainNames = []) {
  const present = makePresence(nodes, pool, javaDomainNames)
  const PKG = /^(lang|util|time|api|io|nio|text|net|regex|concurrent|file|temporal|format)$/
  const rows = [...routineText.matchAll(/^\s*((?:java|javax|org|com)\.[A-Za-z0-9_.]+)\s*\t(.*)$/gm)]
    .map((m) => ({ fqcn: m[1], desc: m[2].trim() }))

  const jdk = [], seen = new Set(), presentRows = []
  for (const r of rows) {
    const simple = r.fqcn.split('.').pop()
    if (PKG.test(simple)) continue
    if (seen.has(r.fqcn)) continue
    seen.add(r.fqcn)
    const why = present(r.fqcn)
    if (why) presentRows.push({ fqcn: r.fqcn, why })
    else jdk.push(r)
  }

  // 第三方块：解析「名称（FQCN）\t说明」行
  const third = []
  const tail = routineText.slice(routineText.indexOf('二、主流第三方类库'))
  for (const line of tail.split('\n')) {
    if (!line.includes('\t')) continue
    const [leftRaw, ...rest] = line.split('\t')
    const left = leftRaw.trim()
    if (!left || /^(库名称|工具名称|全限定类名)/.test(left)) continue
    const m = left.match(/^(.+?)（([^）]+)）$/)
    const name = m ? m[1].trim() : left
    const fqcn = m ? m[2].trim() : null
    const desc = rest.join('\t').trim()
    if (present(fqcn || name)) continue
    third.push({ name, fqcn, desc })
  }
  return { jdk, third, presentRows }
}

export function buildPlan() {
  const tree = rd('data/tree-data.json')
  const pool = rd('data/node-pool.json')
  const edges = rd('data/knowledge-edges.json')
  const eArr = Array.isArray(edges) ? edges : edges.edges
  const edgesRaw = rdText('data/knowledge-edges.json')

  const problems = []
  const note = (ok, msg) => { if (!ok) problems.push(msg) }

  const nodes = walkAll(tree)
  const byId = new Map(nodes.map((x) => [x.node.id, x]))

  // java 子树内的节点名（用于修「词边界命中」的跨域误命中，见 makePresence 注释）
  const javaNode = byId.get(JAVA_TREE_ID)
  const javaDomainNames = javaNode
    ? nodes.filter((x) => x.path === javaNode.path || x.path.startsWith(javaNode.path + ' > ')).map((x) => String(x.node.name))
    : []

  // ── 前置断言 ─────────────────────────────────────────────────────────
  for (const id of OLD_TREE_IDS) note(byId.has(id), `旧树节点缺失：${id}`)
  for (const r of OLD_REFS) note(!!pool[r], `旧池实体缺失：${r}`)
  note(byId.has(CONTAINER_TREE_ID), `容器树节点缺失：${CONTAINER_TREE_ID}`)
  note(!!pool[CONTAINER_REF], `容器池实体缺失：${CONTAINER_REF}`)

  const oldSub = nodes.filter((x) => x.path === byId.get(OLD_ROOT)?.path || x.path.startsWith((byId.get(OLD_ROOT)?.path ?? '\u0000') + ' > '))
  note(oldSub.length === 5, `旧子树应恰 5 节点，实际 ${oldSub.length}`)

  const tbIds = new Set(eArr.filter((e) => typeof e.id === 'string' && e.id.startsWith('treebind:')).map((e) => e.id))
  const foundOldEdges = OLD_EDGE_IDS.filter((id) => tbIds.has(id))
  note(foundOldEdges.length === 5, `旧 treebind 边应恰 5 条，实际命中 ${foundOldEdges.length}：缺 ${OLD_EDGE_IDS.filter((i) => !tbIds.has(i)).join(', ')}`)

  const scopeSet = new Set([...OLD_REFS, ...OLD_TREE_IDS])
  const nonTb = eArr.filter((e) => !String(e.id ?? '').startsWith('treebind:') &&
    (scopeSet.has(e.source) || scopeSet.has(e.target)))
  note(nonTb.length === 0, `范围内不应有非 treebind 边，实际 ${nonTb.length}`)

  let extRefs = 0
  for (const [k, e] of Object.entries(pool)) {
    if (OLD_REFS.includes(k)) continue
    const s = JSON.stringify(e)
    for (const r of OLD_REFS) if (s.includes('"' + r + '"')) extRefs++
  }
  note(extRefs === 0, `旧 ref 被外部池实体引用 ${extRefs} 处`)
  for (const r of OLD_REFS) note((edgesRaw.split(r).length - 1) > 0, `旧 ref ${r} 在边表零出现（异常）`)

  // 新 id 三处碰撞检查
  const occupied = new Set([...nodes.map((x) => x.node.id), ...Object.keys(pool), ...eArr.map((e) => e.id)])
  note(!occupied.has(NEW_TREE_ID), `新 treeId 已占用：${NEW_TREE_ID}`)
  note(!occupied.has(NEW_REF), `新池 id 已占用：${NEW_REF}`)
  note(!occupied.has(NEW_EDGE_ID), `新边 id 已占用：${NEW_EDGE_ID}`)

  // 容器当前状态
  const cTree = byId.get(CONTAINER_TREE_ID)
  const cEnt = pool[CONTAINER_REF]
  const cKids = (cTree?.node.children ?? []).map((c) => c.id)
  note(!cKids.includes(NEW_TREE_ID), `容器下已有新 treeId`)
  note(cTree?.node.name === '常用类库', `容器树名应为「常用类库」，实际 ${JSON.stringify(cTree?.node.name)}`)
  note(!('rootContent' in (cEnt?.card ?? {})), `容器 card 不应已有 rootContent`)

  // ── 源内容 ───────────────────────────────────────────────────────────
  const overviewFull = String(pool[OLD_REFS[0]]?.card?.rootContent ?? '')
  const overview = overviewFull.split('\n').filter((s) => s.trim())[0] ?? ''
  note(overview.length === SOURCE_LENGTHS.overview, `总述首段应 ${SOURCE_LENGTHS.overview} 字，实际 ${overview.length}`)

  const routineText = String(pool[OLD_REFS[1]]?.card?.rootContent ?? '')
  note(routineText.length === SOURCE_LENGTHS.routine, `清单应 ${SOURCE_LENGTHS.routine} 字，实际 ${routineText.length}`)
  const b64Root = String(pool[OLD_REFS[2]]?.card?.rootContent ?? '')
  const b64Nest = String(pool[OLD_REFS[3]]?.card?.rootContent ?? '')
  const b64Meth = String(pool[OLD_REFS[4]]?.card?.rootContent ?? '')
  note(b64Root.length === SOURCE_LENGTHS.b64root, `Base64 概述应 ${SOURCE_LENGTHS.b64root} 字，实际 ${b64Root.length}`)
  note(b64Nest.length === SOURCE_LENGTHS.b64nest, `内嵌类应 ${SOURCE_LENGTHS.b64nest} 字，实际 ${b64Nest.length}`)
  note(b64Meth.length === SOURCE_LENGTHS.b64meth, `方法应 ${SOURCE_LENGTHS.b64meth} 字，实际 ${b64Meth.length}`)

  const idx = extractMissingIndex(nodes, pool, routineText, javaDomainNames)

  // 负对照：跨域同名节点（不应构成「已有」的证据）
  const crossDomain = nodes
    .filter((x) => !javaDomainNames.includes(String(x.node.name)) && /Socket|File|Character/.test(String(x.node.name)))
    .map((x) => `${x.node.name} @ ${x.path.split(' > ').slice(-3).join('>')}`)

  // 索引段文本
  const L = []
  L.push('以下类目在库中尚无独立条目，此处作为索引保留：')
  L.push('')
  L.push('JDK 核心类：')
  for (const r of idx.jdk) L.push('- ' + r.fqcn + ' — ' + r.desc)
  L.push('')
  L.push('第三方库：')
  for (const r of idx.third) L.push('- ' + r.name + (r.fqcn ? '（' + r.fqcn + '）' : '') + ' — ' + r.desc)
  const indexText = L.join('\n')
  const containerRootContent = overview + '\n\n' + indexText

  const b64RootLine = b64Root.split('\n').filter((s) => s.trim())[0] ?? ''

  // ── 计划 ─────────────────────────────────────────────────────────────
  const before = { treeNodes: nodes.length, poolKeys: Object.keys(pool).length, edges: eArr.length, containerChildren: cKids.length }
  const after = {
    treeNodes: before.treeNodes - 5 + 1,
    poolKeys: before.poolKeys - 5 + 1,
    edges: before.edges - 5 + 1,
    containerChildren: before.containerChildren + 1,
  }

  return {
    problems, before, after, idx, crossDomain,
    content: { overview, indexText, containerRootContent, b64Root, b64Nest, b64Meth, b64RootLine },
    keepEdges: eArr.filter((e) => String(e.id ?? '').startsWith('treebind:') && String(e.id).startsWith('treebind:' + CONTAINER_TREE_ID + ':')).map((e) => e.id),
  }
}

// ── 落盘 ─────────────────────────────────────────────────────────────────
function withTrailingNL(original, obj) {
  const nl = original.endsWith('\n')
  return JSON.stringify(obj, null, 2) + (nl ? '\n' : '')
}
function atomicWrite(relPath, content) {
  const abs = path.join(process.cwd(), relPath)
  const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, content, 'utf8')
  try { fs.renameSync(tmp, abs) } catch { fs.writeFileSync(abs, content, 'utf8'); try { fs.unlinkSync(tmp) } catch { /* noop */ } }
}

// ── CLI ──────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply')
const plan = buildPlan()
const H = (s) => console.log('\n══ ' + s + ' ' + '═'.repeat(Math.max(0, 60 - s.length)))

console.log('════ JAVA-LIBRARY-PARALLEL（C 批）' + (APPLY ? ' · APPLY' : ' · DRY-RUN') + ' ════')
H('1 · 基数')
console.log('  树(含根) =', plan.before.treeNodes, '→', plan.after.treeNodes)
console.log('  池 keys  =', plan.before.poolKeys, '→', plan.after.poolKeys)
console.log('  边       =', plan.before.edges, '→', plan.after.edges)
console.log('  容器子数 =', plan.before.containerChildren, '→', plan.after.containerChildren)
const d = { tree: plan.after.treeNodes - plan.before.treeNodes, pool: plan.after.poolKeys - plan.before.poolKeys, edges: plan.after.edges - plan.before.edges }
console.log('  Δ = 树', d.tree, '· 池', d.pool, '· 边', d.edges,
  (d.tree === EXPECTED_DELTA.tree && d.pool === EXPECTED_DELTA.pool && d.edges === EXPECTED_DELTA.edges) ? '✅ 与声明一致' : '⛔ 与声明不符')

H('2 · 缺失名索引段（树池皆无；口径 = FQCN全等 ∨ 简单名全等 ∨ java域内命中 ∨ 词边界回退）')
console.log('  JDK 核心类 ' + plan.idx.jdk.length + ' 条:')
for (const r of plan.idx.jdk) console.log('    - ' + r.fqcn + ' — ' + r.desc)
console.log('  第三方库 ' + plan.idx.third.length + ' 条:')
for (const r of plan.idx.third) console.log('    - ' + r.name + (r.fqcn ? '（' + r.fqcn + '）' : '') + ' — ' + r.desc)
console.log('  （误报对照：判「已有」的清单条目 ' + plan.idx.presentRows.length + ' 条，其中词边界命中 ' +
  plan.idx.presentRows.filter((x) => x.why.startsWith('词边界')).length + ' 条 · java 域内命中 ' +
  plan.idx.presentRows.filter((x) => x.why.startsWith('java 域内')).length + ' 条）')
for (const x of plan.idx.presentRows.filter((p) => !p.why.startsWith('FQCN') && !p.why.startsWith('简单名'))) console.log('      ' + x.fqcn + ' ← ' + x.why)
console.log('  负对照（跨域同名节点，不构成「已有」证据）:')
for (const x of plan.crossDomain) console.log('      ⚪ ' + x)

H('3 · 容器 rootContent（总述 ' + plan.content.overview.length + ' 字 + 索引段 ' + plan.content.indexText.length + ' 字）')
console.log(plan.content.containerRootContent)

H('4 · 新 Base64 节点')
console.log('  treeId =', NEW_TREE_ID, ' ref =', NEW_REF)
console.log('  tabs = def/定义(' + plan.content.b64Root.length + ') · nested/内嵌类(' + plan.content.b64Nest.length + ') · methods/常用方法(' + plan.content.b64Meth.length + ')')
console.log('  rootContent =', JSON.stringify(plan.content.b64RootLine), '(' + plan.content.b64RootLine.length + ' 字，取自材料原句)')

H('5 · 前置断言')
if (plan.problems.length) { console.log('⛔ 失败 ' + plan.problems.length + ' 条：'); for (const p of plan.problems) console.log('   · ' + p) }
else console.log('✅ 全部通过')

H('6 · 保留侧：容器现有子边（' + plan.keepEdges.length + ' 条，不动）')
console.log('  ' + plan.keepEdges.slice(0, 3).join('\n  ') + (plan.keepEdges.length > 3 ? '\n  … 共 ' + plan.keepEdges.length + ' 条' : ''))

if (!APPLY) {
  console.log('\n（dry-run 结束，未写盘。）实跑：node scripts/apply-java-library-parallel.mjs --apply')
  process.exit(plan.problems.length ? 2 : 0)
}

if (plan.problems.length) { console.log('\n⛔ 前置断言未通过，拒绝落盘。'); process.exit(2) }

// ── 真落盘 ───────────────────────────────────────────────────────────────
const STAMP = new Date().toISOString().replace(/[:.]/g, '-')
const BK_REL = 'data/backups/java-library-parallel-' + STAMP
const BK_FILES = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json']
fs.mkdirSync(path.join(process.cwd(), BK_REL), { recursive: true })
for (const f of BK_FILES) fs.copyFileSync(path.join(process.cwd(), 'data/' + f), path.join(process.cwd(), BK_REL + '/' + f))
console.log('\n✔ 备份 → ' + BK_REL)

const treeRaw = rdText('data/tree-data.json')
const poolRaw = rdText('data/node-pool.json')
const edgesRaw = rdText('data/knowledge-edges.json')
const tree = JSON.parse(treeRaw)
const pool = JSON.parse(poolRaw)
const edges = JSON.parse(edgesRaw)
const eArr = Array.isArray(edges) ? edges : edges.edges

// 1) 容器改名
const findC = (n) => {
  if (n.id === CONTAINER_TREE_ID) return n
  for (const c of n.children ?? []) { const r = findC(c); if (r) return r }
  return null
}
const cNode = findC(tree)
cNode.name = CONTAINER_NEW_NAME
const cEnt = pool[CONTAINER_REF]
cEnt.label = CONTAINER_NEW_LABEL
cEnt.tags = CONTAINER_NEW_TAGS
cEnt.card.title = CONTAINER_NEW_TITLE
// rootContent 插在 title 之后（保持 nodeId,title,rootContent,tabs 键序）
cEnt.card = { nodeId: cEnt.card.nodeId, title: cEnt.card.title, rootContent: plan.content.containerRootContent, tabs: cEnt.card.tabs }

// 2) 摘除旧子树根（其 4 个后代随根消失）
const dropChild = (parent, id) => { parent.children = (parent.children ?? []).filter((c) => c.id !== id) }
const findParentOf = (n, id) => {
  if ((n.children ?? []).some((c) => c.id === id)) return n
  for (const c of n.children ?? []) { const r = findParentOf(c, id); if (r) return r }
  return null
}
const javaNode = findParentOf(tree, OLD_ROOT)
dropChild(javaNode, OLD_ROOT)

// 3) 新建 Base64 节点（追加到容器 children 末尾）
cNode.children.push({ id: NEW_TREE_ID, name: 'java.util.Base64', nodeRef: NEW_REF, count: 0, children: [] })

// 4) 新池实体
pool[NEW_REF] = {
  id: NEW_REF,
  label: 'java.util.Base64',
  card: {
    nodeId: NEW_REF,
    title: 'java.util.Base64',
    rootContent: plan.content.b64RootLine,
    tabs: [
      { id: 'def', label: '定义', content: plan.content.b64Root },
      { id: 'nested', label: '内嵌类', content: plan.content.b64Nest },
      { id: 'methods', label: '常用方法', content: plan.content.b64Meth },
    ],
  },
  tags: ['java.util.Base64', 'java', 'jdk', '常用类库'],
}

// 5) 删旧池实体
for (const r of OLD_REFS) delete pool[r]

// 6) 删旧边 + 建新边（插在容器最后一条子边之后，保持局部性）
const before6 = eArr.length
const kept = eArr.filter((e) => !OLD_EDGE_IDS.includes(e.id))
const lastKidIdx = kept.map((e) => e.id).lastIndexOf(plan.keepEdges[plan.keepEdges.length - 1])
const newEdge = {
  id: NEW_EDGE_ID,
  source: CONTAINER_REF,
  target: NEW_REF,
  type: 'belongs-to',
  label: 'contains',
  relationKind: 'structure',
  dimensions: ['java'],
}
kept.splice(lastKidIdx + 1, 0, newEdge)

atomicWrite('data/tree-data.json', withTrailingNL(treeRaw, tree))
atomicWrite('data/node-pool.json', withTrailingNL(poolRaw, pool))
atomicWrite('data/knowledge-edges.json', withTrailingNL(edgesRaw, Array.isArray(edges) ? kept : { ...edges, edges: kept }))

fs.writeFileSync(path.join(process.cwd(), BK_REL + '/journal.txt'), [
  'batch=java-library-parallel',
  'mode=designB (D1=Ⅱ · D2=1b · D4 方案B · edgeΔ=-4)',
  'delTree=' + OLD_TREE_IDS.join(','),
  'delPool=' + OLD_REFS.join(','),
  'delEdges=' + OLD_EDGE_IDS.join(','),
  'addTree=' + NEW_TREE_ID + ' (' + NEW_REF + ')',
  'addEdge=' + NEW_EDGE_ID,
  'rename=tree_java_common_libraries name:常用类库→类库 ; pool:Java 常用类库→类库',
  'containerRootContent=总述' + plan.content.overview.length + '字 + 索引段' + plan.content.indexText.length + '字',
  'edges before=' + before6 + ' after=' + kept.length,
  '',
].join('\n'), 'utf8')

// ── 落盘后自检 ───────────────────────────────────────────────────────────
const tree2 = rd('data/tree-data.json')
const pool2 = rd('data/node-pool.json')
const edges2Raw = rdText('data/knowledge-edges.json')
const eArr2 = (() => { const x = JSON.parse(edges2Raw); return Array.isArray(x) ? x : x.edges })()
const nodes2 = walkAll(tree2)
const CHK = []
// ⚠️ 消息必须是「通过时的状态陈述」，不得写成失败描述 ——
//    否则通过时也照打，会读成假陈述（如「✅ 旧 treeId 仍在」）。detail 仅在失败时追加。
const ck = (ok, desc, detail = '') => CHK.push({ ok, msg: ok ? desc : desc + (detail ? ' ← 实际：' + detail : '') })

ck(nodes2.length === plan.after.treeNodes, `树节点数 = ${plan.after.treeNodes}`, String(nodes2.length))
ck(Object.keys(pool2).length === plan.after.poolKeys, `池键数 = ${plan.after.poolKeys}`, String(Object.keys(pool2).length))
ck(eArr2.length === plan.after.edges, `边数 = ${plan.after.edges}`, String(eArr2.length))

for (const id of OLD_TREE_IDS) ck(!nodes2.some((x) => x.node.id === id), `旧 treeId 已清除：${id}`, '仍存在')
for (const r of OLD_REFS) ck(!pool2[r], `旧池实体已删除：${r}`, '仍存在')
for (const id of OLD_EDGE_IDS) ck(!eArr2.some((e) => e.id === id), `旧边已删除：${id}`, '仍存在')

const rawAll = JSON.stringify(tree2) + JSON.stringify(pool2) + edges2Raw
for (const r of OLD_REFS) ck(!rawAll.includes(r), `旧 ref 全库零残留：${r}`, '文本仍出现')

const n2 = nodes2.find((x) => x.node.id === NEW_TREE_ID)
ck(!!n2, `新 treeId 已就位：${NEW_TREE_ID}`, '不存在')
ck(!!pool2[NEW_REF], `新池实体已就位：${NEW_REF}`, '不存在')
const cont2 = nodes2.find((x) => x.node.id === CONTAINER_TREE_ID)
ck(cont2.node.children.some((c) => c.id === NEW_TREE_ID), '新节点已挂在容器 children 下', '未挂上')
ck(cont2.node.name === CONTAINER_NEW_NAME, `容器树名 = ${CONTAINER_NEW_NAME}`, String(cont2.node.name))
ck(pool2[CONTAINER_REF].label === CONTAINER_NEW_LABEL, `容器 label = ${CONTAINER_NEW_LABEL}`, String(pool2[CONTAINER_REF].label))
ck(pool2[CONTAINER_REF].card.title === CONTAINER_NEW_TITLE, `容器 card.title = ${CONTAINER_NEW_TITLE}`, String(pool2[CONTAINER_REF].card.title))
ck(JSON.stringify(Object.keys(pool2[CONTAINER_REF].card)) === JSON.stringify(['nodeId', 'title', 'rootContent', 'tabs']), '容器 card 键序 = nodeId,title,rootContent,tabs', Object.keys(pool2[CONTAINER_REF].card).join(','))
ck(pool2[CONTAINER_REF].card.rootContent === plan.content.containerRootContent, '容器 rootContent 与计划逐字节相等', '不符')

const ne = eArr2.find((e) => e.id === NEW_EDGE_ID)
ck(!!ne, `新边已建立：${NEW_EDGE_ID}`, '不存在')
ck(!!ne && ne.source === CONTAINER_REF && ne.target === NEW_REF, '新边端点 = 容器 → Base64', ne ? `${ne.source} → ${ne.target}` : 'n/a')
ck(!!ne && JSON.stringify(ne.dimensions) === JSON.stringify(['java']), '新边 dimensions = ["java"]（与同类兄弟一致）', JSON.stringify(ne?.dimensions))

const bt = pool2[NEW_REF].card.tabs
ck(bt.length === 3 && bt.map((t) => t.id).join(',') === 'def,nested,methods', '新实体 3 tabs = def,nested,methods', bt.map((t) => t.id).join(','))
ck(bt[0].content === plan.content.b64Root, 'def tab 内容与源逐字相等（概述 277 字）', `len=${bt[0]?.content?.length}`)
ck(bt[1].content === plan.content.b64Nest, 'nested tab 内容与源逐字相等（内嵌类 311 字）', `len=${bt[1]?.content?.length}`)
ck(bt[2].content === plan.content.b64Meth, 'methods tab 内容与源逐字相等（方法 821 字）', `len=${bt[2]?.content?.length}`)
ck(n2 && n2.node.nodeRef === NEW_REF && n2.node.children.length === 0, '新树节点为叶子且 nodeRef 正确', n2 ? `ref=${n2.node.nodeRef} children=${n2.node.children.length}` : 'n/a')
ck(cont2.node.children.length === plan.after.containerChildren, `容器子数 = ${plan.after.containerChildren}`, String(cont2.node.children.length))
ck(cont2.node.count === 13, '容器 count 保持 13（手工标注，本批不动）', String(cont2.node.count))
ck(plan.keepEdges.every((id) => eArr2.some((e) => e.id === id)), `容器既有子边 ${plan.keepEdges.length} 条全部保留`, '有丢失')

H('7 · 落盘后自检（' + CHK.filter((c) => c.ok).length + '/' + CHK.length + '）')
for (const c of CHK) console.log('  ' + (c.ok ? '✅' : '⛔') + ' ' + c.msg)
const pass = CHK.every((c) => c.ok)
console.log('\n' + (pass ? '✅ REAL_APPLY_VERIFIED' : '⛔ 自检失败，请从备份回滚（cp，勿用 git checkout）'))
console.log('   备份：' + BK_REL)
process.exit(pass ? 0 : 3)
