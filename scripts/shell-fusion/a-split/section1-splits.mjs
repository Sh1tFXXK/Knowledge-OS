/**
 * A-split §一：拆分为「双正身名词 + 显式关系边」（54 条 + #48 关联处置）。
 * 通用序列：定位/新建两正身 → 正文按主题归位（无主题倾向进 supplement「概述」）→
 * 建边（relationKind 受控枚举 + type 人读）→ 卸树条目 → 门禁 → 退原 nodeRef。
 *
 * 特判：
 *   #62 aop_proxyfactory 是 aop_flow spec participant → 保池不退（#61 先例）；
 *   #48 挂在本批 #47 下，随本批处理（java.io 分类网格）。
 *
 * 用法：
 *   node scripts/shell-fusion/a-split/section1-splits.mjs           # 干跑
 *   node scripts/shell-fusion/a-split/section1-splits.mjs --apply   # 落盘
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
const keptPoolRefs = new Set()
const addedEdges = []

function semanticEdge(id, source, target, type, relationKind, label) {
  const ALLOWED = ['structure', 'classification', 'dependency', 'causality', 'state-transition', 'constraint', 'evidence', 'reference']
  if (!ALLOWED.includes(relationKind)) throw new Error(`relationKind ${relationKind} 不在受控枚举`)
  const edge = { id, source, target, type, label, relationKind, dimensions: [] }
  if (upsertEdge(edges, edge)) {
    addedEdges.push(id)
    log(`  建边 ${id}：${source} -[${type}/${relationKind}]-> ${target}`)
  }
}

/** 正身解析：ref 优先；label 精确→包含/别名（唯一才过）。 */
function entity(spec) {
  if (spec.ref) {
    if (!pool[spec.ref]) throw new Error(`正身 ref ${spec.ref} 不在池`)
    return spec.ref
  }
  const q = spec.label
  const exact = Object.values(pool).filter((n) => n.label === q)
  if (exact.length === 1) return exact[0].id
  const loose = Object.values(pool).filter((n) => (n.label ?? '').includes(q) || (n.aliases ?? []).some((a) => (a ?? '').includes(q)))
  const uniq = [...new Map(loose.map((n) => [n.id, n])).values()]
  if (uniq.length === 1) return uniq[0].id
  if (uniq.length === 0) throw new Error(`正身「${q}」池内不存在且未标记新建`)
  throw new Error(`正身「${q}」命中 ${uniq.length}：${uniq.map((n) => `${n.id}「${n.label}」`).join(' ; ')}`)
}

/** 新建池节点 + 树条目（挂 parentId 下）。返回 ref；已存在则直接复用。 */
function ensure(ref, label, content, parentId, { role = 'plain', tags = [] } = {}) {
  if (pool[ref]) { log(`  复用正身「${label}」(${ref})`); return ref }
  pool[ref] = { id: ref, label, role, tags, card: { nodeId: ref, title: label, tabs: [{ id: 'def', label: '定义', content }] } }
  const parent = byId(parentId)
  if (!parent) throw new Error(`新建「${label}」父 ${parentId} 不存在`)
  const entry = { id: `asplit_s1_${ref}`, name: label, nodeRef: ref, children: [] }
  attachChild(parent.node, entry)
  const edge = createTreeBindingEdge({ tree, pool, parentTreeId: parentId, childTreeId: entry.id, childKnowledgeId: ref })
  if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
  log(`  新建正身「${label}」(${ref})，${content.length} 字，@「${parent.node.name}」`)
  return ref
}

function dedupe(content) {
  if (content.length % 2 === 0) {
    const half = content.length / 2
    if (content.slice(0, half) === content.slice(half)) {
      log(`  去重：${content.length} → ${half} 字`)
      return content.slice(0, half)
    }
  }
  return content
}

/** 按标记切段（段归属由 side 声明，头段归 L；headSide 可翻转）。 */
function splitByMarkers(content, segs, headSide = 'L') {
  const idxs = segs.map((s) => ({ ...s, at: content.indexOf(s.marker) })).filter((s) => s.at >= 0)
  if (idxs.length === 0) throw new Error('splitByMarkers: 无一标记命中')
  const ordered = [{ at: 0, side: headSide, marker: '(head)' }, ...idxs]
  const parts = []
  for (let i = 0; i < ordered.length; i += 1) {
    const cur = ordered[i]
    const nextAt = i + 1 < ordered.length ? ordered[i + 1].at : content.length
    parts.push({ text: content.slice(cur.at, nextAt).trim(), side: cur.side })
  }
  return {
    L: parts.filter((p) => p.side === 'L' && p.text).map((p) => p.text).join('\n\n'),
    R: parts.filter((p) => p.side === 'R' && p.text).map((p) => p.text).join('\n\n'),
  }
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
    const allowed = scan.hits.filter((h) => /^edges\.(source|target): (aopm|bcs:|msr[:_]|qproc:|tpl:|tio:|edge_java_thread|edge_java_class|asplit:)/.test(h))
    for (const h of allowed) log(`  放行（spec 内部接线/本批边）：${h}`)
    const bad = scan.hits.filter((h) => !allowed.includes(h))
    if (bad.length > 0) { log(`  ✗ ${tag} 门禁命中：`); for (const h of bad) log('    ! ' + h); process.exit(1) }
    keptPoolRefs.add(nodeRef)
    log(`  池节点保留（spec 参与者特判）：${nodeRef}`)
    return
  }
  if (scan.hits.length > 0) {
    log(`  ✗ ${tag} 门禁命中：`)
    for (const h of scan.hits) log('    ! ' + h)
    process.exit(1)
  }
  if (pool[nodeRef]) { delete pool[nodeRef]; droppedPoolRefs.add(nodeRef); log(`  退池：${nodeRef}`) }
}

/** 提级孩子。to = 'parent' | treeId | {ref}。 */
function promoteKids(rec, to) {
  const kids = [...(rec.node.children ?? [])]
  if (kids.length === 0) return
  const target = to === 'parent' ? rec.parent
    : typeof to === 'string' && to !== 'parent' ? byId(to).node
      : byRefUnique(to.ref).node
  let rebuilt = 0
  for (const kid of kids) {
    detachChild(rec.node, kid.id)
    attachChild(target, kid)
    log(`  提级：「${kid.name}」→「${target.name}」`)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: target.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef })
    if (edge && upsertEdge(edges, edge)) { rebuilt += 1; addedEdges.push(edge.id) }
  }
  log(`  重建 belongs-to 边 ${rebuilt} 条`)
}

/** 问题卡引用改向（from → to）。 */
function repointQuestion(from, to) {
  let n = 0
  for (const q of state.questions) {
    if (q.relatedNodeId === from) { q.relatedNodeId = to; n += 1 }
  }
  log(`  问题引用改向：${n} 处 ${from} → ${to}`)
}

/** 语义边改指向。 */
function repointEdge(edgeId, side, to, reason) {
  const e = edges.find((x) => x.id === edgeId)
  if (!e) { log(`  ⚠ 边 ${edgeId} 不存在，跳过`); return }
  if (e[side] === to) return
  log(`  改指向：${edgeId}.${side} ${e[side]} → ${to}（${reason}）`)
  e[side] = to
}

/** 按 name 提级孩子：map = [[nameIncludes, 'L'|'R']]，剩余归 rest；目标按 nodeRef 定位。 */
function promoteByMap(rec, map, opts) {
  const { rest = 'parent', lRef, rRef } = opts || {}
  const kids = [...(rec.node.children ?? [])]
  const lEntry = lRef ? byRefUnique(lRef).node : null
  const rEntry = rRef ? byRefUnique(rRef).node : null
  const restTarget = rest === 'parent' ? rec.parent : byId(rest).node
  let rebuilt = 0
  for (const kid of kids) {
    const hit = map.find(([pat]) => (kid.name ?? '').includes(pat))
    const target = hit ? (hit[1] === 'L' ? lEntry : rEntry) : restTarget
    if (!target) throw new Error(`提级目标缺失：${kid.name}`)
    detachChild(rec.node, kid.id)
    attachChild(target, kid)
    log(`  提级：「${kid.name}」→「${target.name}」`)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: target.id, childTreeId: kid.id, childKnowledgeId: kid.nodeRef })
    if (edge && upsertEdge(edges, edge)) { rebuilt += 1; addedEdges.push(edge.id) }
  }
  log(`  重建 belongs-to 边 ${rebuilt} 条`)
}

log('═══ A-split §一 拆分（双正身 + 关系边）═══')
log(`起始 ${statLine(state)}`)

/** 挂补充：优先池卡 tabs（正文沉淀到正身卡片，正身卸树后知识仍在池卡里）。 */
function addOverview(ref, content, label, id) {
  if (!content || content.length === 0) { log(`  正文 0 字，跳过 supplement「${label}」(${ref})`); return }
  const p = pool[ref]
  if (!p) throw new Error(`addOverview: 池节点 ${ref} 不存在`)
  if (!p.card) p.card = { nodeId: ref, title: p.label, tabs: [] }
  if (!Array.isArray(p.card.tabs)) p.card.tabs = []
  const existing = p.card.tabs.findIndex((t) => t.id === id)
  const tab = { id, label, content }
  if (existing >= 0) {
    log(`  supplement 已存在，追加合并：${id}（${ref}）`)
    p.card.tabs[existing].content = `${p.card.tabs[existing].content}\n\n${content}`
  } else {
    p.card.tabs.push(tab)
    log(`  supplement 新增：${id}「${label}」（${content.length} 字）→ 池卡「${p.label}」`)
  }
}

// ── 正身引用表（探针实测 2026-09-13）────────────────────────────────────
const R = {
  volatile: 'k_web_8c66406b75e1', syncLock: 'k_java_thread_lock',
  thread: 'k_java_syntax_zh_14yyxnj', threadState: 'k_1785934396536_as412a',
  dcl: 'k_1784595434812_54qwge', threadPool: 'k_1784597083135_287nro',
  metaspace: 'k_atom_metaspace', permgen: 'k_atom_permgen',
  reorder: 'k_1783096626380_5ujbbs', atomicOp: 'k_1785823716478_pdtezg',
  box: 'k_1783186382386_06a7l7', unbox: 'k_1783191024388_6wm19u',
  methodRef: 'k_java_syntax_zh_83eegb', lambda: 'k_1787913909033_kvb8jo',
  escape: 'k_atom_escape_analysis', lockCoarse: 'k_1784954614447_9jj6qz',
  servlet: 'k_1784340526295_skm8iw', dynProxy: 'se_pat_dynamic_proxy',
  di: 'k_1784466531162_zcrhl7', tree: 'k_1782839325259_0qtru5',
  heap: 'k_1782798814309_j3jj7c', graph: 'k_1782839332724_q6xuqx',
  sort: 'k_dict_egdhzij9', abstractCls: 'k_1784295376153_uiovkk',
  innerCls: 'k_1784044129424_ffqm4z', jsp: 'k_vault_javajavawebjsp_elp41h',
  cb: 'k_1786158127369_fuypc2', isolation: 'k_1786158151129_seziai',
  nosql: 'n_21yoee5g', reactor: 'k_reactor_overview',
  typeConv: 'k_1787742820906_sai9w2', threadSafety: 'k_1787802474495_pgyc9y',
  taskSched: 'k_vault_java_1p2nxk', gateway: 'k_1786150290711_8qx1ei',
  chanPrinciple: 'k_nio_channel_principle', bufPrinciple: 'k_nio_buffer_principle',
  obj: 'k_1783238676302_ggr3kg', seqCons: 'k_1785862113423_05qu2c',
  var: 'k_1783249680752_eglr74', cnst: 'k_1782814122467_l5rgvz',
}
const prodCons = () => entity({ label: '生产者消费者模式' })
const cbody = (rec) => dedupe(shellContent(pool[rec.node.nodeRef]))

const A_ITEMS = [
  { no: 6, treeId: 'tree_1785935891433_trlnke', l: R.volatile, r: R.syncLock, t: '对比', k: 'reference' },
  { no: 16, treeId: 'tree_1786096565907_rxo41q', l: R.threadPool, r: 'PROD', t: '实现', k: 'dependency' },
  { no: 17, treeId: 'tree_vault_java01_1hsx4k', l: R.thread, r: R.threadState, t: '属性', k: 'reference' },
  { no: 30, treeId: 'tree_jvm_meta_perm', l: R.metaspace, r: R.permgen, t: '替代', k: 'dependency', kids: true, qFrom: 'k_jvm_meta_perm', qTo: 'k_atom_metaspace' },
  { no: 34, treeId: 'tree_web_8c66406b75e1_s4', l: R.volatile, r: R.reorder, t: '禁止', k: 'dependency' },
  { no: 35, treeId: 'tree_web_8c66406b75e1_s5', l: R.volatile, r: R.atomicOp, t: '对比', k: 'reference' },
  { no: 36, treeId: 'tree_1784039625853_e7acfj', l: R.box, r: R.unbox, t: '互逆', k: 'reference' },
  { no: 37, treeId: 'tree_1787851924719_2psgnm', l: R.methodRef, r: R.lambda, t: '等价', k: 'reference' },
  { no: 52, treeId: 'tree_wiki_en_java_performance_s1_s5_s8', l: R.escape, r: R.lockCoarse, t: '使能', k: 'dependency' },
  { no: 126, treeId: 'tree_vault_java04_15ur15', l: R.tree, r: R.heap, t: 'is-a', k: 'classification' },
  { no: 136, treeId: 'tree_vault_arch_circuit_breaker', l: R.cb, r: R.isolation, t: '并列', k: 'reference' },
]
log('── A 组：双侧已有正身（正文转 L 概述 + 边）──')
for (const item of A_ITEMS) {
  const rec = byId(item.treeId)
  if (!rec) throw new Error(`#${item.no}: 树 ${item.treeId} 不存在`)
  log(`\n── #${item.no}「${rec.node.name}」`)
  const l = item.l
  const r = item.r === 'PROD' ? prodCons() : item.r
  addOverview(l, cbody(rec), '概述', `asplit:s${item.no}`)
  if (item.qFrom) repointQuestion(item.qFrom, item.qTo)
  if (item.kids) promoteKids(rec, 'parent')
  unloadTreeEntry(rec.node.id, `#${item.no}`)
  semanticEdge(`asplit:s${item.no}`, l, r, item.t, item.k, item.t)
  gateAndDrop(rec.node.nodeRef, `#${item.no}`)
}

log('\n── B 组：需新建正身，按主题拆正文 ──')
// #1 抽象与具体
{
  const rec = byId('tree_class_programming_abstract_concrete')
  addOverview(R.abstractCls, cbody(rec), '抽象与具体', 'asplit:s1')
  const r1 = ensure('asplit_concrete_class', '具体类', '具体类是可以被直接实例化的类。抽象类的实例化只能通过具体的子类间接发生；在从抽象类派生的类可以实例化之前，其父类的所有抽象方法必须由派生链中的某个类实现。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#1')
  semanticEdge('asplit:s1', r1, R.abstractCls, 'instance-of', 'classification', '具体类特化抽象类')
  gateAndDrop(rec.node.nodeRef, '#1')
}

// #2 局部类与内部类
{
  const rec = byId('tree_class_programming_inner_local_class')
  const s = splitByMarkers(cbody(rec), [{ marker: '一个 local class', side: 'L' }], 'R')
  addOverview(R.innerCls, s.R, '内部类', 'asplit:s2')
  const l2 = ensure('asplit_local_class', '局部类', s.L, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#2')
  semanticEdge('asplit:s2', l2, R.innerCls, '属于', 'structure', '局部类属于内部类范畴')
  gateAndDrop(rec.node.nodeRef, '#2')
}

// #8 过期的 suspend()/resume()/stop()
{
  const rec = byId('tree_1785948961387_lq0dos')
  const c = cbody(rec)
  const stopAt = c.indexOf('stop()方法在终')
  if (stopAt < 0) throw new Error('#8: 找不到 stop 段落')
  ensure('asplit_suspend_resume_methods', 'suspend/resume 方法组', c.slice(0, stopAt).trim(), rec.parent.id)
  ensure('asplit_stop_method', 'stop 方法', c.slice(stopAt).trim(), rec.parent.id)
  unloadTreeEntry(rec.node.id, '#8')
  semanticEdge('asplit:s8', entity({ ref: 'asplit_stop_method' }), entity({ ref: 'asplit_suspend_resume_methods' }), '替代', 'dependency', 'stop 替代过期的 suspend/resume')
  gateAndDrop(rec.node.nodeRef, '#8')
}

// #9 锁和同步块
{
  const rec = byId('tree_1784367586118_ycyyi1')
  ensure('asplit_mutex_lock', '互斥锁', cbody(rec), rec.parent.id)
  ensure('asplit_sync_block', '同步代码块', 'synchronized 同步代码块：通过互斥锁保证临界区互斥，是 Java 中最基本的同步手段。', rec.parent.id)
  repointQuestion('k_1784367586077_d1lo68', 'asplit_mutex_lock')
  unloadTreeEntry(rec.node.id, '#9')
  semanticEdge('asplit:s9', entity({ ref: 'asplit_sync_block' }), entity({ ref: 'asplit_mutex_lock' }), '使用', 'dependency', '同步代码块基于互斥锁实现')
  gateAndDrop(rec.node.nodeRef, '#9')
}

// #10 数据竞争与顺序一致性
{
  const rec = byId('tree_1785862255688_t5ctcs')
  const l10 = ensure('asplit_data_race', '数据竞争', cbody(rec), rec.parent.id)
  unloadTreeEntry(rec.node.id, '#10')
  semanticEdge('asplit:s10', l10, R.seqCons, '违反', 'dependency', '数据竞争破坏顺序一致性')
  gateAndDrop(rec.node.nodeRef, '#10')
}
// #11 双重检查锁定与延迟初始化
{
  const rec = byId('tree_1785931080890_o0j134')
  const r11 = ensure('asplit_lazy_init', '延迟初始化', '延迟初始化：对象在首次被使用时才创建并初始化，避免无谓的构造开销；双重检查锁定时需要 volatile 保证可见性与有序性。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#11')
  semanticEdge('asplit:s11', R.dcl, r11, '实现', 'dependency', '双重检查锁定实现延迟初始化')
  gateAndDrop(rec.node.nodeRef, '#11')
}

// #20 并发容器与调度
{
  const rec = byId('tree_vault_java05_1l9ptm')
  const l20 = ensure('asplit_concurrency_container', '并发容器', cbody(rec), rec.parent.id)
  unloadTreeEntry(rec.node.id, '#20')
  semanticEdge('asplit:s20', R.taskSched, l20, '使用', 'dependency', '任务调度使用并发容器承载任务')
  gateAndDrop(rec.node.nodeRef, '#20')
}

// #38 泛型方法和构造函数
{
  const rec = byId('tree_1784302612237_ju3bdw')
  ensure('asplit_generic_method', '泛型方法', cbody(rec), rec.parent.id)
  ensure('asplit_generic_constructor', '泛型构造函数', '在构造函数的情况下，类型变量在构造函数名称之前以与泛型方法相同的格式声明。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#38')
  semanticEdge('asplit:s38', entity({ ref: 'asplit_generic_method' }), entity({ ref: 'asplit_generic_constructor' }), '并列', 'reference', '泛型方法与泛型构造函数并列')
  gateAndDrop(rec.node.nodeRef, '#38')
}

// #39 Java 对象和类
{
  const rec = byId('tree_vault_javajava_1ykhww')
  const l39 = ensure('asplit_java_class', 'Java 类', cbody(rec), rec.parent.id)
  unloadTreeEntry(rec.node.id, '#39')
  semanticEdge('asplit:s39', R.obj, l39, 'instance-of', 'classification', 'Java 对象是 Java 类的实例')
  gateAndDrop(rec.node.nodeRef, '#39')
}

// #41 文件流与缓冲流
{
  const rec = byId('tree_file_buffered_stream')
  const s = splitByMarkers(cbody(rec), [{ marker: '【缓冲流】', side: 'R' }])
  const l41 = ensure('asplit_file_input_stream', 'FileInputStream', s.L, rec.parent.id)
  const r41 = ensure('asplit_buffered_input_stream', 'BufferedInputStream', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#41')
  semanticEdge('asplit:s41', r41, l41, '装饰', 'dependency', 'BufferedInputStream 装饰 FileInputStream')
  gateAndDrop(rec.node.nodeRef, '#41')
}

// #42 数据流与对象流
{
  const rec = byId('tree_data_object_stream')
  const s = splitByMarkers(cbody(rec), [{ marker: '【对象流】', side: 'R' }])
  const l42 = ensure('asplit_data_input_stream', 'DataInputStream', s.L, rec.parent.id)
  const r42 = ensure('asplit_object_input_stream', 'ObjectInputStream', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#42')
  semanticEdge('asplit:s42', l42, r42, '并列', 'reference', '数据流与对象流并列')
  gateAndDrop(rec.node.nodeRef, '#42')
}

// #43 文件字符流与缓冲流
{
  const rec = byId('tree_file_buffered_char')
  const s = splitByMarkers(cbody(rec), [{ marker: '【缓冲', side: 'R' }])
  const l43 = ensure('asplit_file_reader', 'FileReader', s.L, rec.parent.id)
  const r43 = ensure('asplit_buffered_reader', 'BufferedReader', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#43')
  semanticEdge('asplit:s43', r43, l43, '装饰', 'dependency', 'BufferedReader 装饰 FileReader')
  gateAndDrop(rec.node.nodeRef, '#43')
}

// #44 java.io 文件与控制台（带 4 孩）
{
  const rec = byId('tree_file_console_group')
  const s = splitByMarkers(cbody(rec), [{ marker: '【控制台IO】', side: 'R' }])
  const l44 = ensure('asplit_java_io_file', 'File 类', s.L, rec.parent.id)
  const r44 = ensure('asplit_console_io', '控制台 I/O', s.R, rec.parent.id)
  promoteByMap(rec, [['File', 'L'], ['RandomAccessFile', 'L'], ['目录', 'L'], ['控制台', 'R']], { lRef: l44, rRef: r44 })
  unloadTreeEntry(rec.node.id, '#44')
  semanticEdge('asplit:s44', l44, r44, '并列', 'reference', '文件操作类与控制台 IO 并列')
  gateAndDrop(rec.node.nodeRef, '#44')
}

// #46 Path与FileSystem（先处置：它是 #45 的孩子）
{
  const rec = byId('tree_nio_path_filesystem')
  const s = splitByMarkers(cbody(rec), [{ marker: '【FileSystem', side: 'R' }])
  const l46 = ensure('asplit_java_nio_path', 'Path', s.L, rec.parent.id)
  const r46 = ensure('asplit_java_nio_filesystem', 'FileSystem', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#46')
  semanticEdge('asplit:s46', r46, l46, '创建', 'dependency', 'FileSystem 创建 Path')
  gateAndDrop(rec.node.nodeRef, '#46')
}

// #45 java.nio 通道与缓冲区（#46 已卸，孩子现为 6 个）
{
  const rec = byId('tree_nio_impl_group')
  addOverview(R.chanPrinciple, cbody(rec), 'NIO 通道与缓冲区', 'asplit:s45')
  repointEdge('edge_java_nio_uses_javanio_lib', 'target', R.chanPrinciple, '#45 域宿主改向')
  promoteByMap(rec, [['FileChannel', 'L'], ['SocketChannel', 'L'], ['ServerSocketChannel', 'L'], ['ByteBuffer', 'R']], { lRef: R.chanPrinciple, rRef: R.bufPrinciple })
  unloadTreeEntry(rec.node.id, '#45')
  semanticEdge('asplit:s45', R.chanPrinciple, R.bufPrinciple, '使用', 'dependency', 'Channel 使用 Buffer 传输数据')
  gateAndDrop(rec.node.nodeRef, '#45')
}

// #48 IO 流的分类与框架体系（#47 的孩子，先单独处置：java.io 分类网格）
{
  const rec = byId('tree_java_io_stream_classification')
  const ioRef = 'asplit_java_io_group'
  if (!pool[ioRef]) {
    pool[ioRef] = {
      id: ioRef, label: 'java.io', role: 'group', tags: ['java', 'io'],
      card: { nodeId: ioRef, title: 'java.io', tabs: [{ id: 'def', label: 'IO 流的分类与框架体系', content: cbody(rec) }] },
      viewDimensions: [{
        id: 'io-class-grid', name: 'IO 流分类', color: '#4b8bbf',
        sections: [{
          id: 'io-class-grid_main', title: '字节流 / 字符流', layout: 'grid',
          atoms: [
            { nodeId: 'k_byte_stream_group', desc: '字节流：InputStream/OutputStream 体系' },
            { nodeId: 'k_char_stream_group', desc: '字符流：Reader/Writer 体系' },
            { nodeId: 'k_file_console_group', desc: '文件操作类与控制台 I/O' },
            { nodeId: 'k_java_io_nio', desc: 'IO 与 NIO 三代体系总览' },
          ],
        }],
      }],
    }
    log(`  新建正身「java.io」(${ioRef}) + IO 流分类网格（${shellContent(pool[ioRef]).length} 字）`)
  }
  const parentHost = byId('tree_byte_stream_group')
  if (!parentHost) throw new Error('#48: 宿主 tree_byte_stream_group 不存在')
  const entry = { id: `asplit_s1_${ioRef}`, name: 'java.io', nodeRef: ioRef, children: [] }
  attachChild(parentHost.node, entry)
  const edgeE = createTreeBindingEdge({ tree, pool, parentTreeId: parentHost.node.id, childTreeId: entry.id, childKnowledgeId: ioRef })
  if (edgeE && upsertEdge(edges, edgeE)) addedEdges.push(edgeE.id)
  unloadTreeEntry(rec.node.id, '#48')
  gateAndDrop(rec.node.nodeRef, '#48')
}

// #47 IO 与 NIO（#48 已卸，孩子现为 4 个）
{
  const rec = byId('tree_java_io_nio')
  const l47 = ensure('asplit_blocking_io_model', '阻塞 I/O（BIO 模型）', cbody(rec), rec.parent.id)
  const r47 = ensure('asplit_nonblocking_io_model', '非阻塞 I/O（NIO 模型）', 'NIO 实现原理：事件驱动思想，Reactor 在 Java 中的落点；NIO 核心组件 Channel / Buffer / Selector 的架构与协作逻辑。', rec.parent.id)
  repointQuestion('k_java_io_nio', l47)
  for (const eid of ['edge_io_nio_vs_files', 'edge_io_nio_reads_string', 'edge_java_io_vs_nio_files', 'edge_java_io_uses_javaio_lib', 'edge_java_nio_uses_javanio_lib']) {
    repointEdge(eid, 'source', l47, '#47 域宿主改向')
  }
  repointEdge('edge_netty_builds_on_nio', 'target', r47, 'Netty 建立在 NIO 模型上')
  promoteByMap(rec, [['BIO', 'L'], ['NIO', 'R'], ['NIO核心', 'R']], { lRef: l47, rRef: r47 })
  unloadTreeEntry(rec.node.id, '#47')
  semanticEdge('asplit:s47', r47, l47, '替代', 'dependency', 'NIO 替代 BIO')
  gateAndDrop(rec.node.nodeRef, '#47')
}

// #49 词法与语法（孩子 标识符 → 词法分析）
{
  const rec = byId('tree_1783186255448_ehdt38')
  const l49 = ensure('asplit_lexical_analysis', '词法分析', '词法分析：将源代码字符流按词法规则切分为记号（token）序列，是编译前端的第一阶段。', rec.parent.id)
  const r49 = ensure('asplit_syntax_analysis', '语法分析', '语法分析：根据文法规则将记号序列组织成语法树（Parse Tree / AST），是词法分析之后的编译阶段。', rec.parent.id)
  promoteKids(rec, { ref: l49 })
  unloadTreeEntry(rec.node.id, '#49')
  semanticEdge('asplit:s49', l49, r49, '先后', 'dependency', '词法分析在前，语法分析在后')
  gateAndDrop(rec.node.nodeRef, '#49')
}

// #55 单遍编译器与多遍编译器
{
  const rec = byId('tree_wiki_en_compiler_s3_s4')
  const s = splitByMarkers(cbody(rec), [
    { marker: '在某些情况下', side: 'R' },
    { marker: '单次编译的缺点', side: 'R' },
  ])
  const l55 = ensure('asplit_single_pass_compiler', '单遍编译器', s.L, rec.parent.id)
  const r55 = ensure('asplit_multi_pass_compiler', '多遍编译器', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#55')
  semanticEdge('asplit:s55', l55, r55, '对比', 'reference', '单遍与多遍编译对比')
  gateAndDrop(rec.node.nodeRef, '#55')
}

// #58 HTTP 请求与 Servlet 模型
{
  const rec = byId('tree_vault_javajavaweb01httpservlet_31o6os')
  const l58 = ensure('asplit_http_request', 'HTTP 请求', cbody(rec), rec.parent.id)
  unloadTreeEntry(rec.node.id, '#58')
  semanticEdge('asplit:s58', R.servlet, l58, '处理', 'dependency', 'Servlet 处理 HTTP 请求')
  gateAndDrop(rec.node.nodeRef, '#58')
}

// #59 Servlet 生命周期与容器协作
{
  const rec = byId('tree_vault_javajavaweb02servlet_1lm1rc')
  ensure('asplit_servlet_lifecycle', 'Servlet 生命周期', cbody(rec), rec.parent.id)
  ensure('asplit_servlet_container', 'Servlet 容器', 'Servlet 容器（如 Tomcat）：负责 Servlet 的装载、实例化、调用生命周期方法并管理其运行环境。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#59')
  semanticEdge('asplit:s59', entity({ ref: 'asplit_servlet_container' }), entity({ ref: 'asplit_servlet_lifecycle' }), '管理', 'dependency', 'Servlet 容器管理 Servlet 生命周期')
  gateAndDrop(rec.node.nodeRef, '#59')
}

// #60 JSP 与视图渲染
{
  const rec = byId('tree_vault_javajavaweb05jsp_qu145w')
  const s = splitByMarkers(cbody(rec), [{ marker: '## 历史意义', side: 'R' }])
  addOverview(R.jsp, s.L, 'JSP 与视图渲染', 'asplit:s60')
  const r60 = ensure('asplit_view_rendering', '视图渲染', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#60')
  semanticEdge('asplit:s60', R.jsp, r60, '实现', 'dependency', 'JSP 实现视图渲染')
  gateAndDrop(rec.node.nodeRef, '#60')
}

// #62 ProxyFactory 与代理策略（aop_proxyfactory 是 aop_flow participant → 保池）
{
  const rec = byId('tree_aop_proxyfactory')
  unloadTreeEntry(rec.node.id, '#62')
  semanticEdge('asplit:s62', 'aop_proxyfactory', R.dynProxy, '创建', 'dependency', 'ProxyFactory 创建动态代理')
  gateAndDrop('aop_proxyfactory', '#62', { keepPool: true })
}

// #65 依赖注入与 Bean 生命周期
{
  const rec = byId('tree_vault_javaspring02bean_eazzu3')
  addOverview(R.di, cbody(rec), '依赖注入与 Bean 生命周期', 'asplit:s65')
  ensure('asplit_bean_lifecycle', 'Bean 生命周期', 'Bean 生命周期：从实例化、属性填充、初始化（InitializingBean/init-method）到销毁（DisposableBean/destroy-method）的完整过程；依赖注入发生在实例化后的属性填充阶段。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#65')
  semanticEdge('asplit:s65', R.di, entity({ ref: 'asplit_bean_lifecycle' }), '阶段', 'structure', '依赖注入是 Bean 生命周期的组成阶段')
  gateAndDrop(rec.node.nodeRef, '#65')
}
  // #68 Mapper 与动态 SQL
{
  const rec = byId('tree_vault_javamybatis04mappersql_kti5vu')
  const l68 = ensure('asplit_mybatis_mapper', 'MyBatis Mapper', cbody(rec), rec.parent.id)
  ensure('asplit_dynamic_sql', '动态 SQL', '动态 SQL：MyBatis 通过 <if>/<choose>/<where>/<foreach> 等标签按条件动态拼装 SQL，避免静态拼接字符串带来的注入与冗余。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#68')
  semanticEdge('asplit:s68', l68, entity({ ref: 'asplit_dynamic_sql' }), '使用', 'dependency', 'Mapper 使用动态 SQL')
  gateAndDrop(rec.node.nodeRef, '#68')
}

// #71 Netty 的 Reactor 与线程模型
{
  const rec = byId('tree_vault_javanetty02reactor_1nzb1c')
  const s = splitByMarkers(cbody(rec), [{ marker: '## Netty 的实践', side: 'R' }])
  addOverview(R.reactor, s.L, 'Reactor 与三种模型', 'asplit:s71')
  ensure('asplit_netty_thread_model', 'Netty 线程模型', s.R, rec.parent.id)
  repointEdge('edge_netty_implements_reactor', 'source', entity({ ref: 'asplit_netty_thread_model' }), '#71 壳拆为 Netty 线程模型')
  unloadTreeEntry(rec.node.id, '#71')
  semanticEdge('asplit:s71', entity({ ref: 'asplit_netty_thread_model' }), R.reactor, '实现', 'dependency', 'Netty 线程模型实现 Reactor 模式')
  gateAndDrop(rec.node.nodeRef, '#71')
}

// #72 Netty 的 Channel 与 Pipeline
{
  const rec = byId('tree_vault_javanetty03channelpipeline_15ze4x')
  const s = splitByMarkers(cbody(rec), [{ marker: '## Pipeline 的价值', side: 'R' }])
  ensure('asplit_netty_channel', 'Channel', s.L, rec.parent.id)
  ensure('asplit_channel_pipeline', 'ChannelPipeline', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#72')
  semanticEdge('asplit:s72', entity({ ref: 'asplit_netty_channel' }), entity({ ref: 'asplit_channel_pipeline' }), '包含', 'structure', 'Channel 内包含 ChannelPipeline 责任链')
  gateAndDrop(rec.node.nodeRef, '#72')
}

// #77 交换机路由与工作模式
{
  const rec = byId('tree_vault_javarabbitmq03_1n5hv5')
  const l77 = ensure('asplit_rabbitmq_exchange', 'RabbitMQ 交换机', cbody(rec), rec.parent.id)
  ensure('asplit_routing_key', '路由键', '路由键（routing key）：生产者在发布消息时携带的路由关键字，交换机按类型（direct/topic/fanout）根据路由键将消息路由到绑定的队列。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#77')
  semanticEdge('asplit:s77', l77, entity({ ref: 'asplit_routing_key' }), '使用', 'dependency', '交换机使用路由键路由消息')
  gateAndDrop(rec.node.nodeRef, '#77')
}

// #81 注册发现与负载均衡
{
  const rec = byId('tree_vault_javaspringcloud02_13kn6x')
  const l81 = ensure('asplit_svc_registry_discovery', '服务注册与发现', cbody(rec), rec.parent.id)
  ensure('asplit_load_balancing', '负载均衡', '负载均衡：将请求按策略（轮询/随机/最小连接等）分发到多个服务实例，与注册发现配合实现水平扩展与高可用。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#81')
  semanticEdge('asplit:s81', l81, entity({ ref: 'asplit_load_balancing' }), '使能', 'dependency', '注册发现使能负载均衡')
  gateAndDrop(rec.node.nodeRef, '#81')
}

// #82 服务调用与容错
{
  const rec = byId('tree_vault_javaspringcloud03_dhfhyx')
  ensure('asplit_svc_invocation', '服务调用', cbody(rec), rec.parent.id)
  ensure('asplit_svc_fault_tolerance', '服务容错', '服务容错：通过熔断、降级、限流、重试等机制保证单个依赖故障时整体服务仍可用。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#82')
  semanticEdge('asplit:s82', entity({ ref: 'asplit_svc_fault_tolerance' }), entity({ ref: 'asplit_svc_invocation' }), '保证', 'dependency', '服务容错保证服务调用的可靠性')
  gateAndDrop(rec.node.nodeRef, '#82')
}

// #83 配置中心与消息总线
{
  const rec = byId('tree_vault_javaspringcloud04_1liuns')
  const l83 = ensure('asplit_config_center', '配置中心', cbody(rec), rec.parent.id)
  ensure('asplit_message_bus', '消息总线', '消息总线：将配置变更等事件通过消息广播给各服务实例，实现配置动态刷新。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#83')
  semanticEdge('asplit:s83', l83, entity({ ref: 'asplit_message_bus' }), '使用', 'dependency', '配置中心使用消息总线广播变更')
  gateAndDrop(rec.node.nodeRef, '#83')
}

// #84 网关与治理组件
{
  const rec = byId('tree_vault_javaspringcloud05_1tepi4')
  addOverview(R.gateway, cbody(rec), '网关与治理组件', 'asplit:s84')
  ensure('asplit_service_governance', '服务治理', '服务治理：对微服务集群进行路由、限流、降级、隔离与监控的统一治理；API 网关是其对外入口。', rec.parent.id)
  unloadTreeEntry(rec.node.id, '#84')
  semanticEdge('asplit:s84', R.gateway, entity({ ref: 'asplit_service_governance' }), '实现', 'dependency', 'API 网关实现服务治理的入口能力')
  gateAndDrop(rec.node.nodeRef, '#84')
}

// #87 2000 年代，NoSQL 和 NewSQL
{
  const rec = byId('tree_wiki_en_database_s2_s9')
  const s = splitByMarkers(cbody(rec), [{ marker: 'NewSQL 是一类现代关系数据库', side: 'R' }])
  addOverview(R.nosql, s.L, 'NoSQL 兴起', 'asplit:s87')
  const r87 = ensure('asplit_newsql', 'NewSQL', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#87')
  semanticEdge('asplit:s87', r87, R.nosql, '演进', 'dependency', 'NewSQL 结合 NoSQL 可扩展性与 SQL/ACID')
  gateAndDrop(rec.node.nodeRef, '#87')
}

// #93 ZRANK 与 ZRANGE
{
  const rec = byId('tree_vault_redis_datatypes')
  const s = splitByMarkers(cbody(rec), [{ marker: '2.ZRANGE', side: 'R' }])
  const l93 = ensure('asplit_zrank', 'ZRANK', s.L, rec.parent.id)
  const r93 = ensure('asplit_zrange', 'ZRANGE', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#93')
  semanticEdge('asplit:s93', l93, r93, '并列', 'reference', 'ZRANK 与 ZRANGE 并列')
  gateAndDrop(rec.node.nodeRef, '#93')
}

// #95 热点数据和冷数据
{
  const rec = byId('tree_1786340628565_mvkk69')
  const c = cbody(rec)
  const coldAt = c.indexOf('对于冷数据而言')
  const l95 = ensure('asplit_hot_data', '热点数据', c.slice(0, coldAt).trim(), rec.parent.id)
  const r95 = ensure('asplit_cold_data', '冷数据', c.slice(coldAt).trim(), rec.parent.id)
  unloadTreeEntry(rec.node.id, '#95')
  semanticEdge('asplit:s95', l95, r95, '对比', 'reference', '热点数据与冷数据对比')
  gateAndDrop(rec.node.nodeRef, '#95')
}

// #117 组件导出与导入（3 孩）
{
  const rec = byId('react_tree_export')
  const l117 = ensure('asplit_module_export', '模块导出', cbody(rec), rec.parent.id)
  const r117 = ensure('asplit_module_import', '模块导入', 'import 用于从其他模块引入导出项：默认导入对应默认导出，命名导入对应命名导出，可用 as 重命名。', rec.parent.id)
  repointQuestion('react_export_import', l117)
  promoteByMap(rec, [['默认导出', 'L'], ['命名导出', 'L'], ['导入', 'R']], { lRef: l117, rRef: r117 })
  // React 根条目（react_root）复用了同一池节点：指向新正身「模块导出」
  const rootRec = byId('react_root')
  if (rootRec) { log(`  修复 React 根复用：react_root.nodeRef ${rootRec.node.nodeRef} → ${l117}`); rootRec.node.nodeRef = l117 }
  unloadTreeEntry(rec.node.id, '#117')
  semanticEdge('asplit:s117', r117, l117, '引用', 'reference', '模块导入引用模块导出')
  gateAndDrop(rec.node.nodeRef, '#117')
}

// #118 控制流与函数设计（2 孩）
{
  const rec = byId('governance:javascript:control-flow')
  const l118 = ensure('asplit_js_control_flow', '控制流', cbody(rec), rec.parent.id)
  const r118 = ensure('asplit_function_design', '函数设计', '函数设计：职责单一、参数与返回值清晰、提前返回与多分支拆分等实践，是写出可读控制流的基础。', rec.parent.id)
  promoteByMap(rec, [['提前返回', 'L'], ['多分支', 'L'], ['if-else', 'L']], { lRef: l118, rRef: r118 })
  unloadTreeEntry(rec.node.id, '#118')
  semanticEdge('asplit:s118', l118, r118, '并列', 'reference', '控制流与函数设计并列')
  gateAndDrop(rec.node.nodeRef, '#118')
}

// #119 表达式与类型转换（3 孩）
{
  const rec = byId('governance:javascript:expressions')
  const l119 = ensure('asplit_js_expression', '表达式', cbody(rec), rec.parent.id)
  promoteKids(rec, 'parent')
  unloadTreeEntry(rec.node.id, '#119')
  semanticEdge('asplit:s119', l119, R.typeConv, '触发', 'dependency', '表达式运算触发类型转换')
  gateAndDrop(rec.node.nodeRef, '#119')
}

// #127 图与搜索
{
  const rec = byId('tree_vault_java05_10s2ki')
  const r127 = ensure('asplit_graph_search', '图搜索算法', cbody(rec), rec.parent.id)
  unloadTreeEntry(rec.node.id, '#127')
  semanticEdge('asplit:s127', r127, R.graph, '操作', 'dependency', '图搜索算法作用于图结构')
  gateAndDrop(rec.node.nodeRef, '#127')
}

// #128 排序与查找
{
  const rec = byId('tree_vault_java06_2caodb')
  const s = splitByMarkers(cbody(rec), [{ marker: '## 常见查找', side: 'R' }])
  addOverview(R.sort, s.L, '排序与查找', 'asplit:s128')
  const r128 = ensure('asplit_search', '查找', s.R, rec.parent.id)
  unloadTreeEntry(rec.node.id, '#128')
  semanticEdge('asplit:s128', R.sort, r128, '并列', 'reference', '排序与查找并列')
  gateAndDrop(rec.node.nodeRef, '#128')
}

// #129 阻塞非阻塞与同步异步（1 孩）
{
  const rec = byId('tree_io_blocking_concepts')
  const s = splitByMarkers(cbody(rec), [
    { marker: '【同步与异步】', side: 'R' },
    { marker: '【阻塞与非阻塞】', side: 'L' },
    { marker: '【POSIX 定义】', side: 'R' },
  ])
  const l129 = ensure('asplit_blocking_io', '阻塞非阻塞 I/O', s.L, rec.parent.id)
  const r129 = ensure('asplit_sync_async_io', '同步异步 I/O', s.R, rec.parent.id)
  promoteKids(rec, { ref: l129 })
  unloadTreeEntry(rec.node.id, '#129')
  semanticEdge('asplit:s129', l129, r129, '对比', 'reference', '阻塞非阻塞与同步异步是两组不同维度')
  gateAndDrop(rec.node.nodeRef, '#129')
}

// #130 select与epoll
{
  const rec = byId('tree_io_select_epoll')
  const s = splitByMarkers(cbody(rec), [{ marker: '## 平台支持与性能对比', side: 'R' }])
  const l130 = ensure('asplit_select_io', 'select', s.L, rec.parent.id)
  const r130 = ensure('asplit_epoll', 'epoll', s.R, rec.parent.id)
  repointQuestion('k_io_select_epoll', l130)
  repointEdge('edge_java_selector_implements_epoll', 'target', l130, '#130 拆出 select')
  repointEdge('edge_reactor_depends_multiplexing', 'target', l130, '#130 拆出 select')
  unloadTreeEntry(rec.node.id, '#130')
  semanticEdge('asplit:s130', r130, l130, '替代', 'dependency', 'epoll 替代 select（Linux）')
  gateAndDrop(rec.node.nodeRef, '#130')
}

// #18 线程安全与锁
{
  const rec = byId('tree_vault_java02_hjsqh3')
  addOverview(R.threadSafety, cbody(rec), '线程安全与锁', 'asplit:s18')
  unloadTreeEntry(rec.node.id, '#18')
  semanticEdge('asplit:s18', entity({ ref: 'asplit_mutex_lock' }), R.threadSafety, '保证', 'dependency', '互斥锁保证线程安全')
  gateAndDrop(rec.node.nodeRef, '#18')
}

// #51 变量与常量（正文 0 字，纯边连接）
{
  const rec = byId('tree_1787766295522_ec9lv5')
  unloadTreeEntry(rec.node.id, '#51')
  semanticEdge('asplit:s51', R.var, R.cnst, '对比', 'reference', '变量与常量对比')
  gateAndDrop(rec.node.nodeRef, '#51')
}

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条`)
log(`卸树 ${unloadedTreeIds.size} 条 · 退池 ${droppedPoolRefs.size} 个 · 保池 ${keptPoolRefs.size} 个 · 新建边 ${addedEdges.length} 条`)
log(`新建边明细：\n  ${addedEdges.join('\n  ')}`)

if (apply) {
  saveAll({ pool, tree, edges, questions: state.questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
