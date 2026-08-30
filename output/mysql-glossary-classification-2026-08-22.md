# MySQL 词条划分（怎么分 + 306 条逐条归类）
生成：2026-08-22

## 划分方法（怎么判断拆还是留）
对每个 `mysql_glossary_*` 节点，按「定义描述的是不是独立于 MySQL 的概念」分四档：

1. **已拆分**：node-pool 已有对应 `concept_*` 本体，且该 mysql 节点通过 `instance-of` 边回指本体（如 innovation_series / flush / lts / ga / beta）。→ 不动。
2. **强通用候选（建议拆）**：定义描述的是通用 CS/DB 概念，MySQL 只是其一实现。信号：版本管理/发布模型、缓存写回/持久化、优雅关闭/落盘、事务/ACID/隔离、索引/B树、锁/死锁、检查点/redo/undo 日志、复制/集群等——这些在 Postgres/Oracle/OS/文件系统里同构存在。→ 建 `concept_*` 本体（挂中立簇）+ 改造该节点为 MySQL 实例。
3. **MySQL 专属（保留）**：定义绑定 MySQL 特有实现——存储引擎(InnoDB/MyISAM)、mysqld、系统/状态变量、特定 SQL 语法、InnoDB 内部组件(doublewrite/change buffer/buffer pool)、binlog 等。→ 留作 MySQL 节点，不拆。
4. **待判**：信号不明显，需人工读定义定档。

> 注：第 2/3/4 档为**启发式**（按关键词命中），会有漏判/误判，仅供批量筛查起点，最终以你逐条读定义为准。第 1 档由边关系精确判定。

## 统计
| 档位 | 数量 |
|---|---|
| 1 已拆分 | 5 |
| 2 强通用候选 | 142 |
| 3 MySQL 专属 | 22 |
| 4 待判 | 137 |
| 合计 | 306 |

## 1. 已拆分（5）
| label | node id | dimensions |
|---|---|---|
| MySQL Beta / MySQL 测试版 | mysql_glossary_beta_1cp3ef | 发布模型,版本管理,mysql |
| MySQL 刷新 / MySQL flush | mysql_glossary_flush_1dnigf | 缓冲,持久化,存储,mysql |
| MySQL GA / MySQL Generally Available | mysql_glossary_ga_ql2xt1 | 发布模型,版本管理,mysql |
| MySQL 创新系列 / MySQL Innovation Series | mysql_glossary_innovation_series_1rj8dd | 发布模型,版本管理,mysql |
| LTS系列 / LTS Series | mysql_glossary_lts_series_lpbljr |  |

## 2. 强通用候选（142）— 启发式，建议拆
| label | node id | dimensions |
|---|---|---|
| 自适应刷新 / adaptive flushing | mysql_glossary_adaptive_flushing_19588u | transaction,storage,performance |
| 应用 / apply | mysql_glossary_apply_a6xv7f | storage |
| 程序集 / assembly | mysql_glossary_assembly_9y51lx |  |
| 异步I/O / asynchronous I/O | mysql_glossary_asynchronous_i_o_1c6jsd | transaction,storage,performance |
| 原子 / atomic | mysql_glossary_atomic_1jyxbu | transaction |
| 原子DDL / atomic DDL | mysql_glossary_atomic_ddl_l48qcc | storage |
| 原子指令 / atomic instruction | mysql_glossary_atomic_instruction_xxdtb4 |  |
| 自增锁 / auto-increment locking | mysql_glossary_auto_increment_locking_lrps8v | transaction,storage |
| 重启服务 / bounce | mysql_glossary_bounce_e9awxp |  |
| 缓冲池实例 / buffer pool instance | mysql_glossary_buffer_pool_instance_m5jqpe | storage,performance |
| 变更缓冲 / change buffering | mysql_glossary_change_buffering_y1y18j | storage |
| 校验和 / checksum | mysql_glossary_checksum_qnrmvm | storage |
| 干净关闭 / clean shutdown | mysql_glossary_clean_shutdown_1rucqm | storage |
| 客户端库 / client libraries | mysql_glossary_client_libraries_1l6z2y |  |
| 客户端预处理语句 / client-side prepared statement | mysql_glossary_client_side_prepared_statement_1czk27 |  |
| 列索引 / column index | mysql_glossary_column_index_q4bbvv | storage |
| 复合索引 / composite index | mysql_glossary_composite_index_duhrko | storage |
| compressed row format | mysql_glossary_compressed_row_format_11axki | storage,performance |
| 压缩 / compression | mysql_glossary_compression_gbxfjp | storage |
| 连接索引 / concatenated index | mysql_glossary_concatenated_index_zs31t2 | storage |
| 并发 / concurrency | mysql_glossary_concurrency_uoyivs | transaction |
| Connector/ODBC | mysql_glossary_connector_odbc_1qan6g |  |
| 一致性读取 / consistent read | mysql_glossary_consistent_read_gsmmdj | transaction,storage |
| 计数器 / counter | mysql_glossary_counter_17gzh9 | storage,performance |
| CPU密集型 / CPU-bound | mysql_glossary_cpu_bound_1lxhya | storage,performance |
| 崩溃 / crash | mysql_glossary_crash_7aq2mw | storage |
| 崩溃恢复 / crash recovery | mysql_glossary_crash_recovery_139bco | transaction,storage |
| 删除缓冲 / delete buffering | mysql_glossary_delete_buffering_15389r | storage |
| 反规范化 / denormalized | mysql_glossary_denormalized_y8sq0n | storage |
| 降序索引 / descending index | mysql_glossary_descending_index_1j7tn3 | storage |
| 字典对象缓存 / dictionary object cache | mysql_glossary_dictionary_object_cache_1jwkoz | storage,performance |
| 磁盘绑定 / disk-bound | mysql_glossary_disk_bound_1eazx6 | storage |
| 双写缓冲区 / doublewrite buffer | mysql_glossary_doublewrite_buffer_flioi3 | storage |
| 动态游标 / dynamic cursor | mysql_glossary_dynamic_cursor_u1pzzs |  |
| 早期采用者 / early adopter | mysql_glossary_early_adopter_518cax |  |
| 驱逐 / eviction | mysql_glossary_eviction_1b3reo | storage,performance |
| 独占锁 / exclusive lock | mysql_glossary_exclusive_lock_ksqz5a | transaction,storage |
| 快速索引创建 / Fast Index Creation | mysql_glossary_fast_index_creation_ekp3zs | storage |
| 外键约束 / FOREIGN KEY constraint | mysql_glossary_foreign_key_constraint_p6gdbr | storage |
| 模糊检查点 / fuzzy checkpointing | mysql_glossary_fuzzy_checkpointing_1cxy9s | storage,performance |
| GAC | mysql_glossary_gac_1g5bbw |  |
| 间隙 / gap | mysql_glossary_gap_k039an | transaction,storage |
| 间隙锁 / gap lock | mysql_glossary_gap_lock_1gfoi1 | transaction |
| 全局事务 / global transaction | mysql_glossary_global_transaction_4i1f06 | transaction |
| GUID | mysql_glossary_guid_bmsoy4 | storage |
| 历史列表 / history list | mysql_glossary_history_list_16r63i | transaction,storage,performance |
| 热 / hot | mysql_glossary_hot_1yorp3 |  |
| ib-file 集合 / ib-file set | mysql_glossary_ib_file_set_18odgx | transaction,storage |
| ib_logfile 文件 / ib_logfile | mysql_glossary_ib_logfile_1p12fu | transaction,storage |
| ibbackup_logfile | mysql_glossary_ibbackup_logfile_1vewn2 | storage |
| 隐式行锁 / implicit row lock | mysql_glossary_implicit_row_lock_ac6u2d | transaction,storage |
| 索引缓存 / index cache | mysql_glossary_index_cache_dopbb5 | storage,performance |
| 索引条件下推 / index condition pushdown | mysql_glossary_index_condition_pushdown_tudely | storage |
| 索引提示 / index hint | mysql_glossary_index_hint_1nr0pl | storage |
| 索引前缀 / index prefix | mysql_glossary_index_prefix_5c836t | storage |
| 索引统计 / index statistics | mysql_glossary_index_statistics_1ge74j | storage,performance |
| 极小记录 / infimum record | mysql_glossary_infimum_record_1jiz41 |  |
| innodb_autoinc_lock_mode | mysql_glossary_innodb_autoinc_lock_mode_a8q16t | transaction,storage |
| innodb_lock_wait_timeout | mysql_glossary_innodb_lock_wait_timeout_1puppm | transaction,storage |
| 插入缓冲区 / insert buffer | mysql_glossary_insert_buffer_1xx0p8 | storage |
| 插入缓冲 / insert buffering | mysql_glossary_insert_buffering_m9lmge | storage |
| 插入意向锁 / insert intention lock | mysql_glossary_insert_intention_lock_1pnwh6 | transaction,storage |
| 插入 Undo 日志 / Insert Undo Log | mysql_glossary_insert_undo_log_1yrj7c | transaction,storage |
| 意图独占锁 / intention exclusive lock | mysql_glossary_intention_exclusive_lock_1rd4p1 | transaction |
| 意向锁 / intention lock | mysql_glossary_intention_lock_1ejpzi | transaction,storage |
| 意图共享锁 / intention shared lock | mysql_glossary_intention_shared_lock_4x8ciz | transaction |
| 倒排索引 / inverted index | mysql_glossary_inverted_index_spkkuc | storage |
| KEY_BLOCK_SIZE | mysql_glossary_key_block_size_u1i5bm | transaction,storage |
| 锁模式 / lock mode | mysql_glossary_lock_mode_h31or1 | transaction |
| 锁定 / locking | mysql_glossary_locking_1ofljy | transaction |
| 锁定读 / locking read | mysql_glossary_locking_read_16dto0 | transaction,storage |
| 日志组 / log group | mysql_glossary_log_group_1a3bsl | transaction,storage |
| LRU | mysql_glossary_lru_1mxcfz | storage |
| MDL | mysql_glossary_mdl_braceg | transaction,storage |
| 元数据锁 / metadata lock | mysql_glossary_metadata_lock_qiqw4n | transaction,storage |
| 中点插入策略 / midpoint insertion strategy | mysql_glossary_midpoint_insertion_strategy_a74b95 | transaction,storage |
| mini-transaction | mysql_glossary_mini_transaction_ly3edv | transaction,storage |
| 混合模式插入 / mixed-mode insert | mysql_glossary_mixed_mode_insert_1pvj4c | transaction,storage |
| 互斥量 / mutex | mysql_glossary_mutex_6ryres | transaction,storage |
| mysqldump | mysql_glossary_mysqldump_1p1msf | storage |
| 自然键 / natural key | mysql_glossary_natural_key_tddcrt | storage |
| 邻页 / neighbor page | mysql_glossary_neighbor_page_1t6aj7 | storage,performance |
| 非锁定读 / non-locking read | mysql_glossary_non_locking_read_12iidl | transaction |
| 非阻塞 I/O / nonblocking I/O | mysql_glossary_nonblocking_i_o_h65z9a | transaction |
| 规范化 / normalized | mysql_glossary_normalized_4n509k |  |
| NOT NULL 约束 / NOT NULL constraint | mysql_glossary_not_null_constraint_1op7sq |  |
| 乐观 / optimistic | mysql_glossary_optimistic_1gdvw6 | transaction,storage |
| 页面清理器 / page cleaner | mysql_glossary_page_cleaner_20exxg | storage,performance |
| 页大小 / page size | mysql_glossary_page_size_1tjy75 | storage |
| 父级表 / parent table | mysql_glossary_parent_table_yqeba1 | storage |
| 持久统计信息 / persistent statistics | mysql_glossary_persistent_statistics_2n5ydn | storage,performance |
| 悲观 / pessimistic | mysql_glossary_pessimistic_l0bpvy | transaction,storage |
| 计划稳定性 / plan stability | mysql_glossary_plan_stability_70vxat |  |
| 时间点恢复 / point-in-time recovery | mysql_glossary_point_in_time_recovery_eadx3e | storage |
| 预处理语句 / prepared statement | mysql_glossary_prepared_statement_1tfqdw |  |
| 伪记录 / pseudo-record | mysql_glossary_pseudo_record_xtcw23 | transaction,storage |
| Pthreads | mysql_glossary_pthreads_qfb7k4 | storage |
| 清理缓冲 / purge buffering | mysql_glossary_purge_buffering_1ckv1x | storage |
| 清理线程 / purge thread | mysql_glossary_purge_thread_8xnck4 | storage |
| 查询执行计划 / query execution plan | mysql_glossary_query_execution_plan_17fdf4 | storage |
| 静默 / quiesce | mysql_glossary_quiesce_1ujs11 | storage,performance |
| R 树 / R-tree | mysql_glossary_r_tree_1w9375 | storage |
| 只读事务 / read-only transaction | mysql_glossary_read_only_transaction_2kf2kq | transaction,storage,performance |
| 记录锁 / record lock | mysql_glossary_record_lock_1pixn1 | transaction,storage |
| 重做 / redo | mysql_glossary_redo_1vo98z | transaction,storage |
| 重做日志归档 / redo log archiving | mysql_glossary_redo_log_archiving_1ugqxo | transaction,storage |
| 相关性 / relevance | mysql_glossary_relevance_1schdd | transaction,storage |
| 回滚段 / rollback segment | mysql_glossary_rollback_segment_40xjnc | transaction,storage |
| 基于行的复制 / row-based replication | mysql_glossary_row_based_replication_uiayeb | transaction,storage |
| 读写锁 / rw-lock | mysql_glossary_rw_lock_1c4qu9 | transaction,storage,performance |
| 可伸缩性 / scalability | mysql_glossary_scalability_d5afjw |  |
| 搜索索引 / search index | mysql_glossary_search_index_18jlmz | storage |
| 段 / segment | mysql_glossary_segment_1vmvly | transaction,storage |
| 选择性 / selectivity | mysql_glossary_selectivity_4k9ksu | storage,performance |
| 半一致性读取 / semi-consistent read | mysql_glossary_semi_consistent_read_luof7q | transaction,storage |
| 服务器端预处理语句 / server-side prepared statement | mysql_glossary_server_side_prepared_statement_1g5uc6 |  |
| 尖锐检查点 / sharp checkpoint | mysql_glossary_sharp_checkpoint_1tnux9 | transaction,storage,performance |
| 缓慢关闭 / slow shutdown | mysql_glossary_slow_shutdown_1tqzdr | storage |
| 排序缓冲区 / sort buffer | mysql_glossary_sort_buffer_1x3j60 | storage |
| 自旋 / spin | mysql_glossary_spin_2ipmhl | transaction |
| 启动 / startup | mysql_glossary_startup_154aqa |  |
| 基于语句的复制 / statement-based replication | mysql_glossary_statement_based_replication_xyynye | transaction,storage |
| 词干提取 / stemming | mysql_glossary_stemming_w8xwzt | storage |
| 存储生成列 / stored generated column | mysql_glossary_stored_generated_column_j7jiqj |  |
| 子列表 / sublist | mysql_glossary_sublist_12kt6o | storage,performance |
| 上确界记录 / supremum record | mysql_glossary_supremum_record_1pbwmi |  |
| 合成键 / synthetic key | mysql_glossary_synthetic_key_1drbjs |  |
| 表锁 / table lock | mysql_glossary_table_lock_15y9vl | transaction,storage |
| TPS | mysql_glossary_tps_ej1ya6 | transaction |
| 事务 ID / transaction ID | mysql_glossary_transaction_id_1aa5a7 | transaction,storage |
| 可传输表空间 / transportable tablespace | mysql_glossary_transportable_tablespace_1685qd | storage,performance |
| 撤销缓冲区 / undo buffer | mysql_glossary_undo_buffer_jg11o3 | transaction,storage |
| 撤销日志段 / undo log segment | mysql_glossary_undo_log_segment_pbdi2c | transaction,storage |
| 撤销表空间 / undo tablespace | mysql_glossary_undo_tablespace_so71lf | transaction,storage |
| 唯一约束 / unique constraint | mysql_glossary_unique_constraint_cvzep | storage |
| 更新 Undo 日志 / Update Undo Log | mysql_glossary_update_undo_log_yphxzo | transaction,storage |
| 受害者 / victim | mysql_glossary_victim_18xqeg | transaction,storage |
| 虚拟生成列 / virtual generated column | mysql_glossary_virtual_generated_column_1smsm1 | storage |
| 虚拟索引 / virtual index | mysql_glossary_virtual_index_sm95n4 | storage |
| 等待 / wait | mysql_glossary_wait_1229eo | transaction,storage,performance |
| 写入合并 / write combining | mysql_glossary_write_combining_154ozi | storage,performance |
| 年轻页 / young | mysql_glossary_young_ohocw3 | storage,performance |

## 3. MySQL 专属（22）— 启发式，建议保留
| label | node id | dimensions |
|---|---|---|
| 紧凑行格式 / compact row format | mysql_glossary_compact_row_format_16fa2a | storage |
| compressed table | mysql_glossary_compressed_table_zx6vsg | storage |
| 基于磁盘 / disk-based | mysql_glossary_disk_based_15w8id | storage,performance |
| 区段 / extent | mysql_glossary_extent_16v5kw | storage |
| 文件格式 / file format | mysql_glossary_file_format_199bjh | storage |
| 固定行格式 / fixed row format | mysql_glossary_fixed_row_format_ti21b0 | storage |
| 通用表空间 / general tablespace | mysql_glossary_general_tablespace_300irr | storage |
| 打孔 / hole punching | mysql_glossary_hole_punching_r6u429 | storage |
| innodb_file_per_table | mysql_glossary_innodb_file_per_table_1w525y | storage |
| 内在临时表 / intrinsic temporary table | mysql_glossary_intrinsic_temporary_table_1sl3hr | storage,performance |
| libmysqld | mysql_glossary_libmysqld_rpbwgq |  |
| mysqld | mysql_glossary_mysqld_q7qv17 |  |
| MySQLdb | mysql_glossary_mysqldb_1k0vb5 |  |
| 选项 / option | mysql_glossary_option_1sc73x | storage |
| 清理延迟 / purge lag | mysql_glossary_purge_lag_1p6pyp | storage,performance |
| 预读 / read-ahead | mysql_glossary_read_ahead_1khyqr | storage,performance |
| 共享表空间 / shared tablespace | mysql_glossary_shared_tablespace_1q68ln | storage |
| 空间 ID / space ID | mysql_glossary_space_id_1kjxje | storage,performance |
| 停用词 / stopword | mysql_glossary_stopword_ztgqhp | storage |
| 严格模式 / strict mode | mysql_glossary_strict_mode_y6y4gv | storage |
| 撕裂页 / torn page | mysql_glossary_torn_page_1kprbq | storage |
| 透明页压缩 / transparent page compression | mysql_glossary_transparent_page_compression_j4ufzm | storage |

## 4. 待判（137）— 需逐条读定义
| label | node id | dimensions |
|---|---|---|
| ADO.NET | mysql_glossary_ado_net_ieyqc |  |
| API | mysql_glossary_api_y14yjr |  |
| 应用程序编程接口（API） / application programming interface (API) | mysql_glossary_application_programming_interface_api_73cc6c |  |
| .ARM文件 / .ARM file | mysql_glossary_arm_file_ufam2l | storage |
| .ARZ文件 / .ARZ file | mysql_glossary_arz_file_1iyj60 | storage |
| AS | mysql_glossary_as_h5mr7x | security |
| ASP.net | mysql_glossary_asp_net_lyjnke |  |
| 认证服务器 / authentication server | mysql_glossary_authentication_server_1njohk | security |
| 可用性 / availability | mysql_glossary_availability_o9h2qe |  |
| 反引号 / backticks | mysql_glossary_backticks_5z2ws |  |
| 基础列 / base column | mysql_glossary_base_column_jjprw2 |  |
| 盲查询扩展 / blind query expansion | mysql_glossary_blind_query_expansion_17xip3 |  |
| BLOB | mysql_glossary_blob_lhrk4q |  |
| 瓶颈 / bottleneck | mysql_glossary_bottleneck_ehdgmu | storage,performance |
| 内置 / built-in | mysql_glossary_built_in_1x46sj | storage |
| C API | mysql_glossary_c_api_1wuwxq |  |
| .cfg 文件 / .cfg file | mysql_glossary_cfg_file_1wfa77 | storage,performance |
| 子表 / child table | mysql_glossary_child_table_1l6dvq | storage |
| Mysql客户端 | mysql_glossary_client_13u3vh |  |
| CLOB | mysql_glossary_clob_kn7shj |  |
| 列前缀 / column prefix | mysql_glossary_column_prefix_15o687 | storage |
| 命令拦截器 / command interceptor | mysql_glossary_command_interceptor_1f58ii |  |
| 压缩备份 / compressed backup | mysql_glossary_compressed_backup_12f16e | storage |
| 压缩失败 / compression failure | mysql_glossary_compression_failure_8kmcfr | storage |
| 连接 / connection | mysql_glossary_connection_fqlzvd |  |
| 连接字符串 / connection string | mysql_glossary_connection_string_1hyrot |  |
| Connector/C++ | mysql_glossary_connector_c_rs92y0 |  |
| 连接器 / connector | mysql_glossary_connector_ijze9c |  |
| Connector/J | mysql_glossary_connector_j_avxtph |  |
| Connector/NET | mysql_glossary_connector_net_1h05w3 |  |
| Connector/PHP | mysql_glossary_connector_php_1rej45 |  |
| CRUD | mysql_glossary_crud_1ihm43 |  |
| 数据目录 / data directory | mysql_glossary_data_directory_zrepzq | storage |
| 文档 ID / document id | mysql_glossary_document_id_mwd5w1 | storage |
| 动态行格式 / dynamic row format | mysql_glossary_dynamic_row_format_1pdso5 | storage,performance |
| 动态语句 / dynamic statement | mysql_glossary_dynamic_statement_1evhmv |  |
| 埃菲尔 / Eiffel | mysql_glossary_eiffel_75vlru |  |
| 嵌入式 Mysql | mysql_glossary_embedded_yxsdnj |  |
| 异常拦截器 / exception interceptor | mysql_glossary_exception_interceptor_nqrl4t |  |
| 每表一个文件 / file-per-table | mysql_glossary_file_per_table_c2gueo | storage |
| 全文本搜索 / FTS | mysql_glossary_fts_1x0dll | storage |
| 完整备份 / full backup | mysql_glossary_full_backup_1pi94c | storage |
| 全文搜索 / full-text search | mysql_glossary_full_text_search_16dcha | storage |
| 生成的存储列 / generated stored column | mysql_glossary_generated_stored_column_1nr7fq |  |
| MySQL 总览与体系结构 | mysql_glossary_group_architecture | storage |
| 补充与其他概念 | mysql_glossary_group_misc | storage |
| HDD | mysql_glossary_hdd_eb2rxz |  |
| 心跳 / heartbeat | mysql_glossary_heartbeat_1aiai3 |  |
| 高水位线 / high-water mark | mysql_glossary_high_water_mark_1g6jcp |  |
| 主机 / host | mysql_glossary_host_1ctymw |  |
| I/O 绑定 / I/O-bound | mysql_glossary_i_o_bound_9k72or |  |
| ibtmp 文件 / ibtmp file | mysql_glossary_ibtmp_file_18e04h | storage |
| .ibz 文件 / .ibz file | mysql_glossary_ibz_file_tz3hbm | storage |
| ilist | mysql_glossary_ilist_16p50m | storage |
| 增量备份 / incremental backup | mysql_glossary_incremental_backup_3gko1n | storage |
| 仪器仪表 / instrumentation | mysql_glossary_instrumentation_1v9bxz | performance |
| IOPS | mysql_glossary_iops_1go6rk |  |
| Java | mysql_glossary_java_uspy11 |  |
| JDBC | mysql_glossary_jdbc_14hlls | storage |
| 密钥分发中心 / key distribution center | mysql_glossary_key_distribution_center_fhraw7 | security |
| 密钥库 / keystore | mysql_glossary_keystore_1khbxb | security |
| libmysql | mysql_glossary_libmysql_d5nkre |  |
| libmysqlclient | mysql_glossary_libmysqlclient_1ofbnd |  |
| 列表 / list | mysql_glossary_list_3lo6m9 | storage,performance |
| 负载均衡 / load balancing | mysql_glossary_load_balancing_ee4rhm |  |
| loose_ | mysql_glossary_loose_tt5csa | storage |
| 低水位线 / low-water mark | mysql_glossary_low_water_mark_b3ceyk |  |
| master | mysql_glossary_master_1k7935 |  |
| 主线程 / master thread | mysql_glossary_master_thread_11thmi | storage,performance |
| 中等信任 / medium trust | mysql_glossary_medium_trust_113pv6 |  |
| 指标计数器 / metrics counter | mysql_glossary_metrics_counter_1tynuw | storage,performance |
| MM.MySQL | mysql_glossary_mm_mysql_45ec9v |  |
| Mono | mysql_glossary_mono_oszvd6 |  |
| .MRG 文件 / .MRG file | mysql_glossary_mrg_file_2synx7 | storage |
| 多核 / multi-core | mysql_glossary_multi_core_1ks4nn |  |
| my.cnf | mysql_glossary_my_cnf_v2use8 | storage |
| my.ini | mysql_glossary_my_ini_1giw6m | storage |
| MyODBC 驱动程序 / MyODBC drivers | mysql_glossary_myodbc_drivers_g6kz24 |  |
| MySQL 企业备份 / MySQL Enterprise Backup | mysql_glossary_mysql_enterprise_backup_bh86yi | storage |
| mysqlbackup 命令 / mysqlbackup command | mysql_glossary_mysqlbackup_command_1gjf0a | storage |
| mysqlclient | mysql_glossary_mysqlclient_1fp9hd |  |
| 本地 C API / native C API | mysql_glossary_native_c_api_19tz94 |  |
| .NET | mysql_glossary_net_1q25ey |  |
| 离页列 / off-page column | mysql_glossary_off_page_column_i7tqi8 | storage |
| 在线 / online | mysql_glossary_online_13svqm | storage |
| .OPT 文件 / .OPT file | mysql_glossary_opt_file_1w9809 | storage |
| 选项文件 / option file | mysql_glossary_option_file_gsqytm | storage |
| 溢出页 / overflow page | mysql_glossary_overflow_page_1x8lkk | storage |
| .par 文件 / .par file | mysql_glossary_par_file_rzlrrm | storage |
| 部分备份 / partial backup | mysql_glossary_partial_backup_bplu20 | storage |
| 部分信任 / partial trust | mysql_glossary_partial_trust_rcrlto |  |
| Perl | mysql_glossary_perl_6buxo8 |  |
| Perl API | mysql_glossary_perl_api_knrawo |  |
| PHP API | mysql_glossary_php_api_1ldhpf |  |
| 物理 / physical | mysql_glossary_physical_117gzf | storage |
| 物理备份 / physical backup | mysql_glossary_physical_backup_1o7b7v | storage |
| 准备好的备份 / prepared backup | mysql_glossary_prepared_backup_19htae | storage |
| 主体 / principal | mysql_glossary_principal_1llz4f | security |
| Python API | mysql_glossary_python_api_2amn13 |  |
| 随机探查 / random dive | mysql_glossary_random_dive_1sbv22 | storage |
| 原始备份 / raw backup | mysql_glossary_raw_backup_1s82jm | storage |
| 读现象 / read phenomena | mysql_glossary_read_phenomena_n0vs4m | storage |
| 冗余行格式 / redundant row format | mysql_glossary_redundant_row_format_kd9bbp | storage |
| 关系型 / relational | mysql_glossary_relational_1yoaip | storage |
| 字符集集合 / repertoire | mysql_glossary_repertoire_jo0oic |  |
| 副本 / replica | mysql_glossary_replica_7pskdj |  |
| Ruby | mysql_glossary_ruby_17cue0 |  |
| Ruby API | mysql_glossary_ruby_api_1c5kjx |  |
| 向外扩展 / scale out | mysql_glossary_scale_out_1fhx7h |  |
| 向上扩展 / scale up | mysql_glossary_scale_up_1y6pkm | storage |
| SDI | mysql_glossary_sdi_8vlmf5 |  |
| 序列化字典信息 (SDI) / serialized dictionary information (SDI) | mysql_glossary_serialized_dictionary_information_sdi_1ee69u | storage |
| 服务主体名称 / service principal name | mysql_glossary_service_principal_name_4syyjd | security |
| 服务票据 / service ticket | mysql_glossary_service_ticket_oqmgfc | security |
| servlet | mysql_glossary_servlet_12jp4v |  |
| 源 / source | mysql_glossary_source_7ps15k |  |
| 稀疏文件 / sparse file | mysql_glossary_sparse_file_1cutkz | storage |
| 服务主名称 / SPN | mysql_glossary_spn_qxzu3s | security |
| SQLState | mysql_glossary_sqlstate_16aqrw |  |
| SSD | mysql_glossary_ssd_gyazmt |  |
| 语句拦截器 / statement interceptor | mysql_glossary_statement_interceptor_1d641l |  |
| 存储对象 / stored object | mysql_glossary_stored_object_od8fkh |  |
| 存储程序 / stored program | mysql_glossary_stored_program_mzfpca |  |
| 存储例程 / stored routine | mysql_glossary_stored_routine_kiddr6 |  |
| 表统计信息 / table statistics | mysql_glossary_table_statistics_1c30y8 | storage,performance |
| 表类型 / table type | mysql_glossary_table_type_1wu89y | storage |
| Tcl | mysql_glossary_tcl_1yc19t |  |
| 文本集合 / text collection | mysql_glossary_text_collection_1180cq | storage |
| 票证授予服务器 / ticket-granting server | mysql_glossary_ticket_granting_server_1cuy2c | security |
| 票证授予票证 / ticket-granting ticket | mysql_glossary_ticket_granting_ticket_14xqfb | security |
| Tomcat | mysql_glossary_tomcat_10qwey | storage |
| 故障排除 / troubleshooting | mysql_glossary_troubleshooting_1zw5wx | storage,security |
| 信任库 / truststore | mysql_glossary_truststore_rgbyfy | security |
| Unicode | mysql_glossary_unicode_fwfjuo |  |
| 用户主体名称 / user principal name | mysql_glossary_user_principal_name_daz6wj | security |
| 可变长度类型 / variable-length type | mysql_glossary_variable_length_type_1satcr | storage |
| 温备份 / warm backup | mysql_glossary_warm_backup_1sjsyn |  |

## 附：已建立的 concept_* 本体（6）
| label | node id |
|---|---|
| 创新系列 / Innovation Series | concept_innovation_series |
| 发布与版本模型 / Release & Versioning Model | concept_release_model |
| LTS系列 / LTS Series | concept_lts_series |
| GA / Generally Available | concept_ga |
| Beta / 测试版 | concept_beta |
| 刷新 / flush | concept_flush |