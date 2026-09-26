/**
 * apply-springmvc-split-fusion.mjs — 「SpringMVC」容器壳卡拆解融合
 *
 * 背景（预检结论）：
 *  - k_java_fw_spring_mvc「SpringMVC」rootContent（616 字）= def tab（590 字干净版）的塌行复制版
 *    （「SpringMVC ## \n什么是Spring MVC Spring MVC是…」标题与正文同行、列表带前导空格）。
 *  - 该节点是容器壳（7 子节点：Spring MVC 原理 / SpringMVC 请求链路 / DispatcherServlet /
 *    HandlerMapping / HandlerAdapter / ViewResolver / View），应守壳约定：rootContent=短总述，tabs 载细节。
 *  - 子节点内容健康且更深（原理卡含 HandlerAdapter 完整链 + 组件表 + 配置；请求链路卡有 mermaid 图），
 *    壳卡四段（定义/核心组件/工作流程/常用注解）为概念性总览 → 拆解为 tab，互指子节点。
 *
 * 动作（只动这一个 card，树/边/问题零写）：
 *  拆解：塌行正文 → 4 个语义 tab（def 定义 / components 核心组件 / flow 工作流程 / annotations 常用注解）
 *  融合：rootContent 收为短总述（壳范式），含子节点指针；正文逐字源自干净 def tab。
 *
 * 用法：node scripts/apply-springmvc-split-fusion.mjs        # dry-run
 *       node scripts/apply-springmvc-split-fusion.mjs --apply # 原子写 data/node-pool.json
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const APPLY = process.argv.includes('--apply')
const TARGET = 'k_java_fw_spring_mvc'
const TARGET_TREE = 'tree_java_fw_spring_mvc'

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

/* ════════ 目标内容（逐字源自干净 def tab） ════════ */

const NEW_ROOT = `**Spring MVC** 是 Spring 框架的一部分：基于 Java 实现的 MVC 设计模式轻量级 Web 框架。请求统一由 **DispatcherServlet**（前端控制器）分发——HandlerMapping 定位 Controller 处理业务，返回 ModelAndView 后经 ViewResolver 解析视图呈现给用户。各组件逐一详解见子节点（DispatcherServlet / HandlerMapping / HandlerAdapter / ViewResolver / View）；含 HandlerAdapter 的完整调用链与配置见子节点「Spring MVC 原理」，请求链路图解见子节点「SpringMVC 请求链路」。`

const TAB_DEF = `## 什么是Spring MVC

Spring MVC是Spring框架的一部分，是一个基于Java实现的MVC设计模式的轻量级Web框架。`

const TAB_COMPONENTS = `## 核心组件

1. **DispatcherServlet**：前端控制器，负责请求分发
2. **HandlerMapping**：处理器映射器，找到具体的Controller
3. **Controller**：控制器，处理业务逻辑
4. **ViewResolver**：视图解析器，解析视图

各组件的逐一详解见子节点（DispatcherServlet / HandlerMapping / HandlerAdapter / ViewResolver / View）。`

const TAB_FLOW = `## 工作流程

1. 用户发送请求到DispatcherServlet
2. DispatcherServlet调用HandlerMapping
3. HandlerMapping返回具体的Controller
4. Controller调用业务处理方法
5. 返回ModelAndView
6. ViewResolver解析视图
7. 返回最终视图给用户

含 HandlerAdapter 的完整调用链见子节点「Spring MVC 原理」；请求链路图解见子节点「SpringMVC 请求链路」。`

const TAB_ANNOTATIONS = `## 常用注解

- @Controller：标记控制器类
- @RequestMapping：请求映射
- @GetMapping：GET请求映射
- @PostMapping：POST请求映射
- @RequestParam：请求参数绑定
- @PathVariable：路径变量
- @RequestBody：请求体绑定
- @ResponseBody：响应体`

const NEW_TABS = [
  { id: 'def', label: '定义', content: TAB_DEF },
  { id: 'components', label: '核心组件', content: TAB_COMPONENTS },
  { id: 'flow', label: '工作流程', content: TAB_FLOW },
  { id: 'annotations', label: '常用注解', content: TAB_ANNOTATIONS },
]

/* ════════ 前置门 ════════ */

console.log('══ 前置门（现状必须为「塌行双份」形态）══')
const pool = readJson('node-pool.json')
const node = pool[TARGET]
ck(!!node, `目标实体存在 ${TARGET}`)
const card = node?.card ?? {}
ck(typeof card.rootContent === 'string' && card.rootContent.startsWith('SpringMVC ##'),
  'rootContent 为塌行形态（SpringMVC ## 开头）', (card.rootContent ?? '').slice(0, 40))
ck(card.rootContent.includes('@ResponseBody') && card.rootContent.includes('返回最终视图给用户'),
  'rootContent 含全部四段（定义/组件/流程/注解）的塌行内容')
ck(Array.isArray(card.tabs) && card.tabs.length === 1 && card.tabs[0].id === 'def',
  'tabs 恰为 1 个 def', JSON.stringify((card.tabs ?? []).map((t) => t.id)))
ck((card.tabs?.[0]?.content ?? '').includes('## 什么是Spring MVC'), 'def tab 为干净源')

// 引用真实性：新文本引用的子节点名必须真实挂在目标节点下（只读 tree-data.json）
const tree = readJson('tree-data.json')
let targetTreeNode = null
const walk = (n) => { if (n.id === TARGET_TREE) targetTreeNode = n; for (const c of n.children ?? []) walk(c) }
walk(tree)
const childNames = (targetTreeNode?.children ?? []).map((c) => c.name)
ck(childNames.includes('Spring MVC 原理') && childNames.includes('SpringMVC 请求链路'),
  '引用目标「Spring MVC 原理」「SpringMVC 请求链路」为真实子节点', JSON.stringify(childNames))
ck(['DispatcherServlet', 'HandlerMapping', 'HandlerAdapter', 'ViewResolver', 'View'].every((x) => childNames.includes(x)),
  '五个组件子节点均在树')

if (problems.length) {
  console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止（数据可能已被改过，勿重复 apply）`)
  process.exit(1)
}

/* ════════ 构建新 card（其余字段原样保留） ════════ */

const newCard = { ...card, rootContent: NEW_ROOT, tabs: NEW_TABS }
const newNode = { ...node, card: newCard }

/* ════════ 后置门（内容守恒 + 融合到位） ════════ */

console.log('\n══ 后置门（内容守恒 + 融合到位）══')
const allNew = [NEW_ROOT, ...NEW_TABS.map((t) => t.content)].join('\n')
const CONSERVE = [
  '什么是Spring MVC', '轻量级Web框架', 'MVC设计模式',
  'DispatcherServlet', '前端控制器，负责请求分发',
  'HandlerMapping', '处理器映射器，找到具体的Controller',
  'Controller', '控制器，处理业务逻辑',
  'ViewResolver', '视图解析器，解析视图',
  '用户发送请求到DispatcherServlet', '返回ModelAndView', '返回最终视图给用户',
  '@Controller', '@RequestMapping', '@GetMapping', '@PostMapping',
  '@RequestParam', '@PathVariable', '@RequestBody', '@ResponseBody',
]
for (const kw of CONSERVE) ck(allNew.includes(kw), `守恒：「${kw}」在位`)
ck(!allNew.includes('SpringMVC ##'), '塌行 marker「SpringMVC ##」已清除')
ck(!/\n +\d+\. /.test(allNew), '无前导空格塌行列表残留')
ck(NEW_ROOT.length < 400 && !NEW_ROOT.includes('##'), 'rootContent 为短总述且无标题塌行')
ck((allNew.match(/「Spring MVC 原理」/g) ?? []).length === 2 &&
   (allNew.match(/「SpringMVC 请求链路」/g) ?? []).length === 2,
  '子节点指针各 ×2（root/flow）')

if (problems.length) {
  console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`)
  process.exit(1)
}

/* ════════ dry-run 报告 / apply ════════ */

console.log('\n══ 变更摘要 ══')
console.log(`  rootContent: ${card.rootContent.length} 字（塌行全文） → ${NEW_ROOT.length} 字（壳总述）`)
console.log(`  tabs: [${card.tabs.map((t) => t.id)}] → [${NEW_TABS.map((t) => `${t.id}:${t.label}(${t.content.length}字)`).join(', ')}]`)
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

// 回读复验（独立读盘，不信内存）
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
