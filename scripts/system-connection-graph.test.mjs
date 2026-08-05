import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSystemConnectionGraph,
  SystemConnectionDirection,
} from '../src/knowledge/systemConnectionGraph.ts';

function knowledgeNode(id, label, relationIndex) {
  return {
    id,
    label,
    relationIndex,
    card: { nodeId: id, title: label, tabs: [] },
  };
}

const nodePool = {
  owner: knowledgeNode('owner', '集合', { rootNodeId: 'array-list' }),
  'array-list': knowledgeNode('array-list', 'ArrayList'),
  list: knowledgeNode('list', 'List'),
  collection: knowledgeNode('collection', 'Collection'),
};

test('relation-index root is folded into its owner system', () => {
  const graph = buildSystemConnectionGraph('owner', nodePool, [
    { id: 'internal', source: 'owner', target: 'array-list', type: 'projection', label: '' },
    { id: 'array-list-list', source: 'array-list', target: 'list', type: 'implements', label: '' },
    { id: 'owner-list', source: 'owner', target: 'list', type: 'uses', label: '' },
    { id: 'list-owner', source: 'list', target: 'owner', type: 'references', label: '' },
    { id: 'collection-array-list', source: 'collection', target: 'array-list', type: 'extends', label: '' },
  ]);

  assert.ok(graph);
  assert.equal(graph.currentSystem.id, 'owner');
  assert.equal(graph.currentSystem.anchorId, 'array-list');
  assert.equal(graph.totalSystemCount, 2);
  assert.equal(graph.totalEdgeCount, 4);
  assert.equal(graph.connectedSystems.some((system) => system.id === 'array-list'), false);

  const list = graph.connectedSystems.find((system) => system.id === 'list');
  assert.equal(list?.direction, SystemConnectionDirection.Bidirectional);
  assert.deepEqual(list?.edgeIds, ['array-list-list', 'list-owner', 'owner-list']);
  assert.deepEqual(list?.relationTypes, ['implements', 'references', 'uses']);

  const collection = graph.connectedSystems.find((system) => system.id === 'collection');
  assert.equal(collection?.direction, SystemConnectionDirection.Incoming);
});

test('system limit is deterministic and reports omitted systems', () => {
  const graph = buildSystemConnectionGraph(
    'owner',
    nodePool,
    [
      { id: 'to-list', source: 'owner', target: 'list', type: 'uses', label: '' },
      { id: 'to-collection', source: 'owner', target: 'collection', type: 'uses', label: '' },
      { id: 'missing', source: 'owner', target: 'missing', type: 'uses', label: '' },
    ],
    { maxSystems: 1 },
  );

  assert.ok(graph);
  assert.equal(graph.totalSystemCount, 2);
  assert.equal(graph.connectedSystems.length, 1);
  assert.equal(graph.connectedSystems[0].id, 'collection');
});

test('missing selection does not create a graph', () => {
  assert.equal(buildSystemConnectionGraph(null, nodePool, []), null);
  assert.equal(buildSystemConnectionGraph('missing', nodePool, []), null);
});
