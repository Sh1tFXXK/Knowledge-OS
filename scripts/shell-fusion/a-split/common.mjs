/**
 * A-split 工单（2026-09-13，136 条「与/和/及」捆绑节点拆解）共享工具。
 * 复用 shell-fusion/lib.mjs 的原子写与树遍历；本目录脚本按节编号，一节一脚本。
 */
import {
  loadAll, flatten, shellContent, dropTreebindEdgesForTreeIds, rel,
} from '../lib.mjs'
import fs from 'node:fs'
import path from 'node:path'

export { loadAll, flatten, shellContent }

/**
 * 门一复扫（泛化版）：对任意一组 nodeRef 做六处活引用检查。
 * 期望参数 expectInPool：这些 ref 应该在池里（即将退池/已退池复核）。
 * 返回 { hits, inPool }；调用方决定是否抛错。
 */
export function gateScan(state, refs, { excludeTreeIds = [] } = {}) {
  const { pool, tree, edges, questions, events } = state
  const set = new Set(refs)
  const exclude = new Set(excludeTreeIds)
  const hits = []

  // 1+2. questions
  for (const q of questions) {
    if (set.has(q.relatedNodeId)) hits.push(`questions.relatedNodeId: ${q.id} → ${q.relatedNodeId}`)
    for (const [i, st] of (q.answerSteps ?? []).entries()) {
      if (st && set.has(st.nodeId)) hits.push(`questions.answerSteps[${i}].nodeId: ${q.id} → ${st.nodeId}`)
    }
  }
  // 3. evolution-events
  for (const ev of events) {
    if (set.has(ev.scopeRootId)) hits.push(`evolution.scopeRootId: ${ev.id}`)
    for (const n of ev.sourceOnlyNodeIds ?? []) if (set.has(n)) hits.push(`evolution.sourceOnlyNodeIds: ${ev.id}`)
    for (const n of ev.introducedNodes ?? []) if (n && set.has(n.nodeId)) hits.push(`evolution.introducedNodes: ${ev.id}`)
    for (const c of ev.changes ?? []) if (c && set.has(c.targetNodeId)) hits.push(`evolution.changes: ${ev.id}`)
  }
  // 4. 全树 nodeRef（可排除自己的树条目——正被卸载的那些）
  for (const f of flatten(tree)) {
    if (exclude.has(f.node.id)) continue
    if (set.has(f.node.nodeRef)) hits.push(`tree.nodeRef: ${f.node.id}「${f.node.name}」`)
  }
  // 5. edges 两端（treebind 之外）
  for (const e of edges) {
    if (String(e.id).startsWith('treebind:')) continue
    if (set.has(e.source)) hits.push(`edges.source: ${e.id}`)
    if (set.has(e.target)) hits.push(`edges.target: ${e.id}`)
  }
  // 6. 池内 aliases + 其它节点对 ref 的引用
  for (const [id, n] of Object.entries(pool)) {
    for (const a of n.aliases ?? []) if (set.has(a)) hits.push(`pool.aliases: ${id}`)
    for (const t of n.card?.tabs ?? []) if (t?.nodeRef && set.has(t.nodeRef)) hits.push(`pool.card.tabs.nodeRef: ${id}`)
  }
  const inPool = refs.filter((r) => pool[r] !== undefined)
  return { hits, inPool }
}

/** dump 状态摘要行。 */
export function statLine(state) {
  const { pool, tree, edges, questions } = state
  return `树 ${flatten(tree).length} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条 / 题 ${questions.length} 张`
}

/** loadAll + evolution-events（门禁第 3 处需要）。 */
export function loadState() {
  const state = loadAll()
  state.events = JSON.parse(fs.readFileSync(path.join('data', 'evolution-events.json'), 'utf8'))
  return state
}
export const BACKUP_DIR = path.join('data', 'backups', 'a-split-2026-09-13')

/** 简单日志。 */
export function log(...args) {
  console.log(...args)
}

/** 原子写（转发 lib.mjs 同名函数，保持调用点统一）。 */
export { fs, path, rel }
