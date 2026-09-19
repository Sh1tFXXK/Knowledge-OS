# MVBatch-4 · 贮存/复制/备份/恢复 章节同义错位收尾 落盘报告

- 日期：2026-09-19 ｜ 状态：**COMMITTED**
- 裁决：逐对 diff 后定融合/卸树留池（落实前实测，非一刀切）

## 逐对裁决与动作

| 散装 | 章节既有 | 内容对比 | 处置 |
|---|---|---|---|
| 备份 `atomic_database_backup`（58字） | `concept_backup`（ch08 恢复系统：本体+跨域实例+分类维度） | 散装为子集，无独有 | **卸树删实体** |
| 恢复 `atomic_database_restore`（58字） | `concept_restore`（ch08 恢复系统） | 散装为子集 | **卸树删实体** |
| 复制 `concept_replication`（本体255字+实例300字，子=MySQL Replication） | ch14 无「复制」概念节点 | 散装优质且唯一 | **卸一级 → 挂 ch14 数据库分布与复制**（保留全子树） |
| 贮存 `k_wiki_en_database_s16`（585字 wiki，子=复制/虚拟化） | ch10 无「贮存」容器 | 散装唯一 | **卸一级 → 挂 ch10 存储系统**（保留全子树） |

## 边处理

- `atomic:s4:restore-backup`（恢复→备份 依赖）：两端点均删 → **改指** `concept_restore → concept_backup`，id 改 `rel:concept_restore:depends:concept_backup`，语义保留
- 复制/贮存 treebind 改父：`demo_db → chapter_db_14 / chapter_db_10`（source 同步）
- 备份/恢复散装 treebind 删除

## 数字对账

```
树节点   3203 → 3201（−2 备份/恢复散装；复制/贮存仅改父）
池实体   3847 → 3845（−2）
关系边   4153 → 4151（−2 散装 treebind；依赖边改指不增删；移动项改父不增删）
问题      790 → 790（零改动，删除项无题引用）
```

## 验证（16 门全绿 + 结构复核）

- G1-G7 前置定位（4 项在库一级/章节存在/依赖边/无题引用）
- G8-G10 数量对账 · G11 删除复核 · G12 依赖改指 · G13 归位 · G14/G15 子树保留 · G16 无悬挂
- **结构复核：数据库一级只剩 18 个章节容器**（chapter_db_01~20，散装项全部清除/归位）
- ch08 含备份/恢复概念 · ch10 含贮存 · ch14 含复制 ✅
- npm test 68/68 ✅

## 追溯

- 脚本：`scripts/db-mvbatch4/apply.mjs`（dry-run 默认，`--apply` 落盘+备份）
- 备份：`data/backups/mvbatch4-1789832793144.json`（备份/恢复散装原文 + 依赖边原值）
- 关联：MVBatch-1（键约束 6 项建容器）· MVBatch-2（NULL 归位）· MVBatch-3（主键融合+键族挂树）
