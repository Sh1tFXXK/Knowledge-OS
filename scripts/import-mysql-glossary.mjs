import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const GLOSSARY_PATH =
  'C:/Users/Administrator/Documents/Obsidian Vault/数据库/MySQL 词汇表-整理版.md';

const NODE_POOL_PATH = path.join(DATA_DIR, 'node-pool.json');
const TREE_PATH = path.join(DATA_DIR, 'tree-data.json');
const EDGES_PATH = path.join(DATA_DIR, 'knowledge-edges.json');

const GLOSSARY_ROOT_ID = 'mysql_glossary_root';
const GLOSSARY_TREE_ROOT_ID = 'tree_mysql_glossary_root';
const MYSQL_TREE_ID = 'demo_mysql';
const IMPORT_TAG = 'mysql-glossary';

const SUPPLEMENT_PARENT_BY_GROUP = new Map(
  Object.entries({
    architecture: 'tree_1782032149182_6wye1y',
    sql_objects: 'tree_1782033172539_wxvnr8',
    storage_engines: 'demo_tree_engine',
    indexes_access: 'demo_tree_index',
    mvcc_undo: 'demo_tree_mvcc',
    transactions_locks: 'demo_tree_tx',
    tablespaces_files: 'tree_1782029643149_9klslf',
    logs_recovery: 'tree_1782029505240_be11k0',
    replication_ha: MYSQL_TREE_ID,
    optimizer_performance: 'tree_1782032275690_fgvswo',
    connectors_api: 'tree_1782032135569_1697f8',
    security_auth: MYSQL_TREE_ID,
    backup_operations: 'tree_1782032936994_e5wpwn',
    text_spatial_charset: 'tree_1782033172539_wxvnr8',
    misc: MYSQL_TREE_ID,
  }),
);

const STRUCTURE_GROUPS = [
  {
    id: 'architecture',
    name: 'MySQL 总览与体系结构',
    color: '#E58522',
    desc: '实例、服务端、客户端连接、配置、数据字典和整体架构概念。',
    patterns: [
      /mysql|server|instance|database|schema|data dictionary|metadata|connection|client|thread|process|port|option|system variable|configuration|parser|sql interface|query cache/i,
    ],
  },
  {
    id: 'sql_objects',
    name: 'SQL、表与数据对象',
    color: '#58B2DC',
    desc: 'SQL 语言、表、列、行、视图、约束、存储对象和生成列。',
    patterns: [
      /sql|table|column|row|view|constraint|generated column|stored|routine|trigger|cursor|ddl|dml|select|insert|update|delete|truncate|schema object/i,
    ],
  },
  {
    id: 'storage_engines',
    name: '存储引擎',
    color: '#00AA90',
    desc: 'InnoDB、MyISAM、MEMORY、ARCHIVE、NDB 等存储引擎及其差异。',
    patterns: [
      /storage engine|innodb|myisam|archive|memory|ndb|engine|row format|compact|dynamic|compressed|redundant/i,
    ],
  },
  {
    id: 'indexes_access',
    name: '索引与访问路径',
    color: '#B481BB',
    desc: 'B-tree、聚集索引、二级索引、全文索引、哈希索引、扫描和访问路径。',
    patterns: [
      /index|b-tree|btree|clustered|secondary|covering|fulltext|hash|scan|search|selectivity|cardinality|prefix|unique key|primary key|foreign key/i,
    ],
  },
  {
    id: 'mvcc_undo',
    name: 'InnoDB MVCC 与 Undo',
    color: '#7C83FD',
    desc: 'MVCC、Read View、Undo、回滚段、隐藏字段、版本链和 purge。',
    patterns: [
      /mvcc|multi-version|multiversion|read view|undo|rollback segment|db_trx_id|db_roll_ptr|db_row_id|purge|consistent read|non-locking read|snapshot|version chain/i,
    ],
  },
  {
    id: 'transactions_locks',
    name: '事务、隔离与锁',
    color: '#FF6B6B',
    desc: 'ACID、事务、提交、回滚、隔离级别、锁、死锁和读现象。',
    patterns: [
      /transaction|acid|commit|rollback|isolation|lock|deadlock|phantom|dirty read|repeatable read|serializable|read committed|savepoint|autocommit|latch|mutex/i,
    ],
  },
  {
    id: 'tablespaces_files',
    name: '表空间、页与文件',
    color: '#4ECDC4',
    desc: '表空间、页、数据目录、数据文件、InnoDB 与 MyISAM 文件形态。',
    patterns: [
      /tablespace|page|file|\.ibd|ibdata|ib_logfile|\.myd|\.myi|data directory|data files|system tablespace|file-per-table|pid|socket|space id/i,
    ],
  },
  {
    id: 'logs_recovery',
    name: '日志、恢复与持久化',
    color: '#F59E0B',
    desc: 'Redo、Binlog、查询日志、检查点、刷盘、崩溃恢复和持久性。',
    patterns: [
      /log|redo|binary log|binlog|relay log|query log|slow query|checkpoint|flush|flushing|crash recovery|durability|doublewrite|recovery|restore/i,
    ],
  },
  {
    id: 'replication_ha',
    name: '复制与高可用',
    color: '#EC4899',
    desc: '主从/源副本、复制、组复制、集群、GTID 和复制拓扑。',
    patterns: [
      /replication|replica|source|slave|master|gtid|group replication|cluster|router|high availability|failover|relay/i,
    ],
  },
  {
    id: 'optimizer_performance',
    name: '优化器、缓存与性能',
    color: '#45B7D1',
    desc: '优化器、执行计划、缓存、缓冲池、自适应机制、统计信息和可扩展性。',
    patterns: [
      /optimizer|execution plan|cache|buffer|buffer pool|change buffer|adaptive|statistics|performance|scalability|read-ahead|warm up|workload|cost|query plan/i,
    ],
  },
  {
    id: 'connectors_api',
    name: '连接器、API 与客户端',
    color: '#22C55E',
    desc: 'API、Connector、JDBC、ODBC、客户端库和语言绑定。',
    patterns: [
      /api|connector|jdbc|odbc|client librar|c api|perl|php|python|ruby|java|ado|net|visual studio|application programming interface/i,
    ],
  },
  {
    id: 'security_auth',
    name: '安全、账号与认证',
    color: '#F97316',
    desc: '账号、权限、认证、SSL/TLS、Kerberos、票据和安全主体。',
    patterns: [
      /security|ssl|tls|auth|password|privilege|account|principal|kerberos|ticket|truststore|user|role|grant/i,
    ],
  },
  {
    id: 'backup_operations',
    name: '备份、运维与诊断',
    color: '#94A3B8',
    desc: '备份、恢复、导入导出、启动关闭、诊断和维护工具。',
    patterns: [
      /backup|mysqlbackup|mysqldump|restore|import|export|startup|shutdown|troubleshooting|diagnostic|maintenance|hot backup|warm backup|cold backup|partial backup|full backup|raw backup|logical backup|physical backup/i,
    ],
  },
  {
    id: 'text_spatial_charset',
    name: '全文、空间与字符处理',
    color: '#A855F7',
    desc: '全文检索、停用词、词干、空间数据、字符集、排序规则和 Unicode。',
    patterns: [
      /full-text|fulltext|stopword|stemming|text|spatial|geometry|gis|character set|charset|collation|unicode|ansi|repertoire/i,
    ],
  },
  {
    id: 'misc',
    name: '补充与其他概念',
    color: '#64748B',
    desc: '不易归入单一主结构域的补充词条。',
    patterns: [],
  },
];

const explicitNodeByEnglish = new Map(
  Object.entries({
    ACID: 'demo_acid',
    InnoDB: 'demo_innodb',
    MyISAM: 'demo_myisam',
    MVCC: 'demo_mvcc',
    'multiversion concurrency control': 'demo_mvcc',
    'InnoDB Multi-Versioning': 'demo_mvcc',
    'read view': 'demo_readview',
    'undo log': 'demo_undo',
    'clustered index': 'demo_clustered_index',
    'secondary index': 'demo_secondary_index',
    'covering index': 'demo_covering_index',
    'FULLTEXT index': 'demo_fulltext_index',
    'hash index': 'demo_hash',
    'isolation level': 'demo_isolation',
    transaction: 'demo_transaction',
    'row lock': 'demo_row_lock',
    view: 'k_dict_lm90vzok',
    'Materialized View': 'k_dict_1sj5w4mj',
    DB_TRX_ID: 'innodb_mvcc_db_trx_id',
    DB_ROLL_PTR: 'innodb_mvcc_db_roll_ptr',
    DB_ROW_ID: 'innodb_mvcc_db_row_id',
    'Rollback Pointer': 'innodb_mvcc_db_roll_ptr',
    purge: 'innodb_mvcc_purge',
    'Purge Operation': 'innodb_mvcc_purge',
    '.MYD file': 'mysql_file_myd',
    '.MYI file': 'mysql_file_myi',
    '.ibd file': 'mysql_file_ibd',
    'ibdata file': 'mysql_file_ibdata',
    'ibdata1 file': 'mysql_file_ibdata1',
    'PID file': 'mysql_file_pid',
    'Socket file': 'mysql_file_socket',
  }),
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, '')
    .replace(/[._/\\\-:：,，;；()（）\[\]【】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactKey(value) {
  return normalizeKey(value).replace(/\s+/g, '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hash32(value) {
  let hash = 2166136261;
  for (const ch of value) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `term_${hash32(value)}`;
}

function labelFor(entry) {
  if (!entry.chinese || normalizeKey(entry.chinese) === normalizeKey(entry.english)) {
    return entry.english;
  }
  return `${entry.chinese} / ${entry.english}`;
}

function cleanDefinition(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseGlossary(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const entries = [];
  let section = '';
  let current = null;

  function finishCurrent() {
    if (!current) return;
    const block = current.lines.join('\n');
    const english = block.match(/^- English:\s*(.+)$/m)?.[1]?.trim();
    const chinese = block.match(/^- 中文:\s*(.+)$/m)?.[1]?.trim();
    const sourceLine = block.match(/^- 原始行:\s*(.+)$/m)?.[1]?.trim();
    const sourceUrl = block.match(/^- 官方锚点:\s*(.+)$/m)?.[1]?.trim();
    const definitionMatch = block.match(/#### 定义\s*\n([\s\S]*)$/);
    const definition = cleanDefinition(definitionMatch?.[1] ?? '');
    if (english && definition) {
      entries.push({
        section,
        heading: current.heading,
        english,
        chinese: chinese || english,
        sourceLine,
        sourceUrl,
        definition,
      });
    }
  }

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      finishCurrent();
      current = null;
      section = h2[1].trim();
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      finishCurrent();
      current = { heading: h3[1].trim(), lines: [] };
      continue;
    }

    if (current) current.lines.push(line);
  }
  finishCurrent();

  return entries;
}

function buildExistingIndex(nodePool) {
  const index = new Map();
  for (const node of Object.values(nodePool)) {
    const labels = unique([
      node.label,
      node.card?.title,
      ...(node.label?.split('/') ?? []),
      ...(node.card?.title?.split('/') ?? []),
    ]);
    for (const label of labels) {
      const normalized = normalizeKey(label);
      const compact = compactKey(label);
      if (normalized && !index.has(normalized)) index.set(normalized, node.id);
      if (compact && !index.has(compact)) index.set(compact, node.id);
    }
  }
  return index;
}

function deterministicNodeId(entry) {
  return `mysql_glossary_${slugify(entry.english)}_${hash32(entry.english).slice(0, 6)}`;
}

function resolveNodeId(entry, nodePool, existingIndex) {
  const explicit =
    explicitNodeByEnglish.get(entry.english) ??
    explicitNodeByEnglish.get(normalizeKey(entry.english));
  if (explicit && nodePool[explicit]) return explicit;

  const candidates = [
    entry.english,
    entry.chinese,
    labelFor(entry),
    entry.heading,
  ];
  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    const compact = compactKey(candidate);
    const hit = existingIndex.get(normalized) ?? existingIndex.get(compact);
    if (hit && nodePool[hit]) return hit;
  }

  return deterministicNodeId(entry);
}

function inferDimensions(entry) {
  const text = `${entry.english} ${entry.chinese} ${entry.definition}`.toLowerCase();
  const dimensions = [];
  if (/(transaction|mvcc|undo|redo|commit|rollback|isolation|lock|read view|savepoint|trx)/i.test(text)) {
    dimensions.push('transaction');
  }
  if (/(innodb|myisam|index|table|tablespace|page|row|file|buffer|log|data|storage|clustered|secondary)/i.test(text)) {
    dimensions.push('storage');
  }
  if (/(optimizer|cache|flush|performance|statistics|query plan|buffer pool|purge lag|adaptive)/i.test(text)) {
    dimensions.push('performance');
  }
  if (/(ssl|tls|auth|password|privilege|principal|ticket|kerberos|security)/i.test(text)) {
    dimensions.push('security');
  }
  return dimensions;
}

function isPlaceholderContent(content) {
  const text = String(content ?? '').trim();
  return (
    !text ||
    /^["“].+["”]\s*待补充内容。?$/.test(text) ||
    /^".+"\s+待补充内容。?$/.test(text)
  );
}

function looksImportedDefinition(content) {
  const text = String(content ?? '').trim();
  return /\*\*[\s\S]+?\*\*\s*\n英文：/.test(text) || /来源：原始行：/.test(text);
}

function existingSupplementBlocks(content) {
  const text = String(content ?? '').trim();
  if (!text) return [];
  const blockPattern =
    /\*\*(?:已有补充：[^*\n]+|已有备注)\*\*\n[\s\S]*?(?=\n\n\*\*(?:已有补充：[^*\n]+|已有备注)\*\*\n|$)/g;
  return [...text.matchAll(blockPattern)].map((match) => match[0].trim());
}

function uniqueBlocks(blocks) {
  const seen = new Set();
  return blocks.filter((block) => {
    const key = block.replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function existingSupplement(node) {
  if (!node) return '';
  const blocks = [];
  for (const tab of node.card?.tabs ?? []) {
    if (isPlaceholderContent(tab.content)) continue;
    if (tab.id === 'def' && looksImportedDefinition(tab.content)) {
      blocks.push(...existingSupplementBlocks(tab.content));
      continue;
    }
    blocks.push(`**已有补充：${tab.label}**\n${tab.content.trim()}`);
  }
  if (node.card?.notes?.trim()) {
    blocks.push(`**已有备注**\n${node.card.notes.trim()}`);
  }
  return uniqueBlocks(blocks).join('\n\n');
}

function preservedTabs(node) {
  return (node?.card?.tabs ?? [])
    .filter((tab) => tab.id !== 'def')
    .map((tab) => ({ ...tab }));
}

function buildDefinitionBlock(entry) {
  const lines = [
    `英文：${entry.english}`,
    `中文：${entry.chinese}`,
    '',
    entry.definition,
  ];
  const source = [];
  if (entry.sourceLine) source.push(`原始行：${entry.sourceLine}`);
  if (entry.sourceUrl) source.push(`官方锚点：${entry.sourceUrl}`);
  if (source.length) lines.push('', `来源：${source.join('；')}`);
  return lines.join('\n').trim();
}

function buildMergedDefinition(entries, node) {
  const entryBlocks = entries.map((entry) => {
    const title = labelFor(entry);
    return `**${title}**\n${buildDefinitionBlock(entry)}`;
  });
  const supplement = existingSupplement(node);
  return [entryBlocks.join('\n\n'), supplement].filter(Boolean).join('\n\n');
}

function mergeNode(nodePool, nodeId, entries) {
  const existing = nodePool[nodeId];
  const primary = entries[0];
  const nextLabel = existing?.label && !existing.tags?.includes(IMPORT_TAG)
    ? existing.label
    : labelFor(primary);
  const definition = buildMergedDefinition(entries, existing);
  const dimensions = unique([
    ...(existing?.dimensions ?? []),
    ...entries.flatMap(inferDimensions),
  ]);
  const tags = unique([...(existing?.tags ?? []), 'mysql', 'glossary', IMPORT_TAG]);

  nodePool[nodeId] = {
    ...(existing ?? {}),
    id: nodeId,
    label: nextLabel,
    role: existing?.role ?? 'plain',
    dimensions,
    tags,
    card: {
      ...(existing?.card ?? {}),
      nodeId,
      title: nextLabel,
      tabs: [
        {
          id: 'def',
          label: '定义',
          content: definition,
        },
        ...preservedTabs(existing),
      ],
      notes: existing?.card?.notes,
    },
  };
}

function upsertCategoryNode(nodePool, id, label, definition, viewDimensions) {
  const existing = nodePool[id];
  nodePool[id] = {
    ...(existing ?? {}),
    id,
    label,
    role: 'subsystem',
    dimensions: unique([...(existing?.dimensions ?? []), 'storage']),
    tags: unique([...(existing?.tags ?? []), 'mysql', 'glossary', IMPORT_TAG]),
    card: {
      ...(existing?.card ?? {}),
      nodeId: id,
      title: label,
      tabs: [
        {
          id: 'def',
          label: '定义',
          content: definition,
        },
      ],
    },
  };
  if (viewDimensions) nodePool[id].viewDimensions = viewDimensions;
}

function sectionId(section) {
  return section === '补充词条'
    ? 'mysql_glossary_section_supplement'
    : `mysql_glossary_section_${slugify(section)}`;
}

function sectionTreeId(section) {
  return `tree_${sectionId(section)}`;
}

function displaySection(section) {
  return section || '未分组';
}

function groupNodeId(groupId) {
  return `mysql_glossary_group_${groupId}`;
}

function groupTreeId(groupId) {
  return `tree_mysql_glossary_group_${groupId}`;
}

function entrySearchText(entry) {
  return `${entry.english} ${entry.chinese} ${entry.heading}`;
}

function classifyEntry(entry) {
  const text = entrySearchText(entry);
  let matched = STRUCTURE_GROUPS.filter((group) =>
    group.patterns.some((pattern) => pattern.test(text)),
  ).map((group) => group.id);

  if (matched.includes('mvcc_undo')) {
    return unique(['mvcc_undo', ...matched.filter((id) => id !== 'mvcc_undo')]);
  }
  if (matched.length > 1 && matched.includes('architecture')) {
    matched = matched.filter((id) => id !== 'architecture');
  }
  if (matched.length) return unique(matched);
  return ['misc'];
}

function primaryGroupId(entry) {
  return classifyEntry(entry)[0] ?? 'misc';
}

function treeEntry(id, name, nodeRef, children) {
  const entry = { id, name, count: 0, nodeRef };
  if (children) entry.children = children;
  return entry;
}

function findTreeNode(root, id) {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function replaceChild(root, parentId, child) {
  const parent = findTreeNode(root, parentId);
  if (!parent) throw new Error(`Tree parent not found: ${parentId}`);
  const children = parent.children ?? [];
  const index = children.findIndex((item) => item.id === child.id);
  if (index >= 0) children[index] = child;
  else children.push(child);
  parent.children = children;
}

function removeOldImportTreeEntries(root) {
  if (!root.children) return;
  root.children = root.children.filter(
    (child) =>
      child.id !== GLOSSARY_TREE_ROOT_ID &&
      !child.id.startsWith('tree_mysql_glossary_'),
  );
  for (const child of root.children) removeOldImportTreeEntries(child);
}

function parentTreeIdForGroup(groupId, tree) {
  const preferred = SUPPLEMENT_PARENT_BY_GROUP.get(groupId) ?? MYSQL_TREE_ID;
  return findTreeNode(tree, preferred) ? preferred : MYSQL_TREE_ID;
}

function supplementTreeName(group) {
  return `${group.name}（补充）`;
}

function collectTreeNodes(node) {
  return [node, ...(node.children ?? []).flatMap(collectTreeNodes)];
}

function makeTreeBindingEdge(parent, child, nodePool) {
  if (!parent.nodeRef || !child.nodeRef) return null;
  if (!nodePool[parent.nodeRef] || !nodePool[child.nodeRef]) return null;
  return {
    id: `treebind:${parent.id}:${child.id}`,
    source: parent.nodeRef,
    target: child.nodeRef,
    type: 'belongs-to',
    label: 'contains',
    dimensions: unique([
      ...(nodePool[parent.nodeRef]?.dimensions ?? []),
      ...(nodePool[child.nodeRef]?.dimensions ?? []),
    ]),
  };
}

function makeTreeBindingEdges(root, nodePool) {
  const edges = [];
  const walk = (node) => {
    for (const child of node.children ?? []) {
      const edge = makeTreeBindingEdge(node, child, nodePool);
      if (edge) edges.push(edge);
      walk(child);
    }
  };
  walk(root);
  return edges;
}

function removeOldImportEdges(edges) {
  return edges.filter((edge) => {
    if (edge.id.startsWith('mysql_glossary:')) return false;
    if (edge.id === `treebind:${MYSQL_TREE_ID}:${GLOSSARY_TREE_ROOT_ID}`) return false;
    if (edge.id.startsWith('treebind:tree_mysql_glossary')) return false;
    if (edge.id.includes(':tree_mysql_glossary')) return false;
    return true;
  });
}

function addEdge(edges, edge) {
  if (!edge) return;
  const index = edges.findIndex((item) => item.id === edge.id);
  if (index >= 0) edges[index] = edge;
  else edges.push(edge);
}

function buildGlossaryViewDimensions(
  activeGroups,
  plansByPrimaryGroup,
  plansByAllGroups,
  azSections,
  atomForPlan,
) {
  return [
    {
      id: 'mysql_glossary_structure',
      name: '知识结构',
      color: '#E58522',
      hint: '按 MySQL 知识域组织补充词条；目录、视图和节点池引用同一批知识节点。',
      sections: activeGroups.map((group) => ({
        id: `mysql_glossary_structure_${group.id}`,
        title: group.name,
        layout: 'grid',
        atoms: plansByPrimaryGroup
          .get(group.id)
          .toSorted((a, b) => a.entry.english.localeCompare(b.entry.english, 'en'))
          .map(atomForPlan),
      })),
    },
    {
      id: 'mysql_glossary_domain_matrix',
      name: '结构总览',
      color: '#4ECDC4',
      hint: '按结构域查看补充词条数量和覆盖范围。',
      sections: [
        {
          id: 'mysql_glossary_domain_matrix_main',
          title: '结构域统计',
          layout: 'matrix',
          config: {
            columns: [
              { key: 'terms', label: '主归属词条' },
              { key: 'related', label: '关联词条' },
              { key: 'scope', label: '范围' },
            ],
          },
          atoms: activeGroups.map((group) => ({
            nodeId: groupNodeId(group.id),
            attrs: {
              terms: plansByPrimaryGroup.get(group.id)?.length ?? 0,
              related: plansByAllGroups.get(group.id)?.length ?? 0,
              scope: group.desc,
            },
          })),
        },
      ],
    },
    {
      id: 'mysql_glossary_az',
      name: '英文索引',
      color: '#94A3B8',
      hint: '保留按官方英文词条首字符检索的索引视图。',
      sections: azSections,
    },
  ];
}

function mergeViewDimensions(existing, generated) {
  const generatedIds = new Set(generated.map((dimension) => dimension.id));
  return [
    ...(existing ?? []).filter((dimension) => !generatedIds.has(dimension.id)),
    ...generated,
  ];
}

function upsertMysqlGlossaryViews(nodePool, mysqlNodeId, viewDimensions) {
  const mysqlNode = nodePool[mysqlNodeId];
  if (!mysqlNode) throw new Error(`MySQL node not found: ${mysqlNodeId}`);
  mysqlNode.viewDimensions = mergeViewDimensions(mysqlNode.viewDimensions, viewDimensions);
  mysqlNode.tags = unique([...(mysqlNode.tags ?? []), 'mysql', 'glossary', IMPORT_TAG]);
}

function main() {
  if (!fs.existsSync(GLOSSARY_PATH)) {
    throw new Error(`Glossary file not found: ${GLOSSARY_PATH}`);
  }

  const nodePool = readJson(NODE_POOL_PATH);
  const tree = readJson(TREE_PATH);
  const edges = readJson(EDGES_PATH);
  const markdown = fs.readFileSync(GLOSSARY_PATH, 'utf8');
  const entries = parseGlossary(markdown);
  const existingIndex = buildExistingIndex(nodePool);

  const entryPlans = entries.map((entry) => ({
    entry,
    nodeId: resolveNodeId(entry, nodePool, existingIndex),
  }));

  const groupedByNode = new Map();
  for (const plan of entryPlans) {
    if (!groupedByNode.has(plan.nodeId)) groupedByNode.set(plan.nodeId, []);
    groupedByNode.get(plan.nodeId).push(plan.entry);
  }

  for (const [nodeId, nodeEntries] of groupedByNode.entries()) {
    mergeNode(nodePool, nodeId, nodeEntries);
  }

  const entriesBySection = new Map();
  for (const plan of entryPlans) {
    const section = displaySection(plan.entry.section);
    if (!entriesBySection.has(section)) entriesBySection.set(section, []);
    entriesBySection.get(section).push(plan);
  }

  const sortedSections = [...entriesBySection.keys()].sort((a, b) => {
    if (a === '补充词条') return 1;
    if (b === '补充词条') return -1;
    return a.localeCompare(b, 'en');
  });

  const plansByPrimaryGroup = new Map(STRUCTURE_GROUPS.map((group) => [group.id, []]));
  const plansByAllGroups = new Map(STRUCTURE_GROUPS.map((group) => [group.id, []]));

  for (const plan of entryPlans) {
    const groupIds = classifyEntry(plan.entry);
    plan.groupIds = groupIds;
    plan.primaryGroupId = groupIds[0] ?? 'misc';
    if (!plansByPrimaryGroup.has(plan.primaryGroupId)) {
      plansByPrimaryGroup.set(plan.primaryGroupId, []);
    }
    plansByPrimaryGroup.get(plan.primaryGroupId).push(plan);
    for (const groupId of groupIds) {
      if (!plansByAllGroups.has(groupId)) plansByAllGroups.set(groupId, []);
      plansByAllGroups.get(groupId).push(plan);
    }
  }

  const activeGroups = STRUCTURE_GROUPS.filter(
    (group) => (plansByPrimaryGroup.get(group.id)?.length ?? 0) > 0,
  );
  const activeGroupNodeIds = new Set(activeGroups.map((group) => groupNodeId(group.id)));

  for (const id of Object.keys(nodePool)) {
    if (id.startsWith('mysql_glossary_section_')) delete nodePool[id];
    if (id.startsWith('mysql_glossary_group_') && !activeGroupNodeIds.has(id)) {
      delete nodePool[id];
    }
  }

  const atomForPlan = ({ entry, nodeId }) => ({
    nodeId,
    desc: cleanDefinition(entry.definition).replace(/\s+/g, ' ').slice(0, 120),
  });

  const groupTrees = activeGroups.map((group) => {
    const primaryPlans = plansByPrimaryGroup
      .get(group.id)
      .toSorted((a, b) => a.entry.english.localeCompare(b.entry.english, 'en'));
    const allPlans = plansByAllGroups
      .get(group.id)
      .toSorted((a, b) => a.entry.english.localeCompare(b.entry.english, 'en'));

    upsertCategoryNode(
      nodePool,
      groupNodeId(group.id),
      group.name,
      `${group.desc}\n\n主归属词条：${primaryPlans.length} 个；关联词条：${allPlans.length} 个。`,
      [
        {
          id: `${group.id}_terms`,
          name: '结构词条',
          color: group.color,
          hint: group.desc,
          sections: [
            {
              id: `${group.id}_primary_terms`,
              title: '主归属词条',
              layout: 'grid',
              atoms: primaryPlans.map(atomForPlan),
            },
            ...(allPlans.length > primaryPlans.length
              ? [
                  {
                    id: `${group.id}_related_terms`,
                    title: '关联词条',
                    layout: 'grid',
                    atoms: allPlans
                      .filter((plan) => plan.primaryGroupId !== group.id)
                      .map(atomForPlan),
                  },
                ]
              : []),
          ],
        },
      ],
    );

    const children = primaryPlans
      .map(({ entry, nodeId }) =>
        treeEntry(
          `tree_mysql_glossary_${group.id}_${slugify(entry.english)}_${hash32(entry.english).slice(0, 6)}`,
          labelFor(entry),
          nodeId,
        ),
      );

    return treeEntry(
      groupTreeId(group.id),
      supplementTreeName(group),
      groupNodeId(group.id),
      children,
    );
  });

  const azSections = sortedSections.map((section) => ({
    id: `mysql_glossary_az_${slugify(section)}`,
    title: `索引 ${section}`,
    layout: 'grid',
    atoms: entriesBySection
      .get(section)
      .toSorted((a, b) => a.entry.english.localeCompare(b.entry.english, 'en'))
      .map(atomForPlan),
  }));

  const mysqlTree = findTreeNode(tree, MYSQL_TREE_ID);
  if (!mysqlTree?.nodeRef) throw new Error(`MySQL tree node not found: ${MYSQL_TREE_ID}`);
  delete nodePool[GLOSSARY_ROOT_ID];
  upsertMysqlGlossaryViews(
    nodePool,
    mysqlTree.nodeRef,
    buildGlossaryViewDimensions(
      activeGroups,
      plansByPrimaryGroup,
      plansByAllGroups,
      azSections,
      atomForPlan,
    ),
  );

  removeOldImportTreeEntries(tree);
  const treeInsertions = groupTrees.map((groupTree) => {
    const groupId = groupTree.id.replace(`${groupTreeId('')}`, '');
    const parentId = parentTreeIdForGroup(groupId, tree);
    replaceChild(tree, parentId, groupTree);
    return { parentId, groupTree };
  });

  const importTreeNodes = groupTrees.flatMap(collectTreeNodes);
  const importTreeNodeIds = new Set(importTreeNodes.map((node) => node.id));
  if (importTreeNodeIds.size !== importTreeNodes.length) {
    throw new Error('Duplicate tree ids generated for MySQL glossary import.');
  }

  const nextEdges = removeOldImportEdges(edges);
  for (const { parentId, groupTree } of treeInsertions) {
    const parentTree = findTreeNode(tree, parentId);
    addEdge(nextEdges, makeTreeBindingEdge(parentTree, groupTree, nodePool));
    for (const edge of makeTreeBindingEdges(groupTree, nodePool)) addEdge(nextEdges, edge);
  }

  const semanticEdges = [
    ['demo_mvcc', 'innodb_mvcc_db_trx_id', 'uses', '隐藏字段'],
    ['demo_mvcc', 'innodb_mvcc_db_roll_ptr', 'uses', '版本链指针'],
    ['demo_mvcc', 'innodb_mvcc_db_row_id', 'uses', '隐藏行 ID'],
    ['demo_mvcc', 'innodb_mvcc_purge', 'depends-on', '等待清理'],
    ['demo_myisam', 'mysql_file_myd', 'uses', '数据文件'],
    ['demo_myisam', 'mysql_file_myi', 'uses', '索引文件'],
    ['demo_innodb', 'mysql_file_ibd', 'uses', '独享表空间文件'],
    ['demo_innodb', 'mysql_file_ibdata', 'uses', '共享表空间文件'],
    ['demo_innodb', 'mysql_file_ibdata1', 'uses', '系统表空间文件'],
  ];
  for (const [source, target, type, label] of semanticEdges) {
    if (!nodePool[source] || !nodePool[target]) continue;
    addEdge(nextEdges, {
      id: `mysql_glossary:${source}:${target}`,
      source,
      target,
      type,
      label,
      dimensions: unique([
        ...(nodePool[source].dimensions ?? []),
        ...(nodePool[target].dimensions ?? []),
      ]),
    });
  }

  writeJson(NODE_POOL_PATH, nodePool);
  writeJson(TREE_PATH, tree);
  writeJson(EDGES_PATH, nextEdges);

  const createdNodeIds = [...groupedByNode.keys()].filter((id) =>
    id.startsWith('mysql_glossary_') && id !== GLOSSARY_ROOT_ID && !id.startsWith('mysql_glossary_section_'),
  );
  const reusedNodeIds = [...groupedByNode.keys()].filter((id) => !createdNodeIds.includes(id));

  console.log(
    JSON.stringify(
      {
        glossaryEntries: entries.length,
        nodeGroups: groupedByNode.size,
        createdOrStableGlossaryNodes: createdNodeIds.length,
        reusedExistingNodes: reusedNodeIds.length,
        knowledgeGroups: activeGroups.length,
        azSections: sortedSections.length,
        treeEntries: importTreeNodes.length,
        totalNodes: Object.keys(nodePool).length,
        totalEdges: nextEdges.length,
      },
      null,
      2,
    ),
  );
}

main();
