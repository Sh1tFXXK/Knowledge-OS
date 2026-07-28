import test from 'node:test';
import assert from 'node:assert/strict';
import { aiOrganizerCapabilities, createAiOrganizerFromEnv } from './import/ai-organizer.mjs';

test('AI organizer is disabled without a server-side key', () => {
  assert.equal(createAiOrganizerFromEnv({}), null);
  assert.deepEqual(aiOrganizerCapabilities({}), {
    configured: false,
    model: 'gpt-4.1-mini',
  });
});

test('AI organizer sends an OpenAI-compatible JSON request and validates output', async () => {
  let request;
  const organizer = createAiOrganizerFromEnv({
    KNOWLEDGE_OS_LLM_API_KEY: 'test-key',
    KNOWLEDGE_OS_LLM_BASE_URL: 'https://llm.example/v1/',
    KNOWLEDGE_OS_LLM_MODEL: 'knowledge-model',
  }, async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            title: '  整理标题  ',
            markdown: '## 核心\n\n正文',
            categories: ['系统', '系统', '并发'],
            keywords: ['锁', '锁', '线程'],
            questions: ['为什么需要锁？', '为什么需要锁？'],
          }),
        },
      }],
    }), { headers: { 'content-type': 'application/json' } });
  });

  const result = await organizer.organize({
    title: '原始标题',
    markdown: '## 原文\n\n内容',
    sourceLanguage: 'zh',
  });
  assert.equal(request.url, 'https://llm.example/v1/chat/completions');
  assert.equal(request.options.headers.Authorization, 'Bearer test-key');
  assert.equal(JSON.parse(request.options.body).response_format.type, 'json_object');
  assert.deepEqual(result, {
    title: '整理标题',
    markdown: '## 核心\n\n正文',
    categories: ['系统', '并发'],
    keywords: ['锁', '线程'],
    questions: ['为什么需要锁？'],
  });
});
