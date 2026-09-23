/**
 * apply-dedup-dual-copy-strict.mjs — dual-copy 去重（严格档）
 *
 * 口径（用户裁决）：当 rootContent 与唯一 tab **逐字节相同** 时
 *   → 保留 rootContent（读态只渲染 rootContent）
 *   → 置 tabs = []（库内既有合法态：512 例先例；dataValidation 视为「合法：仅入池」）
 *   → 不碰 title / label
 * 边界（一律不动）：
 *   · root ≈ tab（仅差空白/换行，归一化相等）——可能有语义/排版差异，不删
 *   · root = 标签 + tab（title-prefix 档）——不删
 *   · root 与 tab 内容有实质差异——不删
 *   · root 空 + 唯一 tab 有内容——不删（内容在 tab 里的正常形态）
 *   · 多 tab 卡——不删
 *
 * 全库严格档实测仅 14 例（含 2a 子树 4 例）；②③档 691 例需另行裁决，本脚本不碰。
 * 用法：node scripts/apply-dedup-dual-copy-strict.mjs [--apply]
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), 'data')
const APPLY = process.argv.includes('--apply')
const PTR_RE = /详见|见子节点|见「|参见|另见/
const problem = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problem.push(s) }
const norm = (s) => (s ?? '').replace(/\s+/g, '')

/** 纯函数：判定一张卡是否严格档可删（含全部边界；脚本自检用） */
export function classifyCard(card, label = '') {
  const tabs = card?.tabs
  if (!Array.isArray(tabs) || tabs.length !== 1) return 'multi-or-none'
  const a = card.rootContent ?? ''
  const b = tabs[0]?.content ?? ''
  if (!a.trim()) return 'root-empty'            // 内容在 tab 里：不删
  if (a === b) return 'strict'                  // ← 唯一可删档
  if (norm(a) === norm(b)) return 'approx'      // 仅差空白：不删
  if (norm(a) === norm(label) + norm(b)) return 'label-prefix'
  return 'other'                                // 实质差异：不删
}

console.log('══ 前置门：归类与计数 ══')
const raw = fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8')
const pool = JSON.parse(raw)
const poolKeys = Object.keys(pool)
const treeRaw = fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8')

const groups = {}
for (const [id, e] of Object.entries(pool)) {
  const g = classifyCard(e?.card, e?.label ?? '')
  ;(groups[g] ??= []).push(id)
}
const EXPECT = { strict: 44, approx: 396, 'label-prefix': 406, other: 555, 'root-empty': 1577 }
for (const g of ['strict', 'approx', 'label-prefix', 'other', 'root-empty']) {
  const n = (groups[g] ?? []).length
  ck(n === EXPECT[g], `${g} 计数 = ${EXPECT[g]}`, String(n))
}
const accounted = Object.values(EXPECT).reduce((s, n) => s + n, 0)
ck((groups['multi-or-none'] ?? []).length === poolKeys.length - accounted,
  `multi-or-none = ${poolKeys.length - accounted}（其余卡不适用本规则）`, String((groups['multi-or-none'] ?? []).length))
// 规则自检（纯函数边界，构造样例）
{
  const mk = (root, tab) => ({ rootContent: root, tabs: [{ id: 'def', label: '定义', content: tab }] })
  ck(classifyCard(mk('x'.repeat(60), 'x'.repeat(60))) === 'strict', '自检：逐字节相等 → strict')
  ck(classifyCard(mk('a\n\nb'.repeat(20), 'a b'.repeat(20))) === 'approx', '自检：仅差空白 → approx（不删）')
  ck(classifyCard(mk('标签 abcdefghij', 'abcdefghij'), '标签') === 'label-prefix', '自检：标签+tab → label-prefix（不删）', classifyCard(mk('标签 abcdefghij', 'abcdefghij'), '标签'))
  ck(classifyCard(mk('   ', 'abcdefghij')) === 'root-empty', '自检：root 空 → 不删')
  ck(classifyCard({ rootContent: 'x'.repeat(60), tabs: [{ content: 'x'.repeat(60) }, { content: 'y' }] }) === 'multi-or-none', '自检：多 tab → 不删')
  ck(classifyCard({ rootContent: 'a'.repeat(60), tabs: [] }) === 'multi-or-none', '自检：空 tabs → 不删')
}

const targets = groups.strict ?? []
console.log('\n══ 逐卡病灶在位门（严格档全库 44 例）══')
const before = {}
for (const id of targets) {
  const e = pool[id]
  const c = e.card
  before[id] = { root: c.rootContent, tabs: JSON.stringify(c.tabs) }
  ck(c.tabs.length === 1 && c.rootContent === c.tabs[0].content, `${id}: root 与唯一 tab 逐字节相等`)
  const extraKeys = Object.keys(c.tabs[0]).filter((k) => !['id', 'label', 'content'].includes(k))
  ck(extraKeys.length === 0, `${id}: tab 无附加元数据（不丢信息）`, extraKeys.join(','))
  ck(!treeRaw.includes(JSON.stringify(c.tabs[0].id)), `${id}: tab id 未被 tree-data 引用`)
  ck(!('supplement' in e && Array.isArray(e.supplement?.tabs) && e.supplement.tabs.length > 0), `${id}: 无 supplement.tabs 需同步`)
  ck(!PTR_RE.test(c.rootContent), `${id}: 内容零跨节点指针`)
}

console.log('\n══ 后置门（预演）══')
for (const id of targets) {
  const c = pool[id].card
  ck(c.rootContent === before[id].root && c.rootContent.length > 0, `${id}: rootContent 保持（内容零丢失）`)
}
ck(poolKeys.length === 3870, '节点总数守恒 3870', String(poolKeys.length))
if (problem.length) { console.log(`\n⛔ ${problem.length} 项未过门，未写入`); process.exit(1) }

// 变更：仅置空 tabs；rootContent 逐字节不动
for (const id of targets) pool[id].card.tabs = []

console.log('\n══ 变更范围门（其余节点必须逐字节不变）══')
const origPool = JSON.parse(raw)
const changed = []
for (const [id, e] of Object.entries(pool)) {
  if (JSON.stringify(e) !== JSON.stringify(origPool[id])) changed.push(id)
}
ck(changed.length === targets.length && changed.every((id) => targets.includes(id)), `变更集合 = ${targets.length} 例且无外溢`, `changed=${changed.length} 外溢=${changed.filter((x) => !targets.includes(x)).slice(0, 3)}`)

if (!APPLY) { console.log('\n(dry-run) 全部门通过，加 --apply 落盘'); process.exit(0) }
const target = path.join(DATA, 'node-pool.json')
const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, JSON.stringify(pool, null, 2), 'utf8')
fs.renameSync(tmp, target)
const back = JSON.parse(fs.readFileSync(target, 'utf8'))
let ok = Object.keys(back).length === 3870
for (const id of targets) {
  const c = back[id].card
  const good = Array.isArray(c.tabs) && c.tabs.length === 0 && c.rootContent === before[id].root
  if (!good) { ok = false; console.log(`  ❌ 回读异常 ${id}`) }
}
console.log(ok ? `\n✅ 写入并回读校验通过（${targets.length} 例 tabs 清空 / rootContent 逐字节不变 / ${poolKeys.length} 节点守恒）` : '\n❌ 回读校验失败')
process.exit(ok ? 0 : 1)
