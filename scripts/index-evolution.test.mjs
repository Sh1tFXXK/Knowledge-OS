import assert from 'node:assert/strict';
import test from 'node:test';
import {
  annotationsForIndexScope,
  buildIndexEvolutionProjection,
} from '../src/knowledge/indexEvolution.ts';
import { TimelineFacet } from '../src/knowledge/timelineEvolution.ts';

const annotations = [
  {
    id: 'release:1',
    title: 'Release 1',
    capturedAt: 1,
    scopeNodeId: 'root',
    sourceOnlyNodeIds: ['release-note-1'],
    introducedNodes: [{ nodeId: 'new-1', parentNodeId: 'old' }],
    summary: 'first change',
    changes: [{
      targetNodeId: 'old',
      facet: TimelineFacet.Content,
      label: 'content',
      before: 'before',
      after: 'after',
    }],
  },
  {
    id: 'release:2',
    title: 'Release 2',
    capturedAt: 2,
    scopeNodeId: 'root',
    sourceOnlyNodeIds: ['release-note-2'],
    introducedNodes: [{ nodeId: 'new-2', parentNodeId: 'old' }],
    summary: 'second change',
    changes: [{
      targetNodeId: 'old',
      facet: TimelineFacet.Structure,
      label: 'structure',
      before: 'before',
      after: 'after',
    }],
  },
];

test('index evolution hides release notes and reveals introduced knowledge cumulatively', () => {
  const scoped = annotationsForIndexScope(new Set(['root']), annotations);
  assert.deepEqual(scoped.map((annotation) => annotation.id), ['release:1', 'release:2']);

  const stable = buildIndexEvolutionProjection(scoped, null);
  assert.deepEqual(
    [...stable.excludedNodeIds].sort(),
    ['release-note-1', 'release-note-2'],
  );
  assert.deepEqual([...stable.hiddenIntroducedNodeIds].sort(), ['new-1', 'new-2']);

  const first = buildIndexEvolutionProjection(scoped, 'release:1');
  assert.equal(first.hiddenIntroducedNodeIds.has('new-1'), false);
  assert.equal(first.hiddenIntroducedNodeIds.has('new-2'), true);
  assert.deepEqual([...first.currentIntroducedNodeIds], ['new-1']);
  assert.deepEqual([...first.currentChangedNodeIds], ['old']);

  const second = buildIndexEvolutionProjection(scoped, 'release:2');
  assert.equal(second.hiddenIntroducedNodeIds.has('new-1'), false);
  assert.equal(second.hiddenIntroducedNodeIds.has('new-2'), false);
  assert.deepEqual([...second.currentIntroducedNodeIds], ['new-2']);
});
