/**
 * 只读：对比备份与现状，输出本批（final-87-batch1）树/池的精确差分。
 * 用法：node scripts/shell-fusion/diff-batch1-vs-backup.mjs <backupDir>
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const backupDir = process.argv[2]
if (!backupDir) { console.error('用法：node scripts/shell-fusion/diff-batch1-vs-backup.mjs <backupDir>'); process.exit(1) }
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const B = {
  tree: rd(path.join(ROOT, backupDir, 'tree-data.json')),
  pool: rd(path.join(ROOT, backupDir, 'node-pool.json')),
  edges: rd(path.join(ROOT, backupDir, 'knowledge-edges.json')),
  questions: rd(path.join(ROOT, backupDir, 'questions.json')),
}
const C = {
  tree: rd(path.join(ROOT, 'data', 'tree-data.json')),
  pool: rd(path.join(ROOT, 'data', 'node-pool.json')),
  edges: rd(path.join(ROOT, 'data', 'knowledge-edges.json')),
  questions: rd(path.join(ROOT, 'data', 'questions.json')),
}

const flatTree = (root) => {
  const m = new Map()
  const walk = (list, parentPath) => {
    for (const e of list) {
      const p = [...parentPath, e.name]
      m.set(e.id, { name: e.name, parentPath, path: p, nodeRef: e.nodeRef, tabs: (e.supplement?.tabs ?? []).map((t) => t.label) })
      if (e.children) walk(e.children, p)
    }
  }
  walk(root.children ?? [], [root.name])
  return m
}
const ftB = flatTree(B.tree)
const ftC = flatTree(C.tree)

const lines = []
const H = (s) => { lines.push(''); lines.push(`## ${s}`); lines.push('') }

lines.push('# final-87-batch1 差分报告（备份 → 现状）')
lines.push('')
lines.push(`备份：\`${backupDir}\``)
lines.push(`树条目 ${ftB.size} → ${ftC.size}（Δ${ftC.size - ftB.size}）｜池 ${Object.keys(B.pool).length} → ${Object.keys(C.pool).length}（Δ${Object.keys(C.pool).length - Object.keys(B.pool).length}）｜边 ${B.edges.length} → ${C.edges.length}（Δ${C.edges.length - B.edges.length}）`)

H('1. 树条目：删除（已卸树）')
const removed = [...ftB.keys()].filter((id) => !ftC.has(id))
for (const id of removed) {
  const b = ftB.get(id)
  lines.push(`- \`${id}\` 「${b.name}」 原路径：${b.parentPath.join(' › ')}`)
}
lines.push('')
lines.push(`合计 **${removed.length}** 条`)

H('2. 树条目：新增')
const added = [...ftC.keys()].filter((id) => !ftB.has(id))
for (const id of added) {
  const c = ftC.get(id)
  lines.push(`- \`${id}\` 「${c.name}」 现路径：${c.parentPath.join(' › ')}`)
}
lines.push('')
lines.push(`合计 **${added.length}** 条`)

H('3. 树条目：改名（同一 id，name 变化）')
let renameCount = 0
for (const [id, c] of ftC) {
  const b = ftB.get(id)
  if (!b) continue
  if (b.name !== c.name) { renameCount += 1; lines.push(`- \`${id}\`：「${b.name}」 → 「${c.name}」`) }
}
lines.push('')
lines.push(`合计 **${renameCount}** 条`)

H('4. 树条目：位置变化（同一 id，父路径变化）')
let moveCount = 0
for (const [id, c] of ftC) {
  const b = ftB.get(id)
  if (!b) continue
  if (b.parentPath.join('/') !== c.parentPath.join('/')) {
    moveCount += 1
    lines.push(`- \`${id}\` 「${c.name}」：${b.parentPath.join(' › ')}  →  ${c.parentPath.join(' › ')}`)
  }
}
lines.push('')
lines.push(`合计 **${moveCount}** 条`)

H('5. 树条目：supplement 页签新增')
let tabCount = 0
for (const [id, c] of ftC) {
  const b = ftB.get(id)
  const before = new Set(b?.tabs ?? [])
  const fresh = (c.tabs ?? []).filter((t) => !before.has(t))
  const old = b ? (b.tabs ?? []).filter((t) => !(c.tabs ?? []).includes(t)) : []
  if (fresh.length || old.length) {
    tabCount += 1
    lines.push(`- \`${id}\` 「${c.name}」`)
    if (fresh.length) lines.push(`  - 新增：${fresh.map((t) => `「${t}」`).join('、')}`)
    if (old.length) lines.push(`  - 消失：${old.map((t) => `「${t}」`).join('、')}`)
  }
}
lines.push('')
lines.push(`涉及 **${tabCount}** 个宿主条目`)

H('6. 池节点：新增 / 删除')
const poolAdded = Object.keys(C.pool).filter((k) => !(k in B.pool))
const poolRemoved = Object.keys(B.pool).filter((k) => !(k in C.pool))
lines.push(`- 新增 **${poolAdded.length}** 个：${poolAdded.join(', ') || '（无）'}`)
lines.push(`- 删除 **${poolRemoved.length}** 个：${poolRemoved.join(', ') || '（无）'}`)

H('7. 池节点：字段变化（label / status / redirectTo / kind / tags）')
let poolChanged = 0
for (const k of Object.keys(C.pool)) {
  const b = B.pool[k]
  const c = C.pool[k]
  if (!b) continue
  const diffs = []
  for (const f of ['label', 'status', 'redirectTo', 'canonicalNodeId', 'kind']) {
    if (JSON.stringify(b[f]) !== JSON.stringify(c[f])) diffs.push(`${f}: ${JSON.stringify(b[f])} → ${JSON.stringify(c[f])}`)
  }
  const bt = JSON.stringify(b.tags ?? []); const ct = JSON.stringify(c.tags ?? [])
  if (bt !== ct) diffs.push(`tags: ${bt} → ${ct}`)
  if (diffs.length) { poolChanged += 1; lines.push(`- \`${k}\`：${diffs.join('；')}`) }
}
lines.push('')
lines.push(`涉及 **${poolChanged}** 个节点`)

H('8. 边：新增 / 删除')
const ekey = (e) => `${e.source ?? e.from}--[${e.type}]-->${e.target ?? e.to}`
const be = new Set(B.edges.map(ekey)); const ce = new Set(C.edges.map(ekey))
const eAdded = [...ce].filter((k) => !be.has(k))
const eRemoved = [...be].filter((k) => !ce.has(k))
lines.push(`- 新增 **${eAdded.length}** 条：${eAdded.join('；') || '（无）'}`)
lines.push(`- 删除 **${eRemoved.length}** 条：${eRemoved.join('；') || '（无）'}`)

H('9. 题库：字段变化')
let qChanged = 0
const bq = new Map(B.questions.map((q) => [q.id, q])); const cq = new Map(C.questions.map((q) => [q.id, q]))
for (const [id, q] of cq) {
  const b = bq.get(id)
  if (!b) { qChanged += 1; lines.push(`- \`${id}\` 新增`); continue }
  if (b.relatedNodeId !== q.relatedNodeId) { qChanged += 1; lines.push(`- \`${id}\` relatedNodeId：${b.relatedNodeId} → ${q.relatedNodeId}`) }
}
lines.push('')
lines.push(`涉及 **${qChanged}** 条`)

const out = path.join(ROOT, 'outputs', 'tree-violation-scan', 'batch1-diff-report.md')
fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8')
console.log(lines.join('\n'))
console.log(`\n已写出 → ${path.relative(ROOT, out)}`)
