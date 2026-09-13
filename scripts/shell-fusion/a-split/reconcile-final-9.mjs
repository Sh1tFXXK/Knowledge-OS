/** 只读：终审 9 项对账（目标名是否存在 / 子节点 / 正文 / 现有边）。 */
import { loadState, flatten, shellContent, log } from './common.mjs'

const state = loadState()
const { pool, tree, edges, questions } = state
const flat = flatten(tree)
const byRef = (ref) => flat.filter((f) => f.node.nodeRef === ref)
const labelHits = (l) => Object.values(pool).filter((n) => (n.label ?? '') === l)
const show = (tag, ref) => {
  const ms = byRef(ref)
  if (ms.length !== 1) { log(`  ${tag} ${ref} ⚠ 挂载 ${ms.length}`); return }
  const m = ms[0]
  log(`  ${tag}「${m.node.name}」(${m.node.id}) ref=${ref}`)
  log(`      正文 ${pool[ref] ? shellContent(pool[ref]).length : -1} 字 · 直接孩 ${(m.node.children ?? []).length} · 父=「${m.parent?.name}」`)
  for (const k of (m.node.children ?? []).slice(0, 10)) log(`        · 「${k.name}」ref=${k.nodeRef}`)
}

log('══ 一、9 个待处理节点现状 ══')
show('#1', 'k_wiki_en_monitor_synchronization_s4')
show('#2', 'k_wiki_en_monitor_synchronization_s9')
show('#3', 'theory_domain_formal_languages_automata')
show('#4', 'k_wiki_en_profiling_computer_programming_s13')
show('#5', 'k_1785843242128_bus7le')
show('#6', 'k_1786006034803_zh191w')
show('#7', 'k_1786006088920_imdsjx')
show('#8', 'k_atom_reachability')
show('#9', 'asplit_conn_state_auth')

log('\n══ 二、裁决里点名的目标正身是否存在（决定复用 or 新建）══')
const TARGETS = ['生产者', '消费者', '生产者消费者模式', 'Kafka 生产者', 'Kafka 消费者',
  '形式语言理论', '自动机理论', '管理程序', '模拟器', 'Hypervisor',
  'PipedInputStream', 'PipedOutputStream', '管道输入输出流',
  '可达性分析算法', '引用链法', '跟踪垃圾收集', '身份认证', '权限校验', '客户端鉴权', '连接认证']
for (const t of TARGETS) {
  const hits = labelHits(t)
  log(`  「${t}」→ ${hits.length ? hits.map((h) => `${h.id}（挂载 ${byRef(h.id).length}）`).join(', ') : '池内无'}`)
}

log('\n══ 三、#1/#2/#6 正文（判断抽取内容）══')
for (const [tag, ref] of [['#1', 'k_wiki_en_monitor_synchronization_s4'], ['#2', 'k_wiki_en_monitor_synchronization_s9'], ['#6', 'k_1786006034803_zh191w']]) {
  const n = pool[ref]
  const c = shellContent(n)
  log(`  ${tag}「${n.label}」${c.length} 字：`)
  log(`      ${c.slice(0, 300).replace(/\n/g, ' | ')}`)
}

log('\n══ 四、9 个节点相关的非 treebind 边 ══')
const S = new Set(['k_wiki_en_monitor_synchronization_s4', 'k_wiki_en_monitor_synchronization_s9',
  'theory_domain_formal_languages_automata', 'k_wiki_en_profiling_computer_programming_s13',
  'k_1785843242128_bus7le', 'k_1786006034803_zh191w', 'k_1786006088920_imdsjx',
  'k_atom_reachability', 'asplit_conn_state_auth'])
let n = 0
for (const x of edges) {
  if (String(x.id).startsWith('treebind:')) continue
  const s = S.has(x.source); const t = S.has(x.target)
  if (!s && !t) continue
  n += 1
  log(`  ${s ? '[源]' : '    '}${t ? '[靶]' : '    '} ${x.id} | ${x.source} -[${x.type}/${x.relationKind}]-> ${x.target}`)
}
log(`  共 ${n} 条`)

log('\n══ 五、9 个节点相关的题库引用 ══')
let qn = 0
for (const q of questions) {
  if (S.has(q.relatedNodeId)) { qn += 1; log(`  rel: ${q.id}「${String(q.text).slice(0, 50)}」-> ${q.relatedNodeId}`) }
  for (const st of q.answerSteps ?? []) if (st && S.has(st.nodeId)) { qn += 1; log(`  step: ${q.id} -> ${st.nodeId}`) }
}
log(`  共 ${qn} 处`)
