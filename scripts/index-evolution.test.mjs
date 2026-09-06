import assert from 'node:assert/strict';
import test from 'node:test';
import {
  eventsForIndexScope,
  buildTemporalIndexProjection,
  resolveTemporalContext,
} from '../src/knowledge/indexEvolution.ts';
import { TimelineFacet } from '../src/knowledge/timelineEvolution.ts';
import { normalizeEvolutionEvents } from '../src/knowledge/timelineEvolution.ts';

const events = [
  {
    id: 'event:1',
    scopeRootId: 'root',
    occurredAt: 1,
    title: 'Release 1',
    summary: 'first change',
    sourceOnlyNodeIds: ['release-note-1'],
    introducedNodes: [{ nodeId: 'new-1', parentNodeId: 'old' }],
    changes: [{
      targetNodeId: 'old',
      facet: TimelineFacet.Content,
      before: 'before',
      after: 'after',
    }],
  },
  {
    id: 'event:2',
    scopeRootId: 'root',
    occurredAt: 2,
    title: 'Release 2',
    summary: 'second change',
    sourceOnlyNodeIds: ['release-note-2'],
    introducedNodes: [{ nodeId: 'new-2', parentNodeId: 'old' }],
    changes: [{
      targetNodeId: 'old',
      facet: TimelineFacet.Structure,
      before: 'before',
      after: 'after',
    }],
  },
];

test('index evolution hides release notes and reveals introduced knowledge cumulatively', () => {
  const scoped = eventsForIndexScope(new Set(['root']), events);
  assert.deepEqual(scoped.map((event) => event.id), ['event:1', 'event:2']);

  const stable = buildTemporalIndexProjection(scoped, null);
  assert.deepEqual(
    [...stable.excludedNodeIds].sort(),
    ['release-note-1', 'release-note-2'],
  );
  assert.deepEqual([...stable.hiddenIntroducedNodeIds].sort(), ['new-1', 'new-2']);

  const first = buildTemporalIndexProjection(scoped, 'event:1');
  assert.equal(first.hiddenIntroducedNodeIds.has('new-1'), false);
  assert.equal(first.hiddenIntroducedNodeIds.has('new-2'), true);
  assert.deepEqual([...first.currentIntroducedNodeIds], ['new-1']);
  assert.deepEqual([...first.currentChangedNodeIds], ['old']);

  const second = buildTemporalIndexProjection(scoped, 'event:2');
  assert.equal(second.hiddenIntroducedNodeIds.has('new-1'), false);
  assert.equal(second.hiddenIntroducedNodeIds.has('new-2'), false);
  assert.deepEqual([...second.currentIntroducedNodeIds], ['new-2']);
});

test('resolveTemporalContext follows selection, persists scope event, drops stale ids', () => {
  const base = { events, scopeRootId: 'root' };

  // 跟随选择：选中 change target 或 introduced node 时定位到最新命中事件
  const followed = resolveTemporalContext({
    ...base,
    selectedNodeId: 'new-2',
    lastActiveEventId: null,
    followSelection: true,
  });
  assert.equal(followed.activeEventId, 'event:2');

  const followedChangeTarget = resolveTemporalContext({
    ...base,
    selectedNodeId: 'old',
    lastActiveEventId: null,
    followSelection: true,
  });
  assert.equal(followedChangeTarget.activeEventId, 'event:2');

  // 不跟随时沿用上次选择
  const kept = resolveTemporalContext({
    ...base,
    selectedNodeId: null,
    lastActiveEventId: 'event:1',
    followSelection: false,
  });
  assert.equal(kept.activeEventId, 'event:1');

  // 上次选择不在当前作用域时置空
  const stale = resolveTemporalContext({
    ...base,
    selectedNodeId: null,
    lastActiveEventId: 'event:other-scope',
    followSelection: false,
  });
  assert.equal(stale.activeEventId, null);

  // 无作用域 → 空事件列表
  const noScope = resolveTemporalContext({
    events,
    scopeRootId: null,
    selectedNodeId: 'new-1',
    lastActiveEventId: 'event:1',
    followSelection: true,
  });
  assert.deepEqual(noScope.scopeEvents, []);
  assert.equal(noScope.activeEventId, null);
});

test('normalizeEvolutionEvents drops malformed entries and keeps valid ones', () => {
  const valid = {
    id: 'event:ok',
    scopeRootId: 'root',
    occurredAt: 5,
    title: 'OK',
    summary: 'fine',
    sourceOnlyNodeIds: ['note'],
    introducedNodes: [{ nodeId: 'n', parentNodeId: 'p' }],
    changes: [{ targetNodeId: 't', facet: TimelineFacet.Metadata, before: 'a', after: 'b' }],
  };
  const result = normalizeEvolutionEvents([
    valid,
    { id: 'no-title' },
    null,
    'garbage',
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'event:ok');
  assert.deepEqual(result[0].introducedNodes, [{ nodeId: 'n', parentNodeId: 'p' }]);
  assert.deepEqual(result[0].changes, [
    { targetNodeId: 't', facet: TimelineFacet.Metadata, before: 'a', after: 'b' },
  ]);

  // 非法 facet 的 change 被逐条丢弃，但事件本身保留（防御坏数据不崩工作台）
  const partial = normalizeEvolutionEvents([
    { id: 'bad-facet', title: 'x', changes: [{ targetNodeId: 't', facet: 'nonsense' }] },
  ]);
  assert.equal(partial.length, 1);
  assert.deepEqual(partial[0].changes, []);

  assert.deepEqual(normalizeEvolutionEvents(null), []);
  assert.deepEqual(normalizeEvolutionEvents('x'), []);
});
