/**
 * 只读：为 §三 的 30 条存活候选，在既有题库里找同题/近题卡。
 * 若有既有卡，则 §三 可「绑定既有卡 + 退树」而不必新拟问法。
 */
import { loadState, flatten, log } from './common.mjs'

const state = loadState()
const { pool, tree, questions } = state
const flat = flatten(tree)

const CAND = [
  [4, '责任驱动设计与数据驱动设计'], [5, '面向对象与数据库'], [24, '队列同步器的接口与示例'],
  [25, '读写锁的接口与示例'], [28, 'Condition接口与示例'], [33, 'JVM 参数与调优'],
  [40, '重写（Override）与重载（Overload）'], [50, '语言评估与争议'], [53, '与其他语言的比较'],
  [54, '与口译员的比较'], [56, '注释和参考文献'], [57, 'Unix 和类 Unix'],
  [76, 'Kafka 顺序、吞吐与适用场景'], [79, 'RabbitMQ 与 Kafka 选型'], [80, 'Spring Cloud 定位与系统问题'],
  [85, 'Spring Cloud 生态与技术选型'], [86, '性能的定义与 QPS 公式'], [98, 'uuid 和自增 id 的索引结构对比'],
  [100, '表拆分与分库优化'], [101, '热点数据与缓存优化'], [102, '优化3：ID 与主表 inner join'],
  [103, '索引失效与适用边界'], [113, '校验和 / checksum'], [120, '交互与通信'],
  [122, '知识表示与推理'], [123, '自动化规划与调度'], [124, '复杂度与算法分析'],
  [125, '算法与数据结构'], [133, '主从延迟与解决方案'], [135, '微服务架构与网络调用'],
]

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, '').replace(/[（）()【】\[\]，,。.、:：;；?？!！"'`*#\-_/|]/g, '')
const KEY_STOP = new Set(['的', '与', '和', '及', '个', '是', '什么', '区别', '对比', '比较', '关系', '原理', '介绍', '优化', '如何', '怎么', '有哪些'])

/** 按 2-gram 重叠率找近题。 */
const grams = (s) => {
  const t = norm(s)
  const out = new Set()
  for (let i = 0; i + 1 < t.length; i += 1) out.add(t.slice(i, i + 2))
  return out
}
const jac = (a, b) => {
  const A = grams(a); const B = grams(b)
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const g of A) if (B.has(g)) inter += 1
  return inter / (A.size + B.size - inter)
}

log(`题库 ${questions.length} 张；候选 ${CAND.length} 条\n`)
let strong = 0
const report = []
for (const [no, name] of CAND) {
  const scored = questions
    .map((q) => ({ q, s: jac(name, q.text) }))
    .filter((x) => x.s >= 0.34)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
  if (scored.length === 0) { report.push(`#${no} ${name} → 无近题（最高 <0.34）`); continue }
  strong += 1
  report.push(`#${no} ${name}`)
  for (const { q, s } of scored) {
    report.push(`    ${(s * 100).toFixed(0)}%  ${q.id}  kind=${q.kind ?? '-'}  related=${q.relatedNodeId ?? '-'}`)
    report.push(`         「${String(q.text).slice(0, 70)}」`)
  }
}
log(report.join('\n'))
log(`\n有近题（≥0.34）的候选：${strong}/${CAND.length}`)

// 全库 mention 粗查：名字里的关键实体同时出现在同一张卡
log('\n── 关键实体共现粗查（可能已存在同义卡）──')
const PAIRS = [['RabbitMQ', 'Kafka'], ['uuid', '自增'], ['主从延迟', '延迟'], ['微服务', '网络调用'], ['复杂度', '算法分析'], ['知识表示', '推理'], ['自动化规划', '调度'], ['校验和', 'checksum'], ['索引失效', '失效'], ['热点数据', '缓存']]
for (const [a, b] of PAIRS) {
  const hits = questions.filter((q) => { const t = String(q.text); return t.includes(a) && t.includes(b) })
  log(`  「${a}」+「${b}」同卡：${hits.length} 张 ${hits.slice(0, 3).map((q) => `${q.id}「${String(q.text).slice(0, 40)}」`).join(' ; ')}`)
}
