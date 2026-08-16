import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  CORE_DATA_FILES,
  DATA_DIR,
  createEmptyGovernance,
  generateGovernanceCandidates,
  loadSystemData,
  validateGovernance,
} from './knowledge-governance.mjs';

function fingerprintCoreData() {
  const hash = crypto.createHash('sha256');
  for (const fileName of CORE_DATA_FILES) {
    hash.update(fileName);
    hash.update(fs.readFileSync(path.join(DATA_DIR, fileName)));
  }
  return hash.digest('hex');
}

test('empty governance sidecar follows the non-destructive policy', () => {
  const data = loadSystemData();
  const governance = createEmptyGovernance();
  const result = validateGovernance(governance, data);
  assert.equal(governance.policy.merge.physicalDeletionAllowed, false);
  assert.equal(governance.policy.canonicalParent.maxPerNode, 1);
  assert.equal(governance.policy.projection.doesNotCreateContainment, true);
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('candidate generation creates reviewable governance without mutating core data', () => {
  const before = fingerprintCoreData();
  const data = loadSystemData();
  const governance = generateGovernanceCandidates(data, createEmptyGovernance());
  const after = fingerprintCoreData();
  const result = validateGovernance(governance, data);
  assert.equal(after, before, 'candidate generation must not mutate core data');
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.ok(governance.placements.some((candidate) => candidate.nodeId === 'demo_btree'));
  assert.ok(governance.placements.some((candidate) => candidate.nodeId === 'demo_snapshot'));
  assert.ok(governance.projections.some((candidate) => candidate.kind === 'source-view'));
  assert.ok(governance.mergePlans.length > 0);
  assert.ok(governance.placements.every((candidate) => candidate.status === 'proposed'));
  assert.ok(governance.mergePlans.every((candidate) => candidate.status === 'proposed'));
});

test('governance validation rejects destructive policy and conflicting placements', () => {
  const data = loadSystemData();
  const governance = createEmptyGovernance();
  governance.policy.merge.physicalDeletionAllowed = true;
  governance.placements = [
    { id: 'one', nodeId: 'demo_btree', status: 'proposed', contentStatus: 'canonical', canonicalParentNodeId: null },
    { id: 'two', nodeId: 'demo_btree', status: 'proposed', contentStatus: 'canonical', canonicalParentNodeId: null },
  ];
  const result = validateGovernance(governance, data);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('physical deletion')));
  assert.ok(result.errors.some((message) => message.includes('multiple placement candidates')));
});
