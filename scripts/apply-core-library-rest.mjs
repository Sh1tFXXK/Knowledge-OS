/**
 * 批次 core-library-rest：给 Scanner / Files / enum 三个类节点补方法 tab。
 *
 * 与 core-library-string 同批族，规则完全一致：
 *   - tab 只由「源材料的方法表行」生成，一类一 tab，重载合并（签名用 ／ 分隔）
 *   - tab content = 一句话说明 + 空行 + 签名
 *   - tab id = lowerCamel 方法名；label = `name()`
 *
 * 三个类各自的红线（预检已核实，写死在这里防回归）：
 *   1. k_java_lang_enum 已有 rootContent(871 字, OCR 脏数据) ⇒ **绝不覆盖**，只追加 tab
 *   2. k_java_util_scanner 已有 methods 总览 tab ⇒ 保留，本批只做逐条
 *   3. 三者的 tabs 顺序：追加在原有 tab 之后
 *
 * 纪律：预检与实跑共用同一个 buildPlan()；默认 dry-run，--apply 才写盘。
 * 一次原子写只碰 data/node-pool.json；保留文件末尾换行。
 */
import fs from 'node:fs'
import path from 'node:path'
import { DATA } from './shell-fusion/lib.mjs'

const SCANNER = 'k_java_util_scanner'
const FILES = 'k_java_nio_file_files'
const ENUM = 'k_java_lang_enum'

// ── 材料一：java.util.Scanner（源材料「二、java.util.Scanner > 常用方法」全部表格行）──
const SCANNER_ROOT = 'Java 5 引入的文本扫描器，从 InputStream / File / String 读取输入，按分隔符模式解析为标记。'

const SCANNER_TABS = [
  // 构造方法
  { id: 'scanner', label: 'Scanner()', content: '从文件、输入流或字符串创建扫描器。\n\n`Scanner(File source)` ／ `Scanner(InputStream source)` ／ `Scanner(String source)`' },
  // 基本输入
  { id: 'hasNext', label: 'hasNext()', content: '检查是否有下一个标记（以空白分隔）。\n\n`boolean hasNext()`' },
  { id: 'next', label: 'next()', content: '读取下一个标记（字符串），不能得到带空格的字符串。\n\n`String next()`' },
  { id: 'hasNextLine', label: 'hasNextLine()', content: '检查是否有下一行。\n\n`boolean hasNextLine()`' },
  { id: 'nextLine', label: 'nextLine()', content: '读取下一行内容，以 Enter 为结束符并保留前导空白。\n\n`String nextLine()`' },
  // 类型检查
  { id: 'hasNextInt', label: 'hasNextInt()', content: '检查下一个标记是否为整数。\n\n`boolean hasNextInt()`' },
  { id: 'hasNextDouble', label: 'hasNextDouble()', content: '检查下一个标记是否为双精度浮点数。\n\n`boolean hasNextDouble()`' },
  { id: 'hasNextBoolean', label: 'hasNextBoolean()', content: '检查下一个标记是否为布尔值。\n\n`boolean hasNextBoolean()`' },
  // 类型读取
  { id: 'nextInt', label: 'nextInt()', content: '读取下一个整数。\n\n`int nextInt()`' },
  { id: 'nextDouble', label: 'nextDouble()', content: '读取下一个双精度浮点数。\n\n`double nextDouble()`' },
  { id: 'nextBoolean', label: 'nextBoolean()', content: '读取下一个布尔值。\n\n`boolean nextBoolean()`' },
  { id: 'nextLong', label: 'nextLong()', content: '读取下一个长整数。\n\n`long nextLong()`' },
  { id: 'nextFloat', label: 'nextFloat()', content: '读取下一个单精度浮点数。\n\n`float nextFloat()`' },
  { id: 'nextShort', label: 'nextShort()', content: '读取下一个短整数。\n\n`short nextShort()`' },
  { id: 'nextByte', label: 'nextByte()', content: '读取下一个字节。\n\n`byte nextByte()`' },
  // 分隔符控制
  { id: 'useDelimiter', label: 'useDelimiter()', content: '设置分隔符模式，可传字符串或正则 Pattern。\n\n`Scanner useDelimiter(String pattern)` ／ `Scanner useDelimiter(Pattern pattern)`' },
  { id: 'delimiter', label: 'delimiter()', content: '返回当前使用的分隔符模式。\n\n`String delimiter()`' },
  // 其他
  { id: 'close', label: 'close()', content: '关闭扫描器。\n\n`void close()`' },
  { id: 'skip', label: 'skip()', content: '跳过匹配指定模式的输入。\n\n`Scanner skip(Pattern pattern)` ／ `Scanner skip(String pattern)`' },
  { id: 'findInLine', label: 'findInLine()', content: '在当前行中查找指定模式。\n\n`String findInLine(Pattern pattern)` ／ `String findInLine(String pattern)`' },
  { id: 'reset', label: 'reset()', content: '重置扫描器。\n\n`Scanner reset()`' },
  { id: 'locale', label: 'locale()', content: '返回扫描器当前使用的区域设置。\n\n`Locale locale()`' },
  { id: 'useLocale', label: 'useLocale()', content: '设置扫描器的区域设置。\n\n`Scanner useLocale(Locale locale)`' },
]

// ── 材料二：java.nio.file.Files（源材料「三、java.nio.file.Files > 常用方法」全部表格行）──
const FILES_ROOT = 'java.nio.file 包下的静态文件工具类，所有方法均为静态方法，配合 Path 使用，统一抛 IOException。'

const FILES_TABS = [
  // 文件操作
  { id: 'copy', label: 'copy()', content: '将文件从源路径复制到目标路径。\n\n`static Path copy(Path source, Path target, CopyOption... options)`' },
  { id: 'move', label: 'move()', content: '移动或重命名文件。\n\n`static Path move(Path source, Path target, CopyOption... options)`' },
  { id: 'delete', label: 'delete()', content: '删除文件。\n\n`static void delete(Path path)`' },
  { id: 'deleteIfExists', label: 'deleteIfExists()', content: '如果文件存在则删除。\n\n`static boolean deleteIfExists(Path path)`' },
  // 文件属性
  { id: 'exists', label: 'exists()', content: '检查文件是否存在。\n\n`static boolean exists(Path path, LinkOption... options)`' },
  { id: 'isDirectory', label: 'isDirectory()', content: '检查路径是否为目录。\n\n`static boolean isDirectory(Path path, LinkOption... options)`' },
  { id: 'isRegularFile', label: 'isRegularFile()', content: '检查路径是否为常规文件。\n\n`static boolean isRegularFile(Path path, LinkOption... options)`' },
  { id: 'isReadable', label: 'isReadable()', content: '检查文件是否可读。\n\n`static boolean isReadable(Path path)`' },
  { id: 'isWritable', label: 'isWritable()', content: '检查文件是否可写。\n\n`static boolean isWritable(Path path)`' },
  { id: 'isExecutable', label: 'isExecutable()', content: '检查文件是否可执行。\n\n`static boolean isExecutable(Path path)`' },
  { id: 'size', label: 'size()', content: '返回文件大小（字节）。\n\n`static long size(Path path)`' },
  { id: 'getLastModifiedTime', label: 'getLastModifiedTime()', content: '获取文件最后修改时间。\n\n`static FileTime getLastModifiedTime(Path path, LinkOption... options)`' },
  // 文件内容操作
  { id: 'readAllBytes', label: 'readAllBytes()', content: '读取文件所有字节。\n\n`static byte[] readAllBytes(Path path)`' },
  { id: 'readAllLines', label: 'readAllLines()', content: '读取文件所有行，可指定字符集。\n\n`static List<String> readAllLines(Path path)` ／ `static List<String> readAllLines(Path path, Charset cs)`' },
  { id: 'lines', label: 'lines()', content: '返回文件中行的流，可指定字符集。\n\n`static Stream<String> lines(Path path)` ／ `static Stream<String> lines(Path path, Charset cs)`' },
  { id: 'write', label: 'write()', content: '将字节或文本行写入文件。\n\n`static Path write(Path path, byte[] bytes, OpenOption... options)` ／ `static Path write(Path path, Iterable<? extends CharSequence> lines, OpenOption... options)`' },
  // 目录操作
  { id: 'list', label: 'list()', content: '列出目录中的条目。\n\n`static Stream<Path> list(Path dir)`' },
  { id: 'newDirectoryStream', label: 'newDirectoryStream()', content: '打开目录流。\n\n`static DirectoryStream<Path> newDirectoryStream(Path dir)`' },
  { id: 'createDirectory', label: 'createDirectory()', content: '创建单级目录。\n\n`static Path createDirectory(Path dir, FileAttribute<?>... attrs)`' },
  { id: 'createDirectories', label: 'createDirectories()', content: '创建多级目录（包括所有不存在的父目录）。\n\n`static Path createDirectories(Path dir, FileAttribute<?>... attrs)`' },
  // 临时文件与目录
  { id: 'createTempFile', label: 'createTempFile()', content: '创建临时文件。\n\n`static Path createTempFile(Path dir, String prefix, String suffix, FileAttribute<?>... attrs)`' },
  { id: 'createTempDirectory', label: 'createTempDirectory()', content: '创建临时目录。\n\n`static Path createTempDirectory(Path dir, String prefix, FileAttribute<?>... attrs)`' },
  // 流与通道
  { id: 'newByteChannel', label: 'newByteChannel()', content: '打开或创建文件，返回可查找的字节通道。\n\n`static SeekableByteChannel newByteChannel(Path path, OpenOption... options)`' },
  { id: 'newInputStream', label: 'newInputStream()', content: '打开文件输入流。\n\n`static InputStream newInputStream(Path path, OpenOption... options)`' },
  { id: 'newOutputStream', label: 'newOutputStream()', content: '打开文件输出流。\n\n`static OutputStream newOutputStream(Path path, OpenOption... options)`' },
  { id: 'newBufferedReader', label: 'newBufferedReader()', content: '打开缓冲读取器。\n\n`static BufferedReader newBufferedReader(Path path)`' },
  { id: 'newBufferedWriter', label: 'newBufferedWriter()', content: '打开缓冲写入器。\n\n`static BufferedWriter newBufferedWriter(Path path, OpenOption... options)`' },
  // 其他
  { id: 'createFile', label: 'createFile()', content: '创建新文件。\n\n`static Path createFile(Path path, FileAttribute<?>... attrs)`' },
  { id: 'probeContentType', label: 'probeContentType()', content: '探测文件内容类型。\n\n`static String probeContentType(Path path)`' },
]

// ── 材料三：枚举（源材料「四、枚举（enum）> 常用方法（继承自 java.lang.Enum）」6 行）──
// rootContent 已存在（871 字 OCR 文本）⇒ 传 null 表示「不触碰」
const ENUM_TABS = [
  { id: 'values', label: 'values()', content: '返回枚举类中所有常量的数组。\n\n`static T[] values()`' },
  { id: 'ordinal', label: 'ordinal()', content: '返回枚举常量的索引位置（从 0 开始）。\n\n`int ordinal()`' },
  { id: 'valueOf', label: 'valueOf()', content: '返回指定字符串名称对应的枚举常量；不存在时抛出 `IllegalArgumentException`。\n\n`static T valueOf(String name)`' },
  { id: 'name', label: 'name()', content: '返回枚举常量的名称。\n\n`String name()`' },
  { id: 'compareTo', label: 'compareTo()', content: '比较枚举常量的定义顺序。\n\n`int compareTo(E o)`' },
  { id: 'getDeclaringClass', label: 'getDeclaringClass()', content: '返回枚举常量所属的枚举类 `Class` 对象。\n\n`Class<E> getDeclaringClass()`' },
]

const CLASSES = [
  { ref: SCANNER, name: 'java.util.Scanner', root: SCANNER_ROOT, tabs: SCANNER_TABS },
  { ref: FILES, name: 'java.nio.file.Files', root: FILES_ROOT, tabs: FILES_TABS },
  { ref: ENUM, name: 'java.lang.Enum', root: null, tabs: ENUM_TABS }, // root=null ⇒ 保留原 rootContent
]

/** 保留 card 原有键序：rootContent 只在「原本没有」时插到 title 之后；tabs 原位替换。 */
function buildCard(card, rootContent, addedTabs) {
  const oldTabs = card.tabs ?? []
  const existing = new Set(oldTabs.map((t) => String(t.id)))
  const conflicts = addedTabs.filter((t) => existing.has(t.id)).map((t) => t.id)
  if (conflicts.length > 0) throw new Error(`tab id 冲突（拒绝覆盖）: ${conflicts.join(', ')}`)

  const nextTabs = [...oldTabs, ...addedTabs.map((t) => ({ ...t }))]
  const out = {}
  let sawTabs = false
  for (const key of Object.keys(card)) {
    if (key === 'title') {
      out.title = card.title
      if (rootContent != null && !('rootContent' in card)) out.rootContent = rootContent
      continue
    }
    if (key === 'tabs') {
      out.tabs = nextTabs
      sawTabs = true
      continue
    }
    out[key] = card[key]
  }
  if (!sawTabs) out.tabs = nextTabs
  if (rootContent != null && !('rootContent' in out)) out.rootContent = rootContent
  return out
}

/** 纯函数：在给定 pool 上执行本批操作，返回 { pool, report }。预检与实跑共用。 */
function buildPlan(pool) {
  const next = { ...pool }
  const report = []
  for (const spec of CLASSES) {
    const node = pool[spec.ref]
    if (!node) throw new Error(`目标池实体不存在: ${spec.ref}`)
    const card = node.card
    if (!card) throw new Error(`${spec.ref} 无 card`)

    const oldTabs = card.tabs ?? []
    const oldRoot = card.rootContent ?? ''
    const newCard = buildCard(card, spec.root, spec.tabs)
    next[spec.ref] = { ...node, card: newCard }

    report.push({
      ref: spec.ref,
      label: spec.name,
      poolLabel: node.label,
      rootTouched: spec.root != null,
      rootBeforeLen: oldRoot.length,
      rootAfterLen: (newCard.rootContent ?? '').length,
      rootAfterText: newCard.rootContent ?? '',
      tabsBefore: oldTabs.map((t) => `${t.id}:${t.label}`),
      tabsAdded: spec.tabs.map((t) => `${t.id}:${t.label}`),
      tabsAfterCount: newCard.tabs.length,
      cardKeysBefore: Object.keys(card),
      cardKeysAfter: Object.keys(newCard),
    })
  }
  return { pool: next, report }
}

// ── CLI ────────────────────────────────────────────────────────────────
const apply = process.argv.includes('--apply')
const poolPath = path.join(DATA, 'node-pool.json')
const raw = fs.readFileSync(poolPath, 'utf8')
const pool = JSON.parse(raw)
const hasTrailingNewline = raw.endsWith('\n')

const poolForPlan = apply ? pool : JSON.parse(JSON.stringify(pool))
const { pool: planned, report } = buildPlan(poolForPlan)

const TARGET_REFS = CLASSES.map((c) => c.ref)

console.log('=== 批次 core-library-rest（Scanner / Files / enum）===')
console.log('模式            ', apply ? 'APPLY（写盘）' : 'DRY-RUN（不写盘）')
console.log('池实体数        ', Object.keys(pool).length)
let totalAdded = 0
for (const r of report) {
  totalAdded += r.tabsAdded.length
  console.log('\n── ' + r.ref + '  池label=' + r.poolLabel)
  console.log('   rootContent   ', r.rootTouched
    ? `${r.rootBeforeLen} → ${r.rootAfterLen} 字 · ${JSON.stringify(r.rootAfterText)}`
    : `未触碰（保留原 ${r.rootBeforeLen} 字）`)
  console.log('   card 键序     ', JSON.stringify(r.cardKeysBefore), '→', JSON.stringify(r.cardKeysAfter))
  console.log('   tabs 前       ', r.tabsBefore.length, JSON.stringify(r.tabsBefore))
  console.log('   tabs 新增     ', r.tabsAdded.length)
  for (const t of r.tabsAdded) console.log('        + ' + t)
  console.log('   tabs 后总数   ', r.tabsAfterCount)
}
console.log('\n新增 tab 合计   ', totalAdded)
console.log('文件末尾换行    ', hasTrailingNewline)
console.log('计划写盘文件    ', ['data/node-pool.json'])

// 自检 1：差异必须精确落在 3 个目标实体
const changed = Object.keys(pool).filter((k) => JSON.stringify(pool[k]) !== JSON.stringify(planned[k]))
console.log('差异实体数      ', changed.length, JSON.stringify(changed))
const okChanged = changed.length === TARGET_REFS.length && TARGET_REFS.every((r) => changed.includes(r))
if (!okChanged) {
  console.error('❌ 差异超出目标实体集合，终止')
  process.exit(4)
}
// 自检 2：每个目标节点的 tabs 数必须精确等于 前 + 新增；rootContent 不得缩短
for (const r of report) {
  if (r.tabsAfterCount !== r.tabsBefore.length + r.tabsAdded.length) {
    console.error('❌ tabs 数不自洽:', r.ref)
    process.exit(5)
  }
  if (r.rootTouched && r.rootAfterLen === 0) {
    console.error('❌ rootContent 被写空:', r.ref)
    process.exit(6)
  }
  if (!r.rootTouched && r.rootBeforeLen !== r.rootAfterLen) {
    console.error('❌ 声明不触碰 rootContent 但长度变化:', r.ref)
    process.exit(7)
  }
}
console.log('自检            tabs 自洽 ✓ · rootContent 未被写空 ✓ · enum root 未触碰 ✓')
console.log('树 / 边 / 题库  未触碰（本脚本不读不写）')

if (!apply) {
  console.log('\nDRY-RUN 结束，data/ 未改动。加 --apply 落盘。')
  process.exit(0)
}

// 备份 → 原子写
const iso = new Date().toISOString().replace(/[:.]/g, '-')
const backupDir = path.join(DATA, 'backups', `core-library-rest-${iso}`)
fs.mkdirSync(backupDir, { recursive: true })
fs.copyFileSync(poolPath, path.join(backupDir, 'node-pool.json'))
fs.writeFileSync(
  path.join(backupDir, 'journal.txt'),
  `批次: core-library-rest\n时间: ${new Date().toISOString()}\n\n` +
    report
      .map(
        (r) =>
          `${r.ref} (${r.poolLabel})\n` +
          `  rootContent: ${r.rootTouched ? `${r.rootBeforeLen} → ${r.rootAfterLen} 字` : `未触碰（${r.rootBeforeLen} 字）`}\n` +
          `  tabs: ${r.tabsBefore.length} → ${r.tabsAfterCount}（新增 ${r.tabsAdded.length}）\n`,
      )
      .join('\n') +
    `\n写入: data/node-pool.json\n未触碰: tree-data / knowledge-edges / questions / evolution-events / version-chains\n`,
  'utf8',
)

const out = JSON.stringify(planned, null, 2) + (hasTrailingNewline ? '\n' : '')
const tmp = `${poolPath}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, out, 'utf8')
fs.renameSync(tmp, poolPath)

console.log('\n✓ 已落盘 data/node-pool.json')
console.log('  备份 →', path.relative(process.cwd(), backupDir).replace(/\\/g, '/'))
console.log('  末尾换行保留:', fs.readFileSync(poolPath, 'utf8').endsWith('\n'))
