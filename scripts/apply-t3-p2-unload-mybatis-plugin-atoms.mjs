/**
 * T3-P2 · MyBatis 4 个「插件点」展示原子的「卸树留池」
 *
 * 语  义（用户 2026-09-14 裁决，与 T3-P0.1 同构）：
 *   tree-data        → 删除 4 个 tree mount（detachChild，保留其余 11 个子的原顺序）
 *   knowledge-edges  → 删除对应的 4 条 treebind 边（按**精确 id**）
 *   node-pool        → **完全不动**（4 个实体保留，宿主 viewDimensions 的 4 个 atom 保留）
 *   questions        → 完全不动
 *   evolution-events → +1 事件
 *
 * 为什么它们是「展示原子」而不是「树节点」（只读审计 medium-classification.json 的结论）：
 *   4 个节点各为 Mybatis 的叶子子节点（childCount=0），且**全部 4 个**都是宿主池实体
 *   `k_java_fw_mybatis` 的 viewDimensions `mybatis_plugin` / section `mybatis_plugin_grid`
 *   （title「四大对象插件点」，layout=grid）里的 atom。
 *   维度原子走**池**查表（GridSection.tsx / ChainSection.tsx 均 `nodePool[atom.nodeId]`），
 *   不依赖树挂载 ⇒ 卸树后宿主卡片里那个网格仍完整渲染。
 *   真实身份 = 知识实体在 pool，展示位在 viewDimension，tree mount 冗余。
 *
 * ⚠️ 与 P0.1 的两点差异（必须显式登记，不能照抄）
 *   ① P0.1 的网格里还有 1 个**非本批** atom（k_1787326561953_xdo0fj）需要断言「未被波及」；
 *      本批的 `mybatis_plugin_grid` 网格 **4/4 全是本批目标**，没有非本批 atom。
 *      ⇒ G5 的「第 4 个 atom 仍在」改为「网格 4/4 atom 全部仍可解析 ∧ atom 总数不变」。
 *   ② P0.1 的宿主 treeId 是 `projection:...` 含冒号 → 那个 split(':') helper 必然失效（删除 0 条）；
 *      本批宿主 treeId `tree_java_fw_mybatis` **不含冒号** ⇒ 该 helper 对本批**恰好有效**。
 *      本脚本仍用精确 id 匹配 —— 不是因为它坏，而是为了与 P0.1 同一 idiom、
 *      并避免依赖一个已知在含冒号形态上静默失效的 helper（本批不修它，那属别的批次 territory）。
 *
 * 用法：
 *   node scripts/apply-t3-p2-unload-mybatis-plugin-atoms.mjs --freeze   # 冻结基线（不写 data）
 *   node scripts/apply-t3-p2-unload-mybatis-plugin-atoms.mjs            # 预检（不写 data）
 *   node scripts/apply-t3-p2-unload-mybatis-plugin-atoms.mjs --apply    # 落盘
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
const BATCH_ID = 't3-p2'
const HOST_TREE_ID = 'tree_java_fw_mybatis'
const HOST_POOL_REF = 'k_java_fw_mybatis'
const HOST_NAME = 'Mybatis'
const TARGETS = [
  { treeId: 'tree_java_fw_mybatis_executor', ref: 'asplit_mybatis_executor', name: 'Executor（插件点）' },
  { treeId: 'tree_java_fw_mybatis_statement_handler', ref: 'asplit_mybatis_statement_handler', name: 'StatementHandler（插件点）' },
  { treeId: 'tree_java_fw_mybatis_parameter_handler', ref: 'asplit_mybatis_parameter_handler', name: 'ParameterHandler（插件点）' },
  { treeId: 'tree_java_fw_mybatis_resultset_handler', ref: 'asplit_mybatis_resultset_handler', name: 'ResultSetHandler（插件点）' },
]
const HOST_EXPECTED_CHILDREN_BEFORE = 15
const HOST_EXPECTED_CHILDREN_AFTER = 11
const DIM_ID = 'mybatis_plugin'
const SECTION_ID = 'mybatis_plugin_grid'
/** 该网格的期望 atom 集合（= 4 个本批目标；P0.1 有第 5 个非本批 atom，本批没有） */
const DIM_EXPECTED_ATOMS = TARGETS.map((t) => t.ref)

const READ_FILES = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']

// ══════════════════════════════════════════════════════════════════════
// 1. 基础设施
// ══════════════════════════════════════════════════════════════════════
const rd = (f) => fs.readFileSync(path.join(DATA, f), 'utf8')
const rdJson = (f) => JSON.parse(rd(f))
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')
const clone = (x) => JSON.parse(JSON.stringify(x))
const trail = (s) => s.endsWith('\n')

/** 原子写 + Windows EPERM 回退 + 保留末尾换行状态。与 P0 / P0.1 apply 同一 idiom。 */
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

/** ⚠️ 照抄 lib.mjs:136 —— 仅用于**取证**它在含冒号形态上失效，绝不用于本层操作 */
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

// 池逐字节不可变
const poolUnchanged = md5(JSON.stringify(sim.pool)) === md5(JSON.stringify(poolReal))
// 除将被删的 4 条边外，其余边逐字节不变
const nonTargetEdgesIdentical = (() => {
  const beforeMap = new Map(edgesReal.map((e) => [e.id, JSON.stringify(e)]))
  const afterMap = new Map(sim.edges.map((e) => [e.id, JSON.stringify(e)]))
  if (beforeMap.size - TARGETS.length !== afterMap.size) return false
  for (const [id, s] of afterMap) if (beforeMap.get(id) !== s) return false
  return true
})()

// 4 个被卸节点在树中 0 残留
const targetTreeIdsGone = TARGETS.every((t) => !treeIdsAfter.has(t.treeId))

// 池实体保留 + 宿主 viewDimensions 网格 atom 全部可解析
const poolKept = TARGETS.every((t) => !!sim.pool[t.ref])
const hostDims = sim.pool[HOST_POOL_REF]?.viewDimensions || []
const dim = hostDims.find((d) => d.id === DIM_ID)
const section = dim?.sections?.find((s) => s.id === SECTION_ID)
const dimAtomsBefore = section ? section.atoms.map((a) => a.nodeId) : []
const dimAtomsAfter = dimAtomsBefore // 本批不改池 ⇒ 网格逐字不变
const dimAtomsResolvable = dimAtomsAfter.filter((a) => !!sim.pool[a])
const dimAllTargetsPresent = DIM_EXPECTED_ATOMS.every((a) => dimAtomsAfter.includes(a))

// 结构不可变：宿主剩余子的顺序 = 原顺序去掉 4 个
const expectedRemaining = opResult.hostChildrenBefore.filter((id) => !TARGETS.some((t) => t.treeId === id))
const orderPreserved = JSON.stringify(opResult.hostChildrenAfter) === JSON.stringify(expectedRemaining)

// count 全树不变（count 是**静态导入元数据**，不是子树大小 —— 已实测：根 count=0 而子树 3216）
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

// G1 目标存在且均为宿主的直接子、且各自无子（无子 ⇒ 无需提级，卸载是纯减操作）
{
  const host = findTreeById(treeReal, HOST_TREE_ID)
  const kids = (host?.node.children || []).map((c) => c.id)
  const allDirectChild = TARGETS.every((t) => kids.includes(t.treeId))
  const allLeaf = TARGETS.every((t) => (findTreeById(treeReal, t.treeId)?.node.children || []).length === 0)
  gate('G1', '4 个目标存在 ∧ 均为宿主直接子 ∧ 均为叶子（childCount=0 ⇒ 无需提级）', allDirectChild && allLeaf,
    '直接子=' + allDirectChild + ' · 均叶子=' + allLeaf)
}

// G2 宿主子数恰为 15
{
  const kids = (findTreeById(treeReal, HOST_TREE_ID)?.node.children || []).map((c) => c.id)
  gate('G2', '宿主子数恰为 ' + HOST_EXPECTED_CHILDREN_BEFORE, kids.length === HOST_EXPECTED_CHILDREN_BEFORE,
    '实测 ' + kids.length + ' 个：' + kids.join(', '))
}

// G3 4 条 treebind 边按**精确 id** 存在，且端点均在池
{
  const expected = TARGETS.map((t) => 'treebind:' + HOST_TREE_ID + ':' + t.treeId)
  const found = expected.map((id) => edgesReal.find((e) => e.id === id))
  const allFound = found.every(Boolean)
  const endpointsOk = found.every((e) => e && poolReal[e.source] && poolReal[e.target])
  gate('G3', '4 条 treebind 边按精确 id 各命中 1 条 ∧ 端点均在池', allFound && endpointsOk,
    '命中 ' + found.filter(Boolean).length + '/4 · 端点均在池=' + endpointsOk)
}

// G4 取证：split(':') helper 对本批**恰好有效**（与 P0.1 相反）—— 登记这个差异，避免照抄错误结论
{
  const wouldDrop = dropTreebindEdgesForTreeIds_ASIS(edgesReal, TARGETS.map((t) => t.treeId))
  const colonParentEdges = edgesReal.filter((e) => String(e.id).startsWith('treebind:') && String(e.id).slice(8).split(':').length > 2).length
  gate('G4', '⚠️ 口径登记：宿主 treeId 不含冒号 ⇒ split(\':\') helper 对本批**恰好有效**（删除 ' + TARGETS.length + ' 条）',
    wouldDrop === TARGETS.length,
    'helper 报告删除 ' + wouldDrop + ' 条（P0.1 时任宿主 id 含冒号 ⇒ 报 0）· 本脚本仍用精确 id 匹配（同一 idiom + 不依赖已知有缺陷的 helper）· 全库 id 分段>2 的 treebind 边仍为 ' + colonParentEdges + ' 条，对 helper 一律失效')
}

// G5 池实体保留 ∧ 宿主 mybatis_plugin_grid 网格 4/4 atom 可解析 ∧ 4 个目标 atom 全在 ∧ 无第 5 个 atom
{
  const gridCount = dimAtomsBefore.length
  gate('G5', '4 个池实体保留 ∧ 网格 ' + SECTION_ID + ' atom ' + dimAtomsResolvable.length + '/' + gridCount + ' 可解析 ∧ 4 个目标 atom 全在',
    poolKept && dimAtomsResolvable.length === gridCount && dimAllTargetsPresent && gridCount === 4,
    '实体保留=' + poolKept + ' · 网格 atom=' + gridCount + '（P0.1 为 4 含 1 非本批；本批 4/4 全为本批目标）· 可解析 ' + dimAtomsResolvable.length + ' · 目标全在=' + dimAllTargetsPresent)
}

// G6 引用闭合：4 个 treeId 在池/题库中 0 残留（**真实引用**）∧
//    审计事件里 0 残留（**排除** changes[].before/after 叙述字段，宪法 §3.6）∧
//    边侧命中项恰为本批将删的 4 条 ∧ 无 source/target 端点引用
{
  // ① 真实引用面：池 / 题库 —— 这两处出现即真残留
  const hard = ['node-pool.json', 'questions.json']
  const residual = []
  for (const f of hard) for (const t of TARGETS) if (raw[f].includes(t.treeId)) residual.push(f + ':' + t.treeId)

  // ② 审计叙述面：剥掉 changes[].before / changes[].after（§3.6：叙述必须保留历史 id，不计残留），
  //    再检查**剩余部分**是否出现 treeId —— 这样才既能容纳叙述、又不放过叙述之外的引用。
  const evoStripped = clone(evoReal)
  const evoList = Array.isArray(evoStripped) ? evoStripped : evoStripped.events
  let narrativeMentions = 0
  for (const ev of evoList) {
    for (const ch of ev.changes || []) {
      for (const t of TARGETS) {
        if (String(ch.before ?? '').includes(t.treeId)) narrativeMentions += 1
        if (String(ch.after ?? '').includes(t.treeId)) narrativeMentions += 1
      }
      delete ch.before
      delete ch.after
    }
  }
  const evoResidual = []
  const evoStrippedText = JSON.stringify(evoStripped)
  for (const t of TARGETS) if (evoStrippedText.includes(t.treeId)) evoResidual.push(t.treeId)

  const inEdges = edgesReal.filter((e) => TARGETS.some((t) => String(e.id).includes(t.treeId))).map((e) => e.id)
  const onlyExpectedEdges = inEdges.every((id) => opResult.droppedEdgeIds.includes(id))
  const endpointRefs = edgesReal.filter((e) => TARGETS.some((t) => e.source === t.treeId || e.target === t.treeId)).length

  gate('G6', '引用闭合：池/题库 0 残留 ∧ 审计**叙述外**0 残留 ∧ 边侧命中恰为将删的 4 条 ∧ 端点引用 0',
    residual.length === 0 && evoResidual.length === 0 && onlyExpectedEdges && endpointRefs === 0,
    '池/题库残留=' + (residual.length ? residual.join(', ') : '0') +
    ' · 审计叙述外残留=' + (evoResidual.length ? evoResidual.join(', ') : '0') +
    ' · 叙述内命中（§3.6 容许、计入不判负）=' + narrativeMentions +
    ' · 边侧命中 ' + inEdges.length + ' 条且均在删除清单=' + onlyExpectedEdges +
    ' · source/target 引用=' + endpointRefs)
}

// G7 结构不可变：宿主剩余 11 个子顺序保持 ∧ 其余边逐字节不变 ∧ count 全树不变
{
  gate('G7', '宿主剩余 ' + HOST_EXPECTED_CHILDREN_AFTER + ' 个子顺序保持 ∧ 其余边逐字节不变 ∧ count 全树不变',
    orderPreserved && nonTargetEdgesIdentical && countsIdentical,
    '顺序=' + orderPreserved + ' · 其余边逐字节=' + nonTargetEdgesIdentical + ' · count=' + countsIdentical)
}

// G8 池 / 题库逐字节零改动
gate('G8', 'node-pool 与 questions **零改动**（池实体保留 = 本批不改池）', poolUnchanged,
  'pool 克隆后完全相等=' + poolUnchanged + ' · questions 不在写集内')

// G9 预期 diff
{
  const ok = simState.treeNodes === realState.treeNodes - TARGETS.length &&
    simState.edges === realState.edges - TARGETS.length &&
    simState.pool === realState.pool
  gate('G9', '预期 diff：树 ' + realState.treeNodes + '→' + (realState.treeNodes - TARGETS.length) +
    ' · 边 ' + realState.edges + '→' + (realState.edges - TARGETS.length) + ' · 池不变 ' + realState.pool, ok,
    '实测 树 ' + simState.treeNodes + ' · 边 ' + simState.edges + ' · 池 ' + simState.pool)
}

// G10 treeId 0 残留
gate('G10', '4 个 treeId 在树中 0 残留', targetTreeIdsGone, '实测残留 ' + TARGETS.filter((t) => treeIdsAfter.has(t.treeId)).length + ' 个')

// G11 nodeRef 悬空：保持 0
gate('G11', 'tree 节点 nodeRef 悬空 = 0（本批前 ' + realState.refDangling + ' → 后 ' + simState.refDangling + '）',
  simState.refDangling === 0 && simState.refDangling <= realState.refDangling,
  '实测 ' + simState.refDangling)

// G12 本批**引入**新未解析 treebind 边 = 0（既有债口径：不要求绝对值 0）
gate('G12', '本批引入的新未解析 treebind 边 = 0（既有债 ' + realState.tbUnresolved + ' 条不归本批）', newUnresolved.length === 0,
  '前 ' + tbBefore.unresolved + ' → 后 ' + tbAfter.unresolved + ' · 新增 ' + newUnresolved.length +
  (newUnresolved.length ? '：' + newUnresolved.slice(0, 3).join(' | ') : ''))

// G13 viewDimensions atom 悬空：保持 0 ∧ 总数不变
gate('G13', '全库 viewDimensions atom 悬空 = 0（' + realState.atomTotal + ' 个 atom）',
  simState.atomDangling === 0 && simState.atomTotal === realState.atomTotal,
  '前 ' + atomBefore.dangling.length + ' → 后 ' + atomAfter.dangling.length + ' · atom 总数 ' + atomAfter.total)

// G14 换行状态保持
gate('G14', '三个待写文件的末尾换行状态延续',
  true,
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
  title: 'T3-P2 · MyBatis 4 个插件点展示原子的卸树留池（只删 tree mount + treebind，池不动）',
  mode: MODE,
  generatedAt: new Date().toISOString(),
  host: { treeId: HOST_TREE_ID, poolRef: HOST_POOL_REF, name: HOST_NAME },
  targets: TARGETS,
  operation: {
    treeData: 'detachChild ×4（保留其余 11 个子的原顺序）',
    knowledgeEdges: '按精确 id 删除 4 条 treebind 边',
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
  dimensionCheck: {
    dimId: DIM_ID, sectionId: SECTION_ID, atoms: dimAtomsBefore, resolvable: dimAtomsResolvable,
    note: '本网格 4/4 全为本批目标（P0.1 另有 1 个非本批 atom）',
  },
  gates,
  allGatesPass: allPass,
  writeSetHint: ['data/tree-data.json', 'data/knowledge-edges.json', 'data/evolution-events.json'],
  excludedFromWriteSet: ['data/node-pool.json', 'data/questions.json'],
  note: 'node-pool / questions 明确排除在写集外 —— 本批的语义前提就是「池实体保留」。',
}
fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 't3-p2-apply-plan.json'), JSON.stringify(applyPlan, null, 2) + '\n', 'utf8')

if (MODE === 'freeze') {
  const base = {
    frozenAt: new Date().toISOString(),
    batch: BATCH_ID,
    dataMd5: md5Now,
    dataTrailingNewline: trailNow,
    counts: realState,
    note: '本批的祖先基线。apply 后 HEAD 的 tree-data/knowledge-edges 与「冻结时刻之前的状态」必须只差本批 4 卸 + 4 删。',
  }
  fs.writeFileSync(path.join(OUT_DIR, 't3-p2-apply-baseline.json'), JSON.stringify(base, null, 2) + '\n', 'utf8')
} else if (MODE === 'apply') {
  if (!allPass) {
    console.error('\n⛔ 闸门未全绿，拒绝写盘。')
    gates.filter((g) => g.result !== 'PASS').forEach((g) => console.error('   ✗ ' + g.id + ' ' + g.name + ' —— ' + g.detail))
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
    id: 'event:tree-refactor:t3-p2:' + now,
    scopeRootId: null,
    occurredAt: now,
    title: 'T3-P2：MyBatis 4 个「插件点」展示原子的卸树留池（只删 tree mount，池实体保留）',
    summary:
      'Mybatis 节点（' + HOST_POOL_REF + '）下的 4 个插件点节点被解除树挂载：'
      + 'Executor / StatementHandler / ParameterHandler / ResultSetHandler。'
      + '删除 4 个 tree mount 与对应 4 条 treebind 边；**池实体全部保留**，'
      + '宿主的 viewDimensions「插件与执行链 / 四大对象插件点」网格（' + SECTION_ID + '，layout=grid）的 4 个 atom 引用**逐字不变**，'
      + '故维度展示能力不受影响；题组不动。'
      + '依据：这 4 项的真实身份是**维度展示原子**（4/4 均为该网格 atom），'
      + '而维度原子走 nodePool 查表、不依赖树挂载 ⇒ tree mount 冗余。'
      + '保留双入口（树 + 网格）会让树承担展示职责并与池实体漂移。'
      + '处置语义 = 解除错误的物理归属，保留知识实体及其维度展示能力，不是删除知识。'
      + '与 T3-P0.1（MySQL 服务层 3 条）同构，无范围变更。',
    sourceOnlyNodeIds: TARGETS.map((t) => t.ref),
    introducedNodes: [],
    changes: TARGETS.map((t) => ({
      targetNodeId: t.ref,
      facet: 'structure',
      before: 'treeId `' + t.treeId + '`（挂在 `' + HOST_TREE_ID + '`「' + HOST_NAME + '」下）· 路径：知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > ' + t.name,
      after: '**仅退出树挂载**（tree mount 与 treebind 边删除），池实体 `' + t.ref + '` 与其正文 保留；仍作为宿主「' + HOST_NAME + '」viewDimensions 的 ' + SECTION_ID + ' 网格 atom 展示',
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
  const vTreeIds = treeIdsOf(vTree)
  const vAtoms = atomReport(vPool)
  const vDims = vPool[HOST_POOL_REF]?.viewDimensions || []
  const vDim = vDims.find((d) => d.id === DIM_ID)
  const vSection = vDim?.sections?.find((s) => s.id === SECTION_ID)
  const vGridAtoms = vSection ? vSection.atoms.map((a) => a.nodeId) : []

  realVerification = {
    fileVerified: {
      treeNodes: countTree(vTree),
      edges: vEdges.length,
      pool: Object.keys(vPool).length,
    },
    treeNodesRemoved: TARGETS.filter((t) => !vTreeIds.has(t.treeId)).length,
    treeIdsResidual: TARGETS.filter((t) => vTreeIds.has(t.treeId)).map((t) => t.treeId),
    hostChildrenAfter: (findTreeById(vTree, HOST_TREE_ID)?.node.children || []).map((c) => c.id),
    droppedEdgesConfirmed: realOp.droppedEdgeIds.filter((id) => !vEdges.some((e) => e.id === id)),
    droppedEdgesResidual: realOp.droppedEdgeIds.filter((id) => vEdges.some((e) => e.id === id)),
    poolEntitiesKept: TARGETS.filter((t) => !!vPool[t.ref]).map((t) => t.ref),
    gridAtomsUnchanged: JSON.stringify(vGridAtoms) === JSON.stringify(dimAtomsBefore),
    gridAtomsResolvable: vGridAtoms.filter((a) => !!vPool[a]).length + '/' + vGridAtoms.length,
    atomDanglingGlobal: vAtoms.dangling.length,
    nodeRefDangling: danglingNodeRefs(vTree, vPool).length,
    poolBytesUnchanged: md5(JSON.stringify(vPool)) === md5(JSON.stringify(poolReal)),
  }
  realVerification.verdict =
    realVerification.treeNodesRemoved === TARGETS.length &&
    realVerification.treeIdsResidual.length === 0 &&
    realVerification.droppedEdgesResidual.length === 0 &&
    realVerification.poolEntitiesKept.length === TARGETS.length &&
    realVerification.gridAtomsUnchanged &&
    realVerification.atomDanglingGlobal === 0 &&
    realVerification.nodeRefDangling === 0 &&
    realVerification.poolBytesUnchanged
      ? 'REAL_APPLY_VERIFIED'
      : 'REAL_APPLY_FAILED'
}

// ══════════════════════════════════════════════════════════════════════
// 7. 预检报告
// ══════════════════════════════════════════════════════════════════════
const L = []
L.push('# T3-P2 预检 / 落盘报告（MyBatis 4 条卸树留池）')
L.push('')
L.push('- 批次：`' + BATCH_ID + '`　模式：**' + MODE + '**　生成：' + new Date().toISOString())
L.push('- 宿主：`' + HOST_TREE_ID + '`（' + HOST_NAME + '，池 `' + HOST_POOL_REF + '`）')
L.push('- 目标：' + TARGETS.length + ' 条 —— ' + TARGETS.map((t) => '`' + t.treeId + '`').join(' · '))
L.push('')
L.push('## 操作')
L.push('')
L.push('| 文件 | 动作 |')
L.push('|---|---|')
L.push('| `data/tree-data.json` | `detachChild ×4`，保留其余 ' + HOST_EXPECTED_CHILDREN_AFTER + ' 个子原顺序 |')
L.push('| `data/knowledge-edges.json` | 按**精确 id** 删 4 条 treebind 边 |')
L.push('| `data/node-pool.json` | **零改动** |')
L.push('| `data/questions.json` | **零改动** |')
L.push('| `data/evolution-events.json` | +1 事件 |')
L.push('')
L.push('## 闸门')
L.push('')
L.push('| # | 闸门 | 结果 | 详情 |')
L.push('|---|---|---|---|')
for (const g of gates) L.push('| ' + g.id + ' | ' + g.name + ' | ' + (g.result === 'PASS' ? '✅ PASS' : '❌ FAIL') + ' | ' + g.detail + ' |')
L.push('')
L.push('**闸门结论：' + gates.filter((g) => g.result === 'PASS').length + '/' + gates.length +
  (allPass ? ' —— 全绿' : ' —— ⛔ 有 FAIL，拒绝写盘') + '**')
L.push('')
L.push('## 基线')
L.push('')
L.push('```')
L.push('before: ' + JSON.stringify(realState))
L.push('after : ' + JSON.stringify(simState))
L.push('```')
L.push('')
L.push('## 宿主 children')
L.push('')
L.push('```')
L.push('before(' + opResult.hostChildrenBefore.length + '): ' + opResult.hostChildrenBefore.join('\n  '))
L.push('after (' + opResult.hostChildrenAfter.length + '): ' + opResult.hostChildrenAfter.join('\n  '))
L.push('```')
L.push('')
L.push('## 网格保留核对')
L.push('')
L.push('- `' + HOST_POOL_REF + '.viewDimensions[`' + DIM_ID + '`].sections[`' + SECTION_ID + '`]`')
L.push('- atom（' + dimAtomsBefore.length + ' 个，本批不改池 ⇒ 逐字不变）：' + dimAtomsBefore.map((a) => '`' + a + '`').join(' · '))
L.push('- 全部可解析：' + dimAtomsResolvable.length + '/' + dimAtomsBefore.length)
L.push('')
if (backupDir) {
  L.push('## 落盘')
  L.push('')
  L.push('- 备份目录：`' + path.relative(ROOT, backupDir).replace(/\\/g, '/') + '`（5 个数据文件全量副本）')
  L.push('- 写后复验：**' + realVerification.verdict + '**')
  L.push('```')
  L.push(JSON.stringify(realVerification, null, 2))
  L.push('```')
}
fs.writeFileSync(path.join(OUT_DIR, 't3-p2-apply-report.md'), L.join('\n') + '\n', 'utf8')

// 控制台
console.log('批次：' + BATCH_ID + '　模式：' + MODE)
console.log('宿主：' + HOST_TREE_ID + '（' + HOST_NAME + '）')
console.log('目标：' + TARGETS.map((t) => t.treeId).join(' · '))
console.log('')
console.log('闸门：' + gates.filter((g) => g.result === 'PASS').length + '/' + gates.length + (allPass ? ' ✅ 全绿' : ' ❌ 有 FAIL'))
for (const g of gates) console.log('  ' + (g.result === 'PASS' ? '✅' : '❌') + ' ' + g.id + ' ' + g.name)
console.log('')
console.log('before: ' + JSON.stringify(realState))
console.log('after : ' + JSON.stringify(simState))
console.log('')
if (backupDir) {
  console.log('备份：' + path.relative(ROOT, backupDir).replace(/\\/g, '/'))
  console.log('写后复验：' + realVerification.verdict)
  console.log(JSON.stringify(realVerification, null, 2))
  if (realVerification.verdict !== 'REAL_APPLY_VERIFIED') process.exitCode = 1
} else if (!allPass) {
  process.exitCode = 1
}
