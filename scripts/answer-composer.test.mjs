import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const sourcePath = path.resolve('src/knowledge/answerComposer.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: sourcePath,
});

const module = { exports: {} };
vm.runInNewContext(output.outputText, {
  exports: module.exports,
  module,
  require,
}, { filename: sourcePath });

const { composeQuestionAnswerDraft, normalizeQuestionAnswerSteps } = module.exports;

const nodePool = {
  'read-view': {
    id: 'read-view',
    label: 'Read View',
    role: 'axiom',
    card: {
      nodeId: 'read-view',
      title: 'Read View',
      tabs: [
        { id: 'definition', label: 'Definition', content: 'Defines the visible transaction snapshot.' },
      ],
    },
  },
  chain: {
    id: 'chain',
    label: 'Version Chain',
    role: 'mechanism',
    card: {
      nodeId: 'chain',
      title: 'Version Chain',
      tabs: [
        { id: 'definition', label: 'Definition', content: 'Keeps historical row versions.' },
      ],
    },
  },
  visible: {
    id: 'visible',
    label: 'Visibility Check',
    role: 'conclusion',
    card: {
      nodeId: 'visible',
      title: 'Visibility Check',
      tabs: [
        { id: 'definition', label: 'Definition', content: 'Chooses the first version visible to the transaction.' },
      ],
    },
  },
};

const question = {
  id: 'q-mvcc',
  text: 'How does MVCC answer repeatable reads?',
  answered: false,
  answerSteps: [
    { nodeId: 'read-view', note: 'Start with the snapshot boundary.' },
    { nodeId: 'missing-node', note: 'This stale reference should not render.' },
    { nodeId: 'chain' },
    { nodeId: 'visible', note: 'Finish with the decision rule.' },
  ],
};

const before = JSON.stringify(question);

assert.deepEqual(
  JSON.parse(JSON.stringify(normalizeQuestionAnswerSteps(question.answerSteps, nodePool))),
  [
    { nodeId: 'read-view', note: 'Start with the snapshot boundary.' },
    { nodeId: 'chain' },
    { nodeId: 'visible', note: 'Finish with the decision rule.' },
  ],
);

assert.equal(
  composeQuestionAnswerDraft(question, nodePool),
  [
    '问题：How does MVCC answer repeatable reads?',
    '',
    '1. Read View',
    'Defines the visible transaction snapshot.',
    '备注：Start with the snapshot boundary.',
    '',
    '2. Version Chain',
    'Keeps historical row versions.',
    '',
    '3. Visibility Check',
    'Chooses the first version visible to the transaction.',
    '备注：Finish with the decision rule.',
  ].join('\n'),
);

assert.equal(JSON.stringify(question), before);

assert.equal(
  composeQuestionAnswerDraft({ id: 'q-empty', text: 'Empty?', answered: false }, nodePool),
  '',
);

console.log('answer composer checks passed');
