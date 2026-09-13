/**
 * 只读对账：用户 §三 正表 21 行 + 9 条裁决 vs 实数据。
 * 目的：跑盘前发现「编号冲突 / 已处置 / nodeRef 不存在 / 目标正身缺失」。
 */
import { loadState, flatten, shellContent, log } from './common.mjs'

const state = loadState()
const { pool, tree, questions } = state
const flat = flatten(tree)
const mounts = (ref) => flat.filter((f) => f.node.nodeRef === ref)
const body = (ref) => (pool[ref] ? shellContent(pool[ref]).length : -1)

log('═══ 一、§三 正表 21 行对账 ═══')
const S3 = [
  [4, 'k_1784222526071_nwu5h9'], [5, 'k_1784222473047_i8okyb'], [24, 'k_1786017052246_ok0jl6'],
  [25, 'k_1786026226542_k0x0er'], [28, 'k_1786029569920_2k0ima'], [40, 'k_vault_javajavaoverrideoverload_18u2us'],
  [50, 'k_goexplain_eval'], [53, 'k_wiki_en_java_performance_s14'], [54, 'k_wiki_en_compiler_s1'],
  [76, 'k_vault_javakafka04_1s6eok'], [79, 'k_vault_javarabbitmq05rabbitmqkafka_16ryk1'],
  [80, 'k_vault_javaspringcloud01springcloud_1gr4uj'], [85, 'k_vault_javaspringcloud06springcloud_acgmi2'],
  [86, 'sk_perf_def'], [98, 'pk_index_struct'], [100, 'diag_split'], [101, 'diag_hot_cache'],
  [102, 'pagination_opt_join'], [103, 'idx_fail_root'], [131, 'k_vault_java04cap_1frlgp'], [133, 'k_vault_arch_replica_lag'],
]
const seen = new Set()
let s3bad = 0
for (const [no, ref] of S3) {
  if (seen.has(no)) continue
  seen.add(no)
  const inPool = !!pool[ref]
  const m = mounts(ref)
  const flag = !inPool ? '✗ 池内不存在' : m.length === 0 ? '⚠ 无树挂载（已处置？）' : ''
  if (!inPool || m.length === 0) s3bad += 1
  log(`#${String(no).padStart(3)} ${inPool ? '池✓' : '池✗'} ${m.length} 挂载 ${String(body(ref)).padStart(6)} 字 ${flag}`)
  for (const x of m) log(`      树:「${x.node.name}」(${x.node.id}) 父=「${x.parent?.name}」孩=${(x.node.children ?? []).length}`)
}
log(`\n§三 21 行中池缺失/无挂载：${s3bad} 行`)

log('\n═══ 二、未认领项全景（实数据）═══')
const REST = [33, 56, 57, 113, 120, 122, 123, 124, 125, 135]
const REFS = {
  33: 'k_vault_javajvm04jvm_i15q6w', 56: 'k_wiki_en_compiler_s12', 57: 'k_wiki_en_linker_computing_s8',
  113: 'mysql_glossary_checksum_qnrmvm', 120: 'k_1784348625706_s595yo',
  122: 'k_acm2012_artificial_intelligence_knowledge_representation_reasoning',
  123: 'k_acm2012_artificial_intelligence_automated_planning_scheduling',
  124: 'k_vault_java01_36x0hj', 125: 'n_9hr0nvvv', 135: 'k_vault_arch_micro_net',
}
const RULED = { 56: '硬删除', 120: '豁免保留', 122: '豁免保留', 123: '豁免保留', 125: '吸附降维', 135: '吸附降维' }
for (const no of REST) {
  const ref = REFS[no]
  const m = mounts(ref)
  log(`#${no} ${RULED[no] ? `[${RULED[no]}]` : '[⚠ 用户表未列裁决]'} ref=${ref} 池=${!!pool[ref]} 挂载=${m.length} 正文=${body(ref)} 字`)
  for (const x of m) log(`      树:「${x.node.name}」(${x.node.id}) 父=「${x.parent?.name}」孩=${(x.node.children ?? []).length} ${(x.node.children ?? []).map((k) => k.name).join('/')}`)
}

log('\n═══ 三、#40 既有卡（用户裁决：复用已有卡/关联更新）═══')
for (const q of questions) {
  if (/重载|重写/.test(String(q.text))) {
    log(`  ${q.id} kind=${q.kind ?? '-'} related=${q.relatedNodeId ?? '-'} steps=${(q.answerSteps ?? []).length}`)
    log(`     「${String(q.text).slice(0, 90)}」`)
  }
}

log('\n═══ 四、吸附降维目标正身是否存在 ═══')
for (const kw of ['算法', '数据结构', '微服务架构', '算法分析', 'JVM 参数']) {
  const hits = Object.values(pool).filter((n) => (n.label ?? '') === kw)
  log(`  「${kw}」精确正身：${hits.length ? hits.map((h) => `${h.id}(挂载 ${mounts(h.id).length})`).join(' , ') : '✗ 无'}`)
}

log('\n═══ 五、#125 / #135 / #56 正文预览 ═══')
for (const ref of ['n_9hr0nvvv', 'k_vault_arch_micro_net', 'k_wiki_en_compiler_s12']) {
  if (!pool[ref]) { log(`  ${ref} 不在池`); continue }
  const c = shellContent(pool[ref])
  log(`  「${pool[ref].label}」(${ref}) ${c.length} 字：${c.slice(0, 160).replace(/\n/g, ' | ')}`)
}

log('\n═══ 六、豁免保留项当前是否被扫描器定罪 ═══')
const scanners = ['交互与通信', '知识表示与推理', '自动化规划与调度']
for (const nm of scanners) log(`  「${nm}」在树上：${flat.filter((f) => f.node.name === nm).length} 处`)
