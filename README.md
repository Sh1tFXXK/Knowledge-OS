# Knowledge-OS

> 最新状态：2026-09-11

Knowledge-OS 是一个本地优先的多维知识图谱工作台。它把目录、知识节点、解释索引、问题、类型关系、时间线和机制视图组织在同一套显式数据模型中，适合维护需要持续拆解、关联和回顾的技术知识。

## 当前能力

- 目录树与知识节点分离：目录只保存引用，正文由节点池唯一持有。
- 解释索引：支持根内容、标题层级、页面、标签和可编辑的统一索引图。
- 类型与结构关系：支持 `extends`、`implements`、`belongs-to`、依赖、关联和投影。
- 多视图工作区：知识宇宙、解释索引、时间线、节点库、问题库、SuperTag、机制视图和系统连接图。
- 文档导入：支持 Markdown、PDF、HTML、DOCX、TXT 和其他可解析文本文件；扫描 PDF 可通过本地 MinerU OCR 导入。
- 网页导入：支持普通网页、GitHub Markdown 与 Wikipedia，能够清理正文、规范 Markdown 并提取标签。
- Java 源码导入：通过 JDK Compiler Tree API 提取包、类型、成员、Javadoc 和直接类型关系。
- 数据加载防护：切片形状校验、失败切片隔离、错误边界与常驻告警横幅，坏数据不再白屏或污染回写。
- 问题卡答案骨架：`answerSteps` 可引用整节点或定位到维度的具体 section，结构增删不会让步骤指错地方。
- 本地持久化：通过 Vite 中间件读取和原子写入 `data/*.json`，浏览器状态由 Zustand 单向管理。

## 快速开始

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

首次导入扫描 PDF 前安装本地 MinerU：

```bash
npm run setup:mineru
```

安装使用独立的 `.venv-mineru`，默认以 `pipeline` 后端和中文 OCR 运行。数字原生 PDF 不会启动 MinerU。

导入 JDK 集合类型：

```bash
npm run import:jdk-collections -- --source="C:/Program Files/Java/jdk-26"
```

网页、普通文档和 Java 源码也可以直接从顶部工具栏导入。导入实现位于 `scripts/import/`，共享引擎模块位于 `scripts/import/lib/`。

文档导入支持“自动 / 文章 / 题库”结构选择。选择题库 PDF 时会使用 MinerU 恢复编号结构，并把问题写入问题库；同名但题号不同的问题会分别保留。

## 可选模型配置

复制 `.env.example` 中的配置项到本地 `.env`。只有 AI 整理需要密钥，确定性解析与导入不依赖模型。

```dotenv
KNOWLEDGE_OS_LLM_API_KEY=
KNOWLEDGE_OS_LLM_BASE_URL=https://api.openai.com/v1
KNOWLEDGE_OS_LLM_MODEL=gpt-4.1-mini
```

## 部署（Vercel，只读）

线上是静态托管：`/api/data` 只提供 GET —— `vercel.json` 把 `/api/data?file=X` 重写到
构建期导出的静态文件 `dist/api-data/X`（`scripts/copy-deploy-data.mjs` 在构建末尾导出 6 个真源）。
没有 PUT 处理器，也没有 `/api/data-events`，所以**线上不写盘**：改数据只能改仓库里的
`data/*.json` 再提交，由 Vercel 重新构建上线（本地文件系统语义只存在于 `npm run dev` / `vite preview`，
那里的 `/api/data` 读写中间件由 `vite.config.js` 的 `dataFileApi` 提供）。

构建入口是 `npm run vercel-build`（`vite build` + 导出真源），它比本地 `npm run build`
多做一件事：**强制打上只读部署标记**（`scripts/deploy/vercel-build.mjs` 设置
`KNOWLEDGE_OS_READ_ONLY=1`，经 `vite.config.js` 的 `define` 打包进产物，
消费点 `src/knowledge/deploymentMode.ts`）。标记生效后，客户端在线上会：
不再尝试 PUT 落盘、不再弹「已保存到本地文件」、不再订阅 `/api/data-events`
（那条路由在静态托管上不存在），并在界面上常驻一句「只读部署」提示。

本地验收用**可写**产物（不设该标记）：

```bash
npm run build
npx vite preview          # 仍可写盘
KNOWLEDGE_OS_READ_ONLY=1 npm run build   # 反过来：本地跑只读产物
```

`vercel.json` 给 `/api-data/*` 设了 `Cache-Control: public, max-age=300, must-revalidate`，
CDN 侧最多可能滞后 5 分钟；提交后若发现线上数据陈旧，等过缓存窗口再刷新。

## 数据真源

| 文件 | 所有权 |
| --- | --- |
| `data/node-pool.json` | 知识节点、正文、标签与解释内容 |
| `data/tree-data.json` | 目录层级与节点引用 |
| `data/knowledge-edges.json` | 类型、结构和语义关系 |
| `data/questions.json` | 问题、答案、难度与来源 |
| `data/evolution-events.json` | 知识演化事件 |

`docs/notes/` 保存导入后的规范化原文，用于审计和追溯，不是工程说明文档。根目录的 `概念字典.md` 是数据库术语导入脚本的源数据。

## 工程文档

- [知识库宪法](docs/CONSTITUTION.md) — 五原则最高治理原则：新陈代谢与受控删除、目录净化、本体与具象、结构化内展、问答闭环
- [架构说明](docs/ARCHITECTURE.md)
- [领域上下文](CONTEXT.md)
- [文档导入标准](docs/DOCUMENT_IMPORT_STANDARD.md)
- [开发与分支流程](CONTRIBUTING.md)

历史实施方案、修复记录、对话恢复稿、工具运行状态和截图不再进入版本库。一次性迁移与验收脚本用后即删，需要时按 `git log` 找回；历史分支如需恢复，使用 `.git/branch-archives/` 中的本地 Git bundle。阶段性的盘点与审查材料沉淀在 `outputs/`（不入运行时），现状判断见 [STATE.md](STATE.md)。
