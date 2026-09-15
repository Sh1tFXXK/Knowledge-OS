/**
 * 只读预检 · 批次 core-library-rest：Scanner / Files / enum 三个目标节点现状。
 * 与 core-library-string 同批族，绝不写 data/。
 */
import { loadAll, walkTree } from './shell-fusion/lib.mjs'

const { pool, tree, edges } = loadAll()

const rows = []
walkTree(tree, (node, parent, index, trail) => {
  rows.push({ node, path: [...trail.map((t) => t.name), node.name] })
})
const P = (r) => (r?.path ?? ['?']).join(' > ')
const byId = new Map(rows.map((r) => [r.node.id, r]))

console.log('=== 基线 ===')
console.log('树节点总数(含根) ', rows.length)
console.log('池实体数          ', Object.keys(pool).length)
console.log('边总数            ', edges.length)

console.log('\n=== A. 目标节点的挂载位置 ===')
const TARGETS = ['k_java_lang_string', 'k_java_util_scanner', 'k_java_nio_file_files', 'k_java_lang_enum', 'k_nio_files_util']
for (const ref of TARGETS) {
  const ent = pool[ref]
  const mounts = rows.filter((r) => r.node.nodeRef === ref)
  console.log(`\n## ${ref}  ${ent ? 'label=' + ent.label : '⚠️ 池中不存在'}`)
  console.log(`   挂载 ${mounts.length} 处:`)
  for (const m of mounts) console.log(`     - ${P(m)}  [${m.node.id}]  子=${(m.node.children ?? []).length}`)
}

console.log('\n=== B. java > 常用类库 容器（tree_java_common_libraries）全量条目 ===')
const cup = byId.get('tree_java_common_libraries')
if (!cup) {
  console.log('⚠️ 未找到 tree_java_common_libraries')
} else {
  console.log(`位置 ${P(cup)}  ref=${cup.node.nodeRef} 池正文=${(pool[cup.node.nodeRef]?.card?.rootContent ?? '').length}`)
  for (const c of cup.node.children ?? []) {
    const e = pool[c.nodeRef]
    console.log(`  - ${c.name}  [${c.id}]  ref=${c.nodeRef}  子=${(c.children ?? []).length}  池正文=${(e?.card?.rootContent ?? '').length}  池tab=${e?.card?.tabs?.length ?? '-'}`)
    for (const g of c.children ?? []) {
      const ge = pool[g.nodeRef]
      console.log(`      · ${g.name}  [${g.id}]  ref=${g.nodeRef}  子=${(g.children ?? []).length}  池正文=${(ge?.card?.rootContent ?? '').length}  池tab=${ge?.card?.tabs?.length ?? '-'}`)
    }
  }
}

console.log('\n=== C. 三个目标节点 · 池实体全貌（写前基线）===')
for (const ref of ['k_java_util_scanner', 'k_java_nio_file_files', 'k_java_lang_enum']) {
  const ent = pool[ref]
  console.log(`\n##### ${ref}`)
  if (!ent) { console.log('  ⚠️ 池中不存在'); continue }
  console.log(`  label=${ent.label}  role=${ent.role}  card.title=${ent.card?.title}`)
  console.log(`  tags=${JSON.stringify(ent.tags)}`)
  console.log(`  card 键序=${JSON.stringify(Object.keys(ent.card ?? {}))}`)
  console.log(`  rootContent(${(ent.card?.rootContent ?? '').length} 字): ${(ent.card?.rootContent ?? '').slice(0, 200).replace(/\n/g, ' ⏎ ')}`)
  const tabs = ent.card?.tabs ?? []
  console.log(`  tabs ${tabs.length}:`)
  for (const t of tabs) {
    console.log(`     · [${t.id}] ${t.label}  (${(t.content ?? '').length} 字)  keys=${JSON.stringify(Object.keys(t))}`)
  }
  console.log(`  边：入 ${edges.filter((e) => e.target === ref).length} / 出 ${edges.filter((e) => e.source === ref).length}`)
}

console.log('\n=== D. tab 键序样板（k_java_lang_string，本批族沿用）===')
const s = pool['k_java_lang_string']
console.log('node 顶级键:', JSON.stringify(Object.keys(s)))
console.log('card 键:     ', JSON.stringify(Object.keys(s.card)))
console.log('tab 键:      ', JSON.stringify(Object.keys(s.card.tabs[0])))
console.log('tabs 总数:   ', s.card.tabs.length)
console.log('tabs 全 id:  ', s.card.tabs.map((t) => t.id).join(', '))
