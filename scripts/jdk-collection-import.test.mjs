import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApiTab,
  collectTreeBindings,
  javadocTextToMarkdown,
  MEMBER_KIND,
  reconcileTypeEdges,
  TYPE_RELATION_KIND,
} from './import-jdk-collections.mjs';

const source = {
  displayPath: 'C:\\jdk!\\java.base\\java\\util',
  runtimeVersion: '26.0.1+8',
  featureVersion: 26,
};

const listType = {
  className: 'java.util.List',
  simpleName: 'List',
  kind: 'interface',
  finalType: false,
  relations: [{ targetClassName: 'java.util.Collection', kind: 'extends' }],
  members: [
    {
      kind: MEMBER_KIND.Method,
      name: 'add',
      signature: 'public abstract boolean add(E)',
      visibility: 'public',
      staticMember: false,
      abstractMember: true,
      defaultMethod: false,
      finalMember: false,
      synchronizedMember: false,
      nativeMember: false,
      varArgs: false,
      returnType: 'boolean',
      parameterTypes: ['E'],
      exceptionTypes: [],
    },
  ],
};

test('collectTreeBindings preserves explicit parent ownership', () => {
  const root = {
    id: 'root',
    name: 'root',
    nodeRef: 'k_root',
    children: [{ id: 'child', name: 'List', nodeRef: 'k_list' }],
  };
  const bindings = collectTreeBindings(root);
  assert.equal(bindings.length, 2);
  assert.equal(bindings[1].parent.id, 'root');
});

test('buildApiTab keeps methods owned by the declaring type', () => {
  const tab = buildApiTab(listType, source);
  assert.equal(tab.label, 'JDK 26 API');
  assert.match(tab.content, /directly declared|直接声明/);
  assert.equal(tab.pages.length, 1);
  assert.equal(tab.pages[0].pages[0].label, 'add(E)');
  assert.match(tab.pages[0].pages[0].content, /public abstract boolean add\(E\)/);
});

test('Javadoc conversion preserves technical comparisons and links', () => {
  const markdown = javadocTextToMarkdown(
    'Fails when {@code index < 0 || index >= size()}; see {@link List#get(int)}.',
  );
  assert.match(markdown, /`index < 0 \|\| index >= size\(\)`/);
  assert.match(markdown, /`List#get\(int\)`/);
});

test('reconcileTypeEdges corrects known relation kinds and keeps unrelated edges', () => {
  const collectionType = {
    className: 'java.util.Collection',
    simpleName: 'Collection',
    kind: 'interface',
    finalType: false,
    members: [],
    relations: [],
  };
  const edges = reconcileTypeEdges({
    edges: [
      {
        id: 'wrong',
        source: 'k_list',
        target: 'k_collection_old',
        type: TYPE_RELATION_KIND.Implements,
        label: TYPE_RELATION_KIND.Implements,
      },
      {
        id: 'unrelated',
        source: 'other',
        target: 'target',
        type: 'depends-on',
        label: 'depends-on',
      },
    ],
    types: [listType, collectionType],
    canonicalByClassName: new Map([
      ['java.util.List', 'k_list'],
      ['java.util.Collection', 'k_collection'],
    ]),
    classByNodeId: new Map([
      ['k_list', 'java.util.List'],
      ['k_collection_old', 'java.util.Collection'],
      ['k_collection', 'java.util.Collection'],
    ]),
  });

  assert.deepEqual(
    edges.find((edge) => edge.id === 'wrong'),
    {
      id: 'wrong',
      source: 'k_list',
      target: 'k_collection',
      type: TYPE_RELATION_KIND.Extends,
      label: TYPE_RELATION_KIND.Extends,
    },
  );
  assert.ok(edges.some((edge) => edge.id === 'unrelated'));
});
