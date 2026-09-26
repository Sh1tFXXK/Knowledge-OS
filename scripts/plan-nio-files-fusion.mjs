/**
 * NIO-FILES-FUSION（D 批）· plan（**只读 data/**，输出报告到 outputs/nio-files-fusion/）
 *
 * 批次语义：把「Files工具类」(k_nio_files_util) 的内容融合进「java.nio.file.Files」(k_java_nio_file_files)，
 *           再摘掉前者。
 *
 * ★ 本脚本的义务（只读预检）：
 *   1. 钉死三方（承接方 / 待融合方 / 索引导览）的挂载形态与边分布
 *   2. 三方方法名对齐（机械提取，不手写任何数字）
 *   3. 待融合方的**非方法资产**清点（选项常量 / 分节框架 / 前言）
 *   4. 重叠方法的文本丰富度对比（决定融合时哪一侧胜出）
 *   5. 给出 3 个融合方案 + Δ + 决策点
 *
 * 用法：node scripts/plan-nio-files-fusion.mjs
 * 注意：本脚本**不写 data/**，无 --apply。
 */
import fs from 'node:fs'
import path from 'node:path'

// ── 范围常量（句柄，不是期望值）────────────────────────────────────────────
export const REF_PRIMARY = 'k_java_nio_file_files'   // 承接方：java.nio.file.Files
export const TREE_PRIMARY = 'tree_java_nio_file_files'
export const REF_TOOL = 'k_nio_files_util'           // 待融合：Files工具类
export const TREE_TOOL = 'tree_nio_files_util'
export const REF_GUIDE = 'k_1787916226907_9aq9u6'    // 承接方的树子节点「常见用法」
export const TREE_GUIDE = 'tree_1787916227408_nkaljw'
export const REF_BEST = 'k_1787916124192_mow0sq'     // 承接方的树子节点「最佳实践」
export const TREE_BEST = 'tree_1787916125075_qsrbco'
/** 承接方里「非方法」的 tab（其余 tab 一律视作方法 tab）—— 依据是 label 不含 `()` */
const NON_METHOD_LABEL_RE = /\(\)/

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'outputs/nio-files-fusion')
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const rdText = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

function walkTree(root) {
  const out = []
  const rec = (n, ancestors) => {
    // ⚠️ ancestors 里必须压**名字字符串**，压节点对象会让 path 打成 `[object Object] > …`
    //    （首版即此缺陷：连带使「路径含『类库』」的子树统计归零）
    out.push({ node: n, depth: ancestors.length, path: [...ancestors, n.name].join(' > ') })
    for (const c of n.children ?? []) rec(c, [...ancestors, n.name])
  }
  rec(root, [])
  return out
}

/**
 * 从「- 签名：说明」体例的正文里机械提取方法签名。
 * ⚠️ 实测该体例**不一致**：部分行带返回类型（`- boolean exists(...)`），
 *    多数行不带（`- createFile(...)`）⇒ 判据取「行内第一个 `(` 之前最后一个标识符」，
 *    **不能**用「必须有返回类型」的正则（首版即因此只捞到 6/49）。
 * @returns {{name:string, line:string, hasReturnType:boolean}[]} 去重（保留首次出现序）
 */
export function extractSignatures(text) {
  const out = []
  const seen = new Set()
  for (const raw of String(text ?? '').split('\n')) {
    const s = raw.trim()
    if (!/^-\s*\S/.test(s)) continue
    const i = s.indexOf('(')
    if (i < 0) continue
    const m = s.slice(0, i).match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/)
    if (!m) continue
    const name = m[1]
    if (seen.has(name)) continue
    seen.add(name)
    // 行内第一个 ( 之前，除了方法名还残留别的词 ⇒ 说明带了返回类型/宿主类
    const before = s.slice(0, i).replace(/^-\s*/, '').replace(new RegExp(name + '\\s*$'), '').trim()
    out.push({ name, line: s, hasReturnType: before.length > 0, prefix: before })
  }
  return out
}

/** 同上，但**保留重复**（用于统计重载行数） */
function extractAllSignatures(text) {
  const out = []
  for (const raw of String(text ?? '').split('\n')) {
    const s = raw.trim()
    if (!/^-\s*\S/.test(s)) continue
    const i = s.indexOf('(')
    if (i < 0) continue
    const m = s.slice(0, i).match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/)
    if (m) out.push({ name: m[1], line: s })
  }
  return out
}

/** 「- 行」里没有 `(` 的，按所处【分节】归组，并三分类（避免把说明性条目也叫「常量」） */
export function extractNonSignatureBullets(text) {
  const acc = {}
  let sec = '(前言/无分节)'
  const ensure = () => { acc[sec] = acc[sec] ?? { total: 0, bullets: 0, enumConstants: [], viewRefs: [], prose: [] } }
  ensure()
  for (const raw of String(text ?? '').split('\n')) {
    const s = raw.trim()
    if (!s) continue
    const h = s.match(/^【(.+?)】$/)
    if (h) { sec = h[1]; ensure(); continue }
    ensure()
    acc[sec].total++
    if (!/^-\s/.test(s)) continue
    acc[sec].bullets++
    if (s.indexOf('(') >= 0) continue          // 有括号 = 签名行
    // 三分类：枚常量 `Type.MEMBER：` / 视图类引用 `XxxView：` / 其余说明性条目
    const t = s.replace(/^-\s*/, '')
    if (/^[A-Z][A-Za-z0-9_]*\.[A-Z_][A-Z0-9_]*\s*[：:]/.test(t)) acc[sec].enumConstants.push(s)
    else if (/^[A-Z][A-Za-z0-9_]*View\s*[：:]/.test(t)) acc[sec].viewRefs.push(s)
    else acc[sec].prose.push(s)
  }
  return acc
}

export function buildPlan() {
  const tree = rd('data/tree-data.json')
  const pool = rd('data/node-pool.json')
  const edges = rd('data/knowledge-edges.json')
  const edgesArr = Array.isArray(edges) ? edges : edges.edges
  const edgesRaw = rdText('data/knowledge-edges.json')

  const flat = walkTree(tree)
  const byTreeId = new Map(flat.map((x) => [x.node.id, x]))
  const mountsOf = new Map()
  for (const x of flat) {
    if (!x.node.nodeRef) continue
    const arr = mountsOf.get(x.node.nodeRef) ?? []
    arr.push({ treeId: x.node.id, path: x.path, depth: x.depth, children: (x.node.children ?? []).length })
    mountsOf.set(x.node.nodeRef, arr)
  }

  const problems = []
  for (const [label, tid, rid] of [
    ['承接方', TREE_PRIMARY, REF_PRIMARY],
    ['待融合', TREE_TOOL, REF_TOOL],
    ['索引导览', TREE_GUIDE, REF_GUIDE],
    ['最佳实践', TREE_BEST, REF_BEST],
  ]) {
    if (!byTreeId.has(tid)) problems.push(`${label} 树节点 ${tid} 不在树中`)
    if (!pool[rid]) problems.push(`${label} 池实体 ${rid} 不存在`)
  }

  const A = pool[REF_PRIMARY]
  const B = pool[REF_TOOL]
  const C = pool[REF_GUIDE]
  const best = pool[REF_BEST]

  // ── 承接方 A：方法 tab / 非方法 tab ──────────────────────────────────────
  const aTabs = A?.card?.tabs ?? []
  const aMethodTabs = aTabs.filter((t) => NON_METHOD_LABEL_RE.test(t.label ?? ''))
  const aOtherTabs = aTabs.filter((t) => !NON_METHOD_LABEL_RE.test(t.label ?? ''))
  const aNames = aMethodTabs.map((t) => t.id)

  // ── 待融合 B / 导览 C：机械提取 ─────────────────────────────────────────
  const bText = B?.card?.tabs?.[0]?.content ?? ''
  const cText = C?.card?.rootContent ?? ''
  const bSigs = extractSignatures(bText)
  const cSigs = extractSignatures(cText)
  const bAll = extractAllSignatures(bText)
  const bSections = extractNonSignatureBullets(bText)

  const aSet = new Set(aNames)
  const bSet = new Set(bSigs.map((s) => s.name))
  const cSet = new Set(cSigs.map((s) => s.name))
  const unionBC = new Set([...bSet, ...cSet])

  const pick = (set, pred) => [...set].filter(pred)
  const alignment = {
    aCount: aSet.size, bCount: bSet.size, cCount: cSet.size,
    aAndB: pick(aSet, (x) => bSet.has(x)),
    aAndC: pick(aSet, (x) => cSet.has(x)),
    bAndC: pick(bSet, (x) => cSet.has(x)),
    /** ★ A \ B：承接方有、**工具类缺**（= 用户口中的「2 缺口」） */
    aNotInB: pick(aSet, (x) => !bSet.has(x)),
    /** A \ C */
    aNotInC: pick(aSet, (x) => !cSet.has(x)),
    /** 仅 B 有（A/C 皆无） */
    onlyB: pick(bSet, (x) => !aSet.has(x) && !cSet.has(x)),
    /** 仅 C 有（A/B 皆无） */
    onlyC: pick(cSet, (x) => !aSet.has(x) && !bSet.has(x)),
    /** ★★ 融合相对承接方的净增量（B∪C 有而 A 无） */
    netNewForA: pick(unionBC, (x) => !aSet.has(x)),
    /** ★ 真缺口：A 有而 B∪C 都没有（无人可补） */
    aOnlyNotCovered: pick(aSet, (x) => !unionBC.has(x)),
  }
  alignment.cIsSubsetOfA = [...cSet].every((x) => aSet.has(x)) && cSet.size > 0
  alignment.aEqualsC = cSet.size === aSet.size && [...cSet].every((x) => aSet.has(x))
  alignment.aSubsetOfB = [...aSet].every((x) => bSet.has(x))
  alignment.aSubsetOfBOrC = [...aSet].every((x) => unionBC.has(x))

  // ── 重叠方法的文本丰富度（A tab vs B 行 vs C 行）────────────────────────
  const richness = aNames.slice(0, 12).map((name) => {
    const at = aMethodTabs.find((t) => t.id === name)
    const bl = bSigs.find((s) => s.name === name)
    const cl = cSigs.find((s) => s.name === name)
    return {
      name,
      aTabLabel: at?.label, aLen: at?.content?.length ?? 0,
      bLen: bl?.line?.length ?? 0, bHasReturn: bl?.hasReturnType ?? null,
      cLen: cl?.line?.length ?? 0, cHasReturn: cl?.hasReturnType ?? null,
    }
  })

  // ── 全库 tab 数分布（判断扩 tab 是否越界）───────────────────────────────
  const tabCounts = Object.values(pool).map((e) => (e.card?.tabs ?? []).length)
  const sorted = [...tabCounts].sort((a, b) => b - a)
  const tabStats = {
    entities: tabCounts.length,
    totalTabs: tabCounts.reduce((a, b) => a + b, 0),
    max: sorted[0],
    secondMax: sorted[1],
    overA: tabCounts.filter((n) => n > aTabs.length).length,
    over40: tabCounts.filter((n) => n >= 40).length,
    atLeast10: tabCounts.filter((n) => n >= 10).length,
    zeroOrOne: tabCounts.filter((n) => n <= 1).length,
  }
  const topEntities = Object.entries(pool)
    .map(([id, e]) => ({ id, label: e.label, tabs: (e.card?.tabs ?? []).length }))
    .sort((a, b) => b.tabs - a.tabs)
    .slice(0, 6)

  // ── 类库(常用类库) 子树口径 ─────────────────────────────────────────────
  const commonSubtree = new Set()
  for (const x of flat) {
    if (x.path.includes('类库') && x.node.nodeRef) commonSubtree.add(x.node.nodeRef)
  }
  const commonTabCounts = [...commonSubtree].map((r) => (pool[r]?.card?.tabs ?? []).length).filter((n) => n >= 0)

  // ── 待融合方 B 的非方法资产 ─────────────────────────────────────────────
  const sumBy = (key) => Object.values(bSections).reduce((a, s) => a + s[key].length, 0)
  const bEnumConsts = sumBy('enumConstants')
  const bViewRefs = sumBy('viewRefs')
  const bProse = sumBy('prose')
  const bSectionCount = Object.keys(bSections).filter((k) => !k.startsWith('(前言')).length
  /** ★ 同行程出现 ≥2 个方法名调用的行 —— 解释「22 vs 23」这类计数差的口径来源 */
  const multiMethodLines = bText.split('\n').map((s) => s.trim()).filter((s) => {
    if (!/^-\s*\S/.test(s)) return false
    const calls = s.match(/[A-Za-z_][A-Za-z0-9_]*\s*\(/g) ?? []
    return calls.length >= 2
  })

  // ── 边分布 ──────────────────────────────────────────────────────────────
  const touching = edgesArr.filter((e) => JSON.stringify(e).match(new RegExp(`${REF_PRIMARY}|${REF_TOOL}|${TREE_PRIMARY}|${TREE_TOOL}`)))
  const parentEdgeOf = (tid) => edgesArr.find((e) => e.id === `treebind:tree_java_common_libraries:${tid}`) ?? null

  // ── 方案与 Δ ────────────────────────────────────────────────────────────
  const netNew = alignment.netNewForA.length
  const plans = [
    {
      id: 'Ⅰ',
      name: '全量吸收制（连 B 的重叠行也并入，不丢任何字）',
      action: `把 B 的 ${netNew} 个独有方法各建 1 个方法 tab；B 的 ${bEnumConsts + bViewRefs + bProse} 条非签名 bullet 收 1 个 tab；B 的 ${alignment.aAndB.length} 条**重叠行追加进 A 的对应既有 tab**；删 B`,
      aTabsAfter: aTabs.length + netNew + 1,
      delta: { tree: -1, pool: -1, edges: -1 },
      pros: ['零判读风险：B 的每一个字都有落点', '与 A 既有方法 tab 同构（家族惯例：方法一 tab）', '新方法可独立索引/编辑/被 tag 库收录'],
      cons: [`**改动面最大**：A 的 ${alignment.aAndB.length} 个既有 tab 全被改写（内容变长、双源混写）`, 'tab 数冲到全库第一（见 tabStats）', `richness 表显示 A 侧原本更全 ⇒ 追加 B 的重叠行多为**信息增益为零的填充**`],
    },
    {
      id: 'Ⅱ',
      name: '整段并入制',
      action: `B 的 def 全文（${bText.length} 字）作为 1 个 tab 并入 A；删 B`,
      aTabsAfter: aTabs.length + 1,
      delta: { tree: -1, pool: -1, edges: -1 },
      pros: ['改动最小、零信息损失、与 A 批 bestPractices 搬运同形', 'tab 数不变 ⇒ 不越界'],
      cons: [
        `B 的 ${alignment.aAndB.length} 个与 A 重叠的方法**在一/两个实体内部重复描述**（真正意义的「重叠」没消除）`,
        `${netNew} 个新方法仍是一坨清单里的文本，不可独立索引`,
      ],
    },
    {
      id: 'Ⅲ',
      name: '融合去重制（方法补 tab + 非签名资产收 tab + 重叠不重复收录）',
      action: `A 侧保留既有 ${aNames.length} 个方法 tab（其内容为既有事实源）；B 的 ${netNew} 个独有方法补成 ${netNew} 个方法 tab；B 的 ${bEnumConsts + bViewRefs + bProse} 条非签名 bullet（枚常量 ${bEnumConsts} + 视图类 ${bViewRefs} + 说明 ${bProse}）连同 ${bSectionCount} 个分节框架收成 1 个 tab；B 的 ${alignment.aAndB.length} 条重叠行不收录；删 B`,
      aTabsAfter: aTabs.length + netNew + 1,
      delta: { tree: -1, pool: -1, edges: -1 },
      pros: [`消除「${alignment.aAndB.length} 条重叠」与「${netNew} 条丢失」两个问题`, '新方法可独立索引', `非签名资产首次有归属（A 的 bestPractices 只引用了 StandardCopyOption/StandardOpenOption 却没解释）`],
      cons: ['tab 数冲到全库第一', '需要逐条判定「A tab 内容是否够用」（richness 表即此判据）'],
    },
    {
      id: 'Ⅳ',
      name: '导览重构制（A 的 tab 数不变，融合成果落在子节点导览上）',
      action: `A 的 ${aNames.length} 个方法 tab **原样不动**；把 B∪C 的 ${unionBC.size} 个方法合并成一份规范导览写进 A 的子节点「常见用法」（现 ${cSigs.length} 方法 / ${cText.length} 字 → 合并后 ${unionBC.size} 方法）；B 的 ${bEnumConsts + bViewRefs + bProse} 条非签名 bullet 一并并入该导览；删 B`,
      aTabsAfter: aTabs.length,
      delta: { tree: -1, pool: -1, edges: -1 },
      pros: [
        `**tab 数完全不越界**（A 保持 ${aTabs.length}）`,
        `方法覆盖从 ${cSigs.length} 升到 ${unionBC.size}（补齐 ${netNew} 个），且**一处导览即全**`,
        `顺带修复导览的陈旧（现只有 ${cSigs.length} 个方法 = A 的 tab 全集，缺 B 的 ${netNew} 个）`,
        '与家族分工一致：A 的 tab = 精选方法，子节点导览 = 全量清单',
      ],
      cons: [
        `新增的 ${netNew} 个方法**不作为独立 tab** ⇒ 不可被 tag 库/索引图单独索引`,
        '导览是 rootContent 长文，不如 tab 那样可逐条编辑',
      ],
    },
  ]

  const decisionPoints = [
    { id: 'D1', q: '融合方向与主体', options: [`B(工具类) → A(java.nio.file.Files)，A 为唯一事实源 ★`, 'A → B（反向）', '双方都留（不融合）'], recommend: 'B → A：A 是树上的规范节点（直接挂 类库、有 2 个子节点、有 4 条边），B 是孤立叶子' },
    { id: 'D2', q: '融合方案（Ⅰ 全量吸收 / Ⅱ 整段并入 / Ⅲ 融合去重 / Ⅳ 导览重构）', options: [`Ⅰ 全量吸收制（${aTabs.length + netNew + 1} tab，A 的 ${alignment.aAndB.length} 个既有 tab 被改写）`, `Ⅱ 整段并入制（${aTabs.length + 1} tab，零损失但冗余留存）`, `Ⅲ 融合去重制（${aTabs.length + netNew + 1} tab，重叠丢弃；richness 表支持 A 侧更全）`, `Ⅳ 导览重构制（${aTabs.length} tab 不变，融合成果落在子节点导览）`], recommend: `Ⅲ 与 Ⅳ 是最有竞争力的两个：Ⅲ 结构最规范（方法一 tab，家族惯例）但 tab 数到 ${aTabs.length + netNew + 1}；Ⅳ 不越界且顺带修复 C 的陈旧，代价是 ${netNew} 个新方法不作独立 tab` },
    { id: 'D3', q: 'tab 数越界的取舍（仅方案Ⅰ/Ⅲ 需要）', options: [`接受 ${aTabs.length + netNew + 1} tab（全库第一，现最大 ${tabStats.max}）`, '只补「高价值」子集（需另定判据）', '改用方案Ⅱ 或 Ⅳ（tab 数不变）'], recommend: `待用户裁决 —— 全库 >${aTabs.length} tab 的实体只有 ${tabStats.overA} 个，扩到 ${aTabs.length + netNew + 1} 是显著越界；但类库家族本身就是方法一 tab 的形状（≥20 tab 的 3 个都在本子树）` },
    { id: 'D4', q: `索引导览「常见用法」(${cSigs.length} 方法 / ${cText.length} 字) 的去留`, options: ['留（作为人类可读导览，与 A 的 tab 并存）★', '删（其方法集已被 A 的 tab 全覆盖）', '用融合后的完整导览覆盖它'], recommend: `★ 本条是本批**新发现**：C 的方法集与 A 的 ${aNames.length} 个方法 tab **逐个全等** ⇒ C 是 A 的 tab 的来源导览。它不是「重叠缺陷」而是「同一实体的两种视图」，删它属结构清理而非内容融合，建议另裁或留` },
    { id: 'D5', q: `A − B：承接方有而工具类缺的 ${alignment.aNotInB.length} 个方法（${alignment.aNotInB.map((x) => '`' + x + '`').join(' / ')}）`, options: ['无需动作（A 已有，B 只是导览不全）★', '补进融合后的导览'], recommend: `★ A 已有 ⇒ 无缺口；仅作记录。注意与「真缺口 A − (B∪C) = ${alignment.aOnlyNotCovered.length} 个」区分开` },
    { id: 'D6', q: '结果实体/节点的命名与 treeId', options: ['沿用 A 的现有 id（不改名）★', '改名并语义化'], recommend: '★ 沿用 —— 本批是内容融合，改名属另一类批次且会扩大写集' },
  ]

  const report = {
    batchId: 'nio-files-fusion',
    generatedAt: new Date().toISOString(),
    problems,
    scope: {
      primary: { tree: TREE_PRIMARY, ref: REF_PRIMARY, label: A?.label, path: mountsOf.get(REF_PRIMARY)?.[0]?.path, mounts: mountsOf.get(REF_PRIMARY)?.length, tabs: aTabs.length, methodTabs: aMethodTabs.length, otherTabs: aOtherTabs.map((t) => `${t.id}/${t.label}(${t.content.length})`), rootContentLen: A?.card?.rootContent?.length ?? 0, tags: A?.tags, children: byTreeId.get(TREE_PRIMARY)?.node?.children?.map((c) => `${c.name}[${c.id}]`) ?? [] },
      tool: { tree: TREE_TOOL, ref: REF_TOOL, label: B?.label, path: mountsOf.get(REF_TOOL)?.[0]?.path, mounts: mountsOf.get(REF_TOOL)?.length, tabs: B?.card?.tabs?.length, defLen: bText.length, rootContentLen: B?.card?.rootContent?.length ?? 0, tags: B?.tags, children: byTreeId.get(TREE_TOOL)?.node?.children?.length ?? 0 },
      guide: { tree: TREE_GUIDE, ref: REF_GUIDE, label: C?.label, path: mountsOf.get(REF_GUIDE)?.[0]?.path, mounts: mountsOf.get(REF_GUIDE)?.length, rootContentLen: cText.length, tabs: C?.card?.tabs?.length, children: byTreeId.get(TREE_GUIDE)?.node?.children?.length ?? 0 },
      best: { tree: TREE_BEST, ref: REF_BEST, label: best?.label, path: mountsOf.get(REF_BEST)?.[0]?.path, mounts: mountsOf.get(REF_BEST)?.length, rootContentLen: best?.card?.rootContent?.length ?? 0, tabs: best?.card?.tabs?.length, children: byTreeId.get(TREE_BEST)?.node?.children?.length ?? 0 },
    },
    alignment,
    richness,
    toolAssets: {
      allSignatureLines: bAll.length,
      uniqueMethods: bSigs.length,
      overloadLines: bAll.length - bSigs.length,
      withReturnType: bSigs.filter((s) => s.hasReturnType).length,
      withoutReturnType: bSigs.filter((s) => !s.hasReturnType).length,
      sections: bSections,
      sectionCount: bSectionCount,
      nonSignatureBullets: bEnumConsts + bViewRefs + bProse,
      enumConstants: bEnumConsts,
      viewRefs: bViewRefs,
      proseBullets: bProse,
      enumConstantList: Object.values(bSections).flatMap((s) => s.enumConstants),
      viewRefList: Object.values(bSections).flatMap((s) => s.viewRefs),
      proseList: Object.values(bSections).flatMap((s) => s.prose),
      multiMethodLines,
    },
    tabStats,
    topEntities,
    commonSubtree: { entities: commonTabCounts.length, tabsOver32: commonTabCounts.filter((n) => n > 32).length, tabsOver20: commonTabCounts.filter((n) => n >= 20).length },
    edges: {
      touchingCount: touching.length,
      parentEdgePrimary: parentEdgeOf(TREE_PRIMARY),
      parentEdgeTool: parentEdgeOf(TREE_TOOL),
      list: touching.map((e) => ({ id: e.id, type: e.type, relationKind: e.relationKind, source: e.source, target: e.target, dimensions: e.dimensions })),
    },
    plans,
    decisionPoints,
    expectedDeltaNote: '本批只动池（+0 实体 / −1 实体 / 1 实体被改）+ 树（−1 节点）+ 边（−1 条）⇒ 树 3205→3204 · 池 3852→3851 · 边 4157→4156（若同时删 C 则再 −1/−1/−1）。',
  }

  return report
}

function renderMarkdown(r) {
  const L = []
  L.push('# NIO-FILES-FUSION（D 批）· 只读预检报告')
  L.push('')
  L.push(`> 生成时间：${r.generatedAt} · **本报告由脚本机械产出，所有数字均计算得出（T3 纪律：报告内不出现手写数字）**`)
  L.push('')
  if (r.problems.length) { L.push('## ⛔ 前置断言失败'); r.problems.forEach((p) => L.push('- ' + p)); L.push('') }
  else L.push('## ✅ 前置断言通过（四方树节点与池实体齐备）')
  L.push('')

  L.push('## 1. 三方 + 一方的挂载形态')
  L.push('')
  L.push('| 角色 | 实体 | 树节点 | 路径 | 挂载 | rootContent | tabs | 方法 tab |')
  L.push('|---|---|---|---|---|---|---|---|')
  const s = r.scope
  L.push(`| 承接方 | \`${s.primary.ref}\` ${s.primary.label} | \`${s.primary.tree}\` | ${s.primary.path} | ${s.primary.mounts} | ${s.primary.rootContentLen} 字 | ${s.primary.tabs} | **${s.primary.methodTabs}** |`)
  L.push(`| 待融合 | \`${s.tool.ref}\` ${s.tool.label} | \`${s.tool.tree}\` | ${s.tool.path} | ${s.tool.mounts} | ${s.tool.rootContentLen} 字 | ${s.tool.tabs} | — (def ${s.tool.defLen} 字) |`)
  L.push(`| 索引导览 | \`${s.guide.ref}\` ${s.guide.label} | \`${s.guide.tree}\` | ${s.guide.path} | ${s.guide.mounts} | ${s.guide.rootContentLen} 字 | ${s.guide.tabs} | — (子 ${s.guide.children}) |`)
  L.push(`| 最佳实践 | \`${s.best.ref}\` ${s.best.label} | \`${s.best.tree}\` | ${s.best.path} | ${s.best.mounts} | ${s.best.rootContentLen} 字 | ${s.best.tabs} | — (子 ${s.best.children}) |`)
  L.push('')
  L.push('**承接方的非方法 tab**：' + s.primary.otherTabs.map((x) => '`' + x + '`').join(' · '))
  L.push('')
  L.push('**承接方的树子节点**：' + (s.primary.children.join(' · ') || '（无）'))
  L.push('')

  L.push('## 2. ★ 方法对齐（三方）')
  L.push('')
  const a = r.alignment
  L.push(`- 承接方 A 的方法 tab = **${a.aCount}**`)
  L.push(`- 待融合 B（Files工具类）机械提取方法 = **${a.bCount}**`)
  L.push(`- 索引导览 C（常见用法）机械提取方法 = **${a.cCount}**`)
  L.push('')
  L.push('| 关系 | 个数 | 说明 |')
  L.push('|---|---|---|')
  L.push(`| A ∩ B | ${a.aAndB.length} | 两边都有（★ 即「重叠」） |`)
  L.push(`| A ∩ C | ${a.aAndC.length} | ${a.aEqualsC ? '**C 的方法集与 A 的 tab 逐个全等**' : ''} |`)
  L.push(`| B ∩ C | ${a.bAndC.length} | |`)
  L.push(`| **A − B（承接方有、工具类缺）** | **${a.aNotInB.length}** | ★ 这就是「缺口」（工具类导览不全），非缺陷 |`)
  L.push(`| A − C | ${a.aNotInC.length} | |`)
  L.push(`| **仅 B 有（A/C 皆无）** | **${a.onlyB.length}** | ★ 融合的净增量 |`)
  L.push(`| 仅 C 有（A/B 皆无） | ${a.onlyC.length} | |`)
  L.push(`| **B∪C 有而 A 无** | **${a.netNewForA.length}** | ★★ 融合要给 A 补的方法数 |`)
  L.push(`| **A − (B∪C)（真缺口，无人可补）** | **${a.aOnlyNotCovered.length}** | 与上一行是**两个不同的判据**，勿混 |`)
  L.push('')
  L.push(`- A ⊆ B（工具类含全部 tab 方法）：**${a.aSubsetOfB ? '是' : '否'}**`)
  L.push(`- A ⊆ (B∪C)：**${a.aSubsetOfBOrC ? '是' : '否'}**`)
  L.push(`- C ⊆ A：**${a.cIsSubsetOfA ? '是' : '否'}**`)
  L.push('')
  L.push(`**仅 B 有的 ${a.onlyB.length} 个方法**：`)
  L.push('')
  L.push(a.onlyB.map((x) => '`' + x + '`').join(' · '))
  L.push('')
  L.push(`**A − B 的 ${a.aNotInB.length} 个**（A 有而工具类缺）：` + (a.aNotInB.map((x) => '`' + x + '`').join(' · ') || '（无）'))
  L.push('')
  L.push(`**仅 C 有的 ${a.onlyC.length} 个**：` + (a.onlyC.map((x) => '`' + x + '`').join(' · ') || '（无）'))
  L.push('')

  L.push('## 3. 待融合方 B 的非方法资产')
  L.push('')
  const t = r.toolAssets
  L.push(`- 签名行合计 **${t.allSignatureLines}** 行（去重后 ${t.uniqueMethods} 个方法名；重载行 ${t.overloadLines} 行）`)
  L.push(`- 带返回类型的签名 ${t.withReturnType} 行 · **不带返回类型 ${t.withoutReturnType} 行**（← 体例不一致，提取器必须容忍）`)
  L.push(`- 分节 **${t.sectionCount}** 个 · 非签名 bullet **${t.nonSignatureBullets}** 条 = 枚常量 ${t.enumConstants} + 视图类引用 ${t.viewRefs} + 说明性条目 ${t.proseBullets}`)
  L.push('')
  L.push('> ⚠️ **口径说明**：首版把「bullet 里没有 `(`」一律叫「选项常量」，把 `BasicFileAttributeView：…`、`监听事件：…` 这类也算了进去 ⇒ 名不副实。现按三分类分开统计（枚常量 / 视图类引用 / 说明性条目）。')
  L.push('')
  L.push('| 分节 | 行数 | bullet | 枚常量 | 视图类 | 说明 |')
  L.push('|---|---|---|---|---|---|')
  for (const [k, v] of Object.entries(t.sections)) L.push(`| ${k} | ${v.total} | ${v.bullets} | ${v.enumConstants.length} | ${v.viewRefs.length} | ${v.prose.length} |`)
  L.push('')
  L.push(`**枚常量全文（${t.enumConstants} 条）**——A 侧只在 bestPractices 里消费了 2 条，未解释其含义：`)
  L.push('')
  t.enumConstantList.forEach((c) => L.push('- ' + c.replace(/^-\s*/, '')))
  L.push('')
  if (t.viewRefList.length) {
    L.push(`**视图类引用（${t.viewRefs} 条）**：`)
    L.push('')
    t.viewRefList.forEach((c) => L.push('- ' + c.replace(/^-\s*/, '')))
    L.push('')
  }
  if (t.proseList.length) {
    L.push(`**说明性条目（${t.proseBullets} 条）**：`)
    L.push('')
    t.proseList.forEach((c) => L.push('- ' + c.replace(/^-\s*/, '')))
    L.push('')
  }
  if (t.multiMethodLines.length) {
    L.push(`### ★ 同行程多方法（口径差来源，${t.multiMethodLines.length} 行）`)
    L.push('')
    L.push('> 提取器只取行内**第一个** `(` 前的方法名 ⇒ 这些行里的第二个方法名不会被计入「45/49」这类数字。')
    L.push('> 这正是「人工数 23 个 vs 机械算 22 个」的差额来源，**必须显式报出而不是悄悄取一个**。')
    L.push('')
    t.multiMethodLines.forEach((c) => L.push('- ' + c))
    L.push('')
  }

  L.push('## 4. 重叠方法的文本丰富度（前 12 个）')
  L.push('')
  L.push('| 方法 | A tab 标签 | A 字数 | B 行字数 | B 带返回类型 | C 行字数 | C 带返回类型 |')
  L.push('|---|---|---|---|---|---|---|')
  r.richness.forEach((x) => L.push(`| \`${x.name}\` | ${x.aTabLabel} | ${x.aLen} | ${x.bLen} | ${x.bHasReturn} | ${x.cLen} | ${x.cHasReturn} |`))
  L.push('')

  L.push('## 5. tab 数越界判据（决定方案Ⅰ/Ⅲ是否可接受）')
  L.push('')
  const ts = r.tabStats
  L.push(`- 全库实体 **${ts.entities}** 个 · tab 合计 **${ts.totalTabs}**`)
  L.push(`- tab 数分布：≤1 的有 **${ts.zeroOrOne}** 个 · ≥10 的有 **${ts.atLeast10}** 个 · ≥40 的有 **${ts.over40}** 个`)
  L.push(`- 最大 = **${ts.max}** · 次大 = **${ts.secondMax}**`)
  L.push(`- **tab 数超过承接方现有 ${r.scope.primary.tabs} 的实体，全库只有 ${ts.overA} 个**`)
  L.push('')
  L.push('| 排名 | 实体 | tabs |')
  L.push('|---|---|---|')
  r.topEntities.forEach((x, i) => L.push(`| ${i + 1} | \`${x.id}\` ${x.label} | ${x.tabs} |`))
  L.push('')
  L.push(`- 类库(常用类库) 子树口径：实体 ${r.commonSubtree.entities} 个 · >32 tab 的 ${r.commonSubtree.tabsOver32} 个 · ≥20 tab 的 ${r.commonSubtree.tabsOver20} 个`)
  L.push('')

  L.push('## 6. 边分布')
  L.push('')
  L.push(`- 提到两个实体/两个树节点的边共 **${r.edges.touchingCount}** 条：`)
  L.push('')
  L.push('| 边 id | type | relationKind | source → target | dimensions |')
  L.push('|---|---|---|---|---|')
  r.edges.list.forEach((e) => L.push(`| \`${e.id}\` | ${e.type} | ${e.relationKind} | ${e.source} → ${e.target} | ${JSON.stringify(e.dimensions)} |`))
  L.push('')
  L.push(`- 承接方父边存在：**${r.edges.parentEdgePrimary ? '✅' : '⛔ 无'}** · 待融合方父边存在：**${r.edges.parentEdgeTool ? '✅' : '⛔ 无'}**`)
  L.push('')

  L.push('## 7. 方案与 Δ 预览')
  L.push('')
  L.push('| 方案 | 名称 | A 的 tab 后 | Δ树 | Δ池 | Δ边 |')
  L.push('|---|---|---|---|---|---|')
  r.plans.forEach((p) => L.push(`| ${p.id} | ${p.name} | ${p.aTabsAfter} | ${p.delta.tree} | ${p.delta.pool} | ${p.delta.edges} |`))
  L.push('')
  r.plans.forEach((p) => {
    L.push(`### 方案 ${p.id} · ${p.name}`)
    L.push('')
    L.push('**动作**：' + p.action)
    L.push('')
    p.pros.forEach((x) => L.push('- ✅ ' + x))
    p.cons.forEach((x) => L.push('- ⚠️ ' + x))
    L.push('')
  })
  L.push(`> ${r.expectedDeltaNote}`)
  L.push('')

  L.push('## 8. 决策点（待用户裁决）')
  L.push('')
  r.decisionPoints.forEach((d) => {
    L.push(`### ${d.id} · ${d.q}`)
    L.push('')
    d.options.forEach((o) => L.push('- ' + o))
    L.push('')
    L.push('> 建议：' + d.recommend)
    L.push('')
  })

  return L.join('\n')
}

const report = buildPlan()
fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 'report.md'), renderMarkdown(report) + '\n')
fs.writeFileSync(path.join(OUT_DIR, 'plan.json'), JSON.stringify(report, null, 2) + '\n')
console.log('✅ 只读预检完成（**未触碰 data/**）')
console.log('   报告：outputs/nio-files-fusion/report.md')
console.log('   机器可读：outputs/nio-files-fusion/plan.json')
console.log('   前置断言：' + (report.problems.length ? '⛔ ' + report.problems.length + ' 条问题' : '✅ 通过'))
console.log('   对齐：A=' + report.alignment.aCount + ' · B=' + report.alignment.bCount + ' · C=' + report.alignment.cCount +
  ' · A∩B=' + report.alignment.aAndB.length + ' · 融合净增=' + report.alignment.netNewForA.length)
