# MySQL 域「本体 vs 实例」剥离行动 · 完整总结

> 行动时间：2026-08-23（跨多轮用户指令）
> 目标：把 MySQL 域树下的**所有通用数据库/安全概念**按「本体 vs 实例」范式剥离到本体域，MySQL 域只保留纯实现细节。
> 范式：**single affiliation**（每个概念节点仅归属于一个域）+ **instance-of 边**（MySQL 侧改写为实例并回指本体）。

---

## 一、行动总览（最终状态）

| 指标 | 剥离前 | 剥离后 | 变化 |
|---|---|---|---|
| MySQL 树节点数（含根） | 345+ | **97** | −248 |
| concept_* 通用概念总数 | ~117 | **212** | +95（本轮批量） |
| instance-of 边总数 | 206 | **271** | +65（本轮） |
| 源仍在 MySQL 树的 instance-of 不一致 | — | **0** | ✅ 完全一致 |
| database_principles 下概念 | ~100 | **178** | +78 |
| school_security 下概念 | 0 | **12** | +12 |
| governance placements | — | **665**（其中 cross-domain-peeling-v1 = 351） | — |

**MySQL 域现状**：97 个节点全部为纯 MySQL 实现细节，无任何通用概念残留。

---

## 二、批次明细（15 批脚本，全部执行并通过校验）

### 阶段 1：收尾遗留 + 并发锁簇
| 批次 | 脚本 | 新建概念 | 映射实例 | 说明 |
|---|---|---|---|---|
| 遗留对象 | `peel-mysql-stored-objects-leftover.mjs` | 0（用已有） | 3 | 存储过程/触发器 → concept_stored_program；视图 → concept_stored_object |
| 并发锁簇 | `peel-mysql-locks.mjs` | **17** | 27 | 排他/乐观/悲观/意向/记录/表级/自增/插入意向/隐式行/闩锁/元数据锁/非锁定读/锁定读/锁模式/范围与插入锁/半一致性读/锁机制 |

### 阶段 2：真重复清理 + 四大理论簇
| 批次 | 脚本 | 新建概念 | 映射实例 | 说明 |
|---|---|---|---|---|
| 真重复清理 | `peel-mysql-dup-remove.mjs` | 0 | 13 摘引用 | ACID/隔离级别/幻读/快照/自动提交/查询/OLTP/数据仓库等同时挂本体+MySQL，摘 MySQL 侧 |
| 事务理论 | `peel-mysql-transaction.mjs` (+fix) | **11** | 8 | 事务/生命周期/管理/读现象/一致性读/并发/受害者/丢失更新/全局事务/事务ID/只读事务 |
| 查询处理 | `peel-mysql-query.mjs` | **12** | 13 | 优化器/执行计划/全表扫描/选择性/索引提示/解析器/连接/子查询/插入/删除/截断/落下 |
| 关系对象与索引 | `peel-mysql-relational.mjs` | **19** | 27 | 表/列/行/数据库/B+树/组合/二级/前缀/降序/虚拟/列索引/索引统计/基数/填充因子/生成列/临时表/参照完整性/子表/父表 |
| 连接/复制/分区/引擎 | `peel-mysql-connector-replication.mjs` | **4** | 7 | 连接/连接池/分区/存储引擎 |

### 阶段 3：SQL 语言（两轮，用户「sql语言也可以移到」「sql语言所有东西都移走」）
| 批次 | 脚本 | 新建概念 | 映射实例 | 说明 |
|---|---|---|---|---|
| SQL 子语言 | `peel-mysql-sql-language.mjs` | **5** | 4 | DQL/DML/DDL/DCL/TCL |
| SQL 方言全移 | `peel-mysql-sql-language-all.mjs` | **4** | 6 | 分隔标识符/动态SQL/在线DDL/原子DDL + 混合模式插入→已有 insert |
| 空主题清理 | `peel-mysql-sql-theme-clean.mjs` | 0 | 0 | 移除空 `mysql:theme:sql-language` 容器 |

### 阶段 4：事务收尾 + 性能簇（用户「事务，性能,移走」）
| 批次 | 脚本 | 新建概念 | 映射实例 | 说明 |
|---|---|---|---|---|
| 事务+性能 | `peel-mysql-tx-perf.mjs` | **4** | 5 | 小型事务/性能模式/锁等待超时/配置选项；innodb_autoinc_lock_mode→已有自增锁 |

### 阶段 5：安全/Kerberos 簇 → **安全域**（用户「完成」）
| 批次 | 脚本 | 新建概念 | 映射实例 | 说明 |
|---|---|---|---|---|
| 安全簇 | `peel-mysql-security.mjs` (+fix) | **12** | 15 | 认证服务器/TGS/TGT/KDC/主体/SPN/服务票据/UPN/部分信任/密钥库/信任库/SSL；同义合并（AS+认证服务器、SPN+服务主体名称、partial+medium trust） |

> ⚠️ 这批是**通用安全概念**（非数据库概念），目标桶为 `school_security`（计算机科学 > 安全），不是 database_principles。SSL 节点被密码学域别名引用，摘后把别名 nodeRef 改指 concept_ssl。

### 阶段 6：数据布局（物理存储结构，用户「还有数据布局」）
| 批次 | 脚本 | 新建概念 | 映射实例 | 说明 |
|---|---|---|---|---|
| 存储结构 | `peel-mysql-datalayout.mjs` | **11** | 16 | 表空间/段/区段/页/页大小/回滚段/撤销日志段/撤销表空间/共享/系统/独立表空间；页子类型（干净/邻/撕裂/年轻/溢出）归并 concept_page |

> ⚠️ **嵌套树坑**：第一版先摘顶层「表空间」导致整棵子树连带搬走。修正：预摘保留节点 + MAPS 自底向上 + 显式清空「种类」容器。从第一版备份恢复后重跑修正版。

### 阶段 7：嵌套 query-processing（用户「都移走移到本体下当作子文件夹」）
| 批次 | 脚本 | 新建概念 | 映射实例 | 说明 |
|---|---|---|---|---|
| 嵌套查询处理 | `peel-mysql-queryproc.mjs` | **7** | 6 | 形成两级结构：database_principles > 查询处理(文件夹) > ICP/排序缓冲区/盲查询扩展/随机探查/相关性/词干提取 |

### 阶段 8：数据布局剩余 + 客户端通用词
| 批次 | 脚本 | 新建概念 | 映射实例 | 说明 |
|---|---|---|---|---|
| 数据布局剩余 | `peel-mysql-datalayout-rest.mjs` | **3** | 5 | 哨兵记录（supremum+infimum 归并）/表空间标识符/可传输表空间；通用表空间→已有共享表空间；空容器+pool 节点+9 绑定边全清 |
| 客户端通用词 | `peel-mysql-client-generic.mjs` | **3** | 7 | GUID/实例/主机；API×3→已有数据访问接口；连接字符串→已有连接 |

---

## 三、累计数字（本轮剥离行动）

- **新建通用概念：95 个**（database_principles +78，school_security +12，其余为既有概念补挂）
- **MySQL 节点改写为实例：约 150+ 个**，全部带 `instance-of` 回指
- **移除空主题/容器：7+ 个**（sql-language、transactions-concurrency、performance-observability、security-access、数据布局、嵌套 query-processing、3 个「种类」容器）
- **真重复清理：15+ 个**节点摘除 MySQL 侧引用

---

## 四、关键坑与范式（沉淀为可复用经验）

1. **写数据前必停 5173 dev server**（其内存持有 data/*.json 会回写覆盖外部写入）；`vite preview` 4173 静态服务可保留。写后重启 dev server。
2. **detachByRef 必须限定只扫 MySQL 子树**——否则会误摘本体域/其他域的跨域引用（SSL 密码学别名、存储系统域实例引用两个实例）。
3. **树节点 id ≠ nodeRef**：树节点 id 可能是 `governance:canonical:*` / `projection:mysql-term:*` 等非 pool-ref 形式，detach 按 nodeRef 匹配；孤儿补挂用 fix 脚本。
4. **嵌套树要自底向上剥**：先摘顶层容器会把整棵子树连带搬走（数据布局表空间案例）。
5. **一个通用概念 + 多个实例**：页子类型归并 concept_page、supremum/infimum 归并哨兵记录、API×3 归并数据访问接口、general tablespace 归并共享表空间——避免概念碎片化。
6. **空容器需显式清理**：带 self-nodeRef 的主题容器通用空容器清理不命中，需单独脚本（sql-language、security-access、query-processing、数据布局）。
7. **同义/缩写合并**：AS=认证服务器、SPN=服务主体名称、partial trust=medium trust。
8. 数据写入一律 `writeFileAtomically`（临时文件 + rename），备份到 `data/backups/peel-*`。

---

## 五、MySQL 域剩余（97 节点）——纯实现细节

- **物理文件**：.frm/.MYD/.MYI/.ibd/ibdata/ibtmp/.ibz/.ARM/.ARZ/.MRG/.par/.cfg/.OPT、my.cnf/my.ini
- **日志文件**：ib_logfile 组/错误日志/通用查询日志/二进制日志/慢查询日志
- **运行时文件**：PID/Socket
- **InnoDB 内部**：undo 日志类型（Update/Insert）、自增、间隙、在线、严格模式、文件格式、ilist
- **客户端库实现**：libmysqlclient/libmysql/mysqlclient/libmysqld/C API/Mysql客户端
- **备份工具**：mysqldump/MySQL Enterprise Backup/mysqlbackup 命令/checkpoint（fuzzy/sharp）
- **产品**：MySQL Cluster
- **优化器内部**：计划稳定性

这些全部是"MySQL 这个名字下的具体实现"，不再承载任何通用概念。通用概念均可在 database_principles（178）与 school_security（12）下找到，MySQL 侧以实例形式回指。

---

*报告生成：2026-08-23 · 数据源：data/{node-pool,tree-data,knowledge-edges,knowledge-governance}.json + 工作日志*
