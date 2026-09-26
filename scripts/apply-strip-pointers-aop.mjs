/**
 * apply-strip-pointers-aop.mjs — 知识独立性修正批 1/2：剥除「AOP 原理」卡导航话术
 *
 * 背景：用户新规——卡内容保持知识独立性，「详见/见子节点」类跨节点指针是外部逻辑，
 * 由系统（树结构）承担，不进正文。9673e04 批注入的 4 处指针句违规模样如下，逐句剥除：
 *  root×1「代理方式详解见子节点…播放视图见子节点…」、def×1、proxy×1、flow×1
 *
 * 手术方式：精确整句 replace（计数必须=1），非整句知识内容零触碰。
 *
 * 用法：node scripts/apply-strip-pointers-aop.mjs        # dry-run
 *       node scripts/apply-strip-pointers-aop.mjs --apply
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), 'data')
const APPLY = process.argv.includes('--apply')
const TARGET = 'k_vault_javaspringaopaop_1gf9np'
const PTR_RE = /详见|见子节点|见「|参见|另见/

// [字段定位, 待剥整句（逐字节）]
const SURGERY = [
  ['root', null, '代理方式详解见子节点「代理方式」；四阶段执行机制的播放视图见子节点「AOP 执行流程」。'],
  ['tab', 'def', '执行细节见子节点「AOP 执行流程」的四阶段机制视图。'],
  ['tab', 'proxy', '\n\n详解见子节点「代理方式」。'],
  ['tab', 'flow', '\n\n机制化细节与播放视图见子节点「AOP 执行流程」。'],
]
// root 句剥除后前面还有一个空格（「目标方法。 代理方式详解…」→ 需一并吃掉）
const ROOT_ALSO_STRIP_SPACE = true

const readJson = (n) => JSON.parse(fs.readFileSync(path.join(DATA, n), 'utf8'))
function writeJsonAtomic(name, value) {
  const target = path.join(DATA, name)
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8')
  fs.renameSync(tmp, target)
}
const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }

console.log('══ 前置门（4 处指针句各恰好 1 次）══')
const pool = readJson('node-pool.json')
const card = pool[TARGET]?.card
ck(!!card, `目标实体存在 ${TARGET}`)
const tabs = card?.tabs ?? []
ck(JSON.stringify(tabs.map((t) => t.id)) === JSON.stringify(['def', 'impl', 'proxy', 'flow']), 'tabs=[def/impl/proxy/flow]（9673e04 后形态）')

// 逐句定位并构建新文本
let newRoot = card.rootContent
const newTabContent = {}
for (const [kind, id, sentence] of SURGERY) {
  const text = kind === 'root' ? newRoot : (tabs.find((t) => t.id === id)?.content ?? '')
  const hit = text.split(sentence).length - 1
  ck(hit === 1, `${kind === 'root' ? 'root' : 'tab:' + id} 指针句恰好 1 次`, `hit=${hit}`)
  let stripped = text.split(sentence).join('')
  if (kind === 'root' && ROOT_ALSO_STRIP_SPACE) stripped = stripped.replace('目标方法。 \n', '目标方法。\n')
  if (kind === 'root') newRoot = stripped; else newTabContent[id] = stripped
}
ck(newRoot.includes('最终反射调用目标方法。\n\n![六术语总结]'), 'root 剥后收束干净（句号 → 空行 → 图）', JSON.stringify(newRoot.slice(-120)))

if (problems.length) { console.log(`\n⛔ 前置门 ${problems.length} 项不过，中止`); process.exit(1) }

const NEW_TABS = tabs.map((t) => (newTabContent[t.id] !== undefined ? { ...t, content: newTabContent[t.id] } : t))
const newCard = { ...card, rootContent: newRoot, tabs: NEW_TABS }

console.log('\n══ 后置门（独立性 + 守恒 + 形态）══')
const allNew = [newRoot, ...NEW_TABS.map((t) => t.content)].join('\n')
ck(!PTR_RE.test(allNew), '全卡零跨节点指针（详见/见子节点/见「/参见/另见 均无）')
ck(newRoot.includes('**动态代理**实现横切增强') && newRoot.includes('MethodInvocation 顺序执行拦截器链'), 'root 知识内容原样')
ck((newRoot.match(/!\[/g) ?? []).length === 2, 'root 两张总结图原样（×2）')
ck(NEW_TABS.find((t) => t.id === 'def').content.endsWith('Interceptor Chain → Target。'), 'def 剥后收束于知识句')
ck(NEW_TABS.find((t) => t.id === 'proxy').content.endsWith('目标类未实现接口 → CGLIB代理'), 'proxy 剥后收束于知识句')
ck(NEW_TABS.find((t) => t.id === 'flow').content.endsWith('反射调用目标方法。'), 'flow 剥后收束于知识句')
ck(NEW_TABS.find((t) => t.id === 'impl').content === tabs.find((t) => t.id === 'impl').content, 'impl tab 零触碰（本来就无指针）')
ck(card.rootContent.length - newRoot.length >= SURGERY[0][2].length, 'root 仅减不增')

if (problems.length) { console.log(`\n⛔ 后置门 ${problems.length} 项不过，中止（未写盘）`); process.exit(1) }

console.log('\n══ 变更摘要 ══')
console.log(`  root: ${card.rootContent.length}→${newRoot.length} 字；tabs: def ${tabs[0].content.length}→${NEW_TABS[0].content.length} / proxy ${tabs[2].content.length}→${NEW_TABS[2].content.length} / flow ${tabs[3].content.length}→${NEW_TABS[3].content.length}（impl 不动）`)
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
