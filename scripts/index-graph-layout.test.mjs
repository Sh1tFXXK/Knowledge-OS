import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUnifiedIndexGraph } from '../src/core/explanation-index/indexGraphLayout.ts';
import { buildExplanationIndex } from '../src/knowledge/explanationIndex.ts';

const card = (id, title) => ({ nodeId: id, title, rootContent: '', tabs: [] });
const node = (id, label) => ({ id, label, role: 'concept', card: card(id, label) });
const edge = (id, source, target) => ({
  id, source, target, type: 'belongs-to', label: 'contains', relationKind: 'structure',
});

const baseParams = (over = {}) => ({
  ownerId: 'k_owner',
  ownerLabel: '宿主',
  index: buildExplanationIndex(node('k_owner', '宿主').card),
  relationRootId: 'k_owner',
  relationRootLabel: '宿主',
  relationGraph: { nodes: [], edges: [], maxDepth: 0 },
  ...over,
});

test('幽灵方框防线：本体已删但绑定还在的引用不画框', () => {
  const owner = node('k_owner', '宿主');
  const child = node('k_child', '子知识');
  const edges = [
    edge('treebind:p:c-live', 'k_owner', 'k_child'),
    edge('treebind:p:c-dead', 'k_owner', 'k_missing'),
  ];
  const layout = buildUnifiedIndexGraph(baseParams({
    knowledgeEdges: edges,
    containmentEdges: edges,
    nodePool: { k_owner: owner, k_child: child },
  }));

  const drawn = layout.nodes.map((n) => n.knowledgeNodeId);
  assert.deepEqual(drawn.sort(), ['k_child', 'k_owner']);
  // 端点缺失的边也不留在图里，否则关系计数与切割目标都会指空。
  assert.equal(layout.edges.length, 0);
});

test('类型关系图里指向缺失本体的节点同样不画框', () => {
  const owner = node('k_owner', '宿主');
  const impl = node('k_impl', '实现');
  const relationGraph = {
    nodes: [
      { nodeId: 'k_owner', depth: 0 },
      { nodeId: 'k_impl', depth: 1 },
      { nodeId: 'k_gone', depth: 1 },
    ],
    edges: [
      { edgeId: 'rel:1', sourceId: 'k_owner', targetId: 'k_impl', kind: 'implements' },
      { edgeId: 'rel:2', sourceId: 'k_owner', targetId: 'k_gone', kind: 'implements' },
    ],
    maxDepth: 1,
  };
  const layout = buildUnifiedIndexGraph(baseParams({
    relationGraph,
    knowledgeEdges: [],
    containmentEdges: [],
    nodePool: { k_owner: owner, k_impl: impl },
  }));
  assert.deepEqual(layout.nodes.map((n) => n.knowledgeNodeId).sort(), ['k_impl', 'k_owner']);
  assert.deepEqual(layout.edges.map((e) => e.id), ['rel:1']);
});
