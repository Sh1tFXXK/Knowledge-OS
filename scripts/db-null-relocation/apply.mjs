#!/usr/bin/env node
/**
 * DB-NULL-RELOCATION — NULL 归位「键与约束」(MVBatch-2)
 * 裁决：NULL 正文讲 IS NULL/NOT NULL/索引交互 ⇒ 与 NOT NULL 同族 ⇒ 键与约束（非数据表示）
 *       主键双身份本批不动；NULL 三值逻辑挂载保留（L4 跨区债，登记不碰）
 *
 * 动作（仅 tree-data.json + knowledge-edges.json 两切片，池零改动）：
 *   1. 树：NULL 节点从「数据库一级(demo_db)」摘除，挂到「键与约束(key_constraint)」下
 *   2. 边：treebind id+source 改写 treebind:demo_db:... → treebind:key_constraint:...，总数不变
 * 用法: node scripts/db-null-relocation/apply.mjs            # dry-run
 *       node scripts/db-null-relocation/apply.mjs --apply    # 落盘
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const TREE_PATH = path.join(DATA, 'tree-data.json');
const EDGES_PATH = path.join(DATA, 'knowledge-edges.json');
const POOL_PATH = path.join(DATA, 'node-pool.json');

const PARENT_DB = 'demo_db';                 // 数据库一级 treeId
const CONTAINER = 'key_constraint';          // 键与约束 treeId
const CONTAINER_REF = 'container:key_constraint';
const NULL_TREE_ID = 'projection:mysql-term:k_dict_fxoirizf'; // 散装位 treeId（冒号，走 edge 不走 split）
const NULL_REF = 'k_dict_fxoirizf';
const KEEP_EDGE = 'treebind:theory_domain_three_valued_logic:mysql_term_three_valued_logic_null_plui03'; // 保留
const OLD_EDGE_ID = 'treebind:' + PARENT_DB + ':' + NULL_TREE_ID;
const NEW_EDGE_ID = 'treebind:' + CONTAINER + ':' + NULL_TREE_ID;

let failures = 0;
const gate = (desc, ok, reading = '') => {
  if (!ok) failures++;
  console.log((ok ? '✓' : '✗') + ' ' + desc + (reading ? ' — ' + reading : ''));
};

const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
const edges = JSON.parse(fs.readFileSync(EDGES_PATH, 'utf8'));
const poolRaw = fs.readFileSync(POOL_PATH, 'utf8'); // 只读校验用，不写

// ── 定位 ──
function walk(n, cb, parent) { cb(n, parent); (n.children || []).forEach(c => walk(c, cb, n)); }
let dbNode = null, containerNode = null, nullNode = null, nullParent = null;
walk(tree, (n, p) => {
  if (n.id === PARENT_DB) dbNode = n;
  if (n.id === CONTAINER) containerNode = n;
  if (n.id === NULL_TREE_ID) { nullNode = n; nullParent = p; }
});

console.log('\n== DB-NULL-RELOCATION ' + (APPLY ? 'APPLY' : 'DRY-RUN') + ' ==');
gate('G1 数据库一级 demo_db 存在', !!dbNode);
gate('G2 键与约束容器存在 ref=' + CONTAINER_REF, !!containerNode && containerNode.nodeRef === CONTAINER_REF);
gate('G3 NULL 散装位存在且父=demo_db', !!nullNode && nullParent && nullParent.id === PARENT_DB, nullNode ? 'parent=' + (nullParent && nullParent.id) : 'NULL 未找到');
gate('G4 NULL ref=' + NULL_REF, !!nullNode && nullNode.nodeRef === NULL_REF);

// ── 边断言 ──
const oldEdge = edges.find(e => e.id === OLD_EDGE_ID);
gate('G5 旧 treebind 边存在 ' + OLD_EDGE_ID, !!oldEdge, oldEdge ? ('src=' + oldEdge.source + ' dims=' + JSON.stringify(oldEdge.dimensions)) : '');
gate('G6 保留边（三值逻辑）不动', edges.some(e => e.id === KEEP_EDGE));
gate('G7 新边 id 未被占用', !edges.some(e => e.id === NEW_EDGE_ID));

// ── 主键双身份不动断言 ──
const pkIds = ['tree_concept_primary_key', 'tree_1788179275561_216qli'];
let pkCount = 0;
walk(tree, (n) => { if (pkIds.includes(n.id)) pkCount++; });
gate('G8 主键双身份本批不动（两挂载均在）', pkCount === 2, 'pkMounts=' + pkCount);

// ── 变异 ──
const edgesBefore = edges.length;
const treeNodesBefore = (() => { let c = 0; walk(tree, () => c++); return c; })();

if (failures > 0) { console.log('\n前置断言失败 ' + failures + ' 项，中止'); process.exit(1); }

// 树：摘除散装位 + 挂到容器下
if (dbNode && nullNode && containerNode) {
  dbNode.children = (dbNode.children || []).filter(c => c.id !== NULL_TREE_ID);
  // 保持容器孩子字典序观感：NULL 放 NOT NULL 之后（与 NOT NULL 同族相邻）
  containerNode.children = containerNode.children || [];
  const nnIdx = containerNode.children.findIndex(c => /NOT NULL/.test(c.name || ''));
  const at = nnIdx > -1 ? nnIdx + 1 : containerNode.children.length;
  containerNode.children.splice(at, 0, nullNode);
}
// 边：id+source 改写
if (oldEdge) { oldEdge.id = NEW_EDGE_ID; oldEdge.source = CONTAINER_REF; }

// ── 收尾断言 ──
const treeNodesAfter = (() => { let c = 0; walk(tree, () => c++); return c; })();
gate('G9 树节点总数不变（' + treeNodesBefore + '→' + treeNodesAfter + '）', treeNodesBefore === treeNodesAfter);
gate('G10 边总数不变（' + edgesBefore + '→' + edges.length + '）', edgesBefore === edges.length);
let nullInDb = 0, nullInContainer = 0;
walk(tree, (n, p) => {
  if (n.id === NULL_TREE_ID && p && p.id === PARENT_DB) nullInDb++;
  if (n.id === NULL_TREE_ID && p && p.id === CONTAINER) nullInContainer++;
});
gate('G11 NULL 散装位已摘除', nullInDb === 0);
gate('G12 NULL 已挂键与约束下', nullInContainer === 1);
gate('G13 保留边仍在', edges.some(e => e.id === KEEP_EDGE));
gate('G14 新边 source=container:key_constraint', edges.some(e => e.id === NEW_EDGE_ID && e.source === CONTAINER_REF));

if (failures > 0) { console.log('\n收尾断言失败 ' + failures + ' 项，不写盘'); process.exit(1); }

if (!APPLY) {
  console.log('\nDRY-RUN OK — 未写盘。加 --apply 落盘。');
  process.exit(0);
}

// ── 原子写盘（tmp+rename，EPERM 原地写兜底）──
function writeAtomic(filePath, content) {
  const tmp = filePath + '.tmp-nullreloc';
  fs.writeFileSync(tmp, content, 'utf8');
  try { fs.renameSync(tmp, filePath); }
  catch (e) {
    if (e.code === 'EPERM' || String(e).includes('EPERM')) { fs.writeFileSync(filePath, content, 'utf8'); try { fs.unlinkSync(tmp); } catch {} }
    else throw e;
  }
}
writeAtomic(TREE_PATH, JSON.stringify(tree, null, 2) + '\n');
writeAtomic(EDGES_PATH, JSON.stringify(edges, null, 2) + '\n');
console.log('\nAPPLY OK — tree-data.json + knowledge-edges.json 已落盘（池零改动）');
console.log('  NULL: demo_db → key_constraint（三值逻辑挂载保留）');
