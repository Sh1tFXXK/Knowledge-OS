import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
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
  require,
}, { filename: sourcePath });

const {
  createTreeBindingEdge,
  isTreeBindingEdgeForTreeIds,
  removeTreeBindingEdgesForTreeIds,
  resolveTreeBindingTarget,
} = module.exports;

const tree = {
  id: 'root',
  name: 'Root',
  count: 0,
  icon: 'R',
  children: [
    {
      id: 'tree-parent',
      name: 'Parent',
      count: 0,
      icon: 'P',
      nodeRef: 'k-parent',
      children: [
        { id: 'tree-child', name: 'Child', count: 0, icon: 'C', nodeRef: 'k-child' },
      ],
    },
    {
      id: 'folder',
      name: 'Folder',
      count: 0,
      icon: 'F',
      children: [
        { id: 'folder-child', name: 'Folder Child', count: 0, icon: 'C', nodeRef: 'k-child' },
      ],
    },
  ],
};

const nodePool = {
  'k-parent': { id: 'k-parent', label: 'Parent', dimensions: ['system'], card: { nodeId: 'k-parent', title: 'Parent', tabs: [] } },
  'k-child': { id: 'k-child', label: 'Child', dimensions: ['system', 'detail'], card: { nodeId: 'k-child', title: 'Child', tabs: [] } },
};

assert.equal(resolveTreeBindingTarget(tree, 'tree-child'), 'k-child');
assert.equal(resolveTreeBindingTarget(tree, 'folder'), 'folder');

const edge = createTreeBindingEdge({
  tree,
  nodePool,
  parentTreeId: 'tree-parent',
  childTreeId: 'tree-child',
  childKnowledgeId: 'k-child',
});

assert.deepEqual(JSON.parse(JSON.stringify(edge)), {
  id: 'treebind:tree-parent:tree-child',
  source: 'k-parent',
  target: 'k-child',
  type: 'belongs-to',
  label: 'contains',
  dimensions: ['system', 'detail'],
});

assert.equal(
  createTreeBindingEdge({
    tree,
    nodePool,
    parentTreeId: 'folder',
    childTreeId: 'folder-child',
    childKnowledgeId: 'k-child',
  }),
  null,
);

assert.equal(isTreeBindingEdgeForTreeIds(edge, new Set(['tree-child'])), true);
assert.equal(isTreeBindingEdgeForTreeIds(edge, new Set(['other-tree-node'])), false);

const kept = removeTreeBindingEdgesForTreeIds([
  edge,
  { ...edge, id: 'treebind:other-parent:other-child' },
  { id: 'manual', source: 'k-parent', target: 'k-child', type: 'belongs-to', label: 'manual' },
], new Set(['tree-child']));

assert.deepEqual(JSON.parse(JSON.stringify(kept.map((item) => item.id))), ['treebind:other-parent:other-child', 'manual']);

console.log('tree binding checks passed');
