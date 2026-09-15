/**
 * NIO-FILES-FUSION（D 批）· plan 阶段之二（**只读 data/**）
 *
 * 角色命名（★ 与用户裁决书对齐，**不再用 A/B** —— 首版报告 A/B 与用户相反，是删错节点的级别的事故源）：
 *   SURVIVOR = k_java_nio_file_files   java.nio.file.Files（留存方，吸收内容）
 *   DONOR    = k_nio_files_util        Files工具类（捐赠方，内容迁出后删除）
 *   GUIDE    = k_1787916226907_9aq9u6  常见用法（删除方，需内容形态审计）
 *   BEST     = k_1787916124192_mow0sq  最佳实践（本批不动）
 *
 * 本脚本补完 plan 阶段剩余义务（用户裁决书点名要求）：
 *   1. 方法口径复核：DONOR 独有到底 22 还是 23（同行程多方法 take()/poll() 只取第一个的口径差）
 *   2. **27 个重叠方法逐方法 diff** —— 用户明令「不能简单覆盖」，须逐条判定取哪侧、缺什么
 *   3. GUIDE 内容形态审计 —— 用户给的删除前置条件（纯表格可删 / 含用法片段须先抽出）
 *   4. Δ 重算（SURVIVOR 吸收 + DONOR 删除 + GUIDE 删除 = −2/−2/−2）与方案① 全原子 tab 投影
 *   5. 悬空引用扫描 —— 删 DONOR/GUIDE 前确认没有别的实体用 viewDimensions 原子引用它们
 *
 * 用法：node scripts/plan-nio-files-fusion-detail.mjs
 * 注意：本脚本**不写 data/**，无 --apply。
 */
import fs from 'node:fs'
import path from 'node:path'

// ── 角色句柄 ────────────────────────────────────────────────────────────────
export const SURVIVOR = { ref: 'k_java_nio_file_files', tree: 'tree_java_nio_file_files', label: 'java.nio.file.Files' }
export const DONOR = { ref: 'k_nio_files_util', tree: 'tree_nio_files_util', label: 'Files工具类' }
export const GUIDE = { ref: 'k_1787916226907_9aq9u6', tree: 'tree_1787916227408_nkaljw', label: '常见用法' }
export const BEST = { ref: 'k_1787916124192_mow0sq', tree: 'tree_1787916125075_qsrbco', label: '最佳实践' }
/** SURVIVOR 里 label 不含 `()` 的 tab 视作非方法 tab */
const METHOD_LABEL_RE = /\(\)/

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'outputs/nio-files-fusion')
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))

// ── 签名归一 ────────────────────────────────────────────────────────────────
/** 逗号切分，但跳过 <> 与 () 内部（`Iterable<? extends CharSequence> lines` 不能被切开） */
function splitTopLevel(s) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '<' || ch === '(' || ch === '[') depth++
    else if (ch === '>' || ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) { out.push(cur); cur = '' } else cur += ch
  }
  if (cur.trim()) out.push(cur)
  return out.map((x) => x.trim()).filter(Boolean)
}
/** 去掉形参名，只留类型：`Path source` → `Path`；`CopyOption... options` → `CopyOption...` */
function paramType(p) {
  const m = p.match(/^(.*?)\s+[A-Za-z_][A-Za-z0-9_]*$/)
  return (m ? m[1] : p).replace(/\s+/g, '')
}
/** 归一化签名键：`copy(Path,CopyOption...)` —— 返回类型/修饰符/形参名一律丢弃 */
export function sigKey(name, paramsStr) {
  return name + '(' + splitTopLevel(paramsStr).map(paramType).join(',') + ')'
}
/** 在文本里找 `name(` 并把括号内容平衡读出来 */
function readParams(text, name) {
  const re = new RegExp('\\b' + name + '\\s*\\(', 'g')
  const out = []
  let m
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length
    let depth = 1
    const start = i
    while (i < text.length && depth > 0) {
      const c = text[i]
      if (c === '(') depth++
      else if (c === ')') depth--
      if (depth === 0) break
      i++
    }
    out.push(text.slice(start, i))
    re.lastIndex = i
  }
  return out
}
/** 取行内 ALL 方法调用名（不只第一个）—— 用于逼出 take()/poll() 这类口径差 */
function allCallNames(line) {
  return [...String(line).matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((x) => x[1])
}
/** 取 `name(` 紧邻前方的 `Xxx.` 接收者：`FileSystem.newWatchService()` → 'FileSystem' */
function receiverOf(sigPart, name) {
  const i = sigPart.indexOf(name + '(')
  if (i <= 0) return null
  const before = sigPart.slice(0, i)
  const m = before.match(/([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*$/)
  return m ? m[1] : null
}
/**
 * 括注抽取：全角（）与半角()。
 * ⚠️ 首版直接扫**整段正文** ⇒ 把 `` `static void delete(Path path)` `` 的**形参表**也当成括注，
 *    于是几乎每个方法都「双侧都有括注」，把 `delete`「（不存在抛异常）」这类**真增量**误判成「同义变体」。
 *    修法：先剥掉反引号代码跨度，再抽括注。
 */
function notesOf(text) {
  const body = String(text ?? '').replace(/`[^`]*`/g, '')
  return [...body.matchAll(/[（(]([^（）()]{2,40})[）)]/g)].map((x) => x[1].trim())
}
const stripPunct = (s) => String(s).replace(/[。．.；;，,、\s]/g, '')

// ── 主体的机械比对 ──────────────────────────────────────────────────────────
export function buildDetail() {
  const pool = rd('data/node-pool.json')
  const treeRaw = fs.readFileSync(path.join(ROOT, 'data/tree-data.json'), 'utf8')
  const edgesRaw = fs.readFileSync(path.join(ROOT, 'data/knowledge-edges.json'), 'utf8')
  const poolRaw = JSON.stringify(pool)
  const edges = JSON.parse(edgesRaw)
  const edgesArr = Array.isArray(edges) ? edges : edges.edges

  const problems = []
  for (const r of [SURVIVOR, DONOR, GUIDE, BEST]) {
    if (!pool[r.ref]) problems.push(`池实体缺失：${r.label} ${r.ref}`)
    if (!treeRaw.includes(`"${r.tree}"`)) problems.push(`树节点缺失：${r.label} ${r.tree}`)
  }
  if (problems.length) return { batchId: 'nio-files-fusion', generatedAt: new Date().toISOString(), problems, aborted: true }

  const S = pool[SURVIVOR.ref]
  const D = pool[DONOR.ref]
  const G = pool[GUIDE.ref]
  const B = pool[BEST.ref]

  // ── SURVIVOR tab 分解 ───────────────────────────────────────────────────
  const sTabs = S.card.tabs ?? []
  const sMethodTabs = sTabs.filter((t) => METHOD_LABEL_RE.test(t.label ?? ''))
  const sOtherTabs = sTabs.filter((t) => !METHOD_LABEL_RE.test(t.label ?? ''))
  const sMethodNames = sMethodTabs.map((t) => t.id)

  // ── DONOR def 行分解 ────────────────────────────────────────────────────
  const dText = D.card?.tabs?.[0]?.content ?? ''
  const dLines = dText.split('\n').map((x) => x.trim())
  const dRows = []           // 签名行（`- 签名：说明`）
  const dSections = []       // 【分节】
  const dBareHeaders = []    // `CopyOption：` 这类裸小标题（既非【】，也非 bullet）
  const dPlain = []          // 其余说明性行（含 `- 监听事件：…` 这类）
  for (const s of dLines) {
    if (!s) continue
    const h = s.match(/^【(.+?)】$/)
    if (h) { dSections.push(h[1]); continue }
    if (!/^-\s*\S/.test(s)) { dBareHeaders.push(s); continue }
    const body = s.replace(/^-\s*/, '')
    const ci = body.search(/[：:]/)
    const sigPart = ci >= 0 ? body.slice(0, ci) : body
    const prosePart = ci >= 0 ? body.slice(ci + 1) : ''
    const calls = allCallNames(sigPart)
    if (!calls.length || sigPart.indexOf('(') < 0) { dPlain.push(s); continue }
    const name = calls[0]                       // ★ 只取第一个（首版口径）
    const params = readParams(sigPart, name)
    dRows.push({
      raw: s, name, sigPart, prose: prosePart,
      receiver: receiverOf(sigPart, name),
      key: params.length ? sigKey(name, params[0]) : name + '()',
      allCalls: allCallNames(s),
      allCallsFull: calls,
    })
  }
  const dRowNames = [...new Set(dRows.map((r) => r.name))]
  /** ★ 口径差：行内出现 ≥2 个调用 ⇒ 后续名字被首个掩盖 */
  const multiCallRows = dRows.filter((r) => r.allCalls.length >= 2)
  const maskedNames = [...new Set(multiCallRows.flatMap((r) => r.allCalls.slice(1)))]

  // ── 27 个重叠方法逐方法 diff ────────────────────────────────────────────
  const sSet = new Set(sMethodNames)
  const dSet = new Set(dRowNames)
  const overlapNames = sMethodNames.filter((n) => dSet.has(n))
  const novelNames = dRowNames.filter((n) => !sSet.has(n))

  const overlapDiff = overlapNames.map((name) => {
    const tab = sMethodTabs.find((t) => t.id === name)
    const content = tab?.content ?? ''
    // SURVIVOR 侧签名（tab 内所有代码跨度）
    const spans = [...content.matchAll(/`([^`]+)`/g)].map((m) => m[1])
    const sKeys = new Set()
    for (const sp of spans) for (const p of readParams(sp, name)) sKeys.add(sigKey(name, p))
    // DONOR 侧该方法的全部行（含重载）
    const rows = dRows.filter((r) => r.name === name)
    const dKeys = new Set(rows.map((r) => r.key))
    const missingSigs = rows.filter((r) => !sKeys.has(r.key)).map((r) => r.key)
    const survivorOnlySigs = [...sKeys].filter((k) => !dKeys.has(k))
    // 说明增量
    const dNotes = [...new Set(rows.flatMap((r) => notesOf(r.prose)))]
    const sNotes = notesOf(content)
    const sBody = stripPunct(content)
    const noteMatched = (n) => sBody.includes(stripPunct(n))
    const addNote = dNotes.filter((n) => !noteMatched(n))              // DONOR 有、SURVIVOR 全文无
    const hasParenthetical = sNotes.length > 0
    return {
      name, survivorTabLabel: tab?.label, survivorLen: content.length,
      survivorContent: content,
      donorRows: rows.map((r) => ({ raw: r.raw, key: r.key, prose: r.prose })),
      donorRowCount: rows.length,
      survivorSigCount: sKeys.size,
      missingSigs, survivorOnlySigs,
      donorNotes: dNotes, addNote,
      survivorNotes: sNotes,
      /** ★ 双侧都有括注 ⇒ 很可能是同义改写（机械判据无法定性，交人工） */
      noteVariant: hasParenthetical ? addNote : [],
      precision: {
        MISSING_SIG: missingSigs.length > 0,
        ADD_NOTE: hasParenthetical ? false : addNote.length > 0,
        NOTE_VARIANT: hasParenthetical && addNote.length > 0,
        SURVIVOR_ONLY_SIG: survivorOnlySigs.length > 0,
      },
    }
  })
  const verdictCounts = {
    missingSig: overlapDiff.filter((x) => x.precision.MISSING_SIG).length,
    addNote: overlapDiff.filter((x) => x.precision.ADD_NOTE).length,
    noteVariant: overlapDiff.filter((x) => x.precision.NOTE_VARIANT).length,
    survivorOnlySig: overlapDiff.filter((x) => x.precision.SURVIVOR_ONLY_SIG).length,
    cleanEquivalent: overlapDiff.filter((x) => !x.precision.MISSING_SIG && !x.precision.ADD_NOTE && !x.precision.NOTE_VARIANT).length,
  }

  // ── 独有方法的归属分类（★ 方案① 全原子前必须知道哪些不是 Files 的方法）──
  // ⚠️ 首版按**行**统计 ⇒ 重载行（readString×2 / walk×2 / walkFileTree×2 / readAttributes×2）
  //    被重复计入，得出「22 = 23 + 3 + 1」这种自相矛盾。现一律**按名字去重**。
  const novelRows = dRows.filter((r) => novelNames.includes(r.name))
  const receiverByName = new Map()
  for (const r of novelRows) if (!receiverByName.has(r.name) && r.receiver) receiverByName.set(r.name, r.receiver)
  // 被掩盖的方法（`poll`）没有独立行：先试 `xxx.poll(` 显式接收者，
  // 找不到则退回「同行首个调用的接收者」—— `watchService.take()/poll()` 里两者同属 watchService。
  for (const nm of maskedNames) {
    let recv = null
    for (const r of dRows) {
      const m = r.raw.match(new RegExp('([A-Za-z_][A-Za-z0-9_]*)\\s*\\.\\s*' + nm + '\\s*\\('))
      if (m) { recv = m[1]; break }
    }
    if (!recv) {
      const host = dRows.find((r) => new RegExp('(^|[^A-Za-z0-9_])' + nm + '\\s*\\(').test(r.raw))
      recv = host?.receiver ?? null
    }
    if (recv) receiverByName.set(nm, recv)
  }
  const isNonFiles = (n) => { const r = receiverByName.get(n); return !!r && r !== 'Files' }
  /** ★ 计入口径：独有 = 机械独有 + 被同行掩盖的 */
  const novelNamesAll = [...novelNames, ...maskedNames]
  const filesStaticNames = novelNamesAll.filter((n) => !isNonFiles(n))
  const nonFilesNames = novelNamesAll.filter(isNonFiles)
  const nonFilesDetail = nonFilesNames.map((n) => ({ name: n, receiver: receiverByName.get(n), row: dRows.find((r) => r.raw.includes(n + '('))?.raw ?? dRows.find((r) => r.raw.includes('.' + n + '('))?.raw ?? '' }))
  const filesStaticDetail = filesStaticNames.map((n) => ({ name: n, row: dRows.find((r) => r.name === n)?.raw ?? '' }))

  // ── GUIDE 内容形态审计（用户给的删除前置条件）──────────────────────────
  const gText = G.card?.rootContent ?? ''
  const gLines = gText.split('\n').map((x) => x.trim()).filter(Boolean)
  const gHeads = gLines.filter((s) => /^【(.+?)】$/.test(s))
  const gEntries = gLines.filter((s) => /^-\s*\S/.test(s) && s.indexOf('(') >= 0)
  const gLead = gLines.filter((s) => !/^【(.+?)】$/.test(s) && !/^-\s*\S/.test(s))
  /** 用法片段判据：出现 `Xxx.method(` 调用（带字面实参）或 try/catch/; —— 区别于纯签名声明 */
  const codeRe = /(Files|Path|Stream|Files\.)\s*\.\s*[A-Za-z_]\w*\s*\(|\b(try|catch)\b|;\s*$/
  const gCode = gLines.filter((s) => codeRe.test(s))
  const gMalformed = gLines.filter((s) => /^-{1}\S/.test(s) && !/^-\s/.test(s))
  // 每条 GUIDE 条目的说明是否在（SURVIVOR tab ∪ DONOR 行）里能找到落点
  const corpus = [...sMethodTabs.map((t) => t.content), ...dRows.map((r) => r.raw)].map(stripPunct)
  const gUnmatched = gEntries.map((s) => {
    const ci = s.search(/[：:]/)
    const prose = ci >= 0 ? s.slice(ci + 1) : ''
    return { line: s, prose }
  }).filter((x) => x.prose && !corpus.some((c) => c.includes(stripPunct(x.prose))))

  // ── 悬空引用扫描（删 DONOR/GUIDE 前的安全门）────────────────────────────
  // ⚠️ 首版用「在 JSON 字符串里数 id 出现次数 − 自身出现次数」⇒ 假阳性：
  //    `JSON.stringify(pool)` 把实体 id 当**键**，而 `JSON.stringify(pool[id])` 不含键，
  //    于是「被他处引用」恒等于 1。现改为结构化扫描（逐字段比对 source/target/nodeRef）。
  const treeObj = JSON.parse(treeRaw)
  const refScan = [DONOR, GUIDE].map((r) => {
    const poolHits = []
    for (const [id, e] of Object.entries(pool)) {
      if (id === r.ref) continue
      if (JSON.stringify(e).includes(r.ref)) poolHits.push(id)
    }
    const treeHits = []
    ;(function walk(n, p) {
      if (n.nodeRef === r.ref && n.id !== r.tree) treeHits.push({ treeId: n.id, name: n.name, path: p.join(' > ') })
      for (const c of n.children ?? []) walk(c, [...p, n.name])
    })(treeObj, [])
    const edgeHits = edgesArr.filter((e) => e.source === r.ref || e.target === r.ref || e.source === r.tree || e.target === r.tree)
    return {
      role: r.label, ref: r.ref, tree: r.tree,
      poolRefs: poolHits, poolRefCount: poolHits.length,
      treeRefs: treeHits, treeRefCount: treeHits.length,
      edgeRefs: edgeHits.map((e) => e.id), edgeRefCount: edgeHits.length,
      ownParentEdgeId: edgeHits[0]?.id ?? null,
      safeToDelete: poolHits.length === 0 && treeHits.length === 0,
    }
  })

  // ── tab 投影（按名字去重后的三种口径）────────────────────────────────────
  const tabCounts = Object.values(pool).map((e) => (e.card?.tabs ?? []).length)
  const sortedTabs = [...tabCounts].sort((a, b) => b - a)
  const projection = {
    survivorTabsNow: sTabs.length,
    survivorMethodTabsNow: sMethodTabs.length,
    novelAll: novelNamesAll.length,
    novelByNameOnly: novelNames.length,
    novelFilesStatic: filesStaticNames.length,
    novelNonFiles: nonFilesNames.length,
    maskedExtra: maskedNames.length,
    /** ① 全原子（含非 Files 方法各建 tab） */
    plan1AllTabs: sTabs.length + novelNamesAll.length,
    plan1AllTabsWithAssets: sTabs.length + novelNamesAll.length + 1,
    /** ① 严格口径（非 Files 方法收成 1 个流程 tab，不各建） */
    plan1StrictFilesTabs: sTabs.length + filesStaticNames.length,
    plan1StrictFilesTabsWithAssets: sTabs.length + filesStaticNames.length + 1,
    plan1StrictFilesTabsWithAssetsAndWatcher: sTabs.length + filesStaticNames.length + 1 + 1,
    globalMax: sortedTabs[0], globalSecond: sortedTabs[1],
    over32Now: tabCounts.filter((n) => n > 32).length,
  }

  // ── 非方法资产归属 ──────────────────────────────────────────────────────
  const enumRe = /^[A-Z][A-Za-z0-9_]*\.[A-Z_][A-Z0-9_]*\s*[：:]/
  const viewRe = /^[A-Z][A-Za-z0-9_]*View\s*[：:]/
  const plainBullets = dPlain.map((s) => s.replace(/^-\s*/, ''))
  const donorAssets = {
    sections: dSections,
    sectionCount: dSections.length,
    // ⚠️ 首版把「非 bullet 非【】」的行一律叫「裸小标题」⇒ 把 DONOR 的**前言行**也算成了小标题
    //    （正文首句「java.nio.file.Files 是 NIO.2 提供的…」）。现按结尾 `：` 区分小标题 vs 前言。
    leadLines: dBareHeaders.filter((s) => !/[：:]$/.test(s)),
    bareHeaders: dBareHeaders.filter((s) => /[：:]$/.test(s)),
    enumConstants: plainBullets.filter((s) => enumRe.test(s)),
    viewRefs: plainBullets.filter((s) => viewRe.test(s)),
    prose: plainBullets.filter((s) => !enumRe.test(s) && !viewRe.test(s)),
    /** 连 bullet 都不是的裸行（前言/小标题之外的正文） */
    unclassified: dLines.filter((s) => s && !/^-\s*\S/.test(s) && !/^【.+】$/.test(s)),
  }
  // SURVIVOR 侧对这些枚举常量的既有消费情况
  const sAllText = sTabs.map((t) => t.content).join('\n')
  donorAssets.enumConsumedBySurvivor = donorAssets.enumConstants.filter((c) => sAllText.includes(c.split(/[：:]/)[0].trim()))
  donorAssets.enumUnconsumedBySurvivor = donorAssets.enumConstants.filter((c) => !sAllText.includes(c.split(/[：:]/)[0].trim()))

  // ── tags 合并 ───────────────────────────────────────────────────────────
  const sTags = S.tags ?? []
  const dTags = D.tags ?? []
  const tagMerge = { survivor: sTags, donor: dTags, add: dTags.filter((t) => !sTags.includes(t)) }

  // ── Δ ───────────────────────────────────────────────────────────────────
  const delta = {
    tree: -2, pool: -2, edges: -2,
    reason: '删 DONOR（tree −1 / pool −1 / 其 treebind 父边 −1）+ 删 GUIDE（tree −1 / pool −1 / 其 treebind 父边 −1）',
    after: { tree: 3205 - 2, pool: 3852 - 2, edges: 4157 - 2 },
  }

  return {
    batchId: 'nio-files-fusion', generatedAt: new Date().toISOString(), problems, aborted: false,
    roles: {
      SURVIVOR: { ref: SURVIVOR.ref, tree: SURVIVOR.tree, label: S.label, tabs: sTabs.length, methodTabs: sMethodTabs.length, otherTabs: sOtherTabs.map((t) => `${t.id}/${t.label}(${t.content.length})`), rootContentLen: (S.card?.rootContent ?? '').length, rootContent: S.card?.rootContent ?? '', tags: sTags },
      DONOR: { ref: DONOR.ref, tree: DONOR.tree, label: D.label, tabId: D.card?.tabs?.[0]?.id, tabLabel: D.card?.tabs?.[0]?.label, defLen: dText.length, rowCount: dRows.length, distinctNames: dRowNames.length, rootContentLen: (D.card?.rootContent ?? '').length, tags: dTags },
      GUIDE: { ref: GUIDE.ref, tree: GUIDE.tree, label: G.label, rootContentLen: gText.length, tabs: (G.card?.tabs ?? []).length, tags: G.tags ?? [] },
      BEST: { ref: BEST.ref, tree: BEST.tree, label: B.label, rootContentLen: (B.card?.rootContent ?? '').length, tabs: (B.card?.tabs ?? []).length, hasCode: codeRe.test(B.card?.rootContent ?? '') },
    },
    countReconciliation: {
      donorDistinctNames: dRowNames.length,
      maskedNames,
      maskedCount: maskedNames.length,
      adjustedTotal: dRowNames.length + maskedNames.length,
      overlap: overlapNames.length,
      novelByNameOnly: novelNames.length,
      novelAdjusted: novelNames.length + maskedNames.length,
      note: '机械口径（每行只取首个方法名）会漏掉同行第二个调用；`maskedNames` 即被漏掉的名单，必须显式报出而不是悄悄取一个。',
    },
    overlapDiff, verdictCounts,
    novelMethods: {
      all: novelNamesAll,
      allByNameOnly: novelNames,
      filesStatic: filesStaticDetail,
      nonFiles: nonFilesDetail,
      maskedExtra: maskedNames,
    },
    donorAssets,
    guideAudit: {
      totalChars: gText.length,
      lines: gLines.length,
      sectionHeaders: gHeads.length,
      leadLines: gLead.length,
      methodEntryLines: gEntries.length,
      methodEntryNames: new Set(gEntries.map((s) => (s.match(/[A-Za-z_][A-Za-z0-9_]*\s*\(/) ?? [''])[0].trim().replace('(', ''))).size,
      // ★ 两道**独立**闸门，首版把二者塞进一个布尔导致「⛔ 但说明写着无用法片段」自相矛盾
      codeFragmentGate: { pass: gCode.length === 0, count: gCode.length, lines: gCode, note: gCode.length === 0 ? '未发现 `Xxx.method(实参)` 调用、try/catch、语句分号 ⇒ 全部是「签名：一句话」声明式条目' : '发现带实参的用法片段 ⇒ 删除前须先抽入对应方法 tab' },
      landingGate: { pass: gUnmatched.length === 0, count: gUnmatched.length, lines: gUnmatched, note: gUnmatched.length === 0 ? '每条目的说明都能在（SURVIVOR tab ∪ DONOR 行）里找到逐字落点 ⇒ 无独有信息' : `${gUnmatched.length} 条说明两侧语料均无逐字落点 ⇒ 须人工确认是否同义改写（同义改写不构成信息增量，但机械判据不能替你定性）` },
      malformedLines: gMalformed,
      deletable: gCode.length === 0 && gUnmatched.length === 0,
    },
    tagMerge, refScan, projection, delta,
    residualDecisions: [
      { id: 'D7', q: 'DONOR 的非方法资产落点（方案①未涉及）', detail: `枚常量 ${donorAssets.enumConstants.length} + 视图类引用 ${donorAssets.viewRefs.length} + 说明 ${donorAssets.prose.length} + 保节 ${dSections.length} + 裸小标题 ${dBareHeaders.length}` },
      { id: 'D8', q: 'DONOR 的 tags 是否并入 SURVIVOR', detail: `DONOR 独有 tag ${tagMerge.add.length} 个` },
      { id: 'D9', q: '非 Files 归属的方法（WatchService 段落）如何处置', detail: nonFilesDetail.map((r) => `${r.receiver}.${r.name}`).join(' / ') },
    ],
  }
}

// ── 渲染 ────────────────────────────────────────────────────────────────────
function renderMarkdown(r) {
  const L = []
  const P = (s) => L.push(s)
  P('# NIO-FILES-FUSION（D 批）· plan 之二：逐方法 diff / 导览审计 / Δ 重算')
  P('')
  P(`> 生成时间：${r.generatedAt} · **所有数字由脚本计算得出（T3 纪律）** · 脚本**不写 data/**`)
  P('')
  P('> **角色命名**（★ 与裁决书对齐，本报告起不再使用 A/B —— 首版报告 A/B 与裁决书相反）：')
  P('> `SURVIVOR` = 留存方 · `DONOR` = 捐赠方 · `GUIDE` = 待删导览 · `BEST` = 本批不动')
  P('')
  if (r.aborted) { P('## ⛔ 前置断言失败'); r.problems.forEach((p) => P('- ' + p)); return L.join('\n') }
  P('## ✅ 前置断言通过')
  P('')

  P('## 1. 方法口径复核（22 vs 23）')
  P('')
  const c = r.countReconciliation
  P(`- DONOR 去重方法名（机械口径）= **${c.donorDistinctNames}**`)
  P(`- 同行程多调用掩盖的方法名 = **${c.maskedCount}** 个：` + (c.maskedNames.map((x) => '`' + x + '`').join(' · ') || '（无）'))
  P(`- 计入口径 **${c.adjustedTotal}** · 与 SURVIVOR 重叠 **${c.overlap}** · 独有 = **${c.novelByNameOnly}**（机械）/ **${c.novelAdjusted}**（计入掩盖）`)
  P('')
  P('> ' + c.note)
  P('')

  P('## 2. ★ 27 个重叠方法逐方法 diff')
  P('')
  const v = r.verdictCounts
  P(`- 重叠方法 **${r.overlapDiff.length}** 个`)
  P(`- 判据命中：DONOR 有 SURVIVOR 缺的**签名** **${v.missingSig}** 个 · DONOR 有 SURVIVOR 无的**说明**（高可信）**${v.addNote}** 个 · **括注变体**（双侧都有括注，机械无法定性）**${v.noteVariant}** 个 · SURVIVOR 独有签名 **${v.survivorOnlySig}** 个`)
  P(`- 判据全清（可直接保留 SURVIVOR）**${v.cleanEquivalent}** 个`)
  P('')
  P('> ⚠️ **本表的口径已修正过**：首版「括注」抽取直接扫整段正文，把 `` `static void delete(Path path)` `` 的**形参表**当成括注 ⇒')
  P('> 几乎每个方法都「双侧有括注」，把 `delete`「（不存在抛异常）」这类**真增量**误判成「同义变体」，`addNote` 被人为压到 0。')
  P('> 现行为：先剥掉反引号代码跨度再抽括注。')
  P('')
  P('| 方法 | SURVIVOR 签 | DONOR 行 | 缺签名 | 缺说明(高可信) | 括注变体 | SURVIVOR 独有签名 | 值 |')
  P('|---|---|---|---|---|---|---|---|')
  for (const x of r.overlapDiff) {
    const verdict = x.precision.MISSING_SIG ? (x.precision.ADD_NOTE ? '补签名 + 补说明' : '补签名') : x.precision.ADD_NOTE ? '补说明' : x.precision.NOTE_VARIANT ? '人工核对括注' : '等价 · 保持'
    P(`| \`${x.name}\` | ${x.survivorSigCount} | ${x.donorRowCount} | ${x.missingSigs.length} | ${x.addNote.length} | ${x.noteVariant.length} | ${x.survivorOnlySigs.length} | ${verdict} |`)
  }
  P('')
  P('### 需补的签名全文')
  P('')
  const anySig = r.overlapDiff.filter((x) => x.missingSigs.length || x.survivorOnlySigs.length)
  if (!anySig.length) P('- （无）')
  for (const x of anySig) {
    P(`- **\`${x.name}\`**`)
    x.missingSigs.forEach((k) => P(`  - DONOR → SURVIVOR 缺：\`${k}\``))
    x.survivorOnlySigs.forEach((k) => P(`  - ⚠️ SURVIVOR 独有（不可丢）：\`${k}\``))
  }
  P('')
  P('### 需补的说明全文 / 括注变体（人工核对）')
  P('')
  const noteRows = r.overlapDiff.filter((x) => x.addNote.length || x.noteVariant.length)
  if (!noteRows.length) P('- （无）')
  for (const x of noteRows) {
    P(`- **\`${x.name}\`**`)
    P(`  - DONOR 原文：${x.donorRows.map((d) => '`' + d.raw.replace(/^-\s*/, '') + '`').join(' · ')}`)
    P(`  - SURVIVOR 原文：${x.survivorContent.split('\n').join(' / ')}`)
    P(`  - DONOR 括注：${x.donorNotes.map((n) => '（' + n + '）').join(' ')} · SURVIVOR 括注：${x.survivorNotes.map((n) => '（' + n + '）').join(' ') || '（无）'}`)
  }
  P('')

  P('## 3. 独有方法的归属分类（方案① 全原子前必须知道哪些不是 Files 的方法）')
  P('')
  const nm = r.novelMethods
  P(`- 独有方法 **${nm.all.length}**（= 机械口径 ${nm.allByNameOnly.length} + 被同行掩盖 ${nm.maskedExtra.length}）`)
  P(`- 按**接收者**归属：Files 静态方法 **${nm.filesStatic.length}** + **非 Files 归属 ${nm.nonFiles.length}**`)
  P('')
  P('**非 Files 归属（★ 若原子化成 Files 的 tab 会指向错误宿主）**：')
  P('')
  nm.nonFiles.forEach((x) => P(`- \`${x.receiver}.${x.name}\` ← ${x.row}`))
  P('')
  P('**Files 静态方法**：')
  P('')
  P(nm.filesStatic.map((x) => '`' + x.name + '`').join(' · '))
  P('')
  P(`**被同行掩盖、须补回**：` + (nm.maskedExtra.map((x) => '`' + x + '`').join(' · ') || '（无）'))
  P('')

  P('## 4. GUIDE「常见用法」内容形态审计（裁决书给的前置条件）')
  P('')
  const ga = r.guideAudit
  P(`- 正文 **${ga.totalChars}** 字 / ${ga.lines} 行 · 分节标题 ${ga.sectionHeaders} · 引言行 ${ga.leadLines} · 方法条目 **${ga.methodEntryLines}** 行 / 去重 **${ga.methodEntryNames}** 个方法名`)
  P('')
  P('| 闸门 | 结果 | 计数 | 判据 |')
  P('|---|---|---|---|')
  P(`| 用法片段门（卸载前须先抽出） | ${ga.codeFragmentGate.pass ? '✅ 通过' : '⛔ 不通过'} | ${ga.codeFragmentGate.count} | ${ga.codeFragmentGate.note} |`)
  P(`| 落点门（是否含独有信息） | ${ga.landingGate.pass ? '✅ 通过' : '⛔ 需人工' } | ${ga.landingGate.count} | ${ga.landingGate.note} |`)
  P('')
  P(`**综合可删性：${ga.deletable ? '✅ 可纯删' : '⚠️ 待人工确认'}**`)
  P('')
  if (ga.codeFragmentGate.lines.length) {
    P('**用法片段全文（先抽出再删）**：')
    P('')
    ga.codeFragmentGate.lines.forEach((x) => P('- ' + x))
    P('')
  }
  if (ga.landingGate.lines.length) {
    P(`**无逐字落点的 ${ga.landingGate.count} 条（须人工确认是否同义改写）**：`)
    P('')
    ga.landingGate.lines.forEach((x) => P(`- 说明「${x.prose}」 ← ${x.line}`))
    P('')
  }
  if (ga.malformedLines.length) {
    P('**格式异常行（`-` 后缺空格）**：')
    P('')
    ga.malformedLines.forEach((x) => P('- ' + x))
    P('')
  }

  P('## 5. 悬空引用扫描（删 DONOR/GUIDE 前的安全门）')
  P('')
  P('| 角色 | 池内他处引用 | 树内他处引用 | 边表引用 | 安全 | 父边 |')
  P('|---|---|---|---|---|---|')
  for (const x of r.refScan) P(`| ${x.role} | ${x.poolRefCount} | ${x.treeRefCount} | ${x.edgeRefCount} | ${x.safeToDelete ? '✅' : '⛔'} | \`${x.ownParentEdgeId}\` |`)
  P('')
  P('> 口径：**结构化逐字段比对**（`source`/`target`/`nodeRef`），不是在 JSON 字符串里数 id 出现次数 ——')
  P('> 后者会把「实体 id 作为键」算成一次引用，导致「被他处引用」恒为 1 的假阳性。')
  P('')

  P('## 6. DONOR 非方法资产（方案① 未涉及，须另定落点）')
  P('')
  const da = r.donorAssets
  P(`- 保节 **${da.sectionCount}** 个 · 前言 **${da.leadLines.length}** 行 · 裸小标题 **${da.bareHeaders.length}** 个 · 枚常量 **${da.enumConstants.length}** · 视图类引用 **${da.viewRefs.length}** · 说明 **${da.prose.length}**`)
  P(`- 枚常量中 SURVIVOR 现有正文已提到名字的 **${da.enumConsumedBySurvivor.length}** 个 · 未提到的 **${da.enumUnconsumedBySurvivor.length}** 个`)
  P('')
  P('**前言行**：')
  P('')
  da.leadLines.forEach((x) => P('- ' + x))
  P('')
  P('**裸小标题（既非【】，也非 bullet —— 机械盘点最容易漏的一类）**：')
  P('')
  da.bareHeaders.forEach((x) => P('- `' + x + '`'))
  P('')
  P('**枚常量**：')
  P('')
  da.enumConstants.forEach((x) => P('- ' + x + (da.enumUnconsumedBySurvivor.includes(x) ? ' ⚠️ SURVIVOR 未提及其名' : '')))
  P('')
  P('**视图类引用**：')
  P('')
  da.viewRefs.forEach((x) => P('- ' + x))
  P('')
  P('**说明条目**：')
  P('')
  da.prose.forEach((x) => P('- ' + x))
  P('')

  P('## 7. tab 投影（方案① 全原子）')
  P('')
  const pj = r.projection
  P(`- SURVIVOR 现 **${pj.survivorTabsNow}** tab（其中方法 tab ${pj.survivorMethodTabsNow}）`)
  P(`- 独有方法 **${pj.novelAll}** = Files 静态 ${pj.novelFilesStatic} + 非 Files ${pj.novelNonFiles}（后者 ${pj.maskedExtra} 个来自同行掩盖补回）`)
  P('')
  P('| 口径 | 最终 tab 数 | 说明 |')
  P('|---|---|---|')
  P(`| ①-a 全原子（非 Files 方法也各建 tab） | ${pj.plan1AllTabs} | 会造出 \`newWatchService()\`/\`register()\` 这种指向错误宿主的 tab |`)
  P(`| ①-a + 非方法资产收 1 tab | ${pj.plan1AllTabsWithAssets} | |`)
  P(`| ①-b 严格口径（非 Files 方法收 1 个流程 tab） | ${pj.plan1StrictFilesTabs} | 推荐：只给 Files 自己的方法建 tab |`)
  P(`| ①-b + 非方法资产收 1 tab | ${pj.plan1StrictFilesTabsWithAssets} | |`)
  P(`| ①-b + 资产 tab + WatchService 流程 tab | ${pj.plan1StrictFilesTabsWithAssetsAndWatcher} | 非 Files 方法有归属且不误导 |`)
  P('')
  P(`- 全库现最大 **${pj.globalMax}** · 次大 **${pj.globalSecond}** · 当前 >32 tab 的实体 **${pj.over32Now}** 个`)
  P('')

  P('## 8. Δ（按裁决修正：删 DONOR + 删 GUIDE）')
  P('')
  const d = r.delta
  P(`- Δ树 **${d.tree}** · Δ池 **${d.pool}** · Δ边 **${d.edges}** —— ${d.reason}`)
  P(`- 落定值：树 **${d.after.tree}** · 池 **${d.after.pool}** · 边 **${d.after.edges}**`)
  P('')
  P('> 注意：SURVIVOR 本体（池内 1 个实体被改写 + 树节点保留）**不计入 Δ**，只计入「modified」。')
  P('')

  P('## 9. tags 合并')
  P('')
  P(`- SURVIVOR：${r.tagMerge.survivor.map((x) => '`' + x + '`').join(' · ')}`)
  P(`- DONOR：${r.tagMerge.donor.map((x) => '`' + x + '`').join(' · ')}`)
  P(`- 若合并则新增 **${r.tagMerge.add.length}** 个：${r.tagMerge.add.map((x) => '`' + x + '`').join(' · ')}`)
  P('')

  P('## 10. 残余决策点（方案① 未覆盖）')
  P('')
  r.residualDecisions.forEach((x) => { P(`### ${x.id} · ${x.q}`); P(''); P('- ' + x.detail); P('') })

  return L.join('\n')
}

const detail = buildDetail()
fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 'detail.md'), renderMarkdown(detail) + '\n')
fs.writeFileSync(path.join(OUT_DIR, 'detail.json'), JSON.stringify(detail, null, 2) + '\n')
console.log('✅ plan 之二完成（**未触碰 data/**）')
console.log('   报告：outputs/nio-files-fusion/detail.md')
console.log('   机器可读：outputs/nio-files-fusion/detail.json')
if (detail.aborted) { console.log('   ⛔ 前置断言失败：' + detail.problems.join(' / ')); process.exit(1) }
const c = detail.countReconciliation
console.log(`   口径：DONOR 去重 ${c.donorDistinctNames} · 掩盖 ${c.maskedCount} · 重叠 ${c.overlap} · 独有 ${c.novelByNameOnly}(机械)/${c.novelAdjusted}(计入掩盖)`)
const v = detail.verdictCounts
console.log(`   重叠 diff：缺签名 ${v.missingSig} · 缺说明 ${v.addNote} · 括注变体 ${v.noteVariant} · SURVIVOR 独有签名 ${v.survivorOnlySig} · 等价 ${v.cleanEquivalent}`)
console.log(`   GUIDE：用法片段门 ${detail.guideAudit.codeFragmentGate.pass ? '✅' : '⛔'}(${detail.guideAudit.codeFragmentGate.count}) · 落点门 ${detail.guideAudit.landingGate.pass ? '✅' : '⛔'}(${detail.guideAudit.landingGate.count})`)
console.log(`   归属：独有 ${detail.novelMethods.all.length} = Files 静态 ${detail.novelMethods.filesStatic.length} + 非 Files ${detail.novelMethods.nonFiles.length}`)
console.log(`   tab 投影：全原子 ${detail.projection.plan1AllTabs} · 严格 ${detail.projection.plan1StrictFilesTabs} · 严格+资产+监听 ${detail.projection.plan1StrictFilesTabsWithAssetsAndWatcher}`)
console.log(`   悬空引用：` + detail.refScan.map((x) => `${x.role} 池${x.poolRefCount}/树${x.treeRefCount}/${x.safeToDelete ? '✅' : '⛔'}`).join(' · '))
