import { normalizeSemanticDraft } from './semantic-draft.mjs';

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

function lineNumberedMarkdown(markdown) {
  return String(markdown)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line, index) => `${index + 1}: ${line}`)
    .join('\n');
}

export function createAiOrganizerFromEnv(env = process.env, fetchImpl = fetch) {
  const apiKey = env.KNOWLEDGE_OS_LLM_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (env.KNOWLEDGE_OS_LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = env.KNOWLEDGE_OS_LLM_MODEL?.trim() || DEFAULT_MODEL;

  const requestJson = async ({ operation, messages }) => {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 20_000,
        response_format: { type: 'json_object' },
        messages,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`${operation}请求失败（HTTP ${response.status}）${detail ? `：${detail.slice(0, 240)}` : ''}`);
    }
    const payload = await response.json();
    const content = messageText(payload?.choices?.[0]?.message);
    if (!content) throw new Error(`${operation}未返回内容`);
    try {
      return JSON.parse(content);
    } catch {
      throw new Error(`${operation}未返回有效 JSON`);
    }
  };

  return Object.freeze({
    model,
    async organize({ title, markdown, sourceLanguage }) {
      if (markdown.length > MAX_DOCUMENT_CHARACTERS) {
        throw new Error(`文档超过 ${MAX_DOCUMENT_CHARACTERS} 字符，请关闭 AI 整理后导入`);
      }
      const parsed = await requestJson({
        operation: 'AI 整理',
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
      });
      return validateOrganization(parsed, title, markdown);
    },
    async compile({ title, markdown, sourceLanguage }) {
      if (markdown.length > MAX_DOCUMENT_CHARACTERS) {
        throw new Error(`文档超过 ${MAX_DOCUMENT_CHARACTERS} 字符，请缩小语义编译范围`);
      }
      const parsed = await requestJson({
        operation: '语义编译',
        messages: [
          {
            role: 'system',
            content: [
              '你是 Knowledge OS 的语义编译器，把 Markdown 编译为来源可追溯的知识图。',
              '仅输出 JSON 对象，字段为 title、categories、nodes、relations、questions。',
              '不要创建“文档”“来源”“章节”“概述”节点；来源是元数据，不是知识结构。',
              'Markdown 标题只表示论述范围，不能因为存在标题就自动创建节点。',
              '一个节点必须是最小可独立寻址且不损失语义的知识单元：有稳定指称、可单独提问、引用、更新或参与关系。',
              '例子、代码、表格和换句话说的说明应进入相关节点 details；只有可独立复用的证据才成为 evidence 节点。',
              '允许多个互不依赖的根节点；不要为了得到一棵树而编造父子关系。',
              '节点 kind 只能是 concept、entity、state、event、rule、mechanism、evidence。',
              '每个节点字段为 key、label、kind、summary、details、aliases、tags、sourceSpans。',
              'kind 为 mechanism 时还必须提供 mechanism：triggerKeys、participantKeys、stateKeys、outcomeKeys、failureKeys；至少一个触发、一个参与者、两个 state 节点、一个结果，并存在直接因果或状态转换关系。',
              'key 是当前知识对象的稳定语义标识，不得使用章节序号或随机值。',
              'sourceSpans 是 [{startLine,endLine}]，必须精确覆盖支持该节点的原文行。',
              '关系 kind 只能是 structure、classification、dependency、causality、state-transition、constraint、evidence、reference。',
              '每条关系字段为 sourceKey、targetKey、kind、label、sourceSpans，并且只能表达原文直接支持的关系。',
              '方向约定：整体→部分、上位类→下位对象、依赖者→被依赖者、原因→结果、前状态→后状态、约束→受约束对象、证据→结论、引用者→被引用者。',
              'questions 字段为 text、relatedNodeKey、kind、difficulty；问题必须能独立进入问题库。',
              '不要补写原文没有表达的事实，不要把排版顺序误当成语义关系。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `源语言：${sourceLanguage}`,
              `原始标题：${title}`,
              '以下 Markdown 已添加只读行号。sourceSpans 必须引用这些行号：',
              lineNumberedMarkdown(markdown),
            ].join('\n\n'),
          },
        ],
      });
      return normalizeSemanticDraft(parsed, { fallbackTitle: title, markdown });
    },
  });
}

export function aiOrganizerCapabilities(env = process.env) {
  return {
    configured: Boolean(env.KNOWLEDGE_OS_LLM_API_KEY?.trim()),
    model: env.KNOWLEDGE_OS_LLM_MODEL?.trim() || DEFAULT_MODEL,
  };
}
