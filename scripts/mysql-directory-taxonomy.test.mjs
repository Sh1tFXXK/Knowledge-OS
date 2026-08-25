import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const tree = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
const pool = JSON.parse(fs.readFileSync(path.resolve('data/node-pool.json'), 'utf8'));

function rootsOf(value) {
  return Array.isArray(value) ? value : [value];
}

function find(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const hit = find(child, id);
    if (hit) return hit;
  }
  return null;
}

function findParent(root, id) {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const hit = findParent(child, id);
    if (hit) return hit;
  }
  return null;
}

function descendants(root) {
  return [root, ...(root.children ?? []).flatMap(descendants)];
}

function findAny(id) {
  for (const root of rootsOf(tree)) {
    const hit = find(root, id);
    if (hit) return hit;
  }
  return null;
}

function parentAny(id) {
  for (const root of rootsOf(tree)) {
    const hit = findParent(root, id);
    if (hit) return hit;
  }
  return null;
}

function childIds(id) {
  return (findAny(id)?.children ?? []).map((node) => node.id);
}

function assertConceptAxes(conceptId) {
  assert.deepEqual(
    childIds(conceptId),
    [`${conceptId}:composition`, `${conceptId}:structure`],
    `${conceptId} 只保留组成、结构两个目录层，定义必须落在本体解释卡里`,
  );
}

function assertConceptDefinition(conceptId) {
  const card = pool[findAny(conceptId)?.nodeRef ?? conceptId]?.card;
  assert.ok(card, `${conceptId} 必须有解释卡`);
  assert.equal(
    String(card.rootContent ?? '').trim().length > 0 || String(card.tabs?.find((tab) => tab.id === 'def')?.content ?? '').trim().length > 0,
    true,
    `${conceptId} 的定义必须写在解释卡中`,
  );
}

const mysql = findAny('forest:view:mysql');
assert.ok(mysql, '规范 MySQL 根必须存在');
assert.equal(
  parentAny(mysql.id)?.id,
  'tree_acm2012_information_systems_database_management',
  'MySQL 必须直接归属信息系统/数据库管理',
);
assert.deepEqual(
  childIds(mysql.id),
  ['mysql:concept:server', 'mysql:concept:sql'],
  'MySQL 顶层必须是概念入口，而不是固定主题清单',
);
assert.equal(
  (mysql.children ?? []).some((node) => node.id.startsWith('mysql:theme:')),
  false,
  'MySQL 根下不应直接摆放主题容器',
);

assertConceptAxes('mysql:concept:server');
assertConceptAxes('mysql:concept:sql');
assertConceptAxes('mysql:concept:system-files');
assertConceptAxes('tree_1782029643149_9klslf');
assertConceptAxes('tree_1782029505240_be11k0');
assertConceptAxes('governance:canonical:mysql_runtime_files');
assertConceptDefinition('mysql:concept:server');
assertConceptDefinition('mysql:concept:sql');
assertConceptDefinition('mysql:concept:system-files');
assertConceptDefinition('tree_1782029643149_9klslf');
assertConceptDefinition('tree_1782029505240_be11k0');
assertConceptDefinition('governance:canonical:mysql_runtime_files');

assert.equal(
  parentAny('mysql:concept:system-files')?.id,
  'mysql:concept:server:composition',
  '系统文件层必须是 MySQL Server 的组成，不是结构或主题根',
);
assert.equal(
  parentAny('tree_1782029643149_9klslf')?.id,
  'mysql:concept:system-files:composition',
  '数据文件必须挂在系统文件层的组成下面',
);
assert.deepEqual(
  childIds('mysql:concept:system-files:composition'),
  [
    'mysql:concept:system-files:config-files',
    'tree_1782029643149_9klslf',
    'tree_1782029505240_be11k0',
    'governance:canonical:mysql_runtime_files',
  ],
  '系统文件层组成必须按文件职责分类',
);

assert.deepEqual(
  childIds('tree_1782029643149_9klslf:composition'),
  [
    'mysql:concept:data-files:metadata',
    'mysql:concept:data-files:myisam',
    'mysql:concept:data-files:innodb-tablespaces',
    'mysql:concept:data-files:other-engines',
  ],
  '数据文件组成必须按元数据、MyISAM、InnoDB 表空间和其他引擎文件分类',
);
assert.equal(parentAny('projection:mysql-concept:mysql-concept-data-files-myisam:mysql_file_myd')?.id, 'mysql:concept:data-files:myisam');
assert.equal(parentAny('projection:mysql-concept:mysql-concept-data-files-myisam:mysql_file_myi')?.id, 'mysql:concept:data-files:myisam');
assert.equal(parentAny('projection:mysql-concept:mysql-concept-data-files-innodb-tablespaces:mysql_file_ibd')?.id, 'mysql:concept:data-files:innodb-tablespaces');
assert.equal(parentAny('projection:mysql-concept:mysql-concept-data-files-innodb-tablespaces:mysql_file_ibdata')?.id, 'mysql:concept:data-files:innodb-tablespaces');
assert.equal(parentAny('projection:mysql-concept:mysql-concept-data-files-innodb-tablespaces:mysql_file_ibdata1')?.id, 'mysql:concept:data-files:innodb-tablespaces');
assert.equal(parentAny('projection:mysql-concept:mysql-log-files:mysql_file_ib_logfile0')?.id, 'tree_1782029505240_be11k0:composition');
assert.equal(parentAny('projection:mysql-concept:mysql-log-files:mysql_file_ib_logfile1')?.id, 'tree_1782029505240_be11k0:composition');
assert.equal(parentAny('projection:mysql-concept:mysql-runtime-files:mysql_file_pid')?.id, 'governance:canonical:mysql_runtime_files:composition');
assert.equal(parentAny('projection:mysql-concept:mysql-runtime-files:mysql_file_socket')?.id, 'governance:canonical:mysql_runtime_files:composition');

const sourceTermRefs = Object.values(pool)
  .filter((node) => node.tags?.includes('mysql-glossary'))
  .filter((node) => !node.id.startsWith('mysql_glossary_group_'))
  .filter((node) => node.status !== 'archived-redirect')
  .map((node) => node.id);
assert.ok(sourceTermRefs.length >= 360, 'MySQL glossary 实体必须完整保留');
assert.equal(
  descendants(mysql).filter((node) => /待审核|未分类|review inbox/i.test(node.name ?? '')).length,
  0,
  'MySQL 内不允许存在待审核、未分类或 Review Inbox 容器',
);

console.log(JSON.stringify({
  mysqlConcepts: childIds(mysql.id).length,
  glossaryEntities: sourceTermRefs.length,
  systemFileCategories: childIds('mysql:concept:system-files:composition').length,
}));
