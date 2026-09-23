/**
 * apply-springmvc-flow-split.mjs — 「SpringMVC 请求链路」卡拆解（知识独立性版）
 *
 * 背景（预检结论）：
 *  - k_vault_javaspring04springmvc_133lis「SpringMVC 请求链路」（叶节点）：
 *    rootContent（566 字）= def tab（607 字干净完整版）的塌行复制，且塌行吃掉了一段——
 *    「## Spring MVC 在做什么」下正文句在 rootContent 整段丢失，只剩空标题。
 *  - 用户口径：拆解时【不得注入「详见/见子节点」类跨节点指针】——知识保持独立，
 *    内部逻辑写在知识点里，外部逻辑（导航/关联）是系统（树）的职责。
 *
 * 动作（只动这一个 card，树/边/问题零写）：
 *  拆解：正文 → 4 个语义 tab（def 定义=在做什么+封装意义 / flow 请求主线=mermaid /
 *        objects 核心对象 / concurrency 并发理解），逐字源自干净 def tab
 *  融合：rootContent 收为自含短总述（零指针）；「在做什么」丢失段回补 def tab
 *
 * 用法：node scripts/apply-springmvc-flow-split.mjs        # dry-run
 *       node scripts/apply-springmvc-flow-split.mjs --apply # 原子写 data/node-pool.json
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const APPLY = process.argv.includes('--apply')
const TARGET = 'k_vault_javaspring04springmvc_133lis'

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'))
}
function writeJsonAtomic(name, value) {
  const target = path.join(DATA, name)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, target)
}

const problems = []
function ck(cond, label, actual = '') {
  if (cond) { console.log(`  ✅ ${label}`) } else { problems.push(label); console.log(`  ❌ ${label}  [actual: ${actual}]`) }
}

/* ════════ 目标内容（逐字源自干净 def tab；零跨节点指针） ════════ */

const NEW_ROOT = `**Spring MVC 请求链路**：一次 HTTP 请求在框架内的标准旅程——**DispatcherServlet** 统一接收请求，HandlerMapping 定位 Controller，HandlerAdapter 适配执行，最终经 ViewResolver / ResponseBody 产出响应。本质是把路由分发、参数绑定、返回值处理、视图解析从原始 Servlet 编程中拆成稳定的职责链。注意：Controller 默认常是单例，请求相关状态应留在方法参数、局部变量或请求作用域对象中，不要存入成员变量。`

const TAB_DEF = `## Spring MVC 在做什么

它把 Web 层从“原始 Servlet 编程”封装成“按路由、参数、返回值、视图协同工作”的请求处理框架。

## 封装意义

Spring MVC 把原本混杂在 Servlet 里的：

- 路由分发
- 参数绑定
- 返回值处理
- 视图解析

拆成了稳定的职责链。`

const TAB_FLOW = `## 请求主线

\`\`\`mermaid
flowchart LR
    A[HTTP Request] --> B[DispatcherServlet]
    B --> C[HandlerMapping]
    C --> D[Controller]
    D --> E[HandlerAdapter]
    E --> F[ViewResolver / ResponseBody]
    F --> G[HTTP Response]
\`\`\``

const TAB_OBJECTS = `## 核心对象

- \`DispatcherServlet\`：前端控制器
- \`HandlerMapping\`：请求到处理器的映射
- \`HandlerAdapter\`：适配不同处理器执行方式
- \`Controller\`：承载业务入口
- \`ViewResolver\`：解析视图`

const TAB_CONCURRENCY = `## 并发理解

Controller 默认常是单例，因此不要在成员变量里保存请求态数据。  
请求相关状态应留在方法参数、局部变量或请求作用域对象中。`

const NEW_TABS = [
  { id: 'def', label: '定义', content: TAB_DEF },
  { id: 'flow', label: '请求主线', content: TAB_FLOW },
  { id: 'objects', label: '核心对象', content: TAB_OBJECTS },
  { id: 'concurrency', label: '并发理解', content: TAB_CONCURRENCY },
]

/* ════════ 前置门 ════════ */

console.log('══ 前置门（现状必须为「塌行双份 + 丢段」形态）══')
const pool = readJson('node-pool.json')
const node = pool[TARGET]
ck(!!node, `目标实体存在 ${TARGET}`)
const card = node?.card ?? {}
ck(typeof card.rootContent === 'string' && card.rootContent.startsWith('SpringMVC 请求链路\n') &&
   card.rootContent.includes('## 请求主线') && !card.rootContent.includes('在做什么'),
  'rootContent 为塌行形态（标题行开头 + 整节「在做什么」被吃掉）', JSON.stringify((card.rootContent ?? '').slice(0, 30)))
ck(card.rootContent.includes('```mermaid') && card.rootContent.includes('拆成了稳定的职责链'),
  'rootContent 含 mermaid + 封装意义（塌行全文）')
ck(!card.rootContent.includes('它把 Web 层从'),
  'rootContent 缺「在做什么」正文句（塌行丢段，待回补）')
ck(Array.isArray(card.tabs) && card.tabs.length === 1 && card.tabs[0].id === 'def',
  'tabs 恰为 1 个 def', JSON.stringify((card.tabs ?? []).map((t) => t.id)))
ck((card.tabs?.[0]?.content ?? '').includes('它把 Web 层从“原始 Servlet 编程”封装成'),
  'def tab 为完整干净源（含「在做什么」正文句）')

if (problems.length) {
  console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止（数据可能已被改过，勿重复 apply）`)
  process.exit(1)
}

/* ════════ 构建新 card（其余字段原样保留） ════════ */

const newCard = { ...card, rootContent: NEW_ROOT, tabs: NEW_TABS }
const newNode = { ...node, card: newCard }

/* ════════ 后置门（内容守恒 + 独立性 + 融合到位） ════════ */

console.log('\n══ 后置门（内容守恒 + 知识独立性 + 融合到位）══')
const allNew = [NEW_ROOT, ...NEW_TABS.map((t) => t.content)].join('\n')
const CONSERVE = [
  '它把 Web 层从“原始 Servlet 编程”封装成“按路由、参数、返回值、视图协同工作”的请求处理框架。',
  'flowchart LR', 'A[HTTP Request] --> B[DispatcherServlet]', 'F --> G[HTTP Response]',
  '前端控制器', '请求到处理器的映射', '适配不同处理器执行方式', '承载业务入口', '解析视图',
  '路由分发', '参数绑定', '返回值处理', '视图解析', '拆成了稳定的职责链',
  'Controller 默认常是单例，因此不要在成员变量里保存请求态数据。',
  '请求相关状态应留在方法参数、局部变量或请求作用域对象中。',
]
for (const kw of CONSERVE) ck(allNew.includes(kw), `守恒：「${kw.slice(0, 24)}${kw.length > 24 ? '…' : ''}」在位`)
ck(!NEW_ROOT.includes('mermaid') && (allNew.match(/```mermaid/g) ?? []).length === 1,
  'mermaid 图恰好 1 份且仅在 flow tab')
const PTR = /详见|见子节点|见「|参见|另见/
ck(!PTR.test(allNew), '零跨节点指针（详见/见子节点/参见/另见 均无）')
ck(!NEW_ROOT.includes('##') && NEW_ROOT.length < 400, 'rootContent 为短总述且无标题塌行')
ck(!allNew.includes('请求链路\n ##'), '塌行 marker 已清除')

if (problems.length) {
  console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`)
  process.exit(1)
}

/* ════════ dry-run 报告 / apply ════════ */

console.log('\n══ 变更摘要 ══')
console.log(`  rootContent: ${card.rootContent.length} 字（塌行+丢段） → ${NEW_ROOT.length} 字（自含总述）`)
console.log(`  tabs: [${card.tabs.map((t) => t.id)}] → [${NEW_TABS.map((t) => `${t.id}:${t.label}(${t.content.length}字)`).join(', ')}]`)
console.log(`  回补：「在做什么」正文句入 def tab；mermaid 图迁 flow tab`)
console.log(`  card 其他字段保留: ${Object.keys(card).filter((k) => k !== 'rootContent' && k !== 'tabs').join(', ') || '(无)'}`)

if (!APPLY) {
  console.log('\n(dry-run，未写盘。加 --apply 生效）')
  process.exit(0)
}

const before = Object.keys(pool).length
pool[TARGET] = newNode
ck(Object.keys(pool).length === before, `池键数不变 ${before}`)
writeJsonAtomic('node-pool.json', pool)
console.log('\n💾 已原子写 data/node-pool.json')

const disk = readJson('node-pool.json')
const dCard = disk[TARGET]?.card ?? {}
console.log('\n══ 回读复验 ══')
ck(dCard.rootContent === NEW_ROOT, '磁盘 rootContent 逐字节等于新总述')
ck(JSON.stringify(dCard.tabs) === JSON.stringify(NEW_TABS), '磁盘 tabs 逐字节等于新 4 tab')
ck(Object.keys(disk).length === before, `磁盘池键数 ${before}`)

if (problems.length) {
  console.log(`\n⛔ 写后复验 ${problems.length} 项不过——请检查数据！`)
  process.exit(1)
}
console.log('\n✅ APPLY 完成，全部门绿')