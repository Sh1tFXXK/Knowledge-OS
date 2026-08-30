import {
  buildDuplicateKnowledgeReport,
  javaTypeKnowledgeNodeId,
  preferredKnowledgeNode,
  stableKnowledgeIdentity,
} from './knowledge-identity.mjs';
import { normalizeExplanationCard } from './explanation-content-ownership.mjs';

function uniqueValues(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null))];
}

function uniqueObjects(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = JSON.stringify(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeExplanationItems(items) {
  const byId = new Map();
  for (const item of items.filter(Boolean)) {
    const key = String(item.id ?? item.label ?? JSON.stringify(item));
    const current = byId.get(key);
    if (!current) {
      byId.set(key, structuredClone(item));
      continue;
    }
    if (String(item.content ?? '').length > String(current.content ?? '').length) {
      current.content = item.content;
    }
    current.tags = uniqueValues([...(current.tags ?? []), ...(item.tags ?? [])]);
    current.pages = mergeExplanationItems([...(current.pages ?? []), ...(item.pages ?? [])]);
    current.tabs = mergeExplanationItems([...(current.tabs ?? []), ...(item.tabs ?? [])]);
    if (!current.table && item.table) current.table = structuredClone(item.table);
  }
  return [...byId.values()];
}

function mergeCards(nodes, targetId, label) {
  const cards = nodes.map((node) => node.card).filter(Boolean);
  const richest = [...cards].sort(
    (left, right) => JSON.stringify(right).length - JSON.stringify(left).length,
  )[0] ?? { tabs: [] };
  const rootContents = uniqueValues(cards.map((card) => String(card.rootContent ?? '').trim()).filter(Boolean));
  const notes = uniqueValues(cards.map((card) => String(card.notes ?? '').trim()).filter(Boolean));
  const merged = {
    ...structuredClone(richest),
    nodeId: targetId,
    title: richest.title || label,
    rootContent: rootContents.sort((left, right) => right.length - left.length)[0],
    notes: notes.length > 0 ? notes.join('\n\n') : undefined,
    tabs: mergeExplanationItems(cards.flatMap((card) => card.tabs ?? [])),
    definitionPages: mergeExplanationItems(
      cards.flatMap((card) => card.definitionPages ?? []),
    ),
  };
  return normalizeExplanationCard(merged).card;
}

function mergeNodes(nodes, targetId, identity, occurrenceCount) {
  const preferred = nodes.find((node) => node.id === targetId)
    ?? preferredKnowledgeNode(nodes);
  const label = preferred.label;
  const aliases = uniqueValues([
    ...nodes.flatMap((node) => node.aliases ?? []),
    ...nodes.map((node) => node.label).filter((value) => value !== label),
  ]);
  const merged = {
    ...structuredClone(preferred),
    id: targetId,
    label,
    canonicalKey: identity.kind === 'java-type' ? `java:type:${identity.value}` : identity.value,
    aliases: aliases.length > 0 ? aliases : undefined,
    provenance: uniqueObjects(nodes.flatMap((node) => node.provenance ?? [])),
    tags: uniqueValues(nodes.flatMap((node) => node.tags ?? [])),
    dimensions: uniqueValues(nodes.flatMap((node) => node.dimensions ?? [])),
    viewDimensions: uniqueObjects(nodes.flatMap((node) => node.viewDimensions ?? [])),
    shared: occurrenceCount > 1 || nodes.some((node) => node.shared === true),
    card: mergeCards(nodes, targetId, label),
  };
  if (identity.kind === 'java-type' && !merged.kind) merged.kind = 'entity';
  if (merged.relationIndex) merged.relationIndex.rootNodeId = targetId;
  return merged;
}

function resolveRedirect(id, redirects) {
  let current = id;
  const visited = new Set();
  while (redirects.has(current) && !visited.has(current)) {
    visited.add(current);
    current = redirects.get(current);
  }
  return current;
}

function rewriteIdList(values, redirects) {
  return uniqueValues((values ?? []).map((value) => resolveRedirect(value, redirects)));
}

function rewriteViewDimensions(viewDimensions, redirects) {
  return (viewDimensions ?? []).map((dimension) => ({
    ...dimension,
    sections: (dimension.sections ?? []).map((section) => ({
      ...section,
      atoms: (section.atoms ?? []).map((atom) => ({
        ...atom,
        nodeId: resolveRedirect(atom.nodeId, redirects),
      })),
    })),
    groups: (dimension.groups ?? []).map((group) => ({
      ...group,
      nodeId: group.nodeId ? resolveRedirect(group.nodeId, redirects) : undefined,
      members: rewriteIdList(group.members, redirects),
    })),
  }));
}

function rewriteMechanismSpec(spec, redirects) {
  if (!spec) return spec;
  return {
    ...spec,
    phenomenonNodeId: resolveRedirect(spec.phenomenonNodeId, redirects),
    triggerNodeIds: rewriteIdList(spec.triggerNodeIds, redirects),
    participantNodeIds: rewriteIdList(spec.participantNodeIds, redirects),
    stateNodeIds: rewriteIdList(spec.stateNodeIds, redirects),
    outcomeNodeIds: rewriteIdList(spec.outcomeNodeIds, redirects),
    failureNodeIds: rewriteIdList(spec.failureNodeIds, redirects),
  };
}

function rewriteKnowledgeNode(node, redirects, nodeId = node.id) {
  const rewritten = {
    ...node,
    id: nodeId,
    card: { ...node.card, nodeId },
  };
  if (node.relationIndex) {
    rewritten.relationIndex = {
      ...node.relationIndex,
      rootNodeId: resolveRedirect(node.relationIndex.rootNodeId, redirects),
    };
  }
  if (node.mechanismSpec) {
    rewritten.mechanismSpec = rewriteMechanismSpec(node.mechanismSpec, redirects);
  }
  if (node.viewDimensions) {
    rewritten.viewDimensions = rewriteViewDimensions(node.viewDimensions, redirects);
  }
  return rewritten;
}

function rewriteTree(node, redirects, stats) {
  const next = { ...node };
  if (next.nodeRef) {
    const rewritten = resolveRedirect(next.nodeRef, redirects);
    if (rewritten !== next.nodeRef) stats.treeReferencesRedirected += 1;
    next.nodeRef = rewritten;
  }
  next.children = (next.children ?? []).map((child) => rewriteTree(child, redirects, stats));
  return next;
}

function mergeEdgeMetadata(current, incoming) {
  return {
    ...current,
    dimensions: uniqueValues([...(current.dimensions ?? []), ...(incoming.dimensions ?? [])]),
    provenance: uniqueObjects([...(current.provenance ?? []), ...(incoming.provenance ?? [])]),
  };
}

function rewriteEdges(edges, redirects, stats) {
  const bySignature = new Map();
  for (const edge of edges) {
    const source = resolveRedirect(edge.source, redirects);
    const target = resolveRedirect(edge.target, redirects);
    if (source !== edge.source || target !== edge.target) stats.edgeReferencesRedirected += 1;
    if (source === target) {
      stats.selfLoopsRemoved += 1;
      continue;
    }
    const next = { ...edge, source, target };
    const signature = next.id.startsWith('treebind:')
      ? JSON.stringify({ treeBindingId: next.id })
      : JSON.stringify({
          source,
          target,
          type: next.type,
          label: next.label,
          relationKind: next.relationKind ?? null,
        });
    const current = bySignature.get(signature);
    if (current) {
      bySignature.set(signature, mergeEdgeMetadata(current, next));
      stats.duplicateEdgesRemoved += 1;
    } else {
      bySignature.set(signature, next);
    }
  }
  return [...bySignature.values()];
}

function targetIdForGroup(group, nodePool, canonicalTargets) {
  const canonicalTargetKey = group.identity.kind === 'java-type'
    ? `java:type:${group.identity.value}`
    : group.identity.value;
  const explicitTarget = canonicalTargets.get(canonicalTargetKey);
  if (explicitTarget) {
    if (!group.nodes.some((node) => node.id === explicitTarget)) {
      throw new Error(
        `Canonical target ${explicitTarget} is not a member of ${canonicalTargetKey}.`,
      );
    }
    return explicitTarget;
  }
  if (group.identity.kind === 'java-type') {
    return javaTypeKnowledgeNodeId(nodePool, group.identity.value);
  }
  return preferredKnowledgeNode(group.nodes).id;
}

export function organizeDuplicateKnowledge(dataset, options = {}) {
  const canonicalTargets = options.canonicalTargets ?? new Map();
  const report = buildDuplicateKnowledgeReport(dataset);
  const stats = {
    groupsMerged: 0,
    sourceOwnedJavaIdentitiesCanonicalized: 0,
    nodesRemoved: 0,
    treeReferencesRedirected: 0,
    edgeReferencesRedirected: 0,
    questionReferencesRedirected: 0,
    timelineReferencesRedirected: 0,
    selfLoopsRemoved: 0,
    duplicateEdgesRemoved: 0,
  };
  const redirects = new Map();
  const mergedNodes = new Map();

  const groupsByIdentity = new Map();
  for (const node of Object.values(dataset.nodePool)) {
    const identity = stableKnowledgeIdentity(node);
    if (!identity) continue;
    const current = groupsByIdentity.get(identity.key) ?? { identity, nodes: [] };
    current.nodes.push(node);
    groupsByIdentity.set(identity.key, current);
  }
  const occurrencesByNodeId = new Map();
  const collectOccurrences = (treeNode) => {
    if (treeNode.nodeRef) {
      occurrencesByNodeId.set(
        treeNode.nodeRef,
        (occurrencesByNodeId.get(treeNode.nodeRef) ?? 0) + 1,
      );
    }
    for (const child of treeNode.children ?? []) collectOccurrences(child);
  };
  collectOccurrences(dataset.tree);

  for (const group of groupsByIdentity.values()) {
    const targetId = targetIdForGroup(group, dataset.nodePool, canonicalTargets);
    const needsMerge = group.nodes.length > 1;
    const needsCanonicalJavaId = group.identity.kind === 'java-type'
      && group.nodes.some((node) => node.id.startsWith('k_java_source_'))
      && group.nodes.some((node) => node.id !== targetId);
    if (!needsMerge && !needsCanonicalJavaId) continue;

    const occurrenceCount = group.nodes.reduce(
      (count, node) => count + (occurrencesByNodeId.get(node.id) ?? 0),
      0,
    );
    const existingTarget = dataset.nodePool[targetId];
    const candidates = existingTarget && !group.nodes.some((node) => node.id === targetId)
      ? [...group.nodes, existingTarget]
      : group.nodes;
    mergedNodes.set(
      targetId,
      mergeNodes(candidates, targetId, group.identity, occurrenceCount),
    );
    for (const node of group.nodes) {
      if (node.id !== targetId) redirects.set(node.id, targetId);
    }
    if (needsMerge) stats.groupsMerged += 1;
    if (needsCanonicalJavaId) stats.sourceOwnedJavaIdentitiesCanonicalized += 1;
    stats.nodesRemoved += group.nodes.filter((node) => node.id !== targetId).length;
  }

  const nodePool = {};
  for (const [nodeId, node] of Object.entries(dataset.nodePool)) {
    if (redirects.has(nodeId)) continue;
    nodePool[nodeId] = rewriteKnowledgeNode(node, redirects, nodeId);
  }
  for (const [nodeId, node] of mergedNodes) {
    nodePool[nodeId] = rewriteKnowledgeNode(node, redirects, nodeId);
  }

  const countRedirects = (before, after, key) => {
    if (before !== after) stats[key] += 1;
  };
  const questions = dataset.questions.map((question) => {
    const rewritten = { ...question };
    if (question.relatedNodeId) {
      rewritten.relatedNodeId = resolveRedirect(question.relatedNodeId, redirects);
    }
    if (question.answerSteps) {
      rewritten.answerSteps = question.answerSteps.map((step) => ({
        ...step,
        nodeId: resolveRedirect(step.nodeId, redirects),
      }));
    }
    countRedirects(JSON.stringify(question), JSON.stringify(rewritten), 'questionReferencesRedirected');
    return rewritten;
  });
  const timeline = dataset.timeline.map((snapshot) => {
    const knowledgeNodeId = resolveRedirect(snapshot.knowledgeNodeId, redirects);
    const rewritten = {
      ...snapshot,
      knowledgeNodeId,
      node: snapshot.node
        ? rewriteKnowledgeNode(snapshot.node, redirects, knowledgeNodeId)
        : snapshot.node,
    };
    countRedirects(JSON.stringify(snapshot), JSON.stringify(rewritten), 'timelineReferencesRedirected');
    return rewritten;
  });

  return {
    dataset: {
      tree: rewriteTree(dataset.tree, redirects, stats),
      nodePool,
      edges: rewriteEdges(dataset.edges, redirects, stats),
      questions,
      timeline,
    },
    report,
    redirects: Object.fromEntries(redirects),
    stats,
  };
}
