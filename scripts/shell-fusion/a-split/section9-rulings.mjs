/**
 * A-split 未认领项裁决执行（用户 2026-09-13 裁决）：
 *   #56  注释和参考文献（7 字维基残留）  → 硬删除（卸树 + 门禁 + 退池），对齐 §五 书目清理逻辑
 *   #125 算法与数据结构（28 字）          → 吸附降维（正文并入「算法」+ 卸树退池）
 *   #135 微服务架构与网络调用（27 字）     → 吸附降维（正文并入「微服务架构」+ 卸树退池）
 *   #120 交互与通信 / #122 知识表示与推理 / #123 自动化规划与调度
 *                                        → 豁免保留（**本脚本不动数据**，只把三者加入扫描器豁免名单）
 *
 * ⚠️ 实数据差异（已在提交信息与本轮汇报中标明，未自行改判）：
 *   · #125 裁决写「并入 算法 与 数据结构 主节点」，但池内 label 恰为「数据结构」的节点有 4 个，
 *     其中 2 个（n_6dgtsmpj 25 字 / theory_domain_data_structures 38 字）与 #125 同挂「算法」下，
 *     三者均为 governance/canonical 生成的近空占位节点。故只并入语义无歧义的「算法」，
 *     并把这组同标签重复作为既有债务上报，等用户指定「数据结构」主节点后再补并。
 *   · #135 正文实为 `# 熔断与隔离 / # 限流 / # 自适应限流 / # 降级策略` 主题列表，
 *     与其节点名「微服务架构与网络调用」不匹配（且熔断/隔离等主题已另有正身），按裁决照并并标注。
 *
 * 用法：node scripts/shell-fusion/a-split/section9-rulings.mjs [--apply]
 */
import { loadState, flatten, shellContent, gateScan, statLine, log } from './common.mjs'
import {
  saveAll, addSupplementTab, detachChild, dropTreebindEdgesForTreeIds, treeCount,
} from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges, questions } = state
const flat = () => flatten(tree)
const byId = (id) => flat().find((f) => f.node.id === id)
const byRef = (ref) => flat().filter((f) => f.node.nodeRef === ref)

const unloaded = new Set()
const dropped = []
const addedSupplements = []

function unloadTreeEntry(rec, tag) {
  detachChild(rec.parent, rec.node.id)
  unloaded.add(rec.node.id)
  const removed = dropTreebindEdgesForTreeIds(edges, [rec.node.id])
  log(`  卸树条目「${rec.node.name}」(${rec.node.id})，删 treebind ${removed} 条`)
}

function gateAndDrop(ref, tag) {
  const scan = gateScan(state, [ref], { excludeTreeIds: [...unloaded] })
  if (scan.hits.length > 0) {
    log(`  ✗ ${tag} 门禁命中：`)
    for (const h of scan.hits) log('    ! ' + h)
    process.exit(1)
  }
  delete pool[ref]
  dropped.push(ref)
  log(`  退池：${ref}`)
}

log('═══ A-split 未认领项裁决 ═══')
log(`起始 ${statLine(state)}`)

// ── #56 硬删除 ─────────────────────────────────────────────────────────
log('\n── #56 注释和参考文献 → 硬删除 ──')
{
  const ref = 'k_wiki_en_compiler_s12'
  const recs = byRef(ref)
  if (recs.length !== 1) throw new Error(`#56: ${ref} 命中 ${recs.length} 个树条目`)
  const c = shellContent(pool[ref])
  log(`  正文 ${c.length} 字：${c.replace(/\n/g, ' ')}`)
  unloadTreeEntry(recs[0], '#56')
  gateAndDrop(ref, '#56')
}

// ── #125 吸附降维 → 算法 ───────────────────────────────────────────────
log('\n── #125 算法与数据结构 → 吸附降维到「算法」 ──')
{
  const ref = 'n_9hr0nvvv'
  const target = 'theory_domain_algorithms'
  const recs = byRef(ref)
  if (recs.length !== 1) throw new Error(`#125: ${ref} 命中 ${recs.length} 个树条目`)
  const tRecs = byRef(target)
  if (tRecs.length !== 1) throw new Error(`#125: 目标「算法」命中 ${tRecs.length} 个树条目`)
  const body = shellContent(pool[ref])
  log(`  原正文 ${body.length} 字：${body.replace(/\n/g, ' ')}`)
  addSupplementTab(tRecs[0].node, { id: 'asplit:s125:adsorbed', label: '算法与数据结构（吸附）', content: body, tags: pool[ref].tags ?? [] })
  addedSupplements.push(`算法 ← #125（${body.length} 字）`)
  log(`  正文并入「算法」supplement（${body.length} 字）`)
  unloadTreeEntry(recs[0], '#125')
  gateAndDrop(ref, '#125')
}

// ── #135 吸附降维 → 微服务架构 ─────────────────────────────────────────
log('\n── #135 微服务架构与网络调用 → 吸附降维到「微服务架构」 ──')
{
  const ref = 'k_vault_arch_micro_net'
  const target = 'k_1786141806535_l28y6f'
  const recs = byRef(ref)
  if (recs.length !== 1) throw new Error(`#135: ${ref} 命中 ${recs.length} 个树条目`)
  const tRecs = byRef(target)
  if (tRecs.length !== 1) throw new Error(`#135: 目标「微服务架构」命中 ${tRecs.length} 个树条目`)
  const body = shellContent(pool[ref])
  log(`  原正文 ${body.length} 字：${body.replace(/\n/g, ' ')}`)
  addSupplementTab(tRecs[0].node, { id: 'asplit:s135:adsorbed', label: '微服务架构与网络调用（吸附）', content: body, tags: pool[ref].tags ?? [] })
  addedSupplements.push(`微服务架构 ← #135（${body.length} 字）`)
  log(`  正文并入「微服务架构」supplement（${body.length} 字）`)
  unloadTreeEntry(recs[0], '#135')
  gateAndDrop(ref, '#135')
}

// ── #120 / #122 / #123 豁免保留（不动数据）─────────────────────────────
log('\n── #120 / #122 / #123 → 豁免保留（数据零改动）──')
for (const [no, ref] of [[120, 'k_1784348625706_s595yo'], [122, 'k_acm2012_artificial_intelligence_knowledge_representation_reasoning'], [123, 'k_acm2012_artificial_intelligence_automated_planning_scheduling']]) {
  const m = byRef(ref)
  log(`  #${no}「${pool[ref].label}」保留：池✓ 树挂载 ${m.length} —— 豁免名单见 scripts/scan-tree-violations.mjs FALSE_POSITIVE_A`)
}

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条 / 题 ${questions.length} 张`)
log(`卸树 ${unloaded.size} 条 · 退池 ${dropped.length} 个（${dropped.join(' , ')}）· 吸附 supplement ${addedSupplements.length} 个`)
for (const a of addedSupplements) log(`  · ${a}`)

if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
