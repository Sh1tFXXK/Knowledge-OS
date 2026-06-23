import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const tree = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
const nodePool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));

const mysqlRootId = 'demo_mysql';
const expectedTopLevelIds = [
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

function parentByChildId(root) {
  const parents = new Map();
  const walk = (node) => {
    for (const child of node.children ?? []) {
      parents.set(child.id, node);
      walk(child);
    }
  };
  walk(root);
  return parents;
}

function pathIdsForNode(root, nodeId) {
  const walk = (node, pathIds) => {
    const next = [...pathIds, node.id];
    if (node.id === nodeId) return next;
    for (const child of node.children ?? []) {
      const found = walk(child, next);
      if (found) return found;
    }
    return null;
  };
  return walk(root, []) ?? [];
}

const mysqlRoot = findTreeNode(tree, mysqlRootId);
assert.ok(mysqlRoot, 'MySQL tree root must exist');

assert.deepEqual((mysqlRoot.children ?? []).map((child) => child.id), expectedTopLevelIds);

const treeNodes = collectTreeNodes(tree);
const treeIds = treeNodes.map((node) => node.id);
assert.equal(new Set(treeIds).size, treeIds.length, 'tree node ids must be unique');

for (const node of treeNodes) {
  if (!node.nodeRef) continue;
  assert.ok(nodePool[node.nodeRef], `missing nodePool entry for ${node.nodeRef} referenced by ${node.id}`);
}

const forbiddenBuckets = treeNodes.filter(
  (node) => node.id.endsWith('_terms_tree') || node.name === '术语索引',
);
assert.deepEqual(
  forbiddenBuckets.map((node) => node.id),
  [],
  'glossary terms should be placed in the real taxonomy, not inside term-index buckets',
);

const oldSupplementRoots = (mysqlRoot.children ?? []).filter((child) =>
  child.id.startsWith('tree_mysql_glossary_group_'),
);
assert.equal(oldSupplementRoots.length, 0, 'old glossary groups should not remain as top-level buckets');

const canonicalTermNodes = treeNodes.filter((node) => node.id.startsWith('mysql_term_'));
const canonicalRefs = canonicalTermNodes.map((node) => node.nodeRef);
assert.equal(
  new Set(canonicalRefs).size,
  canonicalRefs.length,
  'each glossary term should have one canonical taxonomy entry',
);

const parents = parentByChildId(tree);
const expectedPlacements = [
  {
    ref: 'k_dict_lc7qrne8',
    pathIncludes: ['mysql_topic_architecture'],
    message: 'database belongs under architecture',
  },
  {
    ref: 'k_dict_73wtge24',
    pathIncludes: ['mysql_topic_sql_objects', 'tree_1782033172539_wxvnr8'],
    message: 'DDL belongs under the SQL interface hierarchy',
  },
  {
    ref: 'mysql_glossary_connector_j_avxtph',
    pathIncludes: ['mysql_topic_connectors_api', 'tree_1782032242238_ym9m1l'],
    message: 'Connector/J belongs under client connectors',
  },
  {
    ref: 'k_1781957518600_aibqeg',
    pathIncludes: ['mysql_topic_logs_recovery', 'tree_1782029505240_be11k0'],
    message: 'redo log belongs under log files',
  },
  {
    ref: 'k_dict_sctomy1z',
    pathIncludes: ['mysql_topic_replication_ha'],
    message: 'replication belongs under HA',
  },
];

for (const { ref, pathIncludes, message } of expectedPlacements) {
  const candidates = treeNodes.filter((node) => node.nodeRef === ref);
  const placed = candidates.find((node) => {
    const pathIds = pathIdsForNode(mysqlRoot, node.id);
    return pathIncludes.every((expectedPathId) => pathIds.includes(expectedPathId));
  });
  assert.ok(placed, message);
  assert.notEqual(parents.get(placed.id)?.name, '术语索引', `${message}: parent must be real taxonomy`);
}

const uncategorized = findTreeNode(tree, 'mysql_topic_uncategorized');
assert.ok(uncategorized, 'uncategorized topic must exist');
assert.ok(
  (uncategorized.children ?? []).length <= 5,
  `uncategorized topic should stay tiny, got ${(uncategorized.children ?? []).length}`,
);

console.log('mysql directory taxonomy checks passed');
