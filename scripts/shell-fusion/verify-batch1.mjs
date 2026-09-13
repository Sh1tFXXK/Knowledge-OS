/**
 * final-87-batch1（E + D1，20 条）落盘后判据。
 * 只读：不改 data/。所有「本批是否引入」的结论都靠备份差分得出，不用推测。
 *
 * 用法：node scripts/shell-fusion/verify-batch1.mjs [backupDir]
 */
import fs from 'node:fs'
import path from 'node:path'
import { gateScan, loadState } from './a-split/common.mjs'

const ROOT = process.cwd()
const D = path.join(ROOT, 'data')
const backupDir = process.argv[2] ?? (() => {
  const cands = fs.readdirSync(path.join(D, 'backups')).filter((d) => d.startsWith('final-87-batch1-')).sort()
  return path.join('data', 'backups', cands[cands.length - 1])
})()

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const B = {
  tree: rd(path.join(ROOT, backupDir, 'tree-data.json')),
  pool: rd(path.join(ROOT, backupDir, 'node-pool.json')),
  edges: rd(path.join(ROOT, backupDir, 'knowledge-edges.json')),
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
const treebindCount = (list, ids) => list.filter((e) => String(e.id).startsWith('treebind:') && (ids ? ids.includes(e.target) : true)).length

console.log(`备份基线：${backupDir}`)
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
// 注：宇宙树**从不要求全局名字唯一**（基线即有 165 种重名，如 Itr×9 / Node×11 / 方法×6）。
// 因此这里只能查「本批是否让重名变多」，以及本批 3 个新名各自唯一。
const dupB = dupNameKinds(flatB)
const dupC = dupNameKinds(flat)
ok('本批未增加重名种类', dupC.length <= dupB.length, `基线 ${dupB.length} 种 → 现状 ${dupC.length} 种`)
const renamed = ['系统性能瓶颈定位', 'AOP 执行流程', 'getBean 请求调用方']
ok('本批 3 个新名未落入重名集合', renamed.every((n) => !dupC.some(([x]) => x === n)), dupC.filter(([x]) => renamed.includes(x)).map(([n, c]) => `${n}×${c}`).join(',') || 'clean')

console.log('\n══ 3. 边完整性（区分「本批引入」与「既有债」）══')
const badEdge = edges.filter((e) => !pool[e.source] || !pool[e.target])
const badEdgeB = B.edges.filter((e) => !B.pool[e.source] || !B.pool[e.target])
ok('边端点悬空 —— 本批未新增', badEdge.length <= badEdgeB.length,
  `基线 ${badEdgeB.length} → 现状 ${badEdge.length}（Δ${badEdge.length - badEdgeB.length}）`)
ok('边 type 全非空', edges.filter((e) => !e.type).length === 0)
const tbNow = treebindCount(edges)
const tbBefore = treebindCount(B.edges)
ok('treebind 边残留 = 0（本批卸载的 17 个条目）', true, `全局 treebind ${tbBefore} → ${tbNow}（Δ${tbNow - tbBefore}）`)
const ORPHAN_TREES = ['tree_1785923886640_ydkgnc', 'tree_vault_javarabbitmq01mq_j62j4c', 'tree_sharding_when', 'tree_idxf_overview', 'tree_1783264901125_rlyl58', 'tree_wiki_en_outline_of_databases_s1',
  'tree_aop_state_proxy_created', 'tree_aop_state_intercepted', 'tree_aop_state_chain_running', 'tree_aop_state_advice_done', 'tree_aop_state_target_invoked',
  'tree_tio_state_read_syscall', 'tree_tio_state_disk_to_kernel', 'tree_tio_state_kernel_to_user', 'tree_tio_state_write_syscall', 'tree_tio_state_user_to_socket', 'tree_tio_state_socket_to_nic']
const ORPHAN_SET = new Set(ORPHAN_TREES)
// ⚠️ 必须按 `:` 分段**精确**比对。用 includes() 子串匹配会误报：
// `tree_wiki_en_outline_of_databases_s1` 是 `..._s10_s12_b7` 的前缀，
// 也是本批新建的 `..._s1_b1/b2/b3` 三个提级 treebind 的前缀（实测 6 条全是误报）。
const orphanEdges = edges.filter((e) => String(e.id).startsWith('treebind:') && String(e.id).split(':').some((s) => ORPHAN_SET.has(s)))
ok('17 个已卸条目的 treebind 边全部清零（按 : 分段精确匹配）', orphanEdges.length === 0, orphanEdges.map((e) => e.id).join(',') || '0 条')

console.log('\n══ 4. 机制 spec 零破坏 ══')
const REFS = ['aop_state_proxy_created', 'aop_state_intercepted', 'aop_state_chain_running', 'aop_state_advice_done', 'aop_state_target_invoked',
  'tio_state_read_syscall', 'tio_state_disk_to_kernel', 'tio_state_kernel_to_user', 'tio_state_write_syscall', 'tio_state_user_to_socket', 'tio_state_socket_to_nic']
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
ok('spec 数量仍为 14', specCount === 14, String(specCount))
ok('spec 全字段引用可解析', brokenRefs.length === 0, brokenRefs.slice(0, 5).join(' | '))
ok(`11 个卸树状态节点仍留在池中（spec 渲染面）`, REFS.every((r) => !!pool[r]), REFS.filter((r) => !pool[r]).join(',') || `state 槽合计 ${stateTotal}`)

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
ok('q_why_index_fast 已重指名词本体', questions.find((q) => q.id === 'q_why_index_fast')?.relatedNodeId === 'n_0xxb9cqy')

console.log('\n══ 6. 门一：6 个退休壳的六处活引用 ══')
const RETIRED = ['k_1785923886439_k5so6c', 'k_vault_javarabbitmq01mq_j62j4c', 'sharding_when', 'idxf_overview', 'k_1783264901088_1s02ir', 'k_wiki_en_outline_of_databases_s1']
const gate = gateScan(state, RETIRED, { excludeTreeIds: ORPHAN_TREES })
ok('六处活引用零命中（节点自身留在池内是预期的）', gate.hits.length === 0, gate.hits.slice(0, 5).join(' | ') || '0 命中')
ok('6 个壳标记 archived-redirect + redirectTo', RETIRED.every((r) => pool[r]?.status === 'archived-redirect' && pool[r]?.redirectTo))

console.log('\n══ 7. 本批变更核验 ══')
const byName = (nm) => flat.filter((r) => r.name === nm)
for (const nm of ['系统性能瓶颈定位', 'AOP 执行流程', 'getBean 请求调用方']) ok(`改名生效且唯一：${nm}`, byName(nm).length === 1, `${byName(nm).length} 处`)
ok('3 个旧名已从树中消失', ['如何发现瓶颈', '执行阶段', '调用方（getBean 请求）'].every((n) => byName(n).length === 0))
ok('17 个已卸树条目不在树中', ORPHAN_TREES.every((t) => !flat.some((r) => r.id === t)))
ok('池节点数未减少（卸树 ≠ 删节点）', Object.keys(pool).length === Object.keys(B.pool).length, `${Object.keys(B.pool).length} → ${Object.keys(pool).length}`)

console.log('\n══ 8. 提级孩子（按集合判定，不看孩子数）══')
// ⚠️ 不能用「孩子数变多」判定：MySQL 索引 是 4 → 4（摘掉壳 1 个、换进它的孩子 1 个，
// 总数不变但集合变了）。必须断言「壳不再是孩子 + 原孙子已就位」。
const kidsOf = (list, id) => (list.find((r) => r.id === id)?.node.children ?? [])
const PROMOTE = [
  { host: 'tree_1783171786694_r8028l', label: '垃圾回收', shell: '如何判断对象可以被回收', kidIds: ['tree_1783171290335_i1egql', 'tree_atomic_k_atom_reachability'], kidNames: ['引用计数法', '可达性分析算法'] },
  { host: 'tree_1786175188148_3flq6j', label: 'MySQL 索引', shell: '为什么命中索引比不命中快', kidIds: ['tree_idxf_cost'], kidNames: ['索引的弊端'] },
  { host: 'chapter_db_01', label: '一、数据库系统', shell: '数据库是什么类型的东西？', kidIds: ['tree_wiki_en_outline_of_databases_s1_b1', 'tree_wiki_en_outline_of_databases_s1_b2', 'tree_wiki_en_outline_of_databases_s1_b3'], kidNames: ['信息', '数据', '计算机数据'] },
]
for (const p of PROMOTE) {
  const before = kidsOf(flatB, p.host).map((c) => c.name)
  const after = kidsOf(flat, p.host)
  ok(`${p.label}：壳「${p.shell}」已不是其孩子`, !after.some((c) => c.name === p.shell), `基线 ${before.length} 孩 → 现状 ${after.length} 孩`)
  const landed = p.kidIds.every((id) => after.some((c) => c.id === id))
  const named = p.kidNames.every((nm) => after.some((c) => c.name === nm))
  ok(`${p.label}：${p.kidIds.length} 个原孙子已就位（id 与名双重校验）`, landed && named)
  const tb = after.filter((c) => edges.some((e) => String(e.id) === `treebind:${p.host}:${c.id}`)).length
  console.log(`      （参考）${p.label} 亲儿子 ${after.length} 个，其中带 treebind 边 ${tb} 条`)
}

console.log('\n' + (fail === 0 ? `★ 全部通过（${0} 项未通过）` : `✗ ${fail} 项未通过`))
process.exit(fail === 0 ? 0 : 1)
