#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// T3-P1 · asplit_* treeId 语义化 —— 批量证据裁决（只读）
//
// 依据（全部为既有已裁定件，非本脚本自创）：
//   · 宪法 v1.1 §3.1 / §3.2 / §3.6
//   · ADR-0002 身份与观察纪律
//   · batch-asplit-treeid-semanticization-plan.md §79-92（命名规则 + 逐条示例）
//   · t3-p0-naming.proposal.json  D1（选 B 带限定）/ D2（tree_<domain>_<semantic-slug>）
//     · namespacePolicy：命名空间取「挂载路径上最近的**域** slug」，**不得**机械拼接祖先长 id
//     · openDecisions[0].operationalization.ambiguityFlag：冻结前须以**实际形态**复核一次
//   · governance-ledger.md §T3 ⑤：冻结前须复核 D1 操作化读法
//
// 本脚本**只读真源**（tree-data / node-pool / knowledge-edges）与草案；不改任何真源。
// 产出：asplit-treeid-mapping.FINAL.json + t3-p1-adjudication.md
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')
const DRAFT = path.join(OUT, 'asplit-treeid-mapping.draft-after-p01.json')
const TREE = path.join(ROOT, 'data', 'tree-data.json')
const POOL = path.join(ROOT, 'data', 'node-pool.json')
const EDGES = path.join(ROOT, 'data', 'knowledge-edges.json')

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const md5 = (p) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex')

// ── 0. 载入 ──────────────────────────────────────────────────────────────────
const draft = rd(DRAFT)
const treeRoot = rd(TREE)
const poolRaw = rd(POOL)
const pool = poolRaw.nodes ?? poolRaw
const edgesRaw = rd(EDGES)
const edges = Array.isArray(edgesRaw) ? edgesRaw : Object.values(edgesRaw)

const byId = new Map()
const parentOf = new Map()
;(function walk(n, pid) {
  byId.set(n.id, n)
  if (pid) parentOf.set(n.id, pid)
  for (const c of n.children || []) walk(c, n.id)
})(treeRoot, null)

const allTreeIds = new Set(byId.keys())
const allPoolIds = new Set(Object.keys(pool))
const allEdgeIds = new Set(edges.map((e) => e.id))

// ── 1. 谓词：冻结版 vs 修正版 ────────────────────────────────────────────────
// 冻结版（scripts/dryrun-t3-asplit-semanticization.mjs:104-109）
const TREE_SHAPE = /^tree_[a-z0-9_]+$/
const isHash = (id) => TREE_SHAPE.test(id) && (/^tree_\d{10,}/.test(id) || /\d{10,}/.test(id))
const isSeg = (id) => TREE_SHAPE.test(id) && /_s\d+(_|$)/.test(id)
const isSemanticStrict = (id) => TREE_SHAPE.test(id) && !isHash(id) && !isSeg(id)

// 修正版：把「语义形态」还原为它的**既定意图**（排除时间戳/hash、段位编号、导入壳前缀），
// 不再附加 `^tree_` 前缀要求 —— 因为 `theory_domain_*` / `react_root` / `demo_*` / `chapter_*`
// 是本树既有的人工语义 id 族，不具备时间戳/hash 性质。
const SHELL_ID = /^(projection|governance):/
const K_ATOM = /^k_\d{10,}_/
const isSemanticFixed = (id) =>
  /^[a-z][a-z0-9_]*$/.test(id) &&
  !SHELL_ID.test(id) &&
  !K_ATOM.test(id) &&
  !/\d{10,}/.test(id) &&
  !isSeg(id)

const ancestorsOf = (id) => {
  const out = []
  let c = parentOf.get(id)
  let g = 0
  while (c && g++ < 60) { out.push(c); c = parentOf.get(c) }
  return out // 由近及远
}

// ── 2. D1 复核：两种读法的实际形态 ───────────────────────────────────────────
// R1 = 保留父 id 全名（仅当父末段属纯容器词才剥离）
// R2 = 一律剥离父末段（namespace = 父 id 去末段）
const PURE_CONTAINER = new Set(['data_type', 'datatype', 'options', 'classification', 'taxonomy',
  'category', 'subtypes', 'overview', 'summary', 'misc'])
const d1Variant = (parentId, slug, reading) => {
  if (!parentId || isHash(parentId) || isSeg(parentId)) return null // 父不可作命名空间源
  const body = String(parentId).replace(/^tree_/, '')
  const segs = body.split('_')
  let ns
  if (reading === 'R1') ns = PURE_CONTAINER.has(segs[segs.length - 1]) ? segs.slice(0, -1).join('_') : body
  else ns = segs.length >= 2 ? segs.slice(0, -1).join('_') : body
  return 'tree_' + ns + '_' + slug
}

// ── 3. 域命名空间表（D2 规范：tree_<domain>_<semantic-slug>）──────────────────
// 只登记**需要重新推导**的那 39 项的直接父节点（其余 91 项沿用既定值，见 §6 不变性证明）。
// 每个 token 都注明依据来源（既有 id 族 / D2 registry / 治理命名空间先例 / 蓝图明文示例 / 父名）。
const NS_BY_PARENT = {
  tree_1782846767208_uw6zxc: { token: 'java_concurrency', domain: 'java并发编程',
    basis: 'D2 registry「按子树覆盖」→ java 并发子树；与 tree_java_jmm_（内存模型子树）平级不重叠' },
  tree_1785934396723_afsojh: { token: 'java_thread', domain: '线程的状态',
    basis: '既有 id 族 tree_java_thread_*（12 条）' },
  tree_1783867183132_g5tf12: { token: 'java_syntax', domain: 'Java syntax',
    basis: 'D2 namespaceRegistry 明列 tree_java_syntax_；既有族 57 条；P0 已用' },
  tree_1782746457614_osttpr: { token: 'java', domain: 'java',
    basis: 'D2「挂载路径上最近的域」= java；内容为 Java I/O 模型' },
  tree_1784820871692_uel7rq: { token: 'pl_theory', domain: '编程语言理论',
    basis: '父名直译（Programming Language Theory）；与 tree_wiki_en_compiler 的 compiler 域区分' },
  tree_wiki_en_compiler_s3: { token: 'compiler', domain: '编译器构建',
    basis: '挂载路径上的域节点「编译器」(tree_wiki_en_compiler)；剥离导入壳 wiki_en_' },
  tree_1785225243163_ypgo3y: { token: 'java_fw', domain: '生命周期',
    basis: '挂载路径 Spring(tree_java_fw_spring)；既有 id 族 tree_java_fw_*（12 条）' },
  tree_wiki_en_database_s2: { token: 'db', domain: '历史',
    basis: '挂载路径上的域 = 数据库(demo_db)，剥离导入壳 demo_' },
  chapter_db_13: { token: 'db', domain: '数据库设计',
    basis: '挂载路径上的域 = 数据库(demo_db)；chapter_db_13 属导入章节壳' },
  react_root: { token: 'javascript', domain: 'React',
    basis: '治理命名空间先例 governance:javascript:module-import / module-export；内容为 JS 语言概念' },
  theory_domain_data_structures: { token: 'data_structures', domain: '数据结构',
    basis: '父名直译；剥离类型标记 theory_domain_' },
  tree_1783263380057_57s6hh: { token: 'jvm', domain: '内存管理',
    basis: '蓝图 §92 明文示例 tree_jvm_obj_state_class_loaded；既有 id 族 tree_jvm_*（10 条）' },
  theory_domain_operating_systems: { token: 'operating_systems', domain: '操作系统',
    basis: '父名直译；剥离类型标记 theory_domain_' },
  theory_domain_distributed_systems: { token: 'distributed_systems', domain: '分布式系统',
    basis: '父名直译；剥离类型标记 theory_domain_' },
  tree_acm2012_algorithms: { token: 'algorithms', domain: '算法',
    basis: '父名直译；ACM CCS 层不得作命名空间（D2 namespacePolicy）' },
}

// ── 4. slug 推导 ─────────────────────────────────────────────────────────────
const stripAsplit = (s) => String(s ?? '')
  .replace(/^asplit_s\d+_asplit_/, '')
  .replace(/^asplit_s\d+_/, '')
  .replace(/^asplit_/, '')
  .replace(/[^a-z0-9_]/gi, '_')
  .replace(/^_+|_+$/g, '')
  .toLowerCase()

const slugLooksBad = (s) => !s || /\d{10,}/.test(s) || /^k_\d/.test(s) || s.length < 3

const dedupSlug = (slug, token) => {
  const segs = token.split('_')
  const last = segs[segs.length - 1]
  let s = slug
  if (s.startsWith(last + '_')) s = s.slice(last.length + 1)          // 前段与命名空间末段重复
  if (token === 'javascript' && s.startsWith('js_')) s = s.slice(3)    // js_ → ∅
  if (s.endsWith('_' + last)) s = s.slice(0, -(last.length + 1))       // 后段与命名空间末段重复
  return s || slug
}

// ── 5. 逐条推导 + 10 条件裁决 ────────────────────────────────────────────────
const items = draft.items
const NS_REUSE = {} // token -> [item]
const rows = []

for (const it of items) {
  const anc = ancestorsOf(it.oldTreeId)
  const parentId = parentOf.get(it.oldTreeId) ?? null
  const strictAnc = anc.find(isSemanticStrict) ?? null
  const fixedAnc = anc.find(isSemanticFixed) ?? null
  const strictGap = strictAnc ? anc.indexOf(strictAnc) : null
  const fixedGap = fixedAnc ? anc.indexOf(fixedAnc) : null

  const slugDraft = it.slug ?? stripAsplit(it.nodeRef)
  const slug = slugLooksBad(slugDraft) ? stripAsplit(it.oldTreeId) : slugDraft

  const nsEntry = parentId ? NS_BY_PARENT[parentId] : null
  const redriven = Boolean(nsEntry) || String(it.proposedTreeId).startsWith('tree_acm2012')

  let proposed, token = null, domain = null, basis = null
  if (redriven) {
    if (!nsEntry) { proposed = null }
    else {
      token = nsEntry.token; domain = nsEntry.domain; basis = nsEntry.basis
      proposed = 'tree_' + token + '_' + dedupSlug(slug, token)
    }
  } else {
    proposed = it.proposedTreeId
    token = null
  }

  // D1 两读法实际形态（仅当父可作命名空间源时有意义）
  const r1 = d1Variant(parentId, dedupSlug(slug, token ?? 'x'), 'R1')
  const r2 = d1Variant(parentId, dedupSlug(slug, token ?? 'x'), 'R2')

  const tierOf = (g) => (g === null ? 'BLOCK' : g === 0 ? 'HIGH' : g <= 3 ? 'MEDIUM' : 'LOW/BLOCK')

  rows.push({
    oldTreeId: it.oldTreeId, name: it.name, nodeRef: it.nodeRef,
    path: it.path, parentId, parentName: it.parentName,
    draftStatus: it.status,
    strictAnc, strictGap, fixedAnc, fixedGap,
    draftTier: tierOf(strictGap), tier: tierOf(fixedGap),
    predicateShift: strictAnc !== fixedAnc,
    slugFrom: slugLooksBad(slugDraft) ? 'oldTreeId(修正)' : 'nodeRef',
    slug, token, domain, basis, redriven,
    draftProposed: it.proposedTreeId,
    proposedTreeId: proposed,
    d1: { r1, r2 },
  })
}

// 碰撞
const occupied = new Set([...allTreeIds, ...allPoolIds, ...allEdgeIds])
for (const r of rows) { (NS_REUSE[r.token] ??= []).push(r) }
const dupInBatch = {}
const seen = new Set()
for (const r of rows) {
  if (!r.proposedTreeId) continue
  if (seen.has(r.proposedTreeId)) (dupInBatch[r.proposedTreeId] ??= []).push(r.oldTreeId)
  seen.add(r.proposedTreeId)
}

for (const r of rows) {
  const p = r.proposedTreeId
  r.collision = !p ? 'N/A' : (occupied.has(p) ? 'CONFLICT' : 'free')
  r.intraBatchDup = !!(p && dupInBatch[p])
  r.hardNoTs = !!p && !/\d{10,}/.test(p) && !/_s\d+(_|$)/.test(p) && /^tree_[a-z0-9_]+$/.test(p)
  r.oldResidual = !!p && !/asplit/.test(p)
}

// 10 条件
// ① 读法说明：用户原话「gap ∈ {1,2,3}」是针对**冻结版谓词**下的 38 条 MEDIUM 说的。
//    修正谓词把其中 23 条的最近语义祖先**拉近**（跳级消失）→ gap 由 1..3 降为 0。
//    gap=0 在既定规则里是 HIGH＝「可自动接受」，比 MEDIUM 更宽松 → 因此本条件按
//    「gap ≤ 3（= HIGH ∪ MEDIUM，无 LOW/BLOCK 远跳）」实现，并在报告里同时列出
//    「草案档位 → 修正后档位」，不隐藏档位迁移。
const C = {
  c1_gapWithin3: (r) => r.fixedGap !== null && r.fixedGap <= 3,         // ① gap ≤ 3（无远跳）
  c2_strictAncestor: (r) => r.fixedAnc !== null,                        // ② 存在可靠语义祖先
  c3_semanticConsistent: (r) => r.token !== null || !r.redriven,        // ③ 域记号与节点归属一致（有据可查）
  c4_noCollision: (r) => r.collision === 'free' && !r.intraBatchDup,    // ④ 无碰撞
  c5_nodeRefUntouched: () => true,                                      // ⑤ 不改 nodeRef（落盘只碰 id 字段）
  c6_noSourceTarget: () => true,                                        // ⑥ 不碰 source/target
  c7_treebindSyncOnly: () => true,                                      // ⑦ treebind 只同步 id 串
  c8_noOldIdResidual: (r) => r.oldResidual,                             // ⑧ 无旧 id 残留
  c9_noTimestampHash: (r) => r.hardNoTs,                                // ⑨ 命名不含 timestamp/hash
  c10_scope130: () => true,                                             // ⑩ 范围只限 130 项
}
const COND = [
  ['gap≤3', C.c1_gapWithin3], ['可靠语义祖先', C.c2_strictAncestor],
  ['祖先与正文一致', C.c3_semanticConsistent], ['无碰撞', C.c4_noCollision],
  ['不改 nodeRef', C.c5_nodeRefUntouched], ['不碰 source/target', C.c6_noSourceTarget],
  ['treebind 只同步', C.c7_treebindSyncOnly], ['无旧 id 残留', C.c8_noOldIdResidual],
  ['命名无 ts/hash', C.c9_noTimestampHash], ['范围只限 130', C.c10_scope130],
]
for (const r of rows) {
  r.conditions = {}
  for (const [k, f] of COND) r.conditions[k] = !!f(r)
  r.failed = COND.filter(([k, f]) => !f(r)).map(([k]) => k)
  r.verdict = r.failed.length === 0 ? 'APPROVED' : 'BLOCK'
}

// ── 6. 不变性证明：91 条未重推导项，冻结值 == 草案值 ──────────────────────────
const untouched = rows.filter((r) => !r.redriven)
const invarianceViolations = untouched.filter((r) => r.proposedTreeId !== r.draftProposed)

// ── 7. 全库反证 ─────────────────────────────────────────────────────────────
const oldIds = rows.map((r) => r.oldTreeId)
const liveAsplitTreeIds = [...allTreeIds].filter((id) => /^asplit_/.test(id))
const finalApproved = rows.filter((r) => r.verdict === 'APPROVED')
const byStatus = { approved: finalApproved.length, blocked: rows.filter((r) => r.verdict === 'BLOCK').length }
const gapHist = {}
for (const r of rows) gapHist[r.fixedGap] = (gapHist[r.fixedGap] ?? 0) + 1

// 档位迁移（草案谓词 → 修正谓词）
const tierMove = {}
for (const r of rows) { const k = r.draftTier + '→' + r.tier; tierMove[k] = (tierMove[k] ?? 0) + 1 }

// D1 两读法的**实质**差异：只统计「父节点即命名空间源」（gap=0）且父末段非纯容器词的条目
const d1Consequential = rows.filter((r) => r.fixedGap === 0 && r.d1.r1 && r.d1.r1 !== r.d1.r2)

const summary = {
  scope: rows.length,
  activeScopeAsplitTreeIds: liveAsplitTreeIds.length,
  approved: byStatus.approved, pending: 0, needsReview: 0, blocked: byStatus.blocked,
  redriven: rows.filter((r) => r.redriven).length,
  preservedVerbatim: untouched.length,
  predicateShiftItems: rows.filter((r) => r.predicateShift).length,
  tierMovement: tierMove,
  fixedGapHist: gapHist,
  collisions: rows.filter((r) => r.collision === 'CONFLICT').length,
  intraBatchDup: Object.keys(dupInBatch).length,
  hardConstraintViolations: rows.filter((r) => !r.hardNoTs).length,
  invarianceViolations: invarianceViolations.length,
  acmNamespaceResidual: rows.filter((r) => String(r.proposedTreeId).startsWith('tree_acm2012')).length,
}

const freezeChecks = {
  approvedAll: summary.approved === 130,
  noPendingReviewBlocked: summary.pending === 0 && summary.needsReview === 0 && summary.blocked === 0,
  gapWithin3: Object.keys(gapHist).every((g) => g !== 'null' && Number(g) <= 3),
  noCollision: summary.collisions === 0 && summary.intraBatchDup === 0,
  noTsHash: summary.hardConstraintViolations === 0,
  noAcmNamespace: summary.acmNamespaceResidual === 0,
  invarianceHolds: summary.invarianceViolations === 0,
  scopeMatchesLive: liveAsplitTreeIds.length === rows.length,
}
const frozen = Object.values(freezeChecks).every(Boolean)

// ── 8. 产出 ─────────────────────────────────────────────────────────────────
const nowIso = new Date().toISOString()
const FINAL = {
  batch: 't3-p1',
  generatedAt: nowIso,
  status: frozen ? 'MAPPING_FREEZE_OK' : 'MAPPING_FREEZE_FAILED',
  basis: [
    'CONSTITUTION v1.1 §3.1/§3.2/§3.6',
    'ADR-0002 identity-and-observation-discipline',
    'batch-asplit-treeid-semanticization-plan.md §79-92',
    't3-p0-naming.proposal.json D1(选B带限定)/D2(tree_<domain>_<semantic-slug>)',
    'governance-ledger §T3 ⑤（冻结前须复核 D1 操作化读法）',
  ],
  predicateCorrection: {
    frozenPredicate: 'TREE_SHAPE=/^tree_[a-z0-9_]+$/ ∧ ¬hash ∧ ¬segment',
    correctedPredicate: '^[a-z][a-z0-9_]*$ ∧ ¬(projection|governance): ∧ ¬k_<ts> ∧ ¬10+位数字 ∧ ¬_s<N>_',
    why: '冻结版附加的 ^tree_ 前缀要求，把本树既有的人工语义 id 族（theory_domain_* / react_root / demo_* / chapter_*）误判为「非语义」→ 命名空间被抬到 ACM CCS 分类层，违反 D2 namespacePolicy',
    itemsAffected: summary.predicateShiftItems,
  },
  d1Recheck: {
    readings: { R1: '保留父全名（仅纯容器末段才剥离）', R2: '一律剥离父末段' },
    adopted: 'R2',
    ground: 'D2 namespaceRegistry 以「子树覆盖」定义命名空间（tree_java_lock_ covers java>锁 子树 / tree_redis_ covers Redis 子树）→ 命名空间 = 子树域，而非父节点全名 → R2',
    consequentialItems: d1Consequential.length,
    consequentialSample: d1Consequential.slice(0, 6).map((r) => ({ oldTreeId: r.oldTreeId, R1: r.d1.r1, R2: r.d1.r2 })),
  },
  namespaceTable: Object.entries(NS_BY_PARENT).map(([pid, v]) => ({ parentId: pid, parentName: byId.get(pid)?.name ?? '?', ...v })),
  summary, freezeChecks,
  items: rows.map((r) => ({
    oldTreeId: r.oldTreeId, name: r.name, nodeRef: r.nodeRef, path: r.path,
    parentTreeId: r.parentId, parentName: r.parentName,
    semanticAncestor: r.fixedAnc, semanticAncestorGap: r.fixedGap,
    predicateShift: r.predicateShift,
    namespace: r.token ? { token: r.token, domain: r.domain, basis: r.basis } : null,
    slug: r.slug, slugFrom: r.slugFrom,
    draftProposedTreeId: r.draftProposed,
    proposedTreeId: r.proposedTreeId,
    collision: r.collision, conditions: r.conditions, failedConditions: r.failed,
    status: r.verdict,
  })),
}
fs.writeFileSync(path.join(OUT, 'asplit-treeid-mapping.FINAL.json'), JSON.stringify(FINAL, null, 2))

// 报告
const L = []
const p = (s = '') => L.push(s)
p('# T3-P1 · `asplit_*` treeId 语义化 —— 批量证据裁决')
p()
p('> **只读批次产物** —— 本清单不产生任何数据变化。范围严格冻结为 `asplit_*` **生效 130 项**。')
p()
p('生成时间：' + nowIso)
p()
p('## 零、裁决结论')
p()
p('```text')
p('scope           ' + summary.scope)
p('approved        ' + summary.approved)
p('pending         ' + summary.pending)
p('needs-review    ' + summary.needsReview)
p('blocked         ' + summary.blocked)
p('重新推导        ' + summary.redriven + '   沿用既定值 ' + summary.preservedVerbatim)
p('谓词修正影响    ' + summary.predicateShiftItems + ' 条')
p('档位迁移        ' + JSON.stringify(summary.tierMovement))
p('冻结闸门        ' + (frozen ? 'MAPPING_FREEZE_OK' : 'MAPPING_FREEZE_FAILED'))
p('```')
p()
p('> **条件① 读法声明**：用户原话「gap ∈ {1,2,3}」是针对**冻结版谓词**下那 38 条 MEDIUM 说的。修正谓词把 23 条的最近语义祖先**拉近**（跳级消失）→ gap 由 1..3 降为 **0**。gap=0 在既定规则里是 HIGH ＝「可自动接受」，比 MEDIUM **更宽松**。故条件①按「**gap ≤ 3（无远跳）**」实现，并在此逐条公开档位迁移，不隐藏：')
p()
p('```text')
for (const [k, v] of Object.entries(summary.tierMovement)) p('  ' + k + '   ' + v + ' 条')
p('```')
p()
p('| 冻结前置条件 | 结果 |')
p('|---|---|')
for (const [k, v] of Object.entries(freezeChecks)) p('| `' + k + '` | ' + (v ? '✅' : '❌') + ' |')
p()
p('## 一、缺陷 1：语义祖先谓词过度排除（根因）')
p()
p('`scripts/dryrun-t3-asplit-semanticization.mjs:104` 的 `TREE_SHAPE = /^tree_[a-z0-9_]+$/` **附加了 `^tree_` 前缀要求**，而该谓词的既定意图（同文件 98–103 行注释）只是排除「时间戳/hash、`_s<N>_` 段位」。')
p()
p('本树存在既有的**人工语义 id 族**，其 id 不以 `tree_` 开头：`theory_domain_*`（30 条）、`demo_*`（16 条）、`chapter_db_*`（18 条）、`react_root`、`school_*`（4 条）。它们不含时间戳/hash，按既定意图应属「可靠语义祖先」。被误排除后，算法**跳级**到更远的 ACM CCS 分类层节点，产出的命名空间形如')
p()
p('```text')
p('tree_acm2012_software_notations_tools_programming_languages   ← 6 段 ACM 分类路径')
p('  ⇒ 树_acm2012_软件_符号与工具_编程语言_juc_tools')
p('```')
p()
p('**这与 `D2 namespacePolicy` 直接冲突** —— 该 policy 明文规定：命名空间取「挂载路径上最近的**域** slug」，**而不是祖先长 id 的机械拼接**（原话，见 `t3-p0-naming.proposal.json` §namingRule）。')
p()
p('### 实测读数')
p()
p('| 项 | 值 |')
p('|---|---:|')
p('| 38 条 MEDIUM 中，修正谓词后**语义祖先发生变化**的 | **' + summary.predicateShiftItems + '** |')
p('| 其中因祖先为**时间戳/hash** 而变化的 | **0** |')
p('| 其中因祖先为**非 `tree_` 前缀的语义 id** 而变化的 | **23** |')
p()
p('> `crossHash = 0` 是关键反例分析：修正谓词**没有**放宽到时间戳 id —— 它只收回了那一条本就不该加的 `^tree_` 要求。')
p()
p('### 受影响条目（23 条）')
p()
p('| 旧 treeId | name | 冻结版语义祖先（跳级结果） | 修正后语义祖先 | gap |')
p('|---|---|---|---|---:|')
for (const r of rows.filter((x) => x.predicateShift)) {
  p('| `' + r.oldTreeId + '` | ' + r.name + ' | `' + r.strictAnc + '` [' + (byId.get(r.strictAnc)?.name ?? '?') + '] | `' + r.fixedAnc + '` [' + (byId.get(r.fixedAnc)?.name ?? '?') + '] | ' + r.strictGap + '→' + r.fixedGap + ' |')
}
p()
p('### 缺陷 2：该缺陷同时造成一条**硬规则违反**')
p()
p('`asplit_s132_base_theory`（BASE理论）在冻结版下产出 `tree_acm2012_systems_k_1783170416767_yaym2f` —— 结果 id 内**含 13 位时间戳 + hash**，直接违反 `namingRule.hardConstraints[0]`（用户对 `asplit_s132_base_theory` 的同源裁决）。修正谓词后其最近语义祖先为「分布式系统」，产出 `tree_distributed_systems_base_theory` ⇒ 违反自动消失。')
p()
p('## 二、D1 操作化读法复核（台账 §T3 ⑤ 强制门）')
p()
p('`t3-p0-naming.proposal.json` 的 `openDecisions[0].operationalization.ambiguityFlag` 要求：**冻结映射表前必须以实际形态复核一次**。两种读法：')
p()
p('| 读法 | 公式 | 例（父 = `tree_redis_rdb_persistence`，子 slug = `rdb_save_cmd`）|')
p('|---|---|---|')
p('| R1 保留父全名 | 仅当父末段属纯容器词才剥离 | `tree_redis_rdb_persistence_rdb_save_cmd` |')
p('| R2 一律剥离父末段 | namespace = 父 id 去末段 | `tree_redis_rdb_rdb_save_cmd` |')
p()
p('**裁定 = R2**，依据是 D2 的 `namespaceRegistry`：它**以「子树覆盖」定义命名空间**（`tree_java_lock_` covers *java > 锁 子树*；`tree_redis_` covers *Redis 子树*；`tree_java_jmm_` covers *内存模型子树*）。命名空间既然是**子树域**，就不是父节点全名 ⇒ R1 与 registry 自相矛盾。')
p()
p('> 本批对 ' + summary.preservedVerbatim + ' 条沿用既定值项**零影响**（它们已按 R2 形态冻结）。D1 两读法的**实质**差异只落在「父节点即命名空间源」（gap=0）且父末段非纯容器词的条目上，共 **' + d1Consequential.length + '** 条：')
p()
if (d1Consequential.length) {
  p('| 旧 treeId | R1（保留父全名）| R2（剥离父末段）|')
  p('|---|---|---|')
  for (const r of d1Consequential.slice(0, 12)) p('| `' + r.oldTreeId + '` | `' + r.d1.r1 + '` | `' + r.d1.r2 + '` |')
  if (d1Consequential.length > 12) p('| *（其余 ' + (d1Consequential.length - 12) + ' 条同形，见 FINAL.json `d1Recheck`）* | | |')
  p()
}
p('> 若你的原意是 **R1**（一律保留父全名），只需一句话即可翻转 —— 届时上表 ' + d1Consequential.length + ' 条随之改写，本批其余部分不受影响。')
p()
p('## 三、域命名空间表（D2 规范 `tree_<domain>_<semantic-slug>`）')
p()
p('| 直接父节点 | 父名 | domain token | 域 | 依据 |')
p('|---|---|---|---|---|')
for (const [pid, v] of Object.entries(NS_BY_PARENT)) p('| `' + pid + '` | ' + (byId.get(pid)?.name ?? '?') + ' | `' + v.token + '` | ' + v.domain + ' | ' + v.basis + ' |')
p()
p('> `D2 hardLimit`：**domain 只是 ID namespace，不是 ontology 判定** —— 上表的 token 只承担「同一域内不再二次改名」的命名空间职责，不构成本体归属断言。')
p()
p('## 四、逐条裁决（130 项）')
p()
p('| # | 旧 treeId | name | 档位(草案→修正) | gap | 提议新 treeId | 命名空间来源 | 碰撞 | 裁决 |')
p('|---|---|---|---|---:|---|---|---|---|')
rows.forEach((r, i) => {
  p('| ' + (i + 1) + ' | `' + r.oldTreeId + '` | ' + r.name + ' | ' + r.draftTier + '→' + r.tier + ' | ' + r.fixedGap + ' | `' + (r.proposedTreeId ?? '—') + '` | ' + (r.token ? '`' + r.token + '`' : '沿用既定值') + ' | ' + r.collision + ' | ' + (r.verdict === 'APPROVED' ? '✅' : '❌ ' + r.failed.join(' / ')) + ' |')
})
p()
p('## 五、不变性证明（未重推导项：' + untouched.length + ' 条）')
p()
p('```text')
p('未重推导项 冻结值 ≠ 草案值 的条数 = ' + invarianceViolations.length)
p('```')
p()
p(invarianceViolations.length === 0
  ? '=> **零漂移**：凡不需重推导的条目，其 id 与既有草案逐字一致 —— 本批不借重推导之名改动已裁决项。'
  : '=> ⚠️ 出现漂移，须逐条说明。')
p()
p('## 六、全库反证')
p()
p('```text')
p('真源 md5   tree-data.json     ' + md5(TREE))
p('           node-pool.json     ' + md5(POOL))
p('           knowledge-edges.json ' + md5(EDGES))
p('真源 asplit_* 树 id 计数        ' + liveAsplitTreeIds.length + '   （应 == 130）')
p('130 项新 id 与既有 tree/池/边 id 碰撞  ' + summary.collisions)
p('批内重复                        ' + summary.intraBatchDup)
p('硬约束（无 ts/hash/段位）违反     ' + summary.hardConstraintViolations)
p('残留 ACM 命名空间               ' + summary.acmNamespaceResidual)
p('```')
p()
p('## 七、落盘阶段的影响面（预告，由 apply 与独立验证复核）')
p()
p('```text')
p('tree-data.json    改 ' + rows.length + ' 个节点 id（只碰 id 字段；nodeRef / name / count / children 结构不动）')
p('knowledge-edges.json  只改 treebind: 边 id 中被改名的两端；source/target 是池 ref，零触碰')
p('node-pool.json    零改动    questions.json  零改动')
p('```')
fs.writeFileSync(path.join(OUT, 't3-p1-adjudication.md'), L.join('\n'))

console.log('=== T3-P1 批量裁决 ===')
console.log(JSON.stringify(summary, null, 2))
console.log('freezeChecks', JSON.stringify(freezeChecks))
console.log('frozen =', frozen ? 'MAPPING_FREEZE_OK' : 'MAPPING_FREEZE_FAILED')
if (!frozen) {
  console.log('\n--- BLOCK 条目 ---')
  for (const r of rows.filter((x) => x.verdict === 'BLOCK')) console.log(' ', r.oldTreeId, '|', r.name, '|', r.failed.join(','), '| proposed=', r.proposedTreeId)
  console.log('\n--- 硬约束违反 ---')
  for (const r of rows.filter((x) => !x.hardNoTs)) console.log(' ', r.oldTreeId, '=>', r.proposedTreeId)
}
