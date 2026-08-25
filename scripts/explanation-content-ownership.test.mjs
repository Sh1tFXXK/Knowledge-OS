import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeExplanationCard,
  normalizeExplanationContentOwnership,
} from './explanation-content-ownership.mjs';

const SYNTHETIC_PAGE = '\u901a\u7528\u9875\u9762';
const SYNTHETIC_DEFINITION = '\u901a\u7528\u5b9a\u4e49';
const SUPPLEMENT_PAGE = '\u8865\u5145\u9875\u9762';
const SUPPLEMENT_DEFINITION = '\u8865\u5145\u5b9a\u4e49';

function tab(id, content, pages) {
  return {
    id,
    label: id === 'def' ? '\u5b9a\u4e49' : id,
    content,
    ...(pages ? { pages } : {}),
  };
}

function page(id, label, content, extra = {}) {
  return { id, label, content, ...extra };
}

test('removes an exact synthetic page while retaining the tab body', () => {
  const card = {
    nodeId: 'node-1',
    title: 'Node 1',
    tabs: [
      tab('overview', 'body', [page('overview', SYNTHETIC_PAGE, 'body')]),
    ],
  };

  const result = normalizeExplanationCard(card);

  assert.deepEqual(result.card.tabs[0].content, 'body');
  assert.equal('pages' in result.card.tabs[0], false);
  assert.equal(result.stats.removed, 1);
  assert.deepEqual(result.stats.removedIds, ['overview']);
});

test('renames a divergent synthetic page instead of dropping its content', () => {
  const card = {
    nodeId: 'node-2',
    title: 'Node 2',
    tabs: [
      tab('overview', 'tab body', [page('overview', SYNTHETIC_PAGE, 'page body')]),
    ],
  };

  const result = normalizeExplanationCard(card);
  const normalized = result.card.tabs[0].pages[0];

  assert.equal(normalized.label, SUPPLEMENT_PAGE);
  assert.equal(normalized.content, 'page body');
  assert.equal(result.stats.removed, 0);
  assert.equal(result.stats.renamed, 1);
  assert.deepEqual(result.stats.renamedIds, ['overview']);
});

test('normalizes legacy definitionPages without losing an explicit second page', () => {
  const card = {
    nodeId: 'node-3',
    title: 'Node 3',
    tabs: [tab('def', 'definition body')],
    definitionPages: [
      page('def', SYNTHETIC_DEFINITION, 'definition body'),
      page('legacy-1', 'Historical wording', 'older source text'),
    ],
  };

  const result = normalizeExplanationCard(card);

  assert.deepEqual(result.card.tabs[0].pages, [
    page('legacy-1', 'Historical wording', 'older source text'),
  ]);
  assert.equal(result.card.definitionPages, undefined);
  assert.equal(result.stats.removed, 1);
  assert.equal(result.stats.renamed, 0);
});

test('preserves divergent legacy definition content and renames its synthetic label', () => {
  const card = {
    nodeId: 'node-4',
    title: 'Node 4',
    tabs: [tab('def', 'current definition')],
    definitionPages: [
      page('def', SYNTHETIC_DEFINITION, 'legacy definition'),
    ],
  };

  const result = normalizeExplanationCard(card);
  const normalized = result.card.tabs[0].pages[0];

  assert.equal(normalized.label, SUPPLEMENT_DEFINITION);
  assert.equal(normalized.content, 'legacy definition');
  assert.equal(result.card.definitionPages, undefined);
  assert.equal(result.stats.removed, 0);
  assert.equal(result.stats.renamed, 1);
});

test('does not crash or discard legacy definitionPages when the def tab is absent', () => {
  const card = {
    nodeId: 'node-5',
    title: 'Node 5',
    tabs: [tab('overview', 'overview body')],
    definitionPages: [
      page('def', SYNTHETIC_DEFINITION, 'legacy definition'),
    ],
  };

  assert.doesNotThrow(() => normalizeExplanationCard(card));
  const result = normalizeExplanationCard(card);

  assert.deepEqual(result.card.definitionPages, card.definitionPages);
  assert.equal(result.stats.removed, 0);
  assert.equal(result.stats.renamed, 0);
});

test('keeps synthetic-labeled pages that carry explicit page metadata', () => {
  const card = {
    nodeId: 'node-6',
    title: 'Node 6',
    tabs: [
      tab('overview', 'body', [
        page('overview', SYNTHETIC_PAGE, 'body', {
          tags: ['curated'],
          pages: [page('child', 'Child', 'child body')],
        }),
      ]),
    ],
  };

  const result = normalizeExplanationCard(card);

  assert.deepEqual(result.card.tabs[0].pages, card.tabs[0].pages);
  assert.equal(result.stats.removed, 0);
  assert.equal(result.stats.renamed, 0);
});

test('normalizes tree supplements independently from node-pool cards', () => {
  const nodePool = {
    'node-7': {
      id: 'node-7',
      label: 'Node 7',
      card: {
        nodeId: 'node-7',
        title: 'Node 7',
        tabs: [tab('overview', 'pool body')],
      },
    },
  };
  const tree = {
    id: 'root',
    name: 'Root',
    children: [{
      id: 'tree-7',
      name: 'Node 7',
      nodeRef: 'node-7',
      supplement: {
        tabs: [tab('overview', 'supplement body', [
          page('overview', SYNTHETIC_PAGE, 'supplement body'),
        ])],
      },
      children: [],
    }],
  };

  const result = normalizeExplanationContentOwnership({ tree, nodePool });
  const normalizedSupplement = result.tree.children[0].supplement.tabs[0];

  assert.equal('pages' in normalizedSupplement, false);
  assert.deepEqual(result.nodePool, nodePool);
  assert.equal(result.stats.removed, 1);
  assert.equal(result.stats.cardsChanged, 0);
});
