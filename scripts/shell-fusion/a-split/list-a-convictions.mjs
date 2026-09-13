/**
 * 只读：输出扫描器 A 类（「A 与 B」强行捆绑型）残留定罪清单，带 treeId / nodeRef /
 * 正文长度 / 父子路径 / 直接子节点数与全子树规模。
 *
 * 定罪来源不自行实现匹配：直接解析扫描器刚产出的 violation-list.md 第一类段落，
 * 保证清单与 scripts/scan-tree-violations.mjs 的口径完全一致。
 *
 * 用法：node scripts/shell-fusion/a-split/list-a-convictions.mjs
 * 产出：outputs/tree-violation-scan/a-residual-list.md + 控制台表格
 */
import fs from 'node:fs'
import { loadState, flatten, shellContent, log } from './common.mjs'

const SRC = 'outputs/tree-violation-scan/violation-list.md'
const OUT = 'outputs/tree-violation-scan/a-residual-list.md'

const state = loadState()
const { pool, tree } = state
const flat = flatten(tree)

/** 祖先路径（从根到父）：返回中文名数组。自建 id→路径索引，因为 flatten().parent 只是父节点对象。 */
const pathOf = new Map()
const childrenOf = new Map()
const descOf = new Map()
{
  const dfs = (node, ancestors) => {
    pathOf.set(node.id, ancestors)
    childrenOf.set(node.id, (node.children ?? []).length)
    let n = 0
    for (const kid of node.children ?? []) {
      const sub = dfs(kid, [...ancestors, node.name ?? '(无名)'])
      n += 1 + sub
    }
    descOf.set(node.id, n)
    return n
  }
  dfs(tree, [])
}

// ── 解析扫描器产出的第一类段落 ──────────────────────────────────────────
const lines = fs.readFileSync(SRC, 'utf8').split('\n')
const start = lines.findIndex((l) => l.startsWith('## 第一类'))
if (start < 0) throw new Error(`未在 ${SRC} 找到「第一类」段落——请先跑 scripts/scan-tree-violations.mjs`)
const rows = []
for (let i = start + 1; i < lines.length; i += 1) {
  const l = lines[i]
  if (l.startsWith('## ')) break
  if (!l.startsWith('|')) continue
  const cells = l.split('|').slice(1, -1).map((c) => c.trim())
  if (cells.length < 7) continue
  if (cells[0] === '树节点' || /^-+$/.test(cells[1].replace(/[:\s]/g, ''))) continue
  rows.push({ name: cells[0], path: cells[1], subtree: Number(cells[2]) || 0, bodyFlag: cells[3], qFlag: cells[4], treeId: cells[5], nodeRef: cells[6] })
}

// ── 富化 ───────────────────────────────────────────────────────────────
const enriched = rows.map((r) => {
  const inPool = !!pool[r.nodeRef]
  const body = inPool ? shellContent(pool[r.nodeRef]).length : -1
  // 优先按 treeId 定位；treeId 失效时退回 nodeRef（可能多处挂载）
  let rec = flat.find((f) => f.node.id === r.treeId)
  let viaFallback = false
  if (!rec) { const hits = flat.filter((f) => f.node.nodeRef === r.nodeRef); rec = hits[0]; viaFallback = hits.length > 0 }
  const ancestors = rec ? (pathOf.get(rec.node.id) ?? []) : []
  const children = rec ? (childrenOf.get(rec.node.id) ?? -1) : -1
  const desc = rec ? (descOf.get(rec.node.id) ?? -1) : -1
  const dupMounts = flat.filter((f) => f.node.nodeRef === r.nodeRef).length
  return { ...r, inPool, body, ancestors, parentPath: ancestors.length ? ancestors.join(' / ') : '(根)', children, desc, dupMounts, viaFallback }
})

// ── 输出 ───────────────────────────────────────────────────────────────
enriched.sort((a, b) => b.desc - a.desc)

log(`A 类残留定罪 ${enriched.length} 条（口径：${SRC} 第一类段落）\n`)
const md = []
md.push('# A 类残留定罪清单（「A 与 B」强行捆绑型）', '')
md.push(`> 生成：scripts/shell-fusion/a-split/list-a-convictions.mjs（只读）`)
md.push(`> 口径：扫描器 ${SRC} 第一类段落；树/池/正文取自 data/ 现值。`)
md.push(`> 说明：这批 **不在** 工单 136 行 A 组名单内，属更大清理清单的存量，尚未处置。`, '')
md.push('| # | 树节点 | treeId | nodeRef | 正文 | 直接子节点 | 全子树 | 父路径 |')
md.push('|---:|---|---|---|---:|---:|---:|---|')
enriched.forEach((r, i) => {
  const body = r.inPool ? `${r.body} 字` : '池内无'
  md.push(`| ${i + 1} | ${r.name} | \`${r.treeId}\` | \`${r.nodeRef}\` | ${body} | ${r.children} | ${r.desc} | ${r.parentPath} |`)
})
md.push('')

// 控制台明细（含池状态与重复挂载提示）
for (const [i, r] of enriched.entries()) {
  log(`${String(i + 1).padStart(2)}. ${r.name}`)
  log(`    treeId   : ${r.treeId}${r.viaFallback ? '（⚠ treeId 未命中，按 nodeRef 兜底定位）' : ''}`)
  log(`    nodeRef  : ${r.nodeRef}${r.inPool ? '' : '  ⚠ 池内无此节点'}`)
  log(`    正文     : ${r.inPool ? `${r.body} 字` : '—'}`)
  log(`    子节点   : 直接 ${r.children} · 全子树 ${r.desc}`)
  log(`    父路径   : ${r.parentPath}`)
  if (r.dupMounts > 1) log(`    ⚠ 该 nodeRef 共 ${r.dupMounts} 处挂载（重复 nodeRef 债务）`)
}

fs.writeFileSync(OUT, md.join('\n'), 'utf8')
log(`\n已写出 ${OUT}`)
log(`规模分布：全子树 >100 的 ${enriched.filter((r) => r.desc > 100).length} 条；直接子节点 ≥5 的 ${enriched.filter((r) => r.children >= 5).length} 条；带子树的 ${enriched.filter((r) => r.desc > 0).length} 条`)
