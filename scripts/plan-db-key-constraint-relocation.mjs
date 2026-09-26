#!/usr/bin/env node
/**
 * DB-KEY-CONSTRAINT-RELOCATION · MVBatch-1 规划器（只读，不写任何 data/*.json）
 *
 * 用户 2026-09-16 裁决（依据 outputs/tree-violation-scan/db-key-constraints-preflight.md 实测）：
 *   ① 主键双身份 —— 路 B：本批不动（属内容融合批）
 *   ② NULL 归属 —— 键与约束（本批不动，推迟）
 *   ③ 容器建法 —— 新建树节点 `key_constraint`，ref = `container:key_constraint`（沿用 container: 先例）
 *   ④ 代理键维基份 —— 不动，登记独立债
 *   ⑤ 备份/恢复 —— 不搬（chapter_db_08 已有同名节点，属融合批）
 *   ⇒ MVBatch-1 只做 6 项：代理键 / 自然键 / 唯一键 / 外键 / NOT NULL 约束 / GUID
 *
 * 本批两项改动（只动 tree-data.json 与 knowledge-edges.json；池零改动）：
 *   A. 树：demo_db.children[18..23] 这 6 个连续条目 → 移入新容器 children；
 *      chapter_db_03.children 末尾追加新容器。树条目 3203 → 3204。
 *   B. 边：6 条 `treebind:demo_db:<treeId>` → `treebind:key_constraint:<treeId>`，
 *      source `n_u4va719e` → `container:key_constraint`；target/type/label/relationKind/dimensions 原样。
 *      边总数 4155 → 4155（只改字段，不增不删）。
 *
 * 产出：outputs/tree-violation-scan/db-key-constraint-relocation-plan.json
 * 用法：node scripts/plan-db-key-constraint-relocation.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')
fs.mkdirSync(OUT, { recursive: true })

// ── 批次声明（apply 脚本逐字复用同一常量）────────────────────────────
export const BATCH_ID = 'db-key-constraint-relocation'
export const BASE_REF = '2888035'
export const SNAPSHOT = 'data/backups/db-key-constraint-relocation-2026-09-16T14-07-16-148Z'
export const ROOT_TREE_ID = 'demo_db'
export const ROOT_TREE_REF = 'n_u4va719e'
export const PARENT_TREE_ID = 'chapter_db_03'
export const PARENT_TREE_REF = 'container:chapter_db_03'
export const NEW_TREE_ID = 'key_constraint'
export const NEW_TREE_REF = 'container:key_constraint'
export const NEW_TREE_NAME = '键与约束 / key & constraint'
export const EXPECTED_START_INDEX = 18
export const MOVES = [
  { treeId: 'tree_concept_surrogate_key', ref: 'concept_surrogate_key', name: '代理键 / surrogate key' },
  { treeId: 'tree_concept_natural_key', ref: 'concept_natural_key', name: '自然键 / natural key' },
  { treeId: 'tree_concept_unique_key', ref: 'concept_unique_key', name: '唯一键 / unique key' },
  { treeId: 'tree_concept_foreign_key', ref: 'concept_foreign_key', name: '外键 / foreign key' },
  { treeId: 'tree_concept_not_null_constraint', ref: 'concept_not_null_constraint', name: 'NOT NULL 约束 / NOT NULL constraint' },
  { treeId: 'tree_concept_guid', ref: 'concept_guid', name: '全局唯一标识符 / GUID' },
]
export const OLD_EDGE_ID = (treeId) => `treebind:${ROOT_TREE_ID}:${treeId}`
export const NEW_EDGE_ID = (treeId) => `treebind:${NEW_TREE_ID}:${treeId}`

// ── 取数 ──────────────────────────────────────────────────────────────
const tree = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'))
const poolRaw = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'))
const pool = Array.isArray(poolRaw) ? poolRaw : Object.values(poolRaw)
const poolIds = new Set(pool.map((n) => n.id))
const edges = JSON.parse(fs.readFileSync(path.join(DATA, 'knowledge-edges.json'), 'utf8'))

const byTreeId = new Map()
const parentOf = new Map()
const walk = (n, p) => {
  byTreeId.set(n.id, n)
  if (p) parentOf.set(n.id, p)
  for (const c of n.children || []) walk(c, n)
}
walk(tree, null)

let failures = 0
const gates = []
function gate(id, desc, ok, reading = '') {
  gates.push({ id, desc, ok, reading })
  if (!ok) failures += 1
  console.log(`${ok ? '✅' : '❌'} ${id} ${desc}${reading ? ' — ' + reading : ''}`)
}

console.log(`\n== ${BATCH_ID} 规划预检（READ-ONLY）==`)

// G1 六项在位且连续
const db = byTreeId.get(ROOT_TREE_ID)
const slice = (db?.children || []).slice(EXPECTED_START_INDEX, EXPECTED_START_INDEX + MOVES.length)
gate(
  'G1',
  `6 个目标在 ${ROOT_TREE_ID}.children[${EXPECTED_START_INDEX}..${EXPECTED_START_INDEX + MOVES.length - 1}] 且连续、ref 相符`,
  slice.length === MOVES.length && slice.every((c, i) => c.id === MOVES[i].treeId && c.nodeRef === MOVES[i].ref),
  slice.map((c) => c.id).join(','),
)
gate('G1b', `6 项当前父节点均为 ${ROOT_TREE_ID}`, MOVES.every((m) => parentOf.get(m.treeId)?.id === ROOT_TREE_ID))
gate('G1c', `${ROOT_TREE_ID} 子数 = 30（搬后 24）`, (db?.children || []).length === 30, `实际 ${(db?.children || []).length}`)

// G2 每条恰有 1 条上游目录边，形态如声明
const edgeById = new Map(edges.map((e) => [e.id, e]))
const upstream = MOVES.map((m) => {
  const e = edgeById.get(OLD_EDGE_ID(m.treeId))
  return {
    treeId: m.treeId,
    edgeId: OLD_EDGE_ID(m.treeId),
    exists: Boolean(e),
    source: e?.source ?? null,
    target: e?.target ?? null,
    type: e?.type ?? null,
    label: e?.label ?? null,
    relationKind: e?.relationKind ?? null,
    dimensions: e?.dimensions ?? null,
    targetRefMatches: e?.target === m.ref,
  }
})
gate(
  'G2',
  '6 条上游目录边形态符合声明（source=n_u4va719e · target=条目 ref · belongs-to/contains/structure）',
  upstream.every(
    (u) => u.exists && u.source === ROOT_TREE_REF && u.targetRefMatches && u.type === 'belongs-to' && u.label === 'contains' && u.relationKind === 'structure',
  ),
  upstream.map((u) => `${u.treeId}:${u.exists ? 'ok' : 'MISSING'}`).join(' '),
)
gate(
  'G2b',
  '6 条上游目录边带 dimensions（重写时须逐字保留）',
  upstream.every((u) => Array.isArray(u.dimensions)),
  upstream.map((u) => JSON.stringify(u.dimensions)).join(' '),
)
const edgeIdx = MOVES.map((m) => edges.findIndex((e) => e.id === OLD_EDGE_ID(m.treeId)))
gate(
  'G2c',
  '6 条边在边数组中连续（保持原位改写 ⇒ diff 最小）',
  edgeIdx.every((v) => v >= 0) && edgeIdx.every((v, i) => i === 0 || v === edgeIdx[i - 1] + 1),
  edgeIdx.join(','),
)

// G3 池外引用（不得被本批误改）
const otherEdges = edges
  .filter((e) => MOVES.some((m) => e.source === m.ref || e.target === m.ref) && !MOVES.some((m) => e.id === OLD_EDGE_ID(m.treeId)))
  .map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type, relationKind: e.relationKind ?? null }))
gate('G3', '6 个 ref 的非目录边已清点（本批不动）', true, `${otherEdges.length} 条：${[...new Set(otherEdges.map((e) => e.type))].join(',')}`)

// G4 新 id / ref 无冲突
gate('G4', `新 treeId \`${NEW_TREE_ID}\` 树/池均无冲突`, !byTreeId.has(NEW_TREE_ID) && !poolIds.has(NEW_TREE_ID))
gate('G4b', `新 ref \`${NEW_TREE_REF}\` 未被任何边端点占用`, !edges.some((e) => e.source === NEW_TREE_REF || e.target === NEW_TREE_REF))
gate('G4c', '6 个新边 id 均无冲突', !edges.some((e) => MOVES.some((m) => e.id === NEW_EDGE_ID(m.treeId))))

// G5 池实体齐备且零改动
gate('G5', '6 个池实体在位（本批不需新建池实体）', MOVES.every((m) => poolIds.has(m.ref)))
gate('G5b', '「键与约束」名字在树内未出现', ![...byTreeId.values()].some((n) => String(n.name ?? '').includes('键与约束')))
// G6 父节点与同名冲突
const parent = byTreeId.get(PARENT_TREE_ID)
gate('G6', `父节点 ${PARENT_TREE_ID} 在位且 ref = ${PARENT_TREE_REF}`, parent?.nodeRef === PARENT_TREE_REF, `name=${parent?.name}`)
const norm = (s) => String(s).split(' /')[0].replace(/[\s（）()]/g, '').trim()
const collisions = (parent?.children || [])
  .filter((c) =>
    MOVES.some((m) => {
      const a = norm(c.name)
      const b = norm(m.name)
      return a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))
    }),
  )
  .map((c) => ({ id: c.id, name: c.name }))
gate('G6b', '父节点现有 15 孩中无同名冲突', collisions.length === 0, collisions.map((c) => c.name).join(',') || '无')
gate(
  'G6c',
  '容器 ref 约定：全库 container: 节点的 ref ≡ "container:" + treeId',
  [...byTreeId.values()].filter((n) => String(n.nodeRef || '').startsWith('container:')).every((n) => n.nodeRef === 'container:' + n.id),
)

// G7 冒号安全
gate('G7', '本批涉及 treeId 均不含冒号（split(":") 陷阱不适用）', MOVES.every((m) => !m.treeId.includes(':')) && !NEW_TREE_ID.includes(':'))

// G8 兄弟先例：章节壳没有上游目录边 ⇒ 新容器也不建
const chapterShells = [...byTreeId.values()].filter((n) => /^container:chapter_db_\d+$/.test(String(n.nodeRef || '')))
const shellsWithInbound = chapterShells.filter((n) => edges.some((e) => String(e.id).startsWith('treebind:') && e.target === n.nodeRef))
gate(
  'G8',
  '先例核对：18 个 chapter 壳均无上游目录边 ⇒ 新容器同样不建上游边（与裁决 Δ 边 4155→4155 一致）',
  shellsWithInbound.length === 0,
  `带上游边的章节壳 ${shellsWithInbound.length} 个`,
)

// G9 基线：备份 ↔ 工作树 ↔ HEAD 三方逐字节
const eqBytes = (a, b) => Buffer.compare(a, b) === 0
const baseline = {}
for (const f of ['tree-data.json', 'knowledge-edges.json']) {
  const cur = fs.readFileSync(path.join(DATA, f))
  const bak = fs.readFileSync(path.join(ROOT, SNAPSHOT, f))
  let head = null
  try {
    head = execSync(`git show HEAD:data/${f}`, { cwd: ROOT, encoding: 'buffer', maxBuffer: 1 << 28 })
  } catch {
    head = null
  }
  baseline[f] = {
    curBytes: cur.length,
    bakBytes: bak.length,
    headBytes: head?.length ?? null,
    curEqBak: eqBytes(cur, bak),
    curEqHead: head ? eqBytes(cur, head) : null,
  }
}
gate(
  'G9',
  '落盘前基线：tree-data / knowledge-edges 三方（HEAD ↔ 备份 ↔ 工作树）逐字节一致',
  Object.values(baseline).every((b) => b.curEqBak && b.curEqHead),
  Object.entries(baseline)
    .map(([f, b]) => `${f}:${b.curBytes}B curEqBak=${b.curEqBak} curEqHead=${b.curEqHead}`)
    .join(' · '),
)
gate('G9b', '快照目录存在', fs.existsSync(path.join(ROOT, SNAPSHOT)), SNAPSHOT)

// G10 Δ 声明核对
const treeCount = (() => {
  let n = 0
  const w = (x) => {
    n += 1
    for (const c of x.children || []) w(c)
  }
  w(tree)
  return n
})()
const expectedDelta = {
  'data/tree-data.json': {
    nodesBefore: 3203,
    nodesAfter: 3204,
    addedNodes: 1,
    removedNodes: 0,
    movedNodes: 6,
    addedIds: [NEW_TREE_ID],
  },
  'data/knowledge-edges.json': {
    edgesBefore: 4155,
    edgesAfter: 4155,
    addedEdges: 0,
    removedEdges: 0,
    modifiedEdgeIdsFrom: MOVES.map((m) => OLD_EDGE_ID(m.treeId)),
    modifiedEdgeIdsTo: MOVES.map((m) => NEW_EDGE_ID(m.treeId)),
  },
  'data/node-pool.json': { before: 3850, after: 3850, added: [], modified: [], removed: [] },
}
gate('G10', '树条目数实测 = 声明的 3203', treeCount === 3203, `实际 ${treeCount}`)
gate('G10b', '边数实测 = 声明的 4155', edges.length === 4155, `实际 ${edges.length}`)
gate('G10c', '池实体数实测 = 声明的 3850', pool.length === 3850, `实际 ${pool.length}`)

const plan = {
  generatedAt: new Date().toISOString(),
  mode: 'READ_ONLY',
  batchId: BATCH_ID,
  baseRef: BASE_REF,
  snapshot: SNAPSHOT,
  decisions: {
    a_primaryKey: '路 B：本批不动（内容融合批）',
    b_surrogateKeyWiki: '不动，登记独立债',
    nullNode: '归键与约束（本批不动，推迟）',
    container: `新建 treeId=${NEW_TREE_ID} · ref=${NEW_TREE_REF}`,
    backupRestore: '不搬（chapter_db_08 已有同名节点，融合批）',
  },
  container: {
    treeId: NEW_TREE_ID,
    ref: NEW_TREE_REF,
    name: NEW_TREE_NAME,
    parentTreeId: PARENT_TREE_ID,
    position: 'append（chapter_db_03.children 末尾）',
  },
  moves: MOVES,
  upstreamEdges: upstream,
  otherEdges,
  baseline,
  expectedDelta,
  gates,
  failures,
}
fs.writeFileSync(path.join(OUT, `${BATCH_ID}-plan.json`), JSON.stringify(plan, null, 2), 'utf8')
console.log(`\n计划已写出：outputs/tree-violation-scan/${BATCH_ID}-plan.json（失败 ${failures} 项）`)
process.exit(failures === 0 ? 0 : 1)