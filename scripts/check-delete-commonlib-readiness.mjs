/**
 * 只读检查点：删除「常用类库整理」前置核查（三个检查点，绝不写 data/）。
 * 1) 4 个新类节点在树上的正确位置
 * 2) 4 个类节点的 tab 完整性（数据层）
 * 3) 「常用类库整理」被谁引用（树挂载 / 边 / 其它真源 / 文本提及）
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadAll, walkTree, DATA } from './shell-fusion/lib.mjs'

const SRC = 'k_vault_javajava_1b1w4s'
const CLASSES = [
  ['k_java_lang_string', 'java.lang.String', 'tree_java_lang_string'],
  ['k_java_util_scanner', 'java.util.Scanner', 'tree_java_util_scanner'],
  ['k_java_nio_file_files', 'java.nio.file.Files', 'tree_java_nio_file_files'],
  ['k_java_lang_enum', 'java.lang.Enum', 'tree_java_lang_enum'],
]

const { pool, tree, edges } = loadAll()
const rows = []
walkTree(tree, (node, parent, index, trail) => {
  rows.push({ node, path: [...trail.map((t) => t.name), node.name] })
})
const P = (r) => (r?.path ?? ['?']).join(' > ')

console.log('=== 基线计数 ===')
console.log('树节点', rows.length, '（含根 ⇒ 实体树节点 =', rows.length - 1, '）')
console.log('池实体', Object.keys(pool).length)
console.log('边     ', edges.length)

console.log('\n=== 检查点 1：4 个类节点在树上的位置 ===')
for (const [ref, name, treeId] of CLASSES) {
  const mounts = rows.filter((r) => r.node.nodeRef === ref)
  console.log(`\n## ${ref}  (${name})  挂载 ${mounts.length} 处`)
  for (const m of mounts) {
    const underCommon = m.path.includes('常用类库')
    console.log(`   ${underCommon ? '✓' : '·'} ${P(m)}   [${m.node.id}]  treeId匹配=${m.node.id === treeId}`)
  }
}
console.log('\n⇒ java > 常用类库 直属子（应含 4 个类）:')
const cup = rows.find((r) => r.node.id === 'tree_java_common_libraries')
for (const c of cup?.node.children ?? []) {
  const is4 = CLASSES.some(([ref]) => ref === c.nodeRef)
  console.log(`   ${is4 ? '★' : ' '} ${c.name}  [${c.id}]`)
}

console.log('\n=== 检查点 2：4 个类节点的 tab 完整性（数据层）===')
for (const [ref, name] of CLASSES) {
  const e = pool[ref]
  const tabs = e?.card?.tabs ?? []
  const ids = tabs.map((t) => String(t.id))
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i)
  const empty = tabs.filter((t) => !String(t.content ?? '').trim()).map((t) => t.id)
  const noLabel = tabs.filter((t) => !String(t.label ?? '').trim()).map((t) => t.id)
  const methodTabs = tabs.filter((t) => /\(\)$/.test(String(t.label).trim()))
  const withoutSig = methodTabs.filter((t) => !String(t.content).includes('`')).map((t) => t.id)
  console.log(`\n## ${name}  tabs=${tabs.length}  方法形 tab=${methodTabs.length}`)
  console.log(`   重复 id: ${dup.length ? JSON.stringify(dup) : '0'}  |  空 content: ${empty.length ? JSON.stringify(empty) : '0'}  |  空 label: ${noLabel.length ? JSON.stringify(noLabel) : '0'}`)
  console.log(`   方法 tab 缺反引号签名: ${withoutSig.length ? JSON.stringify(withoutSig) : '0'}`)
  console.log(`   rootContent ${(e?.card?.rootContent ?? '').length} 字`)
  console.log(`   非方法 tab: ${JSON.stringify(tabs.filter((t) => !/\(\)$/.test(String(t.label).trim())).map((t) => t.id + ':' + t.label))}`)
}

console.log('\n=== 检查点 3：「常用类库整理」被谁引用 ===')
const srcEnt = pool[SRC]
console.log('池实体存在:', !!srcEnt, srcEnt ? `label=${srcEnt.label} role=${srcEnt.role}` : '')
console.log('  树挂载:', rows.filter((r) => r.node.nodeRef === SRC).map((r) => `${P(r)} [${r.node.id}]`).join(' | ') || '无')
const inE = edges.filter((e) => e.source === SRC)
const outE = edges.filter((e) => e.target === SRC)
console.log(`  边：出 ${inE.length} / 入 ${outE.length}`)
for (const e of [...inE, ...outE].slice(0, 20)) {
  console.log(`     ${e.source} --${e.type ?? e.relationKind ?? '?'}--> ${e.target}`)
}
const treeId = rows.find((r) => r.node.nodeRef === SRC)?.node.id
const treeEdges = edges.filter((e) => e.source === `tree:${treeId}` || e.target === `tree:${treeId}` || String(e.source).includes(treeId) || String(e.target).includes(treeId))
console.log(`  含其 treeId(${treeId}) 的边: ${treeEdges.length}`)
for (const e of treeEdges.slice(0, 20)) console.log(`     ${e.source} --${e.type ?? e.relationKind ?? '?'}--> ${e.target}`)

console.log('\n  其它真源文件里的字面引用:')
for (const f of fs.readdirSync(DATA).filter((x) => x.endsWith('.json'))) {
  const raw = fs.readFileSync(path.join(DATA, f), 'utf8')
  const hits = (raw.match(new RegExp(SRC, 'g')) ?? []).length
  if (hits > 0) console.log(`     ${f}: ${hits} 次`)
}
for (const kw of ['常用类库整理', 'k_vault_javajava_1b1w4s']) {
  const rawTree = fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8')
  console.log(`   tree-data.json 含「${kw}」 ${(rawTree.match(new RegExp(kw, 'g')) ?? []).length} 次`)
}

console.log('\n  同容器（常用类库）内还留下的可疑「总集/整理型」节点:')
for (const c of cup?.node.children ?? []) {
  if (/整理|汇总|总集|大全/.test(c.name)) console.log(`     ${c.name}  [${c.id}] ref=${c.nodeRef}`)
}
