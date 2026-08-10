import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { applyImportAtTreeNode } from '../import-wikipedia.mjs';
import { createAiOrganizerFromEnv } from './ai-organizer.mjs';
import { createTranslationService } from './translation.mjs';
import { MINERU_PARSE_METHOD } from './mineru-ocr.mjs';
import {
  attachQuestionsToNodes,
  DOCUMENT_PROFILE,
  DOCUMENT_PROFILE_MODE,
  normalizeQuestionDraft,
  resolveDocumentProfile,
  validateDocumentDraft,
} from './import-standard.mjs';
import {
  applyImportedQuestions,
  buildWebNodes,
  cleanKeyword,
  extractWebDocument,
  IMPORT_SOURCE_KIND,
  normalizeLanguage,
  polishArticleMarkdown,
  slugify,
  sourceHash,
  translateMarkdownPreservingStructure,
  writeFileAtomically,
} from './web-link-importer.mjs';

export const DOCUMENT_KIND = Object.freeze({
  Pdf: 'pdf',
  Markdown: 'markdown',
  Html: 'html',
  Text: 'text',
  Docx: 'docx',
});

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
const HTML_EXTENSIONS = new Set(['.html', '.htm']);
const DOCX_EXTENSIONS = new Set(['.docx']);
const PDF_MAGIC = '%PDF-';
const DOCX_MAGIC = '504b0304';

function normalizedFileName(fileName) {
  const normalized = String(fileName ?? '').trim();
  if (!normalized || normalized.length > 240 || /[\\/\u0000-\u001f]/.test(normalized)) {
    throw new Error('文档文件名无效');
  }
  return normalized;
}

export function documentKindForFile(fileName) {
  const extension = path.extname(normalizedFileName(fileName)).toLocaleLowerCase();
  if (extension === '.pdf') return DOCUMENT_KIND.Pdf;
  if (MARKDOWN_EXTENSIONS.has(extension)) return DOCUMENT_KIND.Markdown;
  if (HTML_EXTENSIONS.has(extension)) return DOCUMENT_KIND.Html;
  if (DOCX_EXTENSIONS.has(extension)) return DOCUMENT_KIND.Docx;
  return DOCUMENT_KIND.Text;
}

function titleFromFileName(fileName) {
  return path.basename(fileName, path.extname(fileName)).trim() || '未命名文档';
}

function assertPdfMagic(buffer) {
  if (buffer.subarray(0, PDF_MAGIC.length).toString('ascii') !== PDF_MAGIC) {
    throw new Error('文件扩展名为 PDF，但内容不是有效的 PDF 文档');
  }
}

function decodeText(buffer, label = '文本', fatal = true) {
  try {
    return new TextDecoder('utf-8', { fatal }).decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    throw new Error(`${label}必须使用 UTF-8 编码`);
  }
}

function decodeMarkdown(buffer) {
  return decodeText(buffer, 'Markdown 文档');
}

function stripFrontMatter(markdown) {
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const match = normalized.match(/^---\n[\s\S]*?\n---(?:\n|$)/);
  return match ? normalized.slice(match[0].length) : normalized;
}

function extractMarkdownTitle(markdown, fileName) {
  const heading = markdown.match(/^#\s+(.+?)\s*#*$/m)?.[1];
  return cleanKeyword(heading) || titleFromFileName(fileName);
}

function removeMarkdownTitle(markdown, title) {
  const lines = markdown.split('\n');
  const headingIndex = lines.findIndex((line) => {
    const heading = line.match(/^#\s+(.+?)\s*#*$/)?.[1];
    return heading ? cleanKeyword(heading) === title : false;
  });
  if (headingIndex >= 0) lines.splice(headingIndex, 1);
  return lines.join('\n').trim();
}

function documentLanguage(title, markdown) {
  const chineseLines = [title, ...String(markdown).split('\n').filter((line) => /[\p{Script=Han}]/u.test(line))]
    .join('\n');
  const chineseCharacters = (chineseLines.match(/[\p{Script=Han}]/gu) ?? []).length;
  return normalizeLanguage('', chineseCharacters >= 80 ? chineseLines : markdown);
}

function normalizePdfPageText(text) {
  return String(text ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function repeatedPdfBoundaryLines(pages) {
  if (pages.length < 3) return new Set();
  const counts = new Map();
  for (const page of pages) {
    const lines = normalizePdfPageText(page.text).split('\n').map((line) => line.trim()).filter(Boolean);
    const boundaryLines = new Set([...lines.slice(0, 2), ...lines.slice(-2)]);
    for (const line of boundaryLines) counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.6));
  return new Set([...counts].filter(([, count]) => count >= threshold).map(([line]) => line));
}

function pdfHeading(line) {
  const value = line.trim();
  if (!value || value.length > 80 || /[。！？?]$/.test(value)) return null;
  const chapter = value.match(/^第\s*([一二三四五六七八九十百千\d]+)\s*[章节篇部]\s*[:：]?\s*(.+)$/);
  if (chapter) return { level: 2, title: cleanKeyword(value) };

  const decimal = value.match(/^(\d+(?:\.\d+){0,3})(?:\s*[、.)．]\s*|\s+)(.+)$/);
  if (decimal) {
    const level = Math.min(4, 1 + decimal[1].split('.').length);
    return { level, title: cleanKeyword(`${decimal[1]} ${decimal[2]}`) };
  }

  if (/^[一二三四五六七八九十百]+\s*[、.．]\s*\S+/.test(value)) {
    return { level: 2, title: cleanKeyword(value) };
  }
  if (/^[A-Z][A-Z\d /&+-]{3,60}$/.test(value)) {
    return { level: 2, title: cleanKeyword(value) };
  }
  return null;
}

function pdfPagesToMarkdown(pages) {
  const repeatedLines = repeatedPdfBoundaryLines(pages);
  const output = [];
  for (const page of pages) {
    const lines = normalizePdfPageText(page.text).split('\n');
    for (const sourceLine of lines) {
      const line = sourceLine.trim();
      if (!line || repeatedLines.has(line) || /^(?:第\s*)?\d+\s*(?:页|\/\s*\d+)?$/.test(line)) {
        if (output.at(-1) !== '') output.push('');
        continue;
      }
      const heading = pdfHeading(line);
      output.push(heading ? `${'#'.repeat(heading.level)} ${heading.title}` : line);
    }
    if (output.at(-1) !== '') output.push('');
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function parseMarkdownDocument({ buffer, fileName }) {
  const source = stripFrontMatter(decodeMarkdown(buffer));
  const title = extractMarkdownTitle(source, fileName);
  const markdown = removeMarkdownTitle(source, title);
  if (!markdown.replace(/\s/g, '')) {
    throw new Error('Markdown 文档没有可导入的正文');
  }
  return {
    kind: DOCUMENT_KIND.Markdown,
    title,
    language: documentLanguage(title, markdown),
    markdown,
    pageCount: null,
  };
}

export async function parsePdfDocument({
  buffer,
  fileName,
  parserFactory,
  ocrExtractor,
  signal,
  profileMode,
}) {
  assertPdfMagic(buffer);
  const createParser = parserFactory ?? ((data) => new PDFParse({ data }));
  const parser = createParser(new Uint8Array(buffer));
  let result;
  try {
    result = await parser.getText({ lineEnforce: true });
  } catch {
    throw new Error('PDF 解析失败，请确认文档未损坏且未加密');
  } finally {
    await parser.destroy?.();
  }

  let markdown = pdfPagesToMarkdown(result.pages);
  let ocrProvider = null;
  const forceMineru = profileMode === DOCUMENT_PROFILE_MODE.QuestionBank;
  if (forceMineru || markdown.replace(/\s/g, '').length < 20) {
    if (!ocrExtractor) {
      throw new Error(forceMineru
        ? 'PDF 题库需要本地 MinerU 结构解析'
        : 'PDF 没有可提取的文本，扫描件需要本地 MinerU OCR');
    }
    const extracted = await ocrExtractor({
      buffer,
      fileName,
      pageCount: result.total,
      signal,
      method: forceMineru ? MINERU_PARSE_METHOD.Auto : MINERU_PARSE_METHOD.Ocr,
    });
    markdown = extracted.markdown;
    ocrProvider = extracted.provider;
  }
  return {
    kind: DOCUMENT_KIND.Pdf,
    title: titleFromFileName(fileName),
    language: documentLanguage(titleFromFileName(fileName), markdown),
    markdown,
    pageCount: result.total,
    ocrProvider,
  };
}

export function parseTextDocument({ buffer, fileName }) {
  const source = decodeText(buffer);
  const title = extractMarkdownTitle(source, fileName);
  const markdown = removeMarkdownTitle(
    pdfPagesToMarkdown([{ num: 1, text: source }]),
    title,
  );
  if (!markdown.replace(/\s/g, '')) {
    throw new Error('文档没有可导入的正文');
  }
  return {
    kind: DOCUMENT_KIND.Text,
    title,
    language: documentLanguage(title, markdown),
    markdown,
    pageCount: null,
  };
}

export function parseHtmlDocument({ buffer, fileName }) {
  const content = decodeText(buffer, 'HTML 文档', false);
  const parsed = extractWebDocument({
    url: `https://knowledge.local/${encodeURIComponent(fileName)}`,
    contentType: 'text/html',
    content,
  });
  const title = cleanKeyword(parsed.title) || titleFromFileName(fileName);
  return {
    kind: DOCUMENT_KIND.Html,
    title,
    language: parsed.language,
    markdown: parsed.markdown,
    pageCount: null,
  };
}

export async function parseDocxDocument({ buffer, fileName, extractRawText }) {
  if (buffer.subarray(0, 4).toString('hex') !== DOCX_MAGIC) {
    throw new Error('文件扩展名为 DOCX，但内容不是有效的 Word 文档');
  }
  const extract = extractRawText ?? mammoth.extractRawText;
  let result;
  try {
    result = await extract({ buffer });
  } catch {
    throw new Error('DOCX 解析失败，请确认文件未损坏');
  }
  const markdown = pdfPagesToMarkdown([{ num: 1, text: result?.value ?? '' }]);
  if (!markdown.replace(/\s/g, '')) {
    throw new Error('DOCX 文档没有可导入的正文');
  }
  return {
    kind: DOCUMENT_KIND.Docx,
    title: titleFromFileName(fileName),
    language: documentLanguage(titleFromFileName(fileName), markdown),
    markdown,
    pageCount: null,
  };
}

export async function parseDocument(options) {
  const fileName = normalizedFileName(options.fileName);
  const buffer = Buffer.isBuffer(options.buffer)
    ? options.buffer
    : Buffer.from(options.buffer ?? []);
  if (buffer.length === 0) throw new Error('文档内容为空');

  const kind = documentKindForFile(fileName);
  if (kind === DOCUMENT_KIND.Pdf) {
    return parsePdfDocument({ ...options, buffer, fileName });
  }
  if (kind === DOCUMENT_KIND.Html) {
    return parseHtmlDocument({ buffer, fileName });
  }
  if (kind === DOCUMENT_KIND.Docx) {
    return parseDocxDocument({ buffer, fileName });
  }
  if (kind === DOCUMENT_KIND.Markdown) {
    return parseMarkdownDocument({ buffer, fileName });
  }
  return parseTextDocument({ buffer, fileName });
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function buildDocumentMarkdown({
  title,
  documentBody,
  fileName,
  kind,
  contentHash,
  pageCount,
  language,
  translated,
  date,
  keywords,
  categories,
  profile,
  sectionCount,
  questionCount,
  ocrProvider,
}) {
  const keywordLines = keywords.map((keyword) => `  - ${yamlString(keyword)}`).join('\n');
  const categoryLines = categories.map((category) => `  - ${yamlString(category)}`).join('\n');
  const frontMatter = [
    '---',
    `title: ${yamlString(title)}`,
    `source_file: ${yamlString(fileName)}`,
    `source_type: ${yamlString(kind)}`,
    `source_sha256: ${yamlString(contentHash)}`,
    `source_pages: ${pageCount ?? 'null'}`,
    `ocr_provider: ${ocrProvider ? yamlString(ocrProvider) : 'null'}`,
    `source_language: ${yamlString(language)}`,
    `translated_to: ${translated ? yamlString('zh-CN') : 'null'}`,
    `imported_at: ${yamlString(date)}`,
    'import_standard_version: 1',
    `import_profile: ${yamlString(profile)}`,
    `section_count: ${sectionCount}`,
    `question_count: ${questionCount}`,
    'keywords:',
    keywordLines || '  []',
    'categories:',
    categoryLines || '  []',
    '---',
  ].join('\n');
  return `${frontMatter}\n\n# ${title}\n\n${documentBody.trim()}\n`;
}

function buildQuestionBankNodes({ title, sourceId, questions, extraKeywords = [] }) {
  const hash = sourceHash(sourceId);
  const articleIdPrefix = `k_${IMPORT_SOURCE_KIND.Document}_${hash}`;
  const treeNodeId = `tree_${IMPORT_SOURCE_KIND.Document}_${hash}`;
  const tags = [...new Set([
    cleanKeyword(title),
    ...extraKeywords.map(cleanKeyword),
  ].filter(Boolean))].slice(0, 80);
  const summary = `题库文档，共整理 ${questions.length} 道问题。问题正文、答案、题型与难度统一存入问题库。`;
  return {
    articleIdPrefix,
    treeNodeId,
    tags,
    documentBody: questions.map((question, index) => [
      `## ${index + 1}. ${question.text}`,
      question.answer || '',
    ].filter(Boolean).join('\n\n')).join('\n\n'),
    nodes: [{
      id: articleIdPrefix,
      label: title,
      parentId: null,
      treeId: treeNodeId,
      treeName: title,
      card: {
        nodeId: articleIdPrefix,
        title,
        rootContent: summary,
        tabs: [],
      },
    }],
  };
}

export async function prepareDocumentImport(options) {
  const parsed = await parseDocument(options);
  const contentHash = crypto.createHash('sha256').update(options.buffer).digest('hex');
  const sourceId = `document:${contentHash}`;
  let title = parsed.title;
  let markdown = polishArticleMarkdown(parsed.markdown).contentMarkdown;
  const translator = options.translationService ?? createTranslationService({
    engine: options.translationEngine ?? 'auto',
    onWarning: options.onWarning,
  });
  const shouldTranslate = options.translate === true && parsed.language !== 'zh';
  if (shouldTranslate) {
    title = await translator.translate(parsed.title, parsed.language);
    markdown = await translateMarkdownPreservingStructure(
      markdown,
      parsed.language,
      translator,
    );
  }
  let categories = [];
  let aiKeywords = [];
  const detected = resolveDocumentProfile(markdown, options.profileMode);
  let profile = detected.profile;
  let questions = detected.questions;

  if (options.useAi) {
    const organizer = options.aiOrganizer ?? createAiOrganizerFromEnv(options.aiEnv);
    if (!organizer) {
      throw new Error('AI 整理尚未配置，请设置 KNOWLEDGE_OS_LLM_API_KEY');
    }
    const organized = await organizer.organize({
      title,
      markdown,
      sourceLanguage: shouldTranslate ? 'zh' : parsed.language,
    });
    title = cleanKeyword(organized.title) || title;
    markdown = polishArticleMarkdown(organized.markdown).contentMarkdown;
    categories = organized.categories;
    aiKeywords = organized.keywords;
    const organizedQuestions = organized.questions
      .map((question) => normalizeQuestionDraft(question))
      .filter(Boolean);
    const preserveExplicitQuestionBank = options.profileMode === DOCUMENT_PROFILE_MODE.QuestionBank
      && profile === DOCUMENT_PROFILE.QuestionBank;
    questions = preserveExplicitQuestionBank
      ? questions
      : (organizedQuestions.length > 0 ? organizedQuestions : questions);
  }

  const built = profile === DOCUMENT_PROFILE.QuestionBank
    ? buildQuestionBankNodes({
      title,
      sourceId,
      questions,
      extraKeywords: [...categories, ...aiKeywords],
    })
    : buildWebNodes({
      title,
      markdown,
      sourceUrl: sourceId,
      language: parsed.language,
      extraKeywords: [...categories, ...aiKeywords],
      sourceKind: IMPORT_SOURCE_KIND.Document,
    });
  questions = attachQuestionsToNodes(questions, built.nodes);
  const validation = validateDocumentDraft({ profile, title, markdown, nodes: built.nodes, questions });
  const date = (options.now ?? new Date()).toISOString().slice(0, 10);
  return {
    ...built,
    ...parsed,
    title,
    contentHash,
    sourceId,
    profile,
    validation,
    categories,
    translated: shouldTranslate,
    questions,
    markdown: buildDocumentMarkdown({
      title,
      documentBody: built.documentBody,
      fileName: normalizedFileName(options.fileName),
      kind: parsed.kind,
      contentHash,
      pageCount: parsed.pageCount,
      language: parsed.language,
      translated: shouldTranslate,
      date,
      keywords: built.tags,
      categories,
      profile,
      sectionCount: validation.sectionCount,
      questionCount: validation.questionCount,
      ocrProvider: parsed.ocrProvider ?? null,
    }),
  };
}

async function resolveNotesPath(projectRoot, prepared) {
  const notesDirectory = path.join(projectRoot, 'docs', 'notes');
  const shortHash = sourceHash(prepared.sourceId).slice(0, 6);
  const existingFiles = await fs.readdir(notesDirectory).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  const existingFilename = existingFiles.find((filename) => (
    filename.startsWith('document-') && filename.endsWith(`-${shortHash}.md`)
  ));
  const generatedFilename = `document-${slugify(prepared.title)}-${shortHash}.md`;
  return path.join(notesDirectory, existingFilename ?? generatedFilename);
}

export async function importDocument(options) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const poolPath = path.join(projectRoot, 'data', 'node-pool.json');
  const treePath = path.join(projectRoot, 'data', 'tree-data.json');
  const questionsPath = path.join(projectRoot, 'data', 'questions.json');
  const [pool, tree, questions] = await Promise.all([
    fs.readFile(poolPath, 'utf8').then(JSON.parse),
    fs.readFile(treePath, 'utf8').then(JSON.parse),
    fs.readFile(questionsPath, 'utf8').then(JSON.parse).catch((error) => {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }),
  ]);
  if (!options.parentTreeNodeId) throw new Error('请选择要挂载的项目目录');

  const prepared = await prepareDocumentImport(options);
  applyImportAtTreeNode(
    pool,
    tree,
    prepared.nodes,
    options.parentTreeNodeId,
    prepared.articleIdPrefix,
    prepared.tags,
  );
  const questionCount = applyImportedQuestions(
    questions,
    prepared.sourceId,
    prepared.questions,
    Date.now(),
    IMPORT_SOURCE_KIND.Document,
    {
      defaultRelatedNodeId: prepared.articleIdPrefix,
      sourceTitle: prepared.title,
    },
  );

  const notesPath = await resolveNotesPath(projectRoot, prepared);
  await Promise.all([
    writeFileAtomically(poolPath, `${JSON.stringify(pool, null, 2)}\n`),
    writeFileAtomically(treePath, `${JSON.stringify(tree, null, 2)}\n`),
    writeFileAtomically(questionsPath, `${JSON.stringify(questions, null, 2)}\n`),
    writeFileAtomically(notesPath, prepared.markdown),
  ]);

  return {
    ok: true,
    nodeId: prepared.articleIdPrefix,
    treeNodeId: prepared.treeNodeId,
    title: prepared.title,
    fileName: normalizedFileName(options.fileName),
    documentKind: prepared.kind,
    language: prepared.language,
    translated: prepared.translated,
    pageCount: prepared.pageCount,
    ocrProvider: prepared.ocrProvider ?? null,
    nodeCount: prepared.nodes.length,
    sectionCount: prepared.nodes.length - 1,
    questionCount,
    categories: prepared.categories,
    profile: prepared.profile,
    standard: prepared.validation,
    markdownPath: path.relative(projectRoot, notesPath).replace(/\\/g, '/'),
  };
}
