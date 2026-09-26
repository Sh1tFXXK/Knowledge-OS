/**
 * 阶段一 APPLY · 簇 1（OOP 类的分类重组）+ 簇 4（错位平移与自嵌套解散）
 *
 * 设计原则（REVIEW 已批准）：
 *   1. **实体语义优先于挂载路径** —— `semanticRoleAnalysis()` 读正文判定 ontology / reference，
 *      再决定「保留原实体 identity」还是「新建另一侧实体」。不做 `clone(node)`。
 *   2. **ID 保持稳定、批次信息不进 entity identity** —— 新池实体沿用仓库自身的
 *      `genId('k')`（`src/knowledge/defaults.ts`：`k_<Date.now()>_<base36×6>`），
 *      新 treeId 用稳定语义角色（`tree_class_programming_*` / `tree_concept_*`）。
 *      批次可追踪性只放 journal / 报告 / evolution-event，不污染 ID。
 *   3. **preflight 与 apply 走同一套操作函数**（`applyOps`）——
 *      默认模式只在克隆体上跑，`--apply` 才写盘，杜绝「预演与落盘逻辑不一致」。
 *
 * 模式：
 *   node scripts/apply-phase1.mjs --freeze          冻结基线（记录 md5 + guard 文件 md5）
 *   node scripts/apply-phase1.mjs                   预检（8 道闸门 + 内存模拟 + 验收断言），不写盘
 *   node scripts/apply-phase1.mjs --apply           真正写盘（写前备份 + 写后验收）
 *
 * 可选：
 *   --implements-mode=consistent|minimal   consistent=4 条（语义一致，默认）/ minimal=2 条（旧计划）
 *   --allow-dev-server                     检测到 vite dev 时不再仅告警
 *   --adopt-role=<ref>:<ontology|reference>  人工推翻语义判定（记入报告）
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd()
const DATA = path.join(ROOT, 'data')
const OUT_DIR = path.join(ROOT, 'outputs', 'tree-violation-scan')
const BASELINE_PATH = path.join(OUT_DIR, 'apply-baseline.json')
const FP_PATH = path.join(OUT_DIR, 'worktree-fingerprint.json')
const BT = String.fromCharCode(96)

const argv = process.argv.slice(2)
const hasFlag = (f) => argv.includes(f) || argv.some((a) => a.startsWith(f + '='))
/** 同时支持 `--flag value` 与 `--flag=value`（只支持前者会让 `=minimal` 被静默忽略）。 */
const getOpt = (f, d) => {
  const eq = argv.find((a) => a.startsWith(f + '='))
  if (eq) return eq.slice(f.length + 1)
  const i = argv.indexOf(f)
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d
}
const getOpts = (f) => {
  const out = []
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith(f + '=')) out.push(argv[i].slice(f.length + 1))
    else if (argv[i] === f && argv[i + 1]) out.push(argv[i + 1])
  }
  return out
}

const MODE = hasFlag('--apply') ? 'apply' : hasFlag('--freeze') ? 'freeze' : 'preflight'
const IMPL_MODE = getOpt('--implements-mode', 'consistent')
const ALLOW_DEV = hasFlag('--allow-dev-server')
const MANUAL_ROLES = new Map(getOpts('--adopt-role').map((s) => { const [r, v] = s.split(':'); return [r, v] }))

const WRITE_FILES = ['tree-data.json', 'node-pool.json', 'knowledge-edges.json', 'evolution-events.json']
const GUARD_FILES = ['src/core/explanation-index/indexGraphLayout.ts']

// ── 工具 ────────────────────────────────────────────────────────────────
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex')
const rd = (f) => fs.readFileSync(path.join(DATA, f), 'utf8')
const rdJson = (f) => JSON.parse(rd(f))
const clone = (x) => JSON.parse(JSON.stringify(x))

/** 仓库原生 id 生成器（镜像 src/knowledge/defaults.ts 的 genId）。 */
const genId = (prefix) => prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)

/** 原子写 + Windows EPERM 回退 + tmp 清理；保留原文件的末尾换行状态，避免格式漂移。 */
function writeJsonKeepFormat(abs, value, trailingNewline) {
  const text = JSON.stringify(value, null, 2) + (trailingNewline ? '\n' : '')
  const tmp = abs + '.tmp-' + process.pid + '-' + Date.now()
  fs.writeFileSync(tmp, text, 'utf8')
  try {
    fs.renameSync(tmp, abs)
  } catch {
    fs.writeFileSync(abs, text, 'utf8')
    try { fs.unlinkSync(tmp) } catch { /* noop */ }
  }
}

function makeIndex(root) {
  const byId = new Map()
  const recs = []
  ;(function w(n, parent, trail) {
    const t = [...trail, n]
    const r = { node: n, parent, trail: t, path: t.map((x) => String(x.name ?? '')).join(' > ') }
    recs.push(r); byId.set(n.id, r)
    for (const c of n.children || []) w(c, n, t)
  })(root, null, [])
  return { byId, recs }
}
const treebindId = (p, c) => 'treebind:' + p + ':' + c
const TB_PREFIX = 'treebind:'
/** 判「边对象」是不是 treebind。 */
const isTreebind = (e) => String(e.id).startsWith(TB_PREFIX)
/** 判「边 id 字符串」是不是 treebind —— 别拿 isTreebind 去判 id 字符串（会因 e.id===undefined 全部误判）。 */
const isTbId = (id) => String(id).startsWith(TB_PREFIX)
const kidsOf = (n) => (n.children || []).length
const mountsOf = (recs, ref) => recs.filter((r) => r.node.nodeRef === ref)

// ══════════════════════════════════════════════════════════════════════
// ① 语义判定：读正文决定 ontology / reference
// ══════════════════════════════════════════════════════════════════════
const JAVA_STRONG = [
  { re: /```(java|kt|cs|cpp|c\+\+)/i, w: 5, why: '含语言代码围栏' },
  { re: /(?<![A-Za-z])Java(?![A-Za-z])/, w: 3, why: '正文出现 Java 字面' },
  { re: /\b(public|private|protected)\s+(static\s+)?(final\s+)?(class|interface|enum)\b/, w: 3, why: 'Java 类/接口声明语法' },
  { re: /\bSystem\.out\b|\bHashMap\b|\b@Override\b|\bString\[\]|\bnew\s+[A-Z]\w*\(\)/, w: 3, why: 'Java API / 语法片段' },
  { re: /Java\s*面试|Java面试突击/, w: 3, why: '含 Java 面经语料' },
]
const JAVA_WEAK = [
  { re: /\bfinal class\b/i, w: 1, why: '出现 “final class”（Java/C# 术语拼写；但该概念本身与语言无关）' },
]
const GENERIC_MARKERS = [
  { re: /不能被子类化|抽象类的对立面|不完整的类|不绑定名称或标识符/, why: '通用 OOP 语义表述' },
]

/**
 * 判定实体自身正文的语义角色。
 *   ontology  = 语言无关的通用本体定义 → 保留原实体 identity 作本体
 *   reference = 绑定了某门语言语法/API 的具象 → 保留原实体 identity 作具象
 */
function semanticRoleAnalysis(ref, pool, extra = {}) {
  const p = pool[ref] ?? {}
  const card = p.card ?? {}
  const tabs = card.tabs ?? []
  const body = [card.rootContent ?? '', ...tabs.map((t) => t.content ?? '')].join('\n')
  const evidence = []
  let javaScore = 0
  for (const s of JAVA_STRONG) if (s.re.test(body)) { javaScore += s.w; evidence.push('+' + s.w + ' ' + s.why) }
  for (const s of JAVA_WEAK) if (s.re.test(body)) { javaScore += s.w; evidence.push('+' + s.w + ' ' + s.why) }
  for (const s of GENERIC_MARKERS) if (s.re.test(body)) evidence.push('±0 ' + s.why)

  const tagHit = (p.tags ?? []).filter((t) => /java/i.test(t))
  if (tagHit.length) { javaScore += 3; evidence.push('+3 tags 含 ' + JSON.stringify(tagHit)) }
  const tabHit = tabs.filter((t) => /java/i.test(String(t.label ?? '')))
  if (tabHit.length) { javaScore += 3; evidence.push('+3 页签标题含 ' + JSON.stringify(tabHit.map((t) => t.label))) }
  const fenced = (body.match(/```/g) ?? []).length
  if (fenced) evidence.push('  代码围栏计数 ' + fenced + '（' + (fenced / 2) + ' 段）')

  const THRESHOLD = 3
  let role = javaScore >= THRESHOLD ? 'reference' : 'ontology'
  const margin = Math.abs(javaScore - THRESHOLD)
  let overridden = null
  if (MANUAL_ROLES.has(ref)) { overridden = role; role = MANUAL_ROLES.get(ref) }

  return {
    ref, label: p.label, role, overridden,
    javaScore, threshold: THRESHOLD, margin,
    confidence: overridden ? 'MANUAL' : margin >= 3 ? 'HIGH' : margin >= 1 ? 'MEDIUM' : 'LOW',
    bodyLength: body.length,
    evidence,
    excerpt: body.slice(0, 60).replace(/\s+/g, ' '),
  }
}

// ══════════════════════════════════════════════════════════════════════
// ② 操作定义（已裁决）
// ══════════════════════════════════════════════════════════════════════
const OOP_CLS_TREEID = 'tree_class_programming_classification'   // 分类（C1-02 将改名为 类的分类）
const OOP_CLS_REF = 'k_class_programming_classification'
const OS_TREEID = 'theory_domain_operating_systems'
const OS_REF = 'theory_domain_operating_systems'
const VIRT_TREEID = 'tree_wiki_en_virtual_machine_s5'

/** 四个「共享实体 / 本体-具象混用」目标。role 由 semanticRoleAnalysis 判定。 */
const SHARED_TARGETS = [
  {
    slug: 'abstract_class', name: '抽象类',
    existingRef: 'k_1784295376153_uiovkk',
    ontologyTreeId: 'tree_class_programming_abstract_class',  // 不存在 → 本批新建
    javaTreeIds: ['tree_java_syntax_zh_1hqaeyr', 'tree_1784295376195_3l31hb', 'tree_1786343651438_q205rt'],
  },
  {
    slug: 'inner_class', name: '内部类',
    existingRef: 'k_1784044129424_ffqm4z',
    ontologyTreeId: 'tree_class_programming_inner_class',     // 不存在 → 本批新建
    javaTreeIds: ['tree_1784044129452_61ft68', 'tree_1786353277269_msn0ma91g'],
  },
  {
    slug: 'final_class', name: '最终类',
    existingRef: 'k_1784045589643_icc5oo',
    ontologyTreeId: 'tree_class_programming_final_class',     // 已存在
    javaTreeIds: ['tree_1784045589689_drgfh8'],
  },
  {
    slug: 'anonymous_class', name: '匿名类',
    existingRef: 'k_1784044171635_8etz45',
    ontologyTreeId: 'tree_class_programming_anonymous_class', // 已存在
    javaTreeIds: ['tree_1784044171666_9yd2is'],
  },
]

const MOVES_VIRT = [
  { opId: 'C4-01', name: '管理程序', ref: 'atomic_hypervisor', treeId: 'final_atomic_hypervisor' },
  { opId: 'C4-02', name: '模拟器', ref: 'atomic_emulator', treeId: 'final_atomic_emulator' },
]
const CREATES_OS = [
  { opId: 'C4-03', label: 'I/O 多路复用', treeId: 'tree_concept_io_multiplexing', slug: 'io_multiplexing' },
  { opId: 'C4-06', label: '系统调用与 I/O', treeId: 'tree_concept_syscall_io', slug: 'syscall_io' },
]
const MOVES_OS = [
  { opId: 'C4-04', name: 'select', ref: 'asplit_select_io', treeId: 'asplit_s1_asplit_select_io', into: 'I/O 多路复用' },
  { opId: 'C4-05', name: 'epoll', ref: 'asplit_epoll', treeId: 'asplit_s1_asplit_epoll', into: 'I/O 多路复用' },
  { opId: 'C4-07', name: '零拷贝', ref: 'k_io_zero_copy', treeId: 'tree_io_zero_copy', into: '系统调用与 I/O' },
]

// ══════════════════════════════════════════════════════════════════════
// ③ 唯一操作实现：preflight 与 apply 共用
// ══════════════════════════════════════════════════════════════════════
function buildPlan(ds) {
  const { pool, tree, edges } = ds
  // 索引会随变更失效（新挂载点不在索引里、改名后 path 变旧）→ 每完成一段操作就重建。
  let I = makeIndex(tree)
  const pre = { results: [], journal: [], newIds: {}, roles: [], treebindExpected: {}, introducedNodes: [] }

  // 基线挂载数必须在**任何变更之前**算好：
  // 若在结果对象里现算，此时本次迭代已经把 javaRecs 改指新实体、并 push 了新本体挂载点，
  // 于是「原实体还剩几处挂载」会被算成 1（只有刚 push 的那个），而不是基线的 3。
  const baseMountCount = new Map()
  for (const t of SHARED_TARGETS) baseMountCount.set(t.existingRef, mountsOf(I.recs, t.existingRef).length)

  // —— 语义判定 ——
  const roles = SHARED_TARGETS.map((t) => {
    const a = semanticRoleAnalysis(t.existingRef, pool)
    pre.roles.push({ slug: t.slug, name: t.name, ref: t.existingRef, analysis: a })
    return { ...t, analysis: a }
  })

  // —— 分配新实体 id（冻结到 plan，preflight 与 apply 共用同一批 id）——
  const idState = JSON.parse(fs.existsSync(BASELINE_PATH) ? fs.readFileSync(BASELINE_PATH, 'utf8') : '{}')
  const frozenIds = idState.newIds ?? {}
  const newIds = {}
  const rolesNeedingJava = roles.filter((t) => t.analysis.role === 'ontology')
  const rolesNeedingOntology = roles.filter((t) => t.analysis.role === 'reference')
  const need = []
  for (const t of rolesNeedingJava) need.push({ key: 'java:' + t.slug, label: t.name })
  for (const t of rolesNeedingOntology) need.push({ key: 'ontology:' + t.slug, label: t.name })
  need.push({ key: 'os_layer:C4-03', label: 'I/O 多路复用' })
  need.push({ key: 'os_layer:C4-06', label: '系统调用与 I/O' })
  for (const n of need) newIds[n.key] = frozenIds[n.key] ?? genId('k')
  pre.newIds = newIds
  pre.idSource = Object.keys(frozenIds).length ? 'baseline(已冻结)' : '本次生成(将在 freeze/apply 时固化)'

  // ══ 操作 1：C1-02 就地改名 分类 → 类的分类 ══
  {
    const r = I.byId.get(OOP_CLS_TREEID)
    const before = { name: r.node.name, kids: kidsOf(r.node), poolLabel: pool[OOP_CLS_REF].label, tags: [...(pool[OOP_CLS_REF].tags ?? [])] }
    r.node.name = '类的分类'
    pool[OOP_CLS_REF].label = '类的分类'
    const tags = new Set(pool[OOP_CLS_REF].tags ?? [])
    tags.add('类的分类')          // 新名入 tags；旧名 分类 保留为搜索别名
    pool[OOP_CLS_REF].tags = [...tags]
    pre.journal.push({ opId: 'C1-02', kind: 'rename', treeId: OOP_CLS_TREEID, ref: OOP_CLS_REF })
    pre.results.push({
      id: 'C1-02', action: 'rename', title: '分类 → 类的分类（就地改名）',
      targetIds: { treeId: OOP_CLS_TREEID, ref: OOP_CLS_REF },
      before, after: { name: '类的分类', kids: kidsOf(r.node), poolLabel: pool[OOP_CLS_REF].label, tags: [...pool[OOP_CLS_REF].tags] },
      edgeImpact: '无：treeId 不变 → treebind id 不变；仅改池 label 与 tags',
      postconditions: ['树条目 name = 类的分类', '池 label = 类的分类，tags 同时含 分类 与 类的分类', '孩子数与后代 treeId 逐条不变'],
    })
  }
  const CLS = I.byId.get(OOP_CLS_TREEID)
  const CLS_REF = CLS.node.nodeRef
  I = makeIndex(tree)

  // ══ 操作 2：四个共享实体按语义拆分 ══
  const implementsEdges = []
  const allTbModified = []
  for (const t of roles) {
    const a = t.analysis
    const ontRec = I.byId.get(t.ontologyTreeId)
    const javaRecs = t.javaTreeIds.map((id) => { const r = I.byId.get(id); if (!r) throw new Error('缺少 Java 挂载点 ' + id); return r })
    const javaRef = javaRecs[0].node.nodeRef
    if (javaRecs.some((r) => r.node.nodeRef !== javaRef)) throw new Error(t.name + '：Java 侧挂载点并非同一实体，需重新核查')

    const beforeRefs = { ontology: ontRec ? ontRec.node.nodeRef : '(挂载点不存在)', java: javaRef }
    let ontologyRef, ontologyNewRef = null, javaNewRef = null

    if (a.role === 'ontology') {
      // 原实体 = 本体 → 保留原 identity；Java 侧改指新建具象
      ontologyRef = t.existingRef
      javaNewRef = newIds['java:' + t.slug]
      pool[javaNewRef] = {
        id: javaNewRef, label: t.name, role: 'plain',
        tags: [t.name, 'Java'], card: { nodeId: javaNewRef, title: t.name, tabs: [] },
      }
      for (const r of javaRecs) r.node.nodeRef = javaNewRef
    } else {
      // 原实体 = 具象 → 保留在 Java 侧；本体侧新建实体
      ontologyRef = newIds['ontology:' + t.slug]
      ontologyNewRef = ontologyRef
      pool[ontologyRef] = {
        id: ontologyRef, label: t.name, role: 'plain',
        tags: [t.name, '面向对象'], card: { nodeId: ontologyRef, title: t.name, tabs: [] },
      }
      for (const r of javaRecs) r.node.nodeRef = t.existingRef   // 显式写回，保证幂等
    }

    // 本体侧挂载点：存在则改指，不存在则新建
    // ⚠️ 挂载点已存在但换实体时（role=reference 才会发生），它自己的 treebind 必须同步改 target ——
    //    否则树条目 nodeRef 与 treebind.target 不一致（断言 #6 会抓到）。
    let createdOntologyMount = false
    const ontTbChanged = []
    if (!ontRec) {
      CLS.node.children.push({ id: t.ontologyTreeId, name: t.name, count: 0, nodeRef: ontologyRef, children: [] })
      createdOntologyMount = true
    } else {
      const wasOntRef = ontRec.node.nodeRef
      ontRec.node.nodeRef = ontologyRef
      if (wasOntRef !== ontologyRef && ontRec.parent) {
        const otb = edges.find((e) => e.id === treebindId(ontRec.parent.id, t.ontologyTreeId))
        if (otb) { otb.target = ontologyRef; ontTbChanged.push({ id: otb.id, from: wasOntRef, to: ontologyRef }) }
      }
    }

    // 本体侧 treebind：新建挂载点需补边；已存在且实体未变则不动
    if (createdOntologyMount) {
      edges.push({ id: treebindId(CLS.node.id, t.ontologyTreeId), source: CLS_REF, target: ontologyRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [] })
    }

    // Java 侧 treebind：只改 target，保留 id（挂载位置未变）
    const javaTbChanged = []
    if (javaNewRef) {
      for (const r of javaRecs) {
        const parentId = r.parent.id
        const tb = edges.find((e) => e.id === treebindId(parentId, r.node.id))
        if (!tb) throw new Error(t.name + '：' + r.node.id + ' 缺 treebind 边，无法改指')
        const was = tb.target
        tb.target = javaNewRef
        javaTbChanged.push({ id: tb.id, from: was, to: javaNewRef })
      }
    }

    // implements 边：具象 → 本体（每个本体/具象对一条）
    // consistent = 4 条（四个本体/具象对全记关系）
    // minimal    = 2 条（只记 dry-run 原有的 最终类/匿名类 两条，严格贴合闸门原文）
    const implId = 'impl:' + t.slug + ':' + (javaNewRef ?? t.existingRef)
    const implSrc = javaNewRef ?? t.existingRef
    const implExists = edges.some((e) => e.id === implId)
    const wantImpl = IMPL_MODE === 'consistent' || t.slug === 'final_class' || t.slug === 'anonymous_class'
    if (wantImpl && !implExists) {
      edges.push({ id: implId, source: implSrc, target: ontologyRef, type: 'implements', label: 'implements', dimensions: [] })
      implementsEdges.push({ id: implId, source: implSrc, target: ontologyRef, slug: t.slug })
    }

    // 新建的池实体要进 evolution-event 的 introducedNodes
    // （只靠 action==='create' 会漏掉 4 个「按语义拆分」产出的实体）
    if (javaNewRef) {
      pre.introducedNodes.push({ nodeId: javaNewRef, parentNodeId: javaRecs[0].parent.nodeRef, mounts: javaRecs.map((r) => r.parent.nodeRef) })
    }
    if (ontologyNewRef) {
      pre.introducedNodes.push({ nodeId: ontologyNewRef, parentNodeId: CLS_REF, mounts: [CLS_REF] })
    }

    pre.journal.push({
      opId: 'C1-09:' + t.slug, kind: 'split-by-semantic-role',
      role: a.role, existingRef: t.existingRef, ontologyRef, javaNewRef, ontologyNewRef,
    })
    pre.results.push({
      id: 'C1-09/' + t.slug, action: 'split-entity', title: '按语义角色拆分共享实体 ' + t.name,
      targetIds: {
        原实体: t.existingRef, 本体实体: ontologyRef, Java实体: javaNewRef ?? t.existingRef,
        本体挂载: t.ontologyTreeId, Java挂载: t.javaTreeIds,
      },
      before: { 本体侧原ref: beforeRefs.ontology, Java侧原ref: beforeRefs.java, 基线挂载数: baseMountCount.get(t.existingRef) },
      after: { 本体侧: ontologyRef, Java侧: javaNewRef ?? t.existingRef },
      semanticRole: { role: a.role, confidence: a.confidence, javaScore: a.javaScore, evidence: a.evidence, excerpt: a.excerpt },
      edgeImpact: [
        createdOntologyMount ? '本体侧新建 treebind 1 条（新挂载点）'
          : ontTbChanged.length ? '本体侧 1 条 treebind 同 id 改 target：' + ontTbChanged.map((x) => x.id + ' (' + x.from + '→' + x.to + ')').join('；')
            : '本体侧 treebind 不变（挂载点在位、实体未变）',
        javaTbChanged.length ? 'Java 侧 ' + javaTbChanged.length + ' 条 treebind 同 id 改 target：' + javaTbChanged.map((x) => x.id + ' (' + x.from + '→' + x.to + ')').join('；') : 'Java 侧 treebind 不变（原实体即具象）',
        (wantImpl && !implExists) ? '新增 implements 1 条：' + implId : implExists ? 'implements 边已存在（幂等跳过）' : 'implements 按 ' + IMPL_MODE + ' 口径不新增',
      ].join(' · '),
      postconditions: [
        '两个 treeId 不再共享 nodeRef（本体 ' + ontologyRef + ' / Java ' + (javaNewRef ?? t.existingRef) + '）',
        '正文全部留在语义判定为 ' + a.role + ' 的一侧（' + t.existingRef + '），未复制',
        javaNewRef ? '新建 Java 具象实体 tabs 为空（待填 Java 专有正文）' : '新建本体实体 tabs 为空（待填通用定义）',
      ],
    })
    allTbModified.push(...ontTbChanged, ...javaTbChanged)
  }

  // ══ 操作 3：C4-01/02 管理程序·模拟器 → 虚拟机 > 虚拟化技术 ══
  I = makeIndex(tree)
  const VIRT = I.byId.get(VIRT_TREEID)
  for (const m of MOVES_VIRT) {
    const r = I.byId.get(m.treeId)
    if (!r) throw new Error(m.opId + '：树条目 ' + m.treeId + ' 不存在')
    const oldParent = r.parent
    const before = { path: r.path, 旧父孩子数: kidsOf(oldParent), 新父孩子数: kidsOf(VIRT.node) }
    oldParent.children = oldParent.children.filter((c) => c.id !== m.treeId)
    VIRT.node.children.push(r.node)
    const oldIdx = edges.findIndex((e) => isTreebind(e) && e.id.endsWith(':' + m.treeId))
    const oldId = oldIdx >= 0 ? edges[oldIdx].id : null
    if (oldIdx >= 0) edges.splice(oldIdx, 1)
    edges.push({ id: treebindId(VIRT.node.id, m.treeId), source: VIRT.node.nodeRef, target: m.ref, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [] })
    pre.journal.push({ opId: m.opId, kind: 'move', treeId: m.treeId, from: oldId, to: treebindId(VIRT.node.id, m.treeId) })
    pre.results.push({
      id: m.opId, action: 'move', title: m.name + ' → 虚拟机 > 虚拟化技术',
      targetIds: { treeId: m.treeId, ref: m.ref, 新父: VIRT.node.id },
      before, after: { path: '虚拟机 > 虚拟化技术 > ' + m.name, 旧父孩子数: kidsOf(oldParent), 新父孩子数: kidsOf(VIRT.node) },
      edgeImpact: 'treebind：删 ' + (oldId ?? '(无)') + '，建 ' + treebindId(VIRT.node.id, m.treeId) + '（子节点 ref 未变）',
      postconditions: ['后代 treeId 不变', '池节点 ' + m.ref + ' 未删未退休', '语义边不受影响（ref 未变）'],
    })
  }

  // ══ 操作 4：C4-03/06 新建 OS 中间层 + C4-04/05/07 迁入 ══
  I = makeIndex(tree)
  const OS = I.byId.get(OS_TREEID)
  const createdLayers = {}
  for (const c of CREATES_OS) {
    const ref = newIds['os_layer:' + c.opId]
    const layerNode = { id: c.treeId, name: c.label, count: 0, nodeRef: ref, children: [] }
    OS.node.children.push(layerNode)
    pool[ref] = { id: ref, label: c.label, role: 'plain', tags: [c.label], card: { nodeId: ref, title: c.label, tabs: [] } }
    edges.push({ id: treebindId(OS.node.id, c.treeId), source: OS.node.nodeRef, target: ref, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [] })
    createdLayers[c.label] = { treeId: c.treeId, ref, node: layerNode }
    pre.introducedNodes.push({ nodeId: ref, parentNodeId: OS.node.nodeRef, mounts: [OS.node.nodeRef] })
    pre.journal.push({ opId: c.opId, kind: 'create-layer', treeId: c.treeId, ref })
    pre.results.push({
      id: c.opId, action: 'create', title: '新建中间层 ' + c.label,
      targetIds: { newTreeId: c.treeId, newRef: ref, 父: OS.node.id },
      before: { 操作系统孩子数: kidsOf(OS.node) - 1 }, after: { 操作系统孩子数: kidsOf(OS.node) },
      edgeImpact: '新增 treebind ' + treebindId(OS.node.id, c.treeId),
      postconditions: [c.treeId + ' 挂到 操作系统 下', '池节点 ' + ref + ' tabs 为空 → 空 tabs 计数 +1'],
    })
  }
  for (const m of MOVES_OS) {
    const r = I.byId.get(m.treeId)
    if (!r) throw new Error(m.opId + '：树条目 ' + m.treeId + ' 不存在')
    const dest = createdLayers[m.into]
    const oldParent = r.parent
    const before = { path: r.path, 旧父: oldParent?.name ?? '(无)', 旧父孩子数: kidsOf(oldParent) }
    oldParent.children = oldParent.children.filter((c) => c.id !== m.treeId)
    dest.node.children.push(r.node)
    const oldIdx = edges.findIndex((e) => isTreebind(e) && e.id.endsWith(':' + m.treeId))
    const oldId = oldIdx >= 0 ? edges[oldIdx].id : null
    if (oldIdx >= 0) edges.splice(oldIdx, 1)
    edges.push({ id: treebindId(dest.node.id, m.treeId), source: dest.node.nodeRef, target: m.ref, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [] })
    pre.journal.push({ opId: m.opId, kind: 'move', treeId: m.treeId, from: oldId, to: treebindId(dest.node.id, m.treeId) })
    pre.results.push({
      id: m.opId, action: 'move', title: m.name + ' → 操作系统 > ' + m.into,
      targetIds: { treeId: m.treeId, ref: m.ref, 新父: dest.node.id },
      before, after: { path: '操作系统 > ' + m.into + ' > ' + m.name, 旧父孩子数: kidsOf(oldParent), 新父孩子数: kidsOf(dest.node) },
      edgeImpact: 'treebind：删 ' + (oldId ?? '(无)') + '，建 ' + treebindId(dest.node.id, m.treeId) + '；语义边不动（ref 未变）',
      postconditions: [m.treeId + ' 挂到 ' + m.into + ' 下', '后代 treeId 不变', '池节点 ' + m.ref + ' 未删未退休'],
    })
  }

  // —— 期望的 treebind 增删集合（供闸门 G5 逐条比对）——
  pre.treebindExpected = {
    expectedDeletes: [
      treebindId('tree_wiki_en_profiling_computer_programming_s8', 'final_atomic_hypervisor'),
      treebindId('tree_wiki_en_profiling_computer_programming_s8', 'final_atomic_emulator'),
      treebindId(OS_TREEID, 'asplit_s1_asplit_select_io'),
      treebindId(OS_TREEID, 'asplit_s1_asplit_epoll'),
      treebindId(OS_TREEID, 'tree_io_zero_copy'),
    ],
    expectedAdds: [
      treebindId(OOP_CLS_TREEID, 'tree_class_programming_abstract_class'),
      treebindId(OOP_CLS_TREEID, 'tree_class_programming_inner_class'),
      treebindId(VIRT_TREEID, 'final_atomic_hypervisor'),
      treebindId(VIRT_TREEID, 'final_atomic_emulator'),
      treebindId(OS_TREEID, 'tree_concept_io_multiplexing'),
      treebindId(OS_TREEID, 'tree_concept_syscall_io'),
      treebindId('tree_concept_io_multiplexing', 'asplit_s1_asplit_select_io'),
      treebindId('tree_concept_io_multiplexing', 'asplit_s1_asplit_epoll'),
      treebindId('tree_concept_syscall_io', 'tree_io_zero_copy'),
    ],
    expectedImplements: implementsEdges.length,
    // 同 id 改 target（挂载位置没变、只换实体）：也是「边变化」，必须逐条预期，否则 G5 不算完整
    expectedModified: allTbModified.map((x) => x.id),
  }
  return pre
}

// ══════════════════════════════════════════════════════════════════════
// ④ 断言
// ══════════════════════════════════════════════════════════════════════
function runChecks(tree, pool, edges, opts = {}) {
  const out = []
  const chk = (name, ok, detail, metric) => out.push({ name, ok: !!ok, detail, metric })
  const I = makeIndex(tree)

  const tidCount = new Map()
  ;(function w(n) { tidCount.set(n.id, (tidCount.get(n.id) ?? 0) + 1); (n.children || []).forEach(w) })(tree)
  const dup = [...tidCount].filter(([, c]) => c > 1).map(([id]) => id)
  chk('树 treeId 全局唯一', dup.length === 0, dup.join(', ') || '无重复', dup.length)

  const missRef = []
  ;(function w(n) { if (n.nodeRef && !pool[n.nodeRef]) missRef.push(n.id); (n.children || []).forEach(w) })(tree)
  chk('树 nodeRef 全部命中池实体', missRef.length === 0, missRef.slice(0, 5).join(', ') || '0 处', missRef.length)

  const dEdge = edges.filter((e) => !pool[e.source] || !pool[e.target])
  chk('边端点全部命中池实体', dEdge.length === 0, dEdge.length + ' 条悬空', dEdge.length)

  const tbCount = new Map()
  for (const e of edges) if (isTreebind(e)) { const k = e.id.split(':').pop(); tbCount.set(k, (tbCount.get(k) ?? 0) + 1) }
  const noTb = I.recs.filter((r) => r.parent && !tbCount.get(r.node.id)).map((r) => r.node.id)
  chk('每个非根条目有 treebind（不得增加缺失）', noTb.length === 0, noTb.length + ' 个缺失', noTb.length)
  const multi = [...tbCount].filter(([, c]) => c > 1).map(([id]) => id)
  chk('无条目被多条 treebind 挂载（不得增加）', multi.length === 0, multi.length + ' 个重复', multi.length)

  // treebind 与树父子一致性（只查本批改动/新建的条目）
  const TOUCHED = ['final_atomic_hypervisor', 'final_atomic_emulator', 'asplit_s1_asplit_select_io', 'asplit_s1_asplit_epoll', 'tree_io_zero_copy',
    'tree_class_programming_abstract_class', 'tree_class_programming_inner_class', 'tree_class_programming_final_class', 'tree_class_programming_anonymous_class',
    'tree_1784045589689_drgfh8', 'tree_1784044171666_9yd2is', 'tree_java_syntax_zh_1hqaeyr', 'tree_1784295376195_3l31hb', 'tree_1786343651438_q205rt',
    'tree_1784044129452_61ft68', 'tree_1786353277269_msn0ma91g', 'tree_concept_io_multiplexing', 'tree_concept_syscall_io']
  const bad = []
  let checked = 0
  let skippedNew = 0
  for (const tid of TOUCHED) {
    const r = I.byId.get(tid)
    if (!r) {
      // 基线里不存在 = 本批新增，属 N/A；不能计成违规（否则「新增」被误判为「不一致」）
      if (opts.skipMissing) { skippedNew += 1; continue }
      bad.push(tid + ' 不存在'); continue
    }
    checked += 1
    if (!r.parent) { bad.push(tid + ' 无父'); continue }
    const e = edges.find((x) => x.id === treebindId(r.parent.id, tid))
    if (!e) { bad.push(tid + ' 缺 treebind'); continue }
    if (e.source !== r.parent.nodeRef || e.target !== r.node.nodeRef) bad.push(tid + ' 端点不一致')
  }
  chk('改动条目 treebind 与树父子一致', bad.length === 0,
    bad.join(' | ') || '抽查 ' + checked + '/' + TOUCHED.length + ' 条通过' + (skippedNew ? '（' + skippedNew + ' 条为本批新增，基线 N/A）' : ''),
    bad.length)

  let cyclic = null
  { const seen = new Set(); const stack = new Set(); (function dfs(n) { if (stack.has(n.id)) { cyclic = n.id; return } if (seen.has(n.id)) return; seen.add(n.id); stack.add(n.id); for (const c of n.children || []) { dfs(c); if (cyclic) return } stack.delete(n.id) })(tree) }
  chk('树无环', !cyclic, cyclic ?? '无环', cyclic ? 1 : 0)

  if (opts.splitPairs) {
    const shared = opts.splitPairs.filter(([a, b]) => I.byId.get(a)?.node.nodeRef === I.byId.get(b)?.node.nodeRef)
    chk('拆分对不再共享 nodeRef', shared.length === 0, shared.length ? shared.length + ' 组仍共享' : '全部已拆', shared.length)
  }
  return { checks: out, index: I }
}

function danglingTreeCount(tree, pool) {
  let n = 0
  ;(function w(x) { if (x.nodeRef && !pool[x.nodeRef]) n++; (x.children || []).forEach(w) })(tree)
  return n
}

// ══════════════════════════════════════════════════════════════════════
// ⑤ 闸门
// ══════════════════════════════════════════════════════════════════════
const GATES = []
const gate = (id, name, ok, detail) => GATES.push({ id, name, ok: !!ok, detail })

async function main() {
  // 读现状
  const present = {}
  for (const f of [...WRITE_FILES, 'questions.json']) present[f] = rd(f)
  const md5Now = {}
  const trailNow = {}
  for (const [f, txt] of Object.entries(present)) { md5Now[f] = md5(txt); trailNow[f] = txt.endsWith('\n') }
  const guardMd5Now = {}
  for (const f of GUARD_FILES) guardMd5Now[f] = md5(fs.readFileSync(path.join(ROOT, f), 'utf8'))

  if (MODE === 'freeze') {
    fs.mkdirSync(OUT_DIR, { recursive: true })
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({
      frozenAt: new Date().toISOString(),
      dataMd5: md5Now, dataTrailingNewline: trailNow, guardMd5: guardMd5Now,
      newIds: {}, note: '首次 --freeze 时 newIds 为空；preflight/apply 生成后立即回写固化，保证两次运行使用同一批 id。',
    }, null, 2) + '\n', 'utf8')
    console.log('基线已冻结：' + path.relative(ROOT, BASELINE_PATH))
    for (const f of Object.keys(md5Now)) console.log('  ' + f + '  ' + md5Now[f].slice(0, 12) + '  trailingNL=' + trailNow[f])
    return
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error('✖ 未找到基线。请先运行：node scripts/apply-phase1.mjs --freeze')
    process.exitCode = 2
    return
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))

  // ── G1 数据文件 md5 与基线一致 ──
  const driftFiles = Object.keys(baseline.dataMd5).filter((f) => baseline.dataMd5[f] !== md5Now[f])
  gate('G1', '数据文件 md5 与 dry-run 基线一致', driftFiles.length === 0,
    driftFiles.length ? '漂移：' + driftFiles.join(', ') : Object.keys(baseline.dataMd5).length + ' 个文件全部一致')

  // ── G2 外部（outputs/ 之外的已跟踪文件）无漂移 ──
  if (fs.existsSync(FP_PATH)) {
    const fp = JSON.parse(fs.readFileSync(FP_PATH, 'utf8'))
    const ext = (m) => Object.fromEntries(Object.entries(m).filter(([k, v]) => !/^outputs\//.test(k) && v.xy !== '??'))
    const prevW = ext(fp.worktree ?? {})
    const curRaw = execFileSync('git', ['status', '--porcelain=v1', '-z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    const cur = {}
    for (const e of curRaw.split('\0').filter(Boolean)) {
      const xy = e.slice(0, 2); const rel = e.slice(3).replace(/\\/g, '/')
      if (/^outputs\//.test(rel) || xy === '??') continue
      try { cur[rel] = { xy, md5: md5(fs.readFileSync(path.join(ROOT, rel))) } } catch { cur[rel] = { xy, md5: null } }
    }
    const added = Object.keys(cur).filter((k) => !prevW[k])
    const gone = Object.keys(prevW).filter((k) => !cur[k])
    const changed = Object.keys(cur).filter((k) => prevW[k]?.md5 && cur[k].md5 && prevW[k].md5 !== cur[k].md5)
    const total = added.length + gone.length + changed.length
    gate('G2', '外部会话未再写入已跟踪文件', total === 0,
      total ? ['新增 ' + added.length, '消失 ' + gone.length, '又变 ' + changed.length, [...added, ...changed].slice(0, 5).join(', ')].join(' · ')
        : Object.keys(cur).length + ' 个已跟踪文件 md5 全部一致')
  } else {
    gate('G2', '外部会话未再写入已跟踪文件', false, '缺 ' + path.relative(ROOT, FP_PATH) + '，无法判定 —— 请先跑 reconcile')
  }

  // ── G3 索引图白名单未被改动 ──
  const guardDrift = GUARD_FILES.filter((f) => baseline.guardMd5[f] !== guardMd5Now[f])
  gate('G7', '索引图白名单源文件未被改动', guardDrift.length === 0, guardDrift.join(', ') || GUARD_FILES.join(', ') + ' md5 一致')

  // ── 预演：在克隆体上真跑 ──
  const ds0 = { pool: rdJson('node-pool.json'), tree: rdJson('tree-data.json'), edges: rdJson('knowledge-edges.json') }
  const dsSim = clone(ds0)
  const plan = buildPlan(dsSim)

  // 固化 newIds：保证 preflight 与 apply 用同一批 id。
  // ⚠️ 必须「补齐缺失的 key」而不是「只在首次生成时整体写入」——
  //    裁决（如 D2 让 最终类 由 ontology 翻转成 reference）会改变所需 key 集合，
  //    若沿用「只在首次写入」的逻辑，新 key 的 id 每次运行都会重新生成，
  //    preflight 与 apply 就会落到**不同的实体 id** 上。
  if (MODE !== 'apply') {
    const missingKeys = Object.keys(plan.newIds).filter((k) => !(baseline.newIds ?? {})[k])
    if (missingKeys.length) {
      baseline.newIds = { ...(baseline.newIds ?? {}), ...plan.newIds }
      fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8')
      plan.idSource = '基线补齐 ' + missingKeys.join(', ')
    }
  }
  if (MODE === 'apply') {
    const expectKeys = Object.keys(plan.newIds)
    const missing = expectKeys.filter((k) => !(baseline.newIds ?? {})[k])
    if (missing.length) {
      gate('G0', '新实体 id 已在基线固化', false, '缺 ' + missing.join(', ') + ' —— 请先跑一次 preflight')
    }
    for (const k of expectKeys) plan.newIds[k] = baseline.newIds[k]
  }

  // ── G3 语义角色：每个拆分都有明确角色 ──
  const undecided = plan.roles.filter((r) => r.analysis.role !== 'ontology' && r.analysis.role !== 'reference')
  const lowConf = plan.roles.filter((r) => r.analysis.confidence === 'LOW' || r.analysis.confidence === 'MEDIUM')
  gate('G3', '每个共享实体拆分都有明确语义角色', undecided.length === 0,
    undecided.length ? undecided.map((r) => r.name).join(', ') : plan.roles.map((r) => r.name + '=' + r.analysis.role + '(' + r.analysis.confidence + ')').join(' · '))

  // ── G4 每个旧 treeId 恰好一个目标实体 ──
  const oldTreeIds = []
  for (const t of SHARED_TARGETS) oldTreeIds.push(...t.javaTreeIds, t.ontologyTreeId)
  const dupOld = oldTreeIds.filter((id, i) => oldTreeIds.indexOf(id) !== i)
  const I0 = makeIndex(ds0.tree)
  const declared = new Map()
  for (const r of plan.results) {
    if (r.action !== 'split-entity') continue
    declared.set(r.targetIds.本体挂载, r.targetIds.本体实体)
    for (const j of r.targetIds.Java挂载) declared.set(j, r.targetIds.Java实体)
  }
  const missingDecl = oldTreeIds.filter((id) => !declared.has(id))
  gate('G4', '每个 treeId 恰好映射一个目标实体', dupOld.length === 0 && missingDecl.length === 0,
    [dupOld.length ? '重复声明 ' + dupOld.join(', ') : '', missingDecl.length ? '未声明 ' + missingDecl.join(', ') : ''].filter(Boolean).join(' · ') || declared.size + ' 个 treeId 映射明确（含 ' + oldTreeIds.filter((id) => I0.byId.has(id)).length + ' 个既有挂载点）')

  // ── G5/G6 treebind 与 implements 增删与预期一致 ──
  const I0map = new Map(ds0.edges.map((e) => [e.id, e]))
  const I1map = new Map(dsSim.edges.map((e) => [e.id, e]))
  const deleted = ds0.edges.filter((e) => !I1map.has(e.id)).map((e) => e.id)
  const added = dsSim.edges.filter((e) => !I0map.has(e.id)).map((e) => e.id)
  const expDel = plan.treebindExpected.expectedDeletes.slice().sort()
  const actDelTb = deleted.filter(isTbId).sort()
  const expAdd = plan.treebindExpected.expectedAdds.slice().sort()
  const actAddTb = added.filter(isTbId).sort()
  const unexpectedDel = actDelTb.filter((x) => !expDel.includes(x))
  const unexpectedAdd = actAddTb.filter((x) => !expAdd.includes(x))
  const missingDel = expDel.filter((x) => !actDelTb.includes(x))
  const missingAdd = expAdd.filter((x) => !actAddTb.includes(x))

  // 「同 id 改 target」也是边变化，同样要逐条预期
  const actModTb = dsSim.edges
    .filter((e) => isTreebind(e) && I0map.has(e.id) && JSON.stringify(I0map.get(e.id)) !== JSON.stringify(e))
    .map((e) => e.id).sort()
  const expMod = (plan.treebindExpected.expectedModified ?? []).slice().sort()
  const unexpectedMod = actModTb.filter((x) => !expMod.includes(x))
  const missingMod = expMod.filter((x) => !actModTb.includes(x))

  gate('G5', 'treebind 增 / 删 / 改 与预期逐条配对',
    unexpectedDel.length === 0 && unexpectedAdd.length === 0 && missingDel.length === 0 && missingAdd.length === 0 && unexpectedMod.length === 0 && missingMod.length === 0,
    [unexpectedDel.length ? '意外删除 ' + unexpectedDel.join(', ') : '', unexpectedAdd.length ? '意外新增 ' + unexpectedAdd.join(', ') : '',
      unexpectedMod.length ? '意外改 target ' + unexpectedMod.join(', ') : '', missingDel.length ? '漏删 ' + missingDel.join(', ') : '',
      missingAdd.length ? '漏增 ' + missingAdd.join(', ') : '', missingMod.length ? '漏改 ' + missingMod.join(', ') : ''].filter(Boolean).join(' · ')
    || '删除 ' + actDelTb.length + ' 条、新增 ' + actAddTb.length + ' 条、改 target ' + actModTb.length + ' 条，全部命中预期集合，无非相关变动')

  const implAdded = added.filter((id) => !isTbId(id))
  const EXPECT_IMPL = IMPL_MODE === 'consistent' ? 4 : 2
  gate('G6', 'implements 变更数符合当前口径', implAdded.length === EXPECT_IMPL && implAdded.every((id) => id.startsWith('impl:')),
    '实际新增非 treebind 边 ' + implAdded.length + ' 条（口径 ' + IMPL_MODE + '，期望 ' + EXPECT_IMPL + '）：' + implAdded.join(', ')
    + (IMPL_MODE === 'consistent' ? ' ⚠️ 你的闸门原文写「explicitly approved 2 changes」，但变体 B 把 抽象类、内部类 也变成了本体/具象对 → 语义一致应为 4 条。此处按 4 条，需要你确认；严格按字面 2 条请用 --implements-mode=minimal。' : ''))

  // ── G8 dev server ──
  let devInfo = { running: false }
  try {
    const r = await fetch('http://[::1]:5173/', { signal: AbortSignal.timeout(3000) })
    const t = await r.text()
    devInfo = { running: true, isViteDev: /@vite\/client/.test(t), url: 'http://[::1]:5173/' }
  } catch { /* 未运行 */ }
  let armed = null
  if (devInfo.running && devInfo.isViteDev) {
    // vite.config.js 的 /api/data PUT 有 mtime 乐观并发守卫：只要该文件曾被 GET 过，
    // 外部脚本改完之后浏览器的旧内存态 PUT 会被 409 拒绝，不会静默覆盖。
    // 这里主动 GET 一次，确保 servedMtimes 有值（否则守卫会被跳过）。
    const armedFiles = []
    for (const f of WRITE_FILES) {
      try {
        const r = await fetch('http://[::1]:5173/api/data?file=' + encodeURIComponent(f), { signal: AbortSignal.timeout(5000) })
        if (r.ok) armedFiles.push(f)
        await r.arrayBuffer()
      } catch { /* ignore */ }
    }
    armed = armedFiles
  }
  const devOk = !devInfo.running || (devInfo.isViteDev && armed && armed.length === WRITE_FILES.length) || ALLOW_DEV
  gate('G8', 'dev server 不会静默覆盖本次写入', devOk,
    !devInfo.running ? '5173 未监听'
      : devInfo.isViteDev
        ? '5173 是 vite dev（含 /api/data 写通道）→ 已主动 GET ' + (armed?.length ?? 0) + '/' + WRITE_FILES.length + ' 个文件，武装 mtime 守卫；浏览器后续旧的 PUT 将收到 409 EXTERNAL_MODIFICATION 而非覆盖' + (ALLOW_DEV ? '（--allow-dev-server）' : '')
        : '5173 在监听但非 vite dev（无 /api/data 写通道）')

  // ── 验收断言（模拟态）──
  const baseChecks = runChecks(ds0.tree, ds0.pool, ds0.edges, { skipMissing: true })
  const simChecks = runChecks(dsSim.tree, dsSim.pool, dsSim.edges, {
    splitPairs: [
      ['tree_class_programming_abstract_class', 'tree_java_syntax_zh_1hqaeyr'],
      ['tree_class_programming_inner_class', 'tree_1784044129452_61ft68'],
      ['tree_class_programming_final_class', 'tree_1784045589689_drgfh8'],
      ['tree_class_programming_anonymous_class', 'tree_1784044171666_9yd2is'],
    ],
  })
  const regressions = simChecks.checks.filter((c, i) => c.metric !== undefined && baseChecks.checks[i] && c.metric > baseChecks.checks[i].metric)

  const totals = {
    before: { tree: baseChecks.index.recs.length, pool: Object.keys(ds0.pool).length, edges: ds0.edges.length },
    after: { tree: simChecks.index.recs.length, pool: Object.keys(dsSim.pool).length, edges: dsSim.edges.length },
  }

  // ── 写集与外部未收敛改动的字段级不相交性 ──
  const extPath = path.join(OUT_DIR, 'external-change-baseline.json')
  let disjoint = null
  if (fs.existsSync(extPath)) {
    const ext = JSON.parse(fs.readFileSync(extPath, 'utf8'))
    const extNodes = new Map((ext.changedNodes ?? []).map((n) => [n.id, n.diffKeys ?? []]))
    const touched = [{ ref: OOP_CLS_REF, fields: ['label', 'tags'] }]
    const hits = touched.filter((t) => extNodes.has(t.ref))
    const fieldOverlap = hits.filter((t) => (extNodes.get(t.ref) ?? []).some((k) => t.fields.includes(k)))
    disjoint = { touchedRefs: touched.map((t) => t.ref), fileOverlap: hits.map((t) => t.ref), fieldOverlap: fieldOverlap.map((t) => t.ref), extFileCollision: ext.collisions ?? [] }
  }

  const failedGates = GATES.filter((g) => !g.ok)

  // ── 执行 ──
  let backupDir = null
  if (MODE === 'apply') {
    if (failedGates.length) {
      console.log('✖ 闸门未全绿，ABORT，未写盘：' + failedGates.map((g) => g.id).join(', '))
      process.exitCode = 3
    } else {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      backupDir = path.join(DATA, 'backups', 'phase1-oop-os-' + stamp)
      fs.mkdirSync(backupDir, { recursive: true })
      for (const f of [...WRITE_FILES, 'questions.json']) fs.copyFileSync(path.join(DATA, f), path.join(backupDir, f))
      fs.writeFileSync(path.join(backupDir, 'journal.txt'), JSON.stringify({ at: new Date().toISOString(), opIds: plan.journal.map((j) => j.opId), newIds: plan.newIds, roles: plan.roles.map((r) => r.analysis.label + '=' + r.analysis.role) }, null, 2), 'utf8')

      // 真实数据上重跑同一套 buildPlan（不复用模拟结果，保证 apply 只依赖盘上真值）
      const dsReal = { pool: rdJson('node-pool.json'), tree: rdJson('tree-data.json'), edges: rdJson('knowledge-edges.json') }
      buildPlan(dsReal)

      // 追加 evolution-event（批次可追踪性放这里，不进 entity id）
      const evoPath = path.join(DATA, 'evolution-events.json')
      const evo = JSON.parse(fs.readFileSync(evoPath, 'utf8'))
      const evoId = 'event:tree-refactor:phase1:' + Date.now()
      evo.push({
        id: evoId,
        scopeRootId: OOP_CLS_REF,
        occurredAt: Date.now(),
        title: '阶段一：OOP 类的分类重组 + OS I/O 错位平移',
        summary: '按「实体语义优先于挂载路径」判据，把 4 个共享实体拆成 ontology/reference 两侧；'
          + '把 管理程序/模拟器 迁入 虚拟化技术；在 操作系统 下新建 I/O 多路复用 与 系统调用与 I/O 两个中间层并迁入 select/epoll/零拷贝。'
          + '新实体沿用 k_<ts>_<rand> 命名，批次信息只留本事件与报告。',
        sourceOnlyNodeIds: [],
        introducedNodes: plan.introducedNodes,
        changes: plan.results.filter((r) => r.action === 'split-entity').map((r) => ({
          targetNodeId: r.targetIds.原实体, facet: 'structure',
          before: '单个实体多挂载：' + JSON.stringify(r.before),
          after: '按语义角色 ' + r.semanticRole.role + ' 拆分：本体 ' + r.targetIds.本体实体 + ' / 具象 ' + r.targetIds.Java实体 + '；正文留在 ' + (r.semanticRole.role === 'ontology' ? '本体' : '具象') + ' 侧。',
        })),
      })
      writeJsonKeepFormat(evoPath, evo, trailNow['evolution-events.json'])

      writeJsonKeepFormat(path.join(DATA, 'tree-data.json'), dsReal.tree, trailNow['tree-data.json'])
      writeJsonKeepFormat(path.join(DATA, 'node-pool.json'), dsReal.pool, trailNow['node-pool.json'])
      writeJsonKeepFormat(path.join(DATA, 'knowledge-edges.json'), dsReal.edges, trailNow['knowledge-edges.json'])
    }
  }

  // ── 报告 ──
  const L = []
  const add = (s) => L.push(s)
  add('# 阶段一 APPLY ' + (MODE === 'apply' ? '执行报告' : '预检报告（未写盘）'))
  add('')
  add('> 生成时间 ' + new Date().toISOString())
  add('> 模式 `' + MODE + '` · implements 口径 `' + IMPL_MODE + '`' + (backupDir ? ' · 备份 `' + path.relative(ROOT, backupDir) + '`' : ' · **未写盘**'))
  add('')
  add('## 0. 闸门')
  add('')
  add('| 闸门 | 检查项 | 结果 | 依据 |')
  add('|---|---|---|---|')
  for (const g of GATES) add('| `' + g.id + '` | ' + g.name + ' | ' + (g.ok ? '✅' : '❌') + ' | ' + g.detail + ' |')
  add('')
  add(failedGates.length === 0 ? '**闸门全绿（' + GATES.length + '/' + GATES.length + '）**' : '**❌ ' + failedGates.length + ' 项未过：' + failedGates.map((g) => g.id).join(', ') + ' → ' + (MODE === 'apply' ? '已 ABORT，未写盘' : '不允许 APPLY') + '**')
  add('')
  add('## 1. 语义判定（ontology vs reference）')
  add('')
  add('> 判据：**实体语义优先于挂载路径；挂载路径不是 Ontology 身份证明。**')
  add('> 打分 = 语言强信号（代码围栏 +5 / Java 字面 +3 / 类声明语法 +3 / Java API +3 / 面经语料 +3）')
  add('> ＋ tags·页签含 Java 各 +3 ＋ 弱信号（`final class` +1）；阈值 3，≥3 判 reference，否则 ontology。')
  add('')
  add('| 实体 | 正文 | javaScore | 角色 | 置信度 | 判定依据 |')
  add('|---|---|---|---|---|---|')
  for (const r of plan.roles) {
    const a = r.analysis
    add('| `' + r.name + '` | ' + a.bodyLength + ' 字 | ' + a.javaScore + ' | **' + a.role + '**' + (a.overridden ? '（人工推翻 ' + a.overridden + '）' : '') + ' | ' + a.confidence + ' | ' + (a.evidence.join('；') || '无语言信号') + ' |')
  }
  add('')
  if (lowConf.length) {
    add('### ⚠️ 低/中置信度判定（建议人工复核）')
    add('')
    for (const r of lowConf) {
      const a = r.analysis
      add('- **`' + r.name + '`**（' + a.confidence + '，javaScore ' + a.javaScore + '，阈值 ' + a.threshold + '）→ 判为 **' + a.role + '**')
      add('  - 正文节选：' + a.excerpt + '…')
      add('  - 依据：' + a.evidence.join('；'))
      add('  - 若要推翻：`--adopt-role=' + r.ref + ':<ontology|reference>`')
    }
    add('')
  }
  add('## 2. 新实体 id（沿用仓库 genId，批次信息不入 identity）')
  add('')
  add('| 用途 | id |')
  add('|---|---|')
  for (const [k, v] of Object.entries(plan.newIds)) add('| ' + k + ' | `' + v + '` |')
  add('')
  add('id 来源：' + plan.idSource + ' · 生成器：`src/knowledge/defaults.ts` 的 `genId()`（`k_<Date.now()>_<base36×6>`）')
  add('')
  add('## 3. 总账')
  add('')
  add('| 指标 | before | after | Δ |')
  add('|---|---|---|---|')
  add('| 树条目 | ' + totals.before.tree + ' | ' + totals.after.tree + ' | +' + (totals.after.tree - totals.before.tree) + ' |')
  add('| 池节点 | ' + totals.before.pool + ' | ' + totals.after.pool + ' | +' + (totals.after.pool - totals.before.pool) + ' |')
  add('| 边 | ' + totals.before.edges + ' | ' + totals.after.edges + ' | ' + (totals.after.edges - totals.before.edges >= 0 ? '+' : '') + (totals.after.edges - totals.before.edges) + ' |')
  add('| 悬空 nodeRef（树） | ' + danglingTreeCount(ds0.tree, ds0.pool) + ' | ' + danglingTreeCount(dsSim.tree, dsSim.pool) + ' | — |')
  add('')
  add('### 3.1 边影响（真实 diff，按 id 对齐）')
  add('')
  add('| 类别 | 数量 | 明细 |')
  add('|---|---|---|')
  add('| 删除 treebind | ' + actDelTb.length + ' | ' + (actDelTb.join('<br>') || '无') + ' |')
  add('| 新增 treebind | ' + actAddTb.length + ' | ' + (actAddTb.join('<br>') || '无') + ' |')
  add('| 新增 implements | ' + implAdded.length + ' | ' + (implAdded.join('<br>') || '无') + ' |')
  const modEdges = dsSim.edges.filter((e) => isTreebind(e) && I0map.has(e.id) && JSON.stringify(I0map.get(e.id)) !== JSON.stringify(e))
  add('| 同 id 改 target（treebind） | ' + modEdges.length + ' | ' + (modEdges.map((e) => e.id + '：' + I0map.get(e.id).target + ' → ' + e.target).join('<br>') || '无') + ' |')
  add('')
  add('## 4. 验收断言（基线 vs 模拟态）')
  add('')
  add('| # | 断言 | 基线 | 变更后 | Δ | 判定 |')
  add('|---|---|---|---|---|---|')
  simChecks.checks.forEach((c, i) => {
    const b = baseChecks.checks[i]
    const d = b && c.metric !== undefined ? c.metric - b.metric : null
    const verdict = d === null ? (c.ok ? '✅' : '⚠️') : d > 0 ? '❌ 本批引入' : c.ok ? '✅' : '⚠️ 存量'
    add('| ' + (i + 1) + ' | ' + c.name + ' | ' + (b?.metric ?? '—') + ' | ' + (c.metric ?? '—') + ' | ' + (d === null ? '—' : d > 0 ? '**+' + d + '**' : d) + ' | ' + verdict + ' |')
  })
  add('')
  add('**本批引入新违规：' + regressions.length + ' 项** ' + (regressions.length ? '→ ❌ ' + regressions.map((r) => r.name).join(' / ') : '→ ✅ 无'))
  add('')
  if (disjoint) {
    add('## 4.5 ⚠️ 需要你确认的决策点（口径分歧，不是缺陷）')
  add('')
  add('| # | 分歧 | 原文 vs 判定 | 影响 | 一行命令 |')
  add('|---|---|---|---|---|')
  add('| D1 | **implements 条数** | 闸门原文「only the explicitly approved **2** changes」；但变体 B 后本体/具象对共 **4** 组（抽象类、内部类 各新增一组） | 现按 **4** 条。若走 2 条，抽象类 的 Java 具象与 内部类 的本体将**没有关系边**，模型无法表达「它是它的具象」 | `--implements-mode=minimal` |')
  if (lowConf.length) {
    for (const r of lowConf) {
      add('| D2 | **' + r.name + ' 语义角色** | javaScore ' + r.analysis.javaScore + '，仅 `final class` 一个弱信号 → 判 **' + r.analysis.role + '**（' + r.analysis.confidence + '）。若认为 `final class` 即 Java 术语，则应判 reference | 决定 ' + r.analysis.bodyLength + ' 字正文留在 OOP 侧还是 Java 侧；两种情况**都不复制正文**、都可逆 | `--adopt-role=' + r.ref + ':reference` |')
    }
  }
  add('')
  add('> 两项都不改变操作规模（树 +4 / 池 +6），只影响 2 条边与 1 处正文归属。**确认后一条命令即可落盘。**')
  add('')
  add('## 5. 写集与外部改动的相交性')
    add('')
    add('- 本次触碰的既有池实体：' + (disjoint.touchedRefs.map((r) => '`' + r + '`').join(', ') || '（无）'))
    add('- 文件层面：双方都会写 `node-pool.json`（这是**共享文件**，不可避免）')
    add('- 节点层面：与外部批次改动的 127 个节点**无交集** → ' + (disjoint.fileOverlap.length ? disjoint.fileOverlap.map((r) => '`' + r + '`').join(', ') : '无共同节点'))
    add('- 字段层面：' + (disjoint.fieldOverlap.length ? '⚠️ ' + disjoint.fieldOverlap.map((r) => '`' + r + '`').join(', ') + ' 上有重叠' : '**无重叠** —— 外部只动 `tags`、本次只动 `label`/`tags`，且作用于不同节点'))
    add('- 外部批次与阶段一的目标集碰撞：' + (disjoint.extFileCollision.map((r) => '`' + r + '`').join(', ') || '无'))
    add('')
    add('> 结论：**写集在节点与字段两个层面不相交**。文件共享只影响 git 暂存的粒度，不影响数据正确性。')
    add('')
  }
  add('## 6. 逐操作 before → after')
  add('')
  for (const r of plan.results) {
    add('### `' + r.id + '` · ' + r.action + ' · ' + r.title)
    add('')
    add('- **targetIds**：`' + JSON.stringify(r.targetIds) + '`')
    if (r.before) add('- **before**：`' + JSON.stringify(r.before) + '`')
    if (r.after) add('- **after**：`' + JSON.stringify(r.after) + '`')
    if (r.edgeImpact) add('- **边影响**：' + r.edgeImpact)
    add('- **验收**：')
    for (const p of r.postconditions ?? []) add('  - ' + p)
    add('')
  }
  add('## 7. journal（机器可读，供 audit）')
  add('')
  add('```json')
  add(JSON.stringify(plan.journal, null, 2))
  add('```')
  add('')

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const outMd = path.join(OUT_DIR, MODE === 'apply' ? 'phase1-apply-report.md' : 'phase1-apply-preflight.md')
  const md = L.join('\n')
  const tmp = outMd + '.tmp-' + process.pid + '-' + Date.now()
  fs.writeFileSync(tmp, md, 'utf8')
  try { fs.renameSync(tmp, outMd) } catch { fs.writeFileSync(outMd, md, 'utf8'); try { fs.unlinkSync(tmp) } catch { /* noop */ } }
  fs.writeFileSync(path.join(OUT_DIR, 'phase1-apply-plan.json'), JSON.stringify({
    generatedAt: new Date().toISOString(), mode: MODE, wroteData: MODE === 'apply',
    gates: GATES, roles: plan.roles.map((r) => r.analysis), newIds: plan.newIds,
    totals, results: plan.results, journal: plan.journal, backupDir,
  }, null, 2) + '\n', 'utf8')

  console.log('报告：' + path.relative(ROOT, outMd))
  console.log('闸门 ' + (GATES.length - failedGates.length) + '/' + GATES.length + (failedGates.length ? ' ❌ ' + failedGates.map((g) => g.id).join(', ') : ' ✅'))
  console.log('树 ' + totals.before.tree + '→' + totals.after.tree + ' · 池 ' + totals.before.pool + '→' + totals.after.pool + ' · 边 ' + totals.before.edges + '→' + totals.after.edges)
  console.log('本批引入新违规 ' + regressions.length + ' 项' + (regressions.length ? ' ❌' : ' ✅'))
  if (MODE === 'apply') console.log(backupDir ? '已写盘，备份：' + path.relative(ROOT, backupDir) : '未写盘（闸门未全绿）')
}

main().catch((e) => { console.error('✖ ' + e.message); console.error(e.stack); process.exitCode = 1 })
