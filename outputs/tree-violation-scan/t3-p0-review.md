# T3-P0 · 命名复核清单（人工裁决）

> **只读批次产物** —— 本清单不产生任何数据变化。本批只改 **7 个 treeId**；`asplit_*` 133 项、池、边内容一个字节都不动。

生成时间：2026-09-14T12:09:02.569Z

## 裁决规则（宪法 v1.1 命名来源优先级）

```text
① 正文语义（card.tabs 里的解释长文）
② 既有关系（knowledge-edges 的 belongs-to / 违反 等）
③ 名称 / tags
④ 挂载位置（路径上的域）
→ 逐级取用；前一级能定住语义时不得用后一级
⛔ 结果 id 不得带时间戳 / hash / _s<N>_ 段位编号（用户对 asplit_s132_base_theory 的裁决）
```

## 一、7 个名字逐条裁决

| # | 旧 treeId | 旧 name | 挂载路径（父级） | 建议新 treeId | namespace | 备选 | 裁决 |
|---|---|---|---|---|---|---|---|
| 1 | `tree_1786026688588_0mtvxh` | 读写锁的实现分析 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 | **`tree_java_lock_rwlock_implementation`** | `tree_java_lock_` | `tree_java_lock_rwlock_mechanism`<br>`tree_java_lock_readwrite_lock_impl` | ☐ 通过 ☐ 改名 ☐ 另裁 |
| 2 | `tree_1786245817114_ds2keo` | RDB持久化 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 | **`tree_redis_rdb_persistence`** | `tree_redis_` | `tree_redis_rdb`<br>`tree_redis_persistence` | ☐ 通过 ☐ 改名 ☐ 另裁 |
| 3 | `tree_1784367544335_zorevp` | 同步 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 | **`tree_java_jmm_synchronization`** | `tree_java_jmm_` | `tree_java_concurrency_synchronization`<br>`tree_java_jmm_sync` | ☐ 通过 ☐ 改名 ☐ 另裁 |
| 4 | `tree_1783873515748_edsjp0` | Java泛型 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 | **`tree_java_syntax_generics`** | `tree_java_syntax_` | `tree_java_syntax_generic`<br>`tree_java_generics` | ☐ 通过 ☐ 改名 ☐ 另裁 |
| 5 | `tree_1786235757428_osu8oj` | zset | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 数据类型 | **`tree_redis_zset`** | `tree_redis_` | `tree_redis_data_type_zset`<br>`tree_redis_datatype_zset` | ☐ 通过 ☐ 改名 ☐ 另裁 |
| 6 | `tree_1786340438649_tbr6gs` | 缓存异常 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis | **`tree_redis_cache_anomaly`** | `tree_redis_` | `tree_redis_cache_exception`<br>`tree_redis_cache_failure` | ☐ 通过 ☐ 改名 ☐ 另裁 |
| 7 | `tree_1785862113590_a5v1ya` | 顺序一致性 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 | **`tree_java_jmm_sequential_consistency`** | `tree_java_jmm_` | `tree_java_jmm_order_consistency`<br>`tree_java_concurrency_sequential_consistency` | ☐ 通过 ☐ 改名 ☐ 另裁 |

### 逐条证据（供裁决时对照）

#### 1. 「读写锁的实现分析」 → `tree_java_lock_rwlock_implementation`

- ① **正文**：card.tabs 为空 —— 无正文（优先级 1 不适用）
- ② **既有关系**：出边 belongs-to -> asplit_rwlock_mechanism + asplit_rw_state_write_acquire / _write_held / _write_waiting / … （即一条读写锁状态机）；入边 belongs-to <- 父节点「读写锁」
- ③ **名称/tags**：name = tags = 「读写锁的实现分析」
- ④ **挂载位置**：知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析；兄弟「锁降级」
- **slug 取舍**：取 name 主干 rwlock + 节点性质 implementation（=「实现分析」）。**刻意不用 mechanism**：它的子项里已有一条 asplit_rwlock_mechanism「读写锁实现机制」，两个 id 都以 mechanism 结尾会互相遮蔽。
- **子项一致性提示**：子项名（读写锁实现机制 / 写锁申请 / 读锁等待 …）与父名共享「读写锁 / 写锁 / 读锁」词根 → 一致

#### 2. 「RDB持久化」 → `tree_redis_rdb_persistence`

- ① **正文**：card.tabs 为空 —— 无正文
- ② **既有关系**：出边 belongs-to -> asplit_rdb_save_cmd / asplit_rdb_state_fork / _child_write / _parent_serve / _replaced（即 RDB 落盘流程的状态机）；入边 belongs-to <- 父节点「持久化选项」
- ③ **名称/tags**：name = tags = 「RDB持久化」
- ④ **挂载位置**：知识宇宙 > … > NoSQL > Redis > 持久化选项 > RDB持久化；兄弟「快照持久化 / AOF持久化」
- **slug 取舍**：name 拆为 RDB + 持久化。⚠️ **已预检到一个 id 形态问题**：子项 nodeRef 形如 asplit_rdb_save_cmd，其 slug 自带 rdb_ 前缀 → 若 T3 冻结映射表采用「父 id 全名 + slug」拼接，会得到 tree_redis_rdb_persistence_rdb_save_cmd（rdb 重复）。故本项与 alternative tree_redis_rdb 一起提交裁决（见 review 文档 §3 子项 id 形态预演）。
- **子项一致性提示**：子项名（SAVE/BGSAVE 命令到达 / fork 子进程 / 子进程写临时 RDB 文件 …）与父名无字面重叠，但语义上是 RDB 的流程状态 → 属「正文语义」层面的父子一致，非字面重叠

#### 3. 「同步」 → `tree_java_jmm_synchronization`

- ① **正文**：card.tabs 为空 —— 无正文
- ② **既有关系**：出边 belongs-to -> asplit_mutex_lock「互斥锁」 / asplit_sync_block「同步代码块」（+ ThreadLocal、两处 k_ 实体）；入边 belongs-to <- 父节点「内存模型」
- ③ **名称/tags**：name = tags = 「同步」
- ④ **挂载位置**：知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 同步；兄弟 主内存 / 本地内存 / happens-before规则 / 内存间操作 / 顺序一致性 / 处理器的内存模型
- **slug 取舍**：挂载位置（java并发编程 > 内存模型）+ 节点名「同步」→ namespace 用 tree_java_jmm_（Java Memory Model），slug 用 synchronization。**不用 tree_java_concurrency_**：父容器是「内存模型」而不是整个并发域，用 jmm 更精确，且为后续「内存模型」整支的语义化留了唯一命名空间。
- **子项一致性提示**：子项「同步代码块」与父名「同步」共享词根 → 一致；「互斥锁」属 JMM 同步的实现形式，一致

#### 4. 「Java泛型」 → `tree_java_syntax_generics`

- ① **正文**：「泛型编程（泛型），或参数化类型，或参数多态性，是 J2SE 5.0 中引入的主要特性之一 …… 泛型的主要目的是确保类型安全 …… 类型擦除」—— **有正文**（优先级 1 命中）
- ② **既有关系**：出边 belongs-to -> asplit_generic_method / asplit_generic_constructor（+ 2 个 k_ 实体）；入边 belongs-to <- 父节点「引用类型」
- ③ **名称/tags**：name = 「Java泛型」；tags = [Java泛型, 泛型, Java面试突击]
- ④ **挂载位置**：知识宇宙 > … > java > Java syntax > 数据类型 > 引用类型 > Java泛型；兄弟 数组 / Java类 / 接口
- **slug 取舍**：7 个里**唯一有正文**的节点，正文把语义锚定在「泛型 / 参数化类型 / 类型擦除」→ slug = generics。namespace 取挂载路径上的 Java syntax 域（既有 tree_java_syntax_* 40 条 + tree_java_syntax_zh_* 28 条先例）。
- **子项一致性提示**：子项「泛型方法 / 泛型构造函数」与父名共享「泛型」词根 → 一致

#### 5. 「zset」 → `tree_redis_zset`

- ① **正文**：card.tabs 为空 —— 无正文
- ② **既有关系**：出边 belongs-to -> asplit_zrank / asplit_zrange（Redis ZSET 的两个命令）；入边 belongs-to <- 父节点「数据类型」
- ③ **名称/tags**：name = tags = 「zset」
- ④ **挂载位置**：知识宇宙 > … > NoSQL > Redis > 数据类型 > zset；兄弟 String / Hash / List / Set
- **slug 取舍**：name 即 slug。namespace 取 tree_redis_。与兄弟（String/Hash/List/Set）并列时形成 tree_redis_string / tree_redis_hash / tree_redis_list / tree_redis_set 的整齐序列 —— 这也让后续 1521 批次能无缝续接，不需二次改名。
- **子项一致性提示**：子项「ZRANK / ZRANGE」是 zset 的命令，语义一致（字面不重叠属正常）

#### 6. 「缓存异常」 → `tree_redis_cache_anomaly`

- ① **正文**：card.tabs 为空 —— 无正文
- ② **既有关系**：出边 belongs-to -> k_1786340456749_kkjwb4 等 5 个 k_ 实体（其子项 asplit_hot_data/asplit_cold_data 由**池 ref** 指向）；入边 belongs-to <- demo_redis
- ③ **名称/tags**：name = tags = 「缓存异常」
- ④ **挂载位置**：知识宇宙 > … > NoSQL > Redis > 缓存异常；兄弟 数据结构 / 数据类型 / 持久化选项 / …（直接挂在 Redis 下）
- **slug 取舍**：name 拆为 缓存 + 异常 → cache_anomaly。
- **子项一致性提示**：⚠️ **需人工看一眼**：子项是「热点数据 / 冷数据」，而节点名是「缓存异常」。热/冷数据本身不是异常，更像缓存失效/击穿的前置概念。本批**只负责给父节点定名**，子项归属是否错挂属**结构批次**（OOP/CS/DB/虚拟化结构批次）的问题，记入待办，不在本批处理。

#### 7. 「顺序一致性」 → `tree_java_jmm_sequential_consistency`

- ① **正文**：card.tabs 为空 —— 无正文
- ② **既有关系**：出边 belongs-to -> asplit_data_race「数据竞争」；入边 belongs-to <- 「内存模型」，另有 `违反` <- asplit_data_race（**唯一一条语义动词边**：数据竞争「违反」顺序一致性）
- ③ **名称/tags**：name = tags = 「顺序一致性」
- ④ **挂载位置**：知识宇宙 > … > java > java并发编程 > 内存模型 > 顺序一致性；与「同步」同父（内存模型）
- **slug 取舍**：name 直译 sequential_consistency（并发理论标准译法）。与 #3 共用 tree_java_jmm_ namespace。
- **子项一致性提示**：子项「数据竞争」与父名无字面重叠，但入边里有一条 `违反` 边（数据竞争违反顺序一致性）→ 语义关系明确，id 形态整洁

## 二、命名空间约定（openDecision D2）

| namespace | 覆盖子树 | 既有先例 | 采纳 |
|---|---|---|---|
| `tree_java_lock_` | java > 锁 子树 | tree_java_thread_lock「synchronized 锁」<br>tree_java_thread_monitor<br>tree_java_thread_state_* | ☐ 采纳 ☐ 否 |
| `tree_java_jmm_` | java > java并发编程 > 内存模型 子树 | 无 —— 新开 namespace | ☐ 采纳 ☐ 否 |
| `tree_java_syntax_` | java > Java syntax 子树 | tree_java_syntax_zh_*（既有 28 条）<br>tree_java_syntax_*（既有 40 条） | ☐ 采纳 ☐ 否 |
| `tree_redis_` | NoSQL > Redis 子树 | 无 —— 新开 namespace（tree_concept_* 是 MySQL 域，不得复用） | ☐ 采纳 ☐ 否 |

> 为什么不直接沿用祖先长 id 机械拼接：祖先长 id 形如 `tree_acm2012_software_notations_tools_programming_languages`，
> 拼接后会得到 `tree_acm2012_…_languages_mutex_lock` 这种**把上上层语义向下继承到一条本不属于它的枝上**的 id，
> 且后续「1521 非语义 id」批次无法共用前缀 → 必然二次改名。

## 三、子项 id 形态预演（openDecision D1）

下表是 P0 后 `gap=0`（命名空间 = 父节点本身）的子项在两种拼接策略下的实际形态。**看清这张表再定 D1**。

| 子项 | 父（=命名空间） | 选项 A（父全名+slug） | 选项 B（父去末段+slug） |
|---|---|---|---|
| 互斥锁 | `tree_java_jmm_synchronization` | `tree_java_jmm_synchronization_mutex_lock` | `tree_java_jmm_mutex_lock` |
| 同步代码块 | `tree_java_jmm_synchronization` | `tree_java_jmm_synchronization_sync_block` | `tree_java_jmm_sync_block` |
| 数据竞争 | `tree_java_jmm_sequential_consistency` | `tree_java_jmm_sequential_consistency_data_race` | `tree_java_jmm_sequential_data_race` |
| 读写锁实现机制 | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rwlock_mechanism` | `tree_java_lock_rwlock_rwlock_mechanism` |
| 写锁申请（tryAcquire） | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rw_state_write_acquire` | `tree_java_lock_rwlock_rw_state_write_acquire` |
| 写锁持有（独占可重入） | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rw_state_write_held` | `tree_java_lock_rwlock_rw_state_write_held` |
| 写锁等待 | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rw_state_write_waiting` | `tree_java_lock_rwlock_rw_state_write_waiting` |
| 写锁释放（tryRelease） | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rw_state_write_released` | `tree_java_lock_rwlock_rw_state_write_released` |
| 读锁申请（tryAcquireShared） | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rw_state_read_acquire` | `tree_java_lock_rwlock_rw_state_read_acquire` |
| 读锁持有（共享可重入） | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rw_state_read_held` | `tree_java_lock_rwlock_rw_state_read_held` |
| 读锁等待 | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rw_state_read_waiting` | `tree_java_lock_rwlock_rw_state_read_waiting` |
| 读锁释放（tryReleaseShared） | `tree_java_lock_rwlock_implementation` | `tree_java_lock_rwlock_implementation_rw_state_read_released` | `tree_java_lock_rwlock_rw_state_read_released` |
| 泛型方法 | `tree_java_syntax_generics` | `tree_java_syntax_generics_generic_method` | `tree_java_syntax_generic_method` |
| 泛型构造函数 | `tree_java_syntax_generics` | `tree_java_syntax_generics_generic_constructor` | `tree_java_syntax_generic_constructor` |
| ZRANK | `tree_redis_zset` | `tree_redis_zset_zrank` | `tree_redis_zrank` |
| ZRANGE | `tree_redis_zset` | `tree_redis_zset_zrange` | `tree_redis_zrange` |
| 热点数据 | `tree_redis_cache_anomaly` | `tree_redis_cache_anomaly_hot_data` | `tree_redis_cache_hot_data` |
| 冷数据 | `tree_redis_cache_anomaly` | `tree_redis_cache_anomaly_cold_data` | `tree_redis_cache_cold_data` |
| SAVE / BGSAVE 命令到达 | `tree_redis_rdb_persistence` | `tree_redis_rdb_persistence_rdb_save_cmd` | `tree_redis_rdb_rdb_save_cmd` |
| fork 子进程（写时复制） | `tree_redis_rdb_persistence` | `tree_redis_rdb_persistence_rdb_state_fork` | `tree_redis_rdb_rdb_state_fork` |
| 子进程写临时 RDB 文件 | `tree_redis_rdb_persistence` | `tree_redis_rdb_persistence_rdb_state_child_write` | `tree_redis_rdb_rdb_state_child_write` |
| 父进程继续处理命令 | `tree_redis_rdb_persistence` | `tree_redis_rdb_persistence_rdb_state_parent_serve` | `tree_redis_rdb_rdb_state_parent_serve` |
| 临时文件原子替换 dump.rdb | `tree_redis_rdb_persistence` | `tree_redis_rdb_persistence_rdb_state_replaced` | `tree_redis_rdb_rdb_state_replaced` |
| 启动时载入 RDB 恢复数据 | `tree_redis_rdb_persistence` | `tree_redis_rdb_persistence_rdb_state_loaded` | `tree_redis_rdb_rdb_state_loaded` |

☐ D1 选 A（层级拼接）   ☐ D1 选 B（去父末段）   ☐ 另裁：

## 四、apply 的前置条件

```text
上述 7 条 adJudication 全部 approved
+ D1 / D2 已裁定
+ 提案校验 = P0_PROPOSAL_VALID（当前 P0_PROPOSAL_VALID）
+ dry-run 硬阻塞 = 0（当前 0）
→ 才可进入 t3-p0 apply
```
