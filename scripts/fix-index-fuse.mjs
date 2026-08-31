// 「十一、索引结构」→「十一、索引」：主题更名 + 「索引」概念文件夹融合（2026-08-30）
// 用户要求：主题改成索引；刚才合并的实例卡不删除，随融合整体保留。
//  1) 章节更名：十一、索引结构 → 十一、索引（树名 + 容器池卡）。
//  2) 「索引 / index」概念下的 14 个子概念与 MySQL 索引实例提升为章节直属，
//     顺序保持原相对顺序；章节直属的统计类节点与维基来源节点排后。
//  3) 索引本体定义并入「MySQL 索引」卡（新增「本体」标签页），
//     concept_index 从树上摘除、池中保留作 instance-of 语义锚点。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-index-fuse-${ts}`);
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
const byRef = (nodeRef) => findWithParent(tree, (n) => n.nodeRef === nodeRef);
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  let ok = false;
  for (let i = 0; i < 8 && !ok; i++) {
    try { renameSync(tmp, join(DATA, file)); ok = true; }
    catch (err) {
      if (i === 7) throw err;
      console.log(`rename ${file} busy, retry ${i + 1}/7...`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
  }
}

// 1) 章节更名
const chapter = findWithParent(tree, (n) => n.name === '十一、索引结构').node;
chapter.name = '十一、索引';
const chCard = pool['container:chapter_db_11'];
if (chCard) {
  chCard.label = '十一、索引';
  chCard.card.title = '十一、索引';
  const kids = (chapter.children || []).map((c) => c.name);
  const summary = `本节点是导航容器，聚合 ${kids.length} 个子主题：${kids.slice(0, 6).join('、')}${kids.length > 6 ? '等' : ''}。点击子节点查看具体内容。`;
  chCard.card.tabs[0].content = `**十一、索引**\n${summary}`;
  chCard.card.rootContent = ['十一、索引', summary].join(' ').replace(/\s+/g, ' ').trim();
}
console.log('chapter renamed: 十一、索引结构 -> 十一、索引');

// 2) 本体并入 MySQL 索引
const myIdx = pool['n_0xxb9cqy'];
const idxConcept = pool['concept_index'];
const ontoDef = idxConcept.card.tabs.find((t) => t.id === 'def');
if (!myIdx.card.tabs.some((t) => t.id === 'ontology')) {
  myIdx.card.tabs.splice(1, 0, { id: 'ontology', label: '本体（索引 / index）', content: ontoDef.content });
}
const defTab = myIdx.card.tabs.find((t) => t.id === 'def');
defTab.content = defTab.content.replace(
  '本节点是实例，其本体见「索引 / index」概念节点。',
  '本节点是实例，其本体见「索引 / index」概念节点（通用本体定义见「本体」标签页）。',
);
myIdx.card.rootContent = [myIdx.card.title || myIdx.label, ...myIdx.card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
console.log('本体并入 MySQL 索引:', myIdx.card.tabs.map((t) => t.label).join(' | '));

// 3) 提升「索引」子节点到章节直属（保持原相对顺序，MySQL 索引打头）
const idxEntry = byRef('concept_index');
const children = [...(idxEntry.node.children || [])];
const childRefs = children.map((c) => c.nodeRef);
console.log('提升子节点:', children.map((c) => c.name).join(' / '));
const idxPos = chapter.children.indexOf(idxEntry.node);
if (idxPos < 0) throw new Error('索引 not a chapter child');
chapter.children.splice(idxPos, 1); // 摘除索引概念节点
chapter.children.splice(0, 0, ...children); // 子节点插到章节最前

// 4) 章节排序：MySQL 索引 → 14 个索引类型概念 → 统计类 → 维基
const orderRefs = [
  'n_0xxb9cqy',
  'concept_unique_index', 'concept_hash_index', 'concept_clustered_index', 'concept_covering_index',
  'concept_partial_index', 'concept_fulltext_index', 'concept_btree_index', 'concept_composite_index',
  'concept_secondary_index', 'concept_prefix_index', 'concept_descending_index', 'concept_column_index',
  'concept_virtual_index', 'concept_inverted_index',
  'concept_adaptive_hash_index', 'concept_index_statistics', 'concept_cardinality',
  'concept_fill_factor', 'concept_sentinel_record',
  'k_1783250520307_j25py7',
];
const byMap = new Map(chapter.children.map((c) => [c.nodeRef, c]));
if (byMap.size !== chapter.children.length) throw new Error('chapter children not unique: ' + chapter.children.map(c => c.nodeRef).join(','));
if (byMap.size !== orderRefs.length) throw new Error(`order mismatch: ${byMap.size} children vs ${orderRefs.length}`);
chapter.children = orderRefs.map((r) => {
  const e = byMap.get(r);
  if (!e) throw new Error('missing chapter child: ' + r);
  return e;
});
console.log('chapter order:', chapter.children.map((c) => c.name).join(' → '));

// 5) 清理被提升节点与被摘除节点的 treebind（章节直属无绑定）
const dropTargets = new Set(childRefs.concat(['concept_index']));
const out = edges.filter((e) => !(e.id.startsWith('treebind:') && dropTargets.has(e.target)));
console.log('treebind removed:', edges.length - out.length, `(edges ${edges.length} -> ${out.length})`);

// 6) placement 同步
{
  const pl = gov.placements.find((p) => p.nodeId === 'concept_index');
  if (pl) { pl.canonicalTreeEntryId = undefined; console.log('placement entry cleared: concept_index'); }
  const pl2 = gov.placements.find((p) => p.nodeId === 'n_0xxb9cqy');
  if (pl2) {
    pl2.canonicalParentNodeId = 'concept_index';
    pl2.canonicalTreeEntryId = 'n_0xxb9cqy';
    pl2.pathHint = ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '十一、索引', 'MySQL 索引'];
    console.log('placement updated: MySQL 索引 -> concept_index');
  } else {
    gov.placements.push({
      id: 'placement:n_0xxb9cqy', nodeId: 'n_0xxb9cqy',
      status: 'accepted', contentStatus: 'canonical',
      canonicalParentNodeId: 'concept_index', canonicalTreeEntryId: 'n_0xxb9cqy',
      pathHint: ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '十一、索引', 'MySQL 索引'],
      confidence: 'high',
      rationale: 'MySQL 索引是「索引 / index」本体的产品实例，本体定义并入其卡片。',
    });
    console.log('placement created: MySQL 索引 -> concept_index');
  }
}

atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('fix-index-fuse complete');
