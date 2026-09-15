/**
 * JAVA-LIB-OVERLAP-B · 卸树留池：摘掉 `类/java.lang/Object` 下 4 个重复挂载
 *
 * 动作（用户裁决 2026-09-16）：
 *   ① 从 java/类/java.lang/Object 的 children 里摘掉 4 个**叶子**节点：
 *        String        tree_1785340521267_j7je9h
 *        StringBuilder tree_1785378444842_wglz53
 *        StringBuffer  tree_1785378491125_qwcncm
 *        Scanner       tree_1785379879357_2xsrxd
 *   ② **不删任何边** —— 只读预检实证：这 4 个挂载在 knowledge-edges.json 里出现 0 次
 *      （用户蓝图原写「−4 treebind 边」，与事实不符，2026-09-16 已修正口径；详见 buildPlan 内注）
 *   ③ **池零改动**（4 个实体全部保留；它们在 java/常用类库 下的挂载一律保留）
 *
 * ⛔ 与 A 批的根本差异：A 是「删池实体」，B 是「只删树挂载」—— 是**卸树留池**，
 *    不是删除知识。4 个实体在 `常用类库` 下各还有 1 处挂载 ⇒ 内容零损失。
 *
 * ⚠️ 本脚本只写 `data/tree-data.json` 一个文件；**不写** node-pool.json 与 knowledge-edges.json
 *    （连"重写一遍内容相同"都不做）—— 这样「池 3856 / 边 4161 不变」就不是自证，
 *    而是能被 `git status` 直接证明的事实。
 *
 * 用法：
 *   node scripts/apply-java-lib-overlap-b.mjs            # dry-run（默认，不写盘）
 *   node scripts/apply-java-lib-overlap-b.mjs --apply     # 实跑
 *
 * 设计纪律（沿项目惯例）：
 *   · buildPlan() 是纯函数，预检与实跑共用同一份计划
 *   · 落盘前备份到 data/backups/java-lib-overlap-b-<ISO>/
 *   · 原子写（tmp + rename），保留末尾换行
 *   · 摘除一律用 **id 精确相等**（禁用前缀 / 模糊匹配 —— §T3-P0.1 A 条）
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const ROOT = process.cwd()
const D = (p) => path.join(ROOT, p)

/** Object 节点在树上的 id（本挂载处的父） */
export const PARENT_TREE_ID = 'tree_java_source_020f0cac60da5755_s_type_a6b9e05051861242'
/** 4 个待卸挂载（treeId 精确锁定） */
export const TARGETS = [
  { treeId: 'tree_1785340521267_j7je9h', nodeRef: 'k_java_lang_string', name: 'String' },
  { treeId: 'tree_1785378444842_wglz53', nodeRef: 'k_java_lang_stringbuilder', name: 'StringBuilder' },
  { treeId: 'tree_1785378491125_qwcncm', nodeRef: 'k_java_lang_stringbuffer', name: 'StringBuffer' },
  { treeId: 'tree_1785379879357_2xsrxd', nodeRef: 'k_java_util_scanner', name: 'Scanner' },
]
export const TARGET_TREE_IDS = TARGETS.map((t) => t.treeId)
/** 4 个待卸挂载的 treeId（精确锁定；它们在边表里零出现，见 buildPlan 内注） */
export const TARGET_EDGE_IDS = TARGETS.map((t) => 'treebind:' + PARENT_TREE_ID + ':' + t.treeId)
/** 摘除后 Object.children 应剩下的名称（按原顺序） */
export const EXPECTED_PARENT_CHILDREN_AFTER = ['Number', 'Math', '类的构造函数', '方法', 'Optional']
/** 保留侧挂载路径必须含它（证明「内容零损失」） */
export const KEPT_PATH_MARKER = '常用类库'

const rd = (p) => JSON.parse(fs.readFileSync(D(p), 'utf8'))
const rdText = (p) => fs.readFileSync(D(p), 'utf8')

export const countTree = (root) => {
  const walk = (ns) => ns.reduce((s, n) => s + 1 + walk(n.children ?? []), 0)
  return 1 + walk(root.children ?? []) // 含根
}
/** 全树枚举：id / nodeRef / 路径 / 父链 */
export const walkAll = (root) => {
  const out = []
  const w = (ns, parent, p, ancestors) => {
    for (const n of ns) {
      const pp = p + '/' + (n.name ?? '')
      out.push({ node: n, parent, path: pp, ancestors })
      w(n.children ?? [], n, pp, [...ancestors, n])
    }
  }
  w(root.children ?? [], root, '/' + (root.name ?? ''), [])
  return out
}
const nodeById = (root, id) => walkAll(root).find((x) => x.node.id === id)?.node ?? null

export function buildPlan() {
  const pool = rd('data/node-pool.json')
  const tree = rd('data/tree-data.json')
  const edges = rd('data/knowledge-edges.json')

  const problems = []
  const note = (b, msg) => { if (!b) problems.push(msg) }

  const nodes = walkAll(tree)
  const byId = new Map(nodes.map((x) => [x.node.id, x]))

  // ── 前置断言 ──────────────────────────────────────────────────────────
  const parentEntry = byId.get(PARENT_TREE_ID)
  note(!!parentEntry, `父节点 ${PARENT_TREE_ID} 不存在`)
  const parentBefore = parentEntry?.node
  const parentChildrenBefore = (parentBefore?.children ?? []).map((c) => c.id)
  const parentChildNamesBefore = (parentBefore?.children ?? []).map((c) => c.name)
  note(parentBefore && (parentBefore.children ?? []).length === 9,
    `Object.children 应恰为 9 项，实际 ${(parentBefore?.children ?? []).length}`)

  // 每个目标逐项校验
  for (const t of TARGETS) {
    const e = byId.get(t.treeId)
    note(!!e, `目标节点 ${t.treeId}（${t.name}）不在树上`)
    if (!e) continue
    note(e.node.name === t.name, `节点名不符：期望 ${t.name}，实际 ${JSON.stringify(e.node.name)}`)
    note(e.node.nodeRef === t.nodeRef, `nodeRef 不符：期望 ${t.nodeRef}，实际 ${e.node.nodeRef}`)
    note(e.parent?.id === PARENT_TREE_ID, `${t.name} 不是 Object 的直接子节点`)
    note((e.node.children ?? []).length === 0, `⛔ ${t.name} 不是叶子（有 ${(e.node.children ?? []).length} 个子节点）—— 删除会孤儿化后代`)
    note(parentChildrenBefore.includes(t.treeId), `${t.name} 不在 Object.children 里`)
    // 池实体必须在（不动它，但它得存在）
    note(!!pool[t.nodeRef], `池实体 ${t.nodeRef}（${t.name}）不在池中`)
    // 受影响路径（含父链）上不得有 count>0 节点 —— 否则摘除会留下过期徽标
    const badCount = [e, ...e.ancestors.map((a) => ({ node: a }))].filter((x) => typeof x.node?.count === 'number' && x.node.count > 0)
    note(badCount.length === 0, `${t.name} 的父链上存在 count>0 节点：${badCount.map((x) => x.node.name).join(' > ')}`)
  }

  // 保留侧：每个 nodeRef 在树上应恰有 2 处挂载，且**另一处在 常用类库 下**
  const keepSide = {}
  for (const t of TARGETS) {
    const mounts = nodes.filter((x) => x.node.nodeRef === t.nodeRef)
    note(mounts.length === 2, `${t.name} 的挂载点应恰为 2，实际 ${mounts.length}`)
    const others = mounts.filter((x) => x.node.id !== t.treeId)
    note(others.length === 1, `${t.name} 除目标外的挂载应恰为 1，实际 ${others.length}`)
    const kept = others[0]
    note(!!kept && kept.path.includes(KEPT_PATH_MARKER),
      `${t.name} 的保留侧挂载不含「${KEPT_PATH_MARKER}」：${kept?.path}`)
    note(!!kept && kept.node.id !== t.treeId, `${t.name} 保留侧 id 与目标相同`)
    keepSide[t.nodeRef] = kept ? { treeId: kept.node.id, path: kept.path } : null
  }

  // 边：★ 2026-09-16 只读预检实证 —— 这 4 个挂载在**边表里零出现**，本批**没有任何边可删**。
  //   证据（三重互证，见 plan 输出）：
  //     ① 4 个目标 treeId 在整个 knowledge-edges.json 原始文本中出现 0 次（穷尽扫描）
  //     ② Object 的 9 个子节点分成干净两组：前 5 个（Number/Math/类的构造函数/方法/Optional）
  //        各有 1 条 treebind 边且全树挂载数=1；这 4 个 0 条边且全树挂载数=2
  //     ③ 这 4 个实体的 tags 里自带「常用类库」，前 5 个没有
  //   ⇒ 用户蓝图原写「边 4161→4157（−4 treebind 边）」与事实不符；修正口径 = Δ边 0。
  //   本批因此**不触碰 knowledge-edges.json 的语义内容**（但为「可追溯」，仍按惯例一并备份）。
  const eArr = Array.isArray(edges) ? edges : edges.edges
  const edgesRaw = rdText('data/knowledge-edges.json')
  for (const t of TARGETS) {
    note(edgesRaw.split(t.treeId).length - 1 === 0,
      `⛔ 目标 treeId ${t.treeId}（${t.name}）意外出现在边表里 —— 与修正口径（Δ边=0）不符，需重新裁决`)
  }
  note(eArr.filter((e) => e.id === 'treebind:' + PARENT_TREE_ID + ':' + TARGETS[0].treeId).length === 0,
    `⛔ 目标边竟然存在（treebind:Object:${TARGETS[0].treeId}）—— 与修正口径不符`)

  // 保留侧边（必须仍在）：4 条 常用类库 的 treebind 边 + 若干语义边
  const keepEdges = eArr.filter((e) => {
    const s = JSON.stringify(e)
    return TARGETS.some((t) => s.includes(t.nodeRef))
  })
  note(keepEdges.length >= TARGETS.length,
    `提到 4 个目标 nodeRef 的边应 ≥ ${TARGETS.length} 条（保留侧），实际 ${keepEdges.length}`)

  // ── 计划（纯变换） ────────────────────────────────────────────────────
  const treeAfter = JSON.parse(JSON.stringify(tree))
  const parentAfter = nodeById(treeAfter, PARENT_TREE_ID)
  const drop = new Set(TARGET_TREE_IDS)
  parentAfter.children = parentAfter.children.filter((c) => !drop.has(c.id))
  const parentChildrenAfter = parentAfter.children.map((c) => c.id)
  const parentChildNamesAfter = parentAfter.children.map((c) => c.name)

  note(JSON.stringify(parentChildNamesAfter) === JSON.stringify(EXPECTED_PARENT_CHILDREN_AFTER),
    `摘除后 Object.children 名称应是 ${JSON.stringify(EXPECTED_PARENT_CHILDREN_AFTER)}，实际 ${JSON.stringify(parentChildNamesAfter)}`)
  note(JSON.stringify(parentChildrenAfter) === JSON.stringify(parentChildrenBefore.filter((id) => !drop.has(id))),
    `摘除后 Object.children 顺序被改动（应 = 原顺序抽掉目标）`)

  // 修正口径：不删任何边（边表原样保留）
  const edgesAfter = eArr

  return {
    problems,
    before: {
      treeNodes: countTree(tree),
      poolKeys: Object.keys(pool).length,
      edges: eArr.length,
      parentChildren: parentChildrenBefore.length,
      parentChildrenList: parentChildrenBefore,
      parentChildNames: parentChildNamesBefore,
    },
    after: {
      treeNodes: countTree(treeAfter),
      poolKeys: Object.keys(pool).length,
      edges: edgesAfter.length,
      parentChildren: parentChildrenAfter.length,
      parentChildrenList: parentChildrenAfter,
      parentChildNames: parentChildNamesAfter,
    },
    payload: { treeData: treeAfter, edges: edgesAfter },
    keepSide,
    keepEdgeIds: keepEdges.map((e) => e.id),
    parentLabel: parentBefore?.name ?? null,
  }
}

// ── 序列化保真 + 原子写（保留末尾换行） ────────────────────────────────
function serializeFaithfully(relPath, obj) {
  const original = rdText(relPath)
  const trailingNL = original.endsWith('\n')
  const out = JSON.stringify(obj, null, 2) + (trailingNL ? '\n' : '')
  return { out, trailingNL, faithful: out === original }
}
function atomicWrite(relPath, content) {
  const abs = D(relPath)
  const tmp = abs + '.tmp-' + process.pid
  fs.writeFileSync(tmp, content, 'utf8')
  try { fs.renameSync(tmp, abs) } catch {
    // Windows rename EPERM → 退化原地写（项目惯例）
    fs.writeFileSync(abs, content, 'utf8')
    try { fs.unlinkSync(tmp) } catch { /* ignore */ }
  }
}

// ── CLI ────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/apply-java-lib-overlap-b.mjs')
if (isMain) {
  const APPLY = process.argv.includes('--apply')
  const plan = buildPlan()
  console.log('════ JAVA-LIB-OVERLAP-B · ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ════')
  console.log('批次语义 = 卸树留池（只摘树挂载；池与边表零改动）')
  console.log('父节点   =', PARENT_TREE_ID, JSON.stringify(plan.parentLabel))
  console.log('')
  console.log('待卸 4 个挂载：')
  for (const t of TARGETS) console.log('  · ' + t.name.padEnd(14) + t.treeId)
  console.log('保留侧（不动）：')
  for (const t of TARGETS) {
    const k = plan.keepSide[t.nodeRef]
    console.log('  · ' + t.name.padEnd(14) + (k ? k.treeId + '   ' + k.path : '⛔ 缺失'))
  }
  console.log('')
  console.log('Δ 树 : ' + plan.before.treeNodes + ' → ' + plan.after.treeNodes)
  console.log('Δ 池 : ' + plan.before.poolKeys + ' → ' + plan.after.poolKeys + '（本脚本不写 node-pool.json）')
  console.log('Δ 边 : ' + plan.before.edges + ' → ' + plan.after.edges)
  console.log('Δ Object.children : ' + plan.before.parentChildren + ' → ' + plan.after.parentChildren)
  console.log('  之前: ' + plan.before.parentChildNames.join(' | '))
  console.log('  之后: ' + plan.after.parentChildNames.join(' | '))
  console.log('')

  console.log('序列化保真（当前文件往返：原字节 == JSON.stringify(原对象,2)+换行）:')
  for (const f of ['data/tree-data.json', 'data/knowledge-edges.json']) {
    const rt = serializeFaithfully(f, rd(f))
    console.log('  ' + (rt.faithful ? '✅' : '❌') + ' ' + f + '  往返=' + rt.faithful + '  末尾换行=' + rt.trailingNL)
  }
  console.log('')

  if (plan.problems.length) {
    console.log('⛔ 前置断言失败 ' + plan.problems.length + ' 条：')
    for (const p of plan.problems) console.log('   · ' + p)
    process.exit(2)
  }
  console.log('✅ 前置断言全过')

  if (!APPLY) {
    console.log('\n（dry-run 结束，未写盘。要落盘加 --apply）')
    process.exit(0)
  }

  // ── 备份 ──
  const ISO = new Date().toISOString().replace(/[:.]/g, '-')
  const bkRel = 'data/backups/java-lib-overlap-b-' + ISO
  fs.mkdirSync(D(bkRel), { recursive: true })
  const BK_FILES = ['tree-data.json', 'knowledge-edges.json']
  for (const f of BK_FILES) fs.copyFileSync(D('data/' + f), D(bkRel + '/' + f))
  fs.writeFileSync(D(bkRel + '/journal.txt'), [
    '# JAVA-LIB-OVERLAP-B 批前快照',
    'baseline HEAD = ' + (process.env.KO_HEAD || '(未记录)'),
    '树(含根)=' + plan.before.treeNodes + ' · 池=' + plan.before.poolKeys + ' · 边=' + plan.before.edges,
    '卸树留池：摘 ' + TARGET_TREE_IDS.length + ' 个叶子挂载；池零改动；边表零改动（Δ边=0，这 4 处在边表里零出现）',
    '待卸 treeId：', ...TARGET_TREE_IDS.map((t) => '  ' + t),
    '（原蓝图预期的 4 条 treebind 边经穷尽扫描确认不存在：', ...TARGET_EDGE_IDS.map((t) => '    ' + t), '）',
    '', '备份文件 md5：',
    ...BK_FILES.map((f) => '  ' + f + '  ' + createHash('md5').update(fs.readFileSync(D(bkRel + '/' + f))).digest('hex')),
  ].join('\n') + '\n', 'utf8')
  console.log('\n备份 →', bkRel)

  // ── 写盘（★ 只写 tree-data.json：修正口径下边表零改动，连"重写一遍"都不做） ──
  const edgesBytesBefore = fs.readFileSync(D('data/knowledge-edges.json'))
  for (const [f, next] of [
    ['data/tree-data.json', plan.payload.treeData],
  ]) {
    const { out, trailingNL } = serializeFaithfully(f, next)
    atomicWrite(f, out)
    console.log('  写入', f, out.length, 'B  末尾换行=' + trailingNL)
  }
  console.log('  未写 data/knowledge-edges.json（Δ边 = 0）；未写 data/node-pool.json（卸树留池）')

  // ── 落盘后自检 ──
  const tree2 = rd('data/tree-data.json'), edges2 = rd('data/knowledge-edges.json')
  const eArr2 = Array.isArray(edges2) ? edges2 : edges2.edges
  const nodes2 = walkAll(tree2)
  const checks = []
  const ck = (name, cond, extra = '') => checks.push({ name, ok: !!cond, extra })

  ck('树(含根) = before − 4', countTree(tree2) === plan.before.treeNodes - 4, String(countTree(tree2)))
  for (const t of TARGETS) ck('树上已无 ' + t.name + ' 的该类挂载', !nodes2.some((x) => x.node.id === t.treeId))
  ck('池文件未被本脚本触碰（存在且计数不变）',
    Object.keys(rd('data/node-pool.json')).length === plan.before.poolKeys, String(plan.before.poolKeys))
  const pAfter2 = nodes2.find((x) => x.node.id === PARENT_TREE_ID)?.node
  ck('Object.children = 原顺序抽掉 4 项',
    !!pAfter2 && JSON.stringify(pAfter2.children.map((c) => c.id)) === JSON.stringify(plan.after.parentChildrenList),
    pAfter2 ? pAfter2.children.map((c) => c.name).join(' | ') : '父节点未找到')
  ck('Object.children 名称 = ' + JSON.stringify(EXPECTED_PARENT_CHILDREN_AFTER),
    !!pAfter2 && JSON.stringify(pAfter2.children.map((c) => c.name)) === JSON.stringify(EXPECTED_PARENT_CHILDREN_AFTER))
  for (const t of TARGETS) {
    const mounts = nodes2.filter((x) => x.node.nodeRef === t.nodeRef)
    const kept = mounts[0]
    ck('保留侧仍在（' + t.name + ' → ' + KEPT_PATH_MARKER + '）',
      mounts.length === 1 && !!kept && kept.path.includes(KEPT_PATH_MARKER),
      mounts.length ? kept.path : '⛔ 无挂载')
  }
  ck('边表**逐字节未被改动**（Δ边 = 0）',
    Buffer.compare(fs.readFileSync(D('data/knowledge-edges.json')), edgesBytesBefore) === 0,
    String(eArr2.length) + ' 条')
  ck('其余边逐条不变（含顺序）',
    JSON.stringify(eArr2) === JSON.stringify(plan.payload.edges))

  console.log('\n落盘后自检：')
  for (const c of checks) console.log('  ' + (c.ok ? '✅' : '❌') + ' ' + c.name + (c.extra ? '  ' + c.extra : ''))
  const bad = checks.filter((c) => !c.ok)
  console.log(bad.length ? `\n⛔ ${bad.length} 项自检失败` : '\n✅ 全部自检通过')
  process.exit(bad.length ? 1 : 0)
}
