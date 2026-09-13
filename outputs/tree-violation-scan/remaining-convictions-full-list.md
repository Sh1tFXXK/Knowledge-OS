# 目录树剩余定罪全量名单（2026-09-14）

> **只读产物**：本文件由 `scripts/scan-remaining-convictions.mjs` 生成，未修改任何 `data/*.json`。
> 模式定罪 ≠ 终审定罪。「子树」>0 的条目拆除前必须先定子节点去处；「正文」有字数的条目卸载前必须先迁移内容（宪法门二）。
> 生成器：`node scripts/scan-remaining-convictions.mjs` · 复核口径：树 3274 条 · 池 3849 条 · 机制 spec 14 个

## 一、总览

| 类 | 条目 | 带子树 | 有正文 | 题库同题 | 子树合计 | 正文字数合计 |
|---|---:|---:|---:|---:|---:|---:|
| E | 7 | 3 | 6 | 1 | 6 | 2953 |
| B | 0 | 0 | 0 | 0 | 0 | 0 |
| D | 43 | 2 | 43 | 0 | 42 | 15995 |
| C | 37 | 20 | 37 | 0 | 871 | 196728 |
| A | 0 | 0 | 0 | 0 | 0 | 0 |
| **合计** | **87** | 25 | 86 | 1 | 919 | 215676 |

A 与 B 两大类当前为 **0 条**（A 类已物理拆分完毕、B 类已转题库），故不在下列明细中重复列出。

---

## 二、E 类 · 直接提问型（7 条）

**处置（宪法 §2.5）**：提问不成为树节点 → 问题库，`relatedNodeId` 指向名词本体。
**`all-outstanding.md` 的既有裁决**：正文融入名词正身的「产生背景 / 解决的问题 / 适用条件」tab；判重后并答案、不新建卡。
⚠️ **带子树的必须先上提孩子**（下表「孩子」列非空者）。

| # | 树节点 | nodeRef | 子树 | 孩子 | 正文 | 题库 | treeId | 路径 |
|---:|---|---|---:|---|---:|---|---|---|
| 1 | JSR-133为什么要增强final的语义 | `k_1785923886439_k5so6c` | 0 | — | 335 |  | `tree_1785923886640_ydkgnc` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / Java syntax / 基础 / 关键字 / final / final域的内存语义 / JSR-133为什么要增强final的语义 |
| 2 | MQ 为什么存在 | `k_vault_javarabbitmq01mq_j62j4c` | 0 | — | 663 |  | `tree_vault_javarabbitmq01mq_j62j4c` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / RabbitMQ / MQ 为什么存在 |
| 3 | 如何发现瓶颈 | `sk_perf_bottleneck` | 0 | — | 713 |  | `tree_sk_perf_bottleneck` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / 秒杀系统性能优化方法 / 如何发现瓶颈 |
| 4 | 如何判断对象可以被回收 | `k_1783264901088_1s02ir` | 2 | 引用计数法、可达性分析算法 | 0 | **同题** | `tree_1783264901125_rlyl58` | 知识宇宙 / 计算机科学 / 系统组织 / 操作系统 / 内存管理 / 垃圾回收 / 垃圾回收判定 / 如何判断对象可以被回收 |
| 5 | 什么时候需要分库分表 | `sharding_when` | 0 | — | 316 |  | `tree_sharding_when` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 十四、数据库分布与复制 / MySQL 分库分表 / 什么时候需要分库分表 |
| 6 | 为什么命中索引比不命中快 | `idxf_overview` | 1 | 索引的弊端 | 694 |  | `tree_idxf_overview` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 索引 / MySQL 索引 / 为什么命中索引比不命中快 |
| 7 | 数据库是什么类型的东西？ | `k_wiki_en_outline_of_databases_s1` | 3 | 信息、数据、计算机数据 | 232 |  | `tree_wiki_en_outline_of_databases_s1` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 一、数据库系统 / 数据库是什么类型的东西？ |

---

## 三、D 类 · 动作 / 状态 / 过程片段（43 条）

**处置（宪法 §2.5）**：步骤进 `mechanismSpec`；优缺点进 `viewDimensions`；实战经验进 `supplement`。

### 3.1 按 mechanismSpec 归属分档

⚠️ **机制 spec 存在池节点顶层 `mechanismSpec`，不在 `card.mechanismSpec`**（按后者查会得 0 个，极易误判）。当前池内共 **14 个 spec**、去重持有 **143 个节点引用**。

| 档 | 条目 | 含义 | 处置取向 |
|---|---:|---|---|
| spec 已持有（state） | 11 | 该 nodeRef 已是某 spec 的 stateNodeIds 成员 → 树条目是机制视图的重复投影 | **留树还是卸树，需裁决**（见 3.3） |
| spec 宿主 | 1 | 该 nodeRef 本身就是机制 spec 节点（mechanismSpec 的载体）→ 树里是机制的入口 | 大概率豁免或改名，不宜卸树 |
| spec 其他槽位 | 1 | 该 nodeRef 出现在 spec 的 trigger/participant/outcome/failure 槽位 | 同「已持有」，先核该槽位语义 |
| 无 spec | 30 | 尚未被任何 spec 覆盖 → 需先定载体（新建 spec / viewDimensions / supplement） | 先定载体，最重的一档 |

### 3.2 明细（按档分组）

| # | 树节点 | nodeRef | 档 | 所属 spec | 子树 | 正文 | treeId | 路径 |
|---:|---|---|---|---|---:|---:|---|---|
| 1 | ① 代理对象已创建 | `aop_state_proxy_created` | spec 已持有（state） | 执行阶段（`aop_flow`） | 0 | 154 | `tree_aop_state_proxy_created` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / AOP / AOP 原理 / 执行阶段 / ① 代理对象已创建 |
| 2 | ② 调用已被拦截 | `aop_state_intercepted` | spec 已持有（state） | 执行阶段（`aop_flow`） | 0 | 169 | `tree_aop_state_intercepted` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / AOP / AOP 原理 / 执行阶段 / ② 调用已被拦截 |
| 3 | ③ 拦截器链执行中 | `aop_state_chain_running` | spec 已持有（state） | 执行阶段（`aop_flow`） | 0 | 146 | `tree_aop_state_chain_running` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / AOP / AOP 原理 / 执行阶段 / ③ 拦截器链执行中 |
| 4 | ④ 织入代码已执行 | `aop_state_advice_done` | spec 已持有（state） | 执行阶段（`aop_flow`） | 0 | 88 | `tree_aop_state_advice_done` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / AOP / AOP 原理 / 执行阶段 / ④ 织入代码已执行 |
| 5 | ⑤ 目标方法已调用（返回） | `aop_state_target_invoked` | spec 已持有（state） | 执行阶段（`aop_flow`） | 0 | 118 | `tree_aop_state_target_invoked` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / AOP / AOP 原理 / 执行阶段 / ⑤ 目标方法已调用（返回） |
| 6 | ① read 发起（用户态→内核态） | `tio_state_read_syscall` | spec 已持有（state） | 传统 IO 执行流程（`tio_flow`） | 0 | 120 | `tree_tio_state_read_syscall` | 知识宇宙 / 计算机科学 / 系统组织 / 操作系统 / 零拷贝 / 传统 IO 执行流程 / ① read 发起（用户态→内核态） |
| 7 | ② DMA：磁盘 → 内核缓冲区 | `tio_state_disk_to_kernel` | spec 已持有（state） | 传统 IO 执行流程（`tio_flow`） | 0 | 82 | `tree_tio_state_disk_to_kernel` | 知识宇宙 / 计算机科学 / 系统组织 / 操作系统 / 零拷贝 / 传统 IO 执行流程 / ② DMA：磁盘 → 内核缓冲区 |
| 8 | ③ CPU：内核缓冲区 → 用户缓冲区（返回） | `tio_state_kernel_to_user` | spec 已持有（state） | 传统 IO 执行流程（`tio_flow`） | 0 | 149 | `tree_tio_state_kernel_to_user` | 知识宇宙 / 计算机科学 / 系统组织 / 操作系统 / 零拷贝 / 传统 IO 执行流程 / ③ CPU：内核缓冲区 → 用户缓冲区（返回） |
| 9 | ④ write 发起（用户态→内核态） | `tio_state_write_syscall` | spec 已持有（state） | 传统 IO 执行流程（`tio_flow`） | 0 | 111 | `tree_tio_state_write_syscall` | 知识宇宙 / 计算机科学 / 系统组织 / 操作系统 / 零拷贝 / 传统 IO 执行流程 / ④ write 发起（用户态→内核态） |
| 10 | ⑤ CPU：用户缓冲区 → socket 缓冲区 | `tio_state_user_to_socket` | spec 已持有（state） | 传统 IO 执行流程（`tio_flow`） | 0 | 104 | `tree_tio_state_user_to_socket` | 知识宇宙 / 计算机科学 / 系统组织 / 操作系统 / 零拷贝 / 传统 IO 执行流程 / ⑤ CPU：用户缓冲区 → socket 缓冲区 |
| 11 | ⑥ DMA：socket 缓冲区 → 网卡（返回） | `tio_state_socket_to_nic` | spec 已持有（state） | 传统 IO 执行流程（`tio_flow`） | 0 | 149 | `tree_tio_state_socket_to_nic` | 知识宇宙 / 计算机科学 / 系统组织 / 操作系统 / 零拷贝 / 传统 IO 执行流程 / ⑥ DMA：socket 缓冲区 → 网卡（返回） |
| 12 | 执行阶段 | `aop_flow` | spec 宿主 | — | 10 | 921 | `tree_aop_flow` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / AOP / AOP 原理 / 执行阶段 |
| 13 | 调用方（getBean 请求） | `bcs_caller` | spec 其他槽位 | Bean 创建策略机制（`bcs_flow`） | 0 | 136 | `tree_bcs_caller` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / Spring Beans / Bean 创建策略机制 / 调用方（getBean 请求） |
| 14 | 合理地配置线程池 | `k_1786092342085_3zwh4c` | 无 spec | — | 0 | 940 | `tree_1786092342461_a1uk2e` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / 线程池 / 线程池的使用 / 合理地配置线程池 |
| 15 | 线上问题定位 | `k_1786096587014_vzab8u` | 无 spec | — | 0 | 3388 | `tree_1786096587342_j05qf9` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / Java并发编程实践 / 线上问题定位 |
| 16 | 1. 创建前准备阶段 | `bean_lc_prepare` | 无 spec | — | 0 | 679 | `tree_bean_lc_prepare` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / Spring Beans / 生命周期 / 1. 创建前准备阶段 |
| 17 | 2. 创建实例阶段 | `bean_lc_instantiate` | 无 spec | — | 0 | 237 | `tree_bean_lc_instantiate` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / Spring Beans / 生命周期 / 2. 创建实例阶段 |
| 18 | 3. 依赖注入阶段 | `bean_lc_inject` | 无 spec | — | 0 | 648 | `tree_bean_lc_inject` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / Spring Beans / 生命周期 / 3. 依赖注入阶段 |
| 19 | 4. 容器缓存阶段 | `bean_lc_cache` | 无 spec | — | 0 | 498 | `tree_bean_lc_cache` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / Spring Beans / 生命周期 / 4. 容器缓存阶段 |
| 20 | 5. 销毁实例阶段 | `bean_lc_destroy` | 无 spec | — | 0 | 404 | `tree_bean_lc_destroy` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring / Spring Beans / 生命周期 / 5. 销毁实例阶段 |
| 21 | 1. 预估流量 | `surge_estimate` | 无 spec | — | 0 | 147 | `tree_surge_estimate` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / 流量激增应对方法 / 1. 预估流量 |
| 22 | 2. 全链路压测 | `surge_stress` | 无 spec | — | 0 | 158 | `tree_surge_stress` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / 流量激增应对方法 / 2. 全链路压测 |
| 23 | 3. 定位并解决链路瓶颈 | `surge_bottleneck` | 无 spec | — | 0 | 272 | `tree_surge_bottleneck` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / 流量激增应对方法 / 3. 定位并解决链路瓶颈 |
| 24 | 4. 加机器扩容 | `surge_scale` | 无 spec | — | 0 | 170 | `tree_surge_scale` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / 流量激增应对方法 / 4. 加机器扩容 |
| 25 | 5. 降级 | `surge_degrade` | 无 spec | — | 0 | 199 | `tree_surge_degrade` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / 流量激增应对方法 / 5. 降级 |
| 26 | 6. 常态高可用：限流 + 监控报警 | `surge_ha` | 无 spec | — | 0 | 186 | `tree_surge_ha` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / 流量激增应对方法 / 6. 常态高可用：限流 + 监控报警 |
| 27 | ① 硬件扩展 + 微服务拆分 | `hps_scale` | 无 spec | — | 0 | 604 | `tree_hps_scale` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / QPS 提升 10 倍的系统设计 / ① 硬件扩展 + 微服务拆分 |
| 28 | ② 高性能 RPC | `hps_rpc` | 无 spec | — | 0 | 497 | `tree_hps_rpc` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / QPS 提升 10 倍的系统设计 / ② 高性能 RPC |
| 29 | ③ 消息队列削峰解耦 | `hps_mq` | 无 spec | — | 0 | 336 | `tree_hps_mq` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / QPS 提升 10 倍的系统设计 / ③ 消息队列削峰解耦 |
| 30 | ④ 三级缓存架构 | `hps_cache` | 无 spec | — | 0 | 414 | `tree_hps_cache` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / QPS 提升 10 倍的系统设计 / ④ 三级缓存架构 |
| 31 | ⑤ 读写分离 + 分库分表 | `hps_db` | 无 spec | — | 0 | 429 | `tree_hps_db` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / QPS 提升 10 倍的系统设计 / ⑤ 读写分离 + 分库分表 |
| 32 | ⑥ 高可用五板斧 | `hps_ha` | 无 spec | — | 0 | 560 | `tree_hps_ha` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / QPS 提升 10 倍的系统设计 / ⑥ 高可用五板斧 |
| 33 | 1. 优先优化高并发执行的 SQL | `sqopt_idea_highconc` | 无 spec | — | 0 | 389 | `tree_sqopt_idea_highconc` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 1. 优先优化高并发执行的 SQL |
| 34 | 10. 合理设计并利用索引 | `sqopt_idea_index` | 无 spec | — | 0 | 787 | `tree_sqopt_idea_index` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 10. 合理设计并利用索引 |
| 35 | 2. 定位优化对象的性能瓶颈 | `sqopt_idea_bottleneck` | 无 spec | — | 0 | 261 | `tree_sqopt_idea_bottleneck` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 2. 定位优化对象的性能瓶颈 |
| 36 | 3. 明确优化目标 | `sqopt_idea_target` | 无 spec | — | 0 | 180 | `tree_sqopt_idea_target` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 3. 明确优化目标 |
| 37 | 4. 从 EXPLAIN 执行计划入手 | `sqopt_idea_explain` | 无 spec | — | 0 | 110 | `tree_sqopt_idea_explain` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 4. 从 EXPLAIN 执行计划入手 |
| 38 | 5. 永远用小的结果集驱动大的结果集 | `sqopt_idea_small_drive` | 无 spec | — | 0 | 421 | `tree_sqopt_idea_small_drive` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 5. 永远用小的结果集驱动大的结果集 |
| 39 | 6. 尽可能在索引中完成排序 | `sqopt_idea_sort_index` | 无 spec | — | 0 | 211 | `tree_sqopt_idea_sort_index` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 6. 尽可能在索引中完成排序 |
| 40 | 7. 只获取自己需要的列 | `sqopt_idea_columns` | 无 spec | — | 0 | 101 | `tree_sqopt_idea_columns` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 7. 只获取自己需要的列 |
| 41 | 8. 只使用最有效的过滤条件 | `sqopt_idea_filter` | 无 spec | — | 0 | 97 | `tree_sqopt_idea_filter` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 8. 只使用最有效的过滤条件 |
| 42 | 9. 尽可能避免复杂的 join 和子查询 | `sqopt_idea_join` | 无 spec | — | 0 | 218 | `tree_sqopt_idea_join` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 查询系统 / 查询优化器 / query optimizer / MySQL 查询优化器（Optimizer） / MySQL 慢查询 SQL 优化思路 / 慢查询优化思路（十条） / 9. 尽可能避免复杂的 join 和子查询 |
| 43 | 创建数据仓库 | `k_wiki_en_outline_of_databases_s21` | 无 spec | — | 32 | 7 | `tree_wiki_en_outline_of_databases_s20_s21` | 知识宇宙 / 计算机科学 / 信息系统 / 数据库管理 / 数据库 / 一、数据库系统 / 数据仓库 / 创建数据仓库 |

### 3.3 ⚠️ 动手前必须裁决的分叉：树条目「留」还是「去」

同一批 D 条目，两份现行文件给出相反取向：

| 依据 | 原文 | 对树条目的结论 |
|---|---|---|
| `outputs/tree-violation-scan/all-outstanding.md`（2026-09-13 三档裁决） | 「A/IO 组 spec 已引用（**只改名去序号，严禁删**）；Bean 组并入既有 spec；秒杀/流量/军规组新建 mechanismSpec 或 viewDimensions」 | **留树**，只把名字里的 `①`/`1.` 去掉 |
| `docs/CONSTITUTION.md` §2.5 | 「动作/过程片段 …… → 步骤进 `mechanismSpec`」 | **不留树**，机制只在机制视图出现 |

两者分歧点：机制状态是否允许在目录树里再挂一份。留树 = 目录仍列出机制步骤；卸树 = 目录只列名词，步骤靠机制视图承载。
**建议先裁这一条，再谈其余 31 条**——它决定 12 条的走法，也影响后续是否要建新 spec。

### 3.4 无 spec 那 30 条的自然簇

| 簇 | 条数 | 建议载体 |
|---|---:|---|
| `bean_lc_*`（Spring Bean 生命周期五阶段） | 5 | 新建 `mechanismSpec`（池内已有 `bcs_flow`「Bean 创建策略机制」，可参照） |
| `surge_*`（流量激增应对方法六步） | 6 | `supplement` 或 `viewDimensions` |
| `hps_*`（QPS 提升 10 倍的系统设计） | 6 | `supplement` 或 `viewDimensions` |
| `sqopt_idea_*`（慢查询优化思路十条） | 10 | `supplement`（十条并列，非状态机） |
| `bcs_caller`（调用方 getBean 请求） | 1 | 核 `bcs_flow` 的 trigger/participant 槽位后归位或豁免 |
| 单条：合理地配置线程池 / 线上问题定位 / 创建数据仓库 | 3 | 前两条 → `supplement`；「创建数据仓库」带 **32 个孩子**，须先定子树去处 |

---

## 四、C 类 · 教程 / 章节外壳（37 条）

**处置（宪法 §2.5 + all-outstanding 裁决）**：详解壳去「详解」并正身；章节壳去「一、二、」序号改实名；「基础」→ 实名或解散；**子树一律原样保留**（本类共 871 个孩子，零损失）。

### 4.1 分小类

| 小类 | 条目 | 子树合计 | 是否已删/已迁移 |
|---|---:|---:|---|
| 详解/总览壳 · 去后缀归本体 | 16 | 7 | 无（纯改名/去后缀，不移动子树） |
| 「基础」壳 · 实名或解散 | 2 | 0 | 无（纯改名/去后缀，不移动子树） |
| 大壳 · 需先定实名或解散 | 4 | 200 | 无（纯改名/去后缀，不移动子树） |
| 章节壳 · 去序号 | 15 | 664 | 无（纯改名/去后缀，不移动子树） |

### 4.2 章节壳去序号映射（15 条 · 纯改名，零删零迁移）

先例：`chapter_db_06`「查询系统」、`chapter_db_07`「数据库事务」、`chapter_db_11`「索引」**已正名**，可作为口径参照。

| # | nodeRef | 现名 | 拟改名 | 子树 | 正文字数 | treeId |
|---:|---|---|---|---:|---:|---|
| 1 | `container:chapter_db_01` | 一、数据库系统 | 数据库系统 | 131 | 198 | `chapter_db_01` |
| 2 | `container:chapter_db_02` | 二、数据模型 | 数据模型 | 97 | 202 | `chapter_db_02` |
| 3 | `container:chapter_db_03` | 三、数据库结构 | 数据库结构 | 53 | 256 | `chapter_db_03` |
| 4 | `container:chapter_db_05` | 五、数据库操作 | 数据库操作 | 31 | 278 | `chapter_db_05` |
| 5 | `container:chapter_db_08` | 八、恢复系统 | 恢复系统 | 37 | 300 | `chapter_db_08` |
| 6 | `container:chapter_db_09` | 九、日志系统 | 日志系统 | 30 | 288 | `chapter_db_09` |
| 7 | `container:chapter_db_10` | 十、存储系统 | 存储系统 | 59 | 298 | `chapter_db_10` |
| 8 | `container:chapter_db_12` | 十二、数据表示 | 数据表示 | 14 | 372 | `chapter_db_12` |
| 9 | `container:chapter_db_13` | 十三、数据库设计 | 数据库设计 | 20 | 108 | `chapter_db_13` |
| 10 | `container:chapter_db_14` | 十四、数据库分布与复制 | 数据库分布与复制 | 15 | 166 | `chapter_db_14` |
| 11 | `container:chapter_db_16` | 十六、数据库安全 | 数据库安全 | 1 | 96 | `chapter_db_16` |
| 12 | `container:chapter_db_17` | 十七、数据库运维 | 数据库运维 | 27 | 280 | `chapter_db_17` |
| 13 | `container:chapter_db_18` | 十八、数据库编程与接口 | 数据库编程与接口 | 65 | 258 | `chapter_db_18` |
| 14 | `container:chapter_db_19` | 十九、数据库产品 | 数据库产品 | 44 | 96 | `chapter_db_19` |
| 15 | `container:chapter_db_20` | 二十、数据库文件与实现 | 数据库文件与实现 | 40 | 182 | `chapter_db_20` |

> 说明：18 个 `container:chapter_db_*` 中已有 3 个去序号完成；`_04`/`_15` 的容器与树条目均已不存在（早前批次已收），当前全树悬空 nodeRef 为 0。

### 4.3 其余壳明细

| # | 小类 | 树节点 | nodeRef | 子树 | 正文 | treeId | 路径 |
|---:|---|---|---|---:|---:|---|---|
| 1 | 详解/总览壳 · 去后缀归本体 | ArrayList 详解 | `k_vault_javajavaarraylist_an0rm3` | 0 | 17126 | `tree_vault_javajavaarraylist_an0rm3` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / 集合框架 / ArrayList 详解 |
| 2 | 详解/总览壳 · 去后缀归本体 | HashMap 详解 | `k_vault_javajavahashmap_14a6f2` | 0 | 15337 | `tree_vault_javajavahashmap_14a6f2` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / 集合框架 / HashMap 详解 |
| 3 | 详解/总览壳 · 去后缀归本体 | HashSet 详解 | `k_vault_javajavahashset_176pvr` | 0 | 11229 | `tree_vault_javajavahashset_176pvr` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / 集合框架 / HashSet 详解 |
| 4 | 详解/总览壳 · 去后缀归本体 | Java 集合框架总览 | `k_vault_javajava_15bnft` | 0 | 20130 | `tree_vault_javajava_15bnft` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / 集合框架 / Java 集合框架总览 |
| 5 | 详解/总览壳 · 去后缀归本体 | LinkedList 详解 | `k_vault_javajavalinkedlist_1uc0ii` | 0 | 19626 | `tree_vault_javajavalinkedlist_1uc0ii` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / 集合框架 / LinkedList 详解 |
| 6 | 详解/总览壳 · 去后缀归本体 | 线程池详解 | `k_vault_java_1n4uei` | 0 | 26047 | `tree_vault_java_1n4uei` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / 线程池详解 |
| 7 | 详解/总览壳 · 去后缀归本体 | FutureTask详解 | `k_1786095193093_odfdcm` | 2 | 845 | `tree_1786095193397_uyjgsm` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / Executor框架 / FutureTask详解 |
| 8 | 详解/总览壳 · 去后缀归本体 | ScheduledThreadPoolExecutor详解 | `k_1786093346748_5mapqp` | 2 | 221 | `tree_1786093347020_15dntb` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / Executor框架 / ScheduledThreadPoolExecutor详解 |
| 9 | 详解/总览壳 · 去后缀归本体 | ThreadPoolExecutor详解 | `k_1786093143886_qda5cu` | 3 | 42791 | `tree_1786093144146_ajv4cr` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / Executor框架 / ThreadPoolExecutor详解 |
| 10 | 详解/总览壳 · 去后缀归本体 | CachedThreadPool详解 | `k_1786093265033_rqvw3n` | 0 | 1418 | `tree_1786093265279_n5f4vh` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / Executor框架 / ThreadPoolExecutor详解 / CachedThreadPool详解 |
| 11 | 详解/总览壳 · 去后缀归本体 | FixedThreadPool详解 | `k_1786093174816_8f6sp8` | 0 | 949 | `tree_1786093175065_78z1xl` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / Executor框架 / ThreadPoolExecutor详解 / FixedThreadPool详解 |
| 12 | 详解/总览壳 · 去后缀归本体 | SingleThreadExecutor详解 | `k_1786093231291_1p3kk2` | 0 | 669 | `tree_1786093231555_o69fau` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / Executor框架 / ThreadPoolExecutor详解 / SingleThreadExecutor详解 |
| 13 | 详解/总览壳 · 去后缀归本体 | Java 多线程编程入门 | `k_vault_javajava_vzjv8p` | 0 | 17694 | `tree_vault_javajava_vzjv8p` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / java并发编程 / Java 多线程编程入门 |
| 14 | 详解/总览壳 · 去后缀归本体 | Kafka 定位总览 | `k_vault_javakafkakafka_1qlqb8` | 0 | 2073 | `tree_vault_javakafkakafka_1qlqb8` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Kafka / Kafka 定位总览 |
| 15 | 详解/总览壳 · 去后缀归本体 | MyBatis 定位总览 | `k_vault_javamybatismybatis_14eqlq` | 0 | 3521 | `tree_vault_javamybatismybatis_14eqlq` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Mybatis / MyBatis 定位总览 |
| 16 | 详解/总览壳 · 去后缀归本体 | Spring Cloud 定位总览 | `k_vault_javaspringcloudspringcloud_33p5su` | 0 | 1637 | `tree_vault_javaspringcloudspringcloud_33p5su` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 软件框架 / Spring Cloud / Spring Cloud 定位总览 |
| 17 | 「基础」壳 · 实名或解散 | Java 数据结构基础 | `k_vault_javajava_ii523d` | 0 | 7888 | `tree_vault_javajava_ii523d` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / 集合框架 / Java 数据结构基础 |
| 18 | 「基础」壳 · 实名或解散 | JVM 基础 | `k_vault_javajvm01jvm_1h8bru` | 0 | 3598 | `tree_vault_javajvm01jvm_1h8bru` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / 执行系统 / jvm / JVM 基础 |
| 19 | 大壳 · 需先定实名或解散 | 基础 | `k_java_syntax_zh_1oty7br` | 58 | 28 | `tree_java_syntax_zh_1oty7br` | 知识宇宙 / 计算机科学 / 软件符号与工具 / 编程语言 / java / Java syntax / 基础 |
| 20 | 大壳 · 需先定实名或解散 | 软件开发（实践总览） | `k_1783873300296_o38v1d` | 142 | 55 | `tree_1783873300414_0y8oon` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） |
| 21 | 大壳 · 需先定实名或解散 | 进阶思路：监控驱动动态扩容 | `surge_auto_scale` | 0 | 445 | `tree_surge_auto_scale` | 知识宇宙 / 计算机科学 / 软件开发（实践总览） / 软件工程 / 性能优化 / 流量激增应对方法 / 进阶思路：监控驱动动态扩容 |
| 22 | 大壳 · 需先定实名或解散 | 跨系统标准与约定（总览） | `school_real_world_conventions` | 0 | 23 | `governance:canonical:school_real_world_conventions` | 知识宇宙 / 计算机科学 / 信息系统 / 跨系统标准与约定（总览） |

---

## 五、机制 spec 现状（D 类的参照系）

| spec nodeRef | 名称 | state 数 |
|---|---|---:|
| `k_1782820185793_jpet7h` | 类的加载、链接与初始化机制 | 9 |
| `k_1783263380028_2hhr2a` | 内存管理 | 6 |
| `k_web_78137b704e08` | 偏向锁 | 6 |
| `k_1785934396536_as412a` | 线程的状态 | 8 |
| `k_1786245816863_ntvyz2` | RDB持久化 | 5 |
| `k_vault_javamybatis02sqlsession_5c5wcf` | SqlSession 生命周期 | 6 |
| `msr_flow` | 复制流程（三线程） | 5 |
| `qproc_flow` | 内部执行流程（六步） | 6 |
| `qproc_thread_state` | 连接与线程状态 | 6 |
| `bcs_flow` | Bean 创建策略机制 | 5 |
| `aop_flow` | 执行阶段 | 5 |
| `tpl_flow` | 线程池状态机（五状态） | 5 |
| `tio_flow` | 传统 IO 执行流程 | 6 |
| `asplit_rwlock_mechanism` | 读写锁实现机制 | 8 |

---

## 六、复核与只读声明

- 本名单由 `scripts/scan-remaining-convictions.mjs` 直接读取 `data/node-pool.json` / `data/tree-data.json` / `data/questions.json` 生成，**未写入任何 `data/*.json`**。
- 定罪正则与 `scripts/scan-tree-violations.mjs` 保持一致；类优先级 问句 > 对比 > 过程 > 教程壳 > 捆绑。
- 交叉核对口径：子树规模（拆壳需重挂孩子）、正文持有量（迁移成本）、题库重合（转移成本）、mechanismSpec 归属（是否已有正确载体）。
- 生成时刻：2026-09-13T16:28:12.885Z（UTC，本地日期 2026-09-14）
