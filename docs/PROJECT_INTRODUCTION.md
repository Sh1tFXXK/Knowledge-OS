# Knowledge-OS 项目介绍

> 版本：4.0.0 · 更新：2026-09-05

## 一、项目概述

Knowledge-OS 是一个**本地优先的多维知识图谱工作台**。它的核心不是「存储知识内容」，而是聚焦于**知识内部的结构**——把一个领域的技术知识拆解成可关联、可推理、可回顾的结构化单元，并在统一的显式数据模型中维护它们之间的关系。

一句话概括：**它把目录、知识节点、解释索引、问题、类型关系、时间线与机制视图组织在同一套数据模型里，服务于需要持续拆解、关联和回顾的技术知识。**

## 二、核心能力

- **目录树与知识节点分离**：目录只保存引用，正文由节点池唯一持有，避免重复存储。
- **解释索引**：支持根内容、标题层级、页面、标签，以及可编辑的统一索引图。
- **类型与结构关系**：支持 `extends`、`implements`、`belongs-to`、依赖、关联与投影等关系。
- **多视图工作区**：知识宇宙、解释索引、时间线、节点库、问题库、SuperTag、机制视图、系统连接图。
- **文档导入**：Markdown / PDF / HTML / DOCX / TXT；扫描型 PDF 走本地 MinerU OCR。
- **网页导入**：普通网页、GitHub Markdown、Wikipedia，自动清理正文、规范 Markdown、提取标签。
- **Java 源码导入**：通过 JDK Compiler Tree API 提取包、类型、成员、Javadoc 与直接类型关系。
- **本地持久化**：Vite 中间件读写 `data/*.json`，浏览器状态由 Zustand 单向管理。

## 三、技术栈

| 类别 | 技术 |
|---|---|
| 前端框架 | React 19 |
| 语言 | TypeScript |
| 状态管理 | Zustand 5（单一 store，单向数据流） |
| 构建工具 | Vite 8 |
| 图形/图 | mermaid（机制图、关系图渲染） |
| 文档解析 | mammoth、pdf-parse、turndown、jsdom、@mozilla/readability |
| 图标 | lucide-react |
| 网络工具 | ipaddr.js |

## 四、架构分层

分析出的 9 个逻辑层（按依赖方向从外到内）：

| 层 | 文件数 | 职责 |
|---|---|---|
| 应用入口层 | 3 | `main.tsx` / `App.tsx` 启动与根布局装配 |
| 界面组件层 | 34 | `components/` 各类对话框、面板、选择器、视图 |
| 可视化引擎层 | 26 | `core/` 多维画布、漏斗图、推理内核、子系统 |
| 领域逻辑与状态层 | 39 | `knowledge/` + `store/` + `mechanism/` 核心业务 |
| 类型与样式基础层 | 12 | `types.ts`、`env.d.ts`、`styles/` 设计令牌 |
| 数据导入脚本层 | 20 | `scripts/import/` 各类导入流水线 |
| 数据层 | 8 | `data/*.json` 数据真源 |
| 配置与支撑层 | 7 | `package.json`、`tsconfig`、`vite.config` 等 |
| 文档层 | 3 | `README` / `CONTEXT` / `CONTRIBUTING` |

**依赖枢纽**：`src/knowledge/` 是被引用最多的模块（100+ 条入边），是整张图的中心；`src/store/useGraph.ts`（约 2076 行）是运行时状态的核心，拥有最高扇出（fan-out 17）。

## 五、核心模块

### `src/knowledge/` — 领域逻辑
知识领域最密集的代码：状态（`state.ts`）、目录树绑定（`treeBinding.ts`、`treeUtils.ts`）、类型关系（`typeRelations.ts`）、解释索引（`explanationIndex.ts`、`explanationTree.ts`、`explanationTable.ts`）、投影（`projection.ts`、`physicalProjection.ts`）、超标签（`supertags.ts`）、导入（`documentImport.ts`、`linkImport.ts`）、持久化（`filePersistence.ts`、`persist.ts`）。

### `src/store/useGraph.ts` — 全局状态
单一 Zustand store，集中管理节点、边、树、时间线、题库与持久化，是运行时数据流的唯一出口。

### `src/core/` — 可视化引擎
`DimensionCanvas.tsx`（多维知识画布枢纽）、`ExplanationIndexView.tsx`（解释索引视图），以及六种布局渲染器（stack/grid/tree/chain/matrix/btree，位于 `sections/`）。

### `src/mechanism/` — 机制视图
把知识图谱投影为「机制」流程图/序列图：`core.ts`（领域类型）、`diagram.ts`（帧投影）、`lens.ts`（图/时间线/场景三种镜头）、`knowledgeProjection.ts`（图谱→机制模型）、`validation.ts`（结构校验），外加 InnoDB、Java 线程生命周期、MySQL UPDATE 等示例数据。

### `src/panels/` 与 `src/layout/`
`panels/` 承载各功能面板（解释卡片、题库、关系网络、系统连接图）；`layout/` 承载 `TopBar`、`UniverseTree`（约 1103 行的知识宇宙树）、`RightSidePanel`。

## 六、数据模型（数据真源）

| 文件 | 所有权 |
|---|---|
| `data/node-pool.json` | 知识节点、正文、标签与解释内容 |
| `data/tree-data.json` | 目录层级与节点引用 |
| `data/knowledge-edges.json` | 类型、结构和语义关系 |
| `data/questions.json` | 问题、答案、难度与来源 |
| `data/inference-responses.json` | 推理响应记录 |
| `data/timeline.json` | 知识点快照时间线 |

## 七、知识导入流水线

位于 `scripts/import/`，共享引擎在 `scripts/import/lib/`：

- `document-importer.mjs` — 通用文档导入入口（自动 / 文章 / 题库三种结构）
- `java-source-importer.mjs` + `JavaSourceIntrospector.java` — JDK Compiler Tree API 源码解析
- `web-link-importer.mjs` + `link-import-api.mjs` — 网页 / GitHub / Wikipedia 导入
- `mineru-ocr.mjs` — 扫描 PDF 的本地 OCR 导入
- `semantic-draft.mjs` / `semantic-projector.mjs` / `semantic-persistence.mjs` — 语义草稿 → 投影 → 持久化链路
- `lib/import-jdk-collections.mjs` / `lib/import-wikipedia.mjs` — JDK 集合与 Wikipedia 专用导入

## 八、快速开始

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

可选模型配置（只有 AI 整理需要密钥，确定性解析与导入不依赖模型）：复制 `.env.example` 到 `.env` 并填写 `KNOWLEDGE_OS_LLM_API_KEY` 等。

## 九、目录结构

```
src/
  main.tsx / App.tsx          # 应用入口与根布局
  types.ts / env.d.ts         # 全局类型契约
  components/                 # 界面组件
  core/                       # 可视化引擎
  knowledge/                  # 领域逻辑
  layout/                     # 布局（TopBar / UniverseTree / RightSidePanel）
  mechanism/                  # 机制视图
  panels/                     # 功能面板
  store/useGraph.ts           # Zustand 全局状态
  styles/                     # 样式（设计令牌 + 各视图样式）
scripts/
  import/                     # 各类导入流水线
data/                         # 数据真源（*.json）
docs/                         # 文档与导入的规范化原文
public/                       # 静态资源
```
