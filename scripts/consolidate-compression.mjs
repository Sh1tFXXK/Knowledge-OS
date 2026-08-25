// scripts/consolidate-compression.mjs
// 把 MySQL 域「压缩」通用入口节点 + 投影文件夹删除，
// 其下 5 个 MySQL 专属压缩子节点迁移到原理层 concept_compression 下作为子文件。
// 通用压缩定义全留原理层 concept_compression；MySQL 域不再有压缩条目。
import fs from 'node:fs';
const ROOT = process.cwd();
const F = {
  np: `${ROOT}/data/node-pool.json`,
  tree: `${ROOT}/data/tree-data.json`,
  edges: `${ROOT}/data/knowledge-edges.json`,
  gov: `${ROOT}/data/knowledge-governance.json`,
};
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeAtomic = (p, obj) => {
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, p);
};

const np = read(F.np);
const tree = read(F.tree);
const edgesObj = read(F.edges);
const edges = Array.isArray(edgesObj) ? edgesObj : (edgesObj.edges || edgesObj);

const FOLDER_ID = 'projection:mysql-term:mysql_glossary_compression_gbxfjp';
const MYSQL_ENTRY = 'mysql_glossary_compression_gbxfjp';
const CONCEPT_TREE_ID = 'tree_concept_compression';
const CONCEPT_NODE = 'concept_compression';
const EDGE_ID = 'rel:mysql_compression:instance-of:concept_compression';

// ---- 树工具 ----
function findNode(n, id) {
  if (n.id === id) return n;
  for (const c of (n.children || [])) { const r = findNode(c, id); if (r) return r; }
  return null;
}
function findParent(n, id) {
  for (const c of (n.children || [])) {
    if (c.id === id) return n;
    const r = findParent(c, id); if (r) return r;
  }
  return null;
}

// 1. node-pool: 删 MySQL 压缩通用入口节点
const removedEntry = np[MYSQL_ENTRY];
if (!removedEntry) throw new Error('MySQL 入口节点不存在: ' + MYSQL_ENTRY);
delete np[MYSQL_ENTRY];

// 2. tree: 定位 MySQL 压缩文件夹，提取 5 子，删文件夹
const folder = findNode(tree, FOLDER_ID);
if (!folder) throw new Error('MySQL 压缩文件夹不存在: ' + FOLDER_ID);
const kids = folder.children ? folder.children.slice() : [];
console.log('提取子节点数:', kids.length);
for (const k of kids) console.log('  -', k.name, '|', k.nodeRef);

const mysqlRoot = findParent(tree, FOLDER_ID);
if (!mysqlRoot) throw new Error('找不到 MySQL 压缩文件夹的父');
mysqlRoot.children = mysqlRoot.children.filter(c => c.id !== FOLDER_ID);

// 3. tree: 在 concept_compression 下，删原"MySQL 压缩"子投影，加入 5 子
const cc = findNode(tree, CONCEPT_TREE_ID);
if (!cc) throw new Error('concept_compression 树节点不存在: ' + CONCEPT_TREE_ID);
// 删原 MySQL 压缩子投影
cc.children = (cc.children || []).filter(c => c.nodeRef !== MYSQL_ENTRY);
// 加入 5 子（保持原投影节点结构，只换父）
cc.children = cc.children.concat(kids);

// 4. edges: 删 instance-of 边
const beforeEdges = edges.length;
for (let i = 0; i < edges.length; i++) {
  if (edges[i].id === EDGE_ID) { edges.splice(i, 1); break; }
}
console.log('edges:', beforeEdges, '->', edges.length);

// 5. concept_compression card: 在 example tab 末尾补说明子文件归并
const ccNode = np[CONCEPT_NODE];
if (ccNode && ccNode.card && ccNode.card.tabs) {
  const ex = ccNode.card.tabs.find(t => t.id === 'example');
  if (ex) {
    if (!/已归并/.test(ex.content)) {
      ex.content += '\n\n> **子文件归并**：本节点下挂各系统压缩实现作为子文件——透明页压缩、压缩失败、打孔（hole punching）、稀疏文件（sparse file）、KEY_BLOCK_SIZE 等 MySQL/InnoDB 实现项已从 MySQL 域并入此处，便于从原理层下钻到具体实现；MySQL 域不再单设「压缩」通用条目。';
    }
  }
}

// 6. 原子写回
writeAtomic(F.np, np);
writeAtomic(F.tree, tree);
const edgesOut = Array.isArray(edgesObj) ? edges : (edgesObj.edges ? { ...edgesObj, edges } : { edges });
writeAtomic(F.edges, edgesOut);

console.log('\n=== 完成 ===');
console.log('删除 node-pool 节点:', MYSQL_ENTRY, '|', removedEntry.label);
console.log('删除树投影文件夹:', FOLDER_ID);
console.log('迁移子节点到 concept_compression:', kids.length, '个');
console.log('删除 instance-of 边:', EDGE_ID);
console.log('concept_compression children 现有:', cc.children.length);
for (const c of cc.children) console.log('  -', c.name, '| nodeRef:', c.nodeRef);
