/**
 * JAVA-LIB-OVERLAP-A · 合并并删除 `类/java.lang/Object/Files` 旧实体
 *
 * 动作（用户裁决 2026-09-16）：
 *   ① 把旧实体 k_1785378637961_iecl2a 唯一独有的 `bestPractices` tab
 *      **逐字节**搬到 k_java_nio_file_files（java.nio.file.Files）的 tabs 末尾
 *   ② 删除旧池实体 k_1785378637961_iecl2a
 *   ③ 从 java/类/java.lang/Object 的 children 摘掉 Files 节点（tree_1785378638150_sai7z9）
 *   ④ 删除对应 treebind 边
 *   ⑤ 不动 java.nio.file.Files 已有的 31 个 tab（含 29 个方法 tab）
 *
 * 用法：
 *   node scripts/apply-java-overlap-a.mjs            # dry-run（默认，不写盘）
 *   node scripts/apply-java-overlap-a.mjs --apply     # 实跑
 *
 * 设计纪律（沿项目惯例）：
 *   · buildPlan() 是纯函数，预检与实跑共用同一份计划 —— 不写两套逻辑
 *   · 落盘前备份到 data/backups/java-overlap-a-<ISO>/
 *   · 原子写（tmp + rename），**保留末尾换行**（不用 writeJsonAtomic，它会丢换行）
 *   · 自检：「差异精确实体集合」+「tabs 自洽」+「新 tab 逐字节等于源」+「父 children 顺序不变」
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const ROOT = process.cwd()
const D = (p) => path.join(ROOT, p)

export const A_ID = 'k_1785378637961_iecl2a'          // 待删的旧 Files 实体
export const B_ID = 'k_java_nio_file_files'           // 承接方：java.nio.file.Files
export const A_TREE_ID = 'tree_1785378638150_sai7z9'  // 树上那个 Files 节点
export const PARENT_TREE_ID = 'tree_java_source_020f0cac60da5755_s_type_a6b9e05051861242' // Object 节点（本挂载处的 treeId）
export const EDGE_ID = 'treebind:' + PARENT_TREE_ID + ':' + A_TREE_ID
export const MOVED_TAB_ID = 'bestPractices'
export const SOURCE_TAB_MD5_EXPECTED = '9de89c83fa4c03cab1d93e2a1ff255c5'

const md5 = (s) => createHash('md5').update(s).digest('hex')
const rd = (p) => JSON.parse(fs.readFileSync(D(p), 'utf8'))
const rdText = (p) => fs.readFileSync(D(p), 'utf8')

const countTree = (root) => {
  const walk = (ns) => ns.reduce((s, n) => s + 1 + walk(n.children ?? []), 0)
  return 1 + walk(root.children ?? []) // 含根
}
const findMounts = (root, nodeRef) => {
  const out = []
  const walk = (ns, parent, pathStr) => {
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i]
      const p = pathStr + '/' + (n.name ?? '')
      if (n.nodeRef === nodeRef) out.push({ node: n, parent, index: i, path: p })
      walk(n.children ?? [], n, p)
    }
  }
  walk(root.children ?? [], root, '/' + (root.name ?? ''))
  return out
}

export function buildPlan() {
  const pool = rd('data/node-pool.json')
  const tree = rd('data/tree-data.json')
  const edges = rd('data/knowledge-edges.json')

  const problems = []
  const note = (b, msg) => { if (!b) problems.push(msg) }

  // ── 前置断言（任何一条不满足就不许写） ────────────────────────────────
  note(!!pool[A_ID], `旧实体 ${A_ID} 不在池中`)
  note(!!pool[B_ID], `承接方 ${B_ID} 不在池中`)
  const a = pool[A_ID]
  const b = pool[B_ID]

  const srcTab = a?.card?.tabs?.find((t) => t.id === MOVED_TAB_ID)
  note(!!srcTab, `旧实体里找不到 ${MOVED_TAB_ID} tab`)
  note(srcTab && md5(srcTab.content) === SOURCE_TAB_MD5_EXPECTED,
    `${MOVED_TAB_ID} 内容 md5 与预期不符（可能已被外部改动）`)
  note(!!b && !b.card.tabs.some((t) => t.id === MOVED_TAB_ID),
    `承接方已经存在 ${MOVED_TAB_ID} tab（会覆盖）`)

  const mounts = findMounts(tree, A_ID)
  note(mounts.length === 1, `旧实体在树上的挂载点应恰为 1，实际 ${mounts.length}`)
  const mount = mounts[0]
  note(mount && mount.node.id === A_TREE_ID, `树上节点 id 与预期不符`)
  note(mount && mount.parent.id === PARENT_TREE_ID, `父节点 id 与预期不符`)
  note(mount && (mount.node.children ?? []).length === 0, `待摘节点不是叶子，有子节点`)

  const relEdges = edges.filter((e) => e.source === A_ID || e.target === A_ID)
  note(relEdges.length === 1, `涉及旧实体的边应恰为 1 条，实际 ${relEdges.length}`)
  const edge = relEdges[0]
  note(edge && edge.id === EDGE_ID, `边 id 与预期不符：${edge?.id}`)

  // 引用面：除自身外不得有别的实体/文本提到 A
  const otherRefs = Object.entries(pool)
    .filter(([k, v]) => k !== A_ID && JSON.stringify(v).includes(A_ID)).map(([k]) => k)
  note(otherRefs.length === 0, `其他池实体引用了 ${A_ID}：${otherRefs.join(', ')}`)

  // ── 计划（纯数据变换，不动原件） ────────────────────────────────────
  const poolAfter = JSON.parse(JSON.stringify(pool))
  const newTab = JSON.parse(JSON.stringify(srcTab))
  const bTabsBefore = b.card.tabs.map((t) => t.id)
  poolAfter[B_ID].card.tabs = [...b.card.tabs.map((t) => JSON.parse(JSON.stringify(t))), newTab]
  delete poolAfter[A_ID]

  const treeAfter = JSON.parse(JSON.stringify(tree))
  const parentAfter = findMounts(treeAfter, A_ID)[0]?.parent
  const parentChildrenBefore = mount.parent.children.map((c) => c.id)
  if (parentAfter) parentAfter.children = parentAfter.children.filter((c) => c.id !== A_TREE_ID)
  const parentChildrenAfter = parentAfter?.children.map((c) => c.id) ?? []

  const edgesAfter = edges.filter((e) => e.id !== EDGE_ID)

  return {
    problems,
    before: {
      treeNodes: countTree(tree),
      poolKeys: Object.keys(pool).length,
      edges: edges.length,
      bTabs: bTabsBefore.length,
      bTabsList: bTabsBefore,
      parentChildren: parentChildrenBefore.length,
      parentChildrenList: parentChildrenBefore,
    },
    after: {
      treeNodes: countTree(treeAfter),
      poolKeys: Object.keys(poolAfter).length,
      edges: edgesAfter.length,
      bTabs: poolAfter[B_ID].card.tabs.length,
      bTabsList: poolAfter[B_ID].card.tabs.map((t) => t.id),
      parentChildren: parentChildrenAfter.length,
      parentChildrenList: parentChildrenAfter,
    },
    payload: { nodePool: poolAfter, treeData: treeAfter, edges: edgesAfter },
    movedTab: newTab,
    A: a, B: b,
    mountPath: mount?.path ?? null,
    edge,
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
  try { fs.renameSync(tmp, abs) } catch (e) {
    // Windows rename EPERM → 退化原地写（项目惯例）
    fs.writeFileSync(abs, content, 'utf8')
    try { fs.unlinkSync(tmp) } catch { /* ignore */ }
  }
}

// ── CLI ────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/apply-java-overlap-a.mjs')
if (isMain) {
  const APPLY = process.argv.includes('--apply')
  const plan = buildPlan()
  console.log('════ JAVA-LIB-OVERLAP-A · ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ════')
  console.log('旧实体 A =', A_ID, JSON.stringify(plan.A?.label))
  console.log('承接方 B =', B_ID, JSON.stringify(plan.B?.label))
  console.log('挂载路径 =', plan.mountPath)
  console.log('待删边   =', plan.edge?.id)
  console.log('')
  console.log('Δ 树 :', plan.before.treeNodes, '→', plan.after.treeNodes)
  console.log('Δ 池 :', plan.before.poolKeys, '→', plan.after.poolKeys)
  console.log('Δ 边 :', plan.before.edges, '→', plan.after.edges)
  console.log('Δ B.tabs :', plan.before.bTabs, '→', plan.after.bTabs, '（追加', MOVED_TAB_ID, '）')
  console.log('Δ Object.children :', plan.before.parentChildren, '→', plan.after.parentChildren)
  console.log('  之前:', plan.before.parentChildrenList.join(' | '))
  console.log('  之后:', plan.after.parentChildrenList.join(' | '))
  console.log('')

  // 序列化保真：只对「当前文件」做往返校验（原字节 == JSON.stringify(原对象,2)+换行）。
  // ⚠️ 不能拿「改后内容」去比「改前文件」—— 那必然不等，是逻辑错（本脚本首版踩过）。
  console.log('序列化保真（当前文件往返：原字节 == JSON.stringify(原对象,2)+换行）:')
  const targetOf = (f) => (f.includes('node-pool') ? plan.payload.nodePool : f.includes('tree-data') ? plan.payload.treeData : plan.payload.edges)
  for (const f of ['data/node-pool.json', 'data/tree-data.json', 'data/knowledge-edges.json']) {
    const cur = rd(f)
    const rt = serializeFaithfully(f, cur)
    const after = JSON.stringify(targetOf(f), null, 2)
    console.log('  ' + (rt.faithful ? '✅' : '❌') + ' ' + f +
      '  往返=' + rt.faithful + '  末尾换行=' + rt.trailingNL +
      '  改后字节=' + (after.length + (rt.trailingNL ? 1 : 0)))
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
  const bkRel = 'data/backups/java-overlap-a-' + ISO
  fs.mkdirSync(D(bkRel), { recursive: true })
  for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) {
    fs.copyFileSync(D('data/' + f), D(bkRel + '/' + f))
  }
  fs.writeFileSync(D(bkRel + '/journal.txt'), [
    '# JAVA-LIB-OVERLAP-A 批前快照',
    'baseline HEAD = ' + (process.env.KO_HEAD || '(未记录)'),
    '池 keys=' + plan.before.poolKeys + ' · 树(含根)=' + plan.before.treeNodes + ' · 边=' + plan.before.edges,
    'A=' + A_ID + '（删） B=' + B_ID + '（+' + MOVED_TAB_ID + '）',
    '搬运 tab md5 = ' + md5(plan.movedTab.content),
    '', '四文件 md5：',
    ...['node-pool.json', 'tree-data.json', 'knowledge-edges.json'].map((f) => '  ' + f + '  ' + md5(fs.readFileSync(D(bkRel + '/' + f)))),
  ].join('\n') + '\n', 'utf8')
  console.log('\n备份 →', bkRel)

  // ── 写盘 ──
  for (const [f, next] of [
    ['data/node-pool.json', plan.payload.nodePool],
    ['data/tree-data.json', plan.payload.treeData],
    ['data/knowledge-edges.json', plan.payload.edges],
  ]) {
    const { out, trailingNL } = serializeFaithfully(f, next)
    atomicWrite(f, out)
    console.log('  写入', f, out.length, 'B  末尾换行=' + trailingNL)
  }

  // ── 落盘后自检 ──
  const pool2 = rd('data/node-pool.json'), tree2 = rd('data/tree-data.json'), edges2 = rd('data/knowledge-edges.json')
  const checks = []
  const ck = (name, cond, extra = '') => { checks.push({ name, ok: !!cond, extra }) }
  ck('池 keys = before-1', Object.keys(pool2).length === plan.before.poolKeys - 1)
  ck('旧实体已删除', !pool2[A_ID])
  ck('承接方 tabs = before+1', pool2[B_ID].card.tabs.length === plan.before.bTabs + 1)
  const moved = pool2[B_ID].card.tabs[pool2[B_ID].card.tabs.length - 1]
  ck('搬运 tab 逐字节等于源', moved.content === plan.movedTab.content && moved.id === MOVED_TAB_ID && moved.label === plan.movedTab.label,
    'md5=' + md5(moved.content))
  ck('B 原有 tabs 顺序/内容不变',
    JSON.stringify(pool2[B_ID].card.tabs.slice(0, -1)) === JSON.stringify(plan.B.card.tabs))
  ck('池其余实体 0 漂移',
    Object.keys(pool2).filter((k) => k !== B_ID).every((k) => JSON.stringify(pool2[k]) === JSON.stringify(plan.payload.nodePool[k])) &&
    Object.keys(plan.payload.nodePool).filter((k) => k !== B_ID).length === Object.keys(pool2).length - 1)
  ck('树(含根) = before-1', countTree(tree2) === plan.before.treeNodes - 1)
  ck('树上已无该节点', findMounts(tree2, A_ID).length === 0)
  const nodeByIdAfter = (root, want) => {
    let hit = null
    const walk = (ns) => { for (const n of ns) { if (n.id === want) hit = n; walk(n.children ?? []) } }
    walk(root.children ?? [])
    return hit
  }
  const objAfter2 = nodeByIdAfter(tree2, PARENT_TREE_ID)
  ck('父 children 顺序 = 原顺序抽掉目标',
    !!objAfter2 && JSON.stringify(objAfter2.children.map((c) => c.id)) === JSON.stringify(plan.after.parentChildrenList),
    objAfter2 ? 'children=' + objAfter2.children.length : '父节点未找到')
  ck('边 = before-1', edges2.length === plan.before.edges - 1)
  ck('目标边已删', !edges2.some((e) => e.id === EDGE_ID))
  ck('其余边逐条不变（含顺序）', JSON.stringify(edges2) === JSON.stringify(plan.payload.edges))

  console.log('\n落盘后自检：')
  for (const c of checks) console.log('  ' + (c.ok ? '✅' : '❌') + ' ' + c.name + (c.extra ? '  ' + c.extra : ''))
  const bad = checks.filter((c) => !c.ok)
  console.log(bad.length ? `\n⛔ ${bad.length} 项自检失败` : '\n✅ 全部自检通过')
  process.exit(bad.length ? 1 : 0)
}
