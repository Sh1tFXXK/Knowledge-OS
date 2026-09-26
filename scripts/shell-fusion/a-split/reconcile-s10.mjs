/** 只读：核对 #124「并入 算法分析」的目标 id（用户表写的 id 与 #124 自身相同，疑似笔误）。 */
import { loadState, flatten, shellContent, log } from './common.mjs'

const state = loadState()
const { pool, tree } = state
const flat = flatten(tree)
const byRef = (ref) => flat.filter((f) => f.node.nodeRef === ref)

log('══ #124 复杂度与算法分析 ══')
const REF124 = 'k_vault_java01_36x0hj'
const m124 = byRef(REF124)
log(`  #124 ref=${REF124} 池=${!!pool[REF124]} 挂载=${m124.length}`)
for (const m of m124) {
  log(`    树:「${m.node.name}」(${m.node.id}) 父=「${m.parent?.name}」(${m.parent?.id}) 父nodeRef=${m.parent?.nodeRef}`)
  log(`       孩=${(m.node.children ?? []).map((k) => k.name).join('/') || '(无)'}`)
}
log(`  正文：${pool[REF124] ? shellContent(pool[REF124]).length : -1} 字`)

log('\n══ 父节点「算法分析」到底是谁 ══')
const parent = m124[0]?.parent
if (parent) {
  log(`  父 treeId=${parent.id} name=「${parent.name}」 nodeRef=${parent.nodeRef} 池=${!!pool[parent.nodeRef]}`)
  log(`  父 正文：${pool[parent.nodeRef] ? shellContent(pool[parent.nodeRef]).length : -1} 字`)
  log(`  父 nodeRef 挂载数：${byRef(parent.nodeRef).length}`)
  if (parent.nodeRef === REF124) log('  ⚠ 父与 #124 共用同一 nodeRef！')
}

log('\n══ 池内 label 恰为「算法分析」的节点 ══')
for (const n of Object.values(pool)) {
  if ((n.label ?? '') !== '算法分析') continue
  const mm = byRef(n.id)
  log(`  「${n.label}」(${n.id}) 正文 ${shellContent(n).length} 字 挂载 ${mm.length}`)
  for (const x of mm) log(`     树:「${x.node.name}」(${x.node.id}) 父=「${x.parent?.name}」`)
}

log('\n══ #125 后续：数据结构正身 theory_domain_data_structures ══')
for (const x of byRef('theory_domain_data_structures')) {
  log(`  树:「${x.node.name}」(${x.node.id}) 父=「${x.parent?.name}」 supplement tab=${(x.node.supplement?.tabs ?? []).map((t) => t.label).join('|') || '(无)'}`)
}
log(`  池正文 ${pool.theory_domain_data_structures ? shellContent(pool.theory_domain_data_structures).length : -1} 字`)

log('\n══ #57 / #113 现名（供豁免正则逐字比对）══')
for (const ref of ['k_wiki_en_linker_computing_s8', 'mysql_glossary_checksum_qnrmvm']) {
  const mm = byRef(ref)
  log(`  ref=${ref} 池=${!!pool[ref]} 挂载 ${mm.length} 树名=${JSON.stringify(mm.map((m) => m.node.name))}`)
}

log('\n══ #33 ══')
for (const x of byRef('k_vault_javajvm04jvm_i15q6w')) {
  log(`  树:「${x.node.name}」(${x.node.id}) 父=「${x.parent?.name}」孩=${(x.node.children ?? []).length} 正文 ${shellContent(pool[x.node.nodeRef]).length} 字`)
}

log('\n══ 现有 q_asplit_33 是否已存在 ══')
log(`  ${state.questions.filter((q) => q.id === 'q_asplit_33').length} 张`)
