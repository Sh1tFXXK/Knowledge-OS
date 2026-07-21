import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const tree = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
const nodePool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));

const mysqlRootId = 'demo_mysql';
const csRootId = 'demo_cs';
const universeRootId = 'universe';

const expectedMysqlTopLevelIds = [
  'mysql_topic_architecture',
  'mysql_topic_sql_objects',
  'mysql_topic_storage_engines',
  'mysql_topic_innodb_internals',
  'mysql_topic_indexes_access',
  'mysql_topic_transactions_locks',
  'mysql_topic_logs_recovery',
  'mysql_topic_optimizer_performance',
  'mysql_topic_replication_ha',
  'mysql_topic_connectors_api',
  'mysql_topic_security_auth',
  'mysql_topic_backup_operations',
  'mysql_topic_text_spatial_charset',
  'mysql_topic_uncategorized',
];

const expectedSchoolIds = [
  'school_mathematics',
  'school_logic',
  'school_database_theory',
  'school_computation_theory',
  'school_programming_languages',
  'school_systems',
  'school_security',
  'school_information_retrieval',
  'school_real_world_conventions',
];

const expectedDomainIds = [
  'theory_domain_set_theory',
  'theory_domain_first_order_logic',
  'theory_domain_relational_algebra',
  'theory_domain_graph_theory',
  'theory_domain_formal_languages_automata',
  'theory_domain_type_theory',
  'theory_domain_three_valued_logic',
  'theory_domain_normalization_theory',
  'theory_domain_statistics',
  'theory_domain_probability',
  'theory_domain_numerical_analysis',
  'theory_domain_information_theory',
  'theory_domain_queueing_theory',
  'theory_domain_algorithms',
  'theory_domain_data_structures',
  'theory_domain_compiler_principles',
  'theory_domain_concurrency_theory',
  'theory_domain_complexity_theory',
  'theory_domain_operating_systems',
  'theory_domain_computer_architecture',
  'theory_domain_storage_systems',
  'theory_domain_transaction_theory',
  'theory_domain_recovery_theory',
  'theory_domain_distributed_systems',
  'theory_domain_network_protocols',
  'theory_domain_cryptography',
  'theory_domain_access_control',
  'theory_domain_programming_language_theory',
  'theory_domain_regular_expression_theory',
  'theory_domain_information_retrieval',
  'theory_domain_calendar_systems',
  'theory_domain_character_encoding_standards',
  'theory_domain_timezone_standards',
];

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function pathIdsForRef(root, nodeRef) {
  const walk = (node, pathIds) => {
    const next = [...pathIds, node.id];
    if (node.id === nodeRef || node.nodeRef === nodeRef) return next;
    for (const child of node.children ?? []) {
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  };
  return walk(root, []) ?? [];
}

const mysqlRoot = findTreeNode(tree, mysqlRootId);
const csRoot = findTreeNode(tree, csRootId);
const universeRoot = findTreeNode(tree, universeRootId);

assert.ok(mysqlRoot, 'MySQL tree root must exist');
assert.ok(csRoot, 'Computer science root must exist');
assert.ok(universeRoot, 'Universe root must exist');

assert.deepEqual((mysqlRoot.children ?? []).map((child) => child.id), expectedMysqlTopLevelIds);
assert.equal(
  (mysqlRoot.children ?? []).filter((child) => child.id.startsWith('theory_domain_') || child.id.startsWith('theory_layer_')).length,
  0,
  'independent theory schools must not replace or sit directly under MySQL',
);

const schoolTrees = expectedSchoolIds.map((schoolId) => findTreeNode(universeRoot, schoolId));
for (const [index, schoolTree] of schoolTrees.entries()) {
  assert.ok(schoolTree, `${expectedSchoolIds[index]} must be an independent top-level school`);
}
assert.deepEqual(
  (universeRoot.children ?? []).filter((child) => child.id.startsWith('school_')).map((child) => child.id),
  expectedSchoolIds,
  'independent schools must live at universe level, not under MySQL or computer science',
);
assert.deepEqual(
  collectTreeNodes(csRoot).filter((node) => node.id.startsWith('school_') || node.id.startsWith('theory_domain_')).map((node) => node.id),
  [],
  'computer science must not own independent math, logic, language, or systems schools',
);

assert.deepEqual(
  schoolTrees.flatMap((school) => (school.children ?? []).map((domain) => domain.id)).toSorted(),
  expectedDomainIds.toSorted(),
);

const treeNodes = collectTreeNodes(tree);
const treeIds = treeNodes.map((node) => node.id);
assert.equal(new Set(treeIds).size, treeIds.length, 'tree node ids must be unique');

for (const node of treeNodes) {
  if (!node.nodeRef) continue;
  assert.ok(nodePool[node.nodeRef], `missing nodePool entry for ${node.nodeRef} referenced by ${node.id}`);
}

for (const domainId of expectedDomainIds) {
  const domainTree = findTreeNode(universeRoot, domainId);
  assert.ok(domainTree, `${domainId} must exist as a theory-domain folder`);
  assert.equal(domainTree.nodeRef, domainId, `${domainId} tree folder must point at its domain node`);
  assert.doesNotMatch(
    nodePool[domainId]?.card?.tabs?.[0]?.content ?? '',
    /MySQL 知识目录中的稳定分类节点/,
    `${domainId} domain card must not be defined as a MySQL taxonomy category`,
  );
  assert.match(
    nodePool[domainId]?.card?.tabs?.[0]?.content ?? '',
    /独立门派：/,
    `${domainId} domain card must record its independent school`,
  );
}

for (const [nodeId, node] of Object.entries(nodePool)) {
  if (!nodeId.startsWith('theory_domain_')) continue;
  assert.doesNotMatch(
    node.card?.tabs?.[0]?.content ?? '',
    /MySQL 知识目录中的稳定分类节点/,
    `${nodeId} must not use the MySQL taxonomy definition template`,
  );
}

const originalMysqlStructure = [
  ['demo_tree_innodb', 'mysql_topic_innodb_internals'],
  ['demo_tree_tx', 'mysql_topic_transactions_locks'],
  ['demo_tree_lock', 'mysql_topic_transactions_locks'],
  ['demo_mvcc', 'demo_tree_mvcc'],
  ['mysql_glossary_gap_lock_1gfoi1', 'mysql_lock_range_insert'],
  ['mysql_glossary_unicode_fwfjuo', 'mysql_topic_text_spatial_charset'],
];

for (const [ref, expectedPathId] of originalMysqlStructure) {
  const pathIds = pathIdsForRef(mysqlRoot, ref);
  assert.ok(pathIds.includes(expectedPathId), `${ref} must remain in the original MySQL functional tree`);
}

assert.equal(
  treeNodes.filter((node) => node.id.startsWith('tree_mysql_glossary_group_')).length,
  0,
  'old glossary group trees should not remain in the generated taxonomy',
);

const theoryTermNodes = schoolTrees.flatMap(collectTreeNodes).filter((node) => node.id.startsWith('mysql_term_'));
const theoryRefs = theoryTermNodes.map((node) => node.nodeRef);
assert.ok(theoryTermNodes.length >= 38, `expected moved theoretical knowledge items to be placed, got ${theoryTermNodes.length}`);
assert.equal(
  new Set(theoryRefs).size,
  theoryRefs.length,
  'each MySQL knowledge node should have one canonical theoretical-domain entry',
);

const mysqlRefs = new Set(collectTreeNodes(mysqlRoot).map((node) => node.nodeRef).filter(Boolean));
const duplicatedRefs = theoryRefs.filter((nodeRef) => mysqlRefs.has(nodeRef));
assert.deepEqual(duplicatedRefs, [], 'knowledge refs must not be duplicated between MySQL implementation tree and theory tree');

const expectedPlacements = [
  {
    ref: 'k_dict_73wtge24',
    domainId: 'theory_domain_formal_languages_automata',
    message: 'DDL belongs under formal language and grammar semantics',
  },
  {
    ref: 'demo_hash',
    domainId: 'theory_domain_data_structures',
    message: 'hash index belongs under data structures',
  },
  {
    ref: 'k_dict_fxoirizf',
    domainId: 'theory_domain_three_valued_logic',
    message: 'NULL belongs under three-valued logic',
  },
  {
    ref: 'k_dict_t83fdwoc',
    domainId: 'theory_domain_transaction_theory',
    message: 'dirty read belongs under transaction theory',
  },
  {
    ref: 'k_dict_ij1x57s1',
    domainId: 'theory_domain_character_encoding_standards',
    message: 'ANSI belongs under character encoding standards',
  },
];

for (const { ref, domainId, message } of expectedPlacements) {
  const pathIds = pathIdsForRef(universeRoot, ref);
  assert.ok(pathIds.includes(domainId), message);
}

console.log('mysql theoretical domain taxonomy checks passed');
