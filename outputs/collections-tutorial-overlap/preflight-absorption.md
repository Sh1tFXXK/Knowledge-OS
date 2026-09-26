# 集合框架内容吸收 — 正式预检（只读 · 零落盘）

- 日期：2026-09-19 ｜ 数据快照：工作树（pool 3850 实体 / 题 785）
- 前序产物：`report.md`（重叠检查）· `routing-plan.md`（分流方案）· `import-patch.json`（**半拉子**，见 §四）

## 一、范围与规模实测

- 子树根：`知识宇宙 > … > java > 集合框架`（`tree_1785252754835_b77vuj` → `k_1785664228019_k7eq57`）
- **49 节点 / 64 tab / 正文合计 89,556 字**（报告旧口径 ≈55k 是只数了 tab 面，漏了 rootContent 面）
- 教程 dump 实测（rootContent + tab 双算）：

| 节点 | 正文 | tab | 双存储？ |
|---|---:|---:|---|
| 根 `集合框架` | 7,645 字 | 7,645 字 | **逐字节相同**（rootContent === tab，纯镜像） |
| `Java 集合框架`（k_vault_15bnft） | 7,800 字 | 12,365 字 | 两面**不同文**（去空白后公共前缀 0 字符，版本差异） |
| `Java 数据结构`（k_vault_ii523d） | 3,875 字 | 3,987 字 | 两面不同文（公共前缀仅 4 字符） |

  → dump 净内容 **≈20.2k + 7.6k = 27.8k 字**；其中违反原则 9「同一知识不存两处」的镜像 7,645 字。

## 二、分流映射（按 routing-plan，对照真实数据修正）

### 1) 定义 → 解释卡 rootContent（4 个填充目标）

| 目标节点 | 现状 | 动作 |
|---|---|---|
| `Iterator` `k_1785747858308_aoqbr5` | **真空壳**（0/0） | 填方法表 + hasNext/next/remove 语义 + ListIterator 双向 |
| `Comparator` `k_1785742371669_zng9px` | **真空壳**（0/0） | 填 compare 定义 + vs Comparable 段 |
| `HashSet` `k_1785731277675_rog9oy` | rootContent 766 字 javadoc 摘要 | 补齐 API 摘要 + HashMap 承载说明（与兄弟对齐） |
| `数据结构`（HashMap 子节点）`k_1785471820450_v6okms` | rootContent 112 字一句话 | 补「数组+链表+红黑树」或删（HashMap 本体 7,596 字已含） |

### 2) 对比/机制/应用 → 问题卡（查重结论：**并入 7 条正主全部存在且已答，新增仅 6 道**）

- 题库现状：785 题 / 765 已答（总计划"783/763"已过期，+2）
- **并入既有**（改 answer 不动题干，7 条 id 全部验证存在）：
  `q_1785470772832_pmbik3`（Set/List）、`4_t70ahn`（ArrayList/LinkedList，题干错字"LinkenHashMap"一并修）、`q_1785747375387_2gd38c`（HashSet/TreeSet）、`q_1785746257595_6wwncp`（HashMap 原理）、`q_1786353277269_msn0mabd2s`（TreeMap 排序）、`q_1785747877571_y1yig4`（Iterator/ListIterator，题干"Listlterator"笔误一并修）、`q_1785743459504_c240yt`（Comparable/Comparator）
- **新增 6 道**：Vector vs ArrayList、WeakHashMap 机制、Hashtable vs HashMap、Collections 算法、EMPTY_* 常量、迭代器步骤（schema：kind 六枚举、difficulty 字符串、带 source 溯源）
- **同指重复 6 条**（实测，比报告多 1 条 `msn0mach3w`）：`pmbik3`(正主)、`wi60xt`、`msn0maaf1u`、`msn0maan22`、`msn0macg3v`、`msn0mach3w` —— 变体标待融合，不新增
- 修 `HashMap` tab label 笔误「LinkenHashMap」

### 3) 丢弃（约 1/3 教程体量）

历史叙事、「自动转 Object」过时表述、7 段遍历代码、总结章、根 tab 压缩为 3 句（三分法 + Iterator/Map 支柱）。

## 三、待你裁决的 4 个决策点

1. **D1 dump 节点去留**：`Java 集合框架`（20.2k）与 `Java 数据结构`（7.9k）——
   - A. 双删（孤儿段先按 §二 分流完再删）
   - B. 保留并压缩成 ~200 字历史注记
   - C. 只删 `Java 数据结构`（属数据结构域，与集合框架弱相关），另一个压缩
2. **D2 根节点镜像**：`集合框架` rootContent 与 tab 逐字节相同（7,645×2）——压缩时**删 tab 留 rootContent 3 句**，还是反过来？（建议删 tab：rootContent 是解释卡规范 facet）
3. **D3 Enumeration**：传统接口说明——丢弃，还是加 1 道 comparison 题「Enumeration vs Iterator」？（routing-plan 默认丢弃）
4. **D4 BitSet**：子树完全没有该类——不引入，还是顺带新建节点？（建议不引入，出本批次范围）

## 四、⚠️ 现存 `import-patch.json` 是半拉子，不能 apply

1. **answer 字段串味**：6 道新题的 answer 全是「序号|类描述」教程表格截段（Vector 题的答案里装的是 AbstractCollection 表格），与题干完全无关——**内容需重新写，不可用**
2. merges 的 appendAnswer 同样含 runoob 链接 + 序号表格工件，且把同一表格复制到 4 道不同的题
3. 该文件仅 `_meta.sourceNodes` 列了 `k_vault_javajava_15bnft`，未覆盖 `ii523d`
4. 结论：**作废重做**，新 patch 按本预检 §二 生成

## 五、执行顺序建议（apply 阶段）

1. 分流内容先落位（4 填充 + 7 并入 + 6 新增）→ 2. 验证 → 3. dump 按 D1 处置 → 4. 根 tab 压缩（D2）→ 5. 库级复验（UI 抽查 Iterator/Comparator 空壳消失）

## 附：本预检改动为零

仅读取 `data/tree-data.json`、`data/node-pool.json`、`data/questions.json`；探针脚本均落 `%TEMP%` 且已删除。
