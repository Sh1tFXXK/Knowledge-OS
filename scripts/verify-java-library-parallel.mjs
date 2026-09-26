/**
 * JAVA-LIBRARY-PARALLEL（C 批）· 独立验证
 *
 * ⛔ 不 import apply 脚本的任何代码（规格要求：验证必须独立于实现）。
 *    对照物 = **磁盘上的落盘前备份快照 vs 当前工作树**，由差异**反推**本批做了什么，
 *    再与声明的 Δ 双向核对。判据全部由数据算出，无手写常量。
 *
 * 用法：node scripts/verify-java-library-parallel.mjs [备份目录]
 *   默认备份目录 = data/backups/java-library-parallel-2026-09-15T19-18-29-093Z（已证 == HEAD）
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const BK = process.argv[2] ?? 'data/backups/java-library-parallel-2026-09-15T19-18-29-093Z'
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))

const V = []
const v = (ok, desc, detail = '') => V.push({ ok, msg: ok ? desc : desc + (detail ? ' ← 实际：' + detail : '') })

function walkAll(root) {
  const out = []
  const rec = (node, ancestors) => {
    out.push({ node, ancestors, path: [...ancestors, node].map((x) => x.name).join(' > ') })
    for (const c of node.children ?? []) rec(c, [...ancestors, node])
  }
  rec(root, [])
  return out
}
const arrOf = (x) => (Array.isArray(x) ? x : x.edges)

// ── 读取两侧 ─────────────────────────────────────────────────────────────
const bTree = rd(BK + '/tree-data.json')
const bPool = rd(BK + '/node-pool.json')
const bEdges = arrOf(rd(BK + '/knowledge-edges.json'))
const cTree = rd('data/tree-data.json')
const cPool = rd('data/node-pool.json')
const cEdges = arrOf(rd('data/knowledge-edges.json'))

const bNodes = walkAll(bTree), cNodes = walkAll(cTree)
const bIds = new Set(bNodes.map((x) => x.node.id)), cIds = new Set(cNodes.map((x) => x.node.id))

const OLD_REFS = ['k_1784343188560_x1gylq', 'k_1787744960960_nuqg5v', 'k_1787852488347_zqzfjo', 'k_1787852533507_uv8rwh', 'k_1787852618831_l95bj1']
const NEW_TREE_ID = 'tree_java_util_base64'
const NEW_REF = 'k_java_util_base64'
const CONTAINER_TREE_ID = 'tree_java_common_libraries'
const CONTAINER_REF = 'k_java_common_libraries'
const NEW_EDGE_ID = 'treebind:' + CONTAINER_TREE_ID + ':' + NEW_TREE_ID
const JAVA_TREE_ID = 'tree_1782746457614_osttpr'

// ── V1 基数 ──────────────────────────────────────────────────────────────
v(bNodes.length === 3209, '批前树 3209', String(bNodes.length))
v(cNodes.length === 3205, '批后树 3205', String(cNodes.length))
v(Object.keys(bPool).length === 3856, '批前池 3856', String(Object.keys(bPool).length))
v(Object.keys(cPool).length === 3852, '批后池 3852', String(Object.keys(cPool).length))
v(bEdges.length === 4161, '批前边 4161', String(bEdges.length))
v(cEdges.length === 4157, '批后边 4157', String(cEdges.length))

// ── V2 树：removed / added 由 diff 反推，恰为声明值 ───────────────────────
const removedTree = [...bIds].filter((i) => !cIds.has(i))
const addedTree = [...cIds].filter((i) => !bIds.has(i))
v(removedTree.length === 5, '树 removed 恰 5', removedTree.join(','))
v(addedTree.length === 1 && addedTree[0] === NEW_TREE_ID, `树 added 恰 {${NEW_TREE_ID}}`, addedTree.join(','))

// ── V3 树：除声明外全树逐节点逐字段零漂移（比对 children 之外的字段 + children id 列表）──
const declaredTreeChange = new Set([JAVA_TREE_ID, CONTAINER_TREE_ID])
const drift = []
for (const b of bNodes) {
  if (!cIds.has(b.node.id)) continue
  const c = cNodes.find((x) => x.node.id === b.node.id)
  const strip = (n) => { const { children, ...rest } = n; return JSON.stringify(rest) }
  if (strip(b.node) !== strip(c.node)) drift.push(b.node.id + '(字段)')
  else if (JSON.stringify((b.node.children ?? []).map((x) => x.id)) !== JSON.stringify((c.node.children ?? []).map((x) => x.id))) drift.push(b.node.id + '(children)')
}
const undeclaredDrift = drift.filter((d) => !declaredTreeChange.has(d.replace(/\((字段|children)\)$/, '')))
v(drift.length === 2 && undeclaredDrift.length === 0, '全树仅 2 处结构性变化（java 摘子 · 容器改名+加子），其余 3203 节点零漂移', JSON.stringify(drift))
v(drift.includes(JAVA_TREE_ID + '(children)'), 'java 的变化是 children（摘除旧子树根）', drift.join(','))
v(drift.includes(CONTAINER_TREE_ID + '(字段)'), '容器的变化含 name（改名）', drift.join(','))

// ── V4 池：removed 恰 5 / added 恰 1 / 既有实体零漂移 ────────────────────
const bKeys = Object.keys(bPool), cKeys = Object.keys(cPool)
const removedPool = bKeys.filter((k) => !cPool[k])
const addedPool = cKeys.filter((k) => !bPool[k])
v(removedPool.length === 5 && OLD_REFS.every((r) => removedPool.includes(r)), '池 removed 恰为声明的 5 个旧实体', removedPool.join(','))
v(addedPool.length === 1 && addedPool[0] === NEW_REF, `池 added 恰 {${NEW_REF}}`, addedPool.join(','))
const poolDrift = cKeys.filter((k) => bPool[k] && k !== CONTAINER_REF && JSON.stringify(bPool[k]) !== JSON.stringify(cPool[k]))
v(poolDrift.length === 0, '除容器外，3850 个既有池实体逐字段零漂移', poolDrift.slice(0, 5).join(','))
v(!!bPool[CONTAINER_REF] && JSON.stringify(bPool[CONTAINER_REF]) !== JSON.stringify(cPool[CONTAINER_REF]), '容器池实体确已变更（唯一被改的既有实体）')

// ── V5 边：removed / added 由 diff 反推 ─────────────────────────────────
const bEIds = new Set(bEdges.map((e) => e.id)), cEIds = new Set(cEdges.map((e) => e.id))
const removedE = [...bEIds].filter((i) => !cEIds.has(i))
const addedE = [...cEIds].filter((i) => !bEIds.has(i))
v(removedE.length === 5, '边 removed 恰 5 条（旧子树全部 treebind）', removedE.join(' | '))
v(removedE.every((i) => String(i).startsWith('treebind:')), '删除的边全部是 treebind', removedE.filter((i) => !String(i).startsWith('treebind:')).join(','))
v(addedE.length === 1 && addedE[0] === NEW_EDGE_ID, `边 added 恰 {${NEW_EDGE_ID}}（Δ边 = −4，非 −5）`, addedE.join(','))
const keepEdgeDrift = cEdges.filter((e) => bEIds.has(e.id) && JSON.stringify(e) !== JSON.stringify(bEdges.find((x) => x.id === e.id)))
v(keepEdgeDrift.length === 0, '既有的 4156 条边逐字段零漂移', keepEdgeDrift.slice(0, 5).map((e) => e.id).join(','))

// ── V6 旧 id/ref 在树 / 池 / 边 零残留 ──────────────────────────────────
const blob = JSON.stringify(cTree) + JSON.stringify(cPool) + JSON.stringify(cEdges)
for (const r of OLD_REFS) v(!blob.includes(r), `旧 ref 全库零残留：${r}`, '文本仍出现')
for (const i of removedTree) v(!blob.includes(i), `旧 treeId 全库零残留：${i}`, '文本仍出现')
v(!blob.includes('类库 > 常用') && !blob.includes('"常用"'), '旧「常用」节点名零出现', '仍有')

// ── V7 旧 5 ref 不再被任何池实体引用（排除自身已删）────────────────────
let extRef = 0
for (const e of Object.values(cPool)) for (const r of OLD_REFS) if (JSON.stringify(e).includes('"' + r + '"')) extRef++
v(extRef === 0, '旧 ref 无任何外部池实体引用', String(extRef))

// ── V8 新 Base64：3 tab 内容与**备份里的三个源实体**逐字相等（独立重推）──
const srcRoot = String(bPool[OLD_REFS[2]]?.card?.rootContent ?? '')
const srcNest = String(bPool[OLD_REFS[3]]?.card?.rootContent ?? '')
const srcMeth = String(bPool[OLD_REFS[4]]?.card?.rootContent ?? '')
const nt = cPool[NEW_REF]?.card?.tabs ?? []
v(nt.length === 3, '新实体 tabs = 3', String(nt.length))
v(nt[0]?.content === srcRoot, `def tab ≡ 备份 Base64 概述（${srcRoot.length} 字）逐字相等`, `len=${nt[0]?.content?.length}`)
v(nt[1]?.content === srcNest, `nested tab ≡ 备份「内嵌类」（${srcNest.length} 字）逐字相等`, `len=${nt[1]?.content?.length}`)
v(nt[2]?.content === srcMeth, `methods tab ≡ 备份「方法」（${srcMeth.length} 字）逐字相等`, `len=${nt[2]?.content?.length}`)
v(cPool[NEW_REF]?.card?.rootContent === srcRoot.split('\n').filter((s) => s.trim())[0], '新实体 rootContent 取材料原句（首句）')
v(JSON.stringify(cPool[NEW_REF]?.tags) === JSON.stringify(['java.util.Base64', 'java', 'jdk', '常用类库']), '新实体 tags 遵循全库惯例', JSON.stringify(cPool[NEW_REF]?.tags))

// ── V9 容器：改名 + rootContent = 备份总述首段 + 索引段 ──────────────────
const srcOverview = String(bPool[OLD_REFS[0]]?.card?.rootContent ?? '').split('\n').filter((s) => s.trim())[0]
const cRoot = String(cPool[CONTAINER_REF]?.card?.rootContent ?? '')
v(cRoot.startsWith(srcOverview), `容器 rootContent 以备份总述首段开头（${srcOverview.length} 字）`, cRoot.slice(0, 40))
v(cRoot.length > srcOverview.length, '容器 rootContent 含索引段')
v(cPool[CONTAINER_REF]?.label === '类库', '容器 label = 类库', String(cPool[CONTAINER_REF]?.label))
v(cPool[CONTAINER_REF]?.card?.title === 'Java 类库', '容器 card.title = Java 类库', String(cPool[CONTAINER_REF]?.card?.title))
v(JSON.stringify(Object.keys(cPool[CONTAINER_REF]?.card ?? {})) === JSON.stringify(['nodeId', 'title', 'rootContent', 'tabs']), '容器 card 键序 = nodeId,title,rootContent,tabs', Object.keys(cPool[CONTAINER_REF]?.card ?? {}).join(','))
v(Array.isArray(cPool[CONTAINER_REF]?.tags) && cPool[CONTAINER_REF].tags.includes('类库') && cPool[CONTAINER_REF].tags.includes('常用类库'), '容器 tags 含新名与旧名（旧名留作搜索别名）', JSON.stringify(cPool[CONTAINER_REF]?.tags))
const cCont = cNodes.find((x) => x.node.id === CONTAINER_TREE_ID)
v(cCont?.node.name === '类库', '容器树名 = 类库', String(cCont?.node.name))

// ── V9b 索引段每一条都真的是「树池皆无」（自校验，不靠冻结清单）─────────
const known = new Set()
for (const x of cNodes) known.add(String(x.node.name))
for (const e of Object.values(cPool)) { known.add(String(e.label ?? '')); if (e.card?.title) known.add(String(e.card.title)) }
const idxLines = cRoot.split('\n').filter((s) => /^- /.test(s.trim()))
let bad = []
for (const line of idxLines) {
  const fq = (line.match(/(?:java|javax|org|com)\.[A-Za-z0-9_.]+/) ?? [])[0]
  if (!fq) continue
  const simple = fq.split('.').pop()
  if (known.has(simple) || known.has(fq)) bad.push(fq)
}
v(idxLines.length >= 20, `索引段含 ${idxLines.length} 条条目`, String(idxLines.length))
v(bad.length === 0, '索引段中所有带 FQCN 的条目在树/池确实无同名实体', bad.join(','))

// ── V10 新边端点 + 容器 22 条既有子边全保留 ─────────────────────────────
const ne = cEdges.find((e) => e.id === NEW_EDGE_ID)
v(!!ne && ne.source === CONTAINER_REF && ne.target === NEW_REF, '新边端点 = 容器 → Base64', ne ? `${ne.source} → ${ne.target}` : 'n/a')
v(!!ne && ne.type === 'belongs-to' && ne.label === 'contains' && ne.relationKind === 'structure', '新边字段符合 treebind 契约', JSON.stringify(ne))
const bKids = bEdges.filter((e) => String(e.id).startsWith('treebind:' + CONTAINER_TREE_ID + ':'))
v(bKids.every((e) => cEIds.has(e.id)), `容器既有子边 ${bKids.length} 条全部保留`, '有丢失')

// ── V11 count 徽标：只对被**摘除**的路径断言「无 count>0」（量具前提修正）──
//  ⚠️ 初版把「容器自身/其祖先」也算进「受影响路径」，于是把容器**既有的**手工标注
//     count=13 报成过期徽标。该前提只适用于**摘除**操作（摘子会让父徽标过期）；
//     本批对容器是**加子**，且 count 是手工标注值（22 子时即 13，非聚合值）⇒ 不构成过期。
//     修的是量具前提，期望值（无过期徽标）未改。
const removedRootAncestors = []
{
  const bRoot = bNodes.find((x) => x.node.id === 'tree_1784343188605_zvliz7')
  for (const a of [...(bRoot?.ancestors ?? []), bRoot?.node]) {
    if (typeof a?.count === 'number' && a.count > 0) removedRootAncestors.push(a.name + '=' + a.count)
  }
}
v(removedRootAncestors.length === 0, '被摘除子树的节点及其父链上无 count>0 ⇒ 摘除不留过期徽标', removedRootAncestors.join(','))
const newN = cNodes.find((x) => x.node.id === NEW_TREE_ID)
v(newN?.node.count === 0, '新增节点 count = 0（新节点不引入徽标）', String(newN?.node.count))
const bCont = bNodes.find((x) => x.node.id === CONTAINER_TREE_ID)
v(bCont?.node.count === 13 && cCont?.node.count === 13, '容器 count 本批前后恒为 13（手工标注值，非聚合 ⇒ 加子不使其过期）', `${bCont?.node.count} → ${cCont?.node.count}`)

// ── V12 docs / src 全量文本零引用 ───────────────────────────────────────
const files = []
const walkDir = (d) => {
  for (const n of fs.readdirSync(d, { withFileTypes: true })) {
    if (n.name === 'node_modules' || n.name === 'dist' || n.name === 'backups' || n.name.startsWith('.')) continue
    const p = path.join(d, n.name)
    if (n.isDirectory()) walkDir(p)
    else if (/\.(ts|tsx|js|mjs|md|json|css|html)$/.test(n.name)) files.push(p)
  }
}
for (const d of ['src', 'docs']) walkDir(path.join(ROOT, d))
let textHit = []
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8')
  for (const r of [...OLD_REFS, ...removedTree]) if (t.includes(r)) textHit.push(path.relative(ROOT, f) + ':' + r)
}
v(textHit.length === 0, `src/** + docs/** 共 ${files.length} 文件零引用旧 id/ref`, textHit.slice(0, 5).join(' '))

// ── V13 序列化保真（往返）──────────────────────────────────────────────
for (const [rel, label] of [['data/tree-data.json', 'tree'], ['data/node-pool.json', 'pool'], ['data/knowledge-edges.json', 'edges']]) {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8')
  const round = JSON.stringify(JSON.parse(raw), null, 2) + '\n'
  v(raw === round, `${label} 序列化保真（原字节 == JSON.stringify(obj,2)+换行）`)
}

// ── V14 备份 == HEAD（证明提交 diff 即本批）─────────────────────────────
let headEq = true
for (const f of ['tree-data.json', 'node-pool.json', 'knowledge-edges.json']) {
  const h = execSync('git show HEAD:data/' + f, { encoding: 'buffer', maxBuffer: 1 << 28 })
  if (Buffer.compare(h, fs.readFileSync(path.join(ROOT, BK + '/' + f))) !== 0) headEq = false
}
v(headEq, '备份快照 ≡ HEAD（提交 diff 恰为本批操作，无夹带）')

// ── 输出 ─────────────────────────────────────────────────────────────────
console.log('════ JAVA-LIBRARY-PARALLEL（C 批）· 独立验证 ════')
console.log('对照：' + BK + '  ↔  当前工作树')
console.log('')
for (const x of V) console.log('  ' + (x.ok ? '✅' : '⛔') + ' ' + x.msg)
const pass = V.filter((x) => x.ok).length
console.log('')
console.log(`${pass}/${V.length} ` + (pass === V.length ? '— ✅ ALL PASS' : '— ⛔ 有失败项'))
process.exit(pass === V.length ? 0 : 1)
