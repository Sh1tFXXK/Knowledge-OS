#!/usr/bin/env node
/**
 * TXMGR-TYPES-TO-SUBTREE — verify
 * 校验「事务管理器类型」父卡表格已物化为 4 子树节点、父卡清空为容器、无第二处存留。
 * 用法: node scripts/txmgr-types-to-subtree/verify.mjs --data-dir <dir>
 */
import fs from 'node:fs';
import path from 'node:path';

const argDir = process.argv[process.argv.indexOf('--data-dir') + 1];
if (!argDir || argDir.startsWith('--')) { console.error('missing --data-dir <dir>'); process.exit(1); }
const DATA = path.resolve(argDir);

const PARENT_TREE = 'tree_1789990688009_p6e9n1';
const PARENT_K = 'k_1789990688000_67h3y4';
const INBOUND_TB = 'treebind:tree_vault_javaspringspring_1nbiew:tree_1789990688009_p6e9n1';
const EXPECTED = [
  ['DataSourceTransactionManager', 'JDBC事务'],
  ['HibernateTransactionManager', 'Hibernate事务'],
  ['JtaTransactionManager', 'JTA事务'],
  ['JpaTransactionManager', 'JPA事务'],
];
// 本批落盘时的基线（前 → 后）
const BASE = { pool: 3849, tree: 3205, edges: 4133 };
const PREEXISTING = { treeRefMissing: 1, edgeEndpointsMissing: 17 };

const pool = JSON.parse(fs.readFileSync(path.join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(fs.readFileSync(path.join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(fs.readFileSync(path.join(DATA, 'knowledge-edges.json'), 'utf8'));

let pass = 0, fail = 0;
const check = (desc, ok, actual = '') => {
  if (ok) pass++; else fail++;
  console.log((ok ? '✅' : '❌') + ' ' + desc + (actual ? ' — ' + actual : ''));
};

const walk = (n, cb, p) => { cb(n, p); (n.children || []).forEach((c) => walk(c, cb, n)); };
const allTree = [];
let parentTreeNode = null;
walk(tree, (n) => { allTree.push(n); if (n.id === PARENT_TREE) parentTreeNode = n; });

console.log('== TXMGR-TYPES-TO-SUBTREE verify == ' + DATA + '\n');

// 1. 结构
const children = parentTreeNode?.children ?? [];
check('V1 父树节点存在且 children=4', children.length === 4, String(children.length));
check('V2 子节点名称与顺序一致', JSON.stringify(children.map((c) => c.name)) === JSON.stringify(EXPECTED.map(([n]) => n)), children.map((c) => c.name).join(','));
check('V3 子条目为叶子形态（count=0，无 children 键）', children.every((c) => c.count === 0 && !('children' in c)));

// 2. 子实体
const childPairs = children.map((c, i) => ({ tree: c, node: pool[c.nodeRef], expect: EXPECTED[i] }));
check('V4 每个子条目 nodeRef 指向存在的实体', childPairs.every((p) => !!p.node));
check('V5 子实体 label/tags = 类型名', childPairs.every((p) => p.node && p.node.label === p.expect[0] && JSON.stringify(p.node.tags) === JSON.stringify([p.expect[0]])));
check('V6 子卡 rootContent = 表内说明（4 对逐条精确）', childPairs.every((p) => p.node && p.node.card?.rootContent === p.expect[1]));
check('V7 子卡形态 {nodeId,title,tabs:[]}', childPairs.every((p) => p.node && JSON.stringify(Object.keys(p.node.card).sort()) === JSON.stringify(['nodeId', 'rootContent', 'tabs', 'title']) && p.node.card.nodeId === p.node.id && p.node.card.title === p.expect[0] && Array.isArray(p.node.card.tabs) && p.node.card.tabs.length === 0));

// 3. 父卡容器化
const parentNode = pool[PARENT_K];
check('V8 父卡存在且为容器形态（无 rootContent）', !!parentNode && !('rootContent' in parentNode.card) && JSON.stringify(Object.keys(parentNode.card).sort()) === JSON.stringify(['nodeId', 'tabs', 'title']));
// 搬家非复制：表原文在本批前存于 vault 教程节点 + 父卡两处；落盘后父卡应清零，仅剩 vault 存量（既有重复，另行登记）
const holders = Object.values(pool).filter((n) => JSON.stringify(n).includes('| DataSourceTransactionManager | JDBC事务 |')).map((n) => n.id);
check('V9 表原文搬家非复制（父卡已清，未新增副本；仅剩 vault 存量 1 处）', !holders.includes(PARENT_K) && holders.length === 1 && holders[0] === 'k_vault_javaspringspring_1nbiew', holders.join(',') || '无');

// 4. treebind 边
const newEdgeIds = children.map((c) => `treebind:${PARENT_TREE}:${c.id}`);
const newEdges = newEdgeIds.map((id) => edges.find((e) => e.id === id));
check('V10 4 条 treebind 边齐备', newEdges.every((e) => !!e), String(newEdges.filter(Boolean).length));
check('V11 边形态精确（source=父实体, type/label/relationKind，无 dimensions）', newEdges.every((e, i) => e && e.source === PARENT_K && e.target === children[i].nodeRef && e.type === 'belongs-to' && e.label === 'contains' && e.relationKind === 'structure' && !('dimensions' in e)));
check('V12 父节点入边（vault 父链）保留', edges.some((e) => e.id === INBOUND_TB && e.source === 'k_vault_javaspringspring_1nbiew'));

// 5. 唯一性
check('V13 新实体各恰被 1 条树引用', childPairs.every((p) => p.node && allTree.filter((n) => n.nodeRef === p.node.id).length === 1));
check('V14 全树无第二处同名节点', allTree.filter((n) => EXPECTED.some(([name]) => name === n.name)).length === 4);
check('V15 池中无第二处同名 label', Object.values(pool).filter((n) => EXPECTED.some(([name]) => name === n.label)).length === 4);

// 6. 计数与全局完整性
check(`V16 池 ${BASE.pool}→${BASE.pool + 4}`, Object.keys(pool).length === BASE.pool + 4, String(Object.keys(pool).length));
check(`V17 树 ${BASE.tree}→${BASE.tree + 4}`, allTree.length === BASE.tree + 4, String(allTree.length));
check(`V18 边 ${BASE.edges}→${BASE.edges + 4}`, edges.length === BASE.edges + 4, String(edges.length));
check('V19 树/边 id 无重复', new Set(allTree.map((n) => n.id)).size === allTree.length && new Set(edges.map((e) => e.id)).size === edges.length);
const treeRefMissing = allTree.filter((n) => !pool[n.nodeRef]).length;
const edgeMissing = edges.filter((e) => !pool[e.source] || !pool[e.target]).length;
check(`V20 全局悬挂不劣化（树引用 ${PREEXISTING.treeRefMissing} / 边端点 ${PREEXISTING.edgeEndpointsMissing}）`, treeRefMissing === PREEXISTING.treeRefMissing && edgeMissing === PREEXISTING.edgeEndpointsMissing, `树 ${treeRefMissing} / 边 ${edgeMissing}`);

console.log(`\n${fail === 0 ? 'VERIFY OK' : 'VERIFY FAILED'} — pass=${pass} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
