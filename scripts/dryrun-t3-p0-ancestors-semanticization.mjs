/**
 * T3-P0 · 7 个「伪语义祖先」的前置语义化 —— **只读 dry-run**（不写 data/）
 *
 * 用法：node scripts/dryrun-t3-p0-ancestors-semanticization.mjs
 * 输入：outputs/tree-violation-scan/t3-p0-naming.proposal.json（人工命名决策，本脚本只校验不生成名字）
 * 产出（全部在 outputs/，不碰 data/）：
 *   · outputs/tree-violation-scan/t3-p0-dryrun-plan.json       内存改写计划 + 校验读数
 *   · outputs/tree-violation-scan/t3-p0-report.md              人读报告（含 T3 133 项 gap 重算前后对比）
 *   · outputs/tree-violation-scan/t3-p0-review.md              人工复核清单（7 行 + 子项 id 形态预演）
 * 退出码：0 = 全部校验通过；1 = 存在硬阻塞（形态违规 / 碰撞 / 覆盖面不符 / 闭包断言失败）
 *
 * ⛔ 硬纪律
 *   ① 本批**只改 7 个 treeId**，不改 asplit_*、不改池、不改边内容（treebind 边 id 若含被改名 id 才改写）。
 *   ② 名字由**人**给（proposal.json）；机器只校验与推演，不代拟最终 id。
 *   ③ 结果 id **不得带时间戳 / hash / 段位编号**（用户对 asplit_s132_base_theory 的裁决）。
 *   ④ gap 谓词必须与 T3 dry-run **完全同源**（严格语义形态），否则前后不可比。
 *   ⑤ 覆盖面必须**恰好**等于「27 条 BLOCK 的最近伪语义祖先集合」——多一个就是扩范围，少一个就是前置残缺。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')
const rd = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'))

const tree = rd('data/tree-data.json')
const edges = rd('data/knowledge-edges.json')
const pool = rd('data/node-pool.json')
const inv = rd('outputs/tree-violation-scan/asplit-treeid-inventory.json')
const proposal = rd('outputs/tree-violation-scan/t3-p0-naming.proposal.json')

// ── 谓词（与 dryrun-t3-asplit-semanticization.mjs 完全同源）────────────────
const TREE_SHAPE = /^tree_[a-z0-9_]+$/
const isHashTreeId = (id) => TREE_SHAPE.test(id) && (/^tree_\d{10,}/.test(id) || /\d{10,}/.test(id))
const isSegmentTreeId = (id) => TREE_SHAPE.test(id) && /_s\d+(_|$)/.test(id)
const isSemanticTreeId = (id) => TREE_SHAPE.test(id) && !isHashTreeId(id) && !isSegmentTreeId(id)
const slugOf = (nodeRef) => String(nodeRef ?? '')
  .replace(/^asplit_s\d+_asplit_/, '').replace(/^asplit_s\d+_/, '').replace(/^asplit_/, '')
  .replace(/[^a-z0-9_]/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()

// ── 索引构建（可对任意 tree 对象复用）──────────────────────────────────────
const buildIndex = (t) => {
  const nodes = new Map(), parentOf = new Map(), ancOf = new Map(), pathOf = new Map(), depthOf = new Map()
  const walk = (n, anc, names, depth) => {
    nodes.set(n.id, n)
    parentOf.set(n.id, anc.length ? anc[anc.length - 1] : null)
    ancOf.set(n.id, [...anc])
    pathOf.set(n.id, [...names, n.name ?? '(无名)'].join(' > '))
    depthOf.set(n.id, depth)
    for (const c of n.children || []) walk(c, [...anc, n.id], [...names, n.name ?? '(无名)'], depth + 1)
  }
  walk(t, [], [], 1)
  return { nodes, parentOf, ancOf, pathOf, depthOf }
}

const before = buildIndex(tree)
const liveTier1 = [...before.nodes.keys()].filter((id) => /^asplit_/.test(id))
const invTier1 = inv.tier1.map((x) => x.treeId)
const scopeOk = liveTier1.length === 133 && invTier1.length === 133 && liveTier1.every((id) => invTier1.includes(id))

/** 逐条算 gap / 状态（同 T3 口径） */
const evalItem = (idx, oldId) => {
  const n = idx.nodes.get(oldId)
  if (!n) return null
  const anc = idx.ancOf.get(oldId) ?? []
  const semAnc = [...anc].reverse().find((a) => isSemanticTreeId(a)) ?? null
  const gap = semAnc ? anc.length - 1 - anc.lastIndexOf(semAnc) : null
  const pseudoAncestors = anc.filter((a) => isHashTreeId(a))
  const slug = slugOf(n.nodeRef)
  let status, confidence
  if (!slug) { status = 'needs-adjudication'; confidence = 'low' }
  else if (!semAnc) { status = 'blocked'; confidence = 'low' }
  else if (gap === 0) { status = 'pending'; confidence = 'high' }
  else if (gap <= 3) { status = 'needs-review'; confidence = 'medium' }
  else { status = 'blocked'; confidence = 'low' }
  return {
    oldTreeId: oldId, name: n.name ?? null, nodeRef: n.nodeRef ?? null,
    parentTreeId: idx.parentOf.get(oldId) ?? null,
    parentName: idx.parentOf.get(oldId) ? (idx.nodes.get(idx.parentOf.get(oldId))?.name ?? null) : null,
    semanticAncestor: semAnc, semanticAncestorGap: gap, pseudoAncestors, slug, status, confidence,
    proposedTreeId: status === 'blocked' ? null : (semAnc ? 'tree_' + semAnc.replace(/^tree_/, '') + '_' + slug : null),
  }
}

const beforeItems = liveTier1.map((id) => evalItem(before, id)).filter(Boolean)
const dist = (items, key) => {
  const d = {}
  for (const m of items) { const k = m[key] ?? 'none'; d[k] = (d[k] || 0) + 1 }
  return d
}
const tierOf = (items) => ({
  high: items.filter((m) => m.confidence === 'high').length,
  medium: items.filter((m) => m.confidence === 'medium').length,
  low: items.filter((m) => m.confidence === 'low').length,
  blocked: items.filter((m) => m.status === 'blocked').length,
})
const beforeDist = dist(beforeItems, 'semanticAncestorGap')
const beforeTier = tierOf(beforeItems)
const beforeBlocked = beforeItems.filter((m) => m.status === 'blocked')

// ── 覆盖面：27 条 BLOCK 的「最近伪语义祖先」集合 ────────────────────────────
const nearestPseudoOf = (m) => (m.pseudoAncestors?.length ? m.pseudoAncestors[m.pseudoAncestors.length - 1] : null)
const expectedAncestors = [...new Set(beforeBlocked.map(nearestPseudoOf).filter(Boolean))].sort()
const projectionFamilyBlocked = beforeBlocked.filter((m) => !nearestPseudoOf(m))

// ── 1. 提案校验 ────────────────────────────────────────────────────────────
const items = proposal.items ?? []
const errors = [], warnings = []
const validate = (cond, msg) => { if (!cond) errors.push(msg) }

validate(items.length === 7, '提案条数 ≠ 7（实际 ' + items.length + '）')

const occupiedTree = new Set(before.nodes.keys())
const occupiedPool = new Set(Object.keys(pool))
const occupiedEdge = new Set(edges.map((e) => e.id))
const oldIds = items.map((x) => x.oldTreeId)
const newIds = items.map((x) => x.proposedTreeId)

const dupOld = oldIds.filter((x, i) => oldIds.indexOf(x) !== i)
const dupNew = newIds.filter((x, i) => newIds.indexOf(x) !== i)
validate(dupOld.length === 0, '提案内 oldTreeId 重复：' + dupOld.join(', '))
validate(dupNew.length === 0, '提案内 proposedTreeId 重复：' + dupNew.join(', '))

const rows = items.map((x) => {
  const n = before.nodes.get(x.oldTreeId)
  const checks = {
    oldExists: !!n,
    oldIsHashShape: isHashTreeId(x.oldTreeId),      // 必须是「伪语义祖先」形态
    newShapeOk: TREE_SHAPE.test(x.proposedTreeId ?? ''),
    newNoTimestamp: !isHashTreeId(x.proposedTreeId ?? ''),   // ⛔ 用户硬规则
    newNoSegment: !isSegmentTreeId(x.proposedTreeId ?? ''),
    newNotOccupied: !(occupiedTree.has(x.proposedTreeId) || occupiedPool.has(x.proposedTreeId) || occupiedEdge.has(x.proposedTreeId)),
    isBlocking: beforeBlocked.some((m) => nearestPseudoOf(m) === x.oldTreeId),
  }
  const childBlocked = beforeBlocked.filter((m) => nearestPseudoOf(m) === x.oldTreeId)
  const ok = Object.values(checks).every(Boolean)
  if (!checks.oldExists) errors.push(x.oldTreeId + '：活数据里不存在')
  if (checks.oldExists && !checks.oldIsHashShape) errors.push(x.oldTreeId + '：不是伪语义祖先形态（tree_<时间戳>_<hash>）→ 超出本批范围')
  if (!checks.newShapeOk) errors.push(x.proposedTreeId + '：不符合 tree_<小写 slug> 形态')
  if (!checks.newNoTimestamp) errors.push(x.proposedTreeId + '：⛔ 结果 id 里带时间戳 / hash（用户硬规则）')
  if (!checks.newNoSegment) errors.push(x.proposedTreeId + '：⛔ 结果 id 里带 _s<N>_ 段位编号')
  if (!checks.newNotOccupied) errors.push(x.proposedTreeId + '：与既有 treeId / 池 id / 边 id 碰撞')
  if (!checks.isBlocking) errors.push(x.oldTreeId + '：它并不是任何 BLOCK 项的最近伪语义祖先 → 属扩范围（本批不允许）')
  const n0 = n
  return {
    seq: x.seq, oldTreeId: x.oldTreeId, oldName: x.oldName, nodeRef: n0?.nodeRef ?? null,
    path: before.pathOf.get(x.oldTreeId) ?? null, depth: before.depthOf.get(x.oldTreeId) ?? null,
    parentTreeId: before.parentOf.get(x.oldTreeId) ?? null,
    parentName: before.parentOf.get(x.oldTreeId) ? (before.nodes.get(before.parentOf.get(x.oldTreeId))?.name ?? null) : null,
    siblings: (() => {
      const p = before.parentOf.get(x.oldTreeId)
      return p ? (before.nodes.get(p)?.children ?? []).filter((c) => c.id !== x.oldTreeId).map((c) => c.name) : []
    })(),
    ownChildCount: (n0?.children ?? []).length,
    blockedChildren: childBlocked.map((m) => ({ oldTreeId: m.oldTreeId, name: m.name, gap: m.semanticAncestorGap })),
    blockedChildCount: childBlocked.length,
    proposedTreeId: x.proposedTreeId, namespace: x.namespace ?? null,
    slugRationale: x.slugRationale ?? null, alternatives: x.alternatives ?? [],
    evidencedBy: x.evidencedBy ?? null, childCoherenceHint: x.childCoherenceHint ?? null,
    checks, ok,
  }
})

// 覆盖面断言：本批 old 集合必须**恰好**等于 BLOCK 的最近伪祖先集合
const sortedOld = [...oldIds].sort()
const coverageExact = JSON.stringify(sortedOld) === JSON.stringify(expectedAncestors)
validate(coverageExact,
  '覆盖面不符：提案 ' + sortedOld.length + ' 个 vs 期望 ' + expectedAncestors.length + ' 个；' +
  '缺失 ' + JSON.stringify(expectedAncestors.filter((x) => !oldIds.includes(x))) +
  '，多余 ' + JSON.stringify(oldIds.filter((x) => !expectedAncestors.includes(x))))

// P0 内部不得形成祖先-后代链（否则改名后 gap 计算互相干扰）
const innerAncestorChain = oldIds.filter((a) => oldIds.some((b) => a !== b && (before.ancOf.get(b) ?? []).includes(a)))
validate(innerAncestorChain.length === 0, 'P0 内部存在祖先-后代关系（' + innerAncestorChain.join(', ') + '）：改名后 gap 计算会互相影响，须拆批')

// ── 2. 内存克隆执行改名 ────────────────────────────────────────────────────
const renameMap = new Map(items.map((x) => [x.oldTreeId, x.proposedTreeId]))
const countTree = (n) => 1 + (n.children ?? []).reduce((s, c) => s + countTree(c), 0)
const clone = JSON.parse(JSON.stringify(tree))
let renamed = 0
;(function rename(n) { if (renameMap.has(n.id)) { n.id = renameMap.get(n.id); renamed++ } for (const c of n.children ?? []) rename(c) })(clone)
const cloneEdges = JSON.parse(JSON.stringify(edges))
let renamedEdgeIds = 0
for (const e of cloneEdges) {
  const m = /^treebind:(.+?):(.+)$/.exec(String(e.id ?? ''))
  if (!m) continue
  const next = 'treebind:' + (renameMap.get(m[1]) ?? m[1]) + ':' + (renameMap.get(m[2]) ?? m[2])
  if (next !== e.id) { e.id = next; renamedEdgeIds++ }
}
const endpointTouched = cloneEdges.filter((e) => renameMap.has(e.source) || renameMap.has(e.target)).length

const after = buildIndex(clone)
const afterItems = liveTier1.map((id) => evalItem(after, id)).filter(Boolean)
const afterDist = dist(afterItems, 'semanticAncestorGap')
const afterTier = tierOf(afterItems)
const afterBlocked = afterItems.filter((m) => m.status === 'blocked')

// ── 3. 差异与「解封」清单 ──────────────────────────────────────────────────
const beforeByOld = new Map(beforeItems.map((m) => [m.oldTreeId, m]))
const delta = afterItems.map((m) => {
  const b = beforeByOld.get(m.oldTreeId)
  return {
    oldTreeId: m.oldTreeId, name: m.name,
    gapBefore: b.semanticAncestorGap, gapAfter: m.semanticAncestorGap,
    statusBefore: b.status, statusAfter: m.status,
    semAncBefore: b.semanticAncestor, semAncAfter: m.semanticAncestor,
    unblocked: b.status === 'blocked' && m.status !== 'blocked',
  }
})
const newlyUnblocked = delta.filter((d) => d.unblocked)
const stillBlocked = afterBlocked.map((m) => ({ oldTreeId: m.oldTreeId, name: m.name, gap: m.semanticAncestorGap, semAnc: m.semanticAncestor }))

// 子项 id 形态预演（决定 D1 取舍的实证）
const childShapePreview = delta.filter((d) => d.gapAfter === 0 && d.gapBefore !== 0).map((d) => {
  const m = afterItems.find((x) => x.oldTreeId === d.oldTreeId)
  const segs = m.semanticAncestor ? m.semanticAncestor.replace(/^tree_/, '').split('_') : []
  return {
    oldTreeId: d.oldTreeId, name: d.name, parentTreeId: m.parentTreeId, parentName: m.parentName, slug: m.slug,
    optionA: m.semanticAncestor ? 'tree_' + m.semanticAncestor.replace(/^tree_/, '') + '_' + m.slug : null,
    optionB: segs.length >= 2 ? 'tree_' + segs.slice(0, -1).join('_') + '_' + m.slug : null,
  }
})

// ── 4. 闭包断言（机制证明：只对已改名 id）──────────────────────────────────
const blob = JSON.stringify(clone) + JSON.stringify(cloneEdges)
const residualRenamedOldIds = oldIds.filter((id) => blob.includes(id))
const closureOk = residualRenamedOldIds.length === 0 && endpointTouched === 0 && countTree(clone) === countTree(tree)
const treeCountBefore = countTree(tree), treeCountAfter = countTree(clone)

// ── 5. 计划与报告 ──────────────────────────────────────────────────────────
const plan = {
  generatedAt: new Date().toISOString(),
  mode: 'DRY_RUN_READ_ONLY',
  batch: 't3-p0',
  note: '只在内存克隆上执行 7 个 treeId 的改写；data/ 未被写入。',
  scope: {
    declared: 7,
    proposalCount: items.length,
    liveRecount: liveTier1.length,
    asplitTier1MatchesInventory: scopeOk,
    blockedItemsTotal: beforeBlocked.length,
    blockedItemsCoveredByP0: beforeBlocked.filter((m) => nearestPseudoOf(m)).length,
    blockedItemsOutOfP0: projectionFamilyBlocked.map((m) => ({
      oldTreeId: m.oldTreeId, name: m.name, gap: m.semanticAncestorGap,
      parentTreeId: m.parentTreeId, parentName: m.parentName,
      reason: '父链为 projection:* + colon 命名族（服务层 -> 结构 -> MySQL Server），无伪语义 tree 祖先 → 属挂载点合法性，另案',
    })),
    expectedPseudoAncestors: expectedAncestors,
    coverageExact,
  },
  validation: {
    errors, warnings,
    rows: rows.map((r) => ({ oldTreeId: r.oldTreeId, proposedTreeId: r.proposedTreeId, ok: r.ok, checks: r.checks, blockedChildCount: r.blockedChildCount })),
    verdict: errors.length === 0 ? 'P0_PROPOSAL_VALID' : 'P0_PROPOSAL_INVALID',
  },
  namingRule: proposal.namingRule,
  namespaceRegistry: proposal.namespaceRegistry,
  rename: {
    pairs: items.map((x) => ({ old: x.oldTreeId, new: x.proposedTreeId, oldName: x.oldName })),
    renamedNodes: renamed,
    renamedEdgeIds,
    treeCountBefore, treeCountAfter,
    deltaTreeCount: treeCountAfter - treeCountBefore,
    edgeCountBefore: edges.length, edgeCountAfter: cloneEdges.length,
    endpointTouched,
  },
  t3Recompute: {
    basis: '对 T3 的 133 项 asplit_* 用**同源谓词**重算 semanticAncestorGap',
    gapDistBefore: beforeDist,
    gapDistAfter: afterDist,
    tierBefore: beforeTier,
    tierAfter: afterTier,
    newlyUnblocked: newlyUnblocked.length,
    stillBlocked: stillBlocked.length,
    frozenMappingProducibleAfterP0: afterTier.blocked === 0 && afterTier.medium === 0,
    note: 'P0 只解除「父节点未语义化」这一类 BLOCK；剩余 ' + afterTier.blocked + ' 条是 projection/colon 族（另案），' +
      afterTier.medium + ' 条是 MEDIUM（须人工逐条确认，属 T3-P1）。',
  },
  delta,
  childShapePreview,
  closureAssertions: {
    residualRenamedOldIds, endpointsTouched: endpointTouched,
    treeCountUnchanged: treeCountAfter === treeCountBefore,
    ok: closureOk,
  },
  openDecisions: proposal.openDecisions,
  hardBlockers: [...errors],
  applyBlockers: [],
}
if (!scopeOk) plan.hardBlockers.push('T3 范围自校验失败：活数据 asplit_* ≠ 133 或与台账不一致')
if (!closureOk) plan.hardBlockers.push('闭包断言失败：残留被改名 id / 边 endpoint 被触碰 / 节点数变化')
plan.verdict = plan.hardBlockers.length === 0 ? 'P0_DRY_RUN_OK' : 'P0_DRY_RUN_BLOCKED'
plan.applyBlockers.push('本批 dry-run 通过后，仍须人工逐条裁决 7 个名字（proposal.items[].adjudication 全部 approved）才可 apply')

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 't3-p0-dryrun-plan.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8')

// ── 报告 ───────────────────────────────────────────────────────────────────
const md = []
md.push('# T3-P0 · 7 个伪语义祖先的「前置语义化」—— 只读 dry-run 报告', '')
md.push('> **模式：`DRY_RUN_READ_ONLY`** —— 改写只在内存克隆上执行，`data/` **未被写入**。', '')
md.push('生成时间：' + plan.generatedAt, '')
md.push('## 0. 为什么会有这一批', '')
md.push('T3 的 133 项 `asplit_*` 里，' + beforeBlocked.length + ' 条 `semanticAncestorGap > 3` → BLOCK。')
md.push('其中 **' + plan.scope.blockedItemsCoveredByP0 + ' 条的根因不是它们自己没有语义，而是它们的直接父节点自己还没被语义化**（父 id 形如 `tree_<时间戳>_<hash>`）。')
md.push('另 ' + plan.scope.blockedItemsOutOfP0.length + ' 条属另一类问题（见 §5）。', '')
md.push('按用户 2026-09-14 裁决（选 A），这 7 个祖先是**独立的前置小批次**，不由 T3 的子节点算法隐式完成。', '')
md.push('## 1. 提案校验（机器只校验，不代拟名字）', '')
md.push('| # | 旧 treeId | 旧 name | 新 treeId | namespace | 阻塞子项 | 校验 |', '|---|---|---|---|---|---:|---|')
rows.forEach((r) => md.push('| ' + r.seq + ' | `' + r.oldTreeId + '` | ' + r.oldName + ' | `' + r.proposedTreeId + '` | `' +
  (r.namespace ?? '—') + '` | ' + r.blockedChildCount + ' | ' + (r.ok ? '✅' : '❌') + ' |'))
md.push('')
md.push('校验项（逐条）：`oldExists`（活数据存在）· `oldIsHashShape`（确为伪语义祖先形态）· `newShapeOk`（`tree_<小写 slug>`）·')
md.push('`newNoTimestamp`（**⛔ 结果 id 不得带时间戳/hash**）· `newNoSegment`（不得带 `_s<N>_`）· `newNotOccupied`（不与 treeId/池 id/边 id 碰撞）· `isBlocking`（确实阻塞 ≥1 条 BLOCK）。', '')
md.push('| 断言 | 结果 |', '|---|---|')
md.push('| 提案条数 = 7 | ' + (items.length === 7 ? '✅' : '❌') + ' |')
md.push('| 覆盖面**恰好**等于 BLOCK 的最近伪语义祖先集合 | ' + (coverageExact ? '✅' : '❌') + '（期望 ' + expectedAncestors.length + ' 个） |')
md.push('| P0 内部无祖先-后代关系 | ' + (innerAncestorChain.length === 0 ? '✅' : '❌') + ' |')
md.push('| 结果 id 全部无时间戳/hash | ' + (rows.every((r) => r.checks.newNoTimestamp) ? '✅' : '❌') + ' |')
md.push('| 全部无碰撞 | ' + (rows.every((r) => r.checks.newNotOccupied) ? '✅' : '❌') + ' |')
md.push('| 校验结论 | **`' + plan.validation.verdict + '`** |')
md.push('')
if (errors.length) { md.push('⛔ 硬阻塞：'); for (const e of errors) md.push('- ' + e); md.push('') }
md.push('> 覆盖面之所以必须**恰好**相等：多一个就是偷偷扩范围（本批不许把 1521 批次的事拉进来）；少一个就是前置残缺（T3 仍会有 BLOCK 无法解释）。', '')

md.push('## 2. 命名依据（宪法 v1.1：正文语义 > 既有关系 > 名称/tags > 挂载位置）', '')
for (const r of rows) {
  md.push('### ' + r.seq + '. `' + r.oldTreeId + '`「' + r.oldName + '」 → `' + r.proposedTreeId + '`', '')
  md.push('| 证据层级 | 内容 |', '|---|---|')
  const e = r.evidencedBy ?? {}
  md.push('| ① 正文语义 | ' + (e.body ?? '—') + ' |')
  md.push('| ② 既有关系（edges） | ' + (e.edges ?? '—') + ' |')
  md.push('| ③ 名称 / tags | ' + (e.nameTags ?? '—') + ' |')
  md.push('| ④ 挂载位置 | ' + (e.mount ?? '—') + ' |')
  md.push('')
  md.push('- **slug 取舍**：' + (r.slugRationale ?? '—'))
  md.push('- **备选**：' + (r.alternatives.length ? r.alternatives.map((a) => '`' + a + '`').join(' · ') : '—'))
  md.push('- **子项一致性提示**：' + (r.childCoherenceHint ?? '—'))
  md.push('- **它阻塞的子项**（' + r.blockedChildCount + ' 条）：' + (r.blockedChildren.length ? r.blockedChildren.map((c) => c.name).join(' / ') : '—'))
  md.push('')
}

md.push('## 3. T3 133 项 `semanticAncestorGap` 重算（本批的**唯一目的**）', '')
md.push('| 读数 | P0 前 | P0 后 | Δ |', '|---|---:|---:|---:|')
md.push('| HIGH（gap=0，可自动接受） | ' + beforeTier.high + ' | ' + afterTier.high + ' | **+' + (afterTier.high - beforeTier.high) + '** |')
md.push('| MEDIUM（gap 1..3，须人工确认） | ' + beforeTier.medium + ' | ' + afterTier.medium + ' | ' + (afterTier.medium - beforeTier.medium) + ' |')
md.push('| BLOCK（gap>3，不得自动给名） | ' + beforeTier.blocked + ' | ' + afterTier.blocked + ' | **' + (afterTier.blocked - beforeTier.blocked) + '** |')
md.push('| gap 分布 | `' + JSON.stringify(beforeDist) + '` | `' + JSON.stringify(afterDist) + '` | — |')
md.push('')
md.push('**解封 ' + newlyUnblocked.length + ' 条**：`semanticAncestorGap` 由 >3 降为 0，状态由 `blocked` 升为 `pending`（HIGH，可自动接受）。', '')
md.push('| 旧 treeId | name | gap 前 → 后 | 语义祖先（P0 后） |', '|---|---|---|---|')
for (const d of newlyUnblocked) md.push('| `' + d.oldTreeId + '` | ' + d.name + ' | **' + d.gapBefore + ' → ' + d.gapAfter + '** | `' + (d.semAncAfter ?? '—') + '` |')
md.push('')
md.push('**仍 BLOCK 的 ' + stillBlocked.length + ' 条**（不属本批）：')
for (const s of stillBlocked) md.push('- `' + s.oldTreeId + '` ' + s.name + '（gap=' + s.gap + '）')
md.push('')
md.push('**冻结结论**：`frozenMappingProducible` = ' + plan.t3Recompute.frozenMappingProducibleAfterP0 +
  '（P0 后仍需 T3-P1 把 ' + afterTier.medium + ' 条 MEDIUM 逐条确认，并把 ' + afterTier.blocked + ' 条 projection 族另案处置）', '')
md.push('## 4. 子项 id 形态预演（决定 openDecision D1）', '')
md.push('P0 后解封的 ' + childShapePreview.length + ' 条，其命名空间变成**父节点本身**（gap=0）。因此子项最终 id 形态由 T3 冻结映射表的拼接策略决定：', '')
md.push('| 子项 | 父（=新命名空间） | slug | 选项 A：父全名 + slug | 选项 B：父去末段 + slug |', '|---|---|---|---|---|')
for (const c of childShapePreview) md.push('| ' + c.name + ' | `' + c.parentTreeId + '` | `' + c.slug + '` | `' + c.optionA + '` | `' + c.optionB + '` |')
md.push('')
md.push('> ⚠️ **必须看这张表**：选项 A 是层级正确的形式（父即命名空间时），但会暴露 slug 冗余 —— 例如 `RDB持久化` 的'
  + '子项 slug 自带 `rdb_` 前缀，A 形式会得到 `…_rdb_persistence_rdb_save_cmd`。选项 B 会砍掉父名的末段，'
  + '在 `zset` 这类单段父名上几乎等同于「把子项提到 Redis 域」，语义会变宽。**D1 未定，T3 不得冻结映射表。**', '')
md.push('## 5. 明确排除：3 条 projection / colon 族 BLOCK', '')
md.push('| oldTreeId | name | gap | 父节点 | 父 id 族 |', '|---|---|---:|---|---|')
for (const m of plan.scope.blockedItemsOutOfP0) md.push('| `' + m.oldTreeId + '` | ' + m.name + ' | ' + m.gap + ' | ' + (m.parentName ?? '—') + ' | `' + (m.parentTreeId ?? '—') + '` |')
md.push('')
md.push('> 这 3 条的祖先链是：`服务层`（**projection:**\*）→ `结构`（**colon 族**）→ `MySQL Server`（colon 族）→ `MySQL`（**段位** `_s15_`）→ … → `数据库管理`（语义）。')
md.push('> 中间全是 projection / colon / 段位 id，**没有一个是「伪语义 tree 祖先」** → 给它们定名解决不了问题，')
md.push('> 真问题是「这三条 asplit_* 是否该挂在 projection 投影节点下」（挂载点合法性），属**结构批次**，不在 P0，也不在 T3。', '')
md.push('## 6. 引用闭合与预期 diff', '')
md.push('| 项 | 值 |', '|---|---|')
md.push('| 内存克隆改名节点数 | ' + renamed + '（应 = 7） |')
md.push('| 因改名而改写的 `treebind` 边 id | ' + renamedEdgeIds + ' |')
md.push('| 被触碰的边 `source`/`target` | **' + endpointTouched + '**（须 0：本批绝不改边的内容） |')
md.push('| `tree-data.json` 节点数 | ' + treeCountBefore + ' → ' + treeCountAfter + '（Δ' + (treeCountAfter - treeCountBefore) + '） |')
md.push('| `knowledge-edges.json` 边数 | ' + edges.length + ' → ' + cloneEdges.length + '（Δ' + (cloneEdges.length - edges.length) + '） |')
md.push('| `node-pool.json` / `questions.json` | **0 改动** |')
md.push('| 被改名旧 id 的残留（受控原文扫描） | ' + residualRenamedOldIds.length + ' ' + (residualRenamedOldIds.length === 0 ? '✅' : '❌') + ' |')
md.push('')
md.push('## 7. 结论与下一步', '')
md.push('**`' + plan.verdict + '`** · 提案校验 **`' + plan.validation.verdict + '`**', '')
md.push('硬阻塞：' + (plan.hardBlockers.length ? plan.hardBlockers.map((b) => '\n- ' + b).join('') : '无 ✅'))
md.push('')
md.push('下一步：')
md.push('1. 人审 `t3-p0-review.md`：逐条裁决 7 个名字（通过 / 改名 / 另裁）；')
md.push('2. 裁定 openDecision **D1**（子项 id 拼接策略）与 **D2**（域 slug 命名空间是否作为 1521 批次统一约定）；')
md.push('3. 全部 approved 后：`t3-p0` 批次 apply（备份 → 8 闸门 → 落盘 → 独立复验 → 单独提交 `t3-p0-ancestor-semanticization`）；')
md.push('4. apply 后重跑 T3 dry-run，133 项读数应变为 HIGH ' + afterTier.high + ' / MEDIUM ' + afterTier.medium + ' / BLOCK ' + afterTier.blocked + '。')
md.push('')
fs.writeFileSync(path.join(OUT, 't3-p0-report.md'), md.join('\n'), 'utf8')

// ── 复核清单 ───────────────────────────────────────────────────────────────
const rv = []
rv.push('# T3-P0 · 命名复核清单（人工裁决）', '')
rv.push('> **只读批次产物** —— 本清单不产生任何数据变化。本批只改 **7 个 treeId**；`asplit_*` 133 项、池、边内容一个字节都不动。', '')
rv.push('生成时间：' + plan.generatedAt, '')
rv.push('## 裁决规则（宪法 v1.1 命名来源优先级）', '')
rv.push('```text')
rv.push('① 正文语义（card.tabs 里的解释长文）')
rv.push('② 既有关系（knowledge-edges 的 belongs-to / 违反 等）')
rv.push('③ 名称 / tags')
rv.push('④ 挂载位置（路径上的域）')
rv.push('→ 逐级取用；前一级能定住语义时不得用后一级')
rv.push('⛔ 结果 id 不得带时间戳 / hash / _s<N>_ 段位编号（用户对 asplit_s132_base_theory 的裁决）')
rv.push('```')
rv.push('')
rv.push('## 一、7 个名字逐条裁决', '')
rv.push('| # | 旧 treeId | 旧 name | 挂载路径（父级） | 建议新 treeId | namespace | 备选 | 裁决 |')
rv.push('|---|---|---|---|---|---|---|---|')
rows.forEach((r) => {
  rv.push('| ' + r.seq + ' | `' + r.oldTreeId + '` | ' + r.oldName + ' | ' +
    ((r.path ?? '').split(' > ').slice(0, -1).join(' > ') || '—') + ' | **`' + r.proposedTreeId + '`** | `' +
    (r.namespace ?? '—') + '` | ' + (r.alternatives.length ? r.alternatives.map((a) => '`' + a + '`').join('<br>') : '—') +
    ' | ☐ 通过 ☐ 改名 ☐ 另裁 |')
})
rv.push('')
rv.push('### 逐条证据（供裁决时对照）', '')
for (const r of rows) {
  const e = r.evidencedBy ?? {}
  rv.push('#### ' + r.seq + '. 「' + r.oldName + '」 → `' + r.proposedTreeId + '`', '')
  rv.push('- ① **正文**：' + (e.body ?? '—'))
  rv.push('- ② **既有关系**：' + (e.edges ?? '—'))
  rv.push('- ③ **名称/tags**：' + (e.nameTags ?? '—'))
  rv.push('- ④ **挂载位置**：' + (e.mount ?? '—'))
  rv.push('- **slug 取舍**：' + (r.slugRationale ?? '—'))
  rv.push('- **子项一致性提示**：' + (r.childCoherenceHint ?? '—'))
  rv.push('')
}
rv.push('## 二、命名空间约定（openDecision D2）', '')
rv.push('| namespace | 覆盖子树 | 既有先例 | 采纳 |', '|---|---|---|---|')
for (const n of plan.namespaceRegistry) {
  rv.push('| `' + n.ns + '` | ' + n.covers + ' | ' + (n.precedent || []).join('<br>') + ' | ☐ 采纳 ☐ 否 |')
}
rv.push('')
rv.push('> 为什么不直接沿用祖先长 id 机械拼接：祖先长 id 形如 `tree_acm2012_software_notations_tools_programming_languages`，')
rv.push('> 拼接后会得到 `tree_acm2012_…_languages_mutex_lock` 这种**把上上层语义向下继承到一条本不属于它的枝上**的 id，')
rv.push('> 且后续「1521 非语义 id」批次无法共用前缀 → 必然二次改名。')
rv.push('')
rv.push('## 三、子项 id 形态预演（openDecision D1）', '')
rv.push('下表是 P0 后 `gap=0`（命名空间 = 父节点本身）的子项在两种拼接策略下的实际形态。**看清这张表再定 D1**。', '')
rv.push('| 子项 | 父（=命名空间） | 选项 A（父全名+slug） | 选项 B（父去末段+slug） |')
rv.push('|---|---|---|---|')
for (const c of childShapePreview) rv.push('| ' + c.name + ' | `' + c.parentTreeId + '` | `' + c.optionA + '` | `' + c.optionB + '` |')
rv.push('')
rv.push('☐ D1 选 A（层级拼接）   ☐ D1 选 B（去父末段）   ☐ 另裁：')
rv.push('')
rv.push('## 四、apply 的前置条件', '')
rv.push('```text')
rv.push('上述 7 条 adJudication 全部 approved')
rv.push('+ D1 / D2 已裁定')
rv.push('+ 提案校验 = P0_PROPOSAL_VALID（当前 ' + plan.validation.verdict + '）')
rv.push('+ dry-run 硬阻塞 = 0（当前 ' + plan.hardBlockers.length + '）')
rv.push('→ 才可进入 t3-p0 apply')
rv.push('```')
rv.push('')
fs.writeFileSync(path.join(OUT, 't3-p0-review.md'), rv.join('\n'), 'utf8')

console.log('════ T3-P0 · 7 个伪语义祖先 前置语义化 只读 dry-run ════')
console.log('  模式：DRY_RUN_READ_ONLY（data/ 未写入）')
console.log('\n【范围】提案 ' + items.length + ' / 应 7 · T3 133 项台账一致 ' + (scopeOk ? '✅' : '❌'))
console.log('  BLOCK 总数 ' + beforeBlocked.length + ' · 本批覆盖 ' + plan.scope.blockedItemsCoveredByP0 + ' · 排除（projection/colon 族）' + plan.scope.blockedItemsOutOfP0.length)
console.log('  覆盖面恰好相等 ' + (coverageExact ? '✅' : '❌') + ' · P0 内部无祖先后代链 ' + (innerAncestorChain.length === 0 ? '✅' : '❌'))
console.log('\n【提案校验】' + plan.validation.verdict)
rows.forEach((r) => console.log('  ' + (r.ok ? '✅' : '❌') + ' ' + r.oldTreeId + ' 「' + r.oldName + '」 → ' + r.proposedTreeId + '  (阻塞 ' + r.blockedChildCount + ' 条)'))
console.log('\n【T3 133 项 gap 重算】')
console.log('  gap 分布  ' + JSON.stringify(beforeDist) + '  →  ' + JSON.stringify(afterDist))
console.log('  HIGH      ' + beforeTier.high + ' → ' + afterTier.high + '  (+' + (afterTier.high - beforeTier.high) + ')')
console.log('  MEDIUM    ' + beforeTier.medium + ' → ' + afterTier.medium)
console.log('  BLOCK     ' + beforeTier.blocked + ' → ' + afterTier.blocked + '  (' + (afterTier.blocked - beforeTier.blocked) + ')')
console.log('  解封 ' + newlyUnblocked.length + ' 条（gap >3 → 0，blocked → HIGH 可自动接受）')
console.log('  冻结可生产 frozenMappingProducible = ' + plan.t3Recompute.frozenMappingProducibleAfterP0)
console.log('\n【引用闭合 / 预期 diff】')
console.log('  改名节点 ' + renamed + ' · treebind 边 id 改写 ' + renamedEdgeIds + ' · 边 endpoint 触碰 ' + endpointTouched + '（须 0）')
console.log('  tree 节点数 ' + treeCountBefore + ' → ' + treeCountAfter + ' · edges ' + edges.length + ' → ' + cloneEdges.length)
console.log('  被改名旧 id 残留 ' + residualRenamedOldIds.length + (residualRenamedOldIds.length === 0 ? ' ✅' : ' ❌'))
console.log('\n【结论】' + plan.verdict + (plan.hardBlockers.length ? '' : ' / 提案 ' + plan.validation.verdict))
for (const b of plan.hardBlockers) console.log('  ⛔ ' + b)
console.log('\n【待人工裁决】7 个名字逐条 + openDecision D1（子项 id 拼接策略）/ D2（域 slug 命名空间是否作为 1521 批次统一约定）')
console.log('产物：t3-p0-dryrun-plan.json · t3-p0-report.md · t3-p0-review.md')
process.exit(plan.hardBlockers.length === 0 ? 0 : 1)
