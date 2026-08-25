// 剥离 MySQL 域 · 客户端/连接通用词簇（2026-08-23，第十四批，用户「一样」）
// 用户：把上批提示的偏通用词（GUID / 连接字符串 / API / 实例 / 主机）按同一范式剥离。
//
// 7 个 MySQL 词节点 → 3 个新概念 + 2 个归并已有概念：
//  - GUID → concept_guid（全局唯一标识符，通用标识概念）
//  - 实例 / instance → concept_instance（运行中的数据库服务器进程）
//  - 主机 / host → concept_host（网络主机名）
//  - API + 应用程序编程接口（API）+ PHP API → 已有 concept_data_access_interface（数据访问接口与连接生态）
//  - 连接字符串 / connection string → 已有 concept_connection（连接）
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-client-generic-${ts}`);
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
const TARGET_HINT = ['数据库', '客户端与连接'];

// 3 个新通用概念（数据库连接/标识本体）
const NEWS = [
  { conceptId: 'concept_guid', label: '全局唯一标识符 / GUID', dims: ['数据库', '标识', '客户端'],
    def: '**全局唯一标识符 / GUID**\n（globally unique identifier）一种全局唯一的 ID 值，可在不同数据库、语言、操作系统之间关联数据；作为顺序整数的替代方案，避免相同值出现在不同表/数据库/实例中产生歧义。\n\n本节点只承载模型本体；各系统的 GUID 实现作为实例挂其下。',
    example: '**同构实例**：MySQL 的 UUID()、SQL Server NEWID()、PostgreSQL gen_random_uuid()。' },
  { conceptId: 'concept_instance', label: '实例 / instance', dims: ['数据库', '服务器', '运行时'],
    def: '**实例 / instance**\n运行中的数据库服务器进程及其关联内存/后台线程，是数据库软件在具体主机上的运行态；同一软件可同时运行多个实例，各实例管理自己的数据文件与连接。\n\n本节点只承载模型本体；各系统的实例概念作为实例挂其下。',
    example: '**同构实例**：MySQL 实例、Oracle instance、PostgreSQL 实例。' },
  { conceptId: 'concept_host', label: '主机 / host', dims: ['数据库', '网络', '连接'],
    def: '**主机 / host**\n数据库服务器的网络名称或地址，用于建立连接时定位服务器；通常与端口（port）一同指定。\n\n本节点只承载模型本体；各系统的主机/连接参数作为实例挂其下。',
    example: '**同构实例**：MySQL 连接中的 host、PostgreSQL 连接主机名、Oracle HOST 连接描述符。' },
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

// 7 个 MySQL 词节点 → 3 新概念 + 已有 concept_data_access_interface / concept_connection（全部叶子）
const MAPS = [
  { ref: 'mysql_glossary_guid_bmsoy4', conceptId: 'concept_guid', inst: 'MySQL GUID' },
  { ref: 'k_dict_12jqwwcl', conceptId: 'concept_instance', inst: 'MySQL 实例 / instance' },
  { ref: 'mysql_glossary_host_1ctymw', conceptId: 'concept_host', inst: 'MySQL 主机 / host' },
  { ref: 'mysql_glossary_api_y14yjr', conceptId: 'concept_data_access_interface', inst: 'MySQL API' },
  { ref: 'mysql_glossary_application_programming_interface_api_73cc6c', conceptId: 'concept_data_access_interface', inst: 'MySQL 应用程序编程接口（API）' },
  { ref: 'mysql_glossary_php_api_1ldhpf', conceptId: 'concept_data_access_interface', inst: 'MySQL PHP API' },
  { ref: 'mysql_glossary_connection_string_1hyrot', conceptId: 'concept_connection', inst: 'MySQL 连接字符串 / connection string' },
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

// MySQL 子树内通用空容器清理（兜底；GUID/API 等在「备份与恢复」容器下，剥完若该容器仍有其他子节点则保留）
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
console.log('removed empty (MySQL):', removedEmpty, '| mapped:', mapped, '| skipped:', skipped);

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
    rationale: `通用数据库客户端/标识概念，自 MySQL 连接与服务簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...TARGET_HINT, pool[it.conceptId].label, it.inst], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 连接与服务簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理域）。`,
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
console.log('peel-mysql-client-generic complete: concepts+=', createdConcepts.length, 'instances=', mapped);
