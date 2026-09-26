/**
 * 门一复扫：删池节点前 / 后检查六处活引用，任一命中即非零退出。
 *   1. questions.relatedNodeId
 *   2. questions.answerSteps[].nodeId
 *   3. evolution-events 的 scopeRootId / sourceOnlyNodeIds / introducedNodes / changes
 *   4. 全树 nodeRef
 *   5. edges 两端（treebind 之外）
 *   6. 池内 aliases / 池内其它节点对该 id 的引用
 *
 * 用法：node scripts/shell-fusion/gate.mjs [分组|all]
 * 退出码 0 = 全部零命中；1 = 有命中（打印命中点）。
 */
import { loadAll, walkTree, flatten } from './lib.mjs'
import { SHELLS, GROUPS } from './spec.mjs'

const groupArg = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'all'
const groups = groupArg === 'all' ? GROUPS : [groupArg.toUpperCase()]
const specs = SHELLS.filter((s) => groups.includes(s.group) && !s.keepPool)

const { pool, tree, edges } = loadAll()
const questions = (await import('./lib.mjs')).readJson('questions.json')
const events = (await import('./lib.mjs')).readJson('evolution-events.json')

const refs = new Set(specs.map((s) => s.shellNodeRef))
const labelOf = new Map(specs.map((s) => [s.shellNodeRef, `${s.key}「${s.shellTreeName ?? s.shellTreeId}」`]))

// 自指白名单：壳自己的树条目 id、壳自己池节点的 card.nodeId，不算外部活引用。
const ownTreeIds = new Set()
for (const s of specs) {
  if (s.shellTreeId) { ownTreeIds.add(s.shellTreeId); continue }
  const hits = flatten(tree).filter((f) => f.node.nodeRef === s.shellNodeRef)
  for (const h of hits) {
    if (!s.shellParentName) { ownTreeIds.add(h.node.id); continue }
    const parentIds = new Set(flatten(tree).filter((f) => f.node.name === s.shellParentName).map((f) => f.node.id))
    if (h.parent && parentIds.has(h.parent.id)) ownTreeIds.add(h.node.id)
  }
}

const hits = []
const record = (ref, where, detail) => {
  if (!refs.has(ref)) return
  hits.push(`${labelOf.get(ref)} 命中 ${where}: ${detail}`)
}

// 1+2. questions
for (const q of questions) {
  record(q.relatedNodeId, 'questions.relatedNodeId', q.id)
  for (const [i, st] of (q.answerSteps ?? []).entries()) {
    record(st?.nodeId, `questions.answerSteps[${i}].nodeId`, q.id)
  }
}

// 3. evolution-events
for (const ev of events) {
  record(ev.scopeRootId, 'evolution-events.scopeRootId', ev.id)
  for (const n of ev.sourceOnlyNodeIds ?? []) record(n, 'evolution-events.sourceOnlyNodeIds', ev.id)
  for (const n of ev.introducedNodes ?? []) record(n?.nodeId, 'evolution-events.introducedNodes', ev.id)
  for (const c of ev.changes ?? []) record(c?.targetNodeId, 'evolution-events.changes', ev.id)
}

// 4. 全树 nodeRef（排除壳自己的树条目）
walkTree(tree, (n) => {
  if (ownTreeIds.has(n.id)) return
  record(n.nodeRef, 'tree.nodeRef', `${n.id}「${n.name}」`)
})

// 5. edges（treebind 已随树条目删完，这里扫剩下的真语义边）
for (const e of edges) {
  if (String(e.id).startsWith('treebind:')) continue
  record(e.source, 'edges.source', e.id)
  record(e.target, 'edges.target', e.id)
}

// 6. 池内 aliases + 池内节点间引用（排除壳自己池节点的自指）
for (const [id, n] of Object.entries(pool)) {
  for (const a of n.aliases ?? []) record(a, 'pool.aliases', id)
  for (const t of n.card?.tabs ?? []) record(t?.nodeRef, 'pool.card.tabs[].nodeRef', id)
  if (!refs.has(id)) record(n.card?.nodeId, 'pool.card.nodeId', id)
}

// 池里是否还残留壳节点
const stillInPool = [...refs].filter((r) => pool[r] !== undefined)

console.log(`门一复扫：分组 ${groups.join(',')}，检查 ${refs.size} 个壳 nodeRef`)
console.log(`  池内残留壳节点：${stillInPool.length === 0 ? '无' : stillInPool.join(', ')}`)
console.log(`  活引用命中：${hits.length}`)
for (const h of hits) console.log('    ! ' + h)

if (hits.length > 0) {
  console.log('\n结论：有命中 → 停止，不许删/不许提交。')
  process.exit(1)
}
console.log('\n结论：六处全部零命中 ✅')
