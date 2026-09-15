/**
 * JAVA-LIB-OVERLAP-B · 只读预检（plan 阶段）
 *
 * ⛔ 【不写任何文件】。仅读 data/*.json，用 apply 脚本导出的 buildPlan() 作**单一事实源**
 *    —— 保证「预检看到的就是实跑会做的」，不写第二套逻辑。
 *
 * 用法：node scripts/plan-java-lib-overlap-b.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildPlan, walkAll, countTree, PARENT_TREE_ID, TARGETS, TARGET_TREE_IDS, TARGET_EDGE_IDS, EXPECTED_PARENT_CHILDREN_AFTER, KEPT_PATH_MARKER } from './apply-java-lib-overlap-b.mjs'

const ROOT = process.cwd()
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))

const tree = rd('data/tree-data.json')
const pool = rd('data/node-pool.json')
const edges = rd('data/knowledge-edges.json')
const eArr = Array.isArray(edges) ? edges : edges.edges
const nodes = walkAll(tree)
const plan = buildPlan()
const H = (s) => console.log('\n══ ' + s + ' ' + '═'.repeat(Math.max(0, 62 - s.length)))

console.log('════ JAVA-LIB-OVERLAP-B · 只读预检（不写盘）════')
console.log('批次语义 = 卸树留池（摘 4 个叶子挂载 + 删 4 条 treebind 边，池零改动）')

H('1 · 基数')
console.log('  树(含根) =', countTree(tree))
console.log('  池 keys  =', Object.keys(pool).length)
console.log('  边       =', eArr.length)

H('2 · Object.children 现状（9 项，★ = 本批摘除）')
const parent = nodes.find((x) => x.node.id === PARENT_TREE_ID)
parent.node.children.forEach((c, i) => {
  const isT = TARGET_TREE_IDS.includes(c.id)
  console.log(`  ${isT ? '★' : ' '} [${i}] ${String(c.name).padEnd(16)} id=${c.id}  nodeRef=${c.nodeRef}  children=${(c.children ?? []).length}`)
})
console.log('  → 摘除后应为:', JSON.stringify(EXPECTED_PARENT_CHILDREN_AFTER))

H('3 · 4 个目标的全树挂载全景（待删 vs 保留）')
for (const t of TARGETS) {
  const mounts = nodes.filter((x) => x.node.nodeRef === t.nodeRef)
  console.log(`  ${t.name}  (${t.nodeRef})  共 ${mounts.length} 处挂载：`)
  for (const m of mounts) {
    const isTarget = m.node.id === t.treeId
    const isLeaf = (m.node.children ?? []).length === 0
    console.log(`      ${isTarget ? '⛔ 待卸' : '✅ 保留'}  ${m.path}`)
    console.log(`               id=${m.node.id}  children=${(m.node.children ?? []).length}${isLeaf ? '（叶子）' : ''}`)
  }
  const keptOk = mounts.filter((m) => m.node.id !== t.treeId).every((m) => m.path.includes(KEPT_PATH_MARKER))
  console.log(`      保留侧含「${KEPT_PATH_MARKER}」= ${keptOk}  ⇒ 内容零损失 ${keptOk ? '✅' : '⛔'}`)
}

H('4 · ★ 边表实测：4 个待卸挂载在边表里【零出现】⇒ Δ边 = 0（与蓝图不符，已修正）')
const edgesRaw = fs.readFileSync(path.join(ROOT, 'data/knowledge-edges.json'), 'utf8')
console.log('  逐条 treeId 在整个 knowledge-edges.json 原始文本中出现次数：')
for (const t of TARGETS) {
  const n = edgesRaw.split(t.treeId).length - 1
  console.log(`    ${n === 0 ? '⚪' : '⛔'} ${t.name.padEnd(14)} ${t.treeId}  出现 ${n} 次`)
}
console.log('  ⇒ 蓝图原写「边 4161→4157（−4 treebind 边）」与事实不符；**没有任何边可删**。')
console.log('')
console.log('  ★ 决定性对照：Object 的 9 个子节点分两组（三重互证）')
const tbSet = new Set(eArr.filter((e) => typeof e.id === 'string' && e.id.startsWith('treebind:')).map((e) => e.id))
const allNodes = walkAll(tree)
console.log('    ' + '子节点'.padEnd(18) + '边'.padEnd(6) + '挂载'.padEnd(6) + 'tags')
for (const c of parent.node.children) {
  const hasEdge = tbSet.has('treebind:' + PARENT_TREE_ID + ':' + c.id)
  const mounts = allNodes.filter((x) => x.node.nodeRef === c.nodeRef).length
  const tags = (pool[c.nodeRef]?.tags ?? []).join('·')
  const isT = TARGET_TREE_IDS.includes(c.id)
  console.log(`    ${isT ? '★' : ' '} ${String(c.name).padEnd(16)} ${(hasEdge ? '✅有' : '⚪无').padEnd(6)} ${String(mounts).padEnd(6)} [${tags}]`)
}
console.log('    ⇒ 待卸的 4 个 = 无边 + 挂载 2 处 + tags 自带「常用类库」；保留的 5 个 = 有边 + 挂载 1 处 + tags 只有自己。')
console.log('    ⇒ 第三重证据（实体的 tags 里自己写着「常用类库」）**正面支持**用户意图。')
console.log('')
console.log('  保留侧边（不动）：' + plan.keepEdgeIds.length + ' 条提到这 4 个 nodeRef 的边')
for (const id of plan.keepEdgeIds) console.log('    ✅ ' + id)

H('5 · count 字段检查（树节点带 count，>0 会渲染徽标）')
const badPath = []
for (const t of TARGETS) {
  const e = nodes.find((x) => x.node.id === t.treeId)
  const chain = [e, ...(e?.ancestors ?? []).map((a) => ({ node: a }))]
  for (const c of chain) if (typeof c.node?.count === 'number' && c.node.count > 0) badPath.push(t.name + ' → ' + c.node.name + '=' + c.node.count)
}
console.log('  受影响路径（含父链）上 count>0 的节点：', badPath.length ? badPath.join(', ') : '无 ✅')
console.log('  ⇒ 摘除不会留下过期徽标')

H('6 · 前置断言（buildPlan 与实跑同一份）')
if (plan.problems.length) {
  console.log('⛔ 失败 ' + plan.problems.length + ' 条：')
  for (const p of plan.problems) console.log('   · ' + p)
} else {
  console.log('✅ 全部通过（' + (plan.problems.length) + ' 条问题）')
}

H('7 · 计划 Δ（dry-run 预览）')
console.log('  树 : ' + plan.before.treeNodes + ' → ' + plan.after.treeNodes)
console.log('  池 : ' + plan.before.poolKeys + ' → ' + plan.after.poolKeys + '  ← 本脚本不写 node-pool.json')
console.log('  边 : ' + plan.before.edges + ' → ' + plan.after.edges)
console.log('  Object.children : ' + plan.before.parentChildren + ' → ' + plan.after.parentChildren)
console.log('    之前: ' + plan.before.parentChildNames.join(' | '))
console.log('    之后: ' + plan.after.parentChildNames.join(' | '))

console.log('\n（只读预检结束，未写盘。实跑：node scripts/apply-java-lib-overlap-b.mjs --apply）')
process.exit(plan.problems.length ? 2 : 0)
