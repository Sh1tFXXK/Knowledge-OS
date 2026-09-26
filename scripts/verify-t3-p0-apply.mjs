/**
 * T3-P0 apply 之后的**独立验证**（不写 data/）
 *
 * 独立性的定义（三条，缺一条就不算独立）：
 *   ① **不 import 也不复制** apply 脚本的任何函数 —— 本文件自己实现比对逻辑。
 *   ② 比对对象是**磁盘上的批前备份快照** vs **当前工作树数据**，不是内存克隆、不是被验证脚本自报的结果。
 *   ③ 改名映射**从数据里反推**（新旧树按位置对撞，位置相同而 id 不同者即为改名对），
 *      再与提案声明的 7 对**双向核对** —— 而不是先信提案再去找证据。
 *
 * 用法：node scripts/verify-t3-p0-apply.mjs
 * 退出码：0 = 全部通过；1 = 有断言失败
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')

const rdData = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))
const rdRaw = (f) => fs.readFileSync(path.join(DATA, f), 'utf8')

// ── 找最新的 t3-p0 备份（批前快照）────────────────────────────────────────
const backups = fs.existsSync(path.join(DATA, 'backups'))
  ? fs.readdirSync(path.join(DATA, 'backups')).filter((d) => /^t3-p0-/.test(d)).sort()
  : []
if (!backups.length) { console.error('✖ 找不到 data/backups/t3-p0-* 批前快照，无法做独立比对'); process.exit(1) }
const BACKUP_DIR = path.join(DATA, 'backups', backups[backups.length - 1])
const rdBackup = (f) => JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'))

const checks = []
const chk = (name, ok, detail) => checks.push({ name, ok: !!ok, detail })

// ══ ① 树：位置对撞，反推改名映射 ═══════════════════════════════════════════
const tBefore = rdBackup('tree-data.json')
const tAfter = rdData('tree-data.json')

const observedPairs = []          // [{from,to,path}]
const treeDiffs = []              // 非 id 字段的差异
let nodeCountBefore = 0, nodeCountAfter = 0

function walkPair(a, b, p) {
  if (!a || !b) { treeDiffs.push(p + '：结构不齐'); return }
  nodeCountBefore += 1; nodeCountAfter += 1
  if (a.id !== b.id) observedPairs.push({ from: a.id, to: b.id, path: p })
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'id' || k === 'children') continue
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) treeDiffs.push(p + '：字段 `' + k + '` 变了（' + JSON.stringify(a[k]) + ' → ' + JSON.stringify(b[k]) + '）')
  }
  const ac = a.children ?? [], bc = b.children ?? []
  if (ac.length !== bc.length) { treeDiffs.push(p + '：子节点数 ' + ac.length + ' → ' + bc.length); return }
  ac.forEach((c, i) => walkPair(c, bc[i], p + ' > ' + (c.name ?? '#' + i)))
}
walkPair(tBefore, tAfter, '$root')

chk('树：节点数不变', nodeCountBefore === nodeCountAfter, nodeCountBefore + ' → ' + nodeCountAfter)
chk('树：除 id 外所有字段逐字节不变', treeDiffs.length === 0, treeDiffs.length ? treeDiffs.slice(0, 5).join(' | ') : nodeCountBefore + ' 个节点全通过')
chk('树：改名节点数 = 7', observedPairs.length === 7, '实测 ' + observedPairs.length + ' 处：' + observedPairs.map((x) => x.from + ' → ' + x.to).join(' · '))

// ══ ② 边：位置对撞 ═════════════════════════════════════════════════════════
const eBefore = rdBackup('knowledge-edges.json')
const eAfter = rdData('knowledge-edges.json')
const edgeDiffs = []
const edgeIdChanges = []
let endpointTouched = 0
const n = Math.min(eBefore.length, eAfter.length)
for (let i = 0; i < n; i += 1) {
  const a = eBefore[i], b = eAfter[i]
  if (a.id !== b.id) edgeIdChanges.push({ from: a.id, to: b.id })
  if (a.source !== b.source) endpointTouched += 1
  if (a.target !== b.target) endpointTouched += 1
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'id') continue
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) edgeDiffs.push('#' + i + ' 字段 `' + k + '` 变了')
  }
}
chk('边：边数不变', eBefore.length === eAfter.length, eBefore.length + ' → ' + eAfter.length)
chk('边：除 id 外所有字段逐字节不变（含顺序）', edgeDiffs.length === 0, edgeDiffs.length ? edgeDiffs.slice(0, 5).join(' | ') : eBefore.length + ' 条全通过')
chk('边：source/target 零触碰', endpointTouched === 0, '被触碰 ' + endpointTouched + ' 处（须 0）')
chk('边：只有 treebind 的 id 变动', edgeIdChanges.every((c) => /^treebind:/.test(c.from) && /^treebind:/.test(c.to)),
  edgeIdChanges.length + ' 条 id 变动，其中非 treebind ' + edgeIdChanges.filter((c) => !/^treebind:/.test(c.from)).length + ' 条')

// ══ ③ 改名映射 ↔ 提案 双向核对 ═════════════════════════════════════════════
const proposal = JSON.parse(fs.readFileSync(path.join(OUT, 't3-p0-naming.proposal.json'), 'utf8'))
const oldIds = proposal.items.map((x) => x.oldTreeId)
const declared = proposal.items.map((x) => ({ from: x.oldTreeId, to: x.proposedTreeId })).sort((a, b) => a.from.localeCompare(b.from))
const observedSorted = [...observedPairs].map(({ from, to }) => ({ from, to })).sort((a, b) => a.from.localeCompare(b.from))
const mapEqual = JSON.stringify(declared) === JSON.stringify(observedSorted)
chk('改名映射：数据实测 ≡ 提案声明（7 对，双向）', mapEqual,
  mapEqual ? '7 对完全一致' : '声明 ' + JSON.stringify(declared) + ' vs 实测 ' + JSON.stringify(observedSorted))

// ══ ④ 引用闭合：**按字段角色区分，不全局一刀切**（宪法 §3.6 的应用）══════════
// 身份承载字段（树 / 边 / 池 / 题库）里的 treeId 是**身份**：必须 0 残留。
// evolution-events 的 `before`/`after` 是**审计叙述**：它**必须**保留旧 id，否则审计失去意义。
//   → 所以「残留 0」这条断言拆成两条：① 身份承载数据 0 残留；② 事件数组剔除本批新增事件后 0 残留，
//     且本批事件里的旧 id 只允许出现在 before/after 叙述字段。
const IDENTITY_FILES = ['tree-data.json', 'knowledge-edges.json', 'node-pool.json', 'questions.json']
const residualIdentity = []
for (const f of IDENTITY_FILES) {
  const raw = rdRaw(f)
  for (const id of oldIds) if (raw.includes(id)) residualIdentity.push(f + ' ← ' + id)
}
chk('引用闭合：身份承载数据（树/边/池/题库）旧 id 残留 0', residualIdentity.length === 0,
  residualIdentity.length ? residualIdentity.join(' | ') : oldIds.length + ' 个旧 id 在 ' + IDENTITY_FILES.length + ' 个身份承载文件中均已绝迹')

// ══ ⑤ 池与题库未被触碰 ═════════════════════════════════════════════════════
for (const f of ['node-pool.json', 'questions.json']) {
  const a = fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8')
  const b = rdRaw(f)
  chk(f + '：本批零改动', a === b, a === b ? '与批前快照逐字节相同' : '⛔ 发生了变化')
}
const poolAfter = rdData('node-pool.json')
chk('池节点数不变', Object.keys(poolAfter).length === Object.keys(rdBackup('node-pool.json')).length,
  Object.keys(rdBackup('node-pool.json')).length + ' → ' + Object.keys(poolAfter).length)

// ══ ⑥ evolution-event：恰好 +1，且 changes 覆盖 7 个改名节点 ═══════════════
const evoBefore = rdBackup('evolution-events.json')
const evoAfter = rdData('evolution-events.json')
const added = evoAfter.filter((e) => !evoBefore.some((x) => x.id === e.id))
const ev = added[0]
chk('evolution-events：恰好新增 1 条', added.length === 1, added.length + ' 条' + (ev ? '：' + ev.id : ''))
if (ev) {
  const targetRefs = new Set((ev.changes ?? []).map((c) => c.targetNodeId))
  const expectRefs = new Set(observedPairs.map((p) => p.from).map((id) => {
    // 从批前树里找该 tid 的 nodeRef
    let found = null
    ;(function w(x) { if (x.id === id) found = x.nodeRef; for (const c of x.children ?? []) w(c) })(tBefore)
    return found
  }).filter(Boolean))
  const covered = [...expectRefs].every((r) => targetRefs.has(r))
  chk('evolution-event：changes 覆盖全部 7 个改名节点', (ev.changes ?? []).length === 7 && covered,
    'changes ' + (ev.changes ?? []).length + ' 条 · 覆盖 ' + [...expectRefs].filter((r) => targetRefs.has(r)).length + '/' + expectRefs.size)
  chk('evolution-event：introducedNodes 为空（本批不新建实体）', (ev.introducedNodes ?? []).length === 0, JSON.stringify(ev.introducedNodes ?? []))
}

// 审计记录里的旧 id：剔除本批新增事件后必须绝迹；本批事件里只允许在 before/after 叙述字段
const evoRest = evoAfter.filter((e) => !ev || e.id !== ev.id)
const evoRestResidual = oldIds.filter((id) => JSON.stringify(evoRest).includes(id))
chk('引用闭合：历史事件中旧 id 残留 0（不含本批审计叙述）', evoRestResidual.length === 0,
  evoRestResidual.length ? evoRestResidual.join(', ') : '剔除本批事件后 ' + evoRest.length + ' 条历史事件中零残留')

if (ev) {
  const opaths = []
  ;(function w(x, p) {
    if (typeof x === 'string') { if (oldIds.some((id) => x.includes(id))) opaths.push(p); return }
    if (Array.isArray(x)) { x.forEach((v, i) => w(v, p + '[' + i + ']')); return }
    if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) w(v, p + '.' + k)
  })(ev, '$')
  const stray = opaths.filter((p) => !/\.(before|after)$/.test(p))
  chk('引用闭合：本批审计里的旧 id 仅出现在 before/after 叙述（按字段角色区分）', stray.length === 0,
    stray.length ? '⛔ 越界出现在 ' + [...new Set(stray)].join(', ') : opaths.length + ' 处全部位于 `changes[].before / changes[].after`')
  const withBefore = (ev.changes ?? []).filter((c) => oldIds.some((id) => String(c.before ?? '').includes(id))).length
  chk('审计叙述完整性：7 条 changes 的 before 均含旧 treeId', withBefore === 7, withBefore + '/7')
}

// ══ ⑦ 独立重算 T3 133 项 gap（自己实现，不 import apply 脚本）══════════════
const SHAPE = /^tree_[a-z0-9_]+$/
const hasTs = (id) => SHAPE.test(id) && (/^tree_\d{10,}/.test(id) || /\d{10,}/.test(id))
const hasSeg = (id) => SHAPE.test(id) && /_s\d+(_|$)/.test(id)
const isSemantic = (id) => SHAPE.test(id) && !hasTs(id) && !hasSeg(id)

function analyze(tree) {
  const rows = []
  ;(function walk(node, anc) {
    if (/^asplit_/.test(node.id)) {
      const sem = [...anc].reverse().find(isSemantic) ?? null
      const gap = sem ? anc.length - 1 - anc.lastIndexOf(sem) : null
      rows.push({ treeId: node.id, name: node.name ?? null, gap, sem })
    }
    for (const c of node.children ?? []) walk(c, [...anc, node.id])
  })(tree, [])
  return rows
}
const rowsAfter = analyze(tAfter)
const tier = (rows) => ({
  high: rows.filter((r) => r.gap === 0).length,
  medium: rows.filter((r) => r.gap !== null && r.gap >= 1 && r.gap <= 3).length,
  blocked: rows.filter((r) => r.gap === null || r.gap > 3).length,
})
const rowsBefore = analyze(tBefore)
const tAfterTier = tier(rowsAfter), tBeforeTier = tier(rowsBefore)
chk('T3 项数 = 133', rowsAfter.length === 133, rowsAfter.length + ' 项')
chk('T3 读数 = HIGH 92 / MEDIUM 38 / BLOCK 3',
  tAfterTier.high === 92 && tAfterTier.medium === 38 && tAfterTier.blocked === 3,
  'HIGH ' + tAfterTier.high + ' / MEDIUM ' + tAfterTier.medium + ' / BLOCK ' + tAfterTier.blocked +
  '（本批前 HIGH ' + tBeforeTier.high + ' / MEDIUM ' + tBeforeTier.medium + ' / BLOCK ' + tBeforeTier.blocked + '）')
chk('剩余 BLOCK 恰为 3 条 projection 族（另案）', tAfterTier.blocked === 3,
  rowsAfter.filter((r) => r.gap === null || r.gap > 3).map((r) => r.name + '(gap=' + r.gap + ')').join(' · '))

// ══ 输出 ═══════════════════════════════════════════════════════════════════
const failed = checks.filter((c) => !c.ok)
const result = {
  generatedAt: new Date().toISOString(),
  verifier: 'scripts/verify-t3-p0-apply.mjs',
  independence: '不复用 apply 脚本任何代码；比对对象 = 磁盘批前备份 vs 当前工作树；改名映射由数据位置对撞反推后与提案双向核对',
  backupDir: path.relative(ROOT, BACKUP_DIR),
  verdict: failed.length === 0 ? 'INDEPENDENT_VERIFY_PASS' : 'INDEPENDENT_VERIFY_FAIL',
  checks,
  observedRenamePairs: observedPairs,
  edgeIdChangeCount: edgeIdChanges.length,
  treeNodeCount: nodeCountAfter,
  edgeCount: eAfter.length,
  t3Recompute: { items: rowsAfter.length, before: tBeforeTier, after: tAfterTier,
    gapDistAfter: rowsAfter.reduce((d, r) => { const k = r.gap ?? 'none'; d[k] = (d[k] || 0) + 1; return d }, {}),
    stillBlocked: rowsAfter.filter((r) => r.gap === null || r.gap > 3).map((r) => ({ treeId: r.treeId, name: r.name, gap: r.gap })) },
}
fs.writeFileSync(path.join(OUT, 't3-p0-apply-verification.json'), JSON.stringify(result, null, 2) + '\n', 'utf8')

const md = ['# T3-P0 apply · 独立验证报告', '',
  '> 生成时间 ' + result.generatedAt,
  '> 批前快照 `' + result.backupDir + '`',
  '> **独立性**：' + result.independence, '',
  '## 结论 **`' + result.verdict + '`** —— ' + (checks.length - failed.length) + '/' + checks.length + ' 项通过', '',
  '| # | 断言 | 结果 | 依据 |', '|---|---|---|---|']
checks.forEach((c, i) => md.push('| ' + (i + 1) + ' | ' + c.name + ' | ' + (c.ok ? '✅' : '❌') + ' | ' + c.detail + ' |'))
md.push('', '## 实测改名映射（由数据位置对撞反推）', '', '| # | 旧 treeId | 新 treeId | 位置 |', '|---|---|---|---|')
observedPairs.forEach((p, i) => md.push('| ' + (i + 1) + ' | `' + p.from + '` | `' + p.to + '` | ' + p.path + ' |'))
md.push('', '## T3 133 项读数（独立重算）', '', '| 读数 | 本批前 | 本批后 |', '|---|---:|---:|',
  '| HIGH | ' + tBeforeTier.high + ' | **' + tAfterTier.high + '** |',
  '| MEDIUM | ' + tBeforeTier.medium + ' | ' + tAfterTier.medium + ' |',
  '| BLOCK | ' + tBeforeTier.blocked + ' | **' + tAfterTier.blocked + '** |', '')
md.push('剩余 BLOCK（属挂载点合法性 → 结构批次，不在 T3）：')
for (const r of result.t3Recompute.stillBlocked) md.push('- `' + r.treeId + '` ' + r.name + '（gap=' + r.gap + '）')
md.push('')
fs.writeFileSync(path.join(OUT, 't3-p0-apply-verification.md'), md.join('\n'), 'utf8')

console.log('════ T3-P0 apply · 独立验证 ════')
console.log('  批前快照：' + result.backupDir)
console.log('  独立性：' + result.independence + '\n')
for (const c of checks) console.log('  ' + (c.ok ? '✅' : '❌') + ' ' + c.name + '  →  ' + c.detail)
console.log('\n【结论】' + result.verdict + ' —— ' + (checks.length - failed.length) + '/' + checks.length + ' 项通过')
console.log('产物：t3-p0-apply-verification.json · t3-p0-apply-verification.md')
process.exitCode = failed.length === 0 ? 0 : 1
