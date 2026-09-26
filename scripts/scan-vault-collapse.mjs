/**
 * scan-vault-collapse.mjs — 全库塌行双份 / 指针残留扫描（只读，零写入 data/）
 *
 * 病灶特征（来自已修 4 例的形态归纳）：
 *   dual-copy    rootContent 与唯一 tab 内容互为塌行/干净双份（归一化包含）
 *   title-prefix rootContent 以节点 label 开头（库 vault 标题行混入正文）
 *   broken-bold  **加粗步骤**：\n 被拆行（严格口径：标签后紧跟普通段落行；「标签+列表/缩进块」为合法排版不报）
 *   glued-table  表格行带前导空格（\n +|）或表头粘连
 *   glued-code   代码栅栏与内容同行（```lang <内容>…，塌行吃掉换行）
 *   ptr          跨节点指针话术（详见/见子节点/见「X→Y」/参见/另见）——知识独立性口径
 *
 * 产出：outputs/vault-collapse-scan/report.json + report.md
 * 用法：node scripts/scan-vault-collapse.mjs [--tag <报告节标题后缀>]
 */
import fs from 'node:fs'
import path from 'node:path'

const DATA = path.join(process.cwd(), 'data')
const OUT = path.join(process.cwd(), 'outputs', 'vault-collapse-scan')
const tagIdx = process.argv.indexOf('--tag')
const TAG = tagIdx > -1 ? process.argv[tagIdx + 1] : ''

const pool = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'))
const norm = (s) => (s ?? '').replace(/\s+/g, '')
const PTR_RE = /详见|见子节点|参见|另见|见「[^」]*→/

const rows = []
for (const [id, e] of Object.entries(pool)) {
  const c = e?.card
  if (!c || typeof c !== 'object') continue
  const root = c.rootContent ?? ''
  const tabs = Array.isArray(c.tabs) ? c.tabs : []
  const allText = root + '\n' + tabs.map((t) => t.content ?? '').join('\n')
  if (!allText.trim()) continue
  const signals = []
  // dual-copy：唯一 tab 且归一化后互相包含（且长度>50 防误报）
  if (tabs.length === 1) {
    const a = norm(root), b = norm(tabs[0].content ?? '')
    if (a.length > 50 && b.length > 50 && (a.includes(b) || b.includes(a))) signals.push('dual-copy')
  }
  if (e.label && root.startsWith(e.label)) signals.push('title-prefix')
  // broken-bold：粗体标签后**紧跟普通段落行**（非空行/列表/缩进/围栏/引用/标题）——
  // 即塌行把段落首行并入标签行的形态。「标签 + 块」（列表/缩进伪代码/空行后围栏）是合法
  // Markdown 排版，渲染正常，不判命中（塌行重症批实测：宽松版 9 命中全为假阳性，严格版 0）。
  if (/\*\*[^*\n]{1,15}\*\*：\n(?![ \t\n\-*\d|>#`])/.test(root)) signals.push('broken-bold')
  if (/\n +\|/.test(root)) signals.push('glued-table')
  if (/^```\w* \S/m.test(root)) signals.push('glued-code')
  const ptrHit = allText.match(PTR_RE)
  if (ptrHit) signals.push('ptr:' + ptrHit[0])
  if (signals.length) rows.push({ id, label: e.label ?? '', rootLen: root.length, tabs: tabs.map((t) => t.id), signals })
}

const bySignal = {}
for (const r of rows) for (const s of r.signals) { const k = s.split(':')[0]; bySignal[k] = (bySignal[k] ?? 0) + 1 }

const summary = {
  scannedAt: new Date().toISOString(),
  tag: TAG || undefined,
  poolSize: Object.keys(pool).length,
  cardsWithSignals: rows.length,
  bySignal,
  rows,
}
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(summary, null, 2), 'utf8')

let md = `# 全库塌行双份 / 指针残留扫描${TAG ? '（' + TAG + '）' : ''}\n\n`
md += `- 扫描时间：${summary.scannedAt}\n- 池规模：${summary.poolSize} 节点\n- 命中卡数：${rows.length}\n- 分信号计数：${Object.entries(bySignal).map(([k, v]) => `${k}=${v}`).join(' / ') || '无'}\n\n`
md += `| 实体 | 标签 | root 字数 | tabs | 信号 |\n|---|---|---|---|---|\n`
for (const r of rows) md += `| ${r.id} | ${r.label} | ${r.rootLen} | ${r.tabs.join(',') || '—'} | ${r.signals.join(' ')} |\n`
fs.writeFileSync(path.join(OUT, 'report.md'), md, 'utf8')

console.log(`扫描完成：池 ${summary.poolSize} 节点，命中 ${rows.length} 卡`)
console.log('分信号：', JSON.stringify(bySignal))
console.log(`报告：outputs/vault-collapse-scan/report.{json,md}`)
