import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const NODE_POOL_PATH = path.join(DATA_DIR, 'node-pool.json');
const TREE_PATH = path.join(DATA_DIR, 'tree-data.json');
const EDGES_PATH = path.join(DATA_DIR, 'knowledge-edges.json');

const MYSQL_TREE_ID = 'demo_mysql';
const GLOSSARY_ROOT_ID = 'mysql_glossary_root';
const GLOSSARY_TREE_ROOT_ID = 'tree_mysql_glossary_root';
const IMPORT_TAG = 'mysql-glossary';

const STRUCTURE_GROUPS = [
  {
    id: 'storage_engines',
    name: '存储引擎',
    color: '#00AA90',
    desc: 'InnoDB、MyISAM、NDB、ARCHIVE、MEMORY 以及存储引擎行为差异。',
    patterns: [/innodb|myisam|storage engine|archive|memory|ndb|engine|row format|compact|dynamic|compressed|redundant/i],
  },
  {
    id: 'mvcc_undo',
    name: 'InnoDB MVCC 与 Undo',
    color: '#7C83FD',
    desc: 'MVCC、Read View、Undo、回滚段、隐藏字段、版本链和 purge。',
    patterns: [/mvcc|multi-?version|multiversion|read view|undo|rollback segment|db_trx_id|db_roll_ptr|db_row_id|purge|consistent read|non-locking read|snapshot|history list/i],
  },
  {
    id: 'transactions_locks',
    name: '事务、隔离与锁',
    color: '#FF6B6B',
    desc: 'ACID、事务、提交回滚、隔离级别、锁、死锁和读现象。',
    patterns: [/transaction|acid|atomic|autocommit|commit|rollback|isolation|lock|deadlock|phantom|dirty read|non-repeatable|repeatable read|read committed|read uncommitted|serializable|savepoint|latch|mutex|rw-lock|victim|wait|concurrency|read phenomena|optimistic|pessimistic|xa|auto-increment/i],
  },
  {
    id: 'indexes_access',
    name: '索引与访问路径',
    color: '#B481BB',
    desc: 'B-tree、聚集索引、二级索引、覆盖索引、全文索引、哈希索引和扫描路径。',
    patterns: [/index|b-?tree|r-tree|clustered|secondary|covering|fulltext|fts|hash|scan|search index|index prefix|index hint|cardinality|selectivity|primary key|foreign key|unique key|natural key|surrogate key|synthetic key|generated invisible primary key|referential integrity|prefix/i],
  },
  {
    id: 'tablespaces_files',
    name: '表空间、页与文件',
    color: '#4ECDC4',
    desc: '表空间、页、段、数据目录、数据文件、InnoDB 与 MyISAM 文件形态。',
    patterns: [/tablespace|page|segment|extent|file|\.arm|\.arz|\.myd|\.myi|\.ibd|ibdata|ib_logfile|data directory|data files|system tablespace|file-per-table|space id|pid|socket|sparse file|infimum record|supremum record|pseudo-record|variable-length type|blob|clob|sdi|serialized dictionary information|checksum|hdd|ssd|raid/i],
  },
  {
    id: 'logs_recovery',
    name: '日志、恢复与持久化',
    color: '#F59E0B',
    desc: 'Redo、Binlog、查询日志、检查点、刷盘、崩溃恢复和持久化。',
    patterns: [/log|redo|binary log|binlog|relay log|query log|slow query|general query|checkpoint|flush|flushing|crash|crash recovery|durability|doublewrite|restore|recovery|torn page|lsn|mtr/i],
  },
  {
    id: 'sql_objects',
    name: 'SQL、表与数据对象',
    color: '#58B2DC',
    desc: 'SQL 语言、表、列、行、视图、约束、存储对象和生成列。',
    patterns: [/sql|table|column|row|tuple|view|constraint|generated column|stored|routine|trigger|cursor|ddl|dml|dcl|schema|database|delete|insert|truncate|base column|virtual column|temporary table|query|join|prepared statement|strict mode|business rules|normalized|denormalized|relational|null|crud|backticks/i],
  },
  {
    id: 'optimizer_performance',
    name: '优化器、缓存与性能',
    color: '#45B7D1',
    desc: '优化器、执行计划、缓存、缓冲池、自适应机制、统计信息和可扩展性。',
    patterns: [/optimizer|execution plan|query execution plan|cache|buffer|buffer pool|change buffer|adaptive|statistics|performance|scalability|scale up|scale out|read-ahead|warm up|workload|cost|random dive|metrics counter|disk-bound|cpu-bound|i\/o-bound|multi-core|bottleneck|load balancing|plan stability|counter|instrumentation|lru|eviction|midpoint insertion|fill factor|hot|young|asynchronous i\/o|aio|iops|tps|write combining|atomic instruction|spin/i],
  },
  {
    id: 'replication_ha',
    name: '复制与高可用',
    color: '#EC4899',
    desc: '源/副本、复制、组复制、集群、路由和故障切换。',
    patterns: [/replication|replica|source|slave|master|gtid|group replication|cluster|router|failover|relay|availability|heartbeat|apply/i],
  },
  {
    id: 'connectors_api',
    name: '连接器、API 与客户端',
    color: '#22C55E',
    desc: 'API、Connector、JDBC、ODBC、客户端库和语言绑定。',
    patterns: [/api|connector|jdbc|odbc|client librar|native c api|c api|perl|php|python|ruby|java|ado|\.net|visual studio|application programming interface|mono|asp\.net|servlet|tomcat|spring|assembly|ddex|dsn|gac|glassfish|j2ee|jboss|jndi|interceptor|provider|command interceptor|exception interceptor|lifecycle interceptor|statement interceptor|tcl|c#|c\+\+|eiffel/i],
  },
  {
    id: 'security_auth',
    name: '安全、账号与认证',
    color: '#F97316',
    desc: '账号、权限、认证、SSL/TLS、Kerberos、票据和安全主体。',
    patterns: [/security|ssl|tls|auth|password|privilege|principal|kerberos|ticket|truststore|keystore|key distribution center|kdc|user principal|service principal|spn|tgs|tgt|upn|partial trust|medium trust/i],
  },
  {
    id: 'backup_operations',
    name: '备份、运维与诊断',
    color: '#94A3B8',
    desc: '备份、恢复、导入导出、启动关闭、诊断和维护工具。',
    patterns: [/backup|mysqlbackup|mysqldump|restore|import|export|startup|shutdown|troubleshooting|diagnostic|maintenance|hot backup|warm backup|cold backup|partial backup|full backup|raw backup|logical backup|physical backup|quiesce|bounce/i],
  },
  {
    id: 'architecture',
    name: 'MySQL 总览与体系结构',
    color: '#E58522',
    desc: '实例、服务端、客户端连接、配置、数据字典和整体架构概念。',
    patterns: [/mysql|server|instance|data dictionary|metadata|connection|client|thread|process|port|option file|option|system variable|configuration|parser|sql interface|localhost|host|my\.cnf|my\.ini|loose_|innovation series|lts series|ga|beta|built-in|embedded|online/i],
  },
  {
    id: 'text_spatial_charset',
    name: '全文、空间与字符处理',
    color: '#A855F7',
    desc: '全文检索、停用词、词干、空间数据、字符集、排序规则和 Unicode。',
    patterns: [/full-?text|stopword|stemming|text collection|spatial|geometry|gis|character set|charset|collation|unicode|ansi|repertoire|relevance|document id/i],
  },
  {
    id: 'misc',
    name: '补充与其他概念',
    color: '#64748B',
    desc: '不易归入单一主结构域的补充词条。',
    patterns: [],
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || hash32(value);
}

function hash32(value) {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function groupNodeId(groupId) {
  return `mysql_glossary_group_${groupId}`;
}

function groupTreeId(groupId) {
  return `tree_mysql_glossary_group_${groupId}`;
}

function firstDefinition(node) {
  return node?.card?.tabs?.find((tab) => tab.id === 'def')?.content ?? node?.card?.tabs?.[0]?.content ?? '';
}

function extractEnglishTerms(node) {
  const content = firstDefinition(node);
  const terms = [...content.matchAll(/^英文：(.+)$/gm)].map((match) => match[1].trim());
  return terms.length ? terms : [node.label];
}

function atomDesc(node) {
  return firstDefinition(node)
    .replace(/\*\*.+?\*\*/g, '')
    .replace(/^英文：.+$/gm, '')
    .replace(/^中文：.+$/gm, '')
    .replace(/^来源：.+$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function classifyNode(node) {
  const text = unique([node.label, node.card?.title, ...extractEnglishTerms(node)])
    .join(' ')
    .toLowerCase();
  const matched = STRUCTURE_GROUPS.filter((group) =>
    group.patterns.some((pattern) => pattern.test(text)),
  ).map((group) => group.id);

  if (matched.includes('mvcc_undo')) return 'mvcc_undo';
  if (matched.includes('tablespaces_files')) return 'tablespaces_files';
  if (matched.includes('logs_recovery')) return 'logs_recovery';
  if (matched.includes('transactions_locks')) return 'transactions_locks';
  if (matched.includes('indexes_access')) return 'indexes_access';
  if (matched.includes('storage_engines')) return 'storage_engines';
  if (matched.includes('sql_objects')) return 'sql_objects';
  if (matched.includes('optimizer_performance')) return 'optimizer_performance';
  if (matched.includes('replication_ha')) return 'replication_ha';
  if (matched.includes('connectors_api')) return 'connectors_api';
  if (matched.includes('security_auth')) return 'security_auth';
  if (matched.includes('backup_operations')) return 'backup_operations';
  if (matched.includes('text_spatial_charset')) return 'text_spatial_charset';
  if (matched.includes('architecture')) return 'architecture';
  return 'misc';
}

function treeEntry(id, name, nodeRef, icon, children, expanded = false) {
  const entry = { id, name, count: 0, icon, nodeRef };
  if (children) entry.children = children;
  if (expanded) entry.expanded = true;
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
  parent.expanded = true;
}

function collectTreeNodes(node) {
  return [node, ...(node.children ?? []).flatMap(collectTreeNodes)];
}

function collectGlossaryTerms(nodePool) {
  const root = nodePool[GLOSSARY_ROOT_ID];
  const az = root?.viewDimensions?.find((dim) => dim.id === 'mysql_glossary_az');
  if (!az) throw new Error('MySQL glossary AZ view not found. Run the glossary import first.');

  const orderedIds = [];
  for (const section of az.sections ?? []) {
    for (const atom of section.atoms ?? []) {
      if (!nodePool[atom.nodeId]) continue;
      if (!orderedIds.includes(atom.nodeId)) orderedIds.push(atom.nodeId);
    }
  }
  return orderedIds.map((nodeId) => ({ nodeId, node: nodePool[nodeId] }));
}

function makeAtom(item) {
  return {
    nodeId: item.nodeId,
    desc: atomDesc(item.node),
  };
}

function upsertGroupNode(nodePool, group, items) {
  const id = groupNodeId(group.id);
  const existing = nodePool[id];
  nodePool[id] = {
    ...(existing ?? {}),
    id,
    label: group.name,
    role: 'subsystem',
    dimensions: unique([...(existing?.dimensions ?? []), 'storage']),
    tags: unique([...(existing?.tags ?? []), 'mysql', 'glossary', IMPORT_TAG]),
    card: {
      ...(existing?.card ?? {}),
      nodeId: id,
      title: group.name,
      tabs: [
        {
          id: 'def',
          label: '定义',
          content: `${group.desc}\n\n该结构域当前收录 ${items.length} 个 MySQL 词汇节点；每个词条的完整解释统一保存在对应节点的“定义”页签中。`,
        },
      ],
    },
    viewDimensions: [
      {
        id: `${group.id}_terms`,
        name: '结构词条',
        color: group.color,
        hint: group.desc,
        sections: [
          {
            id: `${group.id}_terms_grid`,
            title: group.name,
            layout: 'grid',
            atoms: items.map(makeAtom),
          },
          {
            id: `${group.id}_terms_matrix`,
            title: `${group.name} · 中英索引`,
            layout: 'matrix',
            config: {
              columns: [
                { key: 'english', label: '英文' },
                { key: 'role', label: '角色' },
                { key: 'dimensions', label: '视角' },
              ],
            },
            atoms: items.map((item) => ({
              nodeId: item.nodeId,
              attrs: {
                english: extractEnglishTerms(item.node).join(' / '),
                role: item.node.role ?? 'plain',
                dimensions: (item.node.dimensions ?? []).join(', '),
              },
            })),
          },
        ],
      },
    ],
  };
}

function upsertRootNode(nodePool, groupsWithItems, azSections) {
  const root = nodePool[GLOSSARY_ROOT_ID];
  if (!root) throw new Error('MySQL glossary root node missing.');

  nodePool[GLOSSARY_ROOT_ID] = {
    ...root,
    label: 'MySQL 词汇表 / MySQL Glossary',
    role: 'subsystem',
    dimensions: unique([...(root.dimensions ?? []), 'storage', 'transaction', 'performance']),
    tags: unique([...(root.tags ?? []), 'mysql', 'glossary', IMPORT_TAG]),
    card: {
      ...root.card,
      title: 'MySQL 词汇表 / MySQL Glossary',
      tabs: [
        {
          id: 'def',
          label: '定义',
          content: `MySQL 中英双语概念词汇表。当前按知识结构组织 ${groupsWithItems.reduce((sum, item) => sum + item.items.length, 0)} 个唯一知识节点，同时保留英文索引视图用于快速检索；每个词条的解释内容统一放在对应节点的“定义”页签中。`,
        },
      ],
    },
    viewDimensions: [
      {
        id: 'mysql_glossary_structure',
        name: '知识结构',
        color: '#E58522',
        hint: '按 MySQL 知识域组织词条；目录、视图和节点池引用同一批知识节点。',
        sections: groupsWithItems.map(({ group, items }) => ({
          id: `mysql_glossary_structure_${group.id}`,
          title: group.name,
          layout: 'grid',
          atoms: items.map(makeAtom),
        })),
      },
      {
        id: 'mysql_glossary_domain_matrix',
        name: '结构总览',
        color: '#4ECDC4',
        hint: '按结构域查看词条数量和覆盖范围。',
        sections: [
          {
            id: 'mysql_glossary_domain_matrix_main',
            title: '结构域统计',
            layout: 'matrix',
            config: {
              columns: [
                { key: 'terms', label: '词条' },
                { key: 'scope', label: '范围' },
              ],
            },
            atoms: groupsWithItems.map(({ group, items }) => ({
              nodeId: groupNodeId(group.id),
              attrs: {
                terms: items.length,
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
    ],
  };
}

function consolidateTabsIntoDefinition(nodePool, id, title) {
  const node = nodePool[id];
  if (!node?.card?.tabs?.length) return;
  const blocks = [];
  for (const tab of node.card.tabs) {
    const content = String(tab.content ?? '').trim();
    if (!content) continue;
    blocks.push(tab.id === 'def' ? content : `**${tab.label}**\n${content}`);
  }
  nodePool[id] = {
    ...node,
    label: title,
    card: {
      ...node.card,
      title,
      tabs: [
        {
          id: 'def',
          label: '定义',
          content: blocks.join('\n\n'),
        },
      ],
    },
  };
}

function applyCanonicalNodeLabels(nodePool) {
  consolidateTabsIntoDefinition(nodePool, 'demo_mvcc', 'MVCC');
  consolidateTabsIntoDefinition(nodePool, 'demo_myisam', 'MyISAM');
  consolidateTabsIntoDefinition(nodePool, 'k_1781002610469_nik1ek', 'Page');
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

function addEdge(edges, edge) {
  if (!edge) return;
  const index = edges.findIndex((item) => item.id === edge.id);
  if (index >= 0) edges[index] = edge;
  else edges.push(edge);
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

function makeAzSections(nodePool, items) {
  const sections = new Map();
  for (const item of items) {
    const english = extractEnglishTerms(item.node)[0] ?? item.node.label;
    const first = /^[A-Z0-9#]/i.test(english[0] ?? '') ? english[0].toUpperCase() : '#';
    if (!sections.has(first)) sections.set(first, []);
    sections.get(first).push(item);
  }
  return [...sections.entries()]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b, 'en')))
    .map(([section, sectionItems]) => ({
      id: `mysql_glossary_az_${slugify(section)}`,
      title: `索引 ${section}`,
      layout: 'grid',
      atoms: sectionItems
        .toSorted((a, b) =>
          extractEnglishTerms(a.node)[0].localeCompare(extractEnglishTerms(b.node)[0], 'en'),
        )
        .map(makeAtom),
    }));
}

function main() {
  const nodePool = readJson(NODE_POOL_PATH);
  const tree = readJson(TREE_PATH);
  const edges = readJson(EDGES_PATH);

  applyCanonicalNodeLabels(nodePool);
  const terms = collectGlossaryTerms(nodePool);
  const grouped = new Map(STRUCTURE_GROUPS.map((group) => [group.id, []]));
  for (const item of terms) {
    const groupId = classifyNode(item.node);
    grouped.get(groupId).push(item);
  }

  const groupsWithItems = STRUCTURE_GROUPS
    .map((group) => ({
      group,
      items: (grouped.get(group.id) ?? []).toSorted((a, b) =>
        a.node.label.localeCompare(b.node.label, 'zh-Hans-CN'),
      ),
    }))
    .filter(({ items }) => items.length > 0);

  const activeGroupIds = new Set(groupsWithItems.map(({ group }) => groupNodeId(group.id)));
  for (const id of Object.keys(nodePool)) {
    if (id.startsWith('mysql_glossary_group_') && !activeGroupIds.has(id)) delete nodePool[id];
    if (id.startsWith('mysql_glossary_section_')) delete nodePool[id];
  }

  for (const { group, items } of groupsWithItems) {
    upsertGroupNode(nodePool, group, items);
  }

  const azSections = makeAzSections(nodePool, terms);
  upsertRootNode(nodePool, groupsWithItems, azSections);
  applyCanonicalNodeLabels(nodePool);

  const groupTrees = groupsWithItems.map(({ group, items }) =>
    treeEntry(
      groupTreeId(group.id),
      group.name,
      groupNodeId(group.id),
      'K',
      items.map((item) =>
        treeEntry(
          `tree_mysql_glossary_${group.id}_${slugify(extractEnglishTerms(item.node)[0] ?? item.node.label)}_${hash32(item.nodeId).slice(0, 6)}`,
          item.node.label,
          item.nodeId,
          'T',
        ),
      ),
    ),
  );

  const glossaryTree = treeEntry(
    GLOSSARY_TREE_ROOT_ID,
    'MySQL 词汇表（知识结构）',
    GLOSSARY_ROOT_ID,
    'G',
    groupTrees,
    true,
  );

  replaceChild(tree, MYSQL_TREE_ID, glossaryTree);

  const importTreeNodes = collectTreeNodes(glossaryTree);
  const nextEdges = removeOldImportEdges(edges);
  const mysqlTree = findTreeNode(tree, MYSQL_TREE_ID);
  addEdge(nextEdges, makeTreeBindingEdge(mysqlTree, glossaryTree, nodePool));
  for (const edge of makeTreeBindingEdges(glossaryTree, nodePool)) addEdge(nextEdges, edge);

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

  console.log(
    JSON.stringify(
      {
        terms: terms.length,
        groups: groupsWithItems.map(({ group, items }) => ({ id: group.id, name: group.name, count: items.length })),
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
