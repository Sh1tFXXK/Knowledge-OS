# 外部改动归属与基线固化（只读对账）

> 生成时间 2026-09-14T12:21:55.048Z · **只读**：未 kill 任何进程、未回滚、未提交任何数据

## 0. 全工作树指纹与漂移检测

- 工作树当前有未提交变更的文件：**80** 个（`git status --porcelain` 全量，含 data/ 之外的 src、docs、配置）

| 顶层目录 | 变更文件数 |
|---|---|
| `outputs/` | 37 |
| `scripts/` | 19 |
| `src/` | 8 |
| `(根目录)` | 5 |
| `data/` | 5 |
| `docs/` | 5 |
| `batch-manifests/` | 1 |

### 0.1 与上次快照（2026-09-14T07:22:54.927Z）相比的漂移

> 快照只看 **`outputs/` 之外的「已跟踪文件」**（21 个）—— 即另一个会话能改动的部分。
> 已排除：`outputs/`（本任务产物，59 个）与未跟踪新文件（`??`，本任务新建的脚本）。
> 因此下表**只反映外部会话对既有文件的写入** —— 这才是判断「能否 APPLY」的信号。

- 新增变更文件 **4** 个
- 消失的变更文件 **0** 个
- 内容又变的文件 **1** 个

新增：

- `data/evolution-events.json`
- `data/knowledge-edges.json`
- `data/tree-data.json`
- `docs/CONSTITUTION.md`

| 文件 | 上次 mtime | 现在 mtime |
|---|---|---|
| `data/node-pool.json` | 2026-09-14T05:00:04.666Z | 2026-09-14T07:37:26.833Z |

- ⚠️ **外部仍在写入（5 处）** → 外部批次**未收敛**。此时 APPLY 会与他人的写入交织在同一仓库状态里，无法拆分归属。**建议继续等。**

## 1. 基线固化（下次用这张表判断「是否又变了」）

| 文件 | 与 HEAD 一致 | 字节 | mtime(ISO) | 末尾换行 | 当前 md5 |
|---|---|---|---|---|---|
| `node-pool.json` | **否（外部改动）** | 12651326 | 2026-09-14T07:37:26.833Z | **有（违反契约）** | `ff614d82ab6f` |
| `tree-data.json` | **否（外部改动）** | 1942196 | 2026-09-14T07:37:26.676Z | 无 | `89444e9d28cc` |
| `knowledge-edges.json` | **否（外部改动）** | 1142028 | 2026-09-14T07:37:26.853Z | 无 | `c59a0a85d967` |
| `questions.json` | **否（外部改动）** | 1384385 | 2026-09-14T05:00:11.711Z | **有（违反契约）** | `91c39b6e9738` |
| `evolution-events.json` | **否（外部改动）** | 9107 | 2026-09-14T07:43:24.795Z | 无 | `168a8c5c76b8` |

## 2. 外部改动刻画（逐 node id 字段级差分，对照 HEAD）

- 涉及节点 **134** 个；被改字段计数：`tags`×126 · `viewDimensions`×3 · `label`×1 · `card`×1
- 题库改动 **1** 条

### 2.1 改了什么（按字段）

| 字段 | 命中节点数 |
|---|---|
| `tags` | 126 |
| `viewDimensions` | 3 |
| `label` | 1 |
| `card` | 1 |

### 2.2 tags 净新增（含自身 label 的既有惯例）

共 99 个节点被加了 tag，样例：

- `k_atom_reachability`（可达性分析算法）→ +["可达性分析算法"]
- `k_class_programming_classification`（类的分类）→ +["类的分类"]
- `k_wiki_en_monitor_synchronization_s11`（Mesa 监视器示例）→ +["Mesa 监视器示例"]
- `k_1786096455966_qnfpwx`（生产者消费者模式）→ +["生产者消费者模式"]
- `k_1786241151946_frfy1k`（发布订阅模式 / pub-sub）→ +["发布订阅模式 / pub-sub"]
- `k_vault_javamybatis02sqlsession_5c5wcf`（SqlSession 生命周期）→ +["SqlSession 生命周期"]
- `msr_io_thread`（I/O 线程（从库））→ +["I/O 线程(从库)"]
- `aop_getbean`（getBean 请求）→ +["getBean 请求"]
- `aop_proxyfactory`（ProxyFactory）→ +["ProxyFactory"]
- `k_1789213558020_6rswrz3`（EJB（企业 JavaBeans））→ +["EJB(企业 JavaBeans)"]
- `asplit_juc_tools`（JUC 工具）→ +["JUC 工具"]
- `asplit_db_modeling`（数据库建模）→ +["数据库建模"]
- `asplit_db_sharding`（分库）→ +["分库"]
- `asplit_concrete_class`（具体类）→ +["具体类"]
- `asplit_local_class`（局部类）→ +["局部类"]
- `asplit_suspend_resume_methods`（suspend/resume 方法组）→ +["suspend/resume 方法组"]
- `asplit_stop_method`（stop 方法）→ +["stop 方法"]
- `asplit_mutex_lock`（互斥锁）→ +["互斥锁"]
- `asplit_sync_block`（同步代码块）→ +["同步代码块"]
- `asplit_data_race`（数据竞争）→ +["数据竞争"]
- …（其余 79 个略）

### 2.3 tags 净删除

- `k_vault_javamybatismybatis_14eqlq`（MyBatis）→ −["Mybatis"]
- `asplit_bias_state_biased`（已偏向态（记录线程 ID））→ −["已偏向态（记录线程 ID）"]
- `asplit_bias_state_revoke_pending`（撤销中（到达安全点））→ −["撤销中（到达安全点）"]
- `asplit_bias_state_revoked`（已撤销（升级轻量级锁））→ −["已撤销（升级轻量级锁）"]
- `asplit_bias_state_bulk_rebiased`（批量重偏向（epoch 递增））→ −["批量重偏向（epoch 递增）"]
- `asplit_bias_state_bulk_revoked`（批量撤销（整类禁用偏向））→ −["批量撤销（整类禁用偏向）"]
- `asplit_rw_state_write_acquire`（写锁申请（tryAcquire））→ −["写锁申请（tryAcquire）"]
- `asplit_rw_state_write_held`（写锁持有（独占可重入））→ −["写锁持有（独占可重入）"]
- `asplit_rw_state_write_released`（写锁释放（tryRelease））→ −["写锁释放（tryRelease）"]
- `asplit_rw_state_read_acquire`（读锁申请（tryAcquireShared））→ −["读锁申请（tryAcquireShared）"]
- `asplit_rw_state_read_held`（读锁持有（共享可重入））→ −["读锁持有（共享可重入）"]
- `asplit_rw_state_read_released`（读锁释放（tryReleaseShared））→ −["读锁释放（tryReleaseShared）"]
- `asplit_obj_state_reference`（引用定位（对象可用））→ −["引用定位（对象可用）"]
- `asplit_obj_alloc_tlab`（TLAB（线程本地分配缓冲））→ −["TLAB（线程本地分配缓冲）"]
- `asplit_obj_state_oom`（内存溢出（OutOfMemoryError））→ −["内存溢出（OutOfMemoryError）"]
- `asplit_ss_state_dirty`（待提交（一级缓存有变更））→ −["待提交（一级缓存有变更）"]
- `asplit_ss_factory`（SqlSessionFactory（单例））→ −["SqlSessionFactory（单例）"]
- `asplit_rdb_state_fork`（fork 子进程（写时复制））→ −["fork 子进程（写时复制）"]
- `asplit_conn_pool`（Connection Pool（连接池））→ −["Connection Pool（连接池）"]
- `asplit_mybatis_executor`（Executor（插件点））→ −["Executor（插件点）"]
- `asplit_mybatis_statement_handler`（StatementHandler（插件点））→ −["StatementHandler（插件点）"]
- `asplit_mybatis_parameter_handler`（ParameterHandler（插件点））→ −["ParameterHandler（插件点）"]
- `asplit_mybatis_resultset_handler`（ResultSetHandler（插件点））→ −["ResultSetHandler（插件点）"]

### 2.4 题库改动

- `q_cmp_spring_ejb` → 字段 ["updatedAt","answer"]

### 2.5 全量节点清单（供后续对拍）

- `n_55jiel25`（计算机科学）→ ["viewDimensions"]
- `n_web_dev`（Web 开发）→ ["viewDimensions"]
- `school_real_world_conventions`（跨系统标准与约定）→ ["tags"]
- `k_atom_reachability`（可达性分析算法）→ ["tags"]
- `k_class_programming_classification`（类的分类）→ ["label","tags"]
- `k_java_syntax_zh_1oty7br`（Java 语法要素）→ ["tags"]
- `k_wiki_en_monitor_synchronization_s11`（Mesa 监视器示例）→ ["tags"]
- `k_1786093174816_8f6sp8`（FixedThreadPool）→ ["tags"]
- `k_1786093231291_1p3kk2`（SingleThreadExecutor）→ ["tags"]
- `k_1786093265033_rqvw3n`（CachedThreadPool）→ ["tags"]
- `k_1786096455966_qnfpwx`（生产者消费者模式）→ ["tags"]
- `k_1786241151946_frfy1k`（发布订阅模式 / pub-sub）→ ["tags"]
- `k_vault_javajvm01jvm_1h8bru`（JVM 核心概念）→ ["tags"]
- `k_vault_javajava_vzjv8p`（Java 多线程编程）→ ["tags"]
- `k_vault_javajava_15bnft`（Java 集合框架）→ ["tags"]
- `k_vault_javajava_ii523d`（Java 数据结构）→ ["tags"]
- `k_vault_javamybatismybatis_14eqlq`（MyBatis）→ ["tags"]
- `k_vault_javamybatis02sqlsession_5c5wcf`（SqlSession 生命周期）→ ["tags"]
- `container:chapter_db_01`（数据库系统）→ ["tags"]
- `container:chapter_db_02`（数据模型）→ ["tags"]
- `container:chapter_db_03`（数据库结构）→ ["tags"]
- `container:chapter_db_05`（数据库操作）→ ["tags"]
- `container:chapter_db_08`（恢复系统）→ ["tags"]
- `container:chapter_db_09`（日志系统）→ ["tags"]
- `container:chapter_db_10`（存储系统）→ ["tags"]
- `container:chapter_db_12`（数据表示）→ ["tags"]
- `container:chapter_db_13`（数据库设计）→ ["tags"]
- `container:chapter_db_14`（数据库分布与复制）→ ["tags"]
- `container:chapter_db_16`（数据库安全）→ ["tags"]
- `container:chapter_db_17`（数据库运维）→ ["tags"]
- `container:chapter_db_18`（数据库编程与接口）→ ["tags"]
- `container:chapter_db_19`（数据库产品）→ ["tags"]
- `container:chapter_db_20`（数据库文件与实现）→ ["tags"]
- `msr_io_thread`（I/O 线程（从库））→ ["tags"]
- `aop_getbean`（getBean 请求）→ ["tags"]
- `aop_proxyfactory`（ProxyFactory）→ ["tags"]
- `aop_flow`（AOP 执行流程）→ ["tags"]
- `surge_auto_scale`（监控驱动动态扩容）→ ["tags"]
- `k_1789213558020_6rswrz3`（EJB（企业 JavaBeans））→ ["tags","card"]
- `asplit_juc_tools`（JUC 工具）→ ["tags"]
- `asplit_db_modeling`（数据库建模）→ ["tags"]
- `asplit_db_sharding`（分库）→ ["tags"]
- `asplit_concrete_class`（具体类）→ ["tags"]
- `asplit_local_class`（局部类）→ ["tags"]
- `asplit_suspend_resume_methods`（suspend/resume 方法组）→ ["tags"]
- `asplit_stop_method`（stop 方法）→ ["tags"]
- `asplit_mutex_lock`（互斥锁）→ ["tags"]
- `asplit_sync_block`（同步代码块）→ ["tags"]
- `asplit_data_race`（数据竞争）→ ["tags"]
- `asplit_lazy_init`（延迟初始化）→ ["tags"]
- `asplit_concurrency_container`（并发容器）→ ["tags"]
- `asplit_generic_method`（泛型方法）→ ["tags"]
- `asplit_generic_constructor`（泛型构造函数）→ ["tags"]
- `asplit_java_class`（Java 类）→ ["tags"]
- `asplit_file_input_stream`（FileInputStream）→ ["tags"]
- `asplit_buffered_input_stream`（BufferedInputStream）→ ["tags"]
- `asplit_data_input_stream`（DataInputStream）→ ["tags"]
- `asplit_object_input_stream`（ObjectInputStream）→ ["tags"]
- `asplit_file_reader`（FileReader）→ ["tags"]
- `asplit_buffered_reader`（BufferedReader）→ ["tags"]
- `asplit_java_io_file`（File 类）→ ["tags"]
- `asplit_console_io`（控制台 I/O）→ ["tags"]
- `asplit_java_nio_path`（Path）→ ["tags"]
- `asplit_java_nio_filesystem`（FileSystem）→ ["tags"]
- `asplit_java_io_group`（java.io）→ ["tags","viewDimensions"]
- `asplit_blocking_io_model`（阻塞 I/O（BIO 模型））→ ["tags"]
- `asplit_nonblocking_io_model`（非阻塞 I/O（NIO 模型））→ ["tags"]
- `asplit_lexical_analysis`（词法分析）→ ["tags"]
- `asplit_syntax_analysis`（语法分析）→ ["tags"]
- `asplit_single_pass_compiler`（单遍编译器）→ ["tags"]
- `asplit_multi_pass_compiler`（多遍编译器）→ ["tags"]
- `asplit_http_request`（HTTP 请求）→ ["tags"]
- `asplit_servlet_lifecycle`（Servlet 生命周期）→ ["tags"]
- `asplit_servlet_container`（Servlet 容器）→ ["tags"]
- `asplit_view_rendering`（视图渲染）→ ["tags"]
- `asplit_mybatis_mapper`（MyBatis Mapper）→ ["tags"]
- `asplit_dynamic_sql`（动态 SQL）→ ["tags"]
- `asplit_netty_thread_model`（Netty 线程模型）→ ["tags"]
- `asplit_netty_channel`（Channel）→ ["tags"]
- `asplit_channel_pipeline`（ChannelPipeline）→ ["tags"]
- `asplit_rabbitmq_exchange`（RabbitMQ 交换机）→ ["tags"]
- `asplit_routing_key`（路由键）→ ["tags"]
- `asplit_svc_registry_discovery`（服务注册与发现）→ ["tags"]
- `asplit_load_balancing`（负载均衡）→ ["tags"]
- `asplit_svc_invocation`（服务调用）→ ["tags"]
- `asplit_svc_fault_tolerance`（服务容错）→ ["tags"]
- `asplit_config_center`（配置中心）→ ["tags"]
- `asplit_message_bus`（消息总线）→ ["tags"]
- `asplit_service_governance`（服务治理）→ ["tags"]
- `asplit_newsql`（NewSQL）→ ["tags"]
- `asplit_zrank`（ZRANK）→ ["tags"]
- `asplit_zrange`（ZRANGE）→ ["tags"]
- `asplit_hot_data`（热点数据）→ ["tags"]
- `asplit_cold_data`（冷数据）→ ["tags"]
- `asplit_module_export`（模块导出）→ ["tags"]
- `asplit_module_import`（模块导入）→ ["tags"]
- `asplit_js_control_flow`（控制流）→ ["tags"]
- `asplit_function_design`（函数设计）→ ["tags"]
- `asplit_js_expression`（表达式）→ ["tags"]
- `asplit_graph_search`（图搜索算法）→ ["tags"]
- `asplit_search`（查找）→ ["tags"]
- `asplit_blocking_io`（阻塞非阻塞 I/O）→ ["tags"]
- `asplit_sync_async_io`（同步异步 I/O）→ ["tags"]
- `asplit_select_io`（select）→ ["tags"]
- `asplit_epoll`（epoll）→ ["tags"]
- `asplit_bias_state_biased`（已偏向态（记录线程 ID））→ ["tags"]
- `asplit_bias_state_revoke_pending`（撤销中（到达安全点））→ ["tags"]
- `asplit_bias_state_revoked`（已撤销（升级轻量级锁））→ ["tags"]
- `asplit_bias_state_bulk_rebiased`（批量重偏向（epoch 递增））→ ["tags"]
- `asplit_bias_state_bulk_revoked`（批量撤销（整类禁用偏向））→ ["tags"]
- `asplit_rw_state_write_acquire`（写锁申请（tryAcquire））→ ["tags"]
- `asplit_rw_state_write_held`（写锁持有（独占可重入））→ ["tags"]
- `asplit_rw_state_write_released`（写锁释放（tryRelease））→ ["tags"]
- `asplit_rw_state_read_acquire`（读锁申请（tryAcquireShared））→ ["tags"]
- `asplit_rw_state_read_held`（读锁持有（共享可重入））→ ["tags"]
- `asplit_rw_state_read_released`（读锁释放（tryReleaseShared））→ ["tags"]
- `asplit_obj_state_reference`（引用定位（对象可用））→ ["tags"]
- `asplit_obj_alloc_tlab`（TLAB（线程本地分配缓冲））→ ["tags"]
- `asplit_obj_state_oom`（内存溢出（OutOfMemoryError））→ ["tags"]
- `asplit_ss_state_dirty`（待提交（一级缓存有变更））→ ["tags"]
- `asplit_ss_factory`（SqlSessionFactory（单例））→ ["tags"]
- `asplit_rdb_state_fork`（fork 子进程（写时复制））→ ["tags"]
- `asplit_conn_state_auth`（客户端鉴权）→ ["tags"]
- `asplit_conn_pool`（Connection Pool（连接池））→ ["tags"]
- `asplit_mybatis_executor`（Executor（插件点））→ ["tags"]
- `asplit_mybatis_statement_handler`（StatementHandler（插件点））→ ["tags"]
- `asplit_mybatis_parameter_handler`（ParameterHandler（插件点））→ ["tags"]
- `asplit_mybatis_resultset_handler`（ResultSetHandler（插件点））→ ["tags"]
- `k_1789371087163_g81kcs`（-）→ "仅在工作树新增"
- `k_1789371087163_e9iafm`（-）→ "仅在工作树新增"
- `k_1789371436917_zo0k0j`（-）→ "仅在工作树新增"
- `k_1789371087163_g0db3p`（-）→ "仅在工作树新增"
- `k_1789371087163_25m6ob`（-）→ "仅在工作树新增"
- `k_1789371087163_b7qj6l`（-）→ "仅在工作树新增"

## 3. 与阶段一的碰撞分析（这是真正要看的）

- 阶段一涉及的树条目共引用 **26** 个池节点
- **与外部改动相交的节点：9 个**

| 池节点 id | label | 被改字段 | 阶段一为何关心 |
|---|---|---|---|
| `k_class_programming_classification` | 类的分类 | ["label","tags"] | 阶段一目标名命中 |
| `asplit_concrete_class` | 具体类 | ["tags"] | 阶段一目标名命中 |
| `asplit_local_class` | 局部类 | ["tags"] | 阶段一目标名命中 |
| `asplit_select_io` | select | ["tags"] | 阶段一目标名命中 |
| `asplit_epoll` | epoll | ["tags"] | 阶段一目标名命中 |
| `k_1789371087163_g81kcs` | - | "仅在工作树新增" | 阶段一目标名命中 |
| `k_1789371087163_e9iafm` | - | "仅在工作树新增" | 阶段一目标名命中 |
| `k_1789371436917_zo0k0j` | - | "仅在工作树新增" | 阶段一目标名命中 |
| `k_1789371087163_g0db3p` | - | "仅在工作树新增" | 阶段一目标名命中 |

- ⚠️ **有交集 → 存在顺序约束**：必须等外部批次收敛（提交或明确停手）后，基于其后的新基线做 dry-run，
  否则阶段一的 diff 会与它混在一起，无法拆分归属。

## 4. 结论与闸门状态

- 与 HEAD 不一致的文件：`node-pool.json` · `tree-data.json` · `knowledge-edges.json` · `questions.json` · `evolution-events.json`
- 格式契约违规（末尾换行）：`node-pool.json` · `questions.json`
- **本脚本不修任何一项** —— 归属未确认前，修 = 替别人做决定
