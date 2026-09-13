/**
 * 只读预检：D2（30 条）与 C（37 条）的每条动作对照真实数据核对。
 * 输出 outputs/tree-violation-scan/batch2-preflight.md（不改 data/）。
 *
 * 用法：node scripts/shell-fusion/preflight-batch2.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', p), 'utf8'))
const pool = rd('node-pool.json')
const tree = rd('tree-data.json')
const edges = rd('knowledge-edges.json')
const questions = rd('questions.json')

const flat = []
;(function w(list, parent, pathArr) {
  for (const e of list || []) {
    const p = [...pathArr, e.name]
    flat.push({ e, parent, path: p, name: e.name, id: e.id, ref: e.nodeRef })
    w(e.children, e, p)
  }
})(tree.children, tree, [tree.name])
const byId = new Map(flat.map((f) => [f.id, f]))
const byName = (nm) => flat.filter((f) => f.name === nm)

const L = []
const h = (s) => { L.push(''); L.push(`## ${s}`); L.push('') }
const clip = (s, n = 60) => (s ?? '').replace(/\n/g, ' ').slice(0, n)
const contentLen = (ref) => {
  const n = pool[ref]
  if (!n?.card) return 0
  let t = String(n.card.rootContent ?? '').length
  for (const tab of n.card.tabs ?? []) t += String(tab.content ?? '').length
  return t
}
const sub = (id) => {
  const f = byId.get(id)
  if (!f) return -1
  let c = 0
  ;(function w(n) { for (const k of n.children ?? []) { c += 1; w(k) } })(f.e)
  return c
}

const problems = []
const note = (level, msg) => { problems.push(`${level} ${msg}`) }

L.push('# final-87 第二批（D2 + C）只读预检')
L.push('')
L.push(`树条目 ${flat.length}（含根）｜池 ${Object.keys(pool).length}｜边 ${edges.length}｜题 ${questions.length}`)
L.push('')
L.push('> 本文件只读生成，未写入任何 `data/*.json`。')

// ── D2 ────────────────────────────────────────────────────────────────────
h('一、D2 · 六簇宿主核对')

const D2_HOSTS = [
  {
    cluster: 'bean_lc_*（Bean 生命周期五阶段）', count: 5,
    items: ['bean_lc_prepare', 'bean_lc_instantiate', 'bean_lc_inject', 'bean_lc_cache', 'bean_lc_destroy'],
    hostCandidates: ['asplit_bean_lifecycle', 'k_1785225243066_ds8pn6'],
    carrier: 'mechanismSpec（新建）',
  },
  {
    cluster: 'surge_*（流量激增应对方法六步）', count: 6,
    items: ['surge_estimate', 'surge_stress', 'surge_bottleneck', 'surge_scale', 'surge_degrade', 'surge_ha'],
    hostCandidates: ['surge_methods', '流量激增应对方法'],
    carrier: 'supplement（并入宿主）',
  },
  {
    cluster: 'hps_*（QPS 提升 10 倍的系统设计）', count: 6,
    items: ['hps_scale', 'hps_rpc', 'hps_mq', 'hps_cache', 'hps_db', 'hps_ha'],
    hostCandidates: ['hps_design', 'QPS 提升 10 倍的系统设计'],
    carrier: 'supplement（并入宿主）',
  },
  {
    cluster: 'sqopt_idea_*（慢查询优化思路十条）', count: 10,
    items: ['sqopt_idea_highconc', 'sqopt_idea_index', 'sqopt_idea_bottleneck', 'sqopt_idea_target', 'sqopt_idea_explain', 'sqopt_idea_small_drive', 'sqopt_idea_sort_index', 'sqopt_idea_columns', 'sqopt_idea_filter', 'sqopt_idea_join'],
    hostCandidates: ['sqopt_ideas', '慢查询优化思路（十条）'],
    carrier: 'supplement（并入宿主）',
  },
  {
    cluster: '单条 · 系列', count: 3,
    items: ['k_1786092342085_3zwh4c', 'k_1786096587014_vzab8u', 'k_wiki_en_outline_of_databases_s21'],
    hostCandidates: [],
    carrier: 'supplement / 提级子树',
  },
]

for (const c of D2_HOSTS) {
  L.push(`### ${c.cluster} —— ${c.count} 条 · 载体 ${c.carrier}`)
  L.push('')
  L.push('| 条目 | treeId | 父条目 | 子树 | 正文 | 池中? |')
  L.push('|---|---|---|---:|---:|---|')
  for (const ref of c.items) {
    const hit = flat.find((f) => f.ref === ref)
    if (!hit) { L.push(`| \`${ref}\` | — | **树中找不到** | — | ${contentLen(ref)} | ${pool[ref] ? '是' : '**否**'} |`); note('✗', `D2 条目树中找不到：${ref}`); continue }
    L.push(`| ${hit.name} | \`${hit.id}\` | ${hit.parent?.name} | ${sub(hit.id)} | ${contentLen(ref)} | ${pool[ref] ? '是' : '**否**'} |`)
  }
  L.push('')
  for (const hc of c.hostCandidates) {
    const byRef = pool[hc] ? flat.find((f) => f.ref === hc) : null
    const byIdHit = byId.get(hc)
    const nameHit = byName(hc)
    const found = byRef || byIdHit || (nameHit.length ? nameHit[0] : null)
    if (found) {
      L.push(`- 宿主候选 \`${hc}\` → **命中**：treeId \`${found.id}\`「${found.name}」ref \`${found.ref ?? '-'}\`（${sub(found.id)} 孩，正文 ${contentLen(found.ref)}）`)
    } else {
      L.push(`- 宿主候选 \`${hc}\` → **未命中**`)
      note('✗', `D2 宿主候选不存在：${hc}（簇 ${c.cluster}）`)
    }
  }
  L.push('')
}

// 创建数据仓库的 32 子树
h('二、D2 · 「创建数据仓库」的 32 个子树去处')
const cdw = flat.find((f) => f.ref === 'k_wiki_en_outline_of_databases_s21')
if (!cdw) { note('✗', '找不到「创建数据仓库」树条目'); L.push('**未找到**') } else {
  L.push(`- 条目：\`${cdw.id}\`「${cdw.name}」，父 = 「${cdw.parent?.name}」(\`${cdw.parent?.id}\` ref \`${cdw.parent?.nodeRef}\`)`)
  L.push(`- 亲儿子 ${(cdw.e.children ?? []).length} 个，后代合计 ${sub(cdw.id)} 个`)
  L.push(`- 亲儿子名单：${(cdw.e.children ?? []).map((c) => `「${c.name}」`).join('、')}`)
  const noRef = (cdw.e.children ?? []).filter((c) => !c.nodeRef)
  if (noRef.length) note('✗', `「创建数据仓库」有 ${noRef.length} 个无 nodeRef 的孩子`)
  const dangling = (cdw.e.children ?? []).filter((c) => c.nodeRef && !pool[c.nodeRef])
  if (dangling.length) note('✗', `「创建数据仓库」有 ${dangling.length} 个悬空 nodeRef 的孩子`)
}

// ── C：章节壳 ────────────────────────────────────────────────────────────
h('三、C · 15 个章节壳去序号（同名冲突预警）')
L.push('')
L.push('| # | treeId | 现名 | 拟改名 | 子树 | 正文 | 目标名在本树已占用? |')
L.push('|---:|---|---|---|---:|---:|---|')
const CHAPTERS = [
  ['chapter_db_01', '一、数据库系统', '数据库系统'], ['chapter_db_02', '二、数据模型', '数据模型'],
  ['chapter_db_03', '三、数据库结构', '数据库结构'], ['chapter_db_05', '五、数据库操作', '数据库操作'],
  ['chapter_db_08', '八、恢复系统', '恢复系统'], ['chapter_db_09', '九、日志系统', '日志系统'],
  ['chapter_db_10', '十、存储系统', '存储系统'], ['chapter_db_12', '十二、数据表示', '数据表示'],
  ['chapter_db_13', '十三、数据库设计', '数据库设计'], ['chapter_db_14', '十四、数据库分布与复制', '数据库分布与复制'],
  ['chapter_db_16', '十六、数据库安全', '数据库安全'], ['chapter_db_17', '十七、数据库运维', '数据库运维'],
  ['chapter_db_18', '十八、数据库编程与接口', '数据库编程与接口'], ['chapter_db_19', '十九、数据库产品', '数据库产品'],
  ['chapter_db_20', '二十、数据库文件与实现', '数据库文件与实现'],
]
for (const [tid, cur, next] of CHAPTERS) {
  const f = byId.get(tid)
  if (!f) { L.push(`| — | \`${tid}\` | ${cur} | ${next} | **树条目不存在** | — | — |`); note('✗', `章节壳树条目不存在：${tid}`); continue }
  if (f.name !== cur) note('!', `章节壳现名与名单不一致：${tid} 实际「${f.name}」名单「${cur}」`)
  const clash = byName(next).filter((x) => x.id !== tid)
  let clashDesc = '否'
  if (clash.length) {
    clashDesc = clash.map((x) => {
      const rel = isAncestor(tid, x.id) ? '**自己的后代**' : (isAncestor(x.id, tid) ? '**自己的祖先**' : '同树其它分支')
      return `**是** — 「${x.name}」\`${x.id}\`（ref \`${x.ref}\`，${rel}，${sub(x.id)} 孩）`
    }).join('；')
    note('!', `章节壳改名撞名：${tid}「${cur}」→「${next}」与 ${clash.length} 处已占用`)
  }
  L.push(`| — | \`${tid}\` | ${cur} | **${next}** | ${sub(tid)} | ${contentLen(f.ref)} | ${clashDesc} |`)
}

function isAncestor(ancId, descId) {
  let cur = byId.get(descId)
  while (cur?.parent && cur.parent.id) {
    if (cur.parent.id === ancId) return true
    cur = byId.get(cur.parent.id)
  }
  return false
}

// ── C：详解/总览壳 ───────────────────────────────────────────────────────
h('四、C · 16 个详解/总览壳去后缀归本体（融合可行性）')
L.push('')
L.push('| treeId | 壳名 | 拟正名 | 壳正文 | 正身 treeId | 正身正文 | 正身子树 | 判定 |')
L.push('|---|---|---|---:|---|---:|---:|---|')
const SHELLS = [
  ['tree_vault_javajavaarraylist_an0rm3', 'ArrayList 详解', 'ArrayList'],
  ['tree_vault_javajavahashmap_14a6f2', 'HashMap 详解', 'HashMap'],
  ['tree_vault_javajavahashset_176pvr', 'HashSet 详解', 'HashSet'],
  ['tree_vault_javajava_15bnft', 'Java 集合框架总览', 'Java 集合框架'],
  ['tree_vault_javajavalinkedlist_1uc0ii', 'LinkedList 详解', 'LinkedList'],
  ['tree_vault_java_1n4uei', '线程池详解', '线程池'],
  ['tree_1786095193397_uyjgsm', 'FutureTask详解', 'FutureTask'],
  ['tree_1786093347020_15dntb', 'ScheduledThreadPoolExecutor详解', 'ScheduledThreadPoolExecutor'],
  ['tree_1786093144146_ajv4cr', 'ThreadPoolExecutor详解', 'ThreadPoolExecutor'],
  ['tree_1786093265279_n5f4vh', 'CachedThreadPool详解', 'CachedThreadPool'],
  ['tree_1786093175065_78z1xl', 'FixedThreadPool详解', 'FixedThreadPool'],
  ['tree_1786093231555_o69fau', 'SingleThreadExecutor详解', 'SingleThreadExecutor'],
  ['tree_vault_javajava_vzjv8p', 'Java 多线程编程入门', 'Java 多线程编程'],
  ['tree_vault_javakafkakafka_1qlqb8', 'Kafka 定位总览', 'Kafka'],
  ['tree_vault_javamybatismybatis_14eqlq', 'MyBatis 定位总览', 'MyBatis'],
  ['tree_vault_javaspringcloudspringcloud_33p5su', 'Spring Cloud 定位总览', 'Spring Cloud'],
]
for (const [tid, shellName, target] of SHELLS) {
  const f = byId.get(tid)
  if (!f) { L.push(`| \`${tid}\` | ${shellName} | ${target} | **树条目不存在** | — | — | — | ✗ |`); note('✗', `详解壳树条目不存在：${tid}`); continue }
  if (f.name !== shellName) note('!', `详解壳现名与名单不一致：${tid} 实际「${f.name}」名单「${shellName}」`)
  const clash = byName(target).filter((x) => x.id !== tid)
  if (!clash.length) {
    L.push(`| \`${tid}\` | ${shellName} | **${target}** | ${contentLen(f.ref)} | — | — | ${sub(tid)} | 无冲突 → 纯改名 |`)
  } else {
    const best = clash[0]
    L.push(`| \`${tid}\` | ${shellName} | ${target} | ${contentLen(f.ref)} | \`${best.id}\` | ${contentLen(best.ref)} | ${sub(best.id)} | **撞名 ${clash.length} 处 → 需融合或分治** |`)
  }
}

// ── C：基础壳 + 大壳 ─────────────────────────────────────────────────────
h('五、C · 2 个「基础」壳 + 4 个大壳')
L.push('')
L.push('| treeId | 现名 | 子树 | 正文 | 亲儿子 | 判定 |')
L.push('|---|---|---:|---:|---:|---|')
const BIG = [
  ['tree_vault_javajava_ii523d', 'Java 数据结构基础'],
  ['tree_vault_javajvm01jvm_1h8bru', 'JVM 基础'],
  ['tree_java_syntax_zh_1oty7br', '基础'],
  ['tree_1783873300414_0y8oon', '软件开发（实践总览）'],
  ['tree_surge_auto_scale', '进阶思路：监控驱动动态扩容'],
  ['governance:canonical:school_real_world_conventions', '跨系统标准与约定（总览）'],
]
for (const [tid, nm] of BIG) {
  const f = byId.get(tid)
  if (!f) { L.push(`| \`${tid}\` | ${nm} | — | — | — | **树条目不存在** |`); note('✗', `大壳树条目不存在：${tid}`); continue }
  const kids = (f.e.children ?? []).map((c) => c.name)
  L.push(`| \`${tid}\` | ${f.name} | ${sub(tid)} | ${contentLen(f.ref)} | ${kids.length} | 需定实名 |`)
  if (f.name !== nm) note('!', `大壳现名不一致：${tid} 实际「${f.name}」名单「${nm}」`)
  L.push(`|  |  |  |  |  | 亲儿子：${clip(kids.join('、'), 200)} |`)
}

h('六、预检结论')
L.push('')
if (!problems.length) L.push('- ✅ 未发现阻塞项。')
else {
  L.push(`- 共 **${problems.length}** 项需注意：`)
  L.push('')
  for (const p of problems) L.push(`  - ${p}`)
}

const out = path.join(ROOT, 'outputs', 'tree-violation-scan', 'batch2-preflight.md')
fs.writeFileSync(out, L.join('\n') + '\n', 'utf8')
console.log(L.join('\n'))
console.log(`\n已写出 → ${path.relative(ROOT, out)}`)
