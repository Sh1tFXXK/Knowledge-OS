/**
 * apply-springmvc-principle-split.mjs — 「Spring MVC 原理」叶卡拆解融合（知识独立性版）
 *
 * 目标卡：k_vault_javaspringspringmvcspringmvc_1932hl（SpringMVC 壳下叶节点）
 * 病症（本批预检确认）：rootContent（886 字）= def tab（870 字干净版）的塌行复制 + 库 vault 标题行
 *   前缀「Spring MVC 原理 」；def tab 是唯一干净完整源（步骤单行 / 表格规整 / XML 缩进正常）。
 *
 * 拆解（逐字源自干净 def tab，按 '## ' 节边界程序化切分，零手抄）：
 *   flow 工作流程（7 步链）/ components 核心组件（5 行表）/ config 常见配置（XML + 注解）
 *   原 def tab 是「定义」名不副实（内容实为流程+组件+配置），撤除。
 * 融合：rootContent → 自含短总述（DispatcherServlet 中心调度主线 + 五组件 + 双配置路径），
 *   零跨节点指针（知识独立性口径，正则硬校验）。
 *
 * 用法：node scripts/apply-springmvc-principle-split.mjs        # dry-run（默认）
 *       node scripts/apply-springmvc-principle-split.mjs --apply
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), 'data')
const APPLY = process.argv.includes('--apply')
const TARGET = 'k_vault_javaspringspringmvcspringmvc_1932hl'
const PTR_RE = /详见|见子节点|见「|参见|另见/

const NEW_ROOT = '**Spring MVC** 的请求处理以 **DispatcherServlet** 为中心调度：请求到达后由 HandlerMapping 按 URL 定位 Handler（Controller），HandlerAdapter 适配调用并返回 ModelAndView，再经 ViewResolver 解析视图名、View 依 Model 渲染，最终返回响应。五大核心组件各司其职；配置上有 web.xml 声明式注册与 Spring Boot 自动装配（@EnableWebMvc）两条路径。'

const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'))
function writeJsonAtomic(name, value) {
  const target = path.join(DATA, name)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, target)
}
const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }

console.log('══ 前置门（塌行双份形态 + 干净源定位）══')
const pool = readJson('node-pool.json')
const card = pool[TARGET]?.card
ck(!!card, `目标实体存在 ${TARGET}`)
const tabs = card?.tabs ?? []
ck(tabs.length === 1 && tabs[0].id === 'def', '现状=单 def tab（未拆）', JSON.stringify(tabs.map((t) => t.id)))
const defSrc = tabs[0]?.content ?? ''
const root = card.rootContent ?? ''
ck(root.startsWith('Spring MVC 原理 \n'), 'rootContent 带库 vault 标题行前缀（塌行版特征）')
ck(root.length > defSrc.length, `root（${root.length}）> def（${defSrc.length}）双份成立`)
// 塌行证据：root 里步骤行换行被吃掉 / 表格行前导空格
ck(/\*\*渲染视图\*\*：\nView根据Model/.test(root) && !/\*\*渲染视图\*\*：\nView根据Model/.test(defSrc), '塌行特征命中（root 步骤行被拆行、def 单行）')
// 干净源三节齐
for (const h of ['## 工作流程', '## 核心组件', '## 常见配置']) ck(defSrc.includes(h), `干净源含节「${h}」`)
// rootContent 信息不丢：三节关键锚点在 root 也在（塌行但内容未丢节）
for (const w of ['请求到达', '处理器适配', '返回响应', 'DispatcherServlet | 前端控制器', 'EnableWebMvc', 'url-pattern'])
  ck(root.includes(w), `root 锚点守恒检查：「${w}」在塌行版中亦在（无丢节）`)

if (problems.length) { console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止`); process.exit(1) }

// ── 程序化切节（零手抄）──
const parts = defSrc.split(/(?=^## )/m).filter((p) => p.trim().length > 0)
ck(parts.length === 3, `干净源按 '## ' 切出 3 节`, `got=${parts.length}`)
const heads = parts.map((p) => p.split('\n')[0].trim())
ck(JSON.stringify(heads) === JSON.stringify(['## 工作流程', '## 核心组件', '## 常见配置']), '节序=工作流程/核心组件/常见配置', JSON.stringify(heads))
ck(parts.join('') === defSrc, '切节无损（join 逐字节还原 def 源）')
const [flowC, componentsC, configC] = parts.map((p) => p.trim())

const NEW_TABS = [
  { id: 'flow', label: '工作流程', content: flowC },
  { id: 'components', label: '核心组件', content: componentsC },
  { id: 'config', label: '常见配置', content: configC },
]

if (problems.length) { console.log(`\n⛔ 切节失败，中止`); process.exit(1) }
const newCard = { ...card, rootContent: NEW_ROOT, tabs: NEW_TABS }

console.log('\n══ 后置门（守恒 + 独立性 + 形态）══')
const allNew = [NEW_ROOT, ...NEW_TABS.map((t) => t.content)].join('\n')
ck(!PTR_RE.test(allNew), '全卡零跨节点指针（详见/见子节点/见「/参见/另见 均无）')
for (const w of ['**请求到达**', '**处理器映射**', '**处理器适配**', '**执行处理器**', '**视图解析**', '**渲染视图**', '**返回响应**'])
  ck(flowC.includes(w), `flow 七步守恒：${w}`)
for (const w of ['| DispatcherServlet | 前端控制器，整个流程的中心 |', '| HandlerMapping |', '| Controller |', '| ViewResolver |', '| View | 负责渲染视图 |'])
  ck(componentsC.includes(w), `components 表格守恒：${w.slice(0, 30)}`)
for (const w of ['```xml', '<servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>', '<url-pattern>/</url-pattern>', '@EnableWebMvc'])
  ck(configC.includes(w), `config 配置守恒：${w.slice(0, 40)}`)
ck((allNew.match(/```xml/g) ?? []).length === 1, 'xml 代码块全卡恰好 1 份（config tab）')
ck(NEW_ROOT.includes('中心调度') && NEW_ROOT.includes('ModelAndView') && !NEW_ROOT.includes('##') && !/^\d\. /m.test(NEW_ROOT), '新总述=自含概述（无标题/无步骤列表）')
ck(NEW_ROOT.length >= 120 && NEW_ROOT.length <= 260, `新总述长度适中（${NEW_ROOT.length} 字）`)
ck(!NEW_ROOT.startsWith('Spring MVC 原理') && !NEW_ROOT.includes('| 组件 |'), '塌行版残留清除（无库标题行/无表格）')

if (problems.length) { console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`); process.exit(1) }

console.log('\n══ 变更摘要 ══')
console.log(`  rootContent: ${root.length} 字塌行双份 → ${NEW_ROOT.length} 字自含总述`)
console.log(`  tabs: 1（def 名不副实）→ 3（flow ${flowC.length} / components ${componentsC.length} / config ${configC.length} 字）`)
if (!APPLY) { console.log('\n(dry-run，未写盘。加 --apply 生效）'); process.exit(0) }

const before = Object.keys(pool).length
pool[TARGET] = { ...pool[TARGET], card: newCard }
ck(Object.keys(pool).length === before, `池键数不变 ${before}`)
writeJsonAtomic('node-pool.json', pool)
console.log('\n💾 已原子写 data/node-pool.json')

const disk = readJson('node-pool.json')
const dc = disk[TARGET]?.card ?? {}
console.log('\n══ 回读复验 ══')
ck(dc.rootContent === NEW_ROOT, '磁盘 rootContent 逐字节等于新总述')
ck(JSON.stringify(dc.tabs) === JSON.stringify(NEW_TABS), '磁盘 tabs 逐字节等于新 tabs')
ck(!PTR_RE.test(dc.rootContent + JSON.stringify(dc.tabs)), '磁盘全卡零指针')

if (problems.length) { console.log(`\n⛔ 写后复验 ${problems.length} 项不过`); process.exit(1) }
console.log('\n✅ APPLY 完成，全部门绿')