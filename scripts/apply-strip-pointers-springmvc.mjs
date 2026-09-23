/**
 * apply-strip-pointers-springmvc.mjs — 知识独立性修正批 2/2：剥除「SpringMVC」壳卡导航话术
 *
 * 背景：用户新规——卡内容保持知识独立性，「详见/见子节点」类跨节点指针是外部逻辑，
 * 由系统（树结构）承担，不进正文。bcf4c4e 批注入的 3 处指针句逐句剥除：
 *  root×1「各组件逐一详解见子节点…调用链与配置见子节点…请求链路图解见子节点…」、
 *  components×1、flow×1
 *
 * 手术方式：精确整句 replace（计数必须=1），非整句知识内容零触碰。
 *
 * 用法：node scripts/apply-strip-pointers-springmvc.mjs        # dry-run
 *       node scripts/apply-strip-pointers-springmvc.mjs --apply
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), 'data')
const APPLY = process.argv.includes('--apply')
const TARGET = 'k_java_fw_spring_mvc'
const PTR_RE = /详见|见子节点|见「|参见|另见/

const SURGERY = [
  ['root', null, '各组件逐一详解见子节点（DispatcherServlet / HandlerMapping / HandlerAdapter / ViewResolver / View）；含 HandlerAdapter 的完整调用链与配置见子节点「Spring MVC 原理」，请求链路图解见子节点「SpringMVC 请求链路」。'],
  ['tab', 'components', '\n\n各组件的逐一详解见子节点（DispatcherServlet / HandlerMapping / HandlerAdapter / ViewResolver / View）。'],
  ['tab', 'flow', '\n\n含 HandlerAdapter 的完整调用链见子节点「Spring MVC 原理」；请求链路图解见子节点「SpringMVC 请求链路」。'],
]

const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'))
function writeJsonAtomic(name, value) {
  const target = path.join(DATA, name)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, target)
}
const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }

console.log('══ 前置门（3 处指针句各恰好 1 次）══')
const pool = readJson('node-pool.json')
const card = pool[TARGET]?.card
ck(!!card, `目标实体存在 ${TARGET}`)
const tabs = card?.tabs ?? []
ck(JSON.stringify(tabs.map((t) => t.id)) === JSON.stringify(['def', 'components', 'flow', 'annotations']), 'tabs=[def/components/flow/annotations]（bcf4c4e 后形态）')

let newRoot = card.rootContent
const newTabContent = {}
for (const [kind, id, sentence] of SURGERY) {
  const text = kind === 'root' ? newRoot : (tabs.find((t) => t.id === id)?.content ?? '')
  const hit = text.split(sentence).length - 1
  ck(hit === 1, `${kind === 'root' ? 'root' : 'tab:' + id} 指针句恰好 1 次`, `hit=${hit}`)
  const stripped = text.split(sentence).join('')
  if (kind === 'root') newRoot = stripped; else newTabContent[id] = stripped
}
ck(newRoot.endsWith('解析视图呈现给用户。'), 'root 剥后收束于知识句', JSON.stringify(newRoot.slice(-30)))

if (problems.length) { console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止`); process.exit(1) }

const NEW_TABS = tabs.map((t) => (newTabContent[t.id] !== undefined ? { ...t, content: newTabContent[t.id] } : t))
const newCard = { ...card, rootContent: newRoot, tabs: NEW_TABS }

console.log('\n══ 后置门（独立性 + 守恒 + 形态）══')
const allNew = [newRoot, ...NEW_TABS.map((t) => t.content)].join('\n')
ck(!PTR_RE.test(allNew), '全卡零跨节点指针（详见/见子节点/见「/参见/另见 均无）')
ck(newRoot.includes('**Spring MVC** 是 Spring 框架的一部分') && newRoot.includes('**DispatcherServlet**（前端控制器）'), 'root 知识内容原样')
for (const w of ['**DispatcherServlet**', '**HandlerMapping**', '**Controller**', '**ViewResolver**'])
  ck(NEW_TABS.find((t) => t.id === 'components').content.includes(w), `components 组件块守恒：${w}`)
ck(NEW_TABS.find((t) => t.id === 'flow').content.includes('用户发送请求到DispatcherServlet') && NEW_TABS.find((t) => t.id === 'flow').content.includes('返回最终视图给用户'), 'flow 七步链守恒（两端锚点）')
ck(NEW_TABS.find((t) => t.id === 'def').content === tabs.find((t) => t.id === 'def').content && NEW_TABS.find((t) => t.id === 'annotations').content === tabs.find((t) => t.id === 'annotations').content, 'def / annotations 零触碰（本来就无指针）')
ck(card.rootContent.length - newRoot.length >= SURGERY[0][2].length, 'root 仅减不增')

if (problems.length) { console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`); process.exit(1) }

console.log('\n══ 变更摘要 ══')
console.log(`  root: ${card.rootContent.length}→${newRoot.length} 字；tabs: components ${tabs[1].content.length}→${NEW_TABS[1].content.length} / flow ${tabs[2].content.length}→${NEW_TABS[2].content.length}（def/compare 不动）`)
if (!APPLY) { console.log('\n(dry-run，未写盘。加 --apply 生效）'); process.exit(0) }

const before = Object.keys(pool).length
pool[TARGET] = { ...pool[TARGET], card: newCard }
ck(Object.keys(pool).length === before, `池键数不变 ${before}`)
writeJsonAtomic('node-pool.json', pool)
console.log('\n💾 已原子写 data/node-pool.json')

const disk = readJson('node-pool.json')
const dc = disk[TARGET]?.card ?? {}
console.log('\n══ 回读复验 ══')
ck(dc.rootContent === newRoot, '磁盘 rootContent 逐字节等于剥后文本')
ck(JSON.stringify(dc.tabs) === JSON.stringify(NEW_TABS), '磁盘 tabs 逐字节等于剥后 tabs')
ck(!PTR_RE.test(dc.rootContent + JSON.stringify(dc.tabs)), '磁盘全卡零指针')

if (problems.length) { console.log(`\n⛔ 写后复验 ${problems.length} 项不过`); process.exit(1) }
console.log('\n✅ APPLY 完成，全部门绿')
