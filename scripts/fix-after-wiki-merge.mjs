// 合并收尾（2026-08-29）
// 1. 34 个指向已解散维基容器/被丢 0 字节点的问题 → 重映射到对应主题组
// 2. 「Spring注解」0 字容器被丢弃时，其 6 个有内容的 @ 注解子节点被带离树 → 重新挂到 Spring 组下
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `fix-after-wiki-merge-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));

function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
function findTreeById(node, id) { if (node.id === id) return node; for (const c of node.children ?? []) { const f = findTreeById(c, id); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// 1. 挂回 6 个 @ 注解子节点（池条目仍在、内容在 rootContent/pages 中，只是脱离了树）
const richLen = (ref) => { const n = pool[ref]; if (!n) return 0; let t = String(n.card?.rootContent || '').length; for (const tab of (n.card?.tabs ?? [])) { t += String(tab.content || '').length; for (const pg of (tab.pages ?? [])) t += String(pg.content || '').length; } return t; };
const springTree = findTreeByRef(tree, 'k_java_fw_spring');
springTree.children ??= [];
let mounted = 0;
for (const [id, n] of Object.entries(pool)) {
  if (!/^@/.test(n.label ?? '')) continue;      // @ 注解节点
  if (findTreeByRef(tree, id)) continue;         // 已挂载
  if (richLen(id) === 0) continue;               // 无内容不挂
  springTree.children.push({ id: 'tree_' + id.slice(2), name: n.label, count: 0, nodeRef: id, children: [] });
  upsertEdge({ id: `treebind:${springTree.id}:tree_${id.slice(2)}`, source: springTree.nodeRef, target: id, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
  mounted++;
  console.log('remounted @ node:', n.label, '(' + richLen(id) + ' 字)');
}
console.log('remounted @ annotation nodes:', mounted);

// 2. 问题重映射
const remap = {
  'k_1784445073426_4a834z': 'k_java_fw_spring',        // Spring Framework（维基结构）
  'k_1784510206217_m4qngo': 'k_java_fw_spring_boot',   // Spring Boot（维基结构）→ Spring Boot 组
  'k_1784540662268_6dz4z2': 'k_java_fw_springcloud',   // Spring Cloud（维基结构）
  'k_1785059262643_tziuft': 'k_java_fw_spring',        // Spring（维基结构）
  'k_1785130151868_wov8gf': 'k_java_fw_spring',        // Spring 数据访问（0字已丢）
  'k_1785165990050_t7rh0k': 'k_java_fw_spring',        // Spring注解（0字已丢）
};
let remapped = 0;
for (const q of questions) {
  if (q.relatedNodeId && remap[q.relatedNodeId]) { q.relatedNodeId = remap[q.relatedNodeId]; remapped++; }
}
console.log('questions remapped:', remapped);

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
for (const q of questions) if (q.relatedNodeId && !pool[q.relatedNodeId]) problems.push(`q ${q.id} -> ${q.relatedNodeId}`);
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed: ' + problems.length); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('questions.json', questions);
console.log('fix-after-wiki-merge complete');
