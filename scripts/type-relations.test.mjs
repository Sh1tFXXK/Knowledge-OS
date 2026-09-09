import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TypeRelationKind,
} from '../src/types.ts';
import {
  TypeRelationOrigin,
  collectDirectTypeRelations,
  hasDirectTypeRelation,
  resolveTypeRelationGraph,
  resolveTypeRelationProjections,
  wouldIntroduceTypeRelationCycle,
  typeRelationLabel,
} from '../src/knowledge/typeRelations.ts';

function edge(
  id,
  source,
  target,
  type = TypeRelationKind.Implements,
) {
  return { id, source, target, type, label: type };
}

test('collectDirectTypeRelations 只认 implements/extends 边且可按源过滤', () => {
  const edges = [
    edge('e1', 'A', 'B', TypeRelationKind.Implements),
    edge('e2', 'A', 'C', TypeRelationKind.Extends),
    edge('e3', 'B', 'C', 'belongs-to'),
    edge('e4', 'D', 'E', TypeRelationKind.Implements),
  ];
  const all = collectDirectTypeRelations(edges);
  assert.deepEqual(all.map((r) => r.edge.id), ['e1', 'e2', 'e4']);
  assert.equal(all[0].kind, TypeRelationKind.Implements);

  const fromA = collectDirectTypeRelations(edges, 'A');
  assert.deepEqual(fromA.map((r) => r.edge.id), ['e1', 'e2']);

  assert.equal(typeRelationLabel(TypeRelationKind.Implements), 'implements');
  assert.equal(typeRelationLabel(TypeRelationKind.Extends), 'extends');
});

test('hasDirectTypeRelation 匹配源/目标/类型三元组', () => {
  const edges = [edge('e1', 'A', 'B', TypeRelationKind.Extends)];
  assert.equal(hasDirectTypeRelation(edges, 'A', 'B', TypeRelationKind.Extends), true);
  assert.equal(hasDirectTypeRelation(edges, 'A', 'B', TypeRelationKind.Implements), false);
  assert.equal(hasDirectTypeRelation(edges, 'B', 'A', TypeRelationKind.Extends), false);
});

test('resolveTypeRelationGraph 沿类型边可达闭包并按拓扑分层', () => {
  // A -> B -> C，另有 A -> C 直达边
  const edges = [
    edge('e1', 'A', 'B'),
    edge('e2', 'B', 'C'),
    edge('e3', 'A', 'C'),
  ];
  const graph = resolveTypeRelationGraph('A', edges);
  assert.deepEqual(graph.nodes.map((n) => n.nodeId), ['A', 'B', 'C']);
  // [当前行为，是否符合预期待确认]
  // 深度取最长路径（拓扑 max）：C 同时有 A->C 直达边和 A->B->C 两跳，结果取 2。
  // 判断：这大概率是有意的——typeRelations 的消费方是 indexGraphLayout 的 DAG 分层布局，
  // 取最长路径保证子节点的层级永远严格低于父节点，不会出现「直达边导致父子同层倒挂」。
  // 代价是：多层继承链会把整个图纵向拉长。确认后可删本注释。
  assert.equal(graph.nodes[0].depth, 0);
  assert.equal(graph.nodes[1].depth, 1);
  assert.equal(graph.nodes[2].depth, 2);
  assert.equal(graph.maxDepth, 2);
  assert.equal(graph.edges.length, 3);

  // 起点没有出边时只剩自己
  const solo = resolveTypeRelationGraph('Z', edges);
  assert.deepEqual(solo.nodes.map((n) => n.nodeId), ['Z']);
  assert.equal(solo.maxDepth, 0);

  // 菱形：A -> B, A -> C, B -> D, C -> D；D 深度取最长路径（2 跳）
  const diamond = resolveTypeRelationGraph('A', [
    edge('d1', 'A', 'B'),
    edge('d2', 'A', 'C'),
    edge('d3', 'B', 'D'),
    edge('d4', 'C', 'D'),
  ]);
  const byId = new Map(diamond.nodes.map((n) => [n.nodeId, n.depth]));
  assert.equal(byId.get('A'), 0);
  assert.equal(byId.get('B'), 1);
  assert.equal(byId.get('C'), 1);
  assert.equal(byId.get('D'), 2);
  assert.equal(diamond.maxDepth, 2);
});

test('resolveTypeRelationProjections 区分直接边与推导传递边', () => {
  // A implements B；B extends C → A 对 C 的 conformance 是推导出来的
  const edges = [
    edge('e1', 'A', 'B', TypeRelationKind.Implements),
    edge('e2', 'B', 'C', TypeRelationKind.Extends),
  ];
  const projections = resolveTypeRelationProjections('A', edges);
  assert.deepEqual(projections.map((p) => [p.targetId, p.origin]), [
    ['B', TypeRelationOrigin.Direct],
    ['C', TypeRelationOrigin.Derived],
  ]);
  assert.equal(projections[0].edgeId, 'e1');
  assert.equal(projections[1].path.join('>'), 'A>B>C');

  // A 对 C 的推导 kind 取路径上最强语义（implements 优先于 extends）
  assert.equal(projections[1].kind, TypeRelationKind.Implements);

  // 环：A -> B -> A 不应把 A 自己投影成目标
  const cycle = resolveTypeRelationProjections('A', [
    edge('c1', 'A', 'B'),
    edge('c2', 'B', 'A'),
  ]);
  assert.deepEqual(cycle.map((p) => p.targetId), ['B']);
});

test('wouldIntroduceTypeRelationCycle 沿类型边检测环', () => {
  // 现有 B -> A；再连 A -> B 会成环
  const edges = [edge('e1', 'B', 'A')];
  assert.equal(wouldIntroduceTypeRelationCycle(edges, 'A', 'B'), true);
  assert.equal(wouldIntroduceTypeRelationCycle(edges, 'B', 'A'), false);
  // 自环总是非法
  assert.equal(wouldIntroduceTypeRelationCycle(edges, 'A', 'A'), true);
  // 无关节点之间不构成环
  assert.equal(wouldIntroduceTypeRelationCycle(edges, 'X', 'Y'), false);
  // 间接环：B -> A，A -> C，C -> B；从 C 连 A 闭合
  const chain = [edge('k1', 'B', 'A'), edge('k2', 'A', 'C')];
  assert.equal(wouldIntroduceTypeRelationCycle(chain, 'C', 'B'), true);
});
