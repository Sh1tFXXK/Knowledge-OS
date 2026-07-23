import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

function readProjectFile(filePath) {
  return fs.readFileSync(path.resolve(filePath), 'utf8');
}

test('explanation title operations live in the center index editor', () => {
  const cardSource = readProjectFile('src/panels/ExplanationCard.tsx');
  const indexSource = readProjectFile('src/core/ExplanationIndexView.tsx');
  const styles = readProjectFile('src/styles/components.css');

  assert.doesNotMatch(cardSource, /ItemActionMenu/);
  assert.doesNotMatch(cardSource, /className="card-tabs"/);
  assert.doesNotMatch(cardSource, /definition-pages/);
  assert.match(indexSource, /className="explanation-index-editor"/);
  assert.match(indexSource, /ExplanationIndexOperationKind\.Split/);
  assert.match(indexSource, /ExplanationIndexOperationKind\.AddSibling/);
  assert.match(indexSource, /ExplanationIndexOperationKind\.Merge/);
  assert.match(indexSource, /ExplanationIndexOperationKind\.Remove/);
  assert.match(styles, /\.explanation-index-editor\s*\{/);
  assert.match(styles, /\.explanation-card-body--content-only\s*\{/);
});
