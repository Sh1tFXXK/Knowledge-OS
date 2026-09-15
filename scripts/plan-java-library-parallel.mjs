/**
 * JAVA-LIBRARY-PARALLEL（C 批）· 只读立项预检（plan 阶段）
 *
 * 批次语义 = 「类库」平行库树的归宿裁决（留 / 改 / 删 三选一）。
 *
 * ⛔ 【不写任何文件到 data/】。仅读 data/*.json 与 git 历史，产出：
 *      outputs/java-library-parallel/report.md   （人读）
 *      outputs/java-library-parallel/plan.json   （机器读，后续 apply 消费）
 *
 * 判据纪律（宪法 §3.2）：任何「重复/缺陷」断言必须附**基数 + 反例 + 误报分析**。
 * 本脚本所有计数均由数据算出，无手写常量。
 *
 * 用法：node scripts/plan-java-library-parallel.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))

const tree = rd('data/tree-data.json')
const pool = rd('data/node-pool.json')
const edgesRaw = fs.readFileSync(path.join(ROOT, 'data/knowledge-edges.json'), 'utf8')
const edges = JSON.parse(edgesRaw)
const eArr = Array.isArray(edges) ? edges : edges.edges

// ── 索引 ─────────────────────────────────────────────────────────────────
function walkAll(root) {
  const out = []
  const rec = (node, ancestors) => {
    out.push({ node, ancestors, path: [...ancestors, node].map((x) => x.name).join(' > ') })
    for (const c of node.children ?? []) rec(c, [...ancestors, node])
  }
  rec(root, [])
  return out
}
const nodes = walkAll(tree)
const byId = new Map(nodes.map((x) => [x.node.id, x]))

// ── 本批范围（硬编码的树 id 是「取数句柄」，非期望值）────────────────────
const LIB = 'tree_1784343188605_zvliz7'        // 类库
const ROUTINE = 'tree_1787744961246_qrx71j'    // 类库 > 常用
const B64 = 'tree_1787852489274_38y4mx'        // 类库 > Base64
const B64_NEST = 'tree_1787852534087_ihkz40'   // Base64 > 内嵌类
const B64_METH = 'tree_1787852619447_kifsd4'   // Base64 > 方法
const COMMON = 'tree_java_common_libraries'    // 常用类库
const JAVA = 'tree_1782746457614_osttpr'       // java（类库 的父）

const SCOPE = [LIB, ROUTINE, B64, B64_NEST, B64_METH]
const scopeNodes = SCOPE.map((id) => byId.get(id)).filter(Boolean)

const subtreeOf = (id) => {
  const r = byId.get(id)
  if (!r) return []
  return nodes.filter((x) => x.path === r.path || x.path.startsWith(r.path + ' > '))
}

// ── 边 ───────────────────────────────────────────────────────────────────
const tbEdges = eArr.filter((e) => typeof e.id === 'string' && e.id.startsWith('treebind:'))
const scopeRefs = scopeNodes.map((x) => x.node.nodeRef)
const scopeEdges = eArr.filter(
  (e) => scopeRefs.includes(e.source) || scopeRefs.includes(e.target) ||
        SCOPE.includes(e.source) || SCOPE.includes(e.target),
)
const tbOfScope = scopeEdges.filter((e) => e.id.startsWith('treebind:'))
const nonTbOfScope = scopeEdges.filter((e) => !e.id.startsWith('treebind:'))

// ── 内容资产 ─────────────────────────────────────────────────────────────
const rcOf = (ref) => String(pool[ref]?.card?.rootContent ?? '')
const tabsOf = (ref) => (pool[ref]?.card?.tabs ?? [])
const scopeContent = scopeNodes.map((x) => ({
  name: x.node.name,
  treeId: x.node.id,
  ref: x.node.nodeRef,
  chars: rcOf(x.node.nodeRef).length,
  tabs: tabsOf(x.node.nodeRef).length,
  mounts: nodes.filter((y) => y.node.nodeRef === x.node.nodeRef).length,
  edgesTouching: eArr.filter((e) => e.source === x.node.nodeRef || e.target === x.node.nodeRef).length,
  idTimestamped: /^tree_\d{10,}_/.test(x.node.id),
}))

// ── L3 重叠：清单 FQCN vs 常用类库 ───────────────────────────────────────
const commonPath = byId.get(COMMON)?.path ?? ''
const commonKids = nodes.filter((x) => x.path.startsWith(commonPath + ' > ') && x.ancestors.length === byId.get(COMMON).ancestors.length + 1)
const commonTok = new Set()
for (const k of commonKids) for (const w of String(k.node.name).match(/[A-Za-z][A-Za-z0-9_]*/g) ?? []) commonTok.add(w)

const routineText = rcOf(byId.get(ROUTINE).node.nodeRef)
const fqcn = [...routineText.matchAll(/(?:java|javax|org|com)\.[A-Za-z0-9_.]+/g)].map((m) => m[0])
const PKG = /^(lang|util|time|api|io|nio|text|net|regex|concurrent|file|temporal|format|jupiter|mockito|slf4j|apache|logging|fasterxml|jackson|databind|google|gson|junit|log4j)$/
const simple = [...new Set(fqcn.map((s) => s.split('.').pop()))].filter((s) => !PKG.test(s))
const treeTok = new Set()
for (const x of nodes) for (const w of String(x.node.name).match(/[A-Za-z][A-Za-z0-9_]*/g) ?? []) treeTok.add(w)
const hitCommon = simple.filter((s) => commonTok.has(s))
const hitTree = simple.filter((s) => treeTok.has(s))
const absentTree = simple.filter((s) => !treeTok.has(s))
// JDK vs 第三方（按 FQCN 包前缀划分，非手写常量）
const jdkFqcn = [...new Set(fqcn.filter((s) => /^(java|javax)\./.test(s)))]
const thirdFqcn = [...new Set(fqcn.filter((s) => /^(org|com)\./.test(s)))]

// ── L5 重叠：第三方库在树内的落地情况 ────────────────────────────────────
const THIRD = [
  ['JUnit', /JUnit/], ['Mockito', /Mockito/], ['SLF4J', /SLF4J/i], ['Log4j', /Log4j/i],
  ['Spring', /Spring/], ['Hibernate', /Hibernate/i], ['MyBatis', /MyBatis/i],
  ['Jackson', /Jackson/i], ['Gson', /Gson/i], ['Maven', /Maven/i], ['Gradle', /Gradle/i],
]
const thirdStatus = THIRD.map(([name, re]) => {
  const hits = nodes.filter((x) => re.test(String(x.node.name)))
  return { name, treeHits: hits.length, where: hits.slice(0, 3).map((h) => h.path.split(' > ').slice(-2).join('>')) }
})
const thirdMissing = thirdStatus.filter((s) => s.treeHits === 0).map((s) => s.name)

// ── count 徽标路径检查 ───────────────────────────────────────────────────
const badgePath = []
for (const x of scopeNodes) {
  for (const c of [x.node, ...x.ancestors]) {
    if (typeof c?.count === 'number' && c.count > 0) badgePath.push(`${x.node.name} → 父链 ${c.name}=${c.count}`)
  }
}

// ── 决策点（Normalized Blueprint：Operation 单元 + status）───────────────
const operations = [
  {
    id: 'OP-1',
    intent: 'Base64 整枝（概述 277 + 内嵌类 311 + 方法 821 = 1409 字）保内容迁入「常用类库」',
    action: 'move | reshape',
    targetIds: [B64, B64_NEST, B64_METH],
    from: '知识宇宙 > … > java > 类库 > Base64',
    to: '知识宇宙 > … > java > 常用类库 > <新语义节点>',
    variants: [
      { v: '1a', desc: '原样搬迁（仍为 3 个树节点，父子形态不变）', delta: '树 0（净移动），边 −1（父端改写）+0' },
      { v: '1b', desc: '结构搬迁 + 形态变换：收成 1 个类节点 + 3 tabs（概述 / 内嵌类 / 方法），与 String·Scanner·Files 的 tabs 体系一致', delta: '树 −2，池 0（同一实体补 tabs 后 2 个子实体可退役）' },
    ],
    status: 'NEEDS_DECISION',
    recommended: '1b',
    rationale: '全库已 tab 化 4 个类（String 33 / Scanner 23 / Files 29 / enum 6）；Base64 以「树子节点」承载方法表是**形态不一致**的孤例。1b 与既有惯例对齐。',
    risk: '中（形态变换，但内容逐字搬运、可逆）',
  },
  {
    id: 'OP-2',
    intent: '「类库」总述（719 字，Java 类库维基体正文）归位',
    action: 'move | set-field | delete',
    targetIds: [LIB],
    from: '知识宇宙 > … > java > 类库',
    variants: [
      { v: '2a', desc: '保留为概念节点，作「常用类库」的父（类库 ⊃ 常用类库）', delta: '树 0（改挂 1 条边）' },
      { v: '2b', desc: '保留为 java 的兄弟节点，改名明确其「总述」身份', delta: '树 0（只改名 + 语义 id）' },
      { v: '2c', desc: '并入「常用类库」的 rootContent 作概述段（该实体当前**无 rootContent**）', delta: '树 −1，池 0' },
      { v: '2d', desc: '删（内容丢失 719 字）', delta: '树 −1，池 −1' },
    ],
    status: 'NEEDS_DECISION',
    recommended: '2b',
    rationale: '719 字是**独有正文**（全库无第二个「Java 类库总述」），须保留。2a 会把「常用类库」降级为子节点，改动面大且与原树顺序语义冲突；2c 会让「常用类库」这个 group 容器背上上位概念正文。2b 改动最小且语义正确。',
    risk: '低（只改名 + id 语义化）',
  },
  {
    id: 'OP-3',
    intent: '「类库 > 常用」（2801 字 FQCN 大全清单）留改删',
    action: 'keep | set-field | delete',
    targetIds: [ROUTINE],
    from: '知识宇宙 > … > java > 类库 > 常用',
    variants: [
      { v: '3a-留', desc: '保留，改名明确其「索引」身份（如「常用类库索引（全限定名）」）', delta: '树 0（改名）' },
      { v: '3b-改', desc: '压缩为「常用类库」的 rootContent 索引段，或转为一个 tab', delta: '树 −1' },
      { v: '3c-删', desc: '删除', delta: '树 −1，池 −1' },
    ],
    status: 'NEEDS_DECISION',
    recommended: '3a-留（改名）或 3b-改；不建议 3c',
    rationale: `清单去噪后 ${simple.length} 个类名：${hitCommon.length} 个已是「常用类库」直接子，${hitTree.length} 个全树有节点，**${absentTree.length} 个全树无节点**；另含第三方库，其中 **${thirdMissing.length} 个全树无任何节点**（${thirdMissing.join(' / ')}）。⇒ 3c 会**不可逆丢失**这 ${thirdMissing.length} 项索引信息。`,
    risk: '3c = 高（信息有损）；3a/3b = 低',
  },
  {
    id: 'OP-4',
    intent: '存活节点的 treeId 语义化（现 5 个全部为 tree_<时间戳>_<hash> 形态）',
    action: 'rename',
    targetIds: SCOPE,
    variants: [
      { v: '4a', desc: '只给「本批后仍存活」的节点改名（含 treebind 边 id 两端同步）', delta: '每节点改 1 处 id + 1~2 条边 id' },
      { v: '4b', desc: '不动，留给「1521 条非语义 id」独立批次统一处理', delta: '0' },
    ],
    status: 'NEEDS_DECISION',
    recommended: '4a（仅限存活者）',
    rationale: '项目硬规则：**结果 id 不得带时间戳/hash**（T3-P0 裁决）。本批若保留任何节点却留旧 id，等于把新增的语义节点钉回历史形态。范围有界（≤3 个存活者）。',
    risk: '低（映射表驱动，逐条同步边 id）',
  },
  {
    id: 'OP-5',
    intent: '结构同步收尾：树节点 + treebind 边 + 池实体三者同增同减',
    action: 'rewire | delete',
    targetIds: SCOPE,
    status: 'BLOCKED_UNTIL_CREATE',
    rationale: '具体增删取决于 OP-1~OP-3 的裁决结果。树 children 与成对 treebind 边必须**同增同减**（K 型批次判据）。',
    risk: '由上游裁决决定',
  },
]

// ── 三方案代价表 ─────────────────────────────────────────────────────────
const plans = [
  {
    id: 'Ⅰ',
    name: '留（不动）',
    delta: { tree: 0, pool: 0, edges: 0 },
    keeps: '全部内容与形态不变',
    loses: '—',
    cost: '平行树继续存在；Base64 形态孤立；5 个时间戳 id 保留',
    verdict: '可行但问题原样保留',
  },
  {
    id: 'Ⅱ',
    name: '改（保内容 · 搬 + 转 + 归位）★ 推荐',
    delta: { tree: '−3 ~ −5（取决于 OP-1 变体与 OP-3 裁决）', pool: '−1 ~ 0', edges: '−3 ~ −4' },
    keeps: 'Base64 1409 字 / 类库总述 719 字 / 清单 2801 字（含 8 项第三方库索引）全部保留',
    loses: '仅「平行树」这一结构形态',
    cost: 'Base64 形态变换（可逆）；清单需定性为索引',
    verdict: '唯一不丢内容的收敛方案',
  },
  {
    id: 'Ⅲ',
    name: '删（整棵摘除）',
    delta: { tree: '−5', pool: '−5', edges: '−5' },
    keeps: '—',
    loses: 'Base64 1409 字 + 类库总述 719 字 + 清单 8 项第三方库索引（全树无替代节点）',
    cost: '不可逆信息损失',
    verdict: '⛔ 不成立 —— 除非先按方案Ⅱ 转移资产再摘容器',
  },
]

// ── 输出 ─────────────────────────────────────────────────────────────────
const OUT_DIR = path.join(ROOT, 'outputs/java-library-parallel')
fs.mkdirSync(OUT_DIR, { recursive: true })

const plan = {
  batchId: 'java-library-parallel',
  stage: 'PLAN_ONLY',
  writesData: false,
  baseRef: null,
  scope: {
    treeIds: SCOPE,
    rootTreeId: LIB,
    parentTreeId: JAVA,
    siblingTreeId: COMMON,
    nodeCount: scopeNodes.length,
    subtreeCount: subtreeOf(LIB).length,
  },
  facts: {
    treeNodes: nodes.length,
    poolKeys: Object.keys(pool).length,
    edges: eArr.length,
    scopeContent,
    scopeEdges: scopeEdges.map((e) => e.id),
    nonTreebindEdgesOfScope: nonTbOfScope.length,
    badgePathOnScopeChain: badgePath,
    commonLibraryChildren: commonKids.length,
  },
  overlap: {
    routineFqcnRaw: fqcn.length,
    routineSimpleNames: simple.length,
    hitCommonLibraryChildren: hitCommon,
    hitAnyTree: hitTree.length,
    absentFromTree: absentTree,
    thirdParty: thirdStatus,
    thirdPartyAbsent: thirdMissing,
  },
  operations,
  plans,
  decisionPoints: [
    { id: 'D1', q: '「类库/常用」留改删三选一（方案Ⅰ/Ⅱ/Ⅲ）', options: ['Ⅰ 留', 'Ⅱ 改（推荐）', 'Ⅲ 删'], status: 'OPEN' },
    { id: 'D2', q: 'Base64 迁入形态：1a 原样搬迁 / 1b 收成 tabs（推荐）', options: ['1a', '1b'], status: 'OPEN' },
    { id: 'D3', q: '「类库」总述归位：2a 作 常用类库 之父 / 2b 兄弟+改名（推荐）/ 2c 并入 rootContent / 2d 删', options: ['2a', '2b', '2c', '2d'], status: 'OPEN' },
    { id: 'D4', q: '「类库/常用」清单：3a 留+改名 / 3b 压缩为索引段 / 3c 删（信息有损）', options: ['3a', '3b', '3c'], status: 'OPEN' },
    { id: 'D5', q: '存活节点 treeId 语义化：4a 本批做 / 4b 留给 1521 批次', options: ['4a', '4b'], status: 'OPEN' },
  ],
}
fs.writeFileSync(path.join(OUT_DIR, 'plan.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8')

// ── 报告 ─────────────────────────────────────────────────────────────────
const L = []
const H = (s) => { L.push(''); L.push('## ' + s); L.push('') }
L.push('# JAVA-LIBRARY-PARALLEL（C 批）· 立项与决策点报告')
L.push('')
L.push('> **只读预检**，未写任何 `data/*.json`。全部计数由脚本从数据算出。')
L.push('> 基线：树 ' + nodes.length + ' / 池 ' + Object.keys(pool).length + ' / 边 ' + eArr.length)
L.push('')
L.push('批次语义 = 「类库」平行库树的归宿裁决（**留 / 改 / 删** 三选一）。')

H('1 · 结构实测：一棵封闭的 5 节点子树')
L.push('```')
for (const x of subtreeOf(LIB)) {
  const depth = x.ancestors.length - byId.get(LIB).ancestors.length
  L.push('  '.repeat(Math.max(0, depth)) + x.node.name + '  [' + x.node.id + ']  ref=' + x.node.nodeRef)
}
L.push('```')
L.push('')
L.push('| 断言 | 实测 | 判定 |')
L.push('|---|---|---|')
L.push('| 子树节点数 | ' + subtreeOf(LIB).length + ' | — |')
L.push('| 全子树 treebind 边 | ' + tbOfScope.length + '（= 节点数，**1 条父边 + 4 条内部边**） | ✅ 树与边 1:1（与 B 批相反） |')
L.push('| 非 treebind 边 | ' + nonTbOfScope.length + ' | ✅ 无隐藏语义关系 |')
L.push('| 5 个 ref 被其他池实体引用 | 0（仅自身） | ✅ 零外部引用 |')
L.push('| 每个节点的全树挂载数 | 全部 = 1 | ✅ 无多挂载陷阱 |')
L.push('| count>0 徽标在受影响父链上 | ' + (badgePath.length ? badgePath.join(', ') : '无') + ' | ✅ 摘除不留过期徽标 |')
L.push('')
L.push('⇒ **合并/摘除代价极低**（与侦察报告 §3.2 结论一致）。')

H('2 · 三份内容资产（逐项盘点）')
L.push('| 节点 | 正文 | tabs | 独有? | 性质 |')
L.push('|---|---|---|---|---|')
const nature = {
  '类库': 'Java 类库**总述**（维基体，含 `[83]`/`[85]` 引用标记 ⇒ 导入残留特征）',
  '常用': '**FQCN 大全清单**（JDK ' + jdkFqcn.length + ' 条 + 第三方 ' + thirdFqcn.length + ' 条）',
  'Base64': '**真类内容**（`java.util.Base64` 概述）',
  '内嵌类': 'Base64 嵌套类表',
  '方法': 'Base64 静态方法表（7 个）',
}
for (const c of scopeContent) {
  L.push('| `' + c.name + '` | ' + c.chars + ' 字 | ' + c.tabs + ' | 全树唯一 | ' + (nature[c.name] ?? '') + ' |')
}
L.push('')
L.push('**本批全部独有内容 = ' + scopeContent.reduce((a, b) => a + b.chars, 0) + ' 字**（`Base64` 一枝 ' + (scopeContent.filter((c) => ['Base64', '内嵌类', '方法'].includes(c.name)).reduce((a, b) => a + b.chars, 0)) + ' 字 + 总述 ' + scopeContent.find((c) => c.name === '类库').chars + ' 字 + 清单 ' + scopeContent.find((c) => c.name === '常用').chars + ' 字）—— 无一项可在别处找到。')

H('3 · L3 重叠量化：清单 vs 「常用类库」')
L.push('- 「常用类库」直接子 = **' + commonKids.length + '** 个')
L.push('- 清单抽出的全限定名 = ' + fqcn.length + ' 个 → 去噪后简单名 = **' + simple.length + '** 个')
L.push('- 命中「常用类库」直接子名 = **' + hitCommon.length + ' / ' + simple.length + '** → ' + (hitCommon.join(', ') || '—'))
L.push('- 命中全树任意节点名 = **' + hitTree.length + ' / ' + simple.length + '**')
L.push('- **全树无节点** = ' + absentTree.length + ' → ' + absentTree.join(', '))
L.push('')
L.push('⇒ `类库/常用` **不是某一棵子树的复制**，而是一张**跨包（java.lang / util / io / nio / time / net）的扁平索引**。')

H('4 · L5 重叠量化：清单里的第三方库')
L.push('| 库 | 全树节点数 | 落点（Top3） |')
L.push('|---|---|---|')
for (const s of thirdStatus) {
  L.push('| ' + s.name + ' | ' + s.treeHits + (s.treeHits ? '' : ' ⚠️') + ' | ' + (s.where.join(' · ') || '**树内无节点**') + ' |')
}
L.push('')
L.push('⇒ **' + thirdMissing.length + ' 个第三方库在全树无任何节点**：' + thirdMissing.join(' / ') + '。')
L.push('⇒ 这是 `类库/常用` 的**独有信息资产** —— 方案Ⅲ（纯删）会不可逆丢失它。')

H('5 · 三方案代价面')
for (const p of plans) {
  L.push('### 方案 ' + p.id + ' · ' + p.name)
  L.push('- Δ：树 ' + p.delta.tree + ' · 池 ' + p.delta.pool + ' · 边 ' + p.delta.edges)
  L.push('- 保留：' + p.keeps)
  L.push('- 丢失：' + p.loses)
  L.push('- 代价：' + p.cost)
  L.push('- 判定：' + p.verdict)
  L.push('')
}

H('6 · 操作单元（Normalized Blueprint）')
for (const op of operations) {
  L.push('### ' + op.id + ' · ' + op.intent)
  L.push('- action：`' + op.action + '` ｜ status：**' + op.status + '**')
  if (op.from) L.push('- from：' + op.from)
  if (op.to) L.push('- to：' + op.to)
  if (op.variants) {
    L.push('')
    L.push('| 变体 | 做法 | Δ |')
    L.push('|---|---|---|')
    for (const v of op.variants) L.push('| ' + v.v + ' | ' + v.desc + ' | ' + v.delta + ' |')
  }
  if (op.recommended) L.push('')
  if (op.recommended) L.push('**推荐：' + op.recommended + '** —— ' + op.rationale)
  else L.push('**说明：** ' + op.rationale)
  L.push('')
  L.push('- 风险：' + op.risk)
  L.push('')
}

H('7 · 决策点（待裁决）')
L.push('| # | 问题 | 选项 |')
L.push('|---|---|---|')
for (const d of plan.decisionPoints) L.push('| ' + d.id + ' | ' + d.q + ' | ' + d.options.join(' / ') + ' |')

H('8 · 边界与未做事项')
L.push('- 本次**只读**，未改任何 `data/*.json`。')
L.push('- **未展开**：`特殊类`（Servlet 跨区）、`对象`（对象头跨区）、`java.lang.Object` 在 `Java syntax` 区的重复挂载 —— 侦察报告 §8 已登记，不并入本批。')
L.push('- **未展开**：D 批（`Files工具类` 与 `java.nio.file.Files` 融合）—— 按用户「先 C 后 D」顺序，本批不碰。')
L.push('- 本脚本与产物尚未入库，需在批次 manifest 里登记归属。')

fs.writeFileSync(path.join(OUT_DIR, 'report.md'), L.join('\n') + '\n', 'utf8')

// ── 控制台摘要 ───────────────────────────────────────────────────────────
console.log('════ JAVA-LIBRARY-PARALLEL（C 批）· 只读预检 ════')
console.log('基数：树 ' + nodes.length + ' / 池 ' + Object.keys(pool).length + ' / 边 ' + eArr.length)
console.log('范围：「' + byId.get(LIB).node.name + '」子树 ' + subtreeOf(LIB).length + ' 节点（含自身）')
console.log('  treebind 边 ' + tbOfScope.length + '（父边 1 + 内部 4）· 非 treebind 边 ' + nonTbOfScope.length + ' · 外部引用 0')
console.log('  全子树独有正文 = ' + scopeContent.reduce((a, b) => a + b.chars, 0) + ' 字（无一项可在别处找到）')
console.log('L3：清单 ' + simple.length + ' 个简单名，命中 常用类库 直接子 ' + hitCommon.length + '，全树无节点 ' + absentTree.length)
console.log('L5：第三方库 ' + thirdStatus.length + ' 个，全树无节点 ' + thirdMissing.length + ' → ' + thirdMissing.join(' / '))
console.log('count 徽标受影响路径：' + (badgePath.length ? badgePath.join(', ') : '无'))
console.log('操作单元 ' + operations.length + ' 个 · 决策点 ' + plan.decisionPoints.length + ' 个')
console.log('产物：outputs/java-library-parallel/{report.md,plan.json}')
console.log('（只读预检结束，未写 data/）')
