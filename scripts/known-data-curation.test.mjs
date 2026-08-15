import assert from 'node:assert/strict';
import test from 'node:test';
import { applyKnownDataCuration } from './known-data-curation.mjs';

function node(id, label, tabs = []) {
  return { id, label, tags: [label], card: { nodeId: id, title: label, tabs } };
}

test('known data curation redistributes mixed content and preserves locations', () => {
  const dataset = {
    tree: {
      id: 'root',
      name: 'Root',
      nodeRef: 'root',
      children: [
        { id: 'tree_1786353277269_msn0ma8va', name: 'HashMap', nodeRef: 'k_1786353277269_msn0ma8u9' },
        { id: 'tree_1783257472852_p2hjqx', name: '运算符', nodeRef: 'k_1783257472821_qkhnyb' },
        { id: 'tree_1786340543323_fn7slv', name: 'redis穿透', nodeRef: 'k_1786340543087_8xkvg2' },
        {
          id: 'demo_mysql',
          name: 'MySQL',
          nodeRef: 'mysql',
          children: [{
            id: 'mysql_term_programming_language_theory_cursor_1dm61e',
            name: '游标 / cursor',
            nodeRef: 'k_dict_a7bwz8vl',
          }],
        },
        {
          id: 'theory_domain_programming_language_theory',
          name: '程序语言理论',
          nodeRef: 'theory_domain_programming_language_theory',
          children: [],
        },
        {
          id: 'tree_1783106326972_d38frh',
          name: 'happens-before规则',
          nodeRef: 'k_1783106326946_m9gxsx',
          children: [{
            id: 'tree_1785931020220_nv2thq',
            name: 'happens-before规则',
            nodeRef: 'k_1785931019996_6wqiay',
          }],
        },
        { id: 'mysql_term_compiler_principles_nosql_ibc5bh', name: 'NoSQL', nodeRef: 'nosql' },
        {
          id: 'tree_wiki_en_database',
          name: 'Database',
          nodeRef: 'database',
          children: [{
            id: 'tree_wiki_en_database_s1',
            name: 'Database section',
            nodeRef: 'database-section',
          }],
        },
        { id: 'tree_wiki_en_outline_of_databases_s16_b1', name: 'Database model', nodeRef: 'database-model' },
      ],
    },
    nodePool: {
      root: node('root', 'Root'),
      k_1785463930010_invjhq: node('k_1785463930010_invjhq', 'HashMap'),
      k_1785669524969_nkpajb: node('k_1785669524969_nkpajb', 'TreeMap'),
      k_1786353277269_msn0ma8u9: node('k_1786353277269_msn0ma8u9', 'HashMap', [
        { id: 'jimi-8', label: '红黑树详解', content: 'TreeMap content' },
        { id: 'jimi-17', label: '并发死循环分析', content: 'HashMap content' },
      ]),
      k_1783257396123_5jl7e4: node('k_1783257396123_5jl7e4', '运算符'),
      k_1783257472821_qkhnyb: node('k_1783257472821_qkhnyb', '运算符'),
      k_1786340543087_8xkvg2: node('k_1786340543087_8xkvg2', 'redis穿透'),
      k_demo_java_array_list: node('k_demo_java_array_list', 'ArrayList'),
      k_1785598529307_5vm533: {
        ...node('k_1785598529307_5vm533', '常用方法'),
        card: {
          nodeId: 'k_1785598529307_5vm533',
          title: '常用方法',
          rootContent: 'add()\nremove()\nsize()',
          tabs: [],
        },
      },
      k_1785595217285_b3foak: node('k_1785595217285_b3foak', 'TreeMap'),
      mysql: node('mysql', 'MySQL'),
      theory_domain_programming_language_theory: node(
        'theory_domain_programming_language_theory',
        '程序语言理论',
      ),
      k_1783106326946_m9gxsx: {
        ...node('k_1783106326946_m9gxsx', 'happens-before规则'),
        card: {
          nodeId: 'k_1783106326946_m9gxsx',
          title: 'happens-before规则',
          rootContent: 'base rules',
          tabs: [],
        },
      },
      k_1785931019996_6wqiay: {
        ...node('k_1785931019996_6wqiay', 'happens-before规则'),
        card: {
          nodeId: 'k_1785931019996_6wqiay',
          title: 'happens-before规则',
          rootContent: 'summary rules',
          tabs: [],
        },
      },
      nosql: node('nosql', 'NoSQL'),
      database: node('database', 'Database'),
      'database-section': node('database-section', 'Database section'),
      'database-model': node('database-model', 'Database model'),
      k_dict_a7bwz8vl: node('k_dict_a7bwz8vl', '游标 / cursor'),
      k_java_type_49d4256a230efe07: {
        ...node('k_java_type_49d4256a230efe07', 'Node'),
        relationIndex: { rootNodeId: 'k_java_type_49d4256a230efe07' },
      },
    },
    edges: [
      { id: 'operator-edge', source: 'root', target: 'k_1783257472821_qkhnyb', type: 'belongs-to', label: 'contains' },
      { id: 'cursor-edge', source: 'mysql', target: 'k_dict_a7bwz8vl', type: 'belongs-to', label: 'contains' },
      {
        id: 'treebind:tree_1783106326972_d38frh:tree_1785931020220_nv2thq',
        source: 'k_1783106326946_m9gxsx',
        target: 'k_1785931019996_6wqiay',
        type: 'belongs-to',
        label: 'contains',
        relationKind: 'structure',
      },
    ],
    questions: [
      { id: 'q1', text: 'HashMap?', answered: false, relatedNodeId: 'k_1786353277269_msn0ma8u9' },
    ],
    timeline: [
      { id: 's1', knowledgeNodeId: 'k_1783257472821_qkhnyb' },
      { id: 's-hb', knowledgeNodeId: 'k_1785931019996_6wqiay' },
    ],
  };

  const result = applyKnownDataCuration(dataset);
  assert.equal(result.dataset.nodePool.k_1786353277269_msn0ma8u9, undefined);
  assert.equal(result.dataset.nodePool.k_1783257472821_qkhnyb, undefined);
  assert.equal(result.dataset.nodePool.k_java_type_49d4256a230efe07, undefined);
  assert.equal(result.dataset.nodePool.k_1785598529307_5vm533, undefined);
  assert.equal(result.dataset.nodePool.k_1785595217285_b3foak, undefined);
  assert.equal(result.dataset.questions[0].relatedNodeId, 'k_1785463930010_invjhq');
  assert.ok(result.dataset.nodePool.k_1785463930010_invjhq.card.tabs.some((tab) => tab.id === 'jimi-17'));
  assert.ok(result.dataset.nodePool.k_1785669524969_nkpajb.card.tabs.some((tab) => tab.id === 'jimi-8'));
  assert.ok(result.dataset.nodePool.k_demo_java_array_list.card.tabs.some(
    (tab) => tab.id === 'curated_array_list_common_methods',
  ));
  assert.equal(result.dataset.nodePool.k_1786340543087_8xkvg2.label, 'redis击穿');
  assert.deepEqual(result.dataset.tree.children.map((child) => child.id), [
    'tree_1786340543323_fn7slv',
    'demo_mysql',
    'theory_domain_programming_language_theory',
    'tree_1783106326972_d38frh',
    'tree_wiki_en_database_s1',
  ]);
  assert.equal(result.dataset.tree.children[1].children.length, 0);
  assert.equal(result.dataset.tree.children[2].children[0].nodeRef, 'k_dict_a7bwz8vl');
  assert.deepEqual(result.dataset.edges, [{
    id: 'treebind:theory_domain_programming_language_theory:mysql_term_programming_language_theory_cursor_1dm61e',
    source: 'theory_domain_programming_language_theory',
    target: 'k_dict_a7bwz8vl',
    type: 'belongs-to',
    label: 'contains',
    relationKind: 'structure',
    dimensions: ['storage'],
  }]);
  assert.equal(result.dataset.timeline.length, 1);
  assert.equal(result.dataset.nodePool.k_1785931019996_6wqiay, undefined);
  assert.equal(result.dataset.nodePool.k_1783106326946_m9gxsx.card.tabs[0].id, 'curated_happens_before_rules_summary');
  assert.equal(result.dataset.nodePool.k_1783106326946_m9gxsx.card.tabs[0].content, 'summary rules');
  assert.equal(result.dataset.tree.children[3].children.length, 0);
  assert.equal(result.dataset.tree.children.some((child) => child.id === 'mysql_term_compiler_principles_nosql_ibc5bh'), false);
  assert.equal(result.dataset.tree.children.some((child) => child.id === 'tree_wiki_en_database'), false);
  assert.equal(
    result.dataset.tree.children.find((child) => child.id === 'tree_wiki_en_database_s1')?.nodeRef,
    'database-section',
  );
  assert.equal(result.dataset.tree.children.some((child) => child.id === 'tree_wiki_en_outline_of_databases_s16_b1'), false);
  assert.equal(result.dataset.timeline[0].knowledgeNodeId, 'k_1783106326946_m9gxsx');

  const second = applyKnownDataCuration(result.dataset);
  assert.deepEqual(second.dataset, result.dataset);
  for (const value of Object.values(second.stats)) assert.equal(value, 0);
});
