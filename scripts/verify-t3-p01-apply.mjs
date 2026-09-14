/**
 * T3-P0.1 独立验证（**不 import apply 脚本**，不复制其逻辑）。
 *
 * 纪律：
 *   ① 不引用 apply 代码 —— 独立重写；
 *   ② 比对的是**磁盘上的落盘前备份快照 vs 当前工作树**（不是内存克隆、不是脚本自报）；
 *   ③ **从数据反推**「到底删了什么」，再与 apply 的声明双向核对 —— 不是先信声明再找证据。
 *
 * 用法：node scripts/verify-t3-p01-apply.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')

const md5 = (p) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex')
const rdJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

// ── 找最新的 t3-p0.1 备份快照 ──
const backupRoot = path.join(DATA, 'backups')
const snaps = fs.readdirSync(backupRoot).filter((d) => d.startsWith('t3-p0.1-')).sort()
if (!snaps.length) { console.error('⛔ 找不到 data/backups/t3-p0.1-* 快照'); process.exit(1) }
const SNAP = path.join(backupRoot, snaps[snaps.length - 1])
console.log('快照：' + path.relative(ROOT, SNAP))

const FILES = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']
const snapRaw = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(SNAP, f), 'utf8')]))
const curRaw = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(DATA, f), 'utf8')]))

const snapTree = JSON.parse(snapRaw['tree-data.json'])
const curTree = JSON.parse(curRaw['tree-data.json'])
const snapEdgesFile = JSON.parse(snapRaw['knowledge-edges.json'])
const curEdgesFile = JSON.parse(curRaw['knowledge-edges.json'])
const snapEdges = Array.isArray(snapEdgesFile) ? snapEdgesFile : snapEdgesFile.edges
const curEdges = Array.isArray(curEdgesFile) ? curEdgesFile : curEdgesFile.edges
const snapEvoFile = JSON.parse(snapRaw['evolution-events.json'])
const curEvoFile = JSON.parse(curRaw['evolution-events.json'])
const snapEvo = Array.isArray(snapEvoFile) ? snapEvoFile : snapEvoFile.events
const curEvo = Array.isArray(curEvoFile) ? curEvoFile : curEvoFile.events
const snapPool = JSON.parse(snapRaw['node-pool.json'])
const curPool = JSON.parse(curRaw['node-pool.json'])

const walk = (root, visit, parent = null) => {
  visit(root, parent)
  for (const c of root.children || []) walk(c, visit, root)
}
const flatMap = (root) => { const m = new Map(); walk(root, (n, p) => m.set(n.id, { node: n, parent: p })); return m }
const count = (root) => { let n = 0; walk(root, () => { n += 1 }); return n }
const treeIdsOf = (root) => new Set(flatMap(root).keys())

/** 稳健 treebind 解析（枚举切点，两半都须命中活 treeId） */
function analyzeTb(ids, edges) {
  const tb = edges.filter((e) => String(e.id).startsWith('treebind:'))
  const unresolved = new Set()
  for (const e of tb) {
    const body = String(e.id).slice('treebind:'.length)
    let hits = 0
    for (let i = 1; i < body.length - 1; i += 1) {
      if (body[i] !== ':') continue
      if (ids.has(body.slice(0, i)) && ids.has(body.slice(i + 1))) hits += 1
    }
    if (hits === 0) unresolved.add(e.id)
  }
  return { total: tb.length, unresolved }
}
function atomDangling(pool) {
  const out = []
  for (const [id, p] of Object.entries(pool)) {
    for (const d of p?.viewDimensions || []) for (const s of d.sections || []) for (const a of s.atoms || []) if (!pool[a.nodeId]) out.push({ owner: id, atom: a.nodeId })
  }
  return out
}
function refDangling(tree, pool) {
  const out = []
  walk(tree, (n) => { if (n.nodeRef && !pool[n.nodeRef]) out.push({ treeId: n.id, nodeRef: n.nodeRef }) })
  return out
}

// ══════════════════════════════════════════════════════════════════════
// ① 从数据**反推**被卸的树节点
// ══════════════════════════════════════════════════════════════════════
const snapNodes = flatMap(snapTree)
const curNodes = flatMap(curTree)
const removedTreeIds = [...snapNodes.keys()].filter((id) => !curNodes.has(id))
const addedTreeIds = [...curNodes.keys()].filter((id) => !snapNodes.has(id))

// ② 从数据反推被删的边
const snapEdgeById = new Map(snapEdges.map((e) => [e.id, e]))
const curEdgeById = new Map(curEdges.map((e) => [e.id, e]))
const removedEdgeIds = [...snapEdgeById.keys()].filter((id) => !curEdgeById.has(id))
const addedEdgeIds = [...curEdgeById.keys()].filter((id) => !snapEdgeById.has(id))

// ══════════════════════════════════════════════════════════════════════
// 检查
// ══════════════════════════════════════════════════════════════════════
const checks = []
const ck = (id, name, ok, detail) => checks.push({ id, name, ok, detail })

// V1 恰好卸 3 个、且不含新增
ck('V1', '反推：树恰好移除 3 个节点 ∧ 0 新增', removedTreeIds.length === 3 && addedTreeIds.length === 0,
  '移除 ' + removedTreeIds.length + ' [' + removedTreeIds.join(', ') + '] · 新增 ' + addedTreeIds.length)

// V2 被卸者均为叶子（无子节点丢失）
{
  const lostKids = removedTreeIds.flatMap((id) => (snapNodes.get(id)?.node.children || []).map((c) => c.id)).filter((cid) => !curNodes.has(cid))
  ck('V2', '被卸的 3 个均为叶子 —— 无任何子节点被连带丢失', lostKids.length === 0,
    lostKids.length ? '丢失子节点：' + lostKids.join(', ') : '0 个连带丢失')
}

// V3 被卸节点在**其它**数据里 0 残留（引用闭合，从数据反推）
{
  const residual = []
  for (const f of ['node-pool.json', 'questions.json', 'evolution-events.json']) {
    for (const id of removedTreeIds) if (curRaw[f].includes(id)) residual.push(f + ':' + id)
  }
  ck('V3', '引用闭合：被卸 treeId 在 池/题库/审计 中 0 残留（对象 id 除外，见 V3b）',
    residual.filter((r) => !r.startsWith('evolution-events.json')).length === 0,
    residual.length ? residual.join(', ') : '0 残留')
}

// V3b 审计叙事允许保留旧 treeId（宪法 §3.6：身份承载 vs 叙事）
{
  const inEvo = removedTreeIds.filter((id) => curRaw['evolution-events.json'].includes(id))
  ck('V3b', '审计叙事（evolution-events）中允许出现被卸 treeId（宪法 §3.6 字段角色）', true,
    inEvo.length ? '出现在审计中 ' + inEvo.length + ' 个 —— 属叙事，允许' : '未出现')
}

// V4 反推：被删边恰为 3 条 treebind，且 id = treebind:<原父 treeId>:<被卸 treeId>
{
  const allBind = removedEdgeIds.every((id) => String(id).startsWith('treebind:'))
  const consistent = removedEdgeIds.every((eid) => {
    const body = String(eid).slice('treebind:'.length)
    return removedTreeIds.some((tid) => body.endsWith(':' + tid) || body === tid)
  })
  ck('V4', '反推：被删边恰 3 条 ∧ 均为 treebind ∧ 每条都指向某个被卸 treeId',
    removedEdgeIds.length === 3 && allBind && consistent && addedEdgeIds.length === 0,
    '删 ' + removedEdgeIds.length + ' 条（treebind=' + allBind + ' · 指向被卸节点=' + consistent + '）· 新增 ' + addedEdgeIds.length)
}

// V5 被卸节点的父：确为同一个宿主，且宿主子数 10→7
{
  const parents = [...new Set(removedTreeIds.map((id) => snapNodes.get(id)?.parent?.id))]
  const hostSnap = snapNodes.get(parents[0])?.node
  const hostCur = curNodes.get(parents[0])?.node
  ck('V5', '被卸节点同属一个父 ∧ 该父子数 10→7',
    parents.length === 1 && (hostSnap?.children || []).length === 10 && (hostCur?.children || []).length === 7,
    '父 = ' + parents[0] + ' · 子数 ' + (hostSnap?.children || []).length + '→' + (hostCur?.children || []).length)
}

// V6 宿主剩余子顺序 = 原顺序去掉被卸者（逐项相等）
{
  const parentId = snapNodes.get(removedTreeIds[0])?.parent?.id
  const before = (snapNodes.get(parentId)?.node.children || []).map((c) => c.id)
  const after = (curNodes.get(parentId)?.node.children || []).map((c) => c.id)
  const expected = before.filter((id) => !removedTreeIds.includes(id))
  ck('V6', '宿主剩余子顺序保持（= 原顺序去掉被卸者，逐项相等）', JSON.stringify(after) === JSON.stringify(expected),
    'after=' + after.length + ' 项 · 期望=' + expected.length + ' 项 · 相等=' + (JSON.stringify(after) === JSON.stringify(expected)))
}

// V7 其余节点逐字节不变（除被卸者）—— **分两段**，避免把祖先的嵌套 children 误判为变化
{
  // V7a 自身字段（除 children）全等
  const badSelf = []
  for (const [id, rec] of curNodes) {
    const s = snapNodes.get(id)
    if (!s) { badSelf.push(id + '(新增)'); continue }
    const a = { ...rec.node }; delete a.children
    const b = { ...s.node }; delete b.children
    if (JSON.stringify(a) !== JSON.stringify(b)) badSelf.push(id)
  }
  // V7b 每个存活节点的 children 列表 = 原列表减去被卸 3 个（逐项、按序）
  const badKids = []
  for (const [id, rec] of curNodes) {
    const s = snapNodes.get(id)
    if (!s) continue
    const exp = (s.node.children || []).map((c) => c.id).filter((cid) => !removedTreeIds.includes(cid))
    const got = (rec.node.children || []).map((c) => c.id)
    if (JSON.stringify(exp) !== JSON.stringify(got)) badKids.push(id)
  }
  ck('V7', '除被卸 3 个外：所有节点**自身字段**全等 ∧ 所有节点 children 列表 = 原列表减去被卸者（逐项按序）',
    badSelf.length === 0 && badKids.length === 0,
    '自身字段不一致 ' + badSelf.length + ' 个' + (badSelf.length ? '：' + badSelf.slice(0, 5).join(', ') : '') +
    ' · children 不一致 ' + badKids.length + ' 个' + (badKids.length ? '：' + badKids.slice(0, 5).join(', ') : '') +
    '（' + curNodes.size + ' 节点全查）')
}

// V8 其余边逐字节不变
{
  const bad = []
  for (const [id, e] of curEdgeById) {
    if (!snapEdgeById.has(id)) { bad.push(id + '(新增)'); continue }
    if (JSON.stringify(snapEdgeById.get(id)) !== JSON.stringify(e)) bad.push(id)
  }
  ck('V8', '除被删 3 条外，**所有边逐字节不变**', bad.length === 0,
    bad.length ? '不一致 ' + bad.length + ' 条：' + bad.slice(0, 5).join(', ') : '0 条不一致（' + curEdgeById.size + ' 边全等）')
}

// V9 池逐字节不变（最强断言）
{
  const same = snapRaw['node-pool.json'] === curRaw['node-pool.json']
  ck('V9', '**node-pool.json 逐字节零改动**（池实体保留）', same,
    same ? 'md5 相同 ' + md5(path.join(DATA, 'node-pool.json')).slice(0, 12) : '❌ 内容已变')
}

// V10 题库逐字节不变
{
  const same = snapRaw['questions.json'] === curRaw['questions.json']
  ck('V10', 'questions.json 逐字节零改动', same, same ? 'md5 相同' : '❌ 内容已变')
}

// V11 3 个池实体仍在，且正文/role 未变
{
  const refs = removedTreeIds.map((id) => snapNodes.get(id)?.node?.nodeRef).filter(Boolean)
  const bad = []
  for (const r of refs) {
    if (!curPool[r]) bad.push(r + '(缺失)')
    else if (JSON.stringify(snapPool[r]) !== JSON.stringify(curPool[r])) bad.push(r + '(内容变)')
  }
  ck('V11', '被卸节点的 3 个池实体均保留 ∧ 逐字节不变', refs.length === 3 && bad.length === 0,
    '反查 refs=' + refs.length + ' · 异常=' + (bad.length ? bad.join(', ') : '0'))
}

// V12 维度网格：**引用被卸 3 条的 atom** 3/3 可解析 ∧ 同网格其余 atom 未被波及
{
  const owners = new Set()
  for (const [, p] of Object.entries(curPool)) {
    for (const d of p?.viewDimensions || []) for (const s of d.sections || []) for (const a of s.atoms || []) {
      if (/^asplit_mysql_tool_/.test(a.nodeId)) owners.add(p.id)
    }
  }
  const batchAtoms = []      // 只统计指向被卸 3 条的 atom
  const otherAtoms = []      // 同网格里非本批的 atom
  for (const o of owners) {
    for (const d of curPool[o].viewDimensions || []) for (const s of d.sections || []) for (const a of s.atoms || []) {
      if (/^asplit_mysql_tool_/.test(a.nodeId)) batchAtoms.push({ atom: a.nodeId, ok: !!curPool[a.nodeId] })
      else otherAtoms.push({ atom: a.nodeId, ok: !!curPool[a.nodeId] })
    }
  }
  const okBatch = batchAtoms.filter((x) => x.ok).length
  const okOther = otherAtoms.filter((x) => x.ok).length
  ck('V12', 'viewDimensions 网格：引用被卸 3 条的 atom **3/3 可解析** ∧ 同网格其余 atom 亦未被波及',
    owners.size === 1 && okBatch === 3 && okOther === otherAtoms.length,
    '宿主 ' + [...owners].join(',') + ' · 本批 atom ' + okBatch + '/' + batchAtoms.length +
    ' · 同网格其它 atom ' + okOther + '/' + otherAtoms.length + ' [' + otherAtoms.map((x) => x.atom).join(', ') + ']')
}

// V13 atom 悬空全局 = 0
{
  const d = atomDangling(curPool)
  ck('V13', '全库 viewDimensions atom 悬空 = 0', d.length === 0, d.length ? JSON.stringify(d.slice(0, 3)) : '0')
}

// V14 tree 节点 nodeRef 悬空 = 0
{
  const d = refDangling(curTree, curPool)
  ck('V14', 'tree 节点 nodeRef 悬空 = 0', d.length === 0, d.length ? JSON.stringify(d.slice(0, 3)) : '0')
}

// V15 treebind 悬空：本批未新增（既有债口径）
{
  const a = analyzeTb(treeIdsOf(snapTree), snapEdges)
  const b = analyzeTb(treeIdsOf(curTree), curEdges)
  const neu = [...b.unresolved].filter((id) => !a.unresolved.has(id))
  ck('V15', '本批**未新增**未解析 treebind 边（既有债 ' + a.unresolved.size + ' 条不归本批）',
    neu.length === 0, '前 ' + a.unresolved.size + ' → 后 ' + b.unresolved.size + ' · 新增 ' + neu.length + (neu.length ? ' ' + neu.slice(0, 3).join(' | ') : ''))
}

// V16 数量核对
{
  const ok = count(curTree) === count(snapTree) - 3 && curEdges.length === snapEdges.length - 3 && Object.keys(curPool).length === Object.keys(snapPool).length
  ck('V16', '数量：树 −3 · 边 −3 · 池 ±0', ok,
    '树 ' + count(snapTree) + '→' + count(curTree) + ' · 边 ' + snapEdges.length + '→' + curEdges.length + ' · 池 ' + Object.keys(snapPool).length + '→' + Object.keys(curPool).length)
}

// V17 审计事件恰 +1，且覆盖全部 3 项、introducedNodes 为空
{
  const grew = curEvo.length === snapEvo.length + 1
  const neu = curEvo[curEvo.length - 1]
  const refs = removedTreeIds.map((id) => snapNodes.get(id)?.node?.nodeRef).filter(Boolean)
  const covers = refs.every((r) => JSON.stringify(neu).includes(r))
  const noIntro = Array.isArray(neu.introducedNodes) && neu.introducedNodes.length === 0
  ck('V17', '审计事件恰 +1 ∧ 覆盖全部 3 项 ∧ introducedNodes 为空',
    grew && covers && noIntro,
    '事件数 ' + snapEvo.length + '→' + curEvo.length + ' · 覆盖3项=' + covers + ' · introducedNodes=' + JSON.stringify(neu.introducedNodes))
}

// V18 末尾换行状态未漂移
{
  const t = (s) => s.endsWith('\n')
  const drift = FILES.filter((f) => t(snapRaw[f]) !== t(curRaw[f]))
  ck('V18', '五个文件的末尾换行状态均未漂移', drift.length === 0, drift.length ? '漂移：' + drift.join(', ') : '0 漂移')
}

// V19 只动了声明内的文件
{
  const changed = FILES.filter((f) => snapRaw[f] !== curRaw[f])
  const declared = ['tree-data.json', 'knowledge-edges.json', 'evolution-events.json']
  const extra = changed.filter((f) => !declared.includes(f))
  ck('V19', '**只动声明内的 3 个文件**（node-pool / questions 必须原样）', extra.length === 0,
    '实际变化：' + (changed.join(', ') || '无') + ' · 越界：' + (extra.join(', ') || '0'))
}

const pass = checks.filter((c) => c.ok).length
const verdict = checks.every((c) => c.ok) ? 'INDEPENDENT_VERIFY_PASS' : 'INDEPENDENT_VERIFY_FAIL'

const result = {
  generatedAt: new Date().toISOString(),
  batch: 't3-p0.1',
  snapshot: path.relative(ROOT, SNAP).replace(/\\/g, '/'),
  verdict,
  passed: pass,
  total: checks.length,
  reverseInferred: {
    removedTreeIds,
    removedEdgeIds,
    addedTreeIds,
    addedEdgeIds,
    method: '从快照 vs 工作树的**集合差**反推，不看 apply 脚本的声明。',
  },
  checks,
}
fs.writeFileSync(path.join(OUT, 't3-p0.1-independent-verification.json'), JSON.stringify(result, null, 2) + '\n', 'utf8')

const L = []
L.push('# T3-P0.1 独立验证（不 import apply 代码 · 从数据反推）')
L.push('')
L.push('> 快照：`' + result.snapshot + '` · 生成 ' + result.generatedAt)
L.push('> **判定：`' + verdict + '` —— ' + pass + '/' + checks.length + '**')
L.push('')
L.push('## 反推结果（不采信 apply 的自报）')
L.push('')
L.push('```json')
L.push(JSON.stringify(result.reverseInferred, null, 2))
L.push('```')
L.push('')
L.push('## 检查明细')
L.push('')
L.push('| # | 检查项 | 结果 | 实测 |')
L.push('|---|---|---|---|')
for (const c of checks) L.push('| ' + c.id + ' | ' + c.name + ' | ' + (c.ok ? '✅' : '❌') + ' | ' + c.detail + ' |')
fs.writeFileSync(path.join(OUT, 't3-p0.1-independent-verification.md'), L.join('\n') + '\n', 'utf8')

console.log('═══ T3-P0.1 独立验证 ═══')
console.log('快照：' + result.snapshot)
console.log('')
console.log('反推：移除树节点 ' + removedTreeIds.length + ' 个 · 移除边 ' + removedEdgeIds.length + ' 条 · 新增 ' + (addedTreeIds.length + addedEdgeIds.length) + ' 个')
removedTreeIds.forEach((id) => console.log('   − tree  ' + id))
removedEdgeIds.forEach((id) => console.log('   − edge  ' + id))
console.log('')
for (const c of checks) console.log('  ' + (c.ok ? '✅' : '❌') + ' ' + c.id.padEnd(5) + c.name)
console.log('')
console.log((verdict === 'INDEPENDENT_VERIFY_PASS' ? '✅' : '⛔') + ' ' + verdict + '  ' + pass + '/' + checks.length)
process.exit(verdict === 'INDEPENDENT_VERIFY_PASS' ? 0 : 1)
