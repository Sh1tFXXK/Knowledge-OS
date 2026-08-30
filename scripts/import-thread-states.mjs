import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DATA_DIR = resolve('data');
const ROOT_NODE_ID = 'k_1785934396536_as412a';
const ROOT_TREE_ID = 'tree_1785934396723_afsojh';

const entities = [
  {
    id: 'k_java_thread_instance',
    treeId: 'tree_java_thread_instance',
    label: 'Thread 实例',
    kind: 'entity',
    description: '被跟踪生命周期的 Java Thread 对象。',
  },
  {
    id: 'k_java_thread_scheduler',
    treeId: 'tree_java_thread_scheduler',
    label: '操作系统调度器',
    kind: 'entity',
    description: '决定 READY 线程何时获得 CPU 时间片。',
  },
  {
    id: 'k_java_thread_monitor',
    treeId: 'tree_java_thread_monitor',
    label: 'Object Monitor',
    kind: 'entity',
    description: '负责 wait/notify 协作的对象监视器。',
  },
  {
    id: 'k_java_thread_lock',
    treeId: 'tree_java_thread_lock',
    label: 'synchronized 锁',
    kind: 'entity',
    description: '进入 synchronized 代码前必须获得的监视器锁。',
  },
  {
    id: 'k_java_thread_state_new',
    treeId: 'tree_java_thread_state_new',
    label: 'NEW（初始）',
    kind: 'state',
    description: '线程已创建，但尚未调用 start()。',
  },
  {
    id: 'k_java_thread_state_runnable',
    treeId: 'tree_java_thread_state_runnable',
    label: 'RUNNABLE（可运行）',
    kind: 'state',
    description: 'JVM 层面的可运行状态，包含 READY 与 RUNNING。',
  },
  {
    id: 'k_java_thread_state_running',
    treeId: 'tree_java_thread_state_running',
    label: 'RUNNING（运行中）',
    kind: 'state',
    description: '线程已获得 CPU 时间片，正在执行字节码。',
  },
  {
    id: 'k_java_thread_state_ready',
    treeId: 'tree_java_thread_state_ready',
    label: 'READY（就绪）',
    kind: 'state',
    description: '线程具备运行条件，正在等待调度器分配 CPU。',
  },
  {
    id: 'k_java_thread_state_waiting',
    treeId: 'tree_java_thread_state_waiting',
    label: 'WAITING（等待）',
    kind: 'state',
    description: '线程无限期等待，直到其他线程显式唤醒。',
  },
  {
    id: 'k_java_thread_state_timed_waiting',
    treeId: 'tree_java_thread_state_timed_waiting',
    label: 'TIMED_WAITING（超时等待）',
    kind: 'state',
    description: '线程在限定时间内等待，超时或被唤醒后恢复。',
  },
  {
    id: 'k_java_thread_state_blocked',
    treeId: 'tree_java_thread_state_blocked',
    label: 'BLOCKED（阻塞）',
    kind: 'state',
    description: '线程正在等待获得 synchronized 监视器锁。',
  },
  {
    id: 'k_java_thread_state_terminated',
    treeId: 'tree_java_thread_state_terminated',
    label: 'TERMINATED（终止）',
    kind: 'state',
    description: 'run() 已结束，线程不能再次启动。',
  },
];

const relations = [
  transition('edge_java_thread_enters_new', 'k_java_thread_instance', 'k_java_thread_state_new', '实例化'),
  transition('edge_java_thread_starts_runnable', 'k_java_thread_state_new', 'k_java_thread_state_runnable', 'Thread.start()'),
  transition('edge_java_thread_dispatches_running', 'k_java_thread_state_runnable', 'k_java_thread_state_running', '系统调度分配 CPU'),
  transition('edge_java_thread_yields_ready', 'k_java_thread_state_running', 'k_java_thread_state_ready', 'yield() / 时间片用完'),
  transition('edge_java_thread_ready_runs', 'k_java_thread_state_ready', 'k_java_thread_state_running', '系统调度获得 CPU'),
  transition('edge_java_thread_waits', 'k_java_thread_state_running', 'k_java_thread_state_waiting', 'wait() / join() / park()'),
  transition('edge_java_thread_notifies', 'k_java_thread_state_waiting', 'k_java_thread_state_runnable', 'notify() / notifyAll() / unpark()'),
  transition('edge_java_thread_sleeps', 'k_java_thread_state_running', 'k_java_thread_state_timed_waiting', 'sleep() / wait(long) / join(long)'),
  transition('edge_java_thread_times_out', 'k_java_thread_state_timed_waiting', 'k_java_thread_state_runnable', '超时 / notify / unpark'),
  transition('edge_java_thread_blocks', 'k_java_thread_state_running', 'k_java_thread_state_blocked', '等待进入 synchronized'),
  transition('edge_java_thread_acquires_lock', 'k_java_thread_state_blocked', 'k_java_thread_state_runnable', '获得监视器锁'),
  transition('edge_java_thread_terminates', 'k_java_thread_state_running', 'k_java_thread_state_terminated', '执行完成'),
  context('edge_java_thread_monitor_guards_waiting', 'k_java_thread_monitor', 'k_java_thread_state_waiting', '协调等待与唤醒'),
  context('edge_java_thread_lock_guards_blocked', 'k_java_thread_lock', 'k_java_thread_state_blocked', '守护锁竞争'),
];

function transition(id, source, target, label) {
  return mechanismEdge(id, source, target, label, 'transition');
}

function context(id, source, target, label) {
  return mechanismEdge(id, source, target, label, 'context');
}

function mechanismEdge(id, source, target, label, role) {
  return {
    id,
    source,
    target,
    type: role === 'transition' ? 'transitions-to' : 'guards',
    label,
    dimensions: ['concurrency'],
    relationKind: role === 'transition' ? 'state-transition' : 'constraint',
  };
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
  const [nodePool, treeData, knowledgeEdges] = await Promise.all([
    readJson('node-pool.json'),
    readJson('tree-data.json'),
    readJson('knowledge-edges.json'),
  ]);
  const rootNode = nodePool[ROOT_NODE_ID];
  const rootTreeNode = findTreeNode(treeData, ROOT_TREE_ID);
  if (!rootNode || !rootTreeNode) throw new Error('Java thread-state root was not found');

  rootNode.role = 'mechanism';
  rootNode.kind = 'mechanism';
  rootNode.dimensions = [...new Set([...(rootNode.dimensions ?? []), 'concurrency'])];
  rootNode.tags = [...new Set([...(rootNode.tags ?? []), 'java', 'thread', 'lifecycle'])];
  rootNode.card = {
    ...rootNode.card,
    nodeId: ROOT_NODE_ID,
    title: rootNode.label,
    rootContent: rootNode.card.rootContent
      ?? 'Java 线程生命周期由状态实体和状态转换关系共同描述。机制视图直接从这些统一数据生成。',
    tabs: rootNode.card.tabs ?? [],
  };

  rootTreeNode.children ??= [];
  for (const entity of entities) {
    const existing = nodePool[entity.id];
    nodePool[entity.id] = {
      ...existing,
      id: entity.id,
      label: entity.label,
      kind: entity.kind,
      role: 'mechanism',
      dimensions: [...new Set([...(existing?.dimensions ?? []), 'concurrency'])],
      tags: [...new Set([...(existing?.tags ?? []), 'java', 'thread', 'lifecycle'])],
      card: {
        ...(existing?.card ?? {}),
        nodeId: entity.id,
        title: entity.label,
        tabs: existing?.card?.tabs?.length
          ? existing.card.tabs
          : [{ id: 'def', label: '定义', content: entity.description }],
      },
    };

    if (!rootTreeNode.children.some((child) => child.nodeRef === entity.id)) {
      rootTreeNode.children.push({
        id: entity.treeId,
        name: entity.label,
        count: 0,
        nodeRef: entity.id,
      });
    }

    upsertEdge(knowledgeEdges, {
      id: `treebind:${ROOT_TREE_ID}:${entity.treeId}`,
      source: ROOT_NODE_ID,
      target: entity.id,
      type: 'belongs-to',
      label: 'contains',
      relationKind: 'structure',
      dimensions: ['concurrency'],
    });
  }

  for (const relation of relations) upsertEdge(knowledgeEdges, relation);

  rootNode.mechanismSpec = {
    phenomenonNodeId: ROOT_NODE_ID,
    triggerNodeIds: ['k_java_thread_instance'],
    participantNodeIds: [
      'k_java_thread_instance',
      'k_java_thread_scheduler',
      'k_java_thread_monitor',
      'k_java_thread_lock',
    ],
    stateNodeIds: [
      'k_java_thread_state_new',
      'k_java_thread_state_runnable',
      'k_java_thread_state_running',
      'k_java_thread_state_ready',
      'k_java_thread_state_waiting',
      'k_java_thread_state_timed_waiting',
      'k_java_thread_state_blocked',
      'k_java_thread_state_terminated',
    ],
    transitionEdgeIds: relations
      .filter((relation) => relation.relationKind === 'state-transition')
      .map((relation) => relation.id),
    constraintEdgeIds: relations
      .filter((relation) => relation.relationKind === 'constraint')
      .map((relation) => relation.id),
    outcomeNodeIds: ['k_java_thread_state_terminated'],
    failureNodeIds: [],
  };

  await Promise.all([
    writeJsonAtomic('node-pool.json', nodePool),
    writeJsonAtomic('tree-data.json', treeData),
    writeJsonAtomic('knowledge-edges.json', knowledgeEdges),
  ]);

  console.log(`Upserted ${entities.length} Java thread entities and ${relations.length} relations.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
