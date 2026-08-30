import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `split-compression-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

// ---------- node-pool: 中立本体 concept_compression（数据压缩 / data compression） ----------
pool['concept_compression'] = {
  id: 'concept_compression',
  label: '数据压缩 / data compression',
  kind: 'Concept',
  role: 'plain',
  dimensions: ['压缩', '存储优化', 'I/O优化'],
  tags: ['数据压缩', '压缩', '存储优化'],
  card: {
    nodeId: 'concept_compression',
    title: '数据压缩 / data compression',
    tabs: [
      {
        id: 'def',
        label: '定义（本体）',
        content:
          '**数据压缩 / data compression**\n一种具有广泛好处的技术：可以减少磁盘空间的使用、减少 I/O 操作、并减少缓存所需的内存。\n\n它解决的是「在受限的存储/带宽/内存资源下，用更少的比特表示相同信息」这一通用问题，与具体厂商无关。压缩通常分为：\n- **无损压缩（lossless）**：解压后可完全复原原始数据（如 InnoDB 页压缩、ZFS、gzip、PNG）；\n- **有损压缩（lossy）**：以可接受的精度损失换取更高的压缩率（如 JPEG、MP3）。\n\n本节点只承载模型本体；各系统的具体实现在各自领域回指（如「MySQL 压缩」实例节点）。',
      },
      {
        id: 'example',
        label: '示例（跨域实例）',
        content:
          '**同构实例（数据压缩）**：\n- **MySQL / InnoDB**：表级与页面级压缩；透明页压缩（transparent page compression），配合打孔（hole punching）与稀疏文件（sparse file）；另见 §17.9「InnoDB 表和页面压缩」。\n- **文件系统**：ZFS / NTFS / btrfs 的透明压缩。\n- **其他数据库**：PostgreSQL（TOAST）、Oracle 表压缩。\n- **媒体**：图像压缩（系统已有「图像压缩」概念）、音视频编解码。\n- **JVM**：压缩 oops（compressed oops），用 32 位引用寻址 64 位堆。\n- **网络**：HTTP `gzip` / `brotli` 传输压缩。\n\n这些都属于「数据压缩」这一通用概念在不同系统中的实现。',
      },
    ],
    rootContent:
      '**数据压缩 / data compression**\n一种减少磁盘空间、I/O 与内存占用的通用技术，与具体厂商无关；分无损/有损两类，在文件系统、数据库、媒体、网络、JVM 中同构存在。',
  },
};

// 把既有 mysql_glossary_compression 重构为「MySQL 实例类型」（保留 id 不断链）
const comp = pool['mysql_glossary_compression_gbxfjp'];
comp.label = 'MySQL 压缩 / MySQL compression';
comp.dimensions = ['压缩', '存储引擎', 'InnoDB', 'mysql'];
comp.tags = ['MySQL 压缩', 'mysql', 'glossary', '压缩'];
comp.card.title = 'MySQL 压缩 / MySQL compression';
comp.card.tabs = [
  {
    id: 'def',
    label: '定义（MySQL 实例）',
    content:
      '**MySQL 压缩 / MySQL compression**\n在 MySQL（InnoDB）中，压缩用于减少表数据与索引占用的磁盘空间、I/O 与缓冲内存。\n\nInnoDB 支持的压缩形态：\n- **表级与页面级压缩**：通过 `ROW_FORMAT=COMPRESSED` 与 `KEY_BLOCK_SIZE` 控制页内压缩；\n- **透明页压缩（transparent page compression）**：InnoDB 页压缩的别称，借助文件系统打孔（hole punching）与稀疏文件（sparse file）回收未使用的页块；详见 §17.9「InnoDB 表和页面压缩」。\n\n另一种压缩类型是 **compressed backup（压缩备份）**，属于 MySQL Enterprise Backup 产品，与 InnoDB 表/页压缩分属不同特性。\n\n这是「数据压缩」通用概念在 MySQL 中的实例；其本体见「数据压缩 / data compression」概念节点。\n\n来源：MySQL Glossary（compression）。',
  },
];
comp.card.rootContent =
  '**MySQL 压缩 / MySQL compression**\nInnoDB 的表级/页面级压缩与透明页压缩（配合打孔、稀疏文件，见 §17.9）；compressed backup 属 MySQL Enterprise Backup，为独立特性。本节点是「数据压缩」概念在 MySQL 中的实例。';

// ---------- tree-data: 在「数据库原理」下挂概念本体；MySQL 实例原地保留（富容器），并加一个指针子投影 ----------
function findNode(n, id) {
  if (n.id === id) return n;
  for (const c of (n.children || [])) {
    const r = findNode(c, id);
    if (r) return r;
  }
  return null;
}

const dbPrinciples = findNode(tree, 'database_principles');
if (!dbPrinciples) throw new Error('未找到 数据库原理 tree 节点 (database_principles)');

// 概念本体条目（规范、非投影）
const compEntry = {
  id: 'tree_concept_compression',
  name: pool['concept_compression'].label,
  count: 0,
  nodeRef: 'concept_compression',
  children: [
    // 指针子投影：声明「MySQL 压缩 是一种类型」。使用与 MySQL 文件夹不同的 id 避免撞名。
    {
      id: 'projection:concept-child:mysql_glossary_compression_gbxfjp',
      name: 'MySQL 压缩 / MySQL compression',
      count: 0,
      nodeRef: 'mysql_glossary_compression_gbxfjp',
      projection: true,
      view: 'mysql-architecture',
      projectionKind: 'canonical-topic',
      sourceNodeId: 'mysql_glossary_compression_gbxfjp',
      children: [],
    },
  ],
};
dbPrinciples.children = dbPrinciples.children || [];
dbPrinciples.children.push(compEntry);
// 注意：MySQL 域下既有的 `projection:mysql-term:mysql_glossary_compression_gbxfjp` 文件夹（含 5 个 MySQL 子概念）保持不动，
// 作为「MySQL 实例」的富容器；与上面指针共同构成「概念 + MySQL 实例（一种类型）+ MySQL 域投影」的已接受模型。

// ---------- knowledge-edges: 实例边 ----------
function addEdge(id, source, target, type, label) {
  if (!edges.find((e) => e.id === id)) edges.push({ id, source, target, type, label: label || '' });
}
addEdge(
  'rel:mysql_compression:instance-of:concept_compression',
  'mysql_glossary_compression_gbxfjp',
  'concept_compression',
  'instance-of',
  'MySQL 实例'
);

// ---------- governance: 补 placement ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p;
  else placements.push(p);
}
upsertPlacement({
  id: 'placement:concept:concept_compression',
  nodeId: 'concept_compression',
  status: 'accepted',
  contentStatus: 'canonical',
  canonicalParentNodeId: 'database_principles',
  canonicalTreeEntryId: 'tree_concept_compression',
  pathHint: ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理', '数据压缩 / data compression'],
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
console.log('split-compression complete');
