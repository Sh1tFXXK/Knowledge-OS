# 融合判断试验 — 第一批审查材料（2026-09-10）

> 性质：任务材料，非节点属性。目的：检验"为什么合、为什么不合、为什么只合一部分"的判断方法。
> 来源：同名碰撞索引（144 组）+ 五类情境配额抽样。每组材料 = 候选 + 正文摘录 + 邻接关系 + 机器初步判断 + 待确认点。
> 证据规则：**文字相近 ≠ 身份相同；存在差异 ≠ 必须拆开。** 依据优先级：正文中的明确限定 > 邻接关系 > 名称/标签。

---

## 组 1：MVCC（同名近义，预期=融合或建立关系）

**候选**

| ID | 名称 | 形态 |
|---|---|---|
| `concept_mvcc` | 多版本并发控制 | 手工概念节点（role: plain） |
| `demo_mvcc` | MySQL 多版本并发控制 | glossary 导入（role: mechanism），19 度中心 |
| `k_1784554617757_8fc5d0` | MVCC | UI 新建（C12），正文来自维基式通识 |
| `innodb_mvcc_hidden_columns` | MVCC 隐藏系统列 | **不是 MVCC 本体**，是它的实现部件 |

**定义依据（原文摘录）**

- `concept_mvcc`：*"为数据保留多个历史版本，使读操作不加锁即可读到一致性快照……通常由事务开始时的快照 + 版本链（以 undo/旧版本实现）判定可见性，配合锁机制处理写-写冲突。代价是版本存储与过期版本清理（purge/vacuum）。"* example tab 明确列举同构实例：InnoDB 快照读 + undo 版本链、PostgreSQL、Oracle、SQL Server RCSI。
- `demo_mvcc`：*"该技术允许 InnoDB 的 transactions 在某些 isolation levels 下执行 consistent read 操作……"（glossary 译文，MySQL 语境）*
- `k_1784554617757_8fc5d0`：*"多版本并发控制 (MCC 或 MVCC) 是一种无锁并发控制方法，通常被数据库管理系统使用……"（通识定义，中性语境；含 RTS/RTS/W-ts 时间戳机制细节 tab）*
- `innodb_mvcc_hidden_columns`：*"InnoDB 在每行内部维护 MVCC 元数据：DB_TRX_ID、DB_ROLL_PTR、DB_ROW_ID"*——讲的是**隐藏列**，不是 MVCC 概念本身。

**相同点与差异**

- 相同：三个 MVCC 节点都在说"多版本 + 快照读 + 写不阻塞读"。
- 差异：`concept_mvcc` 是去语境的通用模型（明确标注"同构实例"）；`demo_mvcc` 是 MySQL/InnoDB 实例视角；`k_1784554617757` 是另一套通识表述（时间戳机制描述更细，但来源混杂、语言夹生）。
- 既有边：`demo_mvcc -[instance-of / MySQL 实例]-> concept_mvcc` **已存在**，且 concept 的 example tab 恰好覆盖 demo 所指。

**建议关系**：`k_1784554617757_8fc5d0` 等价（作为概念表述）于 `concept_mvcc`；`demo_mvcc` 是 `concept_mvcc` 的实现实例（已接线，维持）；`innodb_mvcc_hidden_columns` 是实现部件，**不是** MVCC 的重复。

**建议动作**：
- `k_1784554617757_8fc5d0` → 融合进 `concept_mvcc`：正文互补（concept 偏模型结构、它偏时间戳机制叙述），保留 concept 为主体，将 RTS/W-ts 细节作为补充段落并入。
- `demo_mvcc` 保留，关系已在。
- `innodb_mvcc_hidden_columns` 保留不动（防误合样本：名字含 MVCC 但身份是隐藏列）。

**待确认点**：融合 `k_1784554617757` 时，其"事务内存（TM）"维度的句子（MVCC 在编程语言中实现事务内存）concept_mvcc 目前没有——并入时是保留进正文还是记入差异清单？

---

## 组 2：InnoDB（通用机制 vs 语境差异，预期=关系而非融合）

**候选**：`demo_innodb`（glossary，19 度）、`k_vault_mysql_innodb`（vault 笔记聚合，6 度）、`k_dict_f58eqkaq`（空壳，0 度 0 树）。

**定义依据**

- `demo_innodb`：*"一个 MySQL 组件，结合了高性能和 transactional 能力……在 MySQL 5.5+ 是默认存储引擎"* — 官方 glossary 定位。
- `k_vault_mysql_innodb`：*"InnoDB 存储引擎的进阶笔记：BufferPool、Page 结构与管理、行锁实现、概念字典。"* — 纯**笔记目录聚合节点**，正文是主题清单不是定义。
- `k_dict_f58eqkaq`：*"InnoDB Cluster 待补充内容。"* — 名字叫 InnoDB Cluster（MySQL 高可用方案），实际是空占位。

**相同点与差异**

- `demo_innodb` 与 `k_vault_mysql_innodb`：同名同指（InnoDB 存储引擎），但一个承载定义与组件关系，一个承载笔记树的挂载结构（下面挂着 bufferpool/page/rowlock/dict 五个 vault 子节点）。
- `k_dict_f58eqkaq`：**不同指** — "InnoDB Cluster" 是另一个对象（基于 Group Replication 的高可用方案），与 InnoDB 引擎是包含/相关关系，不是同名重复。

**建议关系**：`demo_innodb` ≈ `k_vault_mysql_innodb`（同指不同用途）；`k_dict_f58eqkaq` 是独立对象（InnoDB Cluster ≠ InnoDB）。

**建议动作**：
- `demo_innodb` 与 `k_vault_mysql_innodb`：**不整体融合**（各自结构角色不同：一个是知识节点，一个是笔记聚合的容器），建议建立 `equivalent / 同指` 关系，正文不合并。
- `k_dict_f58eqkaq`：保留，**修正名实不符**的待确认（见下）。

**待确认点**：① 两节点同指但用途分立——"容器型同指"是否算需要融合的情形，还是只建立关系？这是方法学问题，需要你裁决。② `k_dict_f58eqkaq` 名为 InnoDB Cluster 但无内容——它该按"占位等知识"保留（本轮不动），但其**空正文**要不要作为处置候选标记出来（不删，仅记录）？

---

## 组 3：B+ 树索引（通用结构 vs 特定实现，预期=层级关系）

**候选**：`concept_btree_index`（通用概念）、`demo_btree`（MySQL 语境）、`btree_structure`（物理结构子题）、`k_1788152029551_hfah3j`（联合索引最左前缀原理，不在树、0 度）。

**定义依据**

- `concept_btree_index`：*"以 B+树为底层结构的索引，所有数据落在叶子节点且有序链表串联……关系库默认的主流索引结构。"* example tab：InnoDB 聚簇/二级索引、PostgreSQL B-tree。
- `demo_btree`：*"以 B+树为底层结构的索引……树高即 IO 次数……底层页结构见子节点「B+树底层结构」。"*
- `btree_structure`：*"MySQL/InnoDB B+树索引的物理构成：一棵多路平衡搜索树，全部落在 16KB 的页上……"*
- `k_1788152029551_hfah3j`：*"联合索引的排序规则：最佳左前缀原则其实是和B+树的结构有关系……"*

**相同点与差异**

- `concept_btree_index` vs `demo_btree`：正文几乎逐句同义（一个去语境、一个 MySQL 语境），且已有 `demo_btree -[instance-of]-> concept_btree_index` 双向边（还有一条 concept→demo 的 belongs-to 反向边，方向冲突，见待确认）。
- `btree_structure`：demo_btree 正文明确"见子节点"，它是 demo_btree 的物理结构展开，不是重复。
- `k_1788152029551`：讲的是**联合索引列序规则**，借 B+树解释原理——主题是联合索引，不是 B+树本身。

**建议关系**：`demo_btree` 实例于 `concept_btree_index`（既有 instance-of 维持）；`btree_structure` 部件于 demo_btree；`k_1788152029551` 主题属联合索引。

**建议动作**：
- 融合 `demo_btree` 正文进 `concept_btree_index`？**不建议** — demo_btree 11 度枢纽（挂着 6 种索引类型的 belongs-to），融合会迁一堆边；正确动作是**保留并维持既有 instance-of**。
- `k_1788152029551_hfah3j`：孤节点（0 度不在树），正文质量高。建议动作：**保留并建立关系**——挂到联合索引主题（存在 `demo_composite_index` / `concept_composite_index` 一类节点，具体挂载点待验证后由你定），不是 B+树簇的融合对象。

**待确认点**：`concept_btree_index -> demo_btree` 存在一条 `belongs-to / contains` 反向边，与 `demo -> concept` 的 instance-of 方向矛盾。这属于**边数据冲突**，需要人工裁决哪条对（倾向 instance-of 是对的，belongs-to 那条像是导入脚本误连）。

---

## 组 4：接口（同名异义 — 典型防误合组）

**候选**：`k_1783167918831_zqk4a6`（CS 通识）、`k_java_syntax_zh_cbn51n`（Java 语法系列）、`k_1787724045886_9ac7md`（Go 语言正文）。

**定义依据**

- `k_1783167918831_zqk4a6`：*"接口是一组对外公开的成员与操作约定，用来把对象可被使用的方式与内部实现区分开。"*（一句话通识定义）
- `k_java_syntax_zh_cbn51n`：*"接口是不包含字段的类型……所有接口都默认是抽象的。根据Java版本不同……"*（Java 专论，8 度，挂着 Java 版本差异子节点）
- `k_1787724045886_9acmd`：*"Go 提供了两种替代类继承的特性……interfaces 提供了运行时多态性……"（Go 专论）*

**相同点与差异**

- 三个都在"接口"名义下，但**语言语境完全不同**：CS 通识 / Java / Go。Java 那条正文里有明确限定词（"根据Java版本不同，接口方法可使用部分访问修饰符"）；Go 那条整段讲 Go 的结构性差异（设计灵感来自 Smalltalk 协议）。

**建议关系**：三者是**上下位**关系——`k_1783167918831_zqk4a6`（通用：类型系统中的约定机制）为上位，Java/Go 两条为分语境下位。不是等价，更不能融合。

**建议动作**：保留三条，建立 `is-a / 分语境实例`（或既有词表里的 instance-of）关系：Java、Go 各自 instance-of 通识节点。**不融合**——融合会把三种语言的行为差异压成一个错误节点。

**待确认点**：通识节点 `k_1783167918831_zqk4a6` 本身只有一句话定义。上位关系建立后，是否需要为它补一句"各语言实现差异见子节点"的交叉引用？（不强制，判断清楚即可。）

---

## 组 5：redo / 重做日志（同名近义 + 粒度差异）

**候选**：`mysql_glossary_redo_1vo98z`（"重做 / redo"，glossary）、`k_1781957518600_aibqeg`（"MySQL 重做日志 / redo log"，glossary，5 度）。

**定义依据**

- `mysql_glossary_redo_1vo98z`：*"在 redo log 中记录的**数据**，以记录为单位，当 DML 语句对 InnoDB 表进行更改时记录。用于 crash recovery 中纠正……"* — 定义的是 redo **记录内容**。
- `k_1781957518600_aibqeg`：*"一种基于**磁盘的数据结构**……在 crash recovery 期间纠正由不完整的 transactions 写入的数据……"* — 定义的是 redo **log**（结构整体）。

**相同点与差异**

- MySQL glossary 自己就把这两个词分成两个条目：redo（记录）vs redo log（结构）。一个是"记录/数据"，一个是"日志结构/容器"。`k_1781957518600` 已挂 redolog buffer/file 子节点并有 instance-of 到 `concept_redo_log`。
- `mysql_glossary_redo_1vo98z` 0 度、正文短。

**建议关系**：`mysql_glossary_redo_1vo98z`（redo 记录）与 `k_1781957518600`（redo log）是**组成/实例混合**：redo 记录是 redo log 的内容物。建议 `part-of / 记录之于日志` 关系，不融合。

**建议动作**：保留两条，建立 part-of 关系；`mysql_glossary_redo_1vo98z` 的短正文可并入 `k_1781957518600`？**不建议** — 它们指不同对象（内容 vs 容器），合并即误合。建立关系即可。

**待确认点**：MySQL glossary 原文对 redo 的定义（"在 redo log 中记录的数据"）本质上更接近"redo 记录"。如果按 glossary 原义，条目名"重做 / redo"保持独立是对的。确认是否接受"记录 vs 日志"这层区分作为不融合的依据。

---

## 组 6：数据结构（同名异义 + 类型vs实例混在一组）

**候选**：`n_6dgtsmpj`（最早种子，"知识节点，作为该层级的核心聚合节点"）、`theory_domain_data_structures`（学科定义，10 度）、`k_1785471820450_v6okms`（HashMap 实现论，1 度）、`k_1786170062009_1o5xtm`（Redis 底层结构总览，1 度）。

**定义依据**

- `n_6dgtsmpj`：*"「数据结构」知识节点，作为该层级的核心聚合节点。"* — 纯占位聚合，无内容。
- `theory_domain_data_structures`：*"数据结构是计算机中存储、组织数据的方式。"*（学科定义，directory-taxonomy）
- `k_1785471820450_v6okms`：*"在Java编程语言中，基本的结构就是两种……HashMap 实际上是一个'链表散列'的数据结构……"*
- `k_1786170062009_1o5xtm`：*"Redis 没有直接使用 C 语言的传统数据结构，而是自己构建了一套……"*

**相同点与差异**

- 四个同名但**所指层级不同**：学科通识（theory）/ 目录聚合占位（n_）/ Java 视角的方法论句子（k_178547，实际主题是 HashMap 构造方式）/ Redis 视角的结构清单（k_178617，实际主题是 Redis SDS 等）。
- `k_178547` 和 `k_178617` 的正文都有独立主题（HashMap、Redis），"数据结构"只是它们的切入标签——真正的知识对象是 HashMap 和 Redis 的结构，不是"数据结构"学科本身。

**建议关系**：`theory_domain_data_structures` 为学科主身；`n_6dgtsmpj` 与它同指（聚合占位 vs 定义）；`k_178547`、`k_178617` 主题上属各自具体结构（HashMap/Redis），只是被"数据结构"命名污染。

**建议动作**：
- `n_6dgtsmpj` 与 `theory_domain_data_structures`：**部分融合候选** — 同指对象（数据结构学科）。但 n_ 是空占位（1 度，被 theory_domain_algorithms contains），动它收益小；建议**保留并建立 equivalent 关系**，暂不融合（判断不足时保留原状）。
- `k_178547`、`k_178617`：**不融合**（同名但主题各归其主）。它们的问题在**命名**（标签与内容错位），不在结构。本轮不处理，记录为"主题归属待改"案例。

**待确认点**：① 这组的"同指但一个是占位一个是定义"情形，你倾向 equivalent 关系还是等空占位真的走向处置候选？② `k_178547`/`k_178617` 的命名错位——是将来建立"主题正名"流程的输入，还是先放着？

---

## 方法学记录（本轮试验的判断规则，供你检查）

1. **等价（可融合）判据**：正文核心句同指一个对象 + 双方都没有语境限定词冲突（或限定词互为补充）+ 融合后不丢独有信息。→ 组 1 的 `k_1784554617757 → concept_mvcc`。
2. **同指不融合（建关系）**：对象相同但结构角色不同（容器/枢纽/正文），或边迁移成本高。→ 组 2 InnoDB、组 3 demo_btree、组 5。
3. **同名异指（防误合）**：正文有明确语境限定（语言、产品、粒度），融合会制造错误节点。→ 组 4 接口、组 6 的 HashMap/Redis 条目。
4. **部件非重复**：名字含母题但身份是部件/子题。→ `innodb_mvcc_hidden_columns`、`btree_structure`。
5. **名实不符单独处理**：`k_dict_f58eqkaq`（InnoDB Cluster 空壳）——不是融合问题，是占位知识的存在性问题，走"知识不删"下的记录通道。
6. **边数据冲突单独处理**：组 3 的反向 belongs-to/instance-of 矛盾边——是数据质量问题，与融合判断正交，需人工裁决。

**边界自检**：以上全部为建议，未写任何数据。执行保障（旧引用维持、回退）在方法通过后另行设计。
