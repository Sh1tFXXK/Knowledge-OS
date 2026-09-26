/**
 * final-87 重构战役共享原语（batch1 / batch2 共用）。
 *
 * ⚠️ 口径三条（踩过坑，务必遵守）：
 *  1. **「卸树」≠「删节点」**：机制状态卸树后必须留在池中，否则 mechanismSpec 渲染崩。
 *  2. **supplement 挂在树条目上**（池节点 0 例 / 树条目 87 例），不是节点 card。
 *     渲染读的是 `TemporalIndexWorkspace.tsx:222` 的 `activePathContext?.supplement?.tabs`
 *     —— 即**当前选中的树条目**。同一池节点被多处挂载时，supplement 只对挂了的那处生效。
 *  3. **改名要同步补 tags**：池内 3538/3786 节点遵循「tags 含自身 label」惯例（搜索依赖它）。
 */
import {
  flatten, shellContent, addSupplementTab, detachChild, attachChild,
  dropTreebindEdgesForTreeIds, createTreeBindingEdge, upsertEdge,
} from './lib.mjs'
import { gateScan } from './a-split/common.mjs'

export function makeCore(state) {
  const { pool, tree, edges } = state
  const journal = []
  const errors = []
  const warnings = []
  const note = (s) => journal.push(s)
  const flatSnapshot = flatten(tree)
  // ⚠️ 必须是**实时视图**：卸树会改 tree.children，若沿用一次性快照，
  // 已卸条目会残留在快照里 → 改名同名检查会误报「冲突」。
  const liveFlat = () => flatten(tree)
  const entryOf = (id) => liveFlat().find((f) => f.node.id === id)
  const childrenNames = (id) => (entryOf(id)?.node.children ?? []).map((c) => c.name)

  const textOf = (ref) => {
    const n = pool[ref]
    return n ? shellContent(n) : ''
  }

  /** 卸载树条目 + 删除指向它的 treebind 边。返回被卸下的条目。 */
  function unloadTree(treeId, why) {
    const hit = entryOf(treeId)
    if (!hit) { errors.push(`卸载失败：树里找不到 ${treeId}`); return null }
    const parent = hit.parent ?? tree
    const removed = detachChild(parent, treeId)
    const dropped = dropTreebindEdgesForTreeIds(edges, [treeId])
    note(`卸树「${removed.name}」(${treeId}) — ${why} · 删 treebind 边 ${dropped} 条`)
    return removed
  }

  /** 把 shellTreeId 的孩子们提级到 targetTreeId，并重建 treebind 边。 */
  function promoteChildren(shellTreeId, targetTreeId, why) {
    const shellHit = entryOf(shellTreeId)
    const targetHit = entryOf(targetTreeId)
    if (!shellHit || !targetHit) { errors.push(`提级失败：${shellTreeId} → ${targetTreeId} 有一端不存在`); return 0 }
    const oldParent = shellHit.parent ?? tree
    const oldIndex = (oldParent.children ?? []).findIndex((c) => c.id === shellTreeId)
    const kids = [...(shellHit.node.children ?? [])]
    const sameParent = oldParent === targetHit.node
    detachChild(oldParent, shellTreeId)
    dropTreebindEdgesForTreeIds(edges, [shellTreeId])
    let n = 0
    kids.forEach((kid, i) => {
      attachChild(targetHit.node, kid, { index: sameParent ? oldIndex + i : -1 })
      dropTreebindEdgesForTreeIds(edges, [kid.id])
      const e = createTreeBindingEdge({ tree, pool, parentTreeId: targetTreeId, childTreeId: kid.id, childKnowledgeId: kid.nodeRef })
      if (e && upsertEdge(edges, e)) n += 1
      else if (!e) warnings.push(`提级后未建 treebind 边：${kid.id}「${kid.name}」（父子同源或端点不在池）`)
    })
    note(`提级 ${kids.length} 个子节点：${shellTreeId} → ${targetTreeId} — ${why} · 新建 treebind 边 ${n} 条`)
    return kids.length
  }

  /** 把正文镜像进宿主树条目的 supplement。 */
  function mirrorSupplement(hostTreeId, { id, label, content, tags }) {
    const hit = entryOf(hostTreeId)
    if (!hit) { errors.push(`镜像失败：宿主树条目 ${hostTreeId} 不存在`); return 0 }
    const text = String(content ?? '').trim()
    if (!text) { warnings.push(`镜像跳过（源正文为空）：${id}`); return 0 }
    const r = addSupplementTab(hit.node, { id, label, content: text, tags })
    note(`supplement 追加到「${hit.node.name}」(${hostTreeId})：${r} ${id} · ${text.length} 字`)
    return text.length
  }

  /**
   * 就地改名：树 name + 池 label + 池 tags 补新名。
   * @param {boolean} strict 是否要求全树该名零占用（默认 true）
   */
  function renameInPlace(treeId, newName, why, { strict = true } = {}) {
    const hit = entryOf(treeId)
    if (!hit) { errors.push(`改名失败：${treeId} 不存在`); return false }
    const dup = liveFlat().filter((f) => f.node.name === newName)
    if (strict && dup.length > 0) {
      errors.push(`改名「${hit.node.name}」→「${newName}」会与 ${dup.length} 处同名冲突：${dup.map((d) => d.node.id).join(', ')}`)
      return false
    }
    const old = hit.node.name
    hit.node.name = newName
    const pn = pool[hit.node.nodeRef]
    if (pn) {
      pn.label = newName
      const tags = Array.isArray(pn.tags) ? pn.tags : []
      if (!tags.includes(newName)) { tags.push(newName); pn.tags = tags }
    }
    note(`改名「${old}」→「${newName}」(${treeId}) — ${why}`)
    return true
  }

  function addTag(ref, tag) {
    const n = pool[ref]
    if (!n) { errors.push(`打标签失败：池节点 ${ref} 不存在`); return }
    if (!Array.isArray(n.tags)) n.tags = []
    if (n.tags.includes(tag)) return
    n.tags.push(tag)
    note(`打 tag「${tag}」→ ${ref}`)
  }

  function removeTag(ref, tag) {
    const n = pool[ref]
    if (!n || !Array.isArray(n.tags)) return
    const i = n.tags.indexOf(tag)
    if (i < 0) return
    n.tags.splice(i, 1)
    note(`删 tag「${tag}」← ${ref}`)
  }

  /**
   * 退休：门一零活引用（排除正在卸载的树条目）通过才允许标记。
   * @param {boolean} soft true = 门一命中时只记警告并跳过（batch1 的既有口径）；
   *                       false = 记错误并阻止落盘（更严，batch2 默认）。
   */
  function retire(ref, canonicalRef, { excludeTreeIds = [], why, soft = false } = {}) {
    const n = pool[ref]
    if (!n) { errors.push(`退休失败：池节点 ${ref} 不存在`); return false }
    const { hits } = gateScan(state, [ref], { excludeTreeIds })
    if (hits.length > 0) {
      const msg = `${soft ? '退休跳过（门一有活引用' : '门一拦截：'}${ref} 仍有 ${hits.length} 处活引用 → ${hits.slice(0, 4).join(' | ')}`
      if (soft) warnings.push(msg)
      else errors.push(msg)
      return false
    }
    n.status = 'archived-redirect'
    n.redirectTo = canonicalRef
    n.canonicalNodeId = canonicalRef
    note(`退休 ${ref}「${n.label}」→ 正身 ${canonicalRef} — ${why}`)
    return true
  }

  /** 写入池节点顶层 mechanismSpec（不是 card.mechanismSpec）。 */
  function setMechanismSpec(ref, spec, why) {
    const n = pool[ref]
    if (!n) { errors.push(`机制 spec 写入失败：池节点 ${ref} 不存在`); return false }
    const REP = ['phenomenonNodeId', 'triggerNodeIds', 'participantNodeIds', 'stateNodeIds', 'transitionEdgeIds', 'constraintEdgeIds', 'outcomeNodeIds', 'failureNodeIds']
    for (const f of REP) {
      if (!(f in spec)) { errors.push(`机制 spec 缺字段 ${f}（宿主 ${ref}）`); return false }
    }
    // 全部引用必须可解析，否则机制视图崩
    const missing = []
    for (const f of ['phenomenonNodeId', 'triggerNodeIds', 'participantNodeIds', 'stateNodeIds', 'outcomeNodeIds', 'failureNodeIds']) {
      for (const x of Array.isArray(spec[f]) ? spec[f] : (spec[f] ? [spec[f]] : [])) if (!pool[x]) missing.push(`${f}→${x}`)
    }
    for (const f of ['transitionEdgeIds', 'constraintEdgeIds']) {
      for (const e of spec[f]) if (!edges.some((x) => x.id === e)) missing.push(`${f}→${e}`)
    }
    if (missing.length) { errors.push(`机制 spec 引用不可解析（宿主 ${ref}）：${missing.join(', ')}`); return false }
    n.mechanismSpec = spec
    note(`写 mechanismSpec：宿主 ${ref}（${spec.stateNodeIds.length} state / ${spec.transitionEdgeIds.length} 转移边）— ${why}`)
    return true
  }

  /** 追加机制内部边（不参与目录树边白名单，属机制专用命名空间）。 */
  function addInternalEdge(edge, why) {
    if (edges.some((e) => e.id === edge.id)) { warnings.push(`机制内部边已存在，跳过：${edge.id}`); return false }
    upsertEdge(edges, edge)
    note(`新增机制内部边 ${edge.id}：${edge.source} --[${edge.type}]--> ${edge.target} — ${why}`)
    return true
  }

  /**
   * 常见组合：正文镜像 → 卸树 → 退休。
   * ⚠️ `promoteTo` 与 `unloadTree` 二者**只能走一条**：`promoteChildren` 内部已 `detachChild(壳)`，
   *    再调 `unloadTree` 会「树里找不到」而报错（batch2 dry-run 实测踩到）。
   */
  function mergeAndRetire({ treeId, ref, hostTreeId, canonicalRef, tabId, tabLabel, why, tags, promoteTo, keepInPool = false }) {
    if (promoteTo) {
      promoteChildren(treeId, promoteTo, `${why}：孩子提级到 ${promoteTo}`)
    } else {
      unloadTree(treeId, why)
    }
    if (hostTreeId) mirrorSupplement(hostTreeId, { id: tabId, label: tabLabel, content: textOf(ref), tags })
    if (!keepInPool) retire(ref, canonicalRef, { excludeTreeIds: [treeId], why })
  }

  /** 把指定子节点从 srcTreeId 重挂到 dstTreeId（不卸 src 本身），并重建 treebind 边。 */
  function reparentChildren(srcTreeId, dstTreeId, childIds, why) {
    const src = entryOf(srcTreeId)
    const dst = entryOf(dstTreeId)
    if (!src || !dst) { errors.push(`重挂失败：${srcTreeId} → ${dstTreeId} 有一端不存在`); return 0 }
    let n = 0
    for (const cid of childIds) {
      const kid = (src.node.children ?? []).find((c) => c.id === cid)
      if (!kid) { errors.push(`重挂失败：${srcTreeId} 下找不到子条目 ${cid}`); continue }
      detachChild(src.node, cid)
      dropTreebindEdgesForTreeIds(edges, [cid])
      attachChild(dst.node, kid, { index: -1 })
      const e = createTreeBindingEdge({ tree, pool, parentTreeId: dstTreeId, childTreeId: cid, childKnowledgeId: kid.nodeRef })
      if (e && upsertEdge(edges, e)) n += 1
      else if (!e) warnings.push(`重挂后未建 treebind 边：${cid}「${kid.name}」（父子同源或端点不在池）`)
    }
    note(`重挂 ${childIds.length} 个子节点：${srcTreeId} → ${dstTreeId} — ${why} · 新建 treebind 边 ${n} 条`)
    return n
  }

  return {
    flat: flatSnapshot, entryOf, liveFlat, childrenNames, textOf,
    journal, errors, warnings, note,
    unloadTree, promoteChildren, reparentChildren, mirrorSupplement, renameInPlace,
    addTag, removeTag, retire, setMechanismSpec, addInternalEdge, mergeAndRetire,
  }
}
