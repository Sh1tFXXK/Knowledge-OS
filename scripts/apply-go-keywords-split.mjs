/**
 * Go 域「关键字」拆分批次 · apply（默认 dry-run，`--apply` 才写）
 *
 * 用户指令：「关键字也一个一个拆成节点，放在父节点下面。」
 *
 * 目标形态（三种构造复刻自 go-tools-to-subtree 批次，即 createKnowledgeNode /
 * createTreeEntry / createTreeBindingEdge 的规范形状）：
 *   ① 父树节点 tree_1787723651777_57iok2（关键字）新增 25 个**叶子**子条目
 *      —— 叶子形态 = `{id,name,count,nodeRef}`，⛔ 不写 `children` 键（对齐 treeUtils 规范化）
 *   ② 新增 25 个池实体 `k_go_keyword_<kw>`
 *      —— `{id,label,tags,card}`，card = `{nodeId,title,tabs}`（**无 rootContent**：
 *         全库空壳卡规范是「删掉 rootContent 键」，非空串；实测 1744 缺键 / 仅 5 空串）
 *   ③ 新增 25 条 treebind 边
 *      —— id `treebind:<parentTreeId>:<childTreeId>` · source=父卡池 id · target=子实体池 id
 *         · type=belongs-to · label=contains · relationKind=structure（无 dimensions ⇒ 省略该键）
 *
 * 父卡正文（用户裁决：「引言句 + 名单（改成 Markdown 列表）」）：
 *   源 rootContent 是一份**裸名单**（引言行 + 25 行光秃秃的词，Markdown 单换行会塌成一段
 *   ⇒ 读态基本是废的）。改为「引言句原样保留 + 25 行 `- kw` 列表」。
 *   ⚠️ 这与同批先例（go-tools-to-subtree 把父卡清空为纯容器，原则「同一知识不存两处」）
 *      **有意不同** —— 用户明确选择保留名单作为枚举总览，已在 manifest 留档。
 *
 * 零造数据：25 个关键字节点**没有逐词解释可迁**（源卡只有名单），故建为空壳（无 rootContent），
 *   与本批其余空壳卡（结构体/运算符/模块/控制流，用户裁决保留空壳）一致。
 *
 * 用法：
 *   node scripts/apply-go-keywords-split.mjs            # dry-run
 *   node scripts/apply-go-keywords-split.mjs --apply    # 落盘（先自动备份）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR
  ? path.resolve(process.env.KNOWLEDGE_OS_DATA_DIR)
  : path.join(ROOT, 'data')
const APPLY = process.argv.includes('--apply')

const F = {
  tree: path.join(DATA_DIR, 'tree-data.json'),
  pool: path.join(DATA_DIR, 'node-pool.json'),
  edges: path.join(DATA_DIR, 'knowledge-edges.json'),
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const detectIndent = (text) => {
  for (const line of text.split('\n')) {
    const m = line.match(/^(\s+)\S/)
    if (m) return m[1]
  }
  return ' '
}
const writeJsonAtomic = (file, obj) => {
  const indent = detectIndent(fs.readFileSync(file, 'utf8'))
  const body = JSON.stringify(obj, null, indent) + '\n'
  const tmp = `${file}.tmp-${process.pid}`
  fs.writeFileSync(tmp, body)
  try {
    fs.renameSync(tmp, file)
  } catch (e) {
    if (e.code === 'EPERM' || e.code === 'EEXIST') fs.writeFileSync(file, body)
    else throw e
  }
}

const PARENT_TREE = 'tree_1787723651777_57iok2'
const PARENT_K = 'k_1787723651360_r3tqg7'
const KEYWORDS = 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'.split(' ')
const treeIdOf = (kw) => `tree_go_keyword_${kw}`
const poolIdOf = (kw) => `k_go_keyword_${kw}`

const R = []
const gate = (ok, desc, detail = '') => {
  R.push({ ok, desc, detail })
  console.log('  ' + (ok ? '✅' : '❌') + ' ' + desc + (ok || !detail ? '' : ' ← ' + detail))
  return ok
}

// ══ 载入 ══════════════════════════════════════════════════════════════════
const tree = readJson(F.tree)
const pool = readJson(F.pool)
const rawEdges = readJson(F.edges)
const edgesIsArray = Array.isArray(rawEdges)
const edges = edgesIsArray ? rawEdges : rawEdges.edges

const findNode = (n, id) => {
  if (n.id === id) return n
  for (const c of n.children ?? []) { const r = findNode(c, id); if (r) return r }
  return null
}
const flat = []
;(function w(n) { flat.push(n); (n.children ?? []).forEach(w) })(tree)

const parentTree = findNode(tree, PARENT_TREE)
const parentPool = pool[PARENT_K]

console.log('══ Go 域「关键字」拆分 · ' + (APPLY ? 'APPLY 落盘' : 'DRY-RUN') + ' ══')
console.log('数据目录：' + path.relative(ROOT, DATA_DIR).replace(/\\/g, '/'))
console.log('父节点：' + PARENT_TREE + ' / ' + PARENT_K)
console.log('')

console.log('【落盘前闸门】')
gate(KEYWORDS.length === 25 && new Set(KEYWORDS).size === 25, 'G0 关键词常量 = 25 个且无重复', String(KEYWORDS.length))
gate(!!parentTree, 'G1a 父树节点存在')
gate((parentTree?.children ?? []).length === 0, 'G1b 父树节点当前**无子条目**（防重复执行）', String((parentTree?.children ?? []).length))
gate(!!parentPool, 'G2a 父池实体存在')
gate(parentPool?.card?.nodeId === PARENT_K, 'G2b 父卡 card.nodeId ≡ 池键（唯一真正的不变量）', String(parentPool?.card?.nodeId))

// 从源 rootContent 解析关键词（引言行之后、逐行一个词）
const srcRoot = parentPool?.card?.rootContent
gate(typeof srcRoot === 'string' && srcRoot.length > 0, 'G3a 父卡 rootContent 非空（有名单可拆）', String(srcRoot?.length))
const srcLines = String(srcRoot ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
const intro = srcLines[0]
const srcWords = srcLines.slice(1)
gate(srcWords.length === 25, 'G3b 源名单解析出 25 行', String(srcWords.length))
gate(JSON.stringify(srcWords) === JSON.stringify(KEYWORDS), 'G3c 源名单序列 === 常量序列（顺序与集合都对）', JSON.stringify(srcWords))
gate(/包含以下\s*25\s*个关键词/.test(intro), 'G3d 引言句可识别（含「包含以下 25 个关键词」）', JSON.stringify(intro))

// 防碰撞：新 id 全库不存在
const existTreeIds = new Set(flat.map((n) => n.id))
const poolKeys = new Set(Object.keys(pool))
const edgeIds = new Set(edges.map((e) => e.id))
const dupTree = KEYWORDS.filter((k) => existTreeIds.has(treeIdOf(k)))
const dupPool = KEYWORDS.filter((k) => poolKeys.has(poolIdOf(k)))
const dupEdge = KEYWORDS.filter((k) => edgeIds.has(`treebind:${PARENT_TREE}:${treeIdOf(k)}`))
gate(dupTree.length === 0, 'G4a 25 个新 treeId 全库不存在（防碰撞）', dupTree.join(','))
gate(dupPool.length === 0, 'G4b 25 个新 poolId 不在池中（防碰撞）', dupPool.join(','))
gate(dupEdge.length === 0, 'G4c 25 条新边 id 不在边表中（防碰撞）', dupEdge.join(','))
gate(edges.filter((e) => String(e.id).startsWith(`treebind:${PARENT_TREE}:`)).length === 0,
  'G5 父树节点当前无 treebind 出边（防重复挂载）',
  String(edges.filter((e) => String(e.id).startsWith(`treebind:${PARENT_TREE}:`)).length))

// ══ 变换 ══════════════════════════════════════════════════════════════════
const newRoot = intro + '\n\n' + KEYWORDS.map((k) => '- ' + k).join('\n')

const treeAfter = JSON.parse(JSON.stringify(tree))
const parentAfter = findNode(treeAfter, PARENT_TREE)
parentAfter.children = KEYWORDS.map((kw) => ({ id: treeIdOf(kw), name: kw, count: 0, nodeRef: poolIdOf(kw) }))

const poolAfter = JSON.parse(JSON.stringify(pool))
poolAfter[PARENT_K].card.rootContent = newRoot
for (const kw of KEYWORDS) {
  const pid = poolIdOf(kw)
  poolAfter[pid] = { id: pid, label: kw, tags: [kw], card: { nodeId: pid, title: kw, tabs: [] } }
}

const edgesAfter = JSON.parse(JSON.stringify(edges))
for (const kw of KEYWORDS) {
  edgesAfter.push({
    id: `treebind:${PARENT_TREE}:${treeIdOf(kw)}`,
    source: PARENT_K,
    target: poolIdOf(kw),
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
  })
}

// ══ 落盘后闸门（纯内存自检，未写盘）══════════════════════════════════════
console.log('\n【落盘后形态自检】')
const kids = parentAfter.children
gate(kids.length === 25, 'G6 父树节点恰 25 个子条目', String(kids.length))
gate(JSON.stringify(kids.map((c) => c.name)) === JSON.stringify(KEYWORDS), 'G7 子条目名称序列 === 常量序列')
gate(kids.every((c, i) => c.nodeRef === poolIdOf(KEYWORDS[i]) && c.count === 0), 'G8 子条目 nodeRef 对应且 count=0')
gate(kids.every((c) => !('children' in c)), 'G9 子条目为**叶子形态**（无 children 键）')
gate(KEYWORDS.every((kw) => {
  const e = poolAfter[poolIdOf(kw)]
  return e && e.label === kw && JSON.stringify(e.tags) === JSON.stringify([kw]) &&
    JSON.stringify(Object.keys(e)) === JSON.stringify(['id', 'label', 'tags', 'card']) &&
    JSON.stringify(Object.keys(e.card)) === JSON.stringify(['nodeId', 'title', 'tabs']) &&
    !('rootContent' in e.card)
}), 'G10 新实体形状 = {id,label,tags,card{nodeId,title,tabs}}（空壳规范：无 rootContent 键）')
gate(KEYWORDS.every((kw) => {
  const e = edgesAfter.find((x) => x.id === `treebind:${PARENT_TREE}:${treeIdOf(kw)}`)
  return e && e.source === PARENT_K && e.target === poolIdOf(kw) && e.type === 'belongs-to' &&
    e.label === 'contains' && e.relationKind === 'structure' &&
    JSON.stringify(Object.keys(e)) === JSON.stringify(['id', 'source', 'target', 'type', 'label', 'relationKind'])
}), 'G11 新边形状 = {id,source,target,type,label,relationKind}，恒等字段正确')

// 守恒：新父卡正文抽出的 token === 常量（去空白逐字等价）
const toks = newRoot.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim())
gate(JSON.stringify(toks) === JSON.stringify(KEYWORDS), 'G12 守恒：父卡新正文抽出的 25 token === 常量序列（去空白逐字等价）')
gate(newRoot.includes(intro), 'G13 守恒：引言句原样保留')
const srcTokNorm = srcWords.join('\u0001')
const dstTokNorm = toks.join('\u0001')
gate(srcTokNorm === dstTokNorm, 'G14 守恒：源名单 → 新名单 token 逐一相同（零改写零丢失）')

// 非目标零改动（把本批改动逆向抹平后整树/整池/整边逐字节等价）
const treeBeforeCmp = JSON.parse(JSON.stringify(tree)); findNode(treeBeforeCmp, PARENT_TREE).children = []
const treeAfterCmp = JSON.parse(JSON.stringify(treeAfter)); findNode(treeAfterCmp, PARENT_TREE).children = []
gate(JSON.stringify(treeBeforeCmp) === JSON.stringify(treeAfterCmp), 'G15 非目标零改动：树（抹平父 children 后逐字节等价）')
const poolBeforeCmp = JSON.parse(JSON.stringify(pool))
const poolAfterCmp = JSON.parse(JSON.stringify(poolAfter))
poolAfterCmp[PARENT_K].card.rootContent = pool[PARENT_K].card.rootContent
for (const kw of KEYWORDS) delete poolAfterCmp[poolIdOf(kw)]
gate(JSON.stringify(poolBeforeCmp) === JSON.stringify(poolAfterCmp), 'G16 非目标零改动：池（撤掉父卡改写与 25 新键后逐字节等价）')
gate(JSON.stringify(edges) === JSON.stringify(edgesAfter.slice(0, edges.length)), 'G17 非目标零改动：边（仅尾部追加 25 条，既有边逐字节等价）')

const bad = R.filter((r) => !r.ok)
console.log('\n落盘前+形态自检：' + (R.length - bad.length) + '/' + R.length + (bad.length ? '  ❌ 阻断' : '  ✅ 全通过'))

console.log('\n【计划 Δ】')
console.log('  树 ' + flat.length + ' → ' + (flat.length + 25) + '（父节点 关键字 children 0 → 25）')
console.log('  池 ' + poolKeys.size + ' → ' + (poolKeys.size + 25) + '（新增 25 空壳实体）')
console.log('  边 ' + edges.length + ' → ' + (edges.length + 25) + '（新增 25 treebind）')
console.log('  父卡正文 ' + String(srcRoot).length + ' → ' + newRoot.length + ' 字')
console.log('  ── 父卡新正文预览 ──')
console.log(newRoot.split('\n').map((l) => '    ' + l).join('\n'))
console.log('  ── 新实体样例（break）──')
console.log('    ' + JSON.stringify(poolAfter['k_go_keyword_break']))

if (bad.length) { console.log('\n⛔ 有闸门未过，拒绝落盘。'); process.exit(1) }
if (!APPLY) { console.log('\nDRY-RUN 结束（未写盘）。加 --apply 落盘。'); process.exit(0) }

// ══ 落盘（先备份，原子写）════════════════════════════════════════════════
const iso = new Date().toISOString().replace(/[:.]/g, '-')
const bkDir = path.join(ROOT, 'data', 'backups', `go-keywords-split-${iso}`)
fs.mkdirSync(bkDir, { recursive: true })
for (const [k, f] of Object.entries(F)) fs.copyFileSync(f, path.join(bkDir, path.basename(f)))
console.log('\n【备份】' + path.relative(ROOT, bkDir).replace(/\\/g, '/'))

writeJsonAtomic(F.tree, treeAfter)
writeJsonAtomic(F.pool, poolAfter)
writeJsonAtomic(F.edges, edgesIsArray ? edgesAfter : { ...rawEdges, edges: edgesAfter })
console.log('【落盘】tree-data / node-pool / knowledge-edges 已写（原子写 + EPERM 退化）')

// 回读校验
const rbTree = readJson(F.tree), rbPool = readJson(F.pool), rbEdges0 = readJson(F.edges)
const rbEdges = Array.isArray(rbEdges0) ? rbEdges0 : rbEdges0.edges
const okTree = JSON.stringify(rbTree) === JSON.stringify(treeAfter)
const okPool = JSON.stringify(rbPool) === JSON.stringify(poolAfter)
const okEdges = JSON.stringify(rbEdges) === JSON.stringify(edgesAfter)
console.log('【回读】树 ' + (okTree ? '✅' : '❌') + ' · 池 ' + (okPool ? '✅' : '❌') + ' · 边 ' + (okEdges ? '✅' : '❌'))
if (!okTree || !okPool || !okEdges) { console.log('⛔ 回读不一致，请从备份还原。'); process.exit(1) }
console.log('✅ APPLY 完成。')
