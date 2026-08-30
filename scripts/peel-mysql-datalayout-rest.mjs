// 剥离 MySQL 域 · 数据布局剩余簇（2026-08-23，第十三批，用户「数据布局还没剥离完」）
// 用户：数据布局容器还剩 5 个节点未剥（上确界/极小记录、空间 ID、可传输表空间、通用表空间），继续按「本体 vs 实例」剥离。
//
// 5 个 MySQL 词节点 → 3 个新概念 + 1 个归并已有概念：
//  - supremum record + infimum record → concept_sentinel_record（哨兵记录：页内伪记录，一个概念两个实例）
//  - space ID → concept_tablespace_id（表空间标识符）
//  - transportable tablespace → concept_transportable_tablespace（可传输表空间）
//  - general tablespace → 已有 concept_shared_tablespace（共享表空间：通用表空间正是共享表空间的 MySQL 实例）
//
// 剥完后「数据布局」容器 tree_1787206387703_hyeq5f 变空，连同其 pool 节点 k_1787206387393_hk22dk（无 card）
// 及绑定边一并移除（该 pool 节点仅被此树容器引用）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-datalayout-rest-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

function walk(n, fn, parent) { fn(n, parent); for (const c of (n.children || [])) walk(c, fn, n); }
function findNode(id) { let hit = null; walk(tree, n => { if (!hit && n.id === id) hit = n; }); return hit; }
const MYSQL_ROOT = findNode('forest:view:mysql');
const TARGET = 'database_principles';
const targetNode = findNode(TARGET);
if (!targetNode) { console.error('TARGET domain not found:', TARGET); process.exit(1); }
const TARGET_HINT = ['数据库', '存储结构'];

// 3 个新通用概念（数据库物理存储本体）
const NEWS = [
  { conceptId: 'concept_sentinel_record', label: '哨兵记录 / sentinel record', dims: ['数据库', '存储结构', '索引'],
    def: '**哨兵记录 / sentinel record**\n索引页中用于界定边界范围的伪记录（pseudo-record）：位于页内最小值下方与最大值上方，代表"小于最小值"与"大于最大值"的间隙（gap），供锁与遍历定位使用。\n\n本节点只承载模型本体；各系统的哨兵记录实现作为实例挂其下。',
    example: '**同构实例**：InnoDB supremum / infimum record。' },
  { conceptId: 'concept_tablespace_id', label: '表空间标识符 / tablespace ID', dims: ['数据库', '存储结构', '元数据'],
    def: '**表空间标识符 / tablespace ID**\n数据库实例中用于唯一标识每个表空间的数字标识符；系统表空间通常为固定值（如 0），独立/通用表空间各自拥有唯一 ID。\n\n本节点只承载模型本体；各系统的表空间标识实现作为实例挂其下。',
    example: '**同构实例**：InnoDB space ID。' },
  { conceptId: 'concept_transportable_tablespace', label: '可传输表空间 / transportable tablespace', dims: ['数据库', '存储结构', '迁移'],
    def: '**可传输表空间 / transportable tablespace**\n将表空间从一个实例迁移到另一个实例的能力：通过导出表空间元数据并与数据文件一同拷贝，实现跨实例/跨平台的表空间移植。\n\n本节点只承载模型本体；各系统的可传输表空间实现作为实例挂其下。',
    example: '**同构实例**：MySQL transportable tablespace（FLUSH TABLES ... FOR EXPORT）、Oracle transportable tablespace。' },
];

const createdConcepts = [];
for (const it of NEWS) {
  if (pool[it.conceptId]) { console.log('skip existing concept:', it.conceptId); continue; }
  pool[it.conceptId] = {
    id: it.conceptId, label: it.label, kind: 'Concept', role: 'plain',
    dimensions: it.dims, tags: [it.label, ...it.dims],
    card: {
      nodeId: it.conceptId, title: it.label,
      tabs: [
        { id: 'def', label: '定义（本体）', content: it.def },
        { id: 'example', label: '示例（跨域实例）', content: it.example },
      ],
      rootContent: it.def.split('\n').slice(0, 2).join(' ').replace(/\*\*/g, ''),
    },
  };
  targetNode.children = targetNode.children || [];
  targetNode.children.push({ id: `tree_${it.conceptId}`, name: it.label, count: 0, nodeRef: it.conceptId, children: [] });
  createdConcepts.push(it.conceptId);
}
console.log('created concepts:', createdConcepts.length);

// 5 个 MySQL 词节点 → 3 新概念 + 已有 concept_shared_tablespace（全部叶子）
const MAPS = [
  { ref: 'mysql_glossary_supremum_record_1pbwmi', conceptId: 'concept_sentinel_record', inst: 'MySQL 上确界记录 / supremum record' },
  { ref: 'mysql_glossary_infimum_record_1jiz41', conceptId: 'concept_sentinel_record', inst: 'MySQL 极小记录 / infimum record' },
  { ref: 'mysql_glossary_space_id_1kjxje', conceptId: 'concept_tablespace_id', inst: 'MySQL 空间 ID / space ID' },
  { ref: 'mysql_glossary_transportable_tablespace_1685qd', conceptId: 'concept_transportable_tablespace', inst: 'MySQL 可传输表空间 / transportable tablespace' },
  { ref: 'mysql_glossary_general_tablespace_300irr', conceptId: 'concept_shared_tablespace', inst: 'MySQL 通用表空间 / general tablespace' },
];

// 仅扫 MySQL 子树，避免误摘本体域/其他域的节点
function detachByRef(ref) {
  let existing = null;
  const hits = [];
  walk(MYSQL_ROOT, (n, parent) => { if (parent && n.nodeRef === ref) hits.push({ n, parent }); });
  for (const { n, parent } of hits) {
    parent.children.splice(parent.children.indexOf(n), 1);
    if (!existing) existing = n;
  }
  return existing;
}

let mapped = 0, skipped = 0;
for (const it of MAPS) {
  const m = pool[it.ref];
  const concept = pool[it.conceptId];
  if (!m || !concept) { console.log('skip missing:', it.ref); skipped++; continue; }
  const tabs = (m.card && m.card.tabs) || [];
  const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || '';
  m.label = it.inst;
  m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
  m.tags = Array.from(new Set([...(m.tags || []), it.inst, 'mysql']));
  m.card = m.card || {};
  m.card.title = it.inst;
  m.card.tabs = [
    { id: 'def', label: '定义（MySQL 实例）',
      content: `**${it.inst}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${concept.label}」概念节点（数据库原理域）。` },
  ];
  m.card.rootContent = `**${it.inst}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现。本节点是实例，本体在数据库原理域。`;
  const conceptEntry = findNode(`tree_${it.conceptId}`);
  if (!conceptEntry) { console.log('skip no tree entry:', it.conceptId); skipped++; continue; }
  const detached = detachByRef(it.ref);
  if (!detached) { console.log('skip not under MySQL:', it.ref); skipped++; continue; }
  detached.name = it.inst;
  detached.projection = false;
  delete detached.view; delete detached.projectionKind; delete detached.sourceNodeId;
  conceptEntry.children = conceptEntry.children || [];
  conceptEntry.children.push(detached);
  mapped++;
  console.log(`mapped ${it.inst} -> ${concept.label}`);
}

// 移除空「数据布局」容器 tree_1787206387703_hyeq5f（连同 pool 节点 k_1787206387393_hk22dk 与绑定边）
const DATA_LAYOUT_TREE = 'tree_1787206387703_hyeq5f';
const DATA_LAYOUT_POOL = 'k_1787206387393_hk22dk';
let removedContainer = 0;
walk(tree, (n, parent) => {
  if (parent && n.id === DATA_LAYOUT_TREE) {
    const i = parent.children.indexOf(n);
    if (i >= 0 && (!n.children || n.children.length === 0)) { parent.children.splice(i, 1); removedContainer++; console.log('removed empty 数据布局 container:', n.id); }
  }
});
if (removedContainer) {
  delete pool[DATA_LAYOUT_POOL];
  console.log('removed pool node:', DATA_LAYOUT_POOL);
  const before = edges.length;
  edges.splice(0, edges.length, ...edges.filter((e) => !(e.source === DATA_LAYOUT_POOL || e.target === DATA_LAYOUT_POOL || e.source === DATA_LAYOUT_TREE || e.target === DATA_LAYOUT_TREE)));
  console.log('removed edges referencing container:', before - edges.length);
}
// MySQL 子树内通用空容器清理（兜底）
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
console.log('removed container:', removedContainer, '| removed empty (MySQL):', removedEmpty, '| mapped:', mapped, '| skipped:', skipped);

for (const it of MAPS) {
  const id = `rel:${it.conceptId}:instance-of:${it.ref}`;
  if (!edges.find((e) => e.id === id)) {
    edges.push({ id, source: it.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
  }
}

const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p; else placements.push(p);
}
for (const it of NEWS) {
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`, nodeId: it.conceptId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: TARGET, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...TARGET_HINT, it.label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `通用数据库存储概念，自 MySQL 数据布局剩余簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...TARGET_HINT, pool[it.conceptId].label, it.inst], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 数据布局剩余簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理域）。`,
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
console.log('peel-mysql-datalayout-rest complete: concepts+=', createdConcepts.length, 'instances=', mapped);
