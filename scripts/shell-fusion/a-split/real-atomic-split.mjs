/**
 * 真原子拆分：撤销上一轮「标点绕过」的伪改名，改为物理拆成单一实体节点。
 *
 * 被拆的 8 个伪改名节点（都只把 与/和 换成 、 或 /，本体仍是复合节点）：
 *   S1 Session / Cookie            → Session（复用 k_dict_ef30sdky）+ Cookie
 *   S2 Kafka 生产者 / 消费者        → Kafka 生产者 + Kafka 消费者
 *   S3 Kafka Topic / Partition     → Kafka Topic + Kafka Partition
 *   S4 数据库备份、恢复             → 数据库备份 + 数据库恢复
 *   S5 MySQL 备份、恢复             → MySQL 备份 + MySQL 恢复
 *   S6 面向对象：类、对象           → 卸载，4 孩提级到「面向对象」
 *   S7 Java 类、对象                → 卸载，10 孩提级到「Java syntax」，正文转「java」supplement
 *   S8 认证 / 权限校验（同一反模式，用户表未列，主动补上）→ 认证 + 权限校验
 *
 * 正文归位原则：真实正文按主题关键词逐行归到对应实体；两侧都提到/都没提到的句子归主实体，
 * 保证行覆盖完整（不丢内容）。若原节点正文是导航/分类占位符（S4/S5）则如实标注「无知识可分」，
 * 只按裁决建立原子概念节点并由子节点承载实际内容。
 *
 * 用法：node scripts/shell-fusion/a-split/real-atomic-split.mjs [--apply]
 */
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
const COMPOUND_RE = /[与和]|\/|、/
const unloaded = new Set()
const dropped = []
const created = []
const reused = []
const addedEdges = []
const notes = []

function semanticEdge(id, source, target, type, relationKind, label) {
  if (!ALLOWED.has(relationKind)) throw new Error(`relationKind ${relationKind} 不在枚举`)
  const e = { id, source, target, type, label, relationKind, dimensions: [] }
  if (!upsertEdge(edges, e)) throw new Error(`边 ${id} 已存在`)
  addedEdges.push(id)
  log(`    建边 ${id}：${source} -[${type}/${relationKind}]-> ${target}`)
}

function uniqueMount(ref, tag) {
  const ms = byRef(ref)
  if (ms.length !== 1) throw new Error(`${tag}: ${ref} 命中 ${ms.length} 个树条目（需唯一）`)
  return ms[0]
}

/** 改边的某一端指向（拆分后原复合节点消失时用）。 */
function repointEdge(edgeId, side, to, reason) {
  const e = edges.find((x) => x.id === edgeId)
  if (!e) { log(`    跳过改指向（边不存在）：${edgeId}`); return }
  if (e[side] === to) return
  log(`    改指向：${edgeId}.${side} ${e[side]} → ${to}（${reason}）`)
  e[side] = to
}

/** 新建原子正身（名内不得再有连接符）。 */
function newNode(ref, label, content, parentTreeId, tabs = []) {
  if (pool[ref]) throw new Error(`正身 ${ref} 已存在`)
  if (COMPOUND_RE.test(label)) throw new Error(`原子正身名「${label}」仍含连接符——拒绝创建`)
  pool[ref] = {
    id: ref, label, role: 'plain', dimensions: [], tags: [label], kind: 'concept',
    card: { nodeId: ref, title: label, tabs: [{ id: 'def', label: '定义', content }, ...tabs], rootContent: `${label}\n\n${content}` },
  }
  const parent = byId(parentTreeId)
  if (!parent) throw new Error(`新建「${label}」父 ${parentTreeId} 不存在`)
  const entry = { id: `atomic_${ref}`, name: label, count: 0, nodeRef: ref, children: [] }
  attachChild(parent.node, entry)
  const e = createTreeBindingEdge({ tree, pool, parentTreeId, childTreeId: entry.id, childKnowledgeId: ref })
  if (e && upsertEdge(edges, e)) addedEdges.push(e.id)
  created.push(`${ref}「${label}」`)
  log(`    新原子正身「${label}」(${ref}) @「${parent.node.name}」`)
  return entry
}

/** 复用池内已存在但未挂载的正身：挂到指定父下。 */
function mountExisting(ref, label, parentTreeId) {
  const parent = byId(parentTreeId)
  if (!parent) throw new Error(`复用「${label}」父 ${parentTreeId} 不存在`)
  const entry = { id: `atomic_${ref}`, name: label, count: 0, nodeRef: ref, children: [] }
  attachChild(parent.node, entry)
  const e = createTreeBindingEdge({ tree, pool, parentTreeId, childTreeId: entry.id, childKnowledgeId: ref })
  if (e && upsertEdge(edges, e)) addedEdges.push(e.id)
  reused.push(`${ref}「${label}」`)
  log(`    复用已有正身「${label}」(${ref}) @「${parent.node.name}」（§0.4：池内已有正身直接复用）`)
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

/** 把子节点移动到指定父（默认原父）。 */
function moveKids(rec, toTreeId, tag) {
  const target = byId(toTreeId) ?? rec.parent
  const kids = [...(rec.node.children ?? [])]
  for (const k of kids) {
    detachChild(rec.node, k.id)
    attachChild(target.node, k)
    log(`    移挂：「${k.name}」→「${target.node.name}」`)
    const e = createTreeBindingEdge({ tree, pool, parentTreeId: target.node.id, childTreeId: k.id, childKnowledgeId: k.nodeRef })
    if (e && upsertEdge(edges, e)) addedEdges.push(e.id)
  }
  if (kids.length) log(`    ${tag} 移挂 ${kids.length} 个子节点 →「${target.node.name}」`)
  return kids.length
}

/** 按关键词把正文逐行归到两侧；两侧都不沾的句子归 A（保证行覆盖完整）。 */
function splitLines(body, reA, reB) {
  const lines = String(body).split('\n')
  const a = []; const b = []; let shared = 0
  for (const l of lines) {
    const t = l.trim()
    if (!t) continue
    const inA = reA.test(t); const inB = reB.test(t)
    if (inA && !inB) a.push(t)
    else if (inB && !inA) b.push(t)
    else { a.push(t); shared += 1 }
  }
  return { a: a.join('\n'), b: b.join('\n'), shared, total: a.length + b.length }
}

log('═══ 真原子拆分（撤销标点绕过）═══')
log(`起始 ${statLine(state)}`)

// ── S1 Session / Cookie ────────────────────────────────────────────────
log('\n── S1 Session / Cookie → Session + Cookie ──')
{
  const rec = uniqueMount('asplit_session_cookie', 'S1')
  const parentId = rec.parent.id
  const orig = (rec.node.supplement?.tabs ?? []).map((t) => t.content).join('\n\n')
  const body = orig || shellContent(pool.asplit_session_cookie)
  const s = splitLines(body, /Session/i, /Cookie/i)
  log(`    原文按主题归位：Session ${s.a.split('\n').filter(Boolean).length} 行 · Cookie ${s.b.split('\n').filter(Boolean).length} 行（共享 ${s.shared} 行归 Session）`)
  const tabsFor = (txt) => txt ? [{ id: 'orig', label: '原文归位（拆分自 Session / Cookie）', content: txt }] : []
  const sessionEntry = mountExisting('k_dict_ef30sdky', 'Session', parentId)
  // 复用节点补上定义与归位正文
  pool.k_dict_ef30sdky.label = 'Session'
  pool.k_dict_ef30sdky.card = {
    nodeId: 'k_dict_ef30sdky', title: 'Session',
    tabs: [{ id: 'def', label: '定义', content: 'Session：服务端会话状态存储。登录态、会话数据保存在服务端，浏览器只持 SessionId 作为会话标识；分布式场景下演进为共享会话。' }, ...tabsFor(s.a)],
    rootContent: `Session\n\nSession：服务端会话状态存储。登录态、会话数据保存在服务端，浏览器只持 SessionId 作为会话标识。`,
  }
  const cookieEntry = newNode('atomic_cookie', 'Cookie',
    'Cookie：客户端状态载体。由服务端下发、浏览器保存并随请求回传，用于承载会话标识与轻量偏好；本身容量小且可被用户清除。',
    parentId, tabsFor(s.b))
  semanticEdge('atomic:s1:session-cookie', 'k_dict_ef30sdky', 'atomic_cookie', '依赖', 'dependency', 'Session 依赖 Cookie 传递 SessionId')
  repointEdge('asplit:s18:session-state', 'source', 'k_dict_ef30sdky', '复合节点拆为 Session + Cookie')
  unloadTreeEntry(rec, 'S1')
  gateAndDrop('asplit_session_cookie', 'S1')
}

// ── S2 Kafka 生产者 / 消费者 ───────────────────────────────────────────
log('\n── S2 Kafka 生产者 / 消费者 → Kafka 生产者 + Kafka 消费者 ──')
{
  const rec = uniqueMount('asplit_kafka_producer_consumer', 'S2')
  const parentId = rec.parent.id
  const orig = (rec.node.supplement?.tabs ?? []).map((t) => t.content).join('\n\n')
  const s = splitLines(orig || shellContent(pool.asplit_kafka_producer_consumer), /生产者|Producer/i, /消费者|Consumer/i)
  log(`    原文按主题归位：生产者 ${s.a.split('\n').filter(Boolean).length} 行 · 消费者 ${s.b.split('\n').filter(Boolean).length} 行`)
  const tabsFor = (txt) => txt ? [{ id: 'orig', label: '原文归位（拆分自 Kafka 生产者 / 消费者）', content: txt }] : []
  const prod = newNode('atomic_kafka_producer', 'Kafka 生产者',
    'Kafka 生产者：选择 Topic、按 Key 或策略决定写入哪个 Partition，并把消息追加到 Broker 的客户端角色。', parentId, tabsFor(s.a))
  const cons = newNode('atomic_kafka_consumer', 'Kafka 消费者',
    'Kafka 消费者：从指定 Partition 拉取消息、维护消费位点并处理业务逻辑的客户端角色；同组内一个 Partition 只分给一个消费者。', parentId, tabsFor(s.b))
  semanticEdge('atomic:s2:producer-consumer', 'atomic_kafka_producer', 'atomic_kafka_consumer', '产出供消费', 'dependency', '生产者产出的消息供消费者拉取')
  repointEdge('asplit:s18:kafka-pc-cg', 'source', 'atomic_kafka_consumer', '复合节点拆为生产者 + 消费者；「属于消费组」的主体是消费者')
  unloadTreeEntry(rec, 'S2')
  gateAndDrop('asplit_kafka_producer_consumer', 'S2')
}

// ── S3 Kafka Topic / Partition ─────────────────────────────────────────
log('\n── S3 Kafka Topic / Partition → Kafka Topic + Kafka Partition ──')
{
  const rec = uniqueMount('asplit_kafka_topic_partition', 'S3')
  const parentId = rec.parent.id
  const orig = (rec.node.supplement?.tabs ?? []).map((t) => t.content).join('\n\n')
  const s = splitLines(orig || shellContent(pool.asplit_kafka_topic_partition), /Topic/i, /Partition/i)
  log(`    原文按主题归位：Topic ${s.a.split('\n').filter(Boolean).length} 行 · Partition ${s.b.split('\n').filter(Boolean).length} 行`)
  const tabsFor = (txt) => txt ? [{ id: 'orig', label: '原文归位（拆分自 Kafka Topic / Partition）', content: txt }] : []
  const topic = newNode('atomic_kafka_topic', 'Kafka Topic',
    'Kafka Topic：消息的逻辑分类单元，是生产者写入与消费者订阅的目标；单个 Topic 下划分为多个 Partition。', parentId, tabsFor(s.a))
  const part = newNode('atomic_kafka_partition', 'Kafka Partition',
    'Kafka Partition：Topic 的物理分片，是并行与顺序的基本单元。单 Partition 内有序，跨 Partition 不保证全局有序。', parentId, tabsFor(s.b))
  semanticEdge('atomic:s3:partition-topic', 'atomic_kafka_partition', 'atomic_kafka_topic', '属于', 'structure', 'Partition 隶属于 Topic')
  repointEdge('asplit:s18:kafka-tp-broker', 'source', 'atomic_kafka_partition', '复合节点拆为 Topic + Partition；「承载于 Broker」的主体是 Partition')
  unloadTreeEntry(rec, 'S3')
  gateAndDrop('asplit_kafka_topic_partition', 'S3')
}

// ── S4 数据库备份、恢复 ────────────────────────────────────────────────
log('\n── S4 数据库备份、恢复 → 数据库备份 + 数据库恢复 ──')
{
  const rec = uniqueMount('container:chapter_db_15', 'S4')
  const body = shellContent(pool['container:chapter_db_15'])
  if (/导航容器|点击子节点查看/.test(body)) notes.push('S4 原正文是导航占位符（无知识可分），原子定义系新撰，实际内容由其 2 个子节点承载')
  log(`    原正文：${body.replace(/\n/g, ' ').slice(0, 90)}…`)
  log(`    ⚠ 如为导航占位符，则无「备份技术/恢复技术」正文可归位，如实标注`)
  const parentId = rec.parent.id
  const bk = newNode('atomic_database_backup', '数据库备份',
    '数据库备份：把数据库在某一时刻的一致状态复制到独立介质（逻辑导出或物理拷贝），用于故障恢复与数据迁移。', parentId)
  const rs = newNode('atomic_database_restore', '数据库恢复',
    '数据库恢复：由备份副本（配合日志重放）把数据库重建到指定时间点，分为全量恢复与时间点恢复（PITR）。', parentId)
  moveKids(rec, parentId, 'S4')
  semanticEdge('atomic:s4:restore-backup', 'atomic_database_restore', 'atomic_database_backup', '依赖', 'dependency', '恢复依赖备份产物')
  unloadTreeEntry(rec, 'S4')
  gateAndDrop('container:chapter_db_15', 'S4')
}

// ── S5 MySQL 备份、恢复 ────────────────────────────────────────────────
log('\n── S5 MySQL 备份、恢复 → MySQL 备份 + MySQL 恢复 ──')
{
  const rec = uniqueMount('mysql:theme:backup-recovery', 'S5')
  const body = shellContent(pool['mysql:theme:backup-recovery'])
  if (/主题分类|术语按知识森林/.test(body)) notes.push('S5 原正文是分类占位符（无知识可分），原子定义系新撰；15 个备份机制子节点归入「MySQL 备份」')
  log(`    原正文：${body.replace(/\n/g, ' ').slice(0, 90)}…`)
  const parentId = rec.parent.id
  const bk = newNode('atomic_mysql_backup', 'MySQL 备份',
    'MySQL 备份：MySQL 语境下的备份技术与机制族——逻辑备份 mysqldump、物理热备 XtraBackup、mysqlbackup 企业备份，以及检查点、redo 应用与一致性控制。', parentId)
  const rs = newNode('atomic_mysql_restore', 'MySQL 恢复',
    'MySQL 恢复：用 MySQL 备份产物重建实例数据，配合 binlog 做时间点恢复（PITR）；关注恢复时长（RTO）与恢复点目标（RPO）。', parentId)
  // 15 个备份机制子节点归入 MySQL 备份
  moveKids(rec, bk.id, 'S5')
  semanticEdge('atomic:s5:restore-backup', 'atomic_mysql_restore', 'atomic_mysql_backup', '依赖', 'dependency', 'MySQL 恢复依赖 MySQL 备份产物')
  unloadTreeEntry(rec, 'S5')
  gateAndDrop('mysql:theme:backup-recovery', 'S5')
}

// ── S6 面向对象：类、对象 ──────────────────────────────────────────────
log('\n── S6 面向对象：类、对象 → 卸载，4 孩提级到「面向对象」 ──')
{
  const rec = uniqueMount('k_1783184803301_75p0j1', 'S6')
  const body = shellContent(pool.k_1783184803301_75p0j1)
  log(`    正文 ${body.length} 字${body.trim() ? '' : '（无内容可迁移）'}`)
  moveKids(rec, rec.parent.id, 'S6')
  unloadTreeEntry(rec, 'S6')
  gateAndDrop('k_1783184803301_75p0j1', 'S6')
}

// ── S7 Java 类、对象 ───────────────────────────────────────────────────
log('\n── S7 Java 类、对象 → 卸载，10 孩提级，正文转「java」supplement ──')
{
  const rec = uniqueMount('k_java_syntax_class_object', 'S7')
  const body = shellContent(pool.k_java_syntax_class_object)
  const javaEntry = uniqueMount('k_1782746457581_30q8ao', 'S7目标 java')
  log(`    目标「${javaEntry.node.name}」(${javaEntry.node.id})`)
  if (body.trim()) {
    addSupplementTab(javaEntry.node, { id: 'atomic:s7:orig', label: 'Java 类、对象（拆分前原文）', content: body, tags: pool.k_java_syntax_class_object.tags ?? [] })
    log(`    正文 ${body.length} 字转「${javaEntry.node.name}」supplement`)
  }
  moveKids(rec, rec.parent.id, 'S7')
  unloadTreeEntry(rec, 'S7')
  gateAndDrop('k_java_syntax_class_object', 'S7')
}

// ── S8 认证 / 权限校验 ─────────────────────────────────────────────────
log('\n── S8 认证 / 权限校验 → 改名「连接认证」（**不是知识复合体，是机制状态，不能拆**）──')
{
  const REF = 'asplit_conn_state_auth'
  const rec = uniqueMount(REF, 'S8')
  const spec = pool.qproc_thread_state?.mechanismSpec
  if (!spec) throw new Error('S8: qproc_thread_state.mechanismSpec 不存在，假设不成立')
  if (!spec.stateNodeIds.includes(REF)) throw new Error('S8: 该节点不在 qproc_thread_state.stateNodeIds，假设不成立')
  notes.push('S8「认证 / 权限校验」不是知识概念复合体，而是 qproc_thread_state mechanismSpec 的 6 个状态之一'
    + '（asplit:s99:t1 进入、asplit:s99:t2 离开）。拆成两节点会打断机制状态链，故只做原子改名：'
    + '「认证 / 权限校验」→「连接认证」，节点保留挂载、spec 引用零变化')
  const TO = '连接认证'
  if (COMPOUND_RE.test(TO)) throw new Error('S8 目标名仍含连接符')
  log(`    该节点是 spec 状态：stateNodeIds 含 ${REF}，转移边 asplit:s99:t1/${'asplit:s99:t2'} 与其相连`)
  const old = rec.node.name
  rec.node.name = TO
  pool[REF].label = TO
  if (pool[REF].card) pool[REF].card.title = TO
  const rc = pool[REF].card?.rootContent ?? ''
  if (rc.startsWith(old)) pool[REF].card.rootContent = TO + rc.slice(old.length)
  log(`    改名（保挂载、保 spec 引用）：「${old}」→「${TO}」`)
}

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条 / 题 ${questions.length} 张`)
log(`新建原子正身 ${created.length}：${created.join(' , ')}`)
log(`复用已有正身 ${reused.length}：${reused.join(' , ')}`)
log(`卸树 ${unloaded.size} 条 · 退池 ${dropped.length} 个 · 新建边 ${addedEdges.length} 条`)
for (const n of notes) log(`  ⚠ ${n}`)

if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
