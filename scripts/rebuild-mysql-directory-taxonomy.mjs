import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureMysqlFunctionalTheoryReferences } from './mysql-functional-theory-references.mjs';
import {
  DEPRECATED_TAXONOMY_CONTAINER_IDS,
  TAXONOMY_CONTAINER_SPECS,
  domainMount,
} from './taxonomy-domain-placements.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const TREE_PATH = path.join(DATA_DIR, 'tree-data.json');
const NODE_POOL_PATH = path.join(DATA_DIR, 'node-pool.json');
const EDGES_PATH = path.join(DATA_DIR, 'knowledge-edges.json');

const MYSQL_TREE_ID = 'demo_mysql';
const IMPORT_TAG = 'mysql-glossary';
const TREE_BINDING_EDGE_PREFIX = 'treebind:';

const GENERATED_THEORY_NODE_PREFIXES = ['theory_domain_', 'theory_layer_', 'mysql_domain_', 'mysql_theory_'];
const GENERATED_ITEM_NODE_PREFIXES = [
  'mysql_topic_',
  'mysql_domain_',
  'mysql_theory_',
  'theory_domain_',
  'theory_layer_',
  'school_',
  'mysql_glossary_group_',
  'mysql_glossary_section_',
];

const MYSQL_IMPLEMENTATION_TOPIC_IDS = new Set([
  'mysql_topic_architecture',
  'mysql_topic_innodb_internals',
  'mysql_topic_logs_recovery',
  'mysql_topic_optimizer_performance',
  'mysql_topic_replication_ha',
  'mysql_topic_connectors_api',
  'mysql_topic_security_auth',
  'mysql_topic_backup_operations',
]);

const MYSQL_IMPLEMENTATION_TREE_IDS = new Set([
  'demo_tree_innodb',
  'demo_tree_tx',
  'demo_tree_lock',
  'demo_tree_iso',
  'demo_tree_mvcc',
  'demo_tree_engine',
  'demo_tree_myisam',
  'demo_tree_redis',
  'demo_tree_mongodb',
]);

const IMPLEMENTATION_TEXT_PATTERNS = [
  /\bmysql\b/i,
  /\binnodb\b/i,
  /\bmyisam\b/i,
  /\bmysqld\b/i,
  /\bmysqlbackup\b/i,
  /\bmysqldump\b/i,
  /\bmysqlx\b/i,
  /\bconnector\/?/i,
  /\bjdbc\b/i,
  /\bodbc\b/i,
  /\bado\.net\b/i,
  /\bc api\b/i,
  /\bperformance schema\b/i,
  /\binformation_schema\b/i,
  /\bndb\b/i,
  /\bmy\.cnf\b/i,
  /\bmy\.ini\b/i,
  /\bibdata\b/i,
  /\bib_logfile\b/i,
  /\.ibd\b/i,
  /\.myd\b/i,
  /\.myi\b/i,
  /\bdb_trx_id\b/i,
  /\bdb_roll_ptr\b/i,
  /\bdb_row_id\b/i,
  /\bread view\b/i,
  /\bundo tablespace\b/i,
  /\bdoublewrite\b/i,
  /\bchange buffer\b/i,
  /\bcaching_sha2_password\b/i,
  /mysql|innodb|myisam|存储引擎|表空间|缓冲池|变更缓冲|双写|撤销表空间|读视图|隐藏字段|数据目录|配置文件|客户端连接器|备份|运维|诊断|账号|认证|复制与高可用|日志、恢复与持久化/i,
];

const DOMAINS = [
  {
    id: 'set_theory',
    school: '数学',
    name: '集合论',
    icon: '1',
    desc: '关系模型的集合语义：关系、元组、表、模式和数据库对象的集合化表达。',
    patterns: [/\bset\b|relational model|relational|relation\b|tuple|\bschema\b|\bdatabase\b|\btable\b|primary key|关系模型|关系型|元组|表、列与行|^表$|主键/i],
  },
  {
    id: 'first_order_logic',
    school: '逻辑',
    name: '一阶谓词逻辑',
    icon: '2',
    desc: 'SQL WHERE、JOIN 条件、谓词、约束和逻辑运算的语义基础。',
    patterns: [/predicate|where|condition|logical operator|boolean|truth|filter|constraint|business rules|unique key|unique constraint|谓词|条件|逻辑|约束|业务规则|唯一键/i],
  },
  {
    id: 'relational_algebra',
    school: '数据库原理',
    name: '关系代数',
    icon: '3',
    desc: 'SQL 查询计算模型：选择、投影、连接、集合运算和查询变换。',
    patterns: [/\bjoin\b|\bselect\b|projection|\bproject\b|union|intersect|except|\bquery\b|merge|\bview\b|materialized|查询|连接|选择|投影|视图|物化视图/i],
  },
  {
    id: 'graph_theory',
    school: '数学',
    name: '图论',
    icon: '4',
    desc: 'join 图、wait-for 图、依赖图和引用完整性网络。',
    patterns: [/graph|wait-for|dependency|dependent|foreign key|referential integrity|parent table|child table|图|依赖|外键|引用完整性/i],
  },
  {
    id: 'formal_languages_automata',
    school: '计算理论',
    name: '形式语言理论 / 自动机理论',
    icon: '5',
    desc: 'SQL 文法、语法、标识符、语句类型和模式规则。',
    patterns: [/syntax|grammar|\bsql\b|sqlstate|ddl|dml|dcl|tcl|statement|identifier|backticks|strict mode|data definition language|data manipulation language|data control language|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\btruncate\b|crud|dynamic sql|语法|语句|标识符|数据定义语言|数据操纵语言|数据控制语言|截断|严格模式|预处理语句|动态/i],
  },
  {
    id: 'type_theory',
    school: '逻辑',
    name: '类型理论',
    icon: '6',
    desc: '数据类型、domain、类型边界、可变长度类型和类型转换。',
    patterns: [/data type|\btype\b|variable-length|blob|clob|\benum\b|\bdomain\b|\bcast\b|coercion|auto-increment|auto_increment|类型|生成列|虚拟列|基础列|存储生成列|可变长度|自增/i],
  },
  {
    id: 'three_valued_logic',
    school: '逻辑',
    name: '三值逻辑',
    icon: '7',
    desc: 'NULL、UNKNOWN、NOT NULL 约束和 SQL 布尔表达式的三值语义。',
    patterns: [/\bnull\b|unknown|three-valued|three valued|not null|空值|未知/i],
  },
  {
    id: 'normalization_theory',
    school: '数据库原理',
    name: '规范化理论',
    icon: '8',
    desc: '1NF 到 BCNF、规范化、反规范化、函数依赖和 schema 设计。',
    patterns: [/normal form|normalization|normalized|denormalized|functional dependency|schema design|规范化|反规范化/i],
  },
  {
    id: 'statistics',
    school: '数学',
    name: '统计学',
    icon: '9',
    desc: '直方图、ANALYZE、基数、表统计、持久统计和指标计数。',
    patterns: [/statistics|histogram|analyze|cardinality|table statistics|persistent statistics|metrics counter|\bcounter\b|统计|基数|直方图|计数器/i],
  },
  {
    id: 'probability',
    school: '数学',
    name: '概率论',
    icon: 'P',
    desc: '选择率估算、代价模型、随机探查和优化器不确定性建模。',
    patterns: [/selectivity|\bcost\b|cost model|random dive|estimate|estimation|probability|选择性|代价|随机探查|估算/i],
  },
  {
    id: 'numerical_analysis',
    school: '数学',
    name: '数值分析',
    icon: 'N',
    desc: 'DECIMAL、精度、舍入、浮点和数值表示边界。',
    patterns: [/decimal|floating|\bfloat\b|\bdouble\b|rounding|\bround\b|numeric|precision|ieee 754/i],
  },
  {
    id: 'information_theory',
    school: '数学',
    name: '信息论',
    icon: 'I',
    desc: '压缩、校验和、编码密度、页压缩和行编码。',
    patterns: [/compression|compressed|checksum|crc|encoding|encoded|row encoding|page compression|transparent page compression|压缩|校验|编码/i],
  },
  {
    id: 'queueing_theory',
    school: '数学',
    name: '排队论',
    icon: 'Q',
    desc: '连接池、线程池、吞吐、瓶颈、等待队列和负载均衡。',
    patterns: [/connection pool|thread pool|queue|throughput|bottleneck|load balancing|workload|scalability|scale out|scale up|tps|iops|队列|吞吐|瓶颈|连接池|线程池|负载均衡|工作负载|可伸缩|向外扩展|向上扩展/i],
  },
  {
    id: 'algorithms',
    school: '计算理论',
    name: '算法',
    icon: 'A',
    desc: '排序、扫描、连接算法、读预取和执行计划中的算法选择。',
    patterns: [/filesort|sort buffer|merge join|hash join|algorithm|read-ahead|\bscan\b|full table scan|table scan|query execution plan|算法|排序|扫描|预读/i],
  },
  {
    id: 'data_structures',
    school: '计算理论',
    name: '数据结构',
    icon: 'D',
    desc: 'B+ 树、哈希表、索引、LRU/LFU、列表、页目录和缓冲结构。',
    patterns: [/b\+?tree|b-tree|btree|r-tree|hash index|hash table|bloom|\bindex\b|clustered|secondary|covering|lru|lfu|\blist\b|sublist|buffer pool|change buffer|adaptive hash|page directory|free list|\bleaf\b|\btree\b|索引|b\+树|哈希|列表|页目录|缓冲池|变更缓冲区/i],
  },
  {
    id: 'compiler_principles',
    school: '程序语言',
    name: '编译原理',
    icon: 'C',
    desc: '词法/语法分析、解析器、AST、CBO 优化器和迭代器执行模型。',
    patterns: [/parser|\bparse\b|ast|optimizer|execution plan|query plan|iterator|execution model|prepared statement|statement interceptor|sql interface|解析器|优化器|执行计划/i],
  },
  {
    id: 'concurrency_theory',
    school: '系统',
    name: '并发理论',
    icon: 'L',
    desc: '锁、闩锁、互斥、读写锁、死锁检测、等待和并发控制。',
    patterns: [/\block\b|locking|latch|mutex|semaphore|deadlock|\bwait\b|concurrency|rw-lock|victim|blocking|optimistic|pessimistic|gap lock|next-key|metadata lock|auto-increment locking|shared lock|exclusive lock|锁|闩锁|互斥|死锁|等待|并发|共享锁|排他锁/i],
  },
  {
    id: 'complexity_theory',
    school: '计算理论',
    name: '计算复杂性理论',
    icon: 'X',
    desc: 'join ordering、搜索空间、启发式、复杂度和优化器取舍。',
    patterns: [/np-hard|np hard|join ordering|heuristic|search space|complexity|plan stability/i],
  },
  {
    id: 'operating_systems',
    school: '系统',
    name: '操作系统',
    icon: 'O',
    desc: '进程、线程、虚拟内存、文件系统、I/O、启动关闭和本机资源语义。',
    patterns: [/operating system|virtual memory|paging|\bthread\b|\bprocess\b|ipc|file system|filesystem|\bfile\b|\bdirectory\b|pid|hdd|ssd|\bdisk\b|i\/o|aio|nonblocking|shutdown|startup|my\.cnf|my\.ini|option file|configuration|\bpath\b|进程|线程|文件系统|文件|目录|磁盘|启动|关闭|配置/i],
  },
  {
    id: 'computer_architecture',
    school: '系统',
    name: '计算机体系结构',
    icon: 'H',
    desc: '补码、IEEE 754、CPU cache line、NUMA、多核和原子指令。',
    patterns: [/cpu|cache line|numa|ieee 754|two's complement|twos complement|\bbinary\b|multi-core|atomic instruction|\bspin\b|多核|原子|自旋/i],
  },
  {
    id: 'storage_systems',
    school: '系统',
    name: '存储系统',
    icon: 'S',
    desc: 'WAL、页、表空间、redo/undo、doublewrite buffer 和物理存储布局。',
    patterns: [/wal|\bpage\b|tablespace|doublewrite|\bredo\b|\bundo\b|\bbuffer\b|buffering|data file|space id|extent|segment|row format|\brecord\b|innodb|myisam|memory engine|storage engine|disk-based|physical|file-per-table|ibdata|ib_logfile|\.(?:arm|arz|cfg|frm|ibd|ibz|mrg|myd|myi|opt|par)\b|sdi|checkpoint|compact|dynamic|redundant|compressed|\brow\b|\bcolumn\b|temporary table|页|表空间|重做|撤销|缓冲|缓冲区|记录|段|区段|行格式|数据文件|存储引擎|紧凑|动态行|冗余|压缩|行|列|临时表/i],
  },
  {
    id: 'transaction_theory',
    school: '数据库理论',
    name: '事务理论',
    icon: 'T',
    desc: 'ACID、2PL、MVCC、可串行化、隔离级别和事务生命周期。',
    patterns: [/acid|\btransaction\b|mvcc|multiversion|multi-version|isolation|serializable|read committed|repeatable read|read uncommitted|consistent read|\bsnapshot\b|autocommit|\bcommit\b|\brollback\b|savepoint|\bxa\b|two-phase commit|\b2pl\b|read view|read phenomena|phantom|dirty read|non-repeatable|事务|隔离|提交|回滚|快照|读视图|读现象|当前读|快照读|锁定读|非锁定读|幻读|脏读|可串行化|多版本/i],
  },
  {
    id: 'recovery_theory',
    school: '数据库理论',
    name: '恢复理论',
    icon: 'R',
    desc: 'ARIES、redo/undo log、checkpoint、crash recovery、backup 和 restore。',
    patterns: [/aries|recovery|crash|redo log|undo log|binlog|binary log|relay log|query log|slow query log|general query log|checkpoint|flush|flushing|purge|\brestore\b|\bbackup\b|mysqldump|mysqlbackup|point-in-time|pitr|torn page|durability|恢复|崩溃|日志|检查点|备份|还原|刷盘|清理|持久/i],
  },
  {
    id: 'distributed_systems',
    school: '系统',
    name: '分布式系统',
    icon: 'D',
    desc: '主从复制、GTID、组复制、集群、故障切换、共识和 CAP 权衡。',
    patterns: [/replication|replica|\bsource\b|\bslave\b|\bmaster\b|gtid|paxos|consensus|\bcap\b|cluster|group replication|failover|high availability|\bavailability\b|heartbeat|distributed|router|global transaction|复制|副本|主从|集群|故障切换|高可用|可用性|分布式/i],
  },
  {
    id: 'network_protocols',
    school: '系统',
    name: '网络协议',
    icon: 'W',
    desc: 'TCP/IP、C/S 模型、连接、端口、主机、本地连接和 MySQL wire protocol。',
    patterns: [/\btcp\b|\bip\b|wire protocol|\bprotocol\b|client\/server|client-server|\bconnection\b|\bconnect\b|\bport\b|\bhost\b|localhost|\bserver\b|\bclient\b|dsn|\bsocket\b|\bnetwork\b|mysqlx|网络|网络连接|连接字符串|端口|主机|本地主机|服务器|客户端|协议|socket/i],
  },
  {
    id: 'cryptography',
    school: '安全',
    name: '密码学',
    icon: 'K',
    desc: 'caching_sha2_password、TLS、哈希、密钥、证书、Kerberos 和认证票据。',
    patterns: [/crypto|password|sha|sha2|tls|ssl|certificate|keystore|truststore|kerberos|ticket|principal|key distribution center|\bkdc\b|spn|tgs|tgt|upn|authentication|\btrust\b|密码|密钥|证书|认证|票据|主体|信任/i],
  },
  {
    id: 'access_control',
    school: '安全',
    name: '访问控制理论（RBAC）',
    icon: 'B',
    desc: 'GRANT/REVOKE、角色、权限、账户和最小权限模型。',
    patterns: [/rbac|\bgrant\b|revoke|privilege|\brole\b|\baccount\b|\buser\b|access control|least privilege|permission|权限|角色|账户|用户|授权|访问控制/i],
  },
  {
    id: 'programming_language_theory',
    school: '程序语言',
    name: '程序设计语言理论',
    icon: 'P',
    desc: '存储过程、触发器、游标、类型强制转换、API 和语言绑定。',
    patterns: [/stored program|stored routine|stored object|routine|trigger|cursor|procedure|\bfunction\b|\bapi\b|connector|jdbc|odbc|client librar|\blanguage\b|php|python|java|ruby|perl|c api|c#|c\+\+|ado|\.net|visual studio|servlet|spring|tomcat|j2ee|jndi|provider|interceptor|assembly|\bcast\b|coercion|存储程序|存储例程|存储对象|触发器|游标|接口|连接器|驱动|应用程序|语言|程序集/i],
  },
  {
    id: 'regular_expression_theory',
    school: '程序语言',
    name: '正则表达式理论',
    icon: 'E',
    desc: 'REGEXP 操作符、正则表达式语法和匹配自动机。',
    patterns: [/regexp|regular expression/i],
  },
  {
    id: 'information_retrieval',
    school: '信息检索',
    name: '信息检索理论',
    icon: 'F',
    desc: 'FULLTEXT、分词、倒排索引、BM25、相关性、停用词和词干提取。',
    patterns: [/full-?text|fulltext|\bfts\b|inverted index|\bilist\b|stopword|stemming|relevance|bm25|document id|text collection|query expansion|search index|全文|倒排|停用词|词干|相关性|文档|搜索/i],
  },
  {
    id: 'calendar_systems',
    school: '标准与约定',
    name: '历法系统（公历/格里历）',
    icon: 'G',
    desc: 'DATE、DATETIME、年/月/日边界和公历日期约定。',
    patterns: [/calendar|gregorian|\bdate\b|datetime|\byear\b|\bmonth\b|\bday\b|日期|公历/i],
  },
  {
    id: 'character_encoding_standards',
    school: '标准与约定',
    name: '字符编码标准（Unicode/UTF-8）',
    icon: 'U',
    desc: 'Unicode、UTF-8、CHAR/VARCHAR、character set 和 collation 排序规则。',
    patterns: [/unicode|utf-?8|character set|charset|collation|repertoire|\bchar\b|varchar|ascii|ansi|字符集|字符|排序规则|编码/i],
  },
  {
    id: 'timezone_standards',
    school: '标准与约定',
    name: '时区标准（IANA tzdata）',
    icon: 'Z',
    desc: 'TIMESTAMP、时区、IANA tzdata 和时间转换约定。',
    patterns: [/time zone|timezone|iana|tzdata|\btimestamp\b/i],
  },
];

const DOMAIN_BY_ID = new Map(DOMAINS.map((domain) => [domain.id, domain]));

const THEORY_DOMAIN_OVERRIDES = Object.freeze({
  k_dict_xb5t6pmm: 'normalization_theory',
  k_dict_s1u2tlxt: 'storage_systems',
});

const PRIORITY_DOMAIN_IDS = [
  'timezone_standards',
  'calendar_systems',
  'character_encoding_standards',
  'regular_expression_theory',
  'information_retrieval',
  'access_control',
  'concurrency_theory',
  'cryptography',
  'distributed_systems',
  'recovery_theory',
  'transaction_theory',
  'storage_systems',
  'data_structures',
  'statistics',
  'probability',
  'numerical_analysis',
  'information_theory',
  'queueing_theory',
  'computer_architecture',
  'network_protocols',
  'operating_systems',
  'compiler_principles',
  'formal_languages_automata',
  'type_theory',
  'three_valued_logic',
  'normalization_theory',
  'algorithms',
  'complexity_theory',
  'graph_theory',
  'relational_algebra',
  'first_order_logic',
  'set_theory',
  'programming_language_theory',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonFromGit(refPath) {
  try {
    return JSON.parse(execFileSync('git', ['show', refPath], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
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
  const terms = [...content.matchAll(/^英文[:：]\s*(.+)$/gm)].map((match) => match[1].trim());
  if (terms.length) return terms;

  const labelParts = String(node.label ?? '').split('/').map((part) => part.trim()).filter(Boolean);
  if (labelParts.length > 1) return [labelParts.at(-1)];
  return [node.label ?? node.id];
}

function itemText(node) {
  return unique([
    node.id,
    node.label,
    node.card?.title,
    ...extractEnglishTerms(node),
  ])
    .join(' ')
    .toLowerCase();
}

function isGeneratedTheoryNodeId(id) {
  return GENERATED_THEORY_NODE_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function isGeneratedItemNodeId(id) {
  return GENERATED_ITEM_NODE_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function collectMysqlTreeItems(nodePool, mysqlRoot) {
  const ids = collectTreeNodes(mysqlRoot)
    .map((node) => node.nodeRef)
    .filter((nodeId) => nodeId && nodeId !== mysqlRoot.nodeRef)
    .filter((nodeId) => nodePool[nodeId])
    .filter((nodeId) => !isGeneratedItemNodeId(nodeId));

  return ids;
}

function implementationPathRefIds(mysqlRoot) {
  const refs = new Set();
  const walk = (node, inImplementationPath) => {
    const nextInImplementationPath =
      inImplementationPath ||
      MYSQL_IMPLEMENTATION_TOPIC_IDS.has(node.id) ||
      MYSQL_IMPLEMENTATION_TREE_IDS.has(node.id);

    if (nextInImplementationPath && node.nodeRef) refs.add(node.nodeRef);
    for (const child of node.children ?? []) walk(child, nextInImplementationPath);
  };
  walk(mysqlRoot, false);
  return refs;
}

function collectTaggedGlossaryItems(nodePool) {
  return Object.values(nodePool)
    .filter((node) => (node.tags ?? []).includes(IMPORT_TAG))
    .filter((node) => !isGeneratedItemNodeId(node.id))
    .map((node) => node.id);
}

function collectKnowledgeItems(nodePool, mysqlRoot) {
  const orderedIds = [...new Set([
    ...collectMysqlTreeItems(nodePool, mysqlRoot),
    ...collectTaggedGlossaryItems(nodePool),
  ])];

  return orderedIds
    .map((nodeId) => ({ nodeId, node: nodePool[nodeId] }))
    .filter((item) => item.node?.card)
    .toSorted((a, b) => a.node.label.localeCompare(b.node.label, 'zh-Hans-CN'));
}

function isImplementationItem(item, implementationRefs) {
  if (implementationRefs.has(item.nodeId)) return true;
  const text = itemText(item.node);
  return IMPLEMENTATION_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function partitionKnowledgeItems(items, mysqlRoot) {
  const implementationRefs = implementationPathRefIds(mysqlRoot);
  const implementationItems = [];
  const theoryItems = [];

  for (const item of items) {
    if (isImplementationItem(item, implementationRefs)) implementationItems.push(item);
    else theoryItems.push(item);
  }

  return { implementationItems, theoryItems };
}

function currentMysqlTreeWasReplaced(mysqlRoot) {
  const childIds = (mysqlRoot.children ?? []).map((child) => child.id);
  return childIds.length > 0 && childIds.every((id) => id.startsWith('mysql_domain_'));
}

function mysqlTopLevelIdsChanged(mysqlRoot, baselineMysqlRoot) {
  const currentIds = (mysqlRoot.children ?? []).map((child) => child.id);
  const baselineIds = (baselineMysqlRoot?.children ?? []).map((child) => child.id);
  if (baselineIds.length === 0) return false;
  const currentWithoutAdditions = currentIds.filter((id) => baselineIds.includes(id));
  const baselineStillPresent = baselineIds.every((id) => currentIds.includes(id));
  const allowedAdditions = new Set(['mysql_topic_uncategorized']);
  const unexpectedAdditions = currentIds.filter(
    (id) => !baselineIds.includes(id) && !allowedAdditions.has(id),
  );
  return !baselineStillPresent
    || unexpectedAdditions.length > 0
    || currentWithoutAdditions.some((id, index) => id !== baselineIds[index]);
}

function restoreMissingNodePoolEntries(nodePool, sourceNodePool, treeRoot) {
  for (const treeNode of collectTreeNodes(treeRoot)) {
    if (!treeNode.nodeRef) continue;
    if (nodePool[treeNode.nodeRef]) continue;
    if (sourceNodePool?.[treeNode.nodeRef]) {
      nodePool[treeNode.nodeRef] = cloneJson(sourceNodePool[treeNode.nodeRef]);
    }
  }
}

function restoreMysqlTreeIfNeeded(tree, nodePool) {
  const mysqlRoot = findTreeNode(tree, MYSQL_TREE_ID);
  if (!mysqlRoot) throw new Error('MySQL tree root not found.');

  const baselineTree = readJsonFromGit(`HEAD:${path.relative(ROOT, TREE_PATH).replaceAll(path.sep, '/')}`);
  const baselineNodePool = readJsonFromGit(`HEAD:${path.relative(ROOT, NODE_POOL_PATH).replaceAll(path.sep, '/')}`);
  const baselineMysqlRoot = baselineTree ? findTreeNode(baselineTree, MYSQL_TREE_ID) : null;
  const shouldRestoreTree =
    currentMysqlTreeWasReplaced(mysqlRoot) ||
    mysqlTopLevelIdsChanged(mysqlRoot, baselineMysqlRoot);
  const hasMissingRefs = collectTreeNodes(mysqlRoot).some((node) => node.nodeRef && !nodePool[node.nodeRef]);
  if (!shouldRestoreTree && !hasMissingRefs) return mysqlRoot;

  if (shouldRestoreTree && !baselineMysqlRoot?.children?.length) {
    throw new Error('Cannot restore MySQL tree: baseline MySQL tree not found.');
  }

  if (shouldRestoreTree) {
    mysqlRoot.children = cloneJson(baselineMysqlRoot.children);
  }
  restoreMissingNodePoolEntries(nodePool, baselineNodePool, mysqlRoot);
  return mysqlRoot;
}

function fallbackDomainId(node) {
  const dimensions = node.dimensions ?? [];
  if (dimensions.includes('security')) return 'access_control';
  if (dimensions.includes('transaction')) return 'transaction_theory';
  if (dimensions.includes('performance')) return 'compiler_principles';
  if (dimensions.includes('storage')) return 'storage_systems';
  return 'operating_systems';
}

function classifyItem(item) {
  const override = THEORY_DOMAIN_OVERRIDES[item.nodeId];
  if (override) return override;
  const text = itemText(item.node);
  for (const domainId of PRIORITY_DOMAIN_IDS) {
    const domain = DOMAIN_BY_ID.get(domainId);
    if (domain?.patterns.some((pattern) => pattern.test(text))) return domainId;
  }
  return fallbackDomainId(item.node);
}

function treeEntry(id, name, nodeRef, children = undefined) {
  const entry = { id, name, count: 0, nodeRef };
  if (children?.length) entry.children = children;
  return entry;
}

function domainNodeId(domain) {
  return `theory_domain_${domain.id}`;
}

function termTreeId(domain, item) {
  const english = extractEnglishTerms(item.node)[0] ?? item.node.label;
  return `mysql_term_${domain.id}_${slugify(english)}_${hash32(item.nodeId).slice(0, 6)}`;
}

function canonicalDomainContent(existing, fallback) {
  const current = existing?.card?.tabs?.find((tab) => tab.id === 'def')?.content
    ?? existing?.card?.tabs?.[0]?.content
    ?? '';
  const cleaned = current
    .replace(/^独立门派：[^\n]+\n\n/, '')
    .replace(/\n\n当前归入 \d+ 个(?: MySQL)? 知识节点。?$/, '')
    .trim();
  if (!cleaned || /的理论域说明。?$/.test(cleaned)) return fallback;
  return cleaned;
}

function upsertDomainNode(nodePool, domain) {
  const id = domainNodeId(domain);
  const existing = nodePool[id];
  nodePool[id] = {
    ...(existing ?? {}),
    id,
    label: domain.name,
    role: 'subsystem',
    dimensions: unique([...(existing?.dimensions ?? []), 'storage']),
    tags: unique([...(existing?.tags ?? []), 'mysql', 'directory-taxonomy']),
    card: {
      ...(existing?.card ?? {}),
      nodeId: id,
      title: domain.name,
      tabs: [
        {
          id: 'def',
          label: '定义',
          content: canonicalDomainContent(existing, domain.desc),
        },
      ],
    },
  };
}

function upsertTheoryNode(nodePool, id, title, desc) {
  const existing = nodePool[id];
  nodePool[id] = {
    ...(existing ?? {}),
    id,
    label: title,
    role: 'subsystem',
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

function collectExistingTermEntries(root) {
  const entries = new Map();
  for (const node of collectTreeNodes(root)) {
    if (!node.id.startsWith('mysql_term_') || !node.nodeRef) continue;
    const existing = entries.get(node.nodeRef) ?? [];
    existing.push(cloneJson(node));
    entries.set(node.nodeRef, existing);
  }
  return entries;
}

function stableTermTreeEntry(domain, item, existingEntries) {
  const previous = existingEntries.get(item.nodeId) ?? [];
  if (previous.length === 0) return treeEntry(termTreeId(domain, item), item.node.label, item.nodeId);
  const first = previous[0];
  return {
    ...first,
    name: item.node.label,
    nodeRef: item.nodeId,
    children: mergeTreeChildren(...previous.map((entry) => entry.children ?? [])),
  };
}

function makeDomainTermTrees(domain, items, existingEntries) {
  return items
    .toSorted((a, b) => a.node.label.localeCompare(b.node.label, 'zh-Hans-CN'))
    .map((item) => stableTermTreeEntry(domain, item, existingEntries));
}

function makeDomainTree(nodePool, domain, items, preservedChildren = [], existingTermEntries) {
  upsertDomainNode(nodePool, domain);
  const children = mergeTreeChildren(
    preservedChildren,
    makeDomainTermTrees(domain, items, existingTermEntries),
  );

  return treeEntry(domainNodeId(domain), domain.name, domainNodeId(domain), children);
}

function mergeTreeChildren(...groups) {
  const merged = new Map();
  for (const child of groups.flat()) {
    if (!merged.has(child.id)) merged.set(child.id, child);
  }
  return [...merged.values()];
}

function deduplicateGroupedItems(grouped) {
  const seenNodeIds = new Set();
  for (const domain of DOMAINS) {
    const items = grouped.get(domain.id) ?? [];
    const deduplicatedItems = items.filter((item) => {
      if (seenNodeIds.has(item.nodeId)) return false;
      seenNodeIds.add(item.nodeId);
      return true;
    });
    grouped.set(domain.id, deduplicatedItems);
  }
}

function findTreeParent(root, childId) {
  for (const child of root.children ?? []) {
    if (child.id === childId) return root;
    const found = findTreeParent(child, childId);
    if (found) return found;
  }
  return null;
}

function detachTreeNode(root, childId) {
  if (!root.children) return null;
  const index = root.children.findIndex((child) => child.id === childId);
  if (index >= 0) return root.children.splice(index, 1)[0];
  for (const child of root.children) {
    const found = detachTreeNode(child, childId);
    if (found) return found;
  }
  return null;
}

function collectPreservedDomainChildren(root) {
  const result = new Map();
  for (const node of collectTreeNodes(root)) {
    if (!node.id.startsWith('theory_domain_')) continue;
    result.set(
      node.id,
      (node.children ?? []).map((child) => cloneJson(child)),
    );
  }
  return result;
}

function collectPreservedDirectTermChildren(root) {
  const result = new Map();
  for (const node of collectTreeNodes(root)) {
    const terms = (node.children ?? [])
      .filter((child) => child.id.startsWith('mysql_term_'))
      .map((child) => cloneJson(child));
    if (terms.length > 0) result.set(node.id, terms);
  }
  return result;
}

function removeGeneratedDomainTreeEntries(root) {
  if (!root.children) return;
  root.children = root.children.filter((child) => (
    !child.id.startsWith('theory_domain_')
    && !child.id.startsWith('mysql_term_')
    && !DEPRECATED_TAXONOMY_CONTAINER_IDS.includes(child.id)
  ));
  for (const child of root.children) removeGeneratedDomainTreeEntries(child);
}

function ensureTaxonomyContainers(tree, nodePool) {
  for (const spec of TAXONOMY_CONTAINER_SPECS) {
    const targetParent = findTreeNode(tree, spec.parentTreeId);
    if (!targetParent) throw new Error(`Taxonomy parent ${spec.parentTreeId} not found for ${spec.id}`);

    let container = findTreeNode(tree, spec.id);
    if (!container) {
      container = treeEntry(spec.id, spec.name, spec.id, []);
      targetParent.children = [...(targetParent.children ?? []), container];
    } else {
      const currentParent = findTreeParent(tree, spec.id);
      if (currentParent?.id !== targetParent.id) {
        container = detachTreeNode(tree, spec.id);
        targetParent.children = [...(targetParent.children ?? []), container];
      }
      container.name = spec.name;
      container.nodeRef = spec.id;
    }

    upsertTheoryNode(nodePool, spec.id, spec.name, spec.description);
  }
}

function insertDomainTrees(
  tree,
  nodePool,
  grouped,
  preservedDomainChildren,
  preservedDirectTermChildren,
  existingTermEntries,
) {
  deduplicateGroupedItems(grouped);

  for (const domain of DOMAINS) {
    const items = grouped.get(domain.id) ?? [];
    const mount = domainMount(domain.id);
    const parent = findTreeNode(tree, mount.parentTreeId);
    if (!parent) throw new Error(`Taxonomy mount ${mount.parentTreeId} not found for ${domain.id}`);
    const preserved = preservedDomainChildren.get(domainNodeId(domain)) ?? [];

    if (mount.direct) {
      upsertDomainNode(nodePool, domain);
      if (parent.nodeRef !== domainNodeId(domain)) {
        throw new Error(`Direct taxonomy mount ${parent.id} must reference ${domainNodeId(domain)}`);
      }
      parent.children = mergeTreeChildren(
        parent.children ?? [],
        preserved,
        preservedDirectTermChildren.get(parent.id) ?? [],
        makeDomainTermTrees(domain, items, existingTermEntries),
      );
      continue;
    }

    parent.children = mergeTreeChildren(
      parent.children ?? [],
      [makeDomainTree(nodePool, domain, items, preserved, existingTermEntries)],
    );
  }
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
    relationKind: 'structure',
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

  const mysqlRoot = restoreMysqlTreeIfNeeded(tree, nodePool);
  const items = collectKnowledgeItems(nodePool, mysqlRoot);
  const { implementationItems, theoryItems } = partitionKnowledgeItems(items, mysqlRoot);
  const grouped = new Map(DOMAINS.map((domain) => [domain.id, []]));
  for (const item of theoryItems) grouped.get(classifyItem(item)).push(item);
  const functionalReferences = ensureMysqlFunctionalTheoryReferences({
    tree,
    nodePool,
    theoryItems,
  });

  const preservedDomainChildren = collectPreservedDomainChildren(tree);
  const preservedDirectTermChildren = collectPreservedDirectTermChildren(tree);
  const existingTermEntries = collectExistingTermEntries(tree);
  removeGeneratedDomainTreeEntries(tree);
  ensureTaxonomyContainers(tree, nodePool);
  insertDomainTrees(
    tree,
    nodePool,
    grouped,
    preservedDomainChildren,
    preservedDirectTermChildren,
    existingTermEntries,
  );

  assertUniqueTreeIds(tree);

  const nextEdges = edges.filter((edge) => !edge.id.startsWith(TREE_BINDING_EDGE_PREFIX));
  nextEdges.push(...makeTreeBindingEdges(tree, nodePool));

  writeJson(NODE_POOL_PATH, nodePool);
  writeJson(TREE_PATH, tree);
  writeJson(EDGES_PATH, nextEdges);

  console.log(
    JSON.stringify(
      {
        domains: DOMAINS.map((domain) => ({
          id: domain.id,
          school: domain.school,
          name: domain.name,
          items: grouped.get(domain.id)?.length ?? 0,
        })),
        knowledgeItems: items.length,
        implementationItems: implementationItems.length,
        theoryItems: theoryItems.length,
        functionalTheoryReferencesAdded: functionalReferences.referencesAdded,
        unmappedFunctionalTheoryReferences: functionalReferences.unmappedNodeIds,
        mysqlTreeEntries: collectTreeNodes(mysqlRoot).length,
        taxonomyDomainEntries: DOMAINS.reduce((sum, domain) => (
          sum + (grouped.get(domain.id)?.length ?? 0) + 1
        ), 0),
        totalNodes: Object.keys(nodePool).length,
        totalEdges: nextEdges.length,
      },
      null,
      2,
    ),
  );
}

main();
