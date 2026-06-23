import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const TREE_PATH = path.join(DATA_DIR, 'tree-data.json');
const UNIVERSE_TREE_PATH = path.join(DATA_DIR, 'universe-tree.json');
const NODE_POOL_PATH = path.join(DATA_DIR, 'node-pool.json');
const EDGES_PATH = path.join(DATA_DIR, 'knowledge-edges.json');

const MYSQL_TREE_ID = 'demo_mysql';
const GLOSSARY_ROOT_ID = 'mysql_glossary_root';
const IMPORT_TAG = 'mysql-glossary';
const TREE_BINDING_EDGE_PREFIX = 'treebind:';

const TOPICS = [
  {
    id: 'architecture',
    name: '总览与体系结构',
    icon: 'A',
    desc: 'MySQL 的整体分层、实例、服务端、配置、连接入口和全局结构。',
    manualIds: ['mysql_architecture_overview', 'tree_1782029618566_mlxtmr'],
    patterns: [
      /mysql|server|instance|database|schema|data dictionary|metadata|system variable|configuration|parser|sql interface|option|online|embedded|built-in|innovation series|lts series|ga|beta|host|localhost|my\.cnf|my\.ini|loose_|port|process|thread|pthreads/i,
    ],
  },
  {
    id: 'sql_objects',
    name: 'SQL、表与数据对象',
    icon: 'S',
    desc: 'SQL 语言、表、列、行、视图、约束、存储对象、查询语句和关系模型。',
    manualIds: ['tree_1782033172539_wxvnr8', 'tree_1782033245881_cdsjoq'],
    patterns: [
      /sql|table|column|row|tuple|view|constraint|generated|stored|routine|trigger|cursor|ddl|dml|dcl|tcl|data definition language|data manipulation language|select|insert|update|delete|drop|truncate|crud|query|join|prepared statement|backticks|business rules|normalized|denormalized|relational|null|data warehouse|materialized view|temporary table|schema object|statement|list|merge|strict mode|^as$/i,
    ],
  },
  {
    id: 'storage_engines',
    name: '存储引擎',
    icon: 'E',
    desc: '存储引擎族、引擎差异以及 MyISAM、MEMORY 等非 InnoDB 引擎。',
    manualIds: [
      'tree_1782032090364_9w1h5q',
      'demo_tree_myisam',
      'demo_tree_engine_compare',
      'tree_1781976016457_xjj5mm',
    ],
    patterns: [/storage engine|myisam|archive|memory|ndb|engine/i],
  },
  {
    id: 'innodb_internals',
    name: 'InnoDB 内部结构',
    icon: 'I',
    desc: 'InnoDB 的页、表空间、缓冲、Redo、Undo、MVCC、行格式和物理文件结构。',
    manualIds: ['demo_tree_innodb', 'tree_1782029643149_9klslf'],
    patterns: [
      /innodb|mvcc|multi-?version|multiversion|read view|undo|rollback segment|db_trx_id|db_roll_ptr|db_row_id|purge|consistent read|non-locking read|snapshot|history list|version chain|tablespace|page|segment|extent|file|\.arm|\.arz|\.myd|\.myi|\.ibd|ibdata|ib_logfile|data directory|data files|system tablespace|file-per-table|space id|pid|socket|sparse file|infimum|supremum|pseudo-record|variable-length|blob|clob|sdi|serialized dictionary information|checksum|hdd|ssd|raid|buddy allocator|hole punching|disk-based|physical|compression|compressed/i,
    ],
  },
  {
    id: 'indexes_access',
    name: '索引与访问路径',
    icon: 'X',
    desc: 'B-tree、聚簇索引、二级索引、全文索引、哈希索引、键和扫描访问路径。',
    manualIds: ['demo_tree_index'],
    patterns: [
      /index|b-?tree|r-?tree|clustered|secondary|covering|fulltext|fts|hash|scan|search index|index prefix|index hint|cardinality|selectivity|primary key|foreign key|unique key|natural key|surrogate key|synthetic key|referential integrity|prefix|random dive|guid/i,
    ],
  },
  {
    id: 'transactions_locks',
    name: '事务、隔离与锁',
    icon: 'T',
    desc: 'ACID、事务生命周期、隔离级别、锁模式、死锁、读现象和并发控制。',
    manualIds: ['demo_tree_tx'],
    patterns: [
      /transaction|acid|atomic|concurrency|autocommit|commit|rollback|isolation|lock|deadlock|phantom|dirty read|non-repeatable|repeatable read|read committed|read uncommitted|serializable|savepoint|latch|mutex|rw-lock|victim|wait|read phenomena|optimistic|pessimistic|xa|auto-increment|gap|mdl|blocking/i,
    ],
  },
  {
    id: 'logs_recovery',
    name: '日志、恢复与持久化',
    icon: 'L',
    desc: 'Redo、Binlog、查询日志、检查点、刷盘、崩溃恢复和持久化保障。',
    manualIds: ['tree_1782029505240_be11k0'],
    patterns: [
      /log|redo|binary log|binlog|relay log|query log|slow query|general query|checkpoint|flush|flushing|crash|crash recovery|durability|doublewrite|restore|recovery|torn page|lsn|mtr|pitr|point-in-time/i,
    ],
  },
  {
    id: 'optimizer_performance',
    name: '优化器、缓存与性能',
    icon: 'P',
    desc: '优化器、执行计划、缓存、缓冲池、统计信息、I/O、吞吐和扩展能力。',
    manualIds: ['tree_1782033508073_oe4mt0', 'tree_1782033743159_jh8j3j'],
    patterns: [
      /optimizer|execution plan|query execution plan|cache|buffer|buffer pool|change buffer|adaptive|statistics|performance|scalability|scale up|scale out|read-ahead|warm up|workload|cost|metrics|counter|disk-bound|cpu-bound|i\/o-bound|multi-core|bottleneck|load balancing|plan stability|instrumentation|lru|eviction|midpoint insertion|fill factor|hot|young|aio|asynchronous i\/o|iops|tps|write combining|atomic instruction|spin|high-water|low-water|oltp/i,
    ],
  },
  {
    id: 'replication_ha',
    name: '复制与高可用',
    icon: 'R',
    desc: '主从/源副本、复制、组复制、集群、GTID、心跳和故障切换。',
    manualIds: [],
    patterns: [
      /replication|replica|source|slave|master|gtid|group replication|cluster|router|failover|availability|heartbeat|apply|high availability/i,
    ],
  },
  {
    id: 'connectors_api',
    name: '连接器、API 与客户端',
    icon: 'C',
    desc: 'API、Connector、JDBC、ODBC、客户端库、语言绑定和应用端集成。',
    manualIds: ['tree_1782032135569_1697f8'],
    patterns: [
      /api|connector|jdbc|odbc|client|connection|client librar|native c api|c api|perl|php|python|ruby|java|ado|\.net|visual studio|application programming interface|mono|asp\.net|servlet|tomcat|spring|assembly|ddex|dsn|gac|glassfish|j2ee|jboss|jndi|interceptor|provider|command interceptor|exception interceptor|lifecycle interceptor|statement interceptor|tcl|^c$|c#|c\+\+|eiffel/i,
    ],
  },
  {
    id: 'security_auth',
    name: '安全、账号与认证',
    icon: 'U',
    desc: '账号、权限、认证、SSL/TLS、Kerberos、票据、密钥和安全主体。',
    manualIds: [],
    patterns: [
      /security|ssl|tls|auth|password|privilege|principal|kerberos|ticket|truststore|keystore|key distribution center|kdc|user principal|service principal|spn|tgs|tgt|upn|partial trust|medium trust|grant|role/i,
    ],
  },
  {
    id: 'backup_operations',
    name: '备份、运维与诊断',
    icon: 'B',
    desc: '备份、恢复、导入导出、启动关闭、诊断、维护和管理工具。',
    manualIds: ['tree_1782032936994_e5wpwn'],
    patterns: [
      /backup|mysqlbackup|mysqldump|restore|import|export|startup|shutdown|troubleshooting|diagnostic|maintenance|hot backup|warm backup|cold backup|partial backup|full backup|raw backup|logical backup|physical backup|quiesce|bounce|compressed backup|prepared backup/i,
    ],
  },
  {
    id: 'text_spatial_charset',
    name: '全文、空间与字符处理',
    icon: 'F',
    desc: '全文检索、停用词、词干、空间数据、字符集、排序规则和 Unicode。',
    manualIds: [],
    patterns: [
      /full-?text|fulltext|fts|stopword|stemming|text collection|spatial|geometry|gis|character set|charset|collation|unicode|ansi|repertoire|relevance|document id/i,
    ],
  },
  {
    id: 'uncategorized',
    name: '待归类',
    icon: '?',
    desc: '语义不足或跨域过强的词条，保留为人工复核入口。',
    manualIds: [],
    patterns: [],
  },
];

const TOPIC_BY_ID = new Map(TOPICS.map((topic) => [topic.id, topic]));
const PRIORITY_TOPIC_IDS = [
  'backup_operations',
  'security_auth',
  'connectors_api',
  'replication_ha',
  'logs_recovery',
  'transactions_locks',
  'indexes_access',
  'innodb_internals',
  'storage_engines',
  'text_spatial_charset',
  'optimizer_performance',
  'sql_objects',
  'architecture',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonFromGit(refPath) {
  try {
    return JSON.parse(execFileSync('git', ['show', refPath], { cwd: ROOT, encoding: 'utf8' }));
  } catch {
    return null;
  }
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

function firstDefinition(node) {
  return node?.card?.tabs?.find((tab) => tab.id === 'def')?.content ?? node?.card?.tabs?.[0]?.content ?? '';
}

function extractEnglishTerms(node) {
  const content = firstDefinition(node);
  const terms = [...content.matchAll(/^英文：(.+)$/gm)].map((match) => match[1].trim());
  return terms.length ? terms : [node.label];
}

function itemText(node) {
  return unique([
    node.label,
    node.card?.title,
    ...extractEnglishTerms(node),
  ])
    .join(' ')
    .toLowerCase();
}

function classifyTerm(node) {
  const text = itemText(node);
  for (const topicId of PRIORITY_TOPIC_IDS) {
    const topic = TOPIC_BY_ID.get(topicId);
    if (topic?.patterns.some((pattern) => pattern.test(text))) return topicId;
  }
  return 'uncategorized';
}

function cloneTreeWithoutGlossaryGroups(node, overrides = {}) {
  const children = (node.children ?? [])
    .filter((child) => !child.id.startsWith('tree_mysql_glossary_group_'))
    .map((child) => cloneTreeWithoutGlossaryGroups(child));

  return {
    ...node,
    ...overrides,
    children: children.length > 0 ? children : undefined,
  };
}

function treeEntry(id, name, nodeRef, icon, children = undefined, expanded = false) {
  const entry = { id, name, count: 0, icon, nodeRef };
  if (children?.length) entry.children = children;
  if (expanded) entry.expanded = true;
  return entry;
}

function upsertNode(nodePool, id, title, desc, role = 'subsystem') {
  const existing = nodePool[id];
  nodePool[id] = {
    ...(existing ?? {}),
    id,
    label: title,
    role,
    dimensions: unique([...(existing?.dimensions ?? []), 'storage']),
    tags: unique([...(existing?.tags ?? []), 'mysql', 'directory-taxonomy']),
    card: {
      ...(existing?.card ?? {}),
      nodeId: id,
      title,
      tabs: [
        {
          id: 'def',
          label: '定义',
          content: desc,
        },
      ],
    },
  };
}

function collectGlossaryTerms(nodePool) {
  const root = nodePool[GLOSSARY_ROOT_ID];
  const az = root?.viewDimensions?.find((dim) => dim.id === 'mysql_glossary_az');
  if (!az) {
    return Object.values(nodePool)
      .filter((node) => {
        if (!(node.tags ?? []).includes(IMPORT_TAG)) return false;
        if (node.id === GLOSSARY_ROOT_ID) return false;
        if (node.id.startsWith('mysql_glossary_group_')) return false;
        if (node.id.startsWith('mysql_glossary_section_')) return false;
        if (node.id.startsWith('mysql_topic_')) return false;
        return true;
      })
      .map((node) => ({ nodeId: node.id, node }))
      .toSorted((a, b) => a.node.label.localeCompare(b.node.label, 'zh-Hans-CN'));
  }

  const orderedIds = [];
  for (const section of az.sections ?? []) {
    for (const atom of section.atoms ?? []) {
      if (!nodePool[atom.nodeId]) continue;
      if (!orderedIds.includes(atom.nodeId)) orderedIds.push(atom.nodeId);
    }
  }

  return orderedIds.map((nodeId) => ({ nodeId, node: nodePool[nodeId] }));
}

function makeManualNode(nodePool, sourceMysqlTree, id) {
  if (id === 'mysql_architecture_overview') {
    const original =
      findTreeNode(sourceMysqlTree, 'tree_1782032149182_6wye1y') ??
      findTreeNode(sourceMysqlTree, 'mysql_architecture_overview');
    if (!original) throw new Error('Missing MySQL Server overview tree node.');
    return treeEntry(id, 'MySQL Server 分层总览', original.nodeRef, 'A');
  }

  const node = findTreeNode(sourceMysqlTree, id);
  if (!node) throw new Error(`Missing manual tree node: ${id}`);
  if (node.nodeRef && !nodePool[node.nodeRef]) {
    throw new Error(`Manual tree node ${id} references missing nodePool entry ${node.nodeRef}`);
  }

  return cloneTreeWithoutGlossaryGroups(node);
}

function makeTermEntry(topic, item) {
  return treeEntry(
    `mysql_term_${topic.id}_${slugify(extractEnglishTerms(item.node)[0] ?? item.node.label)}_${hash32(item.nodeId).slice(0, 6)}`,
    item.node.label,
    item.nodeId,
    'T',
  );
}

function findTreeNodeInForest(children, id) {
  for (const child of children) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function resolveTermParentId(topic, node) {
  const text = itemText(node);

  if (topic.id === 'sql_objects') return 'tree_1782033172539_wxvnr8';
  if (topic.id === 'indexes_access') return 'demo_tree_index';
  if (topic.id === 'transactions_locks') return 'demo_tree_tx';
  if (topic.id === 'logs_recovery') return 'tree_1782029505240_be11k0';
  if (topic.id === 'connectors_api') return 'tree_1782032242238_ym9m1l';
  if (topic.id === 'backup_operations') return 'tree_1782032936994_e5wpwn';
  if (topic.id === 'storage_engines') return 'tree_1782032090364_9w1h5q';

  if (topic.id === 'innodb_internals') {
    if (/file|\.arm|\.arz|\.myd|\.myi|\.ibd|ibdata|ib_logfile|data directory|data files|pid|socket/i.test(text)) {
      return 'tree_1782029643149_9klslf';
    }
    return 'demo_tree_innodb';
  }

  if (topic.id === 'optimizer_performance') {
    if (/cache|buffer|lru|eviction|warm up|read-ahead/i.test(text)) {
      return 'tree_1782033743159_jh8j3j';
    }
    return 'tree_1782033508073_oe4mt0';
  }

  return null;
}

function makeTopicTree(nodePool, oldMysqlTree, topic, groupedTerms) {
  const topicNodeId = `mysql_topic_${topic.id}`;
  upsertNode(nodePool, topicNodeId, topic.name, topic.desc);

  const manualChildren = topic.manualIds.map((id) => makeManualNode(nodePool, oldMysqlTree, id));
  const manualRefs = new Set(collectTreeNodes(treeEntry('tmp', 'tmp', undefined, '', manualChildren)).map((node) => node.nodeRef));
  const termItems = (groupedTerms.get(topic.id) ?? [])
    .filter((item) => !manualRefs.has(item.nodeId))
    .toSorted((a, b) => a.node.label.localeCompare(b.node.label, 'zh-Hans-CN'));

  const children = [...manualChildren];
  for (const item of termItems) {
    const termEntry = makeTermEntry(topic, item);
    const parentId = resolveTermParentId(topic, item.node);
    const parent = parentId ? findTreeNodeInForest(children, parentId) : null;
    if (parent) {
      parent.children = [...(parent.children ?? []), termEntry];
      parent.expanded = true;
    } else {
      children.push(termEntry);
    }
  }

  return treeEntry(`mysql_topic_${topic.id}`, topic.name, topicNodeId, topic.icon, children, true);
}

function makeTreeBindingEdge(parent, child, nodePool) {
  if (!parent.nodeRef || !child.nodeRef) return null;
  if (!nodePool[parent.nodeRef] || !nodePool[child.nodeRef]) return null;
  if (parent.nodeRef === child.nodeRef) return null;

  return {
    id: `${TREE_BINDING_EDGE_PREFIX}${parent.id}:${child.id}`,
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

function edgeMentionsTreeId(edge, treeIds) {
  if (!edge.id.startsWith(TREE_BINDING_EDGE_PREFIX)) return false;
  const [parentTreeId, childTreeId] = edge.id.slice(TREE_BINDING_EDGE_PREFIX.length).split(':');
  return treeIds.has(parentTreeId) || treeIds.has(childTreeId);
}

function removeTreeBindingEdges(edges, oldTreeIds, nextTreeIds) {
  return edges.filter((edge) => {
    if (!edge.id.startsWith(TREE_BINDING_EDGE_PREFIX)) return true;
    if (edgeMentionsTreeId(edge, oldTreeIds)) return false;
    if (edgeMentionsTreeId(edge, nextTreeIds)) return false;
    return true;
  });
}

function assertUniqueTreeIds(root) {
  const ids = collectTreeNodes(root).map((node) => node.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    throw new Error(`Duplicate tree ids: ${[...new Set(duplicates)].join(', ')}`);
  }
}

function main() {
  const tree = readJson(TREE_PATH);
  const nodePool = readJson(NODE_POOL_PATH);
  const edges = readJson(EDGES_PATH);

  const mysqlRoot = findTreeNode(tree, MYSQL_TREE_ID);
  if (!mysqlRoot) throw new Error('MySQL tree root not found.');

  const baselineTree = readJsonFromGit(`HEAD:${path.relative(ROOT, TREE_PATH).replaceAll(path.sep, '/')}`);
  const sourceMysqlTree = findTreeNode(baselineTree ?? tree, MYSQL_TREE_ID) ?? mysqlRoot;
  const oldTreeIds = new Set(collectTreeNodes(mysqlRoot).map((node) => node.id));

  const groupedTerms = new Map(TOPICS.map((topic) => [topic.id, []]));
  for (const item of collectGlossaryTerms(nodePool)) {
    groupedTerms.get(classifyTerm(item.node)).push(item);
  }

  mysqlRoot.children = TOPICS.map((topic) => makeTopicTree(nodePool, sourceMysqlTree, topic, groupedTerms));
  mysqlRoot.expanded = true;

  assertUniqueTreeIds(tree);

  const nextTreeIds = new Set(collectTreeNodes(mysqlRoot).map((node) => node.id));
  const nextEdges = removeTreeBindingEdges(edges, oldTreeIds, nextTreeIds);
  nextEdges.push(...makeTreeBindingEdges(mysqlRoot, nodePool));

  writeJson(NODE_POOL_PATH, nodePool);
  writeJson(TREE_PATH, tree);
  writeJson(UNIVERSE_TREE_PATH, tree);
  writeJson(EDGES_PATH, nextEdges);

  console.log(
    JSON.stringify(
      {
        topics: TOPICS.map((topic) => ({
          id: topic.id,
          name: topic.name,
          terms: groupedTerms.get(topic.id)?.length ?? 0,
        })),
        treeEntries: collectTreeNodes(mysqlRoot).length,
        totalNodes: Object.keys(nodePool).length,
        totalEdges: nextEdges.length,
      },
      null,
      2,
    ),
  );
}

main();
