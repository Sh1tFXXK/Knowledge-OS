import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import ipaddr from 'ipaddr.js';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import { applyImportAtTreeNode } from '../import-wikipedia.mjs';
import { createTranslationService } from './translation.mjs';
import { createAiOrganizerFromEnv } from './ai-organizer.mjs';
import { applySemanticImportAtTreeNode } from './semantic-persistence.mjs';
import { projectSemanticDraft } from './semantic-projector.mjs';

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
const SKIPPED_SECTION_NAMES = new Set([
  '参见', '另见', '外部链接', '参考文献', '参考资料', '引用', '注脚', '延伸阅读',
  '注释', '书目', '来源', '脚注', '相关条目', '文献', '参考',
  '參見', '另見', '外部連結', '外部連接', '參考文獻', '參考資料', '延伸閱讀',
  '註解', '註腳', '腳註', '書目', '來源', '相關條目', '文獻', '參考',
  'seealso', 'externallinks', 'references', 'furtherreading', 'notes', 'bibliography',
  'citations', 'sources', 'footnotes', 'workscited',
]);

export function normalizeWebUrl(value) {
  let url;
  try {
    url = new URL(String(value).trim());
  } catch {
    throw new Error('请输入完整的网页链接，例如 https://example.com/article');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('只支持 http 或 https 网页链接');
  }
  if (url.username || url.password) throw new Error('链接不能包含用户名或密码');
  url.hash = '';
  return url;
}

function githubRawContentUrl(url) {
  const source = url instanceof URL ? url : normalizeWebUrl(url);
  if (source.hostname.toLowerCase() !== 'github.com') return null;
  const parts = source.pathname.split('/').filter(Boolean);
  if (parts.length < 5 || parts[2] !== 'blob') return null;
  const [owner, repository, _blob, revision, ...fileParts] = parts;
  if (!/\.(?:md|markdown)$/i.test(fileParts.at(-1) ?? '')) return null;
  return `https://raw.githubusercontent.com/${owner}/${repository}/${revision}/${fileParts.join('/')}`;
}

function isPublicAddress(address) {
  let parsed;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false;
  }
  if (parsed.kind() === 'ipv6' && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }
  return parsed.range() === 'unicast';
}

function isTransparentProxyAddress(address) {
  try {
    const parsed = ipaddr.parse(address);
    if (parsed.kind() === 'ipv4') {
      return parsed.match(ipaddr.parse('198.18.0.0'), 15);
    }
    return parsed.kind() === 'ipv6'
      && parsed.match(ipaddr.parse('fdfe:dcba:9876::'), 48);
  } catch {
    return false;
  }
}

export async function assertPublicWebUrl(url, resolveHost = dns.lookup) {
  const normalized = url instanceof URL ? url : normalizeWebUrl(url);
  const hostname = normalized.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('不能导入本机或内网地址');
  }

  const directAddress = ipaddr.isValid(hostname) ? [{ address: hostname }] : null;
  let addresses;
  try {
    addresses = directAddress ?? await resolveHost(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error('无法解析该网页的域名');
  }
  const isAllowed = ({ address }) => isPublicAddress(address)
    || (directAddress === null && isTransparentProxyAddress(address));
  if (!addresses.length || addresses.some((address) => !isAllowed(address))) {
    throw new Error('不能导入本机或内网地址');
  }
}

async function readLimitedBody(response, maxBytes) {
  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new Error('网页内容超过 5 MB，无法导入');

  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('网页内容超过 5 MB，无法导入');
    return text;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('网页内容超过 5 MB，无法导入');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

export async function fetchWebPage(url, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolveHost = options.resolveHost ?? dns.lookup;
  const wait = options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  let currentUrl = normalizeWebUrl(url);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (options.validateNetwork !== false) await assertPublicWebUrl(currentUrl, resolveHost);
    let response;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      response = undefined;
      try {
        response = await fetchImpl(currentUrl, {
          redirect: 'manual',
          signal: AbortSignal.timeout(options.timeoutMs ?? FETCH_TIMEOUT_MS),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeOS-Importer/2.0)',
            Accept: 'text/html, text/markdown, text/plain;q=0.9',
          },
        });
        if ((response.status === 429 || response.status >= 500) && attempt < 2) {
          await wait(300 * (2 ** attempt));
          continue;
        }
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await wait(300 * (2 ** attempt));
          continue;
        }
      }
    }
    if (!response) {
      if (lastError?.name === 'TimeoutError' || lastError?.name === 'AbortError') {
        throw new Error('网页请求超时，请稍后重试');
      }
      throw new Error(`无法连接该网页：${lastError?.message || '网络请求失败'}`);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error(`网页重定向缺少目标地址（HTTP ${response.status}）`);
      if (redirectCount === MAX_REDIRECTS) throw new Error('网页重定向次数过多');
      currentUrl = normalizeWebUrl(new URL(location, currentUrl).href);
      continue;
    }
    if (!response.ok) throw new Error(`网页请求失败（HTTP ${response.status}）`);

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('text/markdown')) {
      throw new Error(`暂不支持该内容类型：${contentType || '未知'}`);
    }
    return {
      url: currentUrl.href,
      contentType,
      content: await readLimitedBody(response, options.maxBytes ?? MAX_RESPONSE_BYTES),
    };
  }
  throw new Error('网页重定向次数过多');
}

export function normalizeLanguage(value, text) {
  if (/[぀-ヿ]/u.test(text)) return 'ja';
  if (/[가-힯]/u.test(text)) return 'ko';
  const visible = text.replace(/\s/g, '');
  const chineseCount = (visible.match(/[\p{Script=Han}]/gu) ?? []).length;
  if (visible.length > 0 && chineseCount / visible.length >= 0.15) return 'zh';
  const declared = String(value ?? '').trim().toLowerCase().split(/[-_]/)[0];
  if (/^[a-z]{2,3}$/.test(declared)) return declared;
  if (visible.length > 0 && chineseCount / visible.length >= 0.05) return 'zh';
  return 'en';
}

function createTurndownService() {
  const service = new TurndownService({
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    headingStyle: 'atx',
    strongDelimiter: '**',
  });
  service.remove(['script', 'style', 'nav', 'form', 'button', 'svg', 'canvas', 'iframe', 'noscript']);
  return service;
}

function normalizeMarkdown(markdown, title) {
  const normalized = markdown
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const lines = normalized.split('\n');
  const firstHeading = lines[0]?.match(/^#\s+(.+)$/);
  if (firstHeading && firstHeading[1].trim().toLowerCase() === title.trim().toLowerCase()) {
    return lines.slice(1).join('\n').trim();
  }
  return normalized;
}

function markdownFilenameTitle(url) {
  const filename = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? '');
  if (!/\.(?:md|markdown)$/i.test(filename)) return null;
  const title = filename
    .replace(/\.(?:md|markdown)$/i, '')
    .replace(/^\s*\d+[.、_)\-\s]+/, '')
    .trim();
  return title || null;
}

export function extractWebDocument(page) {
  if (page.contentType.includes('text/plain') || page.contentType.includes('text/markdown')) {
    const firstHeading = page.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const fallbackTitle = new URL(page.url).pathname.split('/').filter(Boolean).at(-1) || new URL(page.url).hostname;
    const title = markdownFilenameTitle(page.url)
      || firstHeading
      || decodeURIComponent(fallbackTitle).replace(/[-_]+/g, ' ');
    return {
      title,
      language: normalizeLanguage('', page.content),
      markdown: normalizeMarkdown(page.content, title),
      excerpt: page.content.replace(/[#*_`>\[\]()]/g, '').trim().slice(0, 240),
    };
  }

  const dom = new JSDOM(page.content, { url: page.url });
  const document = dom.window.document;
  const fallbackRoot = document.querySelector('article, main') ?? document.body;
  const fallbackHtml = fallbackRoot?.innerHTML ?? '';
  const parsed = new Readability(document.cloneNode(true), { charThreshold: 80 }).parse();
  const title = (markdownFilenameTitle(page.url)
    || parsed?.title
    || document.querySelector('h1')?.textContent
    || document.title
    || new URL(page.url).hostname).trim();
  const contentHtml = parsed?.content || fallbackHtml;
  const contentDom = new JSDOM(`<article>${contentHtml}</article>`, { url: page.url });
  const article = contentDom.window.document.querySelector('article');
  for (const link of article?.querySelectorAll('a[href]') ?? []) {
    link.setAttribute('href', link.href);
  }
  const markdown = normalizeMarkdown(createTurndownService().turndown(article?.innerHTML ?? ''), title);
  if (markdown.replace(/\s/g, '').length < 80) {
    throw new Error('没有从该网页提取到足够的正文内容');
  }
  const languageMeta = document.documentElement.lang
    || document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content')
    || document.querySelector('meta[property="og:locale"]')?.getAttribute('content');
  return {
    title,
    language: normalizeLanguage(languageMeta, article?.textContent ?? markdown),
    markdown,
    excerpt: (parsed?.excerpt || article?.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 240),
  };
}

export function slugify(value) {
  const slug = String(value)
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .slice(0, 48);
  return slug || 'article';
}

export function sourceHash(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 12);
}

function isSkippedSection(title) {
  const normalized = title.toLowerCase().replace(/[\s_（）()【】\[\]：:，,。.、""'']/g, '');
  return SKIPPED_SECTION_NAMES.has(normalized);
}

export function parseMarkdownSections(markdown) {
  const root = { level: 0, title: '', body: [], children: [] };
  const stack = [root];
  for (const line of markdown.split('\n')) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (!heading) {
      stack.at(-1).body.push(line);
      continue;
    }
    const level = heading[1].length;
    while (stack.length > 1 && stack.at(-1).level >= level) stack.pop();
    const section = { level, title: heading[2].trim(), body: [], children: [] };
    stack.at(-1).children.push(section);
    stack.push(section);
  }
  return root;
}

function readMarkdownLinkAt(markdown, start) {
  if (markdown[start] !== '[') return null;
  let bracketDepth = 1;
  let labelEnd = -1;
  let cursor = start + 1;
  while (cursor < markdown.length && bracketDepth > 0) {
    if (markdown[cursor] === '\n') return null;
    if (markdown[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (markdown[cursor] === '[') bracketDepth += 1;
    if (markdown[cursor] === ']') {
      bracketDepth -= 1;
      if (bracketDepth === 0) labelEnd = cursor;
    }
    cursor += 1;
  }
  if (labelEnd < 0 || markdown[labelEnd + 1] !== '(') return null;

  let depth = 1;
  cursor = labelEnd + 2;
  while (cursor < markdown.length && depth > 0) {
    if (markdown[cursor] === '\\') {
      cursor += 2;
      continue;
    }
    if (markdown[cursor] === '(') depth += 1;
    if (markdown[cursor] === ')') depth -= 1;
    cursor += 1;
  }
  if (depth !== 0) return null;
  return {
    label: markdown.slice(start + 1, labelEnd),
    url: markdown.slice(labelEnd + 2, cursor - 1),
    end: cursor,
  };
}

function markdownLinks(markdown) {
  const links = [];
  for (let cursor = 0; cursor < markdown.length;) {
    const link = readMarkdownLinkAt(markdown, cursor);
    if (!link) {
      cursor += 1;
      continue;
    }
    links.push(link);
    cursor = link.end;
  }
  return links;
}

function stripLinkDestinations(markdown) {
  let output = '';
  for (let cursor = 0; cursor < markdown.length;) {
    const isImage = markdown[cursor] === '!' && markdown[cursor + 1] === '[';
    const linkStart = isImage ? cursor + 1 : cursor;
    const link = readMarkdownLinkAt(markdown, linkStart);
    if (!link) {
      output += markdown[cursor];
      cursor += 1;
      continue;
    }
    const label = stripLinkDestinations(link.label).replace(/[*_`]/g, '').trim();
    if (label && !/^\d+$/.test(label)) output += label;
    cursor = link.end;
  }
  return output;
}

export function cleanKeyword(value) {
  return stripLinkDestinations(String(value))
    .replace(/https?:\/\/[^\s)\]}>]+/gi, '')
    .replace(/^[#>*_`\s]+|[#>*_`\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeMarkdownBlock(markdown) {
  const withoutLinks = stripLinkDestinations(markdown)
    .replace(/\*?\\?\[(?:\d+(?:\s*[,–-]\s*\d+)*|citation needed\*?)\\?\]\*?/gi, '')
    .replace(/\*?\s*citation needed\s*\*?/gi, '')
    .replace(/\\?\[\s*\\?\]/g, '')
    .replace(/!\[\]\(\)/g, '')
    .replace(/<https?:\/\/[^>]+>/gi, '')
    .replace(/https?:\/\/[^\s)\]}>]+/gi, '');
  const lines = [];
  let inFence = false;
  let blank = false;

  for (const sourceLine of withoutLinks.split('\n')) {
    let line = sourceLine.replace(/[ \t]+$/g, '');
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      lines.push(line);
      blank = false;
      continue;
    }
    if (!inFence) {
      line = line
        .replace(/^(\s*)[-*+]\s+/, '$1- ')
        .replace(/^(\s*)\d+[.)]\s+/, (_match, indent) => `${indent}1. `);
      const indent = line.match(/^[ \t]*/)?.[0] ?? '';
      line = indent + line.slice(indent.length)
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\s+([,.;:!?，。；：！？])/g, '$1');
    }
    if (!line.trim()) {
      if (!blank && lines.length > 0) lines.push('');
      blank = true;
      continue;
    }
    lines.push(line);
    blank = false;
  }
  const formatted = [];
  let fenced = false;
  let previousType = 'blank';
  const pushBlank = () => {
    if (formatted.length > 0 && formatted.at(-1) !== '') formatted.push('');
  };

  for (const line of lines) {
    const fenceLine = /^\s*```/.test(line);
    if (fenceLine) {
      if (!fenced) pushBlank();
      formatted.push(line);
      fenced = !fenced;
      previousType = fenced ? 'fence' : 'fence-end';
      continue;
    }
    if (fenced) {
      formatted.push(line);
      continue;
    }
    if (!line) {
      pushBlank();
      previousType = 'blank';
      continue;
    }

    const type = /^\s*>/.test(line)
      ? 'quote'
      : /^\s*(?:[-*+] |\d+\. )/.test(line)
        ? 'list'
        : 'text';
    const needsBoundary = formatted.at(-1) !== '' && (
      (type === 'quote' && previousType !== 'quote')
      || (type === 'list' && previousType !== 'list')
      || (type === 'text' && ['quote', 'list', 'fence-end'].includes(previousType))
    );
    if (needsBoundary) pushBlank();
    formatted.push(line);
    previousType = type;
  }

  return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function polishArticleMarkdown(markdown) {
  const sectionTree = parseMarkdownSections(markdown);
  const lead = normalizeMarkdownBlock(sectionTree.body.join('\n'));
  const keywords = [];

  function renderSections(sections, depth) {
    const output = [];
    for (const section of sections) {
      const title = cleanKeyword(section.title);
      if (!title || isSkippedSection(title)) continue;
      keywords.push(title);
      const heading = `${'#'.repeat(Math.min(depth, 6))} ${title}`;
      const body = normalizeMarkdownBlock(section.body.join('\n'));
      const children = renderSections(section.children, depth + 1);
      output.push([heading, body, children].filter(Boolean).join('\n\n'));
    }
    return output.join('\n\n');
  }

  const sections = renderSections(sectionTree.children, 2);
  return {
    contentMarkdown: [lead, sections].filter(Boolean).join('\n\n').trim(),
    documentBody: [lead ? `## 摘要\n\n${lead}` : '', sections].filter(Boolean).join('\n\n').trim(),
    sectionKeywords: [...new Set(keywords)],
  };
}

export function extractQuestions(markdown) {
  const questions = [];
  const seen = new Set();
  let fenced = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const text = cleanKeyword(line.replace(/^\s*(?:#{1,6}|[-*+]|\d+[.)]|>+)\s*/, ''));
    if (!text) continue;
    const candidates = text.match(/[^。！？.!?]{4,160}[？?]/g) ?? [];
    for (const candidate of candidates) {
      const question = candidate.trim();
      if (seen.has(question)) continue;
      seen.add(question);
      questions.push(question);
      if (questions.length >= 20) return questions;
    }
  }
  return questions;
}

export async function translateMarkdownPreservingStructure(markdown, language, translator) {
  const protectedParts = [];
  const protect = (value) => {
    const token = `KOSMDTOKEN${protectedParts.length}X`;
    protectedParts.push({ token, value });
    return token;
  };

  let protectedMarkdown = markdown
    .replace(/```[\s\S]*?```/g, protect)
    .replace(/`+[^`\n]+`+/g, protect)
    .replace(/^(\s*(?:#{1,6}|[-*+]|\d+[.)]|>+)\s+)/gm, protect)
    .replace(/\*\*|__|~~|\*|_/g, protect);

  protectedMarkdown = await translator.translate(protectedMarkdown, language);
  for (const part of protectedParts) {
    if (!protectedMarkdown.includes(part.token)) {
      throw new Error('翻译服务改变了 Markdown 结构，已取消导入');
    }
    protectedMarkdown = protectedMarkdown.replaceAll(part.token, part.value);
  }
  return protectedMarkdown;
}

function bulletListToPages(markdown, idPrefix) {
  const root = { pages: [], indent: -1 };
  const stack = [root];
  let pageIndex = 0;
  for (const line of markdown.split('\n')) {
    const match = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (!match) continue;
    const indent = match[1].replace(/\t/g, '    ').length;
    const markdownContent = match[2].trim();
    const content = stripLinkDestinations(markdownContent);
    const label = content
      .split(/\s+(?:[–—-])\s+/)[0]
      .replace(/^[*_`\s]+|[*_`\s:]+$/g, '')
      .trim();
    const page = {
      id: `${idPrefix}_p${++pageIndex}`,
      label: label || `项 ${pageIndex}`,
      content,
    };
    while (stack.length > 1 && stack.at(-1).indent >= indent) stack.pop();
    stack.at(-1).pages.push(page);
    stack.push({ pages: page.pages ?? (page.pages = []), indent });
  }

  function omitEmptyChildren(pages) {
    return pages.map((page) => {
      const children = omitEmptyChildren(page.pages);
      if (children.length === 0) {
        const { pages: _pages, ...leaf } = page;
        return leaf;
      }
      return { ...page, pages: children };
    });
  }
  return omitEmptyChildren(root.pages);
}

export const IMPORT_SOURCE_KIND = Object.freeze({
  Web: 'web',
  Document: 'document',
});

function assertImportSourceKind(sourceKind) {
  if (!Object.values(IMPORT_SOURCE_KIND).includes(sourceKind)) {
    throw new Error(`Unsupported import source kind: ${sourceKind}`);
  }
}

export function buildWebNodes({
  title,
  markdown,
  sourceUrl,
  language,
  extraKeywords = [],
  sourceKind = IMPORT_SOURCE_KIND.Web,
}) {
  assertImportSourceKind(sourceKind);
  const hash = sourceHash(sourceUrl);
  const articleIdPrefix = `k_${sourceKind}_${hash}`;
  const rootTreeId = `tree_${sourceKind}_${hash}`;
  const polished = polishArticleMarkdown(markdown);
  const sectionTree = parseMarkdownSections(polished.contentMarkdown);
  const allTags = [...new Set([
    cleanKeyword(title),
    ...polished.sectionKeywords,
    ...extraKeywords.map(cleanKeyword),
  ].filter(Boolean))].slice(0, 80);
  const nodes = [];
  let sectionIndex = 0;

  function isIntroSection(section) {
    if (!section) return false;
    const sectionTitle = cleanKeyword(section.title).toLocaleLowerCase();
    const articleTitle = cleanKeyword(title).toLocaleLowerCase();
    if (!sectionTitle || !articleTitle) return false;
    const articleTerms = articleTitle.match(/[a-z][a-z0-9_+-]{2,}/g) ?? [];
    const sharedLeadingTerm = articleTerms.some((term) => (
      sectionTitle.startsWith(term) && sectionTitle.length <= term.length + 4
    ));
    return sharedLeadingTerm
      || sectionTitle === articleTitle
      || sectionTitle.includes(articleTitle)
      || articleTitle.includes(sectionTitle);
  }

  function walk(sections, parentId, parentTreeId) {
    const indexItems = [];
    for (const section of sections) {
      if (isSkippedSection(section.title)) continue;
      const index = ++sectionIndex;
      const id = `${articleIdPrefix}_s${index}`;
      const treeId = `${parentTreeId}_s${index}`;
      const bodyMarkdown = section.body.join('\n').trim();
      const body = normalizeMarkdownBlock(bodyMarkdown);
      const tags = [section.title];
      nodes.push({
        id,
        label: section.title,
        parentId,
        treeId,
        treeName: section.title,
        tags,
        card: {
          nodeId: id,
          title: section.title,
          ...(body ? { rootContent: body } : {}),
          tabs: [],
        },
      });
      const childSections = walk(section.children, id, treeId);
      const listPages = bulletListToPages(bodyMarkdown, `sec_${index}`);
      indexItems.push({
        id: `sec_${index}`,
        label: section.title,
        content: body,
        tags,
        ...((childSections.length || listPages.length) ? { pages: [...childSections, ...listPages] } : {}),
      });
    }
    return indexItems;
  }

  const leadContent = normalizeMarkdownBlock(sectionTree.body.join('\n'));
  const introSection = !leadContent && isIntroSection(sectionTree.children[0])
    ? sectionTree.children[0]
    : null;
  const rootSections = introSection
    ? [...introSection.children, ...sectionTree.children.slice(1)]
    : sectionTree.children;
  const sectionTabs = walk(rootSections, articleIdPrefix, rootTreeId);
  const rootContent = leadContent
    || (introSection ? normalizeMarkdownBlock(introSection.body.join('\n')) : '');
  nodes.unshift({
    id: articleIdPrefix,
    label: title,
    parentId: null,
    treeId: rootTreeId,
    treeName: title,
    card: {
      nodeId: articleIdPrefix,
      title,
      ...(rootContent ? { rootContent } : {}),
      tabs: sectionTabs,
    },
  });
  return {
    nodes,
    articleIdPrefix,
    treeNodeId: rootTreeId,
    tags: allTags,
    documentBody: polished.documentBody,
  };
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function buildMarkdownDocument({
  title,
  documentBody,
  sourceUrl,
  sourceTitle,
  language,
  translated,
  date,
  keywords,
  categories,
  structureMode = 'outline',
  nodeCount = 0,
  rootCount = 0,
  relationCount = 0,
}) {
  const keywordLines = keywords.map((keyword) => `  - ${yamlString(keyword)}`).join('\n');
  const categoryLines = categories.map((category) => `  - ${yamlString(category)}`).join('\n');
  const frontMatter = [
    '---',
    `title: ${yamlString(title)}`,
    `source_title: ${yamlString(sourceTitle)}`,
    `source_url: ${yamlString(sourceUrl)}`,
    `source_language: ${yamlString(language)}`,
    `translated_to: ${translated ? yamlString('zh-CN') : 'null'}`,
    `imported_at: ${yamlString(date)}`,
    `structure_mode: ${yamlString(structureMode)}`,
    `node_count: ${nodeCount}`,
    `root_count: ${rootCount}`,
    `relation_count: ${relationCount}`,
    'keywords:',
    keywordLines || '  []',
    'categories:',
    categoryLines || '  []',
    '---',
  ].join('\n');
  return `${frontMatter}\n\n# ${title}\n\n${documentBody.trim()}\n`;
}

export async function prepareWebImport(options) {
  const sourceUrl = normalizeWebUrl(options.url).href;
  const rawContentUrl = githubRawContentUrl(sourceUrl);
  const fetchedPage = await fetchWebPage(rawContentUrl ?? sourceUrl, options);
  const page = rawContentUrl
    ? { ...fetchedPage, url: sourceUrl, contentType: 'text/markdown' }
    : fetchedPage;
  const extracted = extractWebDocument(page);
  const shouldTranslate = options.translate !== false && extracted.language !== 'zh';
  const translator = options.translationService ?? createTranslationService({
    engine: options.translationEngine ?? 'auto',
    onWarning: options.onWarning,
  });
  let title = shouldTranslate ? await translator.translate(extracted.title, extracted.language) : extracted.title;
  const sourceMarkdown = polishArticleMarkdown(extracted.markdown).contentMarkdown;
  let markdown = shouldTranslate
    ? await translateMarkdownPreservingStructure(sourceMarkdown, extracted.language, translator)
    : sourceMarkdown;
  let categories = [];
  let aiKeywords = [];
  let questions = extractQuestions(markdown);
  let semanticDraft = null;

  if (options.useAi) {
    const organizer = options.aiOrganizer ?? createAiOrganizerFromEnv(options.aiEnv);
    if (!organizer) {
      throw new Error('AI 整理尚未配置，请设置 KNOWLEDGE_OS_LLM_API_KEY');
    }
    if (typeof organizer.compile === 'function') {
      semanticDraft = await organizer.compile({
        title,
        markdown,
        sourceLanguage: shouldTranslate ? 'zh' : extracted.language,
      });
      title = cleanKeyword(semanticDraft.title) || title;
      categories = semanticDraft.categories;
    } else {
      const organized = await organizer.organize({
        title,
        markdown,
        sourceLanguage: shouldTranslate ? 'zh' : extracted.language,
      });
      title = cleanKeyword(organized.title) || title;
      markdown = polishArticleMarkdown(organized.markdown).contentMarkdown;
      categories = organized.categories;
      aiKeywords = organized.keywords;
      questions = organized.questions.length > 0 ? organized.questions : questions;
    }
  }

  let built;
  let structureMode;
  if (semanticDraft) {
    built = projectSemanticDraft({
      draft: semanticDraft,
      sourceId: page.url,
      sourceTitle: extracted.title,
      sourceKind: IMPORT_SOURCE_KIND.Web,
    });
    built.articleIdPrefix = built.nodeId;
    built.tags = [...new Set([
      ...categories,
      ...built.nodes.flatMap((node) => node.tags ?? []),
    ])].slice(0, 80);
    built.documentBody = polishArticleMarkdown(markdown).documentBody;
    questions = built.questions;
    structureMode = 'semantic';
  } else {
    built = buildWebNodes({
      title,
      markdown,
      sourceUrl: page.url,
      language: extracted.language,
      extraKeywords: [...categories, ...aiKeywords],
    });
    structureMode = 'outline';
  }
  const date = (options.now ?? new Date()).toISOString().slice(0, 10);
  return {
    ...built,
    title,
    sourceTitle: extracted.title,
    sourceUrl: page.url,
    sourceHost: new URL(page.url).hostname,
    language: extracted.language,
    translated: shouldTranslate,
    categories,
    questions,
    structureMode,
    markdown: buildMarkdownDocument({
      title,
      documentBody: built.documentBody,
      sourceUrl: page.url,
      sourceTitle: extracted.title,
      language: extracted.language,
      translated: shouldTranslate,
      date,
      keywords: built.tags,
      categories,
      structureMode,
      nodeCount: built.nodes.length,
      rootCount: built.stats?.rootCount ?? 1,
      relationCount: built.edges?.length ?? 0,
    }),
  };
}

export function applyImportedQuestions(
  questions,
  sourceUrl,
  extractedQuestions,
  now,
  sourceKind = IMPORT_SOURCE_KIND.Web,
  context = {},
) {
  assertImportSourceKind(sourceKind);
  const prefix = `q_${sourceKind}_${sourceHash(sourceUrl)}_`;
  const existingById = new Map(questions.map((question) => [question.id, question]));
  const retained = questions.filter((question) => !question.id.startsWith(prefix));
  const generated = extractedQuestions.map((value) => {
    const draft = typeof value === 'string' ? { text: value } : value;
    if (!draft || typeof draft !== 'object' || typeof draft.text !== 'string') return null;
    const text = draft.text.trim();
    if (!text) return null;
    const identityKey = typeof draft.identityKey === 'string' && draft.identityKey.trim()
      ? draft.identityKey.trim()
      : text;
    const id = `${prefix}${crypto.createHash('sha256').update(identityKey).digest('hex').slice(0, 10)}`;
    const existing = existingById.get(id);
    const relatedNodeId = draft.relatedNodeId || context.defaultRelatedNodeId;
    const answer = typeof draft.answer === 'string' && draft.answer.trim() ? draft.answer.trim() : undefined;
    const source = {
      kind: sourceKind,
      sourceId: sourceUrl,
      sourceTitle: context.sourceTitle || '',
      ...(draft.sectionTitle ? { sectionTitle: draft.sectionTitle } : {}),
    };
    const imported = {
      id,
      text,
      answered: Boolean(answer),
      ...(relatedNodeId ? { relatedNodeId } : {}),
      ...(draft.kind ? { kind: draft.kind } : {}),
      ...(draft.difficulty ? { difficulty: draft.difficulty } : {}),
      ...(answer ? { answer } : {}),
      source,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (!existing) return imported;
    return {
      ...imported,
      ...existing,
      text,
      relatedNodeId: relatedNodeId || existing.relatedNodeId,
      kind: draft.kind || existing.kind,
      difficulty: draft.difficulty || existing.difficulty,
      answer: existing.answer || answer,
      answered: existing.answered || Boolean(existing.answer || answer),
      source,
      updatedAt: now,
    };
  }).filter(Boolean);
  questions.splice(0, questions.length, ...retained, ...generated);
  return generated.length;
}

export async function writeFileAtomically(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function resolveNotesPath(projectRoot, prepared) {
  const notesDirectory = path.join(projectRoot, 'docs', 'notes');
  const shortHash = sourceHash(prepared.sourceUrl).slice(0, 6);
  const existingFiles = await fs.readdir(notesDirectory).catch((error) => {
    if (error?.code === 'ENOENT') return [];
    throw error;
  });
  const existingFilename = existingFiles.find((filename) => (
    filename.startsWith('web-') && filename.endsWith(`-${shortHash}.md`)
  ));
  const generatedFilename = `web-${slugify(prepared.sourceHost)}-${slugify(prepared.sourceTitle)}-${shortHash}.md`;
  return path.join(notesDirectory, existingFilename ?? generatedFilename);
}

export async function importWebLink(options) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const poolPath = path.join(projectRoot, 'data', 'node-pool.json');
  const treePath = path.join(projectRoot, 'data', 'tree-data.json');
  const edgesPath = path.join(projectRoot, 'data', 'knowledge-edges.json');
  const questionsPath = path.join(projectRoot, 'data', 'questions.json');
  const [pool, tree, edges, questions] = await Promise.all([
    fs.readFile(poolPath, 'utf8').then(JSON.parse),
    fs.readFile(treePath, 'utf8').then(JSON.parse),
    fs.readFile(edgesPath, 'utf8').then(JSON.parse).catch((error) => {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }),
    fs.readFile(questionsPath, 'utf8').then(JSON.parse).catch((error) => {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }),
  ]);
  if (!options.parentTreeNodeId) throw new Error('请选择要挂载的项目目录');

  const prepared = await prepareWebImport(options);
  if (prepared.structureMode === 'semantic') {
    applySemanticImportAtTreeNode({
      pool,
      tree,
      edges,
      projected: prepared,
      parentTreeNodeId: options.parentTreeNodeId,
    });
  } else {
    applyImportAtTreeNode(
      pool,
      tree,
      prepared.nodes,
      options.parentTreeNodeId,
      prepared.articleIdPrefix,
      prepared.tags,
    );
  }
  const importedAt = Date.now();
  const questionCount = applyImportedQuestions(
    questions,
    prepared.sourceUrl,
    prepared.questions,
    importedAt,
    IMPORT_SOURCE_KIND.Web,
    {
      defaultRelatedNodeId: prepared.nodeId ?? prepared.articleIdPrefix,
      sourceTitle: prepared.title,
    },
  );

  const notesPath = await resolveNotesPath(projectRoot, prepared);
  await Promise.all([
    writeFileAtomically(poolPath, `${JSON.stringify(pool, null, 2)}\n`),
    writeFileAtomically(treePath, `${JSON.stringify(tree, null, 2)}\n`),
    writeFileAtomically(edgesPath, `${JSON.stringify(edges, null, 2)}\n`),
    writeFileAtomically(questionsPath, `${JSON.stringify(questions, null, 2)}\n`),
    writeFileAtomically(notesPath, prepared.markdown),
  ]);

  return {
    ok: true,
    nodeId: prepared.nodeId ?? prepared.articleIdPrefix,
    treeNodeId: prepared.treeNodeId,
    title: prepared.title,
    sourceUrl: prepared.sourceUrl,
    sourceHost: prepared.sourceHost,
    language: prepared.language,
    translated: prepared.translated,
    nodeCount: prepared.nodes.length,
    rootCount: prepared.stats?.rootCount ?? 1,
    relationCount: prepared.edges?.length ?? 0,
    sectionCount: prepared.structureMode === 'semantic' ? 0 : prepared.nodes.length - 1,
    questionCount,
    categories: prepared.categories,
    structureMode: prepared.structureMode,
    markdownPath: path.relative(projectRoot, notesPath).replace(/\\/g, '/'),
  };
}
