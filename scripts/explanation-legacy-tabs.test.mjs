import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('explanation titles are owned by the center index', () => {
  const cardSource = fs.readFileSync(path.resolve('src/panels/ExplanationCard.tsx'), 'utf8');
  const indexSource = fs.readFileSync(path.resolve('src/core/ExplanationIndexView.tsx'), 'utf8');

  assert.doesNotMatch(cardSource, /className="card-tabs"/);
  assert.doesNotMatch(cardSource, /definition-pages/);
  assert.match(indexSource, /buildExplanationIndex/);
  assert.match(indexSource, /explanation-index-paths/);
});
