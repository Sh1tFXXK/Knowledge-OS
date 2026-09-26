/**
 * A-split 载体修正：本批写进池卡 `card.tabs` 的正文块 → 正身树条目的 supplement tab。
 *
 * 缘由（浏览器实测）：右栏与索引图都不渲染 `card.tabs` 的标签与正文——索引图按树包含关系
 * 展开子节点，卡 tab 只被 answerComposer / supertagMaterials 消费。工单一/二两节要求的载体
 * 是 supplement，它在右栏渲染为「路径·X」按钮（section 4 先例已实测可见）。
 *
 * 规则：正身有树挂载 → 每个挂载条目加 supplement tab（同 id），并从池卡移除该 tab（移动非复制）；
 *       正身无树挂载 → 保留池卡 tab（唯一可用载体），在日志中列明。
 *
 * 用法：node scripts/shell-fusion/a-split/mirror-tabs-to-supplement.mjs [--apply]
 */
import { loadState, flatten, log } from './common.mjs'
import { saveAll, addSupplementTab } from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges, questions } = state
const flat = flatten(tree)
const mountsOf = (ref) => flat.filter((f) => f.node.nodeRef === ref)

const BATCH_TAB = (id) => String(id ?? '').startsWith('context:asplit:') || String(id ?? '').startsWith('asplit:')

let moved = 0
let tabCount = 0
const keptCardTabs = []
const refs = []

log('═══ A-split 载体修正：池卡 tab → 树条目 supplement ═══')
for (const n of Object.values(pool)) {
  const batchTabs = (n.card?.tabs ?? []).filter((t) => BATCH_TAB(t.id))
  if (batchTabs.length === 0) continue
  const mounts = mountsOf(n.id)
  if (mounts.length === 0) {
    keptCardTabs.push(`${n.id}「${n.label}」×${batchTabs.length}`)
    continue
  }
  refs.push(n.id)
  for (const tab of batchTabs) {
    for (const m of mounts) {
      const r = addSupplementTab(m.node, {
        id: tab.id,
        label: tab.label,
        content: tab.content,
        tags: n.tags ?? [],
      })
      log(`  supplement ${r}：「${n.label}」→ 树条目「${m.node.name}」(${m.node.id}) tab「${tab.label}」${(tab.content ?? '').length} 字`)
      tabCount += 1
    }
    // 移动：从池卡移除
    n.card.tabs = n.card.tabs.filter((t) => t !== tab)
    moved += 1
  }
}

log(`\n移动 tab ${moved} 块 → 生成 supplement ${tabCount} 个（覆盖 ${refs.length} 个正身的全部树挂载）`)
log(`保留在池卡（无树挂载，唯一载体）：${keptCardTabs.join(' , ') || '(无)'}`)

if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
