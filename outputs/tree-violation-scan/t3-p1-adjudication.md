# T3-P1 · `asplit_*` treeId 语义化 —— 批量证据裁决

> **只读批次产物** —— 本清单不产生任何数据变化。范围严格冻结为 `asplit_*` **生效 130 项**。

生成时间：2026-09-14T14:31:16.226Z

## 零、裁决结论

```text
scope           130
approved        130
pending         0
needs-review    0
blocked         0
重新推导        39   沿用既定值 91
谓词修正影响    23 条
档位迁移        {"HIGH→HIGH":92,"MEDIUM→MEDIUM":27,"MEDIUM→HIGH":11}
冻结闸门        MAPPING_FREEZE_OK
```

> **条件① 读法声明**：用户原话「gap ∈ {1,2,3}」是针对**冻结版谓词**下那 38 条 MEDIUM 说的。修正谓词把 23 条的最近语义祖先**拉近**（跳级消失）→ gap 由 1..3 降为 **0**。gap=0 在既定规则里是 HIGH ＝「可自动接受」，比 MEDIUM **更宽松**。故条件①按「**gap ≤ 3（无远跳）**」实现，并在此逐条公开档位迁移，不隐藏：

```text
  HIGH→HIGH   92 条
  MEDIUM→MEDIUM   27 条
  MEDIUM→HIGH   11 条
```

| 冻结前置条件 | 结果 |
|---|---|
| `approvedAll` | ✅ |
| `noPendingReviewBlocked` | ✅ |
| `gapWithin3` | ✅ |
| `noCollision` | ✅ |
| `noTsHash` | ✅ |
| `noAcmNamespace` | ✅ |
| `invarianceHolds` | ✅ |
| `scopeMatchesLive` | ✅ |

## 一、缺陷 1：语义祖先谓词过度排除（根因）

`scripts/dryrun-t3-asplit-semanticization.mjs:104` 的 `TREE_SHAPE = /^tree_[a-z0-9_]+$/` **附加了 `^tree_` 前缀要求**，而该谓词的既定意图（同文件 98–103 行注释）只是排除「时间戳/hash、`_s<N>_` 段位」。

本树存在既有的**人工语义 id 族**，其 id 不以 `tree_` 开头：`theory_domain_*`（30 条）、`demo_*`（16 条）、`chapter_db_*`（18 条）、`react_root`、`school_*`（4 条）。它们不含时间戳/hash，按既定意图应属「可靠语义祖先」。被误排除后，算法**跳级**到更远的 ACM CCS 分类层节点，产出的命名空间形如

```text
tree_acm2012_software_notations_tools_programming_languages   ← 6 段 ACM 分类路径
  ⇒ 树_acm2012_软件_符号与工具_编程语言_juc_tools
```

**这与 `D2 namespacePolicy` 直接冲突** —— 该 policy 明文规定：命名空间取「挂载路径上最近的**域** slug」，**而不是祖先长 id 的机械拼接**（原话，见 `t3-p0-naming.proposal.json` §namingRule）。

### 实测读数

| 项 | 值 |
|---|---:|
| 38 条 MEDIUM 中，修正谓词后**语义祖先发生变化**的 | **23** |
| 其中因祖先为**时间戳/hash** 而变化的 | **0** |
| 其中因祖先为**非 `tree_` 前缀的语义 id** 而变化的 | **23** |

> `crossHash = 0` 是关键反例分析：修正谓词**没有**放宽到时间戳 id —— 它只收回了那一条本就不该加的 `^tree_` 要求。

### 受影响条目（23 条）

| 旧 treeId | name | 冻结版语义祖先（跳级结果） | 修正后语义祖先 | gap |
|---|---|---|---|---:|
| `asplit_s1_asplit_newsql` | NewSQL | `tree_acm2012_information_systems_database_management` [数据库管理] | `chapter_db_01` [数据库系统] | 3→1 |
| `asplit_s106_db_modeling` | 数据库建模 | `tree_acm2012_information_systems_database_management` [数据库管理] | `chapter_db_13` [数据库设计] | 2→0 |
| `asplit_s1_asplit_module_export` | 模块导出 | `tree_acm2012_information_systems_world_wide_web` [全球信息网] | `react_root` [React] | 2→0 |
| `asplit_s1_asplit_module_import` | 模块导入 | `tree_acm2012_information_systems_world_wide_web` [全球信息网] | `react_root` [React] | 2→0 |
| `asplit_s1_asplit_js_control_flow` | 控制流 | `tree_acm2012_information_systems_world_wide_web` [全球信息网] | `react_root` [React] | 2→0 |
| `asplit_s1_asplit_function_design` | 函数设计 | `tree_acm2012_information_systems_world_wide_web` [全球信息网] | `react_root` [React] | 2→0 |
| `asplit_s1_asplit_js_expression` | 表达式 | `tree_acm2012_information_systems_world_wide_web` [全球信息网] | `react_root` [React] | 2→0 |
| `asplit_s1_asplit_graph_search` | 图搜索算法 | `tree_acm2012_algorithms` [算法] | `theory_domain_data_structures` [数据结构] | 1→0 |
| `asplit_s2_asplit_obj_trigger_new` | new 指令触发对象创建 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_state_class_loaded` | 类型加载校验 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_state_alloc` | 分配内存 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_state_zerofill` | 零值填充 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_state_set_header` | 设置对象头 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_state_init` | 执行构造方法 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_state_reference` | 引用定位（对象可用） | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_alloc_tlab` | TLAB（线程本地分配缓冲） | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_access_handle` | 句柄访问 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_access_direct` | 直接指针 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s2_asplit_obj_state_oom` | 内存溢出（OutOfMemoryError） | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 2→1 |
| `asplit_s1_asplit_blocking_io` | 阻塞非阻塞 I/O | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 1→0 |
| `asplit_s1_asplit_sync_async_io` | 同步异步 I/O | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_operating_systems` [操作系统] | 1→0 |
| `asplit_s132_base_theory` | BASE理论 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_distributed_systems` [分布式系统] | 1→0 |
| `asplit_s134_db_sharding` | 分库 | `tree_acm2012_systems_organization` [系统组织] | `theory_domain_distributed_systems` [分布式系统] | 1→0 |

### 缺陷 2：该缺陷同时造成一条**硬规则违反**

`asplit_s132_base_theory`（BASE理论）在冻结版下产出 `tree_acm2012_systems_k_1783170416767_yaym2f` —— 结果 id 内**含 13 位时间戳 + hash**，直接违反 `namingRule.hardConstraints[0]`（用户对 `asplit_s132_base_theory` 的同源裁决）。修正谓词后其最近语义祖先为「分布式系统」，产出 `tree_distributed_systems_base_theory` ⇒ 违反自动消失。

## 二、D1 操作化读法复核（台账 §T3 ⑤ 强制门）

`t3-p0-naming.proposal.json` 的 `openDecisions[0].operationalization.ambiguityFlag` 要求：**冻结映射表前必须以实际形态复核一次**。两种读法：

| 读法 | 公式 | 例（父 = `tree_redis_rdb_persistence`，子 slug = `rdb_save_cmd`）|
|---|---|---|
| R1 保留父全名 | 仅当父末段属纯容器词才剥离 | `tree_redis_rdb_persistence_rdb_save_cmd` |
| R2 一律剥离父末段 | namespace = 父 id 去末段 | `tree_redis_rdb_rdb_save_cmd` |

**裁定 = R2**，依据是 D2 的 `namespaceRegistry`：它**以「子树覆盖」定义命名空间**（`tree_java_lock_` covers *java > 锁 子树*；`tree_redis_` covers *Redis 子树*；`tree_java_jmm_` covers *内存模型子树*）。命名空间既然是**子树域**，就不是父节点全名 ⇒ R1 与 registry 自相矛盾。

> 本批对 91 条沿用既定值项**零影响**（它们已按 R2 形态冻结）。D1 两读法的**实质**差异只落在「父节点即命名空间源」（gap=0）且父末段非纯容器词的条目上，共 **101** 条：

| 旧 treeId | R1（保留父全名）| R2（剥离父末段）|
|---|---|---|
| `asplit_s1_asplit_mutex_lock` | `tree_java_jmm_synchronization_mutex_lock` | `tree_java_jmm_mutex_lock` |
| `asplit_s1_asplit_sync_block` | `tree_java_jmm_synchronization_sync_block` | `tree_java_jmm_sync_block` |
| `asplit_s1_asplit_data_race` | `tree_java_jmm_sequential_consistency_data_race` | `tree_java_jmm_sequential_data_race` |
| `asplit_s2_asplit_bias_acquire` | `tree_web_78137b704e08_bias_acquire` | `tree_web_bias_acquire` |
| `asplit_s2_asplit_bias_state_anonymous` | `tree_web_78137b704e08_bias_state_anonymous` | `tree_web_bias_state_anonymous` |
| `asplit_s2_asplit_bias_state_biased` | `tree_web_78137b704e08_bias_state_biased` | `tree_web_bias_state_biased` |
| `asplit_s2_asplit_bias_state_revoke_pending` | `tree_web_78137b704e08_bias_state_revoke_pending` | `tree_web_bias_state_revoke_pending` |
| `asplit_s2_asplit_bias_state_revoked` | `tree_web_78137b704e08_bias_state_revoked` | `tree_web_bias_state_revoked` |
| `asplit_s2_asplit_bias_state_bulk_rebiased` | `tree_web_78137b704e08_bias_state_bulk_rebiased` | `tree_web_bias_state_bulk_rebiased` |
| `asplit_s2_asplit_bias_state_bulk_revoked` | `tree_web_78137b704e08_bias_state_bulk_revoked` | `tree_web_bias_state_bulk_revoked` |
| `asplit_s2_asplit_bias_markword` | `tree_web_78137b704e08_bias_markword` | `tree_web_bias_markword` |
| `asplit_s2_asplit_rwlock_mechanism` | `tree_java_lock_rwlock_implementation_rwlock_mechanism` | `tree_java_lock_rwlock_rwlock_mechanism` |
| *（其余 89 条同形，见 FINAL.json `d1Recheck`）* | | |

> 若你的原意是 **R1**（一律保留父全名），只需一句话即可翻转 —— 届时上表 101 条随之改写，本批其余部分不受影响。

## 三、域命名空间表（D2 规范 `tree_<domain>_<semantic-slug>`）

| 直接父节点 | 父名 | domain token | 域 | 依据 |
|---|---|---|---|---|
| `tree_1782846767208_uw6zxc` | java并发编程 | `java_concurrency` | java并发编程 | D2 registry「按子树覆盖」→ java 并发子树；与 tree_java_jmm_（内存模型子树）平级不重叠 |
| `tree_1785934396723_afsojh` | 线程的状态 | `java_thread` | 线程的状态 | 既有 id 族 tree_java_thread_*（12 条） |
| `tree_1783867183132_g5tf12` | Java syntax | `java_syntax` | Java syntax | D2 namespaceRegistry 明列 tree_java_syntax_；既有族 57 条；P0 已用 |
| `tree_1782746457614_osttpr` | java | `java` | java | D2「挂载路径上最近的域」= java；内容为 Java I/O 模型 |
| `tree_1784820871692_uel7rq` | 编程语言理论 | `pl_theory` | 编程语言理论 | 父名直译（Programming Language Theory）；与 tree_wiki_en_compiler 的 compiler 域区分 |
| `tree_wiki_en_compiler_s3` | 编译器构建 | `compiler` | 编译器构建 | 挂载路径上的域节点「编译器」(tree_wiki_en_compiler)；剥离导入壳 wiki_en_ |
| `tree_1785225243163_ypgo3y` | 生命周期 | `java_fw` | 生命周期 | 挂载路径 Spring(tree_java_fw_spring)；既有 id 族 tree_java_fw_*（12 条） |
| `tree_wiki_en_database_s2` | 历史 | `db` | 历史 | 挂载路径上的域 = 数据库(demo_db)，剥离导入壳 demo_ |
| `chapter_db_13` | 数据库设计 | `db` | 数据库设计 | 挂载路径上的域 = 数据库(demo_db)；chapter_db_13 属导入章节壳 |
| `react_root` | React | `javascript` | React | 治理命名空间先例 governance:javascript:module-import / module-export；内容为 JS 语言概念 |
| `theory_domain_data_structures` | 数据结构 | `data_structures` | 数据结构 | 父名直译；剥离类型标记 theory_domain_ |
| `tree_1783263380057_57s6hh` | 内存管理 | `jvm` | 内存管理 | 蓝图 §92 明文示例 tree_jvm_obj_state_class_loaded；既有 id 族 tree_jvm_*（10 条） |
| `theory_domain_operating_systems` | 操作系统 | `operating_systems` | 操作系统 | 父名直译；剥离类型标记 theory_domain_ |
| `theory_domain_distributed_systems` | 分布式系统 | `distributed_systems` | 分布式系统 | 父名直译；剥离类型标记 theory_domain_ |
| `tree_acm2012_algorithms` | 算法 | `algorithms` | 算法 | 父名直译；ACM CCS 层不得作命名空间（D2 namespacePolicy） |

> `D2 hardLimit`：**domain 只是 ID namespace，不是 ontology 判定** —— 上表的 token 只承担「同一域内不再二次改名」的命名空间职责，不构成本体归属断言。

## 四、逐条裁决（130 项）

| # | 旧 treeId | name | 档位(草案→修正) | gap | 提议新 treeId | 命名空间来源 | 碰撞 | 裁决 |
|---|---|---|---|---:|---|---|---|---|
| 1 | `asplit_s1_asplit_concrete_class` | 具体类 | HIGH→HIGH | 0 | `tree_class_programming_concrete_class` | 沿用既定值 | free | ✅ |
| 2 | `asplit_s1_asplit_local_class` | 局部类 | HIGH→HIGH | 0 | `tree_class_programming_local_class` | 沿用既定值 | free | ✅ |
| 3 | `asplit_s1_asplit_mutex_lock` | 互斥锁 | HIGH→HIGH | 0 | `tree_java_jmm_mutex_lock` | 沿用既定值 | free | ✅ |
| 4 | `asplit_s1_asplit_sync_block` | 同步代码块 | HIGH→HIGH | 0 | `tree_java_jmm_sync_block` | 沿用既定值 | free | ✅ |
| 5 | `asplit_s1_asplit_data_race` | 数据竞争 | HIGH→HIGH | 0 | `tree_java_jmm_sequential_data_race` | 沿用既定值 | free | ✅ |
| 6 | `asplit_s19_juc_tools` | JUC 工具 | MEDIUM→MEDIUM | 2 | `tree_java_concurrency_juc_tools` | `java_concurrency` | free | ✅ |
| 7 | `asplit_s1_asplit_lazy_init` | 延迟初始化 | MEDIUM→MEDIUM | 2 | `tree_java_concurrency_lazy_init` | `java_concurrency` | free | ✅ |
| 8 | `asplit_s1_asplit_concurrency_container` | 并发容器 | MEDIUM→MEDIUM | 2 | `tree_java_concurrency_container` | `java_concurrency` | free | ✅ |
| 9 | `asplit_s18_asplit_memory_atomicity` | 内存原子性 | MEDIUM→MEDIUM | 2 | `tree_java_concurrency_memory_atomicity` | `java_concurrency` | free | ✅ |
| 10 | `asplit_s18_asplit_concurrency_mutex_lock` | 并发互斥锁 | MEDIUM→MEDIUM | 2 | `tree_java_concurrency_mutex_lock` | `java_concurrency` | free | ✅ |
| 11 | `asplit_s1_asplit_suspend_resume_methods` | suspend/resume 方法组 | MEDIUM→MEDIUM | 3 | `tree_java_thread_suspend_resume_methods` | `java_thread` | free | ✅ |
| 12 | `asplit_s1_asplit_stop_method` | stop 方法 | MEDIUM→MEDIUM | 3 | `tree_java_thread_stop_method` | `java_thread` | free | ✅ |
| 13 | `asplit_s2_asplit_bias_acquire` | 线程进入同步代码块 | HIGH→HIGH | 0 | `tree_web_bias_acquire` | 沿用既定值 | free | ✅ |
| 14 | `asplit_s2_asplit_bias_state_anonymous` | 匿名偏向态 | HIGH→HIGH | 0 | `tree_web_bias_state_anonymous` | 沿用既定值 | free | ✅ |
| 15 | `asplit_s2_asplit_bias_state_biased` | 已偏向态（记录线程 ID） | HIGH→HIGH | 0 | `tree_web_bias_state_biased` | 沿用既定值 | free | ✅ |
| 16 | `asplit_s2_asplit_bias_state_revoke_pending` | 撤销中（到达安全点） | HIGH→HIGH | 0 | `tree_web_bias_state_revoke_pending` | 沿用既定值 | free | ✅ |
| 17 | `asplit_s2_asplit_bias_state_revoked` | 已撤销（升级轻量级锁） | HIGH→HIGH | 0 | `tree_web_bias_state_revoked` | 沿用既定值 | free | ✅ |
| 18 | `asplit_s2_asplit_bias_state_bulk_rebiased` | 批量重偏向（epoch 递增） | HIGH→HIGH | 0 | `tree_web_bias_state_bulk_rebiased` | 沿用既定值 | free | ✅ |
| 19 | `asplit_s2_asplit_bias_state_bulk_revoked` | 批量撤销（整类禁用偏向） | HIGH→HIGH | 0 | `tree_web_bias_state_bulk_revoked` | 沿用既定值 | free | ✅ |
| 20 | `asplit_s2_asplit_bias_markword` | 对象头 Mark Word | HIGH→HIGH | 0 | `tree_web_bias_markword` | 沿用既定值 | free | ✅ |
| 21 | `asplit_s2_asplit_rwlock_mechanism` | 读写锁实现机制 | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rwlock_mechanism` | 沿用既定值 | free | ✅ |
| 22 | `asplit_s2_asplit_rw_state_write_acquire` | 写锁申请（tryAcquire） | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rw_state_write_acquire` | 沿用既定值 | free | ✅ |
| 23 | `asplit_s2_asplit_rw_state_write_held` | 写锁持有（独占可重入） | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rw_state_write_held` | 沿用既定值 | free | ✅ |
| 24 | `asplit_s2_asplit_rw_state_write_waiting` | 写锁等待 | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rw_state_write_waiting` | 沿用既定值 | free | ✅ |
| 25 | `asplit_s2_asplit_rw_state_write_released` | 写锁释放（tryRelease） | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rw_state_write_released` | 沿用既定值 | free | ✅ |
| 26 | `asplit_s2_asplit_rw_state_read_acquire` | 读锁申请（tryAcquireShared） | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rw_state_read_acquire` | 沿用既定值 | free | ✅ |
| 27 | `asplit_s2_asplit_rw_state_read_held` | 读锁持有（共享可重入） | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rw_state_read_held` | 沿用既定值 | free | ✅ |
| 28 | `asplit_s2_asplit_rw_state_read_waiting` | 读锁等待 | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rw_state_read_waiting` | 沿用既定值 | free | ✅ |
| 29 | `asplit_s2_asplit_rw_state_read_released` | 读锁释放（tryReleaseShared） | HIGH→HIGH | 0 | `tree_java_lock_rwlock_rw_state_read_released` | 沿用既定值 | free | ✅ |
| 30 | `asplit_s1_asplit_generic_method` | 泛型方法 | HIGH→HIGH | 0 | `tree_java_syntax_generic_method` | 沿用既定值 | free | ✅ |
| 31 | `asplit_s1_asplit_generic_constructor` | 泛型构造函数 | HIGH→HIGH | 0 | `tree_java_syntax_generic_constructor` | 沿用既定值 | free | ✅ |
| 32 | `asplit_s1_asplit_java_class` | Java 类 | MEDIUM→MEDIUM | 2 | `tree_java_syntax_java_class` | `java_syntax` | free | ✅ |
| 33 | `asplit_s1_asplit_file_input_stream` | FileInputStream | HIGH→HIGH | 0 | `tree_byte_stream_file_input_stream` | 沿用既定值 | free | ✅ |
| 34 | `asplit_s1_asplit_buffered_input_stream` | BufferedInputStream | HIGH→HIGH | 0 | `tree_byte_stream_buffered_input_stream` | 沿用既定值 | free | ✅ |
| 35 | `asplit_s1_asplit_data_input_stream` | DataInputStream | HIGH→HIGH | 0 | `tree_byte_stream_data_input_stream` | 沿用既定值 | free | ✅ |
| 36 | `asplit_s1_asplit_object_input_stream` | ObjectInputStream | HIGH→HIGH | 0 | `tree_byte_stream_object_input_stream` | 沿用既定值 | free | ✅ |
| 37 | `asplit_s1_asplit_java_io_group` | java.io | HIGH→HIGH | 0 | `tree_byte_stream_java_io_group` | 沿用既定值 | free | ✅ |
| 38 | `asplit_s1_asplit_file_reader` | FileReader | HIGH→HIGH | 0 | `tree_char_stream_file_reader` | 沿用既定值 | free | ✅ |
| 39 | `asplit_s1_asplit_buffered_reader` | BufferedReader | HIGH→HIGH | 0 | `tree_char_stream_buffered_reader` | 沿用既定值 | free | ✅ |
| 40 | `asplit_s1_asplit_java_io_file` | File 类 | HIGH→HIGH | 0 | `tree_java_common_java_io_file` | 沿用既定值 | free | ✅ |
| 41 | `asplit_s1_asplit_console_io` | 控制台 I/O | HIGH→HIGH | 0 | `tree_java_common_console_io` | 沿用既定值 | free | ✅ |
| 42 | `asplit_s1_asplit_java_nio_path` | Path | HIGH→HIGH | 0 | `tree_java_common_java_nio_path` | 沿用既定值 | free | ✅ |
| 43 | `asplit_s1_asplit_java_nio_filesystem` | FileSystem | HIGH→HIGH | 0 | `tree_java_common_java_nio_filesystem` | 沿用既定值 | free | ✅ |
| 44 | `asplit_s1_asplit_blocking_io_model` | 阻塞 I/O（BIO 模型） | MEDIUM→MEDIUM | 1 | `tree_java_blocking_io_model` | `java` | free | ✅ |
| 45 | `asplit_s1_asplit_nonblocking_io_model` | 非阻塞 I/O（NIO 模型） | MEDIUM→MEDIUM | 1 | `tree_java_nonblocking_io_model` | `java` | free | ✅ |
| 46 | `asplit_s1_asplit_lexical_analysis` | 词法分析 | MEDIUM→MEDIUM | 1 | `tree_pl_theory_lexical_analysis` | `pl_theory` | free | ✅ |
| 47 | `asplit_s1_asplit_syntax_analysis` | 语法分析 | MEDIUM→MEDIUM | 1 | `tree_pl_theory_syntax_analysis` | `pl_theory` | free | ✅ |
| 48 | `asplit_s1_asplit_single_pass_compiler` | 单遍编译器 | MEDIUM→MEDIUM | 1 | `tree_compiler_single_pass` | `compiler` | free | ✅ |
| 49 | `asplit_s1_asplit_multi_pass_compiler` | 多遍编译器 | MEDIUM→MEDIUM | 1 | `tree_compiler_multi_pass` | `compiler` | free | ✅ |
| 50 | `asplit_s1_asplit_http_request` | HTTP 请求 | HIGH→HIGH | 0 | `tree_java_fw_http_request` | 沿用既定值 | free | ✅ |
| 51 | `asplit_s1_asplit_servlet_lifecycle` | Servlet 生命周期 | HIGH→HIGH | 0 | `tree_java_fw_servlet_lifecycle` | 沿用既定值 | free | ✅ |
| 52 | `asplit_s1_asplit_servlet_container` | Servlet 容器 | HIGH→HIGH | 0 | `tree_java_fw_servlet_container` | 沿用既定值 | free | ✅ |
| 53 | `asplit_s1_asplit_view_rendering` | 视图渲染 | HIGH→HIGH | 0 | `tree_java_fw_view_rendering` | 沿用既定值 | free | ✅ |
| 54 | `asplit_s18_asplit_http_request_response` | HTTP Request/Response | HIGH→HIGH | 0 | `tree_java_fw_http_request_response` | 沿用既定值 | free | ✅ |
| 55 | `asplit_s18_asplit_web_attribute_scope` | Web 属性作用域 | HIGH→HIGH | 0 | `tree_java_fw_web_attribute_scope` | 沿用既定值 | free | ✅ |
| 56 | `asplit_s18_asplit_web_state_management` | Web 状态管理 | HIGH→HIGH | 0 | `tree_java_fw_web_state_management` | 沿用既定值 | free | ✅ |
| 57 | `asplit_s1_asplit_bean_lifecycle` | Bean 生命周期 | MEDIUM→MEDIUM | 2 | `tree_java_fw_bean_lifecycle` | `java_fw` | free | ✅ |
| 58 | `asplit_s2_asplit_ss_trigger_open` | openSession() 请求 | HIGH→HIGH | 0 | `tree_vault_javamybatis02sqlsession_ss_trigger_open` | 沿用既定值 | free | ✅ |
| 59 | `asplit_s2_asplit_ss_state_opened` | 会话已打开 | HIGH→HIGH | 0 | `tree_vault_javamybatis02sqlsession_ss_state_opened` | 沿用既定值 | free | ✅ |
| 60 | `asplit_s2_asplit_ss_state_executing` | 执行 SQL | HIGH→HIGH | 0 | `tree_vault_javamybatis02sqlsession_ss_state_executing` | 沿用既定值 | free | ✅ |
| 61 | `asplit_s2_asplit_ss_state_dirty` | 待提交（一级缓存有变更） | HIGH→HIGH | 0 | `tree_vault_javamybatis02sqlsession_ss_state_dirty` | 沿用既定值 | free | ✅ |
| 62 | `asplit_s2_asplit_ss_state_committed` | 已提交 | HIGH→HIGH | 0 | `tree_vault_javamybatis02sqlsession_ss_state_committed` | 沿用既定值 | free | ✅ |
| 63 | `asplit_s2_asplit_ss_state_rolled_back` | 已回滚 | HIGH→HIGH | 0 | `tree_vault_javamybatis02sqlsession_ss_state_rolled_back` | 沿用既定值 | free | ✅ |
| 64 | `asplit_s2_asplit_ss_state_closed` | 已关闭 | HIGH→HIGH | 0 | `tree_vault_javamybatis02sqlsession_ss_state_closed` | 沿用既定值 | free | ✅ |
| 65 | `asplit_s2_asplit_ss_factory` | SqlSessionFactory（单例） | HIGH→HIGH | 0 | `tree_vault_javamybatis02sqlsession_ss_factory` | 沿用既定值 | free | ✅ |
| 66 | `asplit_s1_asplit_mybatis_mapper` | MyBatis Mapper | HIGH→HIGH | 0 | `tree_java_fw_mybatis_mapper` | 沿用既定值 | free | ✅ |
| 67 | `asplit_s1_asplit_dynamic_sql` | 动态 SQL | HIGH→HIGH | 0 | `tree_java_fw_dynamic_sql` | 沿用既定值 | free | ✅ |
| 68 | `asplit_s2_asplit_mybatis_executor` | Executor（插件点） | HIGH→HIGH | 0 | `tree_java_fw_mybatis_executor` | 沿用既定值 | free | ✅ |
| 69 | `asplit_s2_asplit_mybatis_statement_handler` | StatementHandler（插件点） | HIGH→HIGH | 0 | `tree_java_fw_mybatis_statement_handler` | 沿用既定值 | free | ✅ |
| 70 | `asplit_s2_asplit_mybatis_parameter_handler` | ParameterHandler（插件点） | HIGH→HIGH | 0 | `tree_java_fw_mybatis_parameter_handler` | 沿用既定值 | free | ✅ |
| 71 | `asplit_s2_asplit_mybatis_resultset_handler` | ResultSetHandler（插件点） | HIGH→HIGH | 0 | `tree_java_fw_mybatis_resultset_handler` | 沿用既定值 | free | ✅ |
| 72 | `asplit_s1_asplit_netty_thread_model` | Netty 线程模型 | HIGH→HIGH | 0 | `tree_java_fw_netty_thread_model` | 沿用既定值 | free | ✅ |
| 73 | `asplit_s1_asplit_netty_channel` | Channel | HIGH→HIGH | 0 | `tree_java_fw_netty_channel` | 沿用既定值 | free | ✅ |
| 74 | `asplit_s1_asplit_channel_pipeline` | ChannelPipeline | HIGH→HIGH | 0 | `tree_java_fw_channel_pipeline` | 沿用既定值 | free | ✅ |
| 75 | `asplit_s18_asplit_kafka_consumer_group` | Kafka 消费组 | HIGH→HIGH | 0 | `tree_java_fw_kafka_consumer_group` | 沿用既定值 | free | ✅ |
| 76 | `asplit_s18_asplit_kafka_broker` | Kafka Broker | HIGH→HIGH | 0 | `tree_java_fw_kafka_broker` | 沿用既定值 | free | ✅ |
| 77 | `asplit_s1_asplit_rabbitmq_exchange` | RabbitMQ 交换机 | HIGH→HIGH | 0 | `tree_java_fw_rabbitmq_exchange` | 沿用既定值 | free | ✅ |
| 78 | `asplit_s1_asplit_routing_key` | 路由键 | HIGH→HIGH | 0 | `tree_java_fw_routing_key` | 沿用既定值 | free | ✅ |
| 79 | `asplit_s1_asplit_svc_registry_discovery` | 服务注册与发现 | HIGH→HIGH | 0 | `tree_java_fw_svc_registry_discovery` | 沿用既定值 | free | ✅ |
| 80 | `asplit_s1_asplit_load_balancing` | 负载均衡 | HIGH→HIGH | 0 | `tree_java_fw_load_balancing` | 沿用既定值 | free | ✅ |
| 81 | `asplit_s1_asplit_svc_invocation` | 服务调用 | HIGH→HIGH | 0 | `tree_java_fw_svc_invocation` | 沿用既定值 | free | ✅ |
| 82 | `asplit_s1_asplit_svc_fault_tolerance` | 服务容错 | HIGH→HIGH | 0 | `tree_java_fw_svc_fault_tolerance` | 沿用既定值 | free | ✅ |
| 83 | `asplit_s1_asplit_config_center` | 配置中心 | HIGH→HIGH | 0 | `tree_java_fw_config_center` | 沿用既定值 | free | ✅ |
| 84 | `asplit_s1_asplit_message_bus` | 消息总线 | HIGH→HIGH | 0 | `tree_java_fw_message_bus` | 沿用既定值 | free | ✅ |
| 85 | `asplit_s1_asplit_service_governance` | 服务治理 | HIGH→HIGH | 0 | `tree_java_fw_service_governance` | 沿用既定值 | free | ✅ |
| 86 | `asplit_s1_asplit_newsql` | NewSQL | MEDIUM→MEDIUM | 1 | `tree_db_newsql` | `db` | free | ✅ |
| 87 | `asplit_s1_asplit_zrank` | ZRANK | HIGH→HIGH | 0 | `tree_redis_zrank` | 沿用既定值 | free | ✅ |
| 88 | `asplit_s1_asplit_zrange` | ZRANGE | HIGH→HIGH | 0 | `tree_redis_zrange` | 沿用既定值 | free | ✅ |
| 89 | `asplit_s1_asplit_hot_data` | 热点数据 | HIGH→HIGH | 0 | `tree_redis_cache_hot_data` | 沿用既定值 | free | ✅ |
| 90 | `asplit_s1_asplit_cold_data` | 冷数据 | HIGH→HIGH | 0 | `tree_redis_cache_cold_data` | 沿用既定值 | free | ✅ |
| 91 | `asplit_s2_asplit_rdb_save_cmd` | SAVE / BGSAVE 命令到达 | HIGH→HIGH | 0 | `tree_redis_rdb_rdb_save_cmd` | 沿用既定值 | free | ✅ |
| 92 | `asplit_s2_asplit_rdb_state_fork` | fork 子进程（写时复制） | HIGH→HIGH | 0 | `tree_redis_rdb_rdb_state_fork` | 沿用既定值 | free | ✅ |
| 93 | `asplit_s2_asplit_rdb_state_child_write` | 子进程写临时 RDB 文件 | HIGH→HIGH | 0 | `tree_redis_rdb_rdb_state_child_write` | 沿用既定值 | free | ✅ |
| 94 | `asplit_s2_asplit_rdb_state_parent_serve` | 父进程继续处理命令 | HIGH→HIGH | 0 | `tree_redis_rdb_rdb_state_parent_serve` | 沿用既定值 | free | ✅ |
| 95 | `asplit_s2_asplit_rdb_state_replaced` | 临时文件原子替换 dump.rdb | HIGH→HIGH | 0 | `tree_redis_rdb_rdb_state_replaced` | 沿用既定值 | free | ✅ |
| 96 | `asplit_s2_asplit_rdb_state_loaded` | 启动时载入 RDB 恢复数据 | HIGH→HIGH | 0 | `tree_redis_rdb_rdb_state_loaded` | 沿用既定值 | free | ✅ |
| 97 | `asplit_s2_asplit_conn_state_handshake` | TCP 连接建立 | HIGH→HIGH | 0 | `tree_qproc_thread_conn_state_handshake` | 沿用既定值 | free | ✅ |
| 98 | `asplit_s2_asplit_conn_state_auth` | 客户端鉴权 | HIGH→HIGH | 0 | `tree_qproc_thread_conn_state_auth` | 沿用既定值 | free | ✅ |
| 99 | `asplit_s2_asplit_conn_state_alloc_thread` | 分配线程 | HIGH→HIGH | 0 | `tree_qproc_thread_conn_state_alloc_thread` | 沿用既定值 | free | ✅ |
| 100 | `asplit_s2_asplit_conn_state_user_thread` | 用户线程执行命令 | HIGH→HIGH | 0 | `tree_qproc_thread_conn_state_user_thread` | 沿用既定值 | free | ✅ |
| 101 | `asplit_s2_asplit_conn_state_sleep` | Sleep 空闲等待 | HIGH→HIGH | 0 | `tree_qproc_thread_conn_state_sleep` | 沿用既定值 | free | ✅ |
| 102 | `asplit_s2_asplit_conn_state_closing` | 连接关闭 | HIGH→HIGH | 0 | `tree_qproc_thread_conn_state_closing` | 沿用既定值 | free | ✅ |
| 103 | `asplit_s2_asplit_conn_pool` | Connection Pool（连接池） | HIGH→HIGH | 0 | `tree_qproc_thread_conn_pool` | 沿用既定值 | free | ✅ |
| 104 | `asplit_s18_asplit_range_lock` | 范围锁 | HIGH→HIGH | 0 | `tree_concept_lock_range_lock` | 沿用既定值 | free | ✅ |
| 105 | `asplit_s18_asplit_insert_lock` | 插入锁 | HIGH→HIGH | 0 | `tree_concept_lock_insert_lock` | 沿用既定值 | free | ✅ |
| 106 | `asplit_s106_db_modeling` | 数据库建模 | MEDIUM→HIGH | 0 | `tree_db_modeling` | `db` | free | ✅ |
| 107 | `asplit_s1_asplit_module_export` | 模块导出 | MEDIUM→HIGH | 0 | `tree_javascript_module_export` | `javascript` | free | ✅ |
| 108 | `asplit_s1_asplit_module_import` | 模块导入 | MEDIUM→HIGH | 0 | `tree_javascript_module_import` | `javascript` | free | ✅ |
| 109 | `asplit_s1_asplit_js_control_flow` | 控制流 | MEDIUM→HIGH | 0 | `tree_javascript_control_flow` | `javascript` | free | ✅ |
| 110 | `asplit_s1_asplit_function_design` | 函数设计 | MEDIUM→HIGH | 0 | `tree_javascript_function_design` | `javascript` | free | ✅ |
| 111 | `asplit_s1_asplit_js_expression` | 表达式 | MEDIUM→HIGH | 0 | `tree_javascript_expression` | `javascript` | free | ✅ |
| 112 | `asplit_s1_asplit_graph_search` | 图搜索算法 | MEDIUM→HIGH | 0 | `tree_data_structures_graph_search` | `data_structures` | free | ✅ |
| 113 | `asplit_s1_asplit_search` | 查找 | HIGH→HIGH | 0 | `tree_algorithms_search` | `algorithms` | free | ✅ |
| 114 | `asplit_s2_asplit_obj_trigger_new` | new 指令触发对象创建 | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_trigger_new` | `jvm` | free | ✅ |
| 115 | `asplit_s2_asplit_obj_state_class_loaded` | 类型加载校验 | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_state_class_loaded` | `jvm` | free | ✅ |
| 116 | `asplit_s2_asplit_obj_state_alloc` | 分配内存 | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_state_alloc` | `jvm` | free | ✅ |
| 117 | `asplit_s2_asplit_obj_state_zerofill` | 零值填充 | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_state_zerofill` | `jvm` | free | ✅ |
| 118 | `asplit_s2_asplit_obj_state_set_header` | 设置对象头 | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_state_set_header` | `jvm` | free | ✅ |
| 119 | `asplit_s2_asplit_obj_state_init` | 执行构造方法 | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_state_init` | `jvm` | free | ✅ |
| 120 | `asplit_s2_asplit_obj_state_reference` | 引用定位（对象可用） | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_state_reference` | `jvm` | free | ✅ |
| 121 | `asplit_s2_asplit_obj_alloc_tlab` | TLAB（线程本地分配缓冲） | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_alloc_tlab` | `jvm` | free | ✅ |
| 122 | `asplit_s2_asplit_obj_access_handle` | 句柄访问 | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_access_handle` | `jvm` | free | ✅ |
| 123 | `asplit_s2_asplit_obj_access_direct` | 直接指针 | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_access_direct` | `jvm` | free | ✅ |
| 124 | `asplit_s2_asplit_obj_state_oom` | 内存溢出（OutOfMemoryError） | MEDIUM→MEDIUM | 1 | `tree_jvm_obj_state_oom` | `jvm` | free | ✅ |
| 125 | `asplit_s1_asplit_blocking_io` | 阻塞非阻塞 I/O | MEDIUM→HIGH | 0 | `tree_operating_systems_blocking_io` | `operating_systems` | free | ✅ |
| 126 | `asplit_s1_asplit_sync_async_io` | 同步异步 I/O | MEDIUM→HIGH | 0 | `tree_operating_systems_sync_async_io` | `operating_systems` | free | ✅ |
| 127 | `asplit_s1_asplit_select_io` | select | HIGH→HIGH | 0 | `tree_concept_io_select_io` | 沿用既定值 | free | ✅ |
| 128 | `asplit_s1_asplit_epoll` | epoll | HIGH→HIGH | 0 | `tree_concept_io_epoll` | 沿用既定值 | free | ✅ |
| 129 | `asplit_s132_base_theory` | BASE理论 | MEDIUM→HIGH | 0 | `tree_distributed_systems_base_theory` | `distributed_systems` | free | ✅ |
| 130 | `asplit_s134_db_sharding` | 分库 | MEDIUM→HIGH | 0 | `tree_distributed_systems_db_sharding` | `distributed_systems` | free | ✅ |

## 五、不变性证明（未重推导项：91 条）

```text
未重推导项 冻结值 ≠ 草案值 的条数 = 0
```

=> **零漂移**：凡不需重推导的条目，其 id 与既有草案逐字一致 —— 本批不借重推导之名改动已裁决项。

## 六、全库反证

```text
真源 md5   tree-data.json     1545493c243c797db6fc68613153fc61
           node-pool.json     ff614d82ab6f0fa71ddfeaf4dad35384
           knowledge-edges.json 03fa49bd976845512e7f641014489d7a
真源 asplit_* 树 id 计数        130   （应 == 130）
130 项新 id 与既有 tree/池/边 id 碰撞  0
批内重复                        0
硬约束（无 ts/hash/段位）违反     0
残留 ACM 命名空间               0
```

## 七、落盘阶段的影响面（预告，由 apply 与独立验证复核）

```text
tree-data.json    改 130 个节点 id（只碰 id 字段；nodeRef / name / count / children 结构不动）
knowledge-edges.json  只改 treebind: 边 id 中被改名的两端；source/target 是池 ref，零触碰
node-pool.json    零改动    questions.json  零改动
```