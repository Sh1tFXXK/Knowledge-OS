import {
  QUESTION_DIFFICULTY,
  QUESTION_KIND,
  QUESTION_SOURCE_KIND,
  classifyQuestionKind,
  difficultyForQuestionKind,
} from './import/import-standard.mjs';

export const JAVA_INTERVIEW_SOURCE = Object.freeze({
  kind: QUESTION_SOURCE_KIND.Document,
  sourceId: 'java-interview-core-notes',
  sourceTitle: 'Java 面试突击核心笔记',
});

const MYSQL_ROOT_TREE_ID = 'demo_mysql';
const MYSQL_UNCATEGORIZED_ID = 'mysql_topic_uncategorized';
const TREE_BINDING_PREFIX = 'treebind:';
const ALLOWED_ROLES = new Set([
  'axiom',
  'mechanism',
  'conclusion',
  'subsystem',
  'plain',
]);

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function treeIndex(root) {
  const nodes = new Map();
  const parents = new Map();
  const visit = (node, parent = null) => {
    nodes.set(node.id, node);
    if (parent) parents.set(node.id, parent);
    for (const child of node.children ?? []) visit(child, node);
  };
  visit(root);
  return { nodes, parents };
}

function mergeNodeDimensions(source, target) {
  const dimensions = new Set([
    ...(source?.dimensions ?? []),
    ...(target?.dimensions ?? []),
  ]);
  return dimensions.size > 0 ? [...dimensions] : undefined;
}

export function repairTreeBindingEdges(edges, tree, nodePool) {
  const { nodes, parents } = treeIndex(tree);
  const managedChildTreeIds = new Set();
  for (const edge of edges) {
    if (!edge.id.startsWith(TREE_BINDING_PREFIX)) continue;
    const binding = edge.id.slice(TREE_BINDING_PREFIX.length);
    const separator = binding.lastIndexOf(':');
    if (separator < 0) continue;
    managedChildTreeIds.add(binding.slice(separator + 1));
  }

  const stats = {
    staleBindingsRemoved: 0,
    movedBindingsRebuilt: 0,
  };
  const nonBindingEdges = edges.filter((edge) => !edge.id.startsWith(TREE_BINDING_PREFIX));
  const bindings = [];

  for (const childTreeId of managedChildTreeIds) {
    const child = nodes.get(childTreeId);
    const parent = parents.get(childTreeId);
    if (!child?.nodeRef || !parent?.nodeRef) {
      stats.staleBindingsRemoved += 1;
      continue;
    }
    if (child.nodeRef === parent.nodeRef) {
      stats.staleBindingsRemoved += 1;
      continue;
    }
    if (!nodePool[child.nodeRef] || !nodePool[parent.nodeRef]) {
      stats.staleBindingsRemoved += 1;
      continue;
    }

    const id = `${TREE_BINDING_PREFIX}${parent.id}:${child.id}`;
    const previous = edges.find((edge) => (
      edge.id.startsWith(TREE_BINDING_PREFIX)
      && edge.id.endsWith(`:${child.id}`)
    ));
    if (
      !previous
      || previous.id !== id
      || previous.source !== parent.nodeRef
      || previous.target !== child.nodeRef
    ) {
      stats.movedBindingsRebuilt += 1;
    }
    bindings.push({
      id,
      source: parent.nodeRef,
      target: child.nodeRef,
      type: 'belongs-to',
      label: 'contains',
      relationKind: 'structure',
      dimensions: mergeNodeDimensions(nodePool[parent.nodeRef], nodePool[child.nodeRef]),
    });
  }

  return { edges: [...nonBindingEdges, ...bindings], stats };
}

export function repairQuestions(questions, javaInterviewQuestionIds = new Set()) {
  const stats = {
    classified: 0,
    difficultyAssigned: 0,
    sourcesAttached: 0,
    answeredFlagsCorrected: 0,
  };

  const repaired = questions.map((question) => {
    const next = { ...question };
    if (!next.kind) {
      next.kind = classifyQuestionKind(next.text);
      stats.classified += 1;
    }
    if (!next.difficulty) {
      next.difficulty = difficultyForQuestionKind(next.kind);
      stats.difficultyAssigned += 1;
    }
    if (!next.source && javaInterviewQuestionIds.has(next.id)) {
      next.source = { ...JAVA_INTERVIEW_SOURCE };
      stats.sourcesAttached += 1;
    }
    if (next.answered === true && !String(next.answer ?? '').trim()) {
      next.answered = false;
      stats.answeredFlagsCorrected += 1;
    }
    return next;
  });

  return { questions: repaired, stats };
}

export function repairKnowledgeEdges(edges) {
  const treeBindingPairs = new Set(
    edges
      .filter((edge) => edge.id.startsWith(TREE_BINDING_PREFIX) && edge.source !== edge.target)
      .map((edge) => `${edge.source}\u0000${edge.target}`),
  );
  const stats = {
    selfLoopsRemoved: 0,
    duplicateContainmentRemoved: 0,
    treeBindingsTyped: 0,
    duplicateIdsRemoved: 0,
  };
  const seenIds = new Set();
  const repaired = [];

  for (const edge of edges) {
    if (edge.source === edge.target) {
      stats.selfLoopsRemoved += 1;
      continue;
    }
    if (seenIds.has(edge.id)) {
      stats.duplicateIdsRemoved += 1;
      continue;
    }
    const pair = `${edge.source}\u0000${edge.target}`;
    if (
      !edge.id.startsWith(TREE_BINDING_PREFIX)
      && edge.type === 'belongs-to'
      && treeBindingPairs.has(pair)
    ) {
      stats.duplicateContainmentRemoved += 1;
      continue;
    }

    const next = edge.id.startsWith(TREE_BINDING_PREFIX) && edge.relationKind !== 'structure'
      ? { ...edge, relationKind: 'structure' }
      : edge;
    if (next !== edge) stats.treeBindingsTyped += 1;
    seenIds.add(next.id);
    repaired.push(next);
  }

  return { edges: repaired, stats };
}

export function repairTimeline(timeline, nodePool) {
  const repaired = timeline.filter((snapshot) => Boolean(nodePool[snapshot.knowledgeNodeId]));
  return {
    timeline: repaired,
    stats: { staleSnapshotsRemoved: timeline.length - repaired.length },
  };
}

export function normalizeKnowledgeNodeRoles(nodePool) {
  let normalizedRoles = 0;
  let kindsAssigned = 0;

  for (const node of Object.values(nodePool)) {
    if (node.role === 'category') {
      node.role = 'subsystem';
      normalizedRoles += 1;
      if (!node.kind) {
        node.kind = 'concept';
        kindsAssigned += 1;
      }
    } else if (node.role === 'file') {
      node.role = 'plain';
      normalizedRoles += 1;
      if (!node.kind) {
        node.kind = 'entity';
        kindsAssigned += 1;
      }
    }
  }

  return { normalizedRoles, kindsAssigned };
}

export function ensureMysqlUncategorized(tree, nodePool, edges) {
  const stats = { nodeAdded: 0, treeEntryAdded: 0, edgeAdded: 0 };
  const mysqlRoot = findTreeNode(tree, MYSQL_ROOT_TREE_ID);
  if (!mysqlRoot?.nodeRef) {
    throw new Error(`MySQL tree root ${MYSQL_ROOT_TREE_ID} is missing or unbound.`);
  }

  if (!nodePool[MYSQL_UNCATEGORIZED_ID]) {
    nodePool[MYSQL_UNCATEGORIZED_ID] = {
      id: MYSQL_UNCATEGORIZED_ID,
      label: '未分类',
      kind: 'concept',
      role: 'subsystem',
      tags: ['未分类', 'mysql', 'directory-taxonomy'],
      card: {
        nodeId: MYSQL_UNCATEGORIZED_ID,
        title: '未分类',
        tabs: [{
          id: 'definition',
          label: '定义',
          content: '暂时无法稳定归入现有 MySQL 功能目录的知识节点。',
        }],
      },
    };
    stats.nodeAdded += 1;
  }

  mysqlRoot.children ??= [];
  if (!mysqlRoot.children.some((child) => child.id === MYSQL_UNCATEGORIZED_ID)) {
    mysqlRoot.children.push({
      id: MYSQL_UNCATEGORIZED_ID,
      name: '未分类',
      count: 0,
      nodeRef: MYSQL_UNCATEGORIZED_ID,
      children: [],
    });
    stats.treeEntryAdded += 1;
  }

  const edgeId = `${TREE_BINDING_PREFIX}${MYSQL_ROOT_TREE_ID}:${MYSQL_UNCATEGORIZED_ID}`;
  if (!edges.some((edge) => edge.id === edgeId)) {
    edges.push({
      id: edgeId,
      source: mysqlRoot.nodeRef,
      target: MYSQL_UNCATEGORIZED_ID,
      type: 'belongs-to',
      label: 'contains',
      relationKind: 'structure',
    });
    stats.edgeAdded += 1;
  }

  return stats;
}

export function validateDataIntegrity({ tree, nodePool, edges, questions, timeline }) {
  const issues = [];
  const nodeIds = new Set(Object.keys(nodePool));
  const edgeIds = new Set();
  const questionIds = new Set();
  const kindValues = new Set(Object.values(QUESTION_KIND));
  const difficultyValues = new Set(Object.values(QUESTION_DIFFICULTY));

  for (const [key, node] of Object.entries(nodePool)) {
    if (node.id !== key) issues.push(`Node key ${key} does not match embedded id ${node.id}.`);
    if (node.role && !ALLOWED_ROLES.has(node.role)) {
      issues.push(`Node ${key} has invalid role ${node.role}.`);
    }
  }
  for (const treeNode of collectTreeNodes(tree)) {
    if (treeNode.nodeRef && !nodeIds.has(treeNode.nodeRef)) {
      issues.push(`Tree node ${treeNode.id} references missing node ${treeNode.nodeRef}.`);
    }
  }
  for (const edge of edges) {
    if (edgeIds.has(edge.id)) issues.push(`Duplicate edge id ${edge.id}.`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source)) issues.push(`Edge ${edge.id} has missing source ${edge.source}.`);
    if (!nodeIds.has(edge.target)) issues.push(`Edge ${edge.id} has missing target ${edge.target}.`);
    if (edge.source === edge.target) issues.push(`Edge ${edge.id} is a self-loop.`);
  }
  for (const question of questions) {
    if (questionIds.has(question.id)) issues.push(`Duplicate question id ${question.id}.`);
    questionIds.add(question.id);
    if (!kindValues.has(question.kind)) issues.push(`Question ${question.id} has invalid kind.`);
    if (!difficultyValues.has(question.difficulty)) {
      issues.push(`Question ${question.id} has invalid difficulty.`);
    }
    if (question.relatedNodeId && !nodeIds.has(question.relatedNodeId)) {
      issues.push(`Question ${question.id} references missing node ${question.relatedNodeId}.`);
    }
    for (const step of question.answerSteps ?? []) {
      if (!nodeIds.has(step.nodeId)) {
        issues.push(`Question ${question.id} answer step references missing node ${step.nodeId}.`);
      }
    }
  }
  for (const snapshot of timeline) {
    if (!nodeIds.has(snapshot.knowledgeNodeId)) {
      issues.push(`Timeline snapshot ${snapshot.id} references missing node ${snapshot.knowledgeNodeId}.`);
    }
  }
  if (!nodePool[MYSQL_UNCATEGORIZED_ID]) {
    issues.push(`Missing ${MYSQL_UNCATEGORIZED_ID} node.`);
  }
  if (!findTreeNode(tree, MYSQL_UNCATEGORIZED_ID)) {
    issues.push(`Missing ${MYSQL_UNCATEGORIZED_ID} tree entry.`);
  }

  return issues;
}
