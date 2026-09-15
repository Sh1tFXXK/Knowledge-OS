/**
 * 数据切片形状校验的单元测试（P0 第一项：运行态污染防护的最内层）。
 *
 * 运行：node --experimental-transform-types --test scripts/data-validation.test.mjs
 * 或：  npm test
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeEnvelope,
  inspectEvolutionEvents,
  inspectKnowledgeEdges,
  inspectNodePool,
  inspectQuestions,
  inspectTreeData,
  isErrorEnvelope,
} from '../src/knowledge/dataValidation.ts';

const tab = (id, label, content) => (content === undefined ? { id, label } : { id, label, content });

function node(id, tabs) {
  return { id, label: id, tags: [id], card: { nodeId: id, title: id, tabs } };
}

test('错误信封识别：中间件 400 响应体不得被当成业务数据', () => {
  const envelope = { error: 'Missing file parameter.' };
  assert.equal(isErrorEnvelope(envelope), true);
  assert.match(describeEnvelope(envelope), /Missing file parameter/);

  assert.equal(isErrorEnvelope({ error: 'Access denied.', code: 'EXTERNAL_MODIFICATION' }), true);
  assert.equal(isErrorEnvelope({ ok: true, file: 'node-pool.json' }), false);
});

test('错误信封识别：带业务字段的对象不是信封', () => {
  assert.equal(isErrorEnvelope({ error: 'x', id: 'k1', label: '真节点' }), false);
  assert.equal(isErrorEnvelope({ error: 'x', a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }), false);
  assert.equal(isErrorEnvelope([]), false);
  assert.equal(isErrorEnvelope('Missing file parameter.'), false);
});

test('节点池：错误信封一律 fatal，绝不合并进池', () => {
  const result = inspectNodePool({ error: 'Missing file parameter.' });
  assert.ok(result.fatal, '应给出 fatal');
  assert.match(result.fatal, /错误信封/);
});

test('节点池：非对象顶层 fatal', () => {
  assert.ok(inspectNodePool([]).fatal, '数组不是节点表');
  assert.ok(inspectNodePool('x').fatal);
  assert.ok(inspectNodePool(null).fatal);
});

test('节点池：条目本身不成形 → fatal（这类数据一旦入池必然在渲染层触雷）', () => {
  assert.ok(inspectNodePool({ a: 'Missing file parameter.' }).fatal, '值是字符串');
  assert.ok(inspectNodePool({ a: { id: 'a' } }).fatal, '缺 label');
  assert.ok(inspectNodePool({ a: { id: 'a', label: 'a' } }).fatal, '缺 card');
  assert.ok(inspectNodePool({ a: { id: 'a', label: 42, card: { tabs: [] } } }).fatal, 'label 非字符串');
});

test('节点池：空 tabs 与缺 content 可容忍，但必须上报（不静默丢弃）', () => {
  const result = inspectNodePool({
    a: node('a', [tab('def', '定义', '正文')]),
    b: node('b', []),
    c: node('c', [tab('def', '定义', '正文'), tab('def', '定义')]),
  });
  assert.equal(result.fatal, null, '不应判为不可用');
  assert.equal(result.warnings.length, 2);
  assert.match(result.warnings.join('\n'), /card\.tabs 为空数组/);
  assert.match(result.warnings.join('\n'), /缺少 content 字段/);
});

test('节点池：完全合法的池不产生任何诊断', () => {
  const result = inspectNodePool({ a: node('a', [tab('def', '定义', '正文')]) });
  assert.equal(result.fatal, null);
  assert.deepEqual(result.warnings, []);
});

test('目录树：缺 id/name 或 children 非数组 → fatal', () => {
  assert.equal(inspectTreeData({ id: 'root', name: 'x' }).fatal, null);
  assert.ok(inspectTreeData({ name: 'x' }).fatal);
  assert.ok(inspectTreeData({ id: 'root', name: 'x', children: 'oops' }).fatal);
  assert.ok(inspectTreeData({ error: 'Missing file parameter.' }).fatal);
});

test('数组类切片：非数组 fatal，元素缺必填字段只上报', () => {
  assert.ok(inspectKnowledgeEdges({ error: 'x' }).fatal);
  assert.ok(inspectKnowledgeEdges({}).fatal);
  assert.equal(inspectKnowledgeEdges([{ id: 'e1', source: 'a', target: 'b' }]).fatal, null);

  const edges = inspectKnowledgeEdges([{ id: 'e1', source: 'a' }]);
  assert.equal(edges.fatal, null);
  assert.match(edges.warnings.join('\n'), /target/);

  assert.ok(inspectQuestions([1, 2]).fatal);
  assert.ok(inspectEvolutionEvents('x').fatal);
  assert.equal(inspectEvolutionEvents([]).fatal, null);
});

test('事件：occurredAt 是 epoch 毫秒数（number）时不得被误报为缺字段', () => {
  // 数据模型里 occurredAt: number（timelineEvolution.ts），全库两条真实事件都是数字。
  // 早期版本照搬"必填字符串"校验，会把每一条事件都误报成"缺少 occurredAt 字段"。
  // （evolution-v2 起事件必须带合法 type，fixture 同步补 type:"release"。）
  const ok = inspectEvolutionEvents([
    { id: 'event:spring:4', type: 'release', scopeRootId: 'k_java_fw_spring', occurredAt: 1386806400000 },
  ]);
  assert.equal(ok.fatal, null);
  assert.deepEqual(ok.warnings, []);

  // 兼容历史数据写成日期字符串的情况
  const iso = inspectEvolutionEvents([{ id: 'e', type: 'release', scopeRootId: 'r', occurredAt: '2013-12-12' }]);
  assert.deepEqual(iso.warnings, []);

  // 真正的坏值仍然要报出来
  const bad = inspectEvolutionEvents([
    { id: 'e1', type: 'release', scopeRootId: 'r' },
    { id: 'e2', type: 'release', scopeRootId: 'r', occurredAt: null },
    { id: 'e3', type: 'release', scopeRootId: 'r', occurredAt: '不是日期' },
  ]);
  assert.match(bad.warnings.join('\n'), /3 条事件的 occurredAt 不是有效时间戳/);
});

test('事件：type 缺失或非法 → 上报警告（加载时将被丢弃，操作日志不得复活）', () => {
  // evolution-v2 起只收 release/introduce/deprecate/replace/split/merge；
  // moveNode/renameNode/import/tree-refactor 等仓库操作日志不允许进演化图。
  const badType = inspectEvolutionEvents([
    { id: 'a', type: 'moveNode', scopeRootId: 'r', occurredAt: 1 },
    { id: 'b', scopeRootId: 'r', occurredAt: 2 },
    { id: 'c', type: 'release', scopeRootId: 'r', occurredAt: 3 },
  ]);
  assert.equal(badType.fatal, null);
  assert.match(badType.warnings.join('\n'), /2 条事件的 type 不是合法演化类型/);
});
