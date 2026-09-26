#!/usr/bin/env node
/**
 * DB-KEY-CONSTRAINTS · 只读预检（不复跑写盘，不 import apply 脚本）
 *
 * 立项：用户 2026-09-16 诊断 —— 「数据库」[demo_db] 一级 30 孩里 12 个是散装导入残留，
 * 键/表/索引三者分层、主键与代理键各有双身份。本批只做**归位**，不做融合。
 *
 * 用户两项裁决（本预检据此取数，不重复裁决）：
 *   (a) 主键双身份不融合：键与约束下只挂 concept_primary_key；
 *       散装 k_1788179275554_knwq7e 先逐字段比对，有独有资产则迁入后删。
 *   (b) 代理键的维基重复挂载本批不摘（属 L4 跨区级问题，登记为独立债）。
 *
 * 产出（全部只读：本脚本不写任何 data/*.json）：
 *   outputs/tree-violation-scan/precheck-db-key-constraints.json  机器可读
 *   outputs/tree-violation-scan/db-key-constraints-preflight.md   人工审查
 *
 * ⚠️ 冒号陷阱：tree 条目 id 含冒号（projection:mysql-term:xxx / mysql:concept:server），
 *    故**禁止**用 id.split(':') 反解 treebind 的父子关系，一律走 type/label/source/target。
 *
 * 用法：node scripts/precheck-db-key-constraints.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')
fs.mkdirSync(OUT, { recursive: true })

const tree = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'))
// ⚠️ node-pool.json 是 id → node 的**对象映射**（不是数组）；tree/edges/questions/events 为数组或单根对象
const poolRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'))
const pool = Array.isArray(poolRaw) ? poolRaw : Object.values(poolRaw)
const edges = JSON.parse(fs.readFileSync(path.join(DATA, 'knowledge-edges.json'), 'utf8'))
const questions = JSON.parse(fs.readFileSync(path.join(DATA, 'questions.json'), 'utf8'))
const events = JSON.parse(fs.readFileSync(path.join(DATA, 'evolution-events.json'), 'utf8'))

// ── 索引 ────────────────────────────────────────────────────────────────
const byTreeId = new Map()
const parentOf = new Map()
const pathOf = new Map() // treeId → [names]
const fmtName = (n) => String(n.name ?? '').replace(/\s+/g, ' ').trim() || '(无名)'
const walkTree = (node, parent, trail) => {
  byTreeId.set(node.id, node)
  if (parent) parentOf.set(node.id, parent)
  const t = [...trail, fmtName(node)]
  pathOf.set(node.id, t)
  for (const c of node.children || []) walkTree(c, node, t)
}
walkTree(tree, null, [])

const byPoolId = new Map()
for (const n of pool) byPoolId.set(n.id, n)

const isTreeEdge = (e) => e.type === 'belongs-to' && e.label === 'contains'
const treebindEdges = edges.filter((e) => isTreeEdge(e) && String(e.id).startsWith('treebind:'))
const projectionEdges = edges.filter((e) => isTreeEdge(e) && String(e.id).startsWith('treeprojection:'))

/** 池内 ref 出现在几个树节点上（重复挂载检测；container:/n_ 伪 ref 不计池） */
const refMounts = new Map()
const collectRefs = (n) => {
  if (n.nodeRef) {
    if (!refMounts.has(n.nodeRef)) refMounts.set(n.nodeRef, [])
    refMounts.get(n.nodeRef).push(n.id)
  }
  for (const c of n.children || []) collectRefs(c)
}
collectRefs(tree)

const incomingEdges = (ref) => treebindEdges.filter((e) => e.target === ref)
const childEdge = (parentRef, childRef) =>
  treebindEdges.find((e) => e.source === parentRef && e.target === childRef)

// ── 作用域：demo_db 的一级孩子 ──────────────────────────────────────────
const DB_ROOT = 'demo_db'
const root = byTreeId.get(DB_ROOT)
if (!root) throw new Error('未找到 demo_db')
const level1 = root.children || []
const CHAPTER_RE = /^container:chapter_db_\d+$/
const chapterItems = level1.filter((c) => CHAPTER_RE.test(String(c.nodeRef ?? '')))
const looseItems = level1.filter((c) => !CHAPTER_RE.test(String(c.nodeRef ?? '')))

// ── 内容指纹（逐字段可比，不读整份正文进内存）─────────────────────────
const sha = (s) => (typeof s === 'string' && s.length ? crypto.createHash('sha1').update(s).digest('hex').slice(0, 12) : null)
const tabFp = (t) => ({
  id: t.id,
  label: t.label ?? null,
  contentLen: (t.content ?? '').length,
  contentSha: sha(t.content),
  tableRows: t.table?.rows?.length ?? 0,
  pages: (t.pages || []).length,
  tabs: (t.tabs || []).length,
})
const nodeFp = (n) => {
  if (!n) return null
  const card = n.card || {}
  return {
    id: n.id,
    label: n.label ?? null,
    kind: n.kind ?? null,
    canonicalKey: n.canonicalKey ?? null,
    aliases: n.aliases ?? null,
    tags: n.tags ?? null,
    dimensions: n.dimensions ?? null,
    role: n.role ?? null,
    shared: n.shared ?? null,
    locked: n.locked ?? null,
    hasMechanismSpec: Boolean(n.mechanismSpec),
    relationIndex: n.relationIndex ?? null,
    viewDimensions: (n.viewDimensions || []).map((d) => ({
      id: d.id,
      name: d.name,
      sections: (d.sections || []).map((s) => ({ id: s.id, layout: s.layout, atoms: (s.atoms || []).length })),
      groups: (d.groups || []).length,
    })),
    card: {
      nodeId: card.nodeId ?? null,
      title: card.title ?? null,
      rootContentLen: (card.rootContent ?? '').length,
      rootContentSha: sha(card.rootContent),
      hasRootTable: Boolean(card.rootTable),
      notesLen: (card.notes ?? '').length,
      tabCount: (card.tabs || []).length,
      tabs: (card.tabs || []).map((t) => {
        const f = tabFp(t)
        return { ...f, children: (t.tabs || []).map(tabFp) }
      }),
    },
  }
}

/** 两份池实体的逐字段 diff：只报「不同」与「单边有」，相同项折叠成计数 */
const diffFp = (a, b) => {
  const same = []
  const diff = []
  const keys = [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])]
  for (const k of keys) {
    const av = JSON.stringify(a?.[k] ?? null)
    const bv = JSON.stringify(b?.[k] ?? null)
    if (av === bv) same.push(k)
    else diff.push({ field: k, left: JSON.parse(av), right: JSON.parse(bv) })
  }
  return { sameCount: same.length, sameFields: same, diffCount: diff.length, diff }
}

/** 单边独有资产：正文/tab 的 sha 只在一侧出现 ⇒ 融合时必须迁入（本批只登记不迁移） */
const orphanAssets = (a, b) => {
  const grab = (n) => {
    const out = []
    if (!n) return out
    if ((n.card?.rootContent ?? '').length)
      out.push({ where: `${n.id}.card.rootContent`, len: n.card.rootContent.length, sha: sha(n.card.rootContent) })
    const rec = (ts, prefix) => {
      for (const t of ts || []) {
        if ((t.content ?? '').length)
          out.push({ where: `${n.id}.${prefix}${t.id}`, len: t.content.length, sha: sha(t.content) })
        rec(t.tabs, `${prefix}${t.id}/`)
      }
    }
    rec(n.card?.tabs, 'tab:')
    return out
  }
  const la = grab(a)
  const lb = grab(b)
  const bShas = new Set(lb.map((x) => x.sha))
  const aShas = new Set(la.map((x) => x.sha))
  return {
    leftOnly: la.filter((x) => !bShas.has(x.sha)),
    rightOnly: lb.filter((x) => !aShas.has(x.sha)),
  }
}

// ── 反向引用索引（门一「零活引用扫描」六处口径）───────────────────────
const atomRefIndex = new Map() // ref → [{owner, dimId, sectionId}]
for (const n of pool) {
  for (const d of n.viewDimensions || []) {
    for (const s of d.sections || []) {
      for (const a of s.atoms || []) {
        if (!atomRefIndex.has(a.nodeId)) atomRefIndex.set(a.nodeId, [])
        atomRefIndex.get(a.nodeId).push({ owner: n.id, dimId: d.id, sectionId: s.id })
      }
    }
  }
}
const questionIndex = new Map() // ref → [{id, kind: 'related'|'step'}]
for (const q of questions) {
  if (q.relatedNodeId) {
    if (!questionIndex.has(q.relatedNodeId)) questionIndex.set(q.relatedNodeId, [])
    questionIndex.get(q.relatedNodeId).push({ id: q.id, kind: 'related' })
  }
  for (const st of q.answerSteps || []) {
    if (!st?.nodeId) continue
    if (!questionIndex.has(st.nodeId)) questionIndex.set(st.nodeId, [])
    questionIndex.get(st.nodeId).push({ id: q.id, kind: 'step' })
  }
}
const eventRefIndex = new Map()
for (const ev of events) {
  const s = JSON.stringify(ev)
  for (const m of s.matchAll(/"([a-zA-Z0-9_:.\-]{6,})"/g)) {
    const cand = m[1]
    if (!byPoolId.has(cand)) continue
    if (!eventRefIndex.has(cand)) eventRefIndex.set(cand, [])
    const arr = eventRefIndex.get(cand)
    if (!arr.includes(ev.id)) arr.push(ev.id)
  }
}
const liveRefs = (ref) => ({
  treeMounts: (refMounts.get(ref) || []).length,
  treeMountIds: refMounts.get(ref) || [],
  treebindIncoming: incomingEdges(ref).map((e) => ({ id: e.id, source: e.source })),
  treeprojectionIncoming: projectionEdges.filter((e) => e.target === ref).map((e) => ({ id: e.id, source: e.source })),
  otherEdges: edges
    .filter((e) => (e.source === ref || e.target === ref) && !isTreeEdge(e))
    .map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type, relationKind: e.relationKind ?? null })),
  poolAtoms: atomRefIndex.get(ref) || [],
  questions: questionIndex.get(ref) || [],
  evolutionEvents: eventRefIndex.get(ref) || [],
})

// ── 12 个散装项的事实卡 ─────────────────────────────────────────────────
const items = looseItems.map((n) => {
  const ref = n.nodeRef ?? null
  const p = parentOf.get(n.id)
  const kids = n.children || []
  return {
    treeId: n.id,
    name: fmtName(n),
    path: (pathOf.get(n.id) || []).join(' > '),
    depthFromDbRoot: (pathOf.get(n.id) || []).length - (pathOf.get(DB_ROOT) || []).length,
    treeNodeFields: { hasSupplement: Boolean(n.supplement), hasCount: n.count !== undefined },
    ref,
    poolExists: ref ? byPoolId.has(ref) : false,
    poolKind: ref && byPoolId.has(ref) ? byPoolId.get(ref).kind ?? null : null,
    poolLabel: ref && byPoolId.has(ref) ? byPoolId.get(ref).label ?? null : null,
    childCount: kids.length,
    children: kids.map((c) => ({ id: c.id, name: fmtName(c), ref: c.nodeRef ?? null })),
    upstreamEdge: p ? childEdge(p.nodeRef, ref)?.id ?? null : null,
    upstreamEdgeExists: Boolean(p && childEdge(p.nodeRef, ref)),
    refs: ref ? liveRefs(ref) : null,
    duplicateRefMount: ref ? (refMounts.get(ref) || []).length > 1 : false,
  }
})

// ── 归位目标路径（提案；本预检只渲染与校验，不落盘）────────────────────
const KEY_CONTAINER = {
  idCandidates: ['tree_concept_key_constraint', 'tree_key_constraint', 'tree_key_constraints'],
  name: '键与约束 / key & constraint',
  parentTreeId: 'chapter_db_03',
  parentName: '数据库结构',
  ref: null,
  refNote:
    '⚠️ 实测：全库 **0 个**无 nodeRef 的树节点 ⇒「纯分组节点」没有先例，ref=null 会破坏「每个树节点都指向池实体或伪 ref」的现状。两条可选：① 仿 chapter 壳用 `container:key_constraint` 伪 ref（全库 20 个 container: 伪 ref 有先例）；② 新建并写正文的池实体（如 `concept_key_constraint`）。需裁决。',
  note: '与 chapter_db_03 现有 表/列/行/参照完整性 同级；本节点不持正文（选 ① 时与 chapter 壳同形态）',
}
const PROPOSAL = [
  { treeId: 'tree_concept_surrogate_key', ref: 'concept_surrogate_key', to: 'chapter_db_03', via: 'KEY', status: 'MOVE', why: '键族；维基份另计（裁决 b）' },
  { treeId: 'tree_concept_natural_key', ref: 'concept_natural_key', to: 'chapter_db_03', via: 'KEY', status: 'MOVE', why: '键族' },
  { treeId: 'tree_concept_unique_key', ref: 'concept_unique_key', to: 'chapter_db_03', via: 'KEY', status: 'MOVE', why: '键 + 约束族' },
  { treeId: 'tree_concept_foreign_key', ref: 'concept_foreign_key', to: 'chapter_db_03', via: 'KEY', status: 'MOVE', why: '键族；语义邻居 参照完整性/子表/父级表 已在 chapter_db_03' },
  { treeId: 'tree_concept_not_null_constraint', ref: 'concept_not_null_constraint', to: 'chapter_db_03', via: 'KEY', status: 'MOVE', why: '约束族' },
  { treeId: 'tree_concept_guid', ref: 'concept_guid', to: 'chapter_db_03', via: 'KEY', status: 'MOVE_WITH_OPTION', why: 'GUID 是代理键的一种实现 ⇒ 直挂 键与约束 or 挂到 代理键 下，需一句裁决' },
  { treeId: 'tree_1788179275561_216qli', ref: 'k_1788179275554_knwq7e', to: 'chapter_db_03', via: 'KEY', status: 'MOVE_LIKELY', why: '它是**带子树的主键概念**（子树「主键类型选择：自增 vs UUID」6 孩）· 正文=工程视角主键' },
  { treeId: 'tree_concept_primary_key', ref: 'concept_primary_key', to: null, via: null, status: 'REVISIT_DECISION_A', why: '⚠️ 裁决前提翻转：实测 label=「主键索引」，但 rootContent/tabs 全是**主键本体**（通用定义 + 跨域实例）⇒ 本体身份其实是它。见 primaryKeyDual.verdict' },
  { treeId: 'projection:mysql-term:k_dict_fxoirizf', ref: 'k_dict_fxoirizf', to: null, via: null, status: 'NEEDS_ADJUDICATION', why: 'NULL 归属见 nullVerdict' },
  { treeId: 'tree_wiki_en_database_s16', ref: 'k_wiki_en_database_s16', to: 'chapter_db_10', via: null, status: 'CANDIDATE', why: '贮存 与章节壳「存储系统」同义错位（同模式，同批可一并归位）' },
  { treeId: 'tree_concept_replication', ref: 'concept_replication', to: 'chapter_db_14', via: null, status: 'CANDIDATE', why: '复制 与章节壳「数据库分布与复制」同义错位' },
  { treeId: 'atomic_atomic_database_backup', ref: 'atomic_database_backup', to: 'chapter_db_08', via: null, status: 'DUPLICATE_PAIR', why: '⚠️ chapter_db_08「恢复系统」下**已有「备份 / backup」** ⇒ 不是搬进空位而是同名重复，需先比对再定融合/登记' },
  { treeId: 'atomic_atomic_database_restore', ref: 'atomic_database_restore', to: 'chapter_db_08', via: null, status: 'DUPLICATE_PAIR', why: '⚠️ chapter_db_08「恢复系统」下**已有「恢复 / restore」** ⇒ 同上，同名重复' },
]
const normName = (s) => String(s).split(' /')[0].replace(/[\s（）()]/g, '').trim()
const proposal = PROPOSAL.map((p) => ({
  ...p,
  fromPath: (pathOf.get(p.treeId) || []).join(' > ') || null,
  toPath: p.to
    ? [...(pathOf.get(p.to) || []), p.via === 'KEY' ? KEY_CONTAINER.name : null].filter(Boolean).join(' > ')
    : null,
  treeNodeExists: byTreeId.has(p.treeId),
  poolNodeExists: p.ref ? byPoolId.has(p.ref) : false,
  targetParentExists: p.to ? byTreeId.has(p.to) : false,
  // 同名冲突：目标父节点下已有同义孩子 ⇒ 归位不是「搬进空位」而是「合并/去重」，必须先裁决
  nameCollisions: p.to
    ? (byTreeId.get(p.to)?.children || [])
        .filter((c) => {
          if (fmtName(c) === KEY_CONTAINER.name) return false
          const a = normName(fmtName(c))
          const b = normName(byTreeId.has(p.treeId) ? fmtName(byTreeId.get(p.treeId)) : p.treeId)
          return a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))
        })
        .map((c) => ({ id: c.id, name: fmtName(c), ref: c.nodeRef ?? null }))
    : [],
}))

const candidateParents = ['chapter_db_03', 'chapter_db_08', 'chapter_db_10', 'chapter_db_12', 'chapter_db_14', 'chapter_db_17'].map((id) => ({
  treeId: id,
  name: byTreeId.has(id) ? fmtName(byTreeId.get(id)) : null,
  exists: byTreeId.has(id),
  ref: byTreeId.get(id)?.nodeRef ?? null,
  children: (byTreeId.get(id)?.children || []).map((c) => ({ id: c.id, name: fmtName(c), ref: c.nodeRef ?? null })),
  childrenWithoutRef: (byTreeId.get(id)?.children || []).filter((c) => !c.nodeRef).map((c) => ({ id: c.id, name: fmtName(c) })),
}))
// ── 双身份：主键 / 代理键 ───────────────────────────────────────────────
const A_PK = 'k_1788179275554_knwq7e'
const B_PK = 'concept_primary_key'
const A_SK = 'concept_surrogate_key'
const B_SK = 'k_wiki_en_outline_of_databases_s24_b4'
const fpA = nodeFp(byPoolId.get(A_PK))
const fpB = nodeFp(byPoolId.get(B_PK))
const fpSA = nodeFp(byPoolId.get(A_SK))
const fpSB = nodeFp(byPoolId.get(B_SK))

const primaryKeyDual = {
  question: '(a) 主键双身份：键与约束下只挂 concept_primary_key，散装份先比对再定处置',
  left: { ref: A_PK, exists: byPoolId.has(A_PK), refs: liveRefs(A_PK), fp: fpA },
  right: { ref: B_PK, exists: byPoolId.has(B_PK), refs: liveRefs(B_PK), fp: fpB },
  diff: diffFp(fpA, fpB),
  orphanAssets: orphanAssets(byPoolId.get(A_PK), byPoolId.get(B_PK)),
  verdict: 'REVISIT_DECISION_A',
  findings: [
    `左 ${A_PK}：label「主键」· rootContent 讲「表中唯一标识每一行的列（非空+唯一）+ InnoDB 聚簇索引」· 有子树「主键类型选择：自增 vs UUID」(6 孩) ⇒ 工程视角主键，带专属子树`,
    `右 ${B_PK}：label「主键索引」· card.title「主键索引」· 但 rootContent 与 tabs 全是**主键本体**（「主键 / primary key 一组列…」+ MySQL/PostgreSQL/SQL 标准 跨域实例）⇒ **label 与正文语义不一致（label 错名）**`,
    `右侧 tags=[主键索引, 主键 / primary key, 数据库建模, 键, 约束] · dimensions=[数据库建模, 键, 约束] ⇒ 按 键/约束 维度命名的概念，不是「索引种类」`,
    `⇒ 裁决 (a) 取到了两个身份的各一半：键与约束该收的是**本体**（右），而右的 label 现在写着「主键索引」。开批次前需重新裁决：先改右 label → 主键，本体份移入键与约束；或键与约束挂左（带子树），右登记为重复身份。`,
  ],
}
const surrogateKeyDual = {
  question: '(b) 代理键双挂载：本批不摘维基份，仅登记为独立债',
  left: { ref: A_SK, exists: byPoolId.has(A_SK), refs: liveRefs(A_SK), fp: fpSA },
  right: { ref: B_SK, exists: byPoolId.has(B_SK), refs: liveRefs(B_SK), fp: fpSB },
  diff: diffFp(fpSA, fpSB),
  orphanAssets: orphanAssets(byPoolId.get(A_SK), byPoolId.get(B_SK)),
}
// ── NULL 归属判定依据 ───────────────────────────────────────────────────
const NULL_REF = 'k_dict_fxoirizf'
const nullNode = byPoolId.get(NULL_REF)
const valueFamily = pool
  .filter((n) => /^(NULL|空值|默认值|缺省值|三值逻辑|空字符串)/i.test(String(n.label ?? '')))
  .map((n) => ({
    id: n.id,
    label: n.label,
    kind: n.kind ?? null,
    tags: n.tags ?? null,
    treeMounts: refMounts.get(n.id) || [],
    edgeCount: edges.filter((e) => e.source === n.id || e.target === n.id).length,
  }))
const nullVerdict = {
  ref: NULL_REF,
  exists: Boolean(nullNode),
  label: nullNode?.label ?? null,
  tags: nullNode?.tags ?? null,
  card: {
    title: nullNode?.card?.title ?? null,
    rootContentLen: (nullNode?.card?.rootContent ?? '').length,
    tabCount: (nullNode?.card?.tabs || []).length,
    tabs: (nullNode?.card?.tabs || []).map((t) => ({ id: t.id, label: t.label ?? null, contentLen: (t.content ?? '').length })),
  },
  preview: {
    rootContent: String(nullNode?.card?.rootContent ?? '').slice(0, 320),
    tabs: (nullNode?.card?.tabs || []).map((t) => ({ id: t.id, label: t.label ?? null, head: String(t.content ?? '').slice(0, 200) })),
  },
  currentMount: refMounts.get(NULL_REF) || [],
  refs: liveRefs(NULL_REF),
  valueFamily,
  neighborsInDataRepresentation: (byTreeId.get('chapter_db_12')?.children || []).map((c) => fmtName(c)),
  criteria: [
    '正文在讲「值域 / 未知值语义 / 三值逻辑」⇒ 数据表示（chapter_db_12）',
    '正文在讲「列约束 / 默认值约束」⇒ 键与约束（与 NOT NULL 约束同族）',
    '正文只讲 MySQL 方言用法 ⇒ 留投影态（该条目 id 已在 projection: mysql-term 命名空间）',
  ],
}

// ── 缺失的同族概念（候选键 / 复合键 / 超键）────────────────────────────
const missingConcepts = ['候选键', '复合键', '超键', 'candidate key', 'composite key', 'superkey'].map((k) => ({
  term: k,
  inPool: pool.filter((n) => String(n.label ?? '').includes(k)).map((n) => ({ id: n.id, label: n.label })),
  inTree: [...byTreeId.values()].filter((n) => fmtName(n).includes(k)).map((n) => ({ id: n.id, name: fmtName(n) })),
}))

// ── 新容器 id / 名字占位检查 ────────────────────────────────────────────
const newIdCheck = KEY_CONTAINER.idCandidates.map((id) => ({
  id,
  treeConflict: byTreeId.has(id),
  poolConflict: byPoolId.has(id),
  edgeMentions: edges.filter((e) => e.source === id || e.target === id).length,
}))
const keyNameTreeHits = [...byTreeId.values()].filter((n) => fmtName(n).includes('键与约束')).map((n) => n.id)

// 口径透明补测：树条目 vs 唯一 id、伪 ref 分布、以及「树包含边」的 id 前缀陷阱
const refLessTreeNodes = (() => {
  let c = 0
  const w = (n) => {
    if (!n.nodeRef) c += 1
    for (const k of n.children || []) w(k)
  }
  w(tree)
  return c
})()
const pseudoRefCensus = (() => {
  const out = { container: 0, n: 0, projection: 0, other: 0 }
  for (const r of refMounts.keys()) {
    if (String(r).startsWith('container:')) out.container += 1
    else if (/^n_/.test(String(r))) out.n += 1
    else if (String(r).startsWith('projection:')) out.projection += 1
    else out.other += 1
  }
  return out
})()
const belongsToContainsNonTreebind = edges.filter(
  (e) => e.type === 'belongs-to' && e.label === 'contains' && !String(e.id).startsWith('treebind:'),
).length
const treebindPrefixAnomalies = edges.filter(
  (e) => String(e.id).startsWith('treebind:') && !(e.type === 'belongs-to' && e.label === 'contains'),
).length
const belongsToNonContainsLabel = edges.filter((e) => e.type === 'belongs-to' && e.label !== 'contains').length
// ── 基线计数（G10 / G12 口径）──────────────────────────────────────────
const counts = {
  treeNodes: byTreeId.size,
  poolNodes: pool.length,
  edges: edges.length,
  treebindEdges: treebindEdges.length,
  treeprojectionEdges: projectionEdges.length,
  danglingTreebindTargets: treebindEdges.filter((e) => !byPoolId.has(e.target)).length,
  belongsToContainsNonTreebind,
  treebindPrefixAnomalies,
  belongsToNonContainsLabel,
  refLessTreeNodes,
  pseudoRefCensus,
  demoDbLevel1: level1.length,
  chapterItems: chapterItems.length,
  looseItems: looseItems.length,
  looseWithoutUpstreamTreebind: looseItems.filter((c) => !childEdge(root.nodeRef, c.nodeRef)).length,
  keyFamilyWithoutUpstreamTreebind: looseItems.filter((c) => /键|约束|GUID/.test(fmtName(c)) && !childEdge(root.nodeRef, c.nodeRef)).length,
}
const gateHints = {
  G7_colonSafe: {
    newParentTreeId: KEY_CONTAINER.parentTreeId,
    newParentContainsColon: KEY_CONTAINER.parentTreeId.includes(':'),
    movedItemsWithColon: looseItems.filter((c) => c.id.includes(':')).map((c) => c.id),
    note: '作用域内含冒号 treeId ⇒ 父子解析一律走 edge source/target，禁 id.split(":")',
  },
  G8_containerRef: {
    containerRefsInScope: chapterItems.map((c) => ({ id: c.id, ref: c.nodeRef })),
    containerSourceEdges: edges.filter((e) => String(e.source).startsWith('container:')).length,
    note: '⚠️ 实测：全库 0 个无 ref 树节点 ⇒ 新分组节点不能 ref=null。伪 ref 分布：container: 20 个 · n_ 9 个 · projection: 0 个。要么仿 chapter 壳用 container:key_constraint，要么新建并写正文的池实体',
  },
  G9_edgeIdTrap: {
    belongsToContainsNonTreebind,
    treebindPrefixAnomalies,
    belongsToNonContainsLabel,
    note: '⚠️「树包含边」不能只看 id 前缀或只看 type/label：① 430 条 java_source:* 边也是 belongs-to+contains（JDK 导入的类树，非目录树）；② 9 条 treebind: 前缀边用 type=structure/label=结构包含（p-web-http-scope 遗留口径漂移）；③ 25 条 belongs-to 用中文 label。本预检测「目录挂载边」的口径 = id 前缀 treebind: ∧ type=belongs-to ∧ label=contains ⇒ 会漏掉 ②，须在正式批次里逐条按目标 ref 复核。',
  },
}

const subtreeNodes = (() => {
  const size = (n) => 1 + (n.children || []).reduce((s, c) => s + size(c), 0)
  return size(root)
})()
const report = {
  generatedAt: new Date().toISOString(),
  mode: 'READ_ONLY',
  batchCandidateId: 'db-key-constraint-relocation',
  scope: {
    rootTreeId: DB_ROOT,
    rootRef: root.nodeRef ?? null,
    rootPath: (pathOf.get(DB_ROOT) || []).join(' > '),
    level1Count: level1.length,
    subtreeNodes,
    chapterItems: chapterItems.map((c) => ({ id: c.id, name: fmtName(c), ref: c.nodeRef })),
  },
  decisions: {
    a_primaryKey: '不融合：键与约束只挂 concept_primary_key；散装份先逐字段比对，有独有资产则迁入后删（本批只归位）',
    b_surrogateKeyWiki: '本批不摘维基重复挂载（L4 跨区级），登记为独立债',
  },
  counts,
  items,
  primaryKeyDual,
  surrogateKeyDual,
  proposal,
  candidateParents,
  nullVerdict,
  missingConcepts,
  newIdCheck,
  keyNameTreeHits,
  gateHints,
}
fs.writeFileSync(path.join(OUT, 'precheck-db-key-constraints.json'), JSON.stringify(report, null, 2), 'utf8')
// ── 人工审查用 Markdown ────────────────────────────────────────────────
const md = []
const P = (s = '') => md.push(s)
const KEY_PARENT_PATH = (pathOf.get(KEY_CONTAINER.parentTreeId) || []).join(' > ')
const cell = (v) => {
  const s = JSON.stringify(v)
  if (s === undefined) return '—'
  return s.length > 160 ? s.slice(0, 157) + '…' : s
}
P('# DB-KEY-CONSTRAINT-RELOCATION · 只读预检')
P()
P(`- 生成时间：${report.generatedAt}`)
P('- 模式：**READ_ONLY**（本脚本不写任何 `data/*.json`）')
P(`- 作用域：\`${report.scope.rootPath}\`（treeId \`${DB_ROOT}\` · ref \`${report.scope.rootRef}\`）· 子树 ${subtreeNodes} 个树节点 · 一级孩子 ${level1.length}`)
P('- 机器可读：`outputs/tree-violation-scan/precheck-db-key-constraints.json`')
P()
P('## 0. 裁决口径（沿用 2026-09-16 用户裁定，本预检不重复裁决）')
P()
P(`1. **主键双身份**：${report.decisions.a_primaryKey}`)
P(`2. **代理键维基份**：${report.decisions.b_surrogateKeyWiki}`)
P()
P('## 1. 基线计数')
P()
P('| 项 | 读数 |')
P('|---|---:|')
for (const [k, v] of Object.entries(counts))
  P(`| \`${k}\` | ${v !== null && typeof v === 'object' ? '`' + JSON.stringify(v) + '`' : v} |`)
P()
P('## 2. 散装项事实表（一级孩子中非 chapter 壳者）')
P()
P('| # | 名称 | treeId | 池 ref | 池内? | 上游 treebind 边 | 子树孩数 | ref 树挂载数 | 池内原子 | 题库引用 | 其他边 |')
P('|---:|---|---|---|---|---|---|---:|---|---|---|')
items.forEach((it, i) => {
  const r = it.refs
  P(
    `| ${i + 1} | ${it.name} | \`${it.treeId}\` | \`${it.ref ?? '—'}\` | ${it.poolExists ? '是' : '**否**'} | ${
      it.upstreamEdgeExists ? '`' + it.upstreamEdge + '`' : '**无**'
    } | ${it.childCount} | ${r?.treeMounts ?? 0} | ${r?.poolAtoms.length ?? 0} | ${r?.questions.length ?? 0} | ${r?.otherEdges.length ?? 0} |`,
  )
})
P()
const noUpstream = items.filter((it) => !it.upstreamEdgeExists)
P(`- **无上游 treebind 边**：${noUpstream.length}/${items.length} —— ${noUpstream.map((i) => i.name).join(' · ') || '（无）'}`)
const withAtoms = items.filter((it) => (it.refs?.poolAtoms.length ?? 0) > 0)
P(`- **被 viewDimensions 原子引用**：${withAtoms.length} 个 —— ${withAtoms.map((i) => `${i.name}(${i.refs.poolAtoms.length})`).join(' · ') || '（无）'}`)
const dupMount = items.filter((it) => it.duplicateRefMount)
P(`- **ref 重复挂载**（同一 ref 挂多个树节点）：${dupMount.length} 个 —— ${dupMount.map((i) => `${i.name}(\`${i.ref}\`)`).join(' · ') || '（无）'}`)
P('- 每个 item 的六处引用明细（treebind / treeprojection / 非包含边 / 池内原子 / 题库 / 演化事件）见 JSON `items[].refs`。')
P()
P('## 3. 主键双身份逐字段 diff（裁决 a 的证据）')
P()
P(`- 左 \`${A_PK}\`（散装 · 数据库一级）· 右 \`${B_PK}\`（索引章节下 · 语义 id）`)
P(`- 相同字段 ${primaryKeyDual.diff.sameCount} 个：${primaryKeyDual.diff.sameFields.join(', ')}`)
P()
P(`| 字段 | 左（${A_PK}） | 右（${B_PK}） |`)
P('|---|---|---|')
for (const d of primaryKeyDual.diff.diff) P(`| \`${d.field}\` | ${cell(d.left)} | ${cell(d.right)} |`)
P()
P(`- **单边独有正文资产**（融合时须迁入；本批只登记不迁移）：左独有 ${primaryKeyDual.orphanAssets.leftOnly.length} 条 · 右独有 ${primaryKeyDual.orphanAssets.rightOnly.length} 条`)
for (const x of primaryKeyDual.orphanAssets.leftOnly) P(`  - 左独有 \`${x.where}\` len=${x.len} sha=${x.sha}`)
for (const x of primaryKeyDual.orphanAssets.rightOnly) P(`  - 右独有 \`${x.where}\` len=${x.len} sha=${x.sha}`)
P()
P(`### ️ 判定：\`${primaryKeyDual.verdict}\` —— 裁决 (a) 的前提被实测推翻`)
P()
for (const f of primaryKeyDual.findings) P(`- ${f}`)
P()
P('## 4. 代理键双身份逐字段 diff（裁决 b 的证据）')
P()
P(`- 左 \`${A_SK}\`（数据库一级）· 右 \`${B_SK}\`（数据库系统 > 数据仓库 > 元素 · 维基派生物）`)
P('- ⚠️ 两者 **ref 不同** ⇒ 这是「同一概念两个身份」，不是「同一 ref 重复挂载」。真正的重复挂载另见 §2。')
P(`- 相同字段 ${surrogateKeyDual.diff.sameCount} 个：${surrogateKeyDual.diff.sameFields.join(', ')}`)
P()
P(`| 字段 | 左（${A_SK}） | 右（${B_SK}） |`)
P('|---|---|---|')
for (const d of surrogateKeyDual.diff.diff) P(`| \`${d.field}\` | ${cell(d.left)} | ${cell(d.right)} |`)
P()
P(`- 单边独有正文资产：左独有 ${surrogateKeyDual.orphanAssets.leftOnly.length} 条 · 右独有 ${surrogateKeyDual.orphanAssets.rightOnly.length} 条`)
P()
P('## 5. 归位目标路径（每项精确 from → to）')
P()
P(`**新容器提案**：\`${KEY_CONTAINER.name}\` 挂到 \`${KEY_CONTAINER.parentTreeId}\`（${KEY_PARENT_PATH}）`)
P(`- ${KEY_CONTAINER.note}`)
P(`- **容器 ref 形态（实测推翻「ref=null」方案）**：${KEY_CONTAINER.refNote}`)
P(`- id 占位检查：${newIdCheck.map((c) => `\`${c.id}\` tree=${c.treeConflict ? '**冲突**' : '空闲'} pool=${c.poolConflict ? '**冲突**' : '空闲'}`).join(' · ')}`)
P(`- 同名节点检查：${keyNameTreeHits.length ? keyNameTreeHits.map((h) => `\`${h}\``).join(', ') : '0 个 —— 「键与约束」名字可用'}`)
P()
P('| # | 名称 | from | to | 状态 | 目标同名冲突 | 依据 |')
P('|---:|---|---|---|---|---|---|')
proposal.forEach((p, i) => {
  const nm = byTreeId.has(p.treeId) ? fmtName(byTreeId.get(p.treeId)) : '<mark>条目不存在</mark>'
  const col = p.nameCollisions.length
    ? '⚠️ ' + p.nameCollisions.map((c) => `「${c.name}」(\`${c.id}\`)`).join(' · ')
    : '—'
  P(`| ${i + 1} | ${nm} | ${p.fromPath ?? '<mark>条目不存在</mark>'} | ${p.toPath ?? '<mark>待裁决</mark>'} | \`${p.status}\` | ${col} | ${p.why} |`)
})
P()
const collided = proposal.filter((p) => p.nameCollisions.length)
P(`- ⚠️ **目标父节点下已有同义孩子：${collided.length} 项** —— ${collided.map((p) => `${byTreeId.has(p.treeId) ? fmtName(byTreeId.get(p.treeId)) : p.treeId} → ${p.nameCollisions.map((c) => c.name).join('/')}`).join(' · ') || '（无）'}`)
P('  - 这一类**不是「搬进空位」而是「合并/去重」**：把散装条目搬过去会造出同义兄弟对。处置应是「卸树留池 + 与既有节点融合」或「登记为重复身份」，需单独裁决。')
P()
P('## 6. 候选父节点现状（归位前对拍）')
P()
for (const c of candidateParents) {
  P(`### ${c.name ?? c.treeId}（\`${c.treeId}\`${c.ref ? ` · ref \`${c.ref}\`` : ''}）— ${c.children.length} 孩`)
  P()
  P(`- 现有孩子：${c.children.map((k) => k.name).join(' · ')}`)
  if (c.childrenWithoutRef.length)
    P(`- ⚠️ 其中**无 ref 的孩子**（纯分组先例）：${c.childrenWithoutRef.map((k) => `${k.name}(\`${k.id}\`)`).join(' · ')}`)
  P()
}
P('## 7. NULL 归属判定依据')
P()
P(`- 条目 \`${NULL_REF}\`（treeId \`projection:mysql-term:k_dict_fxoirizf\`）· 当前挂载 \`${nullVerdict.currentMount.join('`, `') || '—'}\``)
P(`- label：\`${nullVerdict.label}\` · tags：\`${JSON.stringify(nullVerdict.tags)}\` · card.title：\`${nullVerdict.card.title}\``)
P(`- 正文：rootContent ${nullVerdict.card.rootContentLen} 字 · tabs ${nullVerdict.card.tabCount} 个${nullVerdict.card.tabs.map((t) => ` [\`${t.id}\` ${t.contentLen}字]`).join('')}`)
P()
P('**正文摘录（判定依据）**：')
P()
P('```')
P(nullVerdict.preview.rootContent || '（rootContent 为空）')
P('```')
for (const t of nullVerdict.preview.tabs) {
  P(`- tab \`${t.id}\`「${t.label}」：`)
  P('```')
  P(t.head || '（空）')
  P('```')
}
P(`- 同族邻居（池内 label 以 NULL/空值/默认值/三值逻辑 开头）：${valueFamily.length} 个`)
for (const v of valueFamily) P(`  - \`${v.id}\`「${v.label}」kind=${v.kind ?? '—'} 树挂载=${v.treeMounts.length} 边=${v.edgeCount}`)
P(`- \`数据表示\`（chapter_db_12）现有孩子：${nullVerdict.neighborsInDataRepresentation.join(' · ')}`)
P()
P('判定标准（三条择一，取正文实际内容）：')
for (const c of nullVerdict.criteria) P(`- ${c}`)
P()
P('## 8. 同族缺失（键与约束建成后的空洞）')
P()
P('| 术语 | 池内 | 树内 |')
P('|---|---|---|')
for (const m of missingConcepts) {
  P(
    `| ${m.term} | ${m.inPool.length ? m.inPool.map((x) => `\`${x.id}\`「${x.label}」`).join(' ') : '**缺**'} | ${
      m.inTree.length ? m.inTree.map((x) => `\`${x.id}\``).join(' ') : '**缺**'
    } |`,
  )
}
P()
P('## 9. 门位提示（供正式批次预检复用）')
P()
P(`- **G7 冒号安全**：新父 \`${gateHints.G7_colonSafe.newParentTreeId}\` 含冒号=${gateHints.G7_colonSafe.newParentContainsColon}`)
P(`  - 作用域内含冒号的 treeId 共 ${gateHints.G7_colonSafe.movedItemsWithColon.length} 个${gateHints.G7_colonSafe.movedItemsWithColon.map((x) => ` \`${x}\``).join('')}`)
P(`  - ${gateHints.G7_colonSafe.note}`)
P(`- **G8 container 伪 ref**：作用域内 ${gateHints.G8_containerRef.containerRefsInScope.length} 个 chapter 壳（\`container:chapter_db_*\`）；全库以 \`container:\` 作 source 的边 ${gateHints.G8_containerRef.containerSourceEdges} 条`)
P(`  - ${gateHints.G8_containerRef.note}`)
P(`- **G9 边 id 前缀陷阱**：belongs-to+contains 但非 treebind 前缀 ${gateHints.G9_edgeIdTrap.belongsToContainsNonTreebind} 条 · treebind 前缀但 type/label 漂移 ${gateHints.G9_edgeIdTrap.treebindPrefixAnomalies} 条 · belongs-to 用非 contains label ${gateHints.G9_edgeIdTrap.belongsToNonContainsLabel} 条`)
P(`  - ${gateHints.G9_edgeIdTrap.note}`)
P()
P('## 10. 未决事项（开正式批次前需裁决）')
P()
P('| # | 事项 | 备选 | 影响面 |')
P('|---:|---|---|---|')
P('| 1 | **主键身份重新裁决**（裁决 a 前提被推翻） | ① 键与约束挂 concept_primary_key 且把它 label 从「主键索引」改为「主键」；② 键与约束挂 k_1788179275554_knwq7e（带子树），concept_primary_key 登记为重复身份；③ 两身份融合（留后续内容批） | 2 树节点 + 1 子树(6 孩) + 1 label |')
P('| 2 | **键与约束 容器的 ref 形态**（实测 0 个无 ref 树节点） | ① `container:key_constraint` 伪 ref（仿 20 个 chapter 壳）；② 新建池实体 `concept_key_constraint` 并写正文 | 1 树节点（+1 池实体若选 ②） |')
P('| 3 | NULL 归属 | 键与约束 / 数据表示(chapter_db_12) / 留投影态 | 1 条目 + 其 tab |')
P('| 4 | GUID 落点 | 直挂 键与约束 / 挂到 代理键 下 | 1 条目 |')
P('| 5 | 数据库备份/恢复 与 chapter_db_08 既有「备份/恢复」节点 | 先逐字段比对（本预检未做）→ 融合 / 卸树留池 / 登记重复身份 | 2 条目 + 2 条 treebind |')
P('| 6 | 章节同义错位的 4 项（贮存/复制/备份/恢复）是否纳入本批 | 纳入 / 另立批次 | 4 条目 + 4 条 treebind |')
P('| 7 | 键与约束 是否补建 候选键/复合键/超键 | 补建（池内已有「候选键」`k_wiki_en_outline_of_databases_s11_b5` 与「超键/候选键/主键/外键 辨析」`k_sql_keys`，只缺树挂载）/ 留空待补 | 0~2 条挂载 |')
P()
P('## 11. 写盘声明')
P()
P('- 本脚本**只读**：未写 `data/*.json`，未 import 任何 apply 脚本。')
P('- 产物：`outputs/tree-violation-scan/precheck-db-key-constraints.json` · `outputs/tree-violation-scan/db-key-constraints-preflight.md`。')
P('- 本预检**不是**批次预检：正式批次仍需 `batch-manifests/db-key-constraint-relocation.json` + 独立备份 + 就绪门（`scripts/verify-phase1-commit-readiness.mjs --batch <id>`）。')

fs.writeFileSync(path.join(OUT, 'db-key-constraints-preflight.md'), md.join('\n'), 'utf8')

console.log('READ_ONLY precheck done')
console.log(JSON.stringify(counts, null, 2))
console.log(`looseItems=${items.length} proposal=${proposal.length} mdLines=${md.length}`)