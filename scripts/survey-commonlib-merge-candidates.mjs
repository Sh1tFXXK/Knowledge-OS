/**
 * 只读调查：java > 常用类库 下「可融合/可拆分」候选量化。
 * 不写 data/。
 */
import { loadAll, walkTree } from './shell-fusion/lib.mjs'

const { pool, tree, edges } = loadAll()
const rows = []
walkTree(tree, (node, parent, index, trail) => rows.push({ node, path: [...trail.map((t) => t.name), node.name] }))
const P = (r) => r.path.join(' > ')
const byId = new Map(rows.map((r) => [r.node.id, r]))

const CUP = 'tree_java_common_libraries'
const cup = byId.get(CUP)
const kids = cup.node.children ?? []

console.log('=== A. 常用类库 22 个子节点全景 ===')
for (const c of kids) {
  const e = pool[c.nodeRef]
  const rc = (e?.card?.rootContent ?? '').length
  const tabs = e?.card?.tabs ?? []
  const big = rc > 1500 ? ' ⚠️大正文' : ''
  const oneTab = tabs.length === 1 ? ' ⚠️单tab' : ''
  console.log(`\n- ${c.name}`)
  console.log(`   treeId=${c.id}  ref=${c.nodeRef}  树子=${(c.children ?? []).length}`)
  console.log(`   池: label=${e?.label} role=${e?.role} kind=${e?.kind ?? '-'} rootContent=${rc}字 tabs=${tabs.length}${big}${oneTab}`)
  console.log(`   tab: ${tabs.map((t) => t.id + ':' + t.label).join(' | ') || '(无)'}`)
  console.log(`   挂载 ${rows.filter((r) => r.node.nodeRef === c.nodeRef).length} 处 · 入边 ${edges.filter((x) => x.target === c.nodeRef).length} 出边 ${edges.filter((x) => x.source === c.nodeRef).length}`)
}

console.log('\n\n=== B. 「导入型总集」候选（大 rootContent + 单一 tab，同 常用类库整理 的形态）===')
let cnt = 0
for (const [id, e] of Object.entries(pool)) {
  const rc = (e?.card?.rootContent ?? '').length
  const tabs = e?.card?.tabs ?? []
  if (rc >= 1500 && tabs.length <= 2) {
    cnt++
    const mounts = rows.filter((r) => r.node.nodeRef === id)
    console.log(`\n- ${e.label}  [${id}]  rootContent=${rc}字 tab=${tabs.length}(${tabs.map((t) => t.id).join(',')})`)
    for (const m of mounts.slice(0, 3)) console.log(`    挂载: ${P(m)}`)
    console.log(`    正文首 120 字: ${(e.card.rootContent ?? '').replace(/\s+/g, ' ').slice(0, 120)}`)
  }
}
console.log(`\n共 ${cnt} 个`)

console.log('\n\n=== C. 与 java.nio.file.Files 的重叠：Files工具类 vs java.nio.file.Files ===')
const filesTabs = (pool['k_java_nio_file_files']?.card?.tabs ?? []).map((t) => String(t.id))
const util = pool['k_nio_files_util']
console.log('java.nio.file.Files tabs:', filesTabs.length, filesTabs.join(', '))
if (util) {
  const txt = [util.card?.rootContent ?? '', ...(util.card?.tabs ?? []).map((t) => t.content ?? '')].join('\n')
  console.log(`Files工具类 正文字数: ${txt.length}`)
  const mentioned = new Set()
  for (const m of txt.matchAll(/\bFiles\s*\.\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)) mentioned.add(m[1])
  for (const m of txt.matchAll(/`?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g)) mentioned.add(m[1])
  const overlap = filesTabs.filter((t) => mentioned.has(t))
  console.log(`Files工具类 提到的方法名数: ${mentioned.size}`)
  console.log(`与 java.nio.file.Files 的 tab 名交集: ${overlap.length} / ${filesTabs.length}`)
  console.log(`  交集: ${overlap.join(', ')}`)
  console.log(`  Files 有但工具类未提: ${filesTabs.filter((t) => !mentioned.has(t)).join(', ') || '(无)'}`)
  console.log(`\n----- Files工具类 正文全文（前 2500 字）-----`)
  console.log(txt.slice(0, 2500))
}

console.log('\n\n=== D. 其它可疑重复：全局同 label / 高相似标签 ===')
const byLabel = new Map()
for (const [id, e] of Object.entries(pool)) {
  const k = String(e.label ?? '').trim()
  if (!k) continue
  if (!byLabel.has(k)) byLabel.set(k, [])
  byLabel.get(k).push(id)
}
let dup = 0
for (const [k, ids] of byLabel) {
  if (ids.length > 1) { dup++; console.log(`  「${k}」 × ${ids.length}: ${ids.join(', ')}` ) }
}
console.log(`同 label 重复组数: ${dup}`)

console.log('\n--- 常用类库内 label 含「工具类|整理|汇总|使用|用法」的节点 ---')
for (const c of kids) {
  if (/工具类|整理|汇总|使用|用法|大全/.test(c.name)) console.log(`  ${c.name}  [${c.id}] ref=${c.nodeRef}`)
}
