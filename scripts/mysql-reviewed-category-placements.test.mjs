import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { MYSQL_REVIEWED_CATEGORY_PLACEMENTS } from './mysql-reviewed-category-placements.mjs';

const tree = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
const roots = Array.isArray(tree) ? tree : [tree];

function findById(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findById(child, id);
    if (found) return found;
  }
  return null;
}

function findAny(id) {
  for (const root of roots) {
    const found = findById(root, id);
    if (found) return found;
  }
  return null;
}

function parentOf(root, id) {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const found = parentOf(child, id);
    if (found) return found;
  }
  return null;
}

function entriesByRef(root, nodeRef) {
  return [
    ...(root.nodeRef === nodeRef ? [root] : []),
    ...(root.children ?? []).flatMap((child) => entriesByRef(child, nodeRef)),
  ];
}

function descendantRefs(root) {
  return new Set([
    ...(root.nodeRef ? [root.nodeRef] : []),
    ...(root.children ?? []).flatMap((child) => [...descendantRefs(child)]),
  ]);
}

const mysql = findAny('forest:view:mysql');
const storage = findAny('mysql:theme:storage-engines');
const schemaObjects = findAny('mysql:theme:schema-objects');

const targetTreeIds = {
  connectivity: 'mysql:theme:connectivity',
  security: 'mysql:theme:security-access',
  backupRecovery: 'mysql:theme:backup-recovery',
  operations: 'mysql:theme:operations',
  performance: 'mysql:theme:performance-observability',
  indexes: 'mysql:theme:indexes-access',
  queryProcessing: 'mysql:theme:query-processing',
  transactions: 'mysql:theme:transactions-concurrency',
  replication: 'mysql:theme:replication-ha',
  sqlLanguage: 'mysql:theme:sql-language',
  storageEngines: 'mysql:theme:storage-engines',
  metadataDataFiles: 'mysql:concept:data-files:metadata',
  innodbTablespaceFiles: 'mysql:concept:data-files:innodb-tablespaces',
  configFileComposition: 'mysql:concept:system-files:config-files:composition',
  logFileComposition: 'tree_1782029505240_be11k0:composition',
};

test('存储引擎与数据库对象保持正确概念位置', () => {
  assert.ok(mysql && storage && schemaObjects);
  assert.equal(parentOf(mysql, storage.id)?.id, 'mysql:concept:server:composition');
  assert.equal(parentOf(mysql, schemaObjects.id)?.id, 'mysql:concept:sql:composition');
  assert.equal(findAny('mysql_topic_storage_engines'), null, '旧存储引擎包装层不应继续出现在目录中');
  assert.equal(findAny('mysql_topic_innodb_internals'), null, '旧 InnoDB 包装层不应继续出现在目录中');
});

test('旧分类实体只保留在来源兼容视图', () => {
  const sourceView = findAny('forest:view:mysql-source');
  assert.ok(sourceView);
  for (const ref of [
    'mysql_topic_storage_engines',
    'mysql_topic_innodb_internals',
    'mysql_glossary_group_tablespaces_files',
  ]) {
    assert.equal(entriesByRef(mysql, ref).length, 0, `${ref} must not return to the canonical MySQL directory`);
    assert.equal(entriesByRef(sourceView, ref).length, 1, `${ref} must remain reachable through the source view`);
  }
});

test('人工核对的 MySQL 术语逐项进入指定分类', () => {
  for (const [targetKey, refs] of Object.entries(MYSQL_REVIEWED_CATEGORY_PLACEMENTS)) {
    const targetId = targetTreeIds[targetKey];
    const target = findAny(targetId);
    assert.ok(target, `missing reviewed placement target ${targetId}`);
    const targetRefs = descendantRefs(target);
    for (const ref of refs) {
      assert.ok(targetRefs.has(ref), `${ref} must be under ${targetId}`);
      assert.ok(entriesByRef(mysql, ref).length >= 1, `${ref} must remain navigable in MySQL`);
    }
  }
});

test('数据库对象与元数据只保留对象模型和元数据术语', () => {
  assert.deepEqual(
    [...descendantRefs(schemaObjects)].filter((ref) => ref !== schemaObjects.nodeRef).sort(),
    [
      'k_dict_8yoqxtuu',
      'k_dict_lc7qrne8',
      'k_dict_nsqweksd',
      'k_dict_xb5t6pmm',
      'mysql_glossary_base_column_jjprw2',
      'mysql_glossary_constraint_1f3aaf',
      'mysql_glossary_generated_stored_column_1nr7fq',
      'mysql_glossary_generated_virtual_column_1faoe5',
      'mysql_glossary_intrinsic_temporary_table_1sl3hr',
      'mysql_glossary_relational_1yoaip',
      'mysql_glossary_sdi_8vlmf5',
      'mysql_glossary_serialized_dictionary_information_sdi_1ee69u',
      'mysql_glossary_synthetic_key_1drbjs',
    ].sort(),
  );
});

test('存储引擎不再吸收已核对的非存储术语', () => {
  const storageRefs = descendantRefs(storage);
  for (const [targetKey, refs] of Object.entries(MYSQL_REVIEWED_CATEGORY_PLACEMENTS)) {
    if (targetKey === 'storageEngines') continue;
    for (const ref of refs) assert.equal(storageRefs.has(ref), false, `${ref} must not remain under storage engines`);
  }
});
