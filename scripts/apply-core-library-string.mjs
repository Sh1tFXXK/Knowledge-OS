/**
 * 批次 core-library-string：给 java.lang.String 补 rootContent + 33 个方法 tab。
 *
 * 纪律：预检与实跑共用同一个 buildPlan()；默认 dry-run，--apply 才写盘。
 * 只动 k_java_lang_string 一个池实体，不碰树、不碰边。
 * 保留 node-pool.json 原有的末尾换行状态。
 */
import fs from 'node:fs'
import path from 'node:path'
import { DATA } from './shell-fusion/lib.mjs'

const TARGET = 'k_java_lang_string'

const ROOT_CONTENT = '不可变字符序列。直接赋值存常量池可复用，`new` 创建在堆上。'

// tab 内容统一两段：一句话说明 + 签名（重载合并，签名用 ／ 分隔）
const TABS = [
  { id: 'length', label: 'length()', content: '返回字符串长度。\n\n`int length()`' },
  { id: 'charAt', label: 'charAt()', content: '返回指定索引处的字符。\n\n`char charAt(int index)`' },
  { id: 'getChars', label: 'getChars()', content: '将字符复制到目标字符数组。\n\n`void getChars(int srcBegin, int srcEnd, char[] dst, int dstBegin)`' },
  { id: 'toCharArray', label: 'toCharArray()', content: '转换为字符数组。\n\n`char[] toCharArray()`' },
  { id: 'getBytes', label: 'getBytes()', content: '使用默认或指定字符集编码为字节数组。\n\n`byte[] getBytes()` ／ `byte[] getBytes(String charsetName)`' },

  { id: 'equals', label: 'equals()', content: '比较字符串内容。\n\n`boolean equals(Object anObject)`' },
  { id: 'equalsIgnoreCase', label: 'equalsIgnoreCase()', content: '忽略大小写比较字符串内容。\n\n`boolean equalsIgnoreCase(String anotherString)`' },
  { id: 'compareTo', label: 'compareTo()', content: '按字典顺序比较。\n\n`int compareTo(String anotherString)`' },
  { id: 'compareToIgnoreCase', label: 'compareToIgnoreCase()', content: '忽略大小写按字典顺序比较。\n\n`int compareToIgnoreCase(String str)`' },
  { id: 'contentEquals', label: 'contentEquals()', content: '与指定字符序列比较内容。\n\n`boolean contentEquals(StringBuffer sb)`' },
  { id: 'regionMatches', label: 'regionMatches()', content: '测试两个字符串的区域是否相等。\n\n`boolean regionMatches(int toffset, String other, int ooffset, int len)` ／ `boolean regionMatches(boolean ignoreCase, int toffset, String other, int ooffset, int len)`' },

  { id: 'indexOf', label: 'indexOf()', content: '返回指定字符或子字符串首次出现的索引，未找到返回 -1。\n\n`int indexOf(int ch)` ／ `int indexOf(int ch, int fromIndex)` ／ `int indexOf(String str)` ／ `int indexOf(String str, int fromIndex)`' },
  { id: 'lastIndexOf', label: 'lastIndexOf()', content: '返回指定字符或子字符串最后一次出现的索引，未找到返回 -1。\n\n`int lastIndexOf(int ch)` ／ `int lastIndexOf(int ch, int fromIndex)` ／ `int lastIndexOf(String str)` ／ `int lastIndexOf(String str, int fromIndex)`' },
  { id: 'contains', label: 'contains()', content: '判断是否包含指定字符序列。\n\n`boolean contains(CharSequence chars)`' },
  { id: 'startsWith', label: 'startsWith()', content: '测试是否以指定前缀开始。\n\n`boolean startsWith(String prefix)` ／ `boolean startsWith(String prefix, int toffset)`' },
  { id: 'endsWith', label: 'endsWith()', content: '测试是否以指定后缀结束。\n\n`boolean endsWith(String suffix)`' },

  { id: 'substring', label: 'substring()', content: '返回自指定索引开始、或指定区间的子字符串。\n\n`String substring(int beginIndex)` ／ `String substring(int beginIndex, int endIndex)`' },
  { id: 'subSequence', label: 'subSequence()', content: '返回指定区间的字符序列。\n\n`CharSequence subSequence(int beginIndex, int endIndex)`' },
  { id: 'concat', label: 'concat()', content: '将指定字符串连接到当前字符串结尾。\n\n`String concat(String str)`' },
  { id: 'replace', label: 'replace()', content: '替换所有出现的指定字符。\n\n`String replace(char oldChar, char newChar)`' },
  { id: 'replaceAll', label: 'replaceAll()', content: '用给定替换内容替换所有匹配正则的子字符串。\n\n`String replaceAll(String regex, String replacement)`' },
  { id: 'replaceFirst', label: 'replaceFirst()', content: '替换匹配正则的第一个子字符串。\n\n`String replaceFirst(String regex, String replacement)`' },
  { id: 'split', label: 'split()', content: '根据正则表达式拆分字符串，可用 limit 限制拆分次数。\n\n`String[] split(String regex)` ／ `String[] split(String regex, int limit)`' },
  { id: 'trim', label: 'trim()', content: '去除前导和尾部空白。\n\n`String trim()`' },
  { id: 'toLowerCase', label: 'toLowerCase()', content: '转换为小写，可指定区域设置。\n\n`String toLowerCase()` ／ `String toLowerCase(Locale locale)`' },
  { id: 'toUpperCase', label: 'toUpperCase()', content: '转换为大写，可指定区域设置。\n\n`String toUpperCase()` ／ `String toUpperCase(Locale locale)`' },

  { id: 'valueOf', label: 'valueOf()', content: '返回基本类型参数的字符串表示。\n\n`static String valueOf(primitive data type x)`' },
  { id: 'copyValueOf', label: 'copyValueOf()', content: '返回字符数组（或其指定区间）表示的字符串。\n\n`static String copyValueOf(char[] data)` ／ `static String copyValueOf(char[] data, int offset, int count)`' },
  { id: 'format', label: 'format()', content: '创建格式化字符串。\n\n`static String format(String format, Object... args)`' },
  { id: 'intern', label: 'intern()', content: '返回字符串对象的规范化表示形式。\n\n`String intern()`' },
  { id: 'matches', label: 'matches()', content: '判断是否匹配给定正则表达式。\n\n`boolean matches(String regex)`' },
  { id: 'hashCode', label: 'hashCode()', content: '返回字符串的哈希码。\n\n`int hashCode()`' },
  { id: 'isEmpty', label: 'isEmpty()', content: '判断字符串是否为空。\n\n`boolean isEmpty()`' },
]

/** 纯函数：在给定 pool 上执行本批操作，返回 { pool, report }。预检与实跑共用。 */
function buildPlan(pool) {
  const node = pool[TARGET]
  if (!node) throw new Error(`目标池实体不存在: ${TARGET}`)
  const card = node.card
  if (!card) throw new Error(`${TARGET} 无 card`)

  const oldTabs = card.tabs ?? []
  const existingIds = new Set(oldTabs.map((t) => String(t.id)))
  const conflicts = TABS.filter((t) => existingIds.has(t.id)).map((t) => t.id)
  if (conflicts.length > 0) throw new Error(`tab id 冲突（拒绝覆盖）: ${conflicts.join(', ')}`)

  const oldRoot = card.rootContent ?? ''
  // 保键序：nodeId, title, rootContent（rootContent 原不存在时插在 title 之后）, tabs
  const newCard = {}
  for (const key of Object.keys(card)) {
    newCard[key] = card[key]
    if (key === 'title' && !('rootContent' in card)) newCard.rootContent = ROOT_CONTENT
  }
  if ('rootContent' in newCard) newCard.rootContent = ROOT_CONTENT
  if (!('rootContent' in newCard)) newCard.rootContent = ROOT_CONTENT
  newCard.tabs = [...oldTabs, ...TABS.map((t) => ({ ...t }))]

  const next = { ...pool, [TARGET]: { ...node, card: newCard } }

  return {
    pool: next,
    report: {
      target: TARGET,
      label: node.label,
      rootBefore: { len: oldRoot.length, text: oldRoot },
      rootAfter: { len: ROOT_CONTENT.length, text: ROOT_CONTENT },
      tabsBefore: oldTabs.map((t) => `${t.id}:${t.label}`),
      tabsAdded: TABS.map((t) => `${t.id}:${t.label}`),
      tabsAfterCount: newCard.tabs.length,
      cardKeysBefore: Object.keys(card),
      cardKeysAfter: Object.keys(newCard),
    },
  }
}

// ── CLI ────────────────────────────────────────────────────────────────
const apply = process.argv.includes('--apply')
const poolPath = path.join(DATA, 'node-pool.json')
const raw = fs.readFileSync(poolPath, 'utf8')
const pool = JSON.parse(raw)
const hasTrailingNewline = raw.endsWith('\n')

const poolForPlan = apply ? pool : JSON.parse(JSON.stringify(pool))
const { pool: planned, report } = buildPlan(poolForPlan)

console.log('=== 批次 core-library-string ===')
console.log('模式            ', apply ? 'APPLY（写盘）' : 'DRY-RUN（不写盘）')
console.log('目标            ', report.target, '·', report.label)
console.log('rootContent 前  ', report.rootBefore.len, '字', JSON.stringify(report.rootBefore.text.slice(0, 60)))
console.log('rootContent 后  ', report.rootAfter.len, '字', JSON.stringify(report.rootAfter.text))
console.log('card 键序 前/后 ', JSON.stringify(report.cardKeysBefore), '→', JSON.stringify(report.cardKeysAfter))
console.log('tabs 前         ', report.tabsBefore.length, JSON.stringify(report.tabsBefore))
console.log('tabs 新增       ', report.tabsAdded.length)
for (const t of report.tabsAdded) console.log('     + ' + t)
console.log('tabs 后总数     ', report.tabsAfterCount)
console.log('文件末尾换行    ', hasTrailingNewline)
console.log('计划写盘文件    ', ['data/node-pool.json'])

// 自检：新 pool 与旧 pool 的差异必须只落在 k_java_lang_string
const changed = Object.keys(pool).filter((k) => JSON.stringify(pool[k]) !== JSON.stringify(planned[k]))
console.log('差异实体数      ', changed.length, JSON.stringify(changed))
if (changed.length !== 1 || changed[0] !== TARGET) {
  console.error('❌ 差异超出目标实体，终止')
  process.exit(4)
}
console.log('树 / 边 / 题库  未触碰（本脚本不读不写）')

if (!apply) {
  console.log('\nDRY-RUN 结束，data/ 未改动。加 --apply 落盘。')
  process.exit(0)
}

// 备份 → 原子写
const iso = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join(DATA, 'backups', `core-library-string-${iso}`)
fs.mkdirSync(backupDir, { recursive: true })
fs.copyFileSync(poolPath, path.join(backupDir, 'node-pool.json'))
fs.writeFileSync(
  path.join(backupDir, 'journal.txt'),
  `批次: core-library-string\n时间: ${new Date().toISOString()}\n目标: ${TARGET}\n` +
    `rootContent: ${report.rootBefore.len} → ${report.rootAfter.len} 字\n` +
    `tabs: ${report.tabsBefore.length} → ${report.tabsAfterCount}（新增 ${report.tabsAdded.length}）\n` +
    `写入: data/node-pool.json\n未触碰: tree-data / knowledge-edges / questions / evolution-events / version-chains\n`,
  'utf8',
)

const out = JSON.stringify(planned, null, 2) + (hasTrailingNewline ? '\n' : '')
const tmp = `${poolPath}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, out, 'utf8')
fs.renameSync(tmp, poolPath)

console.log('\n✓ 已落盘 data/node-pool.json')
console.log('  备份 →', path.relative(process.cwd(), backupDir).replace(/\\/g, '/'))
console.log('  末尾换行保留:', fs.readFileSync(poolPath, 'utf8').endsWith('\n'))
