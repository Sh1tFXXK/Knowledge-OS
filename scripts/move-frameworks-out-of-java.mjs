// 框架和中间件主题迁出 Java（2026-08-29）
// 用户原则：软件框架知识属于「软件符号与工具 / 软件框架」本体域，与 Java 只是关联关系，不属于 Java。
// 动作：
//   1. java 下的「框架和中间件」组整体迁到 软件符号与工具/软件框架 下（7 个框架子组直接挂载，
//      中间组节点 k_java_frameworks 解散，其总览并入 软件框架 的新 Tab）
//   2. 重建 treebind：删除 java→框架和中间件 及 框架和中间件→子组 的绑定，建立 软件框架→子组
//   3. 关联边：java ↔ 软件框架（related-to，"Java 生态的框架与中间件"）
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `move-frameworks-out-of-java-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

const JAVA_REF = 'k_1782746457581_30q8ao';
const JAVA_TREE_ID = 'tree_1782746457614_osttpr';
const FW_GROUP_REF = 'k_java_frameworks';
const FW_GROUP_TREE_ID = 'tree_java_frameworks';
const SF_REF = 'k_acm2012_software_notations_tools_software_frameworks';
const SF_TREE_ID = 'tree_acm2012_software_notations_tools_software_frameworks';
const SUBGROUP_REFS = ['k_java_fw_javaweb', 'k_java_fw_spring', 'k_java_fw_mybatis', 'k_java_fw_netty', 'k_java_fw_kafka', 'k_java_fw_rabbitmq', 'k_java_fw_springcloud'];

function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

const javaTree = findTreeByRef(tree, JAVA_REF);
const sfTree = findTreeByRef(tree, SF_REF);
const fwGroupIdx = (javaTree.children ?? []).findIndex((c) => c.id === FW_GROUP_TREE_ID);
if (fwGroupIdx < 0) throw new Error('框架和中间件 not under java');
const [fwGroupNode] = javaTree.children.splice(fwGroupIdx, 1);
if (!fwGroupNode.children?.length) throw new Error('框架和中间件 has no children');

// 1. 七个子组直接挂到 软件框架 下
sfTree.children ??= [];
for (const ref of SUBGROUP_REFS) {
  const idx = fwGroupNode.children.findIndex((c) => c.nodeRef === ref);
  if (idx < 0) throw new Error(`subgroup missing: ${ref}`);
  const [sub] = fwGroupNode.children.splice(idx, 1);
  sfTree.children.push(sub);
  edges = edges.filter((e) => !(e.id === `treebind:${FW_GROUP_TREE_ID}:${sub.id}`));
  upsertEdge({ id: `treebind:${SF_TREE_ID}:${sub.id}`, source: SF_REF, target: ref, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
  console.log('mounted under 软件框架:', sub.name);
}
sfTree.count = (sfTree.children ?? []).length;

// 2. 解散中间组：总览内容并入 软件框架 新 Tab，删除组节点与池条目
const overview = String(pool[FW_GROUP_REF]?.card?.tabs?.[0]?.content ?? '').trim();
const sfNode = pool[SF_REF];
sfNode.card.tabs ??= [];
sfNode.card.tabs.push({
  id: 'java-ecosystem',
  label: 'Java 生态框架与中间件',
  content: overview
    .replace(/^\s*#\s*[^\n]*\n+/, '')
    .replace(/^\s*## 导航[\s\S]*$/m, '')
    .replace(/\[\[([^\]|]*)\|?([^\]]*)\]\]/g, (_m, target, label) => label || target.replace(/^.*\//, ''))
    .trim(),
});
delete pool[FW_GROUP_REF];

// 3. 旧绑定清理：java→框架和中间件
edges = edges.filter((e) => e.id !== `treebind:${JAVA_TREE_ID}:${FW_GROUP_TREE_ID}`);

// 4. 关联边：java ↔ 软件框架
edges = edges.filter((e) => e.id !== 'edge_software_framework_relates_java_frameworks');
upsertEdge({
  id: 'edge_java_relates_software_frameworks',
  source: JAVA_REF,
  target: SF_REF,
  type: 'related-to',
  label: 'Java 生态的框架与中间件（Spring/MyBatis/Netty/Kafka 等）',
  relationKind: 'reference',
  dimensions: ['java'],
});

// ========== 完整性校验 ==========
const preexisting = new Set();
for (const e of edges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(`tree ${n.id} -> ${n.nodeRef}`); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) {
  if (!pool[e.source] && !preexisting.has(e.source)) problems.push(`edge ${e.id} src ${e.source}`);
  if (!pool[e.target] && !preexisting.has(e.target)) problems.push(`edge ${e.id} tgt ${e.target}`);
}
const s = JSON.stringify({ pool, tree, edges });
if (s.includes('k_java_frameworks') || s.includes(FW_GROUP_TREE_ID)) problems.push('dissolved group still referenced');
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error(`integrity failed: ${problems.length}`); }

// ========== 写回 ==========
const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);

console.log(`move-frameworks-out-of-java complete:
  - 软件符号与工具/软件框架 children: ${sfTree.count}（JavaWeb/Spring/Mybatis/Netty/Kafka/RabbitMQ/Spring Cloud）
  - java children: ${(javaTree.children ?? []).length}
  - 中间组 k_java_frameworks 已解散，总览并入 软件框架 卡片
  - 关联边: java ↔ 软件框架`);
