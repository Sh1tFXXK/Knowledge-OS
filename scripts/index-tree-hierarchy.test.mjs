import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = path.resolve('src/knowledge/treeBinding.ts');
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

const { buildTreeProjectionContainmentEdges } = module.exports;

test('tree projection containment follows directory parentage and assigns duplicate refs once', () => {
  const tree = {
    id: 'tree-root',
    name: 'Root',
    nodeRef: 'root',
    children: [
      {
        id: 'tree-a',
        name: 'A',
        nodeRef: 'a',
        children: [{ id: 'tree-shared-a', name: 'Shared', nodeRef: 'shared' }],
      },
      {
        id: 'tree-b',
        name: 'B',
        nodeRef: 'b',
        children: [{ id: 'tree-shared-b', name: 'Shared', nodeRef: 'shared' }],
      },
    ],
  };
  const edges = buildTreeProjectionContainmentEdges(tree);
  const pairs = edges.map((edge) => `${edge.source}>${edge.target}`).join(',');

  assert.equal(pairs, 'root>a,root>b,a>shared');
});

test('the persisted computer science projection keeps its directory children', () => {
  const treeData = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
  const findById = (node, id) => {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
      const found = findById(child, id);
      if (found) return found;
    }
    return null;
  };
  const computerScience = findById(treeData, 'demo_cs');
  const expectedTargets = [];
  const seen = new Set();
  for (const child of computerScience.children ?? []) {
    if (!child.nodeRef || seen.has(child.nodeRef)) continue;
    seen.add(child.nodeRef);
    expectedTargets.push(child.nodeRef);
  }
  const actualTargets = buildTreeProjectionContainmentEdges(computerScience)
    .filter((edge) => edge.source === computerScience.nodeRef)
    .map((edge) => edge.target);

  assert.equal(actualTargets.join(','), expectedTargets.join(','));
});
