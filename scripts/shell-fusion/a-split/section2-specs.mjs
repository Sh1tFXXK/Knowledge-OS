/**
 * A-split §二：抽取正文沉淀至 mechanismSpec / viewDimensions（实核 20 条有挂载项）。
 *
 * 处置形态：
 *   spec   — 正身保留为 mechanism 宿主，正文并入宿主卡，新建态/参与/转移节点与 state-transition 边
 *   dims   — 正文并入宿主卡，宿主挂 viewDimensions 网格
 *   merge  — 正文并入宿主卡，原树条目卸、原池节点门禁后退
 *   supp   — 正文并入宿主卡（宿主不重命名、不新增结构）
 *   rename — 只改名，正文与池节点不动（spec 活引用保护）
 *   skip   — 已由既有 spec 承载，零重建（#107）
 *
 * 三条机制保护名单特判：
 *   #61 aop_getbean = aop_flow.triggerNodeIds 活引用 → 只改名，不退池；
 *   #64 宿主是 bcs_flow（非泛 IoC 容器）；
 *   #107 已由 msr_flow 承载 → 跳过重建。
 *
 * 用法：
 *   node scripts/shell-fusion/a-split/section2-specs.mjs           # 干跑
 *   node scripts/shell-fusion/a-split/section2-specs.mjs --apply   # 落盘
 */
import {
  loadState, flatten, shellContent, gateScan, statLine, log,
} from './common.mjs'
import {
  saveAll, detachChild, attachChild,
  dropTreebindEdgesForTreeIds, createTreeBindingEdge, upsertEdge, treeCount,
} from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges } = state
const flat = () => flatten(tree)
const byId = (id) => flat().find((f) => f.node.id === id)
const byRef = (ref) => flat().filter((f) => f.node.nodeRef === ref)

const unloadedTreeIds = new Set()
const droppedPoolRefs = new Set()
const createdNodes = []
const addedEdges = []
const renamed = []

const ALLOWED = ['structure', 'classification', 'dependency', 'causality', 'state-transition', 'constraint', 'evidence', 'reference']

function semanticEdge(id, source, target, type, relationKind, label) {
  if (!ALLOWED.includes(relationKind)) throw new Error(`relationKind ${relationKind} 不在受控枚举`)
  const edge = { id, source, target, type, label, relationKind, dimensions: [] }
  if (upsertEdge(edges, edge)) {
    addedEdges.push(id)
    log(`  建边 ${id}：${source} -[${type}/${relationKind}]-> ${target}`)
  } else {
    throw new Error(`边 ${id} 已存在，拒绝重复建`)
  }
}

/** 态转移边（state-transition 受控枚举）。 */
function stateTransition(id, source, target, label) {
  semanticEdge(id, source, target, 'transitions-to', 'state-transition', label)
  return id
}

/** 新建池节点 + 树条目（挂 parentTreeId 下）+ belongs-to 边。 */
function ensureNode(ref, label, content, parentTreeId, { kind = 'concept', role = 'plain', tags = [], dimensions = [] } = {}) {
  if (pool[ref]) { log(`  复用节点「${label}」(${ref})`); return ref }
  pool[ref] = {
    id: ref,
    label,
    role,
    dimensions,
    tags: tags.length > 0 ? tags : [label],
    kind,
    card: {
      nodeId: ref,
      title: label,
      tabs: [{ id: 'def', label: '定义', content }],
      rootContent: `${label}\n\n${content}`,
    },
  }
  const parent = byId(parentTreeId)
  if (!parent) throw new Error(`新建「${label}」父 ${parentTreeId} 不存在`)
  const entry = { id: `asplit_s2_${ref}`, name: label, count: 0, nodeRef: ref, children: [] }
  attachChild(parent.node, entry)
  const edge = createTreeBindingEdge({ tree, pool, parentTreeId, childTreeId: entry.id, childKnowledgeId: ref })
  if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
  createdNodes.push(ref)
  log(`  新节点「${label}」(${ref}) @「${parent.node.name}」`)
  return ref
}

/** 正文并入宿主池卡（tab id 冲突即报错，防互相覆盖）。 */
function cardTab(ref, id, label, content) {
  const p = pool[ref]
  if (!p) throw new Error(`cardTab: 池节点 ${ref} 不存在`)
  if (!content || content.trim().length === 0) { log(`  正文 0 字，跳过 tab「${label}」(${ref})`); return 0 }
  if (!p.card) p.card = { nodeId: ref, title: p.label, tabs: [] }
  if (!Array.isArray(p.card.tabs)) p.card.tabs = []
  if (p.card.tabs.some((t) => t.id === id)) throw new Error(`tab ${id} 已存在于 ${ref}`)
  p.card.tabs.push({ id, label, content })
  log(`  正文并入「${p.label}」卡 tab「${label}」（${content.length} 字）`)
  return content.length
}

/** 挂 mechanismSpec（宿主转 kind=mechanism）。 */
function setSpec(hostRef, { trigger = [], participants = [], states = [], transitions = [], outcome = [], failure = [] }) {
  const p = pool[hostRef]
  if (!p) throw new Error(`setSpec: ${hostRef} 不在池`)
  if (p.mechanismSpec) throw new Error(`setSpec: ${hostRef} 已有 spec，拒绝重复建`)
  p.mechanismSpec = {
    phenomenonNodeId: hostRef,
    triggerNodeIds: trigger,
    participantNodeIds: participants,
    stateNodeIds: states,
    transitionEdgeIds: transitions,
    constraintEdgeIds: [],
    outcomeNodeIds: outcome,
    failureNodeIds: failure,
  }
  p.kind = 'mechanism'
  const ids = [...trigger, ...participants, ...states, ...outcome, ...failure]
  for (const id of ids) if (!pool[id]) throw new Error(`spec 引用 ${id} 不在池（会变悬空引用）`)
  log(`  mechanismSpec → 「${p.label}」：触发 ${trigger.length} / 参与 ${participants.length} / 态 ${states.length} / 转移 ${transitions.length} / 终态 ${outcome.length} / 失败 ${failure.length}`)
  return p.mechanismSpec
}

/** 挂 viewDimensions（网格）。 */
function addDims(ref, dims) {
  const p = pool[ref]
  if (!p) throw new Error(`addDims: ${ref} 不在池`)
  if (p.viewDimensions?.length > 0) throw new Error(`addDims: ${ref} 已有 viewDimensions`)
  for (const d of dims) {
    for (const s of d.sections) {
      for (const a of s.atoms) if (!pool[a.nodeId]) throw new Error(`dims 原子 ${a.nodeId} 不在池`)
    }
  }
  p.viewDimensions = dims
  log(`  viewDimensions → 「${p.label}」：${dims.length} 维度 / ${dims.reduce((n, d) => n + d.sections.length, 0)} section`)
}

function unloadTreeEntry(id, tag) {
  const rec = byId(id)
  if (!rec) throw new Error(`${tag}: 树条目 ${id} 不存在`)
  detachChild(rec.parent, id)
  unloadedTreeIds.add(id)
  const removed = dropTreebindEdgesForTreeIds(edges, [id])
  log(`  卸树条目「${rec.node.name}」(${id})，删 treebind ${removed} 条`)
}

function gateAndDrop(nodeRef, tag, { keepPool = false } = {}) {
  const scan = gateScan(state, [nodeRef], { excludeTreeIds: [...unloadedTreeIds] })
  if (keepPool) {
    keptPoolRefs.add(nodeRef)
    log(`  池节点保留（spec 活引用特判）：${nodeRef}`)
    if (scan.hits.length > 0) log(`    （仍被引用 ${scan.hits.length} 处，符合预期）`)
    return
  }
  if (scan.hits.length > 0) {
    log(`  ✗ ${tag} 门禁命中：`)
    for (const h of scan.hits) log('    ! ' + h)
    process.exit(1)
  }
  if (pool[nodeRef]) { delete pool[nodeRef]; droppedPoolRefs.add(nodeRef); log(`  退池：${nodeRef}`) }
}
const keptPoolRefs = new Set()

/** 提级孩子到父节点。 */
function promoteKids(rec) {
  const kids = [...(rec.node.children ?? [])]
  if (kids.length === 0) { log('  （无孩子）'); return }
  for (const kid of kids) {
    detachChild(rec.node, kid.id)
    attachChild(rec.parent, kid)
    log(`  提级：「${kid.name}」→「${rec.parent.name}」`)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: rec.parent.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef })
    if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
  }
}

/** 只改树条目名（池 label 同步）。 */
function renameTree(id, newName, { alsoPoolLabel = true } = {}) {
  const rec = byId(id)
  if (!rec) throw new Error(`renameTree: ${id} 不存在`)
  const old = rec.node.name
  rec.node.name = newName
  if (alsoPoolLabel && pool[rec.node.nodeRef]) pool[rec.node.nodeRef].label = newName
  renamed.push(`${old} → ${newName}`)
  log(`  改名：「${old}」→「${newName}」`)
}

const specDims = (ref) => pool[ref]?.dimensions ?? []

log('═══ A-split §二 机制沉淀 / 维度网格 ═══')
log(`起始 ${statLine(state)}`)

// ══════════════════════════════════════════════════════════════════════
// A. mechanismSpec 净增 6 个
// ══════════════════════════════════════════════════════════════════════

log('\n── [spec-1] #21+#22 偏向锁（批量重偏向/撤销 + 获取/释放合并为一个 spec）──')
{
  const host = 'k_web_78137b704e08'          // 「偏向锁」
  const hostTree = 'tree_web_78137b704e08'
  const dims = specDims(host)
  const s1 = byId('tree_web_78137b704e08_s1')
  const s23 = byId('tree_web_78137b704e08_s2_s3')
  cardTab(host, 'context:asplit:s21', '批量重偏向和撤销（原文）', shellContent(pool[s1.node.nodeRef]))
  cardTab(host, 'context:asplit:s22', '获取偏向锁和释放锁（原文）', shellContent(pool[s23.node.nodeRef]))

  const t = ensureNode('asplit_bias_acquire', '线程进入同步代码块', '线程首次访问同步代码块，请求获取对象锁——偏向锁的入口事件。', hostTree, { kind: 'event', role: 'axiom', dimensions: dims })
  const st = [
    ensureNode('asplit_bias_state_anonymous', '匿名偏向态', '锁对象的 Mark Word 低 2 位为 01 且线程 ID 为空：对象可偏向但尚未偏向任何线程。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_bias_state_biased', '已偏向态（记录线程 ID）', '通过一次 CAS 把当前线程 ID 写入对象头 Mark Word，此后同一线程进入同步块不再需要任何原子操作。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_bias_state_revoke_pending', '撤销中（到达安全点）', '其他线程尝试获取该偏向锁时触发撤销：原持有线程必须到达全局安全点（safepoint）才能继续。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_bias_state_revoked', '已撤销（升级轻量级锁）', '偏向锁被撤销，对象头退回不可偏向状态，后续竞争走轻量级锁/重量级锁路径。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_bias_state_bulk_rebiased', '批量重偏向（epoch 递增）', '同一个类的撤销次数达到阈值（默认 20）后，JVM 把该类的 epoch 递增，使该类所有对象的偏向失效，下一个获取锁的线程成为新偏向者——避免逐个撤销的昂贵操作。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_bias_state_bulk_revoked', '批量撤销（整类禁用偏向）', '同一个类的撤销次数继续增长到阈值（默认 40）后，JVM 直接批量撤销该类所有对象的偏向锁并禁用该类的偏向（-XX:-UseBiasedLocking 的等效路径）。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
  ]
  const [anonymous, biased, pending, revoked, rebias, bulkRevoke] = st
  const mark = ensureNode('asplit_bias_markword', '对象头 Mark Word', 'Mark Word 记录哈希码、GC 分代年龄与锁标志位；偏向锁状态用「线程 ID | epoch | 分代年龄 | 1 | 01」编码。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims })
  const tr = [
    stateTransition('asplit:s21:t1', anonymous, biased, 'CAS 写入线程 ID 成功'),
    stateTransition('asplit:s21:t2', biased, pending, '其他线程竞争，触发撤销'),
    stateTransition('asplit:s21:t3', pending, revoked, '原持有线程到达安全点，撤销完成'),
    stateTransition('asplit:s21:t4', revoked, rebias, '同类撤销达 20 次 → 批量重偏向'),
    stateTransition('asplit:s21:t5', rebias, biased, '新线程成为偏向者'),
    stateTransition('asplit:s21:t6', revoked, bulkRevoke, '同类撤销达 40 次 → 批量撤销并禁用'),
  ]
  setSpec(host, { trigger: [t], participants: [host, mark], states: st, transitions: tr, outcome: [biased], failure: [revoked, bulkRevoke] })
  unloadTreeEntry(s1.node.id, '#21')
  unloadTreeEntry(s23.node.id, '#22')
  gateAndDrop(s1.node.nodeRef, '#21')
  gateAndDrop(s23.node.nodeRef, '#22')
}

log('\n── [spec-2] #26+#27 读写锁实现机制（读/写两态轨合并为一个 spec）──')
{
  const host = 'asplit_rwlock_mechanism'      // 新建 mechanism 宿主（不污染 JDK entity 节点的 kind）
  const hostTree = 'tree_1786026688588_0mtvxh' // 「读写锁的实现分析」
  const rw = 'k_java_type_8d5f9e754651308e'  // ReentrantReadWriteLock
  const stateDesign = 'k_1786026730910_m3rub2' // 「读写状态的设计」
  const dims = specDims(rw)
  ensureNode(host, '读写锁实现机制', 'ReentrantReadWriteLock 用一个 32 位 state 同时编码读锁与写锁：高 16 位为读状态（共享，可被多线程持有），低 16 位为写状态（独占，可重入）。读锁与写锁互斥，读读不互斥。', hostTree, { kind: 'mechanism', role: 'mechanism', dimensions: dims })
  log(`  宿主读写锁 entity：${rw}「${pool[rw].label}」`)
  const writeTree = byId('tree_1786027327291_illczq')
  const readTree = byId('tree_1786027471452_gdk2ij')
  cardTab(rw, 'context:asplit:s26', '写锁的获取与释放（原文）', shellContent(pool[writeTree.node.nodeRef]))
  cardTab(rw, 'context:asplit:s27', '读锁的获取与释放（原文）', shellContent(pool[readTree.node.nodeRef]))
  cardTab(host, 'context:asplit:s26', '写锁的获取与释放（原文）', shellContent(pool[writeTree.node.nodeRef]))
  cardTab(host, 'context:asplit:s27', '读锁的获取与释放（原文）', shellContent(pool[readTree.node.nodeRef]))

  const st = [
    ensureNode('asplit_rw_state_write_acquire', '写锁申请（tryAcquire）', '写锁是支持重进入的排它锁：读状态为 0 或当前线程已是写锁持有者时写状态 +1，否则进入等待。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rw_state_write_held', '写锁持有（独占可重入）', '写状态被当前线程持有，其他线程的读/写申请一律阻塞。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rw_state_write_waiting', '写锁等待', '读锁被占用或当前线程不是写锁持有者时，写锁申请失败并进入同步队列等待。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rw_state_write_released', '写锁释放（tryRelease）', '写状态完全归零时释放独占持有，唤醒同步队列中的后继节点。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rw_state_read_acquire', '读锁申请（tryAcquireShared）', '读锁是共享锁：写状态为 0 时读状态累加成功；写锁被其他线程持有时进入等待。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rw_state_read_held', '读锁持有（共享可重入）', '读状态是所有线程获取读锁次数的总和；每个线程各自的次数保存在 ThreadLocal 中（getReadHoldCount）。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rw_state_read_waiting', '读锁等待', '写锁被其他线程持有时读锁申请失败，进入共享模式等待。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rw_state_read_released', '读锁释放（tryReleaseShared）', '读状态递减，归零时唤醒等待中的写锁申请。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
  ]
  const [wa, wh, ww, wr, ra, rh, rw2, rr] = st
  const tr = [
    stateTransition('asplit:s26:t1', wa, wh, '写状态 +1，获取成功'),
    stateTransition('asplit:s26:t2', wa, ww, '读状态非 0 或非持有者，申请失败'),
    stateTransition('asplit:s26:t3', ww, wh, '读锁释放后被唤醒，重试成功'),
    stateTransition('asplit:s26:t4', wh, wr, '写状态归零，释放独占'),
    stateTransition('asplit:s27:t1', ra, rh, '写状态为 0，读状态累加'),
    stateTransition('asplit:s27:t2', ra, rw2, '写锁被其他线程持有，申请失败'),
    stateTransition('asplit:s27:t3', rw2, rh, '写锁释放后被唤醒，重试成功'),
    stateTransition('asplit:s27:t4', rh, rr, '读状态递减'),
  ]
  setSpec(host, { trigger: [wa], participants: [rw, stateDesign, host], states: st, transitions: tr, outcome: [rh], failure: [] })
  unloadTreeEntry(writeTree.node.id, '#26')
  unloadTreeEntry(readTree.node.id, '#27')
  gateAndDrop(writeTree.node.nodeRef, '#26')
  gateAndDrop(readTree.node.nodeRef, '#27')
}

log('\n── [spec-3] #31 对象创建与内存分配（宿主 Windows：JVM 内存管理）──')
{
  const host = 'k_1783263380028_2hhr2a'      // 「内存管理」
  const hostTree = 'tree_1783263380057_57s6hh'
  const src = byId('tree_1786353277269_msn0ma9ds')
  const dims = specDims(host)
  cardTab(host, 'context:asplit:s31', '对象创建与内存分配（原文）', shellContent(pool[src.node.nodeRef]))
  const t = ensureNode('asplit_obj_trigger_new', 'new 指令触发对象创建', '字节码 new 指令到达：JVM 先检查常量池中的类符号引用是否已加载、链接并初始化。', hostTree, { kind: 'event', role: 'axiom', dimensions: dims })
  const st = [
    ensureNode('asplit_obj_state_class_loaded', '类型加载校验', '检查对象所属类型是否已被加载、链接与初始化，未加载则先走类加载流程。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_obj_state_alloc', '分配内存', '从 Java 堆划分内存：规整的用「指针碰撞」，碎片化的用「空闲列表」；并发分配靠 CAS + TLAB 保证原子性。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_obj_state_zerofill', '零值填充', '把分配到的内存空间全部置为零值，保证实例字段不显式赋初值也能直接使用。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_obj_state_set_header', '设置对象头', '写入 Mark Word（哈希码 / GC 分代年龄 / 锁状态标志）与类型指针（指向方法区类元数据）。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_obj_state_init', '执行构造方法', '调用 <init>，按代码顺序初始化实例字段、执行实例代码块与父类构造。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_obj_state_reference', '引用定位（对象可用）', '对象创建完成，栈上引用通过句柄或直接指针定位堆中对象。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
  ]
  const [loaded, alloc, zerofill, header, init, ref] = st
  const tlab = ensureNode('asplit_obj_alloc_tlab', 'TLAB（线程本地分配缓冲）', '每个线程在 Eden 预分配一小块私有内存，分配对象优先在 TLAB 内指针碰撞，避免全局 CAS 竞争；TLAB 用尽才走共享堆 + CAS。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims })
  const handle = ensureNode('asplit_obj_access_handle', '句柄访问', '栈上的引用指向堆中的句柄池，句柄再分别指向对象实例数据与类型数据；对象移动时只需改句柄。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims })
  const direct = ensureNode('asplit_obj_access_direct', '直接指针', '栈上的引用直接指向对象实例数据，类型数据由对象头的类型指针给出；少一次间接寻址，HotSpot 默认。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims })
  const oom = ensureNode('asplit_obj_state_oom', '内存溢出（OutOfMemoryError）', '堆空间不足且无法扩展时抛出 OutOfMemoryError；长生命周期对象持续被引用则表现为内存泄漏。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims })
  const tr = [
    stateTransition('asplit:s31:t1', t, loaded, '常量池符号引用校验通过'),
    stateTransition('asplit:s31:t2', loaded, alloc, '进入堆内存划分'),
    stateTransition('asplit:s31:t3', alloc, zerofill, '内存划分完成，开始置零'),
    stateTransition('asplit:s31:t4', zerofill, header, '零值填充完成，写对象头'),
    stateTransition('asplit:s31:t5', header, init, '对象头就绪，执行构造'),
    stateTransition('asplit:s31:t6', init, ref, '构造完成，返回可用引用'),
    stateTransition('asplit:s31:t7', alloc, oom, '堆空间不足，分配失败'),
  ]
  setSpec(host, { trigger: [t], participants: [host, tlab, handle, direct], states: st, transitions: tr, outcome: [ref], failure: [oom] })
  unloadTreeEntry(src.node.id, '#31')
  gateAndDrop(src.node.nodeRef, '#31')
}

log('\n── [spec-4] #67 SqlSession 生命周期（宿主即自身，保留挂载）──')
{
  const host = 'k_vault_javamybatis02sqlsession_5c5wcf'
  const hostTree = byId('tree_vault_javamybatis02sqlsession_5c5wcf').node.id
  const dims = specDims(host)
  const t = ensureNode('asplit_ss_trigger_open', 'openSession() 请求', '应用通过 SqlSessionFactory.openSession() 申请一个会话。', hostTree, { kind: 'event', role: 'axiom', dimensions: dims })
  const st = [
    ensureNode('asplit_ss_state_opened', '会话已打开', 'SqlSession 持有 Executor 与数据库连接，事务未提交。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_ss_state_executing', '执行 SQL', 'Mapper 接口调用转入 Executor 链路（缓存 → StatementHandler → JDBC）。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_ss_state_dirty', '待提交（一级缓存有变更）', '写操作落在本地一级缓存与连接事务里，尚未对数据库生效。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_ss_state_committed', '已提交', 'commit() 提交事务并清空本地一级缓存，避免脏读。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_ss_state_rolled_back', '已回滚', 'rollback() 撤销本会话内的未提交变更。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_ss_state_closed', '已关闭', 'close() 归还连接、释放 Executor；SqlSession 必须短生命周期，否则连接池耗尽。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
  ]
  const [opened, executing, dirty, committed, rolled, closed] = st
  const fac = ensureNode('asplit_ss_factory', 'SqlSessionFactory（单例）', 'SqlSessionFactory 构建一次、全局单例；每次请求由它开出短生命周期的 SqlSession。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims })
  const tr = [
    stateTransition('asplit:s67:t1', t, opened, 'openSession 返回会话'),
    stateTransition('asplit:s67:t2', opened, executing, 'Mapper 调用进入 Executor'),
    stateTransition('asplit:s67:t3', executing, dirty, '写操作落入本地事务与一级缓存'),
    stateTransition('asplit:s67:t4', dirty, committed, 'commit() 提交并清空一级缓存'),
    stateTransition('asplit:s67:t5', dirty, rolled, 'rollback() 回滚'),
    stateTransition('asplit:s67:t6', committed, closed, 'close() 归还连接'),
    stateTransition('asplit:s67:t7', rolled, closed, 'close() 归还连接'),
  ]
  setSpec(host, { trigger: [t], participants: [fac, 'k_java_fw_mybatis'], states: st, transitions: tr, outcome: [closed], failure: [] })
  renameTree(hostTree, 'SqlSession 生命周期')
}

log('\n── [spec-5] #96 RDB 创建与载入（BGSAVE 流程）──')
{
  const host = 'k_1786245816863_ntvyz2'      // 「RDB持久化」
  const hostTree = 'tree_1786245817114_ds2keo'
  const src = byId('tree_1786246332852_q2l10q')
  const dims = specDims(host)
  cardTab(host, 'context:asplit:s96', 'RDB 文件的创建与载入（原文）', shellContent(pool[src.node.nodeRef]))
  const save = ensureNode('asplit_rdb_save_cmd', 'SAVE / BGSAVE 命令到达', 'SAVE 阻塞主进程直到快照完成；BGSAVE fork 出子进程后主进程继续服务。', hostTree, { kind: 'event', role: 'axiom', dimensions: dims })
  const st = [
    ensureNode('asplit_rdb_state_fork', 'fork 子进程（写时复制）', '主进程 fork 出子进程，父子共享内存页；写时复制保证快照期间的数据视图一致。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rdb_state_child_write', '子进程写临时 RDB 文件', '子进程把当前数据集序列化写入临时文件，不阻塞父进程的命令处理。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rdb_state_parent_serve', '父进程继续处理命令', '父进程照常接受读写命令；期间发生的修改不会进入本次快照。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rdb_state_replaced', '临时文件原子替换 dump.rdb', '写完后用 rename 原子替换旧 RDB 文件，保证磁盘上始终有一份完整快照。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_rdb_state_loaded', '启动时载入 RDB 恢复数据', 'Redis 启动时读取 dump.rdb 重建内存数据集；RDB 是默认持久化方式。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
  ]
  const [fork, childWrite, parentServe, replaced, loaded] = st
  const tr = [
    stateTransition('asplit:s96:t1', save, fork, 'BGSAVE fork 子进程'),
    stateTransition('asplit:s96:t2', fork, childWrite, '子进程开始序列化'),
    stateTransition('asplit:s96:t3', fork, parentServe, '父进程不阻塞'),
    stateTransition('asplit:s96:t4', childWrite, replaced, '写完后原子替换'),
    stateTransition('asplit:s96:t5', parentServe, replaced, '父进程侧快照落盘'),
    stateTransition('asplit:s96:t6', replaced, loaded, '重启时载入'),
  ]
  setSpec(host, { trigger: [save], participants: [host, 'k_1786245301433_seqw47'], states: st, transitions: tr, outcome: [loaded], failure: [] })
  unloadTreeEntry(src.node.id, '#96')
  gateAndDrop(src.node.nodeRef, '#96')
}

log('\n── [spec-6] #99 连接与线程状态（MySQL 连接生命周期）──')
{
  const host = 'qproc_thread_state'
  const hostTree = 'tree_qproc_thread_state'
  const dims = specDims(host)
  const st = [
    ensureNode('asplit_conn_state_handshake', 'TCP 连接建立', '客户端经 Connectors 与 MySQL 建立 TCP 连接（三次握手）。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_conn_state_auth', '认证与权限校验', '校验用户名、密码与来源主机，加载该账号的权限表。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_conn_state_alloc_thread', '分配线程', '服务端为该连接分配一个线程（one-thread-per-connection 或线程池）。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_conn_state_user_thread', '用户线程执行命令', '线程进入命令循环，处理该会话发来的 SQL。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_conn_state_sleep', 'Sleep 空闲等待', '会话空闲等待下一条命令，超过 wait_timeout 将被服务端回收。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
    ensureNode('asplit_conn_state_closing', '连接关闭', '客户端 Quit 或超时后，线程回收、连接释放。', hostTree, { kind: 'state', role: 'conclusion', dimensions: dims }),
  ]
  const [handshake, auth, allocT, userT, sleep, closing] = st
  const poolNode = ensureNode('asplit_conn_pool', 'Connection Pool（连接池）', '连接池复用物理连接，避免频繁握手与认证；连接与线程状态通过 SHOW PROCESSLIST / performance_schema 观测。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims })
  const tr = [
    stateTransition('asplit:s99:t1', handshake, auth, 'TCP 建立后进入认证'),
    stateTransition('asplit:s99:t2', auth, allocT, '认证通过，分配服务线程'),
    stateTransition('asplit:s99:t3', allocT, userT, '线程进入命令循环'),
    stateTransition('asplit:s99:t4', userT, sleep, '命令处理完毕，空闲等待'),
    stateTransition('asplit:s99:t5', sleep, userT, '收到下一条命令'),
    stateTransition('asplit:s99:t6', sleep, closing, '空闲超时被回收'),
    stateTransition('asplit:s99:t7', userT, closing, '客户端 Quit'),
  ]
  setSpec(host, { trigger: [handshake], participants: [poolNode, 'k_1782032242225_z23eqn'], states: st, transitions: tr, outcome: [closing], failure: [] })
}

// ══════════════════════════════════════════════════════════════════════
// B. viewDimensions 3 个
// ══════════════════════════════════════════════════════════════════════

log('\n── [dims-1] #32 垃圾回收与收集器 → 「垃圾回收」收集器网格 ──')
{
  const host = 'k_1783171786650_rheusm'      // 「垃圾回收」
  const src = byId('tree_vault_javajvm03_uitasu')
  cardTab(host, 'context:asplit:s32', '垃圾回收与收集器（原文）', shellContent(pool[src.node.nodeRef]))
  const dims = [{
    id: 'gc_taxonomy',
    name: '垃圾回收分类',
    color: '#7A5AF8',
    hint: '同一批回收知识原子，按收集器、回收类型、回收算法三套规矩分别投影。',
    sections: [
      {
        id: 'gc_collector_grid',
        title: '按收集器',
        layout: 'grid',
        atoms: [
          { nodeId: 'k_1783171576583_0k6kre', desc: '串行收集器：单线程 Stop-The-World' },
          { nodeId: 'k_1783171541433_akjz47', desc: '并行收集器：多线程并行回收，关注吞吐量' },
          { nodeId: 'k_jvm_cms', desc: 'CMS：并发标记清除，关注低停顿' },
          { nodeId: 'k_1783171609391_x3bqux', desc: 'G1：分区回收，可预测停顿模型' },
        ],
      },
      {
        id: 'gc_type_grid',
        title: '按回收类型',
        layout: 'grid',
        atoms: [
          { nodeId: 'k_1783171646604_yn33rr', desc: 'Minor GC：新生代回收，频繁且快' },
          { nodeId: 'k_1783171669928_46ncd4', desc: 'Full GC：整堆回收，停顿长' },
        ],
      },
      {
        id: 'gc_algo_grid',
        title: '按回收算法',
        layout: 'grid',
        atoms: [
          { nodeId: 'k_atom_mark_sweep', desc: '标记-清除：产生内存碎片' },
          { nodeId: 'k_atom_copying', desc: '标记-复制：新生代主流' },
          { nodeId: 'k_atom_mark_compact', desc: '标记-整理：老年代主流' },
          { nodeId: 'k_1783171867549_lp5mbv', desc: '分代收集：按对象年龄分区施策' },
          { nodeId: 'k_1783263986077_nrp20e', desc: '增量回收器：把停顿切成小段' },
        ],
      },
    ],
    groups: [],
  }]
  addDims(host, dims)
  unloadTreeEntry(src.node.id, '#32')
  gateAndDrop(src.node.nodeRef, '#32')
}

log('\n── [dims-2] #69 MyBatis 执行机制与插件 → 插件网格 ──')
{
  const host = 'k_java_fw_mybatis'
  const hostTree = 'tree_java_fw_mybatis'
  const src = byId('tree_vault_javamybatis05_qwqa86')
  cardTab(host, 'context:asplit:s69', 'MyBatis 执行机制与插件（原文）', shellContent(pool[src.node.nodeRef]))
  const dims = specDims(host)
  const pts = [
    ensureNode('asplit_mybatis_executor', 'Executor（插件点）', 'Executor 调度一级/二级缓存与 StatementHandler，是最外层的插件切入点。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims }),
    ensureNode('asplit_mybatis_statement_handler', 'StatementHandler（插件点）', 'StatementHandler 负责创建 JDBC Statement、设置参数并执行 SQL。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims }),
    ensureNode('asplit_mybatis_parameter_handler', 'ParameterHandler（插件点）', 'ParameterHandler 把 Java 参数映射到 PreparedStatement 的占位符。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims }),
    ensureNode('asplit_mybatis_resultset_handler', 'ResultSetHandler（插件点）', 'ResultSetHandler 把结果集映射为 Java 对象。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims }),
  ]
  addDims(host, [{
    id: 'mybatis_plugin',
    name: '插件与执行链',
    color: '#2F80ED',
    hint: 'MyBatis 只允许在四大对象上插桩；插件通过动态代理包装这四者，责任链越靠后越贴近 JDBC。',
    sections: [{
      id: 'mybatis_plugin_grid',
      title: '四大对象插件点',
      layout: 'grid',
      atoms: pts.map((id, i) => ({ nodeId: id, desc: ['调度缓存与语句处理', '创建 Statement 并执行 SQL', '参数映射', '结果集映射'][i] })),
    }],
    groups: [],
  }])
  unloadTreeEntry(src.node.id, '#69')
  gateAndDrop(src.node.nodeRef, '#69')
}

log('\n── [dims-3] #112 系统管理和控制工具 → MySQL 服务层工具网格 ──')
{
  const host = 'k_1782032275682_61auc4'      // 「服务层」
  const hostTree = 'projection:mysql-concept:mysql-server-structure:k_1782032275682_61auc4'
  const src = byId('tree_1782032936994_e5wpwn')
  cardTab(host, 'context:asplit:s112', '系统管理和控制工具（原文）', shellContent(pool[src.node.nodeRef]))
  const dims = specDims(host)
  const tools = [
    ensureNode('asplit_mysql_tool_backup', '备份恢复工具', '备份恢复：逻辑备份 mysqldump / 物理热备 XtraBackup，配合 binlog 做时间点恢复（PITR）。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims }),
    ensureNode('asplit_mysql_tool_security', '安全管理工具', '安全管理：账号与权限表、审计日志、SSL/TLS 传输加密与数据脱敏。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims }),
    ensureNode('asplit_mysql_tool_cluster', '集群管理工具', '集群管理：MySQL Shell / Router / NDB Cluster Manager 等集群生命周期与拓扑管理入口。', hostTree, { kind: 'concept', role: 'axiom', dimensions: dims }),
  ]
  addDims(host, [{
    id: 'mysql_service_tools',
    name: '服务层工具',
    color: '#EB5757',
    hint: '服务层除 SQL 接口外，还承载系统管理与控制工具——备份恢复、安全管理、集群管理。',
    sections: [{
      id: 'mysql_service_tools_grid',
      title: '管理与控制工具',
      layout: 'grid',
      atoms: [
        { nodeId: tools[0], desc: '备份恢复' },
        { nodeId: tools[1], desc: '安全管理' },
        { nodeId: tools[2], desc: '集群管理' },
        { nodeId: 'k_1787326561953_xdo0fj', desc: 'Instance Manager / Admin / Migration' },
      ],
    }],
    groups: [],
  }])
  unloadTreeEntry(src.node.id, '#112')
  gateAndDrop(src.node.nodeRef, '#112')
}

// ══════════════════════════════════════════════════════════════════════
// C. merge / supp / rename / skip
// ══════════════════════════════════════════════════════════════════════

log('\n── [merge] #7 启动和终止线程（0 字，孩子并入「线程的状态」）──')
{
  const rec = byId('tree_1785946331018_mmdk1t')
  cardTab(rec.node.nodeRef, 'context:asplit:s7', '启动和终止线程（原文）', shellContent(pool[rec.node.nodeRef]))
  const target = byRef('k_1785934396536_as412a')[0]
  if (!target) throw new Error('#7: 目标「线程的状态」树条目不存在')
  const kids = [...(rec.node.children ?? [])]
  for (const kid of kids) {
    detachChild(rec.node, kid.id)
    attachChild(target.node, kid)
    log(`  并入：「${kid.name}」→「${target.node.name}」`)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: target.node.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef })
    if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
  }
  unloadTreeEntry(rec.node.id, '#7')
  gateAndDrop(rec.node.nodeRef, '#7')
}

log('\n── [supp] #14 初始化 segmentShift / segmentMask → ConcurrentHashMap ──')
{
  const rec = byId('tree_1786031584832_7o3jcd')
  cardTab('k_java_type_48031e8c20570051', 'context:asplit:s14', '初始化段（segmentShift / segmentMask）', shellContent(pool[rec.node.nodeRef]))
  unloadTreeEntry(rec.node.id, '#14')
  gateAndDrop(rec.node.nodeRef, '#14')
}

log('\n── [supp] #23 锁的释放和获取的内存语义 → synchronized 锁 ──')
{
  const rec = byId('tree_1785930411319_cle9u2')
  cardTab('k_java_thread_lock', 'context:asplit:s23', '锁的内存语义', shellContent(pool[rec.node.nodeRef]))
  unloadTreeEntry(rec.node.id, '#23')
  gateAndDrop(rec.node.nodeRef, '#23')
}

log('\n── [supp] #63 IoC 理解与初始化 → IoC 容器 ──')
{
  const rec = byId('tree_vault_javaspringiocioc_1jelty')
  cardTab('k_java_fw_spring_ioc', 'context:asplit:s63', 'IoC 理解与初始化', shellContent(pool[rec.node.nodeRef]))
  unloadTreeEntry(rec.node.id, '#63')
  gateAndDrop(rec.node.nodeRef, '#63')
}

log('\n── [merge] #64 创建和管理 beans → bcs_flow（保护名单：宿主不是泛 IoC 容器）──')
{
  const rec = byId('tree_1784445382663_j21qah')
  cardTab('bcs_flow', 'context:asplit:s64', '创建和管理 beans', shellContent(pool[rec.node.nodeRef]))
  promoteKids(rec)
  unloadTreeEntry(rec.node.id, '#64')
  gateAndDrop(rec.node.nodeRef, '#64')
}

log('\n── [merge] #114 查询与语句执行 → qproc_flow（spec 已存在，零重建）──')
{
  const rec = byId('projection:mysql-mysqld:mysql:mysqld-layer:execute:mysql_sql_query_execution:0')
  cardTab('qproc_flow', 'context:asplit:s114', '查询与语句执行', shellContent(pool[rec.node.nodeRef]))
  promoteKids(rec)
  unloadTreeEntry(rec.node.id, '#114')
  gateAndDrop(rec.node.nodeRef, '#114')
}

log('\n── [rename] #61 getBean（aop_flow.triggerNodeIds 活引用 → 只改名，不退池）──')
{
  const rec = byId('tree_aop_getbean')
  const spec = pool['aop_flow'].mechanismSpec
  if (!spec || !spec.triggerNodeIds.includes('aop_getbean')) {
    throw new Error('#61: aop_flow.triggerNodeIds 未引用 aop_getbean，与工单假设不符')
  }
  renameTree(rec.node.id, 'getBean 请求')
  gateAndDrop('aop_getbean', '#61', { keepPool: true })
}

log('\n── [rename] #107 I/O 线程与 relay log（已由 msr_flow 承载 → 跳过重建，只改名）──')
{
  const rec = byId('tree_msr_io_thread')
  if (pool['msr_io_thread'].mechanismSpec) throw new Error('#107: msr_io_thread 自己已有 spec，与工单假设不符')
  const spec = pool['msr_flow'].mechanismSpec
  if (!spec.participantNodeIds.includes('msr_io_thread') || !spec.stateNodeIds.includes('msr_state_relayed')) {
    throw new Error('#107: msr_flow 未同时引用 msr_io_thread 与 msr_state_relayed')
  }
  const relayLog = byId('tree_msr_relay_log')
  if (!relayLog) throw new Error('#107: relay log 独立条目不存在')
  renameTree(rec.node.id, 'I/O 线程（从库）')
  log(`  跳过重建：msr_flow 已含「${rec.node.name}」与「${relayLog.node.name}」两个独立节点`)
  gateAndDrop('msr_io_thread', '#107', { keepPool: true })
}

log('\n── [supp] #121 Mesa 监视器示例（载体落地为卡片 tab：本仓无 pages 字段）──')
{
  const rec = byId('tree_wiki_en_monitor_synchronization_s2_s10_s11')
  cardTab(rec.node.nodeRef, 'context:asplit:s121', 'Mesa 监视器代码示例', shellContent(pool[rec.node.nodeRef]))
  renameTree(rec.node.id, 'Mesa 监视器示例')
}

// ══════════════════════════════════════════════════════════════════════

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条`)
log(`卸树 ${unloadedTreeIds.size} 条 · 退池 ${droppedPoolRefs.size} 个 · 保池 ${keptPoolRefs.size} 个`)
log(`新建节点 ${createdNodes.length} 个 · 新建边 ${addedEdges.length} 条 · 改名 ${renamed.length} 处`)
log(`新 spec 宿主：${createdNodes.filter((r) => pool[r]?.mechanismSpec).length} 个（新建）+ 既有 spec 未动 8 个`)
log(`改名明细：\n  ${renamed.join('\n  ') || '(无)'}`)

const specHosts = Object.values(pool).filter((n) => n.mechanismSpec).map((n) => n.id)
log(`全库 mechanismSpec 宿主 ${specHosts.length} 个：\n  ${specHosts.join('\n  ')}`)

if (apply) {
  saveAll({ pool, tree, edges, questions: state.questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
