#!/usr/bin/env node
/**
 * 一次性迁移：快照模型 → 持久化演化事件模型（TemporalIndexWorkspace）。
 *
 * 可重复运行：再次执行时若 evolution-events.json 已存在则跳过（幂等）。
 * 步骤：
 *   1. 备份 tree-data.json / knowledge-edges.json / node-pool.json / timeline.json
 *      到 data/backups/evolution-events-<ts>/
 *   2. 写 data/evolution-events.json：Spring 4/5 两个事件（源自原
 *      BUILT_IN_TIMELINE_ANNOTATIONS 种子数据），并把 @Indexed 并入 Spring 5 的
 *      introducedNodes。
 *   3. 修剪 tree-data.json：移除 3 个版本说明来源节点 + 4 个引入节点的树挂载。
 *   4. 修剪 knowledge-edges.json：删除指向上述树节点的 treebind:（belongs-to）边。
 *   5. 删除 data/timeline.json（旧快照，2267 条）。
 *   6. node-pool.json 不动——7 个知识节点保留，由事件的 sourceOnlyNodeIds /
 *      introducedNodes 引用。
 *   7. 打印迁移摘要。
 */
import { cpSync, mkdirSync, existsSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const DATA_DIR = join(process.cwd(), 'data');
const FILES = {
  treeData: 'tree-data.json',
  knowledgeEdges: 'knowledge-edges.json',
  nodePool: 'node-pool.json',
  timeline: 'timeline.json',
  evolutionEvents: 'evolution-events.json',
};

const SPRING = {
  ioc: 'k_vault_javaspring01ioc_1haton',
  mvc: 'k_vault_javaspring04springmvc_133lis',
  configuration: 'k_vault_javaspring06_1868fr',
  spring4: 'k_vault_javaspringspring4_bn9s51',
  spring5: 'k_vault_javaspringspring5_qbo2d2',
  web: 'k_vault_javaspringweb_dxr6ot',
  jsr310: 'k_vault_javaspringjsr310api_17qbfx',
  validation: 'k_vault_javaspringbeanvalidation11springmvc_1b3bqh',
  webflux: 'k_1784462055382_w4thg2',
  indexed: 'k_1785296399373_ibj3ms',
};

/** 作用域根：Spring 知识域 */
const SCOPE_ROOT = 'k_java_fw_spring';

/** 来源节点（版本说明，永远不进稳定索引，只作事件证据）。 */
const SOURCE_ONLY = {
  spring4: [SPRING.spring4, SPRING.web],
  spring5: [SPRING.spring5],
};

/** 引入节点（真正独立可复用的新增知识；发生事件后才进入索引）。 */
const INTRODUCED = {
  spring4: [
    { nodeId: SPRING.jsr310, parentNodeId: SPRING.mvc },
    { nodeId: SPRING.validation, parentNodeId: SPRING.mvc },
  ],
  spring5: [
    { nodeId: SPRING.webflux, parentNodeId: SPRING.mvc },
    { nodeId: SPRING.indexed, parentNodeId: SPRING.configuration },
  ],
};

const EVOLUTION_EVENTS = [
  {
    id: 'event:spring:4',
    scopeRootId: SCOPE_ROOT,
    occurredAt: Date.UTC(2013, 11, 12),
    title: 'Spring 4',
    summary: 'Spring 4 保留原有容器和 MVC 职责，同时扩展类型安全、Web 表达、验证与日期处理。',
    sourceOnlyNodeIds: SOURCE_ONLY.spring4,
    introducedNodes: INTRODUCED.spring4,
    changes: [
      {
        targetNodeId: SPRING.ioc,
        facet: 'content',
        before: '容器负责创建、装配和管理对象。',
        after: '泛型限定式注入、@Nullable 和函数式 ApplicationContext 让同一职责更易表达。',
      },
      {
        targetNodeId: SPRING.mvc,
        facet: 'content',
        before: 'DispatcherServlet 组织路由、参数绑定和响应处理。',
        after: '@RestController、Servlet 3.1、异步 REST 和不可变对象绑定扩展了同一条请求链路。',
      },
      {
        targetNodeId: SPRING.configuration,
        facet: 'structure',
        before: 'XML、注解和 Java Config 表达 BeanDefinition。',
        after: '继续保留声明式配置，同时增加 Groovy Bean DSL、脚本和更灵活的注册入口。',
      },
    ],
  },
  {
    id: 'event:spring:5',
    scopeRootId: SCOPE_ROOT,
    occurredAt: Date.UTC(2017, 8, 28),
    title: 'Spring 5',
    summary: 'Spring 5 没有推翻原知识骨架，而是把运行基线升级到 Java 8，并为 Web 增加响应式路径。',
    sourceOnlyNodeIds: SOURCE_ONLY.spring5,
    introducedNodes: INTRODUCED.spring5,
    changes: [
      {
        targetNodeId: SPRING.ioc,
        facet: 'metadata',
        before: '容器在旧 Java 平台上提供通用对象管理。',
        after: '框架以 Java 8 为基线，并支持候选组件索引来减少运行时扫描。',
      },
      {
        targetNodeId: SPRING.mvc,
        facet: 'content',
        before: 'Spring Web 主要沿用阻塞式 MVC 请求模型。',
        after: '新增 WebFlux，在同一 Spring Web 领域提供 reactive、异步非阻塞和 event-loop 路径。',
      },
      {
        targetNodeId: SPRING.configuration,
        facet: 'metadata',
        before: '配置驱动模型与具体日志实现耦合较多。',
        after: 'spring-jcl 等基础设施提供更统一的日志抽象，应用模型保持不变。',
      },
    ],
  },
];

/** 要从稳定目录移除的 7 个知识节点 id（3 来源 + 4 引入）。 */
const UNMOUNTED_NODE_IDS = new Set([
  ...SOURCE_ONLY.spring4,
  ...SOURCE_ONLY.spring5,
  ...INTRODUCED.spring4.map((item) => item.nodeId),
  ...INTRODUCED.spring5.map((item) => item.nodeId),
]);

function readJson(filename) {
  return JSON.parse(readFileSync(join(DATA_DIR, filename), 'utf8'));
}

function writeJson(filename, value) {
  writeFileSync(join(DATA_DIR, filename), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** 从目录树移除所有 nodeRef 命中的节点（含子树），返回修剪统计。 */
function pruneTreeByNodeRef(node, removed) {
  const children = (node.children ?? []).filter((child) => {
    if (child.nodeRef && UNMOUNTED_NODE_IDS.has(child.nodeRef)) {
      removed.push({ treeNodeId: child.id, name: child.name, nodeRef: child.nodeRef });
      return false;
    }
    return true;
  });
  const nextChildren = children.map((child) => pruneTreeByNodeRef(child, removed));
  for (const child of nextChildren) {
    if (child.prunedChildren.length > 0) {
      child.tree.children = child.prunedChildren;
    }
  }
  return {
    tree: { ...node, children: nextChildren.map((item) => item.tree) },
    prunedChildren: nextChildren.length > 0 ? nextChildren.map((item) => item.tree) : children,
  };
}

function main() {
  if (existsSync(join(DATA_DIR, FILES.evolutionEvents))) {
    console.log(`[skip] ${FILES.evolutionEvents} 已存在，迁移已完成（幂等退出）。`);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(DATA_DIR, 'backups', `evolution-events-${timestamp}`);
  mkdirSync(backupDir, { recursive: true });
  for (const filename of [FILES.treeData, FILES.knowledgeEdges, FILES.nodePool, FILES.timeline]) {
    const source = join(DATA_DIR, filename);
    if (existsSync(source)) {
      cpSync(source, join(backupDir, filename));
      console.log(`[backup] ${filename} -> ${backupDir}`);
    }
  }

  // ── 1. 写演化事件 ──
  writeJson(FILES.evolutionEvents, EVOLUTION_EVENTS);
  console.log(`[write] ${FILES.evolutionEvents}: ${EVOLUTION_EVENTS.length} 个事件（Spring 4/5）`);

  // ── 2. 修剪目录树 ──
  const tree = readJson(FILES.treeData);
  const removedTreeNodes = [];
  const { tree: nextTree } = pruneTreeByNodeRef(tree, removedTreeNodes);
  writeJson(FILES.treeData, nextTree);
  console.log(`[prune] ${FILES.treeData}: 移除 ${removedTreeNodes.length} 个树节点`);
  for (const item of removedTreeNodes) {
    console.log(`        - ${item.name} (${item.nodeRef})`);
  }

  // ── 3. 修剪 treebind 边 ──
  const edges = readJson(FILES.knowledgeEdges);
  const removedTreeNodeIds = new Set(removedTreeNodes.map((item) => item.treeNodeId));
  const removedTargetNodeIds = new Set(
    edges
      .filter((edge) => removedTreeNodeIds.has(edge.id.split(':').pop() ?? ''))
      .map((edge) => edge.id),
  );
  // treebind 边形如 treebind:<parentTreeNodeId>:<childTreeNodeId>，按 child 树 id 或目标知识 id 命中
  const nextEdges = edges.filter((edge) => {
    if (!edge.id.startsWith('treebind:')) return true;
    const childTreeNodeId = edge.id.split(':').pop();
    if (removedTreeNodeIds.has(childTreeNodeId)) return false;
    if (edge.type === 'belongs-to' && UNMOUNTED_NODE_IDS.has(edge.target)) return false;
    return true;
  });
  writeJson(FILES.knowledgeEdges, nextEdges);
  console.log(`[prune] ${FILES.knowledgeEdges}: ${edges.length - nextEdges.length} 条 treebind 边移除（${removedTargetNodeIds.size} 条经 child-id 命中）`);

  // ── 4. 删除旧快照文件 ──
  const timelinePath = join(DATA_DIR, FILES.timeline);
  if (existsSync(timelinePath)) {
    const snapshotCount = readJson(FILES.timeline).length;
    rmSync(timelinePath);
    console.log(`[delete] ${FILES.timeline}（${snapshotCount} 条快照，已备份）`);
  }

  // ── 5. node-pool 保持不变 ──
  const nodePool = readJson(FILES.nodePool);
  const missing = [...UNMOUNTED_NODE_IDS].filter((id) => !nodePool[id]);
  if (missing.length > 0) {
    console.warn(`[warn] node-pool 缺少事件引用的节点：${missing.join(', ')}`);
  } else {
    console.log(`[keep] ${FILES.nodePool}: ${UNMOUNTED_NODE_IDS.size} 个节点保留（由事件引用）`);
  }

  console.log('\n迁移完成：');
  console.log(`  - ${FILES.evolutionEvents} 新增（2 个事件）`);
  console.log(`  - ${FILES.treeData} 修剪（${removedTreeNodes.length} 个树节点移除）`);
  console.log(`  - ${FILES.knowledgeEdges} 修剪（${edges.length - nextEdges.length} 条边移除）`);
  console.log(`  - ${FILES.timeline} 删除（备份在 ${backupDir}）`);
  console.log(`  - 备份目录：${backupDir}`);
}

main();
