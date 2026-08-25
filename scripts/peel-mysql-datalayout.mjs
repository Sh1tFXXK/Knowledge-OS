// 剥离 MySQL 域 · 数据布局（物理存储结构）簇（2026-08-23，第十一批，用户「还有数据布局」）
// 用户：把 MySQL「数据布局」下所有通用数据库存储概念（表空间/段/区段/页/各类表空间/回滚段/撤销段/页类型）
// 按「本体 vs 实例」范式剥离到数据库原理本体域 database_principles（数据库 > 数据库原理）。
//
// 一个通用概念 + 多个 MySQL 实例（页子类型归并到 concept_page）：
//  - 干净页 / 年轻页 / 邻页 / 撕裂页 / 溢出页 都是「页」的实例（含 InnoDB 专有状态）。
// 故 16 个 MySQL 词节点 → 11 个通用概念。
//
// 明确保留在 MySQL（本批不动，理由见日志）：
//  - 可传输表空间 / 通用表空间：MySQL 5.6/5.7 引入的专有特性关键字（非通用表空间类型）。
//  - 嵌套的 mysql:theme:query-processing（ICP / sort buffer / 盲查扩展 / 随机探查 / 相关性 / 词干提取）：
//    是 MySQL 优化器/全文特性，且为早期 query 批次漏剥的嵌套副本，不属"数据布局"范畴。
//  - 上确界记录 / 极小记录 / 空间 ID：InnoDB 页/表空间内部实现细节。
//
// 关键坑（已修正）：
//  存储层级是 NESTED 树。若先摘顶层「表空间」，detachByRef 会连同整棵子树一起移走，导致子节点"不在 MySQL 树下"被跳过。
//  故：(a) 预步骤先把要保留的 transportable/general tablespace 从「表空间」子树摘出挂回「数据布局」；
//      (b) MAPS 按自底向上（叶子先于父节点）顺序处理，子节点先独立摘走；(c) 末尾清理残留空「种类」容器。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-datalayout-${ts}`);
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
const TARGET = 'database_principles'; // 数据库原理本体域
const targetNode = findNode(TARGET);
if (!targetNode) { console.error('TARGET domain not found:', TARGET); process.exit(1); }
const TARGET_HINT = ['数据库', '存储结构'];

// 11 个通用概念（数据库物理存储本体）
const NEWS = [
  { conceptId: 'concept_tablespace', label: '表空间 / tablespace', dims: ['数据库', '存储结构', '物理存储'],
    def: '**表空间 / tablespace**\n数据库管理系统中用于组织、存储数据的逻辑容器，由一个或多个数据文件构成，可容纳若干表及其索引。是物理存储设备与逻辑数据库对象之间的中间抽象层。\n\n本节点只承载模型本体；各系统的表空间实现作为实例挂其下。',
    example: '**同构实例**：MySQL InnoDB 表空间、Oracle tablespace、PostgreSQL tablespace。' },
  { conceptId: 'concept_segment', label: '段 / segment', dims: ['数据库', '存储结构', '物理存储'],
    def: '**段 / segment**\n表空间内部的逻辑划分单位，类比目录中的"文件"。一个段可容纳一类数据库对象的数据（如一个表的数据段、每个索引各自的索引段），可增长并新建。\n\n本节点只承载模型本体；各系统的段实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 段、Oracle 段（数据段 / 索引段 / 临时段）。' },
  { conceptId: 'concept_extent', label: '区段 / extent', dims: ['数据库', '存储结构', '物理存储'],
    def: '**区段 / extent**\n表空间内由一组连续页组成的基本分配单位。分配存储空间时以区段为单位进行；例如默认 16KB 页时一个区段包含 64 个页，区段大小通常为 1MB。\n\n本节点只承载模型本体；各系统的区段实现作为实例挂其下。',
    example: '**同构实例**：InnoDB extent。' },
  { conceptId: 'concept_page', label: '页 / page', dims: ['数据库', '存储结构', '物理存储'],
    def: '**页 / page**\n数据库存储的最小 I/O 与磁盘管理单位。一个页存放行数据、索引条目或系统信息；页有固定大小，并可按用途分为多种类型（干净页、脏页、溢出页、邻页、撕裂页、年轻页等）。\n\n本节点只承载本体；各类页作为实例挂其下。',
    example: '**同构实例**：InnoDB 页、各类数据库的数据页 / 索引页。' },
  { conceptId: 'concept_page_size', label: '页大小 / page size', dims: ['数据库', '存储结构', '参数'],
    def: '**页大小 / page size**\n单个页占用的字节数（如 4KB / 8KB / 16KB）。是存储子系统的关键参数，在 I/O 效率、单行存放能力与空间开销之间做权衡。\n\n本节点只承载模型本体；各系统的页大小参数作为实例挂其下。',
    example: '**同构实例**：InnoDB innodb_page_size、SQL Server 8KB 页。' },
  { conceptId: 'concept_rollback_segment', label: '回滚段 / rollback segment', dims: ['数据库', '事务', '存储结构'],
    def: '**回滚段 / rollback segment**\n存储撤销日志（undo log）的区域，用于在事务回滚与一致性读时还原数据的旧版本。传统上位于系统表空间，现代实现可位于独立撤销表空间中。\n\n本节点只承载模型本体；各系统的回滚段实现作为实例挂其下。',
    example: '**同构实例**：InnoDB rollback segment。' },
  { conceptId: 'concept_undo_log_segment', label: '撤销日志段 / undo log segment', dims: ['数据库', '事务', '存储结构'],
    def: '**撤销日志段 / undo log segment**\n一组撤销日志的集合，存在于回滚段之中。一个撤销日志段同一时间只能被一个事务使用；该事务提交或回滚后，段可被其他事务复用。\n\n本节点只承载模型本体；各系统的撤销日志段实现作为实例挂其下。',
    example: '**同构实例**：InnoDB undo log segment。' },
  { conceptId: 'concept_undo_tablespace', label: '撤销表空间 / undo tablespace', dims: ['数据库', '事务', '存储结构'],
    def: '**撤销表空间 / undo tablespace**\n专门存放撤销日志的表空间。撤销日志存在于其中的撤销日志段内，撤销日志段又位于回滚段中。将撤销信息与系统表空间分离可提升并发与可管理性。\n\n本节点只承载模型本体；各系统的撤销表空间实现作为实例挂其下。',
    example: '**同构实例**：InnoDB undo tablespace。' },
  { conceptId: 'concept_shared_tablespace', label: '共享表空间 / shared tablespace', dims: ['数据库', '存储结构'],
    def: '**共享表空间 / shared tablespace**\n可被多个表共同使用的表空间（如系统表空间或通用表空间），与"独立表空间 / file-per-table"（每表独占一个表空间文件）相对。\n\n本节点只承载模型本体；各系统的共享表空间实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 系统表空间 / 通用表空间（被多表共享）。' },
  { conceptId: 'concept_system_tablespace', label: '系统表空间 / system tablespace', dims: ['数据库', '存储结构', '元数据'],
    def: '**系统表空间 / system tablespace**\n数据库系统自带的、存放数据字典与系统元数据的核心表空间，通常也包含全局事务 / 回滚信息等系统数据。\n\n本节点只承载模型本体；各系统的系统表空间实现作为实例挂其下。',
    example: '**同构实例**：InnoDB system tablespace（ibdata 文件）。' },
  { conceptId: 'concept_independent_tablespace', label: '独立表空间 / independent tablespace', dims: ['数据库', '存储结构'],
    def: '**独立表空间 / independent tablespace**\n为单个表单独分配的表空间（file-per-table 模式），每个表拥有自己的表空间文件，便于单表管理与空间回收。\n\n本节点只承载模型本体；各系统的独立表空间实现作为实例挂其下。',
    example: '**同构实例**：InnoDB file-per-table 表空间（.ibd 文件）。' },
];

// 16 个 MySQL 词节点 → 11 个概念（页子类型归并到 concept_page）
// 顺序：自底向上（叶子先于父节点），避免先摘顶层「表空间」把整棵子树一起移走。
const MAPS = [
  { ref: 'k_1781962829528_eqvypd', conceptId: 'concept_page', inst: 'MySQL 干净页 / clean page' },
  { ref: 'mysql_glossary_neighbor_page_1t6aj7', conceptId: 'concept_page', inst: 'MySQL 邻页 / neighbor page' },
  { ref: 'mysql_glossary_torn_page_1kprbq', conceptId: 'concept_page', inst: 'MySQL 撕裂页 / torn page' },
  { ref: 'mysql_glossary_young_ohocw3', conceptId: 'concept_page', inst: 'MySQL 年轻页 / young' },
  { ref: 'mysql_glossary_overflow_page_1x8lkk', conceptId: 'concept_page', inst: 'MySQL 溢出页 / overflow page' },
  { ref: 'mysql_glossary_page_size_1tjy75', conceptId: 'concept_page_size', inst: 'MySQL 页大小 / page size' },
  { ref: 'mysql_glossary_undo_log_segment_pbdi2c', conceptId: 'concept_undo_log_segment', inst: 'MySQL 撤销日志段 / undo log segment' },
  { ref: 'mysql_glossary_rollback_segment_40xjnc', conceptId: 'concept_rollback_segment', inst: 'MySQL 回滚段 / rollback segment' },
  { ref: 'k_1787209372193_jgoudp', conceptId: 'concept_page', inst: 'MySQL 页 / page' },
  { ref: 'mysql_glossary_extent_16v5kw', conceptId: 'concept_extent', inst: 'MySQL 区段 / extent' },
  { ref: 'mysql_glossary_segment_1vmvly', conceptId: 'concept_segment', inst: 'MySQL 段 / segment' },
  { ref: 'mysql_glossary_undo_tablespace_so71lf', conceptId: 'concept_undo_tablespace', inst: 'MySQL 撤销表空间 / undo tablespace' },
  { ref: 'mysql_glossary_shared_tablespace_1q68ln', conceptId: 'concept_shared_tablespace', inst: 'MySQL 共享表空间 / shared tablespace' },
  { ref: 'k_1787234925180_aqltgu', conceptId: 'concept_system_tablespace', inst: 'MySQL 系统表空间' },
  { ref: 'k_1787235074473_zuqcq4', conceptId: 'concept_independent_tablespace', inst: 'MySQL 独立表空间' },
  { ref: 'k_dict_umbo5ime', conceptId: 'concept_tablespace', inst: 'MySQL 表空间 / tablespace' }, // 顶层，最后处理
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
// 预步骤：把要保留的 MySQL 专有节点（可传输/通用表空间）从「表空间」子树摘出，挂回「数据布局」容器
const dataLayout = findNode('tree_1787206387703_hyeq5f');
for (const keepRef of ['mysql_glossary_transportable_tablespace_1685qd', 'mysql_glossary_general_tablespace_300irr']) {
  if (!dataLayout) continue;
  const node = detachByRef(keepRef);
  if (node) { dataLayout.children = dataLayout.children || []; dataLayout.children.push(node); console.log('kept in MySQL (re-parented to 数据布局):', keepRef); }
  else console.log('keep-node not found:', keepRef);
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

// 清理：MySQL 子树内 nodeRef 为空且无子节点的残留空容器（如「种类」分组容器）
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
// 显式移除 3 个「种类」分组容器（可能随被搬走的实例落入本体域，需全局清）
const KIND_IDS = ['k_1787234312795_rop6nc', 'k_1787233625869_ypnqp8', 'k_1787230799608_magwbh'];
let removedKind = 0;
for (const kid of KIND_IDS) {
  walk(tree, (n, parent) => {
    if (parent && n.id === kid) {
      const i = parent.children.indexOf(n);
      if (i >= 0 && (!n.children || n.children.length === 0)) { parent.children.splice(i, 1); removedKind++; console.log('removed empty 种类 container:', kid); }
    }
  });
}
console.log('removed empty containers (MySQL):', removedEmpty, '| removed 种类 containers:', removedKind, '| mapped:', mapped, '| skipped:', skipped);

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
    rationale: `通用数据库存储概念，自 MySQL 数据布局簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...TARGET_HINT, pool[it.conceptId].label, it.inst], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 数据布局簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理域）。`,
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
console.log('peel-mysql-datalayout complete: concepts+=', createdConcepts.length, 'instances=', mapped);
