import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const tree = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
const mysqlThemes = [
  'mysql:theme:architecture', 'mysql:theme:sql-language', 'mysql:theme:schema-objects', 'mysql:theme:data-types',
  'mysql:theme:query-processing', 'mysql:theme:indexes-access', 'mysql:theme:transactions-concurrency', 'mysql:theme:storage-engines',
  'mysql:theme:backup-recovery', 'mysql:theme:replication-ha', 'mysql:theme:security-access', 'mysql:theme:connectivity',
  'mysql:theme:performance-observability', 'mysql:theme:operations',
];
const sourceViewId = 'governance:mysql-glossary-source-view';

function rootsOf(value) { return Array.isArray(value) ? value : [value]; }
function find(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) { const hit = find(child, id); if (hit) return hit; }
  return null;
}
function findParent(root, id) {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const hit = findParent(child, id); if (hit) return hit;
  }
  return null;
}
function descendants(root) { return [root, ...(root.children ?? []).flatMap(descendants)]; }
function findAny(id) { for (const root of rootsOf(tree)) { const hit = find(root, id); if (hit) return hit; } return null; }
function parentAny(id) { for (const root of rootsOf(tree)) { const hit = findParent(root, id); if (hit) return hit; } return null; }

const mysql = findAny('forest:view:mysql');
assert.ok(mysql, '规范 MySQL 根必须存在');
assert.equal(parentAny(mysql.id)?.id, 'tree_acm2012_information_systems_database_management', 'MySQL 必须直接归属信息系统/数据库管理');
assert.deepEqual((mysql.children ?? []).map((n) => n.id), [...mysqlThemes, sourceViewId], 'MySQL 顶层必须仅包含 14 个主题与来源视图');

const source = findAny(sourceViewId);
assert.ok(source, 'MySQL 术语来源视图必须存在');
assert.equal(source.children?.length, 360, '必须保留全部 360 个 MySQL 来源术语');
assert.equal(descendants(mysql).filter((n) => /待审核|未分类|review inbox/i.test(n.name ?? '')).length, 0, 'MySQL 内不允许存在待审核、未分类或 Review Inbox 容器');

const legacyOverview = findAny('demo_mysql');
assert.ok(legacyOverview, '旧 MySQL 概述内容节点必须保留');
assert.equal(parentAny(legacyOverview.id)?.id, 'mysql:theme:architecture', '旧 MySQL 概述必须归并到总览与体系结构主题');
assert.ok(findAny('mysql_topic_sql_objects'), '既有 SQL 专题必须保留');
assert.equal(parentAny('mysql_topic_sql_objects')?.id, 'mysql:theme:sql-language', '既有 SQL 专题必须归并到 SQL 与语言对象主题');
assert.ok(findAny('mysql_topic_storage_engines'), '既有存储引擎专题必须保留');
assert.equal(parentAny('mysql_topic_storage_engines')?.id, 'mysql:theme:storage-engines', '既有存储引擎专题必须归并到对应主题');

const sqlTheme = findAny('mysql:theme:sql-language');
const sqlCategoryIds = new Set(descendants(sqlTheme).map((n) => n.id));
for (const id of ['mysql:sql:dql', 'mysql:sql:dml', 'mysql:sql:ddl', 'mysql:sql:dcl', 'mysql:sql:tcl', 'mysql:sql:joins']) {
  assert.ok(sqlCategoryIds.has(id), `SQL 主题必须保留 ${id} 子分类`);
}

const themeRefs = new Set(descendants(mysql).filter((n) => n.id !== sourceViewId && !n.id.startsWith('governance:source:mysql-glossary:')).map((n) => n.nodeRef).filter(Boolean));
const uncovered = (source.children ?? []).filter((n) => n.nodeRef && !themeRefs.has(n.nodeRef));
assert.deepEqual(uncovered, [], '每个来源术语都必须至少投影到一个具体 MySQL 主题');

console.log(JSON.stringify({ mysqlThemes: mysqlThemes.length, sourceTerms: source.children.length, coveredTerms: source.children.length - uncovered.length }));
