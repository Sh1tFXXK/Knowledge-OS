import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EvolutionEventType,
  evolutionEventTypeLabel,
  normalizeEvolutionEvents,
} from '../src/knowledge/timelineEvolution.ts';
import { eventsForIndexScope } from '../src/knowledge/indexEvolution.ts';

/**
 * 回归背景（批次 evolution-v2，2026-09-15 用户裁决）：
 * Timeline 从「知识库操作日志」改为「实体演化图」——evolution-events.json 是唯一事实源，
 * 只收知识事件（release/introduce/deprecate/replace/split/merge）。历史上批次脚本曾把
 * tree-refactor 操作日志写进该文件（occurredAt = 批次运行时刻），本批清退。
 * 判据：normalize 对**无 type 或非法 type** 的条目必须丢弃（不默认兜底），
 * 否则操作日志会以「无类型」形态从旧数据/导入文件复活进演化图。
 */

const knowledgeEvent = (overrides = {}) => ({
  id: 'event:spring:5',
  type: 'release',
  scopeRootId: 'k_java_fw_spring',
  occurredAt: 1506556800000,
  title: 'Spring 5',
  summary: 'Reactive stack.',
  sourceOnlyNodeIds: [],
  introducedNodes: [{ nodeId: 'n1', parentNodeId: 'p1' }],
  changes: [{ targetNodeId: 't1', facet: 'content', before: 'a', after: 'b' }],
  ...overrides,
});

const repoLogEvent = (overrides = {}) => ({
  id: 'event:tree-refactor:t3-p1:1789396485052',
  scopeRootId: 'k_java_fw_spring',
  occurredAt: 1789396485052,
  title: 'T3-P1：asplit_* treeId 语义化',
  summary: '批次留痕（仓库操作日志，非知识事件）',
  sourceOnlyNodeIds: [],
  introducedNodes: [],
  changes: [],
  ...overrides,
});

test('normalize 保留带合法 type 的知识事件并保留全部字段', () => {
  const result = normalizeEvolutionEvents([knowledgeEvent()]);
  assert.equal(result.length, 1);
  const event = result[0];
  assert.equal(event.type, 'release');
  assert.equal(event.title, 'Spring 5');
  assert.equal(event.scopeRootId, 'k_java_fw_spring');
  assert.deepEqual(event.introducedNodes, [{ nodeId: 'n1', parentNodeId: 'p1' }]);
  assert.deepEqual(event.changes, [{ targetNodeId: 't1', facet: 'content', before: 'a', after: 'b' }]);
});

test('normalize 丢弃无 type 的条目（操作日志不得复活）', () => {
  const result = normalizeEvolutionEvents([repoLogEvent(), knowledgeEvent()]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'event:spring:5');
});

test('normalize 丢弃非法 type 的条目（不在六类枚举内）', () => {
  const result = normalizeEvolutionEvents([
    knowledgeEvent({ id: 'e1', type: 'moveNode' }),
    knowledgeEvent({ id: 'e2', type: 'import' }),
    knowledgeEvent({ id: 'e3', type: 42 }),
    knowledgeEvent({ id: 'e4', type: undefined }),
  ]);
  assert.equal(result.length, 0);
});

test('normalize 对六类演化类型全部放行', () => {
  const types = Object.values(EvolutionEventType);
  const result = normalizeEvolutionEvents(
    types.map((type, index) => knowledgeEvent({ id: `e:${type}:${index}`, type })),
  );
  assert.equal(result.length, types.length);
});

test('normalize 容错可选字段缺失（沿用旧行为）', () => {
  const result = normalizeEvolutionEvents([{
    id: 'e:min',
    type: 'deprecate',
    title: 'Applet deprecated',
  }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].scopeRootId, '');
  assert.equal(result[0].occurredAt, 0);
  assert.deepEqual(result[0].sourceOnlyNodeIds, []);
  assert.deepEqual(result[0].introducedNodes, []);
  assert.deepEqual(result[0].changes, []);
});

test('evolutionEventTypeLabel 覆盖六类且返回中文', () => {
  assert.equal(evolutionEventTypeLabel('release'), '发布');
  assert.equal(evolutionEventTypeLabel('introduce'), '引入');
  assert.equal(evolutionEventTypeLabel('deprecate'), '废弃');
  assert.equal(evolutionEventTypeLabel('replace'), '替代');
  assert.equal(evolutionEventTypeLabel('split'), '拆分');
  assert.equal(evolutionEventTypeLabel('merge'), '合并');
});

test('eventsForIndexScope 只按作用域过滤，不因 type 变化', () => {
  const spring = knowledgeEvent({ id: 'e:spring', type: 'release', scopeRootId: 'spring' });
  const java = knowledgeEvent({ id: 'e:java', type: 'introduce', scopeRootId: 'java' });
  const scoped = eventsForIndexScope(new Set(['spring']), [java, spring]);
  assert.equal(scoped.length, 1);
  assert.equal(scoped[0].id, 'e:spring');
});
