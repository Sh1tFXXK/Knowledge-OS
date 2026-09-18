/**
 * asplit_* treeId 语义化批次 —— 只读侦察（登记用，不执行任何变更）。
 *
 * 目的：为后续「treeId semanticization batch」预先回答两个必答问题 ——
 *   Q1 范围到底有多大？（严格 asplit_* vs 邻接家族 *_s<N>_*）
 *   Q2 treeId 被哪些数据文件引用？改名时哪些地方必须同步？
 *
 * treeId 是**挂载身份**，改名会牵动多处引用，因此不能做字符串替换：
 *   - tree-data.json  节点自身的 id / 父节点的 children 关系
 *   - knowledge-edges.json  树绑定边 id 形如 `treebind:<parentTreeId>:<childTreeId>`
 *                           以及可能的 source/target 直接指向 treeId 的其它边
 *   - questions.json / node-pool.json  可能以 treeId 作为键或字段值
 *
 * 用法：node scripts/scan-asplit-treeid-refs.mjs
 * 产出：outputs/tree-violation-scan/asplit-treeid-inventory.json      范围清单（分两层）
 *      outputs/tree-violation-scan/asplit-treeid-ref-matrix.json    引用矩阵
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

// ── 范围 ────────────────────────────────────────────────────────────────
// Tier 1（本批次范围）：treeId 以 asplit_ 开头 —— 就是「按语义拆分」批次留下的临时 id
// Tier 2（邻接家族，**不在**本批次范围）：形如 *_s<数字>_* 的「章节/段位」编号 id
const IN_SCOPE = (id) => String(id).startsWith('asplit_')
const ADJACENT = (id) => !IN_SCOPE(id) && /_s\d+(_|$)/.test(String(id))

const tree = rd(path.join(DATA, 'tree-data.json'))
const pool = rd(path.join(DATA, 'node-pool.json'))

const walk = (root) => {
  const out = []
  ;(function w(n, parent, trail) {
    const p = [...trail, String(n.name ?? '')]
    out.push({ node: n, parent, path: p.join(' > '), depth: p.length - 1 })
    for (const c of n.children || []) w(c, n, p)
  })(root, null, [])
  return out
}
const recs = walk(tree)

const describe = (r) => ({
  treeId: r.node.id,
  name: r.node.name,
  nodeRef: r.node.nodeRef ?? null,
  refExists: Boolean(pool[r.node.nodeRef]),
  refLabel: pool[r.node.nodeRef]?.label ?? null,
  parentTreeId: r.parent?.id ?? null,
  parentName: r.parent?.name ?? null,
  depth: r.depth,
  path: r.path,
  childCount: (r.node.children || []).length,
})

const tier1 = recs.filter((r) => IN_SCOPE(r.node.id)).map(describe)
const tier2 = recs.filter((r) => ADJACENT(r.node.id)).map(describe)

// ── 引用扫描：这些 treeId 出现在哪些文件/位置的哪些形态里 ──────────────
const files = fs.readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'backups')
const ids = new Set([...tier1, ...tier2].map((x) => x.treeId))

const hits = {} // file -> kind -> count
const perId = {} // treeId -> [{file, kind, via}]
const bump = (file, kind, treeId, via) => {
  ;((hits[file] ??= {})[kind] ??= 0), (hits[file][kind] += 1)
  ;(perId[treeId] ??= []).push({ file, kind, via })
}

// treebind 边 id 的固定形态
const TB_RE = /^treebind:([^:]+):(.+)$/

for (const f of files) {
  const raw = fs.readFileSync(path.join(DATA, f), 'utf8')

  // ① 纯文本出现（粗扫，排除 json 键名的引号包裹差异）
  for (const id of ids) {
    let idx = -1
    while ((idx = raw.indexOf(id, idx + 1)) !== -1) bump(f, 'raw-occurrence', id, '字面出现')
  }

  // ② 结构化扫描
  let json
  try { json = JSON.parse(raw) } catch { continue }

  const scanValue = (v, ctx) => {
    if (typeof v === 'string') {
      if (ids.has(v)) bump(f, 'value', v, ctx)
      const m = TB_RE.exec(v)
      if (m) {
        if (ids.has(m[1])) bump(f, 'treebind-parent', m[1], ctx)
        if (ids.has(m[2])) bump(f, 'treebind-child', m[2], ctx)
      }
    } else if (Array.isArray(v)) {
      for (const x of v) scanValue(x, ctx)
    } else if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        if (ids.has(k)) bump(f, 'key', k, ctx)
        scanValue(val, ctx + '.' + k)
      }
    }
  }
  scanValue(json, f.replace(/\.json$/, ''))
}

// ── 汇总输出 ────────────────────────────────────────────────────────────
const num = (o) => o.trimEnd()
console.log('════ asplit_* treeId 语义化批次 · 只读侦察 ════\n')
console.log('【Q1 范围】')
console.log('  Tier 1 本批次范围（asplit_*）:', tier1.length)
console.log('  Tier 2 邻接家族（_s<数字>_，不在本批）:', tier2.length)
console.log('  合计:', tier1.length + tier2.length)

const dupName = Object.entries(
  tier1.reduce((m, x) => ((m[x.name] ??= []).push(x.treeId), m), {}),
).filter(([, v]) => v.length > 1)
console.log('\n  范围内容重名（改名映射必须先消歧）:', dupName.length, '组')
for (const [n, v] of dupName) console.log('    「' + n + '」× ' + v.length + ' → ' + v.join(', '))

const badRef = [...tier1, ...tier2].filter((x) => !x.refExists)
console.log('  引用实体缺失（悬空 nodeRef）:', badRef.length)
for (const x of badRef) console.log('    ' + x.treeId + ' → nodeRef=' + x.nodeRef)

console.log('\n【Q2 引用面】treeId 出现在哪些文件（命中数）')
const fileTotals = Object.entries(hits).map(([f, k]) => [f, Object.values(k).reduce((a, b) => a + b, 0), k])
fileTotals.sort((a, b) => b[1] - a[1])
for (const [f, total, kinds] of fileTotals) {
  console.log('  ' + f.padEnd(28) + total + '   ' + JSON.stringify(kinds))
}

const tbEdgeTotal = (hits['knowledge-edges.json']?.['treebind-parent'] ?? 0) + (hits['knowledge-edges.json']?.['treebind-child'] ?? 0)
console.log('\n  → knowledge-edges.json 中 treebind 端点命中: ' + tbEdgeTotal + ' 处（改名必须同步改这些边 id / 端点）')
const directEdge = (hits['knowledge-edges.json']?.['value'] ?? 0)
console.log('  → knowledge-edges.json 中直接以 treeId 作 source/target 的边: ' + directEdge + ' 处')

console.log('\n【改名波及面（只读预估）】')
console.log('  需要同步写入的落点 = tree-data 节点 id + treebind 边 id（含父/子两端） + 直接引用边')
console.log('  → 绝不可做字符串替换；必须「旧 id → 新 id」映射表驱动，且新 id 全局唯一')

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 'asplit-treeid-inventory.json'),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    note: '只读侦察产物 —— 本批次尚未执行，任何 treeId 均未改动。',
    criteria: { tier1: 'treeId 以 asplit_ 开头（本批范围）', tier2: 'treeId 形如 *_s<数字>_*（邻接家族，不在本批）' },
    counts: { tier1: tier1.length, tier2: tier2.length },
    dupNames: dupName.map(([name, ids]) => ({ name, ids })),
    danglingRefs: badRef.map((x) => ({ treeId: x.treeId, nodeRef: x.nodeRef })),
    tier1,
    tier2,
  }, null, 2) + '\n', 'utf8')

fs.writeFileSync(path.join(OUT_DIR, 'asplit-treeid-ref-matrix.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), hitsByFile: hits, perId }, null, 2) + '\n', 'utf8')

console.log('\n已落盘：')
console.log('  outputs/tree-violation-scan/asplit-treeid-inventory.json')
console.log('  outputs/tree-violation-scan/asplit-treeid-ref-matrix.json')
