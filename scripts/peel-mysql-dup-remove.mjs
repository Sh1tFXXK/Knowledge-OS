// 剥离 MySQL 域 · 真重复节点清理（2026-08-23，全面扫描第三批）
// 背景：13 个节点(nodeRef)同时挂在「数据库原理」本体与 MySQL 树下（同一 pool 节点被两棵树引用），
// 即 single-affiliation 违规的重复。其真身已在数据库原理，MySQL 侧引用应清除。
// 动作：摘掉 MySQL 树下这些 nodeRef 的全部入口（子树一并移除，因子节点亦多为重复泛型节点），
// 清理空容器。不新建概念、不加边（概念本体已存在）。备份优先。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-dup-remove-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
if (!MYSQL_ROOT) throw new Error('未找到 MySQL 根');

// 13 个真重复 nodeRef（已确认同时存在于数据库原理子树）
const DUP_REFS = [
  'k_dict_zu4iv9d4', // 联机事务处理 OLTP
  'k_dict_olg8goh1', // 查询 query
  'demo_acid',       // ACID
  'k_dict_el0p7j55', // 自动提交 autocommit
  'demo_isolation',  // 隔离级别 isolation level
  'k_dict_3dltrcza', // 读未提交 READ UNCOMMITTED
  'k_dict_o0jw5g8p', // 读已提交 READ COMMITTED
  'k_dict_i1g9hhj8', // 可串行化 SERIALIZABLE
  'k_dict_c9sxzvqt', // 不可重复读 non-repeatable read
  'k_dict_4z5j9bz',  // 可重复读 REPEATABLE READ
  'k_dict_8o426b5j', // 幻读 phantom
  'k_dict_xbipt5q1', // 快照 snapshot
  'k_dict_o5254svl', // 数据仓库 data warehouse
];

let removed = 0;
for (const ref of DUP_REFS) {
  const hits = [];
  walk(MYSQL_ROOT, (n, parent) => { if (parent && n.nodeRef === ref) hits.push({ n, parent }); });
  for (const { n, parent } of hits) {
    parent.children.splice(parent.children.indexOf(n), 1);
    removed++;
    console.log('removed MySQL dup entry:', ref, '(' + (pool[ref] ? pool[ref].label : '?') + ')');
  }
}

// 清理空容器
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
console.log('removed MySQL dup entries:', removed, '| empty containers:', removedEmpty);

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('tree-data.json', tree);
console.log('peel-mysql-dup-remove complete');
