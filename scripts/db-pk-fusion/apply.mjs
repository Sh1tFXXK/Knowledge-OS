#!/usr/bin/env node
/**
 * MVBatch-3 — 主键双身份融合 + 候选键/SQL键辨析挂树（NULL 已 MVBatch-2 归位）
 * 裁决：
 *  1. 主键双身份融合，保留 concept_primary_key（语义 id），删散装 k_1788179275554_knwq7e
 *     - label 错名「主键索引」→「主键」；散装独有子节点 pk_choice 迁到 concept 下
 *     - 正文取并集；引用散装的题 q_1788337298962_u11dl8 relatedNodeId 改指
 *     - 从索引章节(chapter_db_11)卸下，挂到键与约束(key_constraint)容器下
 *  2. 候选键/SQL键辨析 挂到键与约束容器（零新建实体）；GUID 已挂（保持）；贮存/复制/备份/恢复→MVBatch-4
 * 用法: node scripts/db-pk-fusion/apply.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const SURVIVOR = 'concept_primary_key';
const LOOSE_ID = 'k_1788179275554_knwq7e';
const LOOSE_TREE = 'tree_1788179275561_216qli';
const PK_CHOICE_TREE = 'tree_pk_choice';
const CONTAINER = 'key_constraint';
const CONTAINER_REF = 'container:key_constraint';
const IDX_CHAPTER = 'chapter_db_11';
const QUESTION_FIX = 'q_1788337298962_u11dl8';
const MOUNT_NEW = [
  { ref: 'k_wiki_en_outline_of_databases_s11_b5', treeId: 'tree_mnt_candidate_key' },
  { ref: 'k_sql_keys', treeId: 'tree_mnt_sql_keys' },
];

let failures = 0;
const gate = (d, ok, r = '') => { if (!ok) failures++; console.log((ok ? '✓' : '✗') + ' ' + d + (r ? ' — ' + r : '')); };

const pool = read('node-pool.json');
const tree = read('tree-data.json');
const qs = read('questions.json');
const edges = read('knowledge-edges.json');
const now = Date.now();
const walk = (n, cb, p) => { cb(n, p); (n.children || []).forEach(c => walk(c, cb, n)); };

let survivorNode, survivorParent, looseNode, looseParent, container, idxChapter, pkChoiceNode;
walk(tree, (n, p) => {
  if (n.nodeRef === SURVIVOR) { survivorNode = n; survivorParent = p; }
  if (n.nodeRef === LOOSE_ID) { looseNode = n; looseParent = p; }
  if (n.id === PK_CHOICE_TREE) pkChoiceNode = n;
  if (n.id === CONTAINER) container = n;
  if (n.id === IDX_CHAPTER) idxChapter = n;
});
const survivor = pool[SURVIVOR], loose = pool[LOOSE_ID];

console.log('\n== MVBatch-3 主键融合 + 键族挂树 ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
gate('G1 survivor 存在（树+池）', !!survivorNode && !!survivor, 'parent=' + (survivorParent && survivorParent.id));
gate('G2 散装存在（树+池）', !!looseNode && !!loose, 'parent=' + (looseParent && looseParent.id));
gate('G3 散装父=demo_db', looseParent && looseParent.id === 'demo_db');
gate('G4 pk_choice 在散装下', !!pkChoiceNode && looseNode && (looseNode.children || []).some(c => c.id === PK_CHOICE_TREE));
gate('G5 键与约束容器存在', !!container && container.nodeRef === CONTAINER_REF);
gate('G6 survivor 父=chapter_db_11', survivorParent && survivorParent.id === IDX_CHAPTER);
gate('G7 两实体池内存在且 0 挂载', MOUNT_NEW.every(m => { if (!pool[m.ref]) return false; let c = 0; walk(tree, (n) => { if (n.nodeRef === m.ref) c++; }); return c === 0; }));
gate('G8 待挂 treeId 未占用', MOUNT_NEW.every(m => { let c = 0; walk(tree, (n) => { if (n.id === m.treeId) c++; }); return c === 0; }));
gate('G9 引用散装的题存在', qs.some(q => q.id === QUESTION_FIX && q.relatedNodeId === LOOSE_ID));
if (failures > 0) { console.log('\n前置断言失败 ' + failures + ' 项，中止'); process.exit(1); }

const treeBefore = (() => { let c = 0; walk(tree, () => c++); return c; })();
const edgesBefore = edges.length;
const poolBefore = Object.keys(pool).length;
console.log('  基线: 树=' + treeBefore + ' 边=' + edgesBefore + ' 池=' + poolBefore);

// 备份与写盘只在 --apply 时执行（dry-run 零副作用）
const bkPath = APPLY ? path.join(DATA, 'backups', 'pk-fusion-' + now + '.json') : null;
if (APPLY) {
  const backup = { note: 'MVBatch-3 主键融合删除前备份（追溯用）', deletedAt: new Date(now).toISOString(), entity: loose, looseTreeId: LOOSE_TREE };
  fs.mkdirSync(path.join(DATA, 'backups'), { recursive: true });
  fs.writeFileSync(bkPath, JSON.stringify(backup, null, 2) + '\n', 'utf8');
  console.log('  备份 → ' + bkPath);
}
// ── 1. 融合 concept_primary_key ──
survivor.label = '主键';
survivor.card.title = '主键';
survivor.card.rootContent = [
  '主键（Primary Key）：表中唯一标识每一行的列（或列组合），非空 + 唯一，等价于不含 NULL 值的唯一索引。',
  'InnoDB 中主键即聚簇索引的键——主键类型选择（自增 / UUID / 雪花）直接影响聚簇索引写入性能，见子节点「主键类型选择：自增 vs UUID」。',
].join('\n');
survivor.tags = [...new Set([...(survivor.tags || []), '主键', 'primary key'])].filter(t => t !== '主键索引');

// ── 2. pk_choice 迁到 survivor 下 ──
looseNode.children = (looseNode.children || []).filter(c => c.id !== PK_CHOICE_TREE);
survivorNode.children = survivorNode.children || [];
survivorNode.children.push(pkChoiceNode);

// ── 3. survivor 从索引章节卸下 → 挂键与约束容器 ──
idxChapter.children = (idxChapter.children || []).filter(c => c.nodeRef !== SURVIVOR);
container.children = container.children || [];
container.children.push(survivorNode);

// ── 4. 删散装（树节点 + 池实体）──
looseParent.children = (looseParent.children || []).filter(c => c.nodeRef !== LOOSE_ID);
delete pool[LOOSE_ID];

// ── 5. 题 relatedNodeId 改指 ──
const qf = qs.find(q => q.id === QUESTION_FIX);
if (qf) { qf.relatedNodeId = SURVIVOR; qf.updatedAt = now; }

// ── 6. 边改写/删除/新增 ──
for (let i = edges.length - 1; i >= 0; i--) {
  const e = edges[i];
  if (e.target === LOOSE_ID && e.type === 'belongs-to') edges.splice(i, 1);           // 删散装 treebind
}
for (const e of edges) {
  if (e.id === 'treebind:' + IDX_CHAPTER + ':tree_concept_primary_key') { e.id = 'treebind:' + CONTAINER + ':tree_concept_primary_key'; e.source = CONTAINER_REF; }
  if (e.id === 'treebind:' + LOOSE_TREE + ':' + PK_CHOICE_TREE) { e.id = 'treebind:tree_concept_primary_key:' + PK_CHOICE_TREE; e.source = SURVIVOR; }
}
for (const m of MOUNT_NEW) {
  const e = pool[m.ref];
  container.children.push({ id: m.treeId, name: e.label, count: 0, nodeRef: m.ref, children: [] });
  edges.push({ id: 'treebind:' + CONTAINER + ':' + m.treeId, source: CONTAINER_REF, target: m.ref, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: [] });
}

// ── 收尾断言 ──
const treeAfter = (() => { let c = 0; walk(tree, () => c++); return c; })();
gate('G10 树节点 ' + treeBefore + '→' + treeAfter + '（−1 散装 +2 挂树 = +1）', treeAfter === treeBefore + 1);
gate('G11 池实体 ' + poolBefore + '→' + Object.keys(pool).length + '（−1）', Object.keys(pool).length === poolBefore - 1);
gate('G12 边 ' + edgesBefore + '→' + edges.length + '（−1删 +2挂 = +1）', edges.length === edgesBefore + 1);
let looseInTree = 0, survivorMounts = 0, candMounts = 0, sqlKeyMounts = 0;
walk(tree, (n) => {
  if (n.nodeRef === LOOSE_ID) looseInTree++;
  if (n.nodeRef === SURVIVOR) survivorMounts++;
  if (n.nodeRef === 'k_wiki_en_outline_of_databases_s11_b5') candMounts++;
  if (n.nodeRef === 'k_sql_keys') sqlKeyMounts++;
});
gate('G13 散装已从树摘除', looseInTree === 0);
gate('G14 散装已从池摘除', !pool[LOOSE_ID]);
gate('G15 survivor 单挂载且父=键与约束', survivorMounts === 1 && container.children.some(c => c.nodeRef === SURVIVOR));
gate('G16 survivor 2 孩子（MySQL主键索引 + pk_choice）', (survivorNode.children || []).length === 2);
gate('G17 候选键/SQL键辨析已挂树', candMounts === 1 && sqlKeyMounts === 1);
gate('G18 题 relatedNodeId 已改指', qs.find(q => q.id === QUESTION_FIX).relatedNodeId === SURVIVOR);
// G19 只查本批触碰的边：散装已删 → 不得再有指向/来自散装的边；survivor/pk_choice/两挂载的边端点须存活
gate('G19 本批触碰边无悬挂', (() => {
  const touched = edges.filter(e => [SURVIVOR, LOOSE_ID, 'pk_choice', ...MOUNT_NEW.map(m => m.ref)].includes(e.target) || [SURVIVOR, LOOSE_ID, 'pk_choice'].includes(e.source));
  const alive = (v) => !!pool[v] || /^(n_|theory_|container:|governance|k_|atomic_|asplit_|concept_|react_|demo_|mysql_|tio_|pk_)/.test(v);
  const dangling = touched.filter(e => !alive(e.source) || !alive(e.target));
  if (dangling.length) console.log('    悬挂: ' + dangling.map(e => e.id).join(' | '));
  return !edges.some(e => e.target === LOOSE_ID || e.source === LOOSE_ID) && dangling.length === 0;
})());
gate('G20 label 已改「主键」', survivor.label === '主键' && survivor.card.title === '主键');

if (failures > 0) { console.log('\n收尾断言失败 ' + failures + ' 项，不写盘'); process.exit(1); }
if (!APPLY) { console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。'); process.exit(0); }

function writeAtomic(fp, content) {
  const tmp = fp + '.tmp-pkfusion';
  fs.writeFileSync(tmp, content, 'utf8');
  try { fs.renameSync(tmp, fp); }
  catch (e) {
    if (e.code === 'EPERM' || String(e).includes('EPERM')) { fs.writeFileSync(fp, content, 'utf8'); try { fs.unlinkSync(tmp); } catch {} }
    else throw e;
  }
}
writeAtomic(path.join(DATA, 'node-pool.json'), JSON.stringify(pool, null, 2) + '\n');
writeAtomic(path.join(DATA, 'tree-data.json'), JSON.stringify(tree, null, 2) + '\n');
writeAtomic(path.join(DATA, 'questions.json'), JSON.stringify(qs, null, 2) + '\n');
writeAtomic(path.join(DATA, 'knowledge-edges.json'), JSON.stringify(edges, null, 2) + '\n');
console.log('\nAPPLY OK — 4 切片落盘。主键融合 + 候选键/SQL键辨析挂树完成');

