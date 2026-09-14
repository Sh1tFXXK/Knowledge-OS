/**
 * 导出「知识宇宙」目录树的完整层级名单（只读，不碰 data/）。
 *
 * 为什么要有这个脚本：树的规模已经到 3000+ 条、最深 13 层，靠人读 JSON 或刷屏都不现实。
 * 名单要能**归档、能搜、能对拍**，所以固定落到 outputs/ 下的一个 md 文件里，
 * 而不是每次现敲一条 node -e（口径会漂）。
 *
 * 输出：outputs/universe-tree-listing/tree-listing.md        （带 id/ref，供检索对拍）
 *      outputs/universe-tree-listing/tree-names.md          （--names-only，只要名字）
 *
 * 用法：
 *   node scripts/export-tree-listing.mjs              # 全量（默认，带树id/池ref）
 *   node scripts/export-tree-listing.mjs --depth=3    # 只导到第 3 层
 *   node scripts/export-tree-listing.mjs --names-only # 只要缩进层级 + 名称，无统计无 id/ref
 *
 * 注意：树条目上的 `count` 字段全树实测恒为 0（历史遗留，不可当孩子数），
 * 本脚本一律用 `children.length` 计。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'data', 'tree-data.json')
const OUT_DIR = path.join(ROOT, 'outputs', 'universe-tree-listing')

const argDepth = process.argv.find((a) => a.startsWith('--depth='))
const MAX_DEPTH = argDepth ? Number(argDepth.split('=')[1]) : Infinity
const NAMES_ONLY = process.argv.includes('--names-only')
const OUT = path.join(OUT_DIR, NAMES_ONLY ? 'tree-names.md' : 'tree-listing.md')

const tree = JSON.parse(fs.readFileSync(SRC, 'utf8'))

// ── 统计 ────────────────────────────────────────────────────────────────
let total = 0
let maxDepth = 0
const byDepth = {}
const walk = (node, depth) => {
  total += 1
  byDepth[depth] = (byDepth[depth] || 0) + 1
  if (depth > maxDepth) maxDepth = depth
  for (const child of node.children || []) walk(child, depth + 1)
}
walk(tree, 0)

const subtreeSize = (node) => 1 + (node.children || []).reduce((sum, c) => sum + subtreeSize(c), 0)
const subtreeDepth = (node) => {
  if (!(node.children || []).length) return 0
  return 1 + Math.max(...node.children.map(subtreeDepth))
}

const name = (n) => String(n.name ?? '').replace(/\s+/g, ' ').trim() || '(无名)'

// ── 名单主体 ────────────────────────────────────────────────────────────
const lines = []
const emit = (node, depth) => {
  const kids = (node.children || []).length
  const indent = '  '.repeat(depth)
  if (NAMES_ONLY) {
    lines.push(`${indent}- ${name(node)}`)
  } else {
    const kidPart = kids ? ` (${kids}孩)` : ''
    const refPart = node.nodeRef ? `  ·  ${node.nodeRef}` : ''
    lines.push(`${indent}- ${name(node)}${kidPart}  ·  ${node.id}${refPart}`)
  }
  if (depth >= MAX_DEPTH) return
  for (const child of node.children || []) emit(child, depth + 1)
}
emit(tree, 0)

// ── 一级域概览 ──────────────────────────────────────────────────────────
const topRows = (tree.children || []).map((c, i) => {
  const kids = (c.children || []).length
  return `| ${i + 1} | ${name(c)} | ${kids} | ${subtreeSize(c)} | ${subtreeDepth(c)} | \`${c.id}\` | \`${c.nodeRef ?? '-'}\` |`
})

const depthRows = Object.keys(byDepth)
  .map(Number)
  .sort((a, b) => a - b)
  .map((d) => `| ${d} | ${byDepth[d]} |`)

const stamp = new Date().toISOString().replace('.000Z', 'Z')
const docParts = [
  '# 知识宇宙 · 目录树名单',
  '',
  `> 数据源 \`data/tree-data.json\`（只读导出，未改动任何数据）`,
  `> 导出时间 ${stamp}${MAX_DEPTH === Infinity ? '' : ` · 截断深度 ${MAX_DEPTH}`}`,
  '',
  '## 规模',
  '',
  `- 根：**${name(tree)}**（\`${tree.id}\`）`,
  `- 树条目总数（含根）：**${total}**`,
  `- 最大深度（根 = 0）：**${maxDepth}**`,
  `- 一级域：**${(tree.children || []).length}** 个`,
  '',
  '### 一级域概览',
  '',
  '| # | 域 | 亲儿子 | 子树条目 | 子树深度 | 树 id | 池 ref |',
  '|---|---|---|---|---|---|---|',
  ...topRows,
  '',
  '### 各层节点数',
  '',
  '| 层 | 节点数 |',
  '|---|---|',
  ...depthRows,
  '',
  '---',
  '',
  '## 完整层级名单',
  '',
  '> 每行格式：`<缩进>- 名称 (N孩) · 树id · 池ref`。叶子省略「(N孩)」。',
  '',
  ...lines,
  '',
]
// --names-only：纯名称骨架，不要统计、不要 id/ref
const md = (NAMES_ONLY ? [...lines, ''] : docParts).join('\n')

fs.mkdirSync(OUT_DIR, { recursive: true })
const tmp = `${OUT}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, md, 'utf8')
try {
  fs.renameSync(tmp, OUT)
} catch (err) {
  // Windows 常态：目标文件正被编辑器 / 预览面板占用时 rename 抛 EPERM(0x2 找不到/拒绝)。
  // 退化为原地覆盖写，避免留下孤儿 .tmp —— 也避免把「产物没更新」误判成脚本坏了。
  fs.writeFileSync(OUT, md, 'utf8')
  try { fs.unlinkSync(tmp) } catch { /* 兜底失败就不再纠缠 */ }
  console.log(`⚠️ rename 被拒绝（${err.code}），已退化为原地覆盖写；若内容未变请关掉该文件的预览后重跑`)
}

console.log(`根：${name(tree)}  ·  条目 ${total}  ·  深度 ${maxDepth}  ·  一级域 ${(tree.children || []).length}`)
console.log(`各层节点数：${JSON.stringify(byDepth)}`)
console.log(`列表已写出：${path.relative(ROOT, OUT)}（${lines.length} 行${NAMES_ONLY ? '，仅名称' : ''}${MAX_DEPTH === Infinity ? '' : `，已按 --depth=${MAX_DEPTH} 截断`}）`)
if (lines.some((l) => /[\r\n]/.test(l))) console.log('⚠️ 名单行内含换行，请检查源数据名字')
