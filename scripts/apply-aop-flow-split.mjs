/**
 * apply-aop-flow-split.mjs — 「AOP 执行流程」叶卡拆解融合（知识独立性版）
 *
 * 目标卡：aop_flow（AOP 原理子节点，树 tree_vault_javaspringaopaop_1xhl6o）
 * 病症（预检确认）：rootContent（470 字单行塌行版，含标题前缀「Spring AOP 执行机制（四阶段） 」）
 *   = def tab（451 字干净三段版）的塌行双份；且源文自带 vault 原生跨库指针
 *   「…见「Spring Framework 模块（维基）→ 面向切面编程框架」」（知识独立性违规）。
 *
 * 拆解（逐字源自干净 def tab，按 \n\n 程序化切段）：
 *   flow 执行主线（执行流链 + 机制视图播放句）
 *   ring 调用环（flowchart 闭环描述）
 *   concepts 概念本体（九术语清单保留，指针从句剥除——剥导航话术、保知识性内容）
 * 融合：rootContent → 自含短总述（主线 + 闭环），零跨节点指针。
 *
 * 用法：node scripts/apply-aop-flow-split.mjs        # dry-run（默认）
 *       node scripts/apply-aop-flow-split.mjs --apply
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), 'data')
const APPLY = process.argv.includes('--apply')
const TARGET = 'aop_flow'
const PTR_RE = /详见|见子节点|见「|参见|另见/

const NEW_ROOT = 'Spring AOP 的执行主线：getBean 匹配切面规则后，ProxyFactory 按策略（有接口 JDK / 无接口 Cglib）创建代理并缓存；用户调用被 AopProxy（实现 InvocationHandler）拦截，MethodInvocation.proceed() 顺序执行拦截器链，链中 MethodInterceptor（即 Advice）执行织入代码，最终反射调用目标方法。返回值再沿链回传（拦截器 → 链 → AopProxy → 代理 → 调用方），形成完整调用闭环。'
const NEW_CONCEPTS = 'AOP 概念本体（九术语）：切面 / 连接点 / 通知 / 切入点 / 引入 / 目标对象 / 织入 / 代理对象 / 织入代码。'
const SOURCE_PTR_CLAUSE = 'AOP 概念本体（切面/连接点/通知/切入点/引入/目标对象/织入/代理对象/织入代码）见「Spring Framework 模块（维基）→ 面向切面编程框架」。'

const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'))
function writeJsonAtomic(name, value) {
  const target = path.join(DATA, name)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, target)
}
const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }

console.log('══ 前置门（塌行双份形态 + 源生指针定位）══')
const pool = readJson('node-pool.json')
const card = pool[TARGET]?.card
ck(!!card, `目标实体存在 ${TARGET}`)
const tabs = card?.tabs ?? []
ck(tabs.length === 1 && tabs[0].id === 'def', '现状=单 def tab（未拆）', JSON.stringify(tabs.map((t) => t.id)))
const defSrc = tabs[0]?.content ?? ''
const root = card.rootContent ?? ''
ck(root.startsWith('Spring AOP 执行机制（四阶段） '), 'rootContent 带标题前缀（塌行版特征）')
ck(!root.includes('\n\n') && defSrc.split('\n\n').length === 3, 'root 单行塌行 / def 干净三段（双份成立）')
ck(defSrc.includes(SOURCE_PTR_CLAUSE), '源生指针从句定位（def tab 内恰好存在）')
ck(!PTR_RE.test(NEW_ROOT) && !PTR_RE.test(NEW_CONCEPTS), '新撰写文本预检零指针')

if (problems.length) { console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止`); process.exit(1) }

// ── 程序化切段（零手抄）──
const parts = defSrc.split('\n\n')
ck(parts.length === 3, `def 按 \\n\\n 切出 3 段`, `got=${parts.length}`)
ck(parts.join('\n\n') === defSrc, '切段无损（join 逐字节还原 def 源）')
const [flowP, conceptsP, ringP] = parts.map((p) => p.trim())
ck(flowP.startsWith('Spring AOP 的完整执行流'), '段1=执行流')
ck(conceptsP === SOURCE_PTR_CLAUSE, '段2=概念本体指针句（将被知识化重写）')
ck(ringP.startsWith('**调用环（flowchart）**'), '段3=调用环')

if (problems.length) { console.log(`\n⛔ 切段失败，中止`); process.exit(1) }

const NEW_TABS = [
  { id: 'flow', label: '执行主线', content: flowP },
  { id: 'ring', label: '调用环', content: ringP },
  { id: 'concepts', label: '概念本体', content: NEW_CONCEPTS },
]
const newCard = { ...card, rootContent: NEW_ROOT, tabs: NEW_TABS }

console.log('\n══ 后置门（守恒 + 独立性 + 形态）══')
const allNew = [NEW_ROOT, ...NEW_TABS.map((t) => t.content)].join('\n')
ck(!PTR_RE.test(allNew), '全卡零跨节点指针（含源生指针已剥）')
for (const w of ['getBean 匹配切面规则', 'ProxyFactory 按策略', 'AopProxy(InvocationHandler) 拦截', 'MethodInvocation.proceed()', 'MethodInterceptor(Advice)', '反射调用目标方法返回', '以机制视图播放'])
  ck(flowP.includes(w), `flow 主线守恒：${w}`)
for (const w of ['**循环执行**链中拦截器', '**返回值沿链回传**', '形成完整闭环'])
  ck(ringP.includes(w), `ring 闭环守恒：${w}`)
for (const w of ['切面', '连接点', '通知', '切入点', '引入', '目标对象', '织入', '代理对象', '织入代码'])
  ck(NEW_CONCEPTS.includes(w), `concepts 九术语守恒：${w}`)
ck(NEW_ROOT.includes('执行主线') && NEW_ROOT.includes('闭环') && !NEW_ROOT.includes('##'), '新总述=自含概述')
ck(NEW_ROOT.length >= 120 && NEW_ROOT.length <= 300, `新总述长度适中（${NEW_ROOT.length} 字）`)
ck(!NEW_ROOT.startsWith('Spring AOP 执行机制'), '标题前缀残留清除')

if (problems.length) { console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`); process.exit(1) }

console.log('\n══ 变更摘要 ══')
console.log(`  rootContent: ${root.length} 字塌行双份 → ${NEW_ROOT.length} 字自含总述`)
console.log(`  tabs: 1（def）→ 3（flow ${flowP.length} / ring ${ringP.length} / concepts ${NEW_CONCEPTS.length} 字，源生指针从句剥除）`)
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
