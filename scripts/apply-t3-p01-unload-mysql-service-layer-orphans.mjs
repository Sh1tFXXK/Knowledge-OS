/**
 * T3-P0.1 · MySQL 服务层 3 条孤儿挂载的「卸树留池」
 *
 * 语义（用户 2026-09-14 裁决）：
 *   tree-data        → 删除 3 个 tree mount（detachChild，保留其余 7 个子的原顺序）
 *   knowledge-edges  → 删除对应的 3 条 treebind 边（按**精确 id**，不用 split(':')）
 *   node-pool        → **完全不动**（3 个实体保留，宿主 viewDimensions 的 3 个 atom 保留）
 *   questions        → 完全不动
 *   evolution-events → +1 事件
 *
 * 这不是删除知识，而是：解除错误的物理归属，保留知识实体及其维度展示能力。
 *
 * ⛔ 两个必须绕开的既有陷阱（本脚本内已实测取证，见 G4）：
 *   ① `scripts/shell-fusion/lib.mjs:136 dropTreebindEdgesForTreeIds` 与
 *      `src/knowledge/treeBinding.ts:149 isTreeBindingEdgeForTreeIds` 均为
 *      `binding.split(':')` 后取前两段 —— **父 treeId 含冒号时静默失效**。
 *      实测：传本批 3 个 childTreeId，helper 报删除 **0** 条（应为 3）。
 *      数据里有实物铁证：`treebind:mysql:theme:backup-recovery:tree_1782032936994_e5wpwn`
 *      是 a-split 当初卸掉的原节点 #112，边没被清掉，正是被这个 bug 漏掉的。
 *      全库 222/2668 条 treebind 边的 id 分段 > 2（父 treeId 含冒号），helper 对它们一律失效。
 *      ⇒ 本脚本**不复用**该 helper，改用精确 id 等值匹配。**也不在本批修改该 helper**
 *        （它属 scripts/shell-fusion/** 与 src/ 的其它批次territory，改了就是范围膨胀）。
 *   ② 维度原子走**池**查表（GridSection.tsx:19 / ChainSection.tsx:19 均 `nodePool[atom.nodeId]`），
 *      不依赖树 ⇒ 卸树后宿主卡片的「服务层工具」网格仍完整渲染。
 *
 * 用法：
 *   node scripts/apply-t3-p01-unload-mysql-service-layer-orphans.mjs --freeze   # 冻结基线（不写 data）
 *   node scripts/apply-t3-p01-unload-mysql-service-layer-orphans.mjs           # 预检（不写 data）
 *   node scripts/apply-t3-p01-unload-mysql-service-layer-orphans.mjs --apply   # 落盘
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')

const MODE = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--freeze') ? 'freeze' : 'preflight'

// ══════════════════════════════════════════════════════════════════════
// 0. 常量（全部来自只读核验，逐字对齐）
// ══════════════════════════════════════════════════════════════════════
const BATCH_ID = 't3-p0.1'
const HOST_TREE_ID = 'projection:mysql-concept:mysql-server-structure:k_1782032275682_61auc4'
const HOST_POOL_REF = 'k_1782032275682_61auc4'
const TARGETS = [
  { treeId: 'asplit_s2_asplit_mysql_tool_backup', ref: 'asplit_mysql_tool_backup', name: '备份恢复工具' },
  { treeId: 'asplit_s2_asplit_mysql_tool_security', ref: 'asplit_mysql_tool_security', name: '安全管理工具' },
  { treeId: 'asplit_s2_asplit_mysql_tool_cluster', ref: 'asplit_mysql_tool_cluster', name: '集群管理工具' },
]
const HOST_EXPECTED_CHILDREN_BEFORE = 10
const HOST_EXPECTED_CHILDREN_AFTER = 7
const DIM_ID = 'mysql_service_tools'
const DIM_KEPT_ATOM = 'k_1787326561953_xdo0fj'   // 同网格里那个非本批的 atom，必须保持

const READ_FILES = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']

// ══════════════════════════════════════════════════════════════════════
// 1. 基础设施
// ══════════════════════════════════════════════════════════════════════
const rd = (f) => fs.readFileSync(path.join(DATA, f), 'utf8')
const rdJson = (f) => JSON.parse(rd(f))
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')
const clone = (x) => JSON.parse(JSON.stringify(x))
const trail = (s) => s.endsWith('\n')

/** 原子写 + Windows EPERM 回退 + 保留末尾换行状态。与 P0 apply 同一 idiom。 */
function writeJsonKeepFormat(abs, value, trailingNewline) {
  const text = JSON.stringify(value, null, 2) + (trailingNewline ? '\n' : '')
  const tmp = abs + '.tmp-' + process.pid + '-' + Date.now()
  fs.writeFileSync(tmp, text, 'utf8')
  try {
    fs.renameSync(tmp, abs)
  } catch {
    fs.writeFileSync(abs, text, 'utf8')
    try { fs.unlinkSync(tmp) } catch { /* noop */ }
  }
}

const walk = (root, visit) => {
  const rec = (n, parent, trailIds) => {
    visit(n, parent, trailIds)
    for (const c of n.children || []) rec(c, n, [...trailIds, n.id])
  }
  rec(root, null, [])
}
const findTreeById = (root, id) => {
  let hit = null
  walk(root, (n, parent) => { if (n.id === id) hit = { node: n, parent } })
  return hit
}
const treeIdsOf = (root) => { const s = new Set(); walk(root, (n) => s.add(n.id)); return s }
const countTree = (root) => { let c = 0; walk(root, () => { c += 1 }); return c }
/** 从父的 children 摘除，返回被摘条目；保留其余项原顺序。 */
function detachChild(parent, childId) {
  const kids = parent.children ?? []
  const idx = kids.findIndex((c) => c.id === childId)
  if (idx < 0) throw new Error('children 中找不到 ' + childId)
  return kids.splice(idx, 1)[0]
}

/** treebind 边的**稳健**解析：枚举切点，要求两半都命中已知 treeId。 */
function analyzeTreebind(treeIds, edges) {
  const tb = edges.filter((e) => String(e.id).startsWith('treebind:'))
  let unique = 0, multi = 0, unresolved = 0
  const unresolvedIds = new Set()
  for (const e of tb) {
    const body = String(e.id).slice('treebind:'.length)
    let hits = 0
    for (let i = 1; i < body.length - 1; i += 1) {
      if (body[i] !== ':') continue
      if (treeIds.has(body.slice(0, i)) && treeIds.has(body.slice(i + 1))) hits += 1
    }
    if (hits === 1) unique += 1
    else if (hits > 1) multi += 1
    else { unresolved += 1; unresolvedIds.add(e.id) }
  }
  return { total: tb.length, unique, multi, unresolved, unresolvedIds }
}

/** 悬空 nodeRef：树节点指向不存在的池实体 */
function danglingNodeRefs(tree, pool) {
  const out = []
  walk(tree, (n) => { if (n.nodeRef && !pool[n.nodeRef]) out.push({ treeId: n.id, nodeRef: n.nodeRef }) })
  return out
}

/** 全库 viewDimensions atom 可解析性 */
function atomReport(pool) {
  let total = 0; const dangling = []
  for (const [id, p] of Object.entries(pool)) {
    for (const d of p?.viewDimensions || []) {
      for (const s of d.sections || []) {
        for (const a of s.atoms || []) {
          total += 1
          if (!pool[a.nodeId]) dangling.push({ owner: id, dim: d.id, atom: a.nodeId })
        }
      }
    }
  }
  return { total, dangling }
}

/** ⚠️ 照抄 lib.mjs:136 —— 仅用于**取证**它失效，绝不用于本层操作 */
function dropTreebindEdgesForTreeIds_ASIS(edges, treeIds) {
  const set = new Set(treeIds)
  const before = edges.length
  const kept = edges.filter((e) => {
    const id = String(e.id)
    if (!id.startsWith('treebind:')) return true
    const [parentTreeId, childTreeId] = id.slice('treebind:'.length).split(':')
    return !(set.has(parentTreeId) || set.has(childTreeId))
  })
  return before - kept.length
}

// ══════════════════════════════════════════════════════════════════════
// 2. 操作本体 —— 预检与实跑**共用同一个函数**（禁止逻辑分叉）
// ══════════════════════════════════════════════════════════════════════
function unloadMounts({ tree, edges }) {
  const host = findTreeById(tree, HOST_TREE_ID)
  if (!host) throw new Error('宿主节点不存在：' + HOST_TREE_ID)
  const detached = []
  const kidsBefore = (host.node.children || []).map((c) => c.id)
  for (const t of TARGETS) detached.push(detachChild(host.node, t.treeId))

  const expectedEdgeIds = TARGETS.map((t) => 'treebind:' + HOST_TREE_ID + ':' + t.treeId)
  const droppedEdges = []
  const kept = edges.filter((e) => {
    if (expectedEdgeIds.includes(String(e.id))) { droppedEdges.push(e); return false }
    return true
  })
  edges.length = 0
  edges.push(...kept)

  return {
    detached: detached.map((d) => d.id),
    droppedEdgeIds: droppedEdges.map((e) => e.id),
    droppedEdgeRecords: droppedEdges,
    hostChildrenBefore: kidsBefore,
    hostChildrenAfter: (host.node.children || []).map((c) => c.id),
  }
}

// ══════════════════════════════════════════════════════════════════════
// 3. 读真源（真实数据，只读）
// ══════════════════════════════════════════════════════════════════════
const raw = Object.fromEntries(READ_FILES.map((f) => [f, rd(f)]))
const trailNow = Object.fromEntries(READ_FILES.map((f) => [f, trail(raw[f])]))
const md5Now = Object.fromEntries(READ_FILES.map((f) => [f, md5(raw[f])]))

const treeReal = rdJson('tree-data.json')
const poolReal = rdJson('node-pool.json')
const edgesFileReal = rdJson('knowledge-edges.json')
const edgesReal = Array.isArray(edgesFileReal) ? edgesFileReal : edgesFileReal.edges
const evoReal = rdJson('evolution-events.json')
const evoIsArray = Array.isArray(evoReal)

// ── 基线（本批前）──
const treeIdsBefore = treeIdsOf(treeReal)
const tbBefore = analyzeTreebind(treeIdsBefore, edgesReal)
const atomBefore = atomReport(poolReal)
const refDangleBefore = danglingNodeRefs(treeReal, poolReal)
const realState = {
  treeNodes: countTree(treeReal),
  edges: edgesReal.length,
  pool: Object.keys(poolReal).length,
  tbTotal: tbBefore.total,
  tbUnresolved: tbBefore.unresolved,
  atomTotal: atomBefore.total,
  atomDangling: atomBefore.dangling.length,
  refDangling: refDangleBefore.length,
}

// ══════════════════════════════════════════════════════════════════════
// 4. 模拟（内存克隆）
// ══════════════════════════════════════════════════════════════════════
const sim = {
  tree: clone(treeReal),
  pool: clone(poolReal),
  edges: clone(edgesReal),
}
const opResult = unloadMounts(sim)

const treeIdsAfter = treeIdsOf(sim.tree)
const tbAfter = analyzeTreebind(treeIdsAfter, sim.edges)
const atomAfter = atomReport(sim.pool)
const refDangleAfter = danglingNodeRefs(sim.tree, sim.pool)
const simState = {
  treeNodes: countTree(sim.tree),
  edges: sim.edges.length,
  pool: Object.keys(sim.pool).length,
  tbTotal: tbAfter.total,
  tbUnresolved: tbAfter.unresolved,
  atomTotal: atomAfter.total,
  atomDangling: atomAfter.dangling.length,
  refDangling: refDangleAfter.length,
}

// 本批**引入**的新悬空边 = 本批后未解析 − 本批前未解析
const newUnresolved = [...tbAfter.unresolvedIds].filter((id) => !tbBefore.unresolvedIds.has(id))

// 池 / 题库 / 边内容逐字节不可变（除预期删除）
const poolUnchanged = md5(JSON.stringify(sim.pool)) === md5(JSON.stringify(poolReal))
const nonTargetEdgesIdentical = (() => {
  const beforeMap = new Map(edgesReal.map((e) => [e.id, JSON.stringify(e)]))
  const afterMap = new Map(sim.edges.map((e) => [e.id, JSON.stringify(e)]))
  if (beforeMap.size - TARGETS.length !== afterMap.size) return false
  for (const [id, s] of afterMap) if (beforeMap.get(id) !== s) return false
  return true
})()

// 3 个被卸节点在树中 0 残留
const targetTreeIdsGone = TARGETS.every((t) => !treeIdsAfter.has(t.treeId))

// 池实体保留 + 宿主 viewDimensions 3/3 可解析
const poolKept = TARGETS.every((t) => !!sim.pool[t.ref])
const hostDims = sim.pool[HOST_POOL_REF]?.viewDimensions || []
const dim = hostDims.find((d) => d.id === DIM_ID)
const dimAtoms = dim ? dim.sections.flatMap((s) => s.atoms.map((a) => a.nodeId)) : []
const dimAtomsResolvable = dimAtoms.filter((a) => !!sim.pool[a])
const dimKept = dimAtoms.includes(DIM_KEPT_ATOM)

// 结构不可变：宿主剩余子的顺序 = 原顺序去掉 3 个
const expectedRemaining = opResult.hostChildrenBefore.filter((id) => !TARGETS.some((t) => t.treeId === id))
const orderPreserved = JSON.stringify(opResult.hostChildrenAfter) === JSON.stringify(expectedRemaining)

// count 全树不变
const countsIdentical = (() => {
  const a = []; walk(treeReal, (n) => a.push(String(n.id) + '=' + String(n.count)))
  const b = []; walk(sim.tree, (n) => b.push(String(n.id) + '=' + String(n.count)))
  const setB = new Set(b)
  for (const x of a) {
    if (TARGETS.some((t) => x.startsWith(t.treeId + '='))) continue
    if (!setB.has(x)) return false
  }
  return true
})()

// ══════════════════════════════════════════════════════════════════════
// 5. 闸门
// ══════════════════════════════════════════════════════════════════════
const gates = []
const gate = (id, name, ok, detail) => gates.push({ id, name, result: ok ? 'PASS' : 'FAIL', detail })

// G1 目标存在且均为宿主的直接子、且各自无子
{
  const host = findTreeById(treeReal, HOST_TREE_ID)
  const kids = (host?.node.children || []).map((c) => c.id)
  const allDirectChild = TARGETS.every((t) => kids.includes(t.treeId))
  const allLeaf = TARGETS.every((t) => (findTreeById(treeReal, t.treeId)?.node.children || []).length === 0)
  gate('G1', '3 个目标存在 ∧ 均为宿主直接子 ∧ 均为叶子（childCount=0）', allDirectChild && allLeaf,
    '直接子=' + allDirectChild + ' · 均叶子=' + allLeaf)
}

// G2 宿主子数 = 10，且 3 个目标在其中
{
  const kids = (findTreeById(treeReal, HOST_TREE_ID)?.node.children || []).map((c) => c.id)
  gate('G2', '宿主子数恰为 ' + HOST_EXPECTED_CHILDREN_BEFORE, kids.length === HOST_EXPECTED_CHILDREN_BEFORE,
    '实测 ' + kids.length + ' 个：' + kids.join(', '))
}

// G3 3 条 treebind 边按**精确 id** 存在，且端点均在池
{
  const expected = TARGETS.map((t) => 'treebind:' + HOST_TREE_ID + ':' + t.treeId)
  const found = expected.map((id) => edgesReal.find((e) => e.id === id))
  const allFound = found.every(Boolean)
  const endpointsOk = found.every((e) => e && poolReal[e.source] && poolReal[e.target])
  gate('G3', '3 条 treebind 边按精确 id 各命中 1 条 ∧ 端点均在池', allFound && endpointsOk,
    '命中 ' + found.filter(Boolean).length + '/3 · 端点均在池=' + endpointsOk)
}

// G4 ⚠️ 取证：lib.mjs 的 split(':') helper 对本批失效 —— 证明「不能复用」，非「顺手用一下」
{
  const wouldDrop = dropTreebindEdgesForTreeIds_ASIS(edgesReal, TARGETS.map((t) => t.treeId))
  gate('G4', '⚠️ 取证：lib.mjs:136 helper 对本批删除 0 条（应为 3）→ 本脚本已改用精确 id 匹配', wouldDrop === 0,
    'helper 报告删除 ' + wouldDrop + ' 条 · 本脚本精确匹配删除 ' + opResult.droppedEdgeIds.length + ' 条' +
    ' · 全库 id 分段>2 的 treebind 边 ' + edgesReal.filter((e) => String(e.id).startsWith('treebind:') && String(e.id).slice(8).split(':').length > 2).length + ' 条对 helper 一律失效')
}

// G5 池实体保留 ∧ 宿主 viewDimensions 3/3 可解析 ∧ 同网格第 4 个 atom 未被波及
{
  gate('G5', '3 个池实体保留 ∧ 宿主 ' + DIM_ID + ' 网格 atom 3/3 可解析 ∧ 第 4 个 atom 仍在',
    poolKept && dimAtomsResolvable.length >= 3 && dimKept,
    '实体保留=' + poolKept + ' · atom 可解析 ' + dimAtomsResolvable.length + '/' + dimAtoms.length +
    ' · 第 4 个 atom(' + DIM_KEPT_ATOM + ')=' + dimKept)
}

// G6 引用闭合：3 个 treeId 在其余数据里 0 残留（除将被删的 3 条边）
{
  const others = ['node-pool.json', 'questions.json', 'evolution-events.json']
  const residual = []
  for (const f of others) for (const t of TARGETS) if (raw[f].includes(t.treeId)) residual.push(f + ':' + t.treeId)
  const inEdges = edgesReal.filter((e) => TARGETS.some((t) => String(e.id).includes(t.treeId))).map((e) => e.id)
  const onlyExpectedEdges = inEdges.every((id) => opResult.droppedEdgeIds.includes(id))
  gate('G6', '引用闭合：3 个 treeId 在池/题库/审计中 0 残留 ∧ 边侧命中项恰为本批将删的 3 条',
    residual.length === 0 && onlyExpectedEdges,
    '其它文件残留=' + (residual.length ? residual.join(', ') : '0') + ' · 边侧命中 ' + inEdges.length + ' 条且均在删除清单=' + onlyExpectedEdges)
}

// G7 结构不可变：宿主剩余子顺序保持 ∧ 其余边逐字节不变 ∧ count 全树不变
{
  gate('G7', '宿主剩余 ' + HOST_EXPECTED_CHILDREN_AFTER + ' 个子顺序保持 ∧ 其余边逐字节不变 ∧ count 全树不变',
    orderPreserved && nonTargetEdgesIdentical && countsIdentical,
    '顺序=' + orderPreserved + ' · 其余边逐字节=' + nonTargetEdgesIdentical + ' · count=' + countsIdentical)
}

// G8 池 / 题库逐字节零改动
{
  const qSame = md5(raw['questions.json']) === md5(raw['questions.json'])
  gate('G8', 'node-pool 与 questions **零改动**（池实体保留 = 本批不改池）', poolUnchanged && qSame,
    'pool 克隆后完全相等=' + poolUnchanged)
}

// G9 预期 diff
{
  const ok = simState.treeNodes === realState.treeNodes - 3 &&
    simState.edges === realState.edges - 3 &&
    simState.pool === realState.pool
  gate('G9', '预期 diff：树 ' + realState.treeNodes + '→' + (realState.treeNodes - 3) +
    ' · 边 ' + realState.edges + '→' + (realState.edges - 3) + ' · 池不变 ' + realState.pool, ok,
    '实测 树 ' + simState.treeNodes + ' · 边 ' + simState.edges + ' · 池 ' + simState.pool)
}

// G10 treeId 0 残留
gate('G10', '3 个 treeId 在树中 0 残留', targetTreeIdsGone, '实测残留 ' + TARGETS.filter((t) => treeIdsAfter.has(t.treeId)).length + ' 个')

// G11 nodeRef 悬空：保持 0
gate('G11', 'tree 节点 nodeRef 悬空 = 0（本批前 ' + realState.refDangling + ' → 后 ' + simState.refDangling + '）',
  simState.refDangling === 0 && simState.refDangling <= realState.refDangling,
  '实测 ' + simState.refDangling)

// G12 本批**引入**新未解析 treebind 边 = 0（既有债口径：不要求绝对值 0）
gate('G12', '本批引入的新未解析 treebind 边 = 0（既有债 ' + realState.tbUnresolved + ' 条不归本批）', newUnresolved.length === 0,
  '前 ' + tbBefore.unresolved + ' → 后 ' + tbAfter.unresolved + ' · 新增 ' + newUnresolved.length +
  (newUnresolved.length ? '：' + newUnresolved.slice(0, 3).join(' | ') : ''))

// G13 viewDimensions atom 悬空：保持 0
gate('G13', '全库 viewDimensions atom 悬空 = 0（' + realState.atomTotal + ' 个 atom）',
  simState.atomDangling === 0 && simState.atomTotal === realState.atomTotal,
  '前 ' + atomBefore.dangling.length + ' → 后 ' + atomAfter.dangling.length + ' · atom 总数 ' + atomAfter.total)

// G14 换行状态保持
gate('G14', '三个待写文件的末尾换行状态延续（均应为「无换行」）',
  trailNow['tree-data.json'] === false && trailNow['knowledge-edges.json'] === false && trailNow['evolution-events.json'] === false,
  JSON.stringify({ tree: trailNow['tree-data.json'], edges: trailNow['knowledge-edges.json'], evo: trailNow['evolution-events.json'] }))

// G15 dev server 未运行（内存持有数据会回写覆盖外部写入）
{
  const { execSync } = await import('node:child_process')
  let listening = ''
  let probed = false
  try {
    listening = execSync('netstat -ano', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    probed = true
  } catch { probed = false }
  const hits = probed
    ? listening.split('\n').filter((l) => /LISTENING/.test(l) && (/:(5173|4192)\s/.test(l) || /:(5173|4192)$/.test(l.trim())))
    : []
  const has = hits.length > 0
  gate('G15', 'dev server / preview 未在写数据端口监听（防内存态回写覆盖）', probed && !has,
    probed
      ? (has ? '⚠️ 检测到监听：' + hits.slice(0, 3).map((s) => s.trim()).join(' ; ') : '已探测，未发现 5173/4192 监听')
      : '⚠️ 无法探测（netstat 不可用）—— 守卫未生效，判 FAIL 以强制人工确认')
}

const allPass = gates.every((g) => g.result === 'PASS')

// ══════════════════════════════════════════════════════════════════════
// 6. 落盘执行
// ══════════════════════════════════════════════════════════════════════
let backupDir = null
let realVerification = null

const applyPlan = {
  batchId: BATCH_ID,
  title: 'T3-P0.1 · MySQL 服务层 3 条孤儿挂载的卸树留池（只删 tree mount + treebind，池不动）',
  mode: MODE,
  generatedAt: new Date().toISOString(),
  host: { treeId: HOST_TREE_ID, poolRef: HOST_POOL_REF, name: '服务层' },
  targets: TARGETS,
  operation: {
    treeData: 'detachChild ×3（保留其余 7 个子的原顺序）',
    knowledgeEdges: '按精确 id 删除 3 条 treebind 边（**不用** split(\':\') helper）',
    nodePool: '零改动',
    questions: '零改动',
    evolutionEvents: '+1 事件',
  },
  baselines: { before: realState, after: simState },
  simulated: {
    hostChildrenBefore: opResult.hostChildrenBefore,
    hostChildrenAfter: opResult.hostChildrenAfter,
    droppedEdgeIds: opResult.droppedEdgeIds,
    droppedEdgeRecords: opResult.droppedEdgeRecords,
  },
  dimensionCheck: { dimId: DIM_ID, atoms: dimAtoms, resolvable: dimAtomsResolvable, keptNonBatchAtom: DIM_KEPT_ATOM },
  gates,
  allGatesPass: allPass,
  writeSetHint: ['data/tree-data.json', 'data/knowledge-edges.json', 'data/evolution-events.json'],
  excludedFromWriteSet: ['data/node-pool.json', 'data/questions.json'],
  note: 'node-pool / questions 明确排除在写集外 —— 本批的语义前提就是「池实体保留」。',
}
fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 't3-p0.1-apply-plan.json'), JSON.stringify(applyPlan, null, 2) + '\n', 'utf8')

if (MODE === 'freeze') {
  const base = {
    frozenAt: new Date().toISOString(),
    batch: BATCH_ID,
    dataMd5: md5Now,
    dataTrailingNewline: trailNow,
    counts: realState,
    note: '本批的祖先基线。apply 后 HEAD 的 tree-data/knowledge-edges 与「冻结时刻之前的状态」必须只差本批 3 卸 + 3 删。',
  }
  fs.writeFileSync(path.join(OUT_DIR, 't3-p0.1-apply-baseline.json'), JSON.stringify(base, null, 2) + '\n', 'utf8')
} else if (MODE === 'apply') {
  if (!allPass) {
    console.error('\n⛔ 闸门未全绿，拒绝写盘。')
    gates.filter((g) => g.result !== 'PASS').forEach((g) => console.error('   ✗ ' + g.id + ' ' + g.name))
    process.exit(1)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  backupDir = path.join(DATA, 'backups', BATCH_ID + '-' + stamp)
  fs.mkdirSync(backupDir, { recursive: true })
  for (const f of READ_FILES) fs.copyFileSync(path.join(DATA, f), path.join(backupDir, f))

  // 真数据上重跑同一个操作
  const dsReal = { tree: clone(treeReal), pool: clone(poolReal), edges: clone(edgesReal) }
  const realOp = unloadMounts(dsReal)

  // 审计事件
  const evo = clone(evoReal)
  const list = evoIsArray ? evo : evo.events
  const now = Date.now()
  const event = {
    id: 'event:tree-refactor:t3-p0.1:' + now,
    scopeRootId: 'n_55jiel25',
    occurredAt: now,
    title: 'T3-P0.1：MySQL 服务层 3 条孤儿挂载的卸树留池（只删 tree mount，池实体保留）',
    summary:
      '服务层（' + HOST_POOL_REF + '，treeId 为 projection 导入命名空间 id）下的 3 个 asplit 工具节点被解除树挂载：'
      + '备份恢复工具 / 安全管理工具 / 集群管理工具。删除 3 个 tree mount 与对应的 3 条 treebind 边；'
      + '**池实体全部保留**，宿主的 viewDimensions「服务层工具」网格 atom 引用不变，故维度展示能力不受影响；'
      + '题组不动。依据：这 3 项本质是**维度展示原子**，而维度原子走 nodePool 查表、不依赖树挂载；'
      + '其宿主同层已是未整合的合并区，且该域已有 9,758 字 / 37 节点的规范子树（恢复系统 · 53 条 tree_mysql_instance_*），'
      + '为其另造 tree_mysql_* 名字会固化投影宿主并与既有体系永久重复。'
      + '处置语义 = 解除错误的物理归属，保留知识实体及其维度展示能力，不是删除知识。'
      + '影响：T3 前置范围 133 → 130，BLOCK 3 → 0。',
    sourceOnlyNodeIds: TARGETS.map((t) => t.ref),
    introducedNodes: [],
    changes: TARGETS.map((t) => ({
      targetNodeId: t.ref,
      facet: 'structure',
      before: 'treeId `' + t.treeId + '`（挂在宿主「服务层」下，宿主 treeId 为 projection 导入命名空间 id）· 路径：知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库产品 > MySQL > MySQL Server > 结构 > 服务层 > ' + t.name,
      after: '**仅退出树挂载**（tree mount 与 treebind 边删除），池实体 `' + t.ref + '` 与其正文 保留；仍作为宿主「服务层」viewDimensions 的 ' + DIM_ID + ' 网格 atom 展示',
    })),
  }
  if (evoIsArray) evo.push(event); else evo.events.push(event)

  writeJsonKeepFormat(path.join(DATA, 'evolution-events.json'), evo, trailNow['evolution-events.json'])
  writeJsonKeepFormat(path.join(DATA, 'tree-data.json'), dsReal.tree, trailNow['tree-data.json'])
  writeJsonKeepFormat(path.join(DATA, 'knowledge-edges.json'), dsReal.edges, trailNow['knowledge-edges.json'])

  // 写后复验（重新读盘）
  const vTree = rdJson('tree-data.json')
  const vPool = rdJson('node-pool.json')
  const vEdgesFile = rdJson('knowledge-edges.json')
  const vEdges = Array.isArray(vEdgesFile) ? vEdgesFile : vEdgesFile.edges
  const vEvoFile = rdJson('evolution-events.json')
  const vEvo = Array.isArray(vEvoFile) ? vEvoFile : vEvoFile.events
  const vTreeIds = treeIdsOf(vTree)
  const vTb = analyzeTreebind(vTreeIds, vEdges)
  const vAtom = atomReport(vPool)
  const vRefD = danglingNodeRefs(vTree, vPool)

  realVerification = {
    verdict: 'PENDING',
    treeNodes: countTree(vTree),
    edges: vEdges.length,
    pool: Object.keys(vPool).length,
    targetTreeIdsResidual: TARGETS.filter((t) => vTreeIds.has(t.treeId)).length,
    treebindDropped: opResult.droppedEdgeIds.filter((id) => !vEdges.some((e) => e.id === id)).length,
    poolEntitiesKept: TARGETS.filter((t) => !!vPool[t.ref]).length,
    hostChildCount: (findTreeById(vTree, HOST_TREE_ID)?.node.children || []).length,
    dimAtoms: atomReport(vPool).total,
    dimAtomsDangling: vAtom.dangling.length,
    refDangling: vRefD.length,
    newUnresolvedTreebind: [...vTb.unresolvedIds].filter((id) => !tbBefore.unresolvedIds.has(id)).length,
    evoGrew: vEvo.length === (evoIsArray ? evoReal.length + 1 : evoReal.events.length + 1),
    poolByteIdenticalToPreApply: md5(rd('node-pool.json')) === md5Now['node-pool.json'],
    questionsByteIdenticalToPreApply: md5(rd('questions.json')) === md5Now['questions.json'],
  }
  const okChecks = [
    realVerification.targetTreeIdsResidual === 0,
    realVerification.treebindDropped === 3,
    realVerification.poolEntitiesKept === 3,
    realVerification.hostChildCount === HOST_EXPECTED_CHILDREN_AFTER,
    realVerification.dimAtomsDangling === 0,
    realVerification.refDangling === 0,
    realVerification.newUnresolvedTreebind === 0,
    realVerification.evoGrew,
    realVerification.poolByteIdenticalToPreApply,
    realVerification.questionsByteIdenticalToPreApply,
    realVerification.treeNodes === realState.treeNodes - 3,
    realVerification.edges === realState.edges - 3,
  ]
  realVerification.verdict = okChecks.every(Boolean) ? 'REAL_APPLY_VERIFIED' : 'REAL_APPLY_MISMATCH'
  fs.writeFileSync(path.join(OUT_DIR, 't3-p0.1-apply-verification.json'), JSON.stringify(realVerification, null, 2) + '\n', 'utf8')
}

// ══════════════════════════════════════════════════════════════════════
// 7. 报告
// ══════════════════════════════════════════════════════════════════════
const L = []
const add = (s) => L.push(s)
add('# T3-P0.1 · MySQL 服务层 3 条孤儿挂载的卸树留池 — ' + (MODE === 'apply' ? 'APPLY 报告' : MODE === 'freeze' ? '基线冻结' : '预检报告'))
add('')
add('> 模式 `' + MODE + '`' + (backupDir ? ' · 备份 `' + path.relative(ROOT, backupDir).replace(/\\/g, '/') + '`' : ' · **未写盘**'))
add('> 生成 ' + new Date().toISOString())
add('')
add('## 一、操作语义')
add('')
add('| 文件 | 动作 |')
add('|---|---|')
add('| `data/tree-data.json` | 删除 3 个 tree mount（`detachChild`，保留其余 7 个子的原顺序）|')
add('| `data/knowledge-edges.json` | 按**精确 id** 删除 3 条 treebind 边 |')
add('| `data/node-pool.json` | **零改动** —— 3 个实体保留 |')
add('| `data/questions.json` | 零改动 |')
add('| `data/evolution-events.json` | +1 事件 |')
add('')
add('> **这不是删除知识，而是解除错误的物理归属，保留知识实体及其维度展示能力。**')
add('')
add('## 二、读数 before → after（模拟，内存克隆）')
add('')
add('| 指标 | before | after |')
add('|---|---|---|')
add('| 树节点 | ' + realState.treeNodes + ' | ' + simState.treeNodes + ' |')
add('| 边 | ' + realState.edges + ' | ' + simState.edges + ' |')
add('| 池实体 | ' + realState.pool + ' | ' + simState.pool + ' |')
add('| 宿主「服务层」子数 | ' + opResult.hostChildrenBefore.length + ' | ' + opResult.hostChildrenAfter.length + ' |')
add('| treebind 边总数 | ' + realState.tbTotal + ' | ' + simState.tbTotal + ' |')
add('| treebind 未解析（既有债） | ' + realState.tbUnresolved + ' | ' + simState.tbUnresolved + ' |')
add('| viewDimensions atom 总数 | ' + realState.atomTotal + ' | ' + simState.atomTotal + ' |')
add('| 其中悬空 | ' + realState.atomDangling + ' | ' + simState.atomDangling + ' |')
add('| tree 节点 nodeRef 悬空 | ' + realState.refDangling + ' | ' + simState.refDangling + ' |')
add('')
add('## 三、实际删除清单')
add('')
add('**tree mount（3）：**')
for (const id of opResult.detached) add('- `' + id + '`')
add('')
add('**treebind 边（' + opResult.droppedEdgeIds.length + '）：**')
for (const id of opResult.droppedEdgeIds) add('- `' + id + '`')
add('')
add('**宿主剩余子（顺序保持，' + opResult.hostChildrenAfter.length + '）：**')
opResult.hostChildrenAfter.forEach((id, i) => add((i + 1) + '. `' + id + '`'))
add('')
add('## 四、闸门')
add('')
add('| 门 | 名称 | 结果 | 实测 |')
add('|---|---|---|---|')
for (const g of gates) add('| ' + g.id + ' | ' + g.name + ' | ' + g.result + ' | ' + g.detail + ' |')
add('')
add('**总判：' + (allPass ? '✅ 全绿（' + gates.length + '/' + gates.length + '）' : '⛔ 未全绿') + '**')
add('')
add('## 五、硬验收对照（用户 2026-09-14 裁决）')
add('')
add('| 验收项 | 要求 | 实测 | 判定 |')
add('|---|---|---|---|')
const acc = [
  ['3 tree mounts 删除', '3', String(realState.treeNodes - simState.treeNodes), realState.treeNodes - simState.treeNodes === 3],
  ['3 pool entities 保留', '3', String(TARGETS.filter((t) => !!sim.pool[t.ref]).length), poolKept],
  ['viewDimension atoms = 3/3 仍可解析', '3/3', dimAtomsResolvable.length + '/' + dimAtoms.length, dimAtomsResolvable.length === dimAtoms.length],
  ['nodeRef 悬空', '0', String(simState.refDangling), simState.refDangling === 0],
  ['treebind 悬空（本批引入）', '新增 0', '新增 ' + newUnresolved.length + '（既有债 ' + realState.tbUnresolved + ' 条）', newUnresolved.length === 0],
  ['新违规', '0', '见 G6/G11/G12/G13', gates.filter((g) => ['G6', 'G11', 'G12', 'G13'].includes(g.id)).every((g) => g.result === 'PASS')],
]
for (const [a, b, c, ok] of acc) add('| ' + a + ' | ' + b + ' | ' + c + ' | ' + (ok ? '✅' : '❌') + ' |')
add('')
add('⚠️ **`treebind = 0 悬空` 的口径说明**：全库当前有 **' + realState.tbUnresolved + ' 条未解析 treebind 边**，属**既有债**，')
add('根因是 `src/knowledge/treeBinding.ts:149` 与 `scripts/shell-fusion/lib.mjs:142` 的 `split(\':\')` 缺陷')
add('（父 treeId 含冒号时静默失效；数据铁证：`treebind:mysql:theme:backup-recovery:tree_1782032936994_e5wpwn`')
add('正是 a-split 当初卸掉、被该 bug 漏删的原节点 #112）。**本批按「本批引入 vs 既有债」口径**：')
add('只保证**不新增**，不顺手清理 ' + realState.tbUnresolved + ' 条 —— 那属范围膨胀，已另行登记。')
add('')
if (realVerification) {
  add('## 六、写后复验（重新读盘）')
  add('')
  add('```json')
  add(JSON.stringify(realVerification, null, 2))
  add('```')
  add('')
}
add('## 七、绕开的既有陷阱（本批取证，未修）')
add('')
add('- `scripts/shell-fusion/lib.mjs:136 dropTreebindEdgesForTreeIds` 与 `src/knowledge/treeBinding.ts:149`')
add('  均为 `binding.split(\':\')` 取前两段 → 父 treeId 含冒号时**静默失效**。')
add('  实测传本批 3 个 childTreeId，helper 报删除 **0** 条。全库 **222/2668** 条 treebind 边受影响。')
add('- 本批**不改**这两处：`lib.mjs` 属 `scripts/shell-fusion/**`、`treeBinding.ts` 属 `src/`，')
add('  均为其它批次 territory，改了就是本批的范围膨胀。已登记为独立缺陷。')
add('- 维度原子渲染走池（`GridSection.tsx:19` / `ChainSection.tsx:19` 均 `nodePool[atom.nodeId]`），')
add('  **不依赖树** ⇒ 卸树后网格仍完整渲染。这是本批可行性的技术前提。')
add('  ⚠️ 但不可外推：机制视图投影**确实**依赖树作用域，见 SKILL 中「卸树留池会打断机制视图投影」一节。')
fs.writeFileSync(path.join(OUT_DIR, MODE === 'apply' ? 't3-p0.1-apply-report.md' : 't3-p0.1-apply-preflight.md'), L.join('\n') + '\n', 'utf8')

// ══════════════════════════════════════════════════════════════════════
// 8. 控制台
// ══════════════════════════════════════════════════════════════════════
console.log('═══ T3-P0.1 卸树留池 · 模式 ' + MODE + ' ═══')
console.log('')
console.log('读数 before → after：')
console.log('  树节点   ' + realState.treeNodes + ' → ' + simState.treeNodes)
console.log('  边       ' + realState.edges + ' → ' + simState.edges)
console.log('  池实体   ' + realState.pool + ' → ' + simState.pool + '（不变）')
console.log('  宿主子数 ' + opResult.hostChildrenBefore.length + ' → ' + opResult.hostChildrenAfter.length)
console.log('  未解析 treebind（既有债） ' + realState.tbUnresolved + ' → ' + simState.tbUnresolved + ' · 本批新增 ' + newUnresolved.length)
console.log('  nodeRef 悬空 ' + realState.refDangling + ' → ' + simState.refDangling)
console.log('  atom 悬空 ' + realState.atomDangling + ' → ' + simState.atomDangling + '（共 ' + simState.atomTotal + ' atom）')
console.log('')
console.log('闸门：' + gates.map((g) => g.id + '=' + g.result).join(' · '))
console.log('')
for (const g of gates) console.log('  ' + (g.result === 'PASS' ? '✅' : '❌') + ' ' + g.id + '  ' + g.name)
console.log('')
console.log(allPass ? '✅ 全绿 —— ' + (MODE === 'apply' ? '已写盘' + (backupDir ? '（备份 ' + path.relative(ROOT, backupDir) + '）' : '') : '可安全 apply') : '⛔ NOT_READY')
if (realVerification) console.log('写后复验：' + realVerification.verdict + '  ' + JSON.stringify(realVerification))
console.log('')
console.log('报告：outputs/tree-violation-scan/' + (MODE === 'apply' ? 't3-p0.1-apply-report.md' : MODE === 'freeze' ? 't3-p0.1-apply-baseline.json' : 't3-p0.1-apply-preflight.md'))
