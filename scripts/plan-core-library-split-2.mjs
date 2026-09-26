/**
 * 只读预检 · 第二轮：聚焦 java > 常用类库 实际结构 与 4 个目标节点的现状
 */
import { loadAll, walkTree } from './shell-fusion/lib.mjs'

const { pool, tree, edges } = loadAll()

const rows = []
walkTree(tree, (node, parent, index, trail) => {
  rows.push({ node, parent, path: [...trail.map((t) => t.name), node.name] })
})
const P = (r) => r.path.join(' > ')
const byId = new Map(rows.map((r) => [r.node.id, r]))

console.log('=== A. java 节点（小写）及其直属子 ===')
for (const r of rows.filter((x) => x.node.name === 'java')) {
  console.log(`java @ ${P(r)}  treeId=${r.node.id} ref=${r.node.nodeRef} 池正文=${(pool[r.node.nodeRef]?.card?.rootContent ?? '').length}`)
  for (const c of r.node.children ?? []) {
    console.log(`   - ${c.name}  [${c.id}]  ref=${c.nodeRef} 子=${(c.children ?? []).length} 池正文=${(pool[c.nodeRef]?.card?.rootContent ?? '').length} 池tab=${pool[c.nodeRef]?.card?.tabs?.length ?? '-'}`)
  }
}

console.log('\n=== B. 「常用类库」容器(tree_java_common_libraries) 的子树 ===')
const cup = byId.get('tree_java_common_libraries')
if (cup) {
  console.log(`位置 ${P(cup)}  ref=${cup.node.nodeRef} 池正文=${(pool[cup.node.nodeRef]?.card?.rootContent ?? '').length}`)
  for (const c of cup.node.children ?? []) {
    console.log(`\n  - ${c.name}   [${c.id}]  ref=${c.nodeRef}`)
    console.log(`      路径 ${P(byId.get(c.id) ?? { path: ['?'] })}`)
    console.log(`      直属子=${(c.children ?? []).length}  池正文=${(pool[c.nodeRef]?.card?.rootContent ?? '').length}  池tab=${pool[c.nodeRef]?.card?.tabs?.length ?? '-'}`)
    for (const g of c.children ?? []) {
      console.log(`        · ${g.name}  [${g.id}]  ref=${g.nodeRef} 子=${(g.children ?? []).length} 池正文=${(pool[g.nodeRef]?.card?.rootContent ?? '').length} 池tab=${pool[g.nodeRef]?.card?.tabs?.length ?? '-'}`)
    }
  }
}

console.log('\n=== C. 4 个目标节点 · 池实体全貌 ===')
const TARGETS = ['k_java_lang_string', 'k_java_util_scanner', 'k_java_nio_file_files', 'k_java_lang_enum', 'k_nio_files_util']
for (const ref of TARGETS) {
  const ent = pool[ref]
  const mounts = rows.filter((r) => r.node.nodeRef === ref)
  console.log(`\n##### ${ref}`)
  if (!ent) { console.log('  ⚠️ 池中不存在'); continue }
  console.log(`  label=${ent.label}  role=${ent.role}  card.title=${ent.card?.title}`)
  console.log(`  tags=${JSON.stringify(ent.tags)}`)
  console.log(`  挂载 ${mounts.length} 处:`)
  for (const m of mounts) console.log(`     - ${P(m)}  [${m.node.id}]`)
  console.log(`  rootContent(${(ent.card?.rootContent ?? '').length} 字): ${(ent.card?.rootContent ?? '').slice(0, 160).replace(/\n/g, ' ⏎ ')}`)
  const tabs = ent.card?.tabs ?? []
  console.log(`  tabs ${tabs.length}:`)
  for (const t of tabs) {
    console.log(`     · [${t.id}] ${t.label}  (${(t.content ?? '').length} 字)`)
    console.log(`       ${String(t.content ?? '').replace(/\n/g, ' ⏎ ').slice(0, 200)}`)
  }
  const inEdges = edges.filter((e) => e.target === ref).length
  const outEdges = edges.filter((e) => e.source === ref).length
  console.log(`  边：入 ${inEdges} / 出 ${outEdges}`)
}

console.log('\n=== D. java > 常用类库 下所有条目的 ref 去重情况（多挂载检查）===')
if (cup) {
  const refs = (cup.node.children ?? []).map((c) => c.nodeRef)
  const dup = refs.filter((r, i) => refs.indexOf(r) !== i)
  console.log('子条目', refs.length, '唯一 ref', new Set(refs).size, '重复 ref', JSON.stringify([...new Set(dup)]))
  const allMount = new Map()
  for (const r of rows) {
    if (!allMount.has(r.node.nodeRef)) allMount.set(r.node.nodeRef, [])
    allMount.get(r.node.nodeRef).push(r.node.id)
  }
  for (const ref of refs) {
    const m = allMount.get(ref) ?? []
    if (m.length > 1) console.log(`  多挂载: ${ref} → ${m.length} 处 ${JSON.stringify(m)}`)
  }
}

console.log('\n=== E. 树的 treebind / 节点 id 生成函数在哪 ===')
console.log('（下一步单独 grep）')
