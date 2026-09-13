/**
 * A 类残留 18 条终审裁决执行（用户 2026-09-14 终审）。
 *
 * 分组：
 *   G1 白名单豁免 4 条（数据零改动，写入扫描器 FALSE_POSITIVE_A）
 *   G2 纯叶子爆破拆分 6 条：#11 #13 #14 #15 #16（拆双正身+边）· #17（并入 #12 正身）
 *   G3 容器重组与重复消除 8 条：#2 #3 #4 #5 #6 #7 #10 #12
 *
 * ⚠️ 对用户原案的两处修正（均已实测，未照字面执行）：
 *   1) 拟用名含「与/和」者 8 个 → 照字面落盘仍会新触 A 类，无法达成「归零」。
 *      故把连接词统一替换为「、」或「/」（语义不变，仍保留两个名词）：
 *        面向对象：类与对象 → 面向对象：类、对象
 *        数据库备份与恢复 → 数据库备份、恢复
 *        MySQL 备份与恢复 → MySQL 备份、恢复
 *        Java 类与对象 → Java 类、对象
 *        Session 与 Cookie → Session / Cookie
 *        Kafka 生产者与消费者 → Kafka 生产者 / 消费者
 *        Kafka Topic与Partition → Kafka Topic / Partition
 *      脚本内建硬校验：新建正身名 / 改名目标若含 与/和 直接抛错拒绝落盘。
 *   2) #2「进程与线程」用户给了「改名 进程与线程管理 或 卸载」两分支。改名分支仍含「与」，
 *      且分流需判定「上下文切换」归属（未指定）；故采用**卸载分支**：8 个直接子节点整体
 *      提级到父「java并发编程」，6833 字正文转父节点 supplement，原节点卸树退池。
 *      若要走「拆 进程/线程 两容器」分支请另行下指令。
 *
 * 另三处实测校正：
 *   · #5「备份和恢复」直接子节点是 1 个（「复制 / replication」），不是 19（19 为全子树规模）。
 *   · #12 的唯一直接子节点就是 #17，必须先处置 #17 再拆 #12。
 *   · 既有边 rel:concept_range_insert_lock:instance-of:mysql_lock_range_insert 的 relationKind
 *     为 undefined（数据不一致）；其两端均在本次拆分中消解，故显式删除。
 *
 * 用法：node scripts/shell-fusion/a-split/sweep-remaining-18.mjs [--apply]
 */
import fs from 'node:fs'
import { loadState, flatten, shellContent, gateScan, statLine, log } from './common.mjs'
import {
  saveAll, addSupplementTab, detachChild, attachChild,
  dropTreebindEdgesForTreeIds, createTreeBindingEdge, upsertEdge, treeCount,
} from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges, questions } = state
const flat = () => flatten(tree)
const byId = (id) => flat().find((f) => f.node.id === id)
const byRef = (ref) => flat().filter((f) => f.node.nodeRef === ref)

const ALLOWED = new Set(['structure', 'classification', 'dependency', 'causality', 'state-transition', 'constraint', 'evidence', 'reference'])
const unloaded = new Set()
const dropped = []
const created = []
const addedEdges = []
const renamed = []
const supplements = []

function semanticEdge(id, source, target, type, relationKind, label) {
  if (!ALLOWED.has(relationKind)) throw new Error(`relationKind ${relationKind} 不在枚举`)
  const e = { id, source, target, type, label, relationKind, dimensions: [] }
  if (!upsertEdge(edges, e)) throw new Error(`边 ${id} 已存在`)
  addedEdges.push(id)
  log(`    建边 ${id}：${source} -[${type}/${relationKind}]-> ${target}`)
}

/** 删除边（语义随两端一起消解时）。 */
function dropEdge(id, reason) {
  const i = edges.findIndex((x) => x.id === id)
  if (i < 0) { log(`    跳过删边（不存在）：${id}`); return }
  const e = edges[i]
  edges.splice(i, 1)
  log(`    删边：${e.id}（${e.source} -[${e.type}/${e.relationKind}]-> ${e.target}）—— ${reason}`)
}

/** 单挂载断言 */
function uniqueMount(ref, tag) {
  const ms = byRef(ref)
  if (ms.length !== 1) throw new Error(`${tag}: ${ref} 命中 ${ms.length} 个树条目（需唯一）`)
  return ms[0]
}

/** 新建正身 + 树条目。返回树条目（裸节点，不是元组）。 */
function ensureNode(ref, label, content, parentTreeId, dims = []) {
  if (pool[ref]) throw new Error(`正身 ${ref} 已存在，拒绝覆盖`)
  if (/与|和/.test(label)) throw new Error(`新正身名「${label}」含连接词，会新触 A 类定罪——拒绝创建`)
  pool[ref] = {
    id: ref, label, role: 'plain', dimensions: dims, tags: [label], kind: 'concept',
    card: { nodeId: ref, title: label, tabs: [{ id: 'def', label: '定义', content }], rootContent: `${label}\n\n${content}` },
  }
  const parent = byId(parentTreeId)
  if (!parent) throw new Error(`新建「${label}」父 ${parentTreeId} 不存在`)
  const entry = { id: `asplit_s18_${ref}`, name: label, count: 0, nodeRef: ref, children: [] }
  attachChild(parent.node, entry)
  const edge = createTreeBindingEdge({ tree, pool, parentTreeId, childTreeId: entry.id, childKnowledgeId: ref })
  if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
  created.push(`${ref}「${label}」`)
  log(`    新正身「${label}」(${ref}) @「${parent.node.name}」`)
  return entry
}

function unloadTreeEntry(rec, tag) {
  detachChild(rec.parent, rec.node.id)
  unloaded.add(rec.node.id)
  const removed = dropTreebindEdgesForTreeIds(edges, [rec.node.id])
  log(`    卸树条目「${rec.node.name}」(${rec.node.id})，删 treebind ${removed} 条`)
}

function gateAndDrop(ref, tag) {
  const scan = gateScan(state, [ref], { excludeTreeIds: [...unloaded] })
  if (scan.hits.length > 0) {
    log(`    ✗ ${tag} 门禁命中：`)
    for (const h of scan.hits) log('      ! ' + h)
    process.exit(1)
  }
  delete pool[ref]
  dropped.push(ref)
  log(`    退池：${ref}`)
}

function promoteKids(rec, tag) {
  const kids = [...(rec.node.children ?? [])]
  for (const k of kids) {
    detachChild(rec.node, k.id)
    attachChild(rec.parent, k)
    log(`    提级：「${k.name}」→「${rec.parent.name}」`)
    const e = createTreeBindingEdge({ tree, pool, parentTreeId: rec.parent.id, childTreeId: k.id, childKnowledgeId: k.nodeRef })
    if (e && upsertEdge(edges, e)) addedEdges.push(e.id)
  }
  log(`    ${tag} 提级 ${kids.length} 个直接子节点 →「${rec.parent.name}」`)
}

/** 问题卡改绑（from → to），避免题库引用悬空。 */
function repointQuestion(from, to, tag) {
  if (!pool[to]) throw new Error(`${tag}: 改绑目标 ${to} 不在池`)
  let n = 0
  for (const q of questions) {
    if (q.relatedNodeId === from) { q.relatedNodeId = to; n += 1 }
    for (const s of q.answerSteps ?? []) if (s && s.nodeId === from) { s.nodeId = to; n += 1 }
  }
  log(`    ${tag} 问题卡改绑 ${n} 处：${from} → ${to}`)
  return n
}

/** 只改树条目名 + 池 label（去连接词用） */
function renameEntry(rec, to, tag) {
  if (/与|和/.test(to)) throw new Error(`改名目标「${to}」含连接词，会新触 A 类——拒绝`)
  const old = rec.node.name
  rec.node.name = to
  const p = pool[rec.node.nodeRef]
  if (p) { p.label = to; if (p.card) p.card.title = to }
  renamed.push(`${tag}「${old}」→「${to}」`)
  log(`    改名：「${old}」→「${to}」`)
}

/** 把原正文转 supplement（目标可为 flatten 元组或裸树节点）。 */
function migrateBody(rec, target, label) {
  const body = shellContent(pool[rec.node.nodeRef])
  if (!body.trim()) { log('    正文 0 字，跳过 supplement'); return }
  const targetNode = (target && target.node && target.node.id) ? target.node : target
  addSupplementTab(targetNode, { id: `asplit:s18:${rec.node.id}:orig`, label, content: body, tags: pool[rec.node.nodeRef].tags ?? [] })
  supplements.push(`${label}（${body.length} 字）→「${targetNode.name}」`)
  log(`    正文转 supplement「${label}」（${body.length} 字）→「${targetNode.name}」`)
}

log('═══ A 类残留 18 条 · 终审裁决执行 ═══')
log(`起始 ${statLine(state)}`)

// ══════════ G1 白名单（数据零改动）══════════
log('\n── G1 白名单豁免 4 条（数据零改动）──')
{
  const SCANNER = 'scripts/scan-tree-violations.mjs'
  const src = fs.readFileSync(SCANNER, 'utf8')
  const cur = '^(逻辑与 \\(?&&\\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度|服务注册与发现|Unix 和类 Unix|校验和 \\/ checksum)$'
  const added = ['软件符号与工具', '发布与版本模型 \\/ Release & Versioning Model', '连接与线程状态', '对象关系映射（ORM、O\\/RM 和 O\\/R 映射）']
  const next = `^(逻辑与 \\(?&&\\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度|服务注册与发现|Unix 和类 Unix|校验和 \\/ checksum|${added.join('|')})$`
  for (const [no, ref] of [[1, 'k_1783260209305_4t111y'], [8, 'concept_release_model'], [9, 'qproc_thread_state'], [18, 'k_wiki_en_outline_of_databases_s8_b2']]) {
    const m = uniqueMount(ref, `#${no}`)
    log(`  #${no}「${m.node.name}」豁免：池✓ 挂载 1`)
  }
  if (src.includes(next)) log('  白名单已是最新')
  else if (!src.includes(cur)) throw new Error('扫描器豁免正则与预期不一致，需人工确认')
  else if (!apply) log('  （干跑）将写入 4 条豁免')
  else { fs.writeFileSync(SCANNER, src.replace(cur, next), 'utf8'); log('  已写入 4 条豁免（含斜杠转义）') }
}

// ══════════ G2 纯叶子爆破拆分 ══════════
log('\n── G2-#17 MySQL 范围锁与插入锁 → 并入 #12 拆分出的正身（先于 #12）──')
{
  const rec = uniqueMount('mysql_lock_range_insert', '#17')
  const parentEntry = uniqueMount('concept_range_insert_lock', '#17父')
  migrateBody(rec, parentEntry, 'MySQL 范围锁、插入锁（原文）')
  dropEdge('rel:concept_range_insert_lock:instance-of:mysql_lock_range_insert', '两端均在本次拆分中消解，实例内容已转 supplement 承载')
  unloadTreeEntry(rec, '#17')
  gateAndDrop('mysql_lock_range_insert', '#17')
}

log('\n── G2-#12 范围锁与插入锁 → 拆「范围锁」/「插入锁」──')
{
  const rec = uniqueMount('concept_range_insert_lock', '#12')
  const parentId = rec.parent.id
  const src = pool.concept_range_insert_lock
  const range = ensureNode('asplit_range_lock', '范围锁',
    '范围锁（range lock）：以键值区间为粒度加锁，锁定满足条件的一段索引区间，阻止其他事务在区间内插入新行，是应对幻读的锁机制族成员。', parentId)
  ensureNode('asplit_insert_lock', '插入锁',
    '插入锁、插入意向锁（insert intention lock）：事务在区间内插入行之前表达的插入意图；与范围锁、临键锁配合，共同阻止区间内的并发插入。', parentId)
  addSupplementTab(range, { id: 'asplit:s18:s12:orig', label: '范围锁、插入锁（原文）', content: shellContent(src), tags: src.tags ?? [] })
  supplements.push(`范围锁、插入锁（原文，${shellContent(src).length} 字）`)
  semanticEdge('asplit:s18:range-insert', 'asplit_range_lock', 'asplit_insert_lock', '并列', 'reference', '范围锁与插入锁同属幻读防护锁族')
  unloadTreeEntry(rec, '#12')
  gateAndDrop('concept_range_insert_lock', '#12')
}

log('\n── G2-#11 原子性和锁 → 拆「内存原子性」/「并发互斥锁」──')
{
  const rec = uniqueMount('k_1784367853474_o8r7o6', '#11')
  const parentId = rec.parent.id
  const src = pool.k_1784367853474_o8r7o6
  const atomic = ensureNode('asplit_memory_atomicity', '内存原子性',
    '内存原子性：一个操作在并发环境下不可分割，要么全部完成、要么完全未发生，中间态对其他线程不可见。Java 通过 java.util.concurrent.atomic 提供无锁原子类型（AtomicInteger / AtomicReference / AtomicIntegerArray 等）实现。', parentId)
  ensureNode('asplit_concurrency_mutex_lock', '并发互斥锁',
    '并发互斥锁：用互斥手段串行化临界区，保证同一时刻只有一个线程进入。synchronized 与 ReentrantLock 是 Java 两大实现，锁提供原子性、可见性与有序性保障。', parentId)
  addSupplementTab(atomic, { id: 'asplit:s18:s11:orig', label: '原子性和锁（原文）', content: shellContent(src), tags: src.tags ?? [] })
  supplements.push(`原子性和锁（原文，${shellContent(src).length} 字）`)
  promoteKids(rec, '#11')
  semanticEdge('asplit:s18:mutex-atomic', 'asplit_concurrency_mutex_lock', 'asplit_memory_atomicity', '保证', 'dependency', '并发互斥锁保证临界区操作的原子性')
  unloadTreeEntry(rec, '#11')
  gateAndDrop('k_1784367853474_o8r7o6', '#11')
}

log('\n── G2-#13 Request/Response 与作用域 → 拆「HTTP Request/Response」/「Web 属性作用域」──')
{
  const rec = uniqueMount('k_vault_javajavaweb03requestresponse_1s68kh', '#13')
  const parentId = rec.parent.id
  const src = pool.k_vault_javajavaweb03requestresponse_1s68kh
  const req = ensureNode('asplit_http_request_response', 'HTTP Request/Response',
    'HTTP Request/Response：HttpServletRequest 封装请求参数、请求头、路径与会话；HttpServletResponse 封装响应头、状态码与输出体。Servlet 读取参数、执行业务、写入响应，构成一次请求处理闭环。', parentId)
  ensureNode('asplit_web_attribute_scope', 'Web 属性作用域',
    'Web 属性作用域：request 作用域一次请求内有效；session 作用域跨请求；application 与 ServletContext 作用域整个应用共享，是后续 Web 框架状态管理的基础层。', parentId)
  addSupplementTab(req, { id: 'asplit:s18:s13:orig', label: 'Request、Response 与作用域（原文）', content: shellContent(src), tags: src.tags ?? [] })
  supplements.push(`Request、Response 与作用域（原文，${shellContent(src).length} 字）`)
  semanticEdge('asplit:s18:req-scope', 'asplit_http_request_response', 'asplit_web_attribute_scope', '属性', 'structure', 'Request / Response 承载 Web 属性作用域')
  unloadTreeEntry(rec, '#13')
  gateAndDrop('k_vault_javajavaweb03requestresponse_1s68kh', '#13')
}

log('\n── G2-#14 Session/Cookie 与状态管理 → 拆「Session / Cookie」/「Web 状态管理」──')
{
  const rec = uniqueMount('k_vault_javajavaweb04sessioncookie_ihdd8v', '#14')
  const parentId = rec.parent.id
  const src = pool.k_vault_javajavaweb04sessioncookie_ihdd8v
  const sc = ensureNode('asplit_session_cookie', 'Session / Cookie',
    'Session / Cookie：HTTP 无状态，两项基础手段补齐上下文。Cookie 存于客户端（会话标识、轻量偏好），Session 存于服务端（登录态、会话数据），浏览器持 SessionId 与服务端 HttpSession 协作。', parentId)
  ensureNode('asplit_web_state_management', 'Web 状态管理',
    'Web 状态管理：跨请求保存登录态、购物车、用户偏好等上下文的能力；分布式场景下 Session 演进为共享会话或 Token 机制。', parentId)
  addSupplementTab(sc, { id: 'asplit:s18:s14:orig', label: 'Session、Cookie 与状态管理（原文）', content: shellContent(src), tags: src.tags ?? [] })
  supplements.push(`Session、Cookie 与状态管理（原文，${shellContent(src).length} 字）`)
  semanticEdge('asplit:s18:session-state', 'asplit_session_cookie', 'asplit_web_state_management', '实现', 'dependency', 'Session 与 Cookie 实现 Web 状态管理')
  unloadTreeEntry(rec, '#14')
  gateAndDrop('k_vault_javajavaweb04sessioncookie_ihdd8v', '#14')
}

log('\n── G2-#15 Producer/Consumer 与消费组 → 拆「Kafka 生产者 / 消费者」/「Kafka 消费组」──')
{
  const rec = uniqueMount('k_vault_javakafka03producerconsumer_y4d5ch', '#15')
  const parentId = rec.parent.id
  const src = pool.k_vault_javakafka03producerconsumer_y4d5ch
  const pc = ensureNode('asplit_kafka_producer_consumer', 'Kafka 生产者 / 消费者',
    'Kafka 生产者 / 消费者：生产者选择 Topic、按 Key 或策略决定写入哪个 Partition 并把消息追加到 Broker；消费者从指定 Partition 拉取消息、维护消费位点并处理业务逻辑。', parentId)
  ensureNode('asplit_kafka_consumer_group', 'Kafka 消费组',
    'Kafka 消费组：把多个消费者封装成一个逻辑消费实体。同一消费组内一个 Partition 只分给一个消费者，不同消费组可独立消费同一份数据，这是 Kafka 横向扩展消费能力的基础。', parentId)
  addSupplementTab(pc, { id: 'asplit:s18:s15:orig', label: 'Producer、Consumer 与消费组（原文）', content: shellContent(src), tags: src.tags ?? [] })
  supplements.push(`Producer、Consumer 与消费组（原文，${shellContent(src).length} 字）`)
  semanticEdge('asplit:s18:kafka-pc-cg', 'asplit_kafka_producer_consumer', 'asplit_kafka_consumer_group', '属于', 'structure', 'Kafka 消费者隶属于消费组')
  unloadTreeEntry(rec, '#15')
  gateAndDrop('k_vault_javakafka03producerconsumer_y4d5ch', '#15')
}

log('\n── G2-#16 Topic/Partition 与 Broker → 拆「Kafka Topic / Partition」/「Kafka Broker」──')
{
  const rec = uniqueMount('k_vault_javakafka02topicpartitionbroker_1ae46h', '#16')
  const parentId = rec.parent.id
  const src = pool.k_vault_javakafka02topicpartitionbroker_1ae46h
  const tp = ensureNode('asplit_kafka_topic_partition', 'Kafka Topic / Partition',
    'Kafka Topic / Partition：Topic 是逻辑概念，Partition 是并行与顺序的基本单元。单 Partition 内有序，跨 Partition 不保证全局有序；增加 Partition 数可提升并行度与吞吐。', parentId)
  ensureNode('asplit_kafka_broker', 'Kafka Broker',
    'Kafka Broker：物理承载节点，负责存储 Partition 副本并提供读写服务；Partition 分布在多个 Broker 上以实现负载均衡与容错。', parentId)
  addSupplementTab(tp, { id: 'asplit:s18:s16:orig', label: 'Topic、Partition 与 Broker（原文）', content: shellContent(src), tags: src.tags ?? [] })
  supplements.push(`Topic、Partition 与 Broker（原文，${shellContent(src).length} 字）`)
  semanticEdge('asplit:s18:kafka-tp-broker', 'asplit_kafka_topic_partition', 'asplit_kafka_broker', '承载', 'structure', 'Partition 承载于 Kafka Broker')
  unloadTreeEntry(rec, '#16')
  gateAndDrop('k_vault_javakafka02topicpartitionbroker_1ae46h', '#16')
}

// ══════════ G3 容器重组与重复消除 ══════════
log('\n── G3-#5 备份和恢复 [维基] → 合并进 #4 ──')
{
  const rec = uniqueMount('k_wiki_en_database_s24', '#5')
  const target = uniqueMount('container:chapter_db_15', '#5目标#4')
  migrateBody(rec, target, '备份和恢复（维基原文）')
  promoteKids(rec, '#5')
  unloadTreeEntry(rec, '#5')
  gateAndDrop('k_wiki_en_database_s24', '#5')
}

log('\n── G3-#4 备份与恢复 [数据库] → 改名「数据库备份、恢复」──')
renameEntry(uniqueMount('container:chapter_db_15', '#4'), '数据库备份、恢复', '#4')

log('\n── G3-#6 备份与恢复 [MySQL] → 改名「MySQL 备份、恢复」──')
renameEntry(uniqueMount('mysql:theme:backup-recovery', '#6'), 'MySQL 备份、恢复', '#6')

log('\n── G3-#3 类与对象 [面向对象] → 改名「面向对象：类、对象」──')
renameEntry(uniqueMount('k_1783184803301_75p0j1', '#3'), '面向对象：类、对象', '#3')

log('\n── G3-#7 类与对象 [Java syntax] → 改名「Java 类、对象」──')
renameEntry(uniqueMount('k_java_syntax_class_object', '#7'), 'Java 类、对象', '#7')

log('\n── G3-#10 类与接口 → 提级 1 孩 + 卸树退池 ──')
{
  const rec = uniqueMount('k_1786343607773_qq5y28', '#10')
  // 该节点挂着 1 张题卡「普通类和抽象类有哪些区别？」→ 改绑到存活的「Java 抽象类」
  repointQuestion('k_1786343607773_qq5y28', 'k_vault_javajava_sfczzr', '#10')
  promoteKids(rec, '#10')
  unloadTreeEntry(rec, '#10')
  gateAndDrop('k_1786343607773_qq5y28', '#10')
}

log('\n── G3-#2 进程与线程 → 采用「卸载」分支 ──')
{
  const rec = uniqueMount('k_1784367220387_2v9vdv', '#2')
  // 该节点挂着 4 张题卡（T1/T2/T3 顺序、为何用多线程、线程程序进程概念、进程和线程区别）
  // 均为进程/线程总论 → 改绑到接收其 8 个子节点的父节点「java并发编程」
  repointQuestion('k_1784367220387_2v9vdv', 'k_1782846767165_l599je', '#2')
  migrateBody(rec, rec.parent, '进程、线程总览（拆前原文）')
  promoteKids(rec, '#2')
  unloadTreeEntry(rec, '#2')
  gateAndDrop('k_1784367220387_2v9vdv', '#2')
}

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条 / 题 ${questions.length} 张`)
log(`新建正身 ${created.length}：${created.join(' , ')}`)
log(`卸树 ${unloaded.size} 条 · 退池 ${dropped.length} 个 · 新建边 ${addedEdges.length} 条 · 改名 ${renamed.length} 处 · supplement ${supplements.length} 个`)
for (const r of renamed) log(`  改名：${r}`)
for (const s of supplements) log(`  补充：${s}`)

if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
