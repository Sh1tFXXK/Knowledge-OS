// 剥离 MySQL 域 · 事务理论簇（2026-08-23，全面扫描第三批）
// 覆盖：事务/事务生命周期/事务管理/读现象/一致性读/并发/受害者/丢失更新/全局事务/事务ID/只读事务/MDL。
// 真实重复节点（savepoint/commit/two-phase commit 共享本体入口）摘 MySQL 引用。
// 范式同 peel-mysql-locks.mjs：缺失通用概念建 concept_* 挂 database_principles；MySQL 节点改实例、加 instance-of 边、补 governance。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-transaction-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理', '事务与并发控制'];

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
const dbpNode = findNode(DBP);

const NEWS = [
  { conceptId: 'concept_transaction', label: '事务 / transaction', dims: ['事务', '并发'],
    def: '**事务 / transaction**\n数据库中的**逻辑工作单元**，由一组操作组成，具备 ACID 四大属性（原子性、一致性、隔离性、持久性）。事务确立提交/回滚边界，是并发控制与恢复的基石。\n\n本节点只承载模型本体；各 DBMS 的事务实现作为实例挂其下。',
    example: '**同构实例**：MySQL `BEGIN`/`COMMIT`、PostgreSQL 事务块、Oracle 隐式事务。' },
  { conceptId: 'concept_transaction_lifecycle', label: '事务生命周期 / transaction lifecycle', dims: ['事务', '生命周期'],
    def: '**事务生命周期 / transaction lifecycle**\n从事务**开始（BEGIN）** 经**活跃执行（读写）**、可能的**保存点/回滚** 到**提交（COMMIT）或回滚（ROLLBACK）** 的完整状态流转。理解生命周期是排查长事务、锁等待的前提。\n\n本节点只承载模型本体；各 DBMS 的事务生命周期作为实例挂其下。',
    example: '**同构实例**：活动→部分提交→提交/中止的状态机。' },
  { conceptId: 'concept_transaction_management', label: '事务管理 / transaction management', dims: ['事务', '管理'],
    def: '**事务管理 / transaction management**\n数据库系统对事务的**调度、并发控制与恢复**的总称：包括事务的开始/提交/回滚、隔离级别设定、锁与 MVCC 协调、日志与故障恢复。是数据库引擎的核心子系统。\n\n本节点只承载模型本体；各 DBMS 的事务管理器作为实例挂其下。',
    example: '**同构实例**：事务管理器 + 锁管理器 + 日志管理器的协作。' },
  { conceptId: 'concept_read_phenomena', label: '读现象 / read phenomena', dims: ['事务', '并发', '读现象'],
    def: '**读现象 / read phenomena**\n并发事务在弱隔离级别下可能出现的**异常读**：脏读、不可重复读、幻读。隔离级别即围绕规避这些现象定义（如 SQL 标准四级隔离）。\n\n本节点只承载模型本体；各 DBMS 对读现象的界定作为实例挂其下。',
    example: '**同构实例**：脏读/不可重复读/幻读三档现象与隔离级别矩阵。' },
  { conceptId: 'concept_consistent_read', label: '一致性读取 / consistent read', dims: ['事务', '读现象', 'MVCC'],
    def: '**一致性读取 / consistent read**\n基于**事务开始时的快照**读取数据，返回该快照版本、不受其他已提交/未提交事务影响，从而在不加锁的情况下获得可重复的一致性视图。MVCC 的核心读取方式。\n\n本节点只承载模型本体；各 DBMS 的一致性读实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 一致性读、Oracle 读一致性（Read Consistency）。' },
  { conceptId: 'concept_concurrency', label: '并发 / concurrency', dims: ['并发', '事务'],
    def: '**并发 / concurrency**\n多个事务**同时**访问同一数据库时的执行模式。数据库通过隔离、锁、MVCC 等机制在并发下保证数据一致性与一定吞吐量。并发控制的目标是避免写-写/读写冲突与异常。\n\n本节点只承载模型本体；各 DBMS 的并发模型作为实例挂其下。',
    example: '**同构实例**：多事务并发读写同一行、连接池并发会话。' },
  { conceptId: 'concept_victim', label: '受害者 / victim', dims: ['并发', '死锁'],
    def: '**受害者 / victim**\n死锁检测时，被选中**回滚以打破环路**的事务方。死锁检测器在等待图中找到环后，挑选代价较低的一方作为 victim 中止，释放其持有的锁让其余事务继续。\n\n本节点只承载模型本体；各 DBMS 的 victim 选择策略作为实例挂其下。',
    example: '**同构实例**：InnoDB 死锁检测挑选回滚代价小的事务为 victim。' },
  { conceptId: 'concept_lost_update', label: '丢失更新 / lost update', dims: ['事务', '并发', '异常'],
    def: '**丢失更新 / lost update**\n并发事务的**写-写冲突**异常：两个事务各自读取同一值、分别修改并写回，后写覆盖了先写的修改，导致先写者的更新"丢失"。需通过加锁或原子更新避免。\n\n本节点只承载模型本体；各 DBMS 的丢失更新场景与防护作为实例挂其下。',
    example: '**同构实例**：`UPDATE ... SET cnt=cnt+1 WHERE` 替代先读后写；`SELECT ... FOR UPDATE` 防丢失更新。' },
  { conceptId: 'concept_global_transaction', label: '全局事务 / global transaction', dims: ['事务', '分布式'],
    def: '**全局事务 / global transaction（分布式事务）**\n跨**多个资源管理器/数据库**的事务，需保证所有参与者要么全部提交、要么全部回滚。典型由两阶段提交（2PC）协调。\n\n本节点只承载模型本体；各 DBMS 的分布式/全局事务实现作为实例挂其下。',
    example: '**同构实例**：XA 事务、两阶段提交协调者。' },
  { conceptId: 'concept_transaction_id', label: '事务ID / transaction ID', dims: ['事务', '标识'],
    def: '**事务ID / transaction ID**\n唯一标识一个事务的编号，用于 MVCC 版本链、锁归属、回滚段与日志定位。事务ID 单调递增，常编码可见性判断（如"早于我的可见、晚于我的不可见"）。\n\n本节点只承载模型本体；各 DBMS 的事务ID 机制作为实例挂其下。',
    example: '**同构实例**：InnoDB `trx_id`、PostgreSQL `xid`、Oracle SCN。' },
  { conceptId: 'concept_read_only_transaction', label: '只读事务 / read-only transaction', dims: ['事务'],
    def: '**只读事务 / read-only transaction**\n声明期间**不执行任何写操作**的事务，数据库可据此优化（跳过回滚段分配、采用快照、允许只读副本路由等）。\n\n本节点只承载模型本体；各 DBMS 的只读事务优化作为实例挂其下。',
    example: '**同构实例**：`START TRANSACTION READ ONLY`、报表查询事务。' },
];

const MAPS = [
  { ref: 'n_ag24bbkc', conceptId: 'concept_transaction' },
  { ref: 'mysql_tx_lifecycle', conceptId: 'concept_transaction_lifecycle' },
  { ref: 'k_1784456386575_b7hxoh', conceptId: 'concept_transaction_management' },
  { ref: 'mysql_glossary_read_phenomena_n0vs4m', conceptId: 'concept_read_phenomena' },
  { ref: 'mysql_tx_read_phenomena', conceptId: 'concept_read_phenomena' },
  { ref: 'mysql_glossary_consistent_read_gsmmdj', conceptId: 'concept_consistent_read' },
  { ref: 'mysql_glossary_concurrency_uoyivs', conceptId: 'concept_concurrency' },
  { ref: 'mysql_glossary_victim_18xqeg', conceptId: 'concept_victim' },
  { ref: 'k_1782928892375_1vgg04', conceptId: 'concept_lost_update' },
  { ref: 'mysql_glossary_global_transaction_4i1f06', conceptId: 'concept_global_transaction' },
  { ref: 'mysql_glossary_transaction_id_1aa5a7', conceptId: 'concept_transaction_id' },
  { ref: 'mysql_glossary_read_only_transaction_2kf2kq', conceptId: 'concept_read_only_transaction' },
  { ref: 'mysql_glossary_mdl_braceg', conceptId: 'concept_metadata_lock' },
];

// 真实重复（已在本体树持有，摘 MySQL 引用）
const DUPS = ['k_dict_tr918oc6', 'k_dict_xnl4u9m0', 'k_dict_qbyc557y'];

// 1) 新建概念
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

// 2) 改写实例 + 重挂
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
    { id: 'def', label: '定义（MySQL 实例）',
      content: `**${instLabel}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${concept.label}」概念节点（数据库原理）。` },
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

// 3) 摘重复引用
let dupRemoved = 0;
for (const ref of DUPS) {
  const detached = detachByRef(ref);
  if (detached) { dupRemoved++; console.log('dup removed from MySQL:', ref, detached.name); }
  else console.log('dup not found under MySQL (ok if already gone):', ref);
}

// 4) 清理 MySQL 空容器
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
console.log('removed empty MySQL containers:', removedEmpty, '| mapped:', mapped, '| skipped:', skipped, '| dupRemoved:', dupRemoved);

// 5) edges
for (const it of MAPS) {
  const id = `rel:${it.conceptId}:instance-of:${it.ref}`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: it.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
  }
}

// 6) governance
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
    pathHint: [...DBP_HINT, it.label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `通用事务/并发概念，自 MySQL 事务簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, pool[it.ref].label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 事务簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
  });
}
for (const ref of DUPS) {
  upsertPlacement({
    id: `placement:dup-removed:${ref}`, nodeId: ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: DBP, canonicalTreeEntryId: null,
    pathHint: [...DBP_HINT], confidence: 'high', rule: 'cross-domain-dup-remove-v1',
    rationale: `真实重复节点，已摘 MySQL 引用；真身归属本体（数据库原理）。`,
  });
}

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
console.log('peel-mysql-transaction complete: concepts+=', createdConcepts.length, 'instances=', mapped, 'dupRemoved=', dupRemoved);
