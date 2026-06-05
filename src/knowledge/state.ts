/**
 * 前端知识数据模型（带默认演示数据）
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │  nodePool: Record<id, KnowledgeNode>  ← 节点表（是什么）  │
 * │    └─ card: 定义 / 机制 / 边界 / 来源（解释卡只读这部分） │
 * ├─────────────────────────────────────────────────────────┤
 * │  knowledgeEdges: KnowledgeEdge[]  ← 边表（连着谁）       │
 * │    extract(focus, scope, dimension) → 四镜头统一出口     │
 * │    解释卡不读边表；关系网/漏斗/子系统只读边表             │
 * ├─────────────────────────────────────────────────────────┤
 * │  treeData: TreeNode  ← 仅导航                           │
 * │    ├─ 文件夹: children[], 无 nodeRef                    │
 * │    └─ 引用: nodeRef → nodePool.id                       │
 * │         supplement?: 该路径下的方言/上下文补充           │
 * └─────────────────────────────────────────────────────────┘
 */
import type {
  GraphNode,
  GraphEdge,
  KnowledgeEdge,
  KnowledgeNode,
  Perspective,
  Question,
  Rule,
  SubSystem,
  TreeNode,
  NodeExplanation,
} from '../types';

export const APP_STATE_VERSION = 2 as const;

export interface GraphSlice {
  axioms: GraphNode[];
  mechanisms: GraphNode[];
  conclusions: GraphNode[];
  edges: GraphEdge[];
}

export interface PersistedAppState {
  version: typeof APP_STATE_VERSION;
  treeData: TreeNode;
  nodePool: Record<string, KnowledgeNode>;
  knowledgeEdges: KnowledgeEdge[];
  graph: GraphSlice;
  questions: Question[];
  rules: Rule[];
  perspectives: Perspective[];
  subSystems: SubSystem[];
  inferenceResponses: Record<string, string>;
}

// 辅助函数：创建解释卡
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

// 辅助函数：创建知识节点
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

// 默认节点池数据
const DEFAULT_NODE_POOL: Record<string, KnowledgeNode> = {
  demo_sql: kn('demo_sql', 'SQL语句', [
    '结构化查询语言，用于关系型数据库的增删改查与模式定义。',
    '声明式：描述「要什么」由优化器生成执行计划。',
    '各库存在方言差异；不适用于非关系型存储。',
    'ISO/IEC 9075 · 各数据库官方文档',
  ], { shared: true, dimensions: ['transaction', 'storage'] }),

  demo_transaction: kn('demo_transaction', '事务', [
    '数据库操作的逻辑单元，满足 ACID。',
    'Redo/Undo 保证持久性与原子性；锁与 MVCC 保证隔离。',
    '长事务会放大锁与版本链压力。',
    '数据库系统概念 · SQL 标准',
  ], { role: 'axiom', dimensions: ['transaction'] }),

  demo_acid: kn('demo_acid', 'ACID', [
    '原子性、一致性、隔离性、持久性四大特性。',
    '通过 Undo/Redo Log、锁、MVCC 等机制保证。',
    '严格 ACID 可能影响性能，需权衡。',
    '事务处理概念与技术',
  ], { role: 'axiom', dimensions: ['transaction'] }),

  demo_isolation: kn('demo_isolation', '隔离级别', [
    '定义事务间隔离程度：RU / RC / RR / Serializable。',
    'InnoDB 默认 RR，结合 MVCC 与 Next-Key Lock。',
    '级别越高一致性越强，并发通常越低。',
    'SQL:1992 · MySQL 文档',
  ], { role: 'axiom', dimensions: ['transaction'] }),

  demo_mvcc: kn('demo_mvcc', 'MVCC', [
    '多版本并发控制：通过多版本实现非锁定读。',
    'Undo Log 存旧版本；Read View 定快照；可见性算法判读。',
    '需配合 purge；RC 与 RR 下 Read View 策略不同。',
    'InnoDB 实现 · 《MySQL 技术内幕》',
  ], { role: 'mechanism', dimensions: ['transaction', 'performance'] }),

  demo_undo: kn('demo_undo', 'Undo Log', [
    '存储数据行历史版本，支持回滚与一致性读。',
    '更新时旧行写入 Undo，roll_pointer 串联版本链。',
    '过长 Undo 链影响 purge 与空间。',
    'InnoDB Undo 表空间',
  ], { role: 'mechanism', dimensions: ['storage', 'transaction'] }),

  demo_vchain: kn('demo_vchain', '版本链', [
    '同一行多版本通过 roll_pointer 串成单向链表。',
    '新版本在数据页，旧版本经指针指向 Undo。',
    '链过长时遍历成本上升。',
    'InnoDB 行格式',
  ], { role: 'mechanism', dimensions: ['storage'] }),

  demo_readview: kn('demo_readview', 'Read View', [
    '快照读时的事务视图：活跃事务列表与 trx 边界。',
    '含 m_ids、min_trx_id、max_trx_id、creator_trx_id。',
    'RR 下首次 SELECT 创建；RC 下每次 SELECT 新建。',
    'read0read.cc',
  ], { role: 'mechanism', dimensions: ['transaction'] }),

  demo_visibility: kn('demo_visibility', '可见性判断', [
    '根据 Read View 与行 trx_id 判定版本是否对当前事务可见。',
    'trx_id 与 min/max/m_ids 比较决定可见/不可见/沿链找。',
    '规则随隔离级别变化。',
    'row0sel.cc',
  ], { role: 'mechanism', dimensions: ['transaction', 'performance'] }),

  demo_snapshot: kn('demo_snapshot', '快照读', [
    '普通 SELECT 读历史版本，不加锁。',
    '由 MVCC + Read View + 版本链定位可见版本。',
    '与当前读（锁定读）相对。',
    'Consistent Nonlocking Read',
  ], { role: 'conclusion', dimensions: ['performance'] }),

  demo_lock: kn('demo_lock', '锁机制', [
    '保证并发访问时的数据一致性，包括共享锁、排他锁、意向锁等。',
    'InnoDB 支持行锁、表锁、间隙锁、Next-Key Lock。',
    '锁粒度越细并发越高，但开销也越大。',
    'InnoDB 锁实现',
  ], { role: 'mechanism', dimensions: ['transaction', 'performance'] }),

  demo_btree: kn('demo_btree', 'B+树索引', [
    '平衡多路搜索树，叶子节点存储数据或指针。',
    '非叶节点只存键值和指针，所有数据在叶子层有序排列。',
    '适合范围查询，但插入删除可能引起分裂合并。',
    '数据结构与算法 · InnoDB 索引实现',
  ], { role: 'mechanism', dimensions: ['storage', 'performance'] }),

  demo_innodb: kn('demo_innodb', 'InnoDB', [
    'MySQL 默认存储引擎，支持事务、行锁、外键。',
    '聚簇索引存储，MVCC 实现高并发，Redo/Undo 保证 ACID。',
    '适合高并发读写，但内存开销较大。',
    'MySQL 官方文档',
  ], { role: 'subsystem', dimensions: ['storage', 'transaction'] }),
};

// 默认知识边数据
const DEFAULT_KNOWLEDGE_EDGES: KnowledgeEdge[] = [
  { id: 'e1', source: 'demo_transaction', target: 'demo_acid', type: 'belongs-to', label: '包含', dimensions: ['transaction'] },
  { id: 'e2', source: 'demo_transaction', target: 'demo_isolation', type: 'belongs-to', label: '属于', dimensions: ['transaction'] },
  { id: 'e3', source: 'demo_isolation', target: 'demo_mvcc', type: 'enables', label: '支撑', dimensions: ['transaction'] },
  { id: 'e4', source: 'demo_mvcc', target: 'demo_undo', type: 'needs-for', label: '需要', dimensions: ['storage'] },
  { id: 'e5', source: 'demo_undo', target: 'demo_vchain', type: 'leads-to', label: '导致', dimensions: ['storage'] },
  { id: 'e6', source: 'demo_mvcc', target: 'demo_readview', type: 'needs-for', label: '需要', dimensions: ['transaction'] },
  { id: 'e7', source: 'demo_readview', target: 'demo_visibility', type: 'leads-to', label: '导致', dimensions: ['transaction'] },
  { id: 'e8', source: 'demo_visibility', target: 'demo_snapshot', type: 'enables', label: '支撑', dimensions: ['performance'] },
  { id: 'e9', source: 'demo_vchain', target: 'demo_visibility', type: 'depends-on', label: '依赖', dimensions: ['transaction'] },
  { id: 'e10', source: 'demo_sql', target: 'demo_transaction', type: 'belongs-to', label: '属于', dimensions: ['transaction'] },
  { id: 'e11', source: 'demo_isolation', target: 'demo_lock', type: 'needs-for', label: '需要', dimensions: ['transaction'] },
  { id: 'e12', source: 'demo_innodb', target: 'demo_mvcc', type: 'belongs-to', label: '实现', dimensions: ['storage'] },
  { id: 'e13', source: 'demo_innodb', target: 'demo_btree', type: 'belongs-to', label: '使用', dimensions: ['storage'] },
];

// 默认目录树数据
const DEFAULT_TREE_DATA: TreeNode = {
  id: 'universe',
  name: '知识宇宙',
  count: 0,
  icon: '🌌',
  expanded: true,
  children: [
    {
      id: 'cs',
      name: '计算机科学',
      count: 0,
      icon: '💻',
      expanded: true,
      children: [
        {
          id: 'database',
          name: '数据库',
          count: 0,
          icon: '🗄️',
          expanded: true,
          children: [
            {
              id: 'mysql',
              name: 'MySQL',
              count: 0,
              icon: '🐬',
              expanded: true,
              children: [
                {
                  id: 'mysql_sql',
                  name: 'SQL语法',
                  count: 0,
                  icon: '📜',
                  nodeRef: 'demo_sql',
                  supplement: {
                    tabs: [{ id: 'dialect', label: 'MySQL方言', content: '分页：`LIMIT n`；标识符可用反引号；支持 `ON DUPLICATE KEY UPDATE`。' }],
                  },
                },
                {
                  id: 'mysql_engine',
                  name: '存储引擎',
                  count: 0,
                  icon: '⚙️',
                  expanded: true,
                  children: [
                    { id: 'mysql_innodb', name: 'InnoDB', count: 0, icon: '🔧', nodeRef: 'demo_innodb' },
                  ],
                },
                {
                  id: 'mysql_index',
                  name: '索引',
                  count: 0,
                  icon: '📑',
                  expanded: true,
                  children: [
                    { id: 'mysql_btree', name: 'B+树索引', count: 0, icon: '🌳', nodeRef: 'demo_btree' },
                  ],
                },
                {
                  id: 'mysql_tx',
                  name: '事务',
                  count: 0,
                  icon: '🔄',
                  expanded: true,
                  children: [
                    { id: 'mysql_acid', name: 'ACID', count: 0, icon: '⚗️', nodeRef: 'demo_acid' },
                    { id: 'mysql_iso', name: '隔离级别', count: 0, icon: '🔒', nodeRef: 'demo_isolation' },
                    {
                      id: 'mysql_mvcc',
                      name: 'MVCC',
                      count: 0,
                      icon: '👁️',
                      active: true,
                      expanded: true,
                      nodeRef: 'demo_mvcc',
                      children: [
                        { id: 'mysql_undo', name: 'Undo Log', count: 0, icon: '📝', nodeRef: 'demo_undo' },
                        { id: 'mysql_vchain', name: '版本链', count: 0, icon: '🔗', nodeRef: 'demo_vchain' },
                        { id: 'mysql_rv', name: 'Read View', count: 0, icon: '👀', nodeRef: 'demo_readview' },
                        { id: 'mysql_vis', name: '可见性判断', count: 0, icon: '🔍', nodeRef: 'demo_visibility' },
                      ],
                    },
                    { id: 'mysql_lock', name: '锁机制', count: 0, icon: '🔐', nodeRef: 'demo_lock' },
                  ],
                },
              ],
            },
            {
              id: 'pg',
              name: 'PostgreSQL',
              count: 0,
              icon: '🐘',
              expanded: false,
              children: [
                {
                  id: 'pg_sql',
                  name: 'SQL语法',
                  count: 0,
                  icon: '📜',
                  nodeRef: 'demo_sql',
                  supplement: {
                    tabs: [{ id: 'dialect', label: 'PostgreSQL方言', content: '分页：`LIMIT/OFFSET`；窗口函数更强；支持 CTE 和递归查询。' }],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function createEmptyAppState(): PersistedAppState {
  // 从 nodePool 生成初始 graph 数据
  const zoneColors: Record<string, string> = { axiom: '#8b5cf6', mechanism: '#ec4899', conclusion: '#06b6d4', subsystem: '#f59e0b', plain: '#8a98ba' };
  const zoneMap: Record<string, number> = { axiom: 0.15, mechanism: 0.40, conclusion: 0.65, subsystem: 0.75, plain: 0.50 };
  const zoneBuckets: Record<string, number> = { axiom: 0, mechanism: 0, conclusion: 0, subsystem: 0, plain: 0 };
  const nodePoolEntries = Object.entries(DEFAULT_NODE_POOL);
  const totalNodes = nodePoolEntries.length;

  nodePoolEntries.forEach(([id, kn]) => {
    const role = kn.role || 'plain';
    zoneBuckets[role] = (zoneBuckets[role] || 0) + 1;
  });

  const zoneCounters: Record<string, number> = { axiom: 0, mechanism: 0, conclusion: 0, subsystem: 0, plain: 0 };
  const graphNodes: Array<{ id: string; label: string; x: number; y: number; color: string; size: number; zone: string; phase: number; glow: boolean }> = [];

  nodePoolEntries.forEach(([id, kn]) => {
    const role = kn.role || 'plain';
    const totalInZone = zoneBuckets[role] || 1;
    const idx = zoneCounters[role]++;
    const color = zoneColors[role] || '#8a98ba';
    graphNodes.push({
      id,
      label: kn.label,
      x: 0.08 + (idx / totalInZone) * 0.84,
      y: zoneMap[role] + (Math.random() - 0.5) * 0.06,
      color,
      size: 24,
      zone: role,
      phase: Math.random() * Math.PI * 2,
      glow: role === 'mechanism',
    });
  });

  const graphEdges = DEFAULT_KNOWLEDGE_EDGES.map(ke => ({
    id: ke.id,
    source: ke.source,
    target: ke.target,
    type: ke.type,
    label: ke.label,
  }));

  return {
    version: APP_STATE_VERSION,
    treeData: DEFAULT_TREE_DATA,
    nodePool: DEFAULT_NODE_POOL,
    knowledgeEdges: DEFAULT_KNOWLEDGE_EDGES,
    graph: {
      axioms: graphNodes.filter(n => n.zone === 'axiom'),
      mechanisms: graphNodes.filter(n => n.zone === 'mechanism'),
      conclusions: graphNodes.filter(n => n.zone === 'conclusion' || n.zone === 'subsystem' || n.zone === 'plain'),
      edges: graphEdges,
    },
    questions: [
      { id: 'q1', text: '说说 MVCC 的实现原理？', answered: true },
      { id: 'q2', text: '什么是 Read View？', answered: false },
      { id: 'q3', text: 'RR 与 RC 在 MVCC 下的区别？', answered: false },
      { id: 'q4', text: 'B+树和哈希索引的区别是什么？', answered: true },
      { id: 'q5', text: 'InnoDB 的 MVCC 如何实现？', answered: false },
      { id: 'q6', text: '什么情况下会发生死锁？', answered: false },
    ],
    rules: [],
    perspectives: [],
    subSystems: [
      { id: 'sys1', name: 'MVCC 系统', color: '#8b5cf6', nodes: 5, relations: 8 },
      { id: 'sys2', name: '事务系统', color: '#ec4899', nodes: 6, relations: 10 },
      { id: 'sys3', name: '索引系统', color: '#06b6d4', nodes: 4, relations: 6 },
    ],
    inferenceResponses: {
      default: '推理引擎就绪。可在问题库添加问题，或基于图谱节点进行分析。',
      MVCC: 'MVCC 通过多版本实现非锁定读：Undo Log 存旧版本，版本链串联，Read View 定快照，可见性算法判读。',
      'Read View': 'Read View 记录活跃事务与 trx 边界；RR 仅首次 SELECT 创建，RC 每次 SELECT 新建。',
      可重复读: 'RR 下复用同一 Read View，避免不可重复读。',
    },
  };
}
