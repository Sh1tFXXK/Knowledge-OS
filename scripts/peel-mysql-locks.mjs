// 剥离 MySQL 域 · 并发锁簇（2026-08-23，全面扫描第二批）
// 背景：前批已将存储程序/数据库与元数据/连接器/数据类型 及 存储过程·触发器·视图 残留迁到本体。
// 本批聚焦「锁与并发控制」：共享/排他/乐观/悲观/意向/记录/间隙/行级/表级锁、闩锁(latch)、
// 元数据锁、非锁定读、锁定读、锁模式、范围与插入锁、半一致性读、锁机制 等标准并发理论概念。
// 这些 MySQL 节点均只存在于 MySQL 树下（非本体共享重复），剥离零风险。
// 范式：缺失的通用概念建 concept_* 挂 database_principles；MySQL 节点改写为实例、挂回、加 instance-of 边、补 governance。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-locks-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理', '并发控制'];

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
if (!MYSQL_ROOT) throw new Error('未找到 MySQL 根');
const dbpNode = findNode(DBP);
if (!dbpNode) throw new Error('未找到 database_principles');

// ---------- 新建本体概念（缺失的通用锁/并发概念） ----------
const NEWS = [
  { conceptId: 'concept_exclusive_lock', label: '排他锁 / exclusive lock', dims: ['并发', '锁'],
    def: '**排他锁 / exclusive lock（X 锁）**\n独占式锁，持有期间**阻断其他事务的读锁与写锁**（以及自身的其他请求），确保被锁资源在释放前只被一个事务独占修改。与共享锁相对，是实现写互斥的基础。\n\n本节点只承载模型本体；各 DBMS 的排他锁实现作为实例挂其下。',
    example: '**同构实例**：MySQL `FOR UPDATE`/X 锁、PostgreSQL `FOR UPDATE`、SQL Server 排他表锁。' },
  { conceptId: 'concept_optimistic_lock', label: '乐观锁 / optimistic lock', dims: ['并发', '锁'],
    def: '**乐观锁 / optimistic lock（乐观并发控制 OCC）**\n假设冲突概率低，**读取时不加锁**，仅在提交时校验数据是否被其他事务改动（版本号/时间戳/校验和），冲突则回滚重试。适合读多写少场景，避免锁开销但需处理重试。\n\n本节点只承载模型本体；各实现的乐观并发控制作为实例挂其下。',
    example: '**同构实例**：版本号字段 + `WHERE version=?`、MVCC 快照读、Hibernate `@Version`。' },
  { conceptId: 'concept_pessimistic_lock', label: '悲观锁 / pessimistic lock', dims: ['并发', '锁'],
    def: '**悲观锁 / pessimistic lock（悲观并发控制）**\n假设冲突概率高，**读取/修改数据即加锁**并持有至事务结束，提前阻止其他事务并发修改。实现简单、无重试逻辑，但可能降低并发度并引发锁等待。\n\n本节点只承载模型本体；各实现的悲观锁作为实例挂其下。',
    example: '**同构实例**：`SELECT ... FOR UPDATE`、行级 X 锁、Java `synchronized` 思想。' },
  { conceptId: 'concept_intention_lock', label: '意向锁 / intention lock', dims: ['并发', '锁'],
    def: '**意向锁 / intention lock**\n加在**表**上的锁，声明事务**意图在表中的某些行上加共享锁或排他锁**，使表级锁能快速判断是否可与行级锁兼容，避免逐行检查。分意向共享锁（IS）与意向排他锁（IX）。\n\n本节点只承载模型本体；各 DBMS 的意向锁实现作为实例挂其下。',
    example: '**同构实例**：InnoDB IS/IX 锁、SQL Server intent locks。' },
  { conceptId: 'concept_record_lock', label: '记录锁 / record lock', dims: ['并发', '锁'],
    def: '**记录锁 / record lock**\n加在**单个索引记录**上的锁（行级锁的一种），锁定具体某一行。间隙锁与之配合形成临键锁，避免幻读。\n\n本节点只承载模型本体；各 DBMS 的记录锁实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 对唯一索引的等值加锁即为记录锁；`SELECT ... FOR UPDATE` 命中行。' },
  { conceptId: 'concept_table_level_locking', label: '表级锁 / table-level locking', dims: ['并发', '锁'],
    def: '**表级锁 / table-level locking**\n对**整张表**加锁，表内所有行共享同一把锁，实现简单、开销小但并发度低。与行级锁相对，常见于 MyISAM 等引擎或 DDL 场景。\n\n本节点只承载模型本体；各 DBMS 的表级锁作为实例挂其下。',
    example: '**同构实例**：MyISAM 表锁、MySQL `LOCK TABLES`、DDL 元数据锁升级。' },
  { conceptId: 'concept_auto_increment_lock', label: '自增锁 / auto-increment lock', dims: ['并发', '锁', 'MySQL'],
    def: '**自增锁 / auto-increment lock**\n为保证 `AUTO_INCREMENT` 列生成**连续且唯一**的递增值而持有的特殊表级锁，在插入语句期间短暂持有（具体行为受 `innodb_autoinc_lock_mode` 控制）。\n\n本节点只承载模型本体；MySQL 的实现作为实例挂其下。',
    example: '**同构实例**：MySQL InnoDB 自增锁与 `innodb_autoinc_lock_mode` 三档策略。' },
  { conceptId: 'concept_insert_intention_lock', label: '插入意向锁 / insert intention lock', dims: ['并发', '锁'],
    def: '**插入意向锁 / insert intention lock**\n一种特殊的**间隙锁**，表示事务**意图在索引间隙中插入一行**，多个插入意向锁在互不冲突的间隙上可兼容，从而允许并发插入。是临键锁体系的组成部分。\n\n本节点只承载模型本体；各 DBMS 的实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 插入意向锁，与间隙锁配合避免插入幻行。' },
  { conceptId: 'concept_implicit_row_lock', label: '隐式行锁 / implicit row lock', dims: ['并发', '锁'],
    def: '**隐式行锁 / implicit row lock**\n未在 SQL 中显式请求、由存储引擎在特定操作（如唯一性检查、外键校验、`INSERT ... ON DUPLICATE KEY UPDATE`）时**自动施加的行级锁**，用于保护内部一致性。\n\n本节点只承载模型本体；各 DBMS 的隐式加锁行为作为实例挂其下。',
    example: '**同构实例**：InnoDB 在唯一约束冲突检查时的隐式记录锁。' },
  { conceptId: 'concept_latch', label: '闩锁 / latch', dims: ['并发', '操作系统', '同步'],
    def: '**闩锁 / latch（互斥原语）**\n数据库/操作系统内核中保护**内存数据结构**的轻量级短期互斥原语，与事务级锁不同：latch 保护代码临界区、持有时间极短、不遵从事务语义。常见有 mutex 与 rw-lock。\n\n本节点只承载模型本体；各系统的 latch 实现作为实例挂其下。',
    example: '**同构实例**：InnoDB mutex/rw-lock、PostgreSQL LWLock、Pthreads 互斥量。' },
  { conceptId: 'concept_metadata_lock', label: '元数据锁 / metadata lock (MDL)', dims: ['并发', '锁', '元数据'],
    def: '**元数据锁 / metadata lock（MDL）**\n保护**表/对象元数据**的锁，防止一个会话在另一会话使用表时并发修改其结构（DDL 与 DML/DDL 互斥）。事务期间持有的 MDL 会延迟结构变更并可能引发等待。\n\n本节点只承载模型本体；各 DBMS 的元数据锁实现作为实例挂其下。',
    example: '**同构实例**：MySQL `metadata locks`、PostgreSQL 咨询锁/模式锁。' },
  { conceptId: 'concept_non_locking_read', label: '非锁定读 / non-locking read', dims: ['并发', '读现象'],
    def: '**非锁定读 / non-locking read**\n读取操作**不加共享锁**，通常基于 MVCC 快照返回一致性历史版本，不阻塞写入也不被写入阻塞。与锁定读相对，是快照隔离下读多写少高性能的关键。\n\n本节点只承载模型本体；各 DBMS 的非锁定读实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 一致性读（consistent read）、Oracle 读不阻塞写。' },
  { conceptId: 'concept_locking_read', label: '锁定读 / locking read', dims: ['并发', '锁'],
    def: '**锁定读 / locking read**\n读取时**显式加锁**（通常为当前读 + 共享/排他锁），保证读到最新已提交数据并阻塞并发修改，用于防止不可重复读/幻读或实现业务互斥。\n\n本节点只承载模型本体；各 DBMS 的锁定读实现作为实例挂其下。',
    example: '**同构实例**：`SELECT ... FOR SHARE/FOR UPDATE`、当前读。' },
  { conceptId: 'concept_lock_mode', label: '锁模式 / lock mode', dims: ['并发', '锁'],
    def: '**锁模式 / lock mode**\n锁的**兼容性与强度类别**（如共享 S、排他 X、意向 IS/IX、更新 U 等），决定锁之间能否共存。锁模式矩阵是并发控制器判断冲突的核心依据。\n\n本节点只承载模型本体；各 DBMS 的锁模式体系作为实例挂其下。',
    example: '**同构实例**：InnoDB S/X/IS/IX 矩阵、SQL Server 锁模式。' },
  { conceptId: 'concept_range_insert_lock', label: '范围锁与插入锁 / range & insert locks', dims: ['并发', '锁'],
    def: '**范围锁与插入锁 / range & insert locks**\n应对**幻读**的锁机制族：范围锁（锁定一个键值区间）、插入意向锁（区间插入意图）、临键锁（记录锁+间隙锁）等，共同阻止其他事务在区间内插入新行。\n\n本节点只承载模型本体；各 DBMS 的范围/插入锁实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 间隙锁 + 插入意向锁 + 临键锁组合。' },
  { conceptId: 'concept_semi_consistent_read', label: '半一致性读取 / semi-consistent read', dims: ['并发', '读现象', 'MySQL'],
    def: '**半一致性读取 / semi-consistent read**\n在 `READ COMMITTED` 隔离级别下，UPDATE 语句对冲突行采用的**特殊读取**：返回最新已提交版本用于判断 `WHERE` 是否仍命中，以减少锁等待与误更新。是 MySQL 特有优化。\n\n本节点只承载模型本体；MySQL 的实现作为实例挂其下。',
    example: '**同构实例**：MySQL InnoDB `READ COMMITTED` 下的半一致性读优化。' },
  { conceptId: 'concept_lock_mechanism', label: '锁机制 / locking mechanism', dims: ['并发', '锁'],
    def: '**锁机制 / locking mechanism**\n数据库保证**并发访问时数据一致性**的核心控制体系总称：通过加锁协议控制数据访问顺序、避免写-写/读写冲突。涵盖锁类型、粒度（行/表/页）、模式、死锁处理与锁调度。\n\n本节点只承载模型本体；各 DBMS 的锁机制作为实例挂其下。',
    example: '**同构实例**：两阶段锁协议（2PL）、多粒度锁、各种锁类型与隔离级别的配合。' },
];

// ---------- MySQL 节点 -> 本体概念 映射 ----------
const MAPS = [
  { ref: 'demo_shared_lock', conceptId: 'concept_shared_lock' },
  { ref: 'demo_exclusive_lock', conceptId: 'concept_exclusive_lock' },
  { ref: 'mysql_glossary_exclusive_lock_ksqz5a', conceptId: 'concept_exclusive_lock' },
  { ref: 'demo_optimistic', conceptId: 'concept_optimistic_lock' },
  { ref: 'mysql_glossary_optimistic_1gdvw6', conceptId: 'concept_optimistic_lock' },
  { ref: 'demo_pessimistic', conceptId: 'concept_pessimistic_lock' },
  { ref: 'mysql_glossary_pessimistic_l0bpvy', conceptId: 'concept_pessimistic_lock' },
  { ref: 'demo_row_lock', conceptId: 'concept_row_level_locking' },
  { ref: 'demo_table_lock', conceptId: 'concept_table_level_locking' },
  { ref: 'mysql_lock_intention', conceptId: 'concept_intention_lock' },
  { ref: 'mysql_glossary_intention_shared_lock_4x8ciz', conceptId: 'concept_intention_lock' },
  { ref: 'mysql_glossary_intention_exclusive_lock_1rd4p1', conceptId: 'concept_intention_lock' },
  { ref: 'mysql_glossary_record_lock_1pixn1', conceptId: 'concept_record_lock' },
  { ref: 'mysql_lock_range_insert', conceptId: 'concept_range_insert_lock' },
  { ref: 'mysql_lock_auto_increment', conceptId: 'concept_auto_increment_lock' },
  { ref: 'mysql_glossary_auto_increment_locking_lrps8v', conceptId: 'concept_auto_increment_lock' },
  { ref: 'mysql_glossary_insert_intention_lock_1pnwh6', conceptId: 'concept_insert_intention_lock' },
  { ref: 'mysql_glossary_implicit_row_lock_ac6u2d', conceptId: 'concept_implicit_row_lock' },
  { ref: 'mysql_lock_latches', conceptId: 'concept_latch' },
  { ref: 'mysql_lock_metadata', conceptId: 'concept_metadata_lock' },
  { ref: 'mysql_glossary_metadata_lock_qiqw4n', conceptId: 'concept_metadata_lock' },
  { ref: 'mysql_glossary_semi_consistent_read_luof7q', conceptId: 'concept_semi_consistent_read' },
  { ref: 'mysql_glossary_non_locking_read_12iidl', conceptId: 'concept_non_locking_read' },
  { ref: 'mysql_glossary_locking_read_16dto0', conceptId: 'concept_locking_read' },
  { ref: 'mysql_glossary_locking_1ofljy', conceptId: 'concept_locking' },
  { ref: 'mysql_glossary_lock_mode_h31or1', conceptId: 'concept_lock_mode' },
  { ref: 'mysql_lock_modes', conceptId: 'concept_lock_mode' },
  { ref: 'demo_lock', conceptId: 'concept_lock_mechanism' },
];

// ---------- 1) 新建概念 ----------
const createdConcepts = [];
for (const it of NEWS) {
  if (pool[it.conceptId]) { console.log('skip existing concept:', it.conceptId); continue; }
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
  dbpNode.children = dbpNode.children || [];
  dbpNode.children.push({ id: `tree_${it.conceptId}`, name: it.label, count: 0, nodeRef: it.conceptId, children: [] });
  createdConcepts.push(it.conceptId);
}
console.log('created concepts:', createdConcepts.length);

// ---------- 2) 改写 MySQL 实例 + 重挂 ----------
function detachByRef(ref) {
  let existing = null;
  const hits = [];
  walk(tree, (n, parent) => { if (parent && n.nodeRef === ref) hits.push({ n, parent }); });
  for (const { n, parent } of hits) {
    parent.children.splice(parent.children.indexOf(n), 1);
    if (!existing) existing = n;
  }
  return existing;
}
let mapped = 0, skipped = 0;
for (const it of MAPS) {
  const m = pool[it.ref];
  if (!m) { console.log('skip missing ref:', it.ref); skipped++; continue; }
  const concept = pool[it.conceptId];
  if (!concept) { console.log('skip missing concept:', it.conceptId); skipped++; continue; }
  const tabs = (m.card && m.card.tabs) || [];
  const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || '';
  const instLabel = (m.label || '').startsWith('MySQL ') ? m.label : `MySQL ${m.label || it.ref}`;
  m.label = instLabel;
  m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
  m.tags = Array.from(new Set([...(m.tags || []), instLabel, 'mysql']));
  m.card = m.card || {};
  m.card.title = instLabel;
  m.card.tabs = [
    {
      id: 'def', label: '定义（MySQL 实例）',
      content: `**${instLabel}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${concept.label}」概念节点（数据库原理）。`,
    },
  ];
  m.card.rootContent = `**${instLabel}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现。本节点是实例，本体在数据库原理域。`;
  const conceptEntry = findNode(`tree_${it.conceptId}`);
  if (!conceptEntry) { console.log('skip no tree entry:', it.conceptId); skipped++; continue; }
  const detached = detachByRef(it.ref);
  if (!detached) { console.log('skip not under MySQL:', it.ref); skipped++; continue; }
  detached.name = instLabel;
  detached.projection = false;
  delete detached.view; delete detached.projectionKind; delete detached.sourceNodeId;
  conceptEntry.children = conceptEntry.children || [];
  conceptEntry.children.push(detached);
  mapped++;
  console.log(`mapped ${m.label} -> ${concept.label}`);
}

// MySQL 空容器清理
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
console.log('removed empty MySQL containers:', removedEmpty, '| mapped:', mapped, '| skipped:', skipped);

// ---------- 3) edges ----------
for (const it of MAPS) {
  const id = `rel:${it.conceptId}:instance-of:${it.ref}`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: it.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
  }
}

// ---------- 4) governance ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p; else placements.push(p);
}
for (const it of NEWS) {
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`, nodeId: it.conceptId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: DBP, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, it.label],
    confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `通用锁/并发概念，自 MySQL 锁机制簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, pool[it.ref].label],
    confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 锁机制簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
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
console.log('peel-mysql-locks complete: concepts+=', createdConcepts.length, 'instances mapped=', mapped);
