// 「十一、索引结构」同题实例合并与文案清理（2026-08-30）
//  1) 全文索引：demo_fulltext_index 原为空占位卡，将 3 个词条
//     （full-text search / FTS / search index）的实质内容合并为一张完整实例卡后归档。
//  2) 组合索引：连接索引（concatenated index，纯同义交叉引用）、复合索引（composite index）
//     与组合索引同义，要点并入 demo_composite_index 后归档。
//  3) 前缀索引：列前缀（column prefix）即前缀索引的机制本体，内容并入 k_auto_es1cgt 后归档。
//  4) 普通索引（二级索引实例）：补 INDEX/KEY 与 secondary index 等价说明，role 补 plain。
//  5) 全章清理过时「概念节点（数据库原理）」文案；同步 treebind/redirect/placement。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-index-chapter-${ts}`);
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
function refreshRootContent(node) {
  const card = node.card;
  card.rootContent = [card.title || node.label, ...card.tabs.map((t) => t.content || '')].join(' ').replace(/\s+/g, ' ').trim();
}
function setDef(nodeId, content) {
  const tab = pool[nodeId].card.tabs.find((t) => t.id === 'def') || pool[nodeId].card.tabs[0];
  tab.content = content;
  refreshRootContent(pool[nodeId]);
  console.log('def written:', nodeId);
}
function ensurePlacement(nodeId, parentNodeId, pathHint, rationale) {
  const entry = byRef(nodeId);
  const pl = gov.placements;
  const existing = pl.find((p) => p.nodeId === nodeId);
  if (existing) {
    existing.canonicalParentNodeId = parentNodeId;
    existing.canonicalTreeEntryId = entry ? entry.node.id : undefined;
    console.log('placement updated:', nodeId, '->', parentNodeId);
    return;
  }
  pl.push({
    id: `placement:${nodeId}`, nodeId,
    status: 'accepted', contentStatus: 'canonical',
    canonicalParentNodeId: parentNodeId, canonicalTreeEntryId: entry ? entry.node.id : undefined,
    pathHint, confidence: 'high', rationale,
  });
  console.log('placement created:', nodeId, '->', parentNodeId);
}
function unmountAndRedirect(dupId, canonicalId, rationale) {
  const dupEntry = byRef(dupId);
  if (!dupEntry) throw new Error(`tree entry not found: ${dupId}`);
  if ((dupEntry.node.children || []).length) throw new Error(`${dupId} has children; re-parent first`);
  const i = dupEntry.parent.children.indexOf(dupEntry.node);
  dupEntry.parent.children.splice(i, 1);
  pool[dupId].status = 'archived-redirect';
  gov.redirects.push({ id: `redirect:${dupId}`, from: dupId, to: canonicalId, status: 'accepted', contentStatus: 'archived-redirect', rationale });
  gov.placements = gov.placements.filter((p) => p.nodeId !== dupId);
  console.log('redirect registered:', dupId, '->', canonicalId);
}

// ---------- 1) 全文索引 ----------
setDef('demo_fulltext_index',
  '**MySQL 全文索引 / FULLTEXT index**\n「全文索引 / full-text index」通用概念在 MySQL 中的具体呈现：\n\n**FULLTEXT index**：供**全文搜索**查询使用的一种特殊**索引**。MySQL 5.6.4 起 `InnoDB` 与 `MyISAM` 表均支持 `FULLTEXT` 索引（此前仅 `MyISAM` 支持）。\n\n**全文搜索 / full-text search**：MySQL 的一项功能，配合 `MATCH()` 等 SQL 函数使用 `FULLTEXT` 索引，比 `LIKE` 操作符或自行编写应用层搜索更快、更灵活地查找单词、短语与布尔组合。\n\n缩写 **FTS** 通常即 full-text search；但在性能讨论中有时指 full table scan（全表扫描），注意区分。\n\n本节点是实例，其本体见「全文索引 / full-text index」概念节点。');
unmountAndRedirect('mysql_glossary_full_text_search_16dcha', 'demo_fulltext_index',
  '与「MySQL 全文索引」（demo_fulltext_index）同题双实例；全文搜索功能描述已并入保留卡，本节点摘树归档。');
unmountAndRedirect('mysql_glossary_fts_1x0dll', 'demo_fulltext_index',
  '「MySQL 全文本搜索 / FTS」为全文搜索的缩写词条，缩写说明（含与 full table scan 的歧义）已并入保留卡，本节点摘树归档。');
unmountAndRedirect('mysql_glossary_search_index_18jlmz', 'demo_fulltext_index',
  '「MySQL 搜索索引 / search index」即 FULLTEXT 索引的另一称谓，InnoDB 5.6.4+ 支持等要点已并入保留卡，本节点摘树归档。');
ensurePlacement('demo_fulltext_index', 'concept_fulltext_index',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '十一、索引结构', '索引 / index', '全文索引 / full-text index'],
  'MySQL 全文索引实例，吸收全文搜索/FTS/search index 三词条要点。');

// ---------- 2) 组合索引 ----------
setDef('demo_composite_index',
  '**MySQL 组合索引**\n「组合索引 / composite index」通用概念在 MySQL 中的具体呈现：\n\n包含多个列的索引，按列顺序构建搜索树。别名：**复合索引**（composite index）、**连接索引**（concatenated index）——MySQL 官方术语为 composite index，三者同义。\n\n本节点是实例，其本体见「组合索引 / composite index」概念节点。');
unmountAndRedirect('mysql_glossary_concatenated_index_zs31t2', 'demo_composite_index',
  '「MySQL 连接索引 / concatenated index」为组合索引的同义交叉引用词条（正文仅"参见 composite index"），别名说明已并入保留卡，本节点摘树归档。');
unmountAndRedirect('mysql_glossary_composite_index_duhrko', 'demo_composite_index',
  '「MySQL 复合索引 / composite index」与组合索引同义，定义与别名说明已并入保留卡，本节点摘树归档。');
ensurePlacement('demo_composite_index', 'concept_composite_index',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '十一、索引结构', '索引 / index', '组合索引 / composite index'],
  'MySQL 组合索引实例，吸收复合/连接索引词条。');

// ---------- 3) 前缀索引 ----------
setDef('k_auto_es1cgt',
  '**MySQL 前缀索引**\n「前缀索引 / prefix index」通用概念在 MySQL 中的具体呈现：\n\n只索引列值的前 N 个字符：`CREATE INDEX idx ON t1 (c1(N))` 时，索引中仅存储列值的前缀（InnoDB 通常取前 768 字符）。**截断长字段、节省空间**：索引更紧凑，内存与磁盘 I/O 开销更小。\n\n权衡：前缀取得过短会让不同的取值在优化器看来近乎重复，妨碍查询优化；对二进制值或长文本列、排序又非主要考量时，用前缀索引避免整值入索引浪费空间。\n\n本节点是实例，其本体见「前缀索引 / prefix index」概念节点。');
pool['k_auto_es1cgt'].role = 'plain';
unmountAndRedirect('mysql_glossary_column_prefix_15o687', 'k_auto_es1cgt',
  '「MySQL 列前缀 / column prefix」即前缀索引的机制本体（CREATE INDEX 列前缀长度规范），内容已并入保留卡，本节点摘树归档。');
ensurePlacement('k_auto_es1cgt', 'concept_prefix_index',
  ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '十一、索引结构', '索引 / index', '前缀索引 / prefix index'],
  'MySQL 前缀索引实例，吸收列前缀词条。');

// ---------- 4) 普通索引（二级索引实例） ----------
{
  const tab = pool['k_auto_yb9yyu'].card.tabs.find((t) => t.id === 'def') || pool['k_auto_yb9yyu'].card.tabs[0];
  tab.content = tab.content.replace(
    '本节点是实例，其本体见「二级索引 / secondary index」概念节点（数据库原理）。',
    'MySQL 中用 `INDEX`/`KEY` 创建的即普通索引；在 InnoDB 里对应「二级索引 / secondary index」（聚簇索引之外的索引）。\n\n本节点是实例，其本体见「二级索引 / secondary index」概念节点。',
  );
  pool['k_auto_yb9yyu'].role = 'plain';
  refreshRootContent(pool['k_auto_yb9yyu']);
  console.log('enriched: k_auto_yb9yyu MySQL 普通索引');
  ensurePlacement('k_auto_yb9yyu', 'concept_secondary_index',
    ['知识宇宙', '计算机科学', '信息系统', '数据库管理', '数据库', '十一、索引结构', '索引 / index', '二级索引 / secondary index'],
    'MySQL 普通索引即二级索引的实例。');
}

// ---------- 5) 全章清理过时文案 ----------
let swept = 0;
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
})(idxNode());
function idxNode() { return findWithParent(tree, (n) => n.name === '十一、索引结构').node; }
console.log('stale swept:', swept, 'cards');

// ---------- 6) 边与绑定同步 ----------
const archived = new Set([
  'mysql_glossary_full_text_search_16dcha', 'mysql_glossary_fts_1x0dll', 'mysql_glossary_search_index_18jlmz',
  'mysql_glossary_concatenated_index_zs31t2', 'mysql_glossary_composite_index_duhrko', 'mysql_glossary_column_prefix_15o687',
]);
let out = edges.filter((e) => {
  if (e.id.startsWith('treebind:') && archived.has(e.target)) return false;
  if (e.type === 'instance-of' && archived.has(e.source)) return false;
  return true;
});
console.log('edges:', edges.length, '->', out.length, '(treebind + 已归档实例的 instance-of 移除)');

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
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', out);
atomicWrite('knowledge-governance.json', gov);
console.log('fix-index-chapter complete');
