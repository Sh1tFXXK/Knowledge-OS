// 剥离 MySQL 域中"本体属于其他领域"的混合知识点（2026-08-23）
// 范式：目标域建中立本体 concept_*，MySQL 节点改写为"MySQL 实例"并作为真实子节点挂到本体下，
// 从 MySQL 树剥离残留投影；加 instance-of 回指边；governance placement；原子写回。
// 目标：
//   操作系统域 (theory_domain_operating_systems)：mutex、spin、atomic instruction
//   分布式系统域 (theory_domain_distributed_systems)：load balancing、heartbeat、scale out、scale up
//   数据结构域 (theory_domain_data_structures)：inverted index
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-cross-domain-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

// ---------- 拆分清单 ----------
const OS = 'theory_domain_operating_systems';
const DIST = 'theory_domain_distributed_systems';
const DS = 'theory_domain_data_structures';

const ITEMS = [
  {
    conceptId: 'concept_mutex',
    label: '互斥量 / mutex',
    domain: OS,
    domainName: '操作系统',
    dims: ['并发', '同步原语', '操作系统'],
    mysqlRef: 'mysql_glossary_mutex_6ryres',
    def: '**互斥量 / mutex**\n一种保证**独占访问**的低级同步原语：一旦某个线程获得互斥量，任何其他线程在它释放前都无法获得同一互斥量，从而保护共享内存数据结构的完整性。\n\n互斥量通常由操作系统或线程库（如 Pthreads）提供，一般基于更底层的原子指令与自旋/睡眠等待策略实现。它与读写锁（rw-lock，允许多读单写）相对，二者统称 latch（闩锁）。\n\n本节点只承载模型本体；各系统实例在各自领域回指（如「MySQL 互斥量」实例节点）。',
    example: '**同构实例（独占访问同步原语）**：\n- **MySQL / InnoDB**：用 mutex 保护 buffer pool、锁表等内部内存结构。\n- **操作系统 / 线程库**：Pthreads `pthread_mutex_t`、Linux futex。\n- **Java**：`synchronized` / `ReentrantLock`。\n\n这些都属于「互斥量」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_spin_wait',
    label: '自旋 / spin',
    domain: OS,
    domainName: '操作系统',
    dims: ['并发', '同步原语', '操作系统'],
    mysqlRef: 'mysql_glossary_spin_2ipmhl',
    def: '**自旋 / spin**\n一种**等待**技术：线程在「忙循环」中反复测试资源是否变得可用，而不是进入睡眠并触发上下文切换。\n\n适用于**短暂持有**的资源——自旋开销小于两次上下文切换的开销；若资源在短时间内未可用，自旋循环会停止并退回到睡眠等其他等待技术。常见于互斥量/闩锁的快路径实现。\n\n本节点只承载模型本体；各系统实例在各自领域回指。',
    example: '**同构实例（忙等待策略）**：\n- **MySQL / InnoDB**：latch 竞争时先自旋若干轮再退避睡眠。\n- **操作系统**：Linux 自旋锁（spinlock）用于临界区极短的内核路径。\n- **Java**：`Thread.onSpinWait()` 提示。\n\n这些都属于「自旋等待」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_atomic_instruction',
    label: '原子指令 / atomic instruction',
    domain: OS,
    domainName: '操作系统',
    dims: ['并发', '体系结构', '操作系统'],
    mysqlRef: 'mysql_glossary_atomic_instruction_xxdtb4',
    def: '**原子指令 / atomic instruction**\n由 CPU 提供的特殊指令，保证关键的低级操作（读-改-写，如 test-and-set、compare-and-swap）**不可被中断**，是构建互斥量、读写锁、无锁数据结构等更高层同步原语的硬件基础。\n\n本节点只承载模型本体；各系统实例在各自领域回指。',
    example: '**同构实例（原子操作硬件基础）**：\n- **MySQL / InnoDB**：用原子指令实现计数器与 latch 快路径。\n- **操作系统**：内核原子变量 `atomic_t`。\n- **C/C++**：`std::atomic` / `Interlocked` 系列。\n\n这些都属于「原子指令」通用概念的不同使用场景。',
  },
  {
    conceptId: 'concept_load_balancing',
    label: '负载均衡 / load balancing',
    domain: DIST,
    domainName: '分布式系统',
    dims: ['分布式系统', '可扩展性', '可用性'],
    mysqlRef: 'mysql_glossary_load_balancing_ee4rhm',
    def: '**负载均衡 / load balancing**\n将请求/工作负载分摊到多个服务节点上的技术，目标是避免单点过载、提升整体吞吐与可用性。可在 DNS、硬件、软件代理（如 LVS、HAProxy、Nginx）等层次实现，常见策略有轮询、最少连接、一致性哈希等。\n\n本节点只承载模型本体；各系统实例在各自领域回指（如「MySQL 负载均衡」实例节点）。',
    example: '**同构实例（工作负载分摊）**：\n- **MySQL**：读写分离场景下把读请求均衡到多个副本。\n- **Web 服务**：Nginx / HAProxy / LVS 分发 HTTP 请求。\n- **分布式存储**：一致性哈希把键分摊到集群节点。\n\n这些都属于「负载均衡」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_heartbeat',
    label: '心跳 / heartbeat',
    domain: DIST,
    domainName: '分布式系统',
    dims: ['分布式系统', '故障检测', '可用性'],
    mysqlRef: 'mysql_glossary_heartbeat_1aiai3',
    def: '**心跳 / heartbeat**\n分布式系统中节点间周期性互发的小消息，用于表明自己仍然存活，是**故障检测**的基础机制：在约定超时内未收到心跳即判定对方宕机/失联，进而触发告警或故障转移。\n\n本节点只承载模型本体；各系统实例在各自领域回指。',
    example: '**同构实例（存活检测）**：\n- **MySQL**：复制源与副本间的心跳用于监控复制延迟与连通性。\n- **集群管理**：HAProxy / Keepalived 心跳触发 VIP 漂移。\n- **Raft/Paxos**：leader 心跳维持权威并触发选主。\n\n这些都属于「心跳」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_scale_out',
    label: '向外扩展 / scale out',
    domain: DIST,
    domainName: '分布式系统',
    dims: ['分布式系统', '可扩展性'],
    mysqlRef: 'mysql_glossary_scale_out_1fhx7h',
    def: '**向外扩展 / scale out（横向扩展）**\n通过**增加更多节点**来提升系统容量与吞吐的扩展方式，与纵向扩展（scale up，换更强单机）相对。通常伴随数据分片、复制与负载均衡，能以低成本换线性扩展，但引入一致性与管理复杂度。\n\n本节点只承载模型本体；各系统实例在各自领域回指。',
    example: '**同构实例（增加节点扩容）**：\n- **MySQL**：加只读副本横向扩展读能力，分库分表扩展写能力。\n- **NoSQL**：Cassandra / MongoDB 加节点自动再均衡数据。\n- **缓存**：Redis Cluster 水平分片。\n\n这些都属于「向外扩展」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_scale_up',
    label: '向上扩展 / scale up',
    domain: DIST,
    domainName: '分布式系统',
    dims: ['分布式系统', '可扩展性'],
    mysqlRef: 'mysql_glossary_scale_up_1y6pkm',
    def: '**向上扩展 / scale up（纵向扩展）**\n通过**增强单个节点**（更多 CPU、内存、更快的存储）来提升系统容量与吞吐的扩展方式，与向外扩展（scale out）相对。无需改动数据分布与一致性逻辑，但受单机上限与成本陡增约束。\n\n本节点只承载模型本体；各系统实例在各自领域回指。',
    example: '**同构实例（增强单机扩容）**：\n- **MySQL**：升级硬件（NVMe、大内存 buffer pool）提升单实例性能。\n- **缓存**：单机 Redis 升配提升容量与 QPS。\n- **通用**：OLTP 数据库常先 scale up、达到上限后再 scale out。\n\n这些都属于「向上扩展」通用概念的不同实现。',
  },
  {
    conceptId: 'concept_inverted_index',
    label: '倒排索引 / inverted index',
    domain: DS,
    domainName: '数据结构',
    dims: ['数据结构', '信息检索'],
    mysqlRef: 'mysql_glossary_inverted_index_spkkuc',
    def: '**倒排索引 / inverted index**\n一种面向**文档检索**的数据结构：从「词」映射到「包含该词的文档（及位置）」的列表，与从文档映射到词的正排索引相对。全文搜索引擎据此高效回答「哪些文档包含某词」的查询，典型构件为词典项 + 倒排列表（posting list）。\n\n本节点只承载模型本体；各系统实例在各自领域回指（如「MySQL 倒排索引」实例节点）。',
    example: '**同构实例（词 → 文档列表映射）**：\n- **MySQL / InnoDB**：FULLTEXT 索引以倒排索引实现，记录每个词在文档中的位置。\n- **搜索引擎**：Elasticsearch / Lucene 的核心索引结构。\n- **版本控制**：代码搜索工具用倒排索引加速符号检索。\n\n这些都属于「倒排索引」通用概念的不同实现。',
  },
];

// ---------- 工具 ----------
function walk(n, fn, parent) {
  fn(n, parent);
  for (const c of (n.children || [])) walk(c, fn, n);
}
function findNode(id) {
  let hit = null;
  walk(tree, (n) => { if (!hit && n.id === id) hit = n; });
  return hit;
}

// ---------- 1) node-pool：建本体 + 改 MySQL 实例 ----------
for (const it of ITEMS) {
  const m = pool[it.mysqlRef];
  if (!m) throw new Error(`缺少 MySQL 节点 ${it.mysqlRef}`);
  const origDef = (m.card.tabs.find((t) => t.id === 'def') || m.card.tabs[0]).content;

  pool[it.conceptId] = {
    id: it.conceptId,
    label: it.label,
    kind: 'Concept',
    role: 'plain',
    dimensions: it.dims,
    tags: [it.label, ...it.dims],
    card: {
      nodeId: it.conceptId,
      title: it.label,
      tabs: [
        { id: 'def', label: '定义（本体）', content: it.def },
        { id: 'example', label: '示例（跨域实例）', content: it.example },
      ],
      rootContent: it.def.split('\n').slice(0, 2).join(' ').replace(/\*\*/g, ''),
    },
  };

  const en = it.label.split('/')[1]?.trim() || it.label;
  m.label = `MySQL ${it.label}`;
  m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
  m.tags = Array.from(new Set([...(m.tags || []), 'MySQL ' + en, 'mysql', 'glossary']));
  m.card.title = m.label;
  m.card.tabs = [
    {
      id: 'def',
      label: '定义（MySQL 实例）',
      content:
        `**${m.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${it.label}」概念节点（${it.domainName}）。`,
    },
  ];
  m.card.rootContent =
    `**${m.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现。本节点是实例，本体在${it.domainName}域。`;
}

// ---------- 2) tree-data：本体挂目标域，MySQL 实例作为真实子节点挂本体下 ----------
// 2a. 移除 MySQL 域内指向这些 nodeRef 的投影条目（剥离）
// 2b. 把目标域中残留的、指向 mysql nodeRef 的投影条目替换为「本体真实条目 + MySQL 实例子节点」
const MYSQL_ROOT = findNode('forest:view:mysql');
if (!MYSQL_ROOT) throw new Error('未找到 MySQL 根 forest:view:mysql');

for (const it of ITEMS) {
  // 收集全树中指向该 nodeRef 的投影条目及其父节点
  const hits = [];
  walk(tree, (n, parent) => { if (parent && n.nodeRef === it.mysqlRef) hits.push({ n, parent }); });
  for (const { n, parent } of hits) {
    const idx = parent.children.indexOf(n);
    parent.children.splice(idx, 1);
    if (isInSubtree(parent, MYSQL_ROOT)) {
      console.log(`stripped MySQL-tree projection: ${n.name}`);
    } else {
      console.log(`removed stray projection in target/other domain: ${n.name} @ ${parent.name}`);
    }
  }

  const domain = findNode(it.domain);
  if (!domain) throw new Error(`未找到目标域树节点 ${it.domain}`);
  domain.children = domain.children || [];
  if (domain.children.some((c) => c.nodeRef === it.conceptId)) {
    console.log(`skip tree entry (exists): ${it.label}`);
    continue;
  }
  domain.children.push({
    id: `tree_${it.conceptId}`,
    name: it.label,
    count: 0,
    nodeRef: it.conceptId,
    children: [
      {
        id: `tree_mysql_instance_${it.conceptId}`,
        name: pool[it.mysqlRef].label,
        count: 0,
        nodeRef: it.mysqlRef,
        children: [],
      },
    ],
  });
}
function isInSubtree(node, root) {
  let found = false;
  walk(root, (n) => { if (n === node) found = true; });
  return found;
}

// ---------- 3) edges：instance-of 回指边 ----------
for (const it of ITEMS) {
  const id = `rel:${it.conceptId}:instance-of`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: it.mysqlRef, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
  }
}

// ---------- 4) governance：placement ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p;
  else placements.push(p);
}
for (const it of ITEMS) {
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`,
    nodeId: it.conceptId,
    status: 'accepted',
    contentStatus: 'canonical',
    canonicalParentNodeId: it.domain,
    canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: ['计算机科学', it.domain === OS ? '系统组织' : it.domain === DIST ? '系统组织' : '计算理论', it.domainName, it.label],
    confidence: 'high',
    rule: 'cross-domain-peeling-v1',
    rationale: `本体属${it.domainName}域，自 MySQL 混合知识点剥离；MySQL 侧保留为实例并 instance-of 回指。`,
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
console.log('peel-mysql-cross-domain complete:', ITEMS.length, 'concepts');
