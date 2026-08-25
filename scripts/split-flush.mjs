import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `split-flush-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

// ---------- node-pool: 中立本体 concept_flush ----------
pool['concept_flush'] = {
  id: 'concept_flush',
  label: '刷新 / flush',
  kind: 'Concept',
  role: 'plain',
  dimensions: ['缓冲', '持久化', '存储'],
  tags: ['刷新 / flush', '缓存写回', '持久化'],
  card: {
    nodeId: 'concept_flush',
    title: '刷新 / flush',
    tabs: [
      {
        id: 'def',
        label: '定义（本体）',
        content:
          '**刷新 / flush**\n将曾经缓存在内存区域或临时磁盘存储区域中的更改，写入持久化存储（数据库文件、磁盘、文件系统）的过程。\n\n它解决的是「内存中的修改」与「持久化存储」之间的同步问题。刷新可能在以下情况发生：\n- 内存区域已满、系统需要释放空间；\n- 提交（commit）操作要求事务更改最终落盘；\n- 慢速关闭（slow shutdown）要求完成所有待处理工作。\n\n为避免一次性刷新全部缓冲数据带来的 I/O 尖峰，系统常采用**模糊检查点（fuzzy checkpointing）**等技术，以小批量页面分散开销。\n\n本节点只承载模型本体；厂商实例在各自领域回指（如「MySQL 刷新」实例节点）。',
      },
      {
        id: 'example',
        label: '示例（跨域实例）',
        content:
          '**同构实例（缓存写回持久化）**：\n- **MySQL / InnoDB**：周期性刷新 redo log、undo log、buffer pool（脏页）；由 page cleaner 线程执行，触发条件含内存压力、事务提交、慢速关闭。\n- **操作系统**：页缓存（page cache）经 `fsync` / `sync` 刷入块设备。\n- **Redis**：AOF 以 `appendfsync` 策略刷盘，RDB 快照持久化。\n- **文件系统**：`write()` 写入页缓存后由后台回写线程刷盘。\n\n这些都属于「缓存写回 / 持久化」这一通用概念的不同实现。',
      },
    ],
    rootContent:
      '**刷新 / flush**\n将缓存在内存或临时存储中的更改写入持久化存储的过程，解决内存修改与持久化存储的同步问题；常以小批量（如 fuzzy checkpointing）分散 I/O。',
  },
};

// 把既有 mysql_glossary_flush 重构为「MySQL 实例类型」（保留 id 不断链）
const flush = pool['mysql_glossary_flush_1dnigf'];
flush.label = 'MySQL 刷新 / MySQL flush';
flush.dimensions = ['缓冲', '持久化', '存储', 'mysql'];
flush.tags = ['MySQL 刷新', 'mysql', 'glossary', '刷新', '持久化'];
flush.card.title = 'MySQL 刷新 / MySQL flush';
flush.card.tabs = [
  {
    id: 'def',
    label: '定义（MySQL 实例）',
    content:
      '**MySQL 刷新 / MySQL flush**\n在 MySQL（InnoDB）中，刷新是把缓存在内存区域（buffer pool）或临时结构中的更改写入数据库文件的过程。\n\nInnoDB 会周期性刷新的存储结构包括 **redo log**、**undo log** 和 **buffer pool（脏页）**。\n\n刷新触发条件：\n- 内存区域已满、系统需要释放空间；\n- 提交（commit）操作使事务更改最终落盘；\n- 慢速关闭（slow shutdown，`innodb_fast_shutdown=0`）要求完成所有待处理工作。\n\n当不必一次性刷新所有缓冲数据时，InnoDB 使用 **fuzzy checkpointing** 技术，以小批量页面分散 I/O 开销。\n\n这是「刷新 / 缓存写回」通用概念在 MySQL 中的实例；其本体见「刷新 / flush」概念节点。\n\n来源：MySQL Glossary（flush，原始行 1032）。',
  },
];
flush.card.rootContent =
  '**MySQL 刷新 / MySQL flush**\nInnoDB 把 buffer pool / redo log / undo log 的更改刷入数据库文件的过程，触发于内存压力、commit、慢速关闭；采用 fuzzy checkpointing 分散 I/O。本节点是「刷新」概念在 MySQL 中的实例。';

// ---------- tree-data: 在「数据库原理」下挂概念本体，MySQL 实例作为「一种类型」子投影 ----------
function findNode(n, id) {
  if (n.id === id) return n;
  for (const c of (n.children || [])) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
}
function mysqlInstanceChild(nodeRef) {
  return {
    id: `projection:mysql-term:${nodeRef}`,
    name: pool[nodeRef].label,
    count: 0,
    nodeRef,
    projection: true,
    view: 'mysql-architecture',
    projectionKind: 'canonical-topic',
    sourceNodeId: nodeRef,
    children: [],
  };
}

const dbPrinciples = findNode(tree, 'database_principles');
if (!dbPrinciples) throw new Error('未找到 数据库原理 tree 节点 (database_principles)');
const flushEntry = {
  id: 'tree_concept_flush',
  name: pool['concept_flush'].label,
  count: 0,
  nodeRef: 'concept_flush',
  children: [mysqlInstanceChild('mysql_glossary_flush_1dnigf')],
};
dbPrinciples.children = dbPrinciples.children || [];
dbPrinciples.children.push(flushEntry);

// ---------- knowledge-edges: 实例边 ----------
function addEdge(id, source, target, type, label) {
  if (!edges.find((e) => e.id === id)) edges.push({ id, source, target, type, label: label || '' });
}
addEdge('rel:mysql_flush:instance-of:concept_flush', 'mysql_glossary_flush_1dnigf', 'concept_flush', 'instance-of', 'MySQL 实例');

// ---------- governance: 补 placement ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p;
  else placements.push(p);
}
upsertPlacement({
  id: 'placement:concept:concept_flush',
  nodeId: 'concept_flush',
  status: 'accepted',
  contentStatus: 'canonical',
  canonicalParentNodeId: 'database_principles',
  canonicalTreeEntryId: 'tree_concept_flush',
  pathHint: ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理', '刷新 / flush'],
});

// ---------- 原子写入 ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
console.log('split-flush complete');
