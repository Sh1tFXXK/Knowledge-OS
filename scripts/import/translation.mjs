const TARGET_LANGUAGE = 'zh-CN';
const ENGINES = new Set(['auto', 'mymemory', 'google']);

export function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
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
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function splitText(text, maxLength = 480) {
  const segments = [];
  for (const paragraph of text.split(/(\n\n+)/)) {
    if (paragraph.length <= maxLength) {
      segments.push(paragraph);
      continue;
    }

    let current = '';
    for (const line of paragraph.split(/(?<=\n)/)) {
      if ((current + line).length <= maxLength) {
        current += line;
      } else {
        if (current) segments.push(current);
        current = line;
      }
    }
    if (current) segments.push(current);
  }
  return segments;
}

function fixMarkdownSpacing(value) {
  return value
    .replace(/\*\s+\*/g, '**')
    .replace(/\]\s+\(/g, '](')
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\*\* +(\S)/g, '**$1')
    .replace(/(\S) +\*\*/g, '$1**');
}

function engineOrder(engine) {
  return engine === 'google' ? ['google', 'mymemory'] : ['mymemory', 'google'];
}

export function createTranslationService(options = {}) {
  const engine = options.engine ?? 'auto';
  if (!ENGINES.has(engine)) throw new Error(`不支持的翻译引擎: ${engine}`);

  const fetchImpl = options.fetchImpl ?? fetch;
  const wait = options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const onWarning = options.onWarning ?? (() => {});
  const cache = new Map();

  async function requestWithRetry(url, name, parse) {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KnowledgeOS-Importer/2.0)',
            Accept: 'application/json',
          },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await parse(response);
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          const delay = 1000 * (2 ** attempt);
          onWarning(`${name} 翻译失败，${delay / 1000} 秒后重试`);
          await wait(delay);
        }
      }
    }
    throw lastError ?? new Error(`${name} 翻译失败`);
  }

  async function translateWithMyMemory(segment, fromLanguage) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(segment)}&langpair=${encodeURIComponent(`${fromLanguage}|${TARGET_LANGUAGE}`)}`;
    return requestWithRetry(url, 'MyMemory', async (response) => {
      const json = await response.json();
      const translated = json?.responseData?.translatedText;
      if (!translated) throw new Error('MyMemory 未返回翻译结果');
      return fixMarkdownSpacing(decodeHtmlEntities(translated));
    });
  }

  async function translateWithGoogle(segment, fromLanguage) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLanguage}&tl=${TARGET_LANGUAGE}&dt=t&q=${encodeURIComponent(segment)}`;
    return requestWithRetry(url, 'Google', async (response) => {
      const json = await response.json();
      if (!Array.isArray(json) || !Array.isArray(json[0])) {
        throw new Error('Google Translate 返回格式异常');
      }
      const translated = json[0].map((item) => item[0] || '').join('');
      if (!translated) throw new Error('Google Translate 未返回翻译结果');
      return fixMarkdownSpacing(decodeHtmlEntities(translated));
    });
  }

  async function translateSegment(segment, fromLanguage) {
    let lastError;
    for (const candidate of engineOrder(engine)) {
      try {
        return candidate === 'google'
          ? await translateWithGoogle(segment, fromLanguage)
          : await translateWithMyMemory(segment, fromLanguage);
      } catch (error) {
        lastError = error;
        onWarning(`${candidate} 引擎不可用，正在切换备用引擎`);
      }
    }
    throw lastError ?? new Error('所有翻译引擎均不可用');
  }

  async function translate(text, fromLanguage) {
    const language = String(fromLanguage ?? '').toLowerCase().split('-')[0];
    if (!language || language === 'zh' || !text.trim()) return text;

    const translatedSegments = [];
    for (const segment of splitText(text)) {
      if (!segment.trim()) {
        translatedSegments.push(segment);
        continue;
      }

      if (!cache.has(segment)) {
        const trailingWhitespace = segment.match(/\s+$/)?.[0] ?? '';
        const translated = await translateSegment(segment, language);
        cache.set(segment, translated.replace(/\s+$/, '') + trailingWhitespace);
        await wait(280);
      }
      translatedSegments.push(cache.get(segment));
    }

    return translatedSegments.join('').replace(/([^\n])\n?(- \[)/g, '$1\n$2');
  }

  return Object.freeze({ translate });
}
