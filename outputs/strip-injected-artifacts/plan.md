# PLAN · 剥离「注入产物」（strip-injected-artifacts）

> 生成：2026-09-16T11:20:23.431Z · 由 `scripts/plan-strip-injected-artifacts.mjs` 计算（数字全部脚本产出）
> ⛔ 本脚本只读，未写 `data/`。

## 1. 口径

- **作用面**：仅 `card.rootContent`（解释卡**正文面**）。
- **不动**：`card.tabs[].content`（tab 面同类尾注是 6 月导入的原始形态，另案）、树 / 边 / 问题库。
- **变换三步**：① 去重标题 `T **T**` → `**T**`；② 移除 `/来源：原始行：\d+；官方锚点：https?:\/\/\S+/g`；③ `/ {2,}/g → ' '`（只压空格，不动换行）+ trim。

## 2. 计数

| 指标 | 值 |
|---|---|
| 池实体总数 | 3850 |
| **会被改动** | **422** |
| 保持不变（逐字节） | 3428 |
| 移除的尾注处数 | **287** |
| 去重标题的实体数 | **418** |
| 压缩掉的空格字符数 | 288 |

## 3. 自检（负对照 / 幂等）

- **幂等性**：对变换结果再跑一次，产生变化的实体数 = **0**（须 0）
- **清理后正文为空**：**0**（须 0 ⇒ UI 不会退回 def tab 兜底）
- **⚠️ 清理后仅剩标题的实体**：**13**（机械正确，但卡面只剩粗体标题；见 §5）

## 4. 负对照：含「来源/官方锚点」字样但**不**命中精确尾注的实体

> 这些**必须保持原样**（它们是合法散文或另一种产物）。共 **3** 个。

| 实体 | label | 正文开头 |
|---|---|---|
| `demo_secondary_index` | MySQL 二级索引 / secondary index | "MySQL 二级索引 / secondary index 二级索引是 InnoDB 索引的一种类型，表示表中部分列的索引。一个 InnoDB" |
| `k_1784733045365_qubtp0` | 隔离性 | "隔离性 在数据库系统中，隔离性是ACID（Atomicity, Consistency, Isolation, Durability）事务属" |
| `k_1785909354346_oxtcgv` | concurrent | "`concurrent` 的 Java 源码索引。\n\n共解析 97 个源码文件、338 个类型和 3 个包。\n\n来源：`C:\\Users\\A" |

## 5. ⚠️ 清理后仅剩标题的实体（需你裁决，本批默认**保持**该结果）

| 实体 | title | 前 → 后（字） |
|---|---|---|
| `k_dict_p7los2aq` | MySQL 动态 SQL / dynamic SQL | 57 → 30 |
| `k_dict_12jqwwcl` | MySQL 实例 / instance | 43 → 23 |
| `mysql_glossary_keystore_1khbxb` | MySQL 密钥库 / keystore | 45 → 24 |
| `k_1782749047493_w36knu` | MySQL 整数类型 | 25 → 14 |
| `k_1782749263813_199twh` | MySQL 实数类型 | 25 → 14 |
| `k_1782749276682_qsjks8` | MySQL 字符串类型 | 27 → 15 |
| `k_1782749287355_2zl67c` | MySQL 枚举类型 | 25 → 14 |
| `k_1784456386575_b7hxoh` | MySQL 事务管理 | 25 → 14 |
| `k_1787201710517_se61sz` | MySQL 存储引擎 | 25 → 14 |
| `k_1787234925180_aqltgu` | MySQL 系统表空间 | 27 → 15 |
| `k_1787235074473_zuqcq4` | MySQL 独立表空间 | 27 → 15 |
| `k_1787326496104_zbtx44` | MySQL Replication | 39 → 21 |
| `k_1787326536038_77rvww` | MySQL 分区管理（Partitioning） | 53 → 28 |

## 6. 改动明细（前 40 条）

| 实体 | 标题去重 | 尾注数 | 前 → 后（字） | 清理后开头 |
|---|---|---|---|---|
| `demo_undo` | ✔ | 0 | 390 → 368 | "**MySQL 撤销日志 / undo log** 一个存储区域，保存被活动**transactio" |
| `demo_snapshot` | ✔ | 0 | 205 → 201 | "**快照读** 读取记录的**历史版本**（InnoDB 从 undo log 构建版本链）而非最新" |
| `demo_lock` | ✔ | 0 | 214 → 204 | "**MySQL 锁机制** MySQL 因多存储引擎架构，各引擎支持的锁机制不同：**MyISAM " |
| `demo_deadlock` | ✔ | 0 | 119 → 87 | "**MySQL 死锁检测 / deadlock detection** （原节点「死锁检测 / de" |
| `demo_table_lock` | ✔ | 0 | 41 → 31 | "**MySQL 表级锁** 对整张表加锁，所有行共享同一把锁。" |
| `demo_row_lock` | ✔ | 0 | 523 → 503 | "**MySQL 行锁 / row lock** 一种 **lock**，防止其他 **transac" |
| `demo_shared_lock` | ✔ | 0 | 55 → 45 | "**MySQL 共享锁** 允许多个事务同时持有的读锁（S Lock），共享锁之间不互斥。" |
| `demo_exclusive_lock` | ✔ | 0 | 51 → 41 | "**MySQL 排他锁** 持有时阻断其他事务读锁和写锁的独占锁（X Lock）。" |
| `demo_btree` | ✔ | 0 | 173 → 161 | "**MySQL B+树索引** 以 **B+树**为底层结构的索引：所有数据存于叶子节点、叶子层横向" |
| `demo_hash` | ✔ | 0 | 244 → 220 | "**MySQL 哈希索引 / hash index** 一种用于使用相等运算符而非范围运算符（如大于" |
| `demo_clustered_index` | ✔ | 1 | 709 → 579 | "**MySQL 聚簇索引 / clustered index** InnoDB术语指的是primar" |
| `demo_composite_index` | ✔ | 0 | 200 → 189 | "**MySQL 组合索引** 包含多个列的索引，按列顺序构建搜索树。别名：**复合索引**（comp" |
| `demo_innodb` | ✔ | 1 | 1287 → 1181 | "**MySQL InnoDB** 一个MySQL组件，结合了高性能和transactional能力，" |
| `demo_myisam` | ✔ | 0 | 616 → 603 | "**MySQL MyISAM** 非事务引擎，每个表存为三个文件：.frm / .MYD / .MY" |
| `demo_buffer` | ✔ | 1 | 1079 → 964 | "**缓冲池 / buffer pool** 存储缓存的 `InnoDB` 数据的内存区域 用于表和索" |
| `demo_join` | ✔ | 0 | 184 → 170 | "**MySQL JOIN 连接** JOIN 用来联表操作：匹配两个表的数据，筛选并合并出符合要求的" |
| `demo_subquery` | ✔ | 0 | 48 → 38 | "**MySQL 子查询** 嵌套在其他查询中的查询，包括标量、行、表子查询。" |
| `demo_redis` | ✔ | 0 | 1236 → 1230 | "**Redis** 基于内存的键值 NoSQL 数据库：数据常驻内存并以单线程命令执行为主，读写延迟" |
| `n_0xxb9cqy` | ✔ | 0 | 398 → 389 | "**MySQL 索引** 索引是一种特殊的文件(InnoDB数据表上的索引是表空间的一个组成部分)，" |
| `n_ag24bbkc` | ✔ | 0 | 2073 → 2064 | "**MySQL 事务** 事务是由一组SQL语句组成的逻辑处理单元。 一个数据库事务象征着在数据库管" |
| `k_1781002610469_nik1ek` | ✔ | 1 | 1140 → 1040 | "**页 / page** 一个单位，表示在任何时刻 `InnoDB` 在磁盘（**data file" |
| `k_auto_va5371` | ✔ | 0 | 56 → 45 | "**MySQL 主键索引** 数据列不允许重复，不允许为NULL， 一个表只能有一个主键。" |
| `k_auto_yb9yyu` | ✔ | 0 | 270 → 259 | "**MySQL 普通索引** 基本的索引类型，没有唯一性的限制，允许为NULL值 MySQL 中用 " |
| `k_auto_es1cgt` | ✔ | 0 | 216 → 205 | "**MySQL 前缀索引** 只索引列值的前 N 个字符：`CREATE INDEX idx ON " |
| `k_dict_4yz2io0y` | ✔ | 0 | 471 → 437 | "**MySQL 自适应哈希 / adaptive hash index** 一个用于`InnoDB`" |
| `k_dict_ij1x57s1` | ✔ | 1 | 471 → 377 | "**ANSI** 在 **ODBC**中，支持字符集和其他国际化方面的替代方法。与**Unicode" |
| `k_dict_vg1hm4yv` | ✔ | 0 | 350 → 332 | "**MySQL 备份 / backup** \"将 MySQL 实例中的部分或全部表数据和元数据进行复" |
| `k_dict_n9s627ij` | ✔ | 0 | 467 → 444 | "**MySQL 基数 / cardinality** 表中column 中不同值的数量。当查询引用具" |
| `k_dict_t52tzaq2` | ✔ | 1 | 294 → 175 | "**MySQL 检查点 / checkpoint** **检查点 / checkpoint** 在缓" |
| `k_dict_h20fqa9t` | ✔ | 0 | 226 → 198 | "**MySQL 连接池 / connection pool** 一个缓存区域，允许数据库 conne" |
| `k_dict_1a3p1hdq` | ✔ | 0 | 258 → 222 | "**MySQL 参照完整性 / referential integrity** 保持数据始终在一致格" |
| `k_dict_nsqweksd` | ✔ | 0 | 361 → 332 | "**MySQL 数据字典 / data dictionary** **数据字典 / data dic" |
| `k_dict_o5254svl` | ✔ | 0 | 126 → 104 | "**数据仓库 / data warehouse** 面向**分析**而非在线事务的集中式数据存储：整" |
| `k_dict_lc7qrne8` | ✔ | 0 | 193 → 172 | "**MySQL 数据库 / database** **数据库 / database（schema 容" |
| `k_dict_mq68vpwg` | ✔ | 0 | 83 → 63 | "**MySQL 死锁 / deadlock** （原节点「死锁 / deadlock」内容为空，My" |
| `k_dict_qvf5c9q7` | ✔ | 0 | 169 → 151 | "**MySQL 删除 / delete** 当 `InnoDB` 处理一个 `DELETE` 语句时" |
| `k_dict_rjl6lkaz` | ✔ | 1 | 646 → 528 | "**MySQL 脏页 / dirty page** **脏页 / dirty page** 在 **" |
| `k_dict_t83fdwoc` | ✔ | 0 | 301 → 279 | "**MySQL 脏读 / dirty read** 检索不可靠数据的操作，即被另一个事务更新但尚未 " |
| `k_dict_t6m62us4` | ✔ | 0 | 286 → 270 | "**MySQL 落下 / drop** 一种**DDL**操作，它通过如[`DROP TABLE`]" |
| `k_dict_p7los2aq` | ✔ | 0 | 57 → 30 | "**MySQL 动态 SQL / dynamic SQL**" |
| … | | | | 其余 382 条见 plan.json |
