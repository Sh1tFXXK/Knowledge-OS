// 剥离 MySQL 域第四批混合知识点（2026-08-23）：备份/恢复/生命周期簇
// 集中模式：本体挂「数据库原理」(database_principles)（缓冲区→操作系统域），
// MySQL 节点改写为实例并作为子文件挂本体下；备份分类体系作为 concept_backup 的子本体嵌套；
// 插入缓冲×2 作为额外实例并入已有 concept_change_buffer。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-backup-lifecycle-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const OS = 'theory_domain_operating_systems';
const HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理'];
const OS_HINT = ['计算机科学', '系统组织', '操作系统'];

const C = (conceptId, label, dims, def, example, parentConcept) => ({
  conceptId, label, dims, def, example, domain: DBP, hint: HINT, parentConcept,
  instances: [],
});
const I = (concept, ref, label) => { concept.instances.push(label ? { ref, label } : { ref }); return concept; };

const backup = I(C('concept_backup', '备份 / backup', ['备份恢复', '运维'],
  '**备份 / backup**\n把数据库（或任意数据系统）的数据与必要元数据**复制到独立介质**，以便在数据损坏、误操作或灾难时恢复的策略与操作。按维度分类：按对业务的影响（热/温/冷备份）、按内容形态（物理/逻辑备份）、按覆盖范围（完整/增量/部分备份）等。\n\n本节点只承载模型本体；各系统实例与分类子本体挂其下。',
  '**同构实例**：MySQL Enterprise Backup / mysqldump、pg_dump / pg_basebackup、Oracle RMAN、xtrabackup。'), 'k_dict_vg1hm4yv');
const hotBackup = I(C('concept_hot_backup', '热备份 / hot backup', ['备份恢复'],
  '**热备份 / hot backup**\n在数据库**保持完全可读写**、业务不中断的前提下进行的备份。需要备份工具与存储引擎配合处理备份期间发生的修改（如基于 redo 的一致性apply）。与温备份（只读不中断）、冷备份（停机备份）相对。',
  '**同构实例**：MySQL Enterprise Backup 热备份、Oracle RMAN 热备、xtrabackup --backup。'), 'k_dict_z9h14mh0');
const warmBackup = I(C('concept_warm_backup', '温备份 / warm backup', ['备份恢复'],
  '**温备份 / warm backup**\n在数据库**仅允许读、禁止写**（加锁或降级只读）状态下进行的备份：业务可查询但不可修改，写入被暂停以保证备份一致性。影响介于热备与冷备之间。',
  '**同构实例**：MySQL `FLUSH TABLES WITH READ LOCK` 期间备份、各 RDBMS 只读窗口备份。'), 'mysql_glossary_warm_backup_1sjsyn');
const coldBackup = I(C('concept_cold_backup', '冷备份 / cold backup', ['备份恢复'],
  '**冷备份 / cold backup**\n在数据库**完全停止**（shutdown）后对数据文件的备份：一致性最简单可靠（无并发修改），代价是业务中断。常用于全量基线备份或小型系统。',
  '**同构实例**：停机后拷贝 MySQL datadir、离线文件系统快照。'), 'k_dict_88aa29dg');
const logicalBackup = I(C('concept_logical_backup', '逻辑备份 / logical backup', ['备份恢复'],
  '**逻辑备份 / logical backup**\n以**逻辑结构**（CREATE 语句、INSERT 行数据等可重放的 SQL 或逻辑表示）形式重建数据内容的备份。可跨版本/跨平台恢复、可选择性恢复对象，但备份与恢复速度通常慢于物理备份。',
  '**同构实例**：mysqldump、pg_dump、expdp（Oracle Data Pump 逻辑模式）。'), 'k_dict_wv1o918s');
const physicalBackup = C('concept_physical_backup', '物理备份 / physical backup', ['备份恢复'],
  '**物理备份 / physical backup**\n直接复制**物理存储文件**（数据文件、日志文件、页/块）的备份。速度快、体积大，恢复依赖同版本同布局；原始备份（raw backup）即不加工的物理拷贝。',
  '**同构实例**：MySQL Enterprise Backup 物理备份、pg_basebackup、xtrabackup、块级快照。');
physicalBackup.instances.push({ ref: 'mysql_glossary_physical_backup_1o7b7v' }, { ref: 'mysql_glossary_raw_backup_1s82jm' });
const fullBackup = I(C('concept_full_backup', '完整备份 / full backup', ['备份恢复'],
  '**完整备份 / full backup**\n覆盖**全部数据**的备份，是备份策略的基线；后续增量/差异备份都以其为起点。可靠但体积与耗时最大。',
  '**同构实例**：各 RDBMS 的全量备份（RMAN level 0、pg_basebackup、MEB 全量）。'), 'mysql_glossary_full_backup_1pi94c');
const incrementalBackup = I(C('concept_incremental_backup', '增量备份 / incremental backup', ['备份恢复'],
  '**增量备份 / incremental backup**\n只备份**自上一次（全量或增量）备份以来发生变化**的部分，体积小、速度快；恢复时需按链条依次apply，恢复流程复杂、依赖链完整。',
  '**同构实例**：MEB/xtrabackup 增量、RMAN level 1、rsync 差量同步思想。'), 'mysql_glossary_incremental_backup_3gko1n');
const partialBackup = I(C('concept_partial_backup', '部分备份 / partial backup', ['备份恢复'],
  '**部分备份 / partial backup**\n只备份**部分数据**（某些表、表空间或数据库）的备份，用于针对性快速恢复或迁移热点对象；不能单独用于整库灾难恢复。',
  '**同构实例**：MEB 部分表空间备份、pg_dump -t 指定表。'), 'mysql_glossary_partial_backup_bplu20');
const compressedBackup = I(C('concept_compressed_backup', '压缩备份 / compressed backup', ['备份恢复', '压缩'],
  '**压缩备份 / compressed backup**\n对备份数据施加**压缩**以减小体积与传输量的备份；恢复时解压。与透明压缩、数据本身压缩率相互叠加，是备份系统的常规优化。',
  '**同构实例**：MEB 压缩备份、gzip/zstd 压缩的 dump、RMAN 压缩备份集。'), 'mysql_glossary_compressed_backup_12f16e');

const restore = I(C('concept_restore', '恢复 / restore', ['备份恢复', '恢复'],
  '**恢复 / restore**\n把数据系统从备份**重建回某个状态**的过程：将备份文件/逻辑数据装回存储并使其可用。与「前滚到时间点」（point-in-time recovery / roll forward）配合可将系统推进到故障前任意时刻。广义恢复还包括崩溃恢复（用日志自动一致化）。',
  '**同构实例**：MEB/mysqlbackup --copy-back、pg_restore、RMAN RESTORE。'), 'k_dict_lin6ue94');
const pitr = I(C('concept_point_in_time_recovery', '时间点恢复 / point-in-time recovery', ['备份恢复', '恢复'],
  '**时间点恢复 / PITR**\n以一次全量/基础备份为起点，**重放其后的日志**（如 binlog、WAL、归档 redo）把系统精确推进到过去某一时间点的技术。用于误操作（误删表、错误 UPDATE）后的精准回退，是备份策略的核心能力。',
  '**同构实例**：MySQL binlog 前滚 PITR、PostgreSQL WAL replay（recovery_target_time）、Oracle 闪回/不完全恢复。'), 'mysql_glossary_point_in_time_recovery_eadx3e');
const crashRecovery = I(C('concept_crash_recovery', '崩溃恢复 / crash recovery', ['恢复', '持久化', '事务'],
  '**崩溃恢复 / crash recovery**\n系统在意外崩溃/断电后重启时，利用**预写日志**自动恢复到一致状态的过程：重放（redo）已提交事务的修改、撤销（undo）未提交事务的修改（ARIES 三段式：分析/重做/回滚）。',
  '**同构实例**：InnoDB 崩溃恢复、PostgreSQL WAL crash recovery、数据库恢复理论（ARIES 协议）。'), 'mysql_glossary_crash_recovery_139bco');
const crash = I(C('concept_crash', '崩溃 / crash', ['恢复', '可用性', '生命周期'],
  '**崩溃 / crash**\n进程或系统因故障（断电、kill、内部错误）**意外终止**的事件，此时内存中未落盘的修改丢失、数据可能处于不一致状态，需要崩溃恢复机制在重启时重建一致性。与受控的优雅关闭（clean shutdown）相对。',
  '**同构实例**：数据库进程崩溃后的自动恢复、OS 崩溃后的 fsck/journal replay。'), 'mysql_glossary_crash_7aq2mw');
const startup = I(C('concept_startup', '启动 / startup', ['生命周期'],
  '**启动 / startup**\n服务/数据库实例从停止状态进入可用状态的**生命周期阶段**：加载配置、初始化内存结构、打开/恢复数据文件、必要时执行崩溃恢复、开始接受连接。与关闭（shutdown）相对；启动速度与恢复窗口直接相关。',
  '**同构实例**：`mysqld` 启动序列、Oracle STARTUP NOMOUNT/MOUNT/OPEN 分阶段启动、PostgreSQL postmaster 启动与恢复。'), 'mysql_glossary_startup_154aqa');
const quiesce = I(C('concept_quiesce', '静默 / quiesce', ['生命周期', '并发'],
  '**静默 / quiesce**\n让系统进入**暂时停止活动**（暂停写、排空在途请求）的受控状态，以便执行需要一致快照的管理操作（备份、升级、迁移），完成后恢复活动。与完全关闭相对，开销更小。',
  '**同构实例**：`ALTER INSTANCE ... QUIESCE`、I/O 快照前的静默、虚拟机快照静默（quiesced snapshot）。'), 'mysql_glossary_quiesce_1ujs11');
const buffer = I({
  ...C('concept_buffer', '缓冲区 / buffer', ['缓冲', '内存管理', '操作系统'],
    '**缓冲区 / buffer**\n在速度不匹配的两层（内存 ↔ 磁盘、生产者 ↔ 消费者）之间暂存数据的**内存区域**，以批量化和缓存复用摊薄慢速层的访问成本。按用途分为页缓存、日志缓冲、排序缓冲等；配套机制包括脏页刷写与淘汰（eviction）策略。',
    '**同构实例**：OS page cache、InnoDB buffer pool/日志缓冲、TCP 缓冲、I/O 调度缓冲。'),
  domain: OS, hint: OS_HINT,
}, 'k_dict_muxlhpv2');

const ITEMS = [
  backup, hotBackup, warmBackup, coldBackup, logicalBackup, physicalBackup,
  fullBackup, incrementalBackup, partialBackup, compressedBackup,
  restore, pitr, crashRecovery, crash, startup, quiesce, buffer,
];
// 嵌套关系：备份分类作为 concept_backup 的子本体
const NEST = new Map([
  ['concept_hot_backup', 'concept_backup'], ['concept_warm_backup', 'concept_backup'],
  ['concept_cold_backup', 'concept_backup'], ['concept_logical_backup', 'concept_backup'],
  ['concept_physical_backup', 'concept_backup'], ['concept_full_backup', 'concept_backup'],
  ['concept_incremental_backup', 'concept_backup'], ['concept_partial_backup', 'concept_backup'],
  ['concept_compressed_backup', 'concept_backup'],
]);
// 额外实例：插入缓冲×2 并入已有 concept_change_buffer
const EXTRA_INSTANCES = {
  concept_change_buffer: [
    { ref: 'mysql_glossary_insert_buffer_1xx0p8', label: 'MySQL 插入缓冲区 / MySQL insert buffer' },
    { ref: 'mysql_glossary_insert_buffering_m9lmge', label: 'MySQL 插入缓冲 / MySQL insert buffering' },
  ],
};

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
}
const allInst = [];
for (const it of ITEMS) for (const inst of it.instances) allInst.push({ it, inst });
for (const [cid, list] of Object.entries(EXTRA_INSTANCES)) for (const inst of list) allInst.push({ it: { conceptId: cid, label: pool[cid].label, domain: DBP }, inst });
for (const { it, inst } of allInst) {
  const m = pool[inst.ref];
  if (!m) throw new Error(`缺少 MySQL 节点 ${inst.ref}`);
  const tabs = (m.card && m.card.tabs) || [];
  const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || '';
  inst.label = inst.label || `MySQL ${m.label}`;
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
function instanceChild(inst, key) {
  const existing = detachByRef(inst.ref);
  if (existing) {
    existing.name = pool[inst.ref].label;
    existing.projection = false;
    delete existing.view; delete existing.projectionKind; delete existing.sourceNodeId;
    return existing;
  }
  return { id: `tree_mysql_instance_${key}`, name: pool[inst.ref].label, count: 0, nodeRef: inst.ref, children: [] };
}

for (const it of ITEMS) {
  const entry = {
    id: `tree_${it.conceptId}`, name: it.label, count: 0, nodeRef: it.conceptId,
    children: it.instances.map((inst, i) => instanceChild(inst, `${it.conceptId}_${i}`)),
  };
  const parent = NEST.has(it.conceptId) ? findByRef(NEST.get(it.conceptId)) : findNode(it.domain);
  if (!parent) throw new Error(`未找到父节点 for ${it.label}`);
  parent.children = parent.children || [];
  parent.children.push(entry);
}
// 额外实例并入已有本体条目
for (const [cid, list] of Object.entries(EXTRA_INSTANCES)) {
  const entry = findByRef(cid);
  if (!entry) throw new Error(`未找到本体条目 ${cid}`);
  for (const inst of list) entry.children.push(instanceChild(inst, `${cid}_x${entry.children.length}`));
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
for (const { it, inst } of allInst) {
  const id = `rel:${it.conceptId}:instance-of:${inst.ref}`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: inst.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
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
    canonicalParentNodeId: NEST.has(it.conceptId) ? NEST.get(it.conceptId) : it.domain,
    canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...it.hint, ...(NEST.has(it.conceptId) ? ['备份 / backup'] : []), it.label],
    confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: '本体属数据库原理域，自 MySQL 混合知识点剥离；MySQL 侧保留为实例并 instance-of 回指。',
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
console.log('peel-mysql-backup-lifecycle complete:', ITEMS.length, 'concepts,', allInst.length, 'instances');
