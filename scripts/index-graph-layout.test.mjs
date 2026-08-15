import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sourcePath = path.resolve('src/core/explanation-index/indexGraphLayout.ts');
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
const explanationIndexHelpers = {
  explicitPagesForTab: (explanation, tab) => {
    if (tab.pages?.length) return tab.pages;
    if (tab.id !== 'def') return [];
    return explanation.definitionPages?.length ? explanation.definitionPages : [];
  },
};
const explanationTreeHelpers = {
  findTab: function findTab(tabs, tabId) {
    for (const tab of tabs) {
      if (tab.id === tabId) return tab;
      const found = tab.tabs ? findTab(tab.tabs, tabId) : null;
      if (found) return found;
    }
    return null;
  },
  findPage: function findPage(pages, pageId) {
    for (const page of pages) {
      if (page.id === pageId) return page;
      const found = page.pages ? findPage(page.pages, pageId) : null;
      if (found) return found;
    }
    return null;
  },
};
const containmentHelpers = {
  CONTAINMENT_EDGE_TYPE: 'belongs-to',
  collectDirectContainmentRelations: (edges, sourceId) => edges.flatMap((edge) => {
    if (edge.type !== 'belongs-to') return [];
    if (sourceId && edge.source !== sourceId) return [];
    return [{ edge }];
  }),
};
const module = { exports: {} };
vm.runInNewContext(output.outputText, {
  exports: module.exports,
  module,
  require: (request) => {
    if (request === '../../types') return { TypeRelationKind };
    if (request === '../../knowledge/explanationIndex') return explanationIndexHelpers;
    if (request === '../../knowledge/explanationTree') return explanationTreeHelpers;
    if (request === '../../knowledge/containment') return containmentHelpers;
    return require(request);
  },
}, { filename: sourcePath });

const {
  buildUnifiedIndexGraph,
  UnifiedIndexEdgeKind,
  UnifiedIndexNodeKind,
} = module.exports;

function contentSelection(nodeId, tabId, pageId = null) {
  return { kind: 'content', nodeId, tabId, pageId };
}

function indexNode(id, label, weight, nodeId, children = []) {
  return {
    id,
    label,
    weight,
    selection: id === 'root'
      ? { kind: 'root', nodeId }
      : contentSelection(nodeId, 'definition', id),
    children,
  };
}

function rectanglesOverlap(left, right) {
  const leftRect = {
    left: left.position.x - left.size.width / 2,
    right: left.position.x + left.size.width / 2,
    top: left.position.y - left.size.height / 2,
    bottom: left.position.y + left.size.height / 2,
  };
  const rightRect = {
    left: right.position.x - right.size.width / 2,
    right: right.position.x + right.size.width / 2,
    top: right.position.y - right.size.height / 2,
    bottom: right.position.y + right.size.height / 2,
  };
  return (
    Math.min(leftRect.right, rightRect.right) - Math.max(leftRect.left, rightRect.left) > 0.5 &&
    Math.min(leftRect.bottom, rightRect.bottom) - Math.max(leftRect.top, rightRect.top) > 0.5
  );
}

function frameContainsNode(frame, node) {
  const nodeRect = {
    left: node.position.x - node.size.width / 2,
    right: node.position.x + node.size.width / 2,
    top: node.position.y - node.size.height / 2,
    bottom: node.position.y + node.size.height / 2,
  };
  return (
    frame.left <= nodeRect.left + 0.5
    && frame.top <= nodeRect.top + 0.5
    && frame.left + frame.width >= nodeRect.right - 0.5
    && frame.top + frame.height >= nodeRect.bottom - 0.5
  );
}

function fixture() {
  const index = indexNode('root', 'HashMap', 1, 'hash-map', [
    indexNode('table', 'table', 1, 'hash-map'),
    indexNode('size', 'size', 1, 'hash-map'),
    indexNode('threshold', 'threshold', 1, 'hash-map'),
  ]);
  const nodePool = {
    'hash-map': {
      id: 'hash-map',
      label: 'HashMap',
      tags: ['Java', '类'],
      card: {
        nodeId: 'hash-map',
        title: 'HashMap',
        tabs: [{
          id: 'definition',
          label: 'Definition',
          content: '',
          pages: [
            { id: 'table', label: 'table', content: '', tags: ['field'] },
            { id: 'size', label: 'size', content: '', tags: ['field', 'counter'] },
            { id: 'threshold', label: 'threshold', content: '' },
          ],
        }],
      },
    },
    'abstract-map': {
      id: 'abstract-map',
      label: 'AbstractMap',
      tags: ['Java', '抽象类'],
      card: {
        nodeId: 'abstract-map',
        title: 'AbstractMap',
        tabs: [{ id: 'fields', label: '字段', content: '', pages: [
          { id: 'key-set', label: 'keySet', content: '' },
          { id: 'values', label: 'values', content: '' },
        ] }],
      },
    },
    map: {
      id: 'map',
      label: 'Map',
      tags: ['Java', '接口'],
      card: {
        nodeId: 'map',
        title: 'Map',
        tabs: [
          { id: 'hash-map-tab', label: 'HashMap', content: '' },
          { id: 'hashtable-tab', label: 'Hashtable', content: '' },
        ],
      },
    },
    cloneable: {
      id: 'cloneable',
      label: 'Cloneable',
      tags: ['Java', '接口'],
      card: { nodeId: 'cloneable', title: 'Cloneable', tabs: [] },
    },
    serializable: {
      id: 'serializable',
      label: 'Serializable',
      tags: ['Java', '接口'],
      card: { nodeId: 'serializable', title: 'Serializable', tabs: [] },
    },
    allocator: {
      id: 'allocator',
      label: 'EntryAllocator',
      tags: ['Java'],
      card: { nodeId: 'allocator', title: 'EntryAllocator', tabs: [] },
    },
  };
  const relationGraph = {
    maxDepth: 2,
    nodes: [
      { nodeId: 'hash-map', depth: 0 },
      { nodeId: 'abstract-map', depth: 1 },
      { nodeId: 'map', depth: 2 },
      { nodeId: 'cloneable', depth: 1 },
      { nodeId: 'serializable', depth: 1 },
    ],
    edges: [
      { edgeId: 'extends-abstract-map', sourceId: 'hash-map', targetId: 'abstract-map', kind: 'extends' },
      { edgeId: 'hash-map-map', sourceId: 'hash-map', targetId: 'map', kind: 'implements' },
      { edgeId: 'hash-map-cloneable', sourceId: 'hash-map', targetId: 'cloneable', kind: 'implements' },
      { edgeId: 'hash-map-serializable', sourceId: 'hash-map', targetId: 'serializable', kind: 'implements' },
      { edgeId: 'abstract-map-map', sourceId: 'abstract-map', targetId: 'map', kind: 'implements' },
    ],
  };
  return { index, nodePool, relationGraph };
}

test('IDEA-style type graph renders card tabs as owner members', () => {
  const { index, nodePool, relationGraph } = fixture();
  const layout = buildUnifiedIndexGraph({
    ownerId: 'hash-map',
    ownerLabel: 'HashMap',
    index,
    relationRootId: 'hash-map',
    relationRootLabel: 'HashMap',
    relationGraph,
    knowledgeEdges: [],
    nodePool,
  });

  assert.equal(layout.nodes.length, 5);
  assert.ok(layout.nodes.every((node) => node.kind === UnifiedIndexNodeKind.Knowledge));
  assert.equal(layout.edges.filter((edge) => edge.kind === 'extends').length, 1);
  assert.equal(layout.edges.filter((edge) => edge.kind === 'implements').length, 4);
  const owner = layout.nodes.find((node) => node.owner);
  assert.equal(owner?.memberCount, 3);
  assert.equal(owner?.members.length, 3);
  assert.deepEqual([...owner.tags], ['Java', '类']);
  assert.deepEqual([...owner.members.find((member) => member.label === 'size').tags], ['field', 'counter']);
  assert.ok(layout.nodes.filter((node) => !node.owner).every((node) => node.memberCount === 0));
  assert.equal(layout.nodes.find((node) => node.knowledgeNodeId === 'map')?.members.length, 0);

  const collisions = [];
  for (let leftIndex = 0; leftIndex < layout.nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < layout.nodes.length; rightIndex += 1) {
      const left = layout.nodes[leftIndex];
      const right = layout.nodes[rightIndex];
      if (rectanglesOverlap(left, right)) collisions.push([left.id, right.id]);
    }
  }
  assert.deepEqual(collisions, []);
});

test('collapsed graph nodes hide member rows without losing their member count', () => {
  const { index, nodePool, relationGraph } = fixture();
  const params = {
    ownerId: 'hash-map',
    ownerLabel: 'HashMap',
    index,
    relationRootId: 'hash-map',
    relationRootLabel: 'HashMap',
    relationGraph,
    knowledgeEdges: [],
    nodePool,
  };
  const expandedOwner = buildUnifiedIndexGraph(params).nodes.find((node) => node.owner);
  const collapsedOwner = buildUnifiedIndexGraph({
    ...params,
    collapsedNodeIds: new Set(['knowledge:hash-map']),
  }).nodes.find((node) => node.owner);

  assert.equal(collapsedOwner?.collapsed, true);
  assert.equal(collapsedOwner?.memberCount, expandedOwner?.memberCount);
  assert.equal(collapsedOwner?.members.length, 0);
  assert.ok((collapsedOwner?.size.height ?? 0) < (expandedOwner?.size.height ?? 0));
});

test('direct belongs-to children render as containment matrix cells without line relations', () => {
  const index = indexNode('root', '集合框架', 1, 'collection-framework', [
    indexNode('collection-tab', 'Collection', 1, 'collection-framework'),
    indexNode('map-tab', 'Map', 1, 'collection-framework'),
    indexNode('list-tab', 'List', 1, 'collection-framework'),
  ]);
  const nodePool = {
    'collection-framework': {
      id: 'collection-framework',
      label: '集合框架',
      tags: ['集合'],
      card: { nodeId: 'collection-framework', title: '集合框架', tabs: [] },
    },
    map: {
      id: 'map',
      label: 'Map',
      tags: ['Map'],
      card: { nodeId: 'map', title: 'Map', tabs: [{ id: 'hash-map-tab', label: 'HashMap', content: '' }] },
    },
    list: {
      id: 'list',
      label: 'List',
      tags: ['List'],
      card: { nodeId: 'list', title: 'List', tabs: [] },
    },
    collection: {
      id: 'collection',
      label: 'Collection接口',
      tags: ['Collection'],
      card: { nodeId: 'collection', title: 'Collection接口', tabs: [] },
    },
  };
  const layout = buildUnifiedIndexGraph({
    ownerId: 'collection-framework',
    ownerLabel: '集合框架',
    index,
    relationRootId: 'collection-framework',
    relationRootLabel: '集合框架',
    relationGraph: {
      maxDepth: 1,
      nodes: [{ nodeId: 'collection-framework', depth: 1 }],
      edges: [],
    },
    knowledgeEdges: [
      { id: 'contains-map', source: 'collection-framework', target: 'map', type: 'belongs-to', label: 'contains' },
      { id: 'contains-list', source: 'collection-framework', target: 'list', type: 'belongs-to', label: 'contains' },
      { id: 'contains-collection', source: 'collection-framework', target: 'collection', type: 'belongs-to', label: 'contains' },
    ],
    nodePool,
  });

  assert.equal(layout.nodes.length, 4);
  assert.equal(layout.edges.filter((edge) => edge.kind === 'contains').length, 0);
  assert.equal(layout.nodes.find((node) => node.knowledgeNodeId === 'map')?.containedChild, true);
  assert.equal(layout.nodes.find((node) => node.knowledgeNodeId === 'map')?.memberCount, 0);
  assert.equal(layout.nodes.find((node) => node.owner)?.memberCount, 3);

  const childNodes = layout.nodes.filter((node) => node.containedChild);
  const childColumns = new Set(childNodes.map(
    (node) => Math.round(node.position.x - node.size.width / 2),
  ));
  const childRows = new Set(childNodes.map(
    (node) => Math.round(node.position.y - node.size.height / 2),
  ));
  assert.ok(
    childColumns.size >= 2,
    'three sibling matrix cells should use multiple columns instead of a single vertical stack',
  );
  assert.ok(
    childRows.size >= 2,
    'three sibling matrix cells should remain a matrix instead of one horizontal strip',
  );

  const owner = layout.nodes.find((node) => node.owner);
  const ownerFrame = layout.containmentFrames.find(
    (frame) => frame.knowledgeNodeId === 'collection-framework',
  );
  assert.ok(ownerFrame);
  assert.ok(ownerFrame.width / layout.width > 0.95);
  assert.ok(ownerFrame.height / layout.height > 0.95);
  assert.ok(frameContainsNode(ownerFrame, owner));
  assert.equal(owner.containerHost, true);
  assert.ok(owner.size.height <= 48);
  const ownerBottom = owner.position.y + owner.size.height / 2;
  for (const child of childNodes) {
    assert.ok(frameContainsNode(ownerFrame, child));
    assert.equal(rectanglesOverlap(owner, child), false);
    assert.ok(child.position.y - child.size.height / 2 > ownerBottom);
  }

  const graphSource = fs.readFileSync(
    path.resolve('src/core/explanation-index/UnifiedIndexGraph.tsx'),
    'utf8',
  );
  assert.match(graphSource, /is-matrix-host/);
  assert.match(graphSource, /orderedEffectiveNodes/);
  assert.match(graphSource, /包含（矩阵）/);
});

test('large member lists keep boxes compact and report omitted rows', () => {
  const children = Array.from({ length: 30 }, (_, index) => (
    indexNode(`member-${index}`, `member ${index}`, 1, 'hash-map')
  ));
  const { nodePool, relationGraph } = fixture();
  const layout = buildUnifiedIndexGraph({
    ownerId: 'hash-map',
    ownerLabel: 'HashMap',
    index: indexNode('root', 'HashMap', 1, 'hash-map', children),
    relationRootId: 'hash-map',
    relationRootLabel: 'HashMap',
    relationGraph,
    knowledgeEdges: [],
    nodePool,
  });
  const owner = layout.nodes.find((node) => node.owner);

  assert.equal(owner.memberCount, 30);
  assert.equal(owner.members.length, 12);
  assert.equal(owner.hiddenMemberCount, 18);
  assert.ok(owner.size.height >= 64 + 25 + 13 * 25 + 8);
  assert.ok(owner.size.width >= 224);
});

test('nested containment renders nested matrix frames with non-overlapping cells', () => {
  const index = indexNode('root', 'Root', 1, 'root-a');
  const nodePool = {
    'root-a': {
      id: 'root-a',
      label: 'Root',
      tags: [],
      card: { nodeId: 'root-a', title: 'Root', tabs: [] },
    },
    'child-b': {
      id: 'child-b',
      label: 'Child B',
      tags: [],
      card: { nodeId: 'child-b', title: 'Child B', tabs: [] },
    },
    'leaf-c': {
      id: 'leaf-c',
      label: 'Leaf C',
      tags: [],
      card: { nodeId: 'leaf-c', title: 'Leaf C', tabs: [] },
    },
  };
  const layout = buildUnifiedIndexGraph({
    ownerId: 'root-a',
    ownerLabel: 'Root',
    index,
    relationRootId: 'root-a',
    relationRootLabel: 'Root',
    relationGraph: {
      maxDepth: 0,
      nodes: [{ nodeId: 'root-a', depth: 0 }],
      edges: [],
    },
    knowledgeEdges: [
      { id: 'contains-b', source: 'root-a', target: 'child-b', type: 'belongs-to', label: 'contains' },
      { id: 'contains-c', source: 'child-b', target: 'leaf-c', type: 'belongs-to', label: 'contains' },
    ],
    nodePool,
  });

  const root = layout.nodes.find((node) => node.knowledgeNodeId === 'root-a');
  const child = layout.nodes.find((node) => node.knowledgeNodeId === 'child-b');
  const leaf = layout.nodes.find((node) => node.knowledgeNodeId === 'leaf-c');

  const rootFrame = layout.containmentFrames.find((frame) => frame.knowledgeNodeId === 'root-a');
  const childFrame = layout.containmentFrames.find((frame) => frame.knowledgeNodeId === 'child-b');
  assert.ok(rootFrame);
  assert.ok(childFrame);
  assert.ok(frameContainsNode(rootFrame, root));
  assert.ok(frameContainsNode(rootFrame, child));
  assert.ok(frameContainsNode(rootFrame, leaf));
  assert.ok(frameContainsNode(childFrame, child));
  assert.ok(frameContainsNode(childFrame, leaf));
  assert.equal(rectanglesOverlap(root, child), false);
  assert.equal(rectanglesOverlap(child, leaf), false);
  assert.equal(rectanglesOverlap(root, leaf), false);
});

test('a wide nested matrix does not force its smaller siblings into one column', () => {
  const nestedChildren = Array.from({ length: 25 }, (_, index) => `nested-${index}`);
  const siblingIds = Array.from({ length: 5 }, (_, index) => `sibling-${index}`);
  const nodePool = Object.fromEntries(
    ['root', 'wide-child', ...nestedChildren, ...siblingIds].map((nodeId) => [nodeId, {
      id: nodeId,
      label: nodeId,
      tags: [],
      card: { nodeId, title: nodeId, tabs: [] },
    }]),
  );
  const layout = buildUnifiedIndexGraph({
    ownerId: 'root',
    ownerLabel: 'Root',
    index: indexNode('root-index', 'Root', 1, 'root'),
    relationRootId: 'root',
    relationRootLabel: 'Root',
    relationGraph: {
      maxDepth: 0,
      nodes: [{ nodeId: 'root', depth: 0 }],
      edges: [],
    },
    knowledgeEdges: [
      { id: 'contains-wide', source: 'root', target: 'wide-child', type: 'belongs-to', label: 'contains' },
      ...siblingIds.map((nodeId) => ({
        id: `contains-${nodeId}`,
        source: 'root',
        target: nodeId,
        type: 'belongs-to',
        label: 'contains',
      })),
      ...nestedChildren.map((nodeId) => ({
        id: `wide-contains-${nodeId}`,
        source: 'wide-child',
        target: nodeId,
        type: 'belongs-to',
        label: 'contains',
      })),
    ],
    nodePool,
  });

  const siblingNodes = layout.nodes.filter(
    (node) => siblingIds.includes(node.knowledgeNodeId),
  );
  const siblingColumns = new Set(siblingNodes.map(
    (node) => Math.round(node.position.x - node.size.width / 2),
  ));
  assert.ok(
    siblingColumns.size >= 2,
    'small siblings should keep packing across a row after a wide nested matrix',
  );
});

test('short containment boxes fill the space beside a tall nested subtree', () => {
  const nestedChildren = Array.from({ length: 9 }, (_, index) => `nested-${index}`);
  const siblingIds = Array.from({ length: 6 }, (_, index) => `sibling-${index}`);
  const nodePool = Object.fromEntries(
    ['root', 'tall-child', ...nestedChildren, ...siblingIds].map((nodeId) => [nodeId, {
      id: nodeId,
      label: nodeId,
      tags: [],
      card: { nodeId, title: nodeId, tabs: [] },
    }]),
  );
  const layout = buildUnifiedIndexGraph({
    ownerId: 'root',
    ownerLabel: 'Root',
    index: indexNode('root-index', 'Root', 1, 'root'),
    relationRootId: 'root',
    relationRootLabel: 'Root',
    relationGraph: {
      maxDepth: 0,
      nodes: [{ nodeId: 'root', depth: 0 }],
      edges: [],
    },
    knowledgeEdges: [
      { id: 'contains-tall', source: 'root', target: 'tall-child', type: 'belongs-to', label: 'contains' },
      ...siblingIds.map((nodeId) => ({
        id: `contains-${nodeId}`,
        source: 'root',
        target: nodeId,
        type: 'belongs-to',
        label: 'contains',
      })),
      ...nestedChildren.map((nodeId) => ({
        id: `tall-contains-${nodeId}`,
        source: 'tall-child',
        target: nodeId,
        type: 'belongs-to',
        label: 'contains',
      })),
    ],
    nodePool,
  });

  const tall = layout.nodes.find((node) => node.knowledgeNodeId === 'tall-child');
  const nestedNodes = layout.nodes.filter((node) => nestedChildren.includes(node.knowledgeNodeId));
  const siblings = layout.nodes.filter((node) => siblingIds.includes(node.knowledgeNodeId));
  const tallSubtree = [tall, ...nestedNodes];
  const tallLeft = Math.min(...tallSubtree.map((node) => node.position.x - node.size.width / 2));
  const tallRight = Math.max(...tallSubtree.map((node) => node.position.x + node.size.width / 2));
  const tallTop = Math.min(...tallSubtree.map((node) => node.position.y - node.size.height / 2));
  const tallBottom = Math.max(...tallSubtree.map((node) => node.position.y + node.size.height / 2));
  assert.ok(
    siblings.some((node) => (
      (
        node.position.x + node.size.width / 2 <= tallLeft + 1
        || node.position.x - node.size.width / 2 >= tallRight - 1
      )
      && node.position.y + node.size.height / 2 > tallTop + 1
      && node.position.y - node.size.height / 2 < tallBottom - 1
    )),
    'at least one small sibling should occupy the empty space beside the tall subtree',
  );
  const topLevelChildren = [tall, ...siblings];
  for (let leftIndex = 0; leftIndex < topLevelChildren.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < topLevelChildren.length; rightIndex += 1) {
      const left = topLevelChildren[leftIndex];
      const right = topLevelChildren[rightIndex];
      assert.equal(rectanglesOverlap(left, right), false);
    }
  }
});

test('large indexes follow the viewport aspect ratio instead of collapsing into a strip', () => {
  const nodeIds = Array.from({ length: 120 }, (_, index) => `node-${index}`);
  const nodePool = Object.fromEntries(nodeIds.map((nodeId) => [nodeId, {
    id: nodeId,
    label: nodeId,
    tags: [],
    card: { nodeId, title: nodeId, tabs: [] },
  }]));
  const layout = buildUnifiedIndexGraph({
    ownerId: nodeIds[0],
    ownerLabel: nodeIds[0],
    index: indexNode('root-index', nodeIds[0], 1, nodeIds[0]),
    relationRootId: nodeIds[0],
    relationRootLabel: nodeIds[0],
    relationGraph: {
      maxDepth: 0,
      nodes: nodeIds.map((nodeId) => ({ nodeId, depth: 0 })),
      edges: [],
    },
    knowledgeEdges: [],
    nodePool,
    targetAspectRatio: 0.5,
  });

  assert.ok(Math.abs(layout.width / layout.height - 0.5) < 0.02);
});

test('shared containment descendants occupy one physical matrix region', () => {
  const nodePool = Object.fromEntries(['root-a', 'root-b', 'shared'].map((nodeId) => [nodeId, {
    id: nodeId,
    label: nodeId,
    tags: [],
    card: { nodeId, title: nodeId, tabs: [] },
  }]));
  const layout = buildUnifiedIndexGraph({
    ownerId: 'root-a',
    ownerLabel: 'root-a',
    index: indexNode('root-index', 'root-a', 1, 'root-a'),
    relationRootId: 'root-a',
    relationRootLabel: 'root-a',
    relationGraph: {
      maxDepth: 0,
      nodes: [
        { nodeId: 'root-a', depth: 0 },
        { nodeId: 'root-b', depth: 0 },
      ],
      edges: [],
    },
    knowledgeEdges: [
      { id: 'a-shared', source: 'root-a', target: 'shared', type: 'belongs-to', label: 'contains' },
      { id: 'b-shared', source: 'root-b', target: 'shared', type: 'belongs-to', label: 'contains' },
    ],
    nodePool,
    targetAspectRatio: 1,
  });

  const shared = layout.nodes.find((node) => node.knowledgeNodeId === 'shared');
  const physicalParentFrames = layout.containmentFrames.filter(
    (frame) => frame.knowledgeNodeId === 'root-a' || frame.knowledgeNodeId === 'root-b',
  );
  assert.equal(physicalParentFrames.length, 1);
  assert.ok(frameContainsNode(physicalParentFrames[0], shared));
});

test('an explicit tree hierarchy overrides auxiliary containment parentage', () => {
  const nodePool = Object.fromEntries(['root', 'branch-a', 'branch-b', 'leaf'].map((nodeId) => [nodeId, {
    id: nodeId,
    label: nodeId,
    tags: [],
    card: { nodeId, title: nodeId, tabs: [] },
  }]));
  const layout = buildUnifiedIndexGraph({
    ownerId: 'root',
    ownerLabel: 'root',
    index: indexNode('root-index', 'root', 1, 'root'),
    relationRootId: 'root',
    relationRootLabel: 'root',
    relationGraph: {
      maxDepth: 0,
      nodes: [{ nodeId: 'root', depth: 0 }],
      edges: [],
    },
    knowledgeEdges: [
      { id: 'root-a', source: 'root', target: 'branch-a', type: 'belongs-to', label: 'contains' },
      { id: 'root-b', source: 'root', target: 'branch-b', type: 'belongs-to', label: 'contains' },
      { id: 'wrong-parent', source: 'branch-a', target: 'leaf', type: 'belongs-to', label: 'contains' },
    ],
    containmentEdges: [
      { id: 'tree-root-a', source: 'root', target: 'branch-a', type: 'belongs-to', label: 'contains' },
      { id: 'tree-root-b', source: 'root', target: 'branch-b', type: 'belongs-to', label: 'contains' },
      { id: 'tree-right-parent', source: 'branch-b', target: 'leaf', type: 'belongs-to', label: 'contains' },
    ],
    nodePool,
    targetAspectRatio: 1,
  });

  const leaf = layout.nodes.find((node) => node.knowledgeNodeId === 'leaf');
  const branchAFrame = layout.containmentFrames.find(
    (frame) => frame.knowledgeNodeId === 'branch-a',
  );
  const branchBFrame = layout.containmentFrames.find(
    (frame) => frame.knowledgeNodeId === 'branch-b',
  );
  assert.equal(branchAFrame, undefined);
  assert.ok(branchBFrame);
  assert.ok(frameContainsNode(branchBFrame, leaf));
});

test('logical dependencies use typed lines while belongs-to only keeps child nodes visible', () => {
  const { index, nodePool, relationGraph } = fixture();
  const layout = buildUnifiedIndexGraph({
    ownerId: 'hash-map',
    ownerLabel: 'HashMap',
    index,
    relationRootId: 'hash-map',
    relationRootLabel: 'HashMap',
    relationGraph,
    knowledgeEdges: [
      { id: 'uses-allocator', source: 'hash-map', target: 'allocator', type: 'uses', label: 'uses' },
      { id: 'tree-parent', source: 'hash-map', target: 'allocator', type: 'belongs-to', label: 'contains' },
    ],
    nodePool,
  });

  assert.ok(layout.edges.some((edge) => edge.kind === UnifiedIndexEdgeKind.Dependency));
  assert.equal(layout.edges.some((edge) => edge.kind === 'contains'), false);
  assert.equal(layout.nodes.find((node) => node.knowledgeNodeId === 'allocator')?.containedChild, true);
});

test('type edges between contained children render in the owner layout', () => {
  const { index, nodePool } = fixture();
  const layout = buildUnifiedIndexGraph({
    ownerId: 'hash-map',
    ownerLabel: 'HashMap',
    index,
    relationRootId: 'hash-map',
    relationRootLabel: 'HashMap',
    relationGraph: {
      maxDepth: 0,
      nodes: [{ nodeId: 'hash-map', depth: 0 }],
      edges: [],
    },
    knowledgeEdges: [
      { id: 'contains-abstract', source: 'hash-map', target: 'abstract-map', type: 'belongs-to', label: 'contains' },
      { id: 'contains-map', source: 'hash-map', target: 'map', type: 'belongs-to', label: 'contains' },
      { id: 'abstract-implements-map', source: 'abstract-map', target: 'map', type: 'implements', label: 'implements' },
    ],
    nodePool,
  });

  assert.ok(layout.edges.some((edge) => edge.id === 'abstract-implements-map'));
});

test('the persisted Map example contains the requested Java type relations', () => {
  const nodePool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));
  const edges = JSON.parse(fs.readFileSync(path.resolve('data/knowledge-edges.json'), 'utf8'));
  const hasRelation = (sourceLabel, targetLabel, type) => edges.some((edge) => (
    nodePool[edge.source]?.label === sourceLabel
    && nodePool[edge.target]?.label === targetLabel
    && edge.type === type
  ));

  assert.equal(hasRelation('HashMap', 'AbstractMap', 'extends'), true);
  assert.equal(hasRelation('AbstractMap', 'Map', 'implements'), true);
  assert.equal(hasRelation('HashMap', 'Cloneable', 'implements'), true);
  assert.equal(hasRelation('HashMap', 'Serializable', 'implements'), true);
});

test('related class headers expose independent edit paths and typed relation markers', () => {
  const graphSource = fs.readFileSync(
    path.resolve('src/core/explanation-index/UnifiedIndexGraph.tsx'),
    'utf8',
  );
  assert.match(graphSource, /aria-label={`编辑 \$\{graphNode\.label\}`}/);
  assert.doesNotMatch(graphSource, /is-contains/);
  assert.match(graphSource, /TypeRelationKind\.Extends/);
  assert.match(graphSource, /TypeRelationKind\.Implements/);
});

test('graph boxes expose inline child creation, label and tag editing, deletion, and collapse controls', () => {
  const graphSource = fs.readFileSync(
    path.resolve('src/core/explanation-index/UnifiedIndexGraph.tsx'),
    'utf8',
  );

  assert.match(graphSource, /className="explanation-index-class-collapse"/);
  assert.match(graphSource, /className="explanation-index-class-member-collapse"/);
  assert.match(graphSource, /aria-expanded=\{!graphNode\.collapsed\}/);
  assert.match(graphSource, /beginInlineEdit\(memberEditTargetId, member\.selection, member\.label\)/);
  assert.match(graphSource, /onRenameSelection\(inlineEditDraft\.selection, label\)/);
  assert.match(graphSource, /className="explanation-index-inline-editor is-member"/);
  assert.match(graphSource, /explanation-index-inline-tag-editor is-\$\{placement\}/);
  assert.match(graphSource, /renderInlineTagEditor\('member', `编辑 \$\{member\.label\} 的 tags`/);
  assert.match(graphSource, /className="explanation-index-class-member-tag-edit"/);
  assert.match(graphSource, /onSetSelectionTags\(inlineTagDraft\.selection, parseTagDraft\(inlineTagDraft\.value\)\)/);
  assert.match(graphSource, /graphNode\.tags\.slice\(0, 3\)/);
  assert.match(graphSource, /member\.tags\.map/);
  assert.match(graphSource, /className="explanation-index-class-member-delete"/);
  assert.match(graphSource, /className="explanation-index-class-member-child-add"/);
  assert.match(graphSource, /className="explanation-index-class-member-root-add"/);
  assert.match(graphSource, /renderInlineChildEditor\('member'/);
  assert.match(graphSource, /onAddChildSelection\(inlineChildDraft\.selection, label\)/);
  assert.match(graphSource, /onRemoveSelection\(member\.selection\)/);
  assert.match(graphSource, /canRemoveSelection\(member\.selection\)/);
});

test('leaf graph nodes use one full-height title surface without an empty body', () => {
  const graphSource = fs.readFileSync(
    path.resolve('src/core/explanation-index/UnifiedIndexGraph.tsx'),
    'utf8',
  );
  const styleSource = fs.readFileSync(
    path.resolve('src/styles/index-diagram.css'),
    'utf8',
  );

  assert.match(graphSource, /const isLeaf = !isMatrixHost && graphNode\.memberCount === 0/);
  assert.match(graphSource, /isLeaf \? ' is-leaf' : ''/);
  assert.match(
    styleSource,
    /\.explanation-index-class-node\.is-leaf \.explanation-index-class-header \{[\s\S]*?min-height: 100%;[\s\S]*?height: 100%;[\s\S]*?border-bottom: 0;/,
  );
});

test('the index view wires every graph editing callback', () => {
  const viewSource = fs.readFileSync(
    path.resolve('src/core/ExplanationIndexView.tsx'),
    'utf8',
  );

  assert.match(viewSource, /onCreateNodeAt=\{handleCreateGraphNodeAt\}/);
  assert.match(viewSource, /onCreateGroup=\{handleCreateGraphGroup\}/);
  assert.match(viewSource, /onUngroup=\{handleUngroupGraphNodes\}/);
  assert.match(viewSource, /onRemoveNodes=\{handleRemoveGraphNodes\}/);
  assert.match(viewSource, /onDeleteNodes=\{handleDeleteGraphNodes\}/);
  assert.match(viewSource, /onRemoveEdges=\{handleRemoveGraphEdges\}/);
  assert.match(viewSource, /onRenameSelection=\{renameGraphSelection\}/);
  assert.match(viewSource, /onSetSelectionTags=\{setIndexTags\}/);
  assert.match(viewSource, /canRemoveSelection=\{canRemoveGraphSelection\}/);
  assert.match(viewSource, /onRemoveSelection=\{removeGraphSelection\}/);
  assert.match(viewSource, /onAddChildSelection=\{addGraphIndexChild\}/);
  assert.match(viewSource, /ExplanationIndexRelationKind\.Contains/);
  assert.match(viewSource, /addContainmentRelation\(editingRelationRootId, targetId\)/);
});

test('blank marquee pointerdown preserves the native double-click event', () => {
  const canvasSource = fs.readFileSync(
    path.resolve('src/core/explanation-index/IndexCanvas.tsx'),
    'utf8',
  );
  const marqueeBranch = canvasSource.match(
    /if \(isBlankPrimary && !isSpacePrimary && onMarqueeSelect\) \{([\s\S]*?)\n    \}/,
  )?.[1] ?? '';

  assert.ok(marqueeBranch);
  assert.doesNotMatch(marqueeBranch, /event\.preventDefault\(\)/);
});
