export const MYSQL_GLOSSARY_STRUCTURE_VIEW_ID = 'mysql_glossary_structure';

export const MYSQL_FUNCTIONAL_TOPIC_BY_SECTION_ID = Object.freeze({
  mysql_glossary_structure_architecture: 'mysql_topic_architecture',
  mysql_glossary_structure_sql_objects: 'mysql_topic_sql_objects',
  mysql_glossary_structure_storage_engines: 'mysql_topic_storage_engines',
  mysql_glossary_structure_indexes_access: 'mysql_topic_indexes_access',
  mysql_glossary_structure_mvcc_undo: 'mysql_topic_innodb_internals',
  mysql_glossary_structure_transactions_locks: 'mysql_topic_transactions_locks',
  mysql_glossary_structure_tablespaces_files: 'mysql_topic_innodb_internals',
  mysql_glossary_structure_logs_recovery: 'mysql_topic_logs_recovery',
  mysql_glossary_structure_replication_ha: 'mysql_topic_replication_ha',
  mysql_glossary_structure_optimizer_performance: 'mysql_topic_optimizer_performance',
  mysql_glossary_structure_connectors_api: 'mysql_topic_connectors_api',
  mysql_glossary_structure_security_auth: 'mysql_topic_security_auth',
  mysql_glossary_structure_backup_operations: 'mysql_topic_backup_operations',
  mysql_glossary_structure_text_spatial_charset: 'mysql_topic_text_spatial_charset',
  mysql_glossary_structure_misc: 'mysql_topic_uncategorized',
});

const MYSQL_FUNCTIONAL_TOPIC_OVERRIDES = Object.freeze({
  k_dict_qttpkbhf: 'mysql_topic_connectors_api',
});

function findTreeNode(root, treeNodeId) {
  if (root.id === treeNodeId) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, treeNodeId);
    if (found) return found;
  }
  return null;
}

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function functionalTreeId(nodeId) {
  return `mysql_functional_ref_${nodeId}`;
}

function topicByKnowledgeNodeId(mysqlNode) {
  const structureView = (mysqlNode?.viewDimensions ?? []).find(
    (dimension) => dimension.id === MYSQL_GLOSSARY_STRUCTURE_VIEW_ID,
  );
  if (!structureView) {
    throw new Error(`Missing MySQL view dimension ${MYSQL_GLOSSARY_STRUCTURE_VIEW_ID}.`);
  }

  const result = new Map();
  for (const section of structureView.sections ?? []) {
    const topicTreeId = MYSQL_FUNCTIONAL_TOPIC_BY_SECTION_ID[section.id];
    if (!topicTreeId) continue;
    for (const atom of section.atoms ?? []) {
      if (atom.nodeId && !result.has(atom.nodeId)) result.set(atom.nodeId, topicTreeId);
    }
  }
  for (const [nodeId, topicTreeId] of Object.entries(MYSQL_FUNCTIONAL_TOPIC_OVERRIDES)) {
    result.set(nodeId, topicTreeId);
  }
  return result;
}

export function ensureMysqlFunctionalTheoryReferences({
  tree,
  nodePool,
  theoryItems,
  mysqlTreeId = 'demo_mysql',
}) {
  const mysqlRoot = findTreeNode(tree, mysqlTreeId);
  if (!mysqlRoot?.nodeRef) throw new Error(`Missing MySQL tree root ${mysqlTreeId}.`);
  const mysqlNode = nodePool[mysqlRoot.nodeRef];
  if (!mysqlNode) throw new Error(`Missing MySQL knowledge node ${mysqlRoot.nodeRef}.`);

  const topicByNodeId = topicByKnowledgeNodeId(mysqlNode);
  const existingRows = collectTreeNodes(mysqlRoot);
  const existingRefs = new Set(existingRows.map((node) => node.nodeRef).filter(Boolean));
  const allTreeIds = new Set(collectTreeNodes(tree).map((node) => node.id));
  const placements = [];
  const unmappedNodeIds = [];
  let existingReferences = 0;

  for (const item of theoryItems) {
    if (existingRefs.has(item.nodeId)) {
      existingReferences += 1;
      continue;
    }

    const topicTreeId = topicByNodeId.get(item.nodeId);
    if (!topicTreeId) {
      unmappedNodeIds.push(item.nodeId);
      continue;
    }
    const topic = findTreeNode(mysqlRoot, topicTreeId);
    if (!topic?.nodeRef) throw new Error(`Missing MySQL functional topic ${topicTreeId}.`);
    if (!nodePool[item.nodeId]) throw new Error(`Missing theory knowledge node ${item.nodeId}.`);

    const childTreeId = functionalTreeId(item.nodeId);
    if (allTreeIds.has(childTreeId)) {
      throw new Error(`Functional MySQL tree id already exists outside its expected topic: ${childTreeId}.`);
    }
    const child = {
      id: childTreeId,
      name: item.node.label,
      count: 0,
      nodeRef: item.nodeId,
    };
    topic.children = [...(topic.children ?? []), child];
    allTreeIds.add(childTreeId);
    existingRefs.add(item.nodeId);
    placements.push({
      parentTreeId: topic.id,
      parentNodeRef: topic.nodeRef,
      childTreeId,
      childNodeRef: item.nodeId,
    });
  }

  return {
    existingReferences,
    referencesAdded: placements.length,
    unmappedNodeIds,
    placements,
  };
}
