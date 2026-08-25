// 修复：把事务簇中 5 个"已成 MySQL 实例标签、却未挂树"的孤儿节点，挂回对应本体概念下。
// 现象：peel-mysql-transaction.mjs 的 detachByRef 在树中未命中这些 ref（已脱离原 MySQL 位置），
//       但标签/卡片已改写为实例形态，故成为池中孤儿。本脚本补全挂载 + instance-of 边 + governance。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-transaction-fix-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理', '事务与并发控制'];
function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, n => { if (!hit && n.id === id) hit = n; }); return hit; }

const FIX = [
  { ref: 'mysql_tx_lifecycle', conceptId: 'concept_transaction_lifecycle' },
  { ref: 'k_1782928892375_1vgg04', conceptId: 'concept_lost_update' },
  { ref: 'mysql_glossary_global_transaction_4i1f06', conceptId: 'concept_global_transaction' },
  { ref: 'mysql_glossary_transaction_id_1aa5a7', conceptId: 'concept_transaction_id' },
  { ref: 'mysql_glossary_read_only_transaction_2kf2kq', conceptId: 'concept_read_only_transaction' },
];

let attached = 0, skipped = 0;
for (const it of FIX) {
  const m = pool[it.ref];
  const concept = pool[it.conceptId];
  const entry = findNode(`tree_${it.conceptId}`);
  if (!m) { console.log('skip missing pool node:', it.ref); skipped++; continue; }
  if (!concept) { console.log('skip missing concept:', it.conceptId); skipped++; continue; }
  if (!entry) { console.log('skip missing tree entry:', it.conceptId); skipped++; continue; }
  // 防重复挂载
  const already = (entry.children || []).some(c => c.nodeRef === it.ref);
  if (already) { console.log('already attached:', it.ref); attached++; continue; }
  const label = m.label || it.ref;
  entry.children = entry.children || [];
  entry.children.push({ id: `tree_${it.ref}`, name: label, count: 0, nodeRef: it.ref, children: [] });
  console.log(`attached ${label} -> ${concept.label}`);
  attached++;
}

// edges
for (const it of FIX) {
  const id = `rel:${it.conceptId}:instance-of:${it.ref}`;
  if (!edges.find(e => e.id === id)) {
    edges.push({ id, source: it.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
  }
}

// governance
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex(x => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p; else placements.push(p);
}
for (const it of FIX) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, pool[it.ref].label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，事务簇孤儿节点补挂；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
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
console.log('peel-mysql-transaction-fix complete: attached=', attached, 'skipped=', skipped);
