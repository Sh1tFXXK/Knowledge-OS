// 修复「七、事务系统」章节的六类问题（2026-08-30）
// 检查结论见会话记录，修复项：
//  A. 读现象家族统一：补「幻读」「不可重复读」概念本体并挂 MySQL 实例；
//     脏读概念链并入读现象；合并两个重复的「MySQL 读现象」实例。
//  B. 事务三层链：数据库事务接入（instance-of 事务），MySQL 事务改挂其下。
//  C. 锁区去重：共享/排他/自增/元数据/闩锁/意向锁的双份实例各保留信息量大的一份，
//     另一份摘树并登记 redirect（池节点保留，时间线快照不受影响）。
//  D. MVCC 薄卡：合并两张「快照读」，扩写「当前读」，补齐空的「清理操作」等。
//  E. 数据仓库迁出事务理论；四个隔离级别词条挂到「隔离级别」下；
//     全章清理过时的「（数据库原理）」引用文案。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json', 'questions.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-tx-system-ontology-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));

// ---------- helpers ----------
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
function patchTab(nodeId, tabId, content) {
  const n = pool[nodeId];
  const tab = n.card.tabs.find((t) => t.id === tabId);
  if (!tab) throw new Error(`tab ${tabId} not found on ${nodeId}`);
  tab.content = content;
  refreshRootContent(n);
}
function ensurePlacement(nodeId, parentNodeId, pathHint, rationale) {
  const entry = byRef(nodeId);
  const entryId = entry ? entry.node.id : undefined;
  const pl = gov.placements;
  const existing = pl.find((p) => p.nodeId === nodeId);
  if (existing) {
    existing.canonicalParentNodeId = parentNodeId;
    existing.canonicalTreeEntryId = entryId;
    existing.pathHint = pathHint;
    console.log('placement updated:', nodeId, '->', parentNodeId);
    return;
  }
  pl.push({
    id: `placement:${nodeId}`, nodeId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: parentNodeId, canonicalTreeEntryId: entryId,
    pathHint, confidence: 'high',
    rationale,
  });
  console.log('placement created:', nodeId, '->', parentNodeId);
}
function addInstanceOf(sourceId, targetId, label) {
  const id = `rel:${targetId}:instance-of:${sourceId}`;
  if (edges.some((e) => e.id === id)) { console.log('edge exists:', id); return; }
  edges.push({
    id, source: sourceId, target: targetId, type: 'instance-of',
    label, dimensions: pool[sourceId]?.dimensions || [],
  });
  console.log('edge added:', sourceId, '-instance-of->', targetId);
}
function unmountAndRedirect(dupId, canonicalId, rationale) {
  const dup = pool[dupId];
  const dupEntry = byRef(dupId);
  if (!dupEntry) throw new Error(`tree entry not found: ${dupId}`);
  if ((dupEntry.node.children || []).length) {
    throw new Error(`${dupId} has children; re-parent them first`);
  }
  detachByRef(dupId);
  gov.redirects.push({
    id: `redirect:${dupId}`,
    from: dupId, to: canonicalId,
    status: 'accepted', contentStatus: 'archived-redirect',
    rationale,
  });
  const before = gov.placements.length;
  gov.placements = gov.placements.filter((p) => p.nodeId !== dupId);
  if (gov.placements.length !== before) console.log('placement removed:', dupId);
  console.log('redirect registered:', dupId, '->', canonicalId);
}
function setRole(nodeId, role) {
  const n = pool[nodeId];
  if (!n) throw new Error(`pool node missing: ${nodeId}`);
  n.role = role;
}

const TX = '七、事务系统';

// ---------- A. 读现象家族 ----------
// A1. 新建两个概念本体
const dimsDirty = pool['concept_dirty_read'].dimensions;
function makeConcept(id, label, def, example) {
  pool[id] = {
    id, label, kind: 'Concept', role: 'plain',
    dimensions: [...dimsDirty],
    tags: [label, ...dimsDirty],
    card: {
      nodeId: id, title: label,
      tabs: [
        { id: 'def', label: '定义（本体）', content: def },
        { id: 'example', label: '示例（跨域实例）', content: example },
      ],
      rootContent: '',
    },
  };
  refreshRootContent(pool[id]);
  attach('concept_read_phenomena', {
    id: `tree_${id}`, name: label, count: 0, nodeRef: id,
  });
  console.log('concept created:', id);
}
makeConcept(
  'concept_phantom_read',
  '幻读 / phantom read',
  '**幻读 / phantom read**\n同一事务内两次执行同一**范围查询**，后一次读到了前一次结果集中**不存在的行**：其他事务插入（或更新后满足原查询条件）并提交了新行。行锁只能锁住已存在的行，锁不住「满足条件的行集合」的变化，因此幻读比不可重复读更难防范；SQL 标准需 SERIALIZABLE 级别才能完全规避。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
  '**同构实例**：SQL 标准隔离级别矩阵中的 phantom rows；MySQL 在 REPEATABLE READ 下用临键锁（next-key lock）抑制幻读。',
);
makeConcept(
  'concept_non_repeatable_read',
  '不可重复读 / non-repeatable read',
  '**不可重复读 / non-repeatable read**\n同一事务内两次读取**同一行**，因其他事务在此期间提交了更新（UPDATE），两次读取的值不一致。与幻读的区别：不可重复读针对**同一行的值变化**（update），幻读针对**结果集的行数变化**（insert / delete）。REPEATABLE READ 及以上级别规避。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
  '**同构实例**：SQL 标准隔离级别矩阵中对 non-repeatable read 的定义与防护。',
);

// A2. 脏读概念链并入读现象；幻读/不可重复读的 MySQL 词条挂到各自本体下并改名
attach('concept_read_phenomena', detachByRef('concept_dirty_read'));
ensurePlacement('concept_dirty_read', 'concept_read_phenomena',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '读现象 / read phenomena', '脏读 / dirty read'],
  '读现象家族统一：脏读是读现象之一，概念挂「读现象」本体下，MySQL 实例挂概念下。');
const renameInst = (id, oldLabel, newLabel) => {
  const entry = byRef(id);
  if (entry.node.name !== oldLabel) throw new Error(`${id} tree name mismatch: ${entry.node.name}`);
  entry.node.name = newLabel;
  pool[id].label = newLabel;
  if (pool[id].card) { pool[id].card.title = newLabel; refreshRootContent(pool[id]); }
};
attach('concept_phantom_read', detachByRef('k_dict_8o426b5j'));
renameInst('k_dict_8o426b5j', '幻读 / phantom', 'MySQL 幻读 / phantom');
addInstanceOf('k_dict_8o426b5j', 'concept_phantom_read', 'MySQL 实例');
attach('concept_non_repeatable_read', detachByRef('k_dict_c9sxzvqt'));
renameInst('k_dict_c9sxzvqt', '不可重复读 / non-repeatable read', 'MySQL 不可重复读 / non-repeatable read');
addInstanceOf('k_dict_c9sxzvqt', 'concept_non_repeatable_read', 'MySQL 实例');
ensurePlacement('concept_phantom_read', 'concept_read_phenomena',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '读现象 / read phenomena', '幻读 / phantom read'],
  '补齐读现象家族本体：幻读概念节点，MySQL 词条作为实例回指。');
ensurePlacement('concept_non_repeatable_read', 'concept_read_phenomena',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '读现象 / read phenomena', '不可重复读 / non-repeatable read'],
  '补齐读现象家族本体：不可重复读概念节点，MySQL 词条作为实例回指。');
ensurePlacement('k_dict_8o426b5j', 'concept_phantom_read',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '读现象 / read phenomena', '幻读 / phantom read', 'MySQL 幻读 / phantom'],
  'MySQL 幻读实例，本体见「幻读 / phantom read」。');
ensurePlacement('k_dict_c9sxzvqt', 'concept_non_repeatable_read',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '读现象 / read phenomena', '不可重复读 / non-repeatable read', 'MySQL 不可重复读 / non-repeatable read'],
  'MySQL 不可重复读实例，本体见「不可重复读 / non-repeatable read」。');

// A3. 合并两个「MySQL 读现象」：保留治理规范节点 mysql_tx_read_phenomena，摘除 glossary 副本
patchTab('mysql_tx_read_phenomena', 'def',
  '**MySQL 读现象**\n「读现象 / read phenomena」通用概念在 MySQL 中的具体呈现：\n\n现象如 **dirty reads**、**non-repeatable reads** 和 **phantom**：当一个事务读取了另一个事务修改、插入的数据时出现。MySQL/InnoDB 通过隔离级别与 MVCC/锁机制界定三类现象何时可能发生：脏读仅在 READ UNCOMMITTED 出现；REPEATABLE READ 下以临键锁抑制幻读。\n\n具体现象实例见子条目：「脏读 / dirty read」「幻读 / phantom read」「不可重复读 / non-repeatable read」概念节点及其 MySQL 实例。');
unmountAndRedirect('mysql_glossary_read_phenomena_n0vs4m', 'mysql_tx_read_phenomena',
  '与「MySQL 读现象」（mysql_tx_read_phenomena）为同一主题的两个实例节点，内容并入规范节点后摘树归档；原词条为 MySQL 术语导入副本。');

// ---------- B. 事务三层链：事务 → 数据库事务 → MySQL 事务 ----------
const dbTxEntry = detachByRef('k_1783250593540_v2w5hy');
attach('concept_transaction', dbTxEntry, 0);
attach('k_1783250593540_v2w5hy', detachByRef('n_ag24bbkc'));
addInstanceOf('k_1783250593540_v2w5hy', 'concept_transaction', '数据库领域实例');
const oldEdge = edges.find((e) => e.id === 'rel:concept_transaction:instance-of:n_ag24bbkc');
if (!oldEdge) throw new Error('MySQL 事务 instance-of edge not found');
oldEdge.id = 'rel:k_1783250593540_v2w5hy:instance-of:n_ag24bbkc';
oldEdge.target = 'k_1783250593540_v2w5hy';
console.log('edge retargeted: MySQL 事务 -instance-of-> 数据库事务');
const myTxDef = pool['n_ag24bbkc'].card.tabs.find((t) => t.id === 'def');
myTxDef.content = myTxDef.content.replace(
  '本节点是实例，其本体见「事务 / transaction」概念节点（数据库原理）。',
  '本节点是 MySQL 对「数据库事务」的产品实现；「数据库事务」上承「事务 / transaction」通用本体。',
);
refreshRootContent(pool['n_ag24bbkc']);
const dbTxDef = pool['k_1783250593540_v2w5hy'].card.tabs[0];
if (!dbTxDef.content.includes('域级概念')) {
  dbTxDef.content += '\n\n本节点是「事务 / transaction」本体在数据库领域的**域级概念**；MySQL 事务作为其产品实例挂其下（事务 → 数据库事务 → MySQL 事务）。';
  refreshRootContent(pool['k_1783250593540_v2w5hy']);
}
ensurePlacement('k_1783250593540_v2w5hy', 'concept_transaction',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '事务 / transaction', '数据库事务'],
  '数据库事务是「事务」本体在数据库领域的域级概念，MySQL 事务挂其下形成三层链。');
ensurePlacement('n_ag24bbkc', 'k_1783250593540_v2w5hy',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '事务 / transaction', '数据库事务', 'MySQL 事务'],
  'MySQL 事务是「数据库事务」的产品实例。');

// ---------- C. 锁区去重 ----------
// C1. 闩锁：glossary 词条挂到概念下作实例；摘除薄的「MySQL 闩锁与内存同步」
attach('concept_latch', detachByRef('k_dict_kgntvds7'));
addInstanceOf('k_dict_kgntvds7', 'concept_latch', 'MySQL 实例');
ensurePlacement('k_dict_kgntvds7', 'concept_latch',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '锁机制 / locking mechanism', '闩锁 / latch'],
  'MySQL 闩锁词条是「闩锁 / latch」概念的实例；替代内容较薄的 mysql_lock_latches。');
unmountAndRedirect('mysql_lock_latches', 'k_dict_kgntvds7',
  '与闩锁词条（k_dict_kgntvds7）同主题且内容为概述性重复；词条保留更完整的 MySQL 文档定义，本节点摘树归档。');

// C2. 意向锁：词条挂到概念下；摘除薄的「MySQL 意向锁」子系统，其子节点上移
attach('concept_intention_lock', detachByRef('mysql_glossary_intention_lock_1ejpzi'));
addInstanceOf('mysql_glossary_intention_lock_1ejpzi', 'concept_intention_lock', 'MySQL 实例');
const intentionHit = byRef('mysql_lock_intention');
for (const child of [...(intentionHit.node.children || [])]) {
  intentionHit.node.children = intentionHit.node.children.filter((c) => c !== child);
  attach('concept_intention_lock', child);
  console.log('re-parented:', child.nodeRef || child.id, '-> concept_intention_lock');
}
unmountAndRedirect('mysql_lock_intention', 'mysql_glossary_intention_lock_1ejpzi',
  '与意向锁词条（mysql_glossary_intention_lock_1ejpzi）同主题且内容为概述性重复；词条保留更完整的 MySQL 文档定义，本节点摘树归档，IS/IX 子节点上移至概念层。');

// C3. 共享/排他/自增/元数据锁：各摘除内容薄的一份
unmountAndRedirect('demo_shared_lock', 'k_dict_yvuxhe74',
  '与共享锁词条（k_dict_yvuxhe74）同主题重复；词条保留 MySQL 文档完整定义，本节点摘树归档。');
unmountAndRedirect('demo_exclusive_lock', 'mysql_glossary_exclusive_lock_ksqz5a',
  '「排他锁」「独占锁」为同一锁（exclusive lock）的两种译名，内容并入词条节点后摘树归档。');
unmountAndRedirect('mysql_lock_auto_increment', 'mysql_glossary_auto_increment_locking_lrps8v',
  '与自增锁词条（mysql_glossary_auto_increment_locking_lrps8v）同主题且内容为概述性重复；词条保留更完整的 MySQL 文档定义，本节点摘树归档。');
const mdlDef = pool['mysql_glossary_metadata_lock_qiqw4n'].card.tabs.find((t) => t.id === 'def');
if (!mdlDef.content.includes('首字母缩写')) {
  mdlDef.content += '\n\n**MDL**：「元数据锁」（metadata lock）的首字母缩写。';
  refreshRootContent(pool['mysql_glossary_metadata_lock_qiqw4n']);
}
unmountAndRedirect('mysql_glossary_mdl_braceg', 'mysql_glossary_metadata_lock_qiqw4n',
  '「MySQL MDL」仅为元数据锁的缩写词条，缩写说明已并入元数据锁词条，本节点摘树归档。');
unmountAndRedirect('mysql_lock_metadata', 'mysql_glossary_metadata_lock_qiqw4n',
  '与元数据锁词条（mysql_glossary_metadata_lock_qiqw4n）同主题且内容为概述性重复；词条保留更完整的 MySQL 文档定义，本节点摘树归档。');
ensurePlacement('k_dict_yvuxhe74', 'concept_shared_lock',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '锁机制 / locking mechanism', '共享锁 / shared lock'],
  'MySQL 共享锁词条是「共享锁 / shared lock」概念的实例。');
ensurePlacement('mysql_glossary_exclusive_lock_ksqz5a', 'concept_exclusive_lock',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '锁机制 / locking mechanism', '排他锁 / exclusive lock'],
  'MySQL 独占锁（exclusive lock）词条是「排他锁 / exclusive lock」概念的实例。');
ensurePlacement('mysql_glossary_auto_increment_locking_lrps8v', 'concept_auto_increment_lock',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '锁机制 / locking mechanism', '自增锁 / auto-increment lock'],
  'MySQL 自增锁词条是「自增锁 / auto-increment lock」概念的实例。');
ensurePlacement('mysql_glossary_metadata_lock_qiqw4n', 'concept_metadata_lock',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '七、事务系统', '锁机制 / locking mechanism', '元数据锁 / metadata lock (MDL)'],
  'MySQL 元数据锁词条是「元数据锁 / metadata lock (MDL)」概念的实例。');

// ---------- D. MVCC 薄卡与空卡 ----------
patchTab('demo_snapshot', 'def',
  '**快照读**\n读取记录的**历史版本**（InnoDB 从 undo log 构建版本链）而非最新版本，不加锁，由 Read View 做可见性判断。\n\n普通 `SELECT` 在 READ COMMITTED 与 REPEATABLE READ 下都是快照读；与之相对的是「当前读」（`SELECT ... FOR UPDATE` / `FOR SHARE` 及各 DML），读最新已提交版本并加锁。');
unmountAndRedirect('k_1782024439070_bvfq6r', 'demo_snapshot',
  '与「快照读」（demo_snapshot）同主题的两张薄卡，内容合并后摘树归档。');
patchTab('k_1782024448012_sl16gv', 'def',
  '**当前读**\n读取记录的**最新已提交版本**，并对读取范围加锁（记录锁 / 间隙锁 / 临键锁）。`SELECT ... FOR UPDATE`、`SELECT ... FOR SHARE` 以及 `UPDATE`、`DELETE`、`INSERT` 都是当前读。\n\n与「快照读」相对：快照读靠 MVCC 免锁读历史版本，当前读必须读最新数据以保证锁定语义正确。');
setRole('k_1782024448012_sl16gv', 'plain');
// 清理操作：tabs 为空，用已有 rootContent 重建定义页
{
  const purge = pool['k_1787237097249_1ld0tb'];
  if (!purge.card) purge.card = { nodeId: purge.id, title: purge.label, tabs: [], rootContent: '' };
  if (!purge.card.tabs.length) {
    purge.card.tabs.push({
      id: 'def', label: '定义',
      content: `**${purge.label}**\n${purge.card.rootContent || 'InnoDB 后台清理线程异步移除不再被任何 Read View 引用的旧版本记录与 undo log，回收空间。'}\n\n清理滞后于写入（以 history list 长度衡量）；长事务长期持有旧快照会拖慢清理，导致回滚段与表中死记录增长。`,
    });
    refreshRootContent(purge);
    console.log('rebuilt def tab: 清理操作 / Purge Operation');
  }
  purge.role = 'plain';
}
const ordered = pool['k_wiki_en_outline_of_databases_s4_b16'];
ordered.label = '有序共享锁 / ordered shared locks';
if (ordered.card) { ordered.card.title = ordered.label; }
patchTab('k_wiki_en_outline_of_databases_s4_b16', 'def',
  '**有序共享锁 / ordered shared locks**\n两阶段锁定（2PL）并发控制协议的一类变体：通过在冲突时调整锁的**阻塞语义**（如按顺序授予共享锁、改变读锁与写锁的等待关系）派生出不同的调度行为，在可串行化与并发度之间权衡。');
setRole('k_wiki_en_outline_of_databases_s4_b16', 'plain');
const ordEntry = byRef('k_wiki_en_outline_of_databases_s4_b16');
if (ordEntry) ordEntry.node.name = ordered.label;
const tpsType = pool['k_1784705818131_781hut'].card.tabs.find((t) => t.label === '交易处理类型');
if (tpsType && !(tpsType.content || '').trim()) {
  tpsType.content = '按响应方式分为**联机事务处理**（OLTP，即时响应用户请求）与**批处理事务**（成批延迟处理）两类。';
  refreshRootContent(pool['k_1784705818131_781hut']);
  console.log('filled empty tab: 交易处理类型');
}
for (const id of ['k_1784705186589_4l6rn5', 'k_1784729656805_igbg2h', 'k_1784731248425_non832', 'k_1784731654837_ur8uo6', 'k_1784733045365_qubtp0', 'k_1784705818131_781hut', 'k_1784456386575_b7hxoh', 'mysql:sql:tcl', 'k_1782928892375_1vgg04']) {
  if (!pool[id].role) setRole(id, 'plain');
}

// ---------- E. 事务理论整理 + 过时文案 ----------
attach('k_wiki_en_outline_of_databases_s20', detachByRef('k_dict_o5254svl'));
console.log('moved: 数据仓库 / data warehouse -> wiki 数据仓库节下（一、数据库系统）');
const isoEntry = byRef('demo_isolation');
if (!isoEntry) throw new Error('demo_isolation tree entry not found');
for (const id of ['k_dict_3dltrcza', 'k_dict_o0jw5g8p', 'k_dict_4zr5j9bz', 'k_dict_i1g9hhj8']) {
  attach('demo_isolation', detachByRef(id));
}
console.log('moved: 四个隔离级别词条 -> 隔离级别 demo_isolation 下');

// 全章清理「（数据库原理）」过时引用
let swept = 0;
const txRoot = findWithParent(tree, (n) => n.name === TX);
if (!txRoot) throw new Error('tx chapter not found');
(function sweep(n) {
  const p = pool[n.nodeRef];
  if (p && p.card && Array.isArray(p.card.tabs)) {
    let touched = false;
    for (const t of p.card.tabs) {
      if ((t.content || '').includes('概念节点（数据库原理）')) {
        t.content = t.content.split('概念节点（数据库原理）').join('概念节点');
        touched = true;
      }
    }
    if (touched) { refreshRootContent(p); swept++; }
  }
  for (const c of n.children || []) sweep(c);
})(txRoot.node);
console.log('stale 「（数据库原理）」 swept in', swept, 'cards');

// questions 相关节点改指向
for (const q of questions) {
  if (q.relatedNodeId === 'demo_shared_lock') q.relatedNodeId = 'k_dict_yvuxhe74';
  if (q.relatedNodeId === 'demo_exclusive_lock') q.relatedNodeId = 'mysql_glossary_exclusive_lock_ksqz5a';
}
console.log('questions.relatedNodeId redirected');

// ---------- write ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
atomicWrite('questions.json', questions);
console.log('fix-tx-system-ontology complete');
