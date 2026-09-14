/**
 * T3 · asplit_* treeId 语义化 —— **只读 dry-run**（不写 data/）
 *
 * 用法：node scripts/dryrun-t3-asplit-semanticization.mjs
 * 产出（全部在 outputs/，不碰 data/）：
 *   · outputs/tree-violation-scan/asplit-treeid-mapping.draft.json   旧→新映射草案
 *       status ∈ { pending(可自动接受) · needs-review(MEDIUM 人工确认) · blocked(gap>3 禁止给名) }
 *   · outputs/tree-violation-scan/t3-dryrun-plan.json                内存克隆的实际改写计划
 *   · outputs/tree-violation-scan/t3-dryrun-report.md                人读报告
 *   · outputs/tree-violation-scan/t3-mapping-review.md               人工复核清单（按 BLOCK / MEDIUM 分节）
 * 退出码：0 = dry-run 全部自检通过；1 = 存在硬阻塞（碰撞/残留/计数不符）
 *
 * ⛔ 四条硬纪律（继承 phase1 批次 + 宪法 3.2 + 用户 2026-09-14 冻结闸门裁决）
 *   ① **绝不字符串替换**：treeId 是挂载身份，必须以「旧→新映射表」驱动改写。
 *   ② **closure 检查必须按 id 位置**，不能对文件原文扫 `asplit_` ——
 *      因为池 ref 形如 `asplit_concrete_class`（**是池 id，不是 treeId**），原文扫描必然假阳性。
 *   ③ **`semanticAncestorGap` 是冻结闸门，不是报告字段**：
 *      gap=0 → HIGH 可自动接受 · gap 1..3 → MEDIUM 必须逐条人工确认 · gap>3 → BLOCK，`proposedTreeId=null`。
 *   ④ **闭合断言要分两件事**：机制证明（只对已映射旧 id 扫描，残留须 0）
 *      vs 覆盖缺口（无映射条数 = 人工决策，可为非 0）。混为一谈会误判成机制失败。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')
/**
 * 输出后缀（可选）：`--out-suffix=after-p0` → `t3-dryrun-plan-after-p0.json` 等。
 * 用途：T3-P0 / T3-P0.1 落盘 **之后**重算生效范围时，不得覆盖此前的 dry-run 证据 ——
 * `t3-dryrun-report.md` 记录的 HIGH 68 / MEDIUM 38 / BLOCK 27 是 P0 的前置条件本身。
 * 默认空串 = 原文件名，行为与之前完全一致。
 */
const OUT_SUFFIX = (() => {
  const a = process.argv.slice(2)
  const eq = a.find((x) => x.startsWith('--out-suffix='))
  const raw = eq ? eq.slice('--out-suffix='.length) : (a.indexOf('--out-suffix') >= 0 && a[a.indexOf('--out-suffix') + 1] ? a[a.indexOf('--out-suffix') + 1] : '')
  if (!raw) return ''
  return raw.startsWith('-') ? raw : '-' + raw
})()
const outFile = (base, ext) => path.join(OUT, base + OUT_SUFFIX + ext)
const rd = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))

const tree = rd('data/tree-data.json')
const edges = rd('data/knowledge-edges.json')
const pool = rd('data/node-pool.json')
const inv = rd('outputs/tree-violation-scan/asplit-treeid-inventory.json')

// ── 0. 范围自校验：以**活数据**重算 Tier 1，不信台账 ───────────────────────
const nodes = new Map()
const parentOf = new Map()
const ancestorsOf = new Map()
const depthOf = new Map()
const pathOf = new Map()
const walk = (n, anc, names, depth) => {
  nodes.set(n.id, n)
  parentOf.set(n.id, anc.length ? anc[anc.length - 1] : null)
  ancestorsOf.set(n.id, [...anc])
  depthOf.set(n.id, depth)
  pathOf.set(n.id, [...names, n.name ?? '(无名)'].join(' > '))
  for (const c of n.children || []) walk(c, [...anc, n.id], [...names, n.name ?? '(无名)'], depth + 1)
}
walk(tree, [], [], 1)

const liveTier1 = [...nodes.keys()].filter((id) => /^asplit_/.test(id))
const invTier1 = inv.tier1.map((x) => x.treeId)

// ── 范围自校验（2026-09-14 修正：判据里不得硬编码 133）────────────────────────
// ⛔ 原实现把 `=== 133` 写死在判据里。T3-P0.1「卸树留池」登记 3 项退出范围后，
//    活数据重算变成 130 → 该判据**必然**报「范围自校验失败」。这是**判据缺陷**，不是数据问题。
// ⛔ 但按宪法 §3.2「不得为了让闸门变绿而重定义期望值」：修法**不是**把 133 改成 130，
//    而是让期望值**从台账已登记的声明推导**，并补上两条此前缺失的实质断言：
//      ① 声明自身内部自洽（originalScope / activeScope / counts 三者必须互相吻合）；
//      ② 声明「已退出范围」的项，必须**真的不在活树里**（这才是 P0.1 的实质结论，不是计数游戏）。
//    未登记范围变更时（如 P0.1 之前的检出）行为退化为「活数据 == 台账全集」，与修正前等价。
const invOutOfScope = inv.tier1.filter((x) => x.outOfScope === true).map((x) => x.treeId)
const declaredScopeChange = inv.scopeChange ?? null
const expectedActiveIds = invTier1.filter((id) => !invOutOfScope.includes(id))
const declaredScopeCount = invTier1.length
const activeScopeCount = expectedActiveIds.length

const scopeDeclarationConsistent = declaredScopeChange === null
  ? invOutOfScope.length === 0
  : declaredScopeChange.originalScope === invTier1.length &&
    declaredScopeChange.activeScope === activeScopeCount &&
    declaredScopeChange.resolvedOutOfScope.length === invOutOfScope.length &&
    declaredScopeChange.resolvedOutOfScope.every((id) => invOutOfScope.includes(id)) &&
    (inv.counts?.tier1Active === undefined || inv.counts.tier1Active === activeScopeCount) &&
    (inv.counts?.tier1ResolvedOutOfScope === undefined || inv.counts.tier1ResolvedOutOfScope === invOutOfScope.length)

const outOfScopeGoneFromTree = invOutOfScope.every((id) => !liveTier1.includes(id))

const scopeOk = scopeDeclarationConsistent &&
  outOfScopeGoneFromTree &&
  liveTier1.length === activeScopeCount &&
  liveTier1.every((id) => expectedActiveIds.includes(id))

// ── 1. 命名空间候选 ────────────────────────────────────────────────────────
// ⛔ 2026-09-14 修正（重要）：原判定 `/^tree_[a-z0-9_]+$/ && !/_s\d+_/` 会把
//    `tree_1784367544335_zorevp`（= **时间戳 + hash**）误判成「语义 id」，
//    （该 id 已于 T9 改名为 `tree_java_jmm_synchronization`；此处保留旧名，因为它正是**修正当时**的实证样本）
//    于是拿它当命名空间来源 → `gap` 被低估 → HIGH 被判多（116 vs 实际 68）。
//    后果与用户对 `asplit_s132_base_theory` 的裁决**同源**：产出的 id 里仍带时间戳 = 伪语义化。
//    故「语义形态」必须排除：时间戳+hash（`tree_<10+位数字>_…` / 内嵌 `k_<ts>_`）、段位 `_s<N>_`。
const TREE_SHAPE = /^tree_[a-z0-9_]+$/
const isHashTreeId = (id) =>
  TREE_SHAPE.test(id) && (/^tree_\d{10,}/.test(id) || /\d{10,}/.test(id))
const isSegmentTreeId = (id) => TREE_SHAPE.test(id) && /_s\d+(_|$)/.test(id)
// 严格语义形态：**可作为命名空间的 id 来源**（不含时间戳/hash、不含段位编号）
const isSemanticTreeId = (id) => TREE_SHAPE.test(id) && !isHashTreeId(id) && !isSegmentTreeId(id)
// 对照用（宽松形态）：仅 `tree_` 外形。**不得**用于挑命名空间，只用于报告「若放宽会怎样」
const isLooseTreeId = (id) => TREE_SHAPE.test(id) && !isSegmentTreeId(id)

// slug：从 nodeRef 确定性推导（去掉批次前缀）
const slugOf = (nodeRef) => String(nodeRef ?? '')
  .replace(/^asplit_s\d+_asplit_/, '')
  .replace(/^asplit_s\d+_/, '')
  .replace(/^asplit_/, '')
  .replace(/[^a-z0-9_]/gi, '_')
  .replace(/^_+|_+$/g, '')
  .toLowerCase()

// 已占用的 id 空间（用于碰撞检测）
const occupiedTreeIds = new Set(nodes.keys())
const occupiedPoolIds = new Set(Object.keys(pool))
const occupiedEdgeIds = new Set(edges.map((e) => e.id))

const poolAsplitRefs = [...occupiedPoolIds].filter((k) => /^asplit_/.test(k))

// ── 2. 逐条生成映射草案 ────────────────────────────────────────────────────
const mapping = []
for (const oldId of liveTier1) {
  const n = nodes.get(oldId)
  const anc = ancestorsOf.get(oldId) ?? []
  const pid = parentOf.get(oldId)
  const parent = pid ? nodes.get(pid) : null
  const semAnc = [...anc].reverse().find((a) => isSemanticTreeId(a)) ?? null
  // 对照证据：若用**宽松形态**判定，祖先会是谁、gap 会是多少 —— 用于暴露「伪语义祖先」
  const semAncLoose = [...anc].reverse().find((a) => isLooseTreeId(a)) ?? null
  const semAncLooseGap = semAncLoose ? anc.length - 1 - anc.lastIndexOf(semAncLoose) : null
  // 语义祖先与父节点之间的跨度：gap=0 表示父节点本身就是语义 id（命名空间可信）；
  // gap>0 表示中间夹了 hash / 段位 / 导入前缀 id（命名空间是「跳级借来的」，需人工确认）
  const semAncGap = semAnc ? anc.length - 1 - anc.lastIndexOf(semAnc) : null
  // 被排除掉的「形似语义、实为时间戳/hash」的中间祖先（本批的伪语义来源）
  const pseudoAncestors = anc.filter((a) => isHashTreeId(a))
  const slug = slugOf(n.nodeRef)

  // 候选 A：最近语义祖先全名 + slug（层级完整，但会带上容器角色）
  // 候选 B：最近语义祖先**去掉末段容器角色** + slug（= 批次蓝图示例的形式）
  const candA = semAnc ? 'tree_' + semAnc.replace(/^tree_/, '') + '_' + slug : null
  const segs = semAnc ? semAnc.replace(/^tree_/, '').split('_') : []
  const candB = segs.length >= 2 ? 'tree_' + segs.slice(0, -1).join('_') + '_' + slug : null

  const collides = (id) => {
    if (!id) return false
    return occupiedTreeIds.has(id) || occupiedPoolIds.has(id) || occupiedEdgeIds.has(id)
  }
  const collision = {
    candidateA: candA ? (collides(candA) ? 'CONFLICT' : 'free') : 'N/A',
    candidateB: candB ? (collides(candB) ? 'CONFLICT' : 'free') : 'N/A',
  }
  // 推荐：优先 B（贴合蓝图形式），B 冲突或不适用则退 A
  let recommended = null
  if (candB && collision.candidateB === 'free') recommended = candB
  else if (candA && collision.candidateA === 'free') recommended = candA

  // ── 冻结闸门（用户 2026-09-14 锁死的命名算法）────────────────────────────
  //   gap = 0        → HIGH，可自动接受（freezeEligible）
  //   gap = 1..3     → MEDIUM，**必须逐条人工确认**后才可冻结
  //   gap > 3        → LOW / **BLOCK**，不允许自动生成最终 mapping（proposedTreeId 置空）
  // 理由：父节点可能只是 hash 型 mount identity，真正有语义的是更上层祖先 → 允许跳级借用；
  //       但跨越过长结构链时代码不能自己猜，否则会把错误语义向下继承。
  let confidence, status, freezeEligible, blockReason = null, proposedTreeId = recommended
  if (!slug) { confidence = 'low'; status = 'needs-adjudication'; freezeEligible = false }
  else if (!semAnc) { confidence = 'low'; status = 'blocked'; freezeEligible = false; blockReason = '祖先链中没有任何语义形态 id，命名空间无法推导' }
  else if (semAncGap === 0) { confidence = 'high'; status = 'pending'; freezeEligible = true }
  else if (semAncGap <= 3) { confidence = 'medium'; status = 'needs-review'; freezeEligible = false }
  else {
    confidence = 'low'; status = 'blocked'; freezeEligible = false
    blockReason = 'semanticAncestorGap=' + semAncGap + ' > 3：不允许自动生成最终 mapping'
  }
  if (status === 'blocked') proposedTreeId = null // 堵死：阻塞项不得进入任何映射

  mapping.push({
    oldTreeId: oldId,
    name: n.name ?? null,
    nodeRef: n.nodeRef ?? null,
    path: pathOf.get(oldId),
    depth: depthOf.get(oldId),
    parentTreeId: pid,
    parentName: parent?.name ?? null,
    childCount: (n.children ?? []).length,
    semanticAncestor: semAnc,
    semanticAncestorGap: semAncGap,
    // 对照：宽松判定下会选中谁（若与严格不同，说明中间祖先「形似语义、实为时间戳/hash」）
    semanticAncestorLoose: semAncLoose,
    semanticAncestorLooseGap: semAncLooseGap,
    predicateShift: semAncLooseGap !== semAncGap,
    pseudoAncestors,
    slug,
    candidateA: candA,
    candidateB: candB,
    collision,
    proposedTreeId,
    confidence,
    status, // pending（可自动接受）| needs-review（须人工确认）| blocked（不得自动生成）| approved | rejected
    freezeEligible, // 只有 true 的项才能进入「自动冻结」的 mapping
    blockReason,
    reason: !semAnc
      ? 'slug 取自 nodeRef，但祖先链中**没有任何语义形态 id**（全为 hash / 段位 / 导入前缀）→ 命名空间需人工定'
      : semAncGap === 0
        ? 'slug 取自 nodeRef（去批次前缀）；命名空间取自**父节点**（语义 id ' + semAnc + '，B 形式去掉其末段容器角色）'
        : 'slug 取自 nodeRef；命名空间来自**跳级**祖先 ' + semAnc + '（与父节点相隔 ' + semAncGap + ' 层）——需人工确认该命名空间是否恰当'
          + (pseudoAncestors.length
            ? '。⚠️ 中间有 ' + pseudoAncestors.length + ' 个**形似语义、实为时间戳/hash** 的祖先被排除：'
              + pseudoAncestors.map((p) => p + '「' + (nodes.get(p)?.name ?? '?') + '」').join(' · ')
              + (semAncLooseGap !== semAncGap ? '（宽松判定会误用其中最近的一个，gap 被低估为 ' + semAncLooseGap + '）' : '')
            : ''),
  })
}

// 批内唯一性：同一批次内 proposedTreeId 不得重复
const propCount = new Map()
for (const m of mapping) if (m.proposedTreeId) propCount.set(m.proposedTreeId, (propCount.get(m.proposedTreeId) ?? 0) + 1)
const intraBatchDup = [...propCount.entries()].filter(([, c]) => c > 1).map(([id]) => id)
for (const m of mapping) if (m.proposedTreeId && intraBatchDup.includes(m.proposedTreeId)) m.collision.intraBatch = 'DUPLICATE'

// ── 3. 引用闭合：按 id 位置枚举落点 ───────────────────────────────────────
const mapOldToNew = new Map(mapping.filter((m) => m.proposedTreeId).map((m) => [m.oldTreeId, m.proposedTreeId]))
const refSites = { treeValue: [], edgeIdParent: [], edgeIdChild: [], edgeEndpoint: [] }
for (const [oldId, newId] of mapOldToNew) {
  if (nodes.has(oldId)) refSites.treeValue.push({ oldId, newId, field: 'tree-data:node.id' })
}
for (const e of edges) {
  const m = /^treebind:(.+?):(.+)$/.exec(String(e.id ?? ''))
  if (m) {
    if (mapOldToNew.has(m[1])) refSites.edgeIdParent.push({ edgeId: e.id, oldId: m[1], newId: mapOldToNew.get(m[1]) })
    if (mapOldToNew.has(m[2])) refSites.edgeIdChild.push({ edgeId: e.id, oldId: m[2], newId: mapOldToNew.get(m[2]) })
  }
  if (mapOldToNew.has(e.source)) refSites.edgeEndpoint.push({ edgeId: e.id, endpoint: 'source', oldId: e.source })
  if (mapOldToNew.has(e.target)) refSites.edgeEndpoint.push({ edgeId: e.id, endpoint: 'target', oldId: e.target })
}

// ── 4. 内存克隆跑真操作（不改动磁盘）──────────────────────────────────────
const countTree = (n) => 1 + (n.children ?? []).reduce((s, c) => s + countTree(c), 0)
const beforeTree = countTree(tree), beforeEdges = edges.length, beforePool = Object.keys(pool).length

/** 用给定的 old→new 子集在内存克隆上模拟一次改名，返回残留与改写量 */
const simulate = (pairs) => {
  const map = new Map(pairs)
  const cT = JSON.parse(JSON.stringify(tree))
  const cE = JSON.parse(JSON.stringify(edges))
  let renamedNodes = 0
  ;(function rename(n) {
    if (map.has(n.id)) { n.id = map.get(n.id); renamedNodes++ }
    for (const c of n.children ?? []) rename(c)
  })(cT)
  let renamedEdgeIds = 0
  for (const e of cE) {
    const m = /^treebind:(.+?):(.+)$/.exec(String(e.id ?? ''))
    if (!m) continue
    const newId = 'treebind:' + (map.get(m[1]) ?? m[1]) + ':' + (map.get(m[2]) ?? m[2])
    if (newId !== e.id) { e.id = newId; renamedEdgeIds++ }
  }
  const ids = new Set()
  ;(function collect(n) { ids.add(n.id); (n.children ?? []).forEach(collect) })(cT)
  // 强断言：对**已映射**的旧 id 做受控原文扫描（序列化后查子串），
  // 用于证明「引用落点枚举是完备的」—— 若有任何遗漏的落点，旧 id 会以子串形式残留。
  // 注意：只扫已映射的 id；未映射（blocked）的 id 残留属**覆盖缺口**，不是机制失败。
  const blob = JSON.stringify(cT) + JSON.stringify(cE)
  const mappedOldIds = [...map.keys()]
  const residualMapped = mappedOldIds.filter((id) => blob.includes(id))
  const unmapped = [...nodes.keys()].filter((id) => /^asplit_/.test(id) && !map.has(id))
  return { renamedNodes, renamedEdgeIds, residualTree: [...ids].filter((id) => /^asplit_/.test(id)), residualMapped, unmapped, treeCount: countTree(cT), edgeCount: cE.length }
}

const allPairs = mapping.filter((m) => m.proposedTreeId).map((m) => [m.oldTreeId, m.proposedTreeId])
const autoPairs = mapping.filter((m) => m.freezeEligible && m.proposedTreeId).map((m) => [m.oldTreeId, m.proposedTreeId])
const afterReviewPairs = mapping.filter((m) => m.status !== 'blocked' && m.proposedTreeId).map((m) => [m.oldTreeId, m.proposedTreeId])
// 假设人工为阻塞项按其候选 A 定名 —— 用于证明「机制完备、只差人工决策」
const _blocked = mapping.filter((m) => m.status === 'blocked')
const hypotheticalPairs = [...afterReviewPairs,
  ..._blocked.filter((m) => m.candidateA).map((m) => [m.oldTreeId, m.candidateA]),
  ..._blocked.filter((m) => !m.candidateA && m.candidateB).map((m) => [m.oldTreeId, m.candidateB])]

// 机器可给出的最大范围（含全部 MEDIUM 建议，不含 BLOCK 项）
const simAll = simulate(allPairs)
// 当前零人工介入就能冻结的部分（仅 gap=0）
const simAuto = simulate(autoPairs)
// 人工审完所有 MEDIUM 之后（阻塞项仍不参与）
const simAfterReview = simulate(afterReviewPairs)
// 假设阻塞项也被人定了名 → 闭合应达 0
const simHypo = simulate(hypotheticalPairs)

const renamedNodes = simAll.renamedNodes
const renamedEdgeIds = simAll.renamedEdgeIds
const afterTree = simAll.treeCount, afterEdges = simAll.edgeCount
const residualTreeAsplit = simAll.residualTree
const residualMappedOldIds = simAll.residualMapped
const uncoveredOldIds = simAll.unmapped
const endpointTouched = refSites.edgeEndpoint.length

// ── 5. 报告 ────────────────────────────────────────────────────────────────
// 结构性发现：全树 id 形态分布（说明「本批范围」在同类问题中的占比）
const formOf = (id) => {
  if (/^asplit_/.test(id)) return 'asplit_*（本批）'
  if (/^governance:/.test(id)) return 'governance:*（治理锚点）'
  if (/^projection:/.test(id)) return 'projection:*（发现式投影）'
  if (isHashTreeId(id)) return 'tree_<时间戳>_<hash>'
  if (isSegmentTreeId(id)) return 'tree..._s<N>_ 段位编号'
  if (/^tree_[a-z0-9_]+$/.test(id)) return 'tree_<语义 slug>'
  return '业务/导入前缀 id（demo_/final_atomic_/theory_domain_/wiki_/universe 等）'
}
const allIds = [...nodes.keys()]
const formDist = {}
for (const id of allIds) formDist[formOf(id)] = (formDist[formOf(id)] || 0) + 1
const semanticCount = formDist['tree_<语义 slug>'] ?? 0
const gapDist = {}
for (const m of mapping) { const k = m.semanticAncestorGap ?? 'none'; gapDist[k] = (gapDist[k] || 0) + 1 }

// 谓词修正的影响面：宽松判定（把时间戳/hash 当语义）会高估 HIGH、低估 gap
const predicateShift = {
  affected: mapping.filter((m) => m.predicateShift).length,
  pseudoAncestorsUsed: [...new Set(mapping.flatMap((m) => m.pseudoAncestors ?? []))].map((id) => ({ id, name: nodes.get(id)?.name ?? null })),
  looseGapDist: (() => {
    const d = {}
    for (const m of mapping) { const k = m.semanticAncestorLooseGap ?? 'none'; d[k] = (d[k] || 0) + 1 }
    return d
  })(),
  looseHighCount: mapping.filter((m) => m.semanticAncestorLooseGap === 0).length,
}

const byConfidence = { high: 0, medium: 0, low: 0 }
for (const m of mapping) byConfidence[m.confidence]++
const nNoNamespace = mapping.filter((m) => !m.semanticAncestor).length
const nConflict = mapping.filter((m) => m.collision.candidateA === 'CONFLICT' || m.collision.candidateB === 'CONFLICT').length
const nProposed = mapping.filter((m) => m.proposedTreeId).length

// 冻结闸门读数：gap=0 可自动接受 / gap 1..3 须人工确认 / gap>3 直接 BLOCK
const freezeReadiness = {
  autoAcceptable: mapping.filter((m) => m.freezeEligible).length,
  needsReview: mapping.filter((m) => m.status === 'needs-review').length,
  blocked: mapping.filter((m) => m.status === 'blocked').length,
}
const blockedItems = mapping.filter((m) => m.status === 'blocked')
const reviewItems = mapping.filter((m) => m.status === 'needs-review')

const plan = {
  generatedAt: new Date().toISOString(),
  mode: 'DRY_RUN_READ_ONLY',
  note: '只在内存克隆上执行改写；data/ 未被写入。',
  scope: {
    declaredOriginal: declaredScopeCount,
    declaredActive: activeScopeCount,
    resolvedOutOfScope: invOutOfScope,
    declarationConsistent: scopeDeclarationConsistent,
    outOfScopeGoneFromTree,
    liveRecount: liveTier1.length,
    matchesInventory: scopeOk,
    note: '期望值**从台账已登记声明推导**（`scopeChange` + `tier1[].outOfScope` + `counts`），不是硬编码常量。' +
      'T3-P0.1「卸树留池」登记 ' + invOutOfScope.length + ' 项退出范围 ⇒ 生效范围 = ' + activeScopeCount + '。' +
      '这不是「少做三项」，而是把这 3 项从 **treeId 语义化问题** 转化为正确的 **引用/挂载治理结果**。',
  },
  naming: {
    rule: 'tree_<命名空间>_<slug>；slug 取自 nodeRef（去 asplit 批次前缀）；命名空间取最近**可靠语义**祖先（允许跳级借用）',
    forbidden: ['sed', '全局 replace', 'regex 全局替换'],
    freezeGate: {
      rule: 'semanticAncestorGap 不只是报告字段，而是**冻结闸门**（用户 2026-09-14 锁死）',
      thresholds: [
        { gap: '= 0', tier: 'HIGH', action: '可自动接受（freezeEligible）' },
        { gap: '1..3', tier: 'MEDIUM', action: '必须逐条人工确认后才可冻结' },
        { gap: '> 3', tier: 'LOW / BLOCK', action: '不允许自动生成最终 mapping（proposedTreeId 置空）' },
      ],
      rationale: '父节点可能只是 hash 型 mount identity，真正有语义的是更上层祖先 → 允许跳级借用；' +
        '但跨越过长结构链时代码不能自己猜，否则会把错误语义向下继承。',
    },
    predicateCorrection: {
      what: '⛔ 2026-09-14 修正：原「语义形态」判定会把 `tree_<时间戳>_<hash>` 误判成语义 id，' +
        '于是拿它当命名空间来源 → gap 被低估、HIGH 被高估。',
      why: '与用户对 `asplit_s132_base_theory` 的裁决同源：**结果 id 里不得带时间戳/hash**。' +
        '把时间戳 id 当祖先 = 产出伪语义化 id（换了前缀，本质仍是历史 ID）。',
      nowExcluded: ['tree_<10+位数字>_*（时间戳前缀）', '含 10+ 位数字段的 id（如内嵌 k_<ts>_）', '_s<N>_ 段位编号'],
      affectedItems: predicateShift.affected,
      pseudoAncestorsThatWereUsed: predicateShift.pseudoAncestorsUsed,
      strictGapDist: gapDist,
      looseGapDist: predicateShift.looseGapDist,
      note: '两列差值 = 若不修正会被误判成「可自动接受」的条目数（宽松 HIGH ' +
        predicateShift.looseHighCount + ' vs 严格 HIGH ' + (gapDist['0'] ?? 0) + '）。',
    },
  },
  mappingSummary: {
    total: mapping.length,
    withProposal: nProposed,
    needsAdjudication: mapping.filter((m) => m.status === 'needs-adjudication').length,
    byStatus: {
      pending: mapping.filter((m) => m.status === 'pending').length,
      needsReview: freezeReadiness.needsReview,
      blocked: freezeReadiness.blocked,
      needsAdjudication: mapping.filter((m) => m.status === 'needs-adjudication').length,
    },
    freezeReadiness,
    noSemanticAncestor: nNoNamespace,
    collisions: nConflict,
    intraBatchDuplicate: intraBatchDup.length,
    byConfidence,
    bySemanticAncestorGap: gapDist,
  },
  structuralFindings: {
    totalTreeEntries: allIds.length,
    idFormDistribution: formDist,
    semanticIdCount: semanticCount,
    note: '「treeId 语义化」的同类问题总量远大于本批 ' + declaredScopeCount + ' 项：' +
      'asplit_* 仅 ' + (formDist['asplit_*（本批）'] ?? 0) + ' 条，' +
      '而携带 hash / 段位 / 导入前缀痕迹的 id 合计 ' +
      ((formDist['tree_<时间戳>_<hash>'] ?? 0) + (formDist['tree..._s<N>_ 段位编号'] ?? 0) +
       (formDist['业务/导入前缀 id（demo_/final_atomic_/theory_domain_/wiki_/universe 等）'] ?? 0)) + ' 条。',
    implication: '若本批的命名规则不预留后续批次，可能出现二次改名。建议在冻结映射表前先确认命名约定的适用范围。',
  },
  referenceClosure: {
    treeValueSites: refSites.treeValue.length,
    edgeIdParentSites: refSites.edgeIdParent.length,
    edgeIdChildSites: refSites.edgeIdChild.length,
    edgeEndpointSites: endpointTouched,
    note: 'endpoint 落点必须为 0（无任何边以 treeId 直接作 source/target）；' +
      '池 ref 形如 asplit_concrete_class 属**池 id 命名空间**，不在本批范围，不得改写。',
    poolAsplitRefsOutOfScope: poolAsplitRefs.length,
  },
  expectedDiff: {
    'tree-data.json': { entriesBefore: beforeTree, entriesAfter: afterTree, delta: afterTree - beforeTree, idsRenamed: renamedNodes },
    'knowledge-edges.json': { edgesBefore: beforeEdges, edgesAfter: afterEdges, delta: afterEdges - beforeEdges, edgeIdsRewritten: renamedEdgeIds, endpointsTouched: endpointTouched },
    'node-pool.json': { entitiesBefore: beforePool, delta: 0, note: '本批不改池' },
    'questions.json': { delta: 0 },
    'asplit_* treeId': { before: liveTier1.length, after: residualTreeAsplit.length, note: '机器可给出的最大范围（含 ' + freezeReadiness.needsReview + ' 条 MEDIUM 建议，不含 ' + freezeReadiness.blocked + ' 条 BLOCK）' },
  },
  freezeReadiness: {
    ...freezeReadiness,
    frozenMappingProducible: freezeReadiness.blocked === 0 && freezeReadiness.needsReview === 0,
    note: '`frozenMappingProducible=false` 有**两种成因，必须区分**（这是 2026-09-14 修掉的判据缺陷）：' +
      '① `blocked > 0` → **真阻塞**，不得进入 apply；' +
      '② `blocked === 0` 但 `needsReview > 0` → **无硬阻塞**，只剩人工复核队列，人裁完即可冻结。' +
      '把后者一律报成「冻结闸门 BLOCK」，会把「待人工裁决」误报成「闸门失败」。',
  },
  residualScenarios: {
    autoAcceptableOnly: { renamed: simAuto.renamedNodes, residualAsplit: simAuto.residualTree.length, note: '当前**零人工介入**就能冻结的部分（仅 gap=0）' },
    afterReviewingMedium: { renamed: simAfterReview.renamedNodes, residualAsplit: simAfterReview.residualTree.length, note: '人工审完 ' + freezeReadiness.needsReview + ' 条 MEDIUM 后仍残留的**覆盖缺口**（= 阻塞项数）' },
    machineMax: { renamed: simAll.renamedNodes, residualAsplit: simAll.residualTree.length, note: '机器可给出的最大范围（含 MEDIUM 建议，不含阻塞项）' },
    hypotheticalIfBlockedNamed: { renamed: simHypo.renamedNodes, residualAsplit: simHypo.residualTree.length, note: '⚠️ 假设：人工为阻塞项按其候选 A 定名 → 用于证明**闭包机制完备**，只差人工决策。**不代表本批可这样做**' },
  },
  closureAssertions: {
    // 机制证明：只对**已映射**的旧 id 断言（未映射项属覆盖缺口，另计）
    basis: '对已映射的旧 id 做受控原文扫描（序列化后查子串）——若有枚举遗漏的落点，旧 id 会残留',
    mappedOldIdsChecked: allPairs.length,
    residualMappedOldIds: residualMappedOldIds.length,
    residualMappedOldIdsList: residualMappedOldIds,
    endpointsTouched: endpointTouched,
    ok: residualMappedOldIds.length === 0 && endpointTouched === 0,
  },
  coverageGap: {
    unmappedOldIds: uncoveredOldIds,
    count: uncoveredOldIds.length,
    note: '这些项**没有任何映射**（status=blocked）→ 残留属预期，不是机制失败；但会导致 apply 后「asplit_* = 0」无法达成。',
  },
  hardBlockers: [],
  applyBlockers: [],
  warnings: [],
}

// 阻塞判定（两层：dry-run 本身 / 可否进入 apply）
if (!scopeOk) plan.hardBlockers.push('范围自校验失败：活数据重算 Tier1(' + liveTier1.length + ') ≠ 台账生效范围(' +
  activeScopeCount + ')，或声明内部不自洽（声明自洽 ' + scopeDeclarationConsistent +
  ' · 退出项确已离树 ' + outOfScopeGoneFromTree + '）')
if (intraBatchDup.length) plan.hardBlockers.push('批内 proposedTreeId 重复：' + intraBatchDup.join(', '))
if (!plan.closureAssertions.ok) plan.hardBlockers.push('引用闭合断言失败（残留 asplit_* 或 endpoint 被触碰）')
// ⛔ 2026-09-14 修正：原实现把 `frozenMappingProducible=false` 一律当硬阻塞，
//    于是当 blocked=0 / needsReview=38 时输出「冻结闸门 BLOCK：**0 条** 不允许自动生成 mapping」
//    与「仍有 **0 条** asplit_* 无法命名 → 不可能归零」—— 两句都以 0 作主语，**事实错误**。
//    正确口径：硬阻塞只看 `blocked`；MEDIUM 是设计内的**复核队列**；覆盖缺口只在真 >0 时才算阻塞。
if (freezeReadiness.blocked > 0) {
  plan.applyBlockers.push('冻结闸门 BLOCK：' + freezeReadiness.blocked +
    ' 条 `semanticAncestorGap > 3` 不允许自动生成 mapping（须人给名或另裁处置）')
}
if (simAfterReview.residualTree.length > 0) {
  plan.applyBlockers.push('覆盖缺口：即使人工审完全部 MEDIUM，仍有 ' + simAfterReview.residualTree.length +
    ' 条 asplit_* 无任何映射 → apply 后不可能达成「asplit_* = 0」')
}
if (freezeReadiness.needsReview > 0) {
  plan.reviewQueue = {
    count: freezeReadiness.needsReview,
    tier: 'MEDIUM',
    rule: 'gap 1..3 ⇒ 必须逐条人工确认后才可冻结（用户 2026-09-14 冻死）',
    note: '这是**复核队列**，不是闸门失败。当前硬阻塞（gap > 3）= ' + freezeReadiness.blocked + ' 条；' +
      'apply 前唯一待办 = 人工裁完这 ' + freezeReadiness.needsReview + ' 条（清单见 `t3-mapping-review.md`）。',
  }
}
plan.freezeVerdict = freezeReadiness.blocked > 0
  ? 'MAPPING_FREEZE_BLOCKED'
  : (freezeReadiness.needsReview > 0 ? 'MAPPING_FREEZE_PENDING_REVIEW' : 'MAPPING_FREEZE_READY')
if (nNoNamespace) plan.warnings.push(nNoNamespace + ' 条**无任何语义形态祖先** → 命名空间无法机器推导')
const nGapped = mapping.filter((m) => (m.semanticAncestorGap ?? 0) > 0).length
if (nGapped) plan.warnings.push(nGapped + ' 条属**跳级借用**：MEDIUM ' + freezeReadiness.needsReview +
  '（gap 1..3，须人工确认）' +
  (freezeReadiness.blocked > 0 ? '· BLOCKED ' + freezeReadiness.blocked + '（gap > 3，不允许自动生成）' : '') +
  '（gap 分布：' + JSON.stringify(gapDist) + '）')
if (nConflict) plan.warnings.push(nConflict + ' 条存在候选碰撞（候选 A/B 中至少一个被占用）')
if (poolAsplitRefs.length) plan.warnings.push('另有 ' + poolAsplitRefs.length + ' 个**池 id** 也以 asplit_ 开头（属池命名空间，本批不改）→ 见报告 §5')
plan.verdict = plan.hardBlockers.length === 0 ? 'DRY_RUN_OK' : 'DRY_RUN_BLOCKED'

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(outFile('asplit-treeid-mapping.draft', '.json'), JSON.stringify({
  generatedAt: plan.generatedAt,
  status: 'DRAFT_PENDING_HUMAN_REVIEW',
  note: '机器只给候选与冲突检测；status 初始 pending / needs-adjudication，须人工逐行裁决后冻结。',
  naming: plan.naming,
  summary: plan.mappingSummary,
  items: mapping,
}, null, 2) + '\n', 'utf8')
fs.writeFileSync(outFile('t3-dryrun-plan', '.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8')

const md = []
md.push('# T3 · `asplit_*` treeId 语义化 —— 只读 dry-run 报告', '')
md.push('> **模式：`DRY_RUN_READ_ONLY`** —— 改写只在内存克隆上执行，`data/` **未被写入**。', '')
md.push('生成时间：' + plan.generatedAt, '')
md.push('## 0. 结构性发现（本批的**上下文**，决定命名规则该定多宽）', '')
md.push('全树 ' + allIds.length + ' 个条目的 id 形态分布：', '')
md.push('| 形态 | 条数 | 占比 |', '|---|---:|---:|')
for (const [k, v] of Object.entries(formDist).sort((a, b) => b[1] - a[1])) {
  md.push('| ' + k + ' | ' + v + ' | ' + ((v / allIds.length) * 100).toFixed(1) + '% |')
}
md.push('')
md.push('**含义**：`asplit_*`（本批声明 ' + declaredScopeCount + ' · 生效 ' + activeScopeCount +
  '）只占 ' + ((declaredScopeCount / allIds.length) * 100).toFixed(1) + '%；' +
  '而携带 **hash / 段位 / 导入前缀**痕迹的 id 合计 ' +
  ((formDist['tree_<时间戳>_<hash>'] ?? 0) + (formDist['tree..._s<N>_ 段位编号'] ?? 0) +
   (formDist['业务/导入前缀 id（demo_/final_atomic_/theory_domain_/wiki_/universe 等）'] ?? 0)) + ' 条。' +
  '「treeId 语义化」的同类问题总量约为本批的 10 倍。', '')
md.push('> ⚠️ **决策点**：本批的命名规则（命名空间怎么取）要不要预留后续批次？' +
  '若不预留，后续批次可能二次改名。建议在**冻结映射表前**先确认命名约定的适用范围。', '')
md.push('## 1. 范围自校验', '')
md.push('> 期望值**从台账已登记声明推导**（`scopeChange` + `tier1[].outOfScope` + `counts`），不硬编码。' +
  '任何进一步的范围变更都必须走同样的登记流程 —— 这是宪法 §3.2「不得为了让闸门变绿而重定义期望值」在判据层的执行方式。', '')
md.push('| 项 | 值 |', '|---|---|')
md.push('| 台账原始声明 | ' + declaredScopeCount + ' |')
md.push('| 已登记退出范围（T3-P0.1 卸树留池） | ' + invOutOfScope.length + ' |')
md.push('| **生效范围** | **' + activeScopeCount + '** |')
md.push('| 活数据重算 | ' + liveTier1.length + ' |')
md.push('| 声明内部自洽 | ' + (scopeDeclarationConsistent ? '✅' : '❌') + ' |')
md.push('| 退出项确已不在活树 | ' + (outOfScopeGoneFromTree ? '✅' : '❌') + ' |')
md.push('| 与台账一致 | ' + (scopeOk ? '✅' : '❌') + ' |')
if (invOutOfScope.length) {
  md.push('')
  md.push('已登记退出范围的 ' + invOutOfScope.length + ' 项（原 ' + declaredScopeCount +
    ' 条一条未删，仅登记处置）—— 它们是**维度展示原子**，由宿主 `viewDimensions` 承载，不需要独立 treeId：', '')
  for (const id of invOutOfScope) md.push('- `' + id + '`')
}
md.push('', '## 2. 映射草案与**冻结闸门**', '')
md.push('- 总数 **' + mapping.length + '** · 可给建议 id **' + nProposed + '** · 阻塞（不得生成）**' + freezeReadiness.blocked + '**')
md.push('- 候选碰撞：' + nConflict + ' · 批内重复：' + intraBatchDup.length)
md.push('- 语义祖先跨度分布：`' + JSON.stringify(gapDist) + '`', '')
md.push('### ⛔ 2.0 谓词修正（2026-09-14）：时间戳/hash id 不得作为命名空间来源', '')
md.push('原「语义形态」判定为 `^tree_[a-z0-9_]+$` 且不含 `_s<N>_` —— 它会把' +
  '`tree_1784367544335_zorevp`（**时间戳 + hash**）误判成语义 id，于是拿它当命名空间来源。' +
  '（该 id 已于 T9 改名为 `tree_java_jmm_synchronization`；此处保留旧名，它是修正当时的实证样本。）', '')
md.push('| 影响 | 宽松判定（错误） | 严格判定（现行） |', '|---|---|---|')
md.push('| gap 分布 | `' + JSON.stringify(predicateShift.looseGapDist) + '` | `' + JSON.stringify(gapDist) + '` |')
md.push('| HIGH（可自动接受） | ' + predicateShift.looseHighCount + ' | ' + (gapDist['0'] ?? 0) + ' |')
md.push('| 受影响条目 | — | **' + predicateShift.affected + ' / ' + mapping.length + '** |')
md.push('')
md.push('被排除的「伪语义祖先」（共 ' + predicateShift.pseudoAncestorsUsed.length + ' 个，形似语义、实为时间戳/hash）：', '')
md.push('| id | name |', '|---|---|')
for (const p of predicateShift.pseudoAncestorsUsed) md.push('| `' + p.id + '` | ' + (p.name ?? '—') + ' |')
md.push('')
md.push('> **为什么必须修正**：与用户对 `asplit_s132_base_theory` 的裁决同源 ——' +
  '**结果 id 里不得带时间戳/hash**。把时间戳 id 当祖先 ⇒ 产出的是「换了前缀、本质仍是历史 ID」的伪语义化结果。', '')
md.push('', '### 冻结闸门（`semanticAncestorGap` 不只是报告字段）', '')
md.push('| gap | 层级 | 自动处理 | 本批条数 |', '|---|---|---|---:|')
md.push('| `= 0` | HIGH | **可自动接受**（freezeEligible） | ' + freezeReadiness.autoAcceptable + ' |')
md.push('| `1..3` | MEDIUM | **必须逐条人工确认**后才可冻结 | ' + freezeReadiness.needsReview + ' |')
md.push('| `> 3` | LOW / BLOCK | **不允许自动生成最终 mapping**（`proposedTreeId` 置空） | ' + freezeReadiness.blocked + ' |')
md.push('')
md.push('> 依据：父节点可能只是 **hash 型 mount identity**（真正有语义的是更上层祖先）→ 允许跳级借用；' +
  '但跨越过长结构链时代码不能自己猜，否则会把错误语义向下继承。', '')
md.push('**冻结结论：`' + plan.freezeVerdict + '`** —— `frozenMappingProducible = ' +
  plan.freezeReadiness.frozenMappingProducible + '`（硬阻塞 `gap > 3` = ' + freezeReadiness.blocked +
  ' · 人工复核队列 `MEDIUM` = ' + freezeReadiness.needsReview + '）', '')
md.push('')
if (freezeReadiness.blocked > 0) {
  md.push('⛔ **真阻塞**：有 ' + freezeReadiness.blocked + ' 条 `gap > 3`，不允许自动生成 mapping ⇒ 不得进入 apply。', '')
} else if (freezeReadiness.needsReview > 0) {
  md.push('▶️ **无硬阻塞**：`gap > 3` = 0 条。唯一待办是人工裁完 ' + freezeReadiness.needsReview +
    ' 条 MEDIUM（**复核队列，不是闸门失败**，见 `t3-mapping-review.md`）⇒ 裁完即可冻结并进入 apply。', '')
} else {
  md.push('✅ **无阻塞且无待办复核** ⇒ 映射表可直接冻结进入 apply。', '')
}
md.push('### 残留情景（决定 apply 可行性）', '')
md.push('| 情景 | 改写条数 | 残留 `asplit_*` |', '|---|---:|---:|')
md.push('| 仅 gap=0 自动接受 | ' + simAuto.renamedNodes + ' | **' + simAuto.residualTree.length + '** |')
md.push('| 人工审完全部 MEDIUM | ' + simAfterReview.renamedNodes + ' | **' + simAfterReview.residualTree.length + '**（阻塞项） |')
md.push('| 全部 ' + activeScopeCount + ' 项（生效范围）都命名（上界） | ' + simAll.renamedNodes + ' | ' + simAll.residualTree.length + ' |')
md.push('')
if (simAfterReview.residualTree.length > 0) {
  md.push('> 即：**即使人工审完全部 ' + freezeReadiness.needsReview + ' 条 MEDIUM，仍有 ' + simAfterReview.residualTree.length +
    ' 条无法命名 → apply 后不可能达成「asplit_* = 0」**。这 ' + simAfterReview.residualTree.length +
    ' 条必须由人给出名字（或另行裁决其处置），机器不代猜。', '')
} else {
  md.push('> 即：**人工审完全部 ' + freezeReadiness.needsReview + ' 条 MEDIUM 后，残留 = 0** —— ' +
    '不需要第三类处置，冻结 → apply 的路径完整（当前硬阻塞 `gap > 3` = ' + freezeReadiness.blocked + ' 条）。', '')
}
md.push('', '## 3. 引用闭合（按 **id 位置**枚举，不做原文扫描）', '')
md.push('| 落点 | 数量 |', '|---|---|')
md.push('| `tree-data` 节点 `id` | ' + refSites.treeValue.length + ' |')
md.push('| `treebind` 边 id — 父端 | ' + refSites.edgeIdParent.length + ' |')
md.push('| `treebind` 边 id — 子端 | ' + refSites.edgeIdChild.length + ' |')
md.push('| 边 `source`/`target` 落点 | **' + endpointTouched + '**（必须为 0） |')
md.push('', '> ⚠️ **不能对文件原文扫 `asplit_`** —— 池 ref 形如 `asplit_concrete_class` 是**池 id**，' +
  '与 treeId 是两个命名空间。原文扫描必然假阳性。本批不改池（' + poolAsplitRefs.length + ' 个 asplit 前缀池 id 不在范围）。', '')
md.push('## 4. 内存克隆实测的预期 diff', '')
md.push('| 文件 | 前 | 后 | Δ | 改写量 |', '|---|---:|---:|---:|---:|')
md.push('| `tree-data.json` | ' + beforeTree + ' | ' + afterTree + ' | **' + (afterTree - beforeTree) + '** | ' + renamedNodes + ' 个 id |')
md.push('| `knowledge-edges.json` | ' + beforeEdges + ' | ' + afterEdges + ' | **' + (afterEdges - beforeEdges) + '** | ' + renamedEdgeIds + ' 个边 id |')
md.push('| `node-pool.json` | ' + beforePool + ' | ' + beforePool + ' | 0 | 0 |')
md.push('| `asplit_*` treeId | ' + liveTier1.length + ' | **' + residualTreeAsplit.length + '** | **-' + (liveTier1.length - residualTreeAsplit.length) + '** | — |')
md.push('')
md.push('> 上表为**机器可给出的最大范围**（含 ' + freezeReadiness.needsReview + ' 条 MEDIUM 建议；' +
  (freezeReadiness.blocked > 0 ? '不含 ' + freezeReadiness.blocked + ' 条阻塞项' : '`gap > 3` 阻塞项 0 条') +
  '）→ 故 `asplit_*` 残留 ' + residualTreeAsplit.length + '。')
if (freezeReadiness.blocked > 0) {
  md.push('> 若人工为阻塞项定名，则残留可达 ' + simHypo.residualTree.length + '（见 §2 残留情景）。', '')
}
md.push('', '## 5. 闭合断言', '')
md.push('| 断言 | 结果 |', '|---|---|')
md.push('| 已映射旧 id 在克隆后的残留（受控原文扫描） | ' + residualMappedOldIds.length + ' ' + (residualMappedOldIds.length === 0 ? '✅' : '❌') + '（受检 ' + allPairs.length + ' 条） |')
md.push('| 被触碰的边 endpoint | ' + endpointTouched + ' ' + (endpointTouched === 0 ? '✅' : '❌') + ' |')
md.push('| 覆盖缺口（无映射、status=blocked） | ' + uncoveredOldIds.length + ' ⛔ 预期内，见 §2 |')
md.push('| 被触碰的边 endpoint | ' + endpointTouched + ' ' + (endpointTouched === 0 ? '✅' : '❌') + ' |')
md.push('', '## 6. 结论', '')
md.push('**`' + plan.verdict + '`** / 冻结：**`' + plan.freezeVerdict + '`**', '')
md.push('dry-run 硬阻塞：' + (plan.hardBlockers.length ? plan.hardBlockers.map((b) => '\n- ' + b).join('') : '无 ✅'))
if (plan.applyBlockers.length) {
  md.push('', 'apply 阻塞（**当前不得 apply**）：')
  for (const b of plan.applyBlockers) md.push('- ' + b)
} else {
  md.push('', 'apply 阻塞：**无 ✅**（0 条硬阻塞）')
}
if (plan.reviewQueue) {
  md.push('', 'apply 前的**人工待办**（复核队列，非阻塞）：' + plan.reviewQueue.count + ' 条 MEDIUM —— ' + plan.reviewQueue.note)
}
md.push('', '警告（不阻塞 dry-run，但需人工裁决）：')
for (const w of plan.warnings) md.push('- ' + w)
md.push('', '## 7. 复核清单（须人工裁决，见 `t3-mapping-review.md`）', '')
md.push('| 类别 | 条数 | 处置 |', '|---|---:|---|')
md.push('| HIGH（gap=0） | ' + freezeReadiness.autoAcceptable + ' | 可自动接受 |')
md.push('| **MEDIUM（gap 1..3）** | **' + freezeReadiness.needsReview + '** | **逐条人工确认** |')
md.push('| **BLOCK（gap > 3）** | **' + freezeReadiness.blocked + '** | **不允许自动生成 → 须人给名或另裁处置** |')
md.push('')
md.push('## 8. 下一步', '')
md.push('1. 审 `t3-mapping-review.md`：为 ' + freezeReadiness.blocked + ' 条 BLOCK 项定名/定处置，逐条确认 ' +
  freezeReadiness.needsReview + ' 条 MEDIUM；')
md.push('2. 冻结映射表（`status` 全部 `approved` / `rejected`，无 `pending` / `needs-review` / `blocked` 残留）→ apply 的 G3 闸门；')
md.push('3. 决定命名约定的**适用范围**：T3 只治 `asplit_*` ' + declaredScopeCount + ' 项（生效 ' + activeScopeCount + '），其余命名族（约 1521 条非语义 id）**另开批次**，不扩范围；')
md.push('4. 等 Phase 1 形成干净 HEAD 后执行 apply（备份 → 8 闸门 → 落盘 → 独立复验 → 单独提交 `t3-semanticization`）。')
md.push('')
fs.writeFileSync(outFile('t3-dryrun-report', '.md'), md.join('\n'), 'utf8')

// ── 复核清单（人工裁决用，含裁决栏）────────────────────────────────────────
const rv = []
rv.push('# T3 · 映射复核清单（人工裁决）', '')
rv.push('> **只读批次产物** —— 本清单不产生任何数据变化。' +
  'T3 范围严格冻结为 `asplit_*` **' + declaredScopeCount + ' 项**（生效 ' + activeScopeCount +
  '；原 ' + declaredScopeCount + ' 条一条未删，其中 ' + invOutOfScope.length +
  ' 项已登记退出范围）；其余命名族（约 1521 条非语义 id）**另开批次，不在此扩范围**。', '')
rv.push('生成时间：' + plan.generatedAt, '')
rv.push('## 裁决规则（`semanticAncestorGap` 即冻结闸门）', '')
rv.push('| gap | 层级 | 处置 |', '|---|---|---|')
rv.push('| `= 0` | HIGH | 可自动接受（' + freezeReadiness.autoAcceptable + ' 条，不在本清单内） |')
rv.push('| `1..3` | MEDIUM | **逐条人工确认**：命名空间是否恰当 + slug 拼写 |')
rv.push('| `> 3` | LOW / BLOCK | **不允许自动生成**：须人工给名，或另裁处置（改名 / 留在原地 / 降级为其它 id 族） |')
rv.push('')
// ── §0 前置依赖：BLOCK 项按「最近的伪语义祖先」分组 ────────────────────────
// 24 / 27 条 BLOCK 的命名空间其实**已经存在**，只是那个祖先自己还没有语义名（时间戳+hash）。
// 这是「前置依赖」，不是「范围扩张」：只需先给这 7 个祖先定名。
const prereqGroups = new Map()
for (const m of blockedItems) {
  const pa = m.pseudoAncestors ?? []
  const nearest = pa.length ? pa[pa.length - 1] : null
  const key = nearest ?? '__none__'
  if (!prereqGroups.has(key)) prereqGroups.set(key, { ancestor: nearest, ancName: nearest ? (nodes.get(nearest)?.name ?? null) : null, items: [] })
  prereqGroups.get(key).items.push(m)
}
const withAnc = [...prereqGroups.values()].filter((g) => g.ancestor)
const withoutAnc = prereqGroups.get('__none__')
rv.push('## 〇、前置依赖（决定 BLOCK 是否能批量解除）', '')
rv.push('BLOCK 的 ' + freezeReadiness.blocked + ' 条，按「最近的**伪语义祖先**」分组 —— ' +
  '即有 ' + withAnc.length + ' 个**非语义形态**祖先节点挡在中间：', '')
rv.push('| # | 祖先 treeId（时间戳+hash） | 祖先 name | 阻塞子项数 | 子项 |', '|---|---|---|---:|---|')
withAnc.sort((a, b) => b.items.length - a.items.length).forEach((g, i) => {
  rv.push('| ' + (i + 1) + ' | `' + g.ancestor + '` | ' + (g.ancName ?? '—') + ' | ' + g.items.length + ' | ' +
    g.items.slice(0, 8).map((m) => m.name).join(' / ') + (g.items.length > 8 ? ' …' : '') + ' |')
})
rv.push('')
rv.push('> **含义**：这 ' + withAnc.reduce((a, g) => a + g.items.length, 0) + ' 条 BLOCK 之所以无法命名，' +
  '根因是**它们的命名空间祖先自己还没被语义化**（祖先 id 形如 `tree_<时间戳>_<hash>`）。' +
  '命名空间本身是清晰可读的（见上表 name 列）。', '')
rv.push('')
rv.push('**这不是「扩大 T3 范围」**：T3 仍然只管 `asplit_*` ' + declaredScopeCount + ' 项（生效 ' + activeScopeCount + '），' +
  '只是识别出一个**有界前置依赖** —— 先给这 ' + withAnc.length + ' 个祖先定名（它们属「1521 非语义 id」族，但只需这一小簇），' +
  '随后这些子项自动降为 `gap=0`、可批量处理。', '')
rv.push('')
rv.push('### 前置依赖已独立成批（**不要在 T3 里顺手做**）', '')
rv.push('用户 2026-09-14 裁决（选 A）：这 ' + withAnc.length + ' 个祖先的命名必须作为**独立的前置小批次**完成 dry-run / review / apply，')
rv.push('**不能由本脚本的子节点算法隐式把它们当成已经完成** —— 因为父节点改名会改变子项 `semanticAncestorGap` 的**判定依据**')
rv.push('（语义祖先从远祖变成父节点本身），若隐式假定，T3 的冻结读数就建立在未落盘的假设之上。')
rv.push('')
rv.push('| 项 | 值 |')
rv.push('|---|---|')
rv.push('| 批次 | `t3-p0`（`batch-manifests/t3-p0.json`） |')
rv.push('| 命名提案（人工裁决） | `outputs/tree-violation-scan/t3-p0-naming.proposal.json` |')
rv.push('| 复核清单 | `outputs/tree-violation-scan/t3-p0-review.md` |')
rv.push('| dry-run 脚本 | `node scripts/dryrun-t3-p0-ancestors-semanticization.mjs` |')
rv.push('')
rv.push('> 本清单（`t3-mapping-review.md`）**不含**那 ' + withAnc.reduce((a, g) => a + g.items.length, 0) + ' 条 BLOCK 的裁决 —— 它们的裁决在 `t3-p0-review.md`。')
rv.push('> T3-P0 apply 之后重跑本脚本，本节的分组应随之消失，读数应为 HIGH ' + (freezeReadiness.autoAcceptable + withAnc.reduce((a, g) => a + g.items.length, 0)) +
  ' / MEDIUM ' + freezeReadiness.needsReview + ' / BLOCK ' + (withoutAnc ? withoutAnc.items.length : 0) + '。', '')
if (withoutAnc) {
  rv.push('')
  rv.push('其余 ' + withoutAnc.items.length + ' 条 **无伪祖先**（父节点是 `projection:*` / 冒号命名族，如 MySQL 服务层）：' +
    withoutAnc.items.map((m) => m.name).join(' / ') + ' —— 需另行裁决命名空间来源。', '')
}
rv.push('')
rv.push('## 一、BLOCK（gap > 3）—— ' + freezeReadiness.blocked + ' 条，机器**拒绝**给名', '')
rv.push('| # | 旧 treeId | name | 路径（父级） | 父节点 | gap | 语义祖先 | 候选 A | 候选 B | 裁决 |', '')
rv.push('|---|---|---|---|---|---:|---|---|---|---|')
blockedItems.forEach((m, i) => {
  rv.push('| ' + (i + 1) + ' | `' + m.oldTreeId + '` | ' + m.name + ' | ' + (m.path.split(' > ').slice(0, -1).join(' > ') || '—') +
    ' | ' + (m.parentName ?? '—') + ' | **' + m.semanticAncestorGap + '** | `' + (m.semanticAncestor ?? '—') + '` | `' +
    (m.candidateA ?? '—') + '` | `' + (m.candidateB ?? '—') + '` | ☐ 给名 ☐ 留原地 ☐ 另裁 |')
})
rv.push('')
rv.push('> 为什么 BLOCK：这几条的语义祖先与父节点相隔 ≥4 层，中间全是 hash / 段位 id。' +
  '命名空间若照抄那个远祖，会把**上层语义向下继承**到一条本不属于它的枝上。机器不代猜。', '')
rv.push('## 二、MEDIUM（gap 1..3）—— ' + freezeReadiness.needsReview + ' 条，须逐条确认', '')
rv.push('| # | 旧 treeId | name | 父节点 | gap | 建议新 treeId | 语义祖先 | 确认 |', '')
rv.push('|---|---|---|---|---:|---|---|---|')
reviewItems.forEach((m, i) => {
  rv.push('| ' + (i + 1) + ' | `' + m.oldTreeId + '` | ' + m.name + ' | ' + (m.parentName ?? '—') + ' · `' +
    (m.parentTreeId ?? '—') + '` | ' + m.semanticAncestorGap + ' | `' + (m.proposedTreeId ?? '—') + '` | `' +
    (m.semanticAncestor ?? '—') + '` | ☐ 通过 ☐ 改名 |')
})
rv.push('')
rv.push('> 共性：父节点是**无语义容器**（hash 型 mount identity），命名空间取自更上层语义祖先。' +
  '要求「命名空间必须来自直接父节点」会把合法的树结构信息丢掉，故允许借用；' +
  '但借用是否恰当需人判 —— 这 ' + freezeReadiness.needsReview + ' 条不接受自动冻结。', '')
rv.push('## 三、冻结的前置条件', '')
rv.push('```text')
if (freezeReadiness.blocked > 0) rv.push('上述 ' + freezeReadiness.blocked + ' 条 BLOCK 全部给出处置')
else rv.push('BLOCK（gap > 3）= 0 条 —— 无硬阻塞，本行无需处置')
rv.push('+ 上述 ' + freezeReadiness.needsReview + ' 条 MEDIUM 全部 approved')
rv.push('+ status 无 pending / needs-review / blocked 残留')
rv.push('→ frozenMappingProducible = true（当前 ' + plan.freezeReadiness.frozenMappingProducible + '）')
rv.push('→ 才可进入 apply')
rv.push('```')
rv.push('')
fs.writeFileSync(outFile('t3-mapping-review', '.md'), rv.join('\n'), 'utf8')

console.log('════ T3 · asplit_* 语义化 只读 dry-run ════')
console.log('  模式：DRY_RUN_READ_ONLY（data/ 未写入）')
console.log('\n【范围自校验】台账 ' + declaredScopeCount + ' · 已登记退出 ' + invOutOfScope.length +
  ' · 生效 ' + activeScopeCount + ' · 活数据重算 ' + liveTier1.length +
  ' · 一致 ' + (scopeOk ? '✅' : '❌') + '（声明自洽 ' + (scopeDeclarationConsistent ? '✅' : '❌') +
  ' · 退出项已离树 ' + (outOfScopeGoneFromTree ? '✅' : '❌') + '）')
console.log('\n【映射草案】共 ' + mapping.length + ' 条')
console.log('  可给建议 id：' + nProposed + ' · 阻塞（不得生成）' + freezeReadiness.blocked)
console.log('  冻结闸门读数：HIGH 可自动接受 ' + freezeReadiness.autoAcceptable +
  ' · MEDIUM 须人工确认 ' + freezeReadiness.needsReview + ' · BLOCK ' + freezeReadiness.blocked)
console.log('  语义祖先跨度分布：' + JSON.stringify(gapDist))
console.log('  候选碰撞：' + nConflict + ' · 批内重复：' + intraBatchDup.length)
console.log('  冻结结论：' + plan.freezeVerdict +
  (freezeReadiness.blocked > 0
    ? '（硬阻塞 gap>3 = ' + freezeReadiness.blocked + ' 条 → 映射表不得冻结）'
    : (freezeReadiness.needsReview > 0
      ? '（无硬阻塞；待人工裁完 ' + freezeReadiness.needsReview + ' 条 MEDIUM 即可冻结）'
      : '（无阻塞且无待办复核 → 可直接冻结）')))
console.log('\n【引用闭合】tree id ' + refSites.treeValue.length + ' · treebind 父端 ' + refSites.edgeIdParent.length +
  ' · 子端 ' + refSites.edgeIdChild.length + ' · 边 endpoint **' + endpointTouched + '**（须 0）')
console.log('  池 ref 以 asplit_ 开头：' + poolAsplitRefs.length + ' 个（属池命名空间，本批不改）')
console.log('\n【内存克隆预期 diff】')
console.log('  tree  ' + beforeTree + ' → ' + afterTree + ' (Δ' + (afterTree - beforeTree) + ') 改写 ' + renamedNodes + ' 个 id')
console.log('  edges ' + beforeEdges + ' → ' + afterEdges + ' (Δ' + (afterEdges - beforeEdges) + ') 改写 ' + renamedEdgeIds + ' 个边 id')
console.log('  pool  ' + beforePool + ' → ' + beforePool + ' (Δ0)')
console.log('  asplit_* ' + liveTier1.length + ' → ' + residualTreeAsplit.length + '（机器最大范围；' +
  (simHypo.residualTree.length > 0
    ? '残余 ' + simHypo.residualTree.length + ' 需人工为阻塞项定名才能归零'
    : '已可归零') + '）')
console.log('\n【残留情景（决定能否 apply）】')
console.log('  仅 gap=0 自动接受      → 改写 ' + simAuto.renamedNodes + ' 条 · 残留 asplit_* ' + simAuto.residualTree.length)
console.log('  人工审完所有 MEDIUM（' + freezeReadiness.needsReview + ' 条）→ 改写 ' + simAfterReview.renamedNodes +
  ' 条 · 残留 asplit_* ' + simAfterReview.residualTree.length +
  (simAfterReview.residualTree.length > 0 ? '  ← 阻塞项（须人给名）' : '  ← 闭环，无残余'))
console.log('  全部 ' + activeScopeCount + ' 项（生效范围）都命名 → 改写 ' + simAll.renamedNodes + ' 条 · 残留 asplit_* ' + simAll.residualTree.length + '（上界）')
console.log('\n【闭合断言（机制证明：只对已映射旧 id）】受检 ' + allPairs.length + ' 条 · 残留 ' +
  residualMappedOldIds.length + ' · endpoint 触碰 ' + endpointTouched + '  → ' + (plan.closureAssertions.ok ? '✅ 闭包机制完备' : '❌'))
console.log('  覆盖缺口（无映射）' + uncoveredOldIds.length + ' 条 ← 属人工决策，不是机制失败')
console.log('\n【结论】' + plan.verdict + ' / ' + plan.freezeVerdict)
for (const b of plan.hardBlockers) console.log('  ⛔ ' + b)
for (const b of plan.applyBlockers) console.log('  ⛔ apply 阻塞：' + b)
if (plan.reviewQueue) console.log('  ▶️ apply 前人工待办（复核队列，非阻塞）：' + plan.reviewQueue.count + ' 条 MEDIUM')
for (const w of plan.warnings) console.log('  ⚠️ ' + w)
console.log('\n产物' + (OUT_SUFFIX ? '（后缀 ' + OUT_SUFFIX + '）' : '') + '：asplit-treeid-mapping.draft · t3-dryrun-plan · t3-dryrun-report · t3-mapping-review（人工复核清单）')
process.exit(plan.hardBlockers.length === 0 ? 0 : 1)
