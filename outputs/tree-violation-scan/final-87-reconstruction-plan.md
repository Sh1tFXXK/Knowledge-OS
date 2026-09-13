# 最终 87 条重构 · 预检与修正规划（2026-09-13）

> **只读产物**：本文件由 `scripts/plan-final-87-reconstruction.mjs` 生成，未修改任何 `data/*.json`。
> Blueprint 的四条分组动作已逐条对照真实数据核对；`status = 修正` 的条目**不能照字面执行**。
> 预检：**34/48 通过**，14 项未通过。

## 一、Blueprint 偏差审查（5 处硬性不可执行）

### 偏差 1 · `kind: 'problem'` 不是合法值
`kind` 真实取值域（实测全池）：`concept`(144) · `mechanism`(26) · `entity`(457) · `state`(87) · `event`(11) · `rule`(2) · `Concept`(201)。
全仓 `src/` 内 `problem` 引用数 = **0** → 写入的 `kind:'problem'` 不会被任何代码或校验识别，属于装饰字段。
> 附带发现既有缺陷：`concept`(144) 与 `Concept`(201) **大小写不一致**，同一语义两种写法，建议单独立项清理。

### 偏差 2 · `solves` / `prevents` / `causes` 不是受控边类型
`src/core/explanation-index/indexGraphLayout.ts:164` 实测白名单只有三组：
依赖 `uses/depends-on/needs-for` · 关联 `enables/leads-to/compares/relates-to` · 推理 `belongs-to/leads-to/needs-for/needs/depends-on/enables/determines`。
Blueprint 设计的 6 条边全部使用了白名单外的类型 → **图上永远不画**，等于写了没写。

### 偏差 3 · 6 条边的端点不存在
- `性能压测 --solves--> 系统性能瓶颈定位`
- `jstack --solves--> 线上 Java 应用 CPU 飙高与死锁定位`
- `ThreadPoolExecutor --solves--> 线程池资源耗尽与配置调优`
- `限流与降级 --prevents--> 流量激增与服务雪崩`
- `读写分离与分库分表 --solves--> 高并发系统 QPS 瓶颈与扩容`
- `EXPLAIN 执行计划 --solves--> 慢查询 SQL 性能瓶颈`
其中 `性能压测` / `jstack` / `限流与降级` / `读写分离与分库分表` / `EXPLAIN 执行计划` 在树与池中**均搜不到** → 照写会产生悬空边，直接违反验收里的「0 悬空」。

### 偏差 4 · 14 处「去后缀归本体」的目标名已被占用
直接改名会产生 **14 个同名节点**（项目正在清的重名债）。详见第三节预检明细。

### 偏差 5 · `supplement` 在树条目上，不在节点池
实测：池节点带 `supplement` = **0 例**；树条目带 `supplement` = 87 例，结构 `{ tabs: [{ id, label, content, tags? }] }`。
Blueprint 写「镜像正文至宿主节点 supplement」→ 实际必须写到**树条目**，否则正文落不到渲染面。

---

## 二、预检明细

> 口径说明：**「卸树」≠「删节点」**。Blueprint 第二组要求 11 个机制状态在池中完整保留以供 `mechanismSpec` 渲染，只摘掉目录条目。
> 因此预检校验的是「池节点仍在、且仍在 spec 引用集内」，不是「不得出现在 spec 里」。

| # | 检查项 | 结果 | 说明 |
|---:|---|---|---|
| 1 | 簇 bean_lc_* 节点存在（5 个） | 通过 | 未找到任何匹配 nodeRef |
| 2 | 族宿主存在 asplit_s1_asplit_bean_lifecycle「Bean 生命周期」（nodeRef=asplit_bean_lifecycle） | 通过 | 宿主节点不存在，需先定载体 |
| 3 | 簇 surge_* 节点存在（8 个） | 通过 | 未找到任何匹配 nodeRef |
| 4 | 簇 hps_* 节点存在（7 个） | 通过 | 未找到任何匹配 nodeRef |
| 5 | 簇 sqopt_idea_* 节点存在（10 个） | 通过 | 未找到任何匹配 nodeRef |
| 6 | 章节壳改名无同名冲突：一、数据库系统 → 数据库系统 | 通过 |  |
| 7 | 章节壳改名无同名冲突：二、数据模型 → 数据模型 | 通过 |  |
| 8 | 章节壳改名无同名冲突：三、数据库结构 → 数据库结构 | 通过 |  |
| 9 | 章节壳改名无同名冲突：五、数据库操作 → 数据库操作 | 通过 |  |
| 10 | 章节壳改名无同名冲突：八、恢复系统 → 恢复系统 | 通过 |  |
| 11 | 章节壳改名无同名冲突：九、日志系统 → 日志系统 | 通过 |  |
| 12 | 章节壳改名无同名冲突：十、存储系统 → 存储系统 | **未通过** | 已存在同名 1 处：theory_domain_storage_systems @ 知识宇宙/计算机科学/系统组织/存储系统 |
| 13 | 章节壳改名无同名冲突：十二、数据表示 → 数据表示 | 通过 |  |
| 14 | 章节壳改名无同名冲突：十三、数据库设计 → 数据库设计 | **未通过** | 已存在同名 2 处：tree_wiki_en_outline_of_databases_s4_s7 @ 知识宇宙/计算机科学/信息系统/数据库管理/数据库/一、数据库系统/数据库使用/数据库设计 | asplit_s106_db_design @ 知识宇宙/计算机科学/信息系统/数据库管理/数据库/十三、数据库设计/数据库设计 |
| 15 | 章节壳改名无同名冲突：十四、数据库分布与复制 → 数据库分布与复制 | 通过 |  |
| 16 | 章节壳改名无同名冲突：十六、数据库安全 → 数据库安全 | **未通过** | 已存在同名 2 处：tree_wiki_en_outline_of_databases_s4_s6 @ 知识宇宙/计算机科学/信息系统/数据库管理/数据库/一、数据库系统/数据库使用/数据库安全 | tree_wiki_en_database_s20 @ 知识宇宙/计算机科学/信息系统/数据库管理/数据库/十六、数据库安全/数据库安全 |
| 17 | 章节壳改名无同名冲突：十七、数据库运维 → 数据库运维 | 通过 |  |
| 18 | 章节壳改名无同名冲突：十八、数据库编程与接口 → 数据库编程与接口 | 通过 |  |
| 19 | 章节壳改名无同名冲突：十九、数据库产品 → 数据库产品 | 通过 |  |
| 20 | 章节壳改名无同名冲突：二十、数据库文件与实现 → 数据库文件与实现 | 通过 |  |
| 21 | 详解壳去后缀无同名冲突：ArrayList 详解 → ArrayList | **未通过** | 已存在同名 1 处：tree_demo_java_array_list |
| 22 | 详解壳去后缀无同名冲突：HashMap 详解 → HashMap | **未通过** | 已存在同名 1 处：tree_1785463930183_6xqdzx |
| 23 | 详解壳去后缀无同名冲突：HashSet 详解 → HashSet | **未通过** | 已存在同名 1 处：tree_1785684483891_xdr40d |
| 24 | 详解壳去后缀无同名冲突：LinkedList 详解 → LinkedList | **未通过** | 已存在同名 1 处：tree_1785683698292_nhrf3z |
| 25 | 详解壳去后缀无同名冲突：ThreadPoolExecutor详解 → ThreadPoolExecutor | **未通过** | 已存在同名 2 处：tree_java_source_1a247659a8087e94_s_type_ff6db88dc6746818 | tree_1785416767656_xllpk1 |
| 26 | 详解壳去后缀无同名冲突：ScheduledThreadPoolExecutor详解 → ScheduledThreadPoolExecutor | **未通过** | 已存在同名 1 处：tree_java_source_1a247659a8087e94_s_type_af32be37bc61aea4 |
| 27 | 详解壳去后缀无同名冲突：FutureTask详解 → FutureTask | **未通过** | 已存在同名 2 处：tree_1785918560147_r0lv4e | tree_java_source_1a247659a8087e94_s_type_3f228f7655fb94df |
| 28 | 详解壳去后缀无同名冲突：CachedThreadPool详解 → CachedThreadPool | 通过 |  |
| 29 | 详解壳去后缀无同名冲突：FixedThreadPool详解 → FixedThreadPool | 通过 |  |
| 30 | 详解壳去后缀无同名冲突：SingleThreadExecutor详解 → SingleThreadExecutor | 通过 |  |
| 31 | 详解壳去后缀无同名冲突：线程池详解 → 线程池原理 | 通过 |  |
| 32 | 详解壳去后缀无同名冲突：Java 集合框架总览 → Java 集合框架 | 通过 |  |
| 33 | 详解壳去后缀无同名冲突：Java 多线程编程入门 → Java 多线程编程 | 通过 |  |
| 34 | 详解壳去后缀无同名冲突：Kafka 定位总览 → Kafka | **未通过** | 已存在同名 1 处：tree_java_fw_kafka |
| 35 | 详解壳去后缀无同名冲突：MyBatis 定位总览 → MyBatis | 通过 |  |
| 36 | 详解壳去后缀无同名冲突：Spring Cloud 定位总览 → Spring Cloud | **未通过** | 已存在同名 1 处：tree_java_fw_springcloud |
| 37 | 详解壳去后缀无同名冲突：Java 数据结构基础 → Java 数据结构 | 通过 |  |
| 38 | 详解壳去后缀无同名冲突：JVM 基础 → JVM 理论基础 | 通过 |  |
| 39 | 大壳正名无同名冲突：基础 → Java 基础语法 | 通过 |  |
| 40 | 大壳正名无同名冲突：软件开发（实践总览） → 软件工程与开发实践 | 通过 |  |
| 41 | 大壳正名无同名冲突：跨系统标准与约定（总览） → 跨系统标准与约定 | 通过 |  |
| 42 | 卸树条目的池节点全部存在（卸树不等于退池） | 通过 |  |
| 43 | 受 spec 保护的卸树条目已识别（11 条），落盘时禁止对其退池 | 通过 | 期望 11 条 spec state 被卸树，实际识别 11 条 — 需复核 |
| 44 | bean_lc_* 尚未被任何 spec 持有（5 条待新建契约） | 通过 | 期望 5 条待补机制契约，实际 5 条 |
| 45 | Blueprint 设计的边类型全部受控（6 条） | **未通过** | 性能压测--solves-->系统性能瓶颈定位 · jstack--solves-->线上 Java 应用 CPU 飙高与死锁定位 · ThreadPoolExecutor--solves-->线程池资源耗尽与配置调优 · 限流与降级--prevents-->流量激增与服务雪崩 · 读写分离与分库分表--solves-->高并发系统 QPS 瓶颈与扩容 · EXPLAIN 执行计划--solves-->慢查询 SQL 性能瓶颈 —— 均不在 src 白名单，图上不会渲染 |
| 46 | Blueprint 设计的边源端点须用既有节点 | **未通过** | 性能压测(缺) --→ 系统性能瓶颈定位 · jstack(缺) --→ 线上 Java 应用 CPU 飙高与死锁定位 · 限流与降级(缺) --→ 流量激增与服务雪崩 · 读写分离与分库分表(缺) --→ 高并发系统 QPS 瓶颈与扩容 · EXPLAIN 执行计划(缺) --→ 慢查询 SQL 性能瓶颈 —— 这 5 个源端点既不存在也不在计划产物中 |
| 47 | Blueprint 设计的边目标端点存在或在计划产物中 | 通过 |  |
| 48 | 缺失源端点均有可替代的既有节点（列出 5 条） | 通过 | 性能压测 → 2. 全链路压测（surge_stress，本批会被合并，需先定归属） · jstack → 无同类既有节点：建议改为「线上问题定位」自身作为问题节点，不建边 · 限流与降级 → 服务降级（tree_1786158049869_dhpjhh） · 读写分离与分库分表 → MySQL 分库分表（tree_sharding_overview）或 读写分离优化（tree_diag_rw_split） · EXPLAIN 执行计划 → SQL 执行计划（EXPLAIN）（tree_k_sql_explain） |

---

## 三、逐条修正后的动作表

### 第一组 · E 类（7 条）

| 树节点 | nodeRef | 动作 | 备注 |
|---|---|---|---|
| JSR-133为什么要增强final的语义 | `k_1785923886439_k5so6c` | 正文并入 final 的 supplement → 卸树 | ok |
| MQ 为什么存在 | `k_vault_javarabbitmq01mq_j62j4c` | 正文并入 RabbitMQ 的 supplement → 卸树 | 修正：Blueprint 写的「消息队列 (MQ)」池树皆无此节点 |
| 如何发现瓶颈 | `sk_perf_bottleneck` | 改名「系统性能瓶颈定位」保留在树 | 修正：kind:"problem" 非合法值（详见偏差 1）；Blueprint 设计的 性能压测--solves--> 端点缺失 |
| 如何判断对象可以被回收 | `k_1783264901088_1s02ir` | 2 孩提级至 垃圾回收 → 卸树（正文 0 字） | ok |
| 什么时候需要分库分表 | `sharding_when` | 正文并入 MySQL 分库分表 的 supplement → 卸树 | 修正：Blueprint 写的「分库分表」节点不存在 |
| 为什么命中索引比不命中快 | `idxf_overview` | 1 孩提级至 MySQL 索引 + 正文并入其 supplement → 卸树 | ok |
| 数据库是什么类型的东西？ | `k_wiki_en_outline_of_databases_s1` | 3 孩提级至 数据库系统 + 正文并入 → 卸树 | 依赖：目标名「数据库系统」须由 C 组先改名产出（Blueprint 假设其已存在） |

### 第二组 · D 类机制契约（13 条）

| 树节点 | nodeRef | 动作 | 备注 |
|---|---|---|---|
| ① 代理对象已创建 | `aop_state_proxy_created` | 正文镜像至 执行阶段 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护，严禁删池节点） |
| ② 调用已被拦截 | `aop_state_intercepted` | 正文镜像至 执行阶段 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护，严禁删池节点） |
| ③ 拦截器链执行中 | `aop_state_chain_running` | 正文镜像至 执行阶段 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护，严禁删池节点） |
| ④ 织入代码已执行 | `aop_state_advice_done` | 正文镜像至 执行阶段 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护，严禁删池节点） |
| ⑤ 目标方法已调用（返回） | `aop_state_target_invoked` | 正文镜像至 执行阶段 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护，严禁删池节点） |
| ① read 发起（用户态→内核态） | `tio_state_read_syscall` | 正文镜像至 传统 IO 执行流程 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护） |
| ② DMA：磁盘 → 内核缓冲区 | `tio_state_disk_to_kernel` | 正文镜像至 传统 IO 执行流程 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护） |
| ③ CPU：内核缓冲区 → 用户缓冲区（返回） | `tio_state_kernel_to_user` | 正文镜像至 传统 IO 执行流程 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护） |
| ④ write 发起（用户态→内核态） | `tio_state_write_syscall` | 正文镜像至 传统 IO 执行流程 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护） |
| ⑤ CPU：用户缓冲区 → socket 缓冲区 | `tio_state_user_to_socket` | 正文镜像至 传统 IO 执行流程 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护） |
| ⑥ DMA：socket 缓冲区 → 网卡（返回） | `tio_state_socket_to_nic` | 正文镜像至 传统 IO 执行流程 树条目 supplement → 卸树（节点留池） | ok（受 spec 保护） |
| 执行阶段 | `aop_flow` | 改名「AOP 执行流程」（spec 宿主保留树挂载） | ok（名字无冲突） |
| 调用方（getBean 请求） | `bcs_caller` | 改名「getBean 请求调用方」 | ok（名字无冲突） |

### 第三组 · D 类工程排障（30 条）

| 树节点 | nodeRef | 动作 | 备注 |
|---|---|---|---|
| 合理地配置线程池 | `k_1786092342085_3zwh4c` | 改名「线程池资源耗尽与配置调优」 | 修正：solves 非受控边类型；建议改用 enables |
| 线上问题定位 | `k_1786096587014_vzab8u` | 改名「线上 Java 应用 CPU 飙高与死锁定位」 | 修正：Blueprint 的 jstack 端点不存在 |
| 创建数据仓库 | `k_wiki_en_outline_of_databases_s21` | 32 孩提级至 数据仓库 → 卸树 | ok（子树大规模提级，须先做 before/after 比对） |

按簇的 27 条：

| 簇 | 条数 | 目标载体 | 动作 | 备注 |
|---|---:|---|---|---|
| `bean_lc_*` | 5 | `asplit_s1_asplit_bean_lifecycle` 「Bean 生命周期」 | 新建 mechanismSpec 契约 + 正文并入宿主 supplement + 5 树节点卸载 | ok（宿主节点存在） |
| `surge_*` | 8 | 流量激增与服务雪崩（待新建） | 6 步合并进新建工程问题节点 + 建 viewDimensions，卸载 6 树节点 | 修正：kind:"problem" 非法；prevents 边类型非法 |
| `hps_*` | 7 | 高并发系统 QPS 瓶颈与扩容（待新建） | 6 步合并进新建工程问题节点，卸载 6 树节点 | 修正：solves 非法；读写分离与分库分表 端点缺失 |
| `sqopt_idea_*` | 10 | 慢查询 SQL 性能瓶颈（待新建） | 10 条合并进新建工程问题节点，卸载 10 树节点 | 修正：EXPLAIN 执行计划 端点缺失，可用「SQL 执行计划（EXPLAIN）」 |

### 第四组 · C 类（37 条）

章节壳去序号 15 条、详解/总览/基础去后缀 18 条、大壳正名 4 条。冲突项见第二节预检。

---

## 四、需要裁决的分叉（预检未通过项的处理）

1. **`kind: 'problem'` 怎么办** —— ①不写 kind，靠 tag/role 表达；②正式给 `kind` 域加 `problem`（需改 `src` 校验与渲染，属代码变更）；③改用既有值（`entity` / `conclusion`）。
2. **9 处详解壳同名冲突怎么办** —— ①融合（正文迁入既有正身、壳退池标 archived-redirect，避免重名）；②照 Blueprint 改名，接受 14 个同名节点。
3. **6 条边的类型与端点怎么办** —— ①映射到受控类型（`solves→enables`、`causes→leads-to`、`prevents` 无对应值）并把端点换成真实节点；②放弃建边。
4. **3 处章节壳自身重名怎么办** —— `十三、数据库设计`→`数据库设计`（与其子 `asplit_s106_db_design` 同名）、`十六、数据库安全`→`数据库安全`（与其子 `tree_wiki_en_database_s20` 同名）、`十、存储系统`→`存储系统`（与另一分支 `theory_domain_storage_systems` 同名）。

---

## 五、只读声明

- 直接读取 `data/node-pool.json` / `data/tree-data.json` / `data/knowledge-edges.json` 生成，**未写入任何 `data/*.json`**。
- 边类型白名单来自 `src/knowledge/extractSubgraph.ts:22` 与 `src/core/explanation-index/indexGraphLayout.ts:164-165`。
- 生成时刻：2026-09-13T16:52:42.040Z
