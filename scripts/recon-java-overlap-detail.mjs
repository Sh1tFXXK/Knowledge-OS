/**
 * 只读侦察 pass 2：java 子树重叠的深挖。
 *  ① java 内部全量重挂载图（哪些池实体被挂多处）
 *  ② 目标子树内「同名不同实体」对
 *  ③ 可疑对的正文 / API 名交集
 *  ④ 类库/常用（2801 字）是否在复述 常用类库 已有条目
 * 用法：node scripts/recon-java-overlap-detail.mjs [--dump <outfile>]
 * ⛔ 不写任何 data 文件。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const tree = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tree-data.json'), 'utf8'))
const pool = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/node-pool.json'), 'utf8'))
const roots = Array.isArray(tree) ? tree : tree.children ?? tree.nodes ?? []

const L = []
const P = (s = '') => { L.push(s); console.log(s) }

// 全树挂载索引
const walk = (nodes, parentPath, out) => {
  for (const n of nodes) {
    const p = parentPath + '/' + (n.name ?? '(无名)')
    if (n.nodeRef) out.push({ path: p, name: n.name ?? '', nodeRef: n.nodeRef, node: n })
    walk(n.children ?? [], p, out)
  }
}
const all = []
walk(roots, '', all)

const javaNode = all.find((x) => /^java$/i.test(String(x.name).trim()))
const javaPath = javaNode.path
const javaPrefix = javaPath + '/'
const javaNodes = all.filter((x) => x.path === javaNode.path || x.path.startsWith(javaPrefix))

// 找 java 的直接子节点名（用于归属归因）
const javaDirect = new Set()
const relToJava = (p) => {
  const rest = p.slice(javaPrefix.length)
  return rest.split('/')[0]
}

P('════════ ① java 内部全量重挂载图 ════════')
P(`java 子树挂载点 ${javaNodes.length} 个（含 java 自身）`)
const byRef = new Map()
for (const x of javaNodes) {
  if (x.path === javaNode.path) continue
  if (!byRef.has(x.nodeRef)) byRef.set(x.nodeRef, [])
  byRef.get(x.nodeRef).push(x)
}
const multi = [...byRef.entries()].filter(([, v]) => v.length > 1)
P(`java 内挂载 >1 次的池实体：${multi.length} 个`)
const multiCross = multi.filter(([, v]) => new Set(v.map((z) => relToJava(z.path))).size > 1)
const multiSame = multi.filter(([, v]) => new Set(v.map((z) => relToJava(z.path))).size === 1)
P(`  · 跨 java 直接子节点重复：${multiCross.length}`)
P(`  · 同一直接子节点内重复：${multiSame.length}`)
P('')
for (const [ref, v] of multiCross.sort((a, b) => b[1].length - a[1].length)) {
  const e = pool[ref]
  P(`◆ ${ref}  ×${v.length}  池label=${JSON.stringify(e?.label ?? null)}`)
  for (const z of v) P(`     [${relToJava(z.path)}] ${z.path.slice(javaPrefix.length)}`)
}

P('')
P('════════ ② 目标子树内 同名不同实体 ════════')
const TARGETS = ['类', '类库', '常用类库', '特殊类', '对象']
const tNodes = {}
for (const t of TARGETS) {
  const root = all.find((x) => x.path === javaPath + '/' + t)
  tNodes[t] = javaNodes.filter((x) => x.path === root?.path || x.path.startsWith(javaPath + '/' + t + '/'))
}
// 名称 → refs（只在目标子树内）
const nameMap = new Map()
for (const t of TARGETS) for (const x of tNodes[t] ?? []) {
  const k = String(x.name).trim()
  if (!nameMap.has(k)) nameMap.set(k, [])
  nameMap.get(k).push({ t, ref: x.nodeRef, path: x.path.slice(javaPrefix.length) })
}
const collide = [...nameMap.entries()].filter(([, v]) => new Set(v.map((z) => z.ref)).size > 1)
P(`同名但 nodeRef 不同：${collide.length} 组`)
for (const [nm, v] of collide) {
  P(`◆ 「${nm}」  ${new Set(v.map((z) => z.ref)).size} 个不同实体`)
  for (const z of v) {
    const e = pool[z.ref]
    P(`     [${z.t}] ${z.path}   ref=${z.ref}  label=${JSON.stringify(e?.label ?? null)} 正文=${(e?.card?.rootContent ?? '').length} tabs=${(e?.card?.tabs ?? []).length}`)
  }
}

// ── 可疑对：正文 / API 名交集 ────────────────────────────────────────────
const APITOKEN = /\b(?:java|javax)\.[a-z0-9_.]+(?:[A-Z][A-Za-z0-9_]*)?/g
const apiSet = (id) => {
  const e = pool[id]
  if (!e) return new Set()
  const txt = [e.card?.rootContent ?? '', ...(e.card?.tabs ?? []).map((t) => t.content ?? '')].join('\n')
  return new Set(txt.match(APITOKEN) ?? [])
}
const jaccard = (a, b) => { const i = [...a].filter((x) => b.has(x)); return { inter: i, jac: i.length / new Set([...a, ...b]).size } }

P('')
P('════════ ③ 可疑对的 API 名交集（Jaccard）════════')
const PAIRS = [
  ['Files 重名对', 'k_1785378637961_iecl2a', 'k_java_nio_file_files'],
  ['类库/常用 vs 常用类库(节点集)', 'k_1787744960960_nuqg5v', null],
  ['String 同实体（对照）', 'k_java_lang_string', 'k_java_lang_string'],
]
for (const [tag, a, b] of PAIRS) {
  if (!b) continue
  const A = apiSet(a), B = apiSet(b)
  const { inter, jac } = jaccard(A, B)
  P(`◆ ${tag}：${a}(API ${A.size}) ↔ ${b}(API ${B.size}) → 交集 ${inter.length} · Jaccard ${jac.toFixed(3)}`)
  P(`     交集样本：${inter.slice(0, 25).join(', ')}`)
}

P('')
P('════════ ④ 类库/常用（2801 字）是否复述 常用类库 已有条目 ════════')
const ku = pool['k_1787744960960_nuqg5v']
const kuText = ku?.card?.rootContent ?? ''
P(`k_1787744960960_nuqg5v label=${JSON.stringify(ku?.label)} 正文 ${kuText.length} 字 tags=${JSON.stringify(ku?.tags)}`)
P('正文前 400 字：')
P('  ' + kuText.slice(0, 400).replace(/\n/g, ' / '))
// 抽 java 全限定名 token
const kuApis = new Set(kuText.match(APITOKEN) ?? [])
P(`正文内出现全限定 API 名 ${kuApis.size} 个`)
// 子串匹配：这些 token 是否已是 常用类库 下的节点（按 label 复数名/简单名）
const cl = tNodes['常用类库'].filter((x) => x.path.split('/').length === tNodes['常用类库'][0].path.split('/').length + 0 || true)
const clLabels = tNodes['常用类库'].map((x) => String(x.name).trim())
const simple = (s) => s.split('.').pop()
const clSimple = new Set(clLabels.map(simple))
const hitSimple = [...kuApis].filter((a) => clSimple.has(simple(a)))
P(`其中简单名命中 常用类库 现有条目名的：${hitSimple.length} 个 → ${hitSimple.join(', ')}`)
// Base64
const b64 = pool['k_1787852488347_zqzfjo']
P('')
P(`类库/Base64 label=${JSON.stringify(b64?.label)} 正文 ${(b64?.card?.rootContent ?? '').length} 字 tags=${JSON.stringify(b64?.tags)}`)
P('  ' + (b64?.card?.rootContent ?? '').slice(0, 240).replace(/\n/g, ' / '))
P(`  是否在 常用类库 下出现：${clLabels.some((n) => /base64/i.test(n)) ? '是（同名节点）' : '❌ 否'}`)

const dumpAt = process.argv.indexOf('--dump')
if (dumpAt >= 0 && process.argv[dumpAt + 1]) {
  fs.mkdirSync(path.dirname(process.argv[dumpAt + 1]), { recursive: true })
  fs.writeFileSync(process.argv[dumpAt + 1], L.join('\n') + '\n', 'utf8')
  console.log('\n转储 → ' + process.argv[dumpAt + 1])
}
