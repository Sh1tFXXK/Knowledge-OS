/**
 * 终审 9 项一体化落盘（用户 2026-09-14 终审）。
 *
 *  #1 案例研究：经典的有界生产者/消费者问题 → 正文按主题并入 生产者 / 消费者 的 supplement，卸树退池
 *  #2 解决有界生产者/消费者问题               → 转提问卡（answerSteps 绑 生产者 + 消费者），卸树留池
 *  #3 形式语言理论 / 自动机理论                → 真拆为 形式语言理论 + 自动机理论
 *  #4 管理程序/模拟器                         → 真拆为 管理程序 + 模拟器
 *  #5 等待/通知机制                           → 白名单豁免（数据 0 改动）
 *  #6 等待/通知的经典范式                      → 正文并入 #5 的 supplement，卸树退池
 *  #7 管道输入/输出流                         → 真拆为 PipedInputStream + PipedOutputStream
 *  #8 可达性分析算法/引用链法/跟踪垃圾收集       → 同义归一：改名 可达性分析算法 + 写 aliases
 *  #9 连接认证（上轮暂改名）                   → ① 新建/复用 身份认证 + 新建 权限校验 并建边
 *                                              ② 机制状态正名「客户端鉴权」（ID 不变，spec 零破坏）
 *                                              ③ 客户端鉴权 --uses--> 身份认证 / 权限校验
 *
 * 实测校正（已探明，写进提交信息）：
 *   · 裁决点名的「生产者」「消费者」池内不存在 → 新建两个通用角色原子正身（区别于 Kafka 生产者/消费者），
 *     挂在既有「生产者消费者模式」同层「Java并发编程实践」下
 *   · #3 的 2 个子节点（数据控制语言 / DCL、数据操纵语言 / DML）**是错挂的 SQL 概念**，且与既有
 *     concept_dcl / concept_dml（已挂「数据库语言」）重复 → 不随 #3 拆分带走，改挂回「数据库语言」并记为重复债务
 *   · #9 的「身份认证」池内已存在（k_vault_se_auth，挂「软件工程」）→ 按 §0.4 复用（+1 处重复挂载，如实记录）
 *   · #1 的 2 个子节点（不同步不正确 / 旋转等待）系条件变量子题 → 提级到父「条件变量」
 *
 * 用法：node scripts/shell-fusion/a-split/sweep-final-master.mjs [--apply]
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
const COMPOUND_RE = /[与和及]|\/|、/
const unloaded = new Set()
const dropped = []
const created = []
const reused = []
const addedEdges = []
const renamed = []
const notes = []
const now = Date.now()

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

/** 新建原子正身（名内不得含连接符）。 */
function newNode(ref, label, content, parentTreeId, tabs = []) {
  if (pool[ref]) throw new Error(`正身 ${ref} 已存在`)
  if (COMPOUND_RE.test(label)) throw new Error(`原子正身名「${label}」仍含连接符——拒绝创建`)
  const isLatin = /^[A-Za-z]/.test(label)
  pool[ref] = {
    id: ref, label, role: 'plain', dimensions: [], tags: [label], kind: 'concept',
    card: { nodeId: ref, title: label, tabs: [{ id: 'def', label: '定义', content }, ...tabs], rootContent: `${label}\n\n${content}` },
  }
  const parent = byId(parentTreeId)
  if (!parent) throw new Error(`新建「${label}」父 ${parentTreeId} 不存在`)
  const entry = { id: `final_${ref}`, name: label, count: 0, nodeRef: ref, children: [] }
  attachChild(parent.node, entry)
  const e = createTreeBindingEdge({ tree, pool, parentTreeId, childTreeId: entry.id, childKnowledgeId: ref })
  if (e && upsertEdge(edges, e)) addedEdges.push(e.id)
  created.push(`${ref}「${label}」`)
  log(`    新原子正身「${label}」(${ref}) @「${parent.node.name}」${isLatin ? '' : ''}`)
  return entry
}

/** 复用池内已存在正身并挂到指定父下。 */
function mountExisting(ref, label, parentTreeId) {
  const parent = byId(parentTreeId)
  if (!parent) throw new Error(`复用「${label}」父 ${parentTreeId} 不存在`)
  const entry = { id: `final_${ref}`, name: label, count: 0, nodeRef: ref, children: [] }
  attachChild(parent.node, entry)
  const e = createTreeBindingEdge({ tree, pool, parentTreeId, childTreeId: entry.id, childKnowledgeId: ref })
  if (e && upsertEdge(edges, e)) addedEdges.push(e.id)
  reused.push(`${ref}「${label}」`)
  log(`    复用已有正身「${label}」(${ref}) @「${parent.node.name}」（§0.4）`)
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

/** 移动子节点到指定父（默认原父）。 */
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
}

/** 改树名 + 池 label（保 id）。 */
function renameEntry(rec, to, tag) {
  if (COMPOUND_RE.test(to)) throw new Error(`改名目标「${to}」仍含连接符——拒绝`)
  const old = rec.node.name
  rec.node.name = to
  const p = pool[rec.node.nodeRef]
  if (p) {
    p.label = to
    if (p.card) p.card.title = to
    const rc = p.card?.rootContent ?? ''
    if (rc.startsWith(old)) p.card.rootContent = to + rc.slice(old.length)
  }
  renamed.push(`${tag}「${old}」→「${to}」`)
  log(`    改名（保 id、保挂载）：「${old}」→「${to}」`)
}

/** 按句子/行把正文归到两侧；两侧都不沾的句子归 A。
 *  若某侧一句都没分到（正文是单段且只谈一方），退回「两侧各持完整原文」，
 *  避免出现「一个正身有正文、另一个空手」的假归位。 */
function themedSplit(body, reA, reB, tag) {
  const chunks = String(body).split(/(?<=[。；！？!?])|\n/).map((s) => s.trim()).filter(Boolean)
  const a = []; const b = []
  for (const t of chunks) {
    const inA = reA.test(t); const inB = reB.test(t)
    if (inA && !inB) a.push(t)
    else if (inB && !inA) b.push(t)
    else a.push(t)
  }
  if (a.length === 0 || b.length === 0) {
    log(`    ⚠ 单段正文按主题切分后有一侧为空（${a.length}/${b.length}）→ 两侧各持完整原文，避免假归位`)
    notes.push(`${tag} 正文为单段/偏单主题，按主题切分会使一侧为空 → 两侧各持完整原文（原文 ${String(body).length} 字）`)
    return { a: String(body), b: String(body), mode: 'both-full' }
  }
  log(`    正文按主题归位：A 侧 ${a.length} 句 · B 侧 ${b.length} 句`)
  return { a: a.join('\n'), b: b.join('\n'), mode: 'themed' }
}

log('═══ 终审 9 项一体化落盘 ═══')
log(`起始 ${statLine(state)}`)

// ── #5 白名单（先做，数据 0 改动）────────────────────────────────────────
log('\n── #5 等待/通知机制 → 白名单豁免（数据 0 改动）──')
{
  const SCANNER = 'scripts/scan-tree-violations.mjs'
  const src = fs.readFileSync(SCANNER, 'utf8')
  const cur = '对象关系映射（ORM、O\\/RM 和 O\\/R 映射）)$'
  const next = '对象关系映射（ORM、O\\/RM 和 O\\/R 映射）|等待\\/通知机制)$'
  const m = uniqueMount('k_1785843242128_bus7le', '#5')
  log(`  #5「${m.node.name}」豁免：池✓ 挂载 1（正文 343 字）`)
  if (src.includes(next)) log('  白名单已是最新')
  else if (!src.includes(cur)) throw new Error('扫描器豁免正则与预期不一致，需人工确认')
  else if (!apply) log('  （干跑）将写入「等待\\/通知机制」')
  else { fs.writeFileSync(SCANNER, src.replace(cur, next), 'utf8'); log('  已写入白名单（含斜杠转义）') }
}

// ── #1 案例研究：经典的有界生产者/消费者问题 ─────────────────────────────
log('\n── #1 案例研究：经典的有界生产者/消费者问题 → 正文并入 生产者/消费者 + 卸树退池 ──')
{
  const REF = 'k_wiki_en_monitor_synchronization_s4'
  const rec = uniqueMount(REF, '#1')
  const body = shellContent(pool[REF])
  const hostId = uniqueMount('k_1786096455966_qnfpwx', '#1宿主').parent.id // 与「生产者消费者模式」同层
  const s = themedSplit(body, /生产者/, /消费者/, '#1')
  const tabsFor = (txt) => txt ? [{ id: 'case', label: '案例：经典的有界生产者、消费者问题', content: txt }] : []
  newNode('atomic_producer', '生产者',
    '生产者：向共享队列或缓冲区提交任务/数据的一方；缓冲区满时需阻塞或等待，直到消费者释放空间。',
    hostId, tabsFor(s.a))
  newNode('atomic_consumer', '消费者',
    '消费者：从共享队列或缓冲区取出任务/数据的一方；缓冲区空时需阻塞或等待，直到生产者放入新数据。',
    hostId, tabsFor(s.b))
  moveKids(rec, rec.parent.id, '#1')
  unloadTreeEntry(rec, '#1')
  gateAndDrop(REF, '#1')
}

// ── #2 解决有界生产者/消费者问题 → 提问卡 ───────────────────────────────
log('\n── #2 解决有界生产者/消费者问题 → 转提问卡（卸树留池）──')
{
  const REF = 'k_wiki_en_monitor_synchronization_s9'
  const rec = uniqueMount(REF, '#2')
  const CARD_ID = 'q_asplit_bpc_1'
  if (questions.some((q) => q.id === CARD_ID)) throw new Error(`#2: ${CARD_ID} 已存在`)
  const body = shellContent(pool[REF])
  questions.push({
    id: CARD_ID,
    text: '如何解决经典的有界生产者/消费者问题？',
    answered: true,
    kind: 'application',
    difficulty: 'advanced',
    answer: body,
    relatedNodeId: REF,
    answerSteps: [{ nodeId: 'atomic_producer' }, { nodeId: 'atomic_consumer' }],
    createdAt: now,
    updatedAt: now,
  })
  log(`    建卡 ${CARD_ID}：application/advanced · 绑定 ${REF} · answerSteps=[生产者, 消费者] · 答案 ${body.length} 字`)
  moveKids(rec, rec.parent.id, '#2')
  unloadTreeEntry(rec, '#2')
  log('    池节点保留（relatedNodeId 指向自身）')
}

// ── #3 形式语言理论 / 自动机理论 ────────────────────────────────────────
log('\n── #3 形式语言理论 / 自动机理论 → 真拆双正身 ──')
{
  const REF = 'theory_domain_formal_languages_automata'
  const rec = uniqueMount(REF, '#3')
  const parentId = rec.parent.id   // 计算理论
  const body = shellContent(pool[REF])
  const s = themedSplit(body, /形式语言/, /自动机/, '#3')
  const tabsFor = (txt) => txt ? [{ id: 'orig', label: '原文归位（拆分自 形式语言理论 / 自动机理论）', content: txt }] : []
  const fl = newNode('atomic_formal_language_theory', '形式语言理论',
    '形式语言理论：用严格的数学定义研究字符串集合（语言）及其生成与识别，是编译原理与计算理论的基础层。', parentId, tabsFor(s.a))
  const at = newNode('atomic_automata_theory', '自动机理论',
    '自动机理论：用抽象机器模型刻画计算的识别与判定能力——有限自动机、下推自动机、图灵机等，为形式语言提供识别装置。', parentId, tabsFor(s.b))
  semanticEdge('atomic:s3:automata-support', 'atomic_automata_theory', 'atomic_formal_language_theory', '支撑', 'dependency', '自动机为形式语言提供识别模型')
  // 2 个错挂的 SQL 概念子节点 → 归位到「数据库语言」，不随 #3 拆分带走
  const dbLang = byId('tree_wiki_en_database_s15') // 「数据库语言」条目本身（上一版误取其父，已修正）
  if (!dbLang) throw new Error('#3: 未找到「数据库语言」条目 tree_wiki_en_database_s15')
  notes.push('#3 的 2 个子节点（数据控制语言 / DCL、数据操纵语言 / DML）是错挂的 SQL 概念，'
    + '且与既有 concept_dcl / concept_dml（已挂「数据库语言」）重复 → 改挂回「数据库语言」，记为重复债务，不随拆分带走')
  moveKids(rec, dbLang.node.id, '#3')
  unloadTreeEntry(rec, '#3')
  gateAndDrop(REF, '#3')
}

// ── #4 管理程序/模拟器 ──────────────────────────────────────────────────
log('\n── #4 管理程序/模拟器 → 真拆双正身 ──')
{
  const REF = 'k_wiki_en_profiling_computer_programming_s13'
  const rec = uniqueMount(REF, '#4')
  const parentId = rec.parent.id
  const body = shellContent(pool[REF])
  const s = themedSplit(body, /管理程序|Hypervisor|虚拟机监视/, /模拟器|Emulator/i, '#4')
  const tabsFor = (txt) => txt ? [{ id: 'orig', label: '原文归位（拆分自 管理程序/模拟器）', content: txt }] : []
  const hv = newNode('atomic_hypervisor', '管理程序',
    '管理程序（Hypervisor / VMM）：在硬件之上创建并调度虚拟机的软件层，直接管理物理资源并隔离各虚拟机的执行。', parentId, tabsFor(s.a))
  const em = newNode('atomic_emulator', '模拟器',
    '模拟器（Emulator）：用软件在一种平台上复现另一种平台的行为，逐指令或按状态转换解释执行目标架构的程序。', parentId, tabsFor(s.b))
  semanticEdge('atomic:s4:hypervisor-emulator', 'atomic_hypervisor', 'atomic_emulator', '对比', 'reference', '管理程序与模拟器是两种不同的虚拟化手段')
  unloadTreeEntry(rec, '#4')
  gateAndDrop(REF, '#4')
}

// ── #6 等待/通知的经典范式 ──────────────────────────────────────────────
log('\n── #6 等待/通知的经典范式 → 正文并入 #5 supplement + 卸树退池 ──')
{
  const REF = 'k_1786006034803_zh191w'
  const rec = uniqueMount(REF, '#6')
  const target = uniqueMount('k_1785843242128_bus7le', '#6目标#5')
  const body = shellContent(pool[REF])
  addSupplementTab(target.node, { id: 'final:s6:paradigm', label: '等待/通知的经典范式', content: body, tags: pool[REF].tags ?? [] })
  log(`    正文 ${body.length} 字 → 「${target.node.name}」supplement`)
  moveKids(rec, rec.parent.id, '#6')
  unloadTreeEntry(rec, '#6')
  gateAndDrop(REF, '#6')
}

// ── #7 管道输入/输出流 ──────────────────────────────────────────────────
log('\n── #7 管道输入/输出流 → 真拆 PipedInputStream + PipedOutputStream ──')
{
  const REF = 'k_1786006088920_imdsjx'
  const rec = uniqueMount(REF, '#7')
  const parentId = rec.parent.id
  const body = shellContent(pool[REF])
  const s = themedSplit(body, /PipedInputStream|输入流/, /PipedOutputStream|输出流/, '#7')
  const tabsFor = (txt) => txt ? [{ id: 'orig', label: '原文归位（拆分自 管道输入、输出流）', content: txt }] : []
  const ins = newNode('atomic_piped_input_stream', 'PipedInputStream',
    'PipedInputStream：Java 管道输入流，从一个配对的 PipedOutputStream 读取字节，用于同一 JVM 内两个线程之间的管道通信。', parentId, tabsFor(s.a))
  const outs = newNode('atomic_piped_output_stream', 'PipedOutputStream',
    'PipedOutputStream：Java 管道输出流，把字节写入与之配对的 PipedInputStream，与读取端构成线程间的管道通道。', parentId, tabsFor(s.b))
  semanticEdge('atomic:s7:piped-pair', 'atomic_piped_input_stream', 'atomic_piped_output_stream', '配对', 'reference', 'PipedInputStream 与 PipedOutputStream 成对使用')
  unloadTreeEntry(rec, '#7')
  gateAndDrop(REF, '#7')
}

// ── #8 可达性分析算法/引用链法/跟踪垃圾收集 ─────────────────────────────
log('\n── #8 可达性分析算法/引用链法/跟踪垃圾收集 → 同义归一 ──')
{
  const REF = 'k_atom_reachability'
  const rec = uniqueMount(REF, '#8')
  const ALIASES = ['引用链法', '跟踪垃圾收集']
  renameEntry(rec, '可达性分析算法', '#8')
  const p = pool[REF]
  const existing = new Set(p.aliases ?? [])
  for (const a of ALIASES) existing.add(a)
  p.aliases = [...existing]
  log(`    aliases 写入：${JSON.stringify(p.aliases)}`)
  notes.push('#8 保留挂载（既有边 k_jvm_gc_reachability -[belongs-to]-> k_atom_reachability 不受影响）')
}

// ── #9 连接认证 → 本体拆分 + 机制状态正名 ───────────────────────────────
log('\n── #9 连接认证 → 身份认证 + 权限校验；机制状态正名「客户端鉴权」──')
{
  const REF = 'asplit_conn_state_auth'
  const rec = uniqueMount(REF, '#9')
  const spec = pool.qproc_thread_state?.mechanismSpec
  if (!spec || !spec.stateNodeIds.includes(REF)) throw new Error('#9: 该节点不在 qproc_thread_state.stateNodeIds，假设不成立')
  const parentId = rec.parent.id

  // ① 本体：身份认证（复用池内已存在 k_vault_se_auth，§0.4）+ 权限校验（新建）
  const authEntry = mountExisting('k_vault_se_auth', '身份认证', parentId)
  notes.push('#9 的「身份认证」池内已存在（k_vault_se_auth，原挂「软件工程」）→ 按 §0.4 复用，'
    + '因此该 nodeRef 现有 2 处挂载（+1 处重复挂载债务，如实记录）')
  const privEntry = newNode('atomic_privilege_check', '权限校验',
    '权限校验（AuthZ）：按账号加载权限表，判定该会话对具体对象的操作是否被授权；以身份认证通过为前提。', parentId)

  // ② 机制状态正名（ID 不变 → spec 零破坏）
  renameEntry(rec, '客户端鉴权', '#9')

  // ③ 机制关系连接
  semanticEdge('asplit:s99:uses-auth', REF, 'k_vault_se_auth', '使用', 'dependency', '客户端鉴权使用身份认证')
  semanticEdge('asplit:s99:uses-priv', REF, 'atomic_privilege_check', '使用', 'dependency', '客户端鉴权使用权限校验')
  semanticEdge('atomic:s9:priv-depends-auth', 'atomic_privilege_check', 'k_vault_se_auth', '依赖', 'dependency', '权限校验以身份认证为前提')
  log(`    spec 状态链保持：stateNodeIds 仍含 ${REF}，asplit:s99:t1 / asplit:s99:t2 端点未变`)
}

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条 / 题 ${questions.length} 张`)
log(`新建原子正身 ${created.length}：${created.join(' , ')}`)
log(`复用已有正身 ${reused.length}：${reused.join(' , ')}`)
log(`卸树 ${unloaded.size} 条 · 退池 ${dropped.length} 个 · 新建边 ${addedEdges.length} 条 · 改名 ${renamed.length} 处`)
for (const r of renamed) log(`  改名：${r}`)
for (const n of notes) log(`  ⚠ ${n}`)

if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
