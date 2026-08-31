// 「七、事务系统」章节层级重排（2026-08-30 第四轮）
// 用户反馈：章节下不应再有「事务」文件夹兜住全部内容，应按 事务 / MySQL 事务 / 原理 排列。
// 改动：
//  1) MySQL 事务 从「事务→数据库事务」深层提升为章节直属节（位于「事务」之后）。
//  2) 「事务理论」从「事务」子树提升为章节直属，更名「事务原理」。
//  3) 章节一级排序：事务 → MySQL 事务 → 事务原理 → 读现象 → 多版本并发控制 → 锁机制
//     → 一致性读取 → 半一致性读取 → 回滚 → 并发 → 受害者 → 丢失更新。
//  4) 「事务」子树内排序：数据库事务 → 事务生命周期 → 事务管理 → 全局事务 → 事务ID
//     → 只读事务 → TCL → 分布式事务/XA → 小型事务 → 每秒事务数。
//  语义链不变：instance-of 边（MySQL 事务→数据库事务→事务）与卡片回指文本保持原样，
//  树只是导航投影（CONTEXT.md）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-tx-chapter-layout-${ts}`);
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

const TX = '七、事务系统';
const chapter = findWithParent(tree, (n) => n.name === TX).node;

// 1) 提升 MySQL 事务 到章节直属
const myTxEntry = detachByRef('n_ag24bbkc');
chapter.children.splice(1, 0, myTxEntry); // 「事务」之后
console.log('promoted: MySQL 事务 -> 章节直属');

// 2) 提升 事务理论 并更名 事务原理
const theoryEntry = detachByRef('theory_domain_transaction_theory');
theoryEntry.name = '事务原理';
const theory = pool['theory_domain_transaction_theory'];
theory.label = '事务原理';
if (theory.card) {
  theory.card.title = '事务原理';
  theory.card.rootContent = [theory.card.title || theory.label, ...theory.card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}
chapter.children.splice(2, 0, theoryEntry);
console.log('promoted+renamed: 事务理论 -> 事务原理（章节直属）');

// 3) 章节一级排序
const orderRefs = [
  'concept_transaction', 'n_ag24bbkc', 'theory_domain_transaction_theory',
  'concept_read_phenomena', 'concept_mvcc', 'concept_lock_mechanism',
  'concept_consistent_read', 'concept_semi_consistent_read', 'concept_rollback',
  'concept_concurrency', 'concept_victim', 'concept_lost_update',
];
const byMap = new Map(chapter.children.map((c) => [c.nodeRef, c]));
if (byMap.size !== chapter.children.length) throw new Error('chapter has duplicate/unref children');
const ordered = orderRefs.map((r) => { const e = byMap.get(r); if (!e) throw new Error('missing chapter child: ' + r); return e; });
if (ordered.length !== chapter.children.length) throw new Error('order list does not cover all chapter children');
chapter.children = ordered;
console.log('chapter reordered:', chapter.children.map((c) => c.name).join(' → '));

// 4) 「事务」子树内排序
const trEntry = byRef('concept_transaction');
const trOrder = [
  'k_1783250593540_v2w5hy', 'concept_transaction_lifecycle', 'concept_transaction_management',
  'concept_global_transaction', 'concept_transaction_id', 'concept_read_only_transaction',
  'concept_tcl', 'k_dict_n5wdsgcu', 'concept_mini_transaction', 'concept_throughput_tps',
];
// 以实际存在的 nodeRef 为准，不在列表中的追加在后
const trByMap = new Map(trEntry.node.children.map((c) => [c.nodeRef, c]));
const trOrdered = [];
for (const r of trOrder) { const e = trByMap.get(r); if (e) { trOrdered.push(e); trByMap.delete(r); } }
for (const [, e] of trByMap) trOrdered.push(e);
trEntry.node.children = trOrdered;
console.log('事务 子树排序:', trOrdered.map((c) => c.name).join(' → '));

// 5) 章节直属节点不建 treebind：仅删除「以被提升节点为 target（孩子）」的绑定；
//    其作为 source（父）的子节点绑定必须保留。
const promoted = new Set(['n_ag24bbkc', 'theory_domain_transaction_theory']);
const out = edges.filter((e) => {
  if (e.id.startsWith('treebind:') && promoted.has(e.target)) return false;
  return true;
});
console.log('treebind removed:', edges.length - out.length, `(edges ${edges.length} -> ${out.length})`);

// 6) placement：被提升节点保留语义父（数据库事务 / 空），只同步 treeEntryId
for (const nodeId of promoted) {
  const pl = gov.placements.find((p) => p.nodeId === nodeId);
  const entry = byRef(nodeId);
  if (pl) { pl.canonicalTreeEntryId = entry ? entry.node.id : undefined; console.log('placement entry synced:', nodeId); }
}

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try { renameSync(tmp, join(DATA, file)); ok = true; }
    catch (err) {
      if (i === 7) throw err;
      console.log(`rename ${file} busy (EPERM), retry ${i + 1}/7...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('fix-tx-chapter-layout complete');
