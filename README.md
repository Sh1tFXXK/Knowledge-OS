# Knowledge-OS

> 最新状态：2026-08-09

Knowledge-OS 是一个本地优先的多维知识图谱工作台。它把目录、知识节点、解释索引、问题、类型关系、时间线和机制视图组织在同一套显式数据模型中，适合维护需要持续拆解、关联和回顾的技术知识。

## 当前能力

- 目录树与知识节点分离：目录只保存引用，正文由节点池唯一持有。
- 解释索引：支持根内容、标题层级、页面、标签和可编辑的统一索引图。
- 类型与结构关系：支持 `extends`、`implements`、`belongs-to`、依赖、关联和投影。
- 多视图工作区：知识宇宙、解释索引、时间线、节点库、问题库、SuperTag、机制视图和系统连接图。
- 文档导入：支持 Markdown、PDF、HTML、DOCX、TXT 和其他可解析文本文件；扫描 PDF 可通过本地 MinerU OCR 导入。
- 网页导入：支持普通网页、GitHub Markdown 与 Wikipedia，能够清理正文、规范 Markdown 并提取标签。
- Java 源码导入：通过 JDK Compiler Tree API 提取包、类型、成员、Javadoc 和直接类型关系。
- 本地持久化：通过 Vite 中间件读取和原子写入 `data/*.json`，浏览器状态由 Zustand 单向管理。

## 快速开始

```bash
npm install
npm run dev
```

生产构建与测试：

```bash
npm test
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

网页、普通文档和 Java 源码也可以直接从顶部工具栏导入。

文档导入支持“自动 / 文章 / 题库”结构选择。选择题库 PDF 时会使用 MinerU 恢复编号结构，并把问题写入问题库；同名但题号不同的问题会分别保留。

## 可选模型配置

复制 `.env.example` 中的配置项到本地 `.env`。只有 AI 整理需要密钥，确定性解析与导入不依赖模型。

```dotenv
KNOWLEDGE_OS_LLM_API_KEY=
KNOWLEDGE_OS_LLM_BASE_URL=https://api.openai.com/v1
KNOWLEDGE_OS_LLM_MODEL=gpt-4.1-mini
```

## 数据真源

| 文件 | 所有权 |
| --- | --- |
| `data/node-pool.json` | 知识节点、正文、标签与解释内容 |
| `data/tree-data.json` | 目录层级与节点引用 |
| `data/knowledge-edges.json` | 类型、结构和语义关系 |
| `data/questions.json` | 问题、答案、难度与来源 |
| `data/inference-responses.json` | 推理响应记录 |
| `data/timeline.json` | 知识点快照时间线 |

`docs/notes/` 保存导入后的规范化原文，用于审计和追溯，不是工程说明文档。根目录的 `概念字典.md` 是数据库术语导入脚本的源数据。

## 工程文档

- [架构说明](docs/ARCHITECTURE.md)
- [文档导入标准](docs/DOCUMENT_IMPORT_STANDARD.md)
- [开发与分支流程](CONTRIBUTING.md)

历史实施方案、修复记录、对话恢复稿、工具运行状态和截图不再进入版本库。历史分支如需恢复，使用 `.git/branch-archives/` 中的本地 Git bundle。
