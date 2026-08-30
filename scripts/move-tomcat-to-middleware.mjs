// Tomcat 迁出软件框架（2026-08-29）
// 用户指出：Tomcat 不是软件框架。卡片内容也证实——它是"开源 J2EE 应用程序服务器，
// 由网页服务器和 Java Servlet 容器组成"，属于 Web 服务器 / 中间件。
// 动作：
//   1. Tomcat 从 软件符号与工具/软件框架 迁到 计算机科学/软件组织/中间件（ACM 本体域）
//   2. 中间件域补一个简短定义卡（原为 0 字）
//   3. 关联边：Tomcat ↔ JavaWeb（Tomcat 是 JavaWeb 应用的 Servlet 容器）
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `move-tomcat-to-middleware-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

const TOMCAT_REF = 'k_1786353277269_msn0ma9ap';
const SF_TREE_ID = 'tree_acm2012_software_notations_tools_software_frameworks';
const MW_REF = 'k_acm2012_software_organization_middleware';
const JAVAWEB_REF = 'k_java_fw_javaweb';
const JAVA_REF = 'k_1782746457581_30q8ao';

function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// 1. 从软件框架摘下 Tomcat，挂到 中间件
let tomcatNode = null, tomcatParent = null;
(function locate(n, parent) {
  for (const c of n.children ?? []) {
    if (c.nodeRef === TOMCAT_REF) { tomcatNode = c; tomcatParent = n; return true; }
    if (locate(c, c)) return true;
  }
  return false;
})(tree, null);
if (!tomcatNode) throw new Error('Tomcat tree node not found');
tomcatParent.children = tomcatParent.children.filter((c) => c !== tomcatNode);
const mwTree = findTreeByRef(tree, MW_REF);
if (!mwTree) throw new Error('中间件 domain not found');
mwTree.children ??= [];
mwTree.children.push(tomcatNode);
mwTree.count = mwTree.children.length;
tomcatParent.count = (tomcatParent.children ?? []).length;
console.log('Tomcat -> 软件组织/中间件');

// 2. 中间件域定义卡（原 0 字）
const mwNode = pool[MW_REF];
mwNode.card ??= { nodeId: MW_REF, title: mwNode.label ?? '中间件', tabs: [] };
if (!mwNode.card.tabs?.length || mwNode.card.tabs.every((t) => !(String(t.content ?? '').trim()))) {
  mwNode.card.tabs = [{
    id: 'def',
    label: '定义',
    content: `中间件（Middleware）是位于操作系统、网络与数据库等系统软件之上、应用软件之下的独立系统软件或服务程序，负责在应用之间透明地传递数据与管理资源，让开发者不必为每类底层细节重复造轮子。

常见形态包括：Web 服务器 / 应用服务器（如 Tomcat、Jetty）、消息中间件（如 Kafka、RabbitMQ）、缓存中间件（如 Redis）、事务处理监控器、RPC/对象请求代理等。

【与相邻概念的关系】
- 框架（如 Spring）：开发时引入的代码级脚手架，随应用一起构建；中间件是独立部署运行的系统软件
- Web 容器（Servlet 容器，如 Tomcat）：负责 Servlet/JSP 生命周期管理的中间件，JavaWeb 应用运行在其上`,
  }];
}

// 3. 关联边：Tomcat 是 JavaWeb 的 Servlet 容器（跨域关联）
edges = edges.filter((e) => !String(e.id ?? '').startsWith('treebind:') || !(e.source === tomcatNode.nodeRef || e.target === tomcatNode.nodeRef));
upsertEdge({ id: `treebind:${mwTree.id}:${tomcatNode.id}`, source: MW_REF, target: TOMCAT_REF, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['middleware'] });
upsertEdge({
  id: 'edge_tomcat_servlet_container_of_javaweb',
  source: TOMCAT_REF,
  target: JAVAWEB_REF,
  type: 'related-to',
  label: 'Tomcat 是运行 JavaWeb 应用的 Servlet 容器 / Web 服务器',
  relationKind: 'dependency',
  dimensions: ['middleware', 'java'],
});

// ========== 校验 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
const tomcatInMw = (mwTree.children ?? []).some((c) => c.nodeRef === TOMCAT_REF);
if (!tomcatInMw) problems.push('Tomcat not under 中间件');
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed: ' + problems.length); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
console.log(`move-tomcat-to-middleware complete:
  - Tomcat → 计算机科学/软件组织/中间件（含 ${mwTree.children.length} 个子节点）
  - 软件框架 children: ${tomcatParent.children.length}
  - 中间件 补充定义卡
  - 关联边: Tomcat ↔ JavaWeb（Servlet 容器）`);
