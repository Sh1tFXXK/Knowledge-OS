// 「二十一、数据库知识元数据」融合进数据库目录（2026-08-29）
// 用户要求：数据库元知识与数据库概览融合到整个目录（20 章技术目录）。
// 分发映射（按主题归位）：
//   一、数据库系统 ← 技术初衷、数据库管理系统(1841, 并入来源视图544)、数据库技术的发展、术语、历史(+7)、
//                    使用案例、研究、数据库是什么类型的东西？、数据库使用、数据仓库、数据库相关组织、
//                    数据库相关出版物、数据库学者、数据库概览（维基来源全文 10988）
//   二、数据模型   ← 数据库模型(261维基)、分类术语(2272)、数据库类型(1640)、网状数据模型的数据结构(7)
//   三、数据库结构 ← 视图(2221)、架构(212)
//   七、事务系统   ← 数据库事务(2232)
//   十一、索引结构 ← 数据库索引(669)
//   十八、数据库编程与接口 ← 应用(+应用程序接口 252)
// 之后删除空的 二十一 章容器；DBMS 两个同名节点内容合并。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `merge-db-meta-chapter-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));

function findByName(node, name) { if (node.name === name) return node; for (const c of node.children ?? []) { const f = findByName(c, name); if (f) return f; } return null; }
const dbNode = findByName(tree, '数据库');
if (!dbNode) throw new Error('数据库 node not found');
const ch21 = findByName(tree, '二十一、数据库知识元数据');
if (!ch21) throw new Error('二十一、数据库知识元数据 not found');
const chapter = (name) => { const c = findByName(tree, name); if (!c) throw new Error(`chapter missing: ${name}`); return c; };
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// 章节内按名取节点（含来源视图子层）
const byName = new Map();
for (const c of ch21.children ?? []) byName.set(c.name, c);
const ov = byName.get('数据库概览（来源视图）');
for (const c of ov.children ?? []) if (!byName.has(c.name)) byName.set(c.name, c);

const CH = {
  ch1: chapter('一、数据库系统'),
  ch2: chapter('二、数据模型'),
  ch3: chapter('三、数据库结构'),
  ch7: chapter('七、事务系统'),
  ch11: chapter('十一、索引结构'),
  ch18: chapter('十八、数据库编程与接口'),
};

// 父指针与路径信息（移动/摘除用）
const info = new Map();
(function build(n, parentInfo, path) {
  info.set(n, { parentInfo, path: path.join('/') });
  for (const c of n.children ?? []) build(c, n, [...path, c.name]);
})(ch21, null, [ch21.name]);
function infoOf(n) { const m = info.get(n); if (!m) throw new Error('no info for node: ' + (n.name || n.id)); return m; }

function nodeByPath(spec) {
  if (byName.has(spec)) return byName.get(spec);
  const [head, ...rest] = spec.split('/');
  let cur = byName.get(head);
  for (const seg of rest) cur = (cur.children ?? []).find((c) => c.name === seg);
  return cur ?? null;
}

const poolDeleted = new Set();

// [ch21 内名称(或 来源视图/xxx), 目标章节, 新名称?]
const MOVES = [
  ['视图', 'ch3'],
  ['数据库模型', 'ch2', '数据库模型（维基）'],
  ['数据库模型/架构', 'ch3', '架构（维基）'],
  ['数据库模型/数据库索引', 'ch11', '数据库索引（维基）'],
  ['数据库模型/数据库事务', 'ch7', '数据库事务（维基）'],
  ['数据库模型/网状数据模型的数据结构', 'ch2'],
  ['分类术语', 'ch2', '分类术语（维基）'],
  ['数据库类型', 'ch2', '数据库类型（维基）'],
  ['技术初衷', 'ch1'],
  ['术语', 'ch1'],
  ['历史', 'ch1'],
  ['数据库技术的发展', 'ch1'],
  ['使用案例', 'ch1'],
  ['研究', 'ch1'],
  ['数据库是什么类型的东西？', 'ch1'],
  ['数据库使用', 'ch1'],
  ['数据仓库', 'ch1'],
  ['数据库相关组织', 'ch1'],
  ['数据库相关出版物', 'ch1'],
  ['数据库学者', 'ch1'],
  ['应用', 'ch18'],
  ['数据库管理系统', 'ch1'],
];

let movedCount = 0;
for (const [spec, chKey, newName] of MOVES) {
  const src = nodeByPath(spec);
  if (!src) throw new Error(`move source not found: ${spec}`);
  const target = CH[chKey];
  target.children ??= [];
  const meta = infoOf(src);
  meta.parentInfo.children = (meta.parentInfo.children ?? []).filter((c) => c !== src);
  target.children.push(src);
  if (newName) {
    src.name = newName;
    if (pool[src.nodeRef]) { pool[src.nodeRef].label = newName; if (pool[src.nodeRef].card) pool[src.nodeRef].card.title = newName; }
  }
  meta.parentInfo = target;
  movedCount++;
  edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === src.nodeRef || e.source === src.nodeRef)));
  if (target.nodeRef && target.nodeRef !== src.nodeRef) {
    upsertEdge({ id: `treebind:${target.id}:${src.id}`, source: target.nodeRef, target: src.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['database'] });
  }
}

// ========== 来源视图本体先移入 一、数据库系统（改名） ==========
const ovInfo2 = info.get(ov);
ovInfo2.parentInfo.children = (ovInfo2.parentInfo.children ?? []).filter((c) => c !== ov);
CH.ch1.children.push(ov);
ov.name = '数据库概览（维基来源全文）';
pool[ov.nodeRef].label = ov.name;
if (pool[ov.nodeRef].card) pool[ov.nodeRef].card.title = ov.name;
ovInfo2.parentInfo = CH.ch1;
edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === ov.nodeRef || e.source === ov.nodeRef)));
// 一、数据库系统 是无池条目的纯目录容器，按 App 约定不建 treebind
// 来源视图下的 数据库模型 与已移入 二、数据模型 的是同一 ref 的重复挂载 → 仅摘这份树实例（池保留）
const ovDupModel = (ov.children ?? []).find((c) => c.nodeRef === 'k_1783250387082_pp338r');
if (ovDupModel) {
  ov.children = ov.children.filter((c) => c !== ovDupModel);
  edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === ovDupModel.nodeRef || e.source === ovDupModel.nodeRef)));
}

// ========== DBMS 同名合并：来源视图(544) 并入主节点(1841) ==========
const dbmsMainNode = (CH.ch1.children ?? []).find((c) => c.nodeRef === 'k_wiki_en_database_s12');
if (!dbmsMainNode) throw new Error('DBMS main node missing in ch1');
const dbmsSrcRef = 'k_wiki_en_outline_of_databases_s10';
const dbmsSrcContent = (pool[dbmsSrcRef]?.card?.tabs ?? []).map((t) => String(t.content || '')).join('\n').trim();
const mainTab = pool['k_wiki_en_database_s12'].card.tabs[0];
mainTab.content = String(mainTab.content).trimEnd() + `\n\n【来源视图摘录】\n${dbmsSrcContent}`;
// 摘除来源视图下的 s10 树实例（其内容已并入；来源视图本体已先移入 ch1 并改名）
const ovNode = (CH.ch1.children ?? []).find((c) => c.name === '数据库概览（维基来源全文）');
if (ovNode) {
  const s10node = (ovNode.children ?? []).find((c) => c.nodeRef === dbmsSrcRef);
  if (s10node) ovNode.children = ovNode.children.filter((c) => c !== s10node);
}
edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === dbmsSrcRef || e.source === dbmsSrcRef)));
delete pool[dbmsSrcRef];
poolDeleted.add(dbmsSrcRef);
console.log('DBMS 来源视图内容已并入主节点');

// ========== 摘出来源视图本体（改名后移入 一、数据库系统） ==========
const ovInfo = info.get(ov);
ovInfo.parentInfo.children = (ovInfo.parentInfo.children ?? []).filter((c) => c !== ov);
CH.ch1.children.push(ov);
ov.name = '数据库概览（维基来源全文）';
pool[ov.nodeRef].label = ov.name;
if (pool[ov.nodeRef].card) pool[ov.nodeRef].card.title = ov.name;
edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === ov.nodeRef || e.source === ov.nodeRef)));

// ========== 删除空的 二十一 章容器 ==========
if ((ch21.children ?? []).length > 0) throw new Error(`二十一 still has ${ch21.children.length} children: ` + ch21.children.map((c) => c.name).join(','));
const dbParent = (() => { let p = null; (function walk(n) { for (const c of n.children ?? []) { if (c === dbNode) { p = n; return; } walk(c, n); } })(tree); return p; })();
dbParent.children = dbParent.children.filter((c) => c !== ch21);
delete pool[ch21.nodeRef];
poolDeleted.add(ch21.nodeRef);
dbNode.count = (dbNode.children ?? []).length;

// ========== 问题重映射（被删池条目） ==========
let remapped = 0;
for (const q of questions) {
  if (q.relatedNodeId && poolDeleted.has(q.relatedNodeId)) { q.relatedNodeId = dbmsMainNode.nodeRef; remapped++; }
}

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
for (const q of questions) if (q.relatedNodeId && !pool[q.relatedNodeId]) problems.push(`q ${q.id} -> ${q.relatedNodeId}`);
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error(`integrity failed: ${problems.length}`); }

// ========== 写回 ==========
const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('questions.json', questions);

console.log(`merge-db-meta-chapter complete:
  - 移动节点: ${movedCount}
  - DBMS 来源视图内容并入主节点; 删除池条目 ${poolDeleted.size}
  - 二十一 章容器已删除; 数据库 chapters: ${(dbNode.children ?? []).length}
  - 问题重映射: ${remapped}`);
