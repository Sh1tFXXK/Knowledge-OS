// 恢复并按原则合并 IO 整理时误删的独特内容（2026-08-29）
// 背景：IO 整理时的审计口径漏了 rootContent，被删节点中「IO 流体系」(3971字)、「IO流」(625字) 的
//       rootContent 是独有内容（IO 流概念与三种分类详解 + 4 张图），未并入任何现存节点；
//       「通道例子」tab (3524字) 是 util.concurrent 执行器旧笔记，属于并发域；「NIO文件操作」组卡 (440字) 概览丢失。
// 原则映射：
//   - IO 流的分类与体系（Java IO 逻辑）→ java/IO 与 NIO 主题下新节点「IO 流的分类与框架体系」
//   - util.concurrent 执行器旧笔记（并发）→ java/java并发编程/Executor框架 下的子节点
//   - NIO文件操作组卡概览（java.nio.file）→ java.nio 通道与缓冲区 组卡追加章节
//   - k_io_principle_group 组卡为纯目录（289字，指向的子主题现分属 OS/java 域），不恢复
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join, basename } from 'path';

const DATA = 'data';
const BACKUP_POOL = 'data/backups/restructure-java-io-nio-final-2026-08-28T14-55-11-102Z/node-pool.json';
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `recover-deleted-io-content-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of ['node-pool.json', 'tree-data.json', 'knowledge-edges.json']) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
let edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const bPool = JSON.parse(readFileSync(BACKUP_POOL, 'utf8'));

function findTreeByRef(node, ref) { if (node.nodeRef === ref) return node; for (const c of node.children ?? []) { const f = findTreeByRef(c, ref); if (f) return f; } return null; }
const upsertEdge = (edge) => { const i = edges.findIndex((e) => e.id === edge.id); if (i >= 0) edges[i] = edge; else edges.push(edge); };

// 图片转写（人工查看后整理）
const imgText = {
  '12668a23a9f962f31fa1dd635b0ae724086d5d2f671f962532076e65a5293d8b.jpg':
    '【图解：IO 流把不同数据源抽象统一】四组示意：文件、网络、内存、另一个程序等不同数据源，各自通过「Java IO 相关类库」与程序之间双向传输字节（011000110）——无论数据来自哪里，Java IO 类库都把它抽象成同样的流来操作。',
  '1e40cec86c888c6fdbb3d24aaf9b0e2a070d46abaf7f6ba8358f6d427f210c94.jpg':
    '【图解：输入流与输出流的方向】上行：数据源 →（流）→ 程序，即输入流（数据从数据源流向程序）；下行：程序 →（流）→ 数据源，即输出流（数据从程序写向数据源）。',
  '2961c8aa887534adcce0d0ccbc676cc140c4c83a801d0ba7003513ad5d23caf6.jpg':
    '【图解：Java IO 按操作方式分类结构图】以 Java IO 为中心分四大分支：Reader-字符读取（节点流：FileReader、PipedReader、CharArrayReader；处理流：BufferedReader、InputStreamReader）；Writer-字符写出（节点流：FileWriter、PipedWriter、CharArrayWriter；处理流：BufferedWriter、OutputStreamWriter、PrintWriter）；InputStream-字节读取（节点流：FileInputStream、PipedInputStream、ByteArrayInputStream；处理流：BufferedInputStream、DataInputStream、ObjectInputStream、SequenceInputStream）；OutputStream-字节写出（节点流：FileOutputStream、PipedOutputStream、ByteArrayOutputStream；处理流：BufferedOutputStream、DataOutputStream、ObjectOutputStream、PrintStream）。',
  '3a5786375625bb8bdf8fc773ea892321ea1be5eb748416902f99333648730866.jpg':
    '【图解：Java IO 按操作对象分类结构图】节点流：文件操作（FileInputStream/FileOutputStream/FileReader/FileWriter）、管道操作（PipedInputStream/PipedOutputStream/PipedReader/PipedWriter）、数组操作（ByteArrayInputStream/ByteArrayOutputStream/CharArrayReader/CharArrayWriter）；处理流：缓冲操作（BufferedInputStream/BufferedOutputStream/BufferedReader/BufferedWriter）、基本数据类型操作（DataInputStream/DataOutputStream）、对象序列化操作（ObjectInputStream/ObjectOutputStream）、转化控制（InputStreamReader/OutputStreamWriter）、打印控制（PrintStream/PrintWriter）。',
};
const replaceImages = (text) => String(text).replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_m, url) => imgText[basename(url)] ?? '');

// ========== 1. IO 流的分类与框架体系 → java/IO 与 NIO ==========
const summary = String(bPool['k_1786348437198_hkf3yz'].card.rootContent || '');
const detail = String(bPool['k_1786353277269_msn0ma8o3'].card.rootContent || '').replace(/^#\s*[^\n]*\n+/, '');
const NEW_ID = 'k_java_io_stream_classification';
pool[NEW_ID] = {
  id: NEW_ID,
  label: 'IO 流的分类与框架体系',
  role: 'concept',
  dimensions: ['java'],
  tags: ['java', 'IO', '流', 'java.io', '输入流', '输出流', '节点流', '处理流'],
  card: {
    nodeId: NEW_ID,
    title: 'IO 流的分类与框架体系',
    tabs: [{ id: 'def', label: '定义', content: `
## IO 流的分类（摘要）

${replaceImages(summary).trim()}

## IO 流的概念与详解

${replaceImages(detail).trim()}` }],
  },
};
const ioNioTree = findTreeByRef(tree, 'k_java_io_nio');
ioNioTree.children ??= [];
ioNioTree.children.push({ id: 'tree_java_io_stream_classification', name: 'IO 流的分类与框架体系', count: 0, nodeRef: NEW_ID, children: [] });
upsertEdge({ id: `treebind:${ioNioTree.id}:tree_java_io_stream_classification`, source: 'k_java_io_nio', target: NEW_ID, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
console.log('created: IO 流的分类与框架体系 (java/IO 与 NIO)');

// ========== 2. util.concurrent 执行器旧笔记 → java并发编程/Executor框架 ==========
const oldExec = String(bPool['k_1786353277269_msn0ma8s7'].card.tabs.find((t) => t.id === 'jimi-62')?.content || '').trim();
if (!oldExec) throw new Error('通道例子 content not found');
const EXEC_ID = 'k_java_concurrent_util_executor_notes';
pool[EXEC_ID] = {
  id: EXEC_ID,
  label: 'util.concurrent 执行器（旧笔记）',
  role: 'reference',
  dimensions: ['java'],
  tags: ['java', '并发', 'Executor', '线程池', 'util.concurrent'],
  card: {
    nodeId: EXEC_ID,
    title: 'util.concurrent 执行器（旧笔记）',
    tabs: [{ id: 'def', label: '定义', content: `Doug Lea util.concurrent 工具包中执行器（Executor）与线程池的早期笔记（原文为 OCR 稿，供参考；现役内容见 java.util.concurrent 包的 Executor 框架与线程池详解）。\n\n${oldExec}` }],
  },
};
const execTree = findTreeByRef(tree, 'k_1785898835766_erx4pw');
execTree.children ??= [];
execTree.children.push({ id: 'tree_java_concurrent_util_executor_notes', name: 'util.concurrent 执行器（旧笔记）', count: 0, nodeRef: EXEC_ID, children: [] });
upsertEdge({ id: `treebind:${execTree.id}:tree_java_concurrent_util_executor_notes`, source: execTree.nodeRef, target: EXEC_ID, type: 'belongs-to', label: 'contains', relationKind: 'structure', dimensions: ['java'] });
console.log('created: util.concurrent 执行器（旧笔记） (Executor框架 子节点)');

// ========== 3. NIO文件操作组卡概览 → java.nio 通道与缓冲区 组卡追加 ==========
const nioFileOverview = JSON.parse(readFileSync('data/backups/redistribute-io-nio-domains-2026-08-28T16-25-38-247Z/node-pool.json', 'utf8'))['k_nio_file_group'].card.tabs[0].content.trim();
const nioImpl = pool['k_nio_impl_group'];
const nioTab = nioImpl.card.tabs[0];
if (!String(nioTab.content).includes('java.nio.file 文件操作概览')) {
  nioTab.content = String(nioTab.content).trimEnd() + `\n\n【java.nio.file 文件操作概览】\n${nioFileOverview.replace(/^子主题：[\s\S]*$/m, '').trim()}`;
  console.log('appended: NIO文件操作概览 → java.nio 通道与缓冲区 组卡');
}

// ========== 校验与写回 ==========
const preexisting = new Set();
const preEdges = JSON.parse(readFileSync(join(backupDir, 'knowledge-edges.json'), 'utf8'));
for (const e of preEdges) for (const end of ['source', 'target']) if (!pool[e[end]]) preexisting.add(e[end]);
const problems = [];
(function walk(n) { if (n.nodeRef && !pool[n.nodeRef]) problems.push(n.id + '->' + n.nodeRef); for (const c of n.children ?? []) walk(c); })(tree);
for (const e of edges) { if (!pool[e.source] && !preexisting.has(e.source)) problems.push('edge src ' + e.id); if (!pool[e.target] && !preexisting.has(e.target)) problems.push('edge tgt ' + e.id); }
for (const created of [NEW_ID, EXEC_ID]) {
  if (!findTreeByRef(tree, created)) problems.push('created not in tree: ' + created);
  for (const t of (pool[created].card?.tabs ?? [])) if (/\!\[\[|cdn-mineru/.test(String(t.content))) problems.push('raw image left in ' + created);
}
if (problems.length) { problems.slice(0, 20).forEach((p) => console.error('PROBLEM:', p)); throw new Error('integrity failed: ' + problems.length); }

const atomicWrite = (file, obj) => { const tmp = join(DATA, `${file}.tmp-${process.pid}`); writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8'); renameSync(tmp, join(DATA, file)); };
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
console.log('recover-deleted-io-content complete');
