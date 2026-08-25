import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileAtomically } from './import/web-link-importer.mjs';
import {
  QUESTION_SOURCE_KIND,
  normalizeQuestionDraft,
} from './import/import-standard.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 《Java面试突击核心讲》MinerU 四分段，顺序 A->B->C->D（已验证首尾衔接）
const FILES = [
  'C:/Users/Administrator/Downloads/MinerU_markdown_1685页_Java面试突击核心讲_2086850364424884224.md',
  'C:/Users/Administrator/Downloads/MinerU_markdown_1685页_Java面试突击核心讲_2086853560606167040.md',
  'C:/Users/Administrator/Downloads/MinerU_markdown_1685页_Java面试突击核心讲_2086853617829056512.md',
  'C:/Users/Administrator/Downloads/MinerU_markdown_1685页_Java面试突击核心讲_2086854036970049536.md',
];

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const QUESTION_RE = /(吗|么|什么|如何|怎么|怎样|为什么|为何|区别|对比|讲讲|讲一讲|说一下|说说|谈谈|聊聊|介绍|是否|能否|有没有|哪些|哪几种|多少|优缺点|优点|缺点|好处|特性|作用|意义|目的)/;
const EXTRA_Q_RE = /(并发和并行|并行和并发)/;
const JUNK_LINE_RE = /^\[Unreadable\]$/;
const ANSWER_CAP = 12000;
const QUESTION_SOURCE = Object.freeze({
  kind: QUESTION_SOURCE_KIND.Document,
  sourceId: 'java-interview-core-notes',
  sourceTitle: 'Java 面试突击核心笔记',
});

const ts = Date.now();
let randCounter = 0;
function rand() { randCounter += 1; return (ts + randCounter).toString(36) + randCounter.toString(36); }
const newNodeId = () => `k_${ts}_${rand()}`;
const newTreeId = () => `tree_${ts}_${rand()}`;
const newQuestionId = () => `q_${ts}_${rand()}`;

const normalizeText = (s) => String(s || '').replace(/[\s？?，,。.、：:；;（）()【】"“”'’‘！!\-—*]/g, '').toLowerCase();
const cleanQuestionText = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const isQuestionTitle = (t) => QUESTION_RE.test(t) || EXTRA_Q_RE.test(t) || /[？?]/.test(t);

function filterJunk(lines) { return lines.filter((l) => !JUNK_LINE_RE.test(l.trim())); }
function demoteHeadings(lines, levels) {
  if (!levels) return lines;
  return lines.map((l) => {
    const m = l.match(/^(#{1,6})\s/);
    if (!m) return l;
    return l.replace(/^#{1,6}/, '#'.repeat(Math.min(6, m[1].length + levels)));
  });
}
function collapseBlanks(lines) {
  const out = []; let blank = 0;
  for (const l of lines) {
    if (l.trim() === '') { blank += 1; if (blank > 1) continue; } else blank = 0;
    out.push(l);
  }
  return out;
}
function trimTrailingHeadings(lines) {
  const out = [...lines];
  while (out.length) {
    const last = out[out.length - 1];
    if (last.trim() === '' || HEADING_RE.test(last)) { out.pop(); continue; }
    break;
  }
  return out;
}
function buildContent(lines, demote = 0) {
  return trimTrailingHeadings(collapseBlanks(demoteHeadings(filterJunk(lines), demote)))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------- 读入四个文件为全局行流 ----------
const fileLines = []; const fileBase = []; let total = 0;
for (const f of FILES) {
  const lines = (await fs.readFile(f, 'utf8')).split('\n');
  fileBase.push(total); fileLines.push(lines); total += lines.length;
}
const L = []; for (const ls of fileLines) for (const l of ls) L.push(l);
const G = (f, line) => fileBase[f] + line;

// ---------- 目录树引用解析 ----------
const treePath = path.join(PROJECT_ROOT, 'data', 'tree-data.json');
const tree = JSON.parse(await fs.readFile(treePath, 'utf8'));
const treeById = new Map(); const treeByName = new Map();
(function walk(n) {
  if (n.id) treeById.set(n.id, n);
  if (n.name && !treeByName.has(n.name)) treeByName.set(n.name, n);
  for (const c of n.children || []) walk(c);
})(tree);
const refByTreeId = (tid) => { const n = treeById.get(tid); if (!n) throw new Error(`tree not found: ${tid}`); return n.nodeRef; };
const refByName = (name) => { const n = treeByName.get(name); if (!n) throw new Error(`tree not found by name: ${name}`); return n.nodeRef; };

// ---------- 新建节点规划 ----------
const NEW_NODES = {
  ioNio: { name: 'IO 与 NIO', parentTreeId: 'tree_1782746457614_osttpr' },
  ioSystem: { name: 'IO 流体系', parent: 'ioNio' },
  nio: { name: 'NIO 原理与 IO 模型', parent: 'ioNio' },
  nioChannel: { name: 'NIO Channel 教程', parent: 'ioNio' },
  hashmap: { name: 'HashMap', parentTreeId: 'tree_1785502582136_4a2y07' },
  syncQueue: { name: 'SynchronousQueue', parentTreeId: 'tree_1785464306318_o8ym0y' },
  annotation: { name: '注解', parentTreeId: 'tree_1783867183132_g5tf12' },
  innerClass: { name: '内部类', parentTreeId: 'tree_1784043760890_bptgal' },
  exception: { name: '异常体系', parentTreeId: 'tree_1783867183132_g5tf12' },
  copyNode: { name: '对象复制（深拷贝/浅拷贝）', parentTreeId: 'tree_1786338278239_rfh8os' },
  java8: { name: 'Java 8 新特性', parentTreeId: 'tree_1784337508360_i5nch6' },
  java9: { name: 'Java 9 新特性', parentTreeId: 'tree_1784337508360_i5nch6' },
  tomcat: { name: 'Tomcat', parentTreeId: 'tree_acm2012_software_notations_tools_software_frameworks' },
  objCreate: { name: '对象创建与内存分配', parentTreeId: 'tree_1782749694516_2ntoss' },
  memOverflow: { name: '内存溢出', parentTreeId: 'tree_1782749694516_2ntoss' },
  highConcurrency: { name: '高并发架构', parentTreeId: 'tree_1786096444971_lwc3wc' },
  ipc: { name: '进程间通信', parentTreeId: 'tree_1784367220424_14rpaj' },
  contextSwitch: { name: '上下文切换', parentTreeId: 'tree_1784367220424_14rpaj' },
  deadlock: { name: '死锁', parentTreeId: 'tree_1782846767208_uw6zxc' },
  cas: { name: 'CAS', parentTreeId: 'tree_1784367853517_ql6yr7' },
};

const EXISTING = {
  chm: 'k_1785293964275_zoa3gk',
  collectionsFW: 'k_1785664228019_k7eq57',
  customLoader: 'k_1782813014267_u5zv9z',
  oop: 'k_1786338277733_gu5z4j',
  reflect: 'k_1786289209529_37qs8h',
  generics: () => refByTreeId('tree_1783873515748_edsjp0'),
  gcCollectors: 'k_1783164003442_wm9ajj',
  gcMech: 'k_1783164061982_dy3jas',
  tuning: 'k_jvm_tuning',
  runtimeData: 'k_1782794616728_i5obct',
  jvmRoot: 'k_1782749694486_vyrfzy',
  classLoadMech: 'k_1782820185793_jpet7h',
  classLoader: 'k_1782812528662_wzvpbe',
  directMem: 'k_1783155226069_2ffro6',
  jit: 'k_jvm_jit',
  constantPool: 'k_1782809424650_c6xo8d',
  softRef: 'k_atom_soft_ref',
  metaspace: 'k_jvm_meta_perm',
  fullGC: 'k_1783171669928_46ncd4',
  cms: () => refByTreeId('tree_jvm_cms'),
  threadPool: 'k_1786093143886_qda5cu',
  futures: 'k_1784367922268_fvpmaj',
  threadState: 'k_1785934396536_as412a',
  threadObj: 'k_1784367244619_s01xtn',
  volatileF: 'k_1784367662855_y91xdh',
  jmm: 'k_1784367508652_7bajap',
  blockingQueue: 'k_1785464306149_hjc89n',
  aqs: 'k_1782846826286_ekdql8',
  daemon: 'k_1785943693747_clmf9f',
  lock: 'k_1782928696595_fflhq1',
  lockUpgrade: 'k_1785840586940_eqi4sb',
  atomics: () => refByTreeId('tree_1786087143251_vxl94d'),
  atomicLock: 'k_1784367853474_o8r7o6',
  processThread: 'k_1784367220387_2v9vdv',
  bytecode: 'k_1782809150059_ibx5gd',
};

// ---------- 文章锚点（f: 文件序号, line: 0 基行号；end 为可选显式结束） ----------
const ARTICLES = [
  { f: 0, line: 2274, key: 'ioSystem', tab: 'IO 流框架体系', alsoQuestion: true },
  { f: 0, line: 2422, key: 'nio', tab: 'NIO 原理与 IO 模型', alsoQuestion: true },
  { f: 0, line: 3327, key: 'nioChannel', tab: 'FileChannel/SocketChannel/ServerSocketChannel', end: [0, 3579] },
  { f: 0, line: 3686, key: 'syncQueue', tab: '实现原理' },
  { f: 0, line: 3838, key: 'customLoader', tab: '自定义类加载器实战' },
  { f: 0, line: 4033, key: 'oop', tab: '面向对象基础', end: [0, 4255] },
  { f: 0, line: 4569, key: 'collectionsFW', tab: '接口继承关系与实现' },
  { f: 0, line: 4794, key: 'hashmap', tab: '红黑树详解', end: [0, 5502] },
  { f: 0, line: 5502, key: 'exception', tab: '异常分类与处理方式', end: [0, 5563] },
  { f: 0, line: 5563, key: 'reflect', tab: 'JAVA 反射' },
  { f: 0, line: 5677, key: 'annotation', tab: 'JAVA 注解' },
  { f: 0, line: 5767, key: 'innerClass', tab: 'JAVA 内部类' },
  { f: 0, line: 5870, key: 'generics', tab: 'JAVA 泛型' },
  { f: 0, line: 5961, key: 'copyNode', tab: 'JAVA 复制' },
  { f: 0, line: 6049, key: 'java8', tab: 'Java 8 新特性教程' },
  { f: 0, line: 6966, key: 'java9', tab: 'Java 9 新特性', end: [0, 7199] },
  { f: 0, line: 7216, key: 'hashmap', tab: '并发死循环分析' },
  { f: 0, line: 7456, key: 'chm', tab: 'JDK1.8 的改进' },
  { f: 0, line: 7722, key: 'chm', tab: '1.7 与 1.8 实现对比' },
  { f: 0, line: 8149, key: 'chm', tab: '深入浅出 1.8', end: [1, 173] },
  { f: 1, line: 473, key: 'exception', tab: 'Java 异常架构与关键字' },
  { f: 1, line: 1349, key: 'tomcat', tab: '工作模式与顶层架构' },
  { f: 1, line: 1578, key: 'copyNode', tab: '深拷贝和浅拷贝' },
  { f: 1, line: 1628, key: 'objCreate', tab: '对象的创建' },
  { f: 1, line: 1705, key: 'gcCollectors', tab: '垃圾收集器' },
  { f: 1, line: 2002, key: 'tuning', tab: '调优工具' },
  { f: 1, line: 2172, key: 'bytecode', tab: 'class 文件结构解析' },
  { f: 1, line: 2482, key: 'runtimeData', tab: '线程隔离的数据区' },
  { f: 1, line: 2637, key: 'tuning', tab: 'JVM 性能调优' },
  { f: 1, line: 2988, key: 'classLoader', tab: '类加载器深入' },
  { f: 1, line: 3375, key: 'directMem', tab: 'JVM 直接内存' },
  { f: 1, line: 3517, key: 'jit', tab: 'JIT 与逃逸分析' },
  { f: 1, line: 3716, key: 'constantPool', tab: '触摸 java 常量池' },
  { f: 1, line: 3937, key: 'gcMech', tab: '对象年龄判定与空间分配担保' },
  { f: 1, line: 4235, key: 'fullGC', tab: 'Full GC 详解' },
  { f: 1, line: 4424, key: 'memOverflow', tab: 'JVM 内存溢出详解' },
  { f: 1, line: 4591, key: 'metaspace', tab: '为什么 JDK8 用 Metaspace 替代 PermGen', alsoQuestion: true },
  { f: 1, line: 4653, key: 'directMem', tab: '堆外内存完全解读' },
  { f: 1, line: 5755, key: 'softRef', tab: '使用软引用构建缓存' },
  { f: 1, line: 5852, key: 'objCreate', tab: '从对象生命周期看 JVM' },
  { f: 1, line: 6034, key: 'gcMech', tab: 'Minor GC 与回收' },
  { f: 1, line: 6093, key: 'gcCollectors', tab: '回收器分类与参数' },
  { f: 1, line: 6272, key: 'tuning', tab: '死锁排查与监控工具' },
  { f: 1, line: 6390, key: 'cms', tab: 'CMS 收集器详解' },
  { f: 1, line: 6805, key: 'tuning', tab: 'String.intern() 导致 YGC 变长案例' },
  { f: 1, line: 7081, key: 'tuning', tab: '调优常用参数配置' },
  { f: 1, line: 7301, key: 'tuning', tab: '性能调优方法论' },
  { f: 1, line: 7697, key: 'runtimeData', tab: 'JVM 内存区域问答' },
  { f: 1, line: 7891, key: 'jvmRoot', tab: 'JVM 面试概览' },
  { f: 2, line: 356, key: 'nio', tab: 'JAVA NIO 概览' },
  { f: 2, line: 413, key: 'classLoadMech', tab: 'JVM 类加载机制', end: [2, 553] },
  { f: 2, line: 590, key: 'threadPool', tab: '线程池的优点与原理' },
  { f: 2, line: 714, key: 'futures', tab: '创建线程与 Callable/Future' },
  { f: 2, line: 1175, key: 'threadState', tab: '线程生命周期' },
  { f: 2, line: 1261, key: 'threadPool', tab: '线程池核心参数' },
  { f: 2, line: 1454, key: 'volatileF', tab: 'volatile 原理' },
  { f: 2, line: 2587, key: 'jmm', tab: '原子性/可见性/有序性' },
  { f: 2, line: 2974, key: 'highConcurrency', tab: '高并发解决方案' },
  { f: 2, line: 3143, key: 'blockingQueue', tab: '阻塞队列实现原理' },
  { f: 2, line: 3539, key: 'ipc', tab: 'Linux 进程间通信方式', end: [2, 3611] },
  { f: 2, line: 3685, key: 'aqs', tab: 'AQS 框架与结构' },
  { f: 2, line: 3731, key: 'nioChannel', tab: '通道例子' },
  { f: 2, line: 3846, key: 'threadPool', tab: '线程池基础与自带线程池的坑' },
  { f: 2, line: 4054, key: 'jmm', tab: 'Java 内存模型' },
  { f: 2, line: 4388, key: 'threadState', tab: '线程的几种状态' },
  { f: 2, line: 4414, key: 'threadPool', tab: '线程池队列策略', end: [2, 5211] },
  { f: 2, line: 5265, key: 'atomics', tab: 'Atomics 原子类' },
  { f: 2, line: 5352, key: 'chm', tab: '深入浅出 1.8（来源二）', dedupe: true },
  { f: 2, line: 6369, key: 'chm', tab: '扩容实现深入分析' },
  { f: 2, line: 6814, key: 'volatileF', tab: 'volatile 特性' },
  { f: 2, line: 6978, key: 'processThread', tab: 'JAVA 多线程并发基础' },
  { f: 2, line: 7225, key: 'daemon', tab: 'JAVA 后台线程' },
  { f: 2, line: 7243, key: 'lock', tab: 'JAVA 锁（乐观/悲观/自旋）' },
  { f: 2, line: 7402, key: 'lockUpgrade', tab: '自旋锁/偏向锁/轻量级锁' },
  { f: 2, line: 7649, key: 'lock', tab: '锁优化' },
  { f: 2, line: 7767, key: 'lock', tab: '锁的分类' },
  { f: 2, line: 7967, key: 'threadObj', tab: '线程基本方法' },
  { f: 3, line: 74, key: 'contextSwitch', tab: '线程上下文切换' },
  { f: 3, line: 121, key: 'deadlock', tab: '同步锁与死锁', end: [3, 174] },
  { f: 3, line: 174, key: 'threadPool', tab: '线程复用与拒绝策略', end: [3, 464] },
  { f: 3, line: 464, key: 'atomicLock', tab: '重排序与调度', end: [3, 656] },
  { f: 3, line: 656, key: 'contextSwitch', tab: '进程调度算法', end: [3, 731] },
  { f: 3, line: 731, key: 'cas', tab: 'CAS 概念及 ABA 问题' },
  { f: 3, line: 853, key: 'nio', tab: 'NIO 技术概览（来源二）', dedupe: true },
];

// 解析节点 id
const nodeIdByKey = {};
for (const [key, v] of Object.entries(EXISTING)) nodeIdByKey[key] = typeof v === 'function' ? v() : v;

const poolPath = path.join(PROJECT_ROOT, 'data', 'node-pool.json');
const pool = JSON.parse(await fs.readFile(poolPath, 'utf8'));
const createdNodes = []; const createdTreeNodes = [];

function createNode(key) {
  if (nodeIdByKey[key]) return nodeIdByKey[key];
  const def = NEW_NODES[key];
  const id = newNodeId(); const treeId = newTreeId();
  pool[id] = { id, label: def.name, card: { nodeId: id, title: def.name, rootContent: '', tabs: [] }, tags: ['Java面试突击'] };
  const parentTid = def.parentTreeId || createdTreeNodes.find((t) => t.key === def.parent)?.treeId;
  const parent = treeById.get(parentTid);
  if (!parent) throw new Error(`parent tree missing for ${key}`);
  const treeNode = { id: treeId, name: def.name, count: 0, nodeRef: id, children: [] };
  parent.children = parent.children || [];
  parent.children.push(treeNode);
  treeById.set(treeId, treeNode);
  nodeIdByKey[key] = id;
  createdNodes.push({ key, nodeId: id, name: def.name });
  createdTreeNodes.push({ key, treeId, nodeId: id, parentTreeId: parentTid });
  return id;
}
createNode('ioNio');
for (const key of Object.keys(NEW_NODES)) createNode(key);

// ---------- 计算文章区间 ----------
const anchors = ARTICLES.map((a) => ({ ...a, g: G(a.f, a.line) })).sort((x, y) => x.g - y.g);
for (let i = 0; i < anchors.length; i += 1) {
  const a = anchors[i];
  a.endG = a.end ? G(a.end[0], a.end[1]) : (i + 1 < anchors.length ? anchors[i + 1].g : L.length);
}
const spanOf = (line) => anchors.find((a) => line > a.g && line < a.endG);

// ---------- 生成文章内容并填充节点 ----------
const accepted = []; // {fullNorm}
const filledTabs = []; const skippedArticles = [];
const articleContentByG = new Map();

for (const a of anchors) {
  const content = buildContent(L.slice(a.g + 1, a.endG), 0);
  articleContentByG.set(a.g, content);
  if (!content || content.replace(/\s/g, '').length < 60) { skippedArticles.push({ tab: a.tab, reason: 'empty' }); continue; }
  const fullNorm = normalizeText(content);
  const probe = fullNorm.slice(100, 400);
  if (a.dedupe && probe.length > 150 && accepted.some((x) => x.fullNorm.includes(probe) || fullNorm.includes(x.fullNorm.slice(100, 400)))) {
    skippedArticles.push({ tab: a.tab, reason: 'duplicate' });
    continue;
  }
  accepted.push({ fullNorm });
  const nodeId = nodeIdByKey[a.key];
  const node = pool[nodeId];
  if (!node) throw new Error(`pool node missing: ${a.key} -> ${nodeId}`);
  node.card ??= { nodeId, title: node.label, tabs: [] };
  node.card.tabs ??= [];
  const tabId = `jimi-${filledTabs.length + 1}`;
  node.card.tabs.push({ id: tabId, label: a.tab, content });
  if (!node.card.rootContent || !node.card.rootContent.trim()) node.card.rootContent = content;
  node.tags = Array.from(new Set([...(node.tags || []), 'Java面试突击']));
  filledTabs.push({ key: a.key, nodeId, tabId, tab: a.tab, chars: content.length });
}

// ---------- 问题提取 ----------
const questionsPath = path.join(PROJECT_ROOT, 'data', 'questions.json');
const questions = JSON.parse(await fs.readFile(questionsPath, 'utf8'));
const existingNorm = new Set(questions.map((q) => normalizeText(q.text)));

// 所有标题 + 事件排序：问句标题与锚点都是答案边界
const events = []; // {g, kind: 'question'|'anchor', title, anchor?}
for (let i = 0; i < L.length; i += 1) {
  const m = L[i].match(HEADING_RE);
  if (!m) continue;
  const anchor = anchors.find((a) => a.g === i);
  if (anchor) { events.push({ g: i, kind: 'anchor', title: m[2].trim(), anchor }); continue; }
  const title = m[2].trim();
  if (isQuestionTitle(title)) events.push({ g: i, kind: 'question', title });
}
events.sort((x, y) => x.g - y.g);

const R = nodeIdByKey;
Object.assign(R, {
  arrayList: 'k_demo_java_array_list', linkedList: 'k_1785683698024_f962oj', vector: 'k_1785685502241_lgz9eq',
  hashSet: 'k_1785731277675_rog9oy', list: 'k_demo_java_list', set: 'k_1785684450180_ry9ixw',
  queue: 'k_1785685822269_z6ow3g', map: 'k_1785665232348_fu4nd2', collectionsFW: 'k_1785664228019_k7eq57',
  iterator: 'k_1785747858308_aoqbr5', comparator: 'k_1785742371669_zng9px', collections: 'k_1785686741307_gi966e',
  serializable: 'k_1785686881765_p1i0hq', string: refByTreeId('tree_java_syntax_java_lang_string_14pdgku'),
  iface: refByName('接口'), constructor: 'k_1784078753095_ukevgi', override: 'k_1783183435962_lom0xc',
  overload: 'k_1783167737276_jlh50j', object: 'k_1783101878467_d26xhv', memberVar: 'k_1783167884457_fbgsdd',
  javaSyntax: refByTreeId('tree_1783867183132_g5tf12'), jdkJre: 'k_jvm_jdk_jre', memLeak: 'k_jvm_mem_leak',
  minorGC: 'k_1783171646604_yn33rr', g1: 'k_1783171609391_x3bqux', strongRef: 'k_atom_strong_ref',
  weakRef: 'k_atom_weak_ref', phantomRef: 'k_atom_phantom_ref', threadStart: 'k_1784367357615_8x9izv',
  interrupt: 'k_1785948854913_isyp7m', safeStop: 'k_1785949022316_vctezb', join: 'k_1786006383348_b3urv6',
  waitNotify: 'k_1785843242128_bus7le', threadLocal: 'k_1785820542850_wvq5hj', optimisticLock: 'k_1782928703651_dpqbc4',
  pessimisticLock: 'k_1782928843737_biclf4', biasedLock: refByTreeId('tree_web_78137b704e08'),
  lightweightLock: 'k_1785847240426_l7js4e', reentrantLock: 'k_1786017169554_blpxjf', readWriteLock: 'k_1786017239491_8fbyyw',
  syncBlock: 'k_1784367586077_d1lo68', concurrentRoot: 'k_1782846767165_l599je', javaRoot: refByTreeId('tree_1782746457614_osttpr'),
});

const RULES = [
  [/ConcurrentHashMap/i, 'chm'], [/SynchronousQueue/i, 'syncQueue'], [/HashMap|哈希/i, 'hashmap'],
  [/Hashtable|TreeMap/i, 'map'], [/HashSet/i, 'hashSet'], [/ArrayList/i, 'arrayList'], [/LinkedList/i, 'linkedList'],
  [/Vector/i, 'vector'], [/BlockingQueue|阻塞队列/i, 'blockingQueue'], [/Queue|队列/i, 'queue'],
  [/Iterator|迭代器/i, 'iterator'], [/Comparable|Comparator/i, 'comparator'], [/Collections/, 'collections'],
  [/fail-fast|集合|Collection/i, 'collectionsFW'], [/String|StringBuffer|StringBuilder|字符串/i, 'string'],
  [/Integer|装箱|拆箱|包装类/, 'javaSyntax'], [/抽象类|接口/, 'iface'], [/内部类/, 'innerClass'],
  [/构造方法|构造器|constructor/i, 'constructor'], [/重载|Overload/i, 'overload'], [/重写|Override/i, 'override'],
  [/equals|hashCode|==/, 'object'], [/值传递|引用传递/, 'oop'], [/成员变量|局部变量|静态变量|实例变量|静态方法|实例方法/, 'memberVar'],
  [/面向对象|面向过程|封装|继承|多态/, 'oop'], [/反射|Class\.forName/i, 'reflect'], [/注解/, 'annotation'],
  [/泛型/, 'generics'], [/异常|Exception|Error|Throwable|try|catch|finally/i, 'exception'], [/JDK|JRE/, 'jdkJre'],
  [/Stream|Lambda|函数式|默认方法|Java\s?8/i, 'java8'], [/Java\s?9|JShell|HTTP\/2|模块化/i, 'java9'],
  [/深拷贝|浅拷贝|拷贝|复制/, 'copyNode'],
  [/NIO|AIO|BIO|epoll|select|Reactor|Proactor|零拷贝|Zero\s?Copy|Channel|Selector/i, 'nio'],
  [/IO流|字节流|字符流|输入流|输出流|IO/, 'ioSystem'], [/Tomcat|servlet/i, 'tomcat'],
  [/自定义类加载/, 'customLoader'], [/双亲委派/, 'classLoadMech'], [/类加载|ClassLoader/i, 'classLoader'],
  [/常量池/, 'constantPool'], [/class\s?文件|字节码/i, 'bytecode'], [/JIT|逃逸分析|即时编译/i, 'jit'],
  [/直接内存|堆外内存/, 'directMem'], [/元空间|metaspace|永久代|perm/i, 'metaspace'], [/内存泄漏|内存泄露/, 'memLeak'],
  [/内存溢出|OOM|StackOverflow/i, 'memOverflow'], [/调优|jstat|jmap|jstack|jconsole|jvisualvm|GC日志|dump/i, 'tuning'],
  [/CMS/, 'cms'], [/G1/, 'g1'], [/Minor\s?GC|YGC/i, 'minorGC'], [/Full\s?GC/i, 'fullGC'],
  [/软引用/, 'softRef'], [/弱引用/, 'weakRef'], [/强引用/, 'strongRef'], [/虚引用/, 'phantomRef'],
  [/GC|垃圾回收|垃圾收集|标记-|可达性|引用计数|分代/, 'gcMech'],
  [/对象.*创建|创建对象|对象.*内存|句柄|直接指针|对象.*定位/, 'objCreate'],
  [/线程池/, 'threadPool'], [/Future|Callable/i, 'futures'], [/volatile/i, 'volatileF'],
  [/synchronized|同步块/i, 'syncBlock'], [/CAS|ABA/, 'cas'], [/原子|Atomic/i, 'atomics'],
  [/AQS|AbstractQueuedSynchronizer/i, 'aqs'], [/偏向锁/, 'biasedLock'], [/轻量级锁/, 'lightweightLock'],
  [/锁升级/, 'lockUpgrade'], [/乐观锁/, 'optimisticLock'], [/悲观锁/, 'pessimisticLock'],
  [/可重入|ReentrantLock/i, 'reentrantLock'], [/读写锁/, 'readWriteLock'], [/死锁/, 'deadlock'], [/锁/, 'lock'],
  [/ThreadLocal/i, 'threadLocal'], [/wait|notify|等待.*通知/, 'waitNotify'], [/join/i, 'join'],
  [/中断|interrupt/i, 'interrupt'], [/终止线程|stop/i, 'safeStop'], [/守护|后台线程|Daemon/i, 'daemon'],
  [/线程.*状态|生命周期/, 'threadState'], [/创建线程|start|run/, 'threadStart'], [/上下文切换/, 'contextSwitch'],
  [/进程间|IPC|信号量|共享内存|消息队列|管道/, 'ipc'], [/进程/, 'processThread'],
  [/内存模型|JMM|happens-before|可见性|有序性|重排序/i, 'jmm'], [/CDN|负载均衡|高并发|静态化/, 'highConcurrency'],
  [/线程/, 'threadObj'], [/并发|并行/, 'concurrentRoot'],
];
const routeQuestion = (text) => { for (const [re, key] of RULES) if (re.test(text)) return R[key]; return R.javaRoot; };

const newQuestions = []; const skippedDups = [];
for (let i = 0; i < events.length; i += 1) {
  const ev = events[i];
  const next = events[i + 1];
  const nextG = next ? next.g : L.length;
  const isAlsoQ = ev.kind === 'anchor' && ev.anchor.alsoQuestion;
  if (ev.kind !== 'question' && !isAlsoQ) continue;

  const text = cleanQuestionText(ev.title);
  const norm = normalizeText(text);
  if (existingNorm.has(norm)) { skippedDups.push(text); continue; }

  let answer;
  if (isAlsoQ) {
    answer = articleContentByG.get(ev.g) || '';
  } else {
    const span = spanOf(ev.g);
    // 区间内的子问题：答案到下一个事件或区间尾；普通问题：答案到下一个事件
    const end = span ? Math.min(nextG, span.endG) : nextG;
    answer = buildContent(L.slice(ev.g + 1, end), 2);
    // 问题紧跟文章（题干即文章导引）：用文章内容作答
    if (answer.replace(/\s/g, '').length < 30 && next && next.kind === 'anchor' && next.g - ev.g <= 4) {
      answer = articleContentByG.get(next.g) || answer;
    }
  }
  if (!answer.trim()) { skippedDups.push(`${text}（空答案跳过）`); continue; }
  if (answer.length > ANSWER_CAP) {
    answer = `${answer.slice(0, ANSWER_CAP)}\n\n……（内容较长已截断，完整内容见关联知识节点的「面试精讲」tab）`;
  }
  const draft = normalizeQuestionDraft({ text, answer }, { allowDeclarative: true });
  if (!draft) { skippedDups.push(`${text} (invalid question format)`); continue; }
  existingNorm.add(norm);
  newQuestions.push({
    id: newQuestionId(),
    text: draft.text,
    answered: Boolean(draft.answer),
    kind: draft.kind,
    difficulty: draft.difficulty,
    source: { ...QUESTION_SOURCE },
    answer: draft.answer,
    answerSteps: [],
    relatedNodeId: routeQuestion(draft.text),
    createdAt: ts,
    updatedAt: ts,
  });
}
questions.push(...newQuestions);

// ---------- 备份 + 原子写入 ----------
const backupDir = path.join(PROJECT_ROOT, 'data', 'backups', `java-interview-${ts}`);
await fs.mkdir(backupDir, { recursive: true });
await fs.copyFile(poolPath, path.join(backupDir, 'node-pool.json'));
await fs.copyFile(treePath, path.join(backupDir, 'tree-data.json'));
await fs.copyFile(questionsPath, path.join(backupDir, 'questions.json'));

await writeFileAtomically(poolPath, `${JSON.stringify(pool, null, 2)}\n`);
await writeFileAtomically(treePath, `${JSON.stringify(tree, null, 2)}\n`);
await writeFileAtomically(questionsPath, `${JSON.stringify(questions, null, 2)}\n`);

const manifest = {
  importedAt: new Date(ts).toISOString(), backupDir, createdNodes, createdTreeNodes,
  filledTabs, skippedArticles, newQuestionIds: newQuestions.map((q) => q.id),
  skippedDuplicateQuestions: skippedDups,
  stats: {
    newQuestions: newQuestions.length, skippedDupQuestions: skippedDups.length,
    newNodes: createdNodes.length, filledTabs: filledTabs.length, totalQuestions: questions.length,
  },
};
await fs.writeFile(path.join(PROJECT_ROOT, 'output', 'java-interview-import-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(JSON.stringify(manifest.stats, null, 2));
console.log('skipped articles:', JSON.stringify(skippedArticles));
console.log('sample new questions:');
for (const q of newQuestions.slice(0, 8)) console.log(' -', q.text.slice(0, 50), '->', q.relatedNodeId, `(${q.answer.length} chars)`);
console.log('backup:', backupDir);
