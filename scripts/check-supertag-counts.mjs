/**
 * 只读核查：tag 库（supertags）基数是否被 core-library 批次影响。
 * 走 vite ssrLoadModule 跑真实函数（node 直跑 TS 解析不了无扩展名相对导入）。
 */
import { createServer } from 'vite'
import { readJson } from './shell-fusion/lib.mjs'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const mod = await server.ssrLoadModule('/src/knowledge/supertagMaterials.ts')
  const pool = readJson('node-pool.json')
  const groups = mod.collectSupertagMaterialGroups(pool)

  let memberships = 0
  const byKindMembership = { node: 0, tab: 0, page: 0 }
  const seen = new Set()
  const dedupByKind = new Map() // kind -> Set(materialId)
  for (const g of groups) {
    for (const m of g.materials) {
      memberships += 1
      byKindMembership[m.kind] = (byKindMembership[m.kind] ?? 0) + 1
      seen.add(m.id)
      if (!dedupByKind.has(m.kind)) dedupByKind.set(m.kind, new Set())
      dedupByKind.get(m.kind).add(m.id)
    }
  }
  const byKind = {
    node: dedupByKind.get('node')?.size ?? 0,
    tab: dedupByKind.get('tab')?.size ?? 0,
    page: dedupByKind.get('page')?.size ?? 0,
  }
  console.log('supertag 组数        ', groups.length)
  console.log('成员关系条数（含重复）', memberships, JSON.stringify(byKindMembership))
  console.log('去重材料 id          ', seen.size)
  console.log('去重后按 kind        ', JSON.stringify(byKind))

  // 基线：5,511 组 / 9,681 去重 / node 3,858 · page 5,235 · tab 588
  const EXPECT = { groups: 5511, dedup: 9681, node: 3858, page: 5235, tab: 588 }
  console.log('\n对照基线：')
  console.log(`  组数   ${groups.length} vs ${EXPECT.groups}  ${groups.length === EXPECT.groups ? '✓ 未变' : '✗ 有变化'}`)
  console.log(`  去重   ${seen.size} vs ${EXPECT.dedup}  ${seen.size === EXPECT.dedup ? '✓ 未变' : '✗ 有变化'}`)
  console.log(`  node   ${byKind.node} vs ${EXPECT.node}  ${byKind.node === EXPECT.node ? '✓' : '✗'}`)
  console.log(`  tab    ${byKind.tab} vs ${EXPECT.tab}  ${byKind.tab === EXPECT.tab ? '✓' : '✗'}`)
  console.log(`  page   ${byKind.page} vs ${EXPECT.page}  ${byKind.page === EXPECT.page ? '✓' : '✗'}`)

  // 新增的 58 个方法 tab 有没有带 tags（若有则会进 tag 库）
  let untaggedNew = 0
  for (const id of ['k_java_lang_string', 'k_java_util_scanner', 'k_java_nio_file_files', 'k_java_lang_enum']) {
    for (const t of pool[id].card.tabs) {
      if (!t.tags || t.tags.length === 0) untaggedNew += 1
    }
  }
  console.log(`\n四个类节点里「无 tags」的 tab 数: ${untaggedNew}（无 tags ⇒ 不进 tag 库）`)
} finally {
  await server.close()
}
