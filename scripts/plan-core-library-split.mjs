/**
 * 只读预检：常用类库拆分批次（String / Scanner / Files / enum）
 * 对照用户蓝图核对真实数据，绝不写 data/。
 */
import { loadAll, walkTree } from './shell-fusion/lib.mjs'

const { pool, tree, edges } = loadAll()

const rows = []
walkTree(tree, (node, parent, index, trail) => {
  rows.push({ node, parent, path: [...trail.map((t) => t.name), node.name] })
})
const P = (r) => r.path.join(' > ')
const kids = (n) => (n.children ?? []).length

console.log('=== 基线 ===')
console.log('树节点总数(含根) ', rows.length)
console.log('池实体数          ', Object.keys(pool).length)
console.log('边总数            ', edges.length)

console.log('\n=== 1. 蓝图关键字检索 ===')
const KEYS = ['常用类库整理', '常用类库', '核心类库', 'java.lang', 'java.util', 'java.nio.file', '语言特性', 'String', 'Scanner', 'Files', '枚举', 'enum']
for (const k of KEYS) {
  const hits = rows.filter((r) => String(r.node.name).includes(k))
  console.log(`\n-- 「${k}」 ${hits.length} 命中`)
  for (const h of hits.slice(0, 14)) {
    const ref = h.node.nodeRef
    const ent = pool[ref]
    const len = ent ? ((ent.card?.rootContent ?? '').length) : -1
    console.log(`   ${P(h)}`)
    console.log(`      treeId=${h.node.id}  ref=${ref}  树子=${kids(h.node)}  池正文=${len}  池tab=${ent?.card?.tabs?.length ?? '-'}`)
  }
  if (hits.length > 14) console.log(`   … 还有 ${hits.length - 14}`)
}

// Java 节点
console.log('\n=== 2. Java 节点及其子树 ===')
const javas = rows.filter((r) => r.node.name === 'Java')
for (const j of javas) {
  console.log(`\nJava @ ${P(j)}`)
  console.log(`  treeId=${j.node.id} ref=${j.node.nodeRef} 池label=${pool[j.node.nodeRef]?.label}`)
  console.log(`  直属子 ${kids(j.node)}:`)
  for (const c of j.node.children ?? []) {
    console.log(`    - ${c.name}  [${c.id}]  ref=${c.nodeRef}  子=${kids(c)}`)
  }
}

// 常用类库整理 的池实体内容
console.log('\n=== 3. 「常用类库整理」池实体概况 ===')
for (const r of rows.filter((x) => String(x.node.name).includes('常用类库整理'))) {
  const ent = pool[r.node.nodeRef]
  console.log(`\n树位置 ${P(r)}`)
  console.log(`  treeId=${r.node.id} ref=${r.node.nodeRef}`)
  if (!ent) { console.log('  ⚠️ 池中无此实体'); continue }
  console.log(`  label=${ent.label}  role=${ent.role}  kind=${ent.kind}`)
  console.log(`  tags=${JSON.stringify(ent.tags)}`)
  console.log(`  rootContent 长度=${(ent.card?.rootContent ?? '').length}`)
  console.log(`  card.title=${ent.card?.title}`)
  console.log(`  tabs=${(ent.card?.tabs ?? []).length}:`)
  for (const t of (ent.card?.tabs ?? []).slice(0, 40)) {
    console.log(`     - ${t.label}  (${(t.content ?? '').length} 字)`)
  }
}

console.log('\n=== 4. treeId / 池 id 命名规范采样（java 相关）===')
const javaRows = rows.filter((r) => String(r.node.id).includes('java') || String(r.node.name).toLowerCase().includes('java'))
console.log(`java 相关树节点 ${javaRows.length} 个，id 形态采样：`)
for (const r of javaRows.slice(0, 20)) {
  console.log(`   ${r.node.id}   ← ${P(r)}`)
}
const javaPool = Object.keys(pool).filter((k) => /java/.test(k))
console.log(`\n池中 id 含 java 的 ${javaPool.length} 个，采样：`)
console.log('  ' + javaPool.slice(0, 20).join('\n  '))

console.log('\n=== 5. 是否已有同名池实体（String/Scanner/Files/enum）===')
for (const n of ['String', 'Scanner', 'Files', 'enum', '枚举', 'Enum', '核心类库', 'java.lang', 'java.util', 'java.nio.file']) {
  const byLabel = Object.entries(pool).filter(([, v]) => v.label === n).map(([k]) => k)
  const byTitle = Object.entries(pool).filter(([, v]) => v.card?.title === n).map(([k]) => k)
  console.log(`「${n}」 label 精确=${byLabel.length} ${JSON.stringify(byLabel.slice(0,6))}  card.title=${byTitle.length}`)
}

console.log('\n=== 6. treebind 边形态采样 ===')
const tb = edges.filter((e) => String(e.id).startsWith('treebind:'))
console.log('treebind 边总数', tb.length, '/ 边总数', edges.length)
console.log('采样：', JSON.stringify(tb.slice(0, 6), null, 1))
