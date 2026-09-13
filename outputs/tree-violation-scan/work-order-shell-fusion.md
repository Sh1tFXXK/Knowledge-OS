# 工单：第二批清理 · E 类提问壳迁移 + 执行遗留修复（2026-09-13）

> 前情：第一批「定义/概述/提问壳融合」21+2 条已执行完毕（提交 `c9042bf` 数据 + `7d6c904` 执行器），当前基线：树 **3267** · 池 **3825** · 边 **4045** · test 34/34。
> 本批两件事：**① 剩余 7 条提问型壳迁入问题库；② 修复第一批执行遗留的两个问题**。
> 宪法依据：原则二 §2.5（提问不进树）+ 原则五（每问必有归处）+ 原则一（壳退出三重门禁）。
> 执行基建：复用 `scripts/shell-fusion/`（lib.mjs 原子写 / gate.mjs 门一复扫 / spot-check.mjs 渲染验收）。前置与回滚同第一批工单（§0/§9），不再重复。

---

## 任务一：E 类提问壳迁问题库（7 条）

**通用三步**（每条）：
```
A. questions.json 追加问题卡：{ id: "q_<本批序号>", text: <壳名（去掉编号残留，保留问号）>,
   answered: true, answer: <壳正文>, relatedNodeId: <见下表正身>, kind: "concept",
   difficulty: "intermediate", createdAt/updatedAt: Date.now() }
B. 卸树条目：孩子（若有）按「孩子去向」上提到正身树条目下；树绑边随卸重建。
C. 退池节点：gate.mjs 六处复扫零命中后删 nodeRef。
```

| # | 壳（treeId / nodeRef） | 正文 | 正身 relatedNodeId | 孩子去向 | 备注 |
|---|---|---:|---|---|---|
| E1 | 「JSR-133为什么要增强final的语义」`k_1785923886439_k5so6c` | 335 字 | `k_1785923688124_7st7co`（final域的内存语义，@ java/关键字/final） | 无孩子 | 问题文本改写为「JSR-133 为什么要增强 final 的语义？」（加空格与问号） |
| E2 | 「MQ 为什么存在」`k_vault_javarabbitmq01mq_j62j4c` | 663 字 | `k_java_fw_rabbitmq`（RabbitMQ，@ 软件框架） | 无孩子 | RabbitMQ 已有 supplement「basics」tab（第一批 B2），本题与其互补不冲突 |
| E3 | 「如何发现瓶颈」`sk_perf_bottleneck` | 713 字 | `sk_perf_overview`（秒杀系统性能优化方法，@ 软件工程/性能优化） | 无孩子 | ⚠️ 秒杀树是 D 类「场景树」候选（宪法 §2.5 动作型），本批只迁此一条，整树不动 |
| E4 | 「数据库是什么类型的东西？」`k_wiki_en_outline_of_databases_s1` | 232 字 | `n_u4va719e`（数据库，@ 信息系统/数据库管理） | 3 孩子（信息/数据/计算机数据）上提到「数据库」树条目下 | wiki s1 引导节；孩子是名词保留 |
| E5 | 「为什么命中索引比不命中快」`idxf_overview` | 694 字 | `n_0xxb9cqy`（MySQL 索引，@ 数据库/索引） | 1 孩子「索引的弊端」上提到「MySQL 索引」下 | ⚠️ 题库已有近似题「为什么 SQL 语句命中索引比不命中索引要快？」——先查重（text 去空格对比），若近似则**合并**：旧卡补 answerSteps/答案以本壳 694 字为准，不新建卡 |
| E6 | 「什么时候需要分库分表」`sharding_when` | 316 字 | `sharding_overview`（MySQL 分库分表） | 无孩子 | 正身已有 supplement「what」tab（第一批 B3）；本题文本与 tab 互补 |
| E7 | 「如何判断对象可以被回收」`k_1783264901088_1s02ir` | **0 字** | `k_jvm_gc_reachability`（垃圾回收判定，@ 内存管理/垃圾回收） | 2 孩子（引用计数法 / 可达性分析算法…）上提到「垃圾回收判定」下 | 壳正文空 → **不新建问题卡**（题库已有同题近题 1 张），只卸树条目 + 孩子上提 + 退池 |

**净效果**：树 3267 → 3260（卸 7）；池 3825 → 3818（退 7）；questions +6 张新卡（E7 不建）或 5 张（若 E5 判合并）。

---

## 任务二：执行遗留修复（第一批扫尾）

### 2a. Executor框架 下错拼双挂载去重（2 条树条目）

第一批 D4e 要求删除错拼条目，执行时保留了双挂载。现状（已核）：

| 错拼条目 | treeId | nodeRef | 保留的那份 |
|---|---|---|---|
| 「FutureTask」@ Executor框架 | `tree_1785918560147_r0lv4e` | `k_java_type_3f228f7655fb94df` | @ juc/concurrent/java.util.concurrent/FutureTask（同名同 nodeRef） |
| 「ScheduleThreadPoolExecutor」@ Executor框架 | `tree_1785918765751_aguaej` | `k_1785417434549_gyz4q5` | @ 线程池/ScheduleThreadPoolExecutor（同 nodeRef；树名仍错拼「Schedule」少 d） |

操作：
1. 删 Executor框架 下两条错拼树条目 + 对应 `treebind:*` 边。
2. 「线程池/ScheduleThreadPoolExecutor」树名**顺手改拼**：`ScheduleThreadPoolExecutor`（补 d）；池节点 `k_1785417434549_gyz4q5` 的 label 同改。
3. 保留 juc 下 JDK 正身挂载不动。
⚠️ 改名前 gate.mjs 复扫 `k_1785417434549_gyz4q5`（它是活跃节点，只改 label/树名，不退池、不卸条目——单一家园检查的是 nodeRef 不是名字）。

### 2b. 数据仓库残缺名修复（6 条树条目改名 + 6 个池节点）

第一批 E 组孩子上提时带上了 wiki 解析切坏的残缺名（右括号无左配对）。现状（已核，全在 `一、数据库系统/数据仓库` 下）：

| 残缺名 | nodeRef | 字数 | 改为 |
|---|---|---:|---|
| 「维度)」@ 创建数据仓库 | `k_wiki_en_outline_of_databases_s22_b1` | 5 | 「维度」 |
| 「事实)」@ 创建数据仓库 | `k_wiki_en_outline_of_databases_s22_b3` | 5 | 「事实」⚠️ 与既有孩子「事实」（`s25`）同指 → 删本条目 + 退池，正文 5 字并入 `s25` 不值得，直接退（门二：0 实质内容） |
| 「聚合)」@ 创建数据仓库 | `k_wiki_en_outline_of_databases_s22_b6` | 5 | 「聚合」 |
| 「仪表板)」@ 使用数据仓库 | `k_wiki_en_outline_of_databases_s29_b2` | 6 | 「仪表板」 |
| 「在线分析处理 (OLAP)」 | `k_wiki_en_outline_of_databases_s22_b4` | 45 | 名字合法（括号配对），**不动** |
| ⚠️ 检查口径 | — | — | 执行时用「右括号无左配对」全树复扫一遍，不止这 4 处就顺手全改（只改名，不退池） |

改名同步三处：树条目 `name`、池节点 `label`、（若有）`card.title`。treebind 边 id 不含名字，无需重建。

### 2c. 顺带：「变体 / 元素 / 方面 / 填充」（数据仓库下泛词孩子）

`s23/s24/s26/s27` 四个泛词条目（185/94/79/115 字，wiki「variants/elements/aspects/population」直译）——**本批不动**，记入第三批「泛词壳」扫描口径（这些是 wiki outline 的结构残留，需要人工判内容归属）。

---

## 验收标准

1. `npm test` 34/34；`npx tsc --noEmit` 0 错。
2. 树条目：3267 → **3260**（7 卸 + 2 错拼删 - 1 事实)删 → 实际 3267-10=3257，以执行时重数为准，差异写进提交信息）。
3. 池节点：3825 → 3818（7 壳退 + 1 事实)退）。
4. questions.json：+6 卡（或 5，E5 判合并则改旧卡），E7 不建。
5. 新问题卡在问题库 UI 可见、relatedNodeId 跳转落点正确（spot-check.mjs：搜「JSR-133」「MQ 为什么」）。
6. Executor框架 孩子 7 → 5；「线程池」下 ScheduleThreadPoolExecutor 拼写已修正。
7. 数据仓库下无「)」结尾条目（复扫口径见 2b）。
8. gate.mjs 六处活引用复扫全零（本批全部退池 nodeRef）。
9. 独立提交：`data: batch 2 — E 类提问壳迁题库(7) + 执行遗留修复(错拼去重/残缺名)`。注意 `data/questions.json` 工作区已有第一批执行人的未提交增量（answerSteps 补写），随本提交一并落盘并在提交信息注明。

## 回滚

`git checkout -- data/`（备份目录 `data/backups/batch2-2026-09-13/` 双保险）。

---

## 附：后续批次预告（不在本工单）

| 批次 | 内容 | 规模 | 风险点 |
|---|---|---:|---|
| 第三批 | 教程/详解壳去壳（Executor 六兄弟 + 集合框架四详解 + 定位总览三条 + `基础` 60 孩 + 15 章节序号壳 675 孩） | 37 | 章节壳只改名不删；子树零损失 |
| 第四批 | A 捆绑拆解（143 真捆绑，29 带子树：数据访问接口与连接生态 24 孩、Java并发容器和框架 23 孩等） | 143 | 每组要单独设计拆分方案，不能模式化 |
| 第五批 | D 过程片段进 mechanismSpec（AOP ①~⑤ / Bean 1~5 / SQL 军规 1~10 / 秒杀场景树） | 43 | 激活机制视图，需建 spec 契约 |
| 第六批 | 泛词壳 + 「X 的 Y」描述短语形态（两级调度模型等）+ 词汇表闭合 | 待扫 | 新口径，先出清单再动手 |
