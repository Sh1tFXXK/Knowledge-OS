// scripts/split-replication-ha.mjs
// 复制与高可用的中立化拆分：建通用本体挂原理层，MySQL 节点改 instance-of 实例（留 MySQL 域）。
import fs from 'node:fs';
const ROOT = process.cwd();
const F = { np: ROOT + '/data/node-pool.json', tree: ROOT + '/data/tree-data.json', edges: ROOT + '/data/knowledge-edges.json' };
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeAtomic = (p, obj) => { const t = p + '.tmp'; fs.writeFileSync(t, JSON.stringify(obj, null, 2)); fs.renameSync(t, p); };
const np = read(F.np); const tree = read(F.tree);
const edgesObj = read(F.edges); const edges = Array.isArray(edgesObj) ? edgesObj : (edgesObj.edges || edgesObj);

// ---- 本体定义 ----
const ONTO = {
  concept_replication: {
    label: '复制 / replication', treeName: '复制 / replication', treeId: 'tree_concept_replication',
    tags: ['复制', '数据库', '高可用', '分布式'],
    def: ['**复制 / replication**', '', '数据库与存储系统中将数据从一个节点（源/主）同步到其他节点（副本）的机制，用于读扩展、容灾、地理分布与高可用。分逻辑复制（按行/语句传播变更）与物理复制（按块/页/WAL 复制）。', '', '跨 PostgreSQL（logical/physical replication）、Oracle（GoldenGate/ADG）、MySQL（replication）、Cassandra、Kafka、Redis 等均有实现。', '', '本节点承载通用本体；各系统的具体实现在各自领域回指。'].join('\n'),
    ex: ['**同构实例（复制）**：', '- **MySQL**：source→replica 异步/半同步复制，binlog 为传输载体（RBR/SBR/MIXED）。', '- **PostgreSQL**：physical streaming replication + logical replication（pub/sub）。', '- **Oracle**：Active Data Guard、GoldenGate 逻辑复制。', '- **Redis**：master→replica 异步复制 + sentinel。', '- **分布式**：Cassandra、Kafka Mirror Maker、ETCD raft。'].join('\n'),
  },
  concept_replica: {
    label: '副本 / replica', treeName: '副本 / replica', treeId: 'tree_concept_replica',
    tags: ['副本', '复制', '高可用'],
    def: ['**副本 / replica**', '', '复制拓扑中接收并应用源节点更改的节点，与源保持数据一致（可有复制滞后 lag）。常用于读分担、容灾接管、升级与配置测试。', '', '各系统称谓：MySQL replica、PostgreSQL standby、Redis replica、MongoDB secondary。', '', '本节点承载通用本体；各系统的具体实现在各自领域回指。'].join('\n'),
    ex: ['**同构实例（副本）**：', '- **MySQL**：replica，接收 source 的 binlog 事件并应用；常配 SSD 与高 CPU 用于读分担与容灾。', '- **PostgreSQL**：standby（hot/warm standby）。', '- **Redis**：replica + sentinel 选举。', '- **MongoDB**：secondary，副本集投票成员。'].join('\n'),
  },
  concept_primary: {
    label: '主节点 / primary source', treeName: '主节点 / primary source', treeId: 'tree_concept_primary',
    tags: ['主节点', '复制', '高可用'],
    def: ['**主节点 / primary source**', '', '复制拓扑中处理初始写请求并把更改传播到副本的节点（写入入口）。各系统称谓不同：MySQL source（8.0+）/master（旧称）、PostgreSQL primary、Redis master、MongoDB primary、CockroachDB leaseholder。', '', '本节点承载通用本体；各系统的具体实现在各自领域回指。'].join('\n'),
    ex: ['**同构实例（主节点）**：', '- **MySQL**：source（8.0+ 替代 master 的现称），处理初始 DML 并通过 binlog 传播给 replica。', '- **PostgreSQL**：primary，流复制源。', '- **Redis**：master（旧称）→ replica。', '- **MongoDB**：primary，副本集写入成员。'].join('\n'),
  },
  concept_row_based_replication: {
    label: '基于行的复制 / row-based replication', treeName: '基于行的复制 / row-based replication', treeId: 'tree_concept_row_based_replication',
    tags: ['基于行的复制', '复制', '逻辑复制'],
    def: ['**基于行的复制 / row-based replication**', '', '逻辑复制格式：传播事件明确描述每行的变更（插入/更新/删除的行级数据）。确定性高、对非确定性语句安全；代价是日志量较大。', '', '跨 MySQL RBR、PostgreSQL logical replication（pub/sub 行级）、Oracle GoldenGate。', '', '本节点承载通用本体；各系统的具体实现在各自领域回指。'].join('\n'),
    ex: ['**同构实例（基于行的复制）**：', '- **MySQL**：RBR（binlog_format=ROW），行级事件，对 innodb_autoinc_lock_mode 各设置安全。', '- **PostgreSQL**：logical replication，按行解码 WAL 发布订阅。', '- **Oracle**：GoldenGate 行级抽取。'].join('\n'),
  },
  concept_statement_based_replication: {
    label: '基于语句的复制 / statement-based replication', treeName: '基于语句的复制 / statement-based replication', treeId: 'tree_concept_statement_based_replication',
    tags: ['基于语句的复制', '复制', '逻辑复制'],
    def: ['**基于语句的复制 / statement-based replication**', '', '逻辑复制格式：从源发送 SQL 语句并在副本重播。日志紧凑，但非确定性语句（now()/rand()/自增/UDF）需额外处理以保证一致性。', '', '跨 MySQL SBR、早期 PostgreSQL 语句复制。', '', '本节点承载通用本体；各系统的具体实现在各自领域回指。'].join('\n'),
    ex: ['**同构实例（基于语句的复制）**：', '- **MySQL**：SBR（binlog_format=STATEMENT），语句重播，需注意 innodb_autoinc_lock_mode 与 auto-increment locking 时序。', '- **早期 PostgreSQL**：基于语句的复制（已被逻辑复制取代）。'].join('\n'),
  },
  concept_availability: {
    label: '可用性 / availability', treeName: '可用性 / availability', treeId: 'tree_concept_availability',
    tags: ['可用性', '高可用', '系统属性'],
    def: ['**可用性 / availability**', '', '系统在故障（主机/OS/硬件/软件）与维护活动下仍能提供服务的能力，常以可用率（9 的个数，如 99.9%/99.99%/99.999%）度量；与可伸缩性、容错、RTO/RPO 相关，是高可用（HA）的核心指标。', '', '通用系统属性，跨数据库、中间件、网络、存储均适用。', '', '本节点承载通用本体；各系统的具体实现在各自领域回指。'].join('\n'),
    ex: ['**同构实例（可用性）**：', '- **MySQL**：通过复制、InnoDB Cluster、Router + MGR 实现高可用；可用性与 scalability 并列为大规模部署关键。', '- **通用**：HA Cluster、VIP failover、负载均衡 + 健康检查、多 AZ 部署。', '- **指标**：RTO（恢复时间）、RPO（恢复点）、MTBF/MTTR、SLA 9 的个数。'].join('\n'),
  },
};

// ---- MySQL 实例改写 ----
const INST = {
  mysql_glossary_replica_7pskdj: { label: 'MySQL 副本 / MySQL replica', onto: 'concept_replica',
    content: ['**MySQL 副本 / MySQL replica**', '', '在 MySQL replication 拓扑中接收来自另一台服务器（source）的更改并应用同样更改的数据库 server。与源保持相同内容，尽管可能稍有滞后。', '', 'MySQL 中副本常用于灾难恢复（取代失败的源）、测试软件升级与新设置以确保配置更改不影响性能/可靠性。副本工作负载较高（处理源传递的所有 DML 写入 + 用户查询），通常配备快速 I/O 设备与足够 CPU/内存（如源用 HDD、副本用 SSD）。', '', '本节点是「副本」通用概念在 MySQL 中的实例；其本体见「副本 / replica」概念节点。', '', '来源：MySQL Glossary（replica）。'].join('\n') },
  mysql_glossary_master_1k7935: { label: 'MySQL master（旧称） / MySQL master', onto: 'concept_primary',
    content: ['**MySQL master（旧称） / MySQL master**', '', 'master 是 MySQL 复制中主节点（处理初始写请求并把更改传播到 replica）的旧称。MySQL 8.0 起改用更具包容性的 source 替代 master；二者指同一角色（见 source）。', '', '本节点是「主节点」通用概念在 MySQL 中的实例（旧称）；其本体见「主节点 / primary source」概念节点。', '', '来源：MySQL Glossary（master）。'].join('\n') },
  mysql_glossary_source_7ps15k: { label: 'MySQL 源 / MySQL source', onto: 'concept_primary',
    content: ['**MySQL 源 / MySQL source**', '', '在 MySQL replication 场景中，处理数据初始插入、更新和删除请求的数据库服务器；这些更改传播到其他被称为 replica 的服务器并重复。source 是 MySQL 8.0+ 替代 master 的现称。', '', '另见 副本（https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_replica ）、复制（https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_replication ）。', '', '本节点是「主节点」通用概念在 MySQL 中的实例（现称）；其本体见「主节点 / primary source」概念节点。', '', '来源：MySQL Glossary（source）。'].join('\n') },
  mysql_glossary_availability_o9h2qe: { label: 'MySQL 可用性 / MySQL availability', onto: 'concept_availability',
    content: ['**MySQL 可用性 / MySQL availability**', '', '在 MySQL 语境下，可用性指能够应对并在必要时从主机上的故障中恢复（包括 MySQL、操作系统或硬件的故障，以及其他可能导致停机的维护活动）。通常与 scalability（可伸缩性）一起被视为大规模部署的关键方面。', '', '另见 可伸缩性（https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_scalability ）。', '', '本节点是「可用性」通用概念在 MySQL 中的实例；其本体见「可用性 / availability」概念节点。', '', '来源：MySQL Glossary（availability）。'].join('\n') },
  mysql_glossary_row_based_replication_uiayeb: { label: 'MySQL 基于行的复制 / MySQL row-based replication', onto: 'concept_row_based_replication',
    content: ['**MySQL 基于行的复制 / MySQL row-based replication**', '', 'MySQL 的一种复制形式：事件从 source 传播到 replica，并明确描述应如何改变各个单独的行。对于 innodb_autoinc_lock_mode 配置项的所有设置，基于行的复制都是安全可用的（binlog_format=ROW）。', '', '另见 auto-increment locking、innodb_autoinc_lock_mode、replica、replication、source、statement-based replication。', '', '本节点是「基于行的复制」通用概念在 MySQL 中的实例；其本体见「基于行的复制 / row-based replication」概念节点。', '', '来源：MySQL Glossary（row-based replication）。'].join('\n') },
  mysql_glossary_statement_based_replication_xyynye: { label: 'MySQL 基于语句的复制 / MySQL statement-based replication', onto: 'concept_statement_based_replication',
    content: ['**MySQL 基于语句的复制 / MySQL statement-based replication**', '', 'MySQL 的一种 replication 形式：SQL 语句从 source 发送并在 replica 上重播（binlog_format=STATEMENT）。需在 innodb_autoinc_lock_mode（https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html#sysvar_innodb_autoinc_lock_mode ）选项设置上格外小心，以避免与 auto-increment locking 相关的潜在时序问题；非确定性语句（now/rand/自增）需额外处理。', '', '另见 自动递增锁定、innodb_autoinc_lock_mode、replica、replication、source、row-based replication。', '', '本节点是「基于语句的复制」通用概念在 MySQL 中的实例；其本体见「基于语句的复制 / statement-based replication」概念节点。', '', '来源：MySQL Glossary（statement-based replication）。'].join('\n') },
};

// 1. node-pool: 新增 6 本体
for (const [id, o] of Object.entries(ONTO)) {
  np[id] = { id, label: o.label, projection: false, tags: o.tags,
    card: { nodeId: id, title: o.label, rootContent: o.def.split('\n\n').slice(0, 2).join('\n\n'),
      tabs: [ { id: 'def', label: '定义（本体）', content: o.def }, { id: 'example', label: '示例（跨域实例）', content: o.ex } ] } };
}

// 2. node-pool: 改 6 MySQL 节点为实例
for (const [id, v] of Object.entries(INST)) {
  const n = np[id]; if (!n) { console.error('缺', id); process.exit(1); }
  n.label = v.label;
  n.card.tabs = [{ id: 'def', label: '定义（MySQL 实例）', content: v.content }];
  n.card.title = v.label; n.card.rootContent = v.content.split('\n\n')[0];
  if (!n.tags) n.tags = []; if (!n.tags.includes('复制')) n.tags.push('复制');
}

// 3. tree: database_principles 下新增「复制 / replication」(含4子本体) 与「可用性 / availability」
function findNode(n, id) { if (n.id === id) return n; for (const c of (n.children || [])) { const r = findNode(c, id); if (r) return r; } return null; }
const dp = findNode(tree, 'database_principles'); if (!dp) throw new Error('database_principles not found');
const replNode = { id: 'tree_concept_replication', name: '复制 / replication', nodeRef: 'concept_replication', children: [
  { id: 'tree_concept_replica', name: '副本 / replica', nodeRef: 'concept_replica', children: [] },
  { id: 'tree_concept_primary', name: '主节点 / primary source', nodeRef: 'concept_primary', children: [] },
  { id: 'tree_concept_row_based_replication', name: '基于行的复制 / row-based replication', nodeRef: 'concept_row_based_replication', children: [] },
  { id: 'tree_concept_statement_based_replication', name: '基于语句的复制 / statement-based replication', nodeRef: 'concept_statement_based_replication', children: [] },
] };
const availNode = { id: 'tree_concept_availability', name: '可用性 / availability', nodeRef: 'concept_availability', children: [] };
dp.children.push(replNode, availNode);

// 4. edges: 加 6 instance-of 边
const edgeAdd = [
  { source: 'mysql_glossary_replica_7pskdj', target: 'concept_replica', id: 'rel:mysql_replica:instance-of:concept_replica' },
  { source: 'mysql_glossary_master_1k7935', target: 'concept_primary', id: 'rel:mysql_master:instance-of:concept_primary' },
  { source: 'mysql_glossary_source_7ps15k', target: 'concept_primary', id: 'rel:mysql_source:instance-of:concept_primary' },
  { source: 'mysql_glossary_availability_o9h2qe', target: 'concept_availability', id: 'rel:mysql_availability:instance-of:concept_availability' },
  { source: 'mysql_glossary_row_based_replication_uiayeb', target: 'concept_row_based_replication', id: 'rel:mysql_rbr:instance-of:concept_row_based_replication' },
  { source: 'mysql_glossary_statement_based_replication_xyynye', target: 'concept_statement_based_replication', id: 'rel:mysql_sbr:instance-of:concept_statement_based_replication' },
];
const existIds = new Set(edges.map(e => e.id));
let added = 0;
for (const e of edgeAdd) { if (!existIds.has(e.id)) { edges.push({ id: e.id, source: e.source, target: e.target, type: 'instance-of', label: 'MySQL 实例' }); added++; } }

// 5. 原子写回
writeAtomic(F.np, np); writeAtomic(F.tree, tree);
const edgesOut = Array.isArray(edgesObj) ? edges : (edgesObj.edges ? { ...edgesObj, edges } : { edges });
writeAtomic(F.edges, edgesOut);

console.log('=== 复制/高可用拆分完成 ===');
console.log('新增本体:', Object.keys(ONTO).join(', '));
console.log('改写实例:', Object.keys(INST).join(', '));
console.log('instance-of 边新增:', added, '| 总边数:', edges.length);
console.log('database_principles children:', dp.children.length);
console.log('复制簇 children:', replNode.children.map(c => c.name).join(', '));
