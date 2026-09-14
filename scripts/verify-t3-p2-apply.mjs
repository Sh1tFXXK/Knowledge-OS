/**
 * T3-P2 独立验证（**不 import apply 脚本**）
 *
 * 与 apply 脚本**不同引擎**：本脚本不读取 apply 的任何常量/函数，
 * 而是拿批前快照 `data/backups/t3-p2-*` 与当前工作树**逐结构比对、反推**本批到底改了什么，
 * 再把反推结果与 manifest/报告宣称的期望比对。
 *
 * 为什么必须这样：apply 脚本自报「删了 4 个节点 + 4 条边」是**它的声明**，不是证据。
 * 只有从两侧数据反推出来的一致性才算独立证据（宪法 §3.2 的测量工具自偏教训）。
 *
 * 用法：node scripts/verify-t3-p2-apply.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const BACKUP_ROOT = path.join(DATA, 'backups')

const snapDirs = fs.readdirSync(BACKUP_ROOT).filter((d) => d.startsWith('t3-p2-')).sort()
if (!snapDirs.length) { console.error('找不到 t3-p2-* 批前快照'); process.exit(1) }
const SNAP = path.join(BACKUP_ROOT, snapDirs[snapDirs.length - 1])

const rd = (p) => fs.readFileSync(p, 'utf8')
const rj = (p) => JSON.parse(rd(p))
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')

const before = {
  tree: rj(path.join(SNAP, 'tree-data.json')),
  pool: rj(path.join(SNAP, 'node-pool.json')),
  edgesRaw: rj(path.join(SNAP, 'knowledge-edges.json')),
  qs: rd(path.join(SNAP, 'questions.json')),
  evo: rj(path.join(SNAP, 'evolution-events.json')),
}
const after = {
  tree: rj(path.join(DATA, 'tree-data.json')),
  pool: rj(path.join(DATA, 'node-pool.json')),
  edgesRaw: rj(path.join(DATA, 'knowledge-edges.json')),
  qs: rd(path.join(DATA, 'questions.json')),
  evo: rj(path.join(DATA, 'evolution-events.json')),
}
const asEdges = (x) => (Array.isArray(x) ? x : x.edges)
before.edges = asEdges(before.edgesRaw)
after.edges = asEdges(after.edgesRaw)

const flatten = (root) => {
  const out = new Map()
  const rec = (n, parent) => { out.set(n.id, { node: n, parent }); for (const c of n.children || []) rec(c, n) }
  rec(root, null)
  return out
}
const fb = flatten(before.tree)
const fa = flatten(after.tree)

const results = []
const check = (id, name, ok, detail) => results.push({ id, name, ok, detail })

// ── 1. 反推：树里消失了哪些节点 ──────────────────────────────────────────────
const removedTreeIds = [...fb.keys()].filter((id) => !fa.has(id))
const addedTreeIds = [...fa.keys()].filter((id) => !fb.has(id))
check('V1', '树节点净变化 = 恰好 4 个删除 · 0 个新增',
  removedTreeIds.length === 4 && addedTreeIds.length === 0,
  `删 ${removedTreeIds.length}：${removedTreeIds.join(', ')} · 增 ${addedTreeIds.length}`)

// ── 2. 反推：被删的 4 个都是叶子，且父都是同一个 ──────────────────────────────
{
  const allLeaf = removedTreeIds.every((id) => (fb.get(id).node.children || []).length === 0)
  const parents = new Set(removedTreeIds.map((id) => fb.get(id).parent?.id))
  check('V2', '反推：4 个被删节点均为叶子且同父（单父 ⇒ 一次 detachChild 批次）',
    allLeaf && parents.size === 1,
    `均叶子=${allLeaf} · 父集合=${JSON.stringify([...parents])}`)
}

// ── 3. 宿主 children：精确 = 原顺序去掉 4 个 ─────────────────────────────────
let hostId = null
{
  const parents = new Set(removedTreeIds.map((id) => fb.get(id).parent?.id))
  hostId = [...parents][0]
  const beforeKids = (fb.get(hostId)?.node.children || []).map((c) => c.id)
  const afterKids = (fa.get(hostId)?.node.children || []).map((c) => c.id)
  const expected = beforeKids.filter((id) => !removedTreeIds.includes(id))
  check('V3', `宿主 ${hostId}：children ${beforeKids.length}→${afterKids.length}，顺序 = 原顺序去掉 4 个`,
    beforeKids.length === 15 && afterKids.length === 11 && JSON.stringify(afterKids) === JSON.stringify(expected),
    `before=${beforeKids.length} after=${afterKids.length} 顺序保持=${JSON.stringify(afterKids) === JSON.stringify(expected)}`)
}

// ── 4. 反推：边里消失了哪些 ─────────────────────────────────────────────────
const ebMap = new Map(before.edges.map((e) => [e.id, JSON.stringify(e)]))
const eaMap = new Map(after.edges.map((e) => [e.id, JSON.stringify(e)]))
const removedEdges = [...ebMap.keys()].filter((id) => !eaMap.has(id))
const addedEdges = [...eaMap.keys()].filter((id) => !ebMap.has(id))
check('V4', '边净变化 = 恰好 4 条删除 · 0 条新增',
  removedEdges.length === 4 && addedEdges.length === 0,
  `删 ${removedEdges.length}：${removedEdges.join(' | ')} · 增 ${addedEdges.length}`)

// ── 5. 被删的 4 条边必须**逐字可预测**（父端 = 宿主，子端 = 被删树节点）─────────
{
  const predicted = removedTreeIds.map((id) => `treebind:${hostId}:${id}`).sort()
  check('V5', '被删 4 条边 = 逐字可预测的 `treebind:<宿主>:<被删子>`（4/4）',
    JSON.stringify([...removedEdges].sort()) === JSON.stringify(predicted),
    `预测=${predicted.join(' | ')}`)
}

// ── 6. 除被删的 4 条外，其余边逐字节不变（含顺序）─────────────────────────────
{
  const eaSum = md5(JSON.stringify(after.edges))
  const expectedRemaining = before.edges.filter((e) => !removedEdges.includes(e.id))
  check('V6', '其余 4159 条边逐字节不变 ∧ 顺序不变',
    md5(JSON.stringify(expectedRemaining)) === eaSum && after.edges.length === before.edges.length - 4,
    `条数 ${before.edges.length}→${after.edges.length} · 逐字节=${md5(JSON.stringify(expectedRemaining)) === eaSum}`)
}

// ── 7. 树：除被删 4 个外，其余 3212 个节点「除 children 外」逐字节不变 ────────
// ⚠️ 树是**嵌套** JSON：删掉一个子节点会让**宿主及其全部祖先**的序列化都变
//    （它们的 children 里嵌着被改的宿主）。故必须把 children 摘出来单独比，
//    否则会把「宿主+4 个祖先 = 5 个」这种**正常嵌套传播**误判成字段被改。
{
  const strip = (n) => { const c = { ...n }; delete c.children; return JSON.stringify(c) }
  let fieldDiff = []
  for (const [id, rec] of fa) {
    const b = fb.get(id)
    if (!b) { fieldDiff.push(id + '(新增?)'); continue }
    if (strip(b.node) !== strip(rec.node)) fieldDiff.push(id)
  }
  const childListChanged = []
  for (const [id, rec] of fa) {
    const b = fb.get(id)
    if (!b) continue
    const a = (rec.node.children || []).map((c) => c.id)
    const o = (b.node.children || []).map((c) => c.id)
    if (JSON.stringify(a) !== JSON.stringify(o)) childListChanged.push(id)
  }
  check('V7', '其余 3212 个节点「除 children 外」逐字节不变 ∧ children id 列表仅宿主一处变化',
    fieldDiff.length === 0 && childListChanged.length === 1 && childListChanged[0] === hostId,
    `非 children 字段差异节点=${fieldDiff.length}${fieldDiff.length ? '：' + fieldDiff.slice(0, 5).join(', ') : ''} · children 列表变化节点=${JSON.stringify(childListChanged)}（期望恰为 ["${hostId}"]；祖先只因嵌套而序列化变化，不属字段改动）`)
}

// ── 8. 池 / 题库逐字节零改动 ────────────────────────────────────────────────
check('V8', 'node-pool.json 与 questions.json 逐字节零改动',
  md5(rd(path.join(SNAP, 'node-pool.json'))) === md5(rd(path.join(DATA, 'node-pool.json'))) &&
  md5(before.qs) === md5(after.qs),
  `pool=${md5(rd(path.join(SNAP, 'node-pool.json'))) === md5(rd(path.join(DATA, 'node-pool.json')))} · questions=${md5(before.qs) === md5(after.qs)}`)

// ── 9. 池实体保留 ∧ 宿主维度网格 atom **逐字不变** ∧ 4/4 可解析 ───────────────
{
  const refs = ['asplit_mybatis_executor', 'asplit_mybatis_statement_handler', 'asplit_mybatis_parameter_handler', 'asplit_mybatis_resultset_handler']
  const kept = refs.filter((r) => !!after.pool[r])
  const gridOf = (pool) => {
    const d = (pool['k_java_fw_mybatis']?.viewDimensions || []).find((x) => x.id === 'mybatis_plugin')
    const s = d?.sections?.find((x) => x.id === 'mybatis_plugin_grid')
    return s ? s.atoms.map((a) => a.nodeId) : null
  }
  const gb = gridOf(before.pool), ga = gridOf(after.pool)
  const resolvable = (ga || []).filter((a) => !!after.pool[a])
  check('V9', '4 个池实体保留 ∧ 网格 mybatis_plugin_grid atoms 逐字不变 ∧ 4/4 可解析',
    kept.length === 4 && JSON.stringify(gb) === JSON.stringify(ga) && resolvable.length === 4,
    `实体 ${kept.length}/4 · 网格 before=${JSON.stringify(gb)} after=${JSON.stringify(ga)} · 可解析 ${resolvable.length}/4`)
}

// ── 10. 覆盖性：4 个被删树节点的 nodeRef 仍在池中（知识未丢）───────────────────
{
  const orphaned = removedTreeIds
    .map((id) => fb.get(id).node.nodeRef)
    .filter((r) => r && !after.pool[r])
  check('V10', '被删 4 个树节点的 nodeRef 全部仍在池中（知识实体未丢）',
    orphaned.length === 0, `悬空 nodeRef=${orphaned.length}${orphaned.length ? '：' + orphaned.join(', ') : ''}`)
}

// ── 11. 悬空：nodeRef / treebind / atom 三类均不劣化 ─────────────────────────
{
  const danglingRef = (m, pool) => [...m.values()].filter((r) => r.node.nodeRef && !pool[r.node.nodeRef]).length
  const tbUnresolved = (root, edges) => {
    const ids = new Set(flatten(root).keys())
    let n = 0
    for (const e of edges) {
      const s = String(e.id)
      if (!s.startsWith('treebind:')) continue
      const body = s.slice('treebind:'.length)
      let hits = 0
      for (let i = 1; i < body.length - 1; i += 1) if (body[i] === ':' && ids.has(body.slice(0, i)) && ids.has(body.slice(i + 1))) hits += 1
      if (hits === 0) n += 1
    }
    return n
  }
  const atomDangling = (pool) => {
    let n = 0
    for (const p of Object.values(pool)) for (const d of p?.viewDimensions || []) for (const s of d.sections || []) for (const a of s.atoms || []) if (!pool[a.nodeId]) n += 1
    return n
  }
  const dRefB = danglingRef(fb, before.pool), dRefA = danglingRef(fa, after.pool)
  const tbB = tbUnresolved(before.tree, before.edges), tbA = tbUnresolved(after.tree, after.edges)
  const atB = atomDangling(before.pool), atA = atomDangling(after.pool)
  check('V11', '三类悬空均不劣化：nodeRef / treebind / viewDimension atom',
    dRefA <= dRefB && tbA <= tbB && atA <= atB,
    `nodeRef ${dRefB}→${dRefA} · treebind ${tbB}→${tbA} · atom ${atB}→${atA}`)
}

// ── 12. 审计事件 +1，且既有事件逐条不变 ─────────────────────────────────────
{
  const lb = Array.isArray(before.evo) ? before.evo : before.evo.events
  const la = Array.isArray(after.evo) ? after.evo : after.evo.events
  let same = true
  for (let i = 0; i < lb.length; i += 1) if (JSON.stringify(lb[i]) !== JSON.stringify(la[i])) same = false
  const ev = la[la.length - 1]
  const body = JSON.stringify(ev)
  const mentions = ['asplit_mybatis_executor', 'asplit_mybatis_statement_handler', 'asplit_mybatis_parameter_handler', 'asplit_mybatis_resultset_handler']
    .filter((r) => body.includes(r))
  check('V12', `审计事件 +1（${lb.length}→${la.length}）∧ 既有 ${lb.length} 条逐条不变 ∧ 新事件记录 4 个池 ref`,
    la.length === lb.length + 1 && same && ev?.id?.startsWith('event:tree-refactor:t3-p2:') && mentions.length === 4,
    `新事件 id=${ev?.id} · 4 ref 命中=${mentions.length} · 既有不变=${same}`)
}

// ── 13. 被删 treeId 在**非叙述**面 0 残留 ───────────────────────────────────
{
  const stripped = JSON.parse(JSON.stringify(after.evo))
  const l = Array.isArray(stripped) ? stripped : stripped.events
  for (const e of l) for (const c of e.changes || []) { delete c.before; delete c.after }
  const residual = []
  for (const id of removedTreeIds) {
    if (rd(path.join(DATA, 'node-pool.json')).includes(id)) residual.push('pool:' + id)
    if (after.qs.includes(id)) residual.push('questions:' + id)
    if (JSON.stringify(stripped).includes(id)) residual.push('audit(non-narrative):' + id)
  }
  check('V13', '被删 4 个 treeId 在 池/题库/审计叙述外 0 残留',
    residual.length === 0, residual.length ? residual.join(', ') : '0')
}

const pass = results.filter((r) => r.ok).length
console.log('# T3-P2 独立验证')
console.log('')
console.log('- 批前快照：`' + path.relative(ROOT, SNAP).replace(/\\/g, '/') + '`')
console.log('- 方法：**不 import apply 脚本**；由 快照 ↔ 工作树 逐结构比对**反推**本批改动，再与宣称比对')
console.log('')
for (const r of results) console.log((r.ok ? '✅' : '❌') + ' ' + r.id + ' ' + r.name + '\n     ' + r.detail)
console.log('')
console.log('## 结论')
console.log('')
console.log('```')
console.log(pass === results.length ? 'INDEPENDENT_VERIFY_PASS ' + pass + '/' + results.length
  : 'INDEPENDENT_VERIFY_FAIL ' + pass + '/' + results.length)
console.log('```')

const md = ['# T3-P2 独立验证报告', '',
  '- 批前快照：`' + path.relative(ROOT, SNAP).replace(/\\/g, '/') + '`',
  '- 方法：不 import apply 脚本；由 快照 ↔ 工作树 逐结构比对**反推**改动，再与宣称比对',
  '- 生成：' + new Date().toISOString(), '',
  '| # | 断言 | 结果 | 详情 |', '|---|---|---|---|',
  ...results.map((r) => '| ' + r.id + ' | ' + r.name + ' | ' + (r.ok ? '✅ PASS' : '❌ FAIL') + ' | ' + r.detail + ' |'),
  '', '## 结论', '', '```',
  pass === results.length ? 'INDEPENDENT_VERIFY_PASS ' + pass + '/' + results.length
    : 'INDEPENDENT_VERIFY_FAIL ' + pass + '/' + results.length,
  '```', ''].join('\n')
fs.writeFileSync(path.join(ROOT, 'outputs', 'tree-violation-scan', 't3-p2-apply-verification.md'), md, 'utf8')
console.log('')
console.log('报告已落盘：outputs/tree-violation-scan/t3-p2-apply-verification.md')
if (pass !== results.length) process.exitCode = 1
