/** 只读：§三 特判项实测（#5 ORM 判定 / #53 九孩去向 / #50 挂载位）+ 候选绑定实体盘点。 */
import fs from 'node:fs'
import { loadState, flatten, shellContent, log } from './common.mjs'

const state = loadState()
const { pool, tree } = state
const flat = flatten(tree)
const findById = (id) => flat.find((f) => f.node.id === id)
const bodyOf = (ref) => (pool[ref] ? shellContent(pool[ref]) : '')

log('══ #5 面向对象与数据库（判 ORM / 面向对象）══')
{
  const ref = 'k_1784222473047_i8okyb'
  const b = bodyOf(ref)
  log(`正文 ${b.length} 字：`)
  log(b.slice(0, 700))
  const kw = ['ORM', '映射', '对象关系', '持久化', 'Hibernate', 'MyBatis', '表', '面向对象']
  log(`关键词命中：${kw.map((k) => `${k}×${(b.match(new RegExp(k, 'g')) ?? []).length}`).join(' ')}`)
  for (const cand of ['ORM', '对象关系映射', 'Hibernate', 'MyBatis']) {
    const hits = Object.values(pool).filter((n) => (n.label ?? '').includes(cand))
    log(`  池内「${cand}」候选：${hits.slice(0, 4).map((n) => `${n.id}「${n.label}」`).join(' ; ') || '无'}`)
  }
}

log('\n══ #53 与其他语言的比较（9 孩去向）══')
{
  const rec = findById('tree_wiki_en_java_performance_s14')
  log(`条目「${rec.node.name}」(${rec.node.id}) 父=「${rec.parent.name}」(${rec.parent.id})`)
  for (const k of rec.node.children ?? []) log(`  孩:「${k.name}」(${k.id}) ref=${k.nodeRef} 孩=${(k.children ?? []).length}`)
  log(`正文 ${bodyOf(rec.node.nodeRef).length} 字：${bodyOf(rec.node.nodeRef).slice(0, 300)}`)
  // 候选上提目标：Java 节点
  for (const cand of ['java', 'Java性能', 'Java 性能']) {
    const hits = flat.filter((f) => (f.node.name ?? '') === cand)
    for (const h of hits) log(`  上提候选「${cand}」→ (${h.node.id}) ref=${h.node.nodeRef} 父=「${h.parent?.name}」`)
  }
}

log('\n══ #50 语言评估与争议（挂载位）══')
{
  const rec = findById('tree_goexplain_eval')
  log(`条目「${rec.node.name}」(${rec.node.id}) 父=「${rec.parent.name}」(${rec.parent.id}) 孩=${(rec.node.children ?? []).length}`)
  log(`正文 ${bodyOf(rec.node.nodeRef).length} 字`)
}

log('\n══ #40 重写与重载 / #33 JVM调优 正文规模（判 §一/§二/§三 归属）══')
for (const ref of ['k_vault_javajavaoverrideoverload_18u2us', 'k_vault_javajvm04jvm_i15q6w']) {
  const n = pool[ref]
  const b = bodyOf(ref)
  const heads = b.split('\n').filter((l) => /^#{1,4}\s/.test(l.trim())).slice(0, 12).map((l) => l.trim())
  log(`「${n.label}」(${ref}) ${b.length} 字，小标题：${heads.join(' | ') || '(无)'}`)
}

log('\n══ 候选绑定实体盘点（30 条存活项的池内同名/近名实体）══')
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
const rows = []
for (const [no, name] of CAND) {
  const mounts = flat.filter((f) => (f.node.name ?? '').includes(name))
  if (mounts.length === 0) { rows.push(`| ${no} | ${name} | ✗ 树上未按名命中 |`); continue }
  const m = mounts[0]
  rows.push(`| ${no} | ${name} | \`${m.node.nodeRef}\` | ${m.node.id} | ${(m.node.children ?? []).length} | ${bodyOf(m.node.nodeRef).length} |`)
}
log('\n| # | 名称 | nodeRef | treeId | 孩 | 正文 |')
log('|---|---|---|---|---:|---:|')
for (const r of rows) log(r)

fs.writeFileSync('outputs/tree-violation-scan/section3-candidates.md', [
  '# §三 题库转移 · 存活候选清单（2026-09-13 实测）',
  '',
  '> 来源：A 组 136 行主表 − 工单 §一/§二/§四/§五 已认领编号 = 30 条仍存活项。',
  '> §三 工单声明 21 条；其余 9 条在工单中无任何节认领（见 reconcile.mjs 输出）。',
  '> 本表只列事实（nodeRef / 挂载 / 孩数 / 正文量），不含拟定的问题文本。',
  '',
  '| # | 名称 | nodeRef | treeId | 孩 | 正文 |',
  '|---|---|---|---|---:|---:|',
  ...rows,
  '',
  '## 实测特判',
  '- #5 正文为 ORM 映射叙述 → relatedNodeId 绑 ORM 而非泛「面向对象」（工单 ⚠️ 修正一条，已按正文判定）',
  '- #53 带 9 孩 → 孩子先上提到 Java 性能节点，正文再转问题卡（工单 ⚠️ 修正二条）',
  '- #50 实际挂在 go/ 下（工单写「动态程序分析/Java性能」树下，与实树不符），0 孩，直接转卡',
  '- kind 枚举实测无 `concept`：合法值为 definition/mechanism/comparison/application/troubleshooting/recall',
  '',
].join('\n'))
log('\n已写出 outputs/tree-violation-scan/section3-candidates.md')
