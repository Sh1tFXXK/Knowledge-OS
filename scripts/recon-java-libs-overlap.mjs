/**
 * 只读侦察：java 子树里「类 / 类库 / 常用类库（+ 特殊类 / 对象）」是否重叠。
 *
 * 用法：node scripts/recon-java-libs-overlap.mjs [--dump <outfile>]
 * 产出：stdout 报表（+ 可选全量转储）。**不写任何 data 文件。**
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const tree = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tree-data.json'), 'utf8'))
const pool = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/node-pool.json'), 'utf8'))
const edges = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/knowledge-edges.json'), 'utf8'))

const roots = Array.isArray(tree) ? tree : tree.children ?? tree.nodes ?? []

// ── 索引：池实体 ← 所有树挂载路径（多挂载检测） ───────────────────────────
const mounts = new Map() // nodeRef -> [{path, name}]
const walk = (nodes, parentPath, depth) => {
  for (const n of nodes) {
    const p = parentPath + '/' + (n.name ?? '(无名)')
    if (n.nodeRef) {
      if (!mounts.has(n.nodeRef)) mounts.set(n.nodeRef, [])
      mounts.get(n.nodeRef).push({ path: p, name: n.name ?? '', depth })
    }
    walk(n.children ?? [], p, depth + 1)
  }
}
walk(roots, '', 0)

// ── 定位 java 及目标子树 ─────────────────────────────────────────────────
const findByName = (nodes, re, acc = []) => {
  for (const n of nodes) {
    if (re.test(String(n.name ?? '').trim())) acc.push(n)
    findByName(n.children ?? [], re, acc)
  }
  return acc
}
const javas = findByName(roots, /^java$/i)
const java = javas[0]
const javaPath = mounts.get(java.nodeRef)?.[0]?.path ?? '/…/java'

const targets = ['类', '类库', '常用类库', '特殊类', '对象']
const targetNodes = {}
for (const c of java.children ?? []) if (targets.includes(String(c.name ?? '').trim())) targetNodes[String(c.name).trim()] = c

const countIn = (n) => (n.children ?? []).reduce((s, x) => s + 1 + countIn(x), 0)

// ── 池实体画像 ───────────────────────────────────────────────────────────
const profile = (id) => {
  const e = pool[id]
  if (!e) return null
  const tabs = e.card?.tabs ?? []
  return {
    id,
    label: e.label ?? null,
    role: e.role ?? null,
    tags: e.tags ?? [],
    rootLen: (e.card?.rootContent ?? '').length,
    tabs: tabs.map((t) => ({ id: t.id, label: t.label, len: (t.content ?? '').length })),
    methodTabs: tabs
      .filter((t) => t.id !== 'def' && t.label !== '定义')
      .map((t) => t.id),
  }
}

// ── 收集每棵目标子树的节点清单 ───────────────────────────────────────────
const collect = (n, basePath, depth, out = []) => {
  for (const c of n.children ?? []) {
    const name = String(c.name ?? '(无名)').trim()
    const p = basePath + '/' + name
    out.push({ depth, name, nodeRef: c.nodeRef ?? null, path: p, node: c })
    collect(c, p, depth + 1, out)
  }
  return out
}

const lines = []
const L = (s = '') => { lines.push(s); console.log(s) }

L('════════ java 子树重叠侦察 ════════')
L(`java 路径：${javaPath}   nodeRef=${java.nodeRef}   子树 1+${countIn(java)} = ${1 + countIn(java)} 节点`)
L(`java 直接子节点 ${(java.children ?? []).length} 个`)
L('')

const subtrees = {}
for (const t of targets) {
  const n = targetNodes[t]
  if (!n) { L(`⏭ 未找到 java > ${t}`); continue }
  const nodes = collect(n, `${javaPath}/${t}`, 0)
  subtrees[t] = { node: n, nodes }
  L(`── java > ${t}   nodeRef=${n.nodeRef ?? '(无)'}  子树 1+${countIn(n)} 个节点`)
}

// ── 维度 1：多挂载（同一 nodeRef 挂多处） ────────────────────────────────
L('')
L('════ 维度 1 · 同一池实体在 java 子树内的多挂载 ════')
const targetRefs = new Map() // nodeRef -> [ {target, path} ]
for (const [t, s] of Object.entries(subtrees)) {
  for (const x of s.nodes) if (x.nodeRef) {
    if (!targetRefs.has(x.nodeRef)) targetRefs.set(x.nodeRef, [])
    targetRefs.get(x.nodeRef).push({ target: t, path: x.path })
  }
}
const crosses = [...targetRefs.entries()].filter(([, v]) => new Set(v.map((z) => z.target)).size > 1)
const dupsIn = [...targetRefs.entries()].filter(([, v]) => v.length > 1 && new Set(v.map((z) => z.target)).size === 1)
L(`跨目标子树共享同一 nodeRef：${crosses.length} 个`)
for (const [ref, v] of crosses) {
  const p = profile(ref)
  L(`  ◆ ${ref}  池label=${JSON.stringify(p?.label ?? null)}`)
  for (const z of v) L(`      [${z.target}] ${z.path}`)
}
L(`同一目标子树内重复挂载同一 nodeRef：${dupsIn.length} 个`)
for (const [ref, v] of dupsIn) {
  L(`  ◆ ${ref}  ×${v.length}`)
  for (const z of v) L(`      [${z.target}] ${z.path}`)
}

// ── 维度 2：同名节点 ────────────────────────────────────────────────────
L('')
L('════ 维度 2 · 目标子树之间的同名节点 ════')
const byName = new Map()
for (const [t, s] of Object.entries(subtrees)) for (const x of s.nodes) {
  if (!byName.has(x.name)) byName.set(x.name, [])
  byName.get(x.name).push({ target: t, path: x.path })
}
const sameName = [...byName.entries()].filter(([, v]) => new Set(v.map((z) => z.target)).size > 1)
L(`跨目标子树同名：${sameName.length} 组`)
for (const [nm, v] of sameName.sort((a, b) => b[1].length - a[1].length)) {
  L(`  ◆ 「${nm}」×${v.length}`)
  for (const z of v) L(`      [${z.target}] ${z.path}`)
}

// ── 维度 3：池实体级（方法 tab / rootContent）重叠 ───────────────────────
L('')
L('════ 维度 3 · 方法 tab 与正文的重叠 ════')
const perTargetMethods = {}
for (const [t, s] of Object.entries(subtrees)) {
  const m = new Map()
  for (const x of s.nodes) {
    const p = x.nodeRef ? profile(x.nodeRef) : null
    if (p && p.methodTabs.length) m.set(p.id, p.methodTabs)
  }
  perTargetMethods[t] = m
  L(`── ${t}：带方法 tab 的池实体 ${m.size} 个`)
  for (const [id, tabs] of m) L(`     ${id.padEnd(28)} ${tabs.length} 个方法 → ${tabs.slice(0, 8).join(', ')}${tabs.length > 8 ? ' …' : ''}`)
}

const tnames = Object.keys(perTargetMethods)
for (let i = 0; i < tnames.length; i++) {
  for (let j = i + 1; j < tnames.length; j++) {
    const A = tnames[i], B = tnames[j]
    const aIds = new Set(perTargetMethods[A].keys())
    const bIds = new Set(perTargetMethods[B].keys())
    const shared = [...aIds].filter((x) => bIds.has(x))
    // 方法名级交集
    const flat = (m) => { const s = new Set(); for (const v of m.values()) v.forEach((x) => s.add(x)); return s }
    const fa = flat(perTargetMethods[A]), fb = flat(perTargetMethods[B])
    const fm = [...fa].filter((x) => fb.has(x))
    if (shared.length || fm.length) {
      L('')
      L(`  ◆ ${A} ↔ ${B}：共享池实体 ${shared.length} 个；方法名交集 ${fm.length} 个`)
      if (shared.length) L(`      共享实体 → ${shared.join(', ')}`)
      if (fm.length) L(`      交集方法 → ${fm.slice(0, 20).join(', ')}${fm.length > 20 ? ' …' : ''}`)
    }
  }
}

// ── 维度 4：tags 重叠 ───────────────────────────────────────────────────
L('')
L('════ 维度 4 · tags 分布（看语义面是否同质）════')
for (const [t, s] of Object.entries(subtrees)) {
  const tagCount = new Map()
  let withTags = 0
  for (const x of s.nodes) {
    const p = x.nodeRef ? profile(x.nodeRef) : null
    if (p?.tags?.length) { withTags++; for (const g of p.tags) tagCount.set(g, (tagCount.get(g) ?? 0) + 1) }
  }
  const top = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  L(`── ${t}：${s.nodes.length} 节点中 ${withTags} 个带 tags；高频 → ${top.map(([k, v]) => `${k}×${v}`).join(' · ')}`)
}

// ── 维度 5：内容规模画像 ────────────────────────────────────────────────
L('')
L('════ 维度 5 · 内容规模画像（rootContent 长度 / tab 数）════')
for (const [t, s] of Object.entries(subtrees)) {
  let withRoot = 0, rootSum = 0, tabSum = 0, empty = 0
  for (const x of s.nodes) {
    const p = x.nodeRef ? profile(x.nodeRef) : null
    if (!p) { empty++; continue }
    if (p.rootLen > 0) { withRoot++; rootSum += p.rootLen }
    tabSum += p.tabs.length
  }
  L(`── ${t}：节点 ${s.nodes.length} · 池缺失/无 nodeRef ${empty} · 有正文 ${withRoot}（总 ${rootSum} 字，均值 ${withRoot ? Math.round(rootSum / withRoot) : 0}）· tab 合计 ${tabSum}`)
}

// ── 全量转储 ────────────────────────────────────────────────────────────
const dumpFlag = process.argv.indexOf('--dump')
if (dumpFlag >= 0) {
  const out = process.argv[dumpFlag + 1]
  const buf = []
  buf.push('# java 子树重叠侦察 · 全量节点清单')
  buf.push('')
  for (const [t, s] of Object.entries(subtrees)) {
    buf.push(`## java > ${t}（1+${countIn(s.node)} 节点）`)
    buf.push('')
    buf.push('| 深度 | 名称 | nodeRef | 池 label | 正文 | tabs | 方法 tab |')
    buf.push('|---|---|---|---|---|---|---|')
    for (const x of s.nodes) {
      const p = x.nodeRef ? profile(x.nodeRef) : null
      buf.push(`| ${x.depth} | ${x.name} | ${x.nodeRef ?? '—'} | ${p?.label ?? '—'} | ${p?.rootLen ?? '—'} | ${p ? p.tabs.length : '—'} | ${p ? p.methodTabs.length : '—'} |`)
    }
    buf.push('')
  }
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, buf.join('\n') + '\n', 'utf8')
  console.log('\n全量转储 → ' + out)
}

// ── 边表端点核查 ────────────────────────────────────────────────────────
L('')
L('════ 维度 6 · 边表里指向这些池实体的结构边 ════')
const ids = new Set()
for (const s of Object.values(subtrees)) for (const x of s.nodes) if (x.nodeRef) ids.add(x.nodeRef)
const rel = edges.filter((e) => ids.has(e.source) || ids.has(e.target))
L(`相关边 ${rel.length} 条（涉及实体 ${ids.size} 个）`)
const byType = new Map()
for (const e of rel) { const k = `${e.type}/${e.relationKind ?? '-'}`; byType.set(k, (byType.get(k) ?? 0) + 1) }
for (const [k, v] of [...byType.entries()].sort((a, b) => b[1] - a[1])) L(`   ${k} ×${v}`)
