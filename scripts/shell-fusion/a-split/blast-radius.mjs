/**
 * 只读：扫描器「封堵标点绕过」的爆半径评估。
 * 目的：量出把 、 和 / 纳入 A 类后会新增多少定罪，并按「双语对照 / 中文复合 / 其它」分类，
 *       避免一刀切把大量 legit 双语标签打成违规。
 */
import { loadState, flatten, log } from './common.mjs'

const state = loadState()
const { tree } = state
const flat = flatten(tree)

const CONN = /[与和及]/
const SLASH = /\//
const DUNHAO = /、/

// 现有 A 类口径（用于对比）
const FALSE_POSITIVE_A = /^(逻辑与 \(?&&\)?|逻辑与|逻辑或|按位与|与门|交互与通信|知识表示与推理|自动化规划与调度|服务注册与发现|Unix 和类 Unix|校验和 \/ checksum|软件符号与工具|发布与版本模型 \/ Release & Versioning Model|连接与线程状态|对象关系映射（ORM、O\/RM 和 O\/R 映射）)$/
const currentA = (n) => !FALSE_POSITIVE_A.test(n.trim()) && /与|和/.test(n.replace(/(参与|赠与|饱和|缓和|共和|总和|和尚|亲和)/g, ''))

/** 分类：斜杠/顿号两侧是否「中文概念 + 非中文（双语）」 */
function classify(n) {
  const parts = n.split(SLASH).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const hasCJK = (s) => /[\u4e00-\u9fff]/.test(s)
    const cjk = parts.filter(hasCJK)
    const nonCjk = parts.filter((s) => !hasCJK(s))
    if (cjk.length >= 1 && nonCjk.length >= 1) return '双语对照（中/英）'
    if (cjk.length >= 2) return '中文复合（斜杠连两个中文概念）'
    return '其它斜杠'
  }
  if (DUNHAO.test(n)) {
    const parts = n.split(DUNHAO).map((s) => s.trim()).filter(Boolean)
    const hasCJK = (s) => /[\u4e00-\u9fff]/.test(s)
    if (parts.filter(hasCJK).length >= 2) return '中文复合（顿号连两个中文概念）'
    return '其它顿号'
  }
  if (CONN.test(n)) return '连接词（与/和/及）'
  return '无连接符'
}

const rows = []
for (const f of flat) {
  const n = f.node.name ?? ''
  const hit = CONN.test(n) || SLASH.test(n) || DUNHAO.test(n)
  if (!hit) continue
  rows.push({ name: n, ref: f.node.nodeRef, id: f.node.id, kids: (f.node.children ?? []).length, cls: classify(n), inCurrentA: currentA(n) })
}

const byCls = new Map()
for (const r of rows) byCls.set(r.cls, (byCls.get(r.cls) ?? 0) + 1)

log(`树中共 ${flat.length} 条；名称含 与/和/及 或 / 或 、 的：${rows.length} 条\n`)
log('分类分布：')
for (const [k, v] of [...byCls.entries()].sort((a, b) => b[1] - a[1])) log(`  ${k}: ${v}`)
log(`\n现有 A 类口径定罪数：${rows.filter((r) => r.inCurrentA).length}`)
log(`若按用户新正则 /[与和及]|\\/|、/：${rows.length} 条（新增 ${rows.length - rows.filter((r) => r.inCurrentA).length} 条）`)

for (const cls of [...byCls.keys()].sort((a, b) => byCls.get(b) - byCls.get(a))) {
  const list = rows.filter((r) => r.cls === cls)
  log(`\n── ${cls}（${list.length}）──`)
  for (const r of list.slice(0, 40)) log(`  「${r.name}」孩=${r.kids}${r.inCurrentA ? ' [已在A类]' : ''}`)
  if (list.length > 40) log(`  … 另有 ${list.length - 40} 条`)
}

// 顿号/斜杠纯中文复合的完整清单（这才是真需要拆的）
const compound = rows.filter((r) => r.cls.startsWith('中文复合'))
log(`\n══ 真·中文复合（顿号/斜杠连接两个中文概念）${compound.length} 条 ══`)
for (const r of compound) log(`  「${r.name}」(${r.id}) ref=${r.ref} 孩=${r.kids}`)
