import assert from 'node:assert/strict';
import test from 'node:test';
import {
  KnowledgeReferencePartKind,
  collectKnowledgeReferences,
  splitKnowledgeReferences,
} from '../src/knowledge/nodeReferences.ts';

function knowledgeNode(id, label) {
  return {
    id,
    label,
    card: {
      nodeId: id,
      title: label,
      tabs: [],
    },
  };
}

test('knowledge references prefer the longest matching node title', () => {
  const references = collectKnowledgeReferences({
    db: knowledgeNode('db', 'DB'),
    innodb: knowledgeNode('innodb', 'InnoDB'),
  });
  const parts = splitKnowledgeReferences('InnoDB uses DB pages.', references);
  const matches = parts
    .filter((part) => part.kind === KnowledgeReferencePartKind.Reference)
    .map((part) => part.reference.nodeId);

  assert.deepEqual(matches, ['innodb', 'db']);
});

test('knowledge references respect ASCII word boundaries', () => {
  const references = collectKnowledgeReferences({
    read: knowledgeNode('read', 'READ'),
  });
  const parts = splitKnowledgeReferences('BREADTH is not READ.', references);
  const matches = parts.filter(
    (part) => part.kind === KnowledgeReferencePartKind.Reference,
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].text, 'READ');
});

test('knowledge references omit excluded nodes', () => {
  const pool = {
    current: knowledgeNode('current', 'Current'),
    other: knowledgeNode('other', 'Other'),
  };
  const references = collectKnowledgeReferences(pool, new Set(['current']));
  const parts = splitKnowledgeReferences('Current links to Other.', references);
  const matches = parts
    .filter((part) => part.kind === KnowledgeReferencePartKind.Reference)
    .map((part) => part.reference.nodeId);

  assert.deepEqual(matches, ['other']);
});

test('knowledge references protect an excluded whole title from shorter matches', () => {
  const pool = {
    lock: knowledgeNode('lock', '锁'),
    mechanism: knowledgeNode('mechanism', '锁机制'),
  };
  const references = collectKnowledgeReferences(pool, new Set(['mechanism']));
  const parts = splitKnowledgeReferences('锁机制用于并发控制。', references);
  const matches = parts.filter(
    (part) => part.kind === KnowledgeReferencePartKind.Reference,
  );

  assert.equal(matches.length, 0);
});

test('knowledge references do not split an unknown Chinese compound', () => {
  const pool = {
    row: knowledgeNode('row', '行'),
    lock: knowledgeNode('lock', '锁'),
  };
  const references = collectKnowledgeReferences(pool);
  const parts = splitKnowledgeReferences('行锁会阻塞其他事务。', references);
  const matches = parts.filter(
    (part) => part.kind === KnowledgeReferencePartKind.Reference,
  );

  assert.equal(matches.length, 0);
});

test('knowledge references do not split a compound across a linker character', () => {
  const pool = {
    row: knowledgeNode('row', '行'),
    lock: knowledgeNode('lock', '锁'),
  };
  const references = collectKnowledgeReferences(pool);
  const parts = splitKnowledgeReferences('默认使用行级锁。', references);
  const matches = parts.filter(
    (part) => part.kind === KnowledgeReferencePartKind.Reference,
  );

  assert.equal(matches.length, 0);
});

test('knowledge references use bilingual title aliases as one whole match', () => {
  const pool = {
    read: knowledgeNode('read', 'READ'),
    committed: knowledgeNode('committed', 'COMMITTED'),
    isolation: knowledgeNode('isolation', '读已提交 / READ COMMITTED'),
  };
  const references = collectKnowledgeReferences(pool);
  const parts = splitKnowledgeReferences('Use READ COMMITTED here.', references);
  const matches = parts.filter(
    (part) => part.kind === KnowledgeReferencePartKind.Reference,
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].reference.nodeId, 'isolation');
  assert.equal(matches[0].text, 'READ COMMITTED');
});

test('single-character Chinese titles are not extracted from longer words', () => {
  const references = collectKnowledgeReferences({
    lock: knowledgeNode('lock', '\u9501'),
  });
  const compoundParts = splitKnowledgeReferences('\u8bfb\u9501\u548c\u5199\u9501', references);
  const isolatedParts = splitKnowledgeReferences('\u9501\uff1a\u7528\u4e8e\u5e76\u53d1\u63a7\u5236', references);

  assert.equal(compoundParts.some(
    (part) => part.kind === KnowledgeReferencePartKind.Reference,
  ), false);
  assert.equal(isolatedParts.some(
    (part) => part.kind === KnowledgeReferencePartKind.Reference,
  ), true);
});
