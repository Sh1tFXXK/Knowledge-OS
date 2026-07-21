import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const treePath = path.resolve('data/tree-data.json');
const nodePoolPath = path.resolve('data/node-pool.json');

const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
const nodePool = JSON.parse(fs.readFileSync(nodePoolPath, 'utf8'));

function readBaselineTree() {
  try {
    const raw = execFileSync('git', ['show', 'HEAD:data/tree-data.json'], { encoding: 'utf8' });
    return JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch {
    return null;
  }
}

const expectedMysqlCategories = [
  ['mysql_topic_architecture', '总览与体系结构'],
  ['mysql_topic_sql_objects', 'SQL'],
  ['mysql_topic_storage_engines', '存储引擎'],
  ['mysql_topic_innodb_internals', 'InnoDB 内部结构'],
  ['mysql_topic_indexes_access', '索引与访问路径'],
  ['mysql_topic_transactions_locks', '事务与锁'],
  ['mysql_topic_logs_recovery', '日志与恢复'],
  ['mysql_topic_optimizer_performance', '优化器与性能'],
  ['mysql_topic_replication_ha', '复制与高可用'],
  ['mysql_topic_connectors_api', '连接器与 API'],
  ['mysql_topic_security_auth', '安全与权限'],
  ['mysql_topic_backup_operations', '备份与运维'],
  ['mysql_topic_text_spatial_charset', '文本、空间与字符集'],
  ['mysql_topic_uncategorized', '未分类'],
];

const categoryIds = new Set(expectedMysqlCategories.map(([id]) => id));
const strayPlacement = new Map([
  ['demo_tree_tx', 'mysql_topic_transactions_locks'],
  ['demo_tree_lock', 'mysql_topic_transactions_locks'],
  ['mysql_term_data_structures_index_qwtxk8', 'mysql_topic_indexes_access'],
  ['tree_1782748910933_jw2hib', 'mysql_topic_text_spatial_charset'],
  ['tree_1782230482973_dgay97', 'mysql_topic_sql_objects'],
]);

const schoolDomainMap = new Map([
  ['school_mathematics', [
    'theory_domain_set_theory',
    'theory_domain_graph_theory',
    'theory_domain_statistics',
    'theory_domain_probability',
    'theory_domain_numerical_analysis',
    'theory_domain_information_theory',
    'theory_domain_queueing_theory',
  ]],
  ['school_logic', [
    'theory_domain_first_order_logic',
    'theory_domain_type_theory',
    'theory_domain_three_valued_logic',
  ]],
  ['school_database_theory', [
    'theory_domain_relational_algebra',
    'theory_domain_normalization_theory',
    'theory_domain_transaction_theory',
    'theory_domain_recovery_theory',
  ]],
  ['school_computation_theory', [
    'theory_domain_formal_languages_automata',
    'theory_domain_complexity_theory',
    'theory_domain_algorithms',
  ]],
  ['school_programming_languages', [
    'theory_domain_programming_language_theory',
    'theory_domain_regular_expression_theory',
    'theory_domain_compiler_principles',
  ]],
  ['school_systems', [
    'theory_domain_data_structures',
    'theory_domain_operating_systems',
    'theory_domain_computer_architecture',
    'theory_domain_storage_systems',
    'theory_domain_concurrency_theory',
    'theory_domain_distributed_systems',
    'theory_domain_network_protocols',
  ]],
  ['school_security', [
    'theory_domain_cryptography',
    'theory_domain_access_control',
  ]],
  ['school_information_retrieval', [
    'theory_domain_information_retrieval',
  ]],
  ['school_real_world_conventions', [
    'theory_domain_calendar_systems',
    'theory_domain_character_encoding_standards',
    'theory_domain_timezone_standards',
  ]],
]);

const schoolLabels = new Map([
  ['school_mathematics', '数学'],
  ['school_logic', '逻辑'],
  ['school_database_theory', '数据库理论'],
  ['school_computation_theory', '计算理论'],
  ['school_programming_languages', '程序语言'],
  ['school_systems', '系统'],
  ['school_security', '安全'],
  ['school_information_retrieval', '信息检索'],
  ['school_real_world_conventions', '现实约定'],
]);

const domainLabels = new Map([
  ['theory_domain_set_theory', '集合论'],
  ['theory_domain_first_order_logic', '一阶谓词逻辑'],
  ['theory_domain_relational_algebra', '关系代数'],
  ['theory_domain_graph_theory', '图论'],
  ['theory_domain_formal_languages_automata', '形式语言理论 / 自动机理论'],
  ['theory_domain_type_theory', '类型理论'],
  ['theory_domain_three_valued_logic', '三值逻辑'],
  ['theory_domain_normalization_theory', '规范化理论'],
  ['theory_domain_statistics', '统计学'],
  ['theory_domain_probability', '概率论'],
  ['theory_domain_numerical_analysis', '数值分析'],
  ['theory_domain_information_theory', '信息论'],
  ['theory_domain_queueing_theory', '排队论'],
  ['theory_domain_algorithms', '算法'],
  ['theory_domain_data_structures', '数据结构'],
  ['theory_domain_compiler_principles', '编译原理'],
  ['theory_domain_concurrency_theory', '并发理论'],
  ['theory_domain_complexity_theory', '计算复杂性理论'],
  ['theory_domain_operating_systems', '操作系统'],
  ['theory_domain_computer_architecture', '计算机体系结构'],
  ['theory_domain_storage_systems', '存储系统'],
  ['theory_domain_transaction_theory', '事务理论'],
  ['theory_domain_recovery_theory', '恢复理论'],
  ['theory_domain_distributed_systems', '分布式系统'],
  ['theory_domain_network_protocols', '网络协议'],
  ['theory_domain_cryptography', '密码学'],
  ['theory_domain_access_control', '访问控制理论'],
  ['theory_domain_programming_language_theory', '程序语言理论'],
  ['theory_domain_regular_expression_theory', '正则表达式理论'],
  ['theory_domain_information_retrieval', '信息检索理论'],
  ['theory_domain_calendar_systems', '历法系统'],
  ['theory_domain_character_encoding_standards', '字符编码标准'],
  ['theory_domain_timezone_standards', '时区标准'],
]);

const expectedSchoolIds = [...schoolDomainMap.keys()];
const expectedDomainIds = new Set([...schoolDomainMap.values()].flat());
const domainPrefixes = [...expectedDomainIds]
  .map((domainId) => [domainId, domainId.replace('theory_domain_', '')])
  .sort((a, b) => b[1].length - a[1].length);

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function detachTreeNode(root, id) {
  if (!root.children) return null;
  const index = root.children.findIndex((child) => child.id === id);
  if (index >= 0) {
    const [node] = root.children.splice(index, 1);
    return node;
  }
  for (const child of root.children) {
    const found = detachTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function ensureKnowledgeNode(id, label, content, tags = ['taxonomy']) {
  if (nodePool[id]) {
    const first = nodePool[id].card?.tabs?.[0];
    if (first?.content?.includes('是 MySQL 知识目录中的稳定分类节点')) {
      first.content = content;
    }
    return;
  }
  nodePool[id] = {
    id,
    label,
    role: 'plain',
    tags,
    card: {
      nodeId: id,
      title: label,
      tabs: [
        {
          id: 'definition',
          label: '定义',
          content,
        },
      ],
    },
  };
}

function ensureMysqlCategoryNode(id, label) {
  ensureKnowledgeNode(
    id,
    label,
    `${label} 是 MySQL 功能目录中的导航分类，不是独立知识定义；它用于把相关 MySQL 概念放在同一视图下。`,
    ['mysql-taxonomy'],
  );
}

function createTreeNode(id, name) {
  return {
    id,
    name,
    count: 0,
    nodeRef: id,
    children: [],
  };
}

function ensureDomainCard(domainId, schoolLabel) {
  const label = domainLabels.get(domainId) ?? domainId;
  ensureKnowledgeNode(
    domainId,
    label,
    `独立门派：${schoolLabel}\n\n${label} 是跨具体技术栈复用的理论域；它不是 MySQL 的子概念，只是 MySQL 词条可以引用的前置背景。`,
    ['theory-domain'],
  );
  const node = nodePool[domainId];
  const tabs = node.card?.tabs?.length
    ? node.card.tabs
    : [{ id: 'definition', label: '定义', content: '' }];
  const first = tabs[0];
  if (!first.content.includes('独立门派：')) {
    first.content = `独立门派：${schoolLabel}\n\n${first.content || `${label} 的理论域说明。`}`;
  }
  node.card = {
    ...node.card,
    nodeId: domainId,
    title: node.card?.title ?? label,
    tabs: [first, ...tabs.slice(1)],
  };
}

function collectTreeNodes(root) {
  return [root, ...(root.children ?? []).flatMap(collectTreeNodes)];
}

function cloneNode(node) {
  return {
    ...node,
    children: node.children ? node.children.map(cloneNode) : undefined,
  };
}

function ensureChildRef(parentId, treeId, nodeRef, fallbackName) {
  const parent = findTreeNode(tree, parentId);
  if (!parent) return;
  const existing = detachTreeNode(tree, treeId) ?? detachTreeNode(tree, nodeRef);
  const node = existing ?? {
    id: treeId,
    name: nodePool[nodeRef]?.label ?? fallbackName,
    count: 0,
    nodeRef,
  };
  node.nodeRef = nodeRef;
  node.name = node.name || nodePool[nodeRef]?.label || fallbackName;
  parent.children = [...(parent.children ?? []), node];
}

function removeDuplicateMysqlTermRefs(root, seen = new Set()) {
  const nextChildren = [];
  for (const child of root.children ?? []) {
    if (child.id.startsWith('mysql_term_') && child.nodeRef) {
      if (seen.has(child.nodeRef)) continue;
      seen.add(child.nodeRef);
    }
    removeDuplicateMysqlTermRefs(child, seen);
    nextChildren.push(child);
  }
  if (root.children) root.children = nextChildren;
}

const mysqlRoot = findTreeNode(tree, 'demo_mysql');
if (!mysqlRoot) {
  throw new Error('demo_mysql root not found');
}

for (const [id, label] of expectedMysqlCategories) {
  ensureMysqlCategoryNode(id, label);
}

const existingChildren = mysqlRoot.children ?? [];
const categoriesById = new Map();
const strays = [];

for (const child of existingChildren) {
  if (categoryIds.has(child.id)) {
    categoriesById.set(child.id, { ...child, nodeRef: child.nodeRef || child.id });
  } else {
    strays.push(child);
  }
}

for (const [id, label] of expectedMysqlCategories) {
  if (!categoriesById.has(id)) {
    categoriesById.set(id, createTreeNode(id, label));
  }
}

for (const stray of strays) {
  const targetId = strayPlacement.get(stray.id) ?? 'mysql_topic_uncategorized';
  const target = categoriesById.get(targetId);
  target.children = [...(target.children ?? []), stray];
}

mysqlRoot.children = expectedMysqlCategories.map(([id]) => categoriesById.get(id));

const universeRoot = findTreeNode(tree, 'universe');
if (!universeRoot) {
  throw new Error('universe root not found');
}

const extraSchoolChildren = [];
const schoolNodes = new Map();

for (const schoolId of expectedSchoolIds) {
  const schoolLabel = schoolLabels.get(schoolId) ?? schoolId;
  ensureKnowledgeNode(schoolId, schoolLabel);
  const detached = detachTreeNode(universeRoot, schoolId) ?? createTreeNode(schoolId, schoolLabel);
  const preservedChildren = detached.children ?? [];
  detached.name = detached.name || schoolLabel;
  detached.nodeRef = detached.nodeRef || schoolId;
  detached.children = [];
  for (const child of preservedChildren) {
    if (!expectedDomainIds.has(child.id)) {
      extraSchoolChildren.push(child);
    }
  }
  schoolNodes.set(schoolId, detached);
}

for (const [schoolId, domainIds] of schoolDomainMap) {
  const schoolLabel = schoolLabels.get(schoolId) ?? schoolId;
  const school = schoolNodes.get(schoolId);
  for (const domainId of domainIds) {
    ensureDomainCard(domainId, schoolLabel);
    const domain = detachTreeNode(universeRoot, domainId) ?? createTreeNode(domainId, domainLabels.get(domainId) ?? domainId);
    domain.nodeRef = domain.nodeRef || domainId;
    school.children.push(domain);
  }
}

universeRoot.children = [
  ...(universeRoot.children ?? []),
  ...expectedSchoolIds.map((schoolId) => schoolNodes.get(schoolId)),
  ...extraSchoolChildren,
];

ensureChildRef(
  'mysql_lock_range_insert',
  'mysql_glossary_gap_lock_1gfoi1',
  'mysql_glossary_gap_lock_1gfoi1',
  '间隙锁 / gap lock',
);
ensureChildRef(
  'mysql_topic_text_spatial_charset',
  'mysql_glossary_unicode_fwfjuo',
  'mysql_glossary_unicode_fwfjuo',
  'Unicode',
);

const baselineTree = readBaselineTree();
const baselineTerms = new Map(
  (baselineTree ? collectTreeNodes(baselineTree) : [])
    .filter((node) => node.id.startsWith('mysql_term_'))
    .map((node) => [node.id, node]),
);
const mysqlTermsById = new Map([
  ...baselineTerms,
  ...collectTreeNodes(tree)
    .filter((node) => node.id.startsWith('mysql_term_'))
    .map((node) => [node.id, node]),
]);

for (const mysqlTerm of mysqlTermsById.values()) {
  const match = domainPrefixes.find(([, prefix]) => mysqlTerm.id.startsWith(`mysql_term_${prefix}_`));
  if (!match) continue;
  const [domainId] = match;
  const domain = findTreeNode(tree, domainId);
  if (!domain) continue;
  const detached = detachTreeNode(tree, mysqlTerm.id) ?? cloneNode(mysqlTerm);
  if ((domain.children ?? []).some((child) => child.id === detached.id)) continue;
  domain.children = [...(domain.children ?? []), detached];
}

ensureChildRef(
  'theory_domain_formal_languages_automata',
  'mysql_term_formal_languages_automata_ddl_1pevm4',
  'k_dict_73wtge24',
  '数据定义语言 / DDL',
);
ensureChildRef(
  'theory_domain_data_structures',
  'mysql_term_data_structures_hash_index_1p2w9j',
  'demo_hash',
  '哈希索引 / hash index',
);
ensureChildRef(
  'theory_domain_three_valued_logic',
  'mysql_term_three_valued_logic_null_plui03',
  'k_dict_fxoirizf',
  'NULL',
);
ensureChildRef(
  'theory_domain_transaction_theory',
  'mysql_term_transaction_theory_dirty_read_1yn24s',
  'k_dict_t83fdwoc',
  '脏读 / dirty read',
);
ensureChildRef(
  'theory_domain_character_encoding_standards',
  'mysql_term_character_encoding_standards_ansi_su18oi',
  'k_dict_ij1x57s1',
  'ANSI',
);

for (const schoolId of expectedSchoolIds) {
  const school = findTreeNode(tree, schoolId);
  if (school) removeDuplicateMysqlTermRefs(school);
}

for (const treeNode of collectTreeNodes(tree)) {
  if (!treeNode.nodeRef || nodePool[treeNode.nodeRef]) continue;
  ensureKnowledgeNode(
    treeNode.nodeRef,
    treeNode.name || treeNode.nodeRef,
    `${treeNode.name || treeNode.nodeRef} 是目录引用的占位知识实体；请在解释卡中补全真实定义。`,
  );
}

for (const [id, node] of Object.entries(nodePool)) {
  if (!id.startsWith('theory_domain_')) continue;
  const first = node.card?.tabs?.[0];
  if (!first?.content?.includes('MySQL 知识目录中的稳定分类节点')) continue;
  const label = node.label || node.card?.title || id;
  first.content = `${label} 是跨具体技术栈复用的理论域；它不是 MySQL 的子概念，只是具体技术词条可以引用的前置背景。`;
  node.tags = Array.from(new Set([...(node.tags ?? []), 'theory-domain']));
}

fs.writeFileSync(treePath, `${JSON.stringify(tree, null, 2)}\n`);
fs.writeFileSync(nodePoolPath, `${JSON.stringify(nodePool, null, 2)}\n`);

console.log('mysql taxonomy repaired');
