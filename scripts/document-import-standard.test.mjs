import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  importDocument,
  prepareDocumentImport,
} from './import/document-importer.mjs';
import {
  DOCUMENT_PROFILE,
  extractContextualQuestions,
  QUESTION_DIFFICULTY,
  QUESTION_KIND,
  QUESTION_SOURCE_KIND,
} from './import/import-standard.mjs';

async function createProjectFixture(context) {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-import-standard-'));
  context.after(() => fs.rm(projectRoot, { recursive: true, force: true }));
  await fs.mkdir(path.join(projectRoot, 'data'), { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(projectRoot, 'data', 'node-pool.json'), '{}\n'),
    fs.writeFile(path.join(projectRoot, 'data', 'questions.json'), '[]\n'),
    fs.writeFile(path.join(projectRoot, 'data', 'tree-data.json'), JSON.stringify({
      id: 'root-tree',
      name: 'Root',
      nodeRef: 'root-node',
      children: [
        { id: 'spring-tree', name: 'Spring', nodeRef: 'spring-node', children: [] },
      ],
    }, null, 2)),
  ]);
  return projectRoot;
}

test('long unstructured documents are rejected before persistence', async () => {
  const buffer = Buffer.from(`# Unstructured notes\n\n${'A long paragraph without sections. '.repeat(160)}`);

  await assert.rejects(
    prepareDocumentImport({
      fileName: 'unstructured.md',
      buffer,
      useAi: false,
    }),
    /长文档没有识别到章节/,
  );
});

test('contextual question extraction ignores Java wildcard syntax', () => {
  const questions = extractContextualQuestions([
    '## Bean loading',
    'if (source instanceof Class<?>) {',
    'return load((Class<?>) source);',
    'SpringBoot 自动配置原理是什么？',
  ].join('\n'));

  assert.deepEqual(questions.map((question) => question.text), ['SpringBoot 自动配置原理是什么？']);
});

test('question-bank documents create one source node and typed traceable questions', async (context) => {
  const projectRoot = await createProjectFixture(context);
  const buffer = Buffer.from([
    '# Spring 面试题',
    '',
    '## 1. 什么是 IoC？',
    '',
    'IoC 将对象创建和依赖装配交给容器管理。',
    '',
    '## 2. BeanFactory 和 ApplicationContext 有什么区别？',
    '',
    'ApplicationContext 在 BeanFactory 基础上提供事件、资源和国际化能力。',
    '',
    '## 3. 如何排查 Spring 循环依赖故障？',
    '',
    '先确认依赖环，再检查构造器注入和提前暴露条件。',
  ].join('\n'));

  const result = await importDocument({
    projectRoot,
    fileName: 'spring-interview.md',
    buffer,
    parentTreeNodeId: 'spring-tree',
    useAi: false,
  });

  assert.equal(result.profile, DOCUMENT_PROFILE.QuestionBank);
  assert.equal(result.nodeCount, 1);
  assert.equal(result.sectionCount, 0);
  assert.equal(result.questionCount, 3);

  const pool = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'node-pool.json'), 'utf8'));
  const questions = JSON.parse(await fs.readFile(path.join(projectRoot, 'data', 'questions.json'), 'utf8'));
  assert.deepEqual(Object.keys(pool), [result.nodeId]);
  assert.match(pool[result.nodeId].card.rootContent, /题库文档，共整理 3 道问题/);
  assert.doesNotMatch(JSON.stringify(pool), /BeanFactory 和 ApplicationContext/);

  assert.deepEqual(
    questions.map(({ kind, difficulty }) => ({ kind, difficulty })),
    [
      { kind: QUESTION_KIND.Definition, difficulty: QUESTION_DIFFICULTY.Basic },
      { kind: QUESTION_KIND.Comparison, difficulty: QUESTION_DIFFICULTY.Intermediate },
      { kind: QUESTION_KIND.Troubleshooting, difficulty: QUESTION_DIFFICULTY.Advanced },
    ],
  );
  const expectedSourceId = `document:${crypto.createHash('sha256').update(buffer).digest('hex')}`;
  for (const question of questions) {
    assert.equal(question.relatedNodeId, result.nodeId);
    assert.equal(question.answered, true);
    assert.ok(question.answer);
    assert.deepEqual(question.source, {
      kind: QUESTION_SOURCE_KIND.Document,
      sourceId: expectedSourceId,
      sourceTitle: 'Spring 面试题',
    });
  }

  const sourceIds = new Set(questions.map((question) => question.source.sourceId));
  assert.equal(sourceIds.size, 1);
  assert.deepEqual([...sourceIds], [expectedSourceId]);

  const markdown = await fs.readFile(path.join(projectRoot, result.markdownPath), 'utf8');
  assert.match(markdown, /import_profile: "question-bank"/);
  assert.match(markdown, /question_count: 3/);
  assert.match(markdown, /## 1\. 什么是 IoC？/);
  assert.match(markdown, /IoC 将对象创建和依赖装配交给容器管理/);
});
