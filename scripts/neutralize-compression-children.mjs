// scripts/neutralize-compression-children.mjs
// 彻底中立化：为 concept_compression 下 4 个有通用本体的子概念各建 concept_* 本体，
// 把对应 mysql_glossary_* 节点改成 instance-of 实例，本体下挂各自 MySQL 实例。
// KEY_BLOCK_SIZE 是 MySQL 专属变量，不建本体，保留为 MySQL 实例挂原理层。
import fs from 'node:fs';
const ROOT = process.cwd();
const F = {
  np: ROOT + '/data/node-pool.json',
  tree: ROOT + '/data/tree-data.json',
  edges: ROOT + '/data/knowledge-edges.json',
};
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeAtomic = (p, obj) => { const t = p + '.tmp'; fs.writeFileSync(t, JSON.stringify(obj, null, 2)); fs.renameSync(t, p); };

const np = read(F.np);
const tree = read(F.tree);
const edgesObj = read(F.edges);
const edges = Array.isArray(edgesObj) ? edgesObj : (edgesObj.edges || edgesObj);

// 4 本体定义（去掉 markdown 反引号，避免模板字符串冲突）
const ONTO = [
  {
    id: 'concept_sparse_file', label: '稀疏文件 / sparse file',
    treeName: '稀疏文件 / sparse file', treeId: 'tree_concept_sparse_file',
    tags: ['稀疏文件', '文件系统', '存储优化', '数据压缩'],
    def: [
      '**稀疏文件 / sparse file**',
      '',
      '文件系统中逻辑大小大于实际占用物理空间的一种文件：未写入的区段（"洞"/hole）不分配磁盘块，读取时返回零字节。支持动态预分配与空间回收，是透明压缩、快照、稀疏镜像等机制的空间回收基础。',
      '',
      '各主流文件系统（NTFS、ext4、XFS、ZFS、APFS）与虚拟磁盘格式（VMDK、QCOW2）均支持稀疏文件。',
      '',
      '本节点承载通用本体；各系统的具体实现在各自领域回指（如「MySQL 稀疏文件」实例节点）。',
    ].join('\n'),
    ex: [
      '**同构实例（稀疏文件）**：',
      '- **MySQL / InnoDB**：transparent page compression 依赖稀疏文件支持回收未用页块（见 §17.9.2）。',
      '- **文件系统**：NTFS 稀疏文件、ext4 fallocate、XFS fallocate、ZFS sparse volume。',
      '- **虚拟化**：VMDK thin provisioning、QCOW2 稀疏镜像。',
      '- **备份**：rsync --sparse、dd 稀疏处理。',
    ].join('\n'),
  },
  {
    id: 'concept_hole_punching', label: '打孔 / hole punching',
    treeName: '打孔 / hole punching', treeId: 'tree_concept_hole_punching',
    tags: ['打孔', '文件系统', '存储优化', '数据压缩'],
    def: [
      '**打孔 / hole punching**',
      '',
      '文件系统级操作：在文件中间释放已分配的磁盘块使其变为"洞"（hole），物理空间被回收但文件逻辑大小不变。常通过 fallocate(FALLOC_FL_PUNCH_HOLE | FALLOC_FL_KEEP_SIZE) 实现，是稀疏文件与透明压缩回收未用空间的标准手段。',
      '',
      '本节点承载通用本体；各系统的具体实现在各自领域回指。',
    ].join('\n'),
    ex: [
      '**同构实例（打孔）**：',
      '- **MySQL / InnoDB**：transparent page compression 从页释放空块依赖打孔支持。',
      '- **Linux**：fallocate -p、fallocate(2) 的 FALLOC_FL_PUNCH_HOLE。',
      '- **文件系统**：ext4/XFS/btrfs/NTFS 均支持打孔；ZFS 通过 COW 实现等价空间回收。',
      '- **数据库**：PostgreSQL、Oracle 表压缩亦有类似页释放机制。',
    ].join('\n'),
  },
  {
    id: 'concept_transparent_compression', label: '透明压缩 / transparent compression',
    treeName: '透明压缩 / transparent compression', treeId: 'tree_concept_transparent_compression',
    tags: ['透明压缩', '数据压缩', '存储优化'],
    def: [
      '**透明压缩 / transparent compression**',
      '',
      '存储/文件系统/数据库引擎在读写数据时自动压缩与解压、对上层应用透明的压缩形态：已压缩数据持久化存储，读取时自动解压；与显式压缩（用户手动 gzip）相对。',
      '',
      '代表实现：ZFS / btrfs / NTFS 的文件系统级透明压缩，以及数据库引擎的页级透明压缩（如 InnoDB transparent page compression）。',
      '',
      '本节点承载通用本体；各系统的具体实现在各自领域回指。',
    ].join('\n'),
    ex: [
      '**同构实例（透明压缩）**：',
      '- **MySQL / InnoDB**：transparent page compression，file-per-table 表空间页级压缩（5.7.8 引入，COMPRESSION 属性启用）。',
      '- **文件系统**：ZFS compression=on、btrfs compress、NTFS 压缩、APFS。',
      '- **块设备**：dm-compress、压缩 NVMe（NVMe TP 4017）。',
      '- **其他数据库**：Oracle HCC、SQL Server page compression。',
    ].join('\n'),
  },
  {
    id: 'concept_compression_failure', label: '压缩失败 / compression failure',
    treeName: '压缩失败 / compression failure', treeId: 'tree_concept_compression_failure',
    tags: ['压缩失败', '数据压缩', '存储优化'],
    def: [
      '**压缩失败 / compression failure**',
      '',
      '压缩操作未能有效完成、或压缩后数据无法放回原空间的情形。常见于增量更新场景：被压缩的页/块因修改而溢出预留区，重压缩后体积增大无法装回原块，需分裂或退化为未压缩存储。',
      '',
      '是衡量压缩效果与调参（压缩级别、失败阈值、预留填充率）的重要指标，跨数据库与文件系统均适用。',
      '',
      '本节点承载通用本体；各系统的具体实现在各自领域回指。',
    ].join('\n'),
    ex: [
      '**同构实例（压缩失败）**：',
      '- **MySQL / InnoDB**：被压缩页的更新溢出预留修改区，重压缩后数据不再适合原页，需分裂为两页分别压缩；通过 INFORMATION_SCHEMA.INNODB_CMP 的 COMPRESS_OPS vs COMPRESS_OPS_OK 监控；调 innodb_compression_level / innodb_compression_failure_threshold_pct / innodb_compression_pad_pct_max。',
      '- **文件系统**：透明压缩写放大导致的重压缩开销（Btrfs/ZFS）。',
      '- **通用数据库**：压缩页/块更新溢出的同类现象。',
    ].join('\n'),
  },
];

// 4 MySQL 实例节点改写
const INST = {
  mysql_glossary_sparse_file_1cutkz: {
    label: 'MySQL 稀疏文件 / MySQL sparse file',
    content: [
      '**MySQL 稀疏文件 / MySQL sparse file**',
      '',
      '在 MySQL（InnoDB）语境下，稀疏文件是 transparent page compression 回收未用页块的依赖：文件系统将空块以元数据表示而非实际占满磁盘空间。InnoDB 透明页压缩功能依赖稀疏文件支持。详见 第 17.9.2 节，InnoDB 页面压缩（https://dev.mysql.com/doc/refman/8.4/en/innodb-page-compression.html ）。',
      '',
      '另见 打孔（https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_hole_punching ）、透明页压缩（https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_transparent_page_compression ）。',
      '',
      '本节点是「稀疏文件」通用概念在 MySQL 中的实例；其本体见「稀疏文件 / sparse file」概念节点。',
      '',
      '来源：MySQL Glossary（sparse file）。',
    ].join('\n'),
  },
  mysql_glossary_hole_punching_r6u429: {
    label: 'MySQL 打孔 / MySQL hole punching',
    content: [
      '**MySQL 打孔 / MySQL hole punching**',
      '',
      '在 MySQL（InnoDB）语境下，打孔指从页面释放空块。InnoDB transparent page compression 功能依赖打孔支持（由文件系统 fallocate(FALLOC_FL_PUNCH_HOLE) 提供）。',
      '',
      '本节点是「打孔」通用概念在 MySQL 中的实例；其本体见「打孔 / hole punching」概念节点。',
      '',
      '来源：MySQL Glossary（hole punching）。',
    ].join('\n'),
  },
  mysql_glossary_transparent_page_compression_j4ufzm: {
    label: 'MySQL 透明页压缩 / MySQL transparent page compression',
    content: [
      '**MySQL 透明页压缩 / MySQL transparent page compression**',
      '',
      'MySQL 5.7.8 引入的功能，对位于 file-per-table 表空间中的 InnoDB 表进行页面级压缩；通过 CREATE TABLE（https://dev.mysql.com/doc/refman/8.4/en/create-table.html ）或 ALTER TABLE（https://dev.mysql.com/doc/refman/8.4/en/alter-table.html ）指定 COMPRESSION 属性启用。详见 第 17.9.2 节，InnoDB 页面压缩（https://dev.mysql.com/doc/refman/8.4/en/innodb-page-compression.html ）。',
      '',
      '另见 每个表的文件（https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_file_per_table ）、打孔（https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_hole_punching ）、稀疏文件（https://dev.mysql.com/doc/refman/8.4/en/glossary.html#glos_sparse_file ）。',
      '',
      '本节点是「透明压缩」通用概念在 MySQL 中的实例；其本体见「透明压缩 / transparent compression」概念节点。',
      '',
      '来源：MySQL Glossary（transparent page compression）。',
    ].join('\n'),
  },
  mysql_glossary_compression_failure_8kmcfr: {
    label: 'MySQL 压缩失败 / MySQL compression failure',
    content: [
      '**MySQL 压缩失败 / MySQL compression failure**',
      '',
      '在 MySQL（InnoDB）中，这不是错误，而是压缩与 DML 结合时可能发生的高成本操作：对被压缩页的更新溢出预留用于记录修改的区域；页面再次压缩、所有更改应用于表数据；重压缩数据不再适合原页，MySQL 需将数据拆分为两个新页并分别压缩。通过 INFORMATION_SCHEMA.INNODB_CMP 查询 COMPRESS_OPS 超过 COMPRESS_OPS_OK 的次数监控；理想情况下不应频繁发生，可调 innodb_compression_level / innodb_compression_failure_threshold_pct / innodb_compression_pad_pct_max。',
      '',
      '本节点是「压缩失败」通用概念在 MySQL 中的实例；其本体见「压缩失败 / compression failure」概念节点。',
      '',
      '来源：MySQL Glossary（compression failure）。',
    ].join('\n'),
  },
};

// 1. node-pool: 新增 4 本体
for (const o of ONTO) {
  np[o.id] = {
    id: o.id, label: o.label, projection: false, tags: o.tags,
    card: {
      nodeId: o.id, title: o.label,
      rootContent: o.def.split('\n\n').slice(0, 2).join('\n\n'),
      tabs: [
        { id: 'def', label: '定义（本体）', content: o.def },
        { id: 'example', label: '示例（跨域实例）', content: o.ex },
      ],
    },
  };
}

// 2. node-pool: 改 4 MySQL 节点为实例
for (const [id, v] of Object.entries(INST)) {
  const n = np[id];
  if (!n) { console.error('缺失节点', id); process.exit(1); }
  n.label = v.label;
  n.card.tabs = [{ id: 'def', label: '定义（MySQL 实例）', content: v.content }];
  n.card.title = v.label;
  n.card.rootContent = v.content.split('\n\n')[0];
  if (!n.tags) n.tags = [];
  if (!n.tags.includes('数据压缩')) n.tags.push('数据压缩');
}

// 3. tree: 重组 tree_concept_compression children
function findNode(n, id) { if (n.id === id) return n; for (const c of (n.children || [])) { const r = findNode(c, id); if (r) return r; } return null; }
const cc = findNode(tree, 'tree_concept_compression');
if (!cc) throw new Error('tree_concept_compression not found');
const byRef = {};
for (const c of (cc.children || [])) { if (c.nodeRef) byRef[c.nodeRef] = c; }
const MAP = [
  { onto: 'concept_sparse_file', mysql: 'mysql_glossary_sparse_file_1cutkz' },
  { onto: 'concept_hole_punching', mysql: 'mysql_glossary_hole_punching_r6u429' },
  { onto: 'concept_transparent_compression', mysql: 'mysql_glossary_transparent_page_compression_j4ufzm' },
  { onto: 'concept_compression_failure', mysql: 'mysql_glossary_compression_failure_8kmcfr' },
];
const KEY_BLOCK = 'mysql_glossary_key_block_size_u1i5bm';
const newChildren = [];
for (const m of MAP) {
  const o = ONTO.find(x => x.id === m.onto);
  const mysqlProj = byRef[m.mysql];
  if (!mysqlProj) { console.error('缺投影', m.mysql); process.exit(1); }
  newChildren.push({ id: o.treeId, name: o.treeName, nodeRef: o.id, children: [mysqlProj] });
}
const kbs = byRef[KEY_BLOCK];
if (kbs) newChildren.push(kbs);
cc.children = newChildren;

// 4. edges: 加 4 instance-of 边
const edgeAdd = [
  { source: 'mysql_glossary_sparse_file_1cutkz', target: 'concept_sparse_file', id: 'rel:mysql_sparse_file:instance-of:concept_sparse_file' },
  { source: 'mysql_glossary_hole_punching_r6u429', target: 'concept_hole_punching', id: 'rel:mysql_hole_punching:instance-of:concept_hole_punching' },
  { source: 'mysql_glossary_transparent_page_compression_j4ufzm', target: 'concept_transparent_compression', id: 'rel:mysql_tpc:instance-of:concept_transparent_compression' },
  { source: 'mysql_glossary_compression_failure_8kmcfr', target: 'concept_compression_failure', id: 'rel:mysql_cf:instance-of:concept_compression_failure' },
];
const existIds = new Set(edges.map(e => e.id));
for (const e of edgeAdd) {
  if (!existIds.has(e.id)) edges.push({ id: e.id, source: e.source, target: e.target, type: 'instance-of', label: 'MySQL 实例' });
}

// 5. concept_compression card: 更新 example 说明
const ccNode = np['concept_compression'];
const ex = ccNode.card.tabs.find(t => t.id === 'example');
if (ex && /已归并/.test(ex.content)) {
  ex.content = ex.content.replace(/\n\n> \*\*子文件归并\*\*[\s\S]*$/, '\n\n> **子文件中立化**：本节点下的稀疏文件、打孔、透明压缩、压缩失败四个子概念均已拆出各自 concept_* 本体（挂在本节点下），对应 MySQL 实例通过 instance-of 边回指本体；KEY_BLOCK_SIZE 为 MySQL InnoDB 专属变量，无通用本体，保留为 MySQL 实例直接挂本节点下。');
}

// 6. 原子写回
writeAtomic(F.np, np);
writeAtomic(F.tree, tree);
const edgesOut = Array.isArray(edgesObj) ? edges : (edgesObj.edges ? { ...edgesObj, edges } : { edges });
writeAtomic(F.edges, edgesOut);

console.log('=== 中立化完成 ===');
console.log('新增本体:', ONTO.map(o => o.id).join(', '));
console.log('改写实例:', Object.keys(INST).join(', '));
console.log('concept_compression children:', cc.children.length);
for (const c of cc.children) console.log('  -', c.name, '| nodeRef:', c.nodeRef, '| children:', (c.children || []).length);
console.log('instance-of 边新增:', edgeAdd.length, '| 总边数:', edges.length);
