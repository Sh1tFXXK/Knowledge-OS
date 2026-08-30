// 剥离 MySQL 域 · 查询处理与 SQL 操作簇（2026-08-23，全面扫描第四批）
// 覆盖：查询优化器/执行计划/全表扫描/选择性/索引提示/解析器/JOIN/子查询/增删改/截断。
// 范式同前批。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-query-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理', '查询处理'];

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
const dbpNode = findNode(DBP);

const NEWS = [
  { conceptId: 'concept_query_optimizer', label: '查询优化器 / query optimizer', dims: ['查询处理', '性能'],
    def: '**查询优化器 / query optimizer**\n数据库引擎中**将 SQL 转换为高效执行计划**的子系统：基于统计信息与代价模型，枚举候选计划并挑选代价最低者（扫描方式、连接顺序、索引使用等）。优化器质量直接决定查询性能。\n\n本节点只承载模型本体；各 DBMS 的优化器作为实例挂其下。',
    example: '**同构实例**：MySQL Optimizer、PostgreSQL Planner、Oracle CBO。' },
  { conceptId: 'concept_query_execution_plan', label: '查询执行计划 / query execution plan', dims: ['查询处理'],
    def: '**查询执行计划 / query execution plan**\n优化器产出的**具体操作步骤序列**：标明访问哪些表、走哪种扫描（全表/索引）、连接算法（NLJ/Hash/Merge）、排序与临时表等。通过 `EXPLAIN` 等可观测。\n\n本节点只承载模型本体；各 DBMS 的执行计划表示作为实例挂其下。',
    example: '**同构实例**：MySQL `EXPLAIN` 输出、PostgreSQL `EXPLAIN ANALYZE`。' },
  { conceptId: 'concept_full_table_scan', label: '全表扫描 / full table scan', dims: ['查询处理', '访问路径'],
    def: '**全表扫描 / full table scan**\n不带可用索引过滤时，**顺序读取整张表**的所有行以匹配条件。实现简单但通常代价高，在小表或高选择度过滤缺失时不可避免，大表应尽量避免。\n\n本节点只承载模型本体；各 DBMS 的全表扫描实现作为实例挂其下。',
    example: '**同构实例**：无索引 `WHERE`、或优化器判定扫描比索引回表更便宜。' },
  { conceptId: 'concept_selectivity', label: '选择性 / selectivity', dims: ['查询处理', '统计'],
    def: '**选择性 / selectivity**\n某过滤条件能**筛掉多少行**的度量（0~1，越接近 0 越具选择性）。高选择性的列更适合建索引；优化器用其估算中间结果行数与代价。\n\n本节点只承载模型本体；各 DBMS 的选择性估算作为实例挂其下。',
    example: '**同构实例**：`WHERE status=1` 命中极少行 => 高选择性。' },
  { conceptId: 'concept_index_hint', label: '索引提示 / index hint', dims: ['查询处理', '索引'],
    def: '**索引提示 / index hint**\n用户**显式建议**优化器使用（或忽略）某些索引的语法，用于纠正优化器因统计信息过期而做出的错误计划选择。属对优化器的软/硬干预。\n\n本节点只承载模型本体；各 DBMS 的索引提示语法作为实例挂其下。',
    example: '**同构实例**：MySQL `USE INDEX`/`FORCE INDEX`、Oracle 提示 `/*+ INDEX() */`。' },
  { conceptId: 'concept_parser', label: '解析器 / parser', dims: ['查询处理', '编译'],
    def: '**解析器 / parser**\n数据库服务层中将** SQL 文本解析为语法树（AST）**并进行词法/语法/语义校验的组件，是查询处理流水线的第一环，输出交由优化器继续处理。\n\n本节点只承载模型本体；各 DBMS 的解析器作为实例挂其下。',
    example: '**同构实例**：词法分析 + 语法分析（yacc/bison 类）+ 语义检查。' },
  { conceptId: 'concept_join', label: '连接 / join', dims: ['SQL', '查询处理', '关系运算'],
    def: '**连接 / join**\n关系代数中按**关联条件组合多张表行**的运算。常见内连接、左/右/全外连接、交叉连接；实现上对应 NLJ、Hash Join、Merge Join 等算法。\n\n本节点只承载模型本体；各 DBMS 的连接语法与算法作为实例挂其下。',
    example: '**同构实例**：`INNER JOIN`/`LEFT JOIN`、嵌套循环/哈希/归并连接。' },
  { conceptId: 'concept_subquery', label: '子查询 / subquery', dims: ['SQL', '查询处理'],
    def: '**子查询 / subquery**\n**嵌套在另一 SQL 语句中**的查询，可出现在 `WHERE`/`FROM`/`SELECT` 等子句。分相关子查询与非相关子查询，优化器可能将其改写为连接或半连接。\n\n本节点只承载模型本体；各 DBMS 的子查询支持与改写作为实例挂其下。',
    example: '**同构实例**：`WHERE id IN (SELECT ...)`、派生表（FROM 子查询）。' },
  { conceptId: 'concept_insert', label: '插入 / insert', dims: ['SQL', 'DML'],
    def: '**插入 / insert**\n向表中**新增行**的 DML 操作。支持单行/多行插入、INSERT ... SELECT、ON DUPLICATE KEY UPDATE 等变体；涉及索引维护、约束检查与自增分配。\n\n本节点只承载模型本体；各 DBMS 的插入实现作为实例挂其下。',
    example: '**同构实例**：`INSERT INTO t(col) VALUES(...)`、批量插入。' },
  { conceptId: 'concept_delete', label: '删除 / delete', dims: ['SQL', 'DML'],
    def: '**删除 / delete**\n按条件**移除表中行**的 DML 操作。需注意外键级联、事务回滚与大量删除时的锁/日志开销；大批量删除常以分批或 TRUNCATE 替代。\n\n本节点只承载模型本体；各 DBMS 的删除实现作为实例挂其下。',
    example: '**同构实例**：`DELETE FROM t WHERE ...`、带 LIMIT 的分批删除。' },
  { conceptId: 'concept_truncate', label: '截断 / truncate', dims: ['SQL', 'DDL'],
    def: '**截断 / truncate**\n**清空整张表**的操作，通常比 `DELETE` 更快（不逐行记录 undo、直接释放/重建存储），但属 DDL、不可带条件、且多数实现不可回滚到逐行级别。\n\n本节点只承载模型本体；各 DBMS 的 TRUNCATE 语义作为实例挂其下。',
    example: '**同构实例**：`TRUNCATE TABLE t`、与 `DELETE` 在事务性上的差异。' },
  { conceptId: 'concept_drop', label: '落下 / drop', dims: ['SQL', 'DDL'],
    def: '**落下 / drop**\n**删除数据库对象**（表、视图、索引、库等）的 DDL 操作，会移除对象定义与数据，通常不可逆（除非有回收站/闪回机制）。\n\n本节点只承载模型本体；各 DBMS 的 DROP 语义作为实例挂其下。',
    example: '**同构实例**：`DROP TABLE`/`DROP INDEX`，级联 `CASCADE` 选项。' },
];

const MAPS = [
  { ref: 'k_1782033508063_xspnmd', conceptId: 'concept_query_optimizer' },
  { ref: 'mysql_glossary_query_execution_plan_17fdf4', conceptId: 'concept_query_execution_plan' },
  { ref: 'k_dict_jan17ieo', conceptId: 'concept_full_table_scan' },
  { ref: 'mysql_glossary_selectivity_4k9ksu', conceptId: 'concept_selectivity' },
  { ref: 'mysql_glossary_index_hint_1nr0pl', conceptId: 'concept_index_hint' },
  { ref: 'k_1782033245872_81floi', conceptId: 'concept_parser' },
  { ref: 'demo_join', conceptId: 'concept_join' },
  { ref: 'demo_subquery', conceptId: 'concept_subquery' },
  { ref: 'k_dict_ntqiff2s', conceptId: 'concept_truncate' },
  { ref: 'k_dict_t6m62us4', conceptId: 'concept_drop' },
  { ref: 'k_dict_qvf5c9q7', conceptId: 'concept_delete' },
  { ref: 'k_dict_pzcms560', conceptId: 'concept_insert' },
  { ref: 'mysql_glossary_table_statistics_1c30y8', conceptId: 'concept_optimizer_statistics' },
];

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
    rationale: `通用查询/SQL 概念，自 MySQL 查询簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, pool[it.ref].label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 查询簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
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
console.log('peel-mysql-query complete: concepts+=', createdConcepts.length, 'instances=', mapped);
