// 剥离 MySQL 域第五批混合知识点（2026-08-23）：性能与可观测性簇
// 集中模式：通用性能概念建 concept_* 挂本体域（数据库原理/操作系统/分布式系统），
// MySQL 节点改写为实例并作为子文件挂本体下。Performance Schema、innodb_lock_wait_timeout、选项保留 MySQL；
// memcached 移入「连接器与语言生态」。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-performance-mixed-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const OS = 'theory_domain_operating_systems';
const DIST = 'theory_domain_distributed_systems';
const HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理'];
const OS_HINT = ['计算机科学', '系统组织', '操作系统'];
const DIST_HINT = ['计算机科学', '系统组织', '分布式系统'];

const C = (conceptId, label, dims, def, example, domain, hint, refs) => ({
  conceptId, label, dims, def, example, domain: domain || DBP, hint: hint || HINT,
  instances: refs.map((r) => ({ ref: r })),
});

const ITEMS = [
  C('concept_bottleneck', '瓶颈 / bottleneck', ['性能', '容量规划'],
    '**瓶颈 / bottleneck**\n系统中**受限于大小或容量**并因此限制整体吞吐量的组成部分：可能是内存区域过小、单点组件、慢速设备等。性能工程的核心方法即测量、定位并消除瓶颈——消除一个后下一个会浮现（吞吐受最慢环节决定）。',
    '**同构实例**：数据库连接数上限、磁盘 IOPS 上限、应用线程池、网络带宽。任何系统通用。', DBP, HINT,
    ['mysql_glossary_bottleneck_ehdgmu']),
  C('concept_workload', '工作负载 / workload', ['性能', '容量规划'],
    '**工作负载 / workload**\n系统在典型或高峰使用期间承载的**操作组合与数量**（查询混合、读写比、并发度、到达率）。是性能测试、容量规划与瓶颈识别的输入：施加受控工作负载以测量吞吐与延迟。',
    '**同构实例**：数据库 OLTP/OLAP 负载、Web 请求负载、基准测试（TPC-C/TPC-H）工作负载。', DBP, HINT,
    ['k_dict_vd39b68k']),
  C('concept_cpu_bound', 'CPU 密集型 / CPU-bound', ['性能', '工作负载'],
    '**CPU 密集型 / CPU-bound**\n主要瓶颈是**CPU 计算**（而非 I/O）的工作负载类型：耗时集中在内存中的运算、排序、解析等。扩展手段是更多/更快核心；与 I/O 密集型相对。',
    '**同构实例**：无索引大结果集排序、加密计算、编译构建负载。', DBP, HINT,
    ['mysql_glossary_cpu_bound_1lxhya']),
  C('concept_io_bound', 'I/O 密集型 / I/O-bound', ['性能', '工作负载'],
    '**I/O 密集型 / I/O-bound（磁盘绑定 / disk-bound）**\n主要瓶颈是**磁盘 I/O**的工作负载类型：耗时集中在等待读写设备。对策是缓存、缓冲、顺序化与更快的存储介质；与 CPU 密集型相对。',
    '**同构实例**：全表扫描、冷数据随机读、日志刷盘、任何存储系统的 I/O 等待。', DBP, HINT,
    ['mysql_glossary_disk_bound_1eazx6', 'mysql_glossary_i_o_bound_9k72or']),
  C('concept_scalability', '可伸缩性 / scalability', ['可扩展性', '性能', '分布式系统'],
    '**可伸缩性 / scalability**\n系统在**负载增加时仍能保持性能目标**的能力：加资源应近似线性地换来回吐/容量。分为向上扩展（更强单机）与向外扩展（更多节点）；超过容量限制时常出现性能断崖（队列堆积、锁竞争）。',
    '**同构实例**：数据库读写分离扩展、Web 水平扩展、缓存层扩展。', DIST, DIST_HINT,
    ['mysql_glossary_scalability_d5afjw']),
  C('concept_throughput_tps', '每秒事务数 / TPS', ['性能', '度量'],
    '**每秒事务数 / TPS（transactions per second）**\n度量系统**事务吞吐率**的单位，常用于基准测试与容量规划；与 QPS（每秒查询数）、延迟共同构成吞吐-延迟基本度量对。数值高度依赖事务定义与工作负载。',
    '**同构实例**：TPC-C tpmC、sysbench TPS、支付系统 TPS 指标。', DBP, HINT,
    ['mysql_glossary_tps_ej1ya6']),
  C('concept_wait', '等待 / wait', ['并发', '性能'],
    '**等待 / wait**\n操作因资源被占（锁、互斥量、闩锁、I/O 完成）而**无法立即完成**时的状态，实现上可以是忙等（自旋）、睡眠+唤醒或两者结合。等待事件是性能诊断的核心信号：高频等待揭示竞争点。',
    '**同构实例**：锁等待、I/O 等待、性能Schema 的等待事件采集、OS 调度等待。', DBP, HINT,
    ['mysql_glossary_wait_1229eo']),
  C('concept_counter', '计数器 / counter', ['可观测性', '度量'],
    '**计数器 / counter**\n对某类事件**单调递增计数**的观测原语（操作次数、错误数、字节量），是最廉价的遥测手段。计数器可按主题组织为指标计数器（metrics counter），配合速率计算得到吞吐曲线。',
    '**同构实例**：InnoDB 计数器、Prometheus counter 指标类型、OS 性能计数器（PMU）。', DBP, HINT,
    ['mysql_glossary_counter_17gzh9', 'mysql_glossary_metrics_counter_1tynuw']),
  C('concept_optimizer_statistics', '统计信息 / optimizer statistics', ['查询处理', '可观测性'],
    '**统计信息 / optimizer statistics**\n优化器为构造高效执行计划所依赖的**数据分布估计**：基数（cardinality）、直方图、唯一值数等。可分为持久化统计（落盘、跨重启稳定）与动态统计（内存采样），准确性直接决定计划质量。',
    '**同构实例**：InnoDB 持久统计、PostgreSQL ANALYZE 统计、Oracle DBMS_STATS。', DBP, HINT,
    ['k_dict_rkijwolw', 'mysql_glossary_persistent_statistics_2n5ydn']),
  C('concept_cache', '缓存 / cache', ['缓冲', '内存管理', '操作系统'],
    '**缓存 / cache**\n保存数据副本以便**频繁或高速检索**的内存区域（或层），以局部性原理换性能：命中即省去慢速层访问。核心机制是命中率、淘汰策略（LRU 等）与一致性/失效管理；常按用途组成缓存体系（表缓存、记录缓存、权限缓存等）。',
    '**同构实例**：OS page cache、InnoDB buffer pool、DNS/CDN 缓存、应用侧缓存。', OS, OS_HINT,
    ['k_1782027235624_gtvo1k', 'k_1782033743150_vbish8']),
  C('concept_cache_warmup', '预热 / cache warm-up', ['缓冲', '性能'],
    '**预热 / warm-up**\n系统启动后让其在**典型负载下运行一段时间**，使缓存（buffer pool 等）与统计信息填充到稳态水平的过程；未预热的缓存命中率低、性能抖动，重启/故障切换后尤其重要。',
    '**同构实例**：InnoDB buffer pool 预热与转储载入、OS 页缓存预热、JVM 预热。', DBP, HINT,
    ['k_dict_ee6jgxn1']),
  C('concept_hot', '热 / hot', ['并发', '性能'],
    '**热 / hot**\n某行、表或内部结构被**高频访问**从而引发锁/互斥竞争、成为可伸缩性限制的状态（热点，hot spot）。与「冷」（低频访问）相对；消除热点靠拆分、打散与无锁化。',
    '**同构实例**：热点行更新竞争、计数器表热点、缓存热点 key。', DBP, HINT,
    ['mysql_glossary_hot_1yorp3']),
  C('concept_physical_vs_logical', '物理 / physical（相对逻辑而言）', ['存储', '体系结构'],
    '**物理 / physical**\n描述操作/视图时指**面向硬件实体**的层面：磁盘块、内存页、文件、位、物理读取等，与「逻辑」（面向表/行/语句等抽象结构）相对。专家级性能调优与诊断常需下探到物理层面。',
    '**同构实例**：物理备份 vs 逻辑备份、物理读 vs 逻辑读、物理设计 vs 逻辑设计。', DBP, HINT,
    ['mysql_glossary_physical_117gzf']),
];

// ---------- 工具 ----------
function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
function findByRef(ref) { let hit = null; walk(tree, (n) => { if (!hit && n.nodeRef === ref) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
if (!MYSQL_ROOT) throw new Error('未找到 MySQL 根');

// ---------- 1) node-pool ----------
for (const it of ITEMS) {
  if (pool[it.conceptId]) throw new Error(`concept id 冲突: ${it.conceptId}`);
  pool[it.conceptId] = {
    id: it.conceptId, label: it.label, kind: 'Concept', role: 'plain',
    dimensions: it.dims, tags: [it.label, ...it.dims],
    card: {
      nodeId: it.conceptId, title: it.label,
      tabs: [
        { id: 'def', label: '定义（本体）', content: it.def },
        { id: 'example', label: '示例（跨域实例）', content: it.example },
      ],
      rootContent: it.def.split('\n').slice(0, 2).join(' ').replace(/\*\*/g, ''),
    },
  };
  for (const inst of it.instances) {
    const m = pool[inst.ref];
    if (!m) throw new Error(`缺少 MySQL 节点 ${inst.ref}`);
    const tabs = (m.card && m.card.tabs) || [];
    const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || '';
    inst.label = `MySQL ${m.label}`;
    m.label = inst.label;
    m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
    m.tags = Array.from(new Set([...(m.tags || []), inst.label, 'mysql']));
    m.card.title = inst.label;
    m.card.tabs = [
      {
        id: 'def', label: '定义（MySQL 实例）',
        content: `**${inst.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${it.label}」概念节点。`,
      },
    ];
    m.card.rootContent = `**${inst.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现。本节点是实例。`;
  }
}

// ---------- 2) tree-data ----------
function detachByRef(ref) {
  let existing = null;
  const hits = [];
  walk(tree, (n, parent) => { if (parent && n.nodeRef === ref) hits.push({ n, parent }); });
  for (const { n, parent } of hits) {
    parent.children.splice(parent.children.indexOf(n), 1);
    if (!existing && !n.projection) existing = n;
  }
  return existing;
}
for (const it of ITEMS) {
  const domain = findNode(it.domain);
  if (!domain) throw new Error(`未找到目标域 ${it.domain}`);
  domain.children = domain.children || [];
  if (domain.children.some((c) => c.nodeRef === it.conceptId)) throw new Error(`条目已存在 ${it.label}`);
  domain.children.push({
    id: `tree_${it.conceptId}`, name: it.label, count: 0, nodeRef: it.conceptId,
    children: it.instances.map((inst, i) => {
      const existing = detachByRef(inst.ref);
      if (existing) {
        existing.name = pool[inst.ref].label;
        existing.projection = false;
        delete existing.view; delete existing.projectionKind; delete existing.sourceNodeId;
        return existing;
      }
      return { id: `tree_mysql_instance_${it.conceptId}_${i}`, name: pool[inst.ref].label, count: 0, nodeRef: inst.ref, children: [] };
    }),
  });
}

// memcached：MySQL 生态组件 → 移入「连接器与语言生态」
const eco = MYSQL_ROOT.children.find((c) => /连接器与语言生态/.test(c.name));
const memcached = detachByRef('k_dict_fbl127ld');
if (eco && memcached) {
  memcached.name = 'MySQL 生态 / memcached';
  memcached.projection = false;
  delete memcached.view; delete memcached.projectionKind; delete memcached.sourceNodeId;
  eco.children.push(memcached);
  console.log('memcached -> 连接器与语言生态');
}

// 清理 MySQL 子树空容器
let removedEmpty = 0, changed = true;
while (changed) {
  changed = false;
  const empties = [];
  walk(MYSQL_ROOT, (n, parent) => {
    if (parent && !n.nodeRef && (!n.children || n.children.length === 0)) empties.push({ n, parent });
  });
  for (const { n, parent } of empties) {
    parent.children.splice(parent.children.indexOf(n), 1);
    removedEmpty++; changed = true;
  }
}
console.log('removed empty MySQL containers:', removedEmpty);

// ---------- 3) edges ----------
for (const it of ITEMS) {
  for (const inst of it.instances) {
    const id = `rel:${it.conceptId}:instance-of:${inst.ref}`;
    if (!edges.find((e) => e.id === id)) {
      edges.push({ id, source: inst.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
    }
  }
}

// ---------- 4) governance ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p; else placements.push(p);
}
for (const it of ITEMS) {
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`, nodeId: it.conceptId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.domain, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...it.hint, it.label],
    confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: '通用性能/可观测概念，自 MySQL 混合知识点剥离；MySQL 侧保留为实例并 instance-of 回指。',
  });
}

// ---------- 5) 原子写回 ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
console.log('peel-mysql-performance-mixed complete:', ITEMS.length, 'concepts,', ITEMS.reduce((s, i) => s + i.instances.length, 0), 'instances');
