# db-key-constraint-relocation apply 报告（MVBatch-1）

- 运行时刻：2026-09-16T15:36:13.895Z
- 模式：APPLY（已落盘）
- 落盘前快照：`data/backups/db-key-constraint-relocation-2026-09-16T14-07-16-148Z`
- 预检 G1–G12 / 自检 S1–S10：失败 0 项
- 改动 A（树）：`demo_db.children[18..23]` 的 6 项移入新容器
  `key_constraint`（ref `container:key_constraint` · 名「键与约束 / key & constraint」），新容器追加为 `chapter_db_03.children` 末孩。
  树 3203 → 3204。
- 改动 B（边）：6 条 `treebind:demo_db:<treeId>` → `treebind:key_constraint:<treeId>`，
  source `n_u4va719e` → `container:key_constraint`；target/type/label/relationKind/dimensions 逐字保留。
  边 4155 → 4155。
- 池：`data/node-pool.json` 逐字节未变（S10）。
- 显式扩展（相对用户 Δ 表）：**边 id 同步改写**。理由：treebind id 的父段就是父 treeId
  （`treebind:<parentTreeId>:<childTreeId>`），只改 source 会造成 id 与 source 自相矛盾；边数不变、其余字段不变。
- 位置声明：新容器**追加在 chapter_db_03 末尾**（不是插在「参照完整性」旁）；如需语义归组属后续微调。
- 未做（按裁决推迟）：主键双身份（路 B）· NULL 归位 · 代理键维基份（独立债）· 备份/恢复（chapter_db_08 已有同名节点，融合批）。
- 其余 4149 条边逐条深比较不变（S8）；树除两个父节点外无节点内容变化（S9）。
