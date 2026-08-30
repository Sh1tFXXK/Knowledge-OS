// 整合「软件符号与工具 / 软件框架」旧维基结构（2026-08-29）
// 现状：80 个节点 = 24 个有内容（2.4 万字，Wikipedia 式深层结构，内部 3 处内容完全重复）
//        + 56 个 0 字空壳（AOP 术语、Spring Cloud 组件名、注解名等），并有 106 个问题挂在这些节点上
// 原则（与 IO/NIO、vault 导入一致）：Java 生态内容归 java/框架和中间件；软件框架保留为本体概念节点
// 动作：
//   1. <100 字的空壳全部删除（软件框架根除外）
//   2. 内容完全相同的重复节点只保留 DFS 首个
//   3. 有内容的节点按映射移动到 java/框架和中间件 对应组（子树整体移动，改名更明确）
//   4. 被删节点上的问题按关键词重映射到对应新组
//   5. 软件框架 保留定义卡片 + related-to 边指向 java/框架和中间件
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `consolidate-software-frameworks-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'questions.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const questions = JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'));

const FW_ROOT_REF = 'k_acm2012_software_notations_tools_software_frameworks';
function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
const fwRoot = findTreeByRef(tree, FW_ROOT_REF);
if (!fwRoot || !fwRoot.children?.length) throw new Error('软件框架 node not found or has no children');
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

const contentLen = (ref) => (pool[ref]?.card?.tabs ?? []).reduce((s, t) => s + String(t.content || '').length, 0);
const contentHash = (ref) => JSON.stringify([pool[ref]?.label, ...(pool[ref]?.card?.tabs ?? []).map((t) => [t.id, t.label, String(t.content ?? '').replace(/\s+/g, '')])]);

// ========== 1. 把整个子树从主树摘下，构建带父指针与路径的工作副本 ==========
const fwIndex = fwRoot.parent ? null : null; // 根在顶层树里没有 parent 指针，摘除时从其父 children 里过滤
let fwParentNode = null;
(function findParentOf(n, target) { if ((n.children ?? []).some((c) => c.id === fwRoot.id)) { fwParentNode = n; return true; } for (const c of n.children ?? []) if (findParentOf(c, target)) return true; return false; })(tree, fwRoot);
if (!fwParentNode) throw new Error('软件框架 parent not found');
fwParentNode.children = fwParentNode.children.filter((c) => c.id !== fwRoot.id);

const info = new Map(); // tree node -> {parentInfo, path}
const order = [];       // DFS 序
(function attach(n, parentInfo, path) {
  const meta = { parentInfo, path: path.join('/') };
  info.set(n, meta);
  order.push(n);
  for (const c of n.children ?? []) attach(c, n, [...path, c.name]);
})(fwRoot, null, [fwRoot.name]);

const len = new Map(), hash = new Map();
for (const n of order) { len.set(n, contentLen(n.nodeRef)); hash.set(n, contentHash(n.nodeRef)); }

// ========== 2. 分类 ==========
// 2a. 重复内容：保留 DFS 首个
const dupDelete = new Set();
const seenHash = new Map();
for (const n of order) {
  if ((len.get(n) ?? 0) === 0) continue;
  if (seenHash.has(hash.get(n))) dupDelete.add(n);
  else seenHash.set(hash.get(n), n);
}
// 2b. 空壳（<100 字）
const emptyDelete = new Set();
for (const n of order) if (n !== fwRoot && (len.get(n) ?? 0) < 100 && !dupDelete.has(n)) emptyDelete.add(n);
// 2c. 移动映射（相对 软件框架 的路径后缀 → [新父 nodeRef, 新名称]）
const moveMap = [
  ['/Tomcat', 'k_java_fw_javaweb', 'Tomcat'],
  ['/Spring Framework/模块', 'k_java_fw_spring', 'Spring Framework 模块（维基）'],
  ['/Spring Framework/模块/模型–视图–控制器框架', 'k_java_fw_spring_mvc', 'Spring MVC 框架（维基）'],
  ['/Spring Framework/模块/控制反转容器/创建和管理 beans', 'k_java_fw_spring_ioc', '创建和管理 Bean（维基）'],
  ['/Spring Framework/模块/远程访问框架', 'k_java_fw_spring', 'Spring 远程访问框架（维基）'],
  ['/Spring Framework/模块/批处理框架', 'k_java_fw_spring', 'Spring 批处理框架（维基）'],
  ['/Spring Framework/模块/Spring WebSocket', 'k_java_fw_spring', 'Spring WebSocket（维基）'],
  ['/Spring Framework/模块/Spring WebFlux', 'k_java_fw_spring', 'Spring WebFlux（维基）'],
  ['/Spring Framework/模块/约定优于配置的快速应用程序开发/Spring Roo', 'k_java_fw_spring_boot', 'Spring Roo（维基）'],
  ['/Spring Boot', 'k_java_fw_spring_boot', 'Spring Boot（维基）'],
  ['/Spring/Spring的组成', 'k_java_fw_spring', 'Spring 的组成（维基）'],
  ['/Spring/Spring控制反转(IOC)', 'k_java_fw_spring_ioc', '控制反转 IOC（维基）'],
  ['/Spring/Spring Beans/作用域', 'k_java_fw_spring_ioc', 'Spring Bean 作用域（维基）'],
];
const moveTargets = new Map();
for (const [suffix, parentRef, name] of moveMap) {
  const hit = order.find((n) => (info.get(n).path + '/').endsWith(suffix + '/'));
  if (!hit) throw new Error(`move target not found: ${suffix}`);
  moveTargets.set(hit, { parentRef, name });
}
// 2d. 删除集合：dup + 空壳，排除（移动子树内部节点改为随移动走，但内部 dup/空壳仍删）
const inMovedSubtree = new Set();
for (const [n] of moveTargets) {
  (function mark(m) { inMovedSubtree.add(m); for (const c of m.children ?? []) mark(c); })(n);
}
// 移动目标不参与 dup/空壳删除；与目标内容完全相同的另一份树实例改为「仅摘树、保留池」
const leftoverSplice = new Set();
for (const [n] of moveTargets) {
  dupDelete.delete(n);
  emptyDelete.delete(n);
  const first = seenHash.get(hash.get(n));
  if (first && first !== n && !moveTargets.has(first)) {
    // 目标是重复者：首个同内容实例留在了软件框架里，摘掉那份树实例（池条目保留，移动后的节点还在用）
    leftoverSplice.add(first);
    dupDelete.delete(first);
    emptyDelete.delete(first);
  }
}
const toDelete = new Set();
for (const n of dupDelete) if (!inMovedSubtree.has(n)) toDelete.add(n);
for (const n of emptyDelete) if (!inMovedSubtree.has(n)) toDelete.add(n);
const deleteInsideMoved = [...dupDelete, ...emptyDelete].filter((n) => inMovedSubtree.has(n));
console.log(`分类: 移动 ${moveTargets.size} 棵子树 | 移动子树内清理 ${deleteInsideMoved.length} | 删除 ${toDelete.size}`);

// ========== 3. 在摘下的子树内执行内部删除，再摘出移动子树，其余删除 ==========
function spliceFromParent(n) {
  const meta = info.get(n);
  if (meta?.parentInfo) meta.parentInfo.children = (meta.parentInfo.children ?? []).filter((c) => c !== n);
}
const treeSpliced = new Set();
function removeNode(n) { spliceFromParent(n); treeSpliced.add(n.nodeRef); }
// 3a. 先删移动子树内部的 dup/空壳
for (const n of deleteInsideMoved) removeNode(n);
// 3a2. 摘除与移动目标同内容的残留树实例（保留池条目）
for (const n of leftoverSplice) { spliceFromParent(n); treeSpliced.add(n.nodeRef); }
// 3b. 摘出移动子树
const movedOut = [];
for (const [n, mapping] of moveTargets) {
  spliceFromParent(n);
  movedOut.push({ node: n, mapping });
}
// 3c. 删除剩余节点（含空的中间容器）：从摘下的子树里 splice 掉 + 删池条目
const isInsideMoved = (n) => movedOut.some(({ node }) => { let hit = false; (function contains(x) { if (x === n) hit = true; for (const c of x.children ?? []) contains(c); })(node); return hit; });
for (const n of [...order].reverse()) {
  if (n === fwRoot || isInsideMoved(n)) continue;
  if (!toDelete.has(n)) continue;
  removeNode(n);
}

// ========== 4. 把移动子树挂到新父，并把软件框架本体重新挂回原父 ==========
fwParentNode.children ??= [];
fwParentNode.children.push(fwRoot);
fwRoot.count = (fwRoot.children ?? []).length;
for (const { node, mapping } of movedOut) {
  const targetTree = findTreeByRef(tree, mapping.parentRef);
  if (!targetTree) throw new Error(`target tree missing: ${mapping.parentRef}`);
  targetTree.children ??= [];
  targetTree.children.push(node);
  node.name = mapping.name;
  pool[node.nodeRef].label = mapping.name;
  if (pool[node.nodeRef].card) pool[node.nodeRef].card.title = mapping.name;
  edges = edges.filter((e) => !(String(e.id ?? '').startsWith('treebind:') && (e.target === node.nodeRef || e.source === node.nodeRef)));
  upsertEdge({ id: `treebind:${targetTree.id}:${node.id}`, source: targetTree.nodeRef, target: node.nodeRef, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
  console.log(`moved: ${mapping.name} (${len.get(node)} 字) -> ${mapping.parentRef}`);
}

// ========== 5. 池清理：所有摘除完成后，按最终树判定哪些 ref 不再被任何树节点使用 ==========
const survivingRefs = new Set();
(function walk(n) { if (n.nodeRef) survivingRefs.add(n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
const poolDeleted = new Set();
for (const ref of treeSpliced) {
  if (!survivingRefs.has(ref)) { delete pool[ref]; poolDeleted.add(ref); }
}
// ========== 5b. 边清理：引用已删池条目的边全部移除 ==========
edges = edges.filter((e) => {
  if (poolDeleted.has(e.source) || poolDeleted.has(e.target)) {
    if (!String(e.id ?? '').startsWith('treebind:')) console.log('drop semantic edge:', e.id);
    return false;
  }
  return true;
});

// ========== 6. 问题重映射（池条目被删的节点 → 按关键词到新组；共享 ref 的保持原引用） ==========
const pathOf = new Map();
for (const n of order) pathOf.set(n.nodeRef, info.get(n).path);
const remapOf = (path) => {
  if (/AOP|切面|代理|连接点|通知|切入点|织入|面向切面/i.test(path)) return 'k_java_fw_spring_aop';
  if (/Spring Cloud|Zuul|Eureka|Ribbon|Hystrix|Feign|Bus|Gateway|Netﬂix|Netflix|Consul|Sleuth|Conﬁg|Config/i.test(path)) return 'k_java_fw_springcloud';
  if (/@/.test(path)) return 'k_java_fw_spring';
  if (/Bean|注入|依赖|装配|作用域|循环|IOC|控制反转/i.test(path)) return 'k_java_fw_spring_ioc';
  if (/Boot|Roo|约定优于配置|自动配置|JavaConﬁg|JavaConfig/i.test(path)) return 'k_java_fw_spring_boot';
  if (/MVC|Dispatcher|模型–视图–控制器/i.test(path)) return 'k_java_fw_spring_mvc';
  if (/Tomcat/i.test(path)) return 'k_java_fw_javaweb';
  if (/模块|WebSocket|WebFlux|远程访问|批处理/i.test(path)) return 'k_java_fw_spring';
  return 'k_java_fw_spring';
};
let remapped = 0;
for (const q of questions) {
  if (!q.relatedNodeId || !poolDeleted.has(q.relatedNodeId)) continue;
  q.relatedNodeId = remapOf(pathOf.get(q.relatedNodeId) ?? '');
  remapped++;
}

// ========== 7. 软件框架：本体概念节点，补关联边 ==========
// 软件框架 的 def 卡片已有 1306 字定义，保留；只加关联边指向 java/框架和中间件
upsertEdge({
  id: 'edge_software_framework_relates_java_frameworks',
  source: FW_ROOT_REF,
  target: 'k_java_frameworks',
  type: 'related-to',
  label: 'Java 生态框架（Spring/Netty 等）的具体内容见 java/框架和中间件',
  relationKind: 'reference',
  dimensions: ['java'],
});

// ========== 8. 完整性校验（豁免历史遗留悬挂端点） ==========
const preexisting = new Set();
for (const e of edges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(`tree ${n.id} -> ${n.nodeRef}`); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) {
  if (!pool[e.source] && !preexisting.has(e.source)) problems.push(`edge ${e.id} src ${e.source}`);
  if (!pool[e.target] && !preexisting.has(e.target)) problems.push(`edge ${e.id} tgt ${e.target}`);
}
for (const q of questions) if (q.relatedNodeId && !pool[q.relatedNodeId]) problems.push(`question ${q.id} -> ${q.relatedNodeId}`);
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error(`integrity failed: ${problems.length}`); }

// ========== 9. 写回 ==========
const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('questions.json', questions);

console.log(`consolidate-software-frameworks complete:
  - 摘除树实例: ${treeSpliced.size}（其中 ${poolDeleted.size} 个池条目被删，其余为共享 ref 仅摘树）
  - 移动内容节点: ${movedOut.length}（共 ${movedOut.reduce((s, m) => s + (len.get(m.node) ?? 0), 0)} 字）→ java/框架和中间件
  - 问题重映射: ${remapped}
  - 软件框架 保留为本体概念节点（定义 + related-to 关联）`);
