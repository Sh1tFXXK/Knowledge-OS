# 终极工单：A 组 136 条「与/和/及」捆绑节点全量拆解（2026-09-13）

> 前情：用户已裁定**彻底纠偏——不保留幻想，全部拆解**。本工单按五个标准化动作落地，每条带实测执行参数。
> 基线（动手前核对）：树 **3267** · 池 **3825** · test 34/34 · 机制 spec 全库 8 个。
> 宪法依据：原则二 §2.5（树只长名词）、原则三（拆分与关系边）、原则四 §4.4（差异写 supplement）。
> **实测修正已并入**（相对用户原案的差异以 ⚠️ 标注，执行以本工单为准）。

---

## 0. 执行前置与通用纪律

1. 杀 dev server；备份 `data/{node-pool,tree-data,knowledge-edges,questions}.json` → `data/backups/a-split-2026-09-13/`。
2. 原子写（`scripts/shell-fusion/lib.mjs`）；每完成一节跑 `npm test`。
3. **机制保护名单（全批最大坑，先贴墙上）**：
   - `aop_flow` spec 的 trigger = `aop_getbean`（「getBean 与切面匹配」节点）——**该节点被 spec 活引用，不退池不卸载**，处置见二类 #61。
   - `aop_flow` / `tio_flow` 的 state = 树上 ①~⑤ / ①~⑥ 节点本身（D 组，不在本工单）。
   - 拆分产生的**新边 relationKind 必须受控枚举**（structure/classification/dependency/causality/state-transition/constraint/evidence/reference）——用户原案的 `contrasts-with`/`replaces`/`decorates` 等**不在枚举里，机制图读 relationKind 读不到**。映射表：
     | 用户语义 | 落地 relationKind | type 自由文本 |
     |---|---|---|
     | contrasts-with / 对比 | `comparison 类语义` | type: "对比" ⚠️ 枚举无 comparison → 用 `reference` + type "对比" |
     | replaces / evolves-from | `dependency` | type: "替代" |
     | implements / ensures / uses / handles / manages | `dependency` 或 `structure` | type: 按语义 |
     | is-a / instance-of | `classification` | type: "instance-of" |
     | parallel-concepts（并列概念） | `reference` | type: "并列" |
   每条边同时写 `type`（人读）与 `relationKind`（机读），两层都要。
4. **拆分正身优先级**：池内已有正身 → 直接复用挂载；无正身 → 由原节点正文按主题拆段成两卡（原 nodeRef 改造为一方，新建另一方）；**严禁 D4 式「空壳改名当正身」**。
5. 每条卸载后跑 `scripts/shell-fusion/gate.mjs` 六处复扫，命中即停。

---

## 一、拆分为「双正身名词 + 显式关系边」（56 条）

> 通用序列：A) 定位/新建两个正身 → B) 原正文按主题拆段归位（无主题倾向的段落进 supplement「概述」）→ C) 建边（按 §0.3 映射表写 relationKind+type）→ D) 卸树条目 → E) 退原 nodeRef（若原节点正文已全部迁移）。
> 下列条目已核池内正身存量（✓=已存在可直接用；✗=需从原正文拆出新建）：

| # | 树节点 | nodeRef | 拆分正身 L / R | 正身存量 | 边（type / relationKind） |
|---|---|---|---|---|---|
| 1 | 抽象与具体 | `k_1785946513462_*`（按 treeId 定） | 抽象类 / 具体类 | 按 `类型理论` 子树存量核 | 具体类 instance-of 抽象类 / classification |
| 2 | 局部类与内部类 | treeId 现查 | 局部类 / 内部类 | ✗/✓（内部类在 Java类/声明 下） | 局部类 belongs-to 内部类 / structure |
| 6 | volatile和synchronized关键字 | 现查 | volatile / synchronized | ✓ 双方池内均有 | 对比 / reference |
| 8 | 过期的suspend()、resume()和stop() | 现查 | suspend/resume 方法组 / stop 方法 | ✗ | stop 替代 suspend / dependency |
| 9 | 锁和同步块 | 现查 | 互斥锁 / 同步代码块 | ✓ | 同步代码块 uses 互斥锁 / dependency |
| 10 | 数据竞争与顺序一致性 | 现查 | 数据竞争 / 顺序一致性 | ✓（JMM 子树） | 数据竞争 violates 顺序一致性 / dependency+type"违反" |
| 11 | 双重检查锁定与延迟初始化 | 现查 | 双重检查锁定 / 延迟初始化 | ✓ | 双检 implements 延迟初始化 / dependency |
| 15 | 生产者和消费者模式 | 现查 | 生产者消费者模式（单节点，整组是一个模式名） | ⚠️ 用户拆成生产者/消费者两名词——**修正：这是一个模式，不拆**，改名单处理（见四类补 #15b） |
| 16 | 线程池与生产消费者模式 | 现查 | 线程池 / 生产者消费者模式 | ✓ | 线程池 implements 生产者消费者模式 / dependency |
| 17 | 线程基础与生命周期 | `k_vault_java01_1hsx4k` | 线程 / 线程生命周期 | ✓（线程的状态 spec 节点同域） | 线程 has-property 生命周期 / reference |
| 18 | 线程安全与锁 | `k_vault_java02_hjsqh3` | 线程安全 / 互斥锁 | ✓ | 互斥锁 ensures 线程安全 / dependency |
| 20 | 并发容器与调度 | `k_vault_java05_1l9ptm` | 并发容器 / 任务调度 | ✓ | 任务调度 uses 并发容器 / dependency |
| 30 | 元空间与永久代 | 现查 | 元空间 / 永久代 | ✓ 双方池内有 | 元空间 replaces 永久代 / dependency+type"替代" |
| 34 | volatile与有序性 | 现查 | volatile / 指令重排序 | ✓ | volatile prevents 重排序 / dependency+type"禁止" |
| 35 | volatile与原子性 | 现查 | volatile / 原子操作 | ✓ | 对比（volatile 不保证原子性）/ reference+type"对比" |
| 36 | 装箱和拆箱 | `k_1784039625817_rqf584` | 装箱 `k_1783186382386_06a7l7` / 拆箱 `k_1783191024388_6wm19u` | ✓✓ 已核 | 对比 / reference+type"互逆" |
| 37 | 方法引用类型与等效 Lambda | 现查 | 方法引用 / Lambda 表达式 | ✓ | 等价 / reference+type"等价" |
| 38 | 泛型方法和构造函数 | 现查 | 泛型方法 / 泛型构造函数 | ✗✗ 从正文拆 | 并列 / reference |
| 39 | Java 对象和类 | 现查 | Java 类 / Java 对象 | ✓ | 对象 instance-of 类 / classification |
| 41 | 文件流与缓冲流 | 现查 | FileInputStream / BufferedInputStream | ✗✗（池内无 JDK io 类节点）⚠️ 从正文拆建 | BufferedInputStream decorates FileInputStream / dependency+type"装饰" |
| 42 | 数据流与对象流 | 现查 | DataInputStream / ObjectInputStream | ✗✗ | 并列 / reference |
| 43 | 文件流与缓冲流（字符） | 现查 | FileReader / BufferedReader | ✗✗ | BufferedReader decorates FileReader / dependency+type"装饰" |
| 44 | java.io 文件与控制台 | 现查 | File 类 / 控制台 I/O | ✗✗ | 并列 / reference |
| 45 | java.nio 通道与缓冲区 | 现查 | Channel / Buffer | ✗✗ | Channel uses Buffer / dependency |
| 46 | Path与FileSystem | 现查 | Path / FileSystem | ✗✗ | FileSystem creates Path / dependency+type"创建" |
| 47 | IO 与 NIO | 现查 | BIO / NIO | ✗（拆「阻塞/非阻塞」概念即可，不必造 BIO 缩写节点）⚠️ | NIO replaces BIO / dependency+type"替代" |
| 49 | 词法与语法 | 现查 | 词法分析 / 语法分析 | ✓（编译原理子树） | 词法分析 leads-to 语法分析 / dependency+type"先后" |
| 51 | 变量与常量 | `k_1787766295230_qi9z13` | 变量 `k_1783249680752_eglr74` / 常量 `k_1782814122467_l5rgvz` | ✓✓ 已核 | 对比 / reference |
| 52 | 逃逸分析和锁粗化 | 现查 | 逃逸分析 / 锁粗化 | ✓ | 逃逸分析 enables 锁粗化 / dependency+type"使能" |
| 55 | 单遍编译器与多遍编译器 | 现查 | 单遍编译器 / 多遍编译器 | ✗ | 对比 / reference |
| 58 | HTTP 请求与 Servlet 模型 | 现查 | HTTP 请求 / Servlet | ✓ | Servlet handles HTTP 请求 / dependency |
| 59 | Servlet 生命周期与容器协作 | 现查 | Servlet 生命周期 / Servlet 容器 | ✓ | 容器 manages 生命周期 / dependency+type"管理" |
| 60 | JSP 与视图渲染 | `k_vault_javajavaweb05jsp_qu145w` | JSP `k_vault_javajavawebjsp_elp41h` / 视图渲染 | ✓/✗ | JSP implements 视图渲染 / dependency |
| 62 | ProxyFactory 与代理策略 | 现查 | ProxyFactory / 动态代理 | ✓ | ProxyFactory creates 动态代理 / dependency |
| 65 | 依赖注入与 Bean 生命周期 | `k_vault_javaspring02bean_eazz3` | 依赖注入 / Bean 生命周期 | ✓ | 依赖注入 part-of Bean 生命周期 / structure |
| 68 | Mapper 与动态 SQL | 现查 | MyBatis Mapper / 动态 SQL | ✓ | Mapper uses 动态 SQL / dependency |
| 71 | Netty 的 Reactor 与线程模型 | `k_vault_javanetty02reactor_1nzb1c` | Reactor 模式 `k_reactor_overview`（已改名）/ Netty 线程模型 | ✓/✗⚠️ 该节点正文好，保留为 supplement 来源 | Netty 线程模型 implements Reactor / dependency |
| 72 | Netty 的 Channel 与 Pipeline | 现查 | Channel / ChannelPipeline | ✗ | Channel contains ChannelPipeline / structure |
| 77 | 交换机路由与工作模式 | 现查 | RabbitMQ 交换机 / 路由键 | ✓ | 交换机 uses 路由键 / dependency |
| 81 | 注册发现与负载均衡 | 现查 | 服务注册与发现 / 负载均衡 | ✓ | 注册发现 enables 负载均衡 / dependency+type"使能" |
| 82 | 服务调用与容错 | 现查 | 服务调用 / 服务容错 | ✓ | 容错 guarantees 服务调用 / dependency |
| 83 | 配置中心与消息总线 | 现查 | 配置中心 / 消息总线 | ✓ | 配置中心 uses 消息总线 / dependency |
| 84 | 网关与治理组件 | 现查 | API 网关 / 服务治理 | ✓ | 网关 implements 服务治理 / dependency |
| 87 | 2000 年代，NoSQL 和 NewSQL | 现查（树挂载在 wiki 时间线段下） | NoSQL `n_21yoee5g` / NewSQL | ✓/✗ | NewSQL evolves-from NoSQL / dependency+type"演进" |
| 93 | ZSET 命令：ZRANK 与 ZRANGE | 现查 | ZRANK / ZRANGE | ✗（Redis 命令词条） | 并列 / reference |
| 94 | 发布与订阅 | `k_1786241151946_frfy1k` | 发布者 / 订阅者 | ✗✗⚠️ 修正：**这是「发布订阅模式」一个概念**，不拆成两个参与者名词——树名改「发布订阅模式 / pub-sub」即可 | — |
| 95 | 热点数据和冷数据 | 现查 | 热点数据 / 冷数据 | ✗ | 对比 / reference |
| 117 | 组件导出与导入 | 现查 | 模块导出 / 模块导入 | ✗ | 导入 references 导出 / reference |
| 118 | 控制流与函数设计 | 现查 | 控制流 / 函数设计 | ✗ | 并列 / reference |
| 119 | 表达式与类型转换 | 现查 | 表达式 / 类型转换 | ✓ | 表达式 triggers 类型转换 / dependency |
| 126 | 树与堆 | `k_vault_java04_15ur15` | 树 `k_1782839325259_0qtru5` / 堆 `k_1782798814309_j3jj7c` | ✓✓ 已核 | 堆 is-a 树 / classification |
| 127 | 图与搜索 | 现查 | 图 / 图搜索算法 | ✓ | 搜索算法 operates-on 图 / dependency |
| 128 | 排序与查找 | `k_vault_java06_2caodb` | 排序 `k_dict_egdhzij9` / 查找 | ✓/✗ | 并列 / reference |
| 129 | 阻塞非阻塞与同步异步 | 现查 | 阻塞非阻塞 I/O / 同步异步 I/O | ✗⚠️ 修正：这是两对维度不是四个名词，建 2 节点+对比边 | 对比 / reference |
| 130 | select与epoll | `k_io_select_epoll` | select / epoll | ✗✓（select 有 dict 节点；epoll 无） | epoll replaces select / dependency+type"替代" |
| 136 | 熔断与隔离 | `k_vault_arch_circuit_breaker` | 服务熔断 `k_1786158127369_fuypc2` / 服务隔离 | ✓/✗ | 并列 / reference |

## 二、抽取正文沉淀至 mechanismSpec / viewDimensions（28 条）

> ⚠️ 三条实测修正：**#61「getBean 与切面匹配」= `aop_getbean` 是 `aop_flow` spec 的活引用 trigger，严禁退池**——处置改为：正文保留原节点、树名去「与切面匹配」改「getBean 请求」（spec 引用零风险）；**#64「创建和管理 beans」宿主不是 IoC 容器而是既有 `bcs_flow`「Bean 创建策略机制」**（spec 已有 5 state），正文并入其宿主后原节点按门禁退；**#107「I/O 线程与 relay log」树上未找到独立条目**（用户名单与实树差异），执行时按名字模糊定位，找不到则跳过并在提交信息注明。

| # | 树节点 | nodeRef | 正文 | 宿主 | 载体 | 备注 |
|---|---|---:|---:|---|---|---|
| 7 | 启动和终止线程 | `k_1785946330787_qxi6nd` | 0 字 | Thread / 线程的状态 `k_1785934396536_as412a` | ⚠️ 正文 0 字，无可迁移；树条目并入「线程的状态」下即可 | spec 已存在勿重复建 |
| 14 | 初始化segmentShift和segmentMask | 现查 | ~小 | ConcurrentHashMap | supplement「初始化段」 | |
| 21 | 批量重偏向和撤销 | `k_web_78137b704e08_s1` | 1118 字 | 偏向锁 | mechanismSpec 撤销/重偏向流转（需建 state/transition 边） | |
| 22 | 获取偏向锁和释放锁 | `k_web_78137b704e08_s3` | 451 字 | 偏向锁 | 同上（与 #21 合并为一个 spec） | |
| 23 | 锁的释放和获取的内存语义 | 现查 | 核 | 锁 | supplement「内存语义」 | |
| 26 | 写锁的获取与释放 | `k_1786027326976_qawj4t` | 856 字 | ReentrantReadWriteLock | mechanismSpec 写锁流程 | |
| 27 | 读锁的获取与释放 | `k_1786027471125_64ip4n` | 775 字 | 同上 | 同一 spec 内读/写两态轨 | #26/#27 合并处理 |
| 31 | 对象创建与内存分配 | 现查 | 核 | JVM 内存管理 | mechanismSpec | |
| 32 | 垃圾回收与收集器 | 现查 | 核 | 垃圾回收 (GC) | viewDimensions 收集器网格 | |
| 61 | getBean 与切面匹配 | `aop_getbean` | 438 字 | ⚠️ 自身即 aop_flow 的 trigger | **只改名「getBean 请求」+ 正文不动 + 不退池** | spec 活引用保护 |
| 63 | IoC 理解与初始化 | 现查 | 核 | IoC 容器 | supplement「初始化」 | |
| 64 | 创建和管理 beans | `k_1784440382626_trbqgz` | 313 字 | ⚠️ bcs_flow「Bean 创建策略机制」（不是泛 IoC 容器） | 正文并入宿主卡；原节点门禁后退 | |
| 67 | SqlSession 与生命周期 | `k_vault_javamybatis02sqlsession_5c5wcf` | 1823 字 | SqlSession | mechanismSpec 生命周期 | 正文大，先并 spec 状态描述 |
| 69 | MyBatis 执行机制与插件 | 现查 | 核 | MyBatis | viewDimensions 插件网格 | |
| 96 | RDB文件的创建与载入 | `k_1786246332541_3yq6h7` | 295 字 | Redis RDB 持久化 | mechanismSpec bgsave 流程 | |
| 99 | 连接与线程状态 | 现查 | 核 | MySQL 客户端连接 | mechanismSpec | |
| 107 | I/O 线程与 relay log（从库） | ⚠️ 树上未独立挂载 | 0 | MySQL 主从复制 `msr_flow` 已有「复制流程（三线程）」spec | ⚠️ 已有 spec！查漏挂载位置后决定：若为 msr_flow 子节点改名归位，跳过重建 | 执行时模糊定位 |
| 112 | 系统管理和控制⼯具 | 现查 | 核 | MySQL 服务层 | viewDimensions 工具网格 | |
| 114 | 查询与语句执行 | `mysql_sql_query_execution` | 99 字 | ⚠️ `qproc_flow`「内部执行流程（六步）」spec 已存在 | 正文并入宿主；**勿重建 spec**；原节点门禁后退 | spec 已存在 |
| 121 | Mesa 监视器示例 | 现查 | 核 | Mesa 监视器 | Pages 代码示例 | |

（用户原表 28 条，实核 20 条有挂载；差 8 条为 #14/#23/#31/#32/#63/#69/#99/#112 的「现查」项——执行时逐条 treeId 定位，参数同上表格式补全后照做。）

## 三、转移至问题库 + answerSteps（21 条）

> 通用：questions.json 追加 `{ id:"q_asplit_<序号>", text:<用户已拟的问题文本>, answered:true, answer:<原正文>, relatedNodeId:<绑定正身>, kind:"comparison"/"concept", answerSteps:[{nodeId:<实体1>,note:""},{nodeId:<实体2>,note:""}] }`；原树条目卸载退池。
> ⚠️ 修正一条：**#5「面向对象与数据库」** 实测正文是 ORM 映射知识（若正文为映射机制叙述），relatedNodeId 绑 `ORM` 而非泛「面向对象」；执行时读正文定。
> ⚠️ 修正二条：**#53「与其他语言的比较」9 孩**、**#50「语言评估与争议」** 挂在「动态程序分析/Java性能」wiki 树下——孩子先上提到 Java 节点，正文再转问题卡。
> 其余 19 条按用户表执行（问题文本、绑定实体照抄用户表，文本已拟好质量高）。

## 四、去壳归位与提级（25 条）

> ⚠️ 实测修正（用户表的子树数是执行第一批前的旧数，现值如下）：「Java并发容器和框架」实际 **4 孩**（非 23）；「数据约束与标识」**8 孩**（非 22）；「服务管理和公共组件」**3 孩**；「数据访问接口与连接生态」**4 孩**（非 24）。提级工作量远小于预估。

| # | 树节点 | 实测孩 | 去向 | 动作 |
|---|---|---:|---|---|
| 3 | 动态配置与消息传递机制 | 0 | 面向对象 | 正文并入后卸 |
| 12 | Java并发容器和框架 | **4** | java并发编程 | 壳删，4 孩提级 |
| 13 | ConcurrentHashMap的实现原理与使用 | **9** | ConcurrentHashMap 正身 `k_java_type_48031e8c20570051` | ⚠️ 9 孩先提级到 ConcurrentHashMap 下（勿删孩子），壳正文转 supplement「实现原理」 |
| 19 | AQS 与 JUC 工具 | 0 | 拆 AQS / JUC 工具 | 一类式拆分 |
| 29 | Java JVM和字节码 | 0 | JVM / 字节码 ✓ 双正身已有 | 拆+边 |
| 48 | IO 流的分类与框架体系 | 0 | java.io | viewDimensions 分类网格 |
| 66 | MyBatis 核心定位与组成 | 0 | MyBatis | 正文并入 |
| 70 | Netty 定位与通信抽象 | 0 | Netty `k_java_fw_netty` | 正文并入（supplement 已有 basics tab，追加勿覆盖） |
| 73 | Netty 异步能力与高性能设计 | 0 | 同上 | 追加 supplement「高性能设计」 |
| 74 | Netty 与 RPC 实践 | 0 | 同上 | 追加 supplement「RPC 实践」 |
| 75 | Kafka 定位与消息模型 | 0 | Kafka | 正文并入 |
| 78 | RabbitMQ 可靠性、顺序与幂等 | 0 | RabbitMQ `k_java_fw_rabbitmq` | 追加 supplement「可靠性」 |
| 97 | 数据约束与标识 | **8** | 数据库 | 壳删 8 孩提级（孩子全是「X键/约束」干净名词） |
| 104 | InnoDB 索引与失效背景 | 0 | InnoDB 索引 | 正文并入 |
| 105 | 树高与 IO 次数 | 0 | B+树 | 正文并入 |
| 106 | 设计与建模 | **5** | 数据库设计 / 数据库建模 | 拆双+孩提级 |
| 108 | 构建、维护和调整 | 0 | 数据库运维 | 正文并入 |
| 109 | 数据访问接口与连接生态 | **4** | 数据库编程与接口 | 壳删 4 孩提级 |
| 110 | 服务管理和公共组件 | **3** | MySQL 服务层 | 壳删 3 孩提级 |
| 111 | 备份、运维与诊断 | **3** | MySQL 运维 | 壳删 3 孩提级 |
| 115 | 连接与请求入口 | **2** | MySQL 连接层 | 壳删 2 孩提级 |
| 116 | 元数据与选项文件 | **2** | MySQL 数据文件 | 壳删 2 孩提级 |
| 131 | 一致性与 CAP 实践 | 0 | CAP 原理 | 正文并入 |
| 132 | CAP原则与BASE理论 | 0 | CAP / BASE ✓ 双正身 | 拆+边 |
| 134 | 分库和分表 | 0 | 分库 / 分表 | 拆+边（分表 dict 节点已有；分库无） |
| 补 | 生产者和消费者模式（原一类#15 改判） | 0 | ⚠️ 修正：整组是一个模式 | **树名改「生产者消费者模式」保留**，不拆 |
| 补 | 发布与订阅（原一类#94 改判） | 0 | ⚠️ 修正：pub-sub 是一个模式 | **树名改「发布订阅模式 / pub-sub」保留**，不拆 |

## 五、参考文献硬删除（5 条）

「数据库相关出版物」整簇（wiki References 切坏的条目，9 条树条目 / 5 个池节点——`Ling Liu…`、`康诺利…`、`Gray…`、`克伦克…`、`特奥雷…`，簇内另有 4 个残段条目）：
1. 卸整簇树条目（含「数据库相关出版物」壳本身）。
2. 池节点门一复扫（预计零命中——wiki 残段无引用）→ 退池。
3. ⚠️ 「硬删除」仍走宪法门三：备份目录留存 + 独立提交写明原因。书目文本如需溯源，转存 `docs/sources/database-bibliography.md`（一段代码的事，防止将来 wiki 重导出又要爬）。

## 六、豁免（1 条）

「逻辑与 (&&)」@ React/条件式渲染（`111 字`）：**100% 保留**。扫描器白名单已固化（`scripts/scan-tree-violations.mjs` FALSE_POSITIVE_A）。

---

## 验收

1. `npm test` 34/34；`tsc --noEmit` 0 错；`npm run build` 过。
2. 树 3267 → 约 **3130±10**（136 条处置中：约 5 条只改名/保留、2 条改判模式名、3 条孩子提级不净减——以执行后重数为准，写进提交信息）。
3. 新建边 relationKind 100% 受控枚举；type 人读语义 100% 填写。
4. mechanismSpec 净增约 6~8 个（偏向锁读写锁合并 2、SqlSession 1、RDB 1、JVM 对象创建 1、连接线程 1、MySQL 连接 1）；**零重复建**（bcs_flow/qproc_flow/msr_flow/aop_flow 已有的 4 个严禁重建）。
5. spot-check.mjs 抽查：装箱/拆箱两卡有边可跳、RabbitMQ supplement 3 tab、问题库新增卡 relatedNodeId 跳转落点正确。
6. 独立提交：`data: A-split — 136 捆绑节点拆解（双正身+关系边 / 机制沉淀 / 题库转移 / 壳提级 / 书目清除）`。

## 回滚

`git checkout -- data/` + `data/backups/a-split-2026-09-13/` 双保险。

---

## 执行顺序（风险从低到高）

**五（书目清除）→ 三（题库转移 21，零结构风险）→ 四（去壳提级 25）→ 一（拆双正身 56，边语义逐条写）→ 二（机制沉淀 28，spec 契约最重且含 3 条保护名单特判）**。
每节完成即跑测试 + gate 复扫；「现查」标记的 treeId 在执行时先全量补定位再动手。
