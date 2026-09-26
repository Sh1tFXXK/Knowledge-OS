/**
 * 数据体检（Data Hygiene）：把运行态校验器报出的「可容忍但必须上报」告警，在数据源头上清零。
 *
 * 默认**只读**，只出报告；`--fix` 才写盘（写前自动备份到 data/backups/data-hygiene-<ISO>/）。
 *
 * 为什么要单独有这个脚本，而不是一条 `node -e`：
 *   1. **口径必须与 UI 一致**。告警文本来自 `src/knowledge/dataValidation.ts` 的
 *      `inspectNodePool()`，本脚本直接 import 它，不重写一份判断逻辑 —— 否则改了校验器忘了改这里，
 *      就会出现「脚本说干净、界面还在报警」。
 *   2. **空白 tabs 是合法的，不能一起修**。`card.tabs: []` 表示「仅入池、尚未填正文」，
 *      是系统支持的状态；真正要修的是 `tab.content` 非字符串（含键整个缺失）。
 *      把两者混为一谈会批量制造假的 `content: ""`。
 *   3. 补位要**保持键序**。同层兄弟 tab 的键序是 `id, label, content`，
 *      缺失的 `content` 必须插在 `label` 之后，而不是追加到末尾 —— 否则 diff 看起来奇怪、
 *      与既有数据风格不一致。
 *   4. 还要顺手核**格式契约**（无 BOM / 2 空格缩进 / 末尾无换行），这是本仓库的硬约定。
 *
 * 用法：
 *   node scripts/data-hygiene-check.mjs           # 只读报告
 *   node scripts/data-hygiene-check.mjs --fix     # 备份 + 补齐 + 复核
 */
import fs from 'node:fs';
import path from 'node:path';
import { inspectNodePool } from '../src/knowledge/dataValidation.ts';

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const FIX = process.argv.includes('--fix')
const DATA_FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
let problems = 0
const say = (ok, label, detail = '') => {
  console.log((ok ? '  ✓ ' : '  ✗ ') + label + (detail ? ' — ' + detail : ''))
  if (!ok) problems += 1
}

// ══════════════════════════════════════════════════════════════════════
// 1. 格式契约（无 BOM / 2 空格缩进 / 末尾无换行）
// ══════════════════════════════════════════════════════════════════════
console.log('══ 1. 格式契约 ══')
for (const f of DATA_FILES) {
  const buf = fs.readFileSync(path.join(DATA, f))
  const bom = buf[0] === 0xef
  const txt = buf.toString('utf8')
  const tail = buf.subarray(-1).toString('utf8')
  say(!bom && /\n  [^\s]/.test(txt) && tail !== '\n', `${f} 无BOM / 2空格缩进 / 末尾无换行`, `尾=${JSON.stringify(tail)}`)
}

// ══════════════════════════════════════════════════════════════════════
// 2. 运行态校验器口径（与 UI 告警同源）
// ══════════════════════════════════════════════════════════════════════
console.log('\n══ 2. 校验器口径（inspectNodePool，即界面告警来源）══')
const pool = rd(path.join(DATA, 'node-pool.json'))
const diag = inspectNodePool(pool)
say(diag.fatal === null, 'fatal 为空（节点池可用）', diag.fatal ?? '')
if (diag.warnings.length === 0) {
  console.log('  ✓ warnings 为空 —— 界面上不会出现任何数据体检提示')
} else {
  for (const w of diag.warnings) console.log('  ⚠ ' + w)
}

// ══════════════════════════════════════════════════════════════════════
// 3. 精确定位：要修的 tab vs 合法的空白 tabs（两者必须分开统计）
// ══════════════════════════════════════════════════════════════════════
const offenders = []
let emptyTabsNodes = 0
let nonArrayTabsNodes = 0
for (const [id, node] of Object.entries(pool)) {
  const tabs = node.card?.tabs
  if (tabs === undefined) continue
  if (!Array.isArray(tabs)) { nonArrayTabsNodes += 1; continue }
  if (tabs.length === 0) { emptyTabsNodes += 1; continue }
  tabs.forEach((tab, index) => {
    if (!tab || typeof tab !== 'object') { offenders.push({ nodeId: id, index, why: 'tab 不是对象', tab: null }); return }
    if (typeof tab.content !== 'string') {
      offenders.push({
        nodeId: id, index, why: 'content ' + ('content' in tab ? `是 ${tab.content === null ? 'null' : typeof tab.content}` : '键缺失'),
        tab, label: node.label,
      })
    }
  })
}

console.log('\n══ 3. 定位 ══')
console.log(`  · card.tabs 为空数组的节点：${emptyTabsNodes} 个 —— **合法**（仅入池/待填正文），不修改`)
if (nonArrayTabsNodes > 0) console.log(`  · card.tabs 不是数组的节点：${nonArrayTabsNodes} 个 —— 渲染层已容错`)
if (offenders.length === 0) {
  console.log('  ✓ 无需修复的 tab')
} else {
  console.log(`  · 需要修复的 tab：${offenders.length} 处`)
  for (const o of offenders) {
    console.log(`      nodeId=${o.nodeId} label=${JSON.stringify(o.label)} tabs[${o.index}] id=${JSON.stringify(o.tab?.id)} label=${JSON.stringify(o.tab?.label)} → ${o.why}`)
  }
}

// ══════════════════════════════════════════════════════════════════════
// 4. 宽口径交叉核对（递归子 tab + 树条目 supplement.tabs）
//    校验器只递归一层，这里补一次更宽的扫描，确认没有第二处漏网
// ══════════════════════════════════════════════════════════════════════
const wide = []
const walkTabs = (owner, id, arr) => {
  if (!Array.isArray(arr)) return
  arr.forEach((tab, i) => {
    if (!tab || typeof tab !== 'object') { wide.push(`${owner}(${id})[${i}] tab 不是对象`); return }
    if (typeof tab.content !== 'string') wide.push(`${owner}(${id})[${i}] id=${JSON.stringify(tab.id)} label=${JSON.stringify(tab.label)} content ${'content' in tab ? '非字符串' : '键缺失'}`)
    for (const k of ['tabs', 'children', 'subTabs', 'pages']) walkTabs(owner, id, tab[k])
  })
}
for (const [id, node] of Object.entries(pool)) walkTabs('pool', id, node.card?.tabs)
const tree = rd(path.join(DATA, 'tree-data.json'))
;(function wt(n) { walkTabs('tree', n.id, n.supplement?.tabs); (n.children || []).forEach(wt) })(tree)

console.log('\n══ 4. 宽口径交叉核对（递归子 tab + tree supplement.tabs）══')
say(wide.length === offenders.length, '宽口径命中数与校验器口径一致', `宽口径 ${wide.length} 处 / 校验器口径 ${offenders.length} 处`)
for (const w of wide) console.log('      ' + w)

// ══════════════════════════════════════════════════════════════════════
// 5. 修复（仅 --fix）
// ══════════════════════════════════════════════════════════════════════
if (!FIX) {
  if (offenders.length > 0) {
    console.log(`\n（只读模式：有 ${offenders.length} 处待修。加 --fix 才会备份并补齐 content）`)
    problems += offenders.length
  } else {
    console.log('\n（只读模式：无可修项）')
  }
} else if (offenders.length === 0) {
  console.log('\n无可修复项，未写盘。')
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(DATA, 'backups', `data-hygiene-${stamp}`)
  fs.mkdirSync(backupDir, { recursive: true })
  for (const f of DATA_FILES) {
    const src = path.join(DATA, f)
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(backupDir, f))
  }
  console.log(`\n══ 5. 修复 ══\n  备份 → ${path.relative(ROOT, backupDir)}`)

  let fixed = 0
  const fixedTargets = []
  for (const [id, node] of Object.entries(pool)) {
    const tabs = node.card?.tabs
    if (!Array.isArray(tabs)) continue
    tabs.forEach((tab, index) => {
      if (!tab || typeof tab !== 'object') return
      if (typeof tab.content === 'string') return
      if ('content' in tab) {
        // 已有键但值不是字符串：原位置替换，不重排
        tab.content = ''
      } else {
        // 键缺失：按兄弟 tab 的键序插到 label 之后（同层惯例 id → label → content）
        const rebuilt = {}
        for (const k of Object.keys(tab)) {
          rebuilt[k] = tab[k]
          if (k === 'label') rebuilt.content = ''
        }
        if (!('content' in rebuilt)) rebuilt.content = ''
        tabs[index] = rebuilt
      }
      fixed += 1
      fixedTargets.push({ nodeId: id, index })
    })
  }

  // 原子写：临时文件 + rename（与 scripts/shell-fusion/lib.mjs 的 writeJsonAtomic 同法）
  const target = path.join(DATA, 'node-pool.json')
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`
  fs.writeFileSync(tmp, JSON.stringify(pool, null, 2), 'utf8')
  fs.renameSync(tmp, target)
  console.log(`  已补齐 ${fixed} 处 content，原子写回 node-pool.json`)

  // 复核：重读并跑校验器
  const reread = rd(target)
  const after = inspectNodePool(reread)
  say(after.fatal === null, '修复后 fatal 仍为空')
  const contentWarn = after.warnings.filter((w) => w.includes('content'))
  say(contentWarn.length === 0, '修复后「缺少 content 字段」告警消失', contentWarn.join('，') || '已消失')
  console.log('  剩余 warnings：' + (after.warnings.length ? after.warnings.map((w) => `「${w}」`).join(' ') : '无'))
  // 键序复核：补出来的 content 必须紧跟 label（与同层兄弟 tab 的 id→label→content 一致）
  const badOrder = fixedTargets.filter(({ nodeId, index }) => {
    const keys = Object.keys(reread[nodeId].card.tabs[index])
    return keys.indexOf('content') !== keys.indexOf('label') + 1
  })
  say(badOrder.length === 0, '补位后 content 键均紧跟 label（键序未污染）',
    badOrder.length ? badOrder.map((t) => `${t.nodeId}[${t.index}]`).join(',') : `已核 ${fixedTargets.length} 处`)
}

console.log('\n' + (problems === 0 ? '★ 数据体检通过（0 项待修）' : `✗ ${problems} 项待修`))
process.exit(problems === 0 ? 0 : 1)
