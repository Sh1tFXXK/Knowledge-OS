// 剥离 MySQL 域 · 关系对象与索引簇（2026-08-23，全面扫描第五批）
// 覆盖：表/列/行/数据库、各类索引（B+树/组合/普通/前缀/降序/虚拟/列/全文/主键）、索引统计/基数/填充因子、
//       生成列/临时表/参照完整性/父子表。
// 范式同前批。InnoDB 页/行格式/表空间文件/各类"种类"容器等 MySQL 实现细节保留不剥。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-relational-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理', '关系模型'];

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
const dbpNode = findNode(DBP);

const NEWS = [
  { conceptId: 'concept_table', label: '表 / table', dims: ['关系模型', '数据库对象'],
    def: '**表 / table**\n关系数据库中以**行和列组织的二维数据集合**，是存储与查询的基本单位。表由模式（列定义、类型、约束）与数据（行）构成，可建立索引、键与关系。\n\n本节点只承载模型本体；各 DBMS 的表实现作为实例挂其下。',
    example: '**同构实例**：堆表、索引组织表（IOT）、MySQL/InnoDB 聚簇表。' },
  { conceptId: 'concept_column', label: '列 / column', dims: ['关系模型', '数据库对象'],
    def: '**列 / column**\n表中的**一个属性/字段**，定义了该列的名称、数据类型与约束（NOT NULL、默认值等）。一行由若干列的值组成。\n\n本节点只承载模型本体；各 DBMS 的列定义作为实例挂其下。',
    example: '**同构实例**：`INT id`、`VARCHAR(255) name`、生成列。' },
  { conceptId: 'concept_row', label: '行 / row', dims: ['关系模型', '数据库对象'],
    def: '**行 / row（元组 tuple）**\n表中的**一条完整记录**，由同一行各列的值组合而成。行是增删改与锁（行级锁）的基本单位。\n\n本节点只承载模型本体；各 DBMS 的行存储作为实例挂其下。',
    example: '**同构实例**：InnoDB 行格式记录、堆表行指针。' },
  { conceptId: 'concept_database', label: '数据库 / database', dims: ['数据库对象', '容器'],
    def: '**数据库 / database（schema 容器）**\n一组**相关联表、视图、索引等对象的命名容器**，提供命名空间与权限边界。在 MySQL 中 database 与 schema 基本同义。\n\n本节点只承载模型本体；各 DBMS 的 database/schema 概念作为实例挂其下。',
    example: '**同构实例**：MySQL `CREATE DATABASE`、PostgreSQL schema、Oracle schema/user。' },
  { conceptId: 'concept_btree_index', label: 'B+树索引 / B-tree index', dims: ['索引', '数据结构'],
    def: '**B+树索引 / B-tree index**\n以 **B+树**为底层结构的索引，所有数据落在叶子节点且有序链表串联，支持等值、范围与排序查询，是关系库默认的主流索引结构。\n\n本节点只承载模型本体；各 DBMS 的 B+树索引实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 聚簇/二级索引、PostgreSQL B-tree（默认）。' },
  { conceptId: 'concept_composite_index', label: '组合索引 / composite index', dims: ['索引'],
    def: '**组合索引 / composite index（复合/连接索引）**\n建立在**多个列**上的索引，列顺序决定最左前缀匹配规则，可用于多列过滤、排序与覆盖。又称复合索引、concatenated index。\n\n本节点只承载模型本体；各 DBMS 的组合索引作为实例挂其下。',
    example: '**同构实例**：`INDEX(a,b,c)` 的最左前缀原则。' },
  { conceptId: 'concept_secondary_index', label: '二级索引 / secondary index', dims: ['索引'],
    def: '**二级索引 / secondary index（普通索引）**\n非聚集/非主键的索引，叶子节点保存索引列值与指向数据行的指针（或主键值），查询需"回表"获取其余列。与聚簇索引相对。\n\n本节点只承载模型本体；各 DBMS 的二级索引作为实例挂其下。',
    example: '**同构实例**：InnoDB 二级索引回表主键、普通 `INDEX`。' },
  { conceptId: 'concept_prefix_index', label: '前缀索引 / prefix index', dims: ['索引'],
    def: '**前缀索引 / prefix index**\n只对列值的**前 N 个字符/字节**建索引，节省空间但无法用于后缀匹配与覆盖扫描。常用于长字符串/二进制列。\n\n本节点只承载模型本体；各 DBMS 的前缀索引作为实例挂其下。',
    example: '**同构实例**：`INDEX(name(20))`、列前缀索引。' },
  { conceptId: 'concept_descending_index', label: '降序索引 / descending index', dims: ['索引'],
    def: '**降序索引 / descending index**\n显式按**降序**维护的索引，使 `ORDER BY col DESC` 可直接利用而免额外排序。常与升序索引配合形成混合排序键。\n\n本节点只承载模型本体；各 DBMS 的降序索引作为实例挂其下。',
    example: '**同构实例**：`INDEX(col DESC)`、混合 `(a ASC, b DESC)`。' },
  { conceptId: 'concept_virtual_index', label: '虚拟索引 / virtual index', dims: ['索引', '调优'],
    def: '**虚拟索引 / virtual index**\n**不实际构建物理结构**的"假"索引，仅用于让优化器评估某索引对计划的影响（如"假设建索引后计划如何"），便于调优决策。\n\n本节点只承载模型本体；各 DBMS 的虚拟/假索引作为实例挂其下。',
    example: '**同构实例**：Oracle 虚拟索引、MySQL `USE INDEX` 评估。' },
  { conceptId: 'concept_column_index', label: '列索引 / column index', dims: ['索引'],
    def: '**列索引 / column index**\n建立在**单个列**上的索引，是最基础的索引形式，加速该列的等值/范围/排序访问。\n\n本节点只承载模型本体；各 DBMS 的列索引作为实例挂其下。',
    example: '**同构实例**：`INDEX(col)`、单列 B+树。' },
  { conceptId: 'concept_index_statistics', label: '索引统计 / index statistics', dims: ['索引', '统计'],
    def: '**索引统计 / index statistics**\n描述索引数据分布的信息（基数、直方图、空值率等），供优化器估算选择性与代价。统计信息过期会导致错误计划。\n\n本节点只承载模型本体；各 DBMS 的索引统计作为实例挂其下。',
    example: '**同构实例**：`ANALYZE TABLE`、自动统计收集。' },
  { conceptId: 'concept_cardinality', label: '基数 / cardinality', dims: ['索引', '统计'],
    def: '**基数 / cardinality**\n某列或索引中**不同值的数量（NDV）**。高基数（接近行数）通常更适合索引；低基数列建索引收益有限。是选择性估算的核心输入。\n\n本节点只承载模型本体；各 DBMS 的基数统计作为实例挂其下。',
    example: '**同构实例**：`SHOW INDEX` 的 Cardinality 列。' },
  { conceptId: 'concept_fill_factor', label: '填充因子 / fill factor', dims: ['索引', '存储'],
    def: '**填充因子 / fill factor**\n建/重建索引时为**页预留的空闲空间比例**，用于减少后续插入导致的页分裂。写入频繁的场景调低填充因子可提升性能。\n\n本节点只承载模型本体；各 DBMS 的填充因子作为实例挂其下。',
    example: '**同构实例**：SQL Server `FILLFACTOR`、避免页分裂的碎片管理。' },
  { conceptId: 'concept_generated_column', label: '生成列 / generated column', dims: ['关系模型', '列'],
    def: '**生成列 / generated column**\n值由**表达式自动计算**而非手动写入的列，分存储式（物化）与虚拟式（读取时计算）。常用于派生数据、保证一致性。\n\n本节点只承载模型本体；各 DBMS 的生成列作为实例挂其下。',
    example: '**同构实例**：MySQL `GENERATED ALWAYS AS (...)`、PostgreSQL 生成列。' },
  { conceptId: 'concept_temporary_table', label: '临时表 / temporary table', dims: ['关系模型', '数据库对象'],
    def: '**临时表 / temporary table**\n**会话/事务期间存在、仅当前会话可见**的表，用于存放中间结果、复杂查询的分阶段数据。分内存临时表与磁盘临时表。\n\n本节点只承载模型本体；各 DBMS 的临时表作为实例挂其下。',
    example: '**同构实例**：MySQL 隐式/显式临时表、`CREATE TEMPORARY TABLE`。' },
  { conceptId: 'concept_referential_integrity', label: '参照完整性 / referential integrity', dims: ['约束', '关系建模'],
    def: '**参照完整性 / referential integrity**\n通过**外键约束**保证子表的外键值必须存在于父表主键中（或为空），从而维护表间数据的一致性。是关系模型完整性的核心规则之一。\n\n本节点只承载模型本体；各 DBMS 的参照完整性实现作为实例挂其下。',
    example: '**同构实例**：`FOREIGN KEY ... REFERENCES`、级联更新/删除。' },
  { conceptId: 'concept_child_table', label: '子表 / child table', dims: ['关系建模', '外键'],
    def: '**子表 / child table**\n在**外键关系**中持有外键、引用父表主键的一方。子表的引用列值受父表约束（参照完整性）。\n\n本节点只承载模型本体；各 DBMS 的子表概念作为实例挂其下。',
    example: '**同构实例**：订单表引用用户表的 `user_id`。' },
  { conceptId: 'concept_parent_table', label: '父级表 / parent table', dims: ['关系建模', '外键'],
    def: '**父级表 / parent table**\n在外键关系中**被引用**的一方，其主键/唯一键为子表外键的合法取值来源。父表行的删除/更新受级联规则约束。\n\n本节点只承载模型本体；各 DBMS 的父表概念作为实例挂其下。',
    example: '**同构实例**：用户表作为订单表的父表。' },
];

const MAPS = [
  { ref: 'k_dict_7dvcv51p', conceptId: 'concept_table' },
  { ref: 'k_dict_lepgecnd', conceptId: 'concept_column' },
  { ref: 'k_dict_2uq4y41u', conceptId: 'concept_row' },
  { ref: 'k_dict_lc7qrne8', conceptId: 'concept_database' },
  { ref: 'demo_btree', conceptId: 'concept_btree_index' },
  { ref: 'demo_composite_index', conceptId: 'concept_composite_index' },
  { ref: 'mysql_glossary_concatenated_index_zs31t2', conceptId: 'concept_composite_index' },
  { ref: 'mysql_glossary_composite_index_duhrko', conceptId: 'concept_composite_index' },
  { ref: 'k_auto_yb9yyu', conceptId: 'concept_secondary_index' },
  { ref: 'k_auto_es1cgt', conceptId: 'concept_prefix_index' },
  { ref: 'mysql_glossary_column_prefix_15o687', conceptId: 'concept_prefix_index' },
  { ref: 'mysql_glossary_descending_index_1j7tn3', conceptId: 'concept_descending_index' },
  { ref: 'mysql_glossary_virtual_index_sm95n4', conceptId: 'concept_virtual_index' },
  { ref: 'mysql_glossary_column_index_q4bbvv', conceptId: 'concept_column_index' },
  { ref: 'n_0xxb9cqy', conceptId: 'concept_index' },
  { ref: 'mysql_glossary_index_statistics_1ge74j', conceptId: 'concept_index_statistics' },
  { ref: 'k_dict_n9s627ij', conceptId: 'concept_cardinality' },
  { ref: 'k_dict_jmpy3jq2', conceptId: 'concept_fill_factor' },
  { ref: 'mysql_glossary_full_text_search_16dcha', conceptId: 'concept_fulltext_index' },
  { ref: 'mysql_glossary_fts_1x0dll', conceptId: 'concept_fulltext_index' },
  { ref: 'mysql_glossary_search_index_18jlmz', conceptId: 'concept_fulltext_index' },
  { ref: 'k_dict_reul960o', conceptId: 'concept_generated_column' },
  { ref: 'k_dict_6rxmba95', conceptId: 'concept_temporary_table' },
  { ref: 'k_dict_1a3p1hdq', conceptId: 'concept_referential_integrity' },
  { ref: 'mysql_glossary_child_table_1l6dvq', conceptId: 'concept_child_table' },
  { ref: 'mysql_glossary_parent_table_yqeba1', conceptId: 'concept_parent_table' },
  { ref: 'k_auto_va5371', conceptId: 'concept_primary_key' },
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
    rationale: `通用关系/索引概念，自 MySQL 关系簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, pool[it.ref].label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 关系簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
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
console.log('peel-mysql-relational complete: concepts+=', createdConcepts.length, 'instances=', mapped);
