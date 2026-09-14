/**
 * [READ-ONLY RECONCILIATION] 外部改动归属与基线固化。
 *
 * 背景：工作树里 `data/node-pool.json` / `data/questions.json` 有**非本任务**的未提交改动
 * （mtime 2026-09-14 13:00，本任务此前未触碰）。按纪律：不 kill dev server、不回滚、
 * 不提交他人改动。本脚本只做四件事：
 *
 *   1. **固化基线**：5 个数据文件的 md5 / mtime / git 状态，便于之后判断「是否又变了」。
 *   2. **归属刻画**：逐 node id 做字段级差分，弄清这批改动到底改了什么、成不成一个完整批次。
 *   3. **碰撞分析**：把外部改动涉及的节点，与阶段一（簇 1 + 簇 4）计划要动的节点求交集 ——
 *      有交集就有**顺序约束**（必须先等对方收敛，否则双方都基于过期基线）。
 *   4. **全仓指纹 + 漂移检测**：data/ 之外（src/、docs/、配置…）还有另一个会话在改。
 *      记录整个工作树的 path→md5 指纹，下次运行自动 diff 出「谁又动了什么」。
 *
 * 只读仓库。产物：outputs/tree-violation-scan/external-change-baseline.md / .json
 *              outputs/tree-violation-scan/worktree-fingerprint.json
 * 用法：node scripts/reconcile-external-changes.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']
const FP_PATH = path.join(OUT_DIR, 'worktree-fingerprint.json')

const gitShow = (rel) => {
  try {
    return execFileSync('git', ['show', `HEAD:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  } catch {
    return null
  }
}
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')
const read = (p) => fs.readFileSync(p, 'utf8')

// ── 0. 全工作树指纹 + 漂移检测 ───────────────────────────────────────────
const porcelain = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const entries = porcelain.split('\0').filter(Boolean)
const worktree = {}
for (const e of entries) {
  const xy = e.slice(0, 2)
  const rel = e.slice(3).replace(/\\/g, '/')
  if (rel.includes(' -> ')) continue            // 重命名条目取后半段更稳，此处略过极少见情况
  const abs = path.join(ROOT, rel)
  try {
    const st = fs.statSync(abs)
    if (!st.isFile()) { worktree[rel] = { xy, kind: 'dir' }; continue }
    worktree[rel] = {
      xy,
      kind: st.size > 8 * 1024 * 1024 ? 'big' : 'file',
      bytes: st.size,
      mtime: st.mtime.toISOString(),
      md5: st.size > 32 * 1024 * 1024 ? null : md5(fs.readFileSync(abs)),
    }
  } catch {
    worktree[rel] = { xy, kind: 'missing' }
  }
}

// 漂移检测必须排除两类**本任务自身**的噪声，否则信号会被淹没：
//   ① outputs/ —— 自己的报告/清单/指纹（每次运行都重写）
//   ② 未跟踪（`??`）—— 自己新建的脚本。新增文件是我方预期产物，不是外部写入。
// 真正决定「能否 APPLY」的信号是：**另一个会话是否又改了已跟踪文件**。
const SELF_SPACE = /^outputs\//
const external = (m) => Object.fromEntries(
  Object.entries(m).filter(([k, v]) => !SELF_SPACE.test(k) && v.xy !== '??'),
)

let drift = null
const prevRaw = fs.existsSync(FP_PATH) ? read(FP_PATH) : null
if (prevRaw) {
  try {
    const prev = JSON.parse(prevRaw)
    const pw = external(prev.worktree ?? {})
    const cw = external(worktree)
    const driftAdded = Object.keys(cw).filter((k) => !pw[k])
    const driftRemoved = Object.keys(pw).filter((k) => !cw[k])
    const driftChanged = Object.keys(cw)
      .filter((k) => pw[k] && pw[k].md5 && cw[k].md5 && pw[k].md5 !== cw[k].md5)
      .map((k) => ({ path: k, prevMtime: pw[k].mtime, nowMtime: cw[k].mtime }))
    drift = { prevAt: prev.at, added: driftAdded, removed: driftRemoved, changed: driftChanged, selfSpaceCount: Object.keys(worktree).length - Object.keys(cw).length, scope: Object.keys(cw).length }
  } catch { drift = null }
}

// ── 1. 基线固化 ─────────────────────────────────────────────────────────
const baseline = {}
for (const f of FILES) {
  const abs = path.join(DATA, f)
  const cur = read(abs)
  const head = gitShow(`data/${f}`)
  const st = fs.statSync(abs)
  baseline[f] = {
    md5: md5(cur),
    headMd5: head === null ? null : md5(head),
    sameAsHead: head !== null && md5(head) === md5(cur),
    bytes: st.size,
    mtime: st.mtime.toISOString(),
    trailingNewline: cur.endsWith('\n'),
  }
}

// ── 2. 字段级归属刻画 ───────────────────────────────────────────────────
const poolCur = JSON.parse(read(path.join(DATA, 'node-pool.json')))
const poolHead = JSON.parse(gitShow('data/node-pool.json') ?? '{}')
const seen = new Set([...Object.keys(poolHead), ...Object.keys(poolCur)])
const fieldTally = {}
const changedNodes = []
const tagAdds = []
const tagDels = []
for (const id of seen) {
  const a = poolHead[id]
  const b = poolCur[id]
  if (!a) { changedNodes.push({ id, kind: '仅在工作树新增' }); continue }
  if (!b) { changedNodes.push({ id, kind: '仅在工作树删除' }); continue }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  const diffKeys = [...keys].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))
  if (diffKeys.length === 0) continue
  diffKeys.forEach((k) => { fieldTally[k] = (fieldTally[k] || 0) + 1 })
  const ta = new Set(a.tags ?? [])
  const tb = new Set(b.tags ?? [])
  const add = [...tb].filter((t) => !ta.has(t))
  const del = [...ta].filter((t) => !tb.has(t))
  changedNodes.push({ id, label: b.label, diffKeys, tagsAdded: add, tagsRemoved: del })
  if (add.length) tagAdds.push({ id, label: b.label, add })
  if (del.length) tagDels.push({ id, label: b.label, del })
}

const qCur = JSON.parse(read(path.join(DATA, 'questions.json')))
const qHead = JSON.parse(gitShow('data/questions.json') ?? '[]')
const qHeadMap = new Map(qHead.map((q) => [q.id, q]))
const changedQuestions = []
for (const q of qCur) {
  const h = qHeadMap.get(q.id)
  if (!h) { changedQuestions.push({ id: q.id, kind: '新增' }); continue }
  const keys = new Set([...Object.keys(h), ...Object.keys(q)])
  const dk = [...keys].filter((k) => JSON.stringify(h[k]) !== JSON.stringify(q[k]))
  if (dk.length) changedQuestions.push({ id: q.id, diffKeys: dk })
}

// ── 3. 与阶段一的碰撞分析 ───────────────────────────────────────────────
const PHASE1_NAMES = ['类的分类', '抽象类', '具体类', '最终类', '封闭类', '内部类', '局部类', '匿名类', '元类',
  '分类', '类（编程）', '管理程序', '模拟器', 'select', 'epoll', '零拷贝', '数据结构', '备份与恢复', '备份和恢复',
  '物化视图', 'PipedInputStream']
const tree = JSON.parse(read(path.join(DATA, 'tree-data.json')))
const phase1Refs = new Set()
;(function w(n) { if (PHASE1_NAMES.includes(String(n.name)) && n.nodeRef) phase1Refs.add(n.nodeRef); (n.children || []).forEach(w) })(tree)

const collisions = changedNodes.filter((c) => phase1Refs.has(c.id))

// ── 报告 ────────────────────────────────────────────────────────────────
const L = []
const add = (s) => L.push(s)
add('# 外部改动归属与基线固化（只读对账）')
add('')
add(`> 生成时间 ${new Date().toISOString()} · **只读**：未 kill 任何进程、未回滚、未提交任何数据`)
add('')
add('## 0. 全工作树指纹与漂移检测')
add('')
add(`- 工作树当前有未提交变更的文件：**${Object.keys(worktree).length}** 个（\`git status --porcelain\` 全量，含 data/ 之外的 src、docs、配置）`)
add('')
const byTop = {}
for (const [rel, meta] of Object.entries(worktree)) {
  const top = rel.includes('/') ? rel.split('/')[0] + '/' : '(根目录)'
  byTop[top] = (byTop[top] ?? 0) + 1
}
add('| 顶层目录 | 变更文件数 |')
add('|---|---|')
Object.entries(byTop).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => add(`| \`${k}\` | ${v} |`))
add('')
if (drift) {
  add(`### 0.1 与上次快照（${drift.prevAt}）相比的漂移`)
  add('')
  add(`> 快照只看 **\`outputs/\` 之外的「已跟踪文件」**（${drift.scope} 个）—— 即另一个会话能改动的部分。`)
  add(`> 已排除：\`outputs/\`（本任务产物，${drift.selfSpaceCount} 个）与未跟踪新文件（\`??\`，本任务新建的脚本）。`)
  add(`> 因此下表**只反映外部会话对既有文件的写入** —— 这才是判断「能否 APPLY」的信号。`)
  add('')
  add(`- 新增变更文件 **${drift.added.length}** 个`)
  add(`- 消失的变更文件 **${drift.removed.length}** 个`)
  add(`- 内容又变的文件 **${drift.changed.length}** 个`)
  add('')
  if (drift.added.length) { add('新增：'); add(''); drift.added.slice(0, 20).forEach((p) => add(`- \`${p}\``)); if (drift.added.length > 20) add(`- …（其余 ${drift.added.length - 20} 个略）`); add('') }
  if (drift.changed.length) {
    add('| 文件 | 上次 mtime | 现在 mtime |')
    add('|---|---|---|')
    drift.changed.slice(0, 40).forEach((c) => add(`| \`${c.path}\` | ${c.prevMtime} | ${c.nowMtime} |`))
    if (drift.changed.length > 40) add(`| …（其余 ${drift.changed.length - 40} 个略） | | |`)
    add('')
  }
  const active = drift.changed.length + drift.added.length
  add(active === 0
    ? '- ✅ **外部无新写入**：与上次快照相比，`outputs/` 之外的变更文件集合与内容完全一致 → 外部批次可视为已收敛，具备进入 APPLY 的前置条件。'
    : `- ⚠️ **外部仍在写入（${active} 处）** → 外部批次**未收敛**。此时 APPLY 会与他人的写入交织在同一仓库状态里，无法拆分归属。**建议继续等。**`)
  add('')
} else {
  add('### 0.1 漂移')
  add('')
  add('- 首次运行，无历史快照可比。本次已写入 `worktree-fingerprint.json`，下次运行即可自动 diff。')
  add('')
}
add('## 1. 基线固化（下次用这张表判断「是否又变了」）')
add('')
add('| 文件 | 与 HEAD 一致 | 字节 | mtime(ISO) | 末尾换行 | 当前 md5 |')
add('|---|---|---|---|---|---|')
for (const f of FILES) {
  const b = baseline[f]
  add(`| \`${f}\` | ${b.sameAsHead ? '是' : '**否（外部改动）**'} | ${b.bytes} | ${b.mtime} | ${b.trailingNewline ? '**有（违反契约）**' : '无'} | \`${b.md5.slice(0, 12)}\` |`)
}
add('')
add('## 2. 外部改动刻画（逐 node id 字段级差分，对照 HEAD）')
add('')
add(`- 涉及节点 **${changedNodes.length}** 个；被改字段计数：${Object.entries(fieldTally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `\`${k}\`×${v}`).join(' · ') || '（无）'}`)
add(`- 题库改动 **${changedQuestions.length}** 条`)
add('')
add('### 2.1 改了什么（按字段）')
add('')
add('| 字段 | 命中节点数 |')
add('|---|---|')
for (const [k, v] of Object.entries(fieldTally).sort((a, b) => b[1] - a[1])) add(`| \`${k}\` | ${v} |`)
add('')
if (tagAdds.length) {
  add('### 2.2 tags 净新增（含自身 label 的既有惯例）')
  add('')
  add(`共 ${tagAdds.length} 个节点被加了 tag，样例：`)
  add('')
  tagAdds.slice(0, 20).forEach((t) => add(`- \`${t.id}\`（${t.label}）→ +${JSON.stringify(t.add)}`))
  if (tagAdds.length > 20) add(`- …（其余 ${tagAdds.length - 20} 个略）`)
  add('')
}
if (tagDels.length) {
  add('### 2.3 tags 净删除')
  add('')
  tagDels.forEach((t) => add(`- \`${t.id}\`（${t.label}）→ −${JSON.stringify(t.del)}`))
  add('')
}
add('### 2.4 题库改动')
add('')
changedQuestions.forEach((q) => add(`- \`${q.id}\` → 字段 ${JSON.stringify(q.diffKeys ?? q.kind)}`))
add('')
add('### 2.5 全量节点清单（供后续对拍）')
add('')
changedNodes.slice(0, 200).forEach((c) => add(`- \`${c.id}\`（${c.label ?? '-'}）→ ${JSON.stringify(c.diffKeys ?? c.kind)}`))
if (changedNodes.length > 200) add(`- …（其余 ${changedNodes.length - 200} 个略，完整见同名 .json）`)
add('')
add('## 3. 与阶段一的碰撞分析（这是真正要看的）')
add('')
add(`- 阶段一涉及的树条目共引用 **${phase1Refs.size}** 个池节点`)
add(`- **与外部改动相交的节点：${collisions.length} 个**`)
add('')
if (collisions.length === 0) {
  add('- ✅ **无交集** → 阶段一与外部批次改的是不同节点，理论上可以并行；但仍受「同一文件写入」的物理约束')
} else {
  add('| 池节点 id | label | 被改字段 | 阶段一为何关心 |')
  add('|---|---|---|---|')
  collisions.forEach((c) => add(`| \`${c.id}\` | ${c.label ?? '-'} | ${JSON.stringify(c.diffKeys ?? c.kind)} | 阶段一目标名命中 |`))
  add('')
  add('- ⚠️ **有交集 → 存在顺序约束**：必须等外部批次收敛（提交或明确停手）后，基于其后的新基线做 dry-run，')
  add('  否则阶段一的 diff 会与它混在一起，无法拆分归属。')
}
add('')
add('## 4. 结论与闸门状态')
add('')
const blocked = FILES.filter((f) => !baseline[f].sameAsHead)
add(`- 与 HEAD 不一致的文件：${blocked.length ? blocked.map((f) => `\`${f}\``).join(' · ') : '无'}`)
add(`- 格式契约违规（末尾换行）：${FILES.filter((f) => baseline[f].trailingNewline).map((f) => `\`${f}\``).join(' · ') || '无'}`)
add('- **本脚本不修任何一项** —— 归属未确认前，修 = 替别人做决定')
add('')

const md = L.join('\n')
fs.mkdirSync(OUT_DIR, { recursive: true })
const outMd = path.join(OUT_DIR, 'external-change-baseline.md')
const tmp = `${outMd}.tmp-${process.pid}-${Date.now()}`
fs.writeFileSync(tmp, md, 'utf8')
try { fs.renameSync(tmp, outMd) } catch (e) { fs.writeFileSync(outMd, md, 'utf8'); try { fs.unlinkSync(tmp) } catch { /* noop */ } }
fs.writeFileSync(path.join(OUT_DIR, 'external-change-baseline.json'), JSON.stringify({ baseline, fieldTally, changedNodes, changedQuestions, collisions: collisions.map((c) => c.id), worktree, drift }, null, 2), 'utf8')
fs.writeFileSync(FP_PATH, JSON.stringify({ at: new Date().toISOString(), count: Object.keys(worktree).length, worktree }, null, 2), 'utf8')

console.log(`基线报告：${path.relative(ROOT, outMd)}`)
console.log(`与 HEAD 不一致：${blocked.join(', ') || '无'}`)
console.log(`外部改动节点 ${changedNodes.length} 个 · 题库 ${changedQuestions.length} 条 · 与阶段一碰撞 ${collisions.length} 个`)
console.log(`工作树变更文件 ${Object.keys(worktree).length} 个${drift ? ` · 漂移：新增 ${drift.added.length} / 又变 ${drift.changed.length}` : ' · 首次快照已写入'}`)
