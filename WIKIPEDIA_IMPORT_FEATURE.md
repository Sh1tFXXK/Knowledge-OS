# 维基百科导入功能

> 给一个维基百科链接，自动抓取页面 → 整理成 Markdown 文档 → 导入 Knowledge-OS 节点池与目录树。

## 用法

```bash
# 交互式向导（推荐；不传 URL 时也会自动进入）
node scripts/import-wikipedia.mjs --interactive

# 基本用法（必填 --parent 指定挂载父节点的 nodeRef）
node scripts/import-wikipedia.mjs <wiki-url> --parent=<nodeRef>

# 仅预览不写入
node scripts/import-wikipedia.mjs https://zh.wikipedia.org/wiki/数据库 --parent=n_55jiel25 --dry-run

# 覆盖语言（通常无需，URL 自动识别）
node scripts/import-wikipedia.mjs https://en.wikipedia.org/wiki/Database --parent=n_55jiel25 --lang=en

# 将非中文条目的标题与正文机器翻译成中文
node scripts/import-wikipedia.mjs https://en.wikipedia.org/wiki/Database --parent=n_55jiel25 --translate
```

### 参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `<wiki-url>` | 是 | 维基百科文章链接，支持 `zh`/`en` 等语言域与移动版 `*.m.wikipedia.org` |
| `--parent=<nodeRef>` | 是 | 挂载父节点的 nodeRef（在 `data/tree-data.json` 中查找）；`--dry-run` 时可省略 |
| `--dry-run` | 否 | 只抓取并打印预览，不写入任何文件 |
| `--lang=<zh\|en\|...>` | 否 | 覆盖 URL 中识别出的语言 |
| `--translate` | 否 | 将非中文条目的标题与正文通过 MyMemory 翻译成中文；链接和章节结构保持不变 |
| `--interactive` | 否 | 启动逐步向导；在交互终端中不传 URL 时也会自动启动 |

### 交互式检查

向导逐步询问并检查：

1. 维基百科链接：立即检查 URL 格式并解析语言、标题。
2. 语言代码：检查格式，然后访问 Wikipedia API，确认页面存在并解析章节。
3. 翻译：非中文条目可选择是否机翻。
4. 模式：选择写入项目或仅预览。
5. 父节点：写入模式下先解析项目 JSON，再确认 `nodeRef` 确实存在。

全部检查完成后会展示节点树和 Markdown 摘要。交互模式在写入三个目标文件前还会要求最终确认；取消不会修改文件。

### 如何找到父节点 nodeRef

打开 `data/tree-data.json`，每个树节点都有 `nodeRef` 字段指向 `node-pool.json` 中的知识节点。例如：
- `n_55jiel25` → 计算机科学
- `k_acm2012_hardware` → 硬件

导入的文章根节点会作为父节点的子节点挂入。

## 工作原理

```
维基百科 URL
   │
   ▼
1. 解析 URL → 语言 + 文章标题
   │
   ▼
2. 调用 Wikipedia Action API (action=parse, prop=wikitext, redirects=1)
   抓取页面 wikitext 源码
   │
   ▼
3. 按 == / === 标题行切分章节，建成嵌套章节树
   │
   ▼
4. wikitext → Markdown 转换（每个章节正文独立转换）：
   - 标题层级、粗体/斜体、内部/外部链接、列表
   - 剥离模板 {{...}}（保留有价值的 {{main}}/{{see also}} → "主条目：X"）
   - 去除 <ref>、表格、媒体链接、HTML 标签
   - 使用 `--translate` 时，将非中文标题与正文分段翻译成中文
   │
   ▼
5. 按文档结构生成目录树与解释卡索引：
   - 文章标题 → 根节点（挂到 --parent 下）
   - H2 (==) → 子节点，H3 (===) → 孙节点，依此类推
   - 正文列表项 → 当前章节的 ExplanationPage，只进入解释卡索引视图，不创建目录节点
   - 黑名单章节（参见/外部链接/参考文献等，中英文+繁简）不建节点
   - 每个章节节点 card.tabs：[定义(章节正文), 来源(wiki URL#anchor)]
   - 文章根节点 card.tabs 按章节层级组织，供 ExplanationIndexView 展示完整内容索引
   - 内部维基链接按内容归属写入节点、章节 tab 与列表 page 的 `tags`，可直接进入 SuperTag 索引
   │
   ▼
6. 写入：
   - data/node-pool.json  （+N 个知识节点）
   - data/tree-data.json  （挂到父节点下）
   - docs/notes/wiki-<lang>_<slug>.md  （完整 Markdown 文档，含黑名单章节）
```

## 数据结构映射

导入节点严格遵循 `src/types.ts` 的 `KnowledgeNode` 与 `TreeNode`：

```jsonc
// node-pool.json
{
  "k_wiki_zh_数据库": {
    "id": "k_wiki_zh_数据库",
    "label": "数据库",
    "card": {
      "nodeId": "k_wiki_zh_数据库",
      "title": "数据库",
      "tabs": [
        { "id": "def", "label": "定义", "content": "**資料庫**（database）..." },
        { "id": "source", "label": "来源", "content": "https://zh.wikipedia.org/wiki/...\n整理：维基百科 zh 条目自动抓取转换，2026-07-22" }
      ]
    },
    "tags": ["数据模型", "数据库管理系统", "SQL"]
  }
}

// tree-data.json（挂到父节点 children 下）
{
  "id": "tree_wiki_zh_数据库",
  "name": "数据库",
  "count": 0,
  "nodeRef": "k_wiki_zh_数据库",
  "children": [
    { "id": "tree_wiki_zh_数据库_s1", "name": "技术初衷", "nodeRef": "k_wiki_zh_数据库_s1", "children": [] }
    // ...
  ]
}
```

## 幂等性

- 节点 id 按文章 slug + 章节序号稳定生成（`k_wiki_<lang>_<slug>[_sN]`）。
- 重复导入同一 URL：节点池按 id 更新（不新增）；目录树中该文章子树每次重建（清掉同文章旧子节点再重挂），保证与最新维基结构一致，不残留重复。
- 维基页面删除章节后，节点池中属于该文章的旧章节节点也会清理。
- 可安全反复运行。

## 前端生效

前端（`App.tsx` 挂载时调 `initialize()`）通过 vite dev server 的 `/api/data` 端点直接读取 `data/*.json`。所以**导入后启动 `npm run dev` 即可在 UI 看到新节点**，无需重新打包或改前端代码。

> 若 UI 显示的是旧数据，在应用内触发"从本地文件加载"（store 的 `initialize` / `loadCompleteStateFromFiles`）或清空 localStorage 后刷新即可。

## 限制

- **翻译是可选的**：默认保留原文；`--translate` 使用 MyMemory 免费 API 机翻，受服务可用性与匿名额度限制，失败片段会保留原文。
- **专业术语需复核**：全大写缩写会保留原文，但普通术语的机器翻译仍可能不准确。
- **模板/表格简化处理**：信息框、引用模板、复杂表格被剥离；`{{main|X}}` 等有价值模板转成内联文本。
- **章节结构忠实映射**：按维基原文 `==`/`===` 层级生成目录节点；章节内列表保留为解释卡索引页，避免目录树被条目列表淹没。
- **黑名单章节不建节点**但保留在 Markdown 文档中（文档完整、节点树精选）。

## 文件

- `scripts/import-wikipedia.mjs` — 主脚本（自包含、无依赖、ES module）
- `scripts/wikipedia-import.test.mjs` — URL、转换、章节树与幂等导入测试
- `docs/notes/wiki-<lang>_<slug>.md` — 每次导入生成的 Markdown 文档
