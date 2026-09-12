/**
 * 执行一条壳的融合：正文补挂 → 孩子上提 → 卸树条目 → 删树绑边 → 退池节点。
 *
 * 用法：
 *   node scripts/shell-fusion/apply.mjs B            # 干跑（只打印计划）
 *   node scripts/shell-fusion/apply.mjs B --apply    # 落盘（原子写）
 *   node scripts/shell-fusion/apply.mjs all --apply
 *
 * 铁律：壳的正文转为目标树条目的 supplement tab；壳的树条目与池节点退出。
 */
import {
  loadAll, saveAll, flatten, treeCount, shellContent, findTreeById, findTreeByName,
  addSupplementTab, detachChild, attachChild, dropTreebindEdgesForTreeIds,
  createTreeBindingEdge, upsertEdge,
} from './lib.mjs'
import { SHELLS, GROUPS } from './spec.mjs'

const argv = process.argv.slice(2)
const apply = argv.includes('--apply')
const groupArg = argv.find((a) => !a.startsWith('--')) ?? 'all'
const groups = groupArg === 'all' ? GROUPS : [groupArg.toUpperCase()]

const state = loadAll()
const { pool, tree, edges } = state

const journal = []

function note(key, line) {
  journal.push(`[${key}] ${line}`)
  console.log(`  ${line}`)
}

/** 定位壳的树条目 + 父节点；歧义即抛错，绝不猜。 */
function resolveShell(spec) {
  let hits
  if (spec.shellTreeId) {
    const node = findTreeById(tree, spec.shellTreeId)
    hits = node ? [node] : []
  } else {
    hits = findTreeByName(tree, spec.shellTreeName).map((h) => h.node)
  }
  if (spec.shellParentName) {
    const parentIds = new Set(
      findTreeByName(tree, spec.shellParentName).map((h) => h.node.id),
    )
    const filtered = hits.filter((node) => {
      const rec = flatten(tree).find((f) => f.node.id === node.id)
      return rec?.parent && parentIds.has(rec.parent.id)
    })
    if (filtered.length !== 1) {
      throw new Error(
        `${spec.key}: 壳定位歧义/失败：name=「${spec.shellTreeName}」parent=「${spec.shellParentName}」候选=${filtered.length}（同名总数 ${hits.length}）`,
      )
    }
    hits = filtered
  }
  if (hits.length !== 1) {
    throw new Error(`${spec.key}: 壳定位失败/歧义：候选 ${hits.length}（${hits.map((h) => h.id).join(',')}）`)
  }
  const node = hits[0]
  const rec = flatten(tree).find((f) => f.node.id === node.id)
  if (!rec?.parent) throw new Error(`${spec.key}: 壳 ${node.id} 没有父节点`)
  return { node, parent: rec.parent }
}

function resolveTarget(spec, shell, parent) {
  const t = spec.target
  if (t.kind === 'self') return shell
  if (t.kind === 'parent') return parent
  if (t.kind === 'treeId') {
    const node = findTreeById(tree, t.value)
    if (!node) throw new Error(`${spec.key}: 目标 treeId=${t.value} 不存在`)
    return node
  }
  if (t.kind === 'nodeRef') {
    const hits = flatten(tree).filter((f) => f.node.nodeRef === t.value)
    if (hits.length !== 1) throw new Error(`${spec.key}: 目标 nodeRef=${t.value} 命中 ${hits.length}`)
    return hits[0].node
  }
  const hits = findTreeByName(tree, t.value)
  if (hits.length !== 1) {
    throw new Error(`${spec.key}: 目标 name=「${t.value}」命中 ${hits.length}（${hits.map((h) => h.node.id).join(',')}）`)
  }
  return hits[0].node
}

function applyShell(spec) {
  console.log(`\n── ${spec.key} ──────────────────────────────`)
  const { node: shell, parent } = resolveShell(spec)
  const target = resolveTarget(spec, shell, parent)

  if (shell.nodeRef !== spec.shellNodeRef) {
    throw new Error(`${spec.key}: 壳 nodeRef 不符：树里 ${shell.nodeRef} vs 工单 ${spec.shellNodeRef}`)
  }
  const shellPool = pool[spec.shellNodeRef]
  if (!shellPool) throw new Error(`${spec.key}: 池里找不到 ${spec.shellNodeRef}`)

  note(spec.key, `壳「${shell.name}」(${shell.id}) @ 父「${parent.name}」(${parent.id})`)
  note(spec.key, `目标「${target.name}」(${target.id}) nodeRef=${target.nodeRef}`)

  if (spec.renameTargetTo) {
    if (target.name === spec.renameTargetTo) note(spec.key, `目标名已是「${spec.renameTargetTo}」，跳过改名`)
    else {
      note(spec.key, `改名：「${target.name}」→「${spec.renameTargetTo}」`)
      target.name = spec.renameTargetTo
    }
  }

  // A. 补挂正文
  if (spec.tab) {
    const content = shellContent(shellPool)
    if (content.length === 0) throw new Error(`${spec.key}: 壳正文为空，拒绝挂空 supplement`)
    const tags = shellPool.tags ?? []
    const r = addSupplementTab(target, { ...spec.tab, content, tags })
    note(spec.key, `supplement ${r}：${spec.tab.id}（${content.length} 字，${(shellPool.card.tabs ?? []).length} 个源 tab）`)
    if ((shellPool.card.tabs ?? []).length > 1) {
      note(spec.key, `⚠ 壳有多个内容 tab：${shellPool.card.tabs.map((t) => t.label).join(' / ')}`)
    }
  } else {
    note(spec.key, '正文不迁移（工单标注）')
  }

  // B. 孩子去向
  const kids = [...(shell.children ?? [])]
  if (spec.promote && kids.length > 0) {
    for (const kid of kids) {
      detachChild(shell, kid.id)
      attachChild(target, kid)
      note(spec.key, `孩子上提：「${kid.name}」(${kid.id}) → 「${target.name}」`)
    }
  } else if (kids.length > 0) {
    throw new Error(`${spec.key}: 壳有 ${kids.length} 个孩子但工单未给去向`)
  }

  // C. 卸树条目
  if (spec.keepTreeEntry) {
    note(spec.key, `树条目保留（工单特判，仅改名）：${shell.id}`)
  } else {
    detachChild(parent, shell.id)
    note(spec.key, `卸树条目：${shell.id}`)
  }

  // D. 删树绑边（按 treeId 精确匹配父/子分段）
  if (spec.keepTreeEntry) {
    note(spec.key, 'treebind 边保留（树条目未动）')
  } else {
    const removed = dropTreebindEdgesForTreeIds(edges, [shell.id])
    note(spec.key, `删 treebind 边 ${removed} 条`)
  }

  // 上提的孩子需要按新父重建 belongs-to 边
  let added = 0
  for (const kid of kids) {
    if (!kid.nodeRef) continue
    const edge = createTreeBindingEdge({
      tree, pool, parentTreeId: target.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef,
    })
    if (edge === null) {
      note(spec.key, `⚠ 孩子「${kid.name}」未建边（父/子 nodeRef 不在池中或同源）`)
      continue
    }
    if (upsertEdge(edges, edge)) { added += 1; note(spec.key, `建边 ${edge.id}`) }
    else note(spec.key, `边已存在，跳过 ${edge.id}`)
  }
  if (added > 0) note(spec.key, `共新建 ${added} 条 belongs-to 边`)

  // E. 退池节点
  if (spec.keepPool) {
    note(spec.key, `池节点保留（工单特判）：${spec.shellNodeRef}`)
  } else {
    delete pool[spec.shellNodeRef]
    note(spec.key, `退池：${spec.shellNodeRef}`)
  }
}

console.log(`模式：${apply ? '落盘' : '干跑'}；分组：${groups.join(',')}`)
console.log(`起始：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条`)

for (const group of groups) {
  console.log(`\n═══════════ 分组 ${group} ═══════════`)
  for (const spec of SHELLS.filter((s) => s.group === group)) applyShell(spec)
}

console.log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条`)

if (apply) {
  saveAll({ pool, tree, edges })
  console.log('已原子写入 data/{node-pool,tree-data,knowledge-edges}.json')
} else {
  console.log('（干跑，未写盘）')
}
