// B+树底层结构节点化（2026-08-31）
// 用户要求：把索引的「底层结构」用方框+连线在索引视图中表达（B+树 + 相关构成）。
// 结构树挂在 demo_btree（MySQL B+树索引）之下：
//   B+树底层结构
//   ├── 根节点 / root page
//   ├── 内部节点（非叶子页）
//   │     ├── 槽 / page directory slots
//   │     └── 键 + 子页指针
//   ├── 叶子节点（叶子页）
//   │     ├── 索引条目（键+行指针/主键）
//   │     └── 双向链表（范围扫描）
//   ├── 层间连线
//   │     ├── 父→子指针：一次定位
//   │     └── 叶间链表指针：范围扫描
//   └── 高度与 IO：树高 3~4 ≈ 查询 IO 次数
// demo_btree 薄卡同时补一段结构说明（指向子树）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `btree-structure-nodes-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

function findWithParent(node, pred, parent = null) {
  if (pred(node)) return { node, parent };
  for (const c of node.children || []) {
    const hit = findWithParent(c, pred, node);
    if (hit) return hit;
  }
  return null;
}
const btreeEntry = findWithParent(tree, (n) => n.nodeRef === 'demo_btree');
if (!btreeEntry) throw new Error('demo_btree tree entry missing');

function makeNode(id, label, defContent) {
  pool[id] = {
    id, label, role: 'plain',
    dimensions: ['存储', '性能'],
    tags: [label],
    card: { nodeId: id, title: label, tabs: [{ id: 'def', label: '定义', content: defContent }], rootContent: '' },
  };
  pool[id].card.rootContent = [label, defContent].join(' ').replace(/\s+/g, ' ').trim();
  console.log('node:', id, '|', label);
}

// ---------- 结构节点 ----------
makeNode('btree_structure', 'B+树底层结构',
  'MySQL/InnoDB B+树索引的物理构成：一棵**多路平衡搜索树**，全部落在 16KB 的**页**上。自上而下分为**根节点 → 内部节点 → 叶子节点**三种角色，页内用**槽（page directory）**做二分定位，页间用**指针**连接。树高即查询的 IO 次数——这是 B+树索引「快」的结构根源。\n\n（本节点与其子节点用方框+连线表达结构：索引视图的嵌套框即树的包含关系。）');
makeNode('bts_root_page', '根节点 / root page',
  'B+树顶端的唯一入口页：每次索引查找都从根开始。根页常驻缓冲池，持有指向下层节点的指针集合。');
makeNode('bts_internal', '内部节点 / internal page',
  '**只存键和子页指针、不存行数据**的路由页：键把取值空间切成有序区间，查找时按「键 ≤ 目标值 < 下一键」选中一个子页下行。键多、扇出大（成百上千），因此树很矮。');
makeNode('bts_slot', '页内槽 / page directory',
  '每个页尾的**页目录**：把页内记录分组，槽中存放各组的最大记录偏移。页内查找先在槽上**二分**，再在组内顺序扫描——这是单个 16KB 页内的定位方式。');
makeNode('bts_key_ptr', '键 + 子页指针',
  '内部节点的基本单元：一个**分隔键**配一个**子页指针**。分隔键是其右子树中的最小键，保证左子树 < 键 ≤ 右子树。');
makeNode('bts_leaf', '叶子节点 / leaf page',
  '存放实际**索引条目**的底层页：聚簇索引的叶子存**整行数据**，二级索引的叶子存**主键值**（需回表）。同层叶子横向串成双向链表。');
makeNode('bts_entry', '索引条目（键 + 行定位）',
  '叶子页内的一条记录：**索引键** + 行定位信息。二级索引条目 = 索引列值 + 主键值；通过主键回到聚簇索引取整行即「回表」。');
makeNode('bts_double_linked', '叶子双向链表',
  '所有叶子页按键序用**前后指针**串成双向链表：等值查询到某页即止，**范围/排序查询沿链表横向扫描**即可，无需回到上层——这是 B+树优于 B 树的关键设计。');
makeNode('bts_pointers', '层间指针（连线语义）',
  '结构中的两类连线：**父→子指针**（自上而下的定位路径，把一次等值查询压缩为「树高次」IO）与**叶间链表指针**（横向的范围扫描路径）。方框图中竖向连线索引查找、横向连线范围扫描。');
makeNode('bts_height_io', '树高与 IO 次数',
  '千万行数据、扇出上千时树高仅 **3~4 层**：根/内部层通常常驻内存，实际磁盘 IO 往往只有 1~2 次。树高 = 定位路径长度 = 等值查询的最大 IO 次数。');

// ---------- 挂树 ----------
const mk = (id) => ({ id: `tree_${id}`, name: pool[id].label, count: 0, nodeRef: id });
const structureEntry = mk('btree_structure');
structureEntry.children = [
  mk('bts_root_page'),
  { ...mk('bts_internal'), children: [mk('bts_slot'), mk('bts_key_ptr')] },
  { ...mk('bts_leaf'), children: [mk('bts_entry'), mk('bts_double_linked')] },
  mk('bts_pointers'),
  mk('bts_height_io'),
];
btreeEntry.node.children = btreeEntry.node.children || [];
btreeEntry.node.children.push(structureEntry);
console.log('structure tree mounted under MySQL B+树索引');

// ---------- demo_btree 卡片补结构说明（薄卡 34 字 → 实卡） ----------
{
  const inst = pool['demo_btree'];
  const def = inst.card.tabs.find(t => t.id === 'def') || inst.card.tabs[0];
  if ((def.content || '').length < 120) {
    def.content = [
      '**MySQL B+树索引**',
      '以 **B+树**为底层结构的索引：所有数据存于叶子节点、叶子层横向有序，内部节点只做路由。每次等值查找沿「根 → 内部 → 叶子」下行，树高即 IO 次数；范围/排序查询利用叶子双向链表横向扫描。',
      '底层页结构（根/内部/叶子、页内槽、条目与指针、树高与 IO）见子节点「B+树底层结构」。',
    ].join('\n\n');
    refreshCard(inst);
  }
}
function refreshCard(node) {
  node.card.rootContent = [node.card.title || node.label, ...node.card.tabs.map(t => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}
console.log('demo_btree card enriched');

// ---------- treebind ----------
const binds = [];
const walkBind = (entry, parentNodeRef) => {
  binds.push({ id: `treebind:tree_${parentNodeRef}:${entry.id}`, source: parentNodeRef, target: entry.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [] });
  for (const c of entry.children || []) walkBind(c, entry.nodeRef);
};
walkBind(structureEntry, 'demo_btree');
let out = edges.filter(e => !binds.some(nb => nb.id === e.id));
out.push(...binds);
console.log('treebind added:', binds.length, '| edges ->', out.length);

// ---------- placement ----------
const placements = [
  ['btree_structure', 'demo_btree'],
  ['bts_root_page', 'btree_structure'],
  ['bts_internal', 'btree_structure'],
  ['bts_slot', 'bts_internal'],
  ['bts_key_ptr', 'bts_internal'],
  ['bts_leaf', 'btree_structure'],
  ['bts_entry', 'bts_leaf'],
  ['bts_double_linked', 'bts_leaf'],
  ['bts_pointers', 'btree_structure'],
  ['bts_height_io', 'btree_structure'],
];
for (const [id, parent] of placements) {
  gov.placements.push({
    id: `placement:${id}`, nodeId: id,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: parent,
    canonicalTreeEntryId: `tree_${id}`,
    pathHint: ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '十一、索引', 'B+树索引 / B-tree index', 'MySQL B+树索引', pool[id].label],
    confidence: 'high',
    rationale: '索引底层结构节点化：结构描述独立成节点，构成要素用子节点表达，索引视图以方框+连线呈现。',
  });
}
console.log('placements created:', placements.length);

// ---------- 校验 ----------
for (const b of binds) {
  if (!pool[b.source] || !pool[b.target]) throw new Error('bad bind: ' + b.id);
}

function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try { renameSync(tmp, join(DATA, file)); ok = true; }
    catch (err) {
      if (i === 7) throw err;
      console.log('rename busy, retry...');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('btree-structure-nodes complete');
