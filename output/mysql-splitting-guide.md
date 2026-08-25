# MySQL 词条跨域拆分文档

> 生成时间：2026-08-22
> 适用系统：Knowledge-OS（E:\project\Knowledge-OS）
> 数据真源：`data/node-pool.json`、`data/tree-data.json`、`data/knowledge-edges.json`、`data/knowledge-governance.json`
> 配套脚本：`scripts/split-*.mjs`、`scripts/audit-cross-domain.mjs`
> 当前状态：**已建 11 个 `concept_*` 中立本体节点、9 条 `instance-of` 回指边（compression 同族已彻底中立化，见 §5.4–§5.5）；MySQL 域审计零新增违例（159/16/0，全在 java 域）。**

---

## 1. 背景与问题

Knowledge-OS 以"知识宇宙"为单一本体空间，MySQL 视图（分支 `forest:view:mysql`）是其中的一个**域投影**。

实践中发现一类结构性混乱：某些节点的**本体属于另一个领域**，但因"在 MySQL 语境下被讨论"而被直接挂进了 MySQL 域，造成：

1. **本体与实例混杂** —— 例如「创新系列 / Innovation Series」既是通用版本管理概念，又被写成"MySQL 创新系列"节点，MySQL 知识夹在定义里。
2. **跨域重复** —— 同一个通用概念（事务、锁、索引、检查点……）如果在 Postgres / Oracle / 操作系统视角也建节点，就会在树里出现多个"真实父"，违反单一归属。
3. **导航失真** —— 维度（dimensions）退化成标签堆砌，无法区分"这是 MySQL 专属实现"还是"这是某个通用概念在 MySQL 下的实例"。

本质矛盾：**"属于哪个域"和"在哪些域里被讨论"是两件事**，旧模型把它们用同一个树父节点表达了。

---

## 2. 核心范式：本体—实例分离

每个知识点必须区分两种身份：

| 身份 | 含义 | 在树中的形态 | 判定 |
|---|---|---|---|
| **本体（canonical）** | 中立、不绑定 MySQL 的纯概念 | 真实节点，挂中立簇，全树**仅 1 个真实父** | `concept_*` 节点 |
| **实例（instance）** | 某通用概念在 MySQL 下的具体呈现 | MySQL 域的真实节点，通过 `instance-of` 边回指本体 | `mysql_glossary_*` + 边 |
| **域投影（projection）** | 不持有内容，只是指针，指向别处本体 | 树节点 `projection:true`，不重复承载知识 | 树层 `projectionKind`+`sourceNodeId` |

三个机制协同解决三类问题：

- **单一归属（Single canonical ownership）**：每节点全树仅 1 个真实父 = 它的本体域。治理规则 `canonicalParent.maxPerNode:1`。
- **投影发现（Projection）**：其他域想"看到"这个本体时，放一个轻量投影指针，不复制内容。
- **实例回指（instance-of）**：MySQL 节点若是某中立本体的一种实现/类型，用类型化边指回本体，保留"它属于 MySQL 同时又是一种 X"的双重语义。

> 一句话：通用概念进中立 `concept_*` 本体（单归属），MySQL 里它是实例（带 `instance-of` 边），其他域想看它就用投影。**不再把通用概念硬塞进 MySQL 域当作"MySQL 专属"。**

---

## 3. 划分方法（四档 rubric）

对**每一个** `mysql_glossary_*` 节点，按"定义描述的是否为独立于 MySQL 的概念"分四档：

| 档 | 名称 | 判定信号 | 动作 |
|---|---|---|---|
| **1** | 已拆分 | node-pool 已有对应 `concept_*` 本体，且该 mysql 节点通过 `instance-of` 边回指 | 不动 |
| **2** | 强通用候选 | 定义描述通用 CS/DB 概念，MySQL 只是其一实现（版本模型、缓存写回、持久化、事务/ACID、索引、锁、检查点/redo/undo、复制/集群等——在 Postgres/Oracle/OS/文件系统里同构存在） | 建 `concept_*` 本体（挂中立簇）+ 改造该节点为 MySQL 实例 |
| **3** | MySQL 专属 | 定义绑定 MySQL 特有实现：存储引擎(InnoDB/MyISAM)、`mysqld`、系统/状态变量、特定 SQL 语法、InnoDB 内部组件(doublewrite/change buffer/buffer pool)、binlog 等 | 保留为 MySQL 节点，不拆 |
| **4** | 待判 | 信号不明显，需人工读定义定档 | 逐条读定义后归入 1/2/3 |

**第 2 档的强信号清单（命中即候选）**：
- 版本/发布模型：innovation series、LTS、GA、Beta、release model
- 缓冲与持久化：flush、dirty page、checkpoint、redo/undo、write combining、page cleaner
- 优雅关闭/生命周期：clean shutdown、slow shutdown、bounce、startup、quiesce
- 事务与并发：ACID、isolation、lock（各类）、mutex、MVCC、rollback segment、mini-transaction
- 索引与存储结构：B-tree、R-tree、composite index、covering index、segment、extent（部分）
- 复制与高可用：row/statement based replication、replica、point-in-time recovery
- 压缩：compression（表级/页面级，通用存储优化）

**第 3 档的强信号清单（命中即保留）**：
- 明确 MySQL 专有名词：`mysqld`、`libmysqld`、`MySQLdb`、Connector/* 系列
- 文件格式/内部组件：`.ibd`、doublewrite buffer、change buffer、buffer pool（实现细节）
- 系统变量：`innodb_*`、`loose_*`、`my.cnf`/`my.ini`、key_block_size
- InnoDB 特定行格式/表空间：compact/dynamic/redundant row format、general/shared tablespace、transparent page compression

> 注意：第 2/3/4 档为**启发式**（按关键词命中），会有漏判/误判，仅供批量筛查起点，最终以逐条读定义为准。第 1 档由边关系精确判定。

**当前统计**（基于 304 条 `mysql_glossary_*` 节点，全量逐条归类见 `output/mysql-glossary-classification-2026-08-22.md`）：

| 档位 | 数量 |
|---|---|
| 1 已拆分 | 6（见 §5，另有 1 个本体未挂边的 concept_release_model） |
| 2 强通用候选 | 142（建议拆） |
| 3 MySQL 专属 | 22（保留） |
| 4 待判 | 137（需逐条读定义） |

---

## 4. 中立簇体系（concept_* 的归属地建议）

拆出的本体应挂到"知识宇宙"下的中立领域，而非 MySQL 域。已落地的簇：

| 中立簇节点 | 承载的本体 | 说明 |
|---|---|---|
| 发布与版本模型 / Release & Versioning Model（`concept_release_model`） | `concept_innovation_series`、`concept_lts_series`、`concept_ga`、`concept_beta` | 版本管理、发布通道等通用概念 |
| 缓冲与持久化（建议新建簇） | `concept_flush`、`concept_compression` | 缓存写回、数据压缩等存储优化通用概念 |

后续 142 条强通用候选可继续并入上述两簇，或新建：事务与并发簇、索引与存储结构簇、复制与高可用簇、生命周期与关闭簇。归属原则：**放在离概念本源最近的中立学科节点下**，不要挂在 MySQL 子树里。

---

## 5. 已完成拆分清单（已落地，审计零新增违例）

### 5.1 中立本体节点（现 17 个 `concept_*`）

| 本体 label | node id | 归属簇 |
|---|---|---|
| 创新系列 / Innovation Series | `concept_innovation_series` | 发布与版本模型 |
| 发布与版本模型 / Release & Versioning Model | `concept_release_model` | （簇根） |
| LTS系列 / LTS Series | `concept_lts_series` | 发布与版本模型 |
| GA / Generally Available | `concept_ga` | 发布与版本模型 |
| Beta / 测试版 | `concept_beta` | 发布与版本模型 |
| 刷新 / flush | `concept_flush` | 缓冲与持久化 |
| 数据压缩 / data compression | `concept_compression` | 缓冲与持久化 |
| 稀疏文件 / sparse file | `concept_sparse_file` | 数据压缩（子，§5.5） |
| 打孔 / hole punching | `concept_hole_punching` | 数据压缩（子，§5.5） |
| 透明压缩 / transparent compression | `concept_transparent_compression` | 数据压缩（子，§5.5） |
| 压缩失败 / compression failure | `concept_compression_failure` | 数据压缩（子，§5.5） |
| 复制 / replication | `concept_replication` | 复制与高可用（§5.6） |
| 副本 / replica | `concept_replica` | 复制（子，§5.6） |
| 主节点 / primary source | `concept_primary` | 复制（子，§5.6） |
| 基于行的复制 / row-based replication | `concept_row_based_replication` | 复制（子，§5.6） |
| 基于语句的复制 / statement-based replication | `concept_statement_based_replication` | 复制（子，§5.6） |
| 可用性 / availability | `concept_availability` | 高可用（§5.6） |

### 5.2 实例回指边（现 15 条 `instance-of`；含 compression 同族 4 条 §5.5、复制高可用 6 条 §5.6）

| MySQL 实例节点 | → 本体节点 |
|---|---|
| `mysql_glossary_innovation_series_1rj8dd` | `concept_innovation_series` |
| `mysql_glossary_lts_series_lpbljr` | `concept_lts_series` |
| `mysql_glossary_ga_ql2xt1` | `concept_ga` |
| `mysql_glossary_beta_1cp3ef` | `concept_beta` |
| `mysql_glossary_flush_1dnigf` | `concept_flush` |
| `mysql_glossary_sparse_file_1cutkz` | `concept_sparse_file`（§5.5） |
| `mysql_glossary_hole_punching_r6u429` | `concept_hole_punching`（§5.5） |
| `mysql_glossary_transparent_page_compression_j4ufzm` | `concept_transparent_compression`（§5.5） |
| `mysql_glossary_compression_failure_8kmcfr` | `concept_compression_failure`（§5.5） |
| `mysql_glossary_replica_7pskdj` | `concept_replica`（§5.6） |
| `mysql_glossary_master_1k7935` | `concept_primary`（§5.6，旧称） |
| `mysql_glossary_source_7ps15k` | `concept_primary`（§5.6，新称） |
| `mysql_glossary_availability_o9h2qe` | `concept_availability`（§5.6） |
| `mysql_glossary_row_based_replication_uiayeb` | `concept_row_based_replication`（§5.6） |
| `mysql_glossary_statement_based_replication_xyynye` | `concept_statement_based_replication`（§5.6） |

> 说明：`concept_release_model` 作为簇根，其下四个子本体通过 `treeRefs`/簇关系归拢，本身不单独挂某条 `instance-of`（它是"容器"而非"某个被实例化的概念"）。`concept_primary` 同时被 master（旧称）与 source（新称）两个 MySQL 实例回指，表示同一角色的旧称/新称。

### 5.3 操作记录（备份在 `data/backups/`）

| 拆分 | 脚本 | 备份时间戳 |
|---|---|---|
| 创新系列本体 + 4 投影 | `scripts/split-innovation-series.mjs` | `split-innovation-series-2026-08-22T03-49-31-816Z` |
| 刷新 flush | `scripts/split-flush.mjs` | `split-flush-2026-08-22T04-55-11-405Z` |
| 数据压缩 compression | `scripts/split-compression.mjs` | `split-compression-2026-08-22T08-48-35-550Z` |
| compression 二次整合 | `scripts/consolidate-compression.mjs` | `consolidate-compression-2026-08-22T09-55-39-968Z` |
| compression 子项彻底中立化 | `scripts/neutralize-compression-children.mjs` | `neutralize-compression-2026-08-22T10-05-45-987Z` |
| 复制与高可用拆分 | `scripts/split-replication-ha.mjs` | `split-replication-ha-2026-08-22T10-19-33-821Z` |

（发布模型簇归拢用 `scripts/consolidate-release-models.mjs`，未单独留备份目录，含在上述创新系列拆分批次内。）

### 5.4 compression 二次整合（通用定义与 MySQL 剥离，全放原理下）
按"压缩通用定义与 MySQL 剥离、删 MySQL 下条目、全放原理下"的要求，对 compression 做二次整合：
- **删除**：node-pool 节点 `mysql_glossary_compression_gbxfjp`（MySQL 压缩通用入口）+ 树投影文件夹 `projection:mysql-term:mysql_glossary_compression_gbxfjp` + instance-of 边 `rel:mysql_compression:instance-of:concept_compression` + 原理层原"MySQL 压缩"子投影 `projection:concept-child:mysql_glossary_compression_gbxfjp`。
- **迁移**：5 个 MySQL 专属压缩子节点作为子文件挂到原理层 `tree_concept_compression` 下——打孔（`mysql_glossary_hole_punching_r6u429`）、压缩失败（`mysql_glossary_compression_failure_8kmcfr`）、KEY_BLOCK_SIZE（`mysql_glossary_key_block_size_u1i5bm`）、稀疏文件（`mysql_glossary_sparse_file_1cutkz`）、透明页压缩（`mysql_glossary_transparent_page_compression_j4ufzm`）。
- **结果**：`concept_compression` children 由 1（MySQL 压缩子投影）变为 5（各实现子项）；MySQL 域不再有"压缩"通用条目（仅剩属备份域的"压缩备份"独立概念）；通用压缩定义 + 跨域实例示例全留原理层 `concept_compression`。审计 159/16/0 不变，compression 零违例。

### 5.5 compression 子项彻底中立化（建本体 + 实例回指）
对二次整合后挂到 `concept_compression` 下的 5 个子项做彻底中立化：凡有通用本体的概念各建 `concept_*` 本体（通用定义 + 跨域实例），对应 MySQL 节点改成 `instance-of` 实例；本体下挂各自 MySQL 实例。脚本 `scripts/neutralize-compression-children.mjs`，备份 `data/backups/neutralize-compression-2026-08-22T10-05-45-987Z`。

新增 4 本体（挂在 `tree_concept_compression` 下作为子本体）：
| 本体 | node id | 通用概念 |
|---|---|---|
| 稀疏文件 / sparse file | `concept_sparse_file` | 文件系统稀疏文件（NTFS/ext4/XFS/ZFS/APFS、VMDK/QCOW2） |
| 打孔 / hole punching | `concept_hole_punching` | fallocate PUNCH_HOLE 空间回收机制 |
| 透明压缩 / transparent compression | `concept_transparent_compression` | 存储层自动压缩/解压形态（ZFS/btrfs/NTFS/InnoDB 页压缩） |
| 压缩失败 / compression failure | `concept_compression_failure` | 压缩页更新溢出/重压缩失败现象（跨 DB/FS） |

新增 4 条 `instance-of` 边（MySQL 实例 → 本体）：
| MySQL 实例 | → 本体 |
|---|---|
| `mysql_glossary_sparse_file_1cutkz` | `concept_sparse_file` |
| `mysql_glossary_hole_punching_r6u429` | `concept_hole_punching` |
| `mysql_glossary_transparent_page_compression_j4ufzm` | `concept_transparent_compression` |
| `mysql_glossary_compression_failure_8kmcfr` | `concept_compression_failure` |

最终树结构（`concept_compression` 下）：
```
concept_compression（数据压缩本体）
├ concept_sparse_file          └ mysql_glossary_sparse_file（实例）
├ concept_hole_punching        └ mysql_glossary_hole_punching（实例）
├ concept_transparent_compression └ mysql_glossary_transparent_page_compression（实例）
├ concept_compression_failure  └ mysql_glossary_compression_failure（实例）
└ KEY_BLOCK_SIZE（MySQL InnoDB 专属变量，无通用本体，保留为 MySQL 实例直接挂原理层）
```
- `KEY_BLOCK_SIZE` 为 MySQL InnoDB 专属配置变量（`KEY_BLOCK_SIZE=<n>` 建表选项），无通用概念可归，**不建本体**，保留为 MySQL 实例节点直接挂 `concept_compression` 下。
- 现状统计：`concept_*` 本体 7→**11**；`instance-of` 边 5→**9**（新增 4，compression 同族）；MySQL 域仍无压缩通用条目。审计 159/16/0 不变，compression 同族零违例。

### 5.6 复制与高可用拆分（建本体 + 实例回指，标准范式）
对 MySQL 域"复制与高可用"簇（`mysql:theme:replication-ha`）里的 6 个复制/高可用节点做中立化：通用概念建 `concept_*` 本体挂原理层 `database_principles` 下，MySQL 节点改成 `instance-of` 实例（**留 MySQL 域**，通过边回指本体）。脚本 `scripts/split-replication-ha.mjs`，备份 `data/backups/split-replication-ha-2026-08-22T10-19-33-821Z`。

新增 6 本体（挂在 `database_principles` 下）：
- **复制簇**（`tree_concept_replication`，nodeRef=`concept_replication`）下挂 4 子本体：`concept_replica`（副本）、`concept_primary`（主节点/源节点）、`concept_row_based_replication`（基于行的复制）、`concept_statement_based_replication`（基于语句的复制）。
- **可用性**：`tree_concept_availability`（nodeRef=`concept_availability`）。

新增 6 条 `instance-of` 边（MySQL 实例 → 本体，**实例留 MySQL 域 replication-ha 簇**）：
| MySQL 实例 | → 本体 | 说明 |
|---|---|---|
| `mysql_glossary_replica_7pskdj` | `concept_replica` | MySQL 副本 |
| `mysql_glossary_master_1k7935` | `concept_primary` | 旧称 master |
| `mysql_glossary_source_7ps15k` | `concept_primary` | 新称 source（同一角色） |
| `mysql_glossary_availability_o9h2qe` | `concept_availability` | MySQL 可用性 |
| `mysql_glossary_row_based_replication_uiayeb` | `concept_row_based_replication` | MySQL RBR |
| `mysql_glossary_statement_based_replication_xyynye` | `concept_statement_based_replication` | MySQL SBR |

> **范式差异**：compression 同族（§5.4–§5.5）采用"删 MySQL 下条目、全放原理层本体下"的集中模式；复制高可用采用标准范式——本体挂原理层、MySQL 实例留 MySQL 域 + `instance-of` 边回指。因为复制是 MySQL 核心功能域，MySQL 域保留实例展示"MySQL 怎么做复制"更合理。`concept_primary` 同时被 master（旧称）与 source（新称）两个 MySQL 实例回指，表示同一角色的旧称/新称。
>
> **未处理**：`master_thread`（主线程）实为 InnoDB 后台线程、非复制概念，目前误挂在 `replication-ha` 簇下，待后续移至 InnoDB 存储引擎；`load_balancing`/`heartbeat`/`scale_out`/`scale_up` 亦属通用概念可后续拆。
>
> 现状统计：`concept_*` 本体 11→**17**；`instance-of` 边 9→**15**（新增 6）。审计 159/16/0 不变，复制高可用零违例。

### 5.7 跨域本体剥离（OS / 分布式 / 数据结构域，2026-08-23）
对"本体属于其他领域"的 8 个混合知识点做剥离：通用概念建 `concept_*` 本体挂**各自本体域**（不再是数据库原理簇），MySQL 节点改写为「MySQL X」实例并作为**真实子节点挂到本体下面**（compression 集中模式），同时清除 MySQL 树及目标域中的残留投影。脚本 `scripts/peel-mysql-cross-domain.mjs`，备份 `data/backups/peel-mysql-cross-domain-2026-08-23T02-38-23-441Z`。

| 本体 | node id | 本体域 | MySQL 实例（挂本体下） |
|---|---|---|---|
| 互斥量 / mutex | `concept_mutex` | 系统组织/操作系统 | `mysql_glossary_mutex_6ryres` |
| 自旋 / spin | `concept_spin_wait` | 系统组织/操作系统 | `mysql_glossary_spin_2ipmhl` |
| 原子指令 / atomic instruction | `concept_atomic_instruction` | 系统组织/操作系统 | `mysql_glossary_atomic_instruction_xxdtb4` |
| 负载均衡 / load balancing | `concept_load_balancing` | 系统组织/分布式系统 | `mysql_glossary_load_balancing_ee4rhm` |
| 心跳 / heartbeat | `concept_heartbeat` | 系统组织/分布式系统 | `mysql_glossary_heartbeat_1aiai3` |
| 向外扩展 / scale out | `concept_scale_out` | 系统组织/分布式系统 | `mysql_glossary_scale_out_1fhx7h` |
| 向上扩展 / scale up | `concept_scale_up` | 系统组织/分布式系统 | `mysql_glossary_scale_up_1y6pkm` |
| 倒排索引 / inverted index | `concept_inverted_index` | 计算理论/算法/数据结构 | `mysql_glossary_inverted_index_spkkuc` |

- 每个本体各建 `def`（本体）+ `example`（跨域实例）tab；MySQL 实例保留原 id、正文重构为实例视角并加 `instance-of` 回指边（新增 8 条）。
- 治理 placement 按 `cross-domain-peeling-v1` 规则 upsert。
- 审计 157/15/0 与剥离前持平，**零新增违例**；MySQL 树不再含这 8 个混合条目。
- `npm test` 中 `type-relations` / `semantic-duplicate-curation` 两个失败为 compression 拆分时期遗留（用改动前备份验证同样失败），与本批无关。

### 5.8 第二批跨域剥离：数据库对象与元数据 / 存储对象 / 预处理语句 / 逻辑约束 / 数据类型 / 未分类（2026-08-23）
脚本 `scripts/peel-mysql-schema-mixed.mjs`，备份 `data/backups/peel-mysql-schema-mixed-2026-08-23T02-50-23-437Z`。新增 14 本体、18 实例、18 条 `instance-of` 边。

| 本体 | node id | 本体域 | MySQL 实例 |
|---|---|---|---|
| 代理键 / surrogate key | `concept_surrogate_key` | 数据库原理 | 合成键、代理键（2 实例） |
| 自然键 / natural key | `concept_natural_key` | 数据库原理 | 自然键 |
| 关系型 / relational | `concept_relational` | 数据库原理 | 关系型 |
| 模式 / schema | `concept_schema` | 数据库原理 | 模式 |
| 预处理语句 / prepared statement | `concept_prepared_statement` | 数据库原理 | 客户端、服务器端（2 实例） |
| 主键 / primary key | `concept_primary_key` | 数据库原理 | 主键 |
| 唯一键 / unique key | `concept_unique_key` | 数据库原理 | 唯一键、唯一约束（2 实例） |
| 外键 / foreign key | `concept_foreign_key` | 数据库原理 | 外键、外键约束（2 实例） |
| NOT NULL 约束 | `concept_not_null_constraint` | 数据库原理 | NOT NULL 约束 |
| 可变长度类型 | `concept_variable_length_type` | 数据库原理 | 可变长度类型 |
| BLOB | `concept_blob` | 数据库原理 | BLOB |
| CLOB | `concept_clob` | 数据库原理 | CLOB |
| 存储对象 / stored object | `concept_stored_object` | 数据库原理 | 存储对象 |
| Pthreads / POSIX 线程 | `concept_pthreads` | 系统组织/操作系统 | Pthreads |

- 保留 MySQL 域：SDI、序列化字典信息、数据字典、INFORMATION_SCHEMA（MySQL 具体实现）；整数/实数/字符串/枚举类型（MySQL 专属类型）。
- 「未分类」分支改名「连接器与语言生态 / Connectors & Ecosystem」（剩 JDBC/ODBC/Connector/语言 API 等生态词条，属 MySQL 生态而非跨域本体）；剥离后空分支「预处理语句」「逻辑约束」已删除。
- 同时清除了散落在集合论/一阶谓词逻辑/图论等处指向这些节点的游离投影。
- 审计由 157/15/0 **改善为 153/14/0**（清掉 4 个真实重复、1 个投影并存违例），零新增；`npm test` 失败集与本批改动前完全一致（10 个预存失败，均为尚未落地的目标结构断言，与两批剥离无关）。

### 5.9 第三批剥离：缓冲/持久化、事务/并发/锁、索引簇（2026-08-23）
按「待拆项本体放本体位置、MySQL 实例作为本体子文件（不留在 MySQL 树）」的集中模式落地。脚本 `scripts/peel-mysql-principles-mixed.mjs`，备份 `data/backups/peel-mysql-principles-mixed-<ts>`。新增 24 本体、31 实例、31 条 `instance-of` 边，全部挂数据库原理簇 `database_principles`。

| 簇 | 本体（concept_*） |
|---|---|
| 缓冲与持久化 | 检查点、脏页（2 实例）、LRU 链表、变更缓冲、重做日志（带子树整体迁移）、撤销日志（7 实例：undo/undo log/插入更新日志/版本链/undo 表空间/undo 页）、MVCC（带子树） |
| 事务与并发/锁 | 死锁、死锁检测、回滚、共享锁、间隙锁、临键锁、锁升级、行级锁定、脏读 |
| 索引 | 索引、唯一索引、哈希索引、聚簇索引、覆盖索引、部分索引、全文索引、自适应哈希索引 |

- 带 MySQL 树子树的条目（Redo Log、MVCC）整体迁移复用为实例子文件；顺带清除了 31 处真实/投影重复条目。
- 31 个实例归属校验全部通过（唯一真实父 = 本体）；MySQL 子树无空容器残留。
- 审计由 153/14/0 **改善为 134/14/0**；`npm test` 失败集与基线完全一致（10 个预存失败），零新增。
- 横向概念说明：剥离出的本体即「横向概念」，MySQL 实例挂其下；日后其他数据库/系统接入时，各系统实例并列挂同一本体下，即实现横穿 MySQL 的通用概念层。

### 5.10 第四批剥离：备份/恢复/生命周期簇（2026-08-23）
脚本 `scripts/peel-mysql-backup-lifecycle.mjs`，备份 `data/backups/peel-mysql-backup-lifecycle-2026-08-23T03-20-57-531Z`。新增 17 本体、20 实例（另收尾 1：SQL 语言下的基础「预处理语句」词条并入 `concept_prepared_statement` 作第 3 实例）。

| 簇 | 本体（concept_*） |
|---|---|
| 备份（`concept_backup` + 8 个子本体嵌套） | 热备份、温备份、冷备份、逻辑备份、物理备份（含原始备份 2 实例）、完整备份、增量备份、部分备份、压缩备份 |
| 恢复 | 恢复 / restore、时间点恢复 / PITR、崩溃恢复、崩溃 / crash |
| 生命周期 | 启动 / startup、静默 / quiesce |
| 操作系统域 | 缓冲区 / buffer（→ `theory_domain_operating_systems`） |
| 并入已有本体 | 插入缓冲区、插入缓冲 → `concept_change_buffer`（+2 实例） |

- 保留 MySQL 域：MySQL Enterprise Backup、mysqlbackup 命令、mysqldump、prepared backup、ibbackup_logfile（MySQL 专属工具/产物）、sort buffer、InnoDB Buffer Pool（引擎内部组件）。
- 审计 132/14/0（继续下降）；`npm test` 失败集与基线一致（10 个预存失败），零新增。

### 5.11 第五批剥离：性能与可观测性簇（2026-08-23）
脚本 `scripts/peel-mysql-performance-mixed.mjs`，备份 `data/backups/peel-mysql-performance-mixed-2026-08-23T03-32-00-989Z`。新增 13 本体、17 实例。

| 本体域 | 本体（concept_*） |
|---|---|
| 数据库原理 | 瓶颈、工作负载、CPU 密集型、I/O 密集型（磁盘绑定 2 实例）、每秒事务数 TPS、等待、计数器（含指标计数器 2 实例）、统计信息（含持久统计 2 实例）、预热、热 / hot、物理（相对逻辑） |
| 操作系统 | 缓存 / cache（cache + Cache&Buffer 2 实例） |
| 分布式系统 | 可伸缩性 / scalability |

- 保留 MySQL 域（MySQL 专属）：Performance Schema、innodb_lock_wait_timeout、选项 / option；memcached（生态组件）移入「连接器与语言生态」。
- 审计 130/14/0（继续下降）；`npm test` 失败集与基线一致，零新增。

---

## 6. 待拆分清单（第 2 档，按主题聚类，共 142 条）

> 以下为启发式聚类，**落地前仍需逐条读定义确认档位**。每类给出建议归属的中立簇与典型节点示例。

### 6.1 缓冲 / 持久化 / 写回（建议归"缓冲与持久化"簇）
adaptive flushing、change buffering、insert buffering、delete buffering、purge buffering、doublewrite buffer、page cleaner、dirty-page 相关、redo、redo log archiving、undo buffer、undo log segment、undo tablespace、insert undo log、update undo log、rollback segment、write combining、checkpoint 系列（fuzzy/sharp checkpointing）、crash recovery、eviction、LRU、midpoint insertion strategy、young、neighbor page、flush 同族。

### 6.2 事务 / 并发 / 锁（建议新建"事务与并发"簇）
atomic、atomic DDL、atomic instruction、concurrency、locking、lock mode、record lock、gap lock、next-key、intention lock（IS/IX）、insert intention lock、implicit row lock、exclusive/shared lock、metadata lock（MDL）、auto-increment locking、mutex、rw-lock、spin、optimistic/pessimistic、consistent read、non-locking read、locking read、semi-consistent read、global transaction、read-only transaction、transaction ID、mini-transaction、segment、history list、victim、wait。

### 6.3 索引 / 存储结构（建议新建"索引与存储结构"簇）
column index、composite index、concatenated index、descending index、covering（index 类）、inverted index、R-tree、B-tree 相关、index cache、index condition pushdown、index hint、index prefix、index statistics、search index、virtual index、key（natural/synthetic）、foreign key / unique / NOT NULL constraint、denormalized、normalized、parent/child table、off-page column、overflow page、variable-length type。

### 6.4 复制 / 高可用 / 备份恢复（复制高可用已拆，见 §5.6）
复制与高可用已拆（§5.6）：复制本体簇（replica/primary/row-based/statement-based）+ 可用性本体已建，6 个 MySQL 节点改实例留 MySQL 域 + `instance-of` 边回指。仍待拆：replica 之外的 `load_balancing`、`heartbeat`、`scale_out`/`scale_up`（通用扩展性概念）；备份恢复类——`point-in-time recovery`、`mysqldump`（实例 + `implements` 边回逻辑备份本体）、`mysqlbackup command`、physical/raw/compressed/incremental/partial/full backup 系列（通用备份概念，MySQL 为实例）。

### 6.5 生命周期 / 优雅关闭（建议归"缓冲与持久化"或新建"服务生命周期"簇）
clean shutdown、slow shutdown、bounce、startup、quiesce、crash、fast shutdown 同族。

### 6.6 压缩（compression 同族已彻底中立化）
压缩本体 `concept_compression` 已建，其下 4 个通用子概念（稀疏文件、打孔、透明压缩、压缩失败）均已拆出各自 `concept_*` 本体并完成 MySQL 实例回指（§5.4–§5.5）。KEY_BLOCK_SIZE 为 MySQL 专属变量无本体，保留为实例。仍散在 MySQL 域各处的"压缩修饰词"条目（compressed row format、compressed table、COMPRESSED 行格式、压缩备份）属第 3 档 MySQL 专属实现或备份域独立概念，就地保留。

---

## 7. 操作流程（铁律 + 7 步）

> **铁律 1：写数据前必须停掉竞争的 vite dev server。**
> 若有 `node_modules/.bin/vite` dev server 后台运行（带数据中间件、内存持有 `data/*.json`），外部脚本写文件会被它回写覆盖而"消失"。导入/填充前务必 `Stop-Process` / `taskkill` 掉竞争的 dev server（`vite preview` 静态服务不影响数据，可保留）。
>
> **铁律 2：所有写 `data/*.json` 一律走原子写**（写临时文件再 rename），禁止原地覆盖。

标准 7 步（以拆分某个通用概念 X 为例）：

1. **备份 4 文件** → 复制 `node-pool.json` / `tree-data.json` / `knowledge-edges.json` / `knowledge-governance.json` 到 `data/backups/`（带时间戳）。
2. **停竞争 dev server**（见铁律 1）。
3. **建中立本体**：在 node-pool 新增 `concept_<x>`，`projection:false`，挂对应中立簇（通过 `treeRefs` 指向中立父节点），填 `card.tabs` 中立定义（剥离 MySQL 专属细节）。
4. **改 MySQL 节点为实例**：保留 `mysql_glossary_<x>` 节点，正文改写为"该通用概念在 MySQL 下的具体呈现"，可引用本体。
5. **加回指边**：在 `knowledge-edges.json` 加 `{ source: mysql_glossary_<x>, target: concept_<x>, type: "instance-of" }`。若该节点还是某能力的实现，另加 `implements` 边（如 mysqldump → 逻辑备份）。
6. **原子写回** 4 个文件（临时文件 + rename）。
7. **跑审计验证**：`node scripts/audit-cross-domain.mjs`，确认 **REAL_DUPLICATE / REAL_AND_PROJECTION 零新增**，且跨视图节点 `dimensions` 非空。

模板参考：`scripts/split-flush.mjs`（最干净的"建本体 + 改实例 + 加边"范例，已被 compression 拆分复用）。

---

## 8. 验证与当前状态

- **跨域审计命令**：`node scripts/audit-cross-domain.mjs`
- **当前审计结果**（2026-08-22）：`REAL_DUPLICATE = 159`、`REAL_AND_PROJECTION = 16`、`跨≥2视图 dimensions 为空 = 0`。
  - 上述违例**全部位于 java / 软件符号与工具域**（如 `k_java_type_*`、`k_acm2012_*` 等历史重复），**与本次 MySQL 拆分无关，MySQL 域零新增违例**。
  - 遗留：159 个 java 真实重复节点待批量转投影（不在本文档范围）。

---

## 9. 遗留项与后续

1. **142 条强通用候选**尚未落地，按 §6 聚类逐档拆分（每批遵循 §7 铁律 + 审计）。
2. **137 条待判**需逐条读定义定档（部分实为通用概念、部分实为 MySQL 专属、部分为非知识性词条如 ADO.NET/Java/Perl 等应归"生态/工具"而非拆分）。
3. **投影徽标未实现**：UniverseTree 应在带 `projection:true` 或 `instance-of` 边的节点上显示"↪ 本体在 X"，否则用户看不到拆分关系。
4. **缓冲与持久化中立簇**尚未正式建簇节点，compression / flush 暂以 `treeRefs` 标注，建议补建簇根。
5. **java 域 159 重复**为独立技术债，需单独批次转投影处理。

---

## 附：核心术语对照

| 术语 | 含义 |
|---|---|
| 本体 canonical | 中立、单归属的纯概念节点（`concept_*`） |
| 实例 instance | 某通用概念在 MySQL 下的具体呈现（`mysql_glossary_*` + `instance-of` 边） |
| 投影 projection | 不持有内容的指针节点，指向别处本体 |
| 单一归属 | 每节点全树仅 1 个真实父 |
| 跨域混合 | 本体属 A 域却被挂在 B 域（本文要消除的现象） |
