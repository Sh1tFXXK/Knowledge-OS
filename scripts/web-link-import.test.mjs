import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  assertPublicWebUrl,
  buildWebNodes,
  extractWebDocument,
  fetchWebPage,
  importWebLink,
  normalizeWebUrl,
  parseMarkdownSections,
  polishArticleMarkdown,
  prepareWebImport,
} from './import/web-link-importer.mjs';

const ARTICLE_HTML = `<!doctype html>
<html lang="en">
  <head><title>Storage engines</title></head>
  <body>
    <nav>Navigation that should be removed</nav>
    <article>
      <h1>Storage engines</h1>
      <p>A storage engine is the software component a database uses to create, read, update, and delete data.</p>
      <h2>Architecture</h2>
      <p>Engines coordinate <a href="/buffer-pools">buffer pools</a> and durable files.</p>
      <pre><code>public class Store {}</code></pre>
      <ul><li>B-tree indexes organize ordered keys.</li><li>Log structures optimize sequential writes.</li></ul>
      <h3>Recovery</h3>
      <p>Write-ahead logging restores committed changes after a crash.</p>
      <h2>References</h2>
      <p>This section should remain in Markdown but not become a project node.</p>
    </article>
  </body>
</html>`;

function htmlResponse(html = ARTICLE_HTML, status = 200, headers = {}) {
  return new Response(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
  });
}

test('web URLs are normalized and private network destinations are rejected', async () => {
  assert.equal(normalizeWebUrl(' https://example.com/a#part ').href, 'https://example.com/a');
  assert.throws(() => normalizeWebUrl('file:///etc/passwd'), /http/);
  await assert.rejects(
    assertPublicWebUrl('https://internal.example/article', async () => [{ address: '10.0.0.4', family: 4 }]),
    /内网/,
  );
  await assert.doesNotReject(
    assertPublicWebUrl('https://public.example/article', async () => [{ address: '93.184.216.34', family: 4 }]),
  );
  await assert.doesNotReject(
    assertPublicWebUrl('https://proxied.example/article', async () => [{ address: '198.18.0.9', family: 4 }]),
  );
  await assert.rejects(assertPublicWebUrl('https://198.18.0.9/article'), /内网/);
});

test('fetchWebPage follows bounded redirects and returns the final canonical URL', async () => {
  const requested = [];
  const page = await fetchWebPage('https://example.com/old', {
    validateNetwork: false,
    fetchImpl: async (url) => {
      requested.push(String(url));
      return requested.length === 1
        ? htmlResponse('', 302, { location: '/article' })
        : htmlResponse();
    },
  });
  assert.deepEqual(requested, ['https://example.com/old', 'https://example.com/article']);
  assert.equal(page.url, 'https://example.com/article');
  assert.match(page.content, /Storage engines/);
});

test('fetchWebPage retries transient network failures', async () => {
  let attempts = 0;
  const page = await fetchWebPage('https://example.com/article', {
    validateNetwork: false,
    wait: async () => {},
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('temporary failure');
      return htmlResponse();
    },
  });
  assert.equal(attempts, 3);
  assert.match(page.content, /Storage engines/);
});

test('GitHub Markdown links read raw content while retaining the original source URL', async () => {
  const sourceUrl = 'https://github.com/example/repo/blob/main/4.%20Concurrency.md';
  const requested = [];
  const result = await prepareWebImport({
    url: sourceUrl,
    translate: false,
    validateNetwork: false,
    fetchImpl: async (url) => {
      requested.push(String(url));
      return new Response('# Concurrency\n\n```java\nclass Lock {}\n```\n\n## State\n\nContent long enough for import and structural validation.', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    },
  });
  assert.deepEqual(requested, ['https://raw.githubusercontent.com/example/repo/main/4.%20Concurrency.md']);
  assert.equal(result.sourceUrl, sourceUrl);
  assert.equal(result.title, 'Concurrency');
  assert.match(result.markdown, /```java\nclass Lock \{\}\n```/);
});

test('article HTML becomes structured Markdown with absolute links', () => {
  const document = extractWebDocument({
    url: 'https://example.com/articles/storage',
    contentType: 'text/html',
    content: ARTICLE_HTML,
  });
  assert.equal(document.title, 'Storage engines');
  assert.equal(document.language, 'en');
  assert.match(document.markdown, /^A storage engine/m);
  assert.match(document.markdown, /## Architecture/);
  assert.match(document.markdown, /\[buffer pools\]\(https:\/\/example\.com\/buffer-pools\)/);
  assert.doesNotMatch(document.markdown, /Navigation that should be removed/);
});

test('visible Chinese content overrides an incorrect English page language', () => {
  const document = extractWebDocument({
    url: 'https://github.com/example/repo/blob/main/10.%20Java%E8%AF%AD%E8%A8%80%E4%B8%AD%E7%9A%84%E5%85%B3%E9%94%AE%E5%AD%97%EF%BC%9Avolatile.md',
    contentType: 'text/html',
    content: `<!doctype html><html lang="en"><head><title>Repository page</title></head><body><article><h1>volatile 关键字</h1><p>${'这是中文技术正文，用于说明可见内容语言应当优先于网页声明语言。'.repeat(5)}</p></article></body></html>`,
  });
  assert.equal(document.language, 'zh');
  assert.equal(document.title, 'Java语言中的关键字：volatile');
});

test('article and section titles become SuperTags while content lives at index roots', () => {
  const markdown = [
    'Lead with [buffer pools](https://example.com/buffer-pools).',
    '',
    '## Architecture',
    '',
    '- [B-tree indexes](https://example.com/btree) - ordered keys',
    '- Log structures - sequential writes',
    '',
    '### Recovery',
    '',
    'Recovery uses write-ahead logging.',
    '',
    '## References',
    '',
    'Not a project node.',
  ].join('\n');
  const tree = parseMarkdownSections(markdown);
  assert.deepEqual(tree.children.map((section) => section.title), ['Architecture', 'References']);
  assert.equal(tree.children[0].children[0].title, 'Recovery');

  const built = buildWebNodes({
    title: 'Storage engines',
    markdown,
    sourceUrl: 'https://example.com/storage',
    language: 'en',
  });
  assert.deepEqual(built.nodes.map((node) => node.label), ['Storage engines', 'Architecture', 'Recovery']);
  assert.deepEqual(built.tags, ['Storage engines', 'Architecture', 'Recovery']);
  assert.equal(built.nodes[0].card.rootContent, 'Lead with buffer pools.');
  assert.deepEqual(built.nodes[1].card.tabs, []);
  assert.match(built.nodes[1].card.rootContent, /B-tree indexes - ordered keys/);
  assert.deepEqual(built.nodes[1].tags, ['Architecture']);
  const architectureTab = built.nodes[0].card.tabs.find((tab) => tab.label === 'Architecture');
  assert.deepEqual(architectureTab.pages.map((page) => page.label), ['Recovery', 'B-tree indexes', 'Log structures']);
  assert.equal(architectureTab.pages[1].content, 'B-tree indexes - ordered keys');
  assert.deepEqual(built.nodes[0].card.tabs.map((tab) => tab.label), ['Architecture']);
  assert.doesNotMatch(JSON.stringify(built.nodes), /定义|外部链接|https?:\/\//);
  assert.doesNotMatch(built.documentBody, /References|https?:\/\//);
});

test('a same-topic opening section is promoted to the article root index', () => {
  const built = buildWebNodes({
    title: '偏向锁',
    markdown: '## 偏向锁\n\n根概念说明。\n\n## 撤销\n\n撤销说明。',
    sourceUrl: 'https://example.com/biased-lock',
    language: 'zh',
  });
  assert.equal(built.nodes[0].card.rootContent, '根概念说明。');
  assert.deepEqual(built.nodes.map((node) => node.label), ['偏向锁', '撤销']);
  assert.deepEqual(built.nodes[0].card.tabs.map((tab) => tab.label), ['撤销']);
});

test('a keyword-prefixed opening section is promoted for a descriptive article title', () => {
  const built = buildWebNodes({
    title: 'Java语言中的关键字：static',
    markdown: '## static关键字\n\n根概念说明。\n\n## static方法\n\n方法说明。',
    sourceUrl: 'https://example.com/static',
    language: 'zh',
  });
  assert.equal(built.nodes[0].card.rootContent, '根概念说明。');
  assert.deepEqual(built.nodes.map((node) => node.label), ['Java语言中的关键字：static', 'static方法']);
});

test('strict Markdown cleanup removes nested images and citation residue', () => {
  const polished = polishArticleMarkdown([
    '[![](https://example.com/image.png)](https://example.com/image-page)',
    'Text with [[1]](https://example.com/reference) and *[citation needed](https://example.com/citation)*.',
    '\\[\\]',
    '',
    '## Topic',
    'Body with [[2–4]](https://example.com/references).',
  ].join('\n'));
  assert.equal(polished.documentBody, '## 摘要\n\nText with and.\n\n## Topic\n\nBody with.');
  assert.doesNotMatch(polished.documentBody, /!\[|citation needed|\\?\[\d/);
});

test('strict Markdown separates prose, quotes, lists, and fenced code blocks', () => {
  const polished = polishArticleMarkdown([
    'Paragraph',
    '> Quote',
    'After quote',
    '- Item one',
    '- Item two',
    'After list',
    '```js',
    'const value = 1;',
    '```',
    'After code',
  ].join('\n'));
  assert.equal(polished.documentBody, [
    '## 摘要',
    '',
    'Paragraph',
    '',
    '> Quote',
    '',
    'After quote',
    '',
    '- Item one',
    '- Item two',
    '',
    'After list',
    '',
    '```js',
    'const value = 1;',
    '```',
    '',
    'After code',
  ].join('\n'));
});

test('translated Markdown is strict, polished, and contains no external links', async () => {
  const sourceUrl = 'https://example.com/article';
  const destination = 'https://example.com/path_(database)?q=a%20b';
  const sourceHtml = ARTICLE_HTML.replace('/buffer-pools', destination);
  const result = await prepareWebImport({
    url: sourceUrl,
    validateNetwork: false,
    fetchImpl: async () => htmlResponse(sourceHtml),
    translationService: {
      translate: async (text) => text
        .replace('Storage engines', '存储引擎')
        .replace('Architecture', '架构')
        .replace('Recovery', '恢复')
        .replaceAll('#', 'BROKEN_HEADING')
        .replace('public class Store {}', 'BROKEN_CODE'),
    },
  });
  assert.equal(result.title, '存储引擎');
  assert.match(result.markdown, /^---\ntitle: "存储引擎"/);
  assert.match(result.markdown, /source_url: "https:\/\/example\.com\/article"/);
  assert.match(result.markdown, /keywords:\n  - "存储引擎"\n  - "架构"\n  - "恢复"/);
  assert.match(result.markdown, /\n# 存储引擎\n\n## 摘要\n/);
  assert.match(result.markdown, /## 架构/);
  assert.match(result.markdown, /### 恢复/);
  assert.match(result.markdown, /```\npublic class Store \{\}\n```/);
  assert.doesNotMatch(result.markdown, /BROKEN_HEADING|BROKEN_CODE/);
  assert.match(result.markdown, /buffer pools/);
  assert.doesNotMatch(result.markdown.split('---').slice(2).join('---'), /https?:\/\/|\]\(/);
  assert.doesNotMatch(result.markdown, /## References|定义|外部链接/);
});

test('importWebLink writes Markdown and mounts at the selected tree path', async (context) => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-link-import-'));
  context.after(() => fs.rm(projectRoot, { recursive: true, force: true }));
  await fs.mkdir(path.join(projectRoot, 'data'), { recursive: true });
  await fs.writeFile(path.join(projectRoot, 'data', 'node-pool.json'), '{}\n');
  await fs.writeFile(path.join(projectRoot, 'data', 'questions.json'), JSON.stringify([
    { id: 'manual-question', text: 'Existing root question?', answered: false },
  ], null, 2));
  await fs.writeFile(path.join(projectRoot, 'data', 'tree-data.json'), JSON.stringify({
    id: 'root-tree',
    name: 'Root',
    nodeRef: 'root-node',
    children: [
      { id: 'first-tree', name: 'First', nodeRef: 'shared-node', children: [] },
      { id: 'second-tree', name: 'Second', nodeRef: 'shared-node', children: [] },
    ],
  }, null, 2));

  const result = await importWebLink({
    projectRoot,
    url: 'https://example.com/storage',
    parentTreeNodeId: 'second-tree',
    translate: false,
    useAi: true,
    aiOrganizer: {
      organize: async ({ title, markdown }) => ({
        title,
        markdown,
        categories: ['计算机科学', '存储系统'],
        keywords: ['存储引擎'],
        questions: ['存储引擎如何协调缓冲池？', '恢复机制有哪些权衡？'],
      }),
    },
    validateNetwork: false,
    fetchImpl: async () => htmlResponse(),
  });
  const tree = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'tree-data.json'), 'utf8'));
  const pool = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'node-pool.json'), 'utf8'));
  const questions = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'questions.json'), 'utf8'));
  assert.equal(tree.children[0].children.length, 0);
  assert.equal(tree.children[1].children[0].id, result.treeNodeId);
  assert.equal(pool[result.nodeId].label, 'Storage engines');
  assert.ok(pool[result.nodeId].tags.includes('存储系统'));
  assert.equal(result.questionCount, 2);
  assert.deepEqual(result.categories, ['计算机科学', '存储系统']);
  assert.equal(questions.length, 3);
  assert.equal(questions[0].id, 'manual-question');
  for (const question of questions.slice(1)) {
    assert.equal(question.answered, false);
    assert.equal(question.relatedNodeId, result.nodeId);
    assert.deepEqual(question.source, {
      kind: 'web',
      sourceId: 'https://example.com/storage',
      sourceTitle: 'Storage engines',
    });
  }
  assert.doesNotMatch(JSON.stringify(pool), /恢复机制有哪些权衡/);
  const markdown = await fs.readFile(path.join(projectRoot, result.markdownPath), 'utf8');
  assert.match(markdown, /^---\ntitle: "Storage engines"/);
  assert.match(markdown, /\n# Storage engines\n\n## 摘要\n/);
  assert.match(markdown, /categories:\n  - "计算机科学"\n  - "存储系统"/);

  await importWebLink({
    projectRoot,
    url: 'https://example.com/storage',
    parentTreeNodeId: 'second-tree',
    translate: false,
    useAi: true,
    aiOrganizer: {
      organize: async ({ title, markdown: content }) => ({
        title,
        markdown: content,
        categories: ['计算机科学', '存储系统'],
        keywords: ['存储引擎'],
        questions: ['存储引擎如何协调缓冲池？', '恢复机制有哪些权衡？'],
      }),
    },
    validateNetwork: false,
    fetchImpl: async () => htmlResponse(),
  });
  const reimportedQuestions = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'questions.json'), 'utf8'));
  assert.equal(reimportedQuestions.length, 3);
});
