import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = path.resolve('src/knowledge/containment.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});
const module = { exports: {} };
vm.runInNewContext(output.outputText, {
  exports: module.exports,
  module,
}, { filename: sourcePath });

const {
  collectDirectContainmentRelations,
  hasDirectContainmentRelation,
  isManagedContainmentEdge,
  wouldIntroduceContainmentCycle,
} = module.exports;

const edges = [
  { id: 'a-b', source: 'a', target: 'b', type: 'belongs-to', label: 'contains' },
  { id: 'b-c', source: 'b', target: 'c', type: 'belongs-to', label: 'contains' },
  { id: 'a-d', source: 'a', target: 'd', type: 'extends', label: 'extends' },
];

test('containment relations are collected independently from line relations', () => {
  assert.deepEqual(
    collectDirectContainmentRelations(edges, 'a').map(({ edge }) => edge.id),
    ['a-b'],
  );
  assert.equal(hasDirectContainmentRelation(edges, 'a', 'b'), true);
  assert.equal(hasDirectContainmentRelation(edges, 'a', 'd'), false);
});

test('containment rejects self and transitive cycles', () => {
  assert.equal(wouldIntroduceContainmentCycle(edges, 'c', 'a'), true);
  assert.equal(wouldIntroduceContainmentCycle(edges, 'a', 'a'), true);
  assert.equal(wouldIntroduceContainmentCycle(edges, 'a', 'c'), false);
});

test('tree binding containment is recognized as managed state', () => {
  assert.equal(isManagedContainmentEdge({
    id: 'treebind:parent:child',
    source: 'a',
    target: 'b',
    type: 'belongs-to',
    label: 'contains',
  }), true);
  assert.equal(isManagedContainmentEdge(edges[0]), false);
});

test('store exposes guarded containment mutation actions', () => {
  const storeSource = fs.readFileSync(path.resolve('src/store/useGraph.ts'), 'utf8');
  assert.match(storeSource, /addContainmentRelation: \(source, target\) =>/);
  assert.match(storeSource, /hasDirectContainmentRelation/);
  assert.match(storeSource, /wouldIntroduceContainmentCycle/);
  assert.match(storeSource, /removeContainmentRelation: \(id\) =>/);
});
