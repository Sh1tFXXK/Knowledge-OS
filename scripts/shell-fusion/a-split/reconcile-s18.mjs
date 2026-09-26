/**
 * 只读对账：18 条终审裁决 vs 实数据。
 * 重点：① 拟新增/改名的名字是否含「与/和」（会新触 A 类定罪）② 拆分正身是否池内已有可复用
 *       ③ 各节点的直接子节点清单（提级/分流需要）④ 正文规模
 */
import { loadState, flatten, shellContent, log } from './common.mjs'

const state = loadState()
const { pool, tree } = state
const flat = flatten(tree)
const byRef = (ref) => flat.filter((f) => f.node.nodeRef === ref)
const byId = (id) => flat.find((f) => f.node.id === id)
const body = (ref) => (pool[ref] ? shellContent(pool[ref]).length : -1)
const labelExists = (l) => Object.values(pool).filter((n) => (n.label ?? '') === l)

const A = [
  [1, 'k_1783260209305_4t111y'], [2, 'k_1784367220387_2v9vdv'], [3, 'k_1783184803301_75p0j1'],
  [4, 'container:chapter_db_15'], [5, 'k_wiki_en_database_s24'], [6, 'mysql:theme:backup-recovery'],
  [7, 'k_java_syntax_class_object'], [8, 'concept_release_model'], [9, 'qproc_thread_state'],
  [10, 'k_1786343607773_qq5y28'], [11, 'k_1784367853474_o8r7o6'], [12, 'concept_range_insert_lock'],
  [13, 'k_vault_javajavaweb03requestresponse_1s68kh'], [14, 'k_vault_javajavaweb04sessioncookie_ihdd8v'],
  [15, 'k_vault_javakafka03producerconsumer_y4d5ch'], [16, 'k_vault_javakafka02topicpartitionbroker_1ae46h'],
  [17, 'mysql_lock_range_insert'], [18, 'k_wiki_en_outline_of_databases_s8_b2'],
]

const hasConn = (s) => /与|和/.test(s)

log('══ 一、18 条现状 + 直接子节点 ══')
for (const [no, ref] of A) {
  const ms = byRef(ref)
  if (ms.length !== 1) { log(`#${no} ${ref} ⚠ 挂载 ${ms.length} 处（需唯一）`); if (ms.length === 0) continue }
  const m = ms[0]
  const kids = m.node.children ?? []
  log(`#${String(no).padStart(2)}「${m.node.name}」${hasConn(m.node.name) ? ' [名含与/和]' : ''}`)
  log(`     ref=${ref} 正文 ${body(ref)} 字 · 直接孩 ${kids.length} · 全子树 ${(() => { let n = 0; const w = (x) => { for (const y of x.children ?? []) { n++; w(y) } }; w(m.node); return n })()}`)
  if (kids.length > 0 && kids.length <= 12) {
    for (const k of kids) log(`       · 「${k.name}」(${k.id}) ref=${k.nodeRef}`)
  } else if (kids.length > 12) {
    log(`       （${kids.length} 个直接孩，前 6：${kids.slice(0, 6).map((k) => k.name).join(' / ')} …）`)
  }
}

log('\n══ 二、拆分目标正身：池内是否已有可复用（§0.4 优先级：已有正身直接复用）══')
const TARGETS = [
  ['#11', ['内存原子性', '并发互斥锁', '原子性', '原子操作', '互斥锁']],
  ['#12', ['范围锁', '插入锁', '插入意向锁', '间隙锁', '范围锁与插入锁']],
  ['#13', ['HTTP Request/Response', 'Web 属性作用域', 'HTTP 请求', '作用域', 'Request/Response']],
  ['#14', ['Session / Cookie', 'Session 与 Cookie', 'Session', 'Cookie', 'Web 状态管理', '状态管理', '会话管理']],
  ['#15', ['Kafka 生产者 / 消费者', 'Kafka 生产者与消费者', 'Kafka 生产者和消费者', 'Kafka 消费组', '消费组', '生产者', '消费者']],
  ['#16', ['Kafka Topic / Partition', 'Kafka Topic与Partition', 'Kafka Topic', 'Topic', 'Partition', 'Kafka Broker', 'Broker']],
  ['#17', ['MySQL 范围锁', 'MySQL 插入意向锁', '插入意向锁']],
]
for (const [tag, names] of TARGETS) {
  log(`${tag}:`)
  for (const n of names) {
    const hits = labelExists(n)
    log(`   「${n}」${hasConn(n) ? ' ⚠含与/和(会新触A类)' : ''} → 池内同名 ${hits.length} 个${hits.length ? '：' + hits.map((h) => h.id).join(',') : ''}`)
  }
}

log('\n══ 三、终审拟用的改名/新建名：含连接词自检 ══')
const PROPOSED = [
  ['#2 改名', '进程与线程管理'], ['#3 改名', '面向对象：类与对象'], ['#4 改名', '数据库备份与恢复'],
  ['#6 改名', 'MySQL 备份与恢复'], ['#7 改名', 'Java 类与对象'],
  ['#14 正身1', 'Session 与 Cookie'], ['#15 正身1', 'Kafka 生产者与消费者'], ['#16 正身1', 'Kafka Topic与Partition'],
  ['#13 正身1', 'HTTP Request/Response'], ['#13 正身2', 'Web 属性作用域'],
  ['#11 正身1', '内存原子性'], ['#11 正身2', '并发互斥锁'],
  ['#12 正身1', '范围锁'], ['#12 正身2', '插入锁'],
  ['#14 正身2', 'Web 状态管理'], ['#15 正身2', 'Kafka 消费组'], ['#16 正身2', 'Kafka Broker'],
]
const dirty = []
for (const [tag, n] of PROPOSED) {
  const bad = hasConn(n)
  if (bad) dirty.push(`${tag}「${n}」`)
  log(`  ${bad ? '⚠ 会新触 A 类' : '✔ 干净    '} ${tag}「${n}」`)
}
log(`\n拟用名中含「与/和」的 ${dirty.length} 个：${dirty.join(' · ')}`)

log('\n══ 四、含斜杠/括号的名字（白名单正则必须转义 \\/ ）══')
for (const [no, ref] of A) {
  const m = byRef(ref)[0]
  if (!m) continue
  if (/[/()（）]/.test(m.node.name)) log(`  #${no}「${m.node.name}」→ 需转义：${m.node.name.replace(/\//g, '\\/')}`)
}
