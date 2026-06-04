/**
 * 演示用模拟数据（可选加载，不覆盖已有用户数据）
 * 展示：节点池 + 边表 + 目录引用 + 多路径 SQL + MVCC 推理链
 */
import type { KnowledgeEdge, KnowledgeNode, NodeExplanation, TreeNode } from '../types';
import { createEmptyAppState, type PersistedAppState } from './state';

function card(
  nodeId: string,
  title: string,
  contents: [string, string, string, string],
  notes?: string,
): NodeExplanation {
  const labels = ['定义', '机制', '边界', '来源'] as const;
  const ids = ['def', 'mech', 'bound', 'source'] as const;
  return {
    nodeId,
    title,
    notes,
    tabs: labels.map((label, i) => ({
      id: ids[i],
      label,
      content: contents[i],
    })),
  };
}

function kn(
  id: string,
  label: string,
  contents: [string, string, string, string],
  opts?: {
    shared?: boolean;
    role?: KnowledgeNode['role'];
    dimensions?: string[];
    notes?: string;
  },
): KnowledgeNode {
  return {
    id,
    label,
    shared: opts?.shared,
    role: opts?.role,
    dimensions: opts?.dimensions,
    card: card(id, label, contents, opts?.notes),
  };
}

const DEMO_IDS = {
  sql: 'demo_sql',
  mvcc: 'demo_mvcc',
  readview: 'demo_readview',
  undo: 'demo_undo',
  vchain: 'demo_vchain',
  visibility: 'demo_visibility',
  transaction: 'demo_transaction',
  isolation: 'demo_isolation',
  snapshot: 'demo_snapshot',
  undoSys: 'demo_undo_sys',
  vchainSys: 'demo_vchain_sys',
  // 新增节点
  acid: 'demo_acid',
  lock: 'demo_lock',
  deadlock: 'demo_deadlock',
  btree: 'demo_btree',
  hash: 'demo_hash',
  innodb: 'demo_innodb',
  myisam: 'demo_myisam',
  redolog: 'demo_redolog',
  binlog: 'demo_binlog',
  buffer: 'demo_buffer',
  query: 'demo_query',
  join: 'demo_join',
  subquery: 'demo_subquery',
  postgres: 'demo_postgres',
  redis: 'demo_redis',
  mongodb: 'demo_mongodb',
} as const;

export const DEMO_NODE_POOL: Record<string, KnowledgeNode> = {
  [DEMO_IDS.sql]: kn(
    DEMO_IDS.sql,
    'SQL语句',
    [
      '结构化查询语言，用于关系型数据库的增删改查与模式定义。',
      '声明式：描述「要什么」由优化器生成执行计划。',
      '各库存在方言差异；不适用于非关系型存储。',
      'ISO/IEC 9075 · 各数据库官方文档',
    ],
    { shared: true, dimensions: ['transaction', 'storage'] },
  ),
  [DEMO_IDS.transaction]: kn(
    DEMO_IDS.transaction,
    '事务',
    [
      '数据库操作的逻辑单元，满足 ACID。',
      'Redo/Undo 保证持久性与原子性；锁与 MVCC 保证隔离。',
      '长事务会放大锁与版本链压力。',
      '数据库系统概念 · SQL 标准',
    ],
    { role: 'axiom', dimensions: ['transaction'] },
  ),
  [DEMO_IDS.isolation]: kn(
    DEMO_IDS.isolation,
    '隔离级别',
    [
      '定义事务间隔离程度：RU / RC / RR / Serializable。',
      'InnoDB 默认 RR，结合 MVCC 与 Next-Key Lock。',
      '级别越高一致性越强，并发通常越低。',
      'SQL:1992 · MySQL 文档',
    ],
    { role: 'axiom', dimensions: ['transaction'] },
  ),
  [DEMO_IDS.mvcc]: kn(
    DEMO_IDS.mvcc,
    'MVCC',
    [
      '多版本并发控制：通过多版本实现非锁定读。',
      'Undo Log 存旧版本；Read View 定快照；可见性算法判读。',
      '需配合 purge；RC 与 RR 下 Read View 策略不同。',
      'InnoDB 实现 · 《MySQL 技术内幕》',
    ],
    { role: 'mechanism', dimensions: ['transaction', 'performance'] },
  ),
  [DEMO_IDS.undo]: kn(
    DEMO_IDS.undo,
    'Undo Log',
    [
      '存储数据行历史版本，支持回滚与一致性读。',
      '更新时旧行写入 Undo，roll_pointer 串联版本链。',
      '过长 Undo 链影响 purge 与空间。',
      'InnoDB Undo 表空间',
    ],
    { role: 'mechanism', dimensions: ['storage', 'transaction'] },
  ),
  [DEMO_IDS.vchain]: kn(
    DEMO_IDS.vchain,
    '版本链',
    [
      '同一行多版本通过 roll_pointer 串成单向链表。',
      '新版本在数据页，旧版本经指针指向 Undo。',
      '链过长时遍历成本上升。',
      'InnoDB 行格式',
    ],
    { role: 'mechanism', dimensions: ['storage'] },
  ),
  [DEMO_IDS.readview]: kn(
    DEMO_IDS.readview,
    'Read View',
    [
      '快照读时的事务视图：活跃事务列表与 trx 边界。',
      '含 m_ids、min_trx_id、max_trx_id、creator_trx_id。',
      'RR 下首次 SELECT 创建；RC 下每次 SELECT 新建。',
      'read0read.cc',
    ],
    { role: 'mechanism', dimensions: ['transaction'] },
  ),
  [DEMO_IDS.visibility]: kn(
    DEMO_IDS.visibility,
    '可见性判断',
    [
      '根据 Read View 与行 trx_id 判定版本是否对当前事务可见。',
      'trx_id 与 min/max/m_ids 比较决定可见/不可见/沿链找。',
      '规则随隔离级别变化。',
      'row0sel.cc',
    ],
    { role: 'mechanism', dimensions: ['transaction', 'performance'] },
  ),
  [DEMO_IDS.snapshot]: kn(
    DEMO_IDS.snapshot,
    '快照读',
    [
      '普通 SELECT 读历史版本，不加锁。',
      '由 MVCC + Read View + 版本链定位可见版本。',
      '与当前读（锁定读）相对。',
      'Consistent Nonlocking Read',
    ],
    { role: 'conclusion', dimensions: ['performance'] },
  ),
  [DEMO_IDS.undoSys]: kn(
    DEMO_IDS.undoSys,
    'Undo Log 子系统',
    [
      'InnoDB 中负责 Undo 写入、回滚段与 purge 协同的子模块集合。',
      '与事务提交顺序、purge 线程交互。',
      'Undo 表空间满会导致阻塞。',
      'InnoDB 内部模块',
    ],
    { role: 'subsystem', dimensions: ['storage'] },
  ),
  [DEMO_IDS.vchainSys]: kn(
    DEMO_IDS.vchainSys,
    '版本链子系统',
    [
      '维护行级版本链构建、遍历与清理的模块边界。',
      '与 Undo、Read View、可见性规则耦合。',
      '—',
      'InnoDB',
    ],
    { role: 'subsystem', dimensions: ['storage', 'transaction'] },
  ),
  // 新增节点
  [DEMO_IDS.acid]: kn(
    DEMO_IDS.acid,
    'ACID',
    [
      '原子性、一致性、隔离性、持久性四大特性。',
      '通过 Undo/Redo Log、锁、MVCC 等机制保证。',
      '严格 ACID 可能影响性能，需权衡。',
      '事务处理概念与技术',
    ],
    { role: 'axiom', dimensions: ['transaction'] },
  ),
  [DEMO_IDS.lock]: kn(
    DEMO_IDS.lock,
    '锁机制',
    [
      '保证并发访问时的数据一致性，包括共享锁、排他锁、意向锁等。',
      'InnoDB 支持行锁、表锁、间隙锁、Next-Key Lock。',
      '锁粒度越细并发越高，但开销也越大。',
      'InnoDB 锁实现',
    ],
    { role: 'mechanism', dimensions: ['transaction', 'performance'] },
  ),
  [DEMO_IDS.deadlock]: kn(
    DEMO_IDS.deadlock,
    '死锁检测',
    [
      '多个事务循环等待对方持有的锁导致死锁。',
      'InnoDB 使用等待图算法检测死锁，并回滚代价最小的事务。',
      '合理的事务顺序和索引设计可减少死锁。',
      'InnoDB 死锁检测算法',
    ],
    { role: 'mechanism', dimensions: ['transaction'] },
  ),
  [DEMO_IDS.btree]: kn(
    DEMO_IDS.btree,
    'B+树索引',
    [
      '平衡多路搜索树，叶子节点存储数据或指针。',
      '非叶节点只存键值和指针，所有数据在叶子层有序排列。',
      '适合范围查询，但插入删除可能引起分裂合并。',
      '数据结构与算法 · InnoDB 索引实现',
    ],
    { role: 'mechanism', dimensions: ['storage', 'performance'] },
  ),
  [DEMO_IDS.hash]: kn(
    DEMO_IDS.hash,
    '哈希索引',
    [
      '通过哈希函数将键映射到存储位置。',
      'O(1) 等值查询，但不支持范围查询和排序。',
      'InnoDB 自适应哈希索引，Memory 引擎支持显式创建。',
      'MySQL 索引类型',
    ],
    { role: 'mechanism', dimensions: ['storage', 'performance'] },
  ),
  [DEMO_IDS.innodb]: kn(
    DEMO_IDS.innodb,
    'InnoDB',
    [
      'MySQL 默认存储引擎，支持事务、行锁、外键。',
      '聚簇索引存储，MVCC 实现高并发，Redo/Undo 保证 ACID。',
      '适合高并发读写，但内存开销较大。',
      'MySQL 官方文档',
    ],
    { role: 'subsystem', dimensions: ['storage', 'transaction'] },
  ),
  [DEMO_IDS.myisam]: kn(
    DEMO_IDS.myisam,
    'MyISAM',
    [
      'MySQL 早期默认引擎，不支持事务和外键。',
      '表级锁，非聚簇索引，查询速度快但并发差。',
      '适合只读或少写场景，已逐渐被 InnoDB 替代。',
      'MySQL 官方文档',
    ],
    { role: 'subsystem', dimensions: ['storage'] },
  ),
  [DEMO_IDS.redolog]: kn(
    DEMO_IDS.redolog,
    'Redo Log',
    [
      '重做日志，记录物理修改操作，保证持久性。',
      'WAL（Write-Ahead Logging）机制，先写日志再写磁盘。',
      '循环写入，checkpoint 机制控制刷盘。',
      'InnoDB Redo Log',
    ],
    { role: 'mechanism', dimensions: ['storage', 'transaction'] },
  ),
  [DEMO_IDS.binlog]: kn(
    DEMO_IDS.binlog,
    'Binlog',
    [
      '二进制日志，记录逻辑 SQL 操作，用于复制和恢复。',
      '三种格式：Statement、Row、Mixed。',
      'Server 层实现，所有引擎共享。',
      'MySQL 复制机制',
    ],
    { role: 'mechanism', dimensions: ['storage'] },
  ),
  [DEMO_IDS.buffer]: kn(
    DEMO_IDS.buffer,
    'Buffer Pool',
    [
      'InnoDB 内存缓冲区，缓存数据页和索引页。',
      'LRU 算法管理页面置换，预读机制提升性能。',
      '大小影响命中率，需根据负载调优。',
      'InnoDB Buffer Pool',
    ],
    { role: 'mechanism', dimensions: ['storage', 'performance'] },
  ),
  [DEMO_IDS.query]: kn(
    DEMO_IDS.query,
    '查询优化',
    [
      '通过索引、执行计划、统计信息等提升查询性能。',
      '优化器基于成本模型选择最优执行路径。',
      '需结合 EXPLAIN 分析和索引设计。',
      'MySQL 查询优化',
    ],
    { role: 'conclusion', dimensions: ['performance'] },
  ),
  [DEMO_IDS.join]: kn(
    DEMO_IDS.join,
    'JOIN 连接',
    [
      '多表查询，包括内连接、外连接、交叉连接。',
      '嵌套循环、哈希连接、排序合并等算法。',
      '小表驱动大表，合理使用索引。',
      'SQL 标准 · MySQL JOIN',
    ],
    { shared: true, dimensions: ['transaction', 'performance'] },
  ),
  [DEMO_IDS.subquery]: kn(
    DEMO_IDS.subquery,
    '子查询',
    [
      '嵌套在其他查询中的查询，包括标量、行、表子查询。',
      '关联子查询和非关联子查询，优化器可能改写为 JOIN。',
      '某些情况性能不佳，可考虑改写。',
      'SQL 子查询优化',
    ],
    { dimensions: ['performance'] },
  ),
  [DEMO_IDS.postgres]: kn(
    DEMO_IDS.postgres,
    'PostgreSQL',
    [
      '开源对象关系型数据库，功能强大，扩展性好。',
      '支持复杂数据类型、全文检索、JSON、窗口函数等。',
      'MVCC 实现与 MySQL 不同，使用 VACUUM 清理。',
      'PostgreSQL 官方文档',
    ],
    { role: 'subsystem', dimensions: ['storage', 'transaction'] },
  ),
  [DEMO_IDS.redis]: kn(
    DEMO_IDS.redis,
    'Redis',
    [
      '内存键值数据库，支持多种数据结构。',
      '单线程模型，通过 IO 多路复用实现高性能。',
      '适合缓存、会话、排行榜等场景。',
      'Redis 官方文档',
    ],
    { role: 'subsystem', dimensions: ['storage', 'performance'] },
  ),
  [DEMO_IDS.mongodb]: kn(
    DEMO_IDS.mongodb,
    'MongoDB',
    [
      '面向文档的 NoSQL 数据库，数据以 JSON 格式存储。',
      '灵活的 Schema，支持复制集和分片。',
      '适合非结构化数据和快速迭代。',
      'MongoDB 官方文档',
    ],
    { role: 'subsystem', dimensions: ['storage'] },
  ),
};

export const DEMO_KNOWLEDGE_EDGES: KnowledgeEdge[] = [
  { id: 'demo_e1', source: DEMO_IDS.transaction, target: DEMO_IDS.isolation, type: 'belongs-to', label: '属于', dimensions: ['transaction'] },
  { id: 'demo_e2', source: DEMO_IDS.isolation, target: DEMO_IDS.mvcc, type: 'enables', label: '支撑', dimensions: ['transaction'] },
  { id: 'demo_e3', source: DEMO_IDS.mvcc, target: DEMO_IDS.undo, type: 'needs-for', label: '需要', dimensions: ['storage'] },
  { id: 'demo_e4', source: DEMO_IDS.undo, target: DEMO_IDS.vchain, type: 'leads-to', label: '导致', dimensions: ['storage'] },
  { id: 'demo_e5', source: DEMO_IDS.mvcc, target: DEMO_IDS.readview, type: 'needs-for', label: '需要', dimensions: ['transaction'] },
  { id: 'demo_e6', source: DEMO_IDS.readview, target: DEMO_IDS.visibility, type: 'leads-to', label: '导致', dimensions: ['transaction'] },
  { id: 'demo_e7', source: DEMO_IDS.visibility, target: DEMO_IDS.snapshot, type: 'enables', label: '支撑', dimensions: ['performance'] },
  { id: 'demo_e8', source: DEMO_IDS.vchain, target: DEMO_IDS.visibility, type: 'depends-on', label: '依赖', dimensions: ['transaction'] },
  { id: 'demo_e9', source: DEMO_IDS.undoSys, target: DEMO_IDS.undo, type: 'belongs-to', label: '属于', dimensions: ['storage'] },
  { id: 'demo_e10', source: DEMO_IDS.vchainSys, target: DEMO_IDS.vchain, type: 'belongs-to', label: '属于', dimensions: ['storage'] },
  { id: 'demo_e11', source: DEMO_IDS.mvcc, target: DEMO_IDS.undoSys, type: 'depends-on', label: '依赖', dimensions: ['storage', 'transaction'] },
  { id: 'demo_e12', source: DEMO_IDS.mvcc, target: DEMO_IDS.vchainSys, type: 'depends-on', label: '依赖', dimensions: ['storage'] },
  { id: 'demo_e13', source: DEMO_IDS.sql, target: DEMO_IDS.transaction, type: 'belongs-to', label: '属于', dimensions: ['transaction'] },
  // 新增边
  { id: 'demo_e14', source: DEMO_IDS.transaction, target: DEMO_IDS.acid, type: 'belongs-to', label: '属于', dimensions: ['transaction'] },
  { id: 'demo_e15', source: DEMO_IDS.acid, target: DEMO_IDS.redolog, type: 'needs-for', label: '需要', dimensions: ['storage'] },
  { id: 'demo_e16', source: DEMO_IDS.acid, target: DEMO_IDS.undo, type: 'needs-for', label: '需要', dimensions: ['storage'] },
  { id: 'demo_e17', source: DEMO_IDS.isolation, target: DEMO_IDS.lock, type: 'needs-for', label: '需要', dimensions: ['transaction'] },
  { id: 'demo_e18', source: DEMO_IDS.lock, target: DEMO_IDS.deadlock, type: 'leads-to', label: '可能导致', dimensions: ['transaction'] },
  { id: 'demo_e19', source: DEMO_IDS.innodb, target: DEMO_IDS.mvcc, type: 'belongs-to', label: '实现', dimensions: ['storage'] },
  { id: 'demo_e20', source: DEMO_IDS.innodb, target: DEMO_IDS.btree, type: 'belongs-to', label: '使用', dimensions: ['storage'] },
  { id: 'demo_e21', source: DEMO_IDS.innodb, target: DEMO_IDS.buffer, type: 'belongs-to', label: '包含', dimensions: ['storage'] },
  { id: 'demo_e22', source: DEMO_IDS.btree, target: DEMO_IDS.query, type: 'enables', label: '支撑', dimensions: ['performance'] },
  { id: 'demo_e23', source: DEMO_IDS.hash, target: DEMO_IDS.query, type: 'enables', label: '支撑', dimensions: ['performance'] },
  { id: 'demo_e24', source: DEMO_IDS.sql, target: DEMO_IDS.join, type: 'belongs-to', label: '包含', dimensions: ['transaction'] },
  { id: 'demo_e25', source: DEMO_IDS.sql, target: DEMO_IDS.subquery, type: 'belongs-to', label: '包含', dimensions: ['transaction'] },
  { id: 'demo_e26', source: DEMO_IDS.binlog, target: DEMO_IDS.redolog, type: 'depends-on', label: '协同', dimensions: ['storage'] },
  { id: 'demo_e27', source: DEMO_IDS.buffer, target: DEMO_IDS.query, type: 'enables', label: '加速', dimensions: ['performance'] },
  { id: 'demo_e28', source: DEMO_IDS.postgres, target: DEMO_IDS.mvcc, type: 'belongs-to', label: '实现', dimensions: ['storage'] },
];

export const DEMO_TREE: TreeNode = {
  id: 'universe',
  name: '知识宇宙',
  count: 0,
  icon: '🌌',
  expanded: true,
  children: [
    {
      id: 'demo_cs',
      name: '计算机科学',
      count: 0,
      icon: '💻',
      expanded: true,
      children: [
        {
          id: 'demo_db',
          name: '数据库',
          count: 0,
          icon: '🗄️',
          expanded: true,
          children: [
            {
              id: 'demo_mysql',
              name: 'MySQL',
              count: 0,
              icon: '🐬',
              expanded: true,
              children: [
                {
                  id: 'demo_tree_sql_mysql',
                  name: 'SQL语法',
                  count: 0,
                  icon: '📜',
                  nodeRef: DEMO_IDS.sql,
                  supplement: {
                    tabs: [{ id: 'dialect', label: 'MySQL方言', content: '分页：`LIMIT n`；标识符可用反引号；支持 `ON DUPLICATE KEY UPDATE`。' }],
                  },
                },
                {
                  id: 'demo_tree_engine',
                  name: '存储引擎',
                  count: 0,
                  icon: '⚙️',
                  expanded: true,
                  children: [
                    { id: 'demo_tree_innodb', name: 'InnoDB', count: 0, icon: '🔧', nodeRef: DEMO_IDS.innodb },
                    { id: 'demo_tree_myisam', name: 'MyISAM', count: 0, icon: '📦', nodeRef: DEMO_IDS.myisam },
                  ],
                },
                {
                  id: 'demo_tree_index',
                  name: '索引',
                  count: 0,
                  icon: '📑',
                  expanded: true,
                  children: [
                    { id: 'demo_tree_btree', name: 'B+树索引', count: 0, icon: '🌳', nodeRef: DEMO_IDS.btree },
                    { id: 'demo_tree_hash', name: '哈希索引', count: 0, icon: '#️⃣', nodeRef: DEMO_IDS.hash },
                  ],
                },
                {
                  id: 'demo_tree_tx',
                  name: '事务',
                  count: 0,
                  icon: '🔄',
                  expanded: true,
                  children: [
                    {
                      id: 'demo_tree_acid',
                      name: 'ACID',
                      count: 0,
                      icon: '⚗️',
                      nodeRef: DEMO_IDS.acid,
                    },
                    {
                      id: 'demo_tree_iso',
                      name: '隔离级别',
                      count: 0,
                      icon: '🔒',
                      nodeRef: DEMO_IDS.isolation,
                    },
                    {
                      id: 'demo_tree_mvcc',
                      name: 'MVCC',
                      count: 0,
                      icon: '👁️',
                      active: true,
                      expanded: true,
                      nodeRef: DEMO_IDS.mvcc,
                      children: [
                        { id: 'demo_tree_undo', name: 'Undo Log', count: 0, icon: '📝', nodeRef: DEMO_IDS.undo },
                        { id: 'demo_tree_vchain', name: '版本链', count: 0, icon: '🔗', nodeRef: DEMO_IDS.vchain },
                        { id: 'demo_tree_rv', name: 'Read View', count: 0, icon: '👀', nodeRef: DEMO_IDS.readview },
                        { id: 'demo_tree_vis', name: '可见性判断', count: 0, icon: '🔍', nodeRef: DEMO_IDS.visibility },
                      ],
                    },
                    { id: 'demo_tree_lock', name: '锁机制', count: 0, icon: '🔐', nodeRef: DEMO_IDS.lock },
                    { id: 'demo_tree_deadlock', name: '死锁检测', count: 0, icon: '💀', nodeRef: DEMO_IDS.deadlock },
                  ],
                },
                {
                  id: 'demo_tree_log',
                  name: '日志系统',
                  count: 0,
                  icon: '📋',
                  expanded: true,
                  children: [
                    { id: 'demo_tree_redolog', name: 'Redo Log', count: 0, icon: '♻️', nodeRef: DEMO_IDS.redolog },
                    { id: 'demo_tree_binlog', name: 'Binlog', count: 0, icon: '📄', nodeRef: DEMO_IDS.binlog },
                    { id: 'demo_tree_undo2', name: 'Undo Log', count: 0, icon: '⏪', nodeRef: DEMO_IDS.undo },
                  ],
                },
                {
                  id: 'demo_tree_perf',
                  name: '性能优化',
                  count: 0,
                  icon: '🚀',
                  expanded: false,
                  children: [
                    { id: 'demo_tree_buffer', name: 'Buffer Pool', count: 0, icon: '💾', nodeRef: DEMO_IDS.buffer },
                    { id: 'demo_tree_query', name: '查询优化', count: 0, icon: '⚡', nodeRef: DEMO_IDS.query },
                    { id: 'demo_tree_join', name: 'JOIN 优化', count: 0, icon: '🔗', nodeRef: DEMO_IDS.join },
                  ],
                },
              ],
            },
            {
              id: 'demo_pg',
              name: 'PostgreSQL',
              count: 0,
              icon: '🐘',
              expanded: true,
              children: [
                {
                  id: 'demo_tree_sql_pg',
                  name: 'SQL语法',
                  count: 0,
                  icon: '📜',
                  nodeRef: DEMO_IDS.sql,
                  supplement: {
                    tabs: [{ id: 'dialect', label: 'PostgreSQL方言', content: '分页：`LIMIT/OFFSET`；窗口函数更强；支持 CTE 和递归查询；RETURNING 子句。' }],
                  },
                },
                {
                  id: 'demo_tree_pg_mvcc',
                  name: 'MVCC 实现',
                  count: 0,
                  icon: '👁️',
                  nodeRef: DEMO_IDS.postgres,
                  supplement: {
                    tabs: [{ id: 'mvcc', label: 'PG MVCC', content: 'PostgreSQL 使用 VACUUM 清理旧版本，与 MySQL 的 purge 机制不同。' }],
                  },
                },
                {
                  id: 'demo_tree_pg_join',
                  name: 'JOIN 连接',
                  count: 0,
                  icon: '🔗',
                  nodeRef: DEMO_IDS.join,
                },
              ],
            },
            {
              id: 'demo_nosql',
              name: 'NoSQL',
              count: 0,
              icon: '🔥',
              expanded: false,
              children: [
                { id: 'demo_tree_redis', name: 'Redis', count: 0, icon: '⚡', nodeRef: DEMO_IDS.redis },
                { id: 'demo_tree_mongodb', name: 'MongoDB', count: 0, icon: '🍃', nodeRef: DEMO_IDS.mongodb },
              ],
            },
          ],
        },
        {
          id: 'demo_algo',
          name: '算法与数据结构',
          count: 0,
          icon: '🧮',
          expanded: false,
          children: [
            {
              id: 'demo_tree_struct',
              name: '数据结构',
              count: 0,
              icon: '📊',
              children: [
                { id: 'demo_tree_btree_algo', name: 'B+树', count: 0, icon: '🌳', nodeRef: DEMO_IDS.btree },
                { id: 'demo_tree_hash_algo', name: '哈希表', count: 0, icon: '#️⃣', nodeRef: DEMO_IDS.hash },
              ],
            },
          ],
        },
      ],
    },
  ],
};

/** 画布区演示节点（B 区漏斗可视化，与边表并行） */
function demoGraphSlice(): PersistedAppState['graph'] {
  const mk = (
    id: string,
    label: string,
    zone: 'axiom' | 'mechanism' | 'conclusion',
    x: number,
    y: number,
  ) => ({
    id,
    label,
    x,
    y,
    color: zone === 'axiom' ? '#8b5cf6' : zone === 'mechanism' ? '#ec4899' : '#06b6d4',
    size: zone === 'axiom' ? 38 : 34,
    zone,
    phase: 0,
    glow: id === 'g_mvcc',
    description: label,
  });

  const axioms = [
    mk('g_version', '版本', 'axiom', 0.28, 0.12),
    mk('g_transaction', '事务', 'axiom', 0.5, 0.1),
    mk('g_isolation', '隔离级别', 'axiom', 0.72, 0.12),
  ];
  const mechanisms = [
    mk('g_mvcc', 'MVCC', 'mechanism', 0.5, 0.32),
    mk('g_vchain', '版本链', 'mechanism', 0.32, 0.38),
    mk('g_vis', '可见性判断', 'mechanism', 0.68, 0.36),
    mk('g_readview', 'Read View', 'mechanism', 0.5, 0.42),
  ];
  const conclusions = [
    mk('g_snapshot', '快照读', 'conclusion', 0.35, 0.58),
    mk('g_highconc', '高并发', 'conclusion', 0.65, 0.56),
  ];

  return {
    axioms,
    mechanisms,
    conclusions,
    edges: [
      { id: 'g_e1', source: 'g_transaction', target: 'g_mvcc', type: 'belongs-to', label: '属于' },
      { id: 'g_e2', source: 'g_isolation', target: 'g_readview', type: 'belongs-to', label: '属于' },
      { id: 'g_e3', source: 'g_version', target: 'g_vchain', type: 'belongs-to', label: '属于' },
      { id: 'g_e4', source: 'g_mvcc', target: 'g_vchain', type: 'needs-for', label: '需要' },
      { id: 'g_e5', source: 'g_readview', target: 'g_vis', type: 'leads-to', label: '导致' },
      { id: 'g_e6', source: 'g_vis', target: 'g_snapshot', type: 'enables', label: '支撑' },
      { id: 'g_e7', source: 'g_mvcc', target: 'g_highconc', type: 'enables', label: '支撑' },
    ],
  };
}

export function createDemoAppState(): PersistedAppState {
  const base = createEmptyAppState();
  return {
    ...base,
    treeData: DEMO_TREE,
    nodePool: { ...DEMO_NODE_POOL },
    knowledgeEdges: [...DEMO_KNOWLEDGE_EDGES],
    graph: demoGraphSlice(),
    questions: [
      { id: 'demo_q1', text: '说说 MVCC 的实现原理？', answered: true },
      { id: 'demo_q2', text: '什么是 Read View？', answered: false },
      { id: 'demo_q3', text: 'RR 与 RC 在 MVCC 下的区别？', answered: false },
      { id: 'demo_q4', text: 'B+树和哈希索引的区别是什么？', answered: true },
      { id: 'demo_q5', text: 'InnoDB 和 MyISAM 有什么不同？', answered: true },
      { id: 'demo_q6', text: '什么情况下会发生死锁？', answered: false },
      { id: 'demo_q7', text: 'Redo Log 和 Binlog 的区别？', answered: false },
      { id: 'demo_q8', text: 'Buffer Pool 的 LRU 算法如何工作？', answered: false },
      { id: 'demo_q9', text: '如何优化慢查询？', answered: true },
      { id: 'demo_q10', text: 'JOIN 的执行算法有哪些？', answered: false },
      { id: 'demo_q11', text: 'PostgreSQL 的 MVCC 和 MySQL 有什么不同？', answered: false },
      { id: 'demo_q12', text: 'Redis 为什么这么快？', answered: true },
    ],
    inferenceResponses: {
      ...base.inferenceResponses,
      MVCC:
        'MVCC 通过多版本实现非锁定读：Undo Log 存旧版本，版本链串联，Read View 定快照，可见性算法判读。',
      'Read View':
        'Read View 记录活跃事务与 trx 边界；RR 仅首次 SELECT 创建，RC 每次 SELECT 新建。',
      可重复读: 'RR 下复用同一 Read View，避免不可重复读。',
      'B+树': 'B+树叶子节点存储所有数据，支持范围查询；哈希索引只支持等值查询。',
      InnoDB: 'InnoDB 支持事务、行锁、外键，适合高并发；MyISAM 不支持事务，表锁，适合只读场景。',
      死锁: '多个事务循环等待对方持有的锁时发生死锁，InnoDB 会自动检测并回滚代价最小的事务。',
    },
    subSystems: [
      { id: 'sys1', name: 'MVCC 系统', color: '#8b5cf6', nodes: 5, relations: 8 },
      { id: 'sys2', name: '事务系统', color: '#ec4899', nodes: 6, relations: 10 },
      { id: 'sys3', name: '索引系统', color: '#06b6d4', nodes: 4, relations: 6 },
      { id: 'sys4', name: '日志系统', color: '#f59e0b', nodes: 3, relations: 4 },
      { id: 'sys5', name: '存储引擎', color: '#10b981', nodes: 2, relations: 5 },
    ],
  };
}

export function isAppStateEmpty(state: PersistedAppState): boolean {
  return (
    Object.keys(state.nodePool).length === 0 &&
    state.knowledgeEdges.length === 0 &&
    state.graph.axioms.length === 0
  );
}
