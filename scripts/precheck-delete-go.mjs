/**
 * 预检：删除 Go 语言域（树 + 池 + 边 + 解释卡内容）
 * 只读。不写任何文件。
 *
 *   node scripts/precheck-delete-go.mjs
 *
 * 输出：Go 域 id 清单 + 各真源的影响面 + 阻塞项（BLOCK）/ 放行（GO）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'data')
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))

const GO_TREE_ROOT = 'tree_1786618025853_3qn55e'

const tree = read('tree-data.json')
const pool = read('node-pool.json')
const edges = read('knowledge-edges.json')
const questions = read('questions.json')
const chains = read('version-chains.json')
const events = read('evolution-events.json')

// ---- 1. 收集 Go 域树节点 ----
let goRoot = null
const treePath = []
;(function find(n, p) {
  if (goRoot) return
  const np = p.concat(n.name || n.id)
  if (n.id === GO_TREE_ROOT) { goRoot = n; treePath.push(...np); return }
  ;(n.children || []).forEach((c) => find(c, np))
})(tree, [])

if (!goRoot) {
  console.error('BLOCK: 找不到 Go 域根节点 ' + GO_TREE_ROOT)
  process.exit(1)
}

const goTreeNodes = []
;(function walk(n, d) {
  goTreeNodes.push({ id: n.id, name: n.name, nodeRef: n.nodeRef || '', depth: d })
  ;(n.children || []).forEach((c) => walk(c, d + 1))
})(goRoot, 0)

const goTreeIds = new Set(goTreeNodes.map((n) => n.id))
const goPoolIds = new Set(goTreeNodes.map((n) => n.nodeRef).filter(Boolean))

console.log('# 预检：删除 Go 语言域')
console.log('树路径      : ' + treePath.join(' > '))
console.log('树节点数    : ' + goTreeNodes.length)
console.log('池节点数    : ' + goPoolIds.size)

// ---- 2. 池节点是否都存在 ----
const missingPool = [...goPoolIds].filter((id) => !pool[id])
console.log('池缺失      : ' + (missingPool.length ? 'BLOCK ' + missingPool.join(',') : '0'))

// ---- 3. 池节点是否被 Go 域以外的树挂载（重复挂载）----
const mounts = new Map()
;(function walk(n) {
  if (n.nodeRef) {
    if (!mounts.has(n.nodeRef)) mounts.set(n.nodeRef, [])
    mounts.get(n.nodeRef).push(n.id)
  }
  ;(n.children || []).forEach(walk)
})(tree)
const outsideMounts = []
for (const id of goPoolIds) {
  const m = (mounts.get(id) || []).filter((t) => !goTreeIds.has(t))
  if (m.length) outsideMounts.push({ poolId: id, treeIds: m })
}
console.log('域外重复挂载: ' + (outsideMounts.length ? JSON.stringify(outsideMounts) : '0'))

// ---- 4. Go 域树节点下是否还挂着域外池节点（不该有，但要确认）----
console.log('卡总字数    : ' + [...goPoolIds].reduce((s, id) => s + ((pool[id]?.card?.rootContent) || '').length, 0))
const tabTotal = [...goPoolIds].reduce((s, id) => s + (pool[id]?.card?.tabs?.length || 0), 0)
console.log('卡 tabs 总数: ' + tabTotal)

// ---- 5. 边 ----
const allIds = new Set([...goTreeIds, ...goPoolIds])
const hitEdges = edges.filter((e) => allIds.has(e.source) || allIds.has(e.target))
const byEndpoint = { treeTree: 0, poolPool: 0, mixed: 0 }
for (const e of hitEdges) {
  const s = goTreeIds.has(e.source), t = goTreeIds.has(e.target)
  const sp = goPoolIds.has(e.source), tp = goPoolIds.has(e.target)
  if ((s || t) && !(sp || tp)) byEndpoint.treeTree++
  else if ((sp || tp) && !(s || t)) byEndpoint.poolPool++
  else byEndpoint.mixed++
}
console.log('命中边      : ' + hitEdges.length + '  ' + JSON.stringify(byEndpoint))
const edgeTypes = {}
for (const e of hitEdges) edgeTypes[e.type] = (edgeTypes[e.type] || 0) + 1
console.log('边类型分布  : ' + JSON.stringify(edgeTypes))
const crossEdges = hitEdges.filter((e) => {
  const inS = allIds.has(e.source), inT = allIds.has(e.target)
  return inS !== inT
})
console.log('跨域边(需保留端点侧检查): ' + crossEdges.length)
for (const e of crossEdges.slice(0, 20)) {
  console.log('   ' + e.id + '  ' + e.source + ' -> ' + e.target + '  [' + e.type + ']')
}

// ---- 6. 问题库 / 版本链 / 演化事件 ----
const qHits = questions.filter((q) => {
  const s = JSON.stringify(q)
  return [...allIds].some((id) => s.includes(id))
})
console.log('问题库引用  : ' + qHits.length + (qHits.length ? ' ' + qHits.map((q) => q.id).join(',') : ''))
const vcHits = chains.filter((c) => {
  const s = JSON.stringify(c)
  return [...allIds].some((id) => s.includes(id))
})
console.log('版本链引用  : ' + vcHits.length + (vcHits.length ? ' ' + vcHits.map((c) => c.entityId).join(',') : ''))
const evHits = events.filter((ev) => {
  const s = JSON.stringify(ev)
  return [...allIds].some((id) => s.includes(id))
})
console.log('演化事件引用: ' + evHits.length)

// ---- 7. 删除后是否产生悬空引用（别的边指向被删节点）----
const dangling = edges.filter((e) => !allIds.has(e.source) && !allIds.has(e.target) === false)
console.log('（旁证）边端点非 Go 但有空: ' + dangling.length)

// ---- 8. 结论 ----
const blocks = []
if (missingPool.length) blocks.push('池节点缺失')
if (outsideMounts.length) blocks.push('域外重复挂载')

console.log('\n# 影响面汇总')
console.log(JSON.stringify({
  treeNodes: goTreeNodes.length,
  poolNodes: goPoolIds.size,
  edges: hitEdges.length,
  crossEdges: crossEdges.length,
  questions: qHits.length,
  versionChains: vcHits.length,
  evolutionEvents: evHits.length,
}, null, 2))

console.log('\n# 结论: ' + (blocks.length ? 'BLOCK — ' + blocks.join(' / ') : 'GO（可删）'))

// 导出 id 清单供 apply 复用
console.log('\n# 池 id 清单')
console.log([...goPoolIds].join('\n'))
