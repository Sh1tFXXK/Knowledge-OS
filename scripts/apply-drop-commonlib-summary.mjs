/**
 * 批次 core-library-methods · 第 4 步：删除「常用类库整理」汇总结点。
 *
 * 用户裁决（2026-09-15）：**连池一起删**（非惯例的「卸树留池」，用户明确担责）。
 *   tree  3215 → 3214   （摘除 tree_vault_javajava_1b1w4s）
 *   edges 4163 → 4162   （清 treebind:tree_java_common_libraries:tree_vault_javajava_1b1w4s）
 *   pool  3858 → 3857   （删池实体 k_vault_javajava_1b1w4s）
 *
 * ⛔ 前置守卫（不通过则拒绝执行）：源材料 4 节的方法名必须**全部**已在对应类节点有 tab。
 *    否则删源节点 = 内容丢失。
 *
 * 纪律：预检与实跑共用同一个 buildPlan()；默认 dry-run，--apply 才写盘；三文件各自备份；
 *      保留末尾换行；自检差异精确等于声明的三个目标。
 */
import fs from 'node:fs'
import path from 'node:path'
import { DATA, readJson, walkTree } from './shell-fusion/lib.mjs'

const SRC_REF = 'k_vault_javajava_1b1w4s'
const SRC_TREE_ID = 'tree_vault_javajava_1b1w4s'
const PARENT_TREE_ID = 'tree_java_common_libraries'
const PARENT_REF = 'k_java_common_libraries'

const SECTIONS = [
  { mark: '一', ref: 'k_java_lang_string', name: 'java.lang.String' },
  { mark: '二', ref: 'k_java_util_scanner', name: 'java.util.Scanner' },
  { mark: '三', ref: 'k_java_nio_file_files', name: 'java.nio.file.Files' },
  { mark: '四', ref: 'k_java_lang_enum', name: 'java.lang.Enum' },
]

const lowerFirst = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s)

/** 从源材料 def 正文按「## 一/二/三/四」切段，抽出方法表行里的方法名。 */
function extractSourceMethods(defText) {
  const out = new Map(SECTIONS.map((s) => [s.mark, new Set()]))
  let current = null
  for (const line of String(defText ?? '').split('\n')) {
    const head = line.match(/^##\s*([一二三四])、/)
    if (head) { current = head[1]; continue }
    if (!current) continue
    // 只认表格行：| `签名` | 说明 |
    const row = line.match(/^\|\s*`([^`]+)`\s*\|/)
    if (!row) continue
    const sig = row[1]
    const m = sig.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/)
    if (!m) continue
    out.get(current)?.add(lowerFirst(m[1]))
  }
  return out
}

/** 前置守卫：源材料方法名 ⊆ 目标类节点 tab id。返回按节的缺口报告。 */
function coverageGuard(pool) {
  const src = pool[SRC_REF]
  if (!src) throw new Error(`源实体不存在: ${SRC_REF}`)
  const defTab = (src.card?.tabs ?? []).find((t) => t.id === 'def')
  if (!defTab) throw new Error('源实体无 def tab，无法提取方法清单')
  const methods = extractSourceMethods(defTab.content)

  const report = []
  let missingTotal = 0
  for (const s of SECTIONS) {
    const names = [...(methods.get(s.mark) ?? [])].sort()
    const target = pool[s.ref]
    const ids = new Set((target?.card?.tabs ?? []).map((t) => String(t.id)))
    const missing = names.filter((n) => !ids.has(n))
    missingTotal += missing.length
    report.push({ mark: s.mark, ref: s.ref, name: s.name, expected: names.length, missing, tabCount: ids.size })
  }
  return { report, missingTotal, sourceChars: (src.card?.rootContent ?? '').length + (defTab.content ?? '').length }
}

/** 纯函数：在给定 {tree, edges, pool} 快照上执行本批操作。预检与实跑共用。 */
function buildPlan({ tree, edges, pool }) {
  // ── 1. 树：从父节点 children 里精确 id 相等地摘除 ──
  const rows = []
  walkTree(tree, (node, parent) => rows.push({ node, parent }))
  const parentRow = rows.find((r) => r.node.id === PARENT_TREE_ID)
  const srcRow = rows.find((r) => r.node.id === SRC_TREE_ID)
  if (!parentRow) throw new Error(`父节点不存在: ${PARENT_TREE_ID}`)
  if (!srcRow) throw new Error(`源树节点不存在: ${SRC_TREE_ID}`)
  if (srcRow.parent !== parentRow.node) throw new Error('源树节点的父不是预期父节点，拒绝执行')
  const before = (parentRow.node.children ?? []).length
  parentRow.node.children = (parentRow.node.children ?? []).filter((c) => c.id !== SRC_TREE_ID)
  const after = parentRow.node.children.length

  // 问：源树节点还有别的挂载/父吗？
  const otherMounts = rows.filter((r) => r.node.id === SRC_TREE_ID)
  const otherRefOwners = rows.filter((r) => r.node.nodeRef === SRC_REF)

  // ── 2. 边：删除端点指向源实体的全部边（并单独点名 treebind） ──
  const keptEdges = []
  const droppedEdges = []
  for (const e of edges) {
    const touches = e.source === SRC_REF || e.target === SRC_REF ||
      String(e.id ?? '').includes(SRC_TREE_ID) || e.source === SRC_TREE_ID || e.target === SRC_TREE_ID
    ;(touches ? droppedEdges : keptEdges).push(e)
  }

  // ── 3. 池：删实体 ──
  const nextPool = { ...pool }
  const existed = SRC_REF in nextPool
  delete nextPool[SRC_REF]

  return {
    tree, edges: keptEdges, pool: nextPool,
    report: {
      rowsWithRootBefore: rows.length,
      treeBefore: rows.length - 1, treeAfter: rows.length - 2,
      parentChildrenBefore: before, parentChildrenAfter: after,
      edgesBefore: edges.length, edgesAfter: keptEdges.length,
      droppedEdges: droppedEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type, label: e.label })),
      poolBefore: Object.keys(pool).length, poolAfter: Object.keys(nextPool).length,
      poolExisted: existed,
      // 目标树节点在树里的出现次数（应为 1：就是它自己，无第二处挂载）
      sourceTreeIdOccurrences: otherMounts.length,
      sourceRefMountIds: otherRefOwners.map((r) => r.node.id),
    },
  }
}

// ── CLI ──────────────────────────────────────────────────────────────
const apply = process.argv.includes('--apply')
const files = ['tree-data.json', 'knowledge-edges.json', 'node-pool.json']
const raws = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(DATA, f), 'utf8')]))
const nl = Object.fromEntries(files.map((f) => [f, raws[f].endsWith('\n')]))
const tree = JSON.parse(raws['tree-data.json'])
const edgesRaw = JSON.parse(raws['knowledge-edges.json'])
const edges = Array.isArray(edgesRaw) ? edgesRaw : (edgesRaw.edges ?? edgesRaw.relations ?? [])
const edgesIsArray = Array.isArray(edgesRaw)
const pool = JSON.parse(raws['node-pool.json'])

console.log('=== 批次 core-library-methods · 第 4 步（删除「常用类库整理」）===')
console.log('模式            ', apply ? 'APPLY（写盘）' : 'DRY-RUN（不写盘）')

// ── 前置守卫 ──
console.log('\n--- 前置守卫：源材料 4 节方法名 → 类节点 tab 覆盖 ---')
const cov = coverageGuard(pool)
console.log('源实体正文字数  ', cov.sourceChars)
for (const r of cov.report) {
  console.log(`  ${r.mark}、${r.name}  方法名 ${String(r.expected).padStart(2)} 个 · 节点 tab ${r.tabCount} · 缺口 ${r.missing.length}${r.missing.length ? ' → ' + JSON.stringify(r.missing) : ' ✓'}`)
}
console.log('缺口合计        ', cov.missingTotal)
if (cov.missingTotal > 0) {
  console.error('❌ 内容未完全迁移，拒绝删除源节点')
  process.exit(3)
}

const { tree: plannedTree, edges: plannedEdges, pool: plannedPool, report } = buildPlan({ tree, edges, pool })
console.log('\n--- 计划 ---')
console.log('树节点(含根)    ', report.rowsWithRootBefore, '→', report.rowsWithRootBefore - 1)
console.log('树节点(不含根)  ', report.treeBefore, '→', report.treeAfter, `(${report.treeAfter - report.treeBefore})`)
console.log('父节点 children ', report.parentChildrenBefore, '→', report.parentChildrenAfter)
console.log('边              ', report.edgesBefore, '→', report.edgesAfter, `(${report.edgesAfter - report.edgesBefore})`)
for (const e of report.droppedEdges) console.log('      − ' + e.id + `  [${e.source} → ${e.target} · ${e.type}/${e.label}]`)
console.log('池实体          ', report.poolBefore, '→', report.poolAfter, `(${report.poolAfter - report.poolBefore})  源实体存在=${report.poolExisted}`)
console.log('源树节点出现次数', report.sourceTreeIdOccurrences, '（应为 1：仅其自身，无第二处挂载）')
console.log('源实体树挂载    ', JSON.stringify(report.sourceRefMountIds), '（应为 1 处）')
for (const f of files) console.log(`末尾换行 ${f.padEnd(22)}`, nl[f])

// 自检
const ok = report.treeAfter === report.treeBefore - 1 && report.edgesAfter === report.edgesBefore - 1 &&
  report.poolAfter === report.poolBefore - 1 && report.parentChildrenAfter === report.parentChildrenBefore - 1 &&
  report.sourceTreeIdOccurrences === 1 && report.sourceRefMountIds.length === 1 &&
  report.sourceRefMountIds[0] === SRC_TREE_ID
console.log('\n自检            ', ok ? `树 −1 ✓ · 边 −1 ✓ · 池 −1 ✓ · 父 children −1 ✓ · 唯一挂载 ✓` : '❌ 不通过')
if (!ok) process.exit(4)

if (!apply) {
  console.log('\nDRY-RUN 结束，data/ 未改动。加 --apply 落盘。')
  process.exit(0)
}

// 备份 → 原子写三文件
const iso = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join(DATA, 'backups', `core-library-methods-${iso}`)
fs.mkdirSync(backupDir, { recursive: true })
for (const f of files) fs.copyFileSync(path.join(DATA, f), path.join(backupDir, f))
fs.writeFileSync(
  path.join(backupDir, 'journal.txt'),
  `批次: core-library-methods · 第 4 步（删除「常用类库整理」）\n时间: ${new Date().toISOString()}\n` +
    `裁决: 连池一起删（用户 2026-09-15 明确）\n\n` +
    `树:   ${report.treeBefore} → ${report.treeAfter}\n` +
    `边:   ${report.edgesBefore} → ${report.edgesAfter}\n      ${report.droppedEdges.map((e) => e.id).join('\n      ')}\n` +
    `池:   ${report.poolBefore} → ${report.poolAfter}（删 ${SRC_REF}）\n` +
    `守卫: 源材料 4 节方法名全部已在对应类节点有 tab（缺口 0）\n`,
  'utf8',
)

function writeAtomic(file, value) {
  const target = path.join(DATA, file)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + (nl[file] ? '\n' : ''), 'utf8')
  fs.renameSync(tmp, target)
}
writeAtomic('tree-data.json', plannedTree)
writeAtomic('knowledge-edges.json', edgesIsArray ? plannedEdges.slice() : { ...edgesRaw, edges: plannedEdges })
writeAtomic('node-pool.json', plannedPool)

console.log('\n✓ 已落盘 tree-data.json / knowledge-edges.json / node-pool.json')
console.log('  备份 →', path.relative(process.cwd(), backupDir).replace(/\\/g, '/'))
for (const f of files) console.log(`  末尾换行保留 ${f}:`, fs.readFileSync(path.join(DATA, f), 'utf8').endsWith('\n'))
