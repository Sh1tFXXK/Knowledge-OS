// 清除 java 下旧的空壳「类库」组（2026-08-29）
// java 下同时存在「类库」（旧维基导入的 4 节点全 0 字空壳）与「常用类库」（真实内容），
// 造成"两个类库"。本脚本删除空壳「类库」子树（无语义边、无问题引用、无共享挂载）。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `remove-empty-leiku-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

const LEIKU_REF = 'k_1784343188560_x1gylq';
function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }

const node = findTreeByRef(tree, LEIKU_REF);
if (!node) throw new Error('类库 node not found');
const ids = [];
(function walk(n) { ids.push(n.nodeRef); for (const c of n.children ?? []) walk(c); })(node);
// 安全检查：所有节点必须 0 内容
for (const ref of ids) {
  const len = (pool[ref]?.card?.tabs ?? []).reduce((s, t) => s + String(t.content || '').length, 0);
  if (len > 0) throw new Error(`${ref} has ${len} chars content — refusing to delete`);
}

// 从 java children 摘除
const javaTree = findTreeByRef(tree, 'k_1782746457581_30q8ao');
javaTree.children = (javaTree.children ?? []).filter((c) => c.nodeRef !== LEIKU_REF);
// 删池条目与绑定
for (const ref of ids) delete pool[ref];
edges = edges.filter((e) => !(ids.includes(e.source) || ids.includes(e.target)));

// 校验（豁免 MySQL 域历史遗留悬挂端点）
const preexisting = new Set();
for (const e of JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'))) {
  for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
}
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) {
  if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id);
  if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id);
}
if (problems.length) { problems.forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed'); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
console.log(`remove-empty-leiku complete: java children = ${(javaTree.children ?? []).length}, removed ${ids.length} empty nodes`);
