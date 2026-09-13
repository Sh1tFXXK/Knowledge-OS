#!/usr/bin/env node
/**
 * 最终 87 条重构 · 落盘脚本（分批）
 *
 * 依据：用户《最终统一重构规划与爆破 Blueprint》+ 2026-09-14 的四项裁决
 *   裁决 1 · 不写 kind:'problem'（该值不在 kind 域内、src 零引用），改用 tags 表达
 *   裁决 2 · 详解壳融合进既有正身、卸树退池；章节壳纯改名（第二批处理冲突 3 处）
 *   裁决 3 · 边映射受控类型（solves→enables、causes→leads-to）+ 换真实端点
 *   裁决 4 · 第一批只落 E + D1（20 条）
 *
 * 本批（--group=E,D1）动作：
 *   E 组 7 条：正文并入目标正身的 supplement tab → 卸载树条目 → 壳节点退休（archived-redirect）
 *             带孩子者先提级（改写 treebind 边）；#3 就地改名并打 tag「工程问题」
 *   D1 组 13 条：11 个机制状态「卸树但不退池」（spec 引用必须保留），正文镜像到宿主树条目
 *              supplement；aop_flow / bcs_caller 就地改名
 *
 * ⚠️ 口径：**「卸树」≠「删节点」**。11 个 spec 状态节点卸树后必须留在池中，否则机制视图崩。
 * ⚠️ supplement 挂在**树条目**上（池节点 0 例 / 树条目 87 例），不是节点 card。
 * ⚠️ 写数据前必须杀掉 dev server（内存态回写会覆盖外部改动）。
 *
 * 用法（必须在仓库根目录执行）：
 *   node scripts/execute-final-87-reconstruction.mjs                 # dry-run（默认，不写盘）
 *   node scripts/execute-final-87-reconstruction.mjs --apply         # 落盘（自动备份）
 *   node scripts/execute-final-87-reconstruction.mjs --group=E       # 只做 E 组
 *   node scripts/execute-final-87-reconstruction.mjs --group=E,D1
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadAll, saveAll, shellContent, rel } from './shell-fusion/lib.mjs'
import { statLine } from './shell-fusion/a-split/common.mjs'
import { makeCore } from './shell-fusion/final87-core.mjs'

const apply = process.argv.includes('--apply')
const groupArg = (process.argv.find((a) => a.startsWith('--group=')) ?? '--group=E,D1').slice('--group='.length)
const groups = new Set(groupArg.split(',').map((s) => s.trim()).filter(Boolean))
for (const g of groups) {
  if (!['E', 'D1'].includes(g)) {
    console.error(`✗ 组 ${g} 尚未实现（第二批）。本脚本当前只实现 E 与 D1。`)
    process.exit(2)
  }
}

const state = loadAll()
state.events = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'evolution-events.json'), 'utf8'))
const { pool, tree, edges } = state

// 原语已抽到 scripts/shell-fusion/final87-core.mjs，与 batch2 共用一份实现。
// batch1 沿用既有软口径（门一命中只记警告、不阻断落盘）。
const core = makeCore(state)
const { flat, entryOf, journal, errors, warnings, note, unloadTree, promoteChildren, mirrorSupplement, renameInPlace, addTag } = core
const retire = (ref, canonicalRef, opts = {}) => core.retire(ref, canonicalRef, { ...opts, soft: true })


// ── E 组（7 条） ─────────────────────────────────────────────────────────
const E_PLAN = [
  { treeId: 'tree_1785923886640_ydkgnc', ref: 'k_1785923886439_k5so6c', host: 'tree_1784045501055_mkyads', hostRef: 'k_1784045501009_x9izc5', tab: 'final87:e1-jsr133-final', label: 'JSR-133 为何增强 final 语义' },
  { treeId: 'tree_vault_javarabbitmq01mq_j62j4c', ref: 'k_vault_javarabbitmq01mq_j62j4c', host: 'tree_java_fw_rabbitmq', hostRef: 'k_java_fw_rabbitmq', tab: 'final87:e2-mq-why', label: 'MQ 为什么存在' },
  { treeId: 'tree_sharding_when', ref: 'sharding_when', host: 'tree_sharding_overview', hostRef: 'sharding_overview', tab: 'final87:e5-when-sharding', label: '什么时候需要分库分表' },
]
const E_PROMOTE = [
  { treeId: 'tree_1783264901125_rlyl58', ref: 'k_1783264901088_1s02ir', host: 'tree_1783171786694_r8028l', hostRef: 'k_1783171786650_rheusm' },
  { treeId: 'tree_idxf_overview', ref: 'idxf_overview', host: 'tree_1786175188148_3flq6j', hostRef: 'n_0xxb9cqy' },
  { treeId: 'tree_wiki_en_outline_of_databases_s1', ref: 'k_wiki_en_outline_of_databases_s1', host: 'chapter_db_01', hostRef: 'container:chapter_db_01' },
]

if (groups.has('E')) {
  console.log('══ E 组 · 正文并入 + 卸树（7 条）══')
  for (const p of E_PLAN) {
    const src = pool[p.ref]
    if (!src) { errors.push(`E 组：源节点 ${p.ref} 不在池中`); continue }
    const text = shellContent(src)
    if (p.label === '什么时候需要分库分表') {
      mirrorSupplement(p.host, { id: p.tab, label: p.label, content: text, tags: ['工程问题', '分库分表'] })
    } else {
      mirrorSupplement(p.host, { id: p.tab, label: p.label, content: text })
    }
    unloadTree(p.treeId, `E 组：正文已并入 ${p.host}`)
    retire(p.ref, p.hostRef, { excludeTreeIds: [p.treeId], why: 'E 组融合' })
  }
  // E6 前置：题目仍指着待退休的壳（门一会拦），按宪法「relatedNodeId 指向名词本体」重指到正身
  for (const q of [
    { qid: 'q_why_index_fast', from: 'idxf_overview', to: 'n_0xxb9cqy', why: 'E6：问题应指向名词本体 MySQL 索引' },
  ]) {
    const hit = state.questions.find((x) => x.id === q.qid)
    if (!hit) { warnings.push(`重指跳过：题目 ${q.qid} 不存在`); continue }
    if (hit.relatedNodeId !== q.from) { warnings.push(`重指跳过：${q.qid}.relatedNodeId 已是 ${hit.relatedNodeId}`); continue }
    hit.relatedNodeId = q.to
    hit.updatedAt = Date.now()
    note(`题目重指 ${q.qid}.relatedNodeId：${q.from} → ${q.to} — ${q.why}`)
  }
  for (const p of E_PROMOTE) {
    const src = pool[p.ref]
    const text = src ? shellContent(src) : ''
    // 页签名必须描述「并入的正文来自哪个壳」，不能用宿主自己的名字
    // （用宿主名会得到一个与宿主同名、信息量为零的页签）。
    const srcEntry = entryOf(p.treeId)
    const srcLabel = srcEntry ? srcEntry.node.name : (src?.label ?? '并入正文')
    promoteChildren(p.treeId, p.host, `E 组：孩子提级到 ${p.host}`)
    if (text) {
      mirrorSupplement(p.host, { id: `final87:${p.treeId}-body`, label: srcLabel, content: text })
    } else {
      note(`E 组：${p.ref} 正文为空，仅提级孩子，不追加 supplement`)
    }
    retire(p.ref, p.hostRef, { excludeTreeIds: [p.treeId], why: 'E 组融合' })
  }
  // E#3 · 就地改名 + tag（不卸树）
  renameInPlace('tree_sk_perf_bottleneck', '系统性能瓶颈定位', 'E 组：动作短语转实体名')
  addTag('sk_perf_bottleneck', '工程问题')
  note('E#3 的 性能压测--[enables]--> 系统性能瓶颈定位 边延后到第二批（源端点需换成真实节点）')
}

// ── D1 组（13 条） ───────────────────────────────────────────────────────
const D1_STATES = [
  { host: 'tree_aop_flow', refPrefix: 'tree_aop_state_', refs: ['aop_state_proxy_created', 'aop_state_intercepted', 'aop_state_chain_running', 'aop_state_advice_done', 'aop_state_target_invoked'] },
  { host: 'tree_tio_flow', refPrefix: 'tree_tio_state_', refs: ['tio_state_read_syscall', 'tio_state_disk_to_kernel', 'tio_state_kernel_to_user', 'tio_state_write_syscall', 'tio_state_user_to_socket', 'tio_state_socket_to_nic'] },
]

if (groups.has('D1')) {
  console.log('══ D1 组 · 机制状态卸树（11 条）+ 就地改名（2 条）══')
  for (const g of D1_STATES) {
    for (const ref of g.refs) {
      const treeId = 'tree_' + ref
      const hit = entryOf(treeId)
      if (!hit) { warnings.push(`D1：树里找不到 ${treeId}，跳过`); continue }
      const src = pool[ref]
      const text = src ? shellContent(src) : ''
      mirrorSupplement(g.host, { id: `final87:d1-${ref}`, label: hit.node.name, content: text })
      unloadTree(treeId, `D1 组：机制状态归 ${g.host} 承载，节点留池供 spec 渲染`)
      if (!pool[ref]) errors.push(`D1 严重：${ref} 不在池中，spec 会断链`)
    }
  }
  renameInPlace('tree_aop_flow', 'AOP 执行流程', 'D1#12：机制宿主去掉「阶段」形态')
  renameInPlace('tree_bcs_caller', 'getBean 请求调用方', 'D1#13：补全为完整角色名')
  warnings.push('D1#13「getBean 请求调用方」仍含「调用方」→ 扫描器 D 类正则 /调用方/ 仍会命中，本批残余定罪 1 条')
}

// ── 复检与落盘 ───────────────────────────────────────────────────────────
console.log('\n' + statLine(state))

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} 项前置校验未通过，拒绝落盘：`)
  for (const e of errors) console.error('   · ' + e)
  process.exit(1)
}

if (!apply) {
  console.log('\n── dry-run 变更清单（未写盘）──')
  for (const n of journal) console.log('  ' + n)
  if (warnings.length) { console.log('\n── 警告 ──'); for (const w of warnings) console.log('  ! ' + w) }
  console.log('\n（加 --apply 落盘）')
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(ROOT, 'data', 'backups', `final-87-batch1-${stamp}`)
  fs.mkdirSync(dir, { recursive: true })
  for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']) {
    fs.copyFileSync(path.join(ROOT, 'data', f), path.join(dir, f))
  }
  console.log(`\n备份 → ${rel(dir)}`)
  saveAll(state)
  console.log(`已落盘：${journal.length} 项变更`)
  for (const n of journal) console.log('  ' + n)
  if (warnings.length) { console.log('\n── 警告 ──'); for (const w of warnings) console.log('  ! ' + w) }
  fs.writeFileSync(path.join(dir, 'journal.txt'), journal.join('\n') + '\n' + warnings.map((w) => 'WARN ' + w).join('\n'), 'utf8')
}
