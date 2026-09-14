# T3 · 映射复核清单（人工裁决）

> **只读批次产物** —— 本清单不产生任何数据变化。T3 范围严格冻结为 `asplit_*` **133 项**；其余命名族（约 1521 条非语义 id）**另开批次，不在此扩范围**。

生成时间：2026-09-14T13:19:10.077Z

## 裁决规则（`semanticAncestorGap` 即冻结闸门）

| gap | 层级 | 处置 |
|---|---|---|
| `= 0` | HIGH | 可自动接受（92 条，不在本清单内） |
| `1..3` | MEDIUM | **逐条人工确认**：命名空间是否恰当 + slug 拼写 |
| `> 3` | LOW / BLOCK | **不允许自动生成**：须人工给名，或另裁处置（改名 / 留在原地 / 降级为其它 id 族） |

## 〇、前置依赖（决定 BLOCK 是否能批量解除）

BLOCK 的 3 条，按「最近的**伪语义祖先**」分组 —— 即有 0 个**非语义形态**祖先节点挡在中间：

| # | 祖先 treeId（时间戳+hash） | 祖先 name | 阻塞子项数 | 子项 |
|---|---|---|---:|---|

> **含义**：这 0 条 BLOCK 之所以无法命名，根因是**它们的命名空间祖先自己还没被语义化**（祖先 id 形如 `tree_<时间戳>_<hash>`）。命名空间本身是清晰可读的（见上表 name 列）。


**这不是「扩大 T3 范围」**：T3 仍然只管 `asplit_*` 133 项，只是识别出一个**有界前置依赖** —— 先给这 0 个祖先定名（它们属「1521 非语义 id」族，但只需这一小簇），随后这些子项自动降为 `gap=0`、可批量处理。


### 前置依赖已独立成批（**不要在 T3 里顺手做**）

用户 2026-09-14 裁决（选 A）：这 0 个祖先的命名必须作为**独立的前置小批次**完成 dry-run / review / apply，
**不能由本脚本的子节点算法隐式把它们当成已经完成** —— 因为父节点改名会改变子项 `semanticAncestorGap` 的**判定依据**
（语义祖先从远祖变成父节点本身），若隐式假定，T3 的冻结读数就建立在未落盘的假设之上。

| 项 | 值 |
|---|---|
| 批次 | `t3-p0`（`batch-manifests/t3-p0.json`） |
| 命名提案（人工裁决） | `outputs/tree-violation-scan/t3-p0-naming.proposal.json` |
| 复核清单 | `outputs/tree-violation-scan/t3-p0-review.md` |
| dry-run 脚本 | `node scripts/dryrun-t3-p0-ancestors-semanticization.mjs` |

> 本清单（`t3-mapping-review.md`）**不含**那 0 条 BLOCK 的裁决 —— 它们的裁决在 `t3-p0-review.md`。
> T3-P0 apply 之后重跑本脚本，本节的分组应随之消失，读数应为 HIGH 92 / MEDIUM 38 / BLOCK 3。


其余 3 条 **无伪祖先**（父节点是 `projection:*` / 冒号命名族，如 MySQL 服务层）：备份恢复工具 / 安全管理工具 / 集群管理工具 —— 需另行裁决命名空间来源。


## 一、BLOCK（gap > 3）—— 3 条，机器**拒绝**给名

| # | 旧 treeId | name | 路径（父级） | 父节点 | gap | 语义祖先 | 候选 A | 候选 B | 裁决 |

|---|---|---|---|---|---:|---|---|---|---|
| 1 | `asplit_s2_asplit_mysql_tool_backup` | 备份恢复工具 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库产品 > MySQL > MySQL Server > 结构 > 服务层 | 服务层 | **6** | `tree_acm2012_information_systems_database_management` | `tree_acm2012_information_systems_database_management_mysql_tool_backup` | `tree_acm2012_information_systems_database_mysql_tool_backup` | ☐ 给名 ☐ 留原地 ☐ 另裁 |
| 2 | `asplit_s2_asplit_mysql_tool_security` | 安全管理工具 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库产品 > MySQL > MySQL Server > 结构 > 服务层 | 服务层 | **6** | `tree_acm2012_information_systems_database_management` | `tree_acm2012_information_systems_database_management_mysql_tool_security` | `tree_acm2012_information_systems_database_mysql_tool_security` | ☐ 给名 ☐ 留原地 ☐ 另裁 |
| 3 | `asplit_s2_asplit_mysql_tool_cluster` | 集群管理工具 | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据库产品 > MySQL > MySQL Server > 结构 > 服务层 | 服务层 | **6** | `tree_acm2012_information_systems_database_management` | `tree_acm2012_information_systems_database_management_mysql_tool_cluster` | `tree_acm2012_information_systems_database_mysql_tool_cluster` | ☐ 给名 ☐ 留原地 ☐ 另裁 |

> 为什么 BLOCK：这几条的语义祖先与父节点相隔 ≥4 层，中间全是 hash / 段位 id。命名空间若照抄那个远祖，会把**上层语义向下继承**到一条本不属于它的枝上。机器不代猜。

## 二、MEDIUM（gap 1..3）—— 38 条，须逐条确认

| # | 旧 treeId | name | 父节点 | gap | 建议新 treeId | 语义祖先 | 确认 |

|---|---|---|---|---:|---|---|---|
| 1 | `asplit_s19_juc_tools` | JUC 工具 | java并发编程 · `tree_1782846767208_uw6zxc` | 2 | `tree_acm2012_software_notations_tools_programming_juc_tools` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 2 | `asplit_s1_asplit_lazy_init` | 延迟初始化 | java并发编程 · `tree_1782846767208_uw6zxc` | 2 | `tree_acm2012_software_notations_tools_programming_lazy_init` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 3 | `asplit_s1_asplit_concurrency_container` | 并发容器 | java并发编程 · `tree_1782846767208_uw6zxc` | 2 | `tree_acm2012_software_notations_tools_programming_concurrency_container` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 4 | `asplit_s18_asplit_memory_atomicity` | 内存原子性 | java并发编程 · `tree_1782846767208_uw6zxc` | 2 | `tree_acm2012_software_notations_tools_programming_memory_atomicity` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 5 | `asplit_s18_asplit_concurrency_mutex_lock` | 并发互斥锁 | java并发编程 · `tree_1782846767208_uw6zxc` | 2 | `tree_acm2012_software_notations_tools_programming_concurrency_mutex_lock` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 6 | `asplit_s1_asplit_suspend_resume_methods` | suspend/resume 方法组 | 线程的状态 · `tree_1785934396723_afsojh` | 3 | `tree_acm2012_software_notations_tools_programming_suspend_resume_methods` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 7 | `asplit_s1_asplit_stop_method` | stop 方法 | 线程的状态 · `tree_1785934396723_afsojh` | 3 | `tree_acm2012_software_notations_tools_programming_stop_method` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 8 | `asplit_s1_asplit_java_class` | Java 类 | Java syntax · `tree_1783867183132_g5tf12` | 2 | `tree_acm2012_software_notations_tools_programming_java_class` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 9 | `asplit_s1_asplit_blocking_io_model` | 阻塞 I/O（BIO 模型） | java · `tree_1782746457614_osttpr` | 1 | `tree_acm2012_software_notations_tools_programming_blocking_io_model` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 10 | `asplit_s1_asplit_nonblocking_io_model` | 非阻塞 I/O（NIO 模型） | java · `tree_1782746457614_osttpr` | 1 | `tree_acm2012_software_notations_tools_programming_nonblocking_io_model` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 11 | `asplit_s1_asplit_lexical_analysis` | 词法分析 | 编程语言理论 · `tree_1784820871692_uel7rq` | 1 | `tree_acm2012_software_notations_tools_programming_lexical_analysis` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 12 | `asplit_s1_asplit_syntax_analysis` | 语法分析 | 编程语言理论 · `tree_1784820871692_uel7rq` | 1 | `tree_acm2012_software_notations_tools_programming_syntax_analysis` | `tree_acm2012_software_notations_tools_programming_languages` | ☐ 通过 ☐ 改名 |
| 13 | `asplit_s1_asplit_single_pass_compiler` | 单遍编译器 | 编译器构建 · `tree_wiki_en_compiler_s3` | 1 | `tree_wiki_en_single_pass_compiler` | `tree_wiki_en_compiler` | ☐ 通过 ☐ 改名 |
| 14 | `asplit_s1_asplit_multi_pass_compiler` | 多遍编译器 | 编译器构建 · `tree_wiki_en_compiler_s3` | 1 | `tree_wiki_en_multi_pass_compiler` | `tree_wiki_en_compiler` | ☐ 通过 ☐ 改名 |
| 15 | `asplit_s1_asplit_bean_lifecycle` | Bean 生命周期 | 生命周期 · `tree_1785225243163_ypgo3y` | 2 | `tree_java_fw_bean_lifecycle` | `tree_java_fw_spring` | ☐ 通过 ☐ 改名 |
| 16 | `asplit_s1_asplit_newsql` | NewSQL | 历史 · `tree_wiki_en_database_s2` | 3 | `tree_acm2012_information_systems_database_newsql` | `tree_acm2012_information_systems_database_management` | ☐ 通过 ☐ 改名 |
| 17 | `asplit_s106_db_modeling` | 数据库建模 | 数据库设计 · `chapter_db_13` | 2 | `tree_acm2012_information_systems_database_db_modeling` | `tree_acm2012_information_systems_database_management` | ☐ 通过 ☐ 改名 |
| 18 | `asplit_s1_asplit_module_export` | 模块导出 | React · `react_root` | 2 | `tree_acm2012_information_systems_world_wide_module_export` | `tree_acm2012_information_systems_world_wide_web` | ☐ 通过 ☐ 改名 |
| 19 | `asplit_s1_asplit_module_import` | 模块导入 | React · `react_root` | 2 | `tree_acm2012_information_systems_world_wide_module_import` | `tree_acm2012_information_systems_world_wide_web` | ☐ 通过 ☐ 改名 |
| 20 | `asplit_s1_asplit_js_control_flow` | 控制流 | React · `react_root` | 2 | `tree_acm2012_information_systems_world_wide_js_control_flow` | `tree_acm2012_information_systems_world_wide_web` | ☐ 通过 ☐ 改名 |
| 21 | `asplit_s1_asplit_function_design` | 函数设计 | React · `react_root` | 2 | `tree_acm2012_information_systems_world_wide_function_design` | `tree_acm2012_information_systems_world_wide_web` | ☐ 通过 ☐ 改名 |
| 22 | `asplit_s1_asplit_js_expression` | 表达式 | React · `react_root` | 2 | `tree_acm2012_information_systems_world_wide_js_expression` | `tree_acm2012_information_systems_world_wide_web` | ☐ 通过 ☐ 改名 |
| 23 | `asplit_s1_asplit_graph_search` | 图搜索算法 | 数据结构 · `theory_domain_data_structures` | 1 | `tree_acm2012_graph_search` | `tree_acm2012_algorithms` | ☐ 通过 ☐ 改名 |
| 24 | `asplit_s2_asplit_obj_trigger_new` | new 指令触发对象创建 | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_trigger_new` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 25 | `asplit_s2_asplit_obj_state_class_loaded` | 类型加载校验 | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_state_class_loaded` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 26 | `asplit_s2_asplit_obj_state_alloc` | 分配内存 | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_state_alloc` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 27 | `asplit_s2_asplit_obj_state_zerofill` | 零值填充 | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_state_zerofill` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 28 | `asplit_s2_asplit_obj_state_set_header` | 设置对象头 | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_state_set_header` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 29 | `asplit_s2_asplit_obj_state_init` | 执行构造方法 | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_state_init` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 30 | `asplit_s2_asplit_obj_state_reference` | 引用定位（对象可用） | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_state_reference` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 31 | `asplit_s2_asplit_obj_alloc_tlab` | TLAB（线程本地分配缓冲） | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_alloc_tlab` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 32 | `asplit_s2_asplit_obj_access_handle` | 句柄访问 | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_access_handle` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 33 | `asplit_s2_asplit_obj_access_direct` | 直接指针 | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_access_direct` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 34 | `asplit_s2_asplit_obj_state_oom` | 内存溢出（OutOfMemoryError） | 内存管理 · `tree_1783263380057_57s6hh` | 2 | `tree_acm2012_systems_obj_state_oom` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 35 | `asplit_s1_asplit_blocking_io` | 阻塞非阻塞 I/O | 操作系统 · `theory_domain_operating_systems` | 1 | `tree_acm2012_systems_blocking_io` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 36 | `asplit_s1_asplit_sync_async_io` | 同步异步 I/O | 操作系统 · `theory_domain_operating_systems` | 1 | `tree_acm2012_systems_sync_async_io` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 37 | `asplit_s132_base_theory` | BASE理论 | 分布式系统 · `theory_domain_distributed_systems` | 1 | `tree_acm2012_systems_k_1783170416767_yaym2f` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |
| 38 | `asplit_s134_db_sharding` | 分库 | 分布式系统 · `theory_domain_distributed_systems` | 1 | `tree_acm2012_systems_db_sharding` | `tree_acm2012_systems_organization` | ☐ 通过 ☐ 改名 |

> 共性：父节点是**无语义容器**（hash 型 mount identity），命名空间取自更上层语义祖先。要求「命名空间必须来自直接父节点」会把合法的树结构信息丢掉，故允许借用；但借用是否恰当需人判 —— 这 38 条不接受自动冻结。

## 三、冻结的前置条件

```text
上述 3 条 BLOCK 全部给出处置
+ 上述 38 条 MEDIUM 全部 approved
+ status 无 pending / needs-review / blocked 残留
→ frozenMappingProducible = true（当前 false）
→ 才可进入 apply
```
