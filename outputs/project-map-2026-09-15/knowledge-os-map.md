# Knowledge-OS 全景图 · 文本版

> 快照 2026-09-15 · HEAD `8cd8b79`　｜　与 `knowledge-os-map.html` 内容等价，去掉样式与视觉件
> 计数方法：数据基数由 node 脚本 `JSON.parse` 实测（tree 递归遍历含深度分布；pool 取键并集；edges 按 `type` 归组）；源文件数按目录实际 `.ts / .tsx / .css` 统计。
> ⚠️ 工作区当时有 16 个 index 相关文件处于外部在飞修改状态（未提交）。本文描述的是**当时工作区**的结构与基数，不是 HEAD 的字节快照。

---

## 总览

单页知识库：**目录树 + 本体池 + 关系边 → 多投影视图**。

6 个真源 JSON 是唯一事实源；`src/knowledge`（30 个纯逻辑模块）把真源投影成派生模型；`src/core` / `components` / `panels` 消费派生模型渲染成 6 个主视图。**UI 层不直接读 JSON 文件——除 `VersionChainRail` 一个例外。**

```
数据真源         6
池实体           3 858
宇宙树节点        3 215
关系边           4 163
问题             783（763 已答）
源文件           104（94 码 + 10 css）
```

---

## 01 应用骨架：四区栅格 + 视图切换

入口 `src/App.tsx`（267 行）。顶栏切视图，**左栏树与右栏解释卡常驻**，中栏是唯一随视图切换的区域，非默认视图走 `lazy()` 按需加载。

```
┌────────────────────────────────────────────────────────────────────────────┐
│ header · TopBar    视图 │ 时态索引 │ 机制 │ 节点库 │ 问题库 │ Tag库          │
│                    + LinkImportDialog  + DocumentImportDialog              │
├────────────────┬──────────────────────────────┬────────────────────────────┤
│ 左栏【常驻】     │ 中栏【★ 唯一切换区】           │ 右栏【常驻】                │
│ UniverseTree   │ center-view                  │ RightSidePanel             │
│                │                              │                            │
│ 宇宙树 3 215 节点│ universe  → FocusStage       │ ① ExplanationCard 解释卡    │
│ 13 层           │ index     → TemporalIndex-   │    （编辑/预览切换在它内部） │
│ 可折叠 42px     │             Workspace        │ ② 问题区 .right-section     │
│ 可拖宽 180–560  │ mechanism → MechanismLens-   │    ❓问题 + 计数            │
│ 虚拟渲染        │             Panel            │    └ .right-question-card×N │
│ useProgressive- │ database  → NodeDatabase     │       （可拖拽）            │
│ Render          │ questions → QuestionDatabase │ ③ SystemConnectionMap 关系网│
│ 选中 →          │ supertags → SupertagLibrary  │                            │
│ selectTreeEntry │                              │ 宽 280–1200，可拖           │
│                 │ （非默认视图 lazy()+Suspense）│ 错误边界按焦点节点重挂载      │
├────────────────┴──────────────────────────────┴────────────────────────────┤
│ 全局覆盖层                                                                   │
│ DataLoadBanner 装载报告（缺失/失败/警告）│ ErrorBoundary 按视图 key 重挂载     │
│ Suspense 懒加载占位                      │ Toast 通知层 notifications          │
│ ★ 跨区拖拽：把右栏问题卡拖到左树节点 = 转移问题归属（QUESTION_DRAG_TYPE）        │
└────────────────────────────────────────────────────────────────────────────┘
```

**读法**：紫色块 = 常驻区域；绿色块 = 视图切换区；琥珀块 = 全局覆盖层。

---

## 02 数据模型：6 个真源与引用关系

全部落在 `data/*.json`。前后端都按同一份白名单走：`vite.config.js` 的 `DATA_FILES` + `DATA_PAYLOAD_VALIDATORS`，`/api/data` **只放行这 6 个文件**（未登记实测 403）。

### 引用方向

五个真源都通过**外键指向池**；池本身不反向存引用。

```
tree-data.json          ──nodeRef──────────┐
knowledge-edges.json    ──source / target──┤
questions.json          ──relatedNodeId────┼──▶  node-pool.json（本体池）
evolution-events.json   ──scopeRootId──────┤
version-chains.json     ──entityId─────────┘
```

### 六个真源

| 文件 | 基数 | 结构 / 关键字段 |
|---|---|---|
| `tree-data.json` | 3 215 节点 / 13 层 | `{ id, name, count, nodeRef, children }` |
| `node-pool.json` | 3 858 实体 · 12.7 MB · 20 字段 | `Record<id, KnowledgeNode>` · 100% 带 tags |
| `knowledge-edges.json` | 4 163 条 / 55 种 type | `{ id, source, target, type, label, dimensions?, relationKind? }` |
| `questions.json` | 783 题 / 763 已答 | `{ id, text, answered, kind?, difficulty?, answer?, relatedNodeId?, ... }` |
| `evolution-events.json` | 2 条（全 `release`） | `{ id, type, scopeRootId, occurredAt, title, summary, ... }` · append-only |
| `version-chains.json` | 2 链 / 6 版本 | `{ entityId, versions[{ id, label, releasedAt, eolAt, previous, ... }] }` |

### 字段级 schema（实测同名键并集）

**KnowledgeNode**（`node-pool` 值 · 20 键并集 · 3 858 实体）

- `id` `label` `role?` `tags?` `aliases?` —— 身份与标签（**100% 带 tags**）
- `card: { nodeId, title, rootContent, rootTable?, tabs[] }` —— 解释卡正文；tab 键并集 `{ id, label, content, tags, pages, tabs, weight }`（可递归嵌套）
- `dimensions?` —— 分类维度（1 248 条有值）；`viewDimensions?` —— 视图维度快照
- `mechanismSpec?` —— 机制视图的参与方声明（机制投影的输入）
- `relationIndex?` `projection?` `parentId?` —— 派生 / 挂载索引
- `locked?` `shared?` `status?` —— 治理标记
- `redirectTo?` `canonicalNodeId?` `canonicalKey?` `kind?` `layoutHint?`

`role` 分布：无 2 104 · plain 1 012 · subsystem 271 · concept 147 · mechanism 106 · reference 81 · conclusion 77 · axiom 35 · group 25

**TreeNode**（`tree-data` 递归 · `{ id, name, count, nodeRef, children[] }`）

- 3 215 节点，**每一个都带 nodeRef（3 215 / 3 215）**
- 最大深度 13；主体集中在第 6–10 层（507 / 782 / 469 / 368 / 401）
- 根 = `universe`「知识宇宙」；第 1 层 3 个，第 2 层 26 个
- ★ 解析债另计：全库 treebind 存量 2 665 条中有 18 条无法解析（父 treeId 含冒号）；`treeBinding.ts` 与 `shell-fusion/lib.mjs` 两处运行时 `split(':')` **仍是错的**，新写解析须用 `splitTreebind(id, knownIds)`

**KnowledgeEdge**（`edges` 数组）

- 4 163 条；两端都在池内 4 134（29 条指向池外）
- 主关系 `belongs-to` 3 110（归属 / 包含）；其余 53 种为长尾语义（`extends` 258 · `implements` 243 · `instance-of` 253 · `transitions-to` 96 …）
- **索引图只画 6 类**（继承 / 实现 / 依赖 / 关联 / 包含（矩阵）/ 投影）；`requires` 属边表但**不入图**

**Question**（`questions` 数组 · 783 条 · 已答 763 = 97.4%）

- 键并集：`id text answered kind? difficulty? answer? answerSteps? relatedNodeId? source? createdAt? updatedAt?`
- `kind` 分布：recall 321 · comparison 136 · application 136 · mechanism 84 · definition 64 · 无 25 · troubleshooting 14 · design 3
- **消费三处**：① 右栏问题区（焦点节点的问题卡，`questionsForNode`）② 问题库视图（`.question-card` + `QuestionAnswerEditor`）③ 左树角标
- 归属可拖拽改写：`QUESTION_DRAG_TYPE` → `handleQuestionDropOnTree` → `moveQuestionToNode`；落到非树区走兜底提示

**KnowledgeEvolutionEvent**（`evolution-events` 数组 · 2 条 · 全 `type:"release"` · append-only 事实源）

- 键：`id type scopeRootId occurredAt title summary sourceOnlyNodeIds[] introducedNodes[] changes[]`
- `type` 是 **6 值联合**（release / introduce / deprecate / replace / split / merge），**必填**；非法规格被 normalize 严格丢弃
- **运行时只读**：UI 只画事件，不写事件

**VersionChain**（`version-chains` 数组 · 2 链 6 版本）

- 锚 `k_java_fw_spring`、`k_1782746457581_30q8ao`
- **版本 = 状态（名词）≠ 事件（动词）**；`previous` 单指针成链
- 跨实体依赖走边表 `type:"requires"`（2 条），**不存进 VersionNode**

---

## 03 派生管线：真源 → 纯逻辑 → 视图

所有投影都在 `src/knowledge`（30 模块 · 纯函数，**单测只覆盖这一层**）与 `src/mechanism`（6 模块）里算完，**视图层只负责渲染**。

```
① 索引 / 类图管线
   tree-data + node-pool + knowledge-edges
     → treeBinding · treeSelection · explanationIndex · explanationTree · containment · typeRelations
     → indexGraphLayout（几何）
     → UnifiedIndexGraph · IndexCanvas
   ── indexGraphLayout 算出全部坐标：容器框 containmentFrames + 节点矩形 + 分层；
      edgeRouting 供 3 档边路由（detail / compact / overview）；IndexCanvas 负责相机、框选、缩放档位；
      编辑动作经 explanationIndexMutations 回写。

② 时态管线（双轨，‖ 表示并行）
   evolution-events → timelineEvolution(normalize) · indexEvolution(投影/作用域) · temporalPreferences
                    → TemporalRail · EventDrawer
   ‖ version-chains → versionChains(normalize) → VersionChainRail
   ── 事件轨（发生了什么）+ 版本链轨（变成了什么）由 TemporalRail 双轨合成；无事件时整段退回版本链轨。
      ★ 唯一例外：VersionChainRail 自行 fetch('/api/data')，不经过 store 切片。

③ 机制管线
   node-pool.mechanismSpec + knowledge-edges
     → knowledgeProjection · mechanism/core · mechanism/diagram · lens(帧/时间轴/场景) · validation
     → MechanismLensPanel · FlowDiagram · SequenceDiagram · LogicDiagram
   ── 投影来源是 focusNodeId ?? selectedNodeId 的 mechanismSpec；参与方必须与「树后代」并列作候选来源
      ——卸树留池的机制状态否则投影为空。读 relationKind，不读 type。

④ 维度画布管线（默认视图）
   node-pool → projection · physicalProjection · migrateViewDimensions
     → DimensionCanvas → SectionRenderer → Grid / Stack / Tree / Chain / Matrix / BPlusTree
     + GroupOverlay · SemanticFieldView · OrthogonalMatrixView
   ── SectionRenderer 按 section 形状分发到 6 种 section 渲染器；useAtomRect 做原子定位；
      SubsystemStrip 另起一条 subsystemData → 子系统卡片带。

⑤ 关系网 / 问题库 / 解释卡
   knowledge-edges → systemConnectionGraph → SystemConnectionMap
   questions + pool → questionLink · answerComposer → QuestionDatabase · QuestionAnswerEditor
   pool.card → explanationTree · explanationTable · nodeReferences · supertags · supertagMaterials
     → ExplanationCard → MarkdownView · ExplanationTableSection · ProjectionReferences ·
       SupertagPanel · MechanismSpecEditor

⑥ 写入 / 持久化
   视图编辑动作 → store/useGraph（单一 store） → state · persist · filePersistence · dataValidation
     → data/*.json
   ── 写盘三铁律：先杀 dev server（内存回写会覆盖外部写入）· 一律原子写 + 先备份 data/backups/ ·
      测试只打临时数据目录。读路径则相反：vite preview 的 /api/data 直读文件，改数据不必重新构建。
```

---

## 04 视图单元清单

6 个主视图（顶栏可切）+ 常驻单元 + 附属单元。全部 47 个 `.tsx` 中，除 `App` / `main` 两个入口外，其余 **45 个都是可渲染组件**；下面列的是「有独立职责的视图单元」，不是全部组件。

### 主视图（中栏）

| 视图 id | 组件 | 组成单元 | 读数来源 |
|---|---|---|---|
| `universe` | `core/FocusStage.tsx` | DimensionCanvas · SubsystemStrip | pool.viewDimensions + units |
| `index` | `core/TemporalIndexWorkspace.tsx`（1 264 行） | UnifiedIndexGraph(IndexCanvas) · TemporalRail(VersionChainRail) · EventDrawer · 内联编辑面板 | tree + pool + edges + events + chains |
| `mechanism` | `components/MechanismLensPanel.tsx` | FlowDiagram · SequenceDiagram · LogicDiagram · 播放控件 | pool.mechanismSpec + edges |
| `database` | `components/NodeDatabase.tsx` | 表格 + 渐进渲染 | pool（3 858 条） |
| `questions` | `components/QuestionDatabase.tsx` | QuestionAnswerEditor · questionLink 角标 | questions（783 条） |
| `supertags` | `components/SupertagLibrary.tsx` | `.supertag-index`（左索引）· `.supertag-detail`（右详情）· MarkdownView（对比模式） | node + tab + page 三层 tags 倒排（5 511 组 / 9 681 材料） |

### index 视图的内部结构：类方框四层剖面

「四层」是**视觉竖切**的读法，不是 DOM 父子深度 —— `header` 与 `members` 是**兄弟**。

```
L1  article.explanation-index-class-node              UnifiedIndexGraph.tsx:1404
    唯一有完整 1px 边框的层；基线 index-diagram.css:634，角色覆写 :1407–1416
    │
    ├─ L2a  .explanation-index-class-header           :1431   88px · 下边 1px
    │        └─ -header-main > strong（15px / clamp 4 行）
    │           -timeline-badge                       CSS :752
    │
    └─ L2b  .explanation-index-class-members          :1627   bg #303236 · 无边框
             ★ 与 L2a 是兄弟，不是父子
             ├─ L3  > header                          :1629   28px「成员 N ｜ +M 更多」
             └─ L3  .explanation-index-class-member-list  :1661
                      ├─ L4  .explanation-index-class-member        :1675
                      │       min 32px · 无边框 · 缩进 8px + depth×13px
                      │       └─ .explanation-index-member-icon     :1748 / CSS :1355
                      │              P 蓝（Page，pageId !== null）· T 橙（Tab）
                      └─ L4  .explanation-index-class-member-more   :1833「还有 M 项」
```

硬上限 `MAX_VISIBLE_MEMBERS = 12`（`indexGraphLayout.ts:152`）⇒ 50 成员 = 12 行 + 「还有 38 项」，算得闭合。

**画布层的另一套机制 + 结构异常**（未修，另立批次）

- 画布是**几何嵌套**：全部方框是绝对定位的扁平兄弟，父子靠 `indexGraphLayout` 算坐标；`.explanation-index-containment-matrix`（:585）是 z0 的跨节点描边框
- `.index-canvas-marquee`（`IndexCanvas.tsx:500`）**零 CSS 规则**（src + dist 双向核验）⇒ 左键框选时选框不可见
- `.explanation-index-group-frame`（:1343）容器**无任何规则**，仅 `-label{display:none}`（:1402）⇒ 非 matrix-host 的分组框是隐形命中区
- `components.css` 4774–5080 约 300 行**死 CSS**（`-unified-node` / `-node` / `-parent-surface` / `-title-surface` / `-leaf` / `-label` / `-edit-trigger` / `-tree`）—— tsx 引用数全为 0
- 3 个类在 `components.css` 与 `index-diagram.css` **重复定义**，靠加载序决胜（index-diagram 胜）

### supertags 视图（tag 库）的内部结构

`SupertagLibrary.tsx` · `database.css:414–740`

**布局：左索引 + 右详情，只有两栏**

- 根 `.supertag-library`（:414）flex column · **1px 边框 + r4** —— 视图容器留框（与「纯内容容器去框」相反）
- 工具栏复用 `.database-toolbar`：左 `.supertag-library-search`（:424，宽 `min(320px,44vw)`）+ 右 `.supertag-library-count`（:429）「N 个 super tag · M 个材料」
- 主体 `.supertag-library-body`（:435）：`grid-template-columns: minmax(180px,240px) minmax(0,1fr)` —— 左 tag 索引 / 右材料详情，**没有第三栏**
- 左栏 `.supertag-index`（:443）带 `border-right`；条目 `.supertag-index-item`（:452）是按钮，grid「名字 + 计数」，边框透明，hover 转青、`.is-active` 青底 `rgba(6,182,212,.12)` 文字 `#67e8f9`
- 空态 `.supertag-library-empty`（:733）「暂无 super tag」；搜索无命中时（:118）**整块替换 body**，不是局部置空

**右栏两块：标题行 + 双模式**

- 标题行 `.supertag-detail-head`（:508）：`<h3>{tag}</h3>` + 「N 段材料 · M 个领域知识节点」
- `.supertag-mode-switch`（:529）**恰好两枚**：`材料` / `对比`（`SupertagLibraryMode` enum，默认 `Materials`）
- **材料模式**：`.supertag-material-grid`（:556）`auto-fill minmax(220px,1fr)`；卡 `.supertag-material-card`（:562）1px 边框 · r4 · min-height 110px，四行 = 节点名 + kind 角标（标题/子页/节点）· 材料路径 · 领域路径 · **180 字预览**（`compactText`）
- **对比模式**：`.supertag-comparison`（:632）`grid-auto-flow: column` 横向排；列 `-column`（:642）三行网格 `auto auto minmax(0,1fr)`，正文用 **`MarkdownView` 全文渲染**
- 一致度角标 `.is-shared` 绿 `#34d399`「N 段一致」/ `.is-distinct` 琥珀 `#fbbf24`「独有表述」；判据是 `supertagMaterialSignature` = 正文去空白 + 小写（`supertagMaterials.ts:189`），即 **「一致」= 文本完全相同**

**数据管线：tag 不是一个字段，是三个层级的汇聚**（`supertagMaterials.ts:146`）

- 先遍历全池，每节点产出一条 **node 材料**（`node:<id>`）：正文取 `card.rootContent`，空则递归找第一个非空 tab/page（`firstNodeContent` :39）
- 再 `collectTabs`（:112）递归 tab → `collectPages`（:78）递归嵌套页，各产出一条材料，id 形如 `tab|page:<nodeId>:<idPath>`
- 三层的 `tags` 都被 `appendMaterial`（:57）收进同一张倒排表 ⇒ **同一个 tag 组里混着「整节点 / 某 tab / 某子页」三种粒度**（`SupertagMaterialKind` = node / tab / page）
- 分组键 `supertagKey` = NFKC 归一 + 去前导 `#` + trim + 小写（`supertags.ts:5`）；同一材料内同 tag 只记一次（`seen` 去重）
- 排序：组内「节点名中文序 → 路径」，组间「材料数降序 → tag 中文序」（:175 / :182）
- 点材料 → `openCard(nodeId)` + `setActiveExplanationSelection(selection)`，把解释卡**精确落到那个 tab / page**（`Root` 或 `Content`）
- 「领域路径」栏 = `collectTreeReferencesByNodeRef(treeData, nodeId).path.slice(1,-1)`，即该节点在宇宙树的挂载点**去掉根首段**（:76）

**实测基数**（读 `data/node-pool.json` 现算）

```
池 3 858 节点（100% 带 tags）· 5 511 个 super tag · 29 323 条材料挂载（跨组）· 去重 9 681 条

去重材料构成 = node 3 858 + page 5 235 + tab 588      ⇒ 54% 的材料是子页
tag 原始条目来源 = node 11 136 · tab 2 364 · page 15 832
材料数中位数 1；最大 4 624（method）
只有一条材料的 tag：4 369 / 5 511 = 79.3%；材料数 ≥ 10 的只有 100 个
单节点 tag 数跨度极大：1 638 个节点只有 1 个，同时有节点高达 179 个
对比模式：跨节点「一致」2 104 条 · 「独有」27 219 条；空正文材料 230 条
```

以上由 `collectSupertagMaterialGroups(nodePool)` 本体现算，非估算。

**实测：tag 库头部被「源码导入标签」占据**（数据现状陈述，非缺陷断言）

| tag | 材料 | 节点 | 粒度构成 | 性质 |
|---|---:|---:|---|---|
| `method` | 4 624 | 375 | page 4 622 + node 2 | Java 源码导入：方法 |
| `Java 源码` | 3 902 | 366 | page 3 902 | 导入来源标 |
| `Public` | 3 480 | 322 | page 3 479 + node 1 | 可见性修饰符 |
| `JDK API` | 1 174 | 45 | page 1 168 + node 6 | API 归属 |
| `java` | 1 142 | 715 | node 715 + tab 427 | 语言 / 域（头部里唯一像概念标签的） |
| `package-private` | 823 | 253 | page 823 | 可见性修饰符 |
| `private` | 649 | 116 | page 649 | 可见性修饰符 |
| `mysql` | 564 | 563 | node 563 + tab 1 | 域 |
| `java.util.concurrent` | 551 | 276 | node 276 + tab 275 | 包名 |
| `constructor` | 450 | 311 | page 448 + node 2 | Java 源码导入：构造器 |

读法：`method` / `Public` / `private` / `package-private` / `constructor` / `JDK API` / `Java 源码` 均来自 **Java 源码导入流水线**（按方法名、可见性修饰符、包名打的 *page 级*标签），且几乎全是 `page` 粒度。它们排在最前，占据左栏头部；真正的**概念标签**（`java`、`mysql`、`glossary`、`ACM CCS 2012`、`计算机科学分类`）反而在其后。这不是 bug —— 是「`tags` 一个字段同时承担**概念归类**与**导入溯源**两种职责」的现状。若日后要按「概念」导航，需先决定是否拆分这两类（属独立治理批次，本文不预设结论）。

### 常驻与附属单元

- **TopBar**（`layout/`）—— 6 视图切换、路径面包屑、LinkImportDialog / DocumentImportDialog 入口
- **UniverseTree**（`layout/` · 1 170 行）—— 左栏宇宙树：折叠、拖宽、问题角标、渐进渲染
- **RightSidePanel**（`layout/` · 302 行）—— 三块纵向堆叠：① ExplanationCard ② **问题区 `.right-section`** ③ SystemConnectionMap。错误边界按 `focus:<节点>` 重挂载——某节点数据缺字段不会卸掉整个应用
- **右栏问题区**（`.right-questions-list`）—— 取数 = `questionsForNode(questions, focusNodeId)`，即 `relatedNodeId === 当前焦点` 的问题（**不是树的兄弟节点**）。卡片 `.right-question-card` **无边框**（`components.css:3893`：`border:0 / r0 / transparent`，符合「纯内容容器去框」约定）；单击展开答案、双击重命名、拖到左树换归属。空态「暂无问题」
- **问题库视图的问题卡**（`database.css:195`）—— 另一种形态：`.question-card` **有边界**（1px `--border-secondary` · r4 · padding 6px 8px），变体 `-selected` / `-editing`；点选后由 `QuestionAnswerEditor` 作答。**同名两形**：右栏去框、问题库留框
- **ExplanationCard**（`panels/`）—— 解释卡本体：tabs / pages 多级、表格、投影引用、supertag、机制声明编辑
- **SupertagPanel**（`panels/explanation/` · tag 库入口）—— 解释卡头部 `.explanation-card-supertag-inline`（`ExplanationCard.tsx:286–288`）里的横向 tag strip，每枚是 `.concept-supertag--link` 按钮（`components.css:135`）。`activeTags` = **当前节点 tags + 当前选中 tab/page 的 tags**（:150 `normalizeSupertags` 去重）⇒ 切 tab 时这排标签会变。点击 → `openSupertag(tag)`（`useGraph.ts:1083`）→ `set({ selectedSupertag: normalizeSupertag(tag), activeView:'supertags' })`；**只切视图 + 记住 tag，不动 `selectedNodeId`**，左树选中态保持
- **MarkdownView**（`panels/explanation/`）—— 自研 markdown 渲染（非第三方库）：代码块 / 表格 / 标题 / 列表 / 行内代码 / 引用知识点 / Mermaid
- **SystemConnectionMap**（`panels/`）—— 关系网：由边表派生，右侧栏常驻
- **对话框族**（`components/`）—— DocumentImportDialog · LinkImportDialog · JavaSourceImportPanel · TreeDestinationPicker（共同决定导入落点）
- **框架件**（`components/`）—— DataLoadBanner（装载报告）· ErrorBoundary（按视图 key）· useProgressiveRender（长列表渐进渲染）

---

## 05 代码结构：104 个文件的分层

分层纪律：**真源 → 纯逻辑（有单测）→ 视图（不写单测，改完无头实测）**

| 目录 | ts | tsx | css | 职责 |
|---|---:|---:|---:|---|
| `src/knowledge` | 30 | 0 | 0 | 全部纯逻辑投影：索引 / 树绑定 / 包含 / 类型关系 / 机制转译 / 持久化 / 校验 |
| `src/mechanism` | 6 | 0 | 0 | 机制模型与转译（core / diagram / lens / knowledgeProjection / validation / index） |
| `src/core` | 1 | 4 | 0 | 核心视图：FocusStage · DimensionCanvas · SubsystemStrip · TemporalIndexWorkspace |
| `src/core/explanation-index` | 4 | 2 | 0 | 索引图画布：布局 / 相机 / 边路由 / 切割手势 / 画布 |
| `src/core/sections` | 1 | 10 | 0 | 维度画布的 6 种 section 渲染器 + 叠加层 + 原子定位 |
| `src/core/temporal` | 0 | 3 | 0 | 时间轨 / 版本链轨 / 事件抽屉 |
| `src/components` | 1 | 11 | 0 | 独立视图（节点库 / 问题库 / Tag库 / 机制）+ 导入对话框 + 框架件 |
| `src/components/mechanism` | 1 | 3 | 0 | 流程 / 时序 / 逻辑三种机制图 + 色调映射 |
| `src/panels` | 0 | 2 | 0 | 解释卡本体 + 关系网 |
| `src/panels/explanation` | 0 | 7 | 0 | 卡片内部件：markdown / 表格 / 引用 / supertag / 机制编辑 / mermaid |
| `src/layout` | 0 | 3 | 0 | 顶栏 / 左栏树 / 右栏面板 |
| `src/store` | 1 | 0 | 0 | 单一 zustand store（`useGraph`）：全部状态与动作 |
| `src/styles` | 0 | 0 | 10 | main(tokens) · layout · components · index-diagram · timeline · database · mechanism-diagrams … |
| `src`（根） | 2 | 2 | 0 | App / main / types（全局类型，410 行）/ env.d |
| **合计** | **47** | **47** | **10** | — |

---

## 06 治理层：批次、门禁与台账

除应用代码外，仓库还有一层「数据治理」基础设施——每个可提交批次都要过门。

- **`batch-manifests/`（13 个）** —— 每批次三集合：`writeSet`（= `git add` 唯一来源）· `governanceSet` · `declaredExternalSet`。硬不变量：`commitPathspec ≡ writeSet`，且与另两集合不相交
- **`scripts/`（95 mjs + 4 java）** —— 核验与迁移脚本：就绪门（6 检查 + 3 闸门）、外部漂移四方基线分类、改名证据引擎、树违规扫描、投影回归测试
- **`docs/`（35 md）** —— 宪法（§3.1 挂载位置不是身份证据 · §3.2 判据须附基数 + 反例）· ADR · 批次清单规范 · 架构与项目说明
- **`data/backups/`（快照）** —— 每次落盘前按语义名 + ISO 时间戳备份；就绪门的祖先闸门读 `git show HEAD:` 逐字节比对
- **`outputs/`（台账）** —— 只读取证产物：就绪门报告、违规扫描矩阵、验证报告。**只入台账不入库**（精确登记进批次排除集）
- **验收三段（纪律）** —— 纯逻辑：`npm test`（tracked 50 + peer 2）。视图：`tsc --noEmit` + build + 无头浏览器逐条实测 + 刷新复测。数据：plan（只读多门）→ apply（默认 dry-run）→ verify（不 import apply）

---

## 附：开放债（登记在案，勿顺手修）

- **treebind 存量债**：全库 2 665 条、18 条无法解析（父 treeId 含冒号）。两处运行时 `split(':')` 仍是错的
- **T10 结构一致性债**：`projection:*` 树 id 237（227 有正文）；`asplit_s2_asplit_*` 双前缀 56；`atomic_atomic_*` 9；池 `asplit_*` 命名空间 132 + 248 条边端点指向它；`react_root` nodeRef 串线
- **treeId 语义化同类非语义 id 约 1 521 条**（时间戳 + hash 880 / `_s<N>_` 296 / 导入前缀 212）—— 后续独立批次
- **死 CSS 清理**：`components.css` 4774–5080 约 300 行，独立治理批次
- **versions-v1.2**：`versionChains` 接 store 第 6 切片（`useGraph.ts` 为外部在飞件，空闲后动）+ `inspectVersionChains` 进装载路径
