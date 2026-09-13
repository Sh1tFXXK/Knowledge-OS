#!/usr/bin/env node
/**
 * final-87 第二批 · 落盘脚本（R 残留 + D2 无 spec 30 条 + C 教程壳 37 条）
 *
 * 依据：用户《最终统一重构规划与爆破 Blueprint》+ 2026-09-14 裁决 + batch1 已确立的口径。
 *
 * 三组动作：
 *   R  组（3 条残留）：R2 把「引用计数法 / 可达性分析算法」重挂到「垃圾回收判定」
 *                      R3 删除 3 个改名节点的旧名 tag（保留新名）
 *                      （R1 收窄扫描器正则属源码改动，不在此脚本内）
 *   D2 组（30 条）  ：无 mechanismSpec 覆盖的工程片段
 *                      · bean_lc_* 5  → 新建 mechanismSpec（宿主「Bean 生命周期」）+ 正文镜像 + 卸树留池
 *                      · surge_*  6   → 正文并入「流量激增应对方法」+ 卸树 + 退休
 *                      · hps_*    6   → 正文并入「QPS 提升 10 倍的系统设计」+ 卸树 + 退休
 *                      · sqopt_idea_* 10 → 正文并入「慢查询优化思路（十条）」+ 卸树 + 退休
 *                      · 合理地配置线程池 / 线上问题定位 → 并入宿主 + 卸树 + 退休
 *                      · 创建数据仓库（11 亲儿子 / 32 后代）→ 提级到「数据仓库」+ 卸树 + 退休
 *   C  组（37 条）  ：教程/章节外壳
 *                      · 章节壳 15 去序号（其中 _13/_16 先消解「与自身子节点同名」）
 *                      · 详解壳 16：10 条撞名 → 正文融合进正身 + 卸树 + 退休；
 *                                    6 条无冲突 → 纯改名
 *                      · 「基础」壳 2 + 大壳 4 → 实名
 *
 * ⚠️ 三条既有口径（batch1 已确立，务必沿用）：
 *   1. 「卸树」≠「删节点」。机制状态卸树后留在池中，否则 mechanismSpec 渲染崩。
 *   2. supplement 挂在**树条目**上（渲染读 `activePathContext?.supplement?.tabs`）。
 *   3. 改名必须同步补 tags（池内 3538/3786 节点遵循「tags 含自身 label」）。
 * ⚠️ 写数据前必须杀掉 dev server。
 *
 * 用法（仓库根目录执行）：
 *   node scripts/execute-final-87-batch2.mjs                    # dry-run（默认）
 *   node scripts/execute-final-87-batch2.mjs --group=D2         # 只做 D2
 *   node scripts/execute-final-87-batch2.mjs --group=R,D2,C --apply
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, loadAll, saveAll, rel } from './shell-fusion/lib.mjs'
import { statLine } from './shell-fusion/a-split/common.mjs'
import { makeCore } from './shell-fusion/final87-core.mjs'

const apply = process.argv.includes('--apply')
const groupArg = (process.argv.find((a) => a.startsWith('--group=')) ?? '--group=R,D2,C').slice('--group='.length)
const groups = new Set(groupArg.split(',').map((s) => s.trim()).filter(Boolean))
const KNOWN = ['R', 'D2', 'C']
for (const g of groups) {
  if (!KNOWN.includes(g)) {
    console.error(`✗ 未知分组「${g}」，可用：${KNOWN.join(' / ')}`)
    process.exit(2)
  }
}

const state = loadAll()
state.events = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'evolution-events.json'), 'utf8'))
const { pool, edges } = state
const core = makeCore(state)
const { entryOf, journal, errors, warnings, note, unloadTree, promoteChildren, reparentChildren, mirrorSupplement, renameInPlace, addTag, removeTag, retire, setMechanismSpec, addInternalEdge, mergeAndRetire } = core

// ══════════════════════════════════════════════════════════════════════════
// P · 前置：把指向「待退休壳」的活引用改指到正身（否则门一拦截落盘）
//     宪法口径：relatedNodeId / 边端点都应指向名词本体，不指向教程壳。
//     只要本批请求了 D2 或 C，就自动先跑这一段。
// ══════════════════════════════════════════════════════════════════════════
if (groups.has('D2') || groups.has('C')) {
  console.log('══ P · 前置活引用重指 ══')
  if (groups.has('C')) {
    // 「线程池详解」被 4 张题当作 relatedNodeId 承载 → 改指正身「ThreadPoolExecutor」
    const CANON = 'k_java_type_ff6db88dc6746818'
    if (!pool[CANON]) errors.push(`P：正身 ${CANON} 不在池中`)
    for (const q of state.questions.filter((x) => x.relatedNodeId === 'k_1786093143886_qda5cu')) {
      q.relatedNodeId = CANON
      q.updatedAt = Date.now()
      note(`题目重指 ${q.id}.relatedNodeId：k_1786093143886_qda5cu → ${CANON} — C 组：题应指向名词本体 ThreadPoolExecutor`)
    }
    // 「线程池详解」是某条 relates-to 边的 source → 边改挂正身「线程池」
    const EDGE = 'edge_vault_threadpool_relates_executor'
    const e = edges.find((x) => x.id === EDGE)
    const THREADPOOL = 'k_1784597083135_287nro'
    if (e && e.source === 'k_vault_java_1n4uei') {
      if (!pool[THREADPOOL] || !pool[e.target]) errors.push(`P：边 ${EDGE} 改指后端点不在池中（${THREADPOOL} / ${e.target}）`)
      const dup = edges.find((x) => x.id !== EDGE && x.source === THREADPOOL && x.target === e.target && x.type === e.type)
      if (dup) {
        edges.splice(edges.indexOf(e), 1)
        note(`删除重复边 ${EDGE}（改指后与 ${dup.id} 完全同源同目标同类型）— C 组：线程池详解退休`)
      } else {
        e.source = THREADPOOL
        e.label = '线程池对应 Executor 框架'
        note(`边重指 ${EDGE}.source：k_vault_java_1n4uei → ${THREADPOOL}（label 同步去「详解」）— C 组`)
      }
    } else if (e) {
      warnings.push(`P：边 ${EDGE} 的 source 已是 ${e.source}，跳过重指`)
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// R 组 · 残留收尾（3 条）
// ══════════════════════════════════════════════════════════════════════════
if (groups.has('R')) {
  console.log('══ R 组 · 残留收尾 ══')
  // R2 · 「如何判断对象可以被回收」的两条判定方法本该落在「垃圾回收判定」，batch1 落到了上一层「垃圾回收」
  reparentChildren('tree_1783171786694_r8028l', 'tree_jvm_gc_reachability',
    ['tree_1783171290335_i1egql', 'tree_atomic_k_atom_reachability'],
    'R2：判定方法回归「垃圾回收判定」（batch1 提级时上移了一层）')

  // R3 · 旧名 tag 清理（新名 tag 已在 batch1 补入，旧名属壳名残留）
  removeTag('sk_perf_bottleneck', '如何发现瓶颈')
  removeTag('aop_flow', '执行阶段')
  removeTag('bcs_caller', '调用方(getBean 请求)')
}

// ══════════════════════════════════════════════════════════════════════════
// D2 组 · 无 mechanismSpec 的 30 条
// ══════════════════════════════════════════════════════════════════════════
if (groups.has('D2')) {
  console.log('══ D2 组 · 工程片段 30 条 ══')

  // ── D2-a · Spring Bean 生命周期五阶段 → 新建 mechanismSpec ──────────────
  // 参照池内既有 spec（bcs_flow / tpl_flow / aop_flow）：宿主 role=mechanism、kind=mechanism，
  // 状态 role=conclusion、kind=state，转移边 type=transitions-to、relationKind=state-transition。
  const BEANLC = [
    { ref: 'bean_lc_prepare', treeId: 'tree_bean_lc_prepare', label: '创建前准备阶段' },
    { ref: 'bean_lc_instantiate', treeId: 'tree_bean_lc_instantiate', label: '创建实例阶段' },
    { ref: 'bean_lc_inject', treeId: 'tree_bean_lc_inject', label: '依赖注入阶段' },
    { ref: 'bean_lc_cache', treeId: 'tree_bean_lc_cache', label: '容器缓存阶段' },
    { ref: 'bean_lc_destroy', treeId: 'tree_bean_lc_destroy', label: '销毁实例阶段' },
  ]
  const BEANLC_HOST = 'asplit_s1_asplit_bean_lifecycle' // 「Bean 生命周期」
  const BEANLC_HOST_REF = 'asplit_bean_lifecycle'
  const BEANLC_DIMS = ['Spring', 'java', '软件框架']

  for (const s of BEANLC) {
    mirrorSupplement(BEANLC_HOST, { id: `final87:d2-${s.ref}`, label: s.label, content: core.textOf(s.ref) })
    // 状态标签去序号（机制视图按转移边表达次序，标签里的「1.」是过程片段残留）
    const n = pool[s.ref]
    if (n) {
      const oldLabel = n.label
      n.label = s.label
      if (Array.isArray(n.tags)) {
        const i = n.tags.indexOf(oldLabel) // ⚠️ 必须用改名前捕获的旧 label 去查，否则查的是新名
        if (i >= 0) n.tags.splice(i, 1)
        if (!n.tags.includes(s.label)) n.tags.push(s.label)
      }
      n.kind = 'state'
      n.role = 'conclusion'
      if (!Array.isArray(n.dimensions) || !n.dimensions.length) n.dimensions = [...BEANLC_DIMS]
    }
    unloadTree(s.treeId, 'D2 组：Bean 生命周期阶段归 mechanismSpec 承载，节点留池供机制视图渲染')
  }
  for (let i = 1; i < BEANLC.length; i += 1) {
    addInternalEdge({
      id: `beanlc:t_${i}`,
      source: BEANLC[i - 1].ref,
      target: BEANLC[i].ref,
      type: 'transitions-to',
      label: [
        '配置解析完成，进入实例创建',
        '实例已建，开始依赖注入',
        '依赖注入完成，Bean 入单例缓存',
        '应用上下文关闭，销毁 Bean',
      ][i - 1],
      relationKind: 'state-transition',
      dimensions: [...BEANLC_DIMS],
    }, 'D2：Bean 生命周期阶段转移')
  }
  const hostNode = pool[BEANLC_HOST_REF]
  if (hostNode) {
    hostNode.kind = 'mechanism'
    hostNode.role = 'mechanism'
    if (!Array.isArray(hostNode.dimensions) || !hostNode.dimensions.length) hostNode.dimensions = [...BEANLC_DIMS]
    if (!Array.isArray(hostNode.tags)) hostNode.tags = []
    if (!hostNode.tags.includes(hostNode.label)) hostNode.tags.push(hostNode.label)
    note(`宿主 ${BEANLC_HOST_REF}「${hostNode.label}」标为 mechanism（kind/role）`)
  } else {
    errors.push(`D2：宿主池节点 ${BEANLC_HOST_REF} 不存在`)
  }
  setMechanismSpec(BEANLC_HOST_REF, {
    phenomenonNodeId: BEANLC_HOST_REF,
    triggerNodeIds: ['bcs_caller'],
    participantNodeIds: ['bcs_def', 'bcs_cache'],
    stateNodeIds: BEANLC.map((s) => s.ref),
    transitionEdgeIds: [1, 2, 3, 4].map((i) => `beanlc:t_${i}`),
    constraintEdgeIds: [],
    outcomeNodeIds: ['bean_lc_destroy'],
    failureNodeIds: [],
  }, 'D2：Bean 生命周期五阶段新建机制 spec')

  // ── D2-b · 三组「正文并入宿主」的并列清单 ────────────────────────────────
  const INLINE_GROUPS = [
    {
      name: '流量激增应对方法（六步）',
      host: 'tree_surge_overview', hostRef: 'surge_overview',
      items: [
        ['surge_estimate', 'tree_surge_estimate'], ['surge_stress', 'tree_surge_stress'],
        ['surge_bottleneck', 'tree_surge_bottleneck'], ['surge_scale', 'tree_surge_scale'],
        ['surge_degrade', 'tree_surge_degrade'], ['surge_ha', 'tree_surge_ha'],
      ],
    },
    {
      name: 'QPS 提升 10 倍的系统设计（六板斧）',
      host: 'tree_hps_overview', hostRef: 'hps_overview',
      items: [
        ['hps_scale', 'tree_hps_scale'], ['hps_rpc', 'tree_hps_rpc'],
        ['hps_mq', 'tree_hps_mq'], ['hps_cache', 'tree_hps_cache'],
        ['hps_db', 'tree_hps_db'], ['hps_ha', 'tree_hps_ha'],
      ],
    },
    {
      name: '慢查询优化思路（十条）',
      host: 'tree_sqopt_ideas', hostRef: 'sqopt_ideas',
      items: [
        ['sqopt_idea_highconc', 'tree_sqopt_idea_highconc'], ['sqopt_idea_index', 'tree_sqopt_idea_index'],
        ['sqopt_idea_bottleneck', 'tree_sqopt_idea_bottleneck'], ['sqopt_idea_target', 'tree_sqopt_idea_target'],
        ['sqopt_idea_explain', 'tree_sqopt_idea_explain'], ['sqopt_idea_small_drive', 'tree_sqopt_idea_small_drive'],
        ['sqopt_idea_sort_index', 'tree_sqopt_idea_sort_index'], ['sqopt_idea_columns', 'tree_sqopt_idea_columns'],
        ['sqopt_idea_filter', 'tree_sqopt_idea_filter'], ['sqopt_idea_join', 'tree_sqopt_idea_join'],
      ],
    },
  ]
  for (const g of INLINE_GROUPS) {
    for (const [ref, treeId] of g.items) {
      const hit = entryOf(treeId)
      const label = hit ? hit.node.name : (pool[ref]?.label ?? ref)
      mergeAndRetire({
        treeId, ref, hostTreeId: g.host, canonicalRef: g.hostRef,
        tabId: `final87:d2-${ref}`, tabLabel: label,
        why: `D2 组：${g.name} 并列步骤，正文归宿主承载`,
      })
    }
  }

  // ── D2-c · 两条单条工程片段 ──────────────────────────────────────────────
  mergeAndRetire({
    treeId: 'tree_1786092342461_a1uk2e', ref: 'k_1786092342085_3zwh4c',
    hostTreeId: 'tree_1786092212132_mr8yxp', canonicalRef: 'k_1786092211800_3qjdgk',
    tabId: 'final87:d2-pool-config', tabLabel: '合理地配置线程池',
    why: 'D2 组：线程池配置经验归「线程池的使用」',
  })
  mergeAndRetire({
    treeId: 'tree_1786096587342_j05qf9', ref: 'k_1786096587014_vzab8u',
    hostTreeId: 'tree_1786096444971_lwc3wc', canonicalRef: 'k_1786096444701_f6gecl',
    tabId: 'final87:d2-online-diag', tabLabel: '线上问题定位',
    why: 'D2 组：线上定位经验归「Java并发编程实践」',
  })

  // ── D2-d · 创建数据仓库（11 亲儿子 / 32 后代）先提级再退休 ────────────────
  // 该节点正文只有 7 字（就是标题本身），镜像会得到一个零信息页签 → 只提级子树，不追加 supplement。
  mergeAndRetire({
    treeId: 'tree_wiki_en_outline_of_databases_s20_s21', ref: 'k_wiki_en_outline_of_databases_s21',
    canonicalRef: 'k_wiki_en_outline_of_databases_s20',
    promoteTo: 'tree_wiki_en_outline_of_databases_s20',
    why: 'D2 组：子树提级到「数据仓库」后退休（正文仅标题，不占 supplement）',
  })
}

// ══════════════════════════════════════════════════════════════════════════
// C 组 · 教程 / 章节外壳 37 条
// ══════════════════════════════════════════════════════════════════════════
if (groups.has('C')) {
  console.log('══ C 组 · 教程/章节外壳 37 条 ══')

  // ── C-a · 先消解两处「章节壳与自身子节点同名」────────────────────────────
  // _13：子条目 asplit_s106_db_design「数据库设计」与另一分支 tree_wiki_en_outline_of_databases_s4_s7
  //      **共用同一池节点**（都是 k_wiki_en_outline_of_databases_s7），是重复挂载 → 摘除该处挂载。
  // _16：子条目 tree_wiki_en_database_s20「数据库安全」持有 1626 字正文 → 正文并入章节，再摘除挂载。
  mergeAndRetire({
    treeId: 'asplit_s106_db_design', ref: 'k_wiki_en_outline_of_databases_s7',
    hostTreeId: 'chapter_db_13', canonicalRef: 'container:chapter_db_13',
    tabId: 'final87:c13-db-design', tabLabel: '数据库设计',
    promoteTo: 'chapter_db_13', keepInPool: true,
    why: 'C 组：与章节壳同名且与另一分支共用池节点，摘除重复挂载（节点留池）',
  })
  mergeAndRetire({
    treeId: 'tree_wiki_en_database_s20', ref: 'k_wiki_en_database_s20',
    hostTreeId: 'chapter_db_16', canonicalRef: 'container:chapter_db_16',
    tabId: 'final87:c16-db-security', tabLabel: '数据库安全',
    why: 'C 组：与章节壳同名，正文并入章节后退休',
  })

  // ── C-b · 15 个章节壳去序号（strict:false —— 撞名对象在其它分支，树本就容忍重名）──
  const CHAPTERS = [
    ['chapter_db_01', '数据库系统'], ['chapter_db_02', '数据模型'], ['chapter_db_03', '数据库结构'],
    ['chapter_db_05', '数据库操作'], ['chapter_db_08', '恢复系统'], ['chapter_db_09', '日志系统'],
    ['chapter_db_10', '存储系统'], ['chapter_db_12', '数据表示'], ['chapter_db_13', '数据库设计'],
    ['chapter_db_14', '数据库分布与复制'], ['chapter_db_16', '数据库安全'], ['chapter_db_17', '数据库运维'],
    ['chapter_db_18', '数据库编程与接口'], ['chapter_db_19', '数据库产品'], ['chapter_db_20', '数据库文件与实现'],
  ]
  for (const [tid, name] of CHAPTERS) renameInPlace(tid, name, 'C 组：章节壳去序号', { strict: false })

  // ── C-c · 10 个详解壳：撞名 → 正文融合进正身 ─────────────────────────────
  const FUSE = [
    ['tree_vault_javajavaarraylist_an0rm3', 'ArrayList 详解', 'tree_demo_java_array_list', 'Java 集合框架 / ArrayList'],
    ['tree_vault_javajavahashmap_14a6f2', 'HashMap 详解', 'tree_1785463930183_6xqdzx', 'Java 集合框架 / HashMap'],
    ['tree_vault_javajavahashset_176pvr', 'HashSet 详解', 'tree_1785684483891_xdr40d', 'Java 集合框架 / HashSet'],
    ['tree_vault_javajavalinkedlist_1uc0ii', 'LinkedList 详解', 'tree_1785683698292_nhrf3z', 'Java 集合框架 / LinkedList'],
    ['tree_vault_java_1n4uei', '线程池详解', 'tree_1785415709050_n3rbw5', 'java并发编程 / 线程池'],
    ['tree_1786095193397_uyjgsm', 'FutureTask详解', 'tree_1785918560147_r0lv4e', 'Executor框架 / FutureTask'],
    ['tree_1786093347020_15dntb', 'ScheduledThreadPoolExecutor详解', 'tree_java_source_1a247659a8087e94_s_type_af32be37bc61aea4', 'concurrent / ScheduledThreadPoolExecutor'],
    ['tree_1786093144146_ajv4cr', 'ThreadPoolExecutor详解', 'tree_1785416767656_xllpk1', '线程池 / ThreadPoolExecutor'],
    ['tree_vault_javakafkakafka_1qlqb8', 'Kafka 定位总览', 'tree_java_fw_kafka', 'Kafka'],
    ['tree_vault_javaspringcloudspringcloud_33p5su', 'Spring Cloud 定位总览', 'tree_java_fw_springcloud', 'Spring Cloud'],
  ]
  for (const [tid, shellName, hostTreeId, hostDesc] of FUSE) {
    const host = entryOf(hostTreeId)
    const shell = entryOf(tid)
    if (!host) { errors.push(`C 组：融合宿主不存在 ${hostTreeId}（${hostDesc}）`); continue }
    if (!shell) { errors.push(`C 组：融合源壳不存在 ${tid}（${shellName}）`); continue }
    mergeAndRetire({
      treeId: tid, ref: shell.node.nodeRef, hostTreeId,
      canonicalRef: host.node.nodeRef,
      tabId: `final87:${tid}`, tabLabel: shellName,
      promoteTo: hostTreeId,
      why: `C 组：详解壳正文融合进正身「${host.node.name}」（${hostDesc}）`,
    })
  }

  // ── C-d · 6 个详解/总览壳：无冲突 → 纯改名 ───────────────────────────────
  const PURE_RENAME_SHELLS = [
    ['tree_vault_javajava_15bnft', 'Java 集合框架'],
    ['tree_1786093265279_n5f4vh', 'CachedThreadPool'],
    ['tree_1786093175065_78z1xl', 'FixedThreadPool'],
    ['tree_1786093231555_o69fau', 'SingleThreadExecutor'],
    ['tree_vault_javajava_vzjv8p', 'Java 多线程编程'],
    ['tree_vault_javamybatismybatis_14eqlq', 'MyBatis'],
  ]
  for (const [tid, name] of PURE_RENAME_SHELLS) renameInPlace(tid, name, 'C 组：详解/总览壳去后缀归本体')

  // ── C-e · 2 个「基础」壳实名 ─────────────────────────────────────────────
  renameInPlace('tree_vault_javajava_ii523d', 'Java 数据结构', 'C 组：「基础」壳实名（正文为 Java 各数据结构）')
  renameInPlace('tree_vault_javajvm01jvm_1h8bru', 'JVM 核心概念', 'C 组：「基础」壳实名（正文含 JDK/JRE/JVM 关系、运行时数据区、对象创建与存活判定、Class 文件）')

  // ── C-f · 4 个大壳实名 ───────────────────────────────────────────────────
  renameInPlace('tree_java_syntax_zh_1oty7br', 'Java 语法要素', 'C 组：大壳实名（6 个亲儿子为标识符/字面量/变量/代码块/通用类型/关键字）')
  renameInPlace('tree_1783873300414_0y8oon', '软件开发', 'C 组：大壳实名（去「实践总览」壳后缀）')
  renameInPlace('tree_surge_auto_scale', '监控驱动动态扩容', 'C 组：大壳实名（去「进阶思路：」前缀）')
  renameInPlace('governance:canonical:school_real_world_conventions', '跨系统标准与约定', 'C 组：大壳实名（去「（总览）」壳后缀）')
}

// ══════════════════════════════════════════════════════════════════════════
// 复检与落盘
// ══════════════════════════════════════════════════════════════════════════
console.log('\n' + statLine(state))
console.log(`本批变更 ${journal.length} 项`)

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} 项前置校验未通过，拒绝落盘：`)
  for (const e of errors) console.error('   · ' + e)
  process.exit(1)
}

if (!apply) {
  console.log('\n── dry-run 变更清单（未写盘）──')
  for (const n of journal) console.log('  ' + n)
  if (warnings.length) { console.log('\n── 警告 ──'); for (const w of warnings) console.log('  ! ' + w) }
  console.log('\n（加 --apply 落盘）')
} else {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(ROOT, 'data', 'backups', `final-87-batch2-${stamp}`)
  fs.mkdirSync(dir, { recursive: true })
  for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json', 'evolution-events.json']) {
    fs.copyFileSync(path.join(ROOT, 'data', f), path.join(dir, f))
  }
  console.log(`\n备份 → ${rel(dir)}`)
  saveAll(state)
  console.log(`已落盘：${journal.length} 项变更`)
  for (const n of journal) console.log('  ' + n)
  if (warnings.length) { console.log('\n── 警告 ──'); for (const w of warnings) console.log('  ! ' + w) }
  fs.writeFileSync(path.join(dir, 'journal.txt'), journal.join('\n') + '\n' + warnings.map((w) => 'WARN ' + w).join('\n'), 'utf8')
}
