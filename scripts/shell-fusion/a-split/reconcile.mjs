/**
 * 只读对账：把工单 §一/§二/§四 三张表解析成编号集合，与 A 组 136 行主表求差，
 * 得出 §三 的精确行集（不依赖人工转录），并核对 §四/§五 是否已全部落地。
 */
import fs from 'node:fs'
import { loadState, flatten } from './common.mjs'

const md = fs.readFileSync('outputs/tree-violation-scan/work-order-a-split-136.md', 'utf8')
const lines = md.split('\n')

/** 抓取某一节（## 标题）内的表格行首编号。 */
function sectionNumbers(heading) {
  const start = lines.findIndex((l) => l.startsWith(heading))
  if (start < 0) throw new Error(`找不到节：${heading}`)
  const out = []
  for (let i = start + 1; i < lines.length; i += 1) {
    const l = lines[i]
    if (l.startsWith('## ')) break
    const m = l.match(/^\|\s*(\d+)\s*\|/)
    if (m) out.push(+m[1])
  }
  return out
}

const s1 = sectionNumbers('## 一、')
const s2 = sectionNumbers('## 二、')
const s4 = sectionNumbers('## 四、')
const s5 = sectionNumbers('## 五、')
const s6 = sectionNumbers('## 六、')

const uniq = (a) => [...new Set(a)].sort((x, y) => x - y)
console.log(`§一 表行 ${s1.length}（去重 ${uniq(s1).length}）`)
console.log(`§二 表行 ${s2.length}（去重 ${uniq(s2).length}）`)
console.log(`§四 表行 ${s4.length}（去重 ${uniq(s4).length}）`)
console.log(`§五 表行 ${s5.length} · §六 表行 ${s6.length}`)

const covered = new Set([...s1, ...s2, ...s4, ...s5, ...s6])
const all = Array.from({ length: 136 }, (_, i) => i + 1)
const missing = all.filter((n) => !covered.has(n))
console.log(`\n三表并集覆盖 ${covered.size} 个编号；1..136 中未被任何节认领：${missing.length}`)
console.log(`未认领编号：${missing.join(',')}`)

// 交叉：§一/§二/§四 相互重叠（同一编号出现在多节）
const dup = {}
for (const [tag, arr] of [['§一', s1], ['§二', s2], ['§四', s4]]) {
  for (const n of uniq(arr)) {
    if (!dup[n]) dup[n] = []
    dup[n].push(tag)
  }
}
const multi = Object.entries(dup).filter(([, v]) => v.length > 1)
console.log(`\n跨节重复编号 ${multi.length} 个：${multi.map(([n, v]) => `${n}(${v.join('+')})`).join(' , ') || '(无)'}`)

// 这些未认领编号在实树里的存活情况
const aRows = []
{
  const amd = fs.readFileSync('outputs/tree-violation-scan/all-outstanding.md', 'utf8').split('\n')
  const aStart = amd.findIndex((l) => l.startsWith('## A ·'))
  const re = new RegExp('^\\|\\s*(\\d+)\\s*\\|\\s*(.+?)\\s*\\|\\s*`(.+?)`\\s*\\|\\s*\\**(\\d+)\\**\\s*\\|\\s*(\\d+)字\\s*\\|\\s*(.+?)\\s*\\|')
  for (let i = aStart + 1; i < amd.length; i += 1) {
    const l = amd[i]
    if (l.startsWith('## ')) break
    const m = l.match(re)
    if (m) aRows.push({ no: +m[1], name: m[2], ref: m[3], kids: +m[4], chars: +m[5], path: m[6] })
  }
  console.log(`\nA 组主表解析：${aRows.length} 行`)
}
const state = loadState()
const flat = flatten(state.tree)
const aliveOf = (no) => {
  const r = aRows.find((x) => x.no === no)
  if (!r) return null
  const mounts = flat.filter((f) => f.node.nodeRef === r.ref)
  return { ...r, mounts: mounts.length, inPool: !!state.pool[r.ref] }
}
console.log('\n未认领编号的实树存活状态：')
for (const n of missing) {
  const a = aliveOf(n)
  console.log(`  #${n} ${a.name} | 池=${a.inPool ? '有' : '无'} 树=${a.mounts} | 孩=${a.kids} 正文=${a.chars}字`)
}
const aliveMissing = missing.filter((n) => { const a = aliveOf(n); return a && (a.mounts > 0 || a.inPool) })
console.log(`\n其中仍存活（树或池）：${aliveMissing.length} 个 → ${aliveMissing.join(',')}`)

// §四 各行的落地核对
console.log('\n§四 落地核对（仍存活即未落地）：')
for (const n of uniq(s4)) {
  const a = aliveOf(n)
  if (!a) { console.log(`  #${n} 不在 A 主表（§四 可能含非 A 组条目）`); continue }
  const still = a.mounts > 0 || a.inPool
  console.log(`  #${n} ${a.name} → ${still ? `⚠ 仍存活（池=${a.inPool ? '有' : '无'} 树=${a.mounts}）` : '已处置 ✓'}`)
}
