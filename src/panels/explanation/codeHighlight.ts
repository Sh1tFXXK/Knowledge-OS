/**
 * 解释卡代码块语法高亮（零依赖 tokenizer）。
 *
 * 背景：解释卡正文里的 ```java / ```sql / ```javascript 等围栏此前按纯文本渲染。
 * data/*.json 中真实出现的围栏语言：java / txt / javascript / typescript / yaml /
 * lisp / sql / python / go / json / xml / bash 等；txt / lisp 等未注册语言走纯文本。
 *
 * 设计约束（对齐本仓库既有惯例）：
 * - 不引入第三方依赖：MarkdownView 本身就是手写 markdown 渲染器，这是同一风格的延续；
 * - 懒计算：仅当代码块真实渲染时才分词（CodeBlock 用 useMemo + memo 承接）；
 * - 失败安全：任何异常都返回 null 回退纯文本，绝不阻塞整张解释卡（与 MermaidDiagram 同策略）。
 */

export type CodeTokenClass =
  | 'code-tok-keyword'
  | 'code-tok-string'
  | 'code-tok-comment'
  | 'code-tok-number'
  | 'code-tok-annot'
  | 'code-tok-xmltag'
  | 'code-tok-yamlkey';

export type CodeToken = { cls: CodeTokenClass | null; value: string };

type LanguageFamily = 'c-like' | 'sql' | 'yaml' | 'xml' | 'json';

type LanguageConfig = {
  family: LanguageFamily;
  keywords?: ReadonlySet<string>;
  /** c-like：是否识别 @Annotation */
  annotations?: boolean;
  /** c-like：是否识别 `#` 行注释（python / bash） */
  hashComments?: boolean;
};

function toKeywordSet(words: string[]): ReadonlySet<string> {
  return new Set(words);
}

const KEYWORD_SETS = {
  java: toKeywordSet(
    'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record yield sealed permits'
      .split(' '),
  ),
  javascript: toKeywordSet(
    'async await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return static super switch this throw try typeof var void while with yield'
      .split(' '),
  ),
  typescript: toKeywordSet(
    'abstract any as async await break case catch class const constructor continue debugger declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface is keyof let namespace new of private protected public readonly return satisfies set static super switch this throw try type typeof var void while with yield'
      .split(' '),
  ),
  go: toKeywordSet(
    'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var'
      .split(' '),
  ),
  python: toKeywordSet(
    'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield'
      .split(' '),
  ),
  bash: toKeywordSet(
    'case do done elif else esac exit export fi for function if in local return set then until while'
      .split(' '),
  ),
  sql: toKeywordSet(
    'add all alter and any as asc auto_increment between by case check column constraint create cross database default delete desc distinct drop else end engine exists foreign from full group having if ignore in index inner insert interval into is join key left like limit not null on or order outer primary procedure references replace right select set table then to trigger union unique update values view when where with'
      .split(' '),
  ),
} as const;

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  java: { family: 'c-like', keywords: KEYWORD_SETS.java, annotations: true },
  javascript: { family: 'c-like', keywords: KEYWORD_SETS.javascript },
  typescript: { family: 'c-like', keywords: KEYWORD_SETS.typescript },
  go: { family: 'c-like', keywords: KEYWORD_SETS.go },
  python: { family: 'c-like', keywords: KEYWORD_SETS.python, hashComments: true },
  bash: { family: 'c-like', keywords: KEYWORD_SETS.bash, hashComments: true },
  sql: { family: 'sql', keywords: KEYWORD_SETS.sql },
  yaml: { family: 'yaml' },
  json: { family: 'json' },
  xml: { family: 'xml' },
};

// 围栏别名 → 规范语言名（未列出的语言一律回退纯文本）
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  python3: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  golang: 'go',
  mysql: 'sql',
  psql: 'sql',
  postgres: 'sql',
  postgresql: 'sql',
  sqlite: 'sql',
  yml: 'yaml',
  html: 'xml',
  htm: 'xml',
  svg: 'xml',
};

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** c-like 家族：行/块注释、可选 # 注释、字符串、数字、关键字、@注解。 */
function tokenizeCLike(
  code: string,
  config: LanguageConfig,
): CodeToken[] {
  const keywords = config.keywords;
  const tokens: CodeToken[] = [];
  const n = code.length;
  let i = 0;
  let plain = '';
  const flushPlain = () => {
    if (plain) {
      tokens.push({ cls: null, value: plain });
      plain = '';
    }
  };
  const push = (cls: CodeTokenClass, value: string) => {
    flushPlain();
    tokens.push({ cls, value });
  };

  while (i < n) {
    const ch = code[i];
    const next = i + 1 < n ? code[i + 1] : '';

    // 行注释：//（可选 #）
    if (ch === '/' && next === '/') {
      let end = code.indexOf('\n', i);
      if (end === -1) end = n;
      push('code-tok-comment', code.slice(i, end));
      i = end;
      continue;
    }
    if (config.hashComments && ch === '#') {
      let end = code.indexOf('\n', i);
      if (end === -1) end = n;
      push('code-tok-comment', code.slice(i, end));
      i = end;
      continue;
    }
    // 块注释 /* */
    if (ch === '/' && next === '*') {
      let end = code.indexOf('*/', i + 2);
      end = end === -1 ? n : end + 2;
      push('code-tok-comment', code.slice(i, end));
      i = end;
      continue;
    }
    // 字符串：' " `（容忍未闭合，单/双引号不跨行）
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') {
          if (code[j + 1] === '\n' && quote !== '`') break;
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j += 1;
          break;
        }
        if (code[j] === '\n' && quote !== '`') break;
        j += 1;
      }
      push('code-tok-string', code.slice(i, j));
      i = j;
      continue;
    }
    // 数字（含 0x / 0b / 指数 / 后缀）
    if (isDigit(ch) || (ch === '.' && isDigit(next))) {
      const matched = /^(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[dDfFlL]?|\.\d[\d_]*(?:[eE][+-]?\d+)?)/.exec(
        code.slice(i),
      );
      const text = matched ? matched[0] : ch;
      push('code-tok-number', text);
      i += text.length;
      continue;
    }
    // 注解 @Annotation
    if (config.annotations && ch === '@') {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_.]/.test(code[j])) j += 1;
      if (j > i + 1) {
        push('code-tok-annot', code.slice(i, j));
        i = j;
        continue;
      }
    }
    // 标识符 / 关键字
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j += 1;
      const word = code.slice(i, j);
      if (keywords?.has(word)) {
        push('code-tok-keyword', word);
      } else {
        plain += word;
      }
      i = j;
      continue;
    }
    plain += ch;
    i += 1;
  }
  flushPlain();
  return tokens;
}

/** SQL：-- 与 # 行注释、块注释、'...'（'' 转义）、"..."、数字、大小写不敏感关键字。 */
function tokenizeSql(code: string, config: LanguageConfig): CodeToken[] {
  const keywords = config.keywords;
  const tokens: CodeToken[] = [];
  const n = code.length;
  let i = 0;
  let plain = '';
  const flushPlain = () => {
    if (plain) {
      tokens.push({ cls: null, value: plain });
      plain = '';
    }
  };
  const push = (cls: CodeTokenClass, value: string) => {
    flushPlain();
    tokens.push({ cls, value });
  };

  while (i < n) {
    const ch = code[i];
    const next = i + 1 < n ? code[i + 1] : '';

    if ((ch === '-' && next === '-') || ch === '#') {
      let end = code.indexOf('\n', i);
      if (end === -1) end = n;
      push('code-tok-comment', code.slice(i, end));
      i = end;
      continue;
    }
    if (ch === '/' && next === '*') {
      let end = code.indexOf('*/', i + 2);
      end = end === -1 ? n : end + 2;
      push('code-tok-comment', code.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\' && quote === "'") {
          j += 2;
          continue;
        }
        if (code[j] === quote && code[j + 1] === quote) {
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      push('code-tok-string', code.slice(i, j));
      i = j;
      continue;
    }
    if (isDigit(ch)) {
      const matched = /^(?:\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)/.exec(code.slice(i));
      const text = matched ? matched[0] : ch;
      push('code-tok-number', text);
      i += text.length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(code[j])) j += 1;
      const word = code.slice(i, j);
      if (keywords?.has(word.toLowerCase())) {
        push('code-tok-keyword', word);
      } else {
        plain += word;
      }
      i = j;
      continue;
    }
    plain += ch;
    i += 1;
  }
  flushPlain();
  return tokens;
}

function findYamlCommentIndex(line: string): number {
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '#' && (i === 0 || /\s/.test(line[i - 1]))) return i;
  }
  return -1;
}

/** yaml 值侧 token：整段字符串或数字。 */
function emitYamlValueTokens(out: CodeToken[], text: string): void {
  if (!text) return;
  const trimmed = text.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2);
  if (quoted) {
    const start = text.indexOf(trimmed[0]);
    const end = text.lastIndexOf(trimmed[0]);
    if (start > 0) out.push({ cls: null, value: text.slice(0, start) });
    out.push({ cls: 'code-tok-string', value: text.slice(start, end + 1) });
    if (end + 1 < text.length) out.push({ cls: null, value: text.slice(end + 1) });
    return;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    const start = text.indexOf(trimmed);
    const end = start + trimmed.length;
    if (start > 0) out.push({ cls: null, value: text.slice(0, start) });
    out.push({ cls: 'code-tok-number', value: trimmed });
    if (end < text.length) out.push({ cls: null, value: text.slice(end) });
    return;
  }
  out.push({ cls: null, value: text });
}

/** YAML：逐行识别 key:、注释与值（字符串 / 数字）。 */
function tokenizeYaml(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const lines = code.split('\n');
  lines.forEach((line, lineIdx) => {
    const commentIdx = findYamlCommentIndex(line);
    const body = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const keyMatch = /^(\s*(?:- )?)([^:\n#]+?)(:)(?=\s|$)/.exec(body);
    if (keyMatch) {
      const prefix = keyMatch[1];
      const keyWithColon = `${keyMatch[2]}${keyMatch[3]}`;
      if (prefix) tokens.push({ cls: null, value: prefix });
      tokens.push({ cls: 'code-tok-yamlkey', value: keyWithColon });
      emitYamlValueTokens(tokens, body.slice(keyMatch[0].length));
    } else {
      emitYamlValueTokens(tokens, body);
    }
    if (commentIdx >= 0) tokens.push({ cls: 'code-tok-comment', value: line.slice(commentIdx) });
    if (lineIdx < lines.length - 1) tokens.push({ cls: null, value: '\n' });
  });
  return tokens;
}

/** XML / HTML：<!-- --> 注释与 <tag>，其余纯文本。 */
function tokenizeXml(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const re = /<!--[\s\S]*?(?:-->|$)|<[^>\n]*>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    if (match.index > last) tokens.push({ cls: null, value: code.slice(last, match.index) });
    tokens.push({
      cls: match[0].startsWith('<!--') ? 'code-tok-comment' : 'code-tok-xmltag',
      value: match[0],
    });
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ cls: null, value: code.slice(last) });
  return tokens;
}

/** JSON：字符串 / true|false|null / 数字，其余纯文本。 */
function tokenizeJson(code: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  const re = /"(?:[^"\\\n]|\\.)*"|(?:\btrue\b|\bfalse\b|\bnull\b)|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    if (match.index > last) tokens.push({ cls: null, value: code.slice(last, match.index) });
    const value = match[0];
    const cls: CodeTokenClass = value.startsWith('"')
      ? 'code-tok-string'
      : value === 'true' || value === 'false' || value === 'null'
        ? 'code-tok-keyword'
        : 'code-tok-number';
    tokens.push({ cls, value });
    last = re.lastIndex;
  }
  if (last < code.length) tokens.push({ cls: null, value: code.slice(last) });
  return tokens;
}

/**
 * 把代码文本切成高亮 token。
 * 返回 null 表示该语言不认识 / 分词失败 → 调用方按纯文本渲染。
 */
export function tokenizeCode(code: string, lang: string): CodeToken[] | null {
  const key = lang.trim().toLowerCase();
  if (!key) return null;
  const canonical = LANGUAGE_ALIASES[key] ?? key;
  const config = LANGUAGE_CONFIGS[canonical];
  if (!config) return null;
  try {
    switch (config.family) {
      case 'json':
        return tokenizeJson(code);
      case 'xml':
        return tokenizeXml(code);
      case 'yaml':
        return tokenizeYaml(code);
      case 'sql':
        return tokenizeSql(code, config);
      case 'c-like':
        return tokenizeCLike(code, config);
    }
  } catch {
    return null;
  }
  return null;
}
