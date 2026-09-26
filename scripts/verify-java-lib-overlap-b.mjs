#!/usr/bin/env node
/**
 * JAVA-LIB-OVERLAP-B · 独立验证
 *
 * 纪律：**不 import apply 脚本**。所有结论从「批前快照 ↔ 当前真源」反推得出。
 *
 * 本批语义（用户 2026-09-16 确认的**修正口径**）：
 *   卸树留池 —— 从 `类/java.lang/Object` 摘掉 4 个**叶子**挂载
 *   （String / StringBuilder / StringBuffer / Scanner），
 *   它们在 `常用类库` 下的挂载保留；**池与边表零改动**。
 *
 *   ⚠️ 与用户原蓝图的唯一差异：蓝图预期「边 4161→4157（−4 treebind 边）」，
 *      但只读预检实证这 4 处挂载在边表中出现 **0 次**（无边可删）。
 *      修正口径 Δ边 = 0。用户已裁决「按事实修正 Δ，意图不变」。
 *
 * 用法：
 *   node scripts/verify-java-lib-overlap-b.mjs [--snapshot <dir>]
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR) : path.join(ROOT, 'data')

const args = process.argv.slice(2)
const snapIdx = args.indexOf('--snapshot')
const DEFAULT_SNAP = 'data/backups/java-lib-overlap-b-2026-09-15T17-12-12-656Z'
const SNAPSHOT = snapIdx >= 0 ? args[snapIdx + 1] : DEFAULT_SNAP
const BACKUP = path.isAbsolute(SNAPSHOT) ? SNAPSHOT : path.join(ROOT, SNAPSHOT)

// ── 本批事实常量（来自用户裁决 + 只读预检实证，不来自 apply） ──
const PARENT_TREE_ID = 'tree_java_source_020f0cac60da5755_s_type_a6b9e05051861242'
const TARGETS = [
  { treeId: 'tree_1785340521267_j7je9h', nodeRef: 'k_java_lang_string', keptTreeId: 'tree_java_lang_string', name: 'String' },
  { treeId: 'tree_1785378444842_wglz53', nodeRef: 'k_java_lang_stringbuilder', keptTreeId: 'tree_java_lang_stringbuilder', name: 'StringBuilder' },
  { treeId: 'tree_1785378491125_qwcncm', nodeRef: 'k_java_lang_stringbuffer', keptTreeId: 'tree_java_lang_stringbuffer', name: 'StringBuffer' },
  { treeId: 'tree_1785379879357_2xsrxd', nodeRef: 'k_java_util_scanner', keptTreeId: 'tree_java_util_scanner', name: 'Scanner' },
]
const TARGET_TREE_IDS = TARGETS.map((t) => t.treeId)
const KEPT_PATH_MARKER = '常用类库'
const EXPECTED_CHILDREN_AFTER = ['Number', 'Math', '类的构造函数', '方法', 'Optional']
const EXPECTED = { treeBefore: 3213, treeAfter: 3209, pool: 3856, edges: 4161 }
/** 保留侧边（9 条：4 条 常用类库 treebind + 5 条语义边）—— 本批必须一条不少 */
const HARD_KEPT_EDGE_IDS = [
  'edge_java_string_vs_stringbuilder',
  'edge_java_string_vs_stringbuffer',
  'edge_java_stringbuilder_vs_stringbuffer',
  'treebind:tree_java_common_libraries:tree_java_lang_string',
  'treebind:tree_java_common_libraries:tree_java_lang_stringbuilder',
  'treebind:tree_java_common_libraries:tree_java_lang_stringbuffer',
  'treebind:tree_java_common_libraries:tree_java_util_scanner',
  'edge_java_scanner_reads_string',
  'edge_io_nio_reads_string',
]

const exists = (p) => { try { fs.accessSync(p); return true } catch { return false } }
const readJson = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'))
const readText = (d, f) => fs.readFileSync(path.join(d, f), 'utf8')
const readBuf = (d, f) => fs.readFileSync(path.join(d, f))

const rows = []
const V = (id, desc, pass, detail) => rows.push({ id, desc, pass: !!pass, detail })

// ── 快照 ──
const snapOk = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json'].every((f) => exists(path.join(BACKUP, f)))
V('V1', '批前快照可读（三文件齐备）', snapOk, BACKUP.replace(ROOT + path.sep, ''))
if (!snapOk) { report(); process.exit(2) }

const bTree = readJson(BACKUP, 'tree-data.json')
const bPool = readJson(BACKUP, 'node-pool.json')
const bEdgesRaw = readText(BACKUP, 'knowledge-edges.json')
const bEdges = JSON.parse(bEdgesRaw)
const bArr = Array.isArray(bEdges) ? bEdges : bEdges.edges

const nTree = readJson(DATA_DIR, 'tree-data.json')
const nPool = readJson(DATA_DIR, 'node-pool.json')
const nEdgesRaw = readText(DATA_DIR, 'knowledge-edges.json')
const nEdges = JSON.parse(nEdgesRaw)
const nArr = Array.isArray(nEdges) ? nEdges : nEdges.edges

// ── helpers ──
const walkAll = (root) => {
  const out = []
  const w = (ns, parent, p) => { for (const n of ns) { const pp = p + '/' + (n.name ?? ''); out.push({ node: n, parent, path: pp }); w(n.children ?? [], n, pp) } }
  w(root.children ?? [], root, '/' + (root.name ?? ''))
  return out
}
const countTree = (root) => { const w = (ns) => ns.reduce((s, n) => s + 1 + w(n.children ?? []), 0); return 1 + w(root.children ?? []) }
/** 节点自身字段 + 子 id 顺序（不递归）——用于「逐节点零漂移」比对 */
const shapeOf = (n) => JSON.stringify({ ...n, children: (n.children ?? []).map((c) => c.id) })

const bAll = walkAll(bTree), nAll = walkAll(nTree)
const bById = new Map(bAll.map((x) => [x.node.id, x]))
const nById = new Map(nAll.map((x) => [x.node.id, x]))

// ── V2 计数 ──
V('V2a', `树(含根) ${EXPECTED.treeBefore} → ${EXPECTED.treeAfter}`,
  countTree(bTree) === EXPECTED.treeBefore && countTree(nTree) === EXPECTED.treeAfter,
  `${countTree(bTree)} → ${countTree(nTree)}`)
V('V2b', `池 ${EXPECTED.pool} 不变`, Object.keys(bPool).length === EXPECTED.pool && Object.keys(nPool).length === EXPECTED.pool,
  `${Object.keys(bPool).length} → ${Object.keys(nPool).length}`)
V('V2c', `边 ${EXPECTED.edges} 不变`, bArr.length === EXPECTED.edges && nArr.length === EXPECTED.edges,
  `${bArr.length} → ${nArr.length}`)
V('V2d', '池文件**逐字节**不变', Buffer.compare(readBuf(BACKUP, 'node-pool.json'), readBuf(DATA_DIR, 'node-pool.json')) === 0)
V('V2e', '边文件**逐字节**不变（Δ边 = 0 的最强形式）', Buffer.compare(readBuf(BACKUP, 'knowledge-edges.json'), readBuf(DATA_DIR, 'knowledge-edges.json')) === 0)

// ── V3 树节点集合差异：removed 恰 = 4 个目标 ──
const bIds = new Set(bAll.map((x) => x.node.id))
const nIds = new Set(nAll.map((x) => x.node.id))
const tRemoved = [...bIds].filter((x) => !nIds.has(x))
const tAdded = [...nIds].filter((x) => !bIds.has(x))
V('V3', '树 removed 恰 = 4 个目标 treeId 且 added = ∅',
  tRemoved.length === 4 && TARGET_TREE_IDS.every((t) => tRemoved.includes(t)) && tAdded.length === 0,
  `removed=[${tRemoved.join(',')}] added=[${tAdded.join(',')}]`)

// ── V4 Object.children = 快照抽掉 4 项（顺序不变） ──
const bObj = bById.get(PARENT_TREE_ID)?.node
const nObj = nById.get(PARENT_TREE_ID)?.node
const bChildIds = (bObj?.children ?? []).map((c) => c.id)
const expChildIds = bChildIds.filter((x) => !TARGET_TREE_IDS.includes(x))
const nChildIds = (nObj?.children ?? []).map((c) => c.id)
V('V4a', 'Object.children = 快照顺序抽掉 4 项（无重排）', JSON.stringify(nChildIds) === JSON.stringify(expChildIds),
  `${bChildIds.length} → ${nChildIds.length}`)
V('V4b', `Object.children 名称 = ${JSON.stringify(EXPECTED_CHILDREN_AFTER)}`,
  JSON.stringify((nObj?.children ?? []).map((c) => c.name)) === JSON.stringify(EXPECTED_CHILDREN_AFTER),
  JSON.stringify((nObj?.children ?? []).map((c) => c.name)))
V('V4c', '4 个目标已是 Object 的直接子节点（快照侧），摘除后不在', 
  TARGET_TREE_IDS.every((t) => bChildIds.includes(t)) && TARGET_TREE_IDS.every((t) => !nChildIds.includes(t)))

// ── V5 除 Object 外全树逐节点零漂移 ──
const drift = []
for (const [id, bx] of bById) {
  if (id === PARENT_TREE_ID) continue          // 合法变更
  if (TARGET_TREE_IDS.includes(id)) continue   // 合法删除
  const nx = nById.get(id)
  if (!nx) { drift.push(id + '(消失)'); continue }
  if (shapeOf(bx.node) !== shapeOf(nx.node)) drift.push(id)
}
V('V5', '除 Object 与其被摘的 4 个子节点外，全树逐节点逐字段零漂移', drift.length === 0,
  drift.length ? drift.slice(0, 6).join(' ; ') : `比对 ${bById.size - 5} 个节点，0 漂移`)

// ── V6 保留侧挂载仍在 ──
const keptBad = []
for (const t of TARGETS) {
  const mounts = nAll.filter((x) => x.node.nodeRef === t.nodeRef)
  const ok = mounts.length === 1 && mounts[0].node.id === t.keptTreeId && mounts[0].path.includes(KEPT_PATH_MARKER)
  if (!ok) keptBad.push(`${t.name}: ${mounts.map((m) => m.node.id).join(',') || '无挂载'}`)
}
V('V6', '4 个实体在 常用类库 下的挂载仍在（各恰 1 处，id 与路径均符）', keptBad.length === 0,
  keptBad.length ? keptBad.join(' ; ') : TARGETS.map((t) => t.keptTreeId).join(', '))

// ── V7 保留下侧边仍在（9 条） ──
const nEdgeIds = new Set(nArr.map((e) => e.id))
const missingKept = HARD_KEPT_EDGE_IDS.filter((id) => !nEdgeIds.has(id))
V('V7', `保留侧 ${HARD_KEPT_EDGE_IDS.length} 条边仍在（未被误删）`, missingKept.length === 0, missingKept.join(', '))

// ── V8 4 个目标 treeId 在当前全库零出现（无悬空引用） ──
const scanFiles = []
const grepDir = (dir, exts) => {
  if (!fs.existsSync(dir)) return
  ;(function w(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name)
      if (ent.isDirectory()) { if (['node_modules', 'dist', '.git', 'backups'].includes(ent.name)) continue; w(p) }
      else if (exts.some((x) => ent.name.endsWith(x))) scanFiles.push(p)
    }
  })(dir)
}
grepDir(path.join(ROOT, 'src'), ['.ts', '.tsx'])
grepDir(path.join(ROOT, 'docs'), ['.md'])
grepDir(path.join(ROOT, 'data'), ['.json'])
const hits = []
for (const f of scanFiles) {
  if (f.includes(path.sep + 'backups' + path.sep)) continue
  const txt = fs.readFileSync(f, 'utf8')
  if (TARGET_TREE_IDS.some((t) => txt.includes(t))) hits.push(path.relative(ROOT, f))
}
V('V8', '4 个目标 treeId 在 src/docs/data 全量文本零出现（无悬空引用）', hits.length === 0,
  hits.length ? hits.slice(0, 6).join(' ; ') : `扫描 ${scanFiles.length} 文件，0 命中`)

// ── V9 父链完整性 + 无过期徽标 ──
const chainNames = [PARENT_TREE_ID]
let cur = nById.get(PARENT_TREE_ID)?.parent
while (cur && cur.id !== nTree.id) { chainNames.push(cur.id); cur = nById.get(cur.id)?.parent }
const chainOk = chainNames.length >= 3 && nById.has(PARENT_TREE_ID)
V('V9a', 'Object 父链完整（Object 仍在树中且父链可达根）', chainOk, `父链 ${chainNames.length} 级`)
const pathCount = [nObj, ...[...chainNames].map((id) => nById.get(id)?.node)]
  .filter((n) => typeof n?.count === 'number' && n.count > 0).map((n) => n.name)
V('V9b', '受影响路径（含父链）上无 count>0 节点（不会留过期徽标）', pathCount.length === 0,
  pathCount.length ? pathCount.join(', ') : '0 个')

// ── V10 treebind 悬空数不增 ──
const parseTb = (id, known) => {
  if (!/^treebind:/.test(id || '')) return null
  const body = id.slice('treebind:'.length)
  for (let i = 1; i < body.length - 1; i += 1) {
    if (body[i] !== ':') continue
    const a = body.slice(0, i), b = body.slice(i + 1)
    if (known.has(a) && known.has(b)) return { a, b }
  }
  return null
}
const idsB = new Set(walkAll(bTree).map((x) => x.node.id).concat([bTree.id]))
const idsN = new Set(walkAll(nTree).map((x) => x.node.id).concat([nTree.id]))
const unresolvedB = bArr.filter((e) => /^treebind:/.test(e.id || '')).filter((e) => !parseTb(e.id, idsB)).length
const unresolvedN = nArr.filter((e) => /^treebind:/.test(e.id || '')).filter((e) => !parseTb(e.id, idsN)).length
V('V10', 'treebind 边无法解析数不增（删树节点未新增悬空）', unresolvedN <= unresolvedB,
  `批前 ${unresolvedB} → 现 ${unresolvedN}`)

report()

function report() {
  console.log('════ JAVA-LIB-OVERLAP-B · 独立验证 ════')
  console.log('快照 =', BACKUP.replace(ROOT + path.sep, ''))
  console.log('真源 =', DATA_DIR.replace(ROOT + path.sep, ''))
  console.log('口径 = 用户 2026-09-16 确认的**修正口径**（Δ边 = 0，仅摘 4 个树挂载）')
  console.log('')
  for (const r of rows) console.log('  ' + (r.pass ? '✅' : '❌') + ' ' + r.id + '  ' + r.desc + (r.detail ? '   [' + r.detail + ']' : ''))
  const bad = rows.filter((r) => !r.pass)
  console.log('')
  console.log(bad.length ? `⛔ ${bad.length}/${rows.length} 项失败：${bad.map((b) => b.id).join(', ')}` : `✅ 全部 ${rows.length} 项通过`)
  if (bad.length) process.exit(1)
}
