/**
 * A-split §四：去壳归位与提级（25 条 + 2 条改判改名保留）。
 *
 * 动作四类：
 *   merge    — 壳正文转目标树条目 supplement tab → 卸树条目 → 删 treebind → 门禁 → 退池
 *   promote  — 壳的孩子上提到目标 → （正文 >0 时转 supplement）→ 卸壳 → 门禁 → 退池
 *   split    — 一类式拆分（双正身 + 显式关系边，relationKind 受控枚举）
 *   rename   — 改判保留：只改树名/池 label，不卸不退
 *
 * 用法：
 *   node scripts/shell-fusion/a-split/section4-shells.mjs           # 干跑
 *   node scripts/shell-fusion/a-split/section4-shells.mjs --apply   # 落盘
 */
import {
  loadState, flatten, shellContent, gateScan, statLine, log,
} from './common.mjs'
import {
  saveAll, addSupplementTab, detachChild, attachChild,
  dropTreebindEdgesForTreeIds, createTreeBindingEdge, upsertEdge, treeCount,
} from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges } = state
const flat = () => flatten(tree)
const byId = (id) => flat().find((f) => f.node.id === id)
const byRefUnique = (nodeRef) => {
  const hits = flat().filter((f) => f.node.nodeRef === nodeRef)
  if (hits.length !== 1) throw new Error(`nodeRef ${nodeRef} 命中 ${hits.length}（需唯一时）`)
  return hits[0]
}

const unloadedTreeIds = new Set()
const droppedPoolRefs = new Set()
const addedEdges = []

/** 门禁 + 退池（工单：命中即停）。 */
function gateAndDrop(nodeRef, step) {
  const scan = gateScan(state, [nodeRef], { excludeTreeIds: [...unloadedTreeIds] })
  if (scan.hits.length > 0) {
    log(`  ✗ ${step} 门禁命中（命中即停）：`)
    for (const h of scan.hits) log('    ! ' + h)
    process.exit(1)
  }
  if (pool[nodeRef]) {
    delete pool[nodeRef]
    droppedPoolRefs.add(nodeRef)
    log(`  退池：${nodeRef}`)
  }
}

/** 壳正文 → 目标 supplement tab。 */
function migrateContent(shellNodeRef, targetTreeEntry, tab) {
  const p = pool[shellNodeRef]
  const content = p ? shellContent(p) : ''
  if (!p || content.length === 0) {
    log(`  正文 0 字，无可迁移（${shellNodeRef}）`)
    return 0
  }
  const r = addSupplementTab(targetTreeEntry, {
    id: tab.id, label: tab.label, content, tags: p.tags ?? [],
  })
  log(`  supplement ${r}：${tab.label}（${content.length} 字）→「${targetTreeEntry.name}」`)
  return content.length
}

/** 卸树条目 + 删 treebind。 */
function unloadTreeEntry(id, label) {
  const rec = byId(id)
  if (!rec) throw new Error(`${label}: 树条目 ${id} 不存在`)
  detachChild(rec.parent, id)
  unloadedTreeIds.add(id)
  const removed = dropTreebindEdgesForTreeIds(edges, [id])
  log(`  卸树条目「${rec.node.name}」(${id})，删 treebind ${removed} 条`)
}

/** 边改指向（壳退池前，把真语义边改指向正身）。 */
function repointEdge(edgeId, side, to, reason) {
  const e = edges.find((x) => x.id === edgeId)
  if (!e) { log(`  ⚠ 边 ${edgeId} 不存在，跳过改指向`); return }
  if (e[side] === to) { log(`  边 ${edgeId}.${side} 已是 ${to}`); return }
  log(`  改指向：${edgeId}.${side} ${e[side]} → ${to}（${reason}）`)
  e[side] = to
}

/** 删除边（语义被新边承载时）。 */
function dropEdgeById(edgeId, reason) {
  const i = edges.findIndex((x) => x.id === edgeId)
  if (i < 0) { log(`  ⚠ 边 ${edgeId} 不存在，跳过删除`); return }
  edges.splice(i, 1)
  log(`  删边：${edgeId}（${reason}）`)
}

/** 批量改指向：所有非 treebind 边中 side === testRef 的边。 */
function repointWhere(testRef, side, to, reason) {
  let n = 0
  for (const e of edges) {
    if (String(e.id).startsWith('treebind:')) continue
    if (e[side] === testRef) { e[side] = to; n += 1 }
  }
  log(`  批量改指向：${n} 条边 ${side} ${testRef} → ${to}（${reason}）`)
}

/** merge 动作。 */
function doMerge(item) {
  log(`\n── merge #${item.no}`)
  const rec = byId(item.shellId)
  if (!rec) throw new Error(`#${item.no}: 壳 ${item.shellId} 不存在`)
  const target = item.targetId ? byId(item.targetId)?.node : rec.parent
  if (!target) throw new Error(`#${item.no}: 目标不存在`)
  log(`  壳「${rec.node.name}」→ 目标「${target.name}」(${target.id})`)
  migrateContent(rec.node.nodeRef, target, item.tab)
  unloadTreeEntry(item.shellId, `#${item.no}`)
  for (const r of item.repoint ?? []) repointEdge(r.edgeId, r.side, r.to, r.reason)
  for (const w of item.repointWhere ?? []) repointWhere(w.testRef, w.side, w.to, w.reason)
  for (const d of item.dropEdges ?? []) dropEdgeById(d.edgeId, d.reason)
  gateAndDrop(rec.node.nodeRef, `#${item.no}`)
}

/** promote 动作。 */
function doPromote(item) {
  log(`\n── promote #${item.no}「${item.shellName}」`)
  const rec = flat().find((f) => f.node.id === item.shellId)
  if (!rec) throw new Error(`#${item.no}: 壳 ${item.shellId} 不存在`)
  const target = item.targetId ? byId(item.targetId).node : rec.parent
  const kids = [...(rec.node.children ?? [])]
  log(`  壳「${rec.node.name}」(${kids.length} 孩) → 目标「${target.name}」(${target.id})`)
  let rebuilt = 0
  for (const kid of kids) {
    detachChild(rec.node, kid.id)
    attachChild(target, kid)
    log(`  提级：「${kid.name}」(${kid.id})`)
    if (!kid.nodeRef) continue
    const edge = createTreeBindingEdge({
      tree, pool, parentTreeId: target.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef,
    })
    if (edge && upsertEdge(edges, edge)) {
      rebuilt += 1
      addedEdges.push(edge.id)
    }
  }
  log(`  重建 belongs-to 边 ${rebuilt} 条`)
  if (item.tab) migrateContent(rec.node.nodeRef, target, item.tab)
  unloadTreeEntry(item.shellId, `#${item.no}`)
  for (const r of item.repoint ?? []) repointEdge(r.edgeId, r.side, r.to, r.reason)
  for (const w of item.repointWhere ?? []) repointWhere(w.testRef, w.side, w.to, w.reason)
  for (const d of item.dropEdges ?? []) dropEdgeById(d.edgeId, d.reason)
  gateAndDrop(rec.node.nodeRef, `#${item.no}`)
}

/** 新建池节点（最小形状，与池内现有节点字段对齐）。 */
function newPoolNode(id, label, content, { role, tags = [], kind } = {}) {
  if (pool[id]) throw new Error(`池内已有 ${id}`)
  pool[id] = {
    id,
    label,
    ...(kind ? { kind } : {}),
    ...(role ? { role } : {}),
    card: { nodeId: id, title: label, tabs: [{ id: 'def', label: '定义', content }] },
    tags,
  }
  log(`  新建池节点 ${id}「${label}」（${content.length} 字）`)
  return pool[id]
}

/** 新建树条目并挂到父下 + treebind 边。 */
function newTreeEntry(id, name, nodeRef, parentId) {
  const parent = byId(parentId)
  if (!parent) throw new Error(`父 ${parentId} 不存在`)
  const entry = { id, name, nodeRef, children: [] }
  attachChild(parent.node, entry)
  const edge = createTreeBindingEdge({
    tree, pool, parentTreeId: parentId, childTreeId: id, childKnowledgeId: nodeRef,
  })
  if (edge && upsertEdge(edges, edge)) {
    addedEdges.push(edge.id)
    log(`  新建树条目「${name}」(${id}) @「${parent.node.name}」+ treebind`)
  } else {
    log(`  新建树条目「${name}」(${id}) @「${parent.node.name}」（无 treebind：nodeRef 不在池/同源）`)
  }
  return entry
}

/** 受控枚举语义边。 */
function semanticEdge(id, source, target, type, relationKind, label) {
  const ALLOWED = ['structure', 'classification', 'dependency', 'causality', 'state-transition', 'constraint', 'evidence', 'reference']
  if (!ALLOWED.includes(relationKind)) throw new Error(`relationKind ${relationKind} 不在受控枚举`)
  const edge = { id, source, target, type, label, relationKind, dimensions: [] }
  if (upsertEdge(edges, edge)) {
    addedEdges.push(id)
    log(`  建边 ${id}：${source} -[${type}/${relationKind}]-> ${target}`)
  }
}

/** 内容去重（本批三条正文存在整段自我复制）。 */
function dedupe(content) {
  if (content.length % 2 === 0) {
    const half = content.length / 2
    if (content.slice(0, half) === content.slice(half)) {
      log(`  去重：${content.length} → ${half} 字（整段自我复制）`)
      return content.slice(0, half)
    }
  }
  return content
}

const MERGES = [
  { no: 3, shellId: 'tree_1783253570052_bch36k', targetId: 'tree_1782834119007_8gxoi9', tab: { id: 'context:asplit:s3', label: '动态配置与消息传递机制' } },
  { no: 66, shellId: 'tree_vault_javamybatis01mybatis_ga6dza', targetId: 'tree_java_fw_mybatis', tab: { id: 'context:asplit:s66', label: '核心定位与组成' } },
  { no: 70, shellId: 'tree_vault_javanetty01netty_1s7ki8', targetId: 'tree_java_fw_netty', tab: { id: 'context:asplit:s70', label: '定位与通信抽象' }, repoint: [{ edgeId: 'edge_netty_builds_on_nio', side: 'source', to: 'k_java_fw_netty', reason: '壳并入 Netty 正身，语义边改指向正身' }] },
  { no: 73, shellId: 'tree_vault_javanetty04_4zawtb', targetId: 'tree_java_fw_netty', tab: { id: 'context:asplit:s73', label: '高性能设计' } },
  { no: 74, shellId: 'tree_vault_javanetty05nettyrpc_mq7c8m', targetId: 'tree_java_fw_netty', tab: { id: 'context:asplit:s74', label: 'RPC 实践' } },
  { no: 75, shellId: 'tree_vault_javakafka01kafka_gu4pva', targetId: 'tree_java_fw_kafka', tab: { id: 'context:asplit:s75', label: '定位与消息模型' } },
  { no: 78, shellId: 'tree_vault_javarabbitmq04_1a58e6', targetId: 'tree_java_fw_rabbitmq', tab: { id: 'context:asplit:s78', label: '可靠性、顺序与幂等' } },
  { no: 104, shellId: 'tree_idx_fail_bg', targetId: 'tree_idx_fail_root', tab: { id: 'context:asplit:s104', label: 'InnoDB 索引与失效背景' } },
  { no: 105, shellId: 'tree_bts_height_io', targetId: 'tree_btree_structure', tab: { id: 'context:asplit:s105', label: '树高与 IO 次数' } },
  { no: 108, shellId: 'tree_wiki_en_database_s23', targetId: 'chapter_db_17', tab: { id: 'context:asplit:s108', label: '构建、维护和调整' } },
  { no: 131, shellId: 'tree_vault_java04cap_1frlgp', targetId: 'tree_1784728125587_k8xecl', tab: { id: 'context:asplit:s131', label: '一致性与 CAP 实践' } },
]

const PROMOTES = [
  { no: 13, shellId: 'tree_1786029977674_z8iq86', shellName: 'ConcurrentHashMap的实现原理与使用', targetId: 'tree_1785293964453_8vqlt3' },
  { no: 12, shellId: 'tree_1785946513638_ul3fxq', shellName: 'Java并发容器和框架' },
  { no: 97, shellId: 'chapter_db_04', shellName: '数据约束与标识', tab: { id: 'context:asplit:s97', label: '数据约束与标识（章节概述）' } },
  { no: 109, shellId: 'tree_concept_data_access_interface', shellName: '数据访问接口与连接生态', tab: { id: 'context:asplit:s109', label: '连接生态（章节概述）' }, repointWhere: [{ testRef: 'concept_data_access_interface', side: 'target', to: 'container:chapter_db_18', reason: '壳退池，instance-of 边改指向新宿主章节' }] },
  { no: 111, shellId: 'mysql_topic_backup_operations', shellName: '备份、运维与诊断', tab: { id: 'context:asplit:s111', label: '备份、运维与诊断' } },
  { no: 110, shellId: 'tree_1787157552835_zhdxsr', shellName: '服务管理和公共组件' },
  { no: 115, shellId: 'mysql:mysqld-layer:connection', shellName: '连接与请求入口', tab: { id: 'context:asplit:s115', label: '连接与请求入口' } },
  { no: 116, shellId: null, shellRef: 'mysql:concept:data-files:metadata:node', shellName: '元数据与选项文件', tab: { id: 'context:asplit:s116', label: '元数据与选项文件' } },
]

log('═══ A-split §四 去壳归位与提级 ═══')
log(`起始 ${statLine(state)}`)

for (const item of MERGES) doMerge(item)

// #116 特殊定位：按 nodeRef 找树条目
{
  const item = PROMOTES.find((p) => p.no === 116)
  const rec = byRefUnique(item.shellRef)
  item.shellId = rec.node.id
  log(`\n（#116 实际 treeId = ${rec.node.id}，父「${rec.parent.name}」）`)
}
for (const item of PROMOTES) doPromote(item)

/** 内容去重（本批三条正文存在整段自我复制）。 */
// ── split #19：AQS 与 JUC 工具 ─────────────────────────────────────────
log('\n── split #19「AQS 与 JUC 工具」')
{
  const shellRef = 'k_vault_java04aqsjuc_1n8jz3'
  const rec = byId('tree_vault_java04aqsjuc_1n8jz3')
  const raw = dedupe(shellContent(pool[shellRef]))
  const marker = '## CountDownLatch、CyclicBarrier、Semaphore'
  const cut = raw.indexOf(marker)
  if (cut < 0) throw new Error('#19: 找不到拆分标记')
  const aqsPart = raw.slice(0, cut).trim()
  const jucPart = raw.slice(cut).trim()
  const aqsRef = 'k_1782846826286_ekdql8'
  const aqsEntry = byRefUnique(aqsRef).node
  addSupplementTab(aqsEntry, { id: 'context:asplit:s19', label: 'AQS 与 JUC 工具（AQS 部分）', content: aqsPart, tags: pool[shellRef].tags ?? [] })
  log(`  AQS 部分 ${aqsPart.length} 字 →「${aqsEntry.name}」supplement`)
  const jucRef = 'asplit_juc_tools'
  newPoolNode(jucRef, 'JUC 工具', jucPart, { role: 'concept', tags: ['JUC', '并发'] })
  newTreeEntry('asplit_s19_juc_tools', 'JUC 工具', jucRef, 'tree_1782846767208_uw6zxc')
  semanticEdge('asplit:s19:juc-aqs', jucRef, aqsRef, '基于', 'dependency', 'JUC 工具基于 AQS 构建')
  unloadTreeEntry(rec.node.id, '#19')
  gateAndDrop(shellRef, '#19')
}

// ── split #29：Java JVM和字节码 ────────────────────────────────────────
log('\n── split #29「Java JVM和字节码」')
{
  const shellRef = 'k_1784337591301_a0pi82'
  const rec = byId('tree_1784337591334_k206ed')
  const raw = shellContent(pool[shellRef])
  const paras = raw.split(/\n\n+/).map((s) => s.trim()).filter(Boolean)
  if (paras.length < 3) throw new Error('#29: 段落数不足')
  const bytecodePart = paras[0]
  const jvmPart = paras.slice(1).join('\n\n')
  const bytecodeEntry = byId('tree_1782809150150_a1neqh').node // 字节码 @ 执行系统（另一条 @ 代码 不动）
  const jvmEntry = byId('tree_1782749694516_2ntoss').node // 「jvm」正身
  addSupplementTab(bytecodeEntry, { id: 'context:asplit:s29', label: 'Java 与 JVM 字节码', content: bytecodePart, tags: pool[shellRef].tags ?? [] })
  addSupplementTab(jvmEntry, { id: 'context:asplit:s29', label: 'Java JVM 和字节码（移植与执行）', content: jvmPart, tags: pool[shellRef].tags ?? [] })
  log(`  字节码部分 ${bytecodePart.length} 字 / JVM 部分 ${jvmPart.length} 字`)
  semanticEdge('asplit:s29:jvm-bytecode', 'k_1782749694486_vyrfzy', 'k_1783824357875_gs9rn2', '执行', 'dependency', 'JVM 执行字节码')
  unloadTreeEntry(rec.node.id, '#29')
  gateAndDrop(shellRef, '#29')
}

// ── split #106：设计与建模 ─────────────────────────────────────────────
log('\n── split #106「设计与建模」')
{
  const shellRef = 'k_wiki_en_database_s27'
  const rec = byId('tree_wiki_en_database_s27')
  const raw = dedupe(shellContent(pool[shellRef]))
  const marker = '生成用户满意的概念数据模型后'
  const cut = raw.indexOf(marker)
  if (cut < 0) throw new Error('#106: 找不到拆分标记')
  const modelingPart = raw.slice(0, cut).trim()
  const designPart = raw.slice(cut).replace(/主要入口：数据库设计\s*/g, '').trim()
  const designRef = 'k_wiki_en_outline_of_databases_s7'
  const designEntry = newTreeEntry('asplit_s106_db_design', '数据库设计', designRef, 'chapter_db_13')
  addSupplementTab(designEntry, { id: 'context:asplit:s106', label: '设计与建模（设计流程）', content: designPart, tags: pool[shellRef].tags ?? [] })
  log(`  数据库设计部分 ${designPart.length} 字 → 新树条目 supplement`)
  const modelingRef = 'asplit_db_modeling'
  newPoolNode(modelingRef, '数据库建模', modelingPart, { role: 'concept', tags: ['数据库', '建模'] })
  const modelingEntry = newTreeEntry('asplit_s106_db_modeling', '数据库建模', modelingRef, 'chapter_db_13')
  semanticEdge('asplit:s106:design-modeling', designRef, modelingRef, '阶段', 'structure', '数据库建模是数据库设计的首要阶段')
  const kids = [...(rec.node.children ?? [])]
  let rebuilt = 0
  for (const kid of kids) {
    detachChild(rec.node, kid.id)
    attachChild(designEntry, kid)
    log(`  提级：「${kid.name}」`)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: designEntry.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef })
    if (edge && upsertEdge(edges, edge)) { rebuilt += 1; addedEdges.push(edge.id) }
  }
  log(`  重建 belongs-to 边 ${rebuilt} 条`)
  unloadTreeEntry(rec.node.id, '#106')
  gateAndDrop(shellRef, '#106')
}

// ── split #132：CAP原则与BASE理论 ──────────────────────────────────────
log('\n── split #132「CAP原则与BASE理论」')
{
  const shellRef = 'k_vault_javacapbase_lqqmnp'
  const rec = byId('tree_vault_javacapbase_lqqmnp')
  const raw = dedupe(shellContent(pool[shellRef]))
  const baseMarker = '#BASE理论'
  const cut = raw.indexOf(baseMarker)
  if (cut < 0) throw new Error('#132: 找不到拆分标记')
  const capPart = raw.slice(0, cut).trim()
  const basePart = raw.slice(cut).trim()
  const capEntry = byRefUnique('k_1784728125540_wmcdvv').node
  addSupplementTab(capEntry, { id: 'context:asplit:s132', label: 'CAP 原则与取舍策略', content: capPart, tags: pool[shellRef].tags ?? [] })
  log(`  CAP 部分 ${capPart.length} 字 →「CAP定理」supplement`)
  const baseRef = 'k_1783170416767_yaym2f'
  pool[baseRef].card.tabs = [{ id: 'def', label: '定义', content: basePart }]
  log(`  BASE 部分 ${basePart.length} 字 →「BASE理论」池卡（空壳正身补正文）`)
  newTreeEntry('asplit_s132_base_theory', 'BASE理论', baseRef, 'theory_domain_distributed_systems')
  semanticEdge('asplit:s132:base-cap', baseRef, 'k_1784728125540_wmcdvv', '演进', 'dependency', 'BASE 理论是 CAP 中 C/A 权衡演化的结果')
  dropEdgeById('edge_vault_cap_relates_cap', '壳退池；relates-to 语义由 asplit:s132:base-cap（演进）承载')
  unloadTreeEntry(rec.node.id, '#132')
  gateAndDrop(shellRef, '#132')
}

// ── split #134：分库和分表 ─────────────────────────────────────────────
log('\n── split #134「分库和分表」')
{
  const shellRef = 'k_vault_arch_db_table_split'
  const rec = byId('tree_vault_arch_db_table_split')
  const raw = shellContent(pool[shellRef])
  if (!raw.includes('分库') || !raw.includes('分表')) throw new Error('#134: 正文不匹配')
  const dbPart = '随着数据量增大、并发量增大，分库将单个数据库拆分成多个小数据库。'
  const tblPart = '分表将单个数据表拆分成多个结构完全一致的表。'
  const tblEntry = byRefUnique('k_dict_zsu3d9zk').node
  addSupplementTab(tblEntry, { id: 'context:asplit:s134', label: '与分库的关系', content: tblPart, tags: pool[shellRef].tags ?? [] })
  const dbRef = 'asplit_db_sharding'
  newPoolNode(dbRef, '分库', dbPart, { role: 'plain', tags: ['MySQL', '分库分表'] })
  newTreeEntry('asplit_s134_db_sharding', '分库', dbRef, 'theory_domain_distributed_systems')
  semanticEdge('asplit:s134:db-tbl', dbRef, 'k_dict_zsu3d9zk', '并列', 'reference', '分库与分表是数据拆分的两个并行维度')
  unloadTreeEntry(rec.node.id, '#134')
  gateAndDrop(shellRef, '#134')
}

// ── 改判保留：改名不拆 ─────────────────────────────────────────────────
log('\n── rename-keep（改判：模式名，不拆）')
{
  const rec = byId('tree_1786096456222_l0v627')
  if (rec.node.name !== '生产者消费者模式') {
    log(`  改名：「${rec.node.name}」→「生产者消费者模式」`)
    rec.node.name = '生产者消费者模式'
  }
  const p = pool[rec.node.nodeRef]
  if (p && p.label !== '生产者消费者模式') {
    p.label = '生产者消费者模式'
    p.card.title = '生产者消费者模式'
    log('  池 label 同步改名')
  }
}
{
  const rec = byId('tree_1786241152165_ujkgyc')
  if (rec.node.name !== '发布订阅模式 / pub-sub') {
    log(`  改名：「${rec.node.name}」→「发布订阅模式 / pub-sub」`)
    rec.node.name = '发布订阅模式 / pub-sub'
  }
  const p = pool[rec.node.nodeRef]
  if (p && p.label !== '发布订阅模式 / pub-sub') {
    p.label = '发布订阅模式 / pub-sub'
    p.card.title = '发布订阅模式 / pub-sub'
    log('  池 label 同步改名')
  }
}

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条`)
log(`卸树 ${unloadedTreeIds.size} 条 · 退池 ${droppedPoolRefs.size} 个 · 新建边 ${addedEdges.length} 条`)
log(`新建边明细：\n  ${addedEdges.join('\n  ')}`)

if (apply) {
  saveAll({ pool, tree, edges })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges}.json')
} else {
  log('（干跑，未写盘）')
}
