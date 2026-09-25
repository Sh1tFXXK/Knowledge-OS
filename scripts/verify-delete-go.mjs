/**
 * 独立验证：Go 语言域删除结果（从盘读，不 import apply 脚本）
 *
 *   node scripts/verify-delete-go.mjs
 *
 * 判据全部由「删除前备份」与「当前盘面」反推，不复用 apply 脚本的内存态。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'data')
const BACKUP_DIR = process.argv[2] || fs.readdirSync(path.join(DATA, 'backups'))
  .filter((d) => d.startsWith('delete-golang-domain-')).sort().pop()

if (!BACKUP_DIR) { console.error('找不到备份目录'); process.exit(1) }
const BAK = path.join(DATA, 'backups', BACKUP_DIR)
const readCur = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'))
const readBak = (n) => JSON.parse(fs.readFileSync(path.join(BAK, n), 'utf8'))

const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }

const treeB = readBak('tree-data.json'), treeA = readCur('tree-data.json')
const poolB = readBak('node-pool.json'), poolA = readCur('node-pool.json')
const edgeB = readBak('knowledge-edges.json'), edgeA = readCur('knowledge-edges.json')

console.log(`# 独立验证：Go 域删除（基准 ${BACKUP_DIR}）\n`)

// 从备份重建 Go 域 id 集合（不依赖 apply 脚本）
const GO_TREE_ROOT = 'tree_1786618025853_3qn55e'
let goRoot = null
;(function find(n) { if (goRoot) return; if (n.id === GO_TREE_ROOT) { goRoot = n; return } ;(n.children || []).forEach(find) })(treeB)
if (!goRoot) { console.error('备份里找不到 Go 域根'); process.exit(1) }
const goTrees = [], goPools = new Set()
;(function walk(n) { goTrees.push(n.id); if (n.nodeRef) goPools.add(n.nodeRef); (n.children || []).forEach(walk) })(goRoot)

console.log('══ A. 删除完整性 ══')
const treeIdsA = new Set(); (function walk(n) { treeIdsA.add(n.id); (n.children || []).forEach(walk) })(treeA)
ck(goTrees.every((id) => !treeIdsA.has(id)), `树中 39 个 Go 节点全部消失`, JSON.stringify(goTrees.filter((id) => treeIdsA.has(id))))
ck([...goPools].every((id) => !(id in poolA)), `池中 39 个 Go 节点（含解释卡）全部消失`, JSON.stringify([...goPools].filter((id) => id in poolA)))
const goEdgeIds = edgeB.filter((e) => goPools.has(e.source) || goPools.has(e.target)).map((e) => e.id)
const edgeIdsA = new Set(edgeA.map((e) => e.id))
ck(goEdgeIds.every((id) => !edgeIdsA.has(id)), `39 条 Go 边全部消失`, JSON.stringify(goEdgeIds.filter((id) => edgeIdsA.has(id))))

console.log('\n══ B. 计数守恒 ══')
const cntB = (t) => { let n = 0; (function w(x) { n++; (x.children || []).forEach(w) })(t); return n }
ck(cntB(treeA) === cntB(treeB) - 39, `树 ${cntB(treeB)} → ${cntB(treeA)}（−39）`)
ck(Object.keys(poolA).length === Object.keys(poolB).length - 39, `池 ${Object.keys(poolB).length} → ${Object.keys(poolA).length}（−39）`)
ck(edgeA.length === edgeB.length - 39, `边 ${edgeB.length} → ${edgeA.length}（−39）`)

console.log('\n══ C. 非目标零改动（差集 = 恰好 Go 集合）══')
const poolRemoved = Object.keys(poolB).filter((id) => !(id in poolA))
const poolAdded = Object.keys(poolA).filter((id) => !(id in poolB))
const poolModified = Object.keys(poolA).filter((id) => id in poolB && JSON.stringify(poolA[id]) !== JSON.stringify(poolB[id]))
ck(poolRemoved.length === 39 && poolRemoved.every((id) => goPools.has(id)), `池 removed ≡ Go 集合（${poolRemoved.length}）`)
ck(poolAdded.length === 0, '池 added = 0')
ck(poolModified.length === 0, '池 modified = 0（未触碰任何非 Go 节点）', JSON.stringify(poolModified.slice(0, 5)))

const edgeRemoved = edgeB.filter((e) => !edgeIdsA.has(e.id)).map((e) => e.id)
ck(edgeRemoved.length === 39 && edgeRemoved.every((id) => goEdgeIds.includes(id)), `边 removed ≡ Go 边集合（${edgeRemoved.length}）`)
const edgeModified = edgeA.filter((e) => { const b = edgeB.find((x) => x.id === e.id); return b && JSON.stringify(b) !== JSON.stringify(e) })
ck(edgeModified.length === 0, '边 modified = 0', JSON.stringify(edgeModified.slice(0, 3)))

// 树：逐节点 diff（除 Go 子树外，其余节点 JSON 必须逐字节一致）
const flat = (t) => { const m = new Map(); (function w(n) { m.set(n.id, JSON.stringify({ ...n, children: undefined })); (n.children || []).forEach(w) })(t); return m }
const fB = flat(treeB), fA = flat(treeA)
const treeMod = [...fA].filter(([id, s]) => fB.has(id) && fB.get(id) !== s).map(([id]) => id)
const treeGone = [...fB.keys()].filter((id) => !fA.has(id))
ck(treeGone.length === 39 && treeGone.every((id) => goTrees.includes(id)), `树 removed ≡ Go 集合（${treeGone.length}）`)
ck(treeMod.length === 0, '树 modified = 0（父节点除 children 外零改动）', JSON.stringify(treeMod.slice(0, 5)))

console.log('\n══ D. 引用完整性（口径：本次不得**新增**悬空；存量悬空属既有债）══')
// 端点可达 = 在池中 或 是树 id 或 是虚拟容器/概念 id（container: / concept_ / 等域前缀）
const VIRTUAL = /^(container:|concept_|tree_|demo_)/
const reach = (id, tIds, p) => id in p || tIds.has(id) || VIRTUAL.test(id)
const tIdsB = new Set(); (function w(n) { tIdsB.add(n.id); (n.children || []).forEach(w) })(treeB)
const dangB = new Set(edgeB.filter((e) => !reach(e.source, tIdsB, poolB) || !reach(e.target, tIdsB, poolB)).map((e) => e.id))
const dangA = new Set(edgeA.filter((e) => !reach(e.source, treeIdsA, poolA) || !reach(e.target, treeIdsA, poolA)).map((e) => e.id))
const newDang = [...dangA].filter((id) => !dangB.has(id))
ck(newDang.length === 0, `未新增悬空边（存量悬空 ${dangB.size} → ${dangA.size}）`, JSON.stringify(newDang.slice(0, 3)))
ck(![...dangA].some((id) => goEdgeIds.includes(id)), '悬空集合中不含任何 Go 边')

const refB = [], refA = []
;(function walk(n) { if (n.nodeRef && !(n.nodeRef in poolB)) refB.push(n.id + '→' + n.nodeRef); (n.children || []).forEach(walk) })(treeB)
;(function walk(n) { if (n.nodeRef && !(n.nodeRef in poolA)) refA.push(n.id + '→' + n.nodeRef); (n.children || []).forEach(walk) })(treeA)
const newRef = refA.filter((x) => !refB.includes(x))
ck(newRef.length === 0, `未新增悬空 nodeRef（存量 ${refB.length} → ${refA.length}）`, JSON.stringify(newRef.slice(0, 3)))
if (refA.length) console.log('  · 存量悬空 nodeRef（既有债，非本次引入）: ' + refA.slice(0, 5).join(' | '))
if (dangA.size) console.log('  · 存量悬空边条数（既有债，非本次引入）: ' + dangA.size)
for (const f of ['questions.json', 'evolution-events.json', 'version-chains.json']) {
  ck(fs.readFileSync(path.join(DATA, f), 'utf8') === fs.readFileSync(path.join(BAK, f), 'utf8'), `${f} 逐字节未变`)
}

console.log('\n══ F. Ancestor Gate（口径：提交后夹带的差集 ⊆ Go 删除集）══')
// 本批特殊背景：删除前盘面已含「Go 工具批」在飞漂移（13 新增 + 4 修改，全部属 Go 域）。
// 故 A 闸不比「删除前盘面 ≡ HEAD」，而比：**当前盘面 − HEAD 的差集里，不能有任何非 Go 项**。
//   · added / modified 必须为 0（差集只可能是「移除」）
//   · removed 必须全部属于 Go 集合
const { execFileSync } = await import('node:child_process')
const curTree = readCur('tree-data.json')
const flatOf = (t) => { const m = new Map(); (function w(n) { m.set(n.id, JSON.stringify({ ...n, children: undefined })); (n.children || []).forEach(w) })(t); return m }

for (const f of ['tree-data.json', 'node-pool.json', 'knowledge-edges.json']) {
  const head = execFileSync('git', ['cat-file', 'blob', `HEAD:data/${f}`], { cwd: ROOT, maxBuffer: 1 << 30 })
  const headObj = JSON.parse(head.toString('utf8'))
  const curObj = f === 'tree-data.json' ? curTree : readCur(f)

  if (f === 'knowledge-edges.json') {
    const hIds = new Set(headObj.map((e) => e.id))
    const cIds = new Set(curObj.map((e) => e.id))
    const added = curObj.filter((e) => !hIds.has(e.id))
    const removedEdges = headObj.filter((e) => !cIds.has(e.id))
    // 判据看**端点**而非 id：在飞漂移改过 2 条 Go 边的 treebind id（旧 id 残留在 HEAD），
    // 其端点仍是 Go 节点 ⇒ 仍属 Go 删除集，删除它们是正确的。
    const notGo = removedEdges.filter((e) => !(goPools.has(e.source) || goPools.has(e.target)))
    ck(added.length === 0, `${f}: added = 0`, JSON.stringify(added.slice(0, 3).map((e) => e.id)))
    ck(notGo.length === 0, `${f}: removed(${removedEdges.length}) 端点全部属 Go 节点`, JSON.stringify(notGo.slice(0, 3).map((e) => e.id)))
    continue
  }

  if (f === 'node-pool.json') {
    const hk = Object.keys(headObj), ck2 = Object.keys(curObj)
    const added = ck2.filter((id) => !headObj[id])
    const removed = hk.filter((id) => !curObj[id])
    const modified = ck2.filter((id) => headObj[id] && JSON.stringify(headObj[id]) !== JSON.stringify(curObj[id]))
    ck(added.length === 0, `${f}: added = 0`, JSON.stringify(added.slice(0, 3)))
    ck(modified.length === 0, `${f}: modified = 0（未夹带任何编辑）`, JSON.stringify(modified.slice(0, 3)))
    const notGo = removed.filter((id) => !goPools.has(id))
    ck(notGo.length === 0, `${f}: removed(${removed.length}) 全部属 Go 节点`, JSON.stringify(notGo.slice(0, 3)))
    console.log(`  · HEAD 中含 ${removed.length} 个 Go 节点将被移除（另 ${goPools.size - removed.length} 个属在飞漂移，从未进 HEAD）`)
    continue
  }

  const hf = flatOf(headObj), cf = flatOf(curObj)
  const added = [...cf.keys()].filter((id) => !hf.has(id))
  const removed = [...hf.keys()].filter((id) => !cf.has(id))
  const modified = [...cf].filter(([id, v]) => hf.has(id) && hf.get(id) !== v).map(([id]) => id)
  ck(added.length === 0, `${f}: added = 0`, JSON.stringify(added.slice(0, 3)))
  ck(modified.length === 0, `${f}: modified = 0`, JSON.stringify(modified.slice(0, 3)))
  const notGo = removed.filter((id) => !goTrees.includes(id))
  ck(notGo.length === 0, `${f}: removed(${removed.length}) 全部属 Go 树节点`, JSON.stringify(notGo.slice(0, 3)))
}
// 反向自证：当前盘面必须已无任何 Go 残留（否则就是「删了一半」）
const anyGoLeft = [...goPools].some((id) => id in poolA) || goTrees.some((id) => treeIdsA.has(id))
ck(!anyGoLeft, '当前盘面 Go 域零残留（在飞漂移一并清空）')
if (problems.length) console.log('  ⛔ 差集含非 Go 项 ⇒ 提交会夹带他人改动，须先处理')

console.log('\n══ E. Go 残留文本扫描（报告，不作阻塞）══')
const scan = (obj) => JSON.stringify(obj)
const q = readCur('questions.json')
const goHits = []
for (const [id, n] of Object.entries(poolA)) {
  const s = scan(n)
  if (/goroutine|Golang|Go语言|gofmt|GOMAXPROCS/.test(s)) goHits.push(id)
}
console.log('  池内提及 goroutine/Golang/Go语言 的非 Go 节点: ' + (goHits.length ? goHits.join(', ') : '0'))
console.log('  结论: 上述为内容级提及（如「双重检查锁定」等），非 Go 域归属，保留。')

console.log('\n# 结论: ' + (problems.length ? `❌ ${problems.length} 项不过` : '✅ 全部通过'))
process.exit(problems.length ? 1 : 0)
