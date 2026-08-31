// 结构描述节点化（2026-08-31）
// 把「MySQL 组合索引」卡里的大段文本块（最佳左前缀法则 + 场景 + 排序结构）
// 转化为节点树：结构描述独立成节点，结构要素用子节点表达。
// 卡片瘦身为定义 + 一句法则；全部内容保留在新节点中（不删除）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `structurize-lpf-${ts}`);
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
const parentEntry = findWithParent(tree, (n) => n.nodeRef === 'demo_composite_index');
if (!parentEntry) throw new Error('demo_composite_index tree entry missing');

// ---------- 新节点定义 ----------
function makeNode(id, label, defContent, extraTabs = []) {
  pool[id] = {
    id, label, role: 'plain',
    dimensions: ['存储', '性能'],
    tags: [label],
    card: {
      nodeId: id, title: label,
      tabs: [{ id: 'def', label: '定义', content: defContent }, ...extraTabs],
      rootContent: '',
    },
  };
  pool[id].card.rootContent = [label, defContent, ...extraTabs.map(t => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}
const IMG = '/notes/mysql-index/leftmost-prefix-btree.png';

makeNode('leftmost_prefix_rule', '最佳左前缀法则 / leftmost prefix rule',
  '使用联合索引时，where 条件需**从最左列开始、连续匹配、不跳列**。');
makeNode('lpf_case_in_order', '场景一：按索引列顺序使用（全命中）',
  "`EXPLAIN SELECT * FROM users WHERE user_name='tom' AND user_age=17 AND user_level='A';`\n\n按创建顺序 (user_name, user_age, user_level) 使用索引，三个字段全部命中。");
makeNode('lpf_case_skip_left', '场景二：跳过最左列（索引失效）',
  "`EXPLAIN SELECT * FROM users WHERE user_age=17 AND user_level='A';`\n\n跳过 user_name 直接使用后续字段，索引无效，未使用到索引。");
makeNode('lpf_case_reordered', '场景三：条件乱序（优化器重排，仍命中）',
  "`EXPLAIN SELECT * FROM users WHERE user_age=17 AND user_name='tom' AND user_level='A';`\n\nwhere 条件顺序与索引顺序 (user_name, user_age, user_level) 不一致仍全列命中——MySQL 底层优化器会自动调整条件顺序。");
makeNode('joint_index_sort_structure', '联合索引排序结构（底层原理）',
  `MySQL 构建联合索引的规则：先对最左字段排序，在第一个字段相等的基础上再对第二个字段排序，依此类推。\n\n![联合索引排序结构：先按 user_name 排序，user_name 相等的行内再按 user_age 排序](${IMG})`);
makeNode('jis_first_column_global', '第一列：全局有序',
  '联合索引的第一列在整个索引树上**全局有序**，因此任何查询只要带上最左列的等值/范围条件，都能在 B+ 树上直接定位。');
makeNode('jis_second_column_local', '第二列及以后：仅局部有序',
  '第二列只在**第一列相等的范围内**有序：全局看是无序的，局部（前列同值的分组内）有序。');
makeNode('jis_skip_leftmost_corollary', '推论：跳过最左列无法定位',
  '由前两条直接推出：跳过最左列、只用第二列查询时，B+ 树上没有可用的全局有序入口，索引失效。这正是最佳左前缀法则的结构根源。');

// ---------- 挂树 ----------
const mk = (id, parentId) => ({ id: `tree_${id}`, name: pool[id].label, count: 0, nodeRef: id });
const ruleEntry = mk('leftmost_prefix_rule');
ruleEntry.children = [
  mk('lpf_case_in_order'), mk('lpf_case_skip_left'), mk('lpf_case_reordered'),
  { ...mk('joint_index_sort_structure'), children: [mk('jis_first_column_global'), mk('jis_second_column_local'), mk('jis_skip_leftmost_corollary')] },
];
parentEntry.node.children = parentEntry.node.children || [];
parentEntry.node.children.push(ruleEntry);
console.log('node tree built under MySQL 组合索引');

// ---------- 卡片瘦身（内容已迁入节点，不丢失） ----------
const inst = pool['demo_composite_index'];
const def = inst.card.tabs.find(t => t.id === 'def') || inst.card.tabs[0];
def.content = [
  '**MySQL 组合索引**',
  '包含多个列的索引，按列顺序构建搜索树。别名：**复合索引**（composite index）、**连接索引**（concatenated index）——MySQL 官方术语为 composite index，三者同义。',
  '使用联合索引需遵循**最佳左前缀法则**：where 条件从最左列开始、连续匹配、不跳列；能否命中由联合索引的排序结构决定。',
].join('\n\n');
inst.card.rootContent = [inst.card.title || inst.label, ...inst.card.tabs.map(t => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
console.log('demo_composite_index 卡片已瘦身');

// ---------- treebind ----------
let out = edges.slice();
const binds = [];
const walkBind = (entry, parentEntryId) => {
  binds.push({
    id: `treebind:${parentEntryId}:${entry.id}`,
    source: (findWithParent(tree, n => n.id === parentEntryId) || {}).nodeRef || null,
    target: entry.nodeRef,
    type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [],
  });
  for (const c of entry.children || []) walkBind(c, entry.id);
};
walkBind(ruleEntry, parentEntry.node.id);
// 修正 source：直接按 nodeRef 父链取
const fixSource = (entry, parentNodeRef) => {
  for (const b of binds) if (b.target === entry.nodeRef) b.source = parentNodeRef;
  for (const c of entry.children || []) fixSource(c, entry.nodeRef);
};
fixSource(ruleEntry, 'demo_composite_index');
const droppedOld = out.filter(e => !(e.id.startsWith('treebind:') && binds.some(nb => nb.target === e.target) && !pool[e.target]));
out = out.filter(e => !(e.id.startsWith('treebind:') && binds.some(nb => nb.target === e.target)));
out.push(...binds);
console.log('treebind added:', binds.length, '| edges ->', out.length);

// ---------- placement ----------
for (const [id, parentRef] of [
  ['leftmost_prefix_rule', 'demo_composite_index'],
  ['lpf_case_in_order', 'leftmost_prefix_rule'],
  ['lpf_case_skip_left', 'leftmost_prefix_rule'],
  ['lpf_case_reordered', 'leftmost_prefix_rule'],
  ['joint_index_sort_structure', 'leftmost_prefix_rule'],
  ['jis_first_column_global', 'joint_index_sort_structure'],
  ['jis_second_column_local', 'joint_index_sort_structure'],
  ['jis_skip_leftmost_corollary', 'joint_index_sort_structure'],
]) {
  gov.placements.push({
    id: `placement:${id}`, nodeId: id,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: parentRef,
    canonicalTreeEntryId: `tree_${id}`,
    pathHint: ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '十一、索引', '组合索引 / composite index', 'MySQL 组合索引', pool[id].label],
    confidence: 'high',
    rationale: '由「最佳左前缀法则」笔记融合内容结构化而来：结构描述独立成节点，结构要素用子节点表达。',
  });
}
console.log('placements created:', 8);

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
console.log('structurize-lpf complete');
