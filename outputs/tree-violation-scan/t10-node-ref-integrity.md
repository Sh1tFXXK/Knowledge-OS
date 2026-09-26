# T10 追加 · nodeRef 引用完整性（identity-ref-integrity）

> 状态：**观察项 · 不修**（用户 2026-09-14 裁决：「不要立即修」「它不是简单换指针」）
> 发现批次：T3-AUDIT（`medium-classification.json` 的 `extraFindings.crossWiredByDescendant`）
> 登记批次：T3-P2 同一提交

## 一、事实

```
树节点   react_root
  name   React
  父     demo_web（Web 开发）
  路径   知识宇宙 > 计算机科学 > 信息系统 > 全球信息网 > Web 开发 > React
  nodeRef asplit_module_export      ← 池实体 label 是「模块导出」
  children 11
```

它的**子节点** `tree_javascript_module_export`（模块导出）`nodeRef` 也是 `asplit_module_export`。

池实体 `asplit_module_export` 的身份（不是猜的）：

```
card.title = 模块导出
tags       = ["模块导出"]
```

**池里没有 label 为 `React` 的实体**（全库 3855 个键：`label` 恰为 React 的 0 个；键名含 react 的 11 个
都是 `react_default_export` / `react_named_export` / `react_conditional_*` 这类子主题，以及 4 个 `k_reactor_*`，均不是 React 本体）。

## 二、后果

```
用户点击树里的「React」
        ↓
按 nodeRef 查池
        ↓
渲染出「模块导出」的卡片
```

即 **树节点名与它所绑定的知识实体不是同一个东西**。这是 `identity integrity` 问题，**不是**结构治理问题。

## 三、判据（可复用）

> **一个节点的 `nodeRef` 同时被它自己的后代复用 ⇒ 该节点的 `nodeRef` 极可能写错。**

理由：父与后代是**不同**的知识实体，共用同一池实体意味着至少一方绑错了。
**全树扫描命中 1 条**（就是本条）。所以这不是普遍现象，是真缺陷。

对比：**「同一池实体多挂载」本身不是缺陷判据** —— 全树 87 个 ref / 180 个节点属于此列，
是既有的系统性现象（一个池实体在树的多个语义位置被引用是合法的）。
**只有当共用的两方是「祖先—后代」关系时才可疑。**

## 四、为什么不顺手修（用户裁定的三条理由，已核验成立）

1. **要不要新建 pool entity？** React 本体目前**没有**池实体。修 nodeRef 就得先造一个 ——
   而「为 React 造一个池实体」是**内容建设**，不是引用修复。
2. **是否已有 React canonical entity？** 已查：**没有**（见上）。所以不能靠「指向已有 canonical」一步修好。
3. **是否只是历史导入错误？** 有可能 —— `asplit_*` 前缀说明它来自 a-split 导入流水线；
   但也可能是当初把「React 的概述」与「模块导出」在导入时归并了。**两种成因的修法不同**，须先定性。
4. **children 的 ref 是否也要调？** 它 11 个子节点里，`模块导出` / `模块导入` / `条件式渲染` /
   `控制流` / `函数设计` / `表达式` 各自 ref 都正常；但父绑错意味着**这一支的归属语义整体存疑**，
   要连带复核「这些子节点挂在 React 下对不对」。

⇒ **不是简单换指针**，是一个需要单独定性 + 定内容的小研究项。

## 五、验证方法（真修的时候怎么验）

不能只看 JSON：修完必须**点开树里的「React」**，断言渲染出来的卡片标题是 React 而不是「模块导出」，
且它 11 个子的归属复核通过。范式见 `t3-p2-ui-probe.md`（同款 CDP 探针）。

## 六、影响面

| 项 | 值 |
|---|---|
| 命中条数 | **1**（`react_root`） |
| 涉及池实体 | 1（`asplit_module_export`，被 2 处树节点引用） |
| 是否在 T3 范围 | **否**（`react_root` 是人写 id，从来不是 `asplit_*` 树 id） |
| 是否影响 T3-P1/P2 结论 | **否**（两批都不经手 `react_root`） |
