/**
 * A-split 自审修复：
 *   A) §一 #62 收尾 —— aop_proxyfactory 是 aop_flow.participantNodeIds 活引用（§0 保护名单原则：
 *      spec 活引用节点不退池不卸载，同 #61 先例），但上批只保了池、卸了树，导致它成为
 *      全库唯一「有 spec 引用却无树挂载」的参与者，且池 label 仍是捆绑名。
 *      修：label/card.title 去捆绑 →「ProxyFactory」；恢复树条目（父「执行阶段」，同基线位置）；
 *          正文里的「代理策略」段落按 §4.4 抽成 supplement「代理策略（JDK / Cglib）」承载差异。
 *   B) react_root 与 asplit_s1_asplit_module_export 共用 asplit_module_export（父子同 ref →
 *      createTreeBindingEdge 拒建边）。基线本是 react_root+react_tree_export 共用 react_export_import，
 *      同为 1 组重复，非本批新增；若能找到 React 正身则改指，否则原样保留并记录。
 *
 * 用法：node scripts/shell-fusion/a-split/fix-audit-findings.mjs [--apply]
 */
import { loadState, flatten, gateScan, statLine, log } from './common.mjs'
import {
  saveAll, addSupplementTab, detachChild, attachChild,
  createTreeBindingEdge, upsertEdge, treeCount,
} from '../lib.mjs'

const apply = process.argv.includes('--apply')
const state = loadState()
const { pool, tree, edges, questions } = state
const flat = () => flatten(tree)
const byId = (id) => flat().find((f) => f.node.id === id)
const addedEdges = []

log('═══ A-split 自审修复 ═══')
log(`起始 ${statLine(state)}`)

// ── A) #62 ProxyFactory ────────────────────────────────────────────────
log('\n── A) #62 ProxyFactory（spec 参与者恢复树挂载 + 去捆绑名）──')
{
  const REF = 'aop_proxyfactory'
  const spec = pool.aop_flow?.mechanismSpec
  if (!spec) throw new Error('aop_flow.mechanismSpec 不存在')
  if (!spec.participantNodeIds.includes(REF)) throw new Error(`${REF} 不在 aop_flow.participantNodeIds，假设不成立`)
  const n = pool[REF]
  if (!n) throw new Error(`${REF} 不在池`)

  const oldLabel = n.label
  const NEW_LABEL = 'ProxyFactory'
  const mounts = flat().filter((f) => f.node.nodeRef === REF)
  log(`  现值：label「${oldLabel}」· 树挂载 ${mounts.length} · 被 aop_flow 引用`)

  // 1) 去捆绑名（id 不变，spec 引用零风险）
  if (n.label !== NEW_LABEL) {
    n.label = NEW_LABEL
    if (n.card) n.card.title = NEW_LABEL
    log(`  改名：池 label「${oldLabel}」→「${NEW_LABEL}」（id 不变，spec 引用不受影响）`)
  }
  // 2) 去掉正文首行的旧捆绑标题（rootContent 首段）
  const rc = n.card?.rootContent ?? ''
  if (rc.startsWith(oldLabel)) {
    n.card.rootContent = `${NEW_LABEL}${rc.slice(oldLabel.length)}`
    log(`  rootContent 首行同步：${oldLabel} → ${NEW_LABEL}`)
  }

  // 3) 「代理策略」段落抽成 supplement（§4.4 差异写 supplement）
  if (mounts.length === 0) {
    const parentRec = byId('tree_aop_flow')
    if (!parentRec) throw new Error('宿主 tree_aop_flow 不存在')
    const entry = { id: 'tree_aop_proxyfactory_restored', name: NEW_LABEL, count: 0, nodeRef: REF, children: [] }
    attachChild(parentRec.node, entry)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: parentRec.node.id, childTreeId: entry.id, childKnowledgeId: REF })
    if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
    log(`  恢复树条目「${NEW_LABEL}」(${entry.id}) @「${parentRec.node.name}」`)
    const body = [n.card?.rootContent ?? '', ...(n.card?.tabs ?? []).map((t) => t.content ?? '')].join('\n\n')
    const lines = body.split('\n').filter((l) => /代理策略|JDK Proxy|Cglib Proxy|强制使用/.test(l))
    const content = lines.length > 0
      ? `代理策略（差异补充）：\n\n${lines.join('\n')}`
      : '代理策略：目标类实现接口 → 默认 JDK Proxy；未实现接口 → 默认 Cglib Proxy；也可配置强制使用 Cglib Proxy。'
    addSupplementTab(entry, { id: 'asplit:s62:strategy', label: '代理策略（JDK / Cglib）', content, tags: n.tags ?? [] })
    log(`  supplement 新增：代理策略（JDK / Cglib，${content.length} 字）`)
  } else {
    log('  树挂载已存在，跳过恢复')
  }
}

// ── B) react_root 重复 nodeRef ─────────────────────────────────────────
log('\n── B) react_root 与「模块导出」共用同一池节点 ──')
{
  const rootRec = byId('react_root')
  if (!rootRec) throw new Error('react_root 不存在')
  const cur = rootRec.node.nodeRef
  const dup = flat().filter((f) => f.node.nodeRef === cur)
  log(`  react_root.nodeRef = ${cur}（池「${pool[cur]?.label}」），共 ${dup.length} 处挂载：${dup.map((d) => d.node.id).join(' , ')}`)
  const reactCands = Object.values(pool).filter((n) => (n.label ?? '') === 'React')
  log(`  池内 label 恰为「React」的节点：${reactCands.length ? reactCands.map((c) => c.id).join(' , ') : '无'}`)
  if (reactCands.length === 1) {
    rootRec.node.nodeRef = reactCands[0].id
    log(`  改指：react_root.nodeRef → ${reactCands[0].id}（消除父子同 ref，去一处重复）`)
    const edge = createTreeBindingEdge({ tree, pool, parentTreeId: rootRec.parent.id, childTreeId: rootRec.node.id, childKnowledgeId: reactCands[0].id })
    if (edge && upsertEdge(edges, edge)) addedEdges.push(edge.id)
  } else {
    log('  ⚠️ 池内无唯一「React」正身 → 原样保留（基线即为 1 组重复，非本批新增），仅记录为待净化债务')
  }
}

// ── 门禁 ───────────────────────────────────────────────────────────────
log('\n── 门禁（六处活引用复扫，引用集合不变，只换 label/挂载）──')
const scan = gateScan(state, ['aop_proxyfactory'], {})
if (scan.hits.length > 0) log(`  仍被引用 ${scan.hits.length} 处（预期：spec 内部接线 + 本批边）`)
for (const h of scan.hits) log('    · ' + h)

log(`\n结果：树 ${treeCount(tree)} 条 / 池 ${Object.keys(pool).length} 个 / 边 ${edges.length} 条`)
log(`新建边 ${addedEdges.length} 条 ${addedEdges.join(' , ')}`)
if (apply) {
  saveAll({ pool, tree, edges, questions })
  log('已原子写入 data/{node-pool,tree-data,knowledge-edges,questions}.json')
} else {
  log('（干跑，未写盘）')
}
