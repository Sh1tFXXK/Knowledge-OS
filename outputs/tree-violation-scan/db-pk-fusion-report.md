# MVBatch-3 · 主键双身份融合 + 键族挂树 落盘报告

- 日期：2026-09-19 ｜ 状态：**COMMITTED**
- 裁决：主键双身份融合保留 `concept_primary_key`；候选键/SQL键辨析挂树；GUID 保持；贮存/复制/备份/恢复 → MVBatch-4

## 裁决修正（落实前实测纠偏）

| 裁决项 | 实测修正 |
|---|---|
| 散装 6 孩子子树 | 实测只有 **1 孩子** `pk_choice`（主键类型选择：自增 vs UUID），非 6 |
| `concept_primary_key` 无孩 | 实测已有 **1 孩子** `MySQL主键索引`（k_dict_xxkp8lkc），融合后 2 孩子 |
| 散装无引用 | 实测被 1 题 `q_1788337298962_u11dl8` relatedNodeId 引用 → 改指 survivor |
| GUID 挂树 | GUID 已于 MVBatch-1 挂在键与约束下 → 本批**保持**，不动作 |

## 动作

| # | 动作 | 明细 |
|---|---|---|
| 1 | label 错名修正 | `concept_primary_key` label+title+树节点 name「主键索引」→「主键」，tags 去「主键索引」留「主键 / primary key」等 |
| 2 | 正文并集 | rootContent 融合：概念本体（唯一标识/非空/唯一索引）+ 工程视角（InnoDB 聚簇索引 + pk_choice 指针），226 字本体 tab 保留 |
| 3 | pk_choice 迁移 | 散装独有子节点迁到 survivor 下（treebind 边 source 散装→concept） |
| 4 | survivor 归位 | 从索引章节 chapter_db_11 卸下 → 挂键与约束容器（treebind 边改父） |
| 5 | 删散装 | 树节点 + 池实体删除，原文备份 `data/backups/pk-fusion-1789832154842.json` |
| 6 | 题改指 | `q_1788337298962_u11dl8` relatedNodeId 散装→concept |
| 7 | 键族挂树 | 候选键 `tree_mnt_candidate_key`、SQL键辨析 `tree_mnt_sql_keys` 挂键与约束容器（零新建实体，池内已有） |

## 数字对账

```
树节点   3202 → 3203（−1 散装 +2 挂树 = +1）
池实体   3848 → 3847（−1 散装）
关系边   4152 → 4153（−1 散装 treebind +2 挂树 = +1）
问题      790 → 790（1 题 relatedNodeId 改指，无增删）
```

## 验证（20 门 + 12 终检全绿）

- G1-G9 前置定位断言 · G10-G12 数量对账 · G13-G20 摘除/挂载/改指/无悬挂/label
- 终检 12/12 PASS（含树节点 name=主键 补正后复核）
- npm test 68/68 ✅（融合前后各跑一次均绿）

## 追溯

- 脚本：`scripts/db-pk-fusion/apply.mjs`（dry-run 默认零副作用，`--apply` 落盘+备份）
- 备份：`data/backups/pk-fusion-1789832154842.json`（散装主键原文，追溯勿回灌）
- 预检：`outputs/tree-violation-scan/db-key-constraints-preflight.md` §3（双身份逐字段 diff）
