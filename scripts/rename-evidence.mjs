#!/usr/bin/env node
/**
 * T5 · 通用「改名证据引擎」（rename evidence engine）—— **evidence-only**
 *
 * 目的：把「改名后旧值残留」的检测从一次性脚本提升为**共享机制**，供
 *   · T3（asplit_* → 语义 treeId，133 项）
 *   · 后续任何 rename / refactor 批次（OOP / CS / DB / 虚拟化 …）
 * 共同复用。避免每个批次各写一份检测逻辑（重复即负债）。
 *
 * ⛔ 契约（宪法 3.6 · ADR-0002 · T4 裁决后固化，**不得协商**）：
 *   检测器**只找证据**；判定权在治理规则 / 人工裁决。
 *   - 输出只允许：field / oldValue / newValue / staleSignature / severity / disposition /
 *                 evidence / baseCount / counterexamples / falsePositiveAnalysis
 *   - **绝不输出**：action / autoFix（脚本末尾有自检，一旦出现即退出码 2）
 *
 * 纪律依据（宪法 3.2 + 序章元纪律）：任何「缺陷」断言必须附
 *   **基数（命中 / 全体）** + **反例样本** + **误报分析**；给不出基数者只记观察项。
 *   实战教训：曾据单例断言「改名必须同步全部同位字段」→ 全库证伪后产生 **146 个误报**。
 *
 * ── 用法 ────────────────────────────────────────────────────────────────
 *   # 单个改名
 *   node scripts/rename-evidence.mjs --old "分类" --new "类的分类" --id k_class_programming_classification \
 *        [--before data/backups/<批次落盘前备份目录>]
 *
 *   # 批量：cases JSON = [{ caseId?, oldValue, newValue, targetIds: [] }]
 *   node scripts/rename-evidence.mjs --case <cases.json> [--out <out.json>]
 *
 *   # 从批次映射草案直接构造（读 asplit-treeid-mapping.draft.json，取已 approved/可给建议的项）
 *   node scripts/rename-evidence.mjs --batch t3-dryrun [--out <out.json>]
 *
 * 退出码：0 = 正常（**注意 0 不代表「无问题」**，只代表「证据已产出」）
 *         2 = 契约自检失败（输出里出现了 forbidden 字段）
 *         1 = 用法 / 数据错误
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'rename-evidence')

const argv = process.argv.slice(2)
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const has = (n) => argv.includes(n)
const rd = (p) => JSON.parse(fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p), 'utf8'))

const FORBIDDEN_OUTPUT_KEYS = ['action', 'autoFix', 'auto_fix', 'fix', 'apply', 'patch']
const DISPOSITIONS = ['intentional-alias', 'defect-candidate', 'needs-adjudication', 'display-enrichment']

// ── 字段角色（宪法 3.6：身份耦合字段 vs 展示字段）──────────────────────────
// 身份耦合：改名**必须**语义一致（或至少不能残留旧值）
const IDENTITY_COUPLED = [/^label$/, /^name$/, /^card\.nodeId$/, /^canonicalKey$/, /^relatedNodeId$/, /^canonicalNodeId$/, /^redirectTo$/]
// 别名承载：旧值留在这里 = 有意保留历史检索名
const ALIAS_BEARING = /^(tags|aliases)\b/
// 展示层：允许富化，禁止自动回写
const DISPLAY = [/^card\.title$/, /^card\.tabs\[\d+\]\.label$/, /^card\.rootContent$/, /^card\.tabs\[\d+\]\.content$/]

const isIdentityCoupled = (p) => IDENTITY_COUPLED.some((re) => re.test(p))
const isAliasBearing = (p) => ALIAS_BEARING.test(p)
const isDisplay = (p) => DISPLAY.some((re) => re.test(p))
const roleOf = (p) => (isIdentityCoupled(p) ? 'identity-coupled' : isAliasBearing(p) ? 'alias-bearing' : isDisplay(p) ? 'display' : 'other')

// ── 工具 ────────────────────────────────────────────────────────────────
const stringPaths = (v, prefix = '') => {
  if (typeof v === 'string') return [{ path: prefix, value: v }]
  if (Array.isArray(v)) return v.flatMap((x, i) => stringPaths(x, prefix + '[' + i + ']'))
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => stringPaths(x, prefix ? prefix + '.' + k : k))
  return []
}
const cls = (a, b) => (a === b ? 'same' : a.includes(b) || b.includes(a) ? 'subset' : 'disjoint')

// ── 载入真源 ─────────────────────────────────────────────────────────────
const pool = rd('data/node-pool.json')
const tree = rd('data/tree-data.json')

const treeById = new Map()
const walk = (n, anc) => { treeById.set(n.id, { node: n, ancestors: anc }); for (const c of n.children ?? []) walk(c, [...anc, n]) }
walk(tree, [])

const treeMountsOf = (nodeRef) => [...treeById.values()].filter((e) => e.node.nodeRef === nodeRef).map((e) => ({
  treeId: e.node.id,
  treeName: e.node.name,
  path: e.ancestors.map((a) => a.name).concat(e.node.name).join(' > '),
}))

// ── 全库基线（宪法 3.2：断言必须附基数）────────────────────────────────────
const allIds = Object.keys(pool)
const allLabels = new Set(allIds.map((k) => String(pool[k].label ?? '')))
// 同名 label 可能指向**另一个实体**（→ 旧值残留与「引用他实体」不可区分，是误报源）
const labelToIds = new Map()
for (const k of allIds) {
  const l = String(pool[k].label ?? '')
  if (!labelToIds.has(l)) labelToIds.set(l, [])
  labelToIds.get(l).push(k)
}

// 全库「字段值 = 某个实体 label」的基数（衡量「交叉引用」有多普遍）
let crossRefFields = 0
let crossRefEntities = 0
const crossRefSamples = []
for (const k of allIds) {
  const own = String(pool[k].label ?? '')
  const hits = stringPaths(pool[k]).filter((h) => h.value && h.value !== own && allLabels.has(h.value))
  if (hits.length) {
    crossRefEntities++
    crossRefFields += hits.length
    if (crossRefSamples.length < 6) crossRefSamples.push({ nodeId: k, fieldPath: hits[0].path, value: hits[0].value })
  }
}
const labelTitleDiff = allIds.filter((k) => pool[k].card && String(pool[k].label) !== String(pool[k].card.title))
const treeNameDiff = [...treeById.values()].filter((e) => e.node.nodeRef && pool[e.node.nodeRef] && String(e.node.name ?? '') !== String(pool[e.node.nodeRef].label ?? ''))
const cardNodeIdMismatch = allIds.filter((k) => pool[k].card && pool[k].card.nodeId !== k)

const database = {
  poolEntities: allIds.length,
  treeEntries: treeById.size,
  distinctLabels: allLabels.size,
  baseline: {
    crossRefFields,
    crossRefEntities,
    crossRefFieldRatio: crossRefFields + '/' + allIds.length,
    labelNeCardTitle: labelTitleDiff.length,
    labelNeCardTitleRatio: labelTitleDiff.length + '/' + allIds.length,
    treeNameNePoolLabel: treeNameDiff.length,
    cardNodeIdMismatch: cardNodeIdMismatch.length,
    invariantNote: 'card.nodeId ≡ 池键 是**唯一**真正成立的不变量（当前违例 ' + cardNodeIdMismatch.length + '）；' +
      'label ≠ card.title（' + labelTitleDiff.length + ' 例）与 树 name ≠ 池 label（' + treeNameDiff.length + ' 例）都是**常态**，不是缺陷。',
  },
}

// ── 核心：单案例取证 ──────────────────────────────────────────────────────
const buildCase = (c) => {
  const { caseId, oldValue, newValue, targetIds = [], beforeSnapshot = null } = c
  const resolved = targetIds.map((id) => ({
    nodeId: id,
    exists: !!pool[id],
    label: pool[id]?.label ?? null,
    cardTitle: pool[id]?.card?.title ?? null,
    tags: pool[id]?.tags ?? null,
    treeMounts: pool[id] ? treeMountsOf(id) : [],
  }))

  // 改名前的真值（只在**改名当时**可取：需拿改名前基线做旧值反查）
  let before = null
  if (beforeSnapshot) {
    try {
      const bPool = rd(path.join(beforeSnapshot, 'node-pool.json'))
      before = targetIds.map((id) => ({ nodeId: id, label: bPool[id]?.label ?? null, present: !!bPool[id] }))
    } catch (e) { before = { error: String(e.message) } }
  }

  // 命中：目标实体中「字段值 === 旧值」的位置（**只报等于旧值，不报不等于新值**）
  const hits = []
  for (const id of targetIds) {
    const ent = pool[id]
    if (!ent) continue
    for (const h of stringPaths(ent).filter((x) => x.value === oldValue)) {
      const role = roleOf(h.path)
      let severity, disposition
      if (role === 'alias-bearing') { severity = '🟡'; disposition = 'intentional-alias' }
      else if (role === 'identity-coupled') { severity = '🔴'; disposition = 'defect-candidate' }
      else if (role === 'display') {
        const aliasRetained = stringPaths(ent).some((x) => isAliasBearing(x.path) && x.value === oldValue)
        severity = '🟡'
        disposition = aliasRetained ? 'intentional-alias' : 'needs-adjudication'
      } else { severity = '🟡'; disposition = 'needs-adjudication' }
      hits.push({
        nodeId: id,
        fieldPath: h.path,
        fieldRole: role,
        oldValue,
        newValue,
        staleSignature: true,
        severity,
        disposition,
        evidence: {
          why: '字段值 === 该实体**改名前的旧值**（不是「当前值 ≠ 新值」——后者会把正常富化全捞进来）',
          isIdentityCoupled: isIdentityCoupled(h.path),
          aliasRetainedElsewhere: stringPaths(ent).some((x) => isAliasBearing(x.path) && x.value === oldValue),
        },
      })
    }
  }

  // 基数：旧值在全库的普遍度
  const oldValueEntities = allIds.filter((k) => stringPaths(pool[k]).some((h) => h.value === oldValue))
  const oldValueAsLabel = labelToIds.get(oldValue) ?? []
  const baseCount = {
    hitsInTargets: hits.length,
    entitiesCarryingOldValueAnywhere: oldValueEntities.length,
    denominator: allIds.length,
    ratio: oldValueEntities.length + '/' + allIds.length,
    // 「旧值恰好是另一个实体的当前 label」→ 命中可能其实是在**引用他实体**
    otherEntitiesLabelledOldValue: oldValueAsLabel,
    ambiguousWithReference: oldValueAsLabel.length > 0,
  }

  // 反例：同类签名（字段值 = 某实体 label 但 ≠ 自身 label）在全库的样本
  const counterexamples = crossRefSamples.map((s) => ({
    nodeId: s.nodeId,
    fieldPath: s.fieldPath,
    value: s.value,
    why: '字段值等于**另一个实体**的 label —— 与「旧值残留」签名同形，但语义是交叉引用，属正常',
  }))

  // 误报分析：本判据在哪些情况下会误报（附估计）
  const falsePositiveAnalysis = [
    {
      class: '旧值同时是常用词 / 通用术语',
      why: '判据比较的是**字符串相等**，无法区分「改名残留」与「恰好写成同一个词」。旧值越通用，误报率越高。',
      estimate: baseCount.entitiesCarryingOldValueAnywhere + ' 个实体含该字符串（全库 ' + allIds.length + '）',
    },
    {
      class: '旧值恰是另一个实体的当前 label',
      why: '此时该字段可能是在**引用那个实体**，而不是指向自身的旧名。需要人看正文才能区分。',
      estimate: oldValueAsLabel.length ? oldValueAsLabel.join(', ') : '本案例无（旧值不是任何实体的 label）',
    },
    {
      class: '展示层字段的富化',
      why: 'card.title / tabs[].label 允许与规范短名不同（全库 ' + labelTitleDiff.length + ' 例）；' +
        '「不等于新值」的规则若被采用，会把这批全部误伤。',
      estimate: labelTitleDiff.length + '/' + allIds.length,
    },
    {
      class: '旧值被有意保留为别名',
      why: 'tags / aliases 里保留旧名是**有意设计**（历史检索价值）→ 命中 tags 属 intentional-alias，不是缺陷。',
      estimate: '见 hits[].fieldRole === alias-bearing',
    },
  ]

  // 案例级汇总（取最严重的一档）
  const order = { '🔴': 3, '🟡': 2, '🟢': 1 }
  const worst = hits.reduce((a, h) => (order[h.severity] > order[a] ? h.severity : a), '🟢')
  const caseSeverity = hits.length ? worst : '🟢'
  const caseDisposition = hits.length
    ? (hits.some((h) => h.disposition === 'defect-candidate') ? 'defect-candidate'
      : hits.every((h) => h.disposition === 'intentional-alias') ? 'intentional-alias'
      : 'needs-adjudication')
    : 'display-enrichment'

  return {
    caseId: caseId ?? (oldValue + ' → ' + newValue),
    oldValue,
    newValue,
    targetIds,
    resolved,
    beforeSnapshot,
    before,
    staleSignature: hits.length > 0,
    severity: caseSeverity,
    disposition: caseDisposition,
    hits,
    baseCount,
    counterexamples,
    falsePositiveAnalysis,
    note: '⛔ 本对象**不含 action / autoFix**。是否修改由治理规则或人工裁决（宪法 3.6）。',
  }
}

// ── 构造 cases ───────────────────────────────────────────────────────────
let cases = []
const batchId = argOf('--batch')
if (batchId) {
  const p = path.join(ROOT, 'outputs', 'tree-violation-scan', 'asplit-treeid-mapping.draft.json')
  if (!fs.existsSync(p)) { console.error('❌ 找不到映射草案：' + p + '（先跑 dryrun-t3-asplit-semanticization.mjs）'); process.exit(1) }
  const draft = rd(p)
  // T3 是 treeId 改名：oldValue=旧 treeId，newValue=新 treeId；targetIds=这些 treeId 挂载的池实体
  cases = draft.items
    .filter((m) => m.proposedTreeId)
    .map((m) => ({
      caseId: m.oldTreeId + ' → ' + m.proposedTreeId,
      oldValue: m.oldTreeId,
      newValue: m.proposedTreeId,
      targetIds: [],           // treeId 改名不直接改池；池侧仅作「是否残留 treeId 字符串」的体检
    }))
} else if (argOf('--case')) {
  cases = rd(argOf('--case'))
} else if (argOf('--old')) {
  cases = [{
    oldValue: argOf('--old'),
    newValue: argOf('--new') ?? '',
    targetIds: argv.map((a, i) => (a === '--id' ? argv[i + 1] : null)).filter(Boolean),
  }]
} else {
  console.error('用法：--old/--new/--id | --case <json> | --batch <id>   （见文件头注释）')
  process.exit(1)
}

const beforeSnapshot = argOf('--before')
const report = {
  generatedAt: new Date().toISOString(),
  mode: 'EVIDENCE_ONLY',
  tool: 'scripts/rename-evidence.mjs (T5)',
  detectorContract: {
    stage: 'evidence-only',
    outputs: ['fieldPath', 'oldValue', 'newValue', 'staleSignature', 'severity', 'disposition', 'evidence', 'baseCount', 'counterexamples', 'falsePositiveAnalysis'],
    neverOutputs: ['action', 'autoFix'],
    dispositions: DISPOSITIONS,
    authority: '判定权在治理规则阶段 / 人工裁决（ADR-0002）',
  },
  database,
  cases: cases.map((c) => buildCase({ beforeSnapshot, ...c })),
}
report.summary = {
  cases: report.cases.length,
  casesWithHits: report.cases.filter((c) => c.staleSignature).length,
  hits: report.cases.reduce((a, c) => a + c.hits.length, 0),
  bySeverity: report.cases.reduce((a, c) => { a[c.severity] = (a[c.severity] ?? 0) + 1; return a }, {}),
  byDisposition: report.cases.reduce((a, c) => { a[c.disposition] = (a[c.disposition] ?? 0) + 1; return a }, {}),
}

// ── ⛔ 契约自检：输出里**不得**出现 action / autoFix ───────────────────────
const violations = []
const scan = (v, p = '$') => {
  if (Array.isArray(v)) return v.forEach((x, i) => scan(x, p + '[' + i + ']'))
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (FORBIDDEN_OUTPUT_KEYS.includes(k)) violations.push(p + '.' + k)
      scan(x, p + '.' + k)
    }
  }
}
scan(report)

const outPath = argOf('--out') ?? path.join(OUT_DIR, (batchId ? 't3' : 'cases') + '-evidence.json')
if (!has('--dry')) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
}

// ── 控制台摘要 ───────────────────────────────────────────────────────────
const L = (s = '') => console.log(s)
L('════ T5 · 改名证据引擎（evidence-only）════')
L('  契约：只找证据，不判定；neverOutputs = ' + JSON.stringify(report.detectorContract.neverOutputs))
L('  全库：池 ' + database.poolEntities + ' · 树 ' + database.treeEntries + ' · 不同 label ' + database.distinctLabels)
L('  基线（宪法 3.2 要求的「基数」）：')
L('    · 字段值 = 某实体 label（交叉引用）      : ' + database.baseline.crossRefFieldRatio)
L('    · label ≠ card.title（常态，非缺陷）     : ' + database.baseline.labelNeCardTitleRatio)
L('    · 树 name ≠ 池 label（常态）             : ' + database.baseline.treeNameNePoolLabel)
L('    · card.nodeId ≠ 池键（真正的不变量）     : ' + database.baseline.cardNodeIdMismatch)
L('  案例 ' + report.summary.cases + ' · 有命中 ' + report.summary.casesWithHits + ' · 命中点 ' + report.summary.hits)
L('  按严重度：' + JSON.stringify(report.summary.bySeverity) + ' · 按处置：' + JSON.stringify(report.summary.byDisposition))
const shown = report.cases.filter((c) => c.staleSignature).slice(0, 5)
for (const c of shown) {
  L('    · ' + c.caseId + '  [' + c.severity + ' ' + c.disposition + ']')
  for (const h of c.hits.slice(0, 3)) L('        ' + h.nodeId + ' · ' + h.fieldPath + ' (' + h.fieldRole + ') = 「' + h.oldValue + '」')
}
if (report.summary.casesWithHits > shown.length) L('    … 其余 ' + (report.summary.casesWithHits - shown.length) + ' 个有命中的案例见产出文件')
if (!has('--dry')) L('\n产出：' + path.relative(ROOT, outPath).replace(/\\/g, '/'))

if (violations.length) {
  L('\n❌ 契约自检失败：输出中出现了禁止字段 ' + violations.join(', '))
  process.exit(2)
}
L('\n✅ 契约自检通过（无 action / autoFix）')
L('⚠️ 退出码 0 **不代表「无问题」** —— 只代表证据已产出。判定权在治理规则 / 人工。')
process.exit(0)
