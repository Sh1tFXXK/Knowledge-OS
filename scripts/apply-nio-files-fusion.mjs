/**
 * NIO-FILES-FUSION（D 批）· apply（默认 dry-run，--apply 才写）
 *
 * 批次语义：DONOR(`k_nio_files_util` Files工具类) 的内容融合进 SURVIVOR(`k_java_nio_file_files` java.nio.file.Files)
 *           + 删 GUIDE(`k_1787916226907_9aq9u6` 常见用法，纯冗余导览) + 摘掉 DONOR。
 *
 * ★ 角色命名（**禁用 A/B** —— 2026-09-16 用户裁决书与首版报告的 A/B 相反）：
 *   SURVIVOR = k_java_nio_file_files / tree_java_nio_file_files   留存方
 *   DONOR    = k_nio_files_util       / tree_nio_files_util       捐赠方（删）
 *   GUIDE    = k_1787916226907_9aq9u6 / tree_1787916227408_nkaljw 待删导览（删）
 *   BEST     = k_1787916124192_mow0sq / tree_1787916125075_qsrbco 本批不动
 *
 * ★ 用户裁决（2026-09-16）
 *   D1 保留 SURVIVOR（FQCN = 身份证据，宪法 §3.1）· D2 方案① 全原子
 *   D7 非方法资产：11 条枚常量 → 新建 `options` tab（**严格逐字取 DONOR，不补外部知识**）；
 *      5 视图类引用 + 8 分节 + 3 裸标题 → 丢弃（`CopyOption：`/`OpenOption：` 两个标题
 *      是常量**分组标签**而非排版骨架，随常量保留；`属性视图：` 随视图类丢弃）
 *   D8 tags 并入 3 个：java.nio.file / NIO / 文件操作
 *   D9 4 个非 Files 方法 → 合成 1 个 `watch-service` 流程 tab
 *   口径 ①-b：非 Files 方法不各建 tab · 最终 SURVIVOR tabs = 53
 *   前言行 → 并入 SURVIVOR.rootContent（有增量才追加，不覆盖）
 *   27 个重叠方法**不能简单覆盖**：6 个补签名（取并集）· 4 个补说明（取 DONOR 更详细版）
 *
 * ★ 本脚本的零造数据保证（落盘后强校验）
 *   SURVIVOR 侧新增的**每一行**都必须是 DONOR 原始 def 文本的子串；4 个被改写的 prose 必须与
 *   DONOR 原文逐字相等。任何一处对不上 ⇒ 自检失败并拒绝/回滚。禁止凭 Java 知识补返回类型等。
 *
 * 用法：
 *   node scripts/apply-nio-files-fusion.mjs            # dry-run（只读 + 预览）
 *   node scripts/apply-nio-files-fusion.mjs --apply    # 落盘（先备份）
 */
import fs from 'node:fs'
import path from 'node:path'

// ── 角色句柄 ────────────────────────────────────────────────────────────────
export const SURVIVOR = { ref: 'k_java_nio_file_files', tree: 'tree_java_nio_file_files', label: 'java.nio.file.Files' }
export const DONOR = { ref: 'k_nio_files_util', tree: 'tree_nio_files_util', label: 'Files工具类' }
export const GUIDE = { ref: 'k_1787916226907_9aq9u6', tree: 'tree_1787916227408_nkaljw', label: '常见用法' }
export const BEST = { ref: 'k_1787916124192_mow0sq', tree: 'tree_1787916125075_qsrbco', label: '最佳实践' }

export const EXPECTED_DELTA = { tree: -2, pool: -2, edges: -2 }
export const EXPECTED = { tree: 3203, pool: 3850, edges: 4155 }
/** ①-b：29 既有方法 + def + comparison + bestPractices + 19 新方法 + options + watch-service */
export const EXPECTED_TABS_AFTER = 53
export const DONOR_TAG_ADD = ['java.nio.file', 'NIO', '文件操作']

export const OPTIONS_TAB = { id: 'options', label: '选项常量' }
export const WATCH_TAB = { id: 'watch-service', label: 'WatchService 文件监听流程' }
/** SURVIVOR 现有的「非方法」tab（其余一律视作方法 tab） */
const METHOD_LABEL_RE = /\(\)/

const ROOT = process.cwd()
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'))
const rdText = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

// ── 签名工具（与 plan 之二同源）────────────────────────────────────────────
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
function paramType(p) {
  const m = p.match(/^(.*?)\s+[A-Za-z_][A-Za-z0-9_]*$/)
  return (m ? m[1] : p).replace(/\s+/g, '')
}
export function sigKey(name, paramsStr) {
  return name + '(' + splitTopLevel(paramsStr).map(paramType).join(',') + ')'
}
function readParams(text, name) {
  const re = new RegExp('\\b' + name + '\\s*\\(', 'g')
  const out = []
  let m
  while ((m = re.exec(text))) {
    let i = m.index + m[0].length
    let depth = 1
    const start = i
    while (i < text.length) {
      if (text[i] === '(') depth++
      else if (text[i] === ')') { depth--; if (depth === 0) break }
      i++
    }
    out.push(text.slice(start, i))
    re.lastIndex = Math.max(i, m.index + m[0].length)
  }
  return out
}
function allCallNames(line) {
  return [...String(line).matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((x) => x[1])
}
function receiverOf(sigPart, name) {
  const i = sigPart.indexOf(name + '(')
  if (i <= 0) return null
  const m = sigPart.slice(0, i).match(/([A-Za-z_][A-Za-z0-9_]*)\s*\.\s*$/)
  return m ? m[1] : null
}
function notesOf(text) {
  const body = String(text ?? '').replace(/`[^`]*`/g, '')
  return [...body.matchAll(/[（(]([^（）()]{2,40})[）)]/g)].map((x) => x[1].trim())
}
const stripPunct = (s) => String(s).replace(/[。．.；;，,、\s]/g, '')

// ── DONOR def 解析 ─────────────────────────────────────────────────────────
export function parseDonor(text) {
  const rows = []
  const sections = []
  const bareHeaders = []
  const lead = []
  const enumGroups = []
  let curGroup = null
  for (const raw of text.split('\n')) {
    const s = raw.trim()
    if (!s) continue
    const h = s.match(/^【(.+?)】$/)
    if (h) { sections.push(h[1]); curGroup = null; continue }
    if (!/^-\s*\S/.test(s)) {
      // 非 bullet 裸行：以 `：` 结尾的是分组小标题，否则是前言行
      if (/[：:]$/.test(s)) { bareHeaders.push(s); curGroup = { header: s, constants: [] }; enumGroups.push(curGroup) }
      else lead.push(s)
      continue
    }
    const body = s.replace(/^-\s*/, '')
    const ci = body.search(/[：:]/)
    const sigPart = ci >= 0 ? body.slice(0, ci) : body
    const prose = ci >= 0 ? body.slice(ci + 1) : ''
    const calls = allCallNames(sigPart)
    const isEnum = /^[A-Z][A-Za-z0-9_]*\.[A-Z_][A-Z0-9_]*\s*[：:]/.test(body)
    if (isEnum) {
      if (curGroup) curGroup.constants.push(s)
      continue
    }
    if (!calls.length || sigPart.indexOf('(') < 0) continue
    const name = calls[0]
    const params = readParams(sigPart, name)
    rows.push({
      raw: s, name, sigPart, prose,
      receiver: receiverOf(sigPart, name),
      sig: params.length ? name + '(' + params[0] + ')' : name + '()',
      key: params.length ? sigKey(name, params[0]) : name + '()',
      allCalls: allCallNames(s),
    })
  }
  return { rows, sections, bareHeaders, lead, enumGroups }
}

// ── 计划 ───────────────────────────────────────────────────────────────────
export function buildPlan() {
  const tree = rd('data/tree-data.json')
  const pool = rd('data/node-pool.json')
  const edgesRaw = rdText('data/knowledge-edges.json')
  const edges0 = JSON.parse(edgesRaw)
  const edges = Array.isArray(edges0) ? edges0 : edges0.edges

  const problems = []
  const flat = []
  ;(function walk(n, anc) {
    flat.push({ node: n, path: [...anc, n.name].join(' > ') })
    for (const c of n.children ?? []) walk(c, [...anc, n.name])
  })(tree, [])

  for (const r of [SURVIVOR, DONOR, GUIDE, BEST]) {
    if (!pool[r.ref]) problems.push(`池实体缺失：${r.label} ${r.ref}`)
    if (!flat.some((x) => x.node.id === r.tree)) problems.push(`树节点缺失：${r.label} ${r.tree}`)
  }
  if (problems.length) return { problems, aborted: true }

  const S = pool[SURVIVOR.ref]
  const D = pool[DONOR.ref]
  const dText = D.card.tabs[0].content
  const donor = parseDonor(dText)

  // ── SURVIVOR 现状 ───────────────────────────────────────────────────────
  const sTabs = S.card.tabs
  const sMethodTabs = sTabs.filter((t) => METHOD_LABEL_RE.test(t.label ?? ''))
  const sMethodNames = sMethodTabs.map((t) => t.id)
  const sSet = new Set(sMethodNames)
  if (sTabs.length !== 32) problems.push(`前置：SURVIVOR tabs 应为 32，实为 ${sTabs.length}`)
  if (donor.enumGroups.reduce((a, g) => a + g.constants.length, 0) !== 11) problems.push(`前置：DONOR 枚常量应为 11，实为 ${donor.enumGroups.reduce((a, g) => a + g.constants.length, 0)}`)
  if (donor.lead.length !== 1) problems.push(`前置：DONOR 前言行应为 1，实为 ${donor.lead.length}`)

  const dRowNames = [...new Set(donor.rows.map((r) => r.name))]
  const novelNames = dRowNames.filter((n) => !sSet.has(n))
  const multiRows = donor.rows.filter((r) => r.allCalls.length >= 2)
  const maskedNames = [...new Set(multiRows.flatMap((r) => r.allCalls.slice(1)))].filter((n) => !dRowNames.includes(n))

  // 接收者归属（★ 非 Files 方法不各建 tab，收进 watch-service）
  const receiverByName = new Map()
  for (const r of donor.rows) if (!receiverByName.has(r.name) && r.receiver) receiverByName.set(r.name, r.receiver)
  for (const nm of maskedNames) {
    let recv = null
    for (const r of donor.rows) {
      const m = r.raw.match(new RegExp('([A-Za-z_][A-Za-z0-9_]*)\\s*\\.\\s*' + nm + '\\s*\\('))
      if (m) { recv = m[1]; break }
    }
    if (!recv) recv = donor.rows.find((r) => new RegExp('(^|[^A-Za-z0-9_])' + nm + '\\s*\\(').test(r.raw))?.receiver ?? null
    if (recv) receiverByName.set(nm, recv)
  }
  const isNonFiles = (n) => { const r = receiverByName.get(n); return !!r && r !== 'Files' }
  const novelAll = [...novelNames, ...maskedNames]
  const filesStaticNames = novelAll.filter((n) => !isNonFiles(n))
  const nonFilesNames = novelAll.filter(isNonFiles)
  if (filesStaticNames.length !== 19) problems.push(`前置：Files 静态独有应为 19，实为 ${filesStaticNames.length}`)
  if (nonFilesNames.length !== 4) problems.push(`前置：非 Files 归属应为 4，实为 ${nonFilesNames.length}`)

  // ── 27 重叠 diff（6 补签名 / 4 补说明 / 其余保持）───────────────────────
  const overlapNames = sMethodNames.filter((n) => dRowNames.includes(n))
  const sigAppend = []
  const proseReplace = []
  const noteVariant = []
  for (const name of overlapNames) {
    const tab = sMethodTabs.find((t) => t.id === name)
    const spans = [...(tab.content.matchAll(/`([^`]+)`/g))].map((m) => m[1])
    const sKeys = new Set()
    for (const sp of spans) for (const p of readParams(sp, name)) sKeys.add(sigKey(name, p))
    const rows = donor.rows.filter((r) => r.name === name)
    const missing = rows.filter((r) => !sKeys.has(r.key))
    if (missing.length) sigAppend.push({ name, sigs: missing.map((r) => r.sig) })
    // 说明增量：DONOR 括注在 SURVIVOR 正文里找不到落点
    // ⚠️ 仅当 **SURVIVOR 自己没有任何括注** 时才判定为「真增量」。
    //    若 SURVIVOR 已有括注而 DONOR 的括注不同 ⇒ 是**同义变体**（如 createDirectories:
    //    「含父目录」vs「包括所有不存在的父目录」），此时 SURVIVOR 侧更详细 ⇒ 保持不动。
    const dNotes = [...new Set(rows.flatMap((r) => notesOf(r.prose)))]
    const sNotes = notesOf(tab.content)
    const sBody = stripPunct(tab.content)
    const addNote = dNotes.filter((n) => !sBody.includes(stripPunct(n)))
    if (addNote.length && sNotes.length === 0) proseReplace.push({ name, from: tab.content, to: rows[0].prose, notes: addNote })
    else if (addNote.length) noteVariant.push({ name, survivorNote: sNotes, donorNote: addNote, kept: tab.content })
  }

  // ── 19 个新方法 tab（逐字迁入 DONOR 行；多行 = 多块 `prose\n\n\`sig\``）──
  const newMethodTabs = filesStaticNames.map((n) => {
    const rows = donor.rows.filter((r) => r.name === n)
    const blocks = rows.map((r) => (r.prose ? r.prose + '\n\n`' + r.sig + '`' : '`' + r.sig + '`'))
    return { id: n, label: n + '()', content: blocks.join('\n\n'), rows: rows.map((r) => r.raw) }
  })

  // ── options tab（DONOR 自有分组标签 + 11 条常量，逐字）─────────────────
  const optionsContent = donor.enumGroups
    .filter((g) => g.constants.length)
    .map((g) => g.header + '\n' + g.constants.join('\n'))
    .join('\n\n')

  // ── watch-service tab（WatchService 分节的非方法行 + 3 条非 Files 行，逐字）─
  const watchSection = donor.sections.findIndex((x) => x.includes('WatchService'))
  const watchContent = (() => {
    const out = []
    const all = dText.split('\n').map((x) => x.trim())
    const start = all.findIndex((s) => /^【.*WatchService.*】$/.test(s))
    if (start < 0) return ''
    for (let i = start + 1; i < all.length; i++) if (/^【.+】$/.test(all[i])) break; else if (all[i]) out.push(all[i])
    return out.join('\n')
  })()
  const nonFilesRows = nonFilesNames.map((n) => donor.rows.find((r) => r.name === n)?.raw).filter(Boolean)

  // ── rootContent（前言行：有增量才追加）─────────────────────────────────
  const sRoot = S.card.rootContent ?? ''
  const leadLine = donor.lead[0] ?? ''
  const tokens = [...new Set([...leadLine.matchAll(/[A-Za-z][A-Za-z0-9_.]*/g)].map((m) => m[0])
    .concat([...leadLine.matchAll(/[\u4e00-\u9fa5]{4}/g)].map((m) => m[0])))]
  const absentTokens = tokens.filter((t) => !sRoot.includes(t))
  const newRoot = absentTokens.length && leadLine ? sRoot + '\n\n' + leadLine : sRoot
  // 引导语断言：DONOR 首句不含「常用方法如下」这类引导语
  const hasLeadIn = /(如下|以下|如下所示|如下：)/.test(leadLine)
  if (hasLeadIn) problems.push('前言行含引导语，须先行截断（本脚本未实现自动截断）')

  // ── tags ────────────────────────────────────────────────────────────────
  const sTags = S.tags ?? []
  const newTags = [...sTags, ...DONOR_TAG_ADD.filter((t) => !sTags.includes(t))]

  // ── 删除项 ──────────────────────────────────────────────────────────────
  const deleteItems = [DONOR, GUIDE].map((r) => {
    const parentEdgeId = edges.find((e) => String(e.id ?? '').endsWith(':' + r.tree))?.id ?? null
    return { role: r.label, ref: r.ref, tree: r.tree, parentEdgeId }
  })
  for (const x of deleteItems) {
    if (!x.parentEdgeId) problems.push(`未找到 ${x.role} 的 treebind 父边`)
    // 悬空引用保安：除自身树节点外，不得有别的节点引用该 ref
    const otherRefs = flat.filter((x2) => x2.node.nodeRef === x.ref && x2.node.id !== x.tree)
    if (otherRefs.length) problems.push(`${x.role} 被其他树节点引用：${otherRefs.map((y) => y.node.id).join(',')}`)
  }
  // SURVIVOR 树节点的 count 字段（沿用 C 批约定：手工标注，不动）
  const survivorNode = flat.find((x) => x.node.id === SURVIVOR.tree)?.node
  const survivorCountBefore = survivorNode?.count ?? null

  const after = {
    tree: flat.length + EXPECTED_DELTA.tree,
    pool: Object.keys(pool).length + EXPECTED_DELTA.pool,
    edges: edges.length + EXPECTED_DELTA.edges,
    survivorTabs: sTabs.length + newMethodTabs.length + 1 + 1,
  }
  for (const [k, v] of Object.entries(EXPECTED)) if (after[k] !== v) problems.push(`Δ 断言失败：${k} 预计 ${v}，算得 ${after[k]}`)
  if (after.survivorTabs !== EXPECTED_TABS_AFTER) problems.push(`SURVIVOR tabs 预计 ${EXPECTED_TABS_AFTER}，算得 ${after.survivorTabs}`)

  return {
    problems, aborted: false,
    before: { tree: flat.length, pool: Object.keys(pool).length, edges: edges.length, survivorTabs: sTabs.length },
    after, donor,
    overlapNames, sigAppend, proseReplace, noteVariant, newMethodTabs,
    filesStaticNames, nonFilesNames, nonFilesRows, maskedNames,
    optionsContent, watchContent, watchSections: watchSection,
    sRoot, newRoot, absentTokens, leadLine, sTags, newTags,
    deleteItems, survivorCountBefore,
  }
}

// ── 落盘工具 ───────────────────────────────────────────────────────────────
function withTrailingNL(original, obj) {
  return JSON.stringify(obj, null, 2) + (original.endsWith('\n') ? '\n' : '')
}
function atomicWrite(relPath, content) {
  const abs = path.join(ROOT, relPath)
  const tmp = `${abs}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, content, 'utf8')
  try { fs.renameSync(tmp, abs) } catch { fs.writeFileSync(abs, content, 'utf8'); try { fs.unlinkSync(tmp) } catch { /* noop */ } }
}
function removeTreeNode(root, targetId) {
  let removed = false
  ;(function rec(n) {
    if (!n.children) return
    const i = n.children.findIndex((c) => c.id === targetId)
    if (i >= 0) { n.children.splice(i, 1); removed = true; return }
    for (const c of n.children) rec(c)
  })(root)
  return removed
}
function findTreeNode(root, id) {
  let res = null
  ;(function rec(n) { if (n.id === id) { res = n; return } for (const c of n.children ?? []) rec(c) })(root)
  return res
}

// ── CLI ────────────────────────────────────────────────────────────────────
const APPLY = process.argv.includes('--apply')
const plan = buildPlan()
const H = (s) => console.log('\n══ ' + s + ' ' + '═'.repeat(Math.max(0, 60 - s.length)))

console.log('════ NIO-FILES-FUSION（D 批）' + (APPLY ? ' · APPLY' : ' · DRY-RUN') + ' ════')
if (plan.aborted) { console.log('⛔ 前置断言失败'); plan.problems.forEach((p) => console.log('   · ' + p)); process.exit(2) }

H('0 · 角色 → id 映射（禁用 A/B）')
for (const r of [SURVIVOR, DONOR, GUIDE, BEST]) console.log(`  ${r === SURVIVOR ? 'SURVIVOR' : r === DONOR ? 'DONOR   ' : r === GUIDE ? 'GUIDE   ' : 'BEST    '} = ${r.ref} / ${r.tree}  (${r.label})`)

H('1 · 基数与 Δ')
console.log(`  树(含根) = ${plan.before.tree} → ${plan.after.tree}`)
console.log(`  池 keys  = ${plan.before.pool} → ${plan.after.pool}`)
console.log(`  边       = ${plan.before.edges} → ${plan.after.edges}`)
console.log(`  SURVIVOR tabs = ${plan.before.survivorTabs} → ${plan.after.survivorTabs}`)

H('2 · 27 重叠方法：补签名（取并集，不覆盖）')
for (const x of plan.sigAppend) console.log(`  ${x.name}: + ${x.sigs.map((s) => '`' + s + '`').join(' ／ ')}`)
console.log(`  共 ${plan.sigAppend.length} 个方法 / ${plan.sigAppend.reduce((a, x) => a + x.sigs.length, 0)} 个签名`)

H('3 · 27 重叠方法：改写 prose（取 DONOR 更详细版，逐字）')
for (const x of plan.proseReplace) {
  console.log(`  ${x.name}:`)
  console.log(`    - ${JSON.stringify(x.from)}`)
  console.log(`    + ${JSON.stringify(x.to)}   ← DONOR 原句，增量=${x.notes.join('、')}`)
}
console.log(`  共 ${plan.proseReplace.length} 个方法改写`)
H('3b · 判为「同义变体」而**保持不动**（SURVIVOR 侧已有括注且更详细）')
for (const x of plan.noteVariant) console.log(`  ${x.name}: SURVIVOR（${x.survivorNote.join('、')}） vs DONOR（${x.donorNote.join('、')}） ⇒ 保持`)
if (!plan.noteVariant.length) console.log('  （无）')

H('4 · 新增 ' + plan.newMethodTabs.length + ' 个方法 tab（逐字迁入 DONOR）')
for (const t of plan.newMethodTabs) console.log(`  ${t.id}()  [${t.content.length} 字]  ${t.rows.length} 行源`)

H('5 · options tab（DONOR 自有分组 + 11 条常量）')
console.log(plan.optionsContent)

H('6 · watch-service tab（非 Files 归属，逐字）')
console.log(plan.watchContent)
console.log(`  —— 非 Files 方法行：\n    ${plan.nonFilesRows.join('\n    ')}`)

H('7 · 前言行 → rootContent')
console.log(`  原 rootContent(${plan.sRoot.length}) : ${plan.sRoot}`)
console.log(`  DONOR 首句            : ${plan.leadLine}`)
console.log(`  未在 rootContent 出现的词 ${plan.absentTokens.length} 个: ${plan.absentTokens.join('、')}`)
console.log(`  → ${plan.absentTokens.length ? '追加' : '信息已覆盖，不追加'}`)
if (plan.newRoot !== plan.sRoot) console.log(`  新 rootContent(${plan.newRoot.length}) : ${plan.newRoot}`)

H('8 · tags')
console.log(`  ${plan.sTags.join(' / ')}  →  ${plan.newTags.join(' / ')}`)

H('9 · 删除项')
for (const x of plan.deleteItems) console.log(`  ${x.role}: 池 ${x.ref} · 树 ${x.tree} · 边 ${x.parentEdgeId}`)

H('10 · 前置断言')
if (plan.problems.length) { console.log(`⛔ 失败 ${plan.problems.length} 条：`); plan.problems.forEach((p) => console.log('   · ' + p)) }
else console.log('✅ 全部通过')

if (!APPLY) {
  console.log('\n（dry-run 结束，未写盘。）实跑：node scripts/apply-nio-files-fusion.mjs --apply')
  process.exit(plan.problems.length ? 2 : 0)
}
if (plan.problems.length) { console.log('\n⛔ 前置断言未通过，拒绝落盘。'); process.exit(2) }

// ── 真落盘 ─────────────────────────────────────────────────────────────────
const STAMP = new Date().toISOString().replace(/[:.]/g, '-')
const BK_REL = 'data/backups/nio-files-fusion-' + STAMP
fs.mkdirSync(path.join(ROOT, BK_REL), { recursive: true })
for (const f of ['tree-data.json', 'node-pool.json', 'knowledge-edges.json']) {
  fs.copyFileSync(path.join(ROOT, 'data/' + f), path.join(ROOT, BK_REL + '/' + f))
}
console.log('\n✔ 备份 → ' + BK_REL)

const treeRaw = rdText('data/tree-data.json')
const poolRaw = rdText('data/node-pool.json')
const edgesRaw = rdText('data/knowledge-edges.json')
const tree = JSON.parse(treeRaw)
const pool = JSON.parse(poolRaw)
const edges0 = JSON.parse(edgesRaw)
const isArr = Array.isArray(edges0)
const edges = isArr ? edges0 : edges0.edges

// ── 1. SURVIVOR 池实体：rootContent / tags / tabs ────────────────────────
const S = pool[SURVIVOR.ref]
S.card.rootContent = plan.newRoot
S.tags = plan.newTags

const dText = pool[DONOR.ref].card.tabs[0].content
const donor = parseDonor(dText)
const tabById = new Map(S.card.tabs.map((t) => [t.id, t]))

// 2a. 补签名（追加进既有 tab 的代码跨度列表）
for (const x of plan.sigAppend) {
  const t = tabById.get(x.name)
  t.content = t.content.trimEnd() + ' ／ ' + x.sigs.map((s) => '`' + s + '`').join(' ／ ')
}
// 2b. 改写 prose（取 DONOR 逐字）
for (const x of plan.proseReplace) {
  const t = tabById.get(x.name)
  const spans = [...t.content.matchAll(/`[^`]+`/g)].map((m) => m[0])
  t.content = x.to + '\n\n' + spans.join(' ／ ')
}
// 2c. 19 个新方法 tab（插在**最后一个**既有方法 tab 之后、非方法 tab 之前）
let insertAt = S.card.tabs.length
for (let i = S.card.tabs.length - 1; i >= 0; i--) {
  if (METHOD_LABEL_RE.test(S.card.tabs[i].label ?? '')) { insertAt = i + 1; break }
}
const newTabs = plan.newMethodTabs.map((t) => ({ id: t.id, label: t.label, content: t.content }))
// 2d. options / watch-service 放在 bestPractices 之前
const bpIdx = S.card.tabs.findIndex((t) => t.id === 'bestPractices')
const tailTabs = [
  { id: OPTIONS_TAB.id, label: OPTIONS_TAB.label, content: plan.optionsContent },
  { id: WATCH_TAB.id, label: WATCH_TAB.label, content: plan.watchContent },
]
S.card.tabs = [
  ...S.card.tabs.slice(0, insertAt),
  ...newTabs,
  ...S.card.tabs.slice(insertAt, bpIdx),
  ...tailTabs,
  ...S.card.tabs.slice(bpIdx),
]

// ── 3. 删 DONOR / GUIDE ──────────────────────────────────────────────────
const edgesKept = edges.filter((e) => !plan.deleteItems.some((x) => e.id === x.parentEdgeId))
for (const x of plan.deleteItems) {
  delete pool[x.ref]
  if (!removeTreeNode(tree, x.tree)) throw new Error('树节点删除失败：' + x.tree)
}

atomicWrite('data/tree-data.json', withTrailingNL(treeRaw, tree))
atomicWrite('data/node-pool.json', withTrailingNL(poolRaw, pool))
atomicWrite('data/knowledge-edges.json', withTrailingNL(edgesRaw, isArr ? edgesKept : { ...edges0, edges: edgesKept }))

fs.writeFileSync(path.join(ROOT, BK_REL + '/journal.txt'), [
  'batch=nio-files-fusion  role=SURVIVOR:' + SURVIVOR.ref + ' DONOR:' + DONOR.ref + ' GUIDE:' + GUIDE.ref,
  'tabs ' + plan.before.survivorTabs + '→' + plan.after.survivorTabs + ' (new methods ' + newTabs.length + ' + options + watch-service)',
  'sigAppend=' + plan.sigAppend.map((x) => x.name + '(+' + x.sigs.length + ')').join(','),
  'proseReplace=' + plan.proseReplace.map((x) => x.name).join(','),
  'rootContent ' + plan.sRoot.length + '→' + plan.newRoot.length + ' (DONOR 首句逐字追加)',
  'tags +' + DONOR_TAG_ADD.join('+'),
  'treeNodes ' + plan.before.tree + '→' + plan.after.tree + ' ; poolKeys ' + plan.before.pool + '→' + plan.after.pool + ' ; edges ' + plan.before.edges + '→' + plan.after.edges,
  '',
].join('\n'), 'utf8')

// ── 落盘后自检（含零造数据强校验）───────────────────────────────────────
const tree2 = rd('data/tree-data.json')
const pool2 = rd('data/node-pool.json')
const eArr2 = (() => { const x = rd('data/knowledge-edges.json'); return Array.isArray(x) ? x : x.edges })()
const flat2 = []
;(function walk(n) { flat2.push(n); for (const c of n.children ?? []) walk(c) })(tree2)
const S2 = pool2[SURVIVOR.ref]
const CHK = []
const ck = (ok, desc, detail = '') => CHK.push({ ok, msg: ok ? desc : desc + (detail ? ' ← 实际：' + detail : '') })

ck(flat2.length === plan.after.tree, `树节点数 = ${plan.after.tree}`, String(flat2.length))
ck(Object.keys(pool2).length === plan.after.pool, `池键数 = ${plan.after.pool}`, String(Object.keys(pool2).length))
ck(eArr2.length === plan.after.edges, `边数 = ${plan.after.edges}`, String(eArr2.length))
ck(S2.card.tabs.length === EXPECTED_TABS_AFTER, `SURVIVOR tabs = ${EXPECTED_TABS_AFTER}`, String(S2.card.tabs.length))
ck(!pool2[DONOR.ref], 'DONOR 池实体已删除', '仍存在')
ck(!pool2[GUIDE.ref], 'GUIDE 池实体已删除', '仍存在')
ck(!findTreeNode(tree2, DONOR.tree), 'DONOR 树节点已删除', '仍存在')
ck(!findTreeNode(tree2, GUIDE.tree), 'GUIDE 树节点已删除', '仍存在')
ck(!eArr2.some((e) => plan.deleteItems.some((x) => x.parentEdgeId === e.id)), '两条 treebind 父边已删除', '仍存在')
const allRaw = JSON.stringify(tree2) + JSON.stringify(pool2) + JSON.stringify(eArr2)
ck(!allRaw.includes(DONOR.ref), 'DONOR ref 全库零残留', '文本仍出现')
ck(!allRaw.includes(GUIDE.ref), 'GUIDE ref 全库零残留', '文本仍出现')
ck(!allRaw.includes(DONOR.tree), 'DONOR treeId 全库零残留', '文本仍出现')
ck(!allRaw.includes(GUIDE.tree), 'GUIDE treeId 全库零残留', '文本仍出现')
ck(JSON.stringify(S2.card.rootContent) === JSON.stringify(plan.newRoot), 'rootContent 与计划逐字节相等', S2.card.rootContent.slice(0, 40))
ck(JSON.stringify(S2.tags) === JSON.stringify(plan.newTags), `tags = ${plan.newTags.length} 个`, JSON.stringify(S2.tags))
ck(S2.card.tabs.map((t) => t.id).join(',').startsWith('def,comparison'), 'tab 顺序：def/comparison 在最前', S2.card.tabs.slice(0, 2).map((t) => t.id).join(','))
ck(S2.card.tabs[S2.card.tabs.length - 1].id === 'bestPractices', 'bestPractices 仍在最后', S2.card.tabs[S2.card.tabs.length - 1].id)
ck(S2.card.tabs[S2.card.tabs.length - 2].id === WATCH_TAB.id, `${WATCH_TAB.id} 紧邻 bestPractices 之前`, S2.card.tabs[S2.card.tabs.length - 2].id)
ck(S2.card.tabs[S2.card.tabs.length - 3].id === OPTIONS_TAB.id, `${OPTIONS_TAB.id} 在 ${WATCH_TAB.id} 之前`, S2.card.tabs[S2.card.tabs.length - 3].id)

// ★★ 零造数据强校验：SURVIVOR 新增/改写的每一行都必须能在 DONOR 原文里找到
const donorTexts = [dText]
const addedLines = []
for (const x of plan.sigAppend) {
  const t = S2.card.tabs.find((y) => y.id === x.name)
  for (const s of x.sigs) addedLines.push({ from: `sigAppend:${x.name}`, text: s })
}
for (const x of plan.proseReplace) addedLines.push({ from: `proseReplace:${x.name}`, text: x.to })
for (const t of plan.newMethodTabs) {
  for (const blk of t.content.split('\n\n')) for (const ln of blk.split('\n')) if (ln) addedLines.push({ from: `newTab:${t.id}`, text: ln.trim() })
}
for (const g of donor.enumGroups.filter((g) => g.constants.length)) addedLines.push({ from: 'options:header', text: g.header })
for (const ln of plan.optionsContent.split('\n')) if (ln.trim()) addedLines.push({ from: 'options:body', text: ln.trim() })
for (const ln of plan.watchContent.split('\n')) if (ln.trim()) addedLines.push({ from: 'watch:body', text: ln.trim() })
for (const ln of plan.newRoot.split('\n')) if (ln.trim() && !plan.sRoot.includes(ln.trim())) addedLines.push({ from: 'rootContent', text: ln.trim() })
const untraceable = addedLines.filter((x) => {
  const probe = x.text.replace(/^`|`$/g, '')
  return !donorTexts.some((d) => d.includes(probe))
})
ck(untraceable.length === 0, `零造数据：新增 ${addedLines.length} 行全部逐字回溯到 DONOR 原文`, untraceable.slice(0, 5).map((x) => x.from + ':' + x.text).join(' | '))

// 27 重叠方法的功能完整性：tab 一个不少
ck(plan.overlapNames.every((n) => S2.card.tabs.some((t) => t.id === n)), '27 个重叠方法 tab 全部仍在', plan.overlapNames.filter((n) => !S2.card.tabs.some((t) => t.id === n)).join(','))
ck(plan.filesStaticNames.every((n) => S2.card.tabs.some((t) => t.id === n)), '19 个新方法 tab 全部就位', plan.filesStaticNames.filter((n) => !S2.card.tabs.some((t) => t.id === n)).join(','))
// ★ BEST 逐字节未变（对比备份快照）
const bkPool = JSON.parse(fs.readFileSync(path.join(ROOT, BK_REL + '/node-pool.json'), 'utf8'))
ck(JSON.stringify(pool2[BEST.ref]) === JSON.stringify(bkPool[BEST.ref]), 'BEST 池实体逐字节未变', '有改动')
// SURVIVOR 独有签名未丢（createTempFile / createTempDirectory 的 Path 版）
ck(S2.card.tabs.find((t) => t.id === 'createTempFile').content.includes('Path dir, String prefix') ||
  S2.card.tabs.find((t) => t.id === 'createTempFile').content.includes('createTempFile(Path'), 'createTempFile 的 Path 版签名未丢', '丢失')
ck(S2.card.tabs.find((t) => t.id === 'createTempDirectory').content.includes('createTempDirectory(Path'), 'createTempDirectory 的 Path 版签名未丢', '丢失')
// options tab 常量数
ck((S2.card.tabs.find((t) => t.id === OPTIONS_TAB.id).content.match(/^- /gm) ?? []).length === 11, 'options tab 含 11 条常量', String((S2.card.tabs.find((t) => t.id === OPTIONS_TAB.id).content.match(/^- /gm) ?? []).length))
// SPARSE/SYNC/DSYNC 不得出现（用户裁决：不补外部知识）
const optContent = S2.card.tabs.find((t) => t.id === OPTIONS_TAB.id).content
ck(!/SPARSE|DSYNC/.test(optContent) && !/StandardOpenOption\.SYNC/.test(optContent), 'options tab 未混入 SPARSE/SYNC/DSYNC（外部知识零掺入）', '出现外部常量')
// 非 Files 方法不得成为独立 tab
ck(!plan.nonFilesNames.some((n) => S2.card.tabs.some((t) => t.id === n)), '4 个非 Files 方法未各建 tab', plan.nonFilesNames.filter((n) => S2.card.tabs.some((t) => t.id === n)).join(','))
// SURVIVOR 树节点 count 未被改
const sn2 = findTreeNode(tree2, SURVIVOR.tree)
ck(JSON.stringify(sn2.count ?? null) === JSON.stringify(plan.survivorCountBefore), `SURVIVOR 树节点 count 未改（${plan.survivorCountBefore}）`, String(sn2.count))
ck(sn2.children.length === 1 && sn2.children[0].id === BEST.tree, 'SURVIVOR 树子节点只剩 最佳实践', sn2.children.map((c) => c.name).join(','))

H('11 · 落盘后自检（' + CHK.filter((c) => c.ok).length + '/' + CHK.length + '）')
for (const c of CHK) console.log('  ' + (c.ok ? '✅' : '⛔') + ' ' + c.msg)
const pass = CHK.every((c) => c.ok)
console.log('\n' + (pass ? '✅ REAL_APPLY_VERIFIED' : '⛔ 自检失败，请从备份回滚（cp，勿用 git checkout）'))
console.log('   备份：' + BK_REL)
process.exit(pass ? 0 : 3)
