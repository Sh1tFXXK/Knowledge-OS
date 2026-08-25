import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createJavaSourceEdges,
  createJavaSourceNodes,
} from './import/java-source-nodes.mjs';

function javaType(className, simpleName, relations = []) {
  return {
    className,
    simpleName,
    packageName: className.slice(0, className.lastIndexOf('.')),
    sourceFile: `/${simpleName}.java`,
    kind: 'class',
    finalType: false,
    members: [],
    relations,
  };
}

function source(sourceKey, displayPath) {
  return {
    sourceKey,
    displayPath,
    sourcePath: displayPath,
    internalPrefix: '',
  };
}

test('Java source occurrences reuse one fully-qualified knowledge identity', () => {
  const nodePool = {
    iterator: {
      id: 'iterator',
      label: 'Iterator',
      tags: ['Java', 'java.util.Iterator'],
      card: {
        nodeId: 'iterator',
        title: 'Iterator',
        rootContent: 'Canonical Iterator documentation.',
        tabs: [],
      },
    },
  };
  const first = createJavaSourceNodes({
    types: [javaType('demo.First', 'First', [
      { targetClassName: 'java.util.Iterator', kind: 'implements' },
    ])],
    sourceFiles: 1,
    location: source('first', '/first'),
    nodePool,
  });
  const second = createJavaSourceNodes({
    types: [javaType('demo.Second', 'Second', [
      { targetClassName: 'java.util.Iterator', kind: 'implements' },
    ])],
    sourceFiles: 1,
    location: source('second', '/second'),
    nodePool,
  });

  assert.equal(first.externalNodeIds.get('java.util.Iterator'), 'iterator');
  assert.equal(second.externalNodeIds.get('java.util.Iterator'), 'iterator');
  assert.notEqual(first.rootTreeId, second.rootTreeId);
  const occurrence = first.nodes.find((node) => node.id === 'iterator');
  assert.equal(occurrence.card.rootContent, 'Canonical Iterator documentation.');
  assert.equal(occurrence.canonicalKey, 'java:type:java.util.Iterator');
});

test('Java source roots may reuse an existing knowledge body while keeping source ownership', () => {
  const imported = createJavaSourceNodes({
    types: [javaType('demo.Service', 'Service')],
    sourceFiles: 1,
    location: source('service-source', '/service'),
    nodePool: {
      existing_root: {
        id: 'existing_root',
        label: 'Existing source root',
        tags: [],
        card: { nodeId: 'existing_root', title: 'Existing source root', tabs: [] },
      },
    },
    rootKnowledgeNodeId: 'existing_root',
  });

  assert.equal(imported.rootNodeId, 'existing_root');
  assert.match(imported.sourceRootNodeId, /^k_java_source_/);
  assert.notEqual(imported.rootNodeId, imported.sourceRootNodeId);
  assert.equal(imported.nodes[0].id, 'existing_root');
});

test('Java source roots do not duplicate an existing containment binding', () => {
  const imported = {
    sourceHash: 'source',
    rootNodeId: 'source-root',
    nodes: [{ id: 'source-root', parentId: null }],
    typeNodeIds: new Map(),
    externalNodeIds: new Map(),
  };
  const edges = createJavaSourceEdges({
    imported,
    types: [],
    parentTreeNode: { id: 'parent-tree', nodeRef: 'parent' },
    existingEdges: [
      {
        id: 'treebind:parent:source',
        source: 'parent',
        target: 'source-root',
        type: 'belongs-to',
        label: 'contains',
      },
    ],
  });
  assert.deepEqual(edges, []);
});
