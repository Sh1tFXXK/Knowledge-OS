# 后续批次蓝图：asplit_* treeId 语义化

> **状态：`REGISTERED` / `NOT EXECUTED`**
> 本文只做**登记与前置侦察**。**没有**改动任何 treeId、树结构、边或池实体。
> 依据用户裁决：不在阶段一收尾时顺手处理；133 个基线遗留项已准确识别，且本批**零新增**。
>
> **提交归属**：本批次的 4 个登记件（本文件 + `asplit-treeid-inventory.json` +
> `asplit-treeid-ref-matrix.json` + `scripts/scan-asplit-treeid-refs.mjs`）**不与「阶段一 OOP 重组」
> 混在同一语义**，建议**单独一个小提交**，或在阶段一提交里显式分节说明。详见
> `phase1-commit-candidateset.md` §3.4。

生成时间：2026-09-14

---

## 一、为什么要单开批次

`asplit_*` 形式的 treeId（如 `asplit_s2_asplit_obj_state_class_loaded`）是早期「按语义拆分」批次
留下的**临时挂载 id**：`asplit` = a-split，`s<N>` = 该批次的第 N 段。它们与
「**treeId 用稳定语义角色**」（如 `tree_class_programming_abstract_class`）的项目约定相冲突。

**⛔ 不能做字符串替换。** treeId 是**挂载身份**，参与三类引用：

1. `tree-data.json` 中节点自身的 `id`；
2. `knowledge-edges.json` 中**树绑定边**的 id 形态 `treebind:<parentTreeId>:<childTreeId>`（父子两端都嵌了 treeId）；
3. 理论上还有以 treeId 直接作 `source`/`target` 的其它边。

改名必须由「**旧 id → 新 id** 映射表」驱动，且新 id 全局唯一、语义稳定、不撞既有 id。

## 二、范围（只读侦察结论）

侦察脚本：`scripts/scan-asplit-treeid-refs.mjs`（只读，可复跑）

| 层级 | 判据 | 数量 | 是否本批范围 |
|---|---|---:|---|
| **Tier 1** | treeId 以 `asplit_` 开头 | **133** | ✅ **本批次范围** |
| Tier 2 | treeId 形如 `*_s<数字>_*`（如 `tree_wiki_en_outline_of_databases_s1_b2`） | 296 | ❌ 邻接家族，**不在本批**，另议 |

> 说明：Tier 2 是 wiki 章节/段位编号，属「文档结构编号」而非「拆分临时前缀」，
> 语义与处置方式不同。**不要**把它和 `asplit_*` 混在一个批次里做。

**范围健康度（Tier 1）**：

| 检查 | 结果 |
|---|---|
| 范围内**同名**（改名映射需先消歧） | **0 组** ✅ |
| 引用实体缺失（悬空 `nodeRef`） | **0** ✅ |
| 树节点 `id` 命中 | 133 / 133 ✅（无失效 id） |

## 三、引用面（改名波及面，只读实测）

| 文件 | 命中总数 | 形态分解 |
|---|---:|---|
| `tree-data.json` | 1261 | `value` 429（节点自身 id，含 Tier 2）、`raw-occurrence` 832 |
| `knowledge-edges.json` | 1223 | `treebind-parent` 147、`treebind-child` 309、`raw-occurrence` 767 |
| `questions.json` | 0 | — |
| `node-pool.json` | 0 | — |

**关键结论（显著降低风险）**：

- ✅ **没有任何边直接以 treeId 作 `source`/`target`**（0 处）。
  故改名**不需要**动边的语义端点，只需动 `treebind:` 边 **id 字符串**。
- 需同步写入的落点仅两处：`tree-data` 节点 `id` + `treebind` 边 id（含父/子两端，456 个端点）。

## 四、流水线（六步，逐步验收）

```text
treeId semanticization batch
├── ① 只读预检      范围冻结（133）+ 引用矩阵 + 重名/悬空体检          ← 已前置完成（§二/§三）
├── ② 映射表先行    旧 id → 新 id（人工审核，机器只做冲突检测）
├── ③ 全库引用扫描  以映射表为准，逐一确认每个落点（tree id / treebind id）
├── ④ dry-run       内存克隆跑真操作，输出 diff + 影响面指标 Δ
├── ⑤ evolution audit  追加 evolution-event（facet=structure），写清「旧→新」全表
└── ⑥ apply         备份 → 8 闸门 → 落盘 → 独立复验
```

### ② 映射表先行 —— 硬约束

新 treeId 命名规则（与阶段一保持一致）：

- 形态：`tree_<稳定语义角色>`；层级语义用下划线连接，**不带批次号、不带临时前缀**；
- 来源：优先取节点的 `name` 做语义 slug（Tier 1 范围内**重名 0 组**，故 slug 不会互撞）；
- **全局唯一**：新 id 不得与现有任一 treeId / pool id / edge id 冲突；
- 不引入 `p1_` / `C1-` / `asplit_` / `_tmp_` 任何形式的前缀。

映射表模板（示例，**尚未填正式值**）：

| 旧 treeId | name | 旧 id 中的批次段 | 建议新 treeId（**待审**） | 冲突检查 | 备注 |
|---|---|---|---|---|---|
| `asplit_s1_asplit_concrete_class` | 具体类 | `s1` | `tree_class_programming_concrete_class` | — | 父为 `tree_class_programming_classification` |
| `asplit_s1_asplit_mutex_lock` | 互斥锁 | `s1` | `tree_concurrency_mutex_lock` | — | 需按其父域确定命名空间 |
| `asplit_s2_asplit_obj_state_class_loaded` | 类加载完成 | `s2` | `tree_jvm_obj_state_class_loaded` | — | 状态机态名，建议保留 `state_` 段 |

> 建议脚本产出一份 `asplit-treeid-mapping.draft.json`，含 `oldId` / `name` / `path` / `parentTreeId` /
> `proposedTreeId` / `status(pending|approved|rejected)` / `collision`，交由人工逐行裁决后冻结。

### ⑥ 复用阶段一的闸门化执行器

`scripts/apply-phase1.mjs` 的 8 闸门设计可直接复用，另需**新增一个「引用闭合」闸门**：

| 闸门 | 内容 |
|---|---|
| G1 | 数据文件 md5 与冻结基线一致 |
| G2 | 外部会话未再写入已跟踪文件（工作树指纹漂移检测） |
| G3 | 映射表每一行都有裁决状态（无 `pending` 残留） |
| G4 | 每个旧 treeId 恰好映射一个目标新 id，且新 id 全局唯一、不与既有冲突 |
| G5 | 树节点 `id` 改写数 == 映射表条数；`treebind` 边 id 改写数 == 预期（父子两端逐一命中） |
| G6 | **引用闭合**：全库不再残留任一旧 `asplit_*` id（`tree-data` / `knowledge-edges` 双查） |
| G7 | 守卫文件（索引图白名单等）md5 未变 |
| G8 | dev server 写回守卫已武装（避免 `409 EXTERNAL_MODIFICATION` 静默覆盖） |

**验收指标**（沿用 `scripts/metrics-phase1.mjs`，期望）：

- 树节点总数 / 池实体总数 / 边总数 **Δ = 0**（改名不增删，只换 id）；
- 悬空 nodeRef 0、悬空边 27→27、缺 treebind 656→656、重复挂载 87→87、未挂载池实体 729→729；
- **`asplit_*` 计数 133 → 0**；
- `npm test` 全绿。

## 五、产出物

| 产物 | 状态 |
|---|---|
| `outputs/tree-violation-scan/asplit-treeid-inventory.json` | ✅ 已生成（Tier1 133 / Tier2 296 分层清单，含路径、父 id、引用实体存在性） |
| `outputs/tree-violation-scan/asplit-treeid-ref-matrix.json` | ✅ 已生成（按文件/形态的引用矩阵 + 逐 id 命中明细） |
| `scripts/scan-asplit-treeid-refs.mjs` | ✅ 已落盘（只读侦察，可复跑） |
| `outputs/tree-violation-scan/asplit-treeid-mapping.draft.json` | ⬜ 待批次 ② 产出 |
| dry-run / apply 报告与计划 | ⬜ 待批次 ④–⑥ 产出 |

## 六、为什么现在不做

1. **阶段一已闭合**：数据层 + 审计层完成，无需在同一批里叠加高风险改名。
2. **改名是「全库引用」级变更**，与本批「挂载点增删」不是一类操作，混做会让 diff 无法审计。
3. **工作树里有其他会话的在飞改动**（`src/`、`docs/`、`node-pool.json` 的 127 条打标改动），
   此时做大规模 id 改名会显著提高互相污染的概率。见 `phase1-commit-candidateset.md`。
