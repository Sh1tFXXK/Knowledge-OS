/**
 * 阶段一 指标快照 + 基线对照（只读）。
 *
 * 目的：用**同一套定义**同时算「备份基线」与「当前数据」的结构指标，
 * 输出 Δ 表，证明变更的影响面与预期完全吻合（尤其是：审计文案修正这一步不碰 tree/pool/edges）。
 *
 * 用法：node scripts/metrics-phase1.mjs            # 打印基线 vs 当前 + Δ
 *      node scripts/metrics-phase1.mjs --json      # 额外落盘 outputs/tree-violation-scan/phase1-metrics.json
 *
 * 指标定义（显式写出，避免"存量债"口径漂移）：
 *   treeEntries      树节点总数（含根）
 *   poolNodes        池实体总数
 *   edges            边总数
 *   danglingTreeRef  树节点 nodeRef 不在池中
 *   danglingEdge     边的 source/target 不在「池键 ∪ 树 treeId ∪ 树 nodeRef」中
 *   missingTreebind  (父,子) 对缺少端点完全一致的 treebind 边
 *   repeatedMount    同一 nodeRef 被挂在 >1 个树节点
 *   unmountedPool    池实体从未出现在任何树节点上
 *   emptyContent     池实体所有 tab 的 content 都为空（或没有 tab）
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

const walk = (root) => {
  const out = []
  ;(function w(n, parent, trail) {
    const t = [...trail, n]
    out.push({ n, parent, path: t.map((x) => String(x.name ?? x.label ?? '')).join(' > ') })
    for (const c of n.children || []) w(c, n, t)
  })(root, null, [])
  return out
}

const metrics = (tree, pool, edges) => {
  const recs = walk(tree)

  const poolKeys = Object.keys(pool)
  const treeIds = new Set(recs.map((r) => r.n.id).filter(Boolean))
  const treeRefs = new Set(recs.map((r) => r.n.nodeRef).filter(Boolean))
  const known = new Set([...poolKeys, ...treeIds, ...treeRefs])

  const danglingTreeRef = recs.filter((r) => r.n.nodeRef && !pool[r.n.nodeRef]).length
  const danglingEdge = edges.filter((e) => !known.has(e.source) || !known.has(e.target)).length

  const tbKeys = new Set(edges.filter((e) => String(e.id).startsWith('treebind:')).map((e) => e.source + '\u0000' + e.target))
  let missingTreebind = 0
  for (const r of recs) {
    if (!r.parent) continue
    if (!tbKeys.has((r.parent.nodeRef ?? '') + '\u0000' + (r.n.nodeRef ?? ''))) missingTreebind += 1
  }

  const byRef = new Map()
  for (const r of recs) {
    if (!r.n.nodeRef) continue
    byRef.set(r.n.nodeRef, (byRef.get(r.n.nodeRef) ?? 0) + 1)
  }
  const repeatedMount = [...byRef.values()].filter((v) => v > 1).length

  const unmountedPool = poolKeys.filter((k) => !treeRefs.has(k)).length

  const emptyContent = poolKeys.filter((k) => {
    const tabs = pool[k]?.card?.tabs
    if (!Array.isArray(tabs) || tabs.length === 0) return true
    return tabs.every((t) => !String(t?.content ?? '').trim())
  }).length

  return {
    treeEntries: recs.length,
    poolNodes: poolKeys.length,
    edges: edges.length,
    danglingTreeRef,
    danglingEdge,
    missingTreebind,
    repeatedMount,
    unmountedPool,
    emptyContent,
  }
}

const bkRoot = path.join(DATA, 'backups')
const bk = fs.readdirSync(bkRoot).filter((d) => d.startsWith('phase1-oop-os-')).sort().pop()
if (!bk) throw new Error('找不到 phase1 备份目录')
const bkDir = path.join(bkRoot, bk)

const loadInto = (dir) => ({
  tree: rd(path.join(dir, 'tree-data.json')),
  pool: rd(path.join(dir, 'node-pool.json')),
  edges: rd(path.join(dir, 'knowledge-edges.json')),
})

const base = metrics(...Object.values(loadInto(bkDir)))
const cur = metrics(...Object.values(loadInto(DATA)))

const LABEL = {
  treeEntries: '树节点总数',
  poolNodes: '池实体总数',
  edges: '边总数',
  danglingTreeRef: '悬空 nodeRef（树→池）',
  danglingEdge: '悬空边（端点不存在）',
  missingTreebind: '缺 treebind 的父子对',
  repeatedMount: '重复挂载的 nodeRef 数',
  unmountedPool: '从未挂载的池实体',
  emptyContent: '空内容池实体',
}

const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - [...String(s)].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)))
const fmt = (v) => (v > 0 ? '+' + v : String(v))

console.log('基线：data/backups/' + bk)
console.log('\n' + pad('指标', 26) + pad('基线', 10) + pad('当前', 10) + 'Δ')
console.log('-'.repeat(56))
const rows = {}
for (const k of Object.keys(LABEL)) {
  const d = cur[k] - base[k]
  rows[k] = { base: base[k], cur: cur[k], delta: d }
  console.log(pad(LABEL[k], 26) + pad(base[k], 10) + pad(cur[k], 10) + (d === 0 ? '0' : fmt(d)))
}

// 预期口径（阶段一设计目标）
const EXPECT = { treeEntries: 3219, poolNodes: 3855, edges: 4166 }
console.log('\n== 设计目标核对 ==')
let ok = true
for (const [k, v] of Object.entries(EXPECT)) {
  const hit = cur[k] === v
  if (!hit) ok = false
  console.log('  ' + (hit ? '✅' : '❌') + ' ' + LABEL[k] + ' = ' + cur[k] + '（期望 ' + v + '）')
}
// 存量债口径：只约束「存量缺陷」不上升。增长类指标（树/池/边）按设计目标单独核对；
// 空内容项应与新建实体数同步增长（新实体先建壳、后补内容），不算债。
const GROWTH = new Set(['treeEntries', 'poolNodes', 'edges'])
const DEBT = Object.keys(LABEL).filter((k) => !GROWTH.has(k) && k !== 'emptyContent')
console.log('\n== 存量债 Δ 核对（只约束不上升）==')
const debtUp = DEBT.filter((k) => rows[k].delta > 0)
for (const k of DEBT) {
  const d = rows[k].delta
  console.log('  ' + (d > 0 ? '❌' : d < 0 ? '✅ 改善' : '✅') + ' ' + LABEL[k] + ' Δ=' + d)
}
console.log('  ' + (debtUp.length === 0 ? '✅' : '❌') + ' 存量债无上升（例外项：' + (debtUp.join(', ') || '无') + '）')
if (debtUp.length) ok = false

const newEntities = rows.poolNodes.delta
const emptyOk = rows.emptyContent.delta <= newEntities
console.log('  ' + (emptyOk ? '✅' : '❌') + ' 空内容增量 ' + rows.emptyContent.delta + ' ≤ 新建实体数 ' + newEntities + '（新实体先建壳属预期）')
if (!emptyOk) ok = false
if (process.argv.includes('--json')) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, 'phase1-metrics.json'),
    JSON.stringify({ baselineDir: bk, rows, expect: EXPECT, ok }, null, 2) + '\n', 'utf8')
  console.log('\n已落盘 outputs/tree-violation-scan/phase1-metrics.json')
}
process.exit(ok ? 0 : 1)
