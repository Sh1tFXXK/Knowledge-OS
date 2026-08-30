# 知识点固定拆分研究（Facet Decomposition）

> 最新状态：2026-08-17
> 目标：回答「每个知识点是否都能用一套固定维度拆开？拆成哪些维度？如何落进 Knowledge-OS 的现有数据模型？」

## 1. 研究问题

Knowledge-OS 的节点池里已经有 3051 个知识节点、3824 条关系边、560 个问题。但这些节点的「正文组织」目前是随来源而异的自由结构：只有「定义」被标准化（2120 个节点使用 `def` tab），其余内容（历史、实现、示例、缺点、结构……）的 tab 名来自各个来源文档的章节标题，互不统一。

本研究的命题是：**每个知识点都可以用一组固定的「面（facet）」来拆解**，例如定义、结构组成、生命周期、种类、参与者等。研究要回答三个子问题：

1. 是否存在一组跨领域通用的固定维度？（外部框架调研）
2. 这组维度如何与节点池里已有的角色、种类、维度标签、关系边对齐？（现状盘点）
3. 如何落地：固定维度作为正文组织标准、边语义、以及导入/整理时的分类指引？（提案与映射）

## 2. 现状盘点：系统里已经有什么

### 2.1 节点模型

| 字段 | 现状 |
| --- | --- |
| `id / label` | 节点身份 |
| `role` | `axiom`(12)、`mechanism`(101)、`conclusion`(2)、`subsystem`(275)、`plain`(541)、`topic`(5) |
| `kind` | `concept`、`entity`、`state`、`event`、`rule`、`mechanism`、`evidence` |
| `dimensions` | 视角标签：storage(426)、transaction(127)、performance(94)、jvm(58)、runtime、security、concurrency、frontend、react…… |
| `card.tabs` | 解释卡正文，tab 结构目前自由（`def` 2120、`sec_N` 来源章节、`源码 API` 385、`历史`、`外部链接`、`实现`、`示例`……） |
| `mechanismSpec` | 机制根的固定拆分（见 2.2） |

### 2.2 系统里已有的「固定拆分」：MechanismSpec

机制根节点已经拥有一套强制校验的固定结构（`validateMechanismSpec`）：

- `phenomenonNodeId` 现象（= 机制根自身）
- `triggerNodeIds` 触发
- `participantNodeIds` 参与者
- `stateNodeIds` 状态（至少 2 个）
- `transitionEdgeIds` 转移（边，语义必须是 causality / state-transition）
- `constraintEdgeIds` 约束（边，语义必须是 constraint）
- `outcomeNodeIds` 结果
- `failureNodeIds` 失败路径

这是一条重要证据：**固定拆分不是新概念，系统已经用「节点池 + 类型化边」实现了一套**，只是目前只覆盖 `mechanism` 一种角色，且只覆盖动态面。

### 2.3 边的语义（relationKind）

| 边类型 | 数量 | 含义 |
| --- | --- | --- |
| `structure` | 2811 | 结构组成 / 包含 |
| `state-transition` | 21 | 状态转移（生命周期） |
| `constraint` | 7 | 约束 |
| `causality` | 2 | 因果 |
| （未标注） | 983 | 以 `type` 表达：belongs-to、extends、implements、uses、depends-on、enables、needs-for、transitions-to、guards、compares…… |

结论：**结构、分类、因果、状态转移、约束这几类语义已经在边层存在**，只是没有全部收敛到 `relationKind`，也没有与正文 tab 建立对应关系。

### 2.4 问题库

`data/questions.json` 存 560 个问题：`text`、`answered`、`kind`（如 mechanism）、`difficulty`。这是「自测面」的现成存储，尚未与节点 facet 显式绑定。

### 2.5 观察结论

1. 「定义」已经是事实上的第一面（2120 个节点）。
2. MechanismSpec 证明「固定拆分 + 校验」在技术上可行且已被接受。
3. 其余内容面处于无规范状态：同一类知识点，来源文档写什么就存什么。
4. 边的语义面（结构/分类/状态转移/约束/因果）与正文 tab 是两条平行线，没有映射。

## 3. 外部框架调研

### 3.1 GoF 设计模式模板（软件领域最成熟的固定拆分）

GoF《设计模式》每个模式用固定小节描述：**意图（Intent）、动机（Motivation）、适用性（Applicability）、结构（Structure）、参与者（Participants）、协作（Collaborations）、后果（Consequences）、实现（Implementation）、示例代码（Sample Code）、已知应用（Known Uses）、相关模式（Related Patterns）**。

对照用户的示例：定义≈意图，结构组成≈结构，参与者≈参与者，种类≈相关模式/变体。GoF 验证了「同一类知识点用同一套小节」在专业领域内的可行性——并且**允许某些小节留空**（不是每个模式都有独立「动机」）。

### 3.2 Wikipedia 条目结构

维基百科条目有稳定骨架：定义段（lead）、历史、机制/原理、类型/分类、示例、应用、批评/限制、参见、参考文献。它说明两点：**定义永远在第一段**；**历史/证据是独立面，不应混入定义**。

### 3.3 Bloom 知识维度（认知层）

Bloom 修订版把知识分为四类：**事实性、概念性、程序性、元认知**。对应到节点：

- 事实性 → 定义、证据、示例
- 概念性 → 边界、种类、结构
- 程序性 → 机制、生命周期、触发/结果
- 元认知 → 权衡、自测问题

这给出一个判据：一个「完整」的知识点应能回答至少三类问题，只写定义（事实层）的节点是未展开节点。

### 3.4 MECE（不重不漏）

麦肯锡 MECE 原则：拆分维度应互斥且完整。对知识拆分的直接要求：

- **不重**：同一事实只属于一个面（例如「定义」里不要写「为什么用」，「机制」里不要写「什么时候用」）。
- **不漏**：一个面的内容若存在，必须有归属；不存在时该面明确为空（而不是消失）。

「面为空」和「面不存在」是两回事——这是固定拆分与传统自由文档最大的差异，也是它能暴露知识缺口的原因。

### 3.5 5W1H / 亚里士多德四因

- 5W1H：What（定义）、Why（动机/权衡）、Who（参与者）、When/Where（场景）、How（机制）。
- 亚里士多德四因：质料因（结构组成）、形式因（种类/定义）、动力因（机制/触发）、目的因（结果/应用）。

两个古典框架给出同一结论：**「是什么、由什么组成、怎么动、谁来动、产出什么、什么时候用」是人类理解任何事物的六个自然切口**，与领域无关。

### 3.6 实体建模 / DDD / UML

- ER 建模：实体、属性、关系、基数 → 对应「结构组成（属性）+ 相关概念（关系）+ 参与者（角色）」。
- DDD：实体有**身份、属性、行为、生命周期**；值对象只有属性；聚合有边界。→ 「身份/定义」与「生命周期」是实体类知识点的必选项。
- UML 状态机：状态 + 事件 + 转移 + guard → 与 MechanismSpec 的 `states/transitions/guards` 完全同构。

### 3.7 组件 / API 文档模板

工业组件文档（JDK 类文档、框架参考手册）的固定结构：**概述、依赖、配置、生命周期（初始化/销毁）、API 参考、示例、故障排查**。JDK 类文档尤其明显：每个类有「字段、构造器、方法」三个固定 tab——这正是本仓库 JDK 导入生成 `源码 API` tab 的来源。

### 3.8 卡片笔记（Zettelkasten / 原子笔记）

原子笔记原则：一张卡片只讲一个概念，卡片间用链接组织。对本文的启示：**固定拆分是「单节点内部」的组织，节点之间的关系仍由边承担**；两者不冲突，反而互补——facet 让单节点完整，边让节点间连通。

### 3.9 共识提炼

跨框架收敛出的规律：

1. **存在一套跨领域通用的核心面**：定义（是什么）→ 结构（由什么组成）→ 种类（有哪些变体）→ 生命周期（怎么变化）→ 参与者（谁参与）→ 机制（怎么运转）→ 应用（何时用）→ 权衡（为什么这样取舍）→ 证据（依据什么）。
2. **固定 ≠ 全填**：固定的是「面目录」和「适用规则」，不是要求每个节点填满所有面。空面是合法状态，用来暴露「这个点还没研究透」。
3. **定义永远第一**：所有框架都把定义/意图放在最前。
4. **动态面需要图**：生命周期、机制、触发/结果这类面，光靠正文难以表达状态与转移，需要边（state-transition / causality / constraint）——系统已具备。
5. **元层面独立**：历史、来源、示例、自测问题不属于概念本身，应作为独立面而不是塞进定义。

## 4. 提案：统一 Facet 目录

### 4.1 设计原则

1. **单一目录**：全系统只有一份 facet 目录（id 稳定、中文名稳定、语义稳定）。
2. **目录固定，应用可选**：每个节点按 `kind`/`role` 从目录里取子集；子集之外的面不显示，子集之内的面允许为空。
3. **正文与边同构**：每个面要么有正文 tab，要么有对应边语义，要么两者都有；禁止「正文说一套、边说另一套」。
4. **机制面复用 MechanismSpec**：`mechanism` 角色节点的动态面直接由 `mechanismSpec` 承担，不另建正文。
5. **元数据面不参与定义**：证据/来源/问题不混入概念正文。

### 4.2 Facet 目录（16 面，分 6 组）

| 组 | facet id | 中文名 | 回答的问题 | 主要存储 |
| --- | --- | --- | --- | --- |
| 身份面 | `def` | 定义与身份 | 它是什么？全称/别名/缩写？ | 正文 tab（已有 `def`） |
| 身份面 | `boundary` | 边界与区分 | 它不是什么？与相邻概念怎么区分？ | 正文 tab |
| 结构面 | `structure` | 结构组成 | 由哪些部分组成？层次/模块/字段？ | `structure` 边 + 正文 |
| 结构面 | `kinds` | 种类与变体 | 有哪些子类型/分类维度？ | `classification` 边 + 正文 |
| 结构面 | `participants` | 参与者与角色 | 谁参与？各角色职责？ | `participant` 节点引用 + 正文 |
| 动态面 | `lifecycle` | 生命周期 | 有哪些状态？如何转移？ | `state-transition` 边 + 状态节点 |
| 动态面 | `mechanism` | 机制与原理 | 如何运转？因果链是什么？ | `causality` 边 / mechanismSpec |
| 动态面 | `trigger` | 触发与前置 | 什么条件触发？前置条件？ | `trigger` 节点引用 |
| 动态面 | `outcome` | 结果与影响 | 产生什么结果？成功/失败路径？ | `outcome/failure` 节点引用 |
| 评价面 | `usage` | 应用场景 | 何时何地用？典型场景？ | 正文 tab |
| 评价面 | `tradeoff` | 权衡与取舍 | 与替代方案比，优点/代价？ | 正文 tab |
| 评价面 | `constraints` | 约束与限制 | 不变量、限制、前提？ | `constraint` 边 |
| 佐证面 | `examples` | 示例 | 具体例子/走查？ | 正文 tab（已有 `examples`） |
| 佐证面 | `evidence` | 证据与来源 | 依据哪些文档/代码？ | `evidence`/`reference` 边 + `links`/`files` tab |
| 佐证面 | `related` | 相关概念 | 与哪些概念关联？ | `reference`/`depends-on` 边 |
| 学习面 | `questions` | 自测问题 | 怎么检验理解？ | `data/questions.json` |

### 4.3 适用规则：kind × facet

| facet | concept | entity | state | event | rule | mechanism | evidence |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| `def` | ● 必 | ● 必 | ● 必 | ● 必 | ● 必 | ● 必 | ● 必 |
| `boundary` | ● 必 | ○ 条件 | ● 必 | ○ | ● 必 | ○ | ○ |
| `structure` | ○ 条件 | ● 必 | – | – | ○ | ● 必 | – |
| `kinds` | ● 必 | ○ 条件 | – | ○ | ○ | ○ | – |
| `participants` | ○ | ● 必 | – | ● 必 | – | ● 必 | – |
| `lifecycle` | ○ | ● 必 | – | ○ | ○ | ● 必 | – |
| `mechanism` | ○ | ○ | – | – | ● 必 | ● 必 | – |
| `trigger` | – | ○ | – | ● 必 | ○ | ● 必 | – |
| `outcome` | ○ | ○ | – | ● 必 | ○ | ● 必 | – |
| `usage` | ○ | ○ | – | ○ | ○ | ○ | – |
| `tradeoff` | ○ | ○ | – | – | ○ | ○ | – |
| `constraints` | ○ | ○ | ○ | ○ | ● 必 | ○ | – |
| `examples` | ○ | ○ | – | ○ | ● 必 | ○ | – |
| `evidence` | ○ | ○ | ○ | ○ | ○ | ○ | ● 必 |
| `related` | ● 必 | ● 必 | ● 必 | ● 必 | ● 必 | ● 必 | ● 必 |
| `questions` | ○ | ○ | – | ○ | ○ | ○ | – |

图例：● 必 = 该 kind 的完整节点应具备；○ 条件 = 有内容才填（空面合法）；– = 不适用的面（不显示）。

### 4.4 适用规则：role 补充

`role` 在 kind 之上叠加：

- `axiom`（公理/基础概念）：`def` + `boundary` + `related` 必填，其余从简——公理本身不解释。
- `mechanism`：强制走 4.3 的 mechanism 行，且动态面必须落在 `mechanismSpec`（触发/参与者/状态/转移/约束/结果/失败）。
- `subsystem`（子系统）：强调 `structure` + `participants` + `lifecycle`（组成、角色、启动/运行/销毁）。
- `topic`（主题/聚合）：强调 `kinds` + `structure` + `related`，正文极少。
- `conclusion`（结论）：强调 `def` + `outcome` + `tradeoff` + `related`。

### 4.5 与数据模型的对齐（落地映射）

1. **正文 tab**：固定 id 直接作为 `card.tabs` 的规范 id（`def`、`boundary`、`structure`、`kinds`、`participants`、`lifecycle`、`mechanism`、`usage`、`tradeoff`、`examples`、`evidence`、`related`）。导入产生的来源章节 tab（`sec_N`、`源码 API`、`历史`）保留为「来源页」，但内容在整理时应归入对应的规范面。
2. **边语义**：把未标注的 983 条边收敛到 `relationKind`（`belongs-to→classification`、`transitions-to→state-transition`、`constrained-by/guards→constraint`、`enables/leads-to→causality`、`uses/depends-on→dependency`、`compares→reference`），让 facet 与边一一对应。
3. **机制面**：`mechanism` kind 的节点，facet 内容就是 `mechanismSpec` 的字段，不另建正文 tab；校验沿用 `validateMechanismSpec`。
4. **自测面**：`questions.json` 中 `kind` 字段与节点 facet 绑定（如机制类问题挂到 `mechanism` 面），问题可反向投影为节点的 `questions` 面。
5. **维度标签**：现有 `dimensions`（storage/transaction/jvm……）是**跨节点视角**，facet 是**节点内部结构**，两者正交：dimensions 决定哪些节点一起看，facet 决定单个节点怎么展开。

## 5. 成熟度模型

固定拆分让「一个节点研究到什么程度」变得可度量。建议分四级：

| 级别 | 判据 | 示例 |
| --- | --- | --- |
| L0 术语 | 只有 `def` | 术语字典导入的裸词条 |
| L1 结构 | `def` + `structure` / `kinds` | 有组成和分类的概念 |
| L2 动态 | 加上 `lifecycle` / `mechanism` / `trigger` / `outcome` | 有状态和因果的机制类节点 |
| L3 完整 | 再补 `usage` / `tradeoff` / `constraints` / `examples` / `evidence` / `questions` | 可作为面试复习/复盘对象的节点 |

「完整性 = 该 kind 的必填面是否都有内容」。这条规则可以直接写成校验，类似 `validateMechanismSpec` 但只给 warning（不阻止保存），避免破坏存量数据。

## 6. 在真实节点上的示范

### 6.1 多版本并发控制（MVCC）——`demo_mvcc`，role=mechanism

- `def` ✅ 已有：「多版本并发控制」的缩写……（定义段在 `def` tab）
- `structure`：行隐藏字段 `DB_TRX_ID` / `DB_ROLL_PTR` / `DB_ROW_ID`、undo 日志（插入/更新）、回滚段、聚簇/二级索引差异 → 结构边 + 正文
- `lifecycle`：版本的生命周期（插入 undo 提交后即弃；更新 undo 等无快照引用才清理）→ 状态/转移
- `participants`：事务、一致性读、purge 清理线程
- `mechanism`：多版本 + Read View 可见性算法（已有「机制」补充）
- `constraints`：需配合 purge；RC 与 RR 下 Read View 策略不同（已有「边界」补充）
- `related`：隔离级别、锁、undo log、事务

### 6.2 隔离级别（Isolation Level）——`demo_isolation`，role=axiom

- `def` ✅ 已有
- `kinds`：SERIALIZABLE / REPEATABLE READ / READ COMMITTED / READ UNCOMMITTED（四等级 + 排列顺序）
- `boundary`：隔离是 ACID 中 I；与性能/一致性的平衡
- `usage`：默认 RR；专家选 RC 的场景；边缘级别少用
- `related`：ACID、MVCC、脏读/不可重复读/幻读

### 6.3 B+ 树索引——实体类

- `def`：一种多路平衡查找树，页组织
- `structure`：根/内部/叶子节点、键与指针、页（磁盘块）
- `lifecycle`：插入分裂、删除合并/再分配
- `tradeoff`：与哈希索引比（范围查询 vs 等值）、与 LSM 比（读放大 vs 写放大）
- `evidence`：来源章节 + JDK/MySQL 源码引用

### 6.4 Java 类的加载、链接与初始化机制——mechanism，已有 mechanismSpec

- `trigger`：类加载请求事件 ✅
- `participants`：发起/定义加载器、类字节、运行时 Class、类身份规则、父委派规则、初始化锁 ✅
- `lifecycle`：requested→loading→loaded→verified→prepared→resolved→initialized（+ 两个失败态）✅
- `constraints`：父委派、定义加载器、类身份、字节来源、初始化锁 ✅
- `outcome`：initialized / runtime Class；`failure`：linkage_failed / init_failed ✅

这个节点证明 4.5 的「机制面 = mechanismSpec」已经实际发生，无需改造。

### 6.5 线程生命周期——实体/机制类

- `def`：线程的 6 个状态定义
- `lifecycle`：NEW→RUNNABLE→BLOCKED/WAITING/TIMED_WAITING→TERMINATED（状态机 + 转移条件，对应现有「线程生命周期」「线程的几种状态」tab，可投影为 state-transition 边）
- `participants`：JVM、线程调度器、锁/条件队列
- `examples`：`wait/notify`、`sleep`、`join` 导致的状态示例

### 6.6 单例模式——concept（模式类）

- `def`：意图——保证一个类只有一个实例并提供全局访问点
- `structure`：私有构造器 + 静态实例 + 静态访问方法
- `kinds`：饿汉/懒汉/双重检查/静态内部类/枚举（变体）
- `tradeoff`：线程安全 vs 性能 vs 序列化/反射破坏
- `related`：工厂模式、依赖注入（替代方案）

## 7. 落地路径（按阶段，不破坏存量）

1. **阶段 A：建立目录常量**。在 `src/knowledge/` 增加一份 facet 目录（id/中文名/分组/适用 kind/适用 role），作为唯一真源；UI 只读它渲染 tab 骨架。
2. **阶段 B：收敛边语义**。把 `type` 层面的 belongs-to/transitions-to/constrained-by/enables 等映射到 `relationKind`，让 facet 与边可互查。
3. **阶段 C：整理器接入**。AI 整理提示词改为「把来源内容分类归入该 kind 的 facet 子集，空面明确留空」，导入器输出规范 facet tab。
4. **阶段 D：完整度校验**。按 4.3 矩阵给必填面缺失的节点标 warning（不阻断），形成成熟度面板。
5. **阶段 E：问题绑定**。`questions.json` 支持挂节点 facet，自测面可投影。

存量数据无需迁移：现有自由 tab 全部保留为来源页，facet 是叠加在上面的规范视图，缺面只降成熟度、不删内容。

## 8. 开放问题

1. **facet 是否应允许「来源」与「规范」双轨**：导入的 `sec_N`/`源码 API` tab 保留为来源页，规范面由整理器生成——双轨会造成内容重复，需要明确合并策略（建议：规范面为空时回退显示来源页）。
2. **历史面**：部分来源含「历史」章节（数据库历史、性能改进历史），是否作为独立 `history` facet？本目录暂未列入（历史属于证据面的一种），可后续按需扩展。
3. **facet 与问题库的绑定粒度**：问题挂节点还是挂 facet？建议先挂节点，facet 级绑定作为 L3 扩展。
4. **模式/算法类节点**：如设计模式、调度算法，是否需要专属 facet 模板（如 GoF 的「意图/适用性/实现」）？本目录用通用模板已能覆盖，暂不引入领域专属模板。
5. **校验强度**：必填面缺失是 warning 还是 error？建议 warning（存量数据大量未整理，error 会阻塞保存）。

## 附：一句话结论

> 固定拆分成立：定义、结构组成、种类、生命周期、参与者、机制、应用、权衡、证据、相关概念、自测问题构成一套跨领域通用的 facet 目录；固定的是目录与适用规则，不是每个节点的填充度；动态面交给已有的类型化边和 mechanismSpec，正文只承担静态面。系统已经具备落地所需的全部数据能力，缺的只是「目录」这个唯一真源。
