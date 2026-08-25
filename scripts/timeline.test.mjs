import assert from 'node:assert/strict';
import {
  createKnowledgePointSnapshot,
  getKnowledgePointSnapshotStats,
  normalizeKnowledgePointTimeline,
} from '../src/knowledge/timeline.ts';

const node = {
  id: 'node-1',
  label: 'Original',
  role: 'mechanism',
  tags: ['mvcc'],
  card: {
    nodeId: 'node-1',
    title: 'Original',
    rootContent: 'The original definition.',
    tabs: [{ id: 'def', label: 'Definition', content: 'Definition content.' }],
  },
};

const snapshot = createKnowledgePointSnapshot(node, 'Baseline', 'Initial state', 'snapshot-1', 1000);
node.label = 'Changed later';

assert.equal(snapshot.knowledgeNodeId, 'node-1');
assert.equal(snapshot.title, 'Baseline');
assert.equal(snapshot.capturedAt, 1000);
assert.equal(snapshot.note, 'Initial state');
assert.equal(snapshot.node.label, 'Original');
assert.deepEqual(getKnowledgePointSnapshotStats(snapshot.node), {
  tabCount: 1,
  dimensionCount: 0,
  tagCount: 1,
  hasRootContent: true,
});

const legacy = normalizeKnowledgePointTimeline([{
  id: 'base',
  title: 'Knowledge base',
  capturedAt: 2000,
  data: { nodePool: { 'node-1': node } },
}]);
assert.equal(legacy.length, 1);
assert.equal(legacy[0].knowledgeNodeId, 'node-1');

const snapshotWithSyntheticPage = normalizeKnowledgePointTimeline([{
  id: 'snapshot-with-duplicate',
  knowledgeNodeId: 'node-2',
  title: 'Historical version',
  capturedAt: 3000,
  note: 'Keep this historical metadata',
  node: {
    id: 'node-2',
    label: 'Historical node',
    card: {
      nodeId: 'node-2',
      title: 'Historical node',
      tabs: [{
        id: 'def',
        label: 'Definition',
        content: 'Historical definition.',
        pages: [{
          id: 'def',
          label: '\u901a\u7528\u5b9a\u4e49',
          content: 'Historical definition.',
        }],
      }],
    },
  },
}]);

assert.equal(snapshotWithSyntheticPage.length, 1);
assert.equal(snapshotWithSyntheticPage[0].title, 'Historical version');
assert.equal(snapshotWithSyntheticPage[0].capturedAt, 3000);
assert.equal(snapshotWithSyntheticPage[0].note, 'Keep this historical metadata');
assert.equal('pages' in snapshotWithSyntheticPage[0].node.card.tabs[0], false);

console.log('timeline checks passed');
