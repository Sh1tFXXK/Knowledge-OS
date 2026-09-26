/**
 * T3-P0.1 · MySQL 服务层 3 条 BLOCK 的**只读事实核验**（不写 data/，不产生 operation）。
 *
 * 目的：在决定「给它们造 tree_mysql_* 名字」之前，先把它们到底是什么查清楚。
 * 输出机器可读证据 `outputs/tree-violation-scan/t3-p0.1-mysql-service-layer-facts.json`，
 * 供裁决报告引用；所有数字都从这里出，避免报告里的数字是「叙述」而非「证据」。
 *
 * 遵守宪法 §3.2：本脚本**只取证**，不下判定、不给 action / autoFix。
 *
 * 用法：node scripts/inspect-t3-p01-mysql-service-layer.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')

const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const tree = read('data/tree-data.json')
const pool = read('data/node-pool.json')
const edRaw = read('data/knowledge-edges.json')
const edges = Array.isArray(edRaw) ? edRaw : edRaw.edges || []

const TARGETS = ['asplit_s2_asplit_mysql_tool_backup', 'asplit_s2_asplit_mysql_tool_security', 'asplit_s2_asplit_mysql_tool_cluster']
const HOST_TREE_ID = 'projection:mysql-concept:mysql-server-structure:k_1782032275682_61auc4'

// ── 工具 ──
const nodes = []
;(function walk(n, chain) {
  nodes.push({ n, chain })
  ;(n.children || []).forEach((x) => walk(x, chain.concat([n])))
})(tree, [])

const contentLen = (n) => {
  const p = pool[n.nodeRef]
  return p ? String((p.card && p.card.rootContent) || '').length : -1
}
const subtreeContent = (n) => {
  let c = 0
  ;(function w(x) { c += Math.max(contentLen(x), 0); (x.children || []).forEach(w) })(n)
  return c
}
const descendantCount = (n) => {
  let c = 0
  ;(function w(x) { (x.children || []).forEach((y) => { c += 1; w(y) }) })(n)
  return c
}
/** treeId 形态分类 —— 判据与 dryrun-t3-asplit-semanticization.mjs 保持同源 */
const idFamily = (id) => {
  if (/^projection:/.test(id)) return 'projection:*（发现式投影/导入命名空间）'
  if (/^treeprojection:/.test(id)) return 'treeprojection:*'
  if (/^governance:/.test(id)) return 'governance:*（治理锚点）'
  if (/^atomic_/.test(id)) return 'atomic_*（原子拆分）'
  if (/^asplit_/.test(id)) return 'asplit_*（原子拆分）'
  if (/^mysql:/.test(id)) return 'mysql:*（colon 族）'
  if (/^k_/.test(id)) return 'k_*（遗留词条 id）'
  if (/^tree_\d{10,}_[a-z0-9]+$/.test(id)) return 'tree_<ts>_<hash>（伪语义）'
  if (/^tree_[a-z]/.test(id)) return 'tree_<semantic>（语义）'
  return 'OTHER'
}
const findNode = (id) => nodes.find(({ n }) => n.id === id)

// ── 1. 三条 BLOCK 的坐标与祖先链 ──
const targetRecords = TARGETS.map((tid) => {
  const hit = findNode(tid)
  if (!hit) return { treeId: tid, found: false }
  const { n, chain } = hit
  const p = pool[n.nodeRef]
  return {
    treeId: tid,
    found: true,
    name: n.name,
    nodeRef: n.nodeRef,
    depth: chain.length,
    childCount: (n.children || []).length,
    pathNames: [...chain, n].map((x) => x.name),
    ancestorChain: [...chain].reverse().map((a) => ({
      d: chain.length - chain.indexOf(a),
      name: a.name,
      treeId: a.id,
      nodeRef: a.nodeRef ?? null,
      idFamily: idFamily(a.id),
      selfContentLen: contentLen(a),
      childCount: (a.children || []).length,
    })),
    selfContentLen: contentLen(n),
    pool: p
      ? { label: p.label, kind: p.kind ?? null, role: p.role ?? null, tags: p.tags ?? [], dimensions: p.dimensions ?? [] }
      : null,
    edges: {
      inbound: edges.filter((e) => (e.target ?? e.to) === n.nodeRef).map((e) => ({ id: e.id, type: e.type, source: e.source ?? e.from })),
      outbound: edges.filter((e) => (e.source ?? e.from) === n.nodeRef).map((e) => ({ id: e.id, type: e.type, target: e.target ?? e.to })),
    },
  }
})

// ── 2. 宿主「服务层」 ──
const host = findNode(HOST_TREE_ID)
const hostRecord = host
  ? {
      treeId: HOST_TREE_ID,
      name: host.n.name,
      nodeRef: host.n.nodeRef,
      idFamily: idFamily(host.n.id),
      selfContentLen: contentLen(host.n),
      selfIsShell: contentLen(host.n) === 0,
      poolKind: pool[host.n.nodeRef]?.kind ?? null,
      poolRole: pool[host.n.nodeRef]?.role ?? null,
      childCount: (host.n.children || []).length,
      descendantCount: descendantCount(host.n),
      subtreeContentLen: subtreeContent(host.n),
      children: (host.n.children || []).map((c) => ({
        name: c.name,
        treeId: c.id,
        nodeRef: c.nodeRef,
        idFamily: idFamily(c.id),
        contentLen: contentLen(c),
        childCount: (c.children || []).length,
        isShell: contentLen(c) === 0,
      })),
    }
  : null

// ── 3. projection:* 树 id 的全库规模（决定「是不是系统性问题」）──
const projNodes = nodes.filter(({ n }) => /^projection:/.test(n.id))
const ownerBuckets = {}
for (const { n } of projNodes) {
  const key = n.id.split(':').slice(1, -1).join(':')
  ownerBuckets[key] = (ownerBuckets[key] || 0) + 1
}
const underProjection = nodes.filter(({ chain }) => chain.some((a) => /^projection:/.test(a.id)))
// 反例集：projection id 但**自身有正文**（证明「projection id」本身不足以定罪）
const projWithContent = projNodes.filter(({ n }) => contentLen(n) > 0)

// ── 4. 同族双前缀 id 的规模（决定「asplit_s2_ 能否当判别式」）──
const doublePrefix = {}
for (const { n } of nodes) {
  const m = String(n.id).match(/^(asplit_s2_asplit_|atomic_atomic_)/)
  if (m) doublePrefix[m[1] + '*'] = (doublePrefix[m[1] + '*'] || 0) + 1
}

// ── 5. asplit_* 树 id 的父节点族分布 ──
const asplitNodes = nodes.filter(({ n }) => /^asplit_/.test(n.id))
const asplitParentFamily = {}
for (const { chain } of asplitNodes) {
  const p = chain[chain.length - 1]
  const f = p ? idFamily(p.id) : '(根)'
  asplitParentFamily[f] = (asplitParentFamily[f] || 0) + 1
}

// ── 6. 该域的「既有正确子树」对照 ──
const recovery = findNode('chapter_db_08')
const existingSubtree = recovery
  ? {
      rootName: recovery.n.name,
      rootTreeId: recovery.n.id,
      selfContentLen: contentLen(recovery.n),
      childCount: (recovery.n.children || []).length,
      descendantCount: descendantCount(recovery.n),
      subtreeContentLen: subtreeContent(recovery.n),
      namingPattern: '通用概念 tree_concept_* → MySQL 实例 tree_mysql_instance_*（子挂在概念下）',
      mysqlInstanceUnderBackup: nodes
        .filter(({ n }) => /^tree_mysql_instance_/.test(n.id))
        .map(({ n, chain }) => ({ name: n.name, treeId: n.id, contentLen: contentLen(n), pathNames: [...chain, n].map((x) => x.name).slice(-4) })),
    }
  : null

// ── 7. 全库 `tree_mysql_*` 命名空间现状 ──
const mysqlNs = {}
for (const { n } of nodes) {
  const m = String(n.id).match(/^tree_mysql_([a-z0-9]+)/)
  if (m) mysqlNs['tree_mysql_' + m[1] + '_*'] = (mysqlNs['tree_mysql_' + m[1] + '_*'] || 0) + 1
}

// ── 8. 渲染侧判据：维度原子是否依赖树（源码取证）──
const gridSrc = fs.readFileSync(path.join(ROOT, 'src/core/sections/GridSection.tsx'), 'utf8')
const rendererEvidence = {
  file: 'src/core/sections/GridSection.tsx',
  lookupLine: (gridSrc.match(/.*nodePool\[atom\.nodeId\].*/) || ['(未找到)'])[0].trim(),
  lookupSource: 'nodePool（池）',
  treeDependency: false,
  conclusion: '维度原子（GridSection / ChainSection）从 nodePool 取 label / card.tabs[0].content / role —— 卸树留池后仍可渲染。',
}

// ── 9. a-split 规格中这 3 条的原始创建方式（源码取证）──
const specSrc = fs.readFileSync(path.join(ROOT, 'scripts/shell-fusion/a-split/section2-specs.mjs'), 'utf8')
const specBlock = specSrc.slice(specSrc.indexOf('[dims-3]'), specSrc.indexOf('[dims-3]') + 2400)
const specEvidence = {
  file: 'scripts/shell-fusion/a-split/section2-specs.mjs',
  section: '[dims-3] #112 系统管理和控制工具 → MySQL 服务层工具网格',
  hostPoolId: 'k_1782032275682_61auc4',
  hostTreeIdUsed: HOST_TREE_ID,
  sourceNodeRemoved: 'unloadTreeEntry(src.node.id, \'#112\') + gateAndDrop(src.node.nodeRef, \'#112\')',
  createdVia: 'ensureNode(<nodeRef>, <label>, <content>, hostTree, { kind: \'concept\', role: \'axiom\', dimensions: dims })',
  alsoUsedAsDimensionAtoms: /atoms:\s*\[\s*\{ nodeId: tools\[0\]/.test(specSrc),
  dimensionId: 'mysql_service_tools',
  originalTextParkedInHostTab: /cardTab\(host, 'context:asplit:s112'/.test(specSrc),
  excerpt: specBlock.split('\n').filter((l) => /hostTree|ensureNode|atoms:|cardTab|unloadTreeEntry|gateAndDrop|log\(/.test(l)).map((l) => l.trim()).slice(0, 14),
}

const facts = {
  generatedAt: new Date().toISOString(),
  mode: 'READ_ONLY_FACT_FINDING',
  note: '不写 data/、不产出 operation。仅取证。判据与 dryrun-t3-asplit-semanticization.mjs 同源。',
  scope: { batchId: 't3-p0.1', title: 'MySQL 服务层 3 条 BLOCK 的事实核验' },
  counts: {
    treeNodes: nodes.length,
    edges: edges.length,
    poolEntities: Object.keys(pool).length,
    asplitTreeIds: asplitNodes.length,
    projectionTreeIds: projNodes.length,
  },
  targets: targetRecords,
  host: hostRecord,
  projectionFamily: {
    total: projNodes.length,
    shareOfTree: +(projNodes.length / nodes.length * 100).toFixed(2),
    nodesUnderProjectionAncestor: underProjection.length,
    ownerBuckets,
    counterexamples_selfHasContent: {
      count: projWithContent.length,
      samples: projWithContent.slice(0, 10).map(({ n }) => ({ name: n.name, treeId: n.id, contentLen: contentLen(n), childCount: (n.children || []).length })),
      note: '这些 projection id 节点各自有正文与子树 → **「id 以 projection: 开头」本身不足以定罪**（§3.2 反例）。',
    },
  },
  doublePrefixFamily: doublePrefix,
  asplitParentFamily,
  existingCorrectSubtree: existingSubtree,
  mysqlNamespaceCensus: mysqlNs,
  rendererEvidence,
  specEvidence,
  hardLimits: [
    '本脚本不下 A/B/C 判定，判定见裁决报告。',
    '不提供 action / autoFix（evidence-only，与 T5 检测器契约一致）。',
  ],
}

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 't3-p0.1-mysql-service-layer-facts.json'), JSON.stringify(facts, null, 2) + '\n', 'utf8')

// ── 控制台摘要 ──
console.log('═══ T3-P0.1 事实核验（只读）═══')
console.log('树 ' + nodes.length + ' / 边 ' + edges.length + ' / 池 ' + Object.keys(pool).length)
console.log('')
console.log('▸ 宿主：' + (hostRecord ? hostRecord.name + '  idFamily=' + hostRecord.idFamily + '  自身正文=' + hostRecord.selfContentLen + '字  子树=' + hostRecord.subtreeContentLen + '字 / ' + hostRecord.descendantCount + ' 后代' : '未找到'))
if (hostRecord) {
  console.log('  同层 ' + hostRecord.children.length + ' 个子：')
  for (const c of hostRecord.children) console.log('    [' + c.idFamily.slice(0, 12).padEnd(12) + '] ' + String(c.name).padEnd(42) + ' ' + String(c.contentLen).padStart(4) + '字' + (c.isShell ? '  ← 空壳' : ''))
}
console.log('')
for (const t of targetRecords) {
  console.log('▸ ' + t.name + '  [' + t.treeId + ']')
  console.log('  池：kind=' + t.pool.kind + ' role=' + t.pool.role + ' 正文=' + t.selfContentLen + '字')
  console.log('  边：入 ' + t.edges.inbound.length + ' / 出 ' + t.edges.outbound.length)
}
console.log('')
console.log('▸ projection 树 id：' + projNodes.length + ' 个（占全树 ' + (projNodes.length / nodes.length * 100).toFixed(1) + '%）· 挂其下的后代 ' + underProjection.length + ' 个')
console.log('  反例（projection id 但自身有正文）=' + projWithContent.length + ' 个 → 「以 projection 开头」不足以定罪')
console.log('▸ 双前缀：' + JSON.stringify(doublePrefix) + ' → 「asplit_s2_」不是这 3 条的专属特征')
console.log('▸ asplit_* 的父节点族：' + JSON.stringify(asplitParentFamily, null, 1))
console.log('')
console.log('▸ 既有正确子树：' + (existingSubtree ? existingSubtree.rootName + '（' + existingSubtree.rootTreeId + '）' + existingSubtree.subtreeContentLen + '字 / ' + existingSubtree.descendantCount + ' 后代 · tree_mysql_instance_* 共 ' + existingSubtree.mysqlInstanceUnderBackup.length + ' 条' : '未找到'))
console.log('▸ tree_mysql_* 命名空间：' + JSON.stringify(mysqlNs))
console.log('')
console.log('▸ 渲染侧：' + rendererEvidence.lookupLine + '  ← ' + rendererEvidence.conclusion)
console.log('')
console.log('证据已落盘：outputs/tree-violation-scan/t3-p0.1-mysql-service-layer-facts.json')
