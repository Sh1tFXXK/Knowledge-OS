const CURATION = Object.freeze({
  hashMap: 'k_1785463930010_invjhq',
  treeMap: 'k_1785669524969_nkpajb',
  mixedMap: 'k_1786353277269_msn0ma8u9',
  mixedMapTree: 'tree_1786353277269_msn0ma8va',
  operator: 'k_1783257396123_5jl7e4',
  duplicateOperator: 'k_1783257472821_qkhnyb',
  duplicateOperatorTree: 'tree_1783257472852_p2hjqx',
  cacheBreakdown: 'k_1786340543087_8xkvg2',
  cacheBreakdownTree: 'tree_1786340543323_fn7slv',
  arrayList: 'k_demo_java_array_list',
  orphanArrayListMethods: 'k_1785598529307_5vm533',
  orphanTreeMap: 'k_1785595217285_b3foak',
  programmingLanguageTheory: 'theory_domain_programming_language_theory',
  cursorTermTree: 'mysql_term_programming_language_theory_cursor_1dm61e',
  cursorTerm: 'k_dict_a7bwz8vl',
  invalidJavaPlaceholders: [
    'k_java_type_49d4256a230efe07',
    'k_java_type_615d9c2350ad9a9e',
    'k_java_type_ffed369e4da285ad',
    'k_java_type_5797a65e7e45da08',
    'k_java_type_aff628d1353e2739',
    'k_java_type_ee54da1503855f44',
  ],
  happensBefore: 'k_1783106326946_m9gxsx',
  duplicateHappensBefore: 'k_1785931019996_6wqiay',
  duplicateHappensBeforeTree: 'tree_1785931020220_nv2thq',
  redundantTreeEntries: [
    'mysql_term_compiler_principles_nosql_ibc5bh',
    'tree_wiki_en_outline_of_databases_s16_b1',
  ],
  redundantTreeContainers: [
    'tree_wiki_en_database',
  ],
});

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function addTab(node, tab) {
  if (!tab) return false;
  node.card.tabs ??= [];
  if (node.card.tabs.some((item) => item.id === tab.id)) return false;
  node.card.tabs.push(structuredClone(tab));
  return true;
}

function removeTreeNodes(node, removedTreeIds, unwrappedTreeIds = new Set()) {
  let removed = 0;
  let unwrapped = 0;
  const children = [];
  for (const child of node.children ?? []) {
    if (unwrappedTreeIds.has(child.id)) {
      const result = removeTreeNodes(child, removedTreeIds, unwrappedTreeIds);
      removed += result.removed;
      unwrapped += result.unwrapped + 1;
      children.push(...result.tree.children);
      continue;
    }
    if (removedTreeIds.has(child.id)) {
      removed += 1;
      continue;
    }
    const result = removeTreeNodes(child, removedTreeIds, unwrappedTreeIds);
    removed += result.removed;
    unwrapped += result.unwrapped;
    children.push(result.tree);
  }
  return { tree: { ...node, children }, removed, unwrapped };
}

function renameTreeNode(node, treeNodeId, name) {
  if (node.id === treeNodeId) {
    if (node.name === name) return { tree: node, renamed: false };
    return { tree: { ...node, name }, renamed: true };
  }
  let renamed = false;
  const children = (node.children ?? []).map((child) => {
    const result = renameTreeNode(child, treeNodeId, name);
    renamed ||= result.renamed;
    return result.tree;
  });
  return { tree: { ...node, children }, renamed };
}

function findTreeNode(node, treeNodeId) {
  if (node.id === treeNodeId) return node;
  for (const child of node.children ?? []) {
    const found = findTreeNode(child, treeNodeId);
    if (found) return found;
  }
  return null;
}

function detachTreeNode(node, treeNodeId) {
  const index = (node.children ?? []).findIndex((child) => child.id === treeNodeId);
  if (index >= 0) return node.children.splice(index, 1)[0];
  for (const child of node.children ?? []) {
    const found = detachTreeNode(child, treeNodeId);
    if (found) return found;
  }
  return null;
}

function moveTreeNode(root, treeNodeId, targetParentId) {
  const target = findTreeNode(root, targetParentId);
  if (!target) throw new Error(`Curation target tree node is missing: ${targetParentId}`);
  if ((target.children ?? []).some((child) => child.id === treeNodeId)) return false;
  const moved = detachTreeNode(root, treeNodeId);
  if (!moved) throw new Error(`Curation source tree node is missing: ${treeNodeId}`);
  target.children ??= [];
  target.children.push(moved);
  return true;
}

function collectTreeRefs(tree, refs = new Set()) {
  if (tree.nodeRef) refs.add(tree.nodeRef);
  for (const child of tree.children ?? []) collectTreeRefs(child, refs);
  return refs;
}

function referencedNodeIds(dataset, ignoredOwnerIds = new Set()) {
  const refs = collectTreeRefs(dataset.tree);
  for (const edge of dataset.edges) {
    refs.add(edge.source);
    refs.add(edge.target);
  }
  for (const question of dataset.questions) {
    if (question.relatedNodeId) refs.add(question.relatedNodeId);
    for (const step of question.answerSteps ?? []) refs.add(step.nodeId);
  }
  for (const snapshot of dataset.timeline) refs.add(snapshot.knowledgeNodeId);
  for (const node of Object.values(dataset.nodePool)) {
    if (ignoredOwnerIds.has(node.id)) continue;
    if (node.relationIndex?.rootNodeId) refs.add(node.relationIndex.rootNodeId);
    const mechanism = node.mechanismSpec;
    if (mechanism) {
      refs.add(mechanism.phenomenonNodeId);
      for (const key of [
        'triggerNodeIds',
        'participantNodeIds',
        'stateNodeIds',
        'outcomeNodeIds',
        'failureNodeIds',
      ]) {
        for (const nodeId of mechanism[key] ?? []) refs.add(nodeId);
      }
    }
    for (const dimension of node.viewDimensions ?? []) {
      for (const section of dimension.sections ?? []) {
        for (const atom of section.atoms ?? []) refs.add(atom.nodeId);
      }
      for (const group of dimension.groups ?? []) {
        if (group.nodeId) refs.add(group.nodeId);
        for (const nodeId of group.members ?? []) refs.add(nodeId);
      }
    }
  }
  return refs;
}

function requireNodes(nodePool, nodeIds) {
  for (const nodeId of nodeIds) {
    if (!nodePool[nodeId]) throw new Error(`Required curation node is missing: ${nodeId}`);
  }
}

function migrateHappensBeforeSummary(nodePool, stats) {
  const source = nodePool[CURATION.duplicateHappensBefore];
  const target = nodePool[CURATION.happensBefore];
  if (!source || !target) return;
  target.card ??= { nodeId: target.id, title: target.label, tabs: [] };
  target.card.tabs ??= [];
  const tabId = 'curated_happens_before_rules_summary';
  if (!target.card.tabs.some((tab) => tab.id === tabId)) {
    target.card.tabs.push({
      id: tabId,
      label: '规则汇总',
      content: source.card?.rootContent ?? '',
      tags: ['JMM', 'happens-before', '数据整理'],
    });
    stats.happensBeforeContentMigrated += 1;
  }
}

export function applyKnownDataCuration(dataset) {
  const tree = structuredClone(dataset.tree);
  const nodePool = structuredClone(dataset.nodePool);
  let edges = structuredClone(dataset.edges);
  let questions = structuredClone(dataset.questions);
  let timeline = structuredClone(dataset.timeline);
  const stats = {
    mapTabsRedistributed: 0,
    mapQuestionsRedirected: 0,
    mixedMapNodeRemoved: 0,
    duplicateOperatorRemoved: 0,
    cacheBreakdownRenamed: 0,
    invalidJavaPlaceholdersRemoved: 0,
    orphanContentMigrated: 0,
    emptyOrphansRemoved: 0,
    theoryEntriesMoved: 0,
    treeEntriesRemoved: 0,
    treeContainersUnwrapped: 0,
    incidentEdgesRemoved: 0,
    timelineSnapshotsRemoved: 0,
    happensBeforeContentMigrated: 0,
    happensBeforeNodeRemoved: 0,
  };

  const mixedMap = nodePool[CURATION.mixedMap];
  if (mixedMap) {
    requireNodes(nodePool, [CURATION.hashMap, CURATION.treeMap]);
    const hashMap = nodePool[CURATION.hashMap];
    const treeMap = nodePool[CURATION.treeMap];
    const redBlackTreeTab = mixedMap.card?.tabs?.find((tab) => tab.id === 'jimi-8');
    const concurrentLoopTab = mixedMap.card?.tabs?.find((tab) => tab.id === 'jimi-17');
    if (addTab(treeMap, redBlackTreeTab)) stats.mapTabsRedistributed += 1;
    if (addTab(hashMap, concurrentLoopTab)) stats.mapTabsRedistributed += 1;
    hashMap.canonicalKey = 'java:type:java.util.HashMap';
    treeMap.canonicalKey = 'java:type:java.util.TreeMap';
    hashMap.kind ??= 'entity';
    treeMap.kind ??= 'entity';
    hashMap.tags = unique([...(hashMap.tags ?? []), 'Java面试突击']);
    treeMap.tags = unique([...(treeMap.tags ?? []), 'Java面试突击']);
    questions = questions.map((question) => {
      if (question.relatedNodeId !== CURATION.mixedMap) return question;
      stats.mapQuestionsRedirected += 1;
      return { ...question, relatedNodeId: CURATION.hashMap };
    });
    delete nodePool[CURATION.mixedMap];
    stats.mixedMapNodeRemoved = 1;
  }

  if (nodePool[CURATION.duplicateOperator]) {
    requireNodes(nodePool, [CURATION.operator]);
    delete nodePool[CURATION.duplicateOperator];
    stats.duplicateOperatorRemoved = 1;
  }

  const cacheBreakdown = nodePool[CURATION.cacheBreakdown];
  if (cacheBreakdown) {
    const nextLabel = 'redis击穿';
    if (cacheBreakdown.label !== nextLabel || cacheBreakdown.card?.title !== nextLabel) {
      cacheBreakdown.label = nextLabel;
      cacheBreakdown.card.title = nextLabel;
      cacheBreakdown.tags = unique([
        ...(cacheBreakdown.tags ?? []).filter((tag) => tag !== 'redis穿透'),
        nextLabel,
        '缓存击穿',
      ]);
      stats.cacheBreakdownRenamed = 1;
    }
  }

  const removedNodeIds = new Set([
    ...(stats.mixedMapNodeRemoved ? [CURATION.mixedMap] : []),
    ...(stats.duplicateOperatorRemoved ? [CURATION.duplicateOperator] : []),
  ]);

  migrateHappensBeforeSummary(nodePool, stats);
  if (nodePool[CURATION.duplicateHappensBefore]) {
    delete nodePool[CURATION.duplicateHappensBefore];
    removedNodeIds.add(CURATION.duplicateHappensBefore);
    stats.happensBeforeNodeRemoved = 1;
  }

  const orphanArrayListMethods = nodePool[CURATION.orphanArrayListMethods];
  if (orphanArrayListMethods) {
    requireNodes(nodePool, [CURATION.arrayList]);
    const arrayList = nodePool[CURATION.arrayList];
    const migrated = addTab(arrayList, {
      id: 'curated_array_list_common_methods',
      label: '常用方法',
      content: orphanArrayListMethods.card?.rootContent ?? '',
      tags: ['ArrayList', '方法索引', '数据整理'],
    });
    if (migrated) stats.orphanContentMigrated += 1;
    delete nodePool[CURATION.orphanArrayListMethods];
    removedNodeIds.add(CURATION.orphanArrayListMethods);
  }

  if (nodePool[CURATION.orphanTreeMap]) {
    delete nodePool[CURATION.orphanTreeMap];
    removedNodeIds.add(CURATION.orphanTreeMap);
    stats.emptyOrphansRemoved += 1;
  }

  const invalidJavaPlaceholderIds = new Set(CURATION.invalidJavaPlaceholders);
  const refs = referencedNodeIds(
    { tree, nodePool, edges, questions, timeline },
    invalidJavaPlaceholderIds,
  );
  for (const nodeId of CURATION.invalidJavaPlaceholders) {
    if (!nodePool[nodeId]) continue;
    if (refs.has(nodeId)) {
      throw new Error(`Invalid Java placeholder is still referenced: ${nodeId}`);
    }
    delete nodePool[nodeId];
    removedNodeIds.add(nodeId);
    stats.invalidJavaPlaceholdersRemoved += 1;
  }

  const removedTreeIds = new Set([
    ...(stats.mixedMapNodeRemoved ? [CURATION.mixedMapTree] : []),
    ...(stats.duplicateOperatorRemoved ? [CURATION.duplicateOperatorTree] : []),
    ...(stats.happensBeforeNodeRemoved ? [CURATION.duplicateHappensBeforeTree] : []),
    ...CURATION.redundantTreeEntries,
  ]);
  const treeResult = removeTreeNodes(
    tree,
    removedTreeIds,
    new Set(CURATION.redundantTreeContainers),
  );
  stats.treeEntriesRemoved += treeResult.removed;
  stats.treeContainersUnwrapped += treeResult.unwrapped;
  let curatedTree = treeResult.tree;
  const renamedTree = renameTreeNode(
    curatedTree,
    CURATION.cacheBreakdownTree,
    'redis击穿',
  );
  curatedTree = renamedTree.tree;

  const cursorTreeNode = findTreeNode(curatedTree, CURATION.cursorTermTree);
  if (cursorTreeNode && moveTreeNode(
    curatedTree,
    CURATION.cursorTermTree,
    CURATION.programmingLanguageTheory,
  )) {
    stats.theoryEntriesMoved += 1;
  }

  const edgesBefore = edges.length;
  edges = edges.filter((edge) => (
    !removedNodeIds.has(edge.source) && !removedNodeIds.has(edge.target)
  ));
  stats.incidentEdgesRemoved = edgesBefore - edges.length;
  if (stats.theoryEntriesMoved > 0) {
    edges = edges.filter((edge) => edge.target !== CURATION.cursorTerm || edge.type !== 'belongs-to');
    edges.push({
      id: `treebind:${CURATION.programmingLanguageTheory}:${CURATION.cursorTermTree}`,
      source: CURATION.programmingLanguageTheory,
      target: CURATION.cursorTerm,
      type: 'belongs-to',
      label: 'contains',
      relationKind: 'structure',
      dimensions: ['storage'],
    });
  }
  const timelineBefore = timeline.length;
  timeline = timeline
    .filter((snapshot) => !removedNodeIds.has(snapshot.knowledgeNodeId)
      || snapshot.knowledgeNodeId === CURATION.duplicateHappensBefore)
    .map((snapshot) => snapshot.knowledgeNodeId === CURATION.duplicateHappensBefore
      ? { ...snapshot, knowledgeNodeId: CURATION.happensBefore }
      : snapshot);
  stats.timelineSnapshotsRemoved = timelineBefore - timeline.length;

  return {
    dataset: { tree: curatedTree, nodePool, edges, questions, timeline },
    stats,
  };
}
