function resolution(canonicalKey, targetId, memberIds, aliases = [], options = {}) {
  return Object.freeze({
    canonicalKey,
    targetId,
    memberIds: Object.freeze(memberIds),
    kind: options.kind ?? 'concept',
    role: options.role ?? 'subsystem',
    aliases: Object.freeze(aliases),
  });
}

function contextMigration(treeNodeId, sourceNodeId, namespace, label) {
  return Object.freeze({
    treeNodeId,
    sourceNodeId,
    namespace,
    label,
    removeTags: Object.freeze([]),
  });
}

export const OVERLAP_SEMANTIC_RESOLUTIONS = Object.freeze([
  resolution('discipline:security', 'school_security', [
    'school_security',
    'k_acm2012_security',
  ], ['Security']),
  resolution('discipline:operating-systems', 'theory_domain_operating_systems', [
    'theory_domain_operating_systems',
    'k_1781894134776_ddvce4',
  ], ['Operating systems', '\u64cd\u4f5c\u7cfb\u7edf\u7406\u8bba']),
  resolution('database:management-system', 'k_wiki_en_database_s12', [
    'k_wiki_en_database_s12',
    'k_wiki_zh_\u6570\u636e\u5e93_s2',
  ], ['Database management system', 'DBMS']),
  resolution('database:history', 'k_wiki_en_outline_of_databases_s3', [
    'k_wiki_en_outline_of_databases_s3',
    'k_wiki_en_outline_of_databases_s3_b1',
  ], ['History of databases'], { role: 'plain' }),
  resolution('concurrency:condition-variable', 'k_wiki_en_monitor_synchronization_s7', [
    'k_wiki_en_monitor_synchronization_s7',
    'k_wiki_en_monitor_synchronization_s2',
  ], ['Condition variable'], { role: 'plain' }),
  resolution('java:type:java.util.concurrent.ConcurrentHashMap', 'k_java_type_48031e8c20570051', [
    'k_java_type_48031e8c20570051',
    'k_1785293964275_zoa3gk',
  ], [], { kind: 'entity', role: 'plain' }),
  resolution('java:type:java.util.concurrent.ConcurrentLinkedQueue', 'k_java_type_acdfd0770043ef24', [
    'k_java_type_acdfd0770043ef24',
    'k_1786030855823_fpyrji',
  ], [], { kind: 'entity', role: 'plain' }),
  resolution('java:type:java.util.concurrent.ArrayBlockingQueue', 'k_java_type_65cc8d65742d8aa2', [
    'k_java_type_65cc8d65742d8aa2',
    'k_1786074380517_j4jnqr',
  ], [], { kind: 'entity', role: 'plain' }),
  resolution('java:type:java.util.concurrent.ThreadPoolExecutor', 'k_java_type_ff6db88dc6746818', [
    'k_java_type_ff6db88dc6746818',
    'k_1785416767515_8op156',
  ], [], { kind: 'entity', role: 'plain' }),
  resolution('java:type:java.util.concurrent.locks.ReentrantLock', 'k_java_type_8bda9fc7a4027ad0', [
    'k_java_type_8bda9fc7a4027ad0',
    'k_1785768120982_k4g3td',
  ], [], { kind: 'entity', role: 'plain' }),
  resolution('java:type:java.lang.ThreadLocal', 'k_java_type_c1ecc4e34ff2913c', [
    'k_java_type_c1ecc4e34ff2913c',
    'k_1785820542850_wvq5hj',
  ], [], { kind: 'entity', role: 'plain' }),
]);

export const OVERLAP_CONTEXT_MIGRATIONS = Object.freeze([
  contextMigration(
    'tree_acm2012_security',
    'k_acm2012_security',
    'context:acm:security',
    'ACM \u5b89\u5168\u5206\u7c7b\u8bf4\u660e',
  ),
  contextMigration(
    'tree_1781894134786_k26g6t',
    'k_1781894134776_ddvce4',
    'context:acm:operating-systems',
    'ACM \u8f6f\u4ef6\u7ec4\u7ec7\u4e2d\u7684\u64cd\u4f5c\u7cfb\u7edf',
  ),
  contextMigration(
    'tree_wiki_zh_\u6570\u636e\u5e93_s2',
    'k_wiki_zh_\u6570\u636e\u5e93_s2',
    'context:wikipedia:zh:database-management-system',
    '\u4e2d\u6587\u7ef4\u57fa\u6570\u636e\u5e93\u7ba1\u7406\u7cfb\u7edf\u6761\u76ee',
  ),
  contextMigration(
    'tree_wiki_en_outline_of_databases_s3_b1',
    'k_wiki_en_outline_of_databases_s3_b1',
    'context:database-outline:history',
    '\u6570\u636e\u5e93\u5386\u53f2\u6761\u76ee\u8865\u5145',
  ),
  contextMigration(
    'tree_wiki_en_monitor_synchronization_s2',
    'k_wiki_en_monitor_synchronization_s2',
    'context:monitor:condition-variable-introduction',
    '\u6761\u4ef6\u53d8\u91cf\u7ae0\u8282\u5bfc\u8a00',
  ),
  contextMigration(
    'tree_1785293964453_8vqlt3',
    'k_1785293964275_zoa3gk',
    'context:java-interview:concurrent-hash-map',
    'Java \u9762\u8bd5\u4e2d\u7684 ConcurrentHashMap',
  ),
  contextMigration(
    'tree_1786030856071_2edcr6',
    'k_1786030855823_fpyrji',
    'context:java-concurrency:concurrent-linked-queue',
    'Java \u5e76\u53d1\u5bb9\u5668\u4e2d\u7684 ConcurrentLinkedQueue',
  ),
  contextMigration(
    'tree_1786074380736_lgfhvg',
    'k_1786074380517_j4jnqr',
    'context:java-concurrency:array-blocking-queue',
    'Java \u963b\u585e\u961f\u5217\u4e2d\u7684 ArrayBlockingQueue',
  ),
  contextMigration(
    'tree_1785416767656_xllpk1',
    'k_1785416767515_8op156',
    'context:java-concurrency:thread-pool-executor',
    'Java \u7ebf\u7a0b\u6c60\u4e2d\u7684 ThreadPoolExecutor',
  ),
]);

export const OVERLAP_TREE_CONSOLIDATIONS = Object.freeze([
  Object.freeze({
    sourceTreeId: 'tree_acm2012_theory_of_computing',
    targetTreeId: 'school_computation_theory',
  }),
  Object.freeze({
    sourceTreeId: 'tree_acm2012_security',
    targetTreeId: 'school_security',
  }),
  Object.freeze({
    sourceTreeId: 'tree_1781894134786_k26g6t',
    targetTreeId: 'theory_domain_operating_systems',
  }),
  Object.freeze({
    sourceTreeId: 'tree_wiki_en_database_s12',
    targetTreeId: 'tree_wiki_zh_\u6570\u636e\u5e93_s2',
  }),
  Object.freeze({
    sourceTreeId: 'tree_wiki_en_outline_of_databases_s3_b1',
    targetTreeId: 'tree_wiki_en_outline_of_databases_s3',
  }),
  Object.freeze({
    sourceTreeId: 'tree_wiki_en_monitor_synchronization_s2_s7',
    targetTreeId: 'tree_wiki_en_monitor_synchronization_s2',
  }),
  Object.freeze({
    sourceTreeId: 'tree_wiki_en_dynamic_program_analysis',
    targetTreeId: 'tree_wiki_en_program_analysis_s8',
  }),
]);

export const OVERLAP_TREE_RENAMES = Object.freeze([
  Object.freeze({
    treeNodeId: 'tree_java_source_937c739517d0031f',
    name: 'java.lang.reflect \u6e90\u7801',
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_database_s20',
    name: '\u6570\u636e\u5e93\u5b89\u5168',
  }),
  Object.freeze({
    treeNodeId: 'tree_wiki_en_virtual_machine_s13',
    name: '\u865a\u62df\u673a\u5b89\u5168',
  }),
]);

export const OVERLAP_CHILD_ORDERS = Object.freeze([
  Object.freeze({
    parentTreeId: 'demo_cs',
    anchorTreeId: 'school_computation_theory',
    orderedChildIds: Object.freeze([
      'school_computation_theory',
      'school_security',
    ]),
  }),
]);

export const OVERLAP_NODE_RENAMES = Object.freeze([
  Object.freeze({
    nodeId: 'theory_domain_operating_systems',
    label: '\u64cd\u4f5c\u7cfb\u7edf',
  }),
  Object.freeze({
    nodeId: 'k_wiki_en_database_s20',
    label: '\u6570\u636e\u5e93\u5b89\u5168',
  }),
  Object.freeze({
    nodeId: 'k_wiki_en_virtual_machine_s13',
    label: '\u865a\u62df\u673a\u5b89\u5168',
  }),
]);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function mergeSupplement(source, target) {
  if (!source && !target) return undefined;
  const tabs = [];
  const seenTabs = new Set();
  for (const tab of [...(source?.tabs ?? []), ...(target?.tabs ?? [])]) {
    const signature = JSON.stringify(tab);
    if (seenTabs.has(signature)) continue;
    seenTabs.add(signature);
    tabs.push(structuredClone(tab));
  }
  const notes = unique([source?.notes, target?.notes]).join('\n\n') || undefined;
  return {
    ...structuredClone(source ?? {}),
    ...structuredClone(target ?? {}),
    tabs,
    notes,
  };
}

function matchingChildIndex(children, candidate) {
  return children.findIndex((child) => (
    child.id === candidate.id
    || (child.nodeRef && candidate.nodeRef && child.nodeRef === candidate.nodeRef)
  ));
}

function mergeTreeNodes(source, target, stats) {
  const children = (source.children ?? []).map((child) => structuredClone(child));
  for (const targetChild of target.children ?? []) {
    const index = matchingChildIndex(children, targetChild);
    if (index < 0) {
      children.push(structuredClone(targetChild));
      continue;
    }
    children[index] = mergeTreeNodes(children[index], targetChild, stats);
    stats.duplicateChildEntriesConsolidated += 1;
  }
  return {
    ...structuredClone(source),
    ...structuredClone(target),
    id: target.id,
    name: target.name,
    nodeRef: target.nodeRef,
    count: Math.max(Number(source.count ?? 0), Number(target.count ?? 0)),
    supplement: mergeSupplement(source.supplement, target.supplement),
    children,
  };
}

function findTreeRecord(node, treeNodeId, parent = null) {
  if (node.id === treeNodeId) return { node, parent };
  for (const child of node.children ?? []) {
    const found = findTreeRecord(child, treeNodeId, node);
    if (found) return found;
  }
  return null;
}

function containsTreeNode(node, treeNodeId) {
  return Boolean(findTreeRecord(node, treeNodeId));
}

function consolidateTreeEntry(tree, consolidation, stats) {
  const sourceRecord = findTreeRecord(tree, consolidation.sourceTreeId);
  if (!sourceRecord) return;
  const targetRecord = findTreeRecord(tree, consolidation.targetTreeId);
  if (!targetRecord) {
    throw new Error(`Overlap target tree node is missing: ${consolidation.targetTreeId}`);
  }
  if (!sourceRecord.parent) {
    throw new Error(`Cannot consolidate tree root ${consolidation.sourceTreeId}.`);
  }
  if (containsTreeNode(sourceRecord.node, consolidation.targetTreeId)) {
    throw new Error(
      `Overlap target ${consolidation.targetTreeId} is nested inside source ${consolidation.sourceTreeId}.`,
    );
  }

  const sourceParent = sourceRecord.parent;
  const sourceIndex = sourceParent.children.findIndex(
    (child) => child.id === consolidation.sourceTreeId,
  );
  sourceParent.children.splice(sourceIndex, 1);

  const merged = mergeTreeNodes(sourceRecord.node, targetRecord.node, stats);
  Object.assign(targetRecord.node, merged);
  stats.treeEntriesConsolidated += 1;
  stats.sourceChildrenPreserved += sourceRecord.node.children?.length ?? 0;
}

function applyChildOrder(tree, order, stats) {
  const parentRecord = findTreeRecord(tree, order.parentTreeId);
  if (!parentRecord) return;
  const children = parentRecord.node.children ?? [];
  const orderedIds = new Set(order.orderedChildIds);
  const present = order.orderedChildIds
    .map((childId) => children.find((child) => child.id === childId))
    .filter(Boolean);
  if (present.length < 2) return;

  const anchorIndex = children.findIndex((child) => child.id === order.anchorTreeId);
  if (anchorIndex < 0) {
    throw new Error(`Overlap order anchor is missing: ${order.anchorTreeId}`);
  }
  const insertionIndex = children
    .slice(0, anchorIndex)
    .filter((child) => !orderedIds.has(child.id)).length;
  const remaining = children.filter((child) => !orderedIds.has(child.id));
  const reordered = [
    ...remaining.slice(0, insertionIndex),
    ...present,
    ...remaining.slice(insertionIndex),
  ];
  if (JSON.stringify(reordered.map((child) => child.id)) === JSON.stringify(children.map((child) => child.id))) {
    return;
  }
  parentRecord.node.children = reordered;
  stats.childGroupsReordered += 1;
}

function renameTreeNode(tree, rename, stats) {
  const record = findTreeRecord(tree, rename.treeNodeId);
  if (!record || record.node.name === rename.name) return;
  record.node.name = rename.name;
  stats.treeNodesRenamed += 1;
}

function renameKnowledgeNode(nodePool, rename, stats) {
  const node = nodePool[rename.nodeId];
  if (!node || node.label === rename.label) return;
  const previousLabel = node.label;
  node.label = rename.label;
  node.aliases = unique([...(node.aliases ?? []), previousLabel]);
  node.tags = unique([...(node.tags ?? []), rename.label]);
  if (node.card) node.card.title = rename.label;
  stats.knowledgeNodesRenamed += 1;
}

export function applyOverlapTreeCuration(dataset) {
  const prepared = structuredClone(dataset);
  const stats = {
    treeEntriesConsolidated: 0,
    duplicateChildEntriesConsolidated: 0,
    sourceChildrenPreserved: 0,
    childGroupsReordered: 0,
    treeNodesRenamed: 0,
    knowledgeNodesRenamed: 0,
  };

  for (const consolidation of OVERLAP_TREE_CONSOLIDATIONS) {
    consolidateTreeEntry(prepared.tree, consolidation, stats);
  }
  for (const order of OVERLAP_CHILD_ORDERS) applyChildOrder(prepared.tree, order, stats);
  for (const rename of OVERLAP_TREE_RENAMES) renameTreeNode(prepared.tree, rename, stats);
  for (const rename of OVERLAP_NODE_RENAMES) {
    renameKnowledgeNode(prepared.nodePool, rename, stats);
  }

  return { dataset: prepared, stats };
}
