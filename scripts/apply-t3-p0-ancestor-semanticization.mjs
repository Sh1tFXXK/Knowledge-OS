/**
 * T3-P0 APPLY · 7 个「伪语义祖先」的前置语义化
 *
 * 本批**只做一件事**：把 7 个形如 `tree_<时间戳>_<hash>` 的祖先 treeId 改成语义 slug。
 * 目的不是「整理命名」，而是**解除 T3 那 24 条 BLOCK 的根因** —— 它们的直接父节点自己还没被语义化。
 *
 * 模式：
 *   node scripts/apply-t3-p0-ancestor-semanticization.mjs --freeze    冻结基线（记录 data md5 + 末尾换行）
 *   node scripts/apply-t3-p0-ancestor-semanticization.mjs             预检（闸门 + 内存模拟 + 不变性断言），不写盘
 *   node scripts/apply-t3-p0-ancestor-semanticization.mjs --apply     真正写盘（写前备份 + 写后复验）
 *
 * 设计原则（与 apply-phase1.mjs 同源）：
 *   ① preflight 与 apply 走**同一个** applyRenames()，杜绝「预演与落盘逻辑不一致」。
 *   ② 原子写 + Windows EPERM 回退 + 保留末尾换行状态（避免格式漂移污染 diff）。
 *   ③ 批次可追踪性只进 evolution-event / journal / 报告，**不进 entity id**。
 *
 * ⛔ 硬纪律（违反即幻觉）
 *   ① 本批**只改 treeId**：不改池实体、不改边内容、不增删节点/边、不动 questions.json。
 *   ② 名字由**人**给（proposal.json，已 APPROVED_BY_HUMAN）—— 脚本不代拟、不改名。
 *   ③ **结构不变性**必须逐节点 / 逐边证明：除 `id` 外所有字段逐字节相同，边 `source`/`target` 零触碰。
 *   ④ **覆盖面恰好**：7 个 old id ≡ BLOCK 的最近伪语义祖先集合，不多不少。
 *   ⑤ T3 的 gap 谓词必须与 dry-run **逐字同源**，否则前后读数不可比（本批的唯一可验收产出就是那组读数）。
 *   ⑥ 判据不产出 `action`/`autoFix` —— 本脚本只做「落盘 + 复验」，判定权在治理规则阶段（ADR-0002）。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const BASELINE_PATH = path.join(OUT_DIR, 't3-p0-apply-baseline.json')

const argv = process.argv.slice(2)
const hasFlag = (f) => argv.includes(f)
const MODE = hasFlag('--apply') ? 'apply' : hasFlag('--freeze') ? 'freeze' : 'preflight'

const WRITE_FILES = ['tree-data.json', 'knowledge-edges.json', 'evolution-events.json']
const READ_FILES = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']

const rd = (f) => fs.readFileSync(path.join(DATA, f), 'utf8')
const rdJson = (f) => JSON.parse(rd(f))
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')
const clone = (x) => JSON.parse(JSON.stringify(x))

/** 原子写 + Windows EPERM 回退 + tmp 清理；保留原文件末尾换行状态，避免格式漂移。 */
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

// ══════════════════════════════════════════════════════════════════════
// ① gap 谓词 —— **逐字同源**于 scripts/dryrun-t3-asplit-semanticization.mjs
//    改任何一个字符都必须同步改那边，否则前后读数不可比。
// ══════════════════════════════════════════════════════════════════════
const TREE_SHAPE = /^tree_[a-z0-9_]+$/
const isHashTreeId = (id) => TREE_SHAPE.test(id) && (/^tree_\d{10,}/.test(id) || /\d{10,}/.test(id))
const isSegmentTreeId = (id) => TREE_SHAPE.test(id) && /_s\d+(_|$)/.test(id)
const isSemanticTreeId = (id) => TREE_SHAPE.test(id) && !isHashTreeId(id) && !isSegmentTreeId(id)
const slugOf = (nodeRef) => String(nodeRef ?? '')
  .replace(/^asplit_s\d+_asplit_/, '').replace(/^asplit_s\d+_/, '').replace(/^asplit_/, '')
  .replace(/[^a-z0-9_]/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()

const buildIndex = (t) => {
  const nodes = new Map(), parentOf = new Map(), ancOf = new Map(), pathOf = new Map()
  const walk = (n, anc, names) => {
    nodes.set(n.id, n)
    parentOf.set(n.id, anc.length ? anc[anc.length - 1] : null)
    ancOf.set(n.id, [...anc])
    pathOf.set(n.id, [...names, n.name ?? '(无名)'].join(' > '))
    for (const c of n.children || []) walk(c, [...anc, n.id], [...names, n.name ?? '(无名)'])
  }
  walk(t, [], [])
  return { nodes, parentOf, ancOf, pathOf }
}

const evalItem = (idx, id) => {
  const n = idx.nodes.get(id)
  if (!n) return null
  const anc = idx.ancOf.get(id) ?? []
  const semAnc = [...anc].reverse().find((a) => isSemanticTreeId(a)) ?? null
  const gap = semAnc ? anc.length - 1 - anc.lastIndexOf(semAnc) : null
  const slug = slugOf(n.nodeRef)
  let status
  if (!slug) status = 'needs-adjudication'
  else if (!semAnc) status = 'blocked'
  else if (gap === 0) status = 'pending'
  else if (gap <= 3) status = 'needs-review'
  else status = 'blocked'
  return { oldTreeId: id, name: n.name ?? null, semanticAncestor: semAnc, semanticAncestorGap: gap, slug, status }
}

const tierOf = (items) => ({
  high: items.filter((m) => m.semanticAncestorGap === 0 && m.slug).length,
  medium: items.filter((m) => m.semanticAncestorGap >= 1 && m.semanticAncestorGap <= 3).length,
  blocked: items.filter((m) => m.semanticAncestorGap === null || m.semanticAncestorGap > 3).length,
})
const dist = (items) => {
  const d = {}
  for (const m of items) { const k = m.semanticAncestorGap ?? 'none'; d[k] = (d[k] || 0) + 1 }
  return d
}
const tier1Of = (idx) => [...idx.nodes.keys()].filter((id) => /^asplit_/.test(id))

// ══════════════════════════════════════════════════════════════════════
// ② 唯一操作实现：preflight 与 apply 共用
// ══════════════════════════════════════════════════════════════════════
const TB_RE = /^treebind:(.+?):(.+)$/
const rewriteTreebindId = (id, m) => {
  const mm = TB_RE.exec(String(id ?? ''))
  if (!mm) return String(id ?? '')
  return 'treebind:' + (m.get(mm[1]) ?? mm[1]) + ':' + (m.get(mm[2]) ?? mm[2])
}

/** 就地改写：树节点 id + treebind 边 id。**只碰 id 字段**。 */
function applyRenames(ds, pairs) {
  const m = new Map(pairs.map((p) => [p.oldTreeId, p.proposedTreeId]))
  let renamedNodes = 0
  ;(function walk(n) {
    if (m.has(n.id)) { n.id = m.get(n.id); renamedNodes += 1 }
    for (const c of n.children || []) walk(c)
  })(ds.tree)

  let renamedEdgeIds = 0
  const edgeIdChanges = []
  for (const e of ds.edges) {
    const next = rewriteTreebindId(e.id, m)
    if (next !== e.id) { edgeIdChanges.push({ from: e.id, to: next }); e.id = next; renamedEdgeIds += 1 }
  }
  return { renamedNodes, renamedEdgeIds, edgeIdChanges, renameMap: m }
}

/** 结构不变性：树逐节点，除 id 外所有字段逐字节相同；子节点数与顺序不变。 */
function compareTree(before, after, m, errs = [], p = '$root') {
  if (!before || !after) { errs.push(p + '：结构不齐'); return errs }
  const expId = m.get(before.id) ?? before.id
  if (after.id !== expId) errs.push(p + '：id `' + before.id + '` → 期望 `' + expId + '` 实得 `' + after.id + '`')
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (k === 'id' || k === 'children') continue
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) errs.push(p + '：非 id 字段 `' + k + '` 被改动')
  }
  const bc = before.children ?? [], ac = after.children ?? []
  if (bc.length !== ac.length) { errs.push(p + '：子节点数 ' + bc.length + ' → ' + ac.length); return errs }
  bc.forEach((c, i) => compareTree(c, ac[i], m, errs, p + ' > ' + (c.name ?? '#' + i)))
  return errs
}

/** 结构不变性：边逐条（按数组下标对齐，顺序不得变），除 id 外所有字段逐字节相同。 */
function compareEdges(before, after, m, errs = []) {
  if (before.length !== after.length) { errs.push('边数 ' + before.length + ' → ' + after.length); return errs }
  for (let i = 0; i < before.length; i += 1) {
    const x = before[i], y = after[i]
    const expId = rewriteTreebindId(x.id, m)
    if (y.id !== expId) errs.push('#' + i + '：id 期望 `' + expId + '` 实得 `' + y.id + '`')
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (k === 'id') continue
      if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) errs.push('#' + i + '：非 id 字段 `' + k + '` 被改动')
    }
  }
  return errs
}

const countNodes = (n) => 1 + (n.children ?? []).reduce((s, c) => s + countNodes(c), 0)
const tgCount = (tree, pool) => { let n = 0; (function w(x) { if (x.nodeRef && !pool[x.nodeRef]) n += 1; (x.children || []).forEach(w) })(tree); return n }

// ══════════════════════════════════════════════════════════════════════
// ③ 闸门
// ══════════════════════════════════════════════════════════════════════
const GATES = []
const gate = (id, name, ok, detail) => GATES.push({ id, name, ok: !!ok, detail })

async function main() {
  const present = {}
  for (const f of READ_FILES) present[f] = rd(f)
  const md5Now = {}, trailNow = {}
  for (const [f, txt] of Object.entries(present)) { md5Now[f] = md5(txt); trailNow[f] = txt.endsWith('\n') }

  // ── freeze：冻结基线 ─────────────────────────────────────────────────
  if (MODE === 'freeze') {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({
      frozenAt: new Date().toISOString(),
      batch: 't3-p0-apply',
      dataMd5: md5Now, dataTrailingNewline: trailNow,
      note: 'T3-P0 apply 前的数据基线。G2 用它挡住「冻结之后数据被人改过」。',
    }, null, 2) + '\n', 'utf8')
    console.log('基线已冻结：' + path.relative(ROOT, BASELINE_PATH))
    for (const f of Object.keys(md5Now)) console.log('  ' + f.padEnd(24) + md5Now[f].slice(0, 12) + '  trailingNL=' + trailNow[f])
    return
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error('✖ 未找到基线。请先运行：node scripts/apply-t3-p0-ancestor-semanticization.mjs --freeze')
    process.exitCode = 2
    return
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
  const proposal = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 't3-p0-naming.proposal.json'), 'utf8'))
  const items = proposal.items ?? []

  const ds0 = { tree: JSON.parse(present['tree-data.json']), pool: JSON.parse(present['node-pool.json']), edges: JSON.parse(present['knowledge-edges.json']) }

  // ── G1 提案已获人工批准 + D1/D2 已裁定 ────────────────────────────────
  const unapproved = items.filter((x) => !/^✅/.test(String(x.adjudication ?? '')))
  const undecided = (proposal.openDecisions ?? []).filter((d) => d.status !== 'DECIDED')
  gate('G1', '提案 7 条均已人工批准 ∧ D1/D2 已裁定',
    proposal.status === 'APPROVED_BY_HUMAN' && unapproved.length === 0 && undecided.length === 0 && items.length === 7,
    'proposal.status=' + proposal.status + ' · 未批准 ' + unapproved.length + ' 条 · 未裁定决策 ' + undecided.length + ' 项')

  // ── G2 数据 md5 与冻结基线一致 ───────────────────────────────────────
  const drift = Object.keys(baseline.dataMd5).filter((f) => baseline.dataMd5[f] !== md5Now[f])
  gate('G2', '数据文件 md5 与冻结基线一致（无人改过数据）', drift.length === 0,
    drift.length ? '漂移：' + drift.join(', ') : Object.keys(baseline.dataMd5).length + ' 个文件全部一致')

  // ── G3 old id 存在且确为「伪语义祖先」形态 ───────────────────────────
  const idx0 = buildIndex(ds0.tree)
  const badOld = []
  for (const x of items) {
    if (!idx0.nodes.has(x.oldTreeId)) badOld.push(x.oldTreeId + ' 不存在')
    else if (!isHashTreeId(x.oldTreeId)) badOld.push(x.oldTreeId + ' 不是伪语义形态')
  }
  gate('G3', '7 个 old treeId 存在且均为伪语义形态', badOld.length === 0, badOld.join(' | ') || items.length + ' 个全部命中')

  // ── G4 new id 形态 / 唯一 / 无碰撞 ───────────────────────────────────
  const occTree = new Set(idx0.nodes.keys())
  const occPool = new Set(Object.keys(ds0.pool))
  const occEdge = new Set(ds0.edges.map((e) => e.id))
  const oldSet = new Set(items.map((x) => x.oldTreeId))
  const badNew = []
  const newSeen = new Set()
  for (const x of items) {
    const n = x.proposedTreeId ?? ''
    if (!TREE_SHAPE.test(n)) badNew.push(n + ' 形态非法')
    if (isHashTreeId(n)) badNew.push(n + ' ⛔ 带时间戳/hash')
    if (isSegmentTreeId(n)) badNew.push(n + ' ⛔ 带段位编号')
    if (newSeen.has(n)) badNew.push(n + ' 批内重复')
    newSeen.add(n)
    // 碰撞检查要**排除被本批改名而释放出来的 old id**（它们即将不存在）
    if (!oldSet.has(n) && (occTree.has(n) || occPool.has(n) || occEdge.has(n))) badNew.push(n + ' 与既有 treeId/池 id/边 id 碰撞')
  }
  gate('G4', '7 个 new treeId 形态合法 ∧ 批内唯一 ∧ 无碰撞', badNew.length === 0, badNew.join(' | ') || items.map((x) => x.proposedTreeId).join(' · '))

  // ── 覆盖面恰好相等（防扩范围 / 防前置残缺）─────────────────────────────
  const beforeItems = tier1Of(idx0).map((id) => evalItem(idx0, id)).filter(Boolean)
  const beforeBlocked = beforeItems.filter((m) => m.status === 'blocked')
  const nearestPseudoOf = (m) => {
    const anc = idx0.ancOf.get(m.oldTreeId) ?? []
    const pseudos = anc.filter((a) => isHashTreeId(a))
    return pseudos.length ? pseudos[pseudos.length - 1] : null
  }
  const expectedOld = [...new Set(beforeBlocked.map(nearestPseudoOf).filter(Boolean))].sort()
  const coverageExact = JSON.stringify([...oldSet].sort()) === JSON.stringify(expectedOld)
  gate('G5', '覆盖面**恰好** = BLOCK 的最近伪语义祖先集合', coverageExact && beforeItems.length === 133,
    '提案 ' + oldSet.size + ' vs 期望 ' + expectedOld.length + ' · 缺失 ' + JSON.stringify(expectedOld.filter((x) => !oldSet.has(x))) +
    ' · 多余 ' + JSON.stringify([...oldSet].filter((x) => !expectedOld.includes(x))) + ' · T3 项数 ' + beforeItems.length + '（须 133）')

  // ── 预演：克隆体上跑同一套操作 ────────────────────────────────────────
  const dsSim = clone(ds0)
  const sim = applyRenames(dsSim, items)
  const pairs = items.map((x) => ({ oldTreeId: x.oldTreeId, proposedTreeId: x.proposedTreeId }))
  const m = sim.renameMap

  const treeErrs = compareTree(ds0.tree, dsSim.tree, m)
  const edgeErrs = compareEdges(ds0.edges, dsSim.edges, m)
  const endpointTouched = dsSim.edges.filter((e, i) => e.source !== ds0.edges[i].source || e.target !== ds0.edges[i].target).length

  gate('G6', '结构不变性：树逐节点 / 边逐条，除 id 外逐字节相同',
    treeErrs.length === 0 && edgeErrs.length === 0 && endpointTouched === 0 && sim.renamedNodes === 7,
    (treeErrs.length || edgeErrs.length || endpointTouched
      ? ['树差异 ' + treeErrs.length, '边差异 ' + edgeErrs.length, 'endpoint 被触碰 ' + endpointTouched].join(' · ')
      : '树 ' + countNodes(ds0.tree) + ' 节点、边 ' + ds0.edges.length + ' 条全部通过（仅 id 变动）') +
    ' · 改名节点 ' + sim.renamedNodes + '/7 · treebind id 改写 ' + sim.renamedEdgeIds)

  // ── G7 引用闭合：全 data 无旧 id 残留 ─────────────────────────────────
  const blobSim = JSON.stringify(dsSim.tree) + JSON.stringify(dsSim.edges)
  const residualSim = [...oldSet].filter((id) => blobSim.includes(id))
  gate('G7', '引用闭合：改名后全数据无旧 id 残留', residualSim.length === 0 && countNodes(dsSim.tree) === countNodes(ds0.tree),
    residualSim.length ? '残留 ' + residualSim.join(', ') : '残留 0 · 节点数 ' + countNodes(ds0.tree) + ' 不变 · 边数 ' + ds0.edges.length + ' 不变')

  // ── G8 本批名副其实：T3 133 项读数必须变成 92 / 38 / 3 ─────────────────
  const idxSim = buildIndex(dsSim.tree)
  const afterItems = tier1Of(idxSim).map((id) => evalItem(idxSim, id)).filter(Boolean)
  const beforeTier = tierOf(beforeItems), afterTier = tierOf(afterItems)
  const readingsOk = afterTier.high === 92 && afterTier.medium === 38 && afterTier.blocked === 3 && afterItems.length === 133
  gate('G8', '本批目的达成：T3 133 项读数 = HIGH 92 / MEDIUM 38 / BLOCK 3', readingsOk,
    'HIGH ' + beforeTier.high + '→' + afterTier.high + ' · MEDIUM ' + beforeTier.medium + '→' + afterTier.medium +
    ' · BLOCK ' + beforeTier.blocked + '→' + afterTier.blocked + ' · 分布 ' + JSON.stringify(dist(beforeItems)) + ' → ' + JSON.stringify(dist(afterItems)))

  // ── G9 dev server 写入安全 ───────────────────────────────────────────
  let dev = { running: false }
  try {
    const r = await fetch('http://[::1]:5173/', { signal: AbortSignal.timeout(3000) })
    const t = await r.text()
    dev = { running: true, isViteDev: /@vite\/client/.test(t) }
  } catch { /* 未运行 */ }
  gate('G9', 'dev server 不会静默覆盖本次写入', !dev.running || !dev.isViteDev,
    !dev.running ? '5173 未监听' : dev.isViteDev ? '⛔ 5173 是 vite dev（内存持有数据，会回写覆盖）—— 必须先杀' : '5173 在监听但非 vite dev')

  const failed = GATES.filter((g) => !g.ok)

  // ══ 执行 ═══════════════════════════════════════════════════════════
  let backupDir = null
  let realVerification = null
  if (MODE === 'apply') {
    if (failed.length) {
      console.log('✖ 闸门未全绿，ABORT，未写盘：' + failed.map((g) => g.id).join(', '))
      process.exitCode = 3
    } else {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      backupDir = path.join(DATA, 'backups', 't3-p0-' + stamp)
      fs.mkdirSync(backupDir, { recursive: true })
      for (const f of READ_FILES) fs.copyFileSync(path.join(DATA, f), path.join(backupDir, f))

      // ⚠️ 在**真实数据**上重跑同一套操作（不复用克隆结果），保证 apply 只依赖盘上真值
      const dsReal = { tree: rdJson('tree-data.json'), pool: rdJson('node-pool.json'), edges: rdJson('knowledge-edges.json') }
      const real = applyRenames(dsReal, items)

      // 写后复验：真实结果也必须逐字节满足同样的不变性（不信任克隆结论）
      const realTreeErrs = compareTree(ds0.tree, dsReal.tree, real.renameMap)
      const realEdgeErrs = compareEdges(ds0.edges, dsReal.edges, real.renameMap)
      const realResidual = [...oldSet].filter((id) => (JSON.stringify(dsReal.tree) + JSON.stringify(dsReal.edges)).includes(id))
      const realIdx = buildIndex(dsReal.tree)
      const realTier = tierOf(tier1Of(realIdx).map((id) => evalItem(realIdx, id)).filter(Boolean))
      realVerification = {
        renamedNodes: real.renamedNodes, renamedEdgeIds: real.renamedEdgeIds,
        treeErrors: realTreeErrs, edgeErrors: realEdgeErrs, residualOldIds: realResidual,
        verdict: realTreeErrs.length === 0 && realEdgeErrs.length === 0 && realResidual.length === 0 && real.renamedNodes === 7 ? 'REAL_APPLY_VERIFIED' : 'REAL_APPLY_FAILED',
      }

      // evolution-event：批次可追踪性只放这里，不进 entity id
      const evoPath = path.join(DATA, 'evolution-events.json')
      const evo = JSON.parse(present['evolution-events.json'])
      const chains = items.map((x) => [...(idx0.ancOf.get(x.oldTreeId) ?? []), x.oldTreeId])
      let common = chains[0] ?? []
      for (const c of chains.slice(1)) { let i = 0; while (i < common.length && i < c.length && common[i] === c[i]) i += 1; common = common.slice(0, i) }
      const scopeTid = common.length ? common[common.length - 1] : null
      const scopeRootId = scopeTid ? (idx0.nodes.get(scopeTid)?.nodeRef ?? null) : null
      evo.push({
        id: 'event:tree-refactor:t3-p0:' + Date.now(),
        scopeRootId,
        occurredAt: Date.now(),
        title: 'T3-P0：7 个伪语义祖先的前置语义化（treeId 改名，零结构变更）',
        summary: '把 7 个形如 tree_<时间戳>_<hash> 的树节点 id 改为语义 slug（tree_java_lock_ / tree_java_jmm_ / tree_java_syntax_ / tree_redis_ 四组命名空间）。'
          + '仅改 treeId 与被其牵连的 ' + real.renamedEdgeIds + ' 条 treebind 边 id；池实体、边内容、节点/边数量全部不变。'
          + '目的是解除 T3 那 24 条 BLOCK 的根因（它们的直接父节点未语义化 → semanticAncestorGap > 3），'
          + '改后 T3 133 项读数由 HIGH ' + beforeTier.high + ' / MEDIUM ' + beforeTier.medium + ' / BLOCK ' + beforeTier.blocked
          + ' 变为 HIGH ' + afterTier.high + ' / MEDIUM ' + afterTier.medium + ' / BLOCK ' + afterTier.blocked + '。'
          + '命名规范 tree_<domain>_<semantic-slug>；domain 只是 ID 命名空间，不是 ontology 判定。',
        sourceOnlyNodeIds: [],
        introducedNodes: [],
        changes: items.map((x) => ({
          targetNodeId: idx0.nodes.get(x.oldTreeId)?.nodeRef ?? null,
          facet: 'structure',
          before: 'treeId `' + x.oldTreeId + '`（形如 tree_<时间戳>_<hash>，伪语义）· 路径：' + (idx0.pathOf.get(x.oldTreeId) ?? '—'),
          after: 'treeId `' + x.proposedTreeId + '`（语义 slug，命名空间 `' + (x.namespace ?? '—') + '`）· 路径不变：' + (idx0.pathOf.get(x.oldTreeId) ?? '—'),
        })),
      })
      writeJsonKeepFormat(evoPath, evo, trailNow['evolution-events.json'])
      writeJsonKeepFormat(path.join(DATA, 'tree-data.json'), dsReal.tree, trailNow['tree-data.json'])
      writeJsonKeepFormat(path.join(DATA, 'knowledge-edges.json'), dsReal.edges, trailNow['knowledge-edges.json'])
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // ④ 报告
  // ══════════════════════════════════════════════════════════════════
  const L = []
  const add = (s) => L.push(s)
  add('# T3-P0 · 7 个伪语义祖先前置语义化 —— ' + (MODE === 'apply' ? 'APPLY 执行报告' : '预检报告（未写盘）'), '')
  add('> 模式 `' + MODE + '`' + (backupDir ? ' · 备份 `' + path.relative(ROOT, backupDir) + '`' : ' · **未写盘**'))
  add('> 生成时间 ' + new Date().toISOString(), '')
  add('## 0. 闸门', '')
  add('| 闸门 | 检查项 | 结果 | 依据 |', '|---|---|---|---|')
  for (const g of GATES) add('| `' + g.id + '` | ' + g.name + ' | ' + (g.ok ? '✅' : '❌') + ' | ' + g.detail + ' |')
  add('')
  add(failed.length === 0 ? '**闸门全绿（' + GATES.length + '/' + GATES.length + '）**' : '**❌ ' + failed.length + ' 项未过：' + failed.map((g) => g.id).join(', ') + ' → ' + (MODE === 'apply' ? '已 ABORT，未写盘' : '不允许 APPLY') + '**')
  add('')
  add('## 1. 改名对照（7 条）', '')
  add('| # | 旧 treeId | 旧 name | 新 treeId | 命名空间 | 路径 |', '|---|---|---|---|---|---|')
  items.forEach((x, i) => add('| ' + (i + 1) + ' | `' + x.oldTreeId + '` | ' + x.oldName + ' | **`' + x.proposedTreeId + '`** | `' + (x.namespace ?? '—') + '` | ' + (idx0.pathOf.get(x.oldTreeId) ?? '—') + ' |'))
  add('')
  add('## 2. 结构不变性证明（本批的核心安全断言）', '')
  add('| 断言 | 结果 |', '|---|---|')
  add('| 树逐节点：除 `id` 外所有字段逐字节相同 | ' + (treeErrs.length === 0 ? '✅ ' + countNodes(ds0.tree) + ' 节点全通过' : '❌ ' + treeErrs.length + ' 处') + ' |')
  add('| 边逐条：除 `id` 外所有字段逐字节相同、顺序不变 | ' + (edgeErrs.length === 0 ? '✅ ' + ds0.edges.length + ' 条全通过' : '❌ ' + edgeErrs.length + ' 处') + ' |')
  add('| 边 `source` / `target` 被触碰 | **' + endpointTouched + '**（须 0） |')
  add('| 树节点数 | ' + countNodes(ds0.tree) + ' → ' + countNodes(dsSim.tree) + ' |')
  add('| 边数 | ' + ds0.edges.length + ' → ' + dsSim.edges.length + ' |')
  add('| 池节点数 | ' + Object.keys(ds0.pool).length + '（本批不改池） |')
  add('| 悬空 nodeRef | ' + tgCount(ds0.tree, ds0.pool) + ' → ' + tgCount(dsSim.tree, dsSim.pool) + ' |')
  add('| 旧 id 残留（树 + 边序列化全文扫描） | ' + residualSim.length + ' ' + (residualSim.length === 0 ? '✅' : '❌') + ' |')
  add('')
  add('## 3. treebind 边 id 改写（' + sim.renamedEdgeIds + ' 条）', '')
  add('> 只改 `id` 字符串（`treebind:<父tid>:<子tid>`）中被改名的部分；边的 `source`/`target` 是**池 ref**，不受 treeId 改名影响。')
  add('')
  add('| # | 旧边 id | 新边 id |', '|---|---|---|')
  sim.edgeIdChanges.forEach((c, i) => add('| ' + (i + 1) + ' | `' + c.from + '` | `' + c.to + '` |'))
  add('')
  add('## 4. T3 133 项 `semanticAncestorGap` 重算（本批的唯一目的）', '')
  add('| 读数 | 本批前 | 本批后 | Δ |', '|---|---:|---:|---:|')
  add('| HIGH（gap=0，可自动接受） | ' + beforeTier.high + ' | ' + afterTier.high + ' | **+' + (afterTier.high - beforeTier.high) + '** |')
  add('| MEDIUM（gap 1..3，须人工确认） | ' + beforeTier.medium + ' | ' + afterTier.medium + ' | ' + (afterTier.medium - beforeTier.medium) + ' |')
  add('| BLOCK（gap>3，不得自动给名） | ' + beforeTier.blocked + ' | ' + afterTier.blocked + ' | **' + (afterTier.blocked - beforeTier.blocked) + '** |')
  add('| gap 分布 | `' + JSON.stringify(dist(beforeItems)) + '` | `' + JSON.stringify(dist(afterItems)) + '` | — |')
  add('')
  add('**仍 BLOCK 的 ' + afterTier.blocked + ' 条**（不属本批，属挂载点合法性 → 结构批次）：')
  for (const m2 of afterItems.filter((x) => x.status === 'blocked')) add('- `' + m2.oldTreeId + '` ' + m2.name)
  add('')
  add('## 5. journal（机器可读）', '')
  add('```json')
  add(JSON.stringify({ batch: 't3-p0-apply', mode: MODE, pairs, renamedNodes: sim.renamedNodes, renamedEdgeIds: sim.renamedEdgeIds, backupDir, realVerification }, null, 2))
  add('```')
  add('')
  const txt = L.join('\n')
  const outMd = path.join(OUT_DIR, MODE === 'apply' ? 't3-p0-apply-report.md' : 't3-p0-apply-preflight.md')
  fs.writeFileSync(outMd, txt, 'utf8')
  fs.writeFileSync(path.join(OUT_DIR, 't3-p0-apply-plan.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), mode: MODE, wroteData: MODE === 'apply', batch: 't3-p0-apply',
    gates: GATES, pairs, renamedNodes: sim.renamedNodes, renamedEdgeIds: sim.renamedEdgeIds,
    edgeIdChanges: sim.edgeIdChanges,
    treeErrors: treeErrs, edgeErrors: edgeErrs, endpointTouched, residualOldIds: residualSim,
    beforeTier, afterTier, gapDistBefore: dist(beforeItems), gapDistAfter: dist(afterItems),
    stillBlocked: afterItems.filter((x) => x.status === 'blocked').map((x) => ({ treeId: x.oldTreeId, name: x.name })),
    backupDir, realVerification,
  }, null, 2) + '\n', 'utf8')

  console.log('════ T3-P0 · 7 个伪语义祖先 前置语义化 ' + (MODE === 'apply' ? 'APPLY' : '预检') + ' ════')
  console.log('  模式：' + MODE + (MODE === 'apply' ? '（已写盘' + (backupDir ? '，备份 ' + path.relative(ROOT, backupDir) : '') + '）' : '（未写盘）'))
  console.log('\n【闸门】' + (GATES.length - failed.length) + '/' + GATES.length + (failed.length ? ' ❌ ' + failed.map((g) => g.id).join(', ') : ' ✅'))
  for (const g of GATES) console.log('  ' + (g.ok ? '✅' : '❌') + ' ' + g.id + ' ' + g.name)
  console.log('\n【结构不变性】树差异 ' + treeErrs.length + ' · 边差异 ' + edgeErrs.length + ' · endpoint 触碰 ' + endpointTouched + (treeErrs.length + edgeErrs.length + endpointTouched === 0 ? ' ✅' : ' ❌'))
  console.log('  改名节点 ' + sim.renamedNodes + '/7 · treebind id 改写 ' + sim.renamedEdgeIds + ' · 旧 id 残留 ' + residualSim.length)
  console.log('  树 ' + countNodes(ds0.tree) + ' 节点 · 边 ' + ds0.edges.length + ' 条（均不变）')
  console.log('\n【T3 133 项重算】')
  console.log('  HIGH   ' + beforeTier.high + ' → ' + afterTier.high + '  (+' + (afterTier.high - beforeTier.high) + ')')
  console.log('  MEDIUM ' + beforeTier.medium + ' → ' + afterTier.medium)
  console.log('  BLOCK  ' + beforeTier.blocked + ' → ' + afterTier.blocked)
  if (realVerification) console.log('\n【写后复验（真实数据）】' + realVerification.verdict + ' · 树差异 ' + realVerification.treeErrors.length + ' · 边差异 ' + realVerification.edgeErrors.length + ' · 残留 ' + realVerification.residualOldIds.length)
  console.log('\n产物：' + path.relative(ROOT, outMd) + ' · t3-p0-apply-plan.json')
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch((e) => { console.error('✖ ' + e.message); console.error(e.stack); process.exitCode = 1 })
