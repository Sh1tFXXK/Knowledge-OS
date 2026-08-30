import fs from 'node:fs';
import path from 'node:path';
import { MYSQL_REVIEWED_CATEGORY_PLACEMENTS } from './mysql-reviewed-category-placements.mjs';

const treePath = path.resolve('data/tree-data.json');
const nodePoolPath = path.resolve('data/node-pool.json');
const edgesPath = path.resolve('data/knowledge-edges.json');

const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
const nodePool = JSON.parse(fs.readFileSync(nodePoolPath, 'utf8'));
const edges = JSON.parse(fs.readFileSync(edgesPath, 'utf8'));

const MYSQL_ROOT_ID = 'forest:view:mysql';
const TREE_BINDING_PREFIX = 'treebind:';
const ALLOWED_ROLES = new Set(['axiom', 'mechanism', 'conclusion', 'subsystem', 'plain']);

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function findTreeParent(root, id) {
  for (const child of root.children ?? []) {
    if (child.id === id) return root;
    const found = findTreeParent(child, id);
    if (found) return found;
  }
  return null;
}

function detachTreeNode(root, id) {
  if (!root.children) return null;
  const index = root.children.findIndex((child) => child.id === id);
  if (index >= 0) return root.children.splice(index, 1)[0];
  for (const child of root.children) {
    const found = detachTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function ensureKnowledgeNode(id, label, content, role = 'subsystem') {
  const existing = nodePool[id] ?? {};
  const tabs = existing.card?.tabs?.length
    ? existing.card.tabs
    : [{ id: 'def', label: '定义', content: '' }];
  const definitionIndex = tabs.findIndex((tab) => tab.id === 'def');
  const definition = {
    id: 'def',
    label: '定义',
    content: content || tabs[definitionIndex >= 0 ? definitionIndex : 0]?.content || `${label}。`,
  };
  const nextTabs = definitionIndex >= 0
    ? tabs.map((tab, index) => (index === definitionIndex ? definition : tab))
    : [definition, ...tabs];

  nodePool[id] = {
    ...existing,
    id,
    label,
    role: ALLOWED_ROLES.has(existing.role) ? existing.role : role,
    tags: unique([...(existing.tags ?? []), label, 'mysql', 'concept-taxonomy']),
    card: {
      ...(existing.card ?? {}),
      nodeId: id,
      title: existing.card?.title ?? label,
      rootContent: existing.card?.rootContent ?? definition.content,
      tabs: nextTabs,
    },
  };
}

function normalizeKnowledgeNodeRoles() {
  for (const node of Object.values(nodePool)) {
    if (node.role === 'topic' || node.role === 'category') node.role = 'subsystem';
    if (node.role === 'file') node.role = 'plain';
  }
}

function ensureAxisNode(id, conceptName, axisName) {
  ensureKnowledgeNode(
    id,
    axisName,
    `${axisName}用于承载「${conceptName}」这个概念内部的${axisName}信息。`,
    'plain',
  );
  nodePool[id].canonicalKey = `mysql:concept-axis:${id}`;
  nodePool[id].kind = 'concept';
}

function treeEntry(id, name, nodeRef, children = []) {
  return { id, name, count: 0, nodeRef, children };
}

function detachedOrProjection(id, name, nodeRef) {
  const existing = detachTreeNode(tree, id);
  if (existing) {
    existing.name = name || existing.name;
    existing.nodeRef = nodeRef || existing.nodeRef;
    existing.children = existing.children ?? [];
    return existing;
  }
  return treeEntry(id, name ?? nodePool[nodeRef]?.label ?? nodeRef, nodeRef);
}

function firstAvailableTreeByRef(refs) {
  for (const ref of refs) {
    const node = collectTreeNodes(tree).find((entry) => entry.nodeRef === ref);
    if (!node) continue;
    return detachTreeNode(tree, node.id);
  }
  return null;
}

function projectionId(scope, ref) {
  return `projection:mysql-concept:${scope}:${ref}`;
}

function projection(scope, ref, fallbackName = undefined) {
  const existing = firstAvailableTreeByRef([ref]);
  if (existing) {
    existing.name = fallbackName ?? existing.name ?? nodePool[ref]?.label ?? ref;
    existing.nodeRef = ref;
    existing.children = existing.children ?? [];
    return existing;
  }
  return {
    id: projectionId(scope, ref),
    name: fallbackName ?? nodePool[ref]?.label ?? ref,
    count: 0,
    nodeRef: ref,
    projection: true,
    view: 'mysql-concept-taxonomy',
    projectionKind: 'concept-part',
    sourceNodeId: ref,
    children: [],
  };
}

function conceptTree({ id, name, nodeRef, definition = [], composition = [], structure = [] }) {
  detachTreeNode(tree, id);
  ensureKnowledgeNode(nodeRef, name, nodePool[nodeRef]?.card?.tabs?.[0]?.content ?? `${name} 是 MySQL 目录中的概念节点。`);
  const axes = [
    ['composition', '组成', composition],
    ['structure', '结构', structure],
  ].map(([axisId, axisName, children]) => {
    const treeId = `${id}:${axisId}`;
    const axisNodeId = `${nodeRef}:${axisId}`;
    ensureAxisNode(axisNodeId, name, axisName);
    return treeEntry(treeId, axisName, axisNodeId, children);
  });

  return treeEntry(id, name, nodeRef, axes);
}

function setChildren(node, children) {
  const byId = new Map();
  for (const child of children.flat()) {
    if (!child) continue;
    byId.set(child.id, child);
  }
  node.children = [...byId.values()];
}

function extractEntriesByRef(root, refs, extracted) {
  const retained = [];
  for (const child of root.children ?? []) {
    if (child.nodeRef && refs.has(child.nodeRef)) {
      if (!extracted.has(child.nodeRef)) extracted.set(child.nodeRef, child);
      continue;
    }
    extractEntriesByRef(child, refs, extracted);
    retained.push(child);
  }
  root.children = retained;
}

function relocateReviewedEntries(containers, placements) {
  const refs = new Set([...placements.values()].flat());
  const extracted = new Map();
  for (const container of containers) extractEntriesByRef(container, refs, extracted);

  for (const [target, targetRefs] of placements) {
    target.children = target.children ?? [];
    const children = target.children;
    const existingRefs = new Set(children.map((child) => child.nodeRef).filter(Boolean));
    for (const ref of targetRefs) {
      if (existingRefs.has(ref)) continue;
      const entry = extracted.get(ref);
      if (!entry) throw new Error(`Reviewed MySQL entry ${ref} is missing from the concept tree`);
      children.push(entry);
      existingRefs.add(ref);
    }
  }
}

function flattenLegacyContainer(parent, childId) {
  const index = (parent.children ?? []).findIndex((child) => child.id === childId);
  if (index < 0) return;
  const [legacy] = parent.children.splice(index, 1);
  setChildren(parent, [...(parent.children ?? []), ...(legacy.children ?? [])]);
}

function removeTreeIdsAndRefs(root, treeIds, nodeRefs) {
  const retained = [];
  for (const child of root.children ?? []) {
    const isDefinitionNode = child.id.endsWith(':definition') || String(child.nodeRef ?? '').endsWith(':definition');
    if (treeIds.has(child.id) || (child.nodeRef && nodeRefs.has(child.nodeRef)) || isDefinitionNode) continue;
    removeTreeIdsAndRefs(child, treeIds, nodeRefs);
    retained.push(child);
  }
  root.children = retained;
}

function buildFileKindConcept({ treeId, name, nodeRef, composition }) {
  return conceptTree({
    id: treeId,
    name,
    nodeRef,
    composition,
  });
}

function categoryNode(id, name, refs) {
  const nodeRef = `${id}:node`;
  ensureKnowledgeNode(nodeRef, name, `${name}是系统文件层数据文件中的一个组成类别。`, 'plain');
  return treeEntry(
    id,
    name,
    nodeRef,
    refs.map((ref) => projection(id.replaceAll(':', '-'), ref)),
  );
}

const mysqlRoot = findTreeNode(tree, MYSQL_ROOT_ID);
if (!mysqlRoot) throw new Error(`Missing MySQL root ${MYSQL_ROOT_ID}`);

normalizeKnowledgeNodeRoles();

ensureKnowledgeNode(
  'mysql:concept:sql',
  'SQL',
  'SQL 是 MySQL 暴露给使用者的数据定义、数据操作、查询与控制语言。',
);
ensureKnowledgeNode(
  'mysql:concept:server',
  'MySQL Server',
  'MySQL Server 是接收连接、处理 SQL、协调权限、事务、执行计划和存储引擎访问的服务端概念。',
);
ensureKnowledgeNode(
  'k_1786950659107_7la92l',
  'mysqld 处理链路',
  nodePool.k_1786950659107_7la92l?.card?.rootContent
    ?? 'mysqld 处理链路描述请求从连接入口进入，经 SQL 解析、查询优化、查询执行，最终访问存储引擎与持久化层的结构关系。',
);
nodePool.k_1786950659107_7la92l.canonicalKey = 'mysql:server:mysqld-processing-chain';
ensureKnowledgeNode(
  'mysql_topic_indexes_access',
  '索引与访问路径',
  '索引与访问路径是 MySQL 中负责组织索引类型、索引访问方式和访问路径相关术语的兼容概念节点。',
);

const sqlLanguage = detachedOrProjection('mysql:theme:sql-language', 'SQL 语言', 'mysql:theme:sql-language');
const schemaObjects = detachedOrProjection('mysql:theme:schema-objects', '数据库对象与元数据', 'mysql:theme:schema-objects');
const dataTypes = detachedOrProjection('mysql:theme:data-types', '数据类型与值', 'mysql:theme:data-types');
const queryProcessing = detachedOrProjection('mysql:theme:query-processing', '查询处理', 'mysql:theme:query-processing');

const connectivity = detachedOrProjection('mysql:theme:connectivity', '连接与客户端接口', 'mysql:theme:connectivity');
const storageEngines = detachedOrProjection('mysql:theme:storage-engines', '存储引擎', 'mysql:theme:storage-engines');
const security = detachedOrProjection('mysql:theme:security-access', '安全与权限', 'mysql:theme:security-access');
const backupRecovery = detachedOrProjection('mysql:theme:backup-recovery', '备份与恢复', 'mysql:theme:backup-recovery');
const operations = detachedOrProjection('mysql:theme:operations', '运维与管理', 'mysql:theme:operations');
const indexes = detachedOrProjection('mysql:theme:indexes-access', '索引与访问路径', 'mysql:theme:indexes-access');
const transactions = detachedOrProjection('mysql:theme:transactions-concurrency', '事务与并发控制', 'mysql:theme:transactions-concurrency');
const replication = detachedOrProjection('mysql:theme:replication-ha', '复制与高可用', 'mysql:theme:replication-ha');
const performance = detachedOrProjection('mysql:theme:performance-observability', '性能与可观测性', 'mysql:theme:performance-observability');
const mysqldStructure = detachedOrProjection('tree_1786950659484_8iawe7', 'mysqld 处理链路', 'k_1786950659107_7la92l');

flattenLegacyContainer(storageEngines, 'mysql_topic_storage_engines');
flattenLegacyContainer(storageEngines, 'mysql_topic_innodb_internals');

const configFiles = buildFileKindConcept({
  treeId: 'mysql:concept:system-files:config-files',
  name: '配置文件',
  nodeRef: 'k_1782029618563_7rrguo',
  composition: [
    projection('mysql-config-files', 'mysql_glossary_my_cnf_v2use8'),
    projection('mysql-config-files', 'mysql_glossary_my_ini_1giw6m'),
    projection('mysql-config-files', 'mysql_glossary_option_file_gsqytm'),
    projection('mysql-config-files', 'mysql_glossary_cfg_file_1wfa77'),
    projection('mysql-config-files', 'mysql_glossary_opt_file_1w9809'),
    projection('mysql-config-files', 'k_1782029655809_1yi7ql', 'db.opt 文件'),
  ],
});

const metadataDataFiles = categoryNode('mysql:concept:data-files:metadata', '元数据与选项文件', [
  'k_1782029674610_l6hlzo',
  'mysql_glossary_data_directory_zrepzq',
]);
const myisamDataFiles = categoryNode('mysql:concept:data-files:myisam', 'MyISAM 文件', [
  'mysql_file_myd',
  'mysql_file_myi',
]);
const innodbTablespaceFiles = categoryNode('mysql:concept:data-files:innodb-tablespaces', 'InnoDB 表空间文件', [
  'mysql_file_ibd',
  'mysql_file_ibdata',
  'mysql_file_ibdata1',
  'mysql_glossary_ibtmp_file_18e04h',
  'mysql_glossary_ibz_file_tz3hbm',
  'mysql_glossary_file_per_table_c2gueo',
  'mysql_glossary_innodb_file_per_table_1w525y',
]);
const otherEngineDataFiles = categoryNode('mysql:concept:data-files:other-engines', '其他存储引擎文件', [
  'mysql_glossary_arm_file_ufam2l',
  'mysql_glossary_arz_file_1iyj60',
  'mysql_glossary_mrg_file_2synx7',
  'mysql_glossary_par_file_rzlrrm',
]);

const dataFiles = buildFileKindConcept({
  treeId: 'tree_1782029643149_9klslf',
  name: '数据文件',
  nodeRef: 'k_1782029643146_aumkky',
  composition: [
    metadataDataFiles,
    myisamDataFiles,
    innodbTablespaceFiles,
    otherEngineDataFiles,
  ],
});

const logFiles = buildFileKindConcept({
  treeId: 'tree_1782029505240_be11k0',
  name: '日志文件',
  nodeRef: 'k_1782029505237_7y8fh8',
  composition: [
    projection('mysql-log-files', 'k_1782031329838_mcap8c', 'ib_logfile0、ib_logfile1 文件组'),
    projection('mysql-log-files', 'mysql_glossary_log_group_1a3bsl'),
    projection('mysql-log-files', 'k_1782029522089_047znr', '错误日志'),
    projection('mysql-log-files', 'k_1782029546712_okgd59', '通用查询日志'),
    projection('mysql-log-files', 'k_1782029566469_60woxz', '二进制日志'),
    projection('mysql-log-files', 'k_1782029599317_nn6hzg', '慢查询日志'),
    projection('mysql-log-files', 'mysql_glossary_ib_logfile_1p12fu'),
    projection('mysql-log-files', 'mysql_file_ib_logfile0'),
    projection('mysql-log-files', 'mysql_file_ib_logfile1'),
    projection('mysql-log-files', 'mysql_glossary_ibbackup_logfile_1vewn2'),
  ],
});

const runtimeFiles = buildFileKindConcept({
  treeId: 'governance:canonical:mysql_runtime_files',
  name: '运行时文件',
  nodeRef: 'mysql_runtime_files',
  composition: [
    projection('mysql-runtime-files', 'mysql_file_pid'),
    projection('mysql-runtime-files', 'mysql_file_socket'),
  ],
});
const configFileComposition = configFiles.children.find((child) => child.id === 'mysql:concept:system-files:config-files:composition');
const logFileComposition = logFiles.children.find((child) => child.id === 'tree_1782029505240_be11k0:composition');
if (!configFileComposition || !logFileComposition) throw new Error('MySQL file composition axes are missing');

const legacyThemeContainers = [
  sqlLanguage,
  schemaObjects,
  dataTypes,
  queryProcessing,
  connectivity,
  storageEngines,
  security,
  backupRecovery,
  operations,
  indexes,
  transactions,
  replication,
  performance,
];
const reviewedPlacementTargets = {
  connectivity,
  security,
  backupRecovery,
  operations,
  performance,
  indexes,
  queryProcessing,
  transactions,
  replication,
  sqlLanguage,
  storageEngines,
  metadataDataFiles,
  innodbTablespaceFiles,
  configFileComposition,
  logFileComposition,
};
const reviewedPlacements = new Map(
  Object.entries(MYSQL_REVIEWED_CATEGORY_PLACEMENTS).map(([targetKey, refs]) => {
    const target = reviewedPlacementTargets[targetKey];
    if (!target) throw new Error(`Unknown MySQL placement target ${targetKey}`);
    return [target, refs];
  }),
);
relocateReviewedEntries(legacyThemeContainers, reviewedPlacements);

const canonicalFileTreeIds = new Set([
  'mysql:concept:system-files',
  'mysql:concept:system-files:config-files',
  'tree_1782029643149_9klslf',
  'tree_1782029505240_be11k0',
  'governance:canonical:mysql_runtime_files',
]);
const canonicalFileRefs = new Set([
  'k_1782029470422_yfa3u9',
  'k_1782029618563_7rrguo',
  'mysql_glossary_my_cnf_v2use8',
  'mysql_glossary_option_file_gsqytm',
  'mysql_glossary_cfg_file_1wfa77',
  'mysql_glossary_opt_file_1w9809',
  'k_1782029655809_1yi7ql',
  'k_1782029643146_aumkky',
  'k_1782029674610_l6hlzo',
  'mysql_file_myd',
  'mysql_file_myi',
  'mysql_file_ibd',
  'mysql_file_ibdata',
  'mysql_file_ibdata1',
  'mysql_glossary_ibtmp_file_18e04h',
  'mysql_glossary_ibz_file_tz3hbm',
  'mysql_glossary_data_directory_zrepzq',
  'mysql_glossary_file_per_table_c2gueo',
  'mysql_glossary_group_tablespaces_files',
  'mysql_glossary_innodb_file_per_table_1w525y',
  'mysql_glossary_my_ini_1giw6m',
  'mysql_glossary_log_group_1a3bsl',
  'mysql_glossary_arm_file_ufam2l',
  'mysql_glossary_arz_file_1iyj60',
  'mysql_glossary_mrg_file_2synx7',
  'mysql_glossary_par_file_rzlrrm',
  'k_1782029505237_7y8fh8',
  'k_1782029522089_047znr',
  'k_1782029546712_okgd59',
  'k_1782029566469_60woxz',
  'k_1782029599317_nn6hzg',
  'mysql_glossary_ib_logfile_1p12fu',
  'mysql_file_ib_logfile0',
  'mysql_file_ib_logfile1',
  'mysql_glossary_ibbackup_logfile_1vewn2',
  'mysql_runtime_files',
  'mysql_file_pid',
  'mysql_file_socket',
]);

for (const legacyContainer of [
  sqlLanguage,
  schemaObjects,
  dataTypes,
  queryProcessing,
  connectivity,
  storageEngines,
  security,
  backupRecovery,
  operations,
  indexes,
  transactions,
  replication,
  performance,
  mysqldStructure,
]) {
  removeTreeIdsAndRefs(legacyContainer, canonicalFileTreeIds, canonicalFileRefs);
}

for (const definitionNodeId of [
  'mysql:concept:server:definition',
  'mysql:concept:sql:definition',
  'k_1782029470422_yfa3u9:definition',
  'k_1782029618563_7rrguo:definition',
  'k_1782029643146_aumkky:definition',
  'k_1782029505237_7y8fh8:definition',
  'mysql_runtime_files:definition',
]) {
  delete nodePool[definitionNodeId];
}

const systemFiles = conceptTree({
  id: 'mysql:concept:system-files',
  name: '系统文件层',
  nodeRef: 'k_1782029470422_yfa3u9',
  composition: [configFiles, dataFiles, logFiles, runtimeFiles],
});

const sqlConcept = conceptTree({
  id: 'mysql:concept:sql',
  name: 'SQL',
  nodeRef: 'mysql:concept:sql',
  composition: [sqlLanguage, schemaObjects, dataTypes],
  structure: [queryProcessing],
});

const serverConcept = conceptTree({
  id: 'mysql:concept:server',
  name: 'MySQL Server',
  nodeRef: 'mysql:concept:server',
  composition: [connectivity, storageEngines, systemFiles, security, backupRecovery, operations],
  structure: [
    projection('mysql-server-structure', 'mysql_topic_architecture', 'MySQL 架构专题'),
    projection('mysql-server-structure', 'k_1782032275682_61auc4', '服务层（MySQL Server）'),
    mysqldStructure,
    indexes,
    transactions,
    replication,
    performance,
  ],
});

setChildren(mysqlRoot, [serverConcept, sqlConcept]);

const mysqlParent = findTreeParent(tree, MYSQL_ROOT_ID);
if (!mysqlParent) throw new Error('Missing MySQL parent');
let mysqlSourceView = findTreeNode(tree, 'forest:view:mysql-source');
if (!mysqlSourceView) {
  mysqlSourceView = treeEntry('forest:view:mysql-source', 'MySQL 术语库（来源兼容视图）', undefined, []);
  mysqlSourceView.viewKind = 'source-view';
  mysqlSourceView.view = 'mysql-glossary-source';
  mysqlParent.children = [...(mysqlParent.children ?? []), mysqlSourceView];
}
const compatibilitySourceRefs = [
  'mysql_topic_storage_engines',
  'mysql_topic_innodb_internals',
  'mysql_glossary_group_tablespaces_files',
];
setChildren(mysqlSourceView, [
  ...(mysqlSourceView.children ?? []),
  ...compatibilitySourceRefs.map((ref) => treeEntry(
    `projection:mysql-source-compat:${ref}`,
    nodePool[ref]?.label ?? ref,
    ref,
  )),
]);

const allTreeIds = collectTreeNodes(tree).map((node) => node.id);
const duplicateTreeIds = allTreeIds.filter((id, index) => allTreeIds.indexOf(id) !== index);
if (duplicateTreeIds.length) {
  throw new Error(`Duplicate tree ids: ${[...new Set(duplicateTreeIds)].join(', ')}`);
}

function rebuildTreeBindingEdges() {
  const bindings = [];
  const visit = (parent) => {
    for (const child of parent.children ?? []) {
      if (
        parent.nodeRef
        && child.nodeRef
        && parent.nodeRef !== child.nodeRef
        && nodePool[parent.nodeRef]
        && nodePool[child.nodeRef]
      ) {
        bindings.push({
          id: `${TREE_BINDING_PREFIX}${parent.id}:${child.id}`,
          source: parent.nodeRef,
          target: child.nodeRef,
          type: 'belongs-to',
          label: 'contains',
          relationKind: 'structure',
          dimensions: unique([
            ...(nodePool[parent.nodeRef]?.dimensions ?? []),
            ...(nodePool[child.nodeRef]?.dimensions ?? []),
          ]),
        });
      }
      visit(child);
    }
  };
  visit(tree);
  return [...edges.filter((edge) => !edge.id.startsWith(TREE_BINDING_PREFIX)), ...bindings];
}

fs.writeFileSync(treePath, `${JSON.stringify(tree, null, 2)}\n`);
fs.writeFileSync(nodePoolPath, `${JSON.stringify(nodePool, null, 2)}\n`);
fs.writeFileSync(edgesPath, `${JSON.stringify(rebuildTreeBindingEdges(), null, 2)}\n`);

console.log('mysql concept taxonomy organized');
