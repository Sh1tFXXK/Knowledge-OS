/**
 * A-split 终审裁决执行（用户 2026-09-14 终审）：
 *   #33  JVM 参数与调优（2836 字）  → 转提问卡 q_asplit_33（卸树留池）
 *   #57  Unix 和类 Unix            → 豁免保留（仅入扫描器白名单，数据零改动）
 *   #113 校验和 / checksum          → 豁免保留（仅入扫描器白名单，数据零改动）
 *   #124 复杂度与算法分析（817 字）  → 吸附降维到「算法分析」正身 + 卸树退池
 *   #125 后续：正文补并入「数据结构」正身 theory_domain_data_structures（用户指定唯一本体）
 *   #131 跳过（用户确认）：已由 §四 处置，不重建幽灵卡片
 *
 * ⚠️ 已修正用户表一处笔误（未照字面执行，否则 817 字会被并进自身再删除）：
 *   用户表 #124「并入主节点 算法分析（`k_vault_java01_36x0hj`）」——该 id 正是 #124 自己。
 *   实测父节点「算法分析」正身为 `k_acm2012_algorithms_algorithm_analysis`（34 字，挂「算法」下），
 *   故并入后者；#124 自身池节点按裁决退池。
 *
 * 用法：node scripts/shell-fusion/a-split/section10-final-rulings.mjs [--apply]
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadState, flatten, shellContent, gateScan, statLine, log } from './common.mjs'
import {
  saveAll, addSupplementTab, detachChild, dropTreebindEdgesForTreeIds, treeCount,
} from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges, questions } = state
const flat = () => flatten(tree)
const byRef = (ref) => flat().filter((f) => f.node.nodeRef === ref)

const unloaded = new Set()
const dropped = []
const addedSupplements = []
const createdCards = []
const now = Date.now()

function unloadTreeEntry(rec, tag) {
  detachChild(rec.parent, rec.node.id)
  unloaded.add(rec.node.id)
  const removed = dropTreebindEdgesForTreeIds(edges, [rec.node.id])
  log(`  卸树条目「${rec.node.name}」(${rec.node.id})，删 treebind ${removed} 条`)
}

function gateAndDrop(ref, tag, { keepPool = false } = {}) {
  if (keepPool) { log(`  池节点保留（转提问卡，relatedNodeId 指向自身）：${ref}`); return }
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

log('═══ A-split 终审裁决 ═══')
log(`起始 ${statLine(state)}`)

// ── #33 转提问卡（卸树留池）────────────────────────────────────────────
log('\n── #33 JVM 参数与调优（学习笔记）→ 转提问卡 ──')
{
  const REF = 'k_vault_javajvm04jvm_i15q6w'
  const recs = byRef(REF)
  if (recs.length !== 1) throw new Error(`#33: ${REF} 命中 ${recs.length} 个树条目`)
  if (questions.some((q) => q.id === 'q_asplit_33')) throw new Error('#33: q_asplit_33 已存在')
  const body = shellContent(pool[REF])
  questions.push({
    id: 'q_asplit_33',
    text: 'JVM 常用参数配置与性能调优有哪些实践经验？',
    answered: true,
    kind: 'application',
    difficulty: 'intermediate',
    answer: body,
    relatedNodeId: REF,
    answerSteps: [{ nodeId: REF }],
    createdAt: now,
    updatedAt: now,
  })
  createdCards.push('q_asplit_33')
  log(`  建卡 q_asplit_33：application/intermediate · 绑定 ${REF} · 答案 ${body.length} 字`)
  unloadTreeEntry(recs[0], '#33')
  gateAndDrop(REF, '#33', { keepPool: true })
}

// ── #124 吸附降维 → 算法分析正身 ──────────────────────────────────────
log('\n── #124 复杂度与算法分析 → 吸附降维到「算法分析」 ──')
{
  const REF = 'k_vault_java01_36x0hj'
  const TARGET = 'k_acm2012_algorithms_algorithm_analysis'
  const recs = byRef(REF)
  if (recs.length !== 1) throw new Error(`#124: ${REF} 命中 ${recs.length} 个树条目`)
  const tRecs = byRef(TARGET)
  if (tRecs.length !== 1) throw new Error(`#124: 目标正身 ${TARGET} 命中 ${tRecs.length} 个树条目`)
  if (TARGET === REF) throw new Error('#124: 目标与自身同 id，拒绝执行（会丢正文）')
  const body = shellContent(pool[REF])
  log(`  目标正身「${pool[TARGET].label}」(${TARGET})，现有正文 ${shellContent(pool[TARGET]).length} 字`)
  addSupplementTab(tRecs[0].node, { id: 'asplit:s124:adsorbed', label: '复杂度与算法分析（吸附）', content: body, tags: pool[REF].tags ?? [] })
  addedSupplements.push(`算法分析 ← #124（${body.length} 字）`)
  log(`  正文并入「算法分析」supplement（${body.length} 字）`)
  unloadTreeEntry(recs[0], '#124')
  gateAndDrop(REF, '#124')
}

// ── #125 后续：数据结构正身补并 ────────────────────────────────────────
log('\n── #125 后续：正文补并入「数据结构」正身 theory_domain_data_structures ──')
{
  const TARGET = 'theory_domain_data_structures'
  const tRecs = byRef(TARGET)
  if (tRecs.length !== 1) throw new Error(`#125: ${TARGET} 命中 ${tRecs.length} 个树条目`)
  // n_9hr0nvvv 已在上一轮退池，从本轮之前的安全快照取原文，避免凭记忆重打
  const snap = JSON.parse(fs.readFileSync(path.join('data', 'backups', 'a-split-2026-09-13', 'post-sections-1-2', 'node-pool.json'), 'utf8'))
  const src = snap['n_9hr0nvvv']
  if (!src) throw new Error('#125: 快照中找不到 n_9hr0nvvv')
  const parts = []
  const root = (src.card?.rootContent ?? '').trim()
  if (root) parts.push(root)
  for (const t of src.card?.tabs ?? []) { const c = (t?.content ?? '').trim(); if (c) parts.push(c) }
  const body = parts.join('\n\n')
  log(`  取自快照的 #125 原文：${body.length} 字 —— ${body.replace(/\n/g, ' ')}`)
  if (body.length === 0) throw new Error('#125: 快照正文为空')
  addSupplementTab(tRecs[0].node, { id: 'asplit:s125:adsorbed-ds', label: '算法与数据结构（吸附）', content: body, tags: src.tags ?? [] })
  addedSupplements.push(`数据结构 ← #125 补并（${body.length} 字）`)
  log(`  正文并入「数据结构」supplement（${body.length} 字）`)
}

// ── #57 / #113 豁免 → 扫描器白名单 ─────────────────────────────────────
log('\n── #57 / #113 豁免保留（数据零改动，写入扫描器白名单）──')
{
  const SCANNER = 'scripts/scan-tree-violations.mjs'
  const src = fs.readFileSync(SCANNER, 'utf8')
  const cur = '^(逻辑与 \\(?&&\\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度|服务注册与发现)$'
  // ⚠️ 条目名含斜杠时必须写成 \/，否则会提前终止正则字面量（曾致扫描器 SyntaxError）
  const next = '^(逻辑与 \\(?&&\\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度|服务注册与发现|Unix 和类 Unix|校验和 \\/ checksum)$'
  for (const [no, ref] of [[57, 'k_wiki_en_linker_computing_s8'], [113, 'mysql_glossary_checksum_qnrmvm']]) {
    const m = byRef(ref)
    log(`  #${no}「${m[0]?.node.name}」保留：池✓ 树挂载 ${m.length}`)
  }
  if (src.includes(next)) log('  白名单已是最新，跳过')
  else if (!src.includes(cur)) throw new Error('扫描器豁免正则与预期不一致，需人工确认')
  else if (!apply) log('  （干跑）将把「Unix 和类 Unix」「校验和 / checksum」加入 FALSE_POSITIVE_A')
  else {
    fs.writeFileSync(SCANNER, src.replace(cur, next), 'utf8')
    log('  已加入 FALSE_POSITIVE_A：Unix 和类 Unix · 校验和 / checksum')
  }
}

log('\n── #131（用户确认跳过，不重建幽灵卡片）──')
log('  #131 已由 §四 处置：正文并入 CAP 原理、池节点已退 → 本轮零动作')

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条 / 题 ${questions.length} 张`)
log(`建卡 ${createdCards.length} 张（${createdCards.join(', ')}）· 卸树 ${unloaded.size} 条 · 退池 ${dropped.length} 个（${dropped.join(' , ')}）`)
for (const a of addedSupplements) log(`  吸附：${a}`)

if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
