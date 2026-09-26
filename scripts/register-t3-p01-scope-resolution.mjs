/**
 * T3-P0.1 范围变更登记：把 3 条退出 T3 范围的项**登记为已解决**，而不是从清单里删掉。
 *
 * 为什么不是「把脚本里的 133 改成 130」：
 *   宪法纪律 —— **闸门被量化时，不要靠「重定义期望值」让它变绿**。
 *   范围从 133 变成 130 是用户 2026-09-14 裁决的事实结果（T3-P0.1 卸树留池），
 *   必须以**可追溯的登记**形式落到清单里：原始 133 条一条不动，另加解决记录说明「这 3 条因何、何时、
 *   依何裁决退出范围」。这样 `dryrun-t3-asplit-semanticization.mjs` 的范围自校验才能
 *   从「活数据 130 vs 硬编码 133」变成「活数据 = 已登记范围 − 已登记解决集」的真实校验。
 *
 * 幂等：重复执行不会叠加记录。
 *
 * 用法：
 *   node scripts/register-t3-p01-scope-resolution.mjs            # 预检（不写）
 *   node scripts/register-t3-p01-scope-resolution.mjs --apply    # 写清单
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const INV = path.join(ROOT, 'outputs', 'tree-violation-scan', 'asplit-treeid-inventory.json')
const TREE = path.join(ROOT, 'data', 'tree-data.json')
const MODE = process.argv.includes('--apply') ? 'apply' : 'preflight'

const BATCH = 't3-p0.1'
const RESOLVED_AT = '2026-09-14'
const RESOLUTIONS = [
  { treeId: 'asplit_s2_asplit_mysql_tool_backup', ref: 'asplit_mysql_tool_backup', name: '备份恢复工具' },
  { treeId: 'asplit_s2_asplit_mysql_tool_security', ref: 'asplit_mysql_tool_security', name: '安全管理工具' },
  { treeId: 'asplit_s2_asplit_mysql_tool_cluster', ref: 'asplit_mysql_tool_cluster', name: '集群管理工具' },
]
const RATIONALE =
  '挂载点合法性裁决为 C（挂载本身是错误模型）：宿主「服务层」的 treeId 是 projection 导入命名空间 id 且自身 0 字（空壳），' +
  '同层 10 个子跨 4 种 id 规范含 4 个 0 字占位并存在同层语义重复（集群管理工具↔Cluster、备份恢复工具↔MySQL 备份/恢复）；' +
  '该域另有 9,758 字 / 37 节点的规范子树（恢复系统 · 53 条 tree_mysql_instance_*）。' +
  '为此 3 项另造 tree_mysql_* 名字会固化投影宿主并与既有体系永久重复。' +
  '处置 = 卸树留池（解除错误的物理归属，保留知识实体及其维度展示能力）：3 个 tree mount 与 3 条 treebind 边删除，' +
  '池实体与宿主 viewDimensions atom 引用保留。' +
  '依据：维度原子渲染走 nodePool 查表（GridSection.tsx:19 / ChainSection.tsx:19），不依赖树挂载。' +
  '判据来源：outputs/tree-violation-scan/t3-p0.1-mysql-service-layer-verdict.md'

const raw = fs.readFileSync(INV, 'utf8')
const inv = JSON.parse(raw)
const trailingNewline = raw.endsWith('\n')
const tree = JSON.parse(fs.readFileSync(TREE, 'utf8'))
const liveIds = new Set()
;(function w(n) { liveIds.add(n.id); (n.children || []).forEach(w) })(tree)

const findings = []
const problems = []

for (const r of RESOLUTIONS) {
  const e = inv.tier1.find((x) => x.treeId === r.treeId)
  if (!e) { problems.push('清单中找不到 ' + r.treeId); continue }
  const gone = !liveIds.has(r.treeId)
  findings.push({ treeId: r.treeId, name: e.name, inInventory: true, stillInTree: !gone, alreadyResolved: e.resolvedBy === BATCH })
  if (!gone) problems.push('⚠️ ' + r.treeId + ' 仍在树中 —— P0.1 尚未生效，登记会被证伪')
}

console.log('═══ T3-P0.1 范围变更登记 · 模式 ' + MODE + ' ═══')
console.log('')
for (const f of findings) {
  console.log('  ' + (f.stillInTree ? '❌' : '✅') + ' ' + f.name.padEnd(14) + ' ' + f.treeId.padEnd(38) +
    ' 在树中=' + f.stillInTree + ' 已登记=' + f.alreadyResolved)
}
console.log('')

if (problems.length) {
  console.error('⛔ 预检未通过：')
  problems.forEach((p) => console.error('   · ' + p))
  process.exit(1)
}

const beforeTier1 = inv.tier1.length
const resolvedSet = new Set(RESOLUTIONS.map((r) => r.treeId))
const activeCount = inv.tier1.filter((x) => !resolvedSet.has(x.treeId)).length

// 幂等写入
for (const r of RESOLUTIONS) {
  const e = inv.tier1.find((x) => x.treeId === r.treeId)
  e.resolvedBy = BATCH
  e.resolution = 'UNMOUNTED_FROM_TREE_KEEP_IN_POOL'
  e.resolvedAt = RESOLVED_AT
  e.resolutionRationale = RATIONALE
  e.outOfScope = true
}
inv.scopeChange = {
  registeredAt: new Date().toISOString(),
  adjudicatedBy: '用户 2026-09-14 裁决（T3-P0.1 采用「卸树留池」）',
  originalScope: beforeTier1,
  activeScope: activeCount,
  resolvedOutOfScope: RESOLUTIONS.map((r) => r.treeId),
  semantics:
    '这不是「少做三项」。这 3 项被从 **treeId 语义化问题** 转化为正确的 **引用/挂载治理结果**：' +
    '它们是维度展示原子，本就该由宿主 viewDimensions 承载，不需要独立 treeId。' +
    '原 133 条一条未删（保留历史），另加解决记录说明退出范围的原因与依据。',
  evidence: {
    verdict: 'outputs/tree-violation-scan/t3-p0.1-mysql-service-layer-verdict.md',
    applyReport: 'outputs/tree-violation-scan/t3-p0.1-apply-report.md',
    independentVerification: 'outputs/tree-violation-scan/t3-p0.1-independent-verification.md',
  },
  hardLimit: '这是**已登记**的范围变更，不是为了让闸门变绿而改期望值。任何进一步的范围变更必须走同样的登记流程。',
}
if (inv.counts && typeof inv.counts === 'object') {
  inv.counts.tier1 = beforeTier1
  inv.counts.tier1Active = activeCount
  inv.counts.tier1ResolvedOutOfScope = RESOLUTIONS.length
}

console.log('清单 tier1 = ' + beforeTier1 + '（历史，一条未删）')
console.log('其中已登记退出范围 = ' + RESOLUTIONS.length)
console.log('⇒ 生效范围 = ' + activeCount)
console.log('')

if (MODE === 'apply') {
  const text = JSON.stringify(inv, null, 2) + (trailingNewline ? '\n' : '')
  const tmp = INV + '.tmp-' + process.pid
  fs.writeFileSync(tmp, text, 'utf8')
  try { fs.renameSync(tmp, INV) } catch { fs.writeFileSync(INV, text, 'utf8'); try { fs.unlinkSync(tmp) } catch { /* noop */ } }
  console.log('✅ 已写入 ' + path.relative(ROOT, INV).replace(/\\/g, '/'))
} else {
  console.log('（预检模式，未写盘）加 --apply 落盘')
}
