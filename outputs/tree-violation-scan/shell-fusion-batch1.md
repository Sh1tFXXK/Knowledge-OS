# 「什么是 X」壳融合 · 第一批处置清单（2026-09-12）

> 铁律：提问/定义/概述形态的壳节点，正文转为目标名词节点树条目的 `supplement` tab（解释卡内展示），壳的树条目与池节点按宪法原则一退出。
> 本批 7 条，全部人工过目级。**正文归 X 的名词正身，不是归父节点**——壳挂哪不决定正文归谁，池内正身才是判断依据。
> 执行顺序：备份 → 改数据 → 验证（npm test + UI spot check）→ 独立提交。

---

## 批次一 A：InnoDB 四提问壳（挂 `tree_vault_mysql_innodb_*`，正文全部归 InnoDB 语境的正身）

| # | 壳（树条目 / 池节点） | 正文 | 归属正身（池内已核） | 树挂载目标 | supplement tab |
|---|---|---:|---|---|---|
| 1 | 什么是 BufferPool / `k_vault_mysql_innodb_bufferpool` | 749 字 | **`demo_buffer`**（缓冲池，2161 字 glossary 正身；勿塞 `k_vault_mysql_innodb`——它只是 49 字的笔记聚合挂载点） | `demo_buffer` 现有树条目（InnoDB 子树内已有） | `context:mysql:buffer-pool:vault`「InnoDB 语境中的缓冲池」——含控制块结构（缓存页+控制块）细节，为 demo_buffer 补 vault 实现视角 |
| 2 | InnoDB 如何管理 Page 页 / `k_vault_mysql_innodb_page_mgmt` | 1301 字 | **`k_1781002610469_nik1ek`**（页 / page，wiki 正身；池内另有 `concept_page` 同指，先按 batch1 范式裁归属） | 页 / page 的树条目 | `context:mysql:page:vault-mgmt`「InnoDB 如何管理页」 |
| 3 | 介绍一下 Page 页的结构 / `k_vault_mysql_innodb_page_struct` | 1826 字 | **`k_1781002610469_nik1ek`**（同上；页结构 = page 的结构面） | 页 / page 的树条目 | `context:mysql:page:vault-struct`「InnoDB 页结构」 |
| 4 | InnoDB 的行锁是怎么实现的 / `k_vault_mysql_innodb_rowlock` | 2015 字 | **`demo_row_lock`**（MySQL 行锁，glossary 正身） | `demo_row_lock` 树条目 | `context:mysql:row-lock:vault`「InnoDB 行锁实现」 |

**净效果**：`InnoDB` 树节点下 6 个孩子 → 2 个（概念字典-InnoDB 两个保留）；`demo_buffer`/`demo_row_lock`/页 page 三个正身各获得 InnoDB 语境深度 tab；`k_vault_mysql_innodb` 不动（挂载点身份正当）。

## 批次一 B：Netty / RabbitMQ 概念壳（正文即框架定义，直接并入正身的解释卡）

| # | 壳 | 正文 | 归属正身 | 树挂载目标 | supplement tab |
|---|---|---:|---|---|---|
| 5 | Netty 基础概念 / `k_vault_javanetty_1343pt` | 2411 字 | **Netty 本体节点**（`k_java_fw_netty` 或池内 Netty 正身，执行时核） | Netty 树条目 | `context:java:netty:basics`「Netty 基础概念」（通道/事件循环/处理器链主线） |
| 6 | RabbitMQ 基础概念 / `k_vault_javarabbitmq_vcvmol` | 2314 字 | **RabbitMQ 本体节点** | RabbitMQ 树条目 | `context:java:rabbitmq:basics`「RabbitMQ 基础概念」 |
| 7 | 什么是分库分表 / `sharding_what` | 335 字 | **`sharding_overview`**（MySQL 分库分表，同主题正身） | 「MySQL 分库分表」树条目本身 | `context:mysql:sharding:what`「什么是分库分表」 |

**净效果**：壳条目删除；Netty/RabbitMQ/分库分表的解释卡立刻丰满——这正是你要的效果，且**不污染任何池节点正文**。

---

## 壳退出（宪法原则一三重门禁核对）

- **门一 零活引用**：7 个壳 nodeRef 需扫描 questions / evolution-events / viewDimensions / tree 其他条目 / edges / aliases——执行脚本内置，任一命中即暂停该条。
- **门二 内容已迁移**：正文已作为 supplement tab 落位，池节点可退。
- **门三 备份**：`data/backups/shell-fusion-batch1-2026-09-12/` 存 node-pool / tree-data 两个文件的全量快照；独立提交 `data: shell-fusion batch 1 (7 nodes → supplement tabs)`。

## 附带发现（记入待办，不在本批执行）

- `概念字典-InnoDB` / `概念字典-InnoDB-机制` 两个树孩子名是来源标签不是名词（宪法 §2.5 违规形态），下一批处置。
- `k_1781901655940_k6m1w4`（Buffer Pool，89 字）与 `demo_buffer` 同指——按原则三融合判断，归 batch1 融合试验的 144 组里裁决，不在本批。
- Netty 树里另有「Netty 的 Reactor 与线程模型」（多段路径，正文好）——保留，是好结构。
