#!/usr/bin/env node
/**
 * classify-t3-medium-residuals.mjs —— T3 MEDIUM 残差的 A/B/C 批量分类（**只读**）
 *
 * 背景
 *   用户提议：38 条 MEDIUM 不该逐条人工讨论，应按事实自动分三类
 *     A EXISTING_CANONICAL —— 已有 canonical 目标 ⇒ 卸树留池 / 归并（不走改名）
 *     B VIEW_ONLY          —— 只是展示原子    ⇒ unloadTreeEntry（不建新 treeId）
 *     C NEED_NEW_CONTAINER —— 真缺语义容器    ⇒ 建/改 canonical tree
 *   并提出假设：「很多问题不是缺节点，而是**错误挂载**」。
 *
 * 本脚本**只读**检验该假设。注意 T3-P1 已把 130 条全部改名落盘，
 * 故本脚本是**对已完成工作的反证式复核**，不是执行计划。
 *
 * ⚠️ 两条判据纪律（本脚本踩过并修正）
 *   ① 自指陷阱：树里已有 T3-P1 改名后的节点，用 name 查重会**匹配到它自己**
 *      ⇒ 必须同时排除 `oldTreeId` 与 `proposedTreeId`。未排除时 38/38 全部假阳性。
 *   ② 同名 ≠ 同概念：「控制流」在树里 4 处，但 nodeRef 互不相同
 *      （go 语法 / 程序分析 / ACM 软件开发 / React），是**四个不同概念**。
 *      ⇒ 判 A 必须看**池实体是否等价**，不能只看 label。仅凭同名会把 4 个都误判成重复挂载。
 *   ③ 正对照：本脚本用 P0.1 **已知为 B 类**的 3 条（`asplit_mysql_tool_*`）做阳性对照，
 *      它们必须被 B 规则命中 —— 否则规则失效，0 命中只是仪器坏了。
 *
 * 用法
 *   node scripts/classify-t3-medium-residuals.mjs                  # 38 条 MEDIUM
 *   node scripts/classify-t3-medium-residuals.mjs --scope=all-asplit
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = process.env.KNOWLEDGE_OS_DATA_DIR || path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const SCOPE = (process.argv.find((a) => a.startsWith('--scope=')) || '--scope=medium-38').slice(8)

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const tree = readJson(path.join(DATA_DIR, 'tree-data.json'))
const pool = readJson(path.join(DATA_DIR, 'node-pool.json'))
const final = readJson(path.join(OUT_DIR, 'asplit-treeid-mapping.FINAL.json'))

// ── 1. 树索引 ────────────────────────────────────────────────────────────────
const rows = []
;(function walk(n, parent, pathNames) {
  const p = [...pathNames, n.name]
  rows.push({ n, parent, path: p.join(' > ') })
  n.children?.forEach((c) => walk(c, n, p))
})(tree, null, [])

const byId = new Map(rows.map((r) => [r.n.id, r]))
const ancestorsOf = (id) => {
  const out = []
  let cur = byId.get(id)?.parent
  while (cur) { out.push(cur.id); cur = byId.get(cur.id)?.parent }
  return out
}

// nodeRef → 承载它的树节点 id
const mountsByRef = new Map()
for (const { n } of rows) {
  if (!n.nodeRef) continue
  if (!mountsByRef.has(n.nodeRef)) mountsByRef.set(n.nodeRef, [])
  mountsByRef.get(n.nodeRef).push(n.id)
}

// name → 树节点 id
const idsByName = new Map()
for (const { n } of rows) {
  if (!idsByName.has(n.name)) idsByName.set(n.name, [])
  idsByName.get(n.name).push(n.id)
}

// ── 2. 展示原子索引（B 类唯一事实来源）────────────────────────────────────────
const atomHosts = new Map()
let hostCount = 0
for (const [hostId, ent] of Object.entries(pool)) {
  let n = 0
  for (const d of ent.viewDimensions ?? []) for (const s of d.sections ?? []) for (const a of s.atoms ?? []) {
    if (!a?.nodeId) continue
    n++
    if (!atomHosts.has(a.nodeId)) atomHosts.set(a.nodeId, [])
    const arr = atomHosts.get(a.nodeId)
    if (!arr.includes(hostId)) arr.push(hostId)
  }
  if (n) hostCount++
}

// ── 3. 范围 ─────────────────────────────────────────────────────────────────
const items = final.items
const medium38 = items.filter(
  (i) => i.semanticAncestorGap >= 1 || (i.predicateShift && i.semanticAncestorGap === 0),
)
const scopeItems = SCOPE === 'all-asplit' ? items : medium38

// ── 4. 分类 ─────────────────────────────────────────────────────────────────
const classify = (i) => {
  const ent = pool[i.nodeRef]
  const facts = {
    poolExists: Boolean(ent),
    poolLabel: ent?.label ?? null,
    poolKind: ent?.kind ?? null,
    canonicalNodeId: ent?.canonicalNodeId ?? null,
    redirectTo: ent?.redirectTo ?? null,
    poolStatus: ent?.status ?? null,
    // B：该池实体是不是**别人**的展示原子
    viewAtomHosts: atomHosts.get(i.nodeRef) ?? [],
    // 弱信号：同名树节点（可能只是不同概念，须看 nodeRef）
    sameNameOtherNodes: (idsByName.get(i.name) ?? []).filter(
      (x) => x !== i.oldTreeId && x !== i.proposedTreeId,
    ),
    // 该 nodeRef 一共被几处树节点挂载
    mountsOfSameRef: mountsByRef.get(i.nodeRef) ?? [],
    childCount: byId.get(i.oldTreeId)?.n.children?.length ?? 0,
  }

  // ① A（元数据型）：池实体自带 canonical / redirect 标记
  const metaRedirect = Boolean(facts.canonicalNodeId || facts.redirectTo) || facts.poolStatus === 'archived-redirect'

  // ② A（语义型）：同名节点 + **同一池实体等价**（同 nodeRef 或同 canonicalKey 或 canonical 指向它）
  const key = ent?.canonicalKey
  const semanticDup = facts.sameNameOtherNodes.filter((id) => {
    const other = byId.get(id)?.n
    if (!other?.nodeRef) return false
    if (other.nodeRef === i.nodeRef) return true
    const oe = pool[other.nodeRef]
    if (!oe) return false
    if (key && oe.canonicalKey === key) return true
    if (oe.canonicalNodeId === i.nodeRef || oe.redirectTo === i.nodeRef) return true
    if (ent?.canonicalNodeId === other.nodeRef || ent?.redirectTo === other.nodeRef) return true
    return false
  })

  // ③ B：被别人当展示原子引用
  const isViewAtom = facts.viewAtomHosts.length > 0

  let category, action, reason
  if (metaRedirect || semanticDup.length) {
    category = 'EXISTING_CANONICAL'
    action = 'unloadTreeEntry / 归并到 canonical —— **不应**再取新 treeId'
    reason = metaRedirect
      ? `池实体自带 canonical 目标（canonicalNodeId=${facts.canonicalNodeId ?? '-'} / redirectTo=${facts.redirectTo ?? '-'} / status=${facts.poolStatus ?? '-'}）`
      : `语义重复：同名且池实体等价 → 已存在 ${semanticDup.join(', ')}`
  } else if (isViewAtom) {
    category = 'VIEW_ONLY'
    action = 'unloadTreeEntry · 不创建新 treeId'
    reason = `作为展示原子被 ${facts.viewAtomHosts.length} 个宿主实体的 viewDimensions 引用（${facts.viewAtomHosts.slice(0, 3).join(' / ')}${facts.viewAtomHosts.length > 3 ? ' …' : ''}）`
  } else {
    category = 'NEED_NEW_CONTAINER'
    action = '保留 T3-P1 改名结果（确实是树内的一个语义位置）'
    reason = '无 canonical 指向 · 未被任何宿主当作展示原子 · 无等价同名节点'
  }

  return {
    id: i.oldTreeId,
    proposedTreeId: i.proposedTreeId,
    name: i.name,
    nodeRef: i.nodeRef,
    parentTreeId: i.parentTreeId,
    parentName: i.parentName,
    path: i.path,
    // ⚠️ 三分支，不能二分：gap=0 ∧ ¬predicateShift 是**原本就是 HIGH**，
    //    把它也写成「MEDIUM(→HIGH)」会让报告虚报「谓词修正影响了它」
    draftTier:
      i.semanticAncestorGap >= 1
        ? 'MEDIUM'
        : i.predicateShift
          ? 'MEDIUM(→HIGH，谓词修正)'
          : 'HIGH(始终)',
    finalGap: i.semanticAncestorGap,
    predicateShift: i.predicateShift,
    category,
    action,
    reason,
    facts,
  }
}

const classified = scopeItems.map(classify)
const byCat = { EXISTING_CANONICAL: [], VIEW_ONLY: [], NEED_NEW_CONTAINER: [] }
for (const r of classified) byCat[r.category].push(r)

// ── 5. 正对照（已知 B 类必须被 B 规则命中）──────────────────────────────────
const POSITIVE_CONTROLS = ['asplit_mysql_tool_backup', 'asplit_mysql_tool_security', 'asplit_mysql_tool_cluster']
const positiveControl = POSITIVE_CONTROLS.map((ref) => ({
  poolRef: ref,
  detectedByBRule: (atomHosts.get(ref) ?? []).length > 0,
  hosts: atomHosts.get(ref) ?? [],
  stillMountedInTree: (mountsByRef.get(ref) ?? []).length > 0,
  note: 'P0.1 已按 B 类处置（卸树留池）',
}))
const controlPass = positiveControl.every((c) => c.detectedByBRule)

// ── 6. 附加发现（超出 38 条范围，但由同一判据扫出）────────────────────────────
const treeSideB = rows
  .filter((r) => r.n.nodeRef && (atomHosts.get(r.n.nodeRef) ?? []).length)
  .map((r) => ({
    treeId: r.n.id,
    name: r.n.name,
    nodeRef: r.n.nodeRef,
    hosts: atomHosts.get(r.n.nodeRef),
    // ⚠️ 必须同时比对 oldTreeId 与 proposedTreeId —— 树里已是改名后的 id，
    //    只比 oldTreeId 会得到「全部 0 在范围内」的自指假象
    inT3P1Scope: items.some((i) => i.oldTreeId === r.n.id || i.proposedTreeId === r.n.id),
    path: r.path,
  }))

const sharedRefNodes = [...mountsByRef.entries()].filter(([, ids]) => ids.length > 1)
// ── 串线（cross-wire）：一个节点的 nodeRef 同时被**它自己的后代**使用 ──────────────
// 规则：父节点不该与自己的后代共用同一池实体 —— 命中即「父的 nodeRef 十有八九写错了」。
// 实例：react_root 名「React」但 nodeRef=asplit_module_export（池 label「模块导出」），
//       而它的孩子「模块导出」也指向同一池实体 ⇒ 点「React」会渲染「模块导出」的卡片。
const crossWiredByDescendant = rows
  .map((r) => {
    const desc = []
    ;(function d(n) { for (const c of n.children ?? []) { desc.push(c); d(c) } })(r.n)
    const clashes = desc.filter((c) => c.nodeRef && c.nodeRef === r.n.nodeRef)
    if (!clashes.length) return null
    return {
      treeId: r.n.id,
      treeName: r.n.name,
      nodeRef: r.n.nodeRef,
      poolLabel: pool[r.n.nodeRef]?.label ?? null,
      clashingDescendants: clashes.map((c) => ({ id: c.id, name: c.name })),
      path: r.path,
      inT3P1Scope: items.some((i) => i.oldTreeId === r.n.id || i.proposedTreeId === r.n.id),
    }
  })
  .filter(Boolean)
// react_root 跨接线：树节点名与池实体 label 不一致
const crossWired = rows
  .filter((r) => {
    const e = r.n.nodeRef && pool[r.n.nodeRef]
    return e && e.label && r.n.name !== e.label
  })
  .map((r) => ({ treeId: r.n.id, treeName: r.n.name, nodeRef: r.n.nodeRef, poolLabel: pool[r.n.nodeRef].label, path: r.path }))

// ── 7. 报告 ─────────────────────────────────────────────────────────────────
const report = {
  generatedAt: new Date().toISOString(),
  mode: 'READ-ONLY 分类审计（不写 data/，不执行卸载）',
  scope: SCOPE,
  scopeSize: classified.length,
  verdict: {
    userHypothesis: '「很多 MEDIUM 不是缺节点，而是错误挂载」⇒ 应卸载/归并而非改名',
    hypothesisHeld: byCat.EXISTING_CANONICAL.length + byCat.VIEW_ONLY.length > 0,
    conclusion: null,
  },
  counts: {
    total: classified.length,
    A_EXISTING_CANONICAL: byCat.EXISTING_CANONICAL.length,
    B_VIEW_ONLY: byCat.VIEW_ONLY.length,
    C_NEED_NEW_CONTAINER: byCat.NEED_NEW_CONTAINER.length,
    autoClosable_A_plus_B: byCat.EXISTING_CANONICAL.length + byCat.VIEW_ONLY.length,
  },
  positiveControl: {
    passed: controlPass,
    why: '若已知 B 类样本没被 B 规则命中，说明规则失效，此时「0 命中」是仪器坏了、不是结论',
    samples: positiveControl,
  },
  extraFindings: {
    note: '以下**不在 38 条内**，是同一判据扫全树时发现的，登记备查，本脚本不处置',
    treeNodesWhoseRefIsSomeoneElsesViewAtom: {
      count: treeSideB.length,
      inT3P1Scope: treeSideB.filter((x) => x.inT3P1Scope).length,
      examples: treeSideB.slice(0, 20),
    },
    sharedNodeRef: {
      refCount: sharedRefNodes.length,
      treeNodeCount: sharedRefNodes.reduce((a, [, ids]) => a + ids.length, 0),
      top: sharedRefNodes.sort((a, b) => b[1].length - a[1].length).slice(0, 10).map(([ref, ids]) => ({ ref, treeIds: ids })),
      interpretation:
        '「同一池实体多挂载」是**系统性现象**，本身**不构成**错误挂载的证据（本项目既有结论）',
    },
    treeNameVsPoolLabelMismatch: {
      count: crossWired.length,
      examples: crossWired.slice(0, 10),
      note: '树节点名与池实体 label 不一致 —— 多数是**正当的投影命名**（「Reactor模式」→「Reactor模式概述」），本身不构成缺陷；只有与下面 crossWiredByDescendant 重合时才可疑',
    },
    crossWiredByDescendant: {
      count: crossWiredByDescendant.length,
      rule: '父节点的 nodeRef 同时被它自己的后代使用 ⇒ 父的 nodeRef 极可能串线（点击父会渲染成子的实体）',
      findings: crossWiredByDescendant,
    },
  },
  rows: classified,
}

report.verdict.conclusion =
  report.counts.autoClosable_A_plus_B === 0
    ? `A+B = 0/${classified.length}。**假设未被数据支持**：38 条既无 canonical 指向、也不是任何宿主的展示原子、也无等价同名节点 ⇒ 它们确实需要树内的一个语义位置，T3-P1 的改名处置成立。`
    : `A+B = ${report.counts.autoClosable_A_plus_B}/${classified.length}。**假设部分成立**：这部分本应卸载/归并，改名不是最优处置。`

// ── 7b. 交叉核对：同一判据跑全量 130（判断「假设」是否落在别的层级）────────────
{
  const all = items.map(classify)
  const g = { EXISTING_CANONICAL: [], VIEW_ONLY: [], NEED_NEW_CONTAINER: [] }
  for (const r of all) g[r.category].push(r)
  const inMediumIds = new Set(classified.map((r) => r.id))
  report.crossCheck = {
    why:
      '38 条 MEDIUM 全判 C 之后，必须再确认「假设是否落在别处」——' +
      '用同一判据跑 130 条全集，看 A/B 是否命中，以及命中的是否**不在** MEDIUM 组内',
    scope: 130,
    counts: {
      A_EXISTING_CANONICAL: g.EXISTING_CANONICAL.length,
      B_VIEW_ONLY: g.VIEW_ONLY.length,
      C_NEED_NEW_CONTAINER: g.NEED_NEW_CONTAINER.length,
    },
    B_hits: g.VIEW_ONLY.map((r) => ({
      id: r.id,
      proposedTreeId: r.proposedTreeId,
      name: r.name,
      nodeRef: r.nodeRef,
      hosts: r.facts.viewAtomHosts,
      inMedium38: inMediumIds.has(r.id),
      draftTier: r.draftTier,
      reason: r.reason,
    })),
    A_hits: g.EXISTING_CANONICAL.map((r) => ({ id: r.id, reason: r.reason })),
    reading: null,
  }
  const bHits = report.crossCheck.B_hits
  report.crossCheck.reading =
    bHits.length === 0
      ? '全集亦无 A/B 命中 ⇒ 「错误挂载」假设在本批范围内**完全不成立**。'
      : `全集命中 B 类 ${bHits.length} 条，其中在 MEDIUM-38 内的 ${bHits.filter((x) => x.inMedium38).length} 条 ⇒ ` +
        `假设命中的**不是** MEDIUM 组，而是 ${bHits.filter((x) => !x.inMedium38).map((x) => x.draftTier).join('/')} 组。` +
        `这 ${bHits.length} 条是真正的「形如 P0.1 的展示原子误挂载」候选，需单独裁决（卸载 or 保留改名），` +
        `并须像 P0.1 一样做 UI 渲染实测（原子在宿主视图里是否照旧渲染）。`
}

fs.mkdirSync(OUT_DIR, { recursive: true })
const outJson = path.join(OUT_DIR, 'medium-classification.json')
fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n')

// ── 8. 控制台 ───────────────────────────────────────────────────────────────
const L = (s = '') => console.log(s)
L(`范围：${SCOPE}   样本：${classified.length}`)
L(`正对照（P0.1 已知 B 类 3 条）：${controlPass ? '✅ PASS —— B 规则确实能命中' : '❌ FAIL —— 规则失效，本报告读数不可信'}`)
L('')
L(`A EXISTING_CANONICAL : ${byCat.EXISTING_CANONICAL.length}`)
L(`B VIEW_ONLY          : ${byCat.VIEW_ONLY.length}`)
L(`C NEED_NEW_CONTAINER : ${byCat.NEED_NEW_CONTAINER.length}`)
L(`→ 可自动关闭(A+B)     : ${report.counts.autoClosable_A_plus_B}`)
L('')
L('结论：' + report.verdict.conclusion)
L('')
if (byCat.EXISTING_CANONICAL.length) {
  L('── A 类明细 ──')
  for (const r of byCat.EXISTING_CANONICAL) L(`  ${r.id}\n    → ${r.reason}`)
}
if (byCat.VIEW_ONLY.length) {
  L('── B 类明细 ──')
  for (const r of byCat.VIEW_ONLY) L(`  ${r.id} [${r.name}]\n    → ${r.reason}`)
}
L('')
L('── C 类抽样 10 条（保留改名）──')
for (const r of byCat.NEED_NEW_CONTAINER.slice(0, 10)) {
  L(`  ${r.id} → ${r.proposedTreeId}   (children=${r.facts.childCount}, 同 ref 挂载数=${r.facts.mountsOfSameRef.length})`)
}
if (byCat.NEED_NEW_CONTAINER.length > 10) L(`  … 其余 ${byCat.NEED_NEW_CONTAINER.length - 10} 条见 JSON`)
L('')
L('── 交叉核对：同一判据跑全量 130 ──')
L(`  A ${report.crossCheck.counts.A_EXISTING_CANONICAL} · B ${report.crossCheck.counts.B_VIEW_ONLY} · C ${report.crossCheck.counts.C_NEED_NEW_CONTAINER}`)
for (const h of report.crossCheck.B_hits) {
  L(`  B: ${h.id} [${h.name}] ref=${h.nodeRef} ← hosts ${h.hosts.join('|')}  ${h.inMedium38 ? '(在 MEDIUM-38 内)' : '(不在 MEDIUM-38)'}`)
}
L('  ' + report.crossCheck.reading)
L('')
L('── 附加发现 ──')
L(`  全树 nodeRef 是「别人展示原子」的树节点：${treeSideB.length}（其中在 T3-P1 范围内：${treeSideB.filter((x) => x.inT3P1Scope).length}）`)
L(`  同一 nodeRef 多挂载：${sharedRefNodes.length} 个 ref / ${report.extraFindings.sharedNodeRef.treeNodeCount} 个树节点`)
L(`  树节点名 ≠ 池 label：${crossWired.length}`)
L(`  ★ nodeRef 串线（父与自己的后代共用同一池实体）：${crossWiredByDescendant.length}`)
for (const f of crossWiredByDescendant.slice(0, 8)) {
  L(`     ${f.treeId}（名「${f.treeName}」）ref=${f.nodeRef} ⇒ 池实体其实叫「${f.poolLabel}」`)
  L(`        与后代 ${f.clashingDescendants.map((c) => c.id + '（' + c.name + '）').join('、')} 撞同一池实体`)
}
L('')
L('报告已落盘：' + path.relative(ROOT, outJson).replace(/\\/g, '/'))
