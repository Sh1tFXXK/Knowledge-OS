# T3-P1 · asplit_* treeId 语义化（130 项）—— APPLY 执行报告
> 模式 `apply` · 备份 `data\backups\t3-p1-2026-09-14T14-34-44-737Z`
> 生成时间 2026-09-14T14:34:45.089Z
## 0. 闸门
| 闸门 | 检查项 | 结果 | 依据 |
| `G1` | FINAL 映射表 MAPPING_FREEZE_OK ∧ 130 条全 APPROVED | ✅ | status=MAPPING_FREEZE_OK · 条数 130 · 非 APPROVED 0 |
| `G2` | 数据文件 md5 与冻结基线一致（无人改过数据） | ✅ | 5 个文件全部一致 |
| `G3` | 130 个 old treeId 全部存在 ∧ 覆盖面**恰好** = 现存 asplit_* 树 id 全集 | ✅ | 全部命中 · 映射 130 vs 现存 130 · 缺失 [] · 多余 [] |
| `G4` | 130 个 new treeId 形态合法 ∧ 无 ts/hash/段位 ∧ 批内唯一 ∧ 无碰撞 ∧ 无 ACM 命名空间 | ✅ | 全部通过（命名空间 14 组） |
| `G5` | 结构不变性：树逐节点 / 边逐条，除 id 外逐字节相同 ∧ endpoint 零触碰 ∧ 改名数恰为 130 | ✅ | 树 3216 节点、边 4163 条全部通过（仅 id 变动） · 改名节点 130/130 · treebind id 改写 145 · 未解析 treebind 0 |
| `G6` | 引用闭合：改名后 tree-data + knowledge-edges 无任一旧 id 残留 | ✅ | 残留 0 · 节点数 3216 不变 · 边数 4163 不变 |
| `G7` | 挂载健康度不劣化：nodeRef 悬空 ∧ treebind 悬空 批前 == 批后 | ✅ | nodeRef 悬空 0 → 0 · treebind 悬空 18 → 18 |
| `G8` | 成果达成：树内 asplit_* 身份引用 = 0 ∧ 39 个重推导 id 全部就位 | ✅ | 树内 asplit_* 残留 0 · 重推导缺失 0 |
| `G9` | dev server 不会静默覆盖本次写入 | ✅ | 5173 未监听 |

**闸门全绿（9/9）**

## 1. 改名对照（130 条）
| # | 旧 treeId | 新 treeId | 命名空间 | 路径 |
| 1 | `asplit_s1_asplit_concrete_class` | **`tree_class_programming_concrete_class`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类 > 具体类 |
| 2 | `asplit_s1_asplit_local_class` | **`tree_class_programming_local_class`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程范式 > 面向对象 > 类（编程） > 类的分类 > 局部类 |
| 3 | `asplit_s1_asplit_mutex_lock` | **`tree_java_jmm_mutex_lock`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 同步 > 互斥锁 |
| 4 | `asplit_s1_asplit_sync_block` | **`tree_java_jmm_sync_block`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 同步 > 同步代码块 |
| 5 | `asplit_s1_asplit_data_race` | **`tree_java_jmm_sequential_data_race`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 顺序一致性 > 数据竞争 |
| 6 | `asplit_s19_juc_tools` | **`tree_java_concurrency_juc_tools`** | `java_concurrency` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > JUC 工具 |
| 7 | `asplit_s1_asplit_lazy_init` | **`tree_java_concurrency_lazy_init`** | `java_concurrency` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 延迟初始化 |
| 8 | `asplit_s1_asplit_concurrency_container` | **`tree_java_concurrency_container`** | `java_concurrency` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 并发容器 |
| 9 | `asplit_s18_asplit_memory_atomicity` | **`tree_java_concurrency_memory_atomicity`** | `java_concurrency` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存原子性 |
| 10 | `asplit_s18_asplit_concurrency_mutex_lock` | **`tree_java_concurrency_mutex_lock`** | `java_concurrency` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 并发互斥锁 |
| 11 | `asplit_s1_asplit_suspend_resume_methods` | **`tree_java_thread_suspend_resume_methods`** | `java_thread` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 线程的状态 > suspend/resume 方法组 |
| 12 | `asplit_s1_asplit_stop_method` | **`tree_java_thread_stop_method`** | `java_thread` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 线程的状态 > stop 方法 |
| 13 | `asplit_s2_asplit_bias_acquire` | **`tree_web_bias_acquire`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 偏向锁 > 线程进入同步代码块 |
| 14 | `asplit_s2_asplit_bias_state_anonymous` | **`tree_web_bias_state_anonymous`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 偏向锁 > 匿名偏向态 |
| 15 | `asplit_s2_asplit_bias_state_biased` | **`tree_web_bias_state_biased`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 偏向锁 > 已偏向态（记录线程 ID） |
| 16 | `asplit_s2_asplit_bias_state_revoke_pending` | **`tree_web_bias_state_revoke_pending`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 偏向锁 > 撤销中（到达安全点） |
| 17 | `asplit_s2_asplit_bias_state_revoked` | **`tree_web_bias_state_revoked`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 偏向锁 > 已撤销（升级轻量级锁） |
| 18 | `asplit_s2_asplit_bias_state_bulk_rebiased` | **`tree_web_bias_state_bulk_rebiased`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 偏向锁 > 批量重偏向（epoch 递增） |
| 19 | `asplit_s2_asplit_bias_state_bulk_revoked` | **`tree_web_bias_state_bulk_revoked`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 偏向锁 > 批量撤销（整类禁用偏向） |
| 20 | `asplit_s2_asplit_bias_markword` | **`tree_web_bias_markword`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 偏向锁 > 对象头 Mark Word |
| 21 | `asplit_s2_asplit_rwlock_mechanism` | **`tree_java_lock_rwlock_rwlock_mechanism`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 读写锁实现机制 |
| 22 | `asplit_s2_asplit_rw_state_write_acquire` | **`tree_java_lock_rwlock_rw_state_write_acquire`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 写锁申请（tryAcquire） |
| 23 | `asplit_s2_asplit_rw_state_write_held` | **`tree_java_lock_rwlock_rw_state_write_held`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 写锁持有（独占可重入） |
| 24 | `asplit_s2_asplit_rw_state_write_waiting` | **`tree_java_lock_rwlock_rw_state_write_waiting`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 写锁等待 |
| 25 | `asplit_s2_asplit_rw_state_write_released` | **`tree_java_lock_rwlock_rw_state_write_released`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 写锁释放（tryRelease） |
| 26 | `asplit_s2_asplit_rw_state_read_acquire` | **`tree_java_lock_rwlock_rw_state_read_acquire`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 读锁申请（tryAcquireShared） |
| 27 | `asplit_s2_asplit_rw_state_read_held` | **`tree_java_lock_rwlock_rw_state_read_held`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 读锁持有（共享可重入） |
| 28 | `asplit_s2_asplit_rw_state_read_waiting` | **`tree_java_lock_rwlock_rw_state_read_waiting`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 读锁等待 |
| 29 | `asplit_s2_asplit_rw_state_read_released` | **`tree_java_lock_rwlock_rw_state_read_released`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 > 读锁释放（tryReleaseShared） |
| 30 | `asplit_s1_asplit_generic_method` | **`tree_java_syntax_generic_method`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java泛型 > 泛型方法 |
| 31 | `asplit_s1_asplit_generic_constructor` | **`tree_java_syntax_generic_constructor`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java泛型 > 泛型构造函数 |
| 32 | `asplit_s1_asplit_java_class` | **`tree_java_syntax_java_class`** | `java_syntax` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > Java 类 |
| 33 | `asplit_s1_asplit_file_input_stream` | **`tree_byte_stream_file_input_stream`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > java.io 字节流 > FileInputStream |
| 34 | `asplit_s1_asplit_buffered_input_stream` | **`tree_byte_stream_buffered_input_stream`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > java.io 字节流 > BufferedInputStream |
| 35 | `asplit_s1_asplit_data_input_stream` | **`tree_byte_stream_data_input_stream`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > java.io 字节流 > DataInputStream |
| 36 | `asplit_s1_asplit_object_input_stream` | **`tree_byte_stream_object_input_stream`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > java.io 字节流 > ObjectInputStream |
| 37 | `asplit_s1_asplit_java_io_group` | **`tree_byte_stream_java_io_group`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > java.io 字节流 > java.io |
| 38 | `asplit_s1_asplit_file_reader` | **`tree_char_stream_file_reader`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > java.io 字符流 > FileReader |
| 39 | `asplit_s1_asplit_buffered_reader` | **`tree_char_stream_buffered_reader`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > java.io 字符流 > BufferedReader |
| 40 | `asplit_s1_asplit_java_io_file` | **`tree_java_common_java_io_file`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > File 类 |
| 41 | `asplit_s1_asplit_console_io` | **`tree_java_common_console_io`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > 控制台 I/O |
| 42 | `asplit_s1_asplit_java_nio_path` | **`tree_java_common_java_nio_path`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > Path |
| 43 | `asplit_s1_asplit_java_nio_filesystem` | **`tree_java_common_java_nio_filesystem`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 常用类库 > FileSystem |
| 44 | `asplit_s1_asplit_blocking_io_model` | **`tree_java_blocking_io_model`** | `java` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 阻塞 I/O（BIO 模型） |
| 45 | `asplit_s1_asplit_nonblocking_io_model` | **`tree_java_nonblocking_io_model`** | `java` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 非阻塞 I/O（NIO 模型） |
| 46 | `asplit_s1_asplit_lexical_analysis` | **`tree_pl_theory_lexical_analysis`** | `pl_theory` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编程语言理论 > 词法分析 |
| 47 | `asplit_s1_asplit_syntax_analysis` | **`tree_pl_theory_syntax_analysis`** | `pl_theory` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编程语言理论 > 语法分析 |
| 48 | `asplit_s1_asplit_single_pass_compiler` | **`tree_compiler_single_pass`** | `compiler` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编译原理 > 执行 > 编译器 > 编译器构建 > 单遍编译器 |
| 49 | `asplit_s1_asplit_multi_pass_compiler` | **`tree_compiler_multi_pass`** | `compiler` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > 编译原理 > 执行 > 编译器 > 编译器构建 > 多遍编译器 |
| 50 | `asplit_s1_asplit_http_request` | **`tree_java_fw_http_request`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > JavaWeb > HTTP 请求 |
| 51 | `asplit_s1_asplit_servlet_lifecycle` | **`tree_java_fw_servlet_lifecycle`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > JavaWeb > Servlet 生命周期 |
| 52 | `asplit_s1_asplit_servlet_container` | **`tree_java_fw_servlet_container`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > JavaWeb > Servlet 容器 |
| 53 | `asplit_s1_asplit_view_rendering` | **`tree_java_fw_view_rendering`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > JavaWeb > 视图渲染 |
| 54 | `asplit_s18_asplit_http_request_response` | **`tree_java_fw_http_request_response`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > JavaWeb > HTTP Request/Response |
| 55 | `asplit_s18_asplit_web_attribute_scope` | **`tree_java_fw_web_attribute_scope`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > JavaWeb > Web 属性作用域 |
| 56 | `asplit_s18_asplit_web_state_management` | **`tree_java_fw_web_state_management`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > JavaWeb > Web 状态管理 |
| 57 | `asplit_s1_asplit_bean_lifecycle` | **`tree_java_fw_bean_lifecycle`** | `java_fw` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring > Spring Beans > 生命周期 > Bean 生命周期 |
| 58 | `asplit_s2_asplit_ss_trigger_open` | **`tree_vault_javamybatis02sqlsession_ss_trigger_open`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > SqlSession 生命周期 > openSession() 请求 |
| 59 | `asplit_s2_asplit_ss_state_opened` | **`tree_vault_javamybatis02sqlsession_ss_state_opened`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > SqlSession 生命周期 > 会话已打开 |
| 60 | `asplit_s2_asplit_ss_state_executing` | **`tree_vault_javamybatis02sqlsession_ss_state_executing`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > SqlSession 生命周期 > 执行 SQL |
| 61 | `asplit_s2_asplit_ss_state_dirty` | **`tree_vault_javamybatis02sqlsession_ss_state_dirty`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > SqlSession 生命周期 > 待提交（一级缓存有变更） |
| 62 | `asplit_s2_asplit_ss_state_committed` | **`tree_vault_javamybatis02sqlsession_ss_state_committed`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > SqlSession 生命周期 > 已提交 |
| 63 | `asplit_s2_asplit_ss_state_rolled_back` | **`tree_vault_javamybatis02sqlsession_ss_state_rolled_back`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > SqlSession 生命周期 > 已回滚 |
| 64 | `asplit_s2_asplit_ss_state_closed` | **`tree_vault_javamybatis02sqlsession_ss_state_closed`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > SqlSession 生命周期 > 已关闭 |
| 65 | `asplit_s2_asplit_ss_factory` | **`tree_vault_javamybatis02sqlsession_ss_factory`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > SqlSession 生命周期 > SqlSessionFactory（单例） |
| 66 | `asplit_s1_asplit_mybatis_mapper` | **`tree_java_fw_mybatis_mapper`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > MyBatis Mapper |
| 67 | `asplit_s1_asplit_dynamic_sql` | **`tree_java_fw_dynamic_sql`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > 动态 SQL |
| 68 | `asplit_s2_asplit_mybatis_executor` | **`tree_java_fw_mybatis_executor`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > Executor（插件点） |
| 69 | `asplit_s2_asplit_mybatis_statement_handler` | **`tree_java_fw_mybatis_statement_handler`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > StatementHandler（插件点） |
| 70 | `asplit_s2_asplit_mybatis_parameter_handler` | **`tree_java_fw_mybatis_parameter_handler`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > ParameterHandler（插件点） |
| 71 | `asplit_s2_asplit_mybatis_resultset_handler` | **`tree_java_fw_mybatis_resultset_handler`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Mybatis > ResultSetHandler（插件点） |
| 72 | `asplit_s1_asplit_netty_thread_model` | **`tree_java_fw_netty_thread_model`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Netty > Netty 线程模型 |
| 73 | `asplit_s1_asplit_netty_channel` | **`tree_java_fw_netty_channel`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Netty > Channel |
| 74 | `asplit_s1_asplit_channel_pipeline` | **`tree_java_fw_channel_pipeline`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Netty > ChannelPipeline |
| 75 | `asplit_s18_asplit_kafka_consumer_group` | **`tree_java_fw_kafka_consumer_group`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Kafka > Kafka 消费组 |
| 76 | `asplit_s18_asplit_kafka_broker` | **`tree_java_fw_kafka_broker`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Kafka > Kafka Broker |
| 77 | `asplit_s1_asplit_rabbitmq_exchange` | **`tree_java_fw_rabbitmq_exchange`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > RabbitMQ > RabbitMQ 交换机 |
| 78 | `asplit_s1_asplit_routing_key` | **`tree_java_fw_routing_key`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > RabbitMQ > 路由键 |
| 79 | `asplit_s1_asplit_svc_registry_discovery` | **`tree_java_fw_svc_registry_discovery`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring Cloud > 服务注册与发现 |
| 80 | `asplit_s1_asplit_load_balancing` | **`tree_java_fw_load_balancing`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring Cloud > 负载均衡 |
| 81 | `asplit_s1_asplit_svc_invocation` | **`tree_java_fw_svc_invocation`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring Cloud > 服务调用 |
| 82 | `asplit_s1_asplit_svc_fault_tolerance` | **`tree_java_fw_svc_fault_tolerance`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring Cloud > 服务容错 |
| 83 | `asplit_s1_asplit_config_center` | **`tree_java_fw_config_center`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring Cloud > 配置中心 |
| 84 | `asplit_s1_asplit_message_bus` | **`tree_java_fw_message_bus`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring Cloud > 消息总线 |
| 85 | `asplit_s1_asplit_service_governance` | **`tree_java_fw_service_governance`** | 沿用 | 知识宇宙 > 计算机科学 > 软件符号与工具 > 软件框架 > Spring Cloud > 服务治理 |
| 86 | `asplit_s1_asplit_newsql` | **`tree_db_newsql`** | `db` | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库系统 > 历史 > NewSQL |
| 87 | `asplit_s1_asplit_zrank` | **`tree_redis_zrank`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 数据类型 > zset > ZRANK |
| 88 | `asplit_s1_asplit_zrange` | **`tree_redis_zrange`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 数据类型 > zset > ZRANGE |
| 89 | `asplit_s1_asplit_hot_data` | **`tree_redis_cache_hot_data`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 缓存异常 > 热点数据 |
| 90 | `asplit_s1_asplit_cold_data` | **`tree_redis_cache_cold_data`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 缓存异常 > 冷数据 |
| 91 | `asplit_s2_asplit_rdb_save_cmd` | **`tree_redis_rdb_rdb_save_cmd`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 > RDB持久化 > SAVE / BGSAVE 命令到达 |
| 92 | `asplit_s2_asplit_rdb_state_fork` | **`tree_redis_rdb_rdb_state_fork`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 > RDB持久化 > fork 子进程（写时复制） |
| 93 | `asplit_s2_asplit_rdb_state_child_write` | **`tree_redis_rdb_rdb_state_child_write`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 > RDB持久化 > 子进程写临时 RDB 文件 |
| 94 | `asplit_s2_asplit_rdb_state_parent_serve` | **`tree_redis_rdb_rdb_state_parent_serve`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 > RDB持久化 > 父进程继续处理命令 |
| 95 | `asplit_s2_asplit_rdb_state_replaced` | **`tree_redis_rdb_rdb_state_replaced`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 > RDB持久化 > 临时文件原子替换 dump.rdb |
| 96 | `asplit_s2_asplit_rdb_state_loaded` | **`tree_redis_rdb_rdb_state_loaded`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 > RDB持久化 > 启动时载入 RDB 恢复数据 |
| 97 | `asplit_s2_asplit_conn_state_handshake` | **`tree_qproc_thread_conn_state_handshake`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 查询系统 > MySQL 查询执行过程 > 内部执行流程（六步） > 客户端（Client） > 连接与线程状态 > TCP 连接建立 |
| 98 | `asplit_s2_asplit_conn_state_auth` | **`tree_qproc_thread_conn_state_auth`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 查询系统 > MySQL 查询执行过程 > 内部执行流程（六步） > 客户端（Client） > 连接与线程状态 > 客户端鉴权 |
| 99 | `asplit_s2_asplit_conn_state_alloc_thread` | **`tree_qproc_thread_conn_state_alloc_thread`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 查询系统 > MySQL 查询执行过程 > 内部执行流程（六步） > 客户端（Client） > 连接与线程状态 > 分配线程 |
| 100 | `asplit_s2_asplit_conn_state_user_thread` | **`tree_qproc_thread_conn_state_user_thread`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 查询系统 > MySQL 查询执行过程 > 内部执行流程（六步） > 客户端（Client） > 连接与线程状态 > 用户线程执行命令 |
| 101 | `asplit_s2_asplit_conn_state_sleep` | **`tree_qproc_thread_conn_state_sleep`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 查询系统 > MySQL 查询执行过程 > 内部执行流程（六步） > 客户端（Client） > 连接与线程状态 > Sleep 空闲等待 |
| 102 | `asplit_s2_asplit_conn_state_closing` | **`tree_qproc_thread_conn_state_closing`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 查询系统 > MySQL 查询执行过程 > 内部执行流程（六步） > 客户端（Client） > 连接与线程状态 > 连接关闭 |
| 103 | `asplit_s2_asplit_conn_pool` | **`tree_qproc_thread_conn_pool`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 查询系统 > MySQL 查询执行过程 > 内部执行流程（六步） > 客户端（Client） > 连接与线程状态 > Connection Pool（连接池） |
| 104 | `asplit_s18_asplit_range_lock` | **`tree_concept_lock_range_lock`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库事务 > 锁机制 / locking mechanism > 范围锁 |
| 105 | `asplit_s18_asplit_insert_lock` | **`tree_concept_lock_insert_lock`** | 沿用 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库事务 > 锁机制 / locking mechanism > 插入锁 |
| 106 | `asplit_s106_db_modeling` | **`tree_db_modeling`** | `db` | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库设计 > 数据库建模 |
| 107 | `asplit_s1_asplit_module_export` | **`tree_javascript_module_export`** | `javascript` | 知识宇宙 > 计算机科学 > 信息系统 > 全球信息网 > Web 开发 > React > 模块导出 |
| 108 | `asplit_s1_asplit_module_import` | **`tree_javascript_module_import`** | `javascript` | 知识宇宙 > 计算机科学 > 信息系统 > 全球信息网 > Web 开发 > React > 模块导入 |
| 109 | `asplit_s1_asplit_js_control_flow` | **`tree_javascript_control_flow`** | `javascript` | 知识宇宙 > 计算机科学 > 信息系统 > 全球信息网 > Web 开发 > React > 控制流 |
| 110 | `asplit_s1_asplit_function_design` | **`tree_javascript_function_design`** | `javascript` | 知识宇宙 > 计算机科学 > 信息系统 > 全球信息网 > Web 开发 > React > 函数设计 |
| 111 | `asplit_s1_asplit_js_expression` | **`tree_javascript_expression`** | `javascript` | 知识宇宙 > 计算机科学 > 信息系统 > 全球信息网 > Web 开发 > React > 表达式 |
| 112 | `asplit_s1_asplit_graph_search` | **`tree_data_structures_graph_search`** | `data_structures` | 知识宇宙 > 计算机科学 > 计算理论 > 算法 > 数据结构 > 图搜索算法 |
| 113 | `asplit_s1_asplit_search` | **`tree_algorithms_search`** | `algorithms` | 知识宇宙 > 计算机科学 > 计算理论 > 算法 > 查找 |
| 114 | `asplit_s2_asplit_obj_trigger_new` | **`tree_jvm_obj_trigger_new`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > new 指令触发对象创建 |
| 115 | `asplit_s2_asplit_obj_state_class_loaded` | **`tree_jvm_obj_state_class_loaded`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 类型加载校验 |
| 116 | `asplit_s2_asplit_obj_state_alloc` | **`tree_jvm_obj_state_alloc`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 分配内存 |
| 117 | `asplit_s2_asplit_obj_state_zerofill` | **`tree_jvm_obj_state_zerofill`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 零值填充 |
| 118 | `asplit_s2_asplit_obj_state_set_header` | **`tree_jvm_obj_state_set_header`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 设置对象头 |
| 119 | `asplit_s2_asplit_obj_state_init` | **`tree_jvm_obj_state_init`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 执行构造方法 |
| 120 | `asplit_s2_asplit_obj_state_reference` | **`tree_jvm_obj_state_reference`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 引用定位（对象可用） |
| 121 | `asplit_s2_asplit_obj_alloc_tlab` | **`tree_jvm_obj_alloc_tlab`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > TLAB（线程本地分配缓冲） |
| 122 | `asplit_s2_asplit_obj_access_handle` | **`tree_jvm_obj_access_handle`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 句柄访问 |
| 123 | `asplit_s2_asplit_obj_access_direct` | **`tree_jvm_obj_access_direct`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 直接指针 |
| 124 | `asplit_s2_asplit_obj_state_oom` | **`tree_jvm_obj_state_oom`** | `jvm` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 内存管理 > 内存溢出（OutOfMemoryError） |
| 125 | `asplit_s1_asplit_blocking_io` | **`tree_operating_systems_blocking_io`** | `operating_systems` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 阻塞非阻塞 I/O |
| 126 | `asplit_s1_asplit_sync_async_io` | **`tree_operating_systems_sync_async_io`** | `operating_systems` | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > 同步异步 I/O |
| 127 | `asplit_s1_asplit_select_io` | **`tree_concept_io_select_io`** | 沿用 | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > I/O 多路复用 > select |
| 128 | `asplit_s1_asplit_epoll` | **`tree_concept_io_epoll`** | 沿用 | 知识宇宙 > 计算机科学 > 系统组织 > 操作系统 > I/O 多路复用 > epoll |
| 129 | `asplit_s132_base_theory` | **`tree_distributed_systems_base_theory`** | `distributed_systems` | 知识宇宙 > 计算机科学 > 系统组织 > 分布式系统 > BASE理论 |
| 130 | `asplit_s134_db_sharding` | **`tree_distributed_systems_db_sharding`** | `distributed_systems` | 知识宇宙 > 计算机科学 > 系统组织 > 分布式系统 > 分库 |

## 2. 结构不变性证明
| 断言 | 结果 |
| 树逐节点：除 `id` 外所有字段逐字节相同 | ✅ 3216 节点全通过 |
| 边逐条：除 `id` 外所有字段逐字节相同、顺序不变 | ✅ 4163 条全通过 |
| 边 `source` / `target` 被触碰 | **0**（须 0） |
| 树节点数 | 3216 → 3216 |
| 边数 | 4163 → 4163 |
| 池节点数 | 3855（本批不改池） |
| 悬空 nodeRef | 0 → 0 |
| 悬空 treebind | 18 → 18 |
| 旧 id 残留（树+边全文扫描） | 0 ✅ |

## 3. treebind 边 id 改写（145 条）
> 冒号安全解析：本批有 4 条 treebind 的另一端是 `projection:*`（自身含 `:`），
> P0 的非贪婪 `/^treebind:(.+?):(.+)$/` 在这 4 条上会错切并漏改 → 本脚本按「在已知 treeId 全集里找合法切分点」解析，实测未解析数 = 0。

| # | 旧边 id | 新边 id |
| 1 | `treebind:tree_1782846767208_uw6zxc:asplit_s19_juc_tools` | `treebind:tree_1782846767208_uw6zxc:tree_java_concurrency_juc_tools` |
| 2 | `treebind:chapter_db_13:asplit_s106_db_modeling` | `treebind:chapter_db_13:tree_db_modeling` |
| 3 | `treebind:theory_domain_distributed_systems:asplit_s132_base_theory` | `treebind:theory_domain_distributed_systems:tree_distributed_systems_base_theory` |
| 4 | `treebind:theory_domain_distributed_systems:asplit_s134_db_sharding` | `treebind:theory_domain_distributed_systems:tree_distributed_systems_db_sharding` |
| 5 | `treebind:tree_class_programming_classification:asplit_s1_asplit_concrete_class` | `treebind:tree_class_programming_classification:tree_class_programming_concrete_class` |
| 6 | `treebind:tree_class_programming_classification:asplit_s1_asplit_local_class` | `treebind:tree_class_programming_classification:tree_class_programming_local_class` |
| 7 | `treebind:tree_java_jmm_synchronization:asplit_s1_asplit_mutex_lock` | `treebind:tree_java_jmm_synchronization:tree_java_jmm_mutex_lock` |
| 8 | `treebind:tree_java_jmm_synchronization:asplit_s1_asplit_sync_block` | `treebind:tree_java_jmm_synchronization:tree_java_jmm_sync_block` |
| 9 | `treebind:tree_java_jmm_sequential_consistency:asplit_s1_asplit_data_race` | `treebind:tree_java_jmm_sequential_consistency:tree_java_jmm_sequential_data_race` |
| 10 | `treebind:tree_1782846767208_uw6zxc:asplit_s1_asplit_lazy_init` | `treebind:tree_1782846767208_uw6zxc:tree_java_concurrency_lazy_init` |
| 11 | `treebind:tree_1782846767208_uw6zxc:asplit_s1_asplit_concurrency_container` | `treebind:tree_1782846767208_uw6zxc:tree_java_concurrency_container` |
| 12 | `treebind:tree_java_syntax_generics:asplit_s1_asplit_generic_method` | `treebind:tree_java_syntax_generics:tree_java_syntax_generic_method` |
| 13 | `treebind:tree_java_syntax_generics:asplit_s1_asplit_generic_constructor` | `treebind:tree_java_syntax_generics:tree_java_syntax_generic_constructor` |
| 14 | `treebind:tree_byte_stream_group:asplit_s1_asplit_file_input_stream` | `treebind:tree_byte_stream_group:tree_byte_stream_file_input_stream` |
| 15 | `treebind:tree_byte_stream_group:asplit_s1_asplit_buffered_input_stream` | `treebind:tree_byte_stream_group:tree_byte_stream_buffered_input_stream` |
| 16 | `treebind:tree_byte_stream_group:asplit_s1_asplit_data_input_stream` | `treebind:tree_byte_stream_group:tree_byte_stream_data_input_stream` |
| 17 | `treebind:tree_byte_stream_group:asplit_s1_asplit_object_input_stream` | `treebind:tree_byte_stream_group:tree_byte_stream_object_input_stream` |
| 18 | `treebind:tree_char_stream_group:asplit_s1_asplit_file_reader` | `treebind:tree_char_stream_group:tree_char_stream_file_reader` |
| 19 | `treebind:tree_char_stream_group:asplit_s1_asplit_buffered_reader` | `treebind:tree_char_stream_group:tree_char_stream_buffered_reader` |
| 20 | `treebind:tree_java_common_libraries:asplit_s1_asplit_java_io_file` | `treebind:tree_java_common_libraries:tree_java_common_java_io_file` |
| 21 | `treebind:tree_java_common_libraries:asplit_s1_asplit_console_io` | `treebind:tree_java_common_libraries:tree_java_common_console_io` |
| 22 | `treebind:asplit_s1_asplit_java_io_file:tree_file_class` | `treebind:tree_java_common_java_io_file:tree_file_class` |
| 23 | `treebind:asplit_s1_asplit_java_io_file:tree_random_access_file` | `treebind:tree_java_common_java_io_file:tree_random_access_file` |
| 24 | `treebind:asplit_s1_asplit_java_io_file:tree_dir_operation` | `treebind:tree_java_common_java_io_file:tree_dir_operation` |
| 25 | `treebind:asplit_s1_asplit_console_io:tree_console_io` | `treebind:tree_java_common_console_io:tree_console_io` |
| 26 | `treebind:tree_java_common_libraries:asplit_s1_asplit_java_nio_path` | `treebind:tree_java_common_libraries:tree_java_common_java_nio_path` |
| 27 | `treebind:tree_java_common_libraries:asplit_s1_asplit_java_nio_filesystem` | `treebind:tree_java_common_libraries:tree_java_common_java_nio_filesystem` |
| 28 | `treebind:tree_byte_stream_group:asplit_s1_asplit_java_io_group` | `treebind:tree_byte_stream_group:tree_byte_stream_java_io_group` |
| 29 | `treebind:tree_1782746457614_osttpr:asplit_s1_asplit_blocking_io_model` | `treebind:tree_1782746457614_osttpr:tree_java_blocking_io_model` |
| 30 | `treebind:tree_1782746457614_osttpr:asplit_s1_asplit_nonblocking_io_model` | `treebind:tree_1782746457614_osttpr:tree_java_nonblocking_io_model` |
| 31 | `treebind:asplit_s1_asplit_blocking_io_model:tree_io_bio_model` | `treebind:tree_java_blocking_io_model:tree_io_bio_model` |
| 32 | `treebind:asplit_s1_asplit_nonblocking_io_model:tree_io_nio_principle` | `treebind:tree_java_nonblocking_io_model:tree_io_nio_principle` |
| 33 | `treebind:asplit_s1_asplit_nonblocking_io_model:tree_nio_core_group` | `treebind:tree_java_nonblocking_io_model:tree_nio_core_group` |
| 34 | `treebind:asplit_s1_asplit_nonblocking_io_model:tree_io_aio_model` | `treebind:tree_java_nonblocking_io_model:tree_io_aio_model` |
| 35 | `treebind:tree_1784820871692_uel7rq:asplit_s1_asplit_lexical_analysis` | `treebind:tree_1784820871692_uel7rq:tree_pl_theory_lexical_analysis` |
| 36 | `treebind:tree_1784820871692_uel7rq:asplit_s1_asplit_syntax_analysis` | `treebind:tree_1784820871692_uel7rq:tree_pl_theory_syntax_analysis` |
| 37 | `treebind:asplit_s1_asplit_lexical_analysis:tree_1783186425166_crond2` | `treebind:tree_pl_theory_lexical_analysis:tree_1783186425166_crond2` |
| 38 | `treebind:tree_wiki_en_compiler_s3:asplit_s1_asplit_single_pass_compiler` | `treebind:tree_wiki_en_compiler_s3:tree_compiler_single_pass` |
| 39 | `treebind:tree_wiki_en_compiler_s3:asplit_s1_asplit_multi_pass_compiler` | `treebind:tree_wiki_en_compiler_s3:tree_compiler_multi_pass` |
| 40 | `treebind:tree_java_fw_javaweb:asplit_s1_asplit_http_request` | `treebind:tree_java_fw_javaweb:tree_java_fw_http_request` |
| 41 | `treebind:tree_java_fw_javaweb:asplit_s1_asplit_servlet_lifecycle` | `treebind:tree_java_fw_javaweb:tree_java_fw_servlet_lifecycle` |
| 42 | `treebind:tree_java_fw_javaweb:asplit_s1_asplit_servlet_container` | `treebind:tree_java_fw_javaweb:tree_java_fw_servlet_container` |
| 43 | `treebind:tree_java_fw_javaweb:asplit_s1_asplit_view_rendering` | `treebind:tree_java_fw_javaweb:tree_java_fw_view_rendering` |
| 44 | `treebind:tree_1785225243163_ypgo3y:asplit_s1_asplit_bean_lifecycle` | `treebind:tree_1785225243163_ypgo3y:tree_java_fw_bean_lifecycle` |
| 45 | `treebind:tree_java_fw_mybatis:asplit_s1_asplit_mybatis_mapper` | `treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_mapper` |
| 46 | `treebind:tree_java_fw_mybatis:asplit_s1_asplit_dynamic_sql` | `treebind:tree_java_fw_mybatis:tree_java_fw_dynamic_sql` |
| 47 | `treebind:tree_java_fw_netty:asplit_s1_asplit_netty_thread_model` | `treebind:tree_java_fw_netty:tree_java_fw_netty_thread_model` |
| 48 | `treebind:tree_java_fw_netty:asplit_s1_asplit_netty_channel` | `treebind:tree_java_fw_netty:tree_java_fw_netty_channel` |
| 49 | `treebind:tree_java_fw_netty:asplit_s1_asplit_channel_pipeline` | `treebind:tree_java_fw_netty:tree_java_fw_channel_pipeline` |
| 50 | `treebind:tree_java_fw_rabbitmq:asplit_s1_asplit_rabbitmq_exchange` | `treebind:tree_java_fw_rabbitmq:tree_java_fw_rabbitmq_exchange` |
| 51 | `treebind:tree_java_fw_rabbitmq:asplit_s1_asplit_routing_key` | `treebind:tree_java_fw_rabbitmq:tree_java_fw_routing_key` |
| 52 | `treebind:tree_java_fw_springcloud:asplit_s1_asplit_svc_registry_discovery` | `treebind:tree_java_fw_springcloud:tree_java_fw_svc_registry_discovery` |
| 53 | `treebind:tree_java_fw_springcloud:asplit_s1_asplit_load_balancing` | `treebind:tree_java_fw_springcloud:tree_java_fw_load_balancing` |
| 54 | `treebind:tree_java_fw_springcloud:asplit_s1_asplit_svc_invocation` | `treebind:tree_java_fw_springcloud:tree_java_fw_svc_invocation` |
| 55 | `treebind:tree_java_fw_springcloud:asplit_s1_asplit_svc_fault_tolerance` | `treebind:tree_java_fw_springcloud:tree_java_fw_svc_fault_tolerance` |
| 56 | `treebind:tree_java_fw_springcloud:asplit_s1_asplit_config_center` | `treebind:tree_java_fw_springcloud:tree_java_fw_config_center` |
| 57 | `treebind:tree_java_fw_springcloud:asplit_s1_asplit_message_bus` | `treebind:tree_java_fw_springcloud:tree_java_fw_message_bus` |
| 58 | `treebind:tree_java_fw_springcloud:asplit_s1_asplit_service_governance` | `treebind:tree_java_fw_springcloud:tree_java_fw_service_governance` |
| 59 | `treebind:tree_wiki_en_database_s2:asplit_s1_asplit_newsql` | `treebind:tree_wiki_en_database_s2:tree_db_newsql` |
| 60 | `treebind:tree_redis_zset:asplit_s1_asplit_zrank` | `treebind:tree_redis_zset:tree_redis_zrank` |
| 61 | `treebind:tree_redis_zset:asplit_s1_asplit_zrange` | `treebind:tree_redis_zset:tree_redis_zrange` |
| 62 | `treebind:tree_redis_cache_anomaly:asplit_s1_asplit_hot_data` | `treebind:tree_redis_cache_anomaly:tree_redis_cache_hot_data` |
| 63 | `treebind:tree_redis_cache_anomaly:asplit_s1_asplit_cold_data` | `treebind:tree_redis_cache_anomaly:tree_redis_cache_cold_data` |
| 64 | `treebind:react_root:asplit_s1_asplit_module_export` | `treebind:react_root:tree_javascript_module_export` |
| 65 | `treebind:react_root:asplit_s1_asplit_module_import` | `treebind:react_root:tree_javascript_module_import` |
| 66 | `treebind:asplit_s1_asplit_module_export:react_tree_default` | `treebind:tree_javascript_module_export:react_tree_default` |
| 67 | `treebind:asplit_s1_asplit_module_export:react_tree_named` | `treebind:tree_javascript_module_export:react_tree_named` |
| 68 | `treebind:asplit_s1_asplit_module_import:governance:canonical:react_import_aliasing` | `treebind:tree_javascript_module_import:governance:canonical:react_import_aliasing` |
| 69 | `treebind:react_root:asplit_s1_asplit_js_control_flow` | `treebind:react_root:tree_javascript_control_flow` |
| 70 | `treebind:react_root:asplit_s1_asplit_function_design` | `treebind:react_root:tree_javascript_function_design` |
| 71 | `treebind:asplit_s1_asplit_js_control_flow:governance:canonical:k_auto_g1oyi4` | `treebind:tree_javascript_control_flow:governance:canonical:k_auto_g1oyi4` |
| 72 | `treebind:asplit_s1_asplit_js_control_flow:governance:canonical:k_auto_140h0oi` | `treebind:tree_javascript_control_flow:governance:canonical:k_auto_140h0oi` |
| 73 | `treebind:react_root:asplit_s1_asplit_js_expression` | `treebind:react_root:tree_javascript_expression` |
| 74 | `treebind:theory_domain_data_structures:asplit_s1_asplit_graph_search` | `treebind:theory_domain_data_structures:tree_data_structures_graph_search` |
| 75 | `treebind:tree_acm2012_algorithms:asplit_s1_asplit_search` | `treebind:tree_acm2012_algorithms:tree_algorithms_search` |
| 76 | `treebind:theory_domain_operating_systems:asplit_s1_asplit_blocking_io` | `treebind:theory_domain_operating_systems:tree_operating_systems_blocking_io` |
| 77 | `treebind:theory_domain_operating_systems:asplit_s1_asplit_sync_async_io` | `treebind:theory_domain_operating_systems:tree_operating_systems_sync_async_io` |
| 78 | `treebind:asplit_s1_asplit_blocking_io:projection:mysql-term:mysql_glossary_nonblocking_i_o_h65z9a` | `treebind:tree_operating_systems_blocking_io:projection:mysql-term:mysql_glossary_nonblocking_i_o_h65z9a` |
| 79 | `treebind:tree_web_78137b704e08:asplit_s2_asplit_bias_acquire` | `treebind:tree_web_78137b704e08:tree_web_bias_acquire` |
| 80 | `treebind:tree_web_78137b704e08:asplit_s2_asplit_bias_state_anonymous` | `treebind:tree_web_78137b704e08:tree_web_bias_state_anonymous` |
| 81 | `treebind:tree_web_78137b704e08:asplit_s2_asplit_bias_state_biased` | `treebind:tree_web_78137b704e08:tree_web_bias_state_biased` |
| 82 | `treebind:tree_web_78137b704e08:asplit_s2_asplit_bias_state_revoke_pending` | `treebind:tree_web_78137b704e08:tree_web_bias_state_revoke_pending` |
| 83 | `treebind:tree_web_78137b704e08:asplit_s2_asplit_bias_state_revoked` | `treebind:tree_web_78137b704e08:tree_web_bias_state_revoked` |
| 84 | `treebind:tree_web_78137b704e08:asplit_s2_asplit_bias_state_bulk_rebiased` | `treebind:tree_web_78137b704e08:tree_web_bias_state_bulk_rebiased` |
| 85 | `treebind:tree_web_78137b704e08:asplit_s2_asplit_bias_state_bulk_revoked` | `treebind:tree_web_78137b704e08:tree_web_bias_state_bulk_revoked` |
| 86 | `treebind:tree_web_78137b704e08:asplit_s2_asplit_bias_markword` | `treebind:tree_web_78137b704e08:tree_web_bias_markword` |
| 87 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rwlock_mechanism` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rwlock_mechanism` |
| 88 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_write_acquire` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rw_state_write_acquire` |
| 89 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_write_held` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rw_state_write_held` |
| 90 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_write_waiting` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rw_state_write_waiting` |
| 91 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_write_released` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rw_state_write_released` |
| 92 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_read_acquire` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rw_state_read_acquire` |
| 93 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_read_held` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rw_state_read_held` |
| 94 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_read_waiting` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rw_state_read_waiting` |
| 95 | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_read_released` | `treebind:tree_java_lock_rwlock_implementation:tree_java_lock_rwlock_rw_state_read_released` |
| 96 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_trigger_new` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_trigger_new` |
| 97 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_state_class_loaded` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_state_class_loaded` |
| 98 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_state_alloc` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_state_alloc` |
| 99 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_state_zerofill` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_state_zerofill` |
| 100 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_state_set_header` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_state_set_header` |
| 101 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_state_init` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_state_init` |
| 102 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_state_reference` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_state_reference` |
| 103 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_alloc_tlab` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_alloc_tlab` |
| 104 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_access_handle` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_access_handle` |
| 105 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_access_direct` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_access_direct` |
| 106 | `treebind:tree_1783263380057_57s6hh:asplit_s2_asplit_obj_state_oom` | `treebind:tree_1783263380057_57s6hh:tree_jvm_obj_state_oom` |
| 107 | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:asplit_s2_asplit_ss_trigger_open` | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:tree_vault_javamybatis02sqlsession_ss_trigger_open` |
| 108 | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:asplit_s2_asplit_ss_state_opened` | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:tree_vault_javamybatis02sqlsession_ss_state_opened` |
| 109 | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:asplit_s2_asplit_ss_state_executing` | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:tree_vault_javamybatis02sqlsession_ss_state_executing` |
| 110 | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:asplit_s2_asplit_ss_state_dirty` | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:tree_vault_javamybatis02sqlsession_ss_state_dirty` |
| 111 | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:asplit_s2_asplit_ss_state_committed` | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:tree_vault_javamybatis02sqlsession_ss_state_committed` |
| 112 | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:asplit_s2_asplit_ss_state_rolled_back` | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:tree_vault_javamybatis02sqlsession_ss_state_rolled_back` |
| 113 | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:asplit_s2_asplit_ss_state_closed` | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:tree_vault_javamybatis02sqlsession_ss_state_closed` |
| 114 | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:asplit_s2_asplit_ss_factory` | `treebind:tree_vault_javamybatis02sqlsession_5c5wcf:tree_vault_javamybatis02sqlsession_ss_factory` |
| 115 | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_save_cmd` | `treebind:tree_redis_rdb_persistence:tree_redis_rdb_rdb_save_cmd` |
| 116 | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_fork` | `treebind:tree_redis_rdb_persistence:tree_redis_rdb_rdb_state_fork` |
| 117 | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_child_write` | `treebind:tree_redis_rdb_persistence:tree_redis_rdb_rdb_state_child_write` |
| 118 | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_parent_serve` | `treebind:tree_redis_rdb_persistence:tree_redis_rdb_rdb_state_parent_serve` |
| 119 | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_replaced` | `treebind:tree_redis_rdb_persistence:tree_redis_rdb_rdb_state_replaced` |
| 120 | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_loaded` | `treebind:tree_redis_rdb_persistence:tree_redis_rdb_rdb_state_loaded` |
| 121 | `treebind:tree_qproc_thread_state:asplit_s2_asplit_conn_state_handshake` | `treebind:tree_qproc_thread_state:tree_qproc_thread_conn_state_handshake` |
| 122 | `treebind:tree_qproc_thread_state:asplit_s2_asplit_conn_state_auth` | `treebind:tree_qproc_thread_state:tree_qproc_thread_conn_state_auth` |
| 123 | `treebind:tree_qproc_thread_state:asplit_s2_asplit_conn_state_alloc_thread` | `treebind:tree_qproc_thread_state:tree_qproc_thread_conn_state_alloc_thread` |
| 124 | `treebind:tree_qproc_thread_state:asplit_s2_asplit_conn_state_user_thread` | `treebind:tree_qproc_thread_state:tree_qproc_thread_conn_state_user_thread` |
| 125 | `treebind:tree_qproc_thread_state:asplit_s2_asplit_conn_state_sleep` | `treebind:tree_qproc_thread_state:tree_qproc_thread_conn_state_sleep` |
| 126 | `treebind:tree_qproc_thread_state:asplit_s2_asplit_conn_state_closing` | `treebind:tree_qproc_thread_state:tree_qproc_thread_conn_state_closing` |
| 127 | `treebind:tree_qproc_thread_state:asplit_s2_asplit_conn_pool` | `treebind:tree_qproc_thread_state:tree_qproc_thread_conn_pool` |
| 128 | `treebind:tree_java_fw_mybatis:asplit_s2_asplit_mybatis_executor` | `treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_executor` |
| 129 | `treebind:tree_java_fw_mybatis:asplit_s2_asplit_mybatis_statement_handler` | `treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_statement_handler` |
| 130 | `treebind:tree_java_fw_mybatis:asplit_s2_asplit_mybatis_parameter_handler` | `treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_parameter_handler` |
| 131 | `treebind:tree_java_fw_mybatis:asplit_s2_asplit_mybatis_resultset_handler` | `treebind:tree_java_fw_mybatis:tree_java_fw_mybatis_resultset_handler` |
| 132 | `treebind:tree_1785934396723_afsojh:asplit_s1_asplit_suspend_resume_methods` | `treebind:tree_1785934396723_afsojh:tree_java_thread_suspend_resume_methods` |
| 133 | `treebind:tree_1785934396723_afsojh:asplit_s1_asplit_stop_method` | `treebind:tree_1785934396723_afsojh:tree_java_thread_stop_method` |
| 134 | `treebind:tree_concept_lock_mechanism:asplit_s18_asplit_range_lock` | `treebind:tree_concept_lock_mechanism:tree_concept_lock_range_lock` |
| 135 | `treebind:tree_concept_lock_mechanism:asplit_s18_asplit_insert_lock` | `treebind:tree_concept_lock_mechanism:tree_concept_lock_insert_lock` |
| 136 | `treebind:tree_1782846767208_uw6zxc:asplit_s18_asplit_memory_atomicity` | `treebind:tree_1782846767208_uw6zxc:tree_java_concurrency_memory_atomicity` |
| 137 | `treebind:tree_1782846767208_uw6zxc:asplit_s18_asplit_concurrency_mutex_lock` | `treebind:tree_1782846767208_uw6zxc:tree_java_concurrency_mutex_lock` |
| 138 | `treebind:tree_java_fw_javaweb:asplit_s18_asplit_http_request_response` | `treebind:tree_java_fw_javaweb:tree_java_fw_http_request_response` |
| 139 | `treebind:tree_java_fw_javaweb:asplit_s18_asplit_web_attribute_scope` | `treebind:tree_java_fw_javaweb:tree_java_fw_web_attribute_scope` |
| 140 | `treebind:tree_java_fw_javaweb:asplit_s18_asplit_web_state_management` | `treebind:tree_java_fw_javaweb:tree_java_fw_web_state_management` |
| 141 | `treebind:tree_java_fw_kafka:asplit_s18_asplit_kafka_consumer_group` | `treebind:tree_java_fw_kafka:tree_java_fw_kafka_consumer_group` |
| 142 | `treebind:tree_java_fw_kafka:asplit_s18_asplit_kafka_broker` | `treebind:tree_java_fw_kafka:tree_java_fw_kafka_broker` |
| 143 | `treebind:tree_1783867183132_g5tf12:asplit_s1_asplit_java_class` | `treebind:tree_1783867183132_g5tf12:tree_java_syntax_java_class` |
| 144 | `treebind:tree_concept_io_multiplexing:asplit_s1_asplit_select_io` | `treebind:tree_concept_io_multiplexing:tree_concept_io_select_io` |
| 145 | `treebind:tree_concept_io_multiplexing:asplit_s1_asplit_epoll` | `treebind:tree_concept_io_multiplexing:tree_concept_io_epoll` |

## 4. 命名空间分布
| 命名空间 | 条数 |
| `(沿用既有)` | 91 |
| `jvm` | 11 |
| `java_concurrency` | 5 |
| `javascript` | 5 |
| `java_thread` | 2 |
| `java` | 2 |
| `pl_theory` | 2 |
| `compiler` | 2 |
| `db` | 2 |
| `operating_systems` | 2 |
| `distributed_systems` | 2 |
| `java_syntax` | 1 |
| `java_fw` | 1 |
| `data_structures` | 1 |
| `algorithms` | 1 |

## 5. journal（机器可读）
```json
{
  "batch": "t3-p1-apply",
  "mode": "apply",
  "renamedNodes": 130,
  "renamedEdgeIds": 145,
  "unresolvedTreebind": 0,
  "backupDir": "E:\\project\\Knowledge-OS\\data\\backups\\t3-p1-2026-09-14T14-34-44-737Z",
  "realVerification": {
    "renamedNodes": 130,
    "renamedEdgeIds": 145,
    "treeErrors": [],
    "edgeErrors": [],
    "residualOldIds": [],
    "residualAsplitTreeIds": [],
    "nodeCountUnchanged": true,
    "edgeCountUnchanged": true,
    "nodeRefDanglingBefore": 0,
    "nodeRefDanglingAfter": 0,
    "treebindDanglingBefore": 18,
    "treebindDanglingAfter": 18,
    "verdict": "REAL_APPLY_VERIFIED"
  }
}
```