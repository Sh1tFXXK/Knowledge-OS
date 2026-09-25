/**
 * 独立验证：Go 域拆分/删除/融合（从备份反推，不 import apply 脚本）
 *
 *   node scripts/verify-go-domain-split-fusion.mjs [备份目录名]
 *
 * 判据全部由「改前备份」与「当前盘面」反推，不复用 apply 的内存态。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'data')
const BK = process.argv[2] || fs.readdirSync(path.join(DATA, 'backups')).filter((d) => d.startsWith('go-split-fusion-')).sort().pop()
const BAK = path.join(DATA, 'backups', BK)

const readCur = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'))
const readBak = (n) => JSON.parse(fs.readFileSync(path.join(BAK, n), 'utf8'))

const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }

console.log(`# 独立验证：Go 域拆分/删除/融合（基准 ${BK}）\n`)

const treeB = readBak('tree-data.json'), treeA = readCur('tree-data.json')
const poolB = readBak('node-pool.json'), poolA = readCur('node-pool.json')
const edgeB = readBak('knowledge-edges.json'), edgeA = readCur('knowledge-edges.json')

const GO_ROOT = 'tree_1786618025853_3qn55e'
const DONOR = 'k_1787731983101_tjcyzw'
const DONOR_TREE = 'tree_1787731983672_nllsdb'

const collect = (t) => { const m = new Map(); (function w(n, p) { m.set(n.id, { node: n, parent: p }); (n.children || []).forEach((c) => w(c, n)) })(t, null); return m }
const flatB = collect(treeB), flatA = collect(treeA)
const goRefsB = []
;(function w(n) { if (n.id === GO_ROOT) return (function x(y) { goRefsB.push(y.nodeRef); (y.children || []).forEach(x) })(n); (n.children || []).forEach(w) })(treeB)

console.log('══ A. 删除完整性 ══')
ck(!(DONOR in poolA), 'DONOR 池节点已删')
ck(!flatA.has(DONOR_TREE), 'DONOR 树条目已删')
const donorEdgeIdsB = edgeB.filter((e) => e.source === DONOR || e.target === DONOR || e.id.includes(DONOR_TREE)).map((e) => e.id)
ck(donorEdgeIdsB.length === 1, `改前 DONOR 关联边 1 条`, String(donorEdgeIdsB.length))
const edgeIdsA = new Set(edgeA.map((e) => e.id))
ck(donorEdgeIdsB.every((id) => !edgeIdsA.has(id)), 'DONOR 边已删')
ck(edgeA.filter((e) => e.source === DONOR || e.target === DONOR).length === 0, '无悬空 DONOR 边')

console.log('\n══ B. 计数守恒 ══')
ck(flatA.size === flatB.size - 1, `树 ${flatB.size} → ${flatA.size}（−1）`)
ck(Object.keys(poolA).length === Object.keys(poolB).length - 1, `池 ${Object.keys(poolB).length} → ${Object.keys(poolA).length}（−1）`)
ck(edgeA.length === edgeB.length - 1, `边 ${edgeB.length} → ${edgeA.length}（−1）`)
const goTreesA = []
;(function w(n) { if (n.id === GO_ROOT) return (function x(y) { goTreesA.push(y.id); (y.children || []).forEach(x) })(n); (n.children || []).forEach(w) })(treeA)
ck(goTreesA.length === 38, `Go 子树 39 → ${goTreesA.length}`, String(goTreesA.length))

console.log('\n══ C. 迁段完整性（10 处，源卡已卸、目标卡已载）══')
const MIG = [
  ['M1', 'k_go_generic', 'k_1787722763547_no5htk', '初始版本的Go缺乏对通用编程的支持', '版本1.18中添加到Go中。'],
  ['M2', 'k_go_concurrency', 'k_1787732744683_8upi39', '"二进制"', '都包括 Go 运行时。'],
  ['M3', 'k_go_concurrency', 'k_goexplain_design', '遗漏\nGo故意省略了', '是标准惯用法。'],
  ['M4', 'k_go_concurrency', 'k_1787732744683_8upi39', '样式\nGo 作者在影响 Go 程序风格方面', '用于构建、测试和分析代码的工具：'],
  ['M5', 'k_go_concurrency', 'k_1787724113497_rnr836', '示例\n你好，世界', '类似于C的<stdio.h>或C++的<print>。'],
  ['M6', 'k_1787723924929_cc51xz', 'k_1787766911214_uud2jo', 'Go语言包含以下基本类型：', '而rune则是int32的别名。'],
  ['M7', 'k_1787723924929_cc51xz', 'k_1787766796342_u5bioh', '对于每种类型T和每个非负整数常量n', '不同长度的数组属于不同的类型。'],
  ['M8', 'k_1787723924929_cc51xz', 'k_1787766807759_ukiucr', '动态数组可以作为', '多个切片可以共享其底层内存。'],
  ['M9', 'k_1787723924929_cc51xz', 'k_1787766833800_7n22lh', '指针对所有类型都是可用的', '特殊 unsafe.Pointer 类型来实现。'],
  ['M10', 'k_1787723924929_cc51xz', 'k_1787766817113_4tn276', '对于一对类型 K 和 V', '具有特殊的语法和内置函数。'],
]
const FN = [
  ['没有指针算术，[e]，除非', '没有指针算术，除非'],
  ['结束语句；[b] 但是', '结束语句；但是'],
  ['出现时是隐含的。[c]', '出现时是隐含的。'],
  ['示错误的常见方式。[d] Go 为', '示错误的常见方式。Go 为'],
  ['提供了运行时多态性。: 266 接口', '提供了运行时多态性。接口'],
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
const fixes = (t) => { let r = t; for (const [f, to] of FN) r = r.split(f).join(to); return r }
const squash = (s) => s.replace(/\s+/g, '')
for (const [tag, from, to, a1, a2] of MIG) {
  const src = poolB[from].card.rootContent
  const s = src.indexOf(a1), e = src.indexOf(a2, s)
  const seg = s >= 0 && e >= 0 ? src.slice(s, e + a2.length) : null
  if (!seg) { ck(false, `${tag} 备份中定位不到源段`); continue }
  const cleaned = fixes(seg)
  ck(!squash(poolA[from].card.rootContent).includes(squash(cleaned)), `${tag} 源卡「${poolB[from].label}」已卸出该段`)
  ck(squash(poolA[to].card.rootContent).includes(squash(cleaned)), `${tag} 目标卡「${poolB[to].label}」已载入该段（${seg.length} 字）`)
}

console.log('\n══ D. 非目标卡零改动 / 目标卡确实变更 ══')
const changedB = []
const untouchedModified = []
for (const id of Object.keys(poolA)) {
  if (!poolB[id]) continue
  const same = JSON.stringify(poolA[id]) === JSON.stringify(poolB[id])
  if (!same) changedB.push(id)
}
// 目标卡 = 迁段源/目标 + 两个总述目标 + CLI 目标 + 两处「仅清引注」卡（接口、语法）
const TARGET = new Set([...MIG.map((m) => m[1]), ...MIG.map((m) => m[2]),
  'k_1787766774971_dvs4k8', 'k_1790312788464_nw8omf', 'k_1787724045886_9ac7md', 'k_goexplain_syntax'])
for (const id of changedB) if (!TARGET.has(id)) untouchedModified.push(poolA[id].label || id)
ck(untouchedModified.length === 0, '非目标卡零改动（仅 16 张目标卡变更）', JSON.stringify(untouchedModified))
console.log('  · 实际变更卡 ' + changedB.length + ' 张（含 4 张仅清引注）')

console.log('\n══ E. 引注清理与负对照 ══')
for (const [f] of FN) ck(!JSON.stringify(poolA).includes(f), `引注残留已清除：«${f.slice(0, 22)}…»`)
ck(poolA['k_1787766796342_u5bioh'].card.rootContent.includes('[n]T'), '负对照：[n]T 语法保留在「数组」卡')
ck(poolA['k_1787732646225_8n6pjb'].card.rootContent.includes(':8080'), '负对照：Web 卡 :8080 保留')
ck(!poolA['k_1790312788464_nw8omf'].card.rootContent.includes('1.24'), 'CLI 修字：go tool 已删存疑版本断言')
// 裁决 ①：4 张空壳仍为空
for (const [id, name] of [['k_1787766826791_61ckc5', '结构体'], ['k_1787766891829_wtb7jq', '运算符'], ['k_1790311630691_10xbjs', '模块'], ['k_1787766873920_vi1blv', '控制流']])
  ck((poolA[id].card.rootContent || '') === '', `裁决①：${name} 保持空壳`)
// 裁决 ③：接口未拆
ck(poolA['k_1787724045886_9ac7md'].card.rootContent.length >= 2000, '裁决③：接口卡仅清引注未拆')
// 裁决 ④：版本策略英文未动
ck(JSON.stringify(poolA['k_go_versioning']) === JSON.stringify(poolB['k_go_versioning']), '裁决④：版本策略未译（逐字节未动）')

console.log('\n══ F. 引用完整性 ══')
const VIRTUAL = /^(container:|concept_|tree_|demo_)/
const reach = (id, ids, p) => id in p || ids.has(id) || VIRTUAL.test(id)
const dangA = edgeA.filter((e) => !reach(e.source, flatA, poolA) || !reach(e.target, flatA, poolA))
const dangB = edgeB.filter((e) => !reach(e.source, flatB, poolB) || !reach(e.target, flatB, poolB))
ck(dangA.length <= dangB.length, `未新增悬空边（存量 ${dangB.length} → ${dangA.length}）`)
const orphan = []
;(function w(n) { if (n.nodeRef && !(n.nodeRef in poolA)) orphan.push(n.id); (n.children || []).forEach(w) })(treeA)
const orphanB = []
;(function w(n) { if (n.nodeRef && !(n.nodeRef in poolB)) orphanB.push(n.id); (n.children || []).forEach(w) })(treeB)
ck(orphan.length <= orphanB.length, `未新增悬空 nodeRef（存量 ${orphanB.length} → ${orphan.length}）`)

console.log('\n══ G. Ancestor Gate（差集 ⊆ 预期：Go 域 38 卡 + 相关边）══')
// HEAD 的 data 是「1b1f712 删除 Go 后」的状态 ⇒ 本批相对 HEAD 的净差集 = 把 Go 域 38 卡加回来
const headPool = JSON.parse(execFileSync('git', ['cat-file', 'blob', 'HEAD:data/node-pool.json'], { cwd: ROOT, maxBuffer: 1 << 30 }).toString('utf8'))
const headTree = JSON.parse(execFileSync('git', ['cat-file', 'blob', 'HEAD:data/tree-data.json'], { cwd: ROOT, maxBuffer: 1 << 30 }).toString('utf8'))
const goRefsA = new Set(goTreesA.map((id) => { const it = flatA.get(id); return it?.node.nodeRef }).filter(Boolean))
const poolAdded = Object.keys(poolA).filter((id) => !headPool[id])
const poolRemoved = Object.keys(headPool).filter((id) => !poolA[id])
const poolModified = Object.keys(poolA).filter((id) => headPool[id] && JSON.stringify(headPool[id]) !== JSON.stringify(poolA[id]))
ck(poolAdded.every((id) => goRefsA.has(id)), `池 added(${poolAdded.length}) 全部属 Go 域`, JSON.stringify(poolAdded.filter((id) => !goRefsA.has(id)).slice(0, 3)))
ck(poolRemoved.length === 0, '池 removed = 0', JSON.stringify(poolRemoved.slice(0, 3)))
ck(poolModified.every((id) => goRefsA.has(id)), `池 modified(${poolModified.length}) 全部属 Go 域`, JSON.stringify(poolModified.filter((id) => !goRefsA.has(id)).slice(0, 3)))
const flatH = collect(headTree)
const treeAdded = [...flatA.keys()].filter((id) => !flatH.has(id))
const treeRemoved = [...flatH.keys()].filter((id) => !flatA.has(id))
ck(treeAdded.every((id) => goTreesA.includes(id)), `树 added(${treeAdded.length}) 全部属 Go 子域`, JSON.stringify(treeAdded.filter((id) => !goTreesA.includes(id)).slice(0, 3)))
ck(treeRemoved.length === 0, '树 removed = 0（其余树未动）', JSON.stringify(treeRemoved.slice(0, 3)))
const headEdgeIds = new Set(JSON.parse(execFileSync('git', ['cat-file', 'blob', 'HEAD:data/knowledge-edges.json'], { cwd: ROOT, maxBuffer: 1 << 30 }).toString('utf8')).map((e) => e.id))
const edgeAdded = edgeA.filter((e) => !headEdgeIds.has(e.id))
const edgeRemoved = [...headEdgeIds].filter((id) => !edgeIdsA.has(id))
ck(edgeAdded.every((e) => goRefsA.has(e.source) || goRefsA.has(e.target)), `边 added(${edgeAdded.length}) 端点全属 Go 域`, String(edgeAdded.filter((e) => !(goRefsA.has(e.source) || goRefsA.has(e.target))).length))
ck(edgeRemoved.length === 0, '边 removed = 0', String(edgeRemoved.length))

console.log('\n# 结论: ' + (problems.length ? `❌ ${problems.length} 项不过` : '✅ 全部通过'))
process.exit(problems.length ? 1 : 0)
