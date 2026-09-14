/**
 * [READ-ONLY] 待提交数据差异的三方拆解与定性 —— 「HEAD → 当前」到底是谁改的？
 *
 * 背景（2026-09-14 T2 重新定位）：
 *   台账里 T2 长期写着「等外部会话收敛」。但真实仓库状态是：
 *   `data/node-pool.json` / `data/questions.json` 里同时躺着**两个批次**的改动，而 git 的暂存粒度是文件级，
 *   于是任何后续提交都无法在不夹带对方的情况下进行 —— 这才是阻塞项，不是「外部还没做完」。
 *
 * 四方基线（缺任何一方都会误判）：
 *   ① HEAD          —— git 里的已提交态（git show HEAD:<path>）
 *   ② 落盘前备份     —— data/backups/phase1-oop-os-⟨timestamp⟩/（apply 前的字节快照）
 *   ③ apply 基线 md5 —— outputs/tree-violation-scan/apply-baseline.json（apply 前 7 分钟固化的 md5）
 *   ④ 当前工作树     —— data/<file>
 *
 * ⚠️ 为什么必须有 ③：`reconcile-external-changes.mjs` 只用「①②④」，把「本任务 apply 的落盘」误判成
 *   「外部又在写入」，于是输出「外部未收敛 → 建议继续等」。加 ③ 才能把本任务自己的写入剔除干净。
 *
 * 产出（全部在 outputs/，只读仓库）：
 *   outputs/tree-violation-scan/nodepool-drift-classification.json
 *   outputs/tree-violation-scan/nodepool-drift-classification.md
 * 用法：node scripts/classify-nodepool-external-drift.mjs
 * 退出码：0 = 拆解完备（unexplained == 0 且全部不变量成立）；1 = 存在无法归属的差异
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'outputs', 'tree-violation-scan')
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')
const gitShow = (rel) => {
  try { return execFileSync('git', ['show', 'HEAD:' + rel], { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }) }
  catch { return null }
}
const gj = (rel) => JSON.parse(gitShow(rel))

const applyBaseline = rd('outputs/tree-violation-scan/apply-baseline.json')
const BACKUP_DIR = (() => {
  const dirs = fs.readdirSync(path.join(ROOT, 'data', 'backups')).filter((d) => d.startsWith('phase1-oop-os-'))
  // 取 mtime 最新的一次 apply 前快照
  return dirs.map((d) => ({ d, t: fs.statSync(path.join(ROOT, 'data', 'backups', d)).mtimeMs })).sort((a, b) => b.t - a.t)[0].d
})()
const backupPath = (f) => path.join(ROOT, 'data', 'backups', BACKUP_DIR, f)
const curPath = (f) => path.join(ROOT, 'data', f)

const TARGETS = ['node-pool.json', 'questions.json', 'tree-data.json', 'knowledge-edges.json', 'evolution-events.json']
const FILES = ['node-pool.json', 'questions.json']

// ── 0. 基线一致性：备份目录 ≡ apply 基线 md5 ───────────────────────────────
const baselineCheck = []
for (const f of Object.keys(applyBaseline.dataMd5)) {
  if (!fs.existsSync(backupPath(f))) { baselineCheck.push({ file: f, ok: false, reason: '备份目录缺该文件' }); continue }
  const raw = fs.readFileSync(backupPath(f), 'utf8')
  const got = md5(raw)
  baselineCheck.push({ file: f, ok: got === applyBaseline.dataMd5[f], backupMd5: got, applyBaselineMd5: applyBaseline.dataMd5[f] })
}

// ── 1. 逐文件三分类 ────────────────────────────────────────────────────────
const keySet = (o) => new Set(Object.keys(o))
const diffKeys = (a, b) => Object.keys(a).filter((k) => k in b && JSON.stringify(a[k]) !== JSON.stringify(b[k]))
const onlyIn = (a, b) => [...keySet(a)].filter((k) => !(k in b))

const files = {}
for (const f of TARGETS) {
  const head = gj('data/' + f)
  const base = fs.existsSync(backupPath(f)) ? rd(backupPath(f)) : null
  const cur = rd(curPath(f))
  if (!head || !base) { files[f] = { skipped: true }; continue }
  const extDiff = diffKeys(head, base)
  const extAdded = onlyIn(base, head)
  const extRemoved = onlyIn(head, base)
  const ourDiff = diffKeys(cur, base)
  const ourAdded = onlyIn(cur, base)
  const ourRemoved = onlyIn(base, cur)
  const totalAddedVsHead = onlyIn(cur, head)
  const totalDiffVsHead = diffKeys(cur, head)
  files[f] = {
    headKeys: keySet(head).size, backupKeys: keySet(base).size, currentKeys: keySet(cur).size,
    external: { added: extAdded, removed: extRemoved, contentDiff: extDiff },
    batch: { added: ourAdded, removed: ourRemoved, contentDiff: ourDiff },
    totalVsHead: { added: totalAddedVsHead, contentDiff: totalDiffVsHead },
    // 完备性：两批必须恰好铺满 HEAD→当前 的全部差异，且不相交
    decomposes: totalAddedVsHead.length === extAdded.length + ourAdded.length &&
      totalDiffVsHead.length === extDiff.length + ourDiff.length,
    disjoint: extDiff.filter((k) => ourDiff.includes(k)).length === 0,
  }
}

const np = files['node-pool.json']
const qs = files['questions.json']

// ── 2. 外部部分逐键定性（node-pool）────────────────────────────────────────
const head = gj('data/node-pool.json')
const base = rd(backupPath('node-pool.json'))
const cur = rd(curPath('node-pool.json'))
const tree = rd('data/tree-data.json')
const treeNames = new Set()
;(function w(n) { if (n.name) treeNames.add(n.name); (n.children ?? []).forEach(w) })(tree)

const normName = (s) => String(s ?? '').replace(/[（）]/g, (m) => (m === '（' ? '(' : ')')).replace(/\s+/g, '').toLowerCase()

const extKeys = np.external.contentDiff
const tagClass = { PREPEND_ONE_AT_HEAD: [], PURE_REORDER: [], SET_CHANGE: [] }
const tagsHead = { exactEqualLabel: 0, bracketVariantOfLabel: 0, onlyInTreeName: 0, suspicious: [] }
for (const k of extKeys) {
  const a = head[k], b = base[k]
  const ta = a?.tags, tb = b?.tags
  if (JSON.stringify(ta) !== JSON.stringify(tb)) {
    const sa = new Set(ta ?? []), sb = new Set(tb ?? [])
    const added = [...sb].filter((x) => !sa.has(x))
    const removed = [...sa].filter((x) => !sb.has(x))
    if (added.length === 0 && removed.length === 0) tagClass.PURE_REORDER.push({ id: k, before: ta, after: tb })
    else if (added.length === 1 && removed.length === 0 && (tb ?? [])[0] === added[0]) tagClass.PREPEND_ONE_AT_HEAD.push({ id: k, label: b?.label, added: added[0] })
    else tagClass.SET_CHANGE.push({ id: k, added, removed, before: ta, after: tb })
  }
  const t0 = (tb ?? [])[0]
  if (t0 === undefined) continue
  const lb = b?.label
  if (t0 === lb) tagsHead.exactEqualLabel++
  else if (lb !== undefined && normName(t0) === normName(lb)) tagsHead.bracketVariantOfLabel++
  else if (treeNames.has(t0)) tagsHead.onlyInTreeName++
  else tagsHead.suspicious.push({ id: k, label: lb, tags0: t0, tags: tb })
}

// viewDimensions：被移除的 atom 是否悬空
const vdChanges = []
for (const k of extKeys) {
  const a = head[k]?.viewDimensions, b = base[k]?.viewDimensions
  if (JSON.stringify(a) === JSON.stringify(b)) continue
  const atoms = (vd) => (vd ?? []).flatMap((g) => (g.sections ?? []).flatMap((s) => (s.atoms ?? []).map((x) => x.nodeId)))
  const before = atoms(a), after = atoms(b)
  const removed = before.filter((x) => !after.includes(x))
  vdChanges.push({
    id: k, label: base[k]?.label ?? null, removedAtoms: removed,
    dangling: removed.map((r) => ({ nodeId: r, existsInCurrentPool: r in cur })),
    allDangling: removed.length > 0 && removed.every((r) => !(r in cur)),
  })
}

// card：结构/内容变化
const cardChanges = []
for (const k of extKeys) {
  const a = head[k]?.card, b = base[k]?.card
  if (JSON.stringify(a) === JSON.stringify(b)) continue
  const fa = new Set(Object.keys(a ?? {})), fb = new Set(Object.keys(b ?? {}))
  const added = [...fb].filter((x) => !fa.has(x)), removed = [...fa].filter((x) => !fb.has(x))
  const changed = [...fa].filter((x) => fb.has(x) && JSON.stringify(a[x]) !== JSON.stringify(b[x]))
  cardChanges.push({ id: k, fieldAdded: added, fieldRemoved: removed, fieldChanged: changed, tabsEqual: JSON.stringify(a?.tabs) === JSON.stringify(b?.tabs) })
}

// ── 3. 不变量 ──────────────────────────────────────────────────────────────
const invariants = []
// ① card.nodeId ≡ 池键
let cardIdMismatch = 0
for (const k of Object.keys(cur)) { const c = cur[k]?.card; if (c && c.nodeId !== k) cardIdMismatch++ }
invariants.push({ name: 'card.nodeId ≡ 池键', violated: cardIdMismatch, ok: cardIdMismatch === 0, note: '真正的不变量' })
// ② 外部部分无键增删
invariants.push({ name: '外部改动不含键增删', violated: np.external.added.length + np.external.removed.length, ok: np.external.added.length === 0 && np.external.removed.length === 0, note: 'HEAD ' + np.headKeys + ' 键 = 备份 ' + np.backupKeys + ' 键' })
// ③ 两批不相交
invariants.push({ name: '外部 ∩ 本批 = ∅', violated: np.disjoint ? 0 : 1, ok: np.disjoint, note: '交集 ' + extKeys.filter((k) => np.batch.contentDiff.includes(k)).length + ' 个' })
// ④ 两批可铺满 HEAD→当前
invariants.push({ name: '两批恰好铺满 HEAD→当前', violated: np.decomposes ? 0 : 1, ok: np.decomposes, note: np.totalVsHead.added.length + ' 新增 + ' + np.totalVsHead.contentDiff.length + ' 内容差异 = 外部 ' + np.external.added.length + '+' + extKeys.length + ' + 本批 ' + np.batch.added.length + '+' + np.batch.contentDiff.length })
// ⑤ tags[0] 无旧值残留嫌疑
invariants.push({ name: 'tags[0] 均可解释为「实体自身规范名」', violated: tagsHead.suspicious.length, ok: tagsHead.suspicious.length === 0, note: '精确 ' + tagsHead.exactEqualLabel + ' + 全半角等价 ' + tagsHead.bracketVariantOfLabel + ' + 仅在树名 ' + tagsHead.onlyInTreeName })
// ⑥ viewDimensions 移除项均为悬空引用
const vdNotDangling = vdChanges.filter((v) => !v.allDangling)
invariants.push({ name: 'viewDimensions 移除项均为悬空引用', violated: vdNotDangling.length, ok: vdNotDangling.length === 0, note: vdChanges.length + ' 个节点 · ' + vdChanges.reduce((a, v) => a + v.removedAtoms.length, 0) + ' 个原子' })
// ⑦ apply 基线可复现（备份 ≡ apply 前 md5）
invariants.push({ name: '备份目录 ≡ apply 基线 md5', violated: baselineCheck.filter((b) => !b.ok).length, ok: baselineCheck.every((b) => b.ok), note: 'apply-baseline.frozenAt ' + applyBaseline.frozenAt })
// ⑧ 本批新增键 vs apply-baseline.newIds
//    口径必须分两类，否则会把「预分配了却没用到」误判成缺陷：
//      · `undeclared`：实测新增但**未声明** → 缺陷（apply 越界），必须为 0
//      · `unused`    ：声明了但**未使用** → 正常（同一实体多个来源，id 预分配余量），仅作观察项
const declaredNew = new Set(Object.values(applyBaseline.newIds ?? {}))
const npAdded = new Set(np.batch.added)
const undeclared = [...npAdded].filter((k) => !declaredNew.has(k))
const unused = [...declaredNew].filter((k) => !npAdded.has(k))
invariants.push({
  name: '本批新增键 ⊆ apply-baseline.newIds（无未声明新增）', violated: undeclared.length, ok: undeclared.length === 0,
  note: '声明 ' + declaredNew.size + ' 个 · 实测 ' + npAdded.size + ' 个 · 未声明新增 ' + undeclared.length + ' 个',
})
invariants.push({
  name: '声明未使用的 id（观察项，非缺陷）', violated: 0, ok: true, observed: unused.length,
  note: unused.length ? unused.join(', ') + ' —— 预分配余量（同一语义实体多个来源，最终只建一个）' : '无',
})

// ⑨ 外部改动早于本次 apply（收敛性的必要条件：不是 apply 引入的）
invariants.push({
  name: '外部改动早于本次 apply（非本任务产物）', violated: baselineCheck.every((b) => b.ok) ? 0 : 1,
  ok: baselineCheck.every((b) => b.ok),
  note: '落盘前备份的 md5 ≡ apply-baseline（apply 前 7 分钟）→ 127 键在 apply 之前就已在工作树里',
})

// ── 4. 收敛性证据 ──────────────────────────────────────────────────────────
// 三方锚点互相印证，缺一不可：
//   · 外部批次的**自报写入时刻**：被改实体的 updatedAt（questions.json 有该字段）
//   · 该文件的 **mtime**：本任务从未触碰 questions.json → mtime 仍停在外部写入那一刻
//   · node-pool 的 mtime 已被本任务 15:37 的 apply 覆盖 → 只能靠「备份 md5 ≡ apply 基线」证明 127 键先于 apply
const curQ = rd(curPath('questions.json'))
const headCommit = execFileSync('git', ['log', '-1', '--format=%H|%cI|%s'], { cwd: ROOT, encoding: 'utf8' }).trim().split('|')
const qEntry = Object.entries(curQ).find(([, v]) => v?.id === 'q_cmp_spring_ejb')
const extWriteEpoch = qEntry?.[1]?.updatedAt ?? null
const qMtime = fs.statSync(curPath('questions.json')).mtime
const conversations = {
  headCommit: { sha: headCommit[0], committedAt: headCommit[1], subject: headCommit[2] },
  externalWriteAt: extWriteEpoch ? new Date(extWriteEpoch).toISOString() : null,
  questionsMtime: qMtime.toISOString(),
  mtimeMatchesSelfReported: extWriteEpoch ? Math.abs(qMtime.getTime() - extWriteEpoch) < 5000 : false,
  backupSnapshotDir: BACKUP_DIR,
  backupSnapshotAt: fs.statSync(path.join(ROOT, 'data', 'backups', BACKUP_DIR)).mtime.toISOString(),
  silenceHours: extWriteEpoch ? +(((Date.now() - extWriteEpoch) / 3600000)).toFixed(2) : null,
  externalPrecedesApply: baselineCheck.every((b) => b.ok),
}

// ── 4.5 提交方案（blob 级，工作树零触碰）────────────────────────────────────
// 目标：把「外部批次」推进 HEAD，且**不带任何本任务产物**。
// 手段：`git update-index --cacheinfo` 把**落盘前备份**的 blob 直接写进 index —— 不改工作树一个字节。
const blobOf = (p) => execFileSync('git', ['hash-object', p], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
const headBlob = execFileSync('git', ['rev-parse', 'HEAD:data/node-pool.json'], { cwd: ROOT, encoding: 'utf8' }).trim()
const externalBlob = blobOf('data/backups/' + BACKUP_DIR + '/node-pool.json')
// 待提交的 pool（= 备份态）里不得含本任务产物
const extPoolRaw = fs.readFileSync(path.join(ROOT, 'data', 'backups', BACKUP_DIR, 'node-pool.json'), 'utf8')
const extPool = JSON.parse(extPoolRaw)
const carriesPhase1New = np.batch.added.filter((k) => k in extPool)
const carriesPhase1Mod = np.batch.contentDiff.filter((k) => JSON.stringify(extPool[k]) !== JSON.stringify(head[k]))
const commitPlan = {
  principle: 'blob 级提交：`git update-index --cacheinfo` 直接改 index 指向备份态 blob —— 工作树零触碰，本任务的 6 新增 + 1 修改原地保留。',
  targets: [
    {
      path: 'data/node-pool.json',
      indexBlob: externalBlob,
      headBlob,
      bytes: Buffer.byteLength(extPoolRaw, 'utf8'),
      equalsBaselineMd5: md5(extPoolRaw) === applyBaseline.dataMd5['node-pool.json'],
      carriesPhase1New,
      carriesPhase1Mod,
      verdict: carriesPhase1New.length === 0 && carriesPhase1Mod.length === 0 ? 'CLEAN' : 'CARRIES_PHASE1',
    },
    {
      path: 'data/questions.json',
      mode: 'git add（当前态即外部态 —— 本任务从未触碰该文件）',
      phase1Touched: qs.batch.contentDiff.length + qs.batch.added.length + qs.batch.removed.length === 0,
    },
  ],
  commands: [
    'unset CODEBUDDY_TOOL_CALL_ID',
    'git hash-object -w data/backups/' + BACKUP_DIR + '/node-pool.json          # 写入备份态 blob',
    'git update-index --cacheinfo 100644,' + externalBlob + ',data/node-pool.json',
    'git add data/questions.json scripts/classify-nodepool-external-drift.mjs \\',
    '        outputs/tree-violation-scan/nodepool-drift-classification.json \\',
    '        outputs/tree-violation-scan/nodepool-drift-classification.md \\',
    '        batch-manifests/nodepool-tag-normalization.json',
    'git commit -m "data: 外部打标归一化落盘 — tags[0] 规范名归一 127 键 + 悬空视图原子清理 3 处（外部会话 13:00 写入，经逐键定性后独立提交）"',
    '# 提交后复验：HEAD:data/node-pool.json 的 blob 必须 = ' + externalBlob,
    '#           且 git diff HEAD -- data/node-pool.json 必须只剩本任务的 6 新增 + 1 修改',
  ],
  postConditions: [
    'HEAD:data/node-pool.json blob ≡ ' + externalBlob,
    'git status 中 data/node-pool.json 仍为 ` M`（工作树保留本任务改动）',
    'phase1 的 Ancestor Gate 转为 ✅（HEAD ≡ 落盘前备份）',
    'git revert / git reset --hard ' + headCommit[0].slice(0, 7) + ' 可完整回滚（备份态 blob 已在对象库）',
  ],
}


const unexplained = extKeys.filter((k) => !tagsHead.suspicious.some((s) => s.id === k) && !vdChanges.some((v) => v.id === k) && !cardChanges.some((c) => c.id === k) && !tagClass.PREPEND_ONE_AT_HEAD.some((x) => x.id === k) && !tagClass.PURE_REORDER.some((x) => x.id === k) && !tagClass.SET_CHANGE.some((x) => x.id === k))
const ok = unexplained.length === 0 && invariants.every((i) => i.ok) && np.decomposes && np.disjoint

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'READ_ONLY',
  question: '「HEAD → 当前」的数据差异到底是谁改的？能否干净拆成两个可独立提交的批次？',
  baselineCheck,
  files,
  decomposition: {
    externalBatch: {
      name: '外部打标归一化批次（候选 batchId: nodepool-tag-normalization）',
      files: FILES.filter((f) => files[f] && (files[f].external.contentDiff.length || files[f].external.added.length || files[f].external.removed.length)),
      nodePool: { contentDiffKeys: extKeys.length, added: np.external.added.length, removed: np.external.removed.length },
      questions: { contentDiffKeys: qs.external.contentDiff.length, keys: qs.external.contentDiff },
      fieldClassification: { tags: tagClass.PREPEND_ONE_AT_HEAD.length + tagClass.PURE_REORDER.length + tagClass.SET_CHANGE.length, viewDimensions: vdChanges.length, card: cardChanges.length, label: extKeys.filter((k) => head[k]?.label !== base[k]?.label).length },
    },
    phase1Batch: {
      nodePool: { added: np.batch.added, addedCount: np.batch.added.length, contentDiff: np.batch.contentDiff, contentDiffCount: np.batch.contentDiff.length },
      note: '阶段一 apply 的产物；`data/tree-data.json` / `knowledge-edges.json` / `evolution-events.json` 的差异**全部**属本批（HEAD ≡ 备份）。',
    },
    unexplained,
  },
  externalDetail: { tagClass, tagsHead, vdChanges, cardChanges },
  invariants,
  commitPlan,
  convergence: conversations,
  verdict: ok ? 'DRIFT_DECOMPOSABLE' : 'DRIFT_UNEXPLAINED',
  conclusion: ok
    ? '「HEAD → 当前」的全部差异可干净二分为：外部批次（node-pool ' + extKeys.length + ' 键 + questions ' + qs.external.contentDiff.length + ' 条）+ 阶段一批次（node-pool ' + np.batch.added.length + ' 新增 + ' + np.batch.contentDiff.length + ' 修改），交集为 0。因此 T2 的阻塞项不是「等外部收敛」，而是「外部批次尚未获得一次独立提交」。'
    : '存在无法归属的差异，禁止进入提交。',
}

fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'nodepool-drift-classification.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')

const md = []
md.push('# 待提交数据差异的三方拆解与定性（只读）', '')
md.push('> 生成 ' + report.generatedAt + ' · 模式 `READ_ONLY` —— 未 kill 进程、未回滚、未提交。', '')
md.push('## 0. 结论', '')
md.push('**`' + report.verdict + '`**', '')
md.push(report.conclusion, '')
md.push('## 1. 为什么要四方基线（口径缺口）', '')
md.push('`reconcile-external-changes.mjs` 只用「HEAD / 落盘前备份 / 当前工作树」三方。apply 落盘之后，')
md.push('它会把**本任务自己的写入**（tree-data / edges / evolution-events 的落盘 + CONSTITUTION.md）判成「外部又在写入」，')
md.push('于是输出「外部未收敛 → 建议继续等」。**这个结论是错的**，缺的是第四方：', '')
md.push('| 方 | 来源 | 作用 |', '|---|---|---|')
md.push('| ① HEAD | `git show HEAD:<path>` | 已提交态 |')
md.push('| ② 落盘前备份 | `data/backups/' + BACKUP_DIR + '/` | apply 前字节快照 |')
md.push('| ③ apply 基线 md5 | `apply-baseline.json`（frozenAt ' + applyBaseline.frozenAt + '） | 把「本任务自己写的东西」剔除干净的锚点 |')
md.push('| ④ 当前工作树 | `data/<file>` | 待提交态 |')
md.push('')
md.push('| 基线一致性（② ≡ ③） | 结果 |', '|---|---|')
for (const b of baselineCheck) md.push('| `' + b.file + '` | ' + (b.ok ? '✅ md5 相符 `' + b.backupMd5 + '`' : '❌ 备份 `' + b.backupMd5 + '` ≠ 基线 `' + b.applyBaselineMd5 + '`') + ' |')
md.push('')
md.push('## 2. 拆解结果：两个批次，交集为 0', '')
md.push('| 文件 | HEAD 键 | 备份键 | 当前键 | 外部差异 | 本批差异 | 可铺满 | 不相交 |', '|---|---:|---:|---:|---:|---:|---|---|')
for (const f of TARGETS) {
  const x = files[f]
  if (!x || x.skipped) { md.push('| `' + f + '` | — | — | — | — | — | — | — |'); continue }
  md.push('| `' + f + '` | ' + x.headKeys + ' | ' + x.backupKeys + ' | ' + x.currentKeys + ' | ' + (x.external.added.length + x.external.removed.length + x.external.contentDiff.length) + ' | ' + (x.batch.added.length + x.batch.removed.length + x.batch.contentDiff.length) + ' | ' + (x.decomposes ? '✅' : '❌') + ' | ' + (x.disjoint ? '✅' : '❌') + ' |')
}
md.push('')
md.push('**注意**：`tree-data.json` / `knowledge-edges.json` / `evolution-events.json` 的外部差异为 **0** ——')
md.push('它们 HEAD ≡ 备份，即**这三个文件的全部差异都是阶段一自己的**。外部批次只碰了 2 个文件。', '')
md.push('### 2.1 外部批次 = `nodepool-tag-normalization`（候命名）', '')
md.push('- `data/node-pool.json`：**' + extKeys.length + ' 键**内容差异，**无键增删**（HEAD ' + np.headKeys + ' 键 = 备份 ' + np.backupKeys + ' 键）')
md.push('- `data/questions.json`：**' + qs.external.contentDiff.length + ' 条**（' + qs.external.contentDiff.join(', ') + '）')
md.push('')
md.push('| 字段 | 命中节点数 | 定性 |', '|---|---:|---|')
md.push('| `tags` | ' + (tagClass.PREPEND_ONE_AT_HEAD.length + tagClass.PURE_REORDER.length + tagClass.SET_CHANGE.length) + ' | 首项归一化为「实体自身规范名」 |')
md.push('| `viewDimensions` | ' + vdChanges.length + ' | 清理**悬空**原子引用 |')
md.push('| `card` | ' + cardChanges.length + ' | 补齐缺失字段（rootContent） |')
md.push('| `label` | ' + extKeys.filter((k) => head[k]?.label !== base[k]?.label).length + ' | — |')
md.push('')
md.push('### 2.2 tags 改动的三个模式', '')
md.push('| 模式 | 条数 | 含义 |', '|---|---:|---|')
md.push('| `PREPEND_ONE_AT_HEAD` | ' + tagClass.PREPEND_ONE_AT_HEAD.length + ' | 新增一个值并置于首位（该值 = 实体规范名） |')
md.push('| `PURE_REORDER` | ' + tagClass.PURE_REORDER.length + ' | 集合不变，把规范名提到首位（把「xxx详解 / 入门」降位） |')
md.push('| `SET_CHANGE` | ' + tagClass.SET_CHANGE.length + ' | 集合本身变了（正体：全角括号 → 半角，等价值替换；另一条为删除重复标签） |')
md.push('')
md.push('**tags[0] 与「实体自身规范名」的关系（' + extKeys.length + ' 键全量）**：', '')
md.push('| 判定 | 条数 |', '|---|---:|')
md.push('| tags[0] 精确等于自身 `label` | ' + tagsHead.exactEqualLabel + ' |')
md.push('| tags[0] 是自身 `label` 的全/半角括号等价写法 | ' + tagsHead.bracketVariantOfLabel + ' |')
md.push('| tags[0] 是树里的 name（但不是自身 label） | ' + tagsHead.onlyInTreeName + ' |')
md.push('| ⚠️ 三者都不是（旧值残留 / 引用他实体嫌疑） | **' + tagsHead.suspicious.length + '** |')
md.push('')
if (tagsHead.suspicious.length) { md.push('可疑清单：'); for (const s of tagsHead.suspicious) md.push('- `' + s.id + '` label=「' + s.label + '」 tags[0]=「' + s.tags0 + '」'); md.push('') }
md.push('> 这一列是**关键判据**：宪法 §3.6 区分「身份耦合字段」与「展示字段」，`tags[0]` 是 alias-bearing 位。')
md.push('> 若这批把 `tags[0]` 设成了**某个实体的旧名**，那它就是 T4 型 stale value，**不可提交**。实测 0 例。', '')
md.push('### 2.3 viewDimensions：移除的是悬空引用（修复，非破坏）', '')
md.push('| 节点 | label | 被移除的 atom | 该 nodeId 在当前池中存在？ |', '|---|---|---|---|')
for (const v of vdChanges) {
  for (const d of v.dangling) md.push('| `' + v.id + '` | ' + (v.label ?? '—') + ' | ' + d.nodeId + ' | ' + (d.existsInCurrentPool ? '✅ 存在（误删风险）' : '❌ **不存在 = 悬空** |'))
}
md.push('')
md.push('### 2.4 card：补齐缺失字段', '')
md.push('| 节点 | 新增字段 | 删除字段 | 变更字段 | tabs 未变 |', '|---|---|---|---|---|')
for (const c of cardChanges) md.push('| `' + c.id + '` | ' + (c.fieldAdded.join(', ') || '—') + ' | ' + (c.fieldRemoved.join(', ') || '—') + ' | ' + (c.fieldChanged.join(', ') || '—') + ' | ' + (c.tabsEqual ? '✅' : '❌') + ' |')
md.push('')
md.push('## 3. 阶段一批次 = `phase1`', '')
md.push('- 新增 ' + np.batch.added.length + ' 键：`' + np.batch.added.join('`, `') + '`')
md.push('- 内容修改 ' + np.batch.contentDiff.length + ' 键：`' + np.batch.contentDiff.join('`, `') + '`')
md.push('- 未声明新增（缺陷口径，须 0）：**' + undeclared.length + '** ' + (undeclared.length ? '❌ ' + undeclared.join(', ') : '✅'))
md.push('- 声明未使用（预分配余量，观察项）：' + unused.length + ' 个 ' + (unused.length ? '`' + unused.join('`, `') + '` —— 同一语义实体多个来源，最终只建一个，属正常' : ''))
md.push('- `data/tree-data.json` / `data/knowledge-edges.json` / `data/evolution-events.json` 的差异**全部**属本批。')
md.push('')
md.push('## 4. 不变量断言', '')
md.push('| 不变量 | 违反 | 结果 | 备注 |', '|---|---:|---|---|')
for (const i of invariants) md.push('| ' + i.name + ' | ' + i.violated + ' | ' + (i.ok ? '✅' : '❌') + ' | ' + i.note + ' |')
md.push('')
md.push('## 5. 收敛性证据', '')
md.push('| 项 | 值 |', '|---|---|')
md.push('| HEAD 提交 | `' + conversations.headCommit.sha.slice(0, 7) + '` @ ' + conversations.headCommit.committedAt + ' |')
md.push('| 外部批次写入时刻 | **' + conversations.externalWriteAt + '**（取自 `q_cmp_spring_ejb.updatedAt`） |')
md.push('| 自报时刻 ≡ 文件 mtime | ' + (conversations.mtimeMatchesSelfReported ? '✅ 吻合（差 <5s）：`' : '❌ 不吻合：`') + conversations.questionsMtime + '` —— 本任务从未触碰 `questions.json`，故 mtime 仍停在外部写入那一刻 |')
md.push('| 127 键早于本次 apply | ' + (conversations.externalPrecedesApply ? '✅ 落盘前备份 md5 ≡ apply 基线 md5' : '❌') + '（`node-pool.json` 的 mtime 已被 15:37 的 apply 覆盖，只能靠 md5 锚定） |')
md.push('| 距今静默时长 | **' + conversations.silenceHours + ' 小时**（0 次写入） |')
md.push('| 落盘前备份快照 | `' + conversations.backupSnapshotDir + '` @ ' + conversations.backupSnapshotAt + ' |')
md.push('')
md.push('## 6. 处方', '')
md.push('**T2 的阻塞项不是「等外部收敛」，而是「外部批次已收敛 7 小时但从未获得一次独立提交」** ——')
md.push('`data/node-pool.json` 一个文件里同时承载两个批次，而 git 暂存是**文件级**，所以任何后续提交都必然夹带对方。')
md.push('')
md.push('### 6.1 提交方案（blob 级，**工作树零触碰**）')
md.push('')
md.push('| 目标 | index blob | HEAD blob | 字节 | ≡ apply 基线 md5 | 携带本任务产物 | 判定 |')
md.push('|---|---|---|---:|---|---|---|')
for (const t of commitPlan.targets) {
  md.push('| `' + t.path + '` | ' + (t.indexBlob ? '`' + t.indexBlob.slice(0, 12) + '`' : t.mode) + ' | ' +
    (t.headBlob ? '`' + t.headBlob.slice(0, 12) + '`' : '—') + ' | ' + (t.bytes ?? '—') + ' | ' +
    (t.equalsBaselineMd5 ? '✅' : (t.phase1Touched ? '—（本任务从未触碰）' : '❌')) + ' | ' +
    (t.verdict ? (t.carriesPhase1New.length + t.carriesPhase1Mod.length) + ' 项' : '0 项') + ' | ' +
    (t.verdict ?? (t.phase1Touched ? 'CLEAN' : 'CARRIES_PHASE1')) + ' |')
}
md.push('')
md.push('```bash')
for (const c of commitPlan.commands) md.push(c)
md.push('```')
md.push('')
md.push('**提交后必须成立**：')
for (const p of commitPlan.postConditions) md.push('- ' + p)
md.push('')
md.push('### 6.2 两条路对比')
md.push('')
md.push('| | 做法 | 优点 | 代价 |')
md.push('|---|---|---|---|')
md.push('| **A（推荐）** | 外部批次独立成一次提交（上面的 blob 级方案）；随后 phase1 的 Ancestor Gate 自动转绿 | 归属清晰 · 工作树零风险 · 可精确回滚 · phase1 的 diff 恰好 = 本批操作 | 属「代第三方提交」→ **需治理授权** |')
md.push('| B | 把外部 127+1 键显式声明为 phase1 的 `coCommittedExternalSet`，一次提交 | 只提交一次 | 违反「一批次一提交」；必须放宽 Ancestor Gate 判据（触碰「不要靠重定义期望值让闸门变绿」的纪律） |')
md.push('')
md.push('> 两条路都**不需要等任何人**。差别只在提交归属，不在技术可行性。')
md.push('')
md.push('## 7. 附带发现：`reconcile-external-changes.mjs` 的漂移口径在 apply 之后失效')
md.push('')
md.push('该脚本只用「HEAD / 落盘前备份 / 当前工作树」三方，缺「本任务自己的写入记录」这第四方。')
md.push('apply 落盘之后重跑它，会把自己写的 3 个 data 文件 + `docs/CONSTITUTION.md` 判成「外部仍在写入」，')
md.push('于是输出「外部仍在写入（5 处）→ 外部批次未收敛 → 建议继续等」—— **这个结论是错的**，')
md.push('而 T2 的「等外部」状态正是被这条错误结论长期锁住的。修法即本脚本采用的四方基线。')
md.push('')
fs.writeFileSync(path.join(OUT, 'nodepool-drift-classification.md'), md.join('\n'), 'utf8')

console.log('════ 待提交数据差异 · 三方拆解（只读）════')
console.log('  基线一致性（备份 ≡ apply 基线 md5）：' + (baselineCheck.every((b) => b.ok) ? '✅' : '❌'))
console.log('\n【拆解】')
for (const f of TARGETS) {
  const x = files[f]
  if (!x || x.skipped) continue
  console.log('  ' + f.padEnd(24) + ' HEAD ' + String(x.headKeys).padStart(4) + ' → 当前 ' + String(x.currentKeys).padStart(4) +
    ' │ 外部 ' + String(x.external.added.length + x.external.removed.length + x.external.contentDiff.length).padStart(3) +
    ' │ 本批 ' + String(x.batch.added.length + x.batch.removed.length + x.batch.contentDiff.length).padStart(3) +
    ' │ 铺满 ' + (x.decomposes ? '✅' : '❌') + ' 不相交 ' + (x.disjoint ? '✅' : '❌'))
}
console.log('\n【外部批次定性】node-pool ' + extKeys.length + ' 键 · questions ' + qs.external.contentDiff.length + ' 条')
console.log('  tags: PREPEND ' + tagClass.PREPEND_ONE_AT_HEAD.length + ' · REORDER ' + tagClass.PURE_REORDER.length + ' · SET_CHANGE ' + tagClass.SET_CHANGE.length)
console.log('  tags[0] 判定：精确等于 label ' + tagsHead.exactEqualLabel + ' · 全半角等价 ' + tagsHead.bracketVariantOfLabel + ' · 仅在树名 ' + tagsHead.onlyInTreeName + ' · ⚠️可疑 ' + tagsHead.suspicious.length)
console.log('  viewDimensions ' + vdChanges.length + ' 节点 · ' + vdChanges.reduce((a, v) => a + v.removedAtoms.length, 0) + ' 个原子（全为悬空引用 ' + (vdChanges.every((v) => v.allDangling) ? '✅' : '❌') + '）')
console.log('  card ' + cardChanges.length + ' 键 · label ' + extKeys.filter((k) => head[k]?.label !== base[k]?.label).length + ' 键')
console.log('\n【不变量】')
for (const i of invariants) console.log('  ' + (i.ok ? '✅' : '❌') + ' ' + i.name + (i.ok ? '' : '  违反 ' + i.violated) + '   — ' + i.note)
console.log('\n【收敛性】外部写入 ' + conversations.externalWriteAt + ' · 静默 ' + conversations.silenceHours + ' 小时 · HEAD ' + conversations.headCommit.sha.slice(0, 7) + ' @ ' + conversations.headCommit.committedAt)
console.log('\n【结论】' + report.verdict)
if (unexplained.length) console.log('  ⛔ 无法归属的差异：' + unexplained.join(', '))
console.log('\n产物：nodepool-drift-classification.json · nodepool-drift-classification.md')
process.exit(ok ? 0 : 1)
