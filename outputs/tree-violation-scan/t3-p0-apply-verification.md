# T3-P0 apply · 独立验证报告

> 生成时间 2026-09-14T13:15:46.548Z
> 批前快照 `data\backups\t3-p0-2026-09-14T13-14-43-612Z`
> **独立性**：不复用 apply 脚本任何代码；比对对象 = 磁盘批前备份 vs 当前工作树；改名映射由数据位置对撞反推后与提案双向核对

## 结论 **`INDEPENDENT_VERIFY_PASS`** —— 21/21 项通过

| # | 断言 | 结果 | 依据 |
|---|---|---|---|
| 1 | 树：节点数不变 | ✅ | 3219 → 3219 |
| 2 | 树：除 id 外所有字段逐字节不变 | ✅ | 3219 个节点全通过 |
| 3 | 树：改名节点数 = 7 | ✅ | 实测 7 处：tree_1784367544335_zorevp → tree_java_jmm_synchronization · tree_1785862113590_a5v1ya → tree_java_jmm_sequential_consistency · tree_1786026688588_0mtvxh → tree_java_lock_rwlock_implementation · tree_1783873515748_edsjp0 → tree_java_syntax_generics · tree_1786235757428_osu8oj → tree_redis_zset · tree_1786340438649_tbr6gs → tree_redis_cache_anomaly · tree_1786245817114_ds2keo → tree_redis_rdb_persistence |
| 4 | 边：边数不变 | ✅ | 4166 → 4166 |
| 5 | 边：除 id 外所有字段逐字节不变（含顺序） | ✅ | 4166 条全通过 |
| 6 | 边：source/target 零触碰 | ✅ | 被触碰 0 处（须 0） |
| 7 | 边：只有 treebind 的 id 变动 | ✅ | 46 条 id 变动，其中非 treebind 0 条 |
| 8 | 改名映射：数据实测 ≡ 提案声明（7 对，双向） | ✅ | 7 对完全一致 |
| 9 | 引用闭合：身份承载数据（树/边/池/题库）旧 id 残留 0 | ✅ | 7 个旧 id 在 4 个身份承载文件中均已绝迹 |
| 10 | node-pool.json：本批零改动 | ✅ | 与批前快照逐字节相同 |
| 11 | questions.json：本批零改动 | ✅ | 与批前快照逐字节相同 |
| 12 | 池节点数不变 | ✅ | 3855 → 3855 |
| 13 | evolution-events：恰好新增 1 条 | ✅ | 1 条：event:tree-refactor:t3-p0:1789391683976 |
| 14 | evolution-event：changes 覆盖全部 7 个改名节点 | ✅ | changes 7 条 · 覆盖 7/7 |
| 15 | evolution-event：introducedNodes 为空（本批不新建实体） | ✅ | [] |
| 16 | 引用闭合：历史事件中旧 id 残留 0（不含本批审计叙述） | ✅ | 剔除本批事件后 3 条历史事件中零残留 |
| 17 | 引用闭合：本批审计里的旧 id 仅出现在 before/after 叙述（按字段角色区分） | ✅ | 7 处全部位于 `changes[].before / changes[].after` |
| 18 | 审计叙述完整性：7 条 changes 的 before 均含旧 treeId | ✅ | 7/7 |
| 19 | T3 项数 = 133 | ✅ | 133 项 |
| 20 | T3 读数 = HIGH 92 / MEDIUM 38 / BLOCK 3 | ✅ | HIGH 92 / MEDIUM 38 / BLOCK 3（本批前 HIGH 68 / MEDIUM 38 / BLOCK 27） |
| 21 | 剩余 BLOCK 恰为 3 条 projection 族（另案） | ✅ | 备份恢复工具(gap=6) · 安全管理工具(gap=6) · 集群管理工具(gap=6) |

## 实测改名映射（由数据位置对撞反推）

| # | 旧 treeId | 新 treeId | 位置 |
|---|---|---|---|
| 1 | `tree_1784367544335_zorevp` | `tree_java_jmm_synchronization` | $root > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 同步 |
| 2 | `tree_1785862113590_a5v1ya` | `tree_java_jmm_sequential_consistency` | $root > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 顺序一致性 |
| 3 | `tree_1786026688588_0mtvxh` | `tree_java_lock_rwlock_implementation` | $root > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 |
| 4 | `tree_1783873515748_edsjp0` | `tree_java_syntax_generics` | $root > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java泛型 |
| 5 | `tree_1786235757428_osu8oj` | `tree_redis_zset` | $root > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 数据类型 > zset |
| 6 | `tree_1786340438649_tbr6gs` | `tree_redis_cache_anomaly` | $root > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 缓存异常 |
| 7 | `tree_1786245817114_ds2keo` | `tree_redis_rdb_persistence` | $root > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 > RDB持久化 |

## T3 133 项读数（独立重算）

| 读数 | 本批前 | 本批后 |
|---|---:|---:|
| HIGH | 68 | **92** |
| MEDIUM | 38 | 38 |
| BLOCK | 27 | **3** |

剩余 BLOCK（属挂载点合法性 → 结构批次，不在 T3）：
- `asplit_s2_asplit_mysql_tool_backup` 备份恢复工具（gap=6）
- `asplit_s2_asplit_mysql_tool_security` 安全管理工具（gap=6）
- `asplit_s2_asplit_mysql_tool_cluster` 集群管理工具（gap=6）
