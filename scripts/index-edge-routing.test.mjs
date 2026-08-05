import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sourcePath = path.resolve('src/core/explanation-index/edgeRouting.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});

const UnifiedIndexEdgeKind = {
  Projection: 'projection',
  Dependency: 'dependency',
  Association: 'association',
};
const module = { exports: {} };
vm.runInNewContext(output.outputText, {
  exports: module.exports,
  module,
  require: (request) => request === './indexGraphLayout'
    ? { UnifiedIndexEdgeKind }
    : require(request),
}, { filename: sourcePath });

const { computeEdgeRoutingPlan } = module.exports;

function graphNode(id, x, y, width = 224, height = 64) {
  return {
    id,
    kind: 'knowledge',
    label: id,
    position: { x, y },
    size: { width, height },
    knowledgeNodeId: id,
    members: [],
    memberCount: 0,
    hiddenMemberCount: 0,
    tags: [],
    rootSelection: { kind: 'root', nodeId: id },
    owner: id === 'array-list',
    relationRoot: false,
    logicalReference: false,
    containedChild: false,
    collapsed: false,
  };
}

function relation(id, sourceId, targetId, kind = 'implements') {
  return { id, sourceId, targetId, kind };
}

function arrayListFixture(extraNodes = []) {
  const nodes = [
    graphNode('array-list', 500, 400),
    graphNode('list', 110, 120),
    graphNode('random-access', 370, 120),
    graphNode('cloneable', 630, 120),
    graphNode('serializable', 890, 120),
    ...extraNodes,
  ];
  const edges = [
    relation('array-list-list', 'array-list', 'list'),
    relation('array-list-random-access', 'array-list', 'random-access'),
    relation('array-list-cloneable', 'array-list', 'cloneable'),
    relation('array-list-serializable', 'array-list', 'serializable'),
  ];
  return { nodes, edges };
}

test('ArrayList implementation relations share one trunk and keep four independent branches', () => {
  const { nodes, edges } = arrayListFixture();
  const plan = computeEdgeRoutingPlan(nodes, edges, 'detail');

  assert.equal(plan.routes.length, 0);
  assert.equal(plan.bundles.length, 1);
  assert.equal(plan.bundles[0].kind, 'implements');
  assert.equal(plan.bundles[0].sourceSide, 'top');
  assert.equal(plan.bundles[0].branches.length, 4);
  assert.deepEqual(
    [...plan.bundles[0].edgeIds].sort(),
    edges.map((edge) => edge.id).sort(),
  );
});

test('same-layer relations use the left and right sides of their nodes', () => {
  const nodes = [graphNode('left', 120, 160), graphNode('right', 520, 160)];
  const edges = [relation('left-right', 'left', 'right', UnifiedIndexEdgeKind.Association)];
  const plan = computeEdgeRoutingPlan(nodes, edges, 'detail');

  assert.equal(plan.routes.length, 1);
  assert.equal(plan.routes[0].sourceSide, 'right');
  assert.equal(plan.routes[0].targetSide, 'left');
});

test('compact and overview modes bundle two compatible edges while detail stays conservative', () => {
  const nodes = [
    graphNode('array-list', 500, 400),
    graphNode('list', 300, 120),
    graphNode('cloneable', 700, 120),
  ];
  const edges = [
    relation('array-list-list', 'array-list', 'list'),
    relation('array-list-cloneable', 'array-list', 'cloneable'),
  ];

  assert.equal(computeEdgeRoutingPlan(nodes, edges, 'detail').bundles.length, 0);
  assert.equal(computeEdgeRoutingPlan(nodes, edges, 'compact').bundles.length, 1);
  assert.equal(computeEdgeRoutingPlan(nodes, edges, 'overview').bundles.length, 1);
});

test('overview mode keeps a safe sub-bundle when a farther target would cross another node', () => {
  const nodes = [
    graphNode('array-list', 492, 808),
    graphNode('list', 800, 456),
    graphNode('cloneable', 492, 632),
    graphNode('random-access', 800, 632),
    graphNode('serializable', 1108, 632),
  ];
  const edges = [
    relation('array-list-list', 'array-list', 'list'),
    relation('array-list-cloneable', 'array-list', 'cloneable'),
    relation('array-list-random-access', 'array-list', 'random-access'),
    relation('array-list-serializable', 'array-list', 'serializable'),
  ];
  const plan = computeEdgeRoutingPlan(nodes, edges, 'overview');

  assert.equal(plan.bundles.length, 1);
  assert.deepEqual(
    [...plan.bundles[0].edgeIds].sort(),
    edges.slice(1).map((edge) => edge.id).sort(),
  );
  assert.equal(plan.routes.length, 1);
  assert.equal(plan.routes[0].edgeId, 'array-list-list');
});

test('different relation kinds never share a visual trunk', () => {
  const { nodes, edges } = arrayListFixture();
  const mixedEdges = edges.map((edge, index) => (
    index === 3 ? { ...edge, kind: UnifiedIndexEdgeKind.Dependency } : edge
  ));
  const plan = computeEdgeRoutingPlan(nodes, mixedEdges, 'detail');

  assert.equal(plan.bundles.length, 1);
  assert.deepEqual([...plan.bundles[0].edgeIds].sort(), edges.slice(0, 3).map((edge) => edge.id).sort());
  assert.equal(plan.routes.length, 1);
  assert.equal(plan.routes[0].edgeId, edges[3].id);
});

test('a node blocking the shared corridor makes the router fall back to individual edges', () => {
  const blocker = graphNode('blocking-node', 500, 260, 140, 80);
  const { nodes, edges } = arrayListFixture([blocker]);
  const plan = computeEdgeRoutingPlan(nodes, edges, 'detail');

  assert.equal(plan.bundles.length, 0);
  assert.equal(plan.routes.length, 4);
});
