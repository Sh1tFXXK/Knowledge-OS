import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/knowledge/supertags.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const supertags = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

test('normalizeSupertag folds full-width input while preserving display case', () => {
  assert.equal(supertags.normalizeSupertag('  ＃Ｊａｖａ  '), 'Java');
});

test('normalizeSupertags deduplicates case and width variants', () => {
  assert.deepEqual(
    supertags.normalizeSupertags(['Java', 'java', 'ＪＡＶＡ', '数据库']),
    ['Java', '数据库'],
  );
});

test('supertag identity helpers ignore case and width variants', () => {
  assert.equal(supertags.supertagKey('ＭｙＳＱＬ'), 'mysql');
  assert.equal(supertags.hasSupertag(['MySQL'], 'ｍｙｓｑｌ'), true);
  assert.equal(supertags.areSupertagsEqual(['JUC'], ['ｊｕｃ']), true);
});
