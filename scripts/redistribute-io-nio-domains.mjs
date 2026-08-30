// IO/NIO 知识按本体归属分域重排（2026-08-29）
// 用户要求：不要把所有 IO 知识都堆在 java/常用类库 下，按知识本体拆分三个归属：
//   A. 通用 I/O 原理 → 计算机科学/系统组织/操作系统（IO 模型分类、阻塞非阻塞与同步异步、select 与 epoll、零拷贝）
//      计算机科学/网络/网络编程模型（Reactor 概述/单线程/多线程/主从、Proactor）
//   B. Java 特有的 IO 逻辑 → java/IO 与 NIO 独立主题（Java BIO 编程模型、NIO 实现原理、NIO 核心组件、Java AIO、IO vs NIO 对比）
//   C. 类库 API 用法 → java/常用类库（java.io 字节流/字符流/文件与控制台、java.nio 通道与缓冲区）
// 跨域用知识边关联：Java Selector 基于 select/epoll、Java NIO 实现 Reactor、transferTo 利用零拷贝等。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `redistribute-io-nio-domains-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));

function findByName(node, name) { if (node.name === name) return node; for (const c of node.children ?? []) { const f = findByName(c, name); if (f) return f; } return null; }
function findTreeById(node, id) { if (node.id === id) return node; for (const c of node.children ?? []) { const f = findTreeById(c, id); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// ========== 1. 摘下整个 IO与NIO 子树，按 nodeRef 分拣 ==========
const libTree = findTreeById(tree, 'tree_java_common_libraries');
const ioRootIdx = libTree.children.findIndex((c) => c.id === 'tree_java_io_nio');
if (ioRootIdx < 0) throw new Error('tree_java_io_nio not under 常用类库');
const [ioRoot] = libTree.children.splice(ioRootIdx, 1);

const byRef = {};
(function collect(n) { if (n.nodeRef) byRef[n.nodeRef] = n; for (const c of n.children ?? []) collect(c); })(ioRoot);
// 受影响集合必须在重排前收集（重排后原子树的兄弟分支已不在 ioRoot 下）
const affectedTreeIds = new Set();
const affectedRefs = new Set();
(function collectAffected(n) { affectedTreeIds.add(n.id); if (n.nodeRef) affectedRefs.add(n.nodeRef); for (const c of n.children ?? []) collectAffected(c); })(ioRoot);
affectedTreeIds.add('tree_network_programming_models');
affectedRefs.add('k_network_programming_models');
const removedGroupRefs = new Set(['k_io_principle_group', 'k_reactor_group', 'k_nio_file_group']);
// 记录改动前就缺失的边端点（MySQL 域历史遗留悬挂边），完整性校验时豁免
const preexistingDangling = new Set();
for (const e of edges) {
  for (const end of ['source', 'target']) if (!pool[e[end]]) preexistingDangling.add(e[end]);
}
const need = (ref) => { const n = byRef[ref]; if (!n) throw new Error(`tree node for ${ref} missing`); return n; };

const principleGroup = need('k_io_principle_group');
const reactorGroup = need('k_reactor_group');
const nioFileGroup = need('k_nio_file_group');
const nioImplGroup = need('k_nio_impl_group');

// ========== 2. 内容修订：通用原理与 Java 逻辑分离 ==========
// 2a. Reactor 概述并入原 Reactor 分组的综述
{
  const overview = pool['k_reactor_overview'];
  const groupIntro = (pool['k_reactor_group'].card.tabs[0].content ?? '').trim();
  overview.card.tabs[0].content = groupIntro + '\n\n' + overview.card.tabs[0].content;
}

// 2b. select与epoll：剥离 Java NIO 部分 → OS 节点保留平台对比，Java 代码移到 Selector 原理
{
  const content = String(pool['k_io_select_epoll'].card.tabs[0].content);
  const cut = content.indexOf('## NIO与epoll');
  if (cut < 0) throw new Error('NIO与epoll section not found');
  const osPart = content.slice(0, cut).trimEnd();
  let javaPart = content.slice(cut + '## NIO与epoll'.length).trim();
  // 只保留 Java 代码与结尾说明：平台要点（Linux2.6支持epoll等）由 OS 节点承担
  const codeStart = javaPart.indexOf('以下代码基于 Java 8');
  if (codeStart >= 0) javaPart = javaPart.slice(codeStart);
  const closeIdx = javaPart.indexOf('我们看到create方法');
  const codeOnly = closeIdx >= 0 ? javaPart.slice(0, closeIdx) : javaPart;
  const closing = closeIdx >= 0 ? javaPart.slice(closeIdx) : '';
  const codeBody = codeOnly
    .replace(/^以下代码基于 Java 8。\s*/, '')
    .replace(/```(txt|javascript|java|groovy|cs)\n/g, '')
    .trim();
  pool['k_io_select_epoll'].card.tabs[0].content = osPart + `

## 平台支持与性能对比

- Linux 2.6 之后支持 epoll；Windows 支持 select 而不支持 epoll；不同系统下 NIO 的底层实现不一样（Solaris / Linux / Windows）。
- select 复杂度为 O(N)，有最大 fd 限制（默认 1024，可修改 sys/select.h 调整）。
- epoll 为事件模型，无 fd 数量限制，复杂度 O(1)，不需要遍历 fd。`;
  const selector = pool['k_nio_selector_principle'];
  selector.card.tabs[0].content = String(selector.card.tabs[0].content).trimEnd() + `

## Java Selector 的平台实现（NIO 与 epoll 的关系）

不同操作系统下 Java NIO Selector 的底层实现不一样。Selector.open() 通过 SelectorProvider 创建选择器，不同平台返回不同的 Provider（以下代码基于 Java 8）：

\`\`\`java
${codeBody}
\`\`\`

${closing.trim() || 'create() 方法通过区分操作系统返回不同的 Provider。'}即 Java NIO 的 Selector 在 Linux 上正是基于 epoll 实现的。`;
}

// 2c. AIO：通用动机段并入 OS 的 IO模型分类，Java NIO.2 部分留在 Java 主题
{
  const content = String(pool['k_io_aio_model'].card.tabs[0].content);
  // '\n## AIO\n' 精确匹配正文 "## AIO" 标题（避免误匹配开头的 "## AIO 的动机"）
  const mainStart = content.indexOf('\n## AIO\n');
  if (mainStart < 0) throw new Error('AIO main section not found');
  const motivation = content.slice(0, mainStart).replace(/^## AIO 的动机\s*/, '').trim();
  pool['k_io_model_classification'].card.tabs[0].content = String(pool['k_io_model_classification'].card.tabs[0].content).trimEnd() + `

【异步 I/O 的动机】
` + motivation + `\n\n以上参考自：《UNIX 网络编程》、Doug Lea《Scalable IO in Java》。`;
  pool['k_io_aio_model'].card.tabs[0].content = content.slice(mainStart + 1).replace(/^## AIO\s*/, '## Java AIO（NIO.2 异步通道）\n\n');
}

// 2d. Java 主题根节点总览改写（说明三域归属）
pool['k_java_io_nio'].card.tabs[0].content = `Java IO（Input/Output）是 Java 处理输入输出的体系，经历 BIO → NIO → AIO 三代模型。本主题整理 Java 特有的 IO 逻辑与架构设计；通用原理归属于操作系统/计算机网络领域，类库 API 用法归属于常用类库，各自通过知识边与本主题关联。

【本主题：Java 特有的 IO 逻辑】
- Java BIO 编程模型：accept 阻塞循环 + 一连接一线程，多线程的本质与线程代价
- NIO 实现原理：事件驱动思想，Reactor 在 Java 中的落点（有效的请求对应一个线程）
- NIO 核心组件：Channel / Buffer / Selector 三大组件的架构与协作逻辑
- Java AIO（NIO.2）：Asynchronous* 异步通道与 CompletionHandler / Future 两种回调方式
- IO vs NIO 对比与选型

【通用 I/O 原理 → 操作系统 / 计算机网络域】
- 五种 I/O 模型（阻塞/非阻塞/多路复用/信号驱动/异步）、阻塞非阻塞与同步异步、select 与 epoll、零拷贝 → 操作系统
- Reactor / Proactor 事件处理模式 → 计算机网络
- 关联边：Java Selector 基于 select/epoll 实现、Java NIO 实现 Reactor 模式、FileChannel.transferTo 利用零拷贝、BIO/AIO 对应阻塞/异步 I/O 模型

【API 用法 → java / 常用类库】
- java.io：字节流、字符流、文件与控制台
- java.nio：FileChannel / SocketChannel / ServerSocketChannel / ByteBuffer / Selector / Path / Files

【IO 模型演进（Java 视角）】
BIO（阻塞 IO，java.io 流 + 阻塞 Socket）→ NIO（同步非阻塞 + IO 多路复用，java.nio）→ AIO（异步 IO，NIO.2）`;

// 2e. 重新命名/标注：Java 主题节点、类库分组、OS/网络域节点
const rename = (ref, label, treeName, dimensions, extraTags) => {
  const node = pool[ref];
  node.label = label;
  if (node.card) node.card.title = label;
  if (dimensions) node.dimensions = dimensions;
  if (extraTags) node.tags = [...new Set([...(node.tags ?? []), ...extraTags])];
  const t = byRef[ref];
  if (t && treeName) t.name = treeName;
};
rename('k_io_bio_model', 'Java BIO（阻塞式IO）编程模型', 'Java BIO 编程模型', ['java'], ['BIO']);
rename('k_io_aio_model', 'Java AIO（NIO.2 异步通道）', 'Java AIO（NIO.2）', ['java'], ['AIO', 'NIO.2']);
pool['k_io_bio_model'].card.tabs[0].content = String(pool['k_io_bio_model'].card.tabs[0].content).replace(/^## 传统 BIO 模型/, '## Java 中的 BIO（阻塞式 I/O）');
rename('k_byte_stream_group', 'java.io 字节流（Byte Streams）', 'java.io 字节流');
rename('k_char_stream_group', 'java.io 字符流（Character Streams）', 'java.io 字符流');
rename('k_file_console_group', 'java.io 文件与控制台', 'java.io 文件与控制台');
rename('k_nio_impl_group', 'java.nio 通道与缓冲区', 'java.nio 通道与缓冲区');
rename('k_java_io_nio', 'Java IO 与 NIO', 'IO 与 NIO');

// OS / 网络域节点的 dimensions 与 tags
for (const ref of ['k_io_model_classification', 'k_io_blocking_concepts', 'k_io_select_epoll', 'k_io_zero_copy']) {
  pool[ref].dimensions = ['os'];
  pool[ref].tags = [...new Set([...(pool[ref].tags ?? []), '操作系统', 'IO模型', 'UNIX网络编程'])];
}
for (const ref of ['k_reactor_overview', 'k_reactor_single_thread', 'k_reactor_multi_thread', 'k_reactor_master_slave', 'k_proactor_mode']) {
  pool[ref].dimensions = ['network'];
  pool[ref].tags = [...new Set([...(pool[ref].tags ?? []), '计算机网络', 'Reactor', 'Proactor', '事件驱动'])];
}

// 2f. 新建「网络编程模型」分组节点
pool['k_network_programming_models'] = {
  id: 'k_network_programming_models',
  label: '网络编程模型（Reactor 与 Proactor）',
  role: 'group',
  dimensions: ['network'],
  tags: ['计算机网络', '网络编程', 'Reactor', 'Proactor', 'IO模型', '事件驱动'],
  card: {
    nodeId: 'k_network_programming_models',
    title: '网络编程模型（Reactor 与 Proactor）',
    tabs: [{ id: 'def', label: '定义', content: `高性能网络服务器处理并发连接的两种事件处理模式，均基于 I/O 事件多路分离器（Event Demultiplexer）。

- Reactor 模式：采用同步 I/O，事件分离器等待描述符就绪后通知处理器，由处理器完成实际读写（对应操作系统中的 I/O 多路复用 select/poll/epoll）。
- Proactor 模式：采用异步 I/O，处理器发起异步读写，I/O 由操作系统完成，分离器捕获完成事件后通知处理器。

子主题：
- Reactor 模式概述：两种模式的原理、角色与读流程对比
- Reactor 单线程模型 / 多线程模型 / 主从多线程模型：三种典型实现的结构与代码
- Proactor 模式：异步 I/O 的完成事件处理流程` }],
  },
};

// 2g. 删除被拆散的旧分组节点
for (const ref of ['k_io_principle_group', 'k_reactor_group', 'k_nio_file_group']) delete pool[ref];

// ========== 3. 重组目录树 ==========
// 3a. 操作系统：直接挂 4 个通用原理节点（该域为扁平概念结构）
const osDomain = findByName(tree, '操作系统');
if (!osDomain) throw new Error('操作系统 domain not found');
osDomain.children ??= [];
for (const ref of ['k_io_model_classification', 'k_io_blocking_concepts', 'k_io_select_epoll', 'k_io_zero_copy']) {
  const t = need(ref);
  osDomain.children.push(t);
}

// 3b. 网络：新建「网络编程模型」分组，挂 Reactor/Proactor 五个节点
const netDomain = findTreeById(tree, 'tree_acm2012_networks');
if (!netDomain) throw new Error('网络 domain not found');
netDomain.children ??= [];
netDomain.children.push({
  id: 'tree_network_programming_models',
  name: '网络编程模型',
  count: 5,
  nodeRef: 'k_network_programming_models',
  children: [
    need('k_reactor_overview'),
    need('k_reactor_single_thread'),
    need('k_reactor_multi_thread'),
    need('k_reactor_master_slave'),
    need('k_proactor_mode'),
  ],
});

// 3c. java：IO 与 NIO 独立主题（保留 NIO 实现原理、NIO 核心组件；BIO/AIO 归入 Java 主题）
const javaTree = findTreeById(tree, 'tree_1782746457614_osttpr');
if (!javaTree) throw new Error('java tree node not found');
javaTree.children ??= [];
ioRoot.name = 'IO 与 NIO';
ioRoot.children = [
  need('k_io_bio_model'),
  need('k_io_nio_principle'),
  need('k_nio_core_group'),
  need('k_io_aio_model'),
  need('k_io_nio_comparison'),
];
ioRoot.count = ioRoot.children.length;
javaTree.children.push(ioRoot);

// 3d. 常用类库：java.io 三个分组 + java.nio 分组（吸收原 NIO文件操作 组的 Path/Files 节点）
nioImplGroup.children ??= [];
for (const child of nioFileGroup.children ?? []) nioImplGroup.children.push(child);
libTree.children.push(
  need('k_byte_stream_group'),
  need('k_char_stream_group'),
  need('k_file_console_group'),
  nioImplGroup,
);
libTree.count = libTree.children.length;

// 3e. 维护受影响父节点的 count（原本有数值的才更新，避免给从未展示 count 的域凭空加数）
const refreshCount = (t) => { if (t && typeof t.count === 'number' && t.count > 0) t.count = (t.children ?? []).length; };
refreshCount(osDomain);
refreshCount(netDomain);

// ========== 4. 重建知识边 ==========
// 4a. 删除指向旧结构的 treebind 边与已删分组的语义边
const beforeCount = edges.length;
edges = edges.filter((e) => {
  if (String(e.id ?? '').startsWith('treebind:')) {
    const segs = String(e.id).split(':').slice(1);
    if (segs.some((s) => affectedTreeIds.has(s))) return false;
    if (affectedRefs.has(e.source) || affectedRefs.has(e.target)) return false;
    return true;
  }
  if (removedGroupRefs.has(e.source) || removedGroupRefs.has(e.target)) {
    console.log('drop edge of removed group:', e.id, e.type, e.source, '->', e.target);
    return false;
  }
  return true;
});

// 4c. 按新树重新生成受影响子树的 treebind 边（含跨域挂载点；dimensions 按挂载父域判断）
const domainOfParent = (parentNode) => {
  if (parentNode.id === 'tree_network_programming_models' || parentNode.id === 'tree_acm2012_networks') return ['network'];
  if (parentNode.id === 'theory_domain_operating_systems') return ['os'];
  return ['java'];
};
function regenerateBinds(parent) {
  for (const child of parent.children ?? []) {
    if (child.nodeRef && affectedRefs.has(child.nodeRef)) {
      upsertEdge({
        id: `treebind:${parent.id}:${child.id}`,
        source: parent.nodeRef,
        target: child.nodeRef,
        type: 'belongs-to',
        label: 'contains',
        relationKind: 'structure',
        dimensions: domainOfParent(parent),
      });
    }
    regenerateBinds(child);
  }
}
regenerateBinds(tree);

// 4d. 新增跨域语义关联边
const semanticEdges = [
  { id: 'edge_java_selector_implements_epoll', source: 'k_nio_selector_principle', target: 'k_io_select_epoll', type: 'implements', label: 'Java Selector 基于 select/epoll 实现', relationKind: 'dependency', dimensions: ['java', 'os'] },
  { id: 'edge_java_nio_implements_reactor', source: 'k_nio_overview', target: 'k_reactor_overview', type: 'implements', label: 'Java NIO 实现 Reactor 模式', relationKind: 'dependency', dimensions: ['java', 'network'] },
  { id: 'edge_java_filechannel_uses_zero_copy', source: 'k_nio_file_channel', target: 'k_io_zero_copy', type: 'uses', label: 'transferTo/transferFrom 利用零拷贝', relationKind: 'dependency', dimensions: ['java', 'os'] },
  { id: 'edge_java_bio_instanceof_blocking', source: 'k_io_bio_model', target: 'k_io_model_classification', type: 'instance-of', label: 'BIO 是阻塞 I/O 模型在 Java 的编程形态', relationKind: 'dependency', dimensions: ['java', 'os'] },
  { id: 'edge_java_aio_instanceof_async', source: 'k_io_aio_model', target: 'k_io_model_classification', type: 'instance-of', label: 'Java AIO 对应异步 I/O 模型', relationKind: 'dependency', dimensions: ['java', 'os'] },
  { id: 'edge_reactor_depends_multiplexing', source: 'k_reactor_overview', target: 'k_io_select_epoll', type: 'depends-on', label: 'Reactor 依赖 I/O 多路复用', relationKind: 'dependency', dimensions: ['network', 'os'] },
  { id: 'edge_java_io_uses_javaio_lib', source: 'k_java_io_nio', target: 'k_byte_stream_group', type: 'uses', label: '传统 IO 由 java.io 类库提供', relationKind: 'dependency', dimensions: ['java'] },
  { id: 'edge_java_nio_uses_javanio_lib', source: 'k_java_io_nio', target: 'k_nio_impl_group', type: 'uses', label: 'NIO 由 java.nio 类库提供', relationKind: 'dependency', dimensions: ['java'] },
];
for (const e of semanticEdges) upsertEdge(e);

// ========== 5. 完整性校验（豁免改动前已存在的 MySQL 域历史悬挂端点） ==========
const problems = [];
(function walk(n) {
  if (n.nodeRef && !pool[n.nodeRef]) problems.push(`tree ${n.id} refs missing pool ${n.nodeRef}`);
  for (const c of n.children ?? []) walk(c);
})(tree);
const poolIds = new Set(Object.keys(pool));
for (const e of edges) {
  if (!poolIds.has(e.source) && !preexistingDangling.has(e.source)) problems.push(`edge ${e.id} source missing: ${e.source}`);
  if (!poolIds.has(e.target) && !preexistingDangling.has(e.target)) problems.push(`edge ${e.id} target missing: ${e.target}`);
}
for (const q of JSON.parse(readFileSync(join(DATA, 'questions.json'), 'utf8'))) {
  if (q.relatedNodeId && !poolIds.has(q.relatedNodeId)) problems.push(`question ${q.id} refs missing ${q.relatedNodeId}`);
}
// treebind 必须覆盖新结构
for (const [pid, cid] of [['theory_domain_operating_systems', byRef['k_io_model_classification'].id], ['tree_acm2012_networks', 'tree_network_programming_models'], ['tree_1782746457614_osttpr', 'tree_java_io_nio'], ['tree_java_common_libraries', byRef['k_byte_stream_group'].id]]) {
  if (!edges.some((e) => e.id === `treebind:${pid}:${cid}`)) problems.push(`missing treebind ${pid}:${cid}`);
}
if (problems.length) {
  problems.slice(0, 30).forEach((p) => console.error('PROBLEM:', p));
  throw new Error(`integrity check failed: ${problems.length} problem(s)`);
}

// ========== 6. 写回 ==========
const atomicWrite = (file, obj) => {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
};
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);

console.log(`redistribute-io-nio-domains complete:
  - 操作系统 += 4 原理节点（IO模型分类/阻塞非阻塞与同步异步/select与epoll/零拷贝）
  - 网络 += 网络编程模型分组（Reactor 概述/单线程/多线程/主从、Proactor）
  - java/IO 与 NIO 独立主题：BIO 编程模型、NIO实现原理、NIO核心组件、Java AIO、IO vs NIO 对比
  - 常用类库 += java.io 字节流/字符流/文件与控制台 + java.nio 通道与缓冲区（含 Path/Files）
  - 删除旧分组节点: k_io_principle_group, k_reactor_group, k_nio_file_group
  - edges: ${beforeCount} -> ${edges.length}（重建 treebind + ${semanticEdges.length} 条跨域关联）`);
