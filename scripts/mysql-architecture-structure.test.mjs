import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const tree = JSON.parse(fs.readFileSync(path.resolve('data/tree-data.json'), 'utf8'));
const find = (node, id) => node.id === id ? node : (node.children ?? []).map((child) => find(child, id)).find(Boolean);
const architecture = find(tree, 'mysql:theme:architecture');

const expectedGroups = [
  ['mysql:architecture:product-overview', '产品与部署概览', 3],
  ['mysql:architecture:client-connectivity', '客户端、连接与会话入口', 7],
  ['mysql:architecture:server-runtime', '服务器运行时与执行模型', 6],
  ['mysql:architecture:metadata-namespace', '数据库、模式与元数据边界', 4],
  ['mysql:architecture:configuration-extensions', '配置、系统变量与可扩展组件', 1],
];
const expectedRefs = new Set([
  'n_8s66vwo1',
  'mysql_topic_architecture',
  'k_1782032149173_bli3vq',
  'mysql_glossary_client_13u3vh',
  'mysql_glossary_client_side_prepared_statement_1czk27',
  'mysql_glossary_connection_fqlzvd',
  'k_dict_h20fqa9t',
  'mysql_glossary_connection_string_1hyrot',
  'mysql_glossary_port_ydif8m',
  'mysql_glossary_server_side_prepared_statement_1g5uc6',
  'k_1782032275682_61auc4',
  'k_dict_12jqwwcl',
  'k_dict_plyim9pi',
  'mysql_glossary_pthreads_qfb7k4',
  'k_dict_xhmtog57',
  'k_dict_n7rueozw',
  'k_dict_nsqweksd',
  'k_dict_lc7qrne8',
  'k_dict_qus727rl',
  'k_dict_8yoqxtuu',
  'mysql_glossary_option_1sc73x',
]);

test('MySQL 总览保留旧知识结构的核心入口，并以语义子分组呈现', () => {
  assert.ok(architecture, '缺少 MySQL 总览与体系结构主题');
  assert.deepEqual(
    (architecture.children ?? []).map((group) => [group.id, group.name, (group.children ?? []).length]),
    expectedGroups,
  );
  const refs = new Set((architecture.children ?? []).flatMap((group) => (group.children ?? []).map((entry) => entry.nodeRef)));
  assert.deepEqual(refs, expectedRefs);
  assert.ok(!refs.has('mysql_topic_uncategorized'), 'MySQL 总览不得保留未分类入口');
});
