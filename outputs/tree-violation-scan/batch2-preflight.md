# final-87 第二批（D2 + C）只读预检

树条目 3256（含根）｜池 3849｜边 4212｜题 783

> 本文件只读生成，未写入任何 `data/*.json`。

## 一、D2 · 六簇宿主核对

### bean_lc_*（Bean 生命周期五阶段） —— 5 条 · 载体 mechanismSpec（新建）

| 条目 | treeId | 父条目 | 子树 | 正文 | 池中? |
|---|---|---|---:|---:|---|
| 1. 创建前准备阶段 | `tree_bean_lc_prepare` | 生命周期 | 0 | 679 | 是 |
| 2. 创建实例阶段 | `tree_bean_lc_instantiate` | 生命周期 | 0 | 237 | 是 |
| 3. 依赖注入阶段 | `tree_bean_lc_inject` | 生命周期 | 0 | 648 | 是 |
| 4. 容器缓存阶段 | `tree_bean_lc_cache` | 生命周期 | 0 | 498 | 是 |
| 5. 销毁实例阶段 | `tree_bean_lc_destroy` | 生命周期 | 0 | 404 | 是 |

- 宿主候选 `asplit_bean_lifecycle` → **命中**：treeId `asplit_s1_asplit_bean_lifecycle`「Bean 生命周期」ref `asplit_bean_lifecycle`（0 孩，正文 112）
- 宿主候选 `k_1785225243066_ds8pn6` → **命中**：treeId `tree_1785225243163_ypgo3y`「生命周期」ref `k_1785225243066_ds8pn6`（6 孩，正文 1825）

### surge_*（流量激增应对方法六步） —— 6 条 · 载体 supplement（并入宿主）

| 条目 | treeId | 父条目 | 子树 | 正文 | 池中? |
|---|---|---|---:|---:|---|
| 1. 预估流量 | `tree_surge_estimate` | 流量激增应对方法 | 0 | 147 | 是 |
| 2. 全链路压测 | `tree_surge_stress` | 流量激增应对方法 | 0 | 158 | 是 |
| 3. 定位并解决链路瓶颈 | `tree_surge_bottleneck` | 流量激增应对方法 | 0 | 272 | 是 |
| 4. 加机器扩容 | `tree_surge_scale` | 流量激增应对方法 | 0 | 170 | 是 |
| 5. 降级 | `tree_surge_degrade` | 流量激增应对方法 | 0 | 199 | 是 |
| 6. 常态高可用：限流 + 监控报警 | `tree_surge_ha` | 流量激增应对方法 | 0 | 186 | 是 |

- 宿主候选 `surge_methods` → **未命中**
- 宿主候选 `流量激增应对方法` → **命中**：treeId `tree_surge_overview`「流量激增应对方法」ref `surge_overview`（7 孩，正文 238）

### hps_*（QPS 提升 10 倍的系统设计） —— 6 条 · 载体 supplement（并入宿主）

| 条目 | treeId | 父条目 | 子树 | 正文 | 池中? |
|---|---|---|---:|---:|---|
| ① 硬件扩展 + 微服务拆分 | `tree_hps_scale` | QPS 提升 10 倍的系统设计 | 0 | 604 | 是 |
| ② 高性能 RPC | `tree_hps_rpc` | QPS 提升 10 倍的系统设计 | 0 | 497 | 是 |
| ③ 消息队列削峰解耦 | `tree_hps_mq` | QPS 提升 10 倍的系统设计 | 0 | 336 | 是 |
| ④ 三级缓存架构 | `tree_hps_cache` | QPS 提升 10 倍的系统设计 | 0 | 414 | 是 |
| ⑤ 读写分离 + 分库分表 | `tree_hps_db` | QPS 提升 10 倍的系统设计 | 0 | 429 | 是 |
| ⑥ 高可用五板斧 | `tree_hps_ha` | QPS 提升 10 倍的系统设计 | 0 | 560 | 是 |

- 宿主候选 `hps_design` → **未命中**
- 宿主候选 `QPS 提升 10 倍的系统设计` → **命中**：treeId `tree_hps_overview`「QPS 提升 10 倍的系统设计」ref `hps_overview`（6 孩，正文 334）

### sqopt_idea_*（慢查询优化思路十条） —— 10 条 · 载体 supplement（并入宿主）

| 条目 | treeId | 父条目 | 子树 | 正文 | 池中? |
|---|---|---|---:|---:|---|
| 1. 优先优化高并发执行的 SQL | `tree_sqopt_idea_highconc` | 慢查询优化思路（十条） | 0 | 389 | 是 |
| 10. 合理设计并利用索引 | `tree_sqopt_idea_index` | 慢查询优化思路（十条） | 0 | 787 | 是 |
| 2. 定位优化对象的性能瓶颈 | `tree_sqopt_idea_bottleneck` | 慢查询优化思路（十条） | 0 | 261 | 是 |
| 3. 明确优化目标 | `tree_sqopt_idea_target` | 慢查询优化思路（十条） | 0 | 180 | 是 |
| 4. 从 EXPLAIN 执行计划入手 | `tree_sqopt_idea_explain` | 慢查询优化思路（十条） | 0 | 110 | 是 |
| 5. 永远用小的结果集驱动大的结果集 | `tree_sqopt_idea_small_drive` | 慢查询优化思路（十条） | 0 | 421 | 是 |
| 6. 尽可能在索引中完成排序 | `tree_sqopt_idea_sort_index` | 慢查询优化思路（十条） | 0 | 211 | 是 |
| 7. 只获取自己需要的列 | `tree_sqopt_idea_columns` | 慢查询优化思路（十条） | 0 | 101 | 是 |
| 8. 只使用最有效的过滤条件 | `tree_sqopt_idea_filter` | 慢查询优化思路（十条） | 0 | 97 | 是 |
| 9. 尽可能避免复杂的 join 和子查询 | `tree_sqopt_idea_join` | 慢查询优化思路（十条） | 0 | 218 | 是 |

- 宿主候选 `sqopt_ideas` → **命中**：treeId `tree_sqopt_ideas`「慢查询优化思路（十条）」ref `sqopt_ideas`（10 孩，正文 112）
- 宿主候选 `慢查询优化思路（十条）` → **命中**：treeId `tree_sqopt_ideas`「慢查询优化思路（十条）」ref `sqopt_ideas`（10 孩，正文 112）

### 单条 · 系列 —— 3 条 · 载体 supplement / 提级子树

| 条目 | treeId | 父条目 | 子树 | 正文 | 池中? |
|---|---|---|---:|---:|---|
| 合理地配置线程池 | `tree_1786092342461_a1uk2e` | 线程池的使用 | 0 | 940 | 是 |
| 线上问题定位 | `tree_1786096587342_j05qf9` | Java并发编程实践 | 0 | 3388 | 是 |
| 创建数据仓库 | `tree_wiki_en_outline_of_databases_s20_s21` | 数据仓库 | 32 | 7 | 是 |



## 二、D2 · 「创建数据仓库」的 32 个子树去处

- 条目：`tree_wiki_en_outline_of_databases_s20_s21`「创建数据仓库」，父 = 「数据仓库」(`tree_wiki_en_outline_of_databases_s20` ref `k_wiki_en_outline_of_databases_s20`)
- 亲儿子 11 个，后代合计 32 个
- 亲儿子名单：「变体」、「元素」、「事实」、「方面」、「填充」、「维度)」、「维度建模 (DM)」、「事实)」、「在线分析处理 (OLAP)」、「星型架构」、「聚合)」

## 三、C · 15 个章节壳去序号（同名冲突预警）


| # | treeId | 现名 | 拟改名 | 子树 | 正文 | 目标名在本树已占用? |
|---:|---|---|---|---:|---:|---|
| — | `chapter_db_01` | 一、数据库系统 | **数据库系统** | 130 | 198 | 否 |
| — | `chapter_db_02` | 二、数据模型 | **数据模型** | 97 | 202 | 否 |
| — | `chapter_db_03` | 三、数据库结构 | **数据库结构** | 53 | 256 | 否 |
| — | `chapter_db_05` | 五、数据库操作 | **数据库操作** | 31 | 278 | 否 |
| — | `chapter_db_08` | 八、恢复系统 | **恢复系统** | 37 | 300 | 否 |
| — | `chapter_db_09` | 九、日志系统 | **日志系统** | 30 | 288 | 否 |
| — | `chapter_db_10` | 十、存储系统 | **存储系统** | 59 | 298 | **是** — 「存储系统」`theory_domain_storage_systems`（ref `theory_domain_storage_systems`，同树其它分支，5 孩） |
| — | `chapter_db_12` | 十二、数据表示 | **数据表示** | 14 | 372 | 否 |
| — | `chapter_db_13` | 十三、数据库设计 | **数据库设计** | 20 | 108 | **是** — 「数据库设计」`tree_wiki_en_outline_of_databases_s4_s7`（ref `k_wiki_en_outline_of_databases_s7`，同树其它分支，3 孩）；**是** — 「数据库设计」`asplit_s106_db_design`（ref `k_wiki_en_outline_of_databases_s7`，**自己的后代**，5 孩） |
| — | `chapter_db_14` | 十四、数据库分布与复制 | **数据库分布与复制** | 14 | 166 | 否 |
| — | `chapter_db_16` | 十六、数据库安全 | **数据库安全** | 1 | 96 | **是** — 「数据库安全」`tree_wiki_en_outline_of_databases_s4_s6`（ref `k_wiki_en_outline_of_databases_s6`，同树其它分支，4 孩）；**是** — 「数据库安全」`tree_wiki_en_database_s20`（ref `k_wiki_en_database_s20`，**自己的后代**，0 孩） |
| — | `chapter_db_17` | 十七、数据库运维 | **数据库运维** | 27 | 280 | 否 |
| — | `chapter_db_18` | 十八、数据库编程与接口 | **数据库编程与接口** | 65 | 258 | 否 |
| — | `chapter_db_19` | 十九、数据库产品 | **数据库产品** | 44 | 96 | 否 |
| — | `chapter_db_20` | 二十、数据库文件与实现 | **数据库文件与实现** | 40 | 182 | 否 |

## 四、C · 16 个详解/总览壳去后缀归本体（融合可行性）


| treeId | 壳名 | 拟正名 | 壳正文 | 正身 treeId | 正身正文 | 正身子树 | 判定 |
|---|---|---|---:|---|---:|---:|---|
| `tree_vault_javajavaarraylist_an0rm3` | ArrayList 详解 | ArrayList | 17126 | `tree_demo_java_array_list` | 1186 | 0 | **撞名 1 处 → 需融合或分治** |
| `tree_vault_javajavahashmap_14a6f2` | HashMap 详解 | HashMap | 15337 | `tree_1785463930183_6xqdzx` | 7596 | 1 | **撞名 1 处 → 需融合或分治** |
| `tree_vault_javajavahashset_176pvr` | HashSet 详解 | HashSet | 11229 | `tree_1785684483891_xdr40d` | 766 | 0 | **撞名 1 处 → 需融合或分治** |
| `tree_vault_javajava_15bnft` | Java 集合框架总览 | **Java 集合框架** | 20130 | — | — | 0 | 无冲突 → 纯改名 |
| `tree_vault_javajavalinkedlist_1uc0ii` | LinkedList 详解 | LinkedList | 19626 | `tree_1785683698292_nhrf3z` | 254 | 0 | **撞名 1 处 → 需融合或分治** |
| `tree_vault_java_1n4uei` | 线程池详解 | 线程池 | 26047 | `tree_1785415709050_n3rbw5` | 949 | 28 | **撞名 2 处 → 需融合或分治** |
| `tree_1786095193397_uyjgsm` | FutureTask详解 | FutureTask | 845 | `tree_1785918560147_r0lv4e` | 691 | 0 | **撞名 2 处 → 需融合或分治** |
| `tree_1786093347020_15dntb` | ScheduledThreadPoolExecutor详解 | ScheduledThreadPoolExecutor | 221 | `tree_java_source_1a247659a8087e94_s_type_af32be37bc61aea4` | 2091 | 3 | **撞名 1 处 → 需融合或分治** |
| `tree_1786093144146_ajv4cr` | ThreadPoolExecutor详解 | ThreadPoolExecutor | 42791 | `tree_java_source_1a247659a8087e94_s_type_ff6db88dc6746818` | 5104 | 5 | **撞名 2 处 → 需融合或分治** |
| `tree_1786093265279_n5f4vh` | CachedThreadPool详解 | **CachedThreadPool** | 1418 | — | — | 0 | 无冲突 → 纯改名 |
| `tree_1786093175065_78z1xl` | FixedThreadPool详解 | **FixedThreadPool** | 949 | — | — | 0 | 无冲突 → 纯改名 |
| `tree_1786093231555_o69fau` | SingleThreadExecutor详解 | **SingleThreadExecutor** | 669 | — | — | 0 | 无冲突 → 纯改名 |
| `tree_vault_javajava_vzjv8p` | Java 多线程编程入门 | **Java 多线程编程** | 17694 | — | — | 0 | 无冲突 → 纯改名 |
| `tree_vault_javakafkakafka_1qlqb8` | Kafka 定位总览 | Kafka | 2073 | `tree_java_fw_kafka` | 780 | 7 | **撞名 1 处 → 需融合或分治** |
| `tree_vault_javamybatismybatis_14eqlq` | MyBatis 定位总览 | **MyBatis** | 3521 | — | — | 0 | 无冲突 → 纯改名 |
| `tree_vault_javaspringcloudspringcloud_33p5su` | Spring Cloud 定位总览 | Spring Cloud | 1639 | `tree_java_fw_springcloud` | 1025 | 29 | **撞名 1 处 → 需融合或分治** |

## 五、C · 2 个「基础」壳 + 4 个大壳


| treeId | 现名 | 子树 | 正文 | 亲儿子 | 判定 |
|---|---|---:|---:|---:|---|
| `tree_vault_javajava_ii523d` | Java 数据结构基础 | 0 | 7888 | 0 | 需定实名 |
|  |  |  |  |  | 亲儿子： |
| `tree_vault_javajvm01jvm_1h8bru` | JVM 基础 | 0 | 3598 | 0 | 需定实名 |
|  |  |  |  |  | 亲儿子： |
| `tree_java_syntax_zh_1oty7br` | 基础 | 57 | 28 | 6 | 需定实名 |
|  |  |  |  |  | 亲儿子：标识符、字面量、变量、代码块、通用类型、关键字 |
| `tree_1783873300414_0y8oon` | 软件开发（实践总览） | 142 | 55 | 9 | 需定实名 |
|  |  |  |  |  | 亲儿子：控制流、软件开发过程、需求分析、软件构建、软件部署、软件工程、软件维护、编程团队、开源模型 |
| `tree_surge_auto_scale` | 进阶思路：监控驱动动态扩容 | 0 | 445 | 0 | 需定实名 |
|  |  |  |  |  | 亲儿子： |
| `governance:canonical:school_real_world_conventions` | 跨系统标准与约定（总览） | 0 | 23 | 0 | 需定实名 |
|  |  |  |  |  | 亲儿子： |

## 六、预检结论


- 共 **5** 项需注意：

  - ✗ D2 宿主候选不存在：surge_methods（簇 surge_*（流量激增应对方法六步））
  - ✗ D2 宿主候选不存在：hps_design（簇 hps_*（QPS 提升 10 倍的系统设计））
  - ! 章节壳改名撞名：chapter_db_10「十、存储系统」→「存储系统」与 1 处已占用
  - ! 章节壳改名撞名：chapter_db_13「十三、数据库设计」→「数据库设计」与 2 处已占用
  - ! 章节壳改名撞名：chapter_db_16「十六、数据库安全」→「数据库安全」与 2 处已占用
