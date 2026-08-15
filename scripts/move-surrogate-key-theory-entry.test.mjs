import assert from 'node:assert/strict';
import test from 'node:test';
import { moveSurrogateKeyTheoryEntry } from './move-surrogate-key-theory-entry.mjs';

test('misclassified surrogate-key theory entry moves without changing its knowledge reference', () => {
  const tree = {
    id: 'universe',
    children: [
      {
        id: 'theory_domain_set_theory',
        nodeRef: 'theory_domain_set_theory',
        children: [{
          id: 'mysql_term_set_theory_surrogate_key_7ltqej',
          name: '代理键 / surrogate key',
          count: 0,
          nodeRef: 'k_dict_xb5t6pmm',
          children: [],
        }],
      },
      {
        id: 'theory_domain_normalization_theory',
        nodeRef: 'theory_domain_normalization_theory',
        children: [],
      },
    ],
  };
  const edges = [{
    id: 'treebind:theory_domain_set_theory:mysql_term_set_theory_surrogate_key_7ltqej',
    source: 'theory_domain_set_theory',
    target: 'k_dict_xb5t6pmm',
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
    dimensions: ['storage'],
  }];

  const result = moveSurrogateKeyTheoryEntry({ tree, edges });
  assert.equal(result.moved, true);
  assert.equal(tree.children[0].children.length, 0);
  assert.equal(tree.children[1].children[0].nodeRef, 'k_dict_xb5t6pmm');
  assert.equal(tree.children[1].children[0].id, 'mysql_term_normalization_theory_surrogate_key_7ltqej');
  assert.deepEqual(result.edges.map((edge) => edge.id), [
    'treebind:theory_domain_normalization_theory:mysql_term_normalization_theory_surrogate_key_7ltqej',
  ]);

  const second = moveSurrogateKeyTheoryEntry({ tree, edges: result.edges });
  assert.equal(second.moved, false);
});
