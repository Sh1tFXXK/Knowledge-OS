/**
 * apply-aop-split-fusion.mjs — 「AOP 原理」单卡拆解融合
 *
 * 背景（预检结论）：
 *  - k_vault_javaspringaopaop_1gf9np 的 rootContent（1073 字）是其 def tab（1230 字）的
 *    塌行复制版：换行全塌，标题与列表挤在一行（「### 传统方式的问题 - 代码重复：… - 维护困难：…」）。
 *  - 读态只渲染 rootContent（无 tab 条），违反壳约定（兄弟范式：rootContent=短总述，tabs 载细节）。
 *  - 正文引用「Spring AOP 执行机制（四阶段）」/「执行阶段」均非真实子节点名；真实子节点为
 *    aop_flow「AOP 执行流程」（已挂树：Spring > AOP > AOP 原理 > AOP 执行流程）。
 *
 * 动作（只动这一个 card，树/边/问题零写）：
 *  拆解：塌行正文 → 4 个语义 tab（def 定义 / impl 实现原理 / proxy 代理方式与选择 / flow 执行四阶段）
 *  融合：① rootContent 与 def tab 双份 → rootContent 收为短总述 + 两张总结图；
 *        ② 「Spring AOP vs AspectJ」段与静态/动态代理两段 verbatim 重复 → 去重并入 impl；
 *        ③ 悬挂引用统一修正为真实子节点名「AOP 执行流程」。
 *
 * 用法：node scripts/apply-aop-split-fusion.mjs        # dry-run（默认，只打印+跑门）
 *       node scripts/apply-aop-split-fusion.mjs --apply # 原子写 data/node-pool.json
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const APPLY = process.argv.includes('--apply')
const TARGET = 'k_vault_javaspringaopaop_1gf9np'

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

/* ════════ 目标内容（逐字源自干净 def tab，仅做去重融合与引用修正） ════════ */

const NEW_ROOT = `AOP 通过**动态代理**实现横切增强：代理类的方法 = 增强处理 + 被代理对象的方法。Spring AOP 在运行时由 ProxyFactory 按目标类是否实现接口选择代理策略（有接口 → JDK Proxy，无接口 → CGLIB）创建代理；调用经 AopProxy 拦截后，由 MethodInvocation 顺序执行拦截器链（Advice 织入代码），最终反射调用目标方法。代理方式详解见子节点「代理方式」；四阶段执行机制的播放视图见子节点「AOP 执行流程」。

![六术语总结](/notes/spring/aop-summary-terms.png)

![原理总结图](/notes/spring/aop-summary-flow.png)`

const TAB_DEF = `## AOP的存在价值

在传统OOP编程中，当系统中多个地方包含相同代码时，修改一处需要修改所有地方。AOP的出现解决了这个问题。

### 传统方式的问题
- 代码重复：多个地方包含相同代码
- 维护困难：修改一次需要修改所有地方

### AOP的解决方案
AOP专门用于处理系统中分布于各个模块中的交叉关注点的问题，如：
- 事务管理
- 安全检查
- 缓存
- 对象池管理

## 一句话总结

动态代理是**机制**，Spring AOP 是**基于动态代理实现的一套完整增强框架**：ProxyFactory → AopProxy → MethodInvocation → Interceptor Chain → Target。执行细节见子节点「AOP 执行流程」的四阶段机制视图。`

const TAB_IMPL = `## Spring AOP实现原理

Spring AOP通过动态生成代理类来实现，代理类的方法 = 增强处理 + 被代理对象的方法。

### 静态代理（AspectJ）
- 编译时增强
- 在编译阶段生成AOP代理类
- 需要特定的编译器

### 动态代理（Spring AOP）
- 运行时增强
- 在内存中临时生成AOP对象
- 无需特殊编译器`

const TAB_PROXY = `## 代理方式

**JDK动态代理**：
- 只支持接口代理
- 使用InvocationHandler和Proxy

**CGLIB动态代理**：
- 通过继承方式实现
- 可以代理类（不限于接口）
- 如果类被标记为final无法使用

## 代理选择原则
- 目标类实现接口 → JDK动态代理
- 目标类未实现接口 → CGLIB代理

详解见子节点「代理方式」。`

const TAB_FLOW = `## Spring AOP 执行四阶段

**创建代理对象 → 拦截目标对象 → 调用代理对象 → 调用目标对象**：getBean 创建实例后按 AOP 配置匹配切面规则，满足则 ProxyFactory 选择代理策略（有接口 JDK Proxy / 无接口 Cglib，可强制 Cglib）创建代理并缓存；用户调用被 AopProxy（实现 InvocationHandler）拦截，invoke() 触发 MethodInvocation.proceed() 顺序执行拦截器链；链中 MethodInterceptor（即 Advice 通知）执行织入代码，最后其 invoke() 反射调用目标方法。

机制化细节与播放视图见子节点「AOP 执行流程」。`

const NEW_TABS = [
  { id: 'def', label: '定义', content: TAB_DEF },
  { id: 'impl', label: '实现原理', content: TAB_IMPL },
  { id: 'proxy', label: '代理方式与选择', content: TAB_PROXY },
  { id: 'flow', label: '执行四阶段', content: TAB_FLOW },
]

/* ════════ 前置门 ════════ */

console.log('══ 前置门（现状必须为「塌行双份」形态）══')
const pool = readJson('node-pool.json')
const node = pool[TARGET]
ck(!!node, `目标实体存在 ${TARGET}`)
const card = node?.card ?? {}
ck(typeof card.rootContent === 'string' && card.rootContent.includes('### 传统方式的问题 - 代码重复'),
  'rootContent 为塌行形态（标题与列表同行）', (card.rootContent ?? '').slice(0, 60))
ck(Array.isArray(card.tabs) && card.tabs.length === 1 && card.tabs[0].id === 'def',
  'tabs 恰为 1 个 def', JSON.stringify((card.tabs ?? []).map((t) => t.id)))
ck((card.tabs?.[0]?.content ?? '').includes('## 一句话总结'), 'def tab 含「一句话总结」（干净源）')
ck((card.rootContent.match(/!\[[^\]]*\]\(\/notes\/spring\/aop-summary-/g) ?? []).length === 2,
  'rootContent 含 2 张总结图')
ck((card.rootContent).includes('「Spring AOP 执行机制（四阶段）」'),
  'rootContent 含待修正的悬挂引用「Spring AOP 执行机制（四阶段）」')

if (problems.length) {
  console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止（数据可能已被改过，勿重复 apply）`)
  process.exit(1)
}

/* ════════ 构建新 card（其余字段原样保留） ════════ */

const newCard = { ...card, rootContent: NEW_ROOT, tabs: NEW_TABS }
const newNode = { ...node, card: newCard }

/* ════════ 后置门（对新内容断言） ════════ */

console.log('\n══ 后置门（内容守恒 + 融合到位）══')
const allNew = [NEW_ROOT, ...NEW_TABS.map((t) => t.content)].join('\n')
const CONSERVE = [
  '代码重复', '维护困难', '事务管理', '安全检查', '对象池管理',
  'AspectJ', '编译时增强', '运行时增强', '特定的编译器',
  'InvocationHandler', '通过继承方式实现', 'final',
  '目标类实现接口 → JDK动态代理', '目标类未实现接口 → CGLIB代理',
  '创建代理对象 → 拦截目标对象 → 调用代理对象 → 调用目标对象',
  'ProxyFactory', 'AopProxy', 'MethodInvocation.proceed()', 'MethodInterceptor', '反射调用目标方法',
  '动态代理是**机制**',
]
for (const kw of CONSERVE) ck(allNew.includes(kw), `守恒：「${kw}」在位`)
ck((NEW_ROOT.match(/aop-summary-terms\.png/g) ?? []).length === 1 &&
   (NEW_ROOT.match(/aop-summary-flow\.png/g) ?? []).length === 1 &&
   !NEW_TABS.some((t) => t.content.includes('aop-summary-')),
  '两张总结图各恰好 1 次且只在 rootContent')
ck(!allNew.includes('「Spring AOP 执行机制（四阶段）」') && !allNew.includes('「执行阶段」'),
  '悬挂引用已清除（统一为真实子节点名「AOP 执行流程」）')
ck((allNew.match(/「AOP 执行流程」/g) ?? []).length === 3, '「AOP 执行流程」引用 ×3（root/def/flow）')
ck(!/^#{2,3} [^\n]* - [^\n]* - /m.test(allNew), '无塌行残留（标题行内不夹列表）')
ck(!allNew.includes('### Spring AOP vs AspectJ'), '重复段「Spring AOP vs AspectJ」已融合去重')
console.log('  ℹ️  主动丢弃：「### Spring AOP vs AspectJ」两条目与静态/动态代理段逐字重复，属去重而非丢失')

if (problems.length) {
  console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`)
  process.exit(1)
}

/* ════════ dry-run 报告 / apply ════════ */

console.log('\n══ 变更摘要 ══')
console.log(`  rootContent: ${card.rootContent.length} 字（塌行全文） → ${NEW_ROOT.length} 字（总述+2图）`)
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
