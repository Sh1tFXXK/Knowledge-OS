# DB-KEY-CONSTRAINT-RELOCATION · 只读预检

- 生成时间：2026-09-16T12:44:22.762Z
- 模式：**READ_ONLY**（本脚本不写任何 `data/*.json`）
- 作用域：`知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库`（treeId `demo_db` · ref `n_u4va719e`）· 子树 1040 个树节点 · 一级孩子 30
- 机器可读：`outputs/tree-violation-scan/precheck-db-key-constraints.json`

## 0. 裁决口径（沿用 2026-09-16 用户裁定，本预检不重复裁决）

1. **主键双身份**：不融合：键与约束只挂 concept_primary_key；散装份先逐字段比对，有独有资产则迁入后删（本批只归位）
2. **代理键维基份**：本批不摘维基重复挂载（L4 跨区级），登记为独立债

## 1. 基线计数

| 项 | 读数 |
|---|---:|
| `treeNodes` | 3203 |
| `poolNodes` | 3850 |
| `edges` | 4155 |
| `treebindEdges` | 2647 |
| `treeprojectionEdges` | 0 |
| `danglingTreebindTargets` | 17 |
| `belongsToContainsNonTreebind` | 430 |
| `treebindPrefixAnomalies` | 9 |
| `belongsToNonContainsLabel` | 25 |
| `refLessTreeNodes` | 0 |
| `pseudoRefCensus` | `{"container":20,"n":9,"projection":0,"other":3084}` |
| `demoDbLevel1` | 30 |
| `chapterItems` | 18 |
| `looseItems` | 12 |
| `looseWithoutUpstreamTreebind` | 0 |
| `keyFamilyWithoutUpstreamTreebind` | 0 |

## 2. 散装项事实表（一级孩子中非 chapter 壳者）

| # | 名称 | treeId | 池 ref | 池内? | 上游 treebind 边 | 子树孩数 | ref 树挂载数 | 池内原子 | 题库引用 | 其他边 |
|---:|---|---|---|---|---|---|---:|---|---|---|
| 1 | 代理键 / surrogate key | `tree_concept_surrogate_key` | `concept_surrogate_key` | 是 | `treebind:demo_db:tree_concept_surrogate_key` | 1 | 1 | 0 | 0 | 1 |
| 2 | 自然键 / natural key | `tree_concept_natural_key` | `concept_natural_key` | 是 | `treebind:demo_db:tree_concept_natural_key` | 1 | 1 | 0 | 0 | 1 |
| 3 | 唯一键 / unique key | `tree_concept_unique_key` | `concept_unique_key` | 是 | `treebind:demo_db:tree_concept_unique_key` | 1 | 1 | 0 | 0 | 1 |
| 4 | 外键 / foreign key | `tree_concept_foreign_key` | `concept_foreign_key` | 是 | `treebind:demo_db:tree_concept_foreign_key` | 1 | 1 | 0 | 0 | 1 |
| 5 | NOT NULL 约束 / NOT NULL constraint | `tree_concept_not_null_constraint` | `concept_not_null_constraint` | 是 | `treebind:demo_db:tree_concept_not_null_constraint` | 1 | 1 | 0 | 1 | 1 |
| 6 | 全局唯一标识符 / GUID | `tree_concept_guid` | `concept_guid` | 是 | `treebind:demo_db:tree_concept_guid` | 1 | 1 | 0 | 0 | 1 |
| 7 | NULL | `projection:mysql-term:k_dict_fxoirizf` | `k_dict_fxoirizf` | 是 | `treebind:demo_db:projection:mysql-term:k_dict_fxoirizf` | 0 | 2 | 1 | 0 | 0 |
| 8 | 主键 | `tree_1788179275561_216qli` | `k_1788179275554_knwq7e` | 是 | `treebind:demo_db:tree_1788179275561_216qli` | 1 | 1 | 0 | 1 | 0 |
| 9 | 数据库备份 | `atomic_atomic_database_backup` | `atomic_database_backup` | 是 | `treebind:demo_db:atomic_atomic_database_backup` | 0 | 1 | 0 | 0 | 1 |
| 10 | 数据库恢复 | `atomic_atomic_database_restore` | `atomic_database_restore` | 是 | `treebind:demo_db:atomic_atomic_database_restore` | 0 | 1 | 0 | 0 | 1 |
| 11 | 贮存 | `tree_wiki_en_database_s16` | `k_wiki_en_database_s16` | 是 | `treebind:demo_db:tree_wiki_en_database_s16` | 2 | 1 | 0 | 0 | 0 |
| 12 | 复制 / replication | `tree_concept_replication` | `concept_replication` | 是 | `treebind:demo_db:tree_concept_replication` | 1 | 1 | 0 | 0 | 1 |

- **无上游 treebind 边**：0/12 —— （无）
- **被 viewDimensions 原子引用**：1 个 —— NULL(1)
- **ref 重复挂载**（同一 ref 挂多个树节点）：1 个 —— NULL(`k_dict_fxoirizf`)
- 每个 item 的六处引用明细（treebind / treeprojection / 非包含边 / 池内原子 / 题库 / 演化事件）见 JSON `items[].refs`。

## 3. 主键双身份逐字段 diff（裁决 a 的证据）

- 左 `k_1788179275554_knwq7e`（散装 · 数据库一级）· 右 `concept_primary_key`（索引章节下 · 语义 id）
- 相同字段 8 个：canonicalKey, aliases, role, shared, locked, hasMechanismSpec, relationIndex, viewDimensions

| 字段 | 左（k_1788179275554_knwq7e） | 右（concept_primary_key） |
|---|---|---|
| `id` | "k_1788179275554_knwq7e" | "concept_primary_key" |
| `label` | "主键" | "主键索引" |
| `kind` | null | "Concept" |
| `tags` | ["主键"] | ["主键索引","主键 / primary key","数据库建模","键","约束"] |
| `dimensions` | null | ["数据库建模","键","约束"] |
| `card` | {"nodeId":"k_1788179275554_knwq7e","title":"主键","rootContentLen":129,"rootContentSha":"8ed23e9a7db7","hasRootTable":false,"notesLen":0,"tabCount":1,"tabs":[{… | {"nodeId":"concept_primary_key","title":"主键索引","rootContentLen":66,"rootContentSha":"3dee457382a8","hasRootTable":false,"notesLen":0,"tabCount":2,"tabs":[{"i… |

- **单边独有正文资产**（融合时须迁入；本批只登记不迁移）：左独有 2 条 · 右独有 3 条
  - 左独有 `k_1788179275554_knwq7e.card.rootContent` len=129 sha=8ed23e9a7db7
  - 左独有 `k_1788179275554_knwq7e.tab:def` len=126 sha=5a670f4a3980
  - 右独有 `concept_primary_key.card.rootContent` len=66 sha=3dee457382a8
  - 右独有 `concept_primary_key.tab:def` len=226 sha=a122da4e0319
  - 右独有 `concept_primary_key.tab:example` len=198 sha=4c9bdab0602d

### ️ 判定：`REVISIT_DECISION_A` —— 裁决 (a) 的前提被实测推翻

- 左 k_1788179275554_knwq7e：label「主键」· rootContent 讲「表中唯一标识每一行的列（非空+唯一）+ InnoDB 聚簇索引」· 有子树「主键类型选择：自增 vs UUID」(6 孩) ⇒ 工程视角主键，带专属子树
- 右 concept_primary_key：label「主键索引」· card.title「主键索引」· 但 rootContent 与 tabs 全是**主键本体**（「主键 / primary key 一组列…」+ MySQL/PostgreSQL/SQL 标准 跨域实例）⇒ **label 与正文语义不一致（label 错名）**
- 右侧 tags=[主键索引, 主键 / primary key, 数据库建模, 键, 约束] · dimensions=[数据库建模, 键, 约束] ⇒ 按 键/约束 维度命名的概念，不是「索引种类」
- ⇒ 裁决 (a) 取到了两个身份的各一半：键与约束该收的是**本体**（右），而右的 label 现在写着「主键索引」。开批次前需重新裁决：先改右 label → 主键，本体份移入键与约束；或键与约束挂左（带子树），右登记为重复身份。

## 4. 代理键双身份逐字段 diff（裁决 b 的证据）

- 左 `concept_surrogate_key`（数据库一级）· 右 `k_wiki_en_outline_of_databases_s24_b4`（数据库系统 > 数据仓库 > 元素 · 维基派生物）
- ⚠️ 两者 **ref 不同** ⇒ 这是「同一概念两个身份」，不是「同一 ref 重复挂载」。真正的重复挂载另见 §2。
- 相同字段 7 个：canonicalKey, aliases, shared, locked, hasMechanismSpec, relationIndex, viewDimensions

| 字段 | 左（concept_surrogate_key） | 右（k_wiki_en_outline_of_databases_s24_b4） |
|---|---|---|
| `id` | "concept_surrogate_key" | "k_wiki_en_outline_of_databases_s24_b4" |
| `label` | "代理键 / surrogate key" | "代理键" |
| `kind` | "Concept" | null |
| `tags` | ["代理键 / surrogate key","数据库建模","键"] | ["代理键","wikipedia","wikipedia-import"] |
| `dimensions` | ["数据库建模","键"] | null |
| `role` | "plain" | null |
| `card` | {"nodeId":"concept_surrogate_key","title":"代理键 / surrogate key","rootContentLen":82,"rootContentSha":"70e1b1d6a98e","hasRootTable":false,"notesLen":0,"tabCou… | {"nodeId":"k_wiki_en_outline_of_databases_s24_b4","title":"代理键","rootContentLen":0,"rootContentSha":null,"hasRootTable":false,"notesLen":0,"tabCount":1,"tabs… |

- 单边独有正文资产：左独有 3 条 · 右独有 1 条

## 5. 归位目标路径（每项精确 from → to）

**新容器提案**：`键与约束 / key & constraint` 挂到 `chapter_db_03`（知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库结构）
- 与 chapter_db_03 现有 表/列/行/参照完整性 同级；本节点不持正文（选 ① 时与 chapter 壳同形态）
- **容器 ref 形态（实测推翻「ref=null」方案）**：⚠️ 实测：全库 **0 个**无 nodeRef 的树节点 ⇒「纯分组节点」没有先例，ref=null 会破坏「每个树节点都指向池实体或伪 ref」的现状。两条可选：① 仿 chapter 壳用 `container:key_constraint` 伪 ref（全库 20 个 container: 伪 ref 有先例）；② 新建并写正文的池实体（如 `concept_key_constraint`）。需裁决。
- id 占位检查：`tree_concept_key_constraint` tree=空闲 pool=空闲 · `tree_key_constraint` tree=空闲 pool=空闲 · `tree_key_constraints` tree=空闲 pool=空闲
- 同名节点检查：0 个 —— 「键与约束」名字可用

| # | 名称 | from | to | 状态 | 目标同名冲突 | 依据 |
|---:|---|---|---|---|---|---|
| 1 | 代理键 / surrogate key | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 代理键 / surrogate key | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库结构 > 键与约束 / key & constraint | `MOVE` | — | 键族；维基份另计（裁决 b） |
| 2 | 自然键 / natural key | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 自然键 / natural key | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库结构 > 键与约束 / key & constraint | `MOVE` | — | 键族 |
| 3 | 唯一键 / unique key | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 唯一键 / unique key | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库结构 > 键与约束 / key & constraint | `MOVE` | — | 键 + 约束族 |
| 4 | 外键 / foreign key | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 外键 / foreign key | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库结构 > 键与约束 / key & constraint | `MOVE` | — | 键族；语义邻居 参照完整性/子表/父级表 已在 chapter_db_03 |
| 5 | NOT NULL 约束 / NOT NULL constraint | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > NOT NULL 约束 / NOT NULL constraint | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库结构 > 键与约束 / key & constraint | `MOVE` | — | 约束族 |
| 6 | 全局唯一标识符 / GUID | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 全局唯一标识符 / GUID | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库结构 > 键与约束 / key & constraint | `MOVE_WITH_OPTION` | — | GUID 是代理键的一种实现 ⇒ 直挂 键与约束 or 挂到 代理键 下，需一句裁决 |
| 7 | 主键 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 主键 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库结构 > 键与约束 / key & constraint | `MOVE_LIKELY` | — | 它是**带子树的主键概念**（子树「主键类型选择：自增 vs UUID」6 孩）· 正文=工程视角主键 |
| 8 | 主键索引 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 索引 > 主键索引 | <mark>待裁决</mark> | `REVISIT_DECISION_A` | — | ⚠️ 裁决前提翻转：实测 label=「主键索引」，但 rootContent/tabs 全是**主键本体**（通用定义 + 跨域实例）⇒ 本体身份其实是它。见 primaryKeyDual.verdict |
| 9 | NULL | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > NULL | <mark>待裁决</mark> | `NEEDS_ADJUDICATION` | — | NULL 归属见 nullVerdict |
| 10 | 贮存 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 贮存 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 存储系统 | `CANDIDATE` | — | 贮存 与章节壳「存储系统」同义错位（同模式，同批可一并归位） |
| 11 | 复制 / replication | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 复制 / replication | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库分布与复制 | `CANDIDATE` | — | 复制 与章节壳「数据库分布与复制」同义错位 |
| 12 | 数据库备份 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库备份 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 恢复系统 | `DUPLICATE_PAIR` | ⚠️ 「备份 / backup」(`tree_concept_backup`) | ⚠️ chapter_db_08「恢复系统」下**已有「备份 / backup」** ⇒ 不是搬进空位而是同名重复，需先比对再定融合/登记 |
| 13 | 数据库恢复 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库恢复 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 恢复系统 | `DUPLICATE_PAIR` | ⚠️ 「恢复 / restore」(`tree_concept_restore`) | ⚠️ chapter_db_08「恢复系统」下**已有「恢复 / restore」** ⇒ 同上，同名重复 |

- ⚠️ **目标父节点下已有同义孩子：2 项** —— 数据库备份 → 备份 / backup · 数据库恢复 → 恢复 / restore
  - 这一类**不是「搬进空位」而是「合并/去重」**：把散装条目搬过去会造出同义兄弟对。处置应是「卸树留池 + 与既有节点融合」或「登记为重复身份」，需单独裁决。

## 6. 候选父节点现状（归位前对拍）

### 数据库结构（`chapter_db_03` · ref `container:chapter_db_03`）— 15 孩

- 现有孩子：模式 / schema · 存储对象 / stored object · 数据字典 / data dictionary · 表 / table · 列 / column · 行 / row · 生成列 / generated column · 临时表 / temporary table · 参照完整性 / referential integrity · 子表 / child table · 父级表 / parent table · 分区 / partitioning · 分隔标识符 / delimited identifier · 视图 · 架构（维基）

### 恢复系统（`chapter_db_08` · ref `container:chapter_db_08`）— 10 孩

- 现有孩子：可用性 / availability · 检查点 / checkpoint · 脏页 / dirty page · 备份 / backup · 恢复 / restore · 时间点恢复 / point-in-time recovery · 崩溃恢复 / crash recovery · 崩溃 / crash · 启动 / startup · 静默 / quiesce

### 存储系统（`chapter_db_10` · ref `container:chapter_db_10`）— 11 孩

- 现有孩子：数据压缩 / data compression · 缓冲池 / buffer pool · 变更缓冲 / change buffering · 表空间 / tablespace · 段 / segment · 区段 / extent · 页 / page · 页大小 / page size · 回滚段 / rollback segment · 撤销日志段 / undo log segment · 基于磁盘 / disk-based

### 数据表示（`chapter_db_12` · ref `container:chapter_db_12`）— 7 孩

- 现有孩子：可变长度类型 / variable-length type · BLOB / binary large object · CLOB / character large object · 整数类型 / integer type · 实数类型 / real type · 字符串类型 / string type · 枚举类型 / enum type

### 数据库分布与复制（`chapter_db_14` · ref `container:chapter_db_14`）— 3 孩

- 现有孩子：连接 / connection · 连接池 / connection pool · MySQL 分库分表

### 数据库运维（`chapter_db_17` · ref `container:chapter_db_17`）— 13 孩

- 现有孩子：瓶颈 / bottleneck · 工作负载 / workload · CPU 密集型 / CPU-bound · I/O 密集型 / I/O-bound · 等待 / wait · 计数器 / counter · 统计信息 / optimizer statistics · 预热 / cache warm-up · 热 / hot · 物理 / physical（相对逻辑而言） · 性能模式 / performance schema · 配置选项 / configuration option · 迁移

## 7. NULL 归属判定依据

- 条目 `k_dict_fxoirizf`（treeId `projection:mysql-term:k_dict_fxoirizf`）· 当前挂载 `projection:mysql-term:k_dict_fxoirizf`, `mysql_term_three_valued_logic_null_plui03`
- label：`NULL` · tags：`["NULL","mysql"]` · card.title：`NULL`
- 正文：rootContent 477 字 · tabs 0 个

**正文摘录（判定依据）**：

```
在SQL中表示缺少数据的特殊值。任何涉及NULL值的算术运算或相等性测试都会产生NULL结果。（因此它类似于IEEE浮点数的NaN，即“不是一个数字”。）在进行聚合计算时，如AVG()，会忽略具有NULL值的行，以确定要除以多少行。唯一可以处理NULL值的测试是使用SQL习惯用法IS NULL或IS NOT NULL。

NULL值在index操作中发挥作用，因为为了性能，数据库必须减少跟踪缺失数据值的开销。通常，NULL值不会存储在索引中，因为使用标准比较运算符测试索引列的查询永远无法匹配具有该列NULL值的行。出于同样的原因，唯一索引并不阻止NULL值；这些值在索引中根本不存在。对列声明NOT NULL约束提供了确认，确保没有行
```
- 同族邻居（池内 label 以 NULL/空值/默认值/三值逻辑 开头）：3 个
  - `k_dict_fxoirizf`「NULL」kind=— 树挂载=2 边=2
  - `k_dict_t4gobuxx`「NULL 排序」kind=— 树挂载=0 边=0
  - `theory_domain_three_valued_logic`「三值逻辑」kind=— 树挂载=1 边=2
- `数据表示`（chapter_db_12）现有孩子：可变长度类型 / variable-length type · BLOB / binary large object · CLOB / character large object · 整数类型 / integer type · 实数类型 / real type · 字符串类型 / string type · 枚举类型 / enum type

判定标准（三条择一，取正文实际内容）：
- 正文在讲「值域 / 未知值语义 / 三值逻辑」⇒ 数据表示（chapter_db_12）
- 正文在讲「列约束 / 默认值约束」⇒ 键与约束（与 NOT NULL 约束同族）
- 正文只讲 MySQL 方言用法 ⇒ 留投影态（该条目 id 已在 projection: mysql-term 命名空间）

## 8. 同族缺失（键与约束建成后的空洞）

| 术语 | 池内 | 树内 |
|---|---|---|
| 候选键 | `k_wiki_en_outline_of_databases_s11_b5`「候选键」 `k_sql_keys`「SQL 键辨析：超键、候选键、主键、外键」 | **缺** |
| 复合键 | **缺** | **缺** |
| 超键 | `k_sql_keys`「SQL 键辨析：超键、候选键、主键、外键」 | **缺** |
| candidate key | **缺** | **缺** |
| composite key | **缺** | **缺** |
| superkey | **缺** | **缺** |

## 9. 门位提示（供正式批次预检复用）

- **G7 冒号安全**：新父 `chapter_db_03` 含冒号=false
  - 作用域内含冒号的 treeId 共 1 个 `projection:mysql-term:k_dict_fxoirizf`
  - 作用域内含冒号 treeId ⇒ 父子解析一律走 edge source/target，禁 id.split(":")
- **G8 container 伪 ref**：作用域内 18 个 chapter 壳（`container:chapter_db_*`）；全库以 `container:` 作 source 的边 14 条
  - ⚠️ 实测：全库 0 个无 ref 树节点 ⇒ 新分组节点不能 ref=null。伪 ref 分布：container: 20 个 · n_ 9 个 · projection: 0 个。要么仿 chapter 壳用 container:key_constraint，要么新建并写正文的池实体
- **G9 边 id 前缀陷阱**：belongs-to+contains 但非 treebind 前缀 430 条 · treebind 前缀但 type/label 漂移 9 条 · belongs-to 用非 contains label 25 条
  - ⚠️「树包含边」不能只看 id 前缀或只看 type/label：① 430 条 java_source:* 边也是 belongs-to+contains（JDK 导入的类树，非目录树）；② 9 条 treebind: 前缀边用 type=structure/label=结构包含（p-web-http-scope 遗留口径漂移）；③ 25 条 belongs-to 用中文 label。本预检测「目录挂载边」的口径 = id 前缀 treebind: ∧ type=belongs-to ∧ label=contains ⇒ 会漏掉 ②，须在正式批次里逐条按目标 ref 复核。

## 10. 未决事项（开正式批次前需裁决）

| # | 事项 | 备选 | 影响面 |
|---:|---|---|---|
| 1 | **主键身份重新裁决**（裁决 a 前提被推翻） | ① 键与约束挂 concept_primary_key 且把它 label 从「主键索引」改为「主键」；② 键与约束挂 k_1788179275554_knwq7e（带子树），concept_primary_key 登记为重复身份；③ 两身份融合（留后续内容批） | 2 树节点 + 1 子树(6 孩) + 1 label |
| 2 | **键与约束 容器的 ref 形态**（实测 0 个无 ref 树节点） | ① `container:key_constraint` 伪 ref（仿 20 个 chapter 壳）；② 新建池实体 `concept_key_constraint` 并写正文 | 1 树节点（+1 池实体若选 ②） |
| 3 | NULL 归属 | 键与约束 / 数据表示(chapter_db_12) / 留投影态 | 1 条目 + 其 tab |
| 4 | GUID 落点 | 直挂 键与约束 / 挂到 代理键 下 | 1 条目 |
| 5 | 数据库备份/恢复 与 chapter_db_08 既有「备份/恢复」节点 | 先逐字段比对（本预检未做）→ 融合 / 卸树留池 / 登记重复身份 | 2 条目 + 2 条 treebind |
| 6 | 章节同义错位的 4 项（贮存/复制/备份/恢复）是否纳入本批 | 纳入 / 另立批次 | 4 条目 + 4 条 treebind |
| 7 | 键与约束 是否补建 候选键/复合键/超键 | 补建（池内已有「候选键」`k_wiki_en_outline_of_databases_s11_b5` 与「超键/候选键/主键/外键 辨析」`k_sql_keys`，只缺树挂载）/ 留空待补 | 0~2 条挂载 |

## 11. 写盘声明

- 本脚本**只读**：未写 `data/*.json`，未 import 任何 apply 脚本。
- 产物：`outputs/tree-violation-scan/precheck-db-key-constraints.json` · `outputs/tree-violation-scan/db-key-constraints-preflight.md`。
- 本预检**不是**批次预检：正式批次仍需 `batch-manifests/db-key-constraint-relocation.json` + 独立备份 + 就绪门（`scripts/verify-phase1-commit-readiness.mjs --batch <id>`）。