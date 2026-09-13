/**
 * 只读自审：本批（§一/§二 + 载体修正）产出的结构与引用的完整性/一致性体检。
 * 对照基线备份 data/backups/a-split-2026-09-13/ 判断「本批新增的债务」。
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadState, flatten, shellContent, log } from './common.mjs'

const state = loadState()
const { pool, tree, edges, questions } = state
const flat = flatten(tree)
const BACKUP = path.join('data', 'backups', 'a-split-2026-09-13')
const bPool = JSON.parse(fs.readFileSync(path.join(BACKUP, 'node-pool.json'), 'utf8'))
const bTree = JSON.parse(fs.readFileSync(path.join(BACKUP, 'tree-data.json'), 'utf8'))
const bEdges = JSON.parse(fs.readFileSync(path.join(BACKUP, 'knowledge-edges.json'), 'utf8'))
const bFlat = flatten(bTree)

const ALLOWED = new Set(['structure', 'classification', 'dependency', 'causality', 'state-transition', 'constraint', 'evidence', 'reference'])
const problems = []
const note = (s) => problems.push(s)

log('═══ 1. 本批新建边（asplit: 前缀）═══')
const batchEdges = edges.filter((e) => String(e.id).startsWith('asplit:'))
let enumBad = 0; let typeBad = 0; let refBad = 0; let dimBad = 0
for (const e of batchEdges) {
  if (!ALLOWED.has(e.relationKind)) { enumBad += 1; note(`边 ${e.id} relationKind=${e.relationKind} 不在枚举`) }
  if (!e.type || !String(e.type).trim()) { typeBad += 1; note(`边 ${e.id} type 为空`) }
  if (!pool[e.source]) { refBad += 1; note(`边 ${e.id} source ${e.source} 不在池`) }
  if (!pool[e.target]) { refBad += 1; note(`边 ${e.id} target ${e.target} 不在池`) }
  if (!Array.isArray(e.dimensions)) dimBad += 1
}
log(`  共 ${batchEdges.length} 条；relationKind 越界 ${enumBad} · type 空 ${typeBad} · 端点悬空 ${refBad} · dimensions 非数组 ${dimBad}`)
const byKind = new Map()
for (const e of batchEdges) byKind.set(e.relationKind, (byKind.get(e.relationKind) ?? 0) + 1)
log(`  relationKind 分布：${[...byKind.entries()].map(([k, n]) => `${k}×${n}`).join(' , ')}`)
const byType = new Map()
for (const e of batchEdges) byType.set(e.type, (byType.get(e.type) ?? 0) + 1)
log(`  type 分布（前 12）：${[...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k}×${n}`).join(' , ')}`)

log('\n═══ 2. 全库 mechanismSpec 引用完整性 ═══')
const specHosts = Object.values(pool).filter((n) => n.mechanismSpec)
log(`  宿主 ${specHosts.length} 个（基线 ${Object.values(bPool).filter((n) => n.mechanismSpec).length} 个）`)
for (const h of specHosts) {
  const s = h.mechanismSpec
  const ids = [s.phenomenonNodeId, ...(s.triggerNodeIds ?? []), ...(s.participantNodeIds ?? []), ...(s.stateNodeIds ?? []), ...(s.outcomeNodeIds ?? []), ...(s.failureNodeIds ?? [])]
  const missing = ids.filter((i) => i && !pool[i])
  const unmounted = ids.filter((i) => i && pool[i] && flat.filter((f) => f.node.nodeRef === i).length === 0)
  const badTrans = (s.transitionEdgeIds ?? []).filter((id) => !edges.some((e) => e.id === id))
  const transKind = (s.transitionEdgeIds ?? []).filter((id) => { const e = edges.find((x) => x.id === id); return e && e.relationKind !== 'state-transition' })
  const mounted = flat.filter((f) => f.node.nodeRef === h.id).length
  log(`  「${h.label}」(${h.id}) 态${(s.stateNodeIds ?? []).length} 转移${(s.transitionEdgeIds ?? []).length} 参与${(s.participantNodeIds ?? []).length} | 悬空 ${missing.length} 未挂载 ${unmounted.length} 转移边缺失 ${badTrans.length} 转移非 state-transition ${transKind.length} | 宿主树挂载 ${mounted}`)
  for (const m of missing) note(`spec「${h.label}」引用 ${m} 不在池（悬空）`)
  for (const u of unmounted) note(`spec「${h.label}」引用 ${u} 无树挂载（机制图可能渲染不出）`)
  for (const t of badTrans) note(`spec「${h.label}」transitionEdgeIds 含不存在的边 ${t}`)
  for (const t of transKind) note(`spec「${h.label}」转移边 ${t} 的 relationKind 不是 state-transition`)
}

log('\n═══ 3. 本批新建节点是否都有树挂载（防孤儿）═══')
const batchNodes = Object.values(pool).filter((n) => String(n.id).startsWith('asplit_'))
const orphan = batchNodes.filter((n) => flat.filter((f) => f.node.nodeRef === n.id).length === 0)
log(`  新建节点 ${batchNodes.length} 个；无树挂载 ${orphan.length} ${orphan.length ? '→ ' + orphan.map((n) => n.id).join(', ') : ''}`)
for (const o of orphan) note(`新建节点 ${o.id}「${o.label}」无树挂载（孤儿）`)
const emptyBody = batchNodes.filter((n) => shellContent(n).length === 0)
log(`  新建节点中正文为空：${emptyBody.length} ${emptyBody.length ? '→ ' + emptyBody.map((n) => n.id).join(', ') : ''}`)
for (const o of emptyBody) note(`新建节点 ${o.id}「${o.label}」正文为空`)

log('\n═══ 4. 树条目 nodeRef 悬空（指向不存在的池节点）═══')
const dangling = flat.filter((f) => f.node.nodeRef && !pool[f.node.nodeRef])
const bDangling = bFlat.filter((f) => f.node.nodeRef && !bPool[f.node.nodeRef])
log(`  当前 ${dangling.length} 条（基线 ${bDangling.length} 条）`)
for (const d of dangling.slice(0, 12)) log(`    「${d.node.name}」(${d.node.id}) ref=${d.node.nodeRef}`)

log('\n═══ 5. 重复 nodeRef（宪法原则二：单一家园债务）═══')
const dupOf = (fl) => {
  const m = new Map()
  for (const f of fl) { if (!f.node.nodeRef) continue; m.set(f.node.nodeRef, (m.get(f.node.nodeRef) ?? 0) + 1) }
  return [...m.entries()].filter(([, n]) => n > 1)
}
const dupNow = dupOf(flat); const dupBase = dupOf(bFlat)
log(`  当前重复组 ${dupNow.length}（基线 ${dupBase.length}）`)
const dupNew = dupNow.filter(([ref]) => !dupBase.some(([r]) => r === ref))
log(`  本批新增的重复组 ${dupNew.length} ${dupNew.length ? '→ ' + dupNew.map(([r, n]) => `${r}(${n})`).join(', ') : ''}`)
for (const [r, n] of dupNew) note(`本批新增重复 nodeRef ${r} 挂载 ${n} 处`)

log('\n═══ 6. card.tabs 清空（载体修正的副作用）═══')
const emptyTabs = (p) => Object.values(p).filter((n) => Array.isArray(n.card?.tabs) && n.card.tabs.length === 0)
const etNow = emptyTabs(pool); const etBase = emptyTabs(bPool)
log(`  当前空 card.tabs 节点 ${etNow.length}（基线 ${etBase.length}，差 ${etNow.length - etBase.length}）`)
const bEmptyIds = new Set(etBase.map((n) => n.id))
const newlyEmpty = etNow.filter((n) => !bEmptyIds.has(n.id))
for (const n of newlyEmpty) {
  const mounts = flat.filter((f) => f.node.nodeRef === n.id)
  const sup = mounts.reduce((a, m) => a + (m.node.supplement?.tabs ?? []).length, 0)
  const hasRoot = (n.card?.rootContent ?? '').trim().length > 0
  log(`    「${n.label}」(${n.id}) 树挂载 ${mounts.length} · supplement ${sup} · rootContent ${hasRoot ? '有' : '无'}`)
  if (!hasRoot && sup === 0) note(`「${n.label}」${n.id} 卡空、无 supplement、无 rootContent —— 正文可能不可达`)
}

log('\n═══ 7. 问题库引用完整性 ═══')
const qBad = questions.filter((q) => q.relatedNodeId && !pool[q.relatedNodeId])
log(`  relatedNodeId 悬空 ${qBad.length}；answerSteps 引用悬空 ${questions.reduce((a, q) => a + (q.answerSteps ?? []).filter((s) => s?.nodeId && !pool[s.nodeId]).length, 0)}`)
for (const q of qBad) note(`问题 ${q.id} relatedNodeId ${q.relatedNodeId} 悬空`)

log('\n═══ 汇总 ═══')
log(`边 ${edges.length}（基线 ${bEdges.length}）· 池 ${Object.keys(pool).length}（基线 ${Object.keys(bPool).length}）· 树 ${flat.length}（基线 ${bFlat.length}）`)
if (problems.length === 0) log('✅ 未发现问题')
else { log(`⚠️ ${problems.length} 项待看：`); for (const p of problems) log('  · ' + p) }
