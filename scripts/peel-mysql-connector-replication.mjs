// 剥离 MySQL 域 · 连接/复制/分区/存储引擎簇（2026-08-23，全面扫描第六批，收尾）
// 覆盖：连接/连接池、复制、分区、存储引擎。真实重复（LSN/日志）摘 MySQL 引用。
// 明确保留（不剥）的 MySQL 实现细节：安全/Kerberos 簇、各类物理文件、InnoDB 页/行格式/表空间类型、
//   Buffer Pool 内部结构、客户端库/连接对象、优化器内部（sort buffer/ICP/计划稳定性）、MySQL 专属 SQL 语法。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-connector-replication-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理'];

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
const dbpNode = findNode(DBP);

const NEWS = [
  { conceptId: 'concept_connection', label: '连接 / connection', dims: ['连接', '访问'],
    def: '**连接 / connection**\n客户端与数据库服务器之间建立的**会话通道**，承载认证、语句收发与事务状态。连接是并发访问与权限隔离的基本单元。\n\n本节点只承载模型本体；各 DBMS 的连接机制作为实例挂其下。',
    example: '**同构实例**：TCP 连接 + 握手认证、连接属性（字符集/时区）。' },
  { conceptId: 'concept_connection_pool', label: '连接池 / connection pool', dims: ['连接', '性能'],
    def: '**连接池 / connection pool**\n预先建立并**复用一组数据库连接**的缓冲机制，避免频繁创建/销毁连接的开销，限制并发连接上限、提升吞吐。\n\n本节点只承载模型本体；各 DBMS/驱动的连接池作为实例挂其下。',
    example: '**同构实例**：HikariCP、Druid、MySQL 连接池。' },
  { conceptId: 'concept_partitioning', label: '分区 / partitioning', dims: ['存储', '性能'],
    def: '**分区 / partitioning**\n将**一张大表在物理上按规则（范围/列表/哈希/键值）拆分为多个子片段**，逻辑上仍是一张表，但可提升查询裁剪、维护与并行能力。\n\n本节点只承载模型本体；各 DBMS 的分区实现作为实例挂其下。',
    example: '**同构实例**：RANGE/LIST/HASH/KEY 分区、分区裁剪（pruning）。' },
  { conceptId: 'concept_storage_engine', label: '存储引擎 / storage engine', dims: ['存储', '体系结构'],
    def: '**存储引擎 / storage engine**\n数据库中**负责底层数据存储、索引与访问**的可插拔组件，不同引擎在事务、锁、压缩、缓存策略上各有取舍。同一数据库可混用多种引擎。\n\n本节点只承载模型本体；各 DBMS 的存储引擎（如 InnoDB、MyISAM）作为实例挂其下。',
    example: '**同构实例**：MySQL InnoDB（事务/行锁）、MyISAM（表锁/全文）、RocksDB 等可插拔引擎。' },
];

const MAPS = [
  { ref: 'mysql_glossary_connection_fqlzvd', conceptId: 'concept_connection' },
  { ref: 'k_dict_h20fqa9t', conceptId: 'concept_connection_pool' },
  { ref: 'k_1787326496104_zbtx44', conceptId: 'concept_replication' },
  { ref: 'k_1787326536038_77rvww', conceptId: 'concept_partitioning' },
  { ref: 'demo_innodb', conceptId: 'concept_storage_engine' },
  { ref: 'demo_myisam', conceptId: 'concept_storage_engine' },
  { ref: 'k_1787201710517_se61sz', conceptId: 'concept_storage_engine' },
];

const DUPS = ['k_dict_g7onhohj', 'k_dict_5d4mlf9q'];

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

let dupRemoved = 0;
for (const ref of DUPS) {
  const detached = detachByRef(ref);
  if (detached) { dupRemoved++; console.log('dup removed from MySQL:', ref, detached.name); }
  else console.log('dup not found under MySQL (ok if already gone):', ref);
}

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

for (const it of MAPS) {
  const id = `rel:${it.conceptId}:instance-of:${it.ref}`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: it.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
  }
}

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
    rationale: `通用连接/复制/分区/存储引擎概念，自 MySQL 簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, pool[it.ref].label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
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
console.log('peel-mysql-connector-replication complete: concepts+=', createdConcepts.length, 'instances=', mapped, 'dupRemoved=', dupRemoved);
