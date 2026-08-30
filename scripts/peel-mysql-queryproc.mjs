// 剥离 MySQL 域 · 嵌套 query-processing 主题簇（2026-08-23，第十二批，用户「都移走移到本体下当作子文件夹」）
// 用户：把 MySQL「数据布局」下嵌套的 mysql:theme:query-processing（早期 query 批次漏剥的嵌套副本）
// 整体移到本体下，当作"子文件夹"——即在数据库原理本体域 database_principles 下新建
// 「查询处理」文件夹概念，6 个 feature 概念作为其子项，MySQL 词节点改为实例 + instance-of 回指。
//
// 6 个 feature（均为 MySQL 优化器/全文特性，但用户明确要求全部移走）：
//  - 索引条件下推 / index condition pushdown (ICP)
//  - 排序缓冲区 / sort buffer
//  - 盲查询扩展 / blind query expansion
//  - 随机探查 / random dive
//  - 相关性 / relevance
//  - 词干提取 / stemming
//
// 结构：database_principles > tree_concept_query_processing（文件夹）
//          ├─ tree_concept_index_condition_pushdown → [MySQL ICP 实例]
//          ├─ tree_concept_sort_buffer → [MySQL sort buffer 实例]
//          ├─ tree_concept_blind_query_expansion → [MySQL blind query expansion 实例]
//          ├─ tree_concept_random_dive → [MySQL random dive 实例]
//          ├─ tree_concept_relevance → [MySQL relevance 实例]
//          └─ tree_concept_stemming → [MySQL stemming 实例]
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-queryproc-${ts}`);
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
const TARGET_HINT = ['数据库', '查询处理'];

// 1 个文件夹概念 + 6 个 feature 概念（全部新建）
const NEWS = [
  { conceptId: 'concept_query_processing', label: '查询处理 / query processing', dims: ['数据库', '查询处理'],
    def: '**查询处理 / query processing**\n数据库管理系统对 SQL 语句进行解析、优化与执行的整体过程：解析器将语句转为语法树，优化器据此生成执行计划，执行引擎按计划扫描/连接/排序并返回结果。\n\n本节点作为「查询处理」子文件夹承载本簇模型；各系统的优化器特性作为子概念与实例挂其下。',
    example: '**同构实例**：MySQL 优化器、Oracle CBO、PostgreSQL planner。' },
  { conceptId: 'concept_index_condition_pushdown', label: '索引条件下推 / index condition pushdown', dims: ['数据库', '查询处理', '优化'],
    def: '**索引条件下推 / index condition pushdown (ICP)**\n一种查询优化方法：将 WHERE 条件中能利用索引字段进行评估的部分，下推到存储引擎层执行，从而减少返回给服务层的整行数据量与回表次数。\n\n本节点只承载模型本体；各系统的 ICP 实现作为实例挂其下。',
    example: '**同构实例**：MySQL InnoDB ICP。' },
  { conceptId: 'concept_sort_buffer', label: '排序缓冲区 / sort buffer', dims: ['数据库', '查询处理', '内存'],
    def: '**排序缓冲区 / sort buffer**\n执行排序操作（ORDER BY、GROUP BY、索引构建等）时使用的一段内存缓冲区；数据量超出缓冲区内存时通常落盘使用临时文件。\n\n本节点只承载模型本体；各系统的排序缓冲区实现作为实例挂其下。',
    example: '**同构实例**：MySQL sort buffer / innodb_sort_buffer_size、PostgreSQL work_mem。' },
  { conceptId: 'concept_blind_query_expansion', label: '盲查询扩展 / blind query expansion', dims: ['数据库', '全文检索', '查询处理'],
    def: '**盲查询扩展 / blind query expansion**\n全文检索的一种特殊模式：执行两次搜索，第二次以第一次搜索结果中最相关文档的词扩展原查询短语，以召回更多相关文档。\n\n本节点只承载模型本体；各系统的全文查询扩展实现作为实例挂其下。',
    example: '**同构实例**：MySQL FULLTEXT 的 WITH QUERY EXPANSION。' },
  { conceptId: 'concept_random_dive', label: '随机探查 / random dive', dims: ['数据库', '统计信息', '优化'],
    def: '**随机探查 / random dive**\n通过从索引中随机采样页面来快速估算某列不同值数量（cardinality）的技术，用于优化器选择访问路径。\n\n本节点只承载模型本体；各系统的统计采样实现作为实例挂其下。',
    example: '**同构实例**：InnoDB 随机探查估算 cardinality。' },
  { conceptId: 'concept_relevance', label: '相关性 / relevance', dims: ['数据库', '全文检索'],
    def: '**相关性 / relevance**\n全文检索中表示搜索字符串与文档数据之间相似度的数值；通常词出现频率越高、分布越集中于少数文档，相关性越高。\n\n本节点只承载模型本体；各系统的相关性计算实现作为实例挂其下。',
    example: '**同构实例**：MySQL FULLTEXT 相关性评分。' },
  { conceptId: 'concept_stemming', label: '词干提取 / stemming', dims: ['数据库', '全文检索'],
    def: '**词干提取 / stemming**\n基于共同词根搜索单词不同变体（单复数、时态等）的能力，是全文检索的标准化预处理手段之一。\n\n本节点只承载模型本体；各系统的词干提取实现作为实例挂其下。',
    example: '**同构实例**：MySQL FULLTEXT 词干提取（MyISAM/InnoDB）。' },
];

// 6 个 MySQL 词节点 → 各自 feature 概念（全部为叶子，无嵌套问题）
const MAPS = [
  { ref: 'mysql_glossary_index_condition_pushdown_tudely', conceptId: 'concept_index_condition_pushdown', inst: 'MySQL 索引条件下推 / ICP' },
  { ref: 'mysql_glossary_sort_buffer_1x3j60', conceptId: 'concept_sort_buffer', inst: 'MySQL 排序缓冲区 / sort buffer' },
  { ref: 'mysql_glossary_blind_query_expansion_17xip3', conceptId: 'concept_blind_query_expansion', inst: 'MySQL 盲查询扩展 / blind query expansion' },
  { ref: 'mysql_glossary_random_dive_1sbv22', conceptId: 'concept_random_dive', inst: 'MySQL 随机探查 / random dive' },
  { ref: 'mysql_glossary_relevance_1schdd', conceptId: 'concept_relevance', inst: 'MySQL 相关性 / relevance' },
  { ref: 'mysql_glossary_stemming_w8xwzt', conceptId: 'concept_stemming', inst: 'MySQL 词干提取 / stemming' },
];

const createdConcepts = [];
const FOLDER = 'concept_query_processing';
let folderEntry = null;
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
  const entry = { id: `tree_${it.conceptId}`, name: it.label, count: 0, nodeRef: it.conceptId, children: [] };
  if (it.conceptId === FOLDER) {
    // 文件夹概念挂到本体域根
    targetNode.children = targetNode.children || [];
    targetNode.children.push(entry);
    folderEntry = entry;
  } else {
    // feature 概念挂到「查询处理」文件夹下（子文件夹语义）
    if (!folderEntry) { console.error('folder entry missing, abort before children attach'); process.exit(1); }
    folderEntry.children = folderEntry.children || [];
    folderEntry.children.push(entry);
  }
  createdConcepts.push(it.conceptId);
}
console.log('created concepts:', createdConcepts.length, '| folder entry:', folderEntry ? folderEntry.id : 'NONE');

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
      content: `**${it.inst}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${concept.label}」概念节点（数据库原理域 · 查询处理）。` },
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

// 移除嵌套的 mysql:theme:query-processing 主题容器（其 nodeRef 为自身 id，通用空容器清理不会命中）
let removedTheme = 0;
walk(tree, (n, parent) => {
  if (parent && n.id === 'mysql:theme:query-processing') {
    const i = parent.children.indexOf(n);
    if (i >= 0 && (!n.children || n.children.length === 0)) { parent.children.splice(i, 1); removedTheme++; console.log('removed empty theme:', n.id); }
  }
});
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
console.log('removed theme:', removedTheme, '| removed empty (MySQL):', removedEmpty, '| mapped:', mapped, '| skipped:', skipped);

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
  const parentEntryId = it.conceptId === FOLDER ? TARGET : FOLDER;
  const parentLabel = it.conceptId === FOLDER ? '数据库原理' : '查询处理';
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`, nodeId: it.conceptId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: parentEntryId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: it.conceptId === FOLDER ? [...TARGET_HINT] : [...TARGET_HINT, it.label],
    confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `查询处理相关概念，自 MySQL 嵌套 query-processing 主题剥离；${it.conceptId === FOLDER ? '作为「查询处理」子文件夹承载本簇' : '挂于「查询处理」文件夹下'}。MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...TARGET_HINT, pool[it.conceptId].label, it.inst], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 嵌套 query-processing 主题剥离；本体见「${pool[it.conceptId].label}」（数据库原理域 · 查询处理）。`,
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
console.log('peel-mysql-queryproc complete: concepts+=', createdConcepts.length, 'instances=', mapped);
