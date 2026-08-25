import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apply = process.argv.includes('--apply');
const treePath = path.join(root, 'data', 'tree-data.json');
const poolPath = path.join(root, 'data', 'node-pool.json');
const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));

const findById = (node, id) => node.id === id ? node : (node.children ?? []).map((child) => findById(child, id)).find(Boolean);
const mysqlView = findById(tree, 'forest:view:mysql');
const architecture = findById(tree, 'mysql:theme:architecture');
if (!mysqlView || !architecture) throw new Error('MySQL 视图或总览与体系结构分支不存在');

const originalArchitectureRefs = new Set([
  'mysql_glossary_client_13u3vh',
  'mysql_glossary_client_side_prepared_statement_1czk27',
  'mysql_glossary_connection_fqlzvd',
  'k_dict_h20fqa9t',
  'mysql_glossary_connection_string_1hyrot',
  'k_dict_nsqweksd',
  'k_dict_lc7qrne8',
  'k_dict_qus727rl',
  'k_dict_12jqwwcl',
  'mysql_glossary_option_1sc73x',
  'mysql_glossary_port_ydif8m',
  'mysql_glossary_server_side_prepared_statement_1g5uc6',
  'k_dict_n7rueozw',
]);

const groups = [
  {
    id: 'mysql:architecture:product-overview',
    name: '产品与部署概览',
    refs: ['n_8s66vwo1', 'mysql_topic_architecture', 'k_1782032149173_bli3vq'],
  },
  {
    id: 'mysql:architecture:client-connectivity',
    name: '客户端、连接与会话入口',
    refs: [
      'mysql_glossary_client_13u3vh',
      'mysql_glossary_client_side_prepared_statement_1czk27',
      'mysql_glossary_connection_fqlzvd',
      'k_dict_h20fqa9t',
      'mysql_glossary_connection_string_1hyrot',
      'mysql_glossary_port_ydif8m',
      'mysql_glossary_server_side_prepared_statement_1g5uc6',
    ],
  },
  {
    id: 'mysql:architecture:server-runtime',
    name: '服务器运行时与执行模型',
    refs: [
      'k_1782032275682_61auc4',
      'k_dict_12jqwwcl',
      'k_dict_plyim9pi',
      'mysql_glossary_pthreads_qfb7k4',
      'k_dict_xhmtog57',
      'k_dict_n7rueozw',
    ],
  },
  {
    id: 'mysql:architecture:metadata-namespace',
    name: '数据库、模式与元数据边界',
    refs: [
      'k_dict_nsqweksd',
      'k_dict_lc7qrne8',
      'k_dict_qus727rl',
      'k_dict_8yoqxtuu',
    ],
  },
  {
    id: 'mysql:architecture:configuration-extensions',
    name: '配置、系统变量与可扩展组件',
    refs: ['mysql_glossary_option_1sc73x'],
  },
];

const themeRules = [
  ['mysql:theme:security-access', /trust|principal|ticket|spn|key_distribution|security|auth|ssl|tls|credential|password|partial_trust/i],
  ['mysql:theme:replication-ha', /heartbeat|scale_out|scale_up|source|replication|replica|cluster|failover/i],
  ['mysql:theme:backup-recovery', /crash|startup|shutdown|troubleshoot|checksum|recovery|backup|restore/i],
  ['mysql:theme:transactions-concurrency', /consistent_read|mutex|spin|victim|lock|wait_for|transaction|deadlock/i],
  ['mysql:theme:storage-engines', /ibtmp|extent|high_water|read_ahead|compression|file|lsn|system_file|tablespace|buffer|young/i],
  ['mysql:theme:query-processing', /sort_buffer|prepared_statement|as_h5mr7x|business_rules|query|optimizer/i],
  ['mysql:theme:performance-observability', /bottleneck|counter|persistent_statistics|scalability|tps|wait|change_buffering/i],
  ['mysql:theme:indexes-access', /stopword|fulltext|index|access/i],
  ['mysql:theme:data-types', /variable_length|type|charset|collation/i],
  ['mysql:theme:connectivity', /cfg_file|dsn|host|php|spring|j2ee|c_1iy8fe|c_15ku39|c_cy8cuo|embedded|libmysqld|mysqldb/i],
  ['mysql:theme:schema-objects', /ddex|relational|database|schema|metadata/i],
  ['mysql:theme:operations', /loose|opt_file|my_cnf|option_file|config|admin|maintenance/i],
];

const explicitTargetByRef = new Map([
  ['k_dict_o5254svl', 'mysql:theme:query-processing'],
  ['k_dict_g7onhohj', 'mysql:theme:storage-engines'],
  ['k_1782029470422_yfa3u9', 'mysql:theme:storage-engines'],
  ['k_1782029618563_7rrguo', 'mysql:theme:operations'],
  ['mysql_glossary_cfg_file_1wfa77', 'mysql:theme:operations'],
  ['mysql_glossary_option_file_gsqytm', 'mysql:theme:operations'],
  ['mysql_glossary_prepared_statement_1tfqdw', 'mysql:theme:sql-language'],
  ['mysql_glossary_sort_buffer_1x3j60', 'mysql:theme:query-processing'],
]);

const ignoredRefs = new Set([
  'mysql_glossary_group_architecture',
  'mysql_glossary_group_misc',
  'mysql_topic_uncategorized',
]);

const leafEntries = [];
const collectLeaves = (node) => {
  for (const child of node.children ?? []) {
    if ((child.children ?? []).length) collectLeaves(child);
    else leafEntries.push(child);
  }
};
collectLeaves(architecture);

const sourceByRef = new Map();
for (const entry of leafEntries) {
  if (entry.nodeRef && !sourceByRef.has(entry.nodeRef)) sourceByRef.set(entry.nodeRef, entry);
}

const labelFor = (ref, fallback = ref) => pool[ref]?.label ?? sourceByRef.get(ref)?.name ?? fallback;
const createProjection = (ref, groupId) => ({
  id: ref === 'n_8s66vwo1' ? 'demo_mysql' : `projection:mysql-architecture:${groupId}:${ref}`,
  name: labelFor(ref),
  count: 0,
  nodeRef: ref,
  projection: true,
  view: 'mysql-architecture',
  projectionKind: 'topic-view',
  sourceNodeId: ref,
});
const createGroup = (group) => ({
  id: group.id,
  name: group.name,
  count: 0,
  nodeRef: group.id,
  view: 'mysql-architecture',
  projectionKind: 'topic-view',
  children: group.refs.map((ref) => createProjection(ref, group.id)),
});

const themeById = new Map((mysqlView.children ?? []).map((entry) => [entry.id, entry]));
for (const legacyContainerId of ['mysql_glossary_group_architecture', 'mysql_glossary_group_misc', 'mysql_topic_uncategorized']) {
  if (pool[legacyContainerId]) pool[legacyContainerId].status = 'archived-redirect';
}
for (const group of groups) {
  if (!pool[group.id]) {
    pool[group.id] = {
      id: group.id,
      label: group.name,
      role: 'subsystem',
      dimensions: ['storage'],
      tags: ['mysql', 'knowledge-forest-category'],
      card: { nodeId: group.id, title: group.name, tabs: [{ id: 'def', label: '定义', content: `MySQL 总览与体系结构的语义子分组：${group.name}。` }] },
      status: 'canonical',
    };
  }
}
const moved = [];
for (const entry of leafEntries) {
  const ref = entry.nodeRef;
  if (!ref || originalArchitectureRefs.has(ref) || ignoredRefs.has(ref) || groups.some((group) => group.refs.includes(ref))) continue;
  const rule = themeRules.find(([, matcher]) => matcher.test(ref));
  const targetId = explicitTargetByRef.get(ref) ?? rule?.[0] ?? 'mysql:theme:operations';
  const target = themeById.get(targetId);
  if (!target) throw new Error(`缺少目标主题：${targetId}`);
  target.children = target.children ?? [];
  if (!target.children.some((child) => child.nodeRef === ref)) {
    target.children.push({
      ...entry,
      id: `projection:mysql-repaired:${targetId}:${ref}`,
      name: labelFor(ref, entry.name),
      projection: true,
      view: 'mysql-architecture',
      projectionKind: 'topic-view',
      sourceNodeId: ref,
    });
  }
  moved.push({ ref, targetId });
}

architecture.name = '总览与体系结构';
architecture.children = groups.map(createGroup);

const report = {
  apply,
  architectureRefs: [...originalArchitectureRefs].filter((ref) => !!pool[ref]),
  preservedArchitectureEntries: groups.reduce((total, group) => total + group.refs.length, 0),
  movedOutOfArchitecture: moved,
  ignoredContainers: [...ignoredRefs].filter((ref) => sourceByRef.has(ref)),
};

if (apply) {
  const backupDir = path.join(root, 'output', `mysql-architecture-restore-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(treePath, path.join(backupDir, 'tree-data.json'));
  fs.copyFileSync(poolPath, path.join(backupDir, 'node-pool.json'));
  fs.writeFileSync(treePath, JSON.stringify(tree, null, 2) + '\n', 'utf8');
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2) + '\n', 'utf8');
}
console.log(JSON.stringify(report, null, 2));
