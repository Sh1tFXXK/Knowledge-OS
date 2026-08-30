// 按用户要求：问答内容放问题卡，不放知识节点（2026-08-29）
// 将 21 个 SQL 问答式知识节点从目录树撤下（池条目保留，内容在 52 张问题卡中，随时可恢复挂载）
// 保留：编程语言/SQL 概念节点（概念卡已升级）、DDL/DML/DQL 定义存根、SQL↔数据库语言 关联边
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `unmount-sql-qa-nodes-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

const SQL_CONCEPT_REF = 'k_wiki_en_outline_of_databases_s5_b5';
function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// 找到 SQL 概念节点，撤下其 7 个问答子节点
const sqlNode = findTreeByRef(tree, SQL_CONCEPT_REF);
if (!sqlNode) throw new Error('SQL concept node not found');
const qaChildren = (sqlNode.children ?? []).map((c) => c.nodeRef);
for (const child of [...(sqlNode.children ?? [])]) {
  sqlNode.children = sqlNode.children.filter((c) => c !== child);
  edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === child.nodeRef || e.source === child.nodeRef)));
  console.log('unmounted:', child.name);
}

// 摘下数据库各章节里的 14 个问答节点
const QA_DB_REFS = [
  'k_sql_drop_delete_truncate', 'k_sql_explain', 'k_sql_lifecycle', 'k_sql_slow_query',
  'k_sql_optimization', 'k_sql_huge_offset', 'k_sql_bigtable_query', 'k_sql_db_structure_opt',
  'k_sql_cpu_spike', 'k_sql_bigtable_sharding', 'k_sql_backup_tools', 'k_sql_table_repair',
  'k_sql_replication', 'k_sql_binlog_modes',
];
let dbRemoved = 0;
function prune(n) {
  if (!n.children) return;
  const before = n.children.length;
  n.children = n.children.filter((c) => !QA_DB_REFS.includes(c.nodeRef));
  dbRemoved += before - n.children.length;
  for (const c of n.children) prune(c);
}
prune(tree);
for (const ref of QA_DB_REFS) {
  edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === ref || e.source === ref)));
}
console.log('removed from db chapters:', dbRemoved);

// SQL 概念卡措辞更新（子节点已撤，问答见问题库）
const conceptTab = pool[SQL_CONCEPT_REF]?.card?.tabs?.[0];
if (conceptTab && String(conceptTab.content).includes('本节点下方子节点')) {
  conceptTab.content = String(conceptTab.content).replace('【本库相关位置】\n- SQL 语言知识（分类/键辨析/约束/关联查询/子查询/数据类型/LIMIT）：本节点下方子节点', '【问答与练习】\n- SQL 问答已整理为问题卡（问题库搜索 SQL），共 52 张，关联到对应知识节点');
}

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
// 21 个问答节点必须都已不在树上
function findTreeByRefWalk(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRefWalk(c, ref); if (f) return f; } return null; }
const QA_ALL = [...qaChildren, ...QA_DB_REFS];
for (const ref of QA_ALL) if (findTreeByRefWalk(tree, ref)) problems.push('still mounted: ' + ref);
// 池条目必须保留
for (const ref of QA_ALL) if (!pool[ref]) problems.push('pool entry lost: ' + ref);
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed: ' + problems.length); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
console.log(`unmount-sql-qa-nodes complete:
  - 撤下问答知识节点: ${qaChildren.length}(编程语言/SQL 下) + ${dbRemoved}(数据库各章节)
  - 池条目全部保留（内容不丢，随时可恢复挂载）
  - 问题卡: 52 张（问答唯一载体）`);
