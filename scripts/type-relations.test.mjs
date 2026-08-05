import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sourcePath = path.resolve('src/knowledge/typeRelations.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});

const TypeRelationKind = {
  Implements: 'implements',
  Extends: 'extends',
};
const module = { exports: {} };
vm.runInNewContext(output.outputText, {
  exports: module.exports,
  module,
  require: (request) => request === '../types' ? { TypeRelationKind } : require(request),
}, { filename: sourcePath });

const {
  TypeRelationOrigin,
  hasDirectTypeRelation,
  resolveTypeRelationGraph,
  resolveTypeRelationProjections,
  wouldIntroduceTypeRelationCycle,
} = module.exports;

const edges = [
  { id: 'array-list', source: 'ArrayList', target: 'List', type: 'implements', label: 'implements' },
  { id: 'list-collection', source: 'List', target: 'Collection', type: 'extends', label: 'extends' },
  { id: 'array-random', source: 'ArrayList', target: 'RandomAccess', type: 'implements', label: 'implements' },
];

const projections = resolveTypeRelationProjections('ArrayList', edges);
const directList = projections.find((projection) => projection.targetId === 'List');
const directRandomAccess = projections.find((projection) => projection.targetId === 'RandomAccess');
const derivedCollection = projections.find((projection) => projection.targetId === 'Collection');
const graph = resolveTypeRelationGraph('ArrayList', edges);

assert.equal(directList?.origin, TypeRelationOrigin.Direct);
assert.equal(directList?.kind, 'implements');
assert.equal(directRandomAccess?.origin, TypeRelationOrigin.Direct);
assert.equal(derivedCollection?.origin, TypeRelationOrigin.Derived);
assert.equal(derivedCollection?.kind, 'implements');
assert.deepEqual(JSON.parse(JSON.stringify(derivedCollection?.path)), ['ArrayList', 'List', 'Collection']);
assert.equal(hasDirectTypeRelation(edges, 'ArrayList', 'List', 'implements'), true);
assert.equal(hasDirectTypeRelation(edges, 'ArrayList', 'Collection', 'implements'), false);
assert.equal(wouldIntroduceTypeRelationCycle(edges, 'Collection', 'ArrayList'), true);
assert.equal(wouldIntroduceTypeRelationCycle(edges, 'ArrayList', 'Collection'), false);
assert.equal(graph.nodes.find((node) => node.nodeId === 'ArrayList')?.depth, 0);
assert.equal(graph.nodes.find((node) => node.nodeId === 'List')?.depth, 1);
assert.equal(graph.nodes.find((node) => node.nodeId === 'Collection')?.depth, 2);

const nodePool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));
const knowledgeEdges = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-edges.json'), 'utf8'));
const demoProjections = resolveTypeRelationProjections('k_demo_java_array_list', knowledgeEdges);
const demoByTargetLabel = new Map(demoProjections.map((projection) => [
  nodePool[projection.targetId]?.label,
  projection,
]));

assert.equal(nodePool.k_demo_java_array_list.label, 'ArrayList');
assert.equal(
  nodePool.k_demo_java_array_list.relationIndex?.rootNodeId,
  'k_demo_java_array_list',
);
assert.equal(demoProjections.length, 9);
assert.equal(demoByTargetLabel.get('AbstractList')?.origin, TypeRelationOrigin.Direct);
assert.equal(demoByTargetLabel.get('AbstractList')?.kind, 'extends');
assert.equal(demoByTargetLabel.get('List')?.origin, TypeRelationOrigin.Direct);
assert.equal(demoByTargetLabel.get('RandomAccess')?.origin, TypeRelationOrigin.Direct);
assert.equal(demoByTargetLabel.get('Cloneable')?.origin, TypeRelationOrigin.Direct);
assert.equal(demoByTargetLabel.get('Serializable')?.origin, TypeRelationOrigin.Direct);
assert.equal(demoByTargetLabel.get('AbstractCollection')?.origin, TypeRelationOrigin.Derived);
assert.equal(demoByTargetLabel.get('Collection')?.origin, TypeRelationOrigin.Derived);
assert.equal(demoByTargetLabel.get('SequencedCollection')?.origin, TypeRelationOrigin.Derived);
assert.equal(demoByTargetLabel.get('Iterable')?.origin, TypeRelationOrigin.Derived);

const collectionPath = demoByTargetLabel.get('Collection')?.path ?? [];
assert.equal(nodePool[collectionPath[0]]?.label, 'ArrayList');
assert.equal(nodePool[collectionPath.at(-1)]?.label, 'Collection');
assert.ok(collectionPath.length > 2);

for (const edge of knowledgeEdges) {
  assert.ok(nodePool[edge.source], `Missing knowledge edge source: ${edge.source}`);
  assert.ok(nodePool[edge.target], `Missing knowledge edge target: ${edge.target}`);
}

console.log('type relation projection checks passed');
