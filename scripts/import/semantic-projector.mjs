import crypto from 'node:crypto';
import {
  SEMANTIC_RELATION_KIND,
  semanticDraftStats,
} from './semantic-draft.mjs';

function shortHash(value, length = 12) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, length);
}

function contentForNode(node) {
  return [node.summary, node.details].filter(Boolean).join('\n\n').trim();
}

function earliestLine(node) {
  return Math.min(...node.sourceSpans.map((span) => span.startLine));
}

function chooseNavigationParents(nodes, relations) {
  const nodeOrder = new Map(nodes.map((node, index) => [node.key, index]));
  const candidates = new Map(nodes.map((node) => [node.key, []]));
  for (const relation of relations) {
    if (relation.kind !== SEMANTIC_RELATION_KIND.Structure
      && relation.kind !== SEMANTIC_RELATION_KIND.Classification) {
      continue;
    }
    candidates.get(relation.targetKey).push(relation);
  }

  const parentByKey = new Map();
  for (const node of nodes) {
    const incoming = candidates.get(node.key)
      .sort((left, right) => {
        const leftPriority = left.kind === SEMANTIC_RELATION_KIND.Structure ? 0 : 1;
        const rightPriority = right.kind === SEMANTIC_RELATION_KIND.Structure ? 0 : 1;
        return leftPriority - rightPriority
          || nodeOrder.get(left.sourceKey) - nodeOrder.get(right.sourceKey);
      });
    parentByKey.set(node.key, incoming[0]?.sourceKey ?? null);
  }
  return parentByKey;
}

export function projectSemanticDraft({
  draft,
  sourceId,
  sourceTitle,
  sourceKind,
}) {
  const managedPrefix = `semantic_${shortHash(`${sourceKind}:${sourceId}`, 16)}`;
  const idByKey = new Map(draft.nodes.map((node) => [
    node.key,
    `k_${managedPrefix}_${shortHash(node.key)}`,
  ]));
  const treeIdByKey = new Map(draft.nodes.map((node) => [
    node.key,
    `tree_${managedPrefix}_${shortHash(node.key)}`,
  ]));
  const parentByKey = chooseNavigationParents(draft.nodes, draft.relations);
  const orderedNodes = [...draft.nodes].sort((left, right) => (
    earliestLine(left) - earliestLine(right) || left.label.localeCompare(right.label)
  ));
  const provenanceFor = (sourceSpans) => [{
    sourceId,
    sourceKind,
    sourceTitle,
    spanBasis: 'normalized-markdown-body',
    sourceSpans,
  }];

  const edgeIdByRelation = new Map(draft.relations.map((relation) => [
    relation,
    `edge_${managedPrefix}_${shortHash([
      relation.sourceKey,
      relation.targetKey,
      relation.kind,
    ].join('\u0000'))}`,
  ]));

  const mechanismSpecFor = (node) => {
    if (!node.mechanism) return null;
    const declaredKeys = new Set([
      node.key,
      ...node.mechanism.triggerKeys,
      ...node.mechanism.participantKeys,
      ...node.mechanism.stateKeys,
      ...node.mechanism.outcomeKeys,
      ...node.mechanism.failureKeys,
    ]);
    const relevantRelations = draft.relations.filter((relation) => (
      declaredKeys.has(relation.sourceKey) && declaredKeys.has(relation.targetKey)
    ));
    return {
      phenomenonNodeId: idByKey.get(node.key),
      triggerNodeIds: node.mechanism.triggerKeys.map((key) => idByKey.get(key)),
      participantNodeIds: node.mechanism.participantKeys.map((key) => idByKey.get(key)),
      stateNodeIds: node.mechanism.stateKeys.map((key) => idByKey.get(key)),
      transitionEdgeIds: relevantRelations
        .filter((relation) => [
          SEMANTIC_RELATION_KIND.Causality,
          SEMANTIC_RELATION_KIND.StateTransition,
        ].includes(relation.kind))
        .map((relation) => edgeIdByRelation.get(relation)),
      constraintEdgeIds: relevantRelations
        .filter((relation) => relation.kind === SEMANTIC_RELATION_KIND.Constraint)
        .map((relation) => edgeIdByRelation.get(relation)),
      outcomeNodeIds: node.mechanism.outcomeKeys.map((key) => idByKey.get(key)),
      failureNodeIds: node.mechanism.failureKeys.map((key) => idByKey.get(key)),
    };
  };

  const nodes = orderedNodes.map((node) => {
    const id = idByKey.get(node.key);
    const parentKey = parentByKey.get(node.key);
    const mechanismSpec = mechanismSpecFor(node);
    return {
      id,
      label: node.label,
      kind: node.kind,
      ...(mechanismSpec ? { mechanismSpec } : {}),
      canonicalKey: node.key,
      aliases: node.aliases,
      provenance: provenanceFor(node.sourceSpans),
      tags: [...new Set([node.label, ...node.aliases, ...node.tags])].slice(0, 80),
      parentId: parentKey ? idByKey.get(parentKey) : null,
      treeId: treeIdByKey.get(node.key),
      treeName: node.label,
      card: {
        nodeId: id,
        title: node.label,
        rootContent: contentForNode(node),
        tabs: [],
      },
    };
  });

  const edges = draft.relations.map((relation) => ({
    id: edgeIdByRelation.get(relation),
    source: idByKey.get(relation.sourceKey),
    target: idByKey.get(relation.targetKey),
    type: relation.kind,
    label: relation.label,
    relationKind: relation.kind,
    provenance: provenanceFor(relation.sourceSpans),
  }));

  const questions = draft.questions.map((question) => ({
    text: question.text,
    ...(question.kind ? { kind: question.kind } : {}),
    ...(question.difficulty ? { difficulty: question.difficulty } : {}),
    ...(question.relatedNodeKey ? {
      relatedNodeId: idByKey.get(question.relatedNodeKey),
      sectionTitle: draft.nodes.find((node) => node.key === question.relatedNodeKey)?.label,
    } : {}),
  }));
  const roots = nodes.filter((node) => node.parentId === null);
  const primaryRoot = roots[0] ?? nodes[0];

  return {
    managedPrefix,
    nodes,
    edges,
    questions,
    rootNodeIds: roots.map((node) => node.id),
    rootTreeNodeIds: roots.map((node) => node.treeId),
    nodeId: primaryRoot.id,
    treeNodeId: primaryRoot.treeId,
    stats: semanticDraftStats(draft),
  };
}
