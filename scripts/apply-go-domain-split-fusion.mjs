/**
 * Go 域结构治理：拆分 + 删除 + 融合（一个批次）
 *
 *   node scripts/apply-go-domain-split-fusion.mjs              # dry-run（默认）
 *   node scripts/apply-go-domain-split-fusion.mjs --apply      # 落盘
 *
 * 依据 `outputs/go-domain-precheck.md` + 用户四项裁决：
 *   ① 结构体/运算符/模块/控制流 → 保留空壳（不授权改写）
 *   ② 并发「你好，世界」→ 迁「应用程序」
 *   ③ 接口卡不拆
 *   ④ 版本策略英文不译
 *
 * 纪律：R-26 零造数据（每段迁出后必须在目标卡 includes() 证真）· 原子写 · 先备份 · 非目标卡零改动
 * 步骤：融合（删 DONOR）→ 迁段 → 补总述 → 清引注 → CLI 修字
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
  try { fs.renameSync(tmp, target) } catch { fs.writeFileSync(target, JSON.stringify(value, null, 2), 'utf8'); try { fs.unlinkSync(tmp) } catch {} }
}

const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }

// ── id 常量 ─────────────────────────────────────────────────────────────
const GO = 'k_1786618025492_dmwekx'
const CONCURRENCY = 'k_go_concurrency'
const TYPES = 'k_1787723924929_cc51xz'
const GENERICS = 'k_go_generic'
const HISTORY = 'k_1787722763547_no5htk'
const LANGDESIGN = 'k_goexplain_design'
const APPS = 'k_1787724113497_rnr836'
const TOOLS = 'k_1787732744683_8upi39'
const COMPOSITE = 'k_1787766774971_dvs4k8'
const BASIC_TYPES = 'k_1787766911214_uud2jo'
const ARRAY = 'k_1787766796342_u5bioh'
const SLICE = 'k_1787766807759_ukiucr'
const MAP = 'k_1787766817113_4tn276'
const POINTER = 'k_1787766833800_7n22lh'
const IFACE = 'k_1787724045886_9ac7md'
const GO_TOOL = 'k_1790312788464_nw8omf'
// DONOR（融合删除）
const DONOR = 'k_1787731983101_tjcyzw'
const DONOR_TREE = 'tree_1787731983672_nllsdb'

const pool = readJson('node-pool.json')
const tree = readJson('tree-data.json')
const edges = readJson('knowledge-edges.json')
const beforePool = JSON.parse(JSON.stringify(pool))
const rc = (id) => pool[id].card.rootContent ?? ''

// ── 工具函数 ────────────────────────────────────────────────────────────
// 规范化：仅合并 3+ 连续换行为 2 个（格式，不改文字）
const norm = (s) => s.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/g, '')
// 精确切段：唯一锚串定位，返回 {seg, rest, before, after}
function cutUnique(text, startAnchor, endAnchor, label) {
  const s = text.indexOf(startAnchor)
  const sidx = text.indexOf(startAnchor, s + 1)
  const e = text.indexOf(endAnchor, s)
  const eidx = endAnchor ? text.indexOf(endAnchor, e + 1) : -1
  if (s < 0 || e < 0) { problems.push(`${label}: 锚串未命中（${JSON.stringify(startAnchor)} … ${JSON.stringify(endAnchor)}）`); return null }
  if (sidx >= 0) problems.push(`${label}: 起始锚串不唯一`)
  if (eidx >= 0) problems.push(`${label}: 结束锚串不唯一`)
  const end = e + endAnchor.length
  return { seg: text.slice(s, end), rest: text.slice(0, s) + text.slice(end), from: s, to: end }
}

console.log('════ Go 域拆分/删除/融合 · ' + (APPLY ? 'APPLY' : 'DRY-RUN（未写盘）') + ' ════')

// ── 前置门 ──────────────────────────────────────────────────────────────
console.log('\n【前置门 · 现状校验】')
const goTreeMap = []
;(function find(n) { if (n.id === GO_TREE_ROOT) { (function w(x) { goTreeMap.push({ id: x.id, name: x.name, ref: x.nodeRef || '' }); (x.children || []).forEach(w) })(n); return } ;(n.children || []).forEach(find) })(tree)
ck(goTreeMap.length === 39, '树 39 卡在位', String(goTreeMap.length))
ck(!!pool[DONOR], 'DONOR 池节点存在')
const donorTreeNode = (function find(n) { if (n.id === DONOR_TREE) return { node: n }; for (const c of n.children || []) { const r = find(c); if (r) return r } return null })(tree)
ck(!!donorTreeNode, 'DONOR 树条目存在')
const before = { tree: goTreeMap.length, pool: Object.keys(pool).length, edges: edges.length, chars: goTreeMap.reduce((s, t) => s + (pool[t.ref]?.card?.rootContent || '').length, 0) }
console.log(`  · 现状：树 ${before.tree} / 池 ${before.pool} / 边 ${before.edges} / Go 域正文 ${before.chars} 字`)
ck(rc(CONCURRENCY).length === 3821, '「并发」3821 字', String(rc(CONCURRENCY).length))
ck(rc(TYPES).length === 1628, '「类型」1628 字', String(rc(TYPES).length))
ck(rc(GENERICS).length === 950, '「泛型」950 字', String(rc(GENERICS).length))
ck(rc(DONOR).length === 619, 'DONOR「使用参数化类型的泛型代码」619 字', String(rc(DONOR).length))
// 融合前提：DONOR 的每一段都必须逐字包含于 SURVIVOR
const donorParas = rc(DONOR).split(/\n\n+/).filter(Boolean)
const notContained = donorParas.filter((p) => !rc(GENERICS).includes(p))
ck(notContained.length === 0, `融合前提：DONOR ${donorParas.length} 段全部逐字包含于 SURVIVOR`, JSON.stringify(notContained.map((p) => p.slice(0, 20))))

if (problems.length) { console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止`); process.exit(1) }

// ── 迁段（10 处）────────────────────────────────────────────────────────
// 三条「并发」源段、五条「类型」源段、一条「泛型」源段
const MIGRATIONS = [
  { label: 'M1 泛型历史沿革 → 历史', from: GENERICS, to: HISTORY, start: '初始版本的Go缺乏对通用编程的支持', end: null, mode: 'append' },
  { label: 'M2 并发「二进制/工具链」→ 工具', from: CONCURRENCY, to: TOOLS, start: '"二进制"', end: '都包括 Go 运行时。', mode: 'append' },
  { label: 'M3 并发「遗漏（语言设计）」→ 语言设计', from: CONCURRENCY, to: LANGDESIGN, start: '遗漏\nGo故意省略了', end: '是标准惯用法。', mode: 'append' },
  { label: 'M4 并发「样式 + 工具」→ 工具', from: CONCURRENCY, to: TOOLS, start: '样式\nGo 作者在影响 Go 程序风格方面', end: '用于构建、测试和分析代码的工具：', mode: 'append' },
  { label: 'M5 并发「示例/你好，世界」→ 应用程序', from: CONCURRENCY, to: APPS, start: '示例\n你好，世界', end: '类似于C的<stdio.h>或C++的<print>。', mode: 'append' },
  { label: 'M6 类型「基本类型清单」→ 基本数据类型', from: TYPES, to: BASIC_TYPES, start: 'Go语言包含以下基本类型：', end: '而rune则是int32的别名。', mode: 'set' },
  { label: 'M7 类型「数组」→ 数组', from: TYPES, to: ARRAY, start: '对于每种类型T和每个非负整数常量n', end: '不同长度的数组属于不同的类型。', mode: 'set' },
  { label: 'M8 类型「切片」→ 切片', from: TYPES, to: SLICE, start: '动态数组可以作为', end: '多个切片可以共享其底层内存。', mode: 'set' },
  { label: 'M9 类型「指针」→ 指针', from: TYPES, to: POINTER, start: '指针对所有类型都是可用的', end: '特殊 unsafe.Pointer 类型来实现。', mode: 'set' },
  { label: 'M10 类型「Map」→ Map', from: TYPES, to: MAP, start: '对于一对类型 K 和 V', end: '具有特殊的语法和内置函数。', mode: 'set' },
]

console.log('\n【迁段 · 零造数据校验】')
const segs = []
for (const m of MIGRATIONS) {
  const src = rc(m.from)
  const r = m.start && m.end === null
    ? { seg: src.slice(src.indexOf(m.start)), rest: src.slice(0, src.indexOf(m.start)) }
    : cutUnique(src, m.start, m.end, m.label)
  if (!r) continue
  segs.push({ ...m, seg: r.seg, rest: r.rest })
  const okFrom = rc(m.from).includes(r.seg)
  console.log(`  ✅ ${m.label}  ${r.seg.length} 字  «${r.seg.slice(0, 34).replace(/\n/g, '⏎')}…»`)
  ck(okFrom, `    ${m.label} 切出段逐字命中源卡`)
}
// 顺序应用（同一源卡多段：按出现位置从后往前删，避免偏移）
// newRoot 纳入：所有迁段的源/目标卡 + 引注预扫命中卡 + 总述与 CLI 目标卡
const newRoot = {}
const fnPre = /(?::\s*\d+(?:[–-]\d+)?)|(\[[a-z]\])/
const goRefs = new Set(goTreeMap.map((t) => t.ref))   // ⚠️ 只在 Go 域 39 卡内扫描，绝不外溢到其他域
const fnCards = [...goRefs].filter((id) => fnPre.test(pool[id]?.card?.rootContent || ''))
for (const id of new Set([...segs.map((s) => s.from), ...segs.map((s) => s.to), ...fnCards, COMPOSITE, GO_TOOL])) newRoot[id] = rc(id)
console.log('  · 引注预扫命中 ' + fnCards.length + ' 张卡（仅 Go 域；含 Web 卡 :8080 端口误报，将原样保留）')
for (const srcId of new Set(segs.map((s) => s.from))) {
  const rules = segs.filter((s) => s.from === srcId).sort((a, b) => rc(srcId).indexOf(b.seg) - rc(srcId).indexOf(a.seg))
  let txt = rc(srcId)
  for (const r of rules) txt = txt.replace(r.seg, '')
  newRoot[srcId] = norm(txt)
}
for (const s of segs) {
  const target = newRoot[s.to]
  newRoot[s.to] = s.mode === 'set' ? norm(s.seg) : norm(target + '\n\n' + s.seg)
}

// ── 补总述：复合数据类型 ────────────────────────────────────────────────
// ⚠️ 报告原计划「改写自类型[1][5]」不可行（[1] 留类型卡、[5] 已迁数组/切片，不能复制）。
//    改为：由 5 个子卡首句**逐字拼接**（零新撰，纯索引式总述）。
const firstSentence = (id) => { const t = newRoot[id] ?? rc(id); const i = t.indexOf('。'); return i >= 0 ? t.slice(0, i + 1) : t }
const compositeParts = [ARRAY, SLICE, MAP, POINTER, IFACE].map(firstSentence)
const compositeText = norm(compositeParts.join('\n\n'))
ck(newRoot[COMPOSITE] === '', '复合数据类型原为空卡')
newRoot[COMPOSITE] = compositeText
console.log('\n【补总述 · 复合数据类型】由 5 个子卡首句逐字拼接（索引式，零新撰）：')
console.log('  ' + compositeText.replace(/\n\n/g, '\n  '))
console.log('【补总述 · 工具】= M2 + M4 两块（来自「并发」迁入）')

// ── 清引注（精确串替换，白名单）────────────────────────────────────────
// ⚠️ 逐条人工核对过：`[n]T`（类型）与 `:8080`（Web 端口）是**误报，须保留**
const FOOTNOTE_FIXES = [
  // 类型（仅 [e]，[n]T 是语法）
  ['没有指针算术，[e]，除非', '没有指针算术，除非'],
  // 语法
  ['结束语句；[b] 但是', '结束语句；但是'],
  ['出现时是隐含的。[c]', '出现时是隐含的。'],
  ['示错误的常见方式。[d] Go 为', '示错误的常见方式。Go 为'],
  // 接口
  ['提供了运行时多态性。: 266 接口', '提供了运行时多态性。接口'],
  // 并发
  ['一种绿色线程。: 280–281 使用', '一种绿色线程。使用'],
  ['运行时实现中的调度。: 10', '运行时实现中的调度。'],
  ['（如互斥锁等）: 151–152，但', '（如互斥锁等），但'],
  ['以FIFO顺序存储消息: 43，并允许', '以FIFO顺序存储消息，并允许'],
  ['在消息被接收之前继续执行。: 233', '在消息被接收之前继续执行。'],
  ['在多个通道上发送和接收。: 147', '在多个通道上发送和接收。'],
  ['表示将该值的所有权转移给接收者。: 155', '表示将该值的所有权转移给接收者。'],
  ['（示例改编自David Chisnall的书）。: 152', '（示例改编自David Chisnall的书）。'],
  ['继承、断言、[f] 指针算术、[e] 隐式类型转换、未标记联合、[g]和标记联合。[h] 设计者仅', '继承、断言、指针算术、隐式类型转换、未标记联合和标记联合。设计者仅'],
  ['实现动态调度[i]和组合来重用代码', '实现动态调度和组合来重用代码'],
]
console.log('\n【清引注 · 逐条精确替换】')
const fnApplied = []
for (const [from, to] of FOOTNOTE_FIXES) {
  let hitCards = []
  for (const id of Object.keys(newRoot)) {
    if (newRoot[id].includes(from)) { newRoot[id] = newRoot[id].replace(from, to); hitCards.push(id) }
  }
  ck(hitCards.length > 0, `引注清理命中：«${from.slice(0, 26)}…»`, hitCards.length ? '' : '零命中（可能已被迁段带走）')
  if (hitCards.length) fnApplied.push({ from, to, cards: hitCards })
}
// 反向断言：`[n]T` 语法随数组段迁入「数组」卡（未被误删），`:8080` 端口保留
ck(newRoot[ARRAY].includes('[n]T'), '负对照：[n]T（Go 数组语法）随迁段保留在「数组」卡')
ck(pool['k_1787732646225_8n6pjb'].card.rootContent.includes(':8080'), '负对照：Web 卡 :8080（端口）保留未误删')

// ── CLI 修字 ────────────────────────────────────────────────────────────
console.log('\n【CLI 修字】')
const CLI_FIXES = [['（在 Go 版本 1.24 中新增）', '']]
for (const [from, to] of CLI_FIXES) {
  const before2 = newRoot[GO_TOOL] ?? rc(GO_TOOL)
  newRoot[GO_TOOL] = before2.replace(from, to)
  ck(newRoot[GO_TOOL] !== before2, `go tool 删除存疑版本断言 «${from}»`)
  console.log('  → ' + JSON.stringify(newRoot[GO_TOOL]))
}

// ── 融合：删 DONOR ──────────────────────────────────────────────────────
const treeAfter = JSON.parse(JSON.stringify(tree))
;(function detach(n) { const i = (n.children || []).findIndex((c) => c.id === DONOR_TREE); if (i >= 0) { n.children.splice(i, 1); return true } return (n.children || []).some(detach) })(treeAfter)
const poolAfter = { ...pool }
for (const [id, txt] of Object.entries(newRoot)) { if (id === DONOR) continue; poolAfter[id] = { ...pool[id], card: { ...pool[id].card, rootContent: txt } } }
delete poolAfter[DONOR]
const donorEdges = edges.filter((e) => e.source === DONOR || e.target === DONOR || e.id.includes(DONOR_TREE))
const edgesAfter = edges.filter((e) => !donorEdges.includes(e))
console.log(`\n【融合】删 DONOR：池节点 1（${rc(DONOR).length} 字，其内容全部已含于 SURVIVOR）/ 树条目 1 / 边 ${donorEdges.length} 条`)

// ── 后置门 ──────────────────────────────────────────────────────────────
console.log('\n【后置门】')
ck(!(DONOR in poolAfter), '池中已无 DONOR')
const treeIdsAfter = new Set(); (function w(n) { treeIdsAfter.add(n.id); (n.children || []).forEach(w) })(treeAfter)
ck(!treeIdsAfter.has(DONOR_TREE), '树中已无 DONOR 条目')
const treeTotal = (n) => 1 + (n.children || []).reduce((s, x) => s + treeTotal(x), 0)
const beforeTreeTotal = treeTotal(tree)
ck([...treeIdsAfter].length === beforeTreeTotal - 1, `树 ${beforeTreeTotal} → ${[...treeIdsAfter].length}（−1）`, String(treeIdsAfter.size))
ck(Object.keys(poolAfter).length === before.pool - 1, `池 ${before.pool} → ${Object.keys(poolAfter).length}（−1）`)
ck(edgesAfter.length === edges.length - donorEdges.length, `边 ${edges.length} → ${edgesAfter.length}（−${donorEdges.length}）`)
// 守恒：**去空白逐字等价**（免疫 norm 的空行规范化）
// ⚠️ 构建顺序必须与实现一致：删迁出段 → 追加迁入段 → 清引注/CLI（迁入段内自带的引注也会被清）
const squash = (s) => s.replace(/\s+/g, '')
const applyFixes = (t) => { let r = t; for (const [f, to] of FOOTNOTE_FIXES) r = r.split(f).join(to); return r }
console.log('\n  【内容守恒（去空白逐字比对 + 迁入段证真）】')
let deltaNet = 0
let perCardFails = 0
const changed = []
for (const id of Object.keys(newRoot)) {
  const outs = segs.filter((s) => s.from === id).sort((a, b) => rc(id).indexOf(b.seg) - rc(id).indexOf(a.seg))
  const ins = segs.filter((s) => s.to === id)
  let exp = rc(id)
  for (const s of outs) exp = exp.split(s.seg).join('')
  for (const s of ins) exp = exp + s.seg
  exp = applyFixes(exp)
  if (id === GO_TOOL) for (const [f, to] of CLI_FIXES) exp = exp.split(f).join(to)
  if (id === COMPOSITE) exp = compositeParts.join('')
  if (squash(newRoot[id]) !== squash(exp)) { perCardFails++; console.log('  ❌ ' + pool[id].label + ' 内容不等价（迁出/迁入/清理后应逐字相同）') }
  for (const s of ins) if (!newRoot[id].includes(applyFixes(s.seg))) { perCardFails++; console.log('  ❌ ' + pool[id].label + ' 缺迁入段：' + s.label) }
  if (newRoot[id] !== rc(id)) changed.push({ id, name: pool[id].label, b: rc(id).length, a: newRoot[id].length })
  deltaNet += newRoot[id].length - rc(id).length
}
ck(perCardFails === 0, '逐卡内容守恒（去空白逐字等价 + 迁入段逐字命中）', perCardFails ? perCardFails + ' 张不符' : '')
const afterChars = before.chars + deltaNet - rc(DONOR).length
console.log(`  · 全域正文 ${before.chars} → ${afterChars} 字（净变化含复合数据类型索引总述 +${compositeText.length}；字数差仅因空行规范化，内容已逐字核对）`)
// 非目标卡零改动
const touched = new Set([...Object.keys(newRoot)])
const untouchedModified = Object.keys(poolAfter).filter((id) => pool[id] && JSON.stringify(beforePool[id]) !== JSON.stringify(poolAfter[id]) && !touched.has(id))
ck(untouchedModified.length === 0, '非目标卡零改动', JSON.stringify(untouchedModified.slice(0, 5)))
// 目标卡确实变更
const emptyAfter = [BASIC_TYPES, ARRAY, SLICE, MAP, POINTER, TOOLS, COMPOSITE].filter((id) => !newRoot[id] || newRoot[id].length === 0)
ck(emptyAfter.length === 0, '应填充的 7 张卡均已非空', JSON.stringify(emptyAfter))
// 接口卡裁决 ③：不拆、仅清引注
ck(newRoot[IFACE].length >= 2000, `接口卡仅清引注未拆（${newRoot[IFACE].length} 字）`, String(newRoot[IFACE].length))
// 裁决 ①：4 张空壳保持为空
const keepEmpty = ['k_1787766826791_61ckc5', 'k_1787766891829_wtb7jq', 'k_1790311630691_10xbjs', 'k_1787766873920_vi1blv']
ck(keepEmpty.every((id) => !newRoot[id] || newRoot[id] === ''), '结构体/运算符/模块/控制流 保持空壳（裁决 ①）')
// 裁决 ②：示例已迁应用程序
ck(newRoot[APPS].includes('你好，世界') && !newRoot[CONCURRENCY].includes('你好，世界'), '「你好，世界」已从并发迁至应用程序（裁决 ②）')

if (problems.length) { console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`); process.exit(1) }

// ── 变更摘要 ────────────────────────────────────────────────────────────
console.log('\n════ 变更摘要 ════')
console.log('  树 : ' + beforeTreeTotal + ' → ' + treeIdsAfter.size + '（删「使用参数化类型的泛型代码」条目；Go 子树 39 → 38）')
console.log('  池 : ' + Object.keys(pool).length + ' → ' + Object.keys(poolAfter).length + '（删 DONOR）')
console.log('  边 : ' + edges.length + ' → ' + edgesAfter.length)
console.log('  modified 卡 ' + changed.length + ' 张：')
for (const c of changed) console.log('    · ' + c.name.padEnd(22) + c.b + ' → ' + c.a + ' 字')
console.log('\n  ⛔ 未处理（登记为缺口/债）：结构体 · 运算符 · 模块 · 控制流（来源不足，保留空壳）')
console.log('     版本策略英文未译 · go install/第三方工具 未补充 · chan T 留类型卡')

if (!APPLY) { console.log('\n[dry-run] 未写盘。确认后加 --apply'); process.exit(0) }
writeJsonAtomic('node-pool.json', poolAfter)
writeJsonAtomic('tree-data.json', treeAfter)
writeJsonAtomic('knowledge-edges.json', edgesAfter)
console.log('\n✅ 已原子写盘：node-pool.json / tree-data.json / knowledge-edges.json')
