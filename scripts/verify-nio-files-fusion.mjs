/**
 * NIO-FILES-FUSION（D 批）· verify（**独立于 apply**：不 import apply，全部结论由备份快照反推）
 *
 * 用户裁决：D1 保留 SURVIVOR · D2 方案①全原子 · D7 options(11 常量，逐字) · D8 tags+3 · D9 watch-service · 口径 ①-b(53 tab)
 *
 * 本脚本回答 5 个问题（每个都要有基数）：
 *   A. 基数是否落定（树 3203 / 池 3850 / 边 4155 / SURVIVOR tabs 53）
 *   B. 变动面是否**恰好**等于声明（扩散检测：池/树/边各自的实际变化集合 vs 预期集合）
 *   C. **零造数据**：SURVIVOR 的「新增行」是否全部逐字来自备份里的 DONOR 原文
 *   D. **零丢失**：SURVIVOR 改动前的签名/正文是否都还有归处
 *   E. **DONOR 覆盖度**：DONOR 的每一行落在哪个桶（迁入 / 判等丢弃 / 骨架丢弃），有无无声丢失
 *
 * 用法：node scripts/verify-nio-files-fusion.mjs [backupDirName]
 */
import fs from 'node:fs'
import path from 'node:path'

export const SURVIVOR = { ref: 'k_java_nio_file_files', tree: 'tree_java_nio_file_files' }
export const DONOR = { ref: 'k_nio_files_util', tree: 'tree_nio_files_util' }
export const GUIDE = { ref: 'k_1787916226907_9aq9u6', tree: 'tree_1787916227408_nkaljw' }
export const EXPECTED = { tree: 3203, pool: 3850, edges: 4155, survivorTabs: 53 }

const ROOT = process.cwd()
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))

// ── 快照定位 ───────────────────────────────────────────────────────────────
const bkBase = path.join(ROOT, 'data/backups')
const bkName = process.argv[2] ?? fs.readdirSync(bkBase).filter((d) => d.startsWith('nio-files-fusion-')).sort().pop()
if (!bkName) { console.log('⛔ 找不到 nio-files-fusion 备份'); process.exit(2) }
const BK = 'data/backups/' + bkName
console.log('备份快照：' + BK)
const bTree = rd(BK + '/tree-data.json')
const bPool = rd(BK + '/node-pool.json')
const bEdges0 = rd(BK + '/knowledge-edges.json')
const aTree = rd('data/tree-data.json')
const aPool = rd('data/node-pool.json')
const aEdges0 = rd('data/knowledge-edges.json')
const arr = (x) => (Array.isArray(x) ? x : x.edges)

// ── 工具 ───────────────────────────────────────────────────────────────────
const METHOD_RE = /\(\)/
function flatten(root) {
  const out = []
  ;(function rec(n, p) { out.push({ node: n, path: [...p, n.name] }); for (const c of n.children ?? []) rec(c, [...p, n.name]) })(root, [])
  return out
}
function splitTopLevel(s) {
  const out = []; let d = 0; let cur = ''
  for (const ch of s) {
    if (ch === '<' || ch === '(' || ch === '[') d++
    else if (ch === '>' || ch === ')' || ch === ']') d--
    if (ch === ',' && d === 0) { out.push(cur); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}
const paramType = (p) => { const m = p.match(/^(.*?)\s+[A-Za-z_][A-Za-z0-9_]*$/); return (m ? m[1] : p).replace(/\s+/g, '') }
const sigKey = (n, ps) => n + '(' + splitTopLevel(ps).map(paramType).join(',') + ')'
function readParams(text, name) {
  const re = new RegExp('\\b' + name + '\\s*\\(', 'g'); const out = []; let m
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length; const start = i; let d = 1
    while (i < text.length) { if (text[i] === '(') d++; else if (text[i] === ')') { d--; if (!d) break } i++ }
    out.push(text.slice(start, i)); re.lastIndex = Math.max(i, m.index + m[0].length)
  }
  return out
}
const stripPunct = (s) => String(s).replace(/[。．.；;，,、\s]/g, '')

const CHK = []
const ck = (ok, desc, detail = '') => CHK.push({ ok, msg: ok ? desc : desc + (detail ? ' ← 实际：' + detail : '') })
const H = (s) => console.log('\n══ ' + s + ' ' + '═'.repeat(Math.max(0, 60 - s.length)))

// ═══ A · 基数 ═════════════════════════════════════════════════════════════
const aFlat = flatten(aTree)
const aEdges = arr(aEdges0)
const S1 = aPool[SURVIVOR.ref]
H('A · 基数')
ck(aFlat.length === EXPECTED.tree, `树节点数 = ${EXPECTED.tree}`, String(aFlat.length))
ck(Object.keys(aPool).length === EXPECTED.pool, `池键数 = ${EXPECTED.pool}`, String(Object.keys(aPool).length))
ck(aEdges.length === EXPECTED.edges, `边数 = ${EXPECTED.edges}`, String(aEdges.length))
ck(S1.card.tabs.length === EXPECTED.survivorTabs, `SURVIVOR tabs = ${EXPECTED.survivorTabs}`, String(S1.card.tabs.length))
ck(!aPool[DONOR.ref] && !aPool[GUIDE.ref], 'DONOR/GUIDE 池实体均已移除', '仍存在')
ck(!aFlat.some((x) => x.node.id === DONOR.tree || x.node.id === GUIDE.tree), 'DONOR/GUIDE 树节点均已移除', '仍存在')

// ═══ B · 变动面扩散检测（由快照反推「实际变了什么」）═════════════════════
H('B · 变动面扩散检测（实际变化集合 vs 声明集合）')
const bPoolKeys = Object.keys(bPool); const aPoolKeys = Object.keys(aPool)
const poolAdded = aPoolKeys.filter((k) => !bPool[k])
const poolRemoved = bPoolKeys.filter((k) => !aPool[k])
const poolModified = aPoolKeys.filter((k) => bPool[k] && JSON.stringify(bPool[k]) !== JSON.stringify(aPool[k]))
ck(poolAdded.length === 0, '池：无新增实体', poolAdded.join(','))
ck(JSON.stringify(poolRemoved.sort()) === JSON.stringify([DONOR.ref, GUIDE.ref].sort()), '池：删除集合恰为 {DONOR, GUIDE}', poolRemoved.join(','))
ck(JSON.stringify(poolModified) === JSON.stringify([SURVIVOR.ref]), '池：唯一被修改实体 = SURVIVOR', poolModified.join(','))

const bFlat = flatten(bTree)
const bIds = new Set(bFlat.map((x) => x.node.id)); const aIds = new Set(aFlat.map((x) => x.node.id))
const treeAdded = [...aIds].filter((x) => !bIds.has(x))
const treeRemoved = [...bIds].filter((x) => !aIds.has(x))
ck(treeAdded.length === 0, '树：无新增节点', treeAdded.join(','))
ck(JSON.stringify(treeRemoved.sort()) === JSON.stringify([DONOR.tree, GUIDE.tree].sort()), '树：删除集合恰为 {DONOR, GUIDE}', treeRemoved.join(','))
// ⚠️ 树 diff 必须**排除 children** 再比：节点对象是嵌套的，删一个孙节点会让**所有祖先**的
//    JSON.stringify 都变 ⇒ 报出 7 个「被改节点」的假象（实为 2 个）。
//    （此坑已记在 .workbuddy/memory/MEMORY.md「嵌套序列化 diff 是假象」，本次又踩了一次。）
const noChildren = (n) => { const { children, ...rest } = n; return rest }
const ids = (n) => JSON.stringify((n.children ?? []).map((c) => c.id))
const treeFieldModified = [...aIds].filter((id) => {
  const b = bFlat.find((x) => x.node.id === id); const a = aFlat.find((x) => x.node.id === id)
  return b && a && JSON.stringify(noChildren(b.node)) !== JSON.stringify(noChildren(a.node))
})
const treeChildrenChanged = [...aIds].filter((id) => {
  const b = bFlat.find((x) => x.node.id === id); const a = aFlat.find((x) => x.node.id === id)
  return b && a && ids(b.node) !== ids(a.node)
})
const donParent = bFlat.find((x) => (x.node.children ?? []).some((c) => c.id === DONOR.tree))?.node.id
ck(treeFieldModified.length === 0, '树：除 children 外无任何字段被改', treeFieldModified.join(','))
ck(JSON.stringify(treeChildrenChanged.sort()) === JSON.stringify([SURVIVOR.tree, donParent].sort()),
  `树：children 变化的节点恰为 2 个 = SURVIVOR + DONOR 的父节点(${donParent})`, treeChildrenChanged.join(','))

const bEdges = arr(bEdges0)
const edgeAdded = aEdges.filter((e) => !bEdges.some((x) => x.id === e.id))
const edgeRemoved = bEdges.filter((e) => !aEdges.some((x) => x.id === e.id))
ck(edgeAdded.length === 0, '边：无新增', edgeAdded.map((e) => e.id).join(','))
ck(edgeRemoved.length === 2 && edgeRemoved.every((e) => e.id.endsWith(DONOR.tree) || e.id.endsWith(GUIDE.tree)),
  '边：删除的 2 条都是 treebind 父边', edgeRemoved.map((e) => e.id).join(','))
const edgeModified = aEdges.filter((e) => { const b = bEdges.find((x) => x.id === e.id); return b && JSON.stringify(b) !== JSON.stringify(e) })
ck(edgeModified.length === 0, '边：无被修改', edgeModified.map((e) => e.id).join(','))

// ═══ C · 零造数据：新增行必须逐字来自备份里的 DONOR ════════════════════════
H('C · 零造数据（由备份里的 DONOR 原文反推）')
const bDonorText = bPool[DONOR.ref].card.tabs[0].content
const bDonorLines = bDonorText.split('\n').map((x) => x.trim()).filter(Boolean)
const bSurvLines = new Set()
for (const t of bPool[SURVIVOR.ref].card.tabs) for (const ln of t.content.split('\n')) if (ln.trim()) bSurvLines.add(ln.trim())
if ((bPool[SURVIVOR.ref].card.rootContent ?? '').trim()) bSurvLines.add(bPool[SURVIVOR.ref].card.rootContent.trim())

const newLines = new Map() // line -> 出处 tab
for (const t of S1.card.tabs) for (const ln of t.content.split('\n')) {
  const s = ln.trim(); if (s && !bSurvLines.has(s)) newLines.set(s, (newLines.get(s) ?? []).concat(t.id))
}
for (const ln of (S1.card.rootContent ?? '').split('\n')) { const s = ln.trim(); if (s && !bSurvLines.has(s)) newLines.set(s, (newLines.get(s) ?? []).concat('rootContent')) }
// ⚠️ 判据必须是「DONOR 原文的**子串**」，不是「等于 DONOR 某整行」——
//    tab 把 DONOR 的 `- 签名：说明` 拆成了「说明」与「签名」两行，整行相等永远不成立。
//    并集行（`sigA ／ sigB ／ sigC`）另立规则：每个分片须属于 DONOR ∪ SURVIVOR-before，
//    且**至少一个分片来自 DONOR**（否则等于没做并集）。
const bSurvArr = [...bSurvLines]
const untraceable = []
let donorFrag = 0
let survFrag = 0
for (const ln of newLines.keys()) {
  const clean = ln.replace(/`/g, '')
  const frags = clean.includes(' ／ ') ? clean.split(' ／ ').map((s) => s.trim()).filter(Boolean) : [clean.trim()]
  let fromDonor = 0
  for (const f of frags) {
    if (bDonorText.includes(f)) { fromDonor++; donorFrag++ }
    else if (bSurvArr.some((l) => l.includes(f))) survFrag++
    else untraceable.push(f)
  }
  if (frags.length > 1 && fromDonor === 0) untraceable.push('[并集行缺 DONOR 分片] ' + clean)
}
ck(untraceable.length === 0, `新增 ${newLines.size} 行的每个分片都可回溯（DONOR 原文 ∪ SURVIVOR 原内容）`, untraceable.slice(0, 6).join(' | '))
console.log(`  （分片来源：来自 DONOR ${donorFrag} · 来自 SURVIVOR 原内容 ${survFrag}${untraceable.length ? ' · ⛔ 无来源 ' + untraceable.length : ''}）`)
// 负对照：判据必须能证伪 —— DONOR 里**不存在**的串必须被判为不可回溯
const negCtrl = ['static boolean notExists(Path path, LinkOption... options)', 'SPARSE', 'Files工具类']
const negPass = negCtrl.every((s) => !bDonorText.includes(s))
ck(negPass, `负对照：${negCtrl.length} 个「DONOR 中不存在」的串确实命中不了（判据非恒真）`, negCtrl.filter((s) => bDonorText.includes(s)).join(' | '))
// 独立的反向证据：新增行里不得出现 GUIDE 的任何正文（证明 GUIDE 是纯删）
const bGuideText = bPool[GUIDE.ref].card.rootContent ?? ''
const guideLeak = [...newLines.keys()].filter((ln) => ln.replace(/^`|`$/g, '').length > 8 && bGuideText.includes(ln.replace(/^`|`$/g, '')) && !bDonorText.includes(ln.replace(/^`|`$/g, '')))
ck(guideLeak.length === 0, '新增行零 GUIDE 泄漏（GUIDE 是纯删，未迁入任何内容）', guideLeak.slice(0, 4).join(' | '))

// ═══ D · 零丢失：改动前的内容是否都还有归处 ═══════════════════════════
H('D · 零丢失（SURVIVOR 侧签名与正文）')
const bTabs = new Map(bPool[SURVIVOR.ref].card.tabs.map((t) => [t.id, t]))
const aTabs = new Map(S1.card.tabs.map((t) => [t.id, t]))
const missingTabs = [...bTabs.keys()].filter((id) => !aTabs.has(id))
ck(missingTabs.length === 0, `SURVIVOR 原有 ${bTabs.size} 个 tab 一个不少`, missingTabs.join(','))
// 27 个重叠方法的签名键：before ⊆ after
const overlapIds = [...bTabs.keys()].filter((id) => METHOD_RE.test(bTabs.get(id).label ?? '') && bDonorText.includes(id + '('))
const sigLost = []
for (const id of overlapIds) {
  const bKeys = new Set([...bTabs.get(id).content.matchAll(/`([^`]+)`/g)].flatMap((m) => readParams(m[1], id)).map((p) => sigKey(id, p)))
  const aKeys = new Set([...aTabs.get(id).content.matchAll(/`([^`]+)`/g)].flatMap((m) => readParams(m[1], id)).map((p) => sigKey(id, p)))
  for (const k of bKeys) if (!aKeys.has(k)) sigLost.push(id + ':' + k)
}
ck(sigLost.length === 0, `27 个重叠方法的原有签名 ${overlapIds.length} 个 tab 全部保留（取并集不覆盖）`, sigLost.slice(0, 5).join(' | '))
// 正文：after 的 prose 要么等于 before，要么逐字等于 DONOR 某行 prose
const proseBad = []
for (const [id, t] of aTabs) {
  const b = bTabs.get(id); if (!b || !METHOD_RE.test(t.label ?? '')) continue
  const aProse = t.content.split('\n').filter((x) => x.trim() && !x.startsWith('`')).map((x) => x.trim())
  const bProse = b.content.split('\n').filter((x) => x.trim() && !x.startsWith('`')).map((x) => x.trim())
  for (const p of aProse) {
    const donorHas = bDonorLines.some((l) => l.includes('：' + p))
    if (!bProse.includes(p) && !donorHas) proseBad.push(id + ':' + p)
  }
}
ck(proseBad.length === 0, '所有 tab 的正文行：或原样保留、或逐字取自 DONOR（无自创文案）', proseBad.slice(0, 5).join(' | '))
// rootContent / tags 的单调性
const bRoot = bPool[SURVIVOR.ref].card.rootContent ?? ''
ck(S1.card.rootContent.startsWith(bRoot), 'rootContent 保留原句（前缀未变）', S1.card.rootContent.slice(0, 30))
const bTags = bPool[SURVIVOR.ref].tags ?? []
ck(bTags.every((t) => S1.tags.includes(t)), `原 tags ${bTags.length} 个全部保留`, bTags.filter((t) => !S1.tags.includes(t)).join(','))
ck(JSON.stringify(S1.tags) === JSON.stringify([...bTags, 'java.nio.file', 'NIO', '文件操作']), 'tags = 原 4 + 裁决的 3 个', JSON.stringify(S1.tags))

// ═══ E · DONOR 覆盖度（每行的落点分桶）══════════════════════════════════
H('E · DONOR 覆盖度（逐行落点分桶，查无声丢失）')
const aAll = S1.card.tabs.map((t) => t.content).join('\n') + '\n' + S1.card.rootContent + '\n' + S1.tags.join(' ')
const aOptions = aTabs.get('options')?.content ?? ''
const aWatch = aTabs.get('watch-service')?.content ?? ''
/** 结构化「该 DONOR 行是否已落点」：方法名 → tab 存在，且**签名与说明**都在该 tab 里 */
function rowLanded(ln) {
  const body = ln.replace(/^-\s*/, '')
  const ci = body.search(/[：:]/)
  const sigPart = ci >= 0 ? body.slice(0, ci) : body
  const prose = ci >= 0 ? body.slice(ci + 1) : ''
  const m = sigPart.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/)
  if (!m) return false
  const name = m[1]
  const tab = aTabs.get(name)
  if (!tab) return false
  const params = readParams(sigPart, name)
  const sigOk = params.length ? tab.content.includes(name + '(' + params[0] + ')') : tab.content.includes(name + '()')
  const proseOk = !prose || tab.content.includes(prose)
  return sigOk && proseOk
}
const buckets = { migrated: [], equivalent: [], skeleton: [], unknown: [] }
const enumHs = ['CopyOption：', 'OpenOption：']
const viewRe = /^[A-Z][A-Za-z0-9_]*View\s*[：:]/
for (const ln of bDonorLines) {
  const body = ln.replace(/^-\s*/, '')
  if (aAll.includes(ln) || aAll.includes(body) || aOptions.includes(ln) || aWatch.includes(ln) || rowLanded(ln)) { buckets.migrated.push(ln); continue }
  if (/^【.+】$/.test(ln)) { buckets.skeleton.push(ln); continue }
  if (enumHs.includes(ln)) { buckets.migrated.push(ln); continue }
  if (viewRe.test(body) || /^属性视图[：:]$/.test(ln)) { buckets.skeleton.push(ln); continue }
  // 重叠方法的说明行：prose 与 SURVIVOR 侧判等 ⇒ 丢弃
  const ci = body.search(/[：:]/)
  const name = (body.slice(0, ci > 0 ? ci : body.length).match(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/) ?? [])[1]
  if (name && aTabs.has(name)) { buckets.equivalent.push(ln); continue }
  buckets.unknown.push(ln)
}
console.log(`  DONOR 共 ${bDonorLines.length} 行`)
console.log(`    ① 逐字迁入 SURVIVOR : ${buckets.migrated.length}`)
console.log(`    ② 判等丢弃（27 重叠方法行）: ${buckets.equivalent.length}`)
console.log(`    ③ 骨架丢弃（分节标题/视图类引用）: ${buckets.skeleton.length}`)
console.log(`    ④ ⚠️ 未归类: ${buckets.unknown.length}`)
if (buckets.unknown.length) buckets.unknown.forEach((x) => console.log('       · ' + x))
ck(buckets.unknown.length === 0, 'DONOR 每一行都有明确落点（迁入/判等/骨架），无无声丢失', String(buckets.unknown.length))
ck(buckets.migrated.length + buckets.equivalent.length + buckets.skeleton.length === bDonorLines.length,
  `三桶合计 = DONOR 行数 ${bDonorLines.length}`, String(buckets.migrated.length + buckets.equivalent.length + buckets.skeleton.length))
// 27 重叠方法行的「判等」需要独立证据：其签名或正文必须在 SURVIVOR 侧找到同义落点
function firstChunk(s) { return stripPunct(String(s).split(/[（(]/)[0]) }
const equivNoHome = buckets.equivalent.filter((ln) => {
  const body = ln.replace(/^-\s*/, '')
  const ci = body.search(/[：:]/)
  const name = (body.slice(0, ci > 0 ? ci : body.length).match(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/) ?? [])[1]
  if (!name) return true
  const tab = aTabs.get(name)
  if (!tab) return true
  const prose = ci > 0 ? body.slice(ci + 1) : ''
  const sKeys = [...tab.content.matchAll(/`([^`]+)`/g)].flatMap((m) => readParams(m[1], name)).map((p) => sigKey(name, p))
  const dParams = readParams(body, name)
  const sigSame = dParams.length ? sKeys.includes(sigKey(name, dParams[0])) : true
  const bodyStripped = stripPunct(tab.content)
  const proseSame = !prose || bodyStripped.includes(stripPunct(prose)) || (firstChunk(prose).length >= 4 && bodyStripped.includes(firstChunk(prose).slice(0, 4)))
  return !(sigSame || proseSame)
})
ck(equivNoHome.length === 0, `判等丢弃的 ${buckets.equivalent.length} 行都有同义落点（真判等，非丢失）`, equivNoHome.slice(0, 5).join(' | '))

// ═══ 汇总 ═══════════════════════════════════════════════════════════════
const pass = CHK.every((c) => c.ok)
H(`F · 结论（${CHK.filter((c) => c.ok).length}/${CHK.length}）`)
for (const c of CHK) console.log('  ' + (c.ok ? '✅' : '⛔') + ' ' + c.msg)
console.log('\n' + (pass ? '✅ INDEPENDENT_VERIFY_PASS' : '⛔ VERIFY_FAILED'))
process.exit(pass ? 0 : 3)
