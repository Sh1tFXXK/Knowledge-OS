// 剥离 MySQL 域补刀批（2026-08-23）：存储程序/视图 残留节点
// 背景：前几批已把 concept_stored_program / concept_stored_object / concept_data_dictionary /
// concept_data_access_interface / 数据类型 等本体建好并挂载到「数据库原理」域，
// 但 MySQL 树 逻辑存储层级 → 数据库/database 下仍残留三个属本体的知识节点：
//   存储过程 (k_1782930954484_nwtfg7)  → 概念 concept_stored_program 的 MySQL 实例
//   触发器   (k_1782930904543_kxi0uk)  → 同上（触发器是特殊类型的存储过程）
//   视图     (k_dict_lm90vzok)         → 概念 concept_stored_object 的 MySQL 实例（存储对象=存储程序+视图）
// 本脚本把它们改写为 MySQL 实例、保留各自子树（如物化视图）、挂到本体树下、加 instance-of 边、
// 清理 MySQL 空容器、补 governance placement。范式同 peel-mysql-remaining-mixed.mjs。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-stored-objects-leftover-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP_HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理'];

// 实例项：ref=MySQL 节点, conceptId=目标本体, instLabel=改写后的 MySQL 实例名
const ITEMS = [
  { ref: 'k_1782930954484_nwtfg7', conceptId: 'concept_stored_program', instLabel: 'MySQL 存储过程' },
  { ref: 'k_1782930904543_kxi0uk', conceptId: 'concept_stored_program', instLabel: 'MySQL 触发器' },
  { ref: 'k_dict_lm90vzok', conceptId: 'concept_stored_object', instLabel: 'MySQL 视图' },
];

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, (n) => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
if (!MYSQL_ROOT) throw new Error('未找到 MySQL 根');

// ---------- 1) node-pool：改写为 MySQL 实例 ----------
for (const it of ITEMS) {
  const m = pool[it.ref];
  if (!m) throw new Error(`缺少 MySQL 节点 ${it.ref}`);
  const concept = pool[it.conceptId];
  if (!concept) throw new Error(`缺少本体节点 ${it.conceptId}`);
  const tabs = (m.card && m.card.tabs) || [];
  const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || '';
  it.conceptLabel = concept.label;
  it.origName = m.label;
  m.label = it.instLabel;
  m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
  m.tags = Array.from(new Set([...(m.tags || []), it.instLabel, 'mysql']));
  m.card = m.card || {};
  m.card.title = it.instLabel;
  m.card.tabs = [
    {
      id: 'def', label: '定义（MySQL 实例）',
      content: `**${it.instLabel}**\n「${it.conceptLabel}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${it.conceptLabel}」概念节点（数据库原理）。`,
    },
  ];
  m.card.rootContent = `**${it.instLabel}**\n「${it.conceptLabel}」通用概念在 MySQL 中的具体呈现。本节点是实例，本体在数据库原理域。`;
  console.log(`rewrote instance: ${it.origName} -> ${it.instLabel} (-> ${it.conceptLabel})`);
}

// ---------- 2) tree-data：从 MySQL 树摘下，挂到本体树下（保留子树） ----------
function detachByRef(ref) {
  let existing = null;
  const hits = [];
  walk(tree, (n, parent) => { if (parent && n.nodeRef === ref) hits.push({ n, parent }); });
  for (const { n, parent } of hits) {
    parent.children.splice(parent.children.indexOf(n), 1);
    if (!existing) existing = n;
  }
  return existing;
}
for (const it of ITEMS) {
  const conceptEntry = findNode(`tree_${it.conceptId}`);
  if (!conceptEntry) throw new Error(`未找到本体树入口 tree_${it.conceptId}`);
  const detached = detachByRef(it.ref);
  if (!detached) throw new Error(`MySQL 树下未找到 nodeRef=${it.ref} 的入口`);
  detached.name = pool[it.ref].label;       // 用改写后的实例名
  detached.projection = false;
  delete detached.view; delete detached.projectionKind; delete detached.sourceNodeId;
  conceptEntry.children = conceptEntry.children || [];
  conceptEntry.children.push(detached);
  console.log(`reparented ${detached.name} under tree_${it.conceptId}`);
}

// MySQL 子树空容器清理（仅删无 nodeRef 且无子的容器）
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
console.log('removed empty MySQL containers:', removedEmpty);

// ---------- 3) edges：instance-of 回指 ----------
for (const it of ITEMS) {
  const id = `rel:${it.conceptId}:instance-of:${it.ref}`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: it.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
    console.log('added edge', id);
  }
}

// ---------- 4) governance：placement ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p; else placements.push(p);
}
for (const it of ITEMS) {
  upsertPlacement({
    id: `placement:instance:${it.ref}`,
    nodeId: it.ref,
    status: 'accepted',
    contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId,
    canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, it.conceptLabel, it.instLabel],
    confidence: 'high',
    rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 树补刀剥离；本体见「${it.conceptLabel}」（数据库原理）。`,
  });
}

// ---------- 5) 原子写回 ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
console.log('peel-mysql-stored-objects-leftover complete:', ITEMS.length, 'instances');
