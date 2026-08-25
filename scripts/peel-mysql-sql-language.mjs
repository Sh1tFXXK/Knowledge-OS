// 剥离 MySQL 域 · SQL 语言簇（2026-08-23，全面扫描第七批）
// 覆盖：DQL/DML/DDL/DCL/TCL 五个通用 SQL 子语言概念，从 MySQL「SQL 与语言对象」主题迁到数据库原理本体。
// MySQL 专属方言特性（反引号/动态SQL/在线DDL/混合模式插入/动态语句/原子DDL）保留在 MySQL 下。
// 范式同前批。DDL 下的"原子DDL"子节点为 MySQL 专属，剥离时保留回 MySQL 主题。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-sql-language-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理', 'SQL'];

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, n => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
const dbpNode = findNode(DBP);

const NEWS = [
  { conceptId: 'concept_dql', label: 'DQL / 数据查询语言', dims: ['SQL', '查询'],
    def: '**DQL / 数据查询语言（Data Query Language）**\nSQL 中负责**查询与检索数据**的子集，核心为 `SELECT` 及其子句（FROM、WHERE、GROUP BY、HAVING、ORDER BY、JOIN 等），不改变数据。是 OLTP/OLAP 读取数据的统一入口。\n\n本节点只承载模型本体；各 DBMS 的查询语言作为实例挂其下。',
    example: '**同构实例**：`SELECT ... FROM ... WHERE ...`，MySQL/PostgreSQL/Oracle 通用。' },
  { conceptId: 'concept_dml', label: 'DML / 数据操作语言', dims: ['SQL', 'DML'],
    def: '**DML / 数据操作语言（Data Manipulation Language）**\nSQL 中负责**增删改数据行**的子集：`INSERT`、`UPDATE`、`DELETE`、`REPLACE` 等。DML 通常处在事务上下文中，可提交或回滚。\n\n本节点只承载模型本体；各 DBMS 的 DML 作为实例挂其下。',
    example: '**同构实例**：`INSERT`/`UPDATE`/`DELETE`，与事务边界的关系。' },
  { conceptId: 'concept_ddl', label: 'DDL / 数据定义语言', dims: ['SQL', 'DDL'],
    def: '**DDL / 数据定义语言（Data Definition Language）**\nSQL 中负责**定义与修改数据库结构**的子集：`CREATE`、`ALTER`、`DROP`、`TRUNCATE` 等，操作表/索引/视图/模式等对象。多数 DDL 隐式提交、不可回滚到逐行级别。\n\n本节点只承载模型本体；各 DBMS 的 DDL 作为实例挂其下。',
    example: '**同构实例**：`CREATE TABLE`/`ALTER TABLE`/`DROP INDEX`。' },
  { conceptId: 'concept_dcl', label: 'DCL / 数据控制语言', dims: ['SQL', '权限'],
    def: '**DCL / 数据控制语言（Data Control Language）**\nSQL 中负责**权限与访问控制**的子集：`GRANT`、`REVOKE`，以及角色（role）与权限的授予/回收，是数据库安全模型的操作接口。\n\n本节点只承载模型本体；各 DBMS 的 DCL 作为实例挂其下。',
    example: '**同构实例**：`GRANT SELECT ON db.* TO user`、`CREATE ROLE`。' },
  { conceptId: 'concept_tcl', label: 'TCL / 事务控制语言', dims: ['SQL', '事务'],
    def: '**TCL / 事务控制语言（Transaction Control Language）**\nSQL 中负责**控制事务边界**的子集：`START TRANSACTION`/`BEGIN`、`COMMIT`、`ROLLBACK`、`SAVEPOINT`、`XA`（分布式事务）。TCL 把 DML 的改动落实或撤销。\n\n本节点只承载模型本体；各 DBMS 的 TCL 作为实例挂其下。',
    example: '**同构实例**：`BEGIN; ... COMMIT;`、保存点与两阶段提交。' },
];

// 节点 ref -> 概念；实例展示名
const MAPS = [
  { ref: 'mysql:sql:dql', conceptId: 'concept_dql', inst: 'MySQL DQL / 数据查询语言' },
  { ref: 'mysql:sql:dml', conceptId: 'concept_dml', inst: 'MySQL DML / 数据操作语言' },
  { ref: 'mysql:sql:ddl', conceptId: 'concept_ddl', inst: 'MySQL DDL / 数据定义语言' },
  { ref: 'mysql:sql:dcl', conceptId: 'concept_dcl', inst: 'MySQL DCL / 数据控制语言' },
  { ref: 'mysql:sql:tcl', conceptId: 'concept_tcl', inst: 'MySQL TCL / 事务控制语言' },
];

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

// 2) 改写 + 重挂
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
let mapped = 0, skipped = 0, attachedOrphan = 0;
for (const it of MAPS) {
  const m = pool[it.ref];
  const concept = pool[it.conceptId];
  if (!m || !concept) { console.log('skip missing:', it.ref); skipped++; continue; }
  const tabs = (m.card && m.card.tabs) || [];
  const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || '';
  m.label = it.inst;
  m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
  m.tags = Array.from(new Set([...(m.tags || []), it.inst, 'mysql']));
  m.card = m.card || {};
  m.card.title = it.inst;
  m.card.tabs = [
    { id: 'def', label: '定义（MySQL 实例）',
      content: `**${it.inst}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${concept.label}」概念节点（数据库原理）。` },
  ];
  m.card.rootContent = `**${it.inst}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现。本节点是实例，本体在数据库原理域。`;

  const conceptEntry = findNode(`tree_${it.conceptId}`);
  if (!conceptEntry) { console.log('skip no tree entry:', it.conceptId); skipped++; continue; }

  // DDL 特殊处理：把 MySQL 专属子节点（原子DDL）保留回 MySQL 主题
  let preservedChildren = [];
  const existingNode = findNode(it.ref);
  if (existingNode) {
    preservedChildren = (existingNode.children || []).filter(c => c.nodeRef !== 'mysql_glossary_atomic_ddl_l48qcc');
    const atomic = (existingNode.children || []).find(c => c.nodeRef === 'mysql_glossary_atomic_ddl_l48qcc');
    if (atomic) {
      const sqlTheme = findNode('mysql:theme:sql-language');
      if (sqlTheme) { sqlTheme.children = sqlTheme.children || []; sqlTheme.children.push(atomic); console.log('  kept MySQL-specific child under MySQL:', atomic.name); }
    }
    detachByRef(it.ref);
  }
  const newEntry = { id: `tree_${it.ref}`, name: it.inst, count: 0, nodeRef: it.ref, children: preservedChildren };
  conceptEntry.children = conceptEntry.children || [];
  conceptEntry.children.push(newEntry);
  if (existingNode) { mapped++; console.log(`mapped ${it.inst} -> ${concept.label}`); }
  else { attachedOrphan++; console.log(`attached (was orphan) ${it.inst} -> ${concept.label}`); }
}

// 3) 清理 MySQL 空容器
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
console.log('removed empty MySQL containers:', removedEmpty, '| mapped:', mapped, '| attachedOrphan:', attachedOrphan, '| skipped:', skipped);

// 4) edges
for (const it of MAPS) {
  const id = `rel:${it.conceptId}:instance-of:${it.ref}`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: it.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
  }
}

// 5) governance
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
    rationale: `通用 SQL 子语言概念，自 MySQL SQL 语言簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, it.inst], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL SQL 语言簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
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
console.log('peel-mysql-sql-language complete: concepts+=', createdConcepts.length, 'mapped=', mapped, 'attachedOrphan=', attachedOrphan);
