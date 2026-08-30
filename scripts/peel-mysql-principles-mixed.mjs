// 剥离 MySQL 域第三批混合知识点（2026-08-23）：缓冲/持久化、事务/并发/锁、索引簇
// 集中模式：本体挂「数据库原理」(database_principles)，MySQL 节点改写为实例并作为子文件挂本体下（不留在 MySQL 树），
// 带子树的 MySQL 条目（Redo Log、MVCC 等）整体迁移；加 instance-of 边；governance placement；原子写回。
import { readFileSync, writeFileSync, renameSync, mkdirSync, copyFileSync } from 'fs';
import { join } from 'path';

const DATA = 'data';
const FILES = ['node-pool.json', 'tree-data.json', 'knowledge-edges.json', 'knowledge-governance.json'];
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = join(DATA, 'backups', `peel-mysql-principles-mixed-${ts}`);
mkdirSync(backupDir, { recursive: true });
for (const f of FILES) copyFileSync(join(DATA, f), join(backupDir, f));
console.log('backup ->', backupDir);

const pool = JSON.parse(readFileSync(join(DATA, 'node-pool.json'), 'utf8'));
const tree = JSON.parse(readFileSync(join(DATA, 'tree-data.json'), 'utf8'));
const edges = JSON.parse(readFileSync(join(DATA, 'knowledge-edges.json'), 'utf8'));
const gov = JSON.parse(readFileSync(join(DATA, 'knowledge-governance.json'), 'utf8'));

const DBP = 'database_principles';
const HINT = ['计算机科学', '信息系统', '数据库管理', '数据库', '数据库原理'];
const DIM = (a) => a;

const ITEMS = [
  // ---------- 缓冲与持久化 ----------
  {
    conceptId: 'concept_checkpoint', label: '检查点 / checkpoint', dims: DIM(['缓冲', '持久化', '恢复']),
    instances: [{ ref: 'k_dict_t52tzaq2' }],
    def: '**检查点 / checkpoint**\n数据库/存储系统中记录「持久化进度」的机制：在日志中标记某一时刻之前的更改已全部写入持久存储，从而缩短崩溃恢复需要重放（redo）的日志范围、并允许回收旧日志空间。分为 sharp（全量停机刷盘）与 fuzzy（小批量分散刷盘）两类。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：MySQL/InnoDB fuzzy checkpoint、PostgreSQL checkpoint、Oracle checkpoint、文件系统 journal 提交点。',
  },
  {
    conceptId: 'concept_dirty_page', label: '脏页 / dirty page', dims: DIM(['缓冲', '存储']),
    instances: [{ ref: 'k_dict_rjl6lkaz' }, { ref: 'k_1781974756575_ldbdtp' }],
    def: '**脏页 / dirty page**\n缓存（如缓冲池、页缓存）中**已被修改但尚未写回**持久存储的页；与之相对，内容与磁盘一致的是干净页（clean page）。脏页由后台刷写机制（page cleaner、回写线程）按策略落盘，脏页数量与刷盘节奏直接决定崩溃恢复窗口与 I/O 峰值。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB buffer pool 脏页、OS page cache 脏页、PostgreSQL shared_buffers 脏页。',
  },
  {
    conceptId: 'concept_lru_list', label: 'LRU 链表 / LRU list', dims: DIM(['缓冲', '数据结构', '算法']),
    instances: [{ ref: 'k_1782008637396_62wc7w' }],
    def: '**LRU 链表 / LRU list**\n缓冲管理中按「最近最少使用」原则组织页的链表结构：命中页移向链表头，空间不足时从链表尾淘汰（eviction）。工程实现常加改良——中点插入（midpoint insertion）/ 新生与老生代分区，避免全表扫描等一次性访问把热点页冲刷出去。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB buffer pool 的 LRU list（含 midpoint）、Redis 近似 LRU/LFU、OS page cache LRU 变体。',
  },
  {
    conceptId: 'concept_change_buffer', label: '变更缓冲 / change buffering', dims: DIM(['缓冲', '持久化', '存储']),
    instances: [{ ref: 'k_1781901890734_vckmz5' }],
    def: '**变更缓冲 / change buffering**\n对**非唯一二级索引**的写操作，若目标页不在缓存中，先把变更暂存到单独的缓冲区、推迟到该页被读入时再合并（merge），从而把随机读转化为批量顺序写的技术。代价是合并开销与额外持久化结构。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB change buffer、LSM-Tree 的延迟合并思想（同类「写优化」结构）。',
  },
  {
    conceptId: 'concept_redo_log', label: '重做日志 / redo log', dims: DIM(['持久化', '恢复', '事务']),
    instances: [{ ref: 'k_1781957518600_aibqeg' }],
    def: '**重做日志 / redo log**\nWrite-Ahead Logging（WAL）体系中的**前滚日志**：先顺序记录物理页修改再落盘，崩溃后通过重放（redo）把已提交事务的修改恢复出来，同时让脏页可以延迟刷盘。配套结构通常有日志缓冲区与归档文件。与 undo log（回滚未提交修改）相对。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB redo log、PostgreSQL WAL、Oracle redo log、ARIES 协议的 redo pass。',
  },
  {
    conceptId: 'concept_undo_log', label: '撤销日志 / undo log', dims: DIM(['持久化', '恢复', '事务']),
    instances: [
      { ref: 'k_dict_jw1sc90t' }, { ref: 'k_1781957394111_3pyff0' }, { ref: 'demo_undo' },
      { ref: 'innodb_mvcc_undo_log_types' }, { ref: 'mysql_tx_mvcc_undo' },
      { ref: 'k_1781955169559_qqibnd' }, { ref: 'k_1781003299034_og1pqa' },
    ],
    def: '**撤销日志 / undo log**\nWrite-Ahead Logging 体系中的**回滚日志**：记录「如何撤销已做的修改」，用于事务回滚、崩溃恢复时撤销未提交事务，以及为多版本并发控制（MVCC）构建行版本链。通常按 insert/update 类别区分生命周期，存放于独立的回滚段/撤销表空间。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB undo log（insert/update 两类、独立表空间）、PostgreSQL 用旧版本元组实现等价语义、ARIES 的 undo pass。',
  },
  {
    conceptId: 'concept_mvcc', label: '多版本并发控制 / multiversion concurrency control', dims: DIM(['并发', '事务']),
    instances: [{ ref: 'demo_mvcc' }],
    def: '**多版本并发控制 / MVCC**\n为数据保留**多个历史版本**，使读操作不加锁即可读到一致性快照、写操作不阻塞读的并发控制方案。通常由事务开始时的快照 + 版本链（以 undo/旧版本实现）判定可见性，配合锁机制处理写-写冲突。代价是版本存储与过期版本清理（purge/vacuum）。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB 快照读 + undo 版本链、PostgreSQL MVCC（多版本元组 + VACUUM）、Oracle 回滚段多版本、SQL Server 乐观 RCSI。',
  },
  // ---------- 事务与并发 / 锁 ----------
  {
    conceptId: 'concept_deadlock', label: '死锁 / deadlock', dims: DIM(['并发', '事务']),
    instances: [{ ref: 'k_dict_mq68vpwg' }],
    def: '**死锁 / deadlock**\n两个或多个事务相互持有对方所需要的锁并循环等待，导致谁都无法推进的状态。应对策略：预防（统一加锁顺序）、超时放弃、或以等待图（waits-for graph）检测环并选一个事务作为牺牲者（victim）回滚。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：操作系统死锁（银行家算法）、InnoDB 死锁检测、PostgreSQL/Oracle 死锁检测器。',
  },
  {
    conceptId: 'concept_deadlock_detection', label: '死锁检测 / deadlock detection', dims: DIM(['并发', '事务']),
    instances: [{ ref: 'demo_deadlock' }],
    def: '**死锁检测 / deadlock detection**\n通过维护**等待图**（谁在等谁的锁）并在图中找环来主动发现死锁的机制；发现后通常回滚代价最小的事务作为牺牲者。与被动超时策略相对，检测能更快释放死锁但需维护等待关系。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB `innodb_deadlock_detect`、Oracle 与 PostgreSQL 的锁等待图检测。',
  },
  {
    conceptId: 'concept_rollback', label: '回滚 / rollback', dims: DIM(['事务', '恢复']),
    instances: [{ ref: 'k_dict_rmz7dcm0' }],
    def: '**回滚 / rollback**\n终止当前事务并**撤销其全部已做修改**、恢复到事务开始前状态的操作，由 undo 信息驱动，通常伴随锁的释放。与提交（commit）相对，是原子性（Atomicity）的保障机制之一。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：SQL `ROLLBACK` 语句语义（所有 RDBMS 一致）、保存点（SAVEPOINT）部分回滚。',
  },
  {
    conceptId: 'concept_shared_lock', label: '共享锁 / shared lock', dims: DIM(['并发', '锁']),
    instances: [{ ref: 'k_dict_yvuxhe74' }],
    def: '**共享锁 / shared lock（S 锁）**\n允许多个持有者**同时读**同一资源、但禁止任何持有者写入的锁模式；与排他锁（X 锁）相对，二者构成「读-写」锁的基础配对。兼容矩阵：S-S 兼容，S-X、X-X 互斥。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB/PostgreSQL/SQL Server 的 S 锁、读写锁（rwlock）的读侧、`LOCK IN SHARE MODE`。',
  },
  {
    conceptId: 'concept_gap_lock', label: '间隙锁 / gap lock', dims: DIM(['并发', '锁', '索引']),
    instances: [{ ref: 'mysql_glossary_gap_lock_1gfoi1' }],
    def: '**间隙锁 / gap lock**\n锁定**索引记录之间的间隙**（不含记录本身）的锁，用于防止其他事务向该范围插入数据，是可串行化范围谓词（幻读防护）在 B+ 树类索引上的常见实现手段。与记录锁组合即成 next-key lock。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB gap lock（RR 隔离级别防幻读）、谓词锁/范围锁（PostgreSQL SERIALIZABLE 的 SSI 谓词锁思想同源）。',
  },
  {
    conceptId: 'concept_next_key_lock', label: '临键锁 / next-key lock', dims: DIM(['并发', '锁', '索引']),
    instances: [{ ref: 'k_dict_m5qakvks' }],
    def: '**临键锁 / next-key lock**\n**记录锁 + 该记录前的间隙锁**的组合，锁定「左开右闭」的一段索引区间，兼顾锁定已有记录与阻止区间内插入，是 B+ 树存储引擎实现可重复读下防幻读的标准手段。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB next-key lock；范围锁思想在其他 B+ 树存储引擎中的等价实现。',
  },
  {
    conceptId: 'concept_lock_escalation', label: '锁升级 / lock escalation', dims: DIM(['并发', '锁']),
    instances: [{ ref: 'k_dict_nqeoggvl' }],
    def: '**锁升级 / lock escalation**\n当某事务持有的细粒度锁（行锁/页锁）数量超过阈值时，系统把它们**批量转换为更粗粒度的锁**（如表锁）以节省锁管理内存的机制。代价是并发度下降；部分存储引擎（如 InnoDB）刻意不支持升级，改用轻量结构管理大量细粒度锁。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：SQL Server 自动锁升级、DB2 锁升级、InnoDB（对比：不升级）。',
  },
  {
    conceptId: 'concept_row_level_locking', label: '行级锁定 / row-level locking', dims: DIM(['并发', '锁']),
    instances: [{ ref: 'k_dict_fb1f2eh2' }],
    def: '**行级锁定 / row-level locking**\n以**行**为最小锁粒度的并发控制方式，与表级/页级锁定相对：并发度最高，但锁数量大、需要附加结构（位图/索引项/锁表）管理，并可能引发表级意图锁协调。粒度选择是并发度与锁管理开销的经典权衡。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB 行锁（挂在索引记录上）、PostgreSQL 行锁（元组 xmax）、Oracle 行级 TX 锁。',
  },
  {
    conceptId: 'concept_dirty_read', label: '脏读 / dirty read', dims: DIM(['并发', '事务']),
    instances: [{ ref: 'k_dict_t83fdwoc' }],
    def: '**脏读 / dirty read**\n一个事务**读到另一事务尚未提交的修改**的现象：若对方回滚，读到的数据从未真实存在过。是最低隔离级别（READ UNCOMMITTED）才允许的读现象；更高级别通过 MVCC 快照或读锁避免。与不可重复读、幻读同属三大读现象。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：SQL 标准隔离级别矩阵（所有 RDBMS 通用）中对脏读的定义与防护。',
  },
  // ---------- 索引簇 ----------
  {
    conceptId: 'concept_index', label: '索引 / index', dims: DIM(['索引', '数据结构', '查询处理']),
    instances: [{ ref: 'k_dict_i70ksr9s' }],
    def: '**索引 / index**\n以额外空间与写放大为代价，为表的列（集）建立**加速查找的有序/哈希结构**（B+ 树、哈希、倒排等），使等值与范围查询避免全表扫描。按组织方式分聚簇/非聚簇、唯一/非唯一、单列/组合、覆盖/部分等类别。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：所有 RDBMS 的二级索引、文档库的二级索引、存储引擎层 B+ 树/LSM 索引。',
  },
  {
    conceptId: 'concept_unique_index', label: '唯一索引 / unique index', dims: DIM(['索引', '约束']),
    instances: [{ ref: 'demo_unique_index' }],
    def: '**唯一索引 / unique index**\n强制索引列（集）取值**不重复**的索引，兼具「加速查找」与「唯一性约束」双重职责；插入/更新时查找第一个匹配即可判定冲突。通常主键 = 唯一索引 + NOT NULL。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：`CREATE UNIQUE INDEX`（各 RDBMS 通用）、PostgreSQL 部分唯一索引（带 WHERE）。',
  },
  {
    conceptId: 'concept_hash_index', label: '哈希索引 / hash index', dims: DIM(['索引', '数据结构']),
    instances: [{ ref: 'demo_hash' }],
    def: '**哈希索引 / hash index**\n以哈希函数把键映射到桶的索引结构：**等值查找 O(1)**，但不保序，无法支持范围查询与排序。适合精确匹配场景；自适应哈希索引是其在存储引擎内部的自动优化形态。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：MEMORY 引擎哈希索引、InnoDB 自适应哈希、PostgreSQL 哈希索引、Redis 字典。',
  },
  {
    conceptId: 'concept_clustered_index', label: '聚簇索引 / clustered index', dims: DIM(['索引', '存储']),
    instances: [{ ref: 'demo_clustered_index' }],
    def: '**聚簇索引 / clustered index**\n决定表中行数据**物理存储顺序**的索引：叶节点即数据本身，因此每表最多一个（通常由主键承担），其余为二级索引并在叶中冗余主键/行指针。范围扫描与主键查找快，但插入顺序敏感、二级索引膨胀。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB 主键聚簇、SQL Server 聚集索引、Oracle IOT（索引组织表）。',
  },
  {
    conceptId: 'concept_covering_index', label: '覆盖索引 / covering index', dims: DIM(['索引', '查询处理']),
    instances: [{ ref: 'demo_covering_index' }],
    def: '**覆盖索引 / covering index**\n包含了某查询所需的**全部列**的（组合）索引，使查询仅访问索引即可返回结果、无需回表读取整行，显著减少随机 I/O。是查询优化与索引设计的常用手段（「索引覆盖查询」）。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：各 RDBMS 的覆盖索引优化（如 `Using index`）、Include 列（SQL Server/PostgreSQL 11+）。',
  },
  {
    conceptId: 'concept_partial_index', label: '部分索引 / partial index', dims: DIM(['索引', '查询处理']),
    instances: [{ ref: 'k_dict_722bh2j6' }],
    def: '**部分索引 / partial index**\n只对表中**满足条件的子集行**建立的索引（如 `WHERE status=...`），以更小的索引覆盖高频查询，降低写放大与空间占用；代价是优化器必须能证明查询条件被索引条件蕴含才可使用。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：PostgreSQL 部分索引、SQL Server 筛选索引、MySQL 无原生支持（对比）。',
  },
  {
    conceptId: 'concept_fulltext_index', label: '全文索引 / full-text index', dims: DIM(['索引', '信息检索']),
    instances: [{ ref: 'demo_fulltext_index' }],
    def: '**全文索引 / full-text index**\n面向**自然语言文本检索**的索引：对文本分词后以倒排索引（词 → 文档/位置）组织，支持关键词、短语、相关度排序等查询，与面向精确值的 B+ 树索引互补。涉及分词、停用词、相关度算法等信息检索技术。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：MySQL FULLTEXT（InnoDB 倒排实现）、PostgreSQL tsvector/GIN、Elasticsearch。',
  },
  {
    conceptId: 'concept_adaptive_hash_index', label: '自适应哈希索引 / adaptive hash index', dims: DIM(['索引', '缓冲', '调优']),
    instances: [{ ref: 'k_dict_4yz2io0y' }],
    def: '**自适应哈希索引 / adaptive hash index**\n存储引擎**自动**为热点页建立内存哈希入口的自我调优机制：监测访问模式，对频繁等值访问的页在缓冲池之上建哈希表，使热点查找免去 B+ 树遍历。属「自调优/自适应索引」技术族。\n\n本节点只承载模型本体；各系统实例作为子条目回指。',
    example: '**同构实例**：InnoDB AHI、数据库自调优索引研究（database self-indexing）思想。',
  },
];

// ---------- 工具 ----------
function walk(n, fn, parent) {
  fn(n, parent);
  for (const c of (n.children || [])) walk(c, fn, n);
}
function findNode(id) {
  let hit = null;
  walk(tree, (n) => { if (!hit && n.id === id) hit = n; });
  return hit;
}
function isInSubtree(node, root) {
  let found = false;
  walk(root, (n) => { if (n === node) found = true; });
  return found;
}
const MYSQL_ROOT = findNode('forest:view:mysql');
if (!MYSQL_ROOT) throw new Error('未找到 MySQL 根 forest:view:mysql');

// ---------- 1) node-pool：建本体 + 改 MySQL 实例 ----------
for (const it of ITEMS) {
  if (pool[it.conceptId]) throw new Error(`concept id 冲突: ${it.conceptId}`);
  pool[it.conceptId] = {
    id: it.conceptId,
    label: it.label,
    kind: 'Concept',
    role: 'plain',
    dimensions: it.dims,
    tags: [it.label, ...it.dims],
    card: {
      nodeId: it.conceptId,
      title: it.label,
      tabs: [
        { id: 'def', label: '定义（本体）', content: it.def },
        { id: 'example', label: '示例（跨域实例）', content: it.example },
      ],
      rootContent: it.def.split('\n').slice(0, 2).join(' ').replace(/\*\*/g, ''),
    },
  };
  for (const inst of it.instances) {
    const m = pool[inst.ref];
    if (!m) throw new Error(`缺少 MySQL 节点 ${inst.ref}`);
    const tabs = (m.card && m.card.tabs) || [];
    const origDef = (tabs.find((t) => t.id === 'def') || tabs[0] || {}).content || `（原节点「${m.label}」内容为空，MySQL 实例描述待补充。）`;
    inst.label = inst.label || `MySQL ${m.label}`;
    m.label = inst.label;
    m.dimensions = Array.from(new Set([...(m.dimensions || []), 'mysql']));
    m.tags = Array.from(new Set([...(m.tags || []), inst.label, 'mysql']));
    m.card.title = inst.label;
    m.card.tabs = [
      {
        id: 'def',
        label: '定义（MySQL 实例）',
        content: `**${inst.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现：\n\n${origDef}\n\n本节点是实例，其本体见「${it.label}」概念节点（数据库原理）。`,
      },
    ];
    m.card.rootContent = `**${inst.label}**\n「${it.label}」通用概念在 MySQL 中的具体呈现。本节点是实例，本体在数据库原理域。`;
  }
}

// ---------- 2) tree-data：本体挂数据库原理，MySQL 实例（含子树）作为真实子节点 ----------
for (const it of ITEMS) {
  const dbp = findNode(DBP);
  dbp.children = dbp.children || [];
  if (dbp.children.some((c) => c.nodeRef === it.conceptId)) throw new Error(`树条目已存在: ${it.label}`);
  const instChildren = it.instances.map((inst, i) => {
    // 若 MySQL 树中已有该 nodeRef 的真实条目（可能带子树），整体迁移复用；否则新建
    let existing = null;
    const hits = [];
    walk(tree, (n, parent) => { if (parent && n.nodeRef === inst.ref) hits.push({ n, parent }); });
    for (const { n, parent } of hits) {
      parent.children.splice(parent.children.indexOf(n), 1);
      if (!existing && !n.projection) existing = n;
      else console.log(`removed extra entry: ${n.name}`);
    }
    if (existing) {
      existing.name = pool[inst.ref].label;
      existing.projection = false;
      delete existing.view; delete existing.projectionKind; delete existing.sourceNodeId;
      return existing;
    }
    return { id: `tree_mysql_instance_${it.conceptId}_${i}`, name: pool[inst.ref].label, count: 0, nodeRef: inst.ref, children: [] };
  });
  dbp.children.push({
    id: `tree_${it.conceptId}`,
    name: it.label,
    count: 0,
    nodeRef: it.conceptId,
    children: instChildren,
  });
}

// 清理 MySQL 子树内因剥离而变空的容器节点（无 nodeRef 且无 children）
let removedEmpty = 0;
let changed = true;
while (changed) {
  changed = false;
  const empties = [];
  walk(MYSQL_ROOT, (n, parent) => {
    if (parent && !n.nodeRef && (!n.children || n.children.length === 0)) empties.push({ n, parent });
  });
  for (const { n, parent } of empties) {
    if (isInSubtree(parent, MYSQL_ROOT) || parent === MYSQL_ROOT) {
      parent.children.splice(parent.children.indexOf(n), 1);
      removedEmpty++; changed = true;
    }
  }
}
console.log('removed empty MySQL containers:', removedEmpty);

// ---------- 3) edges：instance-of 回指边 ----------
for (const it of ITEMS) {
  for (const inst of it.instances) {
    const id = `rel:${it.conceptId}:instance-of:${inst.ref}`;
    if (!edges.find((e) => e.id === id)) {
      edges.push({ id, source: inst.ref, target: it.conceptId, type: 'instance-of', label: 'MySQL 实例' });
    }
  }
}

// ---------- 4) governance：placement ----------
const placements = gov.placements;
function upsertPlacement(p) {
  const i = placements.findIndex((x) => x.nodeId === p.nodeId);
  if (i >= 0) placements[i] = p;
  else placements.push(p);
}
for (const it of ITEMS) {
  upsertPlacement({
    id: `placement:concept:${it.conceptId}`,
    nodeId: it.conceptId,
    status: 'accepted',
    contentStatus: 'canonical',
    canonicalParentNodeId: DBP,
    canonicalTreeEntryId: `tree_${it.conceptId}`,
    pathHint: [...HINT, it.label],
    confidence: 'high',
    rule: 'cross-domain-peeling-v1',
    rationale: '本体属数据库原理域，自 MySQL 混合知识点剥离；MySQL 侧保留为实例并 instance-of 回指。',
  });
}

// ---------- 5) 原子写回 ----------
function atomicWrite(file, obj) {
  const tmp = join(DATA, `${file}.tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  renameSync(tmp, join(DATA, file));
}
atomicWrite('node-pool.json', pool);
atomicWrite('tree-data.json', tree);
atomicWrite('knowledge-edges.json', edges);
atomicWrite('knowledge-governance.json', gov);
console.log('peel-mysql-principles-mixed complete:', ITEMS.length, 'concepts,', ITEMS.reduce((s, i) => s + i.instances.length, 0), 'instances');
