/**
 * shell-fusion 工单共享库：读写 data/*.json、树遍历、supplement 追加。
 * 所有写入一律原子（临时文件 + rename）。
 */
import fs from 'node:fs'
import path from 'node:path'

export const ROOT = process.cwd()
export const DATA = path.join(ROOT, 'data')

export function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'))
}

/** 原子写：临时文件 + rename（同目录，保证同卷）。 */
export function writeJsonAtomic(name, value) {
  const target = path.join(DATA, name)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, target)
}

export function loadAll() {
  return {
    pool: readJson('node-pool.json'),
    tree: readJson('tree-data.json'),
    edges: readJson('knowledge-edges.json'),
    questions: readJson('questions.json'),
  }
}

export function saveAll({ pool, tree, edges, questions }) {
  if (pool) writeJsonAtomic('node-pool.json', pool)
  if (tree) writeJsonAtomic('tree-data.json', tree)
  if (edges) writeJsonAtomic('knowledge-edges.json', edges)
  if (questions) writeJsonAtomic('questions.json', questions)
}

/** 深度优先遍历树，回调 (node, parent, index, trail)。 */
export function walkTree(root, visit, parent = null, index = 0, trail = []) {
  visit(root, parent, index, trail)
  const kids = root.children ?? []
  for (let i = 0; i < kids.length; i += 1) {
    walkTree(kids[i], visit, root, i, [...trail, root])
  }
}

export function flatten(root) {
  const out = []
  walkTree(root, (node, parent) => out.push({ node, parent }))
  return out
}

export function findTreeById(root, id) {
  let hit = null
  walkTree(root, (node) => { if (node.id === id) hit = node })
  return hit
}

export function findTreeByNodeRef(root, nodeRef) {
  const hits = []
  walkTree(root, (node, parent) => { if (node.nodeRef === nodeRef) hits.push({ node, parent }) })
  return hits
}

export function findTreeByName(root, name) {
  const hits = []
  walkTree(root, (node, parent) => { if (node.name === name) hits.push({ node, parent }) })
  return hits
}

export function treeCount(root) {
  return flatten(root).length
}

/** 壳节点 card 全文：rootContent 在前，各 tab content 依次在后，\n\n 分隔。 */
export function shellContent(node) {
  const parts = []
  const root = (node?.card?.rootContent ?? '').trim()
  if (root.length > 0) parts.push(root)
  for (const tab of node?.card?.tabs ?? []) {
    const c = (tab?.content ?? '').trim()
    if (c.length > 0) parts.push(c)
  }
  return parts.join('\n\n')
}

/**
 * 给树条目追加一个 supplement tab。
 * 已存在同 id 时按 overwrite 决定覆盖还是报错；默认报错（防互相覆盖）。
 */
export function addSupplementTab(treeEntry, { id, label, content, tags }, { overwrite = false } = {}) {
  if (!treeEntry.supplement) treeEntry.supplement = { tabs: [] }
  if (!Array.isArray(treeEntry.supplement.tabs)) treeEntry.supplement.tabs = []
  const existing = treeEntry.supplement.tabs.findIndex((t) => t.id === id)
  const tab = { id, label, content, ...(tags && tags.length > 0 ? { tags } : {}) }
  if (existing >= 0) {
    if (!overwrite) throw new Error(`supplement tab 已存在（拒绝覆盖）: ${id}`)
    treeEntry.supplement.tabs[existing] = tab
    return 'replaced'
  }
  treeEntry.supplement.tabs.push(tab)
  return 'added'
}

/** 从父节点摘除一个子条目，返回被摘除的条目。 */
export function detachChild(parent, childId) {
  const kids = parent.children ?? []
  const idx = kids.findIndex((c) => c.id === childId)
  if (idx < 0) throw new Error(`children 中找不到 ${childId}`)
  return kids.splice(idx, 1)[0]
}

/** 把条目挂到目标父节点下（默认插到末尾）。 */
export function attachChild(parent, child, { index = -1 } = {}) {
  if (!Array.isArray(parent.children)) parent.children = []
  if (index < 0 || index >= parent.children.length) parent.children.push(child)
  else parent.children.splice(index, 0, child)
}

/** 删除所有 touching 到给定 nodeRef 的 treebind 边，返回删除条数。 */
export function dropTreebindEdges(edges, nodeRefs) {
  const set = new Set(nodeRefs)
  const before = edges.length
  const kept = edges.filter((e) => {
    const isBind = String(e.id).startsWith('treebind:')
    if (!isBind) return true
    return !(set.has(e.source) || set.has(e.target))
  })
  edges.length = 0
  edges.push(...kept)
  return before - edges.length
}

/** 删除 id 里以给定 treeId 作为父或子分段的 treebind 边。 */
export function dropTreebindEdgesForTreeIds(edges, treeIds) {
  const set = new Set(treeIds)
  const before = edges.length
  const kept = edges.filter((e) => {
    const id = String(e.id)
    if (!id.startsWith('treebind:')) return true
    const [parentTreeId, childTreeId] = id.slice('treebind:'.length).split(':')
    return !(set.has(parentTreeId) || set.has(childTreeId))
  })
  edges.length = 0
  edges.push(...kept)
  return before - edges.length
}

/**
 * 复刻 src/knowledge/treeBinding.ts 的 createTreeBindingEdge：
 * 父/子任一 nodeRef 不在池中，或父子同一 nodeRef，则返回 null（不建边）。
 */
export function createTreeBindingEdge({ tree, pool, parentTreeId, childTreeId, childKnowledgeId }) {
  const parentKnowledgeId = findTreeById(tree, parentTreeId)?.nodeRef
  if (!parentKnowledgeId) return null
  if (parentKnowledgeId === childKnowledgeId) return null
  if (!pool[parentKnowledgeId] || !pool[childKnowledgeId]) return null
  const dims = new Set([
    ...(pool[parentKnowledgeId]?.dimensions ?? []),
    ...(pool[childKnowledgeId]?.dimensions ?? []),
  ])
  return {
    id: `treebind:${parentTreeId}:${childTreeId}`,
    source: parentKnowledgeId,
    target: childKnowledgeId,
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
    dimensions: dims.size > 0 ? [...dims] : [],
  }
}

/** 幂等追加边：同 id 已存在则跳过。 */
export function upsertEdge(edges, edge) {
  if (edge === null) return false
  if (edges.some((e) => e.id === edge.id)) return false
  edges.push(edge)
  return true
}

export function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/')
}

export function log(...args) {
  console.log(...args)
}
