import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAiOrganizerFromEnv } from './import/ai-organizer.mjs';
import { importDocument } from './import/document-importer.mjs';
import {
  normalizeSemanticDraft,
  SEMANTIC_NODE_KIND,
  SEMANTIC_RELATION_KIND,
} from './import/semantic-draft.mjs';
import { applySemanticImportAtTreeNode } from './import/semantic-persistence.mjs';
import { projectSemanticDraft } from './import/semantic-projector.mjs';
import { prepareWebImport } from './import/web-link-importer.mjs';

const markdown = [
  '事务具有原子性。',
  'Undo Log 记录修改前的数据，并用于事务回滚。',
  '事务回滚使失败事务恢复到修改前状态，从而支持原子性。',
].join('\n');

function semanticValue() {
  return {
    title: '事务与 Undo Log',
    categories: ['数据库', '事务'],
    nodes: [
      {
        key: 'database-transaction',
        label: '数据库事务',
        kind: SEMANTIC_NODE_KIND.Concept,
        summary: '数据库事务是一组需要保持一致性的操作。',
        aliases: ['事务'],
        tags: ['ACID'],
        sourceSpans: [{ startLine: 1, endLine: 1 }],
      },
      {
        key: 'transaction-atomicity',
        label: '事务原子性',
        kind: SEMANTIC_NODE_KIND.Concept,
        summary: '事务中的操作要么全部成功，要么全部撤销。',
        aliases: ['原子性'],
        tags: [],
        sourceSpans: [{ startLine: 1, endLine: 3 }],
      },
      {
        key: 'undo-log',
        label: 'Undo Log',
        kind: SEMANTIC_NODE_KIND.Entity,
        summary: 'Undo Log 保存修改前的数据。',
        details: '失败事务可利用这些记录执行回滚。',
        aliases: ['撤销日志'],
        tags: ['存储'],
        sourceSpans: [{ startLine: 2, endLine: 3 }],
      },
    ],
    relations: [
      {
        sourceKey: 'database-transaction',
        targetKey: 'transaction-atomicity',
        kind: SEMANTIC_RELATION_KIND.Structure,
        label: '具有',
        sourceSpans: [{ startLine: 1, endLine: 1 }],
      },
      {
        sourceKey: 'undo-log',
        targetKey: 'transaction-atomicity',
        kind: SEMANTIC_RELATION_KIND.Causality,
        label: '支持',
        sourceSpans: [{ startLine: 2, endLine: 3 }],
      },
    ],
    questions: [{
      text: 'Undo Log 如何支持事务原子性？',
      relatedNodeKey: 'undo-log',
      kind: 'mechanism',
      difficulty: 'intermediate',
    }],
  };
}

test('semantic drafts preserve multiple roots and only project genuine hierarchy', () => {
  const draft = normalizeSemanticDraft(semanticValue(), {
    fallbackTitle: 'Fallback',
    markdown,
  });
  const projected = projectSemanticDraft({
    draft,
    sourceId: 'document:abc',
    sourceTitle: draft.title,
    sourceKind: 'document',
  });

  assert.equal(projected.stats.nodeCount, 3);
  assert.equal(projected.stats.relationCount, 2);
  assert.equal(projected.stats.rootCount, 2);
  assert.deepEqual(
    projected.nodes.filter((node) => node.parentId === null).map((node) => node.label),
    ['数据库事务', 'Undo Log'],
  );
  assert.equal(
    projected.nodes.find((node) => node.label === '事务原子性').parentId,
    projected.nodes.find((node) => node.label === '数据库事务').id,
  );
  assert.equal(projected.edges.find((edge) => edge.label === '支持').relationKind, 'causality');
  assert.equal(projected.questions[0].relatedNodeId, projected.nodes.find((node) => node.label === 'Undo Log').id);
  assert.ok(projected.nodes.every((node) => node.label !== draft.title));
});

test('semantic draft validation rejects structural cycles and ungrounded spans', () => {
  const value = semanticValue();
  value.relations.push({
    sourceKey: 'transaction-atomicity',
    targetKey: 'database-transaction',
    kind: SEMANTIC_RELATION_KIND.Structure,
    label: '包含',
    sourceSpans: [{ startLine: 1, endLine: 1 }],
  });
  assert.throws(
    () => normalizeSemanticDraft(value, { fallbackTitle: 'Fallback', markdown }),
    /循环/,
  );

  const ungrounded = semanticValue();
  ungrounded.nodes[0].sourceSpans = [{ startLine: 9, endLine: 9 }];
  assert.throws(
    () => normalizeSemanticDraft(ungrounded, { fallbackTitle: 'Fallback', markdown }),
    /超出/,
  );
});

test('mechanism nodes require and project a complete runnable mechanism specification', () => {
  const mechanismMarkdown = [
    '事务失败会触发回滚。',
    'Undo Log 参与回滚，事务从已修改状态恢复到已撤销状态。',
    '回滚完成后得到原子性结果。',
  ].join('\n');
  const value = {
    title: '事务回滚',
    nodes: [
      {
        key: 'rollback-mechanism', label: '事务回滚机制', kind: 'mechanism',
        summary: '事务回滚机制恢复失败事务。', aliases: [], tags: [],
        sourceSpans: [{ startLine: 1, endLine: 3 }],
        mechanism: {
          triggerKeys: ['transaction-failure'],
          participantKeys: ['undo-log'],
          stateKeys: ['modified-state', 'rolled-back-state'],
          outcomeKeys: ['atomicity-result'],
          failureKeys: [],
        },
      },
      {
        key: 'transaction-failure', label: '事务失败', kind: 'event',
        summary: '事务执行失败事件。', aliases: [], tags: [],
        sourceSpans: [{ startLine: 1, endLine: 1 }],
      },
      {
        key: 'undo-log', label: 'Undo Log', kind: 'entity',
        summary: '回滚所使用的修改前记录。', aliases: [], tags: [],
        sourceSpans: [{ startLine: 2, endLine: 2 }],
      },
      {
        key: 'modified-state', label: '已修改状态', kind: 'state',
        summary: '事务数据已经发生修改。', aliases: [], tags: [],
        sourceSpans: [{ startLine: 2, endLine: 2 }],
      },
      {
        key: 'rolled-back-state', label: '已撤销状态', kind: 'state',
        summary: '修改已被撤销。', aliases: [], tags: [],
        sourceSpans: [{ startLine: 2, endLine: 2 }],
      },
      {
        key: 'atomicity-result', label: '原子性结果', kind: 'concept',
        summary: '失败事务没有留下部分修改。', aliases: [], tags: [],
        sourceSpans: [{ startLine: 3, endLine: 3 }],
      },
    ],
    relations: [
      {
        sourceKey: 'transaction-failure', targetKey: 'modified-state',
        kind: 'causality', label: '触发处理', sourceSpans: [{ startLine: 1, endLine: 1 }],
      },
      {
        sourceKey: 'modified-state', targetKey: 'rolled-back-state',
        kind: 'state-transition', label: '恢复', sourceSpans: [{ startLine: 2, endLine: 2 }],
      },
      {
        sourceKey: 'rolled-back-state', targetKey: 'atomicity-result',
        kind: 'causality', label: '产生', sourceSpans: [{ startLine: 3, endLine: 3 }],
      },
    ],
    questions: [],
  };
  const draft = normalizeSemanticDraft(value, {
    fallbackTitle: '事务回滚',
    markdown: mechanismMarkdown,
  });
  const projected = projectSemanticDraft({
    draft,
    sourceId: 'document:rollback',
    sourceTitle: '事务回滚',
    sourceKind: 'document',
  });
  const mechanism = projected.nodes.find((node) => node.canonicalKey === 'rollback-mechanism');
  assert.equal(mechanism.mechanismSpec.stateNodeIds.length, 2);
  assert.equal(mechanism.mechanismSpec.transitionEdgeIds.length, 3);

  const incomplete = structuredClone(value);
  incomplete.nodes[0].mechanism.stateKeys = ['modified-state'];
  assert.throws(
    () => normalizeSemanticDraft(incomplete, {
      fallbackTitle: '事务回滚',
      markdown: mechanismMarkdown,
    }),
    /stateKeys 至少需要 2 个节点/,
  );
});

test('semantic persistence mounts a forest and replaces only its managed graph', () => {
  const draft = normalizeSemanticDraft(semanticValue(), {
    fallbackTitle: 'Fallback',
    markdown,
  });
  const projected = projectSemanticDraft({
    draft,
    sourceId: 'document:abc',
    sourceTitle: draft.title,
    sourceKind: 'document',
  });
  const pool = {
    existing: { id: 'existing', label: 'Existing', card: { nodeId: 'existing', title: 'Existing', tabs: [] } },
  };
  const tree = {
    id: 'root-tree',
    name: 'Root',
    count: 0,
    nodeRef: 'existing',
    children: [],
  };
  const edges = [{ id: 'manual', source: 'existing', target: 'existing', type: 'reference', label: 'manual' }];

  applySemanticImportAtTreeNode({
    pool,
    tree,
    edges,
    projected,
    parentTreeNodeId: 'root-tree',
  });

  assert.equal(tree.children.length, 2);
  assert.deepEqual(tree.children.map((child) => child.name), ['数据库事务', 'Undo Log']);
  assert.equal(tree.children[0].children[0].name, '事务原子性');
  assert.equal(edges.filter((edge) => edge.id !== 'manual').length, 2);
  assert.ok(pool.existing);
  assert.ok(Object.values(pool).some((node) => node.canonicalKey === 'undo-log'));
});

test('AI semantic compiler requests line-grounded graph output', async () => {
  let requestBody;
  const organizer = createAiOrganizerFromEnv({
    KNOWLEDGE_OS_LLM_API_KEY: 'test-key',
    KNOWLEDGE_OS_LLM_BASE_URL: 'https://llm.example/v1',
  }, async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(semanticValue()) } }],
    }));
  });

  const draft = await organizer.compile({
    title: '事务与 Undo Log',
    markdown,
    sourceLanguage: 'zh',
  });

  assert.equal(draft.nodes.length, 3);
  assert.match(requestBody.messages[0].content, /不要创建“文档”“来源”“章节”/);
  assert.match(requestBody.messages[1].content, /1: 事务具有原子性/);
});

test('document semantic import writes nodes, relations, provenance, and multiple roots', async (context) => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'knowledge-os-semantic-import-'));
  context.after(() => fs.rm(projectRoot, { recursive: true, force: true }));
  await fs.mkdir(path.join(projectRoot, 'data'), { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(projectRoot, 'data', 'node-pool.json'), '{}\n'),
    fs.writeFile(path.join(projectRoot, 'data', 'knowledge-edges.json'), '[]\n'),
    fs.writeFile(path.join(projectRoot, 'data', 'questions.json'), '[]\n'),
    fs.writeFile(path.join(projectRoot, 'data', 'tree-data.json'), JSON.stringify({
      id: 'root-tree',
      name: 'Root',
      count: 0,
      nodeRef: 'root-node',
      children: [],
    })),
  ]);

  const result = await importDocument({
    projectRoot,
    fileName: 'transaction.md',
    buffer: Buffer.from(`# 事务与 Undo Log\n\n${markdown}`),
    parentTreeNodeId: 'root-tree',
    profileMode: 'article',
    useAi: true,
    translate: false,
    aiOrganizer: {
      compile: async () => normalizeSemanticDraft(semanticValue(), {
        fallbackTitle: '事务与 Undo Log',
        markdown,
      }),
    },
  });

  const [pool, tree, edges] = await Promise.all([
    fs.readFile(path.join(projectRoot, 'data', 'node-pool.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(projectRoot, 'data', 'tree-data.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(projectRoot, 'data', 'knowledge-edges.json'), 'utf8').then(JSON.parse),
  ]);
  assert.equal(result.structureMode, 'semantic');
  assert.equal(result.nodeCount, 3);
  assert.equal(result.rootCount, 2);
  assert.equal(result.relationCount, 2);
  assert.equal(tree.children.length, 2);
  assert.equal(edges.length, 2);
  assert.ok(Object.values(pool).every((node) => node.label !== '事务与 Undo Log'));
  assert.ok(Object.values(pool).every((node) => node.provenance?.[0]?.sourceId));
});

test('web sources use the same semantic compiler after normalization to Markdown', async () => {
  const prepared = await prepareWebImport({
    url: 'https://example.com/transaction',
    translate: false,
    useAi: true,
    validateNetwork: false,
    fetchImpl: async () => new Response([
      '<!doctype html><html lang="zh"><head><title>事务恢复</title></head><body><article>',
      '<h1>事务恢复</h1>',
      '<p>Undo Log 保存事务修改前的数据版本，并记录恢复这些数据所需要的信息。</p>',
      '<p>当事务执行失败时，事务回滚会按照 Undo Log 中的记录撤销已经完成的修改，使数据重新回到事务开始前的一致状态。</p>',
      '<p>这些信息共同说明事务回滚依赖 Undo Log，而不是依赖网页标题或段落顺序来形成知识关系。</p>',
      '</article></body></html>',
    ].join(''), { headers: { 'content-type': 'text/html; charset=utf-8' } }),
    aiOrganizer: {
      compile: async ({ markdown: normalizedMarkdown }) => normalizeSemanticDraft({
        title: '事务恢复',
        categories: ['数据库'],
        nodes: [
          {
            key: 'undo-log', label: 'Undo Log', kind: 'entity',
            summary: 'Undo Log 保存修改前的数据。', aliases: ['撤销日志'], tags: [],
            sourceSpans: [{ startLine: 1, endLine: 1 }],
          },
          {
            key: 'transaction-rollback', label: '事务回滚', kind: 'rule',
            summary: '事务回滚利用 Undo Log 恢复数据。', aliases: [], tags: [],
            sourceSpans: [{ startLine: 1, endLine: 1 }],
          },
        ],
        relations: [{
          sourceKey: 'transaction-rollback', targetKey: 'undo-log',
          kind: 'dependency', label: '依赖',
          sourceSpans: [{ startLine: 1, endLine: 1 }],
        }],
        questions: [],
      }, { fallbackTitle: '事务恢复', markdown: normalizedMarkdown }),
    },
  });

  assert.equal(prepared.structureMode, 'semantic');
  assert.equal(prepared.nodes.length, 2);
  assert.equal(prepared.edges.length, 1);
  assert.equal(prepared.stats.rootCount, 2);
  assert.ok(prepared.nodes.every((node) => node.provenance[0].sourceKind === 'web'));
});
