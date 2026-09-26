/**
 * [BLUEPRINT NORMALIZATION] 把阶段一（簇 1 + 簇 4）的原始蓝图，改写成**机器可验证的操作单元**。
 *
 * 为什么需要这一层：原始蓝图是「人脑指令」——写的是名字和意图（「移动到 X」「建立 solves 边」），
 * 但真实数据里名字会多挂载、目标可能是 governance 锚点、边类型可能根本不在渲染白名单内。
 * 本脚本把每条意图落到 Operation 结构上：
 *   precondition / targetIds / sourcePath / targetPath / action / relationChanges /
 *   renderingContract / postcondition / status
 *
 * 只读 data/。产物：
 *   outputs/tree-violation-scan/phase1-normalized-blueprint.md
 *   outputs/tree-violation-scan/phase1-operations.json   （机器可读，供下一步 dry-run 消费）
 *
 * 用法：node scripts/normalize-phase1-blueprint.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')

const rd = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))
const tree = rd('tree-data.json')
const pool = rd('node-pool.json')

// ── 索引 ────────────────────────────────────────────────────────────────
const all = []
const byTreeId = new Map()
;(function walk(node, trail, parent) {
  const t = [...trail, node]
  const rec = { node, parent, path: t.map((x) => String(x.name ?? '')).join(' > '), trail: t }
  all.push(rec)
  byTreeId.set(node.id, rec)
  for (const c of node.children || []) walk(c, t, node)
})(tree, [], null)

const kids = (n) => (n.children || []).length
const isGov = (id) => String(id).startsWith('governance:')
const findByExactName = (name) => all.filter((h) => String(h.node.name) === name)
const findByChain = (names) => all.filter((h) => h.path === names.join(' > ') || h.path.endsWith(' > ' + names.join(' > ')))
const childNames = (node) => new Set((node.children || []).map((c) => String(c.name)))

const ref = (node) => node.nodeRef ?? null
// 同一池实体被挂几次：这决定了「移动」的语义（移一个挂载点 ≠ 移走这个东西）
const MOUNTS = new Map()
for (const h of all) if (h.node.nodeRef) MOUNTS.set(h.node.nodeRef, (MOUNTS.get(h.node.nodeRef) || 0) + 1)
const mountOf = (node) => (node.nodeRef ? MOUNTS.get(node.nodeRef) ?? 1 : 1)
const brief = (h) => ({ treeId: h.node.id, ref: ref(h.node), path: h.path, kids: kids(h.node), mounts: mountOf(h.node), isGovernance: isGov(h.node.id) })

// 边渲染白名单（源码实证：logicalRelationKind() 返回 null → 调用处 if (!kind) continue; 硬丢弃）
const DRAWN = new Set(['uses', 'depends-on', 'needs-for', 'enables', 'leads-to', 'compares', 'relates-to'])
const renderingVerdict = (types) => {
  if (!types.length) return { visible: null, note: '本操作不产生边' }
  const drawn = types.filter((t) => DRAWN.has(t))
  const dropped = types.filter((t) => !DRAWN.has(t))
  return {
    visible: dropped.length === 0,
    drawn,
    dropped,
    note: dropped.length === 0
      ? `全部在白名单内，索引图会绘制（${drawn.join(', ')}）`
      : `${dropped.join(', ')} 不在白名单 → 索引图 \`if (!kind) continue\` 直接丢弃；写了也不可见`,
  }
}

// ── 意图声明（逐条落到 Operation）──────────────────────────────────────
const OPS = []

const op = (o) => { OPS.push({ ...o, id: o.id }) ; return OPS[OPS.length - 1] }

// ============ 簇 1 ============
op({
  id: 'C1-01', cluster: '簇1', blueprint: '在 `面向对象 > 类` 下设立唯一的 `类的分类` 树节点',
  action: 'decision', status: 'NEEDS_DECISION', decision: '宿主容器选哪个',
  note: '蓝图目标 `面向对象 > 类` 的 id 是 `governance:canonical:…`，是治理 canonical 锚点（0 孩），**不能当容器**。真正的工作容器是同层的 `类（编程）`。',
  candidates: [
    { option: 'A（推荐）', desc: '把现有 `分类` 就地改名为 `类的分类`，仍挂 `类（编程）`；零子树移动', host: '类（编程）' },
    { option: 'B', desc: '把 `类（编程）` 正名为 `类`，并把 canon 锚点 `类` 合并/退休；动 canon 层，影响面大', host: 'canon 层改造' },
  ],
})
op({
  id: 'C1-02', cluster: '簇1', blueprint: '在 面向对象 > 类 下设立唯一的 `类的分类` 树节点 + 所有形态平铺其下',
  action: 'rename', status: 'READY', dependsOn: ['C1-01'],
  subjectName: '分类', subjectChain: ['类（编程）', '分类'],
  newName: '类的分类',
  relationChanges: [], edgeTypes: [],
  note: '**9 行「移动」其实塌缩成这 1 个改名**：现有 `分类` 已含 10 个形态，改名后即在位，无需逐个搬。',
})
op({
  id: 'C1-03', cluster: '簇1', blueprint: '`抽象类` 从 `Java syntax > 修饰符 > 抽象类` 移入 `类 > 类的分类`',
  action: 'move', status: 'NEEDS_DECISION', decision: '移哪一份 / 是否新建理论本体',
  subjectName: '抽象类', candidatesFrom: 'all',
  targetParentChain: ['类（编程）', '分类'],
  edgeTypes: ['implements'],
  note: '树里 `抽象类` 有 **3 处，全在 Java 侧**（修饰符下 / 继承下 / Java类下），且 **3 处的 nodeRef 完全相同**（`k_1784295376153_uiovkk`，rootContent 仅 232 字）→ 不是「三份副本」，是**同一个池实体被挂 3 次**。所以蓝图「搬一份过去」在语义上不成立：搬走一个挂载点，另外两处仍留在 Java 树里。正确做法是**新建 OOP 理论本体节点**，Java 侧用 `implements` 回指。',
})
op({
  id: 'C1-04', cluster: '簇1', blueprint: '`内部类` 从 `类（编程） > 分类 > 局部类与内部类` 移入 `类 > 类的分类`',
  action: 'move', status: 'NEEDS_DECISION', decision: '移哪一份 / 是否新建理论本体',
  subjectName: '内部类', candidatesFrom: 'all',
  targetParentChain: ['类（编程）', '分类'],
  edgeTypes: ['implements'],
  note: '`局部类与内部类` 这个壳**不存在**（蓝图现状描述错误）。`内部类` 有 2 份，都在 Java 侧（`Java类 > 声明 > 内部类` 带 4 孩 / `Java类 > 内部类`）。',
})
op({
  id: 'C1-05', cluster: '簇1', blueprint: '`具体类/最终类/封闭类/局部类/匿名类/元类` 移入 `类 > 类的分类`',
  action: 'noop', status: 'VOID',
  subjectNames: ['具体类', '最终类', '封闭类', '局部类', '匿名类', '元类'],
  note: '**这 6 个已经在目标容器里了**（现 `分类` 的成员）→ 改名后即在位，移动动作不存在。蓝图把「已经对了的事」也列成了要做的事。但其中 `最终类`/`匿名类` 另有隐情，见 C1-09。',
})
op({
  id: 'C1-09', cluster: '簇1', blueprint: '（蓝图未写，规范化过程中查出）「Java 具象隔离」的真正前提',
  action: 'rewire', status: 'NEEDS_DECISION', decision: '是否拆分共享池实体',
  subjectNames: ['最终类', '匿名类'], candidatesFrom: 'all',
  edgeTypes: [],
  note: '`分类` 的 10 个成员里，`最终类` 与 `匿名类` **各自只有一个池实体，却被挂了 2 次** —— 一次在 OOP `分类` 下，一次在 Java `Java类` 下（`k_1784045589643_icc5oo` / `k_1784044171635_8etz45`）。也就是说 **OOP 侧与 Java 侧现在共享同一个实体**，正文只有一份。所谓「Java 具象隔离」在数据上根本做不到 —— 除非**把这两个共享实体拆成两个池节点**（OOP 本体 + Java 具象），并各自重指挂载。这一步不在蓝图任何一行里，却是本簇真正的活。',
})
op({
  id: 'C1-06', cluster: '簇1', blueprint: '在 `类的分类` 内部编排 `viewDimensions`（按抽象/继承/作用域/生命周期 4 个 Grid 视角）',
  action: 'set-field', status: 'NEEDS_SPEC',
  targetChain: ['类（编程）', '分类'],
  field: 'viewDimensions',
  note: '`viewDimensions` 是真字段且 `grid`/`matrix` 合法，但每个 `ViewSection` **必须绑 `atoms`（指向池内原子）**，4 个视角 × 若干 section 需要逐条给成员原子 id。蓝图只给了视角名，**规格不足以落盘**。',
})
op({
  id: 'C1-07', cluster: '簇1', blueprint: '`Java 密封类 --[implements]--> 封闭类`',
  action: 'rewire', status: 'VOID',
  subjectName: '密封类',
  edgeTypes: ['implements'],
  note: '`密封类` **全树零命中** → 端点不存在，照写即悬空边（直接违反「0 悬空」验收）。且即便建了，`implements` 也不在索引图白名单。',
})
op({
  id: 'C1-08', cluster: '簇1', blueprint: '`Java syntax` 下只留 Java 独有语法，用 `implements` 连到 OOP 本体',
  action: 'rewire', status: 'NEEDS_DECISION', decision: '是否接受「类型关系视图才可见」',
  subjectName: 'Java类', subjectChain: ['Java类'],
  edgeTypes: ['implements'],
  note: '`implements` 是真实边类型（数据 239 条）且 `TypeRelationKind` 认它 —— 但**只在类型关系视图可见**，索引图会丢弃。若期望在索引图/机制视图看到，必须改用白名单内的 7 种，或先扩白名单（改 `src/`，属另一批）。',
})

// ============ 簇 4 ============
op({
  id: 'C4-01', cluster: '簇4', blueprint: '`管理程序 (Hypervisor)` 从 `程序分析 > … > 探查器类型 > 管理程序` 迁到 `编译原理 > 执行 > 虚拟机 > 虚拟化技术`',
  action: 'move', status: 'READY',
  subjectName: '管理程序', subjectChain: ['管理程序'],
  targetParentChain: ['虚拟机', '虚拟化技术'],
  edgeTypes: [],
  note: '蓝图现状路径的父名写作 `探查器类型`，真实父是 `探查器类型中的数据粒度`；目标父容器**已存在**（2 孩），无需新建。',
})
op({
  id: 'C4-02', cluster: '簇4', blueprint: '`模拟器 (Emulator)` 同上',
  action: 'move', status: 'READY',
  subjectName: '模拟器', subjectChain: ['模拟器'],
  targetParentChain: ['虚拟机', '虚拟化技术'],
  edgeTypes: [],
})
op({
  id: 'C4-03', cluster: '簇4', blueprint: '目标中间层 `系统组织 > 操作系统 > I/O 多路复用`',
  action: 'create', status: 'READY',
  newName: 'I/O 多路复用',
  parentChain: ['操作系统'],
  edgeTypes: [],
  note: '全树零命中 → 必须新建。',
})
op({
  id: 'C4-04', cluster: '簇4', blueprint: '`select` 从 `操作系统 > select与epoll` 迁到 `操作系统 > I/O 多路复用`',
  action: 'move', status: 'BLOCKED_UNTIL_CREATE', dependsOn: ['C4-03'],
  subjectName: 'select', subjectChain: ['select'],
  targetParentChain: ['操作系统', 'I/O 多路复用'],
  edgeTypes: [],
  note: '**没有 `select与epoll` 这个容器**（现状描述错误）：`select` 与 `epoll` 是 `操作系统` 下的两个独立兄弟。',
})
op({
  id: 'C4-05', cluster: '簇4', blueprint: '`epoll` 同上',
  action: 'move', status: 'BLOCKED_UNTIL_CREATE', dependsOn: ['C4-03'],
  subjectName: 'epoll', subjectChain: ['epoll'],
  targetParentChain: ['操作系统', 'I/O 多路复用'],
  edgeTypes: [],
})
op({
  id: 'C4-06', cluster: '簇4', blueprint: '目标中间层 `系统组织 > 操作系统 > 系统调用与 I/O`',
  action: 'create', status: 'READY',
  newName: '系统调用与 I/O',
  parentChain: ['操作系统'],
  edgeTypes: [],
})
op({
  id: 'C4-07', cluster: '簇4', blueprint: '`零拷贝` 迁到 `操作系统 > 系统调用与 I/O`',
  action: 'move', status: 'BLOCKED_UNTIL_CREATE', dependsOn: ['C4-06'],
  subjectName: '零拷贝', subjectChain: ['零拷贝'],
  targetParentChain: ['操作系统', '系统调用与 I/O'],
  edgeTypes: [],
})
op({
  id: 'C4-08', cluster: '簇4', blueprint: '解散 `算法 > 数据结构 > 数据结构` 内层壳，`线性结构` 等提级',
  action: 'noop', status: 'VOID',
  subjectName: '数据结构', subjectChain: ['算法', '数据结构'],
  note: '**没有内层壳**：`线性结构` 已是 `数据结构` 的直接子节点（早已是平的）。真正的问题是**同名双胞** —— 治理节点 `governance:canonical:n_6dgtsmpj`(2 孩) 与真容器 `theory_domain_data_structures`(8 孩) 同名同路径并存。该问题不在本蓝图任何一行里。',
})
op({
  id: 'C4-09', cluster: '簇4', blueprint: '解散 `数据库 > 备份与恢复 > 备份和恢复` 重复容器',
  action: 'noop', status: 'VOID',
  subjectName: '备份与恢复',
  note: '`备份与恢复` / `备份和恢复` **两个名字在全树零命中** → 不是「去重」，是「没有这个东西」。',
})
op({
  id: 'C4-10', cluster: '簇4', blueprint: '纠正 `物化视图` 的物理挂载',
  action: 'move', status: 'NEEDS_SPEC',
  subjectName: '物化视图',
  note: '蓝图**未给目标路径** → 规格不完整。现状：`数据库管理 > 数据库 > 数据库设计 > 视图 > 物化视图`。',
})
op({
  id: 'C4-11', cluster: '簇4', blueprint: '纠正 `PipedInputStream` 的物理挂载',
  action: 'move', status: 'NEEDS_SPEC', subjectName: 'PipedInputStream',
  note: '蓝图**未给目标路径** → 规格不完整。现状：`java > java并发编程 > 线程间通信 > PipedInputStream`。',
})

// ── 解析与前置条件求值 ──────────────────────────────────────────────────
const resolveSubjects = (o) => {
  if (o.subjectChain) {
    const h = findByChain(o.subjectChain)
    if (h.length) return h
  }
  if (o.subjectName) return findByExactName(o.subjectName)
  if (o.subjectNames) return o.subjectNames.flatMap(findByExactName)
  return []
}
const resolveParent = (chain) => chain ? findByChain(chain) : []

for (const o of OPS) {
  o.preconditions = []
  o.postconditions = []
  o.resolved = { subjects: [], targetParents: [] }

  const subjects = resolveSubjects(o)
  o.resolved.subjects = subjects.map(brief)
  o.rendering = renderingVerdict(o.edgeTypes ?? [])

  if (o.action === 'create') {
    const parents = resolveParent(o.parentChain)
    o.resolved.targetParents = parents.map(brief)
    const p = parents[0]
    o.preconditions.push(p ? `父容器存在：\`${p.path}\`${isGov(p.node.id) ? ' ⚠️ 但它是 governance 锚点！' : ''}` : `❌ 父容器 \`${o.parentChain.join(' > ')}\` 不存在`)
    if (p) {
      const dup = childNames(p.node).has(o.newName)
      o.preconditions.push(dup ? `❌ 同名子节点已存在 → 不许重复新建` : `✓ 父容器下无同名子节点`)
    }
    o.preconditions.push(`新建后须分配 treeId + nodeRef，并建 treebind 边`)
    o.postconditions = [
      `新条目存在且挂对位置：path = ${(o.parentChain ?? []).join(' > ')} > ${o.newName}`,
      `其池节点 nodeRef 可解析，label 与名一致，tags 含自身名（仓库惯例）`,
      `新增 treebind 边：treebind:<parentTreeId>:<newTreeId>`,
    ]
  }

  if (o.action === 'rename') {
    const h = findByChain(o.subjectChain ?? [])[0] ?? resolveSubjects(o)[0]
    if (h) {
      o.resolved.subjects = [brief(h)]
      const parentPath = h.trail.slice(0, -1).map((x) => String(x.name)).join(' > ')
      o.sourcePath = h.path
      o.targetPath = parentPath + ' > ' + o.newName
      o.preconditions.push(`✓ 主体存在且唯一命中：\`${h.path}\``)
      o.preconditions.push(`✓ 主体不是 governance 锚点（${isGov(h.node.id) ? '❌ 是' : '否'}）`)
      const parent = h.parent
      const clash = parent ? childNames(parent).has(o.newName) : false
      o.preconditions.push(clash ? `❌ 同层已有名为 ${o.newName} 的兄弟` : `✓ 同层无重名`)
      o.preconditions.push(`改名须同步补池 ` + '`label`' + ` 并把新名并入 ` + '`tags`' + `（搜索依赖 tags）`)
      o.postconditions = [
        `树条目 name = ${o.newName}`,
        `池节点 label = ${o.newName}，且 tags 同时含新旧名`,
        `子树拓扑零变化（孩子数与全部后代 treeId 不变）`,
      ]
    }
  }

  if (o.action === 'move') {
    const h = subjects[0]
    if (h) {
      o.resolved.subjects = subjects.map(brief)
      const parentPath = h.trail.slice(0, -1).map((x) => String(x.name)).join(' > ')
      o.sourcePath = h.path
      o.preconditions.push(subjects.length === 1
        ? `✓ 主体唯一命中：\`${h.path}\``
        : `⚠️ 主体同名 **${subjects.length} 处** → 必须逐条指定 treeId，禁止按名批量移`)
      const sharedMounts = mountOf(h.node)
      if (sharedMounts > 1) {
        o.preconditions.push(`⛔ **这 ${subjects.length} 处其实指向同一个池实体** \`${h.node.nodeRef}\`（全树挂载 ${sharedMounts} 处）→ 「移动」只搬其中一个挂载点，另外 ${sharedMounts - 1} 处仍在原地；且 \`supplement\` 是树条目级的，只有一个挂载点能看到页签`)
      }
      o.preconditions.push(`✓ 当前父节点：\`${parentPath}\``)
      if (!o.targetParentChain) {
        o.preconditions.push(`⏸ 蓝图未给目标路径 → 规格不完整，无法求值前置条件`)
      } else {
        const tp = resolveParent(o.targetParentChain)
        o.resolved.targetParents = tp.map(brief)
        if (tp.length === 0) {
          o.preconditions.push(`❌ 目标父容器 \`${o.targetParentChain.join(' > ')}\` 不存在（需先 create）`)
        } else {
          const p = tp[0]
          o.targetPath = p.path + ' > ' + h.node.name
          o.preconditions.push(`✓ 目标父容器存在：\`${p.path}\`${isGov(p.node.id) ? ' ⚠️ governance 锚点' : ''}`)
          const clash = childNames(p.node).has(String(h.node.name))
          o.preconditions.push(clash ? `❌ 目标父容器下已有同名子节点` : `✓ 目标父容器下无同名`)
        }
      }
      o.postconditions = [
        `原父节点 childIds 不再含 \`${h.node.id}\`，孩子数 −1`,
        `新父节点 childIds 含 \`${h.node.id}\`，孩子数 +1`,
        `该子树全部后代逐 treeId 不变（提级/挂载不重生成 id）`,
        `treebind 边按 ` + '`treebind:<newParentTreeId>:<treeId>`' + ` 重建，且旧边删除`,
        `池节点未被删除、未被退休（只搬位置）`,
      ]
    } else if (o.status !== 'NEEDS_SPEC') {
      o.preconditions.push(`❌ 主体 \`${o.subjectName}\` 零命中 → 动作对象不存在`)
    }
  }

  if (o.action === 'rewire') {
    o.preconditions.push(subjects.length ? `主体命中 ${subjects.length} 处` : `❌ 主体 \`${o.subjectName}\` 零命中`)
    o.postconditions = [
      `边两端 nodeRef 都能在池中解析（否则悬空）`,
      `边 type ∈ 索引图白名单，或明确接受「仅在类型关系视图可见」`,
    ]
  }

  if (o.action === 'noop') {
    o.preconditions.push(`无需执行（${o.status === 'VOID' ? '蓝图假设不成立' : '已在位'}）`)
    o.postconditions.push(`确认零 diff：本操作不应对 data/ 产生任何变化`)
  }

  if (o.status === 'NEEDS_SPEC' || o.status === 'NEEDS_DECISION') {
    o.preconditions.push(`⏸ 待用户补规格/裁决：${o.decision ?? '目标路径或成员清单'}`)
  }
}

// ── 产物 ────────────────────────────────────────────────────────────────
const byId = (id) => OPS.find((o) => o.id === id)
const json = {
  generatedAt: new Date().toISOString(),
  source: 'data/tree-data.json (+ node-pool.json 只读)',
  schema: ['id', 'cluster', 'blueprint', 'action', 'status', 'dependsOn', 'preconditions', 'resolved', 'sourcePath', 'targetPath', 'relationChanges', 'edgeTypes', 'rendering', 'postconditions', 'note'],
  summary: {
    total: OPS.length,
    byAction: OPS.reduce((m, o) => { m[o.action] = (m[o.action] || 0) + 1; return m }, {}),
    byStatus: OPS.reduce((m, o) => { m[o.status] = (m[o.status] || 0) + 1; return m }, {}),
  },
  operations: OPS,
}
fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(OUT_DIR, 'phase1-operations.json'), JSON.stringify(json, null, 2), 'utf8')

const L = []
const add = (s) => L.push(s)
add('# 阶段一 Normalized Blueprint（簇 1 + 簇 4）')
add('')
add(`> 生成时间 ${json.generatedAt} · **只读**：本文件只是规格，未写任何 data/`)
add('> 源：\`data/tree-data.json\`（结构） + \`data/node-pool.json\`（nodeRef/tags 只读）')
add('> 机器可读版：\`outputs/tree-violation-scan/phase1-operations.json\`')
add('')
add('## 0. 操作总览（原始蓝图 18 行 → 规范化后 ' + OPS.length + ' 个操作单元）')
add('')
add('| opId | 簇 | action | 状态 | 说明 |')
add('|---|---|---|---|---|')
for (const o of OPS) {
  const s = { READY: '✅ READY', NEEDS_DECISION: '🔶 待裁决', NEEDS_SPEC: '📝 规格不全', BLOCKED_UNTIL_CREATE: '⏳ 等 create', VOID: '⛔ 无效' }[o.status] ?? o.status
  add(`| \`${o.id}\` | ${o.cluster} | \`${o.action}\` | ${s} | ${(o.blueprint ?? o.note ?? '').slice(0, 46)} |`)
}
add('')
add('## 1. 逐操作规格')
add('')
for (const o of OPS) {
  add(`### \`${o.id}\` · ${o.action} · ${o.status}`)
  add('')
  if (o.blueprint) add(`- **蓝图原文**：${o.blueprint}`)
  if (o.dependsOn?.length) add(`- **依赖**：${o.dependsOn.map((d) => `\`${d}\``).join(', ')}`)
  if (o.resolved.subjects.length) {
    add(`- **targetIds**（禁止只写名字）：`)
    for (const s of o.resolved.subjects) add(`  - treeId=\`${s.treeId}\` · nodeRef=\`${s.ref ?? '-'}\` · ${s.kids}孩${s.mounts > 1 ? ` · **该池实体全树挂载 ${s.mounts} 处**` : ''}${s.isGovernance ? ' · **⚠️ governance 锚点**' : ''}`)
  }
  if (o.resolved.targetParents.length) {
    add(`- **目标父容器**：`)
    for (const p of o.resolved.targetParents) add(`  - treeId=\`${p.treeId}\` · nodeRef=\`${p.ref ?? '-'}\` · ${p.kids}孩${p.isGovernance ? ' · **⚠️ governance 锚点**' : ''}`)
  }
  if (o.sourcePath) add(`- **sourcePath**：\`${o.sourcePath}\``)
  if (o.targetPath) add(`- **targetPath**：\`${o.targetPath}\``)
  if (o.relationChanges) add(`- **relationChanges**：${o.relationChanges.length ? JSON.stringify(o.relationChanges) : '无（不产生/不改边）'}`)
  add(`- **renderingContract**：${o.rendering.note}`)
  add('- **precondition**：')
  for (const p of o.preconditions) add(`  - ${p}`)
  add('- **postcondition**：')
  for (const p of o.postconditions) add(`  - ${p}`)
  if (o.note) add(`- 📌 ${o.note}`)
  add('')
}
add('## 2. 依赖顺序（拓扑）')
add('')
add('```text')
for (const o of OPS) {
  if (o.dependsOn?.length) o.dependsOn.forEach((d) => add(`${d}  →  ${o.id}`))
}
add('```')
add('')
add('## 3. 闸门')
add('')
add('- 本阶段**只到 Normalized Blueprint**：不 dry-run、不写盘、不 kill 5173、不碰他人改动。')
add('- `⛔ VOID` 的 4 项（C1-05 / C1-07 / C4-08 / C4-09）建议直接从阶段一划掉。')
add('- `📝 NEEDS_SPEC`（C1-06 / C4-10 / C4-11）与 `🔶 NEEDS_DECISION`（C1-01 / C1-03 / C1-04 / C1-08）需先裁决，否则 dry-run 无意义。')
add('- 可立即 dry-run 的范围：**C4-01 / C4-02 / C4-03 / C4-04 / C4-05 / C4-06 / C4-07**（2 create + 5 move）。')
add('')

const outMd = path.join(OUT_DIR, 'phase1-normalized-blueprint.md')
const md = L.join('\n')
const tmp = `${outMd}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, md, 'utf8')
try { fs.renameSync(tmp, outMd) } catch (e) { fs.writeFileSync(outMd, md, 'utf8'); try { fs.unlinkSync(tmp) } catch { /* noop */ } }

console.log(`规范化蓝图：${path.relative(ROOT, outMd)}（${OPS.length} 个操作单元）`)
console.log(`状态分布：${JSON.stringify(json.summary.byStatus)}`)
console.log(`动作分布：${JSON.stringify(json.summary.byAction)}`)
