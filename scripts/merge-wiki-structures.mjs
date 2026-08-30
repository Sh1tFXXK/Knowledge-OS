// 软件框架域：拆除「（维基结构）」包装组，子节点直接并入同名主题组（2026-08-29）
// - Spring Framework（维基结构）(3) → Spring 组
// - Spring（维基结构）(6) → Spring 组（0 字撞名节点丢弃；「Spring注解」有 @ 子节点内容，改名并入）
// - Spring Boot（维基结构）(2) → Spring Boot 组（容器自身 1656 字卡片内容保留为子节点「Spring Boot（维基）」）
// - Spring Cloud（维基结构）(16) → Spring Cloud 组
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `merge-wiki-structures-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

const SF_TREE_ID = 'tree_acm2012_software_notations_tools_software_frameworks';
const SF_REF = 'k_acm2012_software_notations_tools_software_frameworks';
function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
function findTreeById(node, id) { if (node.id === id) return node; for (const c of node.children ?? []) { const f = findTreeById(c, id); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };
const norm = (s) => String(s || '').replace(/\s+/g, '');
const richLen = (ref) => (pool[ref]?.card?.tabs ?? []).reduce((s, t) => s + String(t.content || '').length, 0);

const MERGES = [
  { wikiRef: 'k_1784445073426_4a834z', targetRef: 'k_java_fw_spring', renames: { '模块': 'Spring Framework 模块（维基）' } },
  { wikiRef: 'k_1785059262643_tziuft', targetRef: 'k_java_fw_spring', renames: { 'Spring注解': 'Spring 注解详解（维基）' } },
  { wikiRef: 'k_1784510206217_m4qngo', targetRef: 'k_java_fw_spring_boot', renames: {} },
  { wikiRef: 'k_1784540662268_6dz4z2', targetRef: 'k_java_fw_springcloud', renames: {} },
];

const wikiTreeIds = new Set();
let movedCount = 0, droppedCount = 0;

for (const { wikiRef, targetRef, renames } of MERGES) {
  const target = findTreeByRef(tree, targetRef);
  if (!target) throw new Error(`merge target missing: ${targetRef}`);
  target.children ??= [];
  const existing = new Set((target.children ?? []).map((c) => norm(c.name)));

  // 收集该 ref 在树中的全部挂载实例（同 ref 可能多处挂载）
  const instances = [];
  (function walk(n, parent) {
    for (const c of n.children ?? []) {
      if (c.nodeRef === wikiRef) instances.push({ node: c, parent: n });
      walk(c, c);
    }
  })(tree, null);
  if (!instances.length) throw new Error(`wiki container not mounted: ${wikiRef}`);
  console.log('dissolving', wikiRef, ':', instances.length, '个挂载实例');

  // Spring Boot（维基结构）容器自身的卡片内容（1656 字）保留为子节点
  if (wikiRef === 'k_1784510206217_m4qngo' && richLen(wikiRef) > 0) {
    const CONCEPT_ID = 'k_java_fw_springboot_wiki_concept';
    const tabs = (pool[wikiRef].card?.tabs ?? []).map((t, i) => ({ id: i === 0 ? 'def' : t.id || 'tab' + i, label: t.label, content: t.content }));
    pool[CONCEPT_ID] = {
      id: CONCEPT_ID,
      label: 'Spring Boot（维基）',
      role: 'reference',
      dimensions: ['java'],
      tags: ['Spring', 'Spring Boot', '维基'],
      card: { nodeId: CONCEPT_ID, title: 'Spring Boot（维基）', tabs },
    };
    target.children.unshift({ id: 'tree_java_fw_springboot_wiki_concept', name: 'Spring Boot（维基）', count: 0, nodeRef: CONCEPT_ID, children: [] });
    existing.add(norm('Spring Boot（维基）'));
    upsertEdge({ id: `treebind:${target.id}:tree_java_fw_springboot_wiki_concept`, source: target.nodeRef, target: CONCEPT_ID, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
    console.log('kept Spring Boot wiki card as child node');
  }

  for (const { node, parent } of instances) {
    for (const child of [...(node.children ?? [])]) {
      const normName = norm(child.name);
      let name = renames[child.name] ?? child.name;
      const collides = existing.has(normName);
      const r = richLen(child.nodeRef);
      if (collides) {
        if (r === 0) {
          node.children = node.children.filter((c) => c !== child);
          delete pool[child.nodeRef];
          droppedCount++;
          console.log('dropped (0字撞名):', child.name);
          continue;
        }
        name = child.name + '（维基）';
      }
      node.children = node.children.filter((c) => c !== child);
      target.children.push(child);
      if (name !== child.name) {
        child.name = name;
        if (pool[child.nodeRef]) { pool[child.nodeRef].label = name; if (pool[child.nodeRef].card) pool[child.nodeRef].card.title = name; }
      }
      existing.add(norm(child.name));
      movedCount++;
      edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === child.nodeRef || e.source === child.nodeRef)));
      upsertEdge({ id: `treebind:${target.id}:${child.id}`, source: target.nodeRef, target: child.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
    }
    // 摘除该实例
    parent.children = (parent.children ?? []).filter((c) => c !== node);
    edges = edges.filter((e) => e.id !== `treebind:${parent.id}:${node.id}`);
  }
  // ref 的全部实例已摘除：删除池条目与残余绑定
  delete pool[wikiRef];
  edges = edges.filter((e) => !((e.source === wikiRef) || (e.target === wikiRef) || String(e.id ?? '').includes(wikiRef)));
  console.log('dissolved:', wikiRef, '->', targetRef);
}

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
for (const m of MERGES) if (pool[m.wikiRef] || findTreeByRef(tree, m.wikiRef)) problems.push('wiki container still exists: ' + m.wikiRef);
// 子节点数核对
const spring = findTreeByRef(tree, 'k_java_fw_spring');
const boot = findTreeByRef(tree, 'k_java_fw_spring_boot');
const cloud = findTreeByRef(tree, 'k_java_fw_springcloud');
if ((spring.children ?? []).length < 20 || (boot.children ?? []).length < 10 || (cloud.children ?? []).length < 20) problems.push('merged group child counts look wrong');
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed: ' + problems.length); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
console.log(`merge-wiki-structures complete:
  - 移动子节点: ${movedCount} | 丢弃 0 字撞名: ${droppedCount}
  - Spring children: ${(spring.children ?? []).length} | Spring Boot: ${(boot.children ?? []).length} | Spring Cloud: ${(cloud.children ?? []).length}
  - 软件框架 children: ${(findTreeByRef(tree, SF_REF).children ?? []).length}（4 个维基包装组已解散）`);
