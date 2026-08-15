import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOverlapTreeCuration } from './overlap-duplicate-resolutions.mjs';

function node(id, label) {
  return {
    id,
    label,
    card: { nodeId: id, title: label, tabs: [] },
  };
}

test('tree overlap curation preserves both child sets and source supplements', () => {
  const dataset = {
    tree: {
      id: 'root',
      name: 'Root',
      nodeRef: 'root',
      children: [
        {
          id: 'tree_acm2012_security',
          name: 'Security source',
          nodeRef: 'school_security',
          supplement: {
            tabs: [{ id: 'source-context', label: 'Source', content: 'source notes' }],
          },
          children: [{
            id: 'tree_acm2012_security_cryptography',
            name: 'Cryptography',
            nodeRef: 'theory_domain_cryptography',
            children: [],
          }],
        },
        {
          id: 'school_security',
          name: 'Security target',
          nodeRef: 'school_security',
          children: [
            {
              id: 'theory_domain_cryptography',
              name: 'Cryptography',
              nodeRef: 'theory_domain_cryptography',
              children: [{ id: 'ssl', name: 'SSL', nodeRef: 'ssl', children: [] }],
            },
            { id: 'access-control', name: 'Access control', nodeRef: 'access-control', children: [] },
          ],
        },
      ],
    },
    nodePool: {
      root: node('root', 'Root'),
      school_security: node('school_security', 'Security'),
      theory_domain_cryptography: node('theory_domain_cryptography', 'Cryptography'),
      ssl: node('ssl', 'SSL'),
      'access-control': node('access-control', 'Access control'),
    },
    edges: [],
    questions: [],
    timeline: [],
  };

  const first = applyOverlapTreeCuration(dataset);
  assert.deepEqual(first.dataset.tree.children.map((child) => child.id), ['school_security']);
  const security = first.dataset.tree.children[0];
  assert.deepEqual(
    security.children.map((child) => child.id),
    ['theory_domain_cryptography', 'access-control'],
  );
  assert.equal(security.children[0].children[0].id, 'ssl');
  assert.equal(security.supplement.tabs[0].content, 'source notes');
  assert.equal(first.stats.treeEntriesConsolidated, 1);
  assert.equal(first.stats.duplicateChildEntriesConsolidated, 1);

  const second = applyOverlapTreeCuration(first.dataset);
  assert.deepEqual(second.dataset, first.dataset);
  for (const [key, value] of Object.entries(second.stats)) assert.equal(value, 0, key);
});
