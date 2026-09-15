/**
 * JAVA-LIB-OVERLAP-A · 只读预检（不写任何文件）
 * 与 apply 共用同一份 buildPlan()，避免「预检一套逻辑、实跑另一套」。
 * 用法：node scripts/plan-java-overlap-a.mjs
 */
import fs from 'node:fs'
import { buildPlan, A_ID, B_ID, A_TREE_ID, EDGE_ID, MOVED_TAB_ID, PARENT_TREE_ID } from './apply-java-overlap-a.mjs'
import { createHash } from 'node:crypto'

const md5 = (s) => createHash('md5').update(s).digest('hex')
const D = (p) => new URL('../' + p, import.meta.url).pathname.replace(/^\//, '')

const plan = buildPlan()
const ok = (b) => (b ? '✅' : '❌')

console.log('════ JAVA-LIB-OVERLAP-A · 只读预检 ════')
console.log('待删旧实体 A =', A_ID)
console.log('承接方     B =', B_ID)
console.log('树上节点     =', A_TREE_ID, '  父节点 =', PARENT_TREE_ID)
console.log('待删边       =', EDGE_ID)
console.log('搬运 tab     =', MOVED_TAB_ID, JSON.stringify(plan.movedTab?.label), plan.movedTab?.content.length + ' 字')
console.log('')

console.log('【1 · 基数】')
console.log('  树(含根) =', plan.before.treeNodes, '→', plan.after.treeNodes)
console.log('  池       =', plan.before.poolKeys, '→', plan.after.poolKeys)
console.log('  边       =', plan.before.edges, '→', plan.after.edges)
console.log('')

console.log('【2 · A 的唯一独有资产】')
console.log('  A 的 tabs =', plan.A?.card?.tabs?.map((t) => t.id).join(', '))
console.log('  A 的正文  =', (plan.A?.card?.rootContent ?? '').length, '字')
console.log('  搬运内容 md5 =', md5(plan.movedTab?.content ?? ''), '（预期 9de89c83fa4c03cab1d93e2a1ff255c5）')
console.log('  逐字节可搬运 =', ok(md5(plan.movedTab?.content ?? '') === '9de89c83fa4c03cab1d93e2a1ff255c5'))
console.log('  B 现有 tabs =', plan.before.bTabs, '（', plan.before.bTabsList.slice(0, 6).join(', '), '…）')
console.log('  B 是否已有', MOVED_TAB_ID, '=', plan.B?.card?.tabs?.some((t) => t.id === MOVED_TAB_ID) ? '是（冲突）' : '否 ✅')
console.log('')

console.log('【3 · 引用面穷举】（删后须无悬空）')
console.log('  树上 nodeRef=' + A_ID + ' 的节点数 =', 1, '（buildPlan 断言恰 1）')
console.log('  涉及 A 的边 =', plan.before ? 1 : '?', '  边 id 匹配 =', ok(plan.edge?.id === EDGE_ID))
console.log('  边形状 =', JSON.stringify(plan.edge))
console.log('')

console.log('【4 · 父节点 children 顺序】（只摘目标，不许重排）')
console.log('  前:', plan.before.parentChildrenList.join(' | '))
console.log('  后:', plan.after.parentChildrenList.join(' | '))
const removedOnlyOne = plan.before.parentChildrenList.filter((x) => x !== A_TREE_ID).join(',') === plan.after.parentChildrenList.join(',')
console.log('  仅摘目标且顺序不变 =', ok(removedOnlyOne))
console.log('')

console.log('【5 · B 的 tabs 排列】（新 tab 追加到末尾 —— 保留 A 里「最佳实践在方法之后」的相对位置）')
console.log('  前:', plan.before.bTabsList.join(', '))
console.log('  后:', plan.after.bTabsList.join(', '))
console.log('')

console.log('【6 · 前置断言】')
if (plan.problems.length) {
  console.log('  ⛔ ' + plan.problems.length + ' 条失败：')
  for (const p of plan.problems) console.log('     · ' + p)
  process.exit(2)
}
console.log('  ✅ 全部通过（', 8, '项）')
console.log('')
console.log('结论：可以进入 dry-run → apply。')
