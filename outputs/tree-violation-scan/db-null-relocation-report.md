# DB-NULL-RELOCATION · 落盘报告（MVBatch-2）

- 日期：2026-09-19 ｜ 状态：**COMMITTED**
- 裁决：NULL 正文讲 IS NULL/NOT NULL 约束/索引交互 ⇒ 与 NOT NULL 约束同族 ⇒ 归「键与约束」；主键双身份本批不动；NULL 三值逻辑挂载保留（L4 跨区债）

## 动作（仅 tree-data.json + knowledge-edges.json，池零改动）

| 动作 | 明细 |
|---|---|
| 树归位 | `NULL`（treeId `projection:mysql-term:k_dict_fxoirizf` · ref `k_dict_fxoirizf`）从「数据库一级 demo_db」摘除 → 挂「键与约束 key_constraint」下（NOT NULL 约束之后） |
| 边改写 | `treebind:demo_db:projection:mysql-term:k_dict_fxoirizf` → `treebind:key_constraint:projection:mysql-term:k_dict_fxoirizf`（id+source 同步，source `n_u4va719e`→`container:key_constraint`，dimensions `["storage"]` 保留） |
| 保留 | `treebind:theory_domain_three_valued_logic:mysql_term_three_valued_logic_null_plui03`（三值逻辑挂载，L4 债不碰） |
| 不动 | 主键双身份 `concept_primary_key`（索引）+ `k_1788179275554_knwq7e`（数据库一级散装） |

## 数字对账

```
树节点   3202 → 3202（0 增删，仅改父）
关系边   4152 → 4152（id/source 改写，总数不变）
池实体   3848 → 3848（零改动）
```

## 验证（14/14 门全绿）

- G1-G8 前置断言（定位/边存在/新 id 未占/主键双身份不动）
- G9-G14 收尾断言（树/边总数不变、散装位摘除、容器挂载、保留边、新边 source）
- npm test 68/68 ✅

## 追溯

- 脚本：`scripts/db-null-relocation/apply.mjs`（dry-run 默认，`--apply` 落盘）
- 裁决依据：`outputs/tree-violation-scan/db-key-constraints-preflight.md` §7（NULL 归属判定）
- 键与约束容器：`key_constraint`（ref `container:key_constraint`，MVBatch-1 建于 chapter_db_03 下）
