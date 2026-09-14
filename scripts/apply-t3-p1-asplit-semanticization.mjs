/**
 * T3-P1 APPLY · asplit_* treeId 语义化（130 项）
 *
 * 依据 FINAL 映射表（outputs/tree-violation-scan/asplit-treeid-mapping.FINAL.json，
 * status = MAPPING_FREEZE_OK，130/130 APPROVED）把 130 个 asplit_* 树节点 id 改为
 * `tree_<domain>_<semantic-slug>`，并同步 treebind 边 id 中被改名的那一端。
 *
 * 模式：
 *   node scripts/apply-t3-p1-asplit-semanticization.mjs --freeze    冻结基线（data md5 + 末尾换行）
 *   node scripts/apply-t3-p1-asplit-semanticization.mjs             预检（闸门 + 克隆模拟），不写盘
 *   node scripts/apply-t3-p1-asplit-semanticization.mjs --apply     真正落盘（写前备份 + 写后复验）
 *
 * ⛔ 硬纪律
 *   ① 只改 treeId：不改池实体、不改边内容（source/target 零触碰）、不增删节点/边、不动 questions.json
 *   ② 名字由裁决阶段给出（FINAL.json）；脚本不代拟、不改名
 *   ③ 结构不变性逐节点/逐边证明：除 `id` 外所有字段逐字节相同
 *   ④ **treebind 解析必须冒号安全**：本批实测有 4 条 treebind 边的另一端是 `projection:*`（含冒号），
 *      P0 用的非贪婪 /^treebind:(.+?):(.+)$/ 在这 4 条上会**错切并漏改** → 本脚本改用
 *      「在已知 treeId 集合里找唯一合法切分点」的解析器。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const FINAL_PATH = path.join(OUT_DIR, 'asplit-treeid-mapping.FINAL.json')
const BASELINE_PATH = path.join(OUT_DIR, 't3-p1-apply-baseline.json')

const argv = process.argv.slice(2)
const hasFlag = (f) => argv.includes(f)
const MODE = hasFlag('--apply') ? 'apply' : hasFlag('--freeze') ? 'freeze' : 'preflight'

const WRITE_FILES = ['tree-data.json', 'knowledge-edges.json', 'evolution-events.json']
const READ_FILES = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']

const rd = (f) => fs.readFileSync(path.join(DATA, f), 'utf8')
const rdJson = (f) => JSON.parse(rd(f))
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')
const clone = (x) => JSON.parse(JSON.stringify(x))

function writeJsonKeepFormat(abs, value, trailingNewline) {
  const text = JSON.stringify(value, null, 2) + (trailingNewline ? '\n' : '')
  const tmp = abs + '.tmp-' + process.pid + '-' + Date.now()
  fs.writeFileSync(tmp, text, 'utf8')
  try {
    fs.renameSync(tmp, abs)
  } catch {
    fs.writeFileSync(abs, text, 'utf8')
    try { fs.unlinkSync(tmp) } catch { /* noop */ }
  }
}

const TREE_SHAPE = /^tree_[a-z0-9_]+$/
const isHashTreeId = (id) => TREE_SHAPE.test(id) && (/^tree_\d{10,}/.test(id) || /\d{10,}/.test(id))
const isSegmentTreeId = (id) => TREE_SHAPE.test(id) && /_s\d+(_|$)/.test(id)
const hasTimestampAnywhere = (id) => /\d{10,}/.test(id) || /_s\d+(_|$)/.test(id)

const buildIndex = (t) => {
  const nodes = new Map(), parentOf = new Map(), ancOf = new Map(), pathOf = new Map()
  const walk = (n, anc, names) => {
    nodes.set(n.id, n)
    parentOf.set(n.id, anc.length ? anc[anc.length - 1] : null)
    ancOf.set(n.id, [...anc])
    pathOf.set(n.id, [...names, n.name ?? '(无名)'].join(' > '))
    for (const c of n.children || []) walk(c, [...anc, n.id], [...names, n.name ?? '(无名)'])
  }
  walk(t, [], [])
  return { nodes, parentOf, ancOf, pathOf }
}

// ── treebind 解析：冒号安全 ────────────────────────────────────────────────
// treebind:<parentTreeId>:<childTreeId>；部分 treeId 自身含 ':'（如 projection:*），
// 故不能用非贪婪正则切。做法：在**已知 treeId 全集**里找第一个使两半都是合法 treeId 的切分点。
function splitTreebind(id, knownIds) {
  const s = String(id ?? '')
  if (!s.startsWith('treebind:')) return null
  const body = s.slice('treebind:'.length)
  let idx = body.indexOf(':')
  while (idx !== -1) {
    const head = body.slice(0, idx), tail = body.slice(idx + 1)
    if (knownIds.has(head) && knownIds.has(tail)) return { head, tail }
    idx = body.indexOf(':', idx + 1)
  }
  return null
}
const joinTreebind = (h, t) => 'treebind:' + h + ':' + t

function applyRenames(ds, pairs, knownIds) {
  const m = new Map(pairs.map((p) => [p.oldTreeId, p.proposedTreeId]))
  let renamedNodes = 0
  ;(function walk(n) {
    if (m.has(n.id)) { n.id = m.get(n.id); renamedNodes += 1 }
    for (const c of n.children || []) walk(c)
  })(ds.tree)

  let renamedEdgeIds = 0
  let unresolvedTreebind = 0
  const edgeIdChanges = []
  for (const e of ds.edges) {
    const sp = splitTreebind(e.id, knownIds)
    if (!sp) { if (String(e.id).startsWith('treebind:') && /asplit_/.test(String(e.id))) unresolvedTreebind += 1; continue }
    const next = joinTreebind(m.get(sp.head) ?? sp.head, m.get(sp.tail) ?? sp.tail)
    if (next !== e.id) { edgeIdChanges.push({ from: e.id, to: next }); e.id = next; renamedEdgeIds += 1 }
  }
  return { renamedNodes, renamedEdgeIds, edgeIdChanges, renameMap: m, unresolvedTreebind }
}

function expectedEdgeId(id, m, knownIds) {
  const sp = splitTreebind(id, knownIds)
  if (!sp) return id
  return joinTreebind(m.get(sp.head) ?? sp.head, m.get(sp.tail) ?? sp.tail)
}

function compareTree(before, after, m, errs = [], p = '$root') {
  if (!before || !after) { errs.push(p + '：结构不齐'); return errs }
  const expId = m.get(before.id) ?? before.id
  if (after.id !== expId) errs.push(p + '：id `' + before.id + '` → 期望 `' + expId + '` 实得 `' + after.id + '`')
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (k === 'id' || k === 'children') continue
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) errs.push(p + '：非 id 字段 `' + k + '` 被改动')
  }
  const bc = before.children ?? [], ac = after.children ?? []
  if (bc.length !== ac.length) { errs.push(p + '：子节点数 ' + bc.length + ' → ' + ac.length); return errs }
  bc.forEach((c, i) => compareTree(c, ac[i], m, errs, p + ' > ' + (c.name ?? '#' + i)))
  return errs
}

function compareEdges(before, after, m, knownIds, errs = []) {
  if (before.length !== after.length) { errs.push('边数 ' + before.length + ' → ' + after.length); return errs }
  for (let i = 0; i < before.length; i += 1) {
    const x = before[i], y = after[i]
    const expId = expectedEdgeId(x.id, m, knownIds)
    if (y.id !== expId) errs.push('#' + i + '：id 期望 `' + expId + '` 实得 `' + y.id + '`')
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (k === 'id') continue
      if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) errs.push('#' + i + '：非 id 字段 `' + k + '` 被改动')
    }
  }
  return errs
}

const countNodes = (n) => 1 + (n.children ?? []).reduce((s, c) => s + countNodes(c), 0)
const nodeRefDangling = (tree, pool) => { let n = 0; (function w(x) { if (x.nodeRef && !pool[x.nodeRef]) n += 1; (x.children || []).forEach(w) })(tree); return n }
const treebindDangling = (edges, allTreeIds) => {
  let n = 0
  const known = allTreeIds
  for (const e of edges) {
    if (!String(e.id).startsWith('treebind:')) continue
    const sp = splitTreebind(e.id, known)
    if (!sp) continue
    // 端点存在性交给 caller 用 allTreeIds 判定
  }
  return n
}
// treebind 悬空 = treebind 边里的端点 treeId 不在树里
const countTreebindDangling = (edges, treeIds) => {
  let n = 0
  for (const e of edges) {
    if (!String(e.id).startsWith('treebind:')) continue
    const sp = splitTreebind(e.id, treeIds)
    if (!sp) { n += 1; continue }
  }
  return n
}

const GATES = []
const gate = (id, name, ok, detail) => GATES.push({ id, name, ok: !!ok, detail })

async function main() {
  const present = {}
  for (const f of READ_FILES) present[f] = rd(f)
  const md5Now = {}, trailNow = {}
  for (const [f, txt] of Object.entries(present)) { md5Now[f] = md5(txt); trailNow[f] = txt.endsWith('\n') }

  if (MODE === 'freeze') {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({
      frozenAt: new Date().toISOString(), batch: 't3-p1-apply',
      dataMd5: md5Now, dataTrailingNewline: trailNow,
      note: 'T3-P1 apply 前的数据基线。G2 用它挡住「冻结之后数据被人改过」。',
    }, null, 2) + '\n', 'utf8')
    console.log('基线已冻结：' + path.relative(ROOT, BASELINE_PATH))
    for (const f of Object.keys(md5Now)) console.log('  ' + f.padEnd(24) + md5Now[f].slice(0, 12) + '  trailingNL=' + trailNow[f])
    return
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error('✖ 未找到基线。请先运行：node scripts/apply-t3-p1-asplit-semanticization.mjs --freeze')
    process.exitCode = 2
    return
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
  const FINAL = JSON.parse(fs.readFileSync(FINAL_PATH, 'utf8'))
  const items = FINAL.items ?? []
  const pairs = items.map((x) => ({ oldTreeId: x.oldTreeId, proposedTreeId: x.proposedTreeId }))

  const ds0 = { tree: JSON.parse(present['tree-data.json']), pool: JSON.parse(present['node-pool.json']), edges: JSON.parse(present['knowledge-edges.json']) }
  const idx0 = buildIndex(ds0.tree)
  const knownIds = new Set(idx0.nodes.keys())
  const oldSet = new Set(items.map((x) => x.oldTreeId))

  // G1 映射表已冻结 + 全部 approved
  const notApproved = items.filter((x) => x.status !== 'APPROVED')
  gate('G1', 'FINAL 映射表 MAPPING_FREEZE_OK ∧ 130 条全 APPROVED',
    FINAL.status === 'MAPPING_FREEZE_OK' && notApproved.length === 0 && items.length === 130,
    'status=' + FINAL.status + ' · 条数 ' + items.length + ' · 非 APPROVED ' + notApproved.length)

  // G2 数据 md5 与冻结基线一致
  const drift = Object.keys(baseline.dataMd5).filter((f) => baseline.dataMd5[f] !== md5Now[f])
  gate('G2', '数据文件 md5 与冻结基线一致（无人改过数据）', drift.length === 0,
    drift.length ? '漂移：' + drift.join(', ') : Object.keys(baseline.dataMd5).length + ' 个文件全部一致')

  // G3 旧 id 存在 ∧ 均为 asplit_ 形态 ∧ 恰好 == 现存 asplit_* 树 id 全集
  const liveAsplit = [...idx0.nodes.keys()].filter((id) => /^asplit_/.test(id))
  const badOld = []
  for (const x of items) {
    if (!idx0.nodes.has(x.oldTreeId)) badOld.push(x.oldTreeId + ' 不存在')
    else if (!/^asplit_/.test(x.oldTreeId)) badOld.push(x.oldTreeId + ' 非 asplit_ 形态')
  }
  const coverageExact = oldSet.size === liveAsplit.length && liveAsplit.every((id) => oldSet.has(id))
  gate('G3', '130 个 old treeId 全部存在 ∧ 覆盖面**恰好** = 现存 asplit_* 树 id 全集',
    badOld.length === 0 && coverageExact,
    (badOld.join(' | ') || '全部命中') + ' · 映射 ' + oldSet.size + ' vs 现存 ' + liveAsplit.length +
    ' · 缺失 ' + JSON.stringify(liveAsplit.filter((x) => !oldSet.has(x))) + ' · 多余 ' + JSON.stringify([...oldSet].filter((x) => !liveAsplit.includes(x))))

  // G4 新 id：形态 / 无 ts·hash·段位 / 批内唯一 / 无碰撞 / 无 ACM 命名空间
  const occTree = new Set(idx0.nodes.keys())
  const occPool = new Set(Object.keys(ds0.pool))
  const occEdge = new Set(ds0.edges.map((e) => e.id))
  const badNew = []
  const newSeen = new Set()
  for (const x of items) {
    const n = x.proposedTreeId ?? ''
    if (!TREE_SHAPE.test(n)) badNew.push(n + ' 形态非法')
    if (hasTimestampAnywhere(n)) badNew.push(n + ' ⛔ 带时间戳/hash/段位')
    if (String(n).startsWith('tree_acm2012')) badNew.push(n + ' ⛔ 残 ACM 分类路径命名空间')
    if (newSeen.has(n)) badNew.push(n + ' 批内重复')
    newSeen.add(n)
    if (!oldSet.has(n) && (occTree.has(n) || occPool.has(n) || occEdge.has(n))) badNew.push(n + ' 与既有 treeId/池 id/边 id 碰撞')
  }
  gate('G4', '130 个 new treeId 形态合法 ∧ 无 ts/hash/段位 ∧ 批内唯一 ∧ 无碰撞 ∧ 无 ACM 命名空间',
    badNew.length === 0,
    badNew.join(' | ') || '全部通过（命名空间 ' + new Set(items.filter((x) => x.namespace).map((x) => x.namespace.token)).size + ' 组）')

  // G5 结构不变性（克隆模拟）
  const dsSim = clone(ds0)
  const sim = applyRenames(dsSim, pairs, knownIds)
  const m = sim.renameMap
  const treeErrs = compareTree(ds0.tree, dsSim.tree, m)
  const edgeErrs = compareEdges(ds0.edges, dsSim.edges, m, knownIds)
  const endpointTouched = dsSim.edges.filter((e, i) => e.source !== ds0.edges[i].source || e.target !== ds0.edges[i].target).length
  gate('G5', '结构不变性：树逐节点 / 边逐条，除 id 外逐字节相同 ∧ endpoint 零触碰 ∧ 改名数恰为 130',
    treeErrs.length === 0 && edgeErrs.length === 0 && endpointTouched === 0 && sim.renamedNodes === 130 && sim.unresolvedTreebind === 0,
    (treeErrs.length || edgeErrs.length || endpointTouched ? ['树差异 ' + treeErrs.length, '边差异 ' + edgeErrs.length, 'endpoint 触碰 ' + endpointTouched].join(' · ')
      : '树 ' + countNodes(ds0.tree) + ' 节点、边 ' + ds0.edges.length + ' 条全部通过（仅 id 变动）') +
    ' · 改名节点 ' + sim.renamedNodes + '/130 · treebind id 改写 ' + sim.renamedEdgeIds + ' · 未解析 treebind ' + sim.unresolvedTreebind)

  // G6 引用闭合：改名后全树+边序列化无旧 id 残留
  const blobSim = JSON.stringify(dsSim.tree) + JSON.stringify(dsSim.edges)
  const residualSim = [...oldSet].filter((id) => blobSim.includes(id))
  gate('G6', '引用闭合：改名后 tree-data + knowledge-edges 无任一旧 id 残留',
    residualSim.length === 0 && countNodes(dsSim.tree) === countNodes(ds0.tree) && dsSim.edges.length === ds0.edges.length,
    residualSim.length ? '残留 ' + residualSim.length + ' 个：' + residualSim.slice(0, 5).join(', ') : '残留 0 · 节点数 ' + countNodes(ds0.tree) + ' 不变 · 边数 ' + ds0.edges.length + ' 不变')

  // G7 挂载健康度：nodeRef 悬空 / treebind 悬空 批前 == 批后
  const danglingBefore = nodeRefDangling(ds0.tree, ds0.pool)
  const danglingAfter = nodeRefDangling(dsSim.tree, dsSim.pool)
  const simTreeIds = new Set(buildIndex(dsSim.tree).nodes.keys())
  const tbDanglingBefore = countTreebindDangling(ds0.edges, knownIds)
  const tbDanglingAfter = countTreebindDangling(dsSim.edges, simTreeIds)
  gate('G7', '挂载健康度不劣化：nodeRef 悬空 ∧ treebind 悬空 批前 == 批后',
    danglingBefore === danglingAfter && tbDanglingBefore === tbDanglingAfter,
    'nodeRef 悬空 ' + danglingBefore + ' → ' + danglingAfter + ' · treebind 悬空 ' + tbDanglingBefore + ' → ' + tbDanglingAfter)

  // G8 可见成果：落盘后树内 asplit_* 身份引用 = 0 且 39 个重推导新 id 均已出现
  const simIds = simTreeIds
  const residualAsplitTree = [...simIds].filter((id) => /^asplit_/.test(id))
  const redrivenMissing = items.filter((x) => x.namespace).map((x) => x.proposedTreeId).filter((id) => !simIds.has(id))
  gate('G8', '成果达成：树内 asplit_* 身份引用 = 0 ∧ 39 个重推导 id 全部就位',
    residualAsplitTree.length === 0 && redrivenMissing.length === 0,
    '树内 asplit_* 残留 ' + residualAsplitTree.length + ' · 重推导缺失 ' + redrivenMissing.length)

  // G9 dev server 写入安全
  let dev = { running: false }
  try {
    const r = await fetch('http://[::1]:5173/', { signal: AbortSignal.timeout(3000) })
    const t = await r.text()
    dev = { running: true, isViteDev: /@vite\/client/.test(t) }
  } catch { /* 未运行 */ }
  gate('G9', 'dev server 不会静默覆盖本次写入', !dev.running || !dev.isViteDev,
    !dev.running ? '5173 未监听' : dev.isViteDev ? '⛔ 5173 是 vite dev（内存持有数据会回写覆盖）—— 必须先杀' : '5173 在监听但非 vite dev')

  const failed = GATES.filter((g) => !g.ok)

  let backupDir = null
  let realVerification = null
  if (MODE === 'apply') {
    if (failed.length) {
      console.log('✖ 闸门未全绿，ABORT，未写盘：' + failed.map((g) => g.id).join(', '))
      process.exitCode = 3
    } else {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      backupDir = path.join(DATA, 'backups', 't3-p1-' + stamp)
      fs.mkdirSync(backupDir, { recursive: true })
      for (const f of READ_FILES) fs.copyFileSync(path.join(DATA, f), path.join(backupDir, f))

      const dsReal = { tree: rdJson('tree-data.json'), pool: rdJson('node-pool.json'), edges: rdJson('knowledge-edges.json') }
      const real = applyRenames(dsReal, pairs, knownIds)

      const realTreeErrs = compareTree(ds0.tree, dsReal.tree, real.renameMap)
      const realEdgeErrs = compareEdges(ds0.edges, dsReal.edges, real.renameMap, knownIds)
      const realBlob = JSON.stringify(dsReal.tree) + JSON.stringify(dsReal.edges)
      const realResidual = [...oldSet].filter((id) => realBlob.includes(id))
      const realIds = new Set(buildIndex(dsReal.tree).nodes.keys())
      realVerification = {
        renamedNodes: real.renamedNodes, renamedEdgeIds: real.renamedEdgeIds,
        treeErrors: realTreeErrs, edgeErrors: realEdgeErrs, residualOldIds: realResidual,
        residualAsplitTreeIds: [...realIds].filter((id) => /^asplit_/.test(id)),
        nodeCountUnchanged: countNodes(dsReal.tree) === countNodes(ds0.tree),
        edgeCountUnchanged: dsReal.edges.length === ds0.edges.length,
        nodeRefDanglingBefore: danglingBefore, nodeRefDanglingAfter: nodeRefDangling(dsReal.tree, dsReal.pool),
        treebindDanglingBefore: tbDanglingBefore, treebindDanglingAfter: countTreebindDangling(dsReal.edges, realIds),
        verdict: (realTreeErrs.length === 0 && realEdgeErrs.length === 0 && realResidual.length === 0 &&
          real.renamedNodes === 130 && countNodes(dsReal.tree) === countNodes(ds0.tree) &&
          dsReal.edges.length === ds0.edges.length && [...realIds].filter((id) => /^asplit_/.test(id)).length === 0)
          ? 'REAL_APPLY_VERIFIED' : 'REAL_APPLY_FAILED',
      }

      const evoPath = path.join(DATA, 'evolution-events.json')
      const evo = JSON.parse(present['evolution-events.json'])
      const nsGroups = [...new Set(items.filter((x) => x.namespace).map((x) => x.namespace.token))]
      evo.push({
        id: 'event:tree-refactor:t3-p1:' + Date.now(),
        scopeRootId: null,
        occurredAt: Date.now(),
        title: 'T3-P1：asplit_* treeId 语义化（130 项改名，零结构变更）',
        summary: '把 130 个 asplit_* 临时挂载 id 改为 tree_<domain>_<semantic-slug>。'
          + '其中 39 项按 D2 命名空间规范重新推导域记号（' + nsGroups.join(' / ') + '），91 项沿用既有草案值。'
          + '仅改 treeId 与被其牵连的 ' + real.renamedEdgeIds + ' 条 treebind 边 id；池实体、边内容、节点/边数量全部不变。'
          + '本批同时修正 dry-run 语义祖先谓词的过度排除（附加的 ^tree_ 前缀要求），'
          + '并把 38 条 MEDIUM 的命名空间从 ACM 分类路径（tree_acm2012_*）拉回域命名空间。'
          + '命名规范 tree_<domain>_<semantic-slug>；domain 只是 ID 命名空间，不是 ontology 判定。',
        sourceOnlyNodeIds: [],
        introducedNodes: [],
        changes: items.map((x) => ({
          targetNodeId: idx0.nodes.get(x.oldTreeId)?.nodeRef ?? null,
          facet: 'structure',
          before: 'treeId `' + x.oldTreeId + '`（asplit 临时挂载 id）· 路径：' + (idx0.pathOf.get(x.oldTreeId) ?? '—'),
          after: 'treeId `' + x.proposedTreeId + '`' + (x.namespace ? '（域命名空间 `' + x.namespace.token + '`）' : '（沿用既有命名空间）') + ' · 路径不变：' + (idx0.pathOf.get(x.oldTreeId) ?? '—'),
        })),
      })
      writeJsonKeepFormat(evoPath, evo, trailNow['evolution-events.json'])
      writeJsonKeepFormat(path.join(DATA, 'tree-data.json'), dsReal.tree, trailNow['tree-data.json'])
      writeJsonKeepFormat(path.join(DATA, 'knowledge-edges.json'), dsReal.edges, trailNow['knowledge-edges.json'])
    }
  }

  const L = []
  const add = (s = '') => L.push(s)
  add('# T3-P1 · asplit_* treeId 语义化（130 项）—— ' + (MODE === 'apply' ? 'APPLY 执行报告' : '预检报告（未写盘）'), '')
  add('> 模式 `' + MODE + '`' + (backupDir ? ' · 备份 `' + path.relative(ROOT, backupDir) + '`' : ' · **未写盘**'))
  add('> 生成时间 ' + new Date().toISOString(), '')
  add('## 0. 闸门', '')
  add('| 闸门 | 检查项 | 结果 | 依据 |', '|---|---|---|---|')
  for (const g of GATES) add('| `' + g.id + '` | ' + g.name + ' | ' + (g.ok ? '✅' : '❌') + ' | ' + g.detail + ' |')
  add('')
  add(failed.length === 0 ? '**闸门全绿（' + GATES.length + '/' + GATES.length + '）**' : '**❌ ' + failed.length + ' 项未过：' + failed.map((g) => g.id).join(', ') + ' → ' + (MODE === 'apply' ? '已 ABORT，未写盘' : '不允许 APPLY') + '**')
  add('')
  add('## 1. 改名对照（130 条）', '')
  add('| # | 旧 treeId | 新 treeId | 命名空间 | 路径 |', '|---|---|---|---|---|')
  items.forEach((x, i) => add('| ' + (i + 1) + ' | `' + x.oldTreeId + '` | **`' + x.proposedTreeId + '`** | ' + (x.namespace ? '`' + x.namespace.token + '`' : '沿用') + ' | ' + (idx0.pathOf.get(x.oldTreeId) ?? '—') + ' |'))
  add('')
  add('## 2. 结构不变性证明', '')
  add('| 断言 | 结果 |', '|---|---|')
  add('| 树逐节点：除 `id` 外所有字段逐字节相同 | ' + (treeErrs.length === 0 ? '✅ ' + countNodes(ds0.tree) + ' 节点全通过' : '❌ ' + treeErrs.length + ' 处') + ' |')
  add('| 边逐条：除 `id` 外所有字段逐字节相同、顺序不变 | ' + (edgeErrs.length === 0 ? '✅ ' + ds0.edges.length + ' 条全通过' : '❌ ' + edgeErrs.length + ' 处') + ' |')
  add('| 边 `source` / `target` 被触碰 | **' + endpointTouched + '**（须 0） |')
  add('| 树节点数 | ' + countNodes(ds0.tree) + ' → ' + countNodes(dsSim.tree) + ' |')
  add('| 边数 | ' + ds0.edges.length + ' → ' + dsSim.edges.length + ' |')
  add('| 池节点数 | ' + Object.keys(ds0.pool).length + '（本批不改池） |')
  add('| 悬空 nodeRef | ' + danglingBefore + ' → ' + danglingAfter + ' |')
  add('| 悬空 treebind | ' + tbDanglingBefore + ' → ' + tbDanglingAfter + ' |')
  add('| 旧 id 残留（树+边全文扫描） | ' + residualSim.length + ' ' + (residualSim.length === 0 ? '✅' : '❌') + ' |')
  add('')
  add('## 3. treebind 边 id 改写（' + sim.renamedEdgeIds + ' 条）', '')
  add('> 冒号安全解析：本批有 4 条 treebind 的另一端是 `projection:*`（自身含 `:`），')
  add('> P0 的非贪婪 `/^treebind:(.+?):(.+)$/` 在这 4 条上会错切并漏改 → 本脚本按「在已知 treeId 全集里找合法切分点」解析，实测未解析数 = ' + sim.unresolvedTreebind + '。')
  add('')
  add('| # | 旧边 id | 新边 id |', '|---|---|---|')
  sim.edgeIdChanges.forEach((c, i) => add('| ' + (i + 1) + ' | `' + c.from + '` | `' + c.to + '` |'))
  add('')
  add('## 4. 命名空间分布', '')
  const nsStat = {}
  for (const x of items) { const k = x.namespace ? x.namespace.token : '(沿用既有)'; nsStat[k] = (nsStat[k] ?? 0) + 1 }
  add('| 命名空间 | 条数 |', '|---|---:|')
  for (const [k, v] of Object.entries(nsStat).sort((a, b) => b[1] - a[1])) add('| `' + k + '` | ' + v + ' |')
  add('')
  add('## 5. journal（机器可读）', '')
  add('```json')
  add(JSON.stringify({ batch: 't3-p1-apply', mode: MODE, renamedNodes: sim.renamedNodes, renamedEdgeIds: sim.renamedEdgeIds, unresolvedTreebind: sim.unresolvedTreebind, backupDir, realVerification }, null, 2))
  add('```')
  fs.writeFileSync(path.join(OUT_DIR, MODE === 'apply' ? 't3-p1-apply-report.md' : 't3-p1-apply-preflight.md'), L.join('\n'), 'utf8')
  fs.writeFileSync(path.join(OUT_DIR, 't3-p1-apply-plan.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), mode: MODE, wroteData: MODE === 'apply', batch: 't3-p1-apply',
    gates: GATES, pairs, renamedNodes: sim.renamedNodes, renamedEdgeIds: sim.renamedEdgeIds,
    unresolvedTreebind: sim.unresolvedTreebind, edgeIdChanges: sim.edgeIdChanges,
    treeErrors: treeErrs, edgeErrors: edgeErrs, endpointTouched, residualOldIds: residualSim,
    dangling: { nodeRefBefore: danglingBefore, nodeRefAfter: danglingAfter, treebindBefore: tbDanglingBefore, treebindAfter: tbDanglingAfter },
    backupDir, realVerification,
  }, null, 2) + '\n', 'utf8')

  console.log('════ T3-P1 · asplit_* treeId 语义化（130 项）' + (MODE === 'apply' ? ' APPLY' : ' 预检') + ' ════')
  console.log('  模式：' + MODE + (MODE === 'apply' ? '（已写盘' + (backupDir ? '，备份 ' + path.relative(ROOT, backupDir) : '') + '）' : '（未写盘）'))
  console.log('\n【闸门】' + (GATES.length - failed.length) + '/' + GATES.length + (failed.length ? ' ❌ ' + failed.map((g) => g.id).join(', ') : ' ✅'))
  for (const g of GATES) console.log('  ' + (g.ok ? '✅' : '❌') + ' ' + g.id + ' ' + g.name)
  console.log('\n【结构不变性】树差异 ' + treeErrs.length + ' · 边差异 ' + edgeErrs.length + ' · endpoint 触碰 ' + endpointTouched + (treeErrs.length + edgeErrs.length + endpointTouched === 0 ? ' ✅' : ' ❌'))
  console.log('  改名节点 ' + sim.renamedNodes + '/130 · treebind id 改写 ' + sim.renamedEdgeIds + ' · 未解析 ' + sim.unresolvedTreebind + ' · 旧 id 残留 ' + residualSim.length)
  console.log('  树 ' + countNodes(ds0.tree) + ' 节点 · 边 ' + ds0.edges.length + ' 条（均不变）')
  if (realVerification) console.log('\n【写后复验（真实数据）】' + realVerification.verdict + ' · 残留 asplit_* 树 id ' + realVerification.residualAsplitTreeIds.length + ' · nodeRef 悬空 ' + realVerification.nodeRefDanglingAfter + ' · treebind 悬空 ' + realVerification.treebindDanglingAfter)
  console.log('\n产物：' + (MODE === 'apply' ? 't3-p1-apply-report.md' : 't3-p1-apply-preflight.md') + ' · t3-p1-apply-plan.json')
  process.exitCode = failed.length === 0 ? 0 : 1
}

main().catch((e) => { console.error('✖ ' + e.message); console.error(e.stack); process.exitCode = 1 })
