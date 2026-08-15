import { createHash } from 'node:crypto';

const JAVA_TYPE_NAME = /^(?:[a-z_$][\w$]*\.)+[A-Z_$][\w$]*(?:\.[A-Z_$][\w$]*)*$/;

export function normalizeIdentityText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function stableDigest(value, length = 16) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, length);
}

function isExternalJavaPlaceholder(node) {
  return (node.tags ?? []).includes('外部引用类型');
}

function knowledgeRichness(node) {
  return JSON.stringify(node.card ?? {}).length;
}

function candidateJavaTypeNames(node) {
  const values = [...(node.tags ?? [])];
  const markdown = [
    node.card?.rootContent,
    node.card?.notes,
  ].filter(Boolean).join('\n');
  for (const match of markdown.matchAll(/`([^`]+)`/g)) values.push(match[1]);
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))]
    .filter((value) => JAVA_TYPE_NAME.test(value));
}

export function extractJavaTypeName(node) {
  const canonicalKey = String(node.canonicalKey ?? '').trim();
  if (canonicalKey.startsWith('java:type:')) {
    const className = canonicalKey.slice('java:type:'.length);
    if (JAVA_TYPE_NAME.test(className)) return className;
  }

  const label = String(node.label ?? '').trim();
  const candidates = candidateJavaTypeNames(node);
  const labelMatches = candidates.filter((className) => className.split('.').at(-1) === label);
  labelMatches.sort((left, right) => left.split('.').length - right.split('.').length);
  return labelMatches[0] ?? null;
}

export function stableKnowledgeIdentity(node) {
  const canonicalKey = String(node.canonicalKey ?? '').trim();
  if (canonicalKey) {
    if (canonicalKey.startsWith('java:type:')) {
      const className = canonicalKey.slice('java:type:'.length);
      return { key: `java:${className}`, kind: 'java-type', value: className };
    }
    return {
      key: `canonical:${canonicalKey}`,
      kind: 'canonical-key',
      value: canonicalKey,
    };
  }
  const javaTypeName = extractJavaTypeName(node);
  return javaTypeName
    ? { key: `java:${javaTypeName}`, kind: 'java-type', value: javaTypeName }
    : null;
}

export function preferredKnowledgeNode(nodes) {
  return [...nodes].sort((left, right) => {
    const leftScore = (left.id.startsWith('k_java_source_') ? 0 : 100000)
      + (isExternalJavaPlaceholder(left) ? 0 : 10000)
      + knowledgeRichness(left);
    const rightScore = (right.id.startsWith('k_java_source_') ? 0 : 100000)
      + (isExternalJavaPlaceholder(right) ? 0 : 10000)
      + knowledgeRichness(right);
    return rightScore - leftScore || left.id.localeCompare(right.id);
  })[0];
}

export function javaTypeKnowledgeNodeId(nodePool, className) {
  const candidates = Object.values(nodePool).filter((node) => {
    const identity = stableKnowledgeIdentity(node);
    return identity?.kind === 'java-type' && identity.value === className;
  });
  const sourceIndependent = candidates.filter(
    (node) => !node.id.startsWith('k_java_source_'),
  );
  return sourceIndependent.length > 0
    ? preferredKnowledgeNode(sourceIndependent).id
    : `k_java_type_${stableDigest(className)}`;
}

export function collectTreeOccurrences(tree) {
  const occurrences = new Map();
  const visit = (node, parentPath) => {
    const path = [...parentPath, node.name];
    if (node.nodeRef) {
      const current = occurrences.get(node.nodeRef) ?? [];
      current.push({ treeNodeId: node.id, path });
      occurrences.set(node.nodeRef, current);
    }
    for (const child of node.children ?? []) visit(child, path);
  };
  visit(tree, []);
  return occurrences;
}

export function sourceScopedNodeKind(node) {
  if (node.id.startsWith('k_java_source_')) return 'java-source-structure';
  if (
    node.id.startsWith('k_wiki_')
    && /_(?:s|b)\d+(?:_|$)/.test(node.id)
  ) {
    return 'wiki-section';
  }
  return null;
}

function describeNode(node, occurrences) {
  const identity = stableKnowledgeIdentity(node);
  return {
    id: node.id,
    label: node.label,
    canonicalKey: node.canonicalKey ?? null,
    javaTypeName: identity?.kind === 'java-type' ? identity.value : null,
    sourceScopeKind: sourceScopedNodeKind(node),
    paths: (occurrences.get(node.id) ?? []).map((item) => item.path),
    contentLength: String(node.card?.rootContent ?? '').trim().length,
  };
}

export function buildDuplicateKnowledgeReport({ tree, nodePool }) {
  const occurrences = collectTreeOccurrences(tree);
  const nodes = Object.values(nodePool);
  const identities = new Map();
  const labels = new Map();

  for (const node of nodes) {
    const identity = stableKnowledgeIdentity(node);
    if (identity) {
      const current = identities.get(identity.key) ?? { identity, nodes: [] };
      current.nodes.push(node);
      identities.set(identity.key, current);
    }
    const label = normalizeIdentityText(node.label);
    const current = labels.get(label) ?? [];
    current.push(node);
    labels.set(label, current);
  }

  const automaticMergeGroups = [...identities.values()]
    .filter((group) => group.nodes.length > 1)
    .map((group) => ({
      identity: group.identity,
      nodes: group.nodes.map((node) => describeNode(node, occurrences)),
    }))
    .sort((left, right) => right.nodes.length - left.nodes.length);

  const reviewGroups = [];
  const distinctIdentityGroups = [];
  const mixedIdentityGroups = [];
  const sourceScopedGroups = [];
  for (const [normalizedLabel, group] of labels) {
    if (group.length < 2) continue;
    const identities = group.map((node) => stableKnowledgeIdentity(node));
    const identifiedCount = identities.filter(Boolean).length;
    const identityKeys = new Set(identities.map((identity) => identity?.key).filter(Boolean));
    const item = {
      normalizedLabel,
      nodes: group.map((node) => describeNode(node, occurrences)),
    };
    if (identityKeys.size > 1) distinctIdentityGroups.push(item);
    else if (identityKeys.size === 1 && identifiedCount < group.length) {
      mixedIdentityGroups.push(item);
    } else if (identityKeys.size === 0) {
      if (group.every((node) => sourceScopedNodeKind(node))) sourceScopedGroups.push(item);
      else reviewGroups.push(item);
    }
  }

  const bySize = (left, right) => right.nodes.length - left.nodes.length;
  reviewGroups.sort(bySize);
  distinctIdentityGroups.sort(bySize);
  mixedIdentityGroups.sort(bySize);
  sourceScopedGroups.sort(bySize);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      nodes: nodes.length,
      duplicateLabelGroups: [...labels.values()].filter((group) => group.length > 1).length,
      automaticMergeGroups: automaticMergeGroups.length,
      manualReviewGroups: reviewGroups.length,
      sameLabelDistinctIdentityGroups: distinctIdentityGroups.length,
      sameLabelMixedIdentityGroups: mixedIdentityGroups.length,
      sourceScopedLabelGroups: sourceScopedGroups.length,
    },
    automaticMergeGroups,
    sameLabelDistinctIdentityGroups: distinctIdentityGroups,
    sameLabelMixedIdentityGroups: mixedIdentityGroups,
    sourceScopedLabelGroups: sourceScopedGroups,
    manualReviewGroups: reviewGroups,
  };
}
