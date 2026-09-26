/**
 * Go 域「关键字」拆分批次 · 独立验证（⛔ 不 import apply，由落盘前快照反推）
 *
 * 判据设计：把「当前盘面」按本批语义**撤销**（抹平父 children / 删 25 新键并恢复父卡正文 /
 * 剔除 25 条新边），结果必须与落盘前快照**逐字节等价**。等价 ⇒ 本批只做了声明的改动，
 * 零夹带、零越界。再叠加「新增项精确形状 / 键序 / 键序无根正文 / 全链交叉一致」正向断言。
 *
 * 用法：node scripts/verify-go-keywords-split.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = path.join(ROOT, 'data')
const BK = path.join(DATA, 'backups', 'go-keywords-split-2026-09-25T17-00-26-079Z')

const PARENT_TREE = 'tree_1787723651777_57iok2'
const PARENT_K = 'k_1787723651360_r3tqg7'
const KEYWORDS = 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'.split(' ')
const treeIdOf = (kw) => `tree_go_keyword_${kw}`
const poolIdOf = (kw) => `k_go_keyword_${kw}`
const edgeIdOf = (kw) => `treebind:${PARENT_TREE}:${treeIdOf(kw)}`

const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const cur = {
  tree: rd(path.join(DATA, 'tree-data.json')),
  pool: rd(path.join(DATA, 'node-pool.json')),
  edges: rd(path.join(DATA, 'knowledge-edges.json')),
}
const before = {
  tree: rd(path.join(BK, 'tree-data.json')),
  pool: rd(path.join(BK, 'node-pool.json')),
  edges: rd(path.join(BK, 'knowledge-edges.json')),
}

let pass = 0
let fail = 0
const ck = (cond, label, detail = '') => {
  if (cond) { pass++; console.log('  ✅', label) }
  else { fail++; console.log('  ❌', label, detail ? `\n       ↳ ${String(detail).slice(0, 300)}` : '') }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const keysOf = (o) => Object.keys(o).join(',')
const clone = (o) => JSON.parse(JSON.stringify(o))
const countNodes = (n) => 1 + (n.children ?? []).reduce((s, c) => s + countNodes(c), 0)
const findNode = (n, id) => {
  if (!n) return null
  if (n.id === id) return n
  for (const c of n.children ?? []) { const r = findNode(c, id); if (r) return r }
  return null
}

console.log('\n════ Go 域「关键字」拆分 · 独立验证 ════')
console.log(`快照：data/backups/go-keywords-split-2026-09-25T17-00-26-079Z\n`)

/* ── A · 规模 Δ（精确 +25 ×3）──────────────────────────────── */
console.log('【A · 规模 Δ】')
const tn = [countNodes(before.tree), countNodes(cur.tree)]
const pn = [Object.keys(before.pool).length, Object.keys(cur.pool).length]
const en = [before.edges.length, cur.edges.length]
ck(tn[1] === tn[0] + 25, `树 ${tn[0]} → ${tn[1]}（+25）`)
ck(pn[1] === pn[0] + 25, `池 ${pn[0]} → ${pn[1]}（+25）`)
ck(en[1] === en[0] + 25, `边 ${en[0]} → ${en[1]}（+25）`)
ck(KEYWORDS.length === 25 && new Set(KEYWORDS).size === 25, '关键字清单 = 25 个互异项')

/* ── B · 树 ─────────────────────────────────────────────── */
console.log('\n【B · 树：非目标逐字节等价 + 25 子条目精确形状】')
const curParent = findNode(cur.tree, PARENT_TREE)
const beforeParent = findNode(before.tree, PARENT_TREE)
ck(!!curParent && !!beforeParent, '父树节点在两侧均存在')
ck((beforeParent?.children ?? []).length === 0, `落盘前父节点 children = ${(beforeParent?.children ?? []).length}`)
ck((curParent?.children ?? []).length === 25, `落盘后父节点 children = ${(curParent?.children ?? []).length}`)
{
  const flat = clone(cur.tree)
  const p = findNode(flat, PARENT_TREE)
  p.children = clone(beforeParent.children ?? [])
  ck(eq(flat, before.tree), '树：抹平父 children 后，全树与落盘前逐字节等价（零越界）')
}
{
  const shapeBad = KEYWORDS.filter((kw, i) => {
    const c = (curParent.children ?? [])[i]
    return !c || c.id !== treeIdOf(kw) || c.name !== kw || c.count !== 0
      || c.nodeRef !== poolIdOf(kw) || keysOf(c) !== 'id,name,count,nodeRef' || 'children' in c
  })
  ck(shapeBad.length === 0, '25 个子条目：id/name/count/nodeRef 精确 + 键序 id,name,count,nodeRef + ⛔ 无 children 键', `异常：${shapeBad.join(',')}`)
  ck(eq((curParent.children ?? []).map((c) => c.name), KEYWORDS), '25 个子条目顺序 === 关键字清单顺序')
}
ck(KEYWORDS.every((kw) => !findNode(before.tree, treeIdOf(kw))), '25 个新 treeId 在落盘前均不存在（零碰撞）')

/* ── C · 池 ─────────────────────────────────────────────── */
console.log('\n【C · 池：非目标逐字节等价 + 25 空壳实体精确形状】')
{
  const strip = clone(cur.pool)
  for (const kw of KEYWORDS) delete strip[poolIdOf(kw)]
  strip[PARENT_K].card.rootContent = before.pool[PARENT_K].card.rootContent
  ck(eq(strip, before.pool), '池：删 25 新键 + 恢复父卡正文后，全池与落盘前逐字节等价（零越界）')
}
{
  const shapeBad = KEYWORDS.filter((kw) => {
    const e = cur.pool[poolIdOf(kw)]
    if (!e) return true
    return e.id !== poolIdOf(kw) || e.label !== kw || !eq(e.tags, [kw])
      || keysOf(e) !== 'id,label,tags,card'
      || keysOf(e.card) !== 'nodeId,title,tabs'
      || e.card.nodeId !== poolIdOf(kw) || e.card.title !== kw || !eq(e.card.tabs, [])
      || 'rootContent' in e.card
  })
  ck(shapeBad.length === 0, '25 个实体：键序 id,label,tags,card / card 键序 nodeId,title,tabs / ⛔ 无 rootContent 键（空壳规范）', `异常：${shapeBad.join(',')}`)
}
ck(KEYWORDS.every((kw) => !before.pool[poolIdOf(kw)]), '25 个新 poolId 在落盘前均不存在（零碰撞）')
ck(cur.pool[PARENT_K].id === PARENT_K && cur.pool[PARENT_K].card.nodeId === PARENT_K, '父卡池实体自洽（id === card.nodeId）')

/* ── D · 边 ─────────────────────────────────────────────── */
console.log('\n【D · 边：非目标逐字节等价 + 25 treebind 精确形状】')
{
  const ids = new Set(KEYWORDS.map(edgeIdOf))
  ck(eq(cur.edges.filter((e) => !ids.has(e.id)), before.edges), '边：剔除 25 条新边后，全边集与落盘前逐字节等价（零越界）')
}
ck(new Set(cur.edges.map((e) => e.id)).size === cur.edges.length, '边 id 全局唯一')
{
  const shapeBad = KEYWORDS.filter((kw) => {
    const e = cur.edges.find((x) => x.id === edgeIdOf(kw))
    if (!e) return true
    return e.source !== PARENT_K || e.target !== poolIdOf(kw) || e.type !== 'belongs-to'
      || e.label !== 'contains' || e.relationKind !== 'structure'
      || keysOf(e) !== 'id,source,target,type,label,relationKind'
  })
  ck(shapeBad.length === 0, '25 条 treebind：source=父卡池 / target=子实体池 / belongs-to·contains·structure / ⛔ 无 dimensions 键', `异常：${shapeBad.join(',')}`)
  ck(eq(cur.edges.slice(-25).map((e) => e.id), KEYWORDS.map(edgeIdOf)), '25 条新边按关键字清单顺序尾部追加')
}

/* ── E · 父卡正文（用户裁决：引言句 + Markdown 列表）────────── */
console.log('\n【E · 父卡正文改写：引言句保留 + 名单改 Markdown 列表】')
const srcWords = String(before.pool[PARENT_K].card.rootContent ?? '').split('\n').map((s) => s.trim()).filter(Boolean)
const intro = srcWords[0]
const words = srcWords.slice(1)
ck(eq(words, KEYWORDS), `落盘前源名单 = 25 个裸词（实测 ${words.length} 项）`)
const nowLines = String(cur.pool[PARENT_K].card.rootContent ?? '').split('\n')
ck(nowLines[0] === intro, '引言句逐字保留（为本批新正文首行）')
const items = nowLines.map((s) => s.trim()).filter((s) => s.startsWith('- ')).map((s) => s.slice(2))
ck(eq(items, KEYWORDS), '新正文含 25 项 `- kw` 列表，顺序与清单一致')
ck(items.length === words.length && eq([...items].sort(), [...words].sort()), '列表项集合 === 源名单词集合（token 级零增零删）')
ck(cur.pool[PARENT_K].label === before.pool[PARENT_K].label
  && cur.pool[PARENT_K].card.title === before.pool[PARENT_K].card.title
  && eq(cur.pool[PARENT_K].card.tabs, before.pool[PARENT_K].card.tabs)
  && eq(cur.pool[PARENT_K].tags, before.pool[PARENT_K].tags), '父卡 label / title / tags / tabs 未变')
ck(findNode(cur.tree, PARENT_TREE).nodeRef === PARENT_K, '父树条目 nodeRef 仍指向父卡池 id')

/* ── F · 全链交叉一致 ──────────────────────────────────── */
console.log('\n【F · 五面交叉一致（树条目 ↔ nodeRef ↔ 池实体 ↔ treebind 边 ↔ 父池 id）】')
{
  const bad = KEYWORDS.filter((kw) => {
    const t = findNode(cur.tree, treeIdOf(kw))
    const e = cur.edges.find((x) => x.id === edgeIdOf(kw))
    const p = cur.pool[poolIdOf(kw)]
    return !t || !e || !p || t.nodeRef !== poolIdOf(kw) || e.source !== PARENT_K || e.target !== poolIdOf(kw)
  })
  ck(bad.length === 0, '25 组五面链条全部闭合', `断链：${bad.join(',')}`)
}

console.log(`\n════ 结果：${pass}/${pass + fail} ${fail === 0 ? '✅ 全通过' : '❌ 有失败'} ════\n`)
process.exit(fail === 0 ? 0 : 1)
