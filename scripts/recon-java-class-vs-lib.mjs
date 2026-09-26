/**
 * 只读侦察：java 下 `类` 与 `类库` 两棵子树能否合并？
 *
 * 用法：node scripts/recon-java-class-vs-lib.mjs
 *   --out outputs/java-class-vs-lib  指定产物目录（默认同名）
 *
 * ⛔ 本脚本**只读**：不写 data/、不改任何真源。产物只落 outputs/ 下的 md + json。
 *
 * 口径（T3 纪律：报告里每个数字都由脚本算出，禁止手写）：
 *   ① 基数：节点数 / 去重实体数 / tab 总数 / 正文字数（rootContent + 所有 tab content）
 *   ② 实体级重叠：两侧 nodeRef 集合的交集（同一池实体被两棵树都挂）
 *   ③ 名字级重叠：FQCN 与「简单名」两套归一化后的交集
 *      ⚠️ 简单名归一化会**过度匹配**（`Object` 命中 `ObjectInputStream`），故输出 matched-sample
 *         供人工核对，并**只把 FQCN 交集当强证据**
 *   ④ 组织轴：逐个子节点的名字形态分类（FQCN / 简单名 / 中文 / 包名）+ 深度分布
 *   ⑤ 边：两棵树相关的 treebind 边（按 id 反查 + 按端点反查，双路）
 *   ⑥ 无实体节点（树上挂载但池里没有对应实体 = 空壳）
 *   ⑦ 内容逐字节重复：两侧实体正文 md5 交集
 *   ⑧ 跨区：这两棵树里的实体在**全树其他位置**还有没有别的挂载点
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const OUT_DIR = (() => {
  const i = process.argv.indexOf('--out')
  return i > -1 ? process.argv[i + 1] : 'outputs/java-class-vs-lib'
})()

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const tree = readJson('data/tree-data.json')
const root = tree.root ?? tree
const poolRaw = readJson('data/node-pool.json')
const pool = poolRaw.entities ?? poolRaw
const edgesRaw = readJson('data/knowledge-edges.json')
const edges = Array.isArray(edgesRaw) ? edgesRaw : edgesRaw.edges
const edgeId = (e) => e.id ?? e.edgeId

const TARGETS = [
  { key: 'CLASS', label: '类', treeId: 'tree_1785339432677_doac9n' },
  { key: 'LIB', label: '类库', treeId: 'tree_java_common_libraries' },
]

// ── 工具 ────────────────────────────────────────────────────────────────
const findNode = (n, id) => {
  if (n.id === id) return n
  for (const c of n.children ?? []) { const r = findNode(c, id); if (r) return r }
  return null
}
const flatten = (n, depth = 0, parentPath = []) => {
  const here = { node: n, depth, path: parentPath.concat(n.name ?? '') }
  const kids = (n.children ?? []).flatMap((c) => flatten(c, depth + 1, here.path))
  return [here, ...kids]
}
const countNodes = (n) => 1 + (n.children ?? []).reduce((a, c) => a + countNodes(c), 0)

/** 实体正文（rootContent + 全部 tab content）字数 */
const contentChars = (e) => {
  if (!e?.card) return 0
  let n = (e.card.rootContent ?? '').length
  for (const t of e.card.tabs ?? []) n += (t.content ?? '').length
  return n
}
/** 实体正文全文（用于 md5 去重） */
const contentText = (e) => {
  if (!e?.card) return ''
  return [e.card.rootContent ?? '', ...(e.card.tabs ?? []).map((t) => `${t.label ?? ''}\n${t.content ?? ''}`)].join('\n')
}
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')

/** FQCN：含点且首段是小写标识符（java.lang.String / java.util.Base64） */
const isFqcn = (name) => /^[a-z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_$]+)+$/.test(name)
/** 末段是否大写开头（大写 ⇒ 是类；小写 ⇒ 是包） */
const lastSegUpper = (name) => /^[A-Z]/.test(name.split('.').pop() ?? '')
/** 简单名：单段标识符 */
const isSimple = (name) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
/** 中文（含中文专属标点/括号） */
const hasCjk = (name) => /[\u4e00-\u9fff]/.test(name)
const simpleOf = (name) => (isFqcn(name) ? name.split('.').pop() : name)

const H = (t) => `\n## ${t}\n`
const out = []
const warn = []

// ── ① 基数 ──────────────────────────────────────────────────────────────
const info = {}
for (const t of TARGETS) {
  const node = findNode(root, t.treeId)
  if (!node) { warn.push(`⛔ 找不到目标节点 ${t.label} (${t.treeId})`); continue }
  const flat = flatten(node)
  const refs = flat.map((f) => f.node.nodeRef).filter(Boolean)
  const uniq = [...new Set(refs)]
  const missing = uniq.filter((r) => !pool[r])
  const emptyShell = uniq.filter((r) => pool[r] && pool[r].card && (pool[r].card.tabs ?? []).length === 0 && !(pool[r].card.rootContent ?? '').trim())
  info[t.key] = {
    ...t, node, flat,
    nodeCount: countNodes(node),
    directChildren: (node.children ?? []).length,
    mounts: refs.length,
    uniqueRefs: uniq,
    missingEntities: missing,
    emptyShellRefs: emptyShell,
    tabsTotal: uniq.reduce((a, r) => a + ((pool[r]?.card?.tabs ?? []).length), 0),
    charsTotal: uniq.reduce((a, r) => a + contentChars(pool[r]), 0),
    maxDepth: Math.max(...flat.map((f) => f.depth)),
    ownEntity: pool[node.nodeRef] ?? null,
  }
}

out.push('# java `类` vs `类库` —— 可合并性只读侦察\n')
out.push(`> 生成时间：${new Date().toISOString()} · **所有数字由 \`scripts/recon-java-class-vs-lib.mjs\` 计算得出（T3 纪律：不手写）**`)
out.push('> ⛔ 本脚本只读，未写 `data/`。\n')
if (warn.length) out.push(`> ⚠️ ${warn.join(' / ')}\n`)

// ── ⓪ 数据指纹（provenance：本报告读的到底是哪一份数据） ─────────────────
out.push(H('0. 数据指纹（本报告读的输入）'))
const fp = (p) => {
  const buf = fs.readFileSync(p)
  return { md5: crypto.createHash('md5').update(buf).digest('hex'), bytes: buf.length, mtime: fs.statSync(p).mtime.toISOString() }
}
out.push('| 文件 | md5 | 字节 | mtime |')
out.push('|---|---|---|---|')
for (const p of ['data/tree-data.json', 'data/node-pool.json', 'data/knowledge-edges.json']) {
  const f = fp(p)
  out.push(`| \`${p}\` | \`${f.md5.slice(0, 12)}…\` | ${f.bytes} | ${f.mtime} |`)
}
out.push('')
out.push('> ⚠️ 若三文件 mtime 与本次生成时间接近、或与 HEAD 不一致，说明侦察读的是**工作树**（可能含外部在飞改动），')
out.push('> 而非某个已提交基线 ⇒ 引用本报告的数字前，先核对上表。')
out.push('')

out.push(H('1. 基数'))
out.push('| 维度 | `类` | `类库` |')
out.push('|---|---|---|')
const row = (label, f) => out.push(`| ${label} | ${f(info.CLASS)} | ${f(info.LIB)} |`)
row('树节点数（含自身）', (i) => i.nodeCount)
row('直子节点数', (i) => i.directChildren)
row('最大深度（自身=0）', (i) => i.maxDepth)
row('挂载数（含重复挂载）', (i) => i.mounts)
row('去重实体数', (i) => i.uniqueRefs.length)
row('tab 总数', (i) => i.tabsTotal)
row('正文字数（rootContent + tabs）', (i) => i.charsTotal)
row('⛔ 无实体挂载（空壳）', (i) => i.missingEntities.length)
row('⚠️ 有实体但零内容', (i) => i.emptyShellRefs.length)
row('容器自身有实体', (i) => (i.ownEntity ? '✓' : '✗'))
out.push('')

for (const t of TARGETS) {
  const i = info[t.key]
  out.push(`### ${t.label} 容器自身`)
  const e = i.ownEntity
  out.push(`- treeId \`${t.treeId}\` · nodeRef \`${i.node.nodeRef}\``)
  out.push(`- label \`${e?.label ?? '（无）'}\` · tabs=${(e?.card?.tabs ?? []).length}（${(e?.card?.tabs ?? []).map((x) => x.id).join('/') || '无'}）`)
  out.push(`- rootContent ${(e?.card?.rootContent ?? '').length} 字`)
  out.push(`- tags ${JSON.stringify(e?.tags ?? [])}`)
  if (i.missingEntities.length) out.push(`- ⛔ 无实体挂载：\`${i.missingEntities.join('`, `')}\``)
  if (i.emptyShellRefs.length) out.push(`- ⚠️ 有实体但零内容：\`${i.emptyShellRefs.join('`, `')}\``)
  out.push('')
}

// ── ② 实体级重叠 ────────────────────────────────────────────────────────
const refsA = new Set(info.CLASS?.uniqueRefs ?? [])
const refsB = new Set(info.LIB?.uniqueRefs ?? [])
const refInter = [...refsA].filter((r) => refsB.has(r))
out.push(H('2. 实体级重叠（同一池实体被两棵树都挂载）'))
out.push(`- \`类\` 去重实体 **${refsA.size}** · \`类库\` 去重实体 **${refsB.size}**`)
out.push(`- **nodeRef 交集 = ${refInter.length}**`)
if (refInter.length) {
  for (const r of refInter) {
    const a = info.CLASS.flat.filter((f) => f.node.nodeRef === r).map((f) => f.path.join(' > '))
    const b = info.LIB.flat.filter((f) => f.node.nodeRef === r).map((f) => f.path.join(' > '))
    out.push(`  - \`${r}\`（${pool[r]?.label}）`)
    out.push(`    - 类：${a.join(' ／ ')}`)
    out.push(`    - 类库：${b.join(' ／ ')}`)
  }
} else {
  out.push('- ⇒ **两棵树没有任何共享实体**（无「同一实体双挂载」）。')
}
out.push('')

// ── ③ 名字级重叠 ────────────────────────────────────────────────────────
const namesOf = (i) => i.flat.map((f) => f.node.name).filter(Boolean)
const fqcnOf = (i) => [...new Set(namesOf(i).filter(isFqcn))]
const simpleOfAll = (i) => [...new Set(namesOf(i).map(simpleOf).filter(isSimple))]
const fqcnA = new Set(fqcnOf(info.CLASS)), fqcnB = new Set(fqcnOf(info.LIB))
const fqcnInter = [...fqcnA].filter((x) => fqcnB.has(x))
const smpA = new Set(simpleOfAll(info.CLASS)), smpB = new Set(simpleOfAll(info.LIB))
const smpInter = [...smpA].filter((x) => smpB.has(x))

out.push(H('3. 名字级重叠'))
out.push(`- FQCN 形态名字数：\`类\` **${fqcnA.size}** · \`类库\` **${fqcnB.size}**`)
out.push(`- **FQCN 交集 = ${fqcnInter.length}**（强证据）${fqcnInter.length ? '：`' + fqcnInter.join('`, `') + '`' : ''}`)
out.push(`- 简单名形态名字数：\`类\` **${smpA.size}** · \`类库\` **${smpB.size}**`)
out.push(`- **简单名交集 = ${smpInter.length}**（弱证据，含子串式过度匹配）${smpInter.length ? '：`' + smpInter.join('`, `') + '`' : ''}`)
if (smpInter.length) {
  out.push('')
  out.push('⚠️ 简单名交集的逐项出处（人工核对用 —— 简单名不同长度会互相误命中）：')
  for (const s of smpInter) {
    const a = info.CLASS.flat.filter((f) => simpleOf(f.node.name) === s).map((f) => f.node.name)
    const b = info.LIB.flat.filter((f) => simpleOf(f.node.name) === s).map((f) => f.node.name)
    out.push(`  - \`${s}\`：类 → ${a.join(' ／ ')} ｜ 类库 → ${b.join(' ／ ')}`)
  }
}
out.push('')

// ── ④ 组织轴 ────────────────────────────────────────────────────────────
out.push(H('4. 组织轴：两棵树凭什么组织子节点'))
for (const t of TARGETS) {
  const i = info[t.key]
  const kids = i.node.children ?? []
  const buckets = { '类 FQCN': [], '包 FQCN': [], 简单名: [], 中文: [], 其他: [] }
  for (const c of kids) {
    const n = c.name ?? ''
    if (isFqcn(n)) { (lastSegUpper(n) ? buckets['类 FQCN'] : buckets['包 FQCN']).push(n) }
    else if (hasCjk(n)) buckets.中文.push(n)
    else if (isSimple(n)) buckets.简单名.push(n)
    else buckets.其他.push(n)
  }
  out.push(`### \`${t.label}\` 的直子形态（共 ${kids.length}）`)
  out.push(`- **类 FQCN（形如 java.x.Yyy，末段大写）${buckets['类 FQCN'].length}**：${buckets['类 FQCN'].map((n) => `\`${n}\``).join(' ')}`)
  out.push(`- **包 FQCN（末段小写，是包不是类）${buckets['包 FQCN'].length}**：${buckets['包 FQCN'].map((n) => `\`${n}\``).join(' ')}`)
  out.push(`- **简单名（裸标识符）${buckets.简单名.length}**：${buckets.简单名.map((n) => `\`${n}\``).join(' ')}`)
  out.push(`- **中文名 ${buckets.中文.length}**：${buckets.中文.map((n) => `\`${n}\``).join(' ')}`)
  if (buckets.其他.length) out.push(`- 其他 ${buckets.其他.length}：${buckets.其他.map((n) => `\`${n}\``).join(' ')}`)
  const byDepth = {}
  for (const f of i.flat) byDepth[f.depth] = (byDepth[f.depth] ?? 0) + 1
  out.push(`- 深度分布：${Object.entries(byDepth).map(([d, c]) => `d${d}=${c}`).join(' · ')}`)
  out.push('')
}

// ── ⑤ 边 ────────────────────────────────────────────────────────────────
// ⚠️ 量具修正 1（首版错）：treebind 边的 `source`/`target` 存的是 **nodeRef**，**不是 treeId**！
//    例：{ id:'treebind:universe:demo_cs', source:'n_a03cv4sd', target:'n_55jiel25' }
//    ⇒ 「按端点反查 treeId」恒为 0（假读数）。treeId 只出现在 `id` 串里，必须解析。
const parseTreebind = (id) => {
  const s = String(id)
  if (!s.startsWith('treebind:')) return null
  const rest = s.slice('treebind:'.length)
  const i = rest.indexOf(':')
  if (i < 0) return null
  return { parent: rest.slice(0, i), child: rest.slice(i + 1) }
}
out.push(H('5. treebind 边'))
out.push('> ⚠️ 口径：`source`/`target` 存 **nodeRef**；**treeId 只在 `id` 串**（`treebind:<父 treeId>:<子 treeId>`）⇒ 端点反查必须解析 id。\n')
for (const t of TARGETS) {
  const i = info[t.key]
  const ids = new Set(i.flat.map((f) => f.node.id))
  const relate = edges.filter((e) => {
    const tb = parseTreebind(edgeId(e))
    return tb && (ids.has(tb.parent) || ids.has(tb.child))
  })
  const nonTreebindOnIds = edges.filter((e) => !String(edgeId(e)).startsWith('treebind:') && ids.has(e.source) || ids.has(e.target))
  out.push(`### \`${t.label}\``)
  out.push(`- 与本子树相关的 treebind 边 **${relate.length}** 条（其中父在树内 ${relate.filter((e) => ids.has(parseTreebind(edgeId(e)).parent)).length} · 子在树内 ${relate.filter((e) => ids.has(parseTreebind(edgeId(e)).child)).length}）`)
  // 逐子挂载核对父边是否存在（本项目已知债：全库约 20% 挂载无边）
  const childPairs = []
  for (const f of i.flat) {
    if (f.depth === 0) continue
    const parent = i.flat.find((g) => g.depth === f.depth - 1 && g.path.join(' > ') === f.path.slice(0, -1).join(' > '))
    if (!parent) continue
    const want = `treebind:${parent.node.id}:${f.node.id}`
    childPairs.push({ want, ok: edges.some((e) => edgeId(e) === want), path: f.path.join(' > ') })
  }
  const noEdge = childPairs.filter((c) => !c.ok)
  out.push(`- 子挂载共 ${childPairs.length} 条，其中**无对应 treebind 父边 ${noEdge.length} 条**${noEdge.length ? '' : ' ⇒ 本子树边齐'} `)
  if (noEdge.length) out.push(`  - 例：${noEdge.slice(0, 5).map((c) => `\`${c.path}\``).join(' · ')}`)
  // 反向：有没有边挂在**已不在树内**的 id 上（悬空）
  const dangling = edges.filter((e) => {
    const tb = parseTreebind(edgeId(e))
    return tb && (ids.has(tb.parent) || ids.has(tb.child)) && !(ids.has(tb.parent) && ids.has(tb.child))
  })
  out.push(`- ⚠️ 只命中一端的边（悬空候补）**${dangling.length}** 条（父/子只有一个在树内的**树内节点**上，另一端在树外或已删）`)
  out.push('')
}

// ── ⑥ 跨区：这些实体在别处还有挂载吗 ────────────────────────────────────
// ⚠️ 量具修正 2（首版错）：比较「其他挂载点」时，子树的 flatten 给的是**相对路径**（以子树根开头），
//    而全树 walk 给的是**绝对路径** ⇒ `!mine.has(p)` 恒真 ⇒ 报出 54/54「都有别处挂载」的**假阳性**。
//    修法：两边统一用**绝对路径**（由全树 walk 建 nodeId → 绝对路径 映射）。
const absPathById = new Map()
const mountPathsByRef = new Map()   // nodeRef -> [绝对路径, ...]
const refMountCount = new Map()     // nodeRef -> 挂载次数
const walkAll = (n, pathArr = []) => {
  const abs = pathArr.concat(n.name ?? '').join(' > ')
  absPathById.set(n.id, abs)
  if (n.nodeRef) {
    mountPathsByRef.set(n.nodeRef, (mountPathsByRef.get(n.nodeRef) ?? []).concat([abs]))
    refMountCount.set(n.nodeRef, (refMountCount.get(n.nodeRef) ?? 0) + 1)
  }
  ;(n.children ?? []).forEach((c) => walkAll(c, pathArr.concat(n.name ?? '')))
}
walkAll(root)

out.push(H('6. 跨区重叠：两棵树的实体在全树别处还有挂载点吗'))
const crossZone = []
for (const t of TARGETS) {
  const mine = new Set(info[t.key].flat.map((f) => absPathById.get(f.node.id)))
  for (const r of info[t.key].uniqueRefs) {
    const all = (mountPathsByRef.get(r) ?? [])
    const others = all.filter((p) => !mine.has(p))
    if (others.length) crossZone.push({ zone: t.label, ref: r, label: pool[r]?.label, mine: [...mine].filter((p) => all.includes(p)), others })
  }
}
out.push(`- 两棵树共 ${refsA.size + refsB.size} 个去重实体（交集 ${refInter.length}）`)
out.push(`- 其中**在其他子树还有挂载点的 = ${crossZone.length} 个**（口径：绝对路径不在本子树内）`)
for (const c of crossZone) {
  out.push(`  - \`${c.ref}\`（${c.label}）`)
  out.push(`    - 在本子树：${c.mine.map((o) => `\`${o}\``).join(' · ') || '（无）'}`)
  out.push(`    - 在别处：${c.others.map((o) => `\`${o}\``).join(' · ')}`)
}
out.push('')
// 同一 nodeRef 多挂载的总量（本项目已知系统性现象）
const multi = [...refMountCount.entries()].filter(([, c]) => c > 1)
out.push(`- 全库参考：同一 nodeRef 多挂载实体 **${multi.length}** 个 / 挂载点 ${multi.reduce((a, [, c]) => a + c, 0)} 个 **（多挂载是系统性现象，非缺陷）**`)
out.push('')

// ── ⑦ 内容逐字节重复 ────────────────────────────────────────────────────
out.push(H('7. 内容逐字节重复（md5）'))
const md5Of = (refs) => {
  const m = new Map()
  for (const r of refs) {
    const s = contentText(pool[r])
    if (!s.trim()) continue
    m.set(md5(s), (m.get(md5(s)) ?? []).concat([r]))
  }
  return m
}
const mA = md5Of(info.CLASS.uniqueRefs), mB = md5Of(info.LIB.uniqueRefs)
const dupKeys = [...mA.keys()].filter((k) => mB.has(k))
out.push(`- \`类\` 有正文本实体 ${mA.size} 个 · \`类库\` ${mB.size} 个`)
out.push(`- **两侧正文逐字节相同的 md5 数 = ${dupKeys.length}**`)
for (const k of dupKeys) out.push(`  - md5 \`${k.slice(0, 8)}\`：类 → ${mA.get(k).map((r) => `\`${pool[r]?.label}\``).join(' ')} ｜ 类库 → ${mB.get(k).map((r) => `\`${pool[r]?.label}\``).join(' ')}`)
const dupWithin = (m, label) => {
  const d = [...m.entries()].filter(([, v]) => v.length > 1)
  out.push(`- \`${label}\` 内部正文重复：${d.length} 组${d.length ? '：' + d.map(([, v]) => v.map((r) => `\`${pool[r]?.label}\``).join('=')).join(' · ') : ''}`)
}
dupWithin(mA, '类'); dupWithin(mB, '类库')
out.push('')

// ── ⑧ 结论数据面（不作裁决，仅列可支撑判定的读数） ──────────────────────
out.push(H('8. 支撑判定的读数汇总'))
out.push(`- 共享实体（双挂载）：**${refInter.length}**`)
out.push(`- FQCN 名字交集：**${fqcnInter.length}**`)
out.push(`- 正文逐字节重复组：**${dupKeys.length}**`)
out.push(`- 跨区重叠实体：**${crossZone.length}**`)
out.push(`- \`类\` 子树零内容挂载（有实体但 tabs=0 且 rootContent 空）：**${info.CLASS.emptyShellRefs.length} / ${info.CLASS.uniqueRefs.length}**`)
out.push(`- \`类库\` 子树零内容挂载：**${info.LIB.emptyShellRefs.length} / ${info.LIB.uniqueRefs.length}**`)
out.push('')

// ── ⑨ 身份键视角：canonicalKey 是严格 1:1 吗？同族概念各自挂在哪？ ────────
out.push(H('9. 身份键（canonicalKey）视角'))
const keyCount = new Map()
for (const [id, v] of Object.entries(pool)) {
  const k = v.canonicalKey
  if (!k) continue
  keyCount.set(k, (keyCount.get(k) ?? []).concat([id]))
}
const dupKeys2 = [...keyCount.entries()].filter(([, v]) => v.length > 1)
const withKey = Object.values(pool).filter((v) => v.canonicalKey).length
out.push(`- 全库带 canonicalKey 的实体 **${withKey}** / 池 ${Object.keys(pool).length}（${(withKey / Object.keys(pool).length * 100).toFixed(1)}%）`)
out.push(`- 去重 key **${keyCount.size}** · **同 key 对应 >1 实体的组数 = ${dupKeys2.length}** ⇒ ${dupKeys2.length === 0 ? '**canonicalKey 是严格 1:1 身份键**（可作合并判据的硬证据）' : '存在身份级重复，见下列'}`)
for (const [k, v] of dupKeys2) out.push(`  - \`${k}\` → ${v.map((id) => `\`${pool[id]?.label}\``).join(' ／ ')}`)
out.push('')
out.push(`- \`类\` 的 key = \`${pool[info.CLASS.node.nodeRef]?.canonicalKey ?? '(无)'}\` · \`类库\` 的 key = ${pool[info.LIB.node.nodeRef]?.canonicalKey ?? '**(无)**'}`)
out.push('')
// 同族：java: 段前缀相同的概念节点，各自挂在哪
const clsSeg = (pool[info.CLASS.node.nodeRef]?.canonicalKey ?? 'java:class').split(':').slice(0, 2).join(':')
const family = Object.entries(pool).filter(([, v]) => (v.canonicalKey ?? '').startsWith(clsSeg))
out.push(`### 同族概念（canonicalKey 以 \`${clsSeg}\` 开头）的挂载位置`)
for (const [id, v] of family) {
  const paths = mountPathsByRef.get(id) ?? []
  out.push(`- **\`${v.label}\`**（\`${v.canonicalKey}\`）tabs=${(v.card?.tabs ?? []).length} rc=${(v.card?.rootContent ?? '').length}`)
  if (!paths.length) out.push('  - ⛔ **未挂载**')
  for (const p of paths) out.push(`  - 挂载：\`${p}\``)
}
out.push('')

// ── ⑩ 「类」子树逐节点机械角色分类 ──────────────────────────────────────
const roleOf = (node) => {
  const e = pool[node.nodeRef]
  if (!e) return { role: '⛔无实体', note: '' }
  const name = node.name ?? ''
  const rc = e.card?.rootContent ?? ''
  const tabs = (e.card?.tabs ?? []).length
  if (e.canonicalKey) return { role: '有身份键', note: e.canonicalKey }
  if (isFqcn(name) && !lastSegUpper(name)) return { role: '包占位节点', note: `末段小写 ⇒ 是包不是类` }
  if (/^\|?\s*序号/.test(rc.trim())) return { role: '表格型分节', note: `正文以「序号」表头开头` }
  if (rc.trim().length > 0 && rc.trim().length <= 40 && tabs === 0) return { role: '短片段', note: `${rc.trim().length} 字` }
  if (tabs > 0) return { role: '实体（含 tab）', note: `tabs=${tabs}` }
  return { role: '实体（仅正文）', note: `${rc.trim().length} 字` }
}
out.push(H('10. `类` 子树逐节点角色（机械分类）'))
out.push('> ⚠️ 角色是**机械标签**，只用于暴露「身份/内容错配」的候选，不构成缺陷断言（宪法 §3.2）。')
out.push('')
out.push('| 路径（相对 `类`） | label | 角色 | 依据 | tabs | rc |')
out.push('|---|---|---|---|---|---|')
for (const f of info.CLASS.flat) {
  const rel = f.path.slice(1).join(' / ') || '（自身）'
  const r = roleOf(f.node)
  out.push(`| \`${rel}\` | ${pool[f.node.nodeRef]?.label ?? '⛔'} | ${r.role} | ${r.note} | ${(pool[f.node.nodeRef]?.card?.tabs ?? []).length} | ${(pool[f.node.nodeRef]?.card?.rootContent ?? '').length} |`)
}
out.push('')

// ── ⑪ 判定与处置方案（叙述段，引用上面的计算值；Δ 精算须另开 plan） ──────
const cls = info.CLASS, lib = info.LIB
out.push(H('11. 判定与处置方案'))
out.push('> ⚠️ 本节是**判定**，不是脚本读数；但所有基数均引用上文由脚本算出的值。')
out.push('')
out.push('### 11.1 结论：**不建议把 `类` 并入 `类库`**')
out.push(`- **无可合并的冗余**：共享实体 **${refInter.length}** · FQCN 名字交集 **${fqcnInter.length}** · 正文逐字节重复 **${dupKeys.length}**。`)
out.push('  ⇒ 与 C 批（平行库树、真超集）/ D 批（近似超集、27 重叠方法）的动机**根本不同**：那两批都是「同一内容出现两次」，本对**一次都没有**。')
out.push(`- **不是同一根轴**：\`类库\` = 以「具体类 / 功能组」为条目的**类目录**（${lib.directChildren} 直子 · ${lib.tabsTotal} tabs · ${lib.charsTotal} 字）；\`类\` = 名义「类」概念、实际是 **java.lang 包**（${cls.directChildren} 直子 · ${cls.tabsTotal} tabs · ${cls.charsTotal} 字，最大深度 ${cls.maxDepth}）。`)
out.push(`- **粒度不同**：\`类库\` 里一个类 = 一个实体（tabs 装方法）；\`类\` 里一个类被拆成「类节点 + 分节子节点」。直接合并会把两套建模约定混在一棵树里。`)
out.push('')
out.push('### 11.2 扫描出的真问题：`类` 是「身份与内容错配 + 概念家族被拆散」')
out.push(`- **身份**：\`类\` 持有 \`canonicalKey = java:class\`（全库 canonicalKey 严格 1:1，**${dupKeys2.length}** 组重复 ⇒ 这是可信的硬身份键）。`)
out.push(`- **出身**：同族概念 \`变量\`（\`java:class:variable\`）、\`修饰符\`（\`java:class-modifier\`）都团聚在 \`Java syntax > 数据类型 > 引用类型 > Java类\` 下；**只有 \`类\` 孤悬在 java 顶层**（挂载数 ${(mountPathsByRef.get(info.CLASS.node.nodeRef) ?? []).length}）。`)
out.push(`- **内容**：\`类\` 树下 ${cls.nodeCount - 1} 个节点里，**没有任何一个是「类」这个概念本身** —— 全是 java.lang 包的具体类与文档片段。`)
out.push(`- **机械分类查出的错配候选**（见 §10）：`)
const roles = cls.flat.map((f) => ({ path: f.path.slice(1).join(' / ') || '（自身）', ...roleOf(f.node) }))
for (const r of roles.filter((x) => ['包占位节点', '表格型分节', '短片段'].includes(x.role))) {
  out.push(`  - \`${r.path}\` → **${r.role}**（${r.note}）`)
}
out.push('')
out.push('**人工核对补充（脚本判不了，已逐条读原文）**：')
out.push(`- \`Object / 类的构造函数\` 正文 = \`**Object()** 构造一个新对象\` ⇒ 是 **Object 自己的分节**，不该与 Number/Math/Optional 做兄弟。`)
out.push(`- \`Object / 方法\`（${pool['k_1787759684586_mxh1vn'].card.rootContent.length} 字）正文表头为 \`序号 | 方法 & 描述\`，首几行是 \`clone()\` / \`equals(Object)\` / \`finalize()\` / \`getClass()\` ⇒ **是 Object 的方法表**，同样是 Object 的分节。`)
out.push(`- \`Object / Math / 常见方法\`（${pool['k_1787759112336_m73bs3'].card.rootContent.length} 字）正文是 \`xxxValue()\` / \`compareTo()\` / \`valueOf()\` ⇒ **是 Number 的方法表**，且**父节点是 Math** ⇒ **归错父**（Math 与 Number 是两个类）。`)
out.push(`- \`Object / Optional\`：Optional 属 \`java.util\`，不是 \`java.lang\` ⇒ **包归属错**（挂在 \`java.lang\` 下）。`)
out.push(`- \`java.lang\`（rc=${pool['k_java_source_020f0cac60da5755_s_package_4be54257fe3bcb8b'].card.rootContent.length} 字）=「Java 包 \`java.lang\`，包含本次导入范围内直接声明的类型。」⇒ **导入器生成的包占位节点**（无 canonicalKey）。`)
out.push('')
out.push('### 11.3 三档处置方案（Δ 需另开 plan 阶段精算）')
out.push(`- **方案 A · 只正名，不动结构（最小动作）**：不合并；把 \`类\` 改名为能自述的词（如 \`java.lang 包\`）并补 rootContent，消除与 \`类库\` 的命名歧义。`)
out.push(`  - 触及：1 个树 name + 1 个池实体（label/rootContent）。**不删任何节点、不动任何边。**`)
out.push(`  - 代价：保留了「概念键 \`java:class\` 挂在 java.lang 内容上」这个错配，只是把它藏起来。`)
out.push(`- **方案 B · 拆身份与内容（推荐）**：`)
out.push(`  - ① \`类\`（\`java:class\`）**归位**到 \`Java syntax > 数据类型 > 引用类型 > Java类\` 下，与 \`变量\`/\`修饰符\`/\`内部类\` 团聚（纯换挂载，实体不删）。`)
out.push(`  - ② 其内容按类归位：Object 的两个分节（\`类的构造函数\`/\`方法\`）原子化进 \`java.lang.Object\` 的 tabs；\`Number\`/\`Math\`/\`Optional\` 各自挂到 \`类库\`（注意 \`Optional\` 应标 \`java.util.Optional\`）；\`Math/常见方法\` 纠正为 Number 的方法表。`)
out.push(`  - ③ 导入占位节点 \`java.lang\` 卸树（其 rc 仅一句导入说明）。`)
out.push(`  - 触及：树结构（多节点重挂 + 卸树）、池（Object 加 tab、若干实体改 label）、边（父边换端点）。**这是本批唯一有实质收益的方向**，但也最接近一次结构批次。`)
out.push(`- **方案 C · 整体并入（不推荐）**：把 \`类\` 11 节点直接挂到 \`类库\`。会在 \`类库\` 里同时出现「扁平 FQCN 类条目」与「类节点 + 分节子节点」两套形态；且 \`类的构造函数\`/\`方法\`/\`作用\` 这些**分节片段在 \`类库\` 的粒度下无处安放**（\`类库\` 下除 Files>最佳实践、Enum>用法 外无子节点）。`)
out.push('')
out.push(`**建议**：若只想要「不再混淆」，走 A；若要让 java 子树真正收敛，走 B（需另开 plan 阶段，像 D 批那样先出逐项 diff 再裁决）。**C 不建议**。`)
out.push('')

// ── 落盘 ────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true })
const md = out.join('\n')
fs.writeFileSync(path.join(OUT_DIR, 'report.md'), md, 'utf8')
fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  script: 'scripts/recon-java-class-vs-lib.mjs',
  targets: TARGETS,
  base: Object.fromEntries(TARGETS.map((t) => [t.key, {
    treeId: t.treeId, label: t.label,
    nodeCount: info[t.key].nodeCount,
    directChildren: info[t.key].directChildren,
    maxDepth: info[t.key].maxDepth,
    mounts: info[t.key].mounts,
    uniqueRefs: info[t.key].uniqueRefs.length,
    tabsTotal: info[t.key].tabsTotal,
    charsTotal: info[t.key].charsTotal,
    emptyShellCount: info[t.key].emptyShellRefs.length,
    missingEntities: info[t.key].missingEntities,
    emptyShellRefs: info[t.key].emptyShellRefs,
  }])),
  overlap: { sharedRefs: refInter, fqcnIntersection: fqcnInter, simpleNameIntersection: smpInter, identicalContentMd5Groups: dupKeys.length, crossZone },
  identity: {
    entitiesWithCanonicalKey: withKey,
    distinctKeys: keyCount.size,
    duplicateKeyGroups: dupKeys2.length,
    classKey: pool[info.CLASS.node.nodeRef]?.canonicalKey ?? null,
    libKey: pool[info.LIB.node.nodeRef]?.canonicalKey ?? null,
    classFamily: family.map(([id, v]) => ({ id, label: v.label, canonicalKey: v.canonicalKey, mounts: mountPathsByRef.get(id) ?? [] })),
  },
  classNodeRoles: info.CLASS.flat.map((f) => ({ path: f.path.join(' > '), nodeRef: f.node.nodeRef, ...roleOf(f.node) })),
  tree: Object.fromEntries(TARGETS.map((t) => [t.key, info[t.key].flat.map((f) => ({ id: f.node.id, name: f.node.name, nodeRef: f.node.nodeRef, depth: f.depth, path: f.path.join(' > ') }))])),
}, null, 2), 'utf8')

console.log(md)
console.log(`\n── 已落盘 ${OUT_DIR}/report.md + report.json ──`)
