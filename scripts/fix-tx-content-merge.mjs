// 同题实例内容合并（2026-08-30 第二轮）
// 原则：相同题目的节点要读懂内容后合并，保留卡必须吸收被归档卡的全部实质信息点，
// 而不是只保留内容较多的一份。
//  1) 补并上一轮归档节点中未被保留卡覆盖的信息点：
//     共享锁(S Lock/不互斥)、排他锁(X Lock/阻断读写)、自增锁(三种锁模式)。
//  2) 新合并同题双实例：乐观锁(demo_optimistic + glossary)、悲观锁(demo_pessimistic + glossary)、
//     表锁(glossary 并入表级锁概念链)。
//  3) 行锁 vs 行级锁定：MySQL 文档中是两个相互引用的术语（机制 ↔ 锁类型），改为行锁嵌套
//     在行级锁定之下，双方内容都保留。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json', 'questions.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-tx-content-merge-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));

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
function attach(parentRef, entry, at = -1) {
  const hit = byRef(parentRef);
  if (!hit) throw new Error(`parent tree entry not found: ${parentRef}`);
  hit.node.children = hit.node.children || [];
  if (at < 0) hit.node.children.push(entry);
  else hit.node.children.splice(at, 0, entry);
}
function refreshRootContent(node) {
  const card = node.card;
  card.rootContent = [card.title || node.label, ...card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}
function appendDef(nodeId, block) {
  const tab = pool[nodeId].card.tabs.find((t) => t.id === 'def') || pool[nodeId].card.tabs[0];
  if (tab.content.includes(block.slice(0, 24))) { console.log('merge already applied:', nodeId); return; }
  tab.content += '\n\n' + block;
  refreshRootContent(pool[nodeId]);
  console.log('merged into def:', nodeId);
}
function renameNode(nodeId, newLabel) {
  const p = pool[nodeId];
  p.label = newLabel;
  if (p.card) { p.card.title = newLabel; refreshRootContent(p); }
  const t = byRef(nodeId);
  if (t) t.node.name = newLabel;
  console.log('renamed:', nodeId, '->', newLabel);
}
function addInstanceOf(sourceId, targetId, label) {
  const id = `rel:${targetId}:instance-of:${sourceId}`;
  if (edges.some((e) => e.id === id)) { console.log('edge exists:', id); return; }
  edges.push({ id, source: sourceId, target: targetId, type: 'instance-of', label, dimensions: pool[sourceId]?.dimensions || [] });
  console.log('edge added:', sourceId, '-instance-of->', targetId);
}
function unmountAndRedirect(dupId, canonicalId, rationale) {
  const dupEntry = byRef(dupId);
  if (!dupEntry) throw new Error(`tree entry not found: ${dupId}`);
  if ((dupEntry.node.children || []).length) throw new Error(`${dupId} has children; re-parent first`);
  detachByRef(dupId);
  pool[dupId].status = 'archived-redirect';
  gov.redirects.push({ id: `redirect:${dupId}`, from: dupId, to: canonicalId, status: 'accepted', contentStatus: 'archived-redirect', rationale });
  const before = gov.placements.length;
  gov.placements = gov.placements.filter((p) => p.nodeId !== dupId);
  if (gov.placements.length !== before) console.log('placement removed:', dupId);
  console.log('redirect registered:', dupId, '->', canonicalId);
}
function ensurePlacement(nodeId, parentNodeId, pathHint, rationale) {
  const entry = byRef(nodeId);
  const pl = gov.placements;
  const existing = pl.find((p) => p.nodeId === nodeId);
  if (existing) {
    existing.canonicalParentNodeId = parentNodeId;
    existing.canonicalTreeEntryId = entry ? entry.node.id : undefined;
    existing.pathHint = pathHint;
    console.log('placement updated:', nodeId, '->', parentNodeId);
    return;
  }
  pl.push({
    id: `placement:${nodeId}`, nodeId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: parentNodeId, canonicalTreeEntryId: entry ? entry.node.id : undefined,
    pathHint, confidence: 'high', rationale,
  });
  console.log('placement created:', nodeId, '->', parentNodeId);
}

// ---------- 1) 补并上一轮被归档节点的信息点 ----------
appendDef('k_dict_yvuxhe74', '又称**读锁**（S Lock）：共享锁彼此**不互斥**，多个事务可同时持有同一对象的共享锁。');
appendDef('mysql_glossary_exclusive_lock_ksqz5a', '又称**排他锁**（X Lock）：持有即阻断其他事务对该行加读锁或写锁。');
appendDef('mysql_glossary_auto_increment_locking_lrps8v', 'InnoDB 的自增锁模式由 `innodb_autoinc_lock_mode` 控制（0=传统、1=连续、2=交错；MySQL 8.0 起默认 2），在自增值的连续性与插入并发之间权衡。');
// 元数据锁(MDL 已并)、闩锁(mutex/rw-lock 已在词条正文)、意向锁(IS/IX 已在词条正文并有子条目)、
// MySQL 读现象、快照读：核对后其被归档内容已全部被保留卡覆盖，无需再并。

// ---------- 2) 乐观锁：OCC 长文(保留) + MySQL 词条 InnoDB 要点(并入后归档) ----------
appendDef('demo_optimistic',
  '**InnoDB 中的乐观策略**：InnoDB 对加锁、提交等操作采用乐观策略——事务修改的数据可以在提交发生之前写入数据文件，使提交本身非常快速；但如果事务被回滚，则需要更多工作来撤销更改。乐观策略的对立面是**悲观策略**，在数据库系统中很少见。');
renameNode('demo_optimistic', 'MySQL 乐观锁 / optimistic lock');
unmountAndRedirect('mysql_glossary_optimistic_1gdvw6', 'demo_optimistic',
  '与「MySQL 乐观锁」（demo_optimistic）同题双实例；其 InnoDB 乐观策略要点（提交前写盘、回滚代价、悲观对立面）已并入保留卡，本节点摘树归档。');
ensurePlacement('demo_optimistic', 'concept_optimistic_lock',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '锁机制 / locking mechanism', '乐观锁 / optimistic lock'],
  'MySQL 乐观锁实例，InnoDB 乐观策略要点已合并。');

// ---------- 3) 悲观锁：策略描述(保留) + MySQL 词条 InnoDB 要点(并入后归档) ----------
appendDef('demo_pessimistic',
  '**InnoDB 中的悲观策略**：InnoDB 使用悲观的加锁策略来最小化死锁机会；在应用层面，可以在事务开始时就获取所需的所有锁，从而避免死锁。许多内置数据库机制使用相反的**乐观方法**。');
renameNode('demo_pessimistic', 'MySQL 悲观锁 / pessimistic lock');
unmountAndRedirect('mysql_glossary_pessimistic_l0bpvy', 'demo_pessimistic',
  '与「MySQL 悲观锁」（demo_pessimistic）同题双实例；其 InnoDB 悲观加锁与死锁规避要点已并入保留卡，本节点摘树归档。');
ensurePlacement('demo_pessimistic', 'concept_pessimistic_lock',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '锁机制 / locking mechanism', '悲观锁 / pessimistic lock'],
  'MySQL 悲观锁实例，InnoDB 悲观策略要点已合并。');

// ---------- 4) 表锁：词条并入表级锁概念链，薄实例归档 ----------
renameNode('mysql_glossary_table_lock_15y9vl', 'MySQL 表锁 / table lock');
appendDef('mysql_glossary_table_lock_15y9vl', '粒度为**整张表**：表内所有行共享同一把锁。');
attach('concept_table_level_locking', detachByRef('mysql_glossary_table_lock_15y9vl'));
addInstanceOf('mysql_glossary_table_lock_15y9vl', 'concept_table_level_locking', 'MySQL 实例');
unmountAndRedirect('demo_table_lock', 'mysql_glossary_table_lock_15y9vl',
  '与「MySQL 表锁」（mysql_glossary_table_lock_15y9vl）同题双实例；其粒度要点（整表一把锁）已并入保留卡，本节点摘树归档。');
ensurePlacement('mysql_glossary_table_lock_15y9vl', 'concept_table_level_locking',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '锁机制 / locking mechanism', '表级锁 / table-level locking'],
  'MySQL 表锁词条是「表级锁 / table-level locking」概念的实例，承接原 MySQL 表级锁实例。');
for (const q of questions) {
  if (q.relatedNodeId === 'demo_table_lock') { q.relatedNodeId = 'mysql_glossary_table_lock_15y9vl'; console.log('question relatedNodeId redirected: demo_table_lock'); }
}

// ---------- 5) 行锁 嵌套到 行级锁定 之下（术语上互为机制与锁类型，双方内容都保留） ----------
attach('k_dict_fb1f2eh2', detachByRef('demo_row_lock'));
console.log('moved: MySQL 行锁 / row lock -> MySQL 行级锁定之下');

// ---------- treebind 同步（本次移动/摘除的节点） ----------
const MOVED = new Set(['mysql_glossary_table_lock_15y9vl', 'demo_row_lock']);
const UNMOUNTED = new Set(['mysql_glossary_optimistic_1gdvw6', 'mysql_glossary_pessimistic_l0bpvy', 'demo_table_lock']);
const mounts = new Map();
(function walk(n, parent) {
  if (n.nodeRef) mounts.set(n.nodeRef, { entryId: n.id, parentEntryId: parent?.id ?? null, parentNodeRef: parent?.nodeRef ?? null });
  for (const c of n.children || []) walk(c, n);
})(tree, null);
let removed = 0, updated = 0, created = 0;
let out = edges.filter((e) => !(e.id.startsWith('treebind:') && (UNMOUNTED.has(e.source) || UNMOUNTED.has(e.target))));
removed = edges.length - out.length;
const perTarget = new Map();
for (const e of out) {
  if (!e.id.startsWith('treebind:') || !MOVED.has(e.target)) continue;
  if (!perTarget.has(e.target)) perTarget.set(e.target, []);
  perTarget.get(e.target).push(e);
}
const dropIds = new Set();
for (const [nodeRef, list] of perTarget) {
  const m = mounts.get(nodeRef);
  const want = list.find((e) => e.source === m.parentNodeRef);
  const first = want || list[0];
  const newId = `treebind:${m.parentEntryId}:${m.entryId}`;
  if (first.source !== m.parentNodeRef || first.id !== newId) { first.source = m.parentNodeRef; first.id = newId; updated++; }
  for (const e of list) if (e !== first) dropIds.add(e.id);
}
out = out.filter((e) => !dropIds.has(e.id));
removed += dropIds.size;
for (const nodeRef of MOVED) {
  const m = mounts.get(nodeRef);
  const wantId = `treebind:${m.parentEntryId}:${m.entryId}`;
  if (!out.some((e) => e.id === wantId)) {
    out.push({ id: wantId, source: m.parentNodeRef, target: nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [] });
    created++;
  }
}
console.log(`treebind synced: updated=${updated} created=${created} removed=${removed} (edges ${edges.length} -> ${out.length})`);

// ---------- write ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
atomicWrite('questions.json', questions);
console.log('fix-tx-content-merge complete');
