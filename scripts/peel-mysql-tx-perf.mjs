// 剥离 MySQL 域 · 事务(收尾) + 性能 簇（2026-08-23，全面扫描第九批）
// 用户「事务，性能，移走」：
//  - 事务：迁走残留在「事务与并发控制」主题下的 mini-transaction、innodb_autoinc_lock_mode（其余事务概念已在前批迁走）。
//  - 性能：迁走「性能与可观测性」主题下的 Performance Schema、innodb_lock_wait_timeout、option。
// 新建 4 通用概念（mini_transaction / performance_schema / lock_wait_timeout / configuration_option）；
// innodb_autoinc_lock_mode 挂已有 concept_auto_increment_lock。移完清掉两个空主题。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-tx-perf-${ts}`);
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
const MYSQL_ROOT = findNode('forest:view:mysql');
const dbpNode = findNode(DBP);

const NEWS = [
  { conceptId: 'concept_mini_transaction', label: '小型事务 / mini-transaction', dims: ['事务', '存储', '原子性'],
    def: '**小型事务 / mini-transaction（MTR）**\n存储引擎内部将**对若干数据页的修改分组为一个原子单位**的机制：MTR 没有独立的回滚概念，其修改要么随外层事务提交、要么随崩溃恢复重放 redo 日志。MTR 可在常规事务内发生，也可在后台线程（如 purge）上下文之外发生。\n\n本节点只承载模型本体；各存储引擎的小型事务实现作为实例挂其下。',
    example: '**同构实例**：InnoDB MTR 保证页级修改的原子性与 redo 写入。' },
  { conceptId: 'concept_performance_schema', label: '性能模式 / performance schema', dims: ['性能', '可观测性'],
    def: '**性能模式 / performance schema**\n数据库提供的、**可查询其内部各组件性能特征**的一组表/视图，是性能监控与可观测性框架的具象：暴露等待事件、语句统计、阶段计时等，用于定位瓶颈。\n\n本节点只承载模型本体；各 DBMS 的性能监控框架作为实例挂其下。',
    example: '**同构实例**：MySQL `performance_schema`、PostgreSQL `pg_stat_*` 视图。' },
  { conceptId: 'concept_lock_wait_timeout', label: '锁等待超时 / lock wait timeout', dims: ['并发', '锁', '故障'],
    def: '**锁等待超时 / lock wait timeout**\n事务**等待某个锁获取的最大时长**；超过则放弃等待、回滚等待方，以避免无限阻塞、并缓解某些跨存储引擎死锁（这类死锁无法被自动检测）。是可调的并发容错参数。\n\n本节点只承载模型本体；各 DBMS 的锁等待超时作为实例挂其下。',
    example: '**同构实例**：InnoDB `innodb_lock_wait_timeout`、SQL Server 锁超时。' },
  { conceptId: 'concept_configuration_option', label: '配置选项 / configuration option', dims: ['运维', '配置'],
    def: '**配置选项 / configuration option**\n数据库的**可调参数**，可存于配置文件或经命令行传入，控制存储引擎与实例行为（如各类前缀化的引擎选项）。是数据库运维与调优的基本单位。\n\n本节点只承载模型本体；各 DBMS 的配置选项体系作为实例挂其下。',
    example: '**同构实例**：MySQL `innodb_*` 选项、PostgreSQL `postgresql.conf` 参数。' },
];

const MAPS = [
  { ref: 'mysql_glossary_mini_transaction_ly3edv', conceptId: 'concept_mini_transaction', inst: 'MySQL mini-transaction / 小型事务' },
  { ref: 'mysql_glossary_innodb_autoinc_lock_mode_a8q16t', conceptId: 'concept_auto_increment_lock', inst: 'MySQL innodb_autoinc_lock_mode' },
  { ref: 'k_dict_pqd2sd20', conceptId: 'concept_performance_schema', inst: 'MySQL 性能模式 / Performance Schema' },
  { ref: 'mysql_glossary_innodb_lock_wait_timeout_1puppm', conceptId: 'concept_lock_wait_timeout', inst: 'MySQL innodb_lock_wait_timeout' },
  { ref: 'mysql_glossary_option_1sc73x', conceptId: 'concept_configuration_option', inst: 'MySQL 选项 / option' },
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
  dbpNode.children = dbpNode.children || [];
  dbpNode.children.push({ id: `tree_${it.conceptId}`, name: it.label, count: 0, nodeRef: it.conceptId, children: [] });
  createdConcepts.push(it.conceptId);
}
console.log('created concepts:', createdConcepts.length);

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
      content: `**${it.inst}**\n「${concept.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${concept.label}」概念节点（数据库原理）。` },
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

// 移除已空的主题/话题容器（其子全迁走后成了空壳，通用清理因带 nodeRef 不删，故显式清）
const EMPTY_THEMES = ['mysql:theme:transactions-concurrency', 'mysql:theme:performance-observability', 'mysql_topic_transactions_locks'];
let removedThemes = 0;
for (const tid of EMPTY_THEMES) {
  const t = findNode(tid);
  if (!t) continue;
  if ((t.children || []).length > 0) { console.log('主题非空，保留:', tid, t.children.map(c => c.name)); continue; }
  let removed = false;
  walk(tree, (n, parent) => {
    if (parent && parent.children) {
      const i = parent.children.findIndex(c => c.id === tid);
      if (i >= 0) { parent.children.splice(i, 1); removed = true; }
    }
  });
  if (removed) { removedThemes++; console.log('removed empty theme:', tid); }
}

// 通用清理（nodeRef 为空的残留空容器）
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
console.log('removed empty themes:', removedThemes, '| other empty containers:', removedEmpty, '| mapped:', mapped, '| skipped:', skipped);

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
    canonicalParentNodeId: DBP, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, it.label], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `通用概念，自 MySQL 事务/性能簇剥离；MySQL 侧保留为实例并 instance-of 回指。`,
  });
}
for (const it of MAPS) {
  if (!pool[it.ref] || !pool[it.conceptId]) continue;
  upsertPlacement({
    id: `placement:instance:${it.ref}`, nodeId: it.ref,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: it.conceptId, canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...DBP_HINT, pool[it.conceptId].label, it.inst], confidence: 'high', rule: 'cross-domain-peeling-v1',
    rationale: `MySQL 实例，自 MySQL 事务/性能簇剥离；本体见「${pool[it.conceptId].label}」（数据库原理）。`,
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
console.log('peel-mysql-tx-perf complete: concepts+=', createdConcepts.length, 'instances=', mapped);
