# Knowledge-OS Handoff 文档

## 概述与架构

项目是 Knowledge-OS v3.0，一个以数据库核心概念（MySQL锁、事务、MVCC、存储引擎等）为知识图谱的应用。

**架构核心：**
- `nodePool`（节点表 → is-a 是什么） / `knowledgeEdges`（边表 → 连着谁） / `treeData`（目录 → 仅导航，nodeRef 指向 nodePool）
- 解释卡只读 nodePool 自身字段（定义/机制/边界/来源）
- 右侧 `RightSidePanel`：解释卡 → 问题区 → 关系网
- 中心 `ReasoningKernel`：维度切换 + 漏斗图/维度画布 + 子系统条
- 左侧 `UniverseTree`：目录导航，右键可添加问题

## 我们做了什么

### 1. 布局重构（从中心"Tab切换" → 永远显示视图）
- **App.tsx**: 中心区域默认始终显示 `ReasoningKernel`；`database`/`questions` 模式带"← 返回视图"按钮
- **TopBar.tsx**: 去掉未实现的标签（系统/关系/时间线/多维共存）和图标（3D/全屏/通知）
- **UniverseTree.tsx**: 移除底部重复的多维视图选择器；新增右键"❓ 添加问题"
- **RightSidePanel.tsx**: 移入 `QuestionBank`（原问题库面板），改为按目录焦点联动
- **ReasoningKernel.tsx**: 顶部新增维度切换条

### 2. 知识架构修正（解释卡--外在净化）
核心原则：**三元分治** —— 内在属性在节点自身 / 实现细节在所属系统 / 比较性知识独立承载。

- **表级锁/行级锁/页面锁的 card**：只保留"定义"、"机制"、"边界"、"来源"
  - 删除了"MyISAM 默认使用"（→ 移入 MyISAM 节点）
  - 删除了"开销大/小"、"并发度高/低"（→ 新建 `锁粒度对比` 节点）
- **InnoDB/MyISAM 节点**: 改为关注引擎自身结构与能力，engine-lock 通过新边明确：`innodb --[uses]--> rowLock` / `myisam --[uses]--> tableLock`
- **新增 `锁粒度对比` 节点**：独立承载"开销大小"、"并发度高低"、"死锁有无"的关系属性，通过 `compares` 边连入三个锁节点，并挂入目录树

### 3. 级联删除修复
- **`removeKnowledgeNode`**：删节点级联清理 edges、treeRefs（纯引用删除，有子节点则清除引用变文件夹）、questions 关联、selected/focus ID
- **`persist.ts`**：`mergeWithInitialKnowledge` 不再从 canonical 复活已删除项（nodePool / edges / questions 三个维度全部改为 stored 优先）

### 4. 问题可关联到文件夹
- **`selectTreeEntry`**：文件夹（无 nodeRef）用 `treeNodeId` 作 `focusNodeId`，问题可关联到任意目录项
- **右键菜单**：`TreeItem` 新增 `onAddQuestion` prop，右键所有节点（含文件夹）可 ❓添加问题

### 5. 新文件
- `src/core/FunnelCanvas.tsx` — 推理漏斗 SVG 可视化
- `src/core/DimensionCanvas.tsx` — 维度画布（分类树视图）
- `src/core/SubsystemStrip.tsx` — 递归子系统卡片条
- `src/core/funnelLayout.ts` — 漏斗布局算法
- `src/core/subsystemData.ts` — 子系统卡片数据提取
- `src/knowledge/questionLink.ts` — 问题与知识关联查询

## 还没做什么

### 需要继续的工作
1. ~~**问题区缺少 CSS 样式**~~ — ✅ 已修复（2026-06-12）：`components.css` 大规模重写时误删了 `right-questions-list` / `rq-*`、`subsystem-strip*` / `subsystem-card-v2*` 基础样式和 `btn-icon-sm`，已从 git HEAD 恢复并补充 `right-section-count` / `dc-stack-section` / `dc-matrix-section`
2. **关系比较性知识** — `锁粒度对比` 节点已建立，但 `知识宇宙` 中尚无其他比较节点（如"索引对比"、"引擎对比"）
3. **test/tests** — 仅有 scripts/*.test.mjs 三个数据层测试，无 UI 测试
4. **taste-skill 集成** — 已安装 13 个 skill，尚未在知识库前端设计上应用
5. **QuestionStrip.tsx 已删除** — 如需恢复中心视图内问题条，需要重建或从 git 恢复
6. **死代码清理** — `FunnelCanvas` / `RuleComposer` / `SubsystemDeck` / `panels/QuestionBank` / `ViewDataList` 已无任何 import（中心视图改为 DimensionCanvas + SubsystemStrip 后弃用），其样式也已随 CSS 重写删除，可考虑删除这些组件文件
7. **旧文件 TS 报错** — `tsc --noEmit` 在旧组件（RelationNetwork/NodeDatabase/QuestionDatabase/UniverseTree 等）有约 200 个历史报错（untyped useState 泛型、隐式 any），新模块（DimensionCanvas/sections/projection/useGraph）全部干净；vite build 不受影响

### 已知问题
- `nodepool 维度过滤下拉` 的维度列表现由 `nodePool` 动态提取，但 `allDimensions` hook 放在 JSX 中间位置可能有问题（已修复过但仍需验证）
- `demoSeed.ts` 中 `lock` 节点的 `viewDimensions` 的 children 仍保留比较性 desc（如 "开销小·并发最低"），这些应移到"锁粒度对比"节点内，仅保留 link 到该节点即可

## 项目结构速查

```
src/
  App.tsx          — 主布局（三栏：left | center | right）
  types.ts          — 所有类型定义
  store/useGraph.ts — Zustand 全局状态
  layout/           — 布局组件（TopBar/BottomBar/UniverseTree/RightSidePanel）
  core/             — 核心可视化（ReasoningKernel/FunnelCanvas/DimensionCanvas/SubsystemStrip）
  panels/           — 独立面板（ExplanationCard/RelationNetwork/QuestionBank）
  components/       — 数据库组件（NodeDatabase/QuestionDatabase）
  knowledge/        — 知识数据与逻辑（demoSeed/persist/state/extractSubgraph）
  styles/           — CSS（main/layout/components/database）
```
