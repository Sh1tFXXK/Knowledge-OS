// 「事务」与「事务系统」章节融合（2026-08-30 第五轮）
// 用户反馈：事务应该和事务系统融合——章节下不再保留「事务」文件夹。
// 改动：
//  1) 「事务 / transaction」的 10 个子节点提升为章节直属：
//     数据库事务、事务生命周期、事务管理、全局事务、事务ID、只读事务、
//     TCL、分布式事务/XA、小型事务、每秒事务数（各自 MySQL 实例随节点整体上移）。
//  2) 「事务」概念本体定义并入「数据库事务」卡片（新增「本体」标签页），
//     概念节点从树上摘除、保留在池中作为 instance-of 语义锚点
//     （数据库事务 -instance-of-> 事务 边保持有效）。
//  3) 章节一级排序：数据库事务 → MySQL 事务 → 事务原理 → 事务生命周期 → 事务管理
//     → 全局事务 → 事务ID → 只读事务 → TCL → 分布式事务/XA → 小型事务 → 每秒事务数
//     → 读现象 → 多版本并发控制 → 锁机制 → 一致性读取 → 半一致性读取 → 回滚
//     → 并发 → 受害者 → 丢失更新。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-tx-fuse-transaction-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

function findWithParent(node, pred, parent = null) {
  if (pred(node)) return { node, parent };
  for (const c of node.children || []) {
    const hit = findWithParent(c, pred, node);
    if (hit) return hit;
  }
  return null;
}
const byRef = (nodeRef) => findWithParent(tree, (n) => n.nodeRef === nodeRef);
function detachByRef(nodeRef) {
  const hit = byRef(nodeRef);
  if (!hit) throw new Error(`tree entry not found: ${nodeRef}`);
  const i = hit.parent.children.indexOf(hit.node);
  hit.parent.children.splice(i, 1);
  return hit.node;
}
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try { renameSync(tmp, join(DATA, file)); ok = true; }
    catch (err) {
      if (i === 7) throw err;
      console.log(`rename ${file} busy, retry ${i + 1}/7...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}

const TX = '七、事务系统';
const chapter = findWithParent(tree, (n) => n.name === TX).node;
const trEntry = byRef('concept_transaction');
if (!trEntry) throw new Error('事务 tree entry not found');

// 1) 子节点提升
const promoteOrder = [
  'k_1783250593540_v2w5hy', 'concept_transaction_lifecycle', 'concept_transaction_management',
  'concept_global_transaction', 'concept_transaction_id', 'concept_read_only_transaction',
  'concept_tcl', 'k_dict_n5wdsgcu', 'concept_mini_transaction', 'concept_throughput_tps',
];
const childMap = new Map((trEntry.node.children || []).map((c) => [c.nodeRef, c]));
if (childMap.size !== (trEntry.node.children || []).length) throw new Error('duplicate child in 事务');
const promoted = promoteOrder.map((r) => {
  const e = childMap.get(r);
  if (!e) throw new Error('expected child missing: ' + r);
  return e;
});

// 2) 本体定义并入 数据库事务 卡片
const dbTx = pool['k_1783250593540_v2w5hy'];
const ontoTab = { id: 'ontology', label: '本体（事务 / transaction）', content: '' };
{
  const src = pool['concept_transaction'];
  const def = src.card.tabs.find((t) => t.id === 'def');
  ontoTab.content = def.content;
  dbTx.card.tabs.splice(1, 0, ontoTab); // 定义 之后
  const defTab = dbTx.card.tabs.find((t) => t.id === 'def');
  defTab.content = defTab.content.replace(
    '本节点是「事务 / transaction」本体在数据库领域的**域级概念**；MySQL 事务作为其产品实例挂其下（事务 → 数据库事务 → MySQL 事务）。',
    '本节点是「事务 / transaction」本体在数据库领域的**域级概念**（通用本体定义见「本体」标签页）；MySQL 事务为其产品实例。',
  );
  dbTx.card.rootContent = [dbTx.card.title || dbTx.label, ...dbTx.card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
  console.log('本体定义已并入 数据库事务 卡片（本体 tab）');
}

// 3) 摘除 事务 树节点
const trIdx = chapter.children.indexOf(trEntry.node);
if (trIdx < 0) throw new Error('事务 not a chapter child');
chapter.children.splice(trIdx, 1);
// 提升子节点：数据库事务打头，随后 MySQL 事务 / 事务原理，再其余提升节点
chapter.children.splice(0, 0, promoted[0]); // 数据库事务
chapter.children.splice(2, 0, ...promoted.slice(1)); // 其余跟在 MySQL 事务、事务原理 之后
console.log('promoted', promoted.length, 'children; 事务 unmounted from tree');

// 4) 章节一级排序（显式全量校验）
const orderRefs = [
  'k_1783250593540_v2w5hy', 'n_ag24bbkc', 'theory_domain_transaction_theory',
  'concept_transaction_lifecycle', 'concept_transaction_management', 'concept_global_transaction',
  'concept_transaction_id', 'concept_read_only_transaction', 'concept_tcl', 'k_dict_n5wdsgcu',
  'concept_mini_transaction', 'concept_throughput_tps',
  'concept_read_phenomena', 'concept_mvcc', 'concept_lock_mechanism',
  'concept_consistent_read', 'concept_semi_consistent_read', 'concept_rollback',
  'concept_concurrency', 'concept_victim', 'concept_lost_update',
];
const byMap = new Map(chapter.children.map((c) => [c.nodeRef, c]));
if (byMap.size !== chapter.children.length) throw new Error('chapter children not unique');
if (byMap.size !== orderRefs.length) throw new Error(`order list mismatch: ${byMap.size} children vs ${orderRefs.length} order refs`);
chapter.children = orderRefs.map((r) => {
  const e = byMap.get(r);
  if (!e) throw new Error('missing chapter child: ' + r);
  return e;
});
console.log('chapter order:', chapter.children.map((c) => c.name).join(' → '));

// 5) 清理被提升子节点与被摘除节点的 treebind（章节直属无绑定）
const dropTargets = new Set(promoteOrder.concat(['concept_transaction']));
const out = edges.filter((e) => !(e.id.startsWith('treebind:') && dropTargets.has(e.target)));
console.log('treebind removed:', edges.length - out.length, `(edges ${edges.length} -> ${out.length})`);

// 6) placement 同步
{
  const pl = gov.placements.find((p) => p.nodeId === 'concept_transaction');
  if (pl) { pl.canonicalTreeEntryId = undefined; console.log('placement entry cleared: concept_transaction'); }
}

atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('fix-tx-fuse-transaction complete');
