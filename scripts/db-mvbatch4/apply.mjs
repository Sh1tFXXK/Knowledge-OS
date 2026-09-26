#!/usr/bin/env node
/**
 * MVBatch-4 — 贮存/复制/备份/恢复 章节同义错位收尾
 * 逐对裁决（落实前实测）：
 *  - 备份/恢复（atomic 58字）：章节恢复系统已有 concept_backup/concept_restore 更全 → 卸树删实体
 *  - 复制（concept_replication 本体+实例，子=MySQL Replication）：ch14 无此概念 → 卸一级挂 ch14（保留）
 *  - 贮存（k_wiki_en_database_s16 585字，子=复制/虚拟化）：ch10 无贮存容器 → 卸一级挂 ch10（保留）
 * 边处理：
 *  - atomic:s4:restore-backup（恢复→备份 依赖）：两端点均删 → 改指 concept_restore→concept_backup 保留语义
 *  - 复制/贮存 treebind 改父（demo_db → chapter_db_14 / chapter_db_10）
 * 用法: node scripts/db-mvbatch4/apply.mjs [--apply]
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const read = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const DELETE = [
  { id: 'atomic_database_backup', tree: 'atomic_atomic_database_backup', chapter: 'chapter_db_08', survivor: 'concept_backup' },
  { id: 'atomic_database_restore', tree: 'atomic_atomic_database_restore', chapter: 'chapter_db_08', survivor: 'concept_restore' },
];
const MOVE = [
  { id: 'concept_replication', tree: 'tree_concept_replication', to: 'chapter_db_14', toRef: 'container:chapter_db_14' },
  { id: 'k_wiki_en_database_s16', tree: 'tree_wiki_en_database_s16', to: 'chapter_db_10', toRef: 'container:chapter_db_10' },
];
const DEP_EDGE = 'atomic:s4:restore-backup'; // 恢复→备份 依赖，改指 concept

let failures = 0;
const gate = (d, ok, r = '') => { if (!ok) failures++; console.log((ok ? '✓' : '✗') + ' ' + d + (r ? ' — ' + r : '')); };

const pool = read('node-pool.json');
const tree = read('tree-data.json');
const qs = read('questions.json');
const edges = read('knowledge-edges.json');
const now = Date.now();
const walk = (n, cb, p) => { cb(n, p); (n.children || []).forEach(c => walk(c, cb, n)); };

let dbNode; const chNodes = {}; const looseNodes = {}; const moveNodes = {};
walk(tree, (n, p) => {
  if (n.id === 'demo_db') dbNode = n;
  for (const d of DELETE) if (n.nodeRef === d.id) looseNodes[d.id] = { node: n, parent: p };
  for (const m of MOVE) if (n.nodeRef === m.id) moveNodes[m.id] = { node: n, parent: p };
  if (['chapter_db_08', 'chapter_db_10', 'chapter_db_14'].includes(n.id)) chNodes[n.id] = n;
});

console.log('\n== MVBatch-4 章节同义错位收尾 ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
gate('G1 数据库一级 demo_db 存在', !!dbNode);
for (const d of DELETE) {
  gate('G2 散装删除项在库一级 ' + d.id, !!looseNodes[d.id] && looseNodes[d.id].parent && looseNodes[d.id].parent.id === 'demo_db' && !!pool[d.id]);
  gate('G3 章节 survivor 存在 ' + d.survivor, !!pool[d.survivor]);
}
for (const m of MOVE) {
  gate('G4 移动项在库一级 ' + m.id, !!moveNodes[m.id] && moveNodes[m.id].parent && moveNodes[m.id].parent.id === 'demo_db');
  gate('G5 目标章节存在 ' + m.to, !!chNodes[m.to]);
}
gate('G6 依赖边存在 ' + DEP_EDGE, edges.some(e => e.id === DEP_EDGE));
gate('G7 删除项无题引用', DELETE.every(d => !qs.some(q => JSON.stringify(q).includes(d.id))), '');

if (failures > 0) { console.log('\n前置断言失败 ' + failures + ' 项，中止'); process.exit(1); }
const treeBefore = (() => { let c = 0; walk(tree, () => c++); return c; })();
const edgesBefore = edges.length, poolBefore = Object.keys(pool).length;
console.log('  基线: 树=' + treeBefore + ' 边=' + edgesBefore + ' 池=' + poolBefore);

// 备份（仅 --apply）
if (APPLY) {
  const backup = { note: 'MVBatch-4 删除前备份（追溯勿回灌）', deletedAt: new Date(now).toISOString(), deleted: {}, depEdge: edges.find(e => e.id === DEP_EDGE) };
  for (const d of DELETE) backup.deleted[d.id] = pool[d.id];
  fs.mkdirSync(path.join(DATA, 'backups'), { recursive: true });
  fs.writeFileSync(path.join(DATA, 'backups', 'mvbatch4-' + now + '.json'), JSON.stringify(backup, null, 2) + '\n', 'utf8');
  console.log('  备份 → data/backups/mvbatch4-' + now + '.json');
}
// ── A. 备份/恢复：卸树删实体（章节已有更全概念）──
for (const d of DELETE) {
  const { parent } = looseNodes[d.id];
  parent.children = (parent.children || []).filter(c => c.nodeRef !== d.id);
  delete pool[d.id];
  for (let i = edges.length - 1; i >= 0; i--) {
    const e = edges[i];
    if (e.type === 'belongs-to' && (e.target === d.id || e.source === d.id)) edges.splice(i, 1); // 散装 treebind
  }
}

// ── B. 依赖边改指：atomic_database_restore→atomic_database_backup ⇒ concept_restore→concept_backup ──
{
  const dep = edges.find(e => e.id === DEP_EDGE);
  if (dep) { dep.source = 'concept_restore'; dep.target = 'concept_backup'; dep.id = 'rel:concept_restore:depends:concept_backup'; }
}

// ── C. 复制/贮存：卸一级 → 挂章节（保留子树与本体）──
for (const m of MOVE) {
  const { node, parent } = moveNodes[m.id];
  parent.children = (parent.children || []).filter(c => c.nodeRef !== m.id);
  chNodes[m.to].children = chNodes[m.to].children || [];
  chNodes[m.to].children.push(node);
  // treebind 改父
  for (const e of edges) {
    if (e.id === 'treebind:demo_db:' + m.tree) { e.id = 'treebind:' + m.to + ':' + m.tree; e.source = m.toRef; }
  }
}

// ── 收尾断言 ──
const treeAfter = (() => { let c = 0; walk(tree, () => c++); return c; })();
// Δ: 树 −2（删备份/恢复）；池 −2；边 −2删treebind +0（依赖改指）+0（移动改父） = −2
gate('G8 树 ' + treeBefore + '→' + treeAfter + '（−2）', treeAfter === treeBefore - 2);
gate('G9 池 ' + poolBefore + '→' + Object.keys(pool).length + '（−2）', Object.keys(pool).length === poolBefore - 2);
gate('G10 边 ' + edgesBefore + '→' + edges.length + '（−2 散装treebind）', edges.length === edgesBefore - 2);
for (const d of DELETE) {
  let c = 0; walk(tree, (n) => { if (n.nodeRef === d.id) c++; });
  gate('G11 已删 ' + d.id + '（树0+池0）', c === 0 && !pool[d.id]);
}
gate('G12 依赖边已改指 concept_restore→concept_backup', edges.some(e => e.source === 'concept_restore' && e.target === 'concept_backup' && e.relationKind === 'dependency'));
for (const m of MOVE) {
  const inCh = chNodes[m.to].children.some(c => c.nodeRef === m.id);
  const notInDb = !(dbNode.children || []).some(c => c.nodeRef === m.id);
  gate('G13 已归位 ' + m.id + ' → ' + m.to, inCh && notInDb);
}
// 移动项子树保留
gate('G14 复制子树保留（MySQL Replication）', moveNodes['concept_replication'].node.children.some(c => c.nodeRef === 'k_1787326496104_zbtx44'));
gate('G15 贮存子树保留（复制+虚拟化）', moveNodes['k_wiki_en_database_s16'].node.children.length === 2);
gate('G16 无指向已删实体的边', !edges.some(e => DELETE.some(d => e.target === d.id || e.source === d.id)));

if (failures > 0) { console.log('\n收尾断言失败 ' + failures + ' 项，不写盘'); process.exit(1); }
if (!APPLY) { console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。'); process.exit(0); }

function writeAtomic(fp, content) {
  const tmp = fp + '.tmp-mv4';
  fs.writeFileSync(tmp, content, 'utf8');
  try { fs.renameSync(tmp, fp); }
  catch (e) {
    if (e.code === 'EPERM' || e.code === 'UNKNOWN' || String(e).includes('EPERM')) { fs.writeFileSync(fp, content, 'utf8'); try { fs.unlinkSync(tmp); } catch {} }
    else throw e;
  }
}
writeAtomic(path.join(DATA, 'node-pool.json'), JSON.stringify(pool, null, 2) + '\n');
writeAtomic(path.join(DATA, 'tree-data.json'), JSON.stringify(tree, null, 2) + '\n');
writeAtomic(path.join(DATA, 'knowledge-edges.json'), JSON.stringify(edges, null, 2) + '\n');
console.log('\nAPPLY OK — 池/树/边 3 切片落盘（题零改动）');

