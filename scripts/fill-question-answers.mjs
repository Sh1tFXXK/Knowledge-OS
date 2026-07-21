/**
 * 填充 questions.json 中未回答问题的答案。
 * 用法：node scripts/fill-question-answers.mjs
 * 仅补充 answered:false 且缺失 answer 的条目，不改写已有答案。
 */
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('data/questions.json');

const ANSWERS = {
  demo_q2: `Read View 是 InnoDB 在 MVCC 中实现**快照读（一致性读）**时用到的事务快照结构。它记录当前时刻系统内所有"活跃（未提交）事务"的 ID，用来判断某行数据的某个版本对当前事务是否可见。

【核心字段】
- m_ids：生成 Read View 时所有活跃（未提交）事务 ID 列表
- min_trx_id：m_ids 中的最小值
- max_trx_id：系统将要分配给下一个事务的 ID
- creator_trx_id：创建该 Read View 的事务自身 ID

【可见性判断规则】
1. 若数据行的事务 ID < min_trx_id：该版本在 Read View 创建前已提交 → 可见
2. 若数据行的事务 ID ≥ max_trx_id：该版本在 Read View 创建之后才开启 → 不可见
3. 若落在 [min_trx_id, max_trx_id) 区间：看该事务 ID 是否在 m_ids 中——在（仍活跃）则不可见，不在（已提交）则可见

RC 隔离级别每次 SELECT 都新建 Read View，所以能看到别的事务最新提交；RR 在事务第一次读时生成并整个事务复用同一个 Read View，从而做到可重复读。`,

  demo_q3: `RR（可重复读）与 RC（读已提交）在 MVCC 下的核心区别，在于 **Read View 的生成时机**：

- **RC 读已提交**：每次执行 SELECT 都会生成一个新的 Read View。因此两次查询之间若别的事务提交了，第二次查询能看到新提交的数据 → 出现"不可重复读"。
- **RR 可重复读**：事务中第一次 SELECT 时生成 Read View，之后整个事务复用同一个 Read View。无论别的事务是否提交，看到的数据始终与第一次一致 → 可重复读。

此外，RR 通过 **Next-Key Lock**（记录锁 + 间隙锁）解决幻读；RC 一般只使用记录锁，存在幻读问题。两者底层都依赖 undo 版本链 + Read View 做可见性判断，差异仅在快照刷新频率。`,

  demo_q7: `Redo Log 与 Binlog 是两套不同层级、用途各异的日志：

1. **所属层级**：redo log 是 InnoDB 存储引擎层日志；binlog 是 MySQL Server 层日志，所有存储引擎通用。
2. **记录内容**：redo log 是**物理日志**——记录"某个数据页的哪段偏移做了什么修改"（页号+偏移+改动）；binlog 是**逻辑日志**——记录执行的 SQL 语句或行的前后镜像（statement / row / mixed）。
3. **写入方式**：redo log **循环写**（固定大小文件，写满后覆盖最早内容）；binlog **追加写**（一个文件写满后切分新文件，不覆盖）。
4. **用途**：redo log 用于**崩溃恢复（crash-safe）**，保证事务持久性；binlog 用于**主从复制**与**基于时间点的数据恢复**。
5. **一致性**：提交时采用两阶段提交（2PC）——redo log 先 prepare，binlog 写完后 redo log 再 commit，确保两份日志一致。`,

  demo_q8: `Buffer Pool 用**改进版 LRU** 管理缓存页，目的是避免全表扫描之类的操作把热点数据冲掉。

1. 朴素 LRU 把新读入的页放链表头，满了淘汰尾部的页。但全表扫描会一次性把大量只访问一次的页塞进头部，挤掉真正的热点页。
2. InnoDB 把 LRU 链表分为 **young 区（新子列表，占 5/8）** 和 **old 区（老子列表，占 3/8）**，中间为 midpoint。
3. 新读入的页**先放入 old 区头部**，而不是直接进 young 区。
4. 只有该页在 old 区停留超过 \`innodb_old_blocks_time\`（默认 1 秒）之后**再次被访问**，才会晋升到 young 区头部。
5. 全表扫描的页通常只访问一次，停留在 old 区很快被淘汰，**不会污染 young 区的热点页**。
6. young 区内被访问的页移到头部；尾部队列满时淘汰页——若是脏页需先刷盘再复用。`,

  demo_q10: `MySQL 中 JOIN 的常见执行算法：

1. **Nested-Loop Join（嵌套循环）**：外层驱动表取一行，内层被驱动表逐行匹配。无索引时退化为 Block Nested-Loop Join（按批读取减少扫描次数）。
2. **Index Nested-Loop Join（NLJ）**：被驱动表连接列上有索引时，用索引快速定位匹配行，大幅减少内层扫描次数，是最常用的高效算法。
3. **Hash Join**：对驱动表在内存中构建哈希表，被驱动表逐行探测。MySQL 8.0.18+ 在等值连接且无可用索引时，优化器可选用，适合大表等值连接。
4. **Sort-Merge Join（排序归并）**：两表先按连接键排序，再像归并一样顺序匹配；MySQL 原生较少使用，多见于其他数据库。

优化要点：**小表驱动大表**；被驱动表的连接列建索引以走 NLJ；大表无索引的等值连接考虑 Hash Join。`,

  demo_q11: `PostgreSQL 与 MySQL(InnoDB) 的 MVCC 实现差异：

1. **实现机制**：MySQL InnoDB 用 **undo log + 版本链 + Read View** 判断可见性，新版本覆盖旧版本，历史版本存于 undo 段。PostgreSQL 用**行多版本**——每行带 xmin/xmax 事务 ID 标记版本，UPDATE 实际上是插入新行、旧行标记失效，没有独立的 undo 段。
2. **旧版本回收**：MySQL 由 purge 线程清理 undo 中不再需要的旧版本；PG 由 **VACUUM / AUTOVACUUM** 回收过期行版本，否则会出现表膨胀。
3. **事务 ID**：PG 使用 32 位 xid，存在"事务 ID 回卷"风险，需要 vacuum 做冻结（freeze）；MySQL 的 trx_id 机制不同。
4. **可见性判断**：PG 基于事务快照（xmin ≤ 当前快照 且 xmax 未提交或 > 当前）；MySQL 用 Read View 的活跃事务 ID 列表判断。
5. **共同点**：两者都基于快照实现读写不阻塞，都提供一致性读。`,

  q_1780844254426_jti56i: `在 React 中，父组件通过 **JSX 属性（attribute）** 把数据作为 props 传给子组件：

1. 父组件渲染子组件时写入属性：\`<Child name="小明" count={5} onClick={handleClick} />\`
2. 子组件通过函数参数接收整个 props 对象：\`function Child(props) { return <p>{props.name}</p>; }\`
3. 更常用的写法是**解构**：\`function Child({ name, count }) { ... }\`，或箭头函数 \`const Child = ({ name }) => <p>{name}</p>;\`
4. **props 是只读的（单向数据流）**，子组件不能直接修改。要修改需由父组件通过 props 传入**回调函数**（如 \`onUpdate\`），子组件调用它通知父组件去改自己的 state。
5. 复杂数据传对象/数组，行为传函数；还可用 \`children\` 透传嵌套内容（\`<Child>{...}</Child>\` 中通过 \`props.children\` 获取）。
6. 类型安全可用 PropTypes 或 TypeScript 接口约束 props 形状。`,

  q_1781623296032_24obic: `索引是帮助数据库**高效获取数据**的数据结构，本质是"以空间换时间"，避免全表扫描。

1. **核心思想**：在表的列上建立有序结构（如 B+树），通过键值快速定位数据行，把随机 IO 降到树高（约 3-4 层）级别的 IO。
2. **常见结构**：
   - **B+树索引**（MySQL 默认）：平衡多路查找树，叶子节点用双向链表串联、存整行数据或主键值，非叶子节点只存索引键，查询稳定 O(log n)。
   - **哈希索引**：等值查询 O(1)，但不支持范围、排序、模糊匹配。
   - 其他：R-Tree（空间索引）、全文索引等。
3. **聚簇 vs 非聚簇**：InnoDB 主键索引即**聚簇索引**，叶子存整行；**二级索引**叶子存主键值，需"回表"再查数据。
4. **代价**：索引占用磁盘空间，且增删改需同步维护索引，降低写性能——因此不是越多越好，应遵循设计原则（where/join 列建索引、短列、组合索引控制列数等）。`,

  q_1781974796693_ku0o1i: `InnoDB 以**页（Page，默认 16KB）**作为磁盘与内存（Buffer Pool）之间交互的最小单位，所有数据（行记录、索引、undo、系统信息）都存放在页中。

1. **页结构**：每页含通用头部 File Header（页号、前后页指针 FILE_PAGE_PREV / FILE_PAGE_NEXT、页类型、表空间 ID）和尾部 File Trailer（校验和）。
2. **页类型**：数据页（存放行记录，即 B+树叶节点）、索引页（非叶节点）、Undo 页、系统页、事务数据页等，由页头 type 字段区分。
3. **页间链表**：同层索引页通过 FILE_PAGE_PREV / NEXT 组成双向链表；B+树叶子节点额外用双向链表串联所有数据页，便于范围扫描。
4. **行记录存储**：数据页内行记录按主键顺序存放，由"记录头"（含 next_record 指针、删除标记、n_owned）串成单向链表；变长字段与 NULL 值有专门的区存储。
5. **内存管理**：页读入 Buffer Pool 的缓冲页（含控制块），用改进 LRU 管理；脏页由刷盘线程按 checkpoint 写回磁盘。
6. **空间分配**：以区（Extent，64 页 = 1MB）为分配单位，段（Segment）管理叶子/非叶子页，碎片页应对小表。`,

  q_1782039235084_72linh: `三者都是 MySQL 的日志，但层级、内容与用途各不相同：

- **undo log（回滚日志）**：记录事务发生前的数据旧值（逻辑日志）。作用：(1) 事务回滚时撤销未提交的修改，保证**原子性**；(2) 为 MVCC 提供历史版本，实现一致性读。事务提交后由 purge 线程异步清理。
- **redo log（重做日志）**：记录数据页的**物理修改**。作用：(1) 崩溃恢复时重放已提交事务的修改，保证**持久性（crash-safe）**；(2) 基于 WAL（先写日志再改页）把随机写转为顺序写，提升性能。属于 InnoDB 引擎层，循环写。
- **binlog（二进制日志）**：记录逻辑操作（SQL 或行镜像）。作用：(1) 主从复制，从库重放实现数据同步；(2) 基于时间点的数据恢复（mysqlbinlog）。属于 Server 层，追加写，所有引擎通用。`,

  q_1782039861961_szg4zn: `binlog（二进制日志）是 MySQL Server 层的**逻辑日志**，记录所有数据变更操作，主要作用：

1. **主从复制**：主库开启 binlog，将变更发送给从库重放，实现数据同步与读写分离。
2. **数据恢复**：通过 \`mysqlbinlog\` 工具解析 binlog，可将数据库恢复到指定时间点（PITR，时间点恢复）。
3. **审计与增量备份**：记录完整变更历史，可用于审计和增量备份。

与 redo log 的区别：binlog 是 Server 层逻辑日志、追加写、用于复制与恢复；redo log 是引擎层物理日志、循环写、用于崩溃恢复。`,

  // 该题的答案被误写进了题目文本，移到 answer 字段即可
  q_1782039872139_tfhile: `1. 主从复制：在主库中开启 Binlog 功能，这样主库就可以把 Binlog 传递给从库，从库拿到 Binlog 后实现数据恢复达到主从数据一致性。
2. 数据恢复：通过 mysqlbinlog 工具来恢复数据。`,

  // 以下 5 道标记 answered:true 但缺失 answer 字段，按"填文本"补齐
  demo_q1: `MVCC（多版本并发控制）是 InnoDB 实现高并发读写互不阻塞的核心机制。

【核心思想】每行数据保留多个历史版本，读操作访问快照、写操作生成新版本，读写互不阻塞。

【关键结构】
- 隐藏字段：每行带有 DB_TRX_ID（最后修改该行的 trx_id）与 DB_ROLL_PTR（回滚指针，指向 undo log 中的上一个版本）。
- 版本链：每次更新把旧值写入 undo log，新行的 roll_ptr 指向它，从而形成一条版本链。

【可见性判断】事务开启（或首次读）时生成 Read View，记录当前活跃事务 ID 列表；沿版本链从最新往旧找，第一个"对当前事务可见"（已提交、不在活跃列表、且小于当前读视图上限）的版本即为读到的值。

【清理】purge 线程异步清理不再被任何事务需要的旧版本。
结果：读不加锁、读写不阻塞，显著提升并发度。`,

  demo_q4: `**哈希索引**：基于哈希表实现，等值查询 O(1) 极快；但**不支持范围查询、排序、模糊匹配**（最左前缀），且存在哈希冲突需用链表处理。Memory 引擎支持。

**B+树索引**：有序的多路平衡查找树，支持等值、范围、排序、最左前缀模糊匹配；叶子节点用双向链表串联，便于范围扫描；树高约 3-4 层，查询稳定 O(log n)。InnoDB 默认。

**结论**：只做高频等值查询可考虑哈希；需要范围、排序、组合条件时用 B+树。`,

  demo_q5: `**事务与外键**：InnoDB 支持事务（ACID）和外键；MyISAM 两者都不支持。
**锁粒度**：InnoDB 行级锁；MyISAM 表级锁，写并发能力差。
**崩溃恢复**：InnoDB 有 redo/undo log，崩溃后可恢复；MyISAM 容易损坏，需 repair table。
**索引结构**：InnoDB 是聚簇索引（数据即叶子节点）；MyISAM 是非聚簇（索引与数据分离，叶子存行指针）。
**全文索引**：MyISAM 较早支持，InnoDB 5.6+ 也支持。
**适用场景**：写多或需要事务用 InnoDB（MySQL 5.5+ 默认）；只读/读多写少的遗留表可用 MyISAM。`,

  demo_q9: `1. **定位**：开启慢查询日志，用 EXPLAIN 分析执行计划（关注 type、key、rows、Extra）。
2. **索引**：为 WHERE / JOIN / ORDER BY 列建索引；避免索引失效（对列使用函数、隐式类型转换、前导模糊 '%xx'、不当 OR）。
3. **减少扫描**：只查需要的列（用覆盖索引避免回表），拒绝 SELECT *；深分页用延迟关联。
4. **表结构**：大表拆分（垂直/水平分表）、归档冷数据、合理选择字段类型。
5. **参数与统计**：更新统计信息；调大 join_buffer / sort_buffer；tmpdir 使用内存盘。
6. **架构**：加 Redis 缓存热点、读写分离、异步化。`,

  demo_q12: `**内存操作**：数据主要存放于内存，避免磁盘 IO。
**单线程命令执行**：命令串行执行，无锁竞争、无上下文切换开销（Redis 6.0 后网络 IO 多线程，但命令执行仍单线程）。
**高效数据结构**：SDS、跳表、ziplist / listpack、哈希表等针对性优化。
**IO 多路复用**：基于 epoll / kqueue，单线程即可处理海量并发连接。
**协议轻量**：RESP 协议解析简单。
**渐进式处理**：过期删除、rehash 等分批进行，避免长阻塞。`,
};

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let filled = 0;
const now = Date.now();

for (const q of data) {
  if (ANSWERS[q.id] && (!q.answer || !q.answer.trim())) {
    q.answer = ANSWERS[q.id];
    q.answered = true;
    q.updatedAt = now;
    filled += 1;
    console.log('填充:', q.id, '—', q.text);
  }
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`\n完成：共填充 ${filled} 道题。`);
