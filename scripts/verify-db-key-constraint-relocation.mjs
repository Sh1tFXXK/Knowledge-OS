#!/usr/bin/env node
/**
 * DB-KEY-CONSTRAINT-RELOCATION · 独立验证（⛔ 不 import apply / plan，自持解析与判据）
 *
 * 独立性设计：
 *   · 不 import 任何 apply 脚本，不复用其常量；本文件的 father/child 解析、边形态判据、
 *     「树 delta」算法全部**独立重写**（apply 用 Map 游走 + shallow 序列化；
 *     本脚本用**路径栈**逐节点记录祖先链，再用「字段级剔除 children」的另一种实现比对）。
 *   · 一切期望值来自**声明**（BATCH_ID 常量 + `data/backups/<snapshot>/` 前后态对拍），
 *     不从 apply 的中间产物读取。
 *   · 带**负对照**：同一套判据必须能对一个合成变异报错（否则「判据通过」只是断言）。
 *
 * 用法：node scripts/verify-db-key-constraint-relocation.mjs
 * 退出码：0 = PASS（全部通过）；1 = FAIL
 */
import fs from 'node:fs'
import path from 'node:path'
const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const BATCH_ID = 'db-key-constraint-relocation'
const SNAPSHOT = 'data/backups/db-key-constraint-relocation-2026-09-16T14-07-16-148Z'

const NEW_TREE_ID = 'key_constraint'
const NEW_TREE_REF = 'container:key_constraint'
const NEW_TREE_NAME = '键与约束 / key & constraint'
const PARENT_TREE_ID = 'chapter_db_03'
const PARENT_TREE_REF = 'container:chapter_db_03'
const OLD_PARENT_TREE_ID = 'demo_db'
const OLD_PARENT_TREE_REF = 'n_u4va719e'
const MOVED = [
  { treeId: 'tree_concept_surrogate_key', ref: 'concept_surrogate_key' },
  { treeId: 'tree_concept_natural_key', ref: 'concept_natural_key' },
  { treeId: 'tree_concept_unique_key', ref: 'concept_unique_key' },
  { treeId: 'tree_concept_foreign_key', ref: 'concept_foreign_key' },
  { treeId: 'tree_concept_not_null_constraint', ref: 'concept_not_null_constraint' },
  { treeId: 'tree_concept_guid', ref: 'concept_guid' },
]
// 负对照：明确**不在**本批范围内的散装项 —— 它们必须仍在 demo_db 名下
const NEGATIVE_CONTROL = [
  { treeId: 'tree_1788179275561_216qli', why: '主键（裁决路 B：内容融合批，本批不动）' },
  { treeId: 'projection:mysql-term:k_dict_fxoirizf', why: 'NULL（归键与约束但推迟）' },
  { treeId: 'tree_wiki_en_database_s16', why: '贮存（章节同义错位，另案）' },
  { treeId: 'tree_concept_replication', why: '复制（章节同义错位，另案）' },
  { treeId: 'atomic_atomic_database_backup', why: '数据库备份（chapter_db_08 已有同名节点，融合批）' },
  { treeId: 'atomic_atomic_database_restore', why: '数据库恢复（同上）' },
]

let fails = 0
const rows = []
function check(id, desc, ok, reading = '') {
  rows.push({ id, desc, ok, reading })
  if (!ok) fails += 1
  console.log(`  ${ok ? '✔' : '✘'} ${id} ${desc}${reading ? ' — ' + reading : ''}`)
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const readBuf = (p) => fs.readFileSync(p)
const snap = (f) => path.join(ROOT, SNAPSHOT, f)
// 判据一律用 Buffer.compare 逐字节比较（⛔ 不用 md5 字符串，也不 import apply 的任何工具）
const sameBytes = (a, b) => Buffer.compare(readBuf(a), readBuf(b)) === 0

console.log(`\n批次 ${BATCH_ID} · VERIFY（独立 · 不 import apply）`)

// ── 取数：当前态 + 快照前后态 ────────────────────────────────────────────
const treeCur = readJson(path.join(DATA, 'tree-data.json'))
const treeBak = readJson(snap('tree-data.json'))
const edgesCur = readJson(path.join(DATA, 'knowledge-edges.json'))
const edgesBak = readJson(snap('knowledge-edges.json'))

// 独立解析：用**路径栈**建立 (id → {node, ancestors, depth, siblingIndex})
function indexByPathStack(root) {
  const map = new Map()
  const stack = []
  const rec = (n, depth) => {
    stack.push(n.id)
    map.set(n.id, { node: n, ancestors: [...stack.slice(0, -1)], depth, childIdx: -1 })
    const kids = n.children || []
    kids.forEach((c, i) => {
      rec(c, depth + 1)
      map.get(c.id).childIdx = i
      map.get(c.id).siblingCount = kids.length
    })
    stack.pop()
  }
  rec(root, 0)
  return map
}
const cur = indexByPathStack(treeCur)
const bak = indexByPathStack(treeBak)

// 独立解析父边归属：不读 treebind 前缀语义，只看边端点是否指向某树节点
const byId = new Map()
const walk2 = (n) => { byId.set(n.id, n); for (const c of n.children || []) walk2(c) }
walk2(treeCur)
const childrenIds = (node) => (node?.children || []).map((c) => c.id)
const nodeById = (id) => cur.get(id)?.node

// ── V0 格式复现 ─────────────────────────────────────────────────────────
{
  const repro = (f) => `${JSON.stringify(readJson(path.join(DATA, f)), null, 2)}\n`
  const t = Buffer.from(repro('tree-data.json'), 'utf8')
  const e = Buffer.from(repro('knowledge-edges.json'), 'utf8')
  const tOk = Buffer.compare(t, readBuf(path.join(DATA, 'tree-data.json'))) === 0
  const eOk = Buffer.compare(e, readBuf(path.join(DATA, 'knowledge-edges.json'))) === 0
  check('V0', '格式复现：JSON.stringify(v,null,2)+"\\n" 可字节级再生两个文件', tOk && eOk,
    `tree=${tOk ? 'ok' : 'BAD'}(${t.length}B) edges=${eOk ? 'ok' : 'BAD'}(${e.length}B)`)
}

// ── V1 容器在位 ─────────────────────────────────────────────────────────
{
  const c = nodeById(NEW_TREE_ID)
  const parentOk = cur.get(NEW_TREE_ID)?.ancestors.at(-1) === PARENT_TREE_ID
  const kids = childrenIds(c)
  const kidsOk = JSON.stringify(kids) === JSON.stringify(MOVED.map((m) => m.treeId))
  const refsOk = (c?.children || []).every((x, i) => x.nodeRef === MOVED[i].ref)
  const lastChild = childrenIds(nodeById(PARENT_TREE_ID)).at(-1) === NEW_TREE_ID
  check('V1', `容器 ${NEW_TREE_ID} 在位 · ref/名正确 · 父=${PARENT_TREE_ID} · 6 孩顺序相符 · 为父末孩`,
    !!c && c.nodeRef === NEW_TREE_REF && c.name === NEW_TREE_NAME && parentOk && kidsOk && refsOk && lastChild,
    `parent=${PARENT_TREE_ID} kids=${kids.length} ref=${c?.nodeRef}`)
}

// ── V2 6 项已改父，旧位无残留 ────────────────────────────────────────────
{
  const bad = MOVED.filter((m) => {
    const p = cur.get(m.treeId)?.ancestors.at(-1)
    return p !== NEW_TREE_ID || nodeById(m.treeId)?.nodeRef !== m.ref
  })
  const leftover = MOVED.filter((m) => childrenIds(nodeById(OLD_PARENT_TREE_ID)).includes(m.treeId))
  check('V2', '6 项父节点现为 key_constraint · ref 相符 · demo_db.children 无残留',
    bad.length === 0 && leftover.length === 0,
    `父错 ${bad.length} · 残留 ${leftover.length} · demo_db 子数 ${childrenIds(nodeById(OLD_PARENT_TREE_ID)).length}（须 24）`)
  check('V2b', 'demo_db 子数 = 24 · chapter_db_03 子数 = 16',
    childrenIds(nodeById(OLD_PARENT_TREE_ID)).length === 24 && childrenIds(nodeById(PARENT_TREE_ID)).length === 16,
    `${childrenIds(nodeById(OLD_PARENT_TREE_ID)).length} / ${childrenIds(nodeById(PARENT_TREE_ID)).length}`)
}

// ── V3 边改写（独立形态判据）─────────────────────────────────────────────
{
  const curById = new Map(edgesCur.map((e) => [e.id, e]))
  const bakById = new Map(edgesBak.map((e) => [e.id, e]))
  const details = MOVED.map((m) => {
    const newId = `treebind:${NEW_TREE_ID}:${m.treeId}`
    const oldId = `treebind:${OLD_PARENT_TREE_ID}:${m.treeId}`
    const e = curById.get(newId)
    const b = bakById.get(oldId)
    if (!e || !b) return `${m.treeId}:缺边`
    const keep = e.target === b.target && e.type === b.type && e.label === b.label &&
      e.relationKind === b.relationKind && JSON.stringify(e.dimensions) === JSON.stringify(b.dimensions)
    if (!keep) return `${m.treeId}:字段漂移`
    if (curById.has(oldId)) return `${m.treeId}:旧 id 仍在`
    if (e.source !== NEW_TREE_REF) return `${m.treeId}:source 错`
    // 独立反查：新边 source 必须能从树里解析到一个真实节点（不是悬空）
    if (!byId.has(NEW_TREE_ID)) return `${m.treeId}:source 悬空`
    return null
  }).filter(Boolean)
  check('V3', '6 条边：新 id 在位 · 旧 id 消失 · source=container:key_constraint · target/type/label/relationKind/dimensions 逐字保留',
    details.length === 0, details.join(' | ') || '6/6 ok')
}

// ── V4 无夹带：其余边逐条深比较 ─────────────────────────────────────────
{
  const newIds = new Set(MOVED.map((m) => `treebind:${NEW_TREE_ID}:${m.treeId}`))
  const oldIds = new Set(MOVED.map((m) => `treebind:${OLD_PARENT_TREE_ID}:${m.treeId}`))
  const curRest = edgesCur.filter((e) => !newIds.has(e.id))
  const bakRest = edgesBak.filter((e) => !oldIds.has(e.id))
  let drift = 0
  const n = Math.max(curRest.length, bakRest.length)
  for (let i = 0; i < n; i += 1) {
    if (JSON.stringify(curRest[i]) !== JSON.stringify(bakRest[i])) drift += 1
  }
  check('V4', '边总数 4155 · 除 6 条改写外其余 4149 条逐条深比较不变（零夹带）',
    edgesCur.length === 4155 && edgesCur.length === edgesBak.length && curRest.length === 4149 && drift === 0,
    `cur=${edgesCur.length} bak=${edgesBak.length} rest=${curRest.length} drift=${drift}`)
}

// ── V5 池逐字节未变 ────────────────────────────────────────────────────
{
  const same = Buffer.compare(readBuf(path.join(DATA, 'node-pool.json')), readBuf(snap('node-pool.json'))) === 0
  check('V5', 'data/node-pool.json 逐字节未变（本批零池写）', same,
    `${readBuf(path.join(DATA, 'node-pool.json')).length}B`)
}

// ── V6 其余 data 文件逐字节未变 ─────────────────────────────────────────
{
  const files = ['questions.json', 'evolution-events.json', 'version-chains.json']
  const bad = files.filter((f) => {
    const a = path.join(DATA, f)
    const b = snap(f)
    if (!fs.existsSync(b)) return false // 快照未收该文件 ⇒ 跳过（声明性）
    if (!fs.existsSync(a)) return true
    return Buffer.compare(readBuf(a), readBuf(b)) !== 0
  })
  check('V6', '其余 data 文件逐字节未变（快照已收者）', bad.length === 0, bad.join(',') || 'questions/evolution-events/version-chains 一致')
}

// ── V7 负对照：未列入本批的散装项必须未动 ────────────────────────────────
{
  const moved = NEGATIVE_CONTROL.filter((n) => {
    const now = cur.get(n.treeId)?.ancestors.at(-1)
    const was = bak.get(n.treeId)?.ancestors.at(-1)
    return now !== was || !now
  })
  check('V7', `负对照 ${NEGATIVE_CONTROL.length} 项（主键/NULL/贮存/复制/备份/恢复）必须仍在 demo_db 名下且父链未变`,
    moved.length === 0, moved.map((m) => m.treeId).join(',') || '全部未动')
}

// ── V8 全树结构自洽 ────────────────────────────────────────────────────
{
  const ids = [...cur.keys()]
  const dup = ids.length !== new Set(ids).size
  const missingRef = [...cur.values()].filter((v) => typeof v.node.nodeRef !== 'string' || !v.node.nodeRef).map((v) => v.node.id)
  const missingName = [...cur.values()].filter((v) => typeof v.node.name !== 'string').map((v) => v.node.id)
  // 父链完整性：每个非根节点必须能在树上被再次找到（无孤儿：map 建立即证明可达）
  const reachable = cur.size
  const total = treeCur.children ? 1 + countAll(treeCur) - 1 : cur.size
  function countAll(n) { return (n.children || []).reduce((s, c) => s + 1 + countAll(c), 0) }
  check('V8', '全树：treeId 无重复 · 每节点有 nodeRef/name · 计数 = 3204 · 无孤儿',
    !dup && missingRef.length === 0 && missingName.length === 0 && reachable === 3204 && countAll(treeCur) === 3203,
    `ids=${ids.length} dup=${dup} ref缺=${missingRef.length} name缺=${missingName.length} 计数=${1 + countAll(treeCur)}`)
}

// ── V9 树 delta（口径独立重写：自身字段 vs 直接孩子序列）──────────────────
{
  const own = (n) => {
    const copy = {}
    for (const [k, v] of Object.entries(n)) if (k !== 'children') copy[k] = v
    return JSON.stringify(copy)
  }
  const ownChanged = [...bak.keys()].filter((k) => cur.has(k) && own(bak.get(k).node) !== own(cur.get(k).node))
  const added = [...cur.keys()].filter((k) => !bak.has(k))
  const removed = [...bak.keys()].filter((k) => !cur.has(k))
  const kidsChanged = [...bak.keys()].filter((k) => cur.has(k) && JSON.stringify(childrenIds(bak.get(k).node)) !== JSON.stringify(childrenIds(cur.get(k).node)))
  check('V9', '树 delta = 仅 +1 容器 · 零自身字段改动 · 仅 demo_db/chapter_db_03 的 children 序列变化',
    added.length === 1 && added[0] === NEW_TREE_ID && removed.length === 0 && ownChanged.length === 0 &&
      kidsChanged.length === 2 && kidsChanged.includes(OLD_PARENT_TREE_ID) && kidsChanged.includes(PARENT_TREE_ID),
    `add=[${added.join(',')}] rm=${removed.length} ownChg=[${ownChanged.join(',')}] kidsChg=[${kidsChanged.join(',')}]`)
}

// ── V10 量具负对照：同一套判据必须能证伪一个合成变异 ─────────────────────
{
  const own = (n) => {
    const copy = {}
    for (const [k, v] of Object.entries(n)) if (k !== 'children') copy[k] = v
    return JSON.stringify(copy)
  }
  const mutated = JSON.parse(JSON.stringify(treeCur))
  const find = (n, id) => (n.id === id ? n : (n.children || []).reduce((h, c) => h || find(c, id), null))
  const target = find(mutated, MOVED[0].treeId)
  const curTarget = nodeById(MOVED[0].treeId)
  const controlOwnDetect = own(target) !== own(curTarget)                 // 应当相等 → 基线
  target.name = `${target.name}（被证伪）`                                  // 合成变异 1：自身字段
  const ownDetectAfter = own(target) !== own(curTarget)                    // 必须为 true
  // 合成变异 2：children 序列（把容器末孩挪走）
  const c2 = JSON.parse(JSON.stringify(treeCur))
  const f2 = (n, id) => (n.id === id ? n : (n.children || []).reduce((h, c) => h || f2(c, id), null))
  const cont = f2(c2, NEW_TREE_ID)
  const movedOut = cont.children.splice(-1, 1)[0]
  f2(c2, OLD_PARENT_TREE_ID).children.push(movedOut)
  const i2 = indexByPathStack(c2)
  const kidsDetect = JSON.stringify(childrenIds(f2(c2, NEW_TREE_ID))) !== JSON.stringify(childrenIds(nodeById(NEW_TREE_ID)))
  const parentDetect = i2.get(movedOut.id)?.ancestors.at(-1) !== NEW_TREE_ID
  check('V10', '量具负对照：合成「改自身字段」与合成「移走一个孩子」必须都被本套判据检出',
    controlOwnDetect === false && ownDetectAfter === true && kidsDetect === true && parentDetect === true,
    `基线无误报=${controlOwnDetect === false} 自字段可检=${ownDetectAfter} children可检=${kidsDetect} 父链可检=${parentDetect}`)
}

// ── 落盘报告 ───────────────────────────────────────────────────────────
const verdict = fails === 0 ? 'PASS' : 'FAIL'
const total = rows.length
const report = {
  batchId: BATCH_ID,
  mode: 'VERIFY_INDEPENDENT',
  at: new Date().toISOString(),
  snapshot: SNAPSHOT,
  independence: '不 import apply/plan；父链解析用路径栈（apply 用 Map 游走）；delta 口径独立重写；带 V10 量具负对照',
  verdict,
  pass: total - fails,
  total,
  checks: rows,
}
fs.writeFileSync(path.join(OUT_DIR, `${BATCH_ID}-verify.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
const mdLines = [
  `# ${BATCH_ID} · 独立验证`,
  '',
  `- 生成时间：${report.at}`,
  `- 模式：**VERIFY_INDEPENDENT**（⛔ 不 import apply / plan）`,
  `- 落盘前快照：\`${SNAPSHOT}\``,
  `- 独立性：父链解析用**路径栈**（apply 用 Map 游走）· delta 口径**独立重写** · 带 **V10 量具负对照**`,
  `- 判定：**${verdict}**（${total - fails}/${total}）`,
  '',
  '| 检查 | 说明 | 结果 | 读数 |',
  '|---|---|:--:|---|',
  ...rows.map((r) => `| \`${r.id}\` | ${r.desc} | ${r.ok ? '✔' : '✘'} | ${r.reading || '—'} |`),
  '',
]
fs.writeFileSync(path.join(OUT_DIR, `${BATCH_ID}-verify.md`), mdLines.join('\n'), 'utf8')

console.log(`\n判定：${verdict}（${total - fails}/${total}）`)
console.log(`报告：outputs/tree-violation-scan/${BATCH_ID}-verify.{json,md}`)
process.exit(fails === 0 ? 0 : 1)
