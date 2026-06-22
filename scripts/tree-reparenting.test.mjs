import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);

function loadTsModule(relativePath) {
  const sourcePath = path.resolve(relativePath);
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
  return module.exports;
}

const {
  findTreeNodeById,
  moveTreeNode,
} = loadTsModule('src/knowledge/treeUtils.ts');

const {
  createMovedTreeBindingEdges,
  removeTreeBindingEdgesForTreeIds,
} = loadTsModule('src/knowledge/treeBinding.ts');

const tree = {
  id: 'root',
  name: 'Root',
  count: 0,
  icon: 'R',
  nodeRef: 'k-root',
  children: [
    {
      id: 'tree-a',
      name: 'A',
      count: 0,
      icon: 'A',
      nodeRef: 'k-a',
      children: [
        {
          id: 'tree-b',
          name: 'B',
          count: 0,
          icon: 'B',
          nodeRef: 'k-b',
          children: [
            { id: 'tree-c', name: 'C', count: 0, icon: 'C', nodeRef: 'k-c' },
          ],
        },
      ],
    },
    { id: 'tree-d', name: 'D', count: 0, icon: 'D', nodeRef: 'k-d' },
  ],
};

const nodePool = Object.fromEntries(
  ['root', 'a', 'b', 'c', 'd'].map((id) => [
    `k-${id}`,
    {
      id: `k-${id}`,
      label: id.toUpperCase(),
      dimensions: [id],
      card: { nodeId: `k-${id}`, title: id.toUpperCase(), tabs: [] },
    },
  ]),
);

const moved = moveTreeNode(tree, 'tree-b', 'tree-d');

assert.ok(moved);
assert.equal(moved.previousParentId, 'tree-a');
assert.equal(moved.nextParentId, 'tree-d');
assert.equal(findTreeNodeById(moved.tree, 'tree-a').children.length, 0);
assert.equal(findTreeNodeById(moved.tree, 'tree-d').children[0].id, 'tree-b');
assert.equal(findTreeNodeById(moved.tree, 'tree-d').expanded, true);
assert.equal(findTreeNodeById(moved.tree, 'tree-b').children[0].id, 'tree-c');
assert.notEqual(moved.tree, tree);

assert.equal(moveTreeNode(tree, 'root', 'tree-d'), null);
assert.equal(moveTreeNode(tree, 'tree-a', 'tree-c'), null);
assert.equal(moveTreeNode(tree, 'tree-b', 'tree-a'), null);

const existingEdges = [
  { id: 'treebind:tree-a:tree-b', source: 'k-a', target: 'k-b', type: 'belongs-to', label: 'contains' },
  { id: 'treebind:tree-b:tree-c', source: 'k-b', target: 'k-c', type: 'belongs-to', label: 'contains' },
  { id: 'manual', source: 'k-a', target: 'k-d', type: 'related', label: 'manual' },
];

const edgeIdsAfterRemoval = removeTreeBindingEdgesForTreeIds(existingEdges, new Set(['tree-b']))
  .map((edge) => edge.id);

assert.deepEqual(edgeIdsAfterRemoval, ['manual']);

const replacementEdges = createMovedTreeBindingEdges({
  tree: moved.tree,
  nodePool,
  movedTreeId: 'tree-b',
  nextParentTreeId: 'tree-d',
});

assert.deepEqual(JSON.parse(JSON.stringify(replacementEdges.map((edge) => edge.id))), [
  'treebind:tree-d:tree-b',
  'treebind:tree-b:tree-c',
]);
assert.equal(replacementEdges[0].source, 'k-d');
assert.equal(replacementEdges[0].target, 'k-b');
assert.deepEqual(JSON.parse(JSON.stringify(replacementEdges[0].dimensions)), ['d', 'b']);

console.log('tree reparenting checks passed');
