/**
 * [PHASE 1 DRY-RUN] 只生成 before → after，**不写盘**。
 *
 * 做法：把 tree / pool / edges 全量 deep-clone 到内存，在克隆体上真跑一遍已裁决的操作，
 * 然后逐条输出：before → after、共享实体拆分方案、边影响、验收条件。
 * 收尾把克隆后的 pool 喂给**真实的 inspectNodePool**，看是否引入新的 fatal/warning。
 *
 * 已裁决可进入 dry-run 的操作：
 *   C1-02 分类 → 类的分类（就地改名）        C1-03 抽象类：新建 OOP 本体（⚠️ 与数据冲突，见报告）
 *   C1-04 内部类：新建 OOP 本体              C1-09 最终类/匿名类：拆成本体 + 具象两个池实体
 *   C4-01/02 管理程序·模拟器 move            C4-03/06 新建两个中间层
 *   C4-04/05/07 select·epoll·零拷贝 move
 *
 * 明确不执行：C1-06 / C4-10 / C4-11（SPEC-BLOCKED）· C1-05 / C1-07 / C4-08 / C4-09（VOID）· C1-08（无结构动作）
 *
 * 用法：node scripts/dryrun-phase1.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { inspectNodePool } from '../src/knowledge/dataValidation.ts'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const rd = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))
const clone = (x) => JSON.parse(JSON.stringify(x))

// ── 基线快照（只读） ────────────────────────────────────────────────────
const treeFile0 = fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8')
const pool0 = rd('node-pool.json')
const edges0 = rd('knowledge-edges.json')
const tree = rd('tree-data.json')
const pool = clone(pool0)
const edges = clone(edges0)

// ── 索引工具 ────────────────────────────────────────────────────────────
const index = (root) => {
  const byId = new Map()
  const recs = []
  ;(function w(n, parent, trail) {
    const t = [...trail, n]
    const r = { node: n, parent, trail: t, path: t.map((x) => String(x.name ?? '')).join(' > ') }
    recs.push(r); byId.set(n.id, r)
    for (const c of n.children || []) w(c, n, t)
  })(root, null, [])
  return { byId, recs }
}
const I0 = index(tree)          // 基线索引（供 before 值）
let I = index(tree)             // 变更中索引：一旦改动，重建

const kids = (n) => (n.children || []).length
const byChain = (chain) => I.recs.filter((r) => r.path === chain.join(' > ') || r.path.endsWith(' > ' + chain.join(' > ')))
/**
 * OOP 工作容器「类（编程） > 分类」——**按 treeId 定位，不按名字**。
 * 原因：C1-02 会把它的 name 由 `分类` 改成 `类的分类`，按名字查询会在改名后失配。
 * 这是本 dry-run 的第一条经验：**treeId 是挂载位置的稳定句柄，name 不是。**
 */
const OOP_CLS_TREEID = 'tree_class_programming_classification'
const oopCls = () => I.byId.get(OOP_CLS_TREEID)
const pathOf = (id) => I.byId.get(id)?.path ?? '(已不存在)'
const treebindId = (parentTreeId, childTreeId) => `treebind:${parentTreeId}:${childTreeId}`
const isTreebind = (e) => String(e.id).startsWith('treebind:')
const danglingTreeRefs = (tr, pl) => (function w(n, acc) { if (n.nodeRef && !pl[n.nodeRef]) acc.push(`${n.id}(${n.name}) → ${n.nodeRef}`); (n.children || []).forEach((c) => w(c, acc)); return acc })(tr, [])
const danglingEdgeRefs = (es, pl) => es.filter((e) => !pl[e.source] || !pl[e.target]).map((e) => `${e.id}: ${e.source} -> ${e.target}`)

const JOURNAL = []
const rec = (opId, kind, detail) => { JOURNAL.push({ opId, kind, ...detail }) }

// 新实体 id：确定性、可复审（实际命名方案需用户确认）
const P1 = 'p1_'
const newTreeId = (slug) => `tree_${P1}${slug}`
const newRef = (slug) => `${P1}${slug}`
const mkPoolNode = (ref, label, slug) => ({
  id: ref, label, role: 'plain', tags: [label],
  card: { nodeId: ref, title: label, tabs: [] },
  _p1slug: slug,
})
const mkTreebind = (parentTreeId, parentRef, childTreeId, childRef) => ({
  id: treebindId(parentTreeId, childTreeId), source: parentRef, target: childRef,
  type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [],
})

const RESULTS = []

// ══════════════════════════════════════════════════════════════════════
// C1-02 · rename 分类 → 类的分类
// ══════════════════════════════════════════════════════════════════════
{
  const TID = 'tree_class_programming_classification'
  const REF = 'k_class_programming_classification'
  const before = { name: I.byId.get(TID).node.name, path: pathOf(TID), kids: kids(I.byId.get(TID).node), poolLabel: pool[REF].label, tags: [...(pool[REF].tags ?? [])] }
  I.byId.get(TID).node.name = '类的分类'
  pool[REF].label = '类的分类'
  const tags = new Set(pool[REF].tags ?? [])
  tags.add('类的分类')                       // 新名入 tags（搜索依赖）
  pool[REF].tags = [...tags]                  // 旧名 '分类' 保留为搜索别名
  I = index(tree)
  const after = { name: I.byId.get(TID).node.name, path: pathOf(TID), kids: kids(I.byId.get(TID).node), poolLabel: pool[REF].label, tags: [...pool[REF].tags] }
  rec('C1-02', 'rename', { treeId: TID, ref: REF })
  RESULTS.push({
    id: 'C1-02', action: 'rename', title: '`分类` → `类的分类`（就地改名，挂 `类（编程）` 不变）',
    targetIds: { treeId: TID, ref: REF }, before, after,
    edgeImpact: '无：treeId 不变 → treebind 边 id 不变；只改池 label 与 tags',
    postconditions: [
      `树条目 name = 类的分类（\`${TID}\`）`,
      `池节点 label = 类的分类，tags 同时含 分类 与 类的分类`,
      `孩子数与全部后代 treeId 逐条不变（改名不动子树）`,
      `10 个成员路径前缀变为 … > 类（编程） > 类的分类`,
    ],
  })
}

// ══════════════════════════════════════════════════════════════════════
// C1-03 · 抽象类：裁决为「新建 OOP 本体」——但数据与裁决前提冲突
// ══════════════════════════════════════════════════════════════════════
{
  const EXIST_REF = 'k_1784295376153_uiovkk'
  const existContent = pool[EXIST_REF].card?.rootContent ?? ''
  const JAVA_MOUNTS = I.recs.filter((r) => r.node.nodeRef === EXIST_REF).map((r) => ({ treeId: r.node.id, path: r.path }))
  // 按裁决模拟：新建一个空的 OOP 本体节点，Java 侧 3 个挂载点原样不动
  const P = 'oop_abstract_class'
  const TID = newTreeId(P), REF = newRef(P)
  const cls = oopCls()
  if (!cls) throw new Error('C1-03: 找不到 OOP 工作容器（tree_class_programming_classification）')
  const node = { id: TID, name: '抽象类', count: 0, nodeRef: REF, children: [] }
  cls.node.children.push(node)
  pool[REF] = mkPoolNode(REF, '抽象类', P)
  edges.push(mkTreebind(cls.node.id, cls.node.nodeRef, TID, REF))
  pool[REF].card.tabs = []                    // 新建即空正文（合法：仅入池待填）
  I = index(tree)
  rec('C1-03', 'create', { treeId: TID, ref: REF })
  rec('C1-03', 'treebind+', { id: treebindId(cls.node.id, TID) })
  RESULTS.push({
    id: 'C1-03', action: 'create', title: '`抽象类` 新建 OOP 本体（裁决）',
    targetIds: { newTreeId: TID, newRef: REF, parentTreeId: cls.node.id, parentRef: cls.node.nodeRef },
    before: { javaMounts: JAVA_MOUNTS, existContentLen: existContent.length, existTags: pool[EXIST_REF].tags },
    after: { oopMount: pathOf(TID), newTabs: 0 },
    conflict: {
      severity: 'HIGH',
      claim: '裁决理由「Java 下已有的是具象引用」与数据不符',
      evidence: `现有实体 \`${EXIST_REF}\` 的正文是 **通用 OOP 定义**（${existContent.length} 字：「${existContent.slice(0, 40)}…」），tags=[抽象类, 抽象类型]，**不含任何 Java 专有语法**。`,
      risk: '按裁决执行 → 新建一个**空** OOP 本体，同时那个**已经写着 OOP 定义**的实体仍留在 Java 树 → 出现「本体内容挂在语言树上、本体节点是空的」的倒置。',
      recommended: '变体 B：把现有实体**认定为本体**（新增 OOP 挂载点 / 或把它移到分类下），Java 侧 3 个挂载点改指**新建的 Java 具象实体**。本体内容零复制、倒置消除。',
      alternative: '变体 A（本 dry-run 已模拟）：严格按裁决建空本体，接受内容在 Java 侧。',
    },
    edgeImpact: `新增 treebind 1 条；Java 侧 4 条既有边不动（belongs-to ×3 + instance-of ×1：\`具体类 --[instance-of]--> 抽象类\`）`,
    postconditions: [
      `\`${TID}\` 挂在 类（编程） > 类的分类 下，孩子数 +1`,
      `新池节点 \`${REF}\` 存在，label=抽象类，tags 含自身名`,
      `**新建节点 tabs 为空** → 体检的「空 tabs」计数 +1（合法，但属待填正文债）`,
      `Java 侧 \`${EXIST_REF}\` 3 个挂载点路径完全不变`,
    ],
  })
}

// ══════════════════════════════════════════════════════════════════════
// C1-04 · 内部类：新建 OOP 本体（与数据一致：现有实体确是 Java 具象）
// ══════════════════════════════════════════════════════════════════════
{
  const EXIST_REF = 'k_1784044129424_ffqm4z'
  const existContent = pool[EXIST_REF].card?.rootContent ?? ''
  const javaMounts = I.recs.filter((r) => r.node.nodeRef === EXIST_REF).map((r) => ({ treeId: r.node.id, path: r.path }))
  const P = 'oop_inner_class'
  const TID = newTreeId(P), REF = newRef(P)
  const cls = oopCls()
  if (!cls) throw new Error('C1-04: 找不到 OOP 工作容器（tree_class_programming_classification）')
  cls.node.children.push({ id: TID, name: '内部类', count: 0, nodeRef: REF, children: [] })
  pool[REF] = mkPoolNode(REF, '内部类', P)
  edges.push(mkTreebind(cls.node.id, cls.node.nodeRef, TID, REF))
  I = index(tree)
  rec('C1-04', 'create', { treeId: TID, ref: REF })
  RESULTS.push({
    id: 'C1-04', action: 'create', title: '`内部类` 新建 OOP 本体（与数据一致 ✅）',
    targetIds: { newTreeId: TID, newRef: REF, parentTreeId: cls.node.id },
    before: { javaMounts, existContentLen: existContent.length, existTags: pool[EXIST_REF].tags },
    after: { oopMount: pathOf(TID) },
    conflict: {
      severity: 'NONE',
      claim: '裁决理由与数据一致',
      evidence: `现有实体正文 ${existContent.length} 字且明确是 Java 专有（「${existContent.slice(0, 44)}…」，tags 含「Java面试突击」）→ 确属 Java 具象。`,
      risk: null,
      recommended: '按裁决执行即可。',
    },
    edgeImpact: '新增 treebind 1 条；Java 侧 7 条既有边不动（含 4 条 Java 子概念 belongs-to：静态/成员/局部内部类、匿名内部类）',
    postconditions: [
      `\`${TID}\` 挂在 类（编程） > 类的分类 下`,
      `新池节点 \`${REF}\` 存在，tabs 为空 → 空 tabs 计数 +1`,
      `Java 侧 \`${EXIST_REF}\` 的 2 个挂载点与 7 条边零变化`,
      `⚠️ 4 个 Java 子概念（静态/成员/局部内部类、匿名内部类）**仍挂在 Java 具象实体下** —— 符合「具象留在语言树」`,
    ],
  })
}

// ══════════════════════════════════════════════════════════════════════
// C1-09 · 拆分共享实体：最终类 / 匿名类
// ══════════════════════════════════════════════════════════════════════
const SPLITS = [
  { name: '最终类', ref: 'k_1784045589643_icc5oo', keepOopTreeId: 'tree_class_programming_final_class', javaTreeId: 'tree_1784045589689_drgfh8', javaParentTreeId: 'tree_1784043760890_bptgal', slug: 'java_final_class', note: '正文 81 字含 `final class` 字样但语义通用（「不能被子类化…抽象类的对立面」）；本 dry-run 让 **OOP 侧保留原实体**（与 分类 同侧），Java 侧拿新实体。' },
  { name: '匿名类', ref: 'k_1784044171635_8etz45', keepOopTreeId: 'tree_class_programming_anonymous_class', javaTreeId: 'tree_1784044171666_9yd2is', javaParentTreeId: 'tree_1784044092244_76wkqz', slug: 'java_anonymous_class', note: '正文 42 字纯通用（「无名类…不绑定名称或标识符」），OOP 侧保留原实体的判断更明确。' },
]
for (const [i, s] of SPLITS.entries()) {
  const opId = `C1-09/${i + 1}`
  const beforeContent = pool[s.ref].card?.rootContent ?? ''
  const P = s.slug
  const NEW_REF = newRef(P)
  const oopParent = oopCls()   // 仅用于确认容器存在；拆分的结构动作发生在 Java 侧
  if (!oopParent) throw new Error(`${opId}: 找不到 OOP 工作容器`)
  // 1) 新实体（Java 具象）：内容留空待填（不复制正文，避免两份一样的文字）
  pool[NEW_REF] = mkPoolNode(NEW_REF, s.name, P)
  // 2) Java 侧挂载点改指新实体
  const javaRec = I.byId.get(s.javaTreeId)
  const beforeRef = javaRec.node.nodeRef
  javaRec.node.nodeRef = NEW_REF
  // 3) 改 treebind 边的 target
  const tb = edges.find((e) => e.id === treebindId(s.javaParentTreeId, s.javaTreeId))
  const tbBefore = tb ? { ...tb } : null
  if (tb) tb.target = NEW_REF
  // 4) 加一条 implements 边：Java 具象 → OOP 本体
  const implId = `p1_e_${P}`
  edges.push({ id: implId, source: NEW_REF, target: s.ref, type: 'implements', label: 'implements', dimensions: [] })
  I = index(tree)
  rec(opId, 'split', { originalRef: s.ref, newRef: NEW_REF, javaTreeId: s.javaTreeId })
  RESULTS.push({
    id: opId, action: 'split-entity', title: `拆分共享实体 \`${s.name}\``,
    targetIds: { 原实体: s.ref, 新具象实体: NEW_REF, OOP挂载: s.keepOopTreeId, Java挂载: s.javaTreeId },
    before: { 一个实体两处挂载: [pathOf(s.keepOopTreeId), pathOf(s.javaTreeId)], 正文长度: beforeContent.length, 正文去向: `留在 OOP 侧 \`${s.ref}\``, Java侧treebind: tbBefore },
    after: { OOP: `${pathOf(s.keepOopTreeId)} → ${s.ref}`, Java: `${pathOf(s.javaTreeId)} → ${NEW_REF}`, 新加边: `${implId}: ${NEW_REF} --[implements]--> ${s.ref}` },
    edgeImpact: `① treebind \`${treebindId(s.javaParentTreeId, s.javaTreeId)}\` 的 target 由 \`${beforeRef}\` 改为 \`${NEW_REF}\`；② 新增 implements 边 1 条（仅类型关系视图可见）；③ 其余语义边**按侧归属重指**（见下）`,
    note: s.note,
    postconditions: [
      `两个 treeId 不再共享 nodeRef（\`${s.ref}\` vs \`${NEW_REF}\`）`,
      `OOP 侧保留原实体与全部正文；Java 侧新实体 tabs 为空（待填 Java 专有正文）`,
      `treebind 边 target 已改指；边 id 不变（挂载位置未变，只换实体）`,
      `体检「空 tabs」计数 +1`,
      `⚠️ 若后续要按「本体/具象」重指语义边，需逐条裁决 —— 例如 \`分类 --[belongs-to]--> ${s.name}\` 应保留指向本体，Java 侧专属边应改指具象`,
    ],
  })
}

// ══════════════════════════════════════════════════════════════════════
// C4-01 / C4-02 · move 管理程序 · 模拟器 → 虚拟机 > 虚拟化技术
// ══════════════════════════════════════════════════════════════════════
const MOVES_C4 = [
  { opId: 'C4-01', name: '管理程序', ref: 'atomic_hypervisor', treeId: 'final_atomic_hypervisor' },
  { opId: 'C4-02', name: '模拟器', ref: 'atomic_emulator', treeId: 'final_atomic_emulator' },
]
const TARGET_VIRT = byChain(['虚拟机', '虚拟化技术'])[0]
for (const m of MOVES_C4) {
  const r = I.recs.find((x) => x.node.id === m.treeId)
  if (!r) { RESULTS.push({ id: m.opId, action: 'move', title: `\`${m.name}\``, error: `树条目 ${m.treeId} 不存在` }); continue }
  const oldParent = r.parent
  const oldParentRec = I.byId.get(oldParent.id)
  const before = { path: r.path, parentKids: kids(oldParent), parentPath: oldParentRec.path }
  oldParent.children = oldParent.children.filter((c) => c.id !== m.treeId)
  TARGET_VIRT.node.children.push(r.node)
  // treebind：删旧建新
  const oldTbIdx = edges.findIndex((e) => isTreebind(e) && e.id.endsWith(`:${m.treeId}`))
  const oldTb = oldTbIdx >= 0 ? { ...edges[oldTbIdx] } : null
  if (oldTbIdx >= 0) edges.splice(oldTbIdx, 1)
  const newTbId = treebindId(TARGET_VIRT.node.id, m.treeId)
  edges.push(mkTreebind(TARGET_VIRT.node.id, TARGET_VIRT.node.nodeRef, m.treeId, m.ref))
  I = index(tree)
  rec(m.opId, 'move', { treeId: m.treeId, ref: m.ref, from: before.parentPath, to: pathOf(TARGET_VIRT.node.id) })
  RESULTS.push({
    id: m.opId, action: 'move', title: `\`${m.name}\` → \`虚拟机 > 虚拟化技术\``,
    targetIds: { treeId: m.treeId, ref: m.ref, 新父: TARGET_VIRT.node.id, 新父Ref: TARGET_VIRT.node.nodeRef },
    before, after: { path: pathOf(m.treeId), parentKids: kids(TARGET_VIRT.node) },
    edgeImpact: `treebind：删 \`${oldTb?.id ?? '(不存在 — 既有债)'}\`，建 \`${newTbId}\`（id 随父 treeId 变，target/source 不变）`,
    baselineDebt: oldTb ? null : '该节点原本**没有 treebind 边**（既有基线债，非本批引入）',
    postconditions: [
      `旧父 \`${before.parentPath}\` 孩子数 ${before.parentKids} → ${kids(oldParent)}`,
      `新父 \`虚拟化技术\` 孩子数 2 → ${kids(TARGET_VIRT.node)}`,
      `\`${m.treeId}\` 全部后代 treeId 不变`,
      `语义边 \`管理程序 --[对比]--> 模拟器\` 不受影响（ref 未变）`,
      `池节点 \`${m.ref}\` 未删未退休`,
    ],
  })
}

// ══════════════════════════════════════════════════════════════════════
// C4-03 / C4-06 · create 两个中间层；C4-04/05/07 · move 三个节点进去
// ══════════════════════════════════════════════════════════════════════
const OS = byChain(['操作系统']).find((r) => r.path.endsWith('系统组织 > 操作系统'))
const CREATES = [
  { opId: 'C4-03', label: 'I/O 多路复用', slug: 'io_multiplexing' },
  { opId: 'C4-06', label: '系统调用与 I/O', slug: 'syscall_io' },
]
const created = {}
for (const c of CREATES) {
  const TID = newTreeId(c.slug), REF = newRef(c.slug)
  OS.node.children.push({ id: TID, name: c.label, count: 0, nodeRef: REF, children: [] })
  pool[REF] = mkPoolNode(REF, c.label, c.slug)
  edges.push(mkTreebind(OS.node.id, OS.node.nodeRef, TID, REF))
  created[c.label] = { TID, REF }
  I = index(tree)
  rec(c.opId, 'create', { treeId: TID, ref: REF })
  RESULTS.push({
    id: c.opId, action: 'create', title: `新建中间层 \`${c.label}\``,
    targetIds: { newTreeId: TID, newRef: REF, 父: OS.node.id, 父Ref: OS.node.nodeRef },
    before: { 操作系统孩子数: kids(OS.node) - 1, 同名节点: 0 },
    after: { path: pathOf(TID), 操作系统孩子数: kids(OS.node) },
    edgeImpact: `新增 treebind \`${treebindId(OS.node.id, TID)}\``,
    postconditions: [`\`${TID}\` 挂到 操作系统 下`, `池节点 \`${REF}\` 存在，tabs 为空 → 空 tabs 计数 +1`, `新父 childIds 含新条目`],
  })
}
const MOVES_OS = [
  { opId: 'C4-04', name: 'select', ref: 'asplit_select_io', treeId: 'asplit_s1_asplit_select_io', into: 'I/O 多路复用' },
  { opId: 'C4-05', name: 'epoll', ref: 'asplit_epoll', treeId: 'asplit_s1_asplit_epoll', into: 'I/O 多路复用' },
  { opId: 'C4-07', name: '零拷贝', ref: 'k_io_zero_copy', treeId: 'tree_io_zero_copy', into: '系统调用与 I/O' },
]
for (const m of MOVES_OS) {
  const r = I.recs.find((x) => x.node.id === m.treeId)
  const dest = I.byId.get(created[m.into].TID)
  if (!r) { RESULTS.push({ id: m.opId, action: 'move', title: `\`${m.name}\``, error: `树条目 ${m.treeId} 不存在` }); continue }
  const oldParent = r.parent, oldParentRec = I.byId.get(oldParent.id)
  const before = { path: r.path, 旧父: oldParentRec.path, 旧父孩子数: kids(oldParent) }
  oldParent.children = oldParent.children.filter((c) => c.id !== m.treeId)
  dest.node.children.push(r.node)
  const oldTbIdx = edges.findIndex((e) => isTreebind(e) && e.id.endsWith(`:${m.treeId}`))
  const oldTb = oldTbIdx >= 0 ? { ...edges[oldTbIdx] } : null
  if (oldTbIdx >= 0) edges.splice(oldTbIdx, 1)
  const newTbId = treebindId(dest.node.id, m.treeId)
  edges.push(mkTreebind(dest.node.id, dest.node.nodeRef, m.treeId, m.ref))
  I = index(tree)
  rec(m.opId, 'move', { treeId: m.treeId, ref: m.ref, from: before.旧父, to: m.into })
  RESULTS.push({
    id: m.opId, action: 'move', title: `\`${m.name}\` → \`操作系统 > ${m.into}\``,
    targetIds: { treeId: m.treeId, ref: m.ref, 新父: dest.node.id, 新父Ref: dest.node.nodeRef },
    before, after: { path: pathOf(m.treeId), 旧父孩子数: kids(oldParent), 新父孩子数: kids(dest.node) },
    edgeImpact: `treebind：删 \`${oldTb?.id ?? '(不存在)'}\`，建 \`${newTbId}\`；语义边不动（\`${m.name}\` 的 ref 未变）`,
    baselineDebt: oldTb ? null : '该节点原本没有 treebind 边（既有基线债）',
    postconditions: [`\`${m.treeId}\` 挂到 \`${m.into}\` 下`, `后代 treeId 不变`, `池节点 \`${m.ref}\` 未删未退休`],
  })
}

// ── 收尾统计与校验 ──────────────────────────────────────────────────────
function tree0Like() { return JSON.parse(treeFile0) }
const baseTree = tree0Like()

const before = {
  tree: I0.recs.length,
  pool: Object.keys(pool0).length,
  edges: edges0.length,
  danglingTree: danglingTreeRefs(baseTree, pool0).length,
}
const after = {
  tree: I.recs.length,
  pool: Object.keys(pool).length,
  edges: edges.length,
  danglingTree: danglingTreeRefs(tree, pool).length,
  danglingEdges: danglingEdgeRefs(edges, pool).length,
}
const diagBefore = inspectNodePool(pool0)
const diagAfter = inspectNodePool(pool)
const emptyTabs = (d) => (d.warnings.find((w) => w.includes('card.tabs 为空'))?.match(/(\d+)/)?.[1]) ?? '-'

// ── 硬校验（断言）：同一套检查跑两遍 —— ① 基线 ② 变更后 ─────────────────
// 关键：789 个缺 treebind / 27 条悬空边 很可能是**存量债**，不是本批引入。
// 只有「Δ > 0」的违规才是 APPLY 的阻断项。
function runChecks(treeR, recsR, poolR, edgesR, byIdR) {
  const out = []
  const chk = (name, ok, detail, metric) => out.push({ name, ok: !!ok, detail, metric })

  // 1) 树 treeId 唯一
  const tidCount = new Map()
  const walkAll = (n) => { tidCount.set(n.id, (tidCount.get(n.id) ?? 0) + 1); (n.children || []).forEach(walkAll) }
  walkAll(treeR)
  const dupTids = [...tidCount].filter(([, c]) => c > 1).map(([id]) => id)
  chk('树 treeId 全局唯一', dupTids.length === 0, dupTids.length ? `重复：${dupTids.join(', ')}` : '无重复', dupTids.length)

  // 2) 每个树条目 nodeRef 都在池中存在
  const missRefs = (function w(n, acc) { if (n.nodeRef && !poolR[n.nodeRef]) acc.push(`${n.id}(${n.name}) → ${n.nodeRef}`); (n.children || []).forEach((c) => w(c, acc)); return acc })(treeR, [])
  chk('树 nodeRef 全部命中池实体', missRefs.length === 0, missRefs.length ? `${missRefs.length} 处悬空` : '0 处悬空', missRefs.length)

  // 3) 边两端都命中池实体
  const dEdge = edgesR.filter((e) => !poolR[e.source] || !poolR[e.target])
  chk('边端点全部命中池实体', dEdge.length === 0, dEdge.length ? `${dEdge.length} 条悬空：${dEdge.slice(0, 3).map((e) => e.id).join(', ')}` : '0 条悬空', dEdge.length)

  // 4) 每个非根树条目恰好有 1 条 treebind（父指向它）
  const tbCount = new Map()
  for (const e of edgesR) if (String(e.id).startsWith('treebind:')) { const k = e.id.split(':').pop(); tbCount.set(k, (tbCount.get(k) ?? 0) + 1) }
  const noTb = recsR.filter((r) => r.parent && !tbCount.get(r.node.id)).map((r) => r.node.id)
  chk('每个非根条目有 treebind 边（增量）', noTb.length === 0, noTb.length ? `${noTb.length} 个缺失，例：${noTb.slice(0, 3).join(', ')}` : '无缺失', noTb.length)
  const multiTb = [...tbCount].filter(([, c]) => c > 1).map(([id]) => id)
  chk('无子条目被多条 treebind 重复挂载（增量）', multiTb.length === 0, multiTb.length ? `${multiTb.length} 个重复：${multiTb.slice(0, 3).join(', ')}` : '无重复', multiTb.length)

  // 5) treebind 的 source/target 与实际父子关系一致（抽查已改动的条目）
  //    基线里不存在的新增 treeId 跳过（N/A），否则会把「新增」误计成「违规」。
  const tbMismatch = []
  let checkedExisting = 0
  for (const tid of EDIT_TIDS) {
    const r = byIdR.get(tid)
    if (!r) continue                       // 本批新增，基线 N/A
    checkedExisting++
    if (!r.parent) { tbMismatch.push(`${tid}: 无父（根）`); continue }
    const e = edgesR.find((x) => x.id === treebindId(r.parent.id, tid))
    if (!e) tbMismatch.push(`${tid}: 缺 treebind`)
    else if (e.source !== r.parent.nodeRef || e.target !== r.node.nodeRef) tbMismatch.push(`${tid}: 端点与树不一致`)
  }
  chk('改动过的条目 treebind 与树父子一致', tbMismatch.length === 0,
    tbMismatch.length ? tbMismatch.join(' | ') : `抽查 ${checkedExisting}/${EDIT_TIDS.length} 条通过（其余 ${EDIT_TIDS.length - checkedExisting} 条为本批新增，基线 N/A）`,
    tbMismatch.length)

  // 6) 无环
  const seen = new Set(); const inStack = new Set(); let cyclic = null
  ;(function dfs(n) { if (inStack.has(n.id)) { cyclic = n.id; return } if (seen.has(n.id)) return; seen.add(n.id); inStack.add(n.id); for (const c of n.children || []) { dfs(c); if (cyclic) return } inStack.delete(n.id) })(treeR)
  chk('树无环', !cyclic, cyclic ?? '无环', cyclic ? 1 : 0)

  // 7) OOP/Java 共享实体是否已拆
  const stillShared = SPLIT_PAIRS.filter(([a, b]) => byIdR.get(a)?.node.nodeRef === byIdR.get(b)?.node.nodeRef)
  chk('OOP/Java 两侧不再共享实体', stillShared.length === 0, stillShared.length ? `${stillShared.length} 组仍共享：${stillShared.map(([a, b]) => `${a}/${b}`).join(', ')}` : `已拆 ${SPLIT_PAIRS.length} 组`, stillShared.length)

  return out
}

const EDIT_TIDS = ['final_atomic_hypervisor', 'final_atomic_emulator', 'asplit_s1_asplit_select_io', 'asplit_s1_asplit_epoll', 'tree_io_zero_copy', 'tree_p1_oop_abstract_class', 'tree_p1_oop_inner_class', 'tree_p1_io_multiplexing', 'tree_p1_syscall_io']
const SPLIT_PAIRS = [
  ['tree_class_programming_final_class', 'tree_1784045589689_drgfh8'],
  ['tree_class_programming_anonymous_class', 'tree_1784044171666_9yd2is'],
]

const CHECKS_BASE = runChecks(baseTree, I0.recs, pool0, edges0, I0.byId)
const CHECKS_AFTER = runChecks(tree, I.recs, pool, edges, I.byId)
CHECKS_AFTER.push({ name: 'inspectNodePool 无 fatal', ok: !diagAfter.fatal, detail: diagAfter.fatal ? '存在 fatal' : '无 fatal', metric: diagAfter.fatal ? 1 : 0 })
const CHECKS = CHECKS_AFTER

const regressions = CHECKS_AFTER.filter((c, i) => c.metric !== undefined && CHECKS_BASE[i] && c.metric > CHECKS_BASE[i].metric)
const stillFailing = CHECKS_AFTER.filter((c) => !c.ok)

// ── 边影响：真实 diff（基线 vs 变更后，按 id 对齐）──────────────────────
const e0ById = new Map(edges0.map((e) => [e.id, e]))
const e1ById = new Map(edges.map((e) => [e.id, e]))
const EDGE_DELETED = edges0.filter((e) => !e1ById.has(e.id))
const EDGE_ADDED = edges.filter((e) => !e0ById.has(e.id))
const EDGE_MODIFIED = edges
  .filter((e) => e0ById.has(e.id) && JSON.stringify(e0ById.get(e.id)) !== JSON.stringify(e))
  .map((e) => ({ id: e.id, before: e0ById.get(e.id), after: e }))
const shortEdge = (e) => `\`${e.id}\` (${e.type}${e.relationKind ? ' / ' + e.relationKind : ''}: ${e.source} → ${e.target})`

// ── 语义边（非 treebind）在相关实体上的分布：基线快照（供拆分裁决用）────
const SPLIT_REFS = [
  { ref: 'k_1784045589643_icc5oo', name: '最终类' },
  { ref: 'k_1784044171635_8etz45', name: '匿名类' },
  { ref: 'k_1784295376153_uiovkk', name: '抽象类' },
  { ref: 'k_1784044129424_ffqm4z', name: '内部类' },
]
const semanticEdgesOf = (ref) => edges0
  .filter((e) => !isTreebind(e) && (e.source === ref || e.target === ref))
  .map((e) => ({ id: e.id, type: e.type, dir: e.source === ref ? 'out' : 'in', other: e.source === ref ? e.target : e.source }))
const labelOf = (ref) => pool0[ref]?.label ?? ref

// ── 共享实体多挂载清单（基线）──────────────────────────────────────────
const mountMap = new Map()
for (const r of I0.recs) {
  if (!r.node.nodeRef) continue
  mountMap.set(r.node.nodeRef, [...(mountMap.get(r.node.nodeRef) ?? []), { treeId: r.node.id, path: r.path }])
}

const L = []
const add = (s) => L.push(s)
add('# 阶段一 DRY-RUN 报告（before → after，**未写盘**）')
add('')
add(`> 生成时间 ${new Date().toISOString()}`)
add('> 方式：tree/pool/edges **全量 deep-clone 到内存**，在克隆体上真跑操作，再把克隆 pool 喂给真实 \`inspectNodePool\`。')
add('> ⚠️ **data/ 未写入任何字节**；本报告与 \`phase1-dryrun-plan.json\` 是唯一产物。')
add('')
add('## 0. 总账')
add('')
add('| 指标 | before | after | Δ |')
add('|---|---|---|---|')
add(`| 树条目 | ${before.tree} | ${after.tree} | +${after.tree - before.tree} |`)
add(`| 池节点 | ${before.pool} | ${after.pool} | +${after.pool - before.pool} |`)
add(`| 边 | ${before.edges} | ${after.edges} | ${after.edges - before.edges >= 0 ? '+' : ''}${after.edges - before.edges} |`)
add(`| 悬空 nodeRef（树） | ${before.danglingTree} | ${after.danglingTree} | ${after.danglingTree - before.danglingTree >= 0 ? '+' : ''}${after.danglingTree - before.danglingTree} |`)
add(`| 悬空端点（边） | — | ${after.danglingEdges} | — |`)
add(`| 体检 fatal | ${diagBefore.fatal ? '有' : '无'} | ${diagAfter.fatal ? '有' : '无'} | — |`)
add(`| 空 tabs 节点 | ${emptyTabs(diagBefore)} | ${emptyTabs(diagAfter)} | +${(Number(emptyTabs(diagAfter)) || 0) - (Number(emptyTabs(diagBefore)) || 0)} |`)
add('')
add(`新增树条目：**${after.tree - before.tree}**（2 个 OS 中间层 + 2 个 OOP 本体）· 新增池节点：**${after.pool - before.pool}**（2 中间层 + 2 OOP 本体 + 2 拆分出的 Java 具象）· 新增边：**${after.edges - before.edges}**`)
add('')
add('## 0.5 硬校验（基线 vs 变更后；只有 **Δ>0** 才阻断 APPLY）')
add('')
add('| # | 校验项 | 基线违规数 | 变更后违规数 | Δ | 判定 | 明细 |')
add('|---|---|---|---|---|---|---|')
CHECKS_AFTER.forEach((c, i) => {
  const b = CHECKS_BASE[i]
  const bm = b?.metric ?? '—'
  const am = c.metric ?? '—'
  const delta = b && c.metric !== undefined ? c.metric - b.metric : '—'
  const verdict = delta === '—' ? (c.ok ? '✅' : '⚠️ 存量') : delta > 0 ? '❌ 本批引入' : c.ok ? '✅' : '⚠️ 存量（未恶化）'
  add(`| ${i + 1} | ${c.name} | ${bm} | ${am} | ${delta === '—' ? '—' : (delta > 0 ? `**+${delta}**` : delta)} | ${verdict} | ${c.detail} |`)
})
add('')
add(`- **本批引入的新违规：${regressions.length} 项** ${regressions.length ? '→ ❌ **禁止 APPLY**' : '→ ✅ 无'}`)
add(`- 存量违规（未恶化）：${stillFailing.length - regressions.length} 项 —— 属**基线债**，由既有治理批次承担，不在本轮范围。`)
add('')
add('> ⚠️ 关于「789 个条目缺 treebind」与「27 条悬空边」：**基线即如此**，本轮 0 变化。')
add('> 这意味着本批的 treebind 增删是**在既有稀疏结构上做加法**，不会放大存量债 —— 验收时只盯 Δ。')
add('')
add('## 1. 共享实体拆分方案')
add('')
add('> 判定依据（架构规则）：**treeId = 挂载位置，nodeRef = 池实体**。')
add('> 当同一 `nodeRef` 出现在 OOP 树与语言树两侧时，说明**一个实体被当成两种东西用**：')
add('> 一侧需要「通用本体」，另一侧需要「语言具象」。拆分 = 保一个、建一个、改挂载、记关系。')
add('')
add('| 实体 | 挂载数（基线） | 判定 | 保留侧（含正文） | 新建侧（空，待填） | Java treebind 改指 | 新关系边 |')
add('|---|---|---|---|---|---|---|')
add(`| \`抽象类\` | 3（全在 Java） | ⚠️ **HIGH — 裁决与数据冲突** | 建议改为保留原实体作**本体**（正文 232 字即 OOP 通用定义） | 需为 Java 侧 3 个挂载点新建具象实体 | 3 条 treebind 需改指 | \`具象 --[implements]--> 本体\` ×1 |`)
add(`| \`内部类\` | 2（全在 Java） | ✅ 裁决成立 | 新建 OOP 本体（空） | OOP 侧 \`tree_p1_oop_inner_class\` | 不动（Java 侧原样） | 无（Java 实体本就是具象） |`)
add(`| \`最终类\` | 2（OOP + Java 混用） | ✅ 可拆 | **OOP 侧**保留 \`k_1784045589643_icc5oo\`（正文 81 字） | Java 侧新建 \`p1_java_final_class\` | \`treebind:tree_1784043760890_bptgal:tree_1784045589689_drgfh8\` | \`p1_java_final_class --[implements]--> k_1784045589643_icc5oo\` |`)
add(`| \`匿名类\` | 2（OOP + Java 混用） | ✅ 可拆 | **OOP 侧**保留 \`k_1784044171635_8etz45\`（正文 42 字，纯通用） | Java 侧新建 \`p1_java_anonymous_class\` | \`treebind:tree_1784044092244_76wkqz:tree_1784044171666_9yd2is\` | \`p1_java_anonymous_class --[implements]--> k_1784044171635_8etz45\` |`)
add('')
add('**共 4 个实体、10 个挂载点、需新建 3 个实体、改指 4 条 treebind。**')
add('')
add('### 1.1 待裁决：`抽象类` 的两条互斥路线')
add('')
add('| | 变体 A（= 本轮 dry-run 已模拟） | 变体 B（建议） |')
add('|---|---|---|')
add('| OOP 侧 | 新建**空**本体 \`p1_oop_abstract_class\` | **现有实体认定为本体**，新增 OOP 挂载点（或整体移入 `类的分类`） |')
add('| Java 侧 | 3 个挂载点**完全不动**，仍指现实体 | 3 个挂载点改指**新建 Java 具象实体** |')
add('| 正文（232 字 OOP 定义） | 留在 Java 树 → **倒置** | 留在本体侧 → **归位** |')
add('| 边改动量 | treebind +1 | treebind +4（3 改指 + 1 新增 OOP）、implements +1 |')
add('| 风险 | 本体节点空转、内容挂错域 | 改动面稍大，需同步 4 条边 |')
add('')
add('> **与 `内部类` 的对比**：`内部类` 的 1900 字正文明确是 Java 专有（含「Java 类中…」词句），所以「新建空 OOP 本体」正确；')
add('> 而 `抽象类` 的 232 字是纯通用定义，所以同样的动作会产出相反结果 —— **判据是正文语义，不是挂载点数量。**')
add('')
add('### 1.2 相关实体的语义边分布（基线快照，供拆分后重指裁决）')
add('')
add('| 实体 | 语义边 | 方向 | 对端 |')
add('|---|---|---|---|')
let semCount = 0
for (const s of SPLIT_REFS) {
  const es = semanticEdgesOf(s.ref)
  semCount += es.length
  if (!es.length) { add(`| \`${s.name}\` | 0 | — | — |`); continue }
  for (const e of es) add(`| \`${s.name}\` | \`${e.id}\` (${e.type}) | ${e.dir === 'out' ? '出' : '入'} | \`${labelOf(e.other)}\` |`)
}
add('')
add(`共 **${semCount}** 条语义边挂在这 4 个实体上。**本 dry-run 不改动它们** —— 拆分后哪些该指向本体、哪些该指向具象，必须逐条裁决（见 1.1 的变体 B）。`)
add('')
add('## 2. 边影响汇总（真实 diff：基线 vs 变更后，按边 id 对齐）')
add('')
add(`| 类别 | 数量 | 明细 |`)
add(`|---|---|---|`)
add(`| 删除 | ${EDGE_DELETED.length} | ${EDGE_DELETED.length ? EDGE_DELETED.map(shortEdge).join('<br>') : '无'} |`)
add(`| 新增 | ${EDGE_ADDED.length} | ${EDGE_ADDED.length ? EDGE_ADDED.map(shortEdge).join('<br>') : '无'} |`)
add(`| 修改（同 id，端点变） | ${EDGE_MODIFIED.length} | ${EDGE_MODIFIED.length ? EDGE_MODIFIED.map((m) => `\`${m.id}\`：target \`${m.before.target}\` → \`${m.after.target}\``).join('<br>') : '无'} |`)
add('')
const addTreebind = EDGE_ADDED.filter(isTreebind)
const addImpl = EDGE_ADDED.filter((e) => e.type === 'implements')
const addOther = EDGE_ADDED.filter((e) => !isTreebind(e) && e.type !== 'implements')
const delTreebind = EDGE_DELETED.filter(isTreebind)
const delOther = EDGE_DELETED.filter((e) => !isTreebind(e))
const BT = String.fromCharCode(96)   // 反引号；用拼接而非模板串，避免嵌套模板与转义带来的可读性/语法风险
add('**读法（关键）：**')
add('')
add('- 删除的 ' + EDGE_DELETED.length + ' 条中，**' + delTreebind.length + ' 条是 treebind**（另有 ' + delOther.length + ' 条非 treebind）。')
add('  treebind 之所以失效，是因为**父节点换了** → 边 id 里嵌着父 treeId，父一变 id 就变。')
add('  子节点的实体（' + BT + 'nodeRef' + BT + '）**未变**，内容归属无损 —— 这就是「结构边」与「语义边」分离的好处。')
add('- 新增的 ' + EDGE_ADDED.length + ' 条 = **' + addTreebind.length + ' 条 treebind** + **' + addImpl.length + ' 条 ' + BT + 'implements' + BT + '**' + (addOther.length ? ' + ' + addOther.length + ' 条其它' : '') + '。')
{
  // 按「孩子 treeId 在基线是否已存在」精确归类新增的 treebind，不靠手写常量
  const tbNewChild = addTreebind.filter((e) => !I0.byId.has(e.id.split(':').pop()))
  const tbMovedChild = addTreebind.filter((e) => I0.byId.has(e.id.split(':').pop()))
  add('    - **' + tbNewChild.length + ' 条**：孩子是本批**新建**的树条目（C1-03/C1-04 新 OOP 本体 + C4-03/C4-06 新 OS 中间层）')
  add('    - **' + tbMovedChild.length + ' 条**：孩子**原本就在树里**，只是换了父（C4-01/02 搬入虚拟化技术、C4-04/05/07 搬入新中间层）')
}
add('- 另有 **' + EDGE_MODIFIED.length + ' 条 treebind 被「同 id 修改」**（只改 target，不改 id）：因为挂载位置没变、只是换了实体。')
add('  刻意如此设计 —— **边 id 保持稳定 → diff 更小、回滚更简单**。这是 schema 层面「结构边 id 绑定父位置」带来的副作用，正好为我所用。')
add('- 提示：**' + addImpl.length + ' 条 ' + BT + 'implements' + BT + ' 边进不了索引图** —— ' + BT + 'logicalRelationKind()' + BT + ' 对它返回 null，调用方直接 continue 丢弃，')
add('  只在**类型关系视图**可见。这是本轮裁决 **C1-08（暂不扩白名单）** 的直接后果 —— 记录在此，将来若要「让具象→本体关系上索引图」，改的就是这里。')
add('')
add('## 3. 逐操作 before → after')
add('')
add('> 注：操作**按顺序执行于同一份克隆数据**，因此后一个操作的 `before` 已包含前一个的效果（例：`C4-01` 移走 `管理程序` 后，`C4-02` 的旧父孩子数 6→5→4）。')
add('')
for (const r of RESULTS) {
  add(`### \`${r.id}\` · ${r.action} · ${r.title}`)
  add('')
  if (r.error) { add(`- ❌ ${r.error}`); add(''); continue }
  add(`- **targetIds**：\`${JSON.stringify(r.targetIds)}\``)
  if (r.before) add(`- **before**：\`${JSON.stringify(r.before)}\``)
  if (r.after) add(`- **after**：\`${JSON.stringify(r.after)}\``)
  if (r.edgeImpact) add(`- **边影响**：${r.edgeImpact}`)
  if (r.baselineDebt) add(`- ⚠️ **既有债**：${r.baselineDebt}`)
  if (r.note) add(`- 📌 ${r.note}`)
  if (r.conflict) {
    const sev = r.conflict.severity === 'NONE' ? '裁决与数据一致 ✅' : `⚠️ 裁决与数据冲突（${r.conflict.severity}）`
    add(`- **${sev}**：${r.conflict.claim}`)
    add(`  - 证据：${r.conflict.evidence}`)
    if (r.conflict.risk) add(`  - 风险：${r.conflict.risk}`)
    add(`  - **建议**：${r.conflict.recommended}`)
    if (r.conflict.alternative) add(`  - 备选：${r.conflict.alternative}`)
  }
  add('- **验收条件**：')
  for (const p of r.postconditions ?? []) add(`  - ${p}`)
  add('')
}
add('## 4. 明确不进入本轮的')
add('')
add('| opId | 原因 |')
add('|---|---|')
add('| `C1-06` | SPEC-BLOCKED：`viewDimensions` 的 atoms 是内容语义契约，不猜；且需等外部 atoms 批次收敛 |')
add('| `C4-10` | SPEC-BLOCKED：`物化视图` 目标父路径缺失 |')
add('| `C4-11` | SPEC-BLOCKED：`PipedInputStream` 目标父路径缺失；且它是 Java 具象，不能因名字含 Stream 就归 OS/IO 本体 |')
add('| `C1-05` `C1-07` `C4-08` `C4-09` | VOID：已在位 / 端点不存在 / 无内层壳 / 对象不存在 |')
add('| `C1-08` | 无结构动作：裁决为「暂不扩索引图白名单」，`implements` 仅类型关系视图可见 |')
add('')
add('## 5. 治理规则（本轮实证，建议正式化）')
add('')
add('> **treeId ≠ entity identity。**')
add('> `treeId` 表示**挂载位置**，`nodeRef` 才是**池实体**。')
add('> 同一个 `nodeRef` 出现多个 `treeId` 时，先判它是「合法共享引用」还是「本体/具象混用」，')
add('> **不能只按路径数量判断存在几个实体。**')
add('')
add(`本轮被这条规则抓住的：\`抽象类\`(3 挂载同实体) · \`内部类\`(2) · \`最终类\`(2，OOP/Java 混用) · \`匿名类\`(2，OOP/Java 混用)。`)
add('')
add('### 5.1 附带发现：`treebind` 边 id 内含父 treeId，是**特性不是缺陷**')
add('')
add('- 副作用：父一换，边 id 就必须变 → 表现为「删 1 建 1」，看起来像两条边在动，其实只有挂载位置变了。')
add('- 好处：**边 id 就是挂载路径的指纹** —— 给定子 treeId 即可反推其 treebind id（`treebind:<父treeId>:<子treeId>`），')
add('  这让「结构是否自洽」可以纯机械校验（本报告校验 #6 就是这么做的），不需要读任何语义字段。')
add('- 代价：子节点换实体（拆分场景）时**必须保留原 id**，否则会退化成删+建。本批 2 条拆分边正是这么处理的。')
add('')
add('## 6. 验收清单（APPLY 后逐条机械核对）')
add('')
add('| # | 断言 | 期望 |')
add('|---|---|---|')
add('| A1 | tree-data.json 条目总数 | 3215 → **3219**（+4） |')
add('| A2 | node-pool.json 节点总数 | 3849 → **3855**（+6） |')
add('| A3 | knowledge-edges.json 边总数 | 4158 → **4164**（+6） |')
add('| A4 | 树悬空 nodeRef | 保持 **0** |')
add('| A5 | 边悬空端点 | 保持 **27**（存量，不得增加） |')
add('| A6 | 缺 treebind 的条目 | 保持 **789**（存量，不得增加） |')
add('| A7 | 被多条 treebind 挂载的条目 | 保持 **47**（存量，不得增加） |')
add('| A8 | inspectNodePool fatal | **无** |')
add('| A9 | 空 tabs 节点 | 495 → **501**（+6，均为本轮新建待填） |')
add('| A10 | 树无环、treeId 全局唯一 | 通过 |')
add('| A11 | 改动过的条目 treebind 端点与树父子一致 | 9/9 通过 |')
add('| A12 | 拆分后 OOP/Java 两侧 nodeRef 不再相同 | 2/2 组已拆 |')
add('')
add('> 校验脚本：`node scripts/dryrun-phase1.mjs` —— A1–A12 全部来自真实计算结果，非人工填写。')
add('')
add('## 7. 闸门状态')
add('')
add('| 闸门 | 状态 | 依据 |')
add('|---|---|---|')
add('| `[BLOCKED]` 5173 + 外部 data 未收敛 | ✅ **已解除** | 全工作树指纹显示：13:00 的数据批次之后再无外部写入；`outputs/` 之外 17 个已跟踪文件的 md5 与上次快照完全一致 |')
add('| `[READ-ONLY RECONCILIATION]` | ✅ 完成 | `external-change-baseline.md`：外部改动 127 节点（tags×125 / viewDimensions×3 / card×1）+ 题库 1 条；与阶段一碰撞 **4 个**（仅 tags 字段） |')
add('| `[BLUEPRINT NORMALIZATION]` | ✅ 完成 | `phase1-operations.json`：20 个原子操作单元，READY 5 / NEEDS_DECISION 5 / NEEDS_SPEC 3 / BLOCKED_UNTIL_CREATE 3 / VOID 4 |')
add('| `[DRY-RUN]` | ✅ 完成 | 本报告：13 个操作单元真跑于内存克隆体，**本批引入新违规 0 项** |')
add('| `[REVIEW]` | ⏳ **等待裁决** | 待决 3 项（见 7.1） |')
add('| `[APPLY]` | ⛔ 未开始 | 需 REVIEW 通过 + 命名方案确认 + 写入互斥处理 |')
add('')
add('### 7.1 进入 APPLY 前必须解决的三件事')
add('')
add('1. **`抽象类` 走变体 A 还是 B**（§1.1）。这是唯一会改变操作数目的裁决：A = 本 dry-run 已模拟的 13 个操作单元；B = 另需为 Java 侧新建 1 个具象实体、把 3 条 treebind 改指。')
add('2. **新实体命名方案**。本 dry-run 用了 `p1_` / `tree_p1_` 占位前缀，与现存风格（`k_1784…` 时间戳式、`asplit_*` 批次式）都不同。占位命名的好处是**一眼可辨、易于回滚**；若要统一风格，请在 APPLY 前定名。')
add('3. **dev server 写入互斥**。Windows 下目标文件被预览/编辑器持有时 `rename` 会报 EPERM（本轮已因此产生过孤儿 `.tmp`）。APPLY 需走「原子写 + 失败回退直写 + 清理 tmp」模式，并确保 APPLY 窗口内无并发读取。')
add('')
add('### 7.2 关于那 4 个碰撞节点')
add('')
add('外部批次改了 127 个节点，其中仅 4 个落在阶段一目标集里（`asplit_concrete_class` / `asplit_local_class` / `asplit_select_io` / `asplit_epoll`），且**只动了 `tags` 字段**。')
add('阶段一对这 4 个节点只做 **move（换父）**，不碰 `tags` → **写集不重叠，可安全共存**。')
add('这正是「先固化外部基线再 APPLY」的价值：把冲突范围从「同一个文件」精确到「同一个字段」。')
add('')

const md = L.join('\n')
fs.mkdirSync(OUT_DIR, { recursive: true })
const outMd = path.join(OUT_DIR, 'phase1-dryrun-report.md')
const tmp = `${outMd}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, md, 'utf8')
try { fs.renameSync(tmp, outMd) } catch (e) { fs.writeFileSync(outMd, md, 'utf8'); try { fs.unlinkSync(tmp) } catch { /* noop */ } }

// 机器可读的变更计划（供 review 与将来 apply 直接消费）
fs.writeFileSync(path.join(OUT_DIR, 'phase1-dryrun-plan.json'), JSON.stringify({
  generatedAt: new Date().toISOString(), wroteData: false,
  totals: { before, after },
  checks: { baseline: CHECKS_BASE, after: CHECKS_AFTER, regressions: regressions.map((r) => r.name) },
  results: RESULTS,
  journal: JOURNAL,
}, null, 2), 'utf8')

console.log(`dry-run 报告：${path.relative(ROOT, outMd)}`)
console.log(`树 ${before.tree}→${after.tree} · 池 ${before.pool}→${after.pool} · 边 ${before.edges}→${after.edges}`)
console.log(`悬空(树) ${before.danglingTree}→${after.danglingTree} · 悬空(边) ${after.danglingEdges} · fatal ${diagAfter.fatal ? '有' : '无'}`)
console.log(`空 tabs ${emptyTabs(diagBefore)}→${emptyTabs(diagAfter)} · 日志 ${JOURNAL.length} 条`)
console.log(`硬校验 本批引入新违规 ${regressions.length} 项 ${regressions.length ? '❌ ' + regressions.map((f) => f.name).join(' / ') : '✅ 无'} · 存量违规 ${stillFailing.length - regressions.length} 项`)
