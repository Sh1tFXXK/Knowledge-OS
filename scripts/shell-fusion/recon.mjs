/**
 * 侦察：21 条壳在树/池/边中的真实现状 + 目标树条目的 supplement 现状。
 * 只读，不改数据。用法：node scripts/shell-fusion/recon.mjs
 */
import {
  loadAll, walkTree, flatten, treeCount, shellContent, findTreeById, findTreeByName,
} from './lib.mjs'
import { SHELLS, GROUPS } from './spec.mjs'

const { pool, tree, edges } = loadAll()

const all = flatten(tree)
const byId = new Map(all.map(({ node, parent }) => [node.id, { node, parent }]))
const byRef = new Map()
for (const { node, parent } of all) {
  if (node.nodeRef) {
    if (!byRef.has(node.nodeRef)) byRef.set(node.nodeRef, [])
    byRef.get(node.nodeRef).push({ node, parent })
  }
}
const byName = new Map()
for (const { node, parent } of all) {
  if (!byName.has(node.name)) byName.set(node.name, [])
  byName.get(node.name).push({ node, parent })
}

function resolveTarget(spec) {
  const t = spec.target
  if (t.kind === 'self') return byId.get(spec.shellTreeId) ?? null
  if (t.kind === 'nodeRef') return byRef.get(t.value)?.[0] ?? null
  const hits = byName.get(t.value) ?? []
  return hits[0] ?? null
}

function resolveShell(spec) {
  if (spec.shellTreeId) return byId.get(spec.shellTreeId) ?? null
  const hits = byName.get(spec.shellTreeName) ?? []
  if (hits.length === 1) return hits[0]
  if (spec.shellParentName) {
    const filtered = hits.filter(({ parent }) => parent?.name === spec.shellParentName)
    if (filtered.length === 1) return filtered[0]
    return { ambiguous: filtered.length, hits }
  }
  return hits[0] ?? null
}

console.log(`树条目总数: ${treeCount(tree)}`)
console.log(`池节点总数: ${Object.keys(pool).length}`)
console.log(`边总数: ${edges.length}`)
console.log('')

const problems = []

for (const group of GROUPS) {
  console.log(`\n═══════════ 分组 ${group} ═══════════`)
  for (const spec of SHELLS.filter((s) => s.group === group)) {
    const shell = resolveShell(spec)
    const node = pool[spec.shellNodeRef]
    const content = node ? shellContent(node) : ''
    const tb = edges.filter((e) => String(e.id).startsWith('treebind:')
      && (e.source === spec.shellNodeRef || e.target === spec.shellNodeRef))

    console.log(`\n[${spec.key}] 壳「${spec.shellTreeName ?? spec.shellTreeId}」`)
    if (!shell) problems.push(`${spec.key}: 找不到壳树条目`)
    else if (shell.ambiguous !== undefined) problems.push(`${spec.key}: 壳树条目定位歧义（${shell.ambiguous} 个候选，全部 ${shell.hits.length} 个）`)
    if (!node) problems.push(`${spec.key}: 池里找不到 ${spec.shellNodeRef}`)

    if (shell && shell.node) {
      const kids = shell.node.children ?? []
      console.log(`  树: id=${shell.node.id} name=「${shell.node.name}」 parent=「${shell.parent?.name ?? '(根)'}」(${shell.parent?.id ?? '-'}) nodeRef=${shell.node.nodeRef ?? '-'}`)
      console.log(`  孩子(${kids.length}): ${kids.map((c) => `「${c.name}」(${c.id}${c.nodeRef ? ' → ' + c.nodeRef : ''})`).join(' , ') || '(无)'}`)
      console.log(`  已有 supplement: ${shell.node.supplement ? JSON.stringify(shell.node.supplement.tabs.map((t) => t.id)) : '无'}`)
    }
    console.log(`  池节点: ${node ? `label=「${node.label}」 tags=${JSON.stringify(node.tags ?? [])}` : '缺失'}`)
    console.log(`  正文长度: ${content.length} 字`)
    console.log(`  treebind 边(${tb.length}): ${tb.map((e) => `${e.source}->${e.target}`).join(' , ') || '(无)'}`)

    const target = resolveTarget(spec)
    if (!target) {
      problems.push(`${spec.key}: 找不到目标树条目 ${JSON.stringify(spec.target)}`)
      console.log(`  目标: ✗ 未找到 ${JSON.stringify(spec.target)}`)
    } else {
      const tKids = target.node.children ?? []
      console.log(`  目标: 「${target.node.name}」(${target.node.id}) parent=「${target.parent?.name ?? '(根)'}」 children=${tKids.length} nodeRef=${target.node.nodeRef ?? '-'}`)
      console.log(`    目标已有 supplement: ${target.node.supplement ? JSON.stringify(target.node.supplement.tabs.map((t) => t.id)) : '无'}`)
      if (spec.tab && target.node.supplement?.tabs?.some((t) => t.id === spec.tab.id)) {
        problems.push(`${spec.key}: 目标已有同名 tab ${spec.tab.id}`)
      }
    }
  }
}

console.log('\n\n═══════════ 全局一致性检查 ═══════════')
// 池里有、树里没有的壳（应当都是壳）
for (const spec of SHELLS) {
  const refs = byRef.get(spec.shellNodeRef) ?? []
  if (refs.length !== 1) console.log(`  ${spec.key}: 树中 nodeRef=${spec.shellNodeRef} 命中 ${refs.length} 处 ${refs.map((r) => r.node.name).join(',')}`)
}
// 全树 nodeRef 引用计数（门一复扫用）
const allRefs = new Set()
walkTree(tree, (n) => { if (n.nodeRef) allRefs.add(n.nodeRef) })

const shellRefs = new Set(SHELLS.map((s) => s.shellNodeRef))
const questions = (await import('./lib.mjs')).readJson('questions.json')
let qHits = 0
for (const q of questions) {
  if (shellRefs.has(q.relatedNodeId)) { qHits += 1; console.log(`  question ${q.id} relatedNodeId=${q.relatedNodeId}`) }
  for (const st of q.answerSteps ?? []) {
    if (shellRefs.has(st.nodeId)) { qHits += 1; console.log(`  question ${q.id} step nodeId=${st.nodeId}`) }
  }
}
console.log(`  questions 命中: ${qHits}`)

let evHits = 0
const events = (await import('./lib.mjs')).readJson('evolution-events.json')
for (const ev of events) {
  for (const key of ['scopeRootId']) if (shellRefs.has(ev[key])) { evHits += 1; console.log(`  event ${ev.id} ${key}=${ev[key]}`) }
  for (const n of ev.sourceOnlyNodeIds ?? []) if (shellRefs.has(n)) { evHits += 1; console.log(`  event ${ev.id} sourceOnly=${n}`) }
  for (const n of ev.introducedNodes ?? []) if (shellRefs.has(n.nodeId)) { evHits += 1; console.log(`  event ${ev.id} introduced=${n.nodeId}`) }
  for (const c of ev.changes ?? []) if (shellRefs.has(c.targetNodeId)) { evHits += 1; console.log(`  event ${ev.id} change=${c.targetNodeId}`) }
}
console.log(`  evolution-events 命中: ${evHits}`)

let aliasHits = 0
for (const [id, n] of Object.entries(pool)) {
  for (const a of n.aliases ?? []) if (shellRefs.has(a)) { aliasHits += 1; console.log(`  alias ${id} -> ${a}`) }
}
console.log(`  池 aliases 命中: ${aliasHits}`)

console.log(`\n非 treebind 边 touching 壳: ${edges.filter((e) => !String(e.id).startsWith('treebind:') && (shellRefs.has(e.source) || shellRefs.has(e.target))).length}`)
for (const e of edges.filter((e) => !String(e.id).startsWith('treebind:') && (shellRefs.has(e.source) || shellRefs.has(e.target)))) {
  console.log(`    ${e.id}: ${e.source} -${e.type}-> ${e.target}`)
}

console.log(`\n\n═══════════ 问题清单 (${problems.length}) ═══════════`)
for (const p of problems) console.log('  ! ' + p)
