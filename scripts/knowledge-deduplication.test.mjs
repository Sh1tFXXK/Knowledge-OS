import assert from 'node:assert/strict';
import test from 'node:test';
import { organizeDuplicateKnowledge } from './knowledge-deduplication.mjs';
import {
  buildDuplicateKnowledgeReport,
  extractJavaTypeName,
} from './knowledge-identity.mjs';

function node(id, label, tags, content) {
  return {
    id,
    label,
    tags,
    card: { nodeId: id, title: label, rootContent: content, tabs: [] },
  };
}

test('stable identity merges knowledge bodies while preserving every tree occurrence', () => {
  const full = node('java_iterator', 'Iterator', ['Java', 'java.util.Iterator'], 'Full declaration');
  const placeholder = node(
    'k_java_source_a_s_external_iterator',
    'Iterator',
    ['Java', '外部引用类型', 'java.util.Iterator'],
    '`java.util.Iterator` is referenced externally.',
  );
  const distinct = node('dom_iterator', 'Iterator', ['Java', 'org.w3c.dom.Iterator'], 'DOM iterator');
  const dataset = {
    tree: {
      id: 'root',
      name: 'Root',
      nodeRef: 'root',
      children: [
        { id: 'a', name: 'Collections', nodeRef: full.id },
        { id: 'b', name: 'Source references', nodeRef: placeholder.id },
        { id: 'c', name: 'DOM', nodeRef: distinct.id },
      ],
    },
    nodePool: {
      root: node('root', 'Root', [], ''),
      [full.id]: full,
      [placeholder.id]: placeholder,
      [distinct.id]: distinct,
      dependent: {
        ...node('dependent', 'Dependent', [], ''),
        relationIndex: { rootNodeId: placeholder.id },
      },
    },
    edges: [
      { id: 'e1', source: 'dependent', target: full.id, type: 'uses', label: 'uses' },
      { id: 'e2', source: 'dependent', target: placeholder.id, type: 'uses', label: 'uses' },
      { id: 'e3', source: full.id, target: placeholder.id, type: 'same-as', label: 'same' },
    ],
    questions: [{ id: 'q1', text: 'Iterator?', answered: false, relatedNodeId: placeholder.id }],
    timeline: [{ id: 's1', knowledgeNodeId: placeholder.id, node: placeholder }],
  };

  const result = organizeDuplicateKnowledge(dataset);
  assert.equal(result.stats.groupsMerged, 1);
  assert.equal(result.dataset.nodePool[placeholder.id], undefined);
  assert.equal(result.dataset.nodePool[distinct.id].canonicalKey, undefined);
  assert.equal(result.dataset.tree.children[0].nodeRef, full.id);
  assert.equal(result.dataset.tree.children[1].nodeRef, full.id);
  assert.equal(result.dataset.tree.children[2].nodeRef, distinct.id);
  assert.equal(result.dataset.nodePool[full.id].canonicalKey, 'java:type:java.util.Iterator');
  assert.equal(result.dataset.nodePool[full.id].shared, true);
  assert.equal(result.dataset.questions[0].relatedNodeId, full.id);
  assert.equal(result.dataset.timeline[0].knowledgeNodeId, full.id);
  assert.equal(result.dataset.nodePool.dependent.relationIndex.rootNodeId, full.id);
  assert.equal(result.dataset.edges.length, 1);
  assert.equal(result.stats.duplicateEdgesRemoved, 1);
  assert.equal(result.stats.selfLoopsRemoved, 1);
});

test('same labels without a stable identity remain manual review candidates', () => {
  const dataset = {
    tree: { id: 'root', name: 'Root', nodeRef: 'root', children: [] },
    nodePool: {
      root: node('root', 'Root', [], ''),
      mysql: node('mysql', '事务', ['MySQL'], 'MySQL transaction'),
      redis: node('redis', '事务', ['Redis'], 'Redis transaction'),
    },
    edges: [],
    questions: [],
    timeline: [],
  };
  const result = organizeDuplicateKnowledge(dataset);
  assert.equal(result.stats.groupsMerged, 0);
  assert.equal(result.report.manualReviewGroups.length, 1);
  assert.equal(Object.keys(result.dataset.nodePool).length, 3);
});

test('an explicit canonical target keeps its identity and target-owned projections', () => {
  const canonicalKey = 'concurrency-control:optimistic';
  const compact = {
    ...node('compact', '乐观锁', ['MySQL'], 'Short definition'),
    canonicalKey,
    role: 'mechanism',
    viewDimensions: [{
      id: 'implementation',
      name: '实现',
      color: '#fff',
      sections: [],
    }],
  };
  const rich = {
    ...node('rich', '乐观锁', ['OCC'], 'A much richer general definition'),
    canonicalKey,
  };
  const dataset = {
    tree: {
      id: 'root',
      name: 'Root',
      nodeRef: 'root',
      children: [
        { id: 'mysql-lock', name: 'MySQL', nodeRef: compact.id },
        { id: 'general-lock', name: 'General', nodeRef: rich.id },
      ],
    },
    nodePool: {
      root: node('root', 'Root', [], ''),
      [compact.id]: compact,
      [rich.id]: rich,
    },
    edges: [],
    questions: [],
    timeline: [],
  };

  const result = organizeDuplicateKnowledge(dataset, {
    canonicalTargets: new Map([[canonicalKey, compact.id]]),
  });

  assert.equal(result.dataset.nodePool[rich.id], undefined);
  assert.equal(result.dataset.tree.children[0].nodeRef, compact.id);
  assert.equal(result.dataset.tree.children[1].nodeRef, compact.id);
  assert.equal(result.dataset.nodePool[compact.id].role, 'mechanism');
  assert.equal(result.dataset.nodePool[compact.id].viewDimensions[0].id, 'implementation');
  assert.equal(
    result.dataset.nodePool[compact.id].card.rootContent,
    'A much richer general definition',
  );
});

test('tree binding edges preserve distinct directory occurrences with shared endpoints', () => {
  const parentA = { ...node('parent-a', '事务', [], ''), canonicalKey: 'transaction' };
  const parentB = { ...node('parent-b', '事务', [], ''), canonicalKey: 'transaction' };
  const childA = { ...node('child-a', 'ACID', [], ''), canonicalKey: 'acid' };
  const childB = { ...node('child-b', 'ACID', [], ''), canonicalKey: 'acid' };
  const dataset = {
    tree: {
      id: 'root',
      name: 'Root',
      nodeRef: 'root',
      children: [
        {
          id: 'mysql-transaction',
          name: 'MySQL transaction',
          nodeRef: parentA.id,
          children: [{ id: 'mysql-acid', name: 'ACID', nodeRef: childA.id }],
        },
        {
          id: 'redis-transaction',
          name: 'Redis transaction',
          nodeRef: parentB.id,
          children: [{ id: 'redis-acid', name: 'ACID', nodeRef: childB.id }],
        },
      ],
    },
    nodePool: {
      root: node('root', 'Root', [], ''),
      [parentA.id]: parentA,
      [parentB.id]: parentB,
      [childA.id]: childA,
      [childB.id]: childB,
    },
    edges: [
      {
        id: 'treebind:mysql-transaction:mysql-acid',
        source: parentA.id,
        target: childA.id,
        type: 'belongs-to',
        label: 'contains',
        relationKind: 'structure',
      },
      {
        id: 'treebind:redis-transaction:redis-acid',
        source: parentB.id,
        target: childB.id,
        type: 'belongs-to',
        label: 'contains',
        relationKind: 'structure',
      },
    ],
    questions: [],
    timeline: [],
  };

  const result = organizeDuplicateKnowledge(dataset, {
    canonicalTargets: new Map([
      ['transaction', parentA.id],
      ['acid', childA.id],
    ]),
  });

  assert.deepEqual(
    result.dataset.edges.map((edge) => edge.id).sort(),
    [
      'treebind:mysql-transaction:mysql-acid',
      'treebind:redis-transaction:redis-acid',
    ],
  );
  assert.ok(result.dataset.edges.every((edge) => (
    edge.source === parentA.id && edge.target === childA.id
  )));
  assert.equal(result.stats.duplicateEdgesRemoved, 0);
});

test('Java type inference ignores unrelated qualified names mentioned in prose', () => {
  const summary = node(
    'primitive-summary',
    '原始类型',
    ['Java'],
    '包装类型包括 `java.lang.Short`、`java.lang.Integer` 和 `java.lang.Long`。',
  );
  const shortType = node(
    'short-type',
    'Short',
    ['Java', 'java.lang.Short'],
    'Short wrapper type.',
  );

  assert.equal(extractJavaTypeName(summary), null);
  assert.equal(extractJavaTypeName(shortType), 'java.lang.Short');
});

test('duplicate report exhaustively separates source scopes and mixed identities', () => {
  const dataset = {
    tree: {
      id: 'root-tree',
      name: 'Root',
      nodeRef: 'root',
      children: [
        { id: 'history-a-tree', name: 'History', nodeRef: 'k_wiki_article_a_s1' },
        { id: 'history-b-tree', name: 'History', nodeRef: 'k_wiki_article_b_s2' },
        { id: 'sql-canonical-tree', name: 'SQL', nodeRef: 'sql-canonical' },
        { id: 'sql-legacy-tree', name: 'SQL', nodeRef: 'sql-legacy' },
      ],
    },
    nodePool: {
      root: node('root', 'Root', [], ''),
      k_wiki_article_a_s1: node('k_wiki_article_a_s1', 'History', [], ''),
      k_wiki_article_b_s2: node('k_wiki_article_b_s2', 'History', [], ''),
      'sql-canonical': {
        ...node('sql-canonical', 'SQL', [], ''),
        canonicalKey: 'database:sql',
      },
      'sql-legacy': node('sql-legacy', 'SQL', [], ''),
    },
  };

  const report = buildDuplicateKnowledgeReport(dataset);
  assert.equal(report.totals.duplicateLabelGroups, 2);
  assert.equal(report.totals.sourceScopedLabelGroups, 1);
  assert.equal(report.totals.sameLabelMixedIdentityGroups, 1);
  assert.equal(report.totals.manualReviewGroups, 0);
  assert.equal(report.sourceScopedLabelGroups[0].normalizedLabel, 'history');
  assert.equal(report.sameLabelMixedIdentityGroups[0].normalizedLabel, 'sql');
});

test('a single source-owned Java type receives a source-independent identity', () => {
  const sourceNode = node(
    'k_java_source_a_s_type_service',
    'Service',
    ['Java', 'demo.api.Service'],
    'Service declaration',
  );
  const dataset = {
    tree: {
      id: 'root',
      name: 'Root',
      nodeRef: 'root',
      children: [{ id: 'service-occurrence', name: 'Service', nodeRef: sourceNode.id }],
    },
    nodePool: { root: node('root', 'Root', [], ''), [sourceNode.id]: sourceNode },
    edges: [],
    questions: [],
    timeline: [],
  };
  const result = organizeDuplicateKnowledge(dataset);
  const canonicalId = Object.keys(result.dataset.nodePool).find(
    (id) => id.startsWith('k_java_type_'),
  );
  assert.ok(canonicalId);
  assert.equal(result.stats.groupsMerged, 0);
  assert.equal(result.stats.sourceOwnedJavaIdentitiesCanonicalized, 1);
  assert.equal(result.dataset.tree.children[0].nodeRef, canonicalId);
  assert.equal(result.dataset.nodePool[canonicalId].canonicalKey, 'java:type:demo.api.Service');
});

test('an explicit Java semantic resolution keeps its declared canonical target', () => {
  const manual = node('manual_service', 'Service', ['Service'], 'Manual notes');
  manual.canonicalKey = 'java:type:demo.api.Service';
  const source = node(
    'k_java_type_service',
    'Service',
    ['Java', 'demo.api.Service'],
    'Source declaration',
  );
  source.canonicalKey = 'java:type:demo.api.Service';
  const dataset = {
    tree: {
      id: 'root',
      name: 'Root',
      nodeRef: 'root',
      children: [
        { id: 'manual-occurrence', name: 'Service', nodeRef: manual.id },
        { id: 'source-occurrence', name: 'Service', nodeRef: source.id },
      ],
    },
    nodePool: { root: node('root', 'Root', [], ''), [manual.id]: manual, [source.id]: source },
    edges: [],
    questions: [],
    timeline: [],
  };

  const result = organizeDuplicateKnowledge(dataset, {
    canonicalTargets: new Map([['java:type:demo.api.Service', source.id]]),
  });

  assert.equal(result.redirects[manual.id], source.id);
  assert.ok(result.dataset.nodePool[source.id]);
  assert.equal(result.dataset.nodePool[manual.id], undefined);
});
