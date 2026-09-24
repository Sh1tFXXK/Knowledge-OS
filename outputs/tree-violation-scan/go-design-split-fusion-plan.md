# GO-DESIGN-SPLIT-FUSION · 拆分融合蓝图（plan，只读）

- 批次：`go-design-split-fusion` · baseRef：`c943c66` · 日期：2026-09-24
- 触发：用户裁决「这是 go 语言设计的解释卡，拆分融合」+ 两项结构裁决（Versioning 新建子节点挂树；融合顺序不是知识属性，按「先定义后演进」编辑处理）。

## 病灶

`k_goexplain_design`（语言设计）一张卡挤了 **五个主题**（1709 字，行已被压平）：
①设计目标 ②历史/成功归因 ③泛型时间线 ④Versioning（英文）⑤Pike 2015 设计讲座。
其中 ②③④ 在 Go 子树已有专属节点（历史 89 字 / 泛型 620 字 / 无版本节点）。

## 角色→id 映射（硬纪律：具名绑定）

| 角色 | id | label | 动作 |
|---|---|---|---|
| SURVIVOR | `k_goexplain_design` | 语言设计 | 保留 P1 设计目标 + P5 Pike 讲座；迁出 P2/P3/P4 |
| HISTORY | `k_1787722763547_no5htk` | 历史 | 融合 P2（现有 89 字在前，编年顺序） |
| GENERICS | `k_go_generic` | 泛型 | 融合 P3 时间线（现有用法正文在前——用户裁决顺序非知识属性） |
| NEW | `k_go_versioning` | 版本策略 | 新建池实体 + 挂树 go 子节点 + 1 条 treebind 边；内容 = P4 照搬（不翻译） |

## 段切分（锚串，P1..P5 拼回必须 == DONOR 原文逐字节）

P1=卡首至「…受到激励。」· P2=「Go于2009年11月…并不是最重要的。」· P3=「泛型\n初始版本…版本1.18中添加到Go中。」· P4=「Versioning\n…over potential breaking changes.」· P5=「设计\n2015年Rob Pike…来实现。」（卡尾）

## 剥离清单（strip-injected-artifacts 先例，逐项登记）

1. `[failed verification – see discussion]` ×1（P5，wiki 校验标记）
2. `.mw-parser-output.monospaced{font-family:monospace,monospace}` ×1（P3，wiki CSS 残渣 → 剩 `go2go`）
3. 段首标题行剥离 ×2：P3 的 `泛型\n`（与目标节点 label 逐字重复）、P5 的 `设计\n`（与 SURVIVOR label 重复）；P4 的 `Versioning\n` **保留**（与中文 label「版本策略」不重复，原文形态）

## 零造数据闸门

- 每个 P 段切分前必须在 DONOR `includes()` 命中；迁入后（剥后串）必须在目标卡 `includes()` 命中
- P1..P5 + 分隔符拼回 === DONOR 逐字节（未归类段必须 0）
- 负对照 ≥3：goroutine 专项串 / "Go 2.0 规范" / 泛型代码例（`~int | ~float64`）——不得命中任何输出卡
- HISTORY/GENERICS 现有正文**逐字节保留**（融合是追加不是覆盖）

## 结构 Δ（预期）

池 3870→**3871**（+1 NEW）· 树 3203→**3204**（+1 叶子，挂 go 下第 16 位）· 边 4155→**4156**（+1 treebind，形态复制自 `treebind:tree_1786618025853_3qn55e:tree_goexplain_design`）· go 容器子条目 15→16
⚠️ 树节点字段是 `name`（非 label）；父节点 `count` 是手工标注**不动**（memory 纪律）。

## 已证事实

- 语言设计树节点为**叶子**（0 子条目）⇒ 拆分后读态 rootContent 可见，无容器宿主问题
- 三个既有实体各恰 1 条 treebind 边（本子树 1:1 成立）
- 用户两裁决：Versioning 挂树新建；融合顺序按「先定义后演进」
