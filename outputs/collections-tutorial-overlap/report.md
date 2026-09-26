# java 集合框架 × 树内节点 重叠检查报告

- 日期：2026-09-19
- 结论：**runoob 教程原文已作为节点躺在树里**，「导入拆解 14 tab」方案无需执行；现有 49 节点骨架已覆盖方案全部信息位
- 处置：用户选择**只出报告**，未对数据做任何修改

## 范围

- 目标子树：`知识宇宙 > 计算机科学 > 软件符号与工具 > 编程语言 > java > 集合框架`（`tree_1785252754835_b77vuj`）
- 子树规模：**49 节点 / 64 tab / ≈55k 字**
- 数据源：`data/tree-data.json` + `data/node-pool.json`（只读）

## 三份教程原文实锤（证据）

| 节点 | 体量 | 证据 |
|---|---|---|
| `Java 集合框架` | 12365 字（单 tab「定义」） | 开头逐字为 runoob 原文「早在 Java 2 中之前，Java 就提供了特设类。比如：Dictionary, Vector, Stack, 和 Properties …」 |
| `Java 数据结构` | 3987 字（单 tab「定义」） | runoob「Java 数据结构」章节原文（数组/列表/…分节体例） |
| `集合框架`（根节点） | 7645 字（tab「接口继承关系与实现」） | 另一份教程搬运，内嵌 `cdn-mineru.openxlab.org.cn` 图床图片 |

合计 **≈24k 字教程叙事**，占子树内容量的 44%。

## 内容盘点（按 tab 量排序的要点）

- 大块头（非教程，质量较好）：
  - `TreeMap` 2tab/17303 字（JDK 26 API + 红黑树详解）
  - `HashMap` 3tab/6293 字（含「并发死循环分析」；注意 tab1 label 笔误为「LinkenHashMap」）
  - `Map` 9tab（查询/修改/批量/视图/默认方法/静态方法等接口契约拆分）
  - `ArrayList` 5tab/1098 字
- 薄骨架：21 个接口/实现类节点各 1tab ≈160 字「JDK 26 API」摘要
- **空壳 4 个**：`Iterator`、`Comparator`、`HashSet`、`HashMap > 数据结构`（0 tab / 0 字）
  - 反差：核心实现类 `HashSet` 空壳，而冷门类 `IdentityHashMap`/`WeakHashMap` 都有摘要

## 与「14 tab 拆解方案」的覆盖对照

| 方案切片 | 树内现状 | 判定 |
|---|---|---|
| 总览（历史/目标） | `Java 集合框架` 12365 字 = 教程原文 | 已存在（需压缩非导入） |
| 8 接口 tab | Collection/List/Set/SortedSet/Map/SortedMap/Map.Entry(在 Map 内)/Enumeration 类比（Dictionary 节点）全部已有，且带真实层级（Deque/Queue/NavigableSet/SequencedCollection…） | 结构已存在且优于方案的扁平形态 |
| List/Set 实现类表 | List/Set/Map 族共 21 类节点 + 各自 API 摘要 | 已存在 |
| 迭代器 | `Iterator` 空壳 | 缺内容 |
| 比较器 | `Comparator` 空壳 | 缺内容 |
| 集合算法（Collections） | `Collections` 节点有 167 字摘要 | 部分，偏薄 |

## 建议的后续动作（未执行）

1. 删 `Java 集合框架`、`Java 数据结构` 两个教程 dump 节点；`集合框架` 根 tab 压缩成 3 句（保留 set/list+queue/map 三分法 + Iterator/Map 两大支柱）
2. 补 4 个空壳：Iterator（单向/ListIterator 双向/fail-fast）、Comparator（自定义排序 vs Comparable）、HashSet（与兄弟节点对齐的 API 摘要）、`HashMap > 数据结构`（补或删）
3. 可选：`Set`/`List` 各补一句「vs 对方」对比；修 `HashMap` tab label 笔误「LinkenHashMap」
4. 任何写盘操作前先在临时数据目录演练（AGENTS.md 约定）

## 追问复核（同日第二轮）：「每个字都融合了吗」「这是哪个批次」

### 融合率实测：**68%，不是 100%**

把三份 dump 切成信息单元（段落级，>20字、去图片/空标题）共 **244 单元**，逐单元提取 Java 标识符并在「子树其余 46 节点语料」（31.5k 字）中核对落点：

- ✅ 有落点：**167（68%）**
- ❌ 孤儿单元：**77（32%）**——其中约 1/3 是表格框架行/纯叙事（表格头、分隔行、"在前面的教程中…"等，本就无需落点）；**实质孤儿**包括：
  - `Enumeration` 传统接口说明（树内 Dictionary/Enumeration 无内容承接）
  - `BitSet`（子树完全没有这个类）
  - `ClassCastException` / `UnsupportedOperationException` 异常语义段
  - `EMPTY_SET/EMPTY_LIST/EMPTY_MAP` 常量段
  - `Iterator`/`ListIterator` 双向遍历说明（恰好是空壳 Iterator 该有的内容）
  - 迭代器方法表、遍历示例代码段

**结论**：教程 dump 不能整篇删——约 1/3 信息单元在树内无落点。若日后执行「清教程」工单，需先把这些实质孤儿按主题归入对应节点（Iterator/Comparator 空壳正好可承接大半）。

### 批次溯源：三个来源、两个批次名

| 批次 | 证据 | 规模 |
|---|---|---|
| **`k_vault_javajava_*`**（节点 id 前缀） | 两个 dump 节点 `k_vault_javajava_15bnft`（Java 集合框架）、`k_vault_javajava_ii523d`（Java 数据结构），tags 自带「Java 集合框架总览」「Java 数据结构基础」 | 全库 **13 节点**（样例 tag：多线程/封装/继承/多态/抽象类/接口——一份 Java 基础教程合集） |
| **`Java面试突击`**（tag） | `集合框架`根tab（`k_1785664228019_k7eq57`）、`HashMap`、`TreeMap` 三节点带此 tag | 全库 **39 节点** |
| 手工骨架（无批次） | 4 个空壳（Iterator/Comparator/HashSet/数据结构）是唯一**没有**「集合框架」tag 的节点 | 4 |

其余 42 节点的「JDK 26 API」摘要来源：本机 `C:\Users\Administrator\.jdks\openjdk-26.0.1` javadoc 提取（card 内来源注释）。污染规模参考：全库 `runoob` 出现 472 次、mineru 图床链接 224 次——本子树不是唯一有教程尸体的地方。

## 追问复核（同日第三轮）：问题卡分流方案的可行性验证

用户提出修正后的分流表（定义→rootContent / 对比→comparison / 机制→mechanism / 应用→application / 代码示例与叙事→丢弃）。对照真实 schema 验证结果：

### ✅ 成立的部分

- `comparison` / `mechanism` / `application` 均为 `QuestionKind` 合法枚举值（`src/types.ts:352`：definition / mechanism / comparison / application / troubleshooting / recall）
- 「定义→rootContent」与 `docs/KNOWLEDGE_DECOMPOSITION.md` 的规范 facet（`def`）一致
- 代码示例/叙事丢弃：与原方案一致，实测正文里代码与叙事占 dump 内容约 1/3，丢弃后才是纯知识

### ❌ 必须修正的部分

1. `difficulty: 2` 不合法——真实枚举是 `basic | intermediate | advanced`（字符串，非数字，`types.ts:360-364`）
2. 提案 JSON 缺必填字段：`id`、`answered`
3. 建议补 `source: {kind:'document', sourceId, sourceTitle, sectionTitle}`——教程导入的溯源链（runoob《Java 集合框架》· 章节名）天然可用
4. 答案优先用 `answerSteps: [{nodeId, dimensionId?, sectionId?, note?}]` 组答（引用知识节点而非复制正文），`answer` 文本作补充——项目已有此范式（`outputs/tree-violation-scan/work-order-a-split-136.md`）
5. 现成辅助：`scripts/import/import-standard.mjs` 已有 `classifyQuestionKind(text)` / `difficultyForQuestionKind(kind)` 自动分类器

### ⚠️ 关键发现：示例题已是既有题的第 6 个重复

题库现有 **785 题**，其中「Set vs List」同指题已有 **5 条**：
`q_1785470772832_pmbik3`（List和Set的区别）· `q_1785746306383_wi60xt` · `q_1786353277269_msn0maaf1u` · `q_1786353277269_msn0maan22` · `q_1786353277269_msn0macg3v`

教程的对比内容应**并入既有题**（建议正主 `pmbik3`，差异维度补进其 answer），不得新增问题卡——同指重复治理是本项目已有议题（见 `outputs/tree-violation-scan/batch-b-comparison-handled.md`）。

### 教程孤儿段落 → 分流去向映射

| 孤儿内容 | 去向 |
|---|---|
| Enumeration 传统接口说明 | 丢弃（被 Iterator 取代；如需保留则作 comparison 题「Enumeration vs Iterator」） |
| BitSet / Dictionary / Hashtable / Properties 传统类说明 | 存在于《Java 数据结构》dump 的第二半——逐类丢弃或并入对应节点（Dictionary 节点已有空壳可承接） |
| ClassCastException / UnsupportedOperationException 语义 | 问题卡 `mechanism` 或 `troubleshooting` |
| EMPTY_SET/EMPTY_LIST/EMPTY_MAP | 问题卡 `application`（并入 Collections 节点配套） |
| 迭代器方法表 / ListIterator 双向 | **直接补空壳 `Iterator` 节点**（现成落点），配套 `definition` 题 |
| 框架设计目标叙事 | 丢弃（纯叙事） |
| 遍历代码示例 | 丢弃 |

## 附

- 节点清单中间产物已清理（`.tmp-cf-subtree.json` 已删除）
- 排查过程可由本报告 + 数据文件复现
