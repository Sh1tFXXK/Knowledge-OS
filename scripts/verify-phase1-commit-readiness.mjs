/**
 * 批次提交就绪核验（只读）—— **manifest 驱动**，可用于任意批次。
 *
 * 用法：
 *   node scripts/verify-phase1-commit-readiness.mjs                 # 默认批次 phase1
 *   node scripts/verify-phase1-commit-readiness.mjs --batch <id>    # batch-manifests/<id>.json
 *   node scripts/verify-phase1-commit-readiness.mjs --manifest <p>  # 指定 manifest 路径
 *   node scripts/verify-phase1-commit-readiness.mjs --skip-tests    # 跳过检查 F（快跑）
 * 产出：outputs/tree-violation-scan/readiness-<batchId>.json
 * 退出码：0 = READY；1 = NOT_READY（含阻塞原因）
 *
 * ────────────────────────────────────────────────────────────────────────
 * 为什么需要它（用户 2026-09-14 定的提交纪律）：
 *   **「G2 无新漂移」≠「HEAD 是干净基线」。**
 *   两者是**正交**的两件事，提交前必须**同时**验证：
 *
 *   ┌─ Ancestor Gate（祖先差异）
 *   │   问题：我们动手前的基线，与 **HEAD（祖先提交）** 是不是同一个东西？
 *   │   依据：`git show HEAD:data/<f>` 与 data/backups/<批次>/<f> 的**逐字节**比对
 *   │   作用：只有相等，才说明「提交该文件 = 提交本批操作」。不等 ⇒ 会夹带他人改动。
 *   │
 *   └─ Timeline Gate（时间线漂移）
 *       问题：自 reconcile 快照以来，已跟踪文件有没有被**再次**写入？
 *       依据：outputs/.../worktree-fingerprint.json（mtime + md5 快照）
 *       判据（2026-09-14 起，见 docs/BATCH_MANIFEST.md）：
 *         allowedDrift    = writeSet ∪ governanceSet ∪ declaredExternalSet
 *         unexpectedDrift = trackedDrift − allowedDrift       必须 == ∅
 *       局限：改动**早于**快照就已存在时它检测不到 —— 只能证明「没新增」，故必须靠 Ancestor Gate 兜底。
 *
 *   ⛔ 两闸**绝不能合并**：它们问的是两个不同问题。合并会得出错误结论。
 *
 * manifest 定义三个集合（`batch-manifests/<batchId>.json`）：
 *   writeSet           本批能写、且**要提交**的路径（= git add 的全部内容）
 *   governanceSet      同期治理文档：**允许漂移，但不由本批提交**（由 governance 批次提交）
 *   declaredExternalSet 已确认属其他会话/批次的在飞文件：允许漂移，不提交
 *   → 关键区分：allowedDrift（是否阻塞）≠ pathspec（提交什么）。
 *
 * ⚠️ 判据实现坑：
 *   ① **不要**在 Git Bash 里用 `git show ... | node` 管道算 md5（会给出错误结论）。
 *      必须单进程 `execSync('git show ...', {encoding:'buffer'})` + `Buffer.compare`。
 *   ② 报「npm test N/N」前先分清 tracked / peer / working-tree（检查 F）——
 *      `node --test` 零参数会**自动发现未跟踪**的测试文件，单一 N/N 在干净克隆上不可复现。
 *   ③ 别用 `Get-CimInstance Win32_Process` 判断有无并发写入会话（实测会静默返回空）；
 *      以 `netstat -ano` + `tasklist` 为准。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const FP_PATH = path.join(OUT_DIR, 'worktree-fingerprint.json')
const MANIFEST_DIR = path.join(ROOT, 'batch-manifests')

const argv = process.argv.slice(2)
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const SKIP_TESTS = argv.includes('--skip-tests')

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const gitShowBuf = (rel) => execSync('git show HEAD:' + rel, { cwd: ROOT, encoding: 'buffer', maxBuffer: 1 << 28 })
const sha = (buf) => createHash('md5').update(buf).digest('hex')
const ok = (b) => (b ? '✅' : '❌')

// ── manifest 载入 ───────────────────────────────────────────────────────
const requested = argOf('--manifest')
const batchId = argOf('--batch') ?? 'phase1'
const manifestPath = requested ? path.resolve(ROOT, requested) : path.join(MANIFEST_DIR, batchId + '.json')

const listManifests = () => {
  if (!fs.existsSync(MANIFEST_DIR)) return []
  const out = []
  for (const f of fs.readdirSync(MANIFEST_DIR)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue
    const p = path.join(MANIFEST_DIR, f)
    try {
      const m = { file: f, ...rd(p) }
      out.push(m)
      // ── 结构体检：**静默失效的声明**比缺声明更危险（写了却没生效）──────────
      // ① glob：inSet 只认「精确路径」与「尾斜杠前缀」两种形态，
      //    `outputs/x/phase1-*.json` 这种通配串既不是精确路径、也不是前缀 → 永不命中。
      // ② 自相矛盾：同一路径同时在 writeSet 与 excludedSet。
      for (const key of ['writeSet', 'governanceSet', 'declaredExternalSet', 'excludedSet']) {
        for (const entry of m[key] ?? []) {
          if (!entry.endsWith('/') && /[*?[\]]/.test(entry)) {
            manifestWarnings.push('⚠️ ' + f + ' 的 ' + key + ' 含通配串（永不命中，等于没写）：' + entry)
          }
        }
      }
      const conflict = (m.writeSet ?? []).filter((rel) =>
        (m.excludedSet ?? []).some((p2) => (p2.endsWith('/') ? rel.startsWith(p2) : rel === p2)))
      if (conflict.length) manifestWarnings.push('⚠️ ' + f + ' 自相矛盾（writeSet ∩ excludedSet）：' + conflict.join(', '))
    } catch (e) {
      // ⛔ 不能静默丢弃：损坏的 manifest 会让对应批次的文件被误判成「未登记外部文件」，
      //    而 manifest 机制的整个目的就是消灭这种「归属不明」。必须显式报错。
      manifestWarnings.push('❌ manifest 解析失败（该批次全部声明失效）：' + f + ' → ' + e.message)
      manifestBroken.push(f)
    }
  }
  return out
}
const manifestBroken = []

let manifest = null
let manifestWarnings = []
if (fs.existsSync(manifestPath)) {
  manifest = rd(manifestPath)
} else {
  manifestWarnings.push('⚠️ 未找到 manifest：' + path.relative(ROOT, manifestPath) + ' → 回落到脚本内置白名单（兼容模式）')
}

const others = listManifests().filter((m) => m.batchId !== manifest?.batchId)

const isPrefix = (p) => p.endsWith('/')
const inSet = (set, rel) => (set ?? []).some((p) => (isPrefix(p) ? rel.startsWith(p) : rel === p))

// ── 写集（单一事实来源：manifest；无 manifest 时回落到内置白名单）──────────
const LEGACY = {
  writeSet: [
    'data/tree-data.json', 'data/node-pool.json', 'data/knowledge-edges.json', 'data/evolution-events.json',
    'scripts/plan-phase1-relocation.mjs', 'scripts/normalize-phase1-blueprint.mjs', 'scripts/dryrun-phase1.mjs',
    'scripts/apply-phase1.mjs', 'scripts/patch-phase1-evolution-event.mjs', 'scripts/metrics-phase1.mjs',
    'scripts/reconcile-external-changes.mjs', 'scripts/export-tree-listing.mjs',
    'scripts/verify-phase1-commit-readiness.mjs',
    'outputs/tree-violation-scan/', 'outputs/universe-tree-listing/',
  ],
  governanceSet: [
    'docs/CONSTITUTION.md', 'docs/adr/0002-identity-and-observation-discipline.md',
    'outputs/tree-violation-scan/governance-ledger.md',
  ],
  declaredExternalSet: [],
}
const WRITE_SET = manifest?.writeSet ?? LEGACY.writeSet
const GOVERNANCE_SET = manifest?.governanceSet ?? LEGACY.governanceSet
const EXTERNAL_SET = manifest?.declaredExternalSet ?? LEGACY.declaredExternalSet
const EXCLUDED_SET = manifest?.excludedSet ?? []

const IN_SCOPE_DATA = WRITE_SET.filter((p) => /^data\/.+\.json$/.test(p))
const IN_SCOPE_SCRIPTS = WRITE_SET.filter((p) => /^scripts\//.test(p))
const IN_SCOPE_OUTPUTS = WRITE_SET.filter((p) => /^outputs\//.test(p))

// 只探测、不进写集的数据文件（用于暴露「外部也在改 data/」这类事实）
const PROBE_EXTRA = (manifest?.gates?.timeline?.probes ?? ['data/questions.json'])
const ALL_DATA_PROBED = [...new Set([...IN_SCOPE_DATA, ...PROBE_EXTRA])]

// ⛔ 硬不变量（用户 2026-09-14 锁死）：commitPathspec ≡ writeSet，**永远不并入**其他两个集合。
//    目的：即使某批次声明了大量外部文件，自动提交器也不可能因「允许漂移」而顺手提交它们。
//    allowedDrift 只回答「是否阻塞」；pathspec 只回答「提交什么」。二者永不互换。
const PATHSPEC_LEAK = WRITE_SET.filter((p) => inSet(GOVERNANCE_SET, p) || inSet(EXTERNAL_SET, p))

// ⛔ 自相矛盾检查：同一路径不可能既「本批要提交」又「本批硬排除」。
//    常见成因：excludedSet 里放了宽目录前缀（如 `outputs/x/`），又在该目录下提交具体文件。
const EXCLUSION_CONFLICT = WRITE_SET.filter((p) => inSet(EXCLUDED_SET, p))

// 本批的合法修改声明（超出即夹带）
const EXPECTED_MODIFIED = []
for (const [rel, d] of Object.entries(manifest?.expectedDelta ?? {})) {
  if (d && Array.isArray(d.modified)) EXPECTED_MODIFIED.push(...d.modified)
}

const bkRoot = path.join(DATA, 'backups')
let bkDir = null, bkDirName = null
if (manifest?.preBatchSnapshot) {
  bkDir = path.join(ROOT, manifest.preBatchSnapshot)
  bkDirName = path.basename(bkDir)
} else {
  const cands = fs.existsSync(bkRoot) ? fs.readdirSync(bkRoot).filter((d) => d.startsWith('phase1-oop-os-')).sort() : []
  bkDirName = cands.pop() ?? null
  if (bkDirName) bkDir = path.join(bkRoot, bkDirName)
}

const report = {
  generatedAt: new Date().toISOString(),
  batchId: manifest?.batchId ?? batchId,
  baseRef: manifest?.baseRef ?? null,
  manifestPath: fs.existsSync(manifestPath) ? path.relative(ROOT, manifestPath).replace(/\\/g, '/') : null,
  manifestWarnings,
  brokenManifests: manifestBroken,
  backupDir: bkDirName ? path.join('data/backups', bkDirName) : null,
  discipline: {
    ancestralDiff: 'HEAD 与「落盘前基线」是否逐字节相同（决定「提交 = 本批」是否成立）—— Ancestor Gate',
    temporalDrift: 'unexpectedDrift = trackedDrift − (writeSet ∪ governanceSet ∪ declaredExternalSet) == ∅ —— Timeline Gate',
    warning: '两闸正交：时间线无漂移 ≠ HEAD 是干净基线。必须同时验证，**绝不能合并**。',
  },
  writeSet: WRITE_SET,
  governanceSet: GOVERNANCE_SET,
  declaredExternalSet: EXTERNAL_SET,
  excludedSet: EXCLUDED_SET,
  checks: {},
}
const L = (s = '') => console.log(s)

L('════ 批次提交就绪核验 ════')
L('  批次：' + report.batchId + '  ·  baseRef：' + (report.baseRef ?? '(未声明)'))
L('  manifest：' + (report.manifestPath ?? '（缺失，兼容模式）'))
for (const w of manifestWarnings) L('  ' + w)
L('  写集 ' + WRITE_SET.length + ' 项 · 治理 ' + GOVERNANCE_SET.length + ' 项 · 外部声明 ' + EXTERNAL_SET.length + ' 项')
L('  硬不变量 commitPathspec ≡ writeSet：' + ok(PATHSPEC_LEAK.length === 0) +
  (PATHSPEC_LEAK.length ? ' 越界 ' + PATHSPEC_LEAK.join(', ') : ' 无越界（declaredExternalSet / governanceSet 均未混入 pathspec）'))
L('  自相矛盾 writeSet ∩ excludedSet：' + ok(EXCLUSION_CONFLICT.length === 0) +
  (EXCLUSION_CONFLICT.length ? '  ⛔ 既提交又排除：' + EXCLUSION_CONFLICT.join(', ') : ' 无'))
if (manifest?.commitSubjectHint) L('  建议提交信息：' + manifest.commitSubjectHint)

// ══ 检查 A：Ancestor Gate（HEAD ↔ 落盘前备份，逐字节）════════════════════
L('\n【检查 A · Ancestor Gate 祖先差异】HEAD ↔ 落盘前备份（逐字节 Buffer.compare）')
L('  备份：' + report.backupDir)
const ancestral = {}
for (const rel of ALL_DATA_PROBED) {
  const f = rel.replace(/^data\//, '')
  const bp = path.join(bkDir, f)
  if (!fs.existsSync(bp)) { L('  ⏭ ' + rel + '  备份中不存在，跳过'); continue }
  const head = gitShowBuf(rel)
  const back = fs.readFileSync(bp)
  const rawEq = Buffer.compare(head, back) === 0
  let normEq = false, diffKeys = 0, onlyHead = 0, onlyBack = 0
  try {
    const a = JSON.parse(head.toString('utf8'))
    const b = JSON.parse(back.toString('utf8'))
    normEq = JSON.stringify(a) === JSON.stringify(b)
    if (Array.isArray(a) && Array.isArray(b)) {
      const keyOf = (x, i) => (x && typeof x === 'object' && typeof x.id === 'string' ? x.id : '#' + i)
      const ma = new Map(a.map((x, i) => [keyOf(x, i), x]))
      const mb = new Map(b.map((x, i) => [keyOf(x, i), x]))
      onlyHead = [...ma.keys()].filter((k) => !mb.has(k)).length
      onlyBack = [...mb.keys()].filter((k) => !ma.has(k)).length
      diffKeys = [...ma.keys()].filter((k) => mb.has(k) && JSON.stringify(ma.get(k)) !== JSON.stringify(mb.get(k))).length
    } else if (a && b && typeof a === 'object') {
      const ak = Object.keys(a)
      const bkk = new Set(Object.keys(b))
      onlyHead = ak.filter((k) => !bkk.has(k)).length
      onlyBack = Object.keys(b).filter((k) => !Object.prototype.hasOwnProperty.call(a, k)).length
      diffKeys = ak.filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).length
    }
  } catch { /* 解析失败即视为不等 */ }
  ancestral[rel] = {
    headBytes: head.length, baselineBytes: back.length, rawEqual: rawEq, normalizedEqual: normEq,
    contentDiffKeys: diffKeys, onlyHeadKeys: onlyHead, onlyBaselineKeys: onlyBack,
    md5Head: sha(head), md5Baseline: sha(back),
  }
  const inScope = IN_SCOPE_DATA.includes(rel)
  const detail = rawEq ? '  → 提交 diff 即本批'
    : '  → ⚠️ 不等：内容差异 ' + diffKeys + ' · 仅 HEAD ' + onlyHead + ' · 仅基线 ' + onlyBack
  L('  ' + ok(rawEq) + ' ' + rel.padEnd(28) + String(head.length).padStart(10) + ' / ' + String(back.length).padStart(10) +
    detail + (inScope ? '' : '（非本批写入，仅探测）'))
}
report.checks.ancestral = ancestral

// ══ 检查 B：Timeline Gate（unexpectedDrift == ∅）═════════════════════════
L('\n【检查 B · Timeline Gate 时间线漂移】allowedDrift = writeSet ∪ governanceSet ∪ declaredExternalSet')
const otherBatchSet = others.flatMap((m) => m.writeSet ?? [])
const bucketOf = (rel) => {
  if (inSet(WRITE_SET, rel)) return 'batchWriteSet'
  if (inSet(GOVERNANCE_SET, rel)) return 'governanceSet'
  if (inSet(EXTERNAL_SET, rel)) return 'declaredExternalSet'
  if (inSet(otherBatchSet, rel)) return 'otherOwnBatch'
  return 'UNDECLARED'
}
let temporal = { available: false }
if (fs.existsSync(FP_PATH)) {
  const fp = rd(FP_PATH)
  const prev = Object.fromEntries(Object.entries(fp.worktree ?? {}).filter(([k, v]) => v.xy !== '??'))
  const curRaw = execSync('git status --porcelain=v1 -z', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
  const cur = {}
  for (const e of curRaw.split('\0').filter(Boolean)) {
    const xy = e.slice(0, 2)
    const rel = e.slice(3).replace(/\\/g, '/')
    if (xy === '??') continue // 未跟踪件不属「已跟踪文件漂移」，与快照口径一致
    const abs = path.join(ROOT, rel)
    let md5 = null
    try { if (fs.statSync(abs).isFile()) md5 = sha(fs.readFileSync(abs)) } catch { md5 = null }
    cur[rel] = { xy, md5 }
  }
  // outputs/ 每跑一次脚本就变，永远计入漂移没有信息量 —— 显式忽略并声明
  const DRIFT_IGNORE = [/^outputs\//]
  const key = (m) => Object.keys(m).filter((k) => !DRIFT_IGNORE.some((re) => re.test(k)))
  const added = key(cur).filter((k) => !prev[k])
  const gone = Object.keys(prev).filter((k) => !cur[k])
  const changed = key(cur).filter((k) => prev[k]?.md5 && cur[k].md5 && prev[k].md5 !== cur[k].md5)
  const drift = [...new Set([...added, ...gone, ...changed])]
  const byBucket = {}
  for (const rel of drift) (byBucket[bucketOf(rel)] ??= []).push(rel)
  const unexpectedDrift = byBucket.UNDECLARED ?? []
  temporal = {
    available: true, snapshotAt: fp.at, snapshotCount: Object.keys(prev).length,
    added, gone, changed, driftTotal: drift.length,
    allowedDrift: { batchWriteSet: byBucket.batchWriteSet ?? [], governanceSet: byBucket.governanceSet ?? [], declaredExternalSet: byBucket.declaredExternalSet ?? [], otherOwnBatch: byBucket.otherOwnBatch ?? [] },
    unexpectedDrift,
    ignoredByRule: DRIFT_IGNORE.map(String),
  }
  L('  快照时间：' + fp.at + '（' + Object.keys(prev).length + ' 个已跟踪文件）')
  L('  漂移总览：新增 ' + added.length + ' · 消失 ' + gone.length + ' · 再变 ' + changed.length + ' → 去重 ' + drift.length)
  L('  ✅ 本批写集内（允许）：' + (byBucket.batchWriteSet ?? []).length + ' 个')
  L('  ✅ 治理集（允许，不由本批提交）：' + (byBucket.governanceSet ?? []).length + ' 个' + ((byBucket.governanceSet ?? []).length ? '  → ' + byBucket.governanceSet.join(', ') : ''))
  L('  ✅ 外部声明集（允许）：' + (byBucket.declaredExternalSet ?? []).length + ' 个' + ((byBucket.declaredExternalSet ?? []).length ? '  → ' + byBucket.declaredExternalSet.join(', ') : ''))
  if ((byBucket.otherOwnBatch ?? []).length) L('  ℹ️ 自有其他批次（登记在别的 manifest）：' + byBucket.otherOwnBatch.join(', '))
  L('  ' + ok(unexpectedDrift.length === 0) + ' unexpectedDrift（未声明）：' + unexpectedDrift.length +
    (unexpectedDrift.length ? '  → ' + unexpectedDrift.join(', ') : '  → 无'))
  L('  ⚠️ 本检查只能证明「快照之后没新增」；快照之前就存在的改动它检测不到 —— 必须靠检查 A 兜底。')
} else {
  L('  ❌ 缺 ' + path.relative(ROOT, FP_PATH) + '（无法判定时间线漂移）')
}
report.checks.temporal = temporal

// ══ 检查 C：本批对 node-pool 的 Δ ═══════════════════════════════════════
L('\n【检查 C · 本批对 pool 的 Δ】备份 → 当前，须恰为「新增 + 已声明的修改」')
const poolRel = 'data/node-pool.json'
let deltaOk = true
let addedIds = [], removedIds = [], modifiedIds = [], unexpectedModified = [], expectedNew = []
if (bkDir && IN_SCOPE_DATA.includes(poolRel)) {
  const bPool = rd(path.join(bkDir, 'node-pool.json'))
  const cPool = rd(path.join(DATA, 'node-pool.json'))
  addedIds = Object.keys(cPool).filter((k) => !bPool[k])
  removedIds = Object.keys(bPool).filter((k) => !cPool[k])
  modifiedIds = Object.keys(bPool).filter((k) => cPool[k] && JSON.stringify(bPool[k]) !== JSON.stringify(cPool[k]))
  unexpectedModified = modifiedIds.filter((k) => !EXPECTED_MODIFIED.includes(k))
  const decl = manifest?.expectedDelta?.[poolRel]
  expectedNew = decl?.added ?? []
  if ((decl?.removed ?? []).length === 0 && removedIds.length) deltaOk = false
  if (decl?.before != null && Object.keys(bPool).length !== decl.before) deltaOk = false
  deltaOk = deltaOk && unexpectedModified.length === 0 &&
    addedIds.length === expectedNew.length && expectedNew.every((id) => addedIds.includes(id))
  L('  新增 ' + addedIds.length + '（声明 ' + expectedNew.length + '）· 修改 ' + modifiedIds.length +
    '（声明的合法修改 ' + EXPECTED_MODIFIED.length + '，超出即夹带）· 删除 ' + removedIds.length + '（须 0）')
  L('  ' + ok(deltaOk) + (deltaOk ? ' Δ 恰好 = 声明的新增 + 合法修改' : ' Δ 与声明不符'))
  if (unexpectedModified.length) L('    ⚠️ **超出声明**的被改既有实体：' + unexpectedModified.join(', '))
  if (removedIds.length) L('    ⚠️ 被删除：' + removedIds.slice(0, 8).join(', '))
}
report.checks.phase1Delta = { added: addedIds, expectedNew, modified: modifiedIds, expectedModified: EXPECTED_MODIFIED, unexpectedModified, removed: removedIds, ok: deltaOk }

// ══ 观察项：改名后的「旧值残留（stale value）」检测 ══════════════════════
// ⛔ 契约（ADR-0002 · T4 裁决后确立）：
//    检测器**只负责发现证据**，**不负责判定**，**绝不产出 action / 绝不自动修正**。
//    输出三元组：{ staleSignature, severity, disposition }；判定权在治理规则阶段（由人裁决）。
//    反面教材：曾据单例断言「改名必须同步全部同位字段」→ 全库证伪后是 146 个误报。
//    检测对象 = 「字段值恰等于该实体**改名前的旧值**」，而不是「当前值没等于新值」。
const cls = (a, b) => (a === b ? 'same' : a.includes(b) || b.includes(a) ? 'subset' : 'disjoint')
const IDENTITY_COUPLED = [/^label$/, /^name$/, /^card\.nodeId$/, /^canonicalKey$/, /^relatedNodeId$/, /^canonicalNodeId$/, /^redirectTo$/]
const isIdentityCoupled = (p) => IDENTITY_COUPLED.some((re) => re.test(p))
const isAliasBearing = (p) => /^(tags|aliases)\b/.test(p)
const stringPaths = (v, prefix = '') => {
  if (typeof v === 'string') return [{ path: prefix, value: v }]
  if (Array.isArray(v)) return v.flatMap((x, i) => stringPaths(x, prefix + '[' + i + ']'))
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => stringPaths(x, prefix ? prefix + '.' + k : k))
  return []
}

const residuals = []
let cPoolAll = null
if (modifiedIds.length && bkDir) {
  const bPool = rd(path.join(bkDir, 'node-pool.json'))
  cPoolAll = rd(path.join(DATA, 'node-pool.json'))
  for (const id of modifiedIds) {
    const oldLabel = bPool[id]?.label
    const now = cPoolAll[id]
    if (oldLabel === undefined || !now) continue
    const hits = stringPaths(now).filter((h) => h.value === oldLabel)
    if (!hits.length) continue
    const aliasRetained = hits.some((h) => isAliasBearing(h.path))
    const items = hits.map((h) => {
      let severity, disposition
      if (isAliasBearing(h.path)) { severity = '🟡'; disposition = 'intentional-alias' }
      else if (isIdentityCoupled(h.path)) { severity = '🔴'; disposition = 'defect-candidate' }
      else if (aliasRetained) { severity = '🟡'; disposition = 'intentional-alias' }
      else { severity = '🟡'; disposition = 'needs-adjudication' }
      return { fieldPath: h.path, oldValue: h.value, severity, disposition }
    })
    residuals.push({ nodeId: id, oldLabel, newLabel: now.label, staleSignature: true, aliasRetained, staleHits: items,
      note: '仅发现证据；是否修改由治理规则裁决（ADR-0002）。检测器不自动修正。' })
  }
}
if (!cPoolAll) cPoolAll = rd(path.join(DATA, 'node-pool.json'))
const allLabelTitleDiff = Object.values(cPoolAll).filter((v) => v.card && v.label !== v.card.title)
const allTreeNameLabelDiff = (() => {
  let n = 0
  const walk = (x) => { if (x.nodeRef && cPoolAll[x.nodeRef] && String(x.name ?? '') !== String(cPoolAll[x.nodeRef].label ?? '')) n++; (x.children || []).forEach(walk) }
  walk(rd(path.join(DATA, 'tree-data.json')))
  return n
})()
const allCardNodeIdMismatch = Object.entries(cPoolAll).filter(([k, v]) => v.card && v.card.nodeId !== k).length
report.fieldCoherenceContext = {
  labelNeCardTitle: allLabelTitleDiff.length,
  labelNeCardTitle_subset: allLabelTitleDiff.filter((v) => cls(String(v.label), String(v.card.title)) === 'subset').length,
  treeNameNePoolLabel: allTreeNameLabelDiff,
  cardNodeIdMismatch: allCardNodeIdMismatch,
  invariant: 'card.nodeId ≡ 池键（唯一真正的不变量，当前违例 ' + allCardNodeIdMismatch + '）',
}
report.detectorContract = {
  stage: 'evidence-only',
  outputs: ['staleSignature', 'severity', 'disposition'],
  neverOutputs: ['action', 'autoFix'],
  dispositions: ['intentional-alias', 'defect-candidate', 'needs-adjudication', 'display-enrichment'],
}
report.residuals = residuals
if (residuals.length) {
  L('\n【观察项 · 旧值残留检测】' + residuals.length + ' 项（**只发现证据，不自动修正**）')
  for (const r of residuals) {
    L('    · ' + r.nodeId + '  旧名「' + r.oldLabel + '」 → 新名「' + r.newLabel + '」')
    L('      staleSignature=' + r.staleSignature + ' · aliasRetained=' + r.aliasRetained)
    for (const h of r.staleHits) L('      ' + h.severity + ' ' + h.fieldPath + ' = "' + h.oldValue + '"  → ' + h.disposition)
  }
  const fc = report.fieldCoherenceContext
  L('    背景（全省同类差异 —— 说明这**不是**「字段必须相等」的不变量）：')
  L('      label ≠ card.title                : ' + fc.labelNeCardTitle + ' 例（其中互为子串 ' + fc.labelNeCardTitle_subset + '）')
  L('      树 name ≠ 池 label                : ' + fc.treeNameNePoolLabel + ' 例')
  L('      card.nodeId ≠ 池键（真正的不变量） : ' + fc.cardNodeIdMismatch + ' 例')
  L('    ⛔ 检测器**不产出 action** —— 判定权在治理规则阶段（ADR-0002）。')
}

// ══ 检查 D：其他会话在飞文件（信息项）════════════════════════════════════
const statusRaw = execSync('git status --porcelain=v1 -z', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
const ownBatches = [manifest, ...others].filter(Boolean)

// ⚠️ 归属强度三分（2026-09-14 修正）：
//   excludedSet 是**负向声明**（「本批不碰它」），**不构成认领**。
//   旧实现把 excludedSet 并入「已被某批次声明」→ 一个宽目录前缀（例如 gov-v1.1 的
//   `outputs/tree-violation-scan/`）会把「其实无人认领」的文件静默吞掉。
//   实证：`t3-mapping-review.md` 就是这样漏出写集的。
const OWNERS_ONLY = (rel) => ownBatches.filter((m) =>
  inSet(m.writeSet, rel) || inSet(m.governanceSet, rel) || inSet(m.declaredExternalSet, rel))
const EXCLUDERS = (rel) => ownBatches.filter((m) => inSet(m.excludedSet, rel))
// excludedSet 中以目录前缀（尾斜杠）命中 = 宽刷子；精确路径命中 = 刻意逐文件排除
const excludedByPrefix = (rel, m) => (m.excludedSet ?? []).some((p) => isPrefix(p) && rel.startsWith(p))
const excludedByExact = (rel, m) => (m.excludedSet ?? []).some((p) => !isPrefix(p) && rel === p)

const owned_ = [], exclExact_ = [], exclPrefix_ = [], others_ = []
// ⚠️ git 会把**未跟踪的整个目录**折叠成一条 `?? dir/` —— 若只按条目名匹配，
//    目录内的文件级声明永远匹配不上（声明了却判成「无人认领」）。
//    故这里把未跟踪目录**展开成文件**再匹配。
const expandUntrackedDir = (rel) => {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [rel]
  const out = []
  const rec = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, e.name)
      if (e.isDirectory()) rec(child)
      else out.push(path.relative(ROOT, child).replace(/\\/g, '/'))
    }
  }
  rec(abs)
  return out.length ? out : [rel]
}
for (const raw of statusRaw.split('\0').filter(Boolean)) {
  const xy = raw.slice(0, 2)
  const rel0 = raw.slice(3).replace(/\\/g, '/')
  if (rel0.startsWith('batch-manifests/')) continue
  const rels = rel0.endsWith('/') ? expandUntrackedDir(rel0) : [rel0]
  for (const rel of rels) {
    const owners = OWNERS_ONLY(rel)
    if (owners.length) { owned_.push({ rel, xy, by: owners.map((m) => m.batchId) }); continue }
    const ex = EXCLUDERS(rel)
    if (!ex.length) { others_.push({ rel, xy }); continue }
    const prefixOnly = ex.every((m) => excludedByPrefix(rel, m) && !excludedByExact(rel, m))
    const rec2 = { rel, xy, by: ex.map((m) => m.batchId) }
    ;(prefixOnly ? exclPrefix_ : exclExact_).push(rec2)
  }
}
L('\n【检查 D · 在飞文件归属强度】（正向声明 = 认领；excludedSet = 负向声明，不等于认领）')
L('  ✅ 正向认领（writeSet ∪ governanceSet ∪ declaredExternalSet）：' + owned_.length + ' 个')
L('  ✅ 精确排除（excludedSet 精确路径，刻意逐文件排除）：' + exclExact_.length + ' 个' +
  (exclExact_.length ? '  → ' + exclExact_.map((o) => o.rel).join(', ') : ''))
L('  ⚠️ 仅被目录前缀排除（宽刷子，**不构成认领**）：' + exclPrefix_.length + ' 个')
for (const o of exclPrefix_) L('    ' + o.xy + ' ' + o.rel + '   ← 仅命中 ' + o.by.join(',') + ' 的 excludedSet 目录前缀；请确认是否应进某个 writeSet')
L('  ⛔ 完全无人认领：' + others_.length + ' 个')
for (const o of others_) L('    ' + o.xy + ' ' + o.rel + '   ⚠️ 未在任何 manifest 中声明，请确认归属')
report.checks.ownership = {
  owned: owned_.map((o) => ({ rel: o.rel, by: o.by })),
  excludedExact: exclExact_.map((o) => ({ rel: o.rel, by: o.by })),
  excludedByPrefixOnly: exclPrefix_.map((o) => ({ rel: o.rel, by: o.by })),
  unowned: others_.map((o) => o.rel),
}
report.checks.otherSessionFiles = others_.map((o) => o.rel)
report.checks.undeclaredFiles = others_

// ══ 检查 E：候选件齐备性 ════════════════════════════════════════════════
const missing = [...IN_SCOPE_SCRIPTS, ...IN_SCOPE_OUTPUTS.filter((p) => !p.endsWith('/'))]
  .filter((rel) => !fs.existsSync(path.join(ROOT, rel)))
L('\n【检查 E · 候选件齐备性】' + (missing.length ? '缺 ' + missing.length + ' 件' : '全部存在 ✅'))
for (const m of missing) L('    ❌ 缺 ' + m)
report.checks.missingCandidates = missing

// ══ 检查 F：测试基线（tracked / peer / working-tree 三分）════════════════
L('\n【检查 F · 测试基线】`node --test` 零参数会自动发现**未跟踪**的测试文件 —— 必须三分')
let testBaseline = { available: false }
if (!SKIP_TESTS) {
  const tracked = execSync('git ls-files "scripts/*.test.mjs"', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
  const disk = fs.existsSync(path.join(ROOT, 'scripts'))
    ? fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => f.endsWith('.test.mjs')).map((f) => 'scripts/' + f)
    : []
  const untracked = disk.filter((f) => !tracked.includes(f))
  const runSuite = (files) => {
    if (!files.length) return { tests: 0, pass: 0, fail: 0 }
    let out = ''
    try {
      out = execSync([process.execPath, '--experimental-transform-types', '--test', ...files].map((s) => (s.includes(' ') ? '"' + s + '"' : s)).join(' '),
        { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
    } catch (e) { out = (e.stdout ?? '') + (e.stderr ?? '') }
    const g = (k) => Number((out.match(new RegExp('^ℹ ' + k + ' (\\d+)$', 'm')) ?? [])[1] ?? 0)
    return { tests: g('tests'), pass: g('pass'), fail: g('fail') }
  }
  const t = runSuite(tracked)
  const p = runSuite(untracked)
  const decl = manifest?.testBaseline
  testBaseline = {
    available: true,
    tracked: { files: tracked.length, ...t },
    peerAdded: { files: untracked, ...p },
    workingTreeTotal: t.tests + p.tests,
    declared: decl ?? null,
    acceptanceUses: decl?.acceptanceUses ?? 'tracked',
    ok: t.fail === 0 && t.tests > 0,
  }
  L('  已跟踪测试文件 ' + tracked.length + ' 个 → ' + t.pass + '/' + t.tests + (t.fail ? '  ❌ fail ' + t.fail : '  ✅'))
  L('  未跟踪（他人批次）' + untracked.length + ' 个 → ' + p.pass + '/' + p.tests + (untracked.length ? '  → ' + untracked.join(', ') : ''))
  L('  工作树合计：' + testBaseline.workingTreeTotal + '  （⚠️ 干净克隆上只有已跟踪的 ' + t.tests + ' 项）')
  L('  ' + ok(testBaseline.ok) + ' 本批验收基准 = tracked ' + t.pass + '/' + t.tests)
  if (decl && decl.tracked !== t.tests) L('    ⚠️ 与 manifest 声明的 tracked=' + decl.tracked + ' 不符，请更新 testBaseline')
  if (decl && decl.peerAdded !== p.tests) L('    ⚠️ 与 manifest 声明的 peerAdded=' + decl.peerAdded + ' 不符，请更新 testBaseline')
} else {
  L('  ⏭ 已跳过（--skip-tests）')
}
report.checks.testBaseline = testBaseline

// ══ 结论 ════════════════════════════════════════════════════════════════
const ancestorClean = IN_SCOPE_DATA.every((rel) => ancestral[rel]?.rawEqual)
const timelineClean = temporal.available && (temporal.unexpectedDrift ?? []).length === 0
const testsOk = !testBaseline.available || testBaseline.ok
const ready = ancestorClean && timelineClean && deltaOk && missing.length === 0 && testsOk && manifestBroken.length === 0 && PATHSPEC_LEAK.length === 0 && EXCLUSION_CONFLICT.length === 0
report.verdict = ready ? 'READY' : 'NOT_READY'
report.pathspecInvariant = { rule: 'commitPathspec ≡ writeSet', leak: PATHSPEC_LEAK, ok: PATHSPEC_LEAK.length === 0 }
report.exclusionConflict = { rule: 'writeSet ∩ excludedSet = ∅', conflict: EXCLUSION_CONFLICT, ok: EXCLUSION_CONFLICT.length === 0 }
report.gateSummary = {
  manifestGate: manifestBroken.length === 0 && !!manifest ? 'PASS' : 'BLOCK',
  pathspecGate: PATHSPEC_LEAK.length === 0 ? 'PASS' : 'BLOCK',
  exclusionGate: EXCLUSION_CONFLICT.length === 0 ? 'PASS' : 'BLOCK',
  ancestorGate: ancestorClean ? 'PASS' : 'BLOCK',
  timelineGate: timelineClean ? 'PASS' : 'BLOCK',
  deltaGate: deltaOk ? 'PASS' : 'BLOCK',
  candidatesGate: missing.length === 0 ? 'PASS' : 'BLOCK',
  testsGate: testsOk ? 'PASS' : 'BLOCK',
}
report.blockers = [
  ...(manifestBroken.length ? ['manifest 损坏（声明全部失效）：' + manifestBroken.join(', ')] : []),
  ...(PATHSPEC_LEAK.length ? ['pathspec 越界（writeSet 与 governanceSet/declaredExternalSet 相交）：' + PATHSPEC_LEAK.join(', ')] : []),
  ...(EXCLUSION_CONFLICT.length ? ['exclusionGate：writeSet 与 excludedSet 相交（既提交又排除）：' + EXCLUSION_CONFLICT.join(', ')] : []),
  ...IN_SCOPE_DATA.filter((rel) => ancestral[rel] && !ancestral[rel].rawEqual)
    .map((rel) => 'Ancestor Gate：' + rel + ' 的 HEAD ≠ 落盘前基线（提交会夹带外部改动；内容差异 ' + ancestral[rel].contentDiffKeys + ' 键）'),
  ...(timelineClean ? [] : ['Timeline Gate：unexpectedDrift 非空 → ' + (temporal.unexpectedDrift ?? ['(快照缺失)']).join(', ')]),
  ...(deltaOk ? [] : ['Delta Gate：备份→当前的差异不等于 manifest 的 expectedDelta']),
  ...missing.map((m) => '候选件缺失：' + m),
  ...(testsOk ? [] : ['Tests Gate：已跟踪测试未全绿']),
]

L('\n════ 结论 ════')
L('  闸门：' + Object.entries(report.gateSummary).map(([k, v]) => k + '=' + v).join(' · '))
if (ready) {
  L('✅ READY —— 写集内文件均可安全提交（提交 diff == 本批操作）')
} else {
  L('⛔ NOT_READY —— 阻塞原因：')
  for (const b of report.blockers) L('   · ' + b)
  if (!ancestorClean) L('\n   → 路径 A：等外部会话把相关文件提交/收敛后，**重跑本脚本**。')
}
L('\n【本次提交 pathspec（= manifest.writeSet，勿手写）】')
L('git add \\\n  ' + WRITE_SET.join(' \\\n  '))
L('\n【提交结构（全部 manifest）】')
for (const m of [manifest, ...others].filter(Boolean)) {
  L('  · ' + m.batchId.padEnd(18) + (m.status ?? '').padEnd(24) + '写集 ' + (m.writeSet ?? []).length + ' 项  baseRef=' + (m.baseRef ?? '?'))
}

fs.mkdirSync(OUT_DIR, { recursive: true })
// ⚠️ 报告必须**按批次分文件**：旧实现固定写 `phase1-commit-readiness.json`，
//    导致任何 `--batch X` 运行都会覆盖它 → 该文件无法归属任何批次（无人认领）。
const outFile = path.join(OUT_DIR, 'readiness-' + (report.batchId ?? 'legacy') + '.json')
fs.writeFileSync(outFile, JSON.stringify(report, null, 2) + '\n', 'utf8')
L('\n报告已落盘：' + path.relative(ROOT, outFile).replace(/\\/g, '/'))
process.exit(ready ? 0 : 1)
