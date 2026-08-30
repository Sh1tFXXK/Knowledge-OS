import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');
const JAVA_TREE_ID = 'tree_1782746457614_osttpr';
const ROOT_NODE_ID = 'k_1782820185793_jpet7h';
const ROOT_TREE_ID = 'tree_1782820185830_vuzuox';
const LEGACY_ROOT_NODE_ID = 'k_java_class_loading_mechanism';
const LEGACY_ROOT_TREE_ID = 'tree_java_class_loading_mechanism';

const nodes = [
  node(ROOT_NODE_ID, ROOT_TREE_ID, '类的加载、链接与初始化机制', 'mechanism',
    'JVM 将类加载请求转化为已验证、已准备、已解析并完成初始化的运行时类。'),
  node('k_java_class_load_request', 'tree_java_class_load_request', '类加载请求', 'event',
    '由首次主动使用、反射、显式 loadClass 等场景产生的加载请求。'),
  node('k_java_initiating_loader', 'tree_java_initiating_loader', '发起加载器', 'entity',
    '接收类加载请求并启动查找过程的 ClassLoader。'),
  node('k_java_defining_loader', 'tree_java_defining_loader', '定义加载器', 'entity',
    '最终调用 defineClass 并定义运行时类的 ClassLoader。'),
  node('k_java_class_bytes', 'tree_java_class_bytes', 'Class 文件字节', 'entity',
    '类加载器定位并交给 JVM 的二进制类定义。'),
  node('k_java_runtime_class', 'tree_java_runtime_class', '运行时 Class 对象', 'entity',
    '加载、链接并初始化完成后可被程序使用的运行时类型表示。'),
  node('k_java_class_identity_rule', 'tree_java_class_identity_rule', '类身份规则', 'rule',
    '运行时类身份由二进制名称与定义加载器共同确定。'),
  node('k_java_parent_delegation_rule', 'tree_java_parent_delegation_rule', '父加载器委派规则', 'rule',
    '加载器优先把类查找请求交给父加载器处理。'),
  node('k_java_initialization_lock', 'tree_java_initialization_lock', '类初始化锁', 'entity',
    '协调多个线程对同一个类执行初始化。'),
  node('k_java_class_state_requested', 'tree_java_class_state_requested', 'REQUESTED（已请求）', 'state',
    'JVM 已收到某个二进制名称的类加载请求。'),
  node('k_java_class_state_loading', 'tree_java_class_state_loading', 'LOADING（加载中）', 'state',
    '加载器正在委派、查找或生成类的二进制定义。'),
  node('k_java_class_state_loaded', 'tree_java_class_state_loaded', 'LOADED（已加载）', 'state',
    '类的二进制定义已由 JVM 创建为运行时表示。'),
  node('k_java_class_state_verified', 'tree_java_class_state_verified', 'VERIFIED（已验证）', 'state',
    '类文件格式、字节码和类型约束已经验证。'),
  node('k_java_class_state_prepared', 'tree_java_class_state_prepared', 'PREPARED（已准备）', 'state',
    '静态字段存储已经分配并设置为默认值。'),
  node('k_java_class_state_resolved', 'tree_java_class_state_resolved', 'RESOLVED（已解析）', 'state',
    '运行时常量池中的符号引用已解析为直接引用。'),
  node('k_java_class_state_initialized', 'tree_java_class_state_initialized', 'INITIALIZED（已初始化）', 'state',
    '类初始化方法已经成功执行，类可以正常使用。'),
  node('k_java_class_state_linkage_failed', 'tree_java_class_state_linkage_failed', 'LINKAGE_FAILED（链接失败）', 'state',
    '加载、验证、准备或解析阶段发生不可恢复的链接错误。'),
  node('k_java_class_state_init_failed', 'tree_java_class_state_init_failed', 'INITIALIZATION_FAILED（初始化失败）', 'state',
    '类初始化方法执行失败，类进入错误状态。'),
];

const transitions = [
  dynamic('edge_java_class_request_received', 'k_java_class_load_request', 'k_java_class_state_requested', '产生类加载请求', 'causality'),
  dynamic('edge_java_class_begin_loading', 'k_java_class_state_requested', 'k_java_class_state_loading', '开始委派与查找'),
  dynamic('edge_java_class_define_loaded', 'k_java_class_state_loading', 'k_java_class_state_loaded', 'defineClass 创建运行时类'),
  dynamic('edge_java_class_verify', 'k_java_class_state_loaded', 'k_java_class_state_verified', '验证类文件与字节码'),
  dynamic('edge_java_class_prepare', 'k_java_class_state_verified', 'k_java_class_state_prepared', '分配静态字段并设置默认值'),
  dynamic('edge_java_class_resolve', 'k_java_class_state_prepared', 'k_java_class_state_resolved', '解析符号引用'),
  dynamic('edge_java_class_initialize', 'k_java_class_state_resolved', 'k_java_class_state_initialized', '执行类初始化方法'),
  dynamic('edge_java_class_expose_runtime', 'k_java_class_state_initialized', 'k_java_runtime_class', '产生可用运行时 Class', 'causality'),
  dynamic('edge_java_class_loading_failure', 'k_java_class_state_loading', 'k_java_class_state_linkage_failed', '加载或定义失败'),
  dynamic('edge_java_class_verification_failure', 'k_java_class_state_loaded', 'k_java_class_state_linkage_failed', '验证或链接失败'),
  dynamic('edge_java_class_initialization_failure', 'k_java_class_state_resolved', 'k_java_class_state_init_failed', '初始化方法执行失败'),
];

const constraints = [
  constraint('edge_java_class_parent_delegation', 'k_java_parent_delegation_rule', 'k_java_initiating_loader', '约束加载器委派顺序'),
  constraint('edge_java_class_defining_loader', 'k_java_initiating_loader', 'k_java_defining_loader', '确定最终定义加载器'),
  constraint('edge_java_class_identity', 'k_java_class_identity_rule', 'k_java_runtime_class', '约束运行时类身份'),
  constraint('edge_java_class_bytes_source', 'k_java_defining_loader', 'k_java_class_bytes', '定位并定义类字节'),
  constraint('edge_java_class_init_lock', 'k_java_initialization_lock', 'k_java_class_state_initialized', '串行化同一类的初始化'),
];

function node(id, treeId, label, kind, description) {
  return { id, treeId, label, kind, description };
}

function dynamic(id, source, target, label, relationKind = 'state-transition') {
  return { id, source, target, type: 'transitions-to', label, relationKind, dimensions: ['runtime', 'jvm'] };
}

function constraint(id, source, target, label) {
  return { id, source, target, type: 'constrained-by', label, relationKind: 'constraint', dimensions: ['runtime', 'jvm'] };
}

async function readJson(name) {
  return JSON.parse(await readFile(resolve(DATA_DIR, name), 'utf8'));
}

async function writeJsonAtomic(name, data) {
  const target = resolve(DATA_DIR, name);
  const temporary = `${target}.tmp.${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await rename(temporary, target);
}

function findTreeNode(root, nodeId) {
  if (root.id === nodeId) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

function upsertEdge(edges, edge) {
  const index = edges.findIndex((candidate) => candidate.id === edge.id);
  if (index >= 0) edges[index] = edge;
  else edges.push(edge);
}

async function main() {
  const [nodePool, treeData, rawKnowledgeEdges] = await Promise.all([
    readJson('node-pool.json'),
    readJson('tree-data.json'),
    readJson('knowledge-edges.json'),
  ]);
  let knowledgeEdges = rawKnowledgeEdges;
  const javaTree = findTreeNode(treeData, JAVA_TREE_ID);
  if (!javaTree) throw new Error(`Java tree node not found: ${JAVA_TREE_ID}`);

  removeTreeNode(treeData, LEGACY_ROOT_TREE_ID);
  delete nodePool[LEGACY_ROOT_NODE_ID];
  knowledgeEdges = knowledgeEdges.filter(
    (edge) => edge.source !== LEGACY_ROOT_NODE_ID
      && edge.target !== LEGACY_ROOT_NODE_ID
      && !edge.id.startsWith(`treebind:${LEGACY_ROOT_TREE_ID}:`),
  );

  javaTree.children ??= [];
  let rootTree = findTreeNode(treeData, ROOT_TREE_ID);
  if (!rootTree) {
    rootTree = { id: ROOT_TREE_ID, name: nodes[0].label, count: 0, nodeRef: ROOT_NODE_ID, children: [] };
    javaTree.children.push(rootTree);
  }
  rootTree.children ??= [];

  for (const item of nodes) {
    const existing = nodePool[item.id];
    nodePool[item.id] = {
      ...existing,
      id: item.id,
      label: item.label,
      kind: item.kind,
      role: 'mechanism',
      dimensions: [...new Set([...(existing?.dimensions ?? []), 'runtime', 'jvm'])],
      tags: [...new Set([...(existing?.tags ?? []), 'java', 'jvm', 'class-loading'])],
      card: {
        ...(existing?.card ?? {}),
        nodeId: item.id,
        title: item.label,
        rootContent: item.id === ROOT_NODE_ID
          ? (existing?.card?.rootContent ?? item.description)
          : existing?.card?.rootContent,
        tabs: existing?.card?.tabs?.length
          ? existing.card.tabs
          : [{ id: 'def', label: '定义', content: item.description }],
      },
    };

    if (item.id === ROOT_NODE_ID) continue;
    if (!rootTree.children.some((child) => child.nodeRef === item.id)) {
      rootTree.children.push({ id: item.treeId, name: item.label, count: 0, nodeRef: item.id });
    }
    upsertEdge(knowledgeEdges, {
      id: `treebind:${ROOT_TREE_ID}:${item.treeId}`,
      source: ROOT_NODE_ID,
      target: item.id,
      type: 'belongs-to',
      label: 'contains',
      relationKind: 'structure',
      dimensions: ['runtime', 'jvm'],
    });
  }

  // The existing Java -> 类加载机制 binding remains the canonical directory ownership.
  for (const edge of [...transitions, ...constraints]) upsertEdge(knowledgeEdges, edge);

  nodePool[ROOT_NODE_ID].mechanismSpec = {
    phenomenonNodeId: ROOT_NODE_ID,
    triggerNodeIds: ['k_java_class_load_request'],
    participantNodeIds: [
      'k_java_initiating_loader',
      'k_java_defining_loader',
      'k_java_class_bytes',
      'k_java_runtime_class',
      'k_java_class_identity_rule',
      'k_java_parent_delegation_rule',
      'k_java_initialization_lock',
    ],
    stateNodeIds: [
      'k_java_class_state_requested',
      'k_java_class_state_loading',
      'k_java_class_state_loaded',
      'k_java_class_state_verified',
      'k_java_class_state_prepared',
      'k_java_class_state_resolved',
      'k_java_class_state_initialized',
      'k_java_class_state_linkage_failed',
      'k_java_class_state_init_failed',
    ],
    transitionEdgeIds: transitions.map((edge) => edge.id),
    constraintEdgeIds: constraints.map((edge) => edge.id),
    outcomeNodeIds: ['k_java_class_state_initialized', 'k_java_runtime_class'],
    failureNodeIds: ['k_java_class_state_linkage_failed', 'k_java_class_state_init_failed'],
  };

  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);
  console.log(`Upserted Java class-loading mechanism with ${nodes.length - 1} members.`);
}

function removeTreeNode(root, nodeId) {
  if (!root.children) return false;
  const previousLength = root.children.length;
  root.children = root.children.filter((child) => child.id !== nodeId);
  if (root.children.length !== previousLength) return true;
  return root.children.some((child) => removeTreeNode(child, nodeId));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
