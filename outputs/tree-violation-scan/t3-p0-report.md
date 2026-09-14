# T3-P0 · 7 个伪语义祖先的「前置语义化」—— 只读 dry-run 报告

> **模式：`DRY_RUN_READ_ONLY`** —— 改写只在内存克隆上执行，`data/` **未被写入**。

生成时间：2026-09-14T13:12:19.182Z

## 0. 为什么会有这一批

T3 的 133 项 `asplit_*` 里，27 条 `semanticAncestorGap > 3` → BLOCK。
其中 **24 条的根因不是它们自己没有语义，而是它们的直接父节点自己还没被语义化**（父 id 形如 `tree_<时间戳>_<hash>`）。
另 3 条属另一类问题（见 §5）。

按用户 2026-09-14 裁决（选 A），这 7 个祖先是**独立的前置小批次**，不由 T3 的子节点算法隐式完成。

## 1. 提案校验（机器只校验，不代拟名字）

| # | 旧 treeId | 旧 name | 新 treeId | namespace | 阻塞子项 | 校验 |
|---|---|---|---|---|---:|---|
| 1 | `tree_1786026688588_0mtvxh` | 读写锁的实现分析 | `tree_java_lock_rwlock_implementation` | `tree_java_lock_` | 9 | ✅ |
| 2 | `tree_1786245817114_ds2keo` | RDB持久化 | `tree_redis_rdb_persistence` | `tree_redis_` | 6 | ✅ |
| 3 | `tree_1784367544335_zorevp` | 同步 | `tree_java_jmm_synchronization` | `tree_java_jmm_` | 2 | ✅ |
| 4 | `tree_1783873515748_edsjp0` | Java泛型 | `tree_java_syntax_generics` | `tree_java_syntax_` | 2 | ✅ |
| 5 | `tree_1786235757428_osu8oj` | zset | `tree_redis_zset` | `tree_redis_` | 2 | ✅ |
| 6 | `tree_1786340438649_tbr6gs` | 缓存异常 | `tree_redis_cache_anomaly` | `tree_redis_` | 2 | ✅ |
| 7 | `tree_1785862113590_a5v1ya` | 顺序一致性 | `tree_java_jmm_sequential_consistency` | `tree_java_jmm_` | 1 | ✅ |

校验项（逐条）：`oldExists`（活数据存在）· `oldIsHashShape`（确为伪语义祖先形态）· `newShapeOk`（`tree_<小写 slug>`）·
`newNoTimestamp`（**⛔ 结果 id 不得带时间戳/hash**）· `newNoSegment`（不得带 `_s<N>_`）· `newNotOccupied`（不与 treeId/池 id/边 id 碰撞）· `isBlocking`（确实阻塞 ≥1 条 BLOCK）。

| 断言 | 结果 |
|---|---|
| 提案条数 = 7 | ✅ |
| 覆盖面**恰好**等于 BLOCK 的最近伪语义祖先集合 | ✅（期望 7 个） |
| P0 内部无祖先-后代关系 | ✅ |
| 结果 id 全部无时间戳/hash | ✅ |
| 全部无碰撞 | ✅ |
| 校验结论 | **`P0_PROPOSAL_VALID`** |

> 覆盖面之所以必须**恰好**相等：多一个就是偷偷扩范围（本批不许把 1521 批次的事拉进来）；少一个就是前置残缺（T3 仍会有 BLOCK 无法解释）。

## 2. 命名依据（宪法 v1.1：正文语义 > 既有关系 > 名称/tags > 挂载位置）

### 1. `tree_1786026688588_0mtvxh`「读写锁的实现分析」 → `tree_java_lock_rwlock_implementation`

| 证据层级 | 内容 |
|---|---|
| ① 正文语义 | card.tabs 为空 —— 无正文（优先级 1 不适用） |
| ② 既有关系（edges） | 出边 belongs-to -> asplit_rwlock_mechanism + asplit_rw_state_write_acquire / _write_held / _write_waiting / … （即一条读写锁状态机）；入边 belongs-to <- 父节点「读写锁」 |
| ③ 名称 / tags | name = tags = 「读写锁的实现分析」 |
| ④ 挂载位置 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析；兄弟「锁降级」 |

- **slug 取舍**：取 name 主干 rwlock + 节点性质 implementation（=「实现分析」）。**刻意不用 mechanism**：它的子项里已有一条 asplit_rwlock_mechanism「读写锁实现机制」，两个 id 都以 mechanism 结尾会互相遮蔽。
- **备选**：`tree_java_lock_rwlock_mechanism` · `tree_java_lock_readwrite_lock_impl`
- **子项一致性提示**：子项名（读写锁实现机制 / 写锁申请 / 读锁等待 …）与父名共享「读写锁 / 写锁 / 读锁」词根 → 一致
- **它阻塞的子项**（9 条）：读写锁实现机制 / 写锁申请（tryAcquire） / 写锁持有（独占可重入） / 写锁等待 / 写锁释放（tryRelease） / 读锁申请（tryAcquireShared） / 读锁持有（共享可重入） / 读锁等待 / 读锁释放（tryReleaseShared）

### 2. `tree_1786245817114_ds2keo`「RDB持久化」 → `tree_redis_rdb_persistence`

| 证据层级 | 内容 |
|---|---|
| ① 正文语义 | card.tabs 为空 —— 无正文 |
| ② 既有关系（edges） | 出边 belongs-to -> asplit_rdb_save_cmd / asplit_rdb_state_fork / _child_write / _parent_serve / _replaced（即 RDB 落盘流程的状态机）；入边 belongs-to <- 父节点「持久化选项」 |
| ③ 名称 / tags | name = tags = 「RDB持久化」 |
| ④ 挂载位置 | 知识宇宙 > … > NoSQL > Redis > 持久化选项 > RDB持久化；兄弟「快照持久化 / AOF持久化」 |

- **slug 取舍**：name 拆为 RDB + 持久化。⚠️ **已预检到一个 id 形态问题**：子项 nodeRef 形如 asplit_rdb_save_cmd，其 slug 自带 rdb_ 前缀 → 若 T3 冻结映射表采用「父 id 全名 + slug」拼接，会得到 tree_redis_rdb_persistence_rdb_save_cmd（rdb 重复）。故本项与 alternative tree_redis_rdb 一起提交裁决（见 review 文档 §3 子项 id 形态预演）。
- **备选**：`tree_redis_rdb` · `tree_redis_persistence`
- **子项一致性提示**：子项名（SAVE/BGSAVE 命令到达 / fork 子进程 / 子进程写临时 RDB 文件 …）与父名无字面重叠，但语义上是 RDB 的流程状态 → 属「正文语义」层面的父子一致，非字面重叠
- **它阻塞的子项**（6 条）：SAVE / BGSAVE 命令到达 / fork 子进程（写时复制） / 子进程写临时 RDB 文件 / 父进程继续处理命令 / 临时文件原子替换 dump.rdb / 启动时载入 RDB 恢复数据

### 3. `tree_1784367544335_zorevp`「同步」 → `tree_java_jmm_synchronization`

| 证据层级 | 内容 |
|---|---|
| ① 正文语义 | card.tabs 为空 —— 无正文 |
| ② 既有关系（edges） | 出边 belongs-to -> asplit_mutex_lock「互斥锁」 / asplit_sync_block「同步代码块」（+ ThreadLocal、两处 k_ 实体）；入边 belongs-to <- 父节点「内存模型」 |
| ③ 名称 / tags | name = tags = 「同步」 |
| ④ 挂载位置 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 同步；兄弟 主内存 / 本地内存 / happens-before规则 / 内存间操作 / 顺序一致性 / 处理器的内存模型 |

- **slug 取舍**：挂载位置（java并发编程 > 内存模型）+ 节点名「同步」→ namespace 用 tree_java_jmm_（Java Memory Model），slug 用 synchronization。**不用 tree_java_concurrency_**：父容器是「内存模型」而不是整个并发域，用 jmm 更精确，且为后续「内存模型」整支的语义化留了唯一命名空间。
- **备选**：`tree_java_concurrency_synchronization` · `tree_java_jmm_sync`
- **子项一致性提示**：子项「同步代码块」与父名「同步」共享词根 → 一致；「互斥锁」属 JMM 同步的实现形式，一致
- **它阻塞的子项**（2 条）：互斥锁 / 同步代码块

### 4. `tree_1783873515748_edsjp0`「Java泛型」 → `tree_java_syntax_generics`

| 证据层级 | 内容 |
|---|---|
| ① 正文语义 | 「泛型编程（泛型），或参数化类型，或参数多态性，是 J2SE 5.0 中引入的主要特性之一 …… 泛型的主要目的是确保类型安全 …… 类型擦除」—— **有正文**（优先级 1 命中） |
| ② 既有关系（edges） | 出边 belongs-to -> asplit_generic_method / asplit_generic_constructor（+ 2 个 k_ 实体）；入边 belongs-to <- 父节点「引用类型」 |
| ③ 名称 / tags | name = 「Java泛型」；tags = [Java泛型, 泛型, Java面试突击] |
| ④ 挂载位置 | 知识宇宙 > … > java > Java syntax > 数据类型 > 引用类型 > Java泛型；兄弟 数组 / Java类 / 接口 |

- **slug 取舍**：7 个里**唯一有正文**的节点，正文把语义锚定在「泛型 / 参数化类型 / 类型擦除」→ slug = generics。namespace 取挂载路径上的 Java syntax 域（既有 tree_java_syntax_* 40 条 + tree_java_syntax_zh_* 28 条先例）。
- **备选**：`tree_java_syntax_generic` · `tree_java_generics`
- **子项一致性提示**：子项「泛型方法 / 泛型构造函数」与父名共享「泛型」词根 → 一致
- **它阻塞的子项**（2 条）：泛型方法 / 泛型构造函数

### 5. `tree_1786235757428_osu8oj`「zset」 → `tree_redis_zset`

| 证据层级 | 内容 |
|---|---|
| ① 正文语义 | card.tabs 为空 —— 无正文 |
| ② 既有关系（edges） | 出边 belongs-to -> asplit_zrank / asplit_zrange（Redis ZSET 的两个命令）；入边 belongs-to <- 父节点「数据类型」 |
| ③ 名称 / tags | name = tags = 「zset」 |
| ④ 挂载位置 | 知识宇宙 > … > NoSQL > Redis > 数据类型 > zset；兄弟 String / Hash / List / Set |

- **slug 取舍**：name 即 slug。namespace 取 tree_redis_。与兄弟（String/Hash/List/Set）并列时形成 tree_redis_string / tree_redis_hash / tree_redis_list / tree_redis_set 的整齐序列 —— 这也让后续 1521 批次能无缝续接，不需二次改名。
- **备选**：`tree_redis_data_type_zset` · `tree_redis_datatype_zset`
- **子项一致性提示**：子项「ZRANK / ZRANGE」是 zset 的命令，语义一致（字面不重叠属正常）
- **它阻塞的子项**（2 条）：ZRANK / ZRANGE

### 6. `tree_1786340438649_tbr6gs`「缓存异常」 → `tree_redis_cache_anomaly`

| 证据层级 | 内容 |
|---|---|
| ① 正文语义 | card.tabs 为空 —— 无正文 |
| ② 既有关系（edges） | 出边 belongs-to -> k_1786340456749_kkjwb4 等 5 个 k_ 实体（其子项 asplit_hot_data/asplit_cold_data 由**池 ref** 指向）；入边 belongs-to <- demo_redis |
| ③ 名称 / tags | name = tags = 「缓存异常」 |
| ④ 挂载位置 | 知识宇宙 > … > NoSQL > Redis > 缓存异常；兄弟 数据结构 / 数据类型 / 持久化选项 / …（直接挂在 Redis 下） |

- **slug 取舍**：name 拆为 缓存 + 异常 → cache_anomaly。
- **备选**：`tree_redis_cache_exception` · `tree_redis_cache_failure`
- **子项一致性提示**：⚠️ **需人工看一眼**：子项是「热点数据 / 冷数据」，而节点名是「缓存异常」。热/冷数据本身不是异常，更像缓存失效/击穿的前置概念。本批**只负责给父节点定名**，子项归属是否错挂属**结构批次**（OOP/CS/DB/虚拟化结构批次）的问题，记入待办，不在本批处理。
- **它阻塞的子项**（2 条）：热点数据 / 冷数据

### 7. `tree_1785862113590_a5v1ya`「顺序一致性」 → `tree_java_jmm_sequential_consistency`

| 证据层级 | 内容 |
|---|---|
| ① 正文语义 | card.tabs 为空 —— 无正文 |
| ② 既有关系（edges） | 出边 belongs-to -> asplit_data_race「数据竞争」；入边 belongs-to <- 「内存模型」，另有 `违反` <- asplit_data_race（**唯一一条语义动词边**：数据竞争「违反」顺序一致性） |
| ③ 名称 / tags | name = tags = 「顺序一致性」 |
| ④ 挂载位置 | 知识宇宙 > … > java > java并发编程 > 内存模型 > 顺序一致性；与「同步」同父（内存模型） |

- **slug 取舍**：name 直译 sequential_consistency（并发理论标准译法）。与 #3 共用 tree_java_jmm_ namespace。
- **备选**：`tree_java_jmm_order_consistency` · `tree_java_concurrency_sequential_consistency`
- **子项一致性提示**：子项「数据竞争」与父名无字面重叠，但入边里有一条 `违反` 边（数据竞争违反顺序一致性）→ 语义关系明确，id 形态整洁
- **它阻塞的子项**（1 条）：数据竞争

## 3. T3 133 项 `semanticAncestorGap` 重算（本批的**唯一目的**）

| 读数 | P0 前 | P0 后 | Δ |
|---|---:|---:|---:|
| HIGH（gap=0，可自动接受） | 68 | 92 | **+24** |
| MEDIUM（gap 1..3，须人工确认） | 38 | 38 | 0 |
| BLOCK（gap>3，不得自动给名） | 27 | 3 | **-24** |
| gap 分布 | `{"0":68,"1":11,"2":24,"3":3,"4":12,"5":4,"6":11}` | `{"0":92,"1":11,"2":24,"3":3,"6":3}` | — |

**解封 24 条**：`semanticAncestorGap` 由 >3 降为 0，状态由 `blocked` 升为 `pending`（HIGH，可自动接受）。

| 旧 treeId | name | gap 前 → 后 | 语义祖先（P0 后） |
|---|---|---|---|
| `asplit_s1_asplit_mutex_lock` | 互斥锁 | **4 → 0** | `tree_java_jmm_synchronization` |
| `asplit_s1_asplit_sync_block` | 同步代码块 | **4 → 0** | `tree_java_jmm_synchronization` |
| `asplit_s1_asplit_data_race` | 数据竞争 | **4 → 0** | `tree_java_jmm_sequential_consistency` |
| `asplit_s2_asplit_rwlock_mechanism` | 读写锁实现机制 | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s2_asplit_rw_state_write_acquire` | 写锁申请（tryAcquire） | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s2_asplit_rw_state_write_held` | 写锁持有（独占可重入） | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s2_asplit_rw_state_write_waiting` | 写锁等待 | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s2_asplit_rw_state_write_released` | 写锁释放（tryRelease） | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s2_asplit_rw_state_read_acquire` | 读锁申请（tryAcquireShared） | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s2_asplit_rw_state_read_held` | 读锁持有（共享可重入） | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s2_asplit_rw_state_read_waiting` | 读锁等待 | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s2_asplit_rw_state_read_released` | 读锁释放（tryReleaseShared） | **4 → 0** | `tree_java_lock_rwlock_implementation` |
| `asplit_s1_asplit_generic_method` | 泛型方法 | **5 → 0** | `tree_java_syntax_generics` |
| `asplit_s1_asplit_generic_constructor` | 泛型构造函数 | **5 → 0** | `tree_java_syntax_generics` |
| `asplit_s1_asplit_zrank` | ZRANK | **6 → 0** | `tree_redis_zset` |
| `asplit_s1_asplit_zrange` | ZRANGE | **6 → 0** | `tree_redis_zset` |
| `asplit_s1_asplit_hot_data` | 热点数据 | **5 → 0** | `tree_redis_cache_anomaly` |
| `asplit_s1_asplit_cold_data` | 冷数据 | **5 → 0** | `tree_redis_cache_anomaly` |
| `asplit_s2_asplit_rdb_save_cmd` | SAVE / BGSAVE 命令到达 | **6 → 0** | `tree_redis_rdb_persistence` |
| `asplit_s2_asplit_rdb_state_fork` | fork 子进程（写时复制） | **6 → 0** | `tree_redis_rdb_persistence` |
| `asplit_s2_asplit_rdb_state_child_write` | 子进程写临时 RDB 文件 | **6 → 0** | `tree_redis_rdb_persistence` |
| `asplit_s2_asplit_rdb_state_parent_serve` | 父进程继续处理命令 | **6 → 0** | `tree_redis_rdb_persistence` |
| `asplit_s2_asplit_rdb_state_replaced` | 临时文件原子替换 dump.rdb | **6 → 0** | `tree_redis_rdb_persistence` |
| `asplit_s2_asplit_rdb_state_loaded` | 启动时载入 RDB 恢复数据 | **6 → 0** | `tree_redis_rdb_persistence` |

**仍 BLOCK 的 3 条**（不属本批）：
- `asplit_s2_asplit_mysql_tool_backup` 备份恢复工具（gap=6）
- `asplit_s2_asplit_mysql_tool_security` 安全管理工具（gap=6）
- `asplit_s2_asplit_mysql_tool_cluster` 集群管理工具（gap=6）

**冻结结论**：`frozenMappingProducible` = false（P0 后仍需 T3-P1 把 38 条 MEDIUM 逐条确认，并把 3 条 projection 族另案处置）

## 4. 子项 id 形态预演（决定 openDecision D1）

P0 后解封的 24 条，其命名空间变成**父节点本身**（gap=0）。因此子项最终 id 形态由 T3 冻结映射表的拼接策略决定：

| 子项 | 父（=新命名空间） | slug | 选项 A：父全名 + slug | 选项 B：父去末段 + slug |
|---|---|---|---|---|
| 互斥锁 | `tree_java_jmm_synchronization` | `mutex_lock` | `tree_java_jmm_synchronization_mutex_lock` | `tree_java_jmm_mutex_lock` |
| 同步代码块 | `tree_java_jmm_synchronization` | `sync_block` | `tree_java_jmm_synchronization_sync_block` | `tree_java_jmm_sync_block` |
| 数据竞争 | `tree_java_jmm_sequential_consistency` | `data_race` | `tree_java_jmm_sequential_consistency_data_race` | `tree_java_jmm_sequential_data_race` |
| 读写锁实现机制 | `tree_java_lock_rwlock_implementation` | `rwlock_mechanism` | `tree_java_lock_rwlock_implementation_rwlock_mechanism` | `tree_java_lock_rwlock_rwlock_mechanism` |
| 写锁申请（tryAcquire） | `tree_java_lock_rwlock_implementation` | `rw_state_write_acquire` | `tree_java_lock_rwlock_implementation_rw_state_write_acquire` | `tree_java_lock_rwlock_rw_state_write_acquire` |
| 写锁持有（独占可重入） | `tree_java_lock_rwlock_implementation` | `rw_state_write_held` | `tree_java_lock_rwlock_implementation_rw_state_write_held` | `tree_java_lock_rwlock_rw_state_write_held` |
| 写锁等待 | `tree_java_lock_rwlock_implementation` | `rw_state_write_waiting` | `tree_java_lock_rwlock_implementation_rw_state_write_waiting` | `tree_java_lock_rwlock_rw_state_write_waiting` |
| 写锁释放（tryRelease） | `tree_java_lock_rwlock_implementation` | `rw_state_write_released` | `tree_java_lock_rwlock_implementation_rw_state_write_released` | `tree_java_lock_rwlock_rw_state_write_released` |
| 读锁申请（tryAcquireShared） | `tree_java_lock_rwlock_implementation` | `rw_state_read_acquire` | `tree_java_lock_rwlock_implementation_rw_state_read_acquire` | `tree_java_lock_rwlock_rw_state_read_acquire` |
| 读锁持有（共享可重入） | `tree_java_lock_rwlock_implementation` | `rw_state_read_held` | `tree_java_lock_rwlock_implementation_rw_state_read_held` | `tree_java_lock_rwlock_rw_state_read_held` |
| 读锁等待 | `tree_java_lock_rwlock_implementation` | `rw_state_read_waiting` | `tree_java_lock_rwlock_implementation_rw_state_read_waiting` | `tree_java_lock_rwlock_rw_state_read_waiting` |
| 读锁释放（tryReleaseShared） | `tree_java_lock_rwlock_implementation` | `rw_state_read_released` | `tree_java_lock_rwlock_implementation_rw_state_read_released` | `tree_java_lock_rwlock_rw_state_read_released` |
| 泛型方法 | `tree_java_syntax_generics` | `generic_method` | `tree_java_syntax_generics_generic_method` | `tree_java_syntax_generic_method` |
| 泛型构造函数 | `tree_java_syntax_generics` | `generic_constructor` | `tree_java_syntax_generics_generic_constructor` | `tree_java_syntax_generic_constructor` |
| ZRANK | `tree_redis_zset` | `zrank` | `tree_redis_zset_zrank` | `tree_redis_zrank` |
| ZRANGE | `tree_redis_zset` | `zrange` | `tree_redis_zset_zrange` | `tree_redis_zrange` |
| 热点数据 | `tree_redis_cache_anomaly` | `hot_data` | `tree_redis_cache_anomaly_hot_data` | `tree_redis_cache_hot_data` |
| 冷数据 | `tree_redis_cache_anomaly` | `cold_data` | `tree_redis_cache_anomaly_cold_data` | `tree_redis_cache_cold_data` |
| SAVE / BGSAVE 命令到达 | `tree_redis_rdb_persistence` | `rdb_save_cmd` | `tree_redis_rdb_persistence_rdb_save_cmd` | `tree_redis_rdb_rdb_save_cmd` |
| fork 子进程（写时复制） | `tree_redis_rdb_persistence` | `rdb_state_fork` | `tree_redis_rdb_persistence_rdb_state_fork` | `tree_redis_rdb_rdb_state_fork` |
| 子进程写临时 RDB 文件 | `tree_redis_rdb_persistence` | `rdb_state_child_write` | `tree_redis_rdb_persistence_rdb_state_child_write` | `tree_redis_rdb_rdb_state_child_write` |
| 父进程继续处理命令 | `tree_redis_rdb_persistence` | `rdb_state_parent_serve` | `tree_redis_rdb_persistence_rdb_state_parent_serve` | `tree_redis_rdb_rdb_state_parent_serve` |
| 临时文件原子替换 dump.rdb | `tree_redis_rdb_persistence` | `rdb_state_replaced` | `tree_redis_rdb_persistence_rdb_state_replaced` | `tree_redis_rdb_rdb_state_replaced` |
| 启动时载入 RDB 恢复数据 | `tree_redis_rdb_persistence` | `rdb_state_loaded` | `tree_redis_rdb_persistence_rdb_state_loaded` | `tree_redis_rdb_rdb_state_loaded` |

> ⚠️ **必须看这张表**：选项 A 是层级正确的形式（父即命名空间时），但会暴露 slug 冗余 —— 例如 `RDB持久化` 的子项 slug 自带 `rdb_` 前缀，A 形式会得到 `…_rdb_persistence_rdb_save_cmd`。选项 B 会砍掉父名的末段，在 `zset` 这类单段父名上几乎等同于「把子项提到 Redis 域」，语义会变宽。**D1 未定，T3 不得冻结映射表。**

## 5. 明确排除：3 条 projection / colon 族 BLOCK

| oldTreeId | name | gap | 父节点 | 父 id 族 |
|---|---|---:|---|---|
| `asplit_s2_asplit_mysql_tool_backup` | 备份恢复工具 | 6 | 服务层 | `projection:mysql-concept:mysql-server-structure:k_1782032275682_61auc4` |
| `asplit_s2_asplit_mysql_tool_security` | 安全管理工具 | 6 | 服务层 | `projection:mysql-concept:mysql-server-structure:k_1782032275682_61auc4` |
| `asplit_s2_asplit_mysql_tool_cluster` | 集群管理工具 | 6 | 服务层 | `projection:mysql-concept:mysql-server-structure:k_1782032275682_61auc4` |

> 这 3 条的祖先链是：`服务层`（**projection:***）→ `结构`（**colon 族**）→ `MySQL Server`（colon 族）→ `MySQL`（**段位** `_s15_`）→ … → `数据库管理`（语义）。
> 中间全是 projection / colon / 段位 id，**没有一个是「伪语义 tree 祖先」** → 给它们定名解决不了问题，
> 真问题是「这三条 asplit_* 是否该挂在 projection 投影节点下」（挂载点合法性），属**结构批次**，不在 P0，也不在 T3。

## 6. 引用闭合与预期 diff

| 项 | 值 |
|---|---|
| 内存克隆改名节点数 | 7（应 = 7） |
| 因改名而改写的 `treebind` 边 id | 46 |
| 被触碰的边 `source`/`target` | **0**（须 0：本批绝不改边的内容） |
| `tree-data.json` 节点数 | 3219 → 3219（Δ0） |
| `knowledge-edges.json` 边数 | 4166 → 4166（Δ0） |
| `node-pool.json` / `questions.json` | **0 改动** |
| 被改名旧 id 的残留（受控原文扫描） | 0 ✅ |

## 7. 结论与下一步

**`P0_DRY_RUN_OK`** · 提案校验 **`P0_PROPOSAL_VALID`**

硬阻塞：无 ✅

下一步：
1. 人审 `t3-p0-review.md`：逐条裁决 7 个名字（通过 / 改名 / 另裁）；
2. 裁定 openDecision **D1**（子项 id 拼接策略）与 **D2**（域 slug 命名空间是否作为 1521 批次统一约定）；
3. 全部 approved 后：`t3-p0` 批次 apply（备份 → 8 闸门 → 落盘 → 独立复验 → 单独提交 `t3-p0-ancestor-semanticization`）；
4. apply 后重跑 T3 dry-run，133 项读数应变为 HIGH 92 / MEDIUM 38 / BLOCK 3。
