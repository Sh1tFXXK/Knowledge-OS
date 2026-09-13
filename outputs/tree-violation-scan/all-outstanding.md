# 目录树清理 · 全量未完成名单（2026-09-13）

> 基线：树 **3267** 条 · 定罪 **236** 条（固定词组/缩写对/运算符白名单已豁免）
> 性质：**模式定罪 = 待人工/语义审查清单**，不是删除清单。「逻辑与 (&&)」事件即为证据。
> 执行纪律（宪法）：每条动手前 ① 语义判断（真捆绑/误伤）→ ② 正文去向设计 → ③ 孩子上提 → ④ 原子写落盘 → ⑤ 门一六处活引用复扫（scripts/shell-fusion/gate.mjs）→ ⑥ 退池。
> 前置：杀 dev server；备份 data/ → data/backups/cleanup-2026-09-13/；npm test 34/34 起步验收。

---

## E · 提问/动机型（7 条）

**处置**：正文融入名词正身的「产生背景 / 解决的问题 / 适用条件」tab；实战经验归 supplement；判重后并答案不新建卡

**风险**：⚠️ 3 条带孩子，孩子先上提

| # | 树节点 | nodeRef | 子树 | 正文 | 路径 |
|---|---|---|---:|---:|---|
| 1 | JSR-133为什么要增强final的语义 | `k_1785923886439_k5so6c` | 0 | 335字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/基础/关键字/final/final域的内存语义/JSR-133为什么要增强final的语义 |
| 2 | MQ 为什么存在 | `k_vault_javarabbitmq01mq_j62j4c` | 0 | 663字 | 计算机科学/软件符号与工具/软件框架/RabbitMQ/MQ 为什么存在 |
| 3 | 如何发现瓶颈 | `sk_perf_bottleneck` | 0 | 713字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/秒杀系统性能优化方法/如何发现瓶颈 |
| 4 | 数据库是什么类型的东西？ | `k_wiki_en_outline_of_databases_s1` | **3** | 232字 | 计算机科学/信息系统/数据库管理/数据库/一、数据库系统/数据库是什么类型的东西？ |
| 5 | 为什么命中索引比不命中快 | `idxf_overview` | **1** | 694字 | 计算机科学/信息系统/数据库管理/数据库/索引/MySQL 索引/为什么命中索引比不命中快 |
| 6 | 什么时候需要分库分表 | `sharding_when` | 0 | 316字 | 计算机科学/信息系统/数据库管理/数据库/十四、数据库分布与复制/MySQL 分库分表/什么时候需要分库分表 |
| 7 | 如何判断对象可以被回收 | `k_1783264901088_1s02ir` | **2** | 0字 | 计算机科学/系统组织/操作系统/内存管理/垃圾回收/垃圾回收判定/如何判断对象可以被回收 |

## D · 过程/步骤片段（43 条）

**处置**：⚠️ 分三档：A/IO 组 spec 已引用（只改名去序号，严禁删）；Bean 组并入既有 spec；秒杀/流量/军规组新建 mechanismSpec 或 viewDimensions

**风险**：删节点前必查 spec 引用（本批最大坑）

| # | 树节点 | nodeRef | 子树 | 正文 | 路径 |
|---|---|---|---:|---:|---|
| 1 | 执行阶段 | `aop_flow` | **10** | 921字 | 计算机科学/软件符号与工具/软件框架/Spring/AOP/AOP 原理/执行阶段 |
| 2 | ① 代理对象已创建 | `aop_state_proxy_created` | 0 | 154字 | 计算机科学/软件符号与工具/软件框架/Spring/AOP/AOP 原理/执行阶段/① 代理对象已创建 |
| 3 | ② 调用已被拦截 | `aop_state_intercepted` | 0 | 169字 | 计算机科学/软件符号与工具/软件框架/Spring/AOP/AOP 原理/执行阶段/② 调用已被拦截 |
| 4 | ③ 拦截器链执行中 | `aop_state_chain_running` | 0 | 146字 | 计算机科学/软件符号与工具/软件框架/Spring/AOP/AOP 原理/执行阶段/③ 拦截器链执行中 |
| 5 | ④ 织入代码已执行 | `aop_state_advice_done` | 0 | 88字 | 计算机科学/软件符号与工具/软件框架/Spring/AOP/AOP 原理/执行阶段/④ 织入代码已执行 |
| 6 | ⑤ 目标方法已调用（返回） | `aop_state_target_invoked` | 0 | 118字 | 计算机科学/软件符号与工具/软件框架/Spring/AOP/AOP 原理/执行阶段/⑤ 目标方法已调用（返回） |
| 7 | 1. 创建前准备阶段 | `bean_lc_prepare` | 0 | 679字 | 计算机科学/软件符号与工具/软件框架/Spring/Spring Beans/生命周期/1. 创建前准备阶段 |
| 8 | 2. 创建实例阶段 | `bean_lc_instantiate` | 0 | 237字 | 计算机科学/软件符号与工具/软件框架/Spring/Spring Beans/生命周期/2. 创建实例阶段 |
| 9 | 3. 依赖注入阶段 | `bean_lc_inject` | 0 | 648字 | 计算机科学/软件符号与工具/软件框架/Spring/Spring Beans/生命周期/3. 依赖注入阶段 |
| 10 | 4. 容器缓存阶段 | `bean_lc_cache` | 0 | 498字 | 计算机科学/软件符号与工具/软件框架/Spring/Spring Beans/生命周期/4. 容器缓存阶段 |
| 11 | 5. 销毁实例阶段 | `bean_lc_destroy` | 0 | 404字 | 计算机科学/软件符号与工具/软件框架/Spring/Spring Beans/生命周期/5. 销毁实例阶段 |
| 12 | 调用方（getBean 请求） | `bcs_caller` | 0 | 136字 | 计算机科学/软件符号与工具/软件框架/Spring/Spring Beans/Bean 创建策略机制/调用方（getBean 请求） |
| 13 | 1. 预估流量 | `surge_estimate` | 0 | 147字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/流量激增应对方法/1. 预估流量 |
| 14 | 2. 全链路压测 | `surge_stress` | 0 | 158字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/流量激增应对方法/2. 全链路压测 |
| 15 | 3. 定位并解决链路瓶颈 | `surge_bottleneck` | 0 | 272字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/流量激增应对方法/3. 定位并解决链路瓶颈 |
| 16 | 4. 加机器扩容 | `surge_scale` | 0 | 170字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/流量激增应对方法/4. 加机器扩容 |
| 17 | 5. 降级 | `surge_degrade` | 0 | 199字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/流量激增应对方法/5. 降级 |
| 18 | 6. 常态高可用：限流 + 监控报警 | `surge_ha` | 0 | 186字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/流量激增应对方法/6. 常态高可用：限流 + 监控报警 |
| 19 | ① 硬件扩展 + 微服务拆分 | `hps_scale` | 0 | 604字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/QPS 提升 10 倍的系统设计/① 硬件扩展 + 微服务拆分 |
| 20 | ② 高性能 RPC | `hps_rpc` | 0 | 497字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/QPS 提升 10 倍的系统设计/② 高性能 RPC |
| 21 | ③ 消息队列削峰解耦 | `hps_mq` | 0 | 336字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/QPS 提升 10 倍的系统设计/③ 消息队列削峰解耦 |
| 22 | ④ 三级缓存架构 | `hps_cache` | 0 | 414字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/QPS 提升 10 倍的系统设计/④ 三级缓存架构 |
| 23 | ⑤ 读写分离 + 分库分表 | `hps_db` | 0 | 429字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/QPS 提升 10 倍的系统设计/⑤ 读写分离 + 分库分表 |
| 24 | ⑥ 高可用五板斧 | `hps_ha` | 0 | 560字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/QPS 提升 10 倍的系统设计/⑥ 高可用五板斧 |
| 25 | 1. 优先优化高并发执行的 SQL | `sqopt_idea_highconc` | 0 | 389字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/1. 优先优化高并发执行的 SQL |
| 26 | 2. 定位优化对象的性能瓶颈 | `sqopt_idea_bottleneck` | 0 | 261字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/2. 定位优化对象的性能瓶颈 |
| 27 | 3. 明确优化目标 | `sqopt_idea_target` | 0 | 180字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/3. 明确优化目标 |
| 28 | 4. 从 EXPLAIN 执行计划入手 | `sqopt_idea_explain` | 0 | 110字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/4. 从 EXPLAIN 执行计划入手 |
| 29 | 5. 永远用小的结果集驱动大的结果集 | `sqopt_idea_small_drive` | 0 | 421字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/5. 永远用小的结果集驱动大的结果集 |
| 30 | 6. 尽可能在索引中完成排序 | `sqopt_idea_sort_index` | 0 | 211字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/6. 尽可能在索引中完成排序 |
| 31 | 7. 只获取自己需要的列 | `sqopt_idea_columns` | 0 | 101字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/7. 只获取自己需要的列 |
| 32 | 8. 只使用最有效的过滤条件 | `sqopt_idea_filter` | 0 | 97字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/8. 只使用最有效的过滤条件 |
| 33 | 9. 尽可能避免复杂的 join 和子查询 | `sqopt_idea_join` | 0 | 218字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/9. 尽可能避免复杂的 join 和子查询 |
| 34 | 10. 合理设计并利用索引 | `sqopt_idea_index` | 0 | 787字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢查询 SQL 优化思路/慢查询优化思路（十条）/10. 合理设计并利用索引 |
| 35 | ① read 发起（用户态→内核态） | `tio_state_read_syscall` | 0 | 120字 | 计算机科学/系统组织/操作系统/零拷贝/传统 IO 执行流程/① read 发起（用户态→内核态） |
| 36 | ② DMA：磁盘 → 内核缓冲区 | `tio_state_disk_to_kernel` | 0 | 82字 | 计算机科学/系统组织/操作系统/零拷贝/传统 IO 执行流程/② DMA：磁盘 → 内核缓冲区 |
| 37 | ③ CPU：内核缓冲区 → 用户缓冲区（返回） | `tio_state_kernel_to_user` | 0 | 149字 | 计算机科学/系统组织/操作系统/零拷贝/传统 IO 执行流程/③ CPU：内核缓冲区 → 用户缓冲区（返回） |
| 38 | ④ write 发起（用户态→内核态） | `tio_state_write_syscall` | 0 | 111字 | 计算机科学/系统组织/操作系统/零拷贝/传统 IO 执行流程/④ write 发起（用户态→内核态） |
| 39 | ⑤ CPU：用户缓冲区 → socket 缓冲区 | `tio_state_user_to_socket` | 0 | 104字 | 计算机科学/系统组织/操作系统/零拷贝/传统 IO 执行流程/⑤ CPU：用户缓冲区 → socket 缓冲区 |
| 40 | ⑥ DMA：socket 缓冲区 → 网卡（返回） | `tio_state_socket_to_nic` | 0 | 149字 | 计算机科学/系统组织/操作系统/零拷贝/传统 IO 执行流程/⑥ DMA：socket 缓冲区 → 网卡（返回） |

## G · 「X的使用/实现/原理」描述短语（16 条）

**处置**：去后缀归本体：正文并入 X 正身的「使用示例 / 底层原理」tab；带孩子的先上提

| # | 树节点 | nodeRef | 子树 | 正文 | 路径 |
|---|---|---|---:|---:|---|
| 1 | Thread.join()的使用 | `k_1786006383348_b3urv6` | 0 | 200字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/进程与线程/线程间通信/Thread.join()的使用 |
| 2 | 并发编程模型的分类 | `k_1785858027135_0kyc09` | 0 | 420字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/并发编程模型的分类 |
| 3 | ScheduledThreadPoolExecutor的运行机制 | `k_1786093374519_hpf2za` | 0 | 581字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/ScheduledThreadPoolExecutor详解/ScheduledThreadPoolExecutor的运行机制 |
| 4 | ScheduledThreadPoolExecutor的实现 | `k_1786093418355_sfztn1` | 0 | 2044字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/ScheduledThreadPoolExecutor详解/ScheduledThreadPoolExecutor的实现 |
| 5 | FutureTask的使用 | `k_1786095306516_p6jjye` | 0 | 273字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/FutureTask详解/FutureTask的使用 |
| 6 | FutureTask的实现 | `k_1786095970289_himodp` | 0 | 1934字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/FutureTask详解/FutureTask的实现 |
| 7 | 线程池的使用 | `k_1786092211800_3qjdgk` | **5** | 0字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/线程池/线程池的使用 |
| 8 | ThreadLocal的使用 | `k_1786007130617_bg40je` | 0 | 1942字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/线程封闭 / thread confinement/ThreadLocal/ThreadLocal的使用 |
| 9 | 锁内存语义的实现 | `k_1785930453004_76yzal` | 0 | 4字 | 计算机科学/软件符号与工具/编程语言/java/锁/锁的内存语义/锁内存语义的实现 |
| 10 | concurrent包的实现 | `k_1785930533314_v6o8w3` | 0 | 717字 | 计算机科学/软件符号与工具/编程语言/java/锁/锁的内存语义/concurrent包的实现 |
| 11 | 在 Java 平台之外的使用 | `k_1784343857067_9mwzhg` | **1** | 117字 | 计算机科学/软件符号与工具/编程语言/java/在 Java 平台之外的使用 |
| 12 | final语义在处理器中的实现 | `k_1785923827211_su53t2` | 0 | 314字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/基础/关键字/final/final域的内存语义/final语义在处理器中的实现 |
| 13 | volatile的原理 | `k_web_8c66406b75e1_s2` | 0 | 471字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/基础/关键字/volatile/volatile的原理 |
| 14 | volatile内存语义的实现 | `k_1785928396279_obb0dn` | **1** | 62字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/基础/关键字/volatile/volatile内存语义的实现 |
| 15 | 分析器的使用 | `k_wiki_en_profiling_computer_programming_s2` | 0 | 778字 | 计算机科学/软件符号与工具/编程语言/程序分析/动态程序分析/分析（计算机编程）/分析器的使用 |
| 16 | AOF持久化的实现 | `k_1786246985753_w4fbw9` | 0 | 58字 | 计算机科学/信息系统/数据库管理/数据库/二、数据模型/NoSQL/Redis/持久化选项/AOF持久化/AOF持久化的实现 |

## C · 教程/章节外壳（37 条）

**处置**：详解壳去「详解」并正身；章节壳去「一、二、」序号改实名；「基础」→ 实名或解散；子树一律原样保留

**风险**：体量最大风险最低：675 孩零损失

| # | 树节点 | nodeRef | 子树 | 正文 | 路径 |
|---|---|---|---:|---:|---|
| 1 | ThreadPoolExecutor详解 | `k_1786093143886_qda5cu` | **3** | 42791字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/ThreadPoolExecutor详解 |
| 2 | FixedThreadPool详解 | `k_1786093174816_8f6sp8` | 0 | 949字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/ThreadPoolExecutor详解/FixedThreadPool详解 |
| 3 | SingleThreadExecutor详解 | `k_1786093231291_1p3kk2` | 0 | 669字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/ThreadPoolExecutor详解/SingleThreadExecutor详解 |
| 4 | CachedThreadPool详解 | `k_1786093265033_rqvw3n` | 0 | 1418字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/ThreadPoolExecutor详解/CachedThreadPool详解 |
| 5 | ScheduledThreadPoolExecutor详解 | `k_1786093346748_5mapqp` | **2** | 221字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/ScheduledThreadPoolExecutor详解 |
| 6 | FutureTask详解 | `k_1786095193093_odfdcm` | **2** | 845字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Executor框架/FutureTask详解 |
| 7 | 线程池详解 | `k_vault_java_1n4uei` | 0 | 26047字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/线程池详解 |
| 8 | Java 多线程编程入门 | `k_vault_javajava_vzjv8p` | 0 | 17694字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Java 多线程编程入门 |
| 9 | JVM 基础 | `k_vault_javajvm01jvm_1h8bru` | 0 | 3598字 | 计算机科学/软件符号与工具/编程语言/java/执行系统/jvm/JVM 基础 |
| 10 | 基础 | `k_java_syntax_zh_1oty7br` | **6** | 28字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/基础 |
| 11 | Java 集合框架总览 | `k_vault_javajava_15bnft` | 0 | 20130字 | 计算机科学/软件符号与工具/编程语言/java/集合框架/Java 集合框架总览 |
| 12 | Java 数据结构基础 | `k_vault_javajava_ii523d` | 0 | 7888字 | 计算机科学/软件符号与工具/编程语言/java/集合框架/Java 数据结构基础 |
| 13 | ArrayList 详解 | `k_vault_javajavaarraylist_an0rm3` | 0 | 17126字 | 计算机科学/软件符号与工具/编程语言/java/集合框架/ArrayList 详解 |
| 14 | LinkedList 详解 | `k_vault_javajavalinkedlist_1uc0ii` | 0 | 19626字 | 计算机科学/软件符号与工具/编程语言/java/集合框架/LinkedList 详解 |
| 15 | HashMap 详解 | `k_vault_javajavahashmap_14a6f2` | 0 | 15337字 | 计算机科学/软件符号与工具/编程语言/java/集合框架/HashMap 详解 |
| 16 | HashSet 详解 | `k_vault_javajavahashset_176pvr` | 0 | 11229字 | 计算机科学/软件符号与工具/编程语言/java/集合框架/HashSet 详解 |
| 17 | MyBatis 定位总览 | `k_vault_javamybatismybatis_14eqlq` | 0 | 3521字 | 计算机科学/软件符号与工具/软件框架/Mybatis/MyBatis 定位总览 |
| 18 | Kafka 定位总览 | `k_vault_javakafkakafka_1qlqb8` | 0 | 2073字 | 计算机科学/软件符号与工具/软件框架/Kafka/Kafka 定位总览 |
| 19 | Spring Cloud 定位总览 | `k_vault_javaspringcloudspringcloud_33p5su` | 0 | 1639字 | 计算机科学/软件符号与工具/软件框架/Spring Cloud/Spring Cloud 定位总览 |
| 20 | 软件开发（实践总览） | `k_1783873300296_o38v1d` | **9** | 55字 | 计算机科学/软件开发（实践总览） |
| 21 | 进阶思路：监控驱动动态扩容 | `surge_auto_scale` | 0 | 445字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/流量激增应对方法/进阶思路：监控驱动动态扩容 |
| 22 | 一、数据库系统 | `container:chapter_db_01` | **17** | 198字 | 计算机科学/信息系统/数据库管理/数据库/一、数据库系统 |
| 23 | 二、数据模型 | `container:chapter_db_02` | **7** | 202字 | 计算机科学/信息系统/数据库管理/数据库/二、数据模型 |
| 24 | 三、数据库结构 | `container:chapter_db_03` | **15** | 256字 | 计算机科学/信息系统/数据库管理/数据库/三、数据库结构 |
| 25 | 五、数据库操作 | `container:chapter_db_05` | **10** | 278字 | 计算机科学/信息系统/数据库管理/数据库/五、数据库操作 |
| 26 | 八、恢复系统 | `container:chapter_db_08` | **10** | 300字 | 计算机科学/信息系统/数据库管理/数据库/八、恢复系统 |
| 27 | 九、日志系统 | `container:chapter_db_09` | **9** | 288字 | 计算机科学/信息系统/数据库管理/数据库/九、日志系统 |
| 28 | 十、存储系统 | `container:chapter_db_10` | **11** | 298字 | 计算机科学/信息系统/数据库管理/数据库/十、存储系统 |
| 29 | 十二、数据表示 | `container:chapter_db_12` | **7** | 372字 | 计算机科学/信息系统/数据库管理/数据库/十二、数据表示 |
| 30 | 十三、数据库设计 | `container:chapter_db_13` | **2** | 108字 | 计算机科学/信息系统/数据库管理/数据库/十三、数据库设计 |
| 31 | 十四、数据库分布与复制 | `container:chapter_db_14` | **3** | 166字 | 计算机科学/信息系统/数据库管理/数据库/十四、数据库分布与复制 |
| 32 | 十六、数据库安全 | `container:chapter_db_16` | **1** | 96字 | 计算机科学/信息系统/数据库管理/数据库/十六、数据库安全 |
| 33 | 十七、数据库运维 | `container:chapter_db_17` | **14** | 280字 | 计算机科学/信息系统/数据库管理/数据库/十七、数据库运维 |
| 34 | 十八、数据库编程与接口 | `container:chapter_db_18` | **3** | 258字 | 计算机科学/信息系统/数据库管理/数据库/十八、数据库编程与接口 |
| 35 | 十九、数据库产品 | `container:chapter_db_19` | **1** | 96字 | 计算机科学/信息系统/数据库管理/数据库/十九、数据库产品 |
| 36 | 二十、数据库文件与实现 | `container:chapter_db_20` | **3** | 182字 | 计算机科学/信息系统/数据库管理/数据库/二十、数据库文件与实现 |
| 37 | 跨系统标准与约定（总览） | `school_real_world_conventions` | 0 | 23字 | 计算机科学/信息系统/跨系统标准与约定（总览） |

## A · 「X 与 Y」捆绑候选（136 条 · 已豁免误伤）

**处置**：逐条人工判真捆绑/误伤：真捆绑拆双名词+语义边+supplement 承载差异；误伤保留（如 逻辑与(&&)）

**风险**：⚠️ 不许脚本批处理，逐条过

| # | 树节点 | nodeRef | 子树 | 正文 | 路径 |
|---|---|---|---:|---:|---|
| 1 | 抽象与具体 | `k_class_programming_abstract_concrete` | 0 | 498字 | 计算机科学/软件符号与工具/编程范式/面向对象/类与对象/类（编程）/分类/抽象与具体 |
| 2 | 局部类与内部类 | `k_class_programming_inner_local_class` | 0 | 374字 | 计算机科学/软件符号与工具/编程范式/面向对象/类与对象/类（编程）/分类/局部类与内部类 |
| 3 | 动态配置与消息传递机制 | `k_1783253570024_91h099` | 0 | 113字 | 计算机科学/软件符号与工具/编程范式/面向对象/动态配置与消息传递机制 |
| 4 | 责任驱动设计与数据驱动设计 | `k_1784222526071_nwu5h9` | 0 | 128字 | 计算机科学/软件符号与工具/编程范式/面向对象/责任驱动设计与数据驱动设计 |
| 5 | 面向对象与数据库 | `k_1784222473047_i8okyb` | 0 | 450字 | 计算机科学/软件符号与工具/编程范式/面向对象/面向对象与数据库 |
| 6 | volatile和synchronized关键字 | `k_1785935891217_x3mmg0` | 0 | 387字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/进程与线程/线程间通信/volatile和synchronized关键字 |
| 7 | 启动和终止线程 | `k_1785946330787_qxi6nd` | **5** | 0字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/进程与线程/启动和终止线程 |
| 8 | 过期的suspend()、resume()和stop() | `k_1785948961195_1xnaph` | 0 | 318字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/进程与线程/启动和终止线程/过期的suspend()、resume()和stop() |
| 9 | 锁和同步块 | `k_1784367586077_d1lo68` | 0 | 187字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/内存模型/同步/锁和同步块 |
| 10 | 数据竞争与顺序一致性 | `k_1785862255504_n868d4` | 0 | 353字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/内存模型/顺序一致性/数据竞争与顺序一致性 |
| 11 | 双重检查锁定与延迟初始化 | `k_1785931080708_ow14lj` | 0 | 0字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/双重检查锁定与延迟初始化 |
| 12 | Java并发容器和框架 | `k_1785946513462_w2f2gm` | **4** | 0字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Java并发容器和框架 |
| 13 | ConcurrentHashMap的实现原理与使用 | `k_1786029977438_n8rnz9` | **3** | 0字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Java并发容器和框架/ConcurrentHashMap的实现原理与使用 |
| 14 | 初始化segmentShift和segmentMask | `k_1786031584506_or69x1` | 0 | 359字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Java并发容器和框架/ConcurrentHashMap的实现原理与使用/初始化/初始化segmentShift和segmentMask |
| 15 | 生产者和消费者模式 | `k_1786096455966_qnfpwx` | **1** | 506字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Java并发编程实践/生产者和消费者模式 |
| 16 | 线程池与生产消费者模式 | `k_1786096565572_f8y44t` | 0 | 609字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/Java并发编程实践/线程池与生产消费者模式 |
| 17 | 线程基础与生命周期 | `k_vault_java01_1hsx4k` | 0 | 1738字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/线程基础与生命周期 |
| 18 | 线程安全与锁 | `k_vault_java02_hjsqh3` | 0 | 1379字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/线程安全与锁 |
| 19 | AQS 与 JUC 工具 | `k_vault_java04aqsjuc_1n8jz3` | 0 | 1331字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/AQS 与 JUC 工具 |
| 20 | 并发容器与调度 | `k_vault_java05_1l9ptm` | 0 | 658字 | 计算机科学/软件符号与工具/编程语言/java/java并发编程/并发容器与调度 |
| 21 | 批量重偏向和撤销 | `k_web_78137b704e08_s1` | 0 | 1118字 | 计算机科学/软件符号与工具/编程语言/java/锁/偏向锁/批量重偏向和撤销 |
| 22 | 获取偏向锁和释放锁 | `k_web_78137b704e08_s3` | 0 | 451字 | 计算机科学/软件符号与工具/编程语言/java/锁/偏向锁/获取偏向锁和释放锁 |
| 23 | 锁的释放和获取的内存语义 | `k_1785930411087_dpbglm` | 0 | 150字 | 计算机科学/软件符号与工具/编程语言/java/锁/锁的内存语义/锁的释放和获取的内存语义 |
| 24 | 队列同步器的接口与示例 | `k_1786017052246_ok0jl6` | **2** | 455字 | 计算机科学/软件符号与工具/编程语言/java/锁/队列同步器/队列同步器的接口与示例 |
| 25 | 读写锁的接口与示例 | `k_1786026226542_k0x0er` | 0 | 119字 | 计算机科学/软件符号与工具/编程语言/java/锁/读写锁/读写锁的接口与示例 |
| 26 | 写锁的获取与释放 | `k_1786027326976_qawj4t` | 0 | 856字 | 计算机科学/软件符号与工具/编程语言/java/锁/读写锁/读写锁的实现分析/写锁的获取与释放 |
| 27 | 读锁的获取与释放 | `k_1786027471125_64ip4n` | 0 | 775字 | 计算机科学/软件符号与工具/编程语言/java/锁/读写锁/读写锁的实现分析/读锁的获取与释放 |
| 28 | Condition接口与示例 | `k_1786029569920_2k0ima` | 0 | 138字 | 计算机科学/软件符号与工具/编程语言/java/锁/Condition接口/Condition接口与示例 |
| 29 | Java JVM和字节码 | `k_1784337591301_a0pi82` | 0 | 514字 | 计算机科学/软件符号与工具/编程语言/java/执行系统/Java JVM和字节码 |
| 30 | 元空间与永久代 | `k_jvm_meta_perm` | **2** | 2932字 | 计算机科学/软件符号与工具/编程语言/java/执行系统/jvm/元空间与永久代 |
| 31 | 对象创建与内存分配 | `k_1786353277269_msn0ma9cr` | 0 | 12457字 | 计算机科学/软件符号与工具/编程语言/java/执行系统/jvm/对象创建与内存分配 |
| 32 | 垃圾回收与收集器 | `k_vault_javajvm03_uitasu` | 0 | 4069字 | 计算机科学/软件符号与工具/编程语言/java/执行系统/jvm/垃圾回收与收集器 |
| 33 | JVM 参数与调优（学习笔记） | `k_vault_javajvm04jvm_i15q6w` | 0 | 2834字 | 计算机科学/软件符号与工具/编程语言/java/执行系统/jvm/JVM 参数与调优（学习笔记） |
| 34 | volatile与有序性 | `k_web_8c66406b75e1_s4` | 0 | 367字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/基础/关键字/volatile/特性/volatile与有序性 |
| 35 | volatile与原子性 | `k_web_8c66406b75e1_s5` | 0 | 1169字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/基础/关键字/volatile/特性/volatile与原子性 |
| 36 | 装箱和拆箱 | `k_1784039625817_rqf584` | 0 | 120字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/数据类型/原始类型/装箱和拆箱 |
| 37 | 方法引用类型与等效 Lambda | `k_1787851922974_3icj0m` | 0 | 279字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/数据类型/引用类型/Java类/方法/方法引用/方法引用类型与等效 Lambda |
| 38 | 泛型方法和构造函数 | `k_1784302612170_gqyj2l` | 0 | 95字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/数据类型/引用类型/Java泛型/泛型方法和构造函数 |
| 39 | Java 对象和类 | `k_vault_javajava_1ykhww` | 0 | 995字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/类与对象/Java 对象和类 |
| 40 | 重写（Override）与重载（Overload） | `k_vault_javajavaoverrideoverload_18u2us` | 0 | 7521字 | 计算机科学/软件符号与工具/编程语言/java/Java syntax/重写（Override）与重载（Overload） |
| 41 | 文件流与缓冲流 | `k_file_buffered_stream` | 0 | 896字 | 计算机科学/软件符号与工具/编程语言/java/常用类库/java.io 字节流/文件流与缓冲流 |
| 42 | 数据流与对象流 | `k_data_object_stream` | 0 | 805字 | 计算机科学/软件符号与工具/编程语言/java/常用类库/java.io 字节流/数据流与对象流 |
| 43 | 文件流与缓冲流 | `k_file_buffered_char` | 0 | 1138字 | 计算机科学/软件符号与工具/编程语言/java/常用类库/java.io 字符流/文件流与缓冲流 |
| 44 | java.io 文件与控制台 | `k_file_console_group` | **4** | 400字 | 计算机科学/软件符号与工具/编程语言/java/常用类库/java.io 文件与控制台 |
| 45 | java.nio 通道与缓冲区 | `k_nio_impl_group` | **7** | 911字 | 计算机科学/软件符号与工具/编程语言/java/常用类库/java.nio 通道与缓冲区 |
| 46 | Path与FileSystem | `k_nio_path_filesystem` | 0 | 2005字 | 计算机科学/软件符号与工具/编程语言/java/常用类库/java.nio 通道与缓冲区/Path与FileSystem |
| 47 | IO 与 NIO | `k_java_io_nio` | **5** | 903字 | 计算机科学/软件符号与工具/编程语言/java/IO 与 NIO |
| 48 | IO 流的分类与框架体系 | `k_java_io_stream_classification` | 0 | 9927字 | 计算机科学/软件符号与工具/编程语言/java/IO 与 NIO/IO 流的分类与框架体系 |
| 49 | 词法与语法 | `k_1783186255415_ir9mlw` | **1** | 0字 | 计算机科学/软件符号与工具/编程语言/编程语言理论/词法与语法 |
| 50 | 语言评估与争议 | `k_goexplain_eval` | 0 | 1420字 | 计算机科学/软件符号与工具/编程语言/go/语言评估与争议 |
| 51 | 变量与常量 | `k_1787766295230_qi9z13` | 0 | 0字 | 计算机科学/软件符号与工具/编程语言/go/变量与常量 |
| 52 | 逃逸分析和锁粗化 | `k_wiki_en_java_performance_s8` | 0 | 625字 | 计算机科学/软件符号与工具/编程语言/程序分析/动态程序分析/Java性能/虚拟机优化方法/其他优化方法/逃逸分析和锁粗化 |
| 53 | 与其他语言的比较 | `k_wiki_en_java_performance_s14` | **9** | 391字 | 计算机科学/软件符号与工具/编程语言/程序分析/动态程序分析/Java性能/与其他语言的比较 |
| 54 | 与口译员的比较 | `k_wiki_en_compiler_s1` | 0 | 404字 | 计算机科学/软件符号与工具/编程语言/编译原理/执行/编译器/与口译员的比较 |
| 55 | 单遍编译器与多遍编译器 | `k_wiki_en_compiler_s4` | 0 | 520字 | 计算机科学/软件符号与工具/编程语言/编译原理/执行/编译器/编译器构建/单遍编译器与多遍编译器 |
| 56 | 注释和参考文献 | `k_wiki_en_compiler_s12` | 0 | 7字 | 计算机科学/软件符号与工具/编程语言/编译原理/执行/编译器/注释和参考文献 |
| 57 | Unix 和类 Unix | `k_wiki_en_linker_computing_s8` | 0 | 180字 | 计算机科学/软件符号与工具/编程语言/编译原理/执行/链接器（计算）/值得注意的实施/Unix 和类 Unix |
| 58 | HTTP 请求与 Servlet 模型 | `k_vault_javajavaweb01httpservlet_31o6os` | 0 | 802字 | 计算机科学/软件符号与工具/软件框架/JavaWeb/HTTP 请求与 Servlet 模型 |
| 59 | Servlet 生命周期与容器协作 | `k_vault_javajavaweb02servlet_1lm1rc` | 0 | 987字 | 计算机科学/软件符号与工具/软件框架/JavaWeb/Servlet 生命周期与容器协作 |
| 60 | JSP 与视图渲染 | `k_vault_javajavaweb05jsp_qu145w` | 0 | 603字 | 计算机科学/软件符号与工具/软件框架/JavaWeb/JSP 与视图渲染 |
| 61 | getBean 与切面匹配 | `aop_getbean` | 0 | 438字 | 计算机科学/软件符号与工具/软件框架/Spring/AOP/AOP 原理/执行阶段/getBean 与切面匹配 |
| 62 | ProxyFactory 与代理策略 | `aop_proxyfactory` | 0 | 920字 | 计算机科学/软件符号与工具/软件框架/Spring/AOP/AOP 原理/执行阶段/ProxyFactory 与代理策略 |
| 63 | IoC 理解与初始化 | `k_vault_javaspringiocioc_1jelty` | 0 | 4034字 | 计算机科学/软件符号与工具/软件框架/Spring/IoC容器/IoC 理解与初始化 |
| 64 | 创建和管理 beans | `k_1784445382626_trbqgz` | **2** | 313字 | 计算机科学/软件符号与工具/软件框架/Spring/Spring Framework 模块/控制反转容器/创建和管理 beans |
| 65 | 依赖注入与 Bean 生命周期 | `k_vault_javaspring02bean_eazzu3` | 0 | 1021字 | 计算机科学/软件符号与工具/软件框架/Spring/Spring Beans/生命周期/依赖注入与 Bean 生命周期 |
| 66 | MyBatis 核心定位与组成 | `k_vault_javamybatis01mybatis_ga6dza` | 0 | 1808字 | 计算机科学/软件符号与工具/软件框架/Mybatis/MyBatis 核心定位与组成 |
| 67 | SqlSession 与生命周期 | `k_vault_javamybatis02sqlsession_5c5wcf` | 0 | 1823字 | 计算机科学/软件符号与工具/软件框架/Mybatis/SqlSession 与生命周期 |
| 68 | Mapper 与动态 SQL | `k_vault_javamybatis04mappersql_kti5vu` | 0 | 1852字 | 计算机科学/软件符号与工具/软件框架/Mybatis/Mapper 与动态 SQL |
| 69 | MyBatis 执行机制与插件 | `k_vault_javamybatis05_qwqa86` | 0 | 1304字 | 计算机科学/软件符号与工具/软件框架/Mybatis/MyBatis 执行机制与插件 |
| 70 | Netty 定位与通信抽象 | `k_vault_javanetty01netty_1s7ki8` | 0 | 891字 | 计算机科学/软件符号与工具/软件框架/Netty/Netty 定位与通信抽象 |
| 71 | Netty 的 Reactor 与线程模型 | `k_vault_javanetty02reactor_1nzb1c` | 0 | 1333字 | 计算机科学/软件符号与工具/软件框架/Netty/Netty 的 Reactor 与线程模型 |
| 72 | Netty 的 Channel 与 Pipeline | `k_vault_javanetty03channelpipeline_15ze4x` | 0 | 1078字 | 计算机科学/软件符号与工具/软件框架/Netty/Netty 的 Channel 与 Pipeline |
| 73 | Netty 异步能力与高性能设计 | `k_vault_javanetty04_4zawtb` | 0 | 1152字 | 计算机科学/软件符号与工具/软件框架/Netty/Netty 异步能力与高性能设计 |
| 74 | Netty 与 RPC 实践 | `k_vault_javanetty05nettyrpc_mq7c8m` | 0 | 1038字 | 计算机科学/软件符号与工具/软件框架/Netty/Netty 与 RPC 实践 |
| 75 | Kafka 定位与消息模型 | `k_vault_javakafka01kafka_gu4pva` | 0 | 515字 | 计算机科学/软件符号与工具/软件框架/Kafka/Kafka 定位与消息模型 |
| 76 | Kafka 顺序、吞吐与适用场景 | `k_vault_javakafka04_1s6eok` | 0 | 520字 | 计算机科学/软件符号与工具/软件框架/Kafka/Kafka 顺序、吞吐与适用场景 |
| 77 | 交换机路由与工作模式 | `k_vault_javarabbitmq03_1n5hv5` | 0 | 729字 | 计算机科学/软件符号与工具/软件框架/RabbitMQ/交换机路由与工作模式 |
| 78 | RabbitMQ 可靠性、顺序与幂等 | `k_vault_javarabbitmq04_1a58e6` | 0 | 569字 | 计算机科学/软件符号与工具/软件框架/RabbitMQ/RabbitMQ 可靠性、顺序与幂等 |
| 79 | RabbitMQ 与 Kafka 选型 | `k_vault_javarabbitmq05rabbitmqkafka_16ryk1` | 0 | 571字 | 计算机科学/软件符号与工具/软件框架/RabbitMQ/RabbitMQ 与 Kafka 选型 |
| 80 | Spring Cloud 定位与系统问题 | `k_vault_javaspringcloud01springcloud_1gr4uj` | 0 | 562字 | 计算机科学/软件符号与工具/软件框架/Spring Cloud/Spring Cloud 定位与系统问题 |
| 81 | 注册发现与负载均衡 | `k_vault_javaspringcloud02_13kn6x` | 0 | 774字 | 计算机科学/软件符号与工具/软件框架/Spring Cloud/注册发现与负载均衡 |
| 82 | 服务调用与容错 | `k_vault_javaspringcloud03_dhfhyx` | 0 | 816字 | 计算机科学/软件符号与工具/软件框架/Spring Cloud/服务调用与容错 |
| 83 | 配置中心与消息总线 | `k_vault_javaspringcloud04_1liuns` | 0 | 766字 | 计算机科学/软件符号与工具/软件框架/Spring Cloud/配置中心与消息总线 |
| 84 | 网关与治理组件 | `k_vault_javaspringcloud05_1tepi4` | 0 | 760字 | 计算机科学/软件符号与工具/软件框架/Spring Cloud/网关与治理组件 |
| 85 | Spring Cloud 生态与技术选型 | `k_vault_javaspringcloud06springcloud_acgmi2` | 0 | 1020字 | 计算机科学/软件符号与工具/软件框架/Spring Cloud/Spring Cloud 生态与技术选型 |
| 86 | 性能的定义与 QPS 公式 | `sk_perf_def` | 0 | 548字 | 计算机科学/软件开发（实践总览）/软件工程/性能优化/秒杀系统性能优化方法/性能的定义与 QPS 公式 |
| 87 | 2000 年代，NoSQL 和 NewSQL | `k_wiki_en_database_s9` | 0 | 681字 | 计算机科学/信息系统/数据库管理/数据库/一、数据库系统/历史/2000 年代，NoSQL 和 NewSQL |
| 88 | Ling Liu) 和 Tamer M. Özsu (Eds.) (2009)。  “数据库系统百科全书, 4100 p. 60 illust. ISBN: 978 | `k_wiki_en_outline_of_databases_s35_b1` | 0 | 151字 | 计算机科学/信息系统/数据库管理/数据库/一、数据库系统/数据库相关出版物/Ling Liu) 和 Tamer M. Özsu (Eds.) (2009)。  “数据库系统百科全书, 4100 p. 60 illust. ISBN: 978 |
| 89 | 康诺利、托马斯和卡罗琳·贝格。 *数据库系统。*纽约：Harlow，2002 年。 | `k_wiki_en_outline_of_databases_s35_b3` | 0 | 41字 | 计算机科学/信息系统/数据库管理/数据库/一、数据库系统/数据库相关出版物/康诺利、托马斯和卡罗琳·贝格。 *数据库系统。*纽约：Harlow，2002 年。 |
| 90 | Gray, J. 和 Reuter, A. *交易处理：概念和技术*，第 1 版，Morgan Kaufmann 出版社，1992 年。 | `k_wiki_en_outline_of_databases_s35_b5` | 0 | 68字 | 计算机科学/信息系统/数据库管理/数据库/一、数据库系统/数据库相关出版物/Gray, J. 和 Reuter, A. *交易处理：概念和技术*，第 1 版，Morgan Kaufmann 出版社，1992 年。 |
| 91 | 大卫·M·克伦克和大卫·J·奥尔。 *数据库概念。*第三版。纽约：普伦蒂斯，2007 年。 | `k_wiki_en_outline_of_databases_s35_b6` | 0 | 45字 | 计算机科学/信息系统/数据库管理/数据库/一、数据库系统/数据库相关出版物/大卫·M·克伦克和大卫·J·奥尔。 *数据库概念。*第三版。纽约：普伦蒂斯，2007 年。 |
| 92 | 特奥雷，T.； Lightstone, S. 和 Nadeau, T. *数据库建模与设计：逻辑设计*，第 4 版，Morgan Kaufmann Press，2005 年。ISBN：0 | `k_wiki_en_outline_of_databases_s35_b8` | 0 | 105字 | 计算机科学/信息系统/数据库管理/数据库/一、数据库系统/数据库相关出版物/特奥雷，T.； Lightstone, S. 和 Nadeau, T. *数据库建模与设计：逻辑设计*，第 4 版，Morgan Kaufmann Press，2005 年。ISBN：0 |
| 93 | ZSET 命令：ZRANK 与 ZRANGE | `k_vault_redis_datatypes` | 0 | 2631字 | 计算机科学/信息系统/数据库管理/数据库/二、数据模型/NoSQL/Redis/数据类型/zset/ZSET 命令：ZRANK 与 ZRANGE |
| 94 | 发布与订阅 | `k_1786241151946_frfy1k` | 0 | 556字 | 计算机科学/信息系统/数据库管理/数据库/二、数据模型/NoSQL/Redis/发布与订阅 |
| 95 | 热点数据和冷数据 | `k_1786340628339_0gswor` | 0 | 366字 | 计算机科学/信息系统/数据库管理/数据库/二、数据模型/NoSQL/Redis/缓存异常/热点数据和冷数据 |
| 96 | RDB文件的创建与载入 | `k_1786246332541_3yq6h7` | 0 | 295字 | 计算机科学/信息系统/数据库管理/数据库/二、数据模型/NoSQL/Redis/持久化选项/RDB持久化/RDB文件的创建与载入 |
| 97 | 数据约束与标识 | `container:chapter_db_04` | **8** | 334字 | 计算机科学/信息系统/数据库管理/数据库/数据约束与标识 |
| 98 | uuid 和自增 id 的索引结构对比 | `pk_index_struct` | **2** | 142字 | 计算机科学/信息系统/数据库管理/数据库/数据约束与标识/主键/主键类型选择：自增 vs UUID/uuid 和自增 id 的索引结构对比 |
| 99 | 连接与线程状态 | `qproc_thread_state` | **2** | 1035字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/MySQL 查询执行过程/内部执行流程（六步）/客户端（Client）/连接与线程状态 |
| 100 | 表拆分与分库优化 | `diag_split` | 0 | 983字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢 SQL 排查思路/表拆分与分库优化 |
| 101 | 热点数据与缓存优化 | `diag_hot_cache` | 0 | 544字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询优化器 / query optimizer/MySQL 查询优化器（Optimizer）/MySQL 慢 SQL 排查思路/热点数据与缓存优化 |
| 102 | 优化3：ID 与主表 inner join | `pagination_opt_join` | 0 | 509字 | 计算机科学/信息系统/数据库管理/数据库/查询系统/查询处理 / query processing/MySQL 分页查询优化/分页优化方案/优化3：ID 与主表 inner join |
| 103 | 索引失效与适用边界 | `idx_fail_root` | **4** | 286字 | 计算机科学/信息系统/数据库管理/数据库/索引/MySQL 索引/索引失效与适用边界 |
| 104 | InnoDB 索引与失效背景 | `idx_fail_bg` | 0 | 347字 | 计算机科学/信息系统/数据库管理/数据库/索引/MySQL 索引/索引失效与适用边界/InnoDB 索引与失效背景 |
| 105 | 树高与 IO 次数 | `bts_height_io` | 0 | 178字 | 计算机科学/信息系统/数据库管理/数据库/索引/B+树索引 / B-tree index/MySQL B+树索引/B+树底层结构/树高与 IO 次数 |
| 106 | 设计与建模 | `k_wiki_en_database_s27` | **4** | 2048字 | 计算机科学/信息系统/数据库管理/数据库/十三、数据库设计/设计与建模 |
| 107 | I/O 线程与 relay log（从库） | `msr_io_thread` | 0 | 196字 | 计算机科学/信息系统/数据库管理/数据库/备份与恢复/备份和恢复/复制 / replication/MySQL Replication/MySQL 主从复制/复制流程（三线程）/I/O 线程与 relay log（从库） |
| 108 | 构建、维护和调整 | `k_wiki_en_database_s23` | 0 | 790字 | 计算机科学/信息系统/数据库管理/数据库/十七、数据库运维/构建、维护和调整 |
| 109 | 数据访问接口与连接生态 / data access interfaces & connector ecosystem | `concept_data_access_interface` | **4** | 364字 | 计算机科学/信息系统/数据库管理/数据库/十八、数据库编程与接口/数据访问接口与连接生态 / data access interfaces & connector ecosystem |
| 110 | 服务管理和公共组件 | `k_1787157552520_1qby52` | **3** | 0字 | 计算机科学/信息系统/数据库管理/数据库/十九、数据库产品/MySQL/MySQL Server/结构/服务层/服务管理和公共组件 |
| 111 | 备份、运维与诊断 | `mysql_topic_backup_operations` | **3** | 76字 | 计算机科学/信息系统/数据库管理/数据库/十九、数据库产品/MySQL/MySQL Server/结构/服务层/服务管理和公共组件/备份与恢复/备份、运维与诊断 |
| 112 | 系统管理和控制⼯具（Management Services & Utilities） | `k_1782032936985_6uwpnx` | 0 | 17字 | 计算机科学/信息系统/数据库管理/数据库/十九、数据库产品/MySQL/MySQL Server/结构/服务层/服务管理和公共组件/备份与恢复/备份、运维与诊断/系统管理和控制⼯具（Management Services & Utilities） |
| 113 | 校验和 / checksum | `mysql_glossary_checksum_qnrmvm` | 0 | 1036字 | 计算机科学/信息系统/数据库管理/数据库/十九、数据库产品/MySQL/MySQL Server/结构/服务层/服务管理和公共组件/备份与恢复/备份、运维与诊断/校验和 / checksum |
| 114 | 查询与语句执行 | `mysql_sql_query_execution` | 0 | 99字 | 计算机科学/信息系统/数据库管理/数据库/十九、数据库产品/MySQL/MySQL Server/结构/服务层/横向/查询与语句执行 |
| 115 | 连接与请求入口 | `mysql:mysqld-layer:connection` | **2** | 63字 | 计算机科学/信息系统/数据库管理/数据库/十九、数据库产品/MySQL/连接与请求入口 |
| 116 | 元数据与选项文件 | `mysql:concept:data-files:metadata:node` | **2** | 54字 | 计算机科学/信息系统/数据库管理/数据库/二十、数据库文件与实现/组成/数据文件/组成/元数据与选项文件 |
| 117 | 组件导出与导入 | `react_export_import` | **3** | 50字 | 计算机科学/信息系统/全球信息网/Web 开发/React/组件导出与导入 |
| 118 | 控制流与函数设计 | `container:governance:javascript:control-flow` | **2** | 154字 | 计算机科学/信息系统/全球信息网/Web 开发/React/控制流与函数设计 |
| 119 | 表达式与类型转换 | `container:governance:javascript:expressions` | **3** | 134字 | 计算机科学/信息系统/全球信息网/Web 开发/React/表达式与类型转换 |
| 120 | 交互与通信 | `k_1784348625706_s595yo` | 0 | 172字 | 计算机科学/并发/并发计算/交互与通信 |
| 121 | 通过测试和设置实现 Mesa 监视器示例 | `k_wiki_en_monitor_synchronization_s11` | 0 | 5602字 | 计算机科学/并发/并发控制/监控（同步）/条件变量/同步原语/通过测试和设置实现 Mesa 监视器示例 |
| 122 | 知识表示与推理 | `k_acm2012_artificial_intelligence_knowledge_representation_reasoning` | 0 | 39字 | 计算机科学/人工智能/知识表示与推理 |
| 123 | 自动化规划与调度 | `k_acm2012_artificial_intelligence_automated_planning_scheduling` | 0 | 40字 | 计算机科学/人工智能/自动化规划与调度 |
| 124 | 复杂度与算法分析 | `k_vault_java01_36x0hj` | 0 | 815字 | 计算机科学/计算理论/算法/算法分析/复杂度与算法分析 |
| 125 | 算法与数据结构 | `n_9hr0nvvv` | 0 | 28字 | 计算机科学/计算理论/算法/算法与数据结构 |
| 126 | 树与堆 | `k_vault_java04_15ur15` | 0 | 710字 | 计算机科学/计算理论/算法/数据结构/树与堆 |
| 127 | 图与搜索 | `k_vault_java05_10s2ki` | 0 | 674字 | 计算机科学/计算理论/算法/数据结构/图与搜索 |
| 128 | 排序与查找 | `k_vault_java06_2caodb` | 0 | 643字 | 计算机科学/计算理论/算法/排序与查找 |
| 129 | 阻塞非阻塞与同步异步 | `k_io_blocking_concepts` | **1** | 575字 | 计算机科学/系统组织/操作系统/阻塞非阻塞与同步异步 |
| 130 | select与epoll | `k_io_select_epoll` | 0 | 1303字 | 计算机科学/系统组织/操作系统/select与epoll |
| 131 | 一致性与 CAP 实践 | `k_vault_java04cap_1frlgp` | 0 | 673字 | 计算机科学/系统组织/分布式系统/一致性与 CAP 实践 |
| 132 | CAP原则与BASE理论 | `k_vault_javacapbase_lqqmnp` | 0 | 7399字 | 计算机科学/系统组织/分布式系统/CAP原则与BASE理论 |
| 133 | 主从延迟与解决方案 | `k_vault_arch_replica_lag` | 0 | 758字 | 计算机科学/系统组织/分布式系统/主从延迟与解决方案 |
| 134 | 分库和分表 | `k_vault_arch_db_table_split` | 0 | 53字 | 计算机科学/系统组织/分布式系统/分库和分表 |
| 135 | 微服务架构与网络调用 | `k_vault_arch_micro_net` | 0 | 27字 | 计算机科学/系统组织/分布式系统/微服务架构与网络调用 |
| 136 | 熔断与隔离 | `k_vault_arch_circuit_breaker` | 0 | 36字 | 计算机科学/系统组织/分布式系统/熔断与隔离 |

---

## Z · 名单外的整簇处置（已核，不在模式定罪内）

| 簇 | 规模 | 处置 |
|---|---|---|
| 「数据库相关出版物」书目簇（wiki References 残留） | 9 条 | 整簇退池，正文转 docs/sources 审计材料；nodeRef 全为 k_wiki_* 残段 |
| Executor框架 下错拼双挂载（第一批遗留） | 2 条 | FutureTask / ScheduleThreadPoolExecutor（错拼）删树条目；「线程池」下同名条目改拼写补 d |
| 数据仓库残缺名（第一批遗留） | 4 条 | 维度) / 事实)(删) / 聚合) / 仪表板) → 去右括号；全树「右括号孤儿」复扫防漏 |
| 数据仓库泛词孩子（变体/元素/方面/填充） | 4 条 | 本轮不动，人工判内容归属后处置 |

---

## D 组机制保护名单（动手前必读）

全库 mechanismSpec 仅 8 个，其中 3 个的 state 节点就是 D 组树节点本身，**删除即断机制视图**：

| spec | 节点 | 已引用的 D 组树节点 |
|---|---|---|
| aop_flow 执行阶段 | 5 state / 4 transition / 1 trigger | AOP ①~⑤ 全部（nodeRef 一一对应）→ **只改名去 ① 序号** |
| tio_flow 传统 IO 执行流程 | 6 state / 5 transition | IO ①~⑥ 全部 → **只改名去 ① 序号** |
| bcs_flow Bean 创建策略机制 | 5 state / 5 transition | 引用的是 getBean 五状态（另一套），树上 Bean 1~5 阶段是重复视角 → 可并入，gate 复扫后处置 |

无 spec 的四组（秒杀高可用 ①~⑥ / 流量激增 1~6 / SQL 军规 1~10 / Bean 生命周期 1~5 若判重复）：按宿主建 mechanismSpec（causality/state-transition 边）或 viewDimensions Grid 方框，正文提取填入后树节点退出。
