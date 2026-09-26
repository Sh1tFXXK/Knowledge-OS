import fs from 'node:fs'
// 只读审计：默认不落盘（--write 才写 outputs/tree-violation-scan/plan-dedup-dual-copy-normalized.json）；--pool <path> 可指向 apply 前快照做同口径复核。
// 空行口径与 scripts/apply|verify-dedup-dual-copy-normalized.mjs 对齐 = /\n[ \t]*\n/（含只带空格的空行）；
// 早期版本用 /\n\n/，会与落盘基线 461/127/214 分叉。
const argOf = (name) => { const i = process.argv.indexOf(name); return i === -1 ? null : process.argv[i + 1] }
const POOL_PATH = argOf('--pool') ?? 'data/node-pool.json'
const TREE_PATH = argOf('--tree') ?? 'data/tree-data.json'
const WRITE = process.argv.includes('--write')
const p = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8'))
const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'))
const norm = (s) => (s ?? '').replace(/\s+/g, '')
const pathOf = new Map()
const walk = (n) => { if (n.nodeRef && n.id) pathOf.set(n.nodeRef, n.id); for (const k of n.children ?? []) walk(k) }
for (const r of tree.children ?? tree.roots ?? []) walk(r)
const nl2 = (s) => ((s ?? '').match(/\n[ \t]*\n/g) || []).length

const out = { approx: [], prefix: [] }
for (const [id, e] of Object.entries(p)) {
  const c = e?.card
  const tabs = c?.tabs
  if (!Array.isArray(tabs) || tabs.length !== 1) continue
  const a = c.rootContent ?? '', b = tabs[0]?.content ?? '', label = e.label ?? ''
  if (!a.trim()) continue
  if (norm(a) === norm(b)) out.approx.push(id)
  else if (norm(a) === norm(label) + norm(b)) out.prefix.push(id)
}
const dirOf = (a, b) => { const ca = nl2(a), cb = nl2(b); return cb > ca ? 'tab' : ca > cb ? 'root' : 'tie' }
for (const k of ['approx', 'prefix']) {
  const stat = { tab: 0, root: 0, tie: 0, inTree: 0 }
  for (const id of out[k]) {
    const c = p[id].card
    stat[dirOf(c.rootContent ?? '', c.tabs[0].content ?? '')] += 1
    if (pathOf.has(id)) stat.inTree += 1
  }
  console.log(`${k}: ${out[k].length} | 方向 tab=${stat.tab} root=${stat.root} tie=${stat.tie} | 在树上=${stat.inTree}`)
}
// 合并两档的方向分布（= apply 脚本的目标集）
const all = [...out.approx, ...out.prefix]
const merged = { tab: 0, root: 0, tie: 0, inTree: 0 }
const branchMembers = { tab: [], root: [], tie: [] }
for (const id of all) {
  const c = p[id].card
  const d = dirOf(c.rootContent ?? '', c.tabs[0].content ?? '')
  merged[d] += 1
  branchMembers[d].push(id)
  if (pathOf.has(id)) merged.inTree += 1
}
console.log('\n合并 802 例：', JSON.stringify(merged))
// root 更干净/平手档里含 label 前缀的卡（= 剥前缀但保留 root 的卡）
const stripOnly = [...branchMembers.root, ...branchMembers.tie].filter((id) => out.prefix.includes(id))
console.log('root 更干净/平手中含 label 前缀的卡：', stripOnly.length)
// 前缀长度检查 + 剥后守恒抽样
let bad = 0
for (const id of out.prefix) {
  const c = p[id].card, label = p[id].label ?? ''
  const a = c.rootContent ?? ''
  // 最长满足 norm(P)===norm(label) 的前缀
  let len = -1
  for (let i = label.length; i <= Math.min(a.length, label.length * 2 + 8); i++) if (norm(a.slice(0, i)) === norm(label)) { len = i; break }
  if (len < 0 || norm(a.slice(len)) !== norm(c.tabs[0].content ?? '')) { bad++; if (bad <= 5) console.log('  ⚠️ 前缀异常', id, JSON.stringify(a.slice(0, 40)), label) }
}
console.log(`③档前缀定位失败/不守恒：${bad}/${out.prefix.length}`)
// 各分支取样可测性（在树上的数量）
for (const k of ['tab', 'root', 'tie']) {
  const inT = branchMembers[k].filter((id) => pathOf.has(id)).length
  console.log(`分支 ${k}: 总数 ${branchMembers[k].length} | 在树上 ${inT}`)
}
// tab 外壳 label：本批处置认定为「随外壳有意丢弃」（不迁移），此处只清点留档。
// 现库目标卡 tabs 已清空，故此表需配 --pool <apply 前快照> 才有内容。
const tabLabelInventory = Object.fromEntries(Object.entries(branchMembers).map(([k, ids]) => [
  k,
  ids.filter((id) => (p[id].card.tabs?.[0]?.label ?? '') !== '').map((id) => [id, p[id].card.tabs[0].label]),
]))
console.log('非空 tab 标签（有意丢弃，仅留档）：', Object.entries(tabLabelInventory).map(([k, v]) => `${k}=${v.length}`).join(' '))
for (const [k, rows] of Object.entries(tabLabelInventory)) for (const [id, label] of rows) console.log(`  - ${k} ${id} = ${JSON.stringify(label)}`)

const payload = { pool: POOL_PATH, approx: out.approx, prefix: out.prefix, branchMembers, droppedTabLabels: tabLabelInventory }
if (WRITE) {
  fs.writeFileSync('outputs/tree-violation-scan/plan-dedup-dual-copy-normalized.json', JSON.stringify(payload, null, 1))
  console.log('\n已写入 outputs/tree-violation-scan/plan-dedup-dual-copy-normalized.json')
} else {
  console.log('\n只读模式：未写盘（加 --write 落 outputs/tree-violation-scan/plan-dedup-dual-copy-normalized.json）')
}
