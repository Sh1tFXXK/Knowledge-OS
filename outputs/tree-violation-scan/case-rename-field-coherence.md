# 案例 RC-01 · 语义改名的「同位字段一致性」

> **状态：`ACCEPTED / INTENTIONAL`（T4 已裁决 · 方案 A）** · 本批**不做任何修改**
> 裁决：`card.title = 分类` 判为**有意保留**（旧名同时留在 `tags`，具备别名/历史检索价值）。
> 检测器**保留**，但契约改为**只出证据、不出动作**（`staleSignature / severity / disposition`）。
> 用途：为「语义改名的同位字段一致性」规则提供**真实案例**与**可执行检测器规格**。
> 生成：2026-09-14 · 来源批次：阶段一（簇 1 OOP 类的分类重组） · 裁决：T4（2026-09-14）

---

## 一、案例事实

簇 1 把 OOP 域的分类容器从「分类」重命名为「类的分类」。池实体
`k_class_programming_classification` 的各同位字段现状：

| 字段 | 值 | 判定 |
|---|---|---|
| `label` | `类的分类` | ✅ 已同步（**身份耦合字段**） |
| `tags` | `["分类","类","面向对象","编程","类的分类"]` | ✅ 已同步（旧名 `分类` 仍留在 tags 中，充当别名） |
| `card.title` | `分类` | ⚠️ **仍是旧名** |
| `card.nodeId` | `k_class_programming_classification` | ✅ 与池键一致（真正的不变量） |
| 树节点 `tree_class_programming_classification.name` | `类的分类` | ✅ 已同步 |

**最可疑签名成立**：`card.title` 的值**恰好等于该实体改名前的 `label`**（`分类`）。
这不是"两个字段恰好不同"，而是"某个字段**留在了旧值上**"——签名强度远高于普通差异。

## 二、为什么**不能**直接判为缺陷（重要更正）

初判曾把它记为「残留不一致（缺陷）」。**该判据不成立** —— 本项目并不存在
「`label` ≡ `card.title` ≡ 树 `name`」的不变量。只读全省侦察证据：

| 检查 | 数量 / 基数 | 构成 |
|---|---|---|
| `label` ≠ `card.title` | **79 / 3855** | 互为子串 68 · 互不包含 11 |
| 树 `name` ≠ 池 `label` | **67 / 3219**（已绑定） | 互为子串 43 · 互不包含 24 |
| `card.nodeId` ≠ 池键 | **0** | ← 唯一真正成立的不变量 |

明显**有意为之**的反例：

```
label「默认导出」          card.title「默认导出 (Default Export)」
label「日志文件」          card.title「日志文件 / log file」
label「enum」              树 name「java.lang.Enum」
label「beta」              树 name「MySQL Beta / MySQL 测试版」
label「系统性能瓶颈定位」   card.title「如何发现瓶颈」
label「AOP 执行流程」       card.title「执行阶段」
```

**结论**：`label` / 树 `name` 承担**规范短名**；`card.title` 常被用作**富化展示标题**
（双语、限定词、更口语化的表述）。**两者允许不同**。
因此「`label` ≠ `card.title`」本身**不是缺陷**，不得据此批量"修正"（会误伤 79 例）。

## 三、规则（修正版）

> ❌ 曾拟规则（**作废**）：~~语义改名时必须同步"全部"同位字段。~~ → 会产生 146 个误报。
>
> ✅ **现行规则**：
> 1. **先判定字段角色**，再决定是否同步：
>    - **身份耦合字段**（必须同步）：`label`、树节点 `name`、`card.nodeId`、以及任何被
>      代码按值匹配的字段（如 `canonicalKey`、`relatedNodeId`、`treebind` 端点）。
>    - **展示层字段**（允许多样化，**禁止自动改写**）：`card.title`、`card.tabs[].label` 等。
> 2. **唯一值得警惕的签名**：某字段的值**恰好等于该实体改名前的旧值**（改名残留）。
>    普通差异不报警，只有"等于旧值"才报警。
> 3. **该签名只能在改名当时检出** —— 需要拿**改名前的基线**对该实体的**全部字段值**做**旧值反查**。
>    事后做字段等值比对是检不出来的（会把 79 例正常富化全捞进来）。

## 四、检测器规格（供后续批次实现）

**时机**：任何「改名 / 重命名」类操作**执行前**（dry-run 阶段）与**执行后**（验收阶段）各跑一次。

```
输入：poolBefore（落盘前基线）、poolAfter（落盘后）、changedEntityIds（本批 label 发生变化的实体）
输出：每个改名实体的「旧值残留清单」

算法：
  for id in changedEntityIds:
      oldLabel = poolBefore[id].label
      newLabel = poolAfter[id].label
      for (fieldPath, value) in flatten(poolAfter[id]):
          if value is string and value == oldLabel and fieldPath != knownAliasField:
              记录 { id, fieldPath, value, suspected: 'stale-after-rename' }
      # 关键词：只报「等于旧值」，不报「不等于新值」
  for treeNode in tree where treeNode.nodeRef in changedEntityIds:
      if treeNode.name == poolBefore[nodeRef].label: 记录 { treeNodeId, field:'name', suspected }
```

**判据强度分级**（决定是否需要人工裁决）：

| 强度 | 条件 | 处置 |
|---|---|---|
| 🔴 高 | 命中字段属于**身份耦合**（`label` / `name` / `card.nodeId` / 代码按值匹配字段） | 视为缺陷，必须修 |
| 🟡 中 | 命中**展示层**字段（`card.title` 等）且旧值**仍在该实体的 `tags`/`aliases` 中**（说明旧名被有意保留为别名） | 倾向"有意保留"，建议只加说明 |
| 🟡 中 | 命中展示层字段，旧值**未**留在 `tags`/`aliases` | 需人工裁决 |
| 🟢 低 | 仅"字段值不同"但**不等于旧值** | **不报**（79 例正常富化） |

**本案例（RC-01）强度 = 🟡 中**（"命中展示层字段且旧值**仍留在该实体的 `tags` 中**"分支）：
`tags = ["分类","类","面向对象","编程","类的分类"]` **同时含**旧名 `分类` 与新名 `类的分类`
→ 旧名被**有意保留**作别名 → `card.title = 分类` 判为**刻意的短名**，而非漏改。

### 4.1 检测器契约（T4 裁决后固化 · 只出证据）

> **不修这个案例 ≠ 取消检测器。** 检测器仍必须发现该签名，只是**无权处置**。

```text
输入：poolBefore（落盘前基线）、poolAfter（落盘后）、changedEntityIds（本批 label 变化的实体）
输出（仅此四项，**不得**出现 action / autoFix）：
    { staleSignature, severity, disposition }   +   证据原样（fieldPath / oldValue）

契约：stage = evidence-only
      neverOutputs = ["action", "autoFix"]
      disposition ∈ { intentional-alias, defect-candidate, needs-adjudication, display-enrichment }
```

**检测器找证据；治理规则判证据。** 二者分离，检测器不得内联任何处置逻辑。
参考实现：`scripts/verify-phase1-commit-readiness.mjs` 的 `detectorContract` / `residuals`。

## 五、裁决结论（T4 · 2026-09-14）

| 项 | 结论 |
|---|---|
| **裁决** | **方案 A · 判为有意保留**（`ACCEPTED / INTENTIONAL`） |
| **理由** | 旧名 `分类` 同时留在 `tags` 中 → 具备明确的**别名 / 历史检索价值**；全库数据（79 例正常富化）证明展示层富化是**常态而非异常**。 |
| **动作** | 数据**零改动**（`card.title` 保持 `分类`）。 |
| **检测器** | **保留**，契约固化为 §4.1「只出证据」：输出 `staleSignature: true` / `severity: 🟡` / `disposition: intentional-alias`，**不输出** `action` / `autoFix`。 |
| **机器可读落点** | `readiness-<batchId>.json` → `residuals[0]`（两条命中：`card.title`、`tags[0]`，均 🟡 `intentional-alias`）。 |

> ❌ 已否决 **方案 B**（把 `card.title` 同步为「类的分类」）：缺乏证据支撑，且会与项目内
> 79 例展示层富化的既有约定相冲突。

> ⚠️ 无论何种结论，都**不在阶段一的提交里顺手改** —— 该改动与「OOP 重组」不是同一语义，
> 会污染 commit 的可读性。（符合用户裁决：不塞回本批。）

## 六、关联

- 候选集与提交状态：`phase1-commit-candidateset.md` §5
- 就绪核验（含观察项与全省背景数）：`scripts/verify-phase1-commit-readiness.mjs`
  → `outputs/tree-violation-scan/readiness-<batchId>.json` 的 `residuals` / `fieldCoherenceContext`
- 后续批次登记：`batch-asplit-treeid-semanticization-plan.md`（另一条独立线程）
