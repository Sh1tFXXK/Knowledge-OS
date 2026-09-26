/**
 * 独立验证：core-library-methods 第 4 步（不 import apply 脚本，由备份快照反推差异）。
 * 判据：树恰好少 1 节点 / 边恰好少 1 条 / 池恰好少 1 实体；其余逐字段不变。
 */
import fs from 'node:fs'
import path from 'node:path'
import { DATA } from './shell-fusion/lib.mjs'

const BACKUP = process.argv[2]
if (!BACKUP) { console.error('用法: node verify-core-library-methods.mjs <backupDir>'); process.exit(2) }
const bp = path.isAbsolute(BACKUP) ? BACKUP : path.join(DATA, 'backups', BACKUP)

const load = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
const pass = []
const fail = []
const check = (n, ok, d) => { (ok ? pass : fail).push(n); console.log(`${ok ? '✅' : '❌'} ${n}${d !== undefined ? '  → ' + JSON.stringify(d) : ''}`) }

const SRC_REF = 'k_vault_javajava_1b1w4s'
const SRC_TREE_ID = 'tree_vault_javajava_1b1w4s'
const PARENT_TREE_ID = 'tree_java_common_libraries'
const DROPPED_EDGE = 'treebind:tree_java_common_libraries:tree_vault_javajava_1b1w4s'

// ── 树 ────────────────────────────────────────────────────────────────
const tBefore = load(bp, 'tree-data.json')
const tAfter = load(DATA, 'tree-data.json')

const flatten = (node, out = []) => { out.push(node); for (const c of node.children ?? []) flatten(c, out); return out }
const fBefore = flatten(tBefore)
const fAfter = flatten(tAfter)
check(`树节点数 ${fBefore.length} → ${fAfter.length}（−1）`, fAfter.length === fBefore.length - 1, { before: fBefore.length, after: fAfter.length })

const idsAfter = new Set(fAfter.map((n) => n.id))
const removed = fBefore.filter((n) => !idsAfter.has(n.id)).map((n) => n.id)
check('恰好删除 1 个节点且就是目标', removed.length === 1 && removed[0] === SRC_TREE_ID, removed)

const parentAfter = fAfter.find((n) => n.id === PARENT_TREE_ID)
const parentBefore = fBefore.find((n) => n.id === PARENT_TREE_ID)
check(`父节点 children ${(parentBefore.children ?? []).length} → ${(parentAfter.children ?? []).length}（−1）`,
  (parentAfter.children ?? []).length === (parentBefore.children ?? []).length - 1)
check('父节点 children 里已无目标 id',
  !(parentAfter.children ?? []).some((c) => c.id === SRC_TREE_ID))
check('父节点 children 顺序 = 原顺序抽掉目标（无重排）',
  JSON.stringify((parentAfter.children ?? []).map((c) => c.id)) ===
  JSON.stringify((parentBefore.children ?? []).filter((c) => c.id !== SRC_TREE_ID).map((c) => c.id)))

// 除父节点外，所有保留节点的非 children 字段必须逐字段不变
const beforeById = new Map(fBefore.map((n) => [n.id, n]))
let untouchedDrift = []
for (const n of fAfter) {
  if (n.id === PARENT_TREE_ID) continue
  const b = beforeById.get(n.id)
  const strip = (x) => { const { children, ...rest } = x; return JSON.stringify(rest) }
  if (strip(b) !== strip(n)) untouchedDrift.push(n.id)
}
check('除父节点外，其余节点逐字段不变（0 漂移）', untouchedDrift.length === 0, untouchedDrift.slice(0, 10))

// ── 边 ────────────────────────────────────────────────────────────────
const eBeforeRaw = load(bp, 'knowledge-edges.json')
const eAfterRaw = load(DATA, 'knowledge-edges.json')
const eB = Array.isArray(eBeforeRaw) ? eBeforeRaw : eBeforeRaw.edges
const eA = Array.isArray(eAfterRaw) ? eAfterRaw : eAfterRaw.edges
check(`边数 ${eB.length} → ${eA.length}（−1）`, eA.length === eB.length - 1, { before: eB.length, after: eA.length })

const eIdsA = new Set(eA.map((e) => e.id))
const eRemoved = eB.filter((e) => !eIdsA.has(e.id)).map((e) => e.id)
check('恰好删除 1 条边且就是 treebind', eRemoved.length === 1 && eRemoved[0] === DROPPED_EDGE, eRemoved)

const eBkeep = eB.filter((e) => e.id !== DROPPED_EDGE)
check('其余边逐条逐字段不变（顺序也一致）', JSON.stringify(eBkeep) === JSON.stringify(eA))
check('已无边端点指向源实体', !eA.some((e) => e.source === SRC_REF || e.target === SRC_REF))

// ── 池 ────────────────────────────────────────────────────────────────
const pB = load(bp, 'node-pool.json')
const pA = load(DATA, 'node-pool.json')
const kB = Object.keys(pB)
const kA = Object.keys(pA)
check(`池实体 ${kB.length} → ${kA.length}（−1）`, kA.length === kB.length - 1, { before: kB.length, after: kA.length })
const kRemoved = kB.filter((k) => !kA.includes(k))
check('恰好删除 1 个实体且就是源实体', kRemoved.length === 1 && kRemoved[0] === SRC_REF, kRemoved)
check('源实体已不在池中', !(SRC_REF in pA))

let poolDrift = []
for (const k of kA) if (JSON.stringify(pB[k]) !== JSON.stringify(pA[k])) poolDrift.push(k)
check('其余池实体逐字段不变（0 漂移）', poolDrift.length === 0, poolDrift.slice(0, 10))

// ── 4 个类节点必须在 ──
for (const [ref, tabs] of [['k_java_lang_string', 36], ['k_java_util_scanner', 26], ['k_java_nio_file_files', 31], ['k_java_lang_enum', 9]]) {
  check(`类节点 ${ref} 仍在且 tabs=${tabs}`, pA[ref]?.card?.tabs?.length === tabs, pA[ref]?.card?.tabs?.length)
}
const rawPoolAfter = fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8')
check('node-pool.json 文本里已无源实体 id（含键/字段）',
  (rawPoolAfter.match(/k_vault_javajava_1b1w4s/g) ?? []).length === 0,
  (rawPoolAfter.match(/k_vault_javajava_1b1w4s/g) ?? []).length)
const rawTreeAfter = fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8')
check('tree-data.json 文本里已无源 treeId',
  (rawTreeAfter.match(/tree_vault_javajava_1b1w4s/g) ?? []).length === 0,
  (rawTreeAfter.match(/tree_vault_javajava_1b1w4s/g) ?? []).length)

// ── 末尾换行 ──
for (const f of ['tree-data.json', 'knowledge-edges.json', 'node-pool.json']) {
  check(`${f} 末尾换行保留`, fs.readFileSync(path.join(DATA, f), 'utf8').endsWith('\n'))
}

console.log(`\n结果：通过 ${pass.length} / 失败 ${fail.length}`)
if (fail.length) { console.log('失败项:', JSON.stringify(fail, null, 1)); process.exit(1) }
