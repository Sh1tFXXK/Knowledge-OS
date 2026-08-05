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

  const graphSource = fs.readFileSync(
    path.resolve('src/core/explanation-index/UnifiedIndexGraph.tsx'),
    'utf8',
  );
  assert.match(graphSource, /className="explanation-index-containment-matrix"/);
  assert.match(graphSource, /包含（矩阵）/);
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
