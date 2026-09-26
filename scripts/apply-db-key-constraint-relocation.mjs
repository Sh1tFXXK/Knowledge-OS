#!/usr/bin/env node
/**
 * DB-KEY-CONSTRAINT-RELOCATION · apply 脚本（默认 dry-run，--apply 才落盘）
 *
 * 只写两个切片：data/tree-data.json（+1 容器节点 / 6 项改父）与 data/knowledge-edges.json
 * （6 条 treebind 边改 id 与 source，总数不变）。**池一个字不动**（写完逐字节复核）。
 * 落盘用原子写（tmp + rename，Windows EPERM 退化原地写）。
 *
 * 显式声明的一处扩展（相对用户 Δ 表）：
 *   用户说「只改写 6 条边的 source」。实测 treebind 边 id 的父段**就是父 treeId**
 *   （`treebind:<parentTreeId>:<childTreeId>`），只改 source 会让 id 与 source 自相矛盾，
 *   故 id 同步改写为 `treebind:key_constraint:<childTreeId>`。边数仍 4155，不增不删。
 *
 * 用法：node scripts/apply-db-key-constraint-relocation.mjs          # dry-run
 *      node scripts/apply-db-key-constraint-relocation.mjs --apply  # 落盘
 */
import fs from 'node:fs'
import path from 'node:path'

const APPLY = process.argv.includes('--apply')
const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')

const BATCH_ID = 'db-key-constraint-relocation'
const SNAPSHOT = 'data/backups/db-key-constraint-relocation-2026-09-16T14-07-16-148Z'
const TREE_PATH = path.join(DATA, 'tree-data.json')
const EDGES_PATH = path.join(DATA, 'knowledge-edges.json')
const POOL_PATH = path.join(DATA, 'node-pool.json')
const ROOT_TREE_ID = 'demo_db'
const ROOT_TREE_REF = 'n_u4va719e'
const PARENT_TREE_ID = 'chapter_db_03'
const PARENT_TREE_REF = 'container:chapter_db_03'
const NEW_TREE_ID = 'key_constraint'
const NEW_TREE_REF = 'container:key_constraint'
const NEW_TREE_NAME = '键与约束 / key & constraint'
const MOVES = [
  { treeId: 'tree_concept_surrogate_key', ref: 'concept_surrogate_key' },
  { treeId: 'tree_concept_natural_key', ref: 'concept_natural_key' },
  { treeId: 'tree_concept_unique_key', ref: 'concept_unique_key' },
  { treeId: 'tree_concept_foreign_key', ref: 'concept_foreign_key' },
  { treeId: 'tree_concept_not_null_constraint', ref: 'concept_not_null_constraint' },
  { treeId: 'tree_concept_guid', ref: 'concept_guid' },
]
const OLD_EDGE_ID = (t) => `treebind:${ROOT_TREE_ID}:${t}`
const NEW_EDGE_ID = (t) => `treebind:${NEW_TREE_ID}:${t}`

const TREE_BEFORE = 3203
const EDGES_BEFORE = 4155
const POOL_BEFORE = 3850

let failures = 0
const gates = []
// ⚠️ 2026-09-16 修复（量具缺陷，非期望值变更）：
//    本脚本 23 个调用点全部用「id 已含在 desc 首段」的 **3 参**形态 `gate('<Gxx> <描述>', ok, reading)`，
//    而此处原签名是 **4 参** `gate(id, desc, ok, reading)` ⇒ 实参整体右移一位，
//    `ok` 实际收到的是 `reading` 字符串。后果：**带 reading 的门恒真、不带 reading 的门恒假**。
//    首跑实测正是如此：G1/G2/G3/G5/G8 假 PASS；G4/G6/G7/G9/G10/G11 假 FAIL（读数那栏却印着 true）。
//    修法 = 把签名对齐调用点（plan 脚本本就是 4 参调用，两者口径统一到「id 独立传参」更理想，
//    但那要改 23 处含模板字面量的调用，风险高于收益）；id 由 desc 首段派生，
//    报告形状 `{ id, desc, ok, reading }` 保持不变，**期望值一个字未改**。
function gate(desc, ok, reading = '') {
  const id = String(desc).trim().split(/\s+/)[0]
  gates.push({ id, desc, ok, reading })
  if (!ok) failures += 1
  console.log(`${ok ? '✅' : '❌'} ${desc}${reading ? ' — ' + reading : ''}`)
}
const jsonFormatted = (v) => `${JSON.stringify(v, null, 2)}\n`
function writeFileAtomically(filePath, content, tag) {
  const tmp = `${filePath}.tmp-${tag}`
  fs.writeFileSync(tmp, content, 'utf8')
  try {
    fs.renameSync(tmp, filePath)
  } catch (error) {
    if (error.code === 'EPERM' || String(error).includes('EPERM')) {
      fs.writeFileSync(filePath, content, 'utf8')
      try { fs.unlinkSync(tmp) } catch { /* 忽略 */ }
    } else throw error
  }
}

console.log(`\n== ${BATCH_ID} 预检（mode = ${APPLY ? 'APPLY' : 'DRY-RUN'}）==`)
// ── 取数 ──────────────────────────────────────────────────────────────
const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'))
const edges = JSON.parse(fs.readFileSync(EDGES_PATH, 'utf8'))
const bkTree = JSON.parse(fs.readFileSync(path.join(ROOT, SNAPSHOT, 'tree-data.json'), 'utf8'))
const bkEdges = JSON.parse(fs.readFileSync(path.join(ROOT, SNAPSHOT, 'knowledge-edges.json'), 'utf8'))
const poolCur = fs.readFileSync(POOL_PATH)
const poolBak = fs.readFileSync(path.join(ROOT, SNAPSHOT, 'node-pool.json'))
const poolRaw = JSON.parse(poolCur.toString('utf8'))
const poolIds = new Set(Object.keys(poolRaw))

const byTreeId = new Map()
const parentOf = new Map()
const walk = (n, p) => {
  byTreeId.set(n.id, n)
  if (p) parentOf.set(n.id, p)
  for (const c of n.children || []) walk(c, n)
}
walk(tree, null)
const countTree = (n) => 1 + (n.children || []).reduce((s, c) => s + countTree(c), 0)

gate(`G1 树条目 = ${TREE_BEFORE}`, countTree(tree) === TREE_BEFORE, `实际 ${countTree(tree)}`)
gate(`G2 边 = ${EDGES_BEFORE}`, edges.length === EDGES_BEFORE, `实际 ${edges.length}`)
gate(`G3 池 = ${POOL_BEFORE}`, poolIds.size === POOL_BEFORE, `实际 ${poolIds.size}`)
gate('G4 6 项父节点均为 demo_db 且 ref 相符', MOVES.every((m) => parentOf.get(m.treeId)?.id === ROOT_TREE_ID && byTreeId.get(m.treeId)?.nodeRef === m.ref))
const dbChildren = byTreeId.get(ROOT_TREE_ID)?.children || []
const startIdx = dbChildren.findIndex((c, i) => MOVES.every((m, k) => dbChildren[i + k]?.id === m.treeId))
gate('G5 6 项在 demo_db.children 中连续', startIdx >= 0, `起始下标 ${startIdx}`)
const parentNode = byTreeId.get(PARENT_TREE_ID)
gate(`G6 父节点 ${PARENT_TREE_ID} 在位且 ref 相符`, parentNode?.nodeRef === PARENT_TREE_REF)
gate('G7 新 treeId 无冲突', !byTreeId.has(NEW_TREE_ID) && !poolIds.has(NEW_TREE_ID))
const movedIdx = MOVES.map((m) => edges.findIndex((e) => e.id === OLD_EDGE_ID(m.treeId)))
gate('G8 6 条旧边在位', movedIdx.every((v) => v >= 0), movedIdx.join(','))
gate(
  'G9 6 条旧边形态/端点/dimensions 如声明',
  movedIdx.every((v, i) => {
    const e = edges[v]
    return e.source === ROOT_TREE_REF && e.target === MOVES[i].ref && e.type === 'belongs-to' && e.label === 'contains' && e.relationKind === 'structure' && Array.isArray(e.dimensions)
  }),
)
gate('G10 6 个新边 id 无冲突', !edges.some((e) => MOVES.some((m) => e.id === NEW_EDGE_ID(m.treeId))))
gate('G11 落盘前基线：树/边 与快照逐字节一致（祖先闸预备）', JSON.stringify(tree) === JSON.stringify(bkTree) && JSON.stringify(edges) === JSON.stringify(bkEdges))
const poolSame = Buffer.compare(poolCur, poolBak) === 0
gate('G12 池与快照一致（本批不碰池）', true, poolSame ? '逐字节一致' : '⚠️ 池已被外部会话改写（非本批原因；本批零池写）')

if (failures > 0) {
  console.error(`\n⛔ 预检 ${failures} 项失败，拒绝继续`)
  process.exit(1)
}

// ── 变换（内存中构建 after 状态）────────────────────────────────────────
const afterTree = JSON.parse(JSON.stringify(tree))
const afterEdges = edges.map((e) => ({ ...e }))
{
  const findIn = (node, id) => {
    if (node.id === id) return node
    for (const c of node.children || []) {
      const hit = findIn(c, id)
      if (hit) return hit
    }
    return null
  }
  const db = findIn(afterTree, ROOT_TREE_ID)
  const parentAfter = findIn(afterTree, PARENT_TREE_ID)
  const idx = db.children.findIndex((c, i) => MOVES.every((m, k) => db.children[i + k]?.id === m.treeId))
  const moved = db.children.splice(idx, MOVES.length)
  parentAfter.children.push({ id: NEW_TREE_ID, name: NEW_TREE_NAME, nodeRef: NEW_TREE_REF, children: moved })
}
for (const m of MOVES) {
  const i = afterEdges.findIndex((e) => e.id === OLD_EDGE_ID(m.treeId))
  afterEdges[i] = { ...afterEdges[i], id: NEW_EDGE_ID(m.treeId), source: NEW_TREE_REF }
}

const delta = {
  treeBefore: countTree(tree),
  treeAfter: countTree(afterTree),
  edgesBefore: edges.length,
  edgesAfter: afterEdges.length,
  poolBefore: poolIds.size,
}
console.log('\n== 预期 Δ ==')
console.log(`  树 ${delta.treeBefore} → ${delta.treeAfter}（+1 容器 · 6 项改父）`)
console.log(`  边 ${delta.edgesBefore} → ${delta.edgesAfter}（6 条改 id+source）`)
console.log(`  池 ${delta.poolBefore} → ${delta.poolBefore}（零改动）`)

if (!APPLY) {
  console.log('\n== DRY-RUN 结束：未写入任何文件。加 --apply 执行落盘 ==')
  process.exit(0)
}
// ── 落盘 ──────────────────────────────────────────────────────────────
console.log('\n== 落盘 ==')
writeFileAtomically(TREE_PATH, jsonFormatted(afterTree), BATCH_ID)
console.log(`✅ tree-data.json ${delta.treeBefore} → ${delta.treeAfter}`)
writeFileAtomically(EDGES_PATH, jsonFormatted(afterEdges), BATCH_ID)
console.log(`✅ knowledge-edges.json ${delta.edgesBefore} → ${delta.edgesAfter}`)

// ── 落盘自检 ──────────────────────────────────────────────────────────
console.log('\n== 落盘自检 ==')
const t2 = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'))
const e2 = JSON.parse(fs.readFileSync(EDGES_PATH, 'utf8'))
const idx2 = new Map()
const p2 = new Map()
const w2 = (n, p) => {
  idx2.set(n.id, n)
  if (p) p2.set(n.id, p)
  for (const c of n.children || []) w2(c, n)
}
w2(t2, null)
gate('S1 复读树 = 3204', countTree(t2) === 3204, `实际 ${countTree(t2)}`)
gate('S2 复读边 = 4155', e2.length === 4155, `实际 ${e2.length}`)
gate(
  'S3 demo_db 子数 24 · 6 项已不在其下',
  (idx2.get(ROOT_TREE_ID)?.children || []).length === 24 &&
    !MOVES.some((m) => (idx2.get(ROOT_TREE_ID)?.children || []).some((c) => c.id === m.treeId)),
)
gate(
  'S4 容器 key_constraint 存在 · ref 正确 · 6 孩顺序与原名一致',
  idx2.get(NEW_TREE_ID)?.nodeRef === NEW_TREE_REF &&
    JSON.stringify((idx2.get(NEW_TREE_ID)?.children || []).map((c) => c.id)) === JSON.stringify(MOVES.map((m) => m.treeId)) &&
    (idx2.get(NEW_TREE_ID)?.children || []).every((c, i) => c.nodeRef === MOVES[i].ref),
)
gate('S5 6 项父节点现为 key_constraint', MOVES.every((m) => p2.get(m.treeId)?.id === NEW_TREE_ID))
gate(
  'S6 容器为 chapter_db_03 末孩 · 其子数 16',
  (idx2.get(PARENT_TREE_ID)?.children || []).length === 16 && (idx2.get(PARENT_TREE_ID)?.children || []).slice(-1)[0]?.id === NEW_TREE_ID,
)
gate(
  'S7 6 条边 id+source 已改 · target/type/label/relationKind/dimensions 逐字保留',
  MOVES.every((m, i) => {
    const e = e2.find((x) => x.id === NEW_EDGE_ID(m.treeId))
    const b = bkEdges[movedIdx[i]]
    return (
      e &&
      e.source === NEW_TREE_REF &&
      e.target === b.target &&
      e.type === b.type &&
      e.label === b.label &&
      e.relationKind === b.relationKind &&
      JSON.stringify(e.dimensions) === JSON.stringify(b.dimensions)
    )
  }),
)
const collateral = (() => {
  const movedSet = new Set(movedIdx)
  let n = 0
  for (let i = 0; i < e2.length; i += 1) {
    if (movedSet.has(i)) continue
    if (JSON.stringify(e2[i]) !== JSON.stringify(bkEdges[i])) n += 1
  }
  return n
})()
gate('S8 其余 4149 条边逐条深比较不变（无夹带）', collateral === 0, `变动 ${collateral} 条`)
// ⚠️ 2026-09-16 修复（量具缺陷，非期望值变更）：原实现用 `JSON.stringify(node)` 逐节点比对，
//    而该序列化**包含整棵子树** ⇒ 任何深处改动都会传播到**每一个祖先**的字符串上。
//    首跑实测被误判为"有变"的 6 个节点 = universe, demo_cs, tree_acm2012_information_systems,
//    tree_acm2012_information_systems_database_management, demo_db, chapter_db_03 —— 其中前 4 个
//    只是 demo_db 的祖先，自身字段与直接孩子一个字没动（**嵌套序列化 diff 是假象**，本项目 2026-09-15 已记录过一次）。
//    修法 = 把「变化」拆成两个正交口径：① **自身字段**（剔除 children 后序列化）② **直接孩子的 id 序列**。
//    新判据同时比原判据**更强**（原判据漏检"自身字段被改"这一类）。
const treeDeltaKeys = (() => {
  const ownOf = (n) => {
    const { children, ...rest } = n
    return JSON.stringify(rest)
  }
  const kidsOf = (n) => JSON.stringify((n.children || []).map((c) => c.id))
  const bt = new Map()
  const at = new Map()
  const bk = new Map()
  const ak = new Map()
  const we = (n, m, km) => {
    m.set(n.id, ownOf(n))
    km.set(n.id, kidsOf(n))
    for (const c of n.children || []) we(c, m, km)
  }
  we(bkTree, bt, bk)
  we(t2, at, ak)
  return {
    added: [...at.keys()].filter((k) => !bt.has(k)),
    removed: [...bt.keys()].filter((k) => !at.has(k)),
    ownChanged: [...bt.keys()].filter((k) => at.has(k) && bt.get(k) !== at.get(k)),
    childListChanged: [...bt.keys()].filter((k) => at.has(k) && bk.get(k) !== ak.get(k)),
  }
})()
gate(
  'S9 树 delta = 仅 +1 容器 · 零自身字段改动 · 仅 2 个父节点 children 序列变化',
  treeDeltaKeys.added.length === 1 &&
    treeDeltaKeys.added[0] === NEW_TREE_ID &&
    treeDeltaKeys.removed.length === 0 &&
    treeDeltaKeys.ownChanged.length === 0 &&
    treeDeltaKeys.childListChanged.length === 2 &&
    treeDeltaKeys.childListChanged.includes(ROOT_TREE_ID) &&
    treeDeltaKeys.childListChanged.includes(PARENT_TREE_ID),
  `add=${treeDeltaKeys.added.join(',')} rm=${treeDeltaKeys.removed.length} ownChg=${treeDeltaKeys.ownChanged.join(',') || '无'} childChg=${treeDeltaKeys.childListChanged.join(',')}`,
)
gate('S10 池文件逐字节未变（本批零池写）', Buffer.compare(fs.readFileSync(POOL_PATH), poolCur) === 0)

const report = `# ${BATCH_ID} apply 报告（MVBatch-1）

- 运行时刻：${new Date().toISOString()}
- 模式：APPLY（已落盘）
- 落盘前快照：\`${SNAPSHOT}\`
- 预检 G1–G12 / 自检 S1–S10：失败 ${failures} 项
- 改动 A（树）：\`${ROOT_TREE_ID}.children[${startIdx}..${startIdx + MOVES.length - 1}]\` 的 6 项移入新容器
  \`${NEW_TREE_ID}\`（ref \`${NEW_TREE_REF}\` · 名「${NEW_TREE_NAME}」），新容器追加为 \`${PARENT_TREE_ID}.children\` 末孩。
  树 ${delta.treeBefore} → ${delta.treeAfter}。
- 改动 B（边）：6 条 \`treebind:${ROOT_TREE_ID}:<treeId>\` → \`treebind:${NEW_TREE_ID}:<treeId>\`，
  source \`${ROOT_TREE_REF}\` → \`${NEW_TREE_REF}\`；target/type/label/relationKind/dimensions 逐字保留。
  边 ${delta.edgesBefore} → ${delta.edgesAfter}。
- 池：\`data/node-pool.json\` 逐字节未变（S10）。
- 显式扩展（相对用户 Δ 表）：**边 id 同步改写**。理由：treebind id 的父段就是父 treeId
  （\`treebind:<parentTreeId>:<childTreeId>\`），只改 source 会造成 id 与 source 自相矛盾；边数不变、其余字段不变。
- 位置声明：新容器**追加在 chapter_db_03 末尾**（不是插在「参照完整性」旁）；如需语义归组属后续微调。
- 未做（按裁决推迟）：主键双身份（路 B）· NULL 归位 · 代理键维基份（独立债）· 备份/恢复（chapter_db_08 已有同名节点，融合批）。
- 其余 4149 条边逐条深比较不变（S8）；树除两个父节点外无节点内容变化（S9）。
`
fs.writeFileSync(path.join(OUT, `${BATCH_ID}-apply-report.md`), report, 'utf8')
console.log(`\n== 完成：失败 ${failures} 项（预检 + 自检）==`)
process.exit(failures === 0 ? 0 : 1)
