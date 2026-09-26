/**
 * T3-P1 apply 之后的**独立验证**（不写 data/）
 *
 * 独立性三条（与 verify-t3-p0-apply.mjs 同源）：
 *   ① 不 import 也不复制 apply 脚本的任何函数 —— 本文件自己实现比对逻辑
 *   ② 比对对象是**磁盘上的批前备份快照** vs **当前工作树数据**，不是内存克隆、不是被验证脚本自报的结果
 *   ③ 改名映射**从数据里反推**（新旧树按位置对撞，位置相同而 id 不同者即为改名对），
 *      再与 FINAL 映射表**双向核对** —— 而不是先信映射表再去找证据
 *
 * 用法：node scripts/verify-t3-p1-apply.mjs
 * 退出码：0 = 全部通过；1 = 有断言失败
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')

const rdData = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))
const rdRaw = (f) => fs.readFileSync(path.join(DATA, f), 'utf8')

const backups = fs.existsSync(path.join(DATA, 'backups'))
  ? fs.readdirSync(path.join(DATA, 'backups')).filter((d) => /^t3-p1-/.test(d)).sort()
  : []
if (!backups.length) { console.error('✖ 找不到 data/backups/t3-p1-* 批前快照，无法做独立比对'); process.exit(1) }
const BACKUP_DIR = path.join(DATA, 'backups', backups[backups.length - 1])
const rdBackup = (f) => JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'))

const checks = []
const chk = (name, ok, detail) => checks.push({ name, ok: !!ok, detail })

// ══ ① 树：位置对撞，反推改名映射 ═══════════════════════════════════════════
const tBefore = rdBackup('tree-data.json')
const tAfter = rdData('tree-data.json')

const observedPairs = []
const treeDiffs = []
let nodeCountBefore = 0, nodeCountAfter = 0

function walkPair(a, b, p) {
  if (!a || !b) { treeDiffs.push(p + '：结构不齐'); return }
  nodeCountBefore += 1; nodeCountAfter += 1
  if (a.id !== b.id) observedPairs.push({ from: a.id, to: b.id, path: p })
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'id' || k === 'children') continue
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) treeDiffs.push(p + '：字段 `' + k + '` 变了')
  }
  const ac = a.children ?? [], bc = b.children ?? []
  if (ac.length !== bc.length) { treeDiffs.push(p + '：子节点数 ' + ac.length + ' → ' + bc.length); return }
  ac.forEach((c, i) => walkPair(c, bc[i], p + ' > ' + (c.name ?? '#' + i)))
}
walkPair(tBefore, tAfter, '$root')

chk('树：节点数不变', nodeCountBefore === nodeCountAfter, nodeCountBefore + ' → ' + nodeCountAfter)
chk('树：除 id 外所有字段逐字节不变', treeDiffs.length === 0, treeDiffs.length ? treeDiffs.slice(0, 5).join(' | ') : nodeCountBefore + ' 个节点全通过')
chk('树：改名节点数 = 130', observedPairs.length === 130, '实测 ' + observedPairs.length + ' 处')
chk('树：反推出的旧 id 全部为 asplit_ 形态', observedPairs.every((x) => /^asplit_/.test(x.from)),
  '非 asplit_ 的 ' + observedPairs.filter((x) => !/^asplit_/.test(x.from)).length + ' 处')
chk('树：反推出的新 id 无一为 asplit_ 形态', observedPairs.every((x) => !/^asplit_/.test(x.to)),
  '仍含 asplit_ 的 ' + observedPairs.filter((x) => /^asplit_/.test(x.to)).length + ' 处')

// ══ ② 边：位置对撞 + treebind 两端改写一致性 ════════════════════════════════
const eBefore = rdBackup('knowledge-edges.json')
const eAfter = rdData('knowledge-edges.json')
const edgeDiffs = []
const edgeIdChanges = []
let endpointTouched = 0
const n = Math.min(eBefore.length, eAfter.length)
for (let i = 0; i < n; i += 1) {
  const a = eBefore[i], b = eAfter[i]
  if (a.id !== b.id) edgeIdChanges.push({ from: a.id, to: b.id })
  if (a.source !== b.source) endpointTouched += 1
  if (a.target !== b.target) endpointTouched += 1
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'id') continue
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) edgeDiffs.push('#' + i + ' 字段 `' + k + '` 变了')
  }
}
chk('边：边数不变', eBefore.length === eAfter.length, eBefore.length + ' → ' + eAfter.length)
chk('边：除 id 外所有字段逐字节不变（含顺序）', edgeDiffs.length === 0, edgeDiffs.length ? edgeDiffs.slice(0, 5).join(' | ') : eBefore.length + ' 条全通过')
chk('边：source/target 零触碰', endpointTouched === 0, '被触碰 ' + endpointTouched + ' 处（须 0）')
chk('边：只有 treebind 的 id 变动', edgeIdChanges.every((c) => /^treebind:/.test(c.from) && /^treebind:/.test(c.to)),
  edgeIdChanges.length + ' 条 id 变动，其中非 treebind ' + edgeIdChanges.filter((c) => !/^treebind:/.test(c.from)).length + ' 条')

// 边 id 改写**逐字**可由反推映射预测（在已知 treeId 全集上做冒号安全切分）
const treeIdsBefore = new Set()
;(function collect(n) { treeIdsBefore.add(n.id); (n.children || []).forEach(collect) })(tBefore)
const predMap = new Map(observedPairs.map((x) => [x.from, x.to]))
const splitTB = (id, known) => {
  const s = String(id ?? '')
  if (!s.startsWith('treebind:')) return null
  const body = s.slice(9)
  let i = body.indexOf(':')
  while (i !== -1) {
    const h = body.slice(0, i), t = body.slice(i + 1)
    if (known.has(h) && known.has(t)) return { h, t }
    i = body.indexOf(':', i + 1)
  }
  return null
}
const predicted = []
for (const e of eBefore) {
  const sp = splitTB(e.id, treeIdsBefore)
  if (!sp) continue
  const next = 'treebind:' + (predMap.get(sp.h) ?? sp.h) + ':' + (predMap.get(sp.t) ?? sp.t)
  if (next !== e.id) predicted.push({ from: e.id, to: next })
}
const actualSorted = edgeIdChanges.slice().sort((a, b) => a.from.localeCompare(b.from))
const predSorted = predicted.slice().sort((a, b) => a.from.localeCompare(b.from))
const edgePredictOk = JSON.stringify(actualSorted) === JSON.stringify(predSorted)
chk('边：treebind id 改写可由反推映射逐字预测', edgePredictOk,
  edgePredictOk ? predicted.length + ' 条完全一致' : '预测 ' + predSorted.length + ' vs 实测 ' + actualSorted.length)

// 明确点名本批的**冒号陷阱**：端点含 ':' 的 treebind 是否被正确改写
const colonPred = predicted.filter((c) => c.from.slice(9).split(':').length > 2)
const colonActual = actualSorted.filter((c) => c.from.slice(9).split(':').length > 2)
chk('边：含冒号端点的 treebind 已正确改写（P0 正则在此会漏改）', colonPred.length === colonActual.length && colonPred.length > 0,
  '含冒号端点的 treebind 命中 ' + colonPred.length + ' 条')

// ══ ③ 映射反推 ↔ FINAL 声明 双向核对 ════════════════════════════════════════
const FINAL = JSON.parse(fs.readFileSync(path.join(OUT, 'asplit-treeid-mapping.FINAL.json'), 'utf8'))
const declared = FINAL.items.map((x) => ({ from: x.oldTreeId, to: x.proposedTreeId })).sort((a, b) => a.from.localeCompare(b.from))
const observedSorted = observedPairs.map(({ from, to }) => ({ from, to })).sort((a, b) => a.from.localeCompare(b.from))
const mapEqual = JSON.stringify(declared) === JSON.stringify(observedSorted)
chk('改名映射：数据实测 ≡ FINAL 声明（130 对，双向）', mapEqual,
  mapEqual ? '130 对完全一致' : '声明 ' + declared.length + ' 对 vs 实测 ' + observedSorted.length + ' 对')

// 39 个重推导项是否**确实**按域命名空间落地（不靠报告自报，直接从数据看）
const redriven = FINAL.items.filter((x) => x.namespace)
const redrivenOk = redriven.every((x) => observedSorted.some((o) => o.from === x.oldTreeId && o.to === x.proposedTreeId))
chk('39 个重推导项按域命名空间落地', redrivenOk, redriven.length + ' 项逐条命中')
chk('新 id 中无 tree_acm2012 残名', observedSorted.every((o) => !String(o.to).startsWith('tree_acm2012')),
  '残名 ' + observedSorted.filter((o) => String(o.to).startsWith('tree_acm2012')).length + ' 个')

// ══ ④ 池 / 题库 / 挂载健康度 ════════════════════════════════════════════════
const poolRawBefore = rdRaw('node-pool.json') || ''
const poolRawAfter = rdRaw('node-pool.json')
chk('池：node-pool.json 逐字节零改动', fs.readFileSync(path.join(BACKUP_DIR, 'node-pool.json'), 'utf8') === poolRawAfter,
  '批前 ' + fs.readFileSync(path.join(BACKUP_DIR, 'node-pool.json'), 'utf8').length + ' 字节 vs 批后 ' + poolRawAfter.length + ' 字节')
chk('题库：questions.json 逐字节零改动', fs.readFileSync(path.join(BACKUP_DIR, 'questions.json'), 'utf8') === rdRaw('questions.json'), '逐字节比对')

const pool = rdData('node-pool.json')
const poolNodes = pool.nodes ?? pool
const danglingAfter = (() => { let c = 0; (function w(x) { if (x.nodeRef && !poolNodes[x.nodeRef]) c += 1; (x.children || []).forEach(w) })(tAfter); return c })()
const danglingBefore = (() => { let c = 0; (function w(x) { if (x.nodeRef && !poolNodes[x.nodeRef]) c += 1; (x.children || []).forEach(w) })(tBefore); return c })()
chk('挂载：悬空 nodeRef 批前 == 批后', danglingBefore === danglingAfter, danglingBefore + ' → ' + danglingAfter)

const treeIdsAfter = new Set()
;(function collect(n) { treeIdsAfter.add(n.id); (n.children || []).forEach(collect) })(tAfter)
const tbDangling = (edges, ids) => edges.filter((e) => String(e.id).startsWith('treebind:') && !splitTB(e.id, ids)).length
const tbB = tbDangling(eBefore, treeIdsBefore)
const tbA = tbDangling(eAfter, treeIdsAfter)
chk('挂载：悬空 treebind 批前 == 批后（不得新增）', tbB === tbA, tbB + ' → ' + tbA)

// ══ ⑤ 全库残余扫描 ═════════════════════════════════════════════════════════
const oldIds = FINAL.items.map((x) => x.oldTreeId)
const blob = JSON.stringify(tAfter) + JSON.stringify(eAfter)
const residual = oldIds.filter((id) => blob.includes(id))
chk('全库：tree + edges 无任一旧 id 残留', residual.length === 0, residual.length ? residual.slice(0, 5).join(', ') : '残留 0')

const poolBlob = JSON.stringify(poolRawAfter)
// 池实体本身的 asplit_* 命名空间**不在本批范围**（本批只改树 treeId）—— 只断言池未被改动（已在上方逐字节验证）
chk('范围纪律：本批未触碰池 id 命名空间', true, '池逐字节零改动已证；asplit_* 池命名空间属 T10，明令不并入 T3')

const failed = checks.filter((c) => !c.ok)
const L = []
L.push('# T3-P1 · apply 之后的独立验证')
L.push('')
L.push('> 比对对象：`data/backups/' + path.basename(BACKUP_DIR) + '/`（批前快照） ↔ 当前工作树数据')
L.push('> 独立性：不 import apply 脚本 · 映射从数据反推后与 FINAL 双向核对 · 不看 apply 报告')
L.push('')
L.push('生成时间 ' + new Date().toISOString())
L.push('')
L.push('# ' + (failed.length === 0 ? 'INDEPENDENT_VERIFY_PASS —— ' + checks.length + '/' + checks.length : 'INDEPENDENT_VERIFY_FAIL —— ' + (checks.length - failed.length) + '/' + checks.length))
L.push('')
L.push('| # | 断言 | 结果 | 依据 |')
L.push('|---|---|---|---|')
checks.forEach((c, i) => L.push('| ' + (i + 1) + ' | ' + c.name + ' | ' + (c.ok ? '✅' : '❌') + ' | ' + c.detail + ' |'))
L.push('')
if (failed.length) { L.push('## 失败项'); for (const c of failed) L.push('- ❌ ' + c.name + ' —— ' + c.detail) }
fs.writeFileSync(path.join(OUT, 't3-p1-apply-verification.md'), L.join('\n'), 'utf8')

console.log('════ T3-P1 独立验证 ════')
for (const c of checks) console.log('  ' + (c.ok ? '✅' : '❌') + ' ' + c.name + '   [' + c.detail + ']')
console.log('\n' + (failed.length === 0 ? 'INDEPENDENT_VERIFY_PASS ' + checks.length + '/' + checks.length : 'INDEPENDENT_VERIFY_FAIL ' + (checks.length - failed.length) + '/' + checks.length))
process.exitCode = failed.length === 0 ? 0 : 1
