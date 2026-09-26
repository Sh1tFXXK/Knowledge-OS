# 集合框架教程正文 → 分流执行方案

- 日期：2026-09-19 ｜ 数据源：`k_vault_javajava_15bnft`《Java 集合框架》12365 字 + `ii523d`《Java 数据结构》3987 字
- 配套报告：`report.md`（重叠检查 + 融合率 68% 实测）

## 一、分流表（已对照真实 schema 验证）

| 原文内容类型 | 去向 | 示例 |
|---|---|---|
| 定义（是什么） | 解释卡 rootContent | 「Set 存储唯一无序对象」 |
| 对比（区别） | 问题卡 `kind: "comparison"` | 「Set 和 List 的区别？」 |
| 机制（怎么工作） | 问题卡 `kind: "mechanism"` | 「HashMap 的 HashCode 存储机制？」 |
| 应用（怎么用） | 问题卡 `kind: "application"` | 「多线程下如何选择 List 实现？」 |
| 代码示例 | **丢弃** | 遍历 ArrayList/Map 的 7 段代码 |
| 叙事 | **丢弃** | 「早在 Java 2 之前…」历史段 |

### Schema 硬约束（提案已修正）

- `difficulty`：`'basic' | 'intermediate' | 'advanced'`（字符串枚举，**不是数字**）
- 必填：`id`、`answered`
- 溯源：`source: { kind:'document', sourceId, sourceTitle, sectionTitle }`（教程导入天然可用）
- 组答：优先 `answerSteps: [{nodeId, note?}]` 引用节点，`answer` 文本作补充
- `kind` 枚举：`definition | mechanism | comparison | application | troubleshooting | recall`（`src/types.ts:352`）
- 现成分类器：`scripts/import/import-standard.mjs` 的 `classifyQuestionKind(text)`

## 二、14 道候选题 × 785 题库查重裁决

### A. 并入既有题（7 道——禁止新增，防同指重复）

| 教程候选 | 并入正主 | 动作 |
|---|---|---|
| Set 和 List 区别 | `q_1785470772832_pmbik3`「List和Set的区别」 | answer 补「检索 vs 插入删除效率」维度；同指变体 `msn0maaf1u`/`msn0maan22`/`msn0macg3v` 标待融合 |
| ArrayList vs LinkedList | `4_t70ahn`「ArrayList和LinkedList的区别是什么？」 | answer 补随机访问/插入删除对比 |
| HashSet/LinkedHashSet/TreeSet 选择 | `7_2gd38c`「HashSet 和TreeSet 有什么区别？」 | answer 补 LinkedHashSet 维度 |
| HashMap HashCode 存储机制 | `5_6wwncp`「HashMap 的工作原理是什么？」 | answer 补 hash 定位段落（HashMap 节点 6293 字已有素材） |
| TreeMap 排序机制 | `n0mabd2s`「TreeMap 和 TreeSet 在排序时如何比较元素？」 | answer 补红黑树排序（TreeMap 节点 17k 字已有素材） |
| Iterator vs ListIterator | `1_y1yig4`「Iterator 和Listlterator 的区别是什么？」（题干有 Listlterator 笔误，一并修） | answer 补双向遍历 |
| Comparator vs Comparable | `4_c240yt`「Comparable 和Comparator 接口是干什么的？列出它们的区别。」 | answer 补教程对比表 |

### B. 新增题（6 道——题库无同指，schema 已就绪）

```json
{ "id": "q_new_vector_arraylist", "text": "Vector 与 ArrayList 有何区别？为什么 Vector 被认为过时？", "answered": true, "kind": "comparison", "difficulty": "basic",
  "source": { "kind": "document", "sourceId": "runoob:java-collections", "sourceTitle": "Java 集合框架 · 菜鸟教程", "sectionTitle": "集合实现类" },
  "relatedNodeId": "<Vector 节点>", "answerSteps": [{ "nodeId": "<Vector 节点>", "note": "同步、性能差、被 ArrayList 取代" }, { "nodeId": "<ArrayList 节点>", "note": "非同步、默认选择" }] }
```

```json
{ "id": "q_new_weakhashmap", "text": "WeakHashMap 的弱引用回收机制是怎样的？", "answered": true, "kind": "mechanism", "difficulty": "advanced",
  "source": { "kind": "document", "sourceId": "runoob:java-collections", "sourceTitle": "Java 集合框架 · 菜鸟教程", "sectionTitle": "集合实现类" },
  "relatedNodeId": "<WeakHashMap 节点>" }
```

```json
{ "id": "q_new_hashtable_hashmap", "text": "Hashtable 与 HashMap 有何区别？", "answered": true, "kind": "comparison", "difficulty": "basic",
  "source": { "kind": "document", "sourceId": "runoob:java-collections", "sourceTitle": "Java 集合框架 · 菜鸟教程", "sectionTitle": "集合实现类" } }
```

```json
{ "id": "q_new_collections_algos", "text": "Collections 工具类提供了哪些算法？如何使用？", "answered": true, "kind": "application", "difficulty": "basic",
  "source": { "kind": "document", "sourceId": "runoob:java-collections", "sourceTitle": "Java 集合框架 · 菜鸟教程", "sectionTitle": "集合算法" },
  "relatedNodeId": "<Collections 节点>" }
```

```json
{ "id": "q_new_empty_constants", "text": "EMPTY_SET、EMPTY_LIST、EMPTY_MAP 常量有什么用？", "answered": true, "kind": "application", "difficulty": "intermediate",
  "source": { "kind": "document", "sourceId": "runoob:java-collections", "sourceTitle": "Java 集合框架 · 菜鸟教程", "sectionTitle": "集合算法" },
  "relatedNodeId": "<Collections 节点>" }
```

```json
{ "id": "q_new_iterator_steps", "text": "用迭代器遍历集合的步骤是什么？hasNext/next 各做什么？", "answered": true, "kind": "application", "difficulty": "basic",
  "source": { "kind": "document", "sourceId": "runoob:java-collections", "sourceTitle": "Java 集合框架 · 菜鸟教程", "sectionTitle": "如何使用迭代器" },
  "relatedNodeId": "<Iterator 节点>" }
```

可选 1 道（按原方案判丢弃，若保留则为 comparison）：`Enumeration 为什么被 Iterator 取代？`——题库无同指，但内容属过时 API，默认丢弃。

### C. 节点填充（非问题卡）

| 空壳节点 | 填充内容（来自正文） |
|---|---|
| `Iterator`（空壳） | 迭代器方法表 + hasNext/next/remove 语义 + ListIterator 双向（newIteratorSteps 题引用它） |
| `Comparator`（空壳） | compare/compare 定义 + vs Comparable 段落 |
| `HashSet`（空壳） | 与兄弟节点对齐的 API 摘要 + 底层 HashMap 承载说明 |
| `HashMap > 数据结构`（空壳） | 补「数组+链表+红黑树」结构说明，或删（HashMap 本体 6293 字已含） |

## 三、丢弃清单（正文内）

- 「早在 Java 2 之前…」历史叙事（框架目标三条可压缩进根节点 rootContent 一句话）
- 遍历 ArrayList / 遍历 Map 全部 7 段代码示例
- 总结章（纯复述）
- 「任何对象加入集合后自动转 Object」过时表述（泛型已解决，误导）

## 四、执行纪律

1. 任何写盘先在临时数据目录演练（AGENTS.md 约定），演练通过再动真数据
2. 新增题 id 用 `q_new_*` 占位，导入时统一换成时间戳 id
3. 并入既有题只改 `answer`/`updatedAt`，不动题干与 `relatedNodeId`
