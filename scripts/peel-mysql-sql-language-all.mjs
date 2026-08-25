// 剥离 MySQL 域 · SQL 语言簇收尾（2026-08-23，全面扫描第八批）
// 用户「sql语言所有东西都移走」：把上次特意保留的 MySQL 方言特性也迁到数据库原理本体，
// 使 MySQL 下不再残留任何 SQL 语言节点。
// 新建 4 概念（分隔标识符/动态SQL/在线DDL/原子DDL）；混合模式插入挂已存在的 concept_insert。
// 范式同前批。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-sql-language-all-${ts}`);
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
  { conceptId: 'concept_delimited_identifier', label: '分隔标识符 / delimited identifier', dims: ['SQL', '语法'],
    def: '**分隔标识符 / delimited identifier**\nSQL 中用**特殊引号包裹标识符**（表名、列名等）以容纳保留字或特殊字符的语法机制。不同 DBMS 选用不同定界符：MySQL 用反引号 `` ` ``、ANSI SQL 用双引号 `"`、SQL Server 用方括号 `[ ]`。\n\n本节点只承载模型本体；各 DBMS 的分隔标识符作为实例挂其下。',
    example: '**同构实例**：`` `SELECT` ``（MySQL）、`"SELECT"`（ANSI）、`[SELECT]`（SQL Server）。' },
  { conceptId: 'concept_dynamic_sql', label: '动态 SQL / dynamic SQL', dims: ['SQL', '编程'],
    def: '**动态 SQL / dynamic SQL**\n在**运行时拼接并执行 SQL 文本**的机制，常借助预处理语句（prepared statement）实现，便于参数化、避免注入并支持按条件构造查询。与静态（编译期固定）SQL 相对。\n\n本节点只承载模型本体；各 DBMS 的动态 SQL 作为实例挂其下。',
    example: '**同构实例**：`PREPARE`/`EXECUTE`、JDBC `PreparedStatement`、MySQL 预处理语句。' },
  { conceptId: 'concept_online_ddl', label: '在线 DDL / online DDL', dims: ['SQL', 'DDL', '可用性'],
    def: '**在线 DDL / online DDL**\n执行**结构变更（如 `ALTER TABLE`）时尽量不阻塞并发读写、避免全表复制**的数据库能力，通过就地算法或优化的表复制提升变更期间的性能、并发性与可用性。\n\n本节点只承载模型本体；各 DBMS 的在线 DDL 作为实例挂其下。',
    example: '**同构实例**：MySQL InnoDB Online DDL、`ALGORITHM=INPLACE`、`LOCK=NONE`。' },
  { conceptId: 'concept_atomic_ddl', label: '原子 DDL / atomic DDL', dims: ['SQL', 'DDL', '事务'],
    def: '**原子 DDL / atomic DDL**\n将 DDL 相关的**数据字典更新、存储引擎操作与二进制日志写入组合为单一原子事务**，要么全部提交、要么整体回滚（即使服务器中途停止）。使结构变更具备事务性保障。\n\n本节点只承载模型本体；各 DBMS 的原子 DDL 作为实例挂其下。',
    example: '**同构实例**：MySQL 8.0 原子 DDL、失败的 `CREATE TABLE` 不留残留文件。' },
];

// 节点 ref -> 概念；实例展示名
const MAPS = [
  { ref: 'mysql_glossary_backticks_5z2ws', conceptId: 'concept_delimited_identifier', inst: 'MySQL 反引号 / backticks' },
  { ref: 'mysql_glossary_dynamic_statement_1evhmv', conceptId: 'concept_dynamic_sql', inst: 'MySQL 动态语句 / dynamic statement' },
  { ref: 'k_dict_p7los2aq', conceptId: 'concept_dynamic_sql', inst: 'MySQL 动态 SQL / dynamic SQL' },
  { ref: 'mysql_glossary_mixed_mode_insert_1pvj4c', conceptId: 'concept_insert', inst: 'MySQL 混合模式插入 / mixed-mode insert' },
  { ref: 'k_dict_4m05mgz6', conceptId: 'concept_online_ddl', inst: 'MySQL 在线 DDL / online DDL' },
  { ref: 'mysql_glossary_atomic_ddl_l48qcc', conceptId: 'concept_atomic_ddl', inst: 'MySQL 原子DDL / atomic DDL' },
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
  const detached = detachByRef(it.ref);
  if (!detached) { console.log('skip not under MySQL:', it.ref); skipped++; continue; }
  detached.name = it.inst;
  detached.projection = false;
  delete detached.view; delete detached.projectionKind; delete detached.sourceNodeId;
  conceptEntry.children = conceptEntry.children || [];
  conceptEntry.children.push(detached);
  mapped++;
  console.log(`mapped ${it.inst} -> ${concept.label}`);
}

// 清理 MySQL 空容器（SQL 与语言对象主题将因无子节点被移除）
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
    rationale: `通用 SQL 概念，自 MySQL SQL 语言收尾批量剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, it.inst], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL SQL 语言收尾批量剥离；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
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
console.log('peel-mysql-sql-language-all complete: concepts+=', createdConcepts.length, 'instances=', mapped);
