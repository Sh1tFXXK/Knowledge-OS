/**
 * apply-collapse-severe-e2.mjs — 塌行重症批 E 卡 delta 修补（`/**` 星号配对吞行）
 *
 * 背景：E 卡（阻塞条件变量）解胶后读态仍漏出字面 `**`——`/** **关联于**` 中 `/**` 的
 * 两颗星与 `**关联于` 的前两颗配对，把「关联于 0 < 大小 且」吞进粗体、尾部漏出 `**`。
 * 源码本义是注释符 `/* *associated with* …`，故正确形态为 `/*` 单星 + 粗体「关联于」。
 * 本脚本只做这一处 delta（其余 5 卡修复已在 apply-collapse-severe-batch.mjs 落盘）。
 *
 * 用法：node scripts/apply-collapse-severe-e2.mjs [--apply]
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), 'data')
const APPLY = process.argv.includes('--apply')
const PTR_RE = /详见|见子节点|见「|参见|另见/
const problems = []
const ck = (c, s, a = '') => { console.log((c ? '  ✅ ' : '  ❌ ') + s + (c || !a ? '' : `  [actual: ${a}]`)); if (!c) problems.push(s) }

const pool = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'))
const keys = Object.keys(pool).length
console.log('══ 前置门/方案 ══')
const c = pool['k_wiki_en_monitor_synchronization_s12']?.card
ck(!!c, 'E 实体存在')
const PAIRS = [
  ['theStackIsNotEmpty /** **关联于** 0 < 大小 **且** 大小 <= 容量 */', 'theStackIsNotEmpty /* **关联于** 0 < 大小 **且** 大小 <= 容量 */', 1],
  ['theStackIsNotFull /** **关联于** 0 <= 大小 **和** 大小 < 容量 */', 'theStackIsNotFull /* **关联于** 0 <= 大小 **和** 大小 < 容量 */', 1],
]
let next = c.rootContent
for (const [o, n, cnt] of PAIRS) {
  const hit = next.split(o).length - 1
  ck(hit === cnt, `病灶在位：「${o.slice(0, 28)}…」×${cnt}`, String(hit))
  next = next.split(o).join(n)
}
const noStar = (s) => s.replace(/\*/g, '').replace(/\s+/g, '')
ck(noStar(next) === noStar(c.rootContent), '剥星剥空白后逐字守恒')
ck(!next.includes('****') && !next.includes('/**'), '无 **** 且无 /** 残留')
ck(!next.split('\n').some((l) => ((l.match(/\*\*/g) || []).length % 2) === 1), '每行 ** 计数全偶')
ck(!PTR_RE.test(next), '零指针')
if (problems.length) { console.log(`\n⛔ ${problems.length} 项未过门，未写入`); process.exit(1) }
if (!APPLY) { console.log('\n(dry-run) 全部门通过，加 --apply 落盘'); process.exit(0) }
c.rootContent = next
const target = path.join(DATA, 'node-pool.json')
const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, JSON.stringify(pool, null, 2), 'utf8')
fs.renameSync(tmp, target)
const back = JSON.parse(fs.readFileSync(target, 'utf8'))
const ok = back['k_wiki_en_monitor_synchronization_s12'].card.rootContent === next && Object.keys(back).length === keys
console.log((ok ? '\n✅ 写入并回读一致（键数守恒 ' + keys + '）' : '\n❌ 回读失败'))
process.exit(ok ? 0 : 1)
