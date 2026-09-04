#!/usr/bin/env node
/**
 * import-wikipedia.mjs
 * 提取维基百科链接 → 整理成 Markdown 文档 → 导入 Knowledge-OS 节点池与目录树。
 *
 * 用法:
 *   node scripts/import/lib/import-wikipedia.mjs --interactive
 *   node scripts/import/lib/import-wikipedia.mjs <wiki-url> --parent=<nodeRef> [--dry-run] [--lang=zh|en] [--translate] [--translate-engine=auto|mymemory|google]
 *
 * 示例:
 *   node scripts/import/lib/import-wikipedia.mjs https://zh.wikipedia.org/wiki/数据库 --parent=n_55jiel25
 *   node scripts/import/lib/import-wikipedia.mjs https://en.wikipedia.org/wiki/Database --parent=n_55jiel25 --dry-run
 *   node scripts/import/lib/import-wikipedia.mjs https://en.wikipedia.org/wiki/ACID --parent=n_55jiel25 --translate
 *
 * 翻译:
 *   - 默认保留原文语言；加 --translate 时，非中文条目的正文与标题用机器翻译成中文。
 *   - 支持多翻译引擎：--translate-engine=auto（默认，MyMemory→Google 自动回退）、mymemory、google。
 *   - 章节结构与 markdown 链接 URL 保留不变；翻译有缓存与限流，长文较慢。
 *   - MyMemory 匿名额度约 5000 词/天，超限时自动重试（指数退避），重试耗尽后中止导入——不写入未翻译内容。
 *   - 导入时自动提取内部链接关键词作为 SuperTag，外部链接存入「外部链接」标签页。
 *   - 根节点卡片按章节结构生成标签页（tab），接入索引视图（ExplanationIndexView）。
 *
 * 说明:
 *   - 抓取使用 Wikipedia Action API (action=parse, prop=wikitext)，保留原文语言，不翻译。
 *   - 章节结构按维基原文 == / === 标题层级映射为节点树：文章标题为根节点(挂到 --parent 下)，
 *     H2(==) 为子节点，H3(===) 为孙节点，依此类推；正文列表项只进入解释卡索引页。
 *   - 黑名单章节(参见/外部链接/参考文献/延伸阅读等)不建节点，但保留在 Markdown 文档中。
 *   - 幂等：相同 URL 重复导入会更新而非重复创建（节点 id 与树结构按文章 slug 稳定生成）。
 *   - --dry-run 只抓取并打印预览，不写入任何文件。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const poolPath = path.join(root, 'data', 'node-pool.json');
const treePath = path.join(root, 'data', 'tree-data.json');
const notesDir = path.join(root, 'docs', 'notes');

// ---------------------------------------------------------------------------
// 1. URL 解析
// ---------------------------------------------------------------------------

/**
 * 从维基百科 URL 解析语言与标题。
 * 支持 https://{lang}.wikipedia.org/wiki/{title} 与 {lang}.m.wikipedia.org 移动版。
 */
export function parseWikiUrl(url) {
  const m = String(url).match(/^https?:\/\/([a-z]+(?:-[a-z]+)*)\.(?:m\.)?wikipedia\.org\/wiki\/(.+)$/i);
  if (!m) {
    throw new Error(`不是维基百科文章链接: ${url}\n期望形如 https://zh.wikipedia.org/wiki/文章标题`);
  }
  const lang = m[1].toLowerCase();
  const raw = m[2].split('?')[0].split('#')[0];
  const title = decodeURIComponent(raw).replace(/_/g, ' ').trim();
  if (!title) throw new Error('无法从链接解析出文章标题');
  return { lang, title };
}

export function wikiUrl(lang, title) {
  const [main, ...rest] = title.split('#');
  const t = main.trim().replace(/ /g, '_');
  const anchor = rest.length ? '#' + rest.join('#').trim().replace(/ /g, '_') : '';
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(t)}${anchor}`;
}

/** 规范化 slug：用于节点 id 与文件名，保留中文等 Unicode 字母数字。 */
function slugify(s) {
  let out = String(s).toLowerCase().trim();
  out = out.replace(/[\s_]+/g, '_').replace(/[^\p{L}\p{N}_-]/gu, '');
  out = out.slice(0, 60);
  return out || 'article';
}

/** 清理 wikitext 标记，得到纯文本标题（用于节点 label / 树名 / markdown 标题）。 */
function cleanLabel(t) {
  let s = String(t);
  // 内部链接 [[A|B]] → B，[[A]] → A
  s = s.replace(/\[\[([^\]|]+)\|([^\]]*)\]\]/g, '$2');
  s = s.replace(/\[\[([^\]]+)\]\]/g, '$1');
  // 粗体/斜体引号
  s = s.replace(/'''/g, '').replace(/''/g, '');
  // 模板残留
  s = s.replace(/\{\{[^{}]*\}\}/g, '');
  // HTML 标签
  s = s.replace(/<[^>]*>/g, '');
  // 外部链接残留
  s = s.replace(/\[[a-z][a-z0-9+.-]*:\/\/[^\]]*\]/gi, '');
  return s.trim();
}

// ---------------------------------------------------------------------------
// 2. 维基百科 API 抓取
// ---------------------------------------------------------------------------

async function fetchPage(lang, title) {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    format: 'json',
    prop: 'wikitext|displaytitle|revid',
    redirects: '1',
    formatversion: '2',
    origin: '*',
  });
  const apiUrl = `https://${lang}.wikipedia.org/w/api.php?${params}`;
  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'KnowledgeOS-Importer/1.0 (https://example.local; import-wikipedia.mjs)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`维基 API 请求失败: HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json.error) throw new Error(`维基 API 错误: ${json.error.info || json.error.code}`);
  const p = json.parse;
  if (!p || !p.wikitext) throw new Error('维基 API 未返回 wikitext（页面可能不存在或被保护）');
  return {
    title: p.title,
    displaytitle: stripHtml(p.displaytitle || p.title),
    wikitext: p.wikitext,
    pageid: p.pageid,
    revid: p.revid,
  };
}

// ---------------------------------------------------------------------------
// 3. wikitext → markdown 转换器
// ---------------------------------------------------------------------------

/** 递归剥离表格 {| ... |}（含嵌套）。 */
function stripTables(text) {
  let prev;
  do {
    prev = text;
    text = text.replace(/\{\|[\s\S]*?\|\}/g, '');
  } while (text !== prev);
  return text;
}

/** 把有信息价值的模板转成文本，再递归剥离剩余 {{...}} 模板。 */
function convertValuableTemplates(text) {
  // {{anl|Article}} / {{anl|Article|Display}} → [[Article]] or [[Article|Display]]（维基大纲核心模板）
  text = text.replace(/\{\{\s*anl\s*\|([^{}]*)\}\}/gi, (_m, args) => {
    const parts = args.split('|').map((s) => s.trim());
    return parts.length > 1 && parts[1] ? `[[${parts[0]}|${parts[1]}]]` : `[[${parts[0]}]]`;
  });
  // {{l|Article}} / {{link|Article}} / {{wl|Article}} / {{wiktionary|Article}} / {{commons|Article}} / {{wikiquote|Article}} → [[Article]]
  text = text.replace(
    /\{\{\s*(?:l|link|wl|wiktionary|commons|wikiquote|wikibooks|wikisource|wikinews|wikiversity|wikivoyage|wikidata|meta|commonscat|commonscategory)\s*\|\s*([^|{}]+)(?:\|[^{}]*)?\}\}/gi,
    (_m, article) => `[[${article.trim()}]]`,
  );
  // {{cite *|last=X|first=Y|title=Z|year=N|publisher=P|url=U}} → Z (Author, Year, Publisher)
  // 通用处理所有引用模板：cite book, cite journal, cite web, cite news, cite report, etc.
  text = text.replace(/\{\{\s*cite\s+\w+\s*\|([^{}]*)\}\}/gi, (_m, args) => {
    const params = {};
    args.split('|').forEach((p) => {
      const [k, ...v] = p.split('=');
      if (k && v.length) params[k.trim().toLowerCase()] = v.join('=').trim();
    });
    const title = params.title || params.chapter || params.work || '';
    const last = params.last || params.last1 || params.author || params.surname || '';
    const first = params.first || params.first1 || '';
    const author = params.author || [first, last].filter(Boolean).join(' ');
    const year = params.year || params.date || '';
    const publisher = params.publisher || params.journal || params.website || params.work || '';
    const parts = [title, author, year, publisher].filter(Boolean);
    return parts[0] + (parts.length > 1 ? ` (${parts.slice(1).join(', ')})` : '');
  });
  // {{ISBN|xxx}} → ISBN: xxx
  text = text.replace(/\{\{\s*ISBN\s*\|\s*([^{}|]+)\s*\}\}/gi, 'ISBN: $1');
  // {{section link|Article|Section}} → [[Article#Section]]
  text = text.replace(/\{\{\s*section\s+link\s*\|\s*([^|}]+)(?:\|([^|}]+))?\s*\}\}/gi, (_m, article, section) => {
    const a = article.trim();
    const s = section ? section.trim() : '';
    return s ? `[[${a}#${s}]]` : `[[${a}]]`;
  });
  // {{lang|xx|text}} / {{lang-xx|text}} → text
  text = text.replace(/\{\{\s*lang[a-z-]*\s*\|\s*[a-z-]+\s*\|([^{}]*)\}\}/gi, '$1');
  // {{main|X}} {{main article|X}} {{see also|X}} {{details|X}} {{further|X}} {{about|X}} → 主条目/参见：[[X]]
  text = text.replace(
    /\{\{\s*(main(?:\s+article)?|see\s+also|details|further|about|dablink|for)\s*\|([^{}]*)\}\}/gi,
    (_m, name, args) => {
      const first = args.split('|')[0].trim();
      const key = name.toLowerCase().replace(/\s+/g, ' ');
      const label =
        { main: '主条目', 'main article': '主条目', 'see also': '参见', details: '详见', further: '延伸阅读', about: '关于', dablink: '关于', for: '关于' }[key] || '参见';
      return `${label}：[[${first}]]`;
    },
  );
  // {{convert|1|km|...}} → 1 km
  text = text.replace(/\{\{\s*convert\s*\|\s*([\d.,]+)\s*\|\s*([a-z²³/]+)[^{}]*\}\}/gi, '$1 $2');
  // {{nihongo|kanji|romaji|english?}} → kanji (romaji)
  text = text.replace(/\{\{\s*nihongo\s*\|([^{}]*)\}\}/gi, (_m, args) => {
    const a = args.split('|').map((s) => s.trim());
    const kanji = a[0] || '';
    const romaji = a[1] || '';
    return romaji ? `${kanji}（${romaji}）` : kanji;
  });
  return text;
}

/** 无显示内容的模板——剥离为空。列表不要求穷尽，遗漏的由 salvage 逻辑兜底。 */
const NO_CONTENT_TEMPLATES = new Set([
  // 排版/CSS
  'clear', 'clr', 'clearright', 'clearleft', 'cleartop', '-',
  // 引用列表
  'reflist', 'reflist2', 'refs', 'refbegin', 'refend', 'reflist-talk',
  // 导航/页脚
  'outline footer', 'outlinefooter', 'footer', 'navbox', 'sidebar',
  'stack', 'stack begin', 'stack end', 'portal', 'portal box',
  // 元数据
  'short description', 'shortdesc', 'default sort', 'defaultsort',
  'use dmy dates', 'use mdy dates', 'use ymd dates',
  // 清理/维护标签
  'cleanup', 'copyedit', 'copy edit', 'uncategorized', 'wikify',
  'dead link', 'deadlink', 'failed verification', 'citation needed', 'cn',
  'dubious', 'disputed', 'clarify', 'clarifyme', 'vague', 'who',
  'update', 'expand', 'stub', 'merge', 'split', 'propose',
  'disambig', 'disambiguation', 'dab', 'disambig-cleanup',
  'noindex', 'void', 'empty section', 'bots', 'nobots',
  // 权威控制/分类
  'authority control', 'taxonbar', 'taxon ids', 'commonscat', 'commonscategory',
  // 其他无内容
  'sister project links', 'sistersites', 'meta sidebar',
  'collapsible list', 'collapsible option', 'weather box', 'climate',
  'medical resources', 'library link', 'librivox book',
  'good article', 'ga', 'featured article', 'fa',
  'wayback', 'webarchive', 'web archive',
  'refbegin-talk', 'refend-talk', 'reflist-talk-col',
  'pagesusing', 'cs1 config', 'cs1 config2',
  'rfd', 'afdm', 'prody', 'cfdend', 'tfdend', 'ffdend', 'mfdend',
]);

/**
 * 替代旧 stripTemplates：不再静默清空未知模板。
 * 1. 已知无内容模板 → 剥离为空
 * 2. 有 title=/name=/label= 参数 → 提取该值
 * 3. 有位置参数 → 提取第一个有意义的（>2 字符，非语言码）
 * 4. 以上都不满足 → 剥离为空（但有 fallback 记录）
 */
function salvageAndStripTemplates(text) {
  let prev;
  do {
    prev = text;
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_m, content) => {
      const trimmed = content.trim();
      if (!trimmed) return '';

      const pipeIdx = trimmed.indexOf('|');
      const name = (pipeIdx < 0 ? trimmed : trimmed.slice(0, pipeIdx)).trim().toLowerCase();
      const argStr = pipeIdx < 0 ? '' : trimmed.slice(pipeIdx + 1);

      // 已知无内容模板
      if (NO_CONTENT_TEMPLATES.has(name)) return '';

      // 解析参数
      const positional = [];
      const params = {};
      for (const arg of argStr.split('|')) {
        const eqIdx = arg.indexOf('=');
        if (eqIdx > 0) {
          const k = arg.slice(0, eqIdx).trim().toLowerCase();
          const v = arg.slice(eqIdx + 1).trim();
          if (k && v) params[k] = v;
        } else {
          const p = arg.trim();
          if (p) positional.push(p);
        }
      }

      // 按优先级提取内容
      const salvaged =
        params.title || params.chapter || params.work ||
        params.name || params.label || params.display ||
        params.first || positional[0] || '';

      // 过滤：太短、纯数字、语言代码 → 视为无内容
      if (salvaged && salvaged.length > 2 && !/^[a-z]{2}(-[a-z]+)?$/.test(salvaged) && !/^\d+$/.test(salvaged)) {
        return salvaged;
      }
      return '';
    });
  } while (text !== prev);
  return text;
}

/** 维基列表行 → markdown 列表（处理 * # ; : 及缩进）。 */
function convertLists(text) {
  const lines = text.split('\n');
  const counters = {};
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(:*)([*#;]+)\s*(.*)$/);
    if (m) {
      const colonIndent = m[1].length;
      const markers = m[2];
      const content = m[3];
      const depth = colonIndent + markers.length - 1;
      const last = markers[markers.length - 1];
      const prefix = '  '.repeat(depth);
      if (last === '*') {
        out.push(`${prefix}- ${content}`);
      } else if (last === '#') {
        counters[depth] = (counters[depth] || 0) + 1;
        out.push(`${prefix}${counters[depth]}. ${content}`);
      } else if (last === ';') {
        out.push(`${prefix}**${content}**`);
      } else if (last === ':') {
        out.push(`${prefix}: ${content}`);
      }
      for (const k of Object.keys(counters)) {
        if (Number(k) > depth) delete counters[k];
      }
    } else {
      out.push(line);
      for (const k of Object.keys(counters)) delete counters[k];
    }
  }
  return out.join('\n');
}

function stripHtml(s) {
  return String(s).replace(/<[^>]*>/g, '').trim();
}

/**
 * 将一段 wikitext 正文（不含章节标题行）转换为 Markdown。
 * 注意：标题行（== X ==）由章节解析器单独处理，此处仅做兜底转换。
 */
export function wikitextToMarkdown(text, lang) {
  let out = text;
  // 0. HTML 注释
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  // 1. <ref>...</ref> 与自闭合 <ref name="x"/>
  out = out.replace(/<ref\b[^>]*\/>/gi, '');
  out = out.replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, '');
  // 2. 整块媒体/扩展标签
  out = out.replace(/<gallery\b[^>]*>[\s\S]*?<\/gallery>/gi, '');
  out = out.replace(/<imagemap\b[^>]*>[\s\S]*?<\/imagemap>/gi, '');
  out = out.replace(/<timeline\b[^>]*>[\s\S]*?<\/timeline>/gi, '');
  out = out.replace(/<math\b[^>]*>[\s\S]*?<\/math>/gi, '');
  out = out.replace(/<chem\b[^>]*>[\s\S]*?<\/chem>/gi, '');
  // 3. 表格
  out = stripTables(out);
  // 4. 模板（先提取有价值，再 salvage 剩余——不静默清空）
  out = convertValuableTemplates(out);
  out = salvageAndStripTemplates(out);
  // 5. 命名空间媒体/分类链接
  out = out.replace(/\[\[(?:file|image|media|category|help|template|special|draft|module):[^\]]*\]\]/gi, '');
  // 6. 内部链接 [[A|B]] → [B](url) ; [[A]] → [A](url)
  out = out.replace(/\[\[([^\]|]+)\|([^\]]*)\]\]/g, (_m, t, d) => `[${d || t}](${wikiUrl(lang, t)})`);
  out = out.replace(/\[\[([^\]]+)\]\]/g, (_m, t) => `[${t}](${wikiUrl(lang, t)})`);
  // 7. 外部链接 [url 文本] → [文本](url) ; [url] → <url>
  out = out.replace(/\[([a-z][a-z0-9+.-]*:\/\/[^\s\]]+)\s+([^\]]*)\]/gi, (_m, u, d) => `[${d}](${u})`);
  out = out.replace(/\[([a-z][a-z0-9+.-]*:\/\/[^\s\]]+)\]/gi, (_m, u) => `<${u}>`);
  // 8. 标题兜底（章节解析已分离，此处以防残留）
  out = out.replace(/^(=+)\s*(.+?)\s*\1\s*$/gm, (_m, eq, t) => '#'.repeat(eq.length) + ' ' + t);
  // 9. 列表（必须在粗体转换前：此时粗体仍是 ''' 三引号，不会被列表正则误判；
  //    否则 '''x''' → **x** 后，行首 ** 会被 convertLists 当成列表标记）
  out = convertLists(out);
  // 10. 粗体 ''' → **，斜体 '' → *
  out = out.replace(/'''/g, '**');
  out = out.replace(/''/g, '*');
  // 11. 签名 ~~~~
  out = out.replace(/~{3,5}/g, '');
  // 12. <br> → 换行
  out = out.replace(/<br\s*\/?>/gi, '\n');
  // 13. 其余 HTML 标签：去标签留内容
  out = out.replace(/<\/?(?:small|big|sup|sub|span|div|p|blockquote|center|b|i|strong|em|u|s|code|tt|nowiki|noinclude|includeonly|syntaxhighlight|source|font|abbr|cite)\b[^>]*>/gi, '');
  // 14. 多余空行收敛
  out = out.replace(/\n{3,}/g, '\n\n');
  // 15. 行尾空白
  out = out
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n');
  // 16. HTML 实体解码（&ndash; &times; &alpha; 等）
  out = decodeEntities(out);
  return out.trim();
}

// ---------------------------------------------------------------------------
// 4. 章节解析（按 == / === 标题行切分，建成嵌套树）
// ---------------------------------------------------------------------------

const HEADING_RE = /^(=+)\s*(.+?)\s*\1\s*$/;

/** 扁平切分：返回 [{ level, title, body: string[] }]，第 0 项为导语(level 0)。 */
export function splitSections(wikitext) {
  const lines = wikitext.split('\n');
  const sections = [];
  let cur = { level: 0, title: '', body: [] };
  sections.push(cur);
  for (const line of lines) {
    const m = line.match(HEADING_RE);
    if (m && m[1].length >= 2) {
      cur = { level: m[1].length, title: m[2].trim(), body: [] };
      sections.push(cur);
    } else {
      cur.body.push(line);
    }
  }
  return sections;
}

/** 把扁平 sections 建成嵌套树：{ level, title, body, children: [...] }。 */
export function buildSectionTree(sections) {
  const root = { level: 0, title: '', body: sections[0]?.body ?? [], children: [] };
  const stack = [root];
  for (let i = 1; i < sections.length; i++) {
    const s = sections[i];
    while (stack.length > 1 && stack[stack.length - 1].level >= s.level) stack.pop();
    const node = { level: s.level, title: s.title, body: s.body, children: [] };
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }
  return root;
}

// ---------------------------------------------------------------------------
// 5. 黑名单章节（不建节点）
// ---------------------------------------------------------------------------

const BLACKLIST = new Set([
  // 中文（简体）
  '参见', '另见', '外部链接', '参考文献', '参考资料', '引用', '注脚', '延伸阅读',
  '注释', '书目', '来源', '脚注', '相关条目', '文献', '外部连结', '参考',
  // 中文（繁体）
  '參見', '另見', '外部連結', '外部連接', '參考文獻', '參考資料', '延伸閱讀',
  '註解', '註腳', '腳註', '書目', '來源', '相關條目', '文獻', '參考',
  // 英文
  'seealso', 'externallinks', 'references', 'furtherreading', 'notes',
  'bibliography', 'citations', 'sources', 'footnotes', 'citedsources',
  'workscited', 'externallinks', 'external Sites', 'cited sources',
]);

export function isBlacklisted(title) {
  const t = title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '')
    .replace(/[（）()【】\[\]：:，,。.、""'']/g, '');
  return BLACKLIST.has(t);
}

// ---------------------------------------------------------------------------
// 5.5 关键词与外部链接提取（用于 SuperTag 与索引视图）
// ---------------------------------------------------------------------------

const NS_RE = /^(file|image|media|category|help|template|special|draft|module|wikipedia|wp|portal|book|education|timedtext|wikt|commons|meta|wiktionary|wikibooks|wikiquote|wikisource|wikinews|wikiversity|wikivoyage|wikidata|wikimedia):/i;

/** 从章节树中提取内部链接目标作为关键词（用于 SuperTag）。最多 20 个，去重去命名空间。 */
export function extractKeywords(sectionTree) {
  const keywords = new Set();
  function collectFromBody(bodyLines) {
    const text = bodyLines.join('\n');
    const re = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const target = m[1].split('#')[0].trim().replace(/_/g, ' ');
      if (NS_RE.test(target)) continue;
      if (target.length < 2 || target.length > 40) continue;
      keywords.add(target);
    }
  }
  function walkNode(node) {
    collectFromBody(node.body);
    for (const ch of node.children) walkNode(ch);
  }
  walkNode(sectionTree);
  return [...keywords].slice(0, 20);
}

/** 从章节树中提取外部链接（用于「外部链接」标签页）。去重。 */
export function extractExternalLinks(sectionTree) {
  const links = [];
  const seen = new Set();
  function collectFromBody(bodyLines) {
    const text = bodyLines.join('\n');
    const re = /\[([a-z][a-z0-9+.-]*:\/\/[^\s\]]+)\s+([^\]]*)\]/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const url = m[1];
      const label = m[2].trim();
      if (!seen.has(url)) {
        seen.add(url);
        links.push({ url, label: label || url });
      }
    }
  }
  function walkNode(node) {
    collectFromBody(node.body);
    for (const ch of node.children) walkNode(ch);
  }
  walkNode(sectionTree);
  return links;
}

/** 格式化外部链接为 Markdown 列表。 */
function formatExternalLinks(links) {
  return links.map((l) => `- [${l.label}](${l.url})`).join('\n');
}

// ---------------------------------------------------------------------------
// 5.6 机器翻译（多引擎：MyMemory + Google Translate）
// ---------------------------------------------------------------------------

const TRANSLATE_TARGET = 'zh-CN';
const translateCache = new Map();

/** 当前翻译引擎（由 CLI --translate-engine 或交互向导设置）。 */
let translateEngine = 'auto'; // 'auto' | 'mymemory' | 'google'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    // Common named entities in Wikipedia wikitext
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&laquo;/g, '\u00AB')
    .replace(/&raquo;/g, '\u00BB')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&times;/g, '\u00D7')
    .replace(/&divide;/g, '\u00F7')
    .replace(/&deg;/g, '\u00B0')
    .replace(/&plusmn;/g, '\u00B1')
    .replace(/&minus;/g, '\u2212')
    .replace(/&alpha;/g, '\u03B1')
    .replace(/&beta;/g, '\u03B2')
    .replace(/&gamma;/g, '\u03B3')
    .replace(/&delta;/g, '\u03B4')
    .replace(/&epsilon;/g, '\u03B5')
    .replace(/&pi;/g, '\u03C0')
    .replace(/&sigma;/g, '\u03C3')
    .replace(/&theta;/g, '\u03B8')
    .replace(/&lambda;/g, '\u03BB')
    .replace(/&mu;/g, '\u03BC')
    .replace(/&omega;/g, '\u03A9')
    .replace(/&infin;/g, '\u221E')
    .replace(/&le;/g, '\u2264')
    .replace(/&ge;/g, '\u2265')
    .replace(/&ne;/g, '\u2260')
    .replace(/&approx;/g, '\u2248')
    .replace(/&prop;/g, '\u221D')
    .replace(/&harr;/g, '\u2194')
    .replace(/&larr;/g, '\u2190')
    .replace(/&rarr;/g, '\u2192')
    .replace(/&uarr;/g, '\u2191')
    .replace(/&darr;/g, '\u2193')
    .replace(/&trade;/g, '\u2122')
    .replace(/&copy;/g, '\u00A9')
    .replace(/&reg;/g, '\u00AE')
    .replace(/&sect;/g, '\u00A7')
    .replace(/&para;/g, '\u00B6')
    .replace(/&middot;/g, '\u00B7')
    .replace(/&bull;/g, '\u2022')
    .replace(/&prime;/g, '\u2032')
    .replace(/&Prime;/g, '\u2033')
    .replace(/&euro;/g, '\u20AC')
    .replace(/&pound;/g, '\u00A3')
    .replace(/&cent;/g, '\u00A2')
    .replace(/&yen;/g, '\u00A5')
    // Numeric entities: &#NNN; and &#xHHH;
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

/** 把长文本切成 ≤ maxLen 的片段，按换行边界切分以保留列表/段落结构。 */
function splitForTranslation(text, maxLen = 480) {
  const out = [];
  // 先按段落（双换行）切分
  const paragraphs = text.split(/(\n\n+)/);
  for (const para of paragraphs) {
    if (para.length <= maxLen) {
      out.push(para);
      continue;
    }
    // 按单换行切分（lookbehind 保留 \n 在行尾），再合并成 ≤ maxLen 的片段
    const lines = para.split(/(?<=\n)/);
    let cur = '';
    for (const line of lines) {
      if ((cur + line).length <= maxLen) {
        cur += line;
      } else {
        if (cur) out.push(cur);
        cur = line;
      }
    }
    if (cur) out.push(cur);
  }
  return out;
}

/** 修复 MyMemory 把 markdown 标记拆出的多余空格。 */
function fixupMdSpacing(s) {
  return s
    .replace(/\*\s+\*/g, '**') // * * → **（合并被拆开的星号对）
    .replace(/\]\s+\(/g, '](') // ] ( → ](
    .replace(/\[\s+/g, '[') // [ x → [x
    .replace(/\s+\]/g, ']') // x ] → x]
    .replace(/\(\s+/g, '(') // ( x → (x
    .replace(/\s+\)/g, ')') // x ) → x)
    .replace(/\*\* +(\S)/g, '**$1') // ** text → **text（粗体开头去空格）
    .replace(/(\S) +\*\*/g, '$1**'); // text ** → text**（粗体结尾去空格）
}

/** MyMemory 引擎：429 限流时自动重试（指数退避 1s/2s/4s），重试耗尽后抛出异常。 */
async function translateOneMyMemory(seg, fromLang) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(seg)}&langpair=${encodeURIComponent(fromLang + '|' + TRANSLATE_TARGET)}`;
  const MAX_RETRIES = 3;
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'KnowledgeOS-Importer/1.0' } });
      if (res.status === 429) {
        const delay = 1000 * Math.pow(2, attempt);
        if (attempt < MAX_RETRIES - 1) {
          console.warn(`  ⏳ MyMemory 限流 (429)，${delay / 1000}s 后重试 (${attempt + 1}/${MAX_RETRIES})…`);
          await sleep(delay);
          lastErr = new Error('HTTP 429 限流');
          continue;
        }
        throw new Error('HTTP 429 限流（重试耗尽）');
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      const tr = j?.responseData?.translatedText;
      if (!tr) throw new Error('无 translatedText');
      return fixupMdSpacing(decodeEntities(tr));
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`  ⏳ MyMemory 失败 (${e.message})，${delay / 1000}s 后重试 (${attempt + 1}/${MAX_RETRIES})…`);
        await sleep(delay);
      }
    }
  }
  throw lastErr || new Error('MyMemory 重试耗尽');
}

/** Google Translate 引擎（非官方 gtx 端点，无需 API key，限流宽松）。
 *  5xx/429 时自动重试（指数退避 1s/2s/4s）。返回值经过 fixupMdSpacing 修复。 */
async function translateOneGoogle(seg, fromLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${TRANSLATE_TARGET}&dt=t&q=${encodeURIComponent(seg)}`;
  const MAX_RETRIES = 3;
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeOS-Importer/1.0)',
          Accept: 'application/json',
        },
      });
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`  ⏳ Google Translate ${res.status}，${delay / 1000}s 后重试 (${attempt + 1}/${MAX_RETRIES})…`);
        await sleep(delay);
        lastErr = new Error(`Google Translate HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
      const j = await res.json();
      if (!Array.isArray(j) || !Array.isArray(j[0])) throw new Error('Google Translate 返回格式异常');
      const tr = j[0].map((item) => item[0] || '').join('');
      if (!tr) throw new Error('Google Translate 无翻译结果');
      return fixupMdSpacing(decodeEntities(tr));
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`  ⏳ Google Translate 失败 (${e.message})，${delay / 1000}s 后重试 (${attempt + 1}/${MAX_RETRIES})…`);
        await sleep(delay);
      }
    }
  }
  throw lastErr || new Error('Google Translate 重试耗尽');
}

/** 多引擎调度：auto 模式下先试 MyMemory，429/失败则回退 Google Translate。
 *  指定引擎时只试该引擎，但 Google 失败时也会试 MyMemory 作为兜底。 */
async function translateOne(seg, fromLang) {
  const engines = translateEngine === 'google'
    ? ['google', 'mymemory']
    : translateEngine === 'mymemory'
      ? ['mymemory', 'google']
      : ['mymemory', 'google']; // auto

  let lastErr;
  for (const eng of engines) {
    try {
      if (eng === 'mymemory') {
        return await translateOneMyMemory(seg, fromLang);
      } else {
        return await translateOneGoogle(seg, fromLang);
      }
    } catch (e) {
      lastErr = e;
      console.warn(`  ⚠ ${eng} 引擎失败：${e.message}`);
      if (engines.indexOf(eng) < engines.length - 1) {
        console.warn(`  ↳ 切换到备选引擎…`);
      }
    }
  }
  throw lastErr || new Error('所有翻译引擎均失败');
}

/** 翻译整段 markdown（分段 + 缓存 + 限流）。fromLang 为 zh 时原样返回。
 *  任何片段翻译失败都会抛出异常——翻译模式下不允许写入未翻译内容。 */
async function translateText(text, fromLang) {
  if (!fromLang || fromLang === 'zh') return text;
  const segments = splitForTranslation(text);
  const out = [];
  let failures = 0;
  let consecutiveFailures = 0;
  const ABORT_THRESHOLD = 3;

  for (const seg of segments) {
    if (!seg.trim()) {
      out.push(seg);
      continue;
    }
    if (translateCache.has(seg)) {
      out.push(translateCache.get(seg));
      continue;
    }
    try {
      // 保留尾部空白（Google Translate 会剥掉翻译结果的尾部 \n）
      const trailingWs = seg.match(/\s+$/)?.[0] || '';
      const tr = await translateOne(seg, fromLang);
      const result = tr.replace(/\s+$/, '') + trailingWs;
      translateCache.set(seg, result);
      out.push(result);
      consecutiveFailures = 0;
    } catch (e) {
      failures++;
      consecutiveFailures++;
      if (consecutiveFailures >= ABORT_THRESHOLD) {
        throw new Error(
          `翻译中止：连续 ${consecutiveFailures} 个片段失败（${e.message}）。` +
          `已完成 ${out.length}/${segments.length} 个片段。` +
          `翻译模式下不允许写入未翻译内容——请稍后重试或用 --translate-engine=google 指定引擎。`,
        );
      }
      out.push(seg);
    }
    await sleep(280);
  }

  if (failures > 0) {
    throw new Error(
      `翻译完成但有 ${failures}/${segments.length} 个片段失败。` +
      `翻译模式下不允许写入未翻译内容——请用 --translate-engine=google 重试。`,
    );
  }
  // 安全网：确保 markdown 列表项各自独占一行
  return out.join('').replace(/([^\n])\n?(- \[)/g, '$1\n$2');
}

async function maybeTranslate(text, fromLang, doTranslate) {
  if (!doTranslate) return text;
  return translateText(text, fromLang);
}

/** 疑似缩写/代号（全大写字母或字母数字组合，如 ACID/SQL/2PC）保留不译，避免误译。 */
function shouldPreserveTitle(t) {
  const compact = String(t).replace(/[^A-Za-z0-9]/g, '');
  return compact.length >= 2 && compact.length <= 8 && /[A-Z]/.test(compact) && compact === compact.toUpperCase();
}

function readMarkdownLinkAt(markdown, start) {
  if (markdown[start] !== '[') return null;
  const labelEnd = markdown.indexOf('](', start + 1);
  if (labelEnd < 0 || markdown.slice(start, labelEnd).includes('\n')) return null;

  let depth = 1;
  let cursor = labelEnd + 2;
  while (cursor < markdown.length && depth > 0) {
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

/** 去掉 markdown 链接的 URL，只保留显示文本；支持 URL 内的成对括号。 */
function stripLinkUrls(markdown) {
  let out = '';
  let cursor = 0;

  while (cursor < markdown.length) {
    const link = readMarkdownLinkAt(markdown, cursor);
    if (!link) {
      out += markdown[cursor];
      cursor += 1;
      continue;
    }
    out += link.label;
    cursor = link.end;
  }

  return out;
}

function wikipediaTagsFromMarkdown(markdown) {
  const tags = new Set();
  let cursor = 0;
  while (cursor < markdown.length) {
    const link = readMarkdownLinkAt(markdown, cursor);
    if (!link) {
      cursor += 1;
      continue;
    }

    try {
      const url = new URL(link.url);
      if (url.hostname.endsWith('.wikipedia.org') && url.pathname.startsWith('/wiki/')) {
        const title = decodeURIComponent(url.pathname.slice('/wiki/'.length))
          .replace(/_/g, ' ')
          .trim();
        if (title) tags.add(title);
      }
    } catch {
      // Ignore malformed or non-URL markdown destinations.
    }
    cursor = link.end;
  }
  return [...tags];
}

// ---------------------------------------------------------------------------
// 6. 节点与文档生成
// ---------------------------------------------------------------------------

/** 把 markdown 列表项解析为 page 层级（用于索引视图分类展示）。
 *  支持嵌套（缩进 2 空格 = 子页面）。返回 ExplanationPage[] 结构。 */
function bulletListToPages(markdown, idPrefix) {
  const lines = markdown.split('\n');
  const root = { pages: [], depth: -1 };
  const stack = [root];
  let pageIdx = 0;

  for (const line of lines) {
    const m = line.match(/^(\s*)- (.+)$/);
    if (!m) continue;
    const depth = Math.floor(m[1].length / 2);
    const markdownContent = m[2].trim();
    const content = stripLinkUrls(markdownContent);
    const tags = wikipediaTagsFromMarkdown(markdownContent);

    const label = content
      .split(/\s+(?:[–—-])\s+/)[0]
      .replace(/^[*_`\s]+|[*_`\s:]+$/g, '')
      .trim();

    pageIdx++;
    const page = {
      id: `${idPrefix}_p${pageIdx}`,
      label: label || `项 ${pageIdx}`,
      content,
      ...(tags.length > 0 ? { tags } : {}),
    };

    // 弹栈到 depth-1 层
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    stack[stack.length - 1].pages.push(page);
    page.pages = [];
    stack.push({ pages: page.pages, depth });
  }

  // 清理空 pages
  function cleanup(pages) {
    for (const p of pages) {
      if (p.pages && p.pages.length === 0) delete p.pages;
      else if (p.pages) cleanup(p.pages);
    }
  }
  cleanup(root.pages);
  return root.pages;
}

/**
 * 生成节点列表（扁平，带 parentId）与根节点卡片标签页结构。
 * 根节点卡片按章节层级生成 tab（H2）→ pages（H3+），接入索引视图。
 * 返回 { nodes, articleSlug, articleIdPrefix, keywords }。
 */
export async function buildNodes(sectionTree, lang, title, wikiUrlStr, doTranslate) {
  const date = new Date().toISOString().slice(0, 10);
  const articleSlug = slugify(`${lang}_${title}`);
  const articleIdPrefix = `k_wiki_${articleSlug}`;
  const transNote = doTranslate && lang !== 'zh' ? `（正文由机器翻译自 ${lang} 原文）` : '';
  const sourceStr = `${wikiUrlStr}\n整理：维基百科 ${lang} 条目自动抓取转换，${date}${transNote}`;
  const rootTreeId = `tree_wiki_${articleSlug}`;
  const rootId = articleIdPrefix;

  // 提取关键词（内部链接目标）→ SuperTag
  const keywords = extractKeywords(sectionTree);
  // 提取外部链接 → 「外部链接」标签页
  const externalLinks = extractExternalLinks(sectionTree);

  const rootLabel = doTranslate && !shouldPreserveTitle(title) ? await translateText(title, lang) : title;
  const rootBody = await maybeTranslate(wikitextToMarkdown(sectionTree.body.join('\n'), lang) || '（无导语）', lang, doTranslate);
  const leadKeywords = extractKeywords({ body: sectionTree.body, children: [] });

  const nodes = [];
  let idx = 0;

  /**
   * 递归：为每个非黑名单章节创建子节点（供目录树导航）
   * 同时收集 tab/page 结构（供根节点卡片的索引视图）。
   */
  async function walkAndCollect(children, parentId, parentTreeId) {
    const items = [];
    for (const ch of children) {
      if (isBlacklisted(ch.title)) continue;
      idx += 1;
      const myIdx = idx;
      const id = `${articleIdPrefix}_s${myIdx}`;
      const treeId = `${parentTreeId}_s${myIdx}`;
      const clean = cleanLabel(ch.title);
      const label = doTranslate && !shouldPreserveTitle(clean) ? await translateText(clean, lang) : clean;
      const anchor = clean.replace(/ /g, '_').replace(/[^\p{L}\p{N}_-]/gu, '');
      const bodyMd = await maybeTranslate(wikitextToMarkdown(ch.body.join('\n'), lang) || '（本节无正文）', lang, doTranslate);
      // 节点正文只保留关键词文本，不展示链接 URL
      const bodyPlain = stripLinkUrls(bodyMd);
      // 本节关键词 → SuperTag
      const sectionKeywords = extractKeywords({ body: ch.body, children: [] });

      // 章节子节点（目录树导航）
      nodes.push({
        id,
        label,
        parentId,
        treeId,
        treeName: label,
        tags: sectionKeywords,
        card: {
          nodeId: id,
          title: label,
          tabs: [
            { id: 'def', label: '定义', content: bodyPlain, tags: sectionKeywords },
            { id: 'source', label: '来源', content: `${wikiUrlStr}#${anchor}` },
          ],
        },
      });

      // 列表项属于本节解释卡的内部索引，不扩张目录树。
      const bulletPages = bulletListToPages(bodyMd, `sec_${myIdx}`);

      // 递归子章节 → pages
      const subPages = ch.children.length > 0
        ? await walkAndCollect(ch.children, id, treeId)
        : [];

      // 收集为根节点卡片的 tab/page（内容也去链接）
      const allPages = [...subPages, ...bulletPages];
      items.push({
        id: `sec_${myIdx}`,
        label,
        content: bodyPlain,
        tags: sectionKeywords,
        ...(allPages.length > 0 ? { pages: allPages } : {}),
      });
    }
    return items;
  }

  const sectionTabs = await walkAndCollect(sectionTree.children, rootId, rootTreeId);

  // 根节点：定义 tab + 章节 tabs + 来源 tab + 外部链接 tab
  const rootTabs = [
    { id: 'def', label: '定义', content: stripLinkUrls(rootBody), tags: leadKeywords },
    ...sectionTabs,
    { id: 'source', label: '来源', content: sourceStr },
  ];
  if (externalLinks.length > 0) {
    rootTabs.push({ id: 'links', label: '外部链接', content: formatExternalLinks(externalLinks) });
  }

  nodes.unshift({
    id: rootId,
    label: rootLabel,
    parentId: null,
    treeId: rootTreeId,
    treeName: rootLabel,
    card: { nodeId: rootId, title: rootLabel, tabs: rootTabs },
  });

  return { nodes, articleSlug, articleIdPrefix, keywords };
}

/** 生成完整 Markdown 文档（含黑名单章节，忠实原文结构）。 */
async function buildMarkdown(title, sectionTree, lang, wikiUrlStr, doTranslate) {
  const date = new Date().toISOString().slice(0, 10);
  const transNote = doTranslate && lang !== 'zh' ? '（正文由机器翻译，链接与结构保留原文）' : '内容保留原文语言';
  const headTitle = doTranslate && !shouldPreserveTitle(title) ? await translateText(title, lang) : title;
  let md = `# ${headTitle}\n\n> 来源：[维基百科 ${lang} 条目](${wikiUrlStr})  \n> 整理日期：${date}  \n> 说明：由 \`scripts/import/lib/import-wikipedia.mjs\` 自动从维基 wikitext 转换为 Markdown，${transNote}。\n\n---\n\n`;
  const lead = (await maybeTranslate(wikitextToMarkdown(sectionTree.body.join('\n'), lang), lang, doTranslate)).trim();
  if (lead) md += `${lead}\n\n---\n\n`;
  async function emit(children, depth) {
    for (const ch of children) {
      const h = '#'.repeat(Math.min(depth, 6));
      const cl = cleanLabel(ch.title);
      const label = doTranslate && !shouldPreserveTitle(cl) ? await translateText(cl, lang) : cl;
      md += `${h} ${label}\n\n`;
      const body = (await maybeTranslate(wikitextToMarkdown(ch.body.join('\n'), lang), lang, doTranslate)).trim();
      if (body) md += `${body}\n\n`;
      if (ch.children.length) await emit(ch.children, depth + 1);
    }
  }
  await emit(sectionTree.children, 2);
  return md.trim() + '\n';
}

// ---------------------------------------------------------------------------
// 7. 写入 node-pool / tree-data（幂等）
// ---------------------------------------------------------------------------

function ensureNode(pool, id, label, card, tags) {
  if (!pool[id]) {
    pool[id] = { id, label, card, tags };
  } else {
    pool[id].label = label;
    pool[id].card = card;
    pool[id].tags = tags;
  }
}

function findTreeNode(tree, nodeRef) {
  if (tree.nodeRef === nodeRef) return tree;
  for (const c of tree.children ?? []) {
    const r = findTreeNode(c, nodeRef);
    if (r) return r;
  }
  return null;
}

function findTreeNodeById(tree, treeNodeId) {
  if (tree.id === treeNodeId) return tree;
  for (const child of tree.children ?? []) {
    const found = findTreeNodeById(child, treeNodeId);
    if (found) return found;
  }
  return null;
}

function findTreeParentById(tree, childTreeNodeId) {
  if ((tree.children ?? []).some((child) => child.id === childTreeNodeId)) return tree;
  for (const child of tree.children ?? []) {
    const found = findTreeParentById(child, childTreeNodeId);
    if (found) return found;
  }
  return null;
}

function relocateGeneratedRoot(tree, parent, rootTreeNodeId) {
  const existingRoot = findTreeNodeById(tree, rootTreeNodeId);
  if (!existingRoot) return;
  if (existingRoot.id === parent.id || findTreeNodeById(existingRoot, parent.id)) {
    throw new Error('不能把导入内容挂载到它自身或它的子目录中');
  }
  const currentParent = findTreeParentById(tree, rootTreeNodeId);
  if (!currentParent || currentParent.id === parent.id) return;
  currentParent.children = currentParent.children.filter((child) => child.id !== rootTreeNodeId);
  parent.children ??= [];
  parent.children.push(existingRoot);
}

function applyImportToParent(pool, parent, nodes, articleIdPrefix, keywords) {
  const desiredNodeIds = new Set(nodes.map((node) => node.id));
  for (const id of Object.keys(pool)) {
    const belongsToArticle = id === articleIdPrefix || id.startsWith(`${articleIdPrefix}_s`);
    if (belongsToArticle && !desiredNodeIds.has(id)) delete pool[id];
  }

  for (const node of nodes) {
    const tags = [...new Set(node.id === articleIdPrefix ? keywords : (node.tags || []))];
    ensureNode(pool, node.id, node.label, node.card, tags);
  }

  parent.children ??= [];
  const rootNode = nodes[0];
  const generatedTreePrefix = rootNode.treeId;
  let rootTree = parent.children.find((child) => child.id === rootNode.treeId);
  if (!rootTree) {
    rootTree = { id: rootNode.treeId, name: rootNode.treeName, count: 0, nodeRef: rootNode.id, children: [] };
    parent.children.push(rootTree);
  } else {
    rootTree.name = rootNode.treeName;
    rootTree.nodeRef = rootNode.id;
    rootTree.children ??= [];
  }

  function mountChildren(treeNode, parentNodeId) {
    const desired = nodes.filter((node) => node.parentId === parentNodeId);
    treeNode.children = (treeNode.children ?? []).filter(
      (child) => !child.id.startsWith(`${generatedTreePrefix}_s`),
    );
    for (const childNode of desired) {
      const child = {
        id: childNode.treeId,
        name: childNode.treeName,
        count: 0,
        nodeRef: childNode.id,
        children: [],
      };
      treeNode.children.push(child);
      mountChildren(child, childNode.id);
    }
  }
  mountChildren(rootTree, rootNode.id);
}

/**
 * 把节点挂到 --parent 指定的树节点下。
 * 幂等：该文章根节点按生成的 tree id 去重更新；其下子树每次重建（清掉同文章旧子节点再重挂），
 * 保证与最新维基结构一致，不残留。
 */
export function applyImport(pool, tree, nodes, parentNodeRef, articleIdPrefix, keywords = []) {
  const parent = findTreeNode(tree, parentNodeRef);
  if (!parent) {
    throw new Error(`父节点 nodeRef="${parentNodeRef}" 未在 tree-data.json 中找到`);
  }
  relocateGeneratedRoot(tree, parent, nodes[0].treeId);
  applyImportToParent(pool, parent, nodes, articleIdPrefix, keywords);
}

/** 按目录项 id 精确挂载，供前端目录选择使用。 */
export function applyImportAtTreeNode(pool, tree, nodes, parentTreeNodeId, articleIdPrefix, keywords = []) {
  const parent = findTreeNodeById(tree, parentTreeNodeId);
  if (!parent) {
    throw new Error(`父目录 treeNodeId="${parentTreeNodeId}" 未在 tree-data.json 中找到`);
  }
  relocateGeneratedRoot(tree, parent, nodes[0].treeId);
  applyImportToParent(pool, parent, nodes, articleIdPrefix, keywords);
}

// ---------------------------------------------------------------------------
// 8. CLI 入口
// ---------------------------------------------------------------------------

export function validateLanguageCode(value) {
  const lang = String(value).trim().toLowerCase();
  if (!/^[a-z]{2,12}(?:-[a-z]{2,12})*$/.test(lang)) {
    throw new Error(`语言代码无效: ${value}（示例：zh、en、zh-min-nan）`);
  }
  return lang;
}

export function parseArgs(argv) {
  const args = argv.slice(2);
  const url = args.find((a) => !a.startsWith('--'));
  const parentArg = args.find((a) => a.startsWith('--parent='));
  const langArg = args.find((a) => a.startsWith('--lang='));
  const engineArg = args.find((a) => a.startsWith('--translate-engine='));
  return {
    url,
    parentNodeRef: parentArg ? parentArg.slice('--parent='.length) : null,
    langOverride: langArg ? langArg.slice('--lang='.length) : null,
    dryRun: args.includes('--dry-run'),
    translate: args.includes('--translate'),
    interactive: args.includes('--interactive'),
    translateEngine: engineArg ? engineArg.slice('--translate-engine='.length) : 'auto',
  };
}

async function askText(rl, label, defaultValue, validate) {
  while (true) {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    const answer = (await rl.question(`${label}${suffix}: `)).trim();
    const value = answer || defaultValue;
    if (!value) {
      console.log('  ✗ 此项不能为空，请重新输入。');
      continue;
    }
    try {
      return validate ? validate(value) : value;
    } catch (error) {
      console.log(`  ✗ ${error.message || error}`);
    }
  }
}

async function askYesNo(rl, label, defaultValue) {
  const hint = defaultValue ? 'Y/n' : 'y/N';
  while (true) {
    const answer = (await rl.question(`${label} [${hint}]: `)).trim().toLowerCase();
    if (!answer) return defaultValue;
    if (['y', 'yes', '是', '确认'].includes(answer)) return true;
    if (['n', 'no', '否', '取消'].includes(answer)) return false;
    console.log('  ✗ 请输入 y/yes/是 或 n/no/否。');
  }
}

function loadProjectData() {
  if (!fs.existsSync(poolPath)) throw new Error(`节点池不存在: ${path.relative(root, poolPath)}`);
  if (!fs.existsSync(treePath)) throw new Error(`目录树不存在: ${path.relative(root, treePath)}`);

  const pool = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
  if (!pool || typeof pool !== 'object' || Array.isArray(pool)) {
    throw new Error('data/node-pool.json 必须是对象');
  }
  if (!tree || typeof tree !== 'object' || Array.isArray(tree)) {
    throw new Error('data/tree-data.json 必须是树节点对象');
  }
  return { pool, tree };
}

function printUsage() {
  console.error('用法:');
  console.error('  node scripts/import/lib/import-wikipedia.mjs --interactive');
  console.error('  node scripts/import/lib/import-wikipedia.mjs <wiki-url> --parent=<nodeRef> [--dry-run] [--lang=zh] [--translate] [--translate-engine=auto|mymemory|google]');
}

async function main() {
  let opts = parseArgs(process.argv);
  const interactive = opts.interactive || (!opts.url && process.stdin.isTTY && process.stdout.isTTY);
  if (opts.interactive && (!process.stdin.isTTY || !process.stdout.isTTY)) {
    throw new Error('--interactive 需要在可交互终端中运行');
  }
  if (!opts.url && !interactive) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;
  try {
    if (interactive) {
      console.log('\n维基百科导入向导');
      console.log('每一步都会先检查；最终确认前不会写入文件。\n');
      opts.url = await askText(rl, '1/5 维基百科文章链接', opts.url, (value) => {
        parseWikiUrl(value);
        return value;
      });
      console.log('  ✓ URL 格式有效');
    }

    const parsed = parseWikiUrl(opts.url);
    let lang = validateLanguageCode(opts.langOverride || parsed.lang);
    if (interactive) {
      lang = await askText(rl, '2/5 Wikipedia 语言代码', lang, validateLanguageCode);
      console.log(`  ✓ 将使用 ${lang}.wikipedia.org`);
    }
    const title = parsed.title;
    const wikiUrlStr = wikiUrl(lang, title);
    if (!interactive && !opts.dryRun && !opts.parentNodeRef) {
      throw new Error('必须用 --parent=<nodeRef> 指定挂载父节点（可用 --dry-run 仅预览不写入）');
    }

    console.log(`\n▶ 检查维基百科来源 [${lang}]：${title}`);
    console.log(`  ${wikiUrlStr}`);
    const page = await fetchPage(lang, title);
    console.log(`  ✓ 页面可访问，已获取 wikitext（${page.wikitext.length} 字符，revid=${page.revid}）`);
    if (page.title.toLowerCase() !== title.toLowerCase()) {
      console.log(`  ↳ 重定向到：${page.title}`);
    }

    const sections = splitSections(page.wikitext);
    const sectionTree = buildSectionTree(sections);
    const totalSections = sections.length - 1;
    console.log(`  ✓ 章节结构有效：${totalSections} 个章节，另含导语`);

    if (interactive && lang !== 'zh') {
      opts.translate = await askYesNo(rl, '3/5 将标题和正文机器翻译成中文', opts.translate);
      console.log(`  ✓ 翻译：${opts.translate ? '启用' : '保留原文'}`);
      if (opts.translate) {
        const engineInput = await askText(rl, '   翻译引擎 (auto/mymemory/google)', opts.translateEngine || 'auto', (v) => {
          const e = v.trim().toLowerCase();
          if (!['auto', 'mymemory', 'google'].includes(e)) throw new Error('可选：auto（自动回退）、mymemory、google');
          return e;
        });
        opts.translateEngine = engineInput;
      }
    } else if (lang === 'zh') {
      opts.translate = false;
      if (interactive) console.log('3/5 源语言为中文，跳过翻译');
    }
    translateEngine = opts.translateEngine || 'auto';

    if (interactive && !opts.dryRun) {
      const shouldImport = await askYesNo(rl, '4/5 检查完成后写入项目（选择“否”则仅预览）', true);
      opts.dryRun = !shouldImport;
    } else if (interactive) {
      console.log('4/5 已由 --dry-run 指定为仅预览');
    }

    let projectData = null;
    if (!opts.dryRun) {
      projectData = loadProjectData();
      console.log(`  ✓ 项目数据有效：${Object.keys(projectData.pool).length} 个知识节点`);
      if (interactive) {
        opts.parentNodeRef = await askText(rl, '5/5 挂载父节点 nodeRef', opts.parentNodeRef, (value) => {
          if (!findTreeNode(projectData.tree, value)) throw new Error(`未找到 nodeRef="${value}"`);
          return value;
        });
      } else if (!opts.parentNodeRef) {
        throw new Error('必须用 --parent=<nodeRef> 指定挂载父节点（可用 --dry-run 仅预览不写入）');
      }
      const parent = findTreeNode(projectData.tree, opts.parentNodeRef);
      if (!parent) throw new Error(`父节点 nodeRef="${opts.parentNodeRef}" 未在 tree-data.json 中找到`);
      console.log(`  ✓ 父节点存在：${parent.name || parent.nodeRef} [${parent.nodeRef}]`);
    } else if (interactive) {
      console.log('5/5 仅预览模式无需父节点');
    }

    if (opts.translate && lang !== 'zh') {
      console.log(`\n▶ 启用机器翻译（${lang} → 中文，引擎：${translateEngine}，长文较慢请耐心等待）`);
    }
    const { nodes, articleSlug, articleIdPrefix, keywords } = await buildNodes(sectionTree, lang, page.title, wikiUrlStr, opts.translate);
    console.log(`  ✓ 生成节点：${nodes.length} 个（已跳过黑名单章节如 参见/外部链接/参考文献）`);

    const md = await buildMarkdown(page.title, sectionTree, lang, wikiUrlStr, opts.translate);
    const notesPath = path.join(notesDir, `wiki-${articleSlug}.md`);

    console.log('\n── 写入前预览 ──');
    console.log(`文章标题：${page.title}`);
    console.log(`节点根 id：${nodes[0].id}`);
    console.log('节点列表：');
    const printTree = (arr, parentId, depth) => {
      arr.filter((n) => n.parentId === parentId).forEach((n) => {
        console.log(`${'  '.repeat(depth + 1)}- ${n.label}  [${n.id}]`);
        printTree(arr, n.id, depth + 1);
      });
    };
    printTree(nodes, null, 0);
    console.log(`\n文档目标：${path.relative(root, notesPath)}`);
    console.log(`Markdown 预览（前 600 字）：\n${md.slice(0, 600)}${md.length > 600 ? '\n…' : ''}`);

    if (opts.dryRun) {
      console.log('\n✓ 仅预览模式：全部检查通过，未写入任何文件。');
      return;
    }

    if (interactive) {
      const confirmed = await askYesNo(rl, `确认写入节点池、目录树和 ${path.basename(notesPath)}`, false);
      if (!confirmed) {
        console.log('\n已取消：检查和预览已完成，未写入任何文件。');
        return;
      }
    }

    console.log(`\n▶ 写入节点池：${path.relative(root, poolPath)}`);
    const { pool, tree } = projectData;

    applyImport(pool, tree, nodes, opts.parentNodeRef, articleIdPrefix, keywords);

    fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2) + '\n', 'utf8');
    fs.writeFileSync(treePath, JSON.stringify(tree, null, 2) + '\n', 'utf8');
    fs.mkdirSync(notesDir, { recursive: true });
    fs.writeFileSync(notesPath, md, 'utf8');

    console.log(`✓ 已写入 node-pool.json（更新 ${nodes.length} 个节点）`);
    console.log(`✓ 已写入 tree-data.json（挂到 nodeRef=${opts.parentNodeRef} 下）`);
    console.log(`✓ 已写入 ${path.relative(root, notesPath)}`);
    console.log('\n完成。');
  } finally {
    rl?.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`\n✗ 失败：${e.message || e}`);
    if (process.env.DEBUG) console.error(e.stack);
    process.exit(1);
  });
}
