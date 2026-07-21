import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('existing system tabs remain available in the explanation matrix', () => {
  const source = fs.readFileSync(path.resolve('src/panels/ExplanationCard.tsx'), 'utf8');

  assert.match(source, /const visibleTabs = explanation\?\.tabs \?\? \[\]/);
  assert.doesNotMatch(source, /HIDDEN_LEGACY_TAB_IDS/);
  assert.doesNotMatch(source, /isVisibleMainTab/);
});
