import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { consolidateTaxonomyProjections } from './consolidate-taxonomy-projections.mjs';

const dataDir = path.resolve('data');

test('taxonomy consolidation is idempotent after the canonical projection is mounted', () => {
  const tree = JSON.parse(fs.readFileSync(path.join(dataDir, 'tree-data.json'), 'utf8'));
  const nodePool = JSON.parse(fs.readFileSync(path.join(dataDir, 'node-pool.json'), 'utf8'));
  const edges = JSON.parse(fs.readFileSync(path.join(dataDir, 'knowledge-edges.json'), 'utf8'));
  const before = JSON.stringify({ tree, nodePool, edges });

  const result = consolidateTaxonomyProjections({ tree, nodePool, edges });

  assert.deepEqual(result.stats, {
    treeEntriesMoved: 0,
    treeEntriesAdded: 0,
    containersRemoved: 0,
    childrenPreserved: 0,
    knowledgeNodesAdded: 0,
    knowledgeNodesUpdated: 0,
  });
  assert.equal(JSON.stringify({ tree: result.tree, nodePool: result.nodePool, edges: result.edges }), before);
});
