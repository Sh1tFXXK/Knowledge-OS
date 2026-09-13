/**
 * A-split §三：转移至问题库 + answerSteps（21 条）。
 *
 * ⚠️ 待用户表：工单要求「问题文本、绑定实体照抄用户表」，该表不在仓库。
 *    把 21 行填进下方 TABLE 即可执行；编号沿用 A 组主表编号（1..136）。
 *
 * 实测定型（2026-09-13，见 probe-section3.mjs / section3-candidates.md）：
 *   · kind 枚举实为 definition | mechanism | comparison | application | troubleshooting | recall
 *     ——工单写的 "concept" 不在枚举内，非对比型请填 definition（或 recall）。
 *   · difficulty 必须填（basic | intermediate | advanced）。
 *   · answerSteps 元素形如 { nodeId, note? }；nodeId 必须是池内真实节点。
 *   · #5 正文实测为「对象-关系阻抗不匹配 + ORM」叙述 → relatedNodeId 应绑 ORM
 *     候选：k_wiki_en_outline_of_databases_s8_b2「对象关系映射（ORM、O/RM 和 O/R 映射）」/ k_dict_8pgpfp1c「ORM」
 *     （用 override 字段显式指定，勿绑泛「面向对象」）。
 *   · #53 带 9 孩（程序速度/多核性能/启动时间/内存使用/三角函数/JNI/用户界面/高性能计算/编程竞赛），
 *     父为「Java性能」(tree_wiki_en_java_performance) → 孩子上提到该父节点，再转问题卡。
 *   · #50 实测挂在 go/ 下（工单写「动态程序分析/Java性能」与实树不符），0 孩，直接转卡。
 *
 * 用法：
 *   node scripts/shell-fusion/a-split/section3-questions.mjs           # 干跑
 *   node scripts/shell-fusion/a-split/section3-questions.mjs --apply   # 落盘
 */
import fs from 'node:fs'
import {
  loadState, flatten, shellContent, gateScan, statLine, log,
} from './common.mjs'
import {
  saveAll, detachChild, attachChild,
  dropTreebindEdgesForTreeIds, createTreeBindingEdge, upsertEdge, treeCount,
} from '../lib.mjs'

// ─────────────────────────────────────────────────────────────────────────
// 待填表（21 行）。字段：
//   no            A 组主表编号（必填，用于定位树条目与正文）
//   text          用户表的问题文本（必填，照抄）
//   relatedNodeId 绑定正身（必填，池内 id）
//   kind          comparison | definition | recall | mechanism | application | troubleshooting
//   difficulty    basic | intermediate | advanced
//   steps         answerSteps 实体数组，如 ['asplit_hot_data','asplit_cold_data']（≥1，池内 id）
//   notes         与 steps 一一对应的 note（可选）
//   promoteTo     #53 专用：孩子上提目标 treeId（默认 tree_wiki_en_java_performance）
// ─────────────────────────────────────────────────────────────────────────
const TABLE = [
  // { no: 5, text: '', relatedNodeId: 'k_wiki_en_outline_of_databases_s8_b2', kind: 'comparison', difficulty: 'intermediate', steps: [], notes: [] },
]

const VALID_KIND = new Set(['definition', 'mechanism', 'comparison', 'application', 'troubleshooting', 'recall'])
const VALID_DIFFICULTY = new Set(['basic', 'intermediate', 'advanced'])

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges, questions } = state
const flat = () => flatten(tree)
const byId = (id) => flat().find((f) => f.node.id === id)

// A 组主表：编号 → nodeRef（从主表解析，保证编号语义唯一）
const aRows = []
{
  const amd = fs.readFileSync('outputs/tree-violation-scan/all-outstanding.md', 'utf8').split('\n')
  const aStart = amd.findIndex((l) => l.startsWith('## A ·'))
  const re = new RegExp('^\\|\\s*(\\d+)\\s*\\|\\s*(.+?)\\s*\\|\\s*`(.+?)`\\s*\\|')
  for (let i = aStart + 1; i < amd.length; i += 1) {
    const l = amd[i]
    if (l.startsWith('## ')) break
    const m = l.match(re)
    if (m) aRows.push({ no: +m[1], name: m[2], ref: m[3] })
  }
}
const aRowOf = (no) => aRows.find((r) => r.no === no)

const unloadedTreeIds = new Set()
const droppedPoolRefs = new Set()
const createdCards = []
const addedEdges = []

function unloadTreeEntry(id, tag) {
  const rec = byId(id)
  if (!rec) throw new Error(`${tag}: 树条目 ${id} 不存在`)
  detachChild(rec.parent, id)
  unloadedTreeIds.add(id)
  const removed = dropTreebindEdgesForTreeIds(edges, [id])
  log(`  卸树条目「${rec.node.name}」(${id})，删 treebind ${removed} 条`)
}

function promoteKids(rec, targetTreeId, tag) {
  const kids = [...(rec.node.children ?? [])]
  if (kids.length === 0) { log(`  （无孩子）`); return }
  const target = byId(targetTreeId) ?? rec.parent
  for (const kid of kids) {
    detachChild(rec.node, kid.id)
    attachChild(target.node, kid)
    log(`  提级：「${kid.name}」→「${target.node.name}」`)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: target.node.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef })
    if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
  }
  log(`  ${tag} 提级 ${kids.length} 孩 → 「${target.node.name}」`)
}

function gateAndDrop(nodeRef, tag) {
  const scan = gateScan(state, [nodeRef], { excludeTreeIds: [...unloadedTreeIds] })
  if (scan.hits.length > 0) {
    log(`  ✗ ${tag} 门禁命中：`)
    for (const h of scan.hits) log('    ! ' + h)
    process.exit(1)
  }
  if (pool[nodeRef]) { delete pool[nodeRef]; droppedPoolRefs.add(nodeRef); log(`  退池：${nodeRef}`) }
}

log('═══ A-split §三 题库转移 + answerSteps ═══')
log(`起始 ${statLine(state)}`)

if (TABLE.length === 0) {
  log('\n⚠️ TABLE 为空：等待用户表（问题文本 + 绑定实体）。未对数据做任何改动。')
  log('   就绪材料：')
  log('     · outputs/tree-violation-scan/section3-candidates.md — 30 条存活候选（nodeRef/treeId/孩/正文）')
  log('     · scripts/shell-fusion/a-split/reconcile.mjs — §一/§二/§四/§五 编号对账')
  log('   schema 实测：kind ∈ definition|mechanism|comparison|application|troubleshooting|recall（无 concept）')
  log('   #5 → 绑 ORM；#53 → 9 孩上提 tree_wiki_en_java_performance；#50 → 挂在 go/ 下，直接转卡')
  process.exit(0)
}

const now = Date.now()
for (const item of TABLE) {
  const tag = `#${item.no}`
  const aRow = aRowOf(item.no)
  if (!aRow) throw new Error(`${tag}: 不在 A 组主表`)
  if (!item.text?.trim()) throw new Error(`${tag}: text 为空`)
  if (!VALID_KIND.has(item.kind)) throw new Error(`${tag}: kind「${item.kind}」不在枚举`)
  if (!VALID_DIFFICULTY.has(item.difficulty)) throw new Error(`${tag}: difficulty「${item.difficulty}」不在枚举`)
  if (!pool[item.relatedNodeId]) throw new Error(`${tag}: relatedNodeId ${item.relatedNodeId} 不在池`)
  if (!Array.isArray(item.steps) || item.steps.length === 0) throw new Error(`${tag}: answerSteps 至少 1 个实体`)
  for (const s of item.steps) if (!pool[s]) throw new Error(`${tag}: answerSteps 实体 ${s} 不在池`)
  if (questions.some((q) => q.id === `q_asplit_${item.no}`)) throw new Error(`${tag}: 卡 q_asplit_${item.no} 已存在`)

  const cardId = `q_asplit_${item.no}`
  log(`\n── ${tag}「${aRow.name}」→ ${cardId}`)
  const mounts = flat().filter((f) => f.node.nodeRef === aRow.ref)
  if (mounts.length !== 1) throw new Error(`${tag}: nodeRef ${aRow.ref} 命中 ${mounts.length} 个树条目（需唯一）`)
  const rec = mounts[0]
  const body = shellContent(pool[aRow.ref]) ?? ''

  questions.push({
    id: cardId,
    text: item.text,
    answered: true,
    kind: item.kind,
    difficulty: item.difficulty,
    answer: body,
    relatedNodeId: item.relatedNodeId,
    answerSteps: item.steps.map((nodeId, i) => (item.notes?.[i] ? { nodeId, note: item.notes[i] } : { nodeId })),
    createdAt: now,
    updatedAt: now,
  })
  createdCards.push(cardId)
  log(`  建卡：${item.kind}/${item.difficulty} · 绑定 ${item.relatedNodeId} · ${item.steps.length} 步 · 答案 ${body.length} 字`)

  if (item.promoteTo || item.no === 53) promoteKids(rec, item.promoteTo ?? 'tree_wiki_en_java_performance', tag)
  else if ((rec.node.children ?? []).length > 0) promoteKids(rec, undefined, tag)

  unloadTreeEntry(rec.node.id, tag)
  gateAndDrop(aRow.ref, tag)
}

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条 / 题 ${questions.length} 张`)
log(`建卡 ${createdCards.length} 张 · 卸树 ${unloadedTreeIds.size} 条 · 退池 ${droppedPoolRefs.size} 个 · 新建边 ${addedEdges.length} 条`)

if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
