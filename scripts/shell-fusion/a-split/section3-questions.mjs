/**
 * A-split §三：转移至问题库 + answerSteps（用户正表 21 行 → 可执行 20 行）。
 *
 * 用户处置口径（2026-09-13 正表）：转提问 → **卸树，保留池**（relatedNodeId/answerSteps 指向自身，
 * 池节点必须留存，否则引用悬空）。#40 特判：复用既有卡 + 关联更新，不建新卡。
 *
 * ⚠️ #131「一致性与 CAP 实践」未执行：该行已由 §四 处置完毕（正文并入 CAP 原理，池节点已退），
 *    实数据 池✗/挂载 0，无法再「转提问」。需用户裁决是否跳过（见 reconcile-s3.mjs）。
 *
 * 用户未指定 difficulty，本脚本按语义赋值（可在 TABLE 内逐行改）：
 *   区别/对比 → comparison · 如何做/适用 → application · 为何/失效 → troubleshooting
 *   是什么/有哪些 → definition · 如何保证/原理 → mechanism
 *
 * 用法：
 *   node scripts/shell-fusion/a-split/section3-questions.mjs           # 干跑
 *   node scripts/shell-fusion/a-split/section3-questions.mjs --apply   # 落盘
 */
import fs from 'node:fs'
import {
  loadState, flatten, shellContent, statLine, log,
} from './common.mjs'
import {
  saveAll, detachChild, attachChild,
  dropTreebindEdgesForTreeIds, createTreeBindingEdge, upsertEdge, treeCount,
} from '../lib.mjs'

const VALID_KIND = new Set(['definition', 'mechanism', 'comparison', 'application', 'troubleshooting', 'recall'])
const VALID_DIFFICULTY = new Set(['basic', 'intermediate', 'advanced'])

/** 用户正表：编号 → 问题文本（逐字照抄）· kind · difficulty。 */
const TABLE = [
  { no: 4, text: '责任驱动设计与数据驱动设计有何区别与适用场景？', kind: 'comparison', difficulty: 'intermediate' },
  { no: 5, text: '面向对象范式与关系型数据库之间如何进行映射与适配？', kind: 'comparison', difficulty: 'intermediate' },
  { no: 24, text: 'AQS 队列同步器提供了哪些核心接口？如何使用模板方法实现自定义同步器？', kind: 'definition', difficulty: 'intermediate' },
  { no: 25, text: 'ReentrantReadWriteLock 读写锁提供了哪些核心接口？具体如何使用？', kind: 'definition', difficulty: 'intermediate' },
  { no: 28, text: 'Condition 接口及其 await/signal 机制如何使用？与 Object wait/notify 有何区别？', kind: 'comparison', difficulty: 'intermediate' },
  { no: 50, text: 'Go 语言在设计上有哪些核心评估与主要争议点？', kind: 'recall', difficulty: 'intermediate' },
  { no: 53, text: 'Java 与其他主流编程语言在性能与执行效率上有何比较？', kind: 'comparison', difficulty: 'intermediate' },
  { no: 54, text: '编译器（Compiler）与解释器（Interpreter）在执行原理上有何比较？', kind: 'comparison', difficulty: 'basic' },
  { no: 76, text: 'Kafka 如何保证消息顺序与高吞吐？其典型适用场景是什么？', kind: 'mechanism', difficulty: 'intermediate' },
  { no: 79, text: '在分布式消息中间件选型中，RabbitMQ 与 Kafka 应该如何对比与选择？', kind: 'comparison', difficulty: 'intermediate' },
  { no: 80, text: 'Spring Cloud 的核心定位是什么？它解决了分布式系统中的哪些问题？', kind: 'definition', difficulty: 'basic' },
  { no: 85, text: 'Spring Cloud 生态包含哪些核心组件？如何进行技术选型？', kind: 'definition', difficulty: 'intermediate' },
  { no: 86, text: '什么是系统性能？QPS 计算公式及其影响因素有哪些？', kind: 'definition', difficulty: 'basic' },
  { no: 98, text: 'UUID 主键与自增 ID 主键在 B+树索引结构和性能上有何对比？', kind: 'comparison', difficulty: 'advanced' },
  { no: 100, text: '在慢 SQL 排查与数据库优化中，如何进行表拆分与分库优化？', kind: 'application', difficulty: 'intermediate' },
  { no: 101, text: '如何针对高并发场景下的热点数据进行缓存设计与慢 SQL 优化？', kind: 'application', difficulty: 'intermediate' },
  { no: 102, text: '深度分页 LIMIT 查询如何利用 ID 与主表 inner join 进行性能优化？', kind: 'application', difficulty: 'advanced' },
  { no: 103, text: 'MySQL 索引在哪些常见场景下会导致失效？其适用边界是什么？', kind: 'troubleshooting', difficulty: 'intermediate' },
  { no: 133, text: 'MySQL 主从复制为什么会产生延迟？常见解决方案有哪些？', kind: 'troubleshooting', difficulty: 'intermediate' },
]

/** #40 特判：复用既有卡（用户口径「复用已有卡/关联更新，卸树」）。 */
const REUSE_CARD_40 = 'q_1786345017473_ms61bg'
const NODE_40 = 'k_vault_javajavaoverrideoverload_18u2us'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges, questions } = state
const flat = () => flatten(tree)
const byId = (id) => flat().find((f) => f.node.id === id)

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
const createdCards = []
const addedEdges = []

function unloadTreeEntry(id, tag) {
  const rec = byId(id)
  if (!rec) throw new Error(`${tag}: 树条目 ${id} 不存在`)
  detachChild(rec.parent, id)
  unloadedTreeIds.add(id)
  const removed = dropTreebindEdgesForTreeIds(edges, [id])
  log(`  卸树条目「${rec.node.name}」(${id})，删 treebind ${removed} 条（池节点按用户口径保留）`)
}

function promoteKids(rec, tag) {
  const kids = [...(rec.node.children ?? [])]
  if (kids.length === 0) return
  for (const kid of kids) {
    detachChild(rec.node, kid.id)
    attachChild(rec.parent, kid)
    log(`  提级：「${kid.name}」→「${rec.parent.name}」`)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: rec.parent.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef })
    if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
  }
  log(`  ${tag} 提级 ${kids.length} 孩 →「${rec.parent.name}」`)
}

log('═══ A-split §三 题库转移（卸树 · 保留池）═══')
log(`起始 ${statLine(state)}`)

const now = Date.now()
for (const item of TABLE) {
  const tag = `#${item.no}`
  const aRow = aRowOf(item.no)
  if (!aRow) throw new Error(`${tag}: 不在 A 组主表`)
  if (!VALID_KIND.has(item.kind)) throw new Error(`${tag}: kind「${item.kind}」不在枚举`)
  if (!VALID_DIFFICULTY.has(item.difficulty)) throw new Error(`${tag}: difficulty 不在枚举`)
  if (questions.some((q) => q.id === `q_asplit_${item.no}`)) throw new Error(`${tag}: 卡已存在`)

  const rec = flat().filter((f) => f.node.nodeRef === aRow.ref)
  if (rec.length !== 1) throw new Error(`${tag}: nodeRef ${aRow.ref} 命中 ${rec.length} 个树条目（需唯一）`)
  const r = rec[0]
  const body = shellContent(pool[aRow.ref]) ?? ''
  log(`\n── ${tag}「${r.node.name}」`)

  questions.push({
    id: `q_asplit_${item.no}`,
    text: item.text,
    answered: true,
    kind: item.kind,
    difficulty: item.difficulty,
    answer: body,
    relatedNodeId: aRow.ref,
    answerSteps: [{ nodeId: aRow.ref }],
    createdAt: now,
    updatedAt: now,
  })
  createdCards.push(`q_asplit_${item.no}`)
  log(`  建卡：${item.kind}/${item.difficulty} · 绑定 ${aRow.ref} · 1 步 · 答案 ${body.length} 字`)

  promoteKids(r, tag)
  unloadTreeEntry(r.node.id, tag)
}

// ── #40 特判：复用既有卡 + 关联更新 ─────────────────────────────────────
log('\n── #40 特判：复用既有卡（不建新卡）──')
{
  const card = questions.find((q) => q.id === REUSE_CARD_40)
  if (!card) throw new Error(`#40: 既有卡 ${REUSE_CARD_40} 不存在`)
  const recs = flat().filter((f) => f.node.nodeRef === NODE_40)
  if (recs.length !== 1) throw new Error(`#40: ${NODE_40} 命中 ${recs.length} 个树条目`)
  const r = recs[0]
  log(`  既有卡 ${card.id}：「${String(card.text).slice(0, 60)}」`)
  log(`  关联更新：relatedNodeId ${card.relatedNodeId ?? '-'} → ${NODE_40}`)
  card.relatedNodeId = NODE_40
  card.answerSteps = [{ nodeId: NODE_40 }]
  card.updatedAt = now
  log(`  answerSteps 置为 [${NODE_40}]`)
  promoteKids(r, '#40')
  unloadTreeEntry(r.node.id, '#40')
}

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条 / 题 ${questions.length} 张`)
log(`建卡 ${createdCards.length} 张 · 卸树 ${unloadedTreeIds.size} 条 · 退池 0 个（保留池口径）· 新建边 ${addedEdges.length} 条`)

if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
