import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

async function loadDefaultsModule() {
  const source = fs.readFileSync(path.resolve('src/knowledge/defaults.ts'), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

test('new explanations start with only the definition tab', async () => {
  const { createEmptyExplanation } = await loadDefaultsModule();
  const explanation = createEmptyExplanation('k_java', 'Java');

  assert.deepEqual(explanation.tabs, [
    { id: 'def', label: '定义', content: '' },
  ]);
});
