# T3-P0 · 7 个伪语义祖先前置语义化 —— APPLY 执行报告
> 模式 `apply` · 备份 `data\backups\t3-p0-2026-09-14T13-14-43-612Z`
> 生成时间 2026-09-14T13:14:44.017Z
## 0. 闸门
| 闸门 | 检查项 | 结果 | 依据 |
| `G1` | 提案 7 条均已人工批准 ∧ D1/D2 已裁定 | ✅ | proposal.status=APPROVED_BY_HUMAN · 未批准 0 条 · 未裁定决策 0 项 |
| `G2` | 数据文件 md5 与冻结基线一致（无人改过数据） | ✅ | 5 个文件全部一致 |
| `G3` | 7 个 old treeId 存在且均为伪语义形态 | ✅ | 7 个全部命中 |
| `G4` | 7 个 new treeId 形态合法 ∧ 批内唯一 ∧ 无碰撞 | ✅ | tree_java_lock_rwlock_implementation · tree_redis_rdb_persistence · tree_java_jmm_synchronization · tree_java_syntax_generics · tree_redis_zset · tree_redis_cache_anomaly · tree_java_jmm_sequential_consistency |
| `G5` | 覆盖面**恰好** = BLOCK 的最近伪语义祖先集合 | ✅ | 提案 7 vs 期望 7 · 缺失 [] · 多余 [] · T3 项数 133（须 133） |
| `G6` | 结构不变性：树逐节点 / 边逐条，除 id 外逐字节相同 | ✅ | 树 3219 节点、边 4166 条全部通过（仅 id 变动） · 改名节点 7/7 · treebind id 改写 46 |
| `G7` | 引用闭合：改名后全数据无旧 id 残留 | ✅ | 残留 0 · 节点数 3219 不变 · 边数 4166 不变 |
| `G8` | 本批目的达成：T3 133 项读数 = HIGH 92 / MEDIUM 38 / BLOCK 3 | ✅ | HIGH 68→92 · MEDIUM 38→38 · BLOCK 27→3 · 分布 {"0":68,"1":11,"2":24,"3":3,"4":12,"5":4,"6":11} → {"0":92,"1":11,"2":24,"3":3,"6":3} |
| `G9` | dev server 不会静默覆盖本次写入 | ✅ | 5173 未监听 |

**闸门全绿（9/9）**

## 1. 改名对照（7 条）
| # | 旧 treeId | 旧 name | 新 treeId | 命名空间 | 路径 |
| 1 | `tree_1786026688588_0mtvxh` | 读写锁的实现分析 | **`tree_java_lock_rwlock_implementation`** | `tree_java_lock_` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 锁 > 读写锁 > 读写锁的实现分析 |
| 2 | `tree_1786245817114_ds2keo` | RDB持久化 | **`tree_redis_rdb_persistence`** | `tree_redis_` | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 持久化选项 > RDB持久化 |
| 3 | `tree_1784367544335_zorevp` | 同步 | **`tree_java_jmm_synchronization`** | `tree_java_jmm_` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 同步 |
| 4 | `tree_1783873515748_edsjp0` | Java泛型 | **`tree_java_syntax_generics`** | `tree_java_syntax_` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > Java syntax > 数据类型 > 引用类型 > Java泛型 |
| 5 | `tree_1786235757428_osu8oj` | zset | **`tree_redis_zset`** | `tree_redis_` | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 数据类型 > zset |
| 6 | `tree_1786340438649_tbr6gs` | 缓存异常 | **`tree_redis_cache_anomaly`** | `tree_redis_` | 知识宇宙 > 计算机科学 > 信息系统 > 数据库管理 > 数据库 > 数据模型 > NoSQL > Redis > 缓存异常 |
| 7 | `tree_1785862113590_a5v1ya` | 顺序一致性 | **`tree_java_jmm_sequential_consistency`** | `tree_java_jmm_` | 知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > java并发编程 > 内存模型 > 顺序一致性 |

## 2. 结构不变性证明（本批的核心安全断言）
| 断言 | 结果 |
| 树逐节点：除 `id` 外所有字段逐字节相同 | ✅ 3219 节点全通过 |
| 边逐条：除 `id` 外所有字段逐字节相同、顺序不变 | ✅ 4166 条全通过 |
| 边 `source` / `target` 被触碰 | **0**（须 0） |
| 树节点数 | 3219 → 3219 |
| 边数 | 4166 → 4166 |
| 池节点数 | 3855（本批不改池） |
| 悬空 nodeRef | 0 → 0 |
| 旧 id 残留（树 + 边序列化全文扫描） | 0 ✅ |

## 3. treebind 边 id 改写（46 条）
> 只改 `id` 字符串（`treebind:<父tid>:<子tid>`）中被改名的部分；边的 `source`/`target` 是**池 ref**，不受 treeId 改名影响。

| # | 旧边 id | 新边 id |
| 1 | `treebind:tree_1784367508734_hrswml:tree_1784367544335_zorevp` | `treebind:tree_1784367508734_hrswml:tree_java_jmm_synchronization` |
| 2 | `treebind:tree_1784367544335_zorevp:tree_1784367662898_k0rxcz` | `treebind:tree_java_jmm_synchronization:tree_1784367662898_k0rxcz` |
| 3 | `treebind:tree_1784367544335_zorevp:tree_1784367699494_y1g26s` | `treebind:tree_java_jmm_synchronization:tree_1784367699494_y1g26s` |
| 4 | `treebind:tree_1784367544335_zorevp:tree_1785820543100_i1zgfg` | `treebind:tree_java_jmm_synchronization:tree_1785820543100_i1zgfg` |
| 5 | `treebind:tree_1784367508734_hrswml:tree_1785862113590_a5v1ya` | `treebind:tree_1784367508734_hrswml:tree_java_jmm_sequential_consistency` |
| 6 | `treebind:tree_1785862113590_a5v1ya:tree_1785862311838_8gjb2e` | `treebind:tree_java_jmm_sequential_consistency:tree_1785862311838_8gjb2e` |
| 7 | `treebind:tree_1785862113590_a5v1ya:tree_1785923242922_h6fqry` | `treebind:tree_java_jmm_sequential_consistency:tree_1785923242922_h6fqry` |
| 8 | `treebind:tree_1785862113590_a5v1ya:tree_1785923313251_n1jobu` | `treebind:tree_java_jmm_sequential_consistency:tree_1785923313251_n1jobu` |
| 9 | `treebind:tree_1786017239718_fuvw86:tree_1786026688588_0mtvxh` | `treebind:tree_1786017239718_fuvw86:tree_java_lock_rwlock_implementation` |
| 10 | `treebind:tree_1786026688588_0mtvxh:tree_1786026731195_6h7dn0` | `treebind:tree_java_lock_rwlock_implementation:tree_1786026731195_6h7dn0` |
| 11 | `treebind:tree_1784042843965_1l907w:tree_1783873515748_edsjp0` | `treebind:tree_1784042843965_1l907w:tree_java_syntax_generics` |
| 12 | `treebind:tree_1783873515748_edsjp0:tree_1783874843110_8teb7e` | `treebind:tree_java_syntax_generics:tree_1783874843110_8teb7e` |
| 13 | `treebind:tree_1783873515748_edsjp0:tree_1784302644439_1wds0d` | `treebind:tree_java_syntax_generics:tree_1784302644439_1wds0d` |
| 14 | `treebind:tree_1786232234666_2zcwva:tree_1786235757428_osu8oj` | `treebind:tree_1786232234666_2zcwva:tree_redis_zset` |
| 15 | `treebind:demo_tree_redis:tree_1786340438649_tbr6gs` | `treebind:demo_tree_redis:tree_redis_cache_anomaly` |
| 16 | `treebind:tree_1786340438649_tbr6gs:tree_1786340457010_5jtoo8` | `treebind:tree_redis_cache_anomaly:tree_1786340457010_5jtoo8` |
| 17 | `treebind:tree_1786340438649_tbr6gs:tree_1786340490406_nh6kcm` | `treebind:tree_redis_cache_anomaly:tree_1786340490406_nh6kcm` |
| 18 | `treebind:tree_1786340438649_tbr6gs:tree_1786340543323_fn7slv` | `treebind:tree_redis_cache_anomaly:tree_1786340543323_fn7slv` |
| 19 | `treebind:tree_1786340438649_tbr6gs:tree_1786340565414_tb59hj` | `treebind:tree_redis_cache_anomaly:tree_1786340565414_tb59hj` |
| 20 | `treebind:tree_1786340438649_tbr6gs:tree_1786340595359_dmr45o` | `treebind:tree_redis_cache_anomaly:tree_1786340595359_dmr45o` |
| 21 | `treebind:tree_1786340438649_tbr6gs:tree_1786340652071_gudwro` | `treebind:tree_redis_cache_anomaly:tree_1786340652071_gudwro` |
| 22 | `treebind:tree_1786245246710_rw9q3v:tree_1786245817114_ds2keo` | `treebind:tree_1786245246710_rw9q3v:tree_redis_rdb_persistence` |
| 23 | `treebind:tree_1784367544335_zorevp:asplit_s1_asplit_mutex_lock` | `treebind:tree_java_jmm_synchronization:asplit_s1_asplit_mutex_lock` |
| 24 | `treebind:tree_1784367544335_zorevp:asplit_s1_asplit_sync_block` | `treebind:tree_java_jmm_synchronization:asplit_s1_asplit_sync_block` |
| 25 | `treebind:tree_1785862113590_a5v1ya:asplit_s1_asplit_data_race` | `treebind:tree_java_jmm_sequential_consistency:asplit_s1_asplit_data_race` |
| 26 | `treebind:tree_1783873515748_edsjp0:asplit_s1_asplit_generic_method` | `treebind:tree_java_syntax_generics:asplit_s1_asplit_generic_method` |
| 27 | `treebind:tree_1783873515748_edsjp0:asplit_s1_asplit_generic_constructor` | `treebind:tree_java_syntax_generics:asplit_s1_asplit_generic_constructor` |
| 28 | `treebind:tree_1786235757428_osu8oj:asplit_s1_asplit_zrank` | `treebind:tree_redis_zset:asplit_s1_asplit_zrank` |
| 29 | `treebind:tree_1786235757428_osu8oj:asplit_s1_asplit_zrange` | `treebind:tree_redis_zset:asplit_s1_asplit_zrange` |
| 30 | `treebind:tree_1786340438649_tbr6gs:asplit_s1_asplit_hot_data` | `treebind:tree_redis_cache_anomaly:asplit_s1_asplit_hot_data` |
| 31 | `treebind:tree_1786340438649_tbr6gs:asplit_s1_asplit_cold_data` | `treebind:tree_redis_cache_anomaly:asplit_s1_asplit_cold_data` |
| 32 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rwlock_mechanism` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rwlock_mechanism` |
| 33 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rw_state_write_acquire` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_write_acquire` |
| 34 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rw_state_write_held` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_write_held` |
| 35 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rw_state_write_waiting` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_write_waiting` |
| 36 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rw_state_write_released` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_write_released` |
| 37 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rw_state_read_acquire` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_read_acquire` |
| 38 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rw_state_read_held` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_read_held` |
| 39 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rw_state_read_waiting` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_read_waiting` |
| 40 | `treebind:tree_1786026688588_0mtvxh:asplit_s2_asplit_rw_state_read_released` | `treebind:tree_java_lock_rwlock_implementation:asplit_s2_asplit_rw_state_read_released` |
| 41 | `treebind:tree_1786245817114_ds2keo:asplit_s2_asplit_rdb_save_cmd` | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_save_cmd` |
| 42 | `treebind:tree_1786245817114_ds2keo:asplit_s2_asplit_rdb_state_fork` | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_fork` |
| 43 | `treebind:tree_1786245817114_ds2keo:asplit_s2_asplit_rdb_state_child_write` | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_child_write` |
| 44 | `treebind:tree_1786245817114_ds2keo:asplit_s2_asplit_rdb_state_parent_serve` | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_parent_serve` |
| 45 | `treebind:tree_1786245817114_ds2keo:asplit_s2_asplit_rdb_state_replaced` | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_replaced` |
| 46 | `treebind:tree_1786245817114_ds2keo:asplit_s2_asplit_rdb_state_loaded` | `treebind:tree_redis_rdb_persistence:asplit_s2_asplit_rdb_state_loaded` |

## 4. T3 133 项 `semanticAncestorGap` 重算（本批的唯一目的）
| 读数 | 本批前 | 本批后 | Δ |
| HIGH（gap=0，可自动接受） | 68 | 92 | **+24** |
| MEDIUM（gap 1..3，须人工确认） | 38 | 38 | 0 |
| BLOCK（gap>3，不得自动给名） | 27 | 3 | **-24** |
| gap 分布 | `{"0":68,"1":11,"2":24,"3":3,"4":12,"5":4,"6":11}` | `{"0":92,"1":11,"2":24,"3":3,"6":3}` | — |

**仍 BLOCK 的 3 条**（不属本批，属挂载点合法性 → 结构批次）：
- `asplit_s2_asplit_mysql_tool_backup` 备份恢复工具
- `asplit_s2_asplit_mysql_tool_security` 安全管理工具
- `asplit_s2_asplit_mysql_tool_cluster` 集群管理工具

## 5. journal（机器可读）
```json
{
  "batch": "t3-p0-apply",
  "mode": "apply",
  "pairs": [
    {
      "oldTreeId": "tree_1786026688588_0mtvxh",
      "proposedTreeId": "tree_java_lock_rwlock_implementation"
    },
    {
      "oldTreeId": "tree_1786245817114_ds2keo",
      "proposedTreeId": "tree_redis_rdb_persistence"
    },
    {
      "oldTreeId": "tree_1784367544335_zorevp",
      "proposedTreeId": "tree_java_jmm_synchronization"
    },
    {
      "oldTreeId": "tree_1783873515748_edsjp0",
      "proposedTreeId": "tree_java_syntax_generics"
    },
    {
      "oldTreeId": "tree_1786235757428_osu8oj",
      "proposedTreeId": "tree_redis_zset"
    },
    {
      "oldTreeId": "tree_1786340438649_tbr6gs",
      "proposedTreeId": "tree_redis_cache_anomaly"
    },
    {
      "oldTreeId": "tree_1785862113590_a5v1ya",
      "proposedTreeId": "tree_java_jmm_sequential_consistency"
    }
  ],
  "renamedNodes": 7,
  "renamedEdgeIds": 46,
  "backupDir": "E:\\project\\Knowledge-OS\\data\\backups\\t3-p0-2026-09-14T13-14-43-612Z",
  "realVerification": {
    "renamedNodes": 7,
    "renamedEdgeIds": 46,
    "treeErrors": [],
    "edgeErrors": [],
    "residualOldIds": [],
    "verdict": "REAL_APPLY_VERIFIED"
  }
}
```
