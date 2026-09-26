/**
 * 删除 Go 语言域（树 + 池 + 边 + 解释卡内容）
 *
 *   node scripts/apply-delete-go.mjs            # dry-run
 *   node scripts/apply-delete-go.mjs --apply    # 落盘
 *
 * 前置：必须先跑 scripts/precheck-delete-go.mjs，且已备份 data/ 到 data/backups/。
 * 落盘前三铁律：① dev server(5173) 已杀 ② 原子写 ③ 备份已落。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'data')
const APPLY = process.argv.includes('--apply')
const GO_TREE_ROOT = 'tree_1786618025853_3qn55e'

const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'))
function writeJsonAtomic(name, value) {
  const target = path.join(DATA, name)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  try {
    fs.renameSync(tmp, target) // Windows 偶发 EPERM → 退化原地写
  } catch {
    fs.writeFileSync(target, JSON.stringify(value, null, 2), 'utf8')
    try { fs.unlinkSync(tmp) } catch {}
  }
}

const problems = []
const ck = (c, s, a = '') => {
  console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`))
  if (!c) problems.push(s)
}

const tree = readJson('tree-data.json')
const pool = readJson('node-pool.json')
const edges = readJson('knowledge-edges.json')
const questionsBefore = fs.readFileSync(path.join(DATA, 'questions.json'), 'utf8')
const eventsBefore = fs.readFileSync(path.join(DATA, 'evolution-events.json'), 'utf8')
const chainsBefore = fs.readFileSync(path.join(DATA, 'version-chains.json'), 'utf8')

console.log('══ 前置门 ══')

// 1. 定位 Go 域根节点与其父
let goRoot = null
let parent = null
;(function find(n, p) {
  if (goRoot) return
  if (n.id === GO_TREE_ROOT) { goRoot = n; parent = p; return }
  ;(n.children || []).forEach((c) => find(c, n))
})(tree, null)
ck(!!goRoot, 'Go 域根节点存在')
ck(!!parent, 'Go 域根节点有父节点')

// 2. 程序化收集（不手抄）
const goTreeNodes = []
;(function walk(n, d) { goTreeNodes.push({ id: n.id, name: n.name, nodeRef: n.nodeRef || '', d }); (n.children || []).forEach((c) => walk(c, d + 1)) })(goRoot, 0)
const goTreeIds = new Set(goTreeNodes.map((n) => n.id))
const goPoolIds = new Set(goTreeNodes.map((n) => n.nodeRef).filter(Boolean))

ck(goTreeNodes.length === 39, `树节点数 = 39`, String(goTreeNodes.length))
ck(goPoolIds.size === 39, `池节点数 = 39`, String(goPoolIds.size))
ck([...goPoolIds].every((id) => !!pool[id]), '39 个池节点全部存在')

// 3. 域外无重复挂载
const mounts = new Map()
;(function walk(n) { if (n.nodeRef) { if (!mounts.has(n.nodeRef)) mounts.set(n.nodeRef, []); mounts.get(n.nodeRef).push(n.id) } ;(n.children || []).forEach(walk) })(tree)
const outside = [...goPoolIds].flatMap((id) => (mounts.get(id) || []).filter((t) => !goTreeIds.has(t)))
ck(outside.length === 0, '域外无重复挂载', JSON.stringify(outside))

// 4. 边：端点命中 与 边 id 命中 必须同一集合
const allIds = new Set([...goTreeIds, ...goPoolIds])
const byEndpoint = edges.filter((e) => allIds.has(e.source) || allIds.has(e.target))
const byId = edges.filter((e) => [...goTreeIds].some((t) => e.id.includes(t)))
const epSet = new Set(byEndpoint.map((e) => e.id))
const idSet = new Set(byId.map((e) => e.id))
const onlyEp = [...epSet].filter((i) => !idSet.has(i))
const onlyId = [...idSet].filter((i) => !epSet.has(i))
ck(byEndpoint.length === 39, `端点命中边 = 39`, String(byEndpoint.length))
ck(onlyEp.length === 0 && onlyId.length === 0, '端点命中 ≡ 边id命中（无单边差异）', JSON.stringify({ onlyEp, onlyId }))

// 5. 卡内容统计（删除前）
const charsBefore = [...goPoolIds].reduce((s, id) => s + ((pool[id]?.card?.rootContent) || '').length, 0)
const tabsBefore = [...goPoolIds].reduce((s, id) => s + (pool[id]?.card?.tabs?.length || 0), 0)
console.log(`  · 将删解释卡：${goPoolIds.size} 张，正文合计 ${charsBefore} 字，tabs 合计 ${tabsBefore} 个`)

// 6. 其他真源零引用
const qHit = [...allIds].some((id) => questionsBefore.includes(id))
const evHit = [...allIds].some((id) => eventsBefore.includes(id))
const vcHit = [...allIds].some((id) => chainsBefore.includes(id))
ck(!qHit && !evHit && !vcHit, 'questions / evolution-events / version-chains 零引用')

if (problems.length) { console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止`); process.exit(1) }

// ── 变更构造 ──
const treeAfter = JSON.parse(JSON.stringify(tree))
;(function detach(n) {
  if (!n.children) return false
  const i = n.children.findIndex((c) => c.id === GO_TREE_ROOT)
  if (i >= 0) { n.children.splice(i, 1); return true }
  return n.children.some(detach)
})(treeAfter)

const poolAfter = { ...pool }
for (const id of goPoolIds) delete poolAfter[id]
const edgesAfter = edges.filter((e) => !epSet.has(e.id))

console.log('\n══ 后置门（未写盘，内存态校验）══')
const treeIdsBefore = new Set()
;(function walk(n) { treeIdsBefore.add(n.id); (n.children || []).forEach(walk) })(tree)
const poolIdsBefore = Object.keys(pool).length
const treeIdsAfter = new Set()
;(function walk(n) { treeIdsAfter.add(n.id); (n.children || []).forEach(walk) })(treeAfter)
ck(!treeIdsAfter.has(GO_TREE_ROOT), '树中已无 Go 域根')
ck([...goTreeIds].every((id) => !treeIdsAfter.has(id)), '树中已无任一 Go 域节点')
ck(treeIdsAfter.size === treeIdsBefore.size - 39, `树 ${treeIdsBefore.size} → ${treeIdsAfter.size}（−39）`, String(treeIdsAfter.size))
ck(Object.keys(poolAfter).length === poolIdsBefore - 39, `池 ${poolIdsBefore} → ${Object.keys(poolAfter).length}（−39）`)
ck([...goPoolIds].every((id) => !(id in poolAfter)), '池中已无任一 Go 节点（含解释卡）')
ck(edgesAfter.length === edges.length - 39, `边 ${edges.length} → ${edgesAfter.length}`)
// 悬空引用：删完后不得还有边指向已删池 id
const dangling = edgesAfter.filter((e) => goPoolIds.has(e.source) || goPoolIds.has(e.target))
ck(dangling.length === 0, '全库无边指向已删节点（零悬空）', JSON.stringify(dangling.slice(0, 5)))
// 未动文件逐字节不变（这三个文件本次不改）
ck(fs.readFileSync(path.join(DATA, 'questions.json'), 'utf8') === questionsBefore, 'questions.json 未改动')

if (problems.length) { console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`); process.exit(1) }

console.log('\n══ 变更摘要 ══')
console.log(`  树  : 移除子树 39 节点（路径 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > go）`)
console.log(`  池  : 删除 39 节点 + 其解释卡（正文 ${charsBefore} 字 / tabs ${tabsBefore}）`)
console.log(`  边  : 删除 39 条（38 域内 belongs-to + 1 条父「编程语言」→ Go 根 treebind）`)
console.log(`  不动: questions / evolution-events / version-chains`)

if (!APPLY) { console.log('\n[dry-run] 未写盘。确认后加 --apply'); process.exit(0) }

writeJsonAtomic('tree-data.json', treeAfter)
writeJsonAtomic('node-pool.json', poolAfter)
writeJsonAtomic('knowledge-edges.json', edgesAfter)
console.log('\n✅ 已原子写盘：tree-data.json / node-pool.json / knowledge-edges.json')
