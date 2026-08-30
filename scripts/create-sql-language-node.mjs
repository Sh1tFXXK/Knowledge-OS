// 建「SQL」语言概念节点（2026-08-29）
// 用户反馈：树里找不到 SQL 节点。现状：SQL 概念埋在 数据库/一、数据库系统/数据库使用/数据库语言 下（5 层深）。
// 原则（与 java/go/Ruby 一致）：SQL 是一门语言 → 编程语言 域。
// 动作：
//   1. 编程语言 下新建「SQL」节点（nodeRef 用现有 SQL 概念节点 k_wiki_en_outline_of_databases_s5_b5，
//      概念卡上轮已升级），并把 数据库语言 下的 7 个 SQL 语言知识子节点迁到其下
//   2. 数据库语言 保留 DDL/DML/DQL 等存根，并加 SQL ↔ 数据库语言 关联边
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `create-sql-language-node-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

const SQL_CONCEPT_REF = 'k_wiki_en_outline_of_databases_s5_b5';
const PL_REF = 'k_acm2012_software_notations_tools_programming_languages';
const LANG_REF = 'k_wiki_en_outline_of_databases_s5';
const SQL_TREE_ID = 'tree_acm2012_software_notations_tools_sql';

function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

const plTree = findTreeByRef(tree, PL_REF);
if (!plTree) throw new Error('编程语言 not found');
const langTree = findTreeByRef(tree, LANG_REF);
if (!langTree) throw new Error('数据库语言 not found');

// 1. 把已挂载的 SQL 概念节点从 数据库语言 摘出，改名「SQL」挂到 编程语言 下
const sqlNode = findTreeByRef(tree, SQL_CONCEPT_REF);
if (!sqlNode) throw new Error('SQL concept node not mounted');
let oldParent = null;
(function walk(n) { for (const c of n.children ?? []) { if (c === sqlNode) { oldParent = n; return; } walk(c, sqlNode); } })(tree);
if (!oldParent) throw new Error('SQL concept parent not found');
oldParent.children = oldParent.children.filter((c) => c !== sqlNode);
sqlNode.name = 'SQL';
sqlNode.count = 0;
pool[SQL_CONCEPT_REF].label = 'SQL（结构化查询语言）';
if (pool[SQL_CONCEPT_REF].card) pool[SQL_CONCEPT_REF].card.title = 'SQL（结构化查询语言）';
if (!plTree) throw new Error('编程语言 not found');
plTree.children ??= [];
plTree.children.push(sqlNode);
edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === SQL_CONCEPT_REF || e.source === SQL_CONCEPT_REF)));
upsertEdge({ id: `treebind:${plTree.id}:${SQL_TREE_ID}`, source: PL_REF, target: SQL_CONCEPT_REF, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });

// 2. 把 数据库语言 下的 7 个 SQL 语言知识子节点迁到「SQL」下
const MOVED_REFS = [
  'k_sql_statement_types', 'k_sql_keys', 'k_sql_constraints', 'k_sql_joins',
  'k_sql_subquery_in_exists', 'k_sql_datatypes', 'k_sql_limit',
];
for (const ref of MOVED_REFS) {
  const child = (langTree.children ?? []).find((c) => c.nodeRef === ref);
  if (!child) throw new Error(`lang child missing: ${ref}`);
  langTree.children = langTree.children.filter((c) => c !== child);
  sqlNode.children.push(child);
  edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === child.nodeRef || e.source === child.nodeRef)));
  upsertEdge({ id: `treebind:${SQL_TREE_ID}:${child.id}`, source: SQL_CONCEPT_REF, target: ref, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
}
sqlNode.count = sqlNode.children.length;

// 3. SQL ↔ 数据库语言 关联边（SQL 是数据库的操作语言）
upsertEdge({
  id: 'edge_sql_relates_database_language',
  source: SQL_CONCEPT_REF,
  target: LANG_REF,
  type: 'related-to',
  label: 'SQL 是数据库使用的标准查询语言',
  relationKind: 'dependency',
  dimensions: ['java'],
});

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
if (!findTreeByRef(tree, SQL_CONCEPT_REF)) problems.push('SQL node not mounted');
if ((sqlNode.children ?? []).length !== MOVED_REFS.length) problems.push('SQL children count wrong');
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed: ' + problems.length); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
console.log(`create-sql-language-node complete:
  - 编程语言/SQL 已创建（概念卡 + 7 个语言知识子节点）
  - 数据库语言 保留 DDL/DML/DQL 等存根 + SQL↔数据库语言 关联边
  - 编程语言 children: ${(plTree.children ?? []).length}`);
