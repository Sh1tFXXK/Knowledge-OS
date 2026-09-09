import assert from 'node:assert/strict';
import test from 'node:test';
import { extractSubgraph } from '../src/knowledge/extractSubgraph.ts';

function node(id, label, extra = {}) {
  return {
    id,
    label,
    card: { nodeId: id, title: label, tabs: [] },
    ...extra,
  };
}

function edge(id, source, target, type = 'belongs-to') {
  return { id, source, target, type, label: type };
}

function poolOf(...nodes) {
  return Object.fromEntries(nodes.map((n) => [n.id, n]));
}

const BASE_NODES = [
  node('mvcc', 'MVCC', { role: 'mechanism', dimensions: ['事务'] }),
  node('undo', 'Undo 日志', { role: 'mechanism', dimensions: ['存储'] }),
  node('readview', 'Read View', { role: 'axiom', dimensions: ['事务'] }),
  node('isolation', '隔离级别', { role: 'axiom' }),
  node('deadlock', '死锁', { role: 'conclusion', dimensions: ['事务'] }),
];

const BASE_EDGES = [
  edge('e1', 'mvcc', 'undo', 'needs-for'),
  edge('e2', 'readview', 'mvcc', 'depends-on'),
  edge('e3', 'isolation', 'deadlock', 'leads-to'),
  edge('e4', 'isolation', 'readview', 'belongs-to'),
];

test('global 范围取全部节点，边只保留两端都在池内的', () => {
  const pack = extractSubgraph(poolOf(...BASE_NODES), BASE_EDGES, {
    focus: null,
    scope: 'global',
    dimension: 'all',
  });
  assert.equal(pack.nodes.length, 5);
  assert.equal(pack.edges.length, 4);
  assert.equal(pack.layoutHint, 'force');
  assert.equal(pack.meta.nodeCount, 5);
  // 悬空边（指向不存在的节点）被过滤
  const withDangling = [...BASE_EDGES, edge('e5', 'mvcc', 'ghost')];
  const pack2 = extractSubgraph(poolOf(...BASE_NODES), withDangling, {
    focus: null,
    scope: 'global',
    dimension: 'all',
  });
  assert.equal(pack2.edges.length, 4);
});

test('local 范围 = 焦点 + 推理类型直接邻居（星形）', () => {
  const pack = extractSubgraph(poolOf(...BASE_NODES), BASE_EDGES, {
    focus: 'mvcc',
    scope: 'local',
    dimension: 'all',
  });
  // mvcc 的推理边邻居：undo (e1)、readview (e2)；isolation 不经推理边直连
  assert.deepEqual(
    pack.nodes.map((n) => n.id).sort(),
    ['mvcc', 'readview', 'undo'],
  );
  assert.equal(pack.layoutHint, 'funnel');
  // 焦点在池中不存在或未选焦点时为空
  const empty = extractSubgraph(poolOf(...BASE_NODES), BASE_EDGES, {
    focus: 'ghost',
    scope: 'local',
    dimension: 'all',
  });
  assert.deepEqual(empty.nodes, []);
});

test('neighbor 范围 = 2 跳邻域', () => {
  const pack = extractSubgraph(poolOf(...BASE_NODES), BASE_EDGES, {
    focus: 'readview',
    scope: 'neighbor',
    dimension: 'all',
  });
  // readview -> mvcc(1跳) -> undo(2跳)，readview -> isolation(1跳) -> deadlock(2跳)
  assert.deepEqual(
    pack.nodes.map((n) => n.id).sort(),
    ['deadlock', 'isolation', 'mvcc', 'readview', 'undo'],
  );
  assert.equal(pack.layoutHint, 'neighbor');
});

test('节点按角色分层排序：axiom < mechanism < conclusion < plain', () => {
  const pack = extractSubgraph(poolOf(...BASE_NODES), BASE_EDGES, {
    focus: null,
    scope: 'global',
    dimension: 'all',
  });
  const roles = pack.nodes.map((n) => n.role);
  assert.deepEqual(roles, ['axiom', 'axiom', 'mechanism', 'mechanism', 'conclusion']);
  // zone 只对三个推理角色生效
  const zones = pack.nodes.map((n) => n.zone);
  assert.deepEqual(zones, ['axiom', 'axiom', 'mechanism', 'mechanism', 'conclusion']);
});

test('dimension 切面：无标签节点被 dim 且计入 inactive', () => {
  const pack = extractSubgraph(poolOf(...BASE_NODES), BASE_EDGES, {
    focus: null,
    scope: 'global',
    dimension: '事务',
  });
  // 只有 mvcc/readview/deadlock 标了事务
  assert.equal(pack.meta.activeNodeCount, 3);
  assert.equal(pack.meta.nodeCount, 5);
  const dimmed = pack.nodes.filter((n) => n.dimmed).map((n) => n.id).sort();
  assert.deepEqual(dimmed, ['isolation', 'undo']);
  // [当前行为，是否符合预期待确认]
  // 非 all 维度下，边自身无 dimensions 标签即 dim——即使两端节点都活跃（e2）。
  // extractSubgraph.ts 的 isDimmed(e.dimensions, dimension)：undefined → !includes → dim。
  // 实测影响面：4052 条边里 3051 条（75%）没有 dimensions 字段；其中 2579 条两端节点也无标签。
  // 如果这是「未分类就淡显」的设计，切面视图里大多数边是灰的；如果是 ?.includes 的副作用，
  // 更合理的行为可能是「边无标签时跟随两端节点的 dim 状态」。修复时改断言即可。
  const dimmedEdges = pack.edges.filter((e) => e.dimmed).map((e) => e.id).sort();
  assert.deepEqual(dimmedEdges, ['e1', 'e2', 'e3', 'e4']);
  assert.equal(pack.meta.activeEdgeCount, 0);
  // all 维度不 dim 任何东西
  const allPack = extractSubgraph(poolOf(...BASE_NODES), BASE_EDGES, {
    focus: null,
    scope: 'global',
    dimension: 'all',
  });
  assert.equal(allPack.meta.activeEdgeCount, 4);
});

test('isFocus 只落在焦点节点上', () => {
  const pack = extractSubgraph(poolOf(...BASE_NODES), BASE_EDGES, {
    focus: 'mvcc',
    scope: 'neighbor',
    dimension: 'all',
  });
  assert.deepEqual(pack.nodes.filter((n) => n.isFocus).map((n) => n.id), ['mvcc']);
  assert.equal(pack.meta.focus, 'mvcc');
});
