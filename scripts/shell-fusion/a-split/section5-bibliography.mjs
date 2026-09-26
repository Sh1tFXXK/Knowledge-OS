/**
 * A-split 第五节：参考文献硬删除 ——「数据库相关出版物」整簇（wiki References 切坏条目）。
 *
 * 动作：
 *   1. 书目文本转存 docs/sources/database-bibliography.md（防将来 wiki 重导出再爬）
 *   2. 卸整簇树条目（壳 + 8 孩子，共 9 条）
 *   3. 删 9 条 treebind 边
 *   4. 六处活引用复扫，命中即停（不写盘）
 *   5. 退 9 个池节点
 *
 * 用法：
 *   node scripts/shell-fusion/a-split/section5-bibliography.mjs          # 干跑
 *   node scripts/shell-fusion/a-split/section5-bibliography.mjs --apply  # 落盘
 */
import {
  loadState, flatten, shellContent, gateScan, statLine, log, fs,
} from './common.mjs'
import {
  saveAll, detachChild, dropTreebindEdgesForTreeIds,
} from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges } = state

const SHELL_ID = 'tree_wiki_en_outline_of_databases_s35'
const rec = flatten(tree).find((f) => f.node.id === SHELL_ID)
if (!rec) throw new Error('找不到「数据库相关出版物」壳')
const { node: shell, parent } = rec
const kids = shell.children ?? []
const allEntries = [shell, ...kids]
const treeIds = allEntries.map((n) => n.id)
const refs = allEntries.map((n) => n.nodeRef).filter(Boolean)

log('── A-split §5 参考文献硬删除 ──')
log(`壳「${shell.name}」@ 父「${parent.name}」，孩子 ${kids.length} 个，共 ${allEntries.length} 条树条目`)
log(`起始 ${statLine(state)}`)

// 1. 转存书目文本
const lines = [
  '# 数据库相关出版物（书目存档）',
  '',
  '> 2026-09-13 A-split 工单 §5：原 wiki References 切坏的「数据库相关出版物」簇（9 条树条目 / 9 个池节点）',
  '> 从知识树硬删除。书目文本在此存档，防止将来 wiki 重导出时再次被爬成条目。',
  '',
]
for (const k of kids) {
  const p = pool[k.nodeRef]
  lines.push(`- ${shellContent(p) || k.name}`)
}
lines.push('')
const doc = lines.join('\n')
fs.mkdirSync('docs/sources', { recursive: true })
fs.writeFileSync('docs/sources/database-bibliography.md', doc, 'utf8')
log(`书目已转存 docs/sources/database-bibliography.md（${doc.length} 字）`)

// 2. 卸整簇树条目（整簇从其父摘除，孩子随壳一起走）
detachChild(parent, shell.id)
log(`卸树条目：整簇 ${treeIds.length} 条（壳 ${shell.id} + 孩子）`)

// 3. 删 treebind 边
const removed = dropTreebindEdgesForTreeIds(edges, treeIds)
log(`删 treebind 边 ${removed} 条`)

// 4. 门禁复扫（排除已卸的树条目自身）
const scan = gateScan(state, refs, { excludeTreeIds: new Set(treeIds) })
log(`池内待退节点：${scan.inPool.length} / ${refs.length}`)
log(`活引用命中：${scan.hits.length}`)
for (const h of scan.hits) log('  ! ' + h)
if (scan.hits.length > 0) {
  log('\n结论：有命中 → 停止，不退池不落盘。')
  process.exit(1)
}

// 5. 退池
for (const r of refs) {
  if (pool[r]) delete pool[r]
}
log(`退池 ${refs.length} 个节点`)

log(`结果 ${statLine(state)}`)
if (apply) {
  saveAll({ pool, tree, edges })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges}.json + docs/sources/database-bibliography.md')
} else {
  log('（干跑，未写盘）')
}
