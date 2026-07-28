# 文档导入标准

本文定义 PDF、Markdown 和网页文档进入 Knowledge OS 时的边界。导入器只接受通过本标准校验的结构化草稿，禁止把整份提取文本直接写入知识节点池。

## 导入流水线

1. **解析**：PDF 提取文本层，Markdown 去除已有 Front Matter 和唯一 H1。
2. **规范化**：清理页眉、页脚、页码与格式噪音，识别标题层级和问题块。
3. **分型**：草稿被明确标记为 `article` 或 `question-bank`。
4. **校验**：检查标题、正文、章节数量、章节深度、内容长度和问题数量。
5. **落盘**：验证通过后，才由串行导入队列更新正式数据文件。

解析或校验失败时不得写入任何正式数据。

## 存储边界

| 数据 | 唯一存储位置 | 约束 |
| --- | --- | --- |
| 规范化全文与来源元数据 | `docs/notes/document-*.md` | 保留可审计原文，不参与目录结构 |
| 知识正文 | `data/node-pool.json` | 文章根节点与章节节点各自拥有正文 |
| 目录挂载 | `data/tree-data.json` | 只保存对知识节点的引用，不复制正文 |
| 导入问题 | `data/questions.json` | 每题独立存储，禁止把问题批量生成为目录节点 |

`question-bank` 只创建一个来源知识节点。问题、答案和问题属性进入问题库；完整题库仍保存在 `docs/notes` 以便追溯。

## 文档分型

### `article`

- 标题结构映射为知识章节。
- 超过 3,000 个非空白字符时必须至少包含一个可识别章节。
- 根正文最多 3,000 字符，单章节最多 12,000 字符。
- 最多 120 个章节，目录深度最多 4 层。

### `question-bank`

- 至少识别到 3 个明确问题。
- 单次最多导入 200 个问题。
- 只创建一个来源节点，不把每道题写成知识节点或目录项。

## 问题结构

自动导入的问题使用以下结构：

```ts
interface Question {
  id: string;
  text: string;
  answered: boolean;
  kind: QuestionKind;
  difficulty: QuestionDifficulty;
  relatedNodeId: string;
  source: {
    kind: 'document' | 'web';
    sourceId: string;
    sourceTitle: string;
    sectionTitle?: string;
  };
  answer?: string;
  createdAt: number;
  updatedAt: number;
}
```

`QuestionKind` 只能是 `definition`、`mechanism`、`comparison`、`application`、`troubleshooting` 或 `recall`。`QuestionDifficulty` 只能是 `basic`、`intermediate` 或 `advanced`。

文档来源的 `sourceId` 是原始文件内容的 SHA-256，格式为 `document:<64 hex>`；网页来源使用规范化 URL。`relatedNodeId` 必须指向对应章节节点，无法确定章节时指向来源根节点。

## 拒绝条件

- PDF 损坏、加密或没有可提取文本层。
- Markdown 不是 UTF-8 或正文为空。
- 长文档没有章节。
- 章节、深度、正文或问题数量超过上述上限。
- AI 整理结果无法通过同一套确定性校验。

扫描 PDF 需要先执行 OCR。导入器本身不承担 OCR、附件管理或第二套索引职责。
