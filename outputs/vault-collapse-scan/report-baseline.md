# 全库塌行双份 / 指针残留扫描（修复前基线）

- 扫描时间：2026-09-23T11:05:07.555Z
- 池规模：3870 节点
- 命中卡数：1260
- 分信号计数：dual-copy=751 / title-prefix=770 / ptr=368 / broken-bold=9 / glued-code=2 / glued-table=1

| 实体 | 标签 | root 字数 | tabs | 信号 |
|---|---|---|---|---|
| demo_isolation | 隔离级别 / isolation level | 396 | def | dual-copy title-prefix |
| demo_mvcc | MySQL 多版本并发控制 | 1212 | def | dual-copy title-prefix |
| demo_undo | MySQL 撤销日志 / undo log | 368 | def | dual-copy |
| demo_snapshot | 快照读 | 201 | def | dual-copy |
| demo_lock | MySQL 锁机制 | 204 | def | dual-copy ptr:见子节点 |
| demo_deadlock | MySQL 死锁检测 / deadlock detection | 87 | def | dual-copy |
| demo_row_lock | MySQL 行锁 / row lock | 503 | def | dual-copy |
| demo_optimistic | MySQL 乐观锁 / optimistic lock | 576 | def | dual-copy title-prefix |
| demo_pessimistic | MySQL 悲观锁 / pessimistic lock | 264 | def | dual-copy title-prefix |
| demo_btree | MySQL B+树索引 | 161 | def | dual-copy ptr:见子节点 |
| demo_hash | MySQL 哈希索引 / hash index | 220 | def | dual-copy |
| demo_clustered_index | MySQL 聚簇索引 / clustered index | 579 | def | dual-copy ptr:参见 |
| demo_secondary_index | MySQL 二级索引 / secondary index | 1066 | def,cmp,struct | title-prefix |
| demo_covering_index | MySQL 覆盖索引 / covering index | 690 | def | ptr:参见 |
| demo_composite_index | MySQL 组合索引 | 189 | def | dual-copy |
| demo_innodb | MySQL InnoDB | 1181 | def | dual-copy ptr:参见 |
| demo_buffer | 缓冲池 / buffer pool | 964 | def | dual-copy ptr:参见 |
| demo_join | MySQL JOIN 连接 | 170 | def | dual-copy ptr:见子节点 |
| n_0xxb9cqy | MySQL 索引 | 389 | def,ontology | ptr:见子节点 |
| n_s7t5dbya | 性能优化 | 196 | def | dual-copy title-prefix ptr:见子节点 |
| n_u4va719e | 数据库 | 15133 | def,tab_1784720749500_8pn2p9,tab_1784720784603_66hyae,tab_1784720827171_qe7c3i,tab_1784720854879_1dika6,tab_1784720888790_t9v3yy,tab_1784819709273_foapr9,sec_1,sec_2,sec_10,sec_11,sec_12,sec_13,sec_15,sec_16,sec_20,sec_21,sec_22,sec_23,sec_24,sec_25,sec_26,sec_27,sec_30,links | title-prefix ptr:参见 |
| n_55jiel25 | 计算机科学 | 74 | — | title-prefix |
| k_1781002610469_nik1ek | 页 / page | 1040 | def | dual-copy ptr:另见 |
| k_auto_yb9yyu | MySQL 普通索引 | 259 | def | dual-copy |
| k_auto_es1cgt | MySQL 前缀索引 | 205 | def | dual-copy |
| k_dict_4yz2io0y | MySQL 自适应哈希 / adaptive hash index | 437 | def | dual-copy |
| k_dict_ij1x57s1 | ANSI | 377 | def | dual-copy ptr:参见 |
| k_dict_rszan9vp | 自增 / auto-increment | 635 | def | dual-copy title-prefix |
| k_dict_cx2nh25x | B树 / B-tree | 0 | def | ptr:另见 |
| k_dict_vg1hm4yv | MySQL 备份 / backup | 332 | def | dual-copy |
| k_dict_c9sxzvqt | MySQL 不可重复读 / non-repeatable read | 282 | def | dual-copy title-prefix |
| k_dict_n9s627ij | MySQL 基数 / cardinality | 444 | def | dual-copy |
| k_dict_t52tzaq2 | MySQL 检查点 / checkpoint | 175 | def | dual-copy ptr:参见 |
| k_dict_h20fqa9t | MySQL 连接池 / connection pool | 198 | def | dual-copy |
| k_dict_1a3p1hdq | MySQL 参照完整性 / referential integrity | 222 | def | dual-copy |
| k_dict_hlduom8b | 查询缓存 | 142 | def | dual-copy title-prefix |
| k_dict_nsqweksd | MySQL 数据字典 / data dictionary | 332 | def | dual-copy |
| k_dict_o5254svl | 数据仓库 / data warehouse | 104 | def | dual-copy |
| k_dict_7w36vehk | 数据控制语言 / DCL | 78 | def | dual-copy title-prefix |
| k_dict_73wtge24 | 数据定义语言 / DDL | 378 | def | dual-copy title-prefix ptr:参见 |
| k_dict_mq68vpwg | MySQL 死锁 / deadlock | 63 | def | dual-copy |
| k_dict_qvf5c9q7 | MySQL 删除 / delete | 151 | def | dual-copy |
| k_dict_rjl6lkaz | MySQL 脏页 / dirty page | 528 | def | dual-copy ptr:另见 |
| k_dict_t83fdwoc | MySQL 脏读 / dirty read | 279 | def | dual-copy |
| k_dict_qv4sloxd | 数据操纵语言 / DML | 283 | def | dual-copy title-prefix |
| k_dict_t6m62us4 | MySQL 落下 / drop | 270 | def | dual-copy |
| k_dict_txc4v2ss | Explain | 279 | def | dual-copy title-prefix ptr:详见 |
| k_dict_mfu28h3v | 故障转移 / failover | 113 | def | dual-copy ptr:另见 |
| k_dict_hcbepdud | 快速关闭 / fast shutdown | 261 | def | dual-copy ptr:另见 |
| k_dict_lnpi0qrg | MySQL 外键 / MySQL foreign key | 571 | def | dual-copy ptr:参见 |
| k_dict_zsu3d9zk | 分表 | 132 | def | dual-copy ptr:详见 |
| k_dict_reul960o | MySQL 生成列 / generated column | 384 | def | dual-copy |
| k_dict_ggnkee68 | 组提交 / group commit | 242 | def | dual-copy ptr:另见 |
| k_dict_z9h14mh0 | MySQL 热备份 / hot backup | 308 | def | dual-copy |
| k_dict_muxlhpv2 | MySQL 缓冲区 / buffer | 557 | def | dual-copy ptr:另见 |
| k_dict_qus727rl | MySQL INFORMATION_SCHEMA | 362 | def | dual-copy ptr:另见 |
| k_dict_pzcms560 | MySQL 插入 / insert | 214 | def | dual-copy |
| k_dict_duk4xptw | 连接 / join | 178 | def | dual-copy title-prefix |
| k_dict_kgntvds7 | MySQL 闩锁 / latch | 212 | def | dual-copy title-prefix ptr:另见 |
| k_dict_wxe0al75 | LIMIT / FETCH | 157 | def | dual-copy |
| k_dict_5d4mlf9q | 日志 / log | 245 | def | dual-copy ptr:另见 |
| k_dict_wv1o918s | MySQL 逻辑备份 / logical backup | 243 | def | dual-copy ptr:另见 |
| k_dict_g7onhohj | LSN | 525 | def | dual-copy title-prefix |
| k_dict_88aa29dg | MySQL 冷备份 / cold backup | 99 | def | dual-copy |
| k_dict_lepgecnd | MySQL 列 / column | 303 | def | dual-copy ptr:另见 |
| k_dict_fbl127ld | memcached | 276 | def | dual-copy title-prefix |
| k_dict_s1u2tlxt | 合并 / merge | 118 | def | dual-copy title-prefix |
| k_dict_fncpbi74 | 慢查询 | 127 | def | dual-copy |
| k_dict_lf4tbrsa | Nested Loop Join | 190 | def | dual-copy title-prefix |
| k_dict_m5qakvks | MySQL 临键锁 / next-key lock | 114 | def | dual-copy ptr:参见 |
| k_dict_fwv3kkzy | ODBC | 231 | def | dual-copy ptr:参见 |
| k_dict_zu4iv9d4 | 联机事务处理 / OLTP | 789 | def | dual-copy ptr:参见 |
| k_dict_4m05mgz6 | MySQL 在线 DDL / online DDL | 288 | def | dual-copy |
| k_dict_722bh2j6 | MySQL 部分索引 / partial index | 93 | def | dual-copy |
| k_dict_pqd2sd20 | MySQL 性能模式 / Performance Schema | 635 | def | dual-copy ptr:参见 |
| k_dict_8o426b5j | MySQL 幻读 / phantom | 316 | def | dual-copy title-prefix |
| k_dict_zjinmyz3 | PITR | 143 | def | dual-copy ptr:另见 |
| k_dict_xxkp8lkc | MySQL主键索引 | 229 | def | dual-copy ptr:另见 |
| k_dict_yaz6f56l | Query Cache | 92 | def | dual-copy ptr:详见 |
| k_dict_jan17ieo | MySQL 全表扫描 / full table scan | 161 | def | dual-copy |
| k_dict_csflfif1 | Range | 125 | def | dual-copy title-prefix |
| k_dict_o0jw5g8p | 读已提交 / READ COMMITTED | 422 | def | dual-copy title-prefix |
| k_dict_4zr5j9bz | 可重复读 / REPEATABLE READ | 898 | def | dual-copy ptr:参见 |
| k_dict_sctomy1z | 复制 / replication | 494 | def | dual-copy ptr:参见 |
| k_dict_lin6ue94 | MySQL 恢复 / restore | 727 | def | dual-copy ptr:另见 |
| k_dict_rmz7dcm0 | MySQL 回滚 / rollback | 178 | def | dual-copy |
| k_dict_2uq4y41u | MySQL 行 / row | 174 | def | dual-copy |
| k_dict_ihguu98m | 行格式 / row format | 459 | def | dual-copy title-prefix |
| k_dict_fb1f2eh2 | MySQL 行级锁定 / row-level locking | 230 | def | dual-copy ptr:另见 |
| k_dict_tr918oc6 | 保存点 / savepoint | 161 | def | dual-copy |
| k_dict_8yoqxtuu | MySQL 模式 / MySQL schema | 434 | def | dual-copy |
| k_dict_i1g9hhj8 | 可串行化 / SERIALIZABLE | 732 | def | dual-copy ptr:另见 |
| k_dict_xhmtog57 | 服务器 / server | 297 | def | dual-copy ptr:另见 |
| k_dict_ef30sdky | Session | 65 | def,orig | title-prefix |
| k_dict_yvuxhe74 | MySQL 共享锁 / shared lock | 289 | def | dual-copy |
| k_dict_wu1sq9s4 | Sharding | 136 | def | dual-copy title-prefix ptr:详见 |
| k_dict_jwcd61u4 | 关闭 / shutdown | 590 | def | dual-copy ptr:另见 |
| k_dict_kpjg49hn | 从属服务器 / slave | 0 | def | ptr:参见 |
| k_dict_xbipt5q1 | 快照 / snapshot | 450 | def | dual-copy ptr:参见 |
| k_dict_dedl7dno | MySQL 安全套接层 / SSL | 79 | def | dual-copy |
| k_dict_rkijwolw | MySQL 统计信息 / statistics | 498 | def | dual-copy |
| k_dict_xb5t6pmm | MySQL 代理键 / MySQL surrogate key | 61 | def | dual-copy |
| k_dict_mkv3t3vi | System | 82 | def | dual-copy title-prefix |
| k_dict_nqeoggvl | MySQL 锁升级 / lock escalation | 180 | def | dual-copy ptr:参见 |
| k_dict_7dvcv51p | MySQL 表 / table | 851 | def | dual-copy |
| k_dict_umbo5ime | MySQL 表空间 / tablespace | 1729 | def | dual-copy ptr:参见 |
| k_dict_6rxmba95 | MySQL 临时表 / temporary table | 323 | def | dual-copy ptr:另见 |
| k_dict_n7rueozw | 线程 / thread | 64 | def | dual-copy |
| k_dict_ntqiff2s | MySQL 截断 / truncate | 354 | def | dual-copy |
| k_dict_qbyc557y | 两阶段提交 / two-phase commit | 453 | def | dual-copy ptr:参见 |
| k_dict_jmpy3jq2 | MySQL 填充因子 / fill factor | 283 | def | dual-copy ptr:参见 |
| k_dict_rdm2280v | MySQL 唯一键 / MySQL unique key | 124 | def | dual-copy |
| k_dict_lm90vzok | MySQL 视图 | 239 | def | dual-copy |
| k_dict_7okhi5j5 | 虚拟列 / virtual column | 119 | def | dual-copy |
| k_dict_ee6jgxn1 | MySQL 预热 / warm up | 401 | def | dual-copy ptr:参见 |
| k_dict_vd39b68k | MySQL 工作负载 / workload | 123 | def | dual-copy |
| k_dict_bki84n9o | 自增 | 118 | def | dual-copy |
| k_dict_el0p7j55 | 自动提交 / autocommit | 249 | def | dual-copy |
| k_dict_rukxx2as | 主从复制 | 100 | def | dual-copy |
| k_1781901890734_vckmz5 | MySQL 变更缓冲区 / change buffer | 819 | def | dual-copy ptr:参见 |
| k_1781901899060_670apc | 日志缓冲区 / log buffer | 104 | def | dual-copy ptr:另见 |
| k_1781940147478_6d75y4 | 系统表空间 / system tablespace | 2256 | def | dual-copy ptr:参见 |
| k_1781957518600_aibqeg | MySQL 重做日志 / redo log | 1039 | def | dual-copy ptr:参见 |
| k_1781957944264_lxfajw | 会话临时表空间 / session temporary tablespace | 403 | def | dual-copy ptr:另见 |
| k_1781957954400_w4s3ew | 全局临时表空间 / global temporary tablespace | 203 | def | dual-copy ptr:另见 |
| k_1781962829528_eqvypd | MySQL 干净页 / clean page | 146 | def | dual-copy ptr:参见 |
| k_1781974756575_ldbdtp | MySQL dirty  page | 76 | def | dual-copy |
| k_1782008551222_xs2oyj | 刷新列表 / flush list | 237 | def | dual-copy ptr:另见 |
| k_1782008637396_62wc7w | MySQL lru list | 125 | def | dual-copy |
| innodb_mvcc_purge | 清理 / purge | 779 | def | dual-copy ptr:另见 |
| innodb_mvcc_db_trx_id | DB_TRX_ID | 97 | def | dual-copy |
| innodb_mvcc_db_roll_ptr | DB_ROLL_PTR | 225 | def | dual-copy |
| innodb_mvcc_db_row_id | DB_ROW_ID | 113 | def | dual-copy |
| k_1782024448012_sl16gv | 当前读（CurrentRead） | 199 | def | dual-copy title-prefix |
| k_1782027235624_gtvo1k | MySQL 缓存 / cache | 114 | def | dual-copy ptr:参见 |
| k_1782029470422_yfa3u9 | 系统文件层 | 42 | def | title-prefix |
| k_1782029505237_7y8fh8 | 日志文件 | 97 | def | dual-copy ptr:另见 |
| k_1782029546712_okgd59 | 通用查询日志 / general query log | 873 | def | dual-copy ptr:参见 |
| k_1782029599317_nn6hzg | 慢查询日志 / slow query log | 447 | def | dual-copy ptr:参见 |
| k_1782029618563_7rrguo | 配置文件 | 374 | def | dual-copy |
| k_1782029643146_aumkky | 数据文件 | 1000 | def | dual-copy ptr:另见 |
| k_1782029674610_l6hlzo | .frm 文件 / .frm file | 173 | def | dual-copy |
| mysql_file_myd | .MYD 文件 / .MYD file | 167 | def | dual-copy ptr:另见 |
| mysql_file_myi | .MYI 文件 / .MYI file | 170 | def | dual-copy ptr:另见 |
| mysql_file_ibd | .ibd 文件 / .ibd file | 498 | def | dual-copy ptr:另见 |
| mysql_file_ibdata | ibdata 文件 / ibdata file | 361 | def | dual-copy ptr:参见 |
| mysql_file_ibdata1 | ibdata1 文件 / ibdata1 file | 115 | def | dual-copy |
| mysql_runtime_files | 运行时文件 | 40 | def | title-prefix |
| mysql_file_pid | PID 文件 / PID file | 106 | def | dual-copy |
| mysql_file_socket | Socket 文件 / Socket file | 138 | def | dual-copy |
| k_1782033172524_cjmm5c | SQL接⼝（SQL Interface） | 110 | def | dual-copy |
| k_1782033245872_81floi | MySQL 解析器（Parser） | 149 | def | dual-copy |
| k_1782033508063_xspnmd | MySQL 查询优化器（Optimizer） | 198 | def | dual-copy ptr:见子节点 |
| k_1782033743150_vbish8 | MySQL 缓存（Cache&Buffer） | 99 | def | dual-copy |
| mysql_glossary_arm_file_ufam2l | .ARM文件 / .ARM file | 415 | def | dual-copy ptr:另见 |
| mysql_glossary_arz_file_1iyj60 | .ARZ文件 / .ARZ file | 408 | def | dual-copy ptr:另见 |
| mysql_glossary_adaptive_flushing_19588u | 自适应刷新 / adaptive flushing | 742 | def | dual-copy ptr:参见 |
| mysql_glossary_ado_net_ieyqc | ADO.NET | 513 | def | dual-copy ptr:参见 |
| mysql_glossary_api_y14yjr | MySQL API | 795 | def | dual-copy ptr:参见 |
| mysql_glossary_application_programming_interface_api_73cc6c | MySQL 应用程序编程接口（API） | 125 | def | dual-copy |
| mysql_glossary_apply_a6xv7f | 应用 / apply | 700 | def | dual-copy ptr:另见 |
| mysql_glossary_as_h5mr7x | MySQL AS（认证服务器） | 66 | def | dual-copy |
| mysql_glossary_asp_net_lyjnke | ASP.net | 598 | def | dual-copy ptr:参见 |
| mysql_glossary_assembly_9y51lx | 程序集 / assembly | 236 | def | dual-copy ptr:参见 |
| mysql_glossary_asynchronous_i_o_1c6jsd | 异步I/O / asynchronous I/O | 618 | def | dual-copy ptr:参见 |
| mysql_glossary_atomic_ddl_l48qcc | MySQL 原子DDL / atomic DDL | 652 | def | dual-copy ptr:参见 |
| mysql_glossary_atomic_instruction_xxdtb4 | MySQL 原子指令 / atomic instruction | 94 | def | dual-copy |
| mysql_glossary_authentication_server_1njohk | MySQL 认证服务器 / authentication server | 363 | def | dual-copy ptr:参见 |
| mysql_glossary_auto_increment_locking_lrps8v | MySQL 自增锁 / auto-increment locking | 734 | def | dual-copy ptr:另见 |
| mysql_glossary_mysql_enterprise_backup_bh86yi | MySQL 企业备份 / MySQL Enterprise Backup | 122 | def | dual-copy title-prefix |
| mysql_glossary_backticks_5z2ws | MySQL 反引号 / backticks | 402 | def | dual-copy ptr:另见 |
| mysql_glossary_base_column_jjprw2 | 基础列 / base column | 352 | def | dual-copy ptr:另见 |
| mysql_glossary_blind_query_expansion_17xip3 | MySQL 盲查询扩展 / blind query expansion | 319 | def | dual-copy ptr:另见 |
| mysql_glossary_blob_lhrk4q | MySQL BLOB | 952 | def | dual-copy ptr:另见 |
| mysql_glossary_bottleneck_ehdgmu | MySQL 瓶颈 / bottleneck | 394 | def | dual-copy ptr:另见 |
| mysql_glossary_bounce_e9awxp | 重启服务 / bounce | 166 | def | dual-copy ptr:另见 |
| mysql_glossary_buffer_pool_instance_m5jqpe | 缓冲池实例 / buffer pool instance | 550 | def | dual-copy ptr:参见 |
| mysql_glossary_cfg_file_1wfa77 | .cfg 文件 / .cfg file | 256 | def | dual-copy ptr:参见 |
| mysql_glossary_c_api_1wuwxq | C API | 100 | def | dual-copy ptr:参见 |
| mysql_glossary_change_buffering_y1y18j | 变更缓冲 / change buffering | 277 | def | dual-copy ptr:参见 |
| mysql_glossary_checksum_qnrmvm | 校验和 / checksum | 414 | def | dual-copy ptr:参见 |
| mysql_glossary_child_table_1l6dvq | MySQL 子表 / child table | 229 | def | dual-copy |
| mysql_glossary_clean_shutdown_1rucqm | 干净关闭 / clean shutdown | 96 | def | dual-copy title-prefix |
| mysql_glossary_client_libraries_1l6z2y | 客户端库 / client libraries | 176 | def | dual-copy ptr:参见 |
| mysql_glossary_client_side_prepared_statement_1czk27 | MySQL 客户端预处理语句 / MySQL client-side prepared statement | 337 | def | dual-copy ptr:参见 |
| mysql_glossary_clob_kn7shj | MySQL CLOB | 254 | def | dual-copy ptr:参见 |
| mysql_glossary_column_index_q4bbvv | MySQL 列索引 / column index | 79 | def | dual-copy ptr:另见 |
| mysql_glossary_column_prefix_15o687 | MySQL 列前缀 / column prefix | 301 | def | dual-copy |
| mysql_glossary_command_interceptor_1f58ii | 命令拦截器 / command interceptor | 319 | def | dual-copy ptr:另见 |
| mysql_glossary_compact_row_format_16fa2a | 紧凑行格式 / compact row format | 344 | def | dual-copy ptr:参见 |
| mysql_glossary_composite_index_duhrko | MySQL 复合索引 / composite index | 84 | def | dual-copy ptr:另见 |
| mysql_glossary_compressed_backup_12f16e | MySQL 压缩备份 / compressed backup | 338 | def | dual-copy |
| mysql_glossary_compressed_row_format_11axki | compressed row format | 642 | def | dual-copy ptr:参见 |
| mysql_glossary_compressed_table_zx6vsg | compressed table | 230 | def | dual-copy ptr:参见 |
| mysql_glossary_concatenated_index_zs31t2 | MySQL 连接索引 / concatenated index | 75 | def | dual-copy |
| mysql_glossary_concurrency_uoyivs | MySQL 并发 / concurrency | 125 | def | dual-copy |
| mysql_glossary_connection_fqlzvd | MySQL 连接 / connection | 307 | def | dual-copy ptr:参见 |
| mysql_glossary_connection_string_1hyrot | MySQL 连接字符串 / connection string | 262 | def | dual-copy ptr:参见 |
| mysql_glossary_connector_ijze9c | MySQL 连接器 / connector | 196 | def | dual-copy ptr:另见 |
| mysql_glossary_connector_c_rs92y0 | Connector/C++ | 251 | def | dual-copy ptr:参见 |
| mysql_glossary_connector_j_avxtph | Connector/J | 225 | def | dual-copy ptr:参见 |
| mysql_glossary_connector_net_1h05w3 | Connector/NET | 227 | def | dual-copy ptr:参见 |
| mysql_glossary_connector_odbc_1qan6g | Connector/ODBC | 147 | def | dual-copy ptr:参见 |
| mysql_glossary_connector_php_1rej45 | Connector/PHP | 574 | def | dual-copy ptr:参见 |
| mysql_glossary_consistent_read_gsmmdj | MySQL 一致性读取 / consistent read | 544 | def | dual-copy ptr:参见 |
| mysql_glossary_counter_17gzh9 | MySQL 计数器 / counter | 286 | def | dual-copy ptr:参见 |
| mysql_glossary_cpu_bound_1lxhya | MySQL CPU密集型 / CPU-bound | 137 | def | dual-copy ptr:另见 |
| mysql_glossary_crash_7aq2mw | MySQL 崩溃 / crash | 234 | def | dual-copy |
| mysql_glossary_crash_recovery_139bco | MySQL 崩溃恢复 / crash recovery | 373 | def | dual-copy ptr:另见 |
| mysql_glossary_data_directory_zrepzq | 数据目录 / data directory | 341 | def | dual-copy ptr:另见 |
| mysql_glossary_delete_buffering_15389r | 删除缓冲 / delete buffering | 640 | def | dual-copy ptr:另见 |
| mysql_glossary_denormalized_y8sq0n | 反规范化 / denormalized | 502 | def | dual-copy ptr:另见 |
| mysql_glossary_descending_index_1j7tn3 | MySQL 降序索引 / descending index | 175 | def | dual-copy ptr:参见 |
| mysql_glossary_dictionary_object_cache_1jwkoz | 字典对象缓存 / dictionary object cache | 453 | def | dual-copy ptr:参见 |
| mysql_glossary_disk_based_15w8id | 基于磁盘 / disk-based | 460 | def | dual-copy ptr:另见 |
| mysql_glossary_disk_bound_1eazx6 | MySQL 磁盘绑定 / disk-bound | 411 | def | dual-copy ptr:另见 |
| mysql_glossary_doublewrite_buffer_flioi3 | 双写缓冲区 / doublewrite buffer | 730 | def | dual-copy ptr:另见 |
| mysql_glossary_dynamic_cursor_u1pzzs | 动态游标 / dynamic cursor | 286 | def | dual-copy ptr:参见 |
| mysql_glossary_dynamic_row_format_1pdso5 | 动态行格式 / dynamic row format | 735 | def | dual-copy ptr:参见 |
| mysql_glossary_dynamic_statement_1evhmv | MySQL 动态语句 / dynamic statement | 283 | def | dual-copy ptr:参见 |
| mysql_glossary_early_adopter_518cax | 早期采用者 / early adopter | 81 | def | dual-copy ptr:参见 |
| mysql_glossary_eiffel_75vlru | 埃菲尔 / Eiffel | 132 | def | dual-copy ptr:参见 |
| mysql_glossary_embedded_yxsdnj | 嵌入式 Mysql | 117 | def | dual-copy title-prefix |
| mysql_glossary_eviction_1b3reo | 驱逐 / eviction | 183 | def | dual-copy ptr:参见 |
| mysql_glossary_exception_interceptor_nqrl4t | 异常拦截器 / exception interceptor | 488 | def | dual-copy |
| mysql_glossary_exclusive_lock_ksqz5a | MySQL 独占锁 / exclusive lock | 415 | def | dual-copy |
| mysql_glossary_extent_16v5kw | MySQL 区段 / extent | 406 | def | dual-copy ptr:参见 |
| mysql_glossary_file_format_199bjh | 文件格式 / file format | 83 | def | dual-copy |
| mysql_glossary_file_per_table_c2gueo | 每表一个文件 / file-per-table | 575 | def | dual-copy ptr:另见 |
| mysql_glossary_fixed_row_format_ti21b0 | 固定行格式 / fixed row format | 277 | def | dual-copy ptr:另见 |
| mysql_glossary_foreign_key_constraint_p6gdbr | MySQL 外键约束 / MySQL FOREIGN KEY constraint | 288 | def | dual-copy ptr:参见 |
| mysql_glossary_fts_1x0dll | MySQL 全文本搜索 / FTS | 113 | def | dual-copy ptr:参见 |
| mysql_glossary_full_backup_1pi94c | MySQL 完整备份 / full backup | 159 | def | dual-copy ptr:参见 |
| mysql_glossary_full_text_search_16dcha | MySQL 全文搜索 / full-text search | 142 | def | dual-copy |
| mysql_glossary_fuzzy_checkpointing_1cxy9s | 模糊检查点 / fuzzy checkpointing | 117 | def | dual-copy ptr:另见 |
| mysql_glossary_gac_1g5bbw | GAC | 249 | def | dual-copy ptr:另见 |
| mysql_glossary_gap_k039an | 间隙 / gap | 706 | def | dual-copy ptr:参见 |
| mysql_glossary_gap_lock_1gfoi1 | MySQL 间隙锁 / gap lock | 796 | def | dual-copy ptr:参见 |
| mysql_glossary_general_tablespace_300irr | MySQL 通用表空间 / general tablespace | 1143 | def | dual-copy ptr:参见 |
| mysql_glossary_generated_stored_column_1nr7fq | 生成的存储列 / generated stored column | 131 | def | dual-copy ptr:另见 |
| mysql_glossary_global_transaction_4i1f06 | MySQL 全局事务 / global transaction | 177 | def | dual-copy |
| mysql_glossary_guid_bmsoy4 | MySQL GUID | 310 | def | dual-copy |
| mysql_glossary_hdd_eb2rxz | HDD | 78 | def | dual-copy |
| mysql_glossary_heartbeat_1aiai3 | MySQL 心跳 / heartbeat | 168 | def | dual-copy ptr:另见 |
| mysql_glossary_high_water_mark_1g6jcp | 高水位线 / high-water mark | 97 | def | dual-copy ptr:另见 |
| mysql_glossary_history_list_16r63i | 历史列表 / history list | 250 | def | dual-copy ptr:另见 |
| mysql_glossary_host_1ctymw | MySQL 主机 / host | 148 | def | dual-copy |
| mysql_glossary_hot_1yorp3 | MySQL 热 / hot | 119 | def | dual-copy |
| mysql_glossary_ibz_file_tz3hbm | .ibz 文件 / .ibz file | 278 | def | dual-copy ptr:另见 |
| mysql_glossary_ib_file_set_18odgx | ib-file 集合 / ib-file set | 289 | def | dual-copy ptr:另见 |
| mysql_glossary_ibbackup_logfile_1vewn2 | ibbackup_logfile | 304 | def | dual-copy ptr:参见 |
| mysql_glossary_ibtmp_file_18e04h | ibtmp 文件 / ibtmp file | 271 | def | dual-copy ptr:参见 |
| mysql_glossary_ib_logfile_1p12fu | ib_logfile 文件 / ib_logfile | 319 | def | dual-copy ptr:参见 |
| mysql_glossary_ilist_16p50m | ilist | 61 | def | dual-copy title-prefix |
| mysql_glossary_implicit_row_lock_ac6u2d | MySQL 隐式行锁 / implicit row lock | 102 | def | dual-copy ptr:另见 |
| mysql_glossary_incremental_backup_3gko1n | MySQL 增量备份 / incremental backup | 336 | def | dual-copy ptr:参见 |
| mysql_glossary_index_condition_pushdown_tudely | MySQL 索引条件下推 / ICP | 221 | def | dual-copy ptr:参见 |
| mysql_glossary_index_hint_1nr0pl | MySQL 索引提示 / index hint | 172 | def | dual-copy ptr:参见 |
| mysql_glossary_index_statistics_1ge74j | MySQL 索引统计 / index statistics | 69 | def | dual-copy |
| mysql_glossary_infimum_record_1jiz41 | MySQL 极小记录 / infimum record | 243 | def | dual-copy ptr:参见 |
| mysql_glossary_innodb_autoinc_lock_mode_a8q16t | MySQL innodb_autoinc_lock_mode | 379 | def | dual-copy |
| mysql_glossary_innodb_file_per_table_1w525y | innodb_file_per_table | 429 | def | dual-copy ptr:参见 |
| mysql_glossary_innodb_lock_wait_timeout_1puppm | MySQL innodb_lock_wait_timeout | 224 | def | dual-copy ptr:另见 |
| mysql_glossary_insert_buffer_1xx0p8 | MySQL 插入缓冲区 / MySQL insert buffer | 205 | def | dual-copy ptr:另见 |
| mysql_glossary_insert_buffering_m9lmge | MySQL 插入缓冲 / MySQL insert buffering | 319 | def | dual-copy ptr:另见 |
| mysql_glossary_insert_intention_lock_1pnwh6 | MySQL 插入意向锁 / insert intention lock | 196 | def | dual-copy ptr:参见 |
| mysql_glossary_instrumentation_1v9bxz | 仪器仪表 / instrumentation | 168 | def | dual-copy |
| mysql_glossary_intention_exclusive_lock_1rd4p1 | MySQL 意图独占锁 / intention exclusive lock | 88 | def | dual-copy |
| mysql_glossary_intention_lock_1ejpzi | MySQL 意向锁 / intention lock | 330 | def | dual-copy title-prefix ptr:参见 |
| mysql_glossary_intention_shared_lock_4x8ciz | MySQL 意图共享锁 / intention shared lock | 82 | def | dual-copy |
| mysql_glossary_intrinsic_temporary_table_1sl3hr | 内在临时表 / intrinsic temporary table | 85 | def | dual-copy |
| mysql_glossary_inverted_index_spkkuc | MySQL 倒排索引 / inverted index | 236 | def | dual-copy ptr:参见 |
| mysql_glossary_iops_1go6rk | IOPS | 141 | def | dual-copy |
| mysql_glossary_jdbc_14hlls | JDBC | 157 | def | dual-copy ptr:另见 |
| mysql_glossary_key_distribution_center_fhraw7 | MySQL 密钥分发中心 / KDC | 132 | def | dual-copy ptr:参见 |
| mysql_glossary_key_block_size_u1i5bm | KEY_BLOCK_SIZE | 233 | def | dual-copy ptr:参见 |
| mysql_glossary_libmysqlclient_1ofbnd | libmysqlclient | 158 | def | dual-copy ptr:参见 |
| mysql_glossary_libmysqld_rpbwgq | libmysqld | 152 | def | dual-copy ptr:另见 |
| mysql_glossary_list_3lo6m9 | 列表 / list | 154 | def | dual-copy |
| mysql_glossary_load_balancing_ee4rhm | MySQL 负载均衡 / load balancing | 205 | def | dual-copy ptr:另见 |
| mysql_glossary_lock_mode_h31or1 | MySQL 锁模式 / lock mode | 363 | def | dual-copy ptr:参见 |
| mysql_glossary_locking_1ofljy | 锁定 / locking | 158 | def | dual-copy ptr:参见 |
| mysql_glossary_locking_read_16dto0 | MySQL 锁定读 / locking read | 403 | def | dual-copy ptr:另见 |
| mysql_glossary_log_group_1a3bsl | 日志组 / log group | 105 | def | dual-copy ptr:另见 |
| mysql_glossary_low_water_mark_b3ceyk | 低水位线 / low-water mark | 81 | def | dual-copy ptr:另见 |
| mysql_glossary_lru_1mxcfz | LRU | 249 | def | dual-copy ptr:参见 |
| mysql_glossary_lts_series_lpbljr | LTS系列 / LTS Series | 127 | def | dual-copy ptr:另见 |
| mysql_glossary_mrg_file_2synx7 | .MRG 文件 / .MRG file | 145 | def | dual-copy ptr:另见 |
| mysql_glossary_master_thread_11thmi | 主线程 / master thread | 249 | def | dual-copy ptr:另见 |
| mysql_glossary_mdl_braceg | MySQL MDL | 62 | def | dual-copy ptr:另见 |
| mysql_glossary_medium_trust_113pv6 | MySQL 中等信任 / medium trust | 97 | def | dual-copy |
| mysql_glossary_metadata_lock_qiqw4n | MySQL 元数据锁 / metadata lock | 305 | def | dual-copy ptr:参见 |
| mysql_glossary_metrics_counter_1tynuw | MySQL 指标计数器 / metrics counter | 205 | def | dual-copy ptr:另见 |
| mysql_glossary_midpoint_insertion_strategy_a74b95 | 中点插入策略 / midpoint insertion strategy | 246 | def | dual-copy ptr:参见 |
| mysql_glossary_mini_transaction_ly3edv | MySQL mini-transaction / 小型事务 | 247 | def | dual-copy ptr:另见 |
| mysql_glossary_mixed_mode_insert_1pvj4c | MySQL 混合模式插入 / mixed-mode insert | 402 | def | dual-copy ptr:参见 |
| mysql_glossary_mm_mysql_45ec9v | MM.MySQL | 82 | def | dual-copy ptr:另见 |
| mysql_glossary_mono_oszvd6 | Mono | 89 | def | dual-copy ptr:另见 |
| mysql_glossary_mutex_6ryres | MySQL 互斥量 / mutex | 237 | def | dual-copy |
| mysql_glossary_my_ini_1giw6m | my.ini | 64 | def | dual-copy ptr:参见 |
| mysql_glossary_myodbc_drivers_g6kz24 | MyODBC 驱动程序 / MyODBC drivers | 75 | def | dual-copy ptr:参见 |
| mysql_glossary_mysqlbackup_command_1gjf0a | mysqlbackup 命令 / mysqlbackup command | 194 | def | dual-copy ptr:参见 |
| mysql_glossary_mysqlclient_1fp9hd | mysqlclient | 80 | def | dual-copy ptr:另见 |
| mysql_glossary_mysqld_q7qv17 | mysqld | 298 | def | dual-copy title-prefix ptr:另见 |
| mysql_glossary_mysqldb_1k0vb5 | MySQLdb | 73 | def | dual-copy ptr:另见 |
| mysql_glossary_mysqldump_1p1msf | mysqldump | 182 | def | dual-copy ptr:参见 |
| mysql_glossary_net_1q25ey | .NET | 62 | def | dual-copy ptr:参见 |
| mysql_glossary_natural_key_tddcrt | MySQL 自然键 / MySQL natural key | 461 | def | dual-copy ptr:参见 |
| mysql_glossary_neighbor_page_1t6aj7 | MySQL 邻页 / neighbor page | 260 | def | dual-copy ptr:参见 |
| mysql_glossary_non_locking_read_12iidl | MySQL 非锁定读 / non-locking read | 317 | def | dual-copy |
| mysql_glossary_nonblocking_i_o_h65z9a | 非阻塞 I/O / nonblocking I/O | 75 | def | dual-copy ptr:参见 |
| mysql_glossary_normalized_4n509k | 规范化 / normalized | 451 | def | dual-copy ptr:另见 |
| mysql_glossary_not_null_constraint_1op7sq | MySQL NOT NULL 约束 / MySQL NOT NULL constraint | 232 | def | dual-copy ptr:参见 |
| mysql_glossary_opt_file_1w9809 | .OPT 文件 / .OPT file | 304 | def | dual-copy ptr:另见 |
| mysql_glossary_off_page_column_i7tqi8 | 离页列 / off-page column | 668 | def | dual-copy ptr:参见 |
| mysql_glossary_online_13svqm | 在线 / online | 193 | def | dual-copy |
| mysql_glossary_optimistic_1gdvw6 | MySQL 乐观 / optimistic | 456 | def | dual-copy |
| mysql_glossary_option_1sc73x | MySQL 选项 / option | 134 | def | dual-copy |
| mysql_glossary_option_file_gsqytm | 选项文件 / option file | 426 | def | dual-copy ptr:另见 |
| mysql_glossary_overflow_page_1x8lkk | MySQL 溢出页 / overflow page | 393 | def | dual-copy ptr:另见 |
| mysql_glossary_par_file_rzlrrm | .par 文件 / .par file | 478 | def | dual-copy ptr:另见 |
| mysql_glossary_page_cleaner_20exxg | 页面清理器 / page cleaner | 679 | def | dual-copy ptr:另见 |
| mysql_glossary_page_size_1tjy75 | MySQL 页大小 / page size | 1402 | def | dual-copy ptr:参见 |
| mysql_glossary_parent_table_yqeba1 | MySQL 父级表 / parent table | 368 | def | dual-copy ptr:另见 |
| mysql_glossary_partial_backup_bplu20 | MySQL 部分备份 / partial backup | 114 | def | dual-copy |
| mysql_glossary_partial_trust_rcrlto | MySQL 部分信任 / partial trust | 238 | def | dual-copy ptr:另见 |
| mysql_glossary_perl_6buxo8 | Perl | 162 | def | dual-copy ptr:参见 |
| mysql_glossary_perl_api_knrawo | Perl API | 345 | def | dual-copy ptr:参见 |
| mysql_glossary_persistent_statistics_2n5ydn | MySQL 持久统计信息 / persistent statistics | 727 | def | dual-copy ptr:参见 |
| mysql_glossary_pessimistic_l0bpvy | MySQL 悲观 / pessimistic | 461 | def | dual-copy ptr:另见 |
| mysql_glossary_php_api_1ldhpf | MySQL PHP API | 389 | def | dual-copy ptr:参见 |
| mysql_glossary_physical_117gzf | MySQL 物理 / physical | 124 | def | dual-copy |
| mysql_glossary_physical_backup_1o7b7v | MySQL 物理备份 / physical backup | 605 | def | dual-copy ptr:另见 |
| mysql_glossary_plan_stability_70vxat | 计划稳定性 / plan stability | 269 | def | dual-copy ptr:另见 |
| mysql_glossary_prepared_backup_19htae | 准备好的备份 / prepared backup | 173 | def | dual-copy title-prefix |
| mysql_glossary_prepared_statement_1tfqdw | MySQL 预处理语句 / MySQL prepared statement | 572 | def | dual-copy ptr:另见 |
| mysql_glossary_pthreads_qfb7k4 | MySQL Pthreads | 128 | def | dual-copy |
| mysql_glossary_purge_buffering_1ckv1x | 清理缓冲 / purge buffering | 643 | def | dual-copy ptr:另见 |
| mysql_glossary_purge_lag_1p6pyp | 清理延迟 / purge lag | 335 | def | dual-copy ptr:另见 |
| mysql_glossary_purge_thread_8xnck4 | 清理线程 / purge thread | 373 | def | dual-copy ptr:另见 |
| mysql_glossary_python_api_2amn13 | Python API | 163 | def | dual-copy ptr:另见 |
| mysql_glossary_query_execution_plan_17fdf4 | MySQL 查询执行计划 / query execution plan | 273 | def | ptr:见子节点 |
| mysql_glossary_quiesce_1ujs11 | MySQL 静默 / quiesce | 639 | def | dual-copy ptr:另见 |
| mysql_glossary_r_tree_1w9375 | R 树 / R-tree | 67 | def | dual-copy ptr:另见 |
| mysql_glossary_random_dive_1sbv22 | MySQL 随机探查 / random dive | 144 | def | dual-copy ptr:另见 |
| mysql_glossary_raw_backup_1s82jm | MySQL 原始备份 / raw backup | 813 | def | dual-copy ptr:另见 |
| mysql_glossary_read_phenomena_n0vs4m | MySQL 读现象 / read phenomena | 137 | def | dual-copy |
| mysql_glossary_read_ahead_1khyqr | 预读 / read-ahead | 297 | def | dual-copy ptr:另见 |
| mysql_glossary_read_only_transaction_2kf2kq | MySQL 只读事务 / read-only transaction | 258 | def | dual-copy |
| mysql_glossary_record_lock_1pixn1 | MySQL 记录锁 / record lock | 207 | def | dual-copy ptr:另见 |
| mysql_glossary_redo_1vo98z | 重做 / redo | 622 | def | dual-copy ptr:参见 |
| mysql_glossary_redo_log_archiving_1ugqxo | 重做日志归档 / redo log archiving | 314 | def | dual-copy ptr:参见 |
| mysql_glossary_redundant_row_format_kd9bbp | 冗余行格式 / redundant row format | 727 | def | dual-copy ptr:参见 |
| mysql_glossary_relational_1yoaip | MySQL 关系型 / MySQL relational | 509 | def | dual-copy |
| mysql_glossary_relevance_1schdd | MySQL 相关性 / relevance | 332 | def | dual-copy ptr:另见 |
| mysql_glossary_repertoire_jo0oic | 字符集集合 / repertoire | 180 | def | dual-copy ptr:参见 |
| mysql_glossary_rollback_segment_40xjnc | MySQL 回滚段 / rollback segment | 550 | def | dual-copy |
| mysql_glossary_ruby_17cue0 | Ruby | 281 | def | dual-copy ptr:另见 |
| mysql_glossary_ruby_api_1c5kjx | Ruby API | 363 | def | dual-copy ptr:参见 |
| mysql_glossary_rw_lock_1c4qu9 | 读写锁 / rw-lock | 204 | def | dual-copy ptr:另见 |
| mysql_glossary_scalability_d5afjw | MySQL 可伸缩性 / scalability | 499 | def | dual-copy ptr:参见 |
| mysql_glossary_scale_out_1fhx7h | MySQL 向外扩展 / scale out | 305 | def | dual-copy ptr:参见 |
| mysql_glossary_scale_up_1y6pkm | MySQL 向上扩展 / scale up | 547 | def | dual-copy ptr:参见 |
| mysql_glossary_sdi_8vlmf5 | MySQL SDI | 150 | def | dual-copy ptr:另见 |
| mysql_glossary_search_index_18jlmz | MySQL 搜索索引 / search index | 369 | def | dual-copy ptr:另见 |
| mysql_glossary_segment_1vmvly | MySQL 段 / segment | 344 | def | dual-copy ptr:另见 |
| mysql_glossary_selectivity_4k9ksu | MySQL 选择性 / selectivity | 229 | def | dual-copy ptr:另见 |
| mysql_glossary_semi_consistent_read_luof7q | MySQL 半一致性读取 / semi-consistent read | 590 | def | dual-copy ptr:参见 |
| mysql_glossary_serialized_dictionary_information_sdi_1ee69u | MySQL 序列化字典信息 (SDI) / serialized dictionary information (SDI) | 943 | def | dual-copy ptr:参见 |
| mysql_glossary_server_side_prepared_statement_1g5uc6 | MySQL 服务器端预处理语句 / MySQL server-side prepared statement | 656 | def | dual-copy ptr:另见 |
| mysql_glossary_service_principal_name_4syyjd | MySQL 服务主体名称 / SPN | 170 | def | dual-copy |
| mysql_glossary_service_ticket_oqmgfc | MySQL 服务票据 / service ticket | 103 | def | dual-copy |
| mysql_glossary_shared_tablespace_1q68ln | MySQL 共享表空间 / shared tablespace | 370 | def | dual-copy ptr:参见 |
| mysql_glossary_sharp_checkpoint_1tnux9 | 尖锐检查点 / sharp checkpoint | 462 | def | dual-copy ptr:参见 |
| mysql_glossary_slow_shutdown_1tqzdr | 缓慢关闭 / slow shutdown | 531 | def | dual-copy ptr:另见 |
| mysql_glossary_sort_buffer_1x3j60 | MySQL 排序缓冲区 / sort buffer | 224 | def | dual-copy |
| mysql_glossary_space_id_1kjxje | MySQL 空间 ID / space ID | 1182 | def | dual-copy ptr:另见 |
| mysql_glossary_sparse_file_1cutkz | MySQL 稀疏文件 / MySQL sparse file | 34 | def | ptr:详见 |
| mysql_glossary_spin_2ipmhl | MySQL 自旋 / spin | 429 | def | dual-copy |
| mysql_glossary_spn_qxzu3s | MySQL SPN（服务主名称） | 131 | def | dual-copy |
| mysql_glossary_sqlstate_16aqrw | SQLState | 61 | def | title-prefix |
| mysql_glossary_ssd_gyazmt | SSD | 125 | def | dual-copy |
| mysql_glossary_startup_154aqa | MySQL 启动 / startup | 292 | def | dual-copy ptr:另见 |
| mysql_glossary_statement_interceptor_1d641l | 语句拦截器 / statement interceptor | 970 | def | dual-copy ptr:另见 |
| mysql_glossary_stemming_w8xwzt | MySQL 词干提取 / stemming | 351 | def | dual-copy ptr:参见 |
| mysql_glossary_stopword_ztgqhp | 停用词 / stopword | 427 | def | dual-copy ptr:参见 |
| mysql_glossary_stored_generated_column_j7jiqj | 存储生成列 / stored generated column | 401 | def | dual-copy ptr:参见 |
| mysql_glossary_stored_object_od8fkh | MySQL 存储对象 / MySQL stored object | 71 | def | dual-copy |
| mysql_glossary_stored_program_mzfpca | MySQL 存储程序 / stored program | 86 | def | dual-copy |
| mysql_glossary_strict_mode_y6y4gv | 严格模式 / strict mode | 791 | def | dual-copy ptr:参见 |
| mysql_glossary_sublist_12kt6o | 子列表 / sublist | 396 | def | dual-copy ptr:参见 |
| mysql_glossary_supremum_record_1pbwmi | MySQL 上确界记录 / supremum record | 475 | def | dual-copy ptr:另见 |
| mysql_glossary_synthetic_key_1drbjs | MySQL 合成键 / MySQL synthetic key | 694 | def | dual-copy ptr:另见 |
| mysql_glossary_table_lock_15y9vl | MySQL 表锁 / table lock | 945 | def | dual-copy title-prefix |
| mysql_glossary_table_statistics_1c30y8 | MySQL 表统计信息 / table statistics | 144 | def | dual-copy |
| mysql_glossary_tcl_1yc19t | Tcl | 275 | def | dual-copy ptr:参见 |
| mysql_glossary_ticket_granting_server_1cuy2c | MySQL 票证授予服务器 / TGS | 339 | def | dual-copy ptr:另见 |
| mysql_glossary_ticket_granting_ticket_14xqfb | MySQL 票证授予票证 / TGT | 206 | def | dual-copy |
| mysql_glossary_torn_page_1kprbq | MySQL 撕裂页 / torn page | 286 | def | dual-copy ptr:另见 |
| mysql_glossary_tps_ej1ya6 | MySQL TPS | 283 | def | dual-copy ptr:另见 |
| mysql_glossary_transaction_id_1aa5a7 | MySQL 事务 ID / transaction ID | 128 | def | dual-copy |
| mysql_glossary_transparent_page_compression_j4ufzm | MySQL 透明页压缩 / MySQL transparent page compression | 52 | def | ptr:详见 |
| mysql_glossary_transportable_tablespace_1685qd | MySQL 可传输表空间 / transportable tablespace | 1236 | def | dual-copy ptr:参见 |
| mysql_glossary_troubleshooting_1zw5wx | 故障排除 / troubleshooting | 786 | def | dual-copy |
| mysql_glossary_truststore_rgbyfy | MySQL 信任库 / truststore | 121 | def | dual-copy ptr:另见 |
| mysql_glossary_undo_buffer_jg11o3 | 撤销缓冲区 / undo buffer | 102 | def | dual-copy |
| mysql_glossary_undo_log_segment_pbdi2c | MySQL 撤销日志段 / undo log segment | 515 | def | dual-copy ptr:参见 |
| mysql_glossary_undo_tablespace_so71lf | MySQL 撤销表空间 / undo tablespace | 1019 | def | dual-copy ptr:参见 |
| mysql_glossary_unicode_fwfjuo | Unicode | 161 | def | dual-copy title-prefix |
| mysql_glossary_unique_constraint_cvzep | MySQL 唯一约束 / MySQL unique constraint | 439 | def | dual-copy ptr:参见 |
| mysql_glossary_user_principal_name_daz6wj | MySQL 用户主体名称 / UPN | 165 | def | dual-copy ptr:另见 |
| mysql_glossary_variable_length_type_1satcr | MySQL 可变长度类型 / MySQL variable-length type | 803 | def | dual-copy ptr:参见 |
| mysql_glossary_victim_18xqeg | MySQL 受害者 / victim | 161 | def | dual-copy |
| mysql_glossary_virtual_generated_column_1smsm1 | 虚拟生成列 / virtual generated column | 405 | def | dual-copy ptr:另见 |
| mysql_glossary_virtual_index_sm95n4 | MySQL 虚拟索引 / virtual index | 582 | def | dual-copy ptr:参见 |
| mysql_glossary_wait_1229eo | MySQL 等待 / wait | 315 | def | dual-copy |
| mysql_glossary_warm_backup_1sjsyn | MySQL 温备份 / warm backup | 112 | def | dual-copy |
| mysql_glossary_write_combining_154ozi | 写入合并 / write combining | 371 | def | dual-copy ptr:另见 |
| mysql_glossary_young_ohocw3 | MySQL 年轻页 / young | 560 | def | dual-copy ptr:参见 |
| mysql_glossary_insert_undo_log_1yrj7c | 插入 Undo 日志 / Insert Undo Log | 84 | def | dual-copy |
| mysql_glossary_update_undo_log_yphxzo | 更新 Undo 日志 / Update Undo Log | 114 | def | dual-copy |
| mysql_glossary_point_in_time_recovery_eadx3e | MySQL 时间点恢复 / point-in-time recovery | 357 | def | dual-copy ptr:另见 |
| mysql_tx_read_phenomena | MySQL 读现象 | 284 | def | dual-copy |
| theory_domain_transaction_theory | 事务原理 | 36 | def | title-prefix |
| theory_domain_complexity_theory | 计算复杂性理论 | 42 | def | title-prefix |
| k_1782746457581_30q8ao | java | 169 | def,legacy-mysql-glossary-mysql_glossary_java_uspy11 | title-prefix ptr:另见 |
| k_1782749694486_vyrfzy | jvm | 12485 | def,jimi-49 | ptr:详见 |
| k_1782794616728_i5obct | 运行时数据区 | 10255 | def,jimi-28,jimi-48 | title-prefix |
| k_1782812528662_wzvpbe | 类加载器 | 13979 | def,jimi-30 | title-prefix |
| k_1782820357471_875aqe | 加载Loading | 39 | def | title-prefix |
| k_1782846826286_ekdql8 | AQS | 250 | jimi-61 | title-prefix |
| k_1782930904543_kxi0uk | MySQL 触发器 | 91 | def | dual-copy |
| k_1782930954484_nwtfg7 | MySQL 存储过程 | 127 | def | dual-copy |
| k_1783102320876_5ginrg | 实例数据 | 47 | def | title-prefix |
| k_1783107207547_lxjap6 | 操作数栈 | 23 | def | title-prefix |
| k_1783107234826_gtq04l | 返回地址 | 17 | def | title-prefix |
| k_1783145536047_wqowkv | 类型指针 | 103 | def | dual-copy title-prefix |
| k_1783250411548_9x4h5g | 架构（维基） | 159 | def | dual-copy |
| k_1783250593540_v2w5hy | 数据库事务 | 2035 | def,ontology,tab_1784728861302_oe7ksx,tab_1784728967286_erz8pe,tab_1784729063265_y922hi,tab_1784729106009_lhmcun,tab_1784729133062_zetbwf | title-prefix |
| k_1783260209305_4t111y | 软件符号与工具 | 64 | — | title-prefix |
| k_1783260916600_msucmn | 转换构造器 | 108 | def | title-prefix |
| k_1783260946053_mylhzl | 复制构造器 | 170 | def | dual-copy title-prefix |
| k_1783261004905_nf1mq3 | 移动构造器 | 124 | def | dual-copy |
| k_1783824357875_gs9rn2 | 字节码 | 60 | — | title-prefix |
| k_1783824727837_x3fjpf | 机器语言 | 136 | — | title-prefix |
| k_1784039594063_ddeiyo | 原始类型 | 1037 | def | dual-copy |
| k_1784042843935_picv84 | 引用类型 | 137 | def | dual-copy title-prefix |
| k_1784043356780_7iyl1s | 数组 | 647 | — | title-prefix |
| k_1784044129424_ffqm4z | 内部类 | 1900 | jimi-12 | dual-copy |
| k_1784044457709_jt70a4 | 修饰符 | 196 | — | title-prefix |
| k_1784045643688_0g5s3i | 访问修饰符 | 287 | — | title-prefix |
| k_class_programming_relationships | 类间关系 | 25 | — | title-prefix |
| k_1784209528426_drz4ka | 信息隐藏 | 0 | def,k_1784209528426_drz4ka-tab-1784260348184,k_1784209528426_drz4ka-tab-1784260391451 | ptr:参见 |
| k_1784215499175_gyxzee | 创建者模式 | 708 | def,k_1784215499175_gyxzee-tab-1784215545215,k_1784215499175_gyxzee-tab-1784215591378 | title-prefix |
| k_1784222838616_i5ki6j | 软件架构 | 7438 | — | title-prefix ptr:参见 |
| k_1784281148267_2scm9i | 包 | 107 | — | title-prefix |
| k_1784283219004_ytuy5c | 运算符 | 230 | def | dual-copy |
| k_java_syntax_zh_1l9agwm | 字面量 | 989 | def,k_java_syntax_zh_1l9agwm-tab-1784303417063,k_java_syntax_zh_1l9agwm-tab-1784303433684,k_java_syntax_zh_1l9agwm-tab-1784303450318 | title-prefix |
| k_java_syntax_zh_14yyxnj | 线程 | 312 | def | dual-copy title-prefix |
| k_java_syntax_try_with_resources_java_se_7_uldwy1 | try-with-resources 语句（Java SE 7） | 295 | def | dual-copy title-prefix |
| k_java_syntax_j2se_5_0_14b8s2r | 可变参数（J2SE 5.0 引入） | 284 | def | dual-copy |
| k_java_syntax_java_se_8_1nfiybt | 默认方法（Java SE 8） | 1099 | def | dual-copy |
| k_1784340047134_uy6wag | 自动内存管理 | 1093 | — | ptr:参见 |
| k_1784340526295_skm8iw | Servlet | 467 | def,legacy-mysql-glossary-mysql_glossary_servlet_12jp4v,migrated:asplit_http_request_response | title-prefix ptr:另见 |
| k_1784367400813_wlhj68 | 中断 | 324 | — | title-prefix |
| k_acm2012_software_development_control_flow | 控制流 | 99 | — | title-prefix |
| k_1784453158872_rsqoiy | 自动装配 | 522 | def,concept,modes,autowired | title-prefix |
| k_1784543450678_zk199g | 并发控制 | 0 | def,k_1784543450678_zk199g-tab-1784544519787,k_1784543450678_zk199g-tab-1784550862141 | ptr:参见 |
| k_1784656579358_qyfiqk | MVC | 2702 | def,k_1784656579358_qyfiqk-tab-1784656628704,k_1784656579358_qyfiqk-tab-1784656736058,k_1784656579358_qyfiqk-tab-1784656819251,k_1784656579358_qyfiqk-tab-1784656864061,k_1784656579358_qyfiqk-tab-1784656879488 | title-prefix |
| k_1784705186589_4l6rn5 | 事务处理 | 0 | def,k_1784705186589_4l6rn5-tab-1784705222564,k_1784705186589_4l6rn5-tab-1784705248844,k_1784705186589_4l6rn5-tab-1784705602723,k_1784705186589_4l6rn5-tab-1784705735294 | ptr:另见 |
| k_1784705818131_781hut | 事务处理系统 | 1056 | def,k_1784705818131_781hut-tab-1784705851940,k_1784705818131_781hut-tab-1784713141961,k_1784705818131_781hut-tab-1784713181801,k_1784705818131_781hut-tab-1784713391682,k_1784705818131_781hut-tab-1784713425918 | title-prefix |
| k_1784731248425_non832 | 原子性 | 0 | def,tab_1784731378176_kanrre,tab_1784731415833_vo2i6x | ptr:参见 |
| k_1784733045365_qubtp0 | 隔离性 | 2102 | def,tab_1784733076164_71qs1o,tab_1784733079825_enre7d,tab_1784733082479_0tt9ps,tab_1784733087356_tdtm00,tab_1784733090985_yt9cw2,tab_1784734021983_5nrtwi | title-prefix ptr:参见 |
| k_1784735045779_j8quy8 | 分布式算法 | 1148 | def,tab_1784735083856_gy56ex | title-prefix |
| k_wiki_en_outline_of_databases_s4_b16 | 有序共享锁 / ordered shared locks | 122 | def | dual-copy |
| k_wiki_en_outline_of_databases_s5_b5 | SQL（结构化查询语言） | 352 | def | dual-copy |
| k_1784820281347_s0v648 | JIT | 0 | def,tab_1784820566576_k8ne00,tab_1784820465634_0y1x4s,tab_1784820491749_kyfg8a,tab_1784820515194_ky8pwc | ptr:参见 |
| k_wiki_en_database_s10 | 使用案例 | 62 | def | dual-copy title-prefix |
| k_wiki_en_database_s12 | 数据库管理系统 | 0 | def | ptr:另见 |
| k_wiki_en_database_s16 | 贮存 | 584 | def | dual-copy |
| k_wiki_en_database_s18 | 复制 | 136 | def | dual-copy ptr:参见 |
| k_wiki_en_database_s20 | 数据库安全 | 807 | def | dual-copy title-prefix ptr:参见 |
| k_wiki_en_database_s22 | 迁移 | 383 | def | dual-copy ptr:参见 |
| k_wiki_en_virtual_machine_s2 | 系统虚拟机 | 0 | def | ptr:参见 |
| k_wiki_en_virtual_machine_s3 | 处理虚拟机 | 0 | def | ptr:参见 |
| k_wiki_en_linker_computing | 链接器（计算） | 0 | def,sec_1,sec_2,sec_3,sec_4,sec_5,sec_6,sec_7,links | ptr:参见 |
| k_wiki_en_linker_computing_s2 | 动态链接 | 0 | def | ptr:参见 |
| k_wiki_en_monitor_synchronization_s12 | 阻塞条件变量 | 2986 | — | broken-bold |
| k_1784913686973_93yvqh | 锁消除 | 69 | — | title-prefix |
| k_web_8c66406b75e1_s3 | 可见性 | 370 | — | title-prefix |
| k_web_4a06c6e69a03_s2 | static方法 | 658 | — | title-prefix |
| k_web_4a06c6e69a03_s3 | static变量 | 152 | — | title-prefix |
| k_1785224904396_r27gmm | 作用域 | 1550 | tab_1785224926740_rnnus4,tab_1785224926740_1pp2jh,tab_1785224926740_ucbur1,tab_1785224926740_rwia4d,tab_1785224926740_etewsx,scope-list,thread-safety | title-prefix broken-bold glued-code |
| k_1785225243066_ds8pn6 | 生命周期 | 232 | def,stages,methods | title-prefix ptr:见子节点 |
| k_1785228834518_r08hca | @Autowired | 156 | — | title-prefix |
| k_1785228955207_9nqbli | @RequestMapping | 100 | — | title-prefix |
| k_1785231719920_7ljzbg | 通知（Advice） | 80 | def | dual-copy title-prefix |
| k_1785231764171_fxrfdh | 切入点（Pointcut） | 317 | def | dual-copy |
| k_1785231812365_bo891q | 目标对象（Target Object） | 83 | def | dual-copy title-prefix |
| k_1785296821866_imouaf | @Import | 252 | — | title-prefix |
| k_demo_java_abstract_list | AbstractList | 53 | jdk_collection_api_type_15ddd5a5ff0c096f | title-prefix |
| k_demo_java_array_list | ArrayList | 88 | array_list_structure,array_list_operations,array_list_behavior,jdk_collection_api_type_5098f415c102d794,curated_array_list_common_methods | title-prefix |
| k_1785415843679_72mpjo | newFixedThreadPool | 773 | — | glued-code |
| k_1785470590965_2hx6cn | 双向链表 | 88 | — | title-prefix |
| k_demo_java_cloneable | Cloneable | 36 | — | title-prefix |
| k_demo_java_serializable | Serializable | 37 | — | title-prefix |
| k_jdk_type_0db49a13032cc56e | RandomAccess | 43 | jdk_collection_api_type_0db49a13032cc56e | title-prefix |
| k_1785742371669_zng9px | Comparator | 248 | — | title-prefix |
| k_1785747858308_aoqbr5 | Iterator | 336 | — | title-prefix |
| k_1785861900116_paxkvv | as-if-serial语义 | 339 | — | title-prefix |
| k_1785862113423_05qu2c | 顺序一致性 | 61 | — | title-prefix |
| k_1785862311642_1jk0yl | 顺序一致性内存模型 | 319 | — | title-prefix |
| k_1785923744359_zsjik4 | 写final域的重排序规则 | 161 | — | title-prefix |
| k_1785923784597_gvjm4s | 读final域的重排序规则 | 265 | — | title-prefix |
| k_1785943693747_clmf9f | Daemon线程 | 265 | jimi-71 | title-prefix |
| k_1786007130617_bg40je | ThreadLocal的使用 | 979 | def | dual-copy title-prefix broken-bold |
| k_1786016077742_lg5b5a | 队列同步器 | 693 | — | title-prefix |
| k_1786017169554_blpxjf | 重入锁 | 718 | — | title-prefix |
| k_1786027605877_jnqzdw | 锁降级 | 217 | — | title-prefix |
| k_1786029710206_83flz9 | 等待队列 | 318 | — | title-prefix |
| k_1786031340726_4j40cq | 入队列 | 19 | — | title-prefix |
| k_1786031420758_xt48nu | 出队列 | 32 | — | title-prefix |
| k_1786076058461_gu0g51 | Fork/Join框架 | 170 | — | title-prefix |
| k_1786093174816_8f6sp8 | FixedThreadPool | 949 | — | title-prefix |
| k_1786093231291_1p3kk2 | SingleThreadExecutor | 669 | — | title-prefix |
| k_1786093265033_rqvw3n | CachedThreadPool | 1418 | — | title-prefix |
| k_1786095970289_himodp | FutureTask的实现 | 1934 | — | title-prefix |
| k_1786150226096_e6mtto | Zuul | 297 | — | title-prefix |
| k_1786150290711_8qx1ei | 网关 | 38 | — | title-prefix |
| k_1786150440839_bez1t5 | Eureka | 126 | — | title-prefix |
| k_1786154975000_gv2ch5 | Ribbon | 174 | — | title-prefix |
| k_1786158127369_fuypc2 | 服务熔断 | 183 | — | title-prefix |
| k_1786158151129_seziai | 服务隔离 | 78 | — | title-prefix |
| k_1786158208848_mhzb1x | Feign | 136 | — | title-prefix |
| k_1786159351256_5vvl02 | Netﬂix | 233 | — | title-prefix |
| k_1786159519098_i14t11 | Consul | 249 | — | title-prefix |
| k_1786246985753_w4fbw9 | AOF持久化的实现 | 58 | — | title-prefix |
| k_java_source_937c739517d0031f_s_package_c55daee2899f783b | java.lang.reflect | 1303 | — | broken-bold |
| k_1786340565182_pcw4pc | 缓存预热 | 153 | — | title-prefix |
| k_1786336003059_o4habx | super | 260 | — | title-prefix |
| k_1786344805936_k7mhs2 | 匿名内部类 | 514 | — | title-prefix |
| k_1786353277269_msn0ma8wb | SynchronousQueue | 4830 | jimi-4 | dual-copy |
| k_1786353277269_msn0ma8yd | 注解 | 2707 | jimi-11 | dual-copy |
| k_1786353277269_msn0ma98n | Java 9 新特性 | 6802 | jimi-16 | dual-copy |
| k_1786353277269_msn0ma9ap | Tomcat | 9363 | def,jimi-22,legacy-mysql-glossary-mysql_glossary_tomcat_10qwey | ptr:另见 |
| k_1786353277269_msn0ma9et | 内存溢出 | 4763 | jimi-36 | dual-copy |
| k_1786353277269_msn0ma9gv | 高并发架构 | 7031 | jimi-58 | dual-copy |
| k_1786353277269_msn0ma9ix | 进程间通信 | 2164 | jimi-60 | dual-copy |
| k_1786353277269_msn0ma9m11 | 死锁 | 1466 | jimi-78 | dual-copy |
| k_1786353277269_msn0ma9o13 | CAS | 4235 | def,jimi-82 | title-prefix |
| k_java_type_f138c6a30b6bcbd0 | BrokenBarrierException | 329 | java_source_api_type_91c8e1da12c0c8ed | ptr:参见 |
| k_java_type_59e430b99b4f9efe | Callable | 483 | java_source_api_type_93ae53d4fae2cb02 | ptr:参见 |
| k_java_type_de7fa3932e9be0cc | EntrySetView | 331 | java_source_api_type_3875d63cd21652b7 | ptr:参见 |
| k_java_type_fd430440db3c0942 | CopyOnWriteArraySet | 1053 | java_source_api_type_618357cb2a855865 | ptr:参见 |
| k_java_type_ace2aed4ac59cf0e | CyclicBarrier | 1925 | java_source_api_type_3014671d787bad6c | ptr:参见 |
| k_java_type_5df30cf670f09c51 | ExecutionException | 330 | java_source_api_type_d50a6b19304e2320 | ptr:参见 |
| k_java_type_59d3b483ce3e5977 | Future | 1776 | java_source_api_type_d56481712a64b60c | ptr:参见 |
| k_java_type_a86d31441dfef8fb | RunnableFuture | 383 | java_source_api_type_09b1ccf83b5b400c | ptr:参见 |
| k_java_type_057aec148067e61e | RunnableScheduledFuture | 411 | java_source_api_type_9198a623b2854f4f | ptr:参见 |
| k_java_type_c124b60897670690 | StructureViolationException | 323 | java_source_api_type_b32921dfbbfd49f3 | ptr:参见 |
| k_java_type_17598c7e2deaea7f | Joiner | 1876 | java_source_api_type_279b6a20798f88b4 | ptr:参见 |
| k_java_type_a5a4434d11b5f0ef | State | 308 | java_source_api_type_b0eeebb773219c4f | ptr:参见 |
| k_java_type_a8481f0e3557eb32 | TimeoutException | 417 | java_source_api_type_ba1ab77220e8a01e | ptr:参见 |
| k_java_type_ad56ffbb59fc00db | BufferedSubscription | 1571 | java_source_api_type_936a2c4afd05010b | ptr:参见 |
| k_java_type_15fc91a15221b887 | ThreadFactory | 567 | java_source_api_type_544827ec2ed57901 | ptr:参见 |
| k_java_type_ff6db88dc6746818 | ThreadPoolExecutor | 4997 | java_source_api_type_143b95df17bf985e | ptr:参见 |
| k_java_type_862a0b4e8b3aa098 | AbstractQueuedLongSynchronizer | 524 | java_source_api_type_635c3d4508a28b8f | ptr:参见 |
| k_java_type_4033a9a0f1d91289 | Lock | 2220 | java_source_api_type_5b824df6230474b2 | ptr:参见 |
| k_java_type_718e6c3821b48ad6 | ReadWriteLock | 1452 | java_source_api_type_bb5a70ba7dfe784e | ptr:参见 |
| k_java_type_709e71b6780f179a | AccessFlag | 1413 | java_source_api_type_ec38e0765c2ce0bf | ptr:参见 |
| k_java_type_107904219bb9470d | AnnotatedElement | 3475 | java_source_api_type_fce2592b5c02864e | ptr:参见 |
| k_java_type_a6497aad411f5fad | ClassFileFormatVersion | 576 | java_source_api_type_b32349818fa24d54 | ptr:参见 |
| k_java_type_c873ab34e3d97ca1 | Constructor | 537 | java_source_api_type_a0dc2455064c932b | ptr:参见 |
| k_java_type_701f6fbf9393c946 | Field | 410 | java_source_api_type_a56aa31994d5f1d5 | ptr:参见 |
| k_java_type_381e4e8b9e208f59 | InaccessibleObjectException | 338 | java_source_api_type_410fee5e7adf3c5e | ptr:参见 |
| k_java_type_8d16616dbe02f803 | InvocationHandler | 375 | java_source_api_type_b66c4d175e272102 | ptr:参见 |
| k_java_type_b43a91bb9749eb49 | InvocationTargetException | 347 | java_source_api_type_c7faf8a1490242e4 | ptr:参见 |
| k_java_type_498a1429aefe5654 | MalformedParametersException | 584 | java_source_api_type_c6d490ea692abfd8 | ptr:参见 |
| k_java_type_3501bbb1b28e7c1f | Member | 315 | java_source_api_type_d08479602407e926 | ptr:参见 |
| k_java_type_f85a855cf92392f4 | Method | 484 | java_source_api_type_04792e1c501fa41a | ptr:参见 |
| k_java_type_f22c6779e458fbd1 | Modifier | 653 | java_source_api_type_e61c45d34c24f86d | ptr:参见 |
| k_java_type_9e8b2e1c6df5deb9 | Proxy | 3762 | java_source_api_type_9325dc24bdca2ed6 | ptr:参见 |
| k_java_type_bcf70392934f48d6 | RecordComponent | 367 | java_source_api_type_311006459a8efe4c | ptr:参见 |
| k_java_type_770f0283b55b53f3 | ReflectPermission | 389 | java_source_api_type_be4d744fbace874f | ptr:参见 |
| k_java_type_5d28b829d55fb271 | Type | 347 | java_source_api_type_2c6b3af43a79efa0 | title-prefix |
| k_java_type_7033ef0061a29a43 | TypeVariable | 637 | java_source_api_type_6fb39a4ec1f88698 | ptr:参见 |
| k_java_type_f5cfd0880a18a2af | UndeclaredThrowableException | 620 | java_source_api_type_41c4b41604ee95f8 | ptr:参见 |
| school_computation_theory | 计算理论 | 54 | def | title-prefix |
| k_dict_qttpkbhf | Python | 164 | definition,legacy-mysql-glossary-k_dict_qttpkbhf | title-prefix |
| mysql:theme:storage-engines | 存储引擎层 | 200 | def | title-prefix |
| mysql:sql:dml | MySQL DML / 数据操作语言 | 59 | def | dual-copy |
| mysql:sql:ddl | MySQL DDL / 数据定义语言 | 195 | def | dual-copy |
| mysql:sql:tcl | MySQL TCL / 事务控制语言 | 72 | def | dual-copy |
| mysql_glossary_java_uspy11 | Java | 195 | def | dual-copy ptr:另见 |
| mysql_glossary_servlet_12jp4v | servlet | 101 | def | dual-copy ptr:另见 |
| mysql_glossary_tomcat_10qwey | Tomcat | 206 | def | dual-copy ptr:另见 |
| mysql:concept:server | MySQL Server | 52 | def | title-prefix |
| k_1782029618563_7rrguo:composition | 组成 | 24 | def | title-prefix |
| k_1782029618563_7rrguo:structure | 结构 | 24 | def | title-prefix |
| mysql:concept:data-files:myisam:node | MyISAM 文件 | 28 | def | title-prefix |
| mysql:concept:data-files:innodb-tablespaces:node | InnoDB 表空间文件 | 31 | def | title-prefix |
| mysql:concept:data-files:other-engines:node | 其他存储引擎文件 | 27 | def | title-prefix |
| k_1782029643146_aumkky:composition | 组成 | 24 | def | title-prefix |
| k_1782029643146_aumkky:structure | 结构 | 24 | def | title-prefix |
| k_1782029505237_7y8fh8:composition | 组成 | 24 | def | title-prefix |
| k_1782029505237_7y8fh8:structure | 结构 | 24 | def | title-prefix |
| mysql_runtime_files:composition | 组成 | 25 | def | title-prefix |
| k_1782029470422_yfa3u9:composition | 组成 | 25 | def | title-prefix |
| mysql:concept:server:structure | 结构 | 32 | def | title-prefix |
| mysql_topic_indexes_access | 索引与访问路径 | 48 | def | title-prefix |
| k_1787209372193_jgoudp | MySQL 页 / page | 122 | def | dual-copy title-prefix |
| k_1787237097249_1ld0tb | 清理操作 / Purge Operation | 171 | def | dual-copy |
| k_1787315799359_ne8gfs | 客户端连接器 / client connectors | 119 | def | dual-copy title-prefix |
| concept_compression | 数据压缩 / data compression | 95 | def,example | ptr:另见 |
| concept_mutex | 互斥量 / mutex | 79 | def,example | title-prefix |
| concept_spin_wait | 自旋 / spin | 55 | def,example | title-prefix |
| concept_atomic_instruction | 原子指令 / atomic instruction | 125 | def,example | title-prefix |
| concept_load_balancing | 负载均衡 / load balancing | 126 | def,example | title-prefix |
| concept_heartbeat | 心跳 / heartbeat | 90 | def,example | title-prefix |
| concept_scale_out | 向外扩展 / scale out | 112 | def,example | title-prefix |
| concept_scale_up | 向上扩展 / scale up | 111 | def,example | title-prefix |
| concept_inverted_index | 倒排索引 / inverted index | 133 | def,example | title-prefix |
| concept_surrogate_key | 代理键 / surrogate key | 82 | def,example | title-prefix |
| concept_natural_key | 自然键 / natural key | 54 | def,example | title-prefix |
| concept_relational | 关系型 / relational | 113 | def,example | title-prefix |
| concept_schema | 模式 / schema | 103 | def,example | title-prefix |
| concept_prepared_statement | 预处理语句 / prepared statement | 81 | def,example | title-prefix |
| concept_primary_key | 主键 | 139 | def,example | title-prefix ptr:见子节点 |
| concept_unique_key | 唯一键 / unique key | 79 | def,example | title-prefix |
| concept_foreign_key | 外键 / foreign key | 155 | def,example | title-prefix |
| concept_not_null_constraint | NOT NULL 约束 / NOT NULL constraint | 59 | def,example | title-prefix |
| concept_variable_length_type | 可变长度类型 / variable-length type | 78 | def,example | title-prefix |
| concept_blob | BLOB / binary large object | 106 | def,example | title-prefix |
| concept_clob | CLOB / character large object | 97 | def,example | title-prefix |
| concept_stored_object | 存储对象 / stored object | 91 | def,example | title-prefix |
| concept_pthreads | Pthreads / POSIX 线程 | 153 | def,example | title-prefix |
| concept_checkpoint | 检查点 / checkpoint | 134 | def,example | title-prefix |
| concept_dirty_page | 脏页 / dirty page | 137 | def,example | title-prefix |
| concept_lru_list | LRU 链表 / LRU list | 140 | def,example | title-prefix |
| concept_change_buffer | 变更缓冲 / change buffering | 115 | def,example | title-prefix |
| concept_redo_log | 重做日志 / redo log | 142 | def,example | title-prefix |
| concept_undo_log | 撤销日志 / undo log | 145 | def,example | title-prefix |
| concept_mvcc | 多版本并发控制 | 138 | def,example | title-prefix |
| concept_deadlock | 死锁 / deadlock | 118 | def,example | title-prefix |
| concept_deadlock_detection | 死锁检测 / deadlock detection | 106 | def,example | title-prefix |
| concept_rollback | 回滚 / rollback | 103 | def,example | title-prefix |
| concept_shared_lock | 共享锁 / shared lock | 263 | def,example | title-prefix |
| concept_gap_lock | 间隙锁 / gap lock | 110 | def,example | title-prefix |
| concept_next_key_lock | 临键锁 / next-key lock | 97 | def,example | title-prefix |
| concept_lock_escalation | 锁升级 / lock escalation | 129 | def,example | title-prefix |
| concept_row_level_locking | 行级锁定 / row-level locking | 117 | def,example | title-prefix |
| concept_dirty_read | 脏读 / dirty read | 126 | def,example | title-prefix |
| concept_index | 索引 / index | 109 | def,example | title-prefix |
| concept_unique_index | 唯一索引 / unique index | 101 | def,example | title-prefix |
| concept_hash_index | 哈希索引 / hash index | 95 | def,example | title-prefix |
| concept_covering_index | 覆盖索引 / covering index | 103 | def,example | title-prefix |
| concept_partial_index | 部分索引 / partial index | 112 | def,example | title-prefix |
| concept_fulltext_index | 全文索引 / full-text index | 119 | def,example | title-prefix |
| concept_adaptive_hash_index | 自适应哈希索引 / adaptive hash index | 114 | def,example | title-prefix |
| concept_backup | 备份 / backup | 123 | def,example | title-prefix |
| concept_hot_backup | 热备份 / hot backup | 113 | def,example | title-prefix |
| concept_warm_backup | 温备份 / warm backup | 85 | def,example | title-prefix |
| concept_cold_backup | 冷备份 / cold backup | 85 | def,example | title-prefix |
| concept_logical_backup | 逻辑备份 / logical backup | 113 | def,example | title-prefix |
| concept_physical_backup | 物理备份 / physical backup | 97 | def,example | title-prefix |
| concept_full_backup | 完整备份 / full backup | 65 | def,example | title-prefix |
| concept_incremental_backup | 增量备份 / incremental backup | 88 | def,example | title-prefix |
| concept_partial_backup | 部分备份 / partial backup | 76 | def,example | title-prefix |
| concept_compressed_backup | 压缩备份 / compressed backup | 82 | def,example | title-prefix |
| concept_restore | 恢复 / restore | 139 | def,example | title-prefix |
| concept_crash_recovery | 崩溃恢复 / crash recovery | 110 | def,example | title-prefix |
| concept_crash | 崩溃 / crash | 112 | def,example | title-prefix |
| concept_startup | 启动 / startup | 110 | def,example | title-prefix |
| concept_quiesce | 静默 / quiesce | 89 | def,example | title-prefix |
| concept_buffer | 缓冲区 / buffer | 119 | def,example | title-prefix |
| concept_bottleneck | 瓶颈 / bottleneck | 109 | def,example | title-prefix |
| concept_workload | 工作负载 / workload | 93 | def,example | title-prefix |
| concept_cpu_bound | CPU 密集型 / CPU-bound | 91 | def,example | title-prefix |
| concept_io_bound | I/O 密集型 / I/O-bound | 103 | def,example | title-prefix |
| concept_scalability | 可伸缩性 / scalability | 105 | def,example | title-prefix |
| concept_throughput_tps | 每秒事务数 / TPS | 109 | def,example | title-prefix |
| concept_wait | 等待 / wait | 95 | def,example | title-prefix |
| concept_counter | 计数器 / counter | 101 | def,example | title-prefix |
| concept_optimizer_statistics | 统计信息 / optimizer statistics | 119 | def,example | title-prefix |
| concept_cache | 缓存 / cache | 114 | def,example | title-prefix |
| concept_hot | 热 / hot | 86 | def,example | title-prefix |
| concept_stored_program | 存储程序 / stored program | 196 | def,example | title-prefix |
| concept_data_dictionary | 数据字典 / data dictionary | 171 | def,example | title-prefix |
| concept_integer_type | 整数类型 / integer type | 114 | def,example | title-prefix |
| concept_real_type | 实数类型 / real type | 117 | def,example | title-prefix |
| concept_string_type | 字符串类型 / string type | 104 | def,example | title-prefix |
| concept_enum_type | 枚举类型 / enum type | 102 | def,example | title-prefix |
| concept_exclusive_lock | 排他锁 / exclusive lock | 262 | def,example | title-prefix |
| concept_optimistic_lock | 乐观锁 / optimistic lock | 110 | def,example | title-prefix |
| concept_pessimistic_lock | 悲观锁 / pessimistic lock | 97 | def,example | title-prefix |
| concept_intention_lock | 意向锁 / intention lock | 98 | def,example | title-prefix |
| concept_record_lock | 记录锁 / record lock | 64 | def,example | title-prefix |
| concept_table_level_locking | 表级锁 / table-level locking | 89 | def,example | title-prefix |
| concept_auto_increment_lock | 自增锁 / auto-increment lock | 118 | def,example | title-prefix |
| concept_insert_intention_lock | 插入意向锁 / insert intention lock | 97 | def,example | title-prefix |
| concept_implicit_row_lock | 隐式行锁 / implicit row lock | 118 | def,example | title-prefix |
| concept_latch | 闩锁 / latch | 104 | def,example | title-prefix |
| concept_non_locking_read | 非锁定读 / non-locking read | 93 | def,example | title-prefix |
| concept_locking_read | 锁定读 / locking read | 83 | def,example | title-prefix |
| concept_lock_mode | 锁模式 / lock mode | 86 | def,example | title-prefix |
| concept_lock_mechanism | 锁机制 / locking mechanism | 103 | def,example | title-prefix |
| concept_transaction | 事务 / transaction | 91 | def,example | title-prefix |
| concept_transaction_lifecycle | 事务生命周期 / transaction lifecycle | 117 | def,example | title-prefix |
| concept_transaction_management | 事务管理 / transaction management | 106 | def,example | title-prefix |
| concept_read_phenomena | 读现象 / read phenomena | 83 | def,example | title-prefix |
| concept_consistent_read | 一致性读取 / consistent read | 98 | def,example | title-prefix |
| concept_concurrency | 并发 / concurrency | 95 | def,example | title-prefix |
| concept_victim | 受害者 / victim | 86 | def,example | title-prefix |
| concept_lost_update | 丢失更新 / lost update | 89 | def,example | title-prefix |
| concept_global_transaction | 全局事务 / global transaction | 87 | def,example | title-prefix |
| concept_transaction_id | 事务ID / transaction ID | 97 | def,example | title-prefix |
| concept_read_only_transaction | 只读事务 / read-only transaction | 78 | def,example | title-prefix |
| concept_query_optimizer | 查询优化器 / query optimizer | 108 | def,example | title-prefix |
| concept_query_execution_plan | 查询执行计划 / query execution plan | 113 | def,example | title-prefix |
| concept_full_table_scan | 全表扫描 / full table scan | 87 | def,example | title-prefix |
| concept_selectivity | 选择性 / selectivity | 80 | def,example | title-prefix |
| concept_index_hint | 索引提示 / index hint | 79 | def,example | title-prefix |
| concept_parser | 解析器 / parser | 81 | def,example | title-prefix |
| concept_join | 连接 / join | 85 | def,example | title-prefix |
| concept_subquery | 子查询 / subquery | 96 | def,example | title-prefix |
| concept_insert | 插入 / insert | 100 | def,example | title-prefix |
| concept_delete | 删除 / delete | 78 | def,example | title-prefix |
| concept_truncate | 截断 / truncate | 89 | def,example | title-prefix |
| concept_drop | 落下 / drop | 68 | def,example | title-prefix |
| concept_table | 表 / table | 77 | def,example | title-prefix |
| concept_column | 列 / column | 65 | def,example | title-prefix |
| concept_row | 行 / row | 59 | def,example | title-prefix |
| concept_database | 数据库 / database | 92 | def,example | title-prefix |
| concept_btree_index | B+树索引 / B-tree index | 80 | def,example | title-prefix |
| concept_composite_index | 组合索引 / composite index | 97 | def,example | title-prefix |
| concept_secondary_index | 二级索引 / secondary index | 295 | def,example | title-prefix |
| concept_prefix_index | 前缀索引 / prefix index | 71 | def,example | title-prefix |
| concept_descending_index | 降序索引 / descending index | 85 | def,example | title-prefix |
| concept_virtual_index | 虚拟索引 / virtual index | 78 | def,example | title-prefix |
| concept_column_index | 列索引 / column index | 56 | def,example | title-prefix |
| concept_index_statistics | 索引统计 / index statistics | 76 | def,example | title-prefix |
| concept_cardinality | 基数 / cardinality | 76 | def,example | title-prefix |
| concept_fill_factor | 填充因子 / fill factor | 72 | def,example | title-prefix |
| concept_generated_column | 生成列 / generated column | 75 | def,example | title-prefix |
| concept_temporary_table | 临时表 / temporary table | 75 | def,example | title-prefix |
| concept_referential_integrity | 参照完整性 / referential integrity | 89 | def,example | title-prefix |
| concept_child_table | 子表 / child table | 58 | def,example | title-prefix |
| concept_parent_table | 父级表 / parent table | 69 | def,example | title-prefix |
| concept_connection | 连接 / connection | 69 | def,example | title-prefix |
| concept_connection_pool | 连接池 / connection pool | 71 | def,example | title-prefix |
| concept_partitioning | 分区 / partitioning | 78 | def,example | title-prefix |
| concept_storage_engine | 存储引擎 / storage engine | 83 | def,example | title-prefix |
| concept_dql | DQL / 数据查询语言 | 142 | def,example | title-prefix |
| concept_dml | DML / 数据操作语言 | 119 | def,example | title-prefix |
| concept_ddl | DDL / 数据定义语言 | 135 | def,example | title-prefix |
| concept_dcl | DCL / 数据控制语言 | 105 | def,example | title-prefix |
| concept_tcl | TCL / 事务控制语言 | 151 | def,example | title-prefix |
| concept_delimited_identifier | 分隔标识符 / delimited identifier | 144 | def,example | title-prefix |
| concept_dynamic_sql | 动态 SQL / dynamic SQL | 110 | def,example | title-prefix |
| concept_online_ddl | 在线 DDL / online DDL | 98 | def,example | title-prefix |
| concept_atomic_ddl | 原子 DDL / atomic DDL | 98 | def,example | title-prefix |
| concept_mini_transaction | 小型事务 / mini-transaction | 141 | def,example | title-prefix |
| concept_performance_schema | 性能模式 / performance schema | 95 | def,example | title-prefix |
| concept_lock_wait_timeout | 锁等待超时 / lock wait timeout | 100 | def,example | title-prefix |
| concept_configuration_option | 配置选项 / configuration option | 92 | def,example | title-prefix |
| concept_authentication_server | 认证服务器 / authentication server | 116 | def,example | title-prefix |
| concept_ticket_granting_server | 票证授予服务器 / ticket-granting server | 119 | def,example | title-prefix |
| concept_ticket_granting_ticket | 票证授予票证 / ticket-granting ticket | 109 | def,example | title-prefix |
| concept_key_distribution_center | 密钥分发中心 / key distribution center | 96 | def,example | title-prefix |
| concept_principal | 主体 / principal | 74 | def,example | title-prefix |
| concept_service_principal_name | 服务主体名称 / service principal name | 88 | def,example | title-prefix |
| concept_service_ticket | 服务票据 / service ticket | 80 | def,example | title-prefix |
| concept_user_principal_name | 用户主体名称 / user principal name | 67 | def,example | title-prefix |
| concept_partial_trust | 部分信任 / partial trust | 111 | def,example | title-prefix |
| concept_keystore | 密钥库 / keystore | 50 | def,example | title-prefix |
| concept_truststore | 信任库 / truststore | 60 | def,example | title-prefix |
| concept_ssl | 安全套接层 / SSL | 68 | def,example | title-prefix |
| concept_tablespace | 表空间 / tablespace | 88 | def,example | title-prefix |
| concept_segment | 段 / segment | 81 | def,example | title-prefix |
| concept_extent | 区段 / extent | 85 | def,example | title-prefix |
| concept_page | 页 / page | 92 | def,example | title-prefix |
| concept_page_size | 页大小 / page size | 84 | def,example | title-prefix |
| concept_rollback_segment | 回滚段 / rollback segment | 92 | def,example | title-prefix |
| concept_undo_log_segment | 撤销日志段 / undo log segment | 85 | def,example | title-prefix |
| concept_undo_tablespace | 撤销表空间 / undo tablespace | 91 | def,example | title-prefix |
| concept_shared_tablespace | 共享表空间 / shared tablespace | 95 | def,example | title-prefix |
| concept_system_tablespace | 系统表空间 / system tablespace | 76 | def,example | title-prefix |
| concept_independent_tablespace | 独立表空间 / independent tablespace | 89 | def,example | title-prefix |
| concept_query_processing | 查询处理 / query processing | 258 | def,example | ptr:见子节点 |
| concept_index_condition_pushdown | 索引条件下推 / index condition pushdown | 108 | def,example | title-prefix |
| concept_sort_buffer | 排序缓冲区 / sort buffer | 85 | def,example | title-prefix |
| concept_blind_query_expansion | 盲查询扩展 / blind query expansion | 86 | def,example | title-prefix |
| concept_random_dive | 随机探查 / random dive | 72 | def,example | title-prefix |
| concept_relevance | 相关性 / relevance | 69 | def,example | title-prefix |
| concept_stemming | 词干提取 / stemming | 60 | def,example | title-prefix |
| concept_sentinel_record | 哨兵记录 / sentinel record | 107 | def,example | title-prefix |
| concept_tablespace_id | 表空间标识符 / tablespace ID | 82 | def,example | title-prefix |
| concept_transportable_tablespace | 可传输表空间 / transportable tablespace | 92 | def,example | title-prefix |
| concept_guid | 全局唯一标识符 / GUID | 114 | def,example | title-prefix |
| concept_instance | 实例 / instance | 85 | def,example | title-prefix |
| concept_host | 主机 / host | 54 | def,example | title-prefix |
| k_1787723404548_tjn9xx | 测试 | 546 | — | title-prefix |
| k_1787723651360_r3tqg7 | 关键字 | 177 | — | title-prefix |
| k_goexplain_syntax | 语法 | 405 | — | title-prefix |
| k_go_concurrency | 并发 | 3827 | — | title-prefix ptr:参见 |
| k_1787731983101_tjcyzw | 使用参数化类型的泛型代码 | 619 | — | title-prefix |
| k_1787732124349_hzf0jj | 包 | 318 | — | title-prefix |
| k_1787756263750_uhfc6q | 创建 | 191 | — | title-prefix |
| k_1787756977195_m3axzg | 例子 | 742 | — | title-prefix |
| k_1787759011267_pvd61e | Math | 151 | — | title-prefix |
| k_1787760075739_onhtjj | Optional | 165 | — | title-prefix |
| k_1787825132971_9zuv8m | 方法调用 | 321 | — | title-prefix |
| k_1787826022705_8dho41 | 变量作用域 | 222 | — | title-prefix |
| k_1787827423100_lq4zw2 | 算术运算符 | 517 | — | title-prefix ptr:详见 |
| k_1787889496705_wo1lig | java.util.Date | 610 | — | title-prefix |
| k_1787895068080_fnyw97 | Calendar | 938 | — | title-prefix |
| k_1787908911524_25jkdf | 函数式接口 | 3336 | — | title-prefix |
| k_1787913909033_kvb8jo | Lambda 表达式 | 295 | — | title-prefix |
| k_io_zero_copy | 零拷贝（Zero Copy） | 3057 | def | dual-copy |
| k_nio_socket_channel | SocketChannel（TCP客户端通道） | 1908 | def | dual-copy title-prefix |
| k_nio_server_socket_channel | ServerSocketChannel（TCP服务端通道） | 1273 | def | dual-copy title-prefix |
| k_vault_java02_3knqf8 | 线性结构 | 419 | def | dual-copy title-prefix |
| k_vault_java03_8t6qkp | 哈希结构 | 363 | def | dual-copy title-prefix |
| k_vault_java07_1t5zsh | 算法思想 | 362 | def | dual-copy title-prefix |
| k_vault_java08_1gtqpv | 工程中的算法模型 | 380 | def | dual-copy title-prefix |
| k_vault_java01_1urtc4 | 分布式系统模型 | 296 | def | dual-copy title-prefix |
| k_vault_java02_yikc89 | 分布式事务 | 423 | def | dual-copy title-prefix |
| k_vault_java03_1esy07 | 分布式锁 | 321 | def | dual-copy title-prefix |
| k_vault_java_1p2nxk | 分布式任务调度 | 944 | def | dual-copy title-prefix |
| k_vault_javajvm00jvm_1bt7uj | JVM 知识地图 | 1163 | def | dual-copy title-prefix |
| k_vault_javajvm01jvm_1h8bru | JVM 核心概念 | 1670 | def | dual-copy |
| k_vault_javajvm02_5esqz0 | 类加载机制（学习笔记） | 1348 | def | dual-copy title-prefix |
| k_vault_javajvm04jvm_i15q6w | JVM 参数与调优（学习笔记） | 1330 | def | dual-copy title-prefix |
| k_vault_javajvm05jvm_v8wpw8 | JVM 排障实战 | 1611 | def | dual-copy title-prefix |
| k_vault_java_1n4uei | 线程池详解 | 13001 | def | dual-copy title-prefix |
| k_vault_javajava_vzjv8p | Java 多线程编程 | 8639 | def | dual-copy title-prefix |
| k_vault_javasynchronized_czjq2n | Synchronized 关键字 | 1771 | def | dual-copy title-prefix |
| k_vault_javajava_vb7ofw | Java 封装 | 424 | def | dual-copy title-prefix |
| k_vault_java_378vi0 | 成员内部类 | 125 | def | dual-copy title-prefix |
| k_vault_java_73fnjs | 静态内部类 | 315 | def | dual-copy title-prefix |
| k_vault_javajava_i6gh44 | Java 继承 | 503 | def | dual-copy title-prefix |
| k_vault_javajava_c4k5g5 | Java 多态 | 328 | def | dual-copy title-prefix |
| k_vault_javajava_sfczzr | Java 抽象类 | 332 | def | dual-copy title-prefix |
| k_vault_javajava_1ftk5m | Java 接口 | 469 | def | dual-copy title-prefix |
| k_vault_javajava_25ottv | Java 修饰符 | 436 | def | dual-copy title-prefix |
| k_vault_javajava_ezumc3 | Java 泛型 | 476 | def | dual-copy title-prefix |
| k_vault_javajavaoverrideoverload_18u2us | 重写（Override）与重载（Overload） | 3707 | def | dual-copy title-prefix |
| k_vault_java_1vxm5o | 常用关键字速记（static/final） | 685 | def | dual-copy title-prefix |
| k_vault_javajava_4vovhq | Java 异常处理（教程） | 13037 | def | dual-copy title-prefix |
| k_vault_javajavaarraylist_an0rm3 | ArrayList 详解 | 7717 | def | dual-copy title-prefix |
| k_vault_javajavalinkedlist_1uc0ii | LinkedList 详解 | 8368 | def | dual-copy title-prefix |
| k_vault_javajavahashmap_14a6f2 | HashMap 详解 | 6659 | def | dual-copy title-prefix |
| k_vault_javajavahashset_176pvr | HashSet 详解 | 4565 | def | dual-copy title-prefix |
| k_vault_javajava8stream_rcy19a | Java 8 Stream | 19637 | def | dual-copy title-prefix |
| k_vault_javajava_1xf3hv | Java 网络编程（Socket） | 6757 | def | dual-copy title-prefix glued-table |
| k_vault_javajavamysql_66tav5 | JDBC 连接 MySQL | 3342 | def | dual-copy title-prefix |
| k_vault_javajava_9w1am | Java 发送邮件（JavaMail） | 8891 | def | dual-copy title-prefix |
| k_vault_javajavacharacter_1wdwf5 | Character 类 | 1844 | def | dual-copy title-prefix |
| k_java_fw_javaweb | JavaWeb | 508 | def | dual-copy title-prefix |
| k_vault_javajavawebjsp_elp41h | JSP | 79 | def | dual-copy title-prefix |
| k_java_fw_spring | Spring | 9 | def | title-prefix |
| k_java_fw_spring_aop | AOP | 200 | def | dual-copy |
| k_vault_javaspringaopspringaop_1fz8q2 | 代理方式 | 83 | def | ptr:见子节点 |
| k_java_fw_spring_ioc | IoC容器 | 216 | def | dual-copy |
| k_java_fw_spring_boot | Spring Boot | 171 | def | title-prefix |
| k_vault_javaspringspringboot_lhipgq | Spring Boot 原理 | 191 | def | dual-copy |
| k_vault_javaspringspringboot_yjdx1u | Spring Boot 安全 | 81 | def | title-prefix |
| k_vault_javaspringspringboot_woqe5o | Spring Boot 缓存 | 462 | def | title-prefix |
| k_vault_javaspringspringboot_1rp75f | Spring Boot 热加载 | 661 | def | title-prefix |
| k_vault_javaspringspringboot_1qq545 | Spring Boot 监视器 | 457 | def | title-prefix |
| k_vault_javaspringspringboot_g9wkoh | Spring Boot 整合第三方 | 80 | def | title-prefix |
| k_vault_javaspringspring4_bn9s51 | Spring 4 新特性 | 774 | def | dual-copy title-prefix |
| k_vault_javaspringspring5_qbo2d2 | Spring 5 新特性 | 1242 | def | dual-copy title-prefix |
| k_vault_javaspringjsr310api_17qbfx | JSR310 日期 API 支持 | 595 | def | dual-copy title-prefix |
| k_vault_javaspringweb_dxr6ot | Spring 新特性之 Web 开发增强 | 533 | def | dual-copy title-prefix |
| k_vault_javaspring_1antjp | Spring 配置 | 93 | def,evolution | title-prefix |
| k_vault_javaspringspring_7b4q3y | Spring 注解 | 1472 | def | dual-copy title-prefix |
| k_java_fw_spring_valid | 验证 | 1768 | def | dual-copy title-prefix |
| k_vault_javaspringel_17n463 | 验证消息中使用 EL 表达式 | 482 | def | dual-copy title-prefix |
| k_vault_javaspring_x40su7 | 类级别验证器 | 234 | def | dual-copy title-prefix |
| k_vault_javaspring_12ziva | 自定义验证规则 | 962 | def | dual-copy title-prefix |
| k_vault_javaspring_106727 | 返回值验证 | 343 | def | title-prefix |
| k_vault_javaspringbeanvalidation11springmvc_1b3bqh | 集成 Bean Validation 1.1 到 SpringMVC | 507 | def | dual-copy title-prefix |
| k_java_fw_mybatis | Mybatis | 671 | def | dual-copy title-prefix |
| k_vault_javamybatismybatis_14eqlq | MyBatis | 1767 | def | dual-copy title-prefix |
| k_vault_javamybatis02sqlsession_5c5wcf | SqlSession 生命周期 | 914 | def | dual-copy |
| k_vault_javamybatis03mybatis_17ypok | MyBatis 配置体系 | 952 | def | dual-copy title-prefix |
| k_vault_javamybatis06mybatisspring_wq41yx | MyBatis-Spring 整合 | 755 | def | dual-copy title-prefix |
| k_vault_javamybatis07mybatis_leuyf9 | MyBatis 工程实践 | 577 | def | dual-copy title-prefix |
| k_vault_javamybatisplus_1srs85 | MyBatis-Plus | 769 | def | dual-copy title-prefix |
| k_vault_javamybatisplusmybatisplus_193zda | MyBatis-Plus 常用对象 | 310 | def | dual-copy title-prefix |
| k_vault_javamybatishibernateibatis_1mvvfq | Hibernate 和 iBatis 的区别 | 3076 | def | dual-copy title-prefix |
| k_vault_javamybatismybatis_1pkfbo | MyBatis 的连接池 | 3041 | def | dual-copy title-prefix |
| k_vault_javamybatis_p3kuh0 | MyBatis-Plus 条件构造器 | 2981 | def | dual-copy title-prefix |
| k_java_fw_netty | Netty | 444 | def | dual-copy title-prefix |
| k_java_fw_kafka | Kafka | 393 | def | dual-copy title-prefix |
| k_vault_javakafkakafka_1qlqb8 | Kafka 定位总览 | 1042 | def | dual-copy title-prefix |
| k_vault_javakafka04_1s6eok | Kafka 顺序、吞吐与适用场景 | 265 | def | dual-copy title-prefix |
| k_java_fw_rabbitmq | RabbitMQ | 414 | def | dual-copy title-prefix |
| k_vault_javarabbitmq01mq_j62j4c | MQ 为什么存在 | 336 | def | dual-copy title-prefix |
| k_vault_javarabbitmq02rabbitmq_wrgcym | RabbitMQ 核心模型 | 393 | def | dual-copy title-prefix |
| k_vault_javarabbitmq05rabbitmqkafka_16ryk1 | RabbitMQ 与 Kafka 选型 | 293 | def | dual-copy title-prefix |
| k_java_fw_springcloud | Spring Cloud | 519 | def | dual-copy title-prefix |
| k_vault_javaspringcloudspringcloud_33p5su | Spring Cloud 定位总览 | 288 | def | title-prefix |
| k_vault_javaspringcloud01springcloud_1gr4uj | Spring Cloud 定位与系统问题 | 223 | def | title-prefix |
| k_vault_javaspringcloud06springcloud_acgmi2 | Spring Cloud 生态与技术选型 | 517 | def | dual-copy title-prefix |
| k_sql_explain | SQL 执行计划（EXPLAIN） | 2078 | def | dual-copy title-prefix |
| k_vault_arch_cqrs | CQRS | 0 | def | ptr:参见 |
| k_vault_arch_id_snowflake | Snowflake | 912 | def | dual-copy |
| container:governance:javascript:module-import | 模块系统 / Import | 77 | def | title-prefix |
| container:governance:javascript:module-export | 模块系统 / Export | 70 | def | title-prefix |
| leftmost_prefix_rule | 最佳左前缀法则 / leftmost prefix rule | 68 | def | title-prefix |
| lpf_case_in_order | 场景一：按索引列顺序使用（全命中） | 160 | def | dual-copy title-prefix |
| lpf_case_skip_left | 场景二：跳过最左列（索引失效） | 118 | def | dual-copy title-prefix |
| lpf_case_reordered | 场景三：条件乱序（优化器重排，仍命中） | 189 | def | dual-copy title-prefix |
| joint_index_sort_structure | 联合索引排序结构（底层原理） | 171 | def | dual-copy title-prefix |
| jis_first_column_global | 第一列：全局有序 | 69 | def | dual-copy title-prefix |
| jis_second_column_local | 第二列及以后：仅局部有序 | 57 | def | title-prefix |
| jis_skip_leftmost_corollary | 推论：跳过最左列无法定位 | 75 | def | dual-copy title-prefix |
| btree_structure | B+树底层结构 | 170 | def | title-prefix |
| bts_root_page | 根节点 / root page | 62 | def | title-prefix |
| bts_internal | 内部节点 / internal page | 104 | def | dual-copy title-prefix |
| bts_slot | 页内槽 / page directory | 99 | def | dual-copy title-prefix |
| bts_key_ptr | 键 + 子页指针 | 70 | def | dual-copy title-prefix |
| bts_leaf | 叶子节点 / leaf page | 85 | def | dual-copy title-prefix |
| bts_entry | 索引条目（键 + 行定位） | 79 | def | dual-copy title-prefix |
| bts_double_linked | 叶子双向链表 | 88 | def | dual-copy title-prefix |
| bts_pointers | 层间指针（连线语义） | 103 | def | dual-copy title-prefix |
| lock_taxonomy | MySQL 锁的分类体系 | 123 | def | dual-copy title-prefix |
| lock_by_type | 按操作类型分（读锁 / 写锁） | 399 | def | dual-copy title-prefix |
| lock_by_grain | 按粒度分（表 / 行 / 页） | 177 | def | dual-copy title-prefix |
| lock_by_perf | 按操作性能分（乐观 / 悲观） | 149 | def | dual-copy title-prefix |
| lock_page_size | 页面锁 / page lock | 107 | def | dual-copy title-prefix |
| msr_overview | MySQL 主从复制 | 113 | def | dual-copy title-prefix |
| msr_purpose | 用途 | 70 | def | dual-copy title-prefix |
| msr_prereq | 部署必要条件 | 82 | def | dual-copy title-prefix |
| msr_principle | 复制原理 | 151 | def | dual-copy title-prefix |
| msr_flow | 复制流程（三线程） | 78 | def | dual-copy title-prefix ptr:见子节点 |
| msr_dump_thread | binlog dump 线程（主库） | 127 | def | dual-copy title-prefix |
| msr_io_thread | I/O 线程（从库） | 109 | def | dual-copy |
| msr_sql_thread | SQL 线程（从库） | 84 | def | dual-copy title-prefix |
| msr_master_db | 主库 db（Master） | 61 | def | title-prefix |
| msr_relay_log | relay log（中继日志） | 119 | def | dual-copy title-prefix |
| msr_slave_db | 从库 db（Slave） | 63 | def | title-prefix |
| msr_state_written | 事件已写入 binlog | 43 | def | title-prefix |
| msr_state_sent | 事件已发送 | 38 | def | title-prefix |
| msr_state_relayed | 事件已入 relay log | 44 | def | title-prefix |
| msr_state_replayed | 事件已重放 | 44 | def | title-prefix |
| msr_state_consistent | 主从数据一致 | 29 | def | title-prefix |
| join_types | JOIN 的连接方式 | 122 | def | dual-copy title-prefix |
| join_driving_table | 驱动表 | 146 | def | dual-copy title-prefix |
| join_algorithms | JOIN 的三种执行算法 | 95 | def | dual-copy title-prefix ptr:见子节点 |
| join_snl | 简单嵌套循环连接（SNL） | 431 | def | dual-copy title-prefix |
| join_inl | 索引嵌套循环连接（INL） | 279 | def | dual-copy title-prefix |
| join_bnl | 块嵌套循环连接（BNL） | 477 | def | dual-copy title-prefix |
| join_principles | JOIN 优化原则 | 256 | def | dual-copy title-prefix |
| explain_type | EXPLAIN 的 type 字段（访问类型） | 401 | def | dual-copy title-prefix ptr:见子节点 |
| explain_type_system | type = system | 49 | def | title-prefix |
| explain_type_const | type = const | 56 | def | title-prefix |
| explain_type_eq_ref | type = eq_ref | 92 | def | dual-copy title-prefix |
| explain_type_ref | type = ref | 55 | def | title-prefix |
| explain_type_range | type = range | 76 | def | dual-copy title-prefix |
| explain_type_index | type = index | 73 | def | dual-copy title-prefix |
| explain_type_all | type = ALL | 53 | def | title-prefix |
| pagination_overview | MySQL 分页查询优化 | 91 | def | dual-copy title-prefix ptr:见子节点 |
| pagination_basic | LIMIT 一般性分页 | 137 | def | dual-copy title-prefix ptr:见子节点 |
| pagination_exp_offset | 实验一：偏移量固定，返回量变化 | 272 | def | dual-copy title-prefix |
| pagination_exp_count | 实验二：返回量固定，偏移量变化 | 304 | def | dual-copy title-prefix |
| pagination_opt_index | 优化1：通过索引进行分页 | 195 | def | dual-copy title-prefix |
| pagination_opt_subquery | 优化2：利用子查询优化 | 266 | def | dual-copy title-prefix |
| pagination_opt_wrapper | 分页优化方案 | 210 | def | dual-copy title-prefix ptr:见子节点 |
| slowlog_mysql | MySQL 慢查询日志实践 | 186 | def | dual-copy title-prefix ptr:见子节点 |
| slowlog_params | 慢查询相关参数 | 165 | def | dual-copy title-prefix |
| slowlog_config | 慢查询配置方式 | 948 | def | dual-copy title-prefix |
| slowlog_entry | 慢日志记录内容 | 295 | def | dual-copy title-prefix |
| sqopt_overview | MySQL 慢查询 SQL 优化思路 | 164 | def | dual-copy title-prefix ptr:见子节点 |
| sqopt_causes | SQL 性能下降的原因 | 146 | def | dual-copy title-prefix |
| sqopt_ideas | 慢查询优化思路（十条） | 62 | def | title-prefix ptr:见子节点 |
| sqopt_idea_highconc | 1. 优先优化高并发执行的 SQL | 203 | def | dual-copy title-prefix |
| sqopt_idea_bottleneck | 2. 定位优化对象的性能瓶颈 | 138 | def | dual-copy title-prefix |
| sqopt_idea_target | 3. 明确优化目标 | 95 | def | dual-copy title-prefix |
| sqopt_idea_explain | 4. 从 EXPLAIN 执行计划入手 | 65 | def | title-prefix |
| sqopt_idea_small_drive | 5. 永远用小的结果集驱动大的结果集 | 218 | def | dual-copy title-prefix |
| sqopt_idea_sort_index | 6. 尽可能在索引中完成排序 | 113 | def | dual-copy title-prefix |
| sqopt_idea_columns | 7. 只获取自己需要的列 | 57 | def | title-prefix |
| sqopt_idea_filter | 8. 只使用最有效的过滤条件 | 56 | def | title-prefix |
| sqopt_idea_join | 9. 尽可能避免复杂的 join 和子查询 | 120 | def | dual-copy title-prefix |
| sqopt_idea_index | 10. 合理设计并利用索引 | 400 | def | dual-copy title-prefix |
| explain_fields | EXPLAIN 的主要字段 | 194 | def | dual-copy title-prefix ptr:见子节点 |
| explain_info | EXPLAIN 能获得的信息 | 186 | def | dual-copy title-prefix |
| explain_usage | EXPLAIN 使用方式 | 104 | def | dual-copy title-prefix |
| explain_field_id | 字段 id（读取顺序） | 152 | def | dual-copy title-prefix |
| explain_field_select_type | 字段 select_type（查询类型） | 309 | def | dual-copy title-prefix |
| explain_field_table | 字段 table / partitions | 110 | def | dual-copy title-prefix |
| explain_field_type | 字段 type（访问类型） | 179 | def | dual-copy title-prefix |
| explain_field_keys | 字段 possible_keys / key（索引使用） | 232 | def | dual-copy title-prefix |
| explain_field_keylen | 字段 key_len（索引长度） | 56 | def | title-prefix |
| explain_field_ref | 字段 ref（连接匹配条件） | 51 | def | title-prefix |
| explain_field_rows | 字段 rows（估算行数） | 39 | def | title-prefix |
| explain_field_extra | 字段 Extra（额外信息） | 238 | def | dual-copy title-prefix |
| qproc_overview | MySQL 查询执行过程 | 172 | def | dual-copy title-prefix ptr:见子节点 |
| qproc_client | 客户端（Client） | 183 | def | dual-copy title-prefix ptr:见子节点 |
| qproc_cache | 查询缓存（Query Cache） | 551 | def | dual-copy title-prefix |
| qproc_parser | 解析器（Parser） | 64 | def | title-prefix |
| qproc_preprocessor | 预处理器（Preprocessor） | 113 | def | dual-copy title-prefix |
| qproc_optimizer | 查询优化器（Optimizer） | 144 | def | dual-copy title-prefix ptr:见子节点 |
| qproc_executor | 查询执行引擎（Executor） | 214 | def | dual-copy title-prefix |
| qproc_storage | 存储引擎（Storage Engine） | 87 | def | dual-copy title-prefix |
| qproc_state_connected | 连接已建立（①） | 70 | def | dual-copy title-prefix |
| qproc_state_cached | 查询缓存命中（②） | 47 | def | title-prefix |
| qproc_state_parsed | 解析树已生成（③） | 41 | def | title-prefix |
| qproc_state_planned | 执行计划已生成（④） | 33 | def | title-prefix |
| qproc_state_executing | 执行中，取到数据（⑤） | 40 | def | title-prefix |
| qproc_state_returned | 结果已返回客户端 | 64 | def | dual-copy title-prefix |
| qproc_flow | 内部执行流程（六步） | 97 | def | dual-copy title-prefix |
| qproc_thread_state | 连接与线程状态 | 519 | def | dual-copy title-prefix |
| qproc_thread_commands | Command 取值 | 229 | def | dual-copy title-prefix |
| qproc_thread_states | State 取值 | 229 | def | dual-copy title-prefix |
| qproc_opt_strategies | 查询优化的策略 | 81 | def | dual-copy title-prefix ptr:见子节点 |
| qproc_opt_equivalent | 等价变换策略 | 88 | def | dual-copy title-prefix |
| qproc_opt_functions | 优化 count、min、max 等函数 | 129 | def | dual-copy title-prefix |
| qproc_opt_earlystop | 提前终止查询 | 50 | def | title-prefix |
| qproc_opt_in | in 的优化 | 91 | def | dual-copy title-prefix |
| sharding_overview | MySQL 分库分表 | 73 | def | dual-copy title-prefix ptr:见子节点 |
| sharding_when | 什么时候需要分库分表 | 163 | def | dual-copy title-prefix |
| sharding_ways | 四种拆分方式 | 244 | def | dual-copy title-prefix |
| sharding_v_db | 垂直分库 | 213 | def | dual-copy title-prefix |
| sharding_v_table | 垂直分表 | 505 | def | dual-copy title-prefix |
| sharding_h_db | 水平分库 | 374 | def | dual-copy title-prefix |
| sharding_h_table | 水平分表 | 277 | def | dual-copy title-prefix |
| sharding_evolution | 架构演进路线 | 156 | def | dual-copy title-prefix |
| pk_auto | 自增主键（auto_increment） | 306 | def | dual-copy title-prefix |
| pk_uuid | UUID 主键 | 190 | def | dual-copy title-prefix ptr:详见 |
| pk_struct_auto | 自增 id 的索引结构 | 329 | def | dual-copy title-prefix |
| pk_struct_uuid | UUID 的索引结构 | 611 | def | dual-copy title-prefix |
| pk_choice | 主键类型选择：自增 vs UUID | 139 | def | dual-copy title-prefix ptr:见子节点 |
| pk_index_struct | uuid 和自增 id 的索引结构对比 | 81 | def | dual-copy title-prefix ptr:见子节点 |
| pk_conclusion | 选择结论 | 212 | def | dual-copy title-prefix ptr:详见 |
| diag_overview | MySQL 慢 SQL 排查思路 | 157 | def | dual-copy title-prefix |
| diag_causes | SQL 执行慢的常见原因 | 163 | def | dual-copy title-prefix |
| diag_flow | 整体排查流程 | 355 | def | dual-copy title-prefix |
| diag_index | 索引问题的排查 | 759 | def | dual-copy title-prefix ptr:详见 |
| diag_split | 表拆分与分库优化 | 494 | def | dual-copy title-prefix |
| diag_rw_split | 读写分离优化 | 232 | def | dual-copy title-prefix |
| diag_hot_cache | 热点数据与缓存优化 | 255 | def | dual-copy title-prefix |
| idx_fail_root | 索引失效与适用边界 | 148 | def | dual-copy title-prefix ptr:见子节点 |
| idx_fail_cases | 索引失效的七种情况 | 605 | def | dual-copy title-prefix |
| idx_fail_unfit | 索引不适合的场景 | 121 | def | dual-copy title-prefix |
| idx_fail_rules | 索引的潜规则 | 268 | def | dual-copy title-prefix |
| sk_perf_overview | 秒杀系统性能优化方法 | 171 | def | dual-copy title-prefix ptr:见子节点 |
| sk_perf_def | 性能的定义与 QPS 公式 | 279 | def | dual-copy title-prefix |
| sk_perf_rt | 响应时间对 QPS 的影响 | 339 | def | dual-copy title-prefix |
| sk_perf_threads | 线程数对 QPS 的影响 | 227 | def | dual-copy title-prefix |
| sk_perf_bottleneck | 系统性能瓶颈定位 | 359 | def | dual-copy |
| sk_perf_opt | 四种优化手段（Java 系统） | 62 | def | title-prefix ptr:见子节点 |
| sk_opt_encoding | 优化1：减少编码 | 338 | def | dual-copy title-prefix |
| sk_opt_serialize | 优化2：减少序列化 | 251 | def | dual-copy title-prefix |
| sk_opt_java | 优化3：Java 极致优化 | 374 | def | dual-copy title-prefix |
| sk_opt_concurrent | 优化4：并发读优化 | 390 | def | dual-copy title-prefix |
| bean_lc_prepare | 创建前准备阶段 | 344 | def | dual-copy |
| bean_lc_instantiate | 创建实例阶段 | 123 | def | dual-copy |
| bean_lc_inject | 依赖注入阶段 | 328 | def | dual-copy |
| bean_lc_cache | 容器缓存阶段 | 253 | def | dual-copy |
| bean_lc_destroy | 销毁实例阶段 | 206 | def | dual-copy |
| bcs_caller | getBean 请求调用方 | 76 | def | dual-copy |
| bcs_bdmap | beanDefinitionMap | 117 | def | dual-copy title-prefix |
| bcs_def | BeanDefinition | 112 | def | dual-copy title-prefix |
| bcs_cache | 单例缓存（singletonObjects） | 93 | def | dual-copy title-prefix |
| bcs_state_requested | getBean 已发起 | 40 | def | title-prefix |
| bcs_state_def_loaded | BeanDefinition 已取得 | 74 | def | title-prefix |
| bcs_state_scope_decided | 作用域已判定 | 74 | def | dual-copy title-prefix |
| bcs_state_created | 实例已创建 | 104 | def | dual-copy title-prefix |
| bcs_state_ready | Bean 就绪返回 | 71 | def | dual-copy title-prefix |
| bcs_flow | Bean 创建策略机制 | 177 | def | dual-copy title-prefix |
| aop_getbean | getBean 请求 | 225 | def | dual-copy |
| aop_proxyfactory | ProxyFactory | 462 | def | dual-copy title-prefix |
| aop_aproxy | AopProxy（外层拦截器） | 320 | def | dual-copy title-prefix |
| aop_minvoke | MethodInvocation（执行拦截器链） | 460 | def | dual-copy title-prefix |
| aop_minterceptor | MethodInterceptor（执行织入代码） | 646 | def | dual-copy title-prefix |
| aop_state_proxy_created | ① 代理对象已创建 | 82 | def | dual-copy title-prefix |
| aop_state_intercepted | ② 调用已被拦截 | 89 | def | dual-copy title-prefix |
| aop_state_chain_running | ③ 拦截器链执行中 | 78 | def | dual-copy title-prefix |
| aop_state_advice_done | ④ 织入代码已执行 | 49 | def | title-prefix |
| aop_state_target_invoked | ⑤ 目标方法已调用（返回） | 66 | def | dual-copy title-prefix |
| aop_flow | AOP 执行流程 | 470 | def | dual-copy ptr:见「Spring Framework 模块（维基）→ |
| aop_term_glossary | 六术语速查（不迷路总结） | 141 | def | dual-copy title-prefix |
| aop_term_proxy | 代理对象（Proxy） | 145 | def | dual-copy |
| aop_term_woven | 织入代码（Woven Code） | 139 | def | dual-copy |
| tpl_trigger_shutdown | shutdown() / shutdownNow() 调用 | 162 | def | dual-copy title-prefix |
| tpl_state_running | RUNNING（运行中） | 188 | def | dual-copy title-prefix |
| tpl_state_shutdown | SHUTDOWN（关闭中） | 165 | def | dual-copy title-prefix |
| tpl_state_stop | STOP（停止） | 161 | def | dual-copy title-prefix |
| tpl_state_tidying | TIDYING（整理中） | 181 | def | dual-copy title-prefix |
| tpl_state_terminated | TERMINATED（已终止） | 145 | def | dual-copy title-prefix |
| tpl_flow | 线程池状态机（五状态） | 235 | def | dual-copy title-prefix ptr:见子节点 |
| concept_thread_confinement | 线程封闭 / thread confinement | 244 | def | dual-copy title-prefix |
| surge_overview | 流量激增应对方法 | 124 | def | dual-copy title-prefix ptr:见子节点 |
| surge_estimate | 1. 预估流量 | 78 | def | dual-copy title-prefix |
| surge_stress | 2. 全链路压测 | 84 | def | dual-copy title-prefix |
| surge_bottleneck | 3. 定位并解决链路瓶颈 | 143 | def | dual-copy title-prefix broken-bold |
| surge_scale | 4. 加机器扩容 | 90 | def | dual-copy title-prefix |
| surge_degrade | 5. 降级 | 103 | def | dual-copy title-prefix |
| surge_ha | 6. 常态高可用：限流 + 监控报警 | 103 | def | dual-copy title-prefix |
| surge_auto_scale | 监控驱动动态扩容 | 230 | def | dual-copy |
| skd_overview | 秒杀系统设计 | 235 | def | dual-copy title-prefix |
| skd_principles | 五大架构原则 | 562 | def | dual-copy title-prefix |
| skd_evolution | 架构演进（淘宝三阶段） | 446 | def | dual-copy title-prefix |
| skd_static_dynamic | 动静分离 | 1198 | def | dual-copy title-prefix broken-bold |
| skd_hotspot | 热点数据处理 | 729 | def | dual-copy title-prefix broken-bold |
| skd_shaving | 流量削峰 | 1012 | def | dual-copy title-prefix broken-bold |
| skd_inventory | 减库存设计 | 1036 | def | dual-copy title-prefix broken-bold |
| tio_caller | 应用程序（read/write 调用） | 65 | def | title-prefix |
| tio_state_read_syscall | ① read 发起（用户态→内核态） | 70 | def | title-prefix |
| tio_state_disk_to_kernel | ② DMA：磁盘 → 内核缓冲区 | 50 | def | title-prefix |
| tio_state_kernel_to_user | ③ CPU：内核缓冲区 → 用户缓冲区（返回） | 87 | def | dual-copy title-prefix |
| tio_state_write_syscall | ④ write 发起（用户态→内核态） | 66 | def | title-prefix |
| tio_state_user_to_socket | ⑤ CPU：用户缓冲区 → socket 缓冲区 | 65 | def | title-prefix |
| tio_state_socket_to_nic | ⑥ DMA：socket 缓冲区 → 网卡（返回） | 88 | def | dual-copy title-prefix |
| tio_flow | 传统 IO 执行流程 | 217 | def | dual-copy title-prefix |
| ordexp_overview | 订单超时自动关闭方案 | 132 | def | dual-copy title-prefix ptr:见子节点 |
| ordexp_timer | 方案1：定时任务 | 265 | def | dual-copy title-prefix |
| ordexp_delayqueue | 方案2：JDK DelayQueue | 252 | def | dual-copy title-prefix |
| ordexp_redis_ex | 方案3：Redis 过期监听 | 383 | def | dual-copy title-prefix |
| ordexp_redisson | 方案4：Redisson 分布式延迟队列 | 234 | def | dual-copy title-prefix |
| ordexp_rocketmq | 方案5：RocketMQ 延迟消息 | 247 | def | dual-copy title-prefix |
| ordexp_rabbitmq | 方案6：RabbitMQ 死信队列 | 225 | def | dual-copy title-prefix |
| hps_overview | QPS 提升 10 倍的系统设计 | 176 | def | dual-copy title-prefix ptr:见子节点 |
| hps_scale | ① 硬件扩展 + 微服务拆分 | 310 | def | dual-copy title-prefix |
| hps_rpc | ② 高性能 RPC | 254 | def | dual-copy title-prefix |
| hps_mq | ③ 消息队列削峰解耦 | 174 | def | dual-copy title-prefix |
| hps_cache | ④ 三级缓存架构 | 212 | def | dual-copy title-prefix |
| hps_db | ⑤ 读写分离 + 分库分表 | 222 | def | dual-copy title-prefix |
| hps_ha | ⑥ 高可用五板斧 | 285 | def | dual-copy title-prefix |
| idxf_overview | 为什么命中索引比不命中快 | 354 | def | dual-copy title-prefix |
| idxf_cost | 索引的弊端 | 240 | def | dual-copy title-prefix |
| pagination_opt_join | 优化3：ID 与主表 inner join | 266 | def | dual-copy title-prefix |
| k_1788687205854_6znktx | 构造函数注入 | 72 | def,example,pros | title-prefix |
| k_1788687205854_qdt7dp | Setter注入 | 53 | def,example,pros | title-prefix |
| k_1788687205854_318tes | 字段注入 | 60 | def,example,pros-cons | title-prefix |
| k_1788694446334_9jflri | @Indexed | 128 | def | title-prefix |
| se_pat_static_proxy | 静态代理 | 73 | def | title-prefix |
| se_pat_dynamic_proxy | 动态代理 | 78 | def | title-prefix |
| aop_proxy_jdk | JDK 动态代理 | 93 | def | title-prefix |
| aop_proxy_cglib | CGLIB 动态代理 | 72 | def | title-prefix |
| spring_beanfactory | BeanFactory | 89 | def | title-prefix |
| spring_appcontext | ApplicationContext | 88 | def,vs-beanfactory | title-prefix |
| mvc_dispatcher | DispatcherServlet | 113 | def | title-prefix |
| mvc_handlermapping | HandlerMapping | 58 | def | title-prefix |
| mvc_handleradapter | HandlerAdapter | 91 | def | title-prefix |
| mvc_viewresolver | ViewResolver | 42 | def | title-prefix |
| mvc_view | View | 55 | def | title-prefix |
| boot_cors | 跨域（CORS） | 55 | def | title-prefix |
| boot_csrf | CSRF 攻击 | 55 | def | title-prefix |
| boot_spring_data | Spring Data | 60 | def | title-prefix |
| boot_spring_batch | Spring Batch | 46 | def | title-prefix |
| boot_starter | Starter | 43 | def | title-prefix |
| k_1789033016897_n3sb52 | 序列化对象 | 64 | def | title-prefix |
| k_1789033106723_46xsvp | 反序列化对象 | 95 | def | title-prefix |
| k_1789213558020_f1h0imz | Hibernate | 263 | def | dual-copy title-prefix |
| k_1789213558020_6rswrz3 | EJB（企业 JavaBeans） | 152 | def | dual-copy |
| asplit_java_nio_filesystem | FileSystem | 773 | def | dual-copy |
| asplit_http_request | HTTP 请求 | 333 | def | title-prefix |
| asplit_view_rendering | 视图渲染 | 220 | def | dual-copy |
| asplit_bias_acquire | 线程进入同步代码块 | 41 | def | title-prefix |
| asplit_bias_state_anonymous | 匿名偏向态 | 57 | def | title-prefix |
| asplit_bias_state_biased | 已偏向态（记录线程 ID） | 71 | def | title-prefix |
| asplit_bias_state_revoke_pending | 撤销中（到达安全点） | 60 | def | title-prefix |
| asplit_bias_state_revoked | 已撤销（升级轻量级锁） | 49 | def | title-prefix |
| asplit_bias_state_bulk_rebiased | 批量重偏向（epoch 递增） | 99 | def | dual-copy title-prefix |
| asplit_bias_state_bulk_revoked | 批量撤销（整类禁用偏向） | 97 | def | dual-copy title-prefix |
| asplit_bias_markword | 对象头 Mark Word | 84 | def | dual-copy title-prefix |
| asplit_rwlock_mechanism | 读写锁实现机制 | 113 | def | dual-copy title-prefix |
| asplit_rw_state_write_acquire | 写锁申请（tryAcquire） | 65 | def | title-prefix |
| asplit_rw_state_write_held | 写锁持有（独占可重入） | 39 | def | title-prefix |
| asplit_rw_state_write_waiting | 写锁等待 | 41 | def | title-prefix |
| asplit_rw_state_write_released | 写锁释放（tryRelease） | 46 | def | title-prefix |
| asplit_rw_state_read_acquire | 读锁申请（tryAcquireShared） | 62 | def | title-prefix |
| asplit_rw_state_read_held | 读锁持有（共享可重入） | 76 | def | dual-copy title-prefix |
| asplit_rw_state_read_waiting | 读锁等待 | 32 | def | title-prefix |
| asplit_rw_state_read_released | 读锁释放（tryReleaseShared） | 44 | def | title-prefix |
| asplit_obj_trigger_new | new 指令触发对象创建 | 57 | def | title-prefix |
| asplit_obj_state_class_loaded | 类型加载校验 | 42 | def | title-prefix |
| asplit_obj_state_alloc | 分配内存 | 65 | def | dual-copy title-prefix |
| asplit_obj_state_zerofill | 零值填充 | 41 | def | title-prefix |
| asplit_obj_state_set_header | 设置对象头 | 59 | def | title-prefix |
| asplit_obj_state_init | 执行构造方法 | 44 | def | title-prefix |
| asplit_obj_state_reference | 引用定位（对象可用） | 39 | def | title-prefix |
| asplit_obj_alloc_tlab | TLAB（线程本地分配缓冲） | 88 | def | dual-copy title-prefix |
| asplit_obj_access_handle | 句柄访问 | 50 | def | title-prefix |
| asplit_obj_access_direct | 直接指针 | 57 | def | title-prefix |
| asplit_obj_state_oom | 内存溢出（OutOfMemoryError） | 76 | def | dual-copy title-prefix |
| asplit_ss_trigger_open | openSession() 请求 | 62 | def | title-prefix |
| asplit_ss_state_opened | 会话已打开 | 43 | def | title-prefix |
| asplit_ss_state_executing | 执行 SQL | 64 | def | title-prefix |
| asplit_ss_state_dirty | 待提交（一级缓存有变更） | 41 | def | title-prefix |
| asplit_ss_state_committed | 已提交 | 33 | def | title-prefix |
| asplit_ss_state_rolled_back | 已回滚 | 29 | def | title-prefix |
| asplit_ss_state_closed | 已关闭 | 57 | def | title-prefix |
| asplit_ss_factory | SqlSessionFactory（单例） | 77 | def | dual-copy title-prefix |
| asplit_rdb_save_cmd | SAVE / BGSAVE 命令到达 | 62 | def | title-prefix |
| asplit_rdb_state_fork | fork 子进程（写时复制） | 56 | def | title-prefix |
| asplit_rdb_state_child_write | 子进程写临时 RDB 文件 | 46 | def | title-prefix |
| asplit_rdb_state_parent_serve | 父进程继续处理命令 | 39 | def | title-prefix |
| asplit_rdb_state_replaced | 临时文件原子替换 dump.rdb | 59 | def | title-prefix |
| asplit_rdb_state_loaded | 启动时载入 RDB 恢复数据 | 58 | def | title-prefix |
| asplit_conn_state_handshake | TCP 连接建立 | 50 | def | title-prefix |
| asplit_conn_state_auth | 客户端鉴权 | 31 | def | title-prefix |
| asplit_conn_state_alloc_thread | 分配线程 | 52 | def | title-prefix |
| asplit_conn_state_user_thread | 用户线程执行命令 | 32 | def | title-prefix |
| asplit_conn_state_sleep | Sleep 空闲等待 | 48 | def | title-prefix |
| asplit_conn_state_closing | 连接关闭 | 30 | def | title-prefix |
| asplit_conn_pool | Connection Pool（连接池） | 93 | def | dual-copy title-prefix |
| asplit_mybatis_executor | Executor（插件点） | 63 | def | title-prefix |
| asplit_mybatis_statement_handler | StatementHandler（插件点） | 72 | def | title-prefix |
| asplit_mybatis_parameter_handler | ParameterHandler（插件点） | 76 | def | title-prefix |
| asplit_mybatis_resultset_handler | ResultSetHandler（插件点） | 56 | def | title-prefix |
| asplit_mysql_tool_backup | 备份恢复工具 | 69 | def | dual-copy title-prefix |
| asplit_mysql_tool_security | 安全管理工具 | 43 | def | title-prefix |
| asplit_mysql_tool_cluster | 集群管理工具 | 71 | def | dual-copy title-prefix |
| asplit_range_lock | 范围锁 | 74 | def | dual-copy title-prefix |
| asplit_insert_lock | 插入锁 | 81 | def | dual-copy title-prefix |
| asplit_memory_atomicity | 内存原子性 | 158 | def | dual-copy title-prefix |
| asplit_concurrency_mutex_lock | 并发互斥锁 | 98 | def | dual-copy title-prefix |
| asplit_web_attribute_scope | Web 属性作用域 | 113 | def,migrated:asplit_http_request_response | title-prefix |
| asplit_web_state_management | Web 状态管理 | 77 | def | dual-copy title-prefix |
| asplit_kafka_consumer_group | Kafka 消费组 | 104 | def | dual-copy title-prefix |
| asplit_kafka_broker | Kafka Broker | 94 | def | dual-copy title-prefix |
| atomic_cookie | Cookie | 69 | def,orig | title-prefix |
| atomic_kafka_producer | Kafka 生产者 | 78 | def,orig | title-prefix |
| atomic_kafka_consumer | Kafka 消费者 | 85 | def,orig | title-prefix |
| atomic_kafka_topic | Kafka Topic | 77 | def,orig | title-prefix |
| atomic_kafka_partition | Kafka Partition | 93 | def,orig | title-prefix |
| atomic_mysql_backup | MySQL 备份 | 107 | def | dual-copy title-prefix |
| atomic_mysql_restore | MySQL 恢复 | 84 | def | dual-copy title-prefix |
| atomic_producer | 生产者 | 51 | def,case | title-prefix |
| atomic_consumer | 消费者 | 52 | def,case | title-prefix |
| atomic_formal_language_theory | 形式语言理论 | 57 | def,orig | title-prefix |
| atomic_automata_theory | 自动机理论 | 63 | def,orig | title-prefix |
| atomic_hypervisor | 管理程序 | 66 | def,orig | title-prefix |
| atomic_emulator | 模拟器 | 60 | def,orig | title-prefix |
| atomic_piped_input_stream | PipedInputStream | 98 | def,orig | title-prefix |
| atomic_piped_output_stream | PipedOutputStream | 91 | def,orig | title-prefix |
| atomic_privilege_check | 权限校验 | 57 | def | dual-copy title-prefix |
| concept_http_request | HTTP Request | 305 | def | dual-copy title-prefix |
| concept_http_response | HTTP Response | 304 | def | dual-copy title-prefix |
| concept_http_servlet_request | HttpServletRequest | 169 | def,migrated:asplit_http_request_response | title-prefix |
| concept_http_servlet_response | HttpServletResponse | 160 | def,migrated:asplit_http_request_response | title-prefix |
| jsp_trigger_request | 浏览器请求 JSP | 60 | def | title-prefix |
| jsp_state_check | 容器检查是否已编译 | 70 | def | dual-copy title-prefix |
| jsp_state_translate | JSP 转 Servlet 源码 | 77 | def | dual-copy title-prefix |
| jsp_state_compile | 编译为 Class | 50 | def | title-prefix |
| jsp_state_load | 加载并初始化 | 47 | def | title-prefix |
| jsp_state_service | service 处理请求 | 56 | def | title-prefix |
| jsp_state_output | 输出 HTML | 33 | def | title-prefix |
| concept_url_rewrite | URL 重写 | 142 | def | dual-copy title-prefix |
| concept_token | Token | 139 | def | dual-copy title-prefix |
| concept_http_servlet_cookie | javax.servlet.http.Cookie | 293 | def | dual-copy title-prefix |
| concept_http_servlet_session | HttpSession | 263 | def | dual-copy title-prefix |
| concept_session_lifecycle | Session 生命周期与配置 | 279 | def | dual-copy title-prefix |
| k_1790017845551_esmxat | 常用的Java conﬁg | 357 | — | title-prefix |
