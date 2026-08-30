import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { applyImportAtTreeNode } from './import-wikipedia.mjs';
import {
  cleanKeyword,
  slugify,
  sourceHash,
  writeFileAtomically,
} from './import/web-link-importer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MD_FILE = path.join(PROJECT_ROOT, 'docs', 'sources', 'Redis实战.mineru.md');
const PARENT_TREE_NODE_ID = 'demo_tree_redis';

// ---------- 书本骨架 TOC（依据 MinerU 目录页，全 11 章 + 2 附录） ----------
const toc = {
  title: 'Redis实战',
  author: 'Josiah L. Carlson 著 / 黄健宏 译',
  fileName: 'Redis实战.mineru.md',
  summary:
    '本书是《Redis in Action》的中文翻译版，深入浅出地介绍了 Redis 的实际用法，'
    + '通过大量示例展示如何使用 Redis 构建 Web 应用、支持程序、应用程序组件、搜索应用以及简单的社交网站，'
    + '并涵盖数据安全、性能保障、降低内存占用、扩展 Redis 以及 Lua 脚本编程等进阶主题。'
    + '本书由 Redis 社区知名贡献者黄健宏（huangz）翻译，示例代码使用 Python 编写。',
  frontMatterTitle: '序言与前言',
  parts: [
    {
      title: '第一部分 入门',
      chapters: [
        { number: 1, title: '初识Redis' },
        { number: 2, title: '使用Redis构建Web应用' },
      ],
    },
    {
      title: '第二部分 核心概念',
      chapters: [
        { number: 3, title: 'Redis命令' },
        { number: 4, title: '数据安全与性能保障' },
        { number: 5, title: '使用Redis构建支持程序' },
        { number: 6, title: '使用Redis构建应用程序组件' },
        { number: 7, title: '基于搜索的应用程序' },
        { number: 8, title: '构建简单的社交网站' },
      ],
    },
    {
      title: '第三部分 进阶内容',
      chapters: [
        { number: 9, title: '降低内存占用' },
        { number: 10, title: '扩展Redis' },
        { number: 11, title: 'Redis的Lua脚本编程' },
      ],
    },
  ],
  appendices: [
    { key: 'A', title: '快速安装指南' },
    { key: 'B', title: '其他资源和参考资料' },
  ],
};

// MinerU 误识别的水印/装饰垃圾行
const JUNK_LINE_RES = [
  /浦东发展银行|现金管理|募集资金/,
  /董事会|监事会|股东大会|公司章程|公司决议/,
  /上市公司|中华人民共和国公司法|证券法|营业收入|净利润/,
  /国际经济贸易|出口额/,
  /“自上”选项|“自下”选项/,
  /“中国”“美国”“日本”/,
  /圆柱体/,
  /无法识别，图像模糊不清/,
  /^\d{4}年\d{0,2}月?\d{0,2}日?$/, // 孤立的垃圾日期行
  /^\$[^$]*\$\s*\$?\s*$/, // 整行就是一个数学式（本书正文无独立公式行，均为乱码）
  /^第[一二三四]部分\s*[^。，；：\s]{0,12}$/, // 无页码的部分标题孤儿行
];
const MATH_SPAM_THRESHOLD = 6; // 一行内 $ 数量超过阈值视为数学乱码
// 目录条目：以章节号开头、以页码结尾、无句读、较短
const TOC_ENTRY_RE = /^(第\s*\d{1,2}\s*章|第[一二三四]部分|附录\s*[A-Z]|\d+(\.\d+)+)[^。，；：]{0,38}\s\d{1,3}$/;
const JUNK_HEADING_RE = /^#{1,6}\s*(\[Unreadable\]|无法识别|\d+\.\s*20\d{2}年)/;
const CHAPTER_HEAD_RE = /^#{1,2}\s*第\s*(\d{1,2})\s*章\s*(.*)$/;
const PART_HEAD_RE = /^#{1,2}\s*第[一二三四]部分/;
const TOC_HEAD_RE = /^##\s*目录\s*$/;

function isJunkLine(line) {
  if (TOC_ENTRY_RE.test(line)) return true;
  if (JUNK_LINE_RES.some((re) => re.test(line))) return true;
  const dollars = (line.match(/\$/g) || []).length;
  return dollars >= MATH_SPAM_THRESHOLD;
}

function cleanLines(lines) {
  const out = [];
  let skipEmptyRun = false;
  let inToc = false; // 目录区块：从 ## 目录 跳到下一个二级标题
  for (const raw of lines) {
    const line = raw.replace(/\s+$/u, '');
    const trimmed = line.trim();
    if (TOC_HEAD_RE.test(trimmed)) {
      inToc = true;
      skipEmptyRun = true;
      continue;
    }
    if (inToc) {
      if (/^#{1,2}\s/.test(trimmed)) inToc = false; // 遇到新标题，目录结束
      else continue;
    }
    if (JUNK_HEADING_RE.test(trimmed)) {
      skipEmptyRun = true; // 丢弃该标题本身；其后紧跟的空行一并丢弃
      continue;
    }
    if (PART_HEAD_RE.test(trimmed) || /^##\s*核心概念\s*$/.test(trimmed)) {
      skipEmptyRun = true;
      continue;
    }
    if (isJunkLine(trimmed)) {
      continue;
    }
    if (skipEmptyRun && trimmed === '') {
      continue;
    }
    skipEmptyRun = false;
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function splitMarkdown(md) {
  const lines = md.split('\n');
  const chapterStarts = []; // [{num, line}]
  let firstPartLine = lines.length;
  for (let i = 0; i < lines.length; i += 1) {
    const m = CHAPTER_HEAD_RE.exec(lines[i].trim());
    if (m) chapterStarts.push({ num: Number(m[1]), line: i });
    if (PART_HEAD_RE.test(lines[i].trim()) && i < firstPartLine) firstPartLine = i;
  }

  const frontMatter = cleanLines(lines.slice(0, firstPartLine));
  const chapters = new Map();
  for (let i = 0; i < chapterStarts.length; i += 1) {
    const { num, line } = chapterStarts[i];
    const end = i + 1 < chapterStarts.length ? chapterStarts[i + 1].line : lines.length;
    // 去掉章标题行本身（节点标题已有）
    const body = cleanLines(lines.slice(line + 1, end));
    if (!chapters.has(num)) chapters.set(num, body);
  }
  return { frontMatter, chapters };
}

function makeNode(id, label, parentId, treeId, tags, rootContent) {
  return {
    id,
    label,
    parentId,
    treeId,
    treeName: label,
    tags,
    card: { nodeId: id, title: label, rootContent, tabs: [] },
  };
}

export async function importRedisInAction(options = {}) {
  const projectRoot = options.projectRoot ?? PROJECT_ROOT;
  const parentTreeNodeId = options.parentTreeNodeId ?? PARENT_TREE_NODE_ID;

  const md = await fs.readFile(MD_FILE, 'utf8');
  const contentHash = crypto.createHash('sha256').update(md).digest('hex');
  const sourceId = `document:${contentHash}`;
  const articleIdPrefix = `k_document_${sourceHash(sourceId)}`;
  const rootTreeId = `tree_document_${sourceHash(sourceId)}`;

  const { frontMatter, chapters } = splitMarkdown(md);

  const nodes = [];
  let index = 0;
  const nextId = () => { index += 1; return `${articleIdPrefix}_s${index}`; };

  // 根节点
  nodes.push(makeNode(
    articleIdPrefix, toc.title, null, rootTreeId,
    [cleanKeyword(toc.title), 'redis', 'book'],
    toc.summary,
  ));

  // 前言节点
  const frontId = nextId();
  nodes.push(makeNode(
    frontId, toc.frontMatterTitle, articleIdPrefix, `${rootTreeId}_s${index}`,
    ['redis', '前言'],
    frontMatter,
  ));

  // 部分 + 章节
  const chapterNodeIds = new Map();
  for (const part of toc.parts) {
    const partId = nextId();
    const partTreeId = `${rootTreeId}_s${index}`;
    nodes.push(makeNode(partId, part.title, articleIdPrefix, partTreeId, ['redis', cleanKeyword(part.title)], ''));
    for (const chapter of part.chapters) {
      const chapterId = nextId();
      const label = `第${chapter.number}章 ${chapter.title}`;
      let body = chapters.get(chapter.number) ?? '';
      if (!body) {
        body = '（待导入：当前 MinerU 转换文本未包含本章内容。）';
      } else if (chapter.number === 8) {
        body += '\n\n> 注：本章内容不完整——MinerU 转换文本在第 8.1.1 节（代码清单 8-1）处截断，后续内容待补充。';
      }
      nodes.push(makeNode(
        chapterId, label, partId, `${partTreeId}_s${index - 1}`,
        ['redis', cleanKeyword(chapter.title)],
        body,
      ));
      chapterNodeIds.set(chapter.number, chapterId);
    }
  }

  // 附录
  for (const appendix of toc.appendices) {
    const appendixId = nextId();
    nodes.push(makeNode(
      appendixId, `附录${appendix.key} ${appendix.title}`, articleIdPrefix, `${rootTreeId}_s${index}`,
      ['redis', '附录'],
      '（待导入：当前 MinerU 转换文本未包含本附录内容。）',
    ));
  }

  // 根节点 tabs：前言 + 各章
  const rootNode = nodes[0];
  rootNode.card.tabs.push({ id: 'sec_front', label: toc.frontMatterTitle, content: frontMatter });
  for (const [num, chapterId] of [...chapterNodeIds.entries()].sort((a, b) => a[0] - b[0])) {
    const node = nodes.find((n) => n.id === chapterId);
    rootNode.card.tabs.push({ id: `sec_${num}`, label: node.label, content: node.card.rootContent });
  }

  // 注意：不走 validateDocumentDraft——其 maxSectionCharacters(12000) 面向轻量章节，
  // 而本导入目标是全书逐字内容（与 fill-redis-chapter.mjs 的做法一致，填充阶段不校验长度）。

  const poolPath = path.join(projectRoot, 'data', 'node-pool.json');
  const treePath = path.join(projectRoot, 'data', 'tree-data.json');
  const [pool, tree] = await Promise.all([
    fs.readFile(poolPath, 'utf8').then(JSON.parse),
    fs.readFile(treePath, 'utf8').then(JSON.parse),
  ]);

  applyImportAtTreeNode(
    pool,
    tree,
    nodes,
    parentTreeNodeId,
    articleIdPrefix,
    [toc.title, 'redis', 'book'],
  );

  const notesDirectory = path.join(projectRoot, 'docs', 'notes');
  await fs.mkdir(notesDirectory, { recursive: true });
  const shortHash = sourceHash(sourceId).slice(0, 6);
  const notesPath = path.join(notesDirectory, `document-${slugify(toc.title)}-${shortHash}.md`);
  const date = new Date().toISOString().slice(0, 10);
  const notes = [
    '---',
    `title: ${JSON.stringify(toc.title)}`,
    `source_file: ${JSON.stringify(toc.fileName)}`,
    'source_type: "mineru-markdown"',
    `source_sha256: ${JSON.stringify(contentHash)}`,
    'source_language: "zh"',
    `imported_at: ${JSON.stringify(date)}`,
    'import_standard_version: 1',
    'import_profile: "article"',
    `section_count: ${nodes.length - 1}`,
    'question_count: 0',
    'keywords:',
    '  - "Redis实战"',
    '  - "redis"',
    '  - "book"',
    'categories:',
    '  - "redis"',
    '---',
    '',
    `# ${toc.title}`,
    '',
    toc.summary,
    '',
    `作者：${toc.author}`,
    '',
    '> 内容来源：MinerU OCR 转换的 markdown（docs/sources/Redis实战.mineru.md）。',
    '> 已覆盖：前言 + 第1~7章（完整）+ 第8章（部分，截断于 8.1.1）；待补：第8章剩余、第9~11章、附录A/B。',
    '',
  ].join('\n');

  await Promise.all([
    writeFileAtomically(poolPath, `${JSON.stringify(pool, null, 2)}\n`),
    writeFileAtomically(treePath, `${JSON.stringify(tree, null, 2)}\n`),
    writeFileAtomically(notesPath, notes),
  ]);

  return {
    ok: true,
    articleIdPrefix,
    rootTreeId,
    title: toc.title,
    nodeCount: nodes.length,
    filledChapters: [...chapters.keys()].sort((a, b) => a - b),
    chapterChars: Object.fromEntries([...chapters.entries()].map(([k, v]) => [k, v.replace(/\s/g, '').length])),
    frontMatterChars: frontMatter.replace(/\s/g, '').length,
    markdownPath: path.relative(projectRoot, notesPath).replace(/\\/g, '/'),
  };
}

async function main() {
  if (process.argv.includes('--dry')) {
    const md = await fs.readFile(MD_FILE, 'utf8');
    const { frontMatter, chapters } = splitMarkdown(md);
    console.log(`frontMatter chars: ${frontMatter.replace(/\s/g, '').length}`);
    console.log('--- frontMatter tail ---');
    console.log(frontMatter.slice(-300));
    for (const [num, body] of [...chapters.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(`\n=== ch${num}: ${body.replace(/\s/g, '').length} chars ===`);
      console.log(`HEAD: ${body.slice(0, 80).replace(/\n/g, ' | ')}`);
      console.log(`TAIL: ${body.slice(-80).replace(/\n/g, ' | ')}`);
    }
    return;
  }
  const result = await importRedisInAction();
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
