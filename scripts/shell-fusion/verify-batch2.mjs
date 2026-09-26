/**
 * final-87-batch2（R 3 + D2 30 + C 37，实落 161 条）落盘后判据。
 * 只读：不改 data/。所有「本批是否引入」的结论都靠备份差分得出，不用推测。
 *
 * 与 verify-batch1 的差别：
 *   1. 退休名单不再硬编码，改由「池中 status 由非 archived-redirect 变为 archived-redirect」差分得出；
 *      被卸树条目同理由树差分得出。硬编码名单会在下一批过期失效。
 *   2. 增加 R2/R3 残留项与 D2-a 新建 mechanismSpec（第 15 个）的专项断言。
 *
 * 用法：node scripts/shell-fusion/verify-batch2.mjs [backupDir]
 */
import fs from 'node:fs'
import path from 'node:path'
import { gateScan, loadState } from './a-split/common.mjs'

const ROOT = process.cwd()
const D = path.join(ROOT, 'data')
const backupDir = process.argv[2] ?? (() => {
  const cands = fs.readdirSync(path.join(D, 'backups')).filter((d) => d.startsWith('final-87-batch2-')).sort()
  if (!cands.length) throw new Error('找不到 final-87-batch2-* 备份目录')
  return path.join('data', 'backups', cands[cands.length - 1])
})()

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const B = {
  tree: rd(path.join(ROOT, backupDir, 'tree-data.json')),
  pool: rd(path.join(ROOT, backupDir, 'node-pool.json')),
  edges: rd(path.join(ROOT, backupDir, 'knowledge-edges.json')),
  questions: rd(path.join(ROOT, backupDir, 'questions.json')),
}

const state = loadState()
const { pool, tree, edges, questions, events } = state

let fail = 0
const ok = (l, c, d = '') => { console.log((c ? '  ✓ ' : '  ✗ ') + l + (d ? ' — ' + d : '')); if (!c) fail++ }

const flattenTree = (root) => {
  const out = []
  ;(function w(n, parent) { out.push({ id: n.id, name: n.name, ref: n.nodeRef, parent, node: n }); (n.children || []).forEach((c) => w(c, n)) })(root, null)
  return out
}
const flat = flattenTree(tree)
const flatB = flattenTree(B.tree)
const treebindCount = (list) => list.filter((e) => String(e.id).startsWith('treebind:')).length

// ── 差分：本批卸载的树条目 / 本批退休的池节点 ─────────────────────────────
const idsNow = new Set(flat.map((r) => r.id))
const idsB = new Set(flatB.map((r) => r.id))
const UNLOADED = [...idsB].filter((i) => !idsNow.has(i))
const ADDED = [...idsNow].filter((i) => !idsB.has(i))
const RETIRED = Object.keys(pool).filter((k) => pool[k]?.status === 'archived-redirect' && B.pool[k]?.status !== 'archived-redirect')
const UNLOADED_REFS = flatB.filter((r) => UNLOADED.includes(r.id)).map((r) => r.ref).filter(Boolean)

console.log(`备份基线：${backupDir}`)
console.log(`本批差分：卸树 ${UNLOADED.length} 条 / 新树条目 ${ADDED.length} 条 / 退休 ${RETIRED.length} 个池节点`)

console.log(`\n══ 1. 格式契约（5 文件）══`)
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']) {
  const b = fs.readFileSync(path.join(D, f))
  const bom = b[0] === 0xef
  const txt = b.toString('utf8')
  const tail = b.subarray(-1).toString('utf8')
  ok(`${f} 无BOM / 2空格缩进 / 末尾无换行`, !bom && /\n  [^\s]/.test(txt) && tail !== '\n', `尾=${JSON.stringify(tail)}`)
}

console.log('\n══ 2. 树完整性 ══')
ok('树 nodeRef 悬空 = 0', flat.filter((r) => r.ref && !pool[r.ref]).length === 0, `条目 ${flat.length}（含根；基线 ${flatB.length}）`)
const dupIds = flat.map((r) => r.id).filter((v, i, a) => a.indexOf(v) !== i)
ok('树 id 唯一', dupIds.length === 0, dupIds.slice(0, 5).join(','))
const dupNameKinds = (list) => {
  const m = {}
  for (const r of list) m[r.name] = (m[r.name] || 0) + 1
  return Object.entries(m).filter(([, c]) => c > 1)
}
// ⚠️ 宇宙树**从不要求全局名字唯一**（基线即有 165 种重名）。这里查两条：
//   (a) 新增的重名种类必须落在已登记的容忍清单内（空清单 = 零容忍，future 批次若引入新重名会失败）；
//   (b) 本批新名必须「未比自己基线出现次数更多」（章节壳去序号会让壳名与既有节点撞名，属换位不算新增）。
const dupKindNames = (list) => dupNameKinds(list).map(([n]) => n)
const dupB = dupKindNames(flatB)
const dupC = dupKindNames(flat)
const nameCount = (list) => list.reduce((m, r) => { m[r.name] = (m[r.name] || 0) + 1; return m }, {})
const cntC = nameCount(flat)
// ── 已登记容忍清单（显式豁免，非静默压制）────────────────────────────────
// (1) TOLERATED_NEW_DUP：本批**新制造**的重名种类。
//   存储系统：章节壳 chapter_db_10 去序号后与「系统组织」分支下的 theory_domain_storage_systems 撞名。
//   两者跨分支（父分别为「数据库」「系统组织」）、孩子互斥（压缩/缓冲池/表空间/页 vs 干净页/行格式/虚拟列），
//   属既有语义重叠被去序号暴露，非本批新增实体。是否合并归 taxonomy 批次裁决，本批只登记不处理。
const TOLERATED_NEW_DUP = ['存储系统']
// (2) TOLERATED_CARRYOVER_DUP：撞上的名字**基线本就是重名种类**（章节壳 × wiki 大纲同名），
//   去序号只是把「另一处同名」从壳名换成正名，出现次数不增（2→2），不构成新债。
const TOLERATED_CARRYOVER_DUP = ['数据库设计', '数据库安全']
const newDupKinds = dupC.filter((n) => !dupB.includes(n))
const unexpectedDup = newDupKinds.filter((n) => !TOLERATED_NEW_DUP.includes(n))
ok('新增重名种类 ⊆ 已登记容忍清单', unexpectedDup.length === 0,
  `新增 ${JSON.stringify(newDupKinds)} / 容忍 ${JSON.stringify(TOLERATED_NEW_DUP)}；种类 ${dupB.length} → ${dupC.length}`)
const staleExemption = TOLERATED_NEW_DUP.filter((n) => !newDupKinds.includes(n))
ok('容忍清单无过期条目（避免豁免长期漂白）', staleExemption.length === 0, staleExemption.join(',') || 'clean')
const staleCarry = TOLERATED_CARRYOVER_DUP.filter((n) => !dupB.includes(n))
ok('沿用清单无过期条目（名字须在基线就已重名）', staleCarry.length === 0, staleCarry.join(',') || 'clean')

// 本批改名后的新名（去序号章节壳 / 详解总览壳归一 / 大壳实名）
const NEW_NAMES = [
  '数据库系统', '数据模型', '数据库结构', '数据库操作', '恢复系统', '日志系统', '存储系统', '数据表示',
  '数据库设计', '数据库分布与复制', '数据库安全', '数据库运维', '数据库编程与接口', '数据库产品', '数据库文件与实现',
  'Java 集合框架', 'CachedThreadPool', 'FixedThreadPool', 'SingleThreadExecutor', 'Java 多线程编程', 'MyBatis',
  'Java 数据结构', 'JVM 核心概念', 'Java 语法要素', '软件开发', '监控驱动动态扩容', '跨系统标准与约定',
]
// ⚠️ 不能拿「新名在基线里的出现次数」当基线——改名是**替换**旧名，新名基线必为 0，
// 那样每个新名都会被判超标（实测 26 项假阳性）。正确的判据是：新名不得在树中撞名，
// 撞名者必须落在容忍清单内。
const collide = NEW_NAMES.filter((n) => (cntC[n] || 0) > 1)
const unexpectedCollide = collide.filter((n) => !TOLERATED_NEW_DUP.includes(n) && !TOLERATED_CARRYOVER_DUP.includes(n))
ok(`${NEW_NAMES.length} 个本批新名未产生计划外撞名`, unexpectedCollide.length === 0,
  unexpectedCollide.map((n) => `${n}×${cntC[n]}`).join(', ') || `实撞名 ${collide.length} 个 ${JSON.stringify(collide)} ⊆ 容忍∪沿用清单`)
const notLanded = NEW_NAMES.filter((n) => !flat.some((r) => r.name === n))
ok('全部新名确实落在树中', notLanded.length === 0, notLanded.join(',') || 'clean')

console.log('\n══ 3. 边完整性（区分「本批引入」与「既有债」）══')
const badEdge = edges.filter((e) => !pool[e.source] || !pool[e.target])
const badEdgeB = B.edges.filter((e) => !B.pool[e.source] || !B.pool[e.target])
ok('边端点悬空 —— 本批未新增', badEdge.length <= badEdgeB.length,
  `基线 ${badEdgeB.length} → 现状 ${badEdge.length}（Δ${badEdge.length - badEdgeB.length}）`)
ok('边 type 全非空', edges.filter((e) => !e.type).length === 0)
const tbNow = treebindCount(edges)
const tbBefore = treebindCount(B.edges)
ok('treebind 边净减（本批卸树 ≥ 提级）', tbNow <= tbBefore, `全局 treebind ${tbBefore} → ${tbNow}（Δ${tbNow - tbBefore}）`)
// ⚠️ 必须按 `:` 分段**精确**比对。用 includes() 子串匹配会误报（batch1 实测 6 条全误报）。
const UNLOAD_SET = new Set(UNLOADED)
const orphanEdges = edges.filter((e) => String(e.id).startsWith('treebind:') && String(e.id).split(':').some((s) => UNLOAD_SET.has(s)))
ok(`${UNLOADED.length} 个已卸条目的 treebind 边全部清零（按 : 分段精确匹配）`, orphanEdges.length === 0, orphanEdges.map((e) => e.id).slice(0, 5).join(',') || '0 条')

console.log('\n══ 4. mechanismSpec 完整性（D2-a 新建第 15 个）══')
const BEANLC = ['bean_lc_prepare', 'bean_lc_instantiate', 'bean_lc_inject', 'bean_lc_cache', 'bean_lc_destroy']
let specCount = 0; let stateTotal = 0
const brokenRefs = []
for (const [id, n] of Object.entries(pool)) {
  const ms = n.mechanismSpec
  if (!ms) continue
  specCount += 1
  stateTotal += (ms.stateNodeIds || []).length
  for (const s of ms.stateNodeIds || []) if (!pool[s]) brokenRefs.push(`${id}.stateNodeIds→${s}`)
  for (const f of ['phenomenonNodeId', 'triggerNodeIds', 'participantNodeIds', 'outcomeNodeIds', 'failureNodeIds']) {
    const v = ms[f]
    for (const x of Array.isArray(v) ? v : (v ? [v] : [])) if (!pool[x]) brokenRefs.push(`${id}.${f}→${x}`)
  }
  for (const e of ms.transitionEdgeIds || []) if (!edges.some((x) => x.id === e)) brokenRefs.push(`${id}.transitionEdgeIds→${e}`)
  for (const e of ms.constraintEdgeIds || []) if (!edges.some((x) => x.id === e)) brokenRefs.push(`${id}.constraintEdgeIds→${e}`)
}
ok('spec 数量 = 15（batch1 的 14 + D2-a 新增 1）', specCount === 15, String(specCount))
ok('spec 全字段引用可解析', brokenRefs.length === 0, brokenRefs.slice(0, 5).join(' | '))
ok('5 个 Bean 生命周期状态仍留在池中（卸树 ≠ 删节点）', BEANLC.every((r) => !!pool[r]), BEANLC.filter((r) => !pool[r]).join(',') || `state 槽合计 ${stateTotal}`)
ok('5 个状态 kind=state / role=conclusion', BEANLC.every((r) => pool[r]?.kind === 'state' && pool[r]?.role === 'conclusion'))
ok('5 个状态标签已去序号', BEANLC.every((r) => !/^\d+\./.test(pool[r]?.label ?? 'x')), BEANLC.map((r) => pool[r]?.label).join(' / '))
const TRANS = [1, 2, 3, 4].map((i) => `beanlc:t_${i}`)
ok('4 条机制内部边 beanlc:t_1..t_4 已建', TRANS.every((id) => edges.some((e) => e.id === id)))
ok('4 条内部边 type=transitions-to / relationKind=state-transition',
  TRANS.every((id) => { const e = edges.find((x) => x.id === id); return e?.type === 'transitions-to' && e?.relationKind === 'state-transition' }))
ok('宿主 asplit_bean_lifecycle 标为 mechanism（kind/role）', pool.asplit_bean_lifecycle?.kind === 'mechanism' && pool.asplit_bean_lifecycle?.role === 'mechanism')
ok('宿主 spec 的 stateNodeIds 恰为 5 个 Bean 生命周期阶段',
  JSON.stringify(pool.asplit_bean_lifecycle?.mechanismSpec?.stateNodeIds) === JSON.stringify(BEANLC))
// 5 个状态的正文已镜像进宿主 supplement（渲染面在**树条目**上，不在池节点上：
// TemporalIndexWorkspace 读的是 activePathContext?.supplement?.tabs；
// 且池 ref `asplit_bean_lifecycle` 对应的树 id 是 `asplit_s1_asplit_bean_lifecycle`，两者不是同一命名空间）
const hostEntry = flat.find((r) => r.id === 'asplit_s1_asplit_bean_lifecycle')
const hostTabs = hostEntry?.node?.supplement?.tabs ?? []
ok('宿主树条目 supplement 含 5 个 Bean 生命周期 tab',
  BEANLC.every((r) => hostTabs.some((t) => t.id === `final87:d2-${r}`)),
  `宿主树条目 ${hostEntry?.id ?? '缺失'}，现有 tab ${hostTabs.length} 个`)

console.log('\n══ 5. 题库 / 演进事件引用 ══')
const qBad = questions.filter((q) => (q.relatedNodeId && !pool[q.relatedNodeId]) || (q.answerSteps || []).some((s) => s && s.nodeId && !pool[s.nodeId]))
ok('题库 relatedNodeId / answerSteps 悬空 = 0', qBad.length === 0, qBad.map((q) => q.id).join(','))
const eBad = []
for (const ev of events) {
  if (ev.scopeRootId && !pool[ev.scopeRootId]) eBad.push(`${ev.id}.scopeRootId`)
  for (const n of ev.sourceOnlyNodeIds || []) if (!pool[n]) eBad.push(`${ev.id}.sourceOnly`)
  for (const n of ev.introducedNodes || []) if (n && !pool[n.nodeId]) eBad.push(`${ev.id}.introduced`)
  for (const c of ev.changes || []) if (c && !pool[c.targetNodeId]) eBad.push(`${ev.id}.changes`)
}
ok('演进事件引用悬空 = 0', eBad.length === 0, eBad.join(','))
// P 段：4 张题的承载从「线程池详解」壳改指名词本体
const THREADPOOLEXEC = 'k_java_type_ff6db88dc6746818'
const moved = questions.filter((q) => q.relatedNodeId === THREADPOOLEXEC)
const stillShell = questions.filter((q) => q.relatedNodeId === 'k_1786093143886_qda5cu')
ok('4 张题 relatedNodeId 已重指 ThreadPoolExecutor 正身', moved.length === 4 && stillShell.length === 0, `命中 ${moved.length} 张，残留壳指向 ${stillShell.length} 张`)
const TP_EDGE = 'edge_vault_threadpool_relates_executor'
const e2 = edges.find((x) => x.id === TP_EDGE)
ok('边不再挂在退休壳上（重指或去重删除）', !e2 || e2.source !== 'k_vault_java_1n4uei', e2 ? `source=${e2.source}` : '该边已作为重复边删除')

console.log('\n══ 6. 门一：本批退休壳的六处活引用 ══')
const gate = gateScan(state, RETIRED, { excludeTreeIds: UNLOADED })
ok('六处活引用零命中（节点自身留在池内是预期的）', gate.hits.length === 0, gate.hits.slice(0, 6).join(' | ') || '0 命中')
ok(`${RETIRED.length} 个壳全部标记 archived-redirect + redirectTo + canonicalNodeId`,
  RETIRED.every((r) => pool[r]?.status === 'archived-redirect' && pool[r]?.redirectTo && pool[r]?.canonicalNodeId),
  RETIRED.filter((r) => !(pool[r]?.redirectTo && pool[r]?.canonicalNodeId)).join(',') || 'ok')
ok('已卸条目的池节点未被删除（卸树 ≠ 删节点）', UNLOADED_REFS.every((r) => !!pool[r]), UNLOADED_REFS.filter((r) => !pool[r]).join(',') || `${UNLOADED_REFS.length} 个 ref 全在池`)

console.log('\n══ 7. 正文融合（详解壳 → 正身补注）══')
// ⚠️ supplement 落在**树条目**上（渲染面），tab id 规则是 `final87:<壳的树 id>`（不是池 ref！）。
// 池 ref（k_vault_javajavaarraylist_an0rm3）与树 id（tree_vault_javajavaarraylist_an0rm3）
// 是两个命名空间：退出/退休查 ref，正文落点查 treeId。混用会得到 0/10 的假阴性。
const FUSE = [
  { treeId: 'tree_demo_java_array_list', shellTreeId: 'tree_vault_javajavaarraylist_an0rm3', ref: 'k_vault_javajavaarraylist_an0rm3', label: 'ArrayList' },
  { treeId: 'tree_1785463930183_6xqdzx', shellTreeId: 'tree_vault_javajavahashmap_14a6f2', ref: 'k_vault_javajavahashmap_14a6f2', label: 'HashMap' },
  { treeId: 'tree_1785684483891_xdr40d', shellTreeId: 'tree_vault_javajavahashset_176pvr', ref: 'k_vault_javajavahashset_176pvr', label: 'HashSet' },
  { treeId: 'tree_1785683698292_nhrf3z', shellTreeId: 'tree_vault_javajavalinkedlist_1uc0ii', ref: 'k_vault_javajavalinkedlist_1uc0ii', label: 'LinkedList' },
  { treeId: 'tree_1785415709050_n3rbw5', shellTreeId: 'tree_vault_java_1n4uei', ref: 'k_vault_java_1n4uei', label: '线程池' },
  { treeId: 'tree_1785918560147_r0lv4e', shellTreeId: 'tree_1786095193397_uyjgsm', ref: 'k_1786095193093_odfdcm', label: 'FutureTask' },
  { treeId: 'tree_java_source_1a247659a8087e94_s_type_af32be37bc61aea4', shellTreeId: 'tree_1786093347020_15dntb', ref: 'k_1786093346748_5mapqp', label: 'ScheduledThreadPoolExecutor' },
  { treeId: 'tree_1785416767656_xllpk1', shellTreeId: 'tree_1786093144146_ajv4cr', ref: 'k_1786093143886_qda5cu', label: 'ThreadPoolExecutor' },
  { treeId: 'tree_java_fw_kafka', shellTreeId: 'tree_vault_javakafkakafka_1qlqb8', ref: 'k_vault_javakafkakafka_1qlqb8', label: 'Kafka' },
  { treeId: 'tree_java_fw_springcloud', shellTreeId: 'tree_vault_javaspringcloudspringcloud_33p5su', ref: 'k_vault_javaspringcloudspringcloud_33p5su', label: 'Spring Cloud' },
]
const tabOf = (f) => (flat.find((r) => r.id === f.treeId)?.node?.supplement?.tabs ?? []).find((t) => t.id === `final87:${f.shellTreeId}`)
let fusedOk = 0
let fusedChars = 0
for (const f of FUSE) {
  const t = tabOf(f)
  if (t) { fusedOk++; fusedChars += (t.content ?? '').length }
  else console.log(`      ✗ 未找到融合 tab：${f.label}（树条目 ${f.treeId} ${flat.some((r) => r.id === f.treeId) ? '存在但无 final87:' + f.shellTreeId : '不存在'}）`)
}
ok(`${FUSE.length} 个详解壳的正文已挂到正身树条目的 supplement`, fusedOk === FUSE.length, `${fusedOk}/${FUSE.length}，正文合计 ${fusedChars} 字`)
// 融合了正文的壳应已退休
ok('10 个详解壳全部退休', FUSE.every((f) => pool[f.ref]?.status === 'archived-redirect'))
// 融合正文不得是空串（防止「挂了个空 tab」）
const emptyTabs = FUSE.filter((f) => { const t = tabOf(f); return t && !(t.content ?? '').trim() })
ok('融合 tab 正文均非空', emptyTabs.length === 0, emptyTabs.map((f) => f.label).join(',') || `最长的 ${Math.max(...FUSE.map((f) => (tabOf(f)?.content ?? '').length))} 字`)
// 壳的正文必须与正身不重复挂载（同一 tab id 只能出现在一处）
const dupTab = FUSE.filter((f) => flat.filter((r) => ((r.node.supplement?.tabs) ?? []).some((t) => t.id === `final87:${f.shellTreeId}`)).length > 1)
ok('融合 tab 未在多处重复挂载', dupTab.length === 0, dupTab.map((f) => f.label).join(',') || 'unique')

console.log('\n══ 8. R 组残留收尾 ══')
const kidsOf = (list, id) => (list.find((r) => r.id === id)?.node.children ?? [])
const R2_KIDS = ['tree_1783171290335_i1egql', 'tree_atomic_k_atom_reachability']
ok('R2：判定方法已在「垃圾回收判定」名下',
  R2_KIDS.every((k) => kidsOf(flat, 'tree_jvm_gc_reachability').some((c) => c.id === k)),
  `垃圾回收判定 ${kidsOf(flat, 'tree_jvm_gc_reachability').length} 孩`)
ok('R2：「垃圾回收」不再直接持有这两个孩子',
  !R2_KIDS.some((k) => kidsOf(flat, 'tree_1783171786694_r8028l').some((c) => c.id === k)),
  `垃圾回收 ${kidsOf(flat, 'tree_1783171786694_r8028l').length} 孩`)
const OLD_TAGS = [['sk_perf_bottleneck', '如何发现瓶颈'], ['aop_flow', '执行阶段'], ['bcs_caller', '调用方(getBean 请求)']]
ok('R3：3 个旧壳名 tag 已清除', OLD_TAGS.every(([id, t]) => !(pool[id]?.tags ?? []).includes(t)),
  OLD_TAGS.filter(([id, t]) => (pool[id]?.tags ?? []).includes(t)).map(([id, t]) => `${id}←${t}`).join(',') || 'clean')
ok('R3：新名 tag 仍在（batch1 补入的别名未误删）',
  ['系统性能瓶颈定位', 'AOP 执行流程', 'getBean 请求调用方'].every((t, i) => (pool[OLD_TAGS[i][0]]?.tags ?? []).includes(t)))

console.log('\n══ 9. 提级孩子（按集合判定，不看孩子数）══')
const PROMOTE = [
  { host: 'tree_wiki_en_outline_of_databases_s20', label: '数据仓库', shell: 'tree_wiki_en_outline_of_databases_s20_s21', promotePrefix: 'tree_wiki_en_outline_of_databases_s20_s21_', promoted: 11 },
  { host: 'chapter_db_13', label: '数据库设计', shell: 'asplit_s106_db_design', kidCount: 4 },
  { host: 'tree_1785918560147_r0lv4e', label: 'FutureTask', shell: 'tree_1786095193397_uyjgsm', kidCount: 2 },
  { host: 'tree_java_source_1a247659a8087e94_s_type_af32be37bc61aea4', label: 'ScheduledThreadPoolExecutor', shell: 'tree_1786093347020_15dntb', kidCount: 2 },
  { host: 'tree_1785416767656_xllpk1', label: 'ThreadPoolExecutor', shell: 'tree_1786093144146_ajv4cr', kidCount: 3 },
]
for (const p of PROMOTE) {
  const after = kidsOf(flat, p.host)
  ok(`${p.label}：壳已不是其孩子`, !after.some((c) => c.id === p.shell), `现状 ${after.length} 孩`)
  if (p.promotePrefix) {
    // ⚠️ 提级保留原子节点 id（不重新生成），所以只能用「原壳 id 前缀」定位，不能猜 `_b1` 之类的新 id
    const landed = after.filter((c) => String(c.id).startsWith(p.promotePrefix))
    ok(`${p.label}：${p.promoted} 个原孙子已就位（按原壳 id 前缀）`, landed.length === p.promoted, `命中 ${landed.length} 个`)
    const tb = landed.filter((c) => edges.some((e) => String(e.id) === `treebind:${p.host}:${c.id}`)).length
    ok(`${p.label}：${p.promoted} 个提级孩子均带 treebind 边`, tb === p.promoted, `treebind ${tb} 条`)
  }
  if (p.kidCount != null) ok(`${p.label}：提级孩子数 ≥ ${p.kidCount}`, after.length >= p.kidCount, `现状 ${after.length} 孩`)
}

console.log('\n══ 10. 本批规模核验 ══')
ok('池节点数未减少（卸树 ≠ 删节点）', Object.keys(pool).length === Object.keys(B.pool).length, `${Object.keys(B.pool).length} → ${Object.keys(pool).length}`)
const shellInTree = flat.filter((r) => /^(如何|为什么|什么是|何时|怎么|哪些|是否)/.test(r.name) || /详解$|总览$|基础$|入门$/.test(r.name))
ok('树中已无提问型 / 详解总览基础壳名', shellInTree.length === 0, shellInTree.slice(0, 6).map((r) => r.name).join(',') || 'clean')
console.log(`      （参考）本批卸树 ${UNLOADED.length} / 退休 ${RETIRED.length} / 新增树条目 ${ADDED.length}；全树 ${flatB.length} → ${flat.length}`)

console.log('\n' + (fail === 0 ? '★ 全部通过（0 项未通过）' : `✗ ${fail} 项未通过`))
process.exit(fail === 0 ? 0 : 1)
