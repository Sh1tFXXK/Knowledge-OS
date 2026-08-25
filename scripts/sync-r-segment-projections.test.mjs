import assert from 'node:assert/strict';
import test from 'node:test';
import {
  R_SEGMENT_NODE_IDS,
  projectionDescription,
  syncRSegmentProjectionDescriptions,
} from './sync-r-segment-projections.mjs';

function canonicalNode(nodeId, body) {
  return {
    id: nodeId,
    card: {
      tabs: [{
        id: 'def',
        content: `**Label**\n\u82f1\u6587\uff1aLabel\n\u4e2d\u6587\uff1aLabel\n\n${body}\n\n\u6765\u6e90\uff1asource`,
      }],
    },
  };
}

test('R-segment projection descriptions follow canonical bodies without touching other atoms', () => {
  const nodePool = Object.fromEntries(
    R_SEGMENT_NODE_IDS.map((nodeId, index) => [nodeId, canonicalNode(nodeId, `body ${index}`)]),
  );
  nodePool.owner = {
    id: 'owner',
    viewDimensions: [{
      sections: [{
        atoms: [
          { nodeId: R_SEGMENT_NODE_IDS[1], desc: 'displaced' },
          { nodeId: R_SEGMENT_NODE_IDS[1], desc: 'also displaced' },
          { nodeId: 'unrelated', desc: 'keep me' },
        ],
      }],
    }],
  };

  const first = syncRSegmentProjectionDescriptions(nodePool);
  assert.equal(first.observedProjections, 2);
  assert.equal(first.projectionsUpdated, 2);
  assert.deepEqual(first.missingCanonicalNodeIds, []);
  assert.equal(
    nodePool.owner.viewDimensions[0].sections[0].atoms[0].desc,
    projectionDescription(nodePool[R_SEGMENT_NODE_IDS[1]]),
  );
  assert.equal(nodePool.owner.viewDimensions[0].sections[0].atoms[2].desc, 'keep me');

  const second = syncRSegmentProjectionDescriptions(nodePool);
  assert.equal(second.observedProjections, 2);
  assert.equal(second.projectionsUpdated, 0);
});
