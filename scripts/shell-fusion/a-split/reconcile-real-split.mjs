/** 只读：真原子拆分目标核对（既有正身复用 / 父节点 / 子节点 / 正文）。 */
import { loadState, flatten, shellContent, log } from './common.mjs'

const state = loadState()
const { pool, tree } = state
const flat = flatten(tree)
const byRef = (ref) => flat.filter((f) => f.node.nodeRef === ref)
const labelHits = (l) => Object.values(pool).filter((n) => (n.label ?? '') === l)

log('══ 七个待真拆分节点 ══')
const ITEMS = [
  ['Session / Cookie', 'asplit_session_cookie'],
  ['Kafka 生产者 / 消费者', 'asplit_kafka_producer_consumer'],
  ['Kafka Topic / Partition', 'asplit_kafka_topic_partition'],
  ['数据库备份、恢复', 'container:chapter_db_15'],
  ['MySQL 备份、恢复', 'mysql:theme:backup-recovery'],
  ['面向对象：类、对象', 'k_1783184803301_75p0j1'],
  ['Java 类、对象', 'k_java_syntax_class_object'],
  ['认证 / 权限校验（同反模式，用户表未列）', 'asplit_conn_state_auth'],
]
for (const [label, ref] of ITEMS) {
  const ms = byRef(ref)
  if (ms.length !== 1) { log(`\n「${label}」${ref} ⚠ 挂载 ${ms.length}`); continue }
  const m = ms[0]
  log(`\n「${m.node.name}」(${m.node.id}) ref=${ref}`)
  log(`   正文 ${pool[ref] ? shellContent(pool[ref]).length : -1} 字 · 直接孩 ${(m.node.children ?? []).length} · 父=「${m.parent?.name}」ref=${m.parent?.nodeRef}`)
  for (const k of (m.node.children ?? []).slice(0, 12)) log(`     · 「${k.name}」ref=${k.nodeRef}`)
}

log('\n══ 拟新建的原子正身：池内是否已有同名（§0.4 应复用）══')
const NAMES = ['Session', 'Cookie', 'Kafka 生产者', 'Kafka 消费者', 'Kafka Topic', 'Kafka Partition',
  '数据库备份', '数据库恢复', 'MySQL 备份', 'MySQL 恢复', '认证', '权限校验']
for (const n of NAMES) {
  const hits = labelHits(n)
  log(`  「${n}」→ ${hits.length ? hits.map((h) => `${h.id}（挂载 ${byRef(h.id).length}）`).join(', ') : '池内无'}`)
}

log('\n══ #6/#7 正文归位的目标父节点 ══')
for (const [tag, parentName] of [['#6', '面向对象'], ['#7', 'Java']]) {
  for (const ref of ['k_1783184803301_75p0j1', 'k_java_syntax_class_object']) {
    const ms = byRef(ref)
    if (ms.length !== 1) continue
    if (ms[0].node.name.startsWith('#6标') ) continue
  }
}
{
  const m6 = byRef('k_1783184803301_75p0j1')[0]
  log(`  #6 父：「${m6.parent?.name}」 ref=${m6.parent?.nodeRef} 池=${!!pool[m6.parent?.nodeRef]} 正文 ${pool[m6.parent?.nodeRef] ? shellContent(pool[m6.parent.nodeRef]).length : -1} 字`)
  const m7 = byRef('k_java_syntax_class_object')[0]
  log(`  #7 父：「${m7.parent?.name}」 ref=${m7.parent?.nodeRef} 池=${!!pool[m7.parent?.nodeRef]} 正文 ${pool[m7.parent?.nodeRef] ? shellContent(pool[m7.parent.nodeRef]).length : -1} 字`)
  const javaHits = labelHits('Java')
  log(`  池内 label 恰为「Java」：${javaHits.map((h) => `${h.id}（挂载 ${byRef(h.id).length}）`).join(', ') || '无'}`)
}

log('\n══ 确认：这 8 个节点当前是否已在 A 类名单外（伪改名产物）══')
for (const [label, ref] of ITEMS) {
  const ms = byRef(ref)
  if (ms.length !== 1) continue
  const n = ms[0].node.name
  log(`  「${n}」含 与/和=${/[与和]/.test(n)} 含、=${/、/.test(n)} 含/=${/\//.test(n)}`)
}
