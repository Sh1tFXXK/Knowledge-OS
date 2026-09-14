/**
 * 阶段一（簇 1：OOP 类的分类重组 + 簇 4：错位平移与自嵌套解散）**只读预检**。
 *
 * 目的：把用户《全仓物理重定位与多维重构 Master Plan》里阶段一的每一行，
 * 逐条对照**真实数据**核对，输出偏差审查 —— 而不是照字面执行。
 * 用户蓝图反复出现同一类字面不可执行项（kind/边类型/端点不存在/目标容器不存在），
 * 照做只会制造悬空引用与「写了不渲染」的装饰数据。
 *
 * 只读：不写 data/。产物 outputs/tree-violation-scan/phase1-relocation-preflight.md
 *
 * 用法：node scripts/plan-phase1-relocation.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const OUT = path.join(OUT_DIR, 'phase1-relocation-preflight.md')

const rd = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'))
const tree = rd('tree-data.json')
const pool = rd('node-pool.json')
const edges = rd('knowledge-edges.json')

// ── 索引 ────────────────────────────────────────────────────────────────
const all = []
const byId = new Map()
;(function walk(node, trail) {
  const t = [...trail, node]
  all.push({ node, path: t.map((x) => String(x.name ?? '')).join(' > ') })
  byId.set(node.id, node)
  for (const c of node.children || []) walk(c, t)
})(tree, [])

const kids = (n) => (n.children || []).length
const isGov = (id) => String(id).startsWith('governance:')
const locate = (name) => all.filter((h) => String(h.node.name) === name)
const has = (name) => locate(name).length > 0

const chain = (s) => s.split('>').map((x) => x.trim()).filter(Boolean)
/**
 * 蓝图给的是**相对路径**（如 `面向对象 > 类`、`操作系统 > 零拷贝`），不以根 `知识宇宙` 开头，
 * 所以不能从根逐段下钻。正确做法：找**名字路径以该链结尾**的节点。
 * （最初写成从根下钻 → 整列「目标父容器不存在」全是假阳性。）
 */
const pathEndsWith = (names) => all.filter((h) => h.path === names.join(' > ') || h.path.endsWith(' > ' + names.join(' > ')))
const showKidsOf = (node, indent = '      ') => (node.children || []).map((c) => `${indent}· ${c.name}  [${kids(c)}孩]  ${c.id}${isGov(c.id) ? ' ⚠️' : ''}`)

// ── 蓝图阶段一行 ────────────────────────────────────────────────────────
const CLUSTER1 = [
  ['类的分类', '无（新建/重组）', '面向对象 > 类 > 类的分类'],
  ['抽象类', 'Java syntax > 修饰符 > 抽象类', '面向对象 > 类 > 类的分类 > 抽象类'],
  ['具体类', '面向对象 > 类（编程） > 分类 > 具体类', '面向对象 > 类 > 类的分类 > 具体类'],
  ['最终类', '面向对象 > 类（编程） > 分类 > 最终类', '面向对象 > 类 > 类的分类 > 最终类'],
  ['封闭类', '面向对象 > 类（编程） > 分类 > 封闭类', '面向对象 > 类 > 类的分类 > 封闭类'],
  ['内部类', '面向对象 > 类（编程） > 分类 > 局部类与内部类', '面向对象 > 类 > 类的分类 > 内部类'],
  ['局部类', '面向对象 > 类（编程） > 分类 > 局部类', '面向对象 > 类 > 类的分类 > 局部类'],
  ['匿名类', '面向对象 > 类（编程） > 分类 > 匿名类', '面向对象 > 类 > 类的分类 > 匿名类'],
  ['元类', '面向对象 > 类（编程） > 分类 > 元类', '面向对象 > 类 > 类的分类 > 元类'],
]
const CLUSTER4 = [
  ['管理程序', '程序分析 > … > 探查器类型 > 管理程序', '编译原理 > 执行 > 虚拟机 > 虚拟化技术 > 管理程序'],
  ['模拟器', '程序分析 > … > 探查器类型 > 模拟器', '编译原理 > 执行 > 虚拟机 > 虚拟化技术 > 模拟器'],
  ['select', '操作系统 > select与epoll', '系统组织 > 操作系统 > I/O 多路复用 > select / epoll'],
  ['epoll', '操作系统 > select与epoll', '系统组织 > 操作系统 > I/O 多路复用 > select / epoll'],
  ['零拷贝', '操作系统 > 零拷贝', '系统组织 > 操作系统 > 系统调用与 I/O > 零拷贝'],
  ['数据结构', '算法 > 数据结构 > 数据结构 > 线性结构…', '算法 > 数据结构 > [线性结构 / 树与堆…]'],
  ['备份与恢复', '数据库 > 备份与恢复 > 备份和恢复', '数据库 > 数据库备份与恢复'],
  ['物化视图', '（阶段一原文只写「纠正物理挂载」，未给路径）', '（未给）'],
  ['PipedInputStream', '（阶段一原文只写「纠正物理挂载」，未给路径）', '（未给）'],
]

const judgeRow = (name, claimFrom, claimTo) => {
  const hits = locate(name)
  const out = []
  if (hits.length === 0) {
    out.push(`- **『${name}』在树中不存在** → 该行动作对象缺失`)
  } else {
    hits.forEach((h) => {
      out.push(`- 真实落点：\`${h.path}\`  [${kids(h.node)}孩]  id=\`${h.node.id}\`${isGov(h.node.id) ? '  **⚠️ 治理 canonical 节点**' : ''}`)
    })
    if (hits.length > 1) out.push(`- ⚠️ 同名 **${hits.length} 处**（宇宙树不要求名字唯一，但「移动」必须逐处点名，否则动作歧义）`)
    if (claimFrom.includes('…') || claimFrom.includes('（')) {
      out.push('- 蓝图「现状」未给可比对路径，未做精确比对')
    } else {
      const ch = chain(claimFrom)
      const m = pathEndsWith(ch)
      out.push(`- 蓝图声称现状 \`${claimFrom}\` → ${m.length ? `**命中 ${m.length} 处，一致**` : '**不一致（见上列真实落点）**'}`)
    }
  }
  if (claimTo.includes('未给') || claimTo.includes('（未给）')) {
    out.push('- ⚠️ **蓝图未给目标路径** → 无法执行，需用户补规格')
  } else {
    const ch = chain(claimTo)
    const parent = ch.slice(0, -1)
    const hits = parent.length ? pathEndsWith(parent) : []
    if (parent.length === 0) {
      out.push('- 目标即根级，父容器无需核')
    } else if (hits.length === 0) {
      out.push(`- 目标父容器 \`${parent.join(' > ')}\` → **不存在 → 需新建该中间层**`)
    } else {
      const desc = hits.map((h) => `\`${h.path}\` [${kids(h.node)}孩]${isGov(h.node.id) ? ' **⚠️治理节点**' : ''}`).join(' ; ')
      out.push(`- 目标父容器 \`${parent.join(' > ')}\` → **存在**：${desc}`)
    }
  }
  return out
}

// ── 全局校验 ────────────────────────────────────────────────────────────
const depTypes = new Set(['uses', 'depends-on', 'needs-for'])
const assocTypes = new Set(['enables', 'leads-to', 'compares', 'relates-to'])
const edgeCensus = {}
for (const e of edges) edgeCensus[e.type] = (edgeCensus[e.type] || 0) + 1
const drawnTypes = [...depTypes, ...assocTypes]
const kindCensus = {}
for (const n of Object.values(pool)) {
  const k = n.kind === undefined ? '(无)' : n.kind
  kindCensus[k] = (kindCensus[k] || 0) + 1
}

const canonNodes = all.filter((h) => isGov(h.node.id))
// 精确到「最后一段名字等于 类」，避免把 `类（编程）` 也当命中
const oopDaLei = all.filter((h) => h.path.endsWith('编程范式 > 面向对象 > 类'))
const oopLeiBiancheng = all.filter((h) => h.path.endsWith('面向对象 > 类（编程）'))
const fenlei = all.filter((h) => h.path.endsWith('类（编程） > 分类'))
const javaclass = locate('Java类')

// ── 组装报告 ────────────────────────────────────────────────────────────
const L = []
const add = (s) => L.push(s)

add('# 阶段一（簇 1 + 簇 4）只读预检报告')
add('')
add('> 数据源 `data/tree-data.json` / `node-pool.json` / `knowledge-edges.json`（**只读**，未改动任何数据）')
add(`> 生成时间 ${new Date().toISOString()}`)
add(`> 树条目 ${all.length} · 池节点 ${Object.keys(pool).length} · 边 ${edges.length}`)
add('')
add('## 一、簇 1（OOP 类的分类重组）逐行核对')
add('')
for (const [name, from, to] of CLUSTER1) {
  add(`### 「${name}」`)
  add('')
  add(`- 蓝图动作：\`${from}\` → \`${to}\``)
  for (const line of judgeRow(name, from, to)) add(line)
  add('')
}

add('### 簇 1 关键结构事实（决定本簇可行性）')
add('')
add(`- 蓝图目标父节点 \`面向对象 > 类\`：`)
const dl = oopDaLei[0]
if (dl) {
  add(`  - \`${dl.path}\`  [${kids(dl.node)}孩]  id=\`${dl.node.id}\``)
  add(`  - **⚠️ 该 id 带 \`governance:canonical:\` 前缀，是治理 canonical 节点，不是普通工作容器**（全树此类节点 ${canonNodes.length} 个）`)
}
add(`- 蓝图目标容器名 \`类的分类\`：${has('类的分类') ? '已存在' : '**不存在**'}；而现有真正的分类容器是：`)
const fl = fenlei[0]
if (fl) {
  add(`  - \`${fl.path}\`  [${kids(fl.node)}孩]  id=\`${fl.node.id}\``)
  for (const line of showKidsOf(fl.node)) add(line)
}
if (oopLeiBiancheng[0]) {
  add(`- 蓝图把父容器写作 \`类\`，但真正的工作容器是 \`类（编程）\`：\`${oopLeiBiancheng[0].path}\` [${kids(oopLeiBiancheng[0].node)}孩] id=\`${oopLeiBiancheng[0].node.id}\``)
  for (const line of showKidsOf(oopLeiBiancheng[0].node)) add(line)
}
add(`- 蓝图称「平铺收拢 **13** 种类形态」；现有容器实有 **${fl ? kids(fl.node) : 0}** 个，其中蓝图**未列出**的既有形态：`)
if (fl) {
  const listed = new Set(['抽象类', '具体类', '最终类', '封闭类', '内部类', '局部类', '匿名类', '元类'])
  const extra = (fl.node.children || []).filter((c) => !listed.has(String(c.name)))
  add(`  - ${extra.map((c) => `\`${c.name}\``).join(' · ')}`)
}
add(`- 蓝图称现状有 \`局部类与内部类\` 容器：${has('局部类与内部类') ? '存在' : '**不存在**'}（实为 \`局部类\` 与 \`匿名类\` 两个独立兄弟）`)
add(`- Java 侧 \`Java类\` 子节点（同概念的多份副本所在）：`)
javaclass.forEach((h) => add(`  - \`${h.path}\`  [${kids(h.node)}孩]`))
add('')

add('## 二、簇 4（错位平移与自嵌套解散）逐行核对')
add('')
for (const [name, from, to] of CLUSTER4) {
  add(`### 「${name}」`)
  add('')
  add(`- 蓝图动作：\`${from}\` → \`${to}\``)
  for (const line of judgeRow(name, from, to)) add(line)
  add('')
}

add('## 三、簇 4「自嵌套解散」两条声明的实测（都不成立）')
add('')
const dsReal = byId.get('theory_domain_data_structures')
const dsCanon = byId.get('governance:canonical:n_6dgtsmpj')
add('### 3.1 蓝图称 `算法 > 数据结构 > 数据结构 > 线性结构…` 有内层壳 → **实际没有内层壳**')
add('')
if (dsReal) {
  add(`- 真容器 \`${all.find((h) => h.node === dsReal).path}\`  [${kids(dsReal)}孩]  id=\`${dsReal.id}\``)
  for (const line of showKidsOf(dsReal)) add(line)
  add('- **`线性结构` 已经是它的直接子节点** → 「解散内层容器、子节点提级」**无事可做**（早已是平的）')
}
if (dsCanon) {
  add(`- 同名兄弟（治理节点）\`${all.find((h) => h.node === dsCanon).path}\`  [${kids(dsCanon)}孩]  id=\`${dsCanon.id}\``)
  for (const line of showKidsOf(dsCanon)) add(line)
  add('- 真正的问题是**同名双胞并存**（治理节点 + 真容器），而不是自嵌套')
}
add(`- 蓝图目标里写的 \`树与堆\`：${has('树与堆') ? '存在' : '**全树零命中**'}`)
add('')
add('### 3.2 蓝图称 `数据库 > 备份与恢复 > 备份和恢复` 是双重嵌套 → **两个名字都零命中**')
add('')
add(`- 『备份与恢复』：${locate('备份与恢复').length} 处 · 『备份和恢复』：${locate('备份和恢复').length} 处`)
add('- 结论：该行**动作对象不存在**，无法执行（不是「去重」，而是「没有这个东西」）')
add('')

add('## 四、全局能力校验（决定「接线」与「工程问题节点」能否成立）')
add('')
add('### 4.1 边类型：索引图只画 7 种，其余**直接丢弃**')
add('')
add('- 源码事实：`src/core/explanation-index/indexGraphLayout.ts:683` `logicalRelationKind()` 只认两组白名单，')
add('  **返回 null 的边在调用处 `if (!kind) continue;` 被直接跳过**（第 980 / 1032 行）。')
add('- 白名单：依赖 `uses / depends-on / needs-for` · 关联 `enables / leads-to / compares / relates-to`')
add('')
add('| 蓝图要用的边类型 | 数据中现有条数 | 索引图是否绘制 | 结论 |')
add('|---|---|---|---|')
const blueprintTypes = ['implements', 'instance-of', 'solves', 'prevents', 'causes']
for (const t of blueprintTypes) {
  const cnt = edgeCensus[t] || 0
  const drawn = drawnTypes.includes(t)
  const verdict = cnt === 0 ? (drawn ? '白名单内但数据为 0' : '**数据与代码皆无 —— 写了也永不出现**') : drawn ? '可画' : '**有数据但不绘制（null 丢弃）**'
  add(`| \`${t}\` | ${cnt} | ${drawn ? '是' : '否'} | ${verdict} |`)
}
add('')
add('- 参考：数据里真实存在且**不**被索引图绘制的类型（前几名）')
const notDrawn = Object.entries(edgeCensus).filter(([t]) => !drawnTypes.includes(t)).sort((a, b) => b[1] - a[1]).slice(0, 8)
notDrawn.forEach(([t, c]) => add(`  - \`${t}\` = ${c}`))
add('- `implements` / `extends` 另有一条通路：类型关系视图（`TypeRelationKind` 只有 `Implements`/`Extends` 两个值）')
add('- ⚠️ 近名陷阱：白名单是 `relates-to`，而数据里是 `related-to`（19 条）→ 同样被丢弃')
add('')
add('### 4.2 `kind` 取值域：没有 `problem`')
add('')
add('| kind | 节点数 |')
add('|---|---|')
Object.entries(kindCensus).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => add(`| ${k} | ${v} |`))
add('')
add('- 结论：`kind: "problem"` **不是合法值**，写入不渲染、不校验 → 纯装饰。工程问题节点应改用 `tags`。')
add('')
add('### 4.3 `viewDimensions` 是真实字段，`grid`/`matrix` 是合法布局')
add('')
add('- 类型（`src/types.ts:126`）：`ViewDimension { id, name, color, hint?, scope?, sections: ViewSection[], groups? }`')
add('- `ViewSection { id, title?, layout, config?, atoms: AtomBinding[] }`')
add("- `SectionLayout = 'stack' | 'grid' | 'tree' | 'chain' | 'matrix' | 'btree'` → 蓝图说的 Grid / Matrix **合法**")
add('- 消费方：`DimensionCanvas.tsx` / `FocusStage.tsx` / `SubsystemStrip.tsx` / `projection.ts`（41 处引用）')
add('- ⚠️ 但 section 必须绑 `atoms`（指向池内原子），**不是随手写个标签就能成矩阵**；且 `migrateViewDimensions.ts` 说明字段有过历史形态')
add('')
add('### 4.4 验收关卡里的脚本名')
add('')
const auditNames = ['scripts/audit-batch.mjs', 'scripts/shell-fusion/audit-batch.mjs']
for (const f of auditNames) add(`- \`${f}\` → ${fs.existsSync(path.join(ROOT, f)) ? '存在' : '**不存在**'}`)
add('- 现有可替代的门：`scripts/scan-tree-violations.mjs`（定罪）· `scripts/data-hygiene-check.mjs`（数据源卫生）·')
add('  `scripts/shell-fusion/verify-batch2.mjs`（十组判据，含悬空引用）/ `diff-batch1-vs-backup.mjs`（备份差分）')
add('')
add('## 五、结论：阶段一不可照字面执行的点')
add('')
add('| # | 类别 | 具体 |')
add('|---|---|---|')
add('| 1 | 目标容器是治理节点 | `面向对象 > 类` 的 id 是 `governance:canonical:…`，0 孩；真正的工作容器是 `类（编程）`（7 孩） |')
add('| 2 | 需新建的中间层 | `类的分类`（0 命中）· `I/O 多路复用`（0 命中）· `系统调用与 I/O`（0 命中） |')
add('| 3 | 目标容器其实**已存在** | `虚拟化技术`（在 `编译原理 > 执行 > 虚拟机` 下，2 孩）· `算法 > 数据结构`（真容器 + 治理节点各一） → 别重复新建 |')
add('| 4 | 动作对象零命中 | `备份与恢复` / `备份和恢复` / `密封类` / `局部类与内部类` / `树与堆` 五个名字在树中**零命中** |')
add('| 5 | 自称的「自嵌套」不存在 | `算法 > 数据结构` 下 `线性结构` **已是直接子节点** → 「解散内层壳」无事可做；真问题是同名双胞（治理节点 + 真容器） |')
add('| 6 | 端点不存在 → 悬空边 | `Java 密封类` 不存在，`Java 密封类 --[implements]--> 封闭类` 必然悬空 |')
add('| 7 | 边类型永不渲染 | 蓝图主打的 `solves / prevents / causes` 数据与代码皆 0；`implements / instance-of` 有数据但**不进索引图** |')
add('| 8 | `kind: problem` 非法 | 取值域无 `problem`，应改用 `tags` |')
add('| 9 | 同名多挂载未点名 | `抽象类` 3 处、`内部类`/`最终类`/`匿名类` 各 2 处、`数据结构` 4 处 → 「移动」需逐处指定 id |')
add('| 10 | 规格缺口 | `物化视图` / `PipedInputStream` 阶段一要求「纠正挂载」但**未给目标路径** |')

const md = L.join('\n')
fs.mkdirSync(OUT_DIR, { recursive: true })
const tmp = `${OUT}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, md, 'utf8')
try {
  fs.renameSync(tmp, OUT)
} catch (err) {
  fs.writeFileSync(OUT, md, 'utf8')
  try { fs.unlinkSync(tmp) } catch { /* 忽略 */ }
  console.log(`⚠️ rename 被拒绝（${err.code}），已退化为原地覆盖写`)
}
console.log(`预检报告已写出：${path.relative(ROOT, OUT)}（${L.length} 行）`)
