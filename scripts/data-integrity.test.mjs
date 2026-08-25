import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ensureMysqlUncategorized,
  normalizeKnowledgeNodeRoles,
  repairKnowledgeEdges,
  repairQuestions,
  repairTreeBindingEdges,
  repairTimeline,
  validateDataIntegrity,
} from './data-integrity.mjs';
import { normalizeExplanationContentOwnership } from './explanation-content-ownership.mjs';

function node(id, role = 'plain') {
  return {
    id,
    label: id,
    role,
    tags: [id],
    card: { nodeId: id, title: id, tabs: [] },
  };
}

test('data integrity repair fixes deterministic cross-file violations', () => {
  const tree = {
    id: 'universe',
    name: 'Universe',
    nodeRef: 'root',
    children: [{ id: 'demo_mysql', name: 'MySQL', nodeRef: 'mysql', children: [] }],
  };
  const nodePool = {
    root: node('root'),
    mysql: node('mysql'),
    child: node('child', 'file'),
  };
  const edges = [
    { id: 'legacy', source: 'mysql', target: 'child', type: 'belongs-to', label: 'contains' },
    { id: 'treebind:demo_mysql:child', source: 'mysql', target: 'child', type: 'belongs-to', label: 'contains' },
    { id: 'loop', source: 'child', target: 'child', type: 'belongs-to', label: 'contains' },
  ];
  const questions = [{ id: 'q1', text: '为什么需要索引？', answered: true, relatedNodeId: 'child' }];
  const timeline = [
    { id: 'valid', knowledgeNodeId: 'child', title: 'valid', capturedAt: 1, node: nodePool.child },
    { id: 'stale', knowledgeNodeId: 'missing', title: 'stale', capturedAt: 2, node: node('missing') },
  ];

  ensureMysqlUncategorized(tree, nodePool, edges);
  normalizeKnowledgeNodeRoles(nodePool);
  const questionResult = repairQuestions(questions, new Set(['q1']));
  const initialEdgeResult = repairKnowledgeEdges(edges);
  const bindingResult = repairTreeBindingEdges(initialEdgeResult.edges, tree, nodePool);
  const edgeResult = repairKnowledgeEdges(bindingResult.edges);
  const timelineResult = repairTimeline(timeline, nodePool);
  const repaired = {
    tree,
    nodePool,
    edges: edgeResult.edges,
    questions: questionResult.questions,
    timeline: timelineResult.timeline,
  };

  assert.deepEqual(validateDataIntegrity(repaired), []);
  assert.equal(nodePool.child.role, 'plain');
  assert.equal(nodePool.child.kind, 'entity');
  assert.equal(questionResult.questions[0].answered, false);
  assert.equal(questionResult.questions[0].source.sourceId, 'java-interview-core-notes');
  assert.equal(edgeResult.edges.some((edge) => edge.id === 'legacy'), false);
  assert.equal(edgeResult.edges.some((edge) => edge.id === 'loop'), false);
  assert.equal(timelineResult.timeline.length, 1);
});

test('tree binding repair follows the current parent without creating unmanaged bindings', () => {
  const tree = {
    id: 'root-tree',
    name: 'Root',
    nodeRef: 'root',
    children: [
      { id: 'old-parent', name: 'Old', nodeRef: 'old', children: [] },
      {
        id: 'new-parent',
        name: 'New',
        nodeRef: 'new',
        children: [
          { id: 'managed-child', name: 'Managed', nodeRef: 'managed', children: [] },
          { id: 'unmanaged-child', name: 'Unmanaged', nodeRef: 'unmanaged', children: [] },
        ],
      },
    ],
  };
  const nodePool = {
    root: node('root'),
    old: node('old'),
    new: node('new'),
    managed: node('managed'),
    unmanaged: node('unmanaged'),
  };
  const result = repairTreeBindingEdges([
    {
      id: 'treebind:old-parent:managed-child',
      source: 'old',
      target: 'managed',
      type: 'belongs-to',
      label: 'contains',
    },
  ], tree, nodePool);

  assert.deepEqual(result.edges.map((edge) => edge.id), [
    'treebind:new-parent:managed-child',
  ]);
  assert.equal(result.edges[0].source, 'new');
  assert.equal(result.stats.movedBindingsRebuilt, 1);
  assert.equal(result.edges.some((edge) => edge.id.includes('unmanaged-child')), false);
});

test('content ownership repair removes synthetic child mirrors without changing the parent body', () => {
  const tree = { id: 'root', name: 'Root', children: [] };
  const nodePool = {
    topic: {
      ...node('topic'),
      card: {
        nodeId: 'topic',
        title: 'Topic',
        tabs: [{
          id: 'overview',
          label: 'Overview',
          content: 'owned by the tab',
          pages: [{
            id: 'overview',
            label: '通用页面',
            content: 'owned by the tab',
          }],
        }],
      },
    },
  };

  const result = normalizeExplanationContentOwnership({ tree, nodePool });

  assert.equal(result.nodePool.topic.card.tabs[0].content, 'owned by the tab');
  assert.equal(result.nodePool.topic.card.tabs[0].pages, undefined);
  assert.equal(result.stats.removed, 1);
});
