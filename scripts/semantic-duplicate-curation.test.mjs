import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applySemanticDuplicateCuration,
  CONTEXT_MIGRATIONS,
  DISTINCT_IDENTITY_ASSIGNMENTS,
  SEMANTIC_RESOLUTIONS,
} from './semantic-duplicate-curation.mjs';
import { OVERLAP_TREE_CONSOLIDATIONS } from './overlap-duplicate-resolutions.mjs';

function knowledgeNode(id, label, content, extra = {}) {
  return {
    id,
    label,
    tags: [label],
    card: {
      nodeId: id,
      title: label,
      rootContent: content,
      tabs: [],
    },
    ...extra,
  };
}

function treeNode(id, name, nodeRef, children = []) {
  return { id, name, nodeRef, children };
}

function buildDataset() {
  const nodes = {};
  for (const resolution of SEMANTIC_RESOLUTIONS) {
    for (const nodeId of resolution.memberIds) {
      nodes[nodeId] = knowledgeNode(
        nodeId,
        resolution.targetId === nodeId ? `${resolution.canonicalKey}:target` : `${resolution.canonicalKey}:source`,
        `content:${nodeId}`,
      );
    }
  }
  for (const assignment of DISTINCT_IDENTITY_ASSIGNMENTS) {
    nodes[assignment.nodeId] ??= knowledgeNode(
      assignment.nodeId,
      `distinct:${assignment.nodeId}`,
      `content:${assignment.nodeId}`,
    );
  }

  Object.assign(nodes, {
    root: knowledgeNode('root', 'Root', ''),
    demo_acid: knowledgeNode('demo_acid', 'ACID', 'mysql-specific-acid', {
      role: 'axiom',
      dimensions: ['transaction'],
      viewDimensions: [{
        id: 'mysql-acid-view',
        name: 'MySQL ACID',
        color: '#fff',
        sections: [],
      }],
    }),
    k_1784730311893_zahpq5: knowledgeNode(
      'k_1784730311893_zahpq5',
      'ACID',
      'generic-acid-definition',
    ),
    k_wiki_en_outline_of_databases_s11_b2: knowledgeNode(
      'k_wiki_en_outline_of_databases_s11_b2',
      'ACID',
      'short-acid-outline',
    ),
    k_1786288007184_cfwjih: knowledgeNode(
      'k_1786288007184_cfwjih',
      'ACID',
      'redis-specific-acid',
    ),
  });

  const migrationOccurrences = [
    treeNode('tree_1786288007373_pp3blo', 'Redis ACID', 'k_1786288007184_cfwjih'),
    treeNode('tree_1784452283804_by9a3l', 'Spring Framework DI', 'k_1784452283762_5dboq3'),
    treeNode('tree_1785214842845_4n40a4', 'Spring IOC DI', 'k_1785214842744_v601y4'),
    treeNode('tree_1782928703685_fuj7ev', 'Java optimistic lock', 'k_1782928703651_dpqbc4'),
    treeNode('tree_1782928843771_cmjyzt', 'Java pessimistic lock', 'k_1782928843737_biclf4'),
    treeNode('tree_1783157274734_po0bzr', 'OS StoreLoad', 'k_1783157274694_odbiuu'),
    treeNode('tree_1783157221230_hungj5', 'OS StoreStore', 'k_1783157221196_esfnre'),
    treeNode('tree_1783157247463_q2hnrn', 'OS LoadStore', 'k_1783157247430_n6ubvn'),
    treeNode(
      'tree_wiki_en_program_analysis_s1_s5',
      'Program analysis type system',
      'k_wiki_en_program_analysis_s5',
    ),
    treeNode('tree_1783871308881_fo1067', 'Java identifier', 'k_1783871308772_07svsw'),
    treeNode('tree_1786241497224_yi63e9', 'Redis transaction', 'k_1786241496998_be2umg'),
    treeNode('tree_1786338278239_rfh8os', 'Java OOP', 'k_1786338277733_gu5z4j'),
    treeNode('tree_java_syntax_zh_z9ne3', 'Java method', 'k_java_syntax_zh_z9ne3'),
    treeNode('tree_1784078753124_t8w4rv', 'Java constructor', 'k_1784078753095_ukevgi'),
    treeNode('tree_1785415709050_n3rbw5', 'Java thread pool', 'k_1785415708882_o3okfp'),
    treeNode('tree_java_syntax_zh_scbpwz', 'Java inheritance', 'k_java_syntax_zh_scbpwz'),
    treeNode('tree_1782930954515_g9b5bl', 'MySQL stored procedure', 'k_1782930954484_nwtfg7'),
    treeNode(
      'tree_1782813951312_jzp80c',
      'float',
      'k_1782813819683_ntjiho',
      [treeNode('tree_1783087864958_upthbo', 'Float', 'k_1783087864934_n0yzzj')],
    ),
  ];
  const existingMigrationTreeIds = new Set(migrationOccurrences.map((node) => node.id));
  for (const migration of CONTEXT_MIGRATIONS) {
    if (migration.treeNodeId === 'demo_tree_acid') continue;
    if (existingMigrationTreeIds.has(migration.treeNodeId)) continue;
    migrationOccurrences.push(treeNode(
      migration.treeNodeId,
      migration.label,
      migration.sourceNodeId,
    ));
  }
  const remainingOccurrences = [
    treeNode('acid-general', 'General ACID', 'k_1784730311893_zahpq5'),
    treeNode('acid-outline', 'ACID outline', 'k_wiki_en_outline_of_databases_s11_b2'),
    treeNode('di-general', 'General DI', 'k_1784466531162_zcrhl7'),
    treeNode('optimistic-general', 'General optimistic lock', 'k_1784703345480_oeg0w6'),
    treeNode('pessimistic-target', 'Pessimistic lock', 'demo_pessimistic'),
    treeNode('storeload-target', 'StoreLoad', 'k_atom_storeload'),
    treeNode('storestore-target', 'StoreStore', 'k_atom_storestore'),
    treeNode('loadstore-target', 'LoadStore', 'k_atom_loadstore'),
    treeNode('loadload-target', 'LoadLoad', 'k_atom_loadload'),
  ];
  const occurrenceIds = new Set([
    ...migrationOccurrences,
    ...remainingOccurrences,
  ].map((node) => node.id));
  const overlapOccurrences = [];
  for (const consolidation of OVERLAP_TREE_CONSOLIDATIONS) {
    for (const treeNodeId of [consolidation.sourceTreeId, consolidation.targetTreeId]) {
      if (occurrenceIds.has(treeNodeId)) continue;
      occurrenceIds.add(treeNodeId);
      overlapOccurrences.push(treeNode(treeNodeId, treeNodeId, 'root'));
    }
  }

  return {
    tree: treeNode('root-tree', 'Root', 'root', [
      treeNode('demo_tree_tx', '事务', 'n_ag24bbkc'),
      ...migrationOccurrences,
      ...remainingOccurrences,
      ...overlapOccurrences,
    ]),
    nodePool: nodes,
    edges: [
      {
        id: 'source-edge',
        source: 'k_1784703345480_oeg0w6',
        target: 'k_1783157274694_odbiuu',
        type: 'uses',
        label: 'uses',
      },
      {
        id: 'treebind:root-tree:tree_1782813951312_jzp80c',
        source: 'root',
        target: 'k_1782813819683_ntjiho',
        type: 'belongs-to',
        label: 'contains',
        relationKind: 'structure',
      },
      {
        id: 'treebind:tree_1782813951312_jzp80c:tree_1783087864958_upthbo',
        source: 'k_1782813819683_ntjiho',
        target: 'k_1783087864934_n0yzzj',
        type: 'belongs-to',
        label: 'contains',
        relationKind: 'structure',
      },
    ],
    questions: [{
      id: 'q1',
      text: 'How?',
      answered: false,
      relatedNodeId: 'k_1785214842744_v601y4',
      answerSteps: [{ nodeId: 'k_1782928703651_dpqbc4' }],
    }],
    timeline: [{
      id: 'snapshot-1',
      knowledgeNodeId: 'k_1786288007184_cfwjih',
      node: nodes.k_1786288007184_cfwjih,
    }],
  };
}

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

test('explicit semantic curation preserves contexts and rewrites every reference domain', () => {
  const result = applySemanticDuplicateCuration(buildDataset());

  const expectedGroups = SEMANTIC_RESOLUTIONS.filter(
    (resolution) => resolution.memberIds.length > 1,
  ).length;
  const expectedRemoved = SEMANTIC_RESOLUTIONS.reduce(
    (total, resolution) => total + Math.max(0, resolution.memberIds.length - 1),
    0,
  );
  assert.equal(result.stats.groupsMerged, expectedGroups);
  assert.equal(result.stats.nodesRemoved, expectedRemoved);
  assert.equal(Object.keys(result.redirects).length, expectedRemoved);
  assert.equal(result.redirects.k_1784730311893_zahpq5, 'demo_acid');
  assert.equal(result.redirects.k_1785214842744_v601y4, 'k_1784466531162_zcrhl7');
  assert.equal(result.redirects.k_1784703345480_oeg0w6, 'demo_optimistic');
  assert.equal(result.redirects.k_1783157274694_odbiuu, 'k_atom_storeload');

  const mysqlAcid = findTreeNode(result.dataset.tree, 'demo_tree_acid');
  const redisAcid = findTreeNode(result.dataset.tree, 'tree_1786288007373_pp3blo');
  assert.equal(mysqlAcid.nodeRef, 'demo_acid');
  assert.match(mysqlAcid.supplement.tabs[0].content, /mysql-specific-acid/);
  assert.equal(redisAcid.nodeRef, 'demo_acid');
  assert.match(redisAcid.supplement.tabs[0].content, /redis-specific-acid/);
  assert.doesNotMatch(
    JSON.stringify(result.dataset.nodePool.demo_acid.card),
    /redis-specific-acid|mysql-specific-acid/,
  );
  assert.match(
    JSON.stringify(result.dataset.nodePool.demo_acid.card),
    /generic-acid-definition/,
  );
  assert.equal(result.dataset.nodePool.demo_acid.viewDimensions[0].id, 'mysql-acid-view');

  assert.deepEqual(result.dataset.edges.find((edge) => edge.id === 'source-edge'), {
    id: 'source-edge',
    source: 'demo_optimistic',
    target: 'k_atom_storeload',
    type: 'uses',
    label: 'uses',
  });
  assert.equal(result.dataset.questions[0].relatedNodeId, 'k_1784466531162_zcrhl7');
  assert.equal(result.dataset.questions[0].answerSteps[0].nodeId, 'demo_optimistic');
  assert.equal(result.dataset.timeline[0].knowledgeNodeId, 'demo_acid');
  const floatTree = findTreeNode(result.dataset.tree, 'tree_1782813951312_jzp80c');
  assert.equal(floatTree.nodeRef, 'k_1782813951272_huivnu');
  assert.equal(
    result.dataset.edges.find(
      (edge) => edge.id === 'treebind:root-tree:tree_1782813951312_jzp80c',
    ).target,
    'k_1782813951272_huivnu',
  );
  assert.equal(
    result.dataset.edges.find(
      (edge) => edge.id === 'treebind:tree_1782813951312_jzp80c:tree_1783087864958_upthbo',
    ).source,
    'k_1782813951272_huivnu',
  );
  for (const assignment of DISTINCT_IDENTITY_ASSIGNMENTS) {
    assert.equal(
      result.dataset.nodePool[assignment.nodeId]?.canonicalKey,
      assignment.canonicalKey,
    );
  }
});

test('semantic curation is idempotent after the first successful pass', () => {
  const first = applySemanticDuplicateCuration(buildDataset());
  const second = applySemanticDuplicateCuration(first.dataset);

  assert.deepEqual(second.dataset, first.dataset);
  assert.equal(Object.keys(second.redirects).length, 0);
  for (const [key, value] of Object.entries(second.stats)) assert.equal(value, 0, key);
});

test('semantic resolution catalog closes every reviewed label group', async () => {
  const fs = await import('node:fs/promises');
  const dataset = {
    tree: JSON.parse(await fs.readFile('data/tree-data.json', 'utf8')),
    nodePool: JSON.parse(await fs.readFile('data/node-pool.json', 'utf8')),
    edges: JSON.parse(await fs.readFile('data/knowledge-edges.json', 'utf8')),
    questions: JSON.parse(await fs.readFile('data/questions.json', 'utf8')),
    timeline: JSON.parse(await fs.readFile('data/timeline.json', 'utf8')),
  };
  const result = applySemanticDuplicateCuration(dataset);

  assert.equal(
    result.candidates.totals.manualReviewGroups,
    2,
    'unrelated historical sections and distinct database views must remain manual-review groups',
  );
  assert.deepEqual(
    result.candidates.manualReviewGroups.map((group) => group.normalizedLabel).toSorted(),
    ['历史', '视图'],
  );
  assert.equal(result.stats.groupsMerged, 0);
  assert.equal(result.candidates.totals.automaticMergeGroups, 0);
  assert.deepEqual(
    SEMANTIC_RESOLUTIONS.filter((resolution) => resolution.memberIds.length > 1)
      .slice(-3)
      .map((resolution) => resolution.canonicalKey),
    [
      'database:model:transaction',
      'database:model:index',
      'program-analysis:dynamic-analysis',
    ],
  );
  assert.equal(result.dataset.nodePool.k_1783250520307_j25py7.canonicalKey, 'database:model:index');
  assert.equal(result.dataset.nodePool.k_wiki_zh_数据库_s10, undefined);
  assert.equal(result.dataset.nodePool.k_wiki_en_dynamic_program_analysis, undefined);
});
