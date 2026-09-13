# §三 题库转移 · 存活候选清单（2026-09-13 实测）

> 来源：A 组 136 行主表 − 工单 §一/§二/§四/§五 已认领编号 = 30 条仍存活项。
> §三 工单声明 21 条；其余 9 条在工单中无任何节认领（见 reconcile.mjs 输出）。
> 本表只列事实（nodeRef / 挂载 / 孩数 / 正文量），不含拟定的问题文本。

| # | 名称 | nodeRef | treeId | 孩 | 正文 |
|---|---|---|---|---:|---:|
| 4 | 责任驱动设计与数据驱动设计 | `k_1784222526071_nwu5h9` | tree_1784222526110_9qu5ne | 0 | 128 |
| 5 | 面向对象与数据库 | `k_1784222473047_i8okyb` | tree_1784222473084_0qpr3k | 0 | 450 |
| 24 | 队列同步器的接口与示例 | `k_1786017052246_ok0jl6` | tree_1786017052478_4qbdcw | 2 | 455 |
| 25 | 读写锁的接口与示例 | `k_1786026226542_k0x0er` | tree_1786026226848_dk9pdh | 0 | 119 |
| 28 | Condition接口与示例 | `k_1786029569920_2k0ima` | tree_1786029570194_v543za | 0 | 138 |
| 33 | JVM 参数与调优 | `k_vault_javajvm04jvm_i15q6w` | tree_vault_javajvm04jvm_i15q6w | 0 | 2836 |
| 40 | 重写（Override）与重载（Overload） | `k_vault_javajavaoverrideoverload_18u2us` | tree_vault_javajavaoverrideoverload_18u2us | 0 | 7523 |
| 50 | 语言评估与争议 | `k_goexplain_eval` | tree_goexplain_eval | 0 | 1420 |
| 53 | 与其他语言的比较 | `k_wiki_en_java_performance_s14` | tree_wiki_en_java_performance_s14 | 9 | 391 |
| 54 | 与口译员的比较 | `k_wiki_en_compiler_s1` | tree_wiki_en_compiler_s1 | 0 | 404 |
| 56 | 注释和参考文献 | `k_wiki_en_compiler_s12` | tree_wiki_en_compiler_s12 | 0 | 7 |
| 57 | Unix 和类 Unix | `k_wiki_en_linker_computing_s8` | tree_wiki_en_linker_computing_s7_s8 | 0 | 180 |
| 76 | Kafka 顺序、吞吐与适用场景 | `k_vault_javakafka04_1s6eok` | tree_vault_javakafka04_1s6eok | 0 | 522 |
| 79 | RabbitMQ 与 Kafka 选型 | `k_vault_javarabbitmq05rabbitmqkafka_16ryk1` | tree_vault_javarabbitmq05rabbitmqkafka_16ryk1 | 0 | 573 |
| 80 | Spring Cloud 定位与系统问题 | `k_vault_javaspringcloud01springcloud_1gr4uj` | tree_vault_javaspringcloud01springcloud_1gr4uj | 0 | 564 |
| 85 | Spring Cloud 生态与技术选型 | `k_vault_javaspringcloud06springcloud_acgmi2` | tree_vault_javaspringcloud06springcloud_acgmi2 | 0 | 1022 |
| 86 | 性能的定义与 QPS 公式 | `sk_perf_def` | tree_sk_perf_def | 0 | 550 |
| 98 | uuid 和自增 id 的索引结构对比 | `pk_index_struct` | tree_pk_index_struct | 2 | 144 |
| 100 | 表拆分与分库优化 | `diag_split` | tree_diag_split | 0 | 985 |
| 101 | 热点数据与缓存优化 | `diag_hot_cache` | tree_diag_hot_cache | 0 | 546 |
| 102 | 优化3：ID 与主表 inner join | `pagination_opt_join` | tree_pagination_opt_join | 0 | 511 |
| 103 | 索引失效与适用边界 | `idx_fail_root` | tree_idx_fail_root | 3 | 288 |
| 113 | 校验和 / checksum | `mysql_glossary_checksum_qnrmvm` | projection:mysql-repaired:mysql:theme:backup-recovery:mysql_glossary_checksum_qnrmvm | 0 | 1038 |
| 120 | 交互与通信 | `k_1784348625706_s595yo` | tree_1784348625758_u7db4f | 0 | 172 |
| 122 | 知识表示与推理 | `k_acm2012_artificial_intelligence_knowledge_representation_reasoning` | tree_acm2012_artificial_intelligence_knowledge_representation_reasoning | 0 | 39 |
| 123 | 自动化规划与调度 | `k_acm2012_artificial_intelligence_automated_planning_scheduling` | tree_acm2012_artificial_intelligence_automated_planning_scheduling | 0 | 40 |
| 124 | 复杂度与算法分析 | `k_vault_java01_36x0hj` | tree_vault_java01_36x0hj | 0 | 817 |
| 125 | 算法与数据结构 | `n_9hr0nvvv` | governance:canonical:n_9hr0nvvv | 0 | 28 |
| 133 | 主从延迟与解决方案 | `k_vault_arch_replica_lag` | tree_vault_arch_replica_lag | 0 | 758 |
| 135 | 微服务架构与网络调用 | `k_vault_arch_micro_net` | tree_vault_arch_micro_net | 0 | 27 |

## 实测特判
- #5 正文为 ORM 映射叙述 → relatedNodeId 绑 ORM 而非泛「面向对象」（工单 ⚠️ 修正一条，已按正文判定）
- #53 带 9 孩 → 孩子先上提到 Java 性能节点，正文再转问题卡（工单 ⚠️ 修正二条）
- #50 实际挂在 go/ 下（工单写「动态程序分析/Java性能」树下，与实树不符），0 孩，直接转卡
- kind 枚举实测无 `concept`：合法值为 definition/mechanism/comparison/application/troubleshooting/recall
