// 清理组合索引下的空占位重复（2026-08-31）
// k_1788151695599_9jyfrs「最佳左前缀法则」与 k_1788152029551_hfah3j「底层原理（B+树结构决定）」
// 均为空占位节点（无 tabs、无题目关联），与新结构化节点同名主题撞车。
// 处理：摘树 + archived-redirect（池节点保留，符合不变量 6/7）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `archive-lpf-placeholders-${ts}`);
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

const MOVES = [
  ['k_1788151695599_9jyfrs', 'leftmost_prefix_rule', '与「最佳左前缀法则 / leftmost prefix rule」同名主题；本节点为空占位（无内容、无关联），摘树归档，结构化内容由新节点树承载。'],
  ['k_1788152029551_hfah3j', 'joint_index_sort_structure', '与「联合索引排序结构（底层原理）」同名主题；本节点为空占位（无内容、无关联），摘树归档。'],
];
for (const [dupId, canon, rationale] of MOVES) {
  const entry = findWithParent(tree, n => n.nodeRef === dupId);
  if (!entry) throw new Error('tree entry missing: ' + dupId);
  if ((entry.node.children || []).length) throw new Error('has children: ' + dupId);
  entry.parent.children.splice(entry.parent.children.indexOf(entry.node), 1);
  pool[dupId].status = 'archived-redirect';
  gov.redirects.push({ id: `redirect:${dupId}`, from: dupId, to: canon, status: 'accepted', contentStatus: 'archived-redirect', rationale });
  gov.placements = gov.placements.filter(p => p.nodeId !== dupId);
  console.log('archived:', dupId, '->', canon);
}

const dropped = new Set(MOVES.map(m => m[0]));
const out = edges.filter(e => !(e.id.startsWith('treebind:') && (dropped.has(e.source) || dropped.has(e.target))));
console.log('treebind removed:', edges.length - out.length);

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
console.log('archive-lpf-placeholders complete');
