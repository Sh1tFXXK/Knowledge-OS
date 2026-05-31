// Knowledge OS - Mock Data (migrated from js/data.js)
import type {
  TreeNode,
  Perspective,
  GraphNode,
  GraphEdge,
  Rule,
  SubSystem,
  InferenceEngine,
  NodeExplanation,
  Question,
  Coordinates,
} from './types';

// ============================================================
// Universe Tree
// ============================================================
export const universeTree: TreeNode = {
  id: 'universe',
  name: 'Universe',
  count: 128523,
  icon: '🌌',
  expanded: true,
  children: [
    {
      id: 'cs',
      name: 'Computer Science',
      count: 48651,
      icon: '💻',
      expanded: true,
      children: [
        {
          id: 'backend',
          name: 'Backend',
          count: 24510,
          icon: '⚙️',
          expanded: true,
          children: [
            {
              id: 'database',
              name: 'Database',
              count: 8742,
              icon: '🗄️',
              expanded: true,
              children: [
                {
                  id: 'mysql',
                  name: 'MySQL',
                  count: 1263,
                  icon: '🐬',
                  expanded: true,
                  children: [
                    { id: 'mysql-base', name: '基础概念', count: 33, icon: '📘' },
                    { id: 'mysql-storage', name: '存储引擎', count: 98, icon: '💾' },
                    { id: 'mysql-index', name: '索引', count: 156, icon: '📑' },
                    {
                      id: 'mysql-tx',
                      name: '事务',
                      count: 87,
                      icon: '🔄',
                      expanded: true,
                      children: [
                        { id: 'acid', name: 'ACID', count: 15, icon: '⚗️' },
                        { id: 'isolation', name: '隔离级别', count: 24, icon: '🔒' },
                        {
                          id: 'mvcc',
                          name: 'MVCC',
                          count: 18,
                          icon: '👁️',
                          active: true,
                          expanded: true,
                          children: [
                            { id: 'undo-log', name: 'Undo Log', count: 10, icon: '📝' },
                            { id: 'version-chain', name: '版本链', count: 8, icon: '🔗' },
                            { id: 'read-view', name: 'Read View', count: 12, icon: '👀' },
                            { id: 'visibility', name: '可见性判断', count: 64, icon: '🔍' },
                          ],
                        },
                        { id: 'lock', name: '锁机制', count: 45, icon: '🔐' },
                        { id: 'deadlock', name: '死锁检测', count: 24, icon: '💀' },
                      ],
                    },
                    { id: 'mysql-repl', name: '主从复制', count: 67, icon: '📡' },
                    { id: 'mysql-opt', name: '查询优化', count: 89, icon: '🚀' },
                  ],
                },
                { id: 'postgresql', name: 'PostgreSQL', count: 921, icon: '🐘' },
                { id: 'redis', name: 'Redis', count: 198, icon: '🔴' },
                { id: 'mongodb', name: 'MongoDB', count: 166, icon: '🍃' },
              ],
            },
            { id: 'distributed', name: 'Distributed System', count: 1674, icon: '🌐' },
            { id: 'devops', name: 'DevOps', count: 2163, icon: '🔧' },
          ],
        },
        { id: 'frontend', name: 'Frontend', count: 12890, icon: '🎨' },
        { id: 'network', name: 'Network', count: 2159, icon: '📶' },
      ],
    },
    { id: 'ai', name: 'AI & Machine Learning', count: 4231, icon: '🤖' },
    { id: 'math', name: 'Math & Science', count: 6480, icon: '📐' },
    { id: 'humanities', name: 'Humanities', count: 1362, icon: '📚' },
  ],
};

// ============================================================
// Perspectives
// ============================================================
export const perspectives: Perspective[] = [
  { id: 'tx', name: '事务视角', nameEn: 'Transaction', color: '#ff6b6b', description: '18个节点' },
  { id: 'storage', name: '存储视角', nameEn: 'Storage', color: '#4ecdc4', description: '22个节点' },
  { id: 'perf', name: '性能视角', nameEn: 'Performance', color: '#45b7d1', description: '16个节点' },
  { id: 'arch', name: '架构视角', nameEn: 'Architecture', color: '#96ceb4', description: '28个节点' },
  { id: 'sec', name: '安全视角', nameEn: 'Security', color: '#feca57', description: '12个节点' },
  { id: 'ops', name: '运维视角', nameEn: 'Operation', color: '#ff9ff3', description: '19个节点' },
  { id: 'src', name: '源码视角', nameEn: 'Source Code', color: '#54a0ff', description: '31个节点' },
  { id: 'evo', name: '演化视角', nameEn: 'Evolution', color: '#5f27cd', description: '37个节点' },
];

// ============================================================
// Knowledge Graph Nodes (by zone)
// ============================================================
const axioms: GraphNode[] = [
  { id: 'n-version', label: '版本', x: 0.30, y: 0.12, color: '#8b5cf6', size: 38, zone: 'axiom', phase: 0, glow: false, description: 'Version' },
  { id: 'n-transaction', label: '事务', x: 0.50, y: 0.10, color: '#8b5cf6', size: 38, zone: 'axiom', phase: 0, glow: false, description: 'Transaction' },
  { id: 'n-isolation', label: '隔离级别', x: 0.68, y: 0.12, color: '#8b5cf6', size: 38, zone: 'axiom', phase: 0, glow: false, description: 'Isolation Level' },
  { id: 'n-visibility', label: '可见性', x: 0.18, y: 0.24, color: '#06b6d4', size: 42, zone: 'axiom', phase: 0, glow: false, description: 'Visibility' },
  { id: 'n-readview', label: 'Read View', x: 0.82, y: 0.18, color: '#f59e0b', size: 45, zone: 'axiom', phase: 0, glow: true },
  { id: 'n-dependency', label: '依赖', x: 0.22, y: 0.14, color: '#8b5cf6', size: 28, zone: 'axiom', phase: 0, glow: false },
  { id: 'n-dependency2', label: '依赖', x: 0.78, y: 0.14, color: '#8b5cf6', size: 28, zone: 'axiom', phase: 0, glow: false },
];

const mechanisms: GraphNode[] = [
  { id: 'n-vchain', label: '版本链构建', x: 0.32, y: 0.30, color: '#a855f7', size: 35, zone: 'mechanism', phase: 1, glow: false, description: 'Version Chain' },
  { id: 'n-vischeck', label: '可见性判断', x: 0.52, y: 0.28, color: '#a855f7', size: 35, zone: 'mechanism', phase: 1, glow: false, description: 'Visibility Check' },
  { id: 'n-snapshot', label: '快照读取', x: 0.25, y: 0.40, color: '#ec4899', size: 32, zone: 'mechanism', phase: 1, glow: false, description: 'Snapshot Read' },
  { id: 'n-lifecycle', label: '生成', x: 0.40, y: 0.38, color: '#ec4899', size: 28, zone: 'mechanism', phase: 1, glow: false },
  { id: 'n-purge', label: '版本清理', x: 0.60, y: 0.38, color: '#ec4899', size: 32, zone: 'mechanism', phase: 1, glow: false, description: 'Purge' },
];

const conclusions: GraphNode[] = [
  { id: 'n-highconc', label: '高并发', x: 0.22, y: 0.52, color: '#06b6d4', size: 40, zone: 'conclusion', phase: 2, glow: false, description: 'High Concurrency' },
  { id: 'n-lockfree', label: '无锁读', x: 0.22, y: 0.62, color: '#06b6d4', size: 32, zone: 'conclusion', phase: 2, glow: false, description: 'Lock-Free Read' },
  { id: 'n-consistent', label: '一致性读', x: 0.65, y: 0.50, color: '#06b6d4', size: 38, zone: 'conclusion', phase: 2, glow: false, description: 'Consistent Read' },
  { id: 'n-rollback', label: '回滚支持', x: 0.35, y: 0.62, color: '#06b6d4', size: 32, zone: 'conclusion', phase: 2, glow: false, description: 'Rollback Support' },
  { id: 'n-isolguarantee', label: '隔离保证', x: 0.55, y: 0.60, color: '#06b6d4', size: 32, zone: 'conclusion', phase: 2, glow: false, description: 'Isolation Guarantee' },
  { id: 'n-vercontrol', label: '版本控制', x: 0.50, y: 0.52, color: '#06b6d4', size: 35, zone: 'conclusion', phase: 2, glow: false, description: 'Version Control' },
  { id: 'n-support', label: '支撑', x: 0.30, y: 0.56, color: '#06b6d4', size: 24, zone: 'conclusion', phase: 2, glow: false },
  { id: 'n-guarantee', label: '保证', x: 0.60, y: 0.55, color: '#06b6d4', size: 24, zone: 'conclusion', phase: 2, glow: false },
];

export const graphNodes = { axioms, mechanisms, conclusions };

// ============================================================
// Graph Edges
// ============================================================
export const graphEdges: GraphEdge[] = [
  { id: 'edge-0', source: 'n-version', target: 'n-visibility', type: 'belongs-to', label: '属于' },
  { id: 'edge-1', source: 'n-visibility', target: 'n-vchain', type: 'needs-for', label: '为了…需要' },
  { id: 'edge-2', source: 'n-transaction', target: 'n-vischeck', type: 'belongs-to', label: '属于' },
  { id: 'edge-3', source: 'n-isolation', target: 'n-readview', type: 'belongs-to', label: '属于' },
  { id: 'edge-4', source: 'n-version', target: 'n-vchain', type: 'belongs-to', label: '属于' },
  { id: 'edge-5', source: 'n-readview', target: 'n-vischeck', type: 'leads-to', label: '导致' },
  { id: 'edge-6', source: 'n-dependency', target: 'n-version', type: 'depends-on', label: '' },
  { id: 'edge-7', source: 'n-dependency2', target: 'n-isolation', type: 'depends-on', label: '' },
  { id: 'edge-8', source: 'n-vchain', target: 'n-vischeck', type: 'determines', label: '决定' },
  { id: 'edge-9', source: 'n-vischeck', target: 'n-snapshot', type: 'leads-to', label: '' },
  { id: 'edge-10', source: 'n-vischeck', target: 'n-purge', type: 'leads-to', label: '' },
  { id: 'edge-11', source: 'n-vchain', target: 'n-lifecycle', type: 'leads-to', label: '' },
  { id: 'edge-12', source: 'n-highconc', target: 'n-lockfree', type: 'enables', label: '所有…都' },
  { id: 'edge-13', source: 'n-snapshot', target: 'n-highconc', type: 'leads-to', label: '' },
  { id: 'edge-14', source: 'n-vercontrol', target: 'n-consistent', type: 'enables', label: '' },
  { id: 'edge-15', source: 'n-rollback', target: 'n-isolguarantee', type: 'enables', label: '' },
  { id: 'edge-16', source: 'n-support', target: 'n-rollback', type: 'enables', label: '' },
  { id: 'edge-17', source: 'n-guarantee', target: 'n-isolguarantee', type: 'enables', label: '' },
  { id: 'edge-18', source: 'n-vischeck', target: 'n-consistent', type: 'needs-for', label: '为了…需要' },
  { id: 'edge-19', source: 'n-vchain', target: 'n-vercontrol', type: 'leads-to', label: '' },
];

// ============================================================
// Rules
// ============================================================
export const rules: Rule[] = [
  { premise: ['若 A 依赖 B, B 变为 C,', '则 A 变为 C 影响'], result: '则 A 受 C 影响' },
  { premise: ['若 A 属于 B, B 属于 C,', '则 A 属于 C'], result: '→ 传递性' },
  { premise: ['若 A 为了 E 需要 B, B 为 C,', '则 A 导致 C'], result: '→ 推导' },
  { premise: ['若 A 支撑 B, B 支撑 C,', '则 A 支撑 C'], result: '→ 间接支撑' },
];

// ============================================================
// SubSystems
// ============================================================
export const subSystems: SubSystem[] = [
  { id: 'undo-log-sys', name: 'Undo Log 子系统', nodes: 36, relations: 72, color: '#8b5cf6' },
  { id: 'version-chain-sys', name: '版本链 子系统', nodes: 45, relations: 85, color: '#ec4899' },
  { id: 'visibility-sys', name: '可见性规则 子系统', nodes: 33, relations: 62, color: '#06b6d4' },
  { id: 'tx-mgmt-sys', name: '事务管理 子系统', nodes: 28, relations: 53, color: '#f59e0b' },
];

// ============================================================
// Inference Engine
// ============================================================
export const inferenceEngine: InferenceEngine = {
  steps: [
    { label: '事务', description: '(起点)' },
    { label: '隔离', description: '(属于)' },
    { label: '可见性判断', description: '' },
    { label: '一致性读', description: '(实现)' },
  ],
  answer:
    'MVCC（多版本并发控制）通过为每行数据维护多个版本来实现非锁定读。核心组件包括：\n1. **Undo Log** - 存储数据的旧版本\n2. **版本链** - 通过 roll_pointer 串联各版本\n3. **Read View** - 事务快照，记录活跃事务列表\n4. **可见性判断** - 基于 trx_id 与 Read View 的比较算法',
};

// ============================================================
// Node Explanations
// ============================================================
export const nodeExplanations: Record<string, NodeExplanation> = {
  'n-visibility': {
    nodeId: 'n-visibility',
    title: '可见性',
    tabs: [
      { id: 'def', label: '定义', content: '数据在特定事务视图下，是否可被当前事务读取的属性。' },
      { id: 'mech', label: '机制', content: '通过 Read View 中记录的活跃事务列表，与数据行的 trx_id 对比，判断该版本是否对当前事务可见。' },
      { id: 'reason', label: '动因', content: '为了在高并发场景下实现非锁定一致性读，需要一种机制判断数据版本的可见性。' },
      { id: 'source', label: '来源', content: 'InnoDB 官方文档 / 《MySQL 技术内幕》' },
    ],
    relatedCount: 6,
    notes: '结构：基于 Read View + 版本链信息，可见性判断逻辑确定当前事务可见 | 补充：不同隔离级别下，可见性判断规则不同。',
  },
  'n-readview': {
    nodeId: 'n-readview',
    title: 'Read View',
    tabs: [
      { id: 'def', label: '定义', content: 'Read View 是事务在执行快照读时生成的数据快照，记录了当前所有活跃事务的 ID 列表。' },
      { id: 'mech', label: '机制', content: '包含 m_ids（活跃事务列表）、min_trx_id、max_trx_id、creator_trx_id 四个核心字段，用于可见性判断。' },
      { id: 'reason', label: '动因', content: '为实现 MVCC 的一致性读，需要一个时间点的快照来决定哪些数据版本可见。' },
      { id: 'source', label: '来源', content: 'MySQL 源码 read0read.cc / InnoDB 存储引擎文档' },
    ],
    relatedCount: 8,
    notes: '核心：通过 m_ids 列表判断哪些事务的修改对当前事务可见 | 区别：RC 级别每次 SELECT 生成新 Read View；RR 级别仅第一次 SELECT 生成',
  },
  'n-version': {
    nodeId: 'n-version',
    title: '版本',
    tabs: [
      { id: 'def', label: '定义', content: '数据行在不同事务修改下产生的历史记录，每个版本包含 trx_id 和 roll_pointer。' },
      { id: 'mech', label: '机制', content: '通过 Undo Log 存储旧版本数据，新版本存储在数据页中，通过 roll_pointer 串联形成版本链。' },
      { id: 'reason', label: '动因', content: '支持事务回滚和 MVCC 多版本并发控制。' },
      { id: 'source', label: '来源', content: 'InnoDB 存储引擎内部实现' },
    ],
    relatedCount: 5,
    notes: '关键：每次 UPDATE/DELETE 都会生成新版本 | 存储：旧版本存储在 Undo Log 中',
  },
  'n-transaction': {
    nodeId: 'n-transaction',
    title: '事务',
    tabs: [
      { id: 'def', label: '定义', content: '数据库操作的逻辑单元，满足 ACID 特性，确保数据一致性和完整性。' },
      { id: 'mech', label: '机制', content: '通过 Redo Log 保证持久性，Undo Log 保证原子性，锁和 MVCC 保证隔离性。' },
      { id: 'reason', label: '动因', content: '保证并发操作下数据的正确性和一致性。' },
      { id: 'source', label: '来源', content: '数据库系统概念 / SQL 标准' },
    ],
    relatedCount: 12,
    notes: '特性：ACID: 原子性、一致性、隔离性、持久性',
  },
  'n-isolation': {
    nodeId: 'n-isolation',
    title: '隔离级别',
    tabs: [
      { id: 'def', label: '定义', content: '定义事务之间相互隔离的程度，SQL 标准定义了四个级别：RU、RC、RR、Serializable。' },
      { id: 'mech', label: '机制', content: 'InnoDB 默认使用 RR (Repeatable Read)，通过 MVCC + Next-Key Lock 实现。' },
      { id: 'reason', label: '动因', content: '在并发性能和数据一致性之间取得平衡。' },
      { id: 'source', label: '来源', content: 'SQL:1992 标准 / MySQL 文档' },
    ],
    relatedCount: 7,
    notes: '默认：InnoDB 默认隔离级别为 REPEATABLE READ | 区别：RC 允许不可重复读，RR 禁止不可重复读',
  },
  'n-vchain': {
    nodeId: 'n-vchain',
    title: '版本链构建',
    tabs: [
      { id: 'def', label: '定义', content: '通过 Undo Log 中的 roll_pointer 将同一行数据的多个版本串联成链表结构。' },
      { id: 'mech', label: '机制', content: '每次修改数据时，旧版本写入 Undo Log，新版本的 roll_pointer 指向旧版本，形成单向链表。' },
      { id: 'reason', label: '动因', content: '支持 MVCC 的版本回溯，使不同事务能看到不同时间点的数据。' },
      { id: 'source', label: '来源', content: 'InnoDB Undo Log 实现' },
    ],
    relatedCount: 4,
    notes: '结构：单向链表，从最新版本指向最旧版本',
  },
  'n-vischeck': {
    nodeId: 'n-vischeck',
    title: '可见性判断',
    tabs: [
      { id: 'def', label: '定义', content: '根据 Read View 和数据行的 trx_id，判断某个版本是否对当前事务可见的算法。' },
      { id: 'mech', label: '机制', content: '比较 trx_id 与 Read View 中的 min_trx_id、max_trx_id、m_ids，决定版本可见性。' },
      { id: 'reason', label: '动因', content: '实现非锁定一致性读的核心判断逻辑。' },
      { id: 'source', label: '来源', content: 'InnoDB 源码 row0sel.cc' },
    ],
    relatedCount: 6,
    notes: '规则：trx_id < min_trx_id → 可见；trx_id > max_trx_id → 不可见；trx_id in m_ids → 不可见',
  },
  'n-snapshot': {
    nodeId: 'n-snapshot',
    title: '快照读取',
    tabs: [
      { id: 'def', label: '定义', content: '不加锁的普通 SELECT 查询，读取的是数据的历史快照版本。' },
      { id: 'mech', label: '机制', content: '通过 MVCC 机制，根据 Read View 从版本链中找到可见的版本进行读取。' },
      { id: 'reason', label: '动因', content: '避免读操作加锁，提高并发性能。' },
      { id: 'source', label: '来源', content: 'InnoDB MVCC 实现' },
    ],
    relatedCount: 3,
    notes: '对比：与当前读 (Current Read) 相对，当前读需要加锁',
  },
  'n-highconc': {
    nodeId: 'n-highconc',
    title: '高并发',
    tabs: [
      { id: 'def', label: '定义', content: 'MVCC 通过无锁读机制实现的高并发数据访问能力。' },
      { id: 'mech', label: '机制', content: '读操作不阻塞写操作，写操作不阻塞读操作，大幅提升并发吞吐量。' },
      { id: 'reason', label: '动因', content: '数据库系统需要同时服务大量并发事务。' },
      { id: 'source', label: '来源', content: 'MVCC 设计目标' },
    ],
    relatedCount: 4,
    notes: '优势：读写不互斥，显著提升 TPS',
  },
  'n-consistent': {
    nodeId: 'n-consistent',
    title: '一致性读',
    tabs: [
      { id: 'def', label: '定义', content: '事务在某个时间点看到的数据快照保持一致，不受其他并发事务影响。' },
      { id: 'mech', label: '机制', content: '通过 Read View + 版本链实现，在 RR 级别下同一事务内多次读取结果一致。' },
      { id: 'reason', label: '动因', content: '保证事务内数据视图的一致性，避免不可重复读。' },
      { id: 'source', label: '来源', content: 'InnoDB Consistent Nonlocking Read' },
    ],
    relatedCount: 5,
    notes: '别名：也称为一致性非锁定读 (Consistent Nonlocking Read)',
  },
};

// ============================================================
// Question Bank
// ============================================================
export const questionBank: Question[] = [
  { id: 'q1', text: '说说 MVCC 的实现原理？', answered: true },
  { id: 'q2', text: '什么是 Read View？', answered: false },
  { id: 'q3', text: 'MVCC 如何保证可重复读？', answered: false },
  { id: 'q4', text: 'RR 与 RC 在 MVCC 下的区别？', answered: true },
  { id: 'q5', text: 'Undo Log 与 MVCC 的关系？', answered: false },
  { id: 'q6', text: '版本链是如何构建的？', answered: false },
];

// ============================================================
// Coordinates
// ============================================================
export const coordinates: Coordinates = { x: 12.39, y: 8.46, z: 5.27 };

// ============================================================
// Inference Responses (key → answer string)
// ============================================================
export const inferenceResponses: Record<string, string> = {
  'MVCC':
    'MVCC（多版本并发控制）通过为每行数据维护多个版本来实现非锁定读。核心组件包括：\n1. **Undo Log** - 存储数据的旧版本\n2. **版本链** - 通过 roll_pointer 串联各版本\n3. **Read View** - 事务快照，记录活跃事务列表\n4. **可见性判断** - 基于 trx_id 与 Read View 的比较算法',
  'Read View':
    'Read View 是事务在执行快照读时生成的数据快照。核心字段：\n- **m_ids**: 当前活跃的事务 ID 列表\n- **min_trx_id**: m_ids 中的最小值\n- **max_trx_id**: 下一个将分配的事务 ID\n- **creator_trx_id**: 创建该 Read View 的事务 ID',
  '可重复读':
    '在 RR（可重复读）级别下，事务仅在第一次 SELECT 时创建 Read View，后续读取复用同一个 Read View。这保证了同一事务内多次读取同一行数据，看到的始终是同一个版本，从而避免不可重复读。',
  'default':
    '正在基于知识图谱进行语义推理，请稍候...',
};