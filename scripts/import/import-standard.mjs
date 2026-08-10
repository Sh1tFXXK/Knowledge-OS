import { cleanKeyword, parseMarkdownSections } from './web-link-importer.mjs';

export const DOCUMENT_PROFILE = Object.freeze({
  Article: 'article',
  QuestionBank: 'question-bank',
});

export const DOCUMENT_PROFILE_MODE = Object.freeze({
  Auto: 'auto',
  Article: DOCUMENT_PROFILE.Article,
  QuestionBank: DOCUMENT_PROFILE.QuestionBank,
});

export const QUESTION_KIND = Object.freeze({
  Definition: 'definition',
  Mechanism: 'mechanism',
  Comparison: 'comparison',
  Application: 'application',
  Troubleshooting: 'troubleshooting',
  Recall: 'recall',
});

export const QUESTION_DIFFICULTY = Object.freeze({
  Basic: 'basic',
  Intermediate: 'intermediate',
  Advanced: 'advanced',
});

export const QUESTION_SOURCE_KIND = Object.freeze({
  Document: 'document',
  Web: 'web',
});

export const DOCUMENT_IMPORT_STANDARD = Object.freeze({
  longDocumentCharacters: 3_000,
  maxRootCharacters: 3_000,
  maxSectionCharacters: 12_000,
  maxSections: 120,
  maxTreeDepth: 4,
  minQuestionBankQuestions: 3,
  maxQuestions: 200,
  maxQuestionCharacters: 160,
  maxAnswerCharacters: 20_000,
});

const QUESTION_KIND_VALUES = new Set(Object.values(QUESTION_KIND));
const QUESTION_DIFFICULTY_VALUES = new Set(Object.values(QUESTION_DIFFICULTY));
const QUESTION_ENDING = /[?？]$/;
const QUESTION_CUE = /什么|为何|为什么|怎么|如何|哪些|是否|区别|差异|原理|机制|作用|场景|优缺点|what|why|how|when|which|difference|compare|explain|describe|troubleshoot|debug/i;
const EXPLICIT_QUESTION_PREFIX = /^(?:(?:问题|question|q)\s*\d*\s*[:：.、-]?|\d{1,3}\s*[.、)）-]|[（(]\s*(?:\d{1,3}|[一二三四五六七八九十百]+)\s*[)）]|[一二三四五六七八九十百]+\s*[、.])\s*/i;
const CODE_QUESTION_FRAGMENT = /(?:<\s*\?$|^[=@]|^(?:if|for|while|return|private|protected|public|class|interface)\b)/i;

function normalizedText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function questionText(value) {
  return cleanKeyword(String(value ?? '').replace(EXPLICIT_QUESTION_PREFIX, '')).slice(
    0,
    DOCUMENT_IMPORT_STANDARD.maxQuestionCharacters,
  );
}

export function classifyQuestionKind(text) {
  const value = questionText(text);
  if (/区别|差异|比较|对比|\bvs\.?\b|difference|compare/i.test(value)) {
    return QUESTION_KIND.Comparison;
  }
  if (/排查|诊断|故障|异常|报错|修复|troubleshoot|debug|failure|error/i.test(value)) {
    return QUESTION_KIND.Troubleshooting;
  }
  if (/为什么|为何|原理|机制|如何工作|why|how does|mechanism/i.test(value)) {
    return QUESTION_KIND.Mechanism;
  }
  if (/什么是|定义|含义|what is|define/i.test(value)) {
    return QUESTION_KIND.Definition;
  }
  if (/如何|怎么|场景|实践|使用|实现|优化|when|apply|implement|optimi[sz]e|use case/i.test(value)) {
    return QUESTION_KIND.Application;
  }
  return QUESTION_KIND.Recall;
}

export function difficultyForQuestionKind(kind) {
  if (kind === QUESTION_KIND.Definition || kind === QUESTION_KIND.Recall) {
    return QUESTION_DIFFICULTY.Basic;
  }
  if (kind === QUESTION_KIND.Troubleshooting) return QUESTION_DIFFICULTY.Advanced;
  return QUESTION_DIFFICULTY.Intermediate;
}

export function normalizeQuestionDraft(value, defaults = {}) {
  const source = typeof value === 'string' ? { text: value } : value;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const text = questionText(source.text);
  if (CODE_QUESTION_FRAGMENT.test(text)) return null;
  const allowDeclarative = defaults.allowDeclarative === true;
  const minimumLength = allowDeclarative ? 2 : 4;
  if (text.length < minimumLength || (!allowDeclarative && !QUESTION_ENDING.test(text) && !QUESTION_CUE.test(text))) {
    return null;
  }
  const kind = QUESTION_KIND_VALUES.has(source.kind)
    ? source.kind
    : classifyQuestionKind(text);
  const difficulty = QUESTION_DIFFICULTY_VALUES.has(source.difficulty)
    ? source.difficulty
    : difficultyForQuestionKind(kind);
  const answer = normalizedText(source.answer);
  if (answer.length > DOCUMENT_IMPORT_STANDARD.maxAnswerCharacters) {
    throw new Error(`问题“${text}”的答案超过 ${DOCUMENT_IMPORT_STANDARD.maxAnswerCharacters} 字符`);
  }
  const rawSectionTitle = source.sectionTitle ?? defaults.sectionTitle;
  const identityKey = normalizedText(source.identityKey).slice(0, 256);
  return {
    text,
    kind,
    difficulty,
    sectionTitle: rawSectionTitle == null ? null : cleanKeyword(rawSectionTitle) || null,
    ...(identityKey ? { identityKey } : {}),
    ...(answer ? { answer } : {}),
  };
}

function deduplicateQuestionDrafts(
  values,
  maxItems = DOCUMENT_IMPORT_STANDARD.maxQuestions,
  defaults = {},
) {
  const seen = new Set();
  const drafts = [];
  for (const value of values) {
    const draft = normalizeQuestionDraft(value, defaults);
    if (!draft) continue;
    const key = draft.text.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push(draft);
    if (drafts.length >= maxItems) break;
  }
  return drafts;
}

function explicitQuestionFromLine(line) {
  const trimmed = String(line ?? '').trim();
  const heading = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/)?.[1];
  if (heading && QUESTION_ENDING.test(cleanKeyword(heading))) return cleanKeyword(heading);
  if (!EXPLICIT_QUESTION_PREFIX.test(trimmed)) return null;
  const candidate = questionText(trimmed);
  return QUESTION_ENDING.test(candidate) || QUESTION_CUE.test(candidate) ? candidate : null;
}

export function extractQuestionBlocks(markdown) {
  const drafts = [];
  let currentSection = null;
  let currentQuestion = null;
  let answerLines = [];

  const flush = () => {
    if (!currentQuestion) return;
    drafts.push({
      text: currentQuestion,
      sectionTitle: currentSection,
      answer: normalizedText(answerLines.join('\n')),
    });
    currentQuestion = null;
    answerLines = [];
  };

  for (const line of String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    const explicitQuestion = explicitQuestionFromLine(line);
    if (explicitQuestion) {
      flush();
      currentQuestion = explicitQuestion;
      continue;
    }
    if (heading) {
      flush();
      currentSection = cleanKeyword(heading[2]) || null;
      continue;
    }
    if (currentQuestion) answerLines.push(line);
  }
  flush();
  return deduplicateQuestionDrafts(drafts);
}

function numberedQuestionHeading(line) {
  const value = String(line ?? '').trim();
  const headingMatch = value.match(
    /^#{1,6}\s+(\d{1,3})(?:\s*[.、)）:-]\s*|\s+)(.+?)\s*#*$/,
  );
  const plainMatch = value.match(
    /^(\d{1,3})(?:\s*[.、)）:-]\s*|\s+)(.+?)$/,
  );
  const match = headingMatch ?? plainMatch;
  if (!match) return null;
  const ordinal = Number.parseInt(match[1], 10);
  const text = cleanKeyword(match[2]);
  return Number.isInteger(ordinal) && ordinal > 0 && text
    ? { ordinal, text, heading: Boolean(headingMatch) }
    : null;
}

function normalizeNumberedAnswerLine(line) {
  const match = String(line ?? '').match(/^\s*#{1,6}\s+(\d{1,3})\s+(.+?)\s*#*$/);
  return match ? `${match[1]}. ${match[2]}` : line;
}

export function extractSequentialQuestionBlocks(markdown) {
  const drafts = [];
  let expectedOrdinal = 1;
  let currentOrdinal = null;
  let currentQuestion = null;
  let answerLines = [];

  const flush = () => {
    if (!currentQuestion) return;
    drafts.push({
      text: currentQuestion,
      identityKey: `question:${currentOrdinal}`,
      sectionTitle: `第 ${currentOrdinal} 题`,
      answer: normalizedText(answerLines.join('\n')),
    });
    currentOrdinal = null;
    currentQuestion = null;
    answerLines = [];
  };

  for (const line of String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const candidate = numberedQuestionHeading(line);
    const isQuestionCandidate = candidate && (
      candidate.heading
      || QUESTION_ENDING.test(candidate.text)
      || QUESTION_CUE.test(candidate.text)
    );
    if (candidate?.ordinal === expectedOrdinal && isQuestionCandidate) {
      flush();
      currentOrdinal = candidate.ordinal;
      currentQuestion = candidate.text;
      expectedOrdinal += 1;
      continue;
    }
    if (currentQuestion) answerLines.push(normalizeNumberedAnswerLine(line));
  }
  flush();
  return drafts
    .map((draft) => normalizeQuestionDraft(draft, { allowDeclarative: true }))
    .filter(Boolean)
    .slice(0, DOCUMENT_IMPORT_STANDARD.maxQuestions);
}

export function extractContextualQuestions(markdown, maxItems = 20) {
  const drafts = [];
  let currentSection = null;
  let fenced = false;
  for (const sourceLine of String(markdown ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*```/.test(sourceLine)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = sourceLine.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (heading && !QUESTION_ENDING.test(cleanKeyword(heading[1]))) {
      currentSection = cleanKeyword(heading[1]) || null;
    }
    const line = cleanKeyword(sourceLine.replace(/^\s*(?:#{1,6}|[-*+]|\d+[.)、]|>+)\s*/, ''));
    if (!line) continue;
    const candidates = line.match(/[^。！!?？]{4,160}[?？]/g) ?? [];
    for (const candidate of candidates) {
      drafts.push({ text: candidate.trim(), sectionTitle: currentSection });
    }
  }
  return deduplicateQuestionDrafts(drafts, maxItems);
}

function markdownCharacterCount(markdown) {
  return String(markdown ?? '').replace(/\s/g, '').length;
}

function nodeDepth(node, nodesById) {
  let depth = 0;
  let current = node;
  const visited = new Set();
  while (current?.parentId) {
    if (visited.has(current.id)) throw new Error('导入章节结构存在循环引用');
    visited.add(current.id);
    depth += 1;
    current = nodesById.get(current.parentId);
  }
  return depth;
}

export function detectDocumentProfile(markdown) {
  const questionBlocks = extractQuestionBlocks(markdown);
  return questionBlocks.length >= DOCUMENT_IMPORT_STANDARD.minQuestionBankQuestions
    ? { profile: DOCUMENT_PROFILE.QuestionBank, questions: questionBlocks }
    : { profile: DOCUMENT_PROFILE.Article, questions: extractContextualQuestions(markdown) };
}

export function resolveDocumentProfile(markdown, requestedMode = DOCUMENT_PROFILE_MODE.Auto) {
  if (requestedMode === DOCUMENT_PROFILE_MODE.QuestionBank) {
    const sequentialQuestions = extractSequentialQuestionBlocks(markdown);
    const questions = sequentialQuestions.length >= DOCUMENT_IMPORT_STANDARD.minQuestionBankQuestions
      ? sequentialQuestions
      : extractQuestionBlocks(markdown);
    return { profile: DOCUMENT_PROFILE.QuestionBank, questions };
  }
  if (requestedMode === DOCUMENT_PROFILE_MODE.Article) {
    return { profile: DOCUMENT_PROFILE.Article, questions: extractContextualQuestions(markdown) };
  }
  return detectDocumentProfile(markdown);
}

export function validateDocumentDraft({ profile, title, markdown, nodes, questions }) {
  const normalizedTitle = title == null ? '' : cleanKeyword(title);
  if (!normalizedTitle || normalizedTitle.length > 160) {
    throw new Error('文档标题必须为 1-160 个有效字符');
  }
  const characterCount = markdownCharacterCount(markdown);
  if (characterCount === 0) throw new Error('文档没有可导入的正文');
  if (questions.length > DOCUMENT_IMPORT_STANDARD.maxQuestions) {
    throw new Error(`单次导入最多允许 ${DOCUMENT_IMPORT_STANDARD.maxQuestions} 个问题`);
  }

  if (profile === DOCUMENT_PROFILE.QuestionBank) {
    if (questions.length < DOCUMENT_IMPORT_STANDARD.minQuestionBankQuestions) {
      throw new Error(`题库文档至少需要 ${DOCUMENT_IMPORT_STANDARD.minQuestionBankQuestions} 个明确问题`);
    }
    if (nodes.length !== 1) throw new Error('题库文档只能创建一个来源节点');
    return { characterCount, sectionCount: 0, questionCount: questions.length };
  }

  const sectionCount = Math.max(0, nodes.length - 1);
  if (characterCount > DOCUMENT_IMPORT_STANDARD.longDocumentCharacters && sectionCount === 0) {
    throw new Error('长文档没有识别到章节；请补充 Markdown 标题，或启用 AI 整理后再导入');
  }
  if (sectionCount > DOCUMENT_IMPORT_STANDARD.maxSections) {
    throw new Error(`文档章节超过 ${DOCUMENT_IMPORT_STANDARD.maxSections} 个，请先拆分文档`);
  }
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  for (const [index, node] of nodes.entries()) {
    const contentLength = markdownCharacterCount(node.card?.rootContent);
    const limit = index === 0
      ? DOCUMENT_IMPORT_STANDARD.maxRootCharacters
      : DOCUMENT_IMPORT_STANDARD.maxSectionCharacters;
    if (contentLength > limit) {
      throw new Error(`章节“${node.label}”正文超过 ${limit} 字符，请继续拆分`);
    }
    if (nodeDepth(node, nodesById) > DOCUMENT_IMPORT_STANDARD.maxTreeDepth) {
      throw new Error(`章节“${node.label}”超过最大 ${DOCUMENT_IMPORT_STANDARD.maxTreeDepth} 层目录深度`);
    }
  }
  return { characterCount, sectionCount, questionCount: questions.length };
}

export function attachQuestionsToNodes(questionDrafts, nodes) {
  const rootNode = nodes[0];
  if (!rootNode) throw new Error('导入结果缺少根节点');
  const nodeByLabel = new Map(nodes.map((node) => [cleanKeyword(node.label).toLocaleLowerCase(), node.id]));
  return questionDrafts.map((question) => ({
    ...question,
    relatedNodeId: question.sectionTitle
      ? nodeByLabel.get(cleanKeyword(question.sectionTitle).toLocaleLowerCase()) ?? rootNode.id
      : rootNode.id,
  }));
}

export function markdownSectionCount(markdown) {
  const tree = parseMarkdownSections(markdown);
  let count = 0;
  const visit = (sections) => {
    for (const section of sections) {
      count += 1;
      visit(section.children);
    }
  };
  visit(tree.children);
  return count;
}
