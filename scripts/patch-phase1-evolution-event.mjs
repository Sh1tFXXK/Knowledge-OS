/**
 * 一次性修正：重写 2026-09-14 阶段一追加的那条 evolution-event。
 *
 * 为什么需要修正（如实记录，不掩盖）：
 *   `apply-phase1.mjs` 生成该事件时有两处缺陷 ——
 *     ① `挂载数` 在**变更之后**才计算，于是 抽象类 被算成 1（实际基线 3）；
 *     ② `introducedNodes` 只取了 `action === 'create'` 的结果，漏掉 4 个「按语义拆分」新建的池实体。
 *   两个缺陷**只影响这条审计记录的文案**，不影响 tree / pool / edges 的数据正确性
 *   （那三者已独立复核：规模、结构、边、语义拆分、validator 全绿）。
 *   脚本已同步修复；本脚本只把已落盘的那条记录改成正确值。
 *
 * 取值全部**从备份（落盘前）+ 当前盘上数据推导**，不手工填数字：
 *   - 基线挂载数 ← data/backups/<批次>/tree-data.json
 *   - 新增实体   ← 当前 pool 减去备份 pool
 *   - mounts     ← 当前 tree 里指向该实体的挂载点
 *
 * ⚠️ 落盘形状必须遵守读取端白名单：
 *   `src/knowledge/timelineEvolution.ts` 的 `asIntroducedNodes()` 只回传
 *   `{ nodeId, parentNodeId }` 两个字段，且要求 `parentNodeId` 为 **字符串**
 *   （非 string 会被静默丢弃，届时该实体在本事件里凭空消失）。
 *   所以本脚本**只写这两字段**；mounts/label 仅在控制台打印供人工核对，
 *   审计细节留在 outputs/tree-violation-scan/ 的报告里。
 *
 * 用法：node scripts/patch-phase1-evolution-event.mjs          # 只看差异
 *      node scripts/patch-phase1-evolution-event.mjs --apply  # 写入
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const APPLY = process.argv.includes('--apply')

const SPLIT_REFS = [
  { ref: 'k_1784295376153_uiovkk', name: '抽象类', role: 'ontology' },
  { ref: 'k_1784044129424_ffqm4z', name: '内部类', role: 'reference' },
  { ref: 'k_1784045589643_icc5oo', name: '最终类', role: 'reference' },
  { ref: 'k_1784044171635_8etz45', name: '匿名类', role: 'ontology' },
]

const bkRoot = path.join(DATA, 'backups')
const bk = fs.readdirSync(bkRoot).filter((d) => d.startsWith('phase1-oop-os-')).sort().pop()
if (!bk) throw new Error('找不到 phase1 备份目录')

const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))
const bTree = rd(path.join(bkRoot, bk, 'tree-data.json'))
const bPool = rd(path.join(bkRoot, bk, 'node-pool.json'))
const tree = rd(path.join(DATA, 'tree-data.json'))
const pool = rd(path.join(DATA, 'node-pool.json'))

const indexTree = (root) => {
  const recs = []
  ;(function w(n, parent, trail) {
    const t = [...trail, n]
    recs.push({ n, parent, path: t.map((x) => String(x.name ?? '')).join(' > ') })
    for (const c of n.children || []) w(c, n, t)
  })(root, null, [])
  return recs
}
const bRecs = indexTree(bTree)
const recs = indexTree(tree)

const newRefs = Object.keys(pool).filter((k) => !bPool[k])
// 诊断用（含 mounts/label），落盘时只取 schema 白名单字段。
const newRefsDetail = newRefs.map((ref) => {
  const mounts = recs.filter((r) => r.n.nodeRef === ref)
  const parentNodeId = mounts[0]?.parent?.nodeRef
  if (typeof parentNodeId !== 'string') {
    throw new Error(
      '新实体 ' + ref + ' 取不到字符串型 parentNodeId —— ' +
      '写成 null 会被读取端 asIntroducedNodes() 静默丢弃，必须修数据而不是改记录',
    )
  }
  return {
    nodeId: ref,
    parentNodeId,
    mounts: mounts.map((m) => m.parent?.nodeRef ?? null),
    label: pool[ref].label,
  }
})
const introducedNodes = newRefsDetail.map(({ nodeId, parentNodeId }) => ({ nodeId, parentNodeId }))

const counterpartOf = (s) => {
  const hits = newRefsDetail.filter((n) => n.nodeId !== s.ref && n.label === s.name)
  if (hits.length !== 1) {
    throw new Error('拆分「' + s.name + '」的对侧新实体应唯一，实际命中 ' + hits.length + ' 个')
  }
  return hits[0].nodeId
}

const changes = SPLIT_REFS.map((s) => {
  const onto = recs.find((r) => r.n.id && /^tree_class_programming_(abstract|inner|final|anonymous)_class$/.test(r.n.id) && pool[r.n.nodeRef]?.label === s.name)
  const baseRecs = bRecs.filter((r) => r.n.nodeRef === s.ref)
  const oopN = baseRecs.filter((r) => r.path.includes('面向对象')).length
  const javaN = baseRecs.filter((r) => r.path.includes('java')).length
  const road = baseRecs.map((r) => r.path).join(' ； ') || '—'
  const side = s.role === 'ontology' ? '本体' : '具象'
  const other = s.role === 'ontology' ? 'reference' : 'ontology'
  // 本体侧挂载点在变更前是否已存在：存在=纯改指向（可能伴随簇1的 分类→类的分类 重命名）；不存在=本批新建
  const ontoPreexisted = Boolean(onto && bRecs.some((r) => r.n.id === onto.n.id))
  const ontoDesc = !onto
    ? '(见 tree)'
    : onto.n.id + (ontoPreexisted ? '（原有挂载点，随「分类」→「类的分类」重命名保留）' : '（本批新建）')
  return {
    targetNodeId: s.ref,
    facet: 'structure',
    before: '变更前 ' + baseRecs.length + ' 个挂载点共享同一实体（其中 OOP 树 ' + oopN + ' 处、Java 树 ' + javaN + ' 处）：' + road + '。',
    after: '按「实体语义优先于挂载路径」判为 ' + s.role + '：正文留在「' + side + '」侧并保持原 identity ' +
      s.ref + '；本体挂载于 ' + ontoDesc + ' → ' + (onto ? onto.path : '') +
      '；另一侧新建 ' + counterpartOf(s) + '（' + other + '）承接对应语义。',
  }
})

const evoPath = path.join(DATA, 'evolution-events.json')
const raw = fs.readFileSync(evoPath, 'utf8')
const trailNL = raw.endsWith('\n')
const evo = JSON.parse(raw)
const idx = evo.findIndex((e) => String(e.id).startsWith('event:tree-refactor:phase1:'))
if (idx < 0) throw new Error('找不到阶段一的 evolution-event')

const before = evo[idx]
const after = { ...before, introducedNodes, changes }

console.log('备份基线：data/backups/' + bk)
console.log('\n== introducedNodes: ' + before.introducedNodes.length + ' → ' + after.introducedNodes.length + ' ==')
for (const n of newRefsDetail) console.log('   ' + n.nodeId + '  ' + n.label + '  挂在 ' + (n.mounts || []).join(', '))
console.log('\n== changes ==')
for (const c of after.changes) {
  console.log('   ' + c.targetNodeId)
  console.log('      before: ' + c.before)
  console.log('      after : ' + c.after)
}

if (!APPLY) {
  console.log('\n[未写盘] 加 --apply 才写入')
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, 'evolution-event-prepatch.json'), JSON.stringify(before, null, 2) + '\n', 'utf8')
  evo[idx] = after
  const text = JSON.stringify(evo, null, 2) + (trailNL ? '\n' : '')
  const tmp = evoPath + '.tmp-' + process.pid + '-' + Date.now()
  fs.writeFileSync(tmp, text, 'utf8')
  try { fs.renameSync(tmp, evoPath) } catch { fs.writeFileSync(evoPath, text, 'utf8'); try { fs.unlinkSync(tmp) } catch { /* noop */ } }
  console.log('\n已修正 ' + path.relative(ROOT, evoPath) + '（修正前版本存于 outputs/tree-violation-scan/evolution-event-prepatch.json）')
}
