const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_DOCUMENT_CHARACTERS = 120_000;

function stringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && item.length <= maxLength))]
    .slice(0, maxItems);
}

function validateOrganization(value, fallbackTitle, fallbackMarkdown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AI 整理结果不是有效对象');
  }
  const title = typeof value.title === 'string' && value.title.trim()
    ? value.title.trim().slice(0, 160)
    : fallbackTitle;
  const markdown = typeof value.markdown === 'string' && value.markdown.trim()
    ? value.markdown.trim()
    : fallbackMarkdown;
  return {
    title,
    markdown,
    categories: stringList(value.categories, 6, 60),
    keywords: stringList(value.keywords, 40, 60),
    questions: stringList(value.questions, 20, 160),
  };
}

function messageText(message) {
  if (typeof message?.content === 'string') return message.content;
  if (!Array.isArray(message?.content)) return null;
  return message.content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

export function createAiOrganizerFromEnv(env = process.env, fetchImpl = fetch) {
  const apiKey = env.KNOWLEDGE_OS_LLM_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (env.KNOWLEDGE_OS_LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = env.KNOWLEDGE_OS_LLM_MODEL?.trim() || DEFAULT_MODEL;

  return Object.freeze({
    model,
    async organize({ title, markdown, sourceLanguage }) {
      if (markdown.length > MAX_DOCUMENT_CHARACTERS) {
        throw new Error(`文档超过 ${MAX_DOCUMENT_CHARACTERS} 字符，请关闭 AI 整理后导入`);
      }
      const response = await fetchImpl(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 20_000,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: [
                '你是 Knowledge OS 的严格技术文档编辑器。',
                '仅输出 JSON 对象，字段必须为 title、markdown、categories、keywords、questions。',
                'markdown 不得包含 YAML front matter、H1、外部链接、图片、参考资料或来源章节。',
                '不得创建名为“定义”的章节；概念说明必须保留并合并到对应关键词的根段落。',
                '保留全部有效技术内容、代码围栏、列表和表格；章节从 H2 开始且层级连续。',
                'categories 是 1-6 个从宽到窄的领域分类。',
                'keywords 是可独立检索的技术关键词，不要句子。',
                'questions 是根据正文提出的、可独立进入全局问题库的问题，不要回答。',
                '不要把问题插入 markdown 正文。',
              ].join('\n'),
            },
            {
              role: 'user',
              content: `源语言：${sourceLanguage}\n原始标题：${title}\n\n待整理 Markdown：\n${markdown}`,
            },
          ],
        }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`AI 整理请求失败（HTTP ${response.status}）${detail ? `：${detail.slice(0, 240)}` : ''}`);
      }
      const payload = await response.json();
      const content = messageText(payload?.choices?.[0]?.message);
      if (!content) throw new Error('AI 整理未返回内容');

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error('AI 整理未返回有效 JSON');
      }
      return validateOrganization(parsed, title, markdown);
    },
  });
}

export function aiOrganizerCapabilities(env = process.env) {
  return {
    configured: Boolean(env.KNOWLEDGE_OS_LLM_API_KEY?.trim()),
    model: env.KNOWLEDGE_OS_LLM_MODEL?.trim() || DEFAULT_MODEL,
  };
}
